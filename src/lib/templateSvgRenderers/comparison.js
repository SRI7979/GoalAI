import { COLORS } from './theme'
import { normalizeItems, svgFrame, textLines, wrapText } from './utils'

export function renderComparisonSvg(data = {}, title = 'Comparison') {
  const columns = normalizeItems(data.columns, 3)
  const colW = Math.min(232, 700 / Math.max(1, columns.length))
  const gap = 24
  const total = columns.length * colW + (columns.length - 1) * gap
  const startX = 450 - total / 2
  const markup = columns.map((column, index) => {
    const x = startX + index * (colW + gap)
    const rows = normalizeItems(column.rows, 8)
    const rowH = Math.min(38, 290 / Math.max(1, rows.length))
    return `<rect x="${x}" y="130" width="${colW}" height="330" rx="18" fill="${COLORS.panel2}" stroke="${index === 0 ? COLORS.teal : COLORS.border}" stroke-width="2"/>
${textLines({ x: x + colW / 2, y: 164, lines: wrapText(column.label || `Column ${index + 1}`, 20, 2), size: 16, fill: COLORS.teal })}
${rows.map((row, rowIndex) => {
  const label = typeof row === 'string' ? row : `${row.label}${row.value ? `: ${row.value}` : ''}`
  return `<line x1="${x + 16}" y1="${194 + rowIndex * rowH}" x2="${x + colW - 16}" y2="${194 + rowIndex * rowH}" stroke="${COLORS.border}" stroke-width="1"/>
${textLines({ x: x + colW / 2, y: 216 + rowIndex * rowH, lines: wrapText(label, 24, 1), size: 12, weight: 650, fill: COLORS.text })}`
}).join('\n')}`
  }).join('\n')
  return svgFrame({ title, caption: data.caption, children: markup })
}
