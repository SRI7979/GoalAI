import { getOpenAIModel } from '@/lib/openaiModels'
import { buildInventoryCountsFromTransactions, getTrackedInventoryReasons } from '@/lib/shopInventory'
import { getSupabaseServerClient } from '@/lib/supabaseServer'

const INELIGIBLE_TYPES = new Set(['project', 'boss', 'capstone', 'quiz'])

const TYPE_FAMILIES = {
  lesson: ['reading', 'video', 'discussion', 'flashcard'],
  video: ['lesson', 'reading', 'discussion', 'flashcard'],
  reading: ['lesson', 'discussion', 'flashcard', 'video'],
  flashcard: ['reading', 'discussion', 'lesson', 'video'],
  discussion: ['reading', 'lesson', 'flashcard', 'reflection'],
  practice: ['exercise', 'ai_interaction', 'challenge', 'reflection'],
  exercise: ['practice', 'ai_interaction', 'challenge', 'reflection'],
  review: ['flashcard', 'reading', 'discussion', 'lesson'],
  ai_interaction: ['practice', 'exercise', 'reflection', 'challenge'],
  reflection: ['discussion', 'ai_interaction', 'reading', 'lesson'],
  challenge: ['exercise', 'practice', 'ai_interaction', 'reflection'],
}

function extractAccessToken(request) {
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization')
  if (!authHeader) return null
  if (!authHeader.toLowerCase().startsWith('bearer ')) return null
  return authHeader.slice(7).trim() || null
}

function normalizeRerollTask(task = {}, originalTask = {}, concept = '') {
  const allowedTypes = TYPE_FAMILIES[originalTask.type] || ['lesson', 'reading', 'discussion']
  const fallbackType = allowedTypes[0]
  const type = allowedTypes.includes(task?.type) ? task.type : fallbackType
  const durationMin = Math.max(
    8,
    Math.min(45, Number(task?.durationMin) || Number(originalTask?.durationMin) || 15),
  )

  return {
    ...originalTask,
    id: `reroll-${String(originalTask?.id || 'task')}-${Date.now()}`,
    type,
    title: String(task?.title || `${concept}: alternate ${type}`).trim(),
    description: String(task?.description || `A fresh way to practice ${concept}.`).trim(),
    durationMin,
    completed: false,
    resourceUrl: String(task?.resourceUrl || originalTask?.resourceUrl || '').trim(),
    resourceTitle: String(task?.resourceTitle || originalTask?.resourceTitle || '').trim(),
    _adaptive: undefined,
  }
}

function buildFallbackTask(originalTask = {}, concept = '', goalText = '') {
  const nextType = (TYPE_FAMILIES[originalTask.type] || ['lesson'])[0]
  const lowerConcept = String(concept || originalTask.title || 'the concept').toLowerCase()
  return normalizeRerollTask({
    type: nextType,
    title: `Alternate ${concept}`,
    description: `Re-approach ${lowerConcept} from a different angle that still moves ${goalText || 'your goal'} forward.`,
  }, originalTask, concept)
}

