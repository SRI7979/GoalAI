import { getOpenAIModel } from '@/lib/openaiModels'

// Dev-only: given a learning goal, generate a complete CONCEPT-phase lesson
// (content for every sub-block) so the Lessons devtool can preview what a learner
// would see for that goal and iterate on it.

const SYSTEM = [
  'You are an expert tutor and instructional designer. Given a learning goal, pick the single most important FIRST concept a learner should understand, then teach it excellently.',
  'Produce schema-valid JSON for a CONCEPT lesson with every sub-block filled. Be concrete, accurate, and clear. Use real examples from the goal\'s domain, not placeholders. Never quote the goal text verbatim.',
  'Schema:',
  '{',
  '  "conceptTitle": string,',
  '  "explanation": { "summary": string (1 sentence, what + why it matters), "paragraphs": string[] (2-3 short paragraphs), "keyPoints": string[] (2-4 takeaways) },',
  '  "slideshow": { "slides": [{ "title": string, "body": string }] } (3-4 slides, one idea each, builds up the concept),',
  '  "diagram": { "kind": "steps"|"flow"|"comparison", "title": string, "nodes": string[] (for steps/flow, 3-6 short labels), "left": {"title": string, "items": string[]}, "right": {"title": string, "items": string[]} (only for comparison), "caption": string },',
  '  "workedExample": { "prompt": string, "steps": [{ "label": string, "detail": string }] (3-5 steps), "answer": string },',
  '  "analogy": { "text": string (a vivid everyday analogy for the concept) },',
  '  "quickCheck": { "question": string, "options": [{ "text": string, "correct": boolean }] (exactly one correct, 3-4 options), "explanation": string (why the answer is right) }',
  '}',
  'Pick the diagram kind that best fits the concept. For comparison, omit nodes; for steps/flow, omit left/right.',
].join('\n')

function fallback(goal) {
  return {
    conceptTitle: 'Core idea',
    explanation: {
      summary: `This is a preview lesson for "${goal}". Add an OPENAI_API_KEY to generate real content.`,
      paragraphs: [
        'The Explanation sub-block delivers the core written teaching for one concept, kept short and scannable.',
        'Each sub-block below shows a different way to present or practice the same concept.',
      ],
      keyPoints: ['Explanation teaches the idea', 'Diagram shows it visually', 'Quick-check confirms understanding'],
    },
    slideshow: {
      slides: [
        { title: 'Step 1', body: 'Slideshow chunks the concept into one idea per card.' },
        { title: 'Step 2', body: 'The learner taps through at their own pace.' },
        { title: 'Step 3', body: 'Good for building an idea up gradually.' },
      ],
    },
    diagram: { kind: 'steps', title: 'Sample flow', nodes: ['Input', 'Process', 'Output'], caption: 'A simple template diagram.' },
    workedExample: {
      prompt: 'Sample problem for this concept.',
      steps: [
        { label: 'Set up', detail: 'Identify what is given.' },
        { label: 'Apply', detail: 'Use the concept to make progress.' },
        { label: 'Solve', detail: 'Reach the result.' },
      ],
      answer: 'The worked-out result.',
    },
    analogy: { text: 'Think of it like a recipe: clear ingredients and steps lead to a reliable result.' },
    quickCheck: {
      question: 'What is the Quick-check sub-block for?',
      options: [
        { text: 'Confirming understanding before moving on', correct: true },
        { text: 'Grading the final exam', correct: false },
        { text: 'Showing a diagram', correct: false },
      ],
      explanation: 'Quick-check is a low-stakes formative check at the end of the Concept phase.',
    },
  }
}

async function generate(goal) {
  if (!process.env.OPENAI_API_KEY) return null
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: getOpenAIModel('conceptExplainer'),
        max_completion_tokens: 1600,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM },
          { role: 'user', content: `Learning goal: ${goal}\nTeach the most important first concept for this goal.` },
        ],
      }),
      signal: AbortSignal.timeout(20000),
    })
    if (!res.ok) return null
    const data = await res.json()
    const text = data?.choices?.[0]?.message?.content || ''
    return text ? JSON.parse(text) : null
  } catch {
    return null
  }
}

export async function POST(request) {
  let body = {}
  try { body = await request.json() } catch { body = {} }
  const goal = String(body?.goal || '').trim()
  if (!goal) return Response.json({ error: 'Missing goal' }, { status: 400 })

  const generated = await generate(goal)
  return Response.json({ content: generated || fallback(goal), source: generated ? 'ai' : 'fallback' })
}
