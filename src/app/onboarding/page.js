'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import IconGlyph from '@/components/IconGlyph'
import { createLocalGoalBundle, isLocalAccessUser } from '@/lib/localGoalStore'
import { EVENTS, track } from '@/lib/analytics'
import { getSafeSupabaseSession, getSafeSupabaseUser, supabaseData } from '@/lib/supabase'
import { consumeSupabaseAuthRedirect } from '@/lib/supabaseAuth'
import {
  buildDomainConfig,
  buildDomainKnowledgeLine,
  normalizeDomain,
  setStoredLearningDomain,
} from '@/lib/domainAdapter'
import { getDomainLabel } from '@/lib/onboardingCalibration'
import { mapAnswersToProfile } from '@/lib/onboardingProfile'

const GEN_STEPS = [
  'Reading your answers…',
  'Mapping your skill graph…',
  'Skipping what you already know…',
  'Generating your first mission…',
  'Your path is ready.',
]

const GOAL_CHIPS = ['Learn Python', 'Speak Spanish for travel', 'Understand calculus', 'Build a SaaS app']

/* ── pure helpers ported from the previous onboarding (curriculum pipeline) ── */
function detectGoalFamily(goal = '') {
  const text = String(goal).toLowerCase()
  if (/machine learning|\bml\b|decision tree|regression|classification|dataset|model/.test(text)) return 'machineLearning'
  if (/javascript|python|react|typescript|coding|code|web/.test(text)) return 'programming'
  if (/spanish|language|french|german|japanese/.test(text)) return 'language'
  if (/design|ui|ux|figma|interface/.test(text)) return 'design'
  return 'general'
}

function shouldBypassPathGeneration(errorMessage = '') {
  return /Failed to fetch|fetch failed|Supabase project URL is unreachable|Unable to reach Supabase|NEXT_PUBLIC_SUPABASE_URL/i.test(String(errorMessage))
}

function estimateGoalHours({ goal = '', domain = '', recommendedLevel, desiredOutcome, prereqComfort }) {
  const text = String(goal).toLowerCase()
  const base = {
    CS_CODING: 32, ML_AI: 48, DATA_SCIENCE: 38, MATHEMATICS: 28, PHYSICS: 30, CHEMISTRY: 30,
    FOREIGN_LANGUAGE: 64, ART_DESIGN: 30, CYBERSECURITY: 36, STATISTICS: 34, FINANCE: 30,
  }[domain] || 28
  let hours = base
  if (/\b(intro|introduction|overview|getting started|beginner|basics of)\b/.test(text)) hours *= 0.7
  if (/\b(build|project|app|website|dashboard|portfolio|tool|automation|saas|game|ship|deploy)\b/.test(text)) hours *= 1.3
  if (/\b(master|expert|professional|career|job|interview|certification|exam|fluent|from scratch|zero to|complete)\b/.test(text)) hours *= 1.45
  if (desiredOutcome === 'career') hours *= 1.18
  if (desiredOutcome === 'understand') hours *= 0.94
  if (recommendedLevel === 'Beginner') hours *= 1.18
  if (recommendedLevel === 'Advanced') hours *= 0.74
  if (prereqComfort === 'full') hours *= 1.18
  if (prereqComfort === 'test_out') hours *= 0.72
  return Math.max(3, Math.min(220, hours))
}

function resolveCadence({ profile, goal, domain }) {
  const paceMap = {
    relaxed: { weekdayMins: 20, weekendMins: 35 },
    balanced: { weekdayMins: 30, weekendMins: 50 },
    intensive: { weekdayMins: 45, weekendMins: 75 },
  }
  const base = paceMap[profile.pace] || paceMap.balanced

  if (profile.pathStyle === 'explore') {
    return { mode: 'explore', days: 0, weekdayMins: base.weekdayMins, weekendMins: base.weekendMins }
  }
  if (profile.timeframeDays && profile.timeframeDays > 0) {
    return { mode: 'goal', days: Math.max(3, Math.min(240, profile.timeframeDays)), weekdayMins: base.weekdayMins, weekendMins: base.weekendMins }
  }
  const avg = ((base.weekdayMins * 5) + (base.weekendMins * 2)) / 7
  const hours = estimateGoalHours({ goal, domain, recommendedLevel: profile.recommendedLevel, desiredOutcome: profile.desiredOutcome, prereqComfort: profile.prereqComfort })
  const days = Math.ceil((hours * 60) / avg)
  return { mode: 'goal', days: Math.max(3, Math.min(240, days)), weekdayMins: base.weekdayMins, weekendMins: base.weekendMins }
}

