import { getSupabaseServerClient } from '@/lib/supabaseServer'
import {
  buildDailyTasks,
  buildExploreDayTask,
  generateConceptMap,
  generateExploreConcepts,
  initializeUserProgress,
  saveDailyTasks,
  updateGoalStatus,
} from '@/lib/learningPlan'

function extractAccessToken(request) {
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization')
  if (!authHeader) return null
  if (!authHeader.toLowerCase().startsWith('bearer ')) return null
  return authHeader.slice(7).trim() || null
}

export async function POST(request) {
  let supabase
  const createdTaskIds = []
  let progressInitialized = false
  let parsedGoalId = null
  let body = null

  try {
    body = await request.json()
    const accessToken = extractAccessToken(request) || body?.accessToken || null
    supabase = getSupabaseServerClient({ accessToken })

    const { goalId, userId, goal, days, weekdayMins, weekendMins, knowledge, mode = 'goal' } = body
    parsedGoalId = goalId

    if (!goalId || !userId || !goal) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Goal mode requires days
    if (mode === 'goal' && !days) {
      return Response.json({ error: 'Missing days for goal mode' }, { status: 400 })
    }

    // Check for existing tasks (idempotency guard)
    const { count: existingCount, error: existingError } = await supabase
      .from('daily_tasks')
      .select('id', { count: 'exact', head: true })
      .eq('goal_id', goalId)
      .eq('user_id', userId)

    if (existingError) {
      return Response.json({ error: `Failed to check existing tasks: ${existingError.message}` }, { status: 500 })
    }

    if ((existingCount || 0) > 0) {
      return Response.json({ success: true, message: 'Plan already generated.' }, { status: 200 })
    }

    let dailyPlan = []

    if (mode === 'explore') {
      // ── Explore Mode ──────────────────────────────────────────────────────────
      // Generate first 5 concepts and build the first 5 days as a starting batch.
      // More days are generated on-demand as the user completes each day.
      const exploreConcepts = await generateExploreConcepts({
        goal,
        knowledge,
        afterConcepts: [],
        openaiApiKey: process.env.OPENAI_API_KEY,
      })

      const today = new Date()
      const isWeekend = today.getDay() === 0 || today.getDay() === 6
      const minsPerDay = isWeekend
        ? Number(weekendMins) || 30
        : Number(weekdayMins) || 30

      // Build first 5 days (one concept per day)
      for (let i = 0; i < Math.min(5, exploreConcepts.length); i++) {
        const day = await buildExploreDayTask(
          goal,
          exploreConcepts[i],
          minsPerDay,
          i + 1,
          { knowledge, openaiApiKey: process.env.OPENAI_API_KEY },
        )
        dailyPlan.push(day)
      }
    } else {
      // ── Goal Mode ─────────────────────────────────────────────────────────────
      const concepts = await generateConceptMap({
        goal,
        knowledge,
        days,
        openaiApiKey: process.env.OPENAI_API_KEY,
      })

      dailyPlan = await buildDailyTasks(
        goal,
        concepts,
        Number(weekdayMins),
        Number(weekendMins),
        1,
        Math.min(7, Number(days)),
        { knowledge, openaiApiKey: process.env.OPENAI_API_KEY, mode: 'goal' },
      )
    }

    const insertedTaskRows = await saveDailyTasks({ supabase, goalId, userId, dailyPlan })
    insertedTaskRows.forEach((row) => createdTaskIds.push(row.id))

    await initializeUserProgress({
      supabase,
      userId,
      goalId,
      totalDays: mode === 'explore' ? 0 : Number(days), // 0 = unlimited for explore
      mode,
    })
    progressInitialized = true

    await updateGoalStatus({ supabase, goalId, mode })

    return Response.json({
      success: true,
      mode,
      daysGenerated: dailyPlan.length,
      totalDays: mode === 'explore' ? null : Number(days),
    })
  } catch (error) {
    // Rollback on failure
    if (supabase && createdTaskIds.length > 0) {
      try {
        await supabase.from('daily_tasks').delete().in('id', createdTaskIds)
      } catch (_) { /* preserve original error */ }
    }
    if (supabase && progressInitialized && parsedGoalId && body?.userId) {
      try {
        await supabase.from('user_progress').delete()
          .eq('goal_id', parsedGoalId)
          .eq('user_id', body.userId)
      } catch (_) { /* preserve original error */ }
    }

    return Response.json(
      { error: error?.message || 'Failed to generate plan', details: 'Plan generation failed. Please retry.' },
      { status: 500 },
    )
  }
}