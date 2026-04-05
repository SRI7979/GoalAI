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
import { buildAdaptiveProfile, createTaskPerformanceRecord, getAdaptiveAiMode } from '@/lib/adaptiveLearning'
import {
  buildCourseCompletionRewards,
  extractCourseConcepts,
  extractCourseModuleTitles,
  filterRowsForCourseWindow,
  getCourseCompletionGrade,
  getCourseFinalExamDayNumber,
  isCourseFinalExamTask,
} from '@/lib/courseCompletion'
import { getStoredCourseOutline } from '@/lib/courseOutlineStore'
import { getCanonicalTaskType, normalizeLearningTasks } from '@/lib/taskTaxonomy'

function extractAccessToken(request) {
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization')
  if (!authHeader) return null
  if (!authHeader.toLowerCase().startsWith('bearer ')) return null
  return authHeader.slice(7).trim() || null
}

function normalizeTaskId(value) {
  return String(value)
}

function clamp(value, min, max, fallback = min) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return fallback
  return Math.max(min, Math.min(max, numeric))
}

function formatDate(value) {
  const parsed = value ? new Date(value) : new Date()
  if (Number.isNaN(parsed.getTime())) return new Date().toISOString()
  return parsed.toISOString()
}

function isRowMissingError(error) {
  if (!error) return false
  const code = String(error.code || '').trim()
  const message = String(error.message || '').toLowerCase()
  return code === 'PGRST116'
    || message.includes('0 rows')
    || message.includes('no rows')
    || message.includes('not found')
}

function buildCourseConceptRatings({ moduleTitles = [], conceptNames = [], examScore = 0 }) {
  const source = moduleTitles.length > 0 ? moduleTitles : conceptNames.slice(0, 5)
  const baseline = clamp(examScore, 0, 100, 0)
  return source.slice(0, 5).map((label, index) => {
    const adjusted = clamp(baseline - (index * 2), 65, 100, baseline)
    return {
      concept: label,
      score: adjusted,
      feedback: adjusted >= 90
        ? `You demonstrated strong retention across ${label}.`
        : adjusted >= 80
          ? `${label} is solid, with room to tighten speed and precision.`
          : `${label} is passable, but would benefit from one focused review pass.`,
    }
  })
}

function buildCourseCompletionReview({ goalText, examScore, attemptsUsed, moduleTitles = [], conceptNames = [] }) {
  const grade = getCourseCompletionGrade(examScore)
  return {
    overall_score: examScore,
    grade,
    summary: `Completed the full ${goalText} course and passed the comprehensive final exam with a score of ${examScore}% in ${attemptsUsed} attempt${attemptsUsed === 1 ? '' : 's'}.`,
    strengths: [
      'Finished the full course sequence instead of dropping off midstream.',
      `Passed the comprehensive final exam at ${examScore}% coverage.`,
      moduleTitles.length > 0
        ? `Closed the loop on ${moduleTitles.length} course module${moduleTitles.length === 1 ? '' : 's'}.`
        : 'Demonstrated broad retention across the covered concepts.',
    ],
    improvements: examScore >= 92
      ? ['Convert this knowledge into a larger shipped project next.', 'Keep the strongest concepts fresh by applying them in the real world.']
      : ['Revisit the weakest sections from the final exam before starting the next course.', 'Turn the course concepts into one project so the knowledge sticks.'],
    concept_ratings: buildCourseConceptRatings({ moduleTitles, conceptNames, examScore }),
    next_steps: examScore >= 92
      ? `Use ${goalText} in a capstone-level project or move into a more advanced follow-up course.`
      : `Do one targeted review pass on the weakest concepts from ${goalText}, then apply them in a project.`,
    professional_improvement: `A professional would now turn ${goalText} from study knowledge into repeatable execution through real projects, faster decision-making, and cleaner tradeoff reasoning.`,
  }
}

