// HeartBar — displays the current heart cap in the top bar with crack animation on loss
'use client'

import { useEffect, useRef, useState } from 'react'
import { HEARTS_MAX } from '@/lib/tokens'

function HeartSvg({ filled, cracking, sz = 18 }) {
  return (
    <svg
      className={filled && !cracking ? 'heart-idle' : undefined}
      width={sz} height={sz} viewBox="0 0 24 24" fill="none"
      style={{
        transition: 'filter 0.2s',
        filter: filled ? 'drop-shadow(0 0 4px rgba(239,80,96,0.55))' : 'none',
        animation: cracking ? 'crackRedFade 0.4s ease forwards' : 'none',
      }}
    >
      <path
        d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
        fill={filled ? '#ef5060' : 'rgba(255,255,255,0.12)'}
        stroke={filled ? 'rgba(239,80,96,0.60)' : 'rgba(255,255,255,0.15)'}
        strokeWidth="0.5"
      />
    </svg>
  )
}

export default function HeartBar({ hearts = HEARTS_MAX, prevHearts = null, maxHearts = HEARTS_MAX }) {
  const [crackingIndex, setCrackingIndex] = useState(null)
  const prevRef = useRef(hearts)

  useEffect(() => {
    if (prevHearts !== null && prevHearts > hearts) {
      // A heart was lost — crack the one that just disappeared
      const lostIndex = hearts // hearts is now lower; the lost heart was at index `hearts`
      const start = setTimeout(() => setCrackingIndex(lostIndex), 0)
      const end = setTimeout(() => setCrackingIndex(null), 500)
      return () => { clearTimeout(start); clearTimeout(end) }
    }
    prevRef.current = hearts
  }, [hearts, prevHearts])

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 3, minHeight: 20 }}>
      {Array.from({ length: maxHearts }, (_, i) => {
        const isFilled   = i < hearts
        const isCracking = i === crackingIndex
        return (
          <div key={i} style={{ position: 'relative', minWidth: 16, minHeight: 16 }}>
            <HeartSvg filled={isFilled || isCracking} cracking={isCracking} sz={16} />
          </div>
        )
      })}
    </div>
  )
}
