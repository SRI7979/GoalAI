'use client'

import { useEffect, useState } from 'react'
import DiagramFrame from './DiagramFrame'
import { SvgText, list, svgBaseProps, text } from './diagramUtils'
import { DIAGRAM_PALETTE } from './palette'

export default function EquationBreakdownDiagram({ data = {}, title }) {
  const [html, setHtml] = useState('')
  const equation = text(data.equation, 'F = ma')
  const parts = list(data.parts, 6)
  const width = 720
  const height = Math.max(260, 142 + parts.length * 54)

  useEffect(() => {
    let cancelled = false
    import('katex')
      .then((mod) => {
        if (!cancelled) {
          setHtml(mod.default.renderToString(equation, { throwOnError: false, displayMode: true }))
        }
      })
      .catch(() => {
        if (!cancelled) setHtml('')
      })
    return () => {
      cancelled = true
    }
  }, [equation])

  return (
    <DiagramFrame title={title} caption={data.caption} tier="structured" diagramType="equation_breakdown">
      <div
        style={{
          color: DIAGRAM_PALETTE.text,
          border: `1px solid ${DIAGRAM_PALETTE.border}`,
          borderRadius: 16,
          background: DIAGRAM_PALETTE.surface2,
          padding: '12px 16px',
          marginBottom: 12,
          overflowX: 'auto',
        }}
        dangerouslySetInnerHTML={{ __html: html || equation }}
      />
      <svg {...svgBaseProps(width, height, title || 'Equation breakdown diagram')}>
        {parts.map((part, index) => {
          const y = 36 + index * 54
          return (
            <g key={`${part.symbol || index}`}>
              <rect x={60} y={y - 22} width={92} height={44} rx={14} fill="rgba(14,245,194,0.12)" stroke={DIAGRAM_PALETTE.teal} />
              <SvgText x={106} y={y} maxChars={8} fill={DIAGRAM_PALETTE.teal}>{text(part.symbol, `P${index + 1}`)}</SvgText>
              <rect x={174} y={y - 22} width={456} height={44} rx={14} fill={DIAGRAM_PALETTE.surface2} stroke={DIAGRAM_PALETTE.border} />
              <SvgText x={194} y={y} anchor="start" maxChars={52} maxLines={1}>{text(part.label || part.description, 'Meaning')}</SvgText>
            </g>
          )
        })}
      </svg>
    </DiagramFrame>
  )
}
