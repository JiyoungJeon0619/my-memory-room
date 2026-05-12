// app/api/voice/transcribe/route.ts
// Web Speech API 실패 시 폴백으로 사용하는 Whisper STT 엔드포인트
// 클라이언트에서 녹음한 audio blob을 받아 텍스트로 변환

import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createServerSupabaseClient } from '@/lib/supabase'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // multipart/form-data로 오디오 파일 수신
    const formData = await request.formData()
    const audioFile = formData.get('audio') as File | null
    if (!audioFile) return NextResponse.json({ error: 'No audio file' }, { status: 400 })

    // Whisper API 호출
    // 비용: $0.006 / 분 — 30초 발화 기준 약 $0.003
    const transcription = await openai.audio.transcriptions.create({
      file:     audioFile,
      model:    'whisper-1',
      language: 'ko',        // 한국어 고정 → 정확도 향상
      prompt:   '노인의 일상 대화, 추억 이야기, 한국어',  // 컨텍스트 힌트
    })

    return NextResponse.json({ text: transcription.text })

  } catch (err: any) {
    console.error('[Whisper Error]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
