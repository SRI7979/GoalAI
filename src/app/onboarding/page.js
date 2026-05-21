'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import IconGlyph from '@/components/IconGlyph'
import AtmosphericBackdrop from '@/components/premium/AtmosphericBackdrop'
import GenerationStepList from '@/components/premium/GenerationStepList'
import PremiumFrame from '@/components/premium/PremiumFrame'
import ScrollReveal from '@/components/premium/ScrollReveal'
import { createLocalGoalBundle, isLocalAccessUser } from '@/lib/localGoalStore'
import { EVENTS, track } from '@/lib/analytics'
import { getSafeSupabaseSession, getSafeSupabaseUser, supabaseData } from '@/lib/supabase'
import { consumeSupabaseAuthRedirect } from '@/lib/supabaseAuth'
import {
  DOMAIN_CONFIDENCE_THRESHOLD,
  DOMAIN_METADATA,
  LEARNING_DOMAINS,
  buildDomainConfig,
  buildDomainKnowledgeLine,
  normalizeDomain,
  setStoredLearningDomain,
} from '@/lib/domainAdapter'
import {
  buildFallbackOnboardingCalibration,
  getDomainLabel,
  getShortGoal,
  normalizeOnboardingCalibration,
} from '@/lib/onboardingCalibration'

const STEPS = [
  'Goal',
  'Calibrate',
  'Launch',
]

const GOAL_OPTIONS = [
  { label: 'Learn Python', icon: 'code' },
  { label: 'Understand kinematics', icon: 'orbit' },
  { label: 'Speak Spanish for travel', icon: 'message' },
  { label: 'Build a SaaS dashboard', icon: 'artifact' },
  { label: 'Learn cybersecurity defense', icon: 'shield' },
  { label: 'Improve UI/UX design', icon: 'design' },
]

const GENERATION_STEPS = [
  'Analyzing your starting point...',
  'Mapping the skill graph...',
  'Generating your first mission...',
  'Calibrating difficulty...',
  'Your path is ready.',
]

const ROUTE_MAP = {
  programming: ['Foundations', 'Control flow', 'Applied builds', 'Project milestone', 'Final assessment'],
  machineLearning: ['Intro to ML', 'Python basics', 'Decision trees', 'Libraries and workflow', 'Proof project'],
  language: ['Core phrases', 'Grammar patterns', 'Response drills', 'Conversation milestone', 'Live practice'],
  design: ['Visual fundamentals', 'Hierarchy and layout', 'Component systems', 'Applied screens', 'Portfolio proof'],
  general: ['Foundations', 'Guided practice', 'Applied work', 'Milestone proof', 'Final assessment'],
}

function detectGoalFamily(goal = '') {
  const text = String(goal).toLowerCase()
  if (/machine learning|\bml\b|decision tree|regression|classification|dataset|model/.test(text)) return 'machineLearning'
  if (/javascript|python|react|typescript|coding|code|web/.test(text)) return 'programming'
  if (/spanish|language|french|german|japanese/.test(text)) return 'language'
  if (/design|ui|ux|figma|interface/.test(text)) return 'design'
  return 'general'
}

function getFamilyAccent(family) {
  switch (family) {
    case 'machineLearning': return '#84a3ff'
    case 'language': return '#34D399'
    case 'design': return '#f472b6'
    case 'programming': return '#00e5c7'
    default: return '#00e5c7'
  }
}

function getRecommendedLevel(score) {
  if (score <= 1) return 'Beginner'
  if (score <= 4) return 'Intermediate'
  return 'Advanced'
}

function shouldBypassPathGeneration(errorMessage = '') {
  return /Failed to fetch|fetch failed|Supabase project URL is unreachable|Unable to reach Supabase|NEXT_PUBLIC_SUPABASE_URL/i.test(String(errorMessage))
}

function parseExplicitTimelineDays(goal = '') {
  const text = String(goal).toLowerCase()
  const dayMatch = text.match(/\b(?:in|within|over|for)\s+(\d{1,3})\s*(day|days)\b/)
  if (dayMatch) return Number(dayMatch[1])

  const weekMatch = text.match(/\b(?:in|within|over|for)\s+(\d{1,2})\s*(week|weeks)\b/)
  if (weekMatch) return Number(weekMatch[1]) * 7

  const monthMatch = text.match(/\b(?:in|within|over|for)\s+(\d{1,2})\s*(month|months)\b/)
  if (monthMatch) return Number(monthMatch[1]) * 30

  return null
}

function estimateGoalHours({ goal = '', domain = '', recommendedLevel, desiredOutcome, prereqComfort }) {
  const text = String(goal).toLowerCase()
  const domainBaseHours = {
    CS_CODING: 32,
    MATHEMATICS: 28,
    PHYSICS: 30,
    CHEMISTRY: 30,
    BIOLOGY: 28,
    ENGINEERING: 38,
    TECHNOLOGY: 22,
    CYBERSECURITY: 36,
    ML_AI: 48,
    DATA_SCIENCE: 38,
    STATISTICS: 34,
    ECONOMICS: 28,
    FINANCE: 30,
    BUSINESS: 28,
    WRITING: 24,
    READING_COMPREHENSION: 18,
    HISTORY: 24,
    GOVERNMENT_CIVICS: 24,
    PSYCHOLOGY: 26,
    MEDICINE_HEALTH: 36,
    ENVIRONMENTAL_SCIENCE: 28,
    FOREIGN_LANGUAGE: 64,
    ART_DESIGN: 30,
    MUSIC: 42,
    COMMUNICATION: 20,
    PHILOSOPHY_LOGIC: 24,
  }

  let hours = domainBaseHours[domain] || 28

  if (/\b(print\(\)|variable|for loop|if statement|html document structure|single concept|one concept|basics of|what is|how to use)\b/.test(text)) {
    hours *= 0.45
  }

  if (/\b(intro|introduction|overview|starter|getting started|beginner)\b/.test(text)) {
    hours *= 0.7
  }

  if (/\b(build|project|app|website|dashboard|portfolio|tool|automation|saas|game|ship|deploy)\b/.test(text)) {
    hours *= 1.3
  }

  if (/\b(master|expert|professional|career|job|interview|certification|exam|fluent|from scratch|zero to|full stack|complete)\b/.test(text)) {
    hours *= 1.45
  }

  if (/\b(machine learning|data science|cybersecurity|physics|calculus|chemistry|finance|music theory)\b/.test(text)) {
    hours *= 1.16
  }

  if (desiredOutcome === 'career') hours *= 1.18
  if (desiredOutcome === 'project') hours *= 1.08
  if (desiredOutcome === 'understand') hours *= 0.94

  if (recommendedLevel === 'Beginner') hours *= 1.18
  if (recommendedLevel === 'Advanced') hours *= 0.74

  if (prereqComfort === 'full') hours *= 1.18
  if (prereqComfort === 'test_out') hours *= 0.72

  return Math.max(3, Math.min(220, hours))
}

function resolveCadence({ pathStyle, pace, recommendedLevel, goal, domain, desiredOutcome, prereqComfort }) {
  const paceMap = {
    relaxed: { weekdayMins: 20, weekendMins: 35 },
    balanced: { weekdayMins: 30, weekendMins: 50 },
    intensive: { weekdayMins: 45, weekendMins: 75 },
  }
  const base = paceMap[pace] || paceMap.balanced

  if (pathStyle === 'explore') {
    return {
      mode: 'explore',
      days: 0,
      weekdayMins: base.weekdayMins,
      weekendMins: base.weekendMins,
      reason: 'Open-ended exploration',
    }
  }

  const explicitDays = parseExplicitTimelineDays(goal)
  const averageDailyMins = ((base.weekdayMins * 5) + (base.weekendMins * 2)) / 7
  const estimatedHours = estimateGoalHours({ goal, domain, recommendedLevel, desiredOutcome, prereqComfort })
  const estimatedDays = Math.ceil((estimatedHours * 60) / averageDailyMins)
  const days = explicitDays || estimatedDays

  return {
    mode: 'goal',
    days: Math.max(3, Math.min(240, days)),
    weekdayMins: base.weekdayMins,
    weekendMins: base.weekendMins,
    reason: explicitDays ? 'Timeline from your goal' : 'Estimated from goal scope',
  }
}

