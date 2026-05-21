const LEARNING_MODES = [
  'skill_build',
  'knowledge_mastery',
  'exam_prep',
  'language',
  'procedural',
  'conceptual',
  'performance',
  'habit',
]

export const GOAL_DECOMPOSER_RESPONSE_FORMAT = {
  type: 'json_schema',
  json_schema: {
    name: 'pathai_goal_decomposition',
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      required: [
        'primaryMode',
        'secondaryModes',
        'estimatedDays',
        'topLevelConcepts',
        'cleanedGoalText',
        'confidence',
        'reasoning',
      ],
      properties: {
        primaryMode: { type: 'string', enum: LEARNING_MODES },
        secondaryModes: {
          type: 'array',
          items: { type: 'string', enum: LEARNING_MODES },
        },
        estimatedDays: { type: 'integer', minimum: 1, maximum: 180 },
        topLevelConcepts: {
          type: 'array',
          minItems: 5,
          maxItems: 15,
          items: { type: 'string' },
        },
        cleanedGoalText: { type: 'string' },
        confidence: { type: 'number', minimum: 0, maximum: 1 },
        reasoning: { type: 'string' },
      },
    },
  },
}

function formatUserContext(userContext = {}) {
  const knowledge = String(userContext?.knowledge || '').trim()
  const level = String(userContext?.level || '').trim()

  if (!knowledge && !level) return 'No extra learner context provided.'

  return [
    knowledge ? `Known background: ${knowledge}` : null,
    level ? `Learner level: ${level}` : null,
  ].filter(Boolean).join('\n')
}

export function buildGoalDecomposerPrompt({ goalText, userContext, correction = '' } = {}) {
  const prompt = [
    'You are PathAI\'s Goal Decomposer.',
    'Classify one learner goal and return only schema-valid JSON.',
    '',
    'Learning modes:',
    '- skill_build: building a practical skill through repeated output, such as coding, writing, design, music, or art.',
    '- knowledge_mastery: retaining and organizing a body of facts, such as history, biology, or philosophy.',
    '- exam_prep: preparing for a named exam, certification, or standardized test.',
    '- language: learning a human language or sign language.',
    '- procedural: learning physical or stepwise procedures, such as cooking, photography, or fitness technique.',
    '- conceptual: understanding an abstract idea deeply enough to explain or apply it.',
    '- performance: improving real-time performance, tactics, or judged execution, such as chess or public speaking.',
    '- habit: sustaining a repeated behavior, such as meditation or journaling.',
    '',
    'Classification rules:',
    '- Choose exactly one primaryMode: the mode that should control most learning activities.',
    '- Add every genuinely useful secondary mode for composite goals; do not cap the list, but do not pad it.',
    '- Do not repeat the primary mode in secondaryModes.',
    '- Use exam_prep as primary whenever passing a named exam is the main outcome.',
    '- Use conceptual for "understand X" goals centered on a bounded idea, even when the topic belongs to a broader factual field.',
    '- Use skill_build for coding goals unless the user mainly asks to understand a single concept.',
    '',
    'Scope rules:',
    '- estimatedDays must be realistic for an adult learner and stay between 1 and 180.',
    '- Use the learner context when supplied.',
    '- Prefer roughly 1-7 days for a bounded concept, 14-45 days for a focused skill, 45-120 days for broad skill-building or exam goals, and up to 180 only for very broad goals.',
    '- With no contrary learner context, use about 60 days for a broad beginner coding goal from scratch, about 90 days for a named multi-section standardized exam such as the SAT, and about 3 days for one bounded conceptual goal such as understanding quantum entanglement.',
    '- topLevelConcepts must scale with scope: 5 concepts for 1-7 days, 6-8 for 8-30 days, 9-12 for 31-90 days, and 13-15 for 91-180 days.',
    '- The concept count ranges above are mandatory. Never return fewer concepts than the range for estimatedDays requires.',
    '- Concepts should be high-level teachable topics, not daily lesson titles or proof targets.',
    '',
    'Text rules:',
    '- cleanedGoalText should preserve the user\'s intent in a concise imperative form such as "Learn JavaScript from scratch".',
    '- reasoning must be exactly one plain sentence explaining why the primary mode fits.',
    '- confidence should reflect classification confidence, not goal difficulty.',
    '',
    `Raw learner goal: ${String(goalText || '').trim()}`,
    '',
    'Learner context:',
    formatUserContext(userContext),
  ]

  if (correction) {
    prompt.push(
      '',
      'Correction required from the prior attempt:',
      correction,
      'Return a fully corrected decomposition that obeys every scope rule.',
    )
  }

  return prompt.join('\n')
}

export { LEARNING_MODES }
