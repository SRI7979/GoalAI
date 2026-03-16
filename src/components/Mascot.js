// PathAI Mascot — teal compass/bolt character, 4 poses
'use client'

import { useState, useEffect } from 'react'

// Mascot poses as SVG path data
// All are 48x48 viewBox, teal-filled bolt/compass style character

function MascotDefault() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
      {/* Body: rounded diamond/compass shape */}
      <path d="M24 4 L38 18 L24 44 L10 18 Z" fill="rgba(14,245,194,0.15)" stroke="#0ef5c2" strokeWidth="2" strokeLinejoin="round"/>
      {/* Inner bolt */}
      <path d="M27 10 L19 24 L24 24 L21 38 L29 22 L24 22 Z" fill="#0ef5c2"/>
      {/* Eyes */}
      <circle cx="19" cy="18" r="2.5" fill="#0ef5c2"/>
      <circle cx="29" cy="18" r="2.5" fill="#0ef5c2"/>
      <circle cx="20" cy="17" r="1" fill="#06060f"/>
      <circle cx="30" cy="17" r="1" fill="#06060f"/>
    </svg>
  )
}

function MascotCelebrate() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
      {/* Body bounced up */}
      <path d="M24 2 L40 17 L24 42 L8 17 Z" fill="rgba(14,245,194,0.20)" stroke="#0ef5c2" strokeWidth="2.5" strokeLinejoin="round"/>
      {/* Big inner bolt */}
      <path d="M27 8 L18 23 L24 23 L20 38 L30 21 L24 21 Z" fill="#0ef5c2"/>
      {/* Happy wide eyes */}
      <ellipse cx="18" cy="17" rx="3" ry="2.5" fill="#0ef5c2"/>
      <ellipse cx="30" cy="17" rx="3" ry="2.5" fill="#0ef5c2"/>
      <circle cx="18.5" cy="16.5" r="1.2" fill="#06060f"/>
      <circle cx="30.5" cy="16.5" r="1.2" fill="#06060f"/>
      {/* Star sparkles */}
      <path d="M6 8 L7 6 L8 8 L10 7 L8 9 L10 10 L8 9 L7 11 L6 9 L4 10 L6 9 L4 8 Z" fill="#FFD700" opacity="0.85"/>
      <path d="M38 6 L39 4 L40 6 L42 5 L40 7 L42 8 L40 7 L39 9 L38 7 L36 8 L38 7 L36 6 Z" fill="#FFD700" opacity="0.85"/>
      <circle cx="42" cy="14" r="2" fill="#FFD700" opacity="0.7"/>
      <circle cx="6" cy="15" r="1.5" fill="#0ef5c2" opacity="0.7"/>
    </svg>
  )
}

function MascotSad() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
      {/* Body drooped */}
      <path d="M24 8 L36 20 L24 46 L12 20 Z" fill="rgba(239,80,96,0.10)" stroke="rgba(14,245,194,0.50)" strokeWidth="2" strokeLinejoin="round" strokeDasharray="4 2"/>
      {/* Dim bolt */}
      <path d="M26 14 L20 26 L24 26 L22 40 L28 24 L24 24 Z" fill="rgba(14,245,194,0.45)"/>
      {/* Sad downcast eyes */}
      <ellipse cx="19" cy="20" rx="2.5" ry="2" fill="rgba(14,245,194,0.60)"/>
      <ellipse cx="29" cy="20" rx="2.5" ry="2" fill="rgba(14,245,194,0.60)"/>
      <circle cx="20" cy="20.5" r="1" fill="#06060f"/>
      <circle cx="30" cy="20.5" r="1" fill="#06060f"/>
      {/* Teardrop */}
      <ellipse cx="20" cy="25" rx="1.5" ry="2" fill="#00d4ff" opacity="0.6"/>
      {/* Frown */}
      <path d="M19 29 Q24 26 29 29" stroke="rgba(14,245,194,0.50)" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
    </svg>
  )
}

function MascotWave() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
      {/* Body tilted slightly */}
      <path d="M25 4 L40 18 L25 44 L10 18 Z" fill="rgba(14,245,194,0.15)" stroke="#0ef5c2" strokeWidth="2" strokeLinejoin="round"/>
      {/* Bolt */}
      <path d="M28 10 L20 24 L25 24 L22 38 L30 22 L25 22 Z" fill="#0ef5c2"/>
      {/* Eyes */}
      <circle cx="20" cy="18" r="2.5" fill="#0ef5c2"/>
      <circle cx="30" cy="18" r="2.5" fill="#0ef5c2"/>
      <circle cx="21" cy="17" r="1" fill="#06060f"/>
      <circle cx="31" cy="17" r="1" fill="#06060f"/>
      {/* Wave hand */}
      <path d="M40 10 C38 6, 44 6, 44 10 C44 14, 38 14, 38 10" fill="rgba(14,245,194,0.15)" stroke="#0ef5c2" strokeWidth="1.5"/>
      <line x1="42" y1="10" x2="42" y2="18" stroke="#0ef5c2" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )
}

const POSES = { default: MascotDefault, celebrate: MascotCelebrate, sad: MascotSad, wave: MascotWave }

export default function Mascot({ pose = 'default', message = null, size = 48, animate = true }) {
  const [visible, setVisible] = useState(false)
  const PoseSvg = POSES[pose] || POSES.default

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 50)
    return () => clearTimeout(t)
  }, [])

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
      opacity: visible ? 1 : 0,
      transition: 'opacity 0.3s ease',
    }}>
      <div style={{
        width: size, height: size,
        animation: animate && pose === 'celebrate' ? 'float 1.8s ease-in-out infinite' :
                   animate && pose === 'wave'      ? 'float 2.2s ease-in-out infinite' :
                   animate                          ? 'nodeBreath 3s ease-in-out infinite' : 'none',
        filter: pose === 'celebrate' ? 'drop-shadow(0 0 12px rgba(14,245,194,0.55))' : 'none',
      }}>
        <PoseSvg />
      </div>

      {message && (
        <div style={{
          position: 'relative',
          background: 'rgba(14,245,194,0.10)',
          border: '1px solid rgba(14,245,194,0.28)',
          borderRadius: 14,
          padding: '8px 14px',
          maxWidth: 220,
          animation: 'fadeUp 0.35s ease both',
        }}>
          {/* Speech bubble tail */}
          <div style={{
            position: 'absolute', top: -7, left: '50%', transform: 'translateX(-50%)',
            width: 0, height: 0,
            borderLeft: '7px solid transparent',
            borderRight: '7px solid transparent',
            borderBottom: '7px solid rgba(14,245,194,0.28)',
          }}/>
          <p style={{
            color: '#0ef5c2', fontSize: 13, fontWeight: 600, lineHeight: 1.4, textAlign: 'center',
            fontFamily: "'Plus Jakarta Sans','DM Sans',system-ui,sans-serif",
            margin: 0,
          }}>
            {message}
          </p>
        </div>
      )}
    </div>
  )
}
