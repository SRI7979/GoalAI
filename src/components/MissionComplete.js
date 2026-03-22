'use client'

import { useMemo } from 'react'

// ─── Confetti ─────────────────────────────────────────────────────────────────
const CONFETTI_COLORS = [
  '#0ef5c2', '#00d4ff', '#818CF8', '#FBBF24',
  '#FF6B35', '#F472B6', '#34D399', '#60A5FA',
]

const pseudoRandom = (seed) => {
  const x = Math.sin(seed * 9999) * 10000
  return x - Math.floor(x)
}

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
  const particles = useMemo(() => {
    if (!active) return []
    return Array.from({ length: 48 }, (_, i) => ({
      id:       i,
      x:        pseudoRandom(i + 1) * 100,
      delay:    pseudoRandom(i + 101) * 0.9,
      duration: 1.8 + pseudoRandom(i + 201) * 1.2,
      color:    CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      size:     4 + pseudoRandom(i + 301) * 5,
      spin:     Math.floor(pseudoRandom(i + 401) * 360),
    }))
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
export default function MissionComplete({ isVisible, data, onDoLater, onStartTomorrow, isStartingTomorrow = false }) {
  // data: {
  //   conceptName, dayNumber,
  //   xpEarned, taskXp, missionBonusXp, streakBonusXp, gemsEarned,
  //   newStreak, levelUp: { fromLevel, toLevel, title } | null,
  //   tomorrowConcept, tomorrowDayNumber
  // }
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
        @keyframes mcScaleIn   {
          from { transform: scale(0.92); opacity: 0 }
          to   { transform: scale(1);    opacity: 1 }
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
          @keyframes mcScaleIn    { from { opacity: 0 } to { opacity: 1 } }
          @keyframes mcXpPop      { from { opacity: 0 } to { opacity: 1 } }
          @keyframes mcLevelGlow  { to {} }
        }
      `}</style>

      <ConfettiLayer active={isVisible} />

      {/* Backdrop */}
      <div
        style={{
          position:         'fixed',
          inset:            0,
          zIndex:           900,
          background:       'rgba(0,0,0,0.78)',
          backdropFilter:   'blur(18px)',
          WebkitBackdropFilter: 'blur(18px)',
          animation:        'mcBackdrop 0.30s ease',
        }}
      />

      {/* Card */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Mission complete"
        style={{
          position:  'fixed',
          inset:     0,
          zIndex:    901,
          padding:   '24px 16px',
          display:   'flex',
          alignItems:'center',
          justifyContent:'center',
        }}
      >
        <div style={{
          background:  'linear-gradient(180deg, rgba(15,23,42,0.99) 0%, rgba(6,6,15,1) 100%)',
          border:      '1px solid rgba(14,245,194,0.28)',
          borderRadius: 28,
          padding:     '24px 24px 28px',
          boxShadow:   '0 32px 80px rgba(0,0,0,0.42), inset 0 1px 0 rgba(14,245,194,0.24)',
          width:       'min(100%, 460px)',
          maxHeight:   'min(90vh, 760px)',
          overflowY:   'auto',
          animation:   'mcScaleIn 0.28s cubic-bezier(0.34,1.3,0.64,1)',
        }}>
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
          {onStartTomorrow ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* Primary: start tomorrow */}
              <button
                onClick={onStartTomorrow}
                disabled={isStartingTomorrow}
                style={{
                  width:        '100%',
                  padding:      '16px',
                  background:   isStartingTomorrow ? 'rgba(14,245,194,0.10)' : 'linear-gradient(135deg, #0ef5c2, #00d4ff)',
                  border:       isStartingTomorrow ? '1px solid rgba(14,245,194,0.24)' : 'none',
                  borderRadius: 16,
                  color:        isStartingTomorrow ? '#0ef5c2' : '#06060f',
                  fontSize:     16,
                  fontWeight:   800,
                  cursor:       isStartingTomorrow ? 'default' : 'pointer',
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
                  {isStartingTomorrow
                    ? 'Loading next day...'
                    : tomorrowConcept
                    ? `Start Day ${tomorrowDayNumber ?? ''}: ${tomorrowConcept}`
                    : 'Start next day'}
                </span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke={isStartingTomorrow ? '#0ef5c2' : '#06060f'} strokeWidth="2.5" strokeLinecap="round">
                  <line x1="5" y1="12" x2="19" y2="12"/>
                  <polyline points="12 5 19 12 12 19"/>
                </svg>
              </button>

              {/* Secondary: do later */}
              <button
                onClick={onDoLater}
                disabled={isStartingTomorrow}
                style={{
                  width:        '100%',
                  padding:      '13px',
                  background:   'rgba(255,255,255,0.04)',
                  border:       '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 16,
                  color:        isStartingTomorrow ? 'rgba(100,116,139,0.55)' : '#64748B',
                  fontSize:     14,
                  fontWeight:   600,
                  cursor:       isStartingTomorrow ? 'default' : 'pointer',
                  fontFamily:   'inherit',
                  transition:   'opacity 0.15s',
                  opacity:      isStartingTomorrow ? 0.7 : 1,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#94A3B8' }}
                onMouseLeave={(e) => { e.currentTarget.style.color = '#64748B' }}
              >
                I&apos;ll do it later
              </button>
            </div>
          ) : (
            <button
              onClick={onDoLater}
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
              Close
            </button>
          )}
        </div>
      </div>
    </>
  )
}
