import { getSupabaseServerClient } from '@/lib/supabaseServer'
import { getProjectReviewCriteria } from '@/lib/projectProof'

function extractAccessToken(request) {
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization')
  if (!authHeader) return null
  if (!authHeader.toLowerCase().startsWith('bearer ')) return null
  return authHeader.slice(7).trim() || null
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { projectId } = body
    if (!projectId) return Response.json({ error: 'Missing projectId' }, { status: 400 })

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

    // If already reviewed, return existing review
    if (project.ai_review) return Response.json({ review: project.ai_review })

    const skillType = project.skill_type || 'coding'
    const criteria = getProjectReviewCriteria(skillType)

    const stepsDesc = (project.steps || [])
      .map((s, i) => `${i + 1}. ${s.title}: ${s.description}`)
      .join('\n')

    // Gather code submissions
    const codeSubmissions = project.progress?.code_submissions || {}
    const codeContext = Object.entries(codeSubmissions)
      .map(([stepId, sub]) => `Step ${stepId}: ${(sub.code || '').slice(0, 500)}`)
      .join('\n')

    // Gather response submissions (non-coding)
    const responseSubmissions = project.progress?.response_submissions || {}
    const responseContext = Object.entries(responseSubmissions)
      .map(([stepId, sub]) => `Step ${stepId}: ${(sub.response || '').slice(0, 500)}`)
      .join('\n')

    const checkpointResults = project.progress?.checkpoint_results || {}
    const checkpointSummary = Object.entries(checkpointResults)
      .map(([stepId, result]) => `Step ${stepId}: ${result.passed ? 'Passed' : 'Failed'} (${result.score}%)`)
      .join(', ')

    const isBuildMode = project.mode === 'build'
    const submissionContext = codeContext || responseContext
    const authenticity = project.progress?.authenticity || null
    const brief = project.progress?.project_brief || {}

    const prompt = `Review a learner's completed ${skillType} project and provide comprehensive, skill-appropriate feedback.

PROJECT: ${project.title}
DESCRIPTION: ${project.description}
SKILL TYPE: ${skillType}
CONCEPTS TESTED: ${(project.concepts_tested || []).join(', ')}
DIFFICULTY: ${project.difficulty}
MODE: ${isBuildMode ? 'Build Mode (minimal guidance)' : 'Guided Mode'}
REAL-WORLD CONTEXT: ${brief.real_world_context || 'Not provided'}
FINAL DELIVERABLE: ${brief.final_deliverable || project.deliverables?.[0] || 'Not specified'}
STEPS COMPLETED:
${stepsDesc}
${submissionContext ? `\nLEARNER'S SUBMISSIONS:\n${submissionContext}` : ''}
${checkpointSummary ? `\nCHECKPOINT RESULTS: ${checkpointSummary}` : ''}
${authenticity ? `\nAUTHENTICITY SNAPSHOT: ${authenticity.score}% (${authenticity.label})` : ''}

Return ONLY valid JSON:
{
  "overall_score": 85,
  "grade": "A-",
  "summary": "2-3 sentence overall assessment — encouraging but honest, specific to this ${skillType} project",
  "strengths": ["Specific thing they did well", "Another strength"],
  "improvements": ["Specific suggestion for improvement", "Another suggestion"],
  "concept_ratings": [
    { "concept": "concept name", "score": 90, "feedback": "Brief concept-specific feedback" }
  ],
  "originality_score": 80,
  "complexity_score": 75,
  "efficiency_score": 85,
  "criteria_labels": ["${criteria.c1}", "${criteria.c2}", "${criteria.c3}"],
  "senior_tips": [
    "How a ${criteria.expert} would improve this — specific, actionable advice"
  ],
  "professional_improvements": [
    "Specific professional-level improvement"
  ],
  "next_challenge": "A specific, harder follow-up project idea that builds on what they just did",
  "next_steps": "What they should focus on next to grow their ${skillType} skills",
  "verification_confidence": "high|medium|low"
}

RULES:
- Be encouraging but honest — never harsh, never generic
- Strengths and improvements must be specific to THIS project
- Scores range 0-100
- Grade uses standard letter grades (A+, A, A-, B+, etc.)
- concept_ratings should cover each concept in CONCEPTS TESTED
- originality_score: ${criteria.c1} (0-100)
- complexity_score: ${criteria.c2} (0-100)
- efficiency_score: ${criteria.c3} (0-100)
- senior_tips: 2-3 specific improvements a ${criteria.expert} would suggest
- professional_improvements can mirror senior_tips, but phrase them like a professional feedback pass
- next_challenge: a concrete, specific harder project idea (not vague)
- next_steps should be actionable and forward-looking
- Tailor ALL feedback to ${skillType} — use domain-appropriate language
${isBuildMode ? '- Give BONUS credit for using Build Mode — they had minimal guidance' : ''}`

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.45,
        max_tokens: 1800,
      }),
    })

    const data = await res.json()
    const raw = data.choices?.[0]?.message?.content?.trim() || ''
    const clean = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
    const review = JSON.parse(clean)

    // Add expert label for frontend display
    review._expertLabel = criteria.expertLabel
    review.criteria_labels = Array.isArray(review.criteria_labels) && review.criteria_labels.length === 3
      ? review.criteria_labels
      : [criteria.c1, criteria.c2, criteria.c3]
    review.professional_improvements = Array.isArray(review.professional_improvements) && review.professional_improvements.length > 0
      ? review.professional_improvements
      : review.senior_tips || []
    review.verification_confidence = review.verification_confidence || (authenticity?.score >= 85 ? 'high' : authenticity?.score >= 70 ? 'medium' : 'low')

    // Save review to project
    await supabase
      .from('projects')
      .update({ ai_review: review, status: 'reviewed' })
      .eq('id', projectId)

    return Response.json({ review })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
