'use client'
import { useState, useEffect } from 'react'
import { selectReflectionPrompts } from '@/lib/learningEngine'
import ConfidenceSelector from './ConfidenceSelector'

const font = "'Plus Jakarta Sans','DM Sans',system-ui,sans-serif"

export default function ReflectionView({ task, goal, knowledge, onClose, onComplete }) {
  const [prompts] = useState(() =>
    selectReflectionPrompts({
      difficulty: task._difficulty || 2,
      isEndOfModule: task._isEndOfModule || false,
      conceptName: task._concept || task.title,
    })
  )
  const [responses, setResponses] = useState({})
  const [evaluating, setEvaluating] = useState(false)
  const [evaluation, setEvaluation] = useState(null)
  const [completing, setCompleting] = useState(false)
  const [confidenceLevel, setConfidenceLevel] = useState('')

  const allRequired = prompts.filter(p => p.required).every(p => (responses[p.id] || '').trim().length > 10)
  const filledCount = Object.values(responses).filter(v => v.trim().length > 5).length

  async function handleSubmit() {
    if (!allRequired) return
    setEvaluating(true)

    try {
      const reflections = prompts
        .filter(p => (responses[p.id] || '').trim())
        .map(p => ({ prompt: p.prompt, response: responses[p.id] }))

      const res = await fetch('/api/practice-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'evaluate_reflection',
          concept: task._concept || task.title,
          goal,
          reflections,
        }),
      })
      const data = await res.json()
      setEvaluation(data)
    } catch {
      setEvaluation({
        quality_score: 70,
        feedback: 'Great job reflecting on your learning! Reflection is a powerful tool for growth.',
        suggestion: 'Keep journaling after each learning session.',
      })
    }

    setEvaluating(false)
  }

  function handleComplete() {
    if (!confidenceLevel) return
    setCompleting(true)
    onComplete({
      reflectionQuality: evaluation?.quality_score || 50,
      confusedTopics: evaluation?.confused_topics || [],
      confidenceLevel,
      attempts: Math.max(1, filledCount),
    })
  }

  return (
    <>
      <style>{`
        @keyframes fadeIn { from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)} }
        @keyframes spin { to{transform:rotate(360deg)} }
        @keyframes slideUp { from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)} }
        @keyframes pulseReflect { 0%,100%{opacity:0.7}50%{opacity:1} }
      `}</style>

      <div style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'linear-gradient(180deg, #06060f 0%, #0d0918 100%)',
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
            <span style={{ fontSize: 18 }}>🪞</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#A78BFA' }}>Reflection</span>
          </div>

          <div style={{
            padding: '4px 12px', background: 'rgba(167,139,250,0.10)',
            border: '1px solid rgba(167,139,250,0.25)', borderRadius: 9999,
            fontSize: 11, fontWeight: 700, color: '#A78BFA',
          }}>
            {filledCount}/{prompts.length}
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: '20px 20px 120px' }}>
          <div style={{ maxWidth: 640, margin: '0 auto' }}>

            {/* Intro */}
            <div style={{ textAlign: 'center', marginBottom: 32, animation: 'fadeIn 0.4s ease both' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🪞</div>
              <h1 style={{ fontSize: 24, fontWeight: 800, color: '#f5f5f7', marginBottom: 8 }}>
                Time to Reflect
              </h1>
              <p style={{ fontSize: 14, color: '#8e8e93', lineHeight: 1.6, maxWidth: 400, margin: '0 auto' }}>
                The best learners reflect on what they&apos;ve learned. Take a moment to think about your progress on <strong style={{ color: '#A78BFA' }}>{task._concept || task.title}</strong>.
              </p>
            </div>

            {!evaluation ? (
              <>
                {/* Reflection prompts */}
                {prompts.map((p, i) => (
                  <div key={p.id} style={{
                    marginBottom: 20, animation: `slideUp 0.3s ${i * 0.1}s ease both`,
                  }}>
                    <div style={{
                      padding: '18px 20px',
                      background: 'rgba(167,139,250,0.04)',
                      border: `1px solid ${(responses[p.id] || '').trim().length > 10 ? 'rgba(167,139,250,0.30)' : 'rgba(255,255,255,0.08)'}`,
                      borderRadius: 16,
                      transition: 'border-color 0.3s',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                        <div style={{
                          width: 24, height: 24, borderRadius: '50%',
                          background: (responses[p.id] || '').trim().length > 10 ? 'rgba(167,139,250,0.20)' : 'rgba(255,255,255,0.06)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 12, color: (responses[p.id] || '').trim().length > 10 ? '#A78BFA' : '#636366',
                          fontWeight: 700, transition: 'all 0.3s',
                        }}>
                          {(responses[p.id] || '').trim().length > 10 ? '✓' : i + 1}
                        </div>
                        <span style={{
                          fontSize: 15, fontWeight: 700, color: '#f5f5f7', lineHeight: 1.4,
                        }}>
                          {p.prompt}
                        </span>
                        {p.required && (
                          <span style={{ fontSize: 10, color: '#FF453A', fontWeight: 700 }}>Required</span>
                        )}
                      </div>

                      <textarea
                        value={responses[p.id] || ''}
                        onChange={e => setResponses(prev => ({ ...prev, [p.id]: e.target.value }))}
                        placeholder="Take a moment to think..."
                        rows={3}
                        style={{
                          width: '100%', padding: '12px 14px',
                          background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.08)',
                          borderRadius: 12, color: '#f5f5f7', fontSize: 14,
                          fontFamily: font, lineHeight: 1.6, resize: 'vertical', outline: 'none',
                        }}
                      />
                    </div>
                  </div>
                ))}

                {/* Submit button */}
                <button
                  onClick={handleSubmit}
                  disabled={!allRequired || evaluating}
                  style={{
                    width: '100%', padding: '16px', marginTop: 8,
                    background: allRequired
                      ? (evaluating ? 'rgba(167,139,250,0.10)' : 'linear-gradient(135deg, #A78BFA, #818CF8)')
                      : 'rgba(255,255,255,0.04)',
                    border: allRequired ? 'none' : '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 16,
                    color: allRequired ? (evaluating ? '#A78BFA' : '#fff') : '#3a3a3c',
                    fontSize: 16, fontWeight: 700,
                    cursor: allRequired && !evaluating ? 'pointer' : 'default',
                    fontFamily: font, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  }}
                >
                  {evaluating ? (
                    <><div style={{ width: 14, height: 14, border: '2px solid rgba(167,139,250,0.2)', borderTopColor: '#A78BFA', borderRadius: '50%', animation: 'spin 0.65s linear infinite' }}/>Processing reflection...</>
                  ) : allRequired ? 'Submit Reflection →' : 'Answer required questions to continue'}
                </button>
              </>
            ) : (
              /* Evaluation results */
              <div style={{ animation: 'fadeIn 0.4s ease both' }}>
                {/* Score */}
                <div style={{
                  textAlign: 'center', padding: '24px 20px', marginBottom: 20,
                  background: 'rgba(167,139,250,0.06)',
                  border: '1px solid rgba(167,139,250,0.20)', borderRadius: 20,
                }}>
                  <div style={{ fontSize: 48, fontWeight: 900, color: '#A78BFA', marginBottom: 4 }}>
                    {evaluation.quality_score}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#636366', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    Reflection Quality
                  </div>
                </div>

                {/* Feedback */}
                <div style={{
                  padding: '16px 20px', background: 'rgba(14,245,194,0.04)',
                  border: '1px solid rgba(14,245,194,0.16)', borderRadius: 16, marginBottom: 16,
                }}>
                  <p style={{ color: '#c8f7eb', fontSize: 14, lineHeight: 1.65, margin: 0 }}>
                    {evaluation.feedback}
                  </p>
                </div>

                {/* Insight */}
                {evaluation.insight && (
                  <div style={{
                    padding: '14px 18px', background: 'rgba(129,140,248,0.06)',
                    border: '1px solid rgba(129,140,248,0.18)', borderRadius: 14, marginBottom: 16,
                  }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#818CF8', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 6 }}>
                      Insight About Your Learning
                    </div>
                    <p style={{ color: '#8e8e93', fontSize: 13, lineHeight: 1.6, margin: 0 }}>
                      {evaluation.insight}
                    </p>
                  </div>
                )}

                {/* Suggestion */}
                {evaluation.suggestion && (
                  <div style={{
                    padding: '14px 18px', background: 'rgba(251,191,36,0.05)',
                    border: '1px solid rgba(251,191,36,0.18)', borderRadius: 14, marginBottom: 16,
                  }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#FBBF24', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 6 }}>
                      Next Step
                    </div>
                    <p style={{ color: '#8e8e93', fontSize: 13, lineHeight: 1.6, margin: 0 }}>
                      {evaluation.suggestion}
                    </p>
                  </div>
                )}

                {/* Confused topics */}
                {evaluation.confused_topics?.length > 0 && (
                  <div style={{
                    padding: '14px 18px', background: 'rgba(255,69,58,0.04)',
                    border: '1px solid rgba(255,69,58,0.15)', borderRadius: 14, marginBottom: 16,
                  }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#FF453A', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 6 }}>
                      Topics to Review
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {evaluation.confused_topics.map((topic, i) => (
                        <span key={i} style={{
                          padding: '4px 10px', background: 'rgba(255,69,58,0.08)',
                          border: '1px solid rgba(255,69,58,0.20)', borderRadius: 8,
                          fontSize: 12, color: '#ff6961',
                        }}>{topic}</span>
                      ))}
                    </div>
                  </div>
                )}

                <ConfidenceSelector
                  value={confidenceLevel}
                  onChange={setConfidenceLevel}
                  accent="#A78BFA"
                  borderColor="rgba(167,139,250,0.22)"
                  background="rgba(167,139,250,0.05)"
                  label="After reflecting, how clear does this concept feel?"
                />
              </div>
            )}
          </div>
        </div>

        {/* Bottom nav */}
        {evaluation && (
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

              <button
                onClick={handleComplete}
                disabled={completing || !confidenceLevel}
                style={{
                  flex: 1, padding: '14px',
                  background: completing ? 'rgba(167,139,250,0.06)' : confidenceLevel ? 'linear-gradient(135deg, #A78BFA, #818CF8)' : 'rgba(255,255,255,0.04)',
                  border: completing ? '1px solid rgba(167,139,250,0.22)' : confidenceLevel ? 'none' : '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 16, color: completing ? '#A78BFA' : confidenceLevel ? '#fff' : '#636366',
                  fontSize: 16, fontWeight: 700, cursor: completing ? 'default' : 'pointer',
                  fontFamily: font, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                {completing ? (
                  <><div style={{ width: 14, height: 14, border: '2px solid rgba(167,139,250,0.2)', borderTopColor: '#A78BFA', borderRadius: '50%', animation: 'spin 0.65s linear infinite' }}/>Saving...</>
                ) : confidenceLevel ? 'Complete Reflection ✓' : 'Choose confidence to continue'}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
