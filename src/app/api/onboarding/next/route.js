import { getOpenAIModel } from '@/lib/openaiModels'
import {
  FALLBACK_QUESTIONS,
  MAX_QUESTIONS,
  buildNextQuestionMessages,
  nextRequiredSlot,
  normalizeQuestion,
} from '@/lib/onboardingEngine'

async function generateQuestion({ goal, domainLabel, filledSlots, transcript, remainingSlot }) {
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
        max_completion_tokens: 400,
        response_format: { type: 'json_object' },
        messages: buildNextQuestionMessages({ goal, domainLabel, filledSlots, transcript, remainingSlot }),
      }),
      signal: AbortSignal.timeout(3500),
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
  try {
    body = await request.json()
  } catch {
    body = {}
  }

  const goal = String(body?.goal || '').trim()
  const domainLabel = String(body?.domainLabel || body?.domain || 'general')
  const filledSlots = (body?.answers && typeof body.answers === 'object') ? body.answers : {}
  const transcript = Array.isArray(body?.transcript) ? body.transcript : []
  const askedCount = Number(body?.askedCount) || 0

  if (!goal) {
    return Response.json({ error: 'Missing goal' }, { status: 400 })
  }

  // Cap conversation length and finish once every required slot is filled.
  const remainingSlot = nextRequiredSlot(filledSlots)
  if (!remainingSlot || askedCount >= MAX_QUESTIONS) {
    return Response.json({ done: true })
  }

  // The known-skills checklist is deterministic — its options come from the
  // skill-map route, not the LLM.
  if (remainingSlot === 'known_skills') {
    return Response.json({ done: false, question: FALLBACK_QUESTIONS.known_skills })
  }

  const generated = await generateQuestion({ goal, domainLabel, filledSlots, transcript, remainingSlot })
  const question = normalizeQuestion(generated, remainingSlot)

  return Response.json({ done: false, question })
}
