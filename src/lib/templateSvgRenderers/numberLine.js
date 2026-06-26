import { COLORS } from './theme'
import { arrowMarker, clamp, normalizeItems, svgFrame, textLines, wrapText } from './utils'

export function renderNumberLineSvg(data = {}, title = 'Number Line') {
  const min = Number(data.min)
  const max = Number(data.max)
  const startX = 130
  const endX = 770
  const axisY = 310
  const scale = (value) => startX + ((Number(value) - min) / (max - min)) * (endX - startX)
  const ticks = normalizeItems(data.ticks, 24).map((tick) => {
    const x = clamp(scale(tick), startX, endX)
    return `<line x1="${x}" y1="${axisY - 15}" x2="${x}" y2="${axisY + 15}" stroke="${COLORS.muted}" stroke-width="2"/>
${textLines({ x, y: axisY + 44, lines: [String(tick)], size: 13, fill: COLORS.muted })}`
  }).join('\n')
  const intervals = normalizeItems(data.intervals, 6).map((interval) => {
    const x1 = clamp(scale(interval.from), startX, endX)
    const x2 = clamp(scale(interval.to), startX, endX)
    return `<line x1="${Math.min(x1, x2)}" y1="${axisY}" x2="${Math.max(x1, x2)}" y2="${axisY}" stroke="${COLORS.teal}" stroke-width="9" stroke-linecap="round"/>`
  }).join('\n')
  const marks = normalizeItems(data.marks, 8).map((mark) => {
    const x = clamp(scale(mark.value), startX, endX)
    const fill = mark.kind === 'open' ? COLORS.bg : COLORS.teal
    return `<circle cx="${x}" cy="${axisY}" r="13" fill="${fill}" stroke="${COLORS.teal}" stroke-width="4"/>
${textLines({ x, y: axisY - 48, lines: wrapText(mark.label || String(mark.value), 16, 1), size: 14, fill: COLORS.text })}`
  }).join('\n')
  return svgFrame({
    title,
    caption: data.caption,
    children: `<defs>${arrowMarker('template-number-arrow', COLORS.muted)}</defs>
<line x1="${startX - 20}" y1="${axisY}" x2="${endX + 20}" y2="${axisY}" stroke="${COLORS.muted}" stroke-width="5" stroke-linecap="round" marker-end="url(#template-number-arrow)"/>
${intervals}${ticks}${marks}`,
  })
}
