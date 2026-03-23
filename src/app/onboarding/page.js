'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import IconGlyph from '@/components/IconGlyph'

const STEP_TITLES = ['Goal', 'Style', 'Level', 'Path', 'Action', 'Launch']

const GOAL_OPTIONS = [
  { label: 'Learn Python', subtitle: 'Code, logic, and real builds', icon: 'code', accent: '#0ef5c2' },
  { label: 'Master Machine Learning', subtitle: 'Models, evaluation, and projects', icon: 'brain', accent: '#60A5FA' },
  { label: 'Prepare for a job', subtitle: 'Skill up toward a concrete outcome', icon: 'briefcase', accent: '#F59E0B' },
  { label: 'Learn Spanish', subtitle: 'Conversation, grammar, and confidence', icon: 'message', accent: '#34D399' },
  { label: 'Build real projects', subtitle: 'Create portfolio-ready proof', icon: 'hammer', accent: '#A855F7' },
  { label: 'UI/UX Design', subtitle: 'Hierarchy, systems, and interface craft', icon: 'design', accent: '#F472B6' },
]

const INTENT_OPTIONS = [
  { id: 'career', label: 'Career', hint: 'Get job-ready faster', icon: 'briefcase' },
  { id: 'school', label: 'School', hint: 'Stay structured and exam-ready', icon: 'graduation' },
  { id: 'curiosity', label: 'Curiosity', hint: 'Learn because it matters to you', icon: 'sparkles' },
]

const PACE_OPTIONS = [
  { id: 'fast', label: 'Fast', hint: 'Move quickly with tight pacing', icon: 'rocket' },
  { id: 'balanced', label: 'Balanced', hint: 'Steady progress with breathing room', icon: 'gauge' },
  { id: 'deep', label: 'Deep', hint: 'Go slower and build durable understanding', icon: 'library' },
]

const SUPPORT_OPTIONS = [
  { id: 'guided', label: 'Guided', hint: 'More support and clearer scaffolding', icon: 'shield_check' },
  { id: 'moderate', label: 'Moderate', hint: 'A healthy balance of help and challenge', icon: 'compass' },
  { id: 'challenge', label: 'Challenge me', hint: 'Push faster and rely less on hints', icon: 'challenge' },
]

const PATH_STYLE_OPTIONS = [
  { id: 'goal', label: 'Structured path', hint: 'Clear finish line and milestones', icon: 'goal' },
  { id: 'explore', label: 'Open exploration', hint: 'Flexible path without a fixed deadline', icon: 'orbit' },
]

const LEVEL_OPTIONS = [
  { id: 'beginner', label: 'Beginner', hint: 'Start from foundations', icon: 'sprout' },
  { id: 'intermediate', label: 'Intermediate', hint: 'Skip the very basics', icon: 'layers' },
  { id: 'advanced', label: 'Advanced', hint: 'Move straight toward higher challenge', icon: 'rocket' },
]

const GENERATION_STEPS = [
  'Reading your goal',
  'Choosing the right starting depth',
  'Mapping the first milestones',
  'Sequencing your first mission',
  'Finalizing your path',
]

const GENERATION_BUBBLES = [
  'Locking in the best starting point.',
  'Tuning the path to your pace and challenge level.',
  'Choosing the first milestones that matter.',
  'Setting up your first meaningful step.',
  'Your launchpad is ready.',
]

function detectGoalFamily(goal = '') {
  const text = String(goal).toLowerCase()
  if (/machine learning|\bml\b|data science|neural|model|regression|classification/.test(text)) return 'machineLearning'
  if (/spanish|french|german|language|english|japanese|korean/.test(text)) return 'language'
  if (/design|ui|ux|figma|brand|visual/.test(text)) return 'design'
  if (/music|guitar|piano|sing|drum/.test(text)) return 'music'
  if (/business|product|marketing|sales|strategy/.test(text)) return 'business'
  if (/python|javascript|react|web|code|coding|programming|typescript|java|html|css/.test(text)) return 'programming'
  return 'general'
}

function getFamilyAccent(goalFamily) {
  switch (goalFamily) {
    case 'programming': return '#0ef5c2'
    case 'machineLearning': return '#60A5FA'
    case 'language': return '#34D399'
    case 'design': return '#F472B6'
    case 'music': return '#F59E0B'
    case 'business': return '#A855F7'
    default: return '#0ef5c2'
  }
}

function getDiagnosticQuestions(goalFamily) {
  switch (goalFamily) {
    case 'programming':
      return [
        {
          id: 'structure',
          prompt: 'Which option best represents a list of three items?',
          options: ['{1, 2, 3}', '[1, 2, 3]', '(1:2:3)'],
          correctIndex: 1,
        },
        {
          id: 'logic',
          prompt: 'What does a loop help you do?',
          options: ['Repeat an action', 'Store a picture', 'Rename a file'],
          correctIndex: 0,
        },
      ]
    case 'machineLearning':
      return [
        {
          id: 'task_type',
          prompt: 'Predicting house prices is usually:',
          options: ['Clustering', 'Regression', 'Classification'],
          correctIndex: 1,
        },
        {
          id: 'data_split',
          prompt: 'Why keep a test set separate?',
          options: ['To measure generalization', 'To make training faster', 'To rename columns'],
          correctIndex: 0,
        },
      ]
    case 'language':
      return [
        {
          id: 'confidence',
          prompt: 'Pick the strongest sign of progress in a new language.',
          options: ['Recalling one word', 'Handling a short real exchange', 'Memorizing the alphabet only'],
          correctIndex: 1,
        },
        {
          id: 'learning_mode',
          prompt: 'What usually builds fluency fastest?',
          options: ['Only reading rules', 'Comprehension plus response practice', 'Never making mistakes'],
          correctIndex: 1,
        },
      ]
    case 'design':
      return [
        {
          id: 'hierarchy',
          prompt: 'What makes a design easier to scan?',
          options: ['Clear hierarchy', 'Random spacing', 'Using more colors'],
          correctIndex: 0,
        },
        {
          id: 'purpose',
          prompt: 'A strong interface first helps the user:',
          options: ['Understand what to do next', 'See every style at once', 'Read smaller text'],
          correctIndex: 0,
        },
      ]
    case 'music':
      return [
        {
          id: 'practice',
          prompt: 'The best first move when learning a piece is usually:',
          options: ['Play full speed immediately', 'Break it into manageable parts', 'Avoid repetition'],
          correctIndex: 1,
        },
        {
          id: 'improvement',
          prompt: 'Steady progress in music mostly comes from:',
          options: ['Short focused reps', 'Luck', 'Only watching others play'],
          correctIndex: 0,
        },
      ]
    case 'business':
      return [
        {
          id: 'decision',
          prompt: 'A good recommendation should be based on:',
          options: ['Clear reasoning and evidence', 'Confidence alone', 'The loudest opinion'],
          correctIndex: 0,
        },
        {
          id: 'clarity',
          prompt: 'What makes a business plan persuasive?',
          options: ['Structure and logic', 'More jargon', 'Ignoring tradeoffs'],
          correctIndex: 0,
        },
      ]
    default:
      return [
        {
          id: 'learning',
          prompt: 'Which path usually leads to mastery?',
          options: ['Practice with feedback', 'Reading once and stopping', 'Waiting until motivated'],
          correctIndex: 0,
        },
        {
          id: 'momentum',
          prompt: 'Small daily progress is powerful because it:',
          options: ['Builds consistency', 'Eliminates challenge', 'Removes the need to review'],
          correctIndex: 0,
        },
      ]
  }
}

