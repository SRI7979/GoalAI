import 'server-only'
import { getSupabaseServerClient } from '@/lib/supabaseServer'
import { getOpenAIModel } from '@/lib/openaiModels'
import { EVENTS } from '@/lib/analytics'
import {
  TOPIC_GRAPH_PROOF_TYPES,
  TOPIC_GRAPH_RESPONSE_FORMAT,
  buildTopicGraphPrompt,
} from '@/lib/prompts/topicGraph_v1'

const EDGE_TYPES = new Set(['prerequisite', 'enables', 'related'])
const PROOF_TYPES = new Set(TOPIC_GRAPH_PROOF_TYPES)
const MASTERY_THRESHOLD_V1 = 0.6
const DONE_THRESHOLD_V1 = 0.85

function assertServerOnly() {
  if (typeof window !== 'undefined') {
    throw new Error('topicGraph is server-only and cannot be imported in the browser.')
  }
}

function serviceClient() {
  assertServerOnly()
  return getSupabaseServerClient()
}

function buildTopicGraphError(code, message) {
  const error = new Error(message)
  error.code = code
  return error
}

function clamp(value, min, max, fallback) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return fallback
  return Math.max(min, Math.min(max, numeric))
}

export function conceptIdFromLabel(label) {
  return String(label || '')
    .trim()
    .toLowerCase()
    .replace(/[''"]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_{2,}/g, '_')
}

function getGoalDecomposition(goal = {}) {
  const decomposition = goal.decomposition && typeof goal.decomposition === 'object'
    ? goal.decomposition
    : {}

  return {
    primaryMode: goal.primaryMode || goal.primary_mode || decomposition.primaryMode || 'knowledge_mastery',
    secondaryModes: goal.secondaryModes || goal.secondary_modes || decomposition.secondaryModes || [],
    estimatedDays: goal.estimatedDays || goal.estimated_days || decomposition.estimatedDays || 30,
    topLevelConcepts: decomposition.topLevelConcepts || goal.topLevelConcepts || [],
    cleanedGoalText: decomposition.cleanedGoalText || goal.goal_text || goal.cleanedGoalText || '',
    decompositionStatus: decomposition.decompositionStatus || goal.decomposition_status || 'ok',
  }
}

function normalizeTopicGraphRow(row = null) {
  if (!row) return null
  return {
    id: row.id,
    goal_id: row.goal_id,
    nodes: Array.isArray(row.nodes) ? row.nodes : [],
    edges: Array.isArray(row.edges) ? row.edges : [],
    generationStatus: row.generation_status || row.generationStatus || 'ok',
    generationFailureReason: row.generation_failure_reason || row.generationFailureReason || null,
    createdAt: row.created_at || row.createdAt || null,
    updatedAt: row.updated_at || row.updatedAt || null,
  }
}

export function getTopicGraphModel() {
  return getOpenAIModel('topicGraph')
}

async function trackTopicGraphEvent({ supabase, eventName, userId = null, goalId = null, properties = {} }) {
  try {
    await supabase.from('analytics_events').insert({
      event_name: eventName,
      user_id: userId,
      goal_id: goalId,
      properties,
      client_timestamp: new Date().toISOString(),
    })
  } catch {
    // Topic graph telemetry must never block goal creation.
  }
}

async function requestTopicGraphFromOpenAI({ goal, feedback = '' }) {
  const openaiApiKey = process.env.OPENAI_API_KEY
  if (!openaiApiKey) {
    throw buildTopicGraphError('missing_api_key', 'Missing OPENAI_API_KEY for topic graph generation.')
  }

  let response
  try {
    response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: getTopicGraphModel(),
        max_completion_tokens: 5000,
        response_format: TOPIC_GRAPH_RESPONSE_FORMAT,
        messages: [
          {
            role: 'system',
            content: 'You output exactly one schema-valid JSON object. No markdown. No prose outside JSON.',
          },
          {
            role: 'user',
            content: buildTopicGraphPrompt({ goal, feedback }),
          },
        ],
      }),
      signal: AbortSignal.timeout(45000),
    })
  } catch (error) {
    throw buildTopicGraphError('openai_request_failed', error?.message || 'Topic graph request failed.')
  }

  if (!response.ok) {
    const message = await response.text().catch(() => '')
    throw buildTopicGraphError('openai_http_error', message || `Topic graph generation failed with ${response.status}.`)
  }

  const data = await response.json()
  const raw = data?.choices?.[0]?.message?.content
  if (!raw) throw buildTopicGraphError('empty_openai_response', 'OpenAI returned an empty topic graph.')

  try {
    return JSON.parse(raw)
  } catch (error) {
    throw buildTopicGraphError('invalid_json', error?.message || 'Could not parse schema-locked topic graph JSON.')
  }
}

