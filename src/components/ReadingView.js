'use client'
import { useState, useEffect, useRef } from 'react'
import AIAssistant from './AIAssistant'
import IconGlyph from '@/components/IconGlyph'

const font = "'Plus Jakarta Sans','DM Sans',system-ui,sans-serif"

// Simple markdown-like bold rendering: **text** → <strong>
function RichText({ text, style }) {
  if (!text) return null
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/)
  return (
    <p style={style}>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**'))
          return <strong key={i} style={{ color: '#f5f5f7', fontWeight: 700 }}>{part.slice(2, -2)}</strong>
        if (part.startsWith('`') && part.endsWith('`'))
          return <code key={i} style={{ background: 'rgba(255,255,255,0.08)', padding: '2px 6px', borderRadius: 5, fontSize: 13, color: '#34D399', fontFamily: 'monospace' }}>{part.slice(1, -1)}</code>
        return <span key={i}>{part}</span>
      })}
    </p>
  )
}

export default function ReadingView({ task, goal, knowledge, onClose, onComplete }) {
  const [loading, setLoading] = useState(true)
  const [article, setArticle] = useState(null)
  const [readSections, setReadSections] = useState(new Set())
  const [showGlossary, setShowGlossary] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [scrollPct, setScrollPct] = useState(0)
  const contentRef = useRef(null)

  useEffect(() => {
    async function load() {
      const cacheKey = `pathai.reading.v1::${task.id || task.title}`
      try {
        const cached = localStorage.getItem(cacheKey)
        if (cached) {
          const data = JSON.parse(cached)
          if (data.title) { setArticle(data); setLoading(false); return }
        }
      } catch {}
      try {
        const res = await fetch('/api/reading', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ concept: task._concept || task.title, taskTitle: task.title, goal, knowledge }),
        })
        const data = await res.json()
        if (data.title) {
          setArticle(data)
          try { localStorage.setItem(cacheKey, JSON.stringify(data)) } catch {}
        }
      } catch {}
      setLoading(false)
    }
    load()
  }, [task.id, task.title, goal, knowledge, task._concept])

  // Track scroll progress
  useEffect(() => {
    const el = contentRef.current
    if (!el) return
    const onScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = el
      const pct = scrollHeight > clientHeight ? scrollTop / (scrollHeight - clientHeight) : 1
      setScrollPct(Math.min(1, pct))
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [article])

  const totalSections = article?.sections?.length || 0
  const sectionPct = totalSections > 0 ? (readSections.size / totalSections) * 100 : 0
  const combinedPct = Math.round((sectionPct * 0.6) + (scrollPct * 100 * 0.4))
  const allRead = readSections.size === totalSections && totalSections > 0

  const handleComplete = () => {
    setCompleting(true)
    onComplete()
  }

  return (
    <>
      <style>{`
        @keyframes fadeIn   { from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)} }
        @keyframes spin     { to{transform:rotate(360deg)} }
        @keyframes slideUp  { from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)} }
        @keyframes markRead { 0%{transform:scale(0.7)}60%{transform:scale(1.15)}100%{transform:scale(1)} }
      `}</style>

      <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: '#06060f', fontFamily: font, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Top bar */}
        <div style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(6,6,15,0.90)', backdropFilter: 'blur(28px)' }}>
          <button onClick={onClose} style={{ width: 36, height: 36, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#8e8e93' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {article && (
              <>
                <div style={{ height: 5, width: 100, background: 'rgba(255,255,255,0.08)', borderRadius: 9999, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${combinedPct}%`, background: 'linear-gradient(90deg,#34D399,#0ef5c2)', borderRadius: 9999, transition: 'width 0.4s' }}/>
                </div>
                <span style={{ fontSize: 11, color: '#34D399', fontWeight: 700 }}>{combinedPct}%</span>
              </>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {article?.keyTerms?.length > 0 && (
              <button onClick={() => setShowGlossary(g => !g)} style={{ padding: '5px 12px', background: showGlossary ? 'rgba(52,211,153,0.15)' : 'rgba(255,255,255,0.07)', border: `1px solid ${showGlossary ? 'rgba(52,211,153,0.35)' : 'rgba(255,255,255,0.10)'}`, borderRadius: 8, fontSize: 11, fontWeight: 600, color: showGlossary ? '#34D399' : '#8e8e93', cursor: 'pointer', fontFamily: font }}>
                Glossary ({article.keyTerms.length})
              </button>
            )}
            <div style={{ padding: '4px 12px', background: 'rgba(52,211,153,0.10)', border: '1px solid rgba(52,211,153,0.25)', borderRadius: 9999, fontSize: 11, fontWeight: 700, color: '#34D399', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Reading
            </div>
          </div>
        </div>

        {/* Content */}
        <div ref={contentRef} style={{ flex: 1, overflowY: 'auto', padding: '24px 20px 140px' }}>
          <div style={{ maxWidth: 680, margin: '0 auto' }}>
            {loading ? (
              <div style={{ textAlign: 'center', paddingTop: 80 }}>
                <div style={{ width: 44, height: 44, border: '3px solid rgba(255,255,255,0.06)', borderTopColor: '#34D399', borderRadius: '50%', animation: 'spin 0.65s linear infinite', margin: '0 auto 20px' }}/>
                <p style={{ color: '#636366', fontSize: 14 }}>Generating your article…</p>
                <p style={{ color: '#475569', fontSize: 12, marginTop: 8 }}>Crafting something worth reading</p>
              </div>
            ) : !article ? (
              <div style={{ textAlign: 'center', paddingTop: 80 }}>
                <p style={{ color: '#636366', fontSize: 14, marginBottom: 16 }}>Could not load article.</p>
                <button onClick={onClose} style={{ padding: '10px 24px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, color: '#8e8e93', fontSize: 14, cursor: 'pointer', fontFamily: font }}>Go Back</button>
              </div>
            ) : (
              <>
                {/* Glossary panel */}
                {showGlossary && article.keyTerms?.length > 0 && (
                  <div style={{ marginBottom: 28, padding: '18px 20px', background: 'rgba(52,211,153,0.04)', border: '1px solid rgba(52,211,153,0.15)', borderRadius: 18, animation: 'fadeIn 0.2s ease both' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#34D399', textTransform: 'uppercase', letterSpacing: '1px' }}>Key Terms</div>
                      <button onClick={() => setShowGlossary(false)} style={{ background: 'none', border: 'none', color: '#636366', cursor: 'pointer', fontSize: 14 }}>×</button>
                    </div>
                    <div style={{ display: 'grid', gap: 12 }}>
                      {article.keyTerms.map((t, i) => (
                        <div key={i} style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)' }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: '#34D399', marginBottom: 4 }}>{t.term}</div>
                          <div style={{ fontSize: 13, color: '#8e8e93', lineHeight: 1.6 }}>{t.definition}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Meta */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, animation: 'fadeIn 0.3s ease both' }}>
                  <span style={{ padding: '4px 10px', background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.18)', borderRadius: 9999, fontSize: 11, fontWeight: 700, color: '#34D399' }}>
                    {article.estimatedMinutes} min read
                  </span>
                  <span style={{ fontSize: 12, color: '#636366' }}>{totalSections} sections</span>
                  <span style={{ fontSize: 12, color: '#636366' }}>·</span>
                  <span style={{ fontSize: 12, color: readSections.size === totalSections ? '#34D399' : '#636366', fontWeight: readSections.size === totalSections ? 700 : 400 }}>
                    {readSections.size}/{totalSections} read
                  </span>
                </div>

                <h1 style={{ fontSize: 28, fontWeight: 900, color: '#f5f5f7', letterSpacing: '-0.6px', lineHeight: 1.2, marginBottom: 32, animation: 'fadeIn 0.3s ease 0.05s both' }}>{article.title}</h1>

                {article.sections?.map((section, i) => {
                  const isRead = readSections.has(i)
                  return (
                    <div key={i} style={{ marginBottom: 32, animation: `fadeIn 0.3s ease ${0.1 + i * 0.06}s both` }}>
                      {/* Section header with read toggle */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
                        <button
                          onClick={() => setReadSections(s => { const n = new Set(s); n.has(i) ? n.delete(i) : n.add(i); return n })}
                          style={{ width: 26, height: 26, borderRadius: 8, background: isRead ? 'rgba(52,211,153,0.15)' : 'rgba(255,255,255,0.05)', border: `1.5px solid ${isRead ? '#34D399' : 'rgba(255,255,255,0.12)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'pointer', marginTop: 2, transition: 'all 0.2s', animation: isRead ? 'markRead 0.25s ease' : 'none' }}
                        >
                          {isRead && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#34D399" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                        </button>
                        <h2 style={{ fontSize: 19, fontWeight: 800, color: '#f5f5f7', margin: 0, lineHeight: 1.3, letterSpacing: '-0.3px' }}>{section.heading}</h2>
                      </div>

                      {/* Section body with rich text */}
                      <div style={{ paddingLeft: 38 }}>
                        {section.body?.split('\n\n').map((para, pi) => (
                          <RichText key={pi} text={para} style={{ fontSize: 15, color: '#9ca3af', lineHeight: 1.8, marginBottom: 16, letterSpacing: '0.1px' }} />
                        ))}
                      </div>

                      {/* Section divider */}
                      {i < totalSections - 1 && (
                        <div style={{ marginTop: 8, paddingLeft: 38 }}>
                          <div style={{ height: 1, background: 'rgba(255,255,255,0.06)' }} />
                        </div>
                      )}
                    </div>
                  )
                })}

                {/* End of article marker */}
                {article.sections && (
                  <div style={{ textAlign: 'center', padding: '24px 0 16px', animation: 'fadeIn 0.3s ease 0.5s both' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
                      <IconGlyph name={allRead ? 'badge' : 'book'} size={24} strokeWidth={2.2} color={allRead ? '#34D399' : '#8e8e93'} />
                    </div>
                    <p style={{ fontSize: 13, color: allRead ? '#34D399' : '#636366', fontWeight: 600 }}>
                      {allRead ? 'All sections read — great job!' : `Mark all sections as read to complete`}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Bottom nav */}
        <div style={{ padding: '14px 20px 30px', borderTop: '1px solid rgba(255,255,255,0.08)', background: 'rgba(6,6,15,0.92)', backdropFilter: 'blur(28px)' }}>
          <div style={{ maxWidth: 680, margin: '0 auto', display: 'flex', gap: 12 }}>
            <button onClick={onClose} style={{ padding: '14px 24px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 16, color: '#8e8e93', fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: font }}>Back</button>
            <button
              onClick={handleComplete}
              disabled={completing}
              style={{
                flex: 1, padding: '14px',
                background: completing ? 'rgba(52,211,153,0.08)' : allRead ? 'linear-gradient(135deg,#34D399,#0ef5c2)' : 'rgba(52,211,153,0.08)',
                border: allRead && !completing ? 'none' : '1px solid rgba(52,211,153,0.22)',
                borderRadius: 16,
                color: completing ? '#34D399' : allRead ? '#06060f' : '#34D399',
                fontSize: 16, fontWeight: 700,
                cursor: completing ? 'default' : 'pointer', fontFamily: font,
                boxShadow: allRead && !completing ? '0 0 24px rgba(52,211,153,0.25)' : 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                transition: 'all 0.2s',
              }}
            >
              {completing ? (
                <><div style={{ width: 14, height: 14, border: '2px solid rgba(52,211,153,0.2)', borderTopColor: '#34D399', borderRadius: '50%', animation: 'spin 0.65s linear infinite' }}/>Saving…</>
              ) : allRead ? 'Mark as Read' : `Mark as Read (${readSections.size}/${totalSections})`}
            </button>
          </div>
        </div>
      </div>

      <AIAssistant concept={task._concept || task.title} goal={goal} context={`Reading: ${article?.title || task.title}`} />
    </>
  )
}
