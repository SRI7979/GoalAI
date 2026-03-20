'use client'

import { useEffect, useState, useRef } from 'react'

// ─── Confetti ─────────────────────────────────────────────────────────────────
const CONFETTI_COLORS = [
  '#0ef5c2', '#00d4ff', '#818CF8', '#FBBF24',
  '#FF6B35', '#F472B6', '#34D399', '#60A5FA',
]

function ConfettiParticle({ x, delay, duration, color, size, spin }) {
  return (
    <div style={{
      position: 'absolute',
      left:     `${x}%`,
      top:      '-24px',
      width:    size,
      height:   size,
      background: color,
      borderRadius: spin % 2 === 0 ? '50%' : '2px',
      animation:  `confettiFall ${duration}s ${delay}s ease-in both`,
      transform:  `rotate(${spin}deg)`,
      opacity:    0,
      boxShadow:  `0 0 4px ${color}80`,
    }} />
  )
}

function ConfettiLayer({ active }) {
  const [particles, setParticles] = useState([])

  useEffect(() => {
    if (!active) { setParticles([]); return }
    const ps = Array.from({ length: 48 }, (_, i) => ({
      id:       i,
      x:        Math.random() * 100,
      delay:    Math.random() * 0.9,
      duration: 1.8 + Math.random() * 1.2,
      color:    CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      size:     4 + Math.random() * 5,
      spin:     Math.floor(Math.random() * 360),
    }))
    setParticles(ps)
    const t = setTimeout(() => setParticles([]), 4500)
    return () => clearTimeout(t)
  }, [active])

  if (!particles.length) return null
  return (
    <div style={{
      position:      'fixed',
      inset:         0,
      pointerEvents: 'none',
      zIndex:        999,
      overflow:      'hidden',
    }}>
      {particles.map((p) => <ConfettiParticle key={p.id} {...p} />)}
    </div>
  )
}

// ─── XP Breakdown row ─────────────────────────────────────────────────────────
function XPRow({ label, xp, highlight }) {
  return (
    <div style={{
      display:        'flex',
      justifyContent: 'space-between',
      alignItems:     'center',
      padding:        '8px 0',
      borderTop:      '1px solid rgba(255,255,255,0.05)',
    }}>
      <span style={{ fontSize: 13, color: '#64748B' }}>{label}</span>
      <span style={{
        fontSize:   13,
        fontWeight: 700,
        color:      highlight ? '#FBBF24' : '#0ef5c2',
      }}>
        +{xp}
      </span>
    </div>
  )
}

