import DOMPurify from 'isomorphic-dompurify'
import { JSDOM } from 'jsdom'
import { STRUCTURED_DIAGRAM_TYPES, validateStructuredDiagramData } from '@/components/library/schemas'
import { ALLOWED_MERMAID_PREFIXES, getMermaidDiagramType } from '@/components/library/diagrams/mermaidRules'

const MAX_SVG_BYTES = 50 * 1024

export function conceptIdFromText(value = '') {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80) || null
}

export function compactDiagramPayload(params = {}) {
  if (params.tier === 'structured') {
    return {
      tier: 'structured',
      diagramType: params.diagramType,
      data: params.data || {},
      title: params.title,
      fallbackText: params.fallbackText,
    }
  }
  if (params.tier === 'mermaid') {
    return {
      tier: 'mermaid',
      code: params.code,
      title: params.title,
      fallbackText: params.fallbackText,
    }
  }
  if (params.tier === 'svg') {
    return {
      tier: 'svg',
      svg: params.svg,
      title: params.title,
      fallbackText: params.fallbackText,
    }
  }
  return {
    tier: 'none',
    reason: params.reason || 'No diagram was appropriate.',
    title: params.title || 'Key concept',
    fallbackText: params.fallbackText || params.reason || 'This concept is better explained in words.',
  }
}

function stripExternalReferences(svg) {
  return String(svg || '')
    .replace(/\s(?:href|src|xlink:href)=["'](?:https?:|\/\/|data:)[^"']*["']/gi, '')
    .replace(/\s(?:on[a-z]+)=["'][^"']*["']/gi, '')
}

export function sanitizeSvgServer(svg, { maxBytes = MAX_SVG_BYTES } = {}) {
  const raw = String(svg || '').trim()
  if (!raw) return { ok: false, error: 'SVG payload is empty.' }
  if (Buffer.byteLength(raw, 'utf8') > maxBytes) return { ok: false, error: `SVG payload exceeds ${Math.round(maxBytes / 1024)}kb.` }
  if (!raw.startsWith('<svg')) return { ok: false, error: 'SVG payload must start with an <svg> element.' }

  try {
    const parsed = new JSDOM(raw, { contentType: 'image/svg+xml' })
    if (!parsed.window.document.querySelector('svg')) return { ok: false, error: 'SVG root element missing.' }
  } catch {
    return { ok: false, error: 'SVG is not well-formed XML.' }
  }

  const sanitized = DOMPurify.sanitize(stripExternalReferences(raw), {
    USE_PROFILES: { svg: true, svgFilters: true },
    FORBID_TAGS: ['script', 'foreignObject', 'iframe', 'object', 'embed'],
    FORBID_ATTR: ['onload', 'onclick', 'onerror', 'onmouseover', 'onfocus', 'style'],
  })
  return { ok: true, svg: stripExternalReferences(sanitized) }
}

export function validateDynamicDiagramResponse(input = {}) {
  const tier = String(input.tier || 'none').trim()
  const title = String(input.title || 'Key concept').trim().slice(0, 140)
  const fallbackText = String(input.fallbackText || input.fallback_text || input.reason || 'This concept is better explained in words.').trim().slice(0, 900)

  if (tier === 'structured') {
    const diagramType = String(input.diagramType || input.diagram_type || '').trim()
    if (!STRUCTURED_DIAGRAM_TYPES.includes(diagramType)) {
      return { ok: false, error: `Unsupported structured diagram type: ${diagramType || 'missing'}.` }
    }
    if (!input.data || typeof input.data !== 'object' || Array.isArray(input.data)) {
      return { ok: false, error: 'Structured diagram data must be an object.' }
    }
    const dataValidation = validateStructuredDiagramData(diagramType, input.data, 'data')
    if (!dataValidation.ok) {
      return {
        ok: false,
        error: dataValidation.errors.join(' '),
      }
    }
    return { ok: true, params: { tier, diagramType, data: dataValidation.data, title, fallbackText } }
  }

  if (tier === 'mermaid') {
    const code = String(input.code || '').trim()
    const diagramType = getMermaidDiagramType(code)
    if (!diagramType) {
      return { ok: false, error: `Mermaid type must be one of: ${ALLOWED_MERMAID_PREFIXES.join(', ')}.` }
    }
    return { ok: true, params: { tier, code, title, fallbackText } }
  }

  if (tier === 'svg') {
    const sanitized = sanitizeSvgServer(input.svg)
    if (!sanitized.ok) return sanitized
    return { ok: true, params: { tier, svg: sanitized.svg, title, fallbackText } }
  }

  return {
    ok: true,
    params: {
      tier: 'none',
      reason: String(input.reason || 'No diagram was appropriate.').slice(0, 500),
      title,
      fallbackText,
    },
  }
}
