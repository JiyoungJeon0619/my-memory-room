'use client'
// hooks/useVoiceInput.ts
//
// 음성 입력 훅 — 두 가지 전략 자동 선택
//
// [전략 A] Web Speech API  — Android Chrome, Desktop
//   - 실시간 transcript 스트리밍
//   - 무료, 빠름
//
// [전략 B] MediaRecorder + Whisper — iOS Safari, Web Speech 미지원 환경
//   - 녹음 → 서버 전송 → 텍스트 반환
//   - 약 1~2초 딜레이, 인식률 높음

import { useState, useRef, useCallback, useEffect } from 'react'

export type VoiceStatus =
  | 'idle'          // 대기
  | 'recording'     // 녹음 중
  | 'transcribing'  // Whisper 변환 중 (iOS 폴백)
  | 'done'          // 완료
  | 'error'         // 오류

interface UseVoiceInputOptions {
  onTranscript: (text: string) => void  // 변환된 텍스트 콜백
  onError?:     (msg: string)  => void
}

interface UseVoiceInputReturn {
  status:        VoiceStatus
  interimText:   string        // Web Speech 실시간 중간 결과
  isSupported:   boolean
  startRecording: () => void
  stopRecording:  () => void
  strategy:      'webspeech' | 'whisper' | null
}

// iOS Safari 감지
function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

// Web Speech API 지원 여부
function hasWebSpeech(): boolean {
  if (typeof window === 'undefined') return false
  return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window
}

export function useVoiceInput({ onTranscript, onError }: UseVoiceInputOptions): UseVoiceInputReturn {
  const [status,      setStatus]      = useState<VoiceStatus>('idle')
  const [interimText, setInterimText] = useState('')
  const [strategy,    setStrategy]    = useState<'webspeech' | 'whisper' | null>(null)

  const recognitionRef  = useRef<any>(null)
  const mediaRecRef     = useRef<MediaRecorder | null>(null)
  const audioChunksRef  = useRef<Blob[]>([])
  const finalTextRef    = useRef('')

  // 전략 결정 (마운트 시 1회)
  useEffect(() => {
    if (isIOS() || !hasWebSpeech()) {
      setStrategy('whisper')
    } else {
      setStrategy('webspeech')
    }
  }, [])

  const isSupported = typeof navigator !== 'undefined' &&
    !!(navigator.mediaDevices?.getUserMedia || hasWebSpeech())

  // ── 전략 A: Web Speech API ──
  const startWebSpeech = useCallback(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) return

    const recognition = new SpeechRecognition()
    recognition.lang          = 'ko-KR'
    recognition.interimResults = true   // 실시간 중간 결과
    recognition.continuous     = true   // 말 멈춰도 계속 인식
    recognition.maxAlternatives = 1

    finalTextRef.current = ''

    recognition.onresult = (event: any) => {
      let interim = ''
      let final   = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          final += t
        } else {
          interim += t
        }
      }
      if (final) finalTextRef.current += final
      setInterimText(finalTextRef.current + interim)
    }

    recognition.onerror = (event: any) => {
      // 'no-speech'는 무시 (말 안 했을 때 자주 발생)
      if (event.error === 'no-speech') return
      console.warn('[WebSpeech Error]', event.error)
      // Web Speech 실패 시 Whisper로 자동 전환
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        onError?.('마이크 권한이 필요해요')
        setStatus('error')
      }
    }

    recognition.onend = () => {
      const text = finalTextRef.current.trim()
      if (text) {
        onTranscript(text)
        setStatus('done')
      } else {
        setStatus('idle')
      }
      setInterimText('')
    }

    recognitionRef.current = recognition
    recognition.start()
    setStatus('recording')
  }, [onTranscript, onError])

  const stopWebSpeech = useCallback(() => {
    recognitionRef.current?.stop()
  }, [])

  // ── 전략 B: MediaRecorder + Whisper ──
  const startWhisper = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount:    1,
          sampleRate:      16000,
          echoCancellation: true,
          noiseSuppression: true,
        }
      })

      // iOS에서 지원하는 포맷 우선 선택
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/mp4')
          ? 'audio/mp4'
          : 'audio/ogg'

      const recorder = new MediaRecorder(stream, { mimeType })
      audioChunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data)
      }

      recorder.onstop = async () => {
        // 스트림 트랙 종료
        stream.getTracks().forEach(t => t.stop())

        setStatus('transcribing')
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType })

        // Whisper API로 전송
        const form = new FormData()
        const ext  = mimeType.includes('mp4') ? 'mp4' : mimeType.includes('ogg') ? 'ogg' : 'webm'
        form.append('audio', audioBlob, `recording.${ext}`)

        try {
          const res  = await fetch('/api/voice/transcribe', { method: 'POST', body: form })
          const data = await res.json()
          if (!res.ok) throw new Error(data.error)

          onTranscript(data.text)
          setStatus('done')
        } catch (err: any) {
          console.error('[Whisper Transcribe Error]', err)
          onError?.('음성 변환에 실패했어요. 다시 시도해주세요.')
          setStatus('error')
        }
      }

      mediaRecRef.current = recorder
      recorder.start(100) // 100ms 단위로 chunk
      setStatus('recording')

    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        onError?.('마이크 권한이 필요해요')
      } else {
        onError?.('마이크를 사용할 수 없어요')
      }
      setStatus('error')
    }
  }, [onTranscript, onError])

  const stopWhisper = useCallback(() => {
    mediaRecRef.current?.stop()
  }, [])

  // ── 공통 인터페이스 ──
  const startRecording = useCallback(() => {
    if (status === 'recording') return
    setInterimText('')
    setStatus('idle')

    if (strategy === 'webspeech') {
      startWebSpeech()
    } else {
      startWhisper()
    }
  }, [status, strategy, startWebSpeech, startWhisper])

  const stopRecording = useCallback(() => {
    if (strategy === 'webspeech') {
      stopWebSpeech()
    } else {
      stopWhisper()
    }
  }, [strategy, stopWebSpeech, stopWhisper])

  // 언마운트 시 정리
  useEffect(() => {
    return () => {
      recognitionRef.current?.abort()
      if (mediaRecRef.current?.state === 'recording') {
        mediaRecRef.current.stop()
      }
    }
  }, [])

  return {
    status,
    interimText,
    isSupported,
    startRecording,
    stopRecording,
    strategy,
  }
}
