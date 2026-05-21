import { getOpenAIModel } from '@/lib/openaiModels'
import {
  GOAL_DECOMPOSER_RESPONSE_FORMAT,
  LEARNING_MODES,
  buildGoalDecomposerPrompt,
} from '@/lib/prompts/goalDecomposer_v1'

const LEARNING_MODE_SET = new Set(LEARNING_MODES)

function buildGoalDecomposerError(code, message) {
  const error = new Error(message)
  error.code = code
  return error
}

function clamp(value, min, max, fallback) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return fallback
  return Math.max(min, Math.min(max, numeric))
}

function normalizeStringArray(values = []) {
  if (!Array.isArray(values)) return []
  return values
    .map((value) => String(value || '').trim())
    .filter(Boolean)
}

function normalizeSecondaryModes(values, primaryMode) {
  const unique = new Set()
  normalizeStringArray(values).forEach((mode) => {
    if (LEARNING_MODE_SET.has(mode) && mode !== primaryMode) unique.add(mode)
  })
  return Array.from(unique)
}

function normalizeReasoning(value = '') {
  const reasoning = String(value || '').trim()
  if (!reasoning) {
    throw buildGoalDecomposerError('invalid_reasoning', 'Goal decomposition is missing reasoning.')
  }
  return reasoning
}

function getExpectedConceptRange(estimatedDays) {
  if (estimatedDays <= 7) return [5, 5]
  if (estimatedDays <= 30) return [6, 8]
  if (estimatedDays <= 90) return [9, 12]
  return [13, 15]
}

function normalizeTopLevelConcepts(values = [], estimatedDays) {
  const concepts = normalizeStringArray(values)
  const unique = Array.from(new Set(concepts))
  if (unique.length < 5 || unique.length > 15) {
    throw buildGoalDecomposerError(
      'invalid_top_level_concepts',
      'Goal decomposition must include between 5 and 15 top-level concepts.',
    )
  }

  const [minimum, maximum] = getExpectedConceptRange(estimatedDays)
  if (unique.length < minimum || unique.length > maximum) {
    throw buildGoalDecomposerError(
      'invalid_top_level_concept_count_for_scope',
      `Goal decomposition must include ${minimum}-${maximum} top-level concepts for a ${estimatedDays}-day goal.`,
    )
  }

  return unique
}

function normalizeGoalDecomposition(payload) {
  const primaryMode = String(payload?.primaryMode || '').trim()
  if (!LEARNING_MODE_SET.has(primaryMode)) {
    throw buildGoalDecomposerError('invalid_primary_mode', 'Goal decomposition returned an invalid primary mode.')
  }

  const cleanedGoalText = String(payload?.cleanedGoalText || '').trim()
  if (!cleanedGoalText) {
    throw buildGoalDecomposerError('invalid_cleaned_goal_text', 'Goal decomposition is missing cleaned goal text.')
  }

  const estimatedDays = Math.round(clamp(payload?.estimatedDays, 1, 180, 30))

  return {
    primaryMode,
    secondaryModes: normalizeSecondaryModes(payload?.secondaryModes, primaryMode),
    estimatedDays,
    topLevelConcepts: normalizeTopLevelConcepts(payload?.topLevelConcepts, estimatedDays),
    cleanedGoalText,
    confidence: clamp(payload?.confidence, 0, 1, 0),
    reasoning: normalizeReasoning(payload?.reasoning),
    decompositionStatus: 'ok',
    failureReason: null,
  }
}

function getFailureReason(error) {
  return String(error?.code || error?.message || 'unknown_decomposition_failure').slice(0, 500)
}

export function buildFallbackGoalDecomposition(goalText, error = null) {
  const cleanedGoalText = String(goalText || '').trim()

  return {
    primaryMode: 'knowledge_mastery',
    secondaryModes: [],
    estimatedDays: 30,
    topLevelConcepts: [],
    cleanedGoalText,
    confidence: 0,
    reasoning: 'fallback: decomposition failed, retry pending',
    decompositionStatus: 'pending_retry',
    failureReason: getFailureReason(error),
  }
}

