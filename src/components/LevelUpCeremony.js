// LevelUpCeremony — full-screen level-up celebration (replaces LevelUpBanner)
'use client'

import { useEffect, useState } from 'react'

const PARTICLES = Array.from({ length: 12 }, (_, i) => ({
  id: i,
  angle: (i / 12) * 360,
  size: 6 + (i % 3) * 3,
  color: i % 3 === 0 ? '#0ef5c2' : i % 3 === 1 ? '#FFD700' : '#818CF8',
  delay: i * 0.08,
}))

export default function LevelUpCeremony({ data, onDismiss }) {
  const [phase, setPhase] = useState('in') // 'in' | 'orbiting' | 'done'
  const [btnVisible, setBtnVisible] = useState(false)

  useEffect(() => {
    if (!data) return
    const t1 = setTimeout(() => setPhase('orbiting'), 400)
    const t2 = setTimeout(() => setBtnVisible(true), 1200)
    const t3 = setTimeout(() => onDismiss?.(), 4500)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [data, onDismiss])

  if (!data) return null

  return (
    <div
      onClick={onDismiss}
      style={{
        position: 'fixed', inset: 0, zIndex: 9950,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(6,6,15,0.92)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        animation: 'levelDimIn 0.4s ease both',
        cursor: 'pointer',
        fontFamily: "'Plus Jakarta Sans','DM Sans',system-ui,sans-serif",
      }}
    >
      <style>{`
        @keyframes levelDimIn    { from{opacity:0} to{opacity:1} }
        @keyframes levelNumIn    { 0%{transform:scale(0);opacity:0} 55%{transform:scale(1.18);opacity:1} 75%{transform:scale(0.94)} 100%{transform:scale(1);opacity:1} }
        @keyframes orbitParticle { from{transform:rotate(var(--a)) translateX(70px) scale(1)} to{transform:rotate(calc(var(--a) + 360deg)) translateX(70px) scale(0.4)} }
        @keyframes titleFadeIn   { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes btnFadeIn     { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      {/* Old level fading out (shows briefly at top) */}
      <div style={{
        fontSize: 16, color: 'rgba(129,140,248,0.45)', fontWeight: 700, marginBottom: 20,
        letterSpacing: '1px',
      }}>
        LEVEL {data.fromLevel}
      </div>

      {/* Center: new level number with orbit particles */}
      <div style={{ position: 'relative', width: 160, height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>

        {/* Orbit particles */}
        {phase === 'orbiting' && PARTICLES.map(p => (
          <div key={p.id} style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{
              width: p.size, height: p.size, borderRadius: '50%',
              background: p.color,
              boxShadow: `0 0 ${p.size * 2}px ${p.color}`,
              animation: `orbitParticle 1.8s linear ${p.delay}s infinite`,
              '--a': `${p.angle}deg`,
            }}/>
          </div>
        ))}

        {/* Outer glow ring */}
        <div style={{
          position: 'absolute', inset: 0, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(129,140,248,0.20) 0%, transparent 70%)',
          animation: 'levelDimIn 0.6s ease both',
        }}/>

        {/* Level number */}
        <div style={{
          width: 110, height: 110, borderRadius: '50%',
          background: 'linear-gradient(135deg, #818CF8 0%, #6366F1 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 60px rgba(129,140,248,0.55), inset 0 1px 0 rgba(255,255,255,0.35)',
          animation: 'levelNumIn 0.7s cubic-bezier(0.34,1.56,0.64,1) both',
          zIndex: 2,
        }}>
          <span style={{
            fontSize: 52, fontWeight: 900, color: '#fff',
            fontFamily: "'JetBrains Mono','Fira Code',monospace",
            letterSpacing: '-2px',
            textShadow: '0 2px 12px rgba(0,0,0,0.30)',
          }}>
            {data.toLevel}
          </span>
        </div>
      </div>

      {/* Level title */}
      <div style={{
        fontSize: 28, fontWeight: 900, color: '#f0f8f4',
        letterSpacing: '-0.5px', marginBottom: 8,
        animation: 'titleFadeIn 0.5s ease 0.5s both',
      }}>
        {data.title}
      </div>

      <div style={{
        fontSize: 15, color: '#475569', fontWeight: 600, marginBottom: 40,
        animation: 'titleFadeIn 0.5s ease 0.7s both',
      }}>
        You reached Level {data.toLevel}
      </div>

      {/* Continue button */}
      {btnVisible && (
        <button
          onClick={(e) => { e.stopPropagation(); onDismiss?.() }}
          style={{
            padding: '14px 40px',
            background: 'linear-gradient(135deg, #818CF8, #6366F1)',
            border: 'none', borderRadius: 16, color: '#fff',
            fontSize: 16, fontWeight: 800, cursor: 'pointer',
            fontFamily: "'Plus Jakarta Sans','DM Sans',system-ui,sans-serif",
            boxShadow: '0 0 32px rgba(129,140,248,0.45), inset 0 1px 0 rgba(255,255,255,0.35)',
            animation: 'btnFadeIn 0.4s ease both',
          }}
        >
          Continue
        </button>
      )}
    </div>
  )
}
