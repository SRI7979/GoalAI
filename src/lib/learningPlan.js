import { buildFlowSequence, LEGACY_TYPE_MAP, calculateMasteryScore } from '@/lib/learningEngine'
import { getOpenAIModel } from '@/lib/openaiModels'
import {
  buildAdaptivePlan,
  buildAdaptiveProfile,
  buildAdaptivePromptContext,
  buildAdaptiveTaskMetadata,
} from '@/lib/adaptiveLearning'
import {
  buildCourseFinalExamPlanDay,
  filterRowsForCourseWindow,
  isCourseFinalExamTask,
} from '@/lib/courseCompletion'
import {
  buildCourseSequence,
  buildPathOutlineTracker,
  courseOutlineNeedsRecovery,
} from '@/lib/pathOutline.js'
import {
  getStoredCourseOutline,
  persistCourseOutline,
  stripStoredCourseOutlineConstraint,
} from '@/lib/courseOutlineStore'

// ─────────────────────────────────────────────
// Constants & helpers
// ─────────────────────────────────────────────

// The 7 clean task types (concept replaces lesson/reading/video/flashcard)
const TASK_SEQUENCE = ['concept', 'quiz']

// All valid task types in the new system
const CLEAN_TASK_TYPES = ['concept', 'guided_practice', 'challenge', 'explain', 'quiz', 'reflect', 'boss']

// Legacy types kept for backward compat with existing DB data
const LEGACY_TYPES = ['lesson', 'video', 'practice', 'exercise', 'reading', 'flashcard', 'discussion', 'review', 'ai_interaction', 'reflection', 'capstone']
const EXTENDED_TASK_TYPES = [...CLEAN_TASK_TYPES, ...LEGACY_TYPES]

const typeVerbs = {
  concept: 'Learn',
  guided_practice: 'Practice',
  challenge: 'Challenge',
  explain: 'Explain',
  quiz: 'Test',
  reflect: 'Reflect',
  boss: 'Battle',
  // Legacy verbs (backward compat)
  lesson: 'Learn',
  video: 'Watch',
  practice: 'Practice',
  exercise: 'Build',
  review: 'Review',
  reading: 'Read',
  ai_interaction: 'Explain',
  reflection: 'Reflect',
}

export const resourcesByCategory = {
  programming: [
    { title: 'MDN Learning Area', url: 'https://developer.mozilla.org/en-US/docs/Learn', type: 'documentation' },
    { title: 'freeCodeCamp Curriculum', url: 'https://www.freecodecamp.org/learn', type: 'interactive' },
    { title: 'The Odin Project', url: 'https://www.theodinproject.com/paths', type: 'course' },
    { title: 'JavaScript.info', url: 'https://javascript.info/', type: 'article' },
  ],
  machineLearning: [
    { title: 'Kaggle Learn', url: 'https://www.kaggle.com/learn', type: 'interactive' },
    { title: 'Scikit-learn Tutorials', url: 'https://scikit-learn.org/stable/tutorial/', type: 'documentation' },
    { title: 'Fast.ai Practical Deep Learning', url: 'https://course.fast.ai/', type: 'course' },
    { title: 'Google ML Crash Course', url: 'https://developers.google.com/machine-learning/crash-course', type: 'course' },
  ],
  general: [
    { title: 'Coursera Guided Learning', url: 'https://www.coursera.org/', type: 'course' },
    { title: 'edX Courses', url: 'https://www.edx.org/', type: 'course' },
    { title: 'Khan Academy', url: 'https://www.khanacademy.org/', type: 'interactive' },
    { title: 'YouTube Learning', url: 'https://www.youtube.com/', type: 'video' },
  ],
}

export function categorizeGoal(goal = '') {
  if (/python|javascript|js|react|web|coding|programming|html|css|typescript|java|c\+\+|rust|swift|ruby|node/i.test(goal)) {
    return 'programming'
  }
  if (/machine learning|\bml\b|deep learning|data science|neural|ai/i.test(goal)) {
    return 'machineLearning'
  }
  return 'general'
}

function getFallbackModuleSeeds(goal = '') {
  const text = String(goal).toLowerCase()

  if (/python/.test(text)) {
    return [
      'Introduction to Python',
      'Variables and Data Types',
      'Conditionals',
      'Loops',
      'Functions',
      'Lists and Dictionaries',
      'Strings and Input Handling',
      'Files and Modules',
      'Debugging and Problem Solving',
      'Applied Python Project',
    ]
  }

  if (/machine learning|\bml\b|data science|neural|model/.test(text)) {
    return [
      'Introduction to Machine Learning',
      'Python for Machine Learning',
      'Data Preparation',
      'Supervised Learning Basics',
      'Linear Models',
      'Decision Trees and Ensembles',
      'Model Evaluation',
      'Feature Engineering',
      'Neural Networks',
      'Machine Learning Project',
    ]
  }

  if (/javascript|react|web|html|css|frontend|typescript/.test(text)) {
    return [
      'Web Foundations',
      'JavaScript Basics',
      'State and Data Flow',
      'Events and User Input',
      'Components',
      'Rendering Lists and UI States',
      'APIs and Async Data',
      'Routing and Structure',
      'Polish and Debugging',
      'Web App Project',
    ]
  }

  if (/spanish|french|german|japanese|korean|language/.test(text)) {
    return [
      'Core Phrases',
      'Pronunciation and Listening',
      'Grammar Foundations',
      'Sentence Building',
      'Everyday Conversation',
      'Questions and Responses',
      'Past and Future Expression',
      'Real-World Comprehension',
      'Fluency Practice',
      'Conversation Milestone',
    ]
  }

  return [
    `Introduction to ${goal}`,
    'Core Fundamentals',
    'Guided Practice',
    'Key Patterns',
    'Applied Skills',
    'Deeper Problem Solving',
    'Real-World Usage',
    'Independent Work',
    'Refinement and Review',
    'Final Applied Project',
  ]
}

function buildStructuredFallbackOutline({ goal, days, minutesPerDay, skillLevel }) {
  const safeDays = Math.max(1, Number(days) || 30)
  const seeds = getFallbackModuleSeeds(goal)
  const targetModuleCount = Math.max(4, Math.min(seeds.length, safeDays >= 24 ? 10 : safeDays >= 15 ? 8 : safeDays >= 8 ? 6 : 4))
  const selectedSeeds = seeds.slice(0, targetModuleCount)
  const moduleDayCounts = Array.from({ length: selectedSeeds.length }, () => 1)

  let remainingDays = Math.max(0, safeDays - selectedSeeds.length)
  let cursor = 0
  while (remainingDays > 0) {
    moduleDayCounts[cursor % moduleDayCounts.length] += 1
    remainingDays -= 1
    cursor += 1
  }

  let dayNumber = 1
  const modules = selectedSeeds.map((seed, moduleIndex) => {
    const allocatedDays = moduleDayCounts[moduleIndex]
    const daysForModule = Array.from({ length: allocatedDays }, (_, dayIndex) => {
      const partIndex = dayIndex + 1
      const isFirst = partIndex === 1
      const isLast = partIndex === allocatedDays
      const title = allocatedDays === 1
        ? seed
        : isFirst
          ? `${seed} Foundations`
          : isLast
            ? `${seed} Applied Practice`
            : `${seed} Deeper Practice`

      return {
        day: dayNumber++,
        title,
        concepts: allocatedDays === 1
          ? [seed]
          : isFirst
            ? [seed, 'Core ideas']
            : isLast
              ? [seed, 'Application']
              : [seed, 'Practice'],
        estimatedMinutes: minutesPerDay || 30,
        difficulty: Math.max(1, Math.min(5, 1 + Math.floor((moduleIndex / Math.max(1, selectedSeeds.length - 1)) * 4))),
      }
    })

    return {
      title: seed,
      description: `Build working skill in ${seed.toLowerCase()} as part of ${goal}.`,
      days: daysForModule,
    }
  })

  const concepts = []
  let conceptId = 1
  modules.forEach((module) => {
    module.days.forEach((day) => {
      concepts.push({
        id: conceptId++,
        name: day.concepts[0] || day.title,
        description: `${module.title}: ${day.title}. Concepts: ${day.concepts.join(', ')}`,
        estimatedDays: 1,
        dependencies: conceptId > 2 ? [conceptId - 2] : [],
        difficulty: day.difficulty,
        _moduleTitle: module.title,
        _dayTitle: day.title,
        _allConcepts: day.concepts,
      })
    })
  })

  return {
    version: 'v1',
    goal,
    skillLevel,
    totalDays: safeDays,
    estimatedHours: Math.round(safeDays * (minutesPerDay || 30) / 60),
    completionProbability: 75,
    recommendedDays: safeDays,
    modules,
    concepts,
    previous_version: null,
  }
}

