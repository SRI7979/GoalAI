import 'server-only'
import { getOpenAIModel } from '@/lib/openaiModels'
import { sanitizeSvgServer } from '@/lib/dynamicDiagramSafety'
import { summarizeChecks, validateSvgQuality } from '@/lib/standardVisualDiagram'
import {
  LESSON_VISUAL_PLAN_RESPONSE_FORMAT,
  buildLessonVisualPlanPrompt,
} from '@/lib/prompts/components/lessonVisualPlan_v1'
import { TEMPLATE_KINDS, renderTemplateSvg } from '@/lib/templateSvgRenderers'

const MAX_LESSON_PLAN_ATTEMPTS = 2
const MAX_VISUAL_SVG_BYTES = 50 * 1024
const TEMPLATE_VALIDATION_CHECKS = new Set([
  'well_formed_xml',
  'view_box',
  'readable_text',
  'safe_svg_tags',
])

function parseModelJson(raw) {
  try {
    return JSON.parse(raw)
  } catch (error) {
    const recovered = String(raw || '').match(/\{[\s\S]*\}/)?.[0]
    if (recovered) return JSON.parse(recovered)
    throw error
  }
}

function templateSvgValidation(svg) {
  const report = validateSvgQuality(svg)
  const checks = (report.checks || []).filter((check) => TEMPLATE_VALIDATION_CHECKS.has(check.name))
  return { ...report, ...summarizeChecks(checks), checks }
}

function normalizeSlides(slides = []) {
  return (Array.isArray(slides) ? slides : []).slice(0, 12).map((slide, index) => ({
    index: Number.isInteger(slide.index) ? slide.index : index,
    kind: String(slide.kind || '').slice(0, 40),
    title: String(slide.title || '').slice(0, 140),
    body: String(slide.body || '').slice(0, 600),
    code: String(slide.code || '').slice(0, 900),
    question: String(slide.question || '').slice(0, 240),
  }))
}

function normalizeDiagramSlots(diagramSlots = []) {
  return (Array.isArray(diagramSlots) ? diagramSlots : []).slice(0, 8).map((slot, index) => ({
    slotId: String(slot.slotId || `diagram_${index + 1}`).trim().slice(0, 80),
    slideIndex: Number.isInteger(slot.slideIndex) ? slot.slideIndex : index,
    slideTitle: String(slot.slideTitle || '').slice(0, 140),
    concept: String(slot.concept || slot.diagramConcept || '').slice(0, 260),
    surroundingCopy: String(slot.surroundingCopy || '').slice(0, 800),
    code: String(slot.code || '').slice(0, 1000),
    purpose: String(slot.purpose || '').slice(0, 260),
    placement: String(slot.placement || '').slice(0, 160),
  })).filter((slot) => slot.slotId)
}

async function requestLessonVisualPlan({ lessonTitle, staticGoal, slides, diagramSlots, validationFeedback }) {
  if (!process.env.OPENAI_API_KEY) throw new Error('Missing OPENAI_API_KEY.')
  const model = getOpenAIModel('lessonVisualPlan')
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      max_completion_tokens: 6500,
      temperature: 0.15,
      response_format: LESSON_VISUAL_PLAN_RESPONSE_FORMAT,
      messages: [
        {
          role: 'system',
          content: 'You plan lesson diagrams as render-ready template payloads. Prefer deterministic templates. Return schema-valid JSON only.',
        },
        {
          role: 'user',
          content: buildLessonVisualPlanPrompt({
            lessonTitle,
            staticGoal,
            slides,
            diagramSlots,
            validationFeedback,
          }),
        },
      ],
    }),
    signal: AbortSignal.timeout(65000),
  })

  if (!response.ok) {
    const message = await response.text().catch(() => '')
    const error = new Error(message || `OpenAI returned ${response.status}.`)
    error.status = response.status
    if (response.status === 429) {
      error.code = 'rate_limited'
      error.retryAfter = response.headers.get('retry-after')
    }
    throw error
  }

  const payload = await response.json()
  const raw = payload?.choices?.[0]?.message?.content
  if (!raw) throw new Error('OpenAI returned an empty lesson visual plan.')
  return { ...parseModelJson(raw), modelUsed: model }
}

