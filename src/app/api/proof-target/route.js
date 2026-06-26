import { generateProofTarget, trackProofEvent } from '@/lib/proofOfMastery'
import { getSupabaseServerClient } from '@/lib/supabaseServer'

function extractAccessToken(request, body = {}) {
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization')
  if (authHeader?.toLowerCase().startsWith('bearer ')) return authHeader.slice(7).trim() || null
  return body?.accessToken || null
}

async function verifyUser(request, body = {}) {
  const accessToken = extractAccessToken(request, body)
  if (!accessToken) throw new Error('Missing access token')
  const supabase = getSupabaseServerClient({ accessToken })
  const { data, error } = await supabase.auth.getUser(accessToken)
  if (error || !data?.user?.id) throw new Error('Invalid session')
  return { user: data.user, supabase }
}

async function getGoal({ supabase, userId, goalId }) {
  const { data, error } = await supabase
    .from('goals')
    .select('id,user_id,goal_text,primary_mode,secondary_modes,estimated_days,decomposition,proof_target,proof_target_status,proof_target_failure_reason')
    .eq('id', goalId)
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data
}

async function persistProofTarget({ supabase, goalId, proofTarget }) {
  await supabase
    .from('goals')
    .update({
      proof_target: proofTarget,
      proof_target_status: proofTarget.generationStatus || 'ok',
      proof_target_failure_reason: proofTarget.generationFailureReason || null,
    })
    .eq('id', goalId)
}

export async function GET(request) {
  try {
    const url = new URL(request.url)
    const goalId = url.searchParams.get('goal_id') || url.searchParams.get('goalId')
    if (!goalId) return Response.json({ error: 'Missing goal_id' }, { status: 400 })

    const { user, supabase } = await verifyUser(request)
    const goal = await getGoal({ supabase, userId: user.id, goalId })
    if (!goal) return Response.json({ error: 'Goal not found' }, { status: 404 })

    let proofTarget = goal.proof_target
    if (!proofTarget) {
      proofTarget = await generateProofTarget(goal)
      await persistProofTarget({ supabase, goalId, proofTarget }).catch(() => {})
    }

    const { data: submissions } = await supabase
      .from('proof_submissions')
      .select('id,status,score,passed,evaluation,created_at,evaluated_at')
      .eq('goal_id', goalId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10)

    return Response.json({ proofTarget, submissions: submissions || [] })
  } catch (error) {
    return Response.json(
      { error: error?.message || 'Failed to load proof target' },
      { status: /token|session/i.test(error?.message || '') ? 401 : 500 },
    )
  }
}

export async function POST(request) {
  let body = {}
  try {
    body = await request.json()
    const goalId = String(body?.goalId || body?.goal_id || '').trim()
    if (!goalId) return Response.json({ error: 'Missing goalId' }, { status: 400 })

    const { user, supabase } = await verifyUser(request, body)
    const goal = await getGoal({ supabase, userId: user.id, goalId })
    if (!goal) return Response.json({ error: 'Goal not found' }, { status: 404 })

    const proofTarget = await generateProofTarget(goal)
    await persistProofTarget({ supabase, goalId, proofTarget })
    await trackProofEvent({
      supabase,
      eventName: 'proof_target_generated',
      userId: user.id,
      goalId,
      properties: {
        goal_id: goalId,
        mode: proofTarget.mode,
        evaluation_type: proofTarget.evaluationType,
        fallback: proofTarget.generationStatus !== 'ok',
        regenerated: true,
      },
    })

    return Response.json({ proofTarget })
  } catch (error) {
    return Response.json(
      { error: error?.message || 'Failed to generate proof target' },
      { status: /token|session/i.test(error?.message || '') ? 401 : 500 },
    )
  }
}