function getResources(goal, conceptName) {
  const category = categorizeGoal(goal)
  const pool = resourcesByCategory[category] || resourcesByCategory.general
  return pool.map((resource) => ({
    ...resource,
    title: `${resource.title} · ${conceptName}`,
  }))
}

export function buildFallbackConcepts(goal, days) {
  const names = [
    `Introduction to ${goal}`,
    'Core Fundamentals',
    'Guided Practice',
    'Intermediate Application',
    'Advanced Problem Solving',
    'Capstone Prep',
    'Final Integration',
  ]
  const total = names.length
  return names.map((name, index) => ({
    id: index + 1,
    name,
    description: `Build mastery in ${name.toLowerCase()} for ${goal}.`,
    estimatedDays: Math.max(1, Math.round(days / total + (index < 2 ? 1 : 0))),
    dependencies: index > 0 ? [index] : [],
    difficulty: Math.min(5, Math.floor(index / 2) + 1),
  }))
}

// ─────────────────────────────────────────────
// Skill level inference
// ─────────────────────────────────────────────

function inferSkillLevel(knowledge) {
  if (!knowledge || knowledge.trim().length === 0) return 'beginner'
  const words = knowledge.trim().split(/\s+/).length
  if (words >= 30 || /advanced|expert|proficient|years|senior|deep/i.test(knowledge)) return 'advanced'
  if (words >= 10 || /intermediate|some|familiar|basic|know|understand/i.test(knowledge)) return 'intermediate'
  return 'beginner'
}

// ─────────────────────────────────────────────
// Completion probability
// ─────────────────────────────────────────────

function calculateCompletionProbability({ totalDays, minutesPerDay, skillLevel, targetDays }) {
  if (!targetDays || targetDays <= 0) return { probability: 85, recommendedDays: totalDays }

  // Base probability from time ratio
  const ratio = targetDays / totalDays
  let probability = Math.round(Math.min(98, ratio * 80))

  // Skill level adjustment
  if (skillLevel === 'advanced') probability = Math.min(98, probability + 10)
  else if (skillLevel === 'intermediate') probability = Math.min(98, probability + 5)
  else probability = Math.max(5, probability - 5)

  // Daily time adjustment — more time = more buffer
  if (minutesPerDay >= 60) probability = Math.min(98, probability + 8)
  else if (minutesPerDay >= 30) probability = Math.min(98, probability + 3)
  else probability = Math.max(5, probability - 5)

  const recommendedDays = probability >= 70 ? targetDays : Math.ceil(totalDays * 1.15)

  return { probability: Math.max(5, Math.min(98, probability)), recommendedDays }
}

// ─────────────────────────────────────────────
// Full course outline generation (module-structured)
// ─────────────────────────────────────────────

export async function generateCourseOutline({ goal, knowledge, days, minutesPerDay, openaiApiKey }) {
  const skillLevel = inferSkillLevel(knowledge)
  const requestedDays = Math.max(1, Number(days) || 30)
  const minimumModuleCount = requestedDays >= 24 ? 6 : requestedDays >= 14 ? 5 : requestedDays >= 8 ? 4 : 3

  try {
    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: getOpenAIModel('courseOutline'),
        max_tokens: 4000,
        temperature: 0.35,
        messages: [
          {
            role: 'system',
            content: `You are an expert curriculum designer and learning scientist. Design structured learning paths that feel like a real course — not a list of generic tasks. Every day should feel like a concrete step forward. Concepts must build logically with progressive difficulty.`,
          },
          {
            role: 'user',
            content: [
              `Design a COMPLETE learning path for: "${goal}"`,
              `Time per day: ${minutesPerDay || 30} minutes`,
              `Total days available: ${days}`,
              `Current skill level: ${skillLevel}`,
              knowledge ? `Prior knowledge: ${knowledge}` : 'Starting from scratch.',
              '',
              'REQUIREMENTS:',
              '1. Break the skill into 6-12 modules when possible, and make module titles concrete topics like Variables, Loops, Functions, Model Evaluation, or Neural Networks.',
              '2. Each module contains multiple days',
              '3. Each day must have: title, concepts array (1-3 key concepts), estimated time in minutes',
              `4. Total days MUST equal exactly ${days}`,
              `5. Each day must fit within ${minutesPerDay || 30} minutes`,
              '6. Distribute difficulty progressively — start simple, build complexity',
              '7. No fluff, no generic tasks — each day must teach something specific and concrete',
              '8. Concepts must build logically — later days should depend on earlier ones',
              knowledge ? '9. SKIP topics the learner already knows based on their prior knowledge' : '',
              '',
              'Return ONLY valid JSON:',
              '{',
              '  "modules": [',
              '    {',
              '      "title": "Module Name",',
              '      "description": "What this module covers and why it matters",',
              '      "days": [',
              '        {',
              '          "day": 1,',
              '          "title": "Specific Day Title",',
              '          "concepts": ["concept1", "concept2"],',
              '          "estimatedMinutes": 30,',
              '          "difficulty": 1',
              '        }',
              '      ]',
              '    }',
              '  ]',
              '}',
              '',
              'Rules:',
              '- Prefer 6-12 modules, each usually 1-4 days',
              '- Day numbers must be sequential starting from 1',
              '- difficulty: 1 (intro) to 5 (advanced)',
              '- Every concept mentioned should be specific and actionable, not vague',
              '- Module titles should be clear topic groupings and should map to the full curriculum from start to finish',
              '- Avoid broad buckets like "Core Skills" unless absolutely necessary',
            ].filter(Boolean).join('\n'),
          },
        ],
      }),
    })

    if (!openaiRes.ok) throw new Error(`OpenAI request failed with ${openaiRes.status}`)

    const openaiData = await openaiRes.json()
    const text = openaiData.choices?.[0]?.message?.content || ''
    let jsonStr = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
    const firstBrace = jsonStr.indexOf('{')
    if (firstBrace >= 0) jsonStr = jsonStr.slice(firstBrace)

    const parsed = JSON.parse(jsonStr)
    if (!Array.isArray(parsed?.modules) || parsed.modules.length === 0) {
      throw new Error('Invalid course outline: missing modules')
    }

    // Validate and normalize day numbers
    let dayCounter = 1
    const normalizedModules = parsed.modules.map(mod => ({
      title: mod.title || 'Untitled Module',
      description: mod.description || '',
      days: (Array.isArray(mod.days) ? mod.days : []).map(d => {
        const normalized = {
          day: dayCounter++,
          title: d.title || `Day ${dayCounter - 1}`,
          concepts: Array.isArray(d.concepts) ? d.concepts : [d.title || 'General'],
          estimatedMinutes: Math.min(minutesPerDay || 30, Number(d.estimatedMinutes) || minutesPerDay || 30),
          difficulty: Math.max(1, Math.min(5, Number(d.difficulty) || 1)),
        }
        return normalized
      }),
    }))

    // Compute totals
    const totalOutlineDays = normalizedModules.reduce((sum, m) => sum + m.days.length, 0)
    if (normalizedModules.length < minimumModuleCount || totalOutlineDays < requestedDays) {
      throw new Error('Outline too shallow for a full start-to-finish curriculum')
    }
    const totalHours = Math.round(totalOutlineDays * (minutesPerDay || 30) / 60)
    const { probability, recommendedDays } = calculateCompletionProbability({
      totalDays: totalOutlineDays,
      minutesPerDay: minutesPerDay || 30,
      skillLevel,
      targetDays: days,
    })

    // Extract flat concepts list for backward compatibility with buildDailyTasks
    const concepts = []
    let conceptId = 1
    normalizedModules.forEach(mod => {
      mod.days.forEach(d => {
        concepts.push({
          id: conceptId++,
          name: d.concepts[0] || d.title,
          description: `${mod.title}: ${d.title}. Concepts: ${d.concepts.join(', ')}`,
          estimatedDays: 1,
          dependencies: conceptId > 2 ? [conceptId - 2] : [],
          difficulty: d.difficulty,
          _moduleTitle: mod.title,
          _dayTitle: d.title,
          _allConcepts: d.concepts,
        })
      })
    })

    return {
      version: 'v1',
      goal,
      skillLevel,
      totalDays: totalOutlineDays,
      estimatedHours: totalHours,
      completionProbability: probability,
      recommendedDays,
      modules: normalizedModules,
      concepts, // flat list for backward compat
      previous_version: null,
    }
  } catch {
    return buildStructuredFallbackOutline({
      goal,
      days: requestedDays,
      minutesPerDay,
      skillLevel,
    })
  }
}

