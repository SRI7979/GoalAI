import {
  applyDiagnosticEvents,
  buildOnboardingCalibrationEvents,
} from '@/lib/diagnosticCalibration'
import { getSupabaseServerClient } from '@/lib/supabaseServer'
import { getTopicGraph } from '@/lib/topicGraph'

function extractAccessToken(request, body = {}) {
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization')
  if (authHeader?.toLowerCase().startsWith('bearer ')) return authHeader.slice(7).trim() || null
  return body?.accessToken || null
}

async function verifyUser(request, body) {
  const accessToken = extractAccessToken(request, body)
  if (!accessToken) throw new Error('Missing access token')
  const supabase = getSupabaseServerClient({ accessToken })
  const { data, error } = await supabase.auth.getUser(accessToken)
  if (error || !data?.user?.id) throw new Error('Invalid session')
  return { user: data.user, supabase }
}

export async function POST(request) {
  let body = {}
  try {
    body = await request.json()
    const goalId = String(body?.goalId || body?.goal_id || '').trim()
    if (!goalId) return Response.json({ error: 'Missing goalId' }, { status: 400 })

    const { user, supabase } = await verifyUser(request, body)
    const { data: goal, error: goalError } = await supabase
      .from('goals')
      .select('id,user_id,goal_text,decomposition,primary_mode,secondary_modes,estimated_days')
      .eq('id', goalId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (goalError) throw new Error(goalError.message)
    if (!goal) return Response.json({ error: 'Goal not found' }, { status: 404 })

    const topicGraph = await getTopicGraph(goalId).catch(() => null)
    const events = buildOnboardingCalibrationEvents({
      goal,
      topicGraph,
      calibration: body?.calibration || {},
      answers: body?.answers || {},
      learnerProfile: body?.learnerProfile || {},
      diagnosticScore: body?.diagnosticScore,
      recommendedLevel: body?.recommendedLevel,
    })

    const state = await applyDiagnosticEvents({
      supabase,
      userId: user.id,
      goalId,
      events,
      source: 'onboarding_calibration',
    })

    return Response.json({
      ok: true,
      calibrated: events.length,
      conceptIds: events.flatMap((event) => event.conceptIds || []),
      learnerState: {
        knowledge: state.knowledge,
        pedagogicalProfile: state.pedagogicalProfile,
        updatedAt: state.updatedAt,
      },
    })
  } catch (error) {
    return Response.json(
      { error: error?.message || 'Failed to calibrate diagnostic' },
      { status: /token|session/i.test(error?.message || '') ? 401 : 500 },
    )
  }
}
