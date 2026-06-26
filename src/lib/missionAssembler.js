import 'server-only'
import { getSupabaseServerClient } from '@/lib/supabaseServer'
import { EVENTS } from '@/lib/analytics'
import { getLearnerState, conceptIdFromLabel } from '@/lib/learnerState'
import { getNextConcepts, getTopicGraph } from '@/lib/topicGraph'
import {
  buildFallbackComponentParams,
  generateComponentParams,
} from '@/lib/componentGenerator'
import { getMissionRecipe } from '@/lib/missionRecipes'
import {
  buildAdaptiveMissionPlan,
  trackAdaptiveDecision,
} from '@/lib/adaptiveEngine'

export const P5_MISSION_FLOW_VERSION = 'p5'

const COMPONENT_ESTIMATED_MINUTES = Object.freeze({
  concept_explainer: 3,
  worked_example: 4,
  multiple_choice_quiz: 2,
  free_response: 5,
  flashcard_drill: 3,
  code_predictor: 3,
  code_sandbox: 6,
  code_debugger: 6,
  audio_listen: 3,
  audio_speak: 4,
  image_identify: 3,
  drag_match: 4,
  order_steps: 4,
  timed_problem_set: 6,
  roleplay_scenario: 6,
  case_study_analyze: 6,
  reflection_prompt: 4,
  do_in_real_world: 5,
  mock_exam: 8,
  concept_map_build: 5,
})

const HARD_ENDING_COMPONENTS = new Set([
  'multiple_choice_quiz',
  'code_predictor',
  'code_sandbox',
  'code_debugger',
  'image_identify',
  'drag_match',
  'timed_problem_set',
  'mock_exam',
])
const CONFIDENCE_BUILDERS = ['flashcard_drill', 'reflection_prompt', 'free_response', 'do_in_real_world', 'concept_explainer']

function serviceClient() {
  return getSupabaseServerClient()
}

export function missionsEnabled() {
  return process.env.PATHAI_MISSIONS_ENABLED === 'true'
}

export function goalUsesMissionFlow(goal = {}) {
  return goal?.mission_flow_version === P5_MISSION_FLOW_VERSION
}

function clampInt(value, min, max, fallback) {
  const numeric = Math.round(Number(value))
  if (!Number.isFinite(numeric)) return fallback
  return Math.max(min, Math.min(max, numeric))
}

function getFailureReason(error) {
  return String(error?.code || error?.message || error || 'mission_assembly_failed').slice(0, 500)
}

function normalizeGoal(row = {}) {
  const decomposition = row?.decomposition && typeof row.decomposition === 'object' ? row.decomposition : {}
  return {
    ...row,
    primaryMode: row.primary_mode || row.primaryMode || decomposition.primaryMode || 'knowledge_mastery',
    secondaryModes: row.secondary_modes || row.secondaryModes || decomposition.secondaryModes || [],
    estimatedDays: row.estimated_days || row.estimatedDays || decomposition.estimatedDays || 30,
    goalText: row.goal_text || decomposition.cleanedGoalText || '',
    topicGraphId: row.topic_graph_id || row.topicGraphId || null,
  }
}

export function normalizeMissionRow(row = null) {
  if (!row) return null
  return {
    id: row.id,
    user_id: row.user_id,
    goal_id: row.goal_id,
    dayNumber: row.day_number,
    conceptsTargeted: Array.isArray(row.concepts_targeted) ? row.concepts_targeted : [],
    components: Array.isArray(row.components) ? row.components : [],
    estimatedMinutes: Number(row.estimated_minutes) || 0,
    proofRequired: Boolean(row.proof_required),
    status: row.status || 'pending',
    generationStatus: row.generation_status || 'ok',
    generationFailureReason: row.generation_failure_reason || null,
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
    completedAt: row.completed_at || null,
  }
}

async function trackMissionServer({ supabase, eventName, userId, goalId, missionId = null, properties = {} }) {
  try {
    await supabase.from('analytics_events').insert({
      event_name: eventName,
      user_id: userId || null,
      goal_id: goalId || null,
      mission_id: missionId,
      properties,
      client_timestamp: new Date().toISOString(),
    })
  } catch {
    // Mission telemetry must never block the learner.
  }
}

function nodesById(graph = {}) {
  return new Map((Array.isArray(graph.nodes) ? graph.nodes : []).map((node) => [node.id, node]))
}

function getMastery(learnerState = {}, conceptId) {
  const mastery = Number(learnerState?.knowledge?.[conceptId]?.mastery)
  return Number.isFinite(mastery) ? Math.max(0, Math.min(1, mastery)) : 0
}

