import { getSupabaseServerClient } from '@/lib/supabaseServer'
import {
  buildStepStatus,
  deriveCompletedSteps,
  deriveVerificationStatus,
  ensureProjectProgress,
  getStepVerification,
  isStepVerified,
  mergeStepVerification,
  normalizeProjectStep,
} from '@/lib/projectVerification'

function extractAccessToken(request) {
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization')
  if (!authHeader) return null
  if (!authHeader.toLowerCase().startsWith('bearer ')) return null
  return authHeader.slice(7).trim() || null
}

function buildDefensePrompt(project, step, defenseResponse, verification) {
  const executionOutput = verification?.execution_result?.stdout || ''
  const validationFeedback = verification?.validation_result?.feedback || ''
  return `Evaluate whether this learner actually understands their verified project step.

PROJECT: ${project.title}
STEP: ${step.title}
STEP DESCRIPTION: ${step.description}
DEFENSE QUESTION: ${step.defense_prompt}
EXECUTION OUTPUT:
${executionOutput || '(none)'}
VALIDATION FEEDBACK:
${validationFeedback || '(none)'}
LEARNER DEFENSE RESPONSE:
${defenseResponse}

Return ONLY valid JSON:
{
  "passed": true,
  "score": 81,
  "feedback": "2-3 sentence explanation of whether the learner demonstrated real understanding",
  "strengths": ["Specific thing they explained well"],
  "gaps": ["Specific weakness if any"]
}

RULES:
- Be strict about understanding
- Fail if the answer is vague, generic, or does not explain the actual work
- Pass if the learner clearly demonstrates how the solution works and why it satisfies the step
- Keep feedback concrete and tied to the step`
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { projectId, stepId, defenseResponse } = body || {}
    if (!projectId || !stepId) return Response.json({ error: 'Missing projectId or stepId' }, { status: 400 })
    if (!defenseResponse?.trim()) return Response.json({ error: 'Missing defense response' }, { status: 400 })

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
    const verification = getStepVerification(progress, stepId)

    if (!verification.validation_result?.passed) {
      return Response.json({ error: 'Validate the step output before submitting a defense' }, { status: 400 })
    }
    if (step.requires_code && !verification.ai_review?.passed) {
      return Response.json({ error: 'Code review must pass before defense evaluation' }, { status: 400 })
    }

    const prompt = buildDefensePrompt(project, step, defenseResponse.trim().slice(0, 4000), verification)
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        max_tokens: 700,
      }),
    })

    const data = await response.json()
    const raw = data.choices?.[0]?.message?.content?.trim() || ''
    const clean = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
    const defense = JSON.parse(clean)
    defense.passed = Boolean(defense.passed) && Number(defense.score || 0) >= 60
    defense.evaluatedAt = new Date().toISOString()

    const nextVerification = {
      ...verification,
      defense_response: defenseResponse.trim().slice(0, 4000),
      defense_score: defense.score,
      defense_result: defense,
    }
    nextVerification.status = buildStepStatus(step, nextVerification)
    if (isStepVerified(step, nextVerification)) {
      nextVerification.verified_at = new Date().toISOString()
    }

    const nextProgress = ensureProjectProgress({
      ...progress,
      step_verification: mergeStepVerification(progress, stepId, nextVerification),
    })
    nextProgress.steps_completed = deriveCompletedSteps(project.steps || [], nextProgress)
    nextProgress.verification_status = deriveVerificationStatus(project.steps || [], nextProgress)
    if (nextProgress.verification_status === 'verified') {
      nextProgress.completed_at = nextProgress.completed_at || new Date().toISOString()
      nextProgress.deliverables_completed = (project.deliverables || []).map((_, index) => index)
    }

    await supabase
      .from('projects')
      .update({ progress: nextProgress })
      .eq('id', projectId)

    return Response.json({
      ...defense,
      stepStatus: nextVerification.status,
      verified: isStepVerified(step, nextVerification),
    })
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}
