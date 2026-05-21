// Stats — Emotional Reinforcement Screen
// Not just numbers — a celebration of competence, consistency, and momentum.
'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { getLocalGoalBundleWithRepairs, isLocalAccessUser } from '@/lib/localGoalStore'
import { getSafeSupabaseUser, supabaseData } from '@/lib/supabase'
import { getLevelProgress, LEVEL_TITLES } from '@/lib/xp'
import { streakStatusLabel } from '@/lib/streak'
import { trackStatsViewed } from '@/lib/analytics'
import { buildPathOutlineTracker } from '@/lib/pathOutline.js'
import { hydrateGoalCourseOutline } from '@/lib/courseOutlineStore'
import {
  getDashboardThemeVars,
  getStoredActiveTheme,
  getStoredOwnedThemes,
  setStoredOwnedThemes,
} from '@/lib/appThemes'
import { getClaimedModuleRewardIds } from '@/lib/shopInventory'
import BadgeShowcase from '@/components/BadgeShowcase'
import IconGlyph from '@/components/IconGlyph'
import Skeleton from '@/components/Skeleton'

// ─── Design tokens ────────────────────────────────────────────────────────────
const T = {
  bg:          'var(--theme-bg)',
  chrome:      'var(--theme-chrome)',
  surface:     'var(--theme-surface)',
  border:      'var(--theme-border)',
  teal:        'var(--theme-primary)',
  tealDim:     'var(--theme-primary-dim)',
  tealBorder:  'var(--theme-primary-border)',
  blue:        'var(--theme-secondary)',
  flame:       'var(--theme-warm)',
  flameDim:    'var(--theme-warm-dim)',
  flameBorder: 'var(--theme-warm-border)',
  amber:       'var(--theme-highlight)',
  mastery:     'var(--theme-mastery)',
  masteryDim:  'var(--theme-mastery-dim)',
  masteryBdr:  'var(--theme-mastery-border)',
  text:        'var(--theme-text)',
  textSec:     'var(--theme-text-sec)',
  textMuted:   'var(--theme-text-muted)',
  font:        "'Plus Jakarta Sans','DM Sans',system-ui,sans-serif",
}

const THEME_REASON_TO_ID = {
  shop_themeOcean: 'themeOcean',
  shop_themeSunset: 'themeSunset',
  shop_themeForest: 'themeForest',
  shop_themeMidnight: 'themeMidnight',
  shop_themeRose: 'themeRose',
  shop_themeAurora: 'themeAurora',
  shop_themeEmber: 'themeEmber',
  shop_themeMonolith: 'themeMonolith',
}

const KEYFRAMES = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  ::-webkit-scrollbar{display:none}
  @keyframes fadeUp   { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
  @keyframes barGrow  { from{width:0%} to{width:var(--target-w)} }
  @keyframes ringFill { from{stroke-dashoffset:var(--full)} to{stroke-dashoffset:var(--offset)} }
  @keyframes countUp  { from{opacity:0;transform:scale(0.7)} to{opacity:1;transform:scale(1)} }
  @keyframes pulseGlow{ 0%,100%{box-shadow:0 0 12px rgba(14,245,194,0.25)} 50%{box-shadow:0 0 28px rgba(14,245,194,0.50)} }
  @keyframes heatSweep{ 0%{transform:translateX(-120%);opacity:0} 28%{opacity:.7} 100%{transform:translateX(120%);opacity:0} }
  @keyframes heatPop{ 0%{transform:scale(.92);opacity:.45} 70%{transform:scale(1.04);opacity:1} 100%{transform:scale(1);opacity:1} }
  .stats-page-inner{width:min(980px,calc(100vw - 32px));margin:0 auto}
  .stats-hero-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}
  .concept-heat-shell{display:grid;grid-template-columns:minmax(0,1fr) 276px;gap:14px;align-items:start}
  .concept-heat-scroll{overflow-x:auto;margin:0 -2px;padding:2px}
  .concept-heat-grid{min-width:820px;display:flex;flex-direction:column;gap:8px}
  .concept-heat-cell{transition:transform .18s ease,border-color .18s ease,box-shadow .18s ease,background .18s ease}
  .concept-heat-cell:hover{transform:translateY(-2px);border-color:rgba(255,255,255,.24)!important}
  .concept-heat-row{transition:transform .18s ease,border-color .18s ease,background .18s ease}
  .concept-heat-row:hover{transform:translateY(-1px);border-color:rgba(255,255,255,.18)!important;background:rgba(255,255,255,.055)!important}
  @media (max-width:820px){
    .stats-hero-grid{grid-template-columns:1fr 1fr}
    .concept-heat-shell{grid-template-columns:1fr}
  }
  @media (prefers-reduced-motion:reduce){
    @keyframes fadeUp  { from{opacity:0} to{opacity:1} }
    @keyframes barGrow { from{width:0%} to{width:var(--target-w)} }
    @keyframes ringFill{ from{stroke-dashoffset:var(--full)} to{stroke-dashoffset:var(--offset)} }
    @keyframes countUp { from{opacity:0} to{opacity:1} }
    @keyframes pulseGlow{ to{} }
    @keyframes heatSweep{ to{} }
    @keyframes heatPop{ from{opacity:0} to{opacity:1} }
  }
