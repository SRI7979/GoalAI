import OpenAI from 'openai'

export async function POST(request) {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  try {
    const { concept, taskTitle, goal, knowledge, taskType } = await request.json()
    if (!concept || !goal) return Response.json({ error: 'Missing concept or goal' }, { status: 400 })

    const prompt = `You are a hands-on learning coach. Create a mini ${taskType === 'exercise' ? 'coding exercise' : 'practice project'} for someone learning "${goal}", specifically about "${taskTitle || concept}".
${knowledge ? `The student already knows: ${knowledge}` : ''}

Return ONLY valid JSON — no markdown, no backticks:
{
  "title": "Short punchy project title",
  "objective": "1 sentence: what the student will build/accomplish and why it matters",
  "steps": [
    { "id": 1, "title": "Step title", "description": "Clear instruction — what to do and how to do it" },
    { "id": 2, "title": "Step title", "description": "..." },
    { "id": 3, "title": "Step title", "description": "..." },
    { "id": 4, "title": "Step title", "description": "..." }
  ],
  "hint": "A helpful nudge if they get stuck",
  "successCriteria": "How they'll know they've done it correctly"
}

Rules:
- 3–5 steps, each concrete and actionable
- Steps should build on each other
- Keep it achievable in ${10} minutes
- If coding: include specific code they need to write`

    const res = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.5,
      max_tokens: 900,
    })

    const raw = res.choices[0]?.message?.content?.trim() || ''
    const clean = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
    const parsed = JSON.parse(clean)
    return Response.json(parsed)
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
