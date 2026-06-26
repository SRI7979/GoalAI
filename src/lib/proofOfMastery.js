import 'server-only'
import { EVENTS } from '@/lib/analytics'
import { getOpenAIModel } from '@/lib/openaiModels'
import { applyEvidence, conceptIdFromLabel, getLearnerState } from '@/lib/learnerState'
import {
  PROOF_EVALUATION_RESPONSE_FORMAT,
  PROOF_TARGET_RESPONSE_FORMAT,
  buildProofEvaluationPrompt,
  buildProofTargetPrompt,
} from '@/lib/prompts/proofTarget_v1'

export const PROOF_EVALUATION_TYPES = new Set([
  'artifact_submission',
  'timed_mock_exam',
  'live_conversation',
  'photo_video_proof',
  'novel_application',
  'ranked_performance',
  'streak_maintained',
])

const MODE_TO_EVALUATION = {
  skill_build: 'artifact_submission',
  knowledge_mastery: 'novel_application',
  exam_prep: 'timed_mock_exam',
  language: 'live_conversation',
  procedural: 'photo_video_proof',
  conceptual: 'novel_application',
  performance: 'ranked_performance',
  habit: 'streak_maintained',
}

const EVALUATION_COMPONENT = {
  artifact_submission: 'do_in_real_world',
  timed_mock_exam: 'mock_exam',
  live_conversation: 'roleplay_scenario',
  photo_video_proof: 'do_in_real_world',
  novel_application: 'case_study_analyze',
  ranked_performance: 'do_in_real_world',
  streak_maintained: 'reflection_prompt',
}

function assertServerOnly() {
  if (typeof window !== 'undefined') {
    throw new Error('proofOfMastery is server-only and cannot be imported in the browser.')
  }
}

function clamp(value, min, max, fallback) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return fallback
  return Math.max(min, Math.min(max, numeric))
}

function cleanText(value, fallback = '') {
  return String(value || fallback).trim().replace(/\s+/g, ' ')
}

function getDecomposition(goal = {}) {
  return goal.decomposition && typeof goal.decomposition === 'object' ? goal.decomposition : {}
}

function getMode(goal = {}) {
  const decomposition = getDecomposition(goal)
  return goal.primaryMode || goal.primary_mode || decomposition.primaryMode || 'skill_build'
}

function getGoalText(goal = {}) {
  const decomposition = getDecomposition(goal)
  return cleanText(goal.goal_text || goal.goalText || decomposition.cleanedGoalText, 'your goal')
}

function getTopConcepts(goal = {}) {
  const decomposition = getDecomposition(goal)
  const concepts = decomposition.topLevelConcepts || goal.topLevelConcepts || []
  return concepts.map((entry) => cleanText(entry?.label || entry)).filter(Boolean).slice(0, 8)
}

function defaultRubric(evaluationType) {
  const base = {
    artifact_submission: [
      ['artifact_quality', 'Working artifact', 'The submitted artifact runs or can be inspected and solves the promised problem.', 35],
      ['concept_coverage', 'Concept coverage', 'The work demonstrates the core concepts taught in the goal.', 25],
      ['independence', 'Independent explanation', 'The learner can explain major implementation choices and tradeoffs.', 25],
      ['polish', 'Portfolio polish', 'The result is documented, organized, and presentable.', 15],
    ],
    timed_mock_exam: [
      ['score', 'Score threshold', 'The learner reaches the target score under realistic timing.', 45],
      ['coverage', 'Topic coverage', 'Performance is not concentrated in only one easy subsection.', 25],
      ['review', 'Error review', 'The learner can explain misses and corrections.', 30],
    ],
    live_conversation: [
      ['communication', 'Communication', 'The learner can complete the target exchange without relying on translation.', 40],
      ['accuracy', 'Accuracy', 'Grammar, vocabulary, or signing choices are accurate enough for the level.', 30],
      ['repair', 'Repair strategies', 'The learner can recover when they miss a word or prompt.', 30],
    ],
    photo_video_proof: [
      ['execution', 'Execution', 'The learner performs the procedure safely and correctly.', 45],
      ['process', 'Process evidence', 'The submission shows the key steps, not just the end result.', 30],
      ['reflection', 'Reflection', 'The learner explains what worked and what they would adjust.', 25],
    ],
    novel_application: [
      ['transfer', 'Novel transfer', 'The learner applies the concept to a new situation not copied from practice.', 40],
      ['reasoning', 'Reasoning', 'The explanation shows why the solution or argument works.', 35],
      ['clarity', 'Clarity', 'The response is organized and understandable.', 25],
    ],
    ranked_performance: [
      ['performance', 'Performance result', 'The learner achieves the target performance outcome or rating marker.', 45],
      ['strategy', 'Strategy explanation', 'The learner explains choices, tactics, or adjustments.', 30],
      ['review', 'Post-run review', 'The learner identifies what improved and what remains weak.', 25],
    ],
    streak_maintained: [
      ['consistency', 'Consistency', 'The learner maintains the required streak or schedule.', 45],
      ['quality', 'Quality of practice', 'Sessions include deliberate practice, not just check-ins.', 30],
      ['reflection', 'Reflection', 'The learner can name patterns and adjustments from the streak.', 25],
    ],
  }[evaluationType] || []

  return base.map(([id, label, description, weight]) => ({
    id,
    label,
    description,
    weight,
    passLevel: 75,
  }))
}