function getFirstAction(goalFamily, goal, recommendedLevel) {
  const safeGoal = goal || 'your skill'
  switch (goalFamily) {
    case 'programming':
      return {
        title: 'Quick code instinct check',
        subtitle: `A tiny ${safeGoal} decision to warm up your brain.`,
        prompt: 'You want to repeat a message five times. Which approach best fits that job?',
        options: ['A loop', 'A color palette', 'A database table'],
        correctIndex: 0,
        success: 'Nice. You recognized the pattern behind repeated logic.',
        followUp: 'Your path can start with practical foundations instead of generic filler.',
      }
    case 'machineLearning':
      return {
        title: 'Modeling instinct check',
        subtitle: `A quick ${safeGoal} judgment call.`,
        prompt: 'You need to predict whether a customer will cancel. Which type of task is that?',
        options: ['Classification', 'Clustering', 'Dimensionality reduction'],
        correctIndex: 0,
        success: 'Strong start. You identified the core shape of the problem.',
        followUp: 'That is enough for us to aim your first module correctly.',
      }
    case 'language':
      return {
        title: 'Response instinct check',
        subtitle: `A fast conversational warm-up for ${safeGoal}.`,
        prompt: 'Someone greets you politely. What is the best next step for learning?',
        options: ['Practice a natural response', 'Memorize every tense first', 'Avoid speaking until perfect'],
        correctIndex: 0,
        success: 'Good. You are optimizing for real response, not passive study.',
        followUp: 'We can lean into usable language earlier in your path.',
      }
    case 'design':
      return {
        title: 'Design judgment check',
        subtitle: `A tiny taste of ${safeGoal}.`,
        prompt: 'What makes a screen easier to understand quickly?',
        options: ['Clear hierarchy', 'Equal emphasis on everything', 'More decorative elements'],
        correctIndex: 0,
        success: 'Exactly. You spotted the principle behind stronger interfaces.',
        followUp: 'That helps us start with design decisions that actually matter.',
      }
    case 'music':
      return {
        title: 'Practice instinct check',
        subtitle: `A fast decision for ${safeGoal}.`,
        prompt: 'What usually improves performance fastest?',
        options: ['Focused repetition on weak spots', 'Always starting from the top', 'Only practicing when inspired'],
        correctIndex: 0,
        success: 'Perfect. You are thinking like someone who will actually improve.',
        followUp: 'We can build a path around deliberate practice, not vague repetition.',
      }
    case 'business':
      return {
        title: 'Decision quality check',
        subtitle: `A quick call tied to ${safeGoal}.`,
        prompt: 'What makes a recommendation stronger?',
        options: ['Reasoning plus evidence', 'Confidence alone', 'Making it sound complex'],
        correctIndex: 0,
        success: 'Good call. Clear logic beats noise.',
        followUp: 'That gives us the right starting frame for applied business work.',
      }
    default:
      return {
        title: 'Learning instinct check',
        subtitle: `A quick calibration for ${safeGoal}.`,
        prompt: 'What tends to create real progress fastest?',
        options: ['Small consistent wins', 'Waiting for big motivation', 'Skipping feedback'],
        correctIndex: 0,
        success: 'Exactly. Momentum matters.',
        followUp: 'We will build the path around quick wins and meaningful challenge.',
      }
  }
}

function resolveRecommendedLevel(selfLevel, diagnosticScore) {
  if (selfLevel === 'beginner') return 'beginner'
  if (selfLevel === 'intermediate') {
    if (diagnosticScore <= 0) return 'beginner'
    return 'intermediate'
  }
  if (diagnosticScore === 2) return 'advanced'
  if (diagnosticScore === 1) return 'intermediate'
  return 'intermediate'
}

function resolveCadence({ pace, pathStyle, recommendedLevel }) {
  if (pathStyle === 'explore') {
    return {
      mode: 'explore',
      days: 0,
      weekdayMins: pace === 'deep' ? 45 : 30,
      weekendMins: pace === 'fast' ? 45 : 60,
    }
  }

  const paceMap = {
    fast: { days: 30, weekdayMins: 30, weekendMins: 45 },
    balanced: { days: 45, weekdayMins: 30, weekendMins: 60 },
    deep: { days: 60, weekdayMins: 45, weekendMins: 75 },
  }

  const base = paceMap[pace] || paceMap.balanced
  const levelAdjustment = recommendedLevel === 'advanced'
    ? { days: Math.max(21, base.days - 7), weekdayMins: base.weekdayMins, weekendMins: Math.max(45, base.weekendMins - 15) }
    : recommendedLevel === 'beginner'
      ? { days: base.days + 7, weekdayMins: base.weekdayMins, weekendMins: base.weekendMins }
      : base

  return {
    mode: 'goal',
    days: levelAdjustment.days,
    weekdayMins: levelAdjustment.weekdayMins,
    weekendMins: levelAdjustment.weekendMins,
  }
}

function buildPathPreview({ goal, goalFamily, pace, intent, recommendedLevel, pathStyle }) {
  const routeMap = {
    programming: ['Foundations', 'Control flow', 'Applied builds', 'Project milestone', 'Final assessment'],
    machineLearning: ['Intro to ML', 'Python and data', 'Models and evaluation', 'Project milestone', 'Final assessment'],
    language: ['Core phrases', 'Grammar patterns', 'Live response', 'Conversation milestone', 'Final assessment'],
    design: ['Design foundations', 'Hierarchy and layout', 'Applied screens', 'Portfolio milestone', 'Final assessment'],
    music: ['Technique basics', 'Structured drills', 'Song application', 'Performance milestone', 'Final assessment'],
    business: ['Core frameworks', 'Analysis and decisions', 'Applied strategy', 'Case milestone', 'Final assessment'],
    general: ['Foundations', 'Guided practice', 'Applied work', 'Milestone proof', 'Final assessment'],
  }

  const milestones = routeMap[goalFamily] || routeMap.general
  const startIndex = recommendedLevel === 'advanced' ? 2 : recommendedLevel === 'intermediate' ? 1 : 0
  const visibleMilestones = milestones.slice(Math.max(0, startIndex - 1), Math.min(milestones.length, startIndex + 3))
  const cadence = resolveCadence({ pace, pathStyle, recommendedLevel })
  const finishLine = pathStyle === 'explore'
    ? 'Adaptive open-ended path with milestone projects'
    : `${cadence.days} day finish line with a real final assessment`

  return {
    header: `Here’s your path to ${goal || 'mastery'}`,
    subcopy: intent === 'career'
      ? 'This route leans toward practical proof and portfolio wins.'
      : intent === 'school'
        ? 'This route stays structured so progress feels predictable.'
        : 'This route is tuned to keep curiosity high without losing direction.',
    milestones: visibleMilestones,
    startIndex,
    firstModule: milestones[Math.min(startIndex, milestones.length - 1)],
    nextAction: recommendedLevel === 'advanced'
      ? `Start with ${milestones[Math.min(startIndex, milestones.length - 1)]}`
      : `Build momentum through ${milestones[Math.min(startIndex, milestones.length - 1)]}`,
    finishLine,
  }
}