function normalizeNode(node = {}, index = 0, idCounts, originalIdToFinal, collisions) {
  const label = String(node.label || node.id || `Concept ${index + 1}`).trim()
  const baseId = conceptIdFromLabel(label) || `concept_${index + 1}`
  const nextCount = (idCounts.get(baseId) || 0) + 1
  idCounts.set(baseId, nextCount)
  const finalId = nextCount === 1 ? baseId : `${baseId}_${nextCount}`

  if (nextCount > 1) {
    collisions.push({ baseId, finalId, label })
  }

  const originalCandidates = [
    node.id,
    label,
    baseId,
    conceptIdFromLabel(node.id),
  ].map(conceptIdFromLabel).filter(Boolean)

  originalCandidates.forEach((candidate) => {
    if (!originalIdToFinal.has(candidate)) originalIdToFinal.set(candidate, finalId)
  })

  return {
    id: finalId,
    label,
    description: String(node.description || `Learn ${label}.`).trim(),
    difficulty: clamp(node.difficulty, 0, 1, 0.5),
    estimatedMinutes: Math.round(clamp(node.estimatedMinutes, 5, 240, 30)),
    proofType: PROOF_TYPES.has(node.proofType) ? node.proofType : 'short_answer',
  }
}

function normalizeEdge(edge = {}, originalIdToFinal) {
  const fromKey = conceptIdFromLabel(edge.from)
  const toKey = conceptIdFromLabel(edge.to)
  const from = originalIdToFinal.get(fromKey) || fromKey
  const to = originalIdToFinal.get(toKey) || toKey
  const type = EDGE_TYPES.has(edge.type) ? edge.type : 'related'

  return {
    from,
    to,
    type,
    strength: clamp(edge.strength, 0, 1, type === 'prerequisite' ? 0.9 : 0.6),
  }
}

function normalizeTopicGraphPayload(payload = {}) {
  const originalIdToFinal = new Map()
  const idCounts = new Map()
  const collisions = []
  const nodes = (Array.isArray(payload.nodes) ? payload.nodes : [])
    .slice(0, 40)
    .map((node, index) => normalizeNode(node, index, idCounts, originalIdToFinal, collisions))

  const seenEdges = new Set()
  const edges = (Array.isArray(payload.edges) ? payload.edges : [])
    .map((edge) => normalizeEdge(edge, originalIdToFinal))
    .filter((edge) => {
      if (!edge.from || !edge.to || edge.from === edge.to) return false
      const key = `${edge.from}->${edge.to}:${edge.type}`
      if (seenEdges.has(key)) return false
      seenEdges.add(key)
      return true
    })

  return { nodes, edges, collisions }
}

