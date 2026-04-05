'use client'

import { memo, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, Flame, Hammer, Lock, Sparkles, Swords, Zap } from 'lucide-react'

const BOSS_COLORS = {
  accent: '#FBBF24',
  dark: '#F97316',
  glow: 'rgba(251,191,36,0.55)',
  strip: 'rgba(251,191,36,0.16)',
}

const PROJECT_COLORS = {
  accent: '#FBBF24',
  dark: '#B45309',
  glow: 'rgba(251,191,36,0.48)',
  strip: 'rgba(251,191,36,0.14)',
}

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

function buildPalette(world, tone) {
  if (tone === 'boss') return BOSS_COLORS
  if (tone === 'project') return PROJECT_COLORS
  return {
    accent: world?.accent || '#22D3A5',
    dark: world?.dark || '#0d7a5f',
    glow: world?.glow || 'rgba(34,211,165,0.45)',
    strip: world?.strip || 'rgba(34,211,165,0.12)',
  }
}

function NodeIcon({ state, completed, current, tone, accent }) {
  if (tone === 'boss') {
    if (completed) return <Sparkles size={28} strokeWidth={2.5}/>
    return <Swords size={28} strokeWidth={2.4}/>
  }
  if (tone === 'project') return <Hammer size={28} strokeWidth={2.4}/>
  if (completed) return <Check size={30} strokeWidth={3}/>
  if (state === 'locked') return <Lock size={20} strokeWidth={2.4}/>
  if (current) return <Flame size={28} strokeWidth={2.4}/>
  return <Sparkles size={26} strokeWidth={2.4} color={accent}/>
}