/* ── small UI atoms (Duolingo / lovable brick aesthetic) ── */
function Bubble({ role, children }) {
  const isUser = role === 'user'
  return (
    <div style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
      <div
        style={{
          maxWidth: '88%',
          padding: '14px 16px',
          borderRadius: isUser ? '18px 18px 6px 18px' : '18px 18px 18px 6px',
          background: isUser ? 'var(--color-primary)' : 'var(--color-surface)',
          color: isUser ? 'var(--color-primary-foreground)' : 'var(--color-foreground)',
          border: isUser ? 'none' : '2px solid var(--color-border)',
          boxShadow: isUser
            ? '0 4px 0 0 var(--color-primary-shadow)'
            : '0 4px 0 0 color-mix(in oklab, var(--color-background) 55%, #000)',
          fontSize: 15,
          fontWeight: isUser ? 700 : 500,
          lineHeight: 1.5,
          animation: 'lovableFadeIn 0.3s ease both',
        }}
      >
        {children}
      </div>
    </div>
  )
}

function Chip({ label, active, onClick, disabled }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="font-display"
      style={{
        padding: '12px 16px',
        borderRadius: 16,
        border: `2px solid ${active ? 'color-mix(in oklab, var(--color-primary) 55%, transparent)' : 'var(--color-border)'}`,
        background: active ? 'color-mix(in oklab, var(--color-primary) 20%, transparent)' : 'var(--color-surface)',
        color: active ? 'var(--color-primary)' : 'var(--color-foreground)',
        boxShadow: active ? '0 4px 0 0 var(--color-primary-shadow)' : '0 4px 0 0 color-mix(in oklab, var(--color-background) 55%, #000)',
        fontSize: 14,
        fontWeight: 800,
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'transform 0.08s, filter 0.15s',
        textAlign: 'left',
      }}
      onMouseDown={(e) => { if (!disabled) e.currentTarget.style.transform = 'translateY(3px)' }}
      onMouseUp={(e) => { e.currentTarget.style.transform = '' }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = '' }}
    >
      {label}
    </button>
  )
}

function CandyButton({ children, onClick, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="font-display"
      style={{
        padding: '15px 24px',
        borderRadius: 16,
        border: 'none',
        background: disabled ? 'var(--color-surface-2)' : 'var(--color-primary)',
        color: disabled ? 'var(--color-muted-foreground)' : 'var(--color-primary-foreground)',
        boxShadow: disabled ? 'none' : '0 6px 0 0 var(--color-primary-shadow)',
        fontSize: 15,
        fontWeight: 800,
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        cursor: disabled ? 'default' : 'pointer',
        width: '100%',
        transition: 'transform 0.08s',
      }}
      onMouseDown={(e) => { if (!disabled) e.currentTarget.style.transform = 'translateY(4px)' }}
      onMouseUp={(e) => { e.currentTarget.style.transform = '' }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = '' }}
    >
      {children}
    </button>
  )
}

