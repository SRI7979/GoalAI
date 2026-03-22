'use client'

// StreakFlame — 6-tier animated SVG flame that evolves with streak length
// Tiers: 0-6 (dim), 7-13 (bright), 14-29 (orange glow), 30-59 (particles),
//        60-99 (golden ring), 100+ (purple shimmer)

export default function StreakFlame({ streak = 0, size = 28 }) {
  if (streak <= 0) {
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
        <path d="M16 4c0 0-8 8-8 16a8 8 0 0016 0c0-8-8-16-8-16z"
          fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5"/>
      </svg>
    )
  }

  const tier = streak >= 100 ? 5 : streak >= 60 ? 4 : streak >= 30 ? 3 : streak >= 14 ? 2 : streak >= 7 ? 1 : 0

  const flameColors = [
    { outer: '#FF6B35', inner: '#FBBF24', glow: 'rgba(255,107,53,0.25)' },       // 0: dim single
    { outer: '#FF6B35', inner: '#FFD700', glow: 'rgba(255,107,53,0.40)' },       // 1: bright
    { outer: '#FF8C42', inner: '#FFD700', glow: 'rgba(255,140,66,0.50)' },       // 2: orange glow
    { outer: '#FF6B35', inner: '#FFD700', glow: 'rgba(255,107,53,0.60)' },       // 3: large + particles
    { outer: '#FFD700', inner: '#FFF7CC', glow: 'rgba(255,215,0,0.50)' },        // 4: golden
    { outer: '#A855F7', inner: '#E9D5FF', glow: 'rgba(168,85,247,0.50)' },       // 5: purple legendary
  ]

  const { outer, inner, glow } = flameColors[tier]

  return (
    <div style={{ position: 'relative', width: size, height: size, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
      {/* Glow ring for tier 4+ */}
      {tier >= 4 && (
        <div style={{
          position: 'absolute', inset: -3,
          borderRadius: '50%',
          border: `2px solid ${tier >= 5 ? 'rgba(168,85,247,0.40)' : 'rgba(255,215,0,0.35)'}`,
          animation: 'streakRingPulse 2s ease-in-out infinite',
        }}/>
      )}

      {/* Main flame SVG */}
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" style={{
        filter: `drop-shadow(0 0 ${tier >= 3 ? 8 : 4}px ${glow})`,
        animation: tier >= 1 ? 'flameFlicker 2s ease-in-out infinite' : 'none',
      }}>
        <defs>
          <linearGradient id={`flameGrad${tier}`} x1="16" y1="28" x2="16" y2="4" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor={inner}/>
            <stop offset="100%" stopColor={outer}/>
          </linearGradient>
          {tier >= 5 && (
            <linearGradient id="shimmerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#A855F7"/>
              <stop offset="50%" stopColor="#E9D5FF"/>
              <stop offset="100%" stopColor="#A855F7"/>
            </linearGradient>
          )}
        </defs>

        {/* Main flame */}
        <path d="M16 4c0 0-8 8-8 16a8 8 0 0016 0c0-8-8-16-8-16z"
          fill={`url(#flameGrad${tier})`} opacity={tier === 0 ? 0.7 : 1}/>

        {/* Inner core */}
        <path d="M16 14c0 0-4 4-4 8a4 4 0 008 0c0-4-4-8-4-8z"
          fill={inner} opacity={0.85}/>

        {/* Second flame for tier 1+ */}
        {tier >= 1 && (
          <path d="M12 8c0 0-5 6-5 13a5 5 0 0010 0c0-7-5-13-5-13z"
            fill={outer} opacity={0.35}/>
        )}

        {/* Third flame for tier 2+ */}
        {tier >= 2 && (
          <path d="M20 8c0 0 5 6 5 13a5 5 0 01-10 0c0-7 5-13 5-13z"
            fill={outer} opacity={0.25}/>
        )}
      </svg>

      {/* Particle dots for tier 3+ */}
      {tier >= 3 && (
        <>
          <div style={{ position: 'absolute', top: -2, left: '30%', width: 3, height: 3, borderRadius: '50%', background: inner, animation: 'particleFloat 1.5s ease-in-out infinite', opacity: 0.7 }}/>
          <div style={{ position: 'absolute', top: 0, right: '25%', width: 2, height: 2, borderRadius: '50%', background: outer, animation: 'particleFloat 2s ease-in-out infinite 0.5s', opacity: 0.6 }}/>
        </>
      )}

      <style>{`
        @keyframes flameFlicker {
          0%, 100% { transform: scaleY(1) scaleX(1); }
          25% { transform: scaleY(1.04) scaleX(0.97); }
          50% { transform: scaleY(0.97) scaleX(1.03); }
          75% { transform: scaleY(1.02) scaleX(0.98); }
        }
        @keyframes streakRingPulse {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.08); }
        }
        @keyframes particleFloat {
          0%, 100% { transform: translateY(0); opacity: 0.7; }
          50% { transform: translateY(-6px); opacity: 0.3; }
        }
      `}</style>
    </div>
  )
}