function parseDateOnly(value) {
  if (!value) return null
  const parsed = new Date(`${value}T00:00:00`)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function getAverageMinutes(weekdayMins, weekendMins) {
  const weekday = Number(weekdayMins) || 30
  const weekend = Number(weekendMins) || weekday
  return Math.max(15, Math.round((weekday * 5 + weekend * 2) / 7))
}

function normalizeKnowledge(constraints) {
  const visibleConstraints = stripStoredCourseOutlineConstraint(constraints)
  return Array.isArray(visibleConstraints) ? visibleConstraints.join(', ') : (visibleConstraints || '')
}

function getGoalRequestedDays(goalRow, existingRows = []) {
  const explicitGoalDays = Number(goalRow?.total_days)
  if (Number.isFinite(explicitGoalDays) && explicitGoalDays >= 5) return explicitGoalDays

  const deadlineDate = parseDateOnly(goalRow?.deadline)
  if (deadlineDate) {
    const today = parseDateOnly(new Date().toISOString().split('T')[0])
    const diffDays = Math.ceil((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    if (Number.isFinite(diffDays) && diffDays >= 5) return diffDays
  }

  const existingLearningRows = (Array.isArray(existingRows) ? existingRows : []).filter((row) => {
    const tasks = Array.isArray(row?.tasks) ? row.tasks : []
    return !tasks.some(isCourseFinalExamTask)
  })

  return Math.max(30, existingLearningRows.length || 0, explicitGoalDays || 0)
}

function resolveDayDate(existingRows = [], targetDayNumber, preservedDate = null) {
  if (preservedDate) return preservedDate

  const sortedRows = [...(Array.isArray(existingRows) ? existingRows : [])]
    .sort((a, b) => Number(a?.day_number || 0) - Number(b?.day_number || 0))
  const priorRow = [...sortedRows]
    .reverse()
    .find((row) => Number(row?.day_number || 0) < Number(targetDayNumber))
  const nextRow = sortedRows.find((row) => Number(row?.day_number || 0) > Number(targetDayNumber))

  const priorDate = parseDateOnly(priorRow?.task_date)
  if (priorDate) {
    priorDate.setDate(priorDate.getDate() + Math.max(1, Number(targetDayNumber) - Number(priorRow?.day_number || 0)))
    return priorDate.toISOString().split('T')[0]
  }

  const nextDate = parseDateOnly(nextRow?.task_date)
  if (nextDate) {
    nextDate.setDate(nextDate.getDate() - Math.max(1, Number(nextRow?.day_number || 0) - Number(targetDayNumber)))
    return nextDate.toISOString().split('T')[0]
  }

  const today = new Date()
  today.setDate(today.getDate() + Math.max(0, Number(targetDayNumber) - 1))
  return today.toISOString().split('T')[0]
}

function buildConceptFromSequenceItem(item) {
  return {
    id: item.sequenceIndex || item.dayNumber,
    name: item.concepts?.[0] || item.title,
    description: `${item.moduleTitle}: ${item.title}. Concepts: ${(item.concepts || []).join(', ')}`,
    estimatedDays: 1,
    dependencies: [],
    difficulty: Number(item.difficulty) || 2,
    _moduleTitle: item.moduleTitle,
    _dayTitle: item.title,
    _allConcepts: Array.isArray(item.concepts) ? item.concepts : [item.title],
  }
}

function buildProjectDayPlan({ goalText, item, existingRows = [] }) {
  const durationMin = item.kind === 'full_project' ? 60 : 40
  const reward = item.kind === 'full_project'
    ? { xpReward: 120, gemReward: 35 }
    : { xpReward: 80, gemReward: 20 }

  return {
    day: item.dayNumber,
    date: resolveDayDate(existingRows, item.dayNumber, item.rawRow?.task_date || null),
    conceptName: item.title,
    coveredTopics: Array.isArray(item.concepts) && item.concepts.length > 0 ? item.concepts : [item.moduleTitle || item.title],
    tasks: [{
      id: `d${item.dayNumber}project`,
      type: 'project',
      title: item.title,
      description: item.kind === 'full_project'
        ? `Dedicated build day for ${item.moduleTitle}. Ship a substantial project that proves you can apply the module in the real world.`
        : `Dedicated mini-project day for ${item.moduleTitle}. Apply the module in one focused build without any filler tasks.`,
      durationMin,
      isProjectTrigger: true,
      _projectScale: item.kind,
      _moduleProjectKind: item.kind,
      _moduleTitle: item.moduleTitle,
      _moduleTier: item.moduleTier,
      _concepts: Array.isArray(item.concepts) ? item.concepts : [],
      xpReward: reward.xpReward,
      gemReward: reward.gemReward,
      completed: false,
    }],
    totalMinutes: durationMin,
    mode: 'goal',
  }
}

export async function buildGoalPlanDayFromSequenceItem({
  goalRow,
  item,
  knowledge = '',
  openaiApiKey = null,
  adaptiveProfile = null,
  existingRows = [],
}) {
  if (item.type === 'project') {
    return buildProjectDayPlan({ goalText: goalRow.goal_text, item, existingRows })
  }

  const unitConcept = buildConceptFromSequenceItem(item)
  const [day] = await buildDailyTasks(
    goalRow.goal_text,
    [unitConcept],
    Number(goalRow.weekday_mins) || 30,
    Number(goalRow.weekend_mins) || Number(goalRow.weekday_mins) || 30,
    item.dayNumber,
    1,
    { knowledge, openaiApiKey, mode: 'goal', adaptiveProfile },
  )

  return {
    ...day,
    day: item.dayNumber,
    date: resolveDayDate(existingRows, item.dayNumber, item.rawRow?.task_date || day?.date || null),
    conceptName: item.title,
    coveredTopics: Array.isArray(item.concepts) && item.concepts.length > 0 ? item.concepts : [item.title],
    totalMinutes: Number(day?.totalMinutes) || item.estimatedMinutes || 30,
  }
}

async function upsertDailyPlanDay({
  supabase,
  goalId,
  userId,
  planDay,
  existingRow = null,
}) {
  const payload = {
    goal_id: goalId,
    user_id: userId,
    day_number: planDay.day,
    task_date: planDay.date,
    tasks: planDay.tasks,
    covered_topics: Array.isArray(planDay.coveredTopics) && planDay.coveredTopics.length > 0
      ? planDay.coveredTopics
      : [planDay.conceptName],
    completion_status: 'pending',
    tasks_completed: 0,
    mode: planDay.mode || 'goal',
  }

  if (existingRow?.id) {
    const { data, error } = await supabase
      .from('daily_tasks')
      .update(payload)
      .eq('id', existingRow.id)
      .select('*')
      .single()
    if (error) throw new Error(`Failed to save sequence day: ${error.message}`)
    return data
  }

  const { data, error } = await supabase
    .from('daily_tasks')
    .insert(payload)
    .select('*')
    .single()
  if (error) throw new Error(`Failed to save sequence day: ${error.message}`)
  return data
}

export async function recoverCourseOutlineIfNeeded({
  supabase,
  goalId,
  userId,
  goalRow = null,
  progressRow = null,
  existingRows = [],
}) {
  let resolvedGoal = goalRow
  let resolvedProgress = progressRow

  if (!resolvedGoal) {
    const { data, error } = await supabase
      .from('goals')
      .select('goal_text,weekday_mins,weekend_mins,constraints,total_days,deadline,mode')
      .eq('id', goalId)
      .single()
    if (error) throw new Error(`Failed to load goal for outline recovery: ${error.message}`)
    resolvedGoal = data
  }

  if (!resolvedProgress && goalId && userId) {
    const { data, error } = await supabase
      .from('user_progress')
      .select('total_days')
      .eq('goal_id', goalId)
      .eq('user_id', userId)
      .maybeSingle()
    if (error) throw new Error(`Failed to load progress for outline recovery: ${error.message}`)
    resolvedProgress = data
  }

  const requestedDays = getGoalRequestedDays(resolvedGoal, existingRows)
  const storedCourseOutline = getStoredCourseOutline(resolvedGoal)
  const needsRecovery = courseOutlineNeedsRecovery(storedCourseOutline, requestedDays)
  let courseOutline = storedCourseOutline || null

  if (needsRecovery) {
    courseOutline = await generateCourseOutline({
      goal: resolvedGoal.goal_text,
      knowledge: normalizeKnowledge(resolvedGoal.constraints),
      days: requestedDays,
      minutesPerDay: getAverageMinutes(resolvedGoal.weekday_mins, resolvedGoal.weekend_mins),
      openaiApiKey: process.env.OPENAI_API_KEY,
    })

    await persistCourseOutline({
      supabase,
      goalId,
      constraints: resolvedGoal?.constraints,
      courseOutline,
    })
  }

  const sequence = buildCourseSequence({ courseOutline, goalText: resolvedGoal.goal_text })
  const sequenceDayCount = sequence.plannedDayCount

  if (goalId && userId && resolvedProgress && Number(resolvedProgress.total_days) !== sequenceDayCount) {
    await supabase
      .from('user_progress')
      .update({ total_days: sequenceDayCount })
      .eq('goal_id', goalId)
      .eq('user_id', userId)
  }

  return {
    courseOutline,
    sequenceDayCount,
    recovered: needsRecovery,
  }
}

// ─────────────────────────────────────────────
// Legacy concept map generation (used by generateNextTasksIfNeeded)
// ─────────────────────────────────────────────

export async function generateConceptMap({ goal, knowledge, days, openaiApiKey }) {
  try {
    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: getOpenAIModel('conceptMap'),
        max_tokens: 1800,
        messages: [{
          role: 'user',
          content: `Generate a concept map for "${goal}" over ${days} days.\n${knowledge ? `Learner prior knowledge: ${knowledge}` : 'Learner starts as a beginner.'}\nReturn ONLY JSON: {"concepts":[{"id":1,"name":"...","description":"...","estimatedDays":2,"dependencies":[],"difficulty":1}]}\nRules: 8-12 concepts, ordered beginner to advanced, realistic estimatedDays weighting by difficulty. IMPORTANT: skip concepts the learner already knows based on their prior knowledge.`,
        }],
      }),
    })

    if (!openaiRes.ok) throw new Error(`OpenAI request failed with ${openaiRes.status}`)

    const openaiData = await openaiRes.json()
    const text = openaiData.choices?.[0]?.message?.content || ''
    let jsonStr = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
    const firstBrace = jsonStr.indexOf('{')
    if (firstBrace >= 0) jsonStr = jsonStr.slice(firstBrace)

    const parsed = JSON.parse(jsonStr)
    if (!Array.isArray(parsed?.concepts) || parsed.concepts.length === 0) {
      throw new Error('Invalid concept response payload')
    }
    return parsed.concepts
  } catch {
    return buildFallbackConcepts(goal, days)
  }
}