function selectTargetConcepts(graph, learnerState, desiredCount) {
  const nodeMap = nodesById(graph)
  const nextIds = getNextConcepts(graph, learnerState, desiredCount)
  const fallbackIds = (Array.isArray(graph?.nodes) ? graph.nodes : [])
    .filter((node) => getMastery(learnerState, node.id) <= 0.85)
    .sort((left, right) => (Number(left.difficulty) || 0) - (Number(right.difficulty) || 0))
    .map((node) => node.id)
  const ids = [...nextIds, ...fallbackIds]
    .filter((id, index, all) => id && all.indexOf(id) === index)
    .slice(0, desiredCount)

  return ids.map((id) => nodeMap.get(id)).filter(Boolean)
}

function desiredComponentCount(recipe) {
  const min = Number(recipe?.pacingRules?.minComponents) || 4
  const max = Number(recipe?.pacingRules?.maxComponents) || 7
  return clampInt((Number(recipe?.lengthTargetMinutes) || 15) / 3, min, max, 5)
}

function pickWeightedMiddleTypes(recipe, count, opener, closer) {
  const entries = Object.entries(recipe.componentMix || {})
    .filter(([, weight]) => Number(weight) > 0)
    .sort((a, b) => Number(b[1]) - Number(a[1]))
  const picked = []
  const used = new Map()

  while (picked.length < count && entries.length > 0) {
    const last = picked[picked.length - 1] || opener
    const ranked = entries
      .map(([type, weight]) => ({
        type,
        score: Number(weight) / ((used.get(type) || 0) + 1),
      }))
      .sort((left, right) => right.score - left.score)
    const next = ranked.find((entry) => entry.type !== last && entry.type !== closer) || ranked[0]
    picked.push(next.type)
    used.set(next.type, (used.get(next.type) || 0) + 1)
  }

  return picked
}

function chooseCloser(recipe) {
  const requested = recipe?.pacingRules?.closer
  if (requested && !HARD_ENDING_COMPONENTS.has(requested)) return requested
  return CONFIDENCE_BUILDERS.find((type) => Number(recipe?.componentMix?.[type]) > 0) || 'concept_explainer'
}

function buildComponentTypeSequence({ recipe, targetConcepts, learnerState }) {
  const hasNewConcept = targetConcepts.some((concept) => getMastery(learnerState, concept.id) <= 0.05)
  const opener = hasNewConcept ? 'concept_explainer' : (recipe?.pacingRules?.opener || 'worked_example')
  const closer = chooseCloser(recipe)
  const count = desiredComponentCount(recipe)
  const middleCount = Math.max(2, count - 2)

  return [
    opener,
    ...pickWeightedMiddleTypes(recipe, middleCount, opener, closer),
    closer,
  ].slice(0, count)
}

function conceptForComponent(targetConcepts, index) {
  if (!targetConcepts.length) return null
  return targetConcepts[index % targetConcepts.length]
}

async function buildComponentInstances({ componentTypes, targetConcepts, learnerState, goal }) {
  const instances = []
  let usedGenerationFallback = false

  for (let index = 0; index < componentTypes.length; index += 1) {
    const componentType = componentTypes[index]
    const concept = conceptForComponent(targetConcepts, index)
    const generated = await generateComponentParams({
      componentType,
      concept,
      learnerState,
      goalText: goal.goalText,
      allowFallback: true,
    })
    usedGenerationFallback = usedGenerationFallback || Boolean(generated.fallback)

    instances.push({
      componentType,
      params: generated.params,
      position: index,
      conceptIds: concept?.id ? [concept.id] : [],
    })
  }

  return { instances, usedGenerationFallback }
}

async function fetchGoalForMission(supabase, userId, goalId) {
  const { data, error } = await supabase
    .from('goals')
    .select('*')
    .eq('id', goalId)
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw new Error(`Failed to read goal: ${error.message}`)
  return data ? normalizeGoal(data) : null
}

async function persistMission({ supabase, mission }) {
  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('missions')
    .insert({
      user_id: mission.user_id,
      goal_id: mission.goal_id,
      day_number: mission.dayNumber,
      concepts_targeted: mission.conceptsTargeted,
      components: mission.components,
      estimated_minutes: mission.estimatedMinutes,
      proof_required: mission.proofRequired,
      status: mission.status,
      generation_status: mission.generationStatus,
      generation_failure_reason: mission.generationFailureReason,
      created_at: now,
      updated_at: now,
    })
    .select('*')
    .single()

  if (error) throw new Error(`Failed to persist mission: ${error.message}`)
  return normalizeMissionRow(data)
}

