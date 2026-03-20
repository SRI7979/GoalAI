'use client'
import { useState, useRef, useEffect } from 'react'

const font = "'Plus Jakarta Sans','DM Sans',system-ui,sans-serif"

export default function AIAssistant({ concept, goal, context }) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    if (open && bottomRef.current) bottomRef.current.scrollIntoView({ behavior: 'smooth' })
  }, [messages, open])

  async function handleSend() {
    const q = input.trim()
    if (!q || loading) return
    setInput('')
    setMessages(m => [...m, { role: 'user', text: q }])
    setLoading(true)
    try {
      const res = await fetch('/api/lesson-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q, concept, goal, slide: { title: context || concept, content: '' } }),
      })
      const data = await res.json()
      setMessages(m => [...m, { role: 'assistant', text: data.answer || 'Sorry, I had trouble with that.', tips: data.tips }])
    } catch {
      setMessages(m => [...m, { role: 'assistant', text: 'Something went wrong. Try again.' }])
    }
    setLoading(false)
  }

  return (
    <>
      <style>{`
        @keyframes assistantSlideUp { from{opacity:0;transform:translateY(16px) scale(0.95)}to{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes bubblePulse { 0%,100%{box-shadow:0 0 0 0 rgba(14,245,194,0.30)} 50%{box-shadow:0 0 0 8px rgba(14,245,194,0.00)} }
      `}</style>

      {/* Chat panel */}
      {open && (
        <div style={{
          position: 'fixed', bottom: 88, right: 20, zIndex: 9500,
          width: 320, maxHeight: 440, display: 'flex', flexDirection: 'column',
          background: 'rgba(10,10,22,0.96)', backdropFilter: 'blur(28px)',
          border: '1px solid rgba(14,245,194,0.20)', borderRadius: 20,
          boxShadow: '0 24px 64px rgba(0,0,0,0.60)',
          animation: 'assistantSlideUp 0.25s cubic-bezier(0.34,1.56,0.64,1)',
          fontFamily: font,
        }}>
          {/* Header */}
          <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#0ef5c2,#00d4ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 900, color: '#06060f' }}>✦</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#f5f5f7' }}>AI Tutor</div>
                <div style={{ fontSize: 11, color: '#636366' }}>Ask anything about {concept}</div>
              </div>
            </div>
            <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#636366', padding: 4 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {messages.length === 0 && (
              <div style={{ textAlign: 'center', paddingTop: 20 }}>
                <p style={{ fontSize: 12, color: '#636366', lineHeight: 1.6 }}>Hi! I'm here to help with <strong style={{ color: '#8e8e93' }}>{concept}</strong>. What would you like to know?</p>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '85%', padding: '8px 12px', borderRadius: m.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                  background: m.role === 'user' ? 'rgba(14,245,194,0.12)' : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${m.role === 'user' ? 'rgba(14,245,194,0.22)' : 'rgba(255,255,255,0.08)'}`,
                  fontSize: 13, color: '#e5e7eb', lineHeight: 1.55,
                }}>
                  {m.text}
                </div>
                {m.tips?.length > 0 && (
                  <div style={{ marginTop: 6, maxWidth: '85%' }}>
                    {m.tips.map((tip, ti) => (
                      <div key={ti} style={{ fontSize: 11, color: '#636366', padding: '3px 0', paddingLeft: 4, borderLeft: '2px solid rgba(14,245,194,0.25)', marginBottom: 3 }}>{tip}</div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                <div style={{ padding: '8px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px 14px 14px 4px', display: 'flex', gap: 5, alignItems: 'center' }}>
                  {[0,1,2].map(d => (
                    <div key={d} style={{ width: 5, height: 5, borderRadius: '50%', background: '#636366', animation: `assistantSlideUp 0.8s ease ${d * 0.15}s infinite alternate` }}/>
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef}/>
          </div>

          {/* Input */}
          <div style={{ padding: '10px 12px', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', gap: 8 }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder="Ask a question…"
              style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 10, padding: '8px 12px', fontSize: 13, color: '#f5f5f7', fontFamily: font, outline: 'none' }}
            />
            <button onClick={handleSend} disabled={!input.trim() || loading}
              style={{ width: 34, height: 34, borderRadius: 10, background: input.trim() ? 'linear-gradient(135deg,#0ef5c2,#00d4ff)' : 'rgba(255,255,255,0.05)', border: 'none', cursor: input.trim() ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', color: input.trim() ? '#06060f' : '#636366', flexShrink: 0 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
            </button>
          </div>
        </div>
      )}

      {/* Floating bubble */}
      <button onClick={() => setOpen(o => !o)} style={{
        position: 'fixed', bottom: 24, right: 20, zIndex: 9500,
        width: 52, height: 52, borderRadius: '50%',
        background: open ? 'rgba(14,245,194,0.15)' : 'linear-gradient(135deg,#0ef5c2,#00d4ff)',
        border: open ? '1.5px solid rgba(14,245,194,0.40)' : 'none',
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: open ? 'none' : '0 8px 24px rgba(14,245,194,0.35)',
        animation: open ? 'none' : 'bubblePulse 2.5s ease infinite',
        transition: 'all 0.2s',
        fontFamily: font,
      }}>
        {open
          ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(14,245,194,0.80)" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          : <span style={{ fontSize: 20, color: '#06060f', fontWeight: 900 }}>✦</span>
        }
      </button>
    </>
  )
}
