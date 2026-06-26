'use client'

import DiagramFrame from './DiagramFrame'
import { SvgText, list, svgBaseProps, text } from './diagramUtils'
import { DIAGRAM_PALETTE } from './palette'

export default function TimelineDiagram({ data = {}, title }) {
  const events = list(data.events, 8)
  const width = 720
  const height = Math.max(190, 96 + events.length * 64)
  const x = 100

  return (
    <DiagramFrame title={title} caption={data.caption} tier="structured" diagramType="timeline">
      <svg {...svgBaseProps(width, height, title || 'Timeline diagram')}>
        <line x1={x} x2={x} y1={34} y2={height - 38} stroke={DIAGRAM_PALETTE.teal} strokeWidth="3" />
        {events.map((event, index) => {
          const y = 48 + index * 64
          return (
            <g key={`${event.date || index}-${event.label || index}`}>
              <circle cx={x} cy={y} r={10} fill={DIAGRAM_PALETTE.bg} stroke={DIAGRAM_PALETTE.teal} strokeWidth="3" />
              <SvgText x={62} y={y} maxChars={10} anchor="end" size={12} fill={DIAGRAM_PALETTE.cyan}>{text(event.date, `T${index + 1}`)}</SvgText>
              <rect x={132} y={y - 26} width={500} height={52} rx={14} fill={DIAGRAM_PALETTE.surface2} stroke={DIAGRAM_PALETTE.border} />
              <SvgText x={152} y={y - 7} maxChars={50} anchor="start" maxLines={1}>{text(event.label, `Event ${index + 1}`)}</SvgText>
              <SvgText x={152} y={y + 12} maxChars={56} anchor="start" size={11} weight={650} fill={DIAGRAM_PALETTE.muted} maxLines={1}>
                {text(event.description)}
              </SvgText>
            </g>
          )
        })}
      </svg>
    </DiagramFrame>
  )
}
