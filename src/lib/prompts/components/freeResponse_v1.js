import { freeResponseParamsSchema } from '@/components/library/schemas'

export const FREE_RESPONSE_RESPONSE_FORMAT = {
  type: 'json_schema',
  json_schema: {
    name: 'pathai_free_response_v1',
    strict: true,
    schema: freeResponseParamsSchema,
  },
}

export const FREE_RESPONSE_EVALUATION_RESPONSE_FORMAT = {
  type: 'json_schema',
  json_schema: {
    name: 'pathai_free_response_evaluation_v1',
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['correct', 'feedback', 'confidence'],
      properties: {
        correct: { type: 'boolean' },
        feedback: { type: 'string' },
        confidence: { type: 'number', minimum: 0, maximum: 1 },
      },
    },
  },
}

export function buildFreeResponsePrompt({ concept = 'JavaScript variables', goalText = 'Learn JavaScript from scratch' } = {}) {
  return [
    'Create params for PathAI component type free_response.',
    'Return exactly one schema-valid JSON object.',
    `Goal: ${goalText}`,
    `Concept: ${concept}`,
    '',
    'The prompt should invite a 1-3 sentence answer.',
    'Rubric criteria should be observable and specific.',
    'Do not ask for concepts outside the named concept.',
  ].join('\n')
}

export function buildFreeResponseEvaluationPrompt({ prompt, rubricCriteria = [], response }) {
  return [
    'Evaluate a PathAI free_response answer.',
    'Return exactly one schema-valid JSON object.',
    '',
    `Prompt: ${prompt}`,
    'Rubric:',
    ...rubricCriteria.map((criterion) => `- ${criterion}`),
    '',
    `Learner response: ${response}`,
    '',
    'correct should be true only if the answer satisfies the important rubric criteria.',
    'feedback should be short, direct, and useful.',
    'confidence is your confidence in the evaluation from 0 to 1.',
  ].join('\n')
}
