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
import { getSafeSupabaseSession, getSafeSupabaseUser, supabaseData } from '@/lib/supabase'
import { consumeSupabaseAuthRedirect } from '@/lib/supabaseAuth'

const STEPS = [
  'What do you want to learn?',
  'How should we build your path?',
  "Let's see where you're starting.",
  'Building your path...',
]

const GOAL_OPTIONS = [
  { label: 'Learn JavaScript', description: 'Code, logic, and real builds', icon: 'code', accent: '#00e5c7' },
  { label: 'Master Machine Learning', description: 'Models, evaluation, and projects', icon: 'brain', accent: '#84a3ff' },
  { label: 'Learn Python', description: 'From zero to building real tools', icon: 'cpu', accent: '#60A5FA' },
  { label: 'Learn Spanish', description: 'Conversation, grammar, and confidence', icon: 'message', accent: '#34D399' },
  { label: 'UI/UX Design', description: 'Hierarchy, systems, and interface craft', icon: 'design', accent: '#f472b6' },
  { label: 'Build Real Projects', description: 'Create portfolio-ready proof', icon: 'artifact', accent: '#f59e0b' },
]

const PATH_OPTIONS = [
  {
    id: 'goal',
    title: 'Structured Path',
    description: 'A guided route from foundations to mastery. Best if you want clear daily missions.',
    icon: 'map',
  },
  {
    id: 'explore',
    title: 'Explore Mode',
    description: 'A flexible route that adapts to your curiosity. Best if you want to jump around.',
    icon: 'orbit',
  },
]

