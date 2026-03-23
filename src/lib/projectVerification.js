export const STEP_VERIFICATION_STATES = {
  NOT_STARTED: 'NOT_STARTED',
  RUNNING: 'RUNNING',
  FAILED: 'FAILED',
  PASSED: 'PASSED',
}

export function normalizeExecutionLanguage(language) {
  const normalized = String(language || 'python').trim().toLowerCase()
  if (['python', 'py'].includes(normalized)) return 'python'
  if (['javascript', 'js', 'node', 'nodejs', 'react', 'jsx', 'typescript', 'ts'].includes(normalized)) return 'javascript'
  return normalized
}

export function buildDefaultDefensePrompt(step = {}, project = {}) {
  const skillType = project.skill_type || 'general'
  const conceptText = Array.isArray(step.concepts) && step.concepts.length > 0
    ? step.concepts.join(', ')
    : (project.concepts_tested || []).slice(0, 3).join(', ')

  if (step.requires_code) {
    return `Explain how your solution for "${step.title}" works, what output it produces, and why you chose this approach.${conceptText ? ` Reference these concepts: ${conceptText}.` : ''}`
  }
  if (skillType === 'language') {
    return `Explain why your response fits the scenario in "${step.title}" and which grammar or vocabulary choices matter most.${conceptText ? ` Mention: ${conceptText}.` : ''}`
  }
  if (skillType === 'math' || skillType === 'science') {
    return `Explain your method for "${step.title}" step by step and why it is the correct approach.${conceptText ? ` Mention these concepts: ${conceptText}.` : ''}`
  }
  if (skillType === 'design') {
    return `Explain the key design decisions behind "${step.title}", including hierarchy, usability, and tradeoffs.${conceptText ? ` Reference: ${conceptText}.` : ''}`
  }
  if (skillType === 'hardware') {
    return `Explain what your system should do in "${step.title}", how you verified it, and what would break if the setup were wrong.${conceptText ? ` Reference: ${conceptText}.` : ''}`
  }
  return `Explain how you completed "${step.title}", what you produced, and why it satisfies the step requirements.${conceptText ? ` Reference: ${conceptText}.` : ''}`
}

function inferExpectedOutput(step = {}) {
  if (step.expected_output) return step.expected_output
  if (step.response_prompt) return `A submission that directly answers: ${step.response_prompt}`
  if (step.required_output) return step.required_output
  if (step.requires_code) return `Visible program output that proves "${step.title}" works.`
  if (step.requires_practice) return `Checklist completion plus a concrete reflection describing what improved.`
  return `Concrete evidence that the learner completed "${step.title}".`
}

function inferTestCases(step = {}) {
  if (Array.isArray(step.test_cases) && step.test_cases.length > 0) return step.test_cases
  if (step.requires_code) {
    return [
      {
        id: `${step.id || 'step'}-stdout`,
        label: 'Program output',
        mode: 'stdout_nonempty',
        expected: inferExpectedOutput(step),
      },
    ]
  }
  return []
}

export function normalizeProjectStep(step = {}, project = {}) {
  const normalized = { ...step }
  if (!normalized.requires_code && !normalized.requires_response && !normalized.requires_practice) {
    normalized.requires_response = true
  }
  normalized.verification_type = normalized.verification_type
    || (normalized.requires_code ? 'code'
      : normalized.requires_response ? 'artifact'
      : normalized.requires_practice ? 'practice'
      : 'general')
  normalized.expected_output = inferExpectedOutput(normalized)
  normalized.test_cases = inferTestCases(normalized)
  normalized.defense_prompt = normalized.defense_prompt || buildDefaultDefensePrompt(normalized, project)
  normalized.required_output = normalized.required_output || normalized.expected_output
  normalized.verification_focus = normalized.verification_focus || 'This step must be proven through output plus explanation.'
  return normalized
}

export function normalizeProjectSteps(steps = [], project = {}) {
  return (Array.isArray(steps) ? steps : []).map((step) => normalizeProjectStep(step, project))
}

export function ensureProjectProgress(progress = {}) {
  return {
    steps_completed: [],
    deliverables_completed: [],
    notes: '',
    started_at: null,
    completed_at: null,
    code_submissions: {},
    response_submissions: {},
    checkpoint_results: {},
    time_tracking: {},
    hints_used: 0,
    ai_usage: {},
    step_verification: {},
    verification_status: 'in_progress',
    ...progress,
    step_verification: progress?.step_verification || {},
  }
}