// ─────────────────────────────────────────────
// Explore mode: infinite concept generation
// Generates next N concepts after a given concept index
// ─────────────────────────────────────────────

export async function generateExploreConcepts({ goal, knowledge, afterConcepts = [], openaiApiKey }) {
  try {
    const alreadyCovered = afterConcepts.map((c) => c.name).join(', ')
    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: getOpenAIModel('exploreConcepts'),
        max_tokens: 1200,
        messages: [{
          role: 'user',
          content: [
            `Generate the next 5 learning concepts for "${goal}".`,
            knowledge ? `Learner prior knowledge: ${knowledge}` : 'Learner is a beginner.',
            alreadyCovered ? `Already covered concepts: ${alreadyCovered}. Do NOT repeat these.` : '',
            'Return ONLY JSON: {"concepts":[{"id":1,"name":"...","description":"...","estimatedDays":1,"dependencies":[],"difficulty":1}]}',
            'Rules: concepts must logically follow what was already covered, ordered by increasing difficulty.',
          ].filter(Boolean).join('\n'),
        }],
      }),
    })

    if (!openaiRes.ok) throw new Error(`OpenAI request failed with ${openaiRes.status}`)

    const openaiData = await openaiRes.json()
    const text = openaiData.choices?.[0]?.message?.content || ''
    let jsonStr = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
    const firstBrace = jsonStr.indexOf('{')
    if (firstBrace >= 0) jsonStr = jsonStr.slice(firstBrace)

    const parsed = JSON.parse(jsonStr)
    if (!Array.isArray(parsed?.concepts) || parsed.concepts.length === 0) {
      throw new Error('Invalid explore concept response')
    }

    // Re-index IDs to continue from where we left off
    const offset = afterConcepts.length
    return parsed.concepts.map((c, i) => ({ ...c, id: offset + i + 1 }))
  } catch {
    // Fallback: generate generic next concepts
    const offset = afterConcepts.length
    return [
      { id: offset + 1, name: `${goal} — Deeper Practice`, description: 'Reinforce and deepen understanding.', estimatedDays: 1, dependencies: [], difficulty: 3 },
      { id: offset + 2, name: `${goal} — Advanced Techniques`, description: 'Explore advanced methods.', estimatedDays: 1, dependencies: [], difficulty: 4 },
      { id: offset + 3, name: `${goal} — Real-World Projects`, description: 'Apply skills in realistic scenarios.', estimatedDays: 1, dependencies: [], difficulty: 4 },
      { id: offset + 4, name: `${goal} — Edge Cases & Debugging`, description: 'Handle complexity and edge cases.', estimatedDays: 1, dependencies: [], difficulty: 5 },
      { id: offset + 5, name: `${goal} — Mastery Review`, description: 'Consolidate everything learned.', estimatedDays: 1, dependencies: [], difficulty: 5 },
    ]
  }
}

