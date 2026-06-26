'use client'

import DiagramFrame from './DiagramFrame'
import { ArrowDefs, SvgText, list, svgBaseProps, text } from './diagramUtils'
import { DIAGRAM_PALETTE } from './palette'

export default function AnnotatedCalloutsDiagram({ data = {}, title }) {
  const callouts = list(data.callouts, 6)
  const width = 720
  const height = 430

  return (
    <DiagramFrame title={title} caption={data.caption} tier="structured" diagramType="annotated_callouts">
      <svg {...svgBaseProps(width, height, title || 'Annotated callouts diagram')}>
        <ArrowDefs id="callout-arrow" color={DIAGRAM_PALETTE.amber} />
        <rect x={210} y={92} width={300} height={210} rx={24} fill={DIAGRAM_PALETTE.surface2} stroke={DIAGRAM_PALETTE.border} />
        <SvgText x={360} y={197} maxChars={28} maxLines={3}>{text(data.baseLabel, 'Main idea')}</SvgText>
        {callouts.map((callout, index) => {
          const side = index % 2 === 0 ? 'left' : 'right'
          const y = 54 + index * 54
          const boxX = side === 'left' ? 30 : 540
          const anchorX = side === 'left' ? 210 : 510
          const boxEdge = side === 'left' ? boxX + 138 : boxX
          const targetY = 130 + (index % 4) * 44
          return (
            <g key={`${callout.label || index}`}>
              <path d={`M${boxEdge},${y} C${anchorX},${y} ${anchorX},${targetY} ${anchorX},${targetY}`} stroke={DIAGRAM_PALETTE.amber} strokeWidth="2" fill="none" markerEnd="url(#callout-arrow)" />
              <rect x={boxX} y={y - 22} width={138} height={44} rx={13} fill="rgba(255,209,102,0.12)" stroke="rgba(255,209,102,0.46)" />
              <SvgText x={boxX + 69} y={y} maxChars={15} maxLines={2} size={11}>{text(callout.label, `Note ${index + 1}`)}</SvgText>
            </g>
          )
        })}
      </svg>
    </DiagramFrame>
  )
}
