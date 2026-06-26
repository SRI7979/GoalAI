import { componentParamSchemas } from '@/components/library/schemas'

export const EXPANSION_COMPONENT_TYPES = Object.freeze([
  'code_sandbox',
  'code_debugger',
  'audio_listen',
  'audio_speak',
  'image_identify',
  'drag_match',
  'order_steps',
  'timed_problem_set',
  'roleplay_scenario',
  'case_study_analyze',
  'reflection_prompt',
  'do_in_real_world',
  'mock_exam',
  'concept_map_build',
])

const GUIDANCE = Object.freeze({
  code_sandbox: 'Create a tiny coding task with starter code, observable expected behavior, and 2-4 helpful hints.',
  code_debugger: 'Create a small broken code snippet and a clear debugging task. The bug must be discoverable by reading/running the snippet.',
  audio_listen: 'Create a listening-comprehension task using a transcript placeholder plus one multiple-choice check.',
  audio_speak: 'Create a speaking/rehearsal task with a phrase, pronunciation tips, and self-rating rubric.',
  image_identify: 'Create an image-identification task using a precise image description plus one multiple-choice check.',
  drag_match: 'Create 3-6 prompt/match pairs for terms, examples, definitions, or causes/effects.',
  order_steps: 'Create 3-8 ordered steps for a process the learner should sequence or explain.',
  timed_problem_set: 'Create 2-6 short-answer problems with exact answers and explanations.',
  roleplay_scenario: 'Create a roleplay setup with learner role, counterpart role, opening line, and success criteria.',
  case_study_analyze: 'Create a compact case study with 2-5 analysis questions and one key takeaway.',
  reflection_prompt: 'Create a reflective prompt plus sentence starters that connect the concept to the learner.',
  do_in_real_world: 'Create a safe real-world task with steps and an evidence prompt for what the learner should report.',
  mock_exam: 'Create a short exam-style question set with options, correctIndex values, and explanations.',
  concept_map_build: 'Create a concept-map task with a central concept, related concepts, and relationship prompts.',
})

export function getExpansionResponseFormat(componentType) {
  return {
    type: 'json_schema',
    json_schema: {
      name: `pathai_${componentType}_v1`,
      strict: true,
      schema: JSON.parse(JSON.stringify(componentParamSchemas[componentType])),
    },
  }
}

export function buildExpansionComponentPrompt(componentType, {
  concept = 'JavaScript variables',
  goalText = 'Learn JavaScript from scratch',
  validationFeedback = '',
} = {}) {
  return [
    `Create params for PathAI component type ${componentType}.`,
    'Return exactly one schema-valid JSON object.',
    `Goal: ${goalText}`,
    `Concept: ${concept}`,
    validationFeedback ? `Validation feedback: ${validationFeedback}` : '',
    '',
    GUIDANCE[componentType] || 'Create a focused, beginner-safe learning component.',
    'Keep the component narrow: one concept, one learning job, no unrelated prerequisites.',
    'Use concise learner-facing language. Do not mention that this was generated.',
    'For code tasks, keep snippets small and runnable by a beginner.',
  ].filter(Boolean).join('\n')
}

export const EXPANSION_COMPONENT_GENERATORS = Object.freeze(
  Object.fromEntries(EXPANSION_COMPONENT_TYPES.map((componentType) => [
    componentType,
    {
      responseFormat: getExpansionResponseFormat(componentType),
      buildPrompt: (input) => buildExpansionComponentPrompt(componentType, input),
    },
  ])),
)
