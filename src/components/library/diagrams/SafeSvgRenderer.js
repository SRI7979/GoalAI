'use client'

import { useEffect, useMemo } from 'react'
import DOMPurify from 'isomorphic-dompurify'
import DiagramFrame from './DiagramFrame'
import { DIAGRAM_PALETTE } from './palette'

const MAX_SVG_BYTES = 50 * 1024

function stripExternalReferences(svg) {
  return String(svg || '')
    .replace(/\s(?:href|src|xlink:href)=["'](?:https?:|\/\/|data:)[^"']*["']/gi, '')
    .replace(/\s(?:on[a-z]+)=["'][^"']*["']/gi, '')
}

export function sanitizeSvgClient(svg) {
  const raw = String(svg || '')
  if (new Blob([raw]).size > MAX_SVG_BYTES) {
    return { ok: false, error: 'SVG payload exceeds 50kb.' }
  }
  if (!raw.trim().startsWith('<svg')) {
    return { ok: false, error: 'SVG payload must start with an <svg> element.' }
  }

  const parser = new DOMParser()
  const parsed = parser.parseFromString(raw, 'image/svg+xml')
  if (parsed.querySelector('parsererror')) {
    return { ok: false, error: 'SVG is not well-formed XML.' }
  }

  const cleaned = DOMPurify.sanitize(stripExternalReferences(raw), {
    USE_PROFILES: { svg: true, svgFilters: true },
    FORBID_TAGS: ['script', 'foreignObject', 'iframe', 'object', 'embed'],
    FORBID_ATTR: ['onload', 'onclick', 'onerror', 'onmouseover', 'onfocus', 'style'],
  })
  return { ok: true, svg: stripExternalReferences(cleaned) }
}

export default function SafeSvgRenderer({ svg, title, fallbackText, onRendered, onError }) {
  const result = useMemo(() => sanitizeSvgClient(svg), [svg])

  useEffect(() => {
    if (result.ok) onRendered?.()
    else onError?.(result.error)
  }, [onError, onRendered, result])

  if (!result.ok) {
    return (
      <DiagramFrame title={title || 'Key concept'} caption="Key concept card">
        <div style={{
          border: '1px solid rgba(14,245,194,0.26)',
          borderRadius: 16,
          padding: 16,
          color: DIAGRAM_PALETTE.text,
          background: 'rgba(14,245,194,0.06)',
        }}>
          {fallbackText || 'The custom visual could not render safely, but the key idea still applies.'}
        </div>
      </DiagramFrame>
    )
  }

  return (
    <DiagramFrame title={title} caption="Custom SVG diagram" tier="svg">
      <div
        style={{ overflowX: 'auto', color: DIAGRAM_PALETTE.text }}
        dangerouslySetInnerHTML={{ __html: result.svg }}
      />
    </DiagramFrame>
  )
}
