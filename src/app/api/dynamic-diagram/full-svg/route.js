import { EVENTS } from '@/lib/analytics'
import { sanitizeSvgServer } from '@/lib/dynamicDiagramSafety'
import { getSupabaseServerClient } from '@/lib/supabaseServer'
import { generateStandardVisualDiagram, isVisualRateLimitError, summarizeChecks, validateSvgQuality } from '@/lib/standardVisualDiagram'

const MAX_VISUAL_SVG_BYTES = 50 * 1024

function extractAccessToken(request, body = {}) {
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization')
  if (authHeader?.toLowerCase().startsWith('bearer ')) return authHeader.slice(7).trim() || null
  return body?.accessToken || null
}

async function resolveUserId(request, body = {}) {
  const accessToken = extractAccessToken(request, body)
  if (accessToken) {
    const supabase = getSupabaseServerClient({ accessToken })
    const { data, error } = await supabase.auth.getUser(accessToken)
    if (!error && data?.user?.id) return data.user.id
  }
  return process.env.NODE_ENV !== 'production' ? (process.env.PATHAI_DEV_USER_ID || null) : null
}

async function trackVisualGenerated({ userId, concept, result, sizeKb }) {
  try {
    const supabase = getSupabaseServerClient()
    await supabase.from('analytics_events').insert({
      event_name: EVENTS.FULL_AI_SVG_GENERATED,
      user_id: userId,
      properties: {
        concept,
        standard: true,
        no_persistence: true,
        visual_kind: result.visualKind,
        source: result.source,
        template_kind: result.templateKind || 'freeform',
        template_path: result.templatePath || 'freeform',
        model_used: result.modelUsed,
        generation_ms: result.ms,
        size_kb: sizeKb,
        validation_passed: result.validationReport?.passed ?? true,
        fallback: result.source === 'fallback',
      },
      client_timestamp: new Date().toISOString(),
    })
  } catch {
    // Visual telemetry should never block the dev lab.
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
    ...summarizeChecks(checks),
    checks,
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const concept = String(body?.concept || '').trim()
    if (!concept) return Response.json({ error: 'Missing concept.' }, { status: 400 })

    const userId = await resolveUserId(request, body)
    const result = await generateStandardVisualDiagram({ concept })
    const sanitized = sanitizeSvgServer(result.svg, { maxBytes: MAX_VISUAL_SVG_BYTES })
    if (!sanitized.ok) return Response.json({ error: sanitized.error }, { status: 400 })

    const sizeKb = Number((Buffer.byteLength(sanitized.svg, 'utf8') / 1024).toFixed(1))
    const validationReport = mergeValidationReports(validateSvgQuality(sanitized.svg), result.validationReport)
    await trackVisualGenerated({ userId, concept, result: { ...result, validationReport }, sizeKb })

    return Response.json({
      title: result.title || concept,
      svg: sanitized.svg,
      ms: result.ms,
      modelUsed: result.modelUsed,
      sizeKb,
      visualKind: result.visualKind,
      source: result.source,
      templateKind: result.templateKind || 'freeform',
      templatePath: result.templatePath || 'freeform',
      validationReport,
      standard: true,
      saved: false,
      failureReason: result.failureReason || null,
    })
  } catch (error) {
    const rateLimited = isVisualRateLimitError(error)
    return Response.json({
      error: rateLimited
        ? 'The AI SVG generator is rate-limited right now. Wait a minute and retry, or use a lighter OPENAI_MODEL_FULL_AI_SVG while testing.'
        : (error?.message || 'Visual generation failed.'),
      code: rateLimited ? 'rate_limited' : (error?.code || 'visual_generation_failed'),
      retryAfter: error?.retryAfter || null,
    }, { status: rateLimited ? 429 : 500 })
  }
}
