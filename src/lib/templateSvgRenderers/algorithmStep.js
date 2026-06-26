import { COLORS } from './theme'
import { normalizeItems, svgFrame, textLines, wrapText } from './utils'

export function renderAlgorithmStepSvg(data = {}, title = 'Algorithm Step') {
  const state = Array.isArray(data.steps?.[data.steps.length - 1]?.state)
    ? data.steps[data.steps.length - 1].state
    : Array.isArray(data.initialState) ? data.initialState : []
  const latest = data.steps?.[data.steps.length - 1] || {}
  const pseudo = normalizeItems(data.pseudocode, 8)
  const cellW = Math.min(74, 560 / Math.max(1, state.length))
  const startX = 125
  const arrayMarkup = state.slice(0, 12).map((item, index) => {
    const x = startX + index * cellW
    const active = latest.highlight?.nodeIds?.includes(String(index)) || latest.highlight?.nodeIds?.includes(String(item))
    return `<rect x="${x}" y="224" width="${cellW - 6}" height="64" rx="12" fill="${active ? '#123044' : COLORS.panel2}" stroke="${active ? COLORS.teal : COLORS.border}" stroke-width="2"/>
${textLines({ x: x + (cellW - 6) / 2, y: 263, lines: wrapText(item, 8, 1), size: 16, fill: COLORS.text })}`
  }).join('\n')
  const pseudoMarkup = pseudo.map((line, index) => {
    const active = index + 1 === latest.pseudocodeLine
    return `${active ? `<rect x="610" y="${154 + index * 32}" width="198" height="26" rx="8" fill="#123044" stroke="${COLORS.cyan}" stroke-width="1"/>` : ''}
${textLines({ x: 622, y: 173 + index * 32, lines: wrapText(`${index + 1}. ${line}`, 28, 1), size: 12, fill: COLORS.text, anchor: 'start' })}`
  }).join('\n')
  return svgFrame({
    title,
    caption: data.caption || latest.caption,
    children: `<rect x="96" y="142" width="478" height="250" rx="20" fill="#081321" stroke="${COLORS.border}" stroke-width="2"/>
${textLines({ x: 335, y: 178, lines: wrapText(latest.highlight?.operation || 'Current operation', 38, 1), size: 17, fill: COLORS.teal })}
${arrayMarkup}
<rect x="592" y="130" width="232" height="296" rx="18" fill="${COLORS.panel2}" stroke="${COLORS.border}" stroke-width="2"/>
${textLines({ x: 708, y: 122, lines: ['Pseudocode'], size: 15, fill: COLORS.cyan })}
${pseudoMarkup}`,
  })
}
