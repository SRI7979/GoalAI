import { getSupabaseServerClient } from '@/lib/supabaseServer'
import { EVENTS } from '@/lib/analytics'
import { normalizeMissionRow } from '@/lib/missionAssembler'

function extractAccessToken(request, body = {}) {
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization')
  if (authHeader?.toLowerCase().startsWith('bearer ')) {
    return authHeader.slice(7).trim() || null
  }
  return body?.accessToken || null
}

async function getAuthedUser(accessToken) {
  const authenticatedClient = getSupabaseServerClient({ accessToken })
  const { data, error } = await authenticatedClient.auth.getUser(accessToken)
  if (error || !data?.user?.id) return null
  return data.user
}

async function trackMissionCompleted({ supabase, userId, goalId, mission, summary }) {
  try {
    await supabase.from('analytics_events').insert({
      event_name: EVENTS.MISSION_COMPLETED,
      user_id: userId,
      goal_id: goalId,
      mission_id: mission.id,
      properties: {
        mission_id: mission.id,
        day_number: mission.day_number,
        total_ms: summary.totalMs,
        correct_count: summary.correctCount,
        total_count: summary.totalCount,
        components_skipped: summary.componentsSkipped,
      },
      client_timestamp: new Date().toISOString(),
    })
  } catch {
    // Mission completion must not be blocked by telemetry.
  }
}

function dateKey(value = new Date()) {
  return new Date(value).toISOString().slice(0, 10)
}

function computeSimpleStreak(progress = {}) {
  const today = dateKey()
  const last = progress?.last_activity_date ? dateKey(progress.last_activity_date) : null
  const yesterday = dateKey(Date.now() - 24 * 60 * 60 * 1000)
  const current = Number(progress?.current_streak) || 0
  const longest = Number(progress?.longest_streak) || 0

  if (last === today) {
    return { today, current, longest, changed: false }
  }

  const nextCurrent = last === yesterday ? current + 1 : 1
  return {
    today,
    current: nextCurrent,
    longest: Math.max(longest, nextCurrent),
    changed: true,
  }
}

async function applySimpleMissionRewards({ supabase, mission, alreadyCompleted }) {
  if (alreadyCompleted) return { xpEarned: 0, gemsEarned: 0, streakState: null, warnings: [] }
  const warnings = []
  const componentCount = Array.isArray(mission.components) ? mission.components.length : 0
  const xpEarned = 50 + (componentCount * 10)
  const gemsEarned = 15
  let streakState = null

  try {
    const { data: progress } = await supabase
      .from('user_progress')
      .select('total_xp,gems,gems_earned_total,current_streak,longest_streak,last_activity_date')
      .eq('user_id', mission.user_id)
      .eq('goal_id', mission.goal_id)
      .maybeSingle()

    if (progress) {
      streakState = computeSimpleStreak(progress)
      await supabase
        .from('user_progress')
        .update({
          total_xp: (Number(progress.total_xp) || 0) + xpEarned,
          gems: (Number(progress.gems) || 0) + gemsEarned,
          gems_earned_total: (Number(progress.gems_earned_total) || 0) + gemsEarned,
          current_streak: streakState.current,
          longest_streak: streakState.longest,
          last_activity_date: streakState.today,
        })
        .eq('user_id', mission.user_id)
        .eq('goal_id', mission.goal_id)
    }
  } catch (error) {
    warnings.push(`Mission reward update skipped: ${error?.message || 'unknown error'}`)
  }

  try {
    await supabase.from('gem_transactions').insert({
      user_id: mission.user_id,
      goal_id: mission.goal_id,
      amount: gemsEarned,
      reason: 'mission_complete',
    })
  } catch {
    // Non-critical; the balance update above is the source of truth.
  }

  return { xpEarned, gemsEarned, streakState, warnings }
}

export async function POST(request) {
  const body = await request.json().catch(() => ({}))
  try {
    const accessToken = extractAccessToken(request, body)
    const missionId = String(body?.missionId || '').trim()
    const summary = {
      totalMs: Math.max(0, Math.round(Number(body?.totalMs) || 0)),
      correctCount: Math.max(0, Math.round(Number(body?.correctCount) || 0)),
      totalCount: Math.max(0, Math.round(Number(body?.totalCount) || 0)),
      componentsSkipped: Math.max(0, Math.round(Number(body?.componentsSkipped) || 0)),
    }

    if (!accessToken) return Response.json({ error: 'Missing access token' }, { status: 401 })
    if (!missionId) return Response.json({ error: 'Missing missionId' }, { status: 400 })

    const user = await getAuthedUser(accessToken)
    if (!user?.id) return Response.json({ error: 'Invalid session' }, { status: 401 })

    const supabase = getSupabaseServerClient()
    const { data: missionRow, error: missionError } = await supabase
      .from('missions')
      .select('*')
      .eq('id', missionId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (missionError) return Response.json({ error: missionError.message }, { status: 500 })
    if (!missionRow) return Response.json({ error: 'Mission not found' }, { status: 404 })

    const alreadyCompleted = missionRow.status === 'completed'
    const rewards = await applySimpleMissionRewards({ supabase, mission: missionRow, alreadyCompleted })
    const completedAt = missionRow.completed_at || new Date().toISOString()
    const { data: updatedMission, error: updateError } = await supabase
      .from('missions')
      .update({
        status: 'completed',
        completed_at: completedAt,
        updated_at: new Date().toISOString(),
      })
      .eq('id', missionId)
      .eq('user_id', user.id)
      .select('*')
      .single()

    if (updateError) return Response.json({ error: updateError.message }, { status: 500 })

    await trackMissionCompleted({
      supabase,
      userId: user.id,
      goalId: missionRow.goal_id,
      mission: updatedMission,
      summary,
    })

    return Response.json({
      ok: true,
      mission: normalizeMissionRow(updatedMission),
      xpEarned: rewards.xpEarned,
      gemsEarned: rewards.gemsEarned,
      streakState: rewards.streakState,
      warnings: rewards.warnings,
    })
  } catch (error) {
    return Response.json({ error: error?.message || 'Failed to complete mission' }, { status: 500 })
  }
}
