// app/api/image/generate/route.ts
//
// 변경된 흐름 (백그라운드 생성):
// 1. 요청 수신 → memories에 image_status='pending' 기록 → 즉시 200 응답
// 2. 백그라운드에서: Claude 프롬프트 생성 → DALL-E 3 → Storage 저장 → DB 업데이트
// 3. 클라이언트는 /api/image/status?memoryId=xxx 를 폴링해서 완료 감지

import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const openai    = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// 백그라운드 작업엔 service role 클라이언트 사용 (RLS 우회, 쿠키 불필요)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ── 백그라운드 이미지 생성 함수 ──
async function generateInBackground(params: {
  memoryId:    string
  userId:      string
  messages:    { role: string; content: string }[]
  memoryQuote: string
  topic:       string
  sessionId:   string
}) {
  const { memoryId, userId, messages, memoryQuote, topic, sessionId } = params

  try {
    // STEP 1: Claude로 DALL-E 프롬프트 생성
    const promptResponse = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      system: `당신은 노인의 인생 이야기를 따뜻한 한국 수채화 일러스트로 표현하는 프롬프트 작가입니다.

대화 내용과 기억 문장을 바탕으로 DALL-E 3용 영문 이미지 프롬프트를 작성하세요.

규칙:
- 반드시 영어로만 작성
- 수채화 스타일 명시: "soft Korean watercolor illustration"
- 따뜻하고 향수적인 감성: warm, nostalgic, gentle, soft pastel tones
- 사람이 등장할 경우 얼굴은 뒤모습이나 측면으로만 묘사 (초상권 이슈 방지)
- 장면을 구체적으로 묘사하되 150단어 이내
- 절대 텍스트나 글자를 이미지에 넣지 말 것
- 응답은 프롬프트 텍스트만, 다른 설명 없이`,
      messages: [{
        role: 'user',
        content: `기억 문장: "${memoryQuote}"
주제: ${topic}
대화 내용: ${messages.slice(-6).map(m => `${m.role === 'user' ? '사용자' : 'AI'}: ${m.content}`).join('\n')}

위 내용을 바탕으로 수채화 일러스트 프롬프트를 작성해주세요.`
      }]
    })

    const imagePrompt = promptResponse.content[0].type === 'text'
      ? promptResponse.content[0].text.trim() : ''
    if (!imagePrompt) throw new Error('프롬프트 생성 실패')

    // STEP 2: DALL-E 3 이미지 생성
    const imageResponse = await openai.images.generate({
      model:   'dall-e-3',
      prompt:  imagePrompt,
      size:    '1024x1024',
      quality: 'standard',
      style:   'natural',
      n: 1,
    })

   const tempUrl = imageResponse.data?.[0]?.url ?? ''
    if (!tempUrl) throw new Error('이미지 생성 실패')

    // STEP 3: Supabase Storage에 영구 저장 (DALL-E URL은 1시간 만료)
    const imgRes    = await fetch(tempUrl)
    const imgBuffer = Buffer.from(await imgRes.arrayBuffer())
    const fileName  = `${userId}/${sessionId}_${Date.now()}.png`

    const { error: uploadError } = await supabaseAdmin.storage
      .from('memory-images')
      .upload(fileName, imgBuffer, { contentType: 'image/png', upsert: false })
    if (uploadError) throw uploadError

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('memory-images')
      .getPublicUrl(fileName)

    // STEP 4: memories 테이블 업데이트 → done
    await supabaseAdmin
      .from('memories')
      .update({
        image_url:    publicUrl,
        image_prompt: imagePrompt,
        image_status: 'done',
      })
      .eq('id', memoryId)

  } catch (err: any) {
    console.error('[BG Image Error]', err)
    // 실패 기록 → 클라이언트가 error 상태 감지 가능
    await supabaseAdmin
      .from('memories')
      .update({ image_status: 'error' })
      .eq('id', memoryId)
  }
}

// ── POST 핸들러 — 즉시 응답 후 백그라운드 실행 ──
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { messages, memoryQuote, topic, sessionId, memoryId } = body

    // memories 테이블에 image_status = 'pending' 업데이트
    await supabaseAdmin
      .from('memories')
      .update({ image_status: 'pending' })
      .eq('id', memoryId)

    // 백그라운드 실행 — await 하지 않음 → 즉시 응답 반환
    generateInBackground({
      memoryId,
      userId:      user.id,
      messages,
      memoryQuote,
      topic,
      sessionId,
    })

    // 즉시 응답 — 클라이언트는 이제 폴링 시작
    return NextResponse.json({ success: true, status: 'pending' })

  } catch (err: any) {
    console.error('[Image Generate Error]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
