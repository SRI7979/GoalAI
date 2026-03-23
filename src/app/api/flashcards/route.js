import { getOpenAIModel } from '@/lib/openaiModels'

export async function POST(request) {
  try {
    const { concept, taskTitle, goal, knowledge } = await request.json()
    if (!concept || !goal) return Response.json({ error: 'Missing concept or goal' }, { status: 400 })

    const prompt = `You are designing flashcards for a premium learning app — think Anki meets Duolingo. Create cards about "${taskTitle || concept}" for someone learning "${goal}".
${knowledge ? `The student already knows: ${knowledge}. Focus on new material, not basics.` : ''}

Return ONLY valid JSON — no markdown, no backticks:
{
  "cards": [
    { "front": "Question or prompt", "back": "Clear answer", "hint": "Memory aid" }
  ]
}

FLASHCARD QUALITY REQUIREMENTS:
- Generate 10-12 cards
- Mix these card TYPES (use all of them):
  * "What is...?" — core definitions (3 cards)
  * "How does X differ from Y?" — comparison cards (2 cards)
  * "What happens when...?" — scenario cards (2 cards)
  * "Why does X matter?" — significance cards (2 cards)
  * "Complete the pattern: ..." — fill-in-the-gap cards (1-2 cards)
  * "True or false: ..." — quick-check cards (1 card)
- FRONT side: Clear, specific question (8-15 words). Never vague or generic
- BACK side: Answer in 1-3 sentences. Include a concrete example or analogy where possible
- HINT: A genuine memory aid — mnemonic device, analogy, or "think about..." prompt. Not just a restated version of the answer
- Order: Start with foundational terms, progress to applications, end with synthesis
- Each card should teach ONE thing. Never cram multiple concepts into one card
- Make the front side genuinely challenging — if someone can guess without studying, it's too easy
- Use code examples on the back when the concept involves programming`

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({ model: getOpenAIModel('flashcards'), messages: [{ role: 'user', content: prompt }], temperature: 0.4, max_tokens: 1200 }),
    })
    const data = await res.json()
    const raw = data.choices?.[0]?.message?.content?.trim() || ''
    const clean = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
    const parsed = JSON.parse(clean)
    if (!Array.isArray(parsed?.cards)) throw new Error('Bad response')
    return Response.json({ cards: parsed.cards })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
