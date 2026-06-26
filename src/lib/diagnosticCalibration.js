import 'server-only'
import { EVENTS } from '@/lib/analytics'
import { getOpenAIModel } from '@/lib/openaiModels'
import { applyEvidence, conceptIdFromLabel, getLearnerState } from '@/lib/learnerState'
import {
  DIAGNOSTIC_CALIBRATION_RESPONSE_FORMAT,
  buildDiagnosticCalibrationPrompt,
} from '@/lib/prompts/diagnosticCalibration_v1'

const DEFAULT_COUNT = 4
const MAX_QUESTIONS = 4

function assertServerOnly() {
  if (typeof window !== 'undefined') {
    throw new Error('diagnosticCalibration is server-only and cannot be imported in the browser.')
  }
}

function clamp(value, min, max, fallback) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return fallback
  return Math.max(min, Math.min(max, numeric))
}

function normalizeText(value, fallback = '') {
  return String(value || fallback).trim().replace(/\s+/g, ' ')
}

function labelFromConceptId(conceptId = '') {
  return normalizeText(String(conceptId).replace(/_/g, ' '), 'this concept')
}

function getGoalText(goal = {}) {
  return normalizeText(goal.goal_text || goal.goalText || goal.decomposition?.cleanedGoalText, 'your goal')
}

function getDecompositionConcepts(goal = {}) {
  const raw = goal?.decomposition?.topLevelConcepts || goal?.topLevelConcepts || []
  return raw.map((entry, index) => {
    const label = normalizeText(entry?.label || entry?.title || entry, `Concept ${index + 1}`)
    return {
      id: conceptIdFromLabel(label) || `concept_${index + 1}`,
      label,
      difficulty: clamp(entry?.difficulty, 0, 1, 0.35 + index * 0.15),
    }
  })
}

export function selectDiagnosticConcepts({ goal = {}, topicGraph = null, count = DEFAULT_COUNT } = {}) {
  assertServerOnly()
  const requested = Math.max(1, Math.min(MAX_QUESTIONS, Math.round(Number(count) || DEFAULT_COUNT)))
  const nodes = Array.isArray(topicGraph?.nodes) ? topicGraph.nodes : []
  const edges = Array.isArray(topicGraph?.edges) ? topicGraph.edges : []
  const incomingPrereqs = new Set(edges.filter((edge) => edge.type === 'prerequisite').map((edge) => edge.to))

  const graphConcepts = nodes
    .map((node) => ({
      id: node.id,
      label: normalizeText(node.label || node.id, labelFromConceptId(node.id)),
      difficulty: clamp(node.difficulty, 0, 1, 0.5),
      root: !incomingPrereqs.has(node.id),
    }))
    .sort((left, right) => {
      if (left.root !== right.root) return left.root ? -1 : 1
      if (left.difficulty !== right.difficulty) return left.difficulty - right.difficulty
      return left.label.localeCompare(right.label)
    })

  const fallback = getDecompositionConcepts(goal)
  const concepts = graphConcepts.length ? graphConcepts : fallback
  if (concepts.length) return concepts.slice(0, requested)

  const label = getGoalText(goal)
  return [{ id: conceptIdFromLabel(label) || 'current_goal', label, difficulty: 0.35 }]
}

function buildFallbackQuestion(concept, index) {
  const label = normalizeText(concept?.label, labelFromConceptId(concept?.id))
  const conceptId = concept?.id || conceptIdFromLabel(label) || `concept_${index + 1}`
  return {
    id: `diagnostic_${conceptId}_${index + 1}`.replace(/[^a-z0-9_-]/gi, '_').toLowerCase(),
    conceptId,
    prompt: `Which statement best shows you already understand ${label}?`,
    options: [
      `I can define ${label} and recognize when it appears.`,
      `I have heard the term ${label}, but cannot use it yet.`,
      `I can only guess based on the words in the name.`,
    ],
    correctIndex: 0,
    difficulty: clamp(concept?.difficulty, 0, 1, 0.35),
    explanation: `This checks whether ${label} is already usable knowledge or should be taught from the beginning.`,
  }
}

