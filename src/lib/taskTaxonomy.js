const CANONICAL_TYPE_ORDER = [
  'concept',
  'guided_practice',
  'challenge',
  'explain',
  'quiz',
  'recall',
  'reflect',
  'boss',
  'project',
  'final_exam',
]

export const CANONICAL_TASK_TYPES = [...CANONICAL_TYPE_ORDER]

export const LEGACY_TO_CANONICAL_TASK_TYPE = {
  concept: 'concept',
  lesson: 'concept',
  video: 'concept',
  reading: 'concept',

  guided_practice: 'guided_practice',
  practice: 'guided_practice',
  exercise: 'guided_practice',

  challenge: 'challenge',

  explain: 'explain',
  ai_interaction: 'explain',
  discussion: 'explain',

  quiz: 'quiz',

  recall: 'recall',
  flashcard: 'recall',
  review: 'recall',

  reflect: 'reflect',
  reflection: 'reflect',

  boss: 'boss',
  capstone: 'boss',

  project: 'project',
  final_exam: 'final_exam',
}

const TYPE_PROFILES = {
  concept: {
    label: 'Concept',
    actionLabel: 'Start Concept',
    icon: 'book',
    summary: 'Learn a new idea through explanation, a worked example, why it matters, and one concrete takeaway.',
    minMinutes: 8,
    maxMinutes: 18,
    minEffort: 1,
    maxEffort: 2,
  },
  guided_practice: {
    label: 'Practice',
    actionLabel: 'Start Practice',
    icon: 'dumbbell',
    summary: 'Practice with structure, partial support, and guided correction so the concept becomes usable.',
    minMinutes: 12,
    maxMinutes: 22,
    minEffort: 2,
    maxEffort: 3,
  },
  challenge: {
    label: 'Challenge',
    actionLabel: 'Begin Challenge',
    icon: 'challenge',
    summary: 'Apply the skill independently with less scaffolding and stronger evaluation of decision-making.',
    minMinutes: 15,
    maxMinutes: 30,
    minEffort: 3,
    maxEffort: 3,
  },
  explain: {
    label: 'Explain',
    actionLabel: 'Start Explain',
    icon: 'message',
    summary: 'Teach the concept back in your own words, compare ideas, and explain reasoning clearly.',
    minMinutes: 8,
    maxMinutes: 18,
    minEffort: 2,
    maxEffort: 2,
  },
  quiz: {
    label: 'Quiz',
    actionLabel: 'Take Quiz',
    icon: 'clipboard_check',
    summary: 'Check recall and understanding with scored questions and clear right-or-wrong outcomes.',
    minMinutes: 8,
    maxMinutes: 16,
    minEffort: 2,
    maxEffort: 2,
  },
  recall: {
    label: 'Recall',
    actionLabel: 'Start Recall',
    icon: 'layers',
    summary: 'Reinforce memory through retrieval, flashcards, and fast review loops before forgetting sets in.',
    minMinutes: 5,
    maxMinutes: 12,
    minEffort: 1,
    maxEffort: 1,
  },
  reflect: {
    label: 'Reflect',
    actionLabel: 'Start Reflection',
    icon: 'brain',
    summary: 'Reflect on what clicked, what still feels weak, and what to revisit next.',
    minMinutes: 5,
    maxMinutes: 10,
    minEffort: 1,
    maxEffort: 1,
  },
  boss: {
    label: 'Boss',
    actionLabel: 'Start Boss',
    icon: 'trophy',
    summary: 'Prove integrated mastery through a higher-pressure checkpoint that combines multiple skills.',
    minMinutes: 25,
    maxMinutes: 45,
    minEffort: 4,
    maxEffort: 4,
  },
  project: {
    label: 'Project',
    actionLabel: 'Start Project',
    icon: 'rocket',
    summary: 'Build a real artifact that turns learned concepts into proof of skill.',
    minMinutes: 40,
    maxMinutes: 120,
    minEffort: 5,
    maxEffort: 5,
  },
  final_exam: {
    label: 'Final Exam',
    actionLabel: 'Start Final Exam',
    icon: 'badge',
    summary: 'Validate cross-unit retention and readiness through a comprehensive end-of-course assessment.',
    minMinutes: 25,
    maxMinutes: 60,
    minEffort: 4,
    maxEffort: 5,
  },
}

const PRESENTATION_LABELS = {
  lesson: 'Lesson',
  video: 'Video',
  reading: 'Reading',
  practice: 'Practice',
  exercise: 'Exercise',
  ai_interaction: 'AI Coach',
  discussion: 'Discussion',
  flashcard: 'Flashcards',
  review: 'Review',
  reflection: 'Journal',
  capstone: 'Capstone',
}