export async function persistFallbackMission({ userId, goal, dayNumber = 1, error }) {
  const supabase = serviceClient()
  const label = goal?.goalText || goal?.goal_text || 'today\'s concept'
  const conceptId = conceptIdFromLabel(label) || 'today_concept'
  const concept = { id: conceptId, label }
  const components = [
    {
      componentType: 'concept_explainer',
      params: buildFallbackComponentParams('concept_explainer', concept),
      position: 0,
      conceptIds: [conceptId],
    },
    {
      componentType: 'free_response',
      params: buildFallbackComponentParams('free_response', concept),
      position: 1,
      conceptIds: [conceptId],
    },
  ]

  const saved = await persistMission({
    supabase,
    mission: {
      user_id: userId,
      goal_id: goal?.id,
      dayNumber,
      conceptsTargeted: [conceptId],
      components,
      estimatedMinutes: 8,
      proofRequired: false,
      status: 'pending',
      generationStatus: 'pending_retry',
      generationFailureReason: getFailureReason(error),
    },
  })

  await trackMissionServer({
    supabase,
    eventName: EVENTS.MISSION_ASSEMBLED,
    userId,
    goalId: goal?.id,
    missionId: saved.id,
    properties: {
      mission_id: saved.id,
      goal_id: goal?.id,
      learning_mode: goal?.primaryMode || goal?.primary_mode || 'knowledge_mastery',
      concepts_targeted: saved.conceptsTargeted,
      component_count: saved.components.length,
      estimated_minutes: saved.estimatedMinutes,
      fallback: true,
    },
  })

  return saved
}

export async function assembleMission({ userId, goalId, dayNumber = 1 } = {}) {
  if (!userId || !goalId) throw new Error('assembleMission requires userId and goalId.')

  const supabase = serviceClient()
  const goal = await fetchGoalForMission(supabase, userId, goalId)
  if (!goal || !goalUsesMissionFlow(goal) || !goal.topicGraphId) return null

  const learnerState = await getLearnerState(userId, goalId)
  const graph = await getTopicGraph(goalId)
  if (!graph) return null
  if (!Array.isArray(graph.nodes) || graph.nodes.length === 0) {
    throw new Error(graph.generationFailureReason || 'Topic graph is empty; mission assembly cannot pick concepts.')
  }

  const targetConceptCount = clampInt(goal.estimatedDays / 30, 2, 3, 2)
  const targetConcepts = selectTargetConcepts(graph, learnerState, targetConceptCount)
  if (targetConcepts.length === 0) {
    throw new Error('No available concepts for mission assembly.')
  }

  const recipe = getMissionRecipe(goal.primaryMode)
  const adaptivePlan = buildAdaptiveMissionPlan({
    recipe,
    learnerState,
    targetConcepts,
    dayNumber,
  })
  const componentTypes = buildComponentTypeSequence({ recipe: adaptivePlan.recipe, targetConcepts, learnerState })
  const { instances, usedGenerationFallback } = await buildComponentInstances({
    componentTypes,
    targetConcepts,
    learnerState,
    goal,
  })

  const estimatedMinutes = instances.reduce((sum, instance) => {
    return sum + (COMPONENT_ESTIMATED_MINUTES[instance.componentType] || 3)
  }, 0)

  const saved = await persistMission({
    supabase,
    mission: {
      user_id: userId,
      goal_id: goalId,
      dayNumber,
      conceptsTargeted: targetConcepts.map((concept) => concept.id),
      components: instances,
      estimatedMinutes,
      proofRequired: false,
      status: 'pending',
      generationStatus: 'ok',
      generationFailureReason: null,
    },
  })

  await trackMissionServer({
    supabase,
    eventName: EVENTS.MISSION_ASSEMBLED,
    userId,
    goalId,
    missionId: saved.id,
    properties: {
      mission_id: saved.id,
      goal_id: goalId,
      learning_mode: goal.primaryMode,
      concepts_targeted: saved.conceptsTargeted,
      component_count: saved.components.length,
      estimated_minutes: saved.estimatedMinutes,
      fallback: usedGenerationFallback,
      adaptive_state: adaptivePlan.state,
      adaptive_reason: adaptivePlan.reason,
      adaptive_adjustments: adaptivePlan.adjustments,
    },
  })

  await trackAdaptiveDecision({
    supabase,
    userId,
    goalId,
    missionId: saved.id,
    decision: {
      loop: 'cross_day',
      action: adaptivePlan.adjustments.length ? 'adjust_recipe' : 'use_recipe',
      state: adaptivePlan.state,
      reason: adaptivePlan.reason,
      score: adaptivePlan.score,
      conceptIds: saved.conceptsTargeted,
    },
    properties: {
      day_number: dayNumber,
      component_types: componentTypes,
      adjustments: adaptivePlan.adjustments,
    },
  })

  return saved
}