export function buildFallbackProofTarget(goal = {}, error = null) {
  assertServerOnly()
  const mode = getMode(goal)
  const evaluationType = MODE_TO_EVALUATION[mode] || 'novel_application'
  const goalText = getGoalText(goal)
  const concepts = getTopConcepts(goal)
  const conceptPhrase = concepts.length ? concepts.slice(0, 4).join(', ') : 'the core concepts in this goal'

  const descriptions = {
    artifact_submission: `Ship a working artifact for "${goalText}" that someone else can open, run, or inspect. For the coding beachhead, this means a portfolio-ready project with a live URL or repository plus a short explanation of how it works.`,
    timed_mock_exam: `Pass a realistic timed assessment for "${goalText}" and review the mistakes clearly enough to show the score reflects understanding, not luck.`,
    live_conversation: `Complete a live or transcript-based exchange using "${goalText}" in a realistic scenario, then explain any corrections or recovery moments.`,
    photo_video_proof: `Submit photo/video or written process evidence showing you can perform "${goalText}" safely and repeatably in the real world.`,
    novel_application: `Apply "${goalText}" to a new problem or scenario and explain the reasoning clearly enough that the transfer is visible.`,
    ranked_performance: `Submit a performance result for "${goalText}" plus a short review explaining strategy, mistakes, and improvement evidence.`,
    streak_maintained: `Maintain the target habit for the required streak and submit reflections showing the habit became repeatable, not accidental.`,
  }

  return {
    mode,
    description: descriptions[evaluationType],
    evaluationType,
    passCriteria: [
      `Evidence directly demonstrates ${conceptPhrase}.`,
      'The submission is specific enough to verify, not a vague claim of completion.',
      'The learner explains key choices, mistakes, or tradeoffs in their own words.',
      'The result meets the pass level on the rubric.',
    ],
    rubric: defaultRubric(evaluationType),
    generationStatus: error ? 'pending_retry' : 'ok',
    generationFailureReason: error ? String(error?.message || error).slice(0, 500) : null,
  }
}

function normalizeRubricItem(item = {}, index = 0, fallback = {}) {
  return {
    id: cleanText(item.id, fallback.id || `criterion_${index + 1}`).replace(/[^a-z0-9_-]/gi, '_').toLowerCase(),
    label: cleanText(item.label, fallback.label || `Criterion ${index + 1}`).slice(0, 80),
    description: cleanText(item.description, fallback.description || '').slice(0, 240),
    weight: Math.round(clamp(item.weight, 1, 100, fallback.weight || 25)),
    passLevel: Math.round(clamp(item.passLevel ?? item.pass_level, 1, 100, fallback.passLevel || 75)),
  }
}

export function normalizeProofTarget(payload = {}, goal = {}, fallbackError = null) {
  assertServerOnly()
  const fallback = buildFallbackProofTarget(goal, fallbackError)
  const mode = getMode(goal)
  const evaluationType = PROOF_EVALUATION_TYPES.has(payload.evaluationType)
    ? payload.evaluationType
    : PROOF_EVALUATION_TYPES.has(payload.evaluation_type)
      ? payload.evaluation_type
      : fallback.evaluationType
  const fallbackRubric = defaultRubric(evaluationType)
  const rubric = Array.isArray(payload.rubric)
    ? payload.rubric.map((item, index) => normalizeRubricItem(item, index, fallbackRubric[index])).slice(0, 5)
    : fallback.rubric

  return {
    mode: cleanText(payload.mode, mode),
    description: cleanText(payload.description, fallback.description).slice(0, 600),
    evaluationType,
    passCriteria: Array.isArray(payload.passCriteria || payload.pass_criteria)
      ? (payload.passCriteria || payload.pass_criteria).map((entry) => cleanText(entry)).filter(Boolean).slice(0, 6)
      : fallback.passCriteria,
    rubric: rubric.length >= 3 ? rubric : fallback.rubric,
    generationStatus: payload.generationStatus || payload.generation_status || fallback.generationStatus || 'ok',
    generationFailureReason: payload.generationFailureReason || payload.generation_failure_reason || fallback.generationFailureReason || null,
  }
}