const PRESENTATION_ICONS = {
  lesson: 'book',
  video: 'clapperboard',
  reading: 'scroll',
  practice: 'hammer',
  exercise: 'target',
  ai_interaction: 'message',
  discussion: 'message_question',
  flashcard: 'layers',
  review: 'repeat',
  reflection: 'brain',
  capstone: 'folder_kanban',
}

function clamp(value, min, max, fallback = min) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return fallback
  return Math.max(min, Math.min(max, numeric))
}

function normalizeString(value) {
  return String(value || '').trim().toLowerCase()
}

function isFinalExamLikeTask(task = {}) {
  return Boolean(task?.isCourseFinalExam || task?._courseFinal || normalizeString(task?.type) === 'final_exam')
}

export function getCanonicalTaskType(type, task = null) {
  if (isFinalExamLikeTask(task || {})) return 'final_exam'
  const normalized = normalizeString(type)
  return LEGACY_TO_CANONICAL_TASK_TYPE[normalized] || 'concept'
}

export function getTaskDifficultyLabel(difficultyLevel = 3) {
  const level = clamp(difficultyLevel, 1, 5, 3)
  if (level <= 2) return 'Easy'
  if (level === 3) return 'Medium'
  return 'Hard'
}

export function getTaskProfile(type) {
  return TYPE_PROFILES[getCanonicalTaskType(type)] || TYPE_PROFILES.concept
}

function inferPresentation(type, task = {}) {
  const explicit = normalizeString(task?.presentation)
  if (explicit && PRESENTATION_LABELS[explicit]) return explicit

  const normalized = normalizeString(type)
  const canonical = getCanonicalTaskType(normalized, task)
  if (normalized && normalized !== canonical && PRESENTATION_LABELS[normalized]) return normalized
  return ''
}

function buildFallbackTaskTitle(task = {}, canonicalType = 'concept', presentation = '', index = 0) {
  const explicitTitle = String(task?.title || '').trim()
  if (explicitTitle) return explicitTitle

  const profile = getTaskProfile(canonicalType)
  const conceptLabel = String(task?._concept || task?.concept || task?.topic || '').trim()
  const presentationLabel = getTaskPresentationLabel(presentation)
  const dayNumber = Number(task?.day_number ?? task?.dayNumber)

  if (conceptLabel) return `${profile.label}: ${conceptLabel}`
  if (presentationLabel) return `${profile.label} · ${presentationLabel}`
  if (Number.isFinite(dayNumber) && dayNumber > 0) return `${profile.label}: Day ${dayNumber}`
  return `${profile.label} Task ${index + 1}`
}

function buildFallbackTaskDescription(task = {}, canonicalType = 'concept', title = '') {
  const explicitDescription = String(task?.description || '').trim()
  if (explicitDescription) return explicitDescription

  const action = String(task?.action || '').trim()
  const outcome = String(task?.outcome || '').trim()
  const resourceTitle = String(task?.resourceTitle || '').trim()
  const profile = getTaskProfile(canonicalType)
  const subject = String(task?._concept || title || profile.label).trim()

  if (action && outcome) return `Action: ${action} Outcome: ${outcome}`
  if (action) return action
  if (outcome) return outcome
  if (resourceTitle) return `${profile.summary} Use ${resourceTitle} as your main reference for ${subject}.`
  return `${profile.summary} Focus on ${subject} and finish with one concrete takeaway.`
}

function deriveEstimatedTimeMin(task = {}, canonicalType = 'concept', difficultyLevel = 3) {
  const direct = clamp(task?.estimatedTimeMin, 0, 240, 0) || clamp(task?.estimated_minutes, 0, 240, 0)
  const duration = clamp(task?.durationMin, 0, 240, 0)
  if (direct > 0) return direct
  if (duration > 0) return duration

  const profile = getTaskProfile(canonicalType)
  const ratio = (clamp(difficultyLevel, 1, 5, 3) - 1) / 4
  return Math.round(profile.minMinutes + ((profile.maxMinutes - profile.minMinutes) * ratio))
}

function deriveEffortWeight(task = {}, canonicalType = 'concept', difficultyLevel = 3) {
  const existing = clamp(task?.effortWeight, 0, 5, 0)
  if (existing > 0) return existing

  const profile = getTaskProfile(canonicalType)
  if (profile.minEffort === profile.maxEffort) return profile.minEffort

  const ratio = (clamp(difficultyLevel, 1, 5, 3) - 1) / 4
  return clamp(Math.round(profile.minEffort + ((profile.maxEffort - profile.minEffort) * ratio)), 1, 5, profile.minEffort)
}

