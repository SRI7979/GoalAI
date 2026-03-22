export async function POST(request) {
  try {
    const { concept, taskTitle, goal, knowledge } = await request.json()
    if (!concept || !goal) return Response.json({ error: 'Missing concept or goal' }, { status: 400 })

    const prompt = `You are designing a timed challenge for a premium learning app. Create an engaging, practical challenge about "${taskTitle || concept}" for someone learning "${goal}".
${knowledge ? `The student already knows: ${knowledge}. Challenge them at their level, not below it.` : ''}

Return ONLY valid JSON — no markdown, no backticks:
{
  "title": "A specific, engaging challenge title",
  "prompt": "The full challenge description with clear requirements.",
  "timeLimit": 600,
  "difficulty": "beginner",
  "hints": ["Hint 1", "Hint 2", "Hint 3"],
  "solution": "The complete solution with explanation"
}

CHALLENGE QUALITY REQUIREMENTS:
- The PROMPT must be crystal clear about what the student needs to produce. Include:
  * A specific scenario or context ("You're building a...")
  * Exact requirements (numbered list of what they need to accomplish)
  * Expected output or result format
  * Any constraints ("without using library X" or "in under 20 lines")
- timeLimit: 300-900 seconds. Match to actual difficulty — don't make beginners rush
- difficulty: "beginner" (apply one concept), "intermediate" (combine concepts), or "advanced" (edge cases + optimization)
- HINTS must form a progressive reveal:
  * Hint 1: A conceptual nudge — "Think about what data structure would help here"
  * Hint 2: A specific direction — "Try using X approach, starting with Y"
  * Hint 3: Nearly the answer — "The key insight is Z. Here's the first step..."
- SOLUTION must be educational, not just the answer:
  * Show the complete solution (with code if applicable)
  * Explain WHY this approach works
  * Mention common mistakes students make when solving this
  * Include a "bonus thought" — how to extend or optimize the solution
- The challenge should feel like a puzzle to solve, not homework to complete
- Ground it in a real-world scenario when possible ("Build a function that a real app would use")`

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: prompt }], temperature: 0.45, max_tokens: 1000 }),
    })
    const data = await res.json()
    const raw = data.choices?.[0]?.message?.content?.trim() || ''
    const clean = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
    return Response.json(JSON.parse(clean))
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
