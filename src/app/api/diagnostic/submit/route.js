import {
  applyDiagnosticEvents,
  buildDiagnosticEvidenceEvents,
} from '@/lib/diagnosticCalibration'
import { getSupabaseServerClient } from '@/lib/supabaseServer'

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
      .select('id,user_id')
      .eq('id', goalId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (goalError) throw new Error(goalError.message)
    if (!goal) return Response.json({ error: 'Goal not found' }, { status: 404 })

    const events = buildDiagnosticEvidenceEvents({
      diagnostic: body?.diagnostic || {},
      responses: body?.responses || {},
    })
    const state = await applyDiagnosticEvents({
      supabase,
      userId: user.id,
      goalId,
      events,
      source: 'diagnostic_submit',
    })

    return Response.json({
      ok: true,
      calibrated: events.length,
      learnerState: {
        knowledge: state.knowledge,
        pedagogicalProfile: state.pedagogicalProfile,
        updatedAt: state.updatedAt,
      },
    })
  } catch (error) {
    return Response.json(
      { error: error?.message || 'Failed to submit diagnostic' },
      { status: /token|session/i.test(error?.message || '') ? 401 : 500 },
    )
  }
}
