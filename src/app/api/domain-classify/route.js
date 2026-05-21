import { getOpenAIModel } from '@/lib/openaiModels'
import {
  DEFAULT_DOMAIN,
  LEARNING_DOMAINS,
  detectDomainHeuristic,
  normalizeDomain,
} from '@/lib/domainAdapter'

const DOMAIN_RESPONSE_FORMAT = {
  type: 'json_schema',
  json_schema: {
    name: 'pathai_domain_classification',
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['domain', 'confidence'],
      properties: {
        domain: { type: 'string', enum: LEARNING_DOMAINS },
        confidence: { type: 'number', minimum: 0, maximum: 1 },
      },
    },
  },
}

function clampConfidence(value, fallback = 0.5) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return fallback
  return Math.max(0, Math.min(1, numeric))
}

function normalizeClassification(payload, fallbackGoal = '') {
  const heuristic = detectDomainHeuristic(fallbackGoal)
  return {
    domain: normalizeDomain(payload?.domain, heuristic.domain || DEFAULT_DOMAIN),
    confidence: clampConfidence(payload?.confidence, heuristic.confidence),
  }
}

async function classifyWithOpenAI(goal) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: getOpenAIModel('domainClassifier'),
      max_completion_tokens: 120,
      response_format: DOMAIN_RESPONSE_FORMAT,
      messages: [
        {
          role: 'system',
          content: 'Classify the learning goal into exactly one allowed PathAI domain. Return only schema-valid JSON.',
        },
        {
          role: 'user',
          content: [
            'Allowed domains:',
            LEARNING_DOMAINS.join(' | '),
            '',
            'Use CS_CODING only for programming, software engineering, SQL/code, web development, app building, algorithms, and debugging.',
            'Use ML_AI for machine learning concepts, model evaluation, prediction tasks, neural networks, AI literacy, bias, and model behavior.',
            'Use DATA_SCIENCE for data cleaning, dashboards, exploratory analysis, charts, analytics, and data storytelling.',
            'Use STATISTICS for probability, inference, sampling, distributions, p-values, confidence intervals, and hypothesis testing.',
            'Use CYBERSECURITY for phishing, safe defensive security, threat modeling, password/account safety, logs, and network defense.',
            'Use FINANCE for budgeting, investing, portfolios, cash flow, accounting, valuation, loans, and financial statements.',
            'Use BUSINESS for strategy, operations, marketing, sales, management, entrepreneurship, and business metrics.',
            'Use GOVERNMENT_CIVICS for government, civics, policy, law, institutions, campaigns, geopolitics, and political systems.',
            'Use ART_DESIGN for UI/UX, product design, web design, visual design, art, typography, and composition.',
            'Use FOREIGN_LANGUAGE only when the goal is learning a human language.',
            'Use PHILOSOPHY_LOGIC for philosophy, logic, ethics, fallacies, and argument analysis.',
            'If multiple domains seem possible, choose the domain that should control the learning activities.',
            '',
            `Learning goal: ${goal}`,
          ].join('\n'),
        },
      ],
    }),
    signal: AbortSignal.timeout(8000),
  })

  if (!res.ok) {
    const message = await res.text().catch(() => '')
    throw new Error(message || `Domain classifier failed with ${res.status}`)
  }

  const data = await res.json()
  const raw = data?.choices?.[0]?.message?.content || '{}'
  return JSON.parse(raw)
}

export async function POST(request) {
  let goal = ''
  try {
    const body = await request.json()
    goal = String(body?.goal || '').trim()

    if (!goal) {
      return Response.json({ error: 'Missing goal' }, { status: 400 })
    }

    if (!process.env.OPENAI_API_KEY) {
      const heuristic = detectDomainHeuristic(goal)
      return Response.json({
        ...normalizeClassification(heuristic, goal),
        source: 'heuristic',
      })
    }

    const classification = normalizeClassification(await classifyWithOpenAI(goal), goal)
    return Response.json({
      ...classification,
      source: 'ai',
    })
  } catch {
    const fallback = detectDomainHeuristic(goal)
    return Response.json({
      ...normalizeClassification(fallback, goal),
      source: 'heuristic_fallback',
    })
  }
}