async function requestProofTarget(goal) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return null
  const decomposition = getDecomposition(goal)
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: getOpenAIModel('proofTarget'),
      max_completion_tokens: 1200,
      response_format: PROOF_TARGET_RESPONSE_FORMAT,
      messages: [
        { role: 'system', content: 'You output valid JSON only. No markdown.' },
        { role: 'user', content: buildProofTargetPrompt({ goal, decomposition }) },
      ],
    }),
    signal: AbortSignal.timeout(8000),
  })
  if (!response.ok) return null
  const data = await response.json().catch(() => null)
  const content = data?.choices?.[0]?.message?.content
  return content ? JSON.parse(content) : null
}

export async function generateProofTarget(goal = {}) {
  assertServerOnly()
  try {
    const generated = await requestProofTarget(goal)
    if (!generated) return buildFallbackProofTarget(goal)
    return normalizeProofTarget({ ...generated, generationStatus: 'ok' }, goal)
  } catch (error) {
    return buildFallbackProofTarget(goal, error)
  }
}

function normalizeScore(value, fallback = 0) {
  return Math.round(clamp(value, 0, 100, fallback))
}

function fallbackEvaluate(proofTarget = {}, submission = {}) {
  const text = JSON.stringify(submission || {})
  const evidenceFields = ['artifactUrl', 'repoUrl', 'liveUrl', 'score', 'transcript', 'reflection', 'description', 'fileUrl']
  const evidenceScore = evidenceFields.reduce((sum, field) => sum + (submission?.[field] ? 1 : 0), 0)
  const descriptionDepth = Math.min(25, Math.floor(text.length / 80))
  const base = Math.min(82, 38 + evidenceScore * 12 + descriptionDepth)
  const rubric = Array.isArray(proofTarget.rubric) ? proofTarget.rubric : defaultRubric(proofTarget.evaluationType)
  return {
    passed: base >= 75,
    score: base,
    feedback: base >= 75
      ? 'The submission includes enough concrete evidence to satisfy the v1 proof target.'
      : 'The submission needs more concrete evidence before PathAI can mark the goal proven.',
    rubricResults: rubric.map((item) => ({
      id: item.id,
      score: base,
      passed: base >= (Number(item.passLevel) || 75),
      feedback: base >= 75 ? 'Evidence is present for this criterion.' : 'Add more specific proof for this criterion.',
    })),
    strengths: evidenceScore > 0 ? ['Concrete proof fields were provided.'] : [],
    gaps: base >= 75 ? [] : ['Add a live artifact, repository, score, transcript, or deeper explanation.'],
    nextSteps: base >= 75 ? ['Keep this proof in your portfolio.'] : ['Submit stronger evidence and explain what it demonstrates.'],
    fallback: true,
  }
}

function normalizeEvaluation(payload = {}, proofTarget = {}, fallback = null) {
  const fallbackEval = fallback || fallbackEvaluate(proofTarget, {})
  const score = normalizeScore(payload.score, fallbackEval.score)
  const rubric = Array.isArray(proofTarget.rubric) ? proofTarget.rubric : []
  const rubricResults = Array.isArray(payload.rubricResults || payload.rubric_results)
    ? (payload.rubricResults || payload.rubric_results).map((item, index) => ({
      id: cleanText(item.id, rubric[index]?.id || `criterion_${index + 1}`),
      score: normalizeScore(item.score, score),
      passed: Boolean(item.passed) && normalizeScore(item.score, score) >= (Number(rubric[index]?.passLevel) || 75),
      feedback: cleanText(item.feedback, '').slice(0, 240),
    })).slice(0, 5)
    : fallbackEval.rubricResults

  return {
    passed: Boolean(payload.passed) && score >= 75,
    score,
    feedback: cleanText(payload.feedback, fallbackEval.feedback).slice(0, 700),
    rubricResults,
    strengths: Array.isArray(payload.strengths) ? payload.strengths.map(cleanText).filter(Boolean).slice(0, 5) : fallbackEval.strengths,
    gaps: Array.isArray(payload.gaps) ? payload.gaps.map(cleanText).filter(Boolean).slice(0, 5) : fallbackEval.gaps,
    nextSteps: Array.isArray(payload.nextSteps || payload.next_steps)
      ? (payload.nextSteps || payload.next_steps).map(cleanText).filter(Boolean).slice(0, 5)
      : fallbackEval.nextSteps,
    evaluatedAt: new Date().toISOString(),
    aiModelUsed: getOpenAIModel('proofEvaluator'),
    fallback: Boolean(payload.fallback || fallbackEval.fallback),
  }
}

