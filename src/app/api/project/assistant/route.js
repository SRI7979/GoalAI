import { getSupabaseServerClient } from '@/lib/supabaseServer'

function extractAccessToken(request) {
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization')
  if (!authHeader) return null
  if (!authHeader.toLowerCase().startsWith('bearer ')) return null
  return authHeader.slice(7).trim() || null
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { projectId, stepId, mode, userMessage } = body

    if (!projectId || !stepId) {
      return Response.json({ error: 'Missing projectId or stepId' }, { status: 400 })
    }

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

    if (fetchErr || !project) {
      return Response.json({ error: 'Project not found' }, { status: 404 })
    }

    const step = (project.steps || []).find(s => s.id === stepId)
    if (!step) {
      return Response.json({ error: 'Step not found' }, { status: 404 })
    }

    const completedSteps = project.progress?.steps_completed || []
    const stepIndex = (project.steps || []).findIndex(s => s.id === stepId)
    const previousSteps = (project.steps || []).slice(0, stepIndex)
      .map((s, i) => `${i + 1}. ${s.title}: ${s.description}`)
      .join('\n')

    const modeInstructions = {
      explain: `The learner needs help understanding this step. Explain the concepts clearly with examples. Break down any technical terms. Use analogies if helpful. Keep it encouraging.`,
      hint: `Give the learner a helpful nudge without giving away the full answer. Ask guiding questions. Point them in the right direction. Provide a partial example if needed.`,
      debug: `The learner is stuck or encountering an error on this step. Help them debug by asking what they've tried, suggesting common pitfalls, and providing specific troubleshooting steps.`,
      review: `Review what the learner has done for this step. Provide specific feedback on their approach, suggest improvements, and highlight what they did well.`,
      challenge: `The learner found this step easy. Give them a bonus challenge or extension task that builds on this step. Make it engaging and slightly harder.`,
    }

    const systemPrompt = `You are PathAI's project assistant — a friendly, encouraging coding mentor helping a learner work through a hands-on project.

PROJECT: ${project.title}
DESCRIPTION: ${project.description}
CONCEPTS: ${(project.concepts_tested || []).join(', ')}
DIFFICULTY: ${project.difficulty}

CURRENT STEP (${stepIndex + 1}/${(project.steps || []).length}): ${step.title}
STEP DESCRIPTION: ${step.description}
STEP HINT: ${step.hint || 'None provided'}
STEP CONCEPTS: ${(step.concepts || []).join(', ')}

${previousSteps ? `PREVIOUSLY COMPLETED STEPS:\n${previousSteps}` : 'This is the first step.'}

COMPLETED SO FAR: ${completedSteps.length}/${(project.steps || []).length} steps

${project.starter_code ? `STARTER CODE (${project.starter_language || 'code'}):\n\`\`\`\n${project.starter_code.slice(0, 1000)}\n\`\`\`` : ''}

MODE: ${mode || 'explain'}
${modeInstructions[mode] || modeInstructions.explain}

RULES:
- Keep responses concise (2-4 short paragraphs max)
- Use code snippets when helpful, but don't give away the full solution
- Be encouraging and specific — reference THIS project and step
- If they ask something unrelated, gently redirect to the project
- Use markdown formatting for readability
- For "hint" mode, use progressive disclosure — start vague, get specific only if asked again`

    const messages = [
      { role: 'system', content: systemPrompt },
    ]

    if (userMessage) {
      messages.push({ role: 'user', content: userMessage })
    } else {
      const defaultMessages = {
        explain: `Can you explain what I need to do in this step? "${step.title}"`,
        hint: `I'm stuck on this step. Can you give me a hint? "${step.title}"`,
        debug: `I'm running into problems with this step. Can you help me debug? "${step.title}"`,
        review: `Can you review my approach for this step? "${step.title}"`,
        challenge: `This step was easy! Give me something harder related to "${step.title}"`,
      }
      messages.push({ role: 'user', content: defaultMessages[mode] || defaultMessages.explain })
    }

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        temperature: 0.55,
        max_tokens: 800,
      }),
    })

    const data = await res.json()
    const reply = data.choices?.[0]?.message?.content?.trim() || 'Sorry, I couldn\'t generate a response. Please try again.'

    return Response.json({ reply, mode: mode || 'explain', stepId })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
