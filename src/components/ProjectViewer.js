'use client'
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { getSkillConfig, VERIFICATION_UI, getReferenceMaterialLabel } from '@/lib/skillTypes'
import { buildProjectProofSummary, getAuthenticityLevel, getProjectCriteriaCards } from '@/lib/projectProof'
import {
  STEP_VERIFICATION_STATES,
  buildStepStatus,
  deriveVerificationStatus,
  ensureProjectProgress,
  getStepVerification,
  normalizeProjectSteps,
} from '@/lib/projectVerification'

const font = "'Plus Jakarta Sans','DM Sans',system-ui,sans-serif"
const mono = "'SF Mono','Fira Code','Cascadia Code',monospace"

const T = {
  teal: '#0ef5c2', tealDim: 'rgba(14,245,194,0.08)', tealBorder: 'rgba(14,245,194,0.22)',
  gold: '#FFD700', amber: '#F59E0B', red: '#FF453A', green: '#34D399',
  purple: '#A855F7', blue: '#3B82F6', pink: '#EC4899',
  text: '#f5f5f7', textMuted: '#8e8e93', bg: 'rgba(6,6,15,0.98)',
  card: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.08)',
  glass: 'rgba(255,255,255,0.03)',
}

const DIFFICULTY_COLORS = {
  beginner: { color: T.teal, bg: T.tealDim, border: T.tealBorder },
  intermediate: { color: T.amber, bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.22)' },
  advanced: { color: T.red, bg: 'rgba(255,69,58,0.08)', border: 'rgba(255,69,58,0.22)' },
}

const XP_PER_STEP = 15
const PERFECT_BONUS = 50
const NO_HINT_BONUS = 25
const BUILD_MODE_BONUS = 40
const CHECKPOINT_BONUS = 10
const AUTH_BONUS_THRESHOLD = 85

const AI_MODES = [
  { id: 'explain', icon: '📖', label: 'Explain', color: T.blue },
  { id: 'hint', icon: '💡', label: 'Hint', color: T.amber },
  { id: 'debug', icon: '🐛', label: 'Debug', color: T.red },
  { id: 'challenge', icon: '⚡', label: 'Challenge', color: T.purple },
]

const AUTHENTICITY_LABELS = {
  verified: { label: 'Verified', color: T.green, icon: '✓' },
  likely_genuine: { label: 'Likely Genuine', color: T.blue, icon: '◉' },
  suspicious: { label: 'Suspicious', color: T.amber, icon: '⚠' },
  low_effort: { label: 'Low Effort', color: T.red, icon: '✗' },
}

const STEP_STATUS_META = {
  [STEP_VERIFICATION_STATES.NOT_STARTED]: { label: 'Not started', short: 'NOT_STARTED', color: T.textMuted, bg: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.08)' },
  [STEP_VERIFICATION_STATES.RUNNING]: { label: 'In progress', short: 'RUNNING', color: T.blue, bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.22)' },
  [STEP_VERIFICATION_STATES.FAILED]: { label: 'Needs fixes', short: 'FAILED', color: T.red, bg: 'rgba(255,69,58,0.08)', border: 'rgba(255,69,58,0.22)' },
  [STEP_VERIFICATION_STATES.PASSED]: { label: 'Verified', short: 'PASSED', color: T.green, bg: 'rgba(52,211,153,0.08)', border: 'rgba(52,211,153,0.22)' },
}

// ─── Helpers ─────────────────────────────────────────────────────────────
function renderMarkdown(text) {
  if (!text) return null
  return text.split('\n').map((line, i) => {
    if (line.startsWith('```')) return null
    if (line.startsWith('  ') || line.startsWith('\t')) {
      return <div key={i} style={{ background: 'rgba(0,0,0,0.3)', padding: '2px 8px', borderRadius: 6, fontFamily: mono, fontSize: 11, color: '#c8d6e5', margin: '2px 0' }}>{line.trim()}</div>
    }
    const html = line.replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    return <div key={i} style={{ marginBottom: line === '' ? 8 : 2 }} dangerouslySetInnerHTML={{ __html: html }} />
  })
}

function XpPopup({ xp, label, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 1500); return () => clearTimeout(t) }, [onDone])
  return (
    <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 99999, pointerEvents: 'none', animation: 'xpBurst 1.5s ease forwards' }}>
      <div style={{ fontSize: 28, fontWeight: 900, fontFamily: font, color: T.gold, textShadow: '0 0 30px rgba(255,215,0,0.5)', textAlign: 'center' }}>
        +{xp} XP
      </div>
      {label && <div style={{ fontSize: 11, fontWeight: 700, color: T.teal, textAlign: 'center', marginTop: 4 }}>{label}</div>}
    </div>
  )
}