export function validateTopicGraph(graph = {}) {
  const errors = []
  const nodes = Array.isArray(graph.nodes) ? graph.nodes : []
  const edges = Array.isArray(graph.edges) ? graph.edges : []
  const nodeIds = new Set()

  if (nodes.length === 0) errors.push('Graph must include at least one node.')

  nodes.forEach((node, index) => {
    if (!node?.id) errors.push(`Node at index ${index} is missing id.`)
    if (node?.id && nodeIds.has(node.id)) errors.push(`Duplicate node id: ${node.id}.`)
    if (node?.id) nodeIds.add(node.id)
    if (!String(node?.label || '').trim()) errors.push(`Node ${node?.id || index} is missing label.`)
    if (!PROOF_TYPES.has(node?.proofType)) errors.push(`Node ${node?.id || index} has invalid proofType.`)
  })

  const adjacency = new Map()
  const incomingCount = new Map()
  const incomingPrereqCount = new Map()
  nodes.forEach((node) => {
    adjacency.set(node.id, [])
    incomingCount.set(node.id, 0)
    incomingPrereqCount.set(node.id, 0)
  })

  edges.forEach((edge, index) => {
    if (!nodeIds.has(edge.from)) errors.push(`Edge ${index} references unknown from node: ${edge.from}.`)
    if (!nodeIds.has(edge.to)) errors.push(`Edge ${index} references unknown to node: ${edge.to}.`)
    if (!EDGE_TYPES.has(edge.type)) errors.push(`Edge ${index} has invalid type: ${edge.type}.`)
    if (edge.from === edge.to) errors.push(`Edge ${index} is a self-edge on ${edge.from}.`)

    if (nodeIds.has(edge.from) && nodeIds.has(edge.to) && edge.from !== edge.to) {
      adjacency.get(edge.from).push(edge.to)
      incomingCount.set(edge.to, (incomingCount.get(edge.to) || 0) + 1)
      if (edge.type === 'prerequisite') {
        incomingPrereqCount.set(edge.to, (incomingPrereqCount.get(edge.to) || 0) + 1)
      }
    }
  })

  const queue = nodes
    .map((node) => node.id)
    .filter((id) => (incomingCount.get(id) || 0) === 0)
  let visitedCount = 0
  const remainingIncoming = new Map(incomingCount)

  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index]
    visitedCount += 1
    ;(adjacency.get(current) || []).forEach((next) => {
      remainingIncoming.set(next, (remainingIncoming.get(next) || 0) - 1)
      if (remainingIncoming.get(next) === 0) queue.push(next)
    })
  }

  if (nodes.length > 0 && visitedCount !== nodes.length) {
    errors.push('Graph contains a cycle.')
  }

  const undirectedAdjacency = new Map(nodes.map((node) => [node.id, []]))
  edges.forEach((edge) => {
    if (!nodeIds.has(edge.from) || !nodeIds.has(edge.to) || edge.from === edge.to) return
    undirectedAdjacency.get(edge.from).push(edge.to)
    undirectedAdjacency.get(edge.to).push(edge.from)
  })

  const connectedSeen = new Set()
  let componentCount = 0
  nodes.forEach((node) => {
    if (connectedSeen.has(node.id)) return
    componentCount += 1
    const stack = [node.id]
    while (stack.length > 0) {
      const current = stack.pop()
      if (connectedSeen.has(current)) continue
      connectedSeen.add(current)
      ;(undirectedAdjacency.get(current) || []).forEach((next) => stack.push(next))
    }
  })
  if (componentCount > 1) {
    errors.push(`Graph contains ${componentCount} disconnected components; expected 1.`)
  }

  const roots = nodes
    .map((node) => node.id)
    .filter((id) => (incomingPrereqCount.get(id) || 0) === 0)
  if (nodes.length > 0 && roots.length === 0) {
    errors.push('Graph must include at least one root node with no prerequisites.')
  }

  const reachable = new Set()
  const stack = [...roots]
  while (stack.length > 0) {
    const current = stack.pop()
    if (reachable.has(current)) continue
    reachable.add(current)
    ;(adjacency.get(current) || []).forEach((next) => stack.push(next))
  }

  const unreachable = nodes.map((node) => node.id).filter((id) => !reachable.has(id))
  if (unreachable.length > 0) {
    errors.push(`Graph has orphan nodes not reachable from a root: ${unreachable.slice(0, 8).join(', ')}.`)
  }

  return { ok: errors.length === 0, errors }
}

function getFailureReason(error) {
  if (Array.isArray(error)) return error.join('; ').slice(0, 500)
  return String(error?.code || error?.message || error || 'unknown_topic_graph_failure').slice(0, 500)
}

