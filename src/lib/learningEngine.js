// ─────────────────────────────────────────────────────────────────────────────
// Learning Engine — 7-Type System, Adaptive Difficulty, Smart Review, Mastery
// ─────────────────────────────────────────────────────────────────────────────

// ── Backward-compat: map legacy 16 types → clean 7 types ────────────────────
export const LEGACY_TYPE_MAP = {
  // Old → New
  lesson:           'concept',
  reading:          'concept',
  video:            'concept',
  flashcard:        'concept',
  discussion:       'explain',
  practice:         'guided_practice',
  exercise:         'guided_practice',
  ai_interaction:   'explain',
  reflection:       'reflect',
  review:           'quiz',
  capstone:         'boss',
  project:          'project',  // project stays as-is (separate system)
  // These are already clean types — identity mapping
  concept:          'concept',
  guided_practice:  'guided_practice',
  challenge:        'challenge',
  explain:          'explain',
  quiz:             'quiz',
  reflect:          'reflect',
  boss:             'boss',
}

// Normalize any task type (old or new) to the clean 7-type system
export function normalizeTaskType(type) {
  return LEGACY_TYPE_MAP[String(type || '').toLowerCase().trim()] || 'concept'
}

// ── The 7 Clean Types ────────────────────────────────────────────────────────
// concept → guided_practice → challenge → explain → quiz → reflect → boss
export const TASK_TYPES = ['concept', 'guided_practice', 'challenge', 'explain', 'quiz', 'reflect', 'boss']

// ── Cognitive Stages ─────────────────────────────────────────────────────────
// 1. Exposure        → concept
// 2. Understanding   → concept
// 3. Assisted App    → guided_practice
// 4. Independent App → challenge
// 5. Stress Test     → boss
// 6. Integration     → boss
// 7. Retention       → quiz
// 8a. Reflection     → explain (active recall / teaching)
// 8b. Reflection     → reflect (metacognitive awareness)

export const FLOW_STAGES = [
  'understand',  // Concept — absorb and understand
  'apply',       // Guided Practice — apply with scaffolded help
  'struggle',    // Challenge — solve independently, no help
  'explain',     // Explain — teach it back to prove understanding
  'prove',       // Quiz — test recall and retention
  'reflect',     // Reflect — metacognitive self-assessment
]

export const FLOW_STAGE_CONFIG = {
  understand: {
    label: 'Understand',
    icon: '📖',
    taskTypes: ['concept'],
    description: 'Absorb the concept through explanations and examples',
    color: '#0ef5c2',
  },
  apply: {
    label: 'Apply',
    icon: '🔧',
    taskTypes: ['guided_practice'],
    description: 'Practice with scaffolded hints and guidance',
    color: '#00d4ff',
  },
  struggle: {
    label: 'Struggle',
    icon: '🧗',
    taskTypes: ['challenge'],
    description: 'Solve problems independently with zero help',
    color: '#F59E0B',
  },
  explain: {
    label: 'Explain',
    icon: '💬',
    taskTypes: ['explain'],
    description: 'Teach the concept back to prove understanding',
    color: '#818CF8',
  },
  prove: {
    label: 'Prove',
    icon: '🏆',
    taskTypes: ['quiz', 'boss'],
    description: 'Test recall and retention through assessment',
    color: '#EC4899',
  },
  reflect: {
    label: 'Reflect',
    icon: '🪞',
    taskTypes: ['reflect'],
    description: 'What did you learn? What\'s still fuzzy?',
    color: '#A78BFA',
  },
}

// ── Determine next flow stage based on what's been completed today ───────────
export function getNextFlowStage(completedTaskTypes) {
  const types = new Set((completedTaskTypes || []).map(t => normalizeTaskType(t)))

  for (const stage of FLOW_STAGES) {
    const config = FLOW_STAGE_CONFIG[stage]
    const stageCompleted = config.taskTypes.some(t => types.has(t))
    if (!stageCompleted) return stage
  }

  return 'understand'
}

// ── Map task type to its flow stage ──────────────────────────────────────────
export function getFlowStageForTask(taskType) {
  const normalized = normalizeTaskType(taskType)
  for (const [stage, config] of Object.entries(FLOW_STAGE_CONFIG)) {
    if (config.taskTypes.includes(normalized)) return stage
  }
  return 'understand'
}

