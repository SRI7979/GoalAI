// ─────────────────────────────────────────────────────────────────────────────
// Learning Engine — Flow State, Adaptive Difficulty, Smart Review, Understanding
// ─────────────────────────────────────────────────────────────────────────────

// ── Learning Flow Stages ─────────────────────────────────────────────────────
// The progression: understand → apply → struggle → explain → build → prove
export const FLOW_STAGES = [
  'understand',  // Lesson — absorb the concept
  'apply',       // Guided Practice — structured application with scaffolding
  'struggle',    // Challenge — harder problems, minimal help
  'explain',     // AI Interaction — explain back, debug, predict
  'reflect',     // Reflection — what did I learn? what's still fuzzy?
  'prove',       // Boss / Quiz — demonstrate mastery
]

export const FLOW_STAGE_CONFIG = {
  understand: {
    label: 'Understand',
    icon: '📖',
    taskTypes: ['lesson', 'reading', 'video'],
    description: 'Absorb the concept through lessons and examples',
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
    description: 'Tackle harder problems with minimal help',
    color: '#F59E0B',
  },
  explain: {
    label: 'Explain',
    icon: '💬',
    taskTypes: ['ai_interaction'],
    description: 'Teach back, debug scenarios, predict outcomes',
    color: '#818CF8',
  },
  reflect: {
    label: 'Reflect',
    icon: '🪞',
    taskTypes: ['reflection'],
    description: 'What did you learn? What\'s still fuzzy?',
    color: '#A78BFA',
  },
  prove: {
    label: 'Prove',
    icon: '🏆',
    taskTypes: ['quiz', 'boss'],
    description: 'Demonstrate mastery through assessment',
    color: '#EC4899',
  },
}

// ── Determine next flow stage based on what's been completed today ───────────
export function getNextFlowStage(completedTaskTypes) {
  const types = new Set(completedTaskTypes || [])

  // Walk through stages in order; return the first stage where
  // none of its task types have been completed
  for (const stage of FLOW_STAGES) {
    const config = FLOW_STAGE_CONFIG[stage]
    const stageCompleted = config.taskTypes.some(t => types.has(t))
    if (!stageCompleted) return stage
  }

  // All stages done — loop back to understand (next concept)
  return 'understand'
}

// ── Map task type to its flow stage ──────────────────────────────────────────
export function getFlowStageForTask(taskType) {
  for (const [stage, config] of Object.entries(FLOW_STAGE_CONFIG)) {
    if (config.taskTypes.includes(taskType)) return stage
  }
  // Legacy task types map to 'understand'
  if (['lesson', 'video', 'reading', 'flashcard'].includes(taskType)) return 'understand'
  if (['practice', 'exercise'].includes(taskType)) return 'apply'
  if (['quiz'].includes(taskType)) return 'prove'
  return 'understand'
}

// ── Build flow-based task sequence for a day ─────────────────────────────────
// Returns task types in optimal learning order
export function buildFlowSequence(dayNumber, difficulty, options = {}) {
  const { isBossDay = false, isReviewDay = false, condensed = false } = options

  if (isBossDay) {
    // Boss days: review → boss challenge
    return [
      { type: 'lesson', stage: 'understand', label: 'Review Key Concepts' },
      { type: 'guided_practice', stage: 'apply', label: 'Warm-Up Practice' },
      { type: 'boss', stage: 'prove', label: 'Boss Challenge' },
      { type: 'reflection', stage: 'reflect', label: 'Boss Debrief' },
    ]
  }

  if (isReviewDay) {
    // Smart review days: spaced repetition
    return [
      { type: 'quiz', stage: 'prove', label: 'Review Quiz' },
      { type: 'guided_practice', stage: 'apply', label: 'Reinforce Weak Spots' },
      { type: 'reflection', stage: 'reflect', label: 'Progress Check' },
    ]
  }

  if (condensed) {
    // Short session: skip explain/reflect
    return [
      { type: 'lesson', stage: 'understand', label: 'Learn' },
      { type: 'guided_practice', stage: 'apply', label: 'Practice' },
      { type: 'quiz', stage: 'prove', label: 'Quick Check' },
    ]
  }

  // Full learning flow
  const sequence = [
    { type: 'lesson', stage: 'understand', label: 'Learn the Concept' },
    { type: 'guided_practice', stage: 'apply', label: 'Guided Practice' },
  ]

  // Add challenge for higher difficulty or every other day
  if (difficulty >= 3 || dayNumber % 2 === 0) {
    sequence.push({ type: 'challenge', stage: 'struggle', label: 'Challenge' })
  }

  // Add AI interaction every 3rd day or high difficulty
  if (dayNumber % 3 === 0 || difficulty >= 4) {
    sequence.push({ type: 'ai_interaction', stage: 'explain', label: 'Explain & Debug' })
  }

  // Quiz to prove understanding
  sequence.push({ type: 'quiz', stage: 'prove', label: 'Check Understanding' })

  // Reflection at end of every day
  sequence.push({ type: 'reflection', stage: 'reflect', label: 'Reflect' })

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
  if (recentQuizScores.length >= 2) {
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


// ── Understanding Score ──────────────────────────────────────────────────────
// Goes beyond "did they complete it?" to "did they actually understand it?"

export function calculateUnderstandingScore(signals) {
  const {
    quizScore = 0,             // 0-100
    hintsUsed = 0,
    maxHints = 3,
    completionTimeRatio = 1,   // actual / expected
    reflectionQuality = 0,     // 0-100 (AI-graded)
    aiInteractionDepth = 0,    // 0-100
    challengeScore = 0,        // 0-100
    retryCount = 0,
  } = signals

  let score = 0

  // Quiz performance (30% weight)
  score += quizScore * 0.30

  // Challenge performance (25% weight)
  score += challengeScore * 0.25

  // Independence — fewer hints = better understanding (15%)
  const independenceScore = maxHints > 0
    ? Math.max(0, 100 - (hintsUsed / maxHints) * 100)
    : 100
  score += independenceScore * 0.15

  // Reflection quality (15%) — can they articulate what they learned?
  score += reflectionQuality * 0.15

  // AI interaction depth (10%) — meaningful engagement shows curiosity
  score += aiInteractionDepth * 0.10

  // Time factor (5%) — not too fast (skipping), not too slow (stuck)
  let timeFactor = 100
  if (completionTimeRatio < 0.3) timeFactor = 30     // Way too fast
  else if (completionTimeRatio < 0.5) timeFactor = 60
  else if (completionTimeRatio > 3) timeFactor = 50   // Struggling too much
  else if (completionTimeRatio > 2) timeFactor = 70
  score += timeFactor * 0.05

  // Penalty for excessive retries (shows guessing not understanding)
  if (retryCount > 3) score *= 0.85
  else if (retryCount > 1) score *= 0.95

  return Math.round(Math.max(0, Math.min(100, score)))
}

// ── Understanding level label ────────────────────────────────────────────────
export function getUnderstandingLevel(score) {
  if (score >= 90) return { label: 'Mastered', color: '#0ef5c2', icon: '🌟' }
  if (score >= 75) return { label: 'Strong', color: '#34D399', icon: '💪' }
  if (score >= 60) return { label: 'Developing', color: '#3B82F6', icon: '📈' }
  if (score >= 40) return { label: 'Emerging', color: '#F59E0B', icon: '🌱' }
  return { label: 'Needs Review', color: '#FF453A', icon: '🔄' }
}


// ── AI Interaction Types ─────────────────────────────────────────────────────
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
