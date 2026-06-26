'use client'

import DiagramFrame from './DiagramFrame'
import { SvgText, list, svgBaseProps, text } from './diagramUtils'
import { DIAGRAM_PALETTE } from './palette'

export default function ComparisonDiagram({ data = {}, title }) {
  const columns = list(data.columns, 3).map((column, index) => ({
    label: text(column.label, `Option ${index + 1}`),
    rows: list(column.rows, 6).map((row) => (typeof row === 'string' ? { label: row, value: row } : row)),
  }))
  const rowCount = Math.max(1, ...columns.map((column) => column.rows.length))
  const width = 720
  const height = 84 + rowCount * 58
  const colWidth = Math.floor(640 / Math.max(1, columns.length))

  return (
    <DiagramFrame title={title} caption={data.caption} tier="structured" diagramType="comparison">
      <svg {...svgBaseProps(width, height, title || 'Comparison diagram')}>
        {columns.map((column, columnIndex) => {
          const x = 40 + columnIndex * colWidth
          return (
            <g key={column.label}>
              <rect x={x} y={18} width={colWidth - 14} height={height - 36} rx={16} fill={DIAGRAM_PALETTE.surface2} stroke={DIAGRAM_PALETTE.border} />
              <rect x={x} y={18} width={colWidth - 14} height={44} rx={16} fill="rgba(14,245,194,0.14)" stroke={DIAGRAM_PALETTE.teal} />
              <SvgText x={x + (colWidth - 14) / 2} y={40} maxChars={18}>{column.label}</SvgText>
              {Array.from({ length: rowCount }).map((_, rowIndex) => {
                const row = column.rows[rowIndex] || {}
                return (
                  <g key={`${column.label}-${rowIndex}`}>
                    <line x1={x + 12} x2={x + colWidth - 26} y1={78 + rowIndex * 58} y2={78 + rowIndex * 58} stroke="rgba(255,255,255,0.08)" />
                    <SvgText x={x + (colWidth - 14) / 2} y={92 + rowIndex * 58} maxChars={20} maxLines={2} size={12} fill={DIAGRAM_PALETTE.muted}>
                      {text(row.value || row.label, '-')}
                    </SvgText>
                  </g>
                )
              })}
            </g>
          )
        })}
      </svg>
    </DiagramFrame>
  )
}
