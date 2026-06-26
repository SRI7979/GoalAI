import { COLORS } from './theme'
import { normalizeItems, svgFrame, textLines, wrapText } from './utils'

const QUADRANT_POINTS = {
  1: { x: 620, y: 190 },
  2: { x: 280, y: 190 },
  3: { x: 280, y: 390 },
  4: { x: 620, y: 390 },
}

export function renderQuadrantSvg(data = {}, title = 'Quadrant') {
  const items = normalizeItems(data.items, 8)
  const grouped = { 1: [], 2: [], 3: [], 4: [] }
  items.forEach((item) => grouped[item.quadrant || 1].push(item))
  const labels = Object.entries(grouped).map(([quadrant, group]) => {
    const base = QUADRANT_POINTS[quadrant]
    return group.slice(0, 3).map((item, index) => textLines({
      x: base.x,
      y: base.y + index * 42,
      lines: wrapText(item.label, 22, 2),
      size: 13,
      fill: COLORS.text,
    })).join('\n')
  }).join('\n')
  return svgFrame({
    title,
    caption: data.caption,
    children: `<rect x="160" y="120" width="580" height="360" rx="18" fill="#081321" stroke="${COLORS.border}" stroke-width="2"/>
<line x1="450" y1="128" x2="450" y2="472" stroke="${COLORS.line}" stroke-width="3"/>
<line x1="168" y1="300" x2="732" y2="300" stroke="${COLORS.line}" stroke-width="3"/>
${textLines({ x: 450, y: 505, lines: wrapText(data.xAxis || 'X axis', 38, 1), size: 15, fill: COLORS.cyan })}
${textLines({ x: 90, y: 300, lines: wrapText(data.yAxis || 'Y axis', 18, 2), size: 15, fill: COLORS.cyan })}
${labels}`,
  })
}
