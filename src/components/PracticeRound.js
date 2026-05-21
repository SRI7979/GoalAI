'use client'

import { useEffect, useRef, useState } from 'react'
import { normalizeLearningContract } from '@/lib/conceptLesson'
import InteractiveQuestion from './InteractiveQuestion'
import Mascot from './Mascot'

const font = "'Plus Jakarta Sans','DM Sans',system-ui,sans-serif"

const CSS = `
  @keyframes prFadeIn  { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
  @keyframes prFadeOut { from{opacity:1;transform:translateX(0)} to{opacity:0;transform:translateX(-18px)} }
  @keyframes prSlideIn { from{opacity:0;transform:translateX(18px)} to{opacity:1;transform:translateX(0)} }
  @keyframes prSpin    { to{transform:rotate(360deg)} }
  @keyframes prBurst   { 0%{transform:scale(0.6);opacity:0} 60%{transform:scale(1.15)} 100%{transform:scale(1);opacity:1} }
  @keyframes prFloat   { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
  @keyframes prShimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
  @keyframes prBarFill { from{width:0} to{width:100%} }
  @keyframes prXpFloat { 0%{opacity:1;transform:translateY(0)} 100%{opacity:0;transform:translateY(-32px)} }
  @media (prefers-reduced-motion: reduce) {
    @keyframes prFadeIn  { from{opacity:0} to{opacity:1} }
    @keyframes prSlideIn { from{opacity:0} to{opacity:1} }
    @keyframes prBurst   { from{opacity:0} to{opacity:1} }
  }
`

const MASCOT_MESSAGES = {
  start:    ['Let\'s see what you remember!', 'Quick practice — you\'ve got this!', 'Test your knowledge!', 'A few questions to lock it in!'],
  correct:  ['Nice work!', 'Nailed it!', 'Exactly right!', 'You knew that!', 'Perfect!'],
  wrong:    ['Not quite — but now you know!', 'Almost! Check the answer.', 'Good try — remember this one.', 'Every miss teaches you more!'],
  combo3:   ['On fire! 🔥', 'Three in a row!', 'You\'re unstoppable!', 'Keep that streak going!'],
  combo5:   ['FIVE IN A ROW!! 🔥🔥', 'UNSTOPPABLE!', 'Perfect streak — wow!'],
  halfway:  ['Halfway there!', 'Great start — keep it up!', 'Two down, two to go!'],
  done4:    ['Perfect round! You crushed it!', 'Flawless! Nothing left to learn here.', '100% — absolutely perfect!'],
  done3:    ['Excellent work! Almost perfect!', 'Three out of four — great!'],
  done2:    ['Good effort! Review the ones you missed.', 'Half right — you\'re building toward mastery!'],
  done1:    ['Review this concept a bit more — you\'ll get it!', 'Some to review — but you\'re improving!'],
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function ProgressBar({ current, total }) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0
  return (
    <div style={{ height: 6, background: 'rgba(255,255,255,0.07)', borderRadius: 9999, overflow: 'hidden', flex: 1 }}>
      <div style={{
        height: '100%',
        width: `${pct}%`,
        background: 'linear-gradient(90deg,#0ef5c2,#00d4ff)',
        borderRadius: 9999,
        transition: 'width 0.5s ease-out',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(90deg,transparent 0%,rgba(255,255,255,0.25) 50%,transparent 100%)',
          backgroundSize: '200% 100%',
          animation: 'prShimmer 1.4s ease-in-out infinite',
        }}/>
      </div>
    </div>
  )
}

function XpBurst({ amount, color = '#0ef5c2' }) {
  return (
    <div style={{
      position: 'absolute', top: -24, left: '50%', transform: 'translateX(-50%)',
      fontSize: 15, fontWeight: 900, color,
      animation: 'prXpFloat 1.4s ease-out forwards',
      whiteSpace: 'nowrap', pointerEvents: 'none',
    }}>
      +{amount} XP
    </div>
  )
}

