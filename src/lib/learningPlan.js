import { buildFlowSequence } from '@/lib/learningEngine'

// ─────────────────────────────────────────────
// Constants & helpers
// ─────────────────────────────────────────────

const TASK_SEQUENCE = ['lesson', 'video', 'practice', 'exercise', 'quiz', 'review']

// Extended task types (includes learning engine types)
const EXTENDED_TASK_TYPES = [...TASK_SEQUENCE, 'guided_practice', 'challenge', 'ai_interaction', 'reflection', 'boss']

const typeVerbs = {
  lesson: 'Learn',
  video: 'Watch',
  practice: 'Practice',
  exercise: 'Build',
  quiz: 'Test',
  review: 'Review',
  guided_practice: 'Practice',
  challenge: 'Challenge',
  ai_interaction: 'Explain',
  reflection: 'Reflect',
  boss: 'Battle',
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

  try {
    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
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
              '1. Break the skill into 4-8 Modules (high-level topics that group related concepts)',
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
              '- 4-8 modules, each with 3-12 days',
              '- Day numbers must be sequential starting from 1',
              '- difficulty: 1 (intro) to 5 (advanced)',
              '- Every concept mentioned should be specific and actionable, not vague',
              '- Module titles should be clear topic groupings',
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
    // Fallback: build a basic outline from fallback concepts
    const fallbackConcepts = buildFallbackConcepts(goal, days)
    const fallbackModules = [
      { title: 'Foundations', description: `Core fundamentals of ${goal}`, days: [] },
      { title: 'Core Skills', description: `Build practical skills in ${goal}`, days: [] },
      { title: 'Application', description: `Apply ${goal} to real problems`, days: [] },
      { title: 'Mastery', description: `Advanced ${goal} and integration`, days: [] },
    ]

    let dayNum = 1
    fallbackConcepts.forEach((concept, i) => {
      const moduleIdx = Math.min(3, Math.floor(i / Math.ceil(fallbackConcepts.length / 4)))
      for (let d = 0; d < concept.estimatedDays && dayNum <= days; d++) {
        fallbackModules[moduleIdx].days.push({
          day: dayNum++,
          title: concept.name,
          concepts: [concept.name],
          estimatedMinutes: minutesPerDay || 30,
          difficulty: concept.difficulty,
        })
      }
    })

    return {
      version: 'v1',
      goal,
      skillLevel,
      totalDays: days,
      estimatedHours: Math.round(days * (minutesPerDay || 30) / 60),
      completionProbability: 75,
      recommendedDays: days,
      modules: fallbackModules.filter(m => m.days.length > 0),
      concepts: fallbackConcepts,
      previous_version: null,
    }
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
        model: 'gpt-4o-mini',
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
        model: 'gpt-4o-mini',
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
  return EXTENDED_TASK_TYPES.includes(normalized) ? normalized : TASK_SEQUENCE[index % TASK_SEQUENCE.length]
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

function buildFallbackTasksForDay({ goal, concept, taskCount, durationMin, dayNumber, resources, usedTitles }) {
  return Array.from({ length: taskCount }).map((_, idx) => {
    const type = TASK_SEQUENCE[idx % TASK_SEQUENCE.length]
    const resource = resources[idx % resources.length]
    const action = `${typeVerbs[type]} one focused section on ${concept.name} and take concise notes.`
    const outcome = `Produce a short summary and one practical takeaway for ${goal}.`
    const title = uniqueTitle(`${typeVerbs[type]} ${concept.name} - Day ${dayNumber}`, usedTitles, dayNumber, idx)

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
  mode = 'goal', // 'goal' | 'explore'
}) {
  if (!openaiApiKey) {
    return buildFallbackTasksForDay({ goal, concept, taskCount, durationMin, dayNumber, resources, usedTitles })
  }

  try {
    const modeInstruction = mode === 'explore'
      ? 'This is Explore Mode (no deadline pressure). Make tasks feel discovery-oriented and curiosity-driven.'
      : 'This is Goal Mode (deadline-driven). Make tasks focused, efficient, and progress-oriented.'

    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.4,
        max_tokens: 1800,
        messages: [{
          role: 'user',
          content: [
            `Generate ${taskCount} unique daily learning tasks.`,
            `Goal: ${goal}`,
            `Prior knowledge: ${knowledge || 'Beginner'}`,
            `Day: ${dayNumber}`,
            concept._moduleTitle ? `Module: ${concept._moduleTitle}` : '',
            concept._dayTitle ? `Day topic: ${concept._dayTitle}` : '',
            `Concept: ${concept.name}`,
            `Concept description: ${concept.description || 'N/A'}`,
            concept._allConcepts?.length > 1 ? `Related concepts for today: ${concept._allConcepts.join(', ')}` : '',
            `Each task should be ~${durationMin} minutes. Total session = ${taskCount * durationMin} minutes.`,
            modeInstruction,
            `Allowed task types: ${TASK_SEQUENCE.join(', ')}`,
            `Resource candidates JSON: ${JSON.stringify(resources)}`,
            'Return ONLY strict JSON: {"tasks":[{"type":"lesson","title":"...","action":"...","outcome":"...","description":"...","durationMin":15,"resourceUrl":"https://...","resourceTitle":"...","resourceType":"article"}]}',
            'Rules: tasks must be practical and specific — each task should feel like a real step forward. Titles must be distinct, action and outcome required, include concrete resourceUrl and resourceTitle for every task. No generic fluff.',
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

    const normalized = aiTasks.slice(0, taskCount).map((task, idx) => {
      const type = normalizeTaskType(task?.type, idx)
      const resource = resources[idx % resources.length]
      const fallbackTitle = `${typeVerbs[type]} ${concept.name} - Day ${dayNumber}`
      const title = uniqueTitle(normalizeTitle(task?.title, fallbackTitle), usedTitles, dayNumber, idx)
      const action = String(task?.action || '').trim() || `${typeVerbs[type]} ${concept.name} and produce a concrete artifact.`
      const outcome = String(task?.outcome || '').trim() || `Demonstrate understanding of ${concept.name} in one output.`
      const description = String(task?.description || '').trim() || `Action: ${action} Outcome: ${outcome}`

      return {
        id: `d${dayNumber}t${idx + 1}`,
        type,
        title,
        action,
        outcome,
        description,
        // FIX: enforce durationMin to fit within user's actual time budget
        durationMin: Math.max(8, Math.min(durationMin * 2, Number(task?.durationMin) || durationMin)),
        resourceUrl: String(task?.resourceUrl || '').trim() || resource.url,
        resourceTitle: String(task?.resourceTitle || '').trim() || resource.title,
        resourceType: String(task?.resourceType || '').trim() || resource.type,
        completed: false,
      }
    })

    if (normalized.length < taskCount) {
      const fallback = buildFallbackTasksForDay({
        goal,
        concept,
        taskCount: taskCount - normalized.length,
        durationMin,
        dayNumber,
        resources,
        usedTitles,
      })
      return normalized.concat(fallback)
    }

    return normalized
  } catch {
    return buildFallbackTasksForDay({ goal, concept, taskCount, durationMin, dayNumber, resources, usedTitles })
  }
}

// ─────────────────────────────────────────────
// Build daily tasks (Goal Mode)
// ─────────────────────────────────────────────

export async function buildDailyTasks(goal, concepts, weekdayMins, weekendMins, startDay, numDays, options = {}) {
  const { knowledge = '', openaiApiKey = null, mode = 'goal' } = options
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

    const taskCount = Math.max(2, Math.min(6, Math.round(totalMinutes / 12)))
    // FIX: durationMin now always fits within totalMinutes
    const durationMin = Math.max(8, Math.floor(totalMinutes / taskCount))

    // Determine flow-based task sequence for this day
    const isBossDay = dayNumber % 7 === 0 && dayNumber > 0
    const difficulty = concept.difficulty || 2
    const condensed = totalMinutes < 20
    const flowSequence = buildFlowSequence(dayNumber, difficulty, { isBossDay, condensed })

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
      mode,
    })

    // Inject learning engine tasks based on flow sequence
    const tasks = [...coreTasks]
    const coreTypes = new Set(coreTasks.map(t => t.type))

    for (const flowItem of flowSequence) {
      // Skip if a task of this type already exists from AI generation
      if (coreTypes.has(flowItem.type)) continue
      // Skip types that map to the same thing (e.g. practice ≈ guided_practice)
      if (flowItem.type === 'guided_practice' && (coreTypes.has('practice') || coreTypes.has('exercise'))) continue

      if (flowItem.type === 'guided_practice') {
        tasks.push({
          id: `d${dayNumber}gp`,
          type: 'guided_practice',
          title: uniqueTitle(`Practice: ${concept.name}`, usedTitles, dayNumber, tasks.length),
          description: `Guided practice with scaffolded hints for ${concept.name}`,
          durationMin: Math.max(8, Math.round(durationMin * 1.2)),
          _concept: concept.name,
          _difficulty: difficulty,
          _flowStage: 'apply',
          completed: false,
        })
      } else if (flowItem.type === 'challenge') {
        tasks.push({
          id: `d${dayNumber}ch`,
          type: 'challenge',
          title: uniqueTitle(`Challenge: ${concept.name}`, usedTitles, dayNumber, tasks.length),
          description: `Harder problem with minimal guidance — test your deep understanding of ${concept.name}`,
          durationMin: Math.max(10, Math.round(durationMin * 1.5)),
          _concept: concept.name,
          _difficulty: Math.min(5, difficulty + 1),
          _flowStage: 'struggle',
          completed: false,
        })
      } else if (flowItem.type === 'ai_interaction') {
        tasks.push({
          id: `d${dayNumber}ai`,
          type: 'ai_interaction',
          title: uniqueTitle(`Explain & Debug: ${concept.name}`, usedTitles, dayNumber, tasks.length),
          description: `Teach the concept back, debug scenarios, and predict outcomes for ${concept.name}`,
          durationMin: Math.max(8, durationMin),
          _concept: concept.name,
          _difficulty: difficulty,
          _flowStage: 'explain',
          completed: false,
        })
      } else if (flowItem.type === 'reflection') {
        tasks.push({
          id: `d${dayNumber}ref`,
          type: 'reflection',
          title: uniqueTitle(`Reflect: ${concept.name}`, usedTitles, dayNumber, tasks.length),
          description: `Reflect on what you learned about ${concept.name} — what clicked, what's fuzzy`,
          durationMin: 5,
          _concept: concept.name,
          _difficulty: difficulty,
          _flowStage: 'reflect',
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
          xpReward: 200,
          completed: false,
        })
      }
    }

    // Inject a portfolio project task every 5 days
    if (dayNumber % 5 === 0 && dayNumber > 0) {
      tasks.push({
        id: `d${dayNumber}project`,
        type: 'project',
        title: `Milestone Project: Apply ${concept.name}`,
        description: 'Apply what you\'ve learned in a hands-on portfolio project',
        durationMin: 60,
        isProjectTrigger: true,
        xpReward: 100,
        completed: false,
      })
    }

    days.push({
      day: dayNumber,
      date: date.toISOString().split('T')[0],
      // FIX: use concept.id not index
      conceptId: concept.id,
      conceptName: concept.name,
      tasks,
      isWeekend,
      totalMinutes,
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
  const { knowledge = '', openaiApiKey = null } = options
  const resources = getResources(goal, concept.name)
  const taskCount = Math.max(2, Math.min(6, Math.round(minsPerDay / 12)))
  const durationMin = Math.max(8, Math.floor(minsPerDay / taskCount))
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
    totalMinutes: minsPerDay,
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
    covered_topics: [day.conceptName],
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

export async function updateConceptMastery({ supabase, userId, goalId, conceptId }) {
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

  const masteryScore = Math.min(100, (existing?.mastery_score || 0) + 10)
  const reviewInterval = Math.min(30, Math.max(1, Math.round((existing?.review_interval || 1) * 1.5)))

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
  const { data: completedRows, error: completedError } = await supabase
    .from('daily_tasks')
    .select('day_number')
    .eq('goal_id', goalId)
    .eq('user_id', userId)
    .eq('completion_status', 'completed')
    .order('day_number', { ascending: false })

  if (completedError) throw new Error(`Failed to evaluate next tasks: ${completedError.message}`)

  const highestCompleted = completedRows?.[0]?.day_number || 0

  const { data: existingRows, error: existingError } = await supabase
    .from('daily_tasks')
    .select('day_number')
    .eq('goal_id', goalId)
    .eq('user_id', userId)
    .order('day_number', { ascending: false })

  if (existingError) throw new Error(`Failed to inspect existing tasks: ${existingError.message}`)

  const maxDay = existingRows?.[0]?.day_number || 0
  const pendingAhead = (existingRows || []).filter((row) => row.day_number > highestCompleted).length
  // Keep at least 2 days buffered ahead
  if (pendingAhead >= 2) return { generated: false, reason: 'enough_tasks_ahead' }

  const { data: goalRow, error: goalError } = await supabase
    .from('goals')
    .select('goal_text,weekday_mins,weekend_mins,constraints,course_outline')
    .eq('id', goalId)
    .single()

  if (goalError) throw new Error(`Failed to load goal for next tasks: ${goalError.message}`)

  const knowledge = Array.isArray(goalRow.constraints) ? goalRow.constraints.join(', ') : (goalRow.constraints || '')

  // Use stored course outline concepts if available, else generate fresh concept map
  let concepts
  const outline = goalRow.course_outline
  if (outline?.concepts?.length > 0) {
    // Filter outline concepts to those relevant for the upcoming days
    const upcomingConcepts = outline.concepts.filter(c => c.id > maxDay - 2)
    concepts = upcomingConcepts.length > 0 ? upcomingConcepts : outline.concepts.slice(-6)
  } else {
    concepts = await generateConceptMap({
      goal: goalRow.goal_text,
      knowledge,
      days: 14,
      openaiApiKey: process.env.OPENAI_API_KEY,
    })
  }

  const nextPlan = await buildDailyTasks(
    goalRow.goal_text,
    concepts,
    goalRow.weekday_mins,
    goalRow.weekend_mins,
    maxDay + 1,
    3,
    { knowledge, openaiApiKey: process.env.OPENAI_API_KEY, mode: 'goal' },
  )

  const insertedRows = await saveDailyTasks({ supabase, goalId, userId, dailyPlan: nextPlan })
  return { generated: true, daysGenerated: nextPlan.length, startDay: maxDay + 1, rows: insertedRows }
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
    .select('day_number, covered_topics')
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
    { knowledge, openaiApiKey: process.env.OPENAI_API_KEY },
  )

  const insertedRows = await saveDailyTasks({ supabase, goalId, userId, dailyPlan: [nextDay] })
  return { generated: true, day: nextDay, rows: insertedRows }
}
