import { COLORS } from './theme'
import { labelBox, normalizeItems, svgFrame, textLines, wrapText } from './utils'

export function renderEquationBreakdownSvg(data = {}, title = 'Equation Breakdown') {
  const parts = normalizeItems(data.parts, 8)
  const cols = Math.min(3, Math.max(1, parts.length))
  const rows = Math.ceil(parts.length / cols)
  const cellW = 220
  const startX = 450 - (cols * cellW) / 2
  const markup = parts.map((part, index) => {
    const col = index % cols
    const row = Math.floor(index / cols)
    return labelBox({
      x: startX + col * cellW + 10,
      y: 285 + row * 72,
      width: 200,
      height: 58,
      label: `${part.symbol ? `${part.symbol}: ` : ''}${part.label}`,
      maxChars: 24,
    })
  }).join('\n')
  return svgFrame({
    title,
    caption: data.caption,
    children: `<rect x="155" y="136" width="590" height="92" rx="22" fill="${COLORS.panel2}" stroke="${COLORS.teal}" stroke-width="2"/>
${textLines({ x: 450, y: 191, lines: wrapText(data.equation || 'Equation', 36, 2), size: 28, weight: 800, fill: COLORS.text })}
${rows > 0 ? markup : ''}`,
  })
}