function normalizeQuestion(raw = {}, conceptMap, fallbackConcept, index) {
  const requestedConceptId = conceptIdFromLabel(raw.conceptId || raw.concept_id)
  const concept = conceptMap.get(requestedConceptId) || fallbackConcept
  const fallback = buildFallbackQuestion(concept, index)
  const options = Array.isArray(raw.options)
    ? raw.options.map((option) => normalizeText(option)).filter(Boolean).slice(0, 4)
    : []
  const correctIndex = Math.round(Number(raw.correctIndex ?? raw.correct_index))

  if (options.length < 2 || !Number.isFinite(correctIndex) || correctIndex < 0 || correctIndex >= options.length) {
    return fallback
  }

  return {
    id: normalizeText(raw.id, fallback.id).replace(/[^a-z0-9_-]/gi, '_').toLowerCase(),
    conceptId: concept.id,
    prompt: normalizeText(raw.prompt, fallback.prompt).slice(0, 220),
    options,
    correctIndex,
    difficulty: clamp(raw.difficulty, 0, 1, concept.difficulty ?? 0.5),
    explanation: normalizeText(raw.explanation, fallback.explanation).slice(0, 240),
  }
}

function normalizeDiagnosticPayload(payload = {}, concepts = []) {
  const conceptMap = new Map(concepts.map((concept) => [concept.id, concept]))
  const rawQuestions = Array.isArray(payload.questions) ? payload.questions : []
  const normalized = rawQuestions
    .slice(0, MAX_QUESTIONS)
    .map((question, index) => normalizeQuestion(question, conceptMap, concepts[index % concepts.length], index))
    .filter((question) => question.prompt && question.options.length >= 2)

  const fallbacks = concepts.map(buildFallbackQuestion)
  return {
    version: 'diagnostic_calibration_v1',
    source: normalized.length >= Math.min(3, concepts.length) ? 'ai' : 'fallback',
    questions: (normalized.length ? normalized : fallbacks).slice(0, MAX_QUESTIONS),
  }
}

async function requestAiDiagnostic({ goal, concepts, learnerState, learnerProfile, count }) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return null

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: getOpenAIModel('onboardingQuestions'),
      max_completion_tokens: 1100,
      response_format: DIAGNOSTIC_CALIBRATION_RESPONSE_FORMAT,
      messages: [
        { role: 'system', content: 'You output schema-valid JSON only. No markdown.' },
        {
          role: 'user',
          content: buildDiagnosticCalibrationPrompt({
            goalText: getGoalText(goal),
            concepts,
            learnerProfile: {
              ...(learnerProfile || {}),
              pedagogicalProfile: learnerState?.pedagogicalProfile || null,
            },
            count,
          }),
        },
      ],
    }),
    signal: AbortSignal.timeout(4500),
  })

  if (!response.ok) return null
  const data = await response.json().catch(() => null)
  const content = data?.choices?.[0]?.message?.content
  if (!content) return null
  return JSON.parse(content)
}

export async function buildDiagnosticQuestions({
  goal = {},
  topicGraph = null,
  learnerState = null,
  learnerProfile = {},
  count = DEFAULT_COUNT,
} = {}) {
  assertServerOnly()
  const concepts = selectDiagnosticConcepts({ goal, topicGraph, count })
  const generated = await requestAiDiagnostic({
    goal,
    concepts,
    learnerState,
    learnerProfile,
    count: Math.min(MAX_QUESTIONS, concepts.length || count),
  }).catch(() => null)

  const diagnostic = normalizeDiagnosticPayload(generated || {}, concepts)
  return {
    id: `diagnostic_${Date.now()}`,
    goalId: goal?.id || goal?.goal_id || null,
    source: diagnostic.source,
    version: diagnostic.version,
    questions: diagnostic.questions,
    estimatedMinutes: Math.max(2, diagnostic.questions.length),
  }
}

function normalizeResponseMap(responses) {
  if (Array.isArray(responses)) {
    return responses.reduce((map, response) => {
      if (response?.questionId) map[response.questionId] = response
      return map
    }, {})
  }
  return responses && typeof responses === 'object' ? responses : {}
}

function buildSignalFromQuestion(question, response = {}) {
  const selectedIndex = Number.isFinite(Number(response.selectedIndex))
    ? Math.round(Number(response.selectedIndex))
    : question.options.findIndex((option) => option === response.selectedOption || option === response.label)
  const correct = selectedIndex === question.correctIndex
  return {
    componentType: 'multiple_choice_quiz',
    conceptIds: [question.conceptId],
    correct,
    confidence: correct ? 0.78 : 0.28,
    hesitationMs: Math.max(0, Math.round(Number(response.hesitationMs) || 0)),
    totalMs: Math.max(0, Math.round(Number(response.totalMs) || 0)),
    hintsUsed: 0,
    attempts: 1,
    rawResponse: {
      source: 'diagnostic_calibration',
      questionId: question.id,
      prompt: question.prompt,
      selectedIndex,
      selectedOption: question.options[selectedIndex] || response.selectedOption || null,
      correctIndex: question.correctIndex,
      explanation: question.explanation,
    },
  }
}