function buildKnowledgeSummary({
  recommendedLevel,
  diagnosticScore,
  intent,
  pace,
  support,
  pathStyle,
  firstActionCorrect,
}) {
  return [
    `Starting level: ${recommendedLevel}`,
    `Diagnostic score: ${diagnosticScore}/2`,
    `Learning intent: ${intent}`,
    `Preferred pace: ${pace}`,
    `Support preference: ${support}`,
    `Path style: ${pathStyle === 'explore' ? 'exploration' : 'structured goal path'}`,
    `Onboarding action result: ${firstActionCorrect ? 'completed successfully' : 'not completed'}`,
  ].join('. ')
}

function MascotBubble({ text }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12 }}>
      <div style={{
        width: 54,
        height: 54,
        borderRadius: '32%',
        background: 'linear-gradient(135deg, rgba(14,245,194,0.20), rgba(0,212,255,0.14))',
        border: '1px solid rgba(14,245,194,0.28)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#0ef5c2',
        boxShadow: '0 0 28px rgba(14,245,194,0.16)',
        flexShrink: 0,
      }}>
        <IconGlyph name="bot" size={26} strokeWidth={2.3} />
      </div>
      <div style={{
        position: 'relative',
        padding: '12px 14px',
        borderRadius: 18,
        background: 'rgba(255,255,255,0.08)',
        border: '1px solid rgba(255,255,255,0.12)',
        color: '#f5f5f7',
        fontSize: 13,
        lineHeight: 1.55,
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.14)',
      }}>
        {text}
        <div style={{
          position: 'absolute',
          left: -8,
          bottom: 14,
          width: 14,
          height: 14,
          transform: 'rotate(45deg)',
          background: 'rgba(255,255,255,0.08)',
          borderLeft: '1px solid rgba(255,255,255,0.12)',
          borderBottom: '1px solid rgba(255,255,255,0.12)',
        }} />
      </div>
    </div>
  )
}

