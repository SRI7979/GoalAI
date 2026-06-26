import 'server-only'
import { getSupabaseServerClient } from '@/lib/supabaseServer'
import { EVENTS } from '@/lib/analytics'
import { updatePedagogicalProfileFromEvidence } from '@/lib/adaptiveEngine'

const DEFAULT_DECAY_RATE = 0.02
const MAX_EVIDENCE_LOG = 50

const COMPONENT_TYPE_BY_TASK_TYPE = {
  concept: 'concept_explainer',
  guided_practice: 'free_response',
  challenge: 'free_response',
  explain: 'free_response',
  quiz: 'multiple_choice_quiz',
  recall: 'flashcard_drill',
  reflect: 'reflection_prompt',
  boss: 'case_study_analyze',
  project: 'do_in_real_world',
  final_exam: 'mock_exam',
}

function assertServerOnly() {
  if (typeof window !== 'undefined') {
    throw new Error('learnerState is server-only and cannot be imported in the browser.')
  }
}

function serviceClient() {
  assertServerOnly()
  return getSupabaseServerClient()
}

function clamp01(value, fallback = 0) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return fallback
  return Math.max(0, Math.min(1, numeric))
}

function normalizeTimestamp(value = null) {
  const parsed = value ? new Date(value) : new Date()
  if (Number.isNaN(parsed.getTime())) return new Date().toISOString()
  return parsed.toISOString()
}

export function createDefaultPedagogicalProfile() {
  return {
    optimalSessionMinutes: 15,
    prefersVisual: true,
    difficultyPreference: 'balanced',
    strugglesWith: [],
    motivationDrivers: [],
  }
}

function normalizePedagogicalProfile(profile = {}) {
  const defaults = createDefaultPedagogicalProfile()
  return {
    optimalSessionMinutes: Number.isFinite(Number(profile?.optimalSessionMinutes))
      ? Math.max(1, Math.round(Number(profile.optimalSessionMinutes)))
      : defaults.optimalSessionMinutes,
    prefersVisual: typeof profile?.prefersVisual === 'boolean'
      ? profile.prefersVisual
      : defaults.prefersVisual,
    difficultyPreference: ['easier', 'balanced', 'harder'].includes(profile?.difficultyPreference)
      ? profile.difficultyPreference
      : defaults.difficultyPreference,
    strugglesWith: Array.isArray(profile?.strugglesWith) ? profile.strugglesWith.map(String) : defaults.strugglesWith,
    motivationDrivers: Array.isArray(profile?.motivationDrivers) ? profile.motivationDrivers.map(String) : defaults.motivationDrivers,
  }
}