async function generateRerolledTask({ originalTask, concept, goalText, openaiApiKey }) {
  if (!openaiApiKey) return buildFallbackTask(originalTask, concept, goalText)

  const allowedTypes = TYPE_FAMILIES[originalTask.type] || ['lesson', 'reading', 'discussion']
  const prompt = `Create one replacement learning task for a student.

GOAL: ${goalText}
CONCEPT: ${concept}
CURRENT TASK TYPE: ${originalTask.type}
CURRENT TASK TITLE: ${originalTask.title}
CURRENT TASK DESCRIPTION: ${originalTask.description || 'N/A'}
CURRENT DURATION: ${Number(originalTask.durationMin) || 15} minutes
ALLOWED REPLACEMENT TYPES: ${allowedTypes.join(', ')}

Return ONLY valid JSON:
{
  "type": "${allowedTypes[0]}",
  "title": "Specific replacement task title",
  "description": "A clear, concrete description for the replacement task",
  "durationMin": ${Number(originalTask.durationMin) || 15},
  "resourceUrl": "",
  "resourceTitle": ""
}

RULES:
- Keep the task in the same concept band and effort band as the original
- Make it feel different from the original task, not a rename
- Do not generate project, boss, capstone, or quiz tasks
- Keep duration within plus or minus 5 minutes of the original
- Title and description should be concise and specific`

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: getOpenAIModel('taskReroll'),
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.55,
        max_tokens: 500,
      }),
    })

    if (!response.ok) return buildFallbackTask(originalTask, concept, goalText)

    const data = await response.json()
    const raw = data.choices?.[0]?.message?.content?.trim() || ''
    const clean = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
    const parsed = JSON.parse(clean)
    return normalizeRerollTask(parsed, originalTask, concept)
  } catch {
    return buildFallbackTask(originalTask, concept, goalText)
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { goalId, taskRowId, taskId } = body
    const accessToken = extractAccessToken(request) || body?.accessToken || null
    const supabase = getSupabaseServerClient({ accessToken })

    if (!goalId || !taskRowId || !taskId) {
      return Response.json({ error: 'Missing goalId, taskRowId, or taskId' }, { status: 400 })
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const inventoryReasons = getTrackedInventoryReasons()
    const { data: inventoryRows } = await supabase
      .from('gem_transactions')
      .select('reason')
      .eq('user_id', user.id)
      .eq('goal_id', goalId)
      .in('reason', inventoryReasons)

    const inventoryCounts = buildInventoryCountsFromTransactions(inventoryRows || [])
    if ((inventoryCounts.taskReroll || 0) <= 0) {
      return Response.json({ error: 'No task reroll passes available', inventoryCounts }, { status: 400 })
    }

    const [{ data: row, error: rowError }, { data: goal, error: goalError }] = await Promise.all([
      supabase
        .from('daily_tasks')
        .select('*')
        .eq('id', taskRowId)
        .eq('goal_id', goalId)
        .eq('user_id', user.id)
        .single(),
      supabase
        .from('goals')
        .select('goal_text')
        .eq('id', goalId)
        .eq('user_id', user.id)
        .single(),
    ])

    if (rowError || !row) return Response.json({ error: 'Task row not found' }, { status: 404 })
    if (goalError || !goal) return Response.json({ error: 'Goal not found' }, { status: 404 })

    const tasks = Array.isArray(row.tasks) ? row.tasks : []
    const targetTaskIndex = tasks.findIndex((task) => String(task.id) === String(taskId))
    if (targetTaskIndex < 0) return Response.json({ error: 'Task not found' }, { status: 404 })

    const targetTask = tasks[targetTaskIndex]
    if (targetTask.completed) return Response.json({ error: 'Completed tasks cannot be rerolled' }, { status: 400 })
    if (INELIGIBLE_TYPES.has(targetTask.type)) {
      return Response.json({ error: 'This task type cannot be rerolled' }, { status: 400 })
    }

    const concept = targetTask._concept || row.covered_topics?.[0] || targetTask.title
    const replacementTask = await generateRerolledTask({
      originalTask: targetTask,
      concept,
      goalText: goal.goal_text || '',
      openaiApiKey: process.env.OPENAI_API_KEY,
    })

    const updatedTasks = tasks.map((task, index) => (
      index === targetTaskIndex ? replacementTask : task
    ))

    const { error: updateError } = await supabase
      .from('daily_tasks')
      .update({ tasks: updatedTasks })
      .eq('id', taskRowId)
      .eq('user_id', user.id)

    if (updateError) {
      return Response.json({ error: updateError.message }, { status: 500 })
    }

    await supabase.from('gem_transactions').insert({
      user_id: user.id,
      goal_id: goalId,
      amount: 0,
      reason: 'use_taskReroll',
    })

    return Response.json({
      ok: true,
      replacementTask,
      taskRowId,
      taskId,
      inventoryCounts: {
        ...inventoryCounts,
        taskReroll: Math.max(0, (inventoryCounts.taskReroll || 0) - 1),
      },
    })
  } catch (error) {
    return Response.json({ error: error.message || 'Task reroll failed' }, { status: 500 })
  }
}
