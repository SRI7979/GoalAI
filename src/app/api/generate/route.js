import { getSupabaseServerClient } from '@/lib/supabaseServer'
import {
  buildDeterministicCourseOutline,
  buildExploreDayTask,
  buildFallbackConcepts,
  buildGoalPlanDayFromSequenceItem,
  initializeUserProgress,
  saveDailyTasks,
  updateGoalStatus,
} from '@/lib/learningPlan'
import { buildPathOutlineTracker } from '@/lib/pathOutline.js'
import { getCourseOutlineStatus } from '@/lib/courseOutlineStore'
import { persistCourseOutline } from '@/lib/courseOutlineStore'

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
    let sequenceDayCount = mode === 'explore' ? 0 : Number(days) || 0
    let generationSource = 'deterministic'
    let outlineStatus = mode === 'goal' ? 'pending' : null

    if (mode === 'explore') {
      // ── Explore Mode ──────────────────────────────────────────────────────────
      // Generate first 5 concepts and build the first 5 days as a starting batch.
      // More days are generated on-demand as the user completes each day.
      const exploreConcepts = buildFallbackConcepts(goal, 5)

      const today = new Date()
      const isWeekend = today.getDay() === 0 || today.getDay() === 6
      const minsPerDay = isWeekend
        ? Number(weekendMins) || 30
        : Number(weekdayMins) || 30

      // Build only day 1; more are generated on-demand as user completes each day
      const day = await buildExploreDayTask(
        goal,
        exploreConcepts[0],
        minsPerDay,
        1,
        { knowledge, openaiApiKey: null, generationPhase: 'initial_day' },
      )
      dailyPlan.push(day)
    } else {
      // ── Goal Mode ─────────────────────────────────────────────────────────────
      // Generate a full module-structured course outline, then build Day 1 tasks
      const avgMins = Math.round((Number(weekdayMins) * 5 + Number(weekendMins) * 2) / 7)
      const courseOutline = buildDeterministicCourseOutline({
        goal,
        knowledge,
        days,
        minutesPerDay: avgMins,
        status: 'pending',
      })

      const tracker = buildPathOutlineTracker({
        courseOutline,
        rows: [],
        goalText: goal,
      })
      sequenceDayCount = tracker.plannedDayCount || Number(days) || 0
      const firstItem = tracker.sequenceItems.find((item) => item.id === tracker.currentItemId) || tracker.sequenceItems[0]
      if (!firstItem) {
        throw new Error('Could not determine the first course item')
      }

      dailyPlan = [await buildGoalPlanDayFromSequenceItem({
        goalRow: {
          goal_text: goal,
          weekday_mins: Number(weekdayMins),
          weekend_mins: Number(weekendMins),
        },
        item: firstItem,
        knowledge,
        openaiApiKey: null,
        adaptiveProfile: null,
        existingRows: [],
        generationPhase: 'initial_day',
      })]

      await persistCourseOutline({
        supabase,
        goalId,
        courseOutline,
      })

      outlineStatus = getCourseOutlineStatus(courseOutline)
    }

    const insertedTaskRows = await saveDailyTasks({ supabase, goalId, userId, dailyPlan })
    insertedTaskRows.forEach((row) => createdTaskIds.push(row.id))

    await initializeUserProgress({
      supabase,
      userId,
      goalId,
      totalDays: sequenceDayCount,
      mode,
    })
    progressInitialized = true

    await updateGoalStatus({ supabase, goalId, mode })

    return Response.json({
      success: true,
      generationSource,
      outlineStatus,
      mode,
      daysGenerated: dailyPlan.length,
      totalDays: mode === 'explore' ? null : sequenceDayCount,
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
