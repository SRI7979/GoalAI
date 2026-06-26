import { COLORS } from './theme'
import { normalizeItems, svgFrame, textLines, wrapText } from './utils'

export function renderCodeExecutionSvg(data = {}, title = 'Code Execution') {
  const lines = String(data.code || '').split('\n').slice(0, 10)
  const steps = normalizeItems(data.steps, 8)
  const activeLine = steps[steps.length - 1]?.line || 1
  const latest = steps[steps.length - 1] || {}
  const vars = Object.entries(latest.variables || {}).slice(0, 6)
  const codeMarkup = lines.map((line, index) => {
    const y = 158 + index * 28
    const active = index + 1 === activeLine
    return `${active ? `<rect x="112" y="${y - 20}" width="410" height="27" rx="8" fill="#123044" stroke="${COLORS.cyan}" stroke-width="1.5"/>` : ''}
<text x="128" y="${y}" font-size="14" fill="${COLORS.muted}" font-family="monospace">${index + 1}</text>
<text x="166" y="${y}" font-size="15" fill="${COLORS.text}" font-family="monospace">${line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</text>`
  }).join('\n')
  const varsMarkup = vars.length
    ? vars.map(([key, value], index) => textLines({ x: 640, y: 174 + index * 34, lines: wrapText(`${key} = ${JSON.stringify(value)}`, 24, 1), size: 14, fill: COLORS.text, anchor: 'start' })).join('\n')
    : textLines({ x: 640, y: 190, lines: ['No variables yet'], size: 14, fill: COLORS.muted, anchor: 'start' })
  return svgFrame({
    title,
    caption: data.caption || latest.explanation,
    children: `<rect x="96" y="120" width="448" height="300" rx="18" fill="#050b14" stroke="${COLORS.border}" stroke-width="2"/>
<rect x="574" y="120" width="230" height="190" rx="18" fill="${COLORS.panel2}" stroke="${COLORS.border}" stroke-width="2"/>
${textLines({ x: 640, y: 146, lines: ['Variables'], size: 15, fill: COLORS.teal, anchor: 'start' })}
${codeMarkup}
${varsMarkup}
<rect x="574" y="334" width="230" height="86" rx="18" fill="#050b14" stroke="${COLORS.border}" stroke-width="2"/>
${textLines({ x: 640, y: 362, lines: ['Output'], size: 15, fill: COLORS.teal, anchor: 'start' })}
${textLines({ x: 640, y: 394, lines: wrapText(latest.output || 'No console output', 24, 2), size: 14, fill: COLORS.text, anchor: 'start' })}`,
  })
}
