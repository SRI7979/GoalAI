import 'server-only'
import { EVENTS } from '@/lib/analytics'
import {
  buildFallbackComponentParams,
  validateGeneratedParams,
} from '@/lib/componentGenerator'

const HARD_COMPONENTS = new Set([
  'multiple_choice_quiz',
  'code_predictor',
  'code_sandbox',
  'code_debugger',
  'image_identify',
  'drag_match',
  'timed_problem_set',
  'mock_exam',
])

const SUPPORT_COMPONENTS = new Set([
  'concept_explainer',
  'worked_example',
  'flashcard_drill',
  'reflection_prompt',
  'free_response',
  'concept_map_build',
])

function clamp01(value, fallback = 0) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return fallback
  return Math.max(0, Math.min(1, numeric))
}

function clampNumber(value, min, max, fallback) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return fallback
  return Math.max(min, Math.min(max, numeric))
}

function conceptLabel(conceptId = '') {
  return String(conceptId || 'the current concept')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim() || 'the current concept'
}

function normalizeConceptIds(value) {
  return Array.isArray(value) ? value.map(String).filter(Boolean) : []
}

export function scoreComponentSignal(signal = {}) {
  const confidence = clamp01(signal.confidence, 0.6)
  const attempts = Math.max(1, Math.round(Number(signal.attempts) || 1))
  const hintsUsed = Math.max(0, Math.round(Number(signal.hintsUsed) || 0))
  const hesitationMs = Math.max(0, Math.round(Number(signal.hesitationMs) || 0))
  const totalMs = Math.max(0, Math.round(Number(signal.totalMs) || 0))

  let score = signal.correct === true ? 0.78 : signal.correct === false ? 0.18 : confidence
  score += (confidence - 0.5) * 0.25
  score -= Math.min(0.18, Math.max(0, attempts - 1) * 0.08)
  score -= Math.min(0.16, hintsUsed * 0.05)
  if (hesitationMs > 20000) score -= 0.05
  if (totalMs > 8 * 60 * 1000) score -= 0.04

  const normalized = clamp01(score, 0.5)
  return {
    score: normalized,
    confidence,
    attempts,
    hintsUsed,
    hesitationMs,
    totalMs,
    state: normalized < 0.45 ? 'struggling' : normalized > 0.82 ? 'accelerating' : 'stable',
  }
}

function collectRecentSignals(learnerState = {}, conceptIds = []) {
  const knowledge = learnerState?.knowledge || {}
  const ids = conceptIds.length ? conceptIds : Object.keys(knowledge)
  return ids
    .flatMap((id) => {
      const log = Array.isArray(knowledge[id]?.evidenceLog) ? knowledge[id].evidenceLog : []
      return log.slice(-5).map((event) => event?.signal).filter(Boolean)
    })
    .slice(-12)
}

export function classifyLearnerMoment({ learnerState = {}, conceptIds = [] } = {}) {
  const signals = collectRecentSignals(learnerState, conceptIds)
  if (!signals.length) {
    return { state: 'stable', score: 0.6, reason: 'no_recent_signal' }
  }

  const scored = signals.map(scoreComponentSignal)
  const avg = scored.reduce((sum, entry) => sum + entry.score, 0) / scored.length
  const lowCount = scored.filter((entry) => entry.state === 'struggling').length
  const highCount = scored.filter((entry) => entry.state === 'accelerating').length
  if (lowCount >= 2 || avg < 0.48) {
    return { state: 'struggling', score: avg, reason: 'recent_low_signal' }
  }
  if (highCount >= 2 && avg > 0.78) {
    return { state: 'accelerating', score: avg, reason: 'recent_strong_signal' }
  }
  return { state: 'stable', score: avg, reason: 'mixed_recent_signal' }
}

function adjustMix(componentMix = {}, multipliers = {}) {
  return Object.fromEntries(Object.entries(componentMix).map(([type, weight]) => [
    type,
    Number((Math.max(0, Number(weight) || 0) * (multipliers[type] || 1)).toFixed(4)),
  ]))
}

