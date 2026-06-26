import 'server-only'
import { EVENTS } from '@/lib/analytics'
import { getSupabaseServerClient } from '@/lib/supabaseServer'

const QUALITY_EVENT_NAMES = new Set([
  EVENTS.COMPONENT_COMPLETED,
  EVENTS.COMPONENT_ABANDONED,
  EVENTS.COMPONENT_CONFUSION_REPORTED,
  EVENTS.DYNAMIC_DIAGRAM_FAILED,
  EVENTS.LEARNER_STATE_WRITE_FAILED,
  EVENTS.DIAGNOSTIC_FAILED,
  EVENTS.TASK_COMPLETED,
  EVENTS.MISSION_COMPLETED,
  EVENTS.PROOF_EVALUATED,
])

const PROMPT_BY_COMPONENT = {
  concept_explainer: ['concept_explainer', 'src/lib/prompts/components/conceptExplainer_v1.js'],
  multiple_choice_quiz: ['multiple_choice_quiz', 'src/lib/prompts/components/multipleChoiceQuiz_v1.js'],
  flashcard_drill: ['flashcard_drill', 'src/lib/prompts/components/flashcardDrill_v1.js'],
  worked_example: ['worked_example', 'src/lib/prompts/components/workedExample_v1.js'],
  free_response: ['free_response', 'src/lib/prompts/components/freeResponse_v1.js'],
  code_predictor: ['code_predictor', 'src/lib/prompts/components/codePredictor_v1.js'],
  dynamic_diagram: ['dynamic_diagram', 'src/lib/prompts/components/dynamicDiagram_v1.js'],
  code_sandbox: ['code_sandbox', 'src/lib/prompts/components/codeSandbox_v1.js'],
  code_debugger: ['code_debugger', 'src/lib/prompts/components/codeDebugger_v1.js'],
  audio_listen: ['audio_listen', 'src/lib/prompts/components/audioListen_v1.js'],
  audio_speak: ['audio_speak', 'src/lib/prompts/components/audioSpeak_v1.js'],
  image_identify: ['image_identify', 'src/lib/prompts/components/imageIdentify_v1.js'],
  drag_match: ['drag_match', 'src/lib/prompts/components/dragMatch_v1.js'],
  order_steps: ['order_steps', 'src/lib/prompts/components/orderSteps_v1.js'],
  timed_problem_set: ['timed_problem_set', 'src/lib/prompts/components/timedProblemSet_v1.js'],
  roleplay_scenario: ['roleplay_scenario', 'src/lib/prompts/components/roleplayScenario_v1.js'],
  case_study_analyze: ['case_study_analyze', 'src/lib/prompts/components/caseStudyAnalyze_v1.js'],
  reflection_prompt: ['reflection_prompt', 'src/lib/prompts/components/reflectionPrompt_v1.js'],
  do_in_real_world: ['do_in_real_world', 'src/lib/prompts/components/doInRealWorld_v1.js'],
  mock_exam: ['mock_exam', 'src/lib/prompts/components/mockExam_v1.js'],
  concept_map_build: ['concept_map_build', 'src/lib/prompts/components/conceptMapBuild_v1.js'],
}

