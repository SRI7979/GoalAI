import { EVENTS } from '@/lib/analytics'
import { buildDiagnosticQuestions } from '@/lib/diagnosticCalibration'
import { getLearnerState } from '@/lib/learnerState'
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

async function trackDiagnosticStarted({ supabase, userId, goalId, diagnostic }) {
  try {
    await supabase.from('analytics_events').insert({
      event_name: EVENTS.DIAGNOSTIC_STARTED,
      user_id: userId,
      goal_id: goalId,
      properties: {
        source: diagnostic.source,
        version: diagnostic.version,
        question_count: diagnostic.questions.length,
        concept_ids: diagnostic.questions.map((question) => question.conceptId),
      },
      client_timestamp: new Date().toISOString(),
    })
  } catch {
    // Diagnostic telemetry must never block calibration.
  }
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

    const [topicGraph, learnerState] = await Promise.all([
      getTopicGraph(goalId).catch(() => null),
      getLearnerState(user.id, goalId).catch(() => null),
    ])
    const diagnostic = await buildDiagnosticQuestions({
      goal,
      topicGraph,
      learnerState,
      learnerProfile: body?.learnerProfile || {},
      count: body?.count || 4,
    })

    await trackDiagnosticStarted({ supabase, userId: user.id, goalId, diagnostic })
    return Response.json({ diagnostic })
  } catch (error) {
    return Response.json(
      { error: error?.message || 'Failed to start diagnostic' },
      { status: /token|session/i.test(error?.message || '') ? 401 : 500 },
    )
  }
}
