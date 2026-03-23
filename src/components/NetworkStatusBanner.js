'use client'

import { useEffect, useState } from 'react'
import IconGlyph from '@/components/IconGlyph'

export default function NetworkStatusBanner() {
  const [offline, setOffline] = useState(false)

  useEffect(() => {
    const sync = () => setOffline(typeof navigator !== 'undefined' ? !navigator.onLine : false)
    sync()
    window.addEventListener('online', sync)
    window.addEventListener('offline', sync)
    return () => {
      window.removeEventListener('online', sync)
      window.removeEventListener('offline', sync)
    }
  }, [])

  if (!offline) return null

  return (
    <div
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        padding: '10px 16px',
        background: 'rgba(245,158,11,0.12)',
        borderBottom: '1px solid rgba(245,158,11,0.22)',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
      }}
    >
      <div
        style={{
          maxWidth: 980,
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          color: '#FBBF24',
          fontSize: 13,
          fontWeight: 700,
        }}
      >
        <IconGlyph name="alert" size={16} strokeWidth={2.3} color="#FBBF24"/>
        You appear to be offline. Your progress will sync when you&apos;re back online.
      </div>
    </div>
  )
}

