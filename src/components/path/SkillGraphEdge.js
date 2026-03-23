'use client'

import { memo } from 'react'
import { motion, useReducedMotion } from 'framer-motion'

function rgba(hex, alpha) {
  if (!hex?.startsWith('#')) return `rgba(255,255,255,${alpha})`
  const raw = hex.replace('#', '')
  const value = raw.length === 3
    ? raw.split('').map((char) => char + char).join('')
    : raw
  const parsed = Number.parseInt(value, 16)
  const r = (parsed >> 16) & 255
  const g = (parsed >> 8) & 255
  const b = parsed & 255
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function SkillGraphEdgeComponent({ edge, accent = '#22D3A5', active = '#22D3EE' }) {
  const prefersReducedMotion = useReducedMotion()
  const path = `M ${edge.x1} ${edge.y1} Q ${edge.mx} ${edge.my} ${edge.x2} ${edge.y2}`

  let stroke = 'rgba(148,163,184,0.24)'
  let glow = 'rgba(148,163,184,0.08)'
  let dash = '10 12'
  let width = 3

  if (edge.variant === 'completed') {
    stroke = accent
    glow = rgba(accent, 0.24)
    dash = 'none'
    width = 4
  }

  if (edge.variant === 'current') {
    stroke = active
    glow = rgba(active, 0.36)
    dash = '10 8'
    width = 4
  }

  if (edge.variant === 'review') {
    stroke = '#F97316'
    glow = 'rgba(249,115,22,0.22)'
    dash = '7 7'
    width = 3.5
  }

  return (
    <>
      <path
        d={path}
        fill="none"
        stroke={rgba(stroke, edge.variant === 'locked' ? 0.28 : 0.12)}
        strokeWidth={width + 5}
        strokeLinecap="round"
      />

      <motion.path
        d={path}
        fill="none"
        stroke={stroke}
        strokeWidth={width}
        strokeLinecap="round"
        strokeDasharray={dash}
        initial={false}
        animate={{
          opacity: edge.variant === 'locked' ? 0.42 : 1,
          strokeDashoffset: edge.variant === 'current' && !prefersReducedMotion ? -36 : 0,
        }}
        transition={{
          duration: edge.variant === 'current' && !prefersReducedMotion ? 2 : 0.35,
          repeat: edge.variant === 'current' && !prefersReducedMotion ? Infinity : 0,
          ease: edge.variant === 'current' ? 'linear' : [0.22, 1, 0.36, 1],
        }}
        style={{
          filter: `drop-shadow(0 0 10px ${glow})`,
        }}
      />
    </>
  )
}

const SkillGraphEdge = memo(SkillGraphEdgeComponent)

export default SkillGraphEdge
