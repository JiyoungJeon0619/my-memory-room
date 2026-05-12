'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

type Step = 'greeting' | 'birth' | 'gender' | 'topics'

const TOPICS = [
  { key: '나의 이야기', icon: '🙋‍♀️' },
  { key: '가족 이야기', icon: '👨‍👩‍👧' },
  { key: '반려동물',   icon: '🐾' },
  { key: '고향과 추억', icon: '🏡' },
  { key: '일과 직업', icon: '🧵' },
  { key: '여행과 장소', icon: '🌏' },
  { key: '음식과 요리', icon: '🍲' },
  { key: '꿈과 바람',  icon: '🌙' },
]

interface ChatMsg { role: 'ai' | 'user'; text: string }

export default function OnboardingPage() {
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep]               = useState<Step>('greeting')
  const [chatLog, setChatLog]         = useState<ChatMsg[]>([])
  const [inputVal, setInputVal]       = useState('')
  const [name, setName]               = useState('')
  const [birth, setBirth]             = useState('')
  const [gender, setGender]           = useState('')
  const [selectedTopics, setSelectedTopics] = useState<string[]>([])
  const [saving, setSaving]           = useState(false)
  const [done, setDone]               = useState(false)

  const stepIndex = { greeting:0, birth:1, gender:2, topics:3 }[step]

  useEffect(() => {
    loadProfile()
  }, [])

  async function loadProfile() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/'); return }

    const { data: prof } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', user.id)
      .single()

    const userName = prof?.name || '어머니'
    setName(userName)

    // 첫 인사 — 이름은 카카오에서 이미 가져옴
    setTimeout(() => {
      addMsg('ai', `어서 오세요, ${userName}님. 🌸\n\n이곳은 당신만의 이야기를 담는 조용한 방이에요.\n\n몇 년생이세요? 부담 없이 알려주시면 돼요.\n(예: 1952년생)`)
      setStep('birth')
    }, 400)
  }

  function addMsg(role: 'ai' | 'user', text: string) {
    setChatLog(prev => [...prev, { role, text }])
  }

  function handleSend() {
    const val = inputVal.trim()
    if (!val) return
    setInputVal('')
    addMsg('user', val)

    if (step === 'birth') {
      setBirth(val)
      setTimeout(() => {
        addMsg('ai', `감사해요. 🌿\n\n성별을 알려주시면 더 자연스럽게 이야기 나눌 수 있어요.`)
        setStep('gender')
      }, 600)
    }
  }

  function handleGender(g: string) {
    setGender(g)
    addMsg('user', g)
    setTimeout(() => {
      addMsg('ai', `좋아요. 🌸\n\n이 방에서 어떤 이야기를 담고 싶으세요?\n마음에 드는 것을 골라주세요. 여러 개도 괜찮아요.`)
      setStep('topics')
    }, 600)
  }

  function toggleTopic(key: string) {
    setSelectedTopics(prev =>
      prev.includes(key) ? prev.filter(t => t !== key) : [...prev, key]
    )
  }

  async function handleConfirm() {
    if (selectedTopics.length === 0) return
    setSaving(true)

    const topicText = selectedTopics.join(', ')
    addMsg('user', `${topicText} 이야기를 담고 싶어요`)

    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('profiles').update({
        birth_year: birth,
        gender,
        topics: selectedTopics,
      }).eq('id', user.id)
    }

    setTimeout(() => {
      addMsg('ai', `${name}님, 정말 좋아요. 💛\n\n${topicText}에 대한 이야기들을\n천천히 함께 풀어나가 볼게요.\n\n준비되셨으면 시작해볼까요?`)
      setDone(true)
      setSaving(false)
    }, 800)
  }

  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(180deg,#FAF6EF 0%,#F5EBD8 100%)', fontFamily:"'Gowun Batang',serif", display:'flex', flexDirection:'column' }}>

      {/* 헤더 */}
      <div style={{ padding:'20px 20px 0', display:'flex', alignItems:'center', gap:10 }}>
        <span style={{ fontSize:20 }}>📖</span>
        <span style={{ fontSize:15, fontWeight:700, color:'#5A4A30' }}>기억의 방</span>
        <div style={{ marginLeft:'auto', display:'flex', gap:5 }}>
          {[0,1,2,3].map(i => (
            <div key={i} style={{ width:i===stepIndex?18:6, height:6, borderRadius:3, background:i===stepIndex?'#C4826A':'#C8B898', transition:'all 0.3s' }}/>
          ))}
        </div>
      </div>

      {/* 대화 */}
      <div style={{ flex:1, overflowY:'auto', padding:'28px 20px 16px', display:'flex', flexDirection:'column', gap:18 }}>
        {chatLog.map((msg, i) => (
          <div key={i}>
            {msg.role === 'ai' ? (
              <div style={{ display:'flex', alignItems:'flex-start', gap:10 }}>
                <div style={{ width:34, height:34, borderRadius:'50%', background:'linear-gradient(135deg,#F0D4C8,#E8C0AC)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, flexShrink:0 }}>🌸</div>
                <div style={{ background:'white', border:'1px solid rgba(200,168,96,0.15)', borderRadius:'5px 18px 18px 18px', padding:'14px 18px', fontSize:16, lineHeight:1.85, color:'#28200F', boxShadow:'0 3px 14px rgba(40,32,15,0.07)' }}>
                  {msg.text.split('\n').map((line, j, arr) => <span key={j}>{line}{j < arr.length-1 && <br/>}</span>)}
                </div>
              </div>
            ) : (
              <div style={{ display:'flex', justifyContent:'flex-end' }}>
                <div style={{ background:'#C4826A', color:'white', borderRadius:'18px 5px 18px 18px', padding:'14px 18px', fontSize:16, lineHeight:1.8, maxWidth:'80%', boxShadow:'0 4px 18px rgba(196,130,106,0.32)' }}>{msg.text}</div>
              </div>
            )}
          </div>
        ))}

        {/* 성별 선택 버튼 */}
        {step === 'gender' && !gender && (
          <div style={{ display:'flex', gap:12, marginTop:4 }}>
            {['여성', '남성'].map(g => (
              <button key={g} onClick={() => handleGender(g)} style={{ flex:1, padding:'16px', background:'white', border:'2px solid rgba(200,168,96,0.2)', borderRadius:16, fontSize:16, color:'#5A4A30', cursor:'pointer', fontFamily:"'Gowun Batang',serif", transition:'all 0.2s' }}>
                {g === '여성' ? '👩 여성' : '👨 남성'}
              </button>
            ))}
          </div>
        )}

        {/* 주제 선택 */}
        {step === 'topics' && !done && (
          <div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              {TOPICS.map(t => {
                const selected = selectedTopics.includes(t.key)
                return (
                  <div key={t.key} onClick={() => toggleTopic(t.key)} style={{ background:'white', border:`2px solid ${selected?'#C4826A':'rgba(200,168,96,0.2)'}`, borderRadius:16, padding:'16px 12px', textAlign:'center', cursor:'pointer', position:'relative', boxShadow:selected?'0 4px 16px rgba(196,130,106,0.2)':'none' }}>
                    {selected && <div style={{ position:'absolute', top:8, right:10, fontSize:11, color:'#C4826A', fontWeight:700 }}>✓</div>}
                    <div style={{ fontSize:28, marginBottom:8 }}>{t.icon}</div>
                    <div style={{ fontSize:14, color:'#5A4A30' }}>{t.key}</div>
                  </div>
                )
              })}
            </div>
            {selectedTopics.length > 0 && (
              <button onClick={handleConfirm} disabled={saving} style={{ width:'100%', padding:15, background:'#C4826A', color:'white', border:'none', borderRadius:14, fontSize:16, fontFamily:"'Gowun Batang',serif", cursor:'pointer', marginTop:12, boxShadow:'0 6px 20px rgba(196,130,106,0.32)' }}>
                선택 완료 ({selectedTopics.length}개)
              </button>
            )}
          </div>
        )}

        {/* 시작 버튼 */}
        {done && (
          <button onClick={() => router.push('/chat')} style={{ width:'100%', padding:20, background:'#C4826A', color:'white', border:'none', borderRadius:16, fontSize:18, fontFamily:"'Gowun Batang',serif", cursor:'pointer', margin:'16px 0 8px', boxShadow:'0 8px 28px rgba(196,130,106,0.38)' }}>
            이야기 시작하기 →
          </button>
        )}
      </div>

      {/* 입력창 — 생년월일 입력 시만 */}
      {step === 'birth' && (
        <div style={{ padding:'12px 16px 28px', background:'rgba(250,246,239,0.98)', borderTop:'1px solid rgba(200,168,96,0.12)' }}>
          <div style={{ display:'flex', gap:10, alignItems:'center' }}>
            <input
              style={{ flex:1, background:'white', border:'1.5px solid rgba(200,168,96,0.25)', borderRadius:14, padding:'13px 16px', fontSize:16, fontFamily:"'Gowun Batang',serif", color:'#28200F', outline:'none', boxSizing:'border-box' }}
              value={inputVal}
              onChange={e => setInputVal(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder="예: 1952년생"
            />
            <button onClick={handleSend} style={{ width:48, height:48, borderRadius:'50%', background:'#C4826A', border:'none', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, cursor:'pointer', color:'white', flexShrink:0, boxShadow:'0 4px 16px rgba(196,130,106,0.36)' }}>→</button>
          </div>
        </div>
      )}
    </div>
  )
}