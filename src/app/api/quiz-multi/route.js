import OpenAI from 'openai'

export async function POST(request) {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  try {
    const { concept, goal, knowledge } = await request.json()
    if (!concept || !goal) return Response.json({ error: 'Missing concept or goal' }, { status: 400 })

    const prompt = `You are a quiz generator. Create exactly 5 multiple-choice questions to test understanding of "${concept}" for someone learning "${goal}".
${knowledge ? `The student already knows: ${knowledge}` : ''}

Return ONLY valid JSON — no markdown, no backticks:
{
  "questions": [
    {
      "question": "Question text?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctIndex": 0,
      "explanation": "Why this answer is correct."
    }
  ]
}

Rules:
- Each question must have exactly 4 options
- Questions should progress from easier to harder
- Explanations must be 1–2 sentences
- Avoid trick questions — test genuine understanding`

    const res = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.4,
      max_tokens: 1200,
    })

    const raw = res.choices[0]?.message?.content?.trim() || ''
    const clean = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
    const parsed = JSON.parse(clean)
    if (!Array.isArray(parsed?.questions) || parsed.questions.length === 0) throw new Error('Bad response')
    return Response.json({ questions: parsed.questions })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
