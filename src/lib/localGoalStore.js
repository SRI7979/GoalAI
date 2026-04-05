import {
  buildDeterministicCourseOutline,
  buildExploreDayTask,
  buildFallbackConcepts,
  buildGoalPlanDayFromSequenceItem,
  needsSequenceDayRepair,
  preserveCompletedTasksOnRepair,
} from '@/lib/learningPlan'
import {
  buildCourseCompletionRewards,
  buildCourseFinalExamPlanDay,
  filterRowsForCourseWindow,
  getCourseCompletionGrade,
  isCourseFinalExamTask,
} from '@/lib/courseCompletion'
import { hydrateGoalCourseOutline } from '@/lib/courseOutlineStore'
import { buildPathOutlineTracker } from '@/lib/pathOutline'
import { generateDailyQuests, updateQuestProgress } from '@/lib/quests'
import { buildInventoryCountsFromTransactions, getClaimedModuleRewardIds, getModuleRewardReason } from '@/lib/shopInventory'
import { computeStreakUpdate, isStreakMilestone } from '@/lib/streak'
import { getStoredOwnedThemes, setStoredOwnedThemes } from '@/lib/appThemes'
import { getStoredMaxHearts, setStoredMaxHearts } from '@/lib/shopStorage'
import { GEM_AWARDS, GEM_SHOP_ITEMS, HEARTS_BASE, HEARTS_MAX_CAP } from '@/lib/tokens'
import { XP_MISSION_BONUS, XP_STREAK_7_BONUS, getLevelProgress, xpForTask } from '@/lib/xp'
import { getCanonicalTaskType, normalizeLearningTask, normalizeLearningTasks, normalizeTaskRows } from '@/lib/taskTaxonomy'

const LOCAL_GOAL_BUNDLE_KEY = 'pathai-local-goal-bundle'
const LOCAL_GOAL_BUNDLE_VERSION = 2
const PERFECT_WEEK_BONUS = 50
const CALENDAR_REWARDS = [5, 8, 10, 12, 15, 20, 30]
const THEME_ITEM_IDS = [
  'themeOcean',
  'themeSunset',
  'themeForest',
  'themeMidnight',
  'themeRose',
  'themeAurora',
  'themeEmber',
  'themeMonolith',
]
const INELIGIBLE_REROLL_TYPES = new Set(['project', 'boss', 'quiz', 'final_exam'])
const REROLL_TYPE_FAMILIES = {
  concept: ['concept', 'recall', 'explain'],
  guided_practice: ['guided_practice', 'explain', 'challenge'],
  challenge: ['guided_practice', 'explain', 'recall'],
  explain: ['explain', 'concept', 'recall'],
  recall: ['recall', 'concept', 'explain'],
  reflect: ['reflect', 'recall', 'concept'],
}
const REROLL_PRESENTATIONS = {
  concept: ['lesson', 'reading', 'video'],
  guided_practice: ['practice', 'exercise'],
  explain: ['ai_interaction', 'discussion'],
  recall: ['review', 'flashcard'],
}

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function safeParseJson(value) {
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

function clamp(value, min, max, fallback = min) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return fallback
  return Math.max(min, Math.min(max, numeric))
}

function getWeekStartStr() {
  const date = new Date()
  const day = date.getDay()
  const offset = day === 0 ? -6 : 1 - day
  const monday = new Date(date)
  monday.setDate(date.getDate() + offset)
  return monday.toISOString().split('T')[0]
}

function getCalendarDayIndex() {
  const day = new Date().getDay()
  return day === 0 ? 6 : day - 1
}

function normalizeGoalText(value = '') {
  return String(value).trim() || 'My Goal'
}

function normalizeKnowledge(value = '') {
  if (Array.isArray(value)) return value.filter(Boolean).join(', ')
  return String(value || '')
}

function getLocalGoalId(goalText = '') {
  const slug = normalizeGoalText(goalText)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return `local-goal-${slug || 'goal'}`
}

function buildDefaultProgress({ goalId = null, userId = 'pathai-local-user', totalDays = 1 } = {}) {
  return {
    goal_id: goalId,
    user_id: userId,
    total_xp: 0,
    current_streak: 0,
    longest_streak: 0,
    freeze_count: 0,
    hearts_remaining: HEARTS_BASE,
    hearts_refill_at: null,
    total_days: Math.max(1, Number(totalDays) || 1),
    gems: 0,
    gems_earned_total: 0,
    xp_boost_until: null,
    reward_calendar: { week_start: getWeekStartStr(), days_claimed: [] },
    last_activity_date: null,
    last_event_date: null,
  }
}

function countCompletedTasks(tasks) {
  return (Array.isArray(tasks) ? tasks : []).filter((task) => task?.completed).length
}

function deriveTaskRowStatus(tasks, fallback = 'pending') {
  const safeTasks = Array.isArray(tasks) ? tasks : []
  const completedCount = countCompletedTasks(safeTasks)
  if (safeTasks.length > 0 && completedCount === safeTasks.length) return 'completed'
  if (completedCount > 0) return 'in_progress'
  return fallback
}

function coerceRewardCalendar(calendar) {
  const weekStart = getWeekStartStr()
  if (!calendar || typeof calendar !== 'object') {
    return { week_start: weekStart, days_claimed: [] }
  }

  const daysClaimed = Array.isArray(calendar.days_claimed)
    ? calendar.days_claimed
      .map((value) => clamp(value, 0, 6, -1))
      .filter((value) => value >= 0)
    : []

  if (calendar.week_start !== weekStart) {
    return { week_start: weekStart, days_claimed: [] }
  }

  return {
    week_start: weekStart,
    days_claimed: [...new Set(daysClaimed)].sort((left, right) => left - right),
  }
}

function coerceGemTransactions(rows = []) {
  return (Array.isArray(rows) ? rows : [])
    .filter((row) => row && typeof row === 'object')
    .map((row, index) => ({
      id: row.id || `local-txn-${index + 1}`,
      amount: Number(row.amount) || 0,
      reason: String(row.reason || '').trim(),
      created_at: row.created_at || new Date().toISOString(),
      goal_id: row.goal_id || null,
      user_id: row.user_id || null,
    }))
}

function getOwnedThemeIdsFromTransactions(rows = []) {
  return [...new Set(
    coerceGemTransactions(rows)
      .map((row) => String(row.reason || ''))
      .filter((reason) => reason.startsWith('shop_theme'))
      .map((reason) => reason.replace(/^shop_/, ''))
      .filter((themeId) => THEME_ITEM_IDS.includes(themeId)),
  )]
}

