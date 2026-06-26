'use client'

import DiagramFrame from './DiagramFrame'
import { SvgText, list, svgBaseProps, text } from './diagramUtils'
import { DIAGRAM_PALETTE } from './palette'

export default function LayeredStackDiagram({ data = {}, title }) {
  const layers = list(data.layers, 9)
  const width = 720
  const height = Math.max(220, 72 + layers.length * 52)
  const reversed = [...layers].reverse()

  return (
    <DiagramFrame title={title} caption={data.caption} tier="structured" diagramType="layered_stack">
      <svg {...svgBaseProps(width, height, title || 'Layered stack diagram')}>
        {reversed.map((layer, index) => {
          const y = 34 + index * 52
          const inset = index * 14
          return (
            <g key={`${layer.label || index}`}>
              <rect
                x={90 + inset}
                y={y}
                width={540 - inset * 2}
                height={42}
                rx={13}
                fill={index === 0 ? 'rgba(14,245,194,0.15)' : DIAGRAM_PALETTE.surface2}
                stroke={index === 0 ? DIAGRAM_PALETTE.teal : DIAGRAM_PALETTE.border}
              />
              <SvgText x={360} y={y + 21} maxChars={46} maxLines={1}>
                {text(layer.label, `Layer ${layers.length - index}`)}
              </SvgText>
            </g>
          )
        })}
        <SvgText x={58} y={42} anchor="start" size={11} fill={DIAGRAM_PALETTE.muted}>Top</SvgText>
        <SvgText x={58} y={height - 28} anchor="start" size={11} fill={DIAGRAM_PALETTE.muted}>Base</SvgText>
      </svg>
    </DiagramFrame>
  )
}
