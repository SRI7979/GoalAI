'use client'

const font = "'Plus Jakarta Sans','DM Sans',system-ui,sans-serif"

const DIAGRAM_CSS = `
  @keyframes pathaiDiagramNodeIn {
    from { opacity: 0; transform: translate(-50%, -50%) scale(0.85) translateY(10px); }
    to   { opacity: 1; transform: translate(-50%, -50%) scale(1) translateY(0); }
  }
  @keyframes pathaiDiagramLineDraw {
    from { stroke-dashoffset: 220; opacity: 0.3; }
    to   { stroke-dashoffset: 0; opacity: 1; }
  }
  @keyframes pathaiDiagramLabelIn {
    from { opacity: 0; transform: translate(-50%, -50%) scale(0.9); }
    to   { opacity: 1; transform: translate(-50%, -50%) scale(1); }
  }
  @keyframes pathaiDiagramDash {
    from { stroke-dashoffset: 24; }
    to   { stroke-dashoffset: 0; }
  }
  .pathai-diagram-node:hover {
    transform: translate(-50%, -50%) scale(1.04) !important;
    box-shadow: 0 8px 26px rgba(0,0,0,0.34) !important;
  }
  @media (prefers-reduced-motion: reduce) {
    @keyframes pathaiDiagramNodeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes pathaiDiagramLineDraw { from { opacity: 0; } to { opacity: 1; } }
    @keyframes pathaiDiagramLabelIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes pathaiDiagramDash { from { stroke-dashoffset: 0; } to { stroke-dashoffset: 0; } }
  }
`

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function withAlpha(hex = '#0ef5c2', alphaHex = '40') {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return `rgba(14,245,194,${parseInt(alphaHex, 16) / 255})`
  return `${hex}${alphaHex}`
}

function layoutNodes(type, nodes) {
  const safeNodes = nodes.length > 0 ? nodes : [{ id: 'concept', label: 'Key idea', color: '#0ef5c2' }]
  const count = safeNodes.length

  if (type === 'steps') {
    return safeNodes.map((node, index) => ({
      ...node,
      x: count === 1 ? 50 : 10 + index * (80 / Math.max(1, count - 1)),
      y: 50,
    }))
  }

  if (type === 'cycle') {
    return safeNodes.map((node, index) => {
      const angle = (Math.PI * 2 * index) / count - Math.PI / 2
      return {
        ...node,
        x: 50 + Math.cos(angle) * 32,
        y: 52 + Math.sin(angle) * 30,
      }
    })
  }

  if (type === 'comparison') {
    return safeNodes.map((node, index) => {
      const column = index % 2
      const row = Math.floor(index / 2)
      const totalRows = Math.ceil(count / 2)
      return {
        ...node,
        x: column === 0 ? 25 : 75,
        y: totalRows === 1 ? 55 : 24 + row * (58 / Math.max(1, totalRows - 1)),
      }
    })
  }

  if (type === 'hierarchy') {
    return safeNodes.map((node, index) => {
      if (index === 0) return { ...node, x: 50, y: 20 }
      const childCount = count - 1
      return {
        ...node,
        x: childCount === 1 ? 50 : 16 + (index - 1) * (68 / Math.max(1, childCount - 1)),
        y: count > 4 ? 70 + ((index - 1) % 2) * 12 : 70,
      }
    })
  }

  return safeNodes.map((node, index) => ({
    ...node,
    x: 50,
    y: count === 1 ? 50 : 16 + index * (68 / Math.max(1, count - 1)),
  }))
}

function defaultConnections(type, positionedNodes) {
  if (positionedNodes.length < 2) return []
  if (type === 'hierarchy') {
    return positionedNodes.slice(1).map((node) => ({
      from: positionedNodes[0].id,
      to: node.id,
      label: node.edgeLabel || 'supports',
    }))
  }
  if (type === 'comparison') {
    const lines = []
    for (let index = 0; index < positionedNodes.length - 1; index += 2) {
      if (positionedNodes[index + 1]) {
        lines.push({
          from: positionedNodes[index].id,
          to: positionedNodes[index + 1].id,
          label: positionedNodes[index].edgeLabel || 'compare',
        })
      }
    }
    return lines
  }
  if (type === 'cycle') {
    return positionedNodes.map((node, index) => ({
      from: node.id,
      to: positionedNodes[(index + 1) % positionedNodes.length].id,
      label: index === 0 ? 'loops' : '',
    }))
  }
  return positionedNodes.slice(0, -1).map((node, index) => ({
    from: node.id,
    to: positionedNodes[index + 1].id,
    label: node.edgeLabel || (type === 'steps' ? 'then' : 'next'),
  }))
}

