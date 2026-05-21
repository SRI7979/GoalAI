'use client'

import { useMemo } from 'react'
import IconGlyph from '@/components/IconGlyph'

const T = {
  surface: 'var(--theme-surface)',
  border: 'var(--theme-border)',
  teal: 'var(--theme-primary)',
  tealDim: 'var(--theme-primary-dim)',
  tealBorder: 'var(--theme-primary-border)',
  blue: 'var(--theme-secondary)',
  flame: 'var(--theme-warm)',
  amber: 'var(--theme-highlight)',
  mastery: 'var(--theme-mastery)',
  masteryDim: 'var(--theme-mastery-dim)',
  text: 'var(--theme-text)',
  textSec: 'var(--theme-text-sec)',
  textMuted: 'var(--theme-text-muted)',
}

const CSS = `
  @keyframes conceptHeatSweep{0%{transform:translateX(-120%);opacity:0}28%{opacity:.7}100%{transform:translateX(120%);opacity:0}}
  @keyframes conceptHeatPop{0%{transform:scale(.92);opacity:.45}70%{transform:scale(1.04);opacity:1}100%{transform:scale(1);opacity:1}}
  .concept-heat-shell{display:grid;grid-template-columns:minmax(0,1fr) 276px;gap:14px;align-items:start}
  .concept-heat-scroll{overflow-x:auto;margin:0 -2px;padding:2px}
  .concept-heat-grid{min-width:820px;display:flex;flex-direction:column;gap:8px}
  .concept-heat-cell{transition:transform .18s ease,border-color .18s ease,box-shadow .18s ease,background .18s ease}
  .concept-heat-cell:hover{transform:translateY(-2px);border-color:rgba(255,255,255,.24)!important}
  .concept-heat-row{transition:transform .18s ease,border-color .18s ease,background .18s ease}
  .concept-heat-row:hover{transform:translateY(-1px);border-color:rgba(255,255,255,.18)!important;background:rgba(255,255,255,.055)!important}
  @media (max-width:900px){.concept-heat-shell{grid-template-columns:1fr}}
  @media (prefers-reduced-motion:reduce){@keyframes conceptHeatSweep{to{}}@keyframes conceptHeatPop{from{opacity:0}to{opacity:1}}}
`

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

function parseDate(value) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function formatRecentDate(value) {
  const date = parseDate(value)
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
  values.push(task?._concept, task?.concept, task?.topic, task?.lessonSeed?.focusConcept)
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
    const rowDate = parseDate(row?.task_date || row?.created_at)
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
    const lastReviewDate = parseDate(entry.masteryRow?.last_review) || entry.lastTouched
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
        animation: completed ? 'conceptHeatPop .34s both' : 'none',
      }}
    >
      {completed > 0 && (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.18),transparent)',
          animation: 'conceptHeatSweep 2.8s ease-in-out infinite',
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

export default function ConceptHeatMap({
  rows = [],
  masteries = [],
  title = 'Concept heat map',
  subtitle = 'What you have learned, where it is strong, and what needs review',
}) {
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
      <style>{CSS}</style>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
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
                {title}
              </div>
              <h2 style={{ fontSize: 24, fontWeight: 950, color: T.text, letterSpacing: '-0.7px', lineHeight: 1.08, marginTop: 2 }}>
                {subtitle}
              </h2>
            </div>
          </div>
          <p style={{ fontSize: 13, color: T.textSec, lineHeight: 1.6, maxWidth: 680 }}>
            Each row is a concept. Each glowing cell shows evidence from lessons, practice, recall, application, and explanation.
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
            <div style={{ borderRadius: 18, border: `1px solid ${T.border}`, background: 'rgba(255,255,255,0.04)', padding: 14 }}>
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
