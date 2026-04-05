import { getOpenAIModel } from '@/lib/openaiModels'
import { getSupabaseServerClient } from '@/lib/supabaseServer'
import { getCanonicalTaskType, normalizeLearningTask, normalizeLearningTasks } from '@/lib/taskTaxonomy'

const EXTRA_TASK_TYPES = ['concept', 'guided_practice', 'recall', 'quiz', 'explain']

function extractAccessToken(request) {
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization')
  if (!authHeader) return null
  if (!authHeader.toLowerCase().startsWith('bearer ')) return null
  return authHeader.slice(7).trim() || null
}

function normalizeExtraTask(task, fallbackType, index, baseDuration, concept, goal) {
  const type = getCanonicalTaskType(task?.type || fallbackType, task)
  const durationMin = Math.max(8, Number(task?.durationMin) || baseDuration)
  const title = String(task?.title || `Extra ${type} on ${concept}`).trim()
  const description = String(task?.description || `Go deeper on ${concept} with a concrete output for ${goal}.`).trim()
  return normalizeLearningTask({
    type,
    presentation: String(task?.presentation || '').trim() || undefined,
    title,
    description,
    durationMin,
    resourceUrl: String(task?.resourceUrl || '').trim() || 'https://www.khanacademy.org/',
    resourceTitle: String(task?.resourceTitle || '').trim() || `Extra Practice ${index + 1}`,
    resourceType: String(task?.resourceType || '').trim() || 'article',
    completed: false,
  })
}

async function generateExtraTasks({ goal, concept, count, baseDuration, openaiApiKey }) {
  if (!openaiApiKey) return null

  try {
    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: getOpenAIModel('addMoreTasks'),
        temperature: 0.45,
        max_tokens: 1200,
        messages: [{
          role: 'user',
          content: `Create ${count} additional follow-up tasks for this learning day.
Goal: ${goal}
Concept: ${concept}
Each task should be about ${baseDuration} minutes.
Return ONLY JSON: {"tasks":[{"type":"guided_practice","presentation":"exercise","title":"...","description":"...","durationMin":12,"resourceUrl":"https://...","resourceTitle":"...","resourceType":"article"}]}
Rules: use only canonical task types (concept, guided_practice, explain, recall, quiz), practical, specific, no duplicate titles, include resource url/title.`,
        }],
      }),
    })
    if (!openaiRes.ok) return null

    const data = await openaiRes.json()
    const text = data.choices?.[0]?.message?.content || ''
    let jsonStr = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
    const firstBrace = jsonStr.indexOf('{')
    if (firstBrace >= 0) jsonStr = jsonStr.slice(firstBrace)
    const parsed = JSON.parse(jsonStr)
    if (!Array.isArray(parsed?.tasks)) return null
    return parsed.tasks.slice(0, count)
  } catch (_) {
    return null
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { taskRowId, goalId, userId } = body || {}
    const accessToken = extractAccessToken(request) || body?.accessToken || null
    const supabase = getSupabaseServerClient({ accessToken })

    if (!taskRowId || !goalId || !userId) {
      return Response.json({ error: 'Missing taskRowId, goalId, or userId' }, { status: 400 })
    }

    const { data: row, error: rowError } = await supabase
      .from('daily_tasks')
      .select('id,goal_id,user_id,tasks,covered_topics')
      .eq('id', taskRowId)
      .eq('goal_id', goalId)
      .eq('user_id', userId)
      .single()

    if (rowError || !row) {
      return Response.json({ error: `Task row not found: ${rowError?.message || 'unknown error'}` }, { status: 404 })
    }

    const { data: goalRow } = await supabase
      .from('goals')
      .select('goal_text')
      .eq('id', goalId)
      .eq('user_id', userId)
      .maybeSingle()

    const currentTasks = normalizeLearningTasks(row.tasks)
    const goalText = goalRow?.goal_text || 'your learning goal'
    const concept = row.covered_topics?.[0] || goalText
    const baseDuration = Math.max(10, Math.round((currentTasks.reduce((sum, t) => sum + (Number(t.durationMin || t.estimated_minutes) || 0), 0) || 30) / Math.max(1, currentTasks.length)))
    const addCount = 3

    const aiTasks = await generateExtraTasks({
      goal: goalText,
      concept,
      count: addCount,
      baseDuration,
      openaiApiKey: process.env.OPENAI_API_KEY,
    })

    const rawNewTasks = Array.from({ length: addCount }).map((_, index) => (
      aiTasks?.[index] || {
        type: EXTRA_TASK_TYPES[index % EXTRA_TASK_TYPES.length],
        title: `Extra ${EXTRA_TASK_TYPES[index % EXTRA_TASK_TYPES.length]}: ${concept}`,
        description: `Reinforce ${concept} with targeted practice and one concrete output.`,
        durationMin: baseDuration,
        resourceUrl: 'https://www.khanacademy.org/',
        resourceTitle: 'Khan Academy Practice',
        resourceType: 'article',
      }
    ))

    const usedIds = new Set(currentTasks.map((task) => task.id))
    const newTasks = rawNewTasks.map((task, index) => {
      const normalized = normalizeExtraTask(
        task,
        EXTRA_TASK_TYPES[index % EXTRA_TASK_TYPES.length],
        index,
        baseDuration,
        concept,
        goalText,
      )
      let id = `d${taskRowId}extra${Date.now()}${index + 1}`
      while (usedIds.has(id)) {
        id = `${id}x`
      }
      usedIds.add(id)
      return { id, ...normalized }
    })

    const updatedTasks = currentTasks.concat(newTasks)
    const tasksCompleted = updatedTasks.filter((task) => task.completed).length
    const completionStatus = tasksCompleted === updatedTasks.length ? 'completed' : 'in_progress'

    const { error: updateError } = await supabase
      .from('daily_tasks')
      .update({
        tasks: updatedTasks,
        tasks_completed: tasksCompleted,
        completion_status: completionStatus,
      })
      .eq('id', taskRowId)

    if (updateError) {
      return Response.json({ error: `Failed to add tasks: ${updateError.message}` }, { status: 500 })
    }

    return Response.json({ success: true, added: newTasks.length })
  } catch (error) {
    return Response.json({ error: error?.message || 'Failed to add more tasks' }, { status: 500 })
  }
}