export function deriveTaskDifficultyLevel(task = {}, fallback = 3) {
  return clamp(
    task?.difficultyLevel ?? task?.difficulty_level ?? task?._difficulty ?? task?.difficulty,
    1,
    5,
    fallback,
  )
}

export function normalizeLearningTask(task = {}, index = 0) {
  const source = task && typeof task === 'object' ? task : {}
  const canonicalType = getCanonicalTaskType(source.type, source)
  const difficultyLevel = deriveTaskDifficultyLevel(source, canonicalType === 'final_exam' ? 4 : 3)
  const difficultyLabel = getTaskDifficultyLabel(difficultyLevel)
  const estimatedTimeMin = deriveEstimatedTimeMin(source, canonicalType, difficultyLevel)
  const effortWeight = deriveEffortWeight(source, canonicalType, difficultyLevel)
  const presentation = inferPresentation(source.type, source)
  const title = buildFallbackTaskTitle(source, canonicalType, presentation, index)
  const description = buildFallbackTaskDescription(source, canonicalType, title)

  const normalized = {
    ...source,
    id: source.id || `task-${index + 1}`,
    type: canonicalType,
    title,
    description,
    difficultyLevel,
    difficultyLabel,
    estimatedTimeMin,
    effortWeight,
    durationMin: estimatedTimeMin,
  }

  if (presentation) normalized.presentation = presentation
  else if (normalized.presentation) delete normalized.presentation

  return normalized
}

export function normalizeLearningTasks(tasks = []) {
  const seenIds = new Set()
  return (Array.isArray(tasks) ? tasks : []).map((task, index) => {
    const normalized = normalizeLearningTask(task, index)
    const baseId = String(normalized.id || `task-${index + 1}`)
    let nextId = baseId
    let suffix = 2
    while (seenIds.has(nextId)) {
      nextId = `${baseId}-${suffix}`
      suffix += 1
    }
    seenIds.add(nextId)
    return nextId === normalized.id ? normalized : { ...normalized, id: nextId }
  })
}

export function normalizeTaskRow(row = {}) {
  if (!row || typeof row !== 'object') return row
  const tasks = normalizeLearningTasks(row.tasks)
  const tasksCompleted = tasks.filter((task) => task.completed).length
  const completionStatus = tasks.length > 0 && tasksCompleted === tasks.length
    ? 'completed'
    : tasksCompleted > 0
      ? 'in_progress'
      : row.completion_status || row.completionStatus || 'not_started'

  return {
    ...row,
    tasks,
    tasks_completed: Math.max(Number(row.tasks_completed) || 0, tasksCompleted),
    completion_status: completionStatus,
  }
}

export function normalizeTaskRows(rows = []) {
  return (Array.isArray(rows) ? rows : []).map((row) => normalizeTaskRow(row))
}

export function getTaskPresentationLabel(presentation = '') {
  return PRESENTATION_LABELS[normalizeString(presentation)] || ''
}

export function getTaskPresentationIcon(presentation = '', fallback = 'book') {
  return PRESENTATION_ICONS[normalizeString(presentation)] || fallback
}

export function getTaskDisplayConfig(taskOrType = {}) {
  const task = typeof taskOrType === 'string'
    ? normalizeLearningTask({ type: taskOrType })
    : normalizeLearningTask(taskOrType)

  const profile = getTaskProfile(task.type)
  const presentationLabel = getTaskPresentationLabel(task.presentation)

  return {
    type: task.type,
    label: profile.label,
    actionLabel: profile.actionLabel,
    icon: presentationLabel
      ? getTaskPresentationIcon(task.presentation, profile.icon)
      : profile.icon,
    summary: profile.summary,
    presentation: task.presentation || '',
    presentationLabel,
    chipLabel: presentationLabel ? `${profile.label} · ${presentationLabel}` : profile.label,
    difficultyLevel: task.difficultyLevel,
    difficultyLabel: task.difficultyLabel,
    estimatedTimeMin: task.estimatedTimeMin,
    effortWeight: task.effortWeight,
  }
}

export function getTaskDisplayName(taskOrType = {}) {
  return getTaskDisplayConfig(taskOrType).chipLabel
}

export function getCanonicalTaskTypeCounts(tasks = []) {
  return normalizeLearningTasks(tasks).reduce((acc, task) => {
    acc[task.type] = (acc[task.type] || 0) + 1
    return acc
  }, {})
}
