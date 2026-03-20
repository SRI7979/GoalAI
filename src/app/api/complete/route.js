import { getSupabaseServerClient } from '@/lib/supabaseServer'
import {
  generateNextTasksIfNeeded,
  generateNextExploreDay,
  updateConceptMastery,
} from '@/lib/learningPlan'
import { xpForTask, XP_MISSION_BONUS, XP_STREAK_7_BONUS, getLevelProgress } from '@/lib/xp'
import { computeStreakUpdate, isStreakMilestone } from '@/lib/streak'
import { GEM_AWARDS } from '@/lib/tokens'

function extractAccessToken(request) {
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization')
  if (!authHeader) return null
  if (!authHeader.toLowerCase().startsWith('bearer ')) return null
  return authHeader.slice(7).trim() || null
}

export async function POST(request) {
  let supabase

  try {
    const body = await request.json()
    const { taskRowId, taskId } = body
    const accessToken = extractAccessToken(request) || body?.accessToken || null
    supabase = getSupabaseServerClient({ accessToken })

    if (!taskRowId || !taskId) {
      return Response.json({ error: 'Missing taskRowId or taskId' }, { status: 400 })
    }

    // ── Fetch the daily_tasks row ─────────────────────────────────────────────
    const { data: row, error: rowError } = await supabase
      .from('daily_tasks')
      .select('id,user_id,goal_id,day_number,tasks,covered_topics,tasks_completed,completion_status,mode')
      .eq('id', taskRowId)
      .single()

    if (rowError || !row) {
      return Response.json(
        { error: `Task day not found: ${rowError?.message || 'unknown error'}` },
        { status: 404 },
      )
    }

    const currentTasks = Array.isArray(row.tasks) ? row.tasks : []
    const targetTask   = currentTasks.find((t) => t.id === taskId)
    if (!targetTask) {
      return Response.json({ error: 'Task not found in this day plan' }, { status: 400 })
    }

    const alreadyCompleted = Boolean(targetTask.completed)

    // ── Update tasks array ───────────────────────────────────────────────────
    const updatedTasks     = currentTasks.map((t) => t.id === taskId ? { ...t, completed: true } : t)
    const tasksCompleted   = updatedTasks.filter((t) => t.completed).length
    const completionStatus = tasksCompleted === updatedTasks.length ? 'completed' : 'in_progress'
    const missionJustCompleted = completionStatus === 'completed' && row.completion_status !== 'completed'

    if (!alreadyCompleted) {
      const { error: updateError } = await supabase
        .from('daily_tasks')
        .update({ tasks: updatedTasks, tasks_completed: tasksCompleted, completion_status: completionStatus })
        .eq('id', taskRowId)

      if (updateError) {
        return Response.json(
          { error: `Failed to update task: ${updateError.message}` },
          { status: 500 },
        )
      }
    }

    // ── XP + streak calculation ───────────────────────────────────────────────
    const warnings      = []
    let xpEarned        = alreadyCompleted ? 0 : xpForTask(targetTask.type)
    let missionBonusXp  = 0
    let streakBonusXp   = 0
    let newTotalXp      = null
    let levelUp         = null
    let newStreakState   = null
    let gemsEarned      = 0
    let newGemTotal     = null
    let xpBoosted       = false

    if (missionJustCompleted && !alreadyCompleted) {
      missionBonusXp = XP_MISSION_BONUS
      xpEarned += missionBonusXp
    }

    try {
      // Read current progress (total_xp may not exist yet — handle gracefully)
      const { data: progress } = await supabase
        .from('user_progress')
        .select('total_xp,current_streak,longest_streak,last_activity_date,gems,xp_boost_until')
        .eq('user_id', row.user_id)
        .eq('goal_id', row.goal_id)
        .maybeSingle()

      const existingXp = Number(progress?.total_xp) || 0

      // Streak update
      const streakUpdate = computeStreakUpdate({
        lastActivityDate: progress?.last_activity_date,
        currentStreak:    progress?.current_streak || 0,
        longestStreak:    progress?.longest_streak || 0,
      })

      // Streak milestone bonus (only for genuine increments, not already-completed)
      if (!alreadyCompleted && streakUpdate.streakChanged && !streakUpdate.broken
          && isStreakMilestone(streakUpdate.newStreak)) {
        streakBonusXp = XP_STREAK_7_BONUS
        xpEarned += streakBonusXp
      }

      // XP boost check — double XP if active
      const boostUntil = progress?.xp_boost_until ? new Date(progress.xp_boost_until) : null
      xpBoosted = !!(boostUntil && boostUntil > new Date())
      if (xpBoosted && !alreadyCompleted) {
        xpEarned = xpEarned * 2
      }

      // Level-up detection
      const oldLevel = getLevelProgress(existingXp)
      newTotalXp     = existingXp + (alreadyCompleted ? 0 : xpEarned)
      const newLevel = getLevelProgress(newTotalXp)

      if (newLevel.level > oldLevel.level) {
        levelUp = {
          fromLevel: oldLevel.level,
          toLevel:   newLevel.level,
          title:     newLevel.title,
        }
      }

      // ── Gem calculation ─────────────────────────────────────────────────────
      if (!alreadyCompleted) {
        gemsEarned += GEM_AWARDS.task  // +5 per task
        if (missionJustCompleted) gemsEarned += GEM_AWARDS.mission  // +15 mission bonus
        if (streakUpdate.streakChanged && !streakUpdate.broken
            && isStreakMilestone(streakUpdate.newStreak)) {
          gemsEarned += GEM_AWARDS.streakMilestone  // +25 at 7-day milestones
        }
      }
      const currentGems = Number(progress?.gems) || 0
      newGemTotal = currentGems + gemsEarned

      // Persist progress update
      const progressUpdate = { last_activity_date: streakUpdate.todayStr }
      if (!alreadyCompleted) {
        progressUpdate.total_xp = newTotalXp
        progressUpdate.gems = newGemTotal
        progressUpdate.gems_earned_total = (Number(progress?.gems_earned_total) || 0) + gemsEarned
      }
      if (streakUpdate.streakChanged) {
        progressUpdate.current_streak = streakUpdate.newStreak
        progressUpdate.longest_streak = streakUpdate.newLongest
      }

      const { error: progressError } = await supabase
        .from('user_progress')
        .update(progressUpdate)
        .eq('user_id', row.user_id)
        .eq('goal_id', row.goal_id)

      if (progressError) warnings.push(`Progress update skipped: ${progressError.message}`)

      // Log gem transaction
      if (gemsEarned > 0) {
        try {
          await supabase.from('gem_transactions').insert({
            user_id: row.user_id, goal_id: row.goal_id,
            amount: gemsEarned, reason: missionJustCompleted ? 'mission_complete' : 'task_complete',
          })
        } catch { /* non-critical */ }
      }

      newStreakState = {
        current:   streakUpdate.newStreak,
        longest:   streakUpdate.newLongest,
        broken:    streakUpdate.broken  || false,
        milestone: !alreadyCompleted && streakUpdate.streakChanged && !streakUpdate.broken
                   && isStreakMilestone(streakUpdate.newStreak),
      }
    } catch (e) {
      warnings.push(`XP/streak update skipped: ${e.message}`)
    }

    // ── Concept mastery ───────────────────────────────────────────────────────
    try {
      const conceptId = row.concept_id ?? row.covered_topics?.[0] ?? row.day_number
      await updateConceptMastery({ supabase, userId: row.user_id, goalId: row.goal_id, conceptId })
    } catch (e) {
      warnings.push(`Mastery update skipped: ${e.message}`)
    }

    // ── Generate next tasks on day completion ─────────────────────────────────
    let nextResult = null
    if (completionStatus === 'completed') {
      try {
        const mode = row.mode || 'goal'
        nextResult = mode === 'explore'
          ? await generateNextExploreDay({ supabase, goalId: row.goal_id, userId: row.user_id })
          : await generateNextTasksIfNeeded({ supabase, goalId: row.goal_id, userId: row.user_id })
      } catch (e) {
        warnings.push(`Next task generation skipped: ${e.message}`)
      }
    }

    return Response.json({
      ok:                true,
      alreadyCompleted,
      tasksCompleted,
      completionStatus,
      missionComplete:   missionJustCompleted,
      xpEarned:          alreadyCompleted ? 0 : xpEarned,
      taskXp:            alreadyCompleted ? 0 : xpForTask(targetTask.type),
      missionBonusXp:    alreadyCompleted ? 0 : missionBonusXp,
      streakBonusXp:     alreadyCompleted ? 0 : streakBonusXp,
      xpBoosted:         xpBoosted || false,
      newTotalXp,
      levelUp,
      streakState:       newStreakState,
      gemsEarned:        alreadyCompleted ? 0 : gemsEarned,
      newGemTotal:       newGemTotal ?? null,
      nextResult,
      warnings,
    })
  } catch (error) {
    return Response.json(
      { error: 'Failed to complete task', details: error?.message },
      { status: 500 },
    )
  }
}