// ── Build flow-based task sequence for a day ─────────────────────────────────
// Returns task types in optimal learning order based on day context
export function buildFlowSequence(dayNumber, difficulty, options = {}) {
  const {
    isBossDay = false,
    isReviewDay = false,
    condensed = false,
    mastery = null,  // 0-100, concept mastery score
  } = options

  // Boss days: warm-up → boss → debrief
  if (isBossDay) {
    return [
      { type: 'concept', stage: 'understand', label: 'Review Key Concepts' },
      { type: 'guided_practice', stage: 'apply', label: 'Warm-Up Practice' },
      { type: 'boss', stage: 'prove', label: 'Boss Challenge' },
      { type: 'reflect', stage: 'reflect', label: 'Boss Debrief' },
    ]
  }

  // Review days: quiz weak concepts → reinforce → reflect
  if (isReviewDay) {
    return [
      { type: 'quiz', stage: 'prove', label: 'Review Quiz' },
      { type: 'guided_practice', stage: 'apply', label: 'Reinforce Weak Spots' },
      { type: 'reflect', stage: 'reflect', label: 'Progress Check' },
    ]
  }

  // Condensed session (<20 min): concept → guided practice → quiz
  if (condensed) {
    return [
      { type: 'concept', stage: 'understand', label: 'Learn' },
      { type: 'guided_practice', stage: 'apply', label: 'Practice' },
      { type: 'quiz', stage: 'prove', label: 'Quick Check' },
    ]
  }

  // ── Adaptive flow based on mastery ──────────────────────────────────────────

  // STRUGGLING (mastery < 50%): skip challenge, double guided practice
  if (mastery !== null && mastery < 50) {
    return [
      { type: 'concept', stage: 'understand', label: 'Re-Learn the Concept' },
      { type: 'guided_practice', stage: 'apply', label: 'Guided Practice' },
      { type: 'guided_practice', stage: 'apply', label: 'Extra Practice' },
      { type: 'quiz', stage: 'prove', label: 'Check Understanding' },
      { type: 'reflect', stage: 'reflect', label: 'Reflect' },
    ]
  }

  // BREEZING (mastery >= 90%): skip guided practice, go straight to challenge
  if (mastery !== null && mastery >= 90) {
    const sequence = [
      { type: 'concept', stage: 'understand', label: 'Learn the Concept' },
      { type: 'challenge', stage: 'struggle', label: 'Challenge' },
      { type: 'explain', stage: 'explain', label: 'Explain It' },
      { type: 'quiz', stage: 'prove', label: 'Check Understanding' },
      { type: 'reflect', stage: 'reflect', label: 'Reflect' },
    ]
    return sequence
  }

  // ── Standard full flow ──────────────────────────────────────────────────────
  const sequence = [
    { type: 'concept', stage: 'understand', label: 'Learn the Concept' },
    { type: 'guided_practice', stage: 'apply', label: 'Guided Practice' },
  ]

  // Add challenge for higher difficulty or every other day
  if (difficulty >= 3 || dayNumber % 2 === 0) {
    sequence.push({ type: 'challenge', stage: 'struggle', label: 'Challenge' })
  }

  // Add explain every 2-3 days or high difficulty
  if (dayNumber % 3 === 0 || difficulty >= 4) {
    sequence.push({ type: 'explain', stage: 'explain', label: 'Explain It' })
  }

  // Quiz to prove understanding
  sequence.push({ type: 'quiz', stage: 'prove', label: 'Check Understanding' })

  // Reflection at end of every day
  sequence.push({ type: 'reflect', stage: 'reflect', label: 'Reflect' })

  return sequence
}


// ── Adaptive Difficulty ──────────────────────────────────────────────────────
// Calculates the right difficulty level (1-5) based on performance signals