export function conceptIdFromLabel(label) {
  return String(label || '')
    .trim()
    .toLowerCase()
    .replace(/[''"]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_{2,}/g, '_')
}

function appendUniqueConceptId(ids, value) {
  if (Array.isArray(value)) {
    value.forEach((entry) => appendUniqueConceptId(ids, entry))
    return
  }

  if (value && typeof value === 'object') {
    appendUniqueConceptId(ids, value.id || value.conceptId || value.label || value.title || value.name)
    return
  }

  const id = conceptIdFromLabel(value)
  if (id && !ids.includes(id)) ids.push(id)
}

export function deriveConceptIdsFromTask(task = {}, row = {}) {
  const ids = []
  appendUniqueConceptId(ids, task.conceptIds)
  appendUniqueConceptId(ids, task.concept_ids)
  appendUniqueConceptId(ids, task.concepts)
  appendUniqueConceptId(ids, task.taughtPoints)
  appendUniqueConceptId(ids, task.taught_points)
  appendUniqueConceptId(ids, task.concepts_tested)
  appendUniqueConceptId(ids, task._concept)
  appendUniqueConceptId(ids, task.concept)
  appendUniqueConceptId(ids, task.primaryConcept)
  appendUniqueConceptId(ids, row.covered_topics)
  if (ids.length === 0) appendUniqueConceptId(ids, task.title)
  return ids.slice(0, 12)
}

function confidenceFromLevel(level, fallback = 0.65) {
  const normalized = String(level || '').trim().toLowerCase()
  if (normalized === 'high') return 0.9
  if (normalized === 'medium') return 0.65
  if (normalized === 'low') return 0.35
  return fallback
}

function inferCorrectSignal(metrics = {}) {
  if (typeof metrics.correct === 'boolean') return metrics.correct
  if (typeof metrics.quizPerfect === 'boolean' && metrics.quizPerfect) return true
  if (metrics.bossDefeated === true) return true

  const accuracySource = metrics.accuracy ?? metrics.quizScore ?? metrics.challengeScore
  const accuracy = Number(accuracySource)
  if (Number.isFinite(accuracy)) return accuracy >= 70

  const correctCount = Number(metrics.correctCount)
  const questionCount = Number(metrics.questionCount)
  if (Number.isFinite(correctCount) && Number.isFinite(questionCount) && questionCount > 0) {
    return correctCount / questionCount >= 0.7
  }

  const openEndedSignals = [
    metrics.reflectionQuality,
    metrics.aiInteractionDepth,
    metrics.takeaway,
    metrics.proofSubmission,
    metrics.proofResult,
  ]
  if (openEndedSignals.some((value) => value !== null && value !== undefined && String(value).trim() !== '')) {
    return null
  }

  return true
}

function inferConfidence(metrics = {}, correct = null) {
  const explicit = Number(metrics.confidence)
  if (Number.isFinite(explicit)) return clamp01(explicit)

  const accuracySource = metrics.accuracy ?? metrics.quizScore ?? metrics.challengeScore
  const accuracy = Number(accuracySource)
  if (Number.isFinite(accuracy)) return clamp01(accuracy / 100)

  const fromLevel = confidenceFromLevel(metrics.confidenceLevel, null)
  if (fromLevel !== null) return fromLevel

  if (correct === true) return 0.8
  if (correct === false) return 0.3
  return 0.6
}

function normalizeComponentType(value) {
  const normalized = String(value || '').trim().toLowerCase()
  return COMPONENT_TYPE_BY_TASK_TYPE[normalized] || normalized || 'free_response'
}

export function buildEvidenceEventFromTask({ task = {}, row = {}, canonicalTaskType = null, metrics = {} } = {}) {
  const componentType = normalizeComponentType(canonicalTaskType || task.componentType || task.type)
  const conceptIds = deriveConceptIdsFromTask(task, row)
  const correct = inferCorrectSignal(metrics)
  const confidence = inferConfidence(metrics, correct)
  const completionTimeSec = Number(metrics.completionTimeSec ?? metrics.lessonTimeSec ?? 0)
  const totalMs = Number.isFinite(completionTimeSec) ? Math.max(0, Math.round(completionTimeSec * 1000)) : 0
  const hintsUsed = Number.isFinite(Number(metrics.hintsUsed)) ? Math.max(0, Math.round(Number(metrics.hintsUsed))) : 0
  const attempts = Number.isFinite(Number(metrics.attempts)) ? Math.max(1, Math.round(Number(metrics.attempts))) : 1

  return {
    timestamp: normalizeTimestamp(metrics.completedAt),
    componentType,
    conceptIds,
    signal: {
      componentType,
      conceptIds,
      correct,
      confidence,
      hesitationMs: Number.isFinite(Number(metrics.hesitationMs)) ? Math.max(0, Math.round(Number(metrics.hesitationMs))) : 0,
      totalMs,
      hintsUsed,
      attempts,
      rawResponse: {
        taskId: task.id ?? null,
        taskTitle: task.title ?? null,
        accuracy: metrics.accuracy ?? metrics.quizScore ?? null,
        correctCount: metrics.correctCount ?? null,
        questionCount: metrics.questionCount ?? null,
        confidenceLevel: metrics.confidenceLevel ?? null,
        challengeScore: metrics.challengeScore ?? null,
        reflectionQuality: metrics.reflectionQuality ?? null,
        aiInteractionDepth: metrics.aiInteractionDepth ?? null,
        proofSubmission: metrics.proofSubmission ?? null,
        proofResult: metrics.proofResult ?? null,
        takeaway: metrics.takeaway ?? null,
      },
    },
  }
}

function normalizeStateRow(row, fallback = {}) {
  return {
    user_id: row?.user_id || fallback.user_id,
    goal_id: row?.goal_id || fallback.goal_id,
    knowledge: row?.knowledge && typeof row.knowledge === 'object' && !Array.isArray(row.knowledge)
      ? row.knowledge
      : {},
    pedagogicalProfile: normalizePedagogicalProfile(row?.pedagogical_profile || row?.pedagogicalProfile),
    updatedAt: normalizeTimestamp(row?.updated_at || row?.updatedAt),
  }
}

function createEmptyState(userId, goalId) {
  return normalizeStateRow(null, {
    user_id: userId,
    goal_id: goalId,
    pedagogicalProfile: createDefaultPedagogicalProfile(),
  })
}

export async function getLearnerState(userId, goalId) {
  assertServerOnly()

  if (!userId || !goalId) {
    throw new Error('getLearnerState requires userId and goalId.')
  }

  const supabase = serviceClient()
  const { data, error } = await supabase
    .from('learner_state')
    .select('user_id,goal_id,knowledge,pedagogical_profile,updated_at')
    .eq('user_id', userId)
    .eq('goal_id', goalId)
    .maybeSingle()

  if (error) throw new Error(`Failed to read learner state: ${error.message}`)
  if (!data) return createEmptyState(userId, goalId)
  return normalizeStateRow(data, { user_id: userId, goal_id: goalId })
}

function normalizeEvidenceEvent(event = {}) {
  const componentType = normalizeComponentType(event.componentType || event.signal?.componentType)
  const conceptIds = Array.isArray(event.conceptIds) ? event.conceptIds.map(conceptIdFromLabel).filter(Boolean) : []
  const signalConceptIds = Array.isArray(event.signal?.conceptIds)
    ? event.signal.conceptIds.map(conceptIdFromLabel).filter(Boolean)
    : []
  const mergedConceptIds = [...conceptIds, ...signalConceptIds].filter((id, index, all) => id && all.indexOf(id) === index)
  const correct = typeof event.signal?.correct === 'boolean' || event.signal?.correct === null
    ? event.signal.correct
    : true
  const confidence = clamp01(event.signal?.confidence, correct === true ? 0.8 : correct === false ? 0.3 : 0.6)

  return {
    timestamp: normalizeTimestamp(event.timestamp),
    componentType,
    conceptIds: mergedConceptIds,
    signal: {
      ...(event.signal || {}),
      componentType,
      conceptIds: mergedConceptIds,
      correct,
      confidence,
      hesitationMs: Math.max(0, Math.round(Number(event.signal?.hesitationMs) || 0)),
      totalMs: Math.max(0, Math.round(Number(event.signal?.totalMs) || 0)),
      hintsUsed: Math.max(0, Math.round(Number(event.signal?.hintsUsed) || 0)),
      attempts: Math.max(1, Math.round(Number(event.signal?.attempts) || 1)),
    },
  }
}

function defaultConceptMastery() {
  return {
    mastery: 0,
    confidence: 0,
    lastPracticed: null,
    decayRate: DEFAULT_DECAY_RATE,
    misconceptions: [],
    evidenceLog: [],
  }
}

function updateMasteryValue(currentMastery, signal, weight) {
  // v1 mastery model -- tuned later in P7.
  // Correct answers move 30% toward mastery, incorrect answers decay to 60%,
  // and open-ended evidence nudges toward learner/inferred confidence.
  const mastery = clamp01(currentMastery)
  let target

  if (signal.correct === true) {
    target = mastery + (1 - mastery) * 0.3
  } else if (signal.correct === false) {
    target = mastery * 0.6
  } else {
    target = mastery + (signal.confidence - mastery) * 0.2
  }

  return clamp01(mastery + ((target - mastery) * weight))
}

async function trackLearnerStateServer({ supabase, eventName, userId, goalId, properties }) {
  try {
    await supabase.from('analytics_events').insert({
      event_name: eventName,
      user_id: userId,
      goal_id: goalId,
      properties,
      client_timestamp: new Date().toISOString(),
    })
  } catch {
    // Learner state telemetry should never affect completion writes.
  }
}

export async function applyEvidence(state, event) {
  assertServerOnly()

  const normalizedState = normalizeStateRow(state, {
    user_id: state?.user_id,
    goal_id: state?.goal_id,
  })
  if (!normalizedState.user_id || !normalizedState.goal_id) {
    throw new Error('applyEvidence requires a LearnerState with user_id and goal_id.')
  }

  const normalizedEvent = normalizeEvidenceEvent(event)
  const now = new Date().toISOString()
  const knowledge = { ...normalizedState.knowledge }

  normalizedEvent.conceptIds.forEach((conceptId, index) => {
    const weight = index === 0 ? 1 : 0.5
    const existing = {
      ...defaultConceptMastery(),
      ...(knowledge[conceptId] || {}),
    }
    const evidenceLog = Array.isArray(existing.evidenceLog) ? existing.evidenceLog : []
    knowledge[conceptId] = {
      mastery: updateMasteryValue(existing.mastery, normalizedEvent.signal, weight),
      confidence: normalizedEvent.signal.confidence,
      lastPracticed: now,
      decayRate: Number.isFinite(Number(existing.decayRate)) ? Number(existing.decayRate) : DEFAULT_DECAY_RATE,
      misconceptions: Array.isArray(existing.misconceptions) ? existing.misconceptions : [],
      evidenceLog: [...evidenceLog, normalizedEvent].slice(-MAX_EVIDENCE_LOG),
    }
  })

  const updatedState = {
    ...normalizedState,
    knowledge,
    pedagogicalProfile: normalizePedagogicalProfile(
      updatePedagogicalProfileFromEvidence(normalizedState.pedagogicalProfile, normalizedEvent),
    ),
    updatedAt: now,
  }

  const supabase = serviceClient()
  const { error } = await supabase
    .from('learner_state')
    .upsert({
      user_id: updatedState.user_id,
      goal_id: updatedState.goal_id,
      knowledge: updatedState.knowledge,
      pedagogical_profile: updatedState.pedagogicalProfile,
      updated_at: updatedState.updatedAt,
    }, { onConflict: 'user_id,goal_id' })

  if (error) throw new Error(`Failed to persist learner state: ${error.message}`)

  const touched = normalizedEvent.conceptIds.length
  const avgMastery = touched > 0
    ? normalizedEvent.conceptIds.reduce((sum, id) => sum + (Number(updatedState.knowledge[id]?.mastery) || 0), 0) / touched
    : 0

  await trackLearnerStateServer({
    supabase,
    eventName: EVENTS.LEARNER_STATE_UPDATED,
    userId: updatedState.user_id,
    goalId: updatedState.goal_id,
    properties: {
      user_id: updatedState.user_id,
      goal_id: updatedState.goal_id,
      concepts_touched: touched,
      avg_mastery_after: avgMastery,
      difficulty_preference: updatedState.pedagogicalProfile.difficultyPreference,
      optimal_session_minutes: updatedState.pedagogicalProfile.optimalSessionMinutes,
    },
  })

  return updatedState
}

export async function persistPendingEvidence({ userId, goalId, event, error, source = 'applyEvidence' } = {}) {
  assertServerOnly()

  if (!userId || !goalId || !event) return

  const failureReason = String(error?.code || error?.message || error || 'unknown evidence write failure').slice(0, 500)
  let supabase
  try {
    supabase = serviceClient()
  } catch {
    return
  }

  try {
    await supabase.from('pending_evidence').insert({
      user_id: userId,
      goal_id: goalId,
      event,
      failure_reason: failureReason,
      source,
      status: 'pending',
    })
  } catch {
    // Completion must still succeed. If this insert fails, telemetry below is
    // the remaining recovery breadcrumb.
  }

  await trackLearnerStateServer({
    supabase,
    eventName: EVENTS.LEARNER_STATE_WRITE_FAILED,
    userId,
    goalId,
    properties: {
      user_id: userId,
      goal_id: goalId,
      failure_reason: failureReason,
      source,
      concepts_touched: Array.isArray(event?.conceptIds) ? event.conceptIds.length : 0,
    },
  })
}
