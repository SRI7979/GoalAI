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
    const { projectId, stepId, action, answer } = body

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

    if (fetchErr || !project) return Response.json({ error: 'Project not found' }, { status: 404 })

    const step = (project.steps || []).find(s => s.id === stepId)
    if (!step) return Response.json({ error: 'Step not found' }, { status: 404 })

    const skillType = project.skill_type || 'coding'
    const skillLabel = {
      coding: 'coding instructor',
      language: 'language teacher',
      math: 'math tutor',
      music: 'music coach',
      design: 'design mentor',
      business: 'business mentor',
      hardware: 'engineering instructor',
      writing: 'writing coach',
      science: 'science instructor',
    }[skillType] || 'instructor'

    // ACTION: generate — create checkpoint questions for this step
    if (action === 'generate') {
      const prompt = `You are a ${skillLabel}. A student just completed a step in their ${skillType} project.

PROJECT: ${project.title}
STEP JUST COMPLETED: ${step.title}
STEP DESCRIPTION: ${step.description}
CONCEPTS: ${(step.concepts || []).join(', ')}
SKILL TYPE: ${skillType}
${skillType === 'coding' ? `LANGUAGE: ${project.starter_language || 'general'}` : ''}

Generate 1-2 quick understanding checkpoint questions. These verify the student actually understands what they did — not just went through the motions.

Return ONLY valid JSON:
{
  "questions": [
    {
      "id": "q1",
      "question": "Clear, specific question about what they just learned/practiced",
      "type": "open",
      "expected_keywords": ["keyword1", "keyword2"],
      "explanation": "Brief explanation of the correct answer (shown after they respond)"
    }
  ]
}

RULES:
- Questions must be specific to THIS step, not generic
- Ask "why" and "what would happen if" questions — not trivia
- 1-2 questions max — keep it lightweight
- expected_keywords are concepts their answer should reference (for auto-grading)
- Make questions feel like a mentor checking in, not an exam
- Tailor the question style to ${skillType} (e.g., for language: ask about grammar rules used; for math: ask about method choice; for music: ask about technique reasoning)`

      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.5,
          max_tokens: 600,
        }),
      })

      const data = await res.json()
      const raw = data.choices?.[0]?.message?.content?.trim() || ''
      const clean = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
      const parsed = JSON.parse(clean)

      return Response.json({ questions: parsed.questions || [] })
    }

    // ACTION: evaluate — check the student's answer
    if (action === 'evaluate') {
      if (!answer) return Response.json({ error: 'Missing answer' }, { status: 400 })

      const prompt = `A student answered a checkpoint question about their ${skillType} project.

PROJECT: ${project.title}
STEP: ${step.title}
QUESTION: ${body.question}
STUDENT'S ANSWER: "${answer}"
EXPECTED KEYWORDS/CONCEPTS: ${(body.expectedKeywords || []).join(', ')}

Evaluate their answer. Return ONLY valid JSON:
{
  "passed": true,
  "score": 85,
  "feedback": "Brief, encouraging feedback (1-2 sentences). If they got it right, confirm why. If wrong, gently correct."
}

RULES:
- Be lenient — partial understanding counts
- Score 0-100: 60+ is a pass
- Check for conceptual understanding, not exact wording
- If they clearly understand the concept, pass them even if wording is imperfect
- Keep feedback warm and encouraging`

      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
          max_tokens: 300,
        }),
      })

      const data = await res.json()
      const raw = data.choices?.[0]?.message?.content?.trim() || ''
      const clean = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
      const result = JSON.parse(clean)

      // Save checkpoint result to project progress
      const checkpointResults = project.progress?.checkpoint_results || {}
      const previousResult = checkpointResults[stepId] || {}
      checkpointResults[stepId] = {
        passed: result.passed,
        score: result.score,
        answeredAt: new Date().toISOString(),
        attempts: (previousResult.attempts || 0) + 1,
      }

      await supabase
        .from('projects')
        .update({
          progress: { ...project.progress, checkpoint_results: checkpointResults },
        })
        .eq('id', projectId)

      return Response.json(result)
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
