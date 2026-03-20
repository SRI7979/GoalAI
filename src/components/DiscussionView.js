'use client'
import { useState, useEffect } from 'react'
import AIAssistant from './AIAssistant'

const font = "'Plus Jakarta Sans','DM Sans',system-ui,sans-serif"

export default function DiscussionView({ task, goal, knowledge, onClose, onComplete }) {
  const [loading, setLoading] = useState(true)
  const [prompts, setPrompts] = useState([])
  const [answers, setAnswers] = useState({})
  const [expanded, setExpanded] = useState(0)
  const [completing, setCompleting] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/discussion', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ concept: task._concept || task.title, taskTitle: task.title, goal, knowledge }),
        })
        const data = await res.json()
        if (data.prompts) setPrompts(data.prompts)
      } catch {}
      setLoading(false)
    }
    load()
  }, [task.title, goal, knowledge, task._concept])

  const answeredCount = Object.values(answers).filter(a => a?.trim().length > 10).length

  return (
    <>
      <style>{`
        @keyframes spin   { to{transform:rotate(360deg)} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)} }
        textarea { resize: none; }
        textarea:focus { outline: none; border-color: rgba(96,165,250,0.40) !important; box-shadow: 0 0 0 3px rgba(96,165,250,0.08); }
      `}</style>

      <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: '#06060f', fontFamily: font, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Top bar */}
        <div style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(6,6,15,0.90)', backdropFilter: 'blur(28px)' }}>
          <button onClick={onClose} style={{ width: 36, height: 36, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#8e8e93' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>

          {!loading && prompts.length > 0 && (
            <div style={{ display: 'flex', gap: 6 }}>
              {prompts.map((_, i) => (
                <div key={i} style={{ width: 28, height: 5, borderRadius: 9999, background: answers[i]?.trim().length > 10 ? '#60A5FA' : 'rgba(255,255,255,0.08)', transition: 'background 0.3s' }}/>
              ))}
            </div>
          )}

          <div style={{ padding: '4px 12px', background: 'rgba(96,165,250,0.10)', border: '1px solid rgba(96,165,250,0.25)', borderRadius: 9999, fontSize: 11, fontWeight: 700, color: '#60A5FA', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Discussion
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 20px 140px' }}>
          <div style={{ maxWidth: 640, margin: '0 auto' }}>
            {loading ? (
              <div style={{ textAlign: 'center', paddingTop: 80 }}>
                <div style={{ width: 44, height: 44, border: '3px solid rgba(255,255,255,0.06)', borderTopColor: '#60A5FA', borderRadius: '50%', animation: 'spin 0.65s linear infinite', margin: '0 auto 20px' }}/>
                <p style={{ color: '#636366', fontSize: 14 }}>Generating discussion prompts…</p>
                <p style={{ color: '#475569', fontSize: 12, marginTop: 8 }}>Creating questions that spark real thinking</p>
              </div>
            ) : !prompts.length ? (
              <p style={{ color: '#636366', textAlign: 'center', paddingTop: 80 }}>Could not load prompts.</p>
            ) : (
              <>
                <p style={{ fontSize: 13, color: '#636366', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 8 }}>Reflection</p>
                <h1 style={{ fontSize: 22, fontWeight: 900, color: '#f5f5f7', letterSpacing: '-0.4px', marginBottom: 28 }}>{task._concept || task.title}</h1>
                <p style={{ fontSize: 14, color: '#8e8e93', marginBottom: 28, lineHeight: 1.6 }}>These questions don't have right or wrong answers — they're designed to deepen your thinking. Write at least a few sentences for each.</p>

                {prompts.map((p, i) => (
                  <div key={i} style={{ marginBottom: 20, border: `1.5px solid ${expanded === i ? 'rgba(96,165,250,0.28)' : 'rgba(255,255,255,0.08)'}`, borderRadius: 18, overflow: 'hidden', transition: 'border 0.2s', animation: `fadeIn 0.3s ease ${i * 0.08}s both` }}>
                    <button
                      onClick={() => setExpanded(expanded === i ? -1 : i)}
                      style={{ width: '100%', padding: '16px 18px', background: expanded === i ? 'rgba(96,165,250,0.05)' : 'rgba(255,255,255,0.02)', border: 'none', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'flex-start', gap: 14, fontFamily: font }}
                    >
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: answers[i]?.trim().length > 10 ? 'rgba(96,165,250,0.15)' : 'rgba(255,255,255,0.06)', border: `1.5px solid ${answers[i]?.trim().length > 10 ? '#60A5FA' : 'rgba(255,255,255,0.12)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 12, fontWeight: 700, color: answers[i]?.trim().length > 10 ? '#60A5FA' : '#636366', transition: 'all 0.2s' }}>
                        {answers[i]?.trim().length > 10 ? '✓' : i + 1}
                      </div>
                      <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#f5f5f7', lineHeight: 1.5 }}>{p.question}</p>
                    </button>

                    {expanded === i && (
                      <div style={{ padding: '0 18px 18px' }}>
                        {p.followUp && (
                          <p style={{ fontSize: 13, color: '#60A5FA', marginBottom: 14, paddingLeft: 42, lineHeight: 1.5 }}>
                            💬 Follow-up: {p.followUp}
                          </p>
                        )}
                        <textarea
                          value={answers[i] || ''}
                          onChange={e => setAnswers(a => ({ ...a, [i]: e.target.value }))}
                          placeholder="Write your thoughts here…"
                          rows={5}
                          style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 12, padding: '12px 14px', fontSize: 14, color: '#f5f5f7', fontFamily: font, lineHeight: 1.65, boxSizing: 'border-box', transition: 'border-color 0.15s', display: 'block' }}
                        />
                        {answers[i]?.trim().length > 0 && answers[i]?.trim().length < 10 && (
                          <p style={{ fontSize: 11, color: '#636366', marginTop: 6 }}>Write a bit more to mark this complete</p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        {/* Bottom nav */}
        <div style={{ padding: '14px 20px 30px', borderTop: '1px solid rgba(255,255,255,0.08)', background: 'rgba(6,6,15,0.92)', backdropFilter: 'blur(28px)' }}>
          <div style={{ maxWidth: 640, margin: '0 auto', display: 'flex', gap: 12 }}>
            <button onClick={onClose} style={{ padding: '14px 24px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 16, color: '#8e8e93', fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: font }}>Back</button>
            <button onClick={() => { setCompleting(true); onComplete() }} disabled={completing} style={{
              flex: 1, padding: '14px',
              background: completing ? 'rgba(96,165,250,0.06)' : answeredCount > 0 ? 'linear-gradient(135deg,#60A5FA,#818CF8)' : 'rgba(255,255,255,0.05)',
              border: completing ? '1px solid rgba(96,165,250,0.22)' : answeredCount > 0 ? 'none' : '1px solid rgba(255,255,255,0.08)',
              borderRadius: 16,
              color: completing ? '#60A5FA' : answeredCount > 0 ? '#fff' : '#636366',
              fontSize: 16, fontWeight: 700, cursor: completing ? 'default' : 'pointer', fontFamily: font,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: answeredCount > 0 && !completing ? '0 0 20px rgba(96,165,250,0.2)' : 'none',
            }}>
              {completing ? (
                <><div style={{width:14,height:14,border:'2px solid rgba(96,165,250,0.2)',borderTopColor:'#60A5FA',borderRadius:'50%',animation:'spin 0.65s linear infinite'}}/>Saving…</>
              ) : answeredCount === prompts.length && prompts.length > 0 ? 'Complete ✓' : answeredCount > 0 ? `Complete (${answeredCount}/${prompts.length} answered)` : 'Complete when ready'}
            </button>
          </div>
        </div>
      </div>

      <AIAssistant concept={task._concept || task.title} goal={goal} context={`Discussion: ${prompts[expanded]?.question || task.title}`} />
    </>
  )
}