export default function OnboardingPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [phase, setPhase] = useState('chat') // 'chat' | 'generating' | 'error'
  const [messages, setMessages] = useState([])
  const [currentQuestion, setCurrentQuestion] = useState(null)
  const [skillConcepts, setSkillConcepts] = useState([])
  const [selectedSkills, setSelectedSkills] = useState({})
  const [customInput, setCustomInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const [genStep, setGenStep] = useState(0)
  const [error, setError] = useState('')

  const goalRef = useRef('')
  const domainRef = useRef('CS_CODING')
  const domainLabelRef = useRef('general')
  const answersRef = useRef({})
  const askedRef = useRef(0)
  const scrollRef = useRef(null)
  const startedRef = useRef(false)
  const runGenerationRef = useRef(null)

  const pushMessage = useCallback((role, text) => {
    setMessages((m) => [...m, { role, text }])
  }, [])

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages, currentQuestion, skillConcepts, thinking])

  /* ── auth + kickoff ── */
  useEffect(() => {
    void (async () => {
      try { await consumeSupabaseAuthRedirect() } catch { /* handled below */ }
      const { user: authUser } = await getSafeSupabaseUser()
      if (!authUser) { router.push('/login'); return }
      setUser(authUser)
    })()
  }, [router])

  useEffect(() => {
    if (!user || startedRef.current) return
    startedRef.current = true
    pushMessage('assistant', 'Hey! I\'m PathAI. 👋 What do you want to learn?')
    setCurrentQuestion({ slot: 'goal', kind: 'text', placeholder: 'e.g. I want to learn Python' })
  }, [user, pushMessage])

  /* ── conversation engine ── */
  const fetchNext = useCallback(async () => {
    setThinking(true)
    setCurrentQuestion(null)
    try {
      const res = await fetch('/api/onboarding/next', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goal: goalRef.current,
          domain: domainRef.current,
          domainLabel: domainLabelRef.current,
          answers: answersRef.current,
          askedCount: askedRef.current,
        }),
      })
      const data = await res.json().catch(() => ({}))

      if (data?.done) {
        await runGenerationRef.current?.()
        return
      }

      const q = data?.question
      if (!q) { await runGenerationRef.current?.(); return }

      if (q.kind === 'skill_map') {
        const mapRes = await fetch('/api/onboarding/skill-map', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            goal: goalRef.current,
            domain: domainRef.current,
            domainLabel: domainLabelRef.current,
            experienceLevel: answersRef.current?.experience?.value || '',
          }),
        })
        const mapData = await mapRes.json().catch(() => ({}))
        setSkillConcepts(Array.isArray(mapData?.concepts) ? mapData.concepts : [])
        setSelectedSkills({})
      }

      setThinking(false)
      pushMessage('assistant', q.prompt)
      setCurrentQuestion(q)
    } catch {
      setThinking(false)
      pushMessage('assistant', 'Let\'s keep going.')
      // fall back to generation rather than dead-ending
      await runGenerationRef.current?.()
    }
  }, [pushMessage])

  const submitGoal = useCallback(async (text) => {
    const goalText = String(text).trim()
    if (!goalText) return
    goalRef.current = goalText
    pushMessage('user', goalText)
    setCurrentQuestion(null)
    setCustomInput('')
    setThinking(true)
    try {
      const res = await fetch('/api/domain-classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal: goalText }),
      })
      const data = await res.json().catch(() => ({}))
      domainRef.current = normalizeDomain(data?.domain, 'CS_CODING')
    } catch {
      domainRef.current = 'CS_CODING'
    }
    domainLabelRef.current = getDomainLabel(domainRef.current, detectGoalFamily(goalText))
    await fetchNext()
  }, [fetchNext, pushMessage])

  const submitChoice = useCallback(async (slot, option) => {
    answersRef.current = { ...answersRef.current, [slot]: { value: option.value, label: option.label } }
    askedRef.current += 1
    pushMessage('user', option.label)
    setCurrentQuestion(null)
    setCustomInput('')
    await fetchNext()
  }, [fetchNext, pushMessage])

  const submitCustom = useCallback(async (slot, text) => {
    const value = String(text).trim()
    if (!value) return
    answersRef.current = { ...answersRef.current, [slot]: { value, label: value, custom: true } }
    askedRef.current += 1
    pushMessage('user', value)
    setCurrentQuestion(null)
    setCustomInput('')
    await fetchNext()
  }, [fetchNext, pushMessage])

  const submitSkills = useCallback(async () => {
    const chosen = skillConcepts.filter((c) => selectedSkills[c.id])
    answersRef.current = { ...answersRef.current, known_skills: { value: chosen } }
    askedRef.current += 1
    pushMessage('user', chosen.length ? `I already know: ${chosen.map((c) => c.label).join(', ')}` : 'None of these yet — start me at the basics.')
    setCurrentQuestion(null)
    setSkillConcepts([])
    await fetchNext()
  }, [fetchNext, pushMessage, selectedSkills, skillConcepts])

  /* ── generation pipeline (preserved from the prior onboarding) ── */
  const runGeneration = useCallback(async () => {
    setThinking(false)
    setPhase('generating')
    setGenStep(0)
    setError('')
    const interval = window.setInterval(() => {
      setGenStep((v) => Math.min(v + 1, GEN_STEPS.length - 1))
    }, 1500)

    const goal = goalRef.current
    const domain = domainRef.current
    const domainConfig = buildDomainConfig(domain)
    const profile = mapAnswersToProfile(answersRef.current)
    const family = detectGoalFamily(goal)
    const cadence = resolveCadence({ profile, goal, domain })

    const learnerProfile = {
      level: profile.experienceLevel,
      recommendedLevel: profile.recommendedLevel,
      diagnosticScore: 0,
      pace: profile.pace,
      pathStyle: profile.pathStyle,
      learningStyle: 'balanced',
      visualPreference: 'balanced',
      desiredOutcome: profile.desiredOutcome,
      prereqComfort: profile.prereqComfort,
      prerequisiteMode: profile.prereqComfort === 'full' ? 'full' : 'compressed',
      domain,
      domainConfig,
      knownConcepts: profile.knownConcepts,
      knownConceptIds: profile.knownConceptIds,
      timeframeDays: profile.timeframeDays,
      freeTextNotes: profile.freeTextNotes,
    }

    const knowledge = [
      `Goal family: ${family}`,
      buildDomainKnowledgeLine(domain),
      `Learner profile JSON: ${JSON.stringify(learnerProfile)}`,
    ].join('. ')

    let decomposition = null
    let modelUsed = null

    try {
      const decompositionRes = await fetch('/api/goal-decompose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goalText: goal, userContext: { knowledge, level: profile.recommendedLevel } }),
      })
      const decompositionData = await decompositionRes.json().catch(() => ({}))
      if (!decompositionRes.ok || !decompositionData?.decomposition) {
        throw new Error(decompositionData?.error || 'Failed to decompose your goal')
      }
      decomposition = decompositionData.decomposition
      modelUsed = decompositionData.modelUsed || null

      setStoredLearningDomain(domain)

      if (isLocalAccessUser(user)) {
        const localBundle = await createLocalGoalBundle({
          user, goalText: goal, decomposition, mode: cadence.mode, days: cadence.days || 30,
          weekdayMins: cadence.weekdayMins, weekendMins: cadence.weekendMins, knowledge,
          recommendedLevel: profile.recommendedLevel, diagnosticScore: 0, pace: profile.pace,
          pathStyle: profile.pathStyle, learnerProfile, domain, domainConfig,
        })
        track(EVENTS.GOAL_DECOMPOSED, {
          goal_id: localBundle.goal.id, primary_mode: decomposition.primaryMode,
          estimated_days: decomposition.estimatedDays, confidence: decomposition.confidence,
          model_used: modelUsed, fallback: decomposition.decompositionStatus === 'pending_retry',
        }, { userId: user.id, goalId: localBundle.goal.id })
        window.clearInterval(interval)
        setGenStep(GEN_STEPS.length - 1)
        router.push('/dashboard')
        return
      }

      const deadline = new Date()
      if (cadence.mode === 'goal') deadline.setDate(deadline.getDate() + cadence.days)

      const { session } = await getSafeSupabaseSession()
      const accessToken = session?.access_token || null
      if (!accessToken) { window.clearInterval(interval); router.push('/login'); return }

      const goalCreateRes = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
          goalText: goal, decomposition, mode: cadence.mode,
          deadline: cadence.mode === 'goal' ? deadline.toISOString().split('T')[0] : null,
          weekdayMins: cadence.weekdayMins, weekendMins: cadence.weekendMins,
          totalDays: cadence.mode === 'goal' ? cadence.days : 0,
          domain, learnerProfile, accessToken,
        }),
      })
      const goalCreateData = await goalCreateRes.json().catch(() => ({}))
      if (!goalCreateRes.ok || !goalCreateData?.goal) {
        throw new Error(goalCreateData?.error || 'Failed to create your goal')
      }
      const goalData = goalCreateData.goal

      track(EVENTS.GOAL_DECOMPOSED, {
        goal_id: goalData.id, primary_mode: decomposition.primaryMode,
        estimated_days: decomposition.estimatedDays, confidence: decomposition.confidence,
        model_used: modelUsed, fallback: decomposition.decompositionStatus === 'pending_retry',
      }, { userId: user.id, goalId: goalData.id })

      try {
        await supabaseData.from('goals').update({ domain, domain_config: domainConfig }).eq('id', goalData.id).eq('user_id', user.id)
      } catch { /* migration may not be applied; domain still carried on the goal */ }

      // Best-effort: seed calibration + known concepts so the generator can skip them.
      try {
        await fetch('/api/diagnostic/calibrate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify({
            goalId: goalData.id, calibration: { questions: [] }, answers: {},
            diagnosticScore: 0, recommendedLevel: profile.recommendedLevel,
            learnerProfile, knownConceptIds: profile.knownConceptIds, accessToken,
          }),
        })
      } catch { /* best-effort */ }

      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
          goalId: goalData.id, userId: user.id, goal, mode: cadence.mode, days: cadence.days || 30,
          weekdayMins: cadence.weekdayMins, weekendMins: cadence.weekendMins, knowledge,
          learnerProfile, domain, domainConfig, accessToken,
        }),
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || 'Failed to generate your path')
      }

      window.clearInterval(interval)
      setGenStep(GEN_STEPS.length - 1)
      router.push('/dashboard')
    } catch (err) {
      window.clearInterval(interval)
      if (decomposition && shouldBypassPathGeneration(err?.message)) {
        try {
          const localBundle = await createLocalGoalBundle({
            user, goalText: goal, decomposition, mode: cadence.mode, days: cadence.days || 30,
            weekdayMins: cadence.weekdayMins, weekendMins: cadence.weekendMins, knowledge,
            recommendedLevel: profile.recommendedLevel, diagnosticScore: 0, pace: profile.pace,
            pathStyle: profile.pathStyle, learnerProfile, domain, domainConfig,
          })
          track(EVENTS.GOAL_DECOMPOSED, {
            goal_id: localBundle.goal.id, primary_mode: decomposition.primaryMode,
            estimated_days: decomposition.estimatedDays, confidence: decomposition.confidence,
            model_used: modelUsed, fallback: decomposition.decompositionStatus === 'pending_retry',
          }, { userId: user.id, goalId: localBundle.goal.id })
          setGenStep(GEN_STEPS.length - 1)
          router.push('/dashboard')
          return
        } catch { /* fall through to error */ }
      }
      setPhase('error')
      setError(err?.message || 'Failed to generate your path')
    }
  }, [router, user])

  useEffect(() => { runGenerationRef.current = runGeneration }, [runGeneration])

  /* ── render ── */
  const q = currentQuestion

  return (
    <div className="lovable-app" style={{ minHeight: '100vh', background: 'var(--color-background)', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 16px' }}>
      <div style={{ width: '100%', maxWidth: 560, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        {/* header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '20px 4px 14px' }}>
          <div style={{ width: 36, height: 36, borderRadius: 12, background: 'color-mix(in oklab, var(--color-primary) 18%, transparent)', border: '2px solid color-mix(in oklab, var(--color-primary) 40%, transparent)', display: 'grid', placeItems: 'center', color: 'var(--color-primary)' }}>
            <IconGlyph name="bolt" size={18} strokeWidth={2.4} />
          </div>
          <span className="font-display" style={{ fontWeight: 800, fontSize: 18, color: 'var(--color-foreground)' }}>PathAI</span>
        </div>

        {phase === 'generating' ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 14, paddingBottom: 60 }}>
            <h2 className="font-display" style={{ fontSize: 24, fontWeight: 800, color: 'var(--color-foreground)', marginBottom: 6 }}>Building your path…</h2>
            {GEN_STEPS.map((label, i) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 12, opacity: i <= genStep ? 1 : 0.4, transition: 'opacity 0.3s' }}>
                <div style={{ width: 26, height: 26, borderRadius: '50%', display: 'grid', placeItems: 'center', background: i < genStep ? 'var(--color-mint)' : i === genStep ? 'var(--color-primary)' : 'var(--color-surface-2)', color: '#031222', flexShrink: 0 }}>
                  {i < genStep ? <IconGlyph name="check" size={14} strokeWidth={3} color="#031222" /> : null}
                </div>
                <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-foreground)' }}>{label}</span>
              </div>
            ))}
          </div>
        ) : phase === 'error' ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 16, paddingBottom: 60 }}>
            <h2 className="font-display" style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-coral)' }}>Something went wrong</h2>
            <p style={{ fontSize: 15, color: 'var(--color-muted-foreground)', lineHeight: 1.6 }}>{error}</p>
            <CandyButton onClick={() => { setPhase('chat'); runGeneration() }}>Try again</CandyButton>
          </div>
        ) : (
          <>
            {/* transcript */}
            <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, padding: '8px 2px 16px' }}>
              {messages.map((m, i) => (
                <Bubble key={i} role={m.role}>{m.text}</Bubble>
              ))}
              {thinking && (
                <Bubble role="assistant"><span style={{ opacity: 0.7 }}>thinking…</span></Bubble>
              )}
            </div>

            {/* input area */}
            <div style={{ position: 'sticky', bottom: 0, background: 'var(--color-background)', padding: '12px 2px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {q?.helper && <div style={{ fontSize: 12, color: 'var(--color-muted-foreground)', fontWeight: 600, paddingLeft: 4 }}>{q.helper}</div>}

              {q?.kind === 'choice' && (
                <div style={{ display: 'grid', gridTemplateColumns: q.options.length > 3 ? '1fr 1fr' : '1fr', gap: 8 }}>
                  {q.options.map((opt) => (
                    <Chip key={opt.value} label={opt.label} onClick={() => submitChoice(q.slot, opt)} />
                  ))}
                </div>
              )}

              {q?.kind === 'skill_map' && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, maxHeight: '38vh', overflowY: 'auto' }}>
                    {skillConcepts.map((c) => (
                      <Chip
                        key={c.id}
                        label={selectedSkills[c.id] ? `✓ ${c.label}` : c.label}
                        active={Boolean(selectedSkills[c.id])}
                        onClick={() => setSelectedSkills((s) => ({ ...s, [c.id]: !s[c.id] }))}
                      />
                    ))}
                  </div>
                  <CandyButton onClick={submitSkills}>
                    {Object.values(selectedSkills).some(Boolean) ? 'Skip these — continue' : "I'm new to all of this"}
                  </CandyButton>
                </>
              )}

              {(q?.kind === 'text' || q?.kind === 'choice') && (
                <form
                  onSubmit={(e) => { e.preventDefault(); if (q.kind === 'text') submitGoal(customInput); else submitCustom(q.slot, customInput) }}
                  style={{ display: 'flex', gap: 8 }}
                >
                  <input
                    value={customInput}
                    onChange={(e) => setCustomInput(e.target.value)}
                    placeholder={q.placeholder || q.customPlaceholder || 'Type your own…'}
                    autoFocus={q.kind === 'text'}
                    style={{
                      flex: 1, padding: '14px 16px', borderRadius: 16,
                      background: 'var(--color-surface)', border: '2px solid var(--color-border)',
                      color: 'var(--color-foreground)', fontSize: 15, fontWeight: 600, outline: 'none',
                    }}
                  />
                  <button
                    type="submit"
                    disabled={!customInput.trim()}
                    aria-label="Send"
                    style={{
                      width: 52, borderRadius: 16, border: 'none', flexShrink: 0,
                      background: customInput.trim() ? 'var(--color-primary)' : 'var(--color-surface-2)',
                      color: customInput.trim() ? 'var(--color-primary-foreground)' : 'var(--color-muted-foreground)',
                      boxShadow: customInput.trim() ? '0 5px 0 0 var(--color-primary-shadow)' : 'none',
                      cursor: customInput.trim() ? 'pointer' : 'default', display: 'grid', placeItems: 'center',
                    }}
                  >
                    <IconGlyph name="rocket" size={18} strokeWidth={2.4} />
                  </button>
                </form>
              )}

              {q?.kind === 'text' && q.slot === 'goal' && messages.length <= 1 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 2 }}>
                  {GOAL_CHIPS.map((g) => (
                    <button key={g} type="button" onClick={() => submitGoal(g)}
                      style={{ padding: '8px 12px', borderRadius: 9999, border: '2px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-muted-foreground)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                      {g}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