// ─────────────────────────────────────────────
// Timeline expansion
// ─────────────────────────────────────────────

function expandConceptTimeline(concepts, targetDays) {
  if (!concepts || concepts.length === 0) return []

  const weighted = []
  concepts.forEach((concept, index) => {
    const repeats = Math.max(1, Number(concept.estimatedDays) || 1)
    for (let i = 0; i < repeats; i++) {
      weighted.push({ ...concept, _conceptOrder: index })
    }
  })
  weighted.sort((a, b) => a._conceptOrder - b._conceptOrder)

  const timeline = []
  for (let d = 0; d < targetDays; d++) {
    // FIX: was Math.floor((d / targetDays) * weighted.length) which could overshoot
    const idx = Math.min(weighted.length - 1, Math.floor((d / Math.max(targetDays, 1)) * weighted.length))
    timeline.push(weighted[idx])
  }

  return timeline
}

// ─────────────────────────────────────────────
// Task normalization helpers
// ─────────────────────────────────────────────

function normalizeTaskType(type, index) {
  if (!type) return TASK_SEQUENCE[index % TASK_SEQUENCE.length]
  const normalized = String(type).toLowerCase().trim()
  // Map legacy types to clean types
  if (LEGACY_TYPE_MAP[normalized]) return LEGACY_TYPE_MAP[normalized]
  if (CLEAN_TASK_TYPES.includes(normalized)) return normalized
  return TASK_SEQUENCE[index % TASK_SEQUENCE.length]
}

function normalizeTitle(title, fallback) {
  const value = String(title || '').trim()
  return value || fallback
}

function uniqueTitle(title, usedTitles, dayNumber, index) {
  const base = String(title || '').trim() || `Day ${dayNumber} Task ${index + 1}`
  let candidate = base
  let suffix = 2
  while (usedTitles.has(candidate.toLowerCase())) {
    candidate = `${base} (${suffix})`
    suffix++
  }
  usedTitles.add(candidate.toLowerCase())
  return candidate
}

// ─────────────────────────────────────────────
// Task generation
// ─────────────────────────────────────────────

function buildFallbackTasksForDay({ goal, concept, taskCount, durationMin, dayNumber, resources, usedTitles, adaptivePlan = null }) {
  // Fallback generates concept tasks only — flow engine adds the rest
  return Array.from({ length: taskCount }).map((_, idx) => {
    const type = 'concept'
    const resource = resources[idx % resources.length]
    const action = `Learn one focused section on ${concept.name} and take concise notes.`
    const outcome = `Produce a short summary and one practical takeaway for ${goal}.`
    const title = uniqueTitle(`Learn ${concept.name} - Day ${dayNumber}`, usedTitles, dayNumber, idx)

    return {
      id: `d${dayNumber}t${idx + 1}`,
      type,
      title,
      action,
      outcome,
      description: `Action: ${action} Outcome: ${outcome}`,
      durationMin,
      resourceUrl: resource.url,
      resourceTitle: resource.title,
      resourceType: resource.type,
      _concept: concept.name,
      _flowStage: 'understand',
      ...buildAdaptiveTaskMetadata({ taskType: type, plan: adaptivePlan }),
      completed: false,
    }
  })
}

async function generateTeachingTasksForDay({
  goal,
  knowledge,
  concept,
  dayNumber,
  taskCount,
  durationMin,
  resources,
  openaiApiKey,
  usedTitles,
  adaptivePlan = null,
  mode = 'goal', // 'goal' | 'explore'
}) {
  if (!openaiApiKey) {
    return buildFallbackTasksForDay({ goal, concept, taskCount, durationMin, dayNumber, resources, usedTitles, adaptivePlan })
  }

  // AI generates only concept tasks — the flow engine adds guided_practice,
  // challenge, explain, quiz, reflect, boss deterministically
  const conceptTaskCount = Math.max(1, Math.min(taskCount, adaptivePlan?.conceptTaskCount || 2)) // Max 2 concept tasks per day

  try {
    const modeInstruction = mode === 'explore'
      ? 'This is Explore Mode (no deadline pressure). Make tasks feel discovery-oriented and curiosity-driven.'
      : 'This is Goal Mode (deadline-driven). Make tasks focused, efficient, and progress-oriented.'
    const adaptivePromptContext = buildAdaptivePromptContext(adaptivePlan)

    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: getOpenAIModel('dailyTasks'),
        temperature: 0.4,
        max_tokens: 1800,
        messages: [{
          role: 'user',
          content: [
            `Generate ${conceptTaskCount} concept lesson tasks that teach a new idea.`,
            `Goal: ${goal}`,
            `Prior knowledge: ${knowledge || 'Beginner'}`,
            `Day: ${dayNumber}`,
            concept._moduleTitle ? `Module: ${concept._moduleTitle}` : '',
            concept._dayTitle ? `Day topic: ${concept._dayTitle}` : '',
            `Concept: ${concept.name}`,
            `Concept description: ${concept.description || 'N/A'}`,
            concept._allConcepts?.length > 1 ? `Related concepts for today: ${concept._allConcepts.join(', ')}` : '',
            `Each task should be ~${durationMin} minutes.`,
            modeInstruction,
            adaptivePromptContext,
            'Task type must be "concept" — these are pure teaching/explanation tasks.',
            'A concept task introduces and explains one idea with examples, visuals, and key terms.',
            'It must NOT include quizzes, practice problems, or interactive exercises.',
            `Resource candidates JSON: ${JSON.stringify(resources)}`,
            'Return ONLY strict JSON: {"tasks":[{"type":"concept","title":"...","action":"...","outcome":"...","description":"...","durationMin":15,"resourceUrl":"https://...","resourceTitle":"...","resourceType":"article"}]}',
            'Rules: tasks must be practical and specific. Titles must be distinct. No generic fluff.',
          ].filter(Boolean).join('\n'),
        }],
      }),
    })

    if (!openaiRes.ok) throw new Error(`OpenAI tasks request failed with ${openaiRes.status}`)

    const openaiData = await openaiRes.json()
    const text = openaiData.choices?.[0]?.message?.content || ''
    let jsonStr = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
    const firstBrace = jsonStr.indexOf('{')
    if (firstBrace >= 0) jsonStr = jsonStr.slice(firstBrace)
    const parsed = JSON.parse(jsonStr)
    const aiTasks = Array.isArray(parsed?.tasks) ? parsed.tasks : []

    if (aiTasks.length === 0) throw new Error('AI response missing tasks array')

    const normalized = aiTasks.slice(0, conceptTaskCount).map((task, idx) => {
      const type = normalizeTaskType(task?.type, idx)
      const resource = resources[idx % resources.length]
      const fallbackTitle = `${typeVerbs[type] || 'Learn'} ${concept.name} - Day ${dayNumber}`
      const title = uniqueTitle(normalizeTitle(task?.title, fallbackTitle), usedTitles, dayNumber, idx)
      const action = String(task?.action || '').trim() || `Learn ${concept.name} and produce a concrete artifact.`
      const outcome = String(task?.outcome || '').trim() || `Demonstrate understanding of ${concept.name} in one output.`
      const description = String(task?.description || '').trim() || `Action: ${action} Outcome: ${outcome}`

      return {
        id: `d${dayNumber}t${idx + 1}`,
        type,
        title,
        action,
        outcome,
        description,
        durationMin: Math.max(8, Math.min(durationMin * 2, Number(task?.durationMin) || durationMin)),
        resourceUrl: String(task?.resourceUrl || '').trim() || resource.url,
        resourceTitle: String(task?.resourceTitle || '').trim() || resource.title,
        resourceType: String(task?.resourceType || '').trim() || resource.type,
        _concept: concept.name,
        _flowStage: 'understand',
        ...buildAdaptiveTaskMetadata({ taskType: type, plan: adaptivePlan }),
        completed: false,
      }
    })

    if (normalized.length < conceptTaskCount) {
      const fallback = buildFallbackTasksForDay({
        goal,
        concept,
        taskCount: conceptTaskCount - normalized.length,
        durationMin,
        dayNumber,
        resources,
        usedTitles,
        adaptivePlan,
      })
      return normalized.concat(fallback)
    }

    return normalized
  } catch {
    return buildFallbackTasksForDay({ goal, concept, taskCount: conceptTaskCount, durationMin, dayNumber, resources, usedTitles, adaptivePlan })
  }
}

