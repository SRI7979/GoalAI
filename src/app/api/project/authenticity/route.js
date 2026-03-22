import { getSupabaseServerClient } from '@/lib/supabaseServer'

function extractAccessToken(request) {
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization')
  if (!authHeader) return null
  if (!authHeader.toLowerCase().startsWith('bearer ')) return null
  return authHeader.slice(7).trim() || null
}

// Authenticity scoring algorithm — calculates how genuine a project completion is
function calculateAuthenticityScore(project, timeTracking, codeSubmissions) {
  const steps = project.steps || []
  const completedSteps = project.progress?.steps_completed || []
  const startedAt = project.progress?.started_at
  const completedAt = project.progress?.completed_at
  const totalSteps = steps.length

  let score = 100
  const flags = []
  const positives = []

  // 1. TIME ANALYSIS (30 points max impact)
  if (startedAt && completedAt) {
    const totalSeconds = (new Date(completedAt) - new Date(startedAt)) / 1000
    const expectedSeconds = (project.estimated_minutes || 60) * 60
    const timeRatio = totalSeconds / expectedSeconds

    if (timeRatio < 0.1) {
      // Completed in less than 10% of expected time — highly suspicious
      score -= 30
      flags.push('Completed unusually fast')
    } else if (timeRatio < 0.25) {
      score -= 15
      flags.push('Completed significantly faster than expected')
    } else if (timeRatio >= 0.3 && timeRatio <= 3) {
      positives.push('Realistic completion time')
    }
  } else {
    score -= 10
    flags.push('Missing time data')
  }

  // 2. STEP TIMING DISTRIBUTION (20 points max impact)
  if (timeTracking && Object.keys(timeTracking).length > 0) {
    const stepTimes = Object.values(timeTracking)
    const avgTime = stepTimes.reduce((a, b) => a + b, 0) / stepTimes.length

    // Check if all steps completed in under 5 seconds (copy-paste pattern)
    const ultraFastSteps = stepTimes.filter(t => t < 5).length
    if (ultraFastSteps > totalSteps * 0.7) {
      score -= 20
      flags.push('Most steps completed in under 5 seconds')
    } else if (ultraFastSteps > totalSteps * 0.3) {
      score -= 8
      flags.push('Several steps completed very quickly')
    }

    // Check for consistent timing (not just clicking through)
    const timeVariance = stepTimes.reduce((sum, t) => sum + Math.pow(t - avgTime, 2), 0) / stepTimes.length
    if (timeVariance > 100 && avgTime > 30) {
      positives.push('Natural pace variation between steps')
    }
  } else {
    score -= 5
  }

  // 3. AI USAGE PATTERN (15 points max impact)
  const aiUsage = project.progress?.ai_usage || {}
  const totalAiAsks = Object.values(aiUsage).reduce((a, b) => a + b, 0)
  const hintsUsed = project.progress?.hints_used || 0

  // Moderate AI use is fine — it shows engagement
  if (totalAiAsks > 0 && totalAiAsks <= totalSteps * 2) {
    positives.push('Engaged with AI assistant')
  } else if (totalAiAsks > totalSteps * 4) {
    score -= 10
    flags.push('Excessive AI assistant usage')
  }

  // 4. SUBMISSIONS — code OR response (25 points max impact)
  const codeSubs = codeSubmissions || project.progress?.code_submissions || {}
  const responseSubs = project.progress?.response_submissions || {}
  const allSubs = { ...codeSubs, ...responseSubs }
  const stepsWithSubmission = Object.keys(allSubs).length
  const submissionSteps = steps.filter(s => s.requires_code || s.requires_response || s.requires_practice).length

  if (submissionSteps > 0) {
    const submissionRate = stepsWithSubmission / submissionSteps
    if (submissionRate >= 0.8) {
      score += 5
      positives.push('Submitted work for most steps')
    } else if (submissionRate < 0.3) {
      score -= 15
      flags.push('Missing submissions for required steps')
    }

    // Check quality signals
    for (const [stepId, sub] of Object.entries(allSubs)) {
      const content = sub.code || sub.response || ''
      if (content.length < 10) {
        score -= 3
      }
      if (sub.validated || sub.passed) {
        positives.push(`Work validated for step ${stepId}`)
      }
    }
  }

  // 5. CHECKPOINT RESULTS (10 points max impact)
  const checkpoints = project.progress?.checkpoint_results || {}
  const checkpointCount = Object.keys(checkpoints).length
  if (checkpointCount > 0) {
    const passed = Object.values(checkpoints).filter(c => c.passed).length
    const passRate = passed / checkpointCount
    if (passRate >= 0.8) {
      score += 5
      positives.push('Strong understanding checkpoint performance')
    } else if (passRate < 0.4) {
      score -= 10
      flags.push('Poor understanding checkpoint scores')
    }
  }

  // 6. BUILD MODE BONUS
  if (project.mode === 'build') {
    score += 10
    positives.push('Completed in Build Mode (minimal guidance)')
  }

  // Clamp score
  score = Math.max(0, Math.min(100, score))

  // Determine label
  let label, labelColor
  if (score >= 85) { label = 'Verified'; labelColor = '#34D399' }
  else if (score >= 70) { label = 'Likely Genuine'; labelColor = '#3B82F6' }
  else if (score >= 40) { label = 'Suspicious'; labelColor = '#F59E0B' }
  else { label = 'Low Effort'; labelColor = '#FF453A' }

  return { score, label, labelColor, flags, positives }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { projectId, timeTracking, codeSubmissions } = body
    if (!projectId) return Response.json({ error: 'Missing projectId' }, { status: 400 })

    const accessToken = extractAccessToken(request) || body?.accessToken || null
    const supabase = getSupabaseServerClient({ accessToken })

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 })

    const { data: project, error: fetchErr } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single()

    if (fetchErr || !project) return Response.json({ error: 'Project not found' }, { status: 404 })

    // If already scored, return cached
    if (project.authenticity_score !== null && project.authenticity_score !== undefined) {
      const cached = calculateAuthenticityScore(project, timeTracking, codeSubmissions)
      cached.score = project.authenticity_score
      return Response.json(cached)
    }

    const result = calculateAuthenticityScore(project, timeTracking, codeSubmissions)

    // Persist to DB — try with authenticity_score column, fall back without it
    const updatedProgress = {
      ...project.progress,
      time_tracking: timeTracking || project.progress?.time_tracking || {},
      code_submissions: codeSubmissions || project.progress?.code_submissions || {},
    }

    const { error: updateErr } = await supabase
      .from('projects')
      .update({ authenticity_score: result.score, progress: updatedProgress })
      .eq('id', projectId)

    if (updateErr) {
      // Column may not exist yet — save progress without authenticity_score
      await supabase
        .from('projects')
        .update({ progress: updatedProgress })
        .eq('id', projectId)
    }

    return Response.json(result)
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
