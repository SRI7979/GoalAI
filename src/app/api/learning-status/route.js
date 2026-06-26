import { getLearnerState } from '@/lib/learnerState'
import { getGraphProgress, getTopicGraph } from '@/lib/topicGraph'
import { getSupabaseServerClient } from '@/lib/supabaseServer'

function extractAccessToken(request) {
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization')
  if (authHeader?.toLowerCase().startsWith('bearer ')) return authHeader.slice(7).trim() || null
  return null
}

async function getAuthedUser(accessToken) {
  const authenticatedClient = getSupabaseServerClient({ accessToken })
  const { data, error } = await authenticatedClient.auth.getUser(accessToken)
  if (error || !data?.user?.id) return null
  return data.user
}

function clampPercent(value) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return 0
  return Math.max(0, Math.min(100, Math.round(numeric)))
}

function labelFromConceptId(conceptId, graph) {
  const node = (Array.isArray(graph?.nodes) ? graph.nodes : []).find((entry) => entry.id === conceptId)
  if (node?.label) return node.label
  return String(conceptId || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function summarizeKnowledge(learnerState, graph) {
  const knowledge = learnerState?.knowledge && typeof learnerState.knowledge === 'object'
    ? learnerState.knowledge
    : {}
  const entries = Object.entries(knowledge)
    .map(([conceptId, state]) => ({
      conceptId,
      label: labelFromConceptId(conceptId, graph),
      mastery: Math.max(0, Math.min(1, Number(state?.mastery) || 0)),
      confidence: Math.max(0, Math.min(1, Number(state?.confidence) || 0)),
      evidenceCount: Array.isArray(state?.evidenceLog) ? state.evidenceLog.length : 0,
      misconceptions: Array.isArray(state?.misconceptions) ? state.misconceptions.slice(0, 3) : [],
      lastPracticed: state?.lastPracticed || null,
    }))

  const practicedConcepts = entries.filter((entry) => entry.evidenceCount > 0 || entry.mastery > 0)
  const averageMastery = practicedConcepts.length > 0
    ? practicedConcepts.reduce((sum, entry) => sum + entry.mastery, 0) / practicedConcepts.length
    : 0
  const strongestConcepts = practicedConcepts
    .slice()
    .sort((left, right) => right.mastery - left.mastery)
    .slice(0, 3)
  const focusConcepts = practicedConcepts
    .filter((entry) => entry.mastery < 0.8)
    .sort((left, right) => {
      if (left.mastery !== right.mastery) return left.mastery - right.mastery
      return right.evidenceCount - left.evidenceCount
    })
    .slice(0, 4)

  return {
    practicedConcepts: practicedConcepts.length,
    averageMastery: Number(averageMastery.toFixed(2)),
    strongestConcepts,
    focusConcepts,
    pedagogicalProfile: learnerState?.pedagogicalProfile || {},
  }
}

async function loadLatestProofSubmission(supabase, userId, goalId) {
  const { data, error } = await supabase
    .from('proof_submissions')
    .select('id,status,score,passed,evaluation,created_at,evaluated_at')
    .eq('goal_id', goalId)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) return null
  return data || null
}

async function loadOpenQualityIssues(supabase, userId, goalId) {
  const { data, error } = await supabase
    .from('quality_issues')
    .select('id,issue_type,severity,title,created_at')
    .eq('goal_id', goalId)
    .eq('user_id', userId)
    .eq('status', 'open')
    .order('severity', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(3)
  if (error) return []
  return Array.isArray(data) ? data : []
}

export async function GET(request) {
  try {
    const accessToken = extractAccessToken(request)
    const goalId = new URL(request.url).searchParams.get('goal_id') || new URL(request.url).searchParams.get('goalId')

    if (!accessToken) return Response.json({ error: 'Missing access token' }, { status: 401 })
    if (!goalId) return Response.json({ error: 'Missing goal_id' }, { status: 400 })

    const user = await getAuthedUser(accessToken)
    if (!user?.id) return Response.json({ error: 'Invalid session' }, { status: 401 })

    const supabase = getSupabaseServerClient()
    const { data: goal, error: goalError } = await supabase
      .from('goals')
      .select('id,user_id,goal_text,topic_graph_id,proof_target,proof_target_status,status')
      .eq('id', goalId)
      .eq('user_id', user.id)
      .maybeSingle()
    if (goalError) throw new Error(goalError.message)
    if (!goal) return Response.json({ error: 'Goal not found' }, { status: 404 })

    const learnerState = await getLearnerState(user.id, goalId)
    const graph = goal.topic_graph_id ? await getTopicGraph(goalId).catch(() => null) : null
    const graphProgress = graph ? getGraphProgress(graph, learnerState) : null
    const learner = summarizeKnowledge(learnerState, graph)
    const latestSubmission = await loadLatestProofSubmission(supabase, user.id, goalId)
    const qualityIssues = await loadOpenQualityIssues(supabase, user.id, goalId)

    const graphPercent = Number(graphProgress?.percentComplete) || 0
    const masteryPercent = Math.round((Number(learner.averageMastery) || 0) * 100)
    const proofReadiness = latestSubmission?.passed
      ? 100
      : clampPercent((graphPercent * 0.7) + (masteryPercent * 0.3))

    return Response.json({
      goal: {
        id: goal.id,
        status: goal.status,
        hasTopicGraph: Boolean(goal.topic_graph_id),
      },
      graphProgress,
      learner,
      proof: {
        target: goal.proof_target || null,
        targetStatus: goal.proof_target_status || null,
        latestSubmission,
        readinessPercent: proofReadiness,
        ready: proofReadiness >= 80 || latestSubmission?.passed === true,
      },
      quality: {
        openIssueCount: qualityIssues.length,
        topIssues: qualityIssues.map((issue) => ({
          id: issue.id,
          type: issue.issue_type,
          severity: issue.severity,
          title: issue.title,
        })),
      },
    })
  } catch (error) {
    return Response.json(
      { error: error?.message || 'Failed to load learning status' },
      { status: /token|session/i.test(error?.message || '') ? 401 : 500 },
    )
  }
}