function ProgressRing({ progress, accent }) {
  if (progress <= 0 || progress >= 1) return null
  const circumference = 2 * Math.PI * 38
  return (
    <svg
      viewBox="0 0 92 92"
      className="pointer-events-none absolute -inset-3 size-[calc(100%+24px)]"
    >
      <circle
        cx="46"
        cy="46"
        r="38"
        fill="none"
        stroke={rgba(accent, 0.16)}
        strokeWidth="4"
      />
      <motion.circle
        cx="46"
        cy="46"
        r="38"
        fill="none"
        stroke={accent}
        strokeWidth="4.5"
        strokeLinecap="round"
        transform="rotate(-90 46 46)"
        initial={false}
        animate={{ strokeDashoffset: circumference * (1 - progress) }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        strokeDasharray={circumference}
      />
    </svg>
  )
}

function getNodeScale({ current, tone }) {
  if (current) return 1.24
  if (tone === 'boss') return 1.08
  if (tone === 'project') return 1.02
  return 1
}

function getNodeSize({ current, tone }) {
  if (current) return 68
  if (tone === 'boss') return 60
  if (tone === 'project') return 56
  return 56
}

function getSurface({ state, completed, current, palette }) {
  if (completed) {
    return `linear-gradient(145deg, ${palette.accent}, ${palette.dark})`
  }
  if (current) {
    return `linear-gradient(145deg, ${rgba(palette.accent, 0.28)}, ${rgba(palette.dark, 0.22)})`
  }
  if (state === 'locked') {
    return 'linear-gradient(145deg, rgba(255,255,255,0.08), rgba(148,163,184,0.04))'
  }
  return `linear-gradient(145deg, ${rgba(palette.accent, 0.22)}, ${rgba(palette.dark, 0.18)})`
}

function getShadow({ completed, current, state, palette }) {
  if (completed) {
    return `0 16px 34px ${rgba(palette.accent, 0.28)}, 0 0 24px ${rgba(palette.accent, 0.18)}, inset 0 1px 0 rgba(255,255,255,0.30)`
  }
  if (current) {
    return `0 0 0 1px ${rgba(palette.accent, 0.22)}, 0 22px 48px ${rgba(palette.accent, 0.28)}`
  }
  if (state === 'locked') {
    return '0 16px 32px rgba(2,6,23,0.30)'
  }
  return `0 18px 34px ${rgba(palette.accent, 0.18)}`
}

function getInfoAlignment(side) {
  return side === 'right'
    ? 'left-full ml-4 items-start text-left'
    : 'right-full mr-4 items-end text-right'
}

function PathNodeComponent({
  state,
  status = 'locked',
  label,
  xp,
  position,
  dayLabel,
  progress = 0,
  world,
  tone = 'normal',
  placeholder = false,
  current = false,
  completed = false,
  celebrating = false,
  justUnlocked = false,
  side = 'right',
  onTap,
  nodeRef,
}) {
  const [rippleKey, setRippleKey] = useState(0)
  const palette = useMemo(() => buildPalette(world, tone), [world, tone])
  const size = getNodeSize({ current, tone })
  const scale = getNodeScale({ current, tone })
  const isLocked = state === 'locked'
  const mobileLabel = current ? `${label}` : label
  const detailTone = completed
    ? rgba(palette.accent, 0.14)
    : current
      ? rgba(palette.accent, 0.12)
      : 'rgba(15,23,42,0.52)'

  const handleClick = () => {
    if (isLocked) return
    setRippleKey((value) => value + 1)
    onTap?.()
  }

  return (
    <div
      ref={nodeRef}
      className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${position.x}%`, top: position.y }}
    >
      <div className="relative flex items-center justify-center">
        <div
          className={`pointer-events-none absolute top-1/2 hidden max-w-[180px] -translate-y-1/2 sm:flex ${getInfoAlignment(side)}`}
        >
          <motion.div
            initial={false}
            animate={{
              opacity: isLocked ? 0.5 : 1,
              scale: current ? 1.02 : 1,
              x: current ? (side === 'right' ? 4 : -4) : 0,
            }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="relative overflow-hidden rounded-2xl border px-4 py-3 shadow-2xl backdrop-blur-xl"
            style={{
              background: `linear-gradient(160deg, ${detailTone}, rgba(2,6,23,0.78))`,
              borderColor: current ? rgba(palette.accent, 0.35) : 'rgba(255,255,255,0.08)',
              boxShadow: current ? `0 18px 36px ${rgba(palette.accent, 0.18)}` : '0 18px 36px rgba(2,6,23,0.30)',
            }}
          >
            <div
              className="absolute inset-x-4 top-0 h-px"
              style={{ background: `linear-gradient(90deg, transparent, ${rgba(palette.accent, 0.5)}, transparent)` }}
            />
            <div className="mb-1 flex items-center gap-2">
              <span
                className="rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-[0.24em]"
                style={{
                  background: current ? palette.accent : rgba(palette.accent, 0.14),
                  color: current ? '#020617' : palette.accent,
                }}
              >
                {current ? 'Current Focus' : completed ? 'Completed' : isLocked ? 'Locked' : tone === 'boss' ? 'Boss Node' : 'Mission'}
              </span>
              <span className="text-[10px] font-semibold text-slate-400">{dayLabel}</span>
            </div>
            <div className="text-sm font-extrabold leading-5 text-slate-100">{label}</div>
            <div className="mt-2 flex items-center gap-2 text-[11px] font-bold text-slate-300">
              <span
                className="inline-flex items-center gap-1 rounded-full border px-2 py-1"
                style={{ borderColor: rgba(palette.accent, 0.22), background: rgba(palette.accent, 0.1), color: completed ? '#FCD34D' : palette.accent }}
              >
                <Zap size={11} strokeWidth={2.5}/>
                {xp} XP
              </span>
              {current && (
                <span className="text-[10px] font-semibold text-slate-400">
                  {Math.round(progress * 100)}% done
                </span>
              )}
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={false}
          animate={{ y: tone === 'boss' ? [0, -6, 0] : tone === 'project' ? [0, -4, 0] : 0 }}
          transition={tone === 'boss' || tone === 'project'
            ? { duration: tone === 'boss' ? 3.6 : 4.4, repeat: Infinity, ease: 'easeInOut' }
            : { duration: 0.2 }}
          className="relative flex flex-col items-center gap-3"
        >
          {current && !placeholder && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="pointer-events-none absolute top-full left-1/2 mt-3 -translate-x-1/2 whitespace-nowrap rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-slate-950"
              style={{
                background: `linear-gradient(135deg, ${palette.accent}, #f8fafc)`,
                boxShadow: `0 10px 30px ${rgba(palette.accent, 0.26)}`,
              }}
            >
              ▶ You Are Here
            </motion.div>
          )}

          <AnimatePresence>
            {current && !placeholder && (
              <>
                <motion.div
                  key="focus-orb"
                  className="pointer-events-none absolute rounded-full blur-3xl"
                  style={{
                    width: size + 46,
                    height: size + 46,
                    background: `radial-gradient(circle, ${rgba(palette.accent, 0.34)} 0%, transparent 72%)`,
                  }}
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: [0.45, 0.8, 0.45], scale: [1, 1.1, 1] }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 2.3, repeat: Infinity, ease: 'easeInOut' }}
                />
                <motion.div
                  key="focus-ring"
                  className="pointer-events-none absolute rounded-full border"
                  style={{
                    width: size + 24,
                    height: size + 24,
                    borderColor: rgba(palette.accent, 0.5),
                    boxShadow: `0 0 24px ${rgba(palette.accent, 0.24)}`,
                  }}
                  initial={{ opacity: 0.2, scale: 0.9 }}
                  animate={{ opacity: [0.3, 0.85, 0.3], scale: [0.95, 1.14, 0.95] }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
                />
              </>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {celebrating && (
              <>
                <motion.div
                  key={`burst-${rippleKey}`}
                  className="pointer-events-none absolute rounded-full border-2"
                  style={{
                    width: size + 30,
                    height: size + 30,
                    borderColor: rgba(palette.accent, 0.7),
                  }}
                  initial={{ opacity: 0.9, scale: 0.85 }}
                  animate={{ opacity: 0, scale: 1.55 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
                />
                <motion.div
                  key={`glow-${rippleKey}`}
                  className="pointer-events-none absolute rounded-full blur-2xl"
                  style={{
                    width: size + 22,
                    height: size + 22,
                    background: `radial-gradient(circle, ${rgba(palette.accent, 0.48)} 0%, transparent 72%)`,
                  }}
                  initial={{ opacity: 0.95, scale: 0.82 }}
                  animate={{ opacity: 0, scale: 1.6 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                />
              </>
            )}
          </AnimatePresence>

          <motion.button
            type="button"
            onClick={handleClick}
            disabled={isLocked}
            initial={justUnlocked ? { opacity: 0, scale: 0.72, y: 16 } : false}
            animate={{
              opacity: isLocked ? 0.4 : 1,
              scale: celebrating
                ? [scale, scale * 1.18, scale]
                : justUnlocked
                  ? [scale * 0.8, scale * 1.08, scale]
                  : scale,
            }}
            transition={{
              duration: celebrating ? 0.7 : justUnlocked ? 0.75 : 0.22,
              ease: [0.22, 1, 0.36, 1],
            }}
            whileHover={!isLocked ? { scale: scale + 0.08, y: -4 } : undefined}
            whileTap={!isLocked ? { scale: Math.max(0.92, scale - 0.08) } : undefined}
            className="relative flex items-center justify-center overflow-visible rounded-full border-[3px] shadow-2xl transition-[filter] duration-200 focus:outline-none"
            style={{
              width: size,
              height: size,
              borderRadius: tone === 'boss' ? 20 : tone === 'project' ? 18 : 999,
              background: getSurface({ state, completed, current, palette }),
              borderColor: completed || current ? palette.accent : 'rgba(255,255,255,0.12)',
              boxShadow: getShadow({ completed, current, state, palette }),
              filter: isLocked ? 'grayscale(0.7)' : 'none',
            }}
          >
            <motion.div
              className="absolute inset-[7px] rounded-[inherit]"
              style={{
                background: completed
                  ? `linear-gradient(160deg, ${rgba('#ffffff', 0.24)}, transparent 58%)`
                  : `linear-gradient(160deg, ${rgba(palette.accent, 0.18)}, rgba(15,23,42,0.02))`,
                opacity: isLocked ? 0.4 : 1,
              }}
            />
            <AnimatePresence>
              {rippleKey > 0 && !isLocked && (
                <motion.span
                  key={rippleKey}
                  className="pointer-events-none absolute inset-0 rounded-[inherit] border"
                  style={{ borderColor: rgba(palette.accent, 0.75) }}
                  initial={{ opacity: 0.75, scale: 0.65 }}
                  animate={{ opacity: 0, scale: 1.45 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.55, ease: 'easeOut' }}
                />
              )}
            </AnimatePresence>

            <div
              className="absolute inset-0 rounded-[inherit]"
              style={{
                boxShadow: current
                  ? `0 0 0 1px ${rgba(palette.accent, 0.24)} inset`
                  : completed
                    ? `0 0 0 1px rgba(255,255,255,0.16) inset`
                    : 'none',
              }}
            />

            <div
              className="relative z-10 flex items-center justify-center"
              style={{ color: completed ? '#ffffff' : isLocked ? 'rgba(255,255,255,0.35)' : palette.accent }}
            >
              <NodeIcon
                state={state}
                completed={completed}
                current={current}
                tone={tone}
                accent={palette.accent}
              />
            </div>

            <ProgressRing progress={progress} accent={palette.accent}/>

            {completed && (
              <motion.div
                className="pointer-events-none absolute -inset-2 rounded-[inherit] border"
                style={{ borderColor: rgba(palette.accent, 0.28) }}
                initial={false}
                animate={{ opacity: [0.2, 0.5, 0.2], scale: [1, 1.05, 1] }}
                transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
              />
            )}
          </motion.button>

          <div className="flex flex-col items-center gap-1">
            {!current && (
              <div
                className="rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.2em]"
                style={{
                  background: completed
                    ? rgba(palette.accent, 0.12)
                    : 'rgba(15,23,42,0.54)',
                  color: completed ? '#cbd5e1' : 'rgba(148,163,184,0.82)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                {dayLabel}
              </div>
            )}

            <div className="sm:hidden max-w-[150px] text-center">
              <div className="text-[11px] font-bold leading-4 text-slate-100">{mobileLabel}</div>
              <div className="mt-1 inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em]"
                style={{
                  borderColor: rgba(palette.accent, 0.22),
                  background: rgba(palette.accent, 0.08),
                  color: completed ? '#FCD34D' : palette.accent,
                }}>
                <Zap size={10} strokeWidth={2.4}/>
                {xp} XP
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

const PathNode = memo(PathNodeComponent)

export default PathNode