// ─────────────────────────────────────────────
// Build daily tasks (Goal Mode)
// ─────────────────────────────────────────────

export async function buildDailyTasks(goal, concepts, weekdayMins, weekendMins, startDay, numDays, options = {}) {
  const { knowledge = '', openaiApiKey = null, mode = 'goal', adaptiveProfile = null } = options
  const days = []
  const timeline = expandConceptTimeline(concepts, numDays)

  // Ensure timeline is never empty
  const safeConcepts = concepts && concepts.length > 0 ? concepts : buildFallbackConcepts(goal, numDays)

  const startDate = new Date()
  startDate.setDate(startDate.getDate() + (startDay - 1))
  const usedTitles = new Set()

  for (let offset = 0; offset < numDays; offset++) {
    const dayNumber = startDay + offset
    const date = new Date(startDate)
    date.setDate(startDate.getDate() + offset)

    const isWeekend = date.getDay() === 0 || date.getDay() === 6
    const totalMinutes = isWeekend ? weekendMins : weekdayMins

    // FIX: fallback to safeConcepts if timeline entry is undefined
    const concept = timeline[offset] || safeConcepts[safeConcepts.length - 1]
    const resources = getResources(goal, concept.name)
    const adaptivePlan = buildAdaptivePlan({
      profile: adaptiveProfile,
      conceptName: concept.name,
      difficulty: concept.difficulty || 2,
      totalMinutes,
      mode,
    })

    const adjustedTotalMinutes = adaptivePlan.totalMinutes || totalMinutes
    const taskCount = Math.max(2, Math.min(6, Math.round(adjustedTotalMinutes / 12)))
    // FIX: durationMin now always fits within totalMinutes
    const durationMin = Math.max(8, Math.floor(adjustedTotalMinutes / taskCount))

    // Determine flow-based task sequence for this day
    const isBossDay = dayNumber % 7 === 0 && dayNumber > 0
    const difficulty = adaptivePlan.difficulty
    const condensed = adaptivePlan.condensed || adjustedTotalMinutes < 20
    const mastery = adaptiveProfile?.conceptSummaries?.find((entry) => entry.conceptName === concept.name)?.masteryScore ?? null
    const flowSequence = buildFlowSequence(dayNumber, difficulty, {
      isBossDay,
      condensed,
      mastery,
      isReviewDay: adaptivePlan.shouldReviewToday,
    })

    // Core AI-generated tasks (lessons, quizzes, etc.)
    const coreTasks = await generateTeachingTasksForDay({
      goal,
      knowledge,
      concept,
      dayNumber,
      taskCount,
      durationMin,
      resources,
      openaiApiKey,
      usedTitles,
      adaptivePlan,
      mode,
    })

    // Inject flow engine tasks based on sequence
    // coreTasks = AI-generated concept tasks; flow adds the rest deterministically
    const tasks = [...coreTasks]
    const coreTypes = new Set(coreTasks.map(t => t.type))

    for (const flowItem of flowSequence) {
      // Skip if a task of this type already exists from AI generation
      if (coreTypes.has(flowItem.type)) continue

      if (flowItem.type === 'concept') {
        // Concept tasks come from AI generation, skip if already present
        continue
      } else if (flowItem.type === 'guided_practice') {
        tasks.push({
          id: `d${dayNumber}gp${tasks.length}`,
          type: 'guided_practice',
          title: uniqueTitle(`Practice: ${concept.name}`, usedTitles, dayNumber, tasks.length),
          description: adaptivePlan.state === 'struggling'
            ? `Break ${concept.name} into smaller steps with scaffolded hints and examples.`
            : adaptivePlan.shouldReviewToday && adaptivePlan.reviewFocus?.length
            ? `Reinforce weak spots while practicing ${concept.name}, with extra focus on ${adaptivePlan.reviewFocus[0].conceptName}.`
            : `Guided practice with scaffolded hints for ${concept.name}`,
          durationMin: Math.max(8, Math.round(durationMin * 1.2)),
          _concept: concept.name,
          _difficulty: difficulty,
          _flowStage: 'apply',
          ...buildAdaptiveTaskMetadata({ taskType: 'guided_practice', plan: adaptivePlan }),
          completed: false,
        })
      } else if (flowItem.type === 'challenge') {
        tasks.push({
          id: `d${dayNumber}ch`,
          type: 'challenge',
          title: uniqueTitle(`Challenge: ${concept.name}`, usedTitles, dayNumber, tasks.length),
          description: adaptivePlan.state === 'breezing'
            ? `Skip the basics and tackle a harder independent challenge on ${concept.name}.`
            : `Solve independently with minimal help — prove your understanding of ${concept.name}`,
          durationMin: Math.max(10, Math.round(durationMin * 1.5)),
          _concept: concept.name,
          _difficulty: Math.min(5, difficulty + 1),
          _flowStage: 'struggle',
          ...buildAdaptiveTaskMetadata({ taskType: 'challenge', plan: adaptivePlan }),
          completed: false,
        })
      } else if (flowItem.type === 'explain') {
        tasks.push({
          id: `d${dayNumber}ex`,
          type: 'explain',
          title: uniqueTitle(`Explain: ${concept.name}`, usedTitles, dayNumber, tasks.length),
          description: `Teach the concept back, debug scenarios, and predict outcomes for ${concept.name}`,
          durationMin: Math.max(8, durationMin),
          _concept: concept.name,
          _difficulty: difficulty,
          _flowStage: 'explain',
          ...buildAdaptiveTaskMetadata({ taskType: 'explain', plan: adaptivePlan }),
          completed: false,
        })
      } else if (flowItem.type === 'quiz') {
        tasks.push({
          id: `d${dayNumber}qz`,
          type: 'quiz',
          title: uniqueTitle(
            adaptivePlan.shouldReviewToday && adaptivePlan.reviewFocus?.length
              ? `Review Quiz: ${adaptivePlan.reviewFocus[0].conceptName}`
              : `Quiz: ${concept.name}`,
            usedTitles,
            dayNumber,
            tasks.length,
          ),
          description: adaptivePlan.shouldReviewToday && adaptivePlan.reviewFocus?.length
            ? `Target weak concepts first, then prove your understanding of ${concept.name}.`
            : `Test your recall and retention of ${concept.name}`,
          durationMin: Math.max(8, durationMin),
          _concept: concept.name,
          _difficulty: difficulty,
          _flowStage: 'prove',
          ...buildAdaptiveTaskMetadata({ taskType: 'quiz', plan: adaptivePlan }),
          completed: false,
        })
      } else if (flowItem.type === 'reflect') {
        tasks.push({
          id: `d${dayNumber}ref`,
          type: 'reflect',
          title: uniqueTitle(`Reflect: ${concept.name}`, usedTitles, dayNumber, tasks.length),
          description: `Reflect on what you learned about ${concept.name} — what clicked, what's fuzzy`,
          durationMin: 5,
          _concept: concept.name,
          _difficulty: difficulty,
          _flowStage: 'reflect',
          ...buildAdaptiveTaskMetadata({ taskType: 'reflect', plan: adaptivePlan }),
          completed: false,
        })
      } else if (flowItem.type === 'boss' && isBossDay) {
        tasks.push({
          id: `d${dayNumber}boss`,
          type: 'boss',
          title: uniqueTitle(`Boss Challenge: ${concept._moduleTitle || concept.name}`, usedTitles, dayNumber, tasks.length),
          description: `Multi-phase boss battle — prove your mastery of everything in this module`,
          durationMin: 15,
          _concept: concept.name,
          _moduleName: concept._moduleTitle || concept.name,
          _concepts: concept._allConcepts || [concept.name],
          _difficulty: Math.min(5, difficulty + 1),
          _flowStage: 'prove',
          ...buildAdaptiveTaskMetadata({ taskType: 'boss', plan: adaptivePlan }),
          xpReward: 200,
          completed: false,
        })
      }
    }

    days.push({
      day: dayNumber,
      date: date.toISOString().split('T')[0],
      // FIX: use concept.id not index
      conceptId: concept.id,
      conceptName: concept.name,
      tasks,
      isWeekend,
      totalMinutes: adjustedTotalMinutes,
      mode,
    })
  }

  return days
}

