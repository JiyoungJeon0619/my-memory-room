'use client'
// components/ChatInputArea.tsx
// 채팅 입력 영역 — 텍스트 입력 + 음성 버튼 통합 예시

import { useState, useRef } from 'react'
import VoiceButton from './VoiceButton'

interface ChatInputAreaProps {
  onSend:    (text: string) => void
  disabled?: boolean
}

export default function ChatInputArea({ onSend, disabled }: ChatInputAreaProps) {
  const [text, setText] = useState('')
  const [mode, setMode] = useState<'type' | 'voice'>('type')
  const taRef = useRef<HTMLTextAreaElement>(null)

  // 음성 → 텍스트 변환 완료 콜백
  // 변환된 텍스트를 input에 채우고 자동 전송
  function handleTranscript(transcript: string) {
    setText(transcript)
    // 약간의 딜레이 후 전송 — 사용자가 텍스트 확인할 수 있도록
    setTimeout(() => {
      onSend(transcript)
      setText('')
    }, 600)
  }

  function handleSend() {
    const t = text.trim()
    if (!t || disabled) return
    onSend(t)
    setText('')
    if (taRef.current) taRef.current.style.height = 'auto'
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  function autoResize(el: HTMLTextAreaElement) {
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }

  return (
    <div className="input-area">

      {/* 모드 토글 */}
      <div className="mode-bar">
        <button
          className={`mode-pill ${mode === 'type' ? 'on' : ''}`}
          onClick={() => setMode('type')}
        >
          ✏️ 쓰기
        </button>
        <button
          className={`mode-pill ${mode === 'voice' ? 'on' : ''}`}
          onClick={() => setMode('voice')}
        >
          🎙️ 말하기
        </button>
      </div>

      {/* 입력 행 */}
      <div className={`input-row ${mode === 'voice' ? 'voice-mode' : ''}`}>

        {/* 텍스트 모드 */}
        {mode === 'type' && (
          <>
            <textarea
              ref={taRef}
              className="chat-ta"
              value={text}
              onChange={(e) => { setText(e.target.value); autoResize(e.target) }}
              onKeyDown={handleKey}
              placeholder="이야기를 들려주세요..."
              rows={1}
              disabled={disabled}
            />
            <button
              className="send-btn"
              onClick={handleSend}
              disabled={!text.trim() || disabled}
            >
              →
            </button>
          </>
        )}

        {/* 음성 모드 */}
        {mode === 'voice' && (
          <div className="voice-center">
            <VoiceButton onTranscript={handleTranscript} disabled={disabled} />
            <p className="voice-hint">버튼을 눌러 말씀하세요</p>
          </div>
        )}
      </div>

      <style jsx>{`
        .input-area {
          background: rgba(253,250,244,0.98);
          border-top: 1px solid rgba(200,168,96,0.13);
          padding: 12px 16px 28px;
          backdrop-filter: blur(12px);
        }

        .mode-bar {
          display: flex; gap: 6px; margin-bottom: 12px;
        }
        .mode-pill {
          padding: 7px 16px; border-radius: 20px;
          border: 1.5px solid rgba(200,168,96,0.25);
          background: none; font-size: 13px; color: #9A8870;
          cursor: pointer; font-family: 'Gowun Batang', serif;
          transition: all 0.2s;
        }
        .mode-pill.on {
          background: #C4826A; border-color: #C4826A; color: white;
        }

        .input-row {
          display: flex; gap: 10px; align-items: flex-end;
        }
        .input-row.voice-mode {
          justify-content: center; padding: 16px 0 8px;
        }

        /* 텍스트 입력 */
        .chat-ta {
          flex: 1; background: white;
          border: 1.5px solid rgba(200,168,96,0.25);
          border-radius: 14px; padding: 13px 16px;
          font-size: 17px; font-family: 'Gowun Batang', serif;
          color: #28200F; resize: none;
          min-height: 52px; max-height: 120px;
          line-height: 1.65; outline: none;
          transition: border-color 0.2s;
        }
        .chat-ta:focus { border-color: #E8C0AC; }
        .chat-ta::placeholder { color: #C8B898; }

        .send-btn {
          width: 52px; height: 52px; border-radius: 50%;
          background: #C4826A; border: none; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          font-size: 20px; color: white; flex-shrink: 0;
          box-shadow: 0 4px 16px rgba(196,130,106,0.36);
          transition: all 0.2s;
        }
        .send-btn:hover:not(:disabled) { transform: scale(1.06); background: #B8735C; }
        .send-btn:disabled { opacity: 0.35; cursor: default; }

        /* 음성 모드 */
        .voice-center {
          display: flex; flex-direction: column;
          align-items: center; gap: 36px;
        }
        .voice-hint {
          font-size: 14px; color: #C8B898;
          font-family: 'Noto Serif KR', serif; letter-spacing: 0.04em;
        }
      `}</style>
    </div>
  )
}