function buildFallbackGraph(goal, error = null) {
  return {
    id: null,
    goal_id: goal?.id || goal?.goal_id || null,
    nodes: [],
    edges: [],
    generationStatus: 'pending_retry',
    generationFailureReason: getFailureReason(error),
    createdAt: null,
    updatedAt: null,
  }
}

async function persistTopicGraph({ supabase, goal, graph, status = 'ok', failureReason = null }) {
  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('topic_graphs')
    .upsert({
      goal_id: goal.id,
      nodes: graph.nodes || [],
      edges: graph.edges || [],
      generation_status: status,
      generation_failure_reason: failureReason,
      updated_at: now,
    }, { onConflict: 'goal_id' })
    .select('id,goal_id,nodes,edges,generation_status,generation_failure_reason,created_at,updated_at')
    .single()

  if (error) throw buildTopicGraphError('topic_graph_persist_failed', error.message)

  try {
    await supabase
      .from('goals')
      .update({ topic_graph_id: data.id })
      .eq('id', goal.id)
  } catch {
    // An older schema can still retain the graph row; goal pointer is best effort.
  }

  return normalizeTopicGraphRow(data)
}

async function generateValidatedGraph(goal) {
  const firstPayload = await requestTopicGraphFromOpenAI({ goal })
  let normalized = normalizeTopicGraphPayload(firstPayload)
  let validation = validateTopicGraph(normalized)

  if (validation.ok) return normalized

  const retryPayload = await requestTopicGraphFromOpenAI({
    goal,
    feedback: validation.errors.join('\n'),
  })
  normalized = normalizeTopicGraphPayload(retryPayload)
  validation = validateTopicGraph(normalized)
  if (!validation.ok) {
    throw buildTopicGraphError('topic_graph_validation_failed', validation.errors.join('; '))
  }
  return normalized
}

export async function getTopicGraph(goalId) {
  assertServerOnly()
  if (!goalId) throw buildTopicGraphError('missing_goal_id', 'getTopicGraph requires goalId.')

  const supabase = serviceClient()
  const { data, error } = await supabase
    .from('topic_graphs')
    .select('id,goal_id,nodes,edges,generation_status,generation_failure_reason,created_at,updated_at')
    .eq('goal_id', goalId)
    .maybeSingle()

  if (error) throw buildTopicGraphError('topic_graph_read_failed', error.message)
  return normalizeTopicGraphRow(data)
}

export async function generateTopicGraph(goal) {
  assertServerOnly()
  if (!goal?.id) throw buildTopicGraphError('missing_goal_id', 'generateTopicGraph requires a goal with id.')

  const supabase = serviceClient()
  const existing = await getTopicGraph(goal.id)
  if (existing) return existing

  const startedAt = Date.now()
  const decomposition = getGoalDecomposition(goal)
  const shouldSkipAi = decomposition.decompositionStatus === 'pending_retry'
    || !Array.isArray(decomposition.topLevelConcepts)
    || decomposition.topLevelConcepts.length === 0

  let graph = null
  let status = 'ok'
  let failureReason = null
  let collisions = []

  try {
    if (shouldSkipAi) {
      throw buildTopicGraphError('missing_decomposition_concepts', 'Goal decomposition is unavailable for topic graph generation.')
    }
    graph = await generateValidatedGraph({
      ...goal,
      decomposition,
    })
    collisions = graph.collisions || []
  } catch (error) {
    const fallback = buildFallbackGraph(goal, error)
    graph = fallback
    status = 'pending_retry'
    failureReason = fallback.generationFailureReason
  }

  const savedGraph = await persistTopicGraph({
    supabase,
    goal,
    graph,
    status,
    failureReason,
  })

  if (collisions.length > 0) {
    await trackTopicGraphEvent({
      supabase,
      eventName: EVENTS.TOPIC_GRAPH_ID_COLLISION,
      userId: goal.user_id || null,
      goalId: goal.id,
      properties: {
        goal_id: goal.id,
        collision_count: collisions.length,
        collisions: collisions.slice(0, 10),
      },
    })
  }

  await trackTopicGraphEvent({
    supabase,
    eventName: EVENTS.TOPIC_GRAPH_GENERATED,
    userId: goal.user_id || null,
    goalId: goal.id,
    properties: {
      goal_id: goal.id,
      node_count: savedGraph.nodes.length,
      edge_count: savedGraph.edges.length,
      generation_ms: Date.now() - startedAt,
      ai_model_used: getTopicGraphModel(),
      fallback: status !== 'ok',
    },
  })

  return savedGraph
}