function buildPathPreview(goal, family, recommendedLevel, pathStyle) {
  const route = ROUTE_MAP[family] || ROUTE_MAP.general
  const startIndex = recommendedLevel === 'Advanced' ? 1 : 0
  return {
    route: route.slice(startIndex, startIndex + 4),
    firstMission: route[startIndex] || route[0],
    completion:
      pathStyle === 'explore'
        ? 'Adaptive route with open-ended milestones'
        : 'Structured finish line with project proof',
    supportMode:
      recommendedLevel === 'Beginner'
        ? 'More explanation and guided practice up front'
        : recommendedLevel === 'Advanced'
          ? 'More challenge and faster pacing'
          : 'Balanced pacing with visible checkpoints',
    title: goal || 'Your custom path',
  }
}

function DomainOption({ domain, selected, onSelect }) {
  const meta = DOMAIN_METADATA[domain]
  return (
    <button
      type="button"
      className={`onboarding-domain-card ${selected ? 'active' : ''}`}
      onClick={onSelect}
    >
      <div className="onboarding-domain-icon">
        <IconGlyph name={meta.icon} size={18} strokeWidth={2.3} color={selected ? '#071015' : '#00e5c7'} />
      </div>
      <div>
        <div className="onboarding-domain-title">{meta.label}</div>
        <div className="onboarding-domain-copy">{meta.description}</div>
      </div>
    </button>
  )
}

