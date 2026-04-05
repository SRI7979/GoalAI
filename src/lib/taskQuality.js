import { normalizeLearningTasks } from '@/lib/taskTaxonomy'

const GENERIC_TITLE_PATTERNS = [
  /^concept task\s*\d*$/i,
  /^day\s+\d+\s+task\s+\d+$/i,
  /^getting started$/i,
  /^core concept$/i,
  /^learn .+ - day \d+(\s*\(\d+\))?$/i,
  /^introduction to .+$/i,
]

const GENERIC_DESCRIPTION_PATTERNS = [
  /learn a new idea through explanation, a worked example, why it matters, and one concrete takeaway/i,
  /this lesson covers .+ let's explore/i,
  /we could not generate a custom lesson right now/i,
  /focus on .+ and finish with one concrete takeaway/i,
  /action:\s*learn one focused section on .+ outcome:\s*produce a short summary/i,
  /go deeper on .+ with targeted practice and one concrete output/i,
]

const GENERIC_TASK_SIGNATURES = [
  'concept task',
  'getting started',
  'core concept',
  'tap to preview',
]

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'as', 'at', 'be', 'by', 'for', 'from', 'how', 'in', 'into', 'is', 'it',
  'its', 'of', 'on', 'or', 'that', 'the', 'this', 'to', 'with', 'your',
])

function normalizeText(value = '') {
  return String(value || '')
    .trim()
    .toLowerCase()
}

export function normalizeComparableText(value = '') {
  return normalizeText(value)
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[^a-z0-9\s]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function tokenize(value = '') {
  return normalizeComparableText(value)
    .split(' ')
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token))
}

function tokenSimilarity(a = '', b = '') {
  const left = new Set(tokenize(a))
  const right = new Set(tokenize(b))
  if (left.size === 0 || right.size === 0) return 0

  let overlap = 0
  left.forEach((token) => {
    if (right.has(token)) overlap += 1
  })

  return overlap / Math.max(left.size, right.size)
}

export function titleLooksGeneric(title = '') {
  const normalized = String(title || '').trim()
  if (!normalized) return true
  return GENERIC_TITLE_PATTERNS.some((pattern) => pattern.test(normalized))
}

export function descriptionLooksGeneric(description = '') {
  const normalized = String(description || '').trim()
  if (!normalized) return true
  return GENERIC_DESCRIPTION_PATTERNS.some((pattern) => pattern.test(normalized))
}

export function taskLooksPlaceholder(task = {}) {
  const title = String(task?.title || '').trim()
  const description = String(task?.description || '').trim()
  if (titleLooksGeneric(title) || descriptionLooksGeneric(description)) return true

  const comparable = normalizeComparableText(`${title} ${description}`)
  return GENERIC_TASK_SIGNATURES.some((signature) => comparable.includes(signature))
}

export function analyzeTaskQuality(tasks = []) {
  const normalizedTasks = normalizeLearningTasks(tasks)
  const reasons = []

  if (normalizedTasks.length === 0) {
    reasons.push('empty_day')
    return { broken: true, reasons, normalizedTasks }
  }

  const titleMap = new Map()
  const descriptionMap = new Map()
  const presentationCounts = new Map()
  const typeCounts = new Map()
  let placeholderCount = 0

  normalizedTasks.forEach((task) => {
    const titleKey = normalizeComparableText(task.title)
    const descriptionKey = normalizeComparableText(task.description)
    titleMap.set(titleKey, (titleMap.get(titleKey) || 0) + 1)
    descriptionMap.set(descriptionKey, (descriptionMap.get(descriptionKey) || 0) + 1)
    if (task.presentation) {
      presentationCounts.set(task.presentation, (presentationCounts.get(task.presentation) || 0) + 1)
    }
    typeCounts.set(task.type, (typeCounts.get(task.type) || 0) + 1)
    if (taskLooksPlaceholder(task)) placeholderCount += 1
  })

  if (placeholderCount > 0) reasons.push('generic_placeholder_content')
  if ([...titleMap.values()].some((count) => count > 1)) reasons.push('duplicate_titles')
  if ([...descriptionMap.values()].some((count) => count > 1)) reasons.push('duplicate_descriptions')
  if ([...presentationCounts.values()].some((count) => count > 2)) reasons.push('presentation_repetition')

  const conceptCount = typeCounts.get('concept') || 0
  const uniqueTypeCount = typeCounts.size
  if (conceptCount >= 3 && uniqueTypeCount === 1) reasons.push('concept_only_day')

  for (let index = 0; index < normalizedTasks.length; index += 1) {
    const current = normalizedTasks[index]
    for (let compareIndex = index + 1; compareIndex < normalizedTasks.length; compareIndex += 1) {
      const compare = normalizedTasks[compareIndex]
      if (current.type === compare.type && tokenSimilarity(current.description, compare.description) >= 0.82) {
        reasons.push('near_duplicate_descriptions')
        index = normalizedTasks.length
        break
      }
    }
  }

  return {
    broken: reasons.length > 0,
    reasons: Array.from(new Set(reasons)),
    normalizedTasks,
    typeCounts: Object.fromEntries(typeCounts.entries()),
  }
}

export function isBrokenTaskRow(row = {}) {
  if (!row || typeof row !== 'object') return false
  const tasks = Array.isArray(row.tasks) ? row.tasks : []
  const incomplete = row.completion_status !== 'completed'
  if (!incomplete) return false
  return analyzeTaskQuality(tasks).broken
}