function AuthenticityBadge({ score, compact }) {
  if (score === null || score === undefined) return null
  let info
  if (score >= 85) info = AUTHENTICITY_LABELS.verified
  else if (score >= 70) info = AUTHENTICITY_LABELS.likely_genuine
  else if (score >= 40) info = AUTHENTICITY_LABELS.suspicious
  else info = AUTHENTICITY_LABELS.low_effort

  if (compact) {
    return (
      <span style={{ padding: '3px 8px', borderRadius: 9999, fontSize: 9, fontWeight: 800, background: `${info.color}12`, border: `1px solid ${info.color}30`, color: info.color }}>
        {info.icon} {score}%
      </span>
    )
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 12, background: `${info.color}08`, border: `1px solid ${info.color}20` }}>
      <div style={{ width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${info.color}15`, fontSize: 14, fontWeight: 900, color: info.color }}>
        {info.icon}
      </div>
      <div>
        <div style={{ fontSize: 12, fontWeight: 800, color: info.color }}>{info.label}</div>
        <div style={{ fontSize: 10, color: T.textMuted }}>Authenticity: {score}%</div>
      </div>
    </div>
  )
}

function hydrateAuthenticity(progressAuthenticity, score) {
  if (progressAuthenticity) return progressAuthenticity
  if (score === null || score === undefined) return null
  const level = getAuthenticityLevel(score)
  return {
    score,
    label: level.label,
    labelColor: level.color,
    icon: level.icon,
    breakdown: [],
    flags: [],
    positives: [],
    verificationLayers: [],
  }
}

function countWords(text) {
  return String(text || '').trim().split(/\s+/).filter(Boolean).length
}

function getStepStateMeta(status) {
  return STEP_STATUS_META[status] || STEP_STATUS_META[STEP_VERIFICATION_STATES.NOT_STARTED]
}

function getLayerState(result) {
  if (!result) return STEP_VERIFICATION_STATES.NOT_STARTED
  return result.passed ? STEP_VERIFICATION_STATES.PASSED : STEP_VERIFICATION_STATES.FAILED
}

function getStepFailureMessage(verification = {}) {
  if (verification?.defense_result?.passed === false) {
    return verification.defense_result.feedback || 'Your explanation did not clearly prove understanding yet.'
  }
  if (verification?.ai_review?.passed === false) {
    return verification.ai_review.feedback || 'The code review did not pass yet.'
  }
  if (verification?.validation_result?.passed === false) {
    return verification.validation_result.feedback || 'The output did not satisfy the validation checks.'
  }
  if (verification?.execution_result?.passed === false) {
    return verification.execution_result.stderr || 'The code did not execute successfully.'
  }
  return null
}

function getVerificationCards(step, verification) {
  const cards = []
  if (step.requires_code) {
    cards.push({
      key: 'execution',
      label: 'Execution',
      status: verification.execution_result ? getLayerState(verification.execution_result) : (verification.run_count > 0 ? STEP_VERIFICATION_STATES.RUNNING : STEP_VERIFICATION_STATES.NOT_STARTED),
      detail: verification.execution_result?.passed ? 'Code ran successfully' : verification.execution_result?.stderr ? 'Runtime issue detected' : 'Run code to verify',
    })
  }

  cards.push({
    key: 'validation',
    label: step.requires_code ? 'Tests' : 'Validation',
    status: verification.validation_result ? getLayerState(verification.validation_result) : STEP_VERIFICATION_STATES.NOT_STARTED,
    detail: verification.validation_result?.passed ? 'Artifact passed checks' : verification.validation_result ? 'Artifact still fails checks' : 'Submit proof to validate',
  })

  if (step.requires_code) {
    cards.push({
      key: 'review',
      label: 'AI Review',
      status: verification.ai_review ? getLayerState(verification.ai_review) : STEP_VERIFICATION_STATES.NOT_STARTED,
      detail: verification.ai_review?.passed ? `Authenticity ${verification.ai_review.authenticity_score || 0}%` : verification.ai_review ? 'Review flagged issues' : 'Review quality and originality',
    })
  }

  cards.push({
    key: 'defense',
    label: 'Defense',
    status: verification.defense_result ? getLayerState(verification.defense_result) : STEP_VERIFICATION_STATES.NOT_STARTED,
    detail: verification.defense_result?.passed ? 'Understanding confirmed' : verification.defense_result ? 'Defense needs more depth' : 'Explain how the work functions',
  })

  return cards
}

function buildArtifactPayload(step, responseValue, checklistSet, reflectionValue) {
  if (step.requires_practice) {
    const completedChecks = (step.practice_checklist || [])
      .filter((_, index) => checklistSet?.has(index))
      .map((item) => `- ${item}`)
      .join('\n')

    return [
      'Practice checklist completed:',
      completedChecks || '- None yet',
      '',
      'Reflection:',
      String(reflectionValue || '').trim(),
    ].join('\n')
  }

  return String(responseValue || '').trim()
}

// ─── Step Timer ──────────────────────────────────────────────────────────
function useStepTimer() {
  const startTimes = useRef({})
  const elapsedRef = useRef({})

  const startStep = useCallback((stepId) => {
    if (!startTimes.current[stepId]) startTimes.current[stepId] = Date.now()
  }, [])

  const getStepTime = useCallback((stepId) => {
    if (!startTimes.current[stepId]) return 0
    return Math.round((Date.now() - startTimes.current[stepId]) / 1000)
  }, [])

  const getAllTimes = useCallback(() => {
    const times = {}
    for (const [id, start] of Object.entries(startTimes.current)) {
      times[id] = Math.round((Date.now() - start) / 1000)
    }
    return times
  }, [])

  return { startStep, getStepTime, getAllTimes }
}

// ─── Difficulty Adapter ──────────────────────────────────────────────────
function useDifficultyAdapter() {
  const [stepTimes, setStepTimes] = useState({})
  const [hintsUsed, setHintsUsed] = useState(new Set())
  const [aiAsksPerStep, setAiAsksPerStep] = useState({})

  const recordStepTime = useCallback((stepId, seconds) => {
    setStepTimes(prev => ({ ...prev, [stepId]: seconds }))
  }, [])
  const recordHintUsed = useCallback((stepId) => {
    setHintsUsed(prev => new Set([...prev, stepId]))
  }, [])
  const recordAiAsk = useCallback((stepId) => {
    setAiAsksPerStep(prev => ({ ...prev, [stepId]: (prev[stepId] || 0) + 1 }))
  }, [])

  const getAdaptiveMessage = useCallback((stepId) => {
    const time = stepTimes[stepId] || 0
    const asks = aiAsksPerStep[stepId] || 0
    const usedHint = hintsUsed.has(stepId)
    if (time > 600 || asks >= 3 || usedHint) return { text: "Take your time — you've got this! Try the AI assistant for a nudge.", color: T.amber, icon: '🤗' }
    if (time < 60 && asks === 0 && !usedHint) return { text: "You're flying through this! Ready for a bonus challenge?", color: T.purple, icon: '⚡' }
    return null
  }, [stepTimes, aiAsksPerStep, hintsUsed])

  return { recordStepTime, recordHintUsed, recordAiAsk, getAdaptiveMessage, noHintsUsed: hintsUsed.size === 0, hintsUsed, aiAsksPerStep, stepTimes }
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
export default function ProjectViewer({ task, goal, knowledge, goalId, onClose, onComplete, readOnly = false }) {
  // Core state
  const [project, setProject] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [expandedStep, setExpandedStep] = useState(0)
  const [showHints, setShowHints] = useState({})
  const [showCode, setShowCode] = useState(false)
  const [copied, setCopied] = useState(false)
  const [completedSteps, setCompletedSteps] = useState(new Set())
  const [completedDeliverables, setCompletedDeliverables] = useState(new Set())
  const [reviewing, setReviewing] = useState(false)
  const [review, setReview] = useState(null)
  const [completing, setCompleting] = useState(false)
  const [stepVerification, setStepVerification] = useState({})
  const [stepErrors, setStepErrors] = useState({})
  const calculateAuthenticityRef = useRef(null)

  // Mode toggle
  const [projectMode, setProjectMode] = useState('guided') // 'guided' | 'build'
  const [modeChosen, setModeChosen] = useState(false)

  // AI Assistant
  const [aiOpen, setAiOpen] = useState({})
  const [aiMode, setAiMode] = useState({})
  const [aiMessages, setAiMessages] = useState({})
  const [aiLoading, setAiLoading] = useState({})
  const [aiInput, setAiInput] = useState({})

  // Code Submission
  const [codeInputs, setCodeInputs] = useState({})
  const [pasteCounts, setPasteCounts] = useState({})
  const [executionLoading, setExecutionLoading] = useState({})
  const [validationLoading, setValidationLoading] = useState({})
  const [reviewLoading, setReviewLoading] = useState({})
  const [defenseLoading, setDefenseLoading] = useState({})
  const [defenseInputs, setDefenseInputs] = useState({})

  // Checkpoints
  const [checkpoints, setCheckpoints] = useState({}) // { stepId: { questions, answers, results, show } }
  const [checkpointLoading, setCheckpointLoading] = useState({})

  // Response submission (language, math, business, writing, design, science, hardware)
  const [responseInputs, setResponseInputs] = useState({})

  // Practice (music, skills)
  const [practiceChecks, setPracticeChecks] = useState({}) // { stepId: Set of checked indices }
  const [practiceReflection, setPracticeReflection] = useState({})

  // Gamification
  const [xpEarned, setXpEarned] = useState(0)
  const [xpPopup, setXpPopup] = useState(null)
  const [xpPopupLabel, setXpPopupLabel] = useState(null)
  const [stepXpAwarded, setStepXpAwarded] = useState(new Set())
  const [showCelebration, setShowCelebration] = useState(false)
  const [shareToast, setShareToast] = useState(false)

  // Authenticity
  const [authenticityScore, setAuthenticityScore] = useState(null)
  const [authenticityResult, setAuthenticityResult] = useState(null)

  // Momentum / psychology
  const [momentum, setMomentum] = useState(0) // 0-100 speed indicator

  // Timers and difficulty
  const { startStep, getStepTime, getAllTimes } = useStepTimer()
  const adapter = useDifficultyAdapter()

  const applyProjectRecord = useCallback((record, options = {}) => {
    if (!record) return

    const normalizedProject = {
      ...record,
      progress: ensureProjectProgress(record.progress),
    }
    normalizedProject.steps = normalizeProjectSteps(normalizedProject.steps || [], normalizedProject)

    const verifiedIds = new Set(normalizedProject.progress?.steps_completed || [])
    const fallbackDeliverables = normalizedProject.progress?.deliverables_completed
      || ((normalizedProject.status === 'completed' || normalizedProject.status === 'reviewed' || normalizedProject.progress?.verification_status === 'verified')
        ? (normalizedProject.deliverables || []).map((_, index) => index)
        : [])

    const codeSubmissions = normalizedProject.progress?.code_submissions || {}
    const responseSubmissions = normalizedProject.progress?.response_submissions || {}
    const verificationMap = normalizedProject.progress?.step_verification || {}

    setProject(normalizedProject)
    setCompletedSteps(verifiedIds)
    setCompletedDeliverables(new Set(fallbackDeliverables))
    setStepVerification(verificationMap)
    setReview(normalizedProject.ai_review || null)
    setAuthenticityScore(normalizedProject.authenticity_score ?? null)
    setAuthenticityResult(hydrateAuthenticity(normalizedProject.progress?.authenticity, normalizedProject.authenticity_score))
    setProjectMode(normalizedProject.mode || 'guided')
    setModeChosen(true)
    setXpEarned(verifiedIds.size * XP_PER_STEP)
    setStepXpAwarded(verifiedIds)

    setCodeInputs(() => Object.fromEntries(
      Object.entries(codeSubmissions).map(([stepId, submission]) => [stepId, submission?.code || '']),
    ))
    setResponseInputs(() => Object.fromEntries(
      Object.entries(responseSubmissions).map(([stepId, submission]) => [stepId, submission?.response || '']),
    ))
    setDefenseInputs(() => Object.fromEntries(
      Object.entries(verificationMap).map(([stepId, verification]) => [stepId, verification?.defense_response || '']),
    ))

    if (!options.preserveExpanded) {
      const firstIncompleteIndex = normalizedProject.steps.findIndex((step) => !verifiedIds.has(step.id))
      setExpandedStep(firstIncompleteIndex >= 0 ? firstIncompleteIndex : Math.max(normalizedProject.steps.length - 1, 0))
    }
  }, [])

  const refreshProject = useCallback(async (projectId = project?.id) => {
    if (!projectId) return null
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    const { data: existing } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single()
    if (existing) applyProjectRecord(existing, { preserveExpanded: true })
    return existing || null
  }, [applyProjectRecord, project?.id])

  const awardVerifiedStep = useCallback((stepId, nextProject = project) => {
    if (readOnly || stepXpAwarded.has(stepId)) return
    const seconds = getStepTime(stepId)
    adapter.recordStepTime(stepId, seconds)
    setStepXpAwarded((prev) => new Set([...prev, stepId]))
    setXpEarned((prev) => prev + XP_PER_STEP)
    setXpPopup(XP_PER_STEP)
    setXpPopupLabel('Step verified')

    const stepIndex = (nextProject?.steps || []).findIndex((entry) => entry.id === stepId)
    if (stepIndex >= 0 && stepIndex < (nextProject?.steps || []).length - 1) {
      const nextStepId = nextProject.steps[stepIndex + 1]?.id
      setExpandedStep(stepIndex + 1)
      if (nextStepId) startStep(nextStepId)
    }
  }, [adapter, getStepTime, project, readOnly, startStep, stepXpAwarded])

  useEffect(() => {
    if (readOnly || !project?.steps?.[expandedStep]) return
    const activeStep = project.steps[expandedStep]
    if (activeStep && !completedSteps.has(activeStep.id)) startStep(activeStep.id)
  }, [project, readOnly, expandedStep, completedSteps, startStep])

  // Momentum tracker — updates based on recent completion speed
  useEffect(() => {
    if (completedSteps.size === 0) return
    const recentSteps = [...completedSteps].slice(-3)
    const times = recentSteps.map(id => adapter.stepTimes[id] || 120)
    const avgTime = times.reduce((a, b) => a + b, 0) / times.length
    // Fast = high momentum, slow = low
    const m = Math.max(0, Math.min(100, Math.round(100 - (avgTime / 600) * 100)))
    setMomentum(m)
  }, [completedSteps, adapter.stepTimes])

  useEffect(() => {
    if (typeof window === 'undefined') return undefined

    const scrollY = window.scrollY
    const bodyStyle = document.body.style
    const htmlStyle = document.documentElement.style
    const previous = {
      bodyOverflow: bodyStyle.overflow,
      bodyPosition: bodyStyle.position,
      bodyTop: bodyStyle.top,
      bodyLeft: bodyStyle.left,
      bodyRight: bodyStyle.right,
      bodyWidth: bodyStyle.width,
      bodyOverscrollBehavior: bodyStyle.overscrollBehavior,
      htmlOverflow: htmlStyle.overflow,
      htmlOverscrollBehavior: htmlStyle.overscrollBehavior,
    }

    htmlStyle.overflow = 'hidden'
    htmlStyle.overscrollBehavior = 'none'
    bodyStyle.overflow = 'hidden'
    bodyStyle.position = 'fixed'
    bodyStyle.top = `-${scrollY}px`
    bodyStyle.left = '0'
    bodyStyle.right = '0'
    bodyStyle.width = '100%'
    bodyStyle.overscrollBehavior = 'none'

    return () => {
      htmlStyle.overflow = previous.htmlOverflow
      htmlStyle.overscrollBehavior = previous.htmlOverscrollBehavior
      bodyStyle.overflow = previous.bodyOverflow
      bodyStyle.position = previous.bodyPosition
      bodyStyle.top = previous.bodyTop
      bodyStyle.left = previous.bodyLeft
      bodyStyle.right = previous.bodyRight
      bodyStyle.width = previous.bodyWidth
      bodyStyle.overscrollBehavior = previous.bodyOverscrollBehavior
      window.scrollTo(0, scrollY)
    }
  }, [])

  // ─── Load / Generate ───────────────────────────────────────────
  useEffect(() => {
    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('Not authenticated')

        if (readOnly && task.id && !task.id.startsWith('d')) {
          const { data: existing } = await supabase.from('projects').select('*').eq('id', task.id).eq('user_id', user.id).single()
          if (existing) {
            applyProjectRecord(existing)
            setLoading(false)
            return
          }
        }

        if (goalId && task.id) {
          const dayMatch = task.id.match(/d(\d+)/)
          const dayNumber = dayMatch ? parseInt(dayMatch[1]) : null
          if (dayNumber) {
            const { data: existing } = await supabase.from('projects').select('*').eq('user_id', user.id).eq('goal_id', goalId).eq('day_number', dayNumber).limit(1).single()
            if (existing) {
              applyProjectRecord(existing)
              setLoading(false)
              return
            }
          }
        }

        // No existing project — show mode chooser before generating
        setLoading(false)
      } catch (err) {
        setError(err.message)
        setLoading(false)
      }
    }
    load()
  }, [applyProjectRecord, task, goal, goalId, knowledge, readOnly])

  // Generate project after mode is chosen
  const generateProject = useCallback(async (mode) => {
    setLoading(true)
    try {
      const dayMatch = task.id?.match(/d(\d+)/)
      const dayNumber = dayMatch ? parseInt(dayMatch[1]) : null
      let conceptsCovered = []
      if (goalId) {
        const { data: { user } } = await supabase.auth.getUser()
        const { data: rows } = await supabase.from('daily_tasks').select('covered_topics').eq('goal_id', goalId).eq('user_id', user.id)
        conceptsCovered = [...new Set((rows || []).flatMap(r => r.covered_topics || []))]
      }
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token || null
      const res = await fetch('/api/project/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ goalId, goal, conceptsCovered, difficulty: 'beginner', dayNumber, mode }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Failed to generate project')
      applyProjectRecord(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [applyProjectRecord, task, goal, goalId])

  // ─── AI Assistant ──────────────────────────────────────────────
  const askAI = useCallback(async (stepId, mode, customMessage) => {
    if (aiLoading[stepId]) return
    setAiLoading(prev => ({ ...prev, [stepId]: true }))
    adapter.recordAiAsk(stepId)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token || null
      const res = await fetch('/api/project/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ projectId: project.id, stepId, mode: mode || 'explain', userMessage: customMessage || null }),
      })
      const data = await res.json()
      if (data.reply) {
        setAiMessages(prev => ({
          ...prev,
          [stepId]: [...(prev[stepId] || []), ...(customMessage ? [{ role: 'user', content: customMessage }] : []), { role: 'assistant', content: data.reply }],
        }))
      }
    } catch {}
    setAiLoading(prev => ({ ...prev, [stepId]: false }))
  }, [aiLoading, project, adapter])

  const executeStepAction = useCallback(async (stepId, setLoadingMap, endpoint, body) => {
    if (!project?.id) return null
    setStepErrors((prev) => ({ ...prev, [stepId]: null }))
    setLoadingMap((prev) => ({ ...prev, [stepId]: true }))
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token || null
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ projectId: project.id, stepId, accessToken: token, ...body }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Verification failed')
      const refreshed = await refreshProject(project.id)
      return { data, refreshed }
    } catch (err) {
      setStepErrors((prev) => ({ ...prev, [stepId]: err.message || 'Verification failed' }))
      return null
    } finally {
      setLoadingMap((prev) => ({ ...prev, [stepId]: false }))
    }
  }, [project?.id, refreshProject])

  const handleVerificationRefresh = useCallback(async (stepId, refreshed) => {
    const nextRecord = refreshed || project
    const nextCompleted = new Set(nextRecord?.progress?.steps_completed || [])
    if (nextCompleted.has(stepId) && !completedSteps.has(stepId)) {
      awardVerifiedStep(stepId, nextRecord)
    }
    if (nextRecord?.progress?.verification_status === 'verified' && authenticityScore == null) {
      await calculateAuthenticityRef.current?.(nextRecord.id)
    }
  }, [authenticityScore, awardVerifiedStep, completedSteps, project])

  // ─── Strict verification flow ──────────────────────────────────
  const runCodeStep = useCallback(async (stepId) => {
    const code = codeInputs[stepId]
    if (!code?.trim()) {
      setStepErrors((prev) => ({ ...prev, [stepId]: 'Add runnable code before executing this step.' }))
      return
    }

    const result = await executeStepAction(stepId, setExecutionLoading, '/api/execute-code', {
      code,
      timeSpentSec: getStepTime(stepId),
      pasteCount: pasteCounts[stepId] || 0,
    })
    if (result?.data?.passed) setStepErrors((prev) => ({ ...prev, [stepId]: null }))
  }, [codeInputs, executeStepAction, getStepTime, pasteCounts])

  const validateStepOutput = useCallback(async (step) => {
    const stepId = step.id
    const checklistSet = practiceChecks[stepId] || new Set()
    const artifact = buildArtifactPayload(step, responseInputs[stepId], checklistSet, practiceReflection[stepId])

    if (!step.requires_code) {
      if (step.min_words && countWords(artifact) < step.min_words) {
        setStepErrors((prev) => ({ ...prev, [stepId]: `Write at least ${step.min_words} words before submitting this step.` }))
        return
      }
      if (step.requires_practice && (step.practice_checklist || []).length > 0 && checklistSet.size !== (step.practice_checklist || []).length) {
        setStepErrors((prev) => ({ ...prev, [stepId]: 'Complete every practice checkpoint before validating this step.' }))
        return
      }
      if (!artifact.trim()) {
        setStepErrors((prev) => ({ ...prev, [stepId]: 'Submit the required artifact or reflection before validating this step.' }))
        return
      }
    }

    const result = await executeStepAction(stepId, setValidationLoading, '/api/validate-output', step.requires_code ? {} : { artifact })
    if (result) await handleVerificationRefresh(stepId, result.refreshed)
  }, [executeStepAction, handleVerificationRefresh, practiceChecks, practiceReflection, responseInputs])

  const reviewCodeStep = useCallback(async (stepId) => {
    const result = await executeStepAction(stepId, setReviewLoading, '/api/review-code', {})
    if (result) await handleVerificationRefresh(stepId, result.refreshed)
  }, [executeStepAction, handleVerificationRefresh])

  const evaluateDefenseStep = useCallback(async (stepId) => {
    const defenseResponse = String(defenseInputs[stepId] || '').trim()
    if (!defenseResponse) {
      setStepErrors((prev) => ({ ...prev, [stepId]: 'Explain how your solution works before submitting your defense.' }))
      return
    }
    const result = await executeStepAction(stepId, setDefenseLoading, '/api/evaluate-defense', { defenseResponse })
    if (result) await handleVerificationRefresh(stepId, result.refreshed)
  }, [defenseInputs, executeStepAction, handleVerificationRefresh])

  // ─── Practice Toggle (music/skills) ──────────────────────────
  const togglePracticeCheck = useCallback((stepId, idx) => {
    setPracticeChecks(prev => {
      const current = prev[stepId] || new Set()
      const next = new Set(current)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return { ...prev, [stepId]: next }
    })
  }, [])

  // ─── Checkpoints ───────────────────────────────────────────────
  const generateCheckpoint = useCallback(async (stepId) => {
    if (!project?.id) return
    setCheckpointLoading(prev => ({ ...prev, [stepId]: true }))
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token || null
      const res = await fetch('/api/project/checkpoint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ projectId: project.id, stepId, action: 'generate' }),
      })
      const data = await res.json()
      if (data.questions) {
        setCheckpoints(prev => ({ ...prev, [stepId]: { questions: data.questions, answers: {}, results: {}, show: true } }))
      }
    } catch {}
    setCheckpointLoading(prev => ({ ...prev, [stepId]: false }))
  }, [project])

  const evaluateCheckpoint = useCallback(async (stepId, questionId, question, answer, expectedKeywords) => {
    if (!project?.id) return
    setCheckpointLoading(prev => ({ ...prev, [`${stepId}-${questionId}`]: true }))
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token || null
      const res = await fetch('/api/project/checkpoint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ projectId: project.id, stepId, action: 'evaluate', question, answer, expectedKeywords }),
      })
      const data = await res.json()
      setCheckpoints(prev => {
        const cp = { ...prev[stepId] }
        cp.results = { ...cp.results, [questionId]: data }
        return { ...prev, [stepId]: cp }
      })
      if (data.passed) {
        setXpEarned(p => p + CHECKPOINT_BONUS)
        setXpPopup(CHECKPOINT_BONUS)
        setXpPopupLabel('Checkpoint Passed!')
      }
    } catch {}
    setCheckpointLoading(prev => ({ ...prev, [`${stepId}-${questionId}`]: false }))
  }, [project])

  // ─── Review ────────────────────────────────────────────────────
  const requestReview = useCallback(async () => {
    if (!project?.id || reviewing) return
    setReviewing(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token || null
      const res = await fetch('/api/project/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ projectId: project.id }),
      })
      const data = await res.json()
      if (data.review) {
        setReview(data.review)
        await refreshProject(project.id)
      }
    } catch {}
    setReviewing(false)
  }, [project, refreshProject, reviewing])

  // ─── Authenticity ──────────────────────────────────────────────
  const calculateAuthenticity = useCallback(async (projectId = project?.id) => {
    if (!projectId) return null
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token || null
      const res = await fetch('/api/project/authenticity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          projectId,
          timeTracking: getAllTimes(),
          codeSubmissions: project?.progress?.code_submissions,
          responseSubmissions: project?.progress?.response_submissions,
        }),
      })
      const data = await res.json()
      setAuthenticityScore(data.score)
      setAuthenticityResult(data)
      if (data.score >= AUTH_BONUS_THRESHOLD) {
        setXpEarned(p => p + 20)
        setXpPopup(20)
        setXpPopupLabel('Verified Bonus!')
      }
      return data
    } catch {
      return null
    }
  }, [getAllTimes, project?.id, project?.progress?.code_submissions, project?.progress?.response_submissions])

  useEffect(() => {
    calculateAuthenticityRef.current = calculateAuthenticity
  }, [calculateAuthenticity])

  // ─── Complete ──────────────────────────────────────────────────
  const handleComplete = useCallback(async () => {
    if (completing) return
    const verificationStatus = project?.progress?.verification_status || deriveVerificationStatus(project?.steps || [], project?.progress)
    if (verificationStatus !== 'verified') return
    setCompleting(true)
    if (authenticityScore == null) await calculateAuthenticity(project?.id)
    await supabase
      .from('projects')
      .update({ status: review ? 'reviewed' : 'completed' })
      .eq('id', project.id)
    setShowCelebration(true)
    setTimeout(() => onComplete?.(), 3000)
  }, [authenticityScore, calculateAuthenticity, completing, onComplete, project, review])

  const shareProject = useCallback(() => {
    if (!project?.id) return
    navigator.clipboard.writeText(`${window.location.origin}/project/${project.id}`)
    setShareToast(true)
    setTimeout(() => setShareToast(false), 2500)
  }, [project])

  const copyCode = useCallback(() => {
    if (project?.starter_code) {
      navigator.clipboard.writeText(project.starter_code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [project])

  // ─── Computed ──────────────────────────────────────────────────
  const skillType = project?.skill_type || 'coding'
  const skillConfig = getSkillConfig(skillType)
  const steps = useMemo(() => normalizeProjectSteps(project?.steps || [], project || {}), [project])
  const deliverables = project?.deliverables || []
  const verificationStatus = project?.progress?.verification_status || deriveVerificationStatus(steps, project?.progress)
  const allStepsDone = steps.length > 0 && steps.every((step) => completedSteps.has(step.id))
  const allDeliverablesDone = deliverables.length === 0 || deliverables.every((_, i) => completedDeliverables.has(i))
  const isFullyComplete = verificationStatus === 'verified' || (allStepsDone && allDeliverablesDone)
  const dc = DIFFICULTY_COLORS[project?.difficulty] || DIFFICULTY_COLORS.beginner
  const progressPct = steps.length > 0 ? (completedSteps.size / steps.length) * 100 : 0
  const isLastStep = completedSteps.size === steps.length - 1
  const projectBrief = project?.progress?.project_brief || {}
  const proofSummary = project?.progress?.proof_summary || buildProjectProofSummary(project, authenticityResult)
  const verificationLayers = authenticityResult?.verificationLayers?.length > 0
    ? authenticityResult.verificationLayers
    : proofSummary.verificationLayers || []
  const criteriaCards = getProjectCriteriaCards(review, skillType)

  const bonusXp = useMemo(() => {
    if (!isFullyComplete) return 0
    let bonus = 0
    if (adapter.noHintsUsed) bonus += NO_HINT_BONUS
    if (Object.keys(adapter.aiAsksPerStep).length === 0) bonus += PERFECT_BONUS
    if (projectMode === 'build') bonus += BUILD_MODE_BONUS
    return bonus
  }, [isFullyComplete, adapter, projectMode])

  const totalXp = xpEarned + bonusXp + (project?.xp_reward || 0)

  useEffect(() => {
    if (readOnly || !project?.id || verificationStatus !== 'verified' || authenticityScore != null) return
    calculateAuthenticity(project.id)
  }, [authenticityScore, calculateAuthenticity, project?.id, readOnly, verificationStatus])

  // ═════════════════════════════════════════════════════════════════════
  // STYLES
  // ═════════════════════════════════════════════════════════════════════
  const STYLES = `
    @keyframes spin { to { transform: rotate(360deg) } }
    @keyframes checkPop { 0% { transform: scale(0); } 60% { transform: scale(1.3); } 100% { transform: scale(1); } }
    @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes scoreRing { from { stroke-dashoffset: 283; } }
    @keyframes xpBurst { 0% { opacity: 1; transform: translate(-50%,-50%) scale(1); } 50% { opacity: 1; transform: translate(-50%,-70%) scale(1.3); } 100% { opacity: 0; transform: translate(-50%,-90%) scale(0.8); } }
    @keyframes slideIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes pulseGlow { 0%,100% { box-shadow: 0 0 0 0 rgba(14,245,194,0.3); } 50% { box-shadow: 0 0 0 6px rgba(14,245,194,0); } }
    @keyframes pulse { 0%,100% { opacity: 0.4; } 50% { opacity: 1; } }
    @keyframes celebrationPop { 0% { transform: scale(0) rotate(-10deg); opacity: 0; } 50% { transform: scale(1.15) rotate(3deg); } 100% { transform: scale(1) rotate(0deg); opacity: 1; } }
    @keyframes confettiFloat { 0% { transform: translateY(0) rotate(0deg); opacity: 1; } 100% { transform: translateY(-120px) rotate(360deg); opacity: 0; } }
    @keyframes lastStepGlow { 0%,100% { box-shadow: 0 0 0 0 rgba(255,215,0,0.4); } 50% { box-shadow: 0 0 0 8px rgba(255,215,0,0); } }
    code { background: rgba(255,255,255,0.08); padding: 1px 5px; border-radius: 4px; font-family: ${mono}; font-size: 11px; }
  `
  const OVERLAY = {
    position: 'fixed',
    inset: 0,
    width: '100vw',
    height: '100dvh',
    zIndex: 9999,
    background: '#06060f',
    fontFamily: font,
    overscrollBehavior: 'none',
    overflow: 'hidden',
  }

  // ═════════════════════════════════════════════════════════════════════
  // LOADING
  // ═════════════════════════════════════════════════════════════════════
  if (loading) {
    return (
      <div className="overlay-slide-up" style={{ ...OVERLAY, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <style>{STYLES}</style>
        <div style={{ position: 'relative', width: 56, height: 56 }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', border: `3px solid ${T.tealDim}`, borderTopColor: T.teal, animation: 'spin 0.7s linear infinite' }}/>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🚀</div>
        </div>
        <div style={{ color: T.text, fontSize: 15, fontWeight: 700 }}>Building your project...</div>
        <div style={{ color: T.textMuted, fontSize: 12, animation: 'pulse 2s ease infinite' }}>AI is crafting a personalized challenge</div>
      </div>
    )
  }

  // ═════════════════════════════════════════════════════════════════════
  // ERROR
  // ═════════════════════════════════════════════════════════════════════
  if (error) {
    return (
      <div className="overlay-slide-up" style={{ ...OVERLAY, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 40 }}>
        <div style={{ fontSize: 40 }}>😵</div>
        <div style={{ color: T.text, fontSize: 16, fontWeight: 700 }}>Something went wrong</div>
        <div style={{ color: T.textMuted, fontSize: 13 }}>{error}</div>
        <button onClick={onClose} style={{ padding: '12px 24px', borderRadius: 14, border: 'none', background: T.teal, color: '#000', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: font }}>Go Back</button>
      </div>
    )
  }

  // ═════════════════════════════════════════════════════════════════════
  // MODE CHOOSER (Build vs Guided — shown before project generation)
  // ═════════════════════════════════════════════════════════════════════
  if (!project && !modeChosen && !readOnly) {
    return (
      <div className="overlay-slide-up" style={{ ...OVERLAY, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, padding: 40 }}>
        <style>{STYLES}</style>
        <div style={{ fontSize: 48, marginBottom: 8 }}>🚀</div>
        <div style={{ fontSize: 22, fontWeight: 900, color: T.text, textAlign: 'center', letterSpacing: '-0.5px' }}>Choose Your Mode</div>
        <div style={{ fontSize: 13, color: T.textMuted, textAlign: 'center', maxWidth: 400, lineHeight: 1.6 }}>
          How much guidance do you want?
        </div>

        <div style={{ display: 'flex', gap: 14, marginTop: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
          {/* Guided Mode */}
          <button onClick={() => { setModeChosen(true); setProjectMode('guided'); generateProject('guided') }} style={{
            width: 170, padding: '24px 16px', borderRadius: 20, border: `1px solid ${T.tealBorder}`,
            background: T.tealDim, cursor: 'pointer', fontFamily: font, textAlign: 'center',
          }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📖</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: T.text, marginBottom: 4 }}>Guided</div>
            <div style={{ fontSize: 11, color: T.textMuted, lineHeight: 1.5 }}>Step-by-step instructions</div>
            <div style={{ marginTop: 10, padding: '4px 10px', borderRadius: 9999, background: T.tealDim, border: `1px solid ${T.tealBorder}`, fontSize: 10, fontWeight: 800, color: T.teal, display: 'inline-block' }}>
              100 XP + 25 Gems
            </div>
          </button>

          {/* Build Mode */}
          <button onClick={() => { setModeChosen(true); setProjectMode('build'); generateProject('build') }} style={{
            width: 170, padding: '24px 16px', borderRadius: 20, border: '1px solid rgba(168,85,247,0.22)',
            background: 'rgba(168,85,247,0.06)', cursor: 'pointer', fontFamily: font, textAlign: 'center',
          }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>⚡</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: T.text, marginBottom: 4 }}>Build</div>
            <div style={{ fontSize: 11, color: T.textMuted, lineHeight: 1.5 }}>Minimal guidance, max credit</div>
            <div style={{ marginTop: 10, padding: '4px 10px', borderRadius: 9999, background: 'rgba(168,85,247,0.06)', border: '1px solid rgba(168,85,247,0.22)', fontSize: 10, fontWeight: 800, color: T.purple, display: 'inline-block' }}>
              150 XP + 40 Gems
            </div>
          </button>
        </div>

        <button onClick={onClose} style={{ marginTop: 12, background: 'none', border: 'none', color: T.textMuted, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: font }}>← Cancel</button>
      </div>
    )
  }

  if (!project) return null

  // ═════════════════════════════════════════════════════════════════════
  // CELEBRATION
  // ═════════════════════════════════════════════════════════════════════
  if (showCelebration) {
    return (
      <div className="overlay-slide-up" style={{ ...OVERLAY, zIndex: 10000, background: 'rgba(6,6,15,0.95)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
        <style>{STYLES}</style>
        {Array.from({ length: 24 }).map((_, i) => (
          <div key={i} style={{ position: 'absolute', left: `${10 + Math.random() * 80}%`, top: `${30 + Math.random() * 40}%`, width: 8, height: 8, borderRadius: i % 3 === 0 ? '50%' : 2, background: [T.teal, T.gold, T.purple, T.pink, T.blue][i % 5], animation: `confettiFloat ${1.5 + Math.random() * 1.5}s ease ${Math.random() * 0.5}s forwards` }}/>
        ))}
        <div style={{ animation: 'celebrationPop 0.6s cubic-bezier(0.34,1.56,0.64,1) forwards' }}>
          <div style={{ fontSize: 72, textAlign: 'center', marginBottom: 16 }}>🏆</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: T.text, textAlign: 'center', marginBottom: 8 }}>Project Verified!</div>
          <div style={{ fontSize: 14, color: T.textMuted, textAlign: 'center', marginBottom: 24 }}>{project.title}</div>
        </div>

        <div style={{ display: 'flex', gap: 12, animation: 'fadeUp 0.5s ease 0.3s both', flexWrap: 'wrap', justifyContent: 'center' }}>
          <div style={{ padding: '14px 22px', borderRadius: 16, textAlign: 'center', background: 'rgba(255,215,0,0.08)', border: '1px solid rgba(255,215,0,0.22)' }}>
            <div style={{ fontSize: 26, fontWeight: 900, color: T.gold }}>+{totalXp}</div>
            <div style={{ fontSize: 10, color: T.textMuted, fontWeight: 700, marginTop: 2 }}>XP EARNED</div>
          </div>
          <div style={{ padding: '14px 22px', borderRadius: 16, textAlign: 'center', background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.22)' }}>
            <div style={{ fontSize: 26, fontWeight: 900, color: T.purple }}>+{project.gem_reward}</div>
            <div style={{ fontSize: 10, color: T.textMuted, fontWeight: 700, marginTop: 2 }}>GEMS</div>
          </div>
          {authenticityScore !== null && (
            <div style={{ padding: '14px 22px', borderRadius: 16, textAlign: 'center', background: `${authenticityScore >= 85 ? T.green : T.amber}08`, border: `1px solid ${authenticityScore >= 85 ? T.green : T.amber}22` }}>
              <div style={{ fontSize: 26, fontWeight: 900, color: authenticityScore >= 85 ? T.green : T.amber }}>{authenticityScore}%</div>
              <div style={{ fontSize: 10, color: T.textMuted, fontWeight: 700, marginTop: 2 }}>VERIFIED</div>
            </div>
          )}
        </div>

        {bonusXp > 0 && (
          <div style={{ marginTop: 14, display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', animation: 'fadeUp 0.5s ease 0.5s both' }}>
            {adapter.noHintsUsed && <span style={{ padding: '6px 12px', borderRadius: 10, background: 'rgba(255,215,0,0.06)', border: '1px solid rgba(255,215,0,0.15)', fontSize: 11, color: T.gold, fontWeight: 700 }}>🧠 No Hints +{NO_HINT_BONUS}</span>}
            {Object.keys(adapter.aiAsksPerStep).length === 0 && <span style={{ padding: '6px 12px', borderRadius: 10, background: 'rgba(255,215,0,0.06)', border: '1px solid rgba(255,215,0,0.15)', fontSize: 11, color: T.gold, fontWeight: 700 }}>💪 Solo +{PERFECT_BONUS}</span>}
            {projectMode === 'build' && <span style={{ padding: '6px 12px', borderRadius: 10, background: 'rgba(168,85,247,0.06)', border: '1px solid rgba(168,85,247,0.15)', fontSize: 11, color: T.purple, fontWeight: 700 }}>⚡ Build Mode +{BUILD_MODE_BONUS}</span>}
          </div>
        )}
      </div>
    )
  }

  // ═════════════════════════════════════════════════════════════════════
  // MAIN RENDER
  // ═════════════════════════════════════════════════════════════════════
  return (
    <div className="overlay-slide-up" style={{ ...OVERLAY, overflowY: 'auto', overflowX: 'hidden', overscrollBehaviorY: 'contain', WebkitOverflowScrolling: 'touch' }}>
      <style>{STYLES}</style>

      {xpPopup && <XpPopup xp={xpPopup} label={xpPopupLabel} onDone={() => { setXpPopup(null); setXpPopupLabel(null) }} />}

      {shareToast && (
        <div style={{ position: 'fixed', top: 60, left: '50%', transform: 'translateX(-50%)', zIndex: 99999, padding: '10px 20px', borderRadius: 12, background: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.3)', color: T.green, fontSize: 13, fontWeight: 700, animation: 'slideIn 0.3s ease', backdropFilter: 'blur(12px)' }}>
          Link copied to clipboard!
        </div>
      )}

      {/* ─── HEADER ──────────────────────────────────────────────── */}
      <div style={{ position: 'sticky', top: 0, zIndex: 10, background: 'rgba(6,6,15,0.88)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', borderBottom: `1px solid ${T.border}`, padding: '12px 20px' }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${T.border}`, color: T.text, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: font, padding: '6px 14px', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 16 }}>←</span> Back
            </button>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
              {/* Skill type badge (non-coding) */}
              {skillType !== 'coding' && (
                <span style={{ padding: '4px 10px', borderRadius: 9999, fontSize: 10, fontWeight: 800, background: `${skillConfig.color}12`, border: `1px solid ${skillConfig.color}30`, color: skillConfig.color }}>{skillConfig.icon} {skillConfig.label}</span>
              )}
              {/* Mode badge */}
              {projectMode === 'build' && (
                <span style={{ padding: '4px 10px', borderRadius: 9999, fontSize: 10, fontWeight: 800, background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.22)', color: T.purple }}>⚡ BUILD</span>
              )}
              <span style={{ padding: '4px 10px', borderRadius: 9999, fontSize: 10, fontWeight: 800, background: `${getStepStateMeta(verificationStatus === 'verified' ? STEP_VERIFICATION_STATES.PASSED : verificationStatus === 'in_progress' ? STEP_VERIFICATION_STATES.RUNNING : STEP_VERIFICATION_STATES.NOT_STARTED).bg}`, border: `1px solid ${getStepStateMeta(verificationStatus === 'verified' ? STEP_VERIFICATION_STATES.PASSED : verificationStatus === 'in_progress' ? STEP_VERIFICATION_STATES.RUNNING : STEP_VERIFICATION_STATES.NOT_STARTED).border}`, color: getStepStateMeta(verificationStatus === 'verified' ? STEP_VERIFICATION_STATES.PASSED : verificationStatus === 'in_progress' ? STEP_VERIFICATION_STATES.RUNNING : STEP_VERIFICATION_STATES.NOT_STARTED).color }}>
                {verificationStatus === 'verified' ? '✓ VERIFIED' : verificationStatus === 'in_progress' ? 'RUNNING' : 'NOT STARTED'}
              </span>
              <span style={{ padding: '4px 10px', borderRadius: 9999, fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.8px', background: dc.bg, border: `1px solid ${dc.border}`, color: dc.color }}>{project.difficulty}</span>
              {!readOnly && (
                <span style={{ padding: '4px 10px', borderRadius: 9999, fontSize: 10, fontWeight: 800, background: 'rgba(255,215,0,0.08)', border: '1px solid rgba(255,215,0,0.22)', color: T.gold }}>
                  {xpEarned}/{steps.length * XP_PER_STEP + (project.xp_reward || 0)} XP
                </span>
              )}
            </div>
          </div>
          <div style={{ fontSize: 17, fontWeight: 900, color: T.text, letterSpacing: '-0.4px', marginBottom: 4, lineHeight: 1.3 }}>{project.title}</div>
          <div style={{ fontSize: 12, color: T.textMuted, lineHeight: 1.5, marginBottom: 10 }}>{project.description}</div>

          {/* Progress + Momentum */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ flex: 1, height: 6, borderRadius: 9999, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 9999, width: `${progressPct}%`, background: isFullyComplete ? 'linear-gradient(90deg, #FFD700, #FFA500)' : `linear-gradient(90deg, ${T.teal}, #00d4ff)`, transition: 'width 0.4s cubic-bezier(0.25,1,0.5,1)' }}/>
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: isFullyComplete ? T.gold : T.textMuted, whiteSpace: 'nowrap' }}>{completedSteps.size}/{steps.length}</span>
            {/* Momentum indicator */}
            {!readOnly && momentum > 50 && (
              <span style={{ fontSize: 9, fontWeight: 800, color: momentum > 75 ? T.teal : T.amber, padding: '2px 6px', borderRadius: 9999, background: momentum > 75 ? T.tealDim : 'rgba(245,158,11,0.08)' }}>
                {momentum > 75 ? '🔥' : '⚡'}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ─── BODY ────────────────────────────────────────────────── */}
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '20px 20px 140px' }}>
        {/* Concepts */}
        {project.concepts_tested?.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
            {project.concepts_tested.map((c, i) => <span key={i} style={{ padding: '4px 10px', borderRadius: 9999, fontSize: 10, fontWeight: 700, background: T.card, border: `1px solid ${T.border}`, color: T.textMuted }}>{c}</span>)}
          </div>
        )}

        {/* Time + Share + Authenticity */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, padding: '11px 16px', borderRadius: 14, background: T.card, border: `1px solid ${T.border}`, fontSize: 13, color: T.textMuted }}>
            <span>⏱️</span><span style={{ fontWeight: 700 }}>{project.estimated_minutes} min</span>
          </div>
          {authenticityScore !== null && <AuthenticityBadge score={authenticityScore} compact />}
          {verificationStatus === 'verified' && (
            <button onClick={shareProject} style={{ padding: '11px 16px', borderRadius: 14, border: `1px solid ${T.tealBorder}`, background: T.tealDim, color: T.teal, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: font, whiteSpace: 'nowrap' }}>🔗 Share</button>
          )}
        </div>

        {(projectBrief.final_deliverable || projectBrief.real_world_context || verificationLayers.length > 0) && (
          <div style={{ marginBottom: 24, padding: '18px 18px 16px', borderRadius: 18, background: 'linear-gradient(165deg, rgba(14,245,194,0.05), rgba(59,130,246,0.03))', border: `1px solid ${T.tealBorder}` }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
              <div style={{ fontSize: 14, fontWeight: 900, color: T.text }}>Proof of Skill</div>
              {authenticityScore !== null && <AuthenticityBadge score={authenticityScore} compact />}
            </div>
            {projectBrief.final_deliverable && (
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.9px', textTransform: 'uppercase', color: T.textMuted, marginBottom: 4 }}>Final Deliverable</div>
                <div style={{ fontSize: 13, lineHeight: 1.6, color: T.text }}>{projectBrief.final_deliverable}</div>
              </div>
            )}
            {projectBrief.real_world_context && (
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.9px', textTransform: 'uppercase', color: T.textMuted, marginBottom: 4 }}>Real-World Context</div>
                <div style={{ fontSize: 12, lineHeight: 1.6, color: '#b0b0b8' }}>{projectBrief.real_world_context}</div>
              </div>
            )}
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.9px', textTransform: 'uppercase', color: T.textMuted, marginBottom: 6 }}>Verification</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
              {verificationLayers.map((layer) => (
                <div key={layer.id} style={{ padding: '8px 10px', borderRadius: 12, background: layer.passed ? 'rgba(52,211,153,0.08)' : 'rgba(255,255,255,0.04)', border: `1px solid ${layer.passed ? 'rgba(52,211,153,0.22)' : T.border}` }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: layer.passed ? T.green : T.text }}>{layer.title}</div>
                  <div style={{ fontSize: 10, color: T.textMuted, marginTop: 2 }}>{layer.passed ? `${layer.confidence || 'verified'} confidence` : 'pending proof'}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 11, lineHeight: 1.6, color: T.textMuted }}>{projectBrief.verification_summary || proofSummary.verificationSummary}</div>
          </div>
        )}

        {/* ─── STEPS ─────────────────────────────────────────────── */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: T.text }}>Steps</div>
            {!readOnly && xpEarned > 0 && <div style={{ fontSize: 11, fontWeight: 800, color: T.gold, padding: '3px 10px', borderRadius: 9999, background: 'rgba(255,215,0,0.06)' }}>+{xpEarned} XP</div>}
          </div>

          {steps.map((step, i) => {
            const isExpanded = expandedStep === i
            const verification = getStepVerification({ step_verification: stepVerification }, step.id)
            const stepState = buildStepStatus(step, verification)
            const stateMeta = getStepStateMeta(stepState)
            const isDone = stepState === STEP_VERIFICATION_STATES.PASSED
            const priorStepsDone = i === 0 || steps.slice(0, i).every((previous) => completedSteps.has(previous.id))
            const isLocked = !readOnly && !priorStepsDone
            const isActive = !isLocked && !isDone && completedSteps.size === i
            const showHint = showHints[step.id]
            const isAiOpen = aiOpen[step.id]
            const stepMessages = aiMessages[step.id] || []
            const isAiLoading = aiLoading[step.id]
            const currentAiMode = aiMode[step.id] || 'explain'
            const adaptiveMsg = !readOnly && isActive ? adapter.getAdaptiveMessage(step.id) : null
            const isThisLastStep = isLastStep && isActive
            const cp = checkpoints[step.id]
            const requiresCode = Boolean(step.requires_code)
            const requiresResponse = Boolean(step.requires_response)
            const requiresPractice = Boolean(step.requires_practice)
            const practiceItems = step.practice_checklist || []
            const practiceSet = practiceChecks[step.id] || new Set()
            const allPracticeChecked = requiresPractice && practiceItems.length > 0 && practiceItems.every((_, idx) => practiceSet.has(idx))
            const verifyUI = VERIFICATION_UI[skillConfig.verification] || VERIFICATION_UI.written
            const verificationCards = getVerificationCards(step, verification)
            const stepFailure = stepErrors[step.id] || getStepFailureMessage(verification)
            const artifactValue = buildArtifactPayload(step, responseInputs[step.id], practiceSet, practiceReflection[step.id])
            const wordCount = countWords(artifactValue)
            const canValidateArtifact = requiresCode
              ? Boolean(verification.execution_result?.passed)
              : Boolean(artifactValue.trim())
                && (!step.min_words || wordCount >= step.min_words)
                && (!requiresPractice || allPracticeChecked)

            return (
              <div key={step.id} style={{ marginBottom: 4 }}>
                {i > 0 && <div style={{ width: 2, height: 8, marginLeft: 15, background: completedSteps.has(steps[i - 1]?.id) ? `linear-gradient(${T.teal}, ${T.teal}80)` : 'rgba(255,255,255,0.06)', transition: 'background 0.3s' }}/>}

                <div style={{
                  borderRadius: 16,
                  border: `1px solid ${isDone ? T.tealBorder : stepState === STEP_VERIFICATION_STATES.FAILED ? 'rgba(255,69,58,0.22)' : isThisLastStep ? 'rgba(255,215,0,0.25)' : isActive ? 'rgba(14,245,194,0.15)' : T.border}`,
                  background: isDone ? T.tealDim : stepState === STEP_VERIFICATION_STATES.FAILED ? 'rgba(255,69,58,0.03)' : isActive ? 'rgba(14,245,194,0.03)' : T.card,
                  overflow: 'hidden',
                  transition: 'all 0.25s',
                  ...(isThisLastStep ? { animation: 'lastStepGlow 2s ease infinite' } : isActive ? { animation: 'pulseGlow 3s ease infinite' } : {}),
                }}>
                  <div onClick={() => setExpandedStep(isExpanded ? -1 : i)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', cursor: 'pointer' }}>
                    <div style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 13,
                      fontWeight: 800,
                      background: isDone ? T.teal : isLocked ? 'rgba(255,255,255,0.03)' : isActive ? 'rgba(14,245,194,0.12)' : 'rgba(255,255,255,0.04)',
                      color: isDone ? '#000' : isLocked ? T.textMuted : isActive ? T.teal : T.textMuted,
                      border: isActive ? `2px solid ${T.tealBorder}` : 'none',
                      animation: isDone ? 'checkPop 0.3s cubic-bezier(0.34,1.56,0.64,1)' : 'none',
                    }}>
                      {isDone ? '✓' : isLocked ? '🔒' : i + 1}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: isDone ? 'rgba(255,255,255,0.6)' : T.text, textDecoration: isDone ? 'line-through' : 'none' }}>{step.title}</div>
                      {step.concepts?.length > 0 && (
                        <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
                          {step.concepts.map((concept, conceptIndex) => (
                            <span key={conceptIndex} style={{ fontSize: 9, padding: '2px 6px', borderRadius: 9999, background: 'rgba(255,255,255,0.04)', color: T.textMuted }}>{concept}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ padding: '4px 8px', borderRadius: 9999, fontSize: 9, fontWeight: 800, letterSpacing: '0.5px', background: stateMeta.bg, border: `1px solid ${stateMeta.border}`, color: stateMeta.color }}>
                        {stateMeta.short}
                      </span>
                      <span style={{ fontSize: 16, transition: 'transform 0.2s', transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)', color: T.textMuted }}>›</span>
                    </div>
                  </div>

                  {isExpanded && (
                    <div style={{ padding: '0 16px 16px', animation: 'slideIn 0.2s ease' }}>
                      {isThisLastStep && !readOnly && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 10, marginBottom: 12, marginLeft: 44, background: 'rgba(255,215,0,0.06)', border: '1px solid rgba(255,215,0,0.15)', fontSize: 11, color: T.gold, fontWeight: 700 }}>
                          🏁 Final verified step. One more proof and this project is yours.
                        </div>
                      )}

                      {adaptiveMsg && !isThisLastStep && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 10, marginBottom: 12, marginLeft: 44, background: `${adaptiveMsg.color}10`, border: `1px solid ${adaptiveMsg.color}30`, fontSize: 11, color: adaptiveMsg.color, fontWeight: 600 }}>
                          <span>{adaptiveMsg.icon}</span><span>{adaptiveMsg.text}</span>
                        </div>
                      )}

                      <div style={{ fontSize: 13, lineHeight: 1.7, color: '#b0b0b8', marginBottom: 12, paddingLeft: 44 }}>{step.description}</div>

                      <div style={{ paddingLeft: 44, display: 'grid', gridTemplateColumns: '1fr', gap: 8, marginBottom: 12 }}>
                        {step.required_output && (
                          <div style={{ padding: '10px 12px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: `1px solid ${T.border}` }}>
                            <div style={{ fontSize: 10, fontWeight: 800, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 4 }}>Required Output</div>
                            <div style={{ fontSize: 12, lineHeight: 1.6, color: T.text }}>{step.required_output}</div>
                          </div>
                        )}
                        {step.verification_focus && (
                          <div style={{ padding: '10px 12px', borderRadius: 12, background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.18)' }}>
                            <div style={{ fontSize: 10, fontWeight: 800, color: T.blue, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 4 }}>Verification Focus</div>
                            <div style={{ fontSize: 12, lineHeight: 1.6, color: '#b0b0b8' }}>{step.verification_focus}</div>
                          </div>
                        )}
                      </div>

                      <div style={{ paddingLeft: 44, display: 'grid', gridTemplateColumns: verificationCards.length > 2 ? 'repeat(2, minmax(0, 1fr))' : 'repeat(1, minmax(0, 1fr))', gap: 8, marginBottom: 12 }}>
                        {verificationCards.map((card) => {
                          const cardMeta = getStepStateMeta(card.status)
                          return (
                            <div key={card.key} style={{ padding: '10px 12px', borderRadius: 12, background: cardMeta.bg, border: `1px solid ${cardMeta.border}` }}>
                              <div style={{ fontSize: 10, fontWeight: 800, color: cardMeta.color, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 4 }}>{card.label}</div>
                              <div style={{ fontSize: 12, color: T.text }}>{cardMeta.label}</div>
                              <div style={{ fontSize: 10, color: T.textMuted, marginTop: 3, lineHeight: 1.5 }}>{card.detail}</div>
                            </div>
                          )
                        })}
                      </div>

                      {stepFailure && (
                        <div style={{ marginLeft: 44, marginBottom: 12, padding: '10px 12px', borderRadius: 12, background: 'rgba(255,69,58,0.08)', border: '1px solid rgba(255,69,58,0.2)', fontSize: 12, lineHeight: 1.6, color: '#ffb4ae' }}>
                          <div style={{ fontSize: 10, fontWeight: 800, color: T.red, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 4 }}>Why it failed</div>
                          {stepFailure}
                        </div>
                      )}

                      <div style={{ paddingLeft: 44, display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                        {step.hint && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setShowHints((prev) => ({ ...prev, [step.id]: !prev[step.id] }))
                              if (!showHint) adapter.recordHintUsed(step.id)
                            }}
                            style={{ padding: '6px 12px', borderRadius: 10, border: '1px solid rgba(245,158,11,0.22)', background: 'rgba(245,158,11,0.06)', color: T.amber, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: font }}
                          >
                            {showHint ? '🙈 Hide' : '💡 Hint'}
                          </button>
                        )}
                        {!readOnly && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setAiOpen((prev) => ({ ...prev, [step.id]: !prev[step.id] }))
                              if (!isAiOpen && stepMessages.length === 0) askAI(step.id, 'explain')
                            }}
                            style={{ padding: '6px 12px', borderRadius: 10, border: '1px solid rgba(59,130,246,0.22)', background: isAiOpen ? 'rgba(59,130,246,0.12)' : 'rgba(59,130,246,0.06)', color: T.blue, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: font }}
                          >
                            🤖 Ask AI
                          </button>
                        )}
                        {isLocked && (
                          <div style={{ padding: '6px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: `1px solid ${T.border}`, fontSize: 11, color: T.textMuted }}>
                            Finish earlier verified steps to unlock this one.
                          </div>
                        )}
                      </div>

                      {showHint && step.hint && (
                        <div style={{ marginLeft: 44, marginBottom: 12, padding: '10px 14px', borderRadius: 12, background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)', fontSize: 12, lineHeight: 1.6, color: '#d4a054' }}>
                          {step.hint}
                        </div>
                      )}

                      {requiresCode && (
                        <div style={{ marginLeft: 44, marginBottom: 12 }}>
                          <div style={{ borderRadius: 14, overflow: 'hidden', border: `1px solid ${T.border}`, background: 'rgba(0,0,0,0.28)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderBottom: `1px solid ${T.border}`, background: 'rgba(255,255,255,0.03)' }}>
                              <div>
                                <div style={{ fontSize: 11, fontWeight: 800, color: T.purple }}>Execution Workbench</div>
                                <div style={{ fontSize: 10, color: T.textMuted }}>Run, validate, review, then defend.</div>
                              </div>
                              <span style={{ padding: '3px 8px', borderRadius: 9999, fontSize: 9, fontWeight: 800, background: 'rgba(168,85,247,0.10)', border: '1px solid rgba(168,85,247,0.22)', color: T.purple }}>
                                {project.starter_language || 'code'}
                              </span>
                            </div>

                            <textarea
                              value={codeInputs[step.id] || ''}
                              readOnly={readOnly}
                              onChange={(e) => setCodeInputs((prev) => ({ ...prev, [step.id]: e.target.value }))}
                              onPaste={() => setPasteCounts((prev) => ({ ...prev, [step.id]: (prev[step.id] || 0) + 1 }))}
                              onClick={(e) => e.stopPropagation()}
                              placeholder={`Write your ${project.starter_language || 'code'} solution here...`}
                              style={{ width: '100%', minHeight: 180, padding: '14px 16px', border: 'none', background: 'transparent', color: '#c8d6e5', fontSize: 12, fontFamily: mono, lineHeight: 1.6, resize: 'vertical', outline: 'none', boxSizing: 'border-box' }}
                            />

                            {!readOnly && (
                              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', padding: '0 12px 12px' }}>
                                <button
                                  onClick={(e) => { e.stopPropagation(); runCodeStep(step.id) }}
                                  disabled={executionLoading[step.id] || !codeInputs[step.id]?.trim() || isLocked}
                                  style={{ padding: '9px 14px', borderRadius: 10, border: 'none', background: T.purple, color: '#fff', fontSize: 12, fontWeight: 800, cursor: 'pointer', fontFamily: font, opacity: executionLoading[step.id] || isLocked ? 0.5 : 1 }}
                                >
                                  {executionLoading[step.id] ? 'Running...' : '▶ Run Code'}
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); validateStepOutput(step) }}
                                  disabled={validationLoading[step.id] || !canValidateArtifact || isLocked}
                                  style={{ padding: '9px 14px', borderRadius: 10, border: 'none', background: T.teal, color: '#000', fontSize: 12, fontWeight: 800, cursor: 'pointer', fontFamily: font, opacity: validationLoading[step.id] || !canValidateArtifact || isLocked ? 0.5 : 1 }}
                                >
                                  {validationLoading[step.id] ? 'Checking...' : '✓ Validate Output'}
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); reviewCodeStep(step.id) }}
                                  disabled={reviewLoading[step.id] || !verification.validation_result?.passed || isLocked}
                                  style={{ padding: '9px 14px', borderRadius: 10, border: '1px solid rgba(255,215,0,0.22)', background: 'rgba(255,215,0,0.08)', color: T.gold, fontSize: 12, fontWeight: 800, cursor: 'pointer', fontFamily: font, opacity: reviewLoading[step.id] || !verification.validation_result?.passed || isLocked ? 0.5 : 1 }}
                                >
                                  {reviewLoading[step.id] ? 'Reviewing...' : '✨ AI Review'}
                                </button>
                              </div>
                            )}
                          </div>

                          {verification.execution_result && (
                            <div style={{ marginTop: 10, padding: '12px', borderRadius: 12, background: verification.execution_result.passed ? 'rgba(52,211,153,0.06)' : 'rgba(255,69,58,0.06)', border: `1px solid ${verification.execution_result.passed ? 'rgba(52,211,153,0.2)' : 'rgba(255,69,58,0.2)'}` }}>
                              <div style={{ fontSize: 12, fontWeight: 800, color: verification.execution_result.passed ? T.green : T.red, marginBottom: 8 }}>
                                {verification.execution_result.passed ? 'Execution passed' : 'Execution failed'}
                              </div>
                              <div style={{ display: 'grid', gap: 8 }}>
                                <div>
                                  <div style={{ fontSize: 10, fontWeight: 800, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 4 }}>Output</div>
                                  <pre style={{ margin: 0, padding: '10px 12px', borderRadius: 10, background: 'rgba(0,0,0,0.22)', fontFamily: mono, fontSize: 11, lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: '#c8d6e5' }}>{verification.execution_result.stdout || '(no stdout)'}</pre>
                                </div>
                                {verification.execution_result.stderr && (
                                  <div>
                                    <div style={{ fontSize: 10, fontWeight: 800, color: T.red, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 4 }}>Errors</div>
                                    <pre style={{ margin: 0, padding: '10px 12px', borderRadius: 10, background: 'rgba(255,69,58,0.08)', fontFamily: mono, fontSize: 11, lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: '#ffb4ae' }}>{verification.execution_result.stderr}</pre>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {verification.validation_result && (
                            <div style={{ marginTop: 10, padding: '12px', borderRadius: 12, background: verification.validation_result.passed ? 'rgba(52,211,153,0.06)' : 'rgba(245,158,11,0.06)', border: `1px solid ${verification.validation_result.passed ? 'rgba(52,211,153,0.2)' : 'rgba(245,158,11,0.2)'}` }}>
                              <div style={{ fontSize: 12, fontWeight: 800, color: verification.validation_result.passed ? T.green : T.amber, marginBottom: 8 }}>
                                {verification.validation_result.passed ? 'Validation passed' : 'Validation failed'} — {verification.validation_result.score || 0}%
                              </div>
                              {verification.validation_result.checks?.map((check, checkIndex) => (
                                <div key={check.id || checkIndex} style={{ display: 'flex', gap: 6, alignItems: 'flex-start', fontSize: 11, color: '#b0b0b8', marginBottom: 4 }}>
                                  <span style={{ color: check.passed ? T.green : T.red, flexShrink: 0 }}>{check.passed ? '✓' : '✗'}</span>
                                  <span>{check.message}</span>
                                </div>
                              ))}
                              {verification.validation_result.feedback && <div style={{ fontSize: 11, lineHeight: 1.6, color: T.textMuted, marginTop: 6 }}>{verification.validation_result.feedback}</div>}
                            </div>
                          )}

                          {verification.ai_review && (
                            <div style={{ marginTop: 10, padding: '12px', borderRadius: 12, background: verification.ai_review.passed ? 'rgba(255,215,0,0.08)' : 'rgba(255,69,58,0.06)', border: `1px solid ${verification.ai_review.passed ? 'rgba(255,215,0,0.22)' : 'rgba(255,69,58,0.2)'}` }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
                                <div style={{ fontSize: 12, fontWeight: 800, color: verification.ai_review.passed ? T.gold : T.red }}>
                                  {verification.ai_review.passed ? 'AI review passed' : 'AI review flagged issues'}
                                </div>
                                <AuthenticityBadge score={verification.ai_review.authenticity_score} compact />
                              </div>
                              <div style={{ fontSize: 12, lineHeight: 1.6, color: '#b0b0b8' }}>{verification.ai_review.feedback}</div>
                              {verification.ai_review.strengths?.length > 0 && (
                                <div style={{ marginTop: 8 }}>
                                  {verification.ai_review.strengths.map((item, itemIndex) => <div key={itemIndex} style={{ fontSize: 11, color: T.green, marginBottom: 2 }}>✓ {item}</div>)}
                                </div>
                              )}
                              {verification.ai_review.risks?.length > 0 && (
                                <div style={{ marginTop: 6 }}>
                                  {verification.ai_review.risks.map((item, itemIndex) => <div key={itemIndex} style={{ fontSize: 11, color: T.amber, marginBottom: 2 }}>→ {item}</div>)}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {(requiresResponse || requiresPractice) && (
                        <div style={{ marginLeft: 44, marginBottom: 12 }}>
                          <div style={{ padding: '12px 14px', borderRadius: 14, background: `${skillConfig.color}08`, border: `1px solid ${skillConfig.color}20` }}>
                            <div style={{ fontSize: 11, fontWeight: 800, color: skillConfig.color, marginBottom: 8 }}>{verifyUI.icon} Verified Submission</div>
                            {step.response_prompt && (
                              <div style={{ padding: '10px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: `1px solid ${T.border}`, fontSize: 12, lineHeight: 1.6, color: '#b0b0b8', marginBottom: 10 }}>
                                {step.response_prompt}
                              </div>
                            )}

                            {requiresPractice && (
                              <div style={{ marginBottom: 10 }}>
                                <div style={{ fontSize: 10, fontWeight: 800, color: T.purple, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 6 }}>Practice checklist</div>
                                <div style={{ padding: '10px 12px', borderRadius: 12, background: 'rgba(168,85,247,0.04)', border: '1px solid rgba(168,85,247,0.15)' }}>
                                  {practiceItems.map((item, itemIndex) => {
                                    const checked = practiceSet.has(itemIndex)
                                    return (
                                      <div key={itemIndex} onClick={(e) => { if (!readOnly) { e.stopPropagation(); togglePracticeCheck(step.id, itemIndex) } }} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', cursor: readOnly ? 'default' : 'pointer' }}>
                                        <div style={{ width: 20, height: 20, borderRadius: 6, flexShrink: 0, border: `1.5px solid ${checked ? T.purple : 'rgba(255,255,255,0.15)'}`, background: checked ? T.purple : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                          {checked && <span style={{ color: '#fff', fontSize: 11, fontWeight: 900 }}>✓</span>}
                                        </div>
                                        <span style={{ fontSize: 12, color: checked ? 'rgba(255,255,255,0.65)' : T.text, textDecoration: checked ? 'line-through' : 'none' }}>{item}</span>
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>
                            )}

                            <textarea
                              value={requiresPractice ? (practiceReflection[step.id] || '') : (responseInputs[step.id] || '')}
                              readOnly={readOnly}
                              onChange={(e) => {
                                const value = e.target.value
                                if (requiresPractice) setPracticeReflection((prev) => ({ ...prev, [step.id]: value }))
                                else setResponseInputs((prev) => ({ ...prev, [step.id]: value }))
                              }}
                              onClick={(e) => e.stopPropagation()}
                              placeholder={requiresPractice ? 'Describe what you practiced, what changed, and what still needs work...' : verifyUI.placeholder}
                              style={{ width: '100%', minHeight: requiresPractice ? 100 : (skillType === 'writing' || skillType === 'business' ? 150 : 110), padding: '12px', borderRadius: 12, border: `1px solid ${T.border}`, background: 'rgba(0,0,0,0.28)', color: '#c8d6e5', fontSize: 12, fontFamily: skillType === 'math' ? mono : font, lineHeight: 1.6, resize: 'vertical', outline: 'none', boxSizing: 'border-box' }}
                            />

                            {step.min_words && (
                              <div style={{ fontSize: 10, color: T.textMuted, marginTop: 4 }}>
                                {wordCount} / {step.min_words} words
                              </div>
                            )}

                            {!readOnly && (
                              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                                <button
                                  onClick={(e) => { e.stopPropagation(); validateStepOutput(step) }}
                                  disabled={validationLoading[step.id] || !canValidateArtifact || isLocked}
                                  style={{ padding: '9px 14px', borderRadius: 10, border: 'none', background: skillConfig.color, color: '#000', fontSize: 12, fontWeight: 800, cursor: 'pointer', fontFamily: font, opacity: validationLoading[step.id] || !canValidateArtifact || isLocked ? 0.5 : 1 }}
                                >
                                  {validationLoading[step.id] ? 'Evaluating...' : verifyUI.submitLabel}
                                </button>
                              </div>
                            )}
                          </div>

                          {verification.validation_result && (
                            <div style={{ marginTop: 10, padding: '12px', borderRadius: 12, background: verification.validation_result.passed ? 'rgba(52,211,153,0.06)' : 'rgba(245,158,11,0.06)', border: `1px solid ${verification.validation_result.passed ? 'rgba(52,211,153,0.2)' : 'rgba(245,158,11,0.2)'}` }}>
                              <div style={{ fontSize: 12, fontWeight: 800, color: verification.validation_result.passed ? T.green : T.amber, marginBottom: 6 }}>
                                {verification.validation_result.passed ? verifyUI.passLabel : verifyUI.failLabel} — {verification.validation_result.score || 0}%
                              </div>
                              <div style={{ fontSize: 12, lineHeight: 1.6, color: '#b0b0b8', marginBottom: 6 }}>{verification.validation_result.feedback}</div>
                              {verification.validation_result.checks?.map((item, itemIndex) => (
                                <div key={item.label || itemIndex} style={{ display: 'flex', gap: 6, fontSize: 11, color: '#b0b0b8', marginBottom: 4 }}>
                                  <span style={{ color: item.passed ? T.green : T.red }}>{item.passed ? '✓' : '✗'}</span>
                                  <span>{item.message}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      <div style={{ marginLeft: 44, marginBottom: 12, padding: '12px 14px', borderRadius: 14, background: 'rgba(255,255,255,0.03)', border: `1px solid ${T.border}` }}>
                        <div style={{ fontSize: 11, fontWeight: 800, color: T.text, marginBottom: 6 }}>Explain your solution</div>
                        <div style={{ padding: '10px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: `1px solid ${T.border}`, fontSize: 12, lineHeight: 1.6, color: '#b0b0b8', marginBottom: 10 }}>
                          {step.defense_prompt}
                        </div>
                        <textarea
                          value={defenseInputs[step.id] || ''}
                          readOnly={readOnly}
                          onChange={(e) => setDefenseInputs((prev) => ({ ...prev, [step.id]: e.target.value }))}
                          onClick={(e) => e.stopPropagation()}
                          placeholder="Explain how your work functions, why it satisfies the requirements, and what decisions you made."
                          style={{ width: '100%', minHeight: 96, padding: '12px', borderRadius: 12, border: `1px solid ${T.border}`, background: 'rgba(0,0,0,0.28)', color: '#c8d6e5', fontSize: 12, fontFamily: font, lineHeight: 1.6, resize: 'vertical', outline: 'none', boxSizing: 'border-box' }}
                        />
                        {!readOnly && (
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                            <button
                              onClick={(e) => { e.stopPropagation(); evaluateDefenseStep(step.id) }}
                              disabled={defenseLoading[step.id] || !String(defenseInputs[step.id] || '').trim() || !verification.validation_result?.passed || (requiresCode && !verification.ai_review?.passed) || isLocked}
                              style={{ padding: '9px 14px', borderRadius: 10, border: 'none', background: T.blue, color: '#fff', fontSize: 12, fontWeight: 800, cursor: 'pointer', fontFamily: font, opacity: defenseLoading[step.id] || !String(defenseInputs[step.id] || '').trim() || !verification.validation_result?.passed || (requiresCode && !verification.ai_review?.passed) || isLocked ? 0.5 : 1 }}
                            >
                              {defenseLoading[step.id] ? 'Evaluating defense...' : '🛡 Verify Understanding'}
                            </button>
                          </div>
                        )}

                        {verification.defense_result && (
                          <div style={{ marginTop: 10, padding: '12px', borderRadius: 12, background: verification.defense_result.passed ? 'rgba(52,211,153,0.06)' : 'rgba(255,69,58,0.06)', border: `1px solid ${verification.defense_result.passed ? 'rgba(52,211,153,0.2)' : 'rgba(255,69,58,0.2)'}` }}>
                            <div style={{ fontSize: 12, fontWeight: 800, color: verification.defense_result.passed ? T.green : T.red, marginBottom: 6 }}>
                              {verification.defense_result.passed ? 'Defense passed' : 'Defense needs work'} — {verification.defense_score || 0}%
                            </div>
                            <div style={{ fontSize: 12, lineHeight: 1.6, color: '#b0b0b8' }}>{verification.defense_result.feedback}</div>
                            {verification.defense_result.strengths?.length > 0 && (
                              <div style={{ marginTop: 6 }}>
                                {verification.defense_result.strengths.map((item, itemIndex) => <div key={itemIndex} style={{ fontSize: 11, color: T.green, marginBottom: 2 }}>✓ {item}</div>)}
                              </div>
                            )}
                            {verification.defense_result.gaps?.length > 0 && (
                              <div style={{ marginTop: 6 }}>
                                {verification.defense_result.gaps.map((item, itemIndex) => <div key={itemIndex} style={{ fontSize: 11, color: T.amber, marginBottom: 2 }}>→ {item}</div>)}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {isAiOpen && !readOnly && (
                        <div style={{ marginLeft: 44, borderRadius: 14, overflow: 'hidden', border: '1px solid rgba(59,130,246,0.18)', background: 'rgba(59,130,246,0.04)', animation: 'slideIn 0.25s ease' }}>
                          <div style={{ display: 'flex', borderBottom: '1px solid rgba(59,130,246,0.12)', background: 'rgba(0,0,0,0.15)' }}>
                            {AI_MODES.map((mode) => (
                              <button key={mode.id} onClick={(e) => { e.stopPropagation(); setAiMode((prev) => ({ ...prev, [step.id]: mode.id })); askAI(step.id, mode.id) }} style={{ flex: 1, padding: '8px 4px', border: 'none', background: currentAiMode === mode.id ? `${mode.color}18` : 'transparent', borderBottom: currentAiMode === mode.id ? `2px solid ${mode.color}` : '2px solid transparent', color: currentAiMode === mode.id ? mode.color : T.textMuted, fontSize: 10, fontWeight: 700, cursor: 'pointer', fontFamily: font }}>
                                {mode.icon} {mode.label}
                              </button>
                            ))}
                          </div>
                          <div style={{ maxHeight: 260, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {stepMessages.map((msg, messageIndex) => (
                              <div key={messageIndex} style={{ padding: '10px 14px', borderRadius: 12, background: msg.role === 'user' ? 'rgba(255,255,255,0.06)' : 'rgba(59,130,246,0.06)', border: msg.role === 'user' ? `1px solid ${T.border}` : '1px solid rgba(59,130,246,0.12)', fontSize: 12, lineHeight: 1.7, color: '#c0c0c8', maxWidth: '95%', alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                                {msg.role === 'assistant' && <div style={{ fontSize: 10, fontWeight: 800, color: T.blue, marginBottom: 4 }}>🤖 PathAI</div>}
                                <div>{renderMarkdown(msg.content)}</div>
                              </div>
                            ))}
                            {isAiLoading && <div style={{ padding: '10px 14px', borderRadius: 12, background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.12)', display: 'flex', alignItems: 'center', gap: 8 }}><div style={{ width: 14, height: 14, borderRadius: '50%', border: `2px solid ${T.blue}40`, borderTopColor: T.blue, animation: 'spin 0.7s linear infinite' }}/><span style={{ fontSize: 11, color: T.blue, fontWeight: 600 }}>Thinking...</span></div>}
                          </div>
                          <div style={{ display: 'flex', gap: 6, padding: '8px 12px', borderTop: '1px solid rgba(59,130,246,0.12)', background: 'rgba(0,0,0,0.1)' }}>
                            <input value={aiInput[step.id] || ''} onChange={(e) => setAiInput((prev) => ({ ...prev, [step.id]: e.target.value }))} onKeyDown={(e) => { if (e.key === 'Enter' && aiInput[step.id]?.trim()) { e.stopPropagation(); const msg = aiInput[step.id].trim(); setAiInput((prev) => ({ ...prev, [step.id]: '' })); setAiMessages((prev) => ({ ...prev, [step.id]: [...(prev[step.id] || []), { role: 'user', content: msg }] })); askAI(step.id, currentAiMode, msg) } }} onClick={(e) => e.stopPropagation()} placeholder="Ask a follow-up..." style={{ flex: 1, padding: '8px 12px', borderRadius: 10, border: `1px solid ${T.border}`, background: 'rgba(255,255,255,0.04)', color: T.text, fontSize: 12, fontFamily: font, outline: 'none' }} />
                            <button onClick={(e) => { e.stopPropagation(); if (!aiInput[step.id]?.trim()) return; const msg = aiInput[step.id].trim(); setAiInput((prev) => ({ ...prev, [step.id]: '' })); setAiMessages((prev) => ({ ...prev, [step.id]: [...(prev[step.id] || []), { role: 'user', content: msg }] })); askAI(step.id, currentAiMode, msg) }} disabled={isAiLoading} style={{ padding: '8px 14px', borderRadius: 10, border: 'none', background: T.blue, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: font, opacity: isAiLoading ? 0.5 : 1 }}>Send</button>
                          </div>
                        </div>
                      )}

                      {isDone && step.checkpoint && !readOnly && (
                        <div style={{ marginLeft: 44, marginTop: 8 }}>
                          {!cp?.show ? (
                            <button onClick={(e) => { e.stopPropagation(); generateCheckpoint(step.id) }} disabled={checkpointLoading[step.id]} style={{ padding: '8px 16px', borderRadius: 10, border: '1px solid rgba(52,211,153,0.22)', background: 'rgba(52,211,153,0.06)', color: T.green, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: font }}>
                              {checkpointLoading[step.id] ? 'Generating...' : '🧠 Understanding Check'}
                            </button>
                          ) : (
                            <div style={{ padding: '14px', borderRadius: 14, background: 'rgba(52,211,153,0.04)', border: '1px solid rgba(52,211,153,0.15)', animation: 'slideIn 0.2s ease' }}>
                              <div style={{ fontSize: 12, fontWeight: 800, color: T.green, marginBottom: 10 }}>🧠 Quick Understanding Check</div>
                              {cp.questions?.map((question) => {
                                const result = cp.results?.[question.id]
                                return (
                                  <div key={question.id} style={{ marginBottom: 12 }}>
                                    <div style={{ fontSize: 12, color: T.text, fontWeight: 600, marginBottom: 6, lineHeight: 1.5 }}>{question.question}</div>
                                    {!result ? (
                                      <div style={{ display: 'flex', gap: 6 }}>
                                        <input
                                          value={cp.answers?.[question.id] || ''}
                                          onChange={(e) => setCheckpoints((prev) => ({ ...prev, [step.id]: { ...prev[step.id], answers: { ...prev[step.id].answers, [question.id]: e.target.value } } }))}
                                          onClick={(e) => e.stopPropagation()}
                                          placeholder="Your answer..."
                                          style={{ flex: 1, padding: '8px 12px', borderRadius: 10, border: `1px solid ${T.border}`, background: 'rgba(255,255,255,0.04)', color: T.text, fontSize: 12, fontFamily: font, outline: 'none' }}
                                        />
                                        <button
                                          onClick={(e) => { e.stopPropagation(); evaluateCheckpoint(step.id, question.id, question.question, cp.answers?.[question.id], question.expected_keywords) }}
                                          disabled={!cp.answers?.[question.id]?.trim() || checkpointLoading[`${step.id}-${question.id}`]}
                                          style={{ padding: '8px 14px', borderRadius: 10, border: 'none', background: T.green, color: '#000', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: font }}
                                        >
                                          Check
                                        </button>
                                      </div>
                                    ) : (
                                      <div style={{ padding: '8px 12px', borderRadius: 10, background: result.passed ? 'rgba(52,211,153,0.08)' : 'rgba(245,158,11,0.08)', border: `1px solid ${result.passed ? 'rgba(52,211,153,0.2)' : 'rgba(245,158,11,0.2)'}`, fontSize: 11, lineHeight: 1.6, color: '#b0b0b8' }}>
                                        <span style={{ fontWeight: 800, color: result.passed ? T.green : T.amber }}>{result.passed ? '✅ Correct!' : '💡 Not quite'}</span> {result.feedback}
                                      </div>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* ─── STARTER CODE / REFERENCE MATERIAL ───────────────── */}
        {project.starter_code && (
          <div style={{ marginBottom: 24 }}>
            <button onClick={() => setShowCode(c => !c)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '14px 16px', borderRadius: 14, background: T.card, border: `1px solid ${T.border}`, color: T.text, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: font }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {getReferenceMaterialLabel(skillType)}
                {project.starter_language && <span style={{ padding: '2px 8px', borderRadius: 9999, background: 'rgba(168,85,247,0.10)', border: '1px solid rgba(168,85,247,0.22)', color: '#A855F7', fontSize: 10, fontWeight: 800, textTransform: 'uppercase' }}>{project.starter_language}</span>}
              </span>
              <span style={{ transform: showCode ? 'rotate(90deg)' : 'rotate(0)', transition: 'transform 0.2s' }}>›</span>
            </button>
            {showCode && (
              <div style={{ marginTop: 8, borderRadius: 14, overflow: 'hidden', border: `1px solid ${T.border}`, animation: 'slideIn 0.2s ease' }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderBottom: `1px solid ${T.border}` }}>
                  <button onClick={copyCode} style={{ padding: '4px 12px', borderRadius: 8, border: 'none', background: copied ? 'rgba(52,211,153,0.15)' : 'rgba(255,255,255,0.06)', color: copied ? T.green : T.textMuted, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: font }}>{copied ? '✓ Copied' : '📋 Copy'}</button>
                </div>
                <pre style={{ padding: 16, margin: 0, overflowX: 'auto', background: 'rgba(0,0,0,0.3)', fontSize: 12, lineHeight: 1.6, color: '#c8d6e5', fontFamily: mono, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{project.starter_code}</pre>
              </div>
            )}
          </div>
        )}

        {/* ─── DELIVERABLES ──────────────────────────────────────── */}
        {deliverables.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: T.text, marginBottom: 12 }}>📦 Deliverables</div>
            <div style={{ padding: '14px 16px', borderRadius: 14, background: T.card, border: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {deliverables.map((d, i) => {
                const done = completedDeliverables.has(i) || verificationStatus === 'verified'
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <div style={{ width: 20, height: 20, borderRadius: 6, flexShrink: 0, marginTop: 1, border: `1.5px solid ${done ? T.teal : 'rgba(255,255,255,0.15)'}`, background: done ? T.teal : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
                      {done && <span style={{ color: '#000', fontSize: 12, fontWeight: 900 }}>✓</span>}
                    </div>
                    <span style={{ fontSize: 13, lineHeight: 1.5, color: done ? 'rgba(255,255,255,0.55)' : T.text, textDecoration: done ? 'line-through' : 'none' }}>{d}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ─── COMPLETION ────────────────────────────────────────── */}
        {verificationStatus === 'verified' && !readOnly && (
          <div style={{ padding: '28px 24px', borderRadius: 20, textAlign: 'center', background: 'linear-gradient(165deg, rgba(14,245,194,0.08), rgba(255,215,0,0.04))', border: `1px solid ${T.tealBorder}`, marginBottom: 24, animation: 'fadeUp 0.3s ease' }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>🎉</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: T.text, marginBottom: 4 }}>Project Verified!</div>
            <div style={{ fontSize: 13, color: T.textMuted, marginBottom: 6 }}>
              <span style={{ color: T.gold, fontWeight: 800 }}>+{totalXp} XP</span> and <span style={{ color: T.purple, fontWeight: 800 }}>+{project.gem_reward} Gems</span>
            </div>
            <div style={{ fontSize: 12, color: T.textMuted, lineHeight: 1.6, marginBottom: 14 }}>
              Every step passed execution, output validation, AI review where required, and a defense explanation.
            </div>

            {bonusXp > 0 && (
              <div style={{ display: 'inline-flex', gap: 8, marginBottom: 16, padding: '6px 14px', borderRadius: 10, background: 'rgba(255,215,0,0.06)', border: '1px solid rgba(255,215,0,0.15)', flexWrap: 'wrap', justifyContent: 'center' }}>
                {adapter.noHintsUsed && <span style={{ fontSize: 11, color: T.gold, fontWeight: 700 }}>🧠 +{NO_HINT_BONUS}</span>}
                {Object.keys(adapter.aiAsksPerStep).length === 0 && <span style={{ fontSize: 11, color: T.gold, fontWeight: 700 }}>💪 +{PERFECT_BONUS}</span>}
                {projectMode === 'build' && <span style={{ fontSize: 11, color: T.purple, fontWeight: 700 }}>⚡ +{BUILD_MODE_BONUS}</span>}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              {!review && <button onClick={requestReview} disabled={reviewing} style={{ padding: '14px 24px', borderRadius: 14, border: 'none', background: reviewing ? 'rgba(255,215,0,0.15)' : 'linear-gradient(135deg, #FFD700, #FFA500)', color: reviewing ? T.gold : '#000', fontSize: 14, fontWeight: 800, cursor: reviewing ? 'default' : 'pointer', fontFamily: font, boxShadow: reviewing ? 'none' : '0 8px 24px rgba(255,215,0,0.2)' }}>{reviewing ? 'Reviewing...' : '✨ Get AI Review'}</button>}
              <button onClick={shareProject} style={{ padding: '14px 24px', borderRadius: 14, border: `1px solid ${T.tealBorder}`, background: T.tealDim, color: T.teal, fontSize: 14, fontWeight: 800, cursor: 'pointer', fontFamily: font }}>🔗 Share</button>
              <button onClick={handleComplete} disabled={completing} style={{ padding: '14px 24px', borderRadius: 14, border: 'none', background: T.teal, color: '#000', fontSize: 14, fontWeight: 800, cursor: completing ? 'default' : 'pointer', fontFamily: font, boxShadow: '0 8px 24px rgba(14,245,194,0.2)', opacity: completing ? 0.6 : 1 }}>{completing ? 'Claiming...' : 'Claim verified rewards →'}</button>
            </div>
          </div>
        )}

        {/* ─── AI REVIEW (ADVANCED) ──────────────────────────────── */}
        {review && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ borderRadius: 20, overflow: 'hidden', border: '1px solid rgba(255,215,0,0.20)', background: T.card }}>
              <div style={{ height: 3, background: 'linear-gradient(90deg, #FFD700, #FFA500, #FFD700)' }}/>
              <div style={{ padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: T.text }}>✨ AI Review</div>
                  {review.grade && <div style={{ padding: '4px 12px', borderRadius: 9999, background: 'rgba(255,215,0,0.08)', border: '1px solid rgba(255,215,0,0.22)', fontSize: 16, fontWeight: 900, color: T.gold }}>{review.grade}</div>}
                </div>

                {/* Score ring + summary */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 20 }}>
                  <div style={{ position: 'relative', width: 80, height: 80 }}>
                    <svg width="80" height="80" viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
                      <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6"/>
                      <circle cx="50" cy="50" r="45" fill="none" stroke={review.overall_score >= 90 ? T.gold : review.overall_score >= 80 ? T.teal : review.overall_score >= 60 ? T.amber : T.red} strokeWidth="6" strokeLinecap="round" strokeDasharray="283" strokeDashoffset={283 - (283 * (review.overall_score || 0)) / 100} style={{ animation: 'scoreRing 1s ease forwards' }}/>
                    </svg>
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 900, color: T.text }}>{review.overall_score}</div>
                  </div>
                  <div style={{ flex: 1, padding: '10px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: `1px solid ${T.border}`, fontSize: 13, lineHeight: 1.7, color: '#b0b0b8' }}>{review.summary}</div>
                </div>

                {/* Advanced scores */}
                {criteriaCards.length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
                    {criteriaCards.map(s => s.score ? (
                      <div key={s.label} style={{ padding: '10px', borderRadius: 12, background: T.card, border: `1px solid ${T.border}`, textAlign: 'center' }}>
                        <div style={{ fontSize: 16, marginBottom: 4 }}>{s.icon}</div>
                        <div style={{ fontSize: 16, fontWeight: 900, color: s.score >= 80 ? T.teal : s.score >= 60 ? T.amber : T.red }}>{s.score}</div>
                        <div style={{ fontSize: 9, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', marginTop: 2 }}>{s.label}</div>
                      </div>
                    ) : null)}
                  </div>
                )}

                {/* Strengths & Improvements */}
                <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
                  {review.strengths?.length > 0 && (
                    <div style={{ flex: '1 1 200px' }}>
                      <div style={{ fontSize: 12, fontWeight: 800, color: T.green, marginBottom: 8 }}>✅ Strengths</div>
                      {review.strengths.map((s, i) => <div key={i} style={{ display: 'flex', gap: 8, fontSize: 12, lineHeight: 1.6, color: '#b0b0b8', marginBottom: 6 }}><span style={{ color: T.green }}>•</span><span>{s}</span></div>)}
                    </div>
                  )}
                  {review.improvements?.length > 0 && (
                    <div style={{ flex: '1 1 200px' }}>
                      <div style={{ fontSize: 12, fontWeight: 800, color: T.amber, marginBottom: 8 }}>💡 Improvements</div>
                      {review.improvements.map((s, i) => <div key={i} style={{ display: 'flex', gap: 8, fontSize: 12, lineHeight: 1.6, color: '#b0b0b8', marginBottom: 6 }}><span style={{ color: T.amber }}>→</span><span>{s}</span></div>)}
                    </div>
                  )}
                </div>

                {/* Senior Dev Tips */}
                {review.senior_tips?.length > 0 && (
                  <div style={{ marginBottom: 14, padding: '12px 14px', borderRadius: 12, background: 'rgba(168,85,247,0.04)', border: '1px solid rgba(168,85,247,0.15)' }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: T.purple, marginBottom: 8 }}>{review._expertLabel || '👨‍💻 Expert Tips'}</div>
                    {review.senior_tips.map((tip, i) => <div key={i} style={{ display: 'flex', gap: 8, fontSize: 12, lineHeight: 1.6, color: '#b0b0b8', marginBottom: 6 }}><span style={{ color: T.purple }}>→</span><span>{tip}</span></div>)}
                  </div>
                )}

                {/* Concept Mastery */}
                {review.concept_ratings?.length > 0 && (
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: T.text, marginBottom: 10 }}>📊 Concept Mastery</div>
                    {review.concept_ratings.map((cr, i) => (
                      <div key={i} style={{ marginBottom: 10 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontSize: 12, color: T.text, fontWeight: 600 }}>{cr.concept}</span>
                          <span style={{ fontSize: 12, fontWeight: 800, color: cr.score >= 90 ? T.gold : cr.score >= 70 ? T.teal : T.amber }}>{cr.score}%</span>
                        </div>
                        <div style={{ height: 4, borderRadius: 9999, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                          <div style={{ height: '100%', borderRadius: 9999, width: `${cr.score}%`, background: cr.score >= 90 ? T.gold : cr.score >= 70 ? T.teal : T.amber, transition: 'width 0.6s ease' }}/>
                        </div>
                        {cr.feedback && <div style={{ fontSize: 11, color: T.textMuted, marginTop: 4, lineHeight: 1.5 }}>{cr.feedback}</div>}
                      </div>
                    ))}
                  </div>
                )}

                {/* Next Challenge */}
                {review.next_challenge && (
                  <div style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(168,85,247,0.04)', border: '1px solid rgba(168,85,247,0.15)', marginBottom: 14 }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: T.purple, marginBottom: 4 }}>⚡ Next Level Challenge</div>
                    <div style={{ fontSize: 12, lineHeight: 1.6, color: '#b0b0b8' }}>{review.next_challenge}</div>
                  </div>
                )}

                {/* Next steps */}
                {review.next_steps && (
                  <div style={{ padding: '12px 16px', borderRadius: 12, background: T.tealDim, border: `1px solid ${T.tealBorder}` }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: T.teal, marginBottom: 4 }}>🚀 Next Steps</div>
                    <div style={{ fontSize: 12, lineHeight: 1.6, color: '#b0b0b8' }}>{review.next_steps}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ─── AUTHENTICITY SCORE (on complete) ──────────────────── */}
        {authenticityScore !== null && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ borderRadius: 18, padding: 18, background: T.card, border: `1px solid ${T.border}` }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: T.text }}>Authenticity</div>
                <AuthenticityBadge score={authenticityScore} />
              </div>
              {authenticityResult?.summary && (
                <div style={{ fontSize: 12, lineHeight: 1.6, color: T.textMuted, marginBottom: 12 }}>{authenticityResult.summary}</div>
              )}
              {authenticityResult?.breakdown?.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  {authenticityResult.breakdown.map((item) => (
                    <div key={item.key} style={{ marginBottom: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: T.text }}>{item.label}</span>
                        <span style={{ fontSize: 11, fontWeight: 800, color: item.score >= 80 ? T.green : item.score >= 60 ? T.amber : T.red }}>{item.score}%</span>
                      </div>
                      <div style={{ height: 4, borderRadius: 9999, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                        <div style={{ width: `${item.score}%`, height: '100%', borderRadius: 9999, background: item.score >= 80 ? T.green : item.score >= 60 ? T.amber : T.red }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {authenticityResult?.positives?.length > 0 && (
                <div style={{ marginBottom: authenticityResult.flags?.length > 0 ? 10 : 0 }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: T.green, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 6 }}>Trust Signals</div>
                  {authenticityResult.positives.map((item, index) => (
                    <div key={index} style={{ display: 'flex', gap: 8, fontSize: 11, color: '#b0b0b8', marginBottom: 4 }}>
                      <span style={{ color: T.green }}>✓</span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              )}
              {authenticityResult?.flags?.length > 0 && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 800, color: T.amber, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 6 }}>Watchouts</div>
                  {authenticityResult.flags.map((item, index) => (
                    <div key={index} style={{ display: 'flex', gap: 8, fontSize: 11, color: '#b0b0b8', marginBottom: 4 }}>
                      <span style={{ color: T.amber }}>⚠</span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
