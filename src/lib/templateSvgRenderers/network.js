import { COLORS } from './theme'
import { labelBox, normalizeItems, polarPoint, svgFrame } from './utils'

export function renderNetworkSvg(data = {}, title = 'Network') {
  const nodes = normalizeItems(data.nodes, 16)
  const edges = normalizeItems(data.edges, 30)
  const positions = new Map(nodes.map((node, index) => [node.id, polarPoint(450, 300, nodes.length > 10 ? 188 : 160, index, nodes.length)]))
  const edgeMarkup = edges.map((edge) => {
    const from = positions.get(edge.from)
    const to = positions.get(edge.to)
    if (!from || !to) return ''
    return `<line x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}" stroke="${COLORS.line}" stroke-width="2" opacity="0.65"/>`
  }).join('\n')
  const nodeMarkup = nodes.map((node, index) => {
    const p = positions.get(node.id)
    return labelBox({
      x: p.x - 58,
      y: p.y - 24,
      width: 116,
      height: 48,
      label: node.label || `Node ${index + 1}`,
      maxChars: 14,
      stroke: COLORS.teal,
    })
  }).join('\n')
  return svgFrame({ title, caption: data.caption, children: `${edgeMarkup}${nodeMarkup}` })
}