function PreviewRail({
  preview,
  cadence,
  pathStyle,
  pace,
  recommendedLevel,
  accent,
  goal,
  family,
  domain,
  summary,
}) {
  const domainLabel = getDomainLabel(domain, family)

  return (
    <PremiumFrame accent={`${accent}1c`} className="onboarding-snapshot">
      <div className="onboarding-snapshot-top">
        <div className="onboarding-snapshot-icon">
          <IconGlyph name={DOMAIN_METADATA[domain]?.icon || 'sparkles'} size={18} strokeWidth={2.4} color="#071015" />
        </div>
        <div>
          <div className="onboarding-rail-eyebrow">Live route</div>
          <div className="onboarding-rail-title">{goal || 'Tell PathAI your goal'}</div>
        </div>
      </div>

      <div className="onboarding-snapshot-note">
        {summary || `PathAI will turn ${getShortGoal(goal)} into a focused ${domainLabel} route.`}
      </div>

      <div className="onboarding-rail-grid">
        <div>
          <label>Domain</label>
          <strong>{domainLabel}</strong>
        </div>
        <div>
          <label>Mode</label>
          <strong>{pathStyle === 'explore' ? 'Explore' : 'Structured'}</strong>
        </div>
        <div>
          <label>Pace</label>
          <strong>{pace}</strong>
        </div>
        <div>
          <label>Start level</label>
          <strong>{recommendedLevel}</strong>
        </div>
        <div>
          <label>Cadence</label>
          <strong>{cadence.mode === 'explore' ? 'Open-ended' : `${cadence.days} days`}</strong>
        </div>
      </div>
      {cadence.reason ? <div className="onboarding-cadence-note">{cadence.reason}</div> : null}

      <div className="onboarding-route-block">
        <div className="onboarding-rail-label">First route draft</div>
        <div className="onboarding-route-list">
          {preview.route.slice(0, 3).map((item, index) => (
            <div className="onboarding-route-item" key={`${item}-${index}`}>
              <div className={`onboarding-route-index ${index === 0 ? 'active' : ''}`}>{index + 1}</div>
              <div>
                <div className="onboarding-route-title">{item}</div>
                <div className="onboarding-route-copy">{index === 0 ? 'You start here' : 'Queued next'}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="onboarding-route-summary">
        <div className="onboarding-rail-label">Optimization</div>
        <p>{preview.supportMode}</p>
        <p>{preview.completion}</p>
      </div>
    </PremiumFrame>
  )
}

export default function OnboardingPage() {
  const router = useRouter()
  const reduceMotion = useReducedMotion()

  const [user, setUser] = useState(null)
  const [step, setStep] = useState(1)
  const [direction, setDirection] = useState(1)
  const [presetGoal, setPresetGoal] = useState('')
  const [customGoal, setCustomGoal] = useState('')
  const [pathStyle, setPathStyle] = useState('goal')
  const [pace, setPace] = useState('balanced')
  const [experienceLevel, setExperienceLevel] = useState('beginner')
  const [learningStyle, setLearningStyle] = useState('visual')
  const [desiredOutcome, setDesiredOutcome] = useState('project')
  const [prereqComfort, setPrereqComfort] = useState('compressed')
  const [answers, setAnswers] = useState({})
  const [calibration, setCalibration] = useState(() => buildFallbackOnboardingCalibration())
  const [questionLoading, setQuestionLoading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [genStep, setGenStep] = useState(0)
  const [buildReady, setBuildReady] = useState(false)
  const [error, setError] = useState('')
  const [domainDetecting, setDomainDetecting] = useState(false)
  const [domainPickerVisible, setDomainPickerVisible] = useState(false)
  const [domainClassification, setDomainClassification] = useState(null)
  const [selectedDomain, setSelectedDomain] = useState('')
  const [domainGoalSnapshot, setDomainGoalSnapshot] = useState('')

  useEffect(() => {
    void (async () => {
      try {
        await consumeSupabaseAuthRedirect()
      } catch {
        // Safe helper below handles the fallback redirect state.
      }

      const { user: authUser } = await getSafeSupabaseUser()
      if (!authUser) {
        router.push('/login')
      } else {
        setUser(authUser)
      }
    })()
  }, [router])

  const goal = useMemo(() => customGoal.trim() || presetGoal, [customGoal, presetGoal])
  const family = useMemo(() => detectGoalFamily(goal), [goal])
  const accent = useMemo(() => getFamilyAccent(family), [family])
  const confirmedDomain = useMemo(() => normalizeDomain(selectedDomain, null), [selectedDomain])
  const confirmedDomainConfig = useMemo(
    () => confirmedDomain ? buildDomainConfig(confirmedDomain) : null,
    [confirmedDomain],
  )
  const questions = useMemo(() => calibration.questions || [], [calibration.questions])
  const diagnosticScore = useMemo(
    () => questions.reduce((sum, question) => sum + (answers[question.id]?.score || 0), 0),
    [answers, questions],
  )
  const recommendedLevel = useMemo(() => getRecommendedLevel(diagnosticScore), [diagnosticScore])
  const learnerProfile = useMemo(() => ({
    level: experienceLevel || recommendedLevel.toLowerCase(),
    recommendedLevel,
    diagnosticScore,
    pace,
    pathStyle,
    learningStyle,
    visualPreference: learningStyle === 'visual' ? 'visual' : 'balanced',
    desiredOutcome,
    prereqComfort,
    prerequisiteMode: prereqComfort === 'full' ? 'full' : 'compressed',
    domain: confirmedDomain,
    domainConfig: confirmedDomainConfig,
  }), [
    confirmedDomain,
    confirmedDomainConfig,
    desiredOutcome,
    diagnosticScore,
    experienceLevel,
    learningStyle,
    pace,
    pathStyle,
    prereqComfort,
    recommendedLevel,
  ])
  const cadence = useMemo(
    () => resolveCadence({
      pathStyle,
      pace,
      recommendedLevel,
      goal,
      domain: confirmedDomain,
      desiredOutcome,
      prereqComfort,
    }),
    [confirmedDomain, desiredOutcome, goal, pace, pathStyle, prereqComfort, recommendedLevel],
  )
  const preview = useMemo(
    () => buildPathPreview(goal, family, recommendedLevel, pathStyle),
    [goal, family, recommendedLevel, pathStyle],
  )

  const allQuestionsAnswered = questions.length > 0 && questions.every((question) => Boolean(answers[question.id]))

  useEffect(() => {
    setAnswers({})
    if (!goal) {
      setCalibration(buildFallbackOnboardingCalibration())
    }
  }, [goal])

  useEffect(() => {
    if (goal && goal === domainGoalSnapshot) return
    setDomainPickerVisible(false)
    setDomainClassification(null)
    setSelectedDomain('')
    setDomainGoalSnapshot('')
  }, [domainGoalSnapshot, goal])

  const goToStep = useCallback((nextStep, dir) => {
    setDirection(dir)
    setStep(nextStep)
    setError('')
  }, [])

  const applyCalibrationDefaults = useCallback((defaults = {}) => {
    if (defaults.pathStyle) setPathStyle(defaults.pathStyle)
    if (defaults.pace) setPace(defaults.pace)
    if (defaults.experienceLevel) setExperienceLevel(defaults.experienceLevel)
    if (defaults.learningStyle) setLearningStyle(defaults.learningStyle)
    if (defaults.desiredOutcome) setDesiredOutcome(defaults.desiredOutcome)
    if (defaults.prereqComfort) setPrereqComfort(defaults.prereqComfort)
  }, [])

  const loadCalibration = useCallback(async (domain) => {
    const fallback = buildFallbackOnboardingCalibration({ goal, domain, family })
    setQuestionLoading(true)
    setAnswers({})

    try {
      const res = await fetch('/api/onboarding-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal, domain, family }),
      })
      const data = await res.json().catch(() => ({}))
      const normalized = normalizeOnboardingCalibration(data, { goal, domain, family })
      setCalibration(normalized)
      applyCalibrationDefaults(normalized.defaults)
    } catch {
      setCalibration(fallback)
      applyCalibrationDefaults(fallback.defaults)
    } finally {
      setQuestionLoading(false)
    }
  }, [applyCalibrationDefaults, family, goal])

  const handleAnswer = useCallback((question, option) => {
    setAnswers((current) => ({ ...current, [question.id]: option }))
    if (option?.sets) applyCalibrationDefaults(option.sets)
  }, [applyCalibrationDefaults])

  const persistDomainContext = useCallback(async ({ goalId = null, domain, domainConfig }) => {
    if (!user || !domain) return
    setStoredLearningDomain(domain)

    try {
      await supabaseData
        .from('users')
        .upsert({
          id: user.id,
          email: user.email || null,
          domain,
          domain_confirmed_at: new Date().toISOString(),
        }, { onConflict: 'id' })
    } catch {
      // Some projects only have auth.users plus app tables. The goal row remains the source of truth.
    }

    if (goalId) {
      try {
        await supabaseData
          .from('goals')
          .update({ domain, domain_config: domainConfig })
          .eq('id', goalId)
          .eq('user_id', user.id)
      } catch {
        // Migration may not be applied yet; constraints still carry the domain.
      }
    }
  }, [user])

  const handleGoalContinue = useCallback(async () => {
    if (!goal || domainDetecting) return

    if (confirmedDomain && domainGoalSnapshot === goal) {
      await persistDomainContext({
        domain: confirmedDomain,
        domainConfig: confirmedDomainConfig || buildDomainConfig(confirmedDomain),
      })
      await loadCalibration(confirmedDomain)
      goToStep(2, 1)
      return
    }

    setDomainDetecting(true)
    setError('')

    try {
      const res = await fetch('/api/domain-classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal }),
      })
      const data = await res.json().catch(() => ({}))
      const nextDomain = normalizeDomain(data?.domain, 'CS_CODING')
      const confidence = Number(data?.confidence) || 0

      setSelectedDomain(nextDomain)
      setDomainClassification({ ...data, domain: nextDomain, confidence })
      setDomainGoalSnapshot(goal)

      if (confidence >= DOMAIN_CONFIDENCE_THRESHOLD) {
        setDomainPickerVisible(false)
        await persistDomainContext({
          domain: nextDomain,
          domainConfig: buildDomainConfig(nextDomain),
        })
        await loadCalibration(nextDomain)
        goToStep(2, 1)
      } else {
        setDomainPickerVisible(true)
      }
    } catch {
      setSelectedDomain('CS_CODING')
      setDomainClassification({ domain: 'CS_CODING', confidence: 0, source: 'client_fallback' })
      setDomainGoalSnapshot(goal)
      setDomainPickerVisible(true)
    } finally {
      setDomainDetecting(false)
    }
  }, [
    confirmedDomain,
    confirmedDomainConfig,
    domainDetecting,
    domainGoalSnapshot,
    goal,
    goToStep,
    loadCalibration,
    persistDomainContext,
  ])

  const startGeneration = useCallback(async () => {
    if (!user || !goal || !confirmedDomain || !confirmedDomainConfig) return

    setLoading(true)
    setBuildReady(false)
    setError('')
    setGenStep(0)

    const interval = window.setInterval(() => {
      setGenStep((value) => Math.min(value + 1, GENERATION_STEPS.length - 1))
    }, 1600)

    const knowledge = [
      `Goal family: ${family}`,
      buildDomainKnowledgeLine(confirmedDomain),
      `Learner profile JSON: ${JSON.stringify(learnerProfile)}`,
    ].join('. ')
    let decomposition = null
    let modelUsed = null

    try {
      const decompositionRes = await fetch('/api/goal-decompose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goalText: goal,
          userContext: {
            knowledge,
            level: recommendedLevel,
          },
        }),
      })
      const decompositionData = await decompositionRes.json().catch(() => ({}))
      if (!decompositionRes.ok || !decompositionData?.decomposition) {
        throw new Error(decompositionData?.error || 'Failed to decompose your goal')
      }

      decomposition = decompositionData.decomposition
      modelUsed = decompositionData.modelUsed || null

      if (isLocalAccessUser(user)) {
        const localBundle = await createLocalGoalBundle({
          user,
          goalText: goal,
          decomposition,
          mode: cadence.mode,
          days: cadence.days || 30,
          weekdayMins: cadence.weekdayMins,
          weekendMins: cadence.weekendMins,
          knowledge,
          recommendedLevel,
          diagnosticScore,
          pace,
          pathStyle,
          learnerProfile,
          domain: confirmedDomain,
          domainConfig: confirmedDomainConfig,
        })
      track(EVENTS.GOAL_DECOMPOSED, {
          goal_id: localBundle.goal.id,
          primary_mode: decomposition.primaryMode,
          estimated_days: decomposition.estimatedDays,
          confidence: decomposition.confidence,
          model_used: modelUsed,
          fallback: decomposition.decompositionStatus === 'pending_retry',
        }, {
          userId: user.id,
          goalId: localBundle.goal.id,
        })
        await persistDomainContext({ domain: confirmedDomain, domainConfig: confirmedDomainConfig })
        await new Promise((resolve) => window.setTimeout(resolve, 600))
        window.clearInterval(interval)
        setLoading(false)
        setBuildReady(true)
        setGenStep(GENERATION_STEPS.length - 1)
        router.push('/dashboard')
        return
      }

      const deadline = new Date()
      if (cadence.mode === 'goal') deadline.setDate(deadline.getDate() + cadence.days)

      const { session } = await getSafeSupabaseSession()
      const accessToken = session?.access_token || null
      if (!accessToken) {
        window.clearInterval(interval)
        setLoading(false)
        router.push('/login')
        return
      }
      const goalCreateRes = await fetch('/api/goals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          goalText: goal,
          decomposition,
          mode: cadence.mode,
          deadline: cadence.mode === 'goal' ? deadline.toISOString().split('T')[0] : null,
          weekdayMins: cadence.weekdayMins,
          weekendMins: cadence.weekendMins,
          totalDays: cadence.mode === 'goal' ? cadence.days : 0,
          domain: confirmedDomain,
          learnerProfile,
          accessToken,
        }),
      })
      const goalCreateData = await goalCreateRes.json().catch(() => ({}))
      if (!goalCreateRes.ok || !goalCreateData?.goal) {
        throw new Error(goalCreateData?.error || 'Failed to create your goal')
      }
      const goalData = goalCreateData.goal

      track(EVENTS.GOAL_DECOMPOSED, {
        goal_id: goalData.id,
        primary_mode: decomposition.primaryMode,
        estimated_days: decomposition.estimatedDays,
        confidence: decomposition.confidence,
        model_used: modelUsed,
        fallback: decomposition.decompositionStatus === 'pending_retry',
      }, {
        userId: user.id,
        goalId: goalData.id,
      })

      await persistDomainContext({
        goalId: goalData.id,
        domain: confirmedDomain,
        domainConfig: confirmedDomainConfig,
      })

      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          goalId: goalData.id,
          userId: user.id,
          goal,
          mode: cadence.mode,
          days: cadence.days || 30,
          weekdayMins: cadence.weekdayMins,
          weekendMins: cadence.weekendMins,
          knowledge,
          learnerProfile,
          domain: confirmedDomain,
          domainConfig: confirmedDomainConfig,
          accessToken,
        }),
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || 'Failed to generate your path')
      }

      window.clearInterval(interval)
      setLoading(false)
      setBuildReady(true)
      setGenStep(GENERATION_STEPS.length - 1)
    } catch (err) {
      window.clearInterval(interval)
      if (decomposition && shouldBypassPathGeneration(err?.message)) {
        const localBundle = await createLocalGoalBundle({
          user,
          goalText: goal,
          decomposition,
          mode: cadence.mode,
          days: cadence.days || 30,
          weekdayMins: cadence.weekdayMins,
          weekendMins: cadence.weekendMins,
          knowledge,
          recommendedLevel,
          diagnosticScore,
          pace,
          pathStyle,
          learnerProfile,
          domain: confirmedDomain,
          domainConfig: confirmedDomainConfig,
        })
        track(EVENTS.GOAL_DECOMPOSED, {
          goal_id: localBundle.goal.id,
          primary_mode: decomposition.primaryMode,
          estimated_days: decomposition.estimatedDays,
          confidence: decomposition.confidence,
          model_used: modelUsed,
          fallback: decomposition.decompositionStatus === 'pending_retry',
        }, {
          userId: user.id,
          goalId: localBundle.goal.id,
        })
        await persistDomainContext({ domain: confirmedDomain, domainConfig: confirmedDomainConfig })
        setLoading(false)
        setBuildReady(true)
        setGenStep(GENERATION_STEPS.length - 1)
        router.push('/dashboard')
        return
      }
      setLoading(false)
      setBuildReady(false)
      setGenStep(0)
      setError(err.message || 'Failed to generate your path')
    }
  }, [
    cadence.days,
    cadence.mode,
    cadence.weekdayMins,
    cadence.weekendMins,
    confirmedDomain,
    confirmedDomainConfig,
    diagnosticScore,
    family,
    goal,
    learnerProfile,
    pace,
    persistDomainContext,
    pathStyle,
    recommendedLevel,
    router,
    user,
  ])

  useEffect(() => {
    if (step === 3 && !loading && !buildReady && !error && user && goal) {
      startGeneration()
    }
  }, [step, loading, buildReady, error, user, goal, startGeneration])

  const progress = ((step - 1) / (STEPS.length - 1)) * 100

  if (!user) return null

  return (
    <>
      <style jsx global>{`
        @keyframes onboardingOrbit {
          0% { transform: rotate(0deg) translateX(0); }
          50% { transform: rotate(180deg) translateX(0); }
          100% { transform: rotate(360deg) translateX(0); }
        }
        @keyframes onboardingPulse {
          0%, 100% { opacity: 0.48; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.08); }
        }
        .pathai-onboarding {
          position: relative;
          min-height: 100vh;
          overflow: clip;
          background:
            radial-gradient(circle at 50% -10%, rgba(0,229,199,0.18), transparent 28%),
            linear-gradient(180deg, #090a0f 0%, #0b0c12 48%, #090a10 100%);
        }
        .pathai-onboarding::before {
          content: '';
          position: fixed;
          inset: 0;
          pointer-events: none;
          opacity: 0.07;
          background-image:
            linear-gradient(rgba(255,255,255,0.16) 0.7px, transparent 0.7px),
            linear-gradient(90deg, rgba(255,255,255,0.16) 0.7px, transparent 0.7px);
          background-size: 120px 120px;
          mask-image: linear-gradient(180deg, rgba(0,0,0,0.34), transparent 78%);
          -webkit-mask-image: linear-gradient(180deg, rgba(0,0,0,0.34), transparent 78%);
        }
        .onboarding-shell {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 1320px;
          margin: 0 auto;
          padding: calc(env(safe-area-inset-top, 0px) + 28px) 24px 56px;
        }
        .onboarding-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 34px;
          flex-wrap: wrap;
        }
        .onboarding-brand {
          display: inline-flex;
          align-items: center;
          gap: 14px;
        }
        .onboarding-brandmark {
          width: 46px;
          height: 46px;
          border-radius: 16px;
          display: grid;
          place-items: center;
          background: linear-gradient(140deg, #00e5c7 0%, #7fe7ff 56%, #97a5ff 100%);
          color: #071015;
          box-shadow: 0 24px 44px rgba(0,229,199,0.22), inset 0 1px 0 rgba(255,255,255,0.44);
        }
        .onboarding-header {
          max-width: 720px;
        }
        .onboarding-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 10px 16px;
          border-radius: 999px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          color: rgba(240,240,240,0.68);
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.18em;
          text-transform: uppercase;
        }
        .onboarding-eyebrow::before {
          content: '';
          width: 8px;
          height: 8px;
          border-radius: 999px;
          background: #00e5c7;
          box-shadow: 0 0 18px rgba(0,229,199,0.34);
        }
        .onboarding-title {
          margin-top: 18px;
          color: #f0f0f0;
	          font-size: 4.7rem;
          line-height: 0.94;
	          letter-spacing: 0;
        }
        .onboarding-copy {
          margin-top: 20px;
          color: rgba(240,240,240,0.58);
          font-size: 17px;
          line-height: 1.74;
          max-width: 620px;
        }
        .onboarding-layout {
          display: grid;
          grid-template-columns: minmax(0, 1.04fr) minmax(360px, 0.96fr);
          gap: 26px;
          align-items: start;
        }
        .onboarding-main-card {
          padding: 28px;
        }
        .onboarding-progress {
          display: grid;
          gap: 16px;
          margin-bottom: 28px;
        }
        .onboarding-progress-track {
          height: 10px;
          border-radius: 999px;
          background: rgba(255,255,255,0.07);
          overflow: hidden;
        }
        .onboarding-progress-fill {
          height: 100%;
          border-radius: 999px;
          background: linear-gradient(90deg, #00e5c7, #7fe7ff 48%, #97a5ff 100%);
          box-shadow: 0 0 24px rgba(0,229,199,0.24);
        }
        .onboarding-progress-steps {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 10px;
        }
        .onboarding-progress-node {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }
        .onboarding-progress-badge {
          width: 36px;
          height: 36px;
          border-radius: 999px;
          display: grid;
          place-items: center;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.04);
          color: rgba(240,240,240,0.44);
          font-size: 12px;
          font-weight: 800;
        }
        .onboarding-progress-badge.active {
          background: rgba(0,229,199,0.14);
          border-color: rgba(0,229,199,0.28);
          color: #00e5c7;
          box-shadow: 0 0 20px rgba(0,229,199,0.12);
        }
        .onboarding-progress-badge.complete {
          background: linear-gradient(135deg, #00e5c7, #7fe7ff);
          border-color: rgba(255,255,255,0.10);
          color: #071015;
        }
        .onboarding-progress-label {
          color: rgba(240,240,240,0.44);
          font-size: 12px;
          font-weight: 600;
          text-align: center;
        }
        .onboarding-step-header {
          margin-bottom: 22px;
        }
        .onboarding-step-header h2 {
          color: #f0f0f0;
	          font-size: 2.35rem;
          line-height: 0.98;
	          letter-spacing: 0;
        }
        .onboarding-step-header p {
          margin-top: 12px;
          color: rgba(240,240,240,0.56);
          font-size: 15px;
          line-height: 1.7;
          max-width: 620px;
        }
        .onboarding-goal-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
        }
        .onboarding-goal-card {
          width: 100%;
          padding: 22px 18px 20px;
          text-align: left;
          border-radius: 24px;
          border: 1px solid rgba(255,255,255,0.08);
          min-height: 188px;
        }
        .onboarding-goal-icon,
        .onboarding-path-icon {
          width: 52px;
          height: 52px;
          border-radius: 18px;
          display: grid;
          place-items: center;
          border: 1px solid rgba(255,255,255,0.08);
          margin-bottom: 18px;
        }
        .onboarding-goal-title,
        .onboarding-path-title {
          color: #f0f0f0;
          font-size: 18px;
          font-weight: 700;
	          letter-spacing: 0;
        }
        .onboarding-goal-copy,
        .onboarding-path-copy {
          margin-top: 10px;
          color: rgba(240,240,240,0.52);
          font-size: 14px;
          line-height: 1.65;
        }
        .onboarding-input {
          width: 100%;
          margin-top: 18px;
          padding: 16px 18px;
          border-radius: 18px;
          border: 1px solid rgba(255,255,255,0.10);
          background: rgba(255,255,255,0.04);
          color: #f0f0f0;
          font-size: 15px;
        }
        .onboarding-input::placeholder {
          color: rgba(240,240,240,0.32);
        }
        .onboarding-domain-confirmed {
          margin-top: 14px;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 14px;
          border-radius: 999px;
          background: rgba(0,229,199,0.08);
          border: 1px solid rgba(0,229,199,0.18);
          color: rgba(240,240,240,0.78);
          font-size: 12px;
          font-weight: 800;
        }
        .onboarding-domain-panel {
          margin-top: 18px;
          padding: 18px;
          border-radius: 24px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
        }
        .onboarding-domain-panel-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 14px;
          margin-bottom: 14px;
        }
        .onboarding-domain-panel-title {
          margin-top: 6px;
          color: #f0f0f0;
          font-size: 18px;
          font-weight: 800;
	          letter-spacing: 0;
        }
        .onboarding-domain-confidence {
          flex-shrink: 0;
          padding: 8px 10px;
          border-radius: 999px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.08);
          color: rgba(240,240,240,0.56);
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        .onboarding-domain-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
        }
        .onboarding-domain-card {
          width: 100%;
          min-height: 116px;
          padding: 13px;
          display: grid;
          grid-template-columns: 34px minmax(0, 1fr);
          gap: 11px;
          text-align: left;
          border-radius: 18px;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.035);
          color: #f0f0f0;
        }
        .onboarding-domain-card.active {
          border-color: rgba(0,229,199,0.30);
          background: rgba(0,229,199,0.10);
        }
        .onboarding-domain-icon {
          width: 34px;
          height: 34px;
          border-radius: 12px;
          display: grid;
          place-items: center;
          background: rgba(0,229,199,0.08);
          border: 1px solid rgba(0,229,199,0.14);
        }
        .onboarding-domain-card.active .onboarding-domain-icon {
          background: linear-gradient(135deg, #00e5c7, #7fe7ff);
          border-color: transparent;
        }
        .onboarding-domain-title {
          font-size: 13px;
          font-weight: 800;
          color: #f0f0f0;
          line-height: 1.2;
        }
        .onboarding-domain-copy {
          margin-top: 6px;
          color: rgba(240,240,240,0.50);
          font-size: 11px;
          line-height: 1.45;
        }
        .onboarding-path-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }
        .onboarding-preference-group {
          margin-top: 22px;
          display: grid;
          gap: 10px;
        }
        .onboarding-preference-label {
          color: rgba(240,240,240,0.48);
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }
        .onboarding-preference-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
        }
        .onboarding-preference-card {
          min-height: 92px;
          padding: 14px;
          border-radius: 18px;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.035);
          text-align: left;
          color: rgba(240,240,240,0.72);
        }
        .onboarding-preference-card.active {
          border-color: rgba(0,229,199,0.30);
          background: rgba(0,229,199,0.09);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.06);
        }
        .onboarding-preference-card strong {
          display: block;
          color: #f0f0f0;
          font-size: 13px;
          font-weight: 800;
        }
        .onboarding-preference-card span {
          display: block;
          margin-top: 7px;
          color: rgba(240,240,240,0.52);
          font-size: 12px;
          line-height: 1.45;
        }
        .onboarding-path-card {
          width: 100%;
          padding: 24px 22px;
          border-radius: 28px;
          border: 1px solid rgba(255,255,255,0.08);
          text-align: left;
          min-height: 214px;
        }
        .onboarding-pill-row {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 20px;
        }
        .onboarding-pill {
          min-height: 46px;
          padding: 0 18px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.04);
          color: rgba(240,240,240,0.72);
          font-size: 14px;
          font-weight: 700;
        }
        .onboarding-pill.active {
          color: #071015;
          border-color: rgba(255,255,255,0.16);
          background: linear-gradient(135deg, #00e5c7, #7fe7ff);
          box-shadow: 0 24px 40px rgba(0,229,199,0.16);
        }
        .onboarding-question-stage {
          position: relative;
          min-height: 320px;
        }
        .onboarding-question-card {
          padding: 22px 22px 20px;
          border-radius: 28px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
        }
        .onboarding-question-count {
          color: rgba(240,240,240,0.46);
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }
        .onboarding-question-title {
          margin-top: 16px;
          color: #f0f0f0;
	          font-size: 1.35rem;
          line-height: 1.08;
	          letter-spacing: 0;
        }
        .onboarding-answer-list {
          display: grid;
          gap: 12px;
          margin-top: 24px;
        }
        .onboarding-answer {
          width: 100%;
          padding: 18px 18px;
          border-radius: 20px;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.04);
          color: #f0f0f0;
          text-align: left;
          font-size: 15px;
          font-weight: 600;
        }
        .onboarding-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          margin-top: 26px;
          flex-wrap: wrap;
        }
        .onboarding-secondary {
          min-height: 48px;
          padding: 0 18px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.04);
          color: rgba(240,240,240,0.7);
          font-size: 14px;
          font-weight: 700;
        }
        .onboarding-primary {
          min-height: 50px;
          padding: 0 22px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,0.10);
          background: linear-gradient(135deg, #00e5c7 0%, #7fe7ff 48%, #97a5ff 100%);
          color: #071015;
          font-size: 14px;
          font-weight: 800;
          box-shadow: 0 24px 44px rgba(0,229,199,0.18);
        }
        .onboarding-primary:disabled {
          opacity: 0.4;
          box-shadow: none;
        }
        .onboarding-rail-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 14px;
          margin-bottom: 20px;
        }
        .onboarding-rail-eyebrow,
        .onboarding-rail-label {
          color: rgba(240,240,240,0.44);
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }
        .onboarding-rail-title {
          margin-top: 10px;
          color: #f0f0f0;
          font-size: 28px;
          font-weight: 700;
          line-height: 1.02;
	          letter-spacing: 0;
        }
        .onboarding-rail-chip {
          padding: 8px 12px;
          border-radius: 999px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.08);
          color: rgba(240,240,240,0.72);
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          white-space: nowrap;
        }
        .onboarding-rail-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }
        .onboarding-rail-grid > div,
        .onboarding-route-summary {
          padding: 16px;
          border-radius: 20px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.06);
        }
        .onboarding-rail-grid label {
          display: block;
          color: rgba(240,240,240,0.42);
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.12em;
        }
        .onboarding-rail-grid strong {
          display: block;
          margin-top: 8px;
          color: #f0f0f0;
          font-size: 16px;
          font-weight: 700;
        }
        .onboarding-route-block {
          margin-top: 16px;
        }
        .onboarding-route-list {
          display: grid;
          gap: 10px;
          margin-top: 12px;
        }
        .onboarding-route-item {
          display: grid;
          grid-template-columns: 36px minmax(0, 1fr);
          gap: 12px;
          align-items: start;
          padding: 14px;
          border-radius: 18px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.05);
        }
        .onboarding-route-index {
          width: 36px;
          height: 36px;
          border-radius: 999px;
          display: grid;
          place-items: center;
          background: rgba(255,255,255,0.06);
          color: rgba(240,240,240,0.56);
          font-size: 12px;
          font-weight: 800;
        }
        .onboarding-route-index.active {
          background: rgba(0,229,199,0.16);
          color: #00e5c7;
          border: 1px solid rgba(0,229,199,0.20);
        }
        .onboarding-route-title {
          color: #f0f0f0;
          font-size: 15px;
          font-weight: 700;
        }
        .onboarding-route-copy,
        .onboarding-route-summary p {
          margin-top: 4px;
          color: rgba(240,240,240,0.54);
          font-size: 13px;
          line-height: 1.65;
        }
        .onboarding-generation {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(280px, 0.9fr);
          gap: 24px;
          align-items: center;
        }
        .onboarding-build-visual {
          position: relative;
          min-height: 320px;
          border-radius: 32px;
          background:
            radial-gradient(circle at center, rgba(0,229,199,0.14), rgba(255,255,255,0.02) 42%, transparent 62%),
            linear-gradient(180deg, rgba(14,14,22,0.96), rgba(10,10,15,0.98));
          border: 1px solid rgba(255,255,255,0.08);
          overflow: hidden;
        }
        .onboarding-build-visual::before,
        .onboarding-build-visual::after {
          content: '';
          position: absolute;
          inset: 50%;
          width: 220px;
          height: 220px;
          margin-left: -110px;
          margin-top: -110px;
          border-radius: 999px;
          border: 1px solid rgba(0,229,199,0.14);
          animation: onboardingOrbit 10s linear infinite;
        }
        .onboarding-build-visual::after {
          width: 320px;
          height: 320px;
          margin-left: -160px;
          margin-top: -160px;
          animation-duration: 14s;
          opacity: 0.6;
        }
        .onboarding-core-orb {
          position: absolute;
          inset: 50%;
          width: 110px;
          height: 110px;
          margin-left: -55px;
          margin-top: -55px;
          border-radius: 999px;
          background: radial-gradient(circle, rgba(0,229,199,0.85), rgba(0,229,199,0.18) 46%, transparent 72%);
          filter: blur(0px);
          animation: onboardingPulse 3.4s ease-in-out infinite;
          box-shadow: 0 0 60px rgba(0,229,199,0.22);
        }
        .onboarding-node {
          position: absolute;
          width: 14px;
          height: 14px;
          border-radius: 999px;
          background: #f0f0f0;
          box-shadow: 0 0 18px rgba(255,255,255,0.22);
        }
        .onboarding-node.one { top: 20%; left: 32%; }
        .onboarding-node.two { top: 28%; right: 24%; background: #00e5c7; }
        .onboarding-node.three { bottom: 26%; left: 24%; }
        .onboarding-node.four { bottom: 20%; right: 32%; background: #7fe7ff; }
        .onboarding-success {
          display: grid;
          gap: 18px;
        }
        .onboarding-success-badge {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          width: fit-content;
          padding: 10px 14px;
          border-radius: 999px;
          background: rgba(0,229,199,0.12);
          border: 1px solid rgba(0,229,199,0.18);
          color: #c7fff4;
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.14em;
        }
	        .onboarding-error {
	          margin-top: 18px;
	          padding: 14px 16px;
          border-radius: 18px;
          background: rgba(255,107,107,0.10);
          border: 1px solid rgba(255,107,107,0.18);
	          color: #ff9b9b;
	          font-size: 14px;
	        }
	        .onboarding-shell {
	          max-width: 1180px;
	          padding-top: calc(env(safe-area-inset-top, 0px) + 24px);
	        }
	        .onboarding-top {
	          margin-bottom: 22px;
	        }
	        .onboarding-header {
	          max-width: 880px;
	        }
	        .onboarding-title {
	          max-width: 820px;
	          font-size: 4.7rem;
	          line-height: 1.02;
	          letter-spacing: 0;
	        }
	        .onboarding-copy {
	          max-width: 660px;
	          font-size: 16px;
	          line-height: 1.65;
	        }
	        .onboarding-layout {
	          grid-template-columns: minmax(0, 1fr) 340px;
	          gap: 18px;
	        }
	        .onboarding-main-card {
	          min-height: 620px;
	          padding: 24px;
	        }
	        .onboarding-progress {
	          gap: 12px;
	          margin-bottom: 22px;
	        }
	        .onboarding-progress-track {
	          height: 7px;
	        }
	        .onboarding-progress-steps {
	          grid-template-columns: repeat(3, minmax(0, 1fr));
	        }
	        .onboarding-progress-badge {
	          width: 30px;
	          height: 30px;
	        }
	        .onboarding-step-header {
	          margin-bottom: 18px;
	        }
	        .onboarding-step-header h2 {
	          font-size: 2.35rem;
	          line-height: 1.08;
	          letter-spacing: 0;
	        }
	        .onboarding-goal-composer {
	          padding: 18px;
	          border-radius: 24px;
	          background:
	            linear-gradient(180deg, rgba(255,255,255,0.055), rgba(255,255,255,0.025)),
	            radial-gradient(circle at 12% 0%, rgba(0,229,199,0.12), transparent 34%);
	          border: 1px solid rgba(255,255,255,0.09);
	        }
	        .onboarding-input-label,
	        .onboarding-example-label {
	          display: block;
	          color: rgba(240,240,240,0.52);
	          font-size: 11px;
	          font-weight: 800;
	          letter-spacing: 0.14em;
	          text-transform: uppercase;
	        }
	        .onboarding-goal-input {
	          min-height: 118px;
	          resize: vertical;
	          margin-top: 10px;
	          border-radius: 20px;
	          font-size: 18px;
	          line-height: 1.5;
	          background: rgba(2,8,12,0.54);
	          box-shadow: inset 0 1px 0 rgba(255,255,255,0.05);
	        }
	        .onboarding-example-label {
	          margin-top: 18px;
	        }
	        .onboarding-suggestion-grid {
	          display: flex;
	          flex-wrap: wrap;
	          gap: 10px;
	          margin-top: 10px;
	        }
	        .onboarding-suggestion-chip {
	          min-height: 42px;
	          display: inline-flex;
	          align-items: center;
	          gap: 8px;
	          padding: 0 14px;
	          border-radius: 999px;
	          border: 1px solid rgba(255,255,255,0.09);
	          background: rgba(255,255,255,0.04);
	          color: rgba(240,240,240,0.76);
	          font-size: 13px;
	          font-weight: 800;
	        }
	        .onboarding-suggestion-chip.active {
	          border-color: rgba(255,255,255,0.20);
	          background: linear-gradient(135deg, #00e5c7, #7fe7ff);
	          color: #071015;
	        }
	        .onboarding-calibration-list {
	          display: grid;
	          gap: 12px;
	        }
	        .onboarding-question-card {
	          padding: 18px;
	          border-radius: 22px;
	          background: rgba(255,255,255,0.035);
	        }
	        .onboarding-question-title {
	          margin-top: 8px;
	          font-size: 1.35rem;
	          line-height: 1.24;
	          letter-spacing: 0;
	        }
	        .onboarding-question-helper {
	          margin-top: 8px;
	          color: rgba(240,240,240,0.52);
	          font-size: 13px;
	          line-height: 1.55;
	        }
	        .onboarding-answer-list {
	          grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
	          gap: 10px;
	          margin-top: 14px;
	        }
	        .onboarding-answer {
	          min-height: 52px;
	          padding: 13px 14px;
	          border-radius: 16px;
	          font-size: 13px;
	          line-height: 1.35;
	        }
	        .onboarding-answer.active {
	          border-color: rgba(0,229,199,0.34);
	          background: rgba(0,229,199,0.11);
	          box-shadow: inset 0 1px 0 rgba(255,255,255,0.08), 0 14px 28px rgba(0,229,199,0.08);
	        }
	        .onboarding-inferred-strip,
	        .onboarding-loading-card {
	          margin-top: 14px;
	          display: grid;
	          grid-template-columns: repeat(3, minmax(0, 1fr));
	          gap: 10px;
	          padding: 14px;
	          border-radius: 20px;
	          background: rgba(0,229,199,0.06);
	          border: 1px solid rgba(0,229,199,0.12);
	        }
	        .onboarding-inferred-strip span {
	          display: block;
	          color: rgba(240,240,240,0.46);
	          font-size: 10px;
	          font-weight: 800;
	          letter-spacing: 0.12em;
	          text-transform: uppercase;
	        }
	        .onboarding-inferred-strip strong {
	          display: block;
	          margin-top: 5px;
	          color: #f0f0f0;
	          font-size: 13px;
	          text-transform: capitalize;
	        }
	        .onboarding-loading-card {
	          grid-template-columns: 42px minmax(0, 1fr);
	          align-items: center;
	        }
	        .onboarding-loading-card strong,
	        .onboarding-loading-card span {
	          display: block;
	        }
	        .onboarding-loading-card strong {
	          color: #f0f0f0;
	          font-size: 16px;
	        }
	        .onboarding-loading-card span {
	          margin-top: 4px;
	          color: rgba(240,240,240,0.56);
	          font-size: 13px;
	        }
	        .onboarding-snapshot {
	          padding: 22px;
	          position: sticky;
	          top: 24px;
	        }
	        .onboarding-snapshot-top {
	          display: grid;
	          grid-template-columns: 42px minmax(0, 1fr);
	          gap: 12px;
	          align-items: start;
	        }
	        .onboarding-snapshot-icon {
	          width: 42px;
	          height: 42px;
	          border-radius: 14px;
	          display: grid;
	          place-items: center;
	          background: linear-gradient(135deg, #00e5c7, #7fe7ff);
	          box-shadow: 0 16px 34px rgba(0,229,199,0.16);
	        }
	        .onboarding-snapshot-note {
	          margin: 16px 0;
	          color: rgba(240,240,240,0.58);
	          font-size: 13px;
	          line-height: 1.62;
	        }
	        .onboarding-cadence-note {
	          margin-top: 10px;
	          padding: 10px 12px;
	          border-radius: 14px;
	          background: rgba(127,231,255,0.07);
	          border: 1px solid rgba(127,231,255,0.10);
	          color: rgba(240,240,240,0.58);
	          font-size: 12px;
	          font-weight: 700;
	        }
	        .onboarding-rail-title {
	          margin-top: 6px;
	          font-size: 1.15rem;
	          line-height: 1.22;
	          letter-spacing: 0;
	        }
	        .onboarding-rail-grid {
	          grid-template-columns: repeat(2, minmax(0, 1fr));
	          gap: 8px;
	        }
	        .onboarding-rail-grid > div,
	        .onboarding-route-summary,
	        .onboarding-route-item {
	          border-radius: 16px;
	        }
	        .onboarding-route-list {
	          gap: 8px;
	        }
	        .onboarding-route-title {
	          font-size: 13px;
	        }
	        .onboarding-generation {
	          grid-template-columns: 240px minmax(0, 1fr);
	        }
	        .onboarding-build-visual {
	          min-height: 260px;
	          border-radius: 26px;
	        }
	        @media (max-width: 1120px) {
	          .onboarding-layout,
	          .onboarding-generation {
	            grid-template-columns: minmax(0, 1fr);
	          }
	          .onboarding-snapshot {
	            position: static;
	          }
	        }
        @media (max-width: 860px) {
          .onboarding-goal-grid,
          .onboarding-domain-grid,
          .onboarding-path-grid,
          .onboarding-preference-grid {
            grid-template-columns: minmax(0, 1fr);
          }
        }
        @media (max-width: 640px) {
          .onboarding-shell {
            padding: calc(env(safe-area-inset-top, 0px) + 20px) 16px 36px;
          }
          .onboarding-main-card {
            padding: 22px 18px;
          }
	          .onboarding-progress-steps,
	          .onboarding-rail-grid {
	            grid-template-columns: repeat(3, minmax(0, 1fr));
	          }
	          .onboarding-title {
	            font-size: 2.65rem;
	          }
	          .onboarding-step-header h2 {
	            font-size: 1.9rem;
	          }
	          .onboarding-copy {
	            font-size: 15px;
	          }
	          .onboarding-inferred-strip,
	          .onboarding-answer-list,
	          .onboarding-rail-grid {
	            grid-template-columns: minmax(0, 1fr);
	          }
          .onboarding-footer {
            flex-direction: column;
            align-items: stretch;
          }
          .onboarding-secondary,
          .onboarding-primary {
            width: 100%;
          }
        }
      `}</style>

      <div className="pathai-onboarding">
        <AtmosphericBackdrop variant="onboarding" />

	        <div className="onboarding-shell">
	          <div className="onboarding-top">
	            <ScrollReveal className="onboarding-header" distance={0}>
	              <div className="onboarding-brand">
                <div className="onboarding-brandmark">
                  <IconGlyph name="bolt" size={20} strokeWidth={2.5} color="#071015" />
                </div>
                <div>
	                  <div style={{ color: '#f0f0f0', fontSize: 24, fontWeight: 800, letterSpacing: 0 }}>PathAI</div>
	                  <div style={{ color: 'rgba(240,240,240,0.44)', fontSize: 12 }}>Goal-based onboarding</div>
	                </div>
	              </div>
	              <div className="onboarding-eyebrow" style={{ marginTop: 24 }}>Fast route setup</div>
	              <h1 className="font-display onboarding-title">Tell PathAI the goal. We ask only what is missing.</h1>
	              <p className="onboarding-copy">
	                A cleaner onboarding flow: one goal, a few smart calibration questions, then a first route that starts at the right depth.
	              </p>
	            </ScrollReveal>
	          </div>
	
	          <div className="onboarding-layout">
	            <PremiumFrame accent={`${accent}1a`} className="onboarding-main-card">
	              <div className="onboarding-progress">
	                <div className="onboarding-progress-track">
                  <motion.div
                    className="onboarding-progress-fill"
                    initial={false}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: reduceMotion ? 0 : 0.35, ease: [0.22, 1, 0.36, 1] }}
                  />
                </div>
                <div className="onboarding-progress-steps">
                  {STEPS.map((label, index) => {
                    const stepNumber = index + 1
                    const completed = step > stepNumber
                    const active = step === stepNumber
                    return (
                      <div className="onboarding-progress-node" key={label}>
                        <div className={`onboarding-progress-badge ${completed ? 'complete' : active ? 'active' : ''}`}>
                          {completed ? <IconGlyph name="check" size={14} strokeWidth={2.8} color="#071015" /> : stepNumber}
                        </div>
                        <div className="onboarding-progress-label">{stepNumber}</div>
                      </div>
                    )
                  })}
                </div>
              </div>
	
	              <div className="onboarding-step-header">
	                <h2 className="font-display">{STEPS[step - 1]}</h2>
	                <p>
	                  {step === 1 && 'Type the real thing you want to learn. Examples are just quick starts, not a fixed menu.'}
	                  {step === 2 && 'PathAI generated these questions from your goal to fill in the gaps without a long setup survey.'}
	                  {step === 3 && 'Building the route, first mission, and starting difficulty from your answers.'}
	                </p>
	              </div>

              {error ? <div className="onboarding-error">{error}</div> : null}

              <AnimatePresence mode="wait" custom={direction}>
	                <motion.div
	                  key={`${step}-${loading}-${buildReady}-${questionLoading}`}
	                  custom={direction}
	                  initial={reduceMotion ? { opacity: 1 } : { opacity: 0, x: direction > 0 ? 40 : -40 }}
	                  animate={{ opacity: 1, x: 0 }}
                  exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: direction > 0 ? -34 : 34 }}
                  transition={{ duration: reduceMotion ? 0 : 0.3, ease: [0.22, 1, 0.36, 1] }}
	                >
	                  {step === 1 && (
	                    <>
	                      <div className="onboarding-goal-composer">
	                        <label className="onboarding-input-label" htmlFor="pathai-onboarding-goal">What should PathAI help you do?</label>
	                        <textarea
	                          id="pathai-onboarding-goal"
	                          value={customGoal}
	                          onChange={(event) => {
	                            setCustomGoal(event.target.value)
	                            if (event.target.value.trim()) setPresetGoal('')
	                          }}
	                          placeholder="Example: I want to learn Python so I can build small automation tools."
	                          className="onboarding-input onboarding-goal-input"
	                          rows={3}
	                        />
	                        <div className="onboarding-example-label">Quick starts</div>
	                        <div className="onboarding-suggestion-grid">
	                          {GOAL_OPTIONS.map((option) => {
	                            const selected = presetGoal === option.label && !customGoal.trim()
	                            return (
	                              <button
	                                type="button"
	                                key={option.label}
	                                className={`onboarding-suggestion-chip interactive-secondary ${selected ? 'active' : ''}`}
	                                onClick={() => {
	                                  setPresetGoal(option.label)
	                                  setCustomGoal('')
	                                }}
	                              >
	                                <IconGlyph name={option.icon} size={16} strokeWidth={2.4} color={selected ? '#071015' : '#7fe7ff'} />
	                                <span>{option.label}</span>
	                              </button>
	                            )
	                          })}
	                        </div>
	                      </div>
	
	                      {domainClassification && domainGoalSnapshot === goal && !domainPickerVisible && confirmedDomain && (
	                        <div className="onboarding-domain-confirmed">
                          <IconGlyph name="check" size={14} strokeWidth={2.6} color="#00e5c7" />
                          <span>{DOMAIN_METADATA[confirmedDomain]?.label || confirmedDomain} route selected</span>
                        </div>
                      )}

                      {domainPickerVisible && (
                        <div className="onboarding-domain-panel">
                          <div className="onboarding-domain-panel-top">
                            <div>
                              <div className="onboarding-rail-label">Confirm learning domain</div>
                              <div className="onboarding-domain-panel-title">
                                Pick the route engine PathAI should use.
                              </div>
                            </div>
                            {domainClassification ? (
                              <div className="onboarding-domain-confidence">
                                {Math.round((domainClassification.confidence || 0) * 100)}% sure
                              </div>
                            ) : null}
                          </div>
                          <div className="onboarding-domain-grid">
                            {LEARNING_DOMAINS.map((domain) => (
                              <DomainOption
                                key={domain}
                                domain={domain}
                                selected={confirmedDomain === domain}
                                onSelect={() => {
                                  setSelectedDomain(domain)
                                  setStoredLearningDomain(domain)
                                }}
                              />
                            ))}
                          </div>
                        </div>
                      )}
	
	                      <div className="onboarding-footer">
	                        <div style={{ color: 'rgba(240,240,240,0.44)', fontSize: 13 }}>Step 1 of 3</div>
	                        <button
	                          type="button"
	                          className="onboarding-primary interactive-cta"
	                          onClick={handleGoalContinue}
	                          disabled={!goal || domainDetecting || questionLoading || (domainPickerVisible && !confirmedDomain)}
	                        >
	                          {domainDetecting || questionLoading
	                            ? 'Preparing questions...'
	                            : domainPickerVisible
	                              ? `Use ${DOMAIN_METADATA[confirmedDomain]?.label || 'this domain'}`
	                              : 'Continue'}
	                        </button>
	                      </div>
	                    </>
	                  )}
	
	                  {step === 2 && (
	                    <>
	                      {questionLoading ? (
	                        <div className="onboarding-loading-card">
	                          <IconGlyph name="sparkles" size={22} strokeWidth={2.4} color="#7fe7ff" />
	                          <div>
	                            <strong>Writing questions for {getShortGoal(goal)}</strong>
	                            <span>PathAI is using the goal to ask only what it cannot infer.</span>
	                          </div>
	                        </div>
	                      ) : (
	                        <>
	                          <div className="onboarding-calibration-list">
	                            {questions.map((question, index) => (
	                              <div className="onboarding-question-card" key={question.id}>
	                                <div className="onboarding-question-count">Question {index + 1}</div>
	                                <div className="font-display onboarding-question-title">{question.prompt}</div>
	                                {question.helper ? <p className="onboarding-question-helper">{question.helper}</p> : null}
	                                <div className="onboarding-answer-list">
	                                  {question.options.map((option) => {
	                                    const selected = answers[question.id]?.label === option.label
	                                    return (
	                                      <button
	                                        type="button"
	                                        className={`onboarding-answer interactive-card ${selected ? 'active' : ''}`}
	                                        key={option.label}
	                                        onClick={() => handleAnswer(question, option)}
	                                      >
	                                        {option.label}
	                                      </button>
	                                    )
	                                  })}
	                                </div>
	                              </div>
	                            ))}
	                          </div>
	
	                          <div className="onboarding-inferred-strip">
	                            <div>
	                              <span>Route engine</span>
	                              <strong>{getDomainLabel(confirmedDomain, family)}</strong>
	                            </div>
	                            <div>
	                              <span>Start depth</span>
	                              <strong>{recommendedLevel}</strong>
	                            </div>
	                            <div>
	                              <span>Pace</span>
	                              <strong>{pace}</strong>
	                            </div>
	                          </div>
	                        </>
	                      )}
	
	                      <div className="onboarding-footer">
	                        <button type="button" className="onboarding-secondary interactive-secondary" onClick={() => goToStep(1, -1)}>
	                          Back
	                        </button>
	                        <button
	                          type="button"
	                          className="onboarding-primary interactive-cta"
	                          onClick={() => goToStep(3, 1)}
	                          disabled={questionLoading || !allQuestionsAnswered}
	                        >
	                          Build my path
	                        </button>
	                      </div>
	                    </>
	                  )}
	
	                  {step === 3 && (
	                    <>
	                      <div className="onboarding-generation">
	                        <div className="onboarding-build-visual">
                          <div className="onboarding-core-orb" />
                          <div className="onboarding-node one" />
                          <div className="onboarding-node two" />
                          <div className="onboarding-node three" />
                          <div className="onboarding-node four" />
                        </div>

                        <div>
                          {buildReady ? (
                            <div className="onboarding-success">
                              <div className="onboarding-success-badge">
                                <IconGlyph name="check" size={14} strokeWidth={2.6} color="#00e5c7" />
                                Your first mission is ready
                              </div>
	                              <div style={{ color: '#f0f0f0', fontSize: 34, fontWeight: 700, lineHeight: 1.04, letterSpacing: 0 }}>
                                Path calibrated. Launch when you are ready.
                              </div>
                              <div style={{ color: 'rgba(240,240,240,0.56)', fontSize: 15, lineHeight: 1.72 }}>
                                We mapped the first route, first mission, and first milestone. The dashboard is ready with your opening stack.
                              </div>
                              <button type="button" className="onboarding-primary interactive-cta" onClick={() => router.push('/dashboard')}>
                                Let&apos;s go
                              </button>
                            </div>
                          ) : (
                            <>
	                              <div style={{ color: '#f0f0f0', fontSize: 32, fontWeight: 700, lineHeight: 1.04, letterSpacing: 0, marginBottom: 12 }}>
                                Building your path...
                              </div>
	                              <div style={{ color: 'rgba(240,240,240,0.56)', fontSize: 15, lineHeight: 1.72, marginBottom: 20 }}>
	                                We are turning your goal and calibration into a first route that already feels pointed and personal.
	                              </div>
	                              <GenerationStepList steps={GENERATION_STEPS} activeIndex={genStep} accent={accent} />
	                            </>
                          )}
                        </div>
                      </div>

	                      {!loading && !buildReady ? (
	                        <div className="onboarding-footer">
	                          <button type="button" className="onboarding-secondary interactive-secondary" onClick={() => goToStep(2, -1)}>
	                            Back
	                          </button>
                          <button type="button" className="onboarding-primary interactive-cta" onClick={startGeneration}>
                            Try again
                          </button>
                        </div>
                      ) : null}
                    </>
                  )}
                </motion.div>
	              </AnimatePresence>
	            </PremiumFrame>

	            <PreviewRail
	              preview={preview}
	              cadence={cadence}
	              pathStyle={pathStyle}
	              pace={pace}
	              recommendedLevel={recommendedLevel}
	              accent={accent}
	              goal={goal}
	              family={family}
	              domain={confirmedDomain}
	              summary={calibration.summary}
	            />
	          </div>
	        </div>
      </div>
    </>
  )
}
