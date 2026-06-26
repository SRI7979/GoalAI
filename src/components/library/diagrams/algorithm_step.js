'use client'

import { useEffect, useMemo, useState } from 'react'
import DiagramFrame from './DiagramFrame'
import { SvgText, svgBaseProps } from './diagramUtils'
import { DIAGRAM_PALETTE } from './palette'

const controlStyle = {
  border: `1px solid ${DIAGRAM_PALETTE.border}`,
  borderRadius: 10,
  background: DIAGRAM_PALETTE.surface2,
  color: DIAGRAM_PALETTE.text,
  fontSize: 12,
  fontWeight: 900,
  padding: '8px 10px',
  cursor: 'pointer',
}

function ArrayState({ state = [], highlight = {} }) {
  const values = Array.isArray(state) ? state : []
  const nodeIds = new Set(highlight.nodeIds || [])
  return (
    <svg {...svgBaseProps(720, 210, 'Algorithm array state')}>
      {values.map((value, index) => {
        const active = nodeIds.has(String(index)) || nodeIds.has(`index_${index}`) || nodeIds.has(String(value))
        const x = 64 + index * Math.min(78, 560 / Math.max(values.length, 1))
        return (
          <g key={`${index}-${value}`}>
            <rect x={x} y={68} width={58} height={54} rx={13} fill={active ? 'rgba(14,245,194,0.18)' : DIAGRAM_PALETTE.surface2} stroke={active ? DIAGRAM_PALETTE.teal : DIAGRAM_PALETTE.border} strokeWidth="2" />
            <SvgText x={x + 29} y={95}>{String(value)}</SvgText>
            <SvgText x={x + 29} y={146} size={10} fill={DIAGRAM_PALETTE.muted}>{index}</SvgText>
          </g>
        )
      })}
      <SvgText x={360} y={28} fill={DIAGRAM_PALETTE.cyan}>{highlight.operation || 'Array operation'}</SvgText>
    </svg>
  )
}

function TreeState({ state = {}, highlight = {} }) {
  const nodeIds = new Set(highlight.nodeIds || [])
  const nodes = Array.isArray(state.nodes) ? state.nodes : []
  const edges = Array.isArray(state.edges) ? state.edges : []
  const byId = new Map(nodes.map((node) => [String(node.id), node]))
  return (
    <svg {...svgBaseProps(720, 330, 'Algorithm tree state')}>
      {edges.map((edge, index) => {
        const from = byId.get(String(edge.from))
        const to = byId.get(String(edge.to))
        if (!from || !to) return null
        return <line key={`${edge.from}-${edge.to}-${index}`} x1={Number(from.x)} y1={Number(from.y)} x2={Number(to.x)} y2={Number(to.y)} stroke={DIAGRAM_PALETTE.border} strokeWidth="2" />
      })}
      {nodes.map((node) => {
        const active = nodeIds.has(String(node.id))
        return (
          <g key={node.id}>
            <circle cx={Number(node.x)} cy={Number(node.y)} r={28} fill={active ? 'rgba(14,245,194,0.18)' : DIAGRAM_PALETTE.surface2} stroke={active ? DIAGRAM_PALETTE.teal : DIAGRAM_PALETTE.border} strokeWidth="2" />
            <SvgText x={Number(node.x)} y={Number(node.y)}>{String(node.label ?? node.id)}</SvgText>
          </g>
        )
      })}
      <SvgText x={360} y={28} fill={DIAGRAM_PALETTE.cyan}>{highlight.operation || 'Tree operation'}</SvgText>
    </svg>
  )
}

export default function AlgorithmStepDiagram({ data = {}, title }) {
  const steps = useMemo(() => (Array.isArray(data.steps) ? data.steps : []), [data.steps])
  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const current = steps[index] || {}
  const pseudocode = Array.isArray(data.pseudocode) ? data.pseudocode : []
  const dataStructure = data.dataStructure || 'array'

  useEffect(() => {
    if (!playing || steps.length < 2) return undefined
    const timer = setInterval(() => {
      setIndex((value) => {
        if (value >= steps.length - 1) {
          setPlaying(false)
          return value
        }
        return value + 1
      })
    }, 2000)
    return () => clearInterval(timer)
  }, [playing, steps.length])

  const setStep = (next) => setIndex(Math.min(Math.max(next, 0), Math.max(steps.length - 1, 0)))

  return (
    <DiagramFrame title={title} caption={data.caption} tier="structured" diagramType="algorithm_step">
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(220px, 0.8fr)', gap: 12 }}>
        <div style={{ border: `1px solid ${DIAGRAM_PALETTE.border}`, borderRadius: 16, background: '#050a12', padding: 8 }}>
          {dataStructure === 'tree'
            ? <TreeState state={current.state || data.initialState} highlight={current.highlight || {}} />
            : <ArrayState state={current.state || data.initialState} highlight={current.highlight || {}} />}
        </div>
        <div style={{ border: `1px solid ${DIAGRAM_PALETTE.border}`, borderRadius: 16, background: DIAGRAM_PALETTE.surface2, padding: 12 }}>
          <div style={{ color: DIAGRAM_PALETTE.cyan, fontSize: 12, fontWeight: 950, marginBottom: 8 }}>Pseudocode</div>
          {pseudocode.map((line, lineIndex) => {
            const active = Number(current.pseudocodeLine) === lineIndex + 1
            return (
              <div key={`${lineIndex}-${line}`} style={{
                borderLeft: active ? `4px solid ${DIAGRAM_PALETTE.teal}` : '4px solid transparent',
                background: active ? 'rgba(14,245,194,0.12)' : 'transparent',
                borderRadius: 8,
                padding: '6px 8px',
                color: active ? DIAGRAM_PALETTE.text : DIAGRAM_PALETTE.muted,
                fontSize: 12,
                fontWeight: 800,
              }}>
                <span style={{ display: 'inline-block', width: 24 }}>{lineIndex + 1}</span>{line}
              </div>
            )
          })}
        </div>
      </div>
      <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ color: DIAGRAM_PALETTE.text, fontSize: 13, fontWeight: 800 }}>
          Step {Math.min(index + 1, steps.length)} of {steps.length}: <span style={{ color: DIAGRAM_PALETTE.muted }}>{current.caption}</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" style={controlStyle} onClick={() => setStep(index - 1)}>Prev</button>
          <button type="button" style={controlStyle} onClick={() => setPlaying((value) => !value)}>{playing ? 'Pause' : 'Play'}</button>
          <button type="button" style={controlStyle} onClick={() => setStep(index + 1)}>Next</button>
        </div>
      </div>
    </DiagramFrame>
  )
}
