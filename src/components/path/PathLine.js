'use client'

import { memo, useMemo } from 'react'
import { motion } from 'framer-motion'

function rgba(hex, alpha) {
  if (!hex?.startsWith('#')) return `rgba(255,255,255,${alpha})`
  const raw = hex.replace('#', '')
  const value = raw.length === 3
    ? raw.split('').map((ch) => ch + ch).join('')
    : raw
  const int = Number.parseInt(value, 16)
  const r = (int >> 16) & 255
  const g = (int >> 8) & 255
  const b = int & 255
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function sanitizeId(id) {
  return String(id).replace(/[^a-zA-Z0-9_-]/g, '')
}

function PathLineComponent({ segment, celebrating = false }) {
  const pathD = useMemo(
    () => `M ${segment.x1} ${segment.y1} Q ${segment.mx} ${segment.my} ${segment.x2} ${segment.y2}`,
    [segment.mx, segment.my, segment.x1, segment.x2, segment.y1, segment.y2],
  )

  const lineId = sanitizeId(segment.id)
  const gradientId = `path-gradient-${lineId}`
  const glowId = `path-glow-${lineId}`
  const isCompleted = segment.fromStatus === 'done'
  const isCurrentLead = segment.fromStatus === 'active' || segment.toStatus === 'active'
  const highlight = isCompleted || isCurrentLead
  const accent = segment.world?.accent || '#22D3A5'
  const dark = segment.world?.dark || '#0d7a5f'
  const glow = segment.world?.glow || 'rgba(34,211,165,0.4)'

  return (
    <>
      <defs>
        <linearGradient id={gradientId} x1={segment.x1} y1={segment.y1} x2={segment.x2} y2={segment.y2} gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={isCurrentLead ? '#f8fafc' : accent} stopOpacity={isCompleted ? 1 : 0.9}/>
          <stop offset="55%" stopColor={accent} stopOpacity="0.95"/>
          <stop offset="100%" stopColor={dark} stopOpacity={isCompleted ? 0.9 : 0.75}/>
        </linearGradient>
        <filter id={glowId} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation={highlight ? 4 : 2.2} result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <path
        d={pathD}
        fill="none"
        stroke={highlight ? rgba(accent, 0.16) : 'rgba(255,255,255,0.06)'}
        strokeWidth={highlight ? 8 : 4}
        strokeLinecap="round"
        strokeDasharray={highlight ? 'none' : '10 10'}
        opacity={highlight ? 0.55 : 0.8}
      />

      <motion.path
        d={pathD}
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth={highlight ? (isCompleted ? 5.5 : 4.5) : 3}
        strokeLinecap="round"
        strokeDasharray={highlight ? 'none' : '12 14'}
        style={{ filter: `url(#${glowId})` }}
        initial={false}
        animate={{
          opacity: highlight ? 1 : 0.2,
          pathLength: highlight ? 1 : 0.28,
        }}
        transition={{
          duration: celebrating ? 0.9 : 0.65,
          ease: [0.22, 1, 0.36, 1],
        }}
      />

      {isCurrentLead && !isCompleted && (
        <motion.path
          d={pathD}
          fill="none"
          stroke="#ffffff"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="0.01 0.18"
          initial={{ pathOffset: 1 }}
          animate={{ pathOffset: 0 }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'linear' }}
          opacity="0.9"
        />
      )}

      {celebrating && (
        <motion.path
          d={pathD}
          fill="none"
          stroke={rgba(accent, 0.7)}
          strokeWidth="9"
          strokeLinecap="round"
          initial={{ pathLength: 0.12, opacity: 0.95 }}
          animate={{ pathLength: 1, opacity: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          style={{ filter: `drop-shadow(0 0 18px ${glow})` }}
        />
      )}
    </>
  )
}

const PathLine = memo(PathLineComponent)

export default PathLine
