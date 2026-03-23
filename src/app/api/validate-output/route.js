import { getOpenAIModel } from '@/lib/openaiModels'
import { getSupabaseServerClient } from '@/lib/supabaseServer'
import {
  buildStepStatus,
  deriveCompletedSteps,
  deriveVerificationStatus,
  ensureProjectProgress,
  getStepVerification,
  mergeStepVerification,
  normalizeProjectStep,
} from '@/lib/projectVerification'

function extractAccessToken(request) {
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization')
  if (!authHeader) return null
  if (!authHeader.toLowerCase().startsWith('bearer ')) return null
  return authHeader.slice(7).trim() || null
}

function runCodingChecks(step, verification) {
  const stdout = String(verification?.execution_result?.stdout || '')
  const stderr = String(verification?.execution_result?.stderr || '')
  const checks = (Array.isArray(step.test_cases) && step.test_cases.length > 0 ? step.test_cases : [
    { id: `${step.id}-stdout`, label: 'Expected output', mode: 'stdout_nonempty', expected: step.expected_output },
  ]).map((testCase, index) => {
    const mode = testCase.mode || 'stdout_nonempty'
    let passed = false
    if (mode === 'stdout_nonempty') passed = stdout.trim().length > 0
    else if (mode === 'stdout_includes') passed = stdout.toLowerCase().includes(String(testCase.expected || '').toLowerCase())
    else if (mode === 'stdout_equals') passed = stdout.trim() === String(testCase.expected || '').trim()
    else if (mode === 'stderr_empty') passed = stderr.trim().length === 0
    else passed = stdout.trim().length > 0

    return {
      id: testCase.id || `check-${index + 1}`,
      label: testCase.label || testCase.expected || `Check ${index + 1}`,
      mode,
      expected: testCase.expected || '',
      passed,
      message: passed
        ? `Passed: ${testCase.label || testCase.expected || 'output matched'}`
        : `Expected ${testCase.expected || 'a visible result'} but did not find it in the output.`,
    }
  })

  const passedCount = checks.filter((check) => check.passed).length
  const score = checks.length > 0 ? Math.round((passedCount / checks.length) * 100) : 0
  return {
    passed: score >= 60,
    score,
    checks,
    feedback: score >= 60
      ? 'Execution output matched the expected verification checks.'
      : 'The output did not satisfy the required checks for this step.',
  }
}

function buildArtifactValidationPrompt(project, step, artifact) {
  const skillType = project.skill_type || 'general'
  return `Evaluate whether a learner's submitted artifact satisfies this project step.

PROJECT: ${project.title}
SKILL TYPE: ${skillType}
STEP: ${step.title}
STEP DESCRIPTION: ${step.description}
REQUIRED OUTPUT: ${step.required_output || step.expected_output}
VERIFICATION FOCUS: ${step.verification_focus || 'Check whether the work satisfies the step.'}
LEARNER ARTIFACT:
${artifact}

Return ONLY valid JSON:
{
  "passed": true,
  "score": 82,
  "feedback": "2-3 sentence explanation of whether the artifact satisfies the step",
  "checks": [
    { "label": "Requirement label", "passed": true, "message": "Short explanation" }
  ]
}

RULES:
- Be strict but fair
- Pass only if the artifact clearly satisfies the step
- If the work is shallow, vague, or unrelated, fail it
- Keep feedback concrete and specific to this submission`
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { projectId, stepId, artifact } = body || {}
    if (!projectId || !stepId) return Response.json({ error: 'Missing projectId or stepId' }, { status: 400 })

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
    const progress = ensureProjectProgress(project.progress)
    const previousVerification = getStepVerification(progress, stepId)

    let validationResult
    if (step.requires_code) {
      if (!previousVerification.execution_result) {
        return Response.json({ error: 'Run the code before validating output' }, { status: 400 })
      }
      validationResult = runCodingChecks(step, previousVerification)
    } else {
      const artifactText = String(artifact || '').trim()
      if (!artifactText) return Response.json({ error: 'No artifact provided' }, { status: 400 })

      const prompt = buildArtifactValidationPrompt(project, step, artifactText.slice(0, 4000))
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: getOpenAIModel('validateOutput'),
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
          max_tokens: 700,
        }),
      })

      const data = await response.json()
      const raw = data.choices?.[0]?.message?.content?.trim() || ''
      const clean = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
      validationResult = JSON.parse(clean)
    }

    validationResult.validatedAt = new Date().toISOString()

    const nextVerification = {
      ...previousVerification,
      validation_result: validationResult,
    }
    nextVerification.status = buildStepStatus(step, nextVerification)

    const nextProgress = ensureProjectProgress({
      ...progress,
      step_verification: mergeStepVerification(progress, stepId, nextVerification),
    })

    if (!step.requires_code) {
      nextProgress.response_submissions = {
        ...(progress.response_submissions || {}),
        [stepId]: {
          response: String(artifact || '').slice(0, 6000),
          score: validationResult.score,
          passed: validationResult.passed,
          submittedAt: new Date().toISOString(),
          attempts: ((progress.response_submissions || {})[stepId]?.attempts || 0) + 1,
        },
      }
    }

    nextProgress.steps_completed = deriveCompletedSteps(project.steps || [], nextProgress)
    nextProgress.verification_status = deriveVerificationStatus(project.steps || [], nextProgress)

    await supabase
      .from('projects')
      .update({ progress: nextProgress })
      .eq('id', projectId)

    return Response.json({
      ...validationResult,
      stepStatus: nextVerification.status,
    })
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}
