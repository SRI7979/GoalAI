'use client'
import { useState, useEffect, useCallback } from 'react'
import AIAssistant from './AIAssistant'

const font = "'Plus Jakarta Sans','DM Sans',system-ui,sans-serif"

const HINT_COLORS = [
  { bg: 'rgba(14,245,194,0.06)', border: 'rgba(14,245,194,0.20)', text: '#0ef5c2', label: 'Nudge' },
  { bg: 'rgba(0,212,255,0.06)', border: 'rgba(0,212,255,0.20)', text: '#00d4ff', label: 'Guide' },
  { bg: 'rgba(251,191,36,0.06)', border: 'rgba(251,191,36,0.20)', text: '#FBBF24', label: 'Solution' },
]

export default function GuidedPracticeView({ task, goal, knowledge, onClose, onComplete }) {
  const [loading, setLoading] = useState(true)
  const [practice, setPractice] = useState(null)
  const [hintsRevealed, setHintsRevealed] = useState(0)
  const [answer, setAnswer] = useState('')
  const [checkpointIdx, setCheckpointIdx] = useState(0)
  const [checkpointAnswer, setCheckpointAnswer] = useState('')
  const [checkpointResults, setCheckpointResults] = useState([])
  const [phase, setPhase] = useState('practice') // practice | checkpoint | solution | done
  const [startTime] = useState(Date.now())
  const [submitting, setSubmitting] = useState(false)
  const [showSolution, setShowSolution] = useState(false)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const cacheKey = `pathai.practice.v1::${task.id || task.title}`
      try {
        const cached = localStorage.getItem(cacheKey)
        if (cached) {
          const data = JSON.parse(cached)
          if (data.title) { setPractice(data); setLoading(false); return }
        }
      } catch {}
      try {
        const res = await fetch('/api/practice-ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'guided_practice',
            concept: task._concept || task.title,
            goal,
            difficulty: task._difficulty || 2,
            knowledge,
          }),
        })
        const data = await res.json()
        if (data.title) {
          setPractice(data)
          try { localStorage.setItem(cacheKey, JSON.stringify(data)) } catch {}
        }
      } catch {}
      setLoading(false)
    }
    load()
  }, [task, goal, knowledge])

  const revealHint = useCallback(() => {
    if (practice && hintsRevealed < (practice.hints?.length || 0)) {
      setHintsRevealed(h => h + 1)
    }
  }, [practice, hintsRevealed])

  const handleSubmitCheckpoint = () => {
    if (!checkpointAnswer.trim()) return
    const cp = practice.checkpoints[checkpointIdx]
    setCheckpointResults(prev => [...prev, {
      question: cp.question,
      answer: checkpointAnswer,
      expected: cp.answer,
    }])
    setCheckpointAnswer('')
    if (checkpointIdx + 1 < practice.checkpoints.length) {
      setCheckpointIdx(i => i + 1)
    } else {
      setPhase('solution')
    }
  }

  const handleComplete = () => {
    setSubmitting(true)
    const elapsed = Math.round((Date.now() - startTime) / 1000)
    onComplete({
      hintsUsed: hintsRevealed,
      maxHints: practice?.hints?.length || 3,
      completionTimeSec: elapsed,
      checkpointsPassed: checkpointResults.length,
    })
  }

  const hints = practice?.hints || []
  const checkpoints = practice?.checkpoints || []

  return (
    <>
      <style>{`
        @keyframes fadeIn { from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)} }
        @keyframes spin { to{transform:rotate(360deg)} }
        @keyframes slideUp { from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)} }
        @keyframes hintReveal { from{opacity:0;max-height:0;padding:0 18px}to{opacity:1;max-height:200px;padding:14px 18px} }
        @keyframes pulseGlow { 0%,100%{box-shadow:0 0 0 0 rgba(0,212,255,0.25)}50%{box-shadow:0 0 0 8px rgba(0,212,255,0)} }
      `}</style>

      <div style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'linear-gradient(180deg, #06060f 0%, #080814 100%)',
        fontFamily: font, display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>

        {/* Top bar */}
        <div style={{
          padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(6,6,15,0.88)',
          backdropFilter: 'blur(28px)', WebkitBackdropFilter: 'blur(28px)',
        }}>
          <button onClick={onClose} style={{
            width: 36, height: 36, background: 'rgba(255,255,255,0.07)',
            border: '1px solid rgba(255,255,255,0.10)', borderRadius: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: '#8e8e93',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18 }}>🔧</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#00d4ff' }}>Guided Practice</span>
          </div>

          {/* Hint counter */}
          <div style={{
            padding: '4px 12px', background: 'rgba(0,212,255,0.10)',
            border: '1px solid rgba(0,212,255,0.25)', borderRadius: 9999,
            fontSize: 11, fontWeight: 700, color: '#00d4ff',
          }}>
            💡 {hintsRevealed}/{hints.length}
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: '20px 20px 120px' }}>
          <div style={{ maxWidth: 640, margin: '0 auto' }}>

            {loading ? (
              <div style={{ textAlign: 'center', paddingTop: 80 }}>
                <div style={{
                  width: 44, height: 44, border: '3px solid rgba(255,255,255,0.06)',
                  borderTopColor: '#00d4ff', borderRadius: '50%',
                  animation: 'spin 0.65s linear infinite', margin: '0 auto 20px',
                }} />
                <p style={{ color: '#636366', fontSize: 14 }}>Building your practice exercise...</p>
                <p style={{ color: '#475569', fontSize: 12, marginTop: 8 }}>Crafting a scenario tailored to your level</p>
              </div>
            ) : !practice ? (
              <div style={{ textAlign: 'center', paddingTop: 80 }}>
                <p style={{ color: '#636366', marginBottom: 16 }}>Could not load practice exercise.</p>
                <button onClick={onClose} style={{
                  padding: '10px 24px', background: 'rgba(255,255,255,0.07)',
                  border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12,
                  color: '#8e8e93', fontSize: 14, cursor: 'pointer', fontFamily: font,
                }}>Go Back</button>
              </div>
            ) : (
              <div style={{ animation: 'fadeIn 0.3s ease both' }}>
                {/* Title */}
                <h1 style={{
                  fontSize: 24, fontWeight: 800, color: '#f5f5f7',
                  letterSpacing: '-0.5px', lineHeight: 1.3, marginBottom: 16,
                }}>{practice.title}</h1>

                {/* Scenario */}
                <div style={{
                  padding: '16px 20px', background: 'rgba(0,212,255,0.05)',
                  border: '1px solid rgba(0,212,255,0.18)', borderRadius: 16,
                  marginBottom: 20,
                }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#00d4ff', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 8 }}>
                    Scenario
                  </div>
                  <p style={{ color: '#c8d6e5', fontSize: 15, lineHeight: 1.65, margin: 0 }}>
                    {practice.scenario}
                  </p>
                </div>

                {/* Task */}
                <div style={{
                  padding: '16px 20px', background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.10)', borderRadius: 16,
                  marginBottom: 20,
                }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#f5f5f7', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 8 }}>
                    Your Task
                  </div>
                  <p style={{ color: '#f5f5f7', fontSize: 15, lineHeight: 1.65, margin: 0, fontWeight: 600 }}>
                    {practice.task}
                  </p>
                </div>

                {/* Starter code/template */}
                {practice.starter && (
                  <div style={{
                    margin: '0 0 20px', padding: '14px 18px',
                    background: '#0a0a14', border: '1px solid rgba(129,140,248,0.25)',
                    borderRadius: 14, fontFamily: "'JetBrains Mono',monospace",
                    fontSize: 13, color: '#CBD5E1', lineHeight: 1.7,
                    whiteSpace: 'pre-wrap', overflowX: 'auto',
                  }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#818CF8', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 10, fontFamily: font }}>
                      Starting Point
                    </div>
                    {practice.starter}
                  </div>
                )}

                {/* Hints */}
                <div style={{ marginBottom: 24 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#636366', textTransform: 'uppercase', letterSpacing: '1px' }}>
                      Hints
                    </span>
                    {hintsRevealed < hints.length && (
                      <button onClick={revealHint} style={{
                        padding: '6px 14px', background: 'rgba(0,212,255,0.08)',
                        border: '1px solid rgba(0,212,255,0.25)', borderRadius: 9999,
                        color: '#00d4ff', fontSize: 12, fontWeight: 700,
                        cursor: 'pointer', fontFamily: font,
                        animation: 'pulseGlow 2s ease infinite',
                      }}>
                        💡 Reveal Hint {hintsRevealed + 1}
                      </button>
                    )}
                  </div>

                  {hints.slice(0, hintsRevealed).map((hint, i) => {
                    const c = HINT_COLORS[i] || HINT_COLORS[2]
                    return (
                      <div key={i} style={{
                        padding: '14px 18px', background: c.bg,
                        border: `1px solid ${c.border}`, borderRadius: 14,
                        marginBottom: 8, animation: 'hintReveal 0.4s ease both',
                      }}>
                        <div style={{ fontSize: 10, fontWeight: 800, color: c.text, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 6 }}>
                          {c.label} — Hint {i + 1}
                        </div>
                        <p style={{ margin: 0, color: '#c8d6e5', fontSize: 14, lineHeight: 1.6 }}>
                          {hint.hint}
                        </p>
                      </div>
                    )
                  })}

                  {hintsRevealed === 0 && (
                    <p style={{ color: '#3a3a3c', fontSize: 12, fontStyle: 'italic' }}>
                      Try solving it first! Hints are here if you need them.
                    </p>
                  )}
                </div>

                {/* Answer area */}
                {phase === 'practice' && (
                  <div style={{ marginBottom: 24 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#636366', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 8 }}>
                      Your Answer
                    </div>
                    <textarea
                      value={answer}
                      onChange={e => setAnswer(e.target.value)}
                      placeholder="Type your solution here..."
                      style={{
                        width: '100%', minHeight: 140, padding: '14px 16px',
                        background: 'rgba(0,0,0,0.30)', border: '1px solid rgba(255,255,255,0.12)',
                        borderRadius: 14, color: '#f5f5f7', fontSize: 14,
                        fontFamily: "'JetBrains Mono',monospace", lineHeight: 1.6,
                        resize: 'vertical', outline: 'none',
                      }}
                    />
                    <button
                      onClick={() => setPhase('checkpoint')}
                      disabled={!answer.trim()}
                      style={{
                        marginTop: 12, padding: '12px 24px', width: '100%',
                        background: answer.trim() ? 'linear-gradient(135deg, #00d4ff, #0ef5c2)' : 'rgba(255,255,255,0.06)',
                        border: 'none', borderRadius: 14,
                        color: answer.trim() ? '#06060f' : '#636366',
                        fontSize: 15, fontWeight: 700, cursor: answer.trim() ? 'pointer' : 'default',
                        fontFamily: font,
                        boxShadow: answer.trim() ? '0 0 24px rgba(0,212,255,0.25)' : 'none',
                      }}
                    >
                      Submit & Check Understanding →
                    </button>
                  </div>
                )}

                {/* Checkpoint questions */}
                {phase === 'checkpoint' && checkpoints.length > 0 && (
                  <div style={{ animation: 'slideUp 0.3s ease both' }}>
                    <div style={{
                      padding: '16px 20px', background: 'rgba(129,140,248,0.06)',
                      border: '1px solid rgba(129,140,248,0.20)', borderRadius: 16,
                      marginBottom: 20,
                    }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#818CF8', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 8 }}>
                        Checkpoint {checkpointIdx + 1}/{checkpoints.length}
                      </div>
                      <p style={{ color: '#f5f5f7', fontSize: 16, fontWeight: 700, lineHeight: 1.5, margin: 0 }}>
                        {checkpoints[checkpointIdx]?.question}
                      </p>
                    </div>

                    <textarea
                      value={checkpointAnswer}
                      onChange={e => setCheckpointAnswer(e.target.value)}
                      placeholder="Explain your thinking..."
                      style={{
                        width: '100%', minHeight: 80, padding: '12px 16px',
                        background: 'rgba(0,0,0,0.30)', border: '1px solid rgba(255,255,255,0.12)',
                        borderRadius: 14, color: '#f5f5f7', fontSize: 14,
                        fontFamily: font, lineHeight: 1.6, resize: 'vertical', outline: 'none',
                        marginBottom: 12,
                      }}
                    />
                    <button
                      onClick={handleSubmitCheckpoint}
                      disabled={!checkpointAnswer.trim()}
                      style={{
                        padding: '12px 24px', width: '100%',
                        background: checkpointAnswer.trim() ? 'linear-gradient(135deg, #818CF8, #6366F1)' : 'rgba(255,255,255,0.06)',
                        border: 'none', borderRadius: 14,
                        color: checkpointAnswer.trim() ? '#fff' : '#636366',
                        fontSize: 15, fontWeight: 700, cursor: checkpointAnswer.trim() ? 'pointer' : 'default',
                        fontFamily: font,
                      }}
                    >
                      {checkpointIdx + 1 < checkpoints.length ? 'Next Checkpoint →' : 'See Solution →'}
                    </button>
                  </div>
                )}

                {/* Solution reveal */}
                {(phase === 'solution' || (phase === 'checkpoint' && checkpoints.length === 0)) && (
                  <div style={{ animation: 'slideUp 0.3s ease both' }}>
                    {!showSolution ? (
                      <button
                        onClick={() => setShowSolution(true)}
                        style={{
                          width: '100%', padding: '16px', marginBottom: 20,
                          background: 'rgba(14,245,194,0.06)', border: '1px solid rgba(14,245,194,0.20)',
                          borderRadius: 16, color: '#0ef5c2', fontSize: 15, fontWeight: 700,
                          cursor: 'pointer', fontFamily: font,
                        }}
                      >
                        Reveal Solution
                      </button>
                    ) : (
                      <>
                        <div style={{
                          padding: '18px 20px', background: 'rgba(14,245,194,0.05)',
                          border: '1px solid rgba(14,245,194,0.20)', borderRadius: 16, marginBottom: 16,
                        }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#0ef5c2', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 10 }}>
                            Solution
                          </div>
                          <pre style={{
                            color: '#c8f7eb', fontSize: 13, lineHeight: 1.7,
                            whiteSpace: 'pre-wrap', margin: 0,
                            fontFamily: "'JetBrains Mono',monospace",
                          }}>
                            {practice.solution}
                          </pre>
                        </div>

                        <div style={{
                          padding: '14px 18px', background: 'rgba(255,255,255,0.03)',
                          border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, marginBottom: 20,
                        }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#636366', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 6 }}>
                            Why It Works
                          </div>
                          <p style={{ color: '#8e8e93', fontSize: 14, lineHeight: 1.6, margin: 0 }}>
                            {practice.explanation}
                          </p>
                        </div>

                        {phase !== 'done' && setPhase('done') && null}
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Bottom nav */}
        <div style={{
          padding: '14px 20px 30px', borderTop: '1px solid rgba(255,255,255,0.08)',
          background: 'rgba(6,6,15,0.90)', backdropFilter: 'blur(28px)',
        }}>
          <div style={{ maxWidth: 640, margin: '0 auto', display: 'flex', gap: 12 }}>
            <button onClick={onClose} style={{
              padding: '14px 24px', background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.12)', borderRadius: 16,
              color: '#8e8e93', fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: font,
            }}>Back</button>

            {phase === 'done' && (
              <button
                onClick={handleComplete}
                disabled={submitting}
                style={{
                  flex: 1, padding: '14px',
                  background: submitting ? 'rgba(0,212,255,0.06)' : 'linear-gradient(135deg, #00d4ff, #0ef5c2)',
                  border: submitting ? '1px solid rgba(0,212,255,0.22)' : 'none',
                  borderRadius: 16, color: submitting ? '#00d4ff' : '#06060f',
                  fontSize: 16, fontWeight: 700, cursor: submitting ? 'default' : 'pointer',
                  fontFamily: font, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                {submitting ? (
                  <><div style={{ width: 14, height: 14, border: '2px solid rgba(0,212,255,0.2)', borderTopColor: '#00d4ff', borderRadius: '50%', animation: 'spin 0.65s linear infinite' }}/>Saving...</>
                ) : 'Complete Practice ✓'}
              </button>
            )}
          </div>
        </div>
      </div>

      <AIAssistant concept={task._concept || task.title} goal={goal} context={`Guided Practice: ${practice?.title || task.title}`} />
    </>
  )
}
