import { DOMAIN_METADATA, detectDomainHeuristic, normalizeDomain } from '@/lib/domainAdapter'

const DEFAULTS = Object.freeze({
  pathStyle: 'goal',
  pace: 'balanced',
  experienceLevel: 'beginner',
  learningStyle: 'hands_on',
  desiredOutcome: 'project',
  prereqComfort: 'compressed',
})

const ALLOWED_SET_VALUES = Object.freeze({
  pathStyle: ['goal', 'explore'],
  pace: ['relaxed', 'balanced', 'intensive'],
  experienceLevel: ['beginner', 'intermediate', 'advanced'],
  learningStyle: ['visual', 'hands_on', 'balanced'],
  desiredOutcome: ['project', 'career', 'understand'],
  prereqComfort: ['compressed', 'full', 'test_out'],
})

function titleCase(text = '') {
  return String(text)
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\b[a-z]/g, (letter) => letter.toUpperCase())
}

export function cleanGoal(goal = '') {
  return String(goal)
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, 180)
}

export function getGoalSubject(goal = '') {
  let subject = cleanGoal(goal)
    .replace(/^(i\s+want\s+to|i\s+would\s+like\s+to|i'd\s+like\s+to|i\s+wanna|i\s+need\s+to|can\s+you|please)\s+/i, '')
    .replace(/^(learn|master|understand|study|practice|improve|build|teach\s+me|help\s+me\s+learn|help\s+me\s+with|get\s+better\s+at)\s+/i, '')
    .replace(/^how\s+to\s+/i, '')
    .replace(/\s+(from\s+scratch|for\s+beginners|as\s+a\s+beginner)$/i, '')
    .trim()

  if (!subject || subject.length < 2) subject = 'this skill'
  return subject
}

export function getShortGoal(goal = '') {
  const cleaned = cleanGoal(goal)
  if (!cleaned) return 'your goal'
  return cleaned.length > 74 ? `${cleaned.slice(0, 71).trim()}...` : cleaned
}

export function getDomainLabel(domain, fallbackFamily = 'general') {
  const normalized = normalizeDomain(domain, null)
  if (normalized && DOMAIN_METADATA[normalized]?.label) return DOMAIN_METADATA[normalized].label

  switch (fallbackFamily) {
    case 'programming':
      return 'Computer Science'
    case 'machineLearning':
      return 'Machine Learning / AI'
    case 'language':
      return 'Languages'
    case 'design':
      return 'Art / Design'
    default:
      return 'Adaptive Learning'
  }
}

function inferOutcome(goal = '', domain = '') {
  const text = cleanGoal(goal).toLowerCase()
  const normalized = normalizeDomain(domain, null)

  if (/job|career|interview|work|promotion|business|client/.test(text)) return 'career'
  if (/test|exam|class|school|understand|deep|theory|why/.test(text)) return 'understand'
  if (/speak|conversation|fluent|travel/.test(text)) return 'career'
  if (normalized === 'FOREIGN_LANGUAGE') return 'career'
  if (/build|project|app|portfolio|website|tool|ship/.test(text)) return 'project'
  return 'project'
}

function getProofOptions(subject, domain, desiredOutcome) {
  const normalized = normalizeDomain(domain, null)
  const quotedGoal = titleCase(subject)

  if (normalized === 'FOREIGN_LANGUAGE') {
    return [
      { label: `Hold a short ${quotedGoal} conversation`, score: 1, sets: { desiredOutcome: 'career', learningStyle: 'hands_on' } },
      { label: 'Understand grammar and sentence patterns', score: 1, sets: { desiredOutcome: 'understand', learningStyle: 'balanced' } },
      { label: 'Practice for travel, school, or work', score: 2, sets: { desiredOutcome: 'career', learningStyle: 'hands_on' } },
    ]
  }

  if (normalized === 'ART_DESIGN') {
    return [
      { label: `Create a polished ${quotedGoal} artifact`, score: 1, sets: { desiredOutcome: 'project', learningStyle: 'visual' } },
      { label: 'Understand critique, hierarchy, and systems', score: 1, sets: { desiredOutcome: 'understand', learningStyle: 'visual' } },
      { label: 'Use it in portfolio or client-style work', score: 2, sets: { desiredOutcome: 'career', learningStyle: 'hands_on' } },
    ]
  }

  if (normalized === 'MATHEMATICS' || normalized === 'PHYSICS' || normalized === 'CHEMISTRY' || normalized === 'STATISTICS') {
    return [
      { label: `Solve ${quotedGoal} problems without guessing`, score: 1, sets: { desiredOutcome: 'understand', learningStyle: 'balanced' } },
      { label: 'Use it in realistic scenarios', score: 2, sets: { desiredOutcome: 'project', learningStyle: 'hands_on' } },
      { label: 'Get ready for a class, quiz, or exam', score: 1, sets: { desiredOutcome: 'understand', prereqComfort: 'full' } },
    ]
  }

  if (normalized === 'CS_CODING' || normalized === 'TECHNOLOGY' || normalized === 'CYBERSECURITY' || normalized === 'ML_AI' || normalized === 'DATA_SCIENCE') {
    return [
      { label: `Build or fix something using ${subject}`, score: 2, sets: { desiredOutcome: 'project', learningStyle: 'hands_on' } },
      { label: 'Understand the ideas clearly first', score: 1, sets: { desiredOutcome: 'understand', learningStyle: 'balanced' } },
      { label: 'Use it for work, interviews, or real tasks', score: 2, sets: { desiredOutcome: 'career', learningStyle: 'hands_on' } },
    ]
  }

  return [
    { label: `Use ${subject} in a real task`, score: 2, sets: { desiredOutcome: desiredOutcome || 'project', learningStyle: 'hands_on' } },
    { label: 'Understand it deeply and explain it', score: 1, sets: { desiredOutcome: 'understand', learningStyle: 'balanced' } },
    { label: 'Turn it into a finished project or deliverable', score: 2, sets: { desiredOutcome: 'project', learningStyle: 'hands_on' } },
  ]
}

function normalizeOption(option, index) {
  const sets = Object.entries(option?.sets || {}).reduce((next, [key, value]) => {
    if (ALLOWED_SET_VALUES[key]?.includes(value)) next[key] = value
    return next
  }, {})

  return {
    label: String(option?.label || `Option ${index + 1}`).trim().slice(0, 96),
    score: Math.max(0, Math.min(2, Number(option?.score) || 0)),
    sets,
  }
}

function normalizeQuestion(question, index) {
  const options = Array.isArray(question?.options)
    ? question.options.map(normalizeOption).filter((option) => option.label)
    : []

  return {
    id: String(question?.id || `calibration_${index + 1}`).replace(/[^a-z0-9_-]/gi, '_').toLowerCase(),
    prompt: String(question?.prompt || '').trim().slice(0, 140),
    helper: String(question?.helper || '').trim().slice(0, 160),
    options: options.slice(0, 4),
  }
}

export function buildFallbackOnboardingCalibration({ goal = '', domain = '', family = 'general' } = {}) {
  const clean = cleanGoal(goal)
  const heuristic = detectDomainHeuristic(clean)
  const normalizedDomain = normalizeDomain(domain, heuristic.domain)
  const subject = getGoalSubject(clean)
  const domainLabel = getDomainLabel(normalizedDomain, family)
  const desiredOutcome = inferOutcome(clean, normalizedDomain)

  return {
    source: 'dynamic_fallback',
    summary: `PathAI will build a ${domainLabel} route for ${subject}, then tune the first mission from your answers.`,
    defaults: {
      ...DEFAULTS,
      desiredOutcome,
      learningStyle: normalizedDomain === 'ART_DESIGN' ? 'visual' : 'hands_on',
      prereqComfort: /from scratch|beginner|zero|new/i.test(clean) ? 'full' : 'compressed',
    },
    questions: [
      {
        id: 'starting_point',
        prompt: `Where are you starting with ${subject}?`,
        helper: 'This sets how much explanation PathAI gives before the first task.',
        options: [
          { label: `Brand new to ${subject}`, score: 0, sets: { experienceLevel: 'beginner', prereqComfort: 'full' } },
          { label: 'I know pieces, but I need structure', score: 1, sets: { experienceLevel: 'intermediate', prereqComfort: 'compressed' } },
          { label: 'I can do basics and want harder practice', score: 2, sets: { experienceLevel: 'advanced', prereqComfort: 'test_out' } },
        ],
      },
      {
        id: 'proof_target',
        prompt: `What should prove your ${subject} route is working?`,
        helper: 'This shapes your first milestone and project style.',
        options: getProofOptions(subject, normalizedDomain, desiredOutcome),
      },
      {
        id: 'daily_time',
        prompt: 'How much time can you realistically give PathAI on most days?',
        helper: 'The route should feel doable, not ceremonial.',
        options: [
          { label: '15-20 minutes', score: 0, sets: { pace: 'relaxed', pathStyle: 'goal' } },
          { label: '25-35 minutes', score: 1, sets: { pace: 'balanced', pathStyle: 'goal' } },
          { label: '45+ minutes when I am locked in', score: 2, sets: { pace: 'intensive', pathStyle: 'goal' } },
        ],
      },
    ],
  }
}

export function normalizeOnboardingCalibration(payload, context = {}) {
  const fallback = buildFallbackOnboardingCalibration(context)
  const rawQuestions = Array.isArray(payload?.questions) ? payload.questions : []
  const questions = rawQuestions
    .map(normalizeQuestion)
    .filter((question) => question.prompt && question.options.length >= 2)
    .slice(0, 3)

  const rawDefaults = payload?.defaults || {}
  const defaults = Object.entries(DEFAULTS).reduce((next, [key, fallbackValue]) => {
    const value = rawDefaults[key]
    next[key] = ALLOWED_SET_VALUES[key]?.includes(value) ? value : fallback.defaults[key] || fallbackValue
    return next
  }, {})

  return {
    source: payload?.source || fallback.source,
    summary: String(payload?.summary || fallback.summary).trim().slice(0, 220),
    defaults,
    questions: questions.length >= 2 ? questions : fallback.questions,
  }
}
