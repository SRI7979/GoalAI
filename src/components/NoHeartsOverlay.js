// NoHeartsOverlay — full-screen gate when user has 0 hearts
'use client'

import { useEffect, useState } from 'react'
import Mascot from './Mascot'

function formatTime(ms) {
  if (ms <= 0) return '0:00'
  const totalSec = Math.ceil(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
  return `${m}:${String(s).padStart(2,'0')}`
}

export default function NoHeartsOverlay({ refillAt, onClose, onPractice }) {
  const [remaining, setRemaining] = useState(0)

  useEffect(() => {
    function tick() {
      if (!refillAt) { setRemaining(0); return }
      const diff = new Date(refillAt).getTime() - Date.now()
      setRemaining(Math.max(0, diff))
    }
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [refillAt])

  const refillTime = formatTime(remaining)
  const autoRefill = remaining <= 0

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9900,
      background: 'rgba(6,6,15,0.90)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: 24,
      fontFamily: "'Plus Jakarta Sans','DM Sans',system-ui,sans-serif",
      animation: 'fadeUp 0.3s ease both',
    }}>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}`}</style>

      <Mascot pose="sad" message="You're out of hearts!" animate={false} />

      <div style={{ marginTop: 28, textAlign: 'center' }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#f0f8f4', marginBottom: 8 }}>
          No hearts remaining
        </div>
        <p style={{ fontSize: 14, color: '#475569', lineHeight: 1.6, maxWidth: 300, margin: '0 auto 24px' }}>
          {autoRefill
            ? 'Your hearts have refilled! You\'re ready to continue.'
            : 'Hearts refill automatically in a few hours — or earn them back right now by practicing.'}
        </p>

        {!autoRefill && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 24,
            padding: '12px 24px',
            background: 'rgba(239,80,96,0.08)', border: '1px solid rgba(239,80,96,0.22)',
            borderRadius: 16,
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef5060" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
            <div>
              <div style={{ fontSize: 11, color: '#ef5060', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>Refills in</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: '#ef5060', fontFamily: "'JetBrains Mono',monospace", letterSpacing: '-1px' }}>
                {refillTime}
              </div>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 300, margin: '0 auto' }}>
          {autoRefill ? (
            <button onClick={onClose} style={{
              padding: '14px', borderRadius: 16, border: 'none',
              background: 'linear-gradient(135deg, #0ef5c2, #00d4ff)',
              color: '#06060f', fontSize: 15, fontWeight: 800, cursor: 'pointer',
              fontFamily: 'inherit',
              boxShadow: '0 0 28px rgba(14,245,194,0.35)',
            }}>
              Continue Learning ✓
            </button>
          ) : (
            <>
              <button onClick={onPractice} style={{
                padding: '14px', borderRadius: 16, border: 'none',
                background: 'linear-gradient(135deg, #0ef5c2, #00d4ff)',
                color: '#06060f', fontSize: 15, fontWeight: 800, cursor: 'pointer',
                fontFamily: 'inherit',
                boxShadow: '0 0 28px rgba(14,245,194,0.35)',
              }}>
                Practice to Earn Hearts ❤️
              </button>
              <button onClick={onClose} style={{
                padding: '12px', borderRadius: 16,
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                color: '#475569', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                fontFamily: 'inherit',
              }}>
                Go back
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
