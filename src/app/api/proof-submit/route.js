import { EVENTS } from '@/lib/analytics'
import {
  applyProofEvidence,
  buildFallbackProofTarget,
  evaluateProofSubmission,
  proofStatusFromEvaluation,
  trackProofEvent,
} from '@/lib/proofOfMastery'
import { getSupabaseServerClient } from '@/lib/supabaseServer'
import { getTopicGraph } from '@/lib/topicGraph'

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
    .select('id,user_id,goal_text,primary_mode,secondary_modes,estimated_days,decomposition,proof_target')
    .eq('id', goalId)
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data
}

export async function POST(request) {
  let body = {}
  try {
    body = await request.json()
    const goalId = String(body?.goalId || body?.goal_id || '').trim()
    const submission = body?.submission || {}
    if (!goalId) return Response.json({ error: 'Missing goalId' }, { status: 400 })
    if (!submission || typeof submission !== 'object') {
      return Response.json({ error: 'Missing submission' }, { status: 400 })
    }

    const { user, supabase } = await verifyUser(request, body)
    const goal = await getGoal({ supabase, userId: user.id, goalId })
    if (!goal) return Response.json({ error: 'Goal not found' }, { status: 404 })

    const proofTarget = goal.proof_target || buildFallbackProofTarget(goal)
    await trackProofEvent({
      supabase,
      eventName: EVENTS.PROOF_SUBMITTED,
      userId: user.id,
      goalId,
      properties: {
        evaluation_type: proofTarget.evaluationType,
        submission_keys: Object.keys(submission).slice(0, 20),
      },
    })

    const evaluation = await evaluateProofSubmission({ goal, proofTarget, submission })
    const status = proofStatusFromEvaluation(evaluation)
    const now = new Date().toISOString()

    const { data: row, error: insertError } = await supabase
      .from('proof_submissions')
      .insert({
        user_id: user.id,
        goal_id: goalId,
        proof_target: proofTarget,
        submission,
        evaluation,
        score: evaluation.score,
        passed: evaluation.passed,
        status,
        evaluated_at: now,
        updated_at: now,
      })
      .select()
      .single()

    if (insertError) throw new Error(insertError.message)

    let learnerState = null
    if (evaluation.passed) {
      const topicGraph = await getTopicGraph(goalId).catch(() => null)
      learnerState = await applyProofEvidence({
        userId: user.id,
        goal,
        topicGraph,
        proofTarget,
        evaluation,
      }).catch(() => null)

      await supabase
        .from('goals')
        .update({ status: 'completed' })
        .eq('id', goalId)
        .eq('user_id', user.id)
    }

    await trackProofEvent({
      supabase,
      eventName: EVENTS.PROOF_EVALUATED,
      userId: user.id,
      goalId,
      properties: {
        proof_submission_id: row.id,
        evaluation_type: proofTarget.evaluationType,
        score: evaluation.score,
        passed: evaluation.passed,
        status,
        ai_model_used: evaluation.aiModelUsed,
        fallback: evaluation.fallback,
      },
    })

    if (evaluation.passed) {
      await trackProofEvent({
        supabase,
        eventName: EVENTS.PROOF_COMPLETED,
        userId: user.id,
        goalId,
        properties: {
          proof_submission_id: row.id,
          evaluation_type: proofTarget.evaluationType,
          score: evaluation.score,
        },
      })
    }

    return Response.json({
      proofSubmission: row,
      evaluation,
      goalCompleted: evaluation.passed,
      learnerState: learnerState ? {
        knowledge: learnerState.knowledge,
        pedagogicalProfile: learnerState.pedagogicalProfile,
        updatedAt: learnerState.updatedAt,
      } : null,
    })
  } catch (error) {
    return Response.json(
      { error: error?.message || 'Failed to submit proof' },
      { status: /token|session/i.test(error?.message || '') ? 401 : 500 },
    )
  }
}
