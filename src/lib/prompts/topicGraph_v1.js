export const TOPIC_GRAPH_PROOF_TYPES = [
  'code',
  'short_answer',
  'translation',
  'worked_solution',
  'ordered_steps',
  'explanation',
]

export const TOPIC_GRAPH_RESPONSE_FORMAT = {
  type: 'json_schema',
  json_schema: {
    name: 'pathai_topic_graph',
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['nodes', 'edges'],
      properties: {
        nodes: {
          type: 'array',
          minItems: 1,
          maxItems: 40,
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['id', 'label', 'description', 'difficulty', 'estimatedMinutes', 'proofType'],
            properties: {
              id: { type: 'string' },
              label: { type: 'string' },
              description: { type: 'string' },
              difficulty: { type: 'number', minimum: 0, maximum: 1 },
              estimatedMinutes: { type: 'integer', minimum: 5, maximum: 240 },
              proofType: { type: 'string', enum: TOPIC_GRAPH_PROOF_TYPES },
            },
          },
        },
        edges: {
          type: 'array',
          maxItems: 120,
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['from', 'to', 'type', 'strength'],
            properties: {
              from: { type: 'string' },
              to: { type: 'string' },
              type: { type: 'string', enum: ['prerequisite', 'enables', 'related'] },
              strength: { type: 'number', minimum: 0, maximum: 1 },
            },
          },
        },
      },
    },
  },
}

function formatModeList(primaryMode, secondaryModes = []) {
  const modes = [primaryMode, ...(Array.isArray(secondaryModes) ? secondaryModes : [])]
    .map((mode) => String(mode || '').trim())
    .filter(Boolean)
  return modes.length > 0 ? modes.join(', ') : 'unknown'
}

function estimateNodeCount(estimatedDays) {
  const days = Math.max(1, Math.min(180, Number(estimatedDays) || 30))
  return Math.max(3, Math.min(40, Math.round(days / 2)))
}

function formatTopLevelConcepts(concepts = []) {
  if (!Array.isArray(concepts) || concepts.length === 0) return '- No top-level concepts were supplied.'
  return concepts.map((concept) => `- ${String(concept || '').trim()}`).join('\n')
}

export function buildTopicGraphPrompt({ goal = {}, feedback = '' } = {}) {
  const decomposition = goal.decomposition || {}
  const goalText = goal.goal_text || decomposition.cleanedGoalText || goal.cleanedGoalText || ''
  const primaryMode = goal.primaryMode || goal.primary_mode || decomposition.primaryMode
  const secondaryModes = goal.secondaryModes || goal.secondary_modes || decomposition.secondaryModes || []
  const estimatedDays = goal.estimatedDays || goal.estimated_days || decomposition.estimatedDays || 30
  const topLevelConcepts = decomposition.topLevelConcepts || goal.topLevelConcepts || []
  const targetNodeCount = estimateNodeCount(estimatedDays)

  const prompt = [
    'You are PathAI\'s Topic Graph Builder.',
    'Return exactly one schema-valid JSON object with nodes and edges. No markdown. No prose outside JSON.',
    '',
    'Build a pedagogically honest directed acyclic graph for this learning goal.',
    '',
    `Goal: ${String(goalText || '').trim()}`,
    `Learning modes: ${formatModeList(primaryMode, secondaryModes)}`,
    `Estimated scope: ${Math.max(1, Math.min(180, Number(estimatedDays) || 30))} days`,
    `Target node count: about ${targetNodeCount} concepts, never more than 40.`,
    '',
    'Top-level concepts from goal decomposition. Represent every one directly or by decomposing it into clearer sub-concepts:',
    formatTopLevelConcepts(topLevelConcepts),
    '',
    'Node rules:',
    '- id must be lowercase snake_case and deterministic from the label.',
    '- label must be a clear, testable concept label. Do not use vague titles like "Variables 101" or "Introduction".',
    '- description must say what the learner should understand or be able to do.',
    '- difficulty is 0-1 relative to this goal, not universal expert difficulty.',
    '- estimatedMinutes is total teaching/practice time for that concept, not one page-reading time.',
    `- proofType must be one of: ${TOPIC_GRAPH_PROOF_TYPES.join(', ')}.`,
    '',
    'Edge rules:',
    '- Edge direction is from earlier/supporting concept to later/dependent concept.',
    '- prerequisite means the learner cannot understand/use the target without the source first. Be strict.',
    '- enables means strong pedagogical sequencing but not a hard prerequisite.',
    '- related means sideways connection only.',
    '- Do not add cosmetic prerequisite edges just to force a line.',
    '- The graph must be acyclic.',
    '- Every node must be reachable from at least one concept that has no prerequisites.',
    '- Prefer a few honest edges over a dense fake graph.',
    '',
    'Scope guidance:',
    '- Bounded conceptual goals should have a small graph with focused, deeply explanatory nodes.',
    '- Broad skills should include foundations, practice concepts, integration concepts, and proof/application concepts.',
    '- Composite goals should be one mixed DAG, not separate subgraphs. Real cross-mode prerequisites should be connected.',
    '- Beachhead coding goals should start from first principles and end with applied, shippable concepts.',
  ]

  if (feedback) {
    prompt.push(
      '',
      'The previous graph failed validation. Correct these issues and return a fully valid graph:',
      String(feedback).slice(0, 3000),
    )
  }

  return prompt.join('\n')
}
