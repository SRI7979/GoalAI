import { COLORS } from './theme'
import { normalizeItems, svgFrame, textLines, wrapText } from './utils'

export function renderBarChartSvg(data = {}, title = 'Bar Chart') {
  const bars = normalizeItems(data.bars, 10)
  const max = Math.max(...bars.map((bar) => Math.abs(Number(bar.value) || 0)), 1)
  const chart = { x: 135, y: 130, w: 630, h: 320 }
  const barW = Math.min(52, chart.w / Math.max(1, bars.length) - 16)
  const gap = (chart.w - bars.length * barW) / Math.max(1, bars.length + 1)
  const baseline = chart.y + chart.h
  const markup = bars.map((bar, index) => {
    const h = (Math.abs(Number(bar.value) || 0) / max) * 250
    const x = chart.x + gap + index * (barW + gap)
    const y = baseline - h
    return `<rect x="${x}" y="${y}" width="${barW}" height="${h}" rx="10" fill="${COLORS.teal}" opacity="0.86"/>
${textLines({ x: x + barW / 2, y: y - 12, lines: [String(bar.value)], size: 12, fill: COLORS.text })}
${textLines({ x: x + barW / 2, y: baseline + 28, lines: wrapText(bar.label, 10, 2), size: 12, fill: COLORS.muted })}`
  }).join('\n')
  return svgFrame({
    title,
    caption: data.caption,
    children: `<line x1="${chart.x}" y1="${baseline}" x2="${chart.x + chart.w}" y2="${baseline}" stroke="${COLORS.line}" stroke-width="3"/>
<line x1="${chart.x}" y1="${chart.y}" x2="${chart.x}" y2="${baseline}" stroke="${COLORS.line}" stroke-width="3"/>
${markup}
${data.axisLabel ? textLines({ x: 450, y: 492, lines: wrapText(data.axisLabel, 42, 1), size: 13, fill: COLORS.cyan }) : ''}`,
  })
}
