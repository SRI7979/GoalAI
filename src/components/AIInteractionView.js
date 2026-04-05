'use client'
import { useState, useEffect } from 'react'
import { AI_INTERACTION_TYPES } from '@/lib/learningEngine'
import ConfidenceSelector from './ConfidenceSelector'
import IconGlyph from '@/components/IconGlyph'

const font = "'Plus Jakarta Sans','DM Sans',system-ui,sans-serif"

export default function AIInteractionView({ task, goal, knowledge, onClose, onComplete }) {
  const [loading, setLoading] = useState(true)
  const [selectedType, setSelectedType] = useState(null)
  const [interaction, setInteraction] = useState(null)
  const [response, setResponse] = useState('')
  const [evaluation, setEvaluation] = useState(null)
  const [evaluating, setEvaluating] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [debugAnswers, setDebugAnswers] = useState({})
  const [predictAnswer, setPredictAnswer] = useState(null)
  const [predictRevealed, setPredictRevealed] = useState(false)
  const [confidenceLevel, setConfidenceLevel] = useState('')

  const types = Object.entries(AI_INTERACTION_TYPES)

  async function loadInteraction(type) {
    setSelectedType(type)
    setLoading(true)
    setInteraction(null)
    setResponse('')
    setEvaluation(null)

    try {
      const res = await fetch('/api/practice-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ai_interaction',
          concept: task._concept || task.title,
          goal,
          interactionType: type,
          knowledge,
        }),
      })
      const data = await res.json()
      setInteraction(data)
    } catch {}
    setLoading(false)
  }

  async function handleSubmit() {
    if (!response.trim()) return
    setEvaluating(true)

    try {
      const res = await fetch('/api/practice-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'evaluate_interaction',
          concept: task._concept || task.title,
          interactionType: selectedType,
          studentResponse: response,
          originalPrompt: interaction?.prompt_to_student || interaction?.question || interaction?.scenario || '',
        }),
      })
      const data = await res.json()
      setEvaluation(data)
    } catch {
      setEvaluation({ score: 70, passed: true, feedback: 'Good thinking! Keep exploring.', depth_score: 65 })
    }
    setEvaluating(false)
  }

  function handlePredictSelect(idx) {
    if (predictRevealed) return
    setPredictAnswer(idx)
    setPredictRevealed(true)
  }

  function handleComplete() {
    if (!confidenceLevel) return
    setCompleting(true)
    onComplete({
      aiInteractionDepth: evaluation?.depth_score || 50,
      interactionType: selectedType,
      confidenceLevel,
      attempts: 1,
      accuracy: evaluation?.score || 70,
    })
  }

  return (
    <>
      <style>{`
        @keyframes fadeIn { from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)} }
        @keyframes spin { to{transform:rotate(360deg)} }
        @keyframes slideUp { from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)} }
      `}</style>

      <div style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'linear-gradient(180deg, #06060f 0%, #080818 100%)',
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
            <IconGlyph name="message" size={18} strokeWidth={2.2} color="#818CF8" />
            <span style={{ fontSize: 14, fontWeight: 700, color: '#818CF8' }}>AI Interaction</span>
          </div>

          <div style={{ width: 36 }} />
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: '20px 20px 120px' }}>
          <div style={{ maxWidth: 640, margin: '0 auto' }}>

            {/* Type selection (if not yet chosen) */}
            {!selectedType && (
              <div style={{ animation: 'fadeIn 0.3s ease both' }}>
                <div style={{ textAlign: 'center', marginBottom: 28 }}>
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
                    <div style={{ width: 64, height: 64, borderRadius: 20, background: 'rgba(129,140,248,0.10)', border: '1px solid rgba(129,140,248,0.22)', display: 'grid', placeItems: 'center' }}>
                      <IconGlyph name="message" size={28} strokeWidth={2.2} color="#818CF8" />
                    </div>
                  </div>
                  <h1 style={{ fontSize: 24, fontWeight: 800, color: '#f5f5f7', marginBottom: 8 }}>
                    Choose Your Challenge
                  </h1>
                  <p style={{ fontSize: 14, color: '#8e8e93', lineHeight: 1.6 }}>
                    Pick how you want to engage with <strong style={{ color: '#818CF8' }}>{task._concept || task.title}</strong>
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {types.map(([key, config]) => (
                    <button key={key} onClick={() => loadInteraction(key)} style={{
                      padding: '18px 20px', background: 'rgba(129,140,248,0.04)',
                      border: '1px solid rgba(129,140,248,0.15)', borderRadius: 16,
                      cursor: 'pointer', fontFamily: font, textAlign: 'left',
                      display: 'flex', alignItems: 'center', gap: 14, transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(129,140,248,0.08)'; e.currentTarget.style.borderColor = 'rgba(129,140,248,0.30)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(129,140,248,0.04)'; e.currentTarget.style.borderColor = 'rgba(129,140,248,0.15)' }}
                    >
                      <div style={{
                        width: 44, height: 44, borderRadius: 12,
                        background: 'rgba(129,140,248,0.10)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 22, flexShrink: 0,
                      }}><IconGlyph name={config.icon} size={22} strokeWidth={2.2} color="#818CF8" /></div>
                      <div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: '#f5f5f7', marginBottom: 2 }}>
                          {config.label}
                        </div>
                        <div style={{ fontSize: 13, color: '#8e8e93', lineHeight: 1.4 }}>
                          {config.description}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Loading */}
            {selectedType && loading && (
              <div style={{ textAlign: 'center', paddingTop: 80 }}>
                <div style={{
                  width: 44, height: 44, border: '3px solid rgba(255,255,255,0.06)',
                  borderTopColor: '#818CF8', borderRadius: '50%',
                  animation: 'spin 0.65s linear infinite', margin: '0 auto 20px',
                }} />
                <p style={{ color: '#636366', fontSize: 14 }}>
                  Building your {AI_INTERACTION_TYPES[selectedType]?.label || 'interaction'}...
                </p>
              </div>
            )}

            {/* Interaction loaded */}
            {selectedType && !loading && interaction && (
              <div style={{ animation: 'fadeIn 0.3s ease both' }}>
                {/* Type badge */}
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '5px 14px', marginBottom: 16,
                  background: 'rgba(129,140,248,0.08)',
                  border: '1px solid rgba(129,140,248,0.20)', borderRadius: 9999,
                  fontSize: 11, fontWeight: 700, color: '#818CF8',
                  textTransform: 'uppercase', letterSpacing: '1px',
                }}>
                  <IconGlyph name={interaction.typeConfig?.icon || 'message'} size={13} strokeWidth={2.3} color="#818CF8" /> {interaction.typeConfig?.label}
                </div>

                {/* Scenario */}
                <div style={{
                  padding: '16px 20px', background: 'rgba(129,140,248,0.05)',
                  border: '1px solid rgba(129,140,248,0.18)', borderRadius: 16, marginBottom: 20,
                }}>
                  <p style={{ color: '#c8d6e5', fontSize: 15, lineHeight: 1.65, margin: 0 }}>
                    {interaction.scenario}
                  </p>
                </div>

                {/* Explain type: open-ended response */}
                {selectedType === 'explain' && (
                  <>
                    <p style={{ color: '#f5f5f7', fontSize: 16, fontWeight: 700, lineHeight: 1.5, marginBottom: 16 }}>
                      {interaction.prompt_to_student}
                    </p>

                    {!evaluation && (
                      <>
                        <textarea
                          value={response}
                          onChange={e => setResponse(e.target.value)}
                          placeholder="Explain in your own words..."
                          rows={5}
                          style={{
                            width: '100%', padding: '14px 16px',
                            background: 'rgba(0,0,0,0.30)', border: '1px solid rgba(255,255,255,0.12)',
                            borderRadius: 14, color: '#f5f5f7', fontSize: 14,
                            fontFamily: font, lineHeight: 1.6, resize: 'vertical', outline: 'none',
                            marginBottom: 12,
                          }}
                        />
                        <button onClick={handleSubmit} disabled={!response.trim() || evaluating} style={{
                          width: '100%', padding: '14px',
                          background: response.trim() && !evaluating ? 'linear-gradient(135deg, #818CF8, #6366F1)' : 'rgba(255,255,255,0.06)',
                          border: 'none', borderRadius: 14,
                          color: response.trim() && !evaluating ? '#fff' : '#636366',
                          fontSize: 15, fontWeight: 700,
                          cursor: response.trim() && !evaluating ? 'pointer' : 'default',
                          fontFamily: font, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        }}>
                          {evaluating ? (
                            <><div style={{ width: 14, height: 14, border: '2px solid rgba(129,140,248,0.2)', borderTopColor: '#818CF8', borderRadius: '50%', animation: 'spin 0.65s linear infinite' }}/>Evaluating...</>
                          ) : 'Submit Explanation →'}
                        </button>
                      </>
                    )}
                  </>
                )}

                {/* Debug type */}
                {selectedType === 'debug' && (
                  <>
                    {interaction.buggy_code && (
                      <div style={{
                        padding: '14px 18px', background: '#0a0a14',
                        border: '1px solid rgba(255,69,58,0.25)', borderRadius: 14, marginBottom: 16,
                        fontFamily: "'JetBrains Mono',monospace", fontSize: 13, color: '#CBD5E1',
                        lineHeight: 1.7, whiteSpace: 'pre-wrap',
                      }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: '#FF453A', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 8, fontFamily: font }}>
                          Find The Bug(s)
                        </div>
                        {interaction.buggy_code}
                      </div>
                    )}

                    {!evaluation && (
                      <>
                        <textarea
                          value={response}
                          onChange={e => setResponse(e.target.value)}
                          placeholder="Describe the bug(s) and how to fix them..."
                          rows={4}
                          style={{
                            width: '100%', padding: '14px 16px',
                            background: 'rgba(0,0,0,0.30)', border: '1px solid rgba(255,255,255,0.12)',
                            borderRadius: 14, color: '#f5f5f7', fontSize: 14,
                            fontFamily: font, lineHeight: 1.6, resize: 'vertical', outline: 'none',
                            marginBottom: 12,
                          }}
                        />
                        <button onClick={handleSubmit} disabled={!response.trim() || evaluating} style={{
                          width: '100%', padding: '14px',
                          background: response.trim() && !evaluating ? 'linear-gradient(135deg, #FF453A, #EC4899)' : 'rgba(255,255,255,0.06)',
                          border: 'none', borderRadius: 14,
                          color: response.trim() && !evaluating ? '#fff' : '#636366',
                          fontSize: 15, fontWeight: 700,
                          cursor: response.trim() && !evaluating ? 'pointer' : 'default',
                          fontFamily: font, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        }}>
                          {evaluating ? (
                            <><div style={{ width: 14, height: 14, border: '2px solid rgba(255,69,58,0.2)', borderTopColor: '#FF453A', borderRadius: '50%', animation: 'spin 0.65s linear infinite' }}/>Checking...</>
                          ) : 'Submit Debug Analysis →'}
                        </button>
                      </>
                    )}
                  </>
                )}

                {/* Predict type: MCQ */}
                {selectedType === 'predict' && interaction.options && (
                  <>
                    {interaction.code_or_situation && (
                      <div style={{
                        padding: '14px 18px', background: '#0a0a14',
                        border: '1px solid rgba(129,140,248,0.25)', borderRadius: 14, marginBottom: 16,
                        fontFamily: "'JetBrains Mono',monospace", fontSize: 13, color: '#CBD5E1',
                        lineHeight: 1.7, whiteSpace: 'pre-wrap',
                      }}>
                        {interaction.code_or_situation}
                      </div>
                    )}

                    <p style={{ color: '#f5f5f7', fontSize: 16, fontWeight: 700, marginBottom: 16 }}>
                      {interaction.question}
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                      {interaction.options.map((opt, i) => {
                        const isCorrect = i === interaction.correct_index
                        const isSelected = predictAnswer === i
                        let bg = 'rgba(255,255,255,0.04)', border = 'rgba(255,255,255,0.10)', color = '#f5f5f7'
                        if (predictRevealed) {
                          if (isCorrect) { bg = 'rgba(14,245,194,0.08)'; border = 'rgba(14,245,194,0.35)'; color = '#0ef5c2' }
                          else if (isSelected) { bg = 'rgba(255,69,58,0.08)'; border = 'rgba(255,69,58,0.35)'; color = '#FF453A' }
                          else { color = '#636366' }
                        }
                        return (
                          <button key={i} onClick={() => handlePredictSelect(i)} style={{
                            padding: '12px 16px', background: bg,
                            border: `1.5px solid ${border}`, borderRadius: 12,
                            cursor: predictRevealed ? 'default' : 'pointer',
                            textAlign: 'left', color, fontSize: 14, fontWeight: 600,
                            fontFamily: font, transition: 'all 0.18s',
                            display: 'flex', gap: 10, alignItems: 'center',
                          }}>
                            <span style={{
                              width: 24, height: 24, borderRadius: 6,
                              background: predictRevealed && isCorrect ? 'rgba(14,245,194,0.15)' : 'rgba(255,255,255,0.06)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 11, fontWeight: 800, flexShrink: 0,
                            }}>
                              {predictRevealed && isCorrect ? <IconGlyph name="check" size={12} strokeWidth={2.8} color="#0ef5c2" /> : predictRevealed && isSelected ? <IconGlyph name="x" size={12} strokeWidth={2.6} color="#FF453A" /> : ['A','B','C','D'][i]}
                            </span>
                            {opt}
                          </button>
                        )
                      })}
                    </div>

                    {predictRevealed && interaction.explanation && (
                      <div style={{
                        padding: '14px 18px',
                        background: predictAnswer === interaction.correct_index ? 'rgba(14,245,194,0.05)' : 'rgba(255,69,58,0.05)',
                        border: `1px solid ${predictAnswer === interaction.correct_index ? 'rgba(14,245,194,0.18)' : 'rgba(255,69,58,0.18)'}`,
                        borderRadius: 14, marginBottom: 16,
                      }}>
                        <p style={{ color: '#8e8e93', fontSize: 14, lineHeight: 1.65, margin: 0 }}>
                          {interaction.explanation}
                        </p>
                      </div>
                    )}
                  </>
                )}

                {/* What-If type */}
                {selectedType === 'whatif' && (
                  <>
                    {interaction.original && (
                      <div style={{
                        padding: '14px 18px', background: '#0a0a14',
                        border: '1px solid rgba(129,140,248,0.25)', borderRadius: 14, marginBottom: 12,
                        fontFamily: "'JetBrains Mono',monospace", fontSize: 13, color: '#CBD5E1',
                        lineHeight: 1.7, whiteSpace: 'pre-wrap',
                      }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: '#818CF8', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 8, fontFamily: font }}>
                          Original
                        </div>
                        {interaction.original}
                      </div>
                    )}

                    {interaction.modification && (
                      <div style={{
                        padding: '14px 18px', background: 'rgba(251,191,36,0.05)',
                        border: '1px solid rgba(251,191,36,0.18)', borderRadius: 14, marginBottom: 16,
                      }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: '#FBBF24', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 6 }}>
                          What If...
                        </div>
                        <p style={{ color: '#f5f5f7', fontSize: 15, fontWeight: 600, margin: 0 }}>
                          {interaction.modification}
                        </p>
                      </div>
                    )}

                    <p style={{ color: '#f5f5f7', fontSize: 15, fontWeight: 700, marginBottom: 12 }}>
                      {interaction.question}
                    </p>

                    {!evaluation && (
                      <>
                        <textarea
                          value={response}
                          onChange={e => setResponse(e.target.value)}
                          placeholder="What would happen and why?"
                          rows={4}
                          style={{
                            width: '100%', padding: '14px 16px',
                            background: 'rgba(0,0,0,0.30)', border: '1px solid rgba(255,255,255,0.12)',
                            borderRadius: 14, color: '#f5f5f7', fontSize: 14,
                            fontFamily: font, lineHeight: 1.6, resize: 'vertical', outline: 'none',
                            marginBottom: 12,
                          }}
                        />
                        <button onClick={handleSubmit} disabled={!response.trim() || evaluating} style={{
                          width: '100%', padding: '14px',
                          background: response.trim() && !evaluating ? 'linear-gradient(135deg, #FBBF24, #F59E0B)' : 'rgba(255,255,255,0.06)',
                          border: 'none', borderRadius: 14,
                          color: response.trim() && !evaluating ? '#06060f' : '#636366',
                          fontSize: 15, fontWeight: 700,
                          cursor: response.trim() && !evaluating ? 'pointer' : 'default',
                          fontFamily: font, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        }}>
                          {evaluating ? (
                            <><div style={{ width: 14, height: 14, border: '2px solid rgba(251,191,36,0.2)', borderTopColor: '#FBBF24', borderRadius: '50%', animation: 'spin 0.65s linear infinite' }}/>Analyzing...</>
                          ) : 'Submit Analysis →'}
                        </button>
                      </>
                    )}
                  </>
                )}

                {/* Evaluation results (for explain, debug, whatif types) */}
                {evaluation && (
                  <div style={{ animation: 'slideUp 0.3s ease both', marginTop: 16 }}>
                    <div style={{
                      padding: '18px 20px',
                      background: evaluation.passed ? 'rgba(14,245,194,0.05)' : 'rgba(255,69,58,0.05)',
                      border: `1px solid ${evaluation.passed ? 'rgba(14,245,194,0.18)' : 'rgba(255,69,58,0.18)'}`,
                      borderRadius: 16, marginBottom: 16,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                        <div style={{
                          padding: '4px 12px', borderRadius: 9999,
                          background: evaluation.passed ? 'rgba(14,245,194,0.12)' : 'rgba(255,69,58,0.12)',
                          fontSize: 12, fontWeight: 800,
                          color: evaluation.passed ? '#0ef5c2' : '#FF453A',
                        }}>
                          {evaluation.score}/100
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#636366' }}>
                          Depth: {evaluation.depth_score}/100
                        </span>
                      </div>
                      <p style={{ color: '#c8d6e5', fontSize: 14, lineHeight: 1.65, margin: 0 }}>
                        {evaluation.feedback}
                      </p>
                    </div>

                    {evaluation.strengths?.length > 0 && (
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: '#0ef5c2', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 6 }}>Strengths</div>
                        {evaluation.strengths.map((s, i) => (
                          <p key={i} style={{ color: '#8e8e93', fontSize: 13, margin: '0 0 4px', paddingLeft: 12, borderLeft: '2px solid rgba(14,245,194,0.25)' }}>{s}</p>
                        ))}
                      </div>
                    )}

                    {evaluation.gaps?.length > 0 && (
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: '#F59E0B', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 6 }}>Room to Grow</div>
                        {evaluation.gaps.map((g, i) => (
                          <p key={i} style={{ color: '#8e8e93', fontSize: 13, margin: '0 0 4px', paddingLeft: 12, borderLeft: '2px solid rgba(245,158,11,0.25)' }}>{g}</p>
                        ))}
                      </div>
                    )}

                    <ConfidenceSelector
                      value={confidenceLevel}
                      onChange={setConfidenceLevel}
                      accent="#818CF8"
                      borderColor="rgba(129,140,248,0.22)"
                      background="rgba(129,140,248,0.05)"
                      label="How confident are you in this kind of reasoning now?"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {(selectedType === 'predict' && predictRevealed && !evaluation) && (
          <div style={{
            padding: '0 20px 16px',
            background: 'rgba(6,6,15,0.90)',
          }}>
            <div style={{ maxWidth: 640, margin: '0 auto' }}>
              <ConfidenceSelector
                value={confidenceLevel}
                onChange={setConfidenceLevel}
                accent="#818CF8"
                borderColor="rgba(129,140,248,0.22)"
                background="rgba(129,140,248,0.05)"
                label="How confident are you in reading situations like this now?"
              />
            </div>
          </div>
        )}

        {/* Bottom nav */}
        <div style={{
          padding: '14px 20px 30px', borderTop: '1px solid rgba(255,255,255,0.08)',
          background: 'rgba(6,6,15,0.90)', backdropFilter: 'blur(28px)',
        }}>
          <div style={{ maxWidth: 640, margin: '0 auto', display: 'flex', gap: 12 }}>
            <button onClick={selectedType && !evaluation ? () => { setSelectedType(null); setInteraction(null) } : onClose} style={{
              padding: '14px 24px', background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.12)', borderRadius: 16,
              color: '#8e8e93', fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: font,
            }}>{selectedType && !evaluation ? 'Change Type' : 'Back'}</button>

            {(evaluation || (selectedType === 'predict' && predictRevealed)) && (
              <button onClick={handleComplete} disabled={completing || !confidenceLevel} style={{
                flex: 1, padding: '14px',
                background: completing ? 'rgba(129,140,248,0.06)' : confidenceLevel ? 'linear-gradient(135deg, #818CF8, #6366F1)' : 'rgba(255,255,255,0.04)',
                border: completing ? '1px solid rgba(129,140,248,0.22)' : confidenceLevel ? 'none' : '1px solid rgba(255,255,255,0.08)',
                borderRadius: 16, color: completing ? '#818CF8' : confidenceLevel ? '#fff' : '#636366',
                fontSize: 16, fontWeight: 700, cursor: completing ? 'default' : 'pointer',
                fontFamily: font, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}>
                {completing ? (
                  <><div style={{ width: 14, height: 14, border: '2px solid rgba(129,140,248,0.2)', borderTopColor: '#818CF8', borderRadius: '50%', animation: 'spin 0.65s linear infinite' }}/>Saving...</>
                ) : confidenceLevel ? 'Complete' : 'Choose confidence to continue'}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