`

// ─── Icons ────────────────────────────────────────────────────────────────────
const HomeIcon  = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
const PathIcon  = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
const StatsIcon = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>

// ─── Tab bar ──────────────────────────────────────────────────────────────────
function TabBar({ onNav }) {
  const tabs = [
    { key:'home',  icon:<HomeIcon/>,  label:'Today' },
    { key:'path',  icon:<PathIcon/>,  label:'Map'   },
    { key:'stats', icon:<StatsIcon/>, label:'Stats' },
  ]
  return (
    <div style={{
      position:'fixed', bottom:0, left:0, right:0, zIndex:500,
      background:'rgba(6,6,15,0.90)', borderTop:'1px solid rgba(255,255,255,0.08)',
      backdropFilter:'blur(28px)', WebkitBackdropFilter:'blur(28px)',
      display:'flex', justifyContent:'space-around', alignItems:'center',
      padding:'12px 0 max(env(safe-area-inset-bottom),12px)',
      fontFamily:T.font,
    }}>
      {tabs.map(t => (
        <button key={t.key} onClick={() => onNav(t.key)} style={{
          display:'flex', flexDirection:'column', alignItems:'center', gap:4,
          background:'none', border:'none', cursor:'pointer', padding:'4px 20px',
          color: t.key === 'stats' ? T.teal : T.textMuted,
          opacity: t.key === 'stats' ? 1 : 0.65,
        }}>
          {t.icon}
          <span style={{ fontSize:10, fontWeight:600 }}>{t.label}</span>
        </button>
      ))}
    </div>
  )
}

// ─── Stat hero number ─────────────────────────────────────────────────────────
function HeroStat({ value, label, color, sub, delay=0 }) {
  return (
    <div style={{
      background: T.surface,
      border:`1px solid ${T.border}`,
      borderRadius:18, padding:'18px 16px',
      backdropFilter:'blur(16px)', WebkitBackdropFilter:'blur(16px)',
      boxShadow:'inset 0 1px 0 rgba(255,255,255,0.06)',
      animation:`fadeUp 0.40s ${delay}s both`,
    }}>
      <div style={{ fontSize:11, fontWeight:700, color:T.textMuted,
        textTransform:'uppercase', letterSpacing:'1.1px', marginBottom:8 }}>
        {label}
      </div>
      <div style={{
        fontSize:30, fontWeight:900, color: color || T.text,
        letterSpacing:'-1px', lineHeight:1,
        animation:`countUp 0.50s ${delay+0.1}s both`,
      }}>
        {value}
      </div>
      {sub && <div style={{ fontSize:11, color:T.textMuted, marginTop:4 }}>{sub}</div>}
    </div>
  )
}

// ─── Level ring ───────────────────────────────────────────────────────────────
function LevelRing({ level, title, pct, xpInLevel, xpForLevel }) {
  const r        = 52
  const circ     = 2 * Math.PI * r
  const offset   = circ * (1 - Math.min(1, pct))

  return (
    <div style={{
      background:'linear-gradient(145deg,rgba(129,140,248,0.10),rgba(99,102,241,0.05))',
      border:'1px solid rgba(129,140,248,0.22)',
      borderRadius:20, padding:'20px',
      display:'flex', alignItems:'center', gap:20,
      backdropFilter:'blur(16px)', WebkitBackdropFilter:'blur(16px)',
      animation:'fadeUp 0.40s 0.05s both',
    }}>
      {/* SVG ring */}
      <div style={{ flexShrink:0, position:'relative' }}>
        <svg width="120" height="120" viewBox="0 0 120 120">
          {/* Track */}
          <circle cx="60" cy="60" r={r} fill="none"
            stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
          {/* Fill */}
          <circle cx="60" cy="60" r={r} fill="none"
            stroke="url(#lvlGrad)" strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            transform="rotate(-90 60 60)"
            style={{ transition:'stroke-dashoffset 0.8s cubic-bezier(0.16,1,0.3,1)' }}
          />
          <defs>
            <linearGradient id="lvlGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#818CF8" />
              <stop offset="100%" stopColor="#6366F1" />
            </linearGradient>
          </defs>
          {/* Center */}
          <text x="60" y="54" textAnchor="middle"
            fill="#fff" fontSize="22" fontWeight="900" fontFamily="Plus Jakarta Sans,sans-serif">
            {level}
          </text>
          <text x="60" y="70" textAnchor="middle"
            fill="#475569" fontSize="10" fontWeight="600" fontFamily="Plus Jakarta Sans,sans-serif">
            LEVEL
          </text>
        </svg>
      </div>

      {/* Text */}
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:18, fontWeight:800, color:T.text, marginBottom:4 }}>{title}</div>
        <div style={{ fontSize:12, color:T.textMuted, marginBottom:12 }}>
          {xpInLevel.toLocaleString()} / {xpForLevel.toLocaleString()} XP to next level
        </div>
        {/* XP bar */}
        <div style={{ height:6, background:'rgba(255,255,255,0.06)', borderRadius:9999, overflow:'hidden' }}>
          <div style={{
            height:'100%', borderRadius:9999,
            background:'linear-gradient(90deg,#818CF8,#6366F1)',
            width:`${Math.round(pct*100)}%`,
            transition:'width 0.8s cubic-bezier(0.16,1,0.3,1)',
            boxShadow:'0 0 10px rgba(129,140,248,0.50)',
          }}/>
        </div>
        <div style={{ fontSize:11, color:T.textMuted, marginTop:6 }}>
          {Math.round(pct*100)}% to Level {level+1}
        </div>
      </div>
    </div>
  )
}

// ─── Weekly bar chart ─────────────────────────────────────────────────────────
function WeeklyChart({ rows }) {
  // Build last 7 days
  const days = useMemo(() => {
    const dayLabels = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
    const result = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().split('T')[0]
      const dayRow  = rows.find(r => r.task_date === dateStr || r.created_at?.startsWith(dateStr))
      const tasks   = Array.isArray(dayRow?.tasks) ? dayRow.tasks : []
      const done    = tasks.filter(t => t.completed).length
      const total   = tasks.length
      const mins    = tasks.filter(t => t.completed)
        .reduce((s, t) => s + (Number(t.estimatedTimeMin || t.durationMin) || 0), 0)
      result.push({
        label:     dayLabels[d.getDay()],
        isToday:   i === 0,
        done,
        total,
        mins,
        complete:  total > 0 && done === total,
        partial:   done > 0 && done < total,
      })
    }
    return result
  }, [rows])

  const maxMins = Math.max(...days.map(d => d.mins), 1)

  return (
    <div style={{
      background:T.surface, border:`1px solid ${T.border}`,
      borderRadius:18, padding:'18px 16px',
      backdropFilter:'blur(16px)', WebkitBackdropFilter:'blur(16px)',
      animation:'fadeUp 0.40s 0.15s both',
    }}>
      <div style={{ fontSize:12, fontWeight:700, color:T.textMuted,
        textTransform:'uppercase', letterSpacing:'1px', marginBottom:16 }}>
        This week
      </div>
      <div style={{ display:'flex', alignItems:'flex-end', gap:8, height:80 }}>
        {days.map((d, i) => {
          const barH = d.mins > 0 ? Math.max(8, Math.round((d.mins / maxMins) * 72)) : 4
          const color = d.complete ? T.teal : d.partial ? T.blue : 'rgba(255,255,255,0.08)'
          return (
            <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
              {d.mins > 0 && (
                <div style={{ fontSize:9, color:T.textMuted, fontWeight:600, marginBottom:2 }}>
                  {d.mins}m
                </div>
              )}
              <div style={{
                width:'100%', height:barH,
                background: color,
                borderRadius:5,
                boxShadow: d.complete ? '0 0 8px rgba(14,245,194,0.35)' : 'none',
                transition:'height 0.6s cubic-bezier(0.16,1,0.3,1)',
              }}/>
              <div style={{
                fontSize:9, fontWeight: d.isToday ? 800 : 600,
                color: d.isToday ? T.teal : T.textMuted,
              }}>
                {d.label}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Mastery concept list ──────────────────────────────────────────────────────
function MasteryList({ masteries, loading }) {
  if (loading) return (
    <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
      {[0,1,2].map(i => <Skeleton key={i} h={52} r={12}/>)}
    </div>
  )
  if (!masteries.length) return (
    <div style={{ fontSize:13, color:T.textMuted, textAlign:'center', padding:'20px 0' }}>
      Complete tasks to build concept mastery
    </div>
  )

  const now = new Date()
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
      {masteries.slice(0,8).map((m, i) => {
        const pct = Math.min(1, (m.mastery_score || 0) / 100)
        const daysSince = m.last_review ? Math.floor((now - new Date(m.last_review)) / (1000*60*60*24)) : 0
        const isDecaying = daysSince >= 7 && m.mastery_score > 0
        const color = isDecaying ? T.amber : pct >= 0.8 ? T.teal : pct >= 0.5 ? T.blue : pct >= 0.3 ? T.mastery : T.textMuted
        return (
          <div key={m.concept_id || i} style={{
            background: isDecaying ? 'rgba(251,191,36,0.04)' : T.surface,
            border:`1px solid ${isDecaying ? 'rgba(251,191,36,0.18)' : T.border}`,
            borderRadius:12, padding:'11px 14px',
            backdropFilter:'blur(12px)', WebkitBackdropFilter:'blur(12px)',
            animation:`fadeUp 0.35s ${i*0.05}s both`,
          }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
              <span style={{ fontSize:13, fontWeight:600, color:T.text,
                overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:'65%' }}>
                {m.concept_id}
              </span>
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                {isDecaying && (
                  <span style={{ fontSize:10, fontWeight:700, color:T.amber, padding:'2px 6px', background:'rgba(251,191,36,0.10)', borderRadius:9999 }}>
                    {daysSince}d ago
                  </span>
                )}
                <span style={{ fontSize:12, fontWeight:800, color }}>
                  {Math.round(pct*100)}%
                </span>
              </div>
            </div>
            <div style={{ height:4, background:'rgba(255,255,255,0.06)', borderRadius:9999, overflow:'hidden' }}>
              <div style={{
                height:'100%', borderRadius:9999,
                background: isDecaying
                  ? 'linear-gradient(90deg,#FBBF24,#F59E0B)'
                  : pct >= 0.8
                  ? 'linear-gradient(90deg,#0ef5c2,#00d4ff)'
                  : pct >= 0.5
                  ? 'linear-gradient(90deg,#00d4ff,#818CF8)'
                  : '#818CF8',
                width:`${Math.round(pct*100)}%`,
                transition:'width 0.7s cubic-bezier(0.16,1,0.3,1)',
                boxShadow: isDecaying ? '0 0 6px rgba(251,191,36,0.40)' : pct >= 0.8 ? '0 0 6px rgba(14,245,194,0.40)' : 'none',
              }}/>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Concept mastery heat map ─────────────────────────────────────────────────
const HEAT_SIGNALS = [
  {
    key: 'learn',
    label: 'Learn',
    icon: 'book',
    description: 'Concept lessons, readings, or videos',
    gradient: 'linear-gradient(135deg,rgba(34,211,165,0.18),rgba(34,211,165,0.78))',
    shadow: 'rgba(34,211,165,0.34)',
    text: T.teal,
  },
  {
    key: 'practice',
    label: 'Practice',
    icon: 'dumbbell',
    description: 'Guided practice with support',
    gradient: 'linear-gradient(135deg,rgba(34,211,238,0.16),rgba(34,211,238,0.72))',
    shadow: 'rgba(34,211,238,0.30)',
    text: T.blue,
  },
  {
    key: 'recall',
    label: 'Recall',
    icon: 'brain',
    description: 'Quizzes, recall, flashcards, or checks',
    gradient: 'linear-gradient(135deg,rgba(129,140,248,0.17),rgba(129,140,248,0.75))',
    shadow: 'rgba(129,140,248,0.32)',
    text: T.mastery,
  },
  {
    key: 'apply',
    label: 'Apply',
    icon: 'target',
    description: 'Challenges, projects, bosses, or exams',
    gradient: 'linear-gradient(135deg,rgba(251,191,36,0.16),rgba(251,191,36,0.75))',
    shadow: 'rgba(251,191,36,0.30)',
    text: T.amber,
  },
  {
    key: 'explain',
    label: 'Explain',
    icon: 'message',
    description: 'Explain-back, reflection, or discussion',
    gradient: 'linear-gradient(135deg,rgba(251,113,133,0.14),rgba(251,113,133,0.68))',
    shadow: 'rgba(251,113,133,0.28)',
    text: T.flame,
  },
]

const SIGNAL_BY_TYPE = {
  concept: 'learn',
  reading: 'learn',
  video: 'learn',
  lesson: 'learn',
  guided_practice: 'practice',
  practice: 'practice',
  recall: 'recall',
  quiz: 'recall',
  flashcard: 'recall',
  flashcards: 'recall',
  challenge: 'apply',
  boss: 'apply',
  final_exam: 'apply',
  project: 'apply',
  explain: 'explain',
  reflect: 'explain',
  reflection: 'explain',
  discussion: 'explain',
}

function clampPct(value, fallback = 0) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.max(0, Math.min(100, parsed))
}

function cleanConceptLabel(value) {
  const text = String(value || '').replace(/\s+/g, ' ').trim()
  if (!text) return ''
  if (/^(general|task|lesson|concept)$/i.test(text)) return ''
  return text
}

function conceptKey(value) {
  return cleanConceptLabel(value).toLowerCase()
}

function parseStatDate(value) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function formatRecentDate(value) {
  const date = parseStatDate(value)
  if (!date) return 'Not reviewed'
  const days = Math.max(0, Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24)))
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 14) return `${days}d ago`
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function signalForTask(task) {
  const type = String(task?.type || task?.presentation || 'concept').toLowerCase()
  return SIGNAL_BY_TYPE[type] || SIGNAL_BY_TYPE[String(task?.presentation || '').toLowerCase()] || 'learn'
}

function taskAccuracy(task) {
  const adaptive = task?._adaptive || {}
  const direct = adaptive.accuracy ?? adaptive.quizScore ?? adaptive.challengeScore
  if (Number.isFinite(Number(direct))) return clampPct(direct, 72)
  if (adaptive.bossDefeated === true) return 88
  return task?.completed ? 72 : 0
}

function taskConcepts(task, row) {
  const values = []
  if (Array.isArray(task?._concepts)) values.push(...task._concepts)
  if (Array.isArray(task?.concepts)) values.push(...task.concepts)
  values.push(
    task?._concept,
    task?.concept,
    task?.topic,
    task?.lessonSeed?.focusConcept,
  )
  if (Array.isArray(row?.covered_topics)) values.push(...row.covered_topics)
  if (values.every((value) => !cleanConceptLabel(value))) values.push(task?.title)
  return Array.from(new Set(values.map(cleanConceptLabel).filter(Boolean)))
}

function createConceptEntry(label) {
  const signals = Object.fromEntries(HEAT_SIGNALS.map((signal) => [signal.key, {
    total: 0,
    completed: 0,
    accuracySum: 0,
    minutes: 0,
  }]))

  return {
    key: conceptKey(label),
    label: cleanConceptLabel(label),
    totalTasks: 0,
    completedTasks: 0,
    pendingTasks: 0,
    minutes: 0,
    accuracySum: 0,
    accuracyCount: 0,
    firstDay: null,
    lastDay: null,
    lastTouched: null,
    taskTypes: new Set(),
    signals,
    masteryRow: null,
  }
}

function ensureConceptEntry(map, label) {
  const clean = cleanConceptLabel(label)
  if (!clean) return null
  const key = conceptKey(clean)
  if (!map.has(key)) map.set(key, createConceptEntry(clean))
  return map.get(key)
}

function buildConceptHeatMapModel(rows = [], masteries = []) {
  const concepts = new Map()

  ;(Array.isArray(masteries) ? masteries : []).forEach((mastery) => {
    const label = cleanConceptLabel(mastery?.concept_id || mastery?.conceptName)
    const entry = ensureConceptEntry(concepts, label)
    if (entry) entry.masteryRow = mastery
  })

  ;(Array.isArray(rows) ? rows : []).forEach((row) => {
    const rowDate = parseStatDate(row?.task_date || row?.created_at)
    const dayNumber = Number(row?.day_number) || null
    const tasks = Array.isArray(row?.tasks) ? row.tasks : []

    tasks.forEach((task) => {
      const conceptsForTask = taskConcepts(task, row)
      const signalKey = signalForTask(task)
      const minutes = Number(task?.estimatedTimeMin || task?.durationMin) || 0
      const completed = Boolean(task?.completed)
      const accuracy = taskAccuracy(task)

      conceptsForTask.forEach((label) => {
        const entry = ensureConceptEntry(concepts, label)
        if (!entry) return
        const signal = entry.signals[signalKey] || entry.signals.learn

        entry.totalTasks += 1
        entry.taskTypes.add(String(task?.type || 'concept'))
        if (dayNumber != null) {
          entry.firstDay = entry.firstDay == null ? dayNumber : Math.min(entry.firstDay, dayNumber)
          entry.lastDay = entry.lastDay == null ? dayNumber : Math.max(entry.lastDay, dayNumber)
        }

        signal.total += 1

        if (completed) {
          entry.completedTasks += 1
          entry.minutes += minutes
          entry.accuracySum += accuracy
          entry.accuracyCount += 1
          signal.completed += 1
          signal.accuracySum += accuracy
          signal.minutes += minutes
          if (rowDate && (!entry.lastTouched || rowDate > entry.lastTouched)) entry.lastTouched = rowDate
        } else {
          entry.pendingTasks += 1
        }
      })
    })
  })

  const now = Date.now()
  const conceptRows = Array.from(concepts.values()).map((entry) => {
    const masteryScore = clampPct(entry.masteryRow?.mastery_score, null)
    const completedRatio = entry.totalTasks > 0 ? entry.completedTasks / entry.totalTasks : 0
    const signalCoverage = HEAT_SIGNALS.filter((signal) => entry.signals[signal.key]?.completed > 0).length / HEAT_SIGNALS.length
    const avgAccuracy = entry.accuracyCount > 0 ? entry.accuracySum / entry.accuracyCount : (entry.completedTasks > 0 ? 72 : 0)
    const derivedScore = Math.round((completedRatio * 34) + (signalCoverage * 26) + (avgAccuracy * 0.40))
    const finalScore = masteryScore == null ? clampPct(derivedScore) : masteryScore
    const lastReviewDate = parseStatDate(entry.masteryRow?.last_review) || entry.lastTouched
    const daysSinceReview = lastReviewDate ? Math.max(0, Math.floor((now - lastReviewDate.getTime()) / (1000 * 60 * 60 * 24))) : null
    const reviewInterval = Math.max(3, Number(entry.masteryRow?.review_interval) || (finalScore >= 85 ? 14 : finalScore >= 65 ? 9 : 4))
    const stale = daysSinceReview != null && daysSinceReview >= reviewInterval && finalScore > 0
    const weak = entry.completedTasks > 0 && finalScore < 65
    const thinCoverage = entry.completedTasks > 0 && signalCoverage < 0.34
    const needsReview = stale || weak || thinCoverage
    const status = entry.completedTasks === 0
      ? 'Planned'
      : finalScore >= 85
        ? 'Mastered'
        : finalScore >= 70
          ? 'Strong'
          : finalScore >= 45
            ? 'Developing'
            : 'Emerging'

    return {
      ...entry,
      masteryScore: finalScore,
      avgAccuracy,
      signalCoverage,
      lastReviewDate,
      daysSinceReview,
      reviewInterval,
      stale,
      weak,
      thinCoverage,
      needsReview,
      status,
    }
  }).sort((a, b) => {
    if (a.needsReview !== b.needsReview) return a.needsReview ? -1 : 1
    if ((a.firstDay || 9999) !== (b.firstDay || 9999)) return (a.firstDay || 9999) - (b.firstDay || 9999)
    return b.masteryScore - a.masteryScore
  })

  const learned = conceptRows.filter((concept) => concept.completedTasks > 0)
  const mastered = learned.filter((concept) => concept.masteryScore >= 85)
  const needsReview = learned.filter((concept) => concept.needsReview)
  const coveragePct = learned.length
    ? Math.round((learned.reduce((sum, concept) => sum + concept.signalCoverage, 0) / learned.length) * 100)
    : 0
  const maxSignalCount = Math.max(1, ...conceptRows.flatMap((concept) => HEAT_SIGNALS.map((signal) => concept.signals[signal.key]?.completed || 0)))

  return {
    concepts: conceptRows,
    learned,
    mastered,
    needsReview,
    coveragePct,
    maxSignalCount,
  }
}

function HeatCell({ signal, column, maxSignalCount, stale }) {
  const completed = Number(signal?.completed) || 0
  const total = Number(signal?.total) || 0
  const intensity = completed > 0 ? Math.min(1, 0.24 + (completed / Math.max(2, maxSignalCount)) * 0.76) : 0
  const avg = completed > 0 ? Math.round((signal.accuracySum || 0) / completed) : 0

  return (
    <div
      className="concept-heat-cell"
      title={`${column.label}: ${completed}/${total} complete${avg ? ` · ${avg}% avg` : ''}`}
      style={{
        height: 58,
        borderRadius: 14,
        border: `1px solid ${completed ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.07)'}`,
        background: completed
          ? column.gradient
          : total
            ? 'linear-gradient(135deg,rgba(255,255,255,0.055),rgba(255,255,255,0.025))'
            : 'rgba(255,255,255,0.025)',
        opacity: completed ? 0.54 + (intensity * 0.46) : total ? 0.74 : 0.44,
        boxShadow: completed
          ? `0 0 ${Math.round(8 + intensity * 18)}px ${stale ? 'rgba(251,191,36,0.22)' : column.shadow}`
          : 'none',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '9px 10px',
        animation: completed ? 'heatPop .34s both' : 'none',
      }}
    >
      {completed > 0 && (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.18),transparent)',
          animation: 'heatSweep 2.8s ease-in-out infinite',
          animationDelay: `${Math.min(completed, 6) * 0.16}s`,
        }}/>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative' }}>
        <span style={{ fontSize: 10, fontWeight: 900, color: completed ? '#fff' : T.textMuted }}>
          {completed || (total ? 'open' : 'none')}
        </span>
        <IconGlyph name={column.icon} size={13} strokeWidth={2.4} color={completed ? '#fff' : T.textMuted} />
      </div>
      <div style={{ height: 3, borderRadius: 9999, background: 'rgba(0,0,0,0.22)', overflow: 'hidden', position: 'relative' }}>
        <div style={{
          height: '100%',
          width: `${completed ? Math.max(18, intensity * 100) : total ? 18 : 0}%`,
          borderRadius: 9999,
          background: completed ? '#fff' : 'rgba(255,255,255,0.35)',
        }}/>
      </div>
    </div>
  )
}

