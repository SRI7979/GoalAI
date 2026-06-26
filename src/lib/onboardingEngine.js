// Slot-filling onboarding engine.
// The chatbot collects a fixed set of REQUIRED slots (with AI-generated wording),
// plus optional adaptive follow-ups, until a readiness check is confident a
// correct, well-scoped curriculum can be built (capped to avoid fatigue).

export const MAX_QUESTIONS = 12

// Required information the curriculum generator needs. `goal` is collected by the
// UI's fixed first question, so it is not in this sequence. `known_skills` is a
// special skill-map checklist handled deterministically (its options come from
// /api/onboarding/skill-map, not the LLM).
export const SLOT_SEQUENCE = [
  'timeframe',
  'experience',
  'known_skills',
  'outcome',
  'constraints',
]

// Deterministic fallback questions, used when the LLM is unavailable or returns
// something unusable. Every choice question also allows a typed custom answer.
export const FALLBACK_QUESTIONS = {
  timeframe: {
    slot: 'timeframe',
    kind: 'choice',
    prompt: 'Over what time period do you want to learn this?',
    helper: 'This sets how much we pack into each day.',
    allowCustom: true,
    customPlaceholder: 'e.g. 50 days, 3 months…',
    options: [
      { label: '30 days', value: '30' },
      { label: '60 days', value: '60' },
      { label: '90 days', value: '90' },
      { label: 'No deadline — just steady', value: 'explore' },
    ],
  },
  experience: {
    slot: 'experience',
    kind: 'choice',
    prompt: 'How much experience do you already have with this?',
    helper: 'Be honest — it decides where we start.',
    allowCustom: true,
    customPlaceholder: 'Describe your background…',
    options: [
      { label: 'Total beginner', value: 'beginner' },
      { label: 'I know a little', value: 'some' },
      { label: "I'm fairly comfortable", value: 'comfortable' },
      { label: 'Advanced — push me', value: 'advanced' },
    ],
  },
  outcome: {
    slot: 'outcome',
    kind: 'choice',
    prompt: 'What does success look like for you?',
    helper: 'This shapes your first milestone.',
    allowCustom: true,
    customPlaceholder: 'Describe your goal outcome…',
    options: [
      { label: 'Build something real', value: 'project' },
      { label: 'Get job / interview ready', value: 'career' },
      { label: 'Understand it deeply', value: 'understand' },
      { label: 'Pass a class or exam', value: 'exam' },
    ],
  },
  constraints: {
    slot: 'constraints',
    kind: 'choice',
    prompt: 'How much time can you give it on a typical day?',
    helper: 'The path should feel doable, not punishing.',
    allowCustom: true,
    customPlaceholder: 'e.g. 25 minutes…',
    options: [
      { label: '15 min', value: '15' },
      { label: '30 min', value: '30' },
      { label: '45 min', value: '45' },
      { label: '60+ min', value: '60' },
    ],
  },
  known_skills: {
    slot: 'known_skills',
    kind: 'skill_map',
    prompt: 'Which of these do you already know? Tap everything you’re comfortable with — we’ll skip those.',
    helper: 'Pick what you already know so we don’t waste your time.',
    allowCustom: false,
    options: [],
  },
}

export function nextRequiredSlot(filledSlots = {}) {
  return SLOT_SEQUENCE.find((slot) => filledSlots[slot] == null) || null
}

export function buildNextQuestionMessages({ goal, domainLabel, filledSlots = {}, transcript = [], remainingSlot }) {
  const filledSummary = Object.entries(filledSlots)
    .map(([slot, value]) => `- ${slot}: ${typeof value === 'object' ? JSON.stringify(value) : value}`)
    .join('\n') || '(nothing yet)'

  return [
    {
      role: 'system',
      content: [
        'You are PathAI\'s onboarding chatbot. You ask one short, friendly question at a time to learn enough to build a personalized learning path.',
        'NEVER quote or echo the learner\'s goal text back at them. Refer to it naturally ("this", "your goal").',
        'Write a single next question as schema-valid JSON. Keep it warm, concrete, and answerable in one tap.',
        'Always provide 3-4 short option labels. The UI always adds a "type your own" box, so never add an "other" option yourself.',
        `Target the missing slot: "${remainingSlot}". If the goal is broad or ambiguous and a quick clarifier would materially improve the path, you may instead ask one focused clarifier (slot: "focus").`,
        'Return JSON: { "slot": string, "prompt": string, "helper": string, "options": [{ "label": string, "value": string }] }.',
      ].join(' '),
    },
    {
      role: 'user',
      content: [
        `Goal (internal context, do not quote): ${goal}`,
        `Domain: ${domainLabel || 'general'}`,
        'Already known:',
        filledSummary,
        '',
        `Write the next question for slot "${remainingSlot}".`,
      ].join('\n'),
    },
  ]
}

export function normalizeQuestion(raw, remainingSlot) {
  const fallback = FALLBACK_QUESTIONS[remainingSlot] || FALLBACK_QUESTIONS.experience
  if (!raw || typeof raw !== 'object') return fallback

  const options = Array.isArray(raw.options)
    ? raw.options
        .map((o, i) => ({
          label: String(o?.label || o?.value || `Option ${i + 1}`).trim().slice(0, 60),
          value: String(o?.value || o?.label || `opt_${i + 1}`).trim().slice(0, 60),
        }))
        .filter((o) => o.label)
        .slice(0, 4)
    : []

  if (options.length < 2) return fallback

  return {
    slot: String(raw.slot || remainingSlot).trim().slice(0, 40) || remainingSlot,
    kind: 'choice',
    prompt: String(raw.prompt || fallback.prompt).trim().slice(0, 160),
    helper: String(raw.helper || fallback.helper).trim().slice(0, 160),
    allowCustom: true,
    customPlaceholder: 'Type your own…',
    options,
  }
}