export function calculateAdaptiveDifficulty(performanceData) {
  const {
    recentQuizScores = [],      // last 5 quiz scores (0-100)
    avgCompletionTime = null,    // seconds
    expectedTime = null,         // seconds
    hintsUsed = 0,
    totalHintsAvailable = 3,
    streakCorrect = 0,           // consecutive correct answers
    currentDifficulty = 2,       // current level
    conceptMastery = 0,          // 0-100
  } = performanceData

  let adjustment = 0

  // 1. Quiz performance (strongest signal)
  if (recentQuizScores.length >= 1) {
    const avg = recentQuizScores.reduce((a, b) => a + b, 0) / recentQuizScores.length
    if (avg >= 90) adjustment += 1.0
    else if (avg >= 80) adjustment += 0.5
    else if (avg < 50) adjustment -= 1.0
    else if (avg < 65) adjustment -= 0.5
  }

  // 2. Time analysis
  if (avgCompletionTime && expectedTime) {
    const ratio = avgCompletionTime / expectedTime
    if (ratio < 0.5) adjustment += 0.3        // Way too fast — increase
    else if (ratio > 2.0) adjustment -= 0.3   // Struggling — decrease
  }

  // 3. Hint usage
  if (totalHintsAvailable > 0) {
    const hintRatio = hintsUsed / totalHintsAvailable
    if (hintRatio > 0.8) adjustment -= 0.3    // Used almost all hints
    else if (hintRatio === 0) adjustment += 0.2  // Didn't need hints
  }

  // 4. Streak bonus
  if (streakCorrect >= 5) adjustment += 0.3
  else if (streakCorrect >= 3) adjustment += 0.1

  // 5. Concept mastery
  if (conceptMastery >= 80) adjustment += 0.3
  else if (conceptMastery < 30) adjustment -= 0.3

  // Apply adjustment with dampening (prevent wild swings)
  const newDifficulty = currentDifficulty + (adjustment * 0.6)
  return Math.max(1, Math.min(5, Math.round(newDifficulty)))
}


// ── Smart Review Scheduler ───────────────────────────────────────────────────
// Determines which concepts need review based on spaced repetition

export function getReviewSchedule(masteryData, currentDay) {
  // masteryData: [{ conceptId, conceptName, mastery_score, last_review, review_interval }]
  if (!Array.isArray(masteryData) || masteryData.length === 0) return []

  const today = currentDay || new Date().toISOString().split('T')[0]
  const todayMs = new Date(today).getTime()

  return masteryData
    .map(item => {
      const lastReview = item.last_review ? new Date(item.last_review).getTime() : 0
      const intervalMs = (item.review_interval || 1) * 24 * 60 * 60 * 1000
      const nextReviewMs = lastReview + intervalMs
      const daysSinceReview = Math.floor((todayMs - lastReview) / (24 * 60 * 60 * 1000))
      const overdue = todayMs >= nextReviewMs
      const urgency = overdue ? daysSinceReview / Math.max(1, item.review_interval || 1) : 0

      return {
        ...item,
        overdue,
        daysSinceReview,
        urgency,
        // Lower mastery = higher priority
        priority: urgency + (1 - (item.mastery_score || 0) / 100),
      }
    })
    .filter(item => item.overdue || item.mastery_score < 60)
    .sort((a, b) => b.priority - a.priority)
}

// Should today be a review day?
export function shouldTriggerReview(masteryData, currentDay, dayNumber) {
  // Review every 3rd day, or if there are high-urgency items
  const schedule = getReviewSchedule(masteryData, currentDay)
  const highUrgency = schedule.filter(s => s.urgency > 1.5)

  if (highUrgency.length >= 2) return true  // Multiple overdue concepts
  if (dayNumber % 3 === 0 && schedule.length > 0) return true  // Scheduled review day
  return false
}


// ── Mastery Score ────────────────────────────────────────────────────────────
// Per-concept mastery (0-100) based on weighted performance signals
// Threshold: 80% to progress, <50% triggers reinforcement

export function calculateMasteryScore(signals) {
  const {
    quizScore = 0,             // 0-100
    challengeScore = 0,        // 0-100
    hintsUsed = 0,
    maxHints = 3,
    explainQuality = 0,        // 0-100 (AI-graded)
    timeEfficiency = 100,      // 0-100
    reflectDepth = 0,          // 0-100
    retryCount = 0,
  } = signals

  let score = 0

  // Quiz accuracy (30% — strongest signal)
  score += quizScore * 0.30

  // Challenge score (25% — can they do it alone?)
  score += challengeScore * 0.25

  // Independence (15% — fewer hints = better)
  const independenceScore = maxHints > 0
    ? Math.max(0, 100 - (hintsUsed / maxHints) * 100)
    : 100
  score += independenceScore * 0.15

  // Explain quality (15% — can they teach it?)
  score += explainQuality * 0.15

  // Time efficiency (10% — not too fast, not too slow)
  score += timeEfficiency * 0.10

  // Reflect depth (5% — metacognitive awareness)
  score += reflectDepth * 0.05

  // Penalty for excessive retries (guessing, not understanding)
  if (retryCount > 3) score *= 0.85
  else if (retryCount > 1) score *= 0.95

  return Math.round(Math.max(0, Math.min(100, score)))
}

