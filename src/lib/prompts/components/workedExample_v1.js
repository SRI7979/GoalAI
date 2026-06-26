import { workedExampleParamsSchema } from '@/components/library/schemas'

export const WORKED_EXAMPLE_RESPONSE_FORMAT = {
  type: 'json_schema',
  json_schema: {
    name: 'pathai_worked_example_v1',
    strict: true,
    schema: workedExampleParamsSchema,
  },
}

export function buildWorkedExamplePrompt({ concept = 'JavaScript variables', goalText = 'Learn JavaScript from scratch' } = {}) {
  return [
    'Create params for PathAI component type worked_example.',
    'Return exactly one schema-valid JSON object.',
    `Goal: ${goalText}`,
    `Concept: ${concept}`,
    '',
    'Use one small problem and walk through it in 2-8 revealed steps.',
    'Each step should explain a single move.',
    'The answer and whyItWorks should make the reasoning transfer to a nearby problem.',
  ].join('\n')
}
