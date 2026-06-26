'use client'

import { useEffect, useMemo, useState } from 'react'
import DiagramFrame from './DiagramFrame'
import { DIAGRAM_PALETTE } from './palette'

const buttonStyle = {
  border: `1px solid ${DIAGRAM_PALETTE.border}`,
  borderRadius: 10,
  background: DIAGRAM_PALETTE.surface2,
  color: DIAGRAM_PALETTE.text,
  fontSize: 12,
  fontWeight: 900,
  padding: '8px 10px',
  cursor: 'pointer',
}

function normalizeSteps(steps = []) {
  return Array.isArray(steps) ? steps : []
}

function stringifyValue(value) {
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

export default function CodeExecutionDiagram({ data = {}, title }) {
  const steps = useMemo(() => normalizeSteps(data.steps), [data.steps])
  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const current = steps[index] || {}
  const lines = String(data.code || '').split('\n')
  const changedKeys = new Set(Object.keys(current.variables || {}))
  const output = steps.slice(0, index + 1).map((step) => step.output).filter(Boolean).join('\n')

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
    <DiagramFrame title={title} caption={data.caption} tier="structured" diagramType="code_execution">
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.35fr) minmax(190px, 0.65fr)', gap: 12 }}>
        <pre style={{
          margin: 0,
          minHeight: 250,
          overflowX: 'auto',
          border: `1px solid ${DIAGRAM_PALETTE.border}`,
          borderRadius: 16,
          background: '#050a12',
          color: DIAGRAM_PALETTE.text,
          padding: 12,
          fontSize: 12,
          lineHeight: 1.7,
        }}>
          <code>
            {lines.map((line, lineIndex) => {
              const lineNo = lineIndex + 1
              const active = Number(current.line) === lineNo
              return (
                <span
                  key={lineNo}
                  style={{
                    display: 'block',
                    borderLeft: active ? `4px solid ${DIAGRAM_PALETTE.teal}` : '4px solid transparent',
                    background: active ? 'rgba(14,245,194,0.12)' : 'transparent',
                    paddingLeft: 8,
                    whiteSpace: 'pre',
                  }}
                >
                  <span style={{ color: DIAGRAM_PALETTE.muted, display: 'inline-block', width: 28 }}>{lineNo}</span>
                  {line || ' '}
                </span>
              )
            })}
          </code>
        </pre>
        <div style={{ display: 'grid', gap: 10, alignContent: 'start' }}>
          <div style={{
            border: `1px solid ${DIAGRAM_PALETTE.border}`,
            borderRadius: 16,
            background: DIAGRAM_PALETTE.surface2,
            padding: 12,
          }}>
            <div style={{ color: DIAGRAM_PALETTE.cyan, fontSize: 12, fontWeight: 950, marginBottom: 8 }}>Variables</div>
            {Object.entries(current.variables || {}).length ? Object.entries(current.variables || {}).map(([name, value]) => (
              <div key={name} style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 10,
                borderRadius: 10,
                padding: '7px 8px',
                marginTop: 5,
                background: changedKeys.has(name) ? 'rgba(14,245,194,0.13)' : 'rgba(255,255,255,0.04)',
                color: DIAGRAM_PALETTE.text,
                fontSize: 12,
                fontWeight: 800,
              }}>
                <span>{name}</span>
                <span style={{ color: DIAGRAM_PALETTE.amber }}>{stringifyValue(value)}</span>
              </div>
            )) : <div style={{ color: DIAGRAM_PALETTE.muted, fontSize: 12 }}>No variables yet.</div>}
          </div>
          <div style={{
            border: `1px solid ${DIAGRAM_PALETTE.border}`,
            borderRadius: 16,
            background: '#050a12',
            padding: 12,
            color: DIAGRAM_PALETTE.text,
            minHeight: 84,
          }}>
            <div style={{ color: DIAGRAM_PALETTE.cyan, fontSize: 12, fontWeight: 950, marginBottom: 8 }}>Console</div>
            <pre style={{ margin: 0, whiteSpace: 'pre-wrap', color: DIAGRAM_PALETTE.muted, fontSize: 12 }}>{output || 'No output yet.'}</pre>
          </div>
        </div>
      </div>
      <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ color: DIAGRAM_PALETTE.text, fontSize: 13, fontWeight: 800 }}>
          Step {Math.min(index + 1, steps.length)} of {steps.length}: <span style={{ color: DIAGRAM_PALETTE.muted }}>{current.explanation}</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" style={buttonStyle} onClick={() => setStep(index - 1)}>Prev</button>
          <button type="button" style={buttonStyle} onClick={() => setPlaying((value) => !value)}>{playing ? 'Pause' : 'Play'}</button>
          <button type="button" style={buttonStyle} onClick={() => setStep(index + 1)}>Next</button>
        </div>
      </div>
    </DiagramFrame>
  )
}
