import { getOpenAIModel } from '@/lib/openaiModels'
import { getSupabaseServerClient } from '@/lib/supabaseServer'

function extractAccessToken(request) {
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization')
  if (!authHeader) return null
  if (!authHeader.toLowerCase().startsWith('bearer ')) return null
  return authHeader.slice(7).trim() || null
}

// Build AI evaluation prompt based on skill type
function buildEvalPrompt(skillType, { projectTitle, stepTitle, stepDescription, responsePrompt, concepts, response, starterLanguage, minWords }) {
  const base = `PROJECT: ${projectTitle}\nSTEP: ${stepTitle}\nTASK: ${responsePrompt || stepDescription}\nLEARNER'S RESPONSE: "${response}"\nCONCEPTS: ${(concepts || []).join(', ')}`

  switch (skillType) {
    case 'language':
      return `Evaluate a language learner's response in a conversation scenario.

${base}
TARGET LANGUAGE: ${starterLanguage || 'the target language'}

Return ONLY valid JSON:
{
  "passed": true,
  "score": 85,
  "feedback": "Brief, encouraging feedback (2-3 sentences)",
  "grammar_notes": ["Specific grammar correction or tip"],
  "vocabulary_used": ["Words/phrases they used well"],
  "suggestion": "One specific way to improve their response"
}

RULES:
- Be lenient with beginners — communication matters more than perfection
- Score 0-100: 50+ is a pass (they communicated the idea)
- Check grammar, vocabulary, and appropriateness for the context
- Praise what they got right before noting improvements
- If response is in English instead of target language, score lower but still give partial credit`

    case 'math':
    case 'science':
      return `Evaluate a student's step-by-step ${skillType === 'math' ? 'mathematical' : 'scientific'} solution.

${base}

Return ONLY valid JSON:
{
  "passed": true,
  "score": 85,
  "feedback": "Brief feedback on their reasoning (2-3 sentences)",
  "method_correct": true,
  "errors": ["Specific error if any"],
  "suggestion": "How to improve their approach"
}

RULES:
- Evaluate correctness of both method AND answer
- Partial credit for correct approach with minor errors
- Score 0-100: 60+ is a pass
- Show specifically where they went wrong (if applicable)
- Acknowledge creative or alternative valid approaches`

    case 'writing':
      return `Evaluate a learner's written piece.

${base}
${minWords ? `MINIMUM WORDS: ${minWords}` : ''}

Return ONLY valid JSON:
{
  "passed": true,
  "score": 85,
  "feedback": "Brief, constructive feedback (2-3 sentences)",
  "strengths": ["What they did well"],
  "improvements": ["Specific improvement suggestion"],
  "depth_score": 80,
  "clarity_score": 85
}

RULES:
- Evaluate voice, structure, craft, and engagement
- Score 0-100: 60+ is a pass
- Credit original thinking, vivid language, and emotional resonance
- Give specific, actionable writing feedback (not generic)
${minWords ? `- Flag if under ${minWords} words but don't auto-fail` : ''}`

    case 'business':
      return `Evaluate a learner's business analysis response.

${base}
${minWords ? `MINIMUM WORDS: ${minWords}` : ''}

Return ONLY valid JSON:
{
  "passed": true,
  "score": 85,
  "feedback": "Brief, constructive feedback (2-3 sentences)",
  "strengths": ["What they analyzed well"],
  "improvements": ["Specific improvement suggestion"],
  "depth_score": 80,
  "clarity_score": 85
}

RULES:
- Evaluate clarity, depth, logic, evidence, and actionability
- Score 0-100: 60+ is a pass
- Check for specific data use (not vague platitudes)
- Credit original thinking and concrete recommendations
${minWords ? `- Flag if under ${minWords} words but don't auto-fail` : ''}`

    case 'music':
      return `Evaluate a music student's practice reflection.

${base}

Return ONLY valid JSON:
{
  "passed": true,
  "score": 85,
  "feedback": "Brief, encouraging feedback about their practice (2-3 sentences)",
  "tip": "One specific practice tip for next time"
}

RULES:
- Trust the student's self-assessment but check for depth of reflection
- Score 0-100: 50+ is a pass (effort and self-awareness matter)
- Look for: specific observations, honest self-assessment, awareness of what to improve
- If reflection is too vague ("it went fine"), suggest being more specific
- Encourage consistency and deliberate practice`

    case 'design':
      return `Evaluate a design student's description of their design decisions.

${base}

Return ONLY valid JSON:
{
  "passed": true,
  "score": 85,
  "feedback": "Brief feedback on their design thinking (2-3 sentences)",
  "design_strengths": ["What works well in their approach"],
  "improvement": "One specific design improvement suggestion"
}

RULES:
- Evaluate clarity of reasoning, design principles applied, and completeness
- Score 0-100: 60+ is a pass
- Check for: visual hierarchy awareness, consistency, user focus, accessibility
- Credit creative choices backed by good reasoning
- Suggest specific, actionable improvements (not vague "make it better")`

    case 'hardware':
      return `Evaluate a hardware student's output/observation report.

${base}

Return ONLY valid JSON:
{
  "passed": true,
  "score": 85,
  "feedback": "Brief feedback on their observations (2-3 sentences)",
  "troubleshooting_tip": "If something doesn't match expected, suggest a fix"
}

RULES:
- Compare reported output against expected behavior from the step description
- Score 0-100: 60+ is a pass
- Check for: correct readings, proper component behavior, expected outputs
- If output doesn't match, suggest specific troubleshooting steps
- Credit detailed observations and systematic debugging`

    default:
      return `Evaluate a learner's response to a project step.

${base}

Return ONLY valid JSON:
{
  "passed": true,
  "score": 85,
  "feedback": "Brief, encouraging feedback (2-3 sentences)"
}

RULES:
- Score 0-100: 60+ is a pass
- Be encouraging but honest
- Give specific feedback`
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { projectId, stepId, response } = body
    if (!projectId || !stepId) return Response.json({ error: 'Missing projectId or stepId' }, { status: 400 })
    if (!response?.trim()) return Response.json({ error: 'No response provided' }, { status: 400 })

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

    const prompt = buildEvalPrompt(skillType, {
      projectTitle: project.title,
      stepTitle: step.title,
      stepDescription: step.description,
      responsePrompt: step.response_prompt,
      concepts: step.concepts,
      response: response.slice(0, 3000),
      starterLanguage: project.starter_language,
      minWords: step.min_words,
    })

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: getOpenAIModel('projectVerify'),
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.4,
        max_tokens: 600,
      }),
    })

    const data = await res.json()
    const raw = data.choices?.[0]?.message?.content?.trim() || ''
    const clean = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
    const result = JSON.parse(clean)
    result.verification_layers = Array.isArray(result.verification_layers)
      ? result.verification_layers
      : [
        { id: 'artifact', title: 'Artifact', passed: Boolean(result.passed), note: 'Response was submitted and evaluated against the step goal.' },
        { id: 'process', title: 'Process', passed: response.trim().length >= 40, note: 'Response depth suggests real engagement with the task.' },
        { id: 'defense', title: 'Defense', passed: Number(result.score) >= 70, note: 'Evaluation indicates the learner can explain or justify the work.' },
      ]

    // Save response to project progress
    const responseSubmissions = project.progress?.response_submissions || {}
    const previousSubmission = responseSubmissions[stepId] || {}
    responseSubmissions[stepId] = {
      response: response.slice(0, 5000),
      score: result.score,
      passed: result.passed,
      submittedAt: new Date().toISOString(),
      attempts: (previousSubmission.attempts || 0) + 1,
      word_count: response.trim().split(/\s+/).filter(Boolean).length,
      verification_layers: result.verification_layers,
    }

    await supabase
      .from('projects')
      .update({
        progress: { ...project.progress, response_submissions: responseSubmissions },
      })
      .eq('id', projectId)

    return Response.json(result)
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
