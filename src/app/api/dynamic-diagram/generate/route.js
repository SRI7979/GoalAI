import { EVENTS } from '@/lib/analytics'
import { sanitizeSvgServer } from '@/lib/dynamicDiagramSafety'
import { getSupabaseServerClient } from '@/lib/supabaseServer'
import { generateStandardVisualDiagram, isVisualRateLimitError, validateSvgQuality } from '@/lib/standardVisualDiagram'

const MAX_VISUAL_SVG_BYTES = 50 * 1024

function extractAccessToken(request, body = {}) {
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization')
  if (authHeader?.toLowerCase().startsWith('bearer ')) return authHeader.slice(7).trim() || null
  return body?.accessToken || null
}

async function assertAuthorized(request, body) {
  if (process.env.NODE_ENV !== 'production') return true
  const accessToken = extractAccessToken(request, body)
  if (!accessToken) return false
  const authenticatedClient = getSupabaseServerClient({ accessToken })
  const { data, error } = await authenticatedClient.auth.getUser(accessToken)
  return Boolean(!error && data?.user?.id)
}

async function trackGenerated({ concept, result, validationReport, sizeKb }) {
  try {
    const supabase = getSupabaseServerClient()
    await supabase.from('analytics_events').insert({
      event_name: EVENTS.DYNAMIC_DIAGRAM_GENERATED,
      properties: {
        concept,
        tier: 'svg',
        diagram_type: result.visualKind,
        visual_kind: result.visualKind,
        source: result.source,
        success: validationReport.passed,
        ms: result.ms,
        ai_model_used: result.modelUsed,
        size_kb: sizeKb,
        no_persistence: true,
      },
      client_timestamp: new Date().toISOString(),
    })
  } catch {
    // Diagram telemetry should never block a teaching surface.
  }
}

function mergeValidationReports(svgValidation, generatorValidation) {
  const groundingCheck = generatorValidation?.checks?.find((check) => check.name === 'concept_grounding')
  if (!groundingCheck) return svgValidation
  const checks = [
    ...(Array.isArray(svgValidation?.checks) ? svgValidation.checks : []),
    groundingCheck,
  ]
  return {
    ...svgValidation,
    checks,
    passed: checks.every((check) => check.passed),
    failureSummary: checks
      .filter((check) => !check.passed)
      .map((check) => `${check.name}: ${check.detail}`)
      .join(' '),
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const authorized = await assertAuthorized(request, body)
    if (!authorized) return Response.json({ error: 'Invalid session' }, { status: 401 })

    const concept = String(body?.concept || '').trim()
    if (!concept) return Response.json({ error: 'Missing concept.' }, { status: 400 })

    const result = await generateStandardVisualDiagram({ concept })
    const sanitized = sanitizeSvgServer(result.svg, { maxBytes: MAX_VISUAL_SVG_BYTES })
    if (!sanitized.ok) return Response.json({ error: sanitized.error }, { status: 400 })

    const sizeKb = Number((Buffer.byteLength(sanitized.svg, 'utf8') / 1024).toFixed(1))
    const validationReport = mergeValidationReports(validateSvgQuality(sanitized.svg), result.validationReport)
    const params = {
      tier: 'svg',
      title: result.title || concept,
      svg: sanitized.svg,
      fallbackText: result.failureReason
        ? `The generated visual was repaired: ${result.failureReason}`
        : `A dynamic SVG explanation for ${concept}.`,
      concept,
      visualKind: result.visualKind,
      source: result.source,
    }

    await trackGenerated({ concept, result, validationReport, sizeKb })

    return Response.json({
      id: null,
      params,
      diagram: params,
      raw: { title: params.title, svg: params.svg },
      tierChoiceReason: `Standard dynamic SVG generator selected ${result.visualKind}.`,
      success: validationReport.passed,
      model: result.modelUsed,
      ms: result.ms,
      sizeKb,
      saved: false,
      validationReport,
      failureReason: result.failureReason || null,
    })
  } catch (error) {
    const rateLimited = isVisualRateLimitError(error)
    return Response.json({
      error: rateLimited
        ? 'The AI diagram generator is rate-limited right now. Wait a minute and retry, or use a lighter OPENAI_MODEL_FULL_AI_SVG while testing.'
        : (error?.message || 'Failed to generate dynamic diagram.'),
      code: rateLimited ? 'rate_limited' : (error?.code || 'diagram_generation_failed'),
      retryAfter: error?.retryAfter || null,
    }, { status: rateLimited ? 429 : 500 })
  }
}
