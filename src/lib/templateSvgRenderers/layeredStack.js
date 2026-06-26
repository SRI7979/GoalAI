import { COLORS } from './theme'
import { labelBox, normalizeItems, svgFrame } from './utils'

export function renderLayeredStackSvg(data = {}, title = 'Layered Stack') {
  const layers = normalizeItems(data.layers, 10)
  const h = Math.min(46, 340 / Math.max(1, layers.length))
  const startY = 450 - h * layers.length
  const markup = layers.map((layer, index) => {
    const y = startY + index * h
    const inset = index * 12
    return labelBox({
      x: 175 + inset,
      y,
      width: 550 - inset * 2,
      height: h - 4,
      label: layer.label || `Layer ${index + 1}`,
      maxChars: 42,
      fill: index % 2 ? COLORS.panel2 : COLORS.panel,
      stroke: index === 0 ? COLORS.teal : COLORS.border,
    })
  }).join('\n')
  return svgFrame({ title, caption: data.caption, children: markup })
}
