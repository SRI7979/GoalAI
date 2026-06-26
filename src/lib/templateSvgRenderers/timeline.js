import { COLORS } from './theme'
import { arrowMarker, normalizeItems, svgFrame, textLines, wrapText } from './utils'

export function renderTimelineSvg(data = {}, title = 'Timeline') {
  const events = normalizeItems(data.events, 12)
  const startX = 120
  const endX = 780
  const axisY = 306
  const step = events.length <= 1 ? 0 : (endX - startX) / (events.length - 1)
  const points = events.map((_, index) => startX + index * step)
  const items = events.map((event, index) => {
    const x = points[index]
    const above = index % 2 === 0
    const boxY = above ? 176 : 350
    const lineY = above ? boxY + 68 : boxY
    return `<line x1="${x}" y1="${axisY}" x2="${x}" y2="${lineY}" stroke="${COLORS.line}" stroke-width="2"/>
<circle cx="${x}" cy="${axisY}" r="12" fill="${COLORS.teal}" stroke="#ccfbf1" stroke-width="3"/>
<rect x="${x - 70}" y="${boxY}" width="140" height="68" rx="14" fill="${COLORS.panel2}" stroke="${COLORS.border}" stroke-width="2"/>
${textLines({ x, y: boxY + 22, lines: wrapText(event.date || '', 14, 1), size: 12, fill: COLORS.yellow })}
${textLines({ x, y: boxY + 48, lines: wrapText(event.label || `Event ${index + 1}`, 17, 2), size: 13, fill: COLORS.text })}`
  }).join('\n')
  return svgFrame({
    title,
    caption: data.caption,
    children: `<defs>${arrowMarker('template-time-arrow', COLORS.cyan)}</defs>
<path d="M${startX - 20} ${axisY} H${endX + 20}" stroke="${COLORS.cyan}" stroke-width="5" stroke-linecap="round" marker-end="url(#template-time-arrow)"/>
${items}`,
  })
}
