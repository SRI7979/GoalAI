// Maps the chatbot's collected slot answers into the structured profile the
// existing curriculum pipeline understands (learnerProfile fields + cadence
// inputs), and normalizes the self-reported known concepts used to seed mastery
// so the generator can skip what the learner already knows.

export function conceptIdFromLabel(label = '') {
  return String(label)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60)
}

function parseDays(value) {
  if (value == null) return null
  const text = String(value).toLowerCase().trim()
  if (text === 'explore' || /no deadline|steady|open/.test(text)) return 0
  const dayMatch = text.match(/(\d{1,3})\s*(d|day|days)?\b/)
  const weeks = text.match(/(\d{1,2})\s*(w|week|weeks)\b/)
  const months = text.match(/(\d{1,2})\s*(mo|month|months)\b/)
  if (months) return Math.min(240, Number(months[1]) * 30)
  if (weeks) return Math.min(240, Number(weeks[1]) * 7)
  if (dayMatch) return Math.min(240, Math.max(3, Number(dayMatch[1])))
  return null
}

function parseMinutes(value) {
  const text = String(value ?? '').toLowerCase()
  const m = text.match(/(\d{1,3})/)
  return m ? Math.max(5, Math.min(180, Number(m[1]))) : null
}

const EXPERIENCE_MAP = {
  beginner: { experienceLevel: 'beginner', recommendedLevel: 'Beginner', prereqComfort: 'full' },
  some: { experienceLevel: 'beginner', recommendedLevel: 'Beginner', prereqComfort: 'compressed' },
  comfortable: { experienceLevel: 'intermediate', recommendedLevel: 'Intermediate', prereqComfort: 'compressed' },
  advanced: { experienceLevel: 'advanced', recommendedLevel: 'Advanced', prereqComfort: 'test_out' },
}

const OUTCOME_MAP = {
  project: 'project',
  build: 'project',
  career: 'career',
  job: 'career',
  understand: 'understand',
  exam: 'understand',
  class: 'understand',
}

// answers: { timeframe, experience, known_skills, outcome, constraints, focus, ... }
// each value is { value, label, custom } or a raw string.
export function mapAnswersToProfile(answers = {}) {
  const raw = (slot) => {
    const a = answers[slot]
    if (a == null) return null
    if (typeof a === 'object') return a.value ?? a.label ?? null
    return a
  }

  const expKey = String(raw('experience') || 'beginner').toLowerCase()
  const exp = EXPERIENCE_MAP[expKey]
    || (/(adv|expert|pro)/.test(expKey) ? EXPERIENCE_MAP.advanced
      : /(comfort|intermediate|decent|solid)/.test(expKey) ? EXPERIENCE_MAP.comfortable
        : /(some|little|bit|basic)/.test(expKey) ? EXPERIENCE_MAP.some
          : EXPERIENCE_MAP.beginner)

  const outcomeKey = String(raw('outcome') || 'project').toLowerCase()
  const desiredOutcome = OUTCOME_MAP[outcomeKey]
    || (/(job|career|interview|work)/.test(outcomeKey) ? 'career'
      : /(understand|deep|theory|exam|class|test)/.test(outcomeKey) ? 'understand'
        : 'project')

  const timeframeDays = parseDays(raw('timeframe'))
  const minutesPerDay = parseMinutes(raw('constraints'))
  const pace = minutesPerDay == null ? 'balanced'
    : minutesPerDay <= 20 ? 'relaxed'
      : minutesPerDay <= 35 ? 'balanced'
        : 'intensive'

  const knownAnswer = answers.known_skills
  const knownConcepts = Array.isArray(knownAnswer?.value)
    ? knownAnswer.value
    : Array.isArray(knownAnswer)
      ? knownAnswer
      : []

  return {
    experienceLevel: exp.experienceLevel,
    recommendedLevel: exp.recommendedLevel,
    prereqComfort: exp.prereqComfort,
    desiredOutcome,
    timeframeDays,
    minutesPerDay,
    pace,
    pathStyle: timeframeDays === 0 ? 'explore' : 'goal',
    knownConcepts: knownConcepts
      .map((c) => (typeof c === 'object' ? c.label || c.id : c))
      .filter(Boolean),
    knownConceptIds: knownConcepts
      .map((c) => (typeof c === 'object' ? c.id || conceptIdFromLabel(c.label) : conceptIdFromLabel(c)))
      .filter(Boolean),
    freeTextNotes: Object.entries(answers)
      .filter(([, a]) => a && typeof a === 'object' && a.custom)
      .map(([slot, a]) => `${slot}: ${a.label || a.value}`),
  }
}
