import { getOpenAIModel } from '@/lib/openaiModels'
import { conceptIdFromLabel } from '@/lib/onboardingProfile'

function fallbackConcepts(goal) {
  const text = String(goal).toLowerCase()
  const generic = ['Core vocabulary and terms', 'Foundational concepts', 'Basic syntax or rules', 'Common patterns', 'Standard tools']
  if (/python|javascript|java|code|programming|coding/.test(text)) {
    return ['Variables and data types', 'Conditionals (if/else)', 'Loops', 'Functions', 'Lists / arrays', 'Dictionaries / objects', 'Error handling', 'Working with files']
  }
  if (/spanish|french|german|language|fluent/.test(text)) {
    return ['Alphabet and pronunciation', 'Common greetings', 'Present tense verbs', 'Numbers', 'Basic nouns and articles', 'Everyday vocabulary', 'Forming questions']
  }
  if (/math|calculus|algebra|statistics/.test(text)) {
    return ['Arithmetic', 'Basic algebra', 'Fractions and decimals', 'Equations', 'Graphing', 'Functions', 'Word problems']
  }
  return generic
}

async function generateConcepts({ goal, domainLabel, experienceLevel }) {
  if (!process.env.OPENAI_API_KEY) return null
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: getOpenAIModel('onboardingQuestions'),
        max_completion_tokens: 500,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: [
              'You list the foundational-to-intermediate building-block concepts for a learning goal, so a learner can check off what they already know and skip it.',
              'Return JSON: { "concepts": string[] }. 6-12 short, concrete, specific skill names (2-4 words each), ordered easiest first.',
              'Only list genuine prerequisite/foundational skills someone might already know — not advanced topics they are here to learn.',
              'Do not echo the goal text. No sentences, just skill names.',
            ].join(' '),
          },
          {
            role: 'user',
            content: `Goal (context, do not quote): ${goal}\nDomain: ${domainLabel}\nStated experience: ${experienceLevel || 'unknown'}\nList the foundational skills to check off.`,
          },
        ],
      }),
      signal: AbortSignal.timeout(3500),
    })
    if (!res.ok) return null
    const data = await res.json()
    const text = data?.choices?.[0]?.message?.content || ''
    const parsed = text ? JSON.parse(text) : null
    return Array.isArray(parsed?.concepts) ? parsed.concepts : null
  } catch {
    return null
  }
}

export async function POST(request) {
  let body = {}
  try {
    body = await request.json()
  } catch {
    body = {}
  }

  const goal = String(body?.goal || '').trim()
  const domainLabel = String(body?.domainLabel || body?.domain || 'general')
  const experienceLevel = String(body?.experienceLevel || '')

  if (!goal) {
    return Response.json({ error: 'Missing goal' }, { status: 400 })
  }

  const generated = await generateConcepts({ goal, domainLabel, experienceLevel })
  const labels = (generated && generated.length >= 4 ? generated : fallbackConcepts(goal))
    .map((label) => String(label).trim())
    .filter(Boolean)
    .slice(0, 12)

  const seen = new Set()
  const concepts = labels
    .map((label) => ({ id: conceptIdFromLabel(label), label }))
    .filter((c) => c.id && !seen.has(c.id) && seen.add(c.id))

  return Response.json({ concepts })
}