// ── Understanding Score (backward compat alias) ─────────────────────────────
export function calculateUnderstandingScore(signals) {
  // Map old signal names to new
  return calculateMasteryScore({
    quizScore: signals.quizScore || 0,
    challengeScore: signals.challengeScore || 0,
    hintsUsed: signals.hintsUsed || 0,
    maxHints: signals.maxHints || 3,
    explainQuality: signals.aiInteractionDepth || 0,
    reflectDepth: signals.reflectionQuality || 0,
    retryCount: signals.retryCount || 0,
    timeEfficiency: (() => {
      const r = signals.completionTimeRatio || 1
      if (r < 0.3) return 30
      if (r < 0.5) return 60
      if (r > 3) return 50
      if (r > 2) return 70
      return 100
    })(),
  })
}

// ── Mastery level label ──────────────────────────────────────────────────────
export function getUnderstandingLevel(score) {
  if (score >= 90) return { label: 'Mastered', color: '#0ef5c2', icon: '🌟' }
  if (score >= 75) return { label: 'Strong', color: '#34D399', icon: '💪' }
  if (score >= 60) return { label: 'Developing', color: '#3B82F6', icon: '📈' }
  if (score >= 40) return { label: 'Emerging', color: '#F59E0B', icon: '🌱' }
  return { label: 'Needs Review', color: '#FF453A', icon: '🔄' }
}

// Mastery threshold — must reach this to progress to next concept
export const MASTERY_THRESHOLD = 80


// ── Explain Types (was AI_INTERACTION_TYPES) ─────────────────────────────────
export const AI_INTERACTION_TYPES = {
  explain: {
    label: 'Explain It',
    icon: '🗣',
    prompt: 'Explain this concept in your own words as if teaching someone',
    description: 'Teach the concept back — the best way to learn is to explain',
  },
  debug: {
    label: 'Debug This',
    icon: '🔍',
    prompt: 'Find and fix the intentional mistakes in this code/scenario',
    description: 'Spot errors and explain why they\'re wrong',
  },
  predict: {
    label: 'Predict',
    icon: '🔮',
    prompt: 'What will happen when this code runs / this scenario plays out?',
    description: 'Predict the outcome before seeing the answer',
  },
  whatif: {
    label: 'What If?',
    icon: '🤔',
    prompt: 'What would change if we modified this part?',
    description: 'Explore how changes affect the outcome',
  },
}

// Alias for backward compat
export const EXPLAIN_TYPES = AI_INTERACTION_TYPES


// ── Boss Challenge Config ────────────────────────────────────────────────────
export function getBossConfig(moduleIndex, moduleName) {
  const bossNames = [
    'The Gatekeeper',
    'The Architect',
    'The Puzzle Master',
    'The Code Breaker',
    'The Grand Examiner',
    'The Final Boss',
    'The Shadow',
    'The Oracle',
  ]

  return {
    name: bossNames[moduleIndex % bossNames.length],
    module: moduleName,
    phases: 3,  // Multi-phase boss battle
    timeLimit: 15 * 60, // 15 minutes
    xpReward: 200,
    gemReward: 50,
  }
}


// ── Reflection Prompts ───────────────────────────────────────────────────────
export const REFLECTION_PROMPTS = [
  { id: 'learned', prompt: 'What\'s the most important thing you learned today?', required: true },
  { id: 'confused', prompt: 'What\'s still confusing or unclear?', required: true },
  { id: 'connect', prompt: 'How does this connect to something you already knew?', required: false },
  { id: 'apply', prompt: 'Where could you use this in a real project?', required: false },
  { id: 'teach', prompt: 'How would you explain this to a friend in one sentence?', required: false },
]

// Pick 2-3 reflection prompts based on context
export function selectReflectionPrompts(options = {}) {
  const { difficulty = 2, isEndOfModule = false, conceptName = '' } = options

  // Always include 'learned' and 'confused'
  const selected = REFLECTION_PROMPTS.filter(p => p.required)

  // Add 1 optional prompt based on context
  const optional = REFLECTION_PROMPTS.filter(p => !p.required)
  if (isEndOfModule) {
    selected.push(optional.find(p => p.id === 'apply'))
  } else if (difficulty >= 4) {
    selected.push(optional.find(p => p.id === 'connect'))
  } else {
    selected.push(optional.find(p => p.id === 'teach'))
  }

  return selected.filter(Boolean).map(p => ({
    ...p,
    prompt: p.prompt.replace('today', `about ${conceptName || 'this topic'}`),
  }))
}
