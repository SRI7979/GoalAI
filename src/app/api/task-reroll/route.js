import { getOpenAIModel } from '@/lib/openaiModels'
import { buildInventoryCountsFromTransactions, getTrackedInventoryReasons } from '@/lib/shopInventory'
import { getSupabaseServerClient } from '@/lib/supabaseServer'
import { getCanonicalTaskType, normalizeLearningTask, normalizeLearningTasks } from '@/lib/taskTaxonomy'

const INELIGIBLE_TYPES = new Set(['project', 'boss', 'quiz', 'final_exam'])

const TYPE_FAMILIES = {
  concept: ['concept', 'recall', 'explain'],
  guided_practice: ['guided_practice', 'explain', 'challenge'],
  challenge: ['guided_practice', 'explain', 'recall'],
  explain: ['explain', 'concept', 'recall'],
  recall: ['recall', 'concept', 'explain'],
  reflect: ['reflect', 'recall', 'concept'],
}

const TYPE_PRESENTATIONS = {
  concept: ['lesson', 'reading', 'video'],
  guided_practice: ['practice', 'exercise'],
  explain: ['ai_interaction', 'discussion'],
  recall: ['review', 'flashcard'],
}

function extractAccessToken(request) {
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization')
  if (!authHeader) return null
  if (!authHeader.toLowerCase().startsWith('bearer ')) return null
  return authHeader.slice(7).trim() || null
}

function normalizeRerollTask(task = {}, originalTask = {}, concept = '') {
  const normalizedOriginalTask = normalizeLearningTask(originalTask)
  const allowedTypes = TYPE_FAMILIES[normalizedOriginalTask.type] || ['concept', 'recall', 'explain']
  const fallbackType = allowedTypes[0]
  const requestedType = getCanonicalTaskType(task?.type, task)
  const type = allowedTypes.includes(requestedType) ? requestedType : fallbackType
  const durationMin = Math.max(
    8,
    Math.min(45, Number(task?.durationMin) || Number(normalizedOriginalTask?.estimatedTimeMin) || Number(normalizedOriginalTask?.durationMin) || 15),
  )
  const allowedPresentations = TYPE_PRESENTATIONS[type] || []
  const presentation = allowedPresentations.includes(String(task?.presentation || '').trim())
    ? String(task.presentation).trim()
    : allowedPresentations[0]

  return normalizeLearningTask({
    ...normalizedOriginalTask,
    id: `reroll-${String(originalTask?.id || 'task')}-${Date.now()}`,
    type,
    ...(presentation ? { presentation } : {}),
    title: String(task?.title || `${concept}: alternate ${type}`).trim(),
    description: String(task?.description || `A fresh way to advance ${concept} from a different angle.`).trim(),
    durationMin,
    resourceUrl: String(task?.resourceUrl || originalTask?.resourceUrl || '').trim(),
    resourceTitle: String(task?.resourceTitle || originalTask?.resourceTitle || '').trim(),
    _adaptive: undefined,
    completed: false,
  })
}

function buildFallbackTask(originalTask = {}, concept = '', goalText = '') {
  const normalizedOriginalTask = normalizeLearningTask(originalTask)
  const nextType = (TYPE_FAMILIES[normalizedOriginalTask.type] || ['concept'])[0]
  const lowerConcept = String(concept || originalTask.title || 'the concept').toLowerCase()
  return normalizeRerollTask({
    type: nextType,
    title: `Alternate ${concept}`,
    description: `Re-approach ${lowerConcept} from a different angle that still moves ${goalText || 'your goal'} forward.`,
  }, originalTask, concept)
}

async function generateRerolledTask({ originalTask, concept, goalText, openaiApiKey }) {
  if (!openaiApiKey) return buildFallbackTask(originalTask, concept, goalText)

  const normalizedOriginalTask = normalizeLearningTask(originalTask)
  const allowedTypes = TYPE_FAMILIES[normalizedOriginalTask.type] || ['concept', 'recall', 'explain']
  const prompt = `Create one replacement learning task for a student.

GOAL: ${goalText}
CONCEPT: ${concept}
CURRENT TASK TYPE: ${normalizedOriginalTask.type}
CURRENT TASK TITLE: ${normalizedOriginalTask.title}
CURRENT TASK DESCRIPTION: ${normalizedOriginalTask.description || 'N/A'}
CURRENT DURATION: ${Number(normalizedOriginalTask.estimatedTimeMin || normalizedOriginalTask.durationMin) || 15} minutes
ALLOWED REPLACEMENT TYPES: ${allowedTypes.join(', ')}
OPTIONAL PRESENTATION MODES: concept -> lesson/video/reading, guided_practice -> practice/exercise, explain -> ai_interaction/discussion, recall -> review/flashcard

Return ONLY valid JSON:
{
  "type": "${allowedTypes[0]}",
  "presentation": "",
  "title": "Specific replacement task title",
  "description": "A clear, concrete description for the replacement task",
  "durationMin": ${Number(normalizedOriginalTask.estimatedTimeMin || normalizedOriginalTask.durationMin) || 15},
  "resourceUrl": "",
  "resourceTitle": ""
}

RULES:
- Keep the task in the same concept band and effort band as the original
- Make it feel different from the original task, not a rename
- Use only canonical task types
- Do not generate project, boss, quiz, or final_exam tasks
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

    const tasks = normalizeLearningTasks(row.tasks)
    const targetTaskIndex = tasks.findIndex((task) => String(task.id) === String(taskId))
    if (targetTaskIndex < 0) return Response.json({ error: 'Task not found' }, { status: 404 })

    const targetTask = tasks[targetTaskIndex]
    if (targetTask.completed) return Response.json({ error: 'Completed tasks cannot be rerolled' }, { status: 400 })
    if (INELIGIBLE_TYPES.has(getCanonicalTaskType(targetTask.type, targetTask))) {
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
