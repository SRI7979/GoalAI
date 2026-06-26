import { COLORS } from './theme'
import { labelBox, normalizeItems, svgFrame, textLines, wrapText } from './utils'

export function renderAnnotatedCalloutsSvg(data = {}, title = 'Annotated Diagram') {
  const callouts = normalizeItems(data.callouts, 8)
  const center = { x: 450, y: 300 }
  const labels = callouts.map((callout, index) => {
    const target = { x: 300 + callout.x * 300, y: 185 + callout.y * 210 }
    const side = index % 2 === 0 ? 120 : 620
    const y = 140 + (index % 4) * 82
    return `<circle cx="${target.x}" cy="${target.y}" r="8" fill="${COLORS.yellow}"/>
<path d="M${target.x} ${target.y} C${side === 120 ? target.x - 60 : target.x + 60} ${target.y}, ${side + 80} ${y + 24}, ${side + 4} ${y + 24}" fill="none" stroke="${COLORS.line}" stroke-width="2"/>
${labelBox({ x: side, y, width: 160, height: 54, label: callout.label || `Callout ${index + 1}`, maxChars: 18 })}`
  }).join('\n')
  return svgFrame({
    title,
    caption: data.caption,
    children: `<ellipse cx="${center.x}" cy="${center.y}" rx="160" ry="112" fill="${COLORS.panel2}" stroke="${COLORS.teal}" stroke-width="3"/>
${textLines({ x: center.x, y: center.y + 4, lines: wrapText(data.baseLabel || 'Structure', 22, 2), size: 20, fill: COLORS.text })}
${labels}`,
  })
}
