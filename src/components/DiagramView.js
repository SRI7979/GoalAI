'use client'

import { useId } from 'react'

const font = "'Plus Jakarta Sans','DM Sans',system-ui,sans-serif"

const NODE_W = 188
const NODE_H = 74
const PAD_X = 34
const PAD_Y = 34
const GAP_X = 78
const GAP_Y = 58

const PALETTE = ['#0ef5c2', '#00d4ff', '#a78bfa', '#fbbf24', '#34d399', '#ff8c42']

const DIAGRAM_CSS = `
  @keyframes pathaiDiagramNodeIn {
    from { opacity: 0; transform: translateY(10px) scale(0.96); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }
  @keyframes pathaiDiagramLineIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes pathaiDiagramLabelIn {
    from { opacity: 0; transform: translate(-50%, -50%) scale(0.96); }
    to   { opacity: 1; transform: translate(-50%, -50%) scale(1); }
  }
  .pathai-diagram-node:hover {
    transform: translateY(-3px) scale(1.01) !important;
    box-shadow: 0 20px 42px rgba(0,0,0,0.35) !important;
  }
  .pathai-diagram-scroll::-webkit-scrollbar { height: 7px; }
  .pathai-diagram-scroll::-webkit-scrollbar-thumb {
    background: rgba(255,255,255,0.18);
    border-radius: 999px;
  }
  @media (prefers-reduced-motion: reduce) {
    @keyframes pathaiDiagramNodeIn { from { opacity: 1; transform: none; } to { opacity: 1; transform: none; } }
    @keyframes pathaiDiagramLineIn { from { opacity: 1; } to { opacity: 1; } }
    @keyframes pathaiDiagramLabelIn { from { opacity: 1; transform: translate(-50%, -50%); } to { opacity: 1; transform: translate(-50%, -50%); } }
    .pathai-diagram-node,
    .pathai-diagram-node:hover { transform: none !important; }
  }
`

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function withAlpha(hex = '#0ef5c2', alphaHex = '40') {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return `rgba(14,245,194,${parseInt(alphaHex, 16) / 255})`
  return `${hex}${alphaHex}`
}