function buildPath(from, to, type) {
  const x1 = from.x
  const y1 = from.y
  const x2 = to.x
  const y2 = to.y

  if (type === 'steps' || type === 'comparison') {
    const midX = (x1 + x2) / 2
    const lift = type === 'comparison' ? -8 : -12
    return `M ${x1} ${y1} Q ${midX} ${(y1 + y2) / 2 + lift} ${x2} ${y2}`
  }

  if (type === 'cycle') {
    const midX = (x1 + x2) / 2
    const midY = (y1 + y2) / 2
    const cx = 50 + (midX - 50) * 0.75
    const cy = 52 + (midY - 52) * 0.75
    return `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`
  }

  const controlY = (y1 + y2) / 2
  const controlX = type === 'hierarchy' ? (x1 + x2) / 2 : x1 + (x2 - x1) * 0.4
  return `M ${x1} ${y1} Q ${controlX} ${controlY} ${x2} ${y2}`
}

export function KeyConceptCard({
  term = 'Key concept',
  definition = 'One clear idea to carry into the next step.',
  accent = '#0ef5c2',
}) {
  return (
    <div
      style={{
        width: '100%',
        minHeight: 200,
        display: 'grid',
        placeItems: 'center',
        padding: 20,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 430,
          borderRadius: 24,
          padding: '28px 24px',
          background: `linear-gradient(145deg, ${withAlpha(accent, '18')}, rgba(255,255,255,0.035))`,
          border: `1px solid ${withAlpha(accent, '2e')}`,
          boxShadow: `0 26px 72px rgba(0,0,0,0.26), 0 0 48px ${withAlpha(accent, '14')}`,
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 16,
            left: 16,
            width: 34,
            height: 34,
            borderRadius: 12,
            display: 'grid',
            placeItems: 'center',
            background: withAlpha(accent, '16'),
            border: `1px solid ${withAlpha(accent, '28')}`,
            color: accent,
          }}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18h6" />
            <path d="M10 22h4" />
            <path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.1V17h6v-.2c0-.8.4-1.6 1-2.1A7 7 0 0 0 12 2Z" />
          </svg>
        </div>
        <div style={{ fontFamily: font, fontSize: 24, lineHeight: 1.1, fontWeight: 900, color: accent, letterSpacing: '-0.03em' }}>
          {term}
        </div>
        <p style={{ margin: '14px auto 0', maxWidth: 330, color: '#c8d6e5', fontSize: 14, lineHeight: 1.65 }}>
          {definition}
        </p>
      </div>
    </div>
  )
}

