'use client'

import DiagramFrame from './DiagramFrame'
import { SvgText, list, svgBaseProps, text } from './diagramUtils'
import { DIAGRAM_PALETTE } from './palette'

export default function QuadrantDiagram({ data = {}, title }) {
  const items = list(data.items || data.quadrants, 8)
  const width = 720
  const height = 430
  const left = 86
  const top = 48
  const size = 300

  return (
    <DiagramFrame title={title} caption={data.caption} tier="structured" diagramType="quadrant">
      <svg {...svgBaseProps(width, height, title || 'Quadrant diagram')}>
        <rect x={left} y={top} width={size * 2} height={size} rx={18} fill={DIAGRAM_PALETTE.surface2} stroke={DIAGRAM_PALETTE.border} />
        <line x1={left + size} x2={left + size} y1={top} y2={top + size} stroke={DIAGRAM_PALETTE.border} strokeWidth="2" />
        <line x1={left} x2={left + size * 2} y1={top + size / 2} y2={top + size / 2} stroke={DIAGRAM_PALETTE.border} strokeWidth="2" />
        <SvgText x={left + size} y={top + size + 34} maxChars={42} fill={DIAGRAM_PALETTE.cyan}>{text(data.xAxis, 'X axis')}</SvgText>
        <g transform={`translate(${left - 44} ${top + size / 2}) rotate(-90)`}>
          <SvgText x={0} y={0} maxChars={34} fill={DIAGRAM_PALETTE.cyan}>{text(data.yAxis, 'Y axis')}</SvgText>
        </g>
        {items.map((item, index) => {
          const quadrant = Number(item.quadrant || index + 1)
          const x = quadrant === 2 || quadrant === 3 ? left + size * 0.5 : left + size * 1.5
          const y = quadrant === 1 || quadrant === 2 ? top + size * 0.25 : top + size * 0.75
          return (
            <g key={`${item.label || index}`}>
              <rect x={x - 104} y={y - 32} width={208} height={64} rx={14} fill="rgba(14,245,194,0.08)" stroke="rgba(14,245,194,0.24)" />
              <SvgText x={x} y={y} maxChars={24} maxLines={2}>{text(item.label, `Quadrant ${quadrant}`)}</SvgText>
            </g>
          )
        })}
      </svg>
    </DiagramFrame>
  )
}
