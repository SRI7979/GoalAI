import { getSupabaseServerClient } from '@/lib/supabaseServer'
import {
  generateNextTasksIfNeeded,
  generateNextExploreDay,
  updateConceptMastery,
} from '@/lib/learningPlan'
import { xpForTask, XP_MISSION_BONUS, XP_STREAK_7_BONUS, getLevelProgress } from '@/lib/xp'
import { computeStreakUpdate, isStreakMilestone } from '@/lib/streak'
import { GEM_AWARDS } from '@/lib/tokens'
import { generateDailyQuests, updateQuestProgress } from '@/lib/quests'
import { checkAndAwardBadges } from '@/lib/badges'
import { calculateUnderstandingScore, calculateAdaptiveDifficulty } from '@/lib/learningEngine'

function extractAccessToken(request) {
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization')
  if (!authHeader) return null
  if (!authHeader.toLowerCase().startsWith('bearer ')) return null
  return authHeader.slice(7).trim() || null
}

function normalizeTaskId(value) {
  return String(value)
}

export async function POST(request) {
  let supabase

  try {
    const body = await request.json()
    const { taskRowId, taskId } = body
    const clientCompletedTaskIds = Array.isArray(body?.completedTaskIds) ? body.completedTaskIds : []
    const clientHour = Number.isFinite(body?.clientHour) ? body.clientHour : -1
    const comboMax = Number.isFinite(body?.comboMax) ? body.comboMax : 0
    const quizPerfect = Boolean(body?.quizPerfect)
    const lessonTimeSec = Number.isFinite(body?.lessonTimeSec) ? body.lessonTimeSec : 0
    // Learning engine signals
    const hintsUsed = Number.isFinite(body?.hintsUsed) ? body.hintsUsed : 0
    const maxHints = Number.isFinite(body?.maxHints) ? body.maxHints : 3
    const reflectionQuality = Number.isFinite(body?.reflectionQuality) ? body.reflectionQuality : 0
    const challengeScore = Number.isFinite(body?.challengeScore) ? body.challengeScore : 0
    const aiInteractionDepth = Number.isFinite(body?.aiInteractionDepth) ? body.aiInteractionDepth : 0
    const bossDefeated = Boolean(body?.bossDefeated)
    const accessToken = extractAccessToken(request) || body?.accessToken || null
    supabase = getSupabaseServerClient({ accessToken })

    if (!taskRowId || !taskId) {
      return Response.json({ error: 'Missing taskRowId or taskId' }, { status: 400 })
    }

    // ── Fetch the daily_tasks row ─────────────────────────────────────────────
    const { data: row, error: rowError } = await supabase
      .from('daily_tasks')
      .select('id,user_id,goal_id,day_number,tasks,covered_topics,tasks_completed,completion_status,mode,quests,quests_completed')
      .eq('id', taskRowId)
      .single()

    if (rowError || !row) {
      return Response.json(
        { error: `Task day not found: ${rowError?.message || 'unknown error'}` },
        { status: 404 },
      )
    }

    const currentTasks = Array.isArray(row.tasks) ? row.tasks : []
    const completedTaskIdSet = new Set(clientCompletedTaskIds.map(normalizeTaskId))
    const targetTask   = currentTasks.find((t) => normalizeTaskId(t.id) === normalizeTaskId(taskId))
    if (!targetTask) {
      return Response.json({ error: 'Task not found in this day plan' }, { status: 400 })
    }

    const alreadyCompleted = Boolean(targetTask.completed)

    // ── Update tasks array ───────────────────────────────────────────────────
    const updatedTasks     = currentTasks.map((t) => {
      const shouldBeCompleted = completedTaskIdSet.has(normalizeTaskId(t.id)) || normalizeTaskId(t.id) === normalizeTaskId(taskId)
      return shouldBeCompleted && !t.completed ? { ...t, completed: true } : t
    })
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
    let progress        = null
    let currentGems     = 0

    if (missionJustCompleted && !alreadyCompleted) {
      missionBonusXp = XP_MISSION_BONUS
      xpEarned += missionBonusXp
    }

    try {
      // Read current progress (total_xp may not exist yet — handle gracefully)
      const { data: progressData } = await supabase
        .from('user_progress')
        .select('total_xp,current_streak,longest_streak,last_activity_date,gems,gems_earned_total,xp_boost_until,last_chest_day,freeze_count')
        .eq('user_id', row.user_id)
        .eq('goal_id', row.goal_id)
        .maybeSingle()

      progress = progressData
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
      currentGems = Number(progress?.gems) || 0
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
    let conceptMasteryScore = 0
    try {
      const conceptId = row.concept_id ?? row.covered_topics?.[0] ?? row.day_number
      await updateConceptMastery({ supabase, userId: row.user_id, goalId: row.goal_id, conceptId })
      // Read back the updated mastery score for badge checking
      const { data: masteryRow } = await supabase
        .from('concept_mastery')
        .select('mastery_score')
        .eq('user_id', row.user_id)
        .eq('goal_id', row.goal_id)
        .eq('concept_id', String(conceptId))
        .maybeSingle()
      conceptMasteryScore = masteryRow?.mastery_score || 0
    } catch (e) {
      warnings.push(`Mastery update skipped: ${e.message}`)
    }

    // ── Understanding score & adaptive difficulty ────────────────────────────
    let understandingScore = 0
    let adaptiveDifficulty = 2
    try {
      if (!alreadyCompleted) {
        const expectedTimeSec = (targetTask.durationMin || 15) * 60
        const completionTimeRatio = lessonTimeSec > 0 && expectedTimeSec > 0
          ? lessonTimeSec / expectedTimeSec : 1

        understandingScore = calculateUnderstandingScore({
          quizScore: quizPerfect ? 100 : (comboMax > 3 ? 80 : 60),
          hintsUsed,
          maxHints,
          completionTimeRatio,
          reflectionQuality,
          aiInteractionDepth,
          challengeScore,
          retryCount: 0,
        })

        adaptiveDifficulty = calculateAdaptiveDifficulty({
          recentQuizScores: quizPerfect ? [100] : comboMax > 3 ? [80] : [60],
          avgCompletionTime: lessonTimeSec || null,
          expectedTime: expectedTimeSec || null,
          hintsUsed,
          totalHintsAvailable: maxHints,
          streakCorrect: comboMax,
          currentDifficulty: targetTask._difficulty || 2,
          conceptMastery: conceptMasteryScore,
        })

        // Boss bonus: extra XP and gems for defeating a boss
        if (targetTask.type === 'boss' && bossDefeated) {
          const bossXp = 200
          const bossGems = 50
          xpEarned += bossXp
          gemsEarned += bossGems
          newTotalXp = (newTotalXp ?? 0) + bossXp
          newGemTotal = (newGemTotal ?? 0) + bossGems
          await supabase
            .from('user_progress')
            .update({ total_xp: newTotalXp, gems: newGemTotal })
            .eq('user_id', row.user_id)
            .eq('goal_id', row.goal_id)
        }
      }
    } catch (e) {
      warnings.push(`Understanding tracking skipped: ${e.message}`)
    }

    // ── Treasure chest (lesson-type tasks only, max 1/day) ────────────────────
    let chestReward = null
    try {
      const isLessonType = ['lesson','reading','flashcard','quiz'].includes(targetTask.type)
      const lastChestDay = Number(progress?.last_chest_day) || 0
      const currentDay   = row.day_number || 0

      if (!alreadyCompleted && isLessonType && lastChestDay < currentDay) {
        let chance = 0.30
        if ((newStreakState?.current || 0) > 7) chance += 0.10
        if (missionJustCompleted) chance += 0.10

        if (Math.random() < chance) {
          // Roll reward
          const roll = Math.random()
          if (roll < 0.05) {
            chestReward = { type: 'gems', amount: 50, label: '50 Gems — Jackpot!' }
          } else if (roll < 0.15) {
            chestReward = { type: 'streakFreeze', amount: 1, label: 'Streak Freeze' }
          } else if (roll < 0.30) {
            chestReward = { type: 'xpBoost', amount: 15, label: 'Double XP (15 min)' }
          } else if (roll < 0.50) {
            chestReward = { type: 'gems', amount: 20 + Math.floor(Math.random() * 11), label: null }
          } else {
            chestReward = { type: 'gems', amount: 5 + Math.floor(Math.random() * 11), label: null }
          }
          if (chestReward.type === 'gems' && !chestReward.label) {
            chestReward.label = `${chestReward.amount} Gems`
          }

          // Apply chest reward
          const chestUpdate = { last_chest_day: currentDay }
          if (chestReward.type === 'gems') {
            const updatedGems = (newGemTotal ?? currentGems) + chestReward.amount
            chestUpdate.gems = updatedGems
            newGemTotal = updatedGems
          } else if (chestReward.type === 'streakFreeze') {
            chestUpdate.freeze_count = (Number(progress?.freeze_count) || 0) + 1
          } else if (chestReward.type === 'xpBoost') {
            chestUpdate.xp_boost_until = new Date(Date.now() + 15 * 60 * 1000).toISOString()
          }

          await supabase
            .from('user_progress')
            .update(chestUpdate)
            .eq('user_id', row.user_id)
            .eq('goal_id', row.goal_id)

          // Log gem transaction for chest gems
          if (chestReward.type === 'gems') {
            try {
              await supabase.from('gem_transactions').insert({
                user_id: row.user_id, goal_id: row.goal_id,
                amount: chestReward.amount, reason: 'treasure_chest',
              })
            } catch { /* non-critical */ }
          }
        }
      }
    } catch (e) {
      warnings.push(`Chest check skipped: ${e.message}`)
    }

    // ── Quest progress tracking ───────────────────────────────────────────────
    let questUpdate = null
    try {
      if (!alreadyCompleted) {
        // Lazy-generate quests if missing
        let quests = Array.isArray(row.quests) && row.quests.length > 0
          ? row.quests
          : generateDailyQuests(row.day_number || 1, currentTasks.length)

        const result = updateQuestProgress(quests, {
          xpEarned:       xpEarned || 0,
          gemsEarned:     gemsEarned || 0,
          taskType:       targetTask.type,
          missionComplete: missionJustCompleted,
        })

        if (result) {
          const questGemsTotal = result.gemsFromQuests || 0
          const questsNowDone  = result.updatedQuests.filter(q => q.completed).length

          // Persist quest state to daily_tasks
          await supabase
            .from('daily_tasks')
            .update({ quests: result.updatedQuests, quests_completed: questsNowDone })
            .eq('id', taskRowId)

          // Award quest gems
          if (questGemsTotal > 0) {
            gemsEarned += questGemsTotal
            newGemTotal = (newGemTotal ?? 0) + questGemsTotal
            await supabase
              .from('user_progress')
              .update({ gems: newGemTotal, gems_earned_total: (Number(progress?.gems_earned_total) || 0) + gemsEarned })
              .eq('user_id', row.user_id)
              .eq('goal_id', row.goal_id)

            try {
              await supabase.from('gem_transactions').insert({
                user_id: row.user_id, goal_id: row.goal_id,
                amount: questGemsTotal, reason: result.questMasterBonus ? 'quest_master' : 'quest_complete',
              })
            } catch { /* non-critical */ }
          }

          questUpdate = {
            quests: result.updatedQuests,
            questsJustCompleted: result.questsJustCompleted.map(q => ({ id: q.id, reward: q.reward })),
            questMasterBonus: result.questMasterBonus,
            questGemsEarned: questGemsTotal,
          }
        }
      }
    } catch (e) {
      warnings.push(`Quest update skipped: ${e.message}`)
    }

    // ── Weekly challenge progress ────────────────────────────────────────────
    let challengeUpdate = null
    try {
      if (!alreadyCompleted) {
        const today = new Date()
        const dayOfWeek = today.getDay()
        const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
        const weekStart = new Date(today)
        weekStart.setDate(today.getDate() + mondayOffset)
        const weekStartStr = weekStart.toISOString().split('T')[0]

        const { data: challenge } = await supabase
          .from('weekly_challenges')
          .select('*')
          .eq('user_id', row.user_id)
          .eq('goal_id', row.goal_id)
          .eq('week_start', weekStartStr)
          .maybeSingle()

        if (challenge && !challenge.completed) {
          let increment = 0
          switch (challenge.challenge_type) {
            case 'tasks_completed':
              increment = 1
              break
            case 'xp_earned':
              increment = xpEarned || 0
              break
            case 'streak_days':
              increment = newStreakState?.current > challenge.current_value ? 1 : 0
              break
            case 'quiz_perfect':
              // incremented via client hint
              break
            case 'lessons_no_hearts':
              increment = 1
              break
          }

          if (increment > 0) {
            const newVal = Math.min(challenge.current_value + increment, challenge.target_value)
            const justCompleted = newVal >= challenge.target_value

            const challengeUpd = { current_value: newVal }
            if (justCompleted) {
              challengeUpd.completed = true
              challengeUpd.completed_at = new Date().toISOString()
            }

            await supabase
              .from('weekly_challenges')
              .update(challengeUpd)
              .eq('id', challenge.id)

            // Award challenge rewards on completion
            if (justCompleted) {
              const chalGems = challenge.gem_reward || 0
              const chalXp   = challenge.xp_reward || 0
              if (chalGems > 0 || chalXp > 0) {
                newGemTotal = (newGemTotal ?? 0) + chalGems
                newTotalXp  = (newTotalXp ?? 0) + chalXp
                gemsEarned += chalGems
                xpEarned   += chalXp
                await supabase
                  .from('user_progress')
                  .update({ gems: newGemTotal, total_xp: newTotalXp })
                  .eq('user_id', row.user_id)
                  .eq('goal_id', row.goal_id)

                try {
                  await supabase.from('gem_transactions').insert({
                    user_id: row.user_id, goal_id: row.goal_id,
                    amount: chalGems, reason: 'weekly_challenge',
                  })
                } catch { /* non-critical */ }
              }
            }

            challengeUpdate = {
              id: challenge.id,
              currentValue: newVal,
              targetValue: challenge.target_value,
              completed: justCompleted,
              gemReward: justCompleted ? challenge.gem_reward : 0,
              xpReward: justCompleted ? challenge.xp_reward : 0,
            }
          }
        }
      }
    } catch (e) {
      warnings.push(`Challenge update skipped: ${e.message}`)
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

    // ── Achievement badge checks ──────────────────────────────────────────────
    let newBadges = []
    try {
      if (!alreadyCompleted) {
        // Count total completed individual tasks across all day rows for this goal
        const { data: allRows } = await supabase
          .from('daily_tasks')
          .select('tasks')
          .eq('user_id', row.user_id)
          .eq('goal_id', row.goal_id)
        const totalCompletedTasks = (allRows || []).reduce((sum, r) => {
          const tasks = Array.isArray(r.tasks) ? r.tasks : []
          return sum + tasks.filter(t => t.completed).length
        }, 0)
        const completedDayRows = (allRows || []).filter(r => {
          const tasks = Array.isArray(r.tasks) ? r.tasks : []
          return tasks.length > 0 && tasks.every(t => t.completed)
        }).length

        const { data: goalRow } = await supabase
          .from('goals')
          .select('mode,deadline')
          .eq('id', row.goal_id)
          .maybeSingle()

        const { data: progressRow } = await supabase
          .from('user_progress')
          .select('total_days')
          .eq('user_id', row.user_id)
          .eq('goal_id', row.goal_id)
          .maybeSingle()

        const newLevel = newTotalXp != null ? getLevelProgress(newTotalXp).level : 1

        newBadges = await checkAndAwardBadges({
          supabase,
          userId: row.user_id,
          state: {
            streak: newStreakState?.current || 0,
            level: newLevel,
            totalTasksCompleted: totalCompletedTasks,
            missionJustCompleted,
            taskType: targetTask.type,
            goalMode: goalRow?.mode || 'goal',
            clientHour,
            completedDays: completedDayRows,
            totalDays: Number(progressRow?.total_days) || 0,
            conceptMasteryScore,
            comboMax,
            quizPerfect,
            lessonTimeSec,
          },
        })
      }
    } catch (e) {
      warnings.push(`Badge check skipped: ${e.message}`)
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
      chestReward,
      questUpdate,
      challengeUpdate,
      newBadges,
      nextResult,
      understandingScore: alreadyCompleted ? 0 : understandingScore,
      adaptiveDifficulty,
      warnings,
    })
  } catch (error) {
    return Response.json(
      { error: 'Failed to complete task', details: error?.message },
      { status: 500 },
    )
  }
}
