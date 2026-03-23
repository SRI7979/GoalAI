'use client'
import { useState } from 'react'

const font = "'Plus Jakarta Sans','DM Sans',system-ui,sans-serif"

const pseudoRandom = (seed) => {
  const value = Math.sin(seed * 9973.13) * 10000
  return value - Math.floor(value)
}

function Particle({ index, total }) {
  const angle = (index / total) * 360
  const dist  = 60 + pseudoRandom(index + 1) * 40
  const size  = 4 + pseudoRandom(index + 11) * 4
  const hue   = 35 + pseudoRandom(index + 21) * 25
  const delay = pseudoRandom(index + 31) * 0.15
  const lightness = 55 + pseudoRandom(index + 41) * 15

  return (
    <div style={{
      position:'absolute',
      width:size, height:size,
      borderRadius: index % 3 === 0 ? '50%' : '2px',
      background:`hsl(${hue}, 100%, ${lightness}%)`,
      left:'50%', top:'50%',
      animation:`chestParticle 0.8s ${delay}s ease-out forwards`,
      '--angle': `${angle}deg`,
      '--dist': `${dist}px`,
      opacity:0,
      boxShadow:`0 0 6px hsl(${hue}, 100%, 60%)`,
    }}/>
  )
}

export default function TreasureChest({ reward, onClaim }) {
  const [phase, setPhase] = useState('intro') // intro → opened → claimed
  const particles = phase === 'opened' ? Array.from({ length: 16 }, (_, i) => i) : []

  if (!reward) return null

  const rewardIcon = reward.type === 'gems'
    ? (
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
        <path d="M6 3L2 9l10 12L22 9l-4-6H6z" fill="#0ef5c2" opacity="0.9"/>
        <path d="M12 3l-2 6h4l-2-6z" fill="#fff" opacity="0.3"/>
        <path d="M6 3L2 9l10 12L22 9l-4-6H6z" stroke="#0ef5c2" strokeWidth="1.5" fill="none"/>
      </svg>
    )
    : reward.type === 'streakFreeze'
    ? (
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#60A5FA" strokeWidth="2" strokeLinecap="round">
        <path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7z"/>
        <path d="M12 6v4M10 8h4" stroke="#fff" strokeWidth="1.5"/>
      </svg>
    )
    : (
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#FBBF24" strokeWidth="2.5" strokeLinecap="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
      </svg>
    )

  return (
    <>
      <style>{`
        @keyframes chestBackdrop{from{opacity:0}to{opacity:1}}
        @keyframes chestBounceIn{
          0%{transform:translateY(80px) scale(0.6);opacity:0}
          60%{transform:translateY(-10px) scale(1.05);opacity:1}
          100%{transform:translateY(0) scale(1);opacity:1}
        }
        @keyframes chestLidOpen{
          0%{transform:rotateX(0deg)}
          58%{transform:rotateX(-102deg)}
          72%{transform:rotateX(-94deg)}
          100%{transform:rotateX(-120deg)}
        }
        @keyframes chestParticle{
          0%{opacity:1;transform:translate(-50%,-50%) rotate(var(--angle)) translateY(0)}
          100%{opacity:0;transform:translate(-50%,-50%) rotate(var(--angle)) translateY(calc(var(--dist) * -1))}
        }
        @keyframes chestRewardRise{
          0%{opacity:0;transform:translateY(20px) scale(0.5)}
          60%{transform:translateY(-8px) scale(1.1)}
          100%{opacity:1;transform:translateY(0) scale(1)}
        }
        @keyframes chestGlow{
          0%,100%{box-shadow:0 0 30px rgba(255,215,0,0.30)}
          50%{box-shadow:0 0 60px rgba(255,215,0,0.60)}
        }
        @keyframes chestShimmer{
          0%{background-position:200% center}
          100%{background-position:-200% center}
        }
        @media(prefers-reduced-motion:reduce){
          @keyframes chestBounceIn{from{opacity:0}to{opacity:1}}
          @keyframes chestLidOpen{to{}}
          @keyframes chestParticle{to{opacity:0}}
          @keyframes chestRewardRise{from{opacity:0}to{opacity:1}}
          @keyframes chestGlow{to{}}
        }
      `}</style>

      {/* Backdrop */}
      <div style={{
        position:'fixed',inset:0,zIndex:400,
        background:'rgba(0,0,0,0.82)',backdropFilter:'blur(16px)',WebkitBackdropFilter:'blur(16px)',
        animation:'chestBackdrop 0.3s ease both',
        display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',
        fontFamily:font,
      }}>

        {/* Chest */}
        <div style={{
          position:'relative',
          animation:'chestBounceIn 0.5s cubic-bezier(0.34,1.56,0.64,1) both',
          marginBottom:32,
        }}>
          {/* Particles */}
          {phase === 'opened' && (
            <div style={{position:'absolute',left:'50%',top:'50%',pointerEvents:'none'}}>
              {particles.map(i => <Particle key={i} index={i} total={16}/>)}
            </div>
          )}

          {/* Chest body */}
          <div style={{
            width:80, height:80,
            borderRadius:18,
            background:'linear-gradient(135deg,#B45309,#D97706)',
            border:'3px solid #F59E0B',
            display:'flex',alignItems:'center',justifyContent:'center',
            position:'relative',overflow:'visible',
            animation: phase === 'opened' ? 'chestGlow 1.5s ease-in-out infinite' : 'none',
            cursor: phase === 'intro' ? 'pointer' : 'default',
          }}
          onClick={() => phase === 'intro' && setPhase('opened')}>
            {/* Lid */}
            <div style={{
              position:'absolute',top:-6,left:-3,right:-3,height:28,
              background:'linear-gradient(135deg,#D97706,#F59E0B)',
              borderRadius:'10px 10px 4px 4px',
              border:'2px solid #FBBF24',
              transformOrigin:'top center',
              animation: phase === 'opened' ? 'chestLidOpen 0.4s 0.1s ease-out forwards' : 'none',
              display:'flex',alignItems:'center',justifyContent:'center',
            }}>
              {/* Lock/clasp */}
              <div style={{
                width:12,height:12,borderRadius:'50%',
                background:'#FBBF24',border:'2px solid #F59E0B',
              }}/>
            </div>
            {/* Inner glow when opened */}
            {phase === 'opened' && (
              <div style={{
                width:30,height:30,borderRadius:'50%',
                background:'radial-gradient(circle,rgba(255,215,0,0.60),transparent)',
                animation:'chestGlow 1s ease-in-out infinite',
              }}/>
            )}
          </div>
        </div>

        {/* Text */}
        {phase === 'intro' && (
          <div style={{textAlign:'center',animation:'chestBounceIn 0.5s 0.2s cubic-bezier(0.34,1.56,0.64,1) both'}}>
            <div style={{fontSize:20,fontWeight:800,color:'#F1F5F9',marginBottom:8}}>
              Reward cache unlocked
            </div>
            <button onClick={() => setPhase('opened')} style={{
              padding:'12px 28px',
              background:'linear-gradient(135deg,#D97706,#F59E0B)',
              border:'none',borderRadius:14,
              color:'#06060f',fontSize:15,fontWeight:800,
              cursor:'pointer',fontFamily:font,
              boxShadow:'0 0 24px rgba(245,158,11,0.35)',
              backgroundSize:'200% auto',
              animation:'chestShimmer 2s linear infinite',
              backgroundImage:'linear-gradient(90deg,#D97706,#F59E0B,#FBBF24,#F59E0B,#D97706)',
            }}>
              Open reward
            </button>
          </div>
        )}

        {/* Reward reveal */}
        {phase === 'opened' && (
          <div style={{
            textAlign:'center',
            animation:'chestRewardRise 0.5s 0.4s cubic-bezier(0.34,1.56,0.64,1) both',
          }}>
            <div style={{marginBottom:12}}>{rewardIcon}</div>
            <div style={{fontSize:22,fontWeight:900,color:'#FFD700',marginBottom:6}}>
              {reward.label}
            </div>
            <div style={{fontSize:13,color:'#94A3B8',marginBottom:24}}>
              {reward.type === 'gems' ? 'Added to your gem balance'
               : reward.type === 'streakFreeze' ? 'Streak freeze added to inventory'
               : '2x XP activated for 15 minutes'}
            </div>
            <button onClick={() => { setPhase('claimed'); onClaim(reward) }} style={{
              padding:'14px 36px',
              background:'linear-gradient(135deg,#0ef5c2,#00d4ff)',
              border:'none',borderRadius:14,
              color:'#06060f',fontSize:16,fontWeight:800,
              cursor:'pointer',fontFamily:font,
              boxShadow:'0 0 32px rgba(14,245,194,0.28)',
            }}>
              Claim
            </button>
          </div>
        )}
      </div>
    </>
  )
}
