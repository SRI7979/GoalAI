'use client'
import { useState, useEffect, useRef } from 'react'
import AIAssistant from './AIAssistant'
import ConfidenceSelector from './ConfidenceSelector'

const font = "'Plus Jakarta Sans','DM Sans',system-ui,sans-serif"

function formatTime(seconds) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export default function ChallengeView({ task, goal, knowledge, onClose, onComplete }) {
  const [loading, setLoading] = useState(true)
  const [challenge, setChallenge] = useState(null)
  const [started, setStarted] = useState(false)
  const [timeLeft, setTimeLeft] = useState(0)
  const [hintIndex, setHintIndex] = useState(-1)
  const [showSolution, setShowSolution] = useState(false)
  const [timeUp, setTimeUp] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [assistantUsageCount, setAssistantUsageCount] = useState(0)
  const [confidenceLevel, setConfidenceLevel] = useState('')
  const timerRef = useRef(null)

  useEffect(() => {
    async function load() {
      const cacheKey = `pathai.challenge.v1::${task.id || task.title}`
      try {
        const cached = localStorage.getItem(cacheKey)
        if (cached) {
          const data = JSON.parse(cached)
          if (data.title) { setChallenge(data); setTimeLeft(data.timeLimit || 600); setLoading(false); return }
        }
      } catch {}
      try {
        const res = await fetch('/api/challenge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ concept: task._concept || task.title, taskTitle: task.title, goal, knowledge }),
        })
        const data = await res.json()
        if (data.title) {
          setChallenge(data); setTimeLeft(data.timeLimit || 600)
          try { localStorage.setItem(cacheKey, JSON.stringify(data)) } catch {}
        }
      } catch {}
      setLoading(false)
    }
    load()
  }, [task.id, task.title, goal, knowledge, task._concept])

  useEffect(() => {
    if (!started || timeUp) return
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(timerRef.current); setTimeUp(true); setShowSolution(true); return 0 }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [started, timeUp])

  const urgentColor = timeLeft < 60 ? '#FF453A' : timeLeft < 180 ? '#FBBF24' : '#F59E0B'
  const totalTime = challenge?.timeLimit || 600
  const timePct = (timeLeft / totalTime) * 100
  const elapsedSec = Math.max(0, totalTime - timeLeft)

  const DIFFICULTY_COLOR = { beginner: '#34D399', intermediate: '#F59E0B', advanced: '#FF453A' }

  const estimatedChallengeScore = (() => {
    let score = 78
    score -= Math.max(0, hintIndex + 1) * 10
    score -= assistantUsageCount * 8
    if (timeUp) score -= 18
    if (showSolution) score -= 14
    if (!showSolution && !timeUp && elapsedSec < totalTime * 0.8) score += 8
    return Math.max(25, Math.min(98, score))
  })()

  function handleComplete() {
    if (!confidenceLevel) return
    setCompleting(true)
    onComplete({
      hintsUsed: Math.max(0, hintIndex + 1),
      maxHints: challenge?.hints?.length || 3,
      assistantUsageCount,
      confidenceLevel,
      completionTimeSec: elapsedSec || totalTime,
      attempts: Math.max(1, (showSolution ? 2 : 1) + (timeUp ? 1 : 0)),
      challengeScore: estimatedChallengeScore,
    })
  }

  return (
    <>
      <style>{`
        @keyframes spin     { to{transform:rotate(360deg)} }
        @keyframes fadeIn   { from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)} }
        @keyframes urgentPulse { 0%,100%{opacity:1}50%{opacity:0.6} }
      `}</style>

      <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: '#06060f', fontFamily: font, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Top bar */}
        <div style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(6,6,15,0.90)', backdropFilter: 'blur(28px)' }}>
          <button onClick={onClose} style={{ width: 36, height: 36, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#8e8e93' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>

          {/* Timer */}
          {started && !timeUp && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ height: 5, width: 100, background: 'rgba(255,255,255,0.08)', borderRadius: 9999, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${timePct}%`, background: urgentColor, borderRadius: 9999, transition: 'width 1s linear, background 0.5s' }}/>
              </div>
              <span style={{ fontSize: 14, fontWeight: 800, color: urgentColor, fontVariantNumeric: 'tabular-nums', animation: timeLeft < 30 ? 'urgentPulse 0.6s ease infinite' : 'none' }}>
                {formatTime(timeLeft)}
              </span>
            </div>
          )}
          {timeUp && <span style={{ fontSize: 13, fontWeight: 700, color: '#FF453A' }}>Time's up</span>}

          <div style={{ padding: '4px 12px', background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 9999, fontSize: 11, fontWeight: 700, color: '#F59E0B', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Challenge
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 20px 140px' }}>
          <div style={{ maxWidth: 660, margin: '0 auto' }}>
            {loading ? (
              <div style={{ textAlign: 'center', paddingTop: 80 }}>
                <div style={{ width: 44, height: 44, border: '3px solid rgba(255,255,255,0.06)', borderTopColor: '#F59E0B', borderRadius: '50%', animation: 'spin 0.65s linear infinite', margin: '0 auto 20px' }}/>
                <p style={{ color: '#636366', fontSize: 14 }}>Generating challenge…</p>
                <p style={{ color: '#475569', fontSize: 12, marginTop: 8 }}>Crafting something that will test your skills</p>
              </div>
            ) : !challenge ? (
              <p style={{ color: '#636366', textAlign: 'center', paddingTop: 80 }}>Could not load challenge.</p>
            ) : !started ? (
              /* Pre-start screen */
              <div style={{ textAlign: 'center', paddingTop: 40, animation: 'fadeIn 0.3s ease both' }}>
                <div style={{ fontSize: 52, marginBottom: 20 }}>⏱️</div>
                <div style={{ marginBottom: 10 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: DIFFICULTY_COLOR[challenge.difficulty] || '#F59E0B', textTransform: 'uppercase', letterSpacing: '1px', padding: '3px 10px', background: `${DIFFICULTY_COLOR[challenge.difficulty] || '#F59E0B'}18`, border: `1px solid ${DIFFICULTY_COLOR[challenge.difficulty] || '#F59E0B'}30`, borderRadius: 9999 }}>
                    {challenge.difficulty}
                  </span>
                </div>
                <h1 style={{ fontSize: 24, fontWeight: 900, color: '#f5f5f7', marginBottom: 12, letterSpacing: '-0.4px' }}>{challenge.title}</h1>
                <p style={{ fontSize: 15, color: '#8e8e93', lineHeight: 1.6, marginBottom: 28, maxWidth: 420, margin: '0 auto 28px' }}>You'll have <strong style={{ color: '#F59E0B' }}>{formatTime(challenge.timeLimit)}</strong> to complete this challenge. The prompt will be revealed when you start.</p>
                <div style={{ padding: '14px 20px', background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.18)', borderRadius: 14, maxWidth: 360, margin: '0 auto', fontSize: 13, color: '#8e8e93', lineHeight: 1.6 }}>
                  💡 You'll have 3 hints available. Use the AI assistant for conceptual help — it won't give you the answer directly.
                </div>
              </div>
            ) : (
              /* Challenge in progress / done */
              <div style={{ animation: 'fadeIn 0.3s ease both' }}>
                <h2 style={{ fontSize: 22, fontWeight: 900, color: '#f5f5f7', marginBottom: 20, letterSpacing: '-0.4px' }}>{challenge.title}</h2>

                {/* Prompt */}
                <div style={{ padding: '20px 22px', background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.18)', borderRadius: 18, marginBottom: 24 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#F59E0B', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 12 }}>Your task</div>
                  <p style={{ fontSize: 15, color: '#f5f5f7', lineHeight: 1.7, margin: 0, whiteSpace: 'pre-wrap' }}>{challenge.prompt}</p>
                </div>

                {/* Hints */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#636366', marginBottom: 10 }}>
                    Hints ({Math.max(0, hintIndex + 1)}/{challenge.hints?.length || 0} used)
                  </div>
                  {challenge.hints?.slice(0, hintIndex + 1).map((hint, i) => (
                    <div key={i} style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, marginBottom: 8, fontSize: 13, color: '#8e8e93', lineHeight: 1.6 }}>
                      <span style={{ fontWeight: 700, color: '#636366' }}>Hint {i + 1}: </span>{hint}
                    </div>
                  ))}
                  {hintIndex < (challenge.hints?.length || 0) - 1 && !showSolution && (
                    <button onClick={() => setHintIndex(h => h + 1)} style={{ fontSize: 13, color: '#F59E0B', background: 'none', border: 'none', cursor: 'pointer', padding: '6px 0', fontFamily: font }}>
                      + Use next hint
                    </button>
                  )}
                </div>

                <ConfidenceSelector
                  value={confidenceLevel}
                  onChange={setConfidenceLevel}
                  accent="#F59E0B"
                  borderColor="rgba(245,158,11,0.24)"
                  background="rgba(245,158,11,0.05)"
                  label="How confident do you feel about handling a similar challenge?"
                />

                {/* Solution (after time up or requested) */}
                {showSolution && (
                  <div style={{ padding: '18px 20px', background: 'rgba(52,211,153,0.05)', border: '1px solid rgba(52,211,153,0.18)', borderRadius: 16, animation: 'fadeIn 0.3s ease both' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#34D399', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 12 }}>Solution</div>
                    <p style={{ fontSize: 14, color: '#8e8e93', lineHeight: 1.7, margin: 0, whiteSpace: 'pre-wrap' }}>{challenge.solution}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Bottom nav */}
        <div style={{ padding: '14px 20px 30px', borderTop: '1px solid rgba(255,255,255,0.08)', background: 'rgba(6,6,15,0.92)', backdropFilter: 'blur(28px)' }}>
          <div style={{ maxWidth: 660, margin: '0 auto', display: 'flex', gap: 12 }}>
            <button onClick={onClose} style={{ padding: '14px 24px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 16, color: '#8e8e93', fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: font }}>Back</button>
            {!started && challenge ? (
              <button onClick={() => setStarted(true)} style={{ flex: 1, padding: '14px', background: 'linear-gradient(135deg,#F59E0B,#FBBF24)', border: 'none', borderRadius: 16, color: '#06060f', fontSize: 16, fontWeight: 700, cursor: 'pointer', fontFamily: font }}>
                Start Challenge ⏱
              </button>
            ) : started ? (
              <div style={{ flex: 1, display: 'flex', gap: 10 }}>
                {!showSolution && !timeUp && (
                  <button onClick={() => { setShowSolution(true); clearInterval(timerRef.current) }} style={{ flex: 1, padding: '14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 16, color: '#636366', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: font }}>
                    Show Solution
                  </button>
                )}
                <button onClick={handleComplete} disabled={completing || !confidenceLevel} style={{
                  flex: 1, padding: '14px',
                  background: completing ? 'rgba(14,245,194,0.06)' : confidenceLevel ? 'linear-gradient(135deg,#0ef5c2,#00d4ff)' : 'rgba(255,255,255,0.04)',
                  border: completing ? '1px solid rgba(14,245,194,0.22)' : confidenceLevel ? 'none' : '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 16, color: completing ? '#0ef5c2' : confidenceLevel ? '#06060f' : '#636366',
                  fontSize: 16, fontWeight: 700, cursor: completing ? 'default' : 'pointer', fontFamily: font,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}>
                  {completing ? (
                    <><div style={{width:14,height:14,border:'2px solid rgba(14,245,194,0.2)',borderTopColor:'#0ef5c2',borderRadius:'50%',animation:'spin 0.65s linear infinite'}}/>Saving…</>
                  ) : confidenceLevel ? 'Complete ✓' : 'Choose confidence to continue'}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {started && (
        <AIAssistant
          concept={task._concept || task.title}
          goal={goal}
          mode={task._aiMode || 'challenge'}
          onAsk={() => setAssistantUsageCount((count) => count + 1)}
          context={`Challenge: ${challenge?.title}`}
        />
      )}
    </>
  )
}
