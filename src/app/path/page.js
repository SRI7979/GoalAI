'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getLevelProgress } from '@/lib/xp'
import { trackMapViewed } from '@/lib/analytics'
import { getDashboardThemeVars, getPathWorlds, getStoredActiveTheme, getStoredOwnedThemes } from '@/lib/appThemes'
import { buildSkillGraph } from '@/lib/pathGraph'
import { filterRowsForCourseWindow, getCourseVisibleDayCount } from '@/lib/courseCompletion'
import IconGlyph from '@/components/IconGlyph'
import Skeleton from '@/components/Skeleton'
import SkillGraphNode from '@/components/path/SkillGraphNode'
import SkillGraphEdge from '@/components/path/SkillGraphEdge'

const T = {
  bg: 'var(--theme-bg)',
  shell: 'var(--theme-shell)',
  chrome: 'var(--theme-chrome)',
  font: "'Plus Jakarta Sans','DM Sans',system-ui,sans-serif",
  text: 'var(--theme-text)',
  textSec: 'var(--theme-text-sec)',
  textMuted: 'var(--theme-text-muted)',
  border: 'var(--theme-border)',
  ink: 'var(--theme-ink)',
  masteryGradient: 'linear-gradient(135deg,var(--theme-mastery),var(--theme-mastery-strong))',
}

const CSS = `
  *,*::before,*::after { box-sizing: border-box; }
  ::-webkit-scrollbar { width: 0; height: 0; }
  body { background: var(--theme-bg); }

  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes slideUp {
    from { opacity: 0; transform: translateY(100%); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes xpRise {
    0% { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
    70% { opacity: 1; transform: translateX(-50%) translateY(-46px) scale(1.18); }
    100% { opacity: 0; transform: translateX(-50%) translateY(-64px) scale(0.9); }
  }
  @keyframes shimmer {
    0% { background-position: -200% center; }
    100% { background-position: 200% center; }
  }
  @keyframes graphGlow {
    0%,100% { opacity: 0.55; transform: scale(1); }
    50% { opacity: 0.9; transform: scale(1.08); }
  }
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }
`

const TASK_XP = {
  concept: 20,
  guided_practice: 30,
  challenge: 40,
  explain: 25,
  quiz: 35,
  reflect: 15,
  boss: 200,
  project: 100,
  lesson: 20,
  video: 15,
  practice: 25,
  exercise: 30,
  review: 20,
  reading: 20,
  flashcard: 15,
  ai_interaction: 25,
  reflection: 15,
  capstone: 0,
}

const TASK_STYLE = {
  lesson:          { color: '#22D3A5', label: 'Lesson', icon: 'book' },
  video:           { color: '#FBBF24', label: 'Video', icon: 'clapperboard' },
  practice:        { color: '#60A5FA', label: 'Practice', icon: 'dumbbell' },
  exercise:        { color: '#A78BFA', label: 'Exercise', icon: 'target' },
  quiz:            { color: '#F87171', label: 'Quiz', icon: 'clipboard_check' },
  review:          { color: '#FB923C', label: 'Review', icon: 'repeat' },
  guided_practice: { color: '#22D3EE', label: 'Practice', icon: 'dumbbell' },
  challenge:       { color: '#F59E0B', label: 'Challenge', icon: 'challenge' },
  ai_interaction:  { color: '#818CF8', label: 'Explain', icon: 'message' },
  reflection:      { color: '#A78BFA', label: 'Reflect', icon: 'brain' },
  boss:            { color: '#EC4899', label: 'Boss', icon: 'trophy' },
}

function clamp(value, min, max, fallback = min) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.max(min, Math.min(max, parsed))
}

function rowXP(tasks = []) {
  return tasks.reduce((sum, task) => sum + (TASK_XP[task.type] || 20), 0)
}

function patchNodeTask(nodes, rowId, taskId) {
  let completedNode = false
  const nextNodes = nodes.map((node) => {
    if (node.id !== rowId) return node
    const tasks = (node.tasks || []).map((task) => task.id === taskId ? { ...task, completed: true } : task)
    const completedTasks = tasks.filter((task) => task.completed).length
    const isDone = tasks.length > 0 && completedTasks === tasks.length
    if (isDone) completedNode = true
    return {
      ...node,
      tasks,
      completedTasks,
      status: isDone ? 'done' : node.status,
    }
  })
  return { nextNodes, completedNode }
}

function recomputeNodeStatuses(nodes) {
  let foundActive = false
  return nodes.map((node) => {
    if (node.isPlaceholder) return { ...node, status: 'locked' }
    if (node.status === 'done') return node
    if (!foundActive) {
      foundActive = true
      return { ...node, status: 'active' }
    }
    return { ...node, status: 'locked' }
  })
}

function findNextUnlockId(nodes, rowId) {
  const startIndex = nodes.findIndex((node) => node.id === rowId)
  if (startIndex < 0) return null
  for (let index = startIndex + 1; index < nodes.length; index += 1) {
    if (!nodes[index].isPlaceholder && nodes[index].status !== 'done') return nodes[index].id
  }
  return null
}

function formatRelativeLabel(value) {
  if (!value) return 'No recent session'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Recent activity'
  const diffMs = Date.now() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays <= 0) return 'Active today'
  if (diffDays === 1) return 'Active yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  const diffWeeks = Math.floor(diffDays / 7)
  if (diffWeeks < 5) return `${diffWeeks} week${diffWeeks === 1 ? '' : 's'} ago`
  return date.toLocaleDateString()
}

function MomentumBadge({ momentum }) {
  const tone = momentum?.tone || 'steady'
  const colors = tone === 'ahead'
    ? { bg: 'rgba(34,197,94,0.14)', border: 'rgba(34,197,94,0.24)', text: '#86EFAC', icon: 'rocket' }
    : tone === 'behind'
      ? { bg: 'rgba(249,115,22,0.14)', border: 'rgba(249,115,22,0.24)', text: '#FDBA74', icon: 'alert' }
      : { bg: 'rgba(59,130,246,0.14)', border: 'rgba(59,130,246,0.24)', text: '#93C5FD', icon: 'activity' }

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 12px',
        borderRadius: 9999,
        background: colors.bg,
        border: `1px solid ${colors.border}`,
        color: colors.text,
      }}
    >
      <IconGlyph name={colors.icon} size={14} strokeWidth={2.3} color={colors.text} />
      <span style={{ fontSize: 12, fontWeight: 800 }}>{momentum?.label || 'On Track'}</span>
    </div>
  )
}

