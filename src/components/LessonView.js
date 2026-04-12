'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import AIAssistant from '@/components/AIAssistant'
import ConfidenceSelector from '@/components/ConfidenceSelector'
import DiagramView, { KeyConceptCard } from '@/components/DiagramView'
import IconGlyph from '@/components/IconGlyph'
import LessonGate from '@/components/LessonGate'
import Mascot from '@/components/Mascot'

const font = "'Plus Jakarta Sans','DM Sans',system-ui,sans-serif"

const LESSON_CSS = `
  @keyframes fadeIn  { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes spin    { to   { transform: rotate(360deg); } }
  @keyframes sectionReveal {
    from { opacity: 0; transform: translateY(12px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes sectionSlideIn {
    from { opacity: 0; transform: translateX(15px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  @keyframes mascotBubbleIn {
    from { opacity: 0; transform: scale(0.8) translateY(8px); }
    to   { opacity: 1; transform: scale(1) translateY(0); }
  }
  @media (prefers-reduced-motion: reduce) {
    @keyframes fadeIn { from { opacity: 0; transform: none; } to { opacity: 1; transform: none; } }
    @keyframes sectionReveal { from { opacity: 0; transform: none; } to { opacity: 1; transform: none; } }
    @keyframes sectionSlideIn { from { opacity: 0; transform: none; } to { opacity: 1; transform: none; } }
  }
`

const TOTAL_PHASES = 6

function LessonSection({ eyebrow, title, children, accent = '#0ef5c2', revealed = true }) {
  if (!revealed) return null
  return (
    <section
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 24,
        padding: '22px 22px 24px',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
        animation: 'sectionReveal 0.4s ease both',
      }}
    >
      {eyebrow && (
        <div
          style={{
            marginBottom: 10,
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: accent,
          }}
        >
          {eyebrow}
        </div>
      )}
      {title && (
        <h2
          style={{
            margin: 0,
            marginBottom: 12,
            fontSize: 22,
            lineHeight: 1.2,
            fontWeight: 800,
            color: '#f5f5f7',
            letterSpacing: '-0.02em',
          }}
        >
          {title}
        </h2>
      )}
      {children}
    </section>
  )
}

function BulletList({ items, accent = '#0ef5c2' }) {
  if (!Array.isArray(items) || items.length === 0) return null
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {items.map((item, index) => (
        <div key={`${item}-${index}`} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <div
            style={{
              marginTop: 8,
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: accent,
              boxShadow: `0 0 16px ${accent}66`,
              flexShrink: 0,
            }}
          />
          <p style={{ margin: 0, color: '#c8d6e5', fontSize: 15, lineHeight: 1.7 }}>{item}</p>
        </div>
      ))}
    </div>
  )
}

function ensureParagraphs(text = '') {
  return String(text || '')
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean)
}

function ProgressBar({ current, total }) {
  const pct = Math.round((current / Math.max(1, total - 1)) * 100)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ fontSize: 12, color: '#8e8e93', fontWeight: 700, whiteSpace: 'nowrap' }}>
        {current >= total - 1 ? 'Complete' : `Step ${Math.max(1, current + 1)} of ${total}`}
      </div>
      <div
        style={{
          width: 80,
          height: 4,
          borderRadius: 9999,
          background: 'rgba(255,255,255,0.08)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${pct}%`,
            background: 'linear-gradient(90deg,#0ef5c2,#00d4ff)',
            borderRadius: 9999,
            transition: 'width 0.5s ease',
          }}
        />
      </div>
    </div>
  )
}

function firstSentence(text = '') {
  const sentence = String(text || '').split(/(?<=[.!?])\s+/)[0]
  return sentence || 'One clear mental model before the next task.'
}

