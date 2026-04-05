export const COURSE_FINAL_EXAM_MAX_ATTEMPTS = 3
export const COURSE_FINAL_EXAM_PASS_SCORE = 80
export const COURSE_FINAL_EXAM_WEIGHT = 2

function clamp(value, min, max, fallback = min) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return fallback
  return Math.max(min, Math.min(max, numeric))
}

function titleCase(value = '') {
  return String(value)
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function unique(values = []) {
  return [...new Set((Array.isArray(values) ? values : []).filter(Boolean))]
}

function parseDateOnly(value) {
  if (!value) return null
  const parsed = new Date(`${value}T00:00:00`)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export function isCourseFinalExamTask(task = {}) {
  return Boolean(task?.isCourseFinalExam || task?._courseFinal || task?.type === 'final_exam')
}

export function getCourseFinalExamDayNumber(totalDays) {
  const plannedDays = Number(totalDays)
  if (!Number.isFinite(plannedDays) || plannedDays <= 0) return null
  return plannedDays + 1
}

export function filterRowsForCourseWindow(rows = [], totalDays = 0) {
  const plannedDays = Number(totalDays)
  if (!Number.isFinite(plannedDays) || plannedDays <= 0) {
    return Array.isArray(rows) ? rows : []
  }

  const finalExamDay = getCourseFinalExamDayNumber(plannedDays)
  return (Array.isArray(rows) ? rows : []).filter((row) => {
    const dayNumber = Number(row?.day_number)
    const tasks = Array.isArray(row?.tasks) ? row.tasks : []
    const hasFinalExam = tasks.some(isCourseFinalExamTask)
    if (!Number.isFinite(dayNumber)) return false
    if (hasFinalExam) return dayNumber === finalExamDay
    if (dayNumber <= plannedDays) return true
    return false
  })
}

export function getCourseVisibleDayCount(totalDays = 0, rows = []) {
  const plannedDays = Number(totalDays)
  const fallbackMax = Math.max(
    0,
    ...(Array.isArray(rows) ? rows : []).map((row) => Number(row?.day_number) || 0),
  )
  if (!Number.isFinite(plannedDays) || plannedDays <= 0) return fallbackMax

  const finalExamDay = getCourseFinalExamDayNumber(plannedDays)
  const hasFinalExam = (Array.isArray(rows) ? rows : []).some((row) => {
    const dayNumber = Number(row?.day_number)
    const tasks = Array.isArray(row?.tasks) ? row.tasks : []
    return dayNumber === finalExamDay && tasks.some(isCourseFinalExamTask)
  })

  return hasFinalExam ? finalExamDay : plannedDays
}

export function extractCourseModuleTitles(courseOutline, rows = []) {
  const moduleTitles = unique(
    (Array.isArray(courseOutline?.modules) ? courseOutline.modules : [])
      .map((module, index) => titleCase(module?.title || `Module ${index + 1}`))
      .filter(Boolean),
  )

  if (moduleTitles.length > 0) return moduleTitles

  const rowCount = (Array.isArray(rows) ? rows : []).length
  if (rowCount === 0) return []

  return Array.from({ length: Math.max(1, Math.ceil(rowCount / 5)) }, (_, index) => `Module ${index + 1}`)
}

export function extractCourseConcepts(courseOutline, rows = []) {
  const outlineConcepts = unique(
    (Array.isArray(courseOutline?.modules) ? courseOutline.modules : [])
      .flatMap((module) => Array.isArray(module?.days) ? module.days : [])
      .flatMap((day) => Array.isArray(day?.concepts) ? day.concepts : [])
      .map((concept) => titleCase(concept))
      .filter(Boolean),
  )

  if (outlineConcepts.length > 0) return outlineConcepts

  return unique(
    (Array.isArray(rows) ? rows : [])
      .flatMap((row) => {
        const topics = Array.isArray(row?.covered_topics) ? row.covered_topics : []
        const taskConcepts = (Array.isArray(row?.tasks) ? row.tasks : [])
          .flatMap((task) => {
            if (Array.isArray(task?._courseTopics)) return task._courseTopics
            if (Array.isArray(task?._concepts)) return task._concepts
            return task?._concept ? [task._concept] : []
          })
        return [...topics, ...taskConcepts]
      })
      .map((concept) => titleCase(concept))
      .filter(Boolean),
  )
}

function estimateFinalExamMinutes(totalDays, conceptCount) {
  const dayFactor = clamp(totalDays, 1, 90, 14)
  const conceptFactor = clamp(conceptCount, 6, 48, 12)
  return clamp(Math.round((dayFactor * 1.1) + (conceptFactor * 0.8)), 30, 60, 40)
}

export function buildCourseFinalExamTask({
  goalText = '',
  courseOutline = null,
  rows = [],
  totalDays = 0,
  existingTask = null,
} = {}) {
  const courseConcepts = extractCourseConcepts(courseOutline, rows)
  const moduleTitles = extractCourseModuleTitles(courseOutline, rows)
  const existingMeta = existingTask?._courseFinal || {}
  const dayNumber = getCourseFinalExamDayNumber(totalDays) || ((Number(totalDays) || 0) + 1)
  const title = goalText ? `Final Course Exam: ${goalText}` : 'Final Course Exam'

  return {
    id: existingTask?.id || `d${dayNumber}final`,
    type: 'final_exam',
    title,
    description: `Comprehensive assessment across ${moduleTitles.length > 0 ? moduleTitles.length : 'all'} course sections. You have ${COURSE_FINAL_EXAM_MAX_ATTEMPTS} total attempts.`,
    durationMin: estimateFinalExamMinutes(totalDays, courseConcepts.length),
    estimatedTimeMin: estimateFinalExamMinutes(totalDays, courseConcepts.length),
    effortWeight: 5,
    difficultyLevel: 4,
    difficultyLabel: 'Hard',
    _concept: 'Final Course Exam',
    _difficulty: 4,
    _courseTopics: courseConcepts,
    _courseModules: moduleTitles,
    _courseFinal: {
      maxAttempts: COURSE_FINAL_EXAM_MAX_ATTEMPTS,
      passScore: COURSE_FINAL_EXAM_PASS_SCORE,
      attemptsUsed: clamp(existingMeta.attemptsUsed, 0, COURSE_FINAL_EXAM_MAX_ATTEMPTS, 0),
      bestScore: clamp(existingMeta.bestScore, 0, 100, 0),
      lastScore: clamp(existingMeta.lastScore, 0, 100, 0),
      failedOut: Boolean(existingMeta.failedOut),
      passedAt: existingMeta.passedAt || null,
    },
    isCourseFinalExam: true,
    completed: Boolean(existingTask?.completed),
  }
}

export function buildCourseFinalExamPlanDay({
  goalText = '',
  courseOutline = null,
  rows = [],
  totalDays = 0,
  existingTask = null,
} = {}) {
  const finalExamDay = getCourseFinalExamDayNumber(totalDays)
  const visibleRows = filterRowsForCourseWindow(rows, totalDays)
    .filter((row) => Number(row?.day_number) <= Number(totalDays || 0))
    .sort((a, b) => (Number(a?.day_number) || 0) - (Number(b?.day_number) || 0))

  const lastRowDate = parseDateOnly(visibleRows[visibleRows.length - 1]?.task_date)
  const examDate = lastRowDate || new Date()
  examDate.setDate(examDate.getDate() + 1)

  return {
    day: finalExamDay,
    date: examDate.toISOString().split('T')[0],
    conceptName: 'Final Course Exam',
    tasks: [
      buildCourseFinalExamTask({ goalText, courseOutline, rows: visibleRows, totalDays, existingTask }),
    ],
    totalMinutes: estimateFinalExamMinutes(totalDays, extractCourseConcepts(courseOutline, rows).length),
    mode: 'goal',
  }
}

export function buildCourseCompletionRewards({ totalDays = 0, courseOutline = null, rows = [] } = {}) {
  const plannedDays = clamp(totalDays, 1, 90, Math.max(1, Array.isArray(rows) ? rows.length : 1))
  const moduleCount = Math.max(1, extractCourseModuleTitles(courseOutline, rows).length)

  return {
    xp: clamp((plannedDays * 15) + (moduleCount * 40), 250, 1000, 350),
    gems: clamp((plannedDays * 3) + (moduleCount * 12), 75, 250, 100),
  }
}

export function getCourseCompletionGrade(score = 0) {
  const numeric = clamp(score, 0, 100, 0)
  if (numeric >= 97) return 'A+'
  if (numeric >= 93) return 'A'
  if (numeric >= 90) return 'A-'
  if (numeric >= 87) return 'B+'
  if (numeric >= 83) return 'B'
  if (numeric >= 80) return 'B-'
  if (numeric >= 77) return 'C+'
  if (numeric >= 73) return 'C'
  if (numeric >= 70) return 'C-'
  if (numeric >= 67) return 'D+'
  if (numeric >= 63) return 'D'
  if (numeric >= 60) return 'D-'
  return 'F'
}
