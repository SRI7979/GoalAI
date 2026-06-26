import { multipleChoiceQuizParamsSchema } from '@/components/library/schemas'

export const MULTIPLE_CHOICE_QUIZ_RESPONSE_FORMAT = {
  type: 'json_schema',
  json_schema: {
    name: 'pathai_multiple_choice_quiz_v1',
    strict: true,
    schema: multipleChoiceQuizParamsSchema,
  },
}

export function buildMultipleChoiceQuizPrompt({ concept = 'JavaScript variables', goalText = 'Learn JavaScript from scratch' } = {}) {
  return [
    'Create params for PathAI component type multiple_choice_quiz.',
    'Return exactly one schema-valid JSON object.',
    `Goal: ${goalText}`,
    `Concept: ${concept}`,
    '',
    'Write one focused question with 3-5 options and one correct answer.',
    'Distractors should be plausible beginner mistakes, not jokes.',
    'The explanation should teach why the correct option is correct.',
  ].join('\n')
}