// ─────────────────────────────────────────────
// Build Explore Mode day (single concept, on-demand)
// Called when user completes a day and wants to continue
// ─────────────────────────────────────────────

export async function buildExploreDayTask(goal, concept, minsPerDay, dayNumber, options = {}) {
  const { knowledge = '', openaiApiKey = null, adaptiveProfile = null } = options
  const resources = getResources(goal, concept.name)
  const adaptivePlan = buildAdaptivePlan({
    profile: adaptiveProfile,
    conceptName: concept.name,
    difficulty: concept.difficulty || 2,
    totalMinutes: minsPerDay,
    mode: 'explore',
  })
  const adjustedMinutes = adaptivePlan.totalMinutes || minsPerDay
  const taskCount = Math.max(2, Math.min(6, Math.round(adjustedMinutes / 12)))
  const durationMin = Math.max(8, Math.floor(adjustedMinutes / taskCount))
  const usedTitles = new Set()

  const tasks = await generateTeachingTasksForDay({
    goal,
    knowledge,
    concept,
    dayNumber,
    taskCount,
    durationMin,
    resources,
    openaiApiKey,
    usedTitles,
    adaptivePlan,
    mode: 'explore',
  })

  const today = new Date()
  today.setDate(today.getDate() + (dayNumber - 1))

  return {
    day: dayNumber,
    date: today.toISOString().split('T')[0],
    conceptId: concept.id,
    conceptName: concept.name,
    tasks,
    isWeekend: today.getDay() === 0 || today.getDay() === 6,
    totalMinutes: adjustedMinutes,
    mode: 'explore',
  }
}

// ─────────────────────────────────────────────
// Persistence
// ─────────────────────────────────────────────

export async function saveDailyTasks({ supabase, goalId, userId, dailyPlan }) {
  const rows = dailyPlan.map((day) => ({
    goal_id: goalId,
    user_id: userId,
    day_number: day.day,
    task_date: day.date,
    tasks: day.tasks,
    covered_topics: Array.isArray(day.coveredTopics) && day.coveredTopics.length > 0
      ? day.coveredTopics
      : [day.conceptName],
    completion_status: 'pending',
    tasks_completed: 0,
    mode: day.mode || 'goal',
  }))

  const { data, error } = await supabase.from('daily_tasks').insert(rows).select('*')
  if (error) throw new Error(`Failed to save tasks: ${error.message}`)
  return data || []
}

export async function initializeUserProgress({ supabase, userId, goalId, totalDays, mode = 'goal' }) {
  const payload = {
    user_id: userId,
    goal_id: goalId,
    total_days: totalDays,
    current_streak: 0,
    longest_streak: 0,
    covered_topics: [],
    last_activity_date: new Date().toISOString().split('T')[0],
    mode,
  }

  const { error: insertError } = await supabase.from('user_progress').insert(payload)
  if (!insertError) return

  const isDuplicate = insertError.code === '23505' || /duplicate key|already exists/i.test(insertError.message || '')
  if (!isDuplicate) throw new Error(`Failed to initialize progress: ${insertError.message}`)

  const { error: updateError } = await supabase
    .from('user_progress')
    .update(payload)
    .eq('user_id', userId)
    .eq('goal_id', goalId)

  if (updateError) throw new Error(`Failed to initialize progress: ${updateError.message}`)
}

export async function updateGoalStatus({ supabase, goalId, mode = 'goal' }) {
  const { error } = await supabase
    .from('goals')
    .update({ status: 'active', level: 1, mode })
    .eq('id', goalId)

  if (error) throw new Error(`Failed to update goal: ${error.message}`)
}

// ─────────────────────────────────────────────
// Mastery tracking
// ─────────────────────────────────────────────

export async function updateConceptMastery({ supabase, userId, goalId, conceptId, signals = null }) {
  // FIX: conceptId must be the actual concept ID, not day_number
  // Callers must pass row.conceptId (stored in daily_tasks), not row.day_number
  const today = new Date().toISOString().split('T')[0]

  const { data: existing } = await supabase
    .from('concept_mastery')
    .select('mastery_score,review_interval')
    .eq('user_id', userId)
    .eq('goal_id', goalId)
    .eq('concept_id', String(conceptId))
    .maybeSingle()

  let masteryScore = Math.min(100, (existing?.mastery_score || 0) + 10)
  let reviewInterval = Math.min(30, Math.max(1, Math.round((existing?.review_interval || 1) * 1.5)))

  if (signals) {
    const performanceScore = calculateMasteryScore({
      quizScore: signals.quizScore ?? signals.accuracy ?? 0,
      challengeScore: signals.challengeScore ?? signals.accuracy ?? 0,
      hintsUsed: signals.hintsUsed ?? 0,
      maxHints: signals.maxHints ?? 3,
      explainQuality: signals.aiInteractionDepth ?? 0,
      timeEfficiency: (() => {
        const ratio = Number(signals.completionSpeedRatio) || 1
        if (ratio < 0.45) return 50
        if (ratio < 0.8) return 85
        if (ratio > 2.5) return 55
        if (ratio > 1.6) return 70
        return 100
      })(),
      reflectDepth: signals.reflectionQuality ?? 0,
      retryCount: Math.max(0, (Number(signals.attempts) || 1) - 1),
    })

    masteryScore = Math.round(((existing?.mastery_score || 45) * 0.55) + (performanceScore * 0.45))
    if (signals.misconceptionDetected) masteryScore -= 8
    if (signals.fragileKnowledge) masteryScore = Math.min(masteryScore, 78)
    masteryScore = Math.max(0, Math.min(100, masteryScore))

    if (signals.misconceptionDetected) {
      reviewInterval = 1
    } else if (signals.fragileKnowledge) {
      reviewInterval = 2
    } else if (masteryScore >= 90 && signals.solvedWithoutHelp) {
      reviewInterval = Math.min(30, Math.max(7, Math.round((existing?.review_interval || 4) * 1.9)))
    } else if (masteryScore >= 80) {
      reviewInterval = Math.min(21, Math.max(4, Math.round((existing?.review_interval || 3) * 1.4)))
    } else if (masteryScore >= 65) {
      reviewInterval = 3
    } else if (masteryScore >= 50) {
      reviewInterval = 2
    } else {
      reviewInterval = 1
    }
  }

  const { error } = await supabase
    .from('concept_mastery')
    .upsert({
      user_id: userId,
      goal_id: goalId,
      concept_id: String(conceptId),
      mastery_score: masteryScore,
      last_review: today,
      review_interval: reviewInterval,
    }, { onConflict: 'user_id,goal_id,concept_id' })

  if (error) throw new Error(`Failed to update concept mastery: ${error.message}`)
}

