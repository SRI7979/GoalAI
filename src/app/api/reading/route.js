export async function POST(request) {
  try {
    const { concept, taskTitle, goal, knowledge } = await request.json()
    if (!concept || !goal) return Response.json({ error: 'Missing concept or goal' }, { status: 400 })

    const prompt = `You are a world-class educator writing for an interactive learning platform. Write a deeply engaging reading article about "${taskTitle || concept}" for someone whose goal is: "${goal}".
${knowledge ? `The student already knows: ${knowledge}. Build on this — don't repeat basics they know.` : ''}

Return ONLY valid JSON — no markdown, no backticks:
{
  "title": "A compelling, specific title (not generic)",
  "estimatedMinutes": 5,
  "sections": [
    { "heading": "Section heading", "body": "Rich content with multiple paragraphs." }
  ],
  "keyTerms": [
    { "term": "term name", "definition": "Clear 1-2 sentence definition with a practical example" }
  ]
}

WRITING QUALITY REQUIREMENTS — this is critical:
- Open with a hook: a surprising fact, a real-world scenario, or a "why should you care" moment
- Every section must have a CONCRETE example — code snippets (wrap in backticks), real-world analogies, or step-by-step walkthroughs
- Use the "explain it like you're teaching a friend" tone — warm, clear, no filler
- Include "Think of it like..." analogies that connect abstract concepts to everyday experience
- Each section should build on the previous one — create a narrative arc, not a list of facts
- End with a "putting it together" section that connects everything back to the student's goal
- Use short paragraphs (2-3 sentences each). Dense walls of text kill learning
- Bold key terms naturally within the text using **term** markdown
- Include at least one "common mistake" or "gotcha" that learners typically encounter
- 4-6 sections, each substantial (150-250 words)
- 5-8 key terms with definitions that include WHY the term matters, not just what it means
- estimatedMinutes: 4-8 (based on ~200 wpm)
- DO NOT use phrases like "In this article", "Let's dive in", "In conclusion" — these scream AI
- DO NOT start paragraphs with "It's important to note" or "It's worth mentioning"
- Write like a senior engineer explaining something to a junior over coffee`

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: prompt }], temperature: 0.5, max_tokens: 1800 }),
    })
    const data = await res.json()
    const raw = data.choices?.[0]?.message?.content?.trim() || ''
    const clean = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
    return Response.json(JSON.parse(clean))
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
