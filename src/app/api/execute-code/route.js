import { getSupabaseServerClient } from '@/lib/supabaseServer'
import { executeProjectCode } from '@/lib/projectRuntime'
import {
  STEP_VERIFICATION_STATES,
  buildStepStatus,
  deriveCompletedSteps,
  deriveVerificationStatus,
  detectSuspiciousSignals,
  ensureProjectProgress,
  getStepVerification,
  mergeStepVerification,
  normalizeExecutionLanguage,
  normalizeProjectStep,
} from '@/lib/projectVerification'

export const runtime = 'nodejs'

function extractAccessToken(request) {
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization')
  if (!authHeader) return null
  if (!authHeader.toLowerCase().startsWith('bearer ')) return null
  return authHeader.slice(7).trim() || null
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { projectId, stepId, code, timeSpentSec = 0, pasteCount = 0 } = body || {}

    if (!projectId || !stepId) return Response.json({ error: 'Missing projectId or stepId' }, { status: 400 })
    if (!code?.trim()) return Response.json({ error: 'No code provided' }, { status: 400 })

    const accessToken = extractAccessToken(request) || body?.accessToken || null
    const supabase = getSupabaseServerClient({ accessToken })

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 })

    const { data: project, error: fetchErr } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single()

    if (fetchErr || !project) return Response.json({ error: 'Project not found' }, { status: 404 })

    const rawStep = (project.steps || []).find((entry) => entry.id === stepId)
    if (!rawStep) return Response.json({ error: 'Step not found' }, { status: 404 })
    const step = normalizeProjectStep(rawStep, project)
    if (!step.requires_code) return Response.json({ error: 'This step does not require code execution' }, { status: 400 })

    const progress = ensureProjectProgress(project.progress)
    const previousVerification = getStepVerification(progress, stepId)
    const language = normalizeExecutionLanguage(project.starter_language || 'python')
    const execution = await executeProjectCode({ code, language })

    if (execution.passed && step.expected_output && !String(execution.stdout || '').trim()) {
      execution.passed = false
      execution.crashed = true
      execution.stderr = (execution.stderr ? `${execution.stderr}\n` : '') + 'Expected visible output, but nothing was printed.'
    }

    const nextVerification = {
      ...previousVerification,
      execution_result: {
        ...execution,
        language,
        executedAt: new Date().toISOString(),
      },
      run_count: (previousVerification.run_count || 0) + 1,
      retry_count: execution.passed ? previousVerification.retry_count || 0 : (previousVerification.retry_count || 0) + 1,
      time_spent_sec: Math.max(previousVerification.time_spent_sec || 0, Number(timeSpentSec) || 0),
      paste_count: Math.max(previousVerification.paste_count || 0, Number(pasteCount) || 0),
    }
    nextVerification.suspicious_flags = detectSuspiciousSignals(nextVerification)
    nextVerification.status = execution.passed ? STEP_VERIFICATION_STATES.RUNNING : STEP_VERIFICATION_STATES.FAILED
    nextVerification.status = buildStepStatus(step, nextVerification)

    const nextProgress = ensureProjectProgress({
      ...progress,
      started_at: progress.started_at || new Date().toISOString(),
      code_submissions: {
        ...(progress.code_submissions || {}),
        [stepId]: {
          code: code.slice(0, 12000),
          submittedAt: new Date().toISOString(),
          attempts: ((progress.code_submissions || {})[stepId]?.attempts || 0) + 1,
          paste_count: nextVerification.paste_count,
          time_spent_sec: nextVerification.time_spent_sec,
          execution_result: nextVerification.execution_result,
        },
      },
      step_verification: mergeStepVerification(progress, stepId, nextVerification),
    })

    nextProgress.steps_completed = deriveCompletedSteps(project.steps || [], nextProgress)
    nextProgress.verification_status = deriveVerificationStatus(project.steps || [], nextProgress)

    await supabase
      .from('projects')
      .update({ progress: nextProgress })
      .eq('id', projectId)

    return Response.json({
      passed: execution.passed,
      execution,
      stepStatus: nextVerification.status,
      suspiciousFlags: nextVerification.suspicious_flags,
    })
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}