// ─────────────────────────────────────────────
// Goal Mode: generate next week of tasks
// ─────────────────────────────────────────────

export async function generateNextTasksIfNeeded({ supabase, goalId, userId }) {
  const [{ data: goalRow, error: goalError }, { data: progressRow, error: progressError }] = await Promise.all([
    supabase
      .from('goals')
      .select('goal_text,weekday_mins,weekend_mins,constraints,total_days,deadline,mode')
      .eq('id', goalId)
      .single(),
    supabase
      .from('user_progress')
      .select('total_days')
      .eq('goal_id', goalId)
      .eq('user_id', userId)
      .maybeSingle(),
  ])

  if (goalError) throw new Error(`Failed to load goal for next tasks: ${goalError.message}`)
  if (progressError) throw new Error(`Failed to inspect course progress: ${progressError.message}`)

  const { data: existingRows, error: existingError } = await supabase
    .from('daily_tasks')
    .select('id,day_number,task_date,completion_status,covered_topics,tasks')
    .eq('goal_id', goalId)
    .eq('user_id', userId)
    .order('day_number', { ascending: true })

  if (existingError) throw new Error(`Failed to inspect existing tasks: ${existingError.message}`)

  const { courseOutline, sequenceDayCount } = await recoverCourseOutlineIfNeeded({
    supabase,
    goalId,
    userId,
    goalRow,
    progressRow,
    existingRows: existingRows || [],
  })

  const scopedRows = filterRowsForCourseWindow(existingRows || [], sequenceDayCount)
  const tracker = buildPathOutlineTracker({
    courseOutline,
    rows: scopedRows,
    goalText: goalRow.goal_text,
  })

  if (tracker.courseCompleted) {
    return { generated: false, reason: 'course_finished' }
  }

  const knowledge = normalizeKnowledge(goalRow.constraints)
  const [{ data: historyRows }, { data: masteryRows }] = await Promise.all([
    supabase
      .from('daily_tasks')
      .select('day_number,task_date,completion_status,covered_topics,tasks')
      .eq('goal_id', goalId)
      .eq('user_id', userId)
      .order('day_number', { ascending: false })
      .limit(18),
    supabase
      .from('concept_mastery')
      .select('concept_id,mastery_score,last_review,review_interval')
      .eq('goal_id', goalId)
      .eq('user_id', userId),
  ])
  const adaptiveProfile = buildAdaptiveProfile(historyRows || [], masteryRows || [])

  if (tracker.currentItemKind === 'final_exam') {
    const finalExamRow = tracker.currentGeneratedRow
    if (finalExamRow?.completion_status === 'completed') {
      return { generated: false, reason: 'course_finished' }
    }
    if (finalExamRow) {
      return { generated: false, reason: 'final_exam_ready', rows: [finalExamRow], startDay: tracker.finalExamDayNumber }
    }

    const reusableExamRow = (existingRows || []).find((row) => Number(row?.day_number) === tracker.finalExamDayNumber) || null
    const examPlanDay = buildCourseFinalExamPlanDay({
      goalText: goalRow.goal_text,
      courseOutline,
      rows: scopedRows,
      totalDays: sequenceDayCount,
      existingTask: Array.isArray(reusableExamRow?.tasks)
        ? reusableExamRow.tasks.find(isCourseFinalExamTask) || reusableExamRow.tasks[0] || null
        : null,
    })
    const savedRow = await upsertDailyPlanDay({
      supabase,
      goalId,
      userId,
      planDay: {
        ...examPlanDay,
        coveredTopics: [examPlanDay.conceptName],
      },
      existingRow: reusableExamRow,
    })

    return {
      generated: true,
      daysGenerated: 1,
      startDay: examPlanDay.day,
      rows: savedRow ? [savedRow] : [],
      reason: 'final_exam_created',
    }
  }

  if (tracker.currentGeneratedRow) {
    return {
      generated: false,
      reason: 'next_item_ready',
      rows: [tracker.currentGeneratedRow],
      startDay: tracker.currentDayNumber,
    }
  }

  const nextItem = tracker.sequenceItems.find((item) => item.id === tracker.currentItemId) || null
  if (!nextItem) {
    return { generated: false, reason: 'course_boundary_reached' }
  }

  const existingSlotRow = (existingRows || []).find((row) => Number(row?.day_number) === Number(nextItem.dayNumber)) || null
  const planDay = await buildGoalPlanDayFromSequenceItem({
    goalRow: { ...goalRow, course_outline: courseOutline },
    item: nextItem,
    knowledge,
    openaiApiKey: process.env.OPENAI_API_KEY,
    adaptiveProfile,
    existingRows: existingRows || [],
  })

  const savedRow = await upsertDailyPlanDay({
    supabase,
    goalId,
    userId,
    planDay,
    existingRow: existingSlotRow,
  })

  return {
    generated: true,
    daysGenerated: 1,
    startDay: nextItem.dayNumber,
    rows: savedRow ? [savedRow] : [],
    reason: nextItem.type === 'project' ? 'project_day_created' : 'unit_day_created',
  }
}

// ─────────────────────────────────────────────
// Explore Mode: generate next day on-demand
// Called after user completes today's explore session
// ─────────────────────────────────────────────

export async function generateNextExploreDay({ supabase, goalId, userId }) {
  const { data: goalRow, error: goalError } = await supabase
    .from('goals')
    .select('goal_text,weekday_mins,weekend_mins,constraints')
    .eq('id', goalId)
    .single()

  if (goalError) throw new Error(`Failed to load goal: ${goalError.message}`)

  // Find what concepts we've already covered
  const { data: existingRows } = await supabase
    .from('daily_tasks')
    .select('day_number, task_date, completion_status, covered_topics, tasks')
    .eq('goal_id', goalId)
    .eq('user_id', userId)
    .order('day_number', { ascending: false })

  const maxDay = existingRows?.[0]?.day_number || 0
  const coveredConceptNames = (existingRows || [])
    .flatMap((row) => row.covered_topics || [])
    .filter(Boolean)

  // Build lightweight concept objects from covered names for context
  const coveredAsConcepts = coveredConceptNames.map((name, i) => ({ id: i + 1, name }))

  const knowledge = Array.isArray(goalRow.constraints)
    ? goalRow.constraints.join(', ')
    : (goalRow.constraints || '')
  const { data: masteryRows } = await supabase
    .from('concept_mastery')
    .select('concept_id,mastery_score,last_review,review_interval')
    .eq('goal_id', goalId)
    .eq('user_id', userId)
  const adaptiveProfile = buildAdaptiveProfile(existingRows || [], masteryRows || [])

  // Generate fresh concepts that continue from where we left off
  const nextConcepts = await generateExploreConcepts({
    goal: goalRow.goal_text,
    knowledge,
    afterConcepts: coveredAsConcepts,
    openaiApiKey: process.env.OPENAI_API_KEY,
  })

  // Pick the first new concept for tomorrow
  const nextConcept = nextConcepts[0]
  const today = new Date()
  const isWeekend = today.getDay() === 0 || today.getDay() === 6
  const minsPerDay = isWeekend ? goalRow.weekend_mins : goalRow.weekday_mins

  const nextDay = await buildExploreDayTask(
    goalRow.goal_text,
    nextConcept,
    minsPerDay,
    maxDay + 1,
    { knowledge, openaiApiKey: process.env.OPENAI_API_KEY, adaptiveProfile },
  )

  const insertedRows = await saveDailyTasks({ supabase, goalId, userId, dailyPlan: [nextDay] })
  return { generated: true, day: nextDay, rows: insertedRows }
}
