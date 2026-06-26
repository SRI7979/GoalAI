'use client'

import DiagramFrame from './DiagramFrame'
import { SvgText, list, nodeById, polarPoint, svgBaseProps, text } from './diagramUtils'
import { DIAGRAM_PALETTE } from './palette'

export default function NetworkDiagram({ data = {}, title }) {
  const nodes = list(data.nodes, 12).map((node, index) => ({
    id: text(node.id, `node_${index}`),
    label: text(node.label, `Node ${index + 1}`),
  }))
  const edges = list(data.edges, 20)
  const nodeMap = nodeById(nodes)
  const width = 720
  const height = 430
  const points = new Map(nodes.map((node, index) => [node.id, polarPoint(360, 215, 132, index, nodes.length)]))

  return (
    <DiagramFrame title={title} caption={data.caption} tier="structured" diagramType="network">
      <svg {...svgBaseProps(width, height, title || 'Network diagram')}>
        {edges.map((edge, index) => {
          const from = points.get(text(edge.from))
          const to = points.get(text(edge.to))
          if (!from || !to || !nodeMap.has(text(edge.from)) || !nodeMap.has(text(edge.to))) return null
          return <line key={`${edge.from}-${edge.to}-${index}`} x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke="rgba(143,183,255,0.45)" strokeWidth="2" />
        })}
        {nodes.map((node) => {
          const point = points.get(node.id)
          return (
            <g key={node.id}>
              <circle cx={point.x} cy={point.y} r={42} fill={DIAGRAM_PALETTE.surface2} stroke={DIAGRAM_PALETTE.teal} strokeWidth="2" />
              <SvgText x={point.x} y={point.y} maxChars={12} maxLines={2} size={11}>{node.label}</SvgText>
            </g>
          )
        })}
      </svg>
    </DiagramFrame>
  )
}
