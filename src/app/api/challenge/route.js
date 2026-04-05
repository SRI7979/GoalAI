import { getOpenAIModel } from '@/lib/openaiModels'
import { buildDeterministicChallenge } from '@/lib/deterministicLesson'

export async function POST(request) {
  let body = null

  try {
    body = await request.json()
    const {
      concept,
      taskTitle,
      goal,
      knowledge,
      taskDescription,
      taskAction,
      taskOutcome,
      resourceUrl,
      resourceTitle,
      difficulty,
    } = body || {}

    if (!concept || !goal) {
      return Response.json({ error: 'Missing concept or goal' }, { status: 400 })
    }

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

    const tryGenerate = async () => {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: getOpenAIModel('challenge'),
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.45,
          max_tokens: 1000,
        }),
      })

      if (!res.ok) {
        const error = new Error(`OpenAI challenge error: ${res.status}`)
        error.code = 'openai_http_error'
        throw error
      }

      const data = await res.json()
      const raw = data.choices?.[0]?.message?.content?.trim() || ''
      const clean = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
      const parsed = JSON.parse(clean)

      if (!parsed?.title || !parsed?.prompt) {
        const error = new Error('Challenge payload missing fields')
        error.code = 'invalid_json'
        throw error
      }

      return parsed
    }

    try {
      return Response.json(await tryGenerate())
    } catch (primaryError) {
      try {
        return Response.json(await tryGenerate())
      } catch (retryError) {
        return Response.json(buildDeterministicChallenge({
          concept,
          taskTitle,
          goal,
          knowledge,
          taskDescription,
          taskAction,
          taskOutcome,
          resourceUrl,
          resourceTitle,
          difficulty,
          fallbackReason: retryError?.code || primaryError?.code || 'challenge_generation_failed',
        }))
      }
    }
  } catch (err) {
    if (body?.goal) {
      return Response.json(buildDeterministicChallenge({
        concept: body?.concept,
        taskTitle: body?.taskTitle,
        goal: body?.goal,
        knowledge: body?.knowledge,
        taskDescription: body?.taskDescription,
        taskAction: body?.taskAction,
        taskOutcome: body?.taskOutcome,
        resourceUrl: body?.resourceUrl,
        resourceTitle: body?.resourceTitle,
        difficulty: body?.difficulty,
        fallbackReason: err?.code || err?.message || 'route_error',
      }))
    }

    return Response.json({ error: err?.message || 'Unable to build challenge right now.' }, { status: 500 })
  }
}
