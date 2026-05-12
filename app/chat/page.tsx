'use client'

import { useEffect, useRef, useState, useReducer } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useVoiceInput } from '@/hooks/useVoiceInput'

interface Message { id: string; role: 'user' | 'assistant'; content: string }

type Action =
  | { type: 'ADD'; msg: Message }
  | { type: 'SET'; msgs: Message[] }

function reducer(state: Message[], action: Action): Message[] {
  if (action.type === 'ADD') return [...state, action.msg]
  if (action.type === 'SET') return action.msgs
  return state
}

const WC = [
  { bg:'linear-gradient(135deg,#FFE4D6,#FFB89A,#E8967A)', emoji:'🌸' },
  { bg:'linear-gradient(135deg,#D4E8D4,#A0C8A0,#5A8A5A)', emoji:'🌿' },
  { bg:'linear-gradient(135deg,#FFF0D0,#FFD880,#C8A040)', emoji:'🌼' },
  { bg:'linear-gradient(135deg,#D0E8F0,#88C0D8,#4880A8)', emoji:'🌊' },
  { bg:'linear-gradient(135deg,#E8DFF0,#C0A8D8,#8870A8)', emoji:'✿' },
  { bg:'linear-gradient(135deg,#F8E8D0,#E0C090,#B08040)', emoji:'🍂' },
]

const TOPICS = [
  { key:'나의 이야기', icon:'🙋‍♀️' }, { key:'가족 이야기', icon:'👨‍👩‍👧' },
  { key:'반려동물', icon:'🐾' }, { key:'고향과 추억', icon:'🏡' },
  { key:'일과 직업', icon:'🧵' }, { key:'여행과 장소', icon:'🌏' },
  { key:'음식과 요리', icon:'🍲' }, { key:'꿈과 바람', icon:'🌙' },
]