function asNumber(value, fallback = 0) {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

function asArray(value) {
  return Array.isArray(value) ? value.map(String).filter(Boolean) : []
}

function getPromptInfo(componentType, eventName) {
  if (componentType && PROMPT_BY_COMPONENT[componentType]) {
    const [promptKey, promptFile] = PROMPT_BY_COMPONENT[componentType]
    return { promptKey, promptFile }
  }
  if (eventName === EVENTS.DYNAMIC_DIAGRAM_FAILED) {
    return {
      promptKey: 'dynamic_diagram',
      promptFile: 'src/lib/prompts/components/dynamicDiagram_v1.js',
    }
  }
  if (eventName === EVENTS.DIAGNOSTIC_FAILED) {
    return {
      promptKey: 'diagnostic_calibration',
      promptFile: 'src/lib/prompts/diagnosticCalibration_v1.js',
    }
  }
  return { promptKey: null, promptFile: null }
}

function baseIssue(row = {}, properties = {}) {
  const componentType = properties.component_type || properties.componentType || null
  const prompt = getPromptInfo(componentType, row.event_name)
  return {
    source_event_id: row.id || null,
    event_name: row.event_name || null,
    user_id: row.user_id || null,
    goal_id: row.goal_id || null,
    mission_id: row.mission_id || properties.mission_id || properties.missionId || null,
    component_type: componentType,
    concept_ids: asArray(properties.concept_ids || properties.conceptIds),
    evidence: {
      event_name: row.event_name,
      properties,
      client_timestamp: row.client_timestamp,
      created_at: row.created_at,
    },
    prompt_key: prompt.promptKey,
    prompt_file: prompt.promptFile,
  }
}

function buildSuggestedFeedback(issue = {}) {
  const component = issue.component_type ? ` for ${issue.component_type}` : ''
  const concepts = issue.concept_ids?.length ? ` Concepts: ${issue.concept_ids.join(', ')}.` : ''
  const evidence = issue.evidence?.properties || {}
  if (issue.issue_type === 'incorrect') {
    return `Reduce ambiguity and add a clearer worked example before asking${component}. The learner answered incorrectly.${concepts}`
  }
  if (issue.issue_type === 'low_confidence') {
    return `Add a simpler explanation, confidence-building recap, or easier first question${component}; learner confidence was ${evidence.confidence}.${concepts}`
  }
  if (issue.issue_type === 'retry') {
    return `The component likely needs better scaffolding${component}; learner needed ${evidence.attempts} attempts.${concepts}`
  }
  if (issue.issue_type === 'dropoff') {
    return `Inspect this component for friction or unclear instructions${component}; learner left before completing it after ${evidence.total_ms || evidence.totalMs || 'unknown'}ms.${concepts}`
  }
  if (issue.issue_type === 'confusion') {
    return `Learner explicitly reported confusion${component}. Tighten the prompt around prerequisite checks, plain-language explanation, and one concrete example.${concepts}`
  }
  if (issue.issue_type === 'generation_failed') {
    return `Generation/rendering failed. Add prompt constraints or validation feedback so the model produces a recoverable output.`
  }
  return `Review this issue and update the relevant prompt or recipe so similar learners get a clearer next attempt.${concepts}`
}

export function deriveQualityIssueFromAnalyticsEvent(row = {}) {
  const eventName = row.event_name
  if (!QUALITY_EVENT_NAMES.has(eventName)) return null

  const properties = row.properties && typeof row.properties === 'object' ? row.properties : {}
  const issue = baseIssue(row, properties)

  if (eventName === EVENTS.COMPONENT_CONFUSION_REPORTED) {
    return {
      ...issue,
      issue_type: 'confusion',
      severity: 4,
      title: `${issue.component_type || 'Component'} confused the learner`,
    }
  }

  if (eventName === EVENTS.COMPONENT_ABANDONED) {
    return {
      ...issue,
      issue_type: 'dropoff',
      severity: 4,
      title: `${issue.component_type || 'Component'} was abandoned before completion`,
    }
  }

  if (eventName === EVENTS.COMPONENT_COMPLETED) {
    const confidence = asNumber(properties.confidence, 1)
    const attempts = asNumber(properties.attempts, 1)
    const hintsUsed = asNumber(properties.hints_used ?? properties.hintsUsed, 0)
    const correct = properties.correct

    if (correct === false) {
      return {
        ...issue,
        issue_type: 'incorrect',
        severity: attempts >= 2 ? 4 : 3,
        title: `${issue.component_type || 'Component'} produced an incorrect answer`,
      }
    }
    if (confidence > 0 && confidence < 0.42) {
      return {
        ...issue,
        issue_type: 'low_confidence',
        severity: 3,
        title: `${issue.component_type || 'Component'} ended with low confidence`,
      }
    }
    if (attempts >= 3 || hintsUsed >= 3) {
      return {
        ...issue,
        issue_type: 'retry',
        severity: 3,
        title: `${issue.component_type || 'Component'} needed heavy scaffolding`,
      }
    }
  }

  if (eventName === EVENTS.TASK_COMPLETED) {
    const retryCount = asNumber(properties.retry_count ?? properties.retryCount, 0)
    const hintsUsed = asNumber(properties.hints_used ?? properties.hintsUsed, 0)
    if (retryCount >= 2 || hintsUsed >= 3) {
      return {
        ...issue,
        issue_type: 'retry',
        severity: retryCount >= 4 ? 4 : 3,
        title: 'Legacy task needed repeated attempts or hints',
      }
    }
  }

  if (eventName === EVENTS.MISSION_COMPLETED) {
    const correctCount = asNumber(properties.correct_count ?? properties.correctCount, 0)
    const totalCount = asNumber(properties.total_count ?? properties.totalCount, 0)
    const skipped = asNumber(properties.components_skipped ?? properties.componentsSkipped, 0)
    const score = totalCount > 0 ? correctCount / totalCount : 1
    if (skipped > 0 || score < 0.6) {
      return {
        ...issue,
        issue_type: 'mission_underperformed',
        severity: score < 0.4 || skipped >= 2 ? 5 : 4,
        title: 'Mission underperformed',
      }
    }
  }

  if (eventName === EVENTS.DYNAMIC_DIAGRAM_FAILED || eventName === EVENTS.DIAGNOSTIC_FAILED) {
    return {
      ...issue,
      issue_type: 'generation_failed',
      severity: 4,
      title: eventName === EVENTS.DYNAMIC_DIAGRAM_FAILED ? 'Dynamic diagram failed' : 'Diagnostic generation failed',
    }
  }

  if (eventName === EVENTS.LEARNER_STATE_WRITE_FAILED) {
    return {
      ...issue,
      issue_type: 'evidence_write_failed',
      severity: 5,
      title: 'Learner state evidence write failed',
    }
  }

  if (eventName === EVENTS.PROOF_EVALUATED && properties.passed === false) {
    return {
      ...issue,
      issue_type: 'proof_failed',
      severity: asNumber(properties.score, 0) < 50 ? 4 : 3,
      title: 'Proof submission did not pass',
    }
  }

  return null
}

export function prepareQualityIssue(issue = {}) {
  if (!issue?.issue_type || !issue?.title) return null
  const prepared = {
    ...issue,
    severity: Math.max(1, Math.min(5, Math.round(asNumber(issue.severity, 3)))),
    suggested_feedback: issue.suggested_feedback || buildSuggestedFeedback(issue),
  }
  return prepared
}

export async function recordQualityIssuesForAnalyticsRows({ supabase, rows = [] } = {}) {
  if (!supabase || !rows.length) return { inserted: 0 }
  const issues = rows
    .map(deriveQualityIssueFromAnalyticsEvent)
    .map(prepareQualityIssue)
    .filter(Boolean)

  if (!issues.length) return { inserted: 0 }

  const sourceIds = issues.map((issue) => issue.source_event_id).filter(Boolean)
  let existingSourceIds = new Set()
  if (sourceIds.length) {
    const { data, error } = await supabase
      .from('quality_issues')
      .select('source_event_id')
      .in('source_event_id', sourceIds)
    if (error) throw new Error(error.message)
    existingSourceIds = new Set((data || []).map((row) => row.source_event_id).filter(Boolean))
  }

  const freshIssues = issues.filter((issue) => (
    !issue.source_event_id || !existingSourceIds.has(issue.source_event_id)
  ))

  if (!freshIssues.length) return { inserted: 0 }

  const { error } = await supabase
    .from('quality_issues')
    .insert(freshIssues)

  if (error) throw new Error(error.message)
  return { inserted: freshIssues.length }
}

export async function syncRecentQualityIssues({ supabase = getSupabaseServerClient(), limit = 250 } = {}) {
  const { data, error } = await supabase
    .from('analytics_events')
    .select('*')
    .in('event_name', Array.from(QUALITY_EVENT_NAMES))
    .order('created_at', { ascending: false })
    .limit(Math.max(1, Math.min(1000, Number(limit) || 250)))

  if (error) throw new Error(error.message)
  return recordQualityIssuesForAnalyticsRows({ supabase, rows: data || [] })
}

export async function listQualityIssues({ supabase = getSupabaseServerClient(), status = 'open', limit = 50 } = {}) {
  let query = supabase
    .from('quality_issues')
    .select('*, prompt_feedback_items(id,status,created_at)')
    .order('severity', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(Math.max(1, Math.min(200, Number(limit) || 50)))

  if (status && status !== 'all') query = query.eq('status', status)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data || []
}

export function summarizeQualityIssues(issues = []) {
  const open = issues.filter((issue) => issue.status === 'open').length
  const highSeverity = issues.filter((issue) => Number(issue.severity) >= 4).length
  const byType = issues.reduce((acc, issue) => {
    acc[issue.issue_type] = (acc[issue.issue_type] || 0) + 1
    return acc
  }, {})
  return {
    total: issues.length,
    open,
    highSeverity,
    byType,
  }
}

export async function queuePromptFeedback({ supabase = getSupabaseServerClient(), issueId, feedback } = {}) {
  if (!issueId) throw new Error('Missing issueId')

  const { data: issue, error: issueError } = await supabase
    .from('quality_issues')
    .select('*')
    .eq('id', issueId)
    .maybeSingle()

  if (issueError) throw new Error(issueError.message)
  if (!issue) throw new Error('Quality issue not found')

  const finalFeedback = String(feedback || issue.suggested_feedback || '').trim()
  if (!finalFeedback) throw new Error('Missing feedback')

  const { data: item, error } = await supabase
    .from('prompt_feedback_items')
    .insert({
      quality_issue_id: issueId,
      prompt_key: issue.prompt_key,
      prompt_file: issue.prompt_file,
      feedback: finalFeedback,
      status: 'queued',
    })
    .select()
    .single()

  if (error) throw new Error(error.message)

  await supabase
    .from('quality_issues')
    .update({
      status: 'feedback_queued',
      updated_at: new Date().toISOString(),
    })
    .eq('id', issueId)

  return item
}

export async function updateQualityIssueStatus({ supabase = getSupabaseServerClient(), issueId, status } = {}) {
  if (!issueId) throw new Error('Missing issueId')
  if (!['open', 'feedback_queued', 'fixed', 'dismissed'].includes(status)) {
    throw new Error('Invalid status')
  }
  const resolvedAt = ['fixed', 'dismissed'].includes(status) ? new Date().toISOString() : null
  const { data, error } = await supabase
    .from('quality_issues')
    .update({
      status,
      resolved_at: resolvedAt,
      updated_at: new Date().toISOString(),
    })
    .eq('id', issueId)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}
