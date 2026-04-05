'use client'
import { useState, useEffect, useRef } from 'react'
import ConfidenceSelector from './ConfidenceSelector'
import IconGlyph from '@/components/IconGlyph'

const font = "'Plus Jakarta Sans','DM Sans',system-ui,sans-serif"

const PHASE_COLORS = [
  { bg: 'rgba(255,69,58,0.08)', border: 'rgba(255,69,58,0.25)', text: '#FF453A', glow: 'rgba(255,69,58,0.30)' },
  { bg: 'rgba(251,191,36,0.08)', border: 'rgba(251,191,36,0.25)', text: '#FBBF24', glow: 'rgba(251,191,36,0.30)' },
  { bg: 'rgba(236,72,153,0.08)', border: 'rgba(236,72,153,0.25)', text: '#EC4899', glow: 'rgba(236,72,153,0.30)' },
]

export default function BossChallengeView({ task, goal, knowledge, onClose, onComplete }) {
  const [loading, setLoading] = useState(true)
  const [boss, setBoss] = useState(null)
  const [currentPhase, setCurrentPhase] = useState(0)
  const [bossHP, setBossHP] = useState(100)
  const [playerHP, setPlayerHP] = useState(100)
  const [phase1Answers, setPhase1Answers] = useState({})
  const [phase1Revealed, setPhase1Revealed] = useState({})
  const [phaseResponse, setPhaseResponse] = useState('')
  const [phaseResult, setPhaseResult] = useState(null)
  const [evaluating, setEvaluating] = useState(false)
  const [battleState, setBattleState] = useState('intro') // intro | fighting | victory | defeat
  const [completing, setCompleting] = useState(false)
  const [totalScore, setTotalScore] = useState(0)
  const [shakeScreen, setShakeScreen] = useState(false)
  const [confidenceLevel, setConfidenceLevel] = useState('')
  const [mistakeCount, setMistakeCount] = useState(0)
  const [failedPhases, setFailedPhases] = useState(0)
  const startTimeRef = useRef(null)

  useEffect(() => {
    async function load() {
      startTimeRef.current = Date.now()
      setLoading(true)
      const cacheKey = `pathai.boss.v1::${task.id || task.title}`
      try {
        const cached = localStorage.getItem(cacheKey)
        if (cached) {
          const data = JSON.parse(cached)
          if (data.boss_name) { setBoss(data); setLoading(false); return }
        }
      } catch {}
      try {
        const concepts = task._concepts || [task._concept || task.title]
        const res = await fetch('/api/practice-ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'boss_challenge',
            moduleName: task._moduleName || task.title,
            concepts,
            goal,
            difficulty: task._difficulty || 3,
            knowledge,
          }),
        })
        const data = await res.json()
        if (data.boss_name) {
          setBoss(data)
          try { localStorage.setItem(cacheKey, JSON.stringify(data)) } catch {}
        }
      } catch {}
      setLoading(false)
    }
    load()
  }, [task, goal, knowledge])

  function handleQuizAnswer(qIdx, optIdx) {
    if (phase1Revealed[qIdx] !== undefined) return
    const phase = boss.phases[currentPhase]
    const q = phase.questions[qIdx]
    const correct = optIdx === q.correctIndex

    setPhase1Answers(prev => ({ ...prev, [qIdx]: optIdx }))
    setPhase1Revealed(prev => ({ ...prev, [qIdx]: correct }))

    if (correct) {
      const damage = 15
      setBossHP(hp => Math.max(0, hp - damage))
      setTotalScore(s => s + 25)
    } else {
      setMistakeCount((count) => count + 1)
      setPlayerHP(hp => Math.max(0, hp - 10))
      setShakeScreen(true)
      setTimeout(() => setShakeScreen(false), 400)
    }
  }

  function isPhase1Complete() {
    if (!boss) return false
    const phase = boss.phases[currentPhase]
    if (phase.type !== 'quiz') return false
    return Object.keys(phase1Revealed).length === (phase.questions?.length || 0)
  }

  async function handlePhaseSubmit() {
    if (!phaseResponse.trim()) return
    setEvaluating(true)

    try {
      const phase = boss.phases[currentPhase]
      const res = await fetch('/api/practice-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'evaluate_boss_phase',
          phase,
          studentResponse: phaseResponse,
          concept: task._concept || task.title,
        }),
      })
      const result = await res.json()
      setPhaseResult(result)

      if (result.passed) {
        const damage = result.damage_dealt || 25
        setBossHP(hp => Math.max(0, hp - damage))
        setTotalScore(s => s + (result.score || 50))
      } else {
        setFailedPhases((count) => count + 1)
        setPlayerHP(hp => Math.max(0, hp - 15))
        setShakeScreen(true)
        setTimeout(() => setShakeScreen(false), 400)
      }
    } catch {
      setPhaseResult({ passed: true, score: 60, feedback: 'Good effort!', boss_response: 'You have some skill...', damage_dealt: 20 })
      setBossHP(hp => Math.max(0, hp - 20))
    }

    setEvaluating(false)
  }

  function advancePhase() {
    if (bossHP <= 0) {
      setBattleState('victory')
      return
    }
    if (playerHP <= 0) {
      setBattleState('defeat')
      return
    }
    if (currentPhase + 1 < (boss?.phases?.length || 0)) {
      setCurrentPhase(p => p + 1)
      setPhaseResponse('')
      setPhaseResult(null)
      setPhase1Answers({})
      setPhase1Revealed({})
    } else {
      // All phases complete
      setBattleState(bossHP <= 30 ? 'victory' : 'defeat')
    }
  }

