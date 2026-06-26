import { COLORS } from './theme'
import { labelBox, svgFrame } from './utils'

function collectLevels(root, levels = [], depth = 0) {
  if (!root || depth > 3) return levels
  if (!levels[depth]) levels[depth] = []
  levels[depth].push(root)
  ;(root.children || []).forEach((child) => collectLevels(child, levels, depth + 1))
  return levels
}

export function renderHierarchySvg(data = {}, title = 'Hierarchy') {
  const root = data.root || { id: 'root', label: 'Root', children: [] }
  const levels = collectLevels(root).slice(0, 4)
  const positions = new Map()
  levels.forEach((items, depth) => {
    const y = 128 + depth * 100
    const step = 700 / Math.max(1, items.length)
    items.forEach((item, index) => {
      positions.set(item.id, { x: 100 + step * index + step / 2, y })
    })
  })
  const connectors = []
  function walk(node) {
    const from = positions.get(node.id)
    ;(node.children || []).forEach((child) => {
      const to = positions.get(child.id)
      if (from && to) connectors.push(`<path d="M${from.x} ${from.y + 28} V${to.y - 34} H${to.x} V${to.y - 28}" fill="none" stroke="${COLORS.line}" stroke-width="2.5"/>`)
      walk(child)
    })
  }
  walk(root)
  const boxes = levels.flatMap((items, depth) => items.map((item) => {
    const pos = positions.get(item.id)
    return labelBox({
      x: pos.x - 88,
      y: pos.y - 28,
      width: 176,
      height: 56,
      label: item.label,
      maxChars: 20,
      stroke: depth === 0 ? COLORS.teal : COLORS.border,
    })
  })).join('\n')
  return svgFrame({ title, caption: data.caption, children: `${connectors.join('\n')}${boxes}` })
}
