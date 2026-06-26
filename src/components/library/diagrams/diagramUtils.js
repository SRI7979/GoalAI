import { DIAGRAM_FONT, DIAGRAM_PALETTE } from './palette'

export function clamp(value, min, max, fallback = min) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return fallback
  return Math.max(min, Math.min(max, numeric))
}

export function text(value, fallback = '') {
  return String(value || fallback || '').trim()
}

export function list(value, max = 12) {
  return Array.isArray(value) ? value.slice(0, max) : []
}

export function wrapText(value, maxChars = 22, maxLines = 3) {
  const words = text(value).split(/\s+/).filter(Boolean)
  const lines = []
  let current = ''

  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word
    if (next.length > maxChars && current) {
      lines.push(current)
      current = word
    } else {
      current = next
    }
  })
  if (current) lines.push(current)

  if (lines.length > maxLines) {
    return [...lines.slice(0, maxLines - 1), `${lines.slice(maxLines - 1).join(' ').slice(0, maxChars - 1)}...`]
  }
  return lines.length ? lines : ['']
}

export function SvgText({
  children,
  x,
  y,
  maxChars = 22,
  maxLines = 3,
  anchor = 'middle',
  size = 13,
  weight = 800,
  fill = DIAGRAM_PALETTE.text,
  lineHeight = 16,
}) {
  const lines = wrapText(children, maxChars, maxLines)
  const offset = -((lines.length - 1) * lineHeight) / 2
  return (
    <text
      x={x}
      y={y}
      textAnchor={anchor}
      dominantBaseline="middle"
      fill={fill}
      fontFamily={DIAGRAM_FONT}
      fontSize={size}
      fontWeight={weight}
    >
      {lines.map((line, index) => (
        <tspan x={x} dy={index === 0 ? offset : lineHeight} key={`${line}-${index}`}>
          {line}
        </tspan>
      ))}
    </text>
  )
}

export function ArrowDefs({ id = 'diagram-arrow', color = DIAGRAM_PALETTE.teal }) {
  return (
    <defs>
      <marker
        id={id}
        markerWidth="10"
        markerHeight="10"
        refX="8"
        refY="3"
        orient="auto"
        markerUnits="strokeWidth"
      >
        <path d="M0,0 L8,3 L0,6 Z" fill={color} />
      </marker>
    </defs>
  )
}

export function nodeById(nodes = []) {
  return new Map(list(nodes, 80).map((node, index) => [text(node.id, `node_${index}`), node]))
}

export function polarPoint(cx, cy, radius, index, count, start = -Math.PI / 2) {
  const angle = start + ((Math.PI * 2 * index) / Math.max(1, count))
  return {
    x: cx + Math.cos(angle) * radius,
    y: cy + Math.sin(angle) * radius,
  }
}

export function svgBaseProps(width, height, label) {
  return {
    width: '100%',
    viewBox: `0 0 ${width} ${height}`,
    role: 'img',
    'aria-label': label,
    style: { display: 'block', maxWidth: '100%', height: 'auto' },
  }
}
