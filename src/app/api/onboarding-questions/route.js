import { getOpenAIModel } from '@/lib/openaiModels'
import { DOMAIN_METADATA, detectDomainHeuristic, normalizeDomain } from '@/lib/domainAdapter'
import {
  buildFallbackOnboardingCalibration,
  cleanGoal,
  getGoalSubject,
  normalizeOnboardingCalibration,
} from '@/lib/onboardingCalibration'

async function generateWithOpenAI({ goal, domain, family, fallback }) {
  if (!process.env.OPENAI_API_KEY) return null

  const normalizedDomain = normalizeDomain(domain, detectDomainHeuristic(goal).domain)
  const domainLabel = DOMAIN_METADATA[normalizedDomain]?.label || fallback?.summary || 'Adaptive Learning'
  const subject = getGoalSubject(goal)

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: getOpenAIModel('onboardingQuestions'),
      max_completion_tokens: 900,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: [
            'You generate fast PathAI onboarding calibration.',
            'The learner already gave a goal. Do not ask what they want to learn again.',
            'Ask only the missing information needed to build a first learning route.',
            'Every question must be relevant to the exact goal, concrete, and easy to answer.',
            'Avoid generic diagnostics like "How experienced are you with this skill?" unless the topic is named in the question.',
            'Return schema-valid JSON only.',
          ].join(' '),
        },
        {
          role: 'user',
          content: [
            `Goal: ${goal}`,
            `Parsed topic: ${subject}`,
            `Domain: ${normalizedDomain} (${domainLabel})`,
            `Goal family: ${family || 'general'}`,
            '',
            'Create 2 or 3 short calibration questions.',
            'Return keys: summary, defaults, questions.',
            'defaults must include pathStyle, pace, experienceLevel, learningStyle, desiredOutcome, prereqComfort.',
            'Each question must include id, prompt, helper, options.',
            'Each option must include label, score from 0 to 2, and sets object with any route fields it changes.',
            'One should determine starting depth for the parsed topic.',
            'One should determine what proof or outcome matters.',
            'Only include a time/pace question if it is useful.',
            'Options must set route fields using sets. Keep labels conversational and specific.',
          ].join('\n'),
        },
      ],
    }),
    signal: AbortSignal.timeout(2800),
  })

  if (!res.ok) return null
  const data = await res.json()
  const text = data?.choices?.[0]?.message?.content || ''
  if (!text) return null
  return JSON.parse(text)
}

export async function POST(request) {
  let goal = ''
  let domain = ''
  let family = 'general'

  try {
    const body = await request.json()
    goal = cleanGoal(body?.goal || '')
    domain = normalizeDomain(body?.domain, detectDomainHeuristic(goal).domain)
    family = String(body?.family || 'general')

    if (!goal) {
      return Response.json({ error: 'Missing goal' }, { status: 400 })
    }

    const fallback = buildFallbackOnboardingCalibration({ goal, domain, family })
    const generated = await generateWithOpenAI({ goal, domain, family, fallback }).catch(() => null)
    const normalized = normalizeOnboardingCalibration(
      generated ? { ...generated, source: 'ai' } : fallback,
      { goal, domain, family },
    )

    return Response.json(normalized)
  } catch {
    return Response.json(
      normalizeOnboardingCalibration(
        buildFallbackOnboardingCalibration({ goal, domain, family }),
        { goal, domain, family },
      ),
    )
  }
}
