import { COLORS } from './theme'
import { normalizeItems, svgFrame, textLines, wrapText } from './utils'

export function renderVennSvg(data = {}, title = 'Venn Diagram') {
  const sets = normalizeItems(data.sets, 3)
  const configs = sets.length === 3
    ? [{ x: 382, y: 270, color: COLORS.teal }, { x: 518, y: 270, color: COLORS.cyan }, { x: 450, y: 360, color: COLORS.yellow }]
    : [{ x: 390, y: 310, color: COLORS.teal }, { x: 510, y: 310, color: COLORS.cyan }]
  const circles = sets.map((set, index) => `<circle cx="${configs[index].x}" cy="${configs[index].y}" r="125" fill="${configs[index].color}" fill-opacity="0.18" stroke="${configs[index].color}" stroke-width="4"/>
${textLines({ x: configs[index].x, y: configs[index].y - 88, lines: wrapText(set.label, 16, 2), size: 15, fill: COLORS.text })}
${(set.items || []).slice(0, 3).map((item, itemIndex) => textLines({ x: configs[index].x, y: configs[index].y - 25 + itemIndex * 24, lines: wrapText(item, 16, 1), size: 12, fill: COLORS.text })).join('\n')}`).join('\n')
  return svgFrame({ title, caption: data.caption, children: circles })
}