export default function DiagramView({
  type = 'flowchart',
  nodes = [],
  connections = null,
  title = '',
  accent = '#0ef5c2',
  activeConnectionIds = [],
}) {
  const isScrollableSteps = type === 'steps' && nodes.length > 4
  const positionedNodes = layoutNodes(type, nodes.map((node, index) => ({
    id: node.id || `node-${index}`,
    label: node.label || node.title || `Step ${index + 1}`,
    color: node.color || accent,
    edgeLabel: node.edgeLabel,
  })))
  const nodeById = new Map(positionedNodes.map((node) => [node.id, node]))
  const edges = (Array.isArray(connections) && connections.length > 0 ? connections : defaultConnections(type, positionedNodes))
    .map((edge, index) => ({
      id: edge.id || `${edge.from}-${edge.to}-${index}`,
      from: nodeById.get(edge.from) || positionedNodes[edge.from],
      to: nodeById.get(edge.to) || positionedNodes[edge.to],
      label: edge.label || '',
    }))
    .filter((edge) => edge.from && edge.to)

  const height = clamp(210 + positionedNodes.length * 18, 220, 380)

  return (
    <div
      style={{
        minHeight: height,
        width: '100%',
        overflowX: isScrollableSteps ? 'auto' : 'hidden',
        borderRadius: 24,
        background: 'radial-gradient(circle at 50% 40%, rgba(14,245,194,0.10), transparent 52%), rgba(255,255,255,0.025)',
        border: '1px solid rgba(255,255,255,0.08)',
        position: 'relative',
        padding: title ? '34px 16px 16px' : 16,
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 24px 60px rgba(0,0,0,0.22)',
      }}
    >
      <style>{DIAGRAM_CSS}</style>
      {title && (
        <div style={{ position: 'absolute', top: 12, left: 16, zIndex: 3, color: '#8e8e93', fontSize: 11, fontWeight: 900, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
          {title}
        </div>
      )}
      {type === 'comparison' && (
        <>
          <div style={{ position: 'absolute', top: 40, bottom: 18, left: '50%', borderLeft: '1px dashed rgba(255,255,255,0.16)', zIndex: 0 }} />
          <div style={{ position: 'absolute', top: 38, left: '50%', transform: 'translateX(-50%)', width: 34, height: 34, borderRadius: '50%', display: 'grid', placeItems: 'center', background: '#0c1018', border: '1px solid rgba(255,255,255,0.12)', color: '#f5f5f7', fontSize: 11, fontWeight: 900, zIndex: 3 }}>
            VS
          </div>
        </>
      )}
      <div style={{ minWidth: isScrollableSteps ? Math.max(680, positionedNodes.length * 170) : '100%', height: height - 34, position: 'relative' }}>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible', zIndex: 1 }}>
          {edges.map((edge, index) => {
            const isActive = activeConnectionIds.includes(edge.id)
            const color = edge.from.color || accent
            return (
              <path
                key={edge.id}
                d={buildPath(edge.from, edge.to, type)}
                fill="none"
                stroke={withAlpha(color, isActive ? 'aa' : '66')}
                strokeWidth={isActive ? 0.95 : 0.75}
                strokeLinecap="round"
                strokeDasharray={isActive ? '4 2' : '220'}
                strokeDashoffset={isActive ? undefined : 220}
                style={{
                  animation: isActive
                    ? 'pathaiDiagramLineDraw 0.55s ease forwards, pathaiDiagramDash 0.75s linear infinite'
                    : `pathaiDiagramLineDraw 0.5s ease ${0.2 + positionedNodes.length * 0.06 + index * 0.05}s forwards`,
                }}
              />
            )
          })}
        </svg>

        {edges.map((edge, index) => {
          if (!edge.label) return null
          const x = (edge.from.x + edge.to.x) / 2
          const y = (edge.from.y + edge.to.y) / 2 - (type === 'steps' ? 10 : 0)
          return (
            <div
              key={`${edge.id}-label`}
              style={{
                position: 'absolute',
                left: `${x}%`,
                top: `${y}%`,
                transform: 'translate(-50%, -50%)',
                zIndex: 4,
                padding: '3px 9px',
                borderRadius: 999,
                background: '#0c1018',
                border: '1px solid rgba(255,255,255,0.10)',
                color: '#8e8e93',
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: '0.03em',
                whiteSpace: 'nowrap',
                opacity: 0,
                animation: `pathaiDiagramLabelIn 0.2s ease ${0.85 + index * 0.04}s forwards`,
              }}
            >
              {edge.label}
            </div>
          )
        })}

        {positionedNodes.map((node, index) => (
          <div
            key={node.id}
            className="pathai-diagram-node"
            style={{
              position: 'absolute',
              left: `${node.x}%`,
              top: `${node.y}%`,
              transform: 'translate(-50%, -50%)',
              minWidth: 140,
              minHeight: 50,
              maxWidth: 180,
              padding: '12px 14px',
              borderRadius: 14,
              background: `linear-gradient(180deg, ${withAlpha(node.color, '22')}, ${withAlpha(node.color, '10')})`,
              border: `1.5px solid ${withAlpha(node.color, '66')}`,
              color: node.color,
              display: 'grid',
              placeItems: 'center',
              textAlign: 'center',
              fontFamily: font,
              fontSize: 13,
              fontWeight: 900,
              lineHeight: 1.25,
              boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
              zIndex: 2,
              opacity: 0,
              animation: `pathaiDiagramNodeIn 0.35s ease-out ${index * 0.06}s forwards`,
              transition: 'transform 0.15s ease, box-shadow 0.15s ease',
            }}
          >
            {node.label}
          </div>
        ))}
      </div>
    </div>
  )
}