function getMergedOwnedThemes(rows = []) {
  return [...new Set([...getStoredOwnedThemes(), ...getOwnedThemeIdsFromTransactions(rows)])]
}

function buildTransaction({ userId, goalId, amount = 0, reason = '' }) {
  return {
    id: `local-txn-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    user_id: userId,
    goal_id: goalId,
    amount: Number(amount) || 0,
    reason: String(reason || '').trim(),
    created_at: new Date().toISOString(),
  }
}

function replaceRow(rows = [], nextRow) {
  const rowMap = new Map()
  normalizeTaskRows(rows).forEach((row) => {
    rowMap.set(Number(row.day_number), row)
  })
  if (nextRow) {
    rowMap.set(Number(nextRow.day_number), normalizeTaskRows([nextRow])[0])
  }
  return [...rowMap.values()].sort((left, right) => (Number(left.day_number) || 0) - (Number(right.day_number) || 0))
}

function buildLocalRowFromPlanDay({ bundle, planDay, existingRow = null }) {
  const tasks = normalizeLearningTasks(Array.isArray(planDay?.tasks) ? planDay.tasks : [])
  const dayNumber = Number(planDay?.day) || Number(existingRow?.day_number) || 1
  const quests = Array.isArray(existingRow?.quests) && existingRow.quests.length > 0
    ? existingRow.quests
    : generateDailyQuests(dayNumber, tasks.length || 3)

  return {
    id: existingRow?.id || `local-row-${dayNumber}`,
    goal_id: bundle.goal.id,
    user_id: bundle.userId,
    day_number: dayNumber,
    task_date: planDay?.date || existingRow?.task_date || new Date().toISOString().split('T')[0],
    tasks,
    covered_topics: Array.isArray(planDay?.coveredTopics) && planDay.coveredTopics.length > 0
      ? planDay.coveredTopics
      : [planDay?.conceptName || existingRow?.covered_topics?.[0] || `Day ${dayNumber}`],
    completion_status: deriveTaskRowStatus(tasks, existingRow?.completion_status || 'pending'),
    tasks_completed: countCompletedTasks(tasks),
    mode: planDay?.mode || existingRow?.mode || bundle.goal.mode || 'goal',
    total_minutes: Number(planDay?.totalMinutes) || Number(existingRow?.total_minutes) || 0,
    quests,
    quests_completed: quests.filter((quest) => quest.completed).length,
    created_at: existingRow?.created_at || new Date().toISOString(),
  }
}

function getBundleContext(bundle) {
  const safeBundle = hydrateLocalGoalBundle(bundle)
  if (!safeBundle?.goal) return null
  return {
    ...safeBundle,
    goal: hydrateGoalCourseOutline(safeBundle.goal),
  }
}

async function repairRepeatedLocalRowsInPlace(bundle) {
  if (!bundle?.goal || bundle.goal.mode === 'explore' || !bundle.goal.course_outline) {
    return { repairedCount: 0, rows: normalizeTaskRows(bundle?.rows || []) }
  }

  const claimedModuleRewardIds = getClaimedModuleRewardIds(bundle.gemTransactions)
  let workingRows = normalizeTaskRows(bundle.rows)
  const scopedRows = filterRowsForCourseWindow(
    workingRows,
    Number(bundle.progress.total_days) || Number(bundle.goal.total_days) || workingRows.length,
  )
  const tracker = buildPathOutlineTracker({
    courseOutline: bundle.goal.course_outline,
    rows: scopedRows,
    goalText: bundle.goal.goal_text || '',
    claimedModuleRewardIds,
  })
  const sequenceByDay = new Map(
    (Array.isArray(tracker.sequenceItems) ? tracker.sequenceItems : [])
      .map((item) => [Number(item?.dayNumber), item]),
  )
  const candidates = scopedRows.filter((row) => (
    row?.completion_status !== 'completed'
    && needsSequenceDayRepair(row, sequenceByDay.get(Number(row.day_number)))
  ))

  if (candidates.length === 0) {
    return { repairedCount: 0, rows: workingRows }
  }

  let repairedCount = 0
  for (const row of candidates) {
    const item = sequenceByDay.get(Number(row.day_number))
    if (!item || item.type !== 'unit') continue

    const planDay = await buildGoalPlanDayFromSequenceItem({
      goalRow: {
        ...bundle.goal,
        course_outline: bundle.goal.course_outline,
      },
      item,
      knowledge: normalizeKnowledge(bundle.goal.constraints),
      openaiApiKey: null,
      adaptiveProfile: null,
      existingRows: workingRows,
      generationPhase: 'repair',
    })

    const repairedTasks = preserveCompletedTasksOnRepair(row.tasks, planDay.tasks)
    const repairedRow = buildLocalRowFromPlanDay({
      bundle: {
        ...bundle,
        rows: workingRows,
      },
      planDay: {
        ...planDay,
        tasks: repairedTasks,
      },
      existingRow: row,
    })

    workingRows = replaceRow(workingRows, repairedRow)
    repairedCount += 1
  }

  if (repairedCount > 0) {
    bundle.rows = workingRows
  }

  return {
    repairedCount,
    rows: workingRows,
  }
}

function buildExploreKnowledge(goal) {
  return normalizeKnowledge(goal?.constraints)
}

function getFallbackExploreConcept(goalText, rows = []) {
  const covered = new Set(
    normalizeTaskRows(rows)
      .flatMap((row) => Array.isArray(row.covered_topics) ? row.covered_topics : [])
      .map((value) => String(value || '').trim())
      .filter(Boolean),
  )

  const candidates = buildFallbackConcepts(goalText, Math.max(rows.length + 6, 8))
  return candidates.find((concept) => !covered.has(concept?.name)) || candidates[0]
}

function buildLocalRerollTask(originalTask = {}, concept = '', goalText = '') {
  const normalizedOriginal = normalizeLearningTask(originalTask)
  const allowedTypes = REROLL_TYPE_FAMILIES[normalizedOriginal.type] || ['concept', 'recall', 'explain']
  const nextType = allowedTypes[0]
  const presentations = REROLL_PRESENTATIONS[nextType] || []
  const lowerConcept = String(concept || normalizedOriginal.title || 'the concept').toLowerCase()

  return normalizeLearningTask({
    ...normalizedOriginal,
    id: `reroll-${String(originalTask?.id || 'task')}-${Date.now()}`,
    type: nextType,
    presentation: presentations[0] || normalizedOriginal.presentation || '',
    title: `Alternate ${concept || normalizedOriginal.title || 'task'}`,
    description: `Re-approach ${lowerConcept} from a different angle that still moves ${goalText || 'your goal'} forward.`,
    durationMin: clamp(
      Number(normalizedOriginal.estimatedTimeMin || normalizedOriginal.durationMin) || 15,
      8,
      45,
      15,
    ),
    completed: false,
  })
}

function persistBundle(bundle) {
  const hydrated = hydrateLocalGoalBundle(bundle)
  if (!canUseStorage() || !hydrated) return null
  try {
    window.localStorage.setItem(LOCAL_GOAL_BUNDLE_KEY, JSON.stringify(hydrated))
    return hydrated
  } catch {
    return null
  }
}

function mutateBundle(userId, goalId, mutator) {
  const bundle = getBundleContext(getLocalGoalBundle(userId))
  if (!bundle?.goal) return { ok: false, error: 'Local goal not found' }
  if (goalId && bundle.goal.id !== goalId) return { ok: false, error: 'Active local goal does not match request' }

  const result = mutator(bundle)
  if (result && typeof result.then === 'function') {
    return result.then((resolved) => {
      if (resolved?.ok === false) return resolved
      persistBundle(bundle)
      return resolved
    })
  }

  if (result?.ok === false) return result
  persistBundle(bundle)
  return result
}

async function generateNextLocalDayInternal(bundle) {
  const context = bundle
  if (!context?.goal) return { ok: false, error: 'Local goal not found' }

  await repairRepeatedLocalRowsInPlace(context)

  const rows = normalizeTaskRows(context.rows)
  const claimedModuleRewardIds = getClaimedModuleRewardIds(context.gemTransactions)
  const scopedRows = filterRowsForCourseWindow(rows, Number(context.progress.total_days) || Number(context.goal.total_days) || rows.length)

  if (context.goal.mode === 'explore') {
    const nextDayNumber = Math.max(0, ...rows.map((row) => Number(row.day_number) || 0)) + 1
    const existingNext = rows.find((row) => Number(row.day_number) === nextDayNumber && row.completion_status !== 'completed')
    if (existingNext) {
      return { ok: true, generated: false, reason: 'next_item_ready', startDay: nextDayNumber, rows: [existingNext] }
    }

    const nextConcept = getFallbackExploreConcept(context.goal.goal_text, rows)
    const minsPerDay = Number(context.goal.weekday_mins) || 30
    const planDay = await buildExploreDayTask(
      context.goal.goal_text,
      nextConcept,
      minsPerDay,
      nextDayNumber,
      { knowledge: buildExploreKnowledge(context.goal), openaiApiKey: null, generationPhase: 'next_day' },
    )
    const nextRow = buildLocalRowFromPlanDay({ bundle: context, planDay })
    context.rows = replaceRow(context.rows, nextRow)
    context.progress.total_days = Math.max(Number(context.progress.total_days) || 0, nextDayNumber)
    return { ok: true, generated: true, reason: 'explore_day_created', startDay: nextDayNumber, rows: [nextRow] }
  }

  const tracker = buildPathOutlineTracker({
    courseOutline: context.goal.course_outline,
    rows: scopedRows,
    goalText: context.goal.goal_text || '',
    claimedModuleRewardIds,
  })

  if (tracker.courseCompleted) {
    return { ok: true, generated: false, reason: 'course_finished', startDay: null, rows: [] }
  }

  if (tracker.currentItemKind === 'final_exam') {
    if (tracker.currentGeneratedRow?.completion_status === 'completed') {
      return { ok: true, generated: false, reason: 'course_finished', startDay: tracker.finalExamDayNumber, rows: [] }
    }
    if (tracker.currentGeneratedRow) {
      return {
        ok: true,
        generated: false,
        reason: 'final_exam_ready',
        startDay: tracker.finalExamDayNumber,
        rows: [tracker.currentGeneratedRow],
      }
    }

    const reusableExamRow = rows.find((row) => Number(row.day_number) === Number(tracker.finalExamDayNumber)) || null
    const planDay = buildCourseFinalExamPlanDay({
      goalText: context.goal.goal_text,
      courseOutline: context.goal.course_outline,
      rows: scopedRows,
      totalDays: Number(context.progress.total_days) || Number(context.goal.total_days) || tracker.plannedDayCount,
      existingTask: Array.isArray(reusableExamRow?.tasks)
        ? reusableExamRow.tasks.find(isCourseFinalExamTask) || reusableExamRow.tasks[0] || null
        : null,
    })
    const nextRow = buildLocalRowFromPlanDay({ bundle: context, planDay, existingRow: reusableExamRow })
    context.rows = replaceRow(context.rows, nextRow)
    return {
      ok: true,
      generated: true,
      reason: 'final_exam_created',
      startDay: planDay.day,
      rows: [nextRow],
    }
  }

  if (tracker.currentGeneratedRow) {
    return {
      ok: true,
      generated: false,
      reason: 'next_item_ready',
      startDay: tracker.currentDayNumber,
      rows: [tracker.currentGeneratedRow],
    }
  }

  const nextItem = tracker.sequenceItems.find((item) => item.id === tracker.currentItemId) || null
  if (!nextItem) return { ok: true, generated: false, reason: 'course_boundary_reached', startDay: null, rows: [] }

  const planDay = await buildGoalPlanDayFromSequenceItem({
    goalRow: {
      ...context.goal,
      course_outline: context.goal.course_outline,
    },
    item: nextItem,
    knowledge: normalizeKnowledge(context.goal.constraints),
    openaiApiKey: null,
    adaptiveProfile: null,
    existingRows: rows,
    generationPhase: 'next_day',
  })

  const existingRow = rows.find((row) => Number(row.day_number) === Number(nextItem.dayNumber)) || null
  const nextRow = buildLocalRowFromPlanDay({ bundle: context, planDay, existingRow })
  context.rows = replaceRow(context.rows, nextRow)
  return {
    ok: true,
    generated: true,
    reason: nextItem.type === 'project' ? 'project_day_created' : 'unit_day_created',
    startDay: nextItem.dayNumber,
    rows: [nextRow],
  }
}

export function isLocalAccessUser(user) {
  return Boolean(
    user?.id === 'pathai-local-user'
    || user?.app_metadata?.provider === 'local'
    || user?.is_local_access === true,
  )
}

export function hydrateLocalGoalBundle(bundle) {
  if (!bundle || typeof bundle !== 'object') return null

  const goal = bundle.goal ? hydrateGoalCourseOutline(bundle.goal) : null
  const userId = bundle.userId || goal?.user_id || bundle.progress?.user_id || 'pathai-local-user'
  const rows = normalizeTaskRows(bundle.rows || [])
  const plannedDays = Math.max(
    1,
    Number(bundle?.progress?.total_days) || 0,
    Number(goal?.total_days) || 0,
    rows.reduce((max, row) => Math.max(max, Number(row?.day_number) || 0), 0),
  )
  const progress = {
    ...buildDefaultProgress({ goalId: goal?.id || bundle.progress?.goal_id || null, userId, totalDays: plannedDays }),
    ...(bundle.progress || {}),
  }

  progress.goal_id = goal?.id || progress.goal_id || null
  progress.user_id = userId
  progress.total_days = plannedDays
  progress.total_xp = Math.max(0, Number(progress.total_xp) || 0)
  progress.current_streak = Math.max(0, Number(progress.current_streak) || 0)
  progress.longest_streak = Math.max(progress.current_streak, Number(progress.longest_streak) || 0)
  progress.freeze_count = Math.max(0, Number(progress.freeze_count) || 0)
  progress.hearts_remaining = clamp(progress.hearts_remaining, HEARTS_BASE, HEARTS_MAX_CAP, HEARTS_BASE)
  progress.gems = Math.max(0, Number(progress.gems) || 0)
  progress.gems_earned_total = Math.max(0, Number(progress.gems_earned_total) || 0)
  progress.reward_calendar = coerceRewardCalendar(progress.reward_calendar)
  progress.last_activity_date = progress.last_activity_date || progress.last_event_date || null
  progress.last_event_date = progress.last_event_date || progress.last_activity_date || null

  return {
    version: LOCAL_GOAL_BUNDLE_VERSION,
    userId,
    goal,
    rows,
    progress,
    conceptMastery: Array.isArray(bundle.conceptMastery) ? bundle.conceptMastery : [],
    achievements: Array.isArray(bundle.achievements) ? bundle.achievements : [],
    gemTransactions: coerceGemTransactions(bundle.gemTransactions),
  }
}

export function getLocalGoalBundle(userId = null) {
  if (!canUseStorage()) return null

  const bundle = hydrateLocalGoalBundle(safeParseJson(window.localStorage.getItem(LOCAL_GOAL_BUNDLE_KEY)))
  if (!bundle) return null
  if (userId && bundle.userId && bundle.userId !== userId) return null
  return bundle
}

export async function getLocalGoalBundleWithRepairs(userId = null) {
  const bundle = getBundleContext(getLocalGoalBundle(userId))
  if (!bundle?.goal) return bundle

  const repairResult = await repairRepeatedLocalRowsInPlace(bundle)
  if (repairResult.repairedCount > 0 || bundle.goal?.course_outline?._pathai?.upgradedFallbackDays) {
    return persistBundle(bundle)
  }
  return bundle
}

export function clearLocalGoalBundle() {
  if (!canUseStorage()) return
  try { window.localStorage.removeItem(LOCAL_GOAL_BUNDLE_KEY) } catch {}
}

export function saveLocalGoalBundle(bundle) {
  return persistBundle(bundle)
}

export async function createLocalGoalBundle({
  user,
  goalText,
  mode = 'goal',
  days = 30,
  weekdayMins = 30,
  weekendMins = 45,
  knowledge = '',
  recommendedLevel = 'Beginner',
  diagnosticScore = 0,
  pace = 'balanced',
  pathStyle = 'goal',
} = {}) {
  const normalizedGoal = normalizeGoalText(goalText)
  const userId = user?.id || 'pathai-local-user'
  const createdAt = new Date().toISOString()
  const goalId = getLocalGoalId(normalizedGoal)

  let goal
  let rows

  if (mode === 'explore') {
    const [firstConcept] = buildFallbackConcepts(normalizedGoal, 5)
    const firstDay = await buildExploreDayTask(normalizedGoal, firstConcept, weekdayMins, 1, {
      knowledge,
      openaiApiKey: null,
      generationPhase: 'initial_day',
    })

    rows = [{
      id: 'local-row-1',
      goal_id: goalId,
      user_id: userId,
      day_number: 1,
      task_date: firstDay.date,
      tasks: firstDay.tasks,
      covered_topics: [firstDay.conceptName],
      completion_status: 'pending',
      tasks_completed: 0,
      mode: 'explore',
      total_minutes: firstDay.totalMinutes,
      quests: generateDailyQuests(1, Array.isArray(firstDay.tasks) ? firstDay.tasks.length : 3),
      quests_completed: 0,
      created_at: createdAt,
    }]

    goal = {
      id: goalId,
      user_id: userId,
      goal_text: normalizedGoal,
      mode: 'explore',
      status: 'active',
      created_at: createdAt,
      deadline: null,
      weekday_mins: weekdayMins,
      weekend_mins: weekendMins,
      constraints: [
        `Recommended level: ${recommendedLevel}`,
        `Diagnostic score: ${diagnosticScore}`,
        `Pace: ${pace}`,
        `Path style: ${pathStyle}`,
        'Local fallback mode',
      ],
      total_days: 0,
      course_outline: null,
    }
  } else {
    const averageMinutes = Math.round((((Number(weekdayMins) || 30) * 5) + ((Number(weekendMins) || 45) * 2)) / 7)
    const courseOutline = buildDeterministicCourseOutline({
      goal: normalizedGoal,
      knowledge,
      days,
      minutesPerDay: averageMinutes,
      status: 'ready',
    })
    const tracker = buildPathOutlineTracker({
      courseOutline,
      rows: [],
      goalText: normalizedGoal,
    })
    const firstItem = tracker.sequenceItems.find((item) => item.id === tracker.currentItemId) || tracker.sequenceItems[0]
    const firstDay = await buildGoalPlanDayFromSequenceItem({
      goalRow: {
        goal_text: normalizedGoal,
        weekday_mins: weekdayMins,
        weekend_mins: weekendMins,
        course_outline: courseOutline,
      },
      item: firstItem,
      knowledge,
      openaiApiKey: null,
      adaptiveProfile: null,
      existingRows: [],
      generationPhase: 'initial_day',
    })

    rows = [{
      id: 'local-row-1',
      goal_id: goalId,
      user_id: userId,
      day_number: firstDay.day,
      task_date: firstDay.date,
      tasks: firstDay.tasks,
      covered_topics: firstDay.coveredTopics,
      completion_status: 'pending',
      tasks_completed: 0,
      mode: 'goal',
      total_minutes: firstDay.totalMinutes,
      quests: generateDailyQuests(1, Array.isArray(firstDay.tasks) ? firstDay.tasks.length : 3),
      quests_completed: 0,
      created_at: createdAt,
    }]

    goal = hydrateGoalCourseOutline({
      id: goalId,
      user_id: userId,
      goal_text: normalizedGoal,
      mode: 'goal',
      status: 'active',
      created_at: createdAt,
      deadline: null,
      weekday_mins: weekdayMins,
      weekend_mins: weekendMins,
      constraints: [
        `Recommended level: ${recommendedLevel}`,
        `Diagnostic score: ${diagnosticScore}`,
        `Pace: ${pace}`,
        `Path style: ${pathStyle}`,
        'Local fallback mode',
      ],
      total_days: tracker.plannedDayCount || Number(days) || 30,
      course_outline: courseOutline,
    })
  }

  const bundle = hydrateLocalGoalBundle({
    version: LOCAL_GOAL_BUNDLE_VERSION,
    userId,
    goal,
    rows,
    progress: buildDefaultProgress({
      goalId: goal.id,
      userId,
      totalDays: Number(goal.total_days) || rows.length || 1,
    }),
    conceptMastery: [],
    achievements: [],
    gemTransactions: [],
  })

  saveLocalGoalBundle(bundle)
  return bundle
}

export async function completeLocalTask({
  userId = 'pathai-local-user',
  goalId,
  taskRowId,
  taskId,
  accuracy = null,
  correctCount = null,
  questionCount = null,
} = {}) {
  return mutateBundle(userId, goalId, async (bundle) => {
    const rowIndex = bundle.rows.findIndex((row) => String(row.id) === String(taskRowId))
    if (rowIndex < 0) return { ok: false, error: 'Task day not found' }

    const row = normalizeTaskRows([bundle.rows[rowIndex]])[0]
    const currentTasks = normalizeLearningTasks(row.tasks)
    const taskIndex = currentTasks.findIndex((task) => String(task.id) === String(taskId))
    if (taskIndex < 0) return { ok: false, error: 'Task not found in this day plan' }

    const targetTask = currentTasks[taskIndex]
    const alreadyCompleted = Boolean(targetTask.completed)
    const isCourseFinalExam = isCourseFinalExamTask(targetTask)
    const canonicalTaskType = getCanonicalTaskType(targetTask.type, targetTask)
    const existingFinalMeta = targetTask?._courseFinal || {}
    const examScore = Number.isFinite(accuracy)
      ? clamp(accuracy, 0, 100, 0)
      : (Number.isFinite(correctCount) && Number.isFinite(questionCount) && Number(questionCount) > 0
        ? clamp(Math.round((Number(correctCount) / Number(questionCount)) * 100), 0, 100, 0)
        : 0)
    const examMaxAttempts = clamp(existingFinalMeta.maxAttempts, 1, 10, 3)
    const examPassScore = clamp(existingFinalMeta.passScore, 50, 100, 80)
    const examAttemptsUsed = alreadyCompleted
      ? clamp(existingFinalMeta.attemptsUsed, 0, examMaxAttempts, 0)
      : clamp((existingFinalMeta.attemptsUsed || 0) + 1, 0, examMaxAttempts, 1)
    const examBestScore = Math.max(clamp(existingFinalMeta.bestScore, 0, 100, 0), examScore)
    const finalExamPassed = !isCourseFinalExam || alreadyCompleted || examScore >= examPassScore
    const finalExamFailedOut = Boolean(isCourseFinalExam && !alreadyCompleted && !finalExamPassed && examAttemptsUsed >= examMaxAttempts)

    let updatedTasks = [...currentTasks]
    if (isCourseFinalExam) {
      updatedTasks[taskIndex] = normalizeLearningTask({
        ...targetTask,
        _courseFinal: {
          ...existingFinalMeta,
          maxAttempts: examMaxAttempts,
          passScore: examPassScore,
          attemptsUsed: examAttemptsUsed,
          bestScore: examBestScore,
          lastScore: examScore,
          failedOut: finalExamFailedOut,
          passedAt: finalExamPassed && !alreadyCompleted ? new Date().toISOString() : existingFinalMeta.passedAt || null,
        },
        completed: finalExamPassed ? true : false,
      })
    } else {
      updatedTasks[taskIndex] = normalizeLearningTask({
        ...targetTask,
        completed: true,
      })
    }

    let tasksCompleted = countCompletedTasks(updatedTasks)
    let completionStatus = deriveTaskRowStatus(updatedTasks, row.completion_status || 'pending')

    if (isCourseFinalExam && !finalExamPassed && !alreadyCompleted) {
      const failedRow = {
        ...row,
        tasks: updatedTasks,
        tasks_completed: tasksCompleted,
        completion_status: completionStatus,
      }
      bundle.rows[rowIndex] = failedRow
      return {
        ok: true,
        alreadyCompleted: false,
        tasksCompleted,
        completionStatus,
        missionComplete: false,
        xpEarned: 0,
        taskXp: 0,
        missionBonusXp: 0,
        streakBonusXp: 0,
        xpBoosted: false,
        newTotalXp: bundle.progress.total_xp,
        levelUp: null,
        streakState: {
          current: Number(bundle.progress.current_streak) || 0,
          longest: Number(bundle.progress.longest_streak) || 0,
          broken: false,
          milestone: false,
        },
        gemsEarned: 0,
        newGemTotal: Number(bundle.progress.gems) || 0,
        questUpdate: null,
        challengeUpdate: null,
        newBadges: [],
        nextResult: null,
        finalExamPassed: false,
        finalExam: {
          score: examScore,
          passScore: examPassScore,
          attemptsUsed: examAttemptsUsed,
          attemptsRemaining: Math.max(0, examMaxAttempts - examAttemptsUsed),
          maxAttempts: examMaxAttempts,
          bestScore: examBestScore,
          failedOut: finalExamFailedOut,
        },
        updatedTasks,
        courseCompleted: false,
        courseCompletion: null,
        warnings: [],
      }
    }

    const missionJustCompleted = completionStatus === 'completed' && row.completion_status !== 'completed'
    let xpEarned = alreadyCompleted ? 0 : xpForTask(targetTask)
    let missionBonusXp = 0
    let streakBonusXp = 0
    let gemsEarned = 0
    let courseRewardXp = 0
    let courseRewardGems = 0
    let xpBoosted = false

    if (missionJustCompleted && !alreadyCompleted) {
      missionBonusXp = XP_MISSION_BONUS
      xpEarned += missionBonusXp
    }

    const streakUpdate = computeStreakUpdate({
      lastActivityDate: bundle.progress.last_activity_date,
      currentStreak: Number(bundle.progress.current_streak) || 0,
      longestStreak: Number(bundle.progress.longest_streak) || 0,
    })

    if (!alreadyCompleted && streakUpdate.streakChanged && !streakUpdate.broken && isStreakMilestone(streakUpdate.newStreak)) {
      streakBonusXp = XP_STREAK_7_BONUS
      xpEarned += streakBonusXp
    }

    const boostUntil = bundle.progress.xp_boost_until ? new Date(bundle.progress.xp_boost_until) : null
    xpBoosted = Boolean(boostUntil && boostUntil > new Date())
    if (xpBoosted && !alreadyCompleted) {
      xpEarned *= 2
    }

    if (isCourseFinalExam && finalExamPassed && !alreadyCompleted) {
      const rewards = buildCourseCompletionRewards({
        totalDays: Number(bundle.progress.total_days) || Math.max(1, (Number(row.day_number) || 1) - 1),
        courseOutline: bundle.goal.course_outline,
        rows: filterRowsForCourseWindow(bundle.rows, Number(bundle.progress.total_days) || 0),
      })
      courseRewardXp = rewards.xp
      courseRewardGems = rewards.gems
      xpEarned += courseRewardXp
      gemsEarned += courseRewardGems
    }

    if (!alreadyCompleted) {
      gemsEarned += GEM_AWARDS.task
      if (missionJustCompleted) gemsEarned += GEM_AWARDS.mission
      if (streakUpdate.streakChanged && !streakUpdate.broken && isStreakMilestone(streakUpdate.newStreak)) {
        gemsEarned += GEM_AWARDS.streakMilestone
      }
    }

    let questUpdate = null
    let questRewardGems = 0
    const rowQuests = Array.isArray(row.quests) && row.quests.length > 0
      ? row.quests
      : generateDailyQuests(row.day_number || 1, currentTasks.length)
    const questResult = !alreadyCompleted ? updateQuestProgress(rowQuests, {
      xpEarned,
      gemsEarned,
      taskType: canonicalTaskType,
      missionComplete: missionJustCompleted,
    }) : null

    if (questResult) {
      questRewardGems = Number(questResult.gemsFromQuests) || 0
      if (questRewardGems > 0) {
        gemsEarned += questRewardGems
      }
      questUpdate = {
        quests: questResult.updatedQuests,
        questsJustCompleted: questResult.questsJustCompleted.map((quest) => ({ id: quest.id, reward: quest.reward })),
        questMasterBonus: Boolean(questResult.questMasterBonus),
        questGemsEarned: questRewardGems,
      }
    }

    const existingXp = Number(bundle.progress.total_xp) || 0
    let newTotalXp = existingXp + (alreadyCompleted ? 0 : xpEarned)
    let newGemTotal = (Number(bundle.progress.gems) || 0) + (alreadyCompleted ? 0 : gemsEarned)
    const levelBefore = getLevelProgress(existingXp)
    const levelAfter = getLevelProgress(newTotalXp)
    const levelUp = levelAfter.level > levelBefore.level
      ? {
        fromLevel: levelBefore.level,
        toLevel: levelAfter.level,
        title: levelAfter.title,
      }
      : null

    if (!alreadyCompleted) {
      bundle.progress.total_xp = newTotalXp
      bundle.progress.gems = newGemTotal
      bundle.progress.gems_earned_total = (Number(bundle.progress.gems_earned_total) || 0) + gemsEarned
      bundle.progress.last_activity_date = streakUpdate.todayStr
      bundle.progress.last_event_date = streakUpdate.todayStr
      if (streakUpdate.streakChanged) {
        bundle.progress.current_streak = streakUpdate.newStreak
        bundle.progress.longest_streak = streakUpdate.newLongest
      }
    }

    updatedTasks = normalizeLearningTasks(updatedTasks)
    tasksCompleted = countCompletedTasks(updatedTasks)
    completionStatus = deriveTaskRowStatus(updatedTasks, row.completion_status || 'pending')

    const nextRow = {
      ...row,
      tasks: updatedTasks,
      tasks_completed: tasksCompleted,
      completion_status: completionStatus,
      quests: questUpdate?.quests || rowQuests,
      quests_completed: (questUpdate?.quests || rowQuests).filter((quest) => quest.completed).length,
    }
    bundle.rows[rowIndex] = nextRow

    if (!alreadyCompleted && gemsEarned > 0) {
      const baseReward = gemsEarned - questRewardGems
      if (baseReward > 0) {
        bundle.gemTransactions.push(buildTransaction({
          userId: bundle.userId,
          goalId: bundle.goal.id,
          amount: baseReward,
          reason: missionJustCompleted ? 'mission_complete' : 'task_complete',
        }))
      }
      if (questRewardGems > 0) {
        bundle.gemTransactions.push(buildTransaction({
          userId: bundle.userId,
          goalId: bundle.goal.id,
          amount: questRewardGems,
          reason: questUpdate?.questMasterBonus ? 'quest_master' : 'quest_complete',
        }))
      }
    }

    let nextResult = null
    if (completionStatus === 'completed') {
      nextResult = await generateNextLocalDayInternal(bundle)
    }

    let courseCompletion = null
    const courseCompleted = Boolean(isCourseFinalExam && finalExamPassed && nextResult?.reason === 'course_finished')
    if (courseCompleted) {
      courseCompletion = {
        title: `Course Complete: ${bundle.goal.goal_text}`,
        goalText: bundle.goal.goal_text,
        examScore,
        grade: getCourseCompletionGrade(examScore),
        attemptsUsed: examAttemptsUsed,
        rewardXp: courseRewardXp,
        rewardGems: courseRewardGems,
        portfolioProjectId: null,
      }
    }

    return {
      ok: true,
      alreadyCompleted,
      tasksCompleted,
      completionStatus,
      missionComplete: missionJustCompleted,
      xpEarned: alreadyCompleted ? 0 : xpEarned,
      taskXp: alreadyCompleted ? 0 : xpForTask(targetTask),
      missionBonusXp: alreadyCompleted ? 0 : missionBonusXp,
      streakBonusXp: alreadyCompleted ? 0 : streakBonusXp,
      xpBoosted,
      newTotalXp,
      levelUp,
      streakState: {
        current: streakUpdate.newStreak,
        longest: streakUpdate.newLongest,
        broken: streakUpdate.broken || false,
        milestone: !alreadyCompleted && streakUpdate.streakChanged && !streakUpdate.broken && isStreakMilestone(streakUpdate.newStreak),
      },
      gemsEarned: alreadyCompleted ? 0 : gemsEarned,
      newGemTotal,
      questUpdate,
      challengeUpdate: null,
      newBadges: [],
      nextResult,
      finalExamPassed: isCourseFinalExam ? finalExamPassed : null,
      finalExam: isCourseFinalExam ? {
        score: examScore,
        passScore: examPassScore,
        attemptsUsed: examAttemptsUsed,
        attemptsRemaining: Math.max(0, examMaxAttempts - examAttemptsUsed),
        maxAttempts: examMaxAttempts,
        bestScore: examBestScore,
        failedOut: finalExamFailedOut,
      } : null,
      courseCompleted,
      courseCompletion,
      warnings: [],
    }
  })
}

export async function generateNextLocalDay({
  userId = 'pathai-local-user',
  goalId,
} = {}) {
  return mutateBundle(userId, goalId, (bundle) => generateNextLocalDayInternal(bundle))
}

export async function claimLocalReward({
  userId = 'pathai-local-user',
  goalId,
} = {}) {
  return mutateBundle(userId, goalId, (bundle) => {
    const calendar = coerceRewardCalendar(bundle.progress.reward_calendar)
    const dayIndex = getCalendarDayIndex()

    if (calendar.days_claimed.includes(dayIndex)) {
      return { ok: false, error: 'Already claimed today', calendar }
    }

    const reward = CALENDAR_REWARDS[dayIndex]
    const nextCalendar = {
      week_start: calendar.week_start,
      days_claimed: [...calendar.days_claimed, dayIndex].sort((left, right) => left - right),
    }
    const perfectWeekBonus = nextCalendar.days_claimed.length === 7 ? PERFECT_WEEK_BONUS : 0
    const totalReward = reward + perfectWeekBonus

    bundle.progress.reward_calendar = nextCalendar
    bundle.progress.gems = (Number(bundle.progress.gems) || 0) + totalReward
    bundle.progress.gems_earned_total = (Number(bundle.progress.gems_earned_total) || 0) + totalReward
    bundle.gemTransactions.push(buildTransaction({
      userId: bundle.userId,
      goalId: bundle.goal.id,
      amount: totalReward,
      reason: perfectWeekBonus > 0 ? 'perfect_week' : 'daily_calendar',
    }))

    return {
      ok: true,
      reward,
      perfectWeekBonus,
      newGemTotal: bundle.progress.gems,
      calendar: nextCalendar,
    }
  })
}

export async function purchaseLocalGemItem({
  userId = 'pathai-local-user',
  goalId,
  itemId,
  clientGems = null,
  clientMaxHearts = null,
} = {}) {
  return mutateBundle(userId, goalId, (bundle) => {
    const item = GEM_SHOP_ITEMS[itemId]
    if (!item) return { ok: false, error: 'Unknown item' }

    const inventoryCounts = buildInventoryCountsFromTransactions(bundle.gemTransactions)
    const ownedThemes = getMergedOwnedThemes(bundle.gemTransactions)
    const currentGems = Number.isFinite(Number(clientGems))
      ? Math.max(Number(bundle.progress.gems) || 0, Number(clientGems))
      : (Number(bundle.progress.gems) || 0)
    const currentMaxHearts = Math.min(
      HEARTS_MAX_CAP,
      Math.max(HEARTS_BASE, Number(clientMaxHearts) || getStoredMaxHearts(), Number(bundle.progress.hearts_remaining) || HEARTS_BASE),
    )

    if (itemId.startsWith('theme') && ownedThemes.includes(itemId)) {
      return { ok: false, error: 'Theme already owned', ownedThemes }
    }
    if (currentGems < item.cost) {
      return { ok: false, error: 'Insufficient gems', currentGems, cost: item.cost, ownedThemes }
    }

    bundle.progress.gems = currentGems - item.cost
    let response = {
      ok: true,
      newGemTotal: bundle.progress.gems,
      item: itemId,
      effect: '',
    }

    switch (itemId) {
      case 'streakFreeze':
        bundle.progress.freeze_count = (Number(bundle.progress.freeze_count) || 0) + 1
        response.effect = 'Streak freeze added'
        response.freezeCount = bundle.progress.freeze_count
        break
      case 'heartRefill':
        bundle.progress.hearts_remaining = currentMaxHearts
        bundle.progress.hearts_refill_at = null
        response.effect = `Hearts restored to ${currentMaxHearts}`
        response.heartsRemaining = bundle.progress.hearts_remaining
        response.heartsRefillAt = null
        break
      case 'heartContainer': {
        if (currentMaxHearts >= HEARTS_MAX_CAP) {
          return { ok: false, error: 'Max hearts already reached', maxHearts: currentMaxHearts }
        }
        const nextMaxHearts = currentMaxHearts + 1
        bundle.progress.hearts_remaining = Math.max(Number(bundle.progress.hearts_remaining) || 0, nextMaxHearts)
        bundle.progress.hearts_refill_at = null
        setStoredMaxHearts(nextMaxHearts)
        response.effect = `Max hearts increased to ${nextMaxHearts}`
        response.maxHearts = nextMaxHearts
        response.heartsRemaining = bundle.progress.hearts_remaining
        response.heartsRefillAt = null
        break
      }
      case 'taskReroll':
        response.effect = 'Task reroll pass added'
        break
      case 'reviewShield':
        response.effect = 'Review shield added'
        break
      case 'recoveryPack':
        bundle.progress.hearts_remaining = currentMaxHearts
        bundle.progress.hearts_refill_at = null
        response.effect = 'Hearts restored and 1 reroll pass added'
        response.heartsRemaining = bundle.progress.hearts_remaining
        response.heartsRefillAt = null
        break
      case 'freezeBundle':
        bundle.progress.freeze_count = (Number(bundle.progress.freeze_count) || 0) + 3
        response.effect = '3 streak freezes added'
        response.freezeCount = bundle.progress.freeze_count
        break
      case 'xpBoost':
      case 'megaXpBoost': {
        const extensionMs = itemId === 'xpBoost' ? (15 * 60 * 1000) : (60 * 60 * 1000)
        const activeBoostUntil = bundle.progress.xp_boost_until ? new Date(bundle.progress.xp_boost_until) : null
        const boostStart = activeBoostUntil && activeBoostUntil > new Date() ? activeBoostUntil : new Date()
        const boostEnd = new Date(boostStart.getTime() + extensionMs).toISOString()
        bundle.progress.xp_boost_until = boostEnd
        response.effect = `2x XP active until ${boostEnd}`
        response.xpBoostUntil = boostEnd
        break
      }
      case 'streakRepair': {
        const lastDate = bundle.progress.last_activity_date
        if (!lastDate || Number(bundle.progress.current_streak) <= 0) {
          return { ok: false, error: 'No streak history to repair' }
        }
        const streakCheck = computeStreakUpdate({
          lastActivityDate: lastDate,
          currentStreak: bundle.progress.current_streak || 0,
          longestStreak: bundle.progress.longest_streak || 0,
        })
        if (!streakCheck.broken) {
          return { ok: false, error: 'Your streak is still active' }
        }
        const hoursSinceLastActivity = (Date.now() - new Date(`${lastDate}T00:00:00`).getTime()) / (1000 * 60 * 60)
        if (hoursSinceLastActivity > 48) {
          return { ok: false, error: 'Streak repair only available within 24h of break' }
        }
        const yesterday = new Date(Date.now() - (24 * 60 * 60 * 1000)).toISOString().split('T')[0]
        bundle.progress.last_activity_date = yesterday
        response.effect = 'Streak restored'
        response.streakRepaired = true
        response.currentStreak = bundle.progress.current_streak || 0
        response.lastActivityDate = yesterday
        break
      }
      default:
        if (THEME_ITEM_IDS.includes(itemId)) {
          const nextOwnedThemes = [...new Set([...ownedThemes, itemId])]
          setStoredOwnedThemes(nextOwnedThemes)
          response.effect = `Theme unlocked: ${item.label.replace('Path Theme: ', '')}`
          response.ownedThemes = nextOwnedThemes
        } else {
          return { ok: false, error: 'Unhandled item' }
        }
        break
    }

    bundle.gemTransactions.push(buildTransaction({
      userId: bundle.userId,
      goalId: bundle.goal.id,
      amount: -item.cost,
      reason: `shop_${itemId}`,
    }))

    response.inventoryCounts = buildInventoryCountsFromTransactions(bundle.gemTransactions)
    return response
  })
}

export async function rerollLocalTask({
  userId = 'pathai-local-user',
  goalId,
  taskRowId,
  taskId,
} = {}) {
  return mutateBundle(userId, goalId, (bundle) => {
    const inventoryCounts = buildInventoryCountsFromTransactions(bundle.gemTransactions)
    if ((inventoryCounts.taskReroll || 0) <= 0) {
      return { ok: false, error: 'No task reroll passes available', inventoryCounts }
    }

    const rowIndex = bundle.rows.findIndex((row) => String(row.id) === String(taskRowId))
    if (rowIndex < 0) return { ok: false, error: 'Task row not found' }

    const row = normalizeTaskRows([bundle.rows[rowIndex]])[0]
    const tasks = normalizeLearningTasks(row.tasks)
    const taskIndex = tasks.findIndex((task) => String(task.id) === String(taskId))
    if (taskIndex < 0) return { ok: false, error: 'Task not found' }

    const targetTask = tasks[taskIndex]
    if (targetTask.completed) return { ok: false, error: 'Completed tasks cannot be rerolled' }
    if (INELIGIBLE_REROLL_TYPES.has(getCanonicalTaskType(targetTask.type, targetTask))) {
      return { ok: false, error: 'This task type cannot be rerolled' }
    }

    const concept = targetTask._concept || row.covered_topics?.[0] || targetTask.title
    const replacementTask = buildLocalRerollTask(targetTask, concept, bundle.goal.goal_text || '')
    const nextTasks = normalizeLearningTasks(tasks.map((task, index) => (
      index === taskIndex ? replacementTask : task
    )))

    bundle.rows[rowIndex] = {
      ...row,
      tasks: nextTasks,
    }
    bundle.gemTransactions.push(buildTransaction({
      userId: bundle.userId,
      goalId: bundle.goal.id,
      amount: 0,
      reason: 'use_taskReroll',
    }))

    return {
      ok: true,
      replacementTask,
      taskRowId,
      taskId,
      inventoryCounts: buildInventoryCountsFromTransactions(bundle.gemTransactions),
    }
  })
}

export async function claimLocalModuleReward({
  userId = 'pathai-local-user',
  goalId,
  moduleId,
} = {}) {
  return mutateBundle(userId, goalId, (bundle) => {
    const rewardReason = getModuleRewardReason(moduleId)
    const claimedModuleRewardIds = getClaimedModuleRewardIds(bundle.gemTransactions)
    if (claimedModuleRewardIds.includes(String(moduleId))) {
      return { ok: true, alreadyClaimed: true, rewardReason }
    }

    const tracker = buildPathOutlineTracker({
      courseOutline: bundle.goal.course_outline,
      rows: bundle.rows,
      goalText: bundle.goal.goal_text || '',
      claimedModuleRewardIds,
    })
    const trackerModule = tracker.modules.find((entry) => entry.id === moduleId)
    if (!trackerModule) return { ok: false, error: 'Module not found in tracker' }
    if (!trackerModule.sealEarned) return { ok: false, error: 'Module seal not earned yet' }

    bundle.progress.gems = (Number(bundle.progress.gems) || 0) + trackerModule.rewardAmount
    bundle.progress.gems_earned_total = (Number(bundle.progress.gems_earned_total) || 0) + trackerModule.rewardAmount
    bundle.gemTransactions.push(buildTransaction({
      userId: bundle.userId,
      goalId: bundle.goal.id,
      amount: trackerModule.rewardAmount,
      reason: rewardReason,
    }))

    return {
      ok: true,
      moduleId,
      rewardAmount: trackerModule.rewardAmount,
      newGemTotal: bundle.progress.gems,
      identityLabel: trackerModule.identityLabel,
      moduleTitle: trackerModule.title,
    }
  })
}