export default function ChatPage() {
  const router = useRouter()
  const supabase = createClient()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const taRef = useRef<HTMLTextAreaElement>(null)
  const sessionIdRef = useRef<string | null>(null)
  const profileRef = useRef<any>(null)

  const [messages, dispatch] = useReducer(reducer, [])
  const [isMounted, setIsMounted] = useState(false)
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [profile, setProfile] = useState<any>(null)
  const [pendingMemory, setPendingMemory] = useState<{ quote: string; saved: boolean } | null>(null)
  const [memoryCount, setMemoryCount] = useState(0)
  const [mode, setMode] = useState<'type' | 'voice'>('type')
  const [showTopicModal, setShowTopicModal] = useState(false)
  const [localTopics, setLocalTopics] = useState<string[]>([])

  const { status: voiceStatus, interimText, startRecording, stopRecording } = useVoiceInput({
    onTranscript: (text) => { sendMessage(text); setMode('type') },
  })

  useEffect(() => {
    initChat()
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping, pendingMemory])

  async function initChat() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/'); return }

    const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    setProfile(prof)
    profileRef.current = prof
    setLocalTopics(prof?.topics || [])

    const { count } = await supabase.from('memories').select('*', { count: 'exact', head: true }).eq('user_id', user.id)
    setMemoryCount(count || 0)

    const { data: session } = await supabase.from('sessions').insert({ user_id: user.id, title: '새 대화' }).select().single()
    if (session) sessionIdRef.current = session.id

    setIsTyping(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [], profile: prof, isWrapUp: false }),
      })
      const data = await res.json()
      const greeting = data.reply || ''
      dispatch({ type: 'SET', msgs: [{ id: `init-${Date.now()}`, role: 'assistant', content: greeting }] })
      if (session) {
        await supabase.from('messages').insert({ session_id: session.id, user_id: user.id, role: 'assistant', content: greeting })
      }
    } catch (e) {
      console.error('initChat error:', e)
    } finally {
      setIsTyping(false)
    }
  }

  async function sendMessage(text?: string, isWrapUp = false) {
    const content = text ?? input.trim()
    if (!content) return
    if (!isWrapUp && isTyping) return

    setInput('')
    if (taRef.current) taRef.current.style.height = 'auto'

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const userMsg: Message = { id: `u-${Date.now()}`, role: 'user', content }
    dispatch({ type: 'ADD', msg: userMsg })

    const currentSessionId = sessionIdRef.current
    const currentProfile = profileRef.current

    if (currentSessionId) {
      await supabase.from('messages').insert({ session_id: currentSessionId, user_id: user.id, role: 'user', content })
    }

    setIsTyping(true)

    // 현재 messages를 직접 읽지 않고 userMsg만 추가된 배열을 직접 구성
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [...messages, userMsg].map(m => ({ role: m.role, content: m.content })),
        profile: currentProfile,
        isWrapUp,
      }),
    })

    try {
      const data = await res.json()
      const reply: string = data.reply || ''
      console.log('[isWrapUp sent]', isWrapUp)
      console.log('[Reply received]', reply.slice(0, 80))

      const memMatch = reply.match(/\[MEMORY:\s*([\s\S]+?)(?:\]|$)/)
      const cleanReply = reply.replace(/\[MEMORY:[\s\S]*?(?:\]|$)/g, '').trim()

      const assistantMsg: Message = { id: `a-${Date.now()}`, role: 'assistant', content: cleanReply }
      dispatch({ type: 'ADD', msg: assistantMsg })

      if (currentSessionId) {
        await supabase.from('messages').insert({ session_id: currentSessionId, user_id: user.id, role: 'assistant', content: cleanReply })
      }

      if (memMatch) {
        setTimeout(() => setPendingMemory({ quote: memMatch[1].trim(), saved: false }), 600)
      }
    } catch (e) {
      console.error('sendMessage error:', e)
      dispatch({ type: 'ADD', msg: { id: 'err', role: 'assistant', content: '잠시 연결이 끊겼어요.' } })
    } finally {
      setIsTyping(false)
    }
  }

  async function saveMemory() {
    if (!pendingMemory) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: mem } = await supabase.from('memories').insert({
      user_id: user.id, session_id: sessionIdRef.current,
      quote: pendingMemory.quote, wc_index: memoryCount % WC.length, image_status: 'none',
    }).select().single()
    setPendingMemory({ ...pendingMemory, saved: true })
    setMemoryCount(prev => prev + 1)
    setTimeout(() => setPendingMemory(null), 2000)
    if (mem) {
      fetch('/api/image/generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memoryId: mem.id, sessionId: sessionIdRef.current,
          memoryQuote: pendingMemory.quote,
          topic: profileRef.current?.topics?.[0] || '삶',
          messages: messages.map(m => ({ role: m.role, content: m.content })),
        }),
      })
    }
  }

  async function saveTopics() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('profiles').update({ topics: localTopics }).eq('id', user.id)
    setProfile((prev: any) => ({ ...prev, topics: localTopics }))
    profileRef.current = { ...profileRef.current, topics: localTopics }
    setShowTopicModal(false)
  }

  function speak(text: string) {
    if (!window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const utt = new SpeechSynthesisUtterance(text.replace(/\n/g, ' '))
    utt.lang = 'ko-KR'; utt.rate = 0.88
    const voices = window.speechSynthesis.getVoices()
    const ko = voices.find(v => v.lang.startsWith('ko'))
    if (ko) utt.voice = ko
    window.speechSynthesis.speak(utt)
  }

  const wc = WC[memoryCount % WC.length]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'linear-gradient(180deg,#FAF6EF 0%,#F5EAD8 100%)', fontFamily: "'Gowun Batang',serif" }}>

      {/* 헤더 */}
      <div style={{ background: 'rgba(253,250,244,0.96)', backdropFilter: 'blur(14px)', borderBottom: '1px solid rgba(200,168,96,0.14)', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <button onClick={() => router.push('/')} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', opacity: 0.5 }}>←</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: '#28200F' }}>
            {profile?.name ? `${profile.name}님의 기억의 방` : '기억의 방'}
          </div>
        </div>
        <button onClick={() => sendMessage('오늘 이야기를 마무리할게요.', true)} style={{ background: 'rgba(196,130,106,0.12)', border: '1px solid rgba(196,130,106,0.25)', borderRadius: 20, padding: '7px 12px', fontSize: 12, color: '#C4826A', cursor: 'pointer', fontFamily: "'Gowun Batang',serif" }}>🌸 마무리</button>
        <button onClick={() => { setLocalTopics(profile?.topics || []); setShowTopicModal(true) }} style={{ background: 'rgba(200,168,96,0.12)', border: '1px solid rgba(200,168,96,0.25)', borderRadius: 20, padding: '7px 12px', fontSize: 12, color: '#5A4A30', cursor: 'pointer', fontFamily: "'Gowun Batang',serif" }}>⚙️ 주제</button>
        <button onClick={() => router.push('/book')} style={{ background: '#F0DEB8', border: '1px solid rgba(200,160,96,0.28)', borderRadius: 20, padding: '7px 12px', fontSize: 12, color: '#5A4A30', cursor: 'pointer', fontFamily: "'Gowun Batang',serif" }}>📚 ({memoryCount})</button>
      </div>

      {/* 메시지 영역 */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 18px', display: 'flex', flexDirection: 'column', gap: 18 }}>
        {messages.map(msg => (
          <div key={msg.id}>
            {msg.role === 'assistant' ? (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, maxWidth: '90%' }}>
                <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg,#F0D4C8,#E8C0AC)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0 }}>🌸</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ background: 'white', border: '1px solid rgba(200,168,96,0.15)', borderRadius: '5px 16px 16px 16px', padding: '13px 17px', fontSize: 17, lineHeight: 1.85, color: '#28200F', boxShadow: '0 2px 12px rgba(40,32,15,0.06)' }}>
                    {msg.content.split('\n').map((line, i, arr) => <span key={i}>{line}{i < arr.length - 1 && <br />}</span>)}
                  </div>
                  <button onClick={() => speak(msg.content)} style={{ alignSelf: 'flex-start', background: 'rgba(200,168,96,0.1)', border: '1px solid rgba(200,168,96,0.2)', borderRadius: 20, padding: '5px 12px', fontSize: 12, color: '#9A8870', cursor: 'pointer', fontFamily: "'Gowun Batang',serif" }}>🔊 읽어주기</button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <div style={{ background: '#C4826A', color: 'white', borderRadius: '16px 5px 16px 16px', padding: '13px 17px', fontSize: 17, lineHeight: 1.8, maxWidth: '80%', boxShadow: '0 4px 16px rgba(196,130,106,0.3)' }}>{msg.content}</div>
              </div>
            )}
          </div>
        ))}

        {isTyping && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, paddingLeft: 44 }}>
            <div style={{ background: 'white', border: '1px solid rgba(200,168,96,0.15)', borderRadius: '5px 16px 16px 16px', padding: '14px 18px', display: 'flex', gap: 5, alignItems: 'center' }}>
              {[0, 1, 2].map(i => <div key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: '#E8C0AC', animation: `bounce 1.2s ${i * 0.18}s infinite` }} />)}
            </div>
          </div>
        )}

        {pendingMemory && (
          <div style={{ background: 'white', border: '1px solid rgba(200,168,96,0.18)', borderRadius: 18, overflow: 'hidden', boxShadow: '0 6px 24px rgba(40,32,15,0.09)', animation: 'fadeIn 0.5s ease' }}>
            <div style={{ height: 160, background: wc.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 54, filter: 'drop-shadow(0 6px 16px rgba(0,0,0,0.12))' }}>{wc.emoji}</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.68)', marginTop: 8, letterSpacing: '0.14em' }}>수채화로 그린 기억</div>
              </div>
            </div>
            <div style={{ padding: '14px 18px' }}>
              <div style={{ fontSize: 15, color: '#5A4A30', lineHeight: 1.8, fontStyle: 'italic' }}>{pendingMemory.quote}</div>
            </div>
            {!pendingMemory.saved ? (
              <button onClick={saveMemory} style={{ width: '100%', padding: 13, background: 'none', border: 'none', borderTop: '1px solid rgba(200,168,96,0.12)', fontSize: 13, color: '#C4826A', cursor: 'pointer', fontFamily: "'Gowun Batang',serif" }}>📚 내 책에 담기</button>
            ) : (
              <div style={{ padding: 13, textAlign: 'center', fontSize: 13, color: '#7A9878', borderTop: '1px solid rgba(200,168,96,0.12)' }}>✓ 책에 담겼어요 · 수채화 그리는 중 🖌️</div>
            )}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 입력창 */}
      <div style={{ background: 'rgba(253,250,244,0.98)', borderTop: '1px solid rgba(200,168,96,0.13)', padding: '12px 16px 28px', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
          {(['type', 'voice'] as const).map(m => (
            <button key={m} onClick={() => setMode(m)} style={{ padding: '6px 14px', borderRadius: 20, border: '1.5px solid', borderColor: mode === m ? '#C4826A' : 'rgba(200,168,96,0.25)', background: mode === m ? '#C4826A' : 'none', color: mode === m ? 'white' : '#9A8870', fontSize: 13, cursor: 'pointer', fontFamily: "'Gowun Batang',serif" }}>
              {m === 'type' ? '✏️ 쓰기' : '🎙️ 말하기'}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
          {mode === 'type' ? (
            <>
              <textarea ref={taRef} value={input} onChange={e => { setInput(e.target.value); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px' }} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }} placeholder="이야기를 들려주세요..." rows={1} style={{ flex: 1, background: 'white', border: '1.5px solid rgba(200,168,96,0.25)', borderRadius: 14, padding: '12px 16px', fontSize: 17, fontFamily: "'Gowun Batang',serif", color: '#28200F', resize: 'none', minHeight: 48, maxHeight: 120, lineHeight: 1.65, outline: 'none' }} />
              <button onClick={() => sendMessage()} disabled={!input.trim() || isTyping} style={{ width: 48, height: 48, borderRadius: '50%', background: '#C4826A', border: 'none', cursor: 'pointer', fontSize: 18, color: 'white', flexShrink: 0, boxShadow: '0 4px 16px rgba(196,130,106,0.36)' }}>→</button>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '8px 0' }}>
              <button onClick={() => voiceStatus === 'recording' ? stopRecording() : startRecording()} style={{ width: 64, height: 64, borderRadius: '50%', background: voiceStatus === 'recording' ? '#C4826A' : 'white', border: '1.5px solid', borderColor: voiceStatus === 'recording' ? '#C4826A' : 'rgba(196,130,106,0.3)', cursor: 'pointer', fontSize: 26, boxShadow: voiceStatus === 'recording' ? '0 0 0 8px rgba(196,130,106,0.15)' : '0 2px 10px rgba(40,32,15,0.08)' }}>
                {voiceStatus === 'recording' ? '⏹️' : voiceStatus === 'transcribing' ? '⏳' : '🎙️'}
              </button>
              <div style={{ fontSize: 13, color: '#C8B898' }}>
                {voiceStatus === 'recording' ? '녹음 중... 다시 누르면 완료' : voiceStatus === 'transcribing' ? '글로 옮기는 중이에요...' : interimText || '버튼을 눌러 말씀하세요'}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 주제 모달 */}
      {showTopicModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(40,32,15,0.45)', backdropFilter: 'blur(6px)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={() => setShowTopicModal(false)}>
          <div style={{ background: '#FDFAF4', borderRadius: '26px 26px 0 0', width: '100%', maxWidth: 480, padding: '26px 22px 48px' }} onClick={e => e.stopPropagation()}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: '#C8B898', margin: '0 auto 22px' }} />
            <div style={{ fontSize: 18, fontWeight: 700, color: '#28200F', marginBottom: 6 }}>이야기 주제 변경</div>
            <div style={{ fontSize: 14, color: '#9A8870', marginBottom: 20 }}>원하는 주제를 선택해주세요</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
              {TOPICS.map(t => {
                const selected = localTopics.includes(t.key)
                return (
                  <div key={t.key}
                    onClick={() => setLocalTopics(prev => selected ? prev.filter(x => x !== t.key) : [...prev, t.key])}
                    style={{ background: 'white', border: `2px solid ${selected ? '#C4826A' : 'rgba(200,168,96,0.2)'}`, borderRadius: 16, padding: '14px 10px', textAlign: 'center', cursor: 'pointer', position: 'relative', boxShadow: selected ? '0 4px 16px rgba(196,130,106,0.2)' : 'none' }}
                  >
                    {selected && <div style={{ position: 'absolute', top: 8, right: 10, fontSize: 11, color: '#C4826A', fontWeight: 700 }}>✓</div>}
                    <div style={{ fontSize: 26, marginBottom: 6 }}>{t.icon}</div>
                    <div style={{ fontSize: 13, color: '#5A4A30' }}>{t.key}</div>
                  </div>
                )
              })}
            </div>
            <button onClick={saveTopics} style={{ width: '100%', padding: 14, background: '#C4826A', color: 'white', border: 'none', borderRadius: 14, fontSize: 16, fontFamily: "'Gowun Batang',serif", cursor: 'pointer' }}>
              저장하고 닫기
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes bounce { 0%,60%,100%{transform:scale(1);opacity:0.45} 30%{transform:scale(1.4);opacity:1} }
        @keyframes fadeIn { from{opacity:0;transform:scale(0.96)} to{opacity:1;transform:scale(1)} }
      `}</style>
    </div>
  )
}