function handleComplete() {
    if (!confidenceLevel) return
    setCompleting(true)
    const elapsed = startTimeRef.current
      ? Math.round((Date.now() - startTimeRef.current) / 1000)
      : 0
    onComplete({
      bossDefeated: battleState === 'victory',
      totalScore,
      bossHPRemaining: bossHP,
      playerHPRemaining: playerHP,
      completionTimeSec: elapsed,
      attempts: Math.max(1, 1 + mistakeCount + failedPhases),
      confidenceLevel,
      challengeScore: Math.max(20, Math.min(100, totalScore)),
    })
  }

  const phase = boss?.phases?.[currentPhase]
  const phaseColor = PHASE_COLORS[currentPhase % PHASE_COLORS.length]

  return (
    <>
      <style>{`
        @keyframes fadeIn { from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)} }
        @keyframes spin { to{transform:rotate(360deg)} }
        @keyframes bossEntrance { 0%{transform:scale(0.5);opacity:0}60%{transform:scale(1.1)}100%{transform:scale(1);opacity:1} }
        @keyframes screenShake { 0%,100%{transform:translateX(0)}25%{transform:translateX(-6px)}50%{transform:translateX(6px)}75%{transform:translateX(-3px)} }
        @keyframes hpDrain { from{width:var(--from)}to{width:var(--to)} }
        @keyframes victoryPulse { 0%,100%{text-shadow:0 0 20px rgba(14,245,194,0.5)}50%{text-shadow:0 0 40px rgba(14,245,194,0.9)} }
        @keyframes damageFlash { 0%{opacity:0}20%{opacity:1}100%{opacity:0} }
        @keyframes bossFloat { 0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)} }
      `}</style>

      <div style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'linear-gradient(180deg, #0a0010 0%, #150820 50%, #0a0010 100%)',
        fontFamily: font, display: 'flex', flexDirection: 'column', overflow: 'hidden',
        animation: shakeScreen ? 'screenShake 0.4s ease both' : 'none',
      }}>

        {/* Top bar */}
        <div style={{
          padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: '1px solid rgba(236,72,153,0.20)', background: 'rgba(10,0,16,0.88)',
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
            <IconGlyph name="challenge" size={18} strokeWidth={2.2} color="#EC4899" />
            <span style={{ fontSize: 14, fontWeight: 700, color: '#EC4899' }}>Boss Challenge</span>
          </div>

          {boss && battleState === 'fighting' && (
            <div style={{ fontSize: 12, fontWeight: 700, color: '#636366' }}>
              Phase {currentPhase + 1}/{boss.phases.length}
            </div>
          )}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: '20px 20px 120px' }}>
          <div style={{ maxWidth: 640, margin: '0 auto' }}>

            {loading ? (
              <div style={{ textAlign: 'center', paddingTop: 80 }}>
                <div style={{
                  width: 44, height: 44, border: '3px solid rgba(255,255,255,0.06)',
                  borderTopColor: '#EC4899', borderRadius: '50%',
                  animation: 'spin 0.65s linear infinite', margin: '0 auto 20px',
                }} />
                <p style={{ color: '#636366', fontSize: 14 }}>Summoning the boss...</p>
                <p style={{ color: '#475569', fontSize: 12, marginTop: 8 }}>Prepare for a comprehensive challenge</p>
              </div>
            ) : !boss ? (
              <div style={{ textAlign: 'center', paddingTop: 80 }}>
                <p style={{ color: '#636366', marginBottom: 16 }}>Could not summon the boss.</p>
                <button onClick={onClose} style={{
                  padding: '10px 24px', background: 'rgba(255,255,255,0.07)',
                  border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12,
                  color: '#8e8e93', fontSize: 14, cursor: 'pointer', fontFamily: font,
                }}>Go Back</button>
              </div>
            ) : battleState === 'intro' ? (
              /* Boss intro */
              <div style={{ textAlign: 'center', animation: 'bossEntrance 0.6s cubic-bezier(0.34,1.56,0.64,1) both' }}>
                <div style={{
                  fontSize: 80, marginBottom: 20,
                  animation: 'bossFloat 3s ease-in-out infinite',
                  filter: 'drop-shadow(0 0 30px rgba(236,72,153,0.50))',
                }}>
                  <IconGlyph name="crown" size={64} strokeWidth={2.1} color="#EC4899" />
                </div>

                <h1 style={{
                  fontSize: 32, fontWeight: 900, color: '#EC4899',
                  textShadow: '0 0 30px rgba(236,72,153,0.50)',
                  marginBottom: 8,
                }}>
                  {boss.boss_name}
                </h1>

                <p style={{
                  fontSize: 15, color: '#c8d6e5', lineHeight: 1.6,
                  maxWidth: 400, margin: '0 auto 32px',
                }}>
                  {boss.boss_intro}
                </p>

                <div style={{
                  display: 'flex', gap: 16, justifyContent: 'center', marginBottom: 32,
                }}>
                  <div style={{
                    padding: '10px 18px', background: 'rgba(236,72,153,0.10)',
                    border: '1px solid rgba(236,72,153,0.25)', borderRadius: 12,
                    color: '#EC4899', fontSize: 12, fontWeight: 700,
                  }}>
                    {boss.phases.length} Phases
                  </div>
                  <div style={{
                    padding: '10px 18px', background: 'rgba(251,191,36,0.10)',
                    border: '1px solid rgba(251,191,36,0.25)', borderRadius: 12,
                    color: '#FBBF24', fontSize: 12, fontWeight: 700,
                  }}>
                    200 XP Reward
                  </div>
                </div>

                <button
                  onClick={() => setBattleState('fighting')}
                  style={{
                    padding: '16px 40px',
                    background: 'linear-gradient(135deg, #EC4899, #F43F5E)',
                    border: 'none', borderRadius: 16,
                    color: '#fff', fontSize: 18, fontWeight: 800,
                    cursor: 'pointer', fontFamily: font,
                    boxShadow: '0 0 40px rgba(236,72,153,0.40), inset 0 1px 0 rgba(255,255,255,0.30)',
                  }}
                >
                  Begin Battle
                </button>
              </div>
            ) : battleState === 'fighting' && phase ? (
              /* Battle phase */
              <div style={{ animation: 'fadeIn 0.3s ease both' }}>
                {/* HP Bars */}
                <div style={{ marginBottom: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {/* Boss HP */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#EC4899' }}>
                        {boss.boss_name}
                      </span>
                      <span style={{ fontSize: 11, color: '#636366' }}>{bossHP}%</span>
                    </div>
                    <div style={{
                      height: 10, background: 'rgba(255,255,255,0.06)', borderRadius: 9999,
                      overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)',
                    }}>
                      <div style={{
                        height: '100%', width: `${bossHP}%`,
                        background: 'linear-gradient(90deg, #FF453A, #EC4899)',
                        borderRadius: 9999, transition: 'width 0.5s ease',
                        boxShadow: '0 0 10px rgba(236,72,153,0.40)',
                      }} />
                    </div>
                  </div>

                  {/* Player HP */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#0ef5c2' }}>
                        You
                      </span>
                      <span style={{ fontSize: 11, color: '#636366' }}>{playerHP}%</span>
                    </div>
                    <div style={{
                      height: 10, background: 'rgba(255,255,255,0.06)', borderRadius: 9999,
                      overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)',
                    }}>
                      <div style={{
                        height: '100%', width: `${playerHP}%`,
                        background: 'linear-gradient(90deg, #0ef5c2, #00d4ff)',
                        borderRadius: 9999, transition: 'width 0.5s ease',
                        boxShadow: '0 0 10px rgba(14,245,194,0.40)',
                      }} />
                    </div>
                  </div>
                </div>

                {/* Phase header */}
                <div style={{
                  padding: '14px 18px', background: phaseColor.bg,
                  border: `1px solid ${phaseColor.border}`, borderRadius: 14, marginBottom: 20,
                }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: phaseColor.text, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 4 }}>
                    {phase.title}
                  </div>
                  <p style={{ color: '#c8d6e5', fontSize: 14, margin: 0 }}>{phase.description}</p>
                </div>

                {/* Phase 1: Quiz */}
                {phase.type === 'quiz' && phase.questions && (
                  <div>
                    {phase.questions.map((q, qi) => (
                      <div key={qi} style={{ marginBottom: 20 }}>
                        <p style={{ color: '#f5f5f7', fontSize: 16, fontWeight: 700, lineHeight: 1.4, marginBottom: 12 }}>
                          {qi + 1}. {q.question}
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {q.options.map((opt, oi) => {
                            const revealed = phase1Revealed[qi] !== undefined
                            const isCorrect = oi === q.correctIndex
                            const isSelected = phase1Answers[qi] === oi
                            let bg = 'rgba(255,255,255,0.04)'
                            let border = 'rgba(255,255,255,0.10)'
                            let color = '#f5f5f7'
                            if (revealed) {
                              if (isCorrect) { bg = 'rgba(14,245,194,0.08)'; border = 'rgba(14,245,194,0.35)'; color = '#0ef5c2' }
                              else if (isSelected) { bg = 'rgba(255,69,58,0.08)'; border = 'rgba(255,69,58,0.35)'; color = '#FF453A' }
                              else { color = '#636366' }
                            }
                            return (
                              <button key={oi} onClick={() => handleQuizAnswer(qi, oi)} style={{
                                padding: '12px 16px', background: bg,
                                border: `1.5px solid ${border}`, borderRadius: 12,
                                cursor: revealed ? 'default' : 'pointer',
                                textAlign: 'left', color, fontSize: 14, fontWeight: 600,
                                fontFamily: font, transition: 'all 0.18s',
                                display: 'flex', gap: 10, alignItems: 'center',
                              }}>
                                <span style={{
                                  width: 24, height: 24, borderRadius: 6,
                                  background: revealed && isCorrect ? 'rgba(14,245,194,0.15)' : revealed && isSelected ? 'rgba(255,69,58,0.15)' : 'rgba(255,255,255,0.06)',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  fontSize: 11, fontWeight: 800, flexShrink: 0,
                                  color: revealed && isCorrect ? '#0ef5c2' : revealed && isSelected ? '#FF453A' : '#636366',
                                }}>
                                  {revealed && isCorrect ? <IconGlyph name="check" size={12} strokeWidth={2.8} color="#0ef5c2" /> : revealed && isSelected ? <IconGlyph name="x" size={12} strokeWidth={2.6} color="#FF453A" /> : ['A','B','C','D'][oi]}
                                </span>
                                {opt}
                              </button>
                            )
                          })}
                        </div>
                        {phase1Revealed[qi] !== undefined && q.explanation && (
                          <div style={{
                            marginTop: 8, padding: '10px 14px',
                            background: phase1Revealed[qi] ? 'rgba(14,245,194,0.04)' : 'rgba(255,69,58,0.04)',
                            border: `1px solid ${phase1Revealed[qi] ? 'rgba(14,245,194,0.15)' : 'rgba(255,69,58,0.15)'}`,
                            borderRadius: 10,
                          }}>
                            <p style={{ margin: 0, color: '#8e8e93', fontSize: 12, lineHeight: 1.5 }}>{q.explanation}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Phase 2-3: Challenge/Explain */}
                {(phase.type === 'challenge' || phase.type === 'explain') && !phaseResult && (
                  <div>
                    {phase.scenario && (
                      <div style={{
                        padding: '14px 18px', background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, marginBottom: 16,
                      }}>
                        <p style={{ color: '#c8d6e5', fontSize: 14, lineHeight: 1.6, margin: 0 }}>
                          {phase.scenario || phase.prompt}
                        </p>
                      </div>
                    )}
                    {phase.task && (
                      <p style={{ color: '#f5f5f7', fontSize: 15, fontWeight: 700, marginBottom: 16 }}>
                        {phase.task}
                      </p>
                    )}
                    {phase.prompt && !phase.scenario && (
                      <p style={{ color: '#f5f5f7', fontSize: 15, fontWeight: 700, marginBottom: 16 }}>
                        {phase.prompt}
                      </p>
                    )}

                    <textarea
                      value={phaseResponse}
                      onChange={e => setPhaseResponse(e.target.value)}
                      placeholder="Enter your response..."
                      rows={5}
                      style={{
                        width: '100%', padding: '14px 16px',
                        background: 'rgba(0,0,0,0.30)', border: '1px solid rgba(255,255,255,0.12)',
                        borderRadius: 14, color: '#f5f5f7', fontSize: 14,
                        fontFamily: font, lineHeight: 1.6, resize: 'vertical', outline: 'none',
                        marginBottom: 12,
                      }}
                    />

                    <button
                      onClick={handlePhaseSubmit}
                      disabled={!phaseResponse.trim() || evaluating}
                      style={{
                        width: '100%', padding: '14px',
                        background: phaseResponse.trim() && !evaluating
                          ? `linear-gradient(135deg, ${phaseColor.text}, #EC4899)`
                          : 'rgba(255,255,255,0.06)',
                        border: 'none', borderRadius: 14,
                        color: phaseResponse.trim() && !evaluating ? '#fff' : '#636366',
                        fontSize: 15, fontWeight: 700,
                        cursor: phaseResponse.trim() && !evaluating ? 'pointer' : 'default',
                        fontFamily: font, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      }}
                    >
                      {evaluating ? (
                        <><div style={{ width: 14, height: 14, border: '2px solid rgba(236,72,153,0.2)', borderTopColor: '#EC4899', borderRadius: '50%', animation: 'spin 0.65s linear infinite' }}/>The boss is reading...</>
                      ) : 'Attack'}
                    </button>
                  </div>
                )}

                {/* Phase result */}
                {phaseResult && (
                  <div style={{ animation: 'fadeIn 0.3s ease both' }}>
                    <div style={{
                      padding: '16px 20px',
                      background: phaseResult.passed ? 'rgba(14,245,194,0.06)' : 'rgba(255,69,58,0.06)',
                      border: `1px solid ${phaseResult.passed ? 'rgba(14,245,194,0.20)' : 'rgba(255,69,58,0.20)'}`,
                      borderRadius: 16, marginBottom: 16,
                    }}>
                      <div style={{ fontSize: 12, fontWeight: 800, color: phaseResult.passed ? '#0ef5c2' : '#FF453A', marginBottom: 8 }}>
                        {phaseResult.passed ? `${phaseResult.damage_dealt || 25} Damage dealt` : 'Boss blocked your attack'}
                      </div>
                      <p style={{ color: '#c8d6e5', fontSize: 14, lineHeight: 1.6, margin: '0 0 8px' }}>
                        {phaseResult.feedback}
                      </p>
                      {phaseResult.boss_response && (
                        <p style={{ color: '#EC4899', fontSize: 13, fontStyle: 'italic', margin: 0 }}>
                          Boss: &ldquo;{phaseResult.boss_response}&rdquo;
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : battleState === 'victory' ? (
              /* Victory */
              <div style={{ textAlign: 'center', paddingTop: 40, animation: 'fadeIn 0.5s ease both' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
                  <IconGlyph name="trophy" size={64} strokeWidth={2.1} color="#0ef5c2" />
                </div>
                <h1 style={{
                  fontSize: 32, fontWeight: 900, color: '#0ef5c2',
                  animation: 'victoryPulse 2s ease infinite', marginBottom: 8,
                }}>
                  BOSS DEFEATED!
                </h1>
                <p style={{ fontSize: 15, color: '#c8d6e5', lineHeight: 1.6, marginBottom: 24, maxWidth: 400, margin: '0 auto 24px' }}>
                  {boss.victory_message}
                </p>
                <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginBottom: 16 }}>
                  <div style={{
                    padding: '10px 18px', background: 'rgba(14,245,194,0.10)',
                    border: '1px solid rgba(14,245,194,0.25)', borderRadius: 12,
                    color: '#0ef5c2', fontSize: 14, fontWeight: 700,
                  }}>+200 XP</div>
                  <div style={{
                    padding: '10px 18px', background: 'rgba(251,191,36,0.10)',
                    border: '1px solid rgba(251,191,36,0.25)', borderRadius: 12,
                    color: '#FBBF24', fontSize: 14, fontWeight: 700,
                  }}>+50 Gems</div>
                </div>

                <div style={{ maxWidth: 460, margin: '0 auto' }}>
                  <ConfidenceSelector
                    value={confidenceLevel}
                    onChange={setConfidenceLevel}
                    accent="#0ef5c2"
                    borderColor="rgba(14,245,194,0.22)"
                    background="rgba(14,245,194,0.05)"
                    label="How confident are you taking on a similar boss challenge now?"
                  />
                </div>
              </div>
            ) : battleState === 'defeat' ? (
              /* Defeat */
              <div style={{ textAlign: 'center', paddingTop: 40, animation: 'fadeIn 0.5s ease both' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
                  <IconGlyph name="alert" size={64} strokeWidth={2.1} color="#FF453A" />
                </div>
                <h1 style={{ fontSize: 28, fontWeight: 900, color: '#FF453A', marginBottom: 8 }}>
                  Defeated...
                </h1>
                <p style={{ fontSize: 15, color: '#c8d6e5', lineHeight: 1.6, marginBottom: 24, maxWidth: 400, margin: '0 auto 24px' }}>
                  {boss.defeat_message}
                </p>
                <p style={{ color: '#636366', fontSize: 13 }}>
                  Review the concepts and try again when you&apos;re ready!
                </p>

                <div style={{ maxWidth: 460, margin: '20px auto 0' }}>
                  <ConfidenceSelector
                    value={confidenceLevel}
                    onChange={setConfidenceLevel}
                    accent="#818CF8"
                    borderColor="rgba(129,140,248,0.22)"
                    background="rgba(129,140,248,0.05)"
                    label="Even after this attempt, how confident are you with the core ideas?"
                  />
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {/* Bottom nav */}
        <div style={{
          padding: '14px 20px 30px', borderTop: '1px solid rgba(236,72,153,0.15)',
          background: 'rgba(10,0,16,0.90)', backdropFilter: 'blur(28px)',
        }}>
          <div style={{ maxWidth: 640, margin: '0 auto', display: 'flex', gap: 12 }}>
            <button onClick={onClose} style={{
              padding: '14px 24px', background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.12)', borderRadius: 16,
              color: '#8e8e93', fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: font,
            }}>Back</button>

            {battleState === 'fighting' && (isPhase1Complete() || phaseResult) && (
              <button onClick={advancePhase} style={{
                flex: 1, padding: '14px',
                background: 'linear-gradient(135deg, #EC4899, #F43F5E)',
                border: 'none', borderRadius: 16, color: '#fff',
                fontSize: 16, fontWeight: 700, cursor: 'pointer', fontFamily: font,
                boxShadow: `0 0 24px ${phaseColor.glow}`,
              }}>
                {currentPhase + 1 < (boss?.phases?.length || 0) ? 'Next Phase →' : 'Final Strike →'}
              </button>
            )}

            {(battleState === 'victory' || battleState === 'defeat') && (
              <button
                onClick={handleComplete}
                disabled={completing || !confidenceLevel}
                style={{
                  flex: 1, padding: '14px',
                  background: completing ? 'rgba(236,72,153,0.06)'
                    : confidenceLevel
                    ? (battleState === 'victory' ? 'linear-gradient(135deg, #0ef5c2, #00d4ff)' : 'linear-gradient(135deg, #818CF8, #6366F1)')
                    : 'rgba(255,255,255,0.04)',
                  border: completing ? '1px solid rgba(236,72,153,0.22)' : confidenceLevel ? 'none' : '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 16,
                  color: completing ? '#EC4899' : confidenceLevel ? (battleState === 'victory' ? '#06060f' : '#fff') : '#636366',
                  fontSize: 16, fontWeight: 700,
                  cursor: completing ? 'default' : 'pointer', fontFamily: font,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                {completing ? (
                  <><div style={{ width: 14, height: 14, border: '2px solid rgba(236,72,153,0.2)', borderTopColor: '#EC4899', borderRadius: '50%', animation: 'spin 0.65s linear infinite' }}/>Saving...</>
                ) : confidenceLevel ? (battleState === 'victory' ? 'Claim Rewards' : 'Continue') : 'Choose confidence to continue'}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
