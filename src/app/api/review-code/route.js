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

function buildReviewPrompt(project, step, code, verification) {
  return `You are reviewing a learner's code for a verified project step.

PROJECT: ${project.title}
PROJECT DESCRIPTION: ${project.description}
STEP: ${step.title}
STEP DESCRIPTION: ${step.description}
REQUIRED OUTPUT: ${step.required_output || step.expected_output}
VERIFICATION FOCUS: ${step.verification_focus || 'The code should satisfy the step intent.'}
EXECUTION OUTPUT:
${verification?.execution_result?.stdout || '(no stdout)'}

CODE:
\`\`\`${project.starter_language || 'python'}
${code}
\`\`\`

Return ONLY valid JSON:
{
  "passed": true,
  "score": 84,
  "authenticity_score": 78,
  "feedback": "2-3 sentence review of correctness and fit",
  "strengths": ["Specific thing done well"],
  "risks": ["Specific issue or weakness"],
  "suspicious_signals": ["Potential authenticity concern if any"]
}

RULES:
- Be strict about step intent
- Fail if the code is irrelevant, superficial, or does not match the step
- authenticity_score should reflect how likely this looks like genuine learner work
- If it appears copied, mismatched, or too generic, lower authenticity_score
- Keep feedback concrete and specific to this step`
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { projectId, stepId } = body || {}
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
    if (!step.requires_code) return Response.json({ error: 'This step does not require code review' }, { status: 400 })

    const progress = ensureProjectProgress(project.progress)
    const verification = getStepVerification(progress, stepId)
    const submission = progress.code_submissions?.[stepId]
    if (!submission?.code) return Response.json({ error: 'No code submission found' }, { status: 400 })
    if (!verification.execution_result?.passed) return Response.json({ error: 'Code must execute successfully before review' }, { status: 400 })
    if (!verification.validation_result?.passed) return Response.json({ error: 'Output validation must pass before code review' }, { status: 400 })

    const prompt = buildReviewPrompt(project, step, submission.code.slice(0, 12000), verification)
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.25,
        max_tokens: 900,
      }),
    })

    const data = await response.json()
    const raw = data.choices?.[0]?.message?.content?.trim() || ''
    const clean = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
    const review = JSON.parse(clean)
    review.reviewedAt = new Date().toISOString()
    review.passed = Boolean(review.passed) && Number(review.score || 0) >= 60 && Number(review.authenticity_score || 0) >= 55

    const nextVerification = {
      ...verification,
      ai_review: review,
      suspicious_flags: [
        ...(verification.suspicious_flags || []),
        ...(Array.isArray(review.suspicious_signals) ? review.suspicious_signals : []),
      ],
    }
    nextVerification.status = buildStepStatus(step, nextVerification)

    const nextProgress = ensureProjectProgress({
      ...progress,
      step_verification: mergeStepVerification(progress, stepId, nextVerification),
    })
    nextProgress.steps_completed = deriveCompletedSteps(project.steps || [], nextProgress)
    nextProgress.verification_status = deriveVerificationStatus(project.steps || [], nextProgress)

    await supabase
      .from('projects')
      .update({ progress: nextProgress })
      .eq('id', projectId)

    return Response.json({
      ...review,
      stepStatus: nextVerification.status,
    })
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}