const PACE_OPTIONS = [
  { id: 'relaxed', label: 'Relaxed' },
  { id: 'balanced', label: 'Balanced' },
  { id: 'intensive', label: 'Intensive' },
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

function getDiagnosticQuestions(goalFamily) {
  switch (goalFamily) {
    case 'programming':
      return [
        {
          id: 'prog-1',
          prompt: 'Have you written code before?',
          options: [
            { label: 'No, I am brand new', score: 0 },
            { label: 'A little, mostly tutorials', score: 1 },
            { label: 'Yes, I have built small things', score: 2 },
          ],
        },
        {
          id: 'prog-2',
          prompt: 'Do you know what a variable is?',
          options: [
            { label: 'Not yet', score: 0 },
            { label: 'Kind of, but not confidently', score: 1 },
            { label: 'Yes, I use them already', score: 2 },
          ],
        },
        {
          id: 'prog-3',
          prompt: 'Have you ever finished a small website or script?',
          options: [
            { label: 'No', score: 0 },
            { label: 'Almost, with help', score: 1 },
            { label: 'Yes', score: 2 },
          ],
        },
      ]
    case 'machineLearning':
      return [
        {
          id: 'ml-1',
          prompt: 'How familiar are you with Python for data work?',
          options: [
            { label: 'I have never used it', score: 0 },
            { label: 'I can read simple code', score: 1 },
            { label: 'I have used pandas or notebooks', score: 2 },
          ],
        },
        {
          id: 'ml-2',
          prompt: 'Do you know the difference between training and testing data?',
          options: [
            { label: 'Not yet', score: 0 },
            { label: 'Roughly', score: 1 },
            { label: 'Yes, clearly', score: 2 },
          ],
        },
        {
          id: 'ml-3',
          prompt: 'Have you trained any model before?',
          options: [
            { label: 'Never', score: 0 },
            { label: 'Only by following a tutorial', score: 1 },
            { label: 'Yes, a few small experiments', score: 2 },
          ],
        },
      ]
    case 'language':
      return [
        {
          id: 'lang-1',
          prompt: 'Can you hold a basic conversation already?',
          options: [
            { label: 'No, not yet', score: 0 },
            { label: 'A few phrases', score: 1 },
            { label: 'Yes, short exchanges', score: 2 },
          ],
        },
        {
          id: 'lang-2',
          prompt: 'How comfortable are you with grammar basics?',
          options: [
            { label: 'Very new', score: 0 },
            { label: 'I know some rules', score: 1 },
            { label: 'Pretty comfortable', score: 2 },
          ],
        },
        {
          id: 'lang-3',
          prompt: 'Have you practiced speaking out loud regularly?',
          options: [
            { label: 'No', score: 0 },
            { label: 'Sometimes', score: 1 },
            { label: 'Yes', score: 2 },
          ],
        },
      ]
    case 'design':
      return [
        {
          id: 'design-1',
          prompt: 'Have you designed an interface before?',
          options: [
            { label: 'No, I am new', score: 0 },
            { label: 'Only small mockups', score: 1 },
            { label: 'Yes, real screens or flows', score: 2 },
          ],
        },
        {
          id: 'design-2',
          prompt: 'How strong is your understanding of hierarchy and layout?',
          options: [
            { label: 'Very early', score: 0 },
            { label: 'Basic understanding', score: 1 },
            { label: 'Comfortable applying it', score: 2 },
          ],
        },
        {
          id: 'design-3',
          prompt: 'Do you already use a tool like Figma?',
          options: [
            { label: 'Not yet', score: 0 },
            { label: 'A little', score: 1 },
            { label: 'Yes, regularly', score: 2 },
          ],
        },
      ]
    default:
      return [
        {
          id: 'gen-1',
          prompt: 'How experienced are you with this skill today?',
          options: [
            { label: 'Complete beginner', score: 0 },
            { label: 'Some exposure', score: 1 },
            { label: 'I have built small wins', score: 2 },
          ],
        },
        {
          id: 'gen-2',
          prompt: 'How often have you practiced this recently?',
          options: [
            { label: 'Almost never', score: 0 },
            { label: 'Occasionally', score: 1 },
            { label: 'Fairly consistently', score: 2 },
          ],
        },
        {
          id: 'gen-3',
          prompt: 'How much of the basics do you already recognize?',
          options: [
            { label: 'Very little', score: 0 },
            { label: 'Some of it', score: 1 },
            { label: 'Most of it', score: 2 },
          ],
        },
      ]
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

function resolveCadence(pathStyle, pace, recommendedLevel) {
  if (pathStyle === 'explore') {
    return {
      mode: 'explore',
      days: 0,
      weekdayMins: pace === 'intensive' ? 40 : 30,
      weekendMins: pace === 'relaxed' ? 45 : 60,
    }
  }

  const paceMap = {
    relaxed: { days: 56, weekdayMins: 25, weekendMins: 45 },
    balanced: { days: 42, weekdayMins: 30, weekendMins: 60 },
    intensive: { days: 28, weekdayMins: 40, weekendMins: 75 },
  }

  const base = paceMap[pace] || paceMap.balanced

  if (recommendedLevel === 'Advanced') {
    return {
      mode: 'goal',
      days: Math.max(21, base.days - 10),
      weekdayMins: base.weekdayMins,
      weekendMins: Math.max(45, base.weekendMins - 15),
    }
  }

  if (recommendedLevel === 'Beginner') {
    return {
      mode: 'goal',
      days: base.days + 7,
      weekdayMins: base.weekdayMins,
      weekendMins: base.weekendMins,
    }
  }

  return { mode: 'goal', ...base }
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

function GoalCard({ option, selected, onSelect }) {
  return (
    <button
      type="button"
      className="onboarding-goal-card interactive-card"
      onClick={onSelect}
      style={{
        '--goal-accent': option.accent,
        borderColor: selected ? `${option.accent}50` : 'rgba(255,255,255,0.08)',
        background: selected
          ? `linear-gradient(180deg, ${option.accent}14, rgba(18,18,26,0.96))`
          : 'linear-gradient(180deg, rgba(18,18,26,0.96), rgba(11,11,17,0.98))',
        boxShadow: selected
          ? `0 30px 64px ${option.accent}12, inset 0 1px 0 rgba(255,255,255,0.10)`
          : '0 22px 54px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.06)',
      }}
    >
      <div className="onboarding-goal-icon" style={{ background: selected ? `${option.accent}18` : 'rgba(255,255,255,0.04)' }}>
        <IconGlyph name={option.icon} size={20} strokeWidth={2.2} color={selected ? option.accent : '#d7dce3'} />
      </div>
      <div className="onboarding-goal-title">{option.label}</div>
      <div className="onboarding-goal-copy">{option.description}</div>
    </button>
  )
}

function PathOption({ option, selected, onSelect }) {
  return (
    <button
      type="button"
      className="onboarding-path-card interactive-card"
      onClick={onSelect}
      style={{
        borderColor: selected ? 'rgba(0,229,199,0.26)' : 'rgba(255,255,255,0.08)',
        background: selected
          ? 'linear-gradient(180deg, rgba(0,229,199,0.10), rgba(13,14,20,0.96))'
          : 'linear-gradient(180deg, rgba(18,18,26,0.96), rgba(11,11,17,0.98))',
      }}
    >
      <div className="onboarding-path-icon">
        <IconGlyph name={option.icon} size={22} strokeWidth={2.2} color={selected ? '#00e5c7' : '#d8dce3'} />
      </div>
      <div>
        <div className="onboarding-path-title">{option.title}</div>
        <div className="onboarding-path-copy">{option.description}</div>
      </div>
    </button>
  )
}

function PreviewRail({ preview, cadence, pathStyle, pace, recommendedLevel, accent, goal, family }) {
  return (
    <PremiumFrame accent={`${accent}1c`} style={{ padding: 26, height: '100%' }}>
      <div className="onboarding-rail-top">
        <div>
          <div className="onboarding-rail-eyebrow">PathAI Preview</div>
          <div className="onboarding-rail-title">{goal || 'Your learning route'}</div>
        </div>
        <div className="onboarding-rail-chip">{family === 'machineLearning' ? 'Machine Learning' : family === 'programming' ? 'Programming' : family === 'language' ? 'Language' : family === 'design' ? 'Design' : 'Adaptive'}</div>
      </div>

      <div className="onboarding-rail-grid">
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

      <div className="onboarding-route-block">
        <div className="onboarding-rail-label">Projected route</div>
        <div className="onboarding-route-list">
          {preview.route.map((item, index) => (
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
        <div className="onboarding-rail-label">What PathAI will optimize</div>
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
  const [answers, setAnswers] = useState({})
  const [questionIndex, setQuestionIndex] = useState(0)
  const [loading, setLoading] = useState(false)
  const [genStep, setGenStep] = useState(0)
  const [buildReady, setBuildReady] = useState(false)
  const [error, setError] = useState('')

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
  const questions = useMemo(() => getDiagnosticQuestions(family), [family])
  const diagnosticScore = useMemo(
    () => questions.reduce((sum, question) => sum + (answers[question.id]?.score || 0), 0),
    [answers, questions],
  )
  const recommendedLevel = useMemo(() => getRecommendedLevel(diagnosticScore), [diagnosticScore])
  const cadence = useMemo(() => resolveCadence(pathStyle, pace, recommendedLevel), [pathStyle, pace, recommendedLevel])
  const preview = useMemo(
    () => buildPathPreview(goal, family, recommendedLevel, pathStyle),
    [goal, family, recommendedLevel, pathStyle],
  )

  const currentQuestion = questions[questionIndex]
  const allQuestionsAnswered = questions.length > 0 && questions.every((question) => Boolean(answers[question.id]))

  useEffect(() => {
    setAnswers({})
    setQuestionIndex(0)
  }, [family])

  const goToStep = useCallback((nextStep, dir) => {
    setDirection(dir)
    setStep(nextStep)
    setError('')
  }, [])

  const handleAnswer = useCallback((question, option) => {
    setAnswers((current) => ({ ...current, [question.id]: option }))
    if (questionIndex < questions.length - 1) {
      window.setTimeout(() => setQuestionIndex((value) => value + 1), 180)
    }
  }, [questionIndex, questions.length])

  const startGeneration = useCallback(async () => {
    if (!user || !goal) return

    setLoading(true)
    setBuildReady(false)
    setError('')
    setGenStep(0)

    const interval = window.setInterval(() => {
      setGenStep((value) => Math.min(value + 1, GENERATION_STEPS.length - 1))
    }, 1600)

    const knowledge = [
      `Goal family: ${family}`,
      `Recommended level: ${recommendedLevel}`,
      `Diagnostic score: ${diagnosticScore}/${questions.length * 2}`,
      `Preferred pace: ${pace}`,
      `Path style: ${pathStyle === 'explore' ? 'exploration' : 'structured path'}`,
    ].join('. ')

    try {
      if (isLocalAccessUser(user)) {
        await createLocalGoalBundle({
          user,
          goalText: goal,
          mode: cadence.mode,
          days: cadence.days || 30,
          weekdayMins: cadence.weekdayMins,
          weekendMins: cadence.weekendMins,
          knowledge,
          recommendedLevel,
          diagnosticScore,
          pace,
          pathStyle,
        })
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

      const { data: goalData, error: goalError } = await supabaseData
        .from('goals')
        .insert({
          user_id: user.id,
          goal_text: goal,
          mode: cadence.mode,
          deadline: cadence.mode === 'goal' ? deadline.toISOString().split('T')[0] : null,
          weekday_mins: cadence.weekdayMins,
          weekend_mins: cadence.weekendMins,
          constraints: [
            `Recommended level: ${recommendedLevel}`,
            `Diagnostic score: ${diagnosticScore}/${questions.length * 2}`,
            `Pace: ${pace}`,
            `Path style: ${pathStyle}`,
          ],
          status: 'active',
          total_days: cadence.mode === 'goal' ? cadence.days : 0,
        })
        .select()
        .single()

      if (goalError) throw goalError

      const { session } = await getSafeSupabaseSession()
      const accessToken = session?.access_token || null

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
      if (shouldBypassPathGeneration(err?.message)) {
        await createLocalGoalBundle({
          user,
          goalText: goal,
          mode: cadence.mode,
          days: cadence.days || 30,
          weekdayMins: cadence.weekdayMins,
          weekendMins: cadence.weekendMins,
          knowledge,
          recommendedLevel,
          diagnosticScore,
          pace,
          pathStyle,
        })
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
    diagnosticScore,
    family,
    goal,
    pace,
    pathStyle,
    questions.length,
    recommendedLevel,
    router,
    user,
  ])

  useEffect(() => {
    if (step === 4 && !loading && !buildReady && !error && user && goal) {
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
          font-size: clamp(3rem, 7vw, 5.8rem);
          line-height: 0.94;
          letter-spacing: -0.05em;
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
          font-size: clamp(2.2rem, 4vw, 3.2rem);
          line-height: 0.98;
          letter-spacing: -0.04em;
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
          letter-spacing: -0.03em;
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
        .onboarding-path-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
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
          font-size: clamp(1.8rem, 3vw, 2.4rem);
          line-height: 1.08;
          letter-spacing: -0.04em;
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
          letter-spacing: -0.05em;
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
        @media (max-width: 1120px) {
          .onboarding-layout,
          .onboarding-generation {
            grid-template-columns: minmax(0, 1fr);
          }
        }
        @media (max-width: 860px) {
          .onboarding-goal-grid,
          .onboarding-path-grid {
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
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .onboarding-title {
            font-size: clamp(2.8rem, 14vw, 4.2rem);
          }
          .onboarding-copy {
            font-size: 15px;
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
                  <div style={{ color: '#f0f0f0', fontSize: 24, fontWeight: 800, letterSpacing: '-0.05em' }}>PathAI</div>
                  <div style={{ color: 'rgba(240,240,240,0.44)', fontSize: 12 }}>Goal-based onboarding</div>
                </div>
              </div>
              <div className="onboarding-eyebrow" style={{ marginTop: 24 }}>Premium route builder</div>
              <h1 className="font-display onboarding-title">Build a route that feels serious from the first mission.</h1>
              <p className="onboarding-copy">
                PathAI maps the goal, calibrates the starting depth, and builds a first day that already feels like momentum.
              </p>
            </ScrollReveal>
          </div>

          <div className="onboarding-layout">
            <PreviewRail
              preview={preview}
              cadence={cadence}
              pathStyle={pathStyle}
              pace={pace}
              recommendedLevel={recommendedLevel}
              accent={accent}
              goal={goal}
              family={family}
            />

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
                  {step === 1 && 'Choose a launch direction or type your own goal. The route builder uses that signal to shape the first mission.'}
                  {step === 2 && 'Pick the structure and pace that should define your route. This changes how PathAI sequences your daily work.'}
                  {step === 3 && 'A quick diagnostic lets us aim the right starting depth instead of dropping you into a generic beginner course.'}
                  {step === 4 && 'We are building your first route right now, with the first mission ready as soon as generation finishes.'}
                </p>
              </div>

              {error ? <div className="onboarding-error">{error}</div> : null}

              <AnimatePresence mode="wait" custom={direction}>
                <motion.div
                  key={`${step}-${questionIndex}-${loading}-${buildReady}`}
                  custom={direction}
                  initial={reduceMotion ? { opacity: 1 } : { opacity: 0, x: direction > 0 ? 40 : -40 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: direction > 0 ? -34 : 34 }}
                  transition={{ duration: reduceMotion ? 0 : 0.3, ease: [0.22, 1, 0.36, 1] }}
                >
                  {step === 1 && (
                    <>
                      <div className="onboarding-goal-grid">
                        {GOAL_OPTIONS.map((option) => (
                          <GoalCard
                            key={option.label}
                            option={option}
                            selected={presetGoal === option.label && !customGoal.trim()}
                            onSelect={() => {
                              setPresetGoal(option.label)
                              setCustomGoal('')
                            }}
                          />
                        ))}
                      </div>

                      <input
                        value={customGoal}
                        onChange={(event) => setCustomGoal(event.target.value)}
                        placeholder="Or type your own goal..."
                        className="onboarding-input"
                      />

                      <div className="onboarding-footer">
                        <div style={{ color: 'rgba(240,240,240,0.44)', fontSize: 13 }}>Step 1 of 4</div>
                        <button
                          type="button"
                          className="onboarding-primary interactive-cta"
                          onClick={() => goToStep(2, 1)}
                          disabled={!goal}
                        >
                          Continue
                        </button>
                      </div>
                    </>
                  )}

                  {step === 2 && (
                    <>
                      <div className="onboarding-path-grid">
                        {PATH_OPTIONS.map((option) => (
                          <PathOption
                            key={option.id}
                            option={option}
                            selected={pathStyle === option.id}
                            onSelect={() => setPathStyle(option.id)}
                          />
                        ))}
                      </div>

                      <div style={{ marginTop: 24 }}>
                        <div className="onboarding-rail-label">How fast do you want to move?</div>
                        <div className="onboarding-pill-row">
                          {PACE_OPTIONS.map((option) => (
                            <button
                              type="button"
                              key={option.id}
                              className={`onboarding-pill interactive-secondary ${pace === option.id ? 'active' : ''}`}
                              onClick={() => setPace(option.id)}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="onboarding-footer">
                        <button type="button" className="onboarding-secondary interactive-secondary" onClick={() => goToStep(1, -1)}>
                          Back
                        </button>
                        <button type="button" className="onboarding-primary interactive-cta" onClick={() => goToStep(3, 1)}>
                          Continue
                        </button>
                      </div>
                    </>
                  )}

                  {step === 3 && currentQuestion && (
                    <>
                      <div className="onboarding-question-stage">
                        <div className="onboarding-question-card">
                          <div className="onboarding-question-count">
                            Question {questionIndex + 1} of {questions.length}
                          </div>
                          <div className="font-display onboarding-question-title">{currentQuestion.prompt}</div>

                          <div className="onboarding-answer-list">
                            {currentQuestion.options.map((option) => {
                              const selected = answers[currentQuestion.id]?.label === option.label
                              return (
                                <button
                                  type="button"
                                  className="onboarding-answer interactive-card"
                                  key={option.label}
                                  onClick={() => handleAnswer(currentQuestion, option)}
                                  style={{
                                    borderColor: selected ? 'rgba(0,229,199,0.26)' : 'rgba(255,255,255,0.08)',
                                    background: selected ? 'rgba(0,229,199,0.10)' : 'rgba(255,255,255,0.04)',
                                  }}
                                >
                                  {option.label}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      </div>

                      <div className="onboarding-footer">
                        <button
                          type="button"
                          className="onboarding-secondary interactive-secondary"
                          onClick={() => {
                            if (questionIndex > 0) {
                              setQuestionIndex((value) => value - 1)
                            } else {
                              goToStep(2, -1)
                            }
                          }}
                        >
                          Back
                        </button>
                        <button
                          type="button"
                          className="onboarding-primary interactive-cta"
                          onClick={() => goToStep(4, 1)}
                          disabled={!allQuestionsAnswered}
                        >
                          Build my path
                        </button>
                      </div>
                    </>
                  )}

                  {step === 4 && (
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
                              <div style={{ color: '#f0f0f0', fontSize: 34, fontWeight: 700, lineHeight: 1.04, letterSpacing: '-0.04em' }}>
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
                              <div style={{ color: '#f0f0f0', fontSize: 32, fontWeight: 700, lineHeight: 1.04, letterSpacing: '-0.04em', marginBottom: 12 }}>
                                Building your path...
                              </div>
                              <div style={{ color: 'rgba(240,240,240,0.56)', fontSize: 15, lineHeight: 1.72, marginBottom: 20 }}>
                                We are turning your goal, pace, and diagnostic into a first route that already feels pointed and personal.
                              </div>
                              <GenerationStepList steps={GENERATION_STEPS} activeIndex={genStep} accent={accent} />
                            </>
                          )}
                        </div>
                      </div>

                      {!loading && !buildReady ? (
                        <div className="onboarding-footer">
                          <button type="button" className="onboarding-secondary interactive-secondary" onClick={() => goToStep(3, -1)}>
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
          </div>
        </div>
      </div>
    </>
  )
}
