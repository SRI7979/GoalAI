import { COLORS } from './theme'
import { arrowMarker, labelBox, normalizeItems, polarPoint, svgFrame, textLines, wrapText } from './utils'

export function renderStateMachineSvg(data = {}, title = 'State Machine') {
  const states = normalizeItems(data.states, 10)
  const transitions = normalizeItems(data.transitions, 18)
  const positions = new Map(states.map((state, index) => [state.id, polarPoint(450, 300, 165, index, states.length)]))
  const edges = transitions.map((transition) => {
    const from = positions.get(transition.from)
    const to = positions.get(transition.to)
    if (!from || !to) return ''
    if (transition.from === transition.to) {
      return `<path d="M${from.x + 36} ${from.y - 18} C${from.x + 92} ${from.y - 88}, ${from.x - 20} ${from.y - 90}, ${from.x - 4} ${from.y - 42}" fill="none" stroke="${COLORS.cyan}" stroke-width="2.5" marker-end="url(#template-state-arrow)"/>`
    }
    const midX = (from.x + to.x) / 2
    const midY = (from.y + to.y) / 2
    return `<path d="M${from.x} ${from.y} Q${midX} ${midY - 34} ${to.x} ${to.y}" fill="none" stroke="${COLORS.cyan}" stroke-width="2.5" marker-end="url(#template-state-arrow)"/>
${transition.label ? textLines({ x: midX, y: midY - 32, lines: wrapText(transition.label, 14, 1), size: 12, fill: COLORS.yellow }) : ''}`
  }).join('\n')
  const nodes = states.map((state) => {
    const p = positions.get(state.id)
    const accept = state.kind === 'accept'
    return `<circle cx="${p.x}" cy="${p.y}" r="${accept ? 42 : 36}" fill="${COLORS.panel2}" stroke="${state.kind === 'start' ? COLORS.yellow : COLORS.teal}" stroke-width="3"/>
${accept ? `<circle cx="${p.x}" cy="${p.y}" r="34" fill="none" stroke="${COLORS.teal}" stroke-width="2"/>` : ''}
${textLines({ x: p.x, y: p.y + 5, lines: wrapText(state.label, 12, 2), size: 13, fill: COLORS.text })}`
  }).join('\n')
  return svgFrame({ title, caption: data.caption, children: `<defs>${arrowMarker('template-state-arrow', COLORS.cyan)}</defs>${edges}${nodes}` })
}