function DetailSheet({ node, world, onClose, onComplete, completing }) {
  if (!node) return null

  const totalMin = node.tasks?.reduce((sum, task) => sum + (Number(task.durationMin) || 0), 0) || 0
  const accent = world?.accent || 'var(--theme-primary)'
  const isLocked = node.status === 'locked'

  return (
    <AnimatePresence>
      <motion.div
        key="detail-sheet"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(2,6,23,0.72)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            zIndex: 900,
          }}
        />

        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 901,
            maxHeight: '88vh',
            overflowY: 'auto',
            padding: '18px 18px calc(env(safe-area-inset-bottom, 0px) + 18px)',
            borderRadius: '26px 26px 0 0',
            background: `linear-gradient(180deg, rgba(5,10,18,0.98), ${T.shell})`,
            borderTop: `1px solid ${world?.glow || 'rgba(255,255,255,0.12)'}`,
            boxShadow: `0 -18px 80px ${world?.glow || 'rgba(15,23,42,0.4)'}`,
            fontFamily: T.font,
          }}
        >
          <div style={{ width: 42, height: 4, borderRadius: 9999, background: 'rgba(255,255,255,0.16)', margin: '0 auto 18px' }} />

          <div
            style={{
              borderRadius: 24,
              border: `1px solid ${node.weak ? 'rgba(249,115,22,0.24)' : 'rgba(255,255,255,0.08)'}`,
              background: 'linear-gradient(160deg, rgba(15,23,42,0.9), rgba(5,10,18,0.86))',
              padding: 18,
              marginBottom: 14,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'flex-start', marginBottom: 12 }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 900,
                      letterSpacing: '0.18em',
                      textTransform: 'uppercase',
                      padding: '4px 10px',
                      borderRadius: 9999,
                      background: node.isCurrent ? `linear-gradient(135deg, ${accent}, #F8FAFC)` : 'rgba(255,255,255,0.06)',
                      color: node.isCurrent ? '#020617' : accent,
                    }}
                  >
                    {node.isCurrent ? 'Current Focus' : node.status.replace(/_/g, ' ')}
                  </span>
                  {node.kind === 'project' && (
                    <span style={{ fontSize: 10, fontWeight: 900, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#FCD34D' }}>
                      Project Milestone
                    </span>
                  )}
                </div>

                <div style={{ fontSize: 26, fontWeight: 900, letterSpacing: '-0.03em', color: T.text, lineHeight: 1.1, marginBottom: 10 }}>
                  {node.title}
                </div>
                <div style={{ fontSize: 14, color: T.textSec, lineHeight: 1.6, marginBottom: 12 }}>
                  {node.description}
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 8,
                    padding: '12px 14px',
                    borderRadius: 16,
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  <IconGlyph name="lightbulb" size={16} strokeWidth={2.3} color={accent} />
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: '0.16em', textTransform: 'uppercase', color: T.textMuted, marginBottom: 4 }}>
                      Why This Matters
                    </div>
                    <div style={{ fontSize: 13, color: T.textSec, lineHeight: 1.55 }}>{node.whyItMatters}</div>
                  </div>
                </div>
              </div>

              <div
                style={{
                  width: 86,
                  minWidth: 86,
                  borderRadius: 22,
                  padding: '14px 10px',
                  border: '1px solid rgba(255,255,255,0.08)',
                  background: 'rgba(255,255,255,0.04)',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: '0.16em', textTransform: 'uppercase', color: T.textMuted, marginBottom: 6 }}>
                  Mastery
                </div>
                <div style={{ fontSize: 30, fontWeight: 900, color: accent, lineHeight: 1 }}>{node.mastery}%</div>
                <div style={{ fontSize: 11, color: T.textMuted, marginTop: 4 }}>{node.kind === 'future' ? 'Pending' : 'Current read'}</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
              {[
                { label: 'Last activity', value: formatRelativeLabel(node.lastActivity), icon: 'activity' },
                { label: 'Time invested', value: `${node.timeSpentMin || totalMin || 0} min`, icon: 'timer' },
                { label: 'Attempts', value: node.attempts ? `${node.attempts} avg` : 'No scored attempts', icon: 'repeat' },
                { label: 'Help usage', value: `${node.helpRate || 0}%`, icon: 'message_question' },
              ].map((entry) => (
                <div
                  key={entry.label}
                  style={{
                    borderRadius: 16,
                    border: '1px solid rgba(255,255,255,0.08)',
                    background: 'rgba(255,255,255,0.035)',
                    padding: '12px 12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <IconGlyph name={entry.icon} size={14} strokeWidth={2.3} color={T.textMuted} />
                    <span style={{ fontSize: 11, color: T.textMuted, fontWeight: 700 }}>{entry.label}</span>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: T.text }}>{entry.value}</div>
                </div>
              ))}
            </div>
          </div>

          {isLocked && (
            <div
              style={{
                borderRadius: 20,
                padding: 16,
                marginBottom: 14,
                background: 'rgba(15,23,42,0.86)',
                border: '1px solid rgba(148,163,184,0.16)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <IconGlyph name="lock" size={18} strokeWidth={2.3} color="#94A3B8" />
                <div style={{ fontSize: 15, fontWeight: 800, color: T.text }}>Unlock Requirements</div>
              </div>
              <div style={{ fontSize: 13, color: T.textSec, lineHeight: 1.6, marginBottom: 10 }}>
                This concept stays closed until its prerequisite concepts are stable.
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {(node.unlockConcepts || []).length > 0 ? node.unlockConcepts.map((concept) => (
                  <span
                    key={concept}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '9px 12px',
                      borderRadius: 9999,
                      border: '1px solid rgba(148,163,184,0.16)',
                      background: 'rgba(148,163,184,0.08)',
                      color: '#CBD5E1',
                      fontSize: 12,
                      fontWeight: 800,
                    }}
                  >
                    <IconGlyph name="lock" size={12} strokeWidth={2.3} color="#94A3B8" />
                    {concept}
                  </span>
                )) : (
                  <span style={{ fontSize: 13, color: T.textMuted }}>The path will unlock this automatically when you progress further.</span>
                )}
              </div>
            </div>
          )}

          {(node.weak || node.status === 'review_needed') && (
            <div
              style={{
                borderRadius: 20,
                padding: 16,
                marginBottom: 14,
                background: 'rgba(249,115,22,0.08)',
                border: '1px solid rgba(249,115,22,0.18)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <IconGlyph name="alert" size={18} strokeWidth={2.3} color="#FDBA74" />
                <div style={{ fontSize: 15, fontWeight: 800, color: '#FDBA74' }}>Needs Review</div>
              </div>
              <div style={{ display: 'grid', gap: 8 }}>
                {(node.mistakes || []).map((entry) => (
                  <div key={entry} style={{ fontSize: 13, lineHeight: 1.55, color: '#FED7AA' }}>
                    {entry}
                  </div>
                ))}
              </div>
            </div>
          )}

          {(node.tasks || []).length > 0 && !isLocked && (
            <div
              style={{
                borderRadius: 20,
                padding: 16,
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 900, color: T.text, marginBottom: 4 }}>Recommended work</div>
                  <div style={{ fontSize: 12, color: T.textMuted }}>
                    {node.completedTasks || 0}/{node.totalTasks || node.tasks.length} tasks completed
                  </div>
                </div>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#FCD34D' }}>+{rowXP(node.tasks)} XP</div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {node.tasks.map((task, index) => {
                  const style = TASK_STYLE[task.type] || TASK_STYLE.lesson
                  const isCompleting = completing === task.id
                  return (
                    <div
                      key={task.id || `${node.id}-${index}`}
                      style={{
                        borderRadius: 18,
                        padding: '14px 14px',
                        border: `1px solid ${task.completed ? 'rgba(34,211,165,0.18)' : 'rgba(255,255,255,0.08)'}`,
                        background: task.completed ? 'rgba(34,211,165,0.05)' : 'rgba(255,255,255,0.03)',
                        opacity: task.completed ? 0.6 : 1,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '4px 10px',
                            borderRadius: 9999,
                            border: `1px solid ${style.color}35`,
                            background: `${style.color}18`,
                            color: style.color,
                            fontSize: 10,
                            fontWeight: 900,
                            letterSpacing: '0.14em',
                            textTransform: 'uppercase',
                          }}
                        >
                          <IconGlyph name={style.icon} size={12} strokeWidth={2.3} color={style.color} />
                          {style.label}
                        </span>
                        <span style={{ fontSize: 11, color: T.textMuted }}>{task.durationMin || 0} min</span>
                        {task.completed && <span style={{ fontSize: 11, fontWeight: 800, color: '#34D399' }}>Done</span>}
                      </div>

                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 800,
                          color: task.completed ? T.textMuted : T.text,
                          lineHeight: 1.35,
                          textDecoration: task.completed ? 'line-through rgba(100,116,139,0.8)' : 'none',
                          marginBottom: task.description ? 6 : 0,
                        }}
                      >
                        {task.title}
                      </div>

                      {task.description && (
                        <div style={{ fontSize: 12, color: T.textMuted, lineHeight: 1.55, marginBottom: task.completed ? 0 : 10 }}>
                          {task.description.length > 140 ? `${task.description.slice(0, 140)}…` : task.description}
                        </div>
                      )}

                      {!task.completed && (
                        <button
                          onClick={(event) => onComplete(node.id, task.id, task, event)}
                          disabled={Boolean(isCompleting)}
                          style={{
                            width: '100%',
                            minHeight: 44,
                            borderRadius: 14,
                            border: isCompleting ? '1px solid rgba(255,255,255,0.08)' : 'none',
                            background: isCompleting ? 'rgba(255,255,255,0.04)' : `linear-gradient(135deg, ${accent}, ${world?.dark || '#0f766e'})`,
                            color: isCompleting ? T.textMuted : T.ink,
                            fontFamily: T.font,
                            fontSize: 13,
                            fontWeight: 900,
                            cursor: isCompleting ? 'default' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 8,
                          }}
                        >
                          {isCompleting ? (
                            <>
                              <span
                                style={{
                                  width: 14,
                                  height: 14,
                                  borderRadius: '50%',
                                  border: `2px solid ${world?.glow || 'rgba(255,255,255,0.16)'}`,
                                  borderTopColor: accent,
                                  animation: 'spin 0.7s linear infinite',
                                }}
                              />
                              Saving...
                            </>
                          ) : (
                            <>
                              <IconGlyph name="bolt" size={14} strokeWidth={2.4} color={T.ink} />
                              Complete from map
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {(node.tasks || []).length === 0 && !isLocked && (
            <div
              style={{
                borderRadius: 20,
                padding: 16,
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <IconGlyph name={node.kind === 'project' ? 'hammer' : 'map'} size={18} strokeWidth={2.3} color={accent} />
                <div style={{ fontSize: 15, fontWeight: 800, color: T.text }}>
                  {node.kind === 'project' ? 'Project milestone unlocked' : 'No task bundle attached'}
                </div>
              </div>
              <div style={{ fontSize: 13, color: T.textSec, lineHeight: 1.6 }}>
                {node.kind === 'project'
                  ? 'This node marks a proof-of-skill checkpoint. Open it from the dashboard or portfolio flow when you are ready to build.'
                  : 'This node is here to help you orient the map, but its work lives in another part of the path.'}
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

function XPPop({ pop, onDone }) {
  useEffect(() => {
    if (!pop) return undefined
    const timer = setTimeout(onDone, 1400)
    return () => clearTimeout(timer)
  }, [onDone, pop])

  if (!pop) return null
  return (
    <div
      style={{
        position: 'fixed',
        left: pop.x,
        top: pop.y,
        zIndex: 9999,
        transform: 'translateX(-50%)',
        fontSize: 16,
        fontWeight: 900,
        color: '#FCD34D',
        textShadow: '0 0 18px rgba(252,211,77,0.7)',
        fontFamily: T.font,
        pointerEvents: 'none',
        animation: 'xpRise 1.4s ease-out forwards',
      }}
    >
      +{pop.xp} XP
    </div>
  )
}

function ProjectModal({ onClose, enabled, onToggle }) {
  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 800,
          background: 'rgba(2,6,23,0.72)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
        }}
      />

      <motion.div
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 801,
          padding: '20px 20px calc(env(safe-area-inset-bottom, 0px) + 20px)',
          borderRadius: '26px 26px 0 0',
          borderTop: '1px solid rgba(192,132,252,0.25)',
          background: `linear-gradient(180deg, rgba(8,12,20,0.98), ${T.shell})`,
          fontFamily: T.font,
          boxShadow: '0 -18px 80px rgba(79,70,229,0.22)',
        }}
      >
        <div style={{ width: 42, height: 4, borderRadius: 9999, background: 'rgba(255,255,255,0.16)', margin: '0 auto 18px' }} />
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div
            style={{
              width: 74,
              height: 74,
              margin: '0 auto 12px',
              borderRadius: 22,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(129,140,248,0.12)',
              border: '1px solid rgba(129,140,248,0.22)',
              color: 'var(--theme-mastery)',
            }}
          >
            <IconGlyph name="hammer" size={30} strokeWidth={2.3} />
          </div>
          <div style={{ fontSize: 24, fontWeight: 900, color: T.text, marginBottom: 8 }}>Project Nodes</div>
          <div style={{ fontSize: 14, color: T.textSec, lineHeight: 1.6, maxWidth: 360, margin: '0 auto' }}>
            Add milestone projects directly onto the map so the path shows both knowledge dependencies and proof-of-skill checkpoints.
          </div>
        </div>

        <div style={{ display: 'grid', gap: 10, marginBottom: 20 }}>
          {[
            'Insert build checkpoints every five concepts',
            'Surface project milestones in the graph and the next-action engine',
            'Keep proof-of-skill work visible alongside mastery progress',
          ].map((entry) => (
            <div
              key={entry}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                borderRadius: 16,
                padding: '12px 14px',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <IconGlyph name="check_circle" size={18} strokeWidth={2.3} color="var(--theme-mastery)" />
              <span style={{ fontSize: 13, color: T.textSec, fontWeight: 700 }}>{entry}</span>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              minHeight: 44,
              borderRadius: 14,
              border: '1px solid rgba(255,255,255,0.10)',
              background: 'rgba(255,255,255,0.04)',
              color: T.textSec,
              fontFamily: T.font,
              fontSize: 14,
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            Close
          </button>
          <button
            onClick={() => {
              onToggle(!enabled)
              onClose()
            }}
            style={{
              flex: 2,
              minHeight: 44,
              borderRadius: 14,
              border: enabled ? '1px solid rgba(248,113,113,0.22)' : 'none',
              background: enabled ? 'rgba(248,113,113,0.08)' : T.masteryGradient,
              color: enabled ? '#FCA5A5' : T.ink,
              fontFamily: T.font,
              fontSize: 14,
              fontWeight: 900,
              cursor: 'pointer',
            }}
          >
            {enabled ? 'Hide Project Nodes' : 'Show Project Nodes'}
          </button>
        </div>
      </motion.div>
    </>
  )
}

function TabBar({ onNav }) {
  const items = [
    { key: 'home', label: 'Today', icon: 'goal' },
    { key: 'path', label: 'Map', icon: 'map' },
    { key: 'stats', label: 'Stats', icon: 'bar_chart' },
  ]

  return (
    <div
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 500,
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        padding: '10px 0 calc(env(safe-area-inset-bottom, 0px) + 10px)',
        background: T.chrome,
        borderTop: `1px solid ${T.border}`,
        backdropFilter: 'blur(28px)',
        WebkitBackdropFilter: 'blur(28px)',
        fontFamily: T.font,
      }}
    >
      {items.map((item) => {
        const active = item.key === 'path'
        return (
          <button
            key={item.key}
            onClick={() => onNav(item.key)}
            style={{
              minWidth: 64,
              minHeight: 44,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              background: 'none',
              border: 'none',
              color: active ? 'var(--theme-primary)' : T.textMuted,
              opacity: active ? 1 : 0.72,
              fontFamily: T.font,
              cursor: 'pointer',
            }}
          >
            <IconGlyph name={item.icon} size={20} strokeWidth={2.2} color={active ? 'var(--theme-primary)' : T.textMuted} />
            <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.03em' }}>{item.label}</span>
          </button>
        )
      })}
    </div>
  )
}

export default function PathPage() {
  const router = useRouter()
  const prefersReducedMotion = useReducedMotion()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [goal, setGoal] = useState(null)
  const [allNodes, setAllNodes] = useState([])
  const [masteryRows, setMasteryRows] = useState([])
  const [progress, setProgress] = useState({ xp: 0, streak: 0, totalDays: 0 })
  const [activeNodeId, setActiveNodeId] = useState(null)
  const [completing, setCompleting] = useState(null)
  const [xpPop, setXpPop] = useState(null)
  const [projects, setProjects] = useState(false)
  const [showProjModal, setShowProjModal] = useState(false)
  const [activeTheme, setActiveTheme] = useState(() => getStoredActiveTheme(getStoredOwnedThemes()))
  const [zoom, setZoom] = useState(1)

  const graphViewportRef = useRef(null)
  const transitionTimersRef = useRef([])

  const themeVars = useMemo(() => getDashboardThemeVars(activeTheme), [activeTheme])
  const pageThemeStyle = useMemo(() => ({
    ...themeVars,
    background: 'radial-gradient(circle at top, var(--theme-page-glow), transparent 34%), var(--theme-bg)',
  }), [themeVars])
  const worlds = useMemo(() => getPathWorlds(activeTheme), [activeTheme])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')

    const { data: authData } = await supabase.auth.getUser()
    const user = authData?.user
    if (!user) {
      router.push('/login')
      return
    }

    const { data: activeGoal } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!activeGoal) {
      setGoal(null)
      setLoading(false)
      return
    }

    setGoal(activeGoal)

    const [{ data: prog }, { data: rows, error: rowsErr }, { data: mastery }] = await Promise.all([
      supabase
        .from('user_progress')
        .select('total_xp,current_streak,total_days')
        .eq('user_id', user.id)
        .eq('goal_id', activeGoal.id)
        .maybeSingle(),
      supabase
        .from('daily_tasks')
        .select('*')
        .eq('goal_id', activeGoal.id)
        .eq('user_id', user.id)
        .order('day_number', { ascending: true }),
      supabase
        .from('concept_mastery')
        .select('concept_id,mastery_score,last_review,review_interval')
        .eq('user_id', user.id)
        .eq('goal_id', activeGoal.id),
    ])

    if (rowsErr) {
      setError(rowsErr.message)
      setLoading(false)
      return
    }

    const taskRows = filterRowsForCourseWindow(rows || [], Number(prog?.total_days) || 0)
    const totalDays = getCourseVisibleDayCount(
      prog?.total_days || Number(activeGoal.days) || 0,
      taskRows,
    ) || Math.max(taskRows.length, 7)
    let foundActive = false

    const realNodes = taskRows.map((row) => {
      const tasks = Array.isArray(row.tasks) ? row.tasks : []
      const completed = tasks.filter((task) => task.completed).length
      const isDone = row.completion_status === 'completed' || (tasks.length > 0 && completed === tasks.length)
      let status = 'locked'
      if (isDone) status = 'done'
      else if (!foundActive) {
        status = 'active'
        foundActive = true
      }

      return {
        id: row.id,
        dayNumber: row.day_number,
        conceptName: row.covered_topics?.[0] || `Day ${row.day_number}`,
        tasks,
        totalTasks: tasks.length,
        completedTasks: completed,
        status,
        isBoss: row.day_number % 7 === 0,
        isProject: false,
        isPlaceholder: false,
        totalMinutes: row.total_minutes || 30,
      }
    })

    const maxGenerated = taskRows.length > 0 ? Math.max(...taskRows.map((row) => row.day_number)) : 0
    const placeholders = []
    for (let day = maxGenerated + 1; day <= totalDays; day += 1) {
      placeholders.push({
        id: `placeholder-${day}`,
        dayNumber: day,
        conceptName: `Future Concept ${day}`,
        tasks: [],
        totalTasks: 0,
        completedTasks: 0,
        status: 'locked',
        isBoss: day % 7 === 0,
        isProject: false,
        isPlaceholder: true,
        totalMinutes: 30,
      })
    }

    setAllNodes([...realNodes, ...placeholders])
    setMasteryRows(mastery || [])
    setProgress({ xp: prog?.total_xp || 0, streak: prog?.current_streak || 0, totalDays })

    trackMapViewed({
      userId: user.id,
      goalId: activeGoal.id,
      completedDays: realNodes.filter((node) => node.status === 'done').length,
      totalDays,
    })

    setLoading(false)
  }, [router])

  useEffect(() => {
    const timer = setTimeout(() => load(), 0)
    return () => clearTimeout(timer)
  }, [load])

  useEffect(() => {
    const handleStorage = () => {
      setActiveTheme(getStoredActiveTheme(getStoredOwnedThemes()))
    }
    window.addEventListener('storage', handleStorage)
    window.addEventListener('pathai-theme-changed', handleStorage)
    return () => {
      window.removeEventListener('storage', handleStorage)
      window.removeEventListener('pathai-theme-changed', handleStorage)
    }
  }, [])

  useEffect(() => () => {
    transitionTimersRef.current.forEach((timerId) => clearTimeout(timerId))
    transitionTimersRef.current = []
  }, [])

  const displayNodes = useMemo(() => {
    if (!projects) return allNodes

    const result = []
    let projectCount = 0
    let realCount = 0

    allNodes.forEach((node) => {
      result.push(node)
      if (!node.isPlaceholder && !node.isProject) {
        realCount += 1
        if (realCount % 5 === 0) {
          projectCount += 1
          result.push({
            id: `project-${projectCount}`,
            dayNumber: null,
            conceptName: `Project Milestone ${projectCount}`,
            tasks: [],
            totalTasks: 0,
            completedTasks: 0,
            status: 'locked',
            isBoss: false,
            isProject: true,
            isPlaceholder: false,
            totalMinutes: 60,
          })
        }
      }
    })

    return result
  }, [allNodes, projects])

  const graph = useMemo(() => buildSkillGraph({
    nodes: displayNodes,
    masteryRows,
    goalText: goal?.goal_text || '',
    worlds,
  }), [displayNodes, masteryRows, goal?.goal_text, worlds])

  const resolvedActiveNodeId = useMemo(
    () => graph.graphNodes.some((node) => node.id === activeNodeId) ? activeNodeId : null,
    [activeNodeId, graph.graphNodes],
  )

  const activeNode = useMemo(
    () => graph.graphNodes.find((node) => node.id === resolvedActiveNodeId) || null,
    [graph.graphNodes, resolvedActiveNodeId],
  )

  const level = useMemo(() => getLevelProgress(progress.xp), [progress.xp])
  const completionPct = graph.graphNodes.length > 0
    ? Math.round((graph.graphNodes.filter((node) => ['mastered', 'review_needed'].includes(node.status)).length / graph.graphNodes.length) * 100)
    : 0

  const centerNodeInViewport = useCallback((nodeId, behavior = 'smooth') => {
    const viewport = graphViewportRef.current
    const node = graph.graphNodes.find((entry) => entry.id === nodeId)
    if (!viewport || !node) return

    const targetLeft = (node.position.x * zoom) - (viewport.clientWidth / 2)
    const targetTop = (node.position.y * zoom) - (viewport.clientHeight / 2) - 40

    viewport.scrollTo({
      left: Math.max(0, targetLeft),
      top: Math.max(0, targetTop),
      behavior,
    })
  }, [graph.graphNodes, zoom])

  useEffect(() => {
    if (!graph.currentFocus?.id) return undefined
    const timer = setTimeout(() => {
      centerNodeInViewport(graph.currentFocus.id, prefersReducedMotion ? 'auto' : 'smooth')
    }, 300)
    return () => clearTimeout(timer)
  }, [centerNodeInViewport, graph.currentFocus?.id, prefersReducedMotion])

  const handleComplete = useCallback(async (rowId, taskId, task, event) => {
    setCompleting(taskId)

    if (event) {
      const rect = event.currentTarget.getBoundingClientRect()
      setXpPop({
        x: rect.left + (rect.width / 2),
        y: rect.top - 10,
        xp: TASK_XP[task.type] || 20,
      })
    }

    let completedNode = false
    let nextUnlockId = null

    setAllNodes((previous) => {
      const patched = patchNodeTask(previous, rowId, taskId)
      completedNode = patched.completedNode
      nextUnlockId = patched.completedNode ? findNextUnlockId(patched.nextNodes, rowId) : null
      return patched.completedNode ? patched.nextNodes : recomputeNodeStatuses(patched.nextNodes)
    })

    if (completedNode) {
      const unlockTimer = setTimeout(() => {
        setAllNodes((previous) => recomputeNodeStatuses(previous))
        if (nextUnlockId) centerNodeInViewport(nextUnlockId, prefersReducedMotion ? 'auto' : 'smooth')
      }, 550)
      transitionTimersRef.current.push(unlockTimer)
    }

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token || null
      const currentSelectedNode = graph.graphNodes.find((node) => node.id === rowId)

      await fetch('/api/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          taskRowId: rowId,
          taskId,
          completedTaskIds: (currentSelectedNode?.tasks || [])
            .filter((entry) => entry.completed)
            .map((entry) => entry.id),
        }),
      })
    } catch {
      // Keep the optimistic update and rely on the dashboard refresh flow to reconcile later.
    }

    setCompleting(null)
  }, [centerNodeInViewport, graph.graphNodes, prefersReducedMotion])

  const handleNav = useCallback((tab) => {
    if (tab === 'home') router.push('/dashboard')
    if (tab === 'stats') router.push('/stats')
  }, [router])

  const handlePrimaryAction = () => {
    if (!graph.nextAction?.nodeId) return
    setActiveNodeId(graph.nextAction.nodeId)
    centerNodeInViewport(graph.nextAction.nodeId, prefersReducedMotion ? 'auto' : 'smooth')
  }

  const zoomIn = useCallback(() => setZoom((value) => clamp((value + 0.12).toFixed(2), 0.82, 1.4, 1)), [])
  const zoomOut = useCallback(() => setZoom((value) => clamp((value - 0.12).toFixed(2), 0.82, 1.4, 1)), [])
  const resetZoom = useCallback(() => setZoom(1), [])

  const activeSheetWorld = activeNode?.regionIndex != null
    ? worlds[activeNode.regionIndex % worlds.length] || worlds[0]
    : worlds[0]

  return (
    <div style={themeVars}>
      <style>{CSS}</style>

      <div style={{ ...pageThemeStyle, minHeight: '100vh', paddingBottom: 92, fontFamily: T.font }}>
        <div
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 200,
            background: T.chrome,
            borderBottom: `1px solid ${T.border}`,
            backdropFilter: 'blur(28px)',
            WebkitBackdropFilter: 'blur(28px)',
            paddingTop: 'env(safe-area-inset-top, 0px)',
          }}
        >
          <div
            style={{
              maxWidth: 1180,
              margin: '0 auto',
              padding: '12px 16px 14px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: T.masteryGradient,
                  color: '#fff',
                  fontSize: 15,
                  fontWeight: 900,
                  boxShadow: '0 0 18px rgba(129,140,248,0.3)',
                  flexShrink: 0,
                }}
              >
                {level.level}
              </div>

              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 900, color: T.text, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {goal?.goal_text || 'Learning Path'}
                  </span>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '4px 10px',
                      borderRadius: 9999,
                      border: '1px solid rgba(255,255,255,0.08)',
                      background: 'rgba(255,255,255,0.05)',
                      color: T.textMuted,
                      fontSize: 10,
                      fontWeight: 900,
                      letterSpacing: '0.14em',
                      textTransform: 'uppercase',
                    }}
                  >
                    <IconGlyph name={graph.skillConfig?.icon || 'map'} size={12} strokeWidth={2.3} color={T.textMuted} />
                    {graph.skillConfig?.label || 'Path'}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ flex: 1, height: 6, borderRadius: 9999, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${Math.round(level.pct * 100)}%`,
                        borderRadius: 9999,
                        background: 'linear-gradient(90deg,var(--theme-mastery),var(--theme-secondary),var(--theme-primary))',
                        backgroundSize: '200% 100%',
                        animation: level.pct > 0 ? 'shimmer 3s linear infinite' : 'none',
                      }}
                    />
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, color: T.textMuted, flexShrink: 0 }}>
                    {level.xpInLevel}/{level.xpForLevel} XP
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '7px 11px',
                    minHeight: 44,
                    borderRadius: 9999,
                    border: '1px solid rgba(34,211,165,0.18)',
                    background: 'rgba(34,211,165,0.08)',
                    color: 'var(--theme-primary)',
                  }}
                >
                  <IconGlyph name="repeat" size={14} strokeWidth={2.3} color="var(--theme-primary)" />
                  <span style={{ fontSize: 12, fontWeight: 800 }}>{completionPct}%</span>
                </div>

                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '7px 11px',
                    minHeight: 44,
                    borderRadius: 9999,
                    border: '1px solid rgba(251,146,60,0.2)',
                    background: 'rgba(251,146,60,0.08)',
                    color: '#FB923C',
                  }}
                >
                  <IconGlyph name="flame" size={14} strokeWidth={2.3} color="#FB923C" />
                  <span style={{ fontSize: 12, fontWeight: 800 }}>{progress.streak || 0}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {loading && (
          <div style={{ maxWidth: 1180, margin: '0 auto', padding: '22px 16px', display: 'grid', gap: 16 }}>
            <div style={{ borderRadius: 28, border: `1px solid ${T.border}`, padding: 22, background: 'rgba(255,255,255,0.03)' }}>
              <Skeleton height={16} width="18%" borderRadius={8} style={{ marginBottom: 12 }} />
              <Skeleton height={34} width="46%" borderRadius={10} style={{ marginBottom: 10 }} />
              <Skeleton height={12} width="72%" borderRadius={8} style={{ marginBottom: 18 }} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10 }}>
                {[0, 1, 2, 3].map((entry) => (
                  <Skeleton key={entry} height={86} borderRadius={18} />
                ))}
              </div>
            </div>

            <div style={{ borderRadius: 28, border: `1px solid ${T.border}`, padding: 20, background: 'rgba(255,255,255,0.03)' }}>
              <Skeleton height={14} width="24%" borderRadius={8} style={{ marginBottom: 14 }} />
              <div style={{ height: '62vh', borderRadius: 24, background: 'rgba(255,255,255,0.02)', border: `1px solid ${T.border}`, padding: 18 }}>
                {[0, 1, 2].map((entry) => (
                  <div key={entry} style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28 }}>
                    <Skeleton width={64} height={64} borderRadius="50%" />
                    <div style={{ flex: 1 }}>
                      <Skeleton height={12} width="38%" borderRadius={8} style={{ marginBottom: 8 }} />
                      <Skeleton height={10} width="20%" borderRadius={8} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {!loading && error && (
          <div style={{ maxWidth: 760, margin: '0 auto', padding: '64px 20px' }}>
            <div
              style={{
                borderRadius: 26,
                border: '1px solid rgba(248,113,113,0.18)',
                background: 'rgba(127,29,29,0.14)',
                padding: 26,
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  width: 68,
                  height: 68,
                  margin: '0 auto 16px',
                  borderRadius: 22,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(248,113,113,0.12)',
                  border: '1px solid rgba(248,113,113,0.18)',
                }}
              >
                <IconGlyph name="alert" size={28} strokeWidth={2.3} color="#FCA5A5" />
              </div>
              <div style={{ fontSize: 22, fontWeight: 900, color: T.text, marginBottom: 8 }}>Path unavailable</div>
              <div style={{ fontSize: 14, color: T.textSec, lineHeight: 1.6, marginBottom: 18 }}>
                Something went wrong while loading your learning graph.
              </div>
              <div style={{ fontSize: 13, color: '#FCA5A5', marginBottom: 18 }}>{error}</div>
              <button
                onClick={load}
                style={{
                  minHeight: 44,
                  padding: '0 20px',
                  borderRadius: 14,
                  border: 'none',
                  background: 'linear-gradient(135deg,var(--theme-primary),var(--theme-secondary))',
                  color: T.ink,
                  fontFamily: T.font,
                  fontSize: 14,
                  fontWeight: 900,
                  cursor: 'pointer',
                }}
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {!loading && !error && allNodes.length === 0 && (
          <div style={{ maxWidth: 760, margin: '0 auto', padding: '68px 20px' }}>
            <div
              style={{
                borderRadius: 28,
                border: `1px solid ${T.border}`,
                background: 'rgba(255,255,255,0.03)',
                padding: 28,
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  width: 74,
                  height: 74,
                  margin: '0 auto 16px',
                  borderRadius: 24,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(255,255,255,0.04)',
                  border: `1px solid ${T.border}`,
                }}
              >
                <IconGlyph name="map" size={30} strokeWidth={2.2} color={T.textSec} />
              </div>
              <div style={{ fontSize: 24, fontWeight: 900, color: T.text, marginBottom: 10 }}>No learning graph yet</div>
              <div style={{ fontSize: 14, color: T.textMuted, lineHeight: 1.6, marginBottom: 20 }}>
                Finish onboarding and your first concepts will appear here with recommended next actions.
              </div>
              <button
                onClick={() => router.push('/onboarding')}
                style={{
                  minHeight: 44,
                  padding: '0 22px',
                  borderRadius: 14,
                  border: 'none',
                  background: 'linear-gradient(135deg,var(--theme-primary),var(--theme-secondary))',
                  color: T.ink,
                  fontFamily: T.font,
                  fontSize: 14,
                  fontWeight: 900,
                  cursor: 'pointer',
                }}
              >
                Start path setup
              </button>
            </div>
          </div>
        )}

        {!loading && !error && allNodes.length > 0 && (
          <div style={{ maxWidth: 1180, margin: '0 auto', padding: '20px 16px 0', display: 'grid', gap: 16 }}>
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              style={{
                borderRadius: 30,
                border: `1px solid ${T.border}`,
                background: 'linear-gradient(145deg, rgba(7,13,22,0.96), rgba(4,8,14,0.92))',
                padding: 22,
                boxShadow: '0 24px 80px rgba(2,6,23,0.28)',
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  right: -80,
                  top: -60,
                  width: 240,
                  height: 240,
                  borderRadius: '50%',
                  background: `radial-gradient(circle, ${worlds[0]?.glow || 'rgba(34,211,165,0.18)'} 0%, transparent 68%)`,
                  filter: 'blur(12px)',
                  animation: prefersReducedMotion ? 'none' : 'graphGlow 6s ease-in-out infinite',
                  pointerEvents: 'none',
                }}
              />

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 18 }}>
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '6px 12px',
                      borderRadius: 9999,
                      border: '1px solid rgba(255,255,255,0.08)',
                      background: 'rgba(255,255,255,0.04)',
                      color: 'var(--theme-primary)',
                      fontSize: 11,
                      fontWeight: 900,
                      letterSpacing: '0.16em',
                      textTransform: 'uppercase',
                      marginBottom: 14,
                    }}
                  >
                    <IconGlyph name="compass" size={14} strokeWidth={2.3} color="var(--theme-primary)" />
                    Adaptive Skill Map
                  </div>

                  <div style={{ fontSize: 34, fontWeight: 900, letterSpacing: '-0.04em', color: T.text, lineHeight: 1.02, marginBottom: 10 }}>
                    {graph.currentFocus?.title || 'Path ready'}
                  </div>

                  <div style={{ fontSize: 15, color: T.textSec, lineHeight: 1.7, maxWidth: 640, marginBottom: 16 }}>
                    {graph.nextAction?.reason || 'The graph continuously adapts based on mastery, weak signals, and upcoming proof-of-skill checkpoints.'}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
                    <MomentumBadge momentum={graph.momentum} />
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '8px 12px',
                        borderRadius: 9999,
                        border: '1px solid rgba(129,140,248,0.18)',
                        background: 'rgba(129,140,248,0.08)',
                        color: 'var(--theme-mastery)',
                        fontSize: 12,
                        fontWeight: 800,
                      }}
                    >
                      <IconGlyph name="badge" size={14} strokeWidth={2.3} color="var(--theme-mastery)" />
                      {graph.identityLabel}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
                    {[
                      {
                        label: 'Current concept',
                        value: graph.currentFocus?.title || 'Waiting',
                        icon: 'target',
                      },
                      {
                        label: 'Immediate goal',
                        value: graph.nextUnlock?.title || graph.regions.find((region) => region.completedCount < region.totalCount)?.title || 'Keep building',
                        icon: 'goal',
                      },
                      {
                        label: 'Weak areas',
                        value: `${graph.weakNodes.length} flagged`,
                        icon: 'alert',
                      },
                      {
                        label: 'Path completion',
                        value: `${completionPct}%`,
                        icon: 'chart',
                      },
                    ].map((card) => (
                      <div
                        key={card.label}
                        style={{
                          borderRadius: 18,
                          border: '1px solid rgba(255,255,255,0.08)',
                          background: 'rgba(255,255,255,0.035)',
                          padding: '14px 14px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                          <IconGlyph name={card.icon} size={15} strokeWidth={2.3} color={T.textMuted} />
                          <span style={{ fontSize: 11, color: T.textMuted, fontWeight: 700 }}>{card.label}</span>
                        </div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: T.text, lineHeight: 1.35 }}>{card.value}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div
                  style={{
                    borderRadius: 24,
                    border: `1px solid ${worlds[0]?.accent ? `${worlds[0].accent}22` : 'rgba(255,255,255,0.08)'}`,
                    background: 'linear-gradient(160deg, rgba(10,16,28,0.92), rgba(6,10,18,0.9))',
                    padding: 18,
                    alignSelf: 'stretch',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 16,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: '0.16em', textTransform: 'uppercase', color: T.textMuted, marginBottom: 8 }}>
                      Next action
                    </div>
                    <div style={{ fontSize: 24, fontWeight: 900, color: T.text, lineHeight: 1.1, marginBottom: 8 }}>
                      {graph.nextAction?.label || 'Continue Learning'}
                    </div>
                    <div style={{ fontSize: 14, color: T.textSec, lineHeight: 1.65 }}>
                      {graph.currentFocus?.whyItMatters || 'Each node explains why it matters before you commit effort.'}
                    </div>
                  </div>

                  <button
                    onClick={handlePrimaryAction}
                    disabled={!graph.nextAction?.nodeId}
                    style={{
                      minHeight: 46,
                      width: '100%',
                      borderRadius: 16,
                      border: 'none',
                      background: graph.nextAction?.nodeId
                        ? 'linear-gradient(135deg,var(--theme-primary),var(--theme-secondary))'
                        : 'rgba(255,255,255,0.05)',
                      color: graph.nextAction?.nodeId ? T.ink : T.textMuted,
                      fontFamily: T.font,
                      fontSize: 14,
                      fontWeight: 900,
                      cursor: graph.nextAction?.nodeId ? 'pointer' : 'default',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                    }}
                  >
                    <IconGlyph
                      name={graph.nextAction?.icon || 'rocket'}
                      size={15}
                      strokeWidth={2.4}
                      color={graph.nextAction?.nodeId ? T.ink : T.textMuted}
                    />
                    {graph.nextAction?.label || 'Continue Learning'}
                  </button>

                  <div
                    style={{
                      borderRadius: 18,
                      border: '1px solid rgba(255,255,255,0.08)',
                      background: 'rgba(255,255,255,0.03)',
                      padding: 14,
                    }}
                  >
                    <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '0.14em', textTransform: 'uppercase', color: T.textMuted, marginBottom: 8 }}>
                      Recommendation basis
                    </div>
                    <div style={{ display: 'grid', gap: 8 }}>
                      {[
                        graph.currentFocus?.status === 'review_needed' ? 'Weak concepts are being prioritized to stabilize the graph.' : 'The next node is chosen by prerequisites, mastery, and momentum.',
                        graph.weakNodes.length > 0 ? `${graph.weakNodes[0].title} is currently the biggest weakness signal.` : 'No urgent weak concept is blocking you right now.',
                        graph.nextUnlock?.title ? `${graph.nextUnlock.title} is the next major unlock after this region.` : 'More of the graph will reveal itself as you progress.',
                      ].map((line) => (
                        <div key={line} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                          <IconGlyph name="sparkles" size={14} strokeWidth={2.3} color="var(--theme-primary)" />
                          <span style={{ fontSize: 12, color: T.textSec, lineHeight: 1.6 }}>{line}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.38, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 12,
              }}
            >
              {graph.regions.map((region) => (
                <div
                  key={region.id}
                  style={{
                    borderRadius: 22,
                    border: `1px solid ${region.world?.accent ? `${region.world.accent}20` : 'rgba(255,255,255,0.08)'}`,
                    background: `linear-gradient(145deg, ${region.world?.bg || 'rgba(255,255,255,0.03)'}, rgba(7,13,22,0.9))`,
                    padding: 16,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 12 }}>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '0.16em', textTransform: 'uppercase', color: region.world?.accent || 'var(--theme-primary)', marginBottom: 4 }}>
                        {region.title}
                      </div>
                      <div style={{ fontSize: 16, fontWeight: 900, color: T.text, lineHeight: 1.2 }}>{region.subtitle}</div>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 900, color: region.completedCount === region.totalCount ? '#FCD34D' : T.textSec }}>
                      {region.completedCount}/{region.totalCount}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
                    {[0, 1, 2].map((index) => (
                      <div
                        key={`${region.id}-${index}`}
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: index < region.starCount ? 'rgba(250,204,21,0.16)' : 'rgba(255,255,255,0.04)',
                          border: `1px solid ${index < region.starCount ? 'rgba(250,204,21,0.32)' : 'rgba(255,255,255,0.08)'}`,
                        }}
                      >
                        <IconGlyph name="sparkles" size={12} strokeWidth={2.3} color={index < region.starCount ? '#FACC15' : T.textMuted} />
                      </div>
                    ))}
                  </div>
                  <div style={{ height: 6, borderRadius: 9999, background: 'rgba(255,255,255,0.06)', overflow: 'hidden', marginBottom: 8 }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${Math.round(region.completionRatio * 100)}%`,
                        background: `linear-gradient(90deg, ${region.world?.accent || 'var(--theme-primary)'}, ${region.world?.dark || 'var(--theme-secondary)'})`,
                        borderRadius: 9999,
                      }}
                    />
                  </div>
                  <div style={{ fontSize: 12, color: T.textMuted, lineHeight: 1.5 }}>{region.description}</div>
                </div>
              ))}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.42, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
              style={{
                borderRadius: 30,
                border: `1px solid ${T.border}`,
                background: 'linear-gradient(160deg, rgba(7,12,20,0.98), rgba(4,8,14,0.96))',
                padding: 18,
                boxShadow: '0 26px 80px rgba(2,6,23,0.3)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '0.18em', textTransform: 'uppercase', color: T.textMuted, marginBottom: 6 }}>
                    Skill graph
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 900, color: T.text, lineHeight: 1.1 }}>Where you are, what is weak, and what unlocks next</div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  {[
                    { label: 'Mastered', color: '#34D399' },
                    { label: 'Current', color: 'var(--theme-primary)' },
                    { label: 'Review', color: '#F97316' },
                    { label: 'Locked', color: '#64748B' },
                  ].map((entry) => (
                    <span
                      key={entry.label}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '6px 10px',
                        borderRadius: 9999,
                        border: '1px solid rgba(255,255,255,0.08)',
                        background: 'rgba(255,255,255,0.03)',
                        color: T.textSec,
                        fontSize: 11,
                        fontWeight: 800,
                      }}
                    >
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: entry.color, boxShadow: `0 0 12px ${entry.color}` }} />
                      {entry.label}
                    </span>
                  ))}

                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      borderRadius: 9999,
                      border: '1px solid rgba(255,255,255,0.08)',
                      background: 'rgba(255,255,255,0.03)',
                      padding: '4px',
                    }}
                  >
                    <button
                      onClick={zoomOut}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        border: 'none',
                        background: 'rgba(255,255,255,0.04)',
                        color: T.text,
                        cursor: 'pointer',
                      }}
                    >
                      <IconGlyph name="minus" size={16} strokeWidth={2.3} />
                    </button>
                    <span style={{ minWidth: 48, textAlign: 'center', color: T.textSec, fontSize: 12, fontWeight: 800 }}>
                      {Math.round(zoom * 100)}%
                    </span>
                    <button
                      onClick={zoomIn}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        border: 'none',
                        background: 'rgba(255,255,255,0.04)',
                        color: T.text,
                        cursor: 'pointer',
                      }}
                    >
                      <IconGlyph name="plus" size={16} strokeWidth={2.3} />
                    </button>
                    <button
                      onClick={resetZoom}
                      style={{
                        minHeight: 36,
                        padding: '0 10px',
                        borderRadius: 9999,
                        border: 'none',
                        background: 'rgba(255,255,255,0.04)',
                        color: T.textSec,
                        cursor: 'pointer',
                        fontFamily: T.font,
                        fontSize: 11,
                        fontWeight: 800,
                      }}
                    >
                      Reset
                    </button>
                  </div>
                </div>
              </div>

              <div
                ref={graphViewportRef}
                style={{
                  height: 'min(72vh, 760px)',
                  overflow: 'auto',
                  borderRadius: 24,
                  border: `1px solid ${T.border}`,
                  background: 'linear-gradient(180deg, rgba(4,8,14,0.98), rgba(5,10,18,0.95))',
                  position: 'relative',
                  WebkitOverflowScrolling: 'touch',
                }}
              >
                <div style={{ width: graph.canvasWidth * zoom, height: graph.canvasHeight * zoom, position: 'relative' }}>
                  <div
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      width: graph.canvasWidth,
                      height: graph.canvasHeight,
                      transform: `scale(${zoom})`,
                      transformOrigin: 'top left',
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        opacity: 0.32,
                        backgroundImage: 'radial-gradient(rgba(255,255,255,0.14) 0.7px, transparent 0.7px)',
                        backgroundSize: '18px 18px',
                        pointerEvents: 'none',
                      }}
                    />

                    {graph.regions.map((region) => (
                      <div
                        key={region.id}
                        style={{
                          position: 'absolute',
                          left: 44,
                          right: 44,
                          top: region.top,
                          height: 78,
                          borderRadius: 24,
                          border: `1px solid ${region.world?.accent ? `${region.world.accent}22` : 'rgba(255,255,255,0.08)'}`,
                          background: `linear-gradient(135deg, ${region.world?.bg || 'rgba(255,255,255,0.03)'}, rgba(7,12,20,0.9))`,
                          padding: '14px 16px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 14,
                        }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                            <span style={{ fontSize: 11, fontWeight: 900, letterSpacing: '0.16em', textTransform: 'uppercase', color: region.world?.accent || 'var(--theme-primary)' }}>
                              {region.title}
                            </span>
                            <span style={{ fontSize: 11, color: T.textMuted }}>
                              {region.completedCount}/{region.totalCount}
                            </span>
                          </div>
                          <div style={{ fontSize: 17, fontWeight: 900, color: T.text, lineHeight: 1.2, marginBottom: 4 }}>{region.subtitle}</div>
                          <div style={{ fontSize: 12, color: T.textMuted, lineHeight: 1.5 }}>{region.description}</div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                          <div style={{ display: 'flex', gap: 4 }}>
                            {[0, 1, 2].map((index) => (
                              <div
                                key={`${region.id}-${index}-spark`}
                                style={{
                                  width: 20,
                                  height: 20,
                                  borderRadius: '50%',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  background: index < region.starCount ? 'rgba(250,204,21,0.16)' : 'rgba(255,255,255,0.04)',
                                  border: `1px solid ${index < region.starCount ? 'rgba(250,204,21,0.32)' : 'rgba(255,255,255,0.08)'}`,
                                }}
                              >
                                <IconGlyph name="sparkles" size={11} strokeWidth={2.3} color={index < region.starCount ? '#FACC15' : T.textMuted} />
                              </div>
                            ))}
                          </div>
                          <div style={{ width: 120, height: 6, borderRadius: 9999, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                            <div
                              style={{
                                height: '100%',
                                width: `${Math.round(region.completionRatio * 100)}%`,
                                borderRadius: 9999,
                                background: `linear-gradient(90deg, ${region.world?.accent || 'var(--theme-primary)'}, ${region.world?.dark || 'var(--theme-secondary)'})`,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}

                    <svg
                      width={graph.canvasWidth}
                      height={graph.canvasHeight}
                      viewBox={`0 0 ${graph.canvasWidth} ${graph.canvasHeight}`}
                      style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
                    >
                      {graph.edges.map((edge) => (
                        <SkillGraphEdge
                          key={edge.id}
                          edge={edge}
                          accent={worlds[edge.regionIndex % worlds.length]?.accent || 'var(--theme-primary)'}
                          active={worlds[edge.regionIndex % worlds.length]?.dark || 'var(--theme-secondary)'}
                        />
                      ))}
                    </svg>

                    {graph.graphNodes.map((node) => (
                      <SkillGraphNode
                        key={node.id}
                        node={node}
                        world={worlds[node.regionIndex % worlds.length] || worlds[0]}
                        onTap={(selectedNode) => setActiveNodeId(selectedNode.id)}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginTop: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  {(graph.weakNodes || []).slice(0, 3).map((node) => (
                    <button
                      key={node.id}
                      onClick={() => {
                        setActiveNodeId(node.id)
                        centerNodeInViewport(node.id, prefersReducedMotion ? 'auto' : 'smooth')
                      }}
                      style={{
                        minHeight: 40,
                        padding: '0 12px',
                        borderRadius: 9999,
                        border: '1px solid rgba(249,115,22,0.18)',
                        background: 'rgba(249,115,22,0.08)',
                        color: '#FDBA74',
                        fontFamily: T.font,
                        fontSize: 12,
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                      }}
                    >
                      <IconGlyph name="alert" size={13} strokeWidth={2.3} color="#FDBA74" />
                      {node.title}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setShowProjModal(true)}
                  style={{
                    minHeight: 40,
                    padding: '0 14px',
                    borderRadius: 9999,
                    border: `1px solid ${projects ? 'rgba(129,140,248,0.24)' : 'rgba(255,255,255,0.10)'}`,
                    background: projects ? 'rgba(129,140,248,0.12)' : 'rgba(255,255,255,0.04)',
                    color: projects ? 'var(--theme-mastery)' : T.textSec,
                    fontFamily: T.font,
                    fontSize: 12,
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <IconGlyph name="hammer" size={14} strokeWidth={2.3} color={projects ? 'var(--theme-mastery)' : T.textSec} />
                  {projects ? 'Project nodes on' : 'Show project nodes'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>

      <DetailSheet
        node={activeNode}
        world={activeSheetWorld}
        onClose={() => setActiveNodeId(null)}
        onComplete={handleComplete}
        completing={completing}
      />

      <XPPop pop={xpPop} onDone={() => setXpPop(null)} />

      {showProjModal && (
        <ProjectModal
          enabled={projects}
          onClose={() => setShowProjModal(false)}
          onToggle={setProjects}
        />
      )}

      <TabBar onNav={handleNav} />
    </div>
  )
}