function GroupOptionRow({ label, options, value, onChange }) {
  return (
    <div>
      <div style={{
        color: '#8e8e93',
        fontSize: 11,
        fontWeight: 800,
        letterSpacing: '1.1px',
        textTransform: 'uppercase',
        marginBottom: 9,
      }}>
        {label}
      </div>
      <div style={{ display: 'grid', gap: 8 }}>
        {options.map((option) => {
          const active = value === option.id
          return (
            <button
              key={option.id}
              onClick={() => onChange(option.id)}
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: 16,
                border: `1px solid ${active ? 'rgba(14,245,194,0.28)' : 'rgba(255,255,255,0.08)'}`,
                background: active
                  ? 'linear-gradient(135deg, rgba(14,245,194,0.12), rgba(0,212,255,0.08))'
                  : 'rgba(0,0,0,0.22)',
                color: active ? '#f5fffd' : '#d6d6da',
                cursor: 'pointer',
                fontFamily: "'DM Sans', sans-serif",
                textAlign: 'left',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <div style={{
                  width: 32,
                  height: 32,
                  borderRadius: 12,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: active ? 'rgba(14,245,194,0.16)' : 'rgba(255,255,255,0.05)',
                  color: active ? '#0ef5c2' : '#8e8e93',
                  flexShrink: 0,
                }}>
                  <IconGlyph name={option.icon} size={16} strokeWidth={2.3} color={active ? '#0ef5c2' : '#8e8e93'} />
                </div>
                <span style={{ fontSize: 14, fontWeight: 800 }}>{option.label}</span>
              </div>
              <div style={{ fontSize: 12.5, color: active ? '#bdece1' : '#8e8e93', lineHeight: 1.5 }}>{option.hint}</div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function Onboarding() {
  const router = useRouter()
  const reduceMotion = useReducedMotion()

  const [step, setStep] = useState(1)
  const [direction, setDirection] = useState(1)
  const [goal, setGoal] = useState('')
  const [intent, setIntent] = useState('career')
  const [pace, setPace] = useState('balanced')
  const [support, setSupport] = useState('moderate')
  const [pathStyle, setPathStyle] = useState('goal')
  const [skillLevel, setSkillLevel] = useState('beginner')
  const [diagnosticAnswers, setDiagnosticAnswers] = useState({})
  const [firstActionChoice, setFirstActionChoice] = useState(null)
  const [firstActionState, setFirstActionState] = useState('idle')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [genStep, setGenStep] = useState(0)
  const [focused, setFocused] = useState(null)
  const [user, setUser] = useState(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: authUser } }) => {
      if (!authUser) router.push('/login')
      else setUser(authUser)
    })
  }, [router])

  const goalFamily = useMemo(() => detectGoalFamily(goal), [goal])
  const diagnostics = useMemo(() => getDiagnosticQuestions(goalFamily), [goalFamily])
  const diagnosticScore = useMemo(() => diagnostics.reduce((sum, question) => {
    return sum + (diagnosticAnswers[question.id] === question.correctIndex ? 1 : 0)
  }, 0), [diagnosticAnswers, diagnostics])
  const recommendedLevel = useMemo(
    () => resolveRecommendedLevel(skillLevel, diagnosticScore),
    [skillLevel, diagnosticScore],
  )
  const preview = useMemo(
    () => buildPathPreview({ goal, goalFamily, pace, intent, recommendedLevel, pathStyle }),
    [goal, goalFamily, pace, intent, recommendedLevel, pathStyle],
  )
  const firstAction = useMemo(
    () => getFirstAction(goalFamily, goal, recommendedLevel),
    [goalFamily, goal, recommendedLevel],
  )
  const cadence = useMemo(
    () => resolveCadence({ pace, pathStyle, recommendedLevel }),
    [pace, pathStyle, recommendedLevel],
  )
  const familyAccent = useMemo(() => getFamilyAccent(goalFamily), [goalFamily])
  const progressPct = ((step - 1) / (STEP_TITLES.length - 1)) * 100

  const inputStyle = useCallback((name) => ({
    width: '100%',
    padding: '15px 16px',
    background: focused === name ? 'rgba(14,245,194,0.06)' : 'rgba(0,0,0,0.24)',
    border: `1px solid ${focused === name ? 'rgba(14,245,194,0.38)' : 'rgba(255,255,255,0.10)'}`,
    borderRadius: 16,
    color: '#f5f5f7',
    fontSize: 15,
    fontFamily: "'DM Sans', sans-serif",
    transition: 'all 0.2s ease',
    boxShadow: focused === name
      ? 'inset 0 1px 0 rgba(14,245,194,0.15), 0 0 0 3px rgba(14,245,194,0.08)'
      : 'inset 0 1px 0 rgba(255,255,255,0.06)',
  }), [focused])

  const goToStep = useCallback((nextStep, dir = 1) => {
    setDirection(dir)
    setStep(nextStep)
    setError('')
  }, [])

  const handleGenerate = useCallback(async () => {
    if (!user || !goal.trim()) return

    const knowledge = buildKnowledgeSummary({
      recommendedLevel,
      diagnosticScore,
      intent,
      pace,
      support,
      pathStyle,
      firstActionCorrect: firstActionState === 'correct',
    })

    const constraintSummary = [
      `Intent: ${intent}`,
      `Preferred pace: ${pace}`,
      `Support preference: ${support}`,
      `Starting level: ${recommendedLevel}`,
      `Diagnostic score: ${diagnosticScore}/2`,
      `Path style: ${pathStyle === 'explore' ? 'open exploration' : 'structured goal path'}`,
      `First action: ${firstActionState === 'correct' ? 'completed' : 'not completed'}`,
    ]

    setLoading(true)
    setError('')
    setGenStep(0)

    const interval = setInterval(() => {
      setGenStep((value) => Math.min(value + 1, GENERATION_STEPS.length - 1))
    }, 1100)

    try {
      const deadline = new Date()
      if (cadence.mode === 'goal') deadline.setDate(deadline.getDate() + cadence.days)

      const { data: goalData, error: goalError } = await supabase
        .from('goals')
        .insert({
          user_id: user.id,
          goal_text: goal.trim(),
          mode: cadence.mode,
          deadline: cadence.mode === 'goal' ? deadline.toISOString().split('T')[0] : null,
          weekday_mins: cadence.weekdayMins,
          weekend_mins: cadence.weekendMins,
          constraints: constraintSummary,
          status: 'active',
          total_days: cadence.mode === 'goal' ? cadence.days : 0,
        })
        .select()
        .single()

      if (goalError) throw goalError

      const { data: { session } } = await supabase.auth.getSession()
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
          goal: goal.trim(),
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
        throw new Error(errData.error || 'Failed to generate plan')
      }

      clearInterval(interval)
      router.push('/dashboard')
    } catch (err) {
      clearInterval(interval)
      setError(err.message || 'Failed to generate plan')
      setLoading(false)
      setGenStep(0)
    }
  }, [
    cadence.days,
    cadence.mode,
    cadence.weekdayMins,
    cadence.weekendMins,
    diagnosticScore,
    firstActionState,
    goal,
    intent,
    pace,
    pathStyle,
    recommendedLevel,
    router,
    support,
    user,
  ])

  const stepCardVariants = useMemo(() => ({
    enter: (dir) => reduceMotion ? { opacity: 0 } : { opacity: 0, x: dir > 0 ? 34 : -34 },
    center: { opacity: 1, x: 0 },
    exit: (dir) => reduceMotion ? { opacity: 0 } : { opacity: 0, x: dir > 0 ? -28 : 28 },
  }), [reduceMotion])

  if (!user) return null

  return (
    <>
      <style jsx global>{`
        @keyframes pulseOrb { 0%, 100% { opacity: .20; transform: scale(1); } 50% { opacity: .34; transform: scale(1.06); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        input:focus, textarea:focus { outline: none; }
        ::placeholder { color: #636366; }
      `}</style>

      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: "'Plus Jakarta Sans','DM Sans',system-ui,sans-serif",
      }}>
        <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none' }}>
          <div style={{ position: 'absolute', top: '-14%', left: '-10%', width: 560, height: 560, borderRadius: '50%', background: 'radial-gradient(circle, rgba(120,60,255,0.28) 0%, transparent 66%)', filter: 'blur(88px)', animation: 'pulseOrb 9s ease-in-out infinite' }} />
          <div style={{ position: 'absolute', top: '50%', right: '-10%', width: 480, height: 480, borderRadius: '50%', background: 'radial-gradient(circle, rgba(40,100,255,0.24) 0%, transparent 68%)', filter: 'blur(82px)', animation: 'pulseOrb 10s ease-in-out infinite 1.6s' }} />
          <div style={{ position: 'absolute', bottom: '-10%', left: '34%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(14,245,194,0.18) 0%, transparent 65%)', filter: 'blur(86px)', animation: 'pulseOrb 8s ease-in-out infinite 0.8s' }} />
        </div>

        <div style={{ width: '100%', maxWidth: 560, position: 'relative', zIndex: 1 }}>
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div style={{
                width: 44,
                height: 44,
                borderRadius: '28%',
                background: 'linear-gradient(135deg, #0ef5c2, #00d4ff)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 32px rgba(14,245,194,0.28), inset 0 1px 0 rgba(255,255,255,0.48)',
              }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#06060f" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                </svg>
              </div>
              <span style={{ fontSize: 30, fontWeight: 900, color: '#f5f5f7', letterSpacing: '-0.9px' }}>PathAI</span>
            </div>
            <p style={{ color: '#8e8e93', fontSize: 14.5 }}>
              {loading ? 'Building your first real path.' : 'Set your direction, do one small win, and launch.'}
            </p>
          </div>

          {loading ? (
            <div style={{
              background: 'linear-gradient(145deg, rgba(255,255,255,0.14), rgba(255,255,255,0.05) 42%, rgba(110,170,255,0.06))',
              border: '1px solid rgba(255,255,255,0.18)',
              borderRadius: 30,
              padding: '28px 26px 30px',
              backdropFilter: 'blur(40px) saturate(220%)',
              WebkitBackdropFilter: 'blur(40px) saturate(220%)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.24), 0 32px 64px rgba(0,0,0,0.40)',
            }}>
              <MascotBubble text={GENERATION_BUBBLES[Math.min(genStep, GENERATION_BUBBLES.length - 1)]} />

              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 26, marginBottom: 30 }}>
                <div style={{ width: 48, height: 48, border: '3px solid rgba(255,255,255,0.08)', borderTopColor: '#0ef5c2', borderRadius: '50%', animation: 'spin 0.65s linear infinite', boxShadow: '0 0 20px rgba(14,245,194,0.10)' }} />
                <div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: '#f5f5f7' }}>Building your personalized launchpad</div>
                  <div style={{ fontSize: 12, color: '#8e8e93', marginTop: 4 }}>Finalizing your first path and getting the first mission ready.</div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {GENERATION_STEPS.map((label, index) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 12, opacity: index <= genStep ? 1 : 0.26, transition: 'opacity 0.35s ease' }}>
                    <div style={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      background: index < genStep ? 'linear-gradient(135deg,#0ef5c2,#00d4ff)' : 'transparent',
                      border: `2px solid ${index <= genStep ? '#0ef5c2' : 'rgba(255,255,255,0.10)'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#06060f',
                      fontSize: 12,
                      fontWeight: 900,
                    }}>
                      {index < genStep ? '✓' : index + 1}
                    </div>
                    <span style={{ color: index <= genStep ? '#f5f5f7' : '#636366', fontSize: 13.5, fontWeight: 600 }}>{label}</span>
                  </div>
                ))}
              </div>

              {error && (
                <div style={{ marginTop: 20, padding: '12px 14px', background: 'rgba(255,69,58,0.10)', border: '1px solid rgba(255,69,58,0.20)', borderRadius: 16, color: '#ff6961', fontSize: 13 }}>
                  {error}
                </div>
              )}
            </div>
          ) : (
            <div style={{
              background: 'linear-gradient(145deg, rgba(255,255,255,0.14), rgba(255,255,255,0.05) 42%, rgba(110,170,255,0.06))',
              border: '1px solid rgba(255,255,255,0.18)',
              borderRadius: 30,
              padding: '26px 22px 24px',
              backdropFilter: 'blur(40px) saturate(220%)',
              WebkitBackdropFilter: 'blur(40px) saturate(220%)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.24), 0 32px 64px rgba(0,0,0,0.40)',
            }}>
              <div style={{
                height: 8,
                borderRadius: 999,
                background: 'rgba(255,255,255,0.08)',
                overflow: 'hidden',
                marginBottom: 16,
              }}>
                <motion.div
                  initial={false}
                  animate={{ width: `${progressPct}%` }}
                  transition={{ duration: reduceMotion ? 0 : 0.35, ease: [0.22, 1, 0.36, 1] }}
                  style={{
                    height: '100%',
                    borderRadius: 999,
                    background: 'linear-gradient(90deg, #0ef5c2, #00d4ff)',
                    boxShadow: '0 0 14px rgba(14,245,194,0.35)',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 22 }}>
                {STEP_TITLES.map((label, index) => {
                  const stepNumber = index + 1
                  const completed = step > stepNumber
                  const active = step === stepNumber
                  return (
                    <div key={label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                      <div style={{
                        width: 30,
                        height: 30,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: completed
                          ? 'linear-gradient(135deg,#0ef5c2,#00d4ff)'
                          : active
                            ? 'rgba(14,245,194,0.14)'
                            : 'rgba(255,255,255,0.06)',
                        border: `1px solid ${completed || active ? 'rgba(14,245,194,0.35)' : 'rgba(255,255,255,0.10)'}`,
                        color: completed ? '#06060f' : active ? '#0ef5c2' : '#636366',
                        fontSize: 12,
                        fontWeight: 900,
                        boxShadow: active ? '0 0 18px rgba(14,245,194,0.14)' : 'none',
                      }}>
                        {completed ? '✓' : stepNumber}
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: active ? '#f5f5f7' : '#8e8e93' }}>{label}</span>
                    </div>
                  )
                })}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '1.2px', textTransform: 'uppercase', color: '#8e8e93' }}>
                    Step {step} of {STEP_TITLES.length}
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: '#f5f5f7', letterSpacing: '-0.6px', marginTop: 4 }}>
                    {STEP_TITLES[step - 1]}
                  </div>
                </div>
              </div>

              {error && (
                <div style={{ padding: '12px 14px', background: 'rgba(255,69,58,0.10)', border: '1px solid rgba(255,69,58,0.20)', borderRadius: 16, color: '#ff6961', fontSize: 13, marginBottom: 18 }}>
                  {error}
                </div>
              )}

              <div style={{ overflow: 'hidden', minHeight: 410 }}>
                <AnimatePresence mode="wait" custom={direction}>
                  <motion.div
                    key={step}
                    custom={direction}
                    variants={stepCardVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: reduceMotion ? 0 : 0.28, ease: [0.22, 1, 0.36, 1] }}
                  >
                    {step === 1 && (
                      <div>
                        <div style={{ marginBottom: 18 }}>
                          <MascotBubble text="What do you want to achieve? Pick a direction and we will make the path feel doable fast." />
                        </div>

                        <div style={{ display: 'grid', gap: 10, marginBottom: 14 }}>
                          {GOAL_OPTIONS.map((option) => {
                            const active = goal === option.label
                            return (
                              <button
                                key={option.label}
                                onClick={() => setGoal(option.label)}
                                style={{
                                  width: '100%',
                                  padding: '14px 16px',
                                  borderRadius: 18,
                                  border: `1px solid ${active ? `${option.accent}55` : 'rgba(255,255,255,0.08)'}`,
                                  background: active
                                    ? `linear-gradient(135deg, ${option.accent}16, rgba(255,255,255,0.04))`
                                    : 'rgba(0,0,0,0.22)',
                                  textAlign: 'left',
                                  cursor: 'pointer',
                                  fontFamily: "'DM Sans', sans-serif",
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                  <div style={{
                                    width: 42,
                                    height: 42,
                                    borderRadius: 14,
                                    display: 'grid',
                                    placeItems: 'center',
                                    background: active ? `${option.accent}20` : 'rgba(255,255,255,0.05)',
                                    color: active ? option.accent : '#8e8e93',
                                    flexShrink: 0,
                                  }}>
                                    <IconGlyph name={option.icon} size={18} strokeWidth={2.3} color={active ? option.accent : '#8e8e93'} />
                                  </div>
                                  <div style={{ minWidth: 0 }}>
                                    <div style={{ color: '#f5f5f7', fontSize: 15, fontWeight: 800, marginBottom: 4 }}>{option.label}</div>
                                    <div style={{ color: '#8e8e93', fontSize: 12.5, lineHeight: 1.5 }}>{option.subtitle}</div>
                                  </div>
                                </div>
                              </button>
                            )
                          })}
                        </div>

                        <input
                          value={goal}
                          onChange={(e) => setGoal(e.target.value)}
                          onFocus={() => setFocused('goal')}
                          onBlur={() => setFocused(null)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && goal.trim()) {
                              goToStep(2, 1)
                            }
                          }}
                          placeholder="Or type a custom goal"
                          style={inputStyle('goal')}
                        />

                        <button
                          onClick={() => {
                            if (!goal.trim()) return
                            goToStep(2, 1)
                          }}
                          disabled={!goal.trim()}
                          style={{
                            width: '100%',
                            marginTop: 22,
                            padding: '15px',
                            background: goal.trim() ? 'linear-gradient(135deg,#0ef5c2,#00d4ff)' : 'rgba(255,255,255,0.06)',
                            border: goal.trim() ? 'none' : '1px solid rgba(255,255,255,0.08)',
                            borderRadius: 16,
                            color: goal.trim() ? '#06060f' : '#3a3a3c',
                            fontSize: 15.5,
                            fontWeight: 800,
                            cursor: goal.trim() ? 'pointer' : 'default',
                            fontFamily: "'DM Sans', sans-serif",
                            boxShadow: goal.trim() ? '0 0 36px rgba(14,245,194,0.24), inset 0 1px 0 rgba(255,255,255,0.44)' : 'none',
                          }}
                        >
                          Build my launchpad
                        </button>
                      </div>
                    )}

                    {step === 2 && (
                      <div>
                        <div style={{ marginBottom: 18 }}>
                          <MascotBubble text="Give me the shape of the experience: why you care, how fast to move, and how hard to push." />
                        </div>

                        <div style={{ display: 'grid', gap: 16 }}>
                          <GroupOptionRow label="Why are you learning?" options={INTENT_OPTIONS} value={intent} onChange={setIntent} />
                          <GroupOptionRow label="Preferred pace" options={PACE_OPTIONS} value={pace} onChange={setPace} />
                          <GroupOptionRow label="Support level" options={SUPPORT_OPTIONS} value={support} onChange={setSupport} />
                          <GroupOptionRow label="Path shape" options={PATH_STYLE_OPTIONS} value={pathStyle} onChange={setPathStyle} />
                        </div>

                        <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
                          <button
                            onClick={() => goToStep(1, -1)}
                            style={{
                              flex: 1,
                              padding: '14px',
                              background: 'rgba(255,255,255,0.04)',
                              border: '1px solid rgba(255,255,255,0.08)',
                              borderRadius: 16,
                              color: '#8e8e93',
                              fontSize: 14,
                              fontWeight: 700,
                              cursor: 'pointer',
                              fontFamily: "'DM Sans', sans-serif",
                            }}
                          >
                            Back
                          </button>
                          <button
                            onClick={() => {
                              goToStep(3, 1)
                            }}
                            style={{
                              flex: 1.35,
                              padding: '14px',
                              background: 'linear-gradient(135deg,#0ef5c2,#00d4ff)',
                              border: 'none',
                              borderRadius: 16,
                              color: '#06060f',
                              fontSize: 14.5,
                              fontWeight: 800,
                              cursor: 'pointer',
                              fontFamily: "'DM Sans', sans-serif",
                            }}
                          >
                            Continue
                          </button>
                        </div>
                      </div>
                    )}

                    {step === 3 && (
                      <div>
                        <div style={{ marginBottom: 18 }}>
                          <MascotBubble text="One self-rating and two quick checks so your path does not start too easy or too hard." />
                        </div>

                        <div style={{ marginBottom: 18 }}>
                          <div style={{ color: '#8e8e93', fontSize: 11, fontWeight: 800, letterSpacing: '1.1px', textTransform: 'uppercase', marginBottom: 9 }}>
                            Where should we start?
                          </div>
                          <div style={{ display: 'grid', gap: 8 }}>
                            {LEVEL_OPTIONS.map((option) => {
                              const active = skillLevel === option.id
                              return (
                                <button
                                  key={option.id}
                                  onClick={() => setSkillLevel(option.id)}
                                  style={{
                                    width: '100%',
                                    padding: '12px 14px',
                                    borderRadius: 16,
                                    border: `1px solid ${active ? 'rgba(14,245,194,0.28)' : 'rgba(255,255,255,0.08)'}`,
                                    background: active ? 'linear-gradient(135deg, rgba(14,245,194,0.12), rgba(0,212,255,0.08))' : 'rgba(0,0,0,0.22)',
                                    color: active ? '#f5fffd' : '#d6d6da',
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                    fontFamily: "'DM Sans', sans-serif",
                                  }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                                    <IconGlyph name={option.icon} size={16} strokeWidth={2.3} color={active ? '#0ef5c2' : '#8e8e93'} />
                                    <span style={{ fontSize: 14, fontWeight: 800 }}>{option.label}</span>
                                  </div>
                                  <div style={{ fontSize: 12.5, color: active ? '#bdece1' : '#8e8e93', lineHeight: 1.5 }}>{option.hint}</div>
                                </button>
                              )
                            })}
                          </div>
                        </div>

                        <div style={{ display: 'grid', gap: 12 }}>
                          {diagnostics.map((question, index) => (
                            <div key={question.id} style={{
                              padding: '14px 14px 12px',
                              borderRadius: 18,
                              background: 'rgba(0,0,0,0.20)',
                              border: '1px solid rgba(255,255,255,0.08)',
                            }}>
                              <div style={{ fontSize: 11, fontWeight: 800, color: '#8e8e93', marginBottom: 8 }}>
                                Quick check {index + 1}
                              </div>
                              <div style={{ fontSize: 15, fontWeight: 800, color: '#f5f5f7', lineHeight: 1.45, marginBottom: 10 }}>
                                {question.prompt}
                              </div>
                              <div style={{ display: 'grid', gap: 8 }}>
                                {question.options.map((option, optionIndex) => {
                                  const active = diagnosticAnswers[question.id] === optionIndex
                                  return (
                                    <button
                                      key={option}
                                      onClick={() => setDiagnosticAnswers((prev) => ({ ...prev, [question.id]: optionIndex }))}
                                      style={{
                                        width: '100%',
                                        padding: '11px 12px',
                                        borderRadius: 14,
                                        border: `1px solid ${active ? 'rgba(14,245,194,0.26)' : 'rgba(255,255,255,0.08)'}`,
                                        background: active ? 'rgba(14,245,194,0.10)' : 'rgba(255,255,255,0.03)',
                                        color: active ? '#eafffb' : '#cfd0d6',
                                        cursor: 'pointer',
                                        textAlign: 'left',
                                        fontSize: 13,
                                        fontWeight: 700,
                                        fontFamily: "'DM Sans', sans-serif",
                                      }}
                                    >
                                      {option}
                                    </button>
                                  )
                                })}
                              </div>
                            </div>
                          ))}
                        </div>

                        <div style={{
                          marginTop: 16,
                          padding: '12px 14px',
                          borderRadius: 16,
                          background: 'rgba(255,255,255,0.05)',
                          border: '1px solid rgba(255,255,255,0.08)',
                        }}>
                          <div style={{ fontSize: 11, fontWeight: 800, color: '#8e8e93', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 6 }}>
                            Recommended start
                          </div>
                          <div style={{ fontSize: 15, fontWeight: 800, color: '#f5f5f7', marginBottom: 4 }}>
                            {recommendedLevel.charAt(0).toUpperCase() + recommendedLevel.slice(1)}
                          </div>
                          <div style={{ fontSize: 12.5, color: '#8e8e93', lineHeight: 1.55 }}>
                            We use your self-rating plus these quick signals so your first days feel appropriately challenging.
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
                          <button
                            onClick={() => goToStep(2, -1)}
                            style={{
                              flex: 1,
                              padding: '14px',
                              background: 'rgba(255,255,255,0.04)',
                              border: '1px solid rgba(255,255,255,0.08)',
                              borderRadius: 16,
                              color: '#8e8e93',
                              fontSize: 14,
                              fontWeight: 700,
                              cursor: 'pointer',
                              fontFamily: "'DM Sans', sans-serif",
                            }}
                          >
                            Back
                          </button>
                          <button
                            onClick={() => {
                              if (diagnostics.some((question) => diagnosticAnswers[question.id] === undefined)) return
                              goToStep(4, 1)
                            }}
                            disabled={diagnostics.some((question) => diagnosticAnswers[question.id] === undefined)}
                            style={{
                              flex: 1.35,
                              padding: '14px',
                              background: diagnostics.some((question) => diagnosticAnswers[question.id] === undefined)
                                ? 'rgba(255,255,255,0.06)'
                                : 'linear-gradient(135deg,#0ef5c2,#00d4ff)',
                              border: diagnostics.some((question) => diagnosticAnswers[question.id] === undefined)
                                ? '1px solid rgba(255,255,255,0.08)'
                                : 'none',
                              borderRadius: 16,
                              color: diagnostics.some((question) => diagnosticAnswers[question.id] === undefined) ? '#3a3a3c' : '#06060f',
                              fontSize: 14.5,
                              fontWeight: 800,
                              cursor: diagnostics.some((question) => diagnosticAnswers[question.id] === undefined) ? 'default' : 'pointer',
                              fontFamily: "'DM Sans', sans-serif",
                            }}
                          >
                            Preview my path
                          </button>
                        </div>
                      </div>
                    )}

                    {step === 4 && (
                      <div>
                        <div style={{ marginBottom: 18 }}>
                          <MascotBubble text="This is the simplified route. You do not need the whole map right now, just the next meaningful direction." />
                        </div>

                        <div style={{
                          padding: '18px 18px 16px',
                          borderRadius: 22,
                          background: 'linear-gradient(155deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))',
                          border: '1px solid rgba(255,255,255,0.10)',
                          marginBottom: 16,
                        }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14, marginBottom: 12 }}>
                            <div>
                              <div style={{ fontSize: 11, fontWeight: 800, color: '#8e8e93', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 6 }}>
                                Path preview
                              </div>
                              <div style={{ fontSize: 22, fontWeight: 900, color: '#f5f5f7', letterSpacing: '-0.6px', lineHeight: 1.15 }}>
                                {preview.header}
                              </div>
                            </div>
                            <div style={{
                              padding: '8px 10px',
                              borderRadius: 14,
                              background: `${familyAccent}16`,
                              border: `1px solid ${familyAccent}28`,
                              color: familyAccent,
                              fontSize: 11,
                              fontWeight: 800,
                              whiteSpace: 'nowrap',
                            }}>
                              {recommendedLevel}
                            </div>
                          </div>

                          <div style={{ fontSize: 13.5, color: '#b7b7be', lineHeight: 1.6, marginBottom: 14 }}>
                            {preview.subcopy}
                          </div>

                          <div style={{ display: 'grid', gap: 10 }}>
                            {preview.milestones.map((milestone, index) => {
                              const isCurrent = index === Math.max(0, Math.min(preview.startIndex, preview.milestones.length - 1))
                              const isPast = index < Math.max(0, Math.min(preview.startIndex, preview.milestones.length - 1))
                              return (
                                <div
                                  key={`${milestone}-${index}`}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 12,
                                    padding: '12px 12px',
                                    borderRadius: 16,
                                    background: isCurrent ? `${familyAccent}12` : 'rgba(255,255,255,0.03)',
                                    border: `1px solid ${isCurrent ? `${familyAccent}2d` : 'rgba(255,255,255,0.08)'}`,
                                  }}
                                >
                                  <div style={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: 999,
                                    display: 'grid',
                                    placeItems: 'center',
                                    background: isCurrent ? familyAccent : isPast ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.06)',
                                    color: isCurrent ? '#06060f' : isPast ? '#f5f5f7' : '#8e8e93',
                                    fontSize: 12,
                                    fontWeight: 900,
                                    flexShrink: 0,
                                  }}>
                                    {isPast ? '✓' : index + 1}
                                  </div>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: 14.5, fontWeight: 800, color: '#f5f5f7', marginBottom: 3 }}>{milestone}</div>
                                    <div style={{ fontSize: 12, color: isCurrent ? '#d9fff7' : '#8e8e93' }}>
                                      {isCurrent ? 'You start here' : isPast ? 'Already implied by your level' : 'Comes next in the route'}
                                    </div>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 10, marginBottom: 18 }}>
                          <div style={{ padding: '14px', borderRadius: 18, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                            <div style={{ fontSize: 11, fontWeight: 800, color: '#8e8e93', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 6 }}>Finish line</div>
                            <div style={{ fontSize: 14, fontWeight: 800, color: '#f5f5f7', lineHeight: 1.4 }}>{preview.finishLine}</div>
                          </div>
                          <div style={{ padding: '14px', borderRadius: 18, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                            <div style={{ fontSize: 11, fontWeight: 800, color: '#8e8e93', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 6 }}>First focus</div>
                            <div style={{ fontSize: 14, fontWeight: 800, color: '#f5f5f7', lineHeight: 1.4 }}>{preview.firstModule}</div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: 10 }}>
                          <button
                            onClick={() => goToStep(3, -1)}
                            style={{
                              flex: 1,
                              padding: '14px',
                              background: 'rgba(255,255,255,0.04)',
                              border: '1px solid rgba(255,255,255,0.08)',
                              borderRadius: 16,
                              color: '#8e8e93',
                              fontSize: 14,
                              fontWeight: 700,
                              cursor: 'pointer',
                              fontFamily: "'DM Sans', sans-serif",
                            }}
                          >
                            Back
                          </button>
                          <button
                            onClick={() => goToStep(5, 1)}
                            style={{
                              flex: 1.35,
                              padding: '14px',
                              background: 'linear-gradient(135deg,#0ef5c2,#00d4ff)',
                              border: 'none',
                              borderRadius: 16,
                              color: '#06060f',
                              fontSize: 14.5,
                              fontWeight: 800,
                              cursor: 'pointer',
                              fontFamily: "'DM Sans', sans-serif",
                            }}
                          >
                            Start a quick win
                          </button>
                        </div>
                      </div>
                    )}

                    {step === 5 && (
                      <div>
                        <div style={{ marginBottom: 18 }}>
                          <MascotBubble text="Let’s do something real right now. This takes well under a minute and gives you a real starting signal." />
                        </div>

                        <div style={{
                          padding: '18px 18px 16px',
                          borderRadius: 22,
                          background: 'linear-gradient(155deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))',
                          border: '1px solid rgba(255,255,255,0.10)',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
                            <div>
                              <div style={{ fontSize: 11, fontWeight: 800, color: '#8e8e93', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 6 }}>
                                First action
                              </div>
                              <div style={{ fontSize: 20, fontWeight: 900, color: '#f5f5f7', letterSpacing: '-0.5px' }}>{firstAction.title}</div>
                            </div>
                            <div style={{
                              padding: '8px 10px',
                              borderRadius: 14,
                              background: `${familyAccent}14`,
                              border: `1px solid ${familyAccent}24`,
                              color: familyAccent,
                              fontSize: 11,
                              fontWeight: 800,
                            }}>
                              Under 1 min
                            </div>
                          </div>

                          <div style={{ fontSize: 13.5, color: '#b7b7be', lineHeight: 1.6, marginBottom: 16 }}>
                            {firstAction.subtitle}
                          </div>

                          <div style={{
                            padding: '14px 14px',
                            borderRadius: 18,
                            background: 'rgba(0,0,0,0.18)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            marginBottom: 14,
                          }}>
                            <div style={{ fontSize: 16, fontWeight: 800, color: '#f5f5f7', lineHeight: 1.5 }}>
                              {firstAction.prompt}
                            </div>
                          </div>

                          <div style={{ display: 'grid', gap: 8 }}>
                            {firstAction.options.map((option, index) => {
                              const active = firstActionChoice === index
                              const correct = firstActionState !== 'idle' && index === firstAction.correctIndex
                              const wrongSelected = firstActionState === 'wrong' && active
                              return (
                                <button
                                  key={option}
                                  onClick={() => {
                                    setFirstActionChoice(index)
                                    if (index === firstAction.correctIndex) {
                                      setFirstActionState('correct')
                                    } else {
                                      setFirstActionState('wrong')
                                    }
                                  }}
                                  style={{
                                    width: '100%',
                                    padding: '12px 14px',
                                    borderRadius: 16,
                                    border: `1px solid ${
                                      correct
                                        ? 'rgba(14,245,194,0.28)'
                                        : wrongSelected
                                          ? 'rgba(255,69,58,0.24)'
                                          : active
                                            ? 'rgba(255,255,255,0.12)'
                                            : 'rgba(255,255,255,0.08)'
                                    }`,
                                    background: correct
                                      ? 'rgba(14,245,194,0.12)'
                                      : wrongSelected
                                        ? 'rgba(255,69,58,0.08)'
                                        : active
                                          ? 'rgba(255,255,255,0.06)'
                                          : 'rgba(255,255,255,0.03)',
                                    color: '#f5f5f7',
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                    fontSize: 13.5,
                                    fontWeight: 700,
                                    fontFamily: "'DM Sans', sans-serif",
                                  }}
                                >
                                  {option}
                                </button>
                              )
                            })}
                          </div>

                          {firstActionState === 'wrong' && (
                            <div style={{
                              marginTop: 14,
                              padding: '12px 14px',
                              borderRadius: 16,
                              background: 'rgba(255,69,58,0.08)',
                              border: '1px solid rgba(255,69,58,0.18)',
                              color: '#ffb4ae',
                              fontSize: 13,
                              lineHeight: 1.55,
                            }}>
                              Close. Try once more. The strongest answer is the one that leads to real progress, not just surface familiarity.
                            </div>
                          )}

                          {firstActionState === 'correct' && (
                            <div style={{
                              marginTop: 14,
                              padding: '12px 14px',
                              borderRadius: 16,
                              background: 'rgba(14,245,194,0.10)',
                              border: '1px solid rgba(14,245,194,0.18)',
                            }}>
                              <div style={{ fontSize: 14, fontWeight: 800, color: '#d9fff7', marginBottom: 4 }}>
                                {firstAction.success}
                              </div>
                              <div style={{ fontSize: 12.5, color: '#bdece1', lineHeight: 1.55 }}>
                                {firstAction.followUp}
                              </div>
                            </div>
                          )}
                        </div>

                        <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
                          <button
                            onClick={() => goToStep(4, -1)}
                            style={{
                              flex: 1,
                              padding: '14px',
                              background: 'rgba(255,255,255,0.04)',
                              border: '1px solid rgba(255,255,255,0.08)',
                              borderRadius: 16,
                              color: '#8e8e93',
                              fontSize: 14,
                              fontWeight: 700,
                              cursor: 'pointer',
                              fontFamily: "'DM Sans', sans-serif",
                            }}
                          >
                            Back
                          </button>
                          <button
                            onClick={() => {
                              if (firstActionState !== 'correct') return
                              goToStep(6, 1)
                            }}
                            disabled={firstActionState !== 'correct'}
                            style={{
                              flex: 1.35,
                              padding: '14px',
                              background: firstActionState === 'correct'
                                ? 'linear-gradient(135deg,#0ef5c2,#00d4ff)'
                                : 'rgba(255,255,255,0.06)',
                              border: firstActionState === 'correct' ? 'none' : '1px solid rgba(255,255,255,0.08)',
                              borderRadius: 16,
                              color: firstActionState === 'correct' ? '#06060f' : '#3a3a3c',
                              fontSize: 14.5,
                              fontWeight: 800,
                              cursor: firstActionState === 'correct' ? 'pointer' : 'default',
                              fontFamily: "'DM Sans', sans-serif",
                            }}
                          >
                            See what opens next
                          </button>
                        </div>
                      </div>
                    )}

                    {step === 6 && (
                      <div>
                        <div style={{ marginBottom: 18 }}>
                          <MascotBubble text="You are off to a strong start. Here is what opened up, and the next move is already ready." />
                        </div>

                        <div style={{
                          padding: '20px 18px',
                          borderRadius: 24,
                          background: 'linear-gradient(155deg, rgba(14,245,194,0.10), rgba(255,255,255,0.04))',
                          border: '1px solid rgba(14,245,194,0.18)',
                          boxShadow: '0 20px 48px rgba(14,245,194,0.08)',
                          marginBottom: 16,
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                            <div style={{
                              width: 48,
                              height: 48,
                              borderRadius: 16,
                              background: 'linear-gradient(135deg, rgba(14,245,194,0.20), rgba(0,212,255,0.14))',
                              border: '1px solid rgba(14,245,194,0.28)',
                              display: 'grid',
                              placeItems: 'center',
                              color: '#0ef5c2',
                            }}>
                              <IconGlyph name="check_circle" size={22} strokeWidth={2.4} color="#0ef5c2" />
                            </div>
                            <div>
                              <div style={{ fontSize: 22, fontWeight: 900, color: '#f5f5f7', letterSpacing: '-0.6px' }}>Strong start</div>
                              <div style={{ fontSize: 13, color: '#bdece1' }}>Your path is tuned and your first real lesson is ready.</div>
                            </div>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 10, marginBottom: 14 }}>
                            {[
                              { label: 'Level', value: recommendedLevel },
                              { label: 'First focus', value: preview.firstModule },
                              { label: 'Next move', value: preview.nextAction },
                            ].map((item) => (
                              <div key={item.label} style={{
                                padding: '12px',
                                borderRadius: 16,
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid rgba(255,255,255,0.08)',
                              }}>
                                <div style={{ fontSize: 10, fontWeight: 800, color: '#8e8e93', textTransform: 'uppercase', letterSpacing: '0.9px', marginBottom: 6 }}>{item.label}</div>
                                <div style={{ fontSize: 14, fontWeight: 800, color: '#f5f5f7', lineHeight: 1.35 }}>{item.value}</div>
                              </div>
                            ))}
                          </div>

                          <div style={{
                            padding: '12px 14px',
                            borderRadius: 16,
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.08)',
                          }}>
                            <div style={{ fontSize: 11, fontWeight: 800, color: '#8e8e93', textTransform: 'uppercase', letterSpacing: '0.9px', marginBottom: 6 }}>
                              Momentum
                            </div>
                            <div style={{ fontSize: 13.5, color: '#f5f5f7', lineHeight: 1.6 }}>
                              {recommendedLevel === 'beginner'
                                ? 'You are starting with a clear ramp and a quick first win, which is exactly how consistent learners stay in motion.'
                                : recommendedLevel === 'intermediate'
                                  ? 'You are already past the true beginner phase, so the path will skip the softest intro material.'
                                  : 'You are starting further up the path, so we will compress basics and move faster toward higher-value work.'}
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: 10 }}>
                          <button
                            onClick={() => goToStep(5, -1)}
                            style={{
                              flex: 1,
                              padding: '14px',
                              background: 'rgba(255,255,255,0.04)',
                              border: '1px solid rgba(255,255,255,0.08)',
                              borderRadius: 16,
                              color: '#8e8e93',
                              fontSize: 14,
                              fontWeight: 700,
                              cursor: 'pointer',
                              fontFamily: "'DM Sans', sans-serif",
                            }}
                          >
                            Back
                          </button>
                          <button
                            onClick={handleGenerate}
                            style={{
                              flex: 1.5,
                              padding: '14px',
                              background: 'linear-gradient(135deg,#0ef5c2,#00d4ff)',
                              border: 'none',
                              borderRadius: 16,
                              color: '#06060f',
                              fontSize: 14.5,
                              fontWeight: 800,
                              cursor: 'pointer',
                              fontFamily: "'DM Sans', sans-serif",
                              boxShadow: '0 0 36px rgba(14,245,194,0.22)',
                            }}
                          >
                            Keep going
                          </button>
                        </div>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
