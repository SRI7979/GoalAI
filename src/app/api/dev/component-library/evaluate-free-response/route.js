import { getOpenAIModel } from '@/lib/openaiModels'
import {
  FREE_RESPONSE_EVALUATION_RESPONSE_FORMAT,
  buildFreeResponseEvaluationPrompt,
} from '@/lib/prompts/components/freeResponse_v1'

function devLibraryEnabled() {
  return process.env.NODE_ENV !== 'production' || process.env.ENABLE_COMPONENT_LIBRARY_DEV === 'true'
}

export async function POST(request) {
  if (!devLibraryEnabled()) {
    return Response.json({ error: 'Component library evaluation is disabled.' }, { status: 404 })
  }

  try {
    if (!process.env.OPENAI_API_KEY) throw new Error('Missing OPENAI_API_KEY.')
    const body = await request.json()
    const prompt = String(body?.prompt || '').trim()
    const responseText = String(body?.response || '').trim()
    const rubricCriteria = Array.isArray(body?.rubricCriteria)
      ? body.rubricCriteria.map(String).filter(Boolean)
      : []
    if (!prompt || !responseText || rubricCriteria.length === 0) {
      return Response.json({ error: 'Missing prompt, response, or rubricCriteria.' }, { status: 400 })
    }

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: getOpenAIModel('componentEvaluator'),
        max_completion_tokens: 800,
        response_format: FREE_RESPONSE_EVALUATION_RESPONSE_FORMAT,
        messages: [
          { role: 'system', content: 'You evaluate learner answers and return only schema-valid JSON.' },
          { role: 'user', content: buildFreeResponseEvaluationPrompt({ prompt, rubricCriteria, response: responseText }) },
        ],
      }),
      signal: AbortSignal.timeout(30000),
    })

    if (!openaiResponse.ok) {
      const message = await openaiResponse.text().catch(() => '')
      throw new Error(message || `OpenAI returned ${openaiResponse.status}.`)
    }

    const payload = await openaiResponse.json()
    const raw = payload?.choices?.[0]?.message?.content
    if (!raw) throw new Error('OpenAI returned an empty evaluation.')
    return Response.json({ evaluation: JSON.parse(raw), model: getOpenAIModel('componentEvaluator') })
  } catch (error) {
    return Response.json({ error: error?.message || 'Failed to evaluate response.' }, { status: 500 })
  }
}