export default function PracticeRound({ taughtPoints = [], learningContract = null, goalId: _goalId, previousConcepts = [], onComplete, onSkip }) {
  const [phase, setPhase]           = useState('intro')   // intro | loading | question | transition | result
  const [questions, setQuestions]   = useState([])
  const [current, setCurrent]       = useState(0)
  const [results, setResults]       = useState([])
  const [combo, setCombo]           = useState(0)
  const [mascotPose, setMascotPose] = useState('celebrate')
  const [mascotMsg, setMascotMsg]   = useState(pick(MASCOT_MESSAGES.start))
  const [transOut, setTransOut]     = useState(false)
  const [showXp, setShowXp]         = useState(false)
  const xpRef = useRef(null)
  const questionCount = 4
  const contract = normalizeLearningContract(learningContract || { taughtPoints }, {
    concept: taughtPoints?.[0] || 'the lesson topic',
  })

  async function loadQuestions() {
    setPhase('loading')
    try {
      const spaced = previousConcepts?.length ? previousConcepts[previousConcepts.length - 1] : null
      const concept = contract.conceptLabel || taughtPoints?.[0] || 'the lesson topic'
      const body = {
        action: 'guided_practice',
        concept,
        goal: contract.canDoStatement || concept,
        difficulty: 2,
        knowledge: spaced || undefined,
        learningContract: contract,
      }
      const res = await fetch('/api/practice-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      // guided_practice returns interactiveQuestions[]
      const qs = (data?.interactiveQuestions || data?.questions || []).slice(0, questionCount)
      if (qs.length > 0) {
        setQuestions(qs)
        setPhase('question')
      } else {
        setPhase('result')
      }
    } catch {
      setPhase('result')
    }
  }

  function handleResult(isCorrect) {
    const newResults = [...results, isCorrect]
    setResults(newResults)

    const newCombo = isCorrect ? combo + 1 : 0
    setCombo(newCombo)

    // Mascot reaction
    if (newCombo >= 5) {
      setMascotPose('celebrate')
      setMascotMsg(pick(MASCOT_MESSAGES.combo5))
    } else if (newCombo >= 3) {
      setMascotPose('celebrate')
      setMascotMsg(pick(MASCOT_MESSAGES.combo3))
    } else if (isCorrect) {
      setMascotPose('celebrate')
      setMascotMsg(pick(MASCOT_MESSAGES.correct))
    } else {
      setMascotPose('sad')
      setMascotMsg(pick(MASCOT_MESSAGES.wrong))
    }

    // Halfway nudge
    const nextIdx = current + 1
    if (nextIdx === Math.floor(questionCount / 2)) {
      setTimeout(() => {
        setMascotMsg(pick(MASCOT_MESSAGES.halfway))
        setMascotPose('wave')
      }, 600)
    }

    // Advance to next question or results
    setTimeout(() => {
      if (nextIdx >= questionCount || nextIdx >= questions.length) {
        setPhase('result')
      } else {
        setTransOut(true)
        setTimeout(() => {
          setTransOut(false)
          setCurrent(nextIdx)
          setPhase('question')
          setMascotPose('default')
          setMascotMsg(null)
        }, 220)
      }
    }, 500)
  }

  const correctCount = results.filter(Boolean).length

  function getXp() {
    if (correctCount >= 4) return 30
    if (correctCount === 3) return 20
    if (correctCount === 2) return 15
    return 10
  }

  function getResultMascot() {
    if (correctCount >= 4) return { pose: 'celebrate', msg: pick(MASCOT_MESSAGES.done4) }
    if (correctCount === 3) return { pose: 'celebrate', msg: pick(MASCOT_MESSAGES.done3) }
    if (correctCount === 2) return { pose: 'wave',      msg: pick(MASCOT_MESSAGES.done2) }
    return                         { pose: 'sad',       msg: pick(MASCOT_MESSAGES.done1) }
  }

  const resultMascot = getResultMascot()
  const xpEarned = getXp()

  const q = questions[current]
  // Normalize question fields across different API response shapes
  const qType      = q?.type || 'multiple_choice'
  // true_false uses 'statement', fill_blank uses 'sentence', others use 'question'
  const qQuestion  = q?.question || q?.statement || q?.prompt || ''
  const qOptions   = q?.options || q?.choices || (qType === 'true_false' ? ['True', 'False'] : [])
  const qCorrect   = q?.correctIndex ?? q?.correct_index ?? (q?.correct === true ? 0 : q?.correct === false ? 1 : 0)
  const qAnswer    = q?.answer || q?.correctAnswer || ''
  const qExplain   = q?.explanation || ''
  const qSentence  = q?.sentence || q?.fill || ''

  return (
    <>
      <style>{CSS}</style>
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9900,
        background: 'linear-gradient(180deg,#040a0f 0%,#070d14 100%)',
        fontFamily: font, display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>

        {/* ── Top bar ─────────────────────────────────────────────────── */}
        <div style={{
          padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 12,
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          background: 'rgba(4,10,15,0.92)', backdropFilter: 'blur(24px)',
        }}>
          <div style={{
            padding: '4px 12px', borderRadius: 9999, fontSize: 10, fontWeight: 900,
            letterSpacing: '1.2px', textTransform: 'uppercase',
            background: 'rgba(14,245,194,0.08)', border: '1px solid rgba(14,245,194,0.20)',
            color: '#0ef5c2',
          }}>
            Practice Round
          </div>
          {phase === 'question' && (
            <ProgressBar current={current} total={questionCount} />
          )}
          {phase === 'question' && (
            <span style={{ fontSize: 12, fontWeight: 700, color: '#636366', flexShrink: 0 }}>
              {current + 1}/{questionCount}
            </span>
          )}
          {phase !== 'result' && (
            <button onClick={onSkip} style={{
              marginLeft: 'auto', padding: '6px 14px', borderRadius: 9999,
              background: 'transparent', border: '1px solid rgba(255,255,255,0.10)',
              color: '#636366', fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}>
              Skip
            </button>
          )}
        </div>

        {/* ── Content ─────────────────────────────────────────────────── */}
        <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: phase === 'intro' || phase === 'result' ? 'center' : 'flex-start', padding: '24px 20px 100px' }}>
          <div style={{ width: '100%', maxWidth: 580 }}>

            {/* Intro screen */}
            {phase === 'intro' && (
              <div style={{ textAlign: 'center', animation: 'prFadeIn 0.4s ease both' }}>
                <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'center' }}>
                  <Mascot pose="celebrate" message={pick(MASCOT_MESSAGES.start)} size={64} />
                </div>
                <h2 style={{ fontSize: 26, fontWeight: 900, color: '#f5f5f7', marginBottom: 10, letterSpacing: '-0.4px' }}>
                  Practice what you learned
                </h2>
                <p style={{ fontSize: 15, color: '#8e8e93', marginBottom: 32, lineHeight: 1.6, maxWidth: 360, margin: '0 auto 32px' }}>
                  4 quick questions to lock in what you just studied. Takes about 60 seconds.
                </p>
                <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                  <button onClick={loadQuestions} style={{
                    padding: '13px 32px', borderRadius: 14, background: '#0ef5c2', border: 'none',
                    color: '#040a0f', fontSize: 15, fontWeight: 800, cursor: 'pointer',
                    fontFamily: font, transition: 'opacity 0.15s',
                  }}
                    onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
                    onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                  >
                    Start Practice
                  </button>
                  <button onClick={onSkip} style={{
                    padding: '13px 24px', borderRadius: 14,
                    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)',
                    color: '#8e8e93', fontSize: 15, fontWeight: 600, cursor: 'pointer',
                    fontFamily: font,
                  }}>
                    Skip for now
                  </button>
                </div>
              </div>
            )}

            {/* Loading */}
            {phase === 'loading' && (
              <div style={{ textAlign: 'center', animation: 'prFadeIn 0.3s ease both' }}>
                <div style={{ width: 44, height: 44, border: '3px solid rgba(255,255,255,0.06)', borderTopColor: '#0ef5c2', borderRadius: '50%', animation: 'prSpin 0.7s linear infinite', margin: '0 auto 20px' }}/>
                <p style={{ color: '#636366', fontSize: 14 }}>Generating practice questions…</p>
              </div>
            )}

            {/* Question */}
            {(phase === 'question') && q && (
              <div
                key={current}
                style={{
                  animation: transOut
                    ? 'prFadeOut 0.2s ease forwards'
                    : 'prSlideIn 0.25s ease both',
                }}
              >
                {/* Mascot inline (corner) */}
                {mascotMsg && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14, animation: 'prFadeIn 0.3s ease' }}>
                    <Mascot pose={mascotPose} message={mascotMsg} size={40} />
                  </div>
                )}

                {/* Combo badge */}
                {combo >= 2 && (
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '4px 12px', borderRadius: 9999, marginBottom: 14,
                    background: combo >= 5 ? 'rgba(255,215,0,0.12)' : 'rgba(14,245,194,0.08)',
                    border: `1px solid ${combo >= 5 ? 'rgba(255,215,0,0.30)' : 'rgba(14,245,194,0.22)'}`,
                    color: combo >= 5 ? '#FFD700' : '#0ef5c2',
                    fontSize: 12, fontWeight: 800,
                    animation: 'prBurst 0.3s cubic-bezier(0.34,1.56,0.64,1)',
                  }}>
                    🔥 Combo {combo}×
                  </div>
                )}

                <InteractiveQuestion
                  type={['multiple_choice','true_false','fill_blank','order_steps','match_pairs','spot_error'].includes(qType) ? qType : 'multiple_choice'}
                  question={qQuestion}
                  statement={q?.statement}
                  options={qOptions}
                  correctIndex={qCorrect}
                  correct={q?.correct}
                  answer={qAnswer}
                  sentence={qSentence}
                  explanation={qExplain}
                  onResult={handleResult}
                />
              </div>
            )}

            {/* No questions fallback */}
            {phase === 'question' && !q && (
              <div style={{ textAlign: 'center', color: '#636366' }}>
                <p>Could not load questions. Skipping practice.</p>
                <button onClick={onSkip} style={{ marginTop: 16, padding: '10px 24px', borderRadius: 12, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: '#8e8e93', cursor: 'pointer', fontFamily: font }}>Continue</button>
              </div>
            )}

            {/* Results */}
            {phase === 'result' && (
              <div style={{ textAlign: 'center', animation: 'prBurst 0.45s cubic-bezier(0.34,1.56,0.64,1) both' }}>
                <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'center' }}>
                  <Mascot pose={resultMascot.pose} message={resultMascot.msg} size={64} />
                </div>

                <h2 style={{ fontSize: 26, fontWeight: 900, color: '#f5f5f7', marginBottom: 6, letterSpacing: '-0.4px' }}>
                  {correctCount}/{Math.max(results.length, 1)} correct
                </h2>
                <p style={{ fontSize: 15, color: '#8e8e93', marginBottom: 24 }}>
                  {correctCount >= 4
                    ? 'Flawless round — you\'ve got this locked in!'
                    : correctCount >= 3
                      ? 'Almost perfect — great practice!'
                      : correctCount >= 2
                        ? 'Good effort — review the ones you missed.'
                        : 'Keep studying — you\'re building the foundation!'}
                </p>

                {/* XP earned */}
                <div style={{
                  position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '10px 24px', borderRadius: 14,
                  background: correctCount >= 4 ? 'rgba(255,215,0,0.10)' : correctCount >= 3 ? 'rgba(14,245,194,0.10)' : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${correctCount >= 4 ? 'rgba(255,215,0,0.25)' : correctCount >= 3 ? 'rgba(14,245,194,0.22)' : 'rgba(255,255,255,0.10)'}`,
                  color: correctCount >= 4 ? '#FFD700' : correctCount >= 3 ? '#0ef5c2' : '#8e8e93',
                  fontSize: 18, fontWeight: 900, marginBottom: 28,
                }}>
                  +{xpEarned} XP earned
                </div>

                {/* Score circles */}
                {results.length > 0 && (
                  <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 32 }}>
                    {results.map((r, i) => (
                      <div key={i} style={{
                        width: 36, height: 36, borderRadius: '50%',
                        background: r ? 'rgba(14,245,194,0.12)' : 'rgba(255,69,58,0.10)',
                        border: `2px solid ${r ? 'rgba(14,245,194,0.35)' : 'rgba(255,69,58,0.28)'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        animation: `prBurst 0.35s ${i * 0.07}s cubic-bezier(0.34,1.56,0.64,1) both`,
                      }}>
                        {r
                          ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0ef5c2" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                          : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#FF453A" strokeWidth="3" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        }
                      </div>
                    ))}
                  </div>
                )}

                <button
                  onClick={() => onComplete?.({ score: correctCount, total: results.length, xp: xpEarned })}
                  style={{
                    padding: '14px 40px', borderRadius: 14, background: '#0ef5c2', border: 'none',
                    color: '#040a0f', fontSize: 16, fontWeight: 800, cursor: 'pointer',
                    fontFamily: font, transition: 'opacity 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                >
                  Continue →
                </button>
              </div>
            )}

          </div>
        </div>
      </div>
    </>
  )
}
