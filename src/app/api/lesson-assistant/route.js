const defaultLinks = [
  { title: 'Khan Academy', url: 'https://www.khanacademy.org/' },
  { title: 'MDN Learning', url: 'https://developer.mozilla.org/en-US/docs/Learn' },
  { title: 'Coursera', url: 'https://www.coursera.org/' },
]

export async function POST(request) {
  try {
    const body = await request.json()
    const { question, concept, goal, slide, mode = 'hint' } = body || {}

    if (!question || !concept || !goal) {
      return Response.json({ error: 'Missing question, concept, or goal' }, { status: 400 })
    }

    const modeInstruction = mode === 'teaching'
      ? 'Use Teaching Mode: explain concepts clearly, break work into smaller steps, and prefer worked examples over shortcuts.'
      : mode === 'challenge'
      ? 'Use Challenge Mode: avoid spoon-feeding, ask sharper follow-up questions, and push for transfer and deeper understanding.'
      : 'Use Hint Mode: give a nudge, not the whole answer, and encourage the learner to think through the next step themselves.'

    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.4,
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: `You are a concise learning assistant helping a student while they read a lesson slide.

Lesson goal: ${goal}
Concept: ${concept}
Current slide title: ${slide?.title || 'N/A'}
Current slide content: ${slide?.content || 'N/A'}
Assistant mode: ${mode}
Student question: ${question}

Return ONLY valid JSON:
{
  "answer": "clear short answer in 2-5 sentences",
  "tips": ["tip 1", "tip 2", "tip 3"],
  "links": [{"title":"resource title","url":"https://..."}]
}

Rules:
- ${modeInstruction}
- Keep answer practical and learner-friendly
- Tips should be actionable
- Include 1-3 reputable links`,
        }],
      }),
    })

    if (!openaiRes.ok) {
      const errText = await openaiRes.text()
      throw new Error(`OpenAI assistant error: ${errText}`)
    }

    const openaiData = await openaiRes.json()
    const text = openaiData.choices?.[0]?.message?.content || ''
    let jsonStr = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
    const firstBrace = jsonStr.indexOf('{')
    if (firstBrace >= 0) jsonStr = jsonStr.slice(firstBrace)
    const parsed = JSON.parse(jsonStr)

    return Response.json({
      answer: parsed?.answer || 'I could not parse a complete answer. Please try rephrasing your question.',
      tips: Array.isArray(parsed?.tips) ? parsed.tips.slice(0, 3) : [],
      links: Array.isArray(parsed?.links) ? parsed.links.slice(0, 3) : defaultLinks,
    })
  } catch (error) {
    console.error('Lesson assistant error:', error)
    return Response.json({
      answer: 'I hit a temporary issue. Try asking again with a specific question about this slide.',
      tips: [
        'Ask about one concept at a time.',
        'Request an analogy or example.',
        'Ask for a 30-second summary if the topic feels heavy.',
      ],
      links: defaultLinks,
      fallback: true,
    })
  }
}
