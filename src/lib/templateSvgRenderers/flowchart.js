import { COLORS } from './theme'
import { arrowMarker, labelBox, normalizeItems, svgFrame } from './utils'

export function renderFlowchartSvg(data = {}, title = 'Flowchart') {
  const nodes = normalizeItems(data.nodes, 12)
  const edges = normalizeItems(data.edges, 24)
  const twoColumn = nodes.length > 7
  const columns = twoColumn ? 2 : 1
  const rows = Math.ceil(nodes.length / columns)
  const nodeW = twoColumn ? 250 : 330
  const nodeH = 52
  const colXs = twoColumn ? [185, 465] : [285]
  const rowGap = rows <= 1 ? 0 : Math.min(70, 330 / (rows - 1))
  const positions = new Map()
  nodes.forEach((node, index) => {
    const col = twoColumn ? Math.floor(index / rows) : 0
    const row = twoColumn ? index % rows : index
    positions.set(node.id, {
      x: colXs[col],
      y: 132 + row * rowGap,
      cx: colXs[col] + nodeW / 2,
      cy: 132 + row * rowGap + nodeH / 2,
    })
  })
  const edgeMarkup = edges.map((edge, index) => {
    const from = positions.get(edge.from)
    const to = positions.get(edge.to)
    if (!from || !to) return ''
    const direct = Math.abs(from.cx - to.cx) < 4
    const startY = from.cy + nodeH / 2
    const endY = to.cy - nodeH / 2
    const d = direct
      ? `M${from.cx} ${startY} C${from.cx} ${startY + 22}, ${to.cx} ${endY - 22}, ${to.cx} ${endY}`
      : `M${from.cx + nodeW / 2} ${from.cy} C${from.cx + 70} ${from.cy}, ${to.cx - 70} ${to.cy}, ${to.cx - nodeW / 2} ${to.cy}`
    return `<path d="${d}" fill="none" stroke="${COLORS.teal}" stroke-width="3" stroke-linecap="round" marker-end="url(#template-flow-arrow)" opacity="${index > 16 ? 0.45 : 0.82}"/>`
  }).join('\n')
  const nodeMarkup = nodes.map((node, index) => {
    const pos = positions.get(node.id)
    return labelBox({
      x: pos.x,
      y: pos.y,
      width: nodeW,
      height: nodeH,
      label: node.label || `Step ${index + 1}`,
      maxChars: twoColumn ? 22 : 30,
      stroke: COLORS.teal,
    })
  }).join('\n')
  return svgFrame({
    title,
    caption: data.caption,
    children: `<defs>${arrowMarker('template-flow-arrow', COLORS.teal)}</defs>${edgeMarkup}${nodeMarkup}`,
  })
}
