'use client'
// components/VoiceButton.tsx
// 채팅 입력창 옆에 위치하는 음성 녹음 버튼
// 상태에 따라 시각적 피드백 제공

import { useVoiceInput } from '@/hooks/useVoiceInput'

interface VoiceButtonProps {
  onTranscript: (text: string) => void   // 변환된 텍스트 → 부모에서 처리
  disabled?:    boolean
}

export default function VoiceButton({ onTranscript, disabled }: VoiceButtonProps) {
  const {
    status,
    interimText,
    isSupported,
    startRecording,
    stopRecording,
    strategy,
  } = useVoiceInput({
    onTranscript,
    onError: (msg) => alert(msg), // 실제 서비스에선 토스트로 교체
  })

  if (!isSupported) return null

  const isRecording     = status === 'recording'
  const isTranscribing  = status === 'transcribing'
  const isBusy          = isRecording || isTranscribing

  function handleClick() {
    if (disabled) return
    if (isRecording) {
      stopRecording()
    } else if (!isTranscribing) {
      startRecording()
    }
  }

  return (
    <div className="voice-wrap">

      {/* 실시간 중간 텍스트 — Web Speech일 때만 표시 */}
      {interimText && strategy === 'webspeech' && (
        <div className="interim-box">
          <p className="interim-text">{interimText}</p>
          <span className="interim-badge">인식 중...</span>
        </div>
      )}

      {/* Whisper 변환 중 안내 */}
      {isTranscribing && (
        <div className="transcribing-box">
          <div className="transcribing-spinner" />
          <p className="transcribing-text">말씀을 글로 옮기는 중이에요...</p>
        </div>
      )}

      {/* 메인 버튼 */}
      <button
        className={`voice-btn ${isRecording ? 'recording' : ''} ${isTranscribing ? 'busy' : ''}`}
        onClick={handleClick}
        disabled={disabled || isTranscribing}
        aria-label={isRecording ? '녹음 중지' : '음성으로 말하기'}
      >
        {isTranscribing ? (
          <span className="btn-icon">⏳</span>
        ) : isRecording ? (
          <span className="btn-icon stop-icon">⏹</span>
        ) : (
          <span className="btn-icon">🎙️</span>
        )}
      </button>

      {/* 녹음 중 파형 애니메이션 */}
      {isRecording && (
        <div className="wave-wrap" aria-hidden>
          {[1,2,3,4,5].map(i => (
            <div key={i} className="wave-bar" style={{ animationDelay: `${i * 0.1}s` }} />
          ))}
        </div>
      )}

      <style jsx>{`
        .voice-wrap {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          position: relative;
        }

        /* ── 메인 버튼 ── */
        .voice-btn {
          width: 52px; height: 52px; border-radius: 50%;
          background: white;
          border: 1.5px solid rgba(196,130,106,0.3);
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; transition: all 0.2s;
          flex-shrink: 0;
          box-shadow: 0 2px 10px rgba(40,32,15,0.08);
        }
        .voice-btn:hover:not(:disabled) {
          border-color: #C4826A;
          box-shadow: 0 4px 16px rgba(196,130,106,0.2);
        }
        .voice-btn:disabled { opacity: 0.4; cursor: default; }

        /* 녹음 중 — 붉은 펄스 */
        .voice-btn.recording {
          background: #C4826A;
          border-color: #C4826A;
          animation: pulse 1.4s ease-in-out infinite;
          box-shadow: 0 0 0 0 rgba(196,130,106,0.5);
        }
        @keyframes pulse {
          0%   { box-shadow: 0 0 0 0 rgba(196,130,106,0.5); }
          70%  { box-shadow: 0 0 0 12px rgba(196,130,106,0); }
          100% { box-shadow: 0 0 0 0 rgba(196,130,106,0); }
        }

        .btn-icon { font-size: 22px; line-height: 1; }
        .stop-icon { filter: brightness(10); }  /* 빨간 배경에서 흰 아이콘 */

        /* ── 파형 애니메이션 ── */
        .wave-wrap {
          display: flex; align-items: center; gap: 3px;
          height: 20px; position: absolute; bottom: -26px;
        }
        .wave-bar {
          width: 3px; border-radius: 2px;
          background: #C4826A; opacity: 0.7;
          animation: wave 0.8s ease-in-out infinite alternate;
        }
        @keyframes wave {
          from { height: 4px; }
          to   { height: 18px; }
        }
        .wave-bar:nth-child(1) { animation-delay: 0.0s; }
        .wave-bar:nth-child(2) { animation-delay: 0.1s; }
        .wave-bar:nth-child(3) { animation-delay: 0.2s; }
        .wave-bar:nth-child(4) { animation-delay: 0.1s; }
        .wave-bar:nth-child(5) { animation-delay: 0.0s; }

        /* ── 중간 텍스트 (Web Speech 실시간) ── */
        .interim-box {
          position: absolute;
          bottom: calc(100% + 12px);
          left: 50%; transform: translateX(-50%);
          width: 260px;
          background: white;
          border: 1px solid rgba(196,130,106,0.2);
          border-radius: 14px; padding: 12px 14px;
          box-shadow: 0 4px 20px rgba(40,32,15,0.1);
          z-index: 10;
        }
        .interim-text {
          font-size: 14px; color: #5A4A30;
          line-height: 1.7; font-family: 'Gowun Batang', serif;
          margin-bottom: 6px;
        }
        .interim-badge {
          font-size: 11px; color: #C4826A;
          font-family: 'Noto Serif KR', serif; letter-spacing: 0.06em;
        }

        /* ── Whisper 변환 중 ── */
        .transcribing-box {
          position: absolute;
          bottom: calc(100% + 12px);
          left: 50%; transform: translateX(-50%);
          width: 220px;
          background: white;
          border: 1px solid rgba(196,130,106,0.2);
          border-radius: 14px; padding: 14px;
          box-shadow: 0 4px 20px rgba(40,32,15,0.1);
          text-align: center; z-index: 10;
        }
        .transcribing-spinner {
          width: 24px; height: 24px; border-radius: 50%;
          border: 2px solid rgba(196,130,106,0.2);
          border-top-color: #C4826A;
          animation: spin 0.9s linear infinite;
          margin: 0 auto 8px;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .transcribing-text {
          font-size: 13px; color: #9A8870;
          font-family: 'Noto Serif KR', serif; line-height: 1.6;
        }
      `}</style>
    </div>
  )
}