export function buildAdaptiveMissionPlan({ recipe = {}, learnerState = {}, targetConcepts = [], dayNumber = 1 } = {}) {
  const conceptIds = targetConcepts.map((concept) => concept?.id).filter(Boolean)
  const moment = classifyLearnerMoment({ learnerState, conceptIds })
  const baseMix = recipe.componentMix || {}
  const baseMinutes = Number(recipe.lengthTargetMinutes) || 15
  const profilePreference = learnerState?.pedagogicalProfile?.difficultyPreference || 'balanced'

  if (moment.state === 'struggling' || profilePreference === 'easier') {
    return {
      state: 'struggling',
      reason: moment.reason,
      score: moment.score,
      adjustments: ['more_scaffolding', 'shorter_session', 'fewer_hard_components'],
      recipe: {
        ...recipe,
        lengthTargetMinutes: Math.max(10, baseMinutes - 2),
        componentMix: adjustMix(baseMix, {
          concept_explainer: 1.35,
          worked_example: 1.3,
          flashcard_drill: 1.2,
          reflection_prompt: 1.18,
          free_response: 1.1,
          multiple_choice_quiz: 0.78,
          code_predictor: 0.82,
          code_sandbox: 0.72,
          code_debugger: 0.72,
          timed_problem_set: 0.7,
          mock_exam: 0.65,
        }),
      },
    }
  }

  if (moment.state === 'accelerating' || profilePreference === 'harder') {
    return {
      state: 'accelerating',
      reason: moment.reason,
      score: moment.score,
      adjustments: ['more_challenge', 'slightly_longer_session'],
      recipe: {
        ...recipe,
        lengthTargetMinutes: Math.min(22, baseMinutes + 2),
        componentMix: adjustMix(baseMix, {
          code_sandbox: 1.28,
          code_debugger: 1.22,
          timed_problem_set: 1.22,
          mock_exam: 1.18,
          case_study_analyze: 1.16,
          free_response: 1.12,
          concept_explainer: 0.86,
          flashcard_drill: 0.9,
        }),
      },
    }
  }

  return {
    state: 'stable',
    reason: moment.reason,
    score: moment.score,
    adjustments: [],
    recipe,
  }
}

function buildRecoveryParams(componentType, conceptId, score) {
  const label = conceptLabel(conceptId)
  if (componentType === 'worked_example') {
    return {
      problem: `Reset with a small example of ${label}.`,
      steps: [
        `Name the exact idea: ${label}.`,
        'Show one tiny case where it appears.',
        'Explain why the answer follows from that idea.',
      ],
      answer: `A clear, small example that uses ${label} correctly.`,
      whyItWorks: `This recovery step slows the idea down because the last signal looked shaky (${Math.round(score * 100)}%).`,
    }
  }

  return {
    title: `Quick reset: ${label}`,
    paragraphs: [
      `Pause on ${label} before moving on. The last response suggests this idea needs one more pass.`,
      `Focus on the smallest useful version: what ${label} means, when it shows up, and what decision it helps you make.`,
    ],
    keyTakeaway: `If ${label} feels fuzzy, explain it in one sentence before trying the next harder task.`,
  }
}

function pickRecoveryType(triggerComponentType) {
  if (HARD_COMPONENTS.has(triggerComponentType)) return 'worked_example'
  return 'concept_explainer'
}

function hasRecoveryAfter(components = [], componentIndex) {
  const next = components[componentIndex + 1]
  return next?.adaptive?.loop === 'within_lesson'
    && next?.adaptive?.action === 'recovery_insert'
    && Number(next?.adaptive?.parentPosition) === componentIndex
}

export function buildWithinLessonDecision({ mission = {}, componentIndex = 0, signal = {}, learnerState = {} } = {}) {
  const components = Array.isArray(mission.components) ? mission.components : []
  const component = components[componentIndex] || {}
  const scored = scoreComponentSignal(signal)
  const conceptIds = normalizeConceptIds(signal.conceptIds?.length ? signal.conceptIds : component.conceptIds)
  const conceptId = conceptIds[0] || mission.conceptsTargeted?.[0] || mission.concepts_targeted?.[0] || 'current_concept'

  if (scored.state !== 'struggling') {
    return {
      loop: 'within_lesson',
      action: 'continue',
      state: scored.state,
      reason: scored.state === 'accelerating' ? 'strong_signal_continue' : 'signal_in_range',
      score: scored.score,
      conceptIds,
    }
  }

  if (hasRecoveryAfter(components, componentIndex)) {
    return {
      loop: 'within_lesson',
      action: 'continue',
      state: 'struggling',
      reason: 'recovery_already_inserted',
      score: scored.score,
      conceptIds,
    }
  }

  const componentType = pickRecoveryType(component.componentType)
  let params = buildRecoveryParams(componentType, conceptId, scored.score)
  const validation = validateGeneratedParams(componentType, params)
  if (!validation.ok) {
    params = buildFallbackComponentParams(componentType, { id: conceptId, label: conceptLabel(conceptId) })
  }

  return {
    loop: 'within_lesson',
    action: 'insert_component',
    state: 'struggling',
    reason: 'low_signal_recovery',
    score: scored.score,
    conceptIds: [conceptId],
    component: {
      componentType,
      conceptIds: [conceptId],
      params,
      adaptive: {
        loop: 'within_lesson',
        action: 'recovery_insert',
        parentPosition: componentIndex,
        triggerComponentType: component.componentType || signal.componentType || null,
        triggerScore: Number(scored.score.toFixed(3)),
      },
    },
  }
}