function buildVisualConfig(section, lessonDoc, accent = '#0ef5c2') {
  const title = lessonDoc?.title || 'Today\'s concept'
  const takeaways = Array.isArray(lessonDoc?.keyTakeaways) ? lessonDoc.keyTakeaways : []
  const walkthrough = Array.isArray(lessonDoc?.workedExample?.walkthrough) ? lessonDoc.workedExample.walkthrough : []

  if (section === 'explanation') {
    return {
      type: 'flowchart',
      title: 'Mental model',
      nodes: [
        { id: 'name', label: `Name ${title}`, color: accent, edgeLabel: 'then' },
        { id: 'notice', label: 'Notice when it matters', color: '#00d4ff', edgeLabel: 'then' },
        { id: 'use', label: 'Use it once on purpose', color: '#A78BFA' },
      ],
    }
  }

  if (section === 'why') {
    return {
      type: 'comparison',
      title: 'Before vs after',
      nodes: [
        { id: 'before', label: 'Without the idea', color: '#FBBF24' },
        { id: 'after', label: 'With the idea', color: accent },
        { id: 'guess', label: 'Guessing', color: '#F59E0B' },
        { id: 'decide', label: 'Clear decision', color: '#0ef5c2' },
      ],
    }
  }

  if (section === 'workedExample') {
    return {
      type: 'steps',
      title: 'Worked path',
      nodes: (walkthrough.length > 0 ? walkthrough : ['Name the idea', 'Apply it', 'Check the result']).slice(0, 5).map((item, index) => ({
        id: `step-${index}`,
        label: item.replace(/^step\s*\d+[:.)-]?\s*/i, '').slice(0, 56),
        color: index === 0 ? accent : index === 1 ? '#00d4ff' : '#A78BFA',
      })),
    }
  }

  if (section === 'mistake') {
    return {
      type: 'comparison',
      title: 'Spot the move',
      nodes: [
        { id: 'mistake', label: 'The tempting mistake', color: '#FF8C42' },
        { id: 'fix', label: 'The better move', color: accent },
        { id: 'vague', label: 'Vague output', color: '#FF453A' },
        { id: 'specific', label: 'Specific reasoning', color: '#34D399' },
      ],
    }
  }

  if (section === 'takeaways') {
    return {
      type: 'hierarchy',
      title: 'What sticks',
      nodes: [
        { id: 'core', label: title, color: accent },
        ...(takeaways.length > 0 ? takeaways : ['Explain it', 'Use it', 'Avoid the mistake']).slice(0, 4).map((item, index) => ({
          id: `takeaway-${index}`,
          label: item.slice(0, 58),
          color: ['#0ef5c2', '#00d4ff', '#A78BFA', '#FBBF24'][index] || accent,
        })),
      ],
    }
  }

  return null
}

function LessonVisual({ section, lessonDoc, fallbackText, accent = '#0ef5c2' }) {
  const config = buildVisualConfig(section, lessonDoc, accent)
  if (config) return <DiagramView {...config} accent={accent} />
  return (
    <KeyConceptCard
      term={lessonDoc?.title || 'Key concept'}
      definition={fallbackText || firstSentence(lessonDoc?.hook)}
      accent={accent}
    />
  )
}