function getMastery(learnerState = {}, conceptId) {
  return clamp(learnerState?.knowledge?.[conceptId]?.mastery, 0, 1, 0)
}

export function getAvailableConcepts(graph, learnerState = {}, options = {}) {
  const nodes = Array.isArray(graph?.nodes) ? graph.nodes : []
  const edges = Array.isArray(graph?.edges) ? graph.edges : []
  const limit = options?.limit === Infinity
    ? Infinity
    : (Number.isFinite(Number(options?.limit)) ? Math.max(0, Number(options.limit)) : 5)
  const masteryThreshold = clamp(options?.masteryThreshold, 0, 1, MASTERY_THRESHOLD_V1)
  const doneThreshold = clamp(options?.doneThreshold, 0, 1, DONE_THRESHOLD_V1)

  const prerequisiteEdgesByTarget = edges.reduce((map, edge) => {
    if (edge.type !== 'prerequisite') return map
    if (!map.has(edge.to)) map.set(edge.to, [])
    map.get(edge.to).push(edge)
    return map
  }, new Map())

  const available = nodes
    .filter((node) => getMastery(learnerState, node.id) <= doneThreshold)
    .filter((node) => {
      const prerequisites = prerequisiteEdgesByTarget.get(node.id) || []
      return prerequisites.every((edge) => getMastery(learnerState, edge.from) >= masteryThreshold)
    })
    .map((node) => node.id)

  return limit === Infinity ? available : available.slice(0, limit)
}

export function getNextConcepts(graph, learnerState = {}, count = 3) {
  const requestedCount = Math.max(0, Math.round(Number(count) || 0))
  const availableIds = getAvailableConcepts(graph, learnerState, { limit: Infinity })
  const nodesById = new Map((graph?.nodes || []).map((node) => [node.id, node]))
  const enablesCountBySource = (graph?.edges || []).reduce((counts, edge) => {
    // v1 ordering rule -- tuned later in P7: prefer available concepts that
    // open the most downstream optional/enabling paths, then lower difficulty.
    if (edge.type !== 'enables') return counts
    counts.set(edge.from, (counts.get(edge.from) || 0) + 1)
    return counts
  }, new Map())

  return availableIds
    .sort((left, right) => {
      const leftUnlocks = enablesCountBySource.get(left) || 0
      const rightUnlocks = enablesCountBySource.get(right) || 0
      if (rightUnlocks !== leftUnlocks) return rightUnlocks - leftUnlocks

      const leftDifficulty = Number(nodesById.get(left)?.difficulty) || 0
      const rightDifficulty = Number(nodesById.get(right)?.difficulty) || 0
      if (leftDifficulty !== rightDifficulty) return leftDifficulty - rightDifficulty
      return left.localeCompare(right)
    })
    .slice(0, requestedCount)
}

export function getGraphProgress(graph, learnerState = {}) {
  const nodes = Array.isArray(graph?.nodes) ? graph.nodes : []
  const totalConcepts = nodes.length
  const mastered = nodes.filter((node) => getMastery(learnerState, node.id) > DONE_THRESHOLD_V1).length
  const inProgress = nodes.filter((node) => {
    const mastery = getMastery(learnerState, node.id)
    return mastery > 0 && mastery <= DONE_THRESHOLD_V1
  }).length
  const available = getAvailableConcepts(graph, learnerState, { limit: Infinity }).length
  const locked = Math.max(0, totalConcepts - mastered - available)
  const percentComplete = totalConcepts > 0 ? Math.round((mastered / totalConcepts) * 100) : 0

  return {
    totalConcepts,
    mastered,
    inProgress,
    available,
    locked,
    percentComplete,
  }
}