export function insertAdaptiveComponent(components = [], componentIndex = 0, adaptiveComponent = null) {
  if (!adaptiveComponent) return components
  if (hasRecoveryAfter(components, componentIndex)) return components
  const next = [
    ...components.slice(0, componentIndex + 1),
    adaptiveComponent,
    ...components.slice(componentIndex + 1),
  ]
  return next.map((component, index) => ({ ...component, position: index }))
}

export function updatePedagogicalProfileFromEvidence(profile = {}, event = {}) {
  const signal = event?.signal || {}
  const scored = scoreComponentSignal(signal)
  const calibrationProfile = signal?.rawResponse?.calibrationProfile || null
  const currentMinutes = clampNumber(profile.optimalSessionMinutes, 8, 30, 15)
  const conceptIds = normalizeConceptIds(event.conceptIds?.length ? event.conceptIds : signal.conceptIds)
  const existingStruggles = Array.isArray(profile.strugglesWith) ? profile.strugglesWith.map(String) : []
  let strugglesWith = existingStruggles
  let difficultyPreference = profile.difficultyPreference || 'balanced'
  let optimalSessionMinutes = currentMinutes
  let prefersVisual = typeof profile.prefersVisual === 'boolean' ? profile.prefersVisual : true
  let motivationDrivers = Array.isArray(profile.motivationDrivers) ? profile.motivationDrivers.slice(0, 12) : []

  if (calibrationProfile && typeof calibrationProfile === 'object') {
    if (Number.isFinite(Number(calibrationProfile.optimalSessionMinutes))) {
      optimalSessionMinutes = clampNumber(calibrationProfile.optimalSessionMinutes, 8, 30, currentMinutes)
    }
    if (typeof calibrationProfile.prefersVisual === 'boolean') {
      prefersVisual = calibrationProfile.prefersVisual
    }
    if (['easier', 'balanced', 'harder'].includes(calibrationProfile.difficultyPreference)) {
      difficultyPreference = calibrationProfile.difficultyPreference
    }
    if (Array.isArray(calibrationProfile.motivationDrivers)) {
      motivationDrivers = calibrationProfile.motivationDrivers.map(String).filter(Boolean).slice(0, 12)
    }
  }

  if (scored.state === 'struggling') {
    strugglesWith = [...conceptIds.map(conceptLabel), ...existingStruggles]
      .filter((value, index, all) => value && all.indexOf(value) === index)
      .slice(0, 12)
    difficultyPreference = 'easier'
    optimalSessionMinutes = Math.max(8, currentMinutes - 1)
  } else if (scored.state === 'accelerating') {
    const mastered = new Set(conceptIds.map(conceptLabel))
    strugglesWith = existingStruggles.filter((value) => !mastered.has(value)).slice(0, 12)
    difficultyPreference = 'harder'
    optimalSessionMinutes = Math.min(25, currentMinutes + 1)
  } else {
    difficultyPreference = 'balanced'
    strugglesWith = existingStruggles.slice(0, 12)
  }

  return {
    ...profile,
    optimalSessionMinutes,
    prefersVisual,
    difficultyPreference,
    strugglesWith,
    motivationDrivers,
  }
}

export async function trackAdaptiveDecision({ supabase, userId, goalId, missionId = null, decision = {}, properties = {} }) {
  if (!supabase || !userId || !goalId) return
  try {
    await supabase.from('analytics_events').insert({
      event_name: EVENTS.ADAPTIVE_DECISION_MADE,
      user_id: userId,
      goal_id: goalId,
      mission_id: missionId,
      properties: {
        loop: decision.loop || null,
        action: decision.action || null,
        state: decision.state || null,
        reason: decision.reason || null,
        score: Number.isFinite(Number(decision.score)) ? Number(decision.score) : null,
        concept_ids: normalizeConceptIds(decision.conceptIds),
        ...properties,
      },
      client_timestamp: new Date().toISOString(),
    })
  } catch {
    // Adaptive telemetry must never affect mission progress.
  }
}