async function requestProofEvaluation({ goal, proofTarget, submission }) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return null
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: getOpenAIModel('proofEvaluator'),
      max_completion_tokens: 1000,
      response_format: PROOF_EVALUATION_RESPONSE_FORMAT,
      messages: [
        { role: 'system', content: 'You output valid JSON only. No markdown.' },
        { role: 'user', content: buildProofEvaluationPrompt({ goal, proofTarget, submission }) },
      ],
    }),
    signal: AbortSignal.timeout(12000),
  })
  if (!response.ok) return null
  const data = await response.json().catch(() => null)
  const content = data?.choices?.[0]?.message?.content
  return content ? JSON.parse(content) : null
}

export async function evaluateProofSubmission({ goal = {}, proofTarget = {}, submission = {} } = {}) {
  assertServerOnly()
  const fallback = fallbackEvaluate(proofTarget, submission)
  try {
    const generated = await requestProofEvaluation({ goal, proofTarget, submission })
    if (!generated) return normalizeEvaluation({ ...fallback, fallback: true }, proofTarget, fallback)
    return normalizeEvaluation(generated, proofTarget, fallback)
  } catch {
    return normalizeEvaluation({ ...fallback, fallback: true }, proofTarget, fallback)
  }
}

function conceptIdsForProof(goal = {}, topicGraph = null) {
  const graphNodes = Array.isArray(topicGraph?.nodes) ? topicGraph.nodes : []
  if (graphNodes.length) return graphNodes.map((node) => node.id).filter(Boolean).slice(0, 12)
  const concepts = getTopConcepts(goal)
  if (concepts.length) return concepts.map(conceptIdFromLabel).filter(Boolean).slice(0, 12)
  return [conceptIdFromLabel(getGoalText(goal)) || 'proof_of_mastery']
}

export async function applyProofEvidence({ userId, goal, topicGraph = null, proofTarget, evaluation } = {}) {
  assertServerOnly()
  if (!userId || !goal?.id) return null
  const conceptIds = conceptIdsForProof(goal, topicGraph)
  const componentType = EVALUATION_COMPONENT[proofTarget?.evaluationType] || 'do_in_real_world'
  let state = await getLearnerState(userId, goal.id)
  state = await applyEvidence(state, {
    timestamp: new Date().toISOString(),
    componentType,
    conceptIds,
    signal: {
      componentType,
      conceptIds,
      correct: evaluation?.passed === true,
      confidence: clamp((Number(evaluation?.score) || 0) / 100, 0, 1, evaluation?.passed ? 0.85 : 0.35),
      hesitationMs: 0,
      totalMs: 0,
      hintsUsed: 0,
      attempts: 1,
      rawResponse: {
        source: 'proof_of_mastery',
        score: evaluation?.score || 0,
        passed: evaluation?.passed === true,
        evaluationType: proofTarget?.evaluationType || null,
      },
    },
  })
  return state
}

export async function trackProofEvent({ supabase, eventName, userId, goalId, properties = {} }) {
  if (!supabase) return
  try {
    await supabase.from('analytics_events').insert({
      event_name: eventName,
      user_id: userId,
      goal_id: goalId,
      properties,
      client_timestamp: new Date().toISOString(),
    })
  } catch {
    // Proof telemetry should never block user progress.
  }
}

export function proofStatusFromEvaluation(evaluation = {}) {
  if (evaluation.passed) return 'passed'
  if (Number(evaluation.score) >= 50) return 'needs_revision'
  return 'failed'
}

export const PROOF_EVENTS = {
  TARGET_GENERATED: EVENTS.PROOF_TARGET_GENERATED,
  SUBMITTED: EVENTS.PROOF_SUBMITTED,
  EVALUATED: EVENTS.PROOF_EVALUATED,
  COMPLETED: EVENTS.PROOF_COMPLETED,
}
