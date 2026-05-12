'use client'
// components/MemoryCard.tsx
//
// 변경된 UX:
// "내 책에 담기" 클릭
//   → 즉시 "담겼어요 ✓" 표시 (사용자 대기 없음)
//   → 백그라운드에서 이미지 생성 폴링 시작
//   → 완성되면 카드 이미지 자연스럽게 교체

import { useState, useEffect, useRef } from 'react'

interface MemoryCardProps {
  quote:     string
  memoryId:  string
  sessionId: string
  messages:  { role: string; content: string }[]
  topic:     string
  onSaved:   () => void
}

type ImageStatus = 'idle' | 'pending' | 'done' | 'error'

const POLL_INTERVAL = 4000  // 4초마다 폴링
const POLL_TIMEOUT  = 120000 // 2분 후 포기

export default function MemoryCard({
  quote, memoryId, sessionId, messages, topic, onSaved
}: MemoryCardProps) {
  const [saved,       setSaved]       = useState(false)
  const [imageStatus, setImageStatus] = useState<ImageStatus>('idle')
  const [imageUrl,    setImageUrl]    = useState<string | null>(null)
  const pollRef = useRef<NodeJS.Timeout | null>(null)
  const startRef = useRef<number>(0)

  // 언마운트 시 폴링 정리
  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [])

  // 폴링 함수
  function startPolling() {
    startRef.current = Date.now()
    pollRef.current = setInterval(async () => {
      // 타임아웃 초과 시 중단
      if (Date.now() - startRef.current > POLL_TIMEOUT) {
        clearInterval(pollRef.current!)
        setImageStatus('error')
        return
      }
      try {
        const res  = await fetch(`/api/image/status?memoryId=${memoryId}`)
        const data = await res.json()

        if (data.imageStatus === 'done' && data.imageUrl) {
          clearInterval(pollRef.current!)
          setImageUrl(data.imageUrl)
          setImageStatus('done')
        } else if (data.imageStatus === 'error') {
          clearInterval(pollRef.current!)
          setImageStatus('error')
        }
        // 'pending'이면 계속 폴링
      } catch {
        // 네트워크 오류는 무시하고 폴링 유지
      }
    }, POLL_INTERVAL)
  }

  async function handleSave() {
    if (saved) return

    // 1. 즉시 저장 완료 UI 표시
    setSaved(true)
    setImageStatus('pending')
    onSaved()

    // 2. 백그라운드 이미지 생성 요청 (fire)
    try {
      await fetch('/api/image/generate', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages, memoryQuote: quote, topic, sessionId, memoryId }),
      })
      // 3. 폴링 시작 (forget)
      startPolling()
    } catch {
      setImageStatus('error')
    }
  }

  async function handleRetry() {
    setImageStatus('pending')
    try {
      await fetch('/api/image/generate', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages, memoryQuote: quote, topic, sessionId, memoryId }),
      })
      startPolling()
    } catch {
      setImageStatus('error')
    }
  }

  return (
    <div className="memory-card">

      {/* ── 이미지 영역 ── */}
      <div className="mc-img-wrap">

        {/* 이미지 완성 */}
        {imageStatus === 'done' && imageUrl && (
          <img src={imageUrl} alt="수채화로 그린 기억" className="mc-image" />
        )}

        {/* 생성 대기 전 */}
        {imageStatus === 'idle' && (
          <div className="mc-placeholder">
            <span className="mc-ph-icon">🎨</span>
            <p className="mc-ph-text">저장하면 수채화로 그려드릴게요</p>
          </div>
        )}

        {/* 생성 중 — 부드러운 펄스 애니메이션 */}
        {imageStatus === 'pending' && (
          <div className="mc-pending">
            <div className="mc-pending-brush">🖌️</div>
            <p className="mc-pending-text">수채화를 그리는 중이에요</p>
            <p className="mc-pending-sub">책을 열면 완성된 그림이 기다리고 있을 거예요</p>
          </div>
        )}

        {/* 에러 */}
        {imageStatus === 'error' && (
          <div className="mc-error">
            <span>😔</span>
            <p>그림을 그리지 못했어요</p>
            <button onClick={handleRetry} className="mc-retry">다시 시도</button>
          </div>
        )}
      </div>

      {/* ── 기억 문장 ── */}
      <div className="mc-body">
        <p className="mc-date">
          {new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
        <p className="mc-quote">{quote}</p>
      </div>

      {/* ── 저장 버튼 / 완료 라벨 ── */}
      {!saved ? (
        <button className="mc-save-btn" onClick={handleSave}>
          📚 내 책에 담기
        </button>
      ) : (
        <div className="mc-saved">
          ✓ 책에 담겼어요
          {imageStatus === 'pending' && (
            <span className="mc-saved-sub"> · 그림 그리는 중 🖌️</span>
          )}
        </div>
      )}

      <style jsx>{`
        .memory-card {
          background: white;
          border: 1px solid rgba(200,168,96,0.18);
          border-radius: 18px; overflow: hidden;
          box-shadow: 0 6px 24px rgba(40,32,15,0.09);
        }
        .mc-img-wrap {
          width: 100%; height: 200px; position: relative; overflow: hidden;
          background: linear-gradient(135deg, #FAF0E8, #F0DED0);
          display: flex; align-items: center; justify-content: center;
        }
        .mc-image {
          width: 100%; height: 100%; object-fit: cover; display: block;
          animation: fadeIn 0.8s ease;
        }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

        /* 플레이스홀더 */
        .mc-placeholder { text-align: center; }
        .mc-ph-icon { font-size: 40px; display: block; margin-bottom: 10px; }
        .mc-ph-text { font-size: 13px; color: #9A8870; font-family: 'Noto Serif KR', serif; }

        /* 생성 중 */
        .mc-pending { text-align: center; }
        .mc-pending-brush {
          font-size: 38px; display: block; margin-bottom: 12px;
          animation: sway 2s ease-in-out infinite;
        }
        @keyframes sway {
          0%,100% { transform: rotate(-8deg); }
          50%      { transform: rotate(8deg); }
        }
        .mc-pending-text {
          font-size: 14px; color: #5A4A30; margin-bottom: 6px;
          font-family: 'Gowun Batang', serif;
        }
        .mc-pending-sub {
          font-size: 12px; color: #C8B898; line-height: 1.6;
          font-family: 'Noto Serif KR', serif; padding: 0 16px;
        }

        /* 에러 */
        .mc-error { text-align: center; }
        .mc-error span { font-size: 32px; display: block; margin-bottom: 8px; }
        .mc-error p { font-size: 13px; color: #9A8870; margin-bottom: 10px; }
        .mc-retry {
          background: #C4826A; color: white; border: none;
          border-radius: 8px; padding: 7px 16px; font-size: 13px;
          cursor: pointer; font-family: 'Gowun Batang', serif;
        }

        /* 본문 */
        .mc-body { padding: 16px 18px; }
        .mc-date {
          font-size: 11px; color: #C8B898;
          letter-spacing: 0.06em; margin-bottom: 8px; font-family: 'Noto Serif KR', serif;
        }
        .mc-quote { font-size: 15px; color: #5A4A30; line-height: 1.8; font-style: italic; }

        /* 버튼 */
        .mc-save-btn {
          width: 100%; padding: 13px; background: none; border: none;
          border-top: 1px solid rgba(200,168,96,0.12);
          font-size: 13px; color: #C4826A; cursor: pointer;
          font-family: 'Gowun Batang', serif; letter-spacing: 0.04em; transition: background 0.2s;
        }
        .mc-save-btn:hover { background: rgba(196,130,106,0.05); }
        .mc-saved {
          width: 100%; padding: 13px; text-align: center;
          font-size: 13px; color: #7A9878; border-top: 1px solid rgba(200,168,96,0.12);
          font-family: 'Gowun Batang', serif; letter-spacing: 0.04em;
        }
        .mc-saved-sub { color: #C4826A; font-size: 12px; }
      `}</style>
    </div>
  )
}

