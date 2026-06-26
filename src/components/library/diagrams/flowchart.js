'use client'

import DiagramFrame from './DiagramFrame'
import { ArrowDefs, SvgText, list, nodeById, svgBaseProps, text } from './diagramUtils'
import { DIAGRAM_PALETTE } from './palette'

export default function FlowchartDiagram({ data = {}, title }) {
  const nodes = list(data.nodes, 8).map((node, index) => ({
    id: text(node.id, `node_${index}`),
    label: text(node.label, `Step ${index + 1}`),
  }))
  const edges = list(data.edges, 12)
  const nodeMap = nodeById(nodes)
  const width = 720
  const height = Math.max(190, 84 + nodes.length * 74)
  const x = 360

  return (
    <DiagramFrame title={title} caption={data.caption} tier="structured" diagramType="flowchart">
      <svg {...svgBaseProps(width, height, title || 'Flowchart diagram')}>
        <ArrowDefs id="flow-arrow" />
        {nodes.map((node, index) => {
          const y = 44 + index * 74
          return (
            <g key={node.id}>
              <rect x={230} y={y - 24} width={260} height={48} rx={14} fill={DIAGRAM_PALETTE.surface2} stroke={DIAGRAM_PALETTE.border} />
              <SvgText x={x} y={y} maxChars={30}>{node.label}</SvgText>
            </g>
          )
        })}
        {edges.map((edge, index) => {
          const fromIndex = nodes.findIndex((node) => node.id === text(edge.from))
          const toIndex = nodes.findIndex((node) => node.id === text(edge.to))
          if (!nodeMap.has(text(edge.from)) || !nodeMap.has(text(edge.to)) || fromIndex < 0 || toIndex < 0) return null
          const fromY = 44 + fromIndex * 74 + 24
          const toY = 44 + toIndex * 74 - 24
          return (
            <path
              key={`${edge.from}-${edge.to}-${index}`}
              d={`M${x},${fromY} C${x},${fromY + 22} ${x},${toY - 22} ${x},${toY}`}
              fill="none"
              stroke={DIAGRAM_PALETTE.teal}
              strokeWidth="2.5"
              markerEnd="url(#flow-arrow)"
            />
          )
        })}
      </svg>
    </DiagramFrame>
  )
}
