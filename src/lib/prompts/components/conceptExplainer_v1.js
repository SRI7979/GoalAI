import { conceptExplainerParamsSchema } from '@/components/library/schemas'

export const CONCEPT_EXPLAINER_RESPONSE_FORMAT = {
  type: 'json_schema',
  json_schema: {
    name: 'pathai_concept_explainer_v1',
    strict: true,
    schema: conceptExplainerParamsSchema,
  },
}

export function buildConceptExplainerPrompt({ concept = 'JavaScript variables', goalText = 'Learn JavaScript from scratch' } = {}) {
  return [
    'Create params for PathAI component type concept_explainer.',
    'Return exactly one schema-valid JSON object.',
    `Goal: ${goalText}`,
    `Concept: ${concept}`,
    '',
    'Teach from first principles. Use 2-4 short paragraphs.',
    'Avoid assuming knowledge not introduced in the explanation.',
    'The keyTakeaway should be one concrete sentence the learner can remember.',
  ].join('\n')
}