function normalizeColor(color, index = 0, accent = '#0ef5c2') {
  if (/^#[0-9a-f]{6}$/i.test(color || '')) return color
  if (/^#[0-9a-f]{6}$/i.test(accent || '') && index === 0) return accent
  return PALETTE[index % PALETTE.length]
}

function shortLabel(value = '', fallback = 'Key idea') {
  const cleaned = String(value || fallback).replace(/\s+/g, ' ').trim()
  const words = cleaned.split(' ').filter(Boolean)
  const clipped = words.length > 9 ? `${words.slice(0, 9).join(' ')}...` : cleaned
  return clipped.length > 86 ? `${clipped.slice(0, 83).trim()}...` : clipped
}

function titleForType(type) {
  if (type === 'steps') return 'Step Map'
  if (type === 'comparison') return 'Compare'
  if (type === 'hierarchy') return 'Concept Map'
  if (type === 'cycle') return 'Cycle'
  return 'Flow Map'
}

function center(node) {
  return {
    x: node.x + node.w / 2,
    y: node.y + node.h / 2,
  }
}

function normalizeNodes(nodes, accent) {
  const safeNodes = Array.isArray(nodes) && nodes.length > 0
    ? nodes.slice(0, 8)
    : [
      { id: 'focus', label: 'Focus', color: accent },
      { id: 'example', label: 'Example', color: '#00d4ff' },
      { id: 'practice', label: 'Practice', color: '#a78bfa' },
    ]

  return safeNodes.map((node, index) => ({
    id: String(node.id || `node-${index}`).trim() || `node-${index}`,
    label: shortLabel(node.label || node.title, index === 0 ? 'Focus' : `Step ${index + 1}`),
    color: normalizeColor(node.color, index, accent),
    edgeLabel: shortLabel(node.edgeLabel || '', ''),
    w: NODE_W,
    h: NODE_H,
  }))
}

function layoutNodes(type, inputNodes) {
  const nodes = inputNodes.map((node) => ({ ...node }))
  const count = nodes.length

  if (type === 'steps') {
    const width = PAD_X * 2 + count * NODE_W + Math.max(0, count - 1) * GAP_X
    const height = PAD_Y * 2 + NODE_H + 72
    nodes.forEach((node, index) => {
      node.x = PAD_X + index * (NODE_W + GAP_X)
      node.y = PAD_Y + 32
    })
    return { nodes, width, height }
  }

  if (type === 'comparison') {
    const rows = Math.max(1, Math.ceil(count / 2))
    const width = Math.max(570, PAD_X * 2 + NODE_W * 2 + 150)
    const height = PAD_Y * 2 + rows * NODE_H + Math.max(0, rows - 1) * 28
    nodes.forEach((node, index) => {
      const column = index % 2
      const row = Math.floor(index / 2)
      node.x = column === 0 ? PAD_X : width - PAD_X - NODE_W
      node.y = PAD_Y + row * (NODE_H + 28)
    })
    return { nodes, width, height: Math.max(240, height) }
  }

  if (type === 'hierarchy') {
    const childCount = Math.max(0, count - 1)
    const columns = Math.max(1, Math.min(3, childCount || 1))
    const rows = Math.max(1, Math.ceil(childCount / columns))
    const width = Math.max(520, PAD_X * 2 + columns * NODE_W + Math.max(0, columns - 1) * 42)
    const height = PAD_Y * 2 + NODE_H + (childCount > 0 ? 86 + rows * NODE_H + Math.max(0, rows - 1) * 30 : 0)
    nodes.forEach((node, index) => {
      if (index === 0) {
        node.x = width / 2 - NODE_W / 2
        node.y = PAD_Y
        return
      }
      const childIndex = index - 1
      const row = Math.floor(childIndex / columns)
      const col = childIndex % columns
      const rowCount = Math.min(columns, childCount - row * columns)
      const rowWidth = rowCount * NODE_W + Math.max(0, rowCount - 1) * 42
      const startX = width / 2 - rowWidth / 2
      node.x = startX + col * (NODE_W + 42)
      node.y = PAD_Y + NODE_H + 86 + row * (NODE_H + 30)
    })
    return { nodes, width, height: Math.max(260, height) }
  }

  if (type === 'cycle') {
    const width = Math.max(560, PAD_X * 2 + 3 * NODE_W)
    const height = 360
    const cx = width / 2
    const cy = height / 2 + 12
    const rx = Math.max(126, width / 2 - NODE_W / 2 - PAD_X)
    const ry = 112
    nodes.forEach((node, index) => {
      const angle = (-Math.PI / 2) + (index * Math.PI * 2) / count
      node.x = cx + Math.cos(angle) * rx - NODE_W / 2
      node.y = cy + Math.sin(angle) * ry - NODE_H / 2
    })
    return { nodes, width, height }
  }

  const width = Math.max(520, PAD_X * 2 + NODE_W)
  const height = PAD_Y * 2 + count * NODE_H + Math.max(0, count - 1) * GAP_Y
  nodes.forEach((node, index) => {
    node.x = width / 2 - NODE_W / 2
    node.y = PAD_Y + index * (NODE_H + GAP_Y)
  })
  return { nodes, width, height: Math.max(260, height) }
}

function defaultConnections(type, nodes) {
  if (nodes.length < 2) return []
  if (type === 'hierarchy') {
    return nodes.slice(1).map((node) => ({ from: nodes[0].id, to: node.id, label: node.edgeLabel || 'supports' }))
  }
  if (type === 'comparison') {
    const lines = []
    for (let index = 0; index < nodes.length - 1; index += 2) {
      if (nodes[index + 1]) lines.push({ from: nodes[index].id, to: nodes[index + 1].id, label: nodes[index].edgeLabel || 'vs' })
    }
    return lines
  }
  if (type === 'cycle') {
    return nodes.map((node, index) => ({ from: node.id, to: nodes[(index + 1) % nodes.length].id, label: node.edgeLabel || '' }))
  }
  return nodes.slice(0, -1).map((node, index) => ({ from: node.id, to: nodes[index + 1].id, label: node.edgeLabel || (type === 'steps' ? 'then' : 'next') }))
}

function edgePoint(from, to) {
  const a = center(from)
  const b = center(to)
  const dx = b.x - a.x
  const dy = b.y - a.y
  if (dx === 0 && dy === 0) return a
  const scaleX = dx === 0 ? Number.POSITIVE_INFINITY : (from.w / 2) / Math.abs(dx)
  const scaleY = dy === 0 ? Number.POSITIVE_INFINITY : (from.h / 2) / Math.abs(dy)
  const scale = Math.min(scaleX, scaleY) * 1.02
  return {
    x: a.x + dx * scale,
    y: a.y + dy * scale,
  }
}

function buildPath(from, to, type) {
  const start = edgePoint(from, to)
  const end = edgePoint(to, from)
  const midX = (start.x + end.x) / 2
  const midY = (start.y + end.y) / 2
  const curveLift = type === 'steps' ? -38 : type === 'cycle' ? -24 : 0
  const controlX = type === 'flowchart' ? start.x : midX
  const controlY = type === 'hierarchy' ? midY - 16 : midY + curveLift
  return {
    d: `M ${start.x} ${start.y} Q ${controlX} ${controlY} ${end.x} ${end.y}`,
    labelX: midX,
    labelY: midY + (type === 'flowchart' ? 0 : -18),
  }
}

export function KeyConceptCard({
  term = 'Key concept',
  definition = 'One clear idea to carry into the next step.',
  accent = '#0ef5c2',
}) {
  return (
    <div style={{ width: '100%', minHeight: 190, display: 'grid', placeItems: 'center', padding: 16 }}>
      <div style={{
        width: '100%',
        maxWidth: 520,
        borderRadius: 22,
        padding: '28px 24px',
        background: `linear-gradient(180deg, ${withAlpha(accent, '18')}, rgba(255,255,255,0.045))`,
        border: `1.5px solid ${withAlpha(accent, '42')}`,
        boxShadow: `0 24px 64px rgba(0,0,0,0.28), 0 0 46px ${withAlpha(accent, '18')}`,
        textAlign: 'center',
        fontFamily: font,
      }}>
        <div style={{ fontSize: 12, color: accent, fontWeight: 900, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 }}>
          Key Concept
        </div>
        <div style={{ fontSize: 28, lineHeight: 1.08, fontWeight: 950, color: '#f5f5f7' }}>
          {shortLabel(term, 'Key concept')}
        </div>
        <p style={{ margin: '14px auto 0', maxWidth: 390, color: '#d7e1ec', fontSize: 14, lineHeight: 1.6 }}>
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
}) {
  const rawId = useId()
  const markerId = `pathai-arrow-${rawId.replace(/[^a-zA-Z0-9_-]/g, '')}`
  const normalizedNodes = normalizeNodes(nodes, accent)
  const safeType = ['flowchart', 'hierarchy', 'comparison', 'steps', 'cycle'].includes(type) ? type : 'flowchart'
  const layout = layoutNodes(safeType, normalizedNodes)
  const nodeById = new Map(layout.nodes.map((node) => [node.id, node]))
  const edges = (Array.isArray(connections) && connections.length > 0 ? connections : defaultConnections(safeType, layout.nodes))
    .map((edge, index) => ({
      id: edge.id || `${edge.from}-${edge.to}-${index}`,
      from: nodeById.get(edge.from) || layout.nodes[Number(edge.from)],
      to: nodeById.get(edge.to) || layout.nodes[Number(edge.to)],
      label: shortLabel(edge.label || '', ''),
    }))
    .filter((edge) => edge.from && edge.to)
    .map((edge) => ({ ...edge, path: buildPath(edge.from, edge.to, safeType) }))

  const scrollable = layout.width > 620 || safeType === 'steps' || (safeType === 'hierarchy' && layout.nodes.length > 4)
  const displayedTitle = title || titleForType(safeType)

  return (
    <div style={{
      width: '100%',
      minHeight: clamp(layout.height + 72, 250, 440),
      borderRadius: 22,
      background: `
        linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px),
        radial-gradient(circle at 24% 18%, ${withAlpha(accent, '24')}, transparent 34%),
        linear-gradient(180deg, rgba(18,22,32,0.98), rgba(8,10,18,0.98))
      `,
      backgroundSize: '34px 34px, 34px 34px, auto, auto',
      border: '1px solid rgba(255,255,255,0.12)',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), 0 22px 54px rgba(0,0,0,0.28)',
      fontFamily: font,
      overflow: 'hidden',
    }}>
      <style>{DIAGRAM_CSS}</style>
      <div style={{
        padding: '14px 18px 0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
      }}>
        <div style={{ color: '#e6edf5', fontSize: 12, fontWeight: 950, letterSpacing: '0.09em', textTransform: 'uppercase' }}>
          {displayedTitle}
        </div>
        <div style={{
          padding: '5px 9px',
          borderRadius: 999,
          background: `${withAlpha(accent, '16')}`,
          border: `1px solid ${withAlpha(accent, '38')}`,
          color: accent,
          fontSize: 10,
          fontWeight: 900,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}>
          {titleForType(safeType)}
        </div>
      </div>

      <div
        className="pathai-diagram-scroll"
        style={{
          width: '100%',
          overflowX: scrollable ? 'auto' : 'hidden',
          overflowY: 'hidden',
          padding: '16px 14px 20px',
        }}
      >
        <div style={{
          width: layout.width,
          height: layout.height,
          position: 'relative',
          margin: '0 auto',
        }}>
          {safeType === 'comparison' && (
            <>
              <div style={{ position: 'absolute', top: 0, bottom: 0, left: layout.width / 2, borderLeft: '1px dashed rgba(255,255,255,0.2)', zIndex: 0 }} />
              <div style={{ position: 'absolute', top: 2, left: layout.width / 2, transform: 'translateX(-50%)', width: 42, height: 42, borderRadius: '50%', display: 'grid', placeItems: 'center', background: '#111827', border: '1px solid rgba(255,255,255,0.16)', color: '#f5f5f7', fontSize: 11, fontWeight: 950, zIndex: 4 }}>
                VS
              </div>
            </>
          )}

          {safeType === 'cycle' && (
            <div style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              width: 150,
              height: 150,
              transform: 'translate(-50%, -45%)',
              borderRadius: '50%',
              border: `1px dashed ${withAlpha(accent, '44')}`,
              background: `${withAlpha(accent, '08')}`,
              zIndex: 0,
            }} />
          )}

          <svg width={layout.width} height={layout.height} viewBox={`0 0 ${layout.width} ${layout.height}`} style={{ position: 'absolute', inset: 0, overflow: 'visible', zIndex: 1, pointerEvents: 'none' }}>
            <defs>
              <marker id={markerId} markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto" markerUnits="strokeWidth">
                <path d="M 0 0 L 10 5 L 0 10 z" fill={withAlpha(accent, 'dd')} />
              </marker>
            </defs>
            {edges.map((edge, index) => (
              <path
                key={edge.id}
                d={edge.path.d}
                fill="none"
                stroke={withAlpha(edge.from.color || accent, 'bb')}
                strokeWidth={3.4}
                strokeLinecap="round"
                markerEnd={`url(#${markerId})`}
                style={{ opacity: 1, animation: `pathaiDiagramLineIn 0.28s ease ${0.08 + index * 0.04}s both` }}
              />
            ))}
          </svg>

          {edges.map((edge, index) => {
            if (!edge.label) return null
            return (
              <div key={`${edge.id}-label`} style={{
                position: 'absolute',
                left: clamp(edge.path.labelX, 48, layout.width - 48),
                top: clamp(edge.path.labelY, 30, layout.height - 30),
                transform: 'translate(-50%, -50%)',
                zIndex: 3,
                padding: '4px 9px',
                borderRadius: 999,
                background: 'rgba(8,10,18,0.94)',
                border: '1px solid rgba(255,255,255,0.16)',
                color: '#d7e1ec',
                fontSize: 10,
                fontWeight: 900,
                whiteSpace: 'nowrap',
                opacity: 1,
                animation: `pathaiDiagramLabelIn 0.2s ease ${0.22 + index * 0.04}s both`,
              }}>
                {edge.label}
              </div>
            )
          })}

          {layout.nodes.map((node, index) => (
            <div key={node.id} className="pathai-diagram-node" style={{
              position: 'absolute',
              left: node.x,
              top: node.y,
              width: node.w,
              minHeight: node.h,
              padding: '12px 13px',
              boxSizing: 'border-box',
              borderRadius: 18,
              background: `linear-gradient(180deg, ${withAlpha(node.color, '30')}, rgba(16,20,30,0.96))`,
              border: `1.5px solid ${withAlpha(node.color, '8a')}`,
              color: '#f5f5f7',
              display: 'grid',
              gridTemplateColumns: '32px 1fr',
              gap: 10,
              alignItems: 'center',
              textAlign: 'left',
              fontSize: 13,
              fontWeight: 900,
              lineHeight: 1.22,
              boxShadow: `0 14px 34px rgba(0,0,0,0.3), 0 0 30px ${withAlpha(node.color, '16')}`,
              zIndex: 5,
              opacity: 1,
              animation: `pathaiDiagramNodeIn 0.28s ease-out ${index * 0.045}s both`,
              transition: 'transform 0.14s ease, box-shadow 0.14s ease',
              transformOrigin: 'center',
            }}>
              <div style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                display: 'grid',
                placeItems: 'center',
                background: node.color,
                color: '#061015',
                fontSize: 12,
                fontWeight: 950,
                boxShadow: `0 0 20px ${withAlpha(node.color, '66')}`,
              }}>
                {index + 1}
              </div>
              <div>
                <div style={{ color: node.color, fontSize: 10, fontWeight: 950, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 3 }}>
                  {safeType === 'comparison' ? (index % 2 === 0 ? 'Before' : 'After') : `Point ${index + 1}`}
                </div>
                <div>{node.label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