export function normalizeGoalDecompositionForStorage(decomposition, goalText = '') {
  if (!decomposition || typeof decomposition !== 'object') {
    return buildFallbackGoalDecomposition(goalText, new Error('missing_decomposition'))
  }

  const primaryMode = LEARNING_MODE_SET.has(decomposition.primaryMode)
    ? decomposition.primaryMode
    : 'knowledge_mastery'
  const estimatedDays = Math.round(clamp(decomposition.estimatedDays, 1, 180, 30))
  const cleanedGoalText = String(decomposition.cleanedGoalText || goalText || '').trim()

  return {
    primaryMode,
    secondaryModes: normalizeSecondaryModes(decomposition.secondaryModes, primaryMode),
    estimatedDays,
    topLevelConcepts: normalizeStringArray(decomposition.topLevelConcepts),
    cleanedGoalText,
    confidence: clamp(decomposition.confidence, 0, 1, 0),
    reasoning: String(decomposition.reasoning || '').trim() || 'fallback: decomposition failed, retry pending',
    decompositionStatus: decomposition.decompositionStatus === 'pending_retry' ? 'pending_retry' : 'ok',
    failureReason: decomposition.failureReason ? String(decomposition.failureReason).slice(0, 500) : null,
  }
}

export function getGoalDecomposerModel() {
  return getOpenAIModel('goalDecomposer')
}

async function requestGoalDecomposition({ goalText, userContext, correction = '' }) {
  const openaiApiKey = process.env.OPENAI_API_KEY
  if (!openaiApiKey) {
    throw buildGoalDecomposerError('missing_api_key', 'Missing OPENAI_API_KEY for goal decomposition.')
  }

  let response
  try {
    response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: getGoalDecomposerModel(),
        max_completion_tokens: 900,
        response_format: GOAL_DECOMPOSER_RESPONSE_FORMAT,
        messages: [
          {
            role: 'system',
            content: 'You output exactly one schema-valid JSON object. No markdown. No prose outside JSON.',
          },
          {
            role: 'user',
            content: buildGoalDecomposerPrompt({ goalText, userContext, correction }),
          },
        ],
      }),
      signal: AbortSignal.timeout(15000),
    })
  } catch (error) {
    throw buildGoalDecomposerError(
      'openai_request_failed',
      error?.message || 'Goal decomposition request failed.',
    )
  }

  if (!response.ok) {
    const message = await response.text().catch(() => '')
    throw buildGoalDecomposerError(
      'openai_http_error',
      message || `Goal decomposition failed with ${response.status}.`,
    )
  }

  const data = await response.json()
  const raw = data?.choices?.[0]?.message?.content
  if (!raw) {
    throw buildGoalDecomposerError('empty_openai_response', 'OpenAI returned an empty goal decomposition.')
  }

  let parsed
  try {
    parsed = JSON.parse(raw)
  } catch (error) {
    throw buildGoalDecomposerError(
      'invalid_json',
      error?.message || 'Could not parse schema-locked goal decomposition JSON.',
    )
  }

  return parsed
}

export async function decomposeGoal(goalText, userContext = {}) {
  const normalizedGoalText = String(goalText || '').trim()
  if (!normalizedGoalText) {
    throw buildGoalDecomposerError('missing_goal_text', 'Goal text is required for decomposition.')
  }

  const firstPass = await requestGoalDecomposition({
    goalText: normalizedGoalText,
    userContext,
  })

  try {
    return normalizeGoalDecomposition(firstPass)
  } catch (error) {
    if (error?.code !== 'invalid_top_level_concept_count_for_scope') {
      throw error
    }

    const correctedPass = await requestGoalDecomposition({
      goalText: normalizedGoalText,
      userContext,
      correction: error.message,
    })
    return normalizeGoalDecomposition(correctedPass)
  }
}
