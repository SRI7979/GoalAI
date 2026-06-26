import { getSupabaseServerClient } from '@/lib/supabaseServer'
import { buildDomainKnowledgeLine } from '@/lib/domainAdapter'
import { EVENTS } from '@/lib/analytics'
import {
  buildFallbackGoalDecomposition,
  decomposeGoal,
  getGoalDecomposerModel,
  normalizeGoalDecompositionForStorage,
} from '@/lib/goalDecomposer'
import { generateTopicGraph } from '@/lib/topicGraph'
import { P5_MISSION_FLOW_VERSION, missionsEnabled } from '@/lib/missionAssembler'
import { generateProofTarget, trackProofEvent } from '@/lib/proofOfMastery'

function extractAccessToken(request, body = {}) {
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization')
  if (authHeader?.toLowerCase().startsWith('bearer ')) {
    return authHeader.slice(7).trim() || null
  }
  return body?.accessToken || null
}

function isMissingGoalDecompositionColumnError(error) {
  const message = String(error?.message || '')
  return /Could not find the '(decomposition|primary_mode|secondary_modes|estimated_days|decomposition_status|decomposition_failure_reason|mission_flow_version|proof_target|proof_target_status|proof_target_failure_reason)' column of 'goals' in the schema cache/i.test(message)
}

function buildGoalConstraints({ domain, learnerProfile, decomposition, includeDeferredDecomposition = false }) {
  return [
    domain ? buildDomainKnowledgeLine(domain) : null,
    `Learner profile JSON: ${JSON.stringify(learnerProfile || {})}`,
    includeDeferredDecomposition
      ? `Deferred goal decomposition JSON: ${JSON.stringify(decomposition)}`
      : null,
  ].filter(Boolean)
}

function getWriteClient(authenticatedClient) {
  try {
    // Prefer the service-role client after we have verified the user token.
    return getSupabaseServerClient()
  } catch {
    return authenticatedClient
  }
}

async function resolveGoalDecomposition({ goalText, decomposition, userContext }) {
  if (decomposition) {
    return normalizeGoalDecompositionForStorage(decomposition, goalText)
  }

  try {
    return await decomposeGoal(goalText, userContext)
  } catch (error) {
    return buildFallbackGoalDecomposition(goalText, error)
  }
}