export function getStepVerification(progress = {}, stepId) {
  const stepVerification = progress?.step_verification?.[stepId] || {}
  return {
    status: stepVerification.status || STEP_VERIFICATION_STATES.NOT_STARTED,
    execution_result: stepVerification.execution_result || null,
    validation_result: stepVerification.validation_result || null,
    ai_review: stepVerification.ai_review || null,
    defense_response: stepVerification.defense_response || '',
    defense_score: stepVerification.defense_score ?? null,
    defense_result: stepVerification.defense_result || null,
    run_count: stepVerification.run_count || 0,
    retry_count: stepVerification.retry_count || 0,
    time_spent_sec: stepVerification.time_spent_sec || 0,
    paste_count: stepVerification.paste_count || 0,
    suspicious_flags: Array.isArray(stepVerification.suspicious_flags) ? stepVerification.suspicious_flags : [],
    verified_at: stepVerification.verified_at || null,
  }
}

export function mergeStepVerification(progress = {}, stepId, patch = {}) {
  const baseProgress = ensureProjectProgress(progress)
  const previous = getStepVerification(baseProgress, stepId)
  return {
    ...baseProgress.step_verification,
    [stepId]: {
      ...previous,
      ...patch,
      suspicious_flags: Array.isArray(patch.suspicious_flags)
        ? patch.suspicious_flags
        : previous.suspicious_flags,
    },
  }
}

export function detectSuspiciousSignals(verification = {}) {
  const flags = new Set(Array.isArray(verification.suspicious_flags) ? verification.suspicious_flags : [])
  if ((verification.time_spent_sec || 0) > 0 && (verification.time_spent_sec || 0) < 20 && (verification.run_count || 0) <= 1) {
    flags.add('instant solution')
  }
  if ((verification.paste_count || 0) >= 2) {
    flags.add('heavy paste usage')
  }
  if ((verification.execution_result?.passed || false) && (verification.run_count || 0) === 1 && (verification.time_spent_sec || 0) < 30) {
    flags.add('fast perfect execution')
  }
  return [...flags]
}

export function isStepVerified(step = {}, verification = {}) {
  const requiresExecution = Boolean(step?.requires_code)
  const executionPass = !requiresExecution || Boolean(verification?.execution_result?.passed)
  const validationPass = Boolean(verification?.validation_result?.passed)
  const reviewPass = !requiresExecution || (Boolean(verification?.ai_review?.passed) && Number(verification?.ai_review?.authenticity_score ?? 0) >= 55)
  const defensePass = Boolean(verification?.defense_result?.passed)
  return executionPass && validationPass && reviewPass && defensePass
}

export function buildStepStatus(step = {}, verification = {}) {
  if (isStepVerified(step, verification)) return STEP_VERIFICATION_STATES.PASSED
  const hasFailedLayer = (
    verification?.execution_result?.passed === false
    || verification?.validation_result?.passed === false
    || verification?.ai_review?.passed === false
    || verification?.defense_result?.passed === false
  )
  if (hasFailedLayer) return STEP_VERIFICATION_STATES.FAILED
  if (
    verification?.run_count > 0
    || verification?.execution_result
    || verification?.validation_result
    || verification?.defense_response
  ) {
    return STEP_VERIFICATION_STATES.RUNNING
  }
  return STEP_VERIFICATION_STATES.NOT_STARTED
}

export function deriveCompletedSteps(steps = [], progress = {}) {
  return normalizeProjectSteps(steps, {}).filter((step) => {
    const verification = getStepVerification(progress, step.id)
    return isStepVerified(step, verification)
  }).map((step) => step.id)
}

export function deriveVerificationStatus(steps = [], progress = {}) {
  const normalizedSteps = normalizeProjectSteps(steps, {})
  if (normalizedSteps.length === 0) return 'not_started'
  const passedCount = normalizedSteps.filter((step) => isStepVerified(step, getStepVerification(progress, step.id))).length
  if (passedCount === normalizedSteps.length) return 'verified'
  if (passedCount > 0) return 'in_progress'
  return 'not_started'
}
