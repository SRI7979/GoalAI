import { flashcardDrillParamsSchema } from '@/components/library/schemas'

export const FLASHCARD_DRILL_RESPONSE_FORMAT = {
  type: 'json_schema',
  json_schema: {
    name: 'pathai_flashcard_drill_v1',
    strict: true,
    schema: flashcardDrillParamsSchema,
  },
}

export function buildFlashcardDrillPrompt({ concept = 'JavaScript variables', goalText = 'Learn JavaScript from scratch' } = {}) {
  return [
    'Create params for PathAI component type flashcard_drill.',
    'Return exactly one schema-valid JSON object.',
    `Goal: ${goalText}`,
    `Concept: ${concept}`,
    '',
    'Create 3-5 compact flashcards.',
    'Fronts should test recall. Backs should be precise and short.',
    'Keep cards beginner-safe and focused on the concept only.',
  ].join('\n')
}
