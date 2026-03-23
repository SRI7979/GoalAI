import { getOpenAIModel } from '@/lib/openaiModels'

export async function POST(request) {
  try {
    const { concept, taskTitle, goal, knowledge, taskType } = await request.json()
    if (!concept || !goal) return Response.json({ error: 'Missing concept or goal' }, { status: 400 })

    const prompt = `You are a senior developer designing a hands-on ${taskType === 'exercise' ? 'coding exercise' : 'practice project'} for a premium learning app. Create a practical exercise about "${taskTitle || concept}" for someone learning "${goal}".
${knowledge ? `The student already knows: ${knowledge}. Challenge them appropriately.` : ''}

Return ONLY valid JSON — no markdown, no backticks:
{
  "title": "Specific, action-oriented project title",
  "objective": "What they'll build and what skill it reinforces — make them excited to start",
  "steps": [
    { "id": 1, "title": "Step title", "description": "Detailed instruction with specific actions" }
  ],
  "hint": "A strategic hint that unblocks without giving away the answer",
  "successCriteria": "Specific, testable criteria — how they verify their work is correct"
}

PROJECT QUALITY REQUIREMENTS:
- 4-6 steps that build on each other in a logical sequence
- Each step description should be 2-4 sentences with:
  * WHAT to do (specific action)
  * HOW to do it (approach or technique)
  * WHY it matters (what this step teaches)
- Include code snippets, commands, or specific values where relevant
- The project should produce a VISIBLE result the student can verify
- The hint should address the #1 place students get stuck, not just repeat instructions
- successCriteria should be specific and testable: "Your function should return X when given Y" or "You should see Z in the console"
- Make it feel like building something real, not doing homework
- Achievable in 10-15 minutes for someone who understands the concept`

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({ model: getOpenAIModel('projectIdea'), messages: [{ role: 'user', content: prompt }], temperature: 0.45, max_tokens: 1000 }),
    })
    const data = await res.json()
    const raw = data.choices?.[0]?.message?.content?.trim() || ''
    const clean = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
    const parsed = JSON.parse(clean)
    return Response.json(parsed)
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
