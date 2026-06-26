const LIGHT_MODEL_FALLBACK = 'gpt-4o-mini'
const COMPLEX_MODEL_FALLBACK = 'gpt-4o'

const PURPOSE_MODEL_FALLBACKS = Object.freeze({
  // Diagram SVG generation is called often in the dev surface. GPT-4.1 is
  // stronger at instruction following than the old gpt-4o default while
  // staying cheaper than gpt-4o on both input and output tokens.
  fullAiSvg: 'gpt-4.1',
  lessonVisualPlan: 'gpt-4.1',
})

const MODEL_TIER_BY_PURPOSE = Object.freeze({
  addMoreTasks: 'light',
  capstone: 'light',
  challenge: 'light',
  componentEvaluator: 'light',
  componentGenerator: 'light',
  conceptMap: 'complex',
  courseOutline: 'complex',
  dailyTasks: 'complex',
  discussion: 'light',
  domainClassifier: 'light',
  dynamicDiagram: 'complex',
  evaluateDefense: 'light',
  exploreConcepts: 'complex',
  flashcards: 'light',
  fullAiSvg: 'complex',
  goalDecomposer: 'light',
  lesson: 'complex',
  lessonAssistant: 'light',
  lessonVisualPlan: 'complex',
  onboardingQuestions: 'light',
  practiceAi: 'light',
  projectAssistant: 'light',
  projectCheckpoint: 'light',
  projectGenerate: 'complex',
  projectIdea: 'light',
  projectReview: 'complex',
  projectVerify: 'light',
  proofEvaluator: 'light',
  proofTarget: 'light',
  quizMulti: 'light',
  reading: 'light',
  reviewCode: 'light',
  taskReroll: 'light',
  topicGraph: 'complex',
  validateOutput: 'light',
  default: 'light',
})

function toScreamingSnake(value = '') {
  return String(value)
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase()
}

export function getOpenAIModelTier(purpose = 'default') {
  return MODEL_TIER_BY_PURPOSE[purpose] || MODEL_TIER_BY_PURPOSE.default
}

export function getOpenAIModel(purpose = 'default') {
  const normalizedPurpose = String(purpose || 'default').trim() || 'default'
  const purposeOverride = process.env[`OPENAI_MODEL_${toScreamingSnake(normalizedPurpose)}`]
  if (purposeOverride) return purposeOverride
  if (PURPOSE_MODEL_FALLBACKS[normalizedPurpose]) return PURPOSE_MODEL_FALLBACKS[normalizedPurpose]

  const tier = getOpenAIModelTier(normalizedPurpose)
  if (tier === 'complex') {
    return process.env.OPENAI_MODEL_COMPLEX || process.env.OPENAI_MODEL_DEFAULT || COMPLEX_MODEL_FALLBACK
  }

  return process.env.OPENAI_MODEL_LIGHT || process.env.OPENAI_MODEL_DEFAULT || LIGHT_MODEL_FALLBACK
}

export function getOpenAIModelRouting() {
  return Object.keys(MODEL_TIER_BY_PURPOSE).reduce((routing, purpose) => {
    routing[purpose] = {
      tier: getOpenAIModelTier(purpose),
      model: getOpenAIModel(purpose),
    }
    return routing
  }, {})
}
