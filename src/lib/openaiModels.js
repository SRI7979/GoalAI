const LIGHT_MODEL_FALLBACK = 'gpt-4o-mini'
const COMPLEX_MODEL_FALLBACK = 'gpt-5-mini'

const MODEL_TIER_BY_PURPOSE = Object.freeze({
  addMoreTasks: 'light',
  capstone: 'light',
  challenge: 'light',
  conceptMap: 'complex',
  courseOutline: 'complex',
  dailyTasks: 'complex',
  discussion: 'light',
  evaluateDefense: 'light',
  exploreConcepts: 'complex',
  flashcards: 'light',
  lesson: 'complex',
  lessonAssistant: 'light',
  practiceAi: 'light',
  projectAssistant: 'light',
  projectCheckpoint: 'light',
  projectGenerate: 'complex',
  projectIdea: 'light',
  projectReview: 'complex',
  projectVerify: 'light',
  quizMulti: 'light',
  reading: 'light',
  reviewCode: 'light',
  taskReroll: 'light',
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
