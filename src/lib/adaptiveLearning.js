import { getReviewSchedule } from '@/lib/learningEngine'

export const USER_STATES = {
  struggling: 'struggling',
  stable: 'stable',
  breezing: 'breezing',
}

export const AI_MODES = {
  teaching: 'teaching',
  hint: 'hint',
  challenge: 'challenge',
}

export const ENGAGEMENT_STATES = {
  focused: 'focused',
  bored: 'bored',
  frustrated: 'frustrated',
  neutral: 'neutral',
}

export const CONFIDENCE_LEVELS = ['low', 'medium', 'high']

export function normalizeConfidenceLevel(value) {
  const normalized = String(value || '').trim().toLowerCase()
  return CONFIDENCE_LEVELS.includes(normalized) ? normalized : 'medium'
}

export function confidenceToScore(level) {
  const normalized = normalizeConfidenceLevel(level)
  if (normalized === 'low') return 0.25
  if (normalized === 'high') return 0.9
  return 0.6
}

function clampNumber(value, min, max, fallback) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.max(min, Math.min(max, parsed))
}

function average(values, fallback = 0) {
  if (!Array.isArray(values) || values.length === 0) return fallback
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function extractTaskConcept(task, row) {
  return String(task?._concept || row?.covered_topics?.[0] || task?.title || 'General').trim()
}

function inferAccuracy(task, adaptive) {
  if (Number.isFinite(Number(adaptive?.accuracy))) {
    return clampNumber(adaptive.accuracy, 0, 100, 70)
  }
  if (Number.isFinite(Number(adaptive?.quizScore))) {
    return clampNumber(adaptive.quizScore, 0, 100, 70)
  }
  if (Number.isFinite(Number(adaptive?.challengeScore))) {
    return clampNumber(adaptive.challengeScore, 0, 100, 70)
  }
  if (adaptive?.bossDefeated === true) return 88
  if (task?.completed) return 72
  return 50
}

export function createTaskPerformanceRecord(task, payload = {}) {
  const expectedTimeSec = Math.max(60, (Number(task?.durationMin) || 15) * 60)
  const completionTimeSec = clampNumber(
    payload.completionTimeSec ?? payload.lessonTimeSec ?? 0,
    0,
    expectedTimeSec * 8,
    0,
  )
  const attempts = Math.max(1, clampNumber(payload.attempts, 1, 50, 1))
  const hintsUsed = Math.max(0, clampNumber(payload.hintsUsed, 0, 99, 0))
  const maxHints = Math.max(hintsUsed || 0, clampNumber(payload.maxHints, 0, 99, 3))
  const assistantUsageCount = Math.max(0, clampNumber(payload.assistantUsageCount, 0, 99, 0))
  const accuracy = clampNumber(
    payload.accuracy ?? payload.quizScore ?? payload.challengeScore ?? null,
    0,
    100,
    null,
  )
  const confidenceLevel = normalizeConfidenceLevel(payload.confidenceLevel)
  const helpRateBase = maxHints > 0 ? hintsUsed / maxHints : 0
  const timeRatio = completionTimeSec > 0 ? completionTimeSec / expectedTimeSec : 1
  const solvedWithoutHelp = hintsUsed === 0 && assistantUsageCount === 0
  const finalAccuracy = accuracy != null ? accuracy : inferAccuracy(task, payload)
  const misconceptionDetected = confidenceLevel === 'high' && finalAccuracy < 70
  const fragileKnowledge = confidenceLevel === 'low' && finalAccuracy >= 70
  const failureCount = Math.max(0, attempts - 1)
  const usedRecovery = failureCount >= 2 || helpRateBase > 0.66

  return {
    accuracy: finalAccuracy,
    attempts,
    failureCount,
    hintsUsed,
    maxHints,
    assistantUsageCount,
    completionTimeSec,
    expectedTimeSec,
    completionSpeedRatio: Number(timeRatio.toFixed(2)),
    confidenceLevel,
    confidenceScore: confidenceToScore(confidenceLevel),
    quizScore: clampNumber(payload.quizScore, 0, 100, null),
    challengeScore: clampNumber(payload.challengeScore, 0, 100, null),
    reflectionQuality: clampNumber(payload.reflectionQuality, 0, 100, null),
    aiInteractionDepth: clampNumber(payload.aiInteractionDepth, 0, 100, null),
    correctCount: clampNumber(payload.correctCount, 0, 999, null),
    questionCount: clampNumber(payload.questionCount, 0, 999, null),
    quizPerfect: Boolean(payload.quizPerfect),
    comboMax: clampNumber(payload.comboMax, 0, 999, 0),
    bossDefeated: Boolean(payload.bossDefeated),
    solvedWithoutHelp,
    misconceptionDetected,
    fragileKnowledge,
    usedRecovery,
  }
}

function extractAdaptiveEvent(task, row) {
  if (!task?.completed) return null
  const adaptive = task?._adaptive || {}
  const completionSpeedRatio = clampNumber(
    adaptive.completionSpeedRatio,
    0.1,
    8,
    (() => {
      const expected = Math.max(60, (Number(task?.durationMin) || 15) * 60)
      const actual = clampNumber(adaptive.completionTimeSec, 0, expected * 8, 0)
      return actual > 0 ? actual / expected : 1
    })(),
  )
  const accuracy = inferAccuracy(task, adaptive)
  const hintsUsed = clampNumber(adaptive.hintsUsed, 0, 99, 0)
  const maxHints = Math.max(hintsUsed, clampNumber(adaptive.maxHints, 0, 99, 3))
  const assistantUsageCount = clampNumber(adaptive.assistantUsageCount, 0, 99, 0)
  const attempts = Math.max(1, clampNumber(adaptive.attempts, 1, 99, 1))
  const confidenceLevel = normalizeConfidenceLevel(adaptive.confidenceLevel)

  return {
    taskId: String(task.id || ''),
    taskType: String(task.type || 'concept'),
    conceptName: extractTaskConcept(task, row),
    dayNumber: Number(row?.day_number) || 0,
    completionStatus: row?.completion_status || 'completed',
    accuracy,
    attempts,
    failureCount: Math.max(0, attempts - 1),
    hintsUsed,
    maxHints,
    helpRate: maxHints > 0 ? hintsUsed / maxHints : 0,
    assistantUsageCount,
    completionSpeedRatio,
    completionTimeSec: clampNumber(adaptive.completionTimeSec, 0, 60 * 60 * 6, 0),
    expectedTimeSec: clampNumber(adaptive.expectedTimeSec, 0, 60 * 60 * 6, 0),
    confidenceLevel,
    confidenceScore: confidenceToScore(confidenceLevel),
    misconceptionDetected: Boolean(adaptive.misconceptionDetected),
    fragileKnowledge: Boolean(adaptive.fragileKnowledge),
    usedRecovery: Boolean(adaptive.usedRecovery),
    completedAt: adaptive.completedAt || row?.task_date || null,
  }
}

export function classifyUserState({
  accuracy = 75,
  timeRatio = 1,
  attempts = 1,
  helpRate = 0,
  assistantRate = 0,
  misconceptionRate = 0,
  fragileKnowledgeRate = 0,
  consecutiveFailures = 0,
}) {
  let strugglingSignals = 0
  let breezingSignals = 0

  if (accuracy < 60) strugglingSignals += 1
  if (timeRatio > 1.5) strugglingSignals += 1
  if (attempts >= 2) strugglingSignals += 1
  if (helpRate > 0.5 || assistantRate > 0.4) strugglingSignals += 1
  if (consecutiveFailures >= 2) strugglingSignals += 1
  if (misconceptionRate > 0.18) strugglingSignals += 1

  if (accuracy >= 88) breezingSignals += 1
  if (timeRatio < 0.75) breezingSignals += 1
  if (attempts <= 1.1) breezingSignals += 1
  if (helpRate < 0.1 && assistantRate < 0.1) breezingSignals += 1
  if (fragileKnowledgeRate < 0.18 && misconceptionRate < 0.12) breezingSignals += 1

  if (strugglingSignals >= 2) return USER_STATES.struggling
  if (breezingSignals >= 3) return USER_STATES.breezing
  return USER_STATES.stable
}

export function detectEngagementState({
  accuracy = 75,
  timeRatio = 1,
  attempts = 1,
  helpRate = 0,
  interactionDepth = 0.5,
}) {
  const bored = accuracy >= 88 && timeRatio < 0.7 && helpRate < 0.05 && interactionDepth < 0.35
  if (bored) return ENGAGEMENT_STATES.bored

  const frustrated = (accuracy < 60 && attempts >= 2) || timeRatio > 1.8 || helpRate > 0.66
  if (frustrated) return ENGAGEMENT_STATES.frustrated

  if (interactionDepth >= 0.45) return ENGAGEMENT_STATES.focused
  return ENGAGEMENT_STATES.neutral
}

export function getAdaptiveAiMode({ userState, engagementState, taskType }) {
  if (engagementState === ENGAGEMENT_STATES.frustrated || userState === USER_STATES.struggling) {
    return AI_MODES.teaching
  }
  if (engagementState === ENGAGEMENT_STATES.bored || userState === USER_STATES.breezing) {
    if (['challenge', 'boss', 'project'].includes(taskType)) return AI_MODES.challenge
    return AI_MODES.hint
  }
  if (['challenge', 'boss', 'project'].includes(taskType)) return AI_MODES.challenge
  return AI_MODES.hint
}

function summarizeEvents(events = []) {
  const accuracyValues = events.map((event) => event.accuracy)
  const timeRatios = events.map((event) => event.completionSpeedRatio)
  const attempts = events.map((event) => event.attempts)
  const helpRates = events.map((event) => event.helpRate)
  const assistantRates = events.map((event) => Math.min(1, event.assistantUsageCount > 0 ? 1 : 0))
  const misconceptionRate = average(events.map((event) => event.misconceptionDetected ? 1 : 0))
  const fragileKnowledgeRate = average(events.map((event) => event.fragileKnowledge ? 1 : 0))
  const interactionDepth = 1 - average(events.map((event) => Math.min(1, event.completionSpeedRatio < 0.45 ? 1 : 0)))

  let consecutiveFailures = 0
  for (let index = events.length - 1; index >= 0; index -= 1) {
    if (events[index].accuracy < 60 || events[index].failureCount >= 1) consecutiveFailures += 1
    else break
  }

  const accuracy = average(accuracyValues, 75)
  const timeRatio = average(timeRatios, 1)
  const attemptsAvg = average(attempts, 1)
  const helpRate = average(helpRates, 0)
  const assistantRate = average(assistantRates, 0)
  const userState = classifyUserState({
    accuracy,
    timeRatio,
    attempts: attemptsAvg,
    helpRate,
    assistantRate,
    misconceptionRate,
    fragileKnowledgeRate,
    consecutiveFailures,
  })
  const engagementState = detectEngagementState({
    accuracy,
    timeRatio,
    attempts: attemptsAvg,
    helpRate,
    interactionDepth,
  })

  return {
    count: events.length,
    accuracy,
    timeRatio,
    attempts: attemptsAvg,
    helpRate,
    assistantRate,
    misconceptionRate,
    fragileKnowledgeRate,
    consecutiveFailures,
    userState,
    engagementState,
  }
}

export function buildAdaptiveProfile(taskRows = [], conceptMasteryRows = [], options = {}) {
  const targetConcept = options.targetConcept ? String(options.targetConcept).trim() : ''
  const recentWindow = Math.max(6, Number(options.recentWindow) || 12)
  const rows = Array.isArray(taskRows) ? taskRows : []
  const completedEvents = rows
    .flatMap((row) => (Array.isArray(row?.tasks) ? row.tasks.map((task) => extractAdaptiveEvent(task, row)) : []))
    .filter(Boolean)
    .sort((a, b) => {
      if (a.dayNumber !== b.dayNumber) return a.dayNumber - b.dayNumber
      return String(a.taskId).localeCompare(String(b.taskId))
    })

  const recentEvents = completedEvents.slice(-recentWindow)
  const conceptMap = new Map()

  completedEvents.forEach((event) => {
    if (!conceptMap.has(event.conceptName)) conceptMap.set(event.conceptName, [])
    conceptMap.get(event.conceptName).push(event)
  })

  const conceptSummaries = Array.from(conceptMap.entries()).map(([conceptName, events]) => {
    const summary = summarizeEvents(events.slice(-6))
    const masteryRow = (conceptMasteryRows || []).find((row) => String(row.concept_id) === conceptName)
    const masteryScore = clampNumber(masteryRow?.mastery_score, 0, 100, Math.round(summary.accuracy))
    return {
      conceptName,
      ...summary,
      masteryScore,
      reviewInterval: masteryRow?.review_interval || 1,
      lastReview: masteryRow?.last_review || null,
      needsReview: masteryScore < 65 || summary.misconceptionRate > 0.15 || summary.timeRatio > 1.5,
    }
  })

  const learnerSummary = summarizeEvents(recentEvents)
  const daysLookback = rows.slice(-7)
  const streakConsistency = daysLookback.length > 0
    ? daysLookback.filter((row) => row?.completion_status === 'completed').length / daysLookback.length
    : 0
  const preferredPace = learnerSummary.timeRatio < 0.85 && learnerSummary.accuracy >= 82
    ? 'fast'
    : learnerSummary.timeRatio > 1.2
    ? 'deep'
    : 'balanced'
  const explanationStyle = learnerSummary.userState === USER_STATES.struggling
    ? 'step_by_step'
    : learnerSummary.userState === USER_STATES.breezing
    ? 'concise'
    : 'balanced'
  const lessonLength = preferredPace === 'fast' ? 'compressed' : preferredPace === 'deep' ? 'extended' : 'normal'
  const fastTrackEligible = learnerSummary.userState === USER_STATES.breezing
    && learnerSummary.helpRate < 0.1
    && learnerSummary.assistantRate < 0.1
    && learnerSummary.accuracy >= 90
    && streakConsistency >= 0.6

  const reviewTargets = getReviewSchedule(
    (conceptMasteryRows || []).map((row) => ({
      ...row,
      conceptName: String(row.concept_id),
    })),
  ).map((row) => {
    const conceptSummary = conceptSummaries.find((entry) => entry.conceptName === row.conceptName)
    const historyPenalty = conceptSummary
      ? ((conceptSummary.misconceptionRate * 0.8) + Math.max(0, conceptSummary.timeRatio - 1) * 0.35)
      : 0
    return {
      conceptName: row.conceptName,
      masteryScore: row.mastery_score || conceptSummary?.masteryScore || 0,
      urgency: row.urgency,
      priority: Number((row.priority + historyPenalty).toFixed(2)),
      daysSinceReview: row.daysSinceReview,
      reasons: [
        row.mastery_score < 65 ? 'low_mastery' : null,
        conceptSummary?.misconceptionRate > 0.15 ? 'confidence_mismatch' : null,
        conceptSummary?.timeRatio > 1.5 ? 'slow_response' : null,
      ].filter(Boolean),
    }
  })

  reviewTargets.sort((a, b) => b.priority - a.priority)

  const targetConceptSummary = targetConcept
    ? conceptSummaries.find((entry) => entry.conceptName === targetConcept) || null
    : null

  return {
    learner: {
      ...learnerSummary,
      streakConsistency,
      preferredPace,
      explanationStyle,
      lessonLength,
      fastTrackEligible,
    },
    targetConcept: targetConceptSummary,
    conceptSummaries,
    weakConcepts: conceptSummaries
      .filter((entry) => entry.needsReview)
      .sort((a, b) => (a.masteryScore + a.accuracy) - (b.masteryScore + b.accuracy))
      .slice(0, 4),
    reviewTargets: reviewTargets.slice(0, 5),
  }
}

export function buildAdaptivePlan({ profile, conceptName, difficulty = 2, totalMinutes = 30, mode = 'goal' }) {
  const learner = profile?.learner || {}
  const concept = profile?.targetConcept?.conceptName === conceptName
    ? profile.targetConcept
    : (profile?.conceptSummaries || []).find((entry) => entry.conceptName === conceptName) || null
  const effectiveState = concept?.userState || learner.userState || USER_STATES.stable
  const engagementState = concept?.engagementState || learner.engagementState || ENGAGEMENT_STATES.neutral
  const reviewFocus = (profile?.reviewTargets || []).slice(0, 2)

  const difficultyOffset = effectiveState === USER_STATES.struggling
    ? -1
    : effectiveState === USER_STATES.breezing
    ? 1
    : 0

  const aiMode = getAdaptiveAiMode({
    userState: effectiveState,
    engagementState,
    taskType: 'concept',
  })

  const totalMinutesMultiplier = effectiveState === USER_STATES.struggling
    ? 1
    : learner.fastTrackEligible
    ? 0.85
    : 1

  const adjustedMinutes = Math.max(12, Math.round(totalMinutes * totalMinutesMultiplier))
  const conceptTaskCount = effectiveState === USER_STATES.breezing ? 1 : 2
  const shouldReviewToday = reviewFocus.length > 0 && (
    effectiveState === USER_STATES.struggling
    || reviewFocus[0]?.priority >= 1.2
  )

  return {
    state: effectiveState,
    engagementState,
    aiMode,
    difficulty: clampNumber(difficulty + difficultyOffset, 1, 5, difficulty),
    difficultyOffset,
    explanationStyle: learner.explanationStyle || 'balanced',
    pacing: learner.preferredPace || 'balanced',
    lessonLength: learner.lessonLength || 'normal',
    supportLevel: effectiveState === USER_STATES.struggling ? 'high' : effectiveState === USER_STATES.breezing ? 'light' : 'standard',
    totalMinutes: adjustedMinutes,
    conceptTaskCount,
    shouldReviewToday,
    reviewFocus,
    fastTrackEligible: Boolean(learner.fastTrackEligible && mode === 'goal'),
    condensed: learner.fastTrackEligible || adjustedMinutes < 20,
  }
}

export function buildAdaptivePromptContext(plan) {
  if (!plan) return ''
  const reviewNames = (plan.reviewFocus || []).map((entry) => entry.conceptName).filter(Boolean)
  return [
    `Adaptive learner state: ${plan.state}`,
    `AI support mode: ${plan.aiMode}`,
    `Explanation style: ${plan.explanationStyle}`,
    `Pacing: ${plan.pacing}`,
    `Lesson length: ${plan.lessonLength}`,
    `Support level: ${plan.supportLevel}`,
    plan.fastTrackEligible ? 'Fast-track is active: skip redundant scaffolding and raise challenge slightly.' : '',
    plan.shouldReviewToday && reviewNames.length > 0
      ? `Weave in quick review of weak concepts: ${reviewNames.join(', ')}.`
      : '',
    plan.state === USER_STATES.struggling
      ? 'Break tasks into smaller steps, simplify explanations, and front-load guidance.'
      : '',
    plan.state === USER_STATES.breezing
      ? 'Reduce repetition, move faster, and make examples more demanding.'
      : '',
  ].filter(Boolean).join('\n')
}

export function buildAdaptiveTaskMetadata({ taskType, plan }) {
  const normalizedType = String(taskType || 'concept')
  const aiMode = getAdaptiveAiMode({
    userState: plan?.state || USER_STATES.stable,
    engagementState: plan?.engagementState || ENGAGEMENT_STATES.neutral,
    taskType: normalizedType,
  })

  return {
    _aiMode: aiMode,
    _supportLevel: plan?.supportLevel || 'standard',
    _adaptiveState: plan?.state || USER_STATES.stable,
    _fastTrack: Boolean(plan?.fastTrackEligible),
  }
}

