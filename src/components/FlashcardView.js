'use client'
import { useState, useEffect } from 'react'
import AIAssistant from './AIAssistant'
import IconGlyph from '@/components/IconGlyph'

const font = "'Plus Jakarta Sans','DM Sans',system-ui,sans-serif"

export default function FlashcardView({ task, goal, knowledge, onClose, onComplete }) {
  const [loading, setLoading] = useState(true)
  const [cards, setCards] = useState([])
  const [current, setCurrent] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [known, setKnown] = useState(new Set())
  const [showHint, setShowHint] = useState(false)
  const [done, setDone] = useState(false)
  const [completing, setCompleting] = useState(false)

  useEffect(() => {
    async function load() {
      const cacheKey = `pathai.flashcard.v1::${task.id || task.title}`
      try {
        const cached = localStorage.getItem(cacheKey)
        if (cached) {
          const data = JSON.parse(cached)
          if (data.cards) { setCards(data.cards); setLoading(false); return }
        }
      } catch {}
      try {
        const res = await fetch('/api/flashcards', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ concept: task._concept || task.title, taskTitle: task.title, goal, knowledge }),
        })
        const data = await res.json()
        if (data.cards) {
          setCards(data.cards)
          try { localStorage.setItem(cacheKey, JSON.stringify(data)) } catch {}
        }
      } catch {}
      setLoading(false)
    }
    load()
  }, [task.id, task.title, goal, knowledge, task._concept])

  function goNext(markKnown) {
    if (markKnown) setKnown(k => new Set([...k, current]))
    setFlipped(false)
    setShowHint(false)
    if (current + 1 >= cards.length) {
      setDone(true)
    } else {
      setCurrent(c => c + 1)
    }
  }

  const handleComplete = () => {
    setCompleting(true)
    onComplete()
  }

  const card = cards[current]
  const pct = cards.length > 0 ? ((current) / cards.length) * 100 : 0
  const knownPct = cards.length > 0 ? (known.size / cards.length) * 100 : 0

  return (
    <>
      <style>{`
        @keyframes spin   { to{transform:rotate(360deg)} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)} }
        @keyframes flipIn { from{transform:rotateY(90deg);opacity:0}to{transform:rotateY(0);opacity:1} }
        @keyframes popIn  { 0%{transform:scale(0.85);opacity:0}70%{transform:scale(1.05)}100%{transform:scale(1);opacity:1} }
        @keyframes shimmer { 0%{background-position:-200% 0}100%{background-position:200% 0} }
      `}</style>

      <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: '#06060f', fontFamily: font, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Top bar */}
        <div style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(6,6,15,0.90)', backdropFilter: 'blur(28px)' }}>
          <button onClick={onClose} style={{ width: 36, height: 36, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#8e8e93' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>

          {!loading && cards.length > 0 && !done && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {/* Mini card indicators */}
              {cards.map((_, i) => (
                <div key={i} style={{
                  width: i === current ? 16 : 6, height: 6, borderRadius: 9999,
                  background: known.has(i) ? '#34D399' : i < current ? '#636366' : i === current ? '#A78BFA' : 'rgba(255,255,255,0.08)',
                  transition: 'all 0.3s',
                }}/>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {!loading && cards.length > 0 && !done && (
              <span style={{ fontSize: 12, fontWeight: 700, color: '#A78BFA' }}>{current + 1}/{cards.length}</span>
            )}
            <div style={{ padding: '4px 12px', background: 'rgba(167,139,250,0.10)', border: '1px solid rgba(167,139,250,0.25)', borderRadius: 9999, fontSize: 11, fontWeight: 700, color: '#A78BFA', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Flashcards
            </div>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px 20px 120px', flexDirection: 'column', gap: 20 }}>
          {loading ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 44, height: 44, border: '3px solid rgba(255,255,255,0.06)', borderTopColor: '#A78BFA', borderRadius: '50%', animation: 'spin 0.65s linear infinite', margin: '0 auto 20px' }}/>
              <p style={{ color: '#636366', fontSize: 14 }}>Generating flashcards…</p>
              <p style={{ color: '#475569', fontSize: 12, marginTop: 8 }}>Creating cards designed for retention</p>
            </div>
          ) : !cards.length ? (
            <div style={{ textAlign: 'center' }}>
              <p style={{ color: '#636366', marginBottom: 16 }}>Could not load flashcards.</p>
              <button onClick={onClose} style={{ padding: '10px 24px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, color: '#8e8e93', fontSize: 14, cursor: 'pointer', fontFamily: font }}>Go Back</button>
            </div>
          ) : done ? (
            <div style={{ textAlign: 'center', animation: 'popIn 0.45s cubic-bezier(0.34,1.56,0.64,1) both', maxWidth: 400 }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
                <div style={{ width: 68, height: 68, borderRadius: 22, background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.18)', display: 'grid', placeItems: 'center' }}>
                  <IconGlyph name={known.size >= cards.length * 0.8 ? 'badge' : known.size >= cards.length * 0.5 ? 'sparkles' : 'book'} size={30} strokeWidth={2.2} color="#A78BFA" />
                </div>
              </div>
              <h2 style={{ fontSize: 26, fontWeight: 900, color: '#f5f5f7', marginBottom: 8 }}>Deck complete!</h2>
              <p style={{ fontSize: 15, color: '#8e8e93', marginBottom: 6 }}>
                You marked <strong style={{ color: '#34D399' }}>{known.size}/{cards.length}</strong> as known.
              </p>
              {known.size < cards.length && (
                <p style={{ fontSize: 13, color: '#636366', marginBottom: 8 }}>
                  {cards.length - known.size} card{cards.length - known.size !== 1 ? 's' : ''} to review again.
                </p>
              )}
              {/* Mastery bar */}
              <div style={{ margin: '20px 0', padding: '14px 18px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 12, color: '#636366', fontWeight: 600 }}>Mastery</span>
                  <span style={{ fontSize: 12, color: '#A78BFA', fontWeight: 700 }}>{Math.round(knownPct)}%</span>
                </div>
                <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 9999, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${knownPct}%`, background: 'linear-gradient(90deg,#A78BFA,#818CF8)', borderRadius: 9999, transition: 'width 0.5s' }}/>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Card */}
              <div
                key={`${current}-${flipped}`}
                onClick={() => { setFlipped(f => !f); setShowHint(false) }}
                style={{
                  width: '100%', maxWidth: 500, minHeight: 240,
                  background: flipped ? 'rgba(167,139,250,0.06)' : 'rgba(255,255,255,0.04)',
                  border: `1.5px solid ${flipped ? 'rgba(167,139,250,0.30)' : 'rgba(255,255,255,0.10)'}`,
                  borderRadius: 24, padding: '36px 28px',
                  cursor: 'pointer', userSelect: 'none',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center',
                  animation: 'flipIn 0.22s ease both',
                  transition: 'border 0.2s, background 0.2s',
                  boxShadow: flipped ? '0 0 40px rgba(167,139,250,0.08)' : 'none',
                }}
              >
                <div style={{ fontSize: 10, fontWeight: 800, color: flipped ? '#A78BFA' : '#636366', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 20 }}>
                  {flipped ? 'Answer' : 'Question'}
                </div>
                <p style={{ fontSize: 20, fontWeight: flipped ? 600 : 700, color: '#f5f5f7', lineHeight: 1.5, margin: 0, maxWidth: 420 }}>
                  {flipped ? card.back : card.front}
                </p>
                {!flipped && (
                  <p style={{ fontSize: 12, color: '#475569', marginTop: 24, margin: '24px 0 0' }}>Tap to reveal answer</p>
                )}
              </div>

              {/* Hint */}
              {!flipped && card.hint && (
                <button onClick={(e) => { e.stopPropagation(); setShowHint(h => !h) }} style={{ background: showHint ? 'rgba(167,139,250,0.08)' : 'none', border: showHint ? '1px solid rgba(167,139,250,0.18)' : 'none', borderRadius: 12, cursor: 'pointer', fontSize: 13, color: showHint ? '#A78BFA' : '#636366', fontFamily: font, padding: showHint ? '8px 16px' : '4px 8px', transition: 'all 0.2s', maxWidth: 400, textAlign: 'center', lineHeight: 1.5 }}>
                  {showHint ? card.hint : 'Show hint'}
                </button>
              )}

              {/* Keyboard hint */}
              {flipped && (
                <p style={{ fontSize: 11, color: '#475569', marginTop: 4 }}>
                  Tap the card to flip back, or choose below
                </p>
              )}
            </>
          )}
        </div>

        {/* Bottom nav */}
        <div style={{ padding: '14px 20px 30px', borderTop: '1px solid rgba(255,255,255,0.08)', background: 'rgba(6,6,15,0.92)', backdropFilter: 'blur(28px)' }}>
          <div style={{ maxWidth: 500, margin: '0 auto' }}>
            {done ? (
              <div style={{ display: 'flex', gap: 12 }}>
                <button onClick={() => { setCurrent(0); setFlipped(false); setKnown(new Set()); setDone(false) }} style={{ flex: 1, padding: '14px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 16, color: '#8e8e93', fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: font }}>Restart</button>
                <button onClick={handleComplete} disabled={completing} style={{
                  flex: 1, padding: '14px',
                  background: completing ? 'rgba(167,139,250,0.08)' : 'linear-gradient(135deg,#A78BFA,#818CF8)',
                  border: completing ? '1px solid rgba(167,139,250,0.22)' : 'none',
                  borderRadius: 16, color: completing ? '#A78BFA' : '#fff',
                  fontSize: 16, fontWeight: 700, cursor: completing ? 'default' : 'pointer', fontFamily: font,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}>
                  {completing ? (
                    <><div style={{width:14,height:14,border:'2px solid rgba(167,139,250,0.2)',borderTopColor:'#A78BFA',borderRadius:'50%',animation:'spin 0.65s linear infinite'}}/>Saving…</>
                  ) : 'Complete'}
                </button>
              </div>
            ) : !loading && cards.length > 0 ? (
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => goNext(false)} style={{
                  flex: 1, padding: '14px',
                  background: 'rgba(255,69,58,0.06)',
                  border: '1px solid rgba(255,69,58,0.18)',
                  borderRadius: 16, color: '#FF453A', fontSize: 14, fontWeight: 700,
                  cursor: 'pointer', fontFamily: font,
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e=>{e.currentTarget.style.background='rgba(255,69,58,0.12)'}}
                onMouseLeave={e=>{e.currentTarget.style.background='rgba(255,69,58,0.06)'}}>
                  Still learning
                </button>
                <button onClick={() => goNext(true)} style={{
                  flex: 1, padding: '14px',
                  background: 'rgba(52,211,153,0.06)',
                  border: '1px solid rgba(52,211,153,0.18)',
                  borderRadius: 16, color: '#34D399', fontSize: 14, fontWeight: 700,
                  cursor: 'pointer', fontFamily: font,
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e=>{e.currentTarget.style.background='rgba(52,211,153,0.12)'}}
                onMouseLeave={e=>{e.currentTarget.style.background='rgba(52,211,153,0.06)'}}>
                  Mark known
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <AIAssistant concept={task._concept || task.title} goal={goal} context={`Flashcard ${current + 1}/${cards.length}: ${card?.front || ''}`} />
    </>
  )
}
