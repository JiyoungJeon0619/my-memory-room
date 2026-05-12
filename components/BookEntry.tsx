'use client'
// components/BookEntry.tsx
// 책에서 각 기억 카드를 렌더링
// image_url 있으면 실제 이미지, 없으면 수채화 그라디언트

import { Memory } from '@/types'
import { useState } from 'react'

const WC_GRADIENTS = [
  { bg: 'linear-gradient(135deg,#FFE4D6,#FFB89A,#E8967A)', emoji: '🌸' },
  { bg: 'linear-gradient(135deg,#D4E8D4,#A0C8A0,#5A8A5A)', emoji: '🌿' },
  { bg: 'linear-gradient(135deg,#FFF0D0,#FFD880,#C8A040)', emoji: '🌼' },
  { bg: 'linear-gradient(135deg,#D0E8F0,#88C0D8,#4880A8)', emoji: '🌊' },
  { bg: 'linear-gradient(135deg,#E8DFF0,#C0A8D8,#8870A8)', emoji: '✿'  },
  { bg: 'linear-gradient(135deg,#F8E8D0,#E0C090,#B08040)', emoji: '🍂' },
]

const TOPIC_ICONS: Record<string, string> = {
  '나의 이야기':'🙋‍♀️','가족 이야기':'👨‍👩‍👧','반려동물':'🐾',
  '고향과 추억':'🏡','일과 직업':'🧵','여행과 장소':'🌏',
  '음식과 요리':'🍲','꿈과 바람':'🌙',
}

interface Props {
  memory: Memory & {
    topic?: string
    trigger_question?: string
    image_url?: string
    wc_index: number
  }
  onClick: () => void
}

export default function BookEntry({ memory, onClick }: Props) {
  const [imgError, setImgError] = useState(false)
  const wc = WC_GRADIENTS[memory.wc_index % WC_GRADIENTS.length]
  const hasImage = memory.image_url && !imgError
  const dateLabel = new Date(memory.created_at).toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric'
  })

  return (
    <div className="entry" onClick={onClick}>

      {/* ── 이미지 ── */}
      <div
        className="entry-img"
        style={hasImage ? undefined : { background: wc.bg }}
      >
        {hasImage ? (
          <img
            src={memory.image_url!}
            alt="수채화로 그린 기억"
            className="entry-real-img"
            onError={() => setImgError(true)}
          />
        ) : (
          /* 이미지 없을 때 — 그라디언트 + 이모지 */
          <div className="entry-placeholder">
            <span className="entry-emoji">{wc.emoji}</span>
            <span className="entry-cap">수채화로 그린 기억</span>
          </div>
        )}

        {/* 이미지 위 수채화 오버레이 효과 */}
        <div className="entry-img-overlay" />
        <div className="entry-tap-hint">대화 보기 →</div>
      </div>

      {/* ── 메타 ── */}
      <div className="entry-meta">
        {memory.topic && (
          <span className="entry-topic">
            {TOPIC_ICONS[memory.topic] || ''} {memory.topic}
          </span>
        )}
        <span className="entry-date">{dateLabel}</span>
      </div>

      {/* ── 기억 문장 ── */}
      <div className="entry-quote">{memory.quote}</div>

      {/* ── 트리거 질문 ── */}
      {memory.trigger_question && (
        <div className="entry-ctx">
          <div className="entry-ctx-lbl">이 기억을 꺼낸 질문</div>
          {memory.trigger_question}
        </div>
      )}

      <style jsx>{`
        .entry { cursor: pointer; margin-bottom: 0; }

        .entry-img {
          border-radius: 18px; overflow: hidden; margin-bottom: 16px;
          box-shadow: 0 8px 28px rgba(40,32,15,0.1); height: 220px;
          position: relative; display: flex; align-items: center; justify-content: center;
          transition: transform 0.22s, box-shadow 0.22s;
        }
        .entry:hover .entry-img {
          transform: translateY(-3px);
          box-shadow: 0 16px 36px rgba(40,32,15,0.14);
        }

        /* 실제 이미지 */
        .entry-real-img {
          width: 100%; height: 100%; object-fit: cover; display: block;
        }

        /* 플레이스홀더 */
        .entry-placeholder { text-align: center; position: relative; z-index: 1; }
        .entry-emoji {
          font-size: 64px;
          filter: drop-shadow(0 6px 20px rgba(0,0,0,0.12));
          display: block; margin-bottom: 8px;
        }
        .entry-cap {
          font-size: 11px; color: rgba(255,255,255,0.68);
          letter-spacing: 0.14em; font-family: 'Noto Serif KR', serif;
        }

        /* 수채화 느낌 오버레이 — 실제 이미지 위에도 살짝 얹어서 그림 질감 */
        .entry-img-overlay {
          position: absolute; inset: 0; pointer-events: none;
          background:
            radial-gradient(ellipse at 20% 30%, rgba(255,255,255,0.08) 0%, transparent 50%),
            radial-gradient(ellipse at 80% 70%, rgba(0,0,0,0.06) 0%, transparent 50%);
        }

        .entry-tap-hint {
          position: absolute; bottom: 14px; right: 16px; z-index: 2;
          background: rgba(255,255,255,0.22); backdrop-filter: blur(6px);
          border-radius: 20px; padding: 5px 12px;
          font-size: 12px; color: rgba(255,255,255,0.9); letter-spacing: 0.06em;
        }

        .entry-meta {
          display: flex; align-items: center; gap: 8px; margin-bottom: 12px;
        }
        .entry-topic {
          font-size: 13px; color: #9A8870; background: white;
          border: 1px solid rgba(200,168,96,0.2); border-radius: 20px; padding: 4px 12px;
        }
        .entry-date {
          font-size: 13px; color: #C8B898; font-family: 'Noto Serif KR', serif;
        }

        .entry-quote {
          font-size: 19px; color: #5A4A30; line-height: 2.0;
          font-style: italic; padding: 0 6px; position: relative; margin-bottom: 14px;
        }
        .entry-quote::before {
          content: "\\201C"; font-size: 58px; color: #F0D4C8;
          font-style: normal; line-height: 1;
          position: absolute; top: -14px; left: -10px; font-family: 'Noto Serif KR', serif;
        }

        .entry-ctx {
          background: rgba(255,255,255,0.6);
          border-left: 2px solid #F0D4C8;
          border-radius: 0 12px 12px 0; padding: 12px 16px;
          font-size: 15px; color: #9A8870; line-height: 1.8;
        }
        .entry-ctx-lbl {
          font-size: 12px; color: #C8B898;
          letter-spacing: 0.08em; margin-bottom: 5px; font-family: 'Noto Serif KR', serif;
        }
      `}</style>
    </div>
  )
}
