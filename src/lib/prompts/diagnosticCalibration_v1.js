export const DIAGNOSTIC_CALIBRATION_RESPONSE_FORMAT = { type: 'json_object' }

export function buildDiagnosticCalibrationPrompt({
  goalText = '',
  concepts = [],
  learnerProfile = {},
  count = 4,
} = {}) {
  const conceptLines = concepts
    .map((concept, index) => `${index + 1}. ${concept.id}: ${concept.label} (${concept.difficulty ?? 0.5})`)
    .join('\n')

  return [
    'Create a short PathAI calibration diagnostic for a learner before a mission.',
    'Return JSON only: { "questions": [...] }.',
    'Each question must include id, conceptId, prompt, options, correctIndex, difficulty, explanation.',
    'Use only the provided conceptIds. Ask concrete questions that reveal whether the learner already knows the concept.',
    'Use 3-4 answer options, exactly one correct option, and keep each prompt answerable in under 30 seconds.',
    'Do not teach in the question. Diagnose. Avoid trick wording.',
    '',
    `Goal: ${goalText || 'Learning goal'}`,
    `Learner profile: ${JSON.stringify(learnerProfile || {})}`,
    `Question count: ${count}`,
    'Concepts:',
    conceptLines || '- current_goal: Current goal',
  ].join('\n')
}
