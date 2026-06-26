import { getSupabaseServerClient } from '@/lib/supabaseServer'
import {
  assembleMission,
  goalUsesMissionFlow,
  missionsEnabled,
  normalizeMissionRow,
  persistFallbackMission,
} from '@/lib/missionAssembler'

function extractAccessToken(request) {
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization')
  if (authHeader?.toLowerCase().startsWith('bearer ')) {
    return authHeader.slice(7).trim() || null
  }
  return null
}

function legacyResponse(reason = 'legacy_goal') {
  return Response.json({ legacy: true, redirect_to_existing_flow: true, reason })
}

function isOlderThan48Hours(value) {
  const created = value ? new Date(value) : null
  if (!created || Number.isNaN(created.getTime())) return false
  return Date.now() - created.getTime() > 48 * 60 * 60 * 1000
}

async function getAuthedUser(accessToken) {
  const authenticatedClient = getSupabaseServerClient({ accessToken })
  const { data, error } = await authenticatedClient.auth.getUser(accessToken)
  if (error || !data?.user?.id) return null
  return data.user
}

async function getGoal(supabase, userId, goalId) {
  const { data, error } = await supabase
    .from('goals')
    .select('*')
    .eq('id', goalId)
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data || null
}

async function getExistingActiveMission(supabase, userId, goalId) {
  const { data, error } = await supabase
    .from('missions')
    .select('*')
    .eq('user_id', userId)
    .eq('goal_id', goalId)
    .in('status', ['pending', 'in_progress'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data || null
}

async function getNextDayNumber(supabase, userId, goalId) {
  const { count, error } = await supabase
    .from('missions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('goal_id', goalId)
    .eq('status', 'completed')
  if (error) return 1
  return (count || 0) + 1
}

export async function GET(request) {
  try {
    const accessToken = extractAccessToken(request)
    const goalId = new URL(request.url).searchParams.get('goal_id')

    if (!accessToken) return Response.json({ error: 'Missing access token' }, { status: 401 })
    if (!goalId) return Response.json({ error: 'Missing goal_id' }, { status: 400 })
    if (!missionsEnabled()) return legacyResponse('missions_disabled')

    const user = await getAuthedUser(accessToken)
    if (!user?.id) return Response.json({ error: 'Invalid session' }, { status: 401 })

    const supabase = getSupabaseServerClient()
    const goal = await getGoal(supabase, user.id, goalId)
    if (!goal) return Response.json({ error: 'Goal not found' }, { status: 404 })
    if (!goalUsesMissionFlow(goal) || !goal.topic_graph_id) {
      return legacyResponse('goal_not_on_p5_flow')
    }

    const existing = await getExistingActiveMission(supabase, user.id, goalId)
    if (existing && !isOlderThan48Hours(existing.created_at)) {
      return Response.json({ mission: normalizeMissionRow(existing), legacy: false })
    }
    if (existing) {
      await supabase
        .from('missions')
        .update({
          status: 'abandoned',
          generation_status: 'failed',
          generation_failure_reason: 'abandoned_after_48h',
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .eq('user_id', user.id)
    }

    const dayNumber = await getNextDayNumber(supabase, user.id, goalId)
    try {
      const mission = await assembleMission({ userId: user.id, goalId, dayNumber })
      if (!mission) return legacyResponse('assembler_returned_legacy')
      return Response.json({ mission, legacy: false })
    } catch (error) {
      const fallback = await persistFallbackMission({ userId: user.id, goal, dayNumber, error })
      return Response.json({ mission: fallback, legacy: false, fallback: true })
    }
  } catch (error) {
    return Response.json({ error: error?.message || 'Failed to load today\'s mission' }, { status: 500 })
  }
}