export default function LessonViewer({
  concept,
  taskTitle,
  goal,
  knowledge,
  lessonKey,
  presetLesson = null,
  sourceTask = null,
  aiMode = 'hint',
  onClose,
  onComplete,
}) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [lessonDoc, setLessonDoc] = useState(null)
  const [resource, setResource] = useState(null)
  const [generationMode, setGenerationMode] = useState('ai')
  const [reloadTick, setReloadTick] = useState(0)
  const [assistantUsageCount, setAssistantUsageCount] = useState(0)
  const [confidenceLevel, setConfidenceLevel] = useState('')
  const [reflection, setReflection] = useState('')
  const [submitting, setSubmitting] = useState(false)
  // Gated sections: 0 hook, 1 explanation, 2 why/example, 3 mistake, 4 takeaways, 5 completion checkpoint.
  const [currentSection, setCurrentSection] = useState(0)
  const [readyForCompletion, setReadyForCompletion] = useState(false)
  const [mascotPose, setMascotPose] = useState('default')
  const [mascotMessage, setMascotMessage] = useState(null)

  const startTimeRef = useRef(null)
  const scrollRef = useRef(null)
  const explanationRef = useRef(null)
  const whyRef = useRef(null)
  const mistakeRef = useRef(null)
  const takeawaysRef = useRef(null)
  const checkpointRef = useRef(null)
  const mascotTimerRef = useRef(null)

  const cacheKey = useMemo(() => {
    const fallbackKey = `${goal || 'goal'}::${concept || 'concept'}::${taskTitle || 'task'}`
    return `pathai.concept.v6::${lessonKey || fallbackKey}`
  }, [goal, concept, taskTitle, lessonKey])

  const sourceTaskPayload = useMemo(() => ({
    description: sourceTask?.description || '',
    action: sourceTask?.action || '',
    outcome: sourceTask?.outcome || '',
    resourceUrl: sourceTask?.resourceUrl || '',
    resourceTitle: sourceTask?.resourceTitle || '',
    learningContract: sourceTask?._learningContract || sourceTask?.learningContract || sourceTask?.lessonSeed?.learningContract || null,
  }), [sourceTask])

  useEffect(() => {
    async function load() {
      startTimeRef.current = Date.now()
      setLoading(true)
      setError('')
      setLessonDoc(null)
      setCurrentSection(0)
      setReadyForCompletion(false)

      if (presetLesson?.lessonDoc) {
        setLessonDoc(presetLesson.lessonDoc)
        setResource(presetLesson.resource || presetLesson.lessonDoc.resource || null)
        setGenerationMode(presetLesson.generationMode || 'preset')
        setLoading(false)
        return
      }

      if (typeof window !== 'undefined') {
        try {
          const cachedRaw = window.localStorage.getItem(cacheKey)
          if (cachedRaw) {
            const cached = JSON.parse(cachedRaw)
            if (cached?.lessonDoc?.title) {
              setLessonDoc(cached.lessonDoc)
              setResource(cached.resource || cached.lessonDoc.resource || null)
              setGenerationMode(cached.generationMode || 'ai')
              setLoading(false)
              return
            }
          }
        } catch {}
      }

      try {
        const res = await fetch('/api/lesson', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            concept,
            taskTitle,
            goal,
            knowledge,
            taskDescription: sourceTaskPayload.description,
            taskAction: sourceTaskPayload.action,
            taskOutcome: sourceTaskPayload.outcome,
            resourceUrl: sourceTaskPayload.resourceUrl,
            resourceTitle: sourceTaskPayload.resourceTitle,
            learningContract: sourceTaskPayload.learningContract,
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data?.error || 'Failed to load lesson')
        if (!data?.lessonDoc?.title) throw new Error('No concept lesson returned')

        setLessonDoc(data.lessonDoc)
        setResource(data.resource || data.lessonDoc.resource || null)
        setGenerationMode(data.generationMode || 'ai')
        if (typeof window !== 'undefined' && data.cacheable) {
          try {
            window.localStorage.setItem(cacheKey, JSON.stringify({
              lessonDoc: data.lessonDoc,
              resource: data.resource || data.lessonDoc.resource || null,
              generationMode: data.generationMode || 'ai',
              cachedAt: Date.now(),
            }))
          } catch {}
        }
      } catch (loadError) {
        setError(loadError?.message || 'Could not load this lesson right now.')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [cacheKey, concept, goal, knowledge, presetLesson, reloadTick, sourceTaskPayload, taskTitle])

  // Scroll to newly revealed section
  useEffect(() => {
    if (currentSection === 0) return
    const refMap = [null, explanationRef, whyRef, mistakeRef, takeawaysRef, checkpointRef]
    const ref = refMap[currentSection]
    if (ref?.current) {
      setTimeout(() => {
        ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 80)
    }
  }, [currentSection])

  // Unlock completion when all sections revealed
  useEffect(() => {
    if (currentSection >= 5) setReadyForCompletion(true)
  }, [currentSection])

  useEffect(() => () => {
    if (mascotTimerRef.current) window.clearTimeout(mascotTimerRef.current)
  }, [])

  function advanceSection() {
    setCurrentSection((s) => {
      const next = Math.min(s + 1, TOTAL_PHASES - 1)
      if (next === 3) announceMascot('wave', pickMessage('halfway'))
      if (next === 5) announceMascot('celebrate', pickMessage('almostDone'))
      return next
    })
  }

  function pickMessage(type) {
    const pools = {
      correct: ['Nice!', 'Got it!', 'Spot on!', 'You know this!', 'Exactly right!'],
      wrong: ['Try again!', 'Almost!', 'Not quite!', 'Think about it!', 'Close!'],
      halfway: ['Halfway there!', 'Keep it up!', 'You’re cruising!', 'Still with you!', 'Good rhythm!'],
      almostDone: ['Almost done!', 'Final stretch!', 'You’ve got this!', 'Bring it home!', 'One last check!'],
    }
    const list = pools[type] || pools.correct
    return list[Math.floor(Math.random() * list.length)]
  }

  function announceMascot(pose, message, duration = 1600) {
    setMascotPose(pose)
    setMascotMessage(message)
    if (mascotTimerRef.current) window.clearTimeout(mascotTimerRef.current)
    mascotTimerRef.current = window.setTimeout(() => {
      setMascotPose('default')
      setMascotMessage(null)
    }, duration)
  }

  function handleGateFeedback(result) {
    if (result === 'correct') announceMascot('celebrate', pickMessage('correct'))
    else announceMascot('sad', pickMessage('wrong'))
  }

  function handleRetry() {
    if (typeof window !== 'undefined') {
      try { window.localStorage.removeItem(cacheKey) } catch {}
    }
    setReloadTick((v) => v + 1)
    setCurrentSection(0)
    setReadyForCompletion(false)
  }

  function handleComplete() {
    if (!lessonDoc || !readyForCompletion || !confidenceLevel || reflection.trim().length < 20) return
    setSubmitting(true)
    const completionTimeSec = startTimeRef.current
      ? Math.round((Date.now() - startTimeRef.current) / 1000)
      : 0
    onComplete?.({
      fromLesson: true,
      completionTimeSec,
      confidenceLevel,
      assistantUsageCount,
      takeaway: reflection.trim(),
      taughtPointsCount: Array.isArray(lessonDoc.taughtPoints) ? lessonDoc.taughtPoints.length : 0,
    })
  }

  // Pick gate for a given afterSection key
  function getGate(afterSection) {
    if (!lessonDoc?.interactions) return null
    return lessonDoc.interactions.find((g) => g.afterSection === afterSection) || null
  }

  return (
    <>
      <style>{LESSON_CSS}</style>

      <div
        className="overlay-slide-up"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 200,
          background: 'linear-gradient(180deg,#06060f 0%,#080814 100%)',
          fontFamily: font,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* ── Top bar ────────────────────────────────── */}
        <div
          style={{
            padding: '14px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(6,6,15,0.88)',
            backdropFilter: 'blur(28px)',
            WebkitBackdropFilter: 'blur(28px)',
          }}
        >
          <button
            onClick={onClose}
            style={{
              width: 36,
              height: 36,
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.10)',
              borderRadius: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#8e8e93',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                padding: '6px 14px',
                borderRadius: 9999,
                border: '1px solid rgba(14,245,194,0.22)',
                background: 'rgba(14,245,194,0.08)',
                color: '#0ef5c2',
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
              }}
            >
              Concept Lesson
            </div>
            {lessonDoc && <ProgressBar current={currentSection} total={TOTAL_PHASES} />}
          </div>

          <div style={{ width: 36, textAlign: 'right', fontSize: 12, color: generationMode === 'structured' ? '#8e8e93' : '#0ef5c2', fontWeight: 700 }}>
            {generationMode === 'structured' ? 'Ready' : 'AI'}
          </div>
        </div>

        {/* ── Scrollable content ─────────────────────── */}
        <div
          ref={scrollRef}
          style={{ flex: 1, overflowY: 'auto', padding: '24px 20px 160px' }}
        >
          <div style={{ maxWidth: 860, margin: '0 auto', display: 'grid', gap: 18 }}>

            {/* Loading */}
            {loading && (
              <div style={{ textAlign: 'center', paddingTop: 80 }}>
                <div
                  style={{
                    width: 46,
                    height: 46,
                    border: '3px solid rgba(255,255,255,0.06)',
                    borderTopColor: '#0ef5c2',
                    borderRadius: '50%',
                    animation: 'spin 0.65s linear infinite',
                    margin: '0 auto 18px',
                  }}
                />
                <p style={{ margin: 0, color: '#c8d6e5', fontSize: 15 }}>Building a concept lesson that actually teaches the idea…</p>
              </div>
            )}

            {/* Error */}
            {!loading && error && (
              <div style={{ textAlign: 'center', paddingTop: 80 }}>
                <p style={{ color: '#ff8d8d', fontSize: 16, marginBottom: 18 }}>{error}</p>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
                  <button
                    onClick={handleRetry}
                    style={{
                      padding: '12px 22px',
                      borderRadius: 14,
                      border: 'none',
                      background: 'linear-gradient(135deg,#0ef5c2,#00d4ff)',
                      color: '#06060f',
                      fontSize: 15,
                      fontWeight: 800,
                      cursor: 'pointer',
                      fontFamily: font,
                    }}
                  >
                    Try Again
                  </button>
                  {sourceTaskPayload.resourceUrl && (
                    <a
                      href={sourceTaskPayload.resourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        padding: '12px 22px',
                        borderRadius: 14,
                        border: '1px solid rgba(255,255,255,0.12)',
                        background: 'rgba(255,255,255,0.05)',
                        color: '#c8d6e5',
                        fontSize: 15,
                        fontWeight: 700,
                        textDecoration: 'none',
                      }}
                    >
                      Open Resource
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* ── Lesson content ──────────────────────── */}
            {!loading && !error && lessonDoc && (
              <>
                {/* SECTION 0: Hook (always visible) */}
                <section style={{ animation: 'fadeIn 0.28s ease both' }}>
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '7px 14px',
                      borderRadius: 9999,
                      border: '1px solid rgba(14,245,194,0.22)',
                      background: 'rgba(14,245,194,0.07)',
                      color: '#0ef5c2',
                      fontSize: 11,
                      fontWeight: 800,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      marginBottom: 16,
                    }}
                  >
                    <IconGlyph name="book" size={13} strokeWidth={2.4} color="#0ef5c2" />
                    Day Focus
                  </div>
                  <h1
                    style={{
                      margin: 0,
                      color: '#f5f5f7',
                      fontSize: 'clamp(34px, 5vw, 58px)',
                      lineHeight: 1.02,
                      letterSpacing: '-0.05em',
                      fontWeight: 900,
                      maxWidth: 860,
                    }}
                  >
                    {lessonDoc.title}
                  </h1>
                  <div style={{ marginTop: 22 }}>
                    <LessonVisual section="hook" lessonDoc={lessonDoc} fallbackText={lessonDoc.hook} />
                  </div>
                  <p style={{ margin: '18px 0 0', color: '#c8d6e5', fontSize: 18, lineHeight: 1.75, maxWidth: 820 }}>
                    {lessonDoc.hook}
                  </p>
                </section>

                {/* Gate after hook */}
                {currentSection === 0 && (
                  <LessonGate
                    {...(getGate('hook') || { type: 'ready_check' })}
                    onFeedback={handleGateFeedback}
                    onPass={advanceSection}
                  />
                )}

                {/* SECTION 1: Explanation */}
                {currentSection >= 1 && (
                  <div ref={explanationRef}>
                    <LessonSection eyebrow="Plain English" title="What this really means">
                      <div style={{ marginBottom: 18 }}>
                        <LessonVisual section="explanation" lessonDoc={lessonDoc} fallbackText={firstSentence(lessonDoc.plainEnglishExplanation)} />
                      </div>
                      <div style={{ display: 'grid', gap: 14 }}>
                        {ensureParagraphs(lessonDoc.plainEnglishExplanation).map((paragraph, index) => (
                          <p key={index} style={{ margin: 0, color: '#c8d6e5', fontSize: 16, lineHeight: 1.8 }}>
                            {paragraph}
                          </p>
                        ))}
                      </div>
                    </LessonSection>

                    {/* Gate after explanation */}
                    {currentSection === 1 && (
                      <div style={{ marginTop: 18 }}>
                        <LessonGate
                          {...(getGate('explanation') || { type: 'ready_check' })}
                          onFeedback={handleGateFeedback}
                          onPass={advanceSection}
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* SECTION 2: Why It Matters + Worked Example (unlocked together, no gate between) */}
                {currentSection >= 2 && (
                  <div ref={whyRef} style={{ display: 'grid', gap: 18 }}>
                    <LessonSection eyebrow="Why It Matters" title={`Why ${lessonDoc.title} matters`}>
                      <div style={{ marginBottom: 18 }}>
                        <LessonVisual section="why" lessonDoc={lessonDoc} fallbackText={lessonDoc.whyItMatters} />
                      </div>
                      <p style={{ margin: 0, color: '#c8d6e5', fontSize: 16, lineHeight: 1.8 }}>{lessonDoc.whyItMatters}</p>
                    </LessonSection>

                    <LessonSection eyebrow="Worked Example" title={lessonDoc.workedExample?.title || 'Worked example'}>
                      <div style={{ marginBottom: 18 }}>
                        <LessonVisual section="workedExample" lessonDoc={lessonDoc} fallbackText={lessonDoc.workedExample?.setup} accent="#00d4ff" />
                      </div>
                      <p style={{ margin: 0, marginBottom: 16, color: '#c8d6e5', fontSize: 16, lineHeight: 1.8 }}>
                        {lessonDoc.workedExample?.setup}
                      </p>
                      <BulletList items={lessonDoc.workedExample?.walkthrough || []} accent="#00d4ff" />
                      <div
                        style={{
                          marginTop: 18,
                          padding: '14px 16px',
                          borderRadius: 18,
                          background: 'rgba(0,212,255,0.05)',
                          border: '1px solid rgba(0,212,255,0.18)',
                        }}
                      >
                        <div style={{ fontSize: 11, fontWeight: 800, color: '#00d4ff', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
                          What to notice
                        </div>
                        <p style={{ margin: 0, color: '#c8d6e5', fontSize: 15, lineHeight: 1.7 }}>
                          {lessonDoc.workedExample?.result}
                        </p>
                      </div>
                    </LessonSection>

                    {/* Gate after worked example */}
                    {currentSection === 2 && (
                      <LessonGate
                        {...(getGate('workedExample') || { type: 'ready_check' })}
                        onFeedback={handleGateFeedback}
                        onPass={advanceSection}
                      />
                    )}
                  </div>
                )}

                {/* SECTION 3: Common Mistake */}
                {currentSection >= 3 && (
                  <div ref={mistakeRef}>
                    <LessonSection eyebrow="Common Mistake" title="Where people usually trip">
                      <div style={{ marginBottom: 18 }}>
                        <LessonVisual section="mistake" lessonDoc={lessonDoc} fallbackText={lessonDoc.commonMistake?.mistake} accent="#FF8C42" />
                      </div>
                      <div style={{ display: 'grid', gap: 12 }}>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 800, color: '#ff9f7a', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
                            The mistake
                          </div>
                          <p style={{ margin: 0, color: '#f5f5f7', fontSize: 16, lineHeight: 1.75 }}>{lessonDoc.commonMistake?.mistake}</p>
                        </div>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 800, color: '#8e8e93', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
                            Why it happens
                          </div>
                          <p style={{ margin: 0, color: '#c8d6e5', fontSize: 15, lineHeight: 1.75 }}>{lessonDoc.commonMistake?.whyItHappens}</p>
                        </div>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 800, color: '#0ef5c2', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
                            Better move
                          </div>
                          <p style={{ margin: 0, color: '#c8d6e5', fontSize: 15, lineHeight: 1.75 }}>{lessonDoc.commonMistake?.fix}</p>
                        </div>
                      </div>
                    </LessonSection>

                    {/* Gate after common mistake */}
                    {currentSection === 3 && (
                      <div style={{ marginTop: 18 }}>
                        <LessonGate
                          {...(getGate('commonMistake') || { type: 'ready_check' })}
                          onFeedback={handleGateFeedback}
                          onPass={advanceSection}
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* SECTION 4: Takeaways + Bridge + Checkpoint (all unlocked after last gate) */}
                {currentSection >= 4 && (
                  <div ref={takeawaysRef} style={{ display: 'grid', gap: 18 }}>
                    <div style={{ display: 'grid', gap: 18, gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
                      <LessonSection eyebrow="Key Takeaways" title="What should stick">
                        <div style={{ marginBottom: 18 }}>
                          <LessonVisual section="takeaways" lessonDoc={lessonDoc} fallbackText={(lessonDoc.keyTakeaways || [])[0]} />
                        </div>
                        <BulletList items={lessonDoc.keyTakeaways || []} accent="#0ef5c2" />
                      </LessonSection>
                      <LessonSection eyebrow="Taught Scope" title="What later tasks are allowed to use">
                        <div style={{ display: 'grid', gap: 16 }}>
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 800, color: '#00d4ff', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
                              Allowed concepts
                            </div>
                            <BulletList items={lessonDoc.allowedConcepts || []} accent="#00d4ff" />
                          </div>
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 800, color: '#A78BFA', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
                              Taught points
                            </div>
                            <BulletList items={lessonDoc.taughtPoints || []} accent="#A78BFA" />
                          </div>
                        </div>
                      </LessonSection>
                    </div>

                    <LessonSection eyebrow="Bridge" title="What happens next">
                      <p style={{ margin: 0, color: '#c8d6e5', fontSize: 16, lineHeight: 1.8 }}>{lessonDoc.practiceBridge}</p>
                      {resource?.url && (
                        <a
                          href={resource.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            marginTop: 14,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 8,
                            color: '#00d4ff',
                            fontSize: 14,
                            fontWeight: 700,
                            textDecoration: 'none',
                          }}
                        >
                          {resource.title || 'Open supporting resource'} <IconGlyph name="share" size={14} strokeWidth={2.3} color="#00d4ff" />
                        </a>
                      )}
                    </LessonSection>

                    {currentSection === 4 && (
                      <LessonGate
                        {...(getGate('takeaways') || {
                          type: 'reflect',
                          question: 'In your own words, what will you use from this lesson in the next task?',
                        })}
                        onFeedback={handleGateFeedback}
                        onPass={advanceSection}
                      />
                    )}
                  </div>
                )}

                {currentSection >= 5 && (
                  <div ref={checkpointRef}>
                    <LessonSection eyebrow="Checkpoint" title="Finish the handoff into practice">
                      <p style={{ margin: 0, marginBottom: 14, color: '#c8d6e5', fontSize: 16, lineHeight: 1.8 }}>
                        {lessonDoc.completionCheck?.prompt}
                      </p>
                      <BulletList items={lessonDoc.completionCheck?.expectedSignals || []} accent="#0ef5c2" />
                      <div
                        style={{
                          marginTop: 18,
                          padding: '14px 16px',
                          borderRadius: 18,
                          background: 'rgba(14,245,194,0.06)',
                          border: '1px solid rgba(14,245,194,0.2)',
                        }}
                      >
                        <div style={{ fontSize: 12, fontWeight: 800, color: '#0ef5c2', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
                          Lesson checkpoint unlocked
                        </div>
                        <p style={{ margin: 0, color: '#c8d6e5', fontSize: 14, lineHeight: 1.7 }}>
                          {lessonDoc.completionCheck?.nextStep}
                        </p>
                      </div>
                    </LessonSection>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* ── Bottom footer (reflection + completion) ── */}
        {lessonDoc && currentSection >= 5 && (
          <div
            style={{
              padding: '14px 20px 28px',
              borderTop: '1px solid rgba(255,255,255,0.08)',
              background: 'rgba(6,6,15,0.92)',
              backdropFilter: 'blur(28px)',
              WebkitBackdropFilter: 'blur(28px)',
              animation: 'sectionReveal 0.4s ease',
            }}
          >
            <div style={{ maxWidth: 860, margin: '0 auto', display: 'grid', gap: 16 }}>
              <textarea
                value={reflection}
                onChange={(event) => setReflection(event.target.value)}
                placeholder="In your own words: what did you just learn, what mistake will you avoid, and how will you use it in the next task?"
                rows={4}
                style={{
                  width: '100%',
                  padding: '16px 18px',
                  borderRadius: 18,
                  border: '1px solid rgba(255,255,255,0.12)',
                  background: 'rgba(255,255,255,0.04)',
                  color: '#f5f5f7',
                  fontSize: 15,
                  lineHeight: 1.7,
                  fontFamily: font,
                  resize: 'vertical',
                  outline: 'none',
                }}
              />

              <ConfidenceSelector
                value={confidenceLevel}
                onChange={setConfidenceLevel}
                accent="#0ef5c2"
                borderColor="rgba(14,245,194,0.22)"
                background="rgba(14,245,194,0.05)"
                label="How ready are you to use this concept in the next task?"
              />

              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <button
                  onClick={onClose}
                  style={{
                    padding: '14px 22px',
                    borderRadius: 16,
                    border: '1px solid rgba(255,255,255,0.12)',
                    background: 'rgba(255,255,255,0.05)',
                    color: '#8e8e93',
                    fontSize: 15,
                    fontWeight: 700,
                    fontFamily: font,
                    cursor: 'pointer',
                  }}
                >
                  Back
                </button>
                <button
                  onClick={handleComplete}
                  disabled={!confidenceLevel || reflection.trim().length < 20 || submitting}
                  style={{
                    flex: 1,
                    minWidth: 220,
                    padding: '14px 22px',
                    borderRadius: 16,
                    border: 'none',
                    background: !confidenceLevel || reflection.trim().length < 20
                      ? 'rgba(255,255,255,0.05)'
                      : 'linear-gradient(135deg,#0ef5c2,#00d4ff)',
                    color: !confidenceLevel || reflection.trim().length < 20 ? '#636366' : '#06060f',
                    fontSize: 16,
                    fontWeight: 800,
                    fontFamily: font,
                    cursor: submitting ? 'default' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                  }}
                >
                  {submitting ? (
                    <>
                      <div style={{ width: 14, height: 14, border: '2px solid rgba(6,6,15,0.2)', borderTopColor: '#06060f', borderRadius: '50%', animation: 'spin 0.65s linear infinite' }} />
                      Saving…
                    </>
                  ) : (
                    'Complete concept and unlock next task'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Hint in footer when not all sections unlocked yet */}
        {lessonDoc && currentSection < 5 && (
          <div
            style={{
              padding: '12px 20px',
              borderTop: '1px solid rgba(255,255,255,0.06)',
              background: 'rgba(6,6,15,0.85)',
              backdropFilter: 'blur(18px)',
              textAlign: 'center',
            }}
          >
            <p style={{ margin: 0, color: '#636366', fontSize: 13, fontWeight: 600 }}>
              Answer the checkpoint above to unlock the next section
            </p>
          </div>
        )}
      </div>

      {lessonDoc && (
        <div
          style={{
            position: 'fixed',
            right: 18,
            bottom: currentSection >= 5 ? 190 : 74,
            zIndex: 260,
            opacity: mascotMessage ? 1 : 0.62,
            pointerEvents: 'none',
            transition: 'bottom 0.2s ease, opacity 0.2s ease',
          }}
        >
          <Mascot pose={mascotPose} message={mascotMessage} size={44} animate />
        </div>
      )}

      {lessonDoc && (
        <AIAssistant
          concept={concept}
          goal={goal}
          mode={aiMode}
          context={`Concept lesson: ${lessonDoc.title}`}
          onAsk={() => setAssistantUsageCount((count) => count + 1)}
        />
      )}
    </>
  )
}
