'use client'

import DiagramFrame from './DiagramFrame'
import { ArrowDefs, SvgText, list, polarPoint, svgBaseProps, text } from './diagramUtils'
import { DIAGRAM_PALETTE } from './palette'

export default function CycleDiagram({ data = {}, title }) {
  const stages = list(data.stages, 8)
  const width = 720
  const height = 420
  const cx = 360
  const cy = 215
  const radius = 132

  return (
    <DiagramFrame title={title} caption={data.caption} tier="structured" diagramType="cycle">
      <svg {...svgBaseProps(width, height, title || 'Cycle diagram')}>
        <ArrowDefs id="cycle-arrow" />
        {stages.map((stage, index) => {
          const point = polarPoint(cx, cy, radius, index, stages.length)
          const next = polarPoint(cx, cy, radius, (index + 1) % stages.length, stages.length)
          return (
            <path
              key={`edge-${index}`}
              d={`M${point.x},${point.y} Q${cx},${cy} ${next.x},${next.y}`}
              stroke={DIAGRAM_PALETTE.teal}
              strokeWidth="2"
              fill="none"
              opacity="0.7"
              markerEnd="url(#cycle-arrow)"
            />
          )
        })}
        <circle cx={cx} cy={cy} r={68} fill="rgba(14,245,194,0.08)" stroke="rgba(14,245,194,0.22)" />
        <SvgText x={cx} y={cy} maxChars={18} fill={DIAGRAM_PALETTE.teal}>{text(data.centerLabel, 'Cycle')}</SvgText>
        {stages.map((stage, index) => {
          const point = polarPoint(cx, cy, radius, index, stages.length)
          return (
            <g key={`${stage.label || index}`}>
              <rect x={point.x - 78} y={point.y - 28} width={156} height={56} rx={16} fill={DIAGRAM_PALETTE.surface2} stroke={DIAGRAM_PALETTE.border} />
              <SvgText x={point.x} y={point.y} maxChars={18} maxLines={2} size={12}>{text(stage.label, `Stage ${index + 1}`)}</SvgText>
            </g>
          )
        })}
      </svg>
    </DiagramFrame>
  )
}
