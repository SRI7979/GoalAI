import { COLORS, SAFE, SVG_HEIGHT, SVG_WIDTH } from './theme'

export function escapeXml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export function clamp(value, min, max) {
  const number = Number(value)
  if (!Number.isFinite(number)) return min
  return Math.max(min, Math.min(max, number))
}

export function wrapText(value = '', maxChars = 22, maxLines = 3) {
  const words = String(value || '').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean)
  if (!words.length) return ['']
  const lines = []
  let current = ''
  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word
    if (next.length <= maxChars || !current) {
      current = next
    } else {
      lines.push(current)
      current = word
    }
  })
  if (current) lines.push(current)
  if (lines.length <= maxLines) return lines
  const kept = lines.slice(0, maxLines)
  kept[maxLines - 1] = `${kept[maxLines - 1].replace(/\s+$/, '')}...`
  return kept
}

export function textLines({
  x,
  y,
  lines,
  anchor = 'middle',
  size = 15,
  weight = 700,
  fill = COLORS.text,
  lineHeight = 1.25,
  className = '',
}) {
  const usable = Array.isArray(lines) ? lines : wrapText(lines)
  const startY = y - ((usable.length - 1) * size * lineHeight) / 2
  return `<text x="${x}" y="${startY}" text-anchor="${anchor}" font-size="${size}" font-weight="${weight}" fill="${fill}"${className ? ` class="${escapeXml(className)}"` : ''}>${usable.map((line, index) => `<tspan x="${x}" dy="${index === 0 ? 0 : size * lineHeight}">${escapeXml(line)}</tspan>`).join('')}</text>`
}

export function labelBox({
  x,
  y,
  width,
  height,
  label,
  maxChars = 24,
  fill = COLORS.panel,
  stroke = COLORS.border,
  textFill = COLORS.text,
  size = 15,
  weight = 800,
  rx = 16,
}) {
  const safeX = clamp(x, SAFE.left, SAFE.right - width)
  const safeY = clamp(y, SAFE.top, SAFE.bottom - height)
  return `<rect x="${safeX}" y="${safeY}" width="${width}" height="${height}" rx="${rx}" fill="${fill}" stroke="${stroke}" stroke-width="2"/>
${textLines({ x: safeX + width / 2, y: safeY + height / 2 + size * 0.35, lines: wrapText(label, maxChars, 2), fill: textFill, size, weight })}`
}

export function arrowMarker(id = 'arrow', color = COLORS.teal) {
  return `<marker id="${escapeXml(id)}" markerWidth="12" markerHeight="12" refX="10" refY="4" orient="auto"><path d="M0,0 L10,4 L0,8 Z" fill="${color}"/></marker>`
}

export function svgFrame({ title = 'Diagram', caption = '', children = '', aria = '' }) {
  const safeTitle = String(title || 'Diagram').slice(0, 120)
  const captionLines = caption ? wrapText(caption, 86, 2) : []
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SVG_WIDTH} ${SVG_HEIGHT}" role="img" aria-label="${escapeXml(aria || safeTitle)}">
  <rect x="18" y="18" width="864" height="564" rx="24" fill="${COLORS.bg}" stroke="${COLORS.border}" stroke-width="2"/>
  <rect x="58" y="82" width="784" height="${captionLines.length ? 430 : 462}" rx="24" fill="${COLORS.panel}" stroke="${COLORS.border}" stroke-width="2"/>
  ${textLines({ x: 450, y: 56, lines: wrapText(safeTitle, 46, 2), size: 27, weight: 800 })}
  ${children}
  ${captionLines.length ? `<rect x="110" y="520" width="680" height="38" rx="14" fill="#081321" stroke="${COLORS.border}" stroke-width="1.5"/>${textLines({ x: 450, y: captionLines.length > 1 ? 535 : 542, lines: captionLines, size: 13, weight: 600, fill: COLORS.muted })}` : ''}
</svg>`
}

export function polarPoint(cx, cy, radius, index, total, offset = -Math.PI / 2) {
  const angle = offset + (index / Math.max(1, total)) * Math.PI * 2
  return {
    x: cx + Math.cos(angle) * radius,
    y: cy + Math.sin(angle) * radius,
  }
}

export function distribute(count, start, end) {
  if (count <= 1) return [(start + end) / 2]
  const step = (end - start) / (count - 1)
  return Array.from({ length: count }, (_, index) => start + step * index)
}

export function normalizeItems(items = [], max = 12) {
  return Array.isArray(items) ? items.slice(0, max) : []
}

export function cleanText(value = '', fallback = '') {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim()
  return text || fallback
}

export function pathD(points = []) {
  return points.map((point, index) => `${index === 0 ? 'M' : 'L'}${Number(point.x.toFixed(1))} ${Number(point.y.toFixed(1))}`).join(' ')
}
