import { COLORS } from './theme'
import { normalizeItems, svgFrame, textLines, wrapText } from './utils'

export function renderTableSvg(data = {}, title = 'Table') {
  const headers = normalizeItems(data.headers, 6)
  const rows = normalizeItems(data.rows, 10)
  const x = 115
  const y = 126
  const tableW = 670
  const colW = tableW / Math.max(1, headers.length)
  const rowH = Math.min(42, 320 / Math.max(1, rows.length + 1))
  const headerMarkup = headers.map((header, index) => `<rect x="${x + index * colW}" y="${y}" width="${colW}" height="${rowH}" fill="#123044" stroke="${COLORS.border}" stroke-width="1.5"/>
${textLines({ x: x + index * colW + colW / 2, y: y + rowH / 2 + 4, lines: wrapText(header, 16, 1), size: 13, fill: COLORS.teal })}`).join('\n')
  const rowMarkup = rows.map((row, rowIndex) => row.slice(0, headers.length).map((cell, colIndex) => `<rect x="${x + colIndex * colW}" y="${y + (rowIndex + 1) * rowH}" width="${colW}" height="${rowH}" fill="${rowIndex % 2 ? COLORS.panel : COLORS.panel2}" stroke="${COLORS.border}" stroke-width="1"/>
${textLines({ x: x + colIndex * colW + colW / 2, y: y + (rowIndex + 1) * rowH + rowH / 2 + 4, lines: wrapText(cell, 16, 1), size: 12, fill: COLORS.text })}`).join('\n')).join('\n')
  return svgFrame({ title, caption: data.caption, children: `${headerMarkup}${rowMarkup}` })
}