// ─── Main overlay ─────────────────────────────────────────────────────────────
export default function MissionComplete({ isVisible, data, onDismiss, onStartTomorrow }) {
  // data: {
  //   conceptName, dayNumber,
  //   xpEarned, taskXp, missionBonusXp, streakBonusXp, gemsEarned,
  //   newStreak, levelUp: { fromLevel, toLevel, title } | null,
  //   tomorrowConcept, tomorrowDayNumber
  // }
  const dismissRef = useRef(onDismiss)
  useEffect(() => { dismissRef.current = onDismiss }, [onDismiss])

  // Keyboard dismiss
  useEffect(() => {
    if (!isVisible) return
    const handler = (e) => { if (e.key === 'Escape') dismissRef.current?.() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isVisible])

  if (!isVisible) return null

  const { conceptName, dayNumber, xpEarned = 0, taskXp = 0,
    missionBonusXp = 0, streakBonusXp = 0, gemsEarned = 0, newStreak = 0,
    levelUp = null, tomorrowConcept = null, tomorrowDayNumber = null } = data || {}

  const hasBreakdown = (missionBonusXp > 0 || streakBonusXp > 0) && xpEarned > 0

  return (
    <>
      {/* ── Keyframes (injected once) ── */}
      <style>{`
        @keyframes confettiFall {
          0%   { opacity: 1; transform: translateY(0)   rotate(0deg)   scaleX(1); }
          100% { opacity: 0; transform: translateY(110vh) rotate(720deg) scaleX(0.6); }
        }
        @keyframes mcBackdrop  { from { opacity: 0 } to { opacity: 1 } }
        @keyframes mcSlideUp   {
          from { transform: translateY(72px); opacity: 0 }
          to   { transform: translateY(0);    opacity: 1 }
        }
        @keyframes mcXpPop {
          0%   { transform: scale(0.5); opacity: 0 }
          65%  { transform: scale(1.08) }
          100% { transform: scale(1);   opacity: 1 }
        }
        @keyframes mcLevelGlow {
          0%, 100% { box-shadow: 0 0 24px rgba(129,140,248,0.40) }
          50%       { box-shadow: 0 0 48px rgba(129,140,248,0.70) }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes confettiFall { 0% { opacity: 0 } 100% { opacity: 0 } }
          @keyframes mcSlideUp    { from { opacity: 0 } to { opacity: 1 } }
          @keyframes mcXpPop      { from { opacity: 0 } to { opacity: 1 } }
          @keyframes mcLevelGlow  { to {} }
        }
      `}</style>

      <ConfettiLayer active={isVisible} />

      {/* Backdrop */}
      <div
        onClick={onDismiss}
        role="button"
        tabIndex={-1}
        aria-label="Dismiss mission complete"
        style={{
          position:         'fixed',
          inset:            0,
          zIndex:           900,
          background:       'rgba(0,0,0,0.78)',
          backdropFilter:   'blur(18px)',
          WebkitBackdropFilter: 'blur(18px)',
          animation:        'mcBackdrop 0.30s ease',
          cursor:           'pointer',
        }}
      />

      {/* Card */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Mission complete"
        style={{
          position:  'fixed',
          bottom:    0,
          left:      0,
          right:     0,
          zIndex:    901,
          padding:   '0 16px env(safe-area-inset-bottom, 24px)',
          animation: 'mcSlideUp 0.40s cubic-bezier(0.34,1.3,0.64,1)',
        }}
      >
        <div style={{
          background:  'linear-gradient(180deg, rgba(15,23,42,0.99) 0%, rgba(6,6,15,1) 100%)',
          border:      '1px solid rgba(14,245,194,0.28)',
          borderRadius: 28,
          padding:     '0 24px 28px',
          boxShadow:   '0 -32px 80px rgba(14,245,194,0.10), inset 0 1px 0 rgba(14,245,194,0.24)',
          marginBottom: 8,
        }}>
          {/* Handle */}
          <div style={{ display: 'flex', justifyContent: 'center', padding: '16px 0 20px' }}>
            <div style={{ width: 40, height: 4, borderRadius: 9999, background: 'rgba(255,255,255,0.15)' }} />
          </div>

          {/* Trophy + heading */}
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{
              width:         64,
              height:        64,
              borderRadius:  '22%',
              background:    'linear-gradient(135deg, rgba(14,245,194,0.18), rgba(0,212,255,0.10))',
              border:        '1px solid rgba(14,245,194,0.32)',
              display:       'flex',
              alignItems:    'center',
              justifyContent:'center',
              margin:        '0 auto 16px',
              boxShadow:     '0 0 48px rgba(14,245,194,0.22)',
              fontSize:      28,
            }}>
              🎯
            </div>
            <div style={{
              fontSize:      11,
              fontWeight:    800,
              letterSpacing: '2px',
              color:         '#0ef5c2',
              textTransform: 'uppercase',
              marginBottom:  6,
            }}>
              Mission Complete
            </div>
            <h2 style={{
              fontSize:      22,
              fontWeight:    800,
              color:         '#F1F5F9',
              letterSpacing: '-0.4px',
              marginBottom:  4,
            }}>
              {conceptName || 'Day Complete'}
            </h2>
            <p style={{ color: '#64748B', fontSize: 13 }}>Day {dayNumber || '?'}</p>
          </div>

          {/* XP earned block */}
          <div style={{
            background:    'rgba(14,245,194,0.05)',
            border:        '1px solid rgba(14,245,194,0.14)',
            borderRadius:  18,
            padding:       '16px 18px',
            marginBottom:  12,
            animation:     'mcXpPop 0.50s 0.20s cubic-bezier(0.34,1.3,0.64,1) both',
          }}>
            <div style={{
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'space-between',
              marginBottom:   hasBreakdown ? 4 : 0,
            }}>
              <span style={{ fontSize: 13, color: '#94A3B8', fontWeight: 600 }}>XP Earned</span>
              <span style={{
                fontSize:      24,
                fontWeight:    900,
                color:         '#FBBF24',
                letterSpacing: '-0.5px',
              }}>
                +{xpEarned}
              </span>
            </div>
            {hasBreakdown && (
              <>
                <XPRow label="Tasks"          xp={taskXp} />
                {missionBonusXp > 0 && <XPRow label="Mission bonus"                    xp={missionBonusXp} highlight />}
                {streakBonusXp  > 0 && <XPRow label={`${newStreak}-day streak bonus`} xp={streakBonusXp}  highlight />}
              </>
            )}
          </div>

          {/* Gems earned */}
          {gemsEarned > 0 && (
            <div style={{
              background:    'rgba(14,245,194,0.05)',
              border:        '1px solid rgba(14,245,194,0.14)',
              borderRadius:  14,
              padding:       '11px 16px',
              marginBottom:  10,
              display:       'flex',
              alignItems:    'center',
              gap:           10,
              animation:     'mcXpPop 0.50s 0.35s cubic-bezier(0.34,1.3,0.64,1) both',
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M6 3L2 9l10 12L22 9l-4-6H6z" fill="#0ef5c2" opacity="0.85"/>
                <path d="M12 3l-2 6h4l-2-6z" fill="#fff" opacity="0.25"/>
                <path d="M6 3L2 9l10 12L22 9l-4-6H6z" stroke="#0ef5c2" strokeWidth="1.5" fill="none"/>
              </svg>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#0ef5c2' }}>
                  +{gemsEarned} Gems
                </div>
                <div style={{ fontSize: 12, color: '#64748B' }}>
                  Added to your balance
                </div>
              </div>
            </div>
          )}

          {/* Streak pill */}
          {newStreak > 0 && (
            <div style={{
              background:    'rgba(255,107,53,0.07)',
              border:        '1px solid rgba(255,107,53,0.18)',
              borderRadius:  14,
              padding:       '11px 16px',
              marginBottom:  10,
              display:       'flex',
              alignItems:    'center',
              gap:           12,
            }}>
              <span style={{ fontSize: 22 }}>🔥</span>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#FF6B35' }}>
                  {newStreak}-day streak
                </div>
                <div style={{ fontSize: 12, color: '#64748B' }}>
                  {streakBonusXp > 0
                    ? `+${streakBonusXp} XP streak bonus awarded`
                    : newStreak % 7 === 6
                      ? 'One more day for streak bonus!'
                      : 'Keep it going tomorrow'}
                </div>
              </div>
            </div>
          )}

          {/* Level up banner */}
          {levelUp && (
            <div style={{
              background:    'linear-gradient(135deg, rgba(129,140,248,0.12), rgba(99,102,241,0.06))',
              border:        '1px solid rgba(129,140,248,0.26)',
              borderRadius:  14,
              padding:       '11px 16px',
              marginBottom:  10,
              display:       'flex',
              alignItems:    'center',
              gap:           12,
            }}>
              <div style={{
                width:         40,
                height:        40,
                borderRadius:  '50%',
                background:    'linear-gradient(135deg, #818CF8, #6366F1)',
                display:       'flex',
                alignItems:    'center',
                justifyContent:'center',
                fontWeight:    900,
                fontSize:      16,
                color:         '#fff',
                flexShrink:    0,
                animation:     'mcLevelGlow 2s ease-in-out infinite',
              }}>
                {levelUp.toLevel}
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#818CF8' }}>
                  Level up — {levelUp.title}
                </div>
                <div style={{ fontSize: 12, color: '#64748B' }}>
                  Level {levelUp.fromLevel} → {levelUp.toLevel}
                </div>
              </div>
            </div>
          )}

          {/* CTAs */}
          {tomorrowConcept && onStartTomorrow ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* Primary: start tomorrow */}
              <button
                onClick={onStartTomorrow}
                style={{
                  width:        '100%',
                  padding:      '16px',
                  background:   'linear-gradient(135deg, #0ef5c2, #00d4ff)',
                  border:       'none',
                  borderRadius: 16,
                  color:        '#06060f',
                  fontSize:     16,
                  fontWeight:   800,
                  cursor:       'pointer',
                  fontFamily:   'inherit',
                  boxShadow:    '0 0 32px rgba(14,245,194,0.28), inset 0 1px 0 rgba(255,255,255,0.40)',
                  display:      'flex',
                  alignItems:   'center',
                  justifyContent: 'center',
                  gap:          10,
                  transition:   'opacity 0.15s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.92' }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
              >
                <span>
                  Start Day {tomorrowDayNumber ?? ''}: {tomorrowConcept}
                </span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke="#06060f" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="5" y1="12" x2="19" y2="12"/>
                  <polyline points="12 5 19 12 12 19"/>
                </svg>
              </button>

              {/* Secondary: dismiss */}
              <button
                onClick={onDismiss}
                style={{
                  width:        '100%',
                  padding:      '13px',
                  background:   'rgba(255,255,255,0.04)',
                  border:       '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 16,
                  color:        '#64748B',
                  fontSize:     14,
                  fontWeight:   600,
                  cursor:       'pointer',
                  fontFamily:   'inherit',
                  transition:   'opacity 0.15s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#94A3B8' }}
                onMouseLeave={(e) => { e.currentTarget.style.color = '#64748B' }}
              >
                I'll continue tomorrow
              </button>
            </div>
          ) : (
            <button
              onClick={onDismiss}
              style={{
                width:       '100%',
                padding:     '16px',
                background:  'linear-gradient(135deg, #0ef5c2, #00d4ff)',
                border:      'none',
                borderRadius: 16,
                color:       '#06060f',
                fontSize:    16,
                fontWeight:  800,
                cursor:      'pointer',
                fontFamily:  'inherit',
                boxShadow:   '0 0 32px rgba(14,245,194,0.28), inset 0 1px 0 rgba(255,255,255,0.40)',
                transition:  'opacity 0.15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.92' }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
            >
              Continue
            </button>
          )}
        </div>
      </div>
    </>
  )
}
