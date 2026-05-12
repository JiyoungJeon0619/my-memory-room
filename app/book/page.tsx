// app/book/page.tsx
'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

export default function BookPage() {
  const router = useRouter()
  const supabase = createClient()
  const [memories, setMemories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadMemories() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }

      const { data } = await supabase
        .from('memories')
        .select('*')
        .order('created_at', { ascending: false })

      setMemories(data || [])
      setLoading(false)
    }
    loadMemories()
  }, [])

  const WC = [
    { bg: 'linear-gradient(135deg,#FFE4D6,#FFB89A,#E8967A)', emoji: '🌸' },
    { bg: 'linear-gradient(135deg,#D4E8D4,#A0C8A0,#5A8A5A)', emoji: '🌿' },
    { bg: 'linear-gradient(135deg,#FFF0D0,#FFD880,#C8A040)', emoji: '🌼' },
    { bg: 'linear-gradient(135deg,#D0E8F0,#88C0D8,#4880A8)', emoji: '🌊' },
    { bg: 'linear-gradient(135deg,#E8DFF0,#C0A8D8,#8870A8)', emoji: '✿'  },
    { bg: 'linear-gradient(135deg,#F8E8D0,#E0C090,#B08040)', emoji: '🍂' },
  ]

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg,#FAF6EF 0%,#F2E8D4 100%)',
      fontFamily: "'Gowun Batang',serif",
    }}>
      {/* 헤더 */}
      <div style={{
        background: 'rgba(253,250,244,0.96)', backdropFilter: 'blur(14px)',
        borderBottom: '1px solid rgba(200,168,96,0.14)',
        padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12,
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <button onClick={() => router.push('/chat')} style={{ background:'none', border:'none', fontSize:22, cursor:'pointer', opacity:0.5 }}>←</button>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:17, fontWeight:700, color:'#28200F' }}>나의 기억 책</div>
          <div style={{ fontSize:13, color:'#9A8870', marginTop:2 }}>기억 {memories.length}개가 담겼어요</div>
        </div>
      </div>

      <div style={{ padding: '24px 20px 60px' }}>
        {/* 표지 */}
        <div style={{ textAlign:'center', padding:'36px 16px 40px', borderBottom:'1px dashed rgba(200,168,96,0.3)', marginBottom:32 }}>
          <div style={{ fontSize:44, marginBottom:16 }}>📖</div>
          <div style={{ fontSize:24, fontWeight:700, color:'#28200F', marginBottom:8 }}>나의 이야기</div>
          <div style={{ fontSize:14, color:'#9A8870', lineHeight:1.9 }}>이곳에 담긴 모든 이야기는<br/>당신이 살아온 소중한 흔적입니다</div>
        </div>

        {loading && <div style={{ textAlign:'center', color:'#9A8870', padding:40 }}>불러오는 중...</div>}

        {!loading && memories.length === 0 && (
          <div style={{ textAlign:'center', padding:'60px 20px', color:'#9A8870' }}>
            <div style={{ fontSize:48, marginBottom:16 }}>🌱</div>
            <div style={{ fontSize:15, lineHeight:1.9 }}>아직 담긴 기억이 없어요.<br/>대화를 나눠보면 채워지기 시작해요.</div>
            <button
              onClick={() => router.push('/chat')}
              style={{
                marginTop:24, padding:'14px 28px', background:'#C4826A',
                color:'white', border:'none', borderRadius:14,
                fontSize:16, cursor:'pointer', fontFamily:"'Gowun Batang',serif",
              }}
            >
              대화 시작하기 →
            </button>
          </div>
        )}

        {!loading && memories.map((mem, i) => {
          const wc = WC[mem.wc_index % WC.length] || WC[0]
          const dateLabel = new Date(mem.created_at).toLocaleDateString('ko-KR', { year:'numeric', month:'long', day:'numeric' })
          return (
            <div key={mem.id} style={{ marginBottom:36 }}>
              {/* 이미지 */}
              <div style={{
                borderRadius:16, overflow:'hidden', marginBottom:14,
                boxShadow:'0 8px 28px rgba(40,32,15,0.1)', height:210,
                background: mem.image_url ? undefined : wc.bg,
                display:'flex', alignItems:'center', justifyContent:'center', position:'relative',
              }}>
                {mem.image_url ? (
                  <img src={mem.image_url} alt="기억" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
                ) : (
                  <div style={{ textAlign:'center' }}>
                    <div style={{ fontSize:60, filter:'drop-shadow(0 6px 20px rgba(0,0,0,0.12))' }}>{wc.emoji}</div>
                    <div style={{ fontSize:11, color:'rgba(255,255,255,0.68)', marginTop:8, letterSpacing:'0.14em' }}>수채화로 그린 기억</div>
                  </div>
                )}
              </div>
              {/* 날짜 */}
              <div style={{ fontSize:13, color:'#C8B898', marginBottom:10, fontFamily:'Noto Serif KR' }}>{dateLabel}</div>
              {/* 기억 문장 */}
              <div style={{
                fontSize:17, color:'#5A4A30', lineHeight:2.0,
                fontStyle:'italic', paddingLeft:6, position:'relative', marginBottom:14,
              }}>
                <span style={{ fontSize:54, color:'#F0D4C8', position:'absolute', top:-12, left:-10, fontStyle:'normal', lineHeight:1 }}>"</span>
                {mem.quote}
              </div>
              {/* 구분선 */}
              {i < memories.length - 1 && (
                <div style={{ height:1, background:'linear-gradient(to right,transparent,rgba(200,168,96,0.22),transparent)', margin:'28px 0' }}/>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}