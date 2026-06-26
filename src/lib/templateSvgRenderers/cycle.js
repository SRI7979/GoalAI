import { COLORS } from './theme'
import { arrowMarker, labelBox, normalizeItems, polarPoint, svgFrame, textLines, wrapText } from './utils'

export function renderCycleSvg(data = {}, title = 'Cycle') {
  const stages = normalizeItems(data.stages, 8)
  const cx = 450
  const cy = 300
  const radius = stages.length > 6 ? 172 : 150
  const points = stages.map((_, index) => polarPoint(cx, cy, radius, index, stages.length))
  const edges = points.map((point, index) => {
    const next = points[(index + 1) % points.length]
    return `<path d="M${point.x} ${point.y} Q${cx} ${cy} ${next.x} ${next.y}" fill="none" stroke="${COLORS.teal}" stroke-width="3" opacity="0.68" marker-end="url(#template-cycle-arrow)"/>`
  }).join('\n')
  const boxes = stages.map((stage, index) => labelBox({
    x: points[index].x - 82,
    y: points[index].y - 28,
    width: 164,
    height: 56,
    label: stage.label || `Stage ${index + 1}`,
    maxChars: 18,
  })).join('\n')
  return svgFrame({
    title,
    caption: data.caption,
    children: `<defs>${arrowMarker('template-cycle-arrow', COLORS.teal)}</defs>
<circle cx="${cx}" cy="${cy}" r="72" fill="#0f2b35" stroke="${COLORS.border}" stroke-width="2"/>
${textLines({ x: cx, y: cy + 5, lines: wrapText(data.centerLabel || 'Cycle', 16, 2), size: 16, fill: COLORS.teal })}
${edges}
${boxes}`,
  })
}