function buildCourseCompletionArtifact({
  userId,
  goalId,
  goalText,
  totalDays,
  courseOutline,
  rows,
  examScore,
  attemptsUsed,
  completedAt,
}) {
  const moduleTitles = extractCourseModuleTitles(courseOutline, rows)
  const conceptNames = extractCourseConcepts(courseOutline, rows)
  const finalExamDay = getCourseFinalExamDayNumber(totalDays)
  const review = buildCourseCompletionReview({
    goalText,
    examScore,
    attemptsUsed,
    moduleTitles,
    conceptNames,
  })
  const steps = (moduleTitles.length > 0 ? moduleTitles : rows.map((row) => row?.covered_topics?.[0]).filter(Boolean))
    .map((title, index) => ({
      id: `course-step-${index + 1}`,
      title: title || `Module ${index + 1}`,
      description: `Completed this section of the ${goalText} course as part of the full learning path.`,
      concepts: conceptNames.slice(Math.max(0, index * 2), Math.max(0, index * 2) + 3),
      checkpoint: false,
      requires_response: true,
      required_output: 'Completion recorded through the course path and final assessment.',
      verification_focus: 'Verified through successful progression and the final comprehensive exam.',
      estimated_minutes: 10,
    }))

  steps.push({
    id: 'course-final-exam',
    title: 'Comprehensive Final Exam',
    description: `Passed the end-of-course exam with ${examScore}% after ${attemptsUsed} attempt${attemptsUsed === 1 ? '' : 's'}.`,
    concepts: conceptNames.slice(0, 6),
    checkpoint: true,
    requires_response: true,
    required_output: `Final exam score of ${examScore}% or higher.`,
    verification_focus: 'Verified through comprehensive assessment performance across the course.',
    estimated_minutes: 45,
  })

  const deliverables = [
    `Completed ${totalDays} planned day${Number(totalDays) === 1 ? '' : 's'} in the course path`,
    `Passed the comprehensive final exam with a score of ${examScore}%`,
    moduleTitles.length > 0
      ? `Closed ${moduleTitles.length} curriculum module${moduleTitles.length === 1 ? '' : 's'}`
      : `Demonstrated coverage across ${Math.min(conceptNames.length, 12)} core concepts`,
  ]

  const progress = {
    steps_completed: steps.map((step) => step.id),
    deliverables_completed: deliverables.map((_, index) => `deliverable-${index + 1}`),
    notes: `Completed on ${new Date(completedAt).toLocaleDateString()} with a final exam score of ${examScore}%.`,
    started_at: formatDate(rows?.[0]?.task_date),
    completed_at: formatDate(completedAt),
    verification_status: 'verified',
    project_brief: {
      final_deliverable: `Completed course certificate backed by a ${examScore}% comprehensive final exam score`,
      real_world_context: `Finished the full ${goalText} learning path and demonstrated retention across the course in one comprehensive assessment.`,
      verification_summary: 'Verified through full-course completion plus a capped final exam with limited attempts.',
    },
    authenticity: {
      score: 96,
      label: 'Verified',
      verificationLayers: [
        { id: 'path', title: 'Course Path', description: 'All planned units were completed.', passed: true, confidence: 'high' },
        { id: 'exam', title: 'Final Exam', description: 'A comprehensive assessment was passed.', passed: true, confidence: 'high' },
        { id: 'portfolio', title: 'Portfolio Record', description: 'Completion was recorded as durable proof.', passed: true, confidence: 'high' },
      ],
    },
    course_completion: {
      goal_text: goalText,
      total_days: totalDays,
      final_exam_score: examScore,
      final_exam_attempts: attemptsUsed,
      completed_at: formatDate(completedAt),
      concept_count: conceptNames.length,
    },
  }

  return {
    user_id: userId,
    goal_id: goalId,
    title: `Course Complete: ${goalText}`,
    description: `Finished the full ${goalText} course and passed the comprehensive final exam.`,
    difficulty: 'advanced',
    concepts_tested: conceptNames.slice(0, 20),
    steps,
    starter_code: null,
    starter_language: null,
    deliverables,
    estimated_minutes: Math.max(45, Number(totalDays) * 10),
    xp_reward: 0,
    gem_reward: 0,
    status: 'reviewed',
    progress,
    day_number: finalExamDay,
    mode: 'course_completion',
    skill_type: 'general',
    authenticity_score: 96,
    ai_review: review,
  }
}

