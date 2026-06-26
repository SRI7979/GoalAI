import { getSupabaseServerClient } from '@/lib/supabaseServer'
import { componentSignalSchema } from '@/components/library/schemas'
import { validateAgainstSchema } from '@/components/library/schemaValidator'
import {
  applyEvidence,
  getLearnerState,
  persistPendingEvidence,
} from '@/lib/learnerState'
import { normalizeMissionRow } from '@/lib/missionAssembler'
import {
  buildWithinLessonDecision,
  insertAdaptiveComponent,
  trackAdaptiveDecision,
} from '@/lib/adaptiveEngine'

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

export async function POST(request) {
  const body = await request.json().catch(() => ({}))
  try {
    const accessToken = extractAccessToken(request, body)
    const missionId = String(body?.missionId || '').trim()
    const componentIndex = Number(body?.componentIndex)
    const signal = body?.signal

    if (!accessToken) return Response.json({ error: 'Missing access token' }, { status: 401 })
    if (!missionId) return Response.json({ error: 'Missing missionId' }, { status: 400 })
    if (!Number.isInteger(componentIndex) || componentIndex < 0) {
      return Response.json({ error: 'Invalid componentIndex' }, { status: 400 })
    }

    const validation = validateAgainstSchema(componentSignalSchema, signal, 'componentSignal')
    if (!validation.ok) {
      return Response.json({ error: 'Invalid component signal', details: validation.errors }, { status: 400 })
    }

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

    const components = Array.isArray(missionRow.components) ? missionRow.components : []
    if (!components[componentIndex]) {
      return Response.json({ error: 'Component index out of range' }, { status: 400 })
    }

    const nextComponents = components.map((component, index) => (
      index === componentIndex ? { ...component, signal } : component
    ))

    let { data: updatedMission, error: updateError } = await supabase
      .from('missions')
      .update({
        components: nextComponents,
        status: missionRow.status === 'pending' ? 'in_progress' : missionRow.status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', missionId)
      .eq('user_id', user.id)
      .select('*')
      .single()

    if (updateError) return Response.json({ error: updateError.message }, { status: 500 })

    const event = {
      timestamp: new Date().toISOString(),
      componentType: signal.componentType,
      conceptIds: signal.conceptIds,
      signal,
    }

    let evidencePending = false
    let adaptiveDecision = null
    let updatedState = null
    try {
      const state = await getLearnerState(user.id, missionRow.goal_id)
      updatedState = await applyEvidence(state, event)
    } catch (error) {
      evidencePending = true
      await persistPendingEvidence({
        userId: user.id,
        goalId: missionRow.goal_id,
        event,
        error,
        source: 'mission_signal',
      })
    }

    if (updatedState) {
      adaptiveDecision = buildWithinLessonDecision({
        mission: { ...missionRow, components: nextComponents },
        componentIndex,
        signal,
        learnerState: updatedState,
      })
      await trackAdaptiveDecision({
        supabase,
        userId: user.id,
        goalId: missionRow.goal_id,
        missionId,
        decision: adaptiveDecision,
        properties: {
          component_index: componentIndex,
          trigger_component_type: signal.componentType,
        },
      })

      if (adaptiveDecision?.action === 'insert_component' && adaptiveDecision.component) {
        const adaptedComponents = insertAdaptiveComponent(nextComponents, componentIndex, adaptiveDecision.component)
        if (adaptedComponents !== nextComponents) {
          const { data: adaptedMission, error: adaptedError } = await supabase
            .from('missions')
            .update({
              components: adaptedComponents,
              updated_at: new Date().toISOString(),
            })
            .eq('id', missionId)
            .eq('user_id', user.id)
            .select('*')
            .single()

          if (adaptedError) return Response.json({ error: adaptedError.message }, { status: 500 })
          updatedMission = adaptedMission
        }
      }
    }

    return Response.json({
      ok: true,
      mission: normalizeMissionRow(updatedMission),
      evidencePending,
      adaptiveDecision,
    })
  } catch (error) {
    return Response.json({ error: error?.message || 'Failed to save mission signal' }, { status: 500 })
  }
}
