'use client'

import { memo } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import IconGlyph from '@/components/IconGlyph'

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

function getMasteryColor(node, accent) {
  if (node.status === 'locked') return '#475569'
  if (node.status === 'review_needed' || node.mastery < 45) return '#F97316'
  if (node.mastery < 70) return '#FACC15'
  if (node.mastery >= 90) return '#34D399'
  return accent
}

function getNodeSize(node) {
  if (node.isCurrent) return 74
  if (node.kind === 'project') return 64
  if (node.kind === 'boss') return 66
  return 58
}

function getStatusLabel(node) {
  if (node.isCurrent) return 'You are here'
  if (node.status === 'mastered') return 'Mastered'
  if (node.status === 'review_needed') return 'Needs review'
  if (node.status === 'in_progress') return 'In progress'
  if (node.status === 'available') return 'Ready now'
  return 'Locked'
}

function ProgressRing({ size, mastery, color }) {
  const radius = (size / 2) + 9
  const circumference = 2 * Math.PI * radius
  const progress = Math.max(0, Math.min(1, mastery / 100))

  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <svg
        viewBox={`0 0 ${(size + 24)} ${(size + 24)}`}
        style={{ width: size + 24, height: size + 24 }}
      >
        <circle
          cx={(size + 24) / 2}
          cy={(size + 24) / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="4"
        />
        <motion.circle
          cx={(size + 24) / 2}
          cy={(size + 24) / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="4.5"
          strokeLinecap="round"
          transform={`rotate(-90 ${(size + 24) / 2} ${(size + 24) / 2})`}
          initial={false}
          animate={{ strokeDashoffset: circumference * (1 - progress) }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          strokeDasharray={circumference}
        />
      </svg>
    </div>
  )
}

function SkillGraphNodeComponent({ node, world, onTap, nodeRef }) {
  const prefersReducedMotion = useReducedMotion()
  const size = getNodeSize(node)
  const accent = world?.accent || '#22D3A5'
  const masteryColor = getMasteryColor(node, accent)
  const isLocked = node.status === 'locked'
  const isProject = node.kind === 'project'
  const isBoss = node.kind === 'boss'
  const dimOpacity = node.muted ? 0.42 : 1

  const surface = isLocked
    ? 'linear-gradient(145deg, rgba(15,23,42,0.82), rgba(15,23,42,0.68))'
    : node.status === 'mastered'
      ? `linear-gradient(145deg, ${rgba('#34D399', 0.98)}, ${rgba(accent, 0.92)})`
      : node.status === 'review_needed'
        ? `linear-gradient(145deg, ${rgba('#F97316', 0.28)}, rgba(15,23,42,0.92))`
        : node.isCurrent
          ? `linear-gradient(145deg, ${rgba(accent, 0.36)}, rgba(15,23,42,0.96))`
          : `linear-gradient(145deg, ${rgba(accent, 0.18)}, rgba(15,23,42,0.9))`

  return (
    <div
      ref={nodeRef}
      className="absolute"
      style={{
        left: node.position.x,
        top: node.position.y,
        transform: 'translate(-50%, -50%)',
        zIndex: node.isCurrent ? 24 : node.kind === 'project' || node.kind === 'boss' ? 18 : 12,
      }}
    >
      <motion.div
        initial={false}
        animate={{
          opacity: dimOpacity,
          y: node.isCurrent && !prefersReducedMotion ? [0, -2, 0] : 0,
        }}
        transition={{
          duration: node.isCurrent && !prefersReducedMotion ? 3 : 0.3,
          repeat: node.isCurrent && !prefersReducedMotion ? Infinity : 0,
          ease: 'easeInOut',
        }}
        className="relative flex flex-col items-center"
      >
        {node.isCurrent && (
          <>
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <motion.div
                className="rounded-full"
                style={{
                  width: size + 34,
                  height: size + 34,
                  background: `radial-gradient(circle, ${rgba(accent, 0.24)} 0%, transparent 72%)`,
                  filter: 'blur(12px)',
                }}
                animate={prefersReducedMotion ? { opacity: 0.6 } : { opacity: [0.4, 0.9, 0.4], scale: [1, 1.08, 1] }}
                transition={{ duration: 2.8, repeat: prefersReducedMotion ? 0 : Infinity, ease: 'easeInOut' }}
              />
            </div>
            <div
              className="pointer-events-none absolute -top-10 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em]"
              style={{
                background: `linear-gradient(135deg, ${accent}, #F8FAFC)`,
                color: '#020617',
                boxShadow: `0 12px 28px ${rgba(accent, 0.24)}`,
              }}
            >
              You Are Here
            </div>
          </>
        )}

        <motion.button
          type="button"
          onClick={() => onTap?.(node)}
          whileHover={isLocked ? undefined : { scale: 1.04, y: -2 }}
          whileTap={isLocked ? undefined : { scale: 0.97 }}
          className="relative flex items-center justify-center border-2 focus:outline-none"
          style={{
            width: size,
            height: size,
            borderRadius: isProject ? 18 : isBoss ? 22 : 999,
            background: surface,
            borderColor: isLocked ? 'rgba(255,255,255,0.08)' : masteryColor,
            boxShadow: node.isCurrent
              ? `0 0 0 1px ${rgba(masteryColor, 0.28)}, 0 18px 40px ${rgba(masteryColor, 0.3)}`
              : `0 12px 32px ${rgba(masteryColor, isLocked ? 0.08 : 0.18)}`,
            filter: isLocked ? 'grayscale(0.45)' : 'none',
            cursor: 'pointer',
          }}
        >
          <div
            className="absolute inset-[6px]"
            style={{
              borderRadius: isProject ? 12 : isBoss ? 16 : 999,
              background: isLocked
                ? 'linear-gradient(160deg, rgba(255,255,255,0.06), rgba(15,23,42,0.02))'
                : `linear-gradient(160deg, ${rgba('#ffffff', node.status === 'mastered' ? 0.18 : 0.1)}, transparent 60%)`,
            }}
          />

          <ProgressRing size={size} mastery={node.mastery} color={masteryColor} />

          <div
            className="relative z-10"
            style={{
              color: node.status === 'mastered' ? '#FFFFFF' : isLocked ? 'rgba(255,255,255,0.42)' : masteryColor,
            }}
          >
            <IconGlyph
              name={isLocked ? 'lock' : node.icon}
              size={isProject || isBoss ? 28 : 24}
              strokeWidth={2.5}
            />
          </div>

          {node.weak && !node.isCurrent && !isLocked && (
            <div
              className="absolute -right-1 -top-1 rounded-full border px-2 py-1 text-[8px] font-black uppercase tracking-[0.18em]"
              style={{
                background: 'rgba(249,115,22,0.18)',
                borderColor: 'rgba(249,115,22,0.38)',
                color: '#FDBA74',
              }}
            >
              Review
            </div>
          )}
        </motion.button>

        <div
          className="mt-3 flex max-w-[182px] flex-col items-center gap-1 text-center"
          style={{ pointerEvents: 'none' }}
        >
          <div
            className="rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.18em]"
            style={{
              background: isLocked ? 'rgba(15,23,42,0.86)' : rgba(masteryColor, 0.1),
              borderColor: isLocked ? 'rgba(255,255,255,0.08)' : rgba(masteryColor, 0.26),
              color: isLocked ? 'rgba(148,163,184,0.8)' : masteryColor,
            }}
          >
            {getStatusLabel(node)}
          </div>

          <div className="text-[13px] font-extrabold leading-4 text-slate-100">
            {node.shortLabel}
          </div>

          <div className="flex items-center gap-2 text-[10px] font-semibold text-slate-400">
            <span>{node.mastery}% mastery</span>
            {node.estimatedMinutes > 0 && <span>{node.estimatedMinutes} min</span>}
          </div>
        </div>
      </motion.div>
    </div>
  )
}

const SkillGraphNode = memo(SkillGraphNodeComponent)

export default SkillGraphNode