async function trackGoalDecomposedServer({ supabase, userId, goalId, decomposition }) {
  try {
    await supabase.from('analytics_events').insert({
      event_name: EVENTS.GOAL_DECOMPOSED,
      user_id: userId,
      goal_id: goalId,
      properties: {
        goal_id: goalId,
        primary_mode: decomposition.primaryMode,
        estimated_days: decomposition.estimatedDays,
        confidence: decomposition.confidence,
        model_used: getGoalDecomposerModel(),
        fallback: decomposition.decompositionStatus === 'pending_retry',
      },
      client_timestamp: new Date().toISOString(),
    })
  } catch {
    // Telemetry must never block goal creation.
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const accessToken = extractAccessToken(request, body)
    const goalText = String(body?.goalText || '').trim()
    const mode = body?.mode === 'explore' ? 'explore' : 'goal'

    if (!accessToken) {
      return Response.json({ error: 'Missing access token' }, { status: 401 })
    }

    if (!goalText) {
      return Response.json({ error: 'Missing goalText' }, { status: 400 })
    }

    const authenticatedClient = getSupabaseServerClient({ accessToken })
    const { data: authData, error: authError } = await authenticatedClient.auth.getUser(accessToken)
    const user = authData?.user

    if (authError || !user?.id) {
      return Response.json({ error: 'Invalid session' }, { status: 401 })
    }

    const writeClient = getWriteClient(authenticatedClient)
    const decomposition = await resolveGoalDecomposition({
      goalText,
      decomposition: body?.decomposition,
      userContext: body?.userContext || {
        knowledge: body?.knowledge,
        level: body?.learnerProfile?.recommendedLevel || body?.learnerProfile?.level,
      },
    })
    const proofTarget = await generateProofTarget({
      goal_text: goalText,
      primary_mode: decomposition.primaryMode,
      secondary_modes: decomposition.secondaryModes,
      estimated_days: decomposition.estimatedDays,
      decomposition,
    })
    const canonicalGoalInsert = {
      user_id: user.id,
      goal_text: goalText,
      primary_mode: decomposition.primaryMode,
      secondary_modes: decomposition.secondaryModes,
      estimated_days: decomposition.estimatedDays,
      decomposition,
      decomposition_status: decomposition.decompositionStatus,
      decomposition_failure_reason: decomposition.failureReason,
      mission_flow_version: missionsEnabled() ? P5_MISSION_FLOW_VERSION : null,
      proof_target: proofTarget,
      proof_target_status: proofTarget.generationStatus || 'ok',
      proof_target_failure_reason: proofTarget.generationFailureReason || null,
      mode,
      deadline: body?.deadline || null,
      weekday_mins: Number(body?.weekdayMins) || 30,
      weekend_mins: Number(body?.weekendMins) || 45,
      constraints: buildGoalConstraints({
        domain: body?.domain,
        learnerProfile: body?.learnerProfile,
        decomposition,
      }),
      status: 'active',
      total_days: mode === 'goal' ? Number(body?.totalDays) || 0 : 0,
    }

    let { data: goal, error: goalError } = await writeClient
      .from('goals')
      .insert(canonicalGoalInsert)
      .select()
      .single()
    let usedLegacyDecompositionStorage = false

    if (goalError && isMissingGoalDecompositionColumnError(goalError)) {
      usedLegacyDecompositionStorage = true
      const {
        primary_mode: _primaryMode,
        secondary_modes: _secondaryModes,
        estimated_days: _estimatedDays,
        decomposition: _decomposition,
        decomposition_status: _decompositionStatus,
        decomposition_failure_reason: _decompositionFailureReason,
        mission_flow_version: _missionFlowVersion,
        proof_target: _proofTarget,
        proof_target_status: _proofTargetStatus,
        proof_target_failure_reason: _proofTargetFailureReason,
        ...legacyGoalInsert
      } = canonicalGoalInsert

      ;({ data: goal, error: goalError } = await writeClient
        .from('goals')
        .insert({
          ...legacyGoalInsert,
          constraints: buildGoalConstraints({
            domain: body?.domain,
            learnerProfile: body?.learnerProfile,
            decomposition,
            includeDeferredDecomposition: true,
          }),
        })
        .select()
        .single())
    }

    if (goalError) {
      return Response.json({ error: goalError.message }, { status: 500 })
    }

    if (usedLegacyDecompositionStorage && goal) {
      goal = {
        ...goal,
        primary_mode: decomposition.primaryMode,
        secondary_modes: decomposition.secondaryModes,
        estimated_days: decomposition.estimatedDays,
        decomposition,
        decomposition_status: decomposition.decompositionStatus,
        decomposition_failure_reason: decomposition.failureReason,
        proof_target: proofTarget,
        proof_target_status: proofTarget.generationStatus || 'ok',
        proof_target_failure_reason: proofTarget.generationFailureReason || null,
      }
    }

    await trackGoalDecomposedServer({
      supabase: writeClient,
      userId: user.id,
      goalId: goal.id,
      decomposition,
    })

    await trackProofEvent({
      supabase: writeClient,
      eventName: 'proof_target_generated',
      userId: user.id,
      goalId: goal.id,
      properties: {
        goal_id: goal.id,
        mode: proofTarget.mode,
        evaluation_type: proofTarget.evaluationType,
        rubric_count: Array.isArray(proofTarget.rubric) ? proofTarget.rubric.length : 0,
        fallback: proofTarget.generationStatus !== 'ok',
      },
    })

    let topicGraph = null
    try {
      topicGraph = await generateTopicGraph({
        ...goal,
        decomposition,
        primaryMode: decomposition.primaryMode,
        secondaryModes: decomposition.secondaryModes,
        estimatedDays: decomposition.estimatedDays,
      })
      if (topicGraph?.id) {
        goal = {
          ...goal,
          topic_graph_id: topicGraph.id,
        }
      }
    } catch {
      // Topic graph generation must not block goal creation. generateTopicGraph
      // handles AI/validation failures by persisting a pending_retry graph; this
      // catch only protects against infrastructure/schema failures.
    }

    return Response.json({ goal, decomposition, topicGraph, proofTarget })
  } catch (error) {
    return Response.json(
      { error: error?.message || 'Failed to create goal' },
      { status: 500 },
    )
  }
}