function renderPlannedDiagram(item = {}, slot = {}) {
  const kind = String(item.kind || '').trim()
  const title = String(item.title || slot.slideTitle || 'Lesson diagram').trim().slice(0, 120)
  const purpose = String(item.purpose || slot.purpose || '').trim().slice(0, 260)
  let svg
  let templatePath

  if (kind === 'freeform') {
    if (!item.svg) throw new Error(`${item.slotId || slot.slotId}: freeform diagram is missing svg.`)
    svg = item.svg
    templatePath = 'freeform'
  } else {
    if (!TEMPLATE_KINDS.includes(kind)) throw new Error(`${item.slotId || slot.slotId}: unsupported diagram kind ${kind || 'missing'}.`)
    svg = renderTemplateSvg(kind, item[kind], title)
    templatePath = 'template'
  }

  const sanitized = sanitizeSvgServer(svg, { maxBytes: MAX_VISUAL_SVG_BYTES })
  if (!sanitized.ok) throw new Error(`${item.slotId || slot.slotId}: ${sanitized.error}`)

  const validation = templatePath === 'template'
    ? templateSvgValidation(sanitized.svg)
    : validateSvgQuality(sanitized.svg)
  if (!validation.passed) {
    throw new Error(`${item.slotId || slot.slotId}: ${validation.failureSummary || 'SVG validation failed.'}`)
  }

  return {
    slotId: String(item.slotId || slot.slotId),
    title,
    purpose,
    kind,
    templatePath,
    params: {
      tier: 'svg',
      title,
      svg: sanitized.svg,
      fallbackText: purpose || slot.purpose || 'This visual explains the lesson concept.',
      concept: slot.concept || title,
      visualKind: templatePath === 'template' ? `lesson_template_${kind}` : 'lesson_plan_freeform_svg',
      source: 'lesson_visual_plan',
      templateKind: kind,
      templatePath,
      purpose,
      slotId: String(item.slotId || slot.slotId),
    },
    validationReport: validation,
  }
}

function renderPlanPayload(payload = {}, slots = []) {
  const bySlot = new Map(slots.map((slot) => [slot.slotId, slot]))
  const byReturnedSlot = new Map((payload.diagrams || []).map((item) => [String(item.slotId || ''), item]))
  const diagrams = []
  const errors = []

  for (const slot of slots) {
    const item = byReturnedSlot.get(slot.slotId)
    if (!item) {
      errors.push(`${slot.slotId}: planner did not return a diagram for this slot.`)
      continue
    }
    try {
      diagrams.push(renderPlannedDiagram(item, bySlot.get(slot.slotId)))
    } catch (error) {
      errors.push(error?.message || `${slot.slotId}: failed to render planned diagram.`)
    }
  }

  if (errors.length) {
    const error = new Error(errors.join('\n'))
    error.validationErrors = errors
    throw error
  }
  return diagrams
}

export async function planLessonVisuals({
  lessonTitle = '',
  staticGoal = '',
  slides = [],
  diagramSlots = [],
} = {}) {
  const startedAt = Date.now()
  const normalizedSlides = normalizeSlides(slides)
  const normalizedSlots = normalizeDiagramSlots(diagramSlots)
  if (!normalizedSlots.length) {
    return { diagrams: [], modelUsed: getOpenAIModel('lessonVisualPlan'), ms: Date.now() - startedAt }
  }

  let validationFeedback = ''
  let lastError = null
  for (let attempt = 0; attempt < MAX_LESSON_PLAN_ATTEMPTS; attempt += 1) {
    try {
      const payload = await requestLessonVisualPlan({
        lessonTitle: String(lessonTitle || '').slice(0, 160),
        staticGoal: String(staticGoal || '').slice(0, 160),
        slides: normalizedSlides,
        diagramSlots: normalizedSlots,
        validationFeedback,
      })
      const diagrams = renderPlanPayload(payload, normalizedSlots)
      return {
        diagrams,
        modelUsed: payload.modelUsed,
        ms: Date.now() - startedAt,
        attempts: attempt + 1,
      }
    } catch (error) {
      lastError = error
      validationFeedback = error?.validationErrors?.join('\n') || error?.message || 'Planner output failed validation.'
    }
  }

  throw lastError || new Error('Lesson visual planning failed.')
}