function ConceptHeatMap({ rows, masteries }) {
  const model = useMemo(() => buildConceptHeatMapModel(rows, masteries), [rows, masteries])
  const reviewQueue = model.needsReview.slice(0, 5)
  const topConcept = model.learned.slice().sort((a, b) => b.masteryScore - a.masteryScore)[0]

  return (
    <section style={{
      background: 'linear-gradient(145deg,rgba(255,255,255,0.075),rgba(255,255,255,0.028))',
      border: `1px solid ${T.border}`,
      borderRadius: 24,
      padding: 18,
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.07),0 24px 80px rgba(0,0,0,0.22)',
      animation: 'fadeUp 0.42s 0.18s both',
      overflow: 'hidden',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 16,
        marginBottom: 16,
        flexWrap: 'wrap',
      }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <div style={{
              width: 38,
              height: 38,
              borderRadius: 14,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'linear-gradient(135deg,var(--theme-primary-dim),var(--theme-mastery-dim))',
              border: `1px solid ${T.tealBorder}`,
              boxShadow: '0 0 28px rgba(14,245,194,0.16)',
            }}>
              <IconGlyph name="grid" size={18} strokeWidth={2.4} color={T.teal} />
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 900, color: T.textMuted, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
                Concept heat map
              </div>
              <h2 style={{ fontSize: 24, fontWeight: 950, color: T.text, letterSpacing: '-0.7px', lineHeight: 1.08, marginTop: 2 }}>
                What you have learned, where it is strong, and what needs review
              </h2>
            </div>
          </div>
          <p style={{ fontSize: 13, color: T.textSec, lineHeight: 1.6, maxWidth: 680 }}>
            Each row is a concept. Each glowing cell shows how much evidence PathAI has from lessons, practice, recall, application, and explanation.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(138px,1fr))', gap: 10, marginBottom: 16 }}>
        {[
          { label: 'Learned', value: model.learned.length, color: T.teal, icon: 'book' },
          { label: 'Mastered', value: model.mastered.length, color: T.amber, icon: 'sparkles' },
          { label: 'Review queue', value: model.needsReview.length, color: model.needsReview.length ? T.flame : T.textMuted, icon: 'repeat' },
          { label: 'Coverage', value: `${model.coveragePct}%`, color: T.blue, icon: 'line_chart' },
        ].map((item) => (
          <div key={item.label} style={{
            borderRadius: 16,
            border: `1px solid ${T.border}`,
            background: 'rgba(255,255,255,0.045)',
            padding: '13px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}>
            <div style={{
              width: 34,
              height: 34,
              borderRadius: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(255,255,255,0.055)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}>
              <IconGlyph name={item.icon} size={16} strokeWidth={2.4} color={item.color} />
            </div>
            <div>
              <div style={{ fontSize: 19, fontWeight: 950, color: item.color, lineHeight: 1 }}>{item.value}</div>
              <div style={{ fontSize: 10, fontWeight: 900, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 4 }}>{item.label}</div>
            </div>
          </div>
        ))}
      </div>

      {model.concepts.length === 0 ? (
        <div style={{
          borderRadius: 18,
          border: `1px dashed ${T.border}`,
          background: 'rgba(255,255,255,0.025)',
          padding: '28px 18px',
          textAlign: 'center',
          color: T.textMuted,
          fontSize: 13,
          lineHeight: 1.6,
        }}>
          Complete a few lessons and tasks to light up your concept heat map.
        </div>
      ) : (
        <div className="concept-heat-shell">
          <div className="concept-heat-scroll">
            <div className="concept-heat-grid">
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(238px,1.55fr) repeat(5,minmax(78px,.7fr)) minmax(98px,.48fr)',
                gap: 8,
                alignItems: 'center',
                padding: '0 4px 4px',
              }}>
                <div style={{ fontSize: 10, fontWeight: 900, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                  Concept
                </div>
                {HEAT_SIGNALS.map((signal) => (
                  <div key={signal.key} title={signal.description} style={{
                    fontSize: 10,
                    fontWeight: 900,
                    color: signal.text,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    justifyContent: 'center',
                  }}>
                    <IconGlyph name={signal.icon} size={12} strokeWidth={2.3} color={signal.text} />
                    {signal.label}
                  </div>
                ))}
                <div style={{ fontSize: 10, fontWeight: 900, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.12em', textAlign: 'right' }}>
                  Mastery
                </div>
              </div>

              {model.concepts.map((concept, index) => {
                const masteryColor = concept.needsReview
                  ? T.amber
                  : concept.masteryScore >= 85
                    ? T.teal
                    : concept.masteryScore >= 65
                      ? T.blue
                      : T.mastery
                const dayLabel = concept.firstDay && concept.lastDay
                  ? concept.firstDay === concept.lastDay ? `Day ${concept.firstDay}` : `Days ${concept.firstDay}-${concept.lastDay}`
                  : 'Unscheduled'

                return (
                  <div key={concept.key || index} className="concept-heat-row" style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(238px,1.55fr) repeat(5,minmax(78px,.7fr)) minmax(98px,.48fr)',
                    gap: 8,
                    alignItems: 'center',
                    borderRadius: 18,
                    border: `1px solid ${concept.needsReview ? 'rgba(251,191,36,0.20)' : 'rgba(255,255,255,0.09)'}`,
                    background: concept.needsReview
                      ? 'linear-gradient(135deg,rgba(251,191,36,0.075),rgba(255,255,255,0.035))'
                      : 'rgba(255,255,255,0.035)',
                    padding: 10,
                    animation: `fadeUp .34s ${Math.min(index, 10) * 0.025}s both`,
                  }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
                        <div style={{
                          width: 10,
                          height: 10,
                          borderRadius: '50%',
                          background: masteryColor,
                          boxShadow: `0 0 16px ${concept.needsReview ? 'rgba(251,191,36,0.38)' : 'rgba(14,245,194,0.28)'}`,
                          flexShrink: 0,
                        }}/>
                        <div style={{
                          fontSize: 14,
                          fontWeight: 850,
                          color: T.text,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}>
                          {concept.label}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {[concept.status, dayLabel, `${concept.completedTasks}/${concept.totalTasks} tasks`, formatRecentDate(concept.lastReviewDate)].map((chip, chipIndex) => (
                          <span key={`${concept.key}-${chipIndex}`} style={{
                            fontSize: 9,
                            fontWeight: 850,
                            color: chipIndex === 0 ? masteryColor : T.textMuted,
                            padding: '3px 7px',
                            borderRadius: 9999,
                            background: chipIndex === 0 ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.04)',
                            border: '1px solid rgba(255,255,255,0.07)',
                          }}>
                            {chip}
                          </span>
                        ))}
                      </div>
                    </div>

                    {HEAT_SIGNALS.map((signal) => (
                      <HeatCell
                        key={`${concept.key}-${signal.key}`}
                        signal={concept.signals[signal.key]}
                        column={signal}
                        maxSignalCount={model.maxSignalCount}
                        stale={concept.stale}
                      />
                    ))}

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 22, fontWeight: 950, color: masteryColor, lineHeight: 1 }}>
                        {Math.round(concept.masteryScore)}%
                      </div>
                      <div style={{ height: 5, background: 'rgba(255,255,255,0.07)', borderRadius: 9999, overflow: 'hidden', marginTop: 8 }}>
                        <div style={{
                          height: '100%',
                          width: `${Math.round(concept.masteryScore)}%`,
                          borderRadius: 9999,
                          background: concept.needsReview
                            ? 'linear-gradient(90deg,#FBBF24,#F97316)'
                            : 'linear-gradient(90deg,var(--theme-primary),var(--theme-secondary))',
                          boxShadow: concept.needsReview ? '0 0 10px rgba(251,191,36,0.35)' : '0 0 10px rgba(14,245,194,0.35)',
                        }}/>
                      </div>
                      <div style={{ fontSize: 9, fontWeight: 800, color: T.textMuted, marginTop: 5 }}>
                        {Math.round(concept.avgAccuracy)}% avg
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <aside style={{ display: 'grid', gap: 10 }}>
            <div style={{
              borderRadius: 18,
              border: `1px solid ${T.border}`,
              background: 'rgba(255,255,255,0.04)',
              padding: 14,
            }}>
              <div style={{ fontSize: 10, fontWeight: 900, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 10 }}>
                Heat legend
              </div>
              <div style={{ display: 'grid', gap: 8 }}>
                {HEAT_SIGNALS.map((signal) => (
                  <div key={signal.key} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                    <div style={{ width: 18, height: 18, borderRadius: 6, background: signal.gradient, boxShadow: `0 0 14px ${signal.shadow}` }}/>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 850, color: T.text }}>{signal.label}</div>
                      <div style={{ fontSize: 10, color: T.textMuted, lineHeight: 1.3 }}>{signal.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{
              borderRadius: 18,
              border: `1px solid ${reviewQueue.length ? 'rgba(251,191,36,0.22)' : T.border}`,
              background: reviewQueue.length
                ? 'linear-gradient(145deg,rgba(251,191,36,0.08),rgba(255,255,255,0.035))'
                : 'rgba(255,255,255,0.04)',
              padding: 14,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <IconGlyph name="repeat" size={15} strokeWidth={2.4} color={reviewQueue.length ? T.amber : T.textMuted} />
                <div style={{ fontSize: 10, fontWeight: 900, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                  Review queue
                </div>
              </div>
              {reviewQueue.length ? (
                <div style={{ display: 'grid', gap: 9 }}>
                  {reviewQueue.map((concept) => (
                    <div key={`review-${concept.key}`} style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 9 }}>
                      <div style={{ fontSize: 12, fontWeight: 850, color: T.text, lineHeight: 1.35 }}>{concept.label}</div>
                      <div style={{ fontSize: 10, color: T.textMuted, lineHeight: 1.45, marginTop: 3 }}>
                        {concept.stale
                          ? `Last touched ${formatRecentDate(concept.lastReviewDate)}`
                          : concept.weak
                            ? 'Mastery is still below the strong threshold'
                            : 'Needs more signal coverage'}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: 12, color: T.textSec, lineHeight: 1.5 }}>
                  No urgent weak spots. Keep adding signal coverage across practice, recall, and application.
                </div>
              )}
            </div>

            <div style={{
              borderRadius: 18,
              border: `1px solid ${T.tealBorder}`,
              background: 'linear-gradient(145deg,var(--theme-primary-dim),rgba(255,255,255,0.035))',
              padding: 14,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <IconGlyph name="sparkles" size={15} strokeWidth={2.4} color={T.teal} />
                <div style={{ fontSize: 10, fontWeight: 900, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                  Strongest concept
                </div>
              </div>
              <div style={{ fontSize: 14, fontWeight: 900, color: T.text, lineHeight: 1.35 }}>
                {topConcept?.label || 'No concept yet'}
              </div>
              <div style={{ fontSize: 11, color: T.textMuted, marginTop: 5, lineHeight: 1.45 }}>
                {topConcept
                  ? `${Math.round(topConcept.masteryScore)}% mastery with ${topConcept.completedTasks} completed signal${topConcept.completedTasks === 1 ? '' : 's'}.`
                  : 'Complete your first task to create a signal.'}
              </div>
            </div>
          </aside>
        </div>
      )}
    </section>
  )
}

// ─── Consistency grade ────────────────────────────────────────────────────────
function consistencyGrade(completedDays, totalDays, currentStreak) {
  if (totalDays === 0) return { grade:'—', color:T.textMuted, desc:'No data yet' }
  const rate = completedDays / totalDays
  if (rate >= 0.90 || (rate >= 0.70 && currentStreak >= 14)) return { grade:'A+', color:T.teal,    desc:'Outstanding consistency' }
  if (rate >= 0.75 || (rate >= 0.50 && currentStreak >= 7))  return { grade:'A',  color:T.teal,    desc:'Excellent momentum'      }
  if (rate >= 0.60)                         return { grade:'B',  color:T.blue,    desc:'Solid progress'          }
  if (rate >= 0.45)                         return { grade:'C',  color:T.amber,   desc:'Room to grow'            }
  if (rate >= 0.25)                         return { grade:'D',  color:T.flame,   desc:'Showing up is step one'  }
  return { grade:'F', color:T.textMuted, desc:'Let\'s get back on track' }
}

// ─── Personal best card ───────────────────────────────────────────────────────
function PersonalBestCard({ longestStreak, totalMissions, totalXp, delay=0 }) {
  const items = [
    { label:'Best streak',     value:`${longestStreak} days`, icon:'flame', color:T.flame  },
    { label:'Missions done',   value:totalMissions,            icon:'check_circle',  color:T.teal   },
    { label:'Total XP earned', value:totalXp.toLocaleString(), icon:'bolt', color:T.amber  },
  ]
  return (
    <div style={{
      background:T.surface, border:`1px solid ${T.border}`,
      borderRadius:18, padding:'18px 16px',
      backdropFilter:'blur(16px)', WebkitBackdropFilter:'blur(16px)',
      animation:`fadeUp 0.40s ${delay}s both`,
    }}>
      <div style={{ fontSize:12, fontWeight:700, color:T.textMuted,
        textTransform:'uppercase', letterSpacing:'1px', marginBottom:14 }}>
        Personal bests
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        {items.map((item, i) => (
          <div key={i} style={{
            display:'flex', alignItems:'center', gap:12,
            padding:'8px 0',
            borderBottom: i < items.length-1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
          }}>
            <span style={{ width:24, textAlign:'center', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', color:item.color }}>
              <IconGlyph name={item.icon} size={18} strokeWidth={2.3}/>
            </span>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:11, color:T.textMuted, fontWeight:600 }}>{item.label}</div>
              <div style={{ fontSize:17, fontWeight:900, color:item.color, lineHeight:1.2 }}>{item.value}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── "Ahead of last week" comparison card ────────────────────────────────────
function MomentumCard({ rows }) {
  const { thisWeek, lastWeek, diff } = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    let tw = 0, lw = 0

    for (const row of rows) {
      if (!row.task_date && !row.created_at) continue
      const d = new Date(row.task_date || row.created_at)
      d.setHours(0, 0, 0, 0)
      const diffDays = Math.round((today - d) / (1000*60*60*24))
      const tasks    = Array.isArray(row.tasks) ? row.tasks : []
      const done     = tasks.filter(t => t.completed).length
      if (diffDays < 7)       tw += done
      else if (diffDays < 14) lw += done
    }
    return { thisWeek: tw, lastWeek: lw, diff: tw - lw }
  }, [rows])

  if (thisWeek === 0 && lastWeek === 0) return null

  const isAhead  = diff > 0
  const isSame   = diff === 0
  const color    = isAhead ? T.teal : isSame ? T.amber : T.textMuted
  const icon     = isAhead ? '↑' : isSame ? '→' : '↓'
  const message  = isAhead
    ? `You're ahead of last week by ${diff} task${diff===1?'':'s'}`
    : isSame
    ? 'Matching last week — keep going'
    : `${Math.abs(diff)} fewer than last week — time to accelerate`

  return (
    <div style={{
      background: isAhead ? T.tealDim : T.surface,
      border:`1px solid ${isAhead ? T.tealBorder : T.border}`,
      borderRadius:16, padding:'14px 16px',
      display:'flex', alignItems:'center', gap:12,
      backdropFilter:'blur(16px)', WebkitBackdropFilter:'blur(16px)',
      animation:'fadeUp 0.40s 0.25s both',
    }}>
      <div style={{
        width:36, height:36, borderRadius:'50%',
        background: isAhead ? 'rgba(14,245,194,0.15)' : 'rgba(255,255,255,0.05)',
        display:'flex', alignItems:'center', justifyContent:'center',
        fontSize:18, fontWeight:900, color, flexShrink:0,
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize:13, fontWeight:700, color }}>{message}</div>
        <div style={{ fontSize:11, color:T.textMuted, marginTop:2 }}>
          This week: {thisWeek} tasks · Last week: {lastWeek} tasks
        </div>
      </div>
    </div>
  )
}

// ─── Streak card ──────────────────────────────────────────────────────────────
function StreakCard({ current, longest }) {
  const label = streakStatusLabel(current)
  return (
    <div style={{
      background: current > 0
        ? 'linear-gradient(145deg,rgba(255,107,53,0.12),rgba(255,107,53,0.05))'
        : T.surface,
      border:`1px solid ${current>0 ? T.flameBorder : T.border}`,
      borderRadius:18, padding:'18px 16px',
      backdropFilter:'blur(16px)', WebkitBackdropFilter:'blur(16px)',
      animation:'fadeUp 0.40s 0.10s both',
    }}>
      <div style={{ fontSize:11, fontWeight:700, color:T.textMuted,
        textTransform:'uppercase', letterSpacing:'1px', marginBottom:10 }}>
        Streak
      </div>

      <div style={{ display:'flex', alignItems:'baseline', gap:8, marginBottom:4 }}>
        <span style={{ fontSize:48, fontWeight:900, color: current > 0 ? T.flame : T.textMuted,
          letterSpacing:'-2px', lineHeight:1 }}>
          {current}
        </span>
        <span style={{ fontSize:14, color:T.textMuted }}>days</span>
        {current > 0 && <IconGlyph name="flame" size={20} strokeWidth={2.3} color={T.flame}/>}
      </div>

      {label && (
        <div style={{ fontSize:12, color:T.flame, fontWeight:700, marginBottom:8 }}>{label}</div>
      )}

      <div style={{
        height:1, background:'rgba(255,255,255,0.06)', marginBottom:10,
      }}/>

      <div style={{ display:'flex', justifyContent:'space-between' }}>
        <div>
          <div style={{ fontSize:10, color:T.textMuted, fontWeight:600, marginBottom:2 }}>Best streak</div>
          <div style={{ fontSize:17, fontWeight:800, color: longest >= current && longest > 0 ? T.amber : T.textSec }}>
            {longest} days
          </div>
        </div>
        {current === longest && current > 0 && (
          <div style={{
            fontSize:11, fontWeight:700, color:'#06060f',
            background:T.amber, padding:'3px 10px',
            borderRadius:9999, alignSelf:'center',
          }}>
            Personal best!
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main Stats Page ──────────────────────────────────────────────────────────
export default function StatsPage() {
  const router = useRouter()

  const [loading,    setLoading]    = useState(true)
  const [rows,       setRows]       = useState([])
  const [progress,   setProgress]   = useState(null)
  const [masteries,  setMasteries]  = useState([])
  const [goal,       setGoal]       = useState(null)
  const [activeTheme, setActiveTheme] = useState('default')
  const [claimedModuleRewardIds, setClaimedModuleRewardIds] = useState([])
  const [earnedBadgeIds, setEarnedBadgeIds] = useState(new Set())

  const themeVars = useMemo(() => getDashboardThemeVars(activeTheme), [activeTheme])
  const pageThemeStyle = useMemo(() => ({
    ...themeVars,
    background:'radial-gradient(circle at top, var(--theme-page-glow), transparent 34%), var(--theme-bg)',
  }), [themeVars])

  const load = useCallback(async () => {
    setLoading(true)
    try {
    const { user: me } = await getSafeSupabaseUser()
    if (!me) { router.push('/login'); return }

    if (isLocalAccessUser(me)) {
      const localBundle = await getLocalGoalBundleWithRepairs(me.id)
      if (!localBundle?.goal) {
        setGoal(null)
        setRows([])
        setProgress(null)
        setMasteries([])
        setEarnedBadgeIds(new Set())
        setClaimedModuleRewardIds([])
        setLoading(false)
        return
      }

      setGoal(hydrateGoalCourseOutline(localBundle.goal))
      setRows(localBundle.rows || [])
      setProgress(localBundle.progress || null)
      setMasteries(localBundle.conceptMastery || [])
      setEarnedBadgeIds(new Set(localBundle.achievements || []))
      setClaimedModuleRewardIds([])
      setActiveTheme(getStoredActiveTheme(getStoredOwnedThemes()))
      setLoading(false)
      return
    }

    const { data: activeGoal } = await supabaseData
      .from('goals').select('*').eq('user_id', me.id).eq('status','active')
      .order('created_at', { ascending:false }).limit(1).maybeSingle()
    if (!activeGoal) { setLoading(false); return }
    const hydratedGoal = hydrateGoalCourseOutline(activeGoal)
    setGoal(hydratedGoal)

    const [{ data: taskRows }, { data: prog }, { data: mast }, { data: badges }, { data: txRows }] = await Promise.all([
      supabaseData.from('daily_tasks').select('*')
        .eq('goal_id', hydratedGoal.id).eq('user_id', me.id)
        .order('day_number', { ascending:true }),
      supabaseData.from('user_progress').select('*')
        .eq('goal_id', hydratedGoal.id).eq('user_id', me.id).maybeSingle(),
      supabaseData.from('concept_mastery').select('*')
        .eq('goal_id', hydratedGoal.id).eq('user_id', me.id)
        .order('mastery_score', { ascending:false }),
      supabaseData.from('achievements').select('badge_id')
        .eq('user_id', me.id),
      supabaseData.from('gem_transactions').select('reason')
        .eq('goal_id', hydratedGoal.id).eq('user_id', me.id),
    ])

    setRows(taskRows || [])
    setProgress(prog || null)
    setMasteries(mast || [])
    setEarnedBadgeIds(new Set((badges || []).map(b => b.badge_id)))
    setClaimedModuleRewardIds(getClaimedModuleRewardIds(txRows || []))

    const serverOwnedThemes = Array.from(new Set(
      (txRows || [])
        .map((row) => THEME_REASON_TO_ID[row.reason])
        .filter(Boolean),
    ))
    const mergedOwnedThemes = Array.from(new Set([...getStoredOwnedThemes(), ...serverOwnedThemes]))
    setStoredOwnedThemes(mergedOwnedThemes)
    setActiveTheme(getStoredActiveTheme(mergedOwnedThemes))

    trackStatsViewed({
      userId: me.id,
      goalId: hydratedGoal.id,
      streakValue: prog?.current_streak || 0,
      xpBalance:   prog?.total_xp || 0,
    })

    setLoading(false)
    } catch (loadError) {
      console.warn('[PathAI] stats_load_failed', loadError?.message || 'unknown_error')
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    const timer = setTimeout(() => {
      load().catch(() => {})
    }, 0)

    return () => clearTimeout(timer)
  }, [load])

  // ── Derived stats ──────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const xp             = Number(progress?.total_xp)     || 0
    const currentStreak  = Number(progress?.current_streak)|| 0
    const longestStreak  = Number(progress?.longest_streak)|| 0
    const levelProg      = getLevelProgress(xp)
    const completedRows  = rows.filter(r => r.completion_status === 'completed')
    const totalMissions  = completedRows.length
    const totalDays      = rows.length

    const studyMinsTotal = rows.reduce((acc, row) => {
      const tasks = Array.isArray(row.tasks) ? row.tasks : []
      return acc + tasks.filter(t => t.completed).reduce((s, t) => s + (Number(t.estimatedTimeMin || t.durationMin) || 0), 0)
    }, 0)

    // This week study minutes
    const now = new Date()
    const weekMins = rows.reduce((acc, row) => {
      const d = new Date(row.task_date || row.created_at)
      if (!d || isNaN(d)) return acc
      const diff = (now - d) / (1000*60*60*24)
      if (diff > 7) return acc
      const tasks = Array.isArray(row.tasks) ? row.tasks : []
      return acc + tasks.filter(t => t.completed).reduce((s, t) => s + (Number(t.estimatedTimeMin || t.durationMin) || 0), 0)
    }, 0)

    const grade = consistencyGrade(totalMissions, totalDays, currentStreak)

    return { xp, currentStreak, longestStreak, levelProg, totalMissions,
      totalDays, studyMinsTotal, weekMins, grade }
  }, [rows, progress])

  const tracker = useMemo(() => buildPathOutlineTracker({
    courseOutline: goal?.course_outline,
    rows,
    goalText: goal?.goal_text || '',
    claimedModuleRewardIds,
  }), [goal?.course_outline, goal?.goal_text, rows, claimedModuleRewardIds])

  // ── Nav ────────────────────────────────────────────────────────────────────
  const handleNav = useCallback((tab) => {
    if (tab === 'home') router.push('/dashboard')
    if (tab === 'path') router.push('/path')
  }, [router])

  return (
    <>
      <style>{KEYFRAMES}</style>
      <div style={{
        ...pageThemeStyle,
        minHeight:'100vh',
        fontFamily:T.font, color:T.text,
        paddingBottom:90,
      }}>

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div style={{
          position:'sticky', top:0, zIndex:200,
          background:T.chrome,
          borderBottom:`1px solid ${T.border}`,
          backdropFilter:'blur(28px)', WebkitBackdropFilter:'blur(28px)',
          padding:'16px 20px',
        }}>
          <div className="stats-page-inner">
            <div style={{ fontSize:10, fontWeight:800, color:T.textMuted,
              letterSpacing:'1.5px', textTransform:'uppercase', marginBottom:2 }}>
              Progress
            </div>
            <div style={{ fontSize:22, fontWeight:900, color:T.text, letterSpacing:'-0.5px' }}>
              Your stats
            </div>
            <div style={{ fontSize:12, color:T.textSec, marginTop:6, lineHeight:1.5 }}>
              {tracker.latestIdentityLabel
                ? `${tracker.latestIdentityLabel} · ${tracker.sealedModules} module seal${tracker.sealedModules === 1 ? '' : 's'} earned`
                : 'Master modules to earn an identity title and seal collection'}
            </div>
          </div>
        </div>

        {/* ── Content ────────────────────────────────────────────────────── */}
        <div className="stats-page-inner" style={{ paddingTop:20 }}>

          {loading ? (
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <Skeleton h={110} r={18}/>
              <div className="stats-hero-grid">
                <Skeleton h={90} r={18}/><Skeleton h={90} r={18}/>
              </div>
              <Skeleton h={120} r={18}/>
              <Skeleton h={90} r={18}/>
            </div>
          ) : !goal ? (
            <div style={{ textAlign:'center', padding:'60px 20px' }}>
              <div style={{
                width:64,height:64,margin:'0 auto 16px',borderRadius:22,
                display:'flex',alignItems:'center',justifyContent:'center',
                background:'rgba(255,255,255,0.04)',border:`1px solid ${T.border}`,color:T.textSec,
              }}>
                <IconGlyph name="chart" size={26} strokeWidth={2.2}/>
              </div>
              <div style={{ fontSize:16, fontWeight:700, color:T.text, marginBottom:8 }}>No goal active</div>
              <div style={{ fontSize:13, color:T.textMuted, marginBottom:24 }}>
                Start your first learning path to see stats.
              </div>
              <button onClick={() => router.push('/onboarding')} style={{
                padding:'12px 24px', background:'linear-gradient(135deg,#0ef5c2,#00d4ff)',
                border:'none', borderRadius:12, color:'#06060f',
                fontSize:14, fontWeight:800, cursor:'pointer', fontFamily:T.font,
              }}>Get Started</button>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

              <div style={{
                background: tracker.latestIdentityLabel
                  ? 'linear-gradient(145deg, rgba(251,191,36,0.12), rgba(255,255,255,0.04))'
                  : 'linear-gradient(145deg, rgba(129,140,248,0.10), rgba(255,255,255,0.03))',
                border:`1px solid ${tracker.latestIdentityLabel ? 'rgba(251,191,36,0.24)' : T.masteryBdr}`,
                borderRadius:20,
                padding:'18px 16px',
                backdropFilter:'blur(16px)',
                WebkitBackdropFilter:'blur(16px)',
                animation:'fadeUp 0.40s 0.03s both',
              }}>
                <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:14}}>
                  <div style={{minWidth:0}}>
                    <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
                      <div style={{
                        width:34,height:34,borderRadius:12,flexShrink:0,
                        display:'flex',alignItems:'center',justifyContent:'center',
                        background:tracker.latestIdentityLabel ? 'rgba(251,191,36,0.14)' : 'rgba(129,140,248,0.14)',
                        border:`1px solid ${tracker.latestIdentityLabel ? 'rgba(251,191,36,0.24)' : T.masteryBdr}`,
                        color:tracker.latestIdentityLabel ? T.amber : T.mastery,
                      }}>
                        <IconGlyph name="badge" size={16} strokeWidth={2.3} color={tracker.latestIdentityLabel ? T.amber : T.mastery}/>
                      </div>
                      <div style={{fontSize:11,fontWeight:900,color:T.textMuted,letterSpacing:'0.12em',textTransform:'uppercase'}}>
                        Path Identity
                      </div>
                    </div>
                    <div style={{fontSize:22,fontWeight:900,color:T.text,letterSpacing:'-0.6px',lineHeight:1.15,marginBottom:8}}>
                      {tracker.latestIdentityLabel || 'Identity in progress'}
                    </div>
                    <div style={{fontSize:13,color:T.textSec,lineHeight:1.6}}>
                      {tracker.latestIdentityLabel
                        ? `Earned through module mastery, not purchases. Current frontier: ${tracker.breadcrumb.moduleTitle || goal.goal_text || 'your active path'}.`
                        : 'Clear full modules, score well across quizzes and challenges, and your first earned title will appear here.'}
                    </div>
                  </div>
                  <div style={{
                    minWidth:112,
                    borderRadius:18,
                    border:`1px solid ${T.border}`,
                    background:'rgba(255,255,255,0.04)',
                    padding:'14px 12px',
                    textAlign:'center',
                  }}>
                    <div style={{fontSize:10,fontWeight:900,color:T.textMuted,letterSpacing:'0.12em',textTransform:'uppercase',marginBottom:6}}>
                      Module seals
                    </div>
                    <div style={{fontSize:28,fontWeight:900,color:tracker.sealedModules > 0 ? T.amber : T.text,lineHeight:1}}>
                      {tracker.sealedModules}
                    </div>
                    <div style={{fontSize:11,color:T.textMuted,marginTop:5}}>
                      of {tracker.totalModules}
                    </div>
                  </div>
                </div>
              </div>

              {/* Level ring */}
              <LevelRing
                level={stats.levelProg.level}
                title={stats.levelProg.title}
                pct={stats.levelProg.pct}
                xpInLevel={stats.levelProg.xpInLevel}
                xpForLevel={stats.levelProg.xpForLevel}
              />

              {/* Streak card */}
              <StreakCard current={stats.currentStreak} longest={stats.longestStreak} />

              {/* Hero stats grid */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <HeroStat
                  label="Missions done"
                  value={stats.totalMissions}
                  color={T.teal}
                  sub={`of ${stats.totalDays} total days`}
                  delay={0.10}
                />
                <HeroStat
                  label="Total XP"
                  value={stats.xp.toLocaleString()}
                  color={T.amber}
                  sub={`${LEVEL_TITLES[Math.max(0, Math.min(stats.levelProg.level-1, 19))]}`}
                  delay={0.12}
                />
                <HeroStat
                  label="Study minutes"
                  value={`${Math.round(stats.weekMins)}m`}
                  color={T.blue}
                  sub="this week"
                  delay={0.14}
                />
                <HeroStat
                  label="Consistency"
                  value={stats.grade.grade}
                  color={stats.grade.color}
                  sub={stats.grade.desc}
                  delay={0.16}
                />
              </div>

              {/* Concept heat map */}
              <ConceptHeatMap rows={rows} masteries={masteries} />

              {/* Momentum comparison */}
              <MomentumCard rows={rows} />

              {/* Weekly bar chart */}
              <WeeklyChart rows={rows} />

              {/* Personal bests */}
              <PersonalBestCard
                longestStreak={stats.longestStreak}
                totalMissions={stats.totalMissions}
                totalXp={stats.xp}
                delay={0.20}
              />

              {/* Achievement vault */}
              <div style={{ animation:'fadeUp 0.40s 0.24s both' }}>
                <BadgeShowcase earnedIds={earnedBadgeIds} maxWidth={980} outerPadding="0 0 4px" />
              </div>

              {/* Portfolio link */}
              <a href="/portfolio" style={{
                display:'flex', alignItems:'center', justifyContent:'space-between',
                padding:'16px 18px', borderRadius:16,
                background:T.surface, border:`1px solid ${T.border}`,
                backdropFilter:'blur(16px)', WebkitBackdropFilter:'blur(16px)',
                textDecoration:'none', cursor:'pointer',
                animation:'fadeUp 0.40s 0.23s both',
              }}>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <IconGlyph name="rocket" size={18} strokeWidth={2.3} color={T.teal}/>
                  <div>
                    <div style={{ fontSize:14, fontWeight:700, color:T.text }}>My Portfolio</div>
                    <div style={{ fontSize:11, color:T.textMuted }}>View completed projects & AI reviews</div>
                  </div>
                </div>
                <span style={{ color:T.textMuted, fontSize:18 }}>›</span>
              </a>

              {/* Mastery list */}
              <div style={{
                background:T.surface, border:`1px solid ${T.border}`,
                borderRadius:18, padding:'18px 16px',
                backdropFilter:'blur(16px)', WebkitBackdropFilter:'blur(16px)',
                animation:'fadeUp 0.40s 0.22s both',
              }}>
                <div style={{ fontSize:12, fontWeight:700, color:T.textMuted,
                  textTransform:'uppercase', letterSpacing:'1px', marginBottom:14 }}>
                  Concept mastery
                </div>
                <MasteryList masteries={masteries} loading={false} />
              </div>

              {/* Total study time */}
              {stats.studyMinsTotal > 0 && (
                <div style={{
                  background:T.surface, border:`1px solid ${T.border}`,
                  borderRadius:16, padding:'14px 16px',
                  display:'flex', alignItems:'center', gap:12,
                  backdropFilter:'blur(16px)', WebkitBackdropFilter:'blur(16px)',
                  animation:'fadeUp 0.40s 0.25s both',
                }}>
                  <div style={{
                    width:38,height:38,borderRadius:14,flexShrink:0,
                    display:'flex',alignItems:'center',justifyContent:'center',
                    background:T.masteryDim,border:`1px solid ${T.masteryBdr}`,
                    color:T.mastery,
                  }}>
                    <IconGlyph name="timer" size={18} strokeWidth={2.3} color={T.mastery}/>
                  </div>
                  <div>
                    <div style={{ fontSize:20, fontWeight:900, color:T.mastery }}>
                      {stats.studyMinsTotal >= 60
                        ? `${Math.floor(stats.studyMinsTotal/60)}h ${stats.studyMinsTotal%60}m`
                        : `${stats.studyMinsTotal}m`}
                    </div>
                    <div style={{ fontSize:11, color:T.textMuted }}>total study time</div>
                  </div>
                </div>
              )}

            </div>
          )}
        </div>

        <TabBar onNav={handleNav} />
      </div>
    </>
  )
}
