export async function POST(request) {
  try {
    const { concept, goal, knowledge } = await request.json()
    if (!concept || !goal) return Response.json({ error: 'Missing concept or goal' }, { status: 400 })

    const prompt = `You are designing a quiz for a premium learning app. Create exactly 5 multiple-choice questions about "${concept}" for someone learning "${goal}".
${knowledge ? `The student already knows: ${knowledge}. Don't test basics they already know.` : ''}

Return ONLY valid JSON — no markdown, no backticks:
{
  "questions": [
    {
      "question": "Question text?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctIndex": 0,
      "explanation": "Why this answer is correct and what the student should remember."
    }
  ]
}

QUIZ QUALITY REQUIREMENTS:
- Question 1: Foundation — test basic understanding of core concept
- Question 2: Application — "given this scenario, what would happen?"
- Question 3: Comparison — "what's the difference between X and Y?"
- Question 4: Debugging — "what's wrong with this approach?" or "which would NOT work?"
- Question 5: Synthesis — requires combining multiple concepts to answer
- Each question must have exactly 4 options
- Wrong answers must be PLAUSIBLE — no obviously silly options. Use common misconceptions as distractors
- Explanations must be 2-3 sentences: (1) why the right answer is correct, (2) why the most tempting wrong answer is wrong, (3) a memorable takeaway
- Use real-world scenarios and code examples where relevant
- Frame questions as problems to solve, not definitions to recall
- NEVER use "All of the above" or "None of the above" as options
- AVOID questions that test memorization of arbitrary details — test understanding
- Make the student THINK, not just remember`

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: prompt }], temperature: 0.4, max_tokens: 1200 }),
    })
    const data = await res.json()
    const raw = data.choices?.[0]?.message?.content?.trim() || ''
    const clean = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
    const parsed = JSON.parse(clean)
    if (!Array.isArray(parsed?.questions) || parsed.questions.length === 0) throw new Error('Bad response')
    return Response.json({ questions: parsed.questions })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
