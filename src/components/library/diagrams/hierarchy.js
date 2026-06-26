'use client'

import DiagramFrame from './DiagramFrame'
import { ArrowDefs, SvgText, list, svgBaseProps, text } from './diagramUtils'
import { DIAGRAM_PALETTE } from './palette'

function flatten(root = {}, depth = 0, parent = null, rows = []) {
  const id = text(root.id, `${parent || 'root'}_${rows.length}`)
  rows.push({ id, parent, depth, label: text(root.label, root.name || 'Concept') })
  list(root.children, 8).forEach((child) => flatten(child, depth + 1, id, rows))
  return rows
}

export default function HierarchyDiagram({ data = {}, title }) {
  const root = data.root || { label: data.label || 'Root', children: data.children || [] }
  const rows = flatten(root).slice(0, 18)
  const width = 720
  const height = Math.max(220, 90 + rows.length * 46)

  return (
    <DiagramFrame title={title} caption={data.caption} tier="structured" diagramType="hierarchy">
      <svg {...svgBaseProps(width, height, title || 'Hierarchy diagram')}>
        <ArrowDefs id="hierarchy-arrow" color={DIAGRAM_PALETTE.blue} />
        {rows.map((row, index) => {
          const x = 72 + row.depth * 140
          const y = 42 + index * 46
          const parentIndex = rows.findIndex((item) => item.id === row.parent)
          const parent = rows[parentIndex]
          const parentX = parent ? 72 + parent.depth * 140 + 108 : 0
          const parentY = parent ? 42 + parentIndex * 46 : 0
          return (
            <g key={row.id}>
              {parent ? (
                <path d={`M${parentX},${parentY} L${x - 12},${y}`} stroke={DIAGRAM_PALETTE.blue} strokeWidth="2" fill="none" markerEnd="url(#hierarchy-arrow)" />
              ) : null}
              <rect x={x} y={y - 20} width={116} height={40} rx={12} fill={row.depth === 0 ? 'rgba(14,245,194,0.18)' : DIAGRAM_PALETTE.surface2} stroke={row.depth === 0 ? DIAGRAM_PALETTE.teal : DIAGRAM_PALETTE.border} />
              <SvgText x={x + 58} y={y} maxChars={14} size={12}>{row.label}</SvgText>
            </g>
          )
        })}
      </svg>
    </DiagramFrame>
  )
}
