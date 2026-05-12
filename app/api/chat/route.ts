import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServerSupabaseClient } from '@/lib/supabase'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ✅ 수정: getTimeGreeting 함수를 아예 삭제했습니다.

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { messages, profile, isWrapUp } = await request.json()

    const name         = profile?.name || '어머니'
    const birth        = profile?.birth_year || ''
    const topics       = profile?.topics?.join(', ') || '삶'
    const gender       = profile?.gender || ''

    const genderNote = gender === '여성'
      ? '여성이시며 며느리/어머니/할머니 관점의 표현을 자연스럽게 사용하세요.'
      : gender === '남성'
      ? '남성이시며 아버지/할아버지 관점의 표현을 자연스럽게 사용하세요.'
      : ''

    const totalMessages = messages.length
    const turnCount = Math.floor(totalMessages / 2)
    const isFirstChat = totalMessages === 0 || (totalMessages === 1 && messages[0].role === 'assistant');

    let conversationGuide = ""
    
    if (isFirstChat) {
      conversationGuide = `
        \n\n[첫인사 가이드]
    1. 지금 한국 시간 기준으로 따뜻한 인사를 직접 건네세요. 
       (예: 아침이면 "간밤에 잘 주무셨나요?", 점심이면 "맛있는 식사 하셨어요?", 저녁이면 "오늘 하루 고생 많으셨어요")
    2. '${topics}' 주제로 대화를 시작하되, 절대 '아이 질문'이나 '가족 관계 조사'는 하지 마세요. 
        절대 '아이', '아기', '자녀'에 대해 먼저 묻지 마세요. 사용자가 가족에 대해 이야기할 때는 부모님이나 형제, 혹은 어린 시절의 동네 친구 같은 넓은 의미의 관계부터 다정하게 접근하세요.
    3. 사용자가 가장 편안하게 대답할 수 있는 사소한 추억부터 물어봐주세요.`
    } else if (isWrapUp) {
      conversationGuide = `
        \n\n[오늘의 갈무리] 
        따뜻하게 대화를 마쳐주세요. 
        마지막엔 대화 시점(아침/오후/저녁)에 맞는 인사를 건네고, 반드시 맨 마지막 줄에 [MEMORY: ...] 문장을 적어주세요.`
    } else if (turnCount >= 4) {
      conversationGuide = `
        \n\n[대화의 무르익음] 
        이제 슬슬 이야기를 따뜻하게 정리하며 대화를 갈무리해볼까요? 
        자연스러운 흐름에서 [MEMORY: ...] 문장을 선물하며 대화를 마쳐주세요.`
    } else {
      conversationGuide = `
        \n\n[경청과 공감] 
        지금은 ${name}님의 이야기에 푹 빠져서 들어드릴 때입니다. 
        따뜻한 맞장구와 함께 궁금한 점을 하나씩만 여쭤봐 주세요.`
    }

    const system =
      `당신은 ${name}님(${birth})의 인생 이야기를 따뜻하게 듣는 AI 동반자입니다.\n` +
      (genderNote ? genderNote + '\n' : '') +
      `담고 싶은 이야기 주제: ${topics}\n\n` +
      `말투: 정중하고 다정하게. "~네요", "~하셨군요" 같은 따뜻한 공감을 듬뿍 담아주세요. 
      인사말 규칙: 
      - 절대 서버 시간을 강요하지 않습니다. 
      - 당신이 판단하기에 지금이 아침이면 '좋은 아침', 오후면 '좋은 오후', 저녁이면 '좋은 저녁'이라고 다정하게 인사하세요. 
      - 밤이라는 표현은 가급적 피하고 따뜻하게 축복하는 인사를 건네세요.\n\n` +
      `[MEMORY] 규칙:\n` +
      `- 형식: [MEMORY: 문장] 응답 맨 마지막 줄에만\n` +
      `- 1인칭 시점, 핵심 장면을 한 문장(20-45자)\n` +
      conversationGuide

    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20240620',
      max_tokens: 1000,
      system,
      messages: messages.slice(-10).map((m: any) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      })),
    })

    const reply = response.content[0].type === 'text' ? response.content[0].text : ''
    return NextResponse.json({ reply })

  } catch (err: any) {
    console.error('[Chat Error]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}