export function buildDiagnosticEvidenceEvents({ diagnostic = {}, responses = {} } = {}) {
  assertServerOnly()
  const responseMap = normalizeResponseMap(responses)
  return (diagnostic.questions || [])
    .map((question) => {
      const response = responseMap[question.id]
      if (!response) return null
      const signal = buildSignalFromQuestion(question, response)
      return {
        timestamp: new Date().toISOString(),
        componentType: 'multiple_choice_quiz',
        conceptIds: [question.conceptId],
        signal,
      }
    })
    .filter(Boolean)
}

function confidenceFromOnboardingScore(score) {
  const numeric = clamp(score, 0, 2, 1)
  if (numeric >= 2) return 0.78
  if (numeric >= 1) return 0.56
  return 0.28
}

function correctFromOnboardingScore(score) {
  const numeric = clamp(score, 0, 2, 1)
  if (numeric >= 2) return true
  if (numeric <= 0) return false
  return null
}

function profileHintsFromLearnerProfile(profile = {}) {
  const minutes = profile.pace === 'intensive' ? 25 : profile.pace === 'relaxed' ? 12 : 15
  return {
    optimalSessionMinutes: minutes,
    prefersVisual: profile.learningStyle === 'visual' || profile.visualPreference === 'visual',
    difficultyPreference: profile.prereqComfort === 'test_out' ? 'harder' : profile.prereqComfort === 'full' ? 'easier' : 'balanced',
    motivationDrivers: [profile.desiredOutcome, profile.pathStyle].filter(Boolean),
  }
}

export function buildOnboardingCalibrationEvents({
  goal = {},
  topicGraph = null,
  calibration = {},
  answers = {},
  learnerProfile = {},
  diagnosticScore = null,
  recommendedLevel = null,
} = {}) {
  assertServerOnly()
  const concepts = selectDiagnosticConcepts({
    goal,
    topicGraph,
    count: Math.max(3, Object.keys(answers || {}).length || 3),
  })
  const questions = Array.isArray(calibration.questions) ? calibration.questions : []
  const profileHints = profileHintsFromLearnerProfile(learnerProfile)

  return questions
    .map((question, index) => {
      const answer = answers?.[question.id]
      if (!answer) return null
      const concept = concepts[index % concepts.length]
      const score = clamp(answer.score, 0, 2, 1)
      return {
        timestamp: new Date().toISOString(),
        componentType: 'multiple_choice_quiz',
        conceptIds: [concept.id],
        signal: {
          componentType: 'multiple_choice_quiz',
          conceptIds: [concept.id],
          correct: correctFromOnboardingScore(score),
          confidence: confidenceFromOnboardingScore(score),
          hesitationMs: 0,
          totalMs: 0,
          hintsUsed: 0,
          attempts: 1,
          rawResponse: {
            source: 'onboarding_calibration',
            questionId: question.id,
            prompt: question.prompt,
            selectedOption: answer.label || null,
            score,
            diagnosticScore,
            recommendedLevel,
            calibrationProfile: index === 0 ? profileHints : null,
          },
        },
      }
    })
    .filter(Boolean)
}

async function trackDiagnosticEvent({ supabase, eventName, userId, goalId, properties = {} }) {
  try {
    await supabase.from('analytics_events').insert({
      event_name: eventName,
      user_id: userId,
      goal_id: goalId,
      properties,
      client_timestamp: new Date().toISOString(),
    })
  } catch {
    // Diagnostics should never block onboarding or recalibration.
  }
}

export async function applyDiagnosticEvents({ supabase, userId, goalId, events = [], source = 'diagnostic' } = {}) {
  assertServerOnly()
  if (!userId || !goalId) throw new Error('applyDiagnosticEvents requires userId and goalId.')

  let state = await getLearnerState(userId, goalId)
  for (const event of events) {
    state = await applyEvidence(state, event)
  }

  await trackDiagnosticEvent({
    supabase,
    eventName: EVENTS.DIAGNOSTIC_CALIBRATED,
    userId,
    goalId,
    properties: {
      source,
      question_count: events.length,
      concepts_touched: [...new Set(events.flatMap((event) => event.conceptIds || []))],
      avg_mastery_after: events.length
        ? events.reduce((sum, event) => sum + (state.knowledge?.[event.conceptIds?.[0]]?.mastery || 0), 0) / events.length
        : 0,
    },
  })

  return state
}