async function saveCourseCompletionArtifact({
  supabase,
  userId,
  goalId,
  goalText,
  totalDays,
  courseOutline,
  rows,
  examScore,
  attemptsUsed,
  completedAt,
}) {
  const artifact = buildCourseCompletionArtifact({
    userId,
    goalId,
    goalText,
    totalDays,
    courseOutline,
    rows,
    examScore,
    attemptsUsed,
    completedAt,
  })

  const finalExamDay = getCourseFinalExamDayNumber(totalDays)
  const { data: existingArtifact } = await supabase
    .from('projects')
    .select('id')
    .eq('user_id', userId)
    .eq('goal_id', goalId)
    .eq('day_number', finalExamDay)
    .ilike('title', `Course Complete: ${goalText}`)
    .maybeSingle()

  if (existingArtifact?.id) {
    const updatePayload = { ...artifact }
    delete updatePayload.user_id
    delete updatePayload.goal_id
    delete updatePayload.day_number

    let { data: updated, error } = await supabase
      .from('projects')
      .update(updatePayload)
      .eq('id', existingArtifact.id)
      .select()
      .single()

    if (error) {
      const minimalPayload = {
        title: artifact.title,
        description: artifact.description,
        difficulty: artifact.difficulty,
        concepts_tested: artifact.concepts_tested,
        steps: artifact.steps,
        starter_code: artifact.starter_code,
        starter_language: artifact.starter_language,
        deliverables: artifact.deliverables,
        estimated_minutes: artifact.estimated_minutes,
        xp_reward: artifact.xp_reward,
        gem_reward: artifact.gem_reward,
        status: artifact.status,
        progress: artifact.progress,
        ai_review: artifact.ai_review,
      }
      ;({ data: updated, error } = await supabase
        .from('projects')
        .update(minimalPayload)
        .eq('id', existingArtifact.id)
        .select()
        .single())
    }

    if (error) throw new Error(`Failed to update course completion artifact: ${error.message}`)
    return updated
  }

  let { data: saved, error } = await supabase
    .from('projects')
    .insert(artifact)
    .select()
    .single()

  if (error) {
    const partialArtifact = {
      user_id: artifact.user_id,
      goal_id: artifact.goal_id,
      title: artifact.title,
      description: artifact.description,
      difficulty: artifact.difficulty,
      concepts_tested: artifact.concepts_tested,
      steps: artifact.steps,
      starter_code: artifact.starter_code,
      starter_language: artifact.starter_language,
      deliverables: artifact.deliverables,
      estimated_minutes: artifact.estimated_minutes,
      xp_reward: artifact.xp_reward,
      gem_reward: artifact.gem_reward,
      status: artifact.status,
      progress: artifact.progress,
      ai_review: artifact.ai_review,
      day_number: artifact.day_number,
      mode: artifact.mode,
      skill_type: artifact.skill_type,
    }
    ;({ data: saved, error } = await supabase
      .from('projects')
      .insert(partialArtifact)
      .select()
      .single())
  }

  if (error) {
    const minimalArtifact = {
      user_id: artifact.user_id,
      goal_id: artifact.goal_id,
      title: artifact.title,
      description: artifact.description,
      difficulty: artifact.difficulty,
      concepts_tested: artifact.concepts_tested,
      steps: artifact.steps,
      starter_code: artifact.starter_code,
      starter_language: artifact.starter_language,
      deliverables: artifact.deliverables,
      estimated_minutes: artifact.estimated_minutes,
      xp_reward: artifact.xp_reward,
      gem_reward: artifact.gem_reward,
      status: artifact.status,
      progress: artifact.progress,
      ai_review: artifact.ai_review,
      day_number: artifact.day_number,
    }
    ;({ data: saved, error } = await supabase
      .from('projects')
      .insert(minimalArtifact)
      .select()
      .single())
  }

  if (error) throw new Error(`Failed to save course completion artifact: ${error.message}`)
  return saved
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
    const attempts = Number.isFinite(body?.attempts) ? body.attempts : 1
    const accuracy = Number.isFinite(body?.accuracy) ? body.accuracy : null
    const correctCount = Number.isFinite(body?.correctCount) ? body.correctCount : null
    const questionCount = Number.isFinite(body?.questionCount) ? body.questionCount : null
    const completionTimeSec = Number.isFinite(body?.completionTimeSec) ? body.completionTimeSec : lessonTimeSec
    const assistantUsageCount = Number.isFinite(body?.assistantUsageCount) ? body.assistantUsageCount : 0
    const confidenceLevel = body?.confidenceLevel || 'medium'
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

    if (rowError) {
      const missingRow = isRowMissingError(rowError)
      return Response.json(
        { error: missingRow ? 'Task day not found' : `Task service unavailable: ${rowError?.message || 'unknown error'}` },
        { status: missingRow ? 404 : 502 },
      )
    }
    if (!row) {
      return Response.json({ error: 'Task day not found' }, { status: 404 })
    }

    const currentTasks = normalizeLearningTasks(row.tasks)
    const completedTaskIdSet = new Set(clientCompletedTaskIds.map(normalizeTaskId))
    const targetTask   = currentTasks.find((t) => normalizeTaskId(t.id) === normalizeTaskId(taskId))
    if (!targetTask) {
      return Response.json({ error: 'Task not found in this day plan' }, { status: 400 })
    }

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
    const examAttemptsUsed = alreadyCompleted ? clamp(existingFinalMeta.attemptsUsed, 0, examMaxAttempts, 0) : clamp((existingFinalMeta.attemptsUsed || 0) + 1, 0, examMaxAttempts, 1)
    const examBestScore = Math.max(clamp(existingFinalMeta.bestScore, 0, 100, 0), examScore)
    const finalExamPassed = !isCourseFinalExam || alreadyCompleted || examScore >= examPassScore
    const finalExamFailedOut = Boolean(isCourseFinalExam && !alreadyCompleted && !finalExamPassed && examAttemptsUsed >= examMaxAttempts)
    const courseFinalMeta = isCourseFinalExam
      ? {
          ...existingFinalMeta,
          maxAttempts: examMaxAttempts,
          passScore: examPassScore,
          attemptsUsed: examAttemptsUsed,
          bestScore: examBestScore,
          lastScore: examScore,
          failedOut: finalExamFailedOut,
          passedAt: finalExamPassed && !alreadyCompleted ? new Date().toISOString() : existingFinalMeta.passedAt || null,
        }
      : null

    if (isCourseFinalExam && !alreadyCompleted && (existingFinalMeta.failedOut || (existingFinalMeta.attemptsUsed || 0) >= examMaxAttempts)) {
      return Response.json({
        error: 'Final exam attempts exhausted',
        attemptsUsed: clamp(existingFinalMeta.attemptsUsed, 0, examMaxAttempts, examMaxAttempts),
        maxAttempts: examMaxAttempts,
      }, { status: 400 })
    }

    // ── Update tasks array ───────────────────────────────────────────────────
    let adaptiveSnapshot = null
    const taskAdaptiveRecord = createTaskPerformanceRecord(targetTask, {
      accuracy,
      attempts,
      correctCount,
      questionCount,
      hintsUsed,
      maxHints,
      reflectionQuality,
      challengeScore,
      aiInteractionDepth,
      bossDefeated,
      confidenceLevel,
      assistantUsageCount,
      completionTimeSec,
      lessonTimeSec,
      comboMax,
      quizPerfect,
    })

    try {
      const [{ data: adaptiveRows }, { data: masteryRows }] = await Promise.all([
        supabase
          .from('daily_tasks')
          .select('day_number,task_date,completion_status,covered_topics,tasks')
          .eq('goal_id', row.goal_id)
          .eq('user_id', row.user_id)
          .order('day_number', { ascending: false })
          .limit(18),
        supabase
          .from('concept_mastery')
          .select('concept_id,mastery_score,last_review,review_interval')
          .eq('goal_id', row.goal_id)
          .eq('user_id', row.user_id),
      ])

      const previewTasks = currentTasks.map((entry) => {
        const shouldBeCompleted = completedTaskIdSet.has(normalizeTaskId(entry.id)) || normalizeTaskId(entry.id) === normalizeTaskId(taskId)
        if (normalizeTaskId(entry.id) !== normalizeTaskId(taskId)) {
          return shouldBeCompleted && !entry.completed ? { ...entry, completed: true } : entry
        }
        return {
          ...entry,
          completed: shouldBeCompleted ? true : entry.completed,
          ...(isCourseFinalExam ? { _courseFinal: courseFinalMeta } : {}),
          _adaptive: {
            ...(entry._adaptive || {}),
            ...taskAdaptiveRecord,
            completedAt: new Date().toISOString(),
          },
        }
      })

      const historyRows = Array.isArray(adaptiveRows) ? [...adaptiveRows] : []
      const existingIndex = historyRows.findIndex((entry) => Number(entry.day_number) === Number(row.day_number))
      const previewRow = {
        day_number: row.day_number,
        task_date: row.task_date || new Date().toISOString().split('T')[0],
        completion_status: row.completion_status,
        covered_topics: row.covered_topics || [],
        tasks: previewTasks,
      }

      if (existingIndex >= 0) historyRows[existingIndex] = previewRow
      else historyRows.push(previewRow)

      const adaptiveProfile = buildAdaptiveProfile(historyRows, masteryRows || [], {
        targetConcept: targetTask._concept || row.covered_topics?.[0] || targetTask.title,
      })
      adaptiveSnapshot = {
        userState: adaptiveProfile.targetConcept?.userState || adaptiveProfile.learner.userState,
        engagementState: adaptiveProfile.targetConcept?.engagementState || adaptiveProfile.learner.engagementState,
        aiMode: getAdaptiveAiMode({
          userState: adaptiveProfile.targetConcept?.userState || adaptiveProfile.learner.userState,
          engagementState: adaptiveProfile.targetConcept?.engagementState || adaptiveProfile.learner.engagementState,
          taskType: canonicalTaskType,
        }),
        fastTrackEligible: Boolean(adaptiveProfile.learner.fastTrackEligible),
        pacing: adaptiveProfile.learner.preferredPace,
        explanationStyle: adaptiveProfile.learner.explanationStyle,
        weakConcepts: adaptiveProfile.weakConcepts.slice(0, 2).map((entry) => entry.conceptName),
        reviewTargets: adaptiveProfile.reviewTargets.slice(0, 2),
      }
      taskAdaptiveRecord.userState = adaptiveSnapshot.userState
      taskAdaptiveRecord.engagementState = adaptiveSnapshot.engagementState
      taskAdaptiveRecord.aiMode = adaptiveSnapshot.aiMode
      taskAdaptiveRecord.fastTrackEligible = adaptiveSnapshot.fastTrackEligible
      taskAdaptiveRecord.pacing = adaptiveSnapshot.pacing
    } catch {
      adaptiveSnapshot = null
    }

    const updatedTasks     = currentTasks.map((t) => {
      const shouldBeCompleted = completedTaskIdSet.has(normalizeTaskId(t.id)) || normalizeTaskId(t.id) === normalizeTaskId(taskId)
      if (!shouldBeCompleted && normalizeTaskId(t.id) !== normalizeTaskId(taskId)) return t
      if (normalizeTaskId(t.id) === normalizeTaskId(taskId)) {
        return {
          ...t,
          completed: shouldBeCompleted ? true : t.completed,
          ...(isCourseFinalExam ? { _courseFinal: courseFinalMeta } : {}),
          _adaptive: {
            ...(t._adaptive || {}),
            ...taskAdaptiveRecord,
            completedAt: new Date().toISOString(),
          },
        }
      }
      return shouldBeCompleted && !t.completed ? { ...t, completed: true } : t
    })
    const tasksCompleted   = updatedTasks.filter((t) => t.completed).length
    const completionStatus = tasksCompleted === updatedTasks.length ? 'completed' : 'in_progress'
    const missionJustCompleted = completionStatus === 'completed' && row.completion_status !== 'completed'

    if (isCourseFinalExam && !alreadyCompleted && !finalExamPassed) {
      const failedTasks = currentTasks.map((entry) => {
        if (normalizeTaskId(entry.id) !== normalizeTaskId(taskId)) return entry
        return {
          ...entry,
          completed: false,
          _courseFinal: courseFinalMeta,
          _adaptive: {
            ...(entry._adaptive || {}),
            ...taskAdaptiveRecord,
            completedAt: new Date().toISOString(),
          },
        }
      })

      const failedTasksCompleted = failedTasks.filter((task) => task.completed).length
      const failedCompletionStatus = failedTasksCompleted === failedTasks.length ? 'completed' : 'in_progress'
      const { error: failUpdateError } = await supabase
        .from('daily_tasks')
        .update({
          tasks: failedTasks,
          tasks_completed: failedTasksCompleted,
          completion_status: failedCompletionStatus,
        })
        .eq('id', taskRowId)

      if (failUpdateError) {
        return Response.json(
          { error: `Failed to update final exam attempt: ${failUpdateError.message}` },
          { status: 500 },
        )
      }

      return Response.json({
        ok: true,
        alreadyCompleted: false,
        finalExamPassed: false,
        courseCompleted: false,
        tasksCompleted: failedTasksCompleted,
        completionStatus: failedCompletionStatus,
        updatedTasks: failedTasks,
        finalExam: {
          score: examScore,
          passScore: examPassScore,
          attemptsUsed: examAttemptsUsed,
          attemptsRemaining: Math.max(0, examMaxAttempts - examAttemptsUsed),
          maxAttempts: examMaxAttempts,
          bestScore: examBestScore,
          failedOut: finalExamFailedOut,
        },
        warnings: [
          finalExamFailedOut
            ? `Final exam not passed. You used all ${examMaxAttempts} attempts.`
            : `Final exam not passed. ${Math.max(0, examMaxAttempts - examAttemptsUsed)} attempt${Math.max(0, examMaxAttempts - examAttemptsUsed) === 1 ? '' : 's'} remaining.`,
        ],
      })
    }

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
    let xpEarned        = alreadyCompleted ? 0 : xpForTask(targetTask)
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
    let courseGoalMeta  = null
    let courseRewardXp  = 0
    let courseRewardGems = 0
    let courseCompletion = null

    if (missionJustCompleted && !alreadyCompleted) {
      missionBonusXp = XP_MISSION_BONUS
      xpEarned += missionBonusXp
    }

    try {
      // Read current progress (total_xp may not exist yet — handle gracefully)
      const { data: progressData } = await supabase
        .from('user_progress')
        .select('total_xp,current_streak,longest_streak,last_activity_date,gems,gems_earned_total,xp_boost_until,last_chest_day,freeze_count,total_days')
        .eq('user_id', row.user_id)
        .eq('goal_id', row.goal_id)
        .maybeSingle()

      progress = progressData
      if (isCourseFinalExam) {
        const { data: goalMeta } = await supabase
          .from('goals')
          .select('goal_text,constraints')
          .eq('id', row.goal_id)
          .maybeSingle()
        courseGoalMeta = goalMeta
          ? { ...goalMeta, course_outline: getStoredCourseOutline(goalMeta) }
          : null
      }

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

      if (isCourseFinalExam && finalExamPassed && !alreadyCompleted) {
        const rewards = buildCourseCompletionRewards({
          totalDays: Number(progress?.total_days) || Math.max(1, (Number(row.day_number) || 1) - 1),
          courseOutline: courseGoalMeta?.course_outline,
        })
        courseRewardXp = rewards.xp
        courseRewardGems = rewards.gems
        xpEarned += courseRewardXp
        gemsEarned += courseRewardGems
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
      if (isCourseFinalExam) throw new Error('skip_final_exam_mastery')
      const conceptId = row.concept_id ?? row.covered_topics?.[0] ?? row.day_number
      await updateConceptMastery({
        supabase,
        userId: row.user_id,
        goalId: row.goal_id,
        conceptId,
        signals: taskAdaptiveRecord,
      })
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
      if (e?.message !== 'skip_final_exam_mastery') warnings.push(`Mastery update skipped: ${e.message}`)
    }

    // ── Understanding score & adaptive difficulty ────────────────────────────
    let understandingScore = 0
    let adaptiveDifficulty = 2
    try {
      if (!alreadyCompleted) {
        const expectedTimeSec = ((targetTask.estimatedTimeMin || targetTask.durationMin || 15)) * 60
        const completionTimeRatio = completionTimeSec > 0 && expectedTimeSec > 0
          ? completionTimeSec / expectedTimeSec : 1

        understandingScore = calculateUnderstandingScore({
          quizScore: taskAdaptiveRecord.quizScore ?? taskAdaptiveRecord.accuracy ?? (quizPerfect ? 100 : (comboMax > 3 ? 80 : 60)),
          hintsUsed,
          maxHints,
          completionTimeRatio,
          reflectionQuality,
          aiInteractionDepth,
          challengeScore,
          retryCount: Math.max(0, attempts - 1),
        })

        adaptiveDifficulty = calculateAdaptiveDifficulty({
          recentQuizScores: [taskAdaptiveRecord.quizScore ?? taskAdaptiveRecord.accuracy ?? (quizPerfect ? 100 : comboMax > 3 ? 80 : 60)],
          avgCompletionTime: completionTimeSec || lessonTimeSec || null,
          expectedTime: expectedTimeSec || null,
          hintsUsed,
          totalHintsAvailable: maxHints,
          streakCorrect: comboMax,
          currentDifficulty: targetTask.difficultyLevel || targetTask._difficulty || 2,
          conceptMastery: conceptMasteryScore,
        })

        // Boss bonus: extra XP and gems for defeating a boss
        if (canonicalTaskType === 'boss' && bossDefeated) {
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
      const isLessonType = ['concept', 'recall', 'quiz'].includes(canonicalTaskType)
      const lastChestDay = Number(progress?.last_chest_day) || 0
      const currentDay   = row.day_number || 0

      if (!alreadyCompleted && !isCourseFinalExam && isLessonType && lastChestDay < currentDay) {
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
          taskType:       canonicalTaskType,
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

    if (isCourseFinalExam && finalExamPassed && !alreadyCompleted) {
      try {
        const { data: portfolioRows } = await supabase
          .from('daily_tasks')
          .select('day_number,task_date,completion_status,covered_topics,tasks')
          .eq('goal_id', row.goal_id)
          .eq('user_id', row.user_id)
          .order('day_number', { ascending: true })

        const scopedRows = filterRowsForCourseWindow(portfolioRows || [], Number(progress?.total_days) || row.day_number)
        const portfolioArtifact = await saveCourseCompletionArtifact({
          supabase,
          userId: row.user_id,
          goalId: row.goal_id,
          goalText: courseGoalMeta?.goal_text || row.covered_topics?.[0] || 'Your Course',
          totalDays: Number(progress?.total_days) || Math.max(1, (Number(row.day_number) || 1) - 1),
          courseOutline: courseGoalMeta?.course_outline || null,
          rows: scopedRows,
          examScore,
          attemptsUsed: examAttemptsUsed,
          completedAt: new Date().toISOString(),
        })

        courseCompletion = {
          title: portfolioArtifact?.title || `Course Complete: ${courseGoalMeta?.goal_text || 'Your Course'}`,
          goalText: courseGoalMeta?.goal_text || 'Your Course',
          examScore,
          grade: getCourseCompletionGrade(examScore),
          attemptsUsed: examAttemptsUsed,
          rewardXp: courseRewardXp,
          rewardGems: courseRewardGems,
          portfolioProjectId: portfolioArtifact?.id || null,
        }
      } catch (e) {
        warnings.push(`Course completion portfolio save skipped: ${e.message}`)
        courseCompletion = {
          title: `Course Complete: ${courseGoalMeta?.goal_text || 'Your Course'}`,
          goalText: courseGoalMeta?.goal_text || 'Your Course',
          examScore,
          grade: getCourseCompletionGrade(examScore),
          attemptsUsed: examAttemptsUsed,
          rewardXp: courseRewardXp,
          rewardGems: courseRewardGems,
          portfolioProjectId: null,
        }
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
            taskType: canonicalTaskType,
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
      taskXp:            alreadyCompleted ? 0 : xpForTask(targetTask),
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
      finalExamPassed: isCourseFinalExam ? finalExamPassed : null,
      finalExam: isCourseFinalExam ? {
        score: examScore,
        passScore: examPassScore,
        attemptsUsed: examAttemptsUsed,
        attemptsRemaining: Math.max(0, examMaxAttempts - examAttemptsUsed),
        maxAttempts: examMaxAttempts,
        bestScore: examBestScore,
      } : null,
      courseCompleted: Boolean(courseCompletion),
      courseCompletion,
      understandingScore: alreadyCompleted ? 0 : understandingScore,
      adaptiveDifficulty,
      adaptive: adaptiveSnapshot,
      warnings,
    })
  } catch (error) {
    return Response.json(
      { error: 'Failed to complete task', details: error?.message },
      { status: 500 },
    )
  }
}
