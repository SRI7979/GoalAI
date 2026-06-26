'use client'

import { useEffect, useRef, useState } from 'react'
import DiagramFrame from './DiagramFrame'
import { SvgText, svgBaseProps } from './diagramUtils'
import { DIAGRAM_PALETTE } from './palette'

function pointsFromFunction(plotData = {}) {
  const minX = Number(plotData.minX ?? -5)
  const maxX = Number(plotData.maxX ?? 5)
  const samples = Array.isArray(plotData.samples) ? plotData.samples : []
  if (samples.length >= 2) {
    return samples
      .map((point) => [Number(point.x), Number(point.y)])
      .filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y))
  }
  const expression = String(plotData.expression || 'x*x')
  const safeExpression = expression.replace(/\^/g, '**')
  if (!/^[0-9xX+\-*/().\s]+$/.test(safeExpression)) {
    return [[-1, 0], [0, 0], [1, 0]]
  }
  const fn = Function('x', `"use strict"; return (${safeExpression.replace(/X/g, 'x')});`)
  return Array.from({ length: 61 }, (_, index) => {
    const x = minX + ((maxX - minX) * index) / 60
    const y = Number(fn(x))
    return [x, Number.isFinite(y) ? y : 0]
  })
}

function PlotCanvas({ plotData = {}, annotations = [] }) {
  const ref = useRef(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let chart = null
    let cancelled = false
    async function render() {
      try {
        const { default: uPlot } = await import('uplot')
        if (cancelled || !ref.current) return
        const points = pointsFromFunction(plotData)
        chart = new uPlot({
          width: 640,
          height: 280,
          series: [{ label: 'x' }, { label: 'y', stroke: DIAGRAM_PALETTE.teal, width: 3 }],
          axes: [
            { stroke: DIAGRAM_PALETTE.muted, grid: { stroke: 'rgba(255,255,255,0.08)' } },
            { stroke: DIAGRAM_PALETTE.muted, grid: { stroke: 'rgba(255,255,255,0.08)' } },
          ],
        }, [points.map(([x]) => x), points.map(([, y]) => y)], ref.current)
      } catch {
        setFailed(true)
      }
    }
    render()
    return () => {
      cancelled = true
      chart?.destroy?.()
    }
  }, [plotData])

  if (failed) return <FunctionSvg plotData={plotData} annotations={annotations} />

  return (
    <div style={{ overflowX: 'auto' }}>
      <div ref={ref} style={{ minWidth: 640, color: DIAGRAM_PALETTE.text }} />
    </div>
  )
}

function FunctionSvg({ plotData = {}, annotations = [] }) {
  const points = pointsFromFunction(plotData)
  const width = 720
  const height = 300
  const xs = points.map(([x]) => x)
  const ys = points.map(([, y]) => y)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  const sx = (x) => 52 + ((x - minX) / Math.max(maxX - minX, 1)) * 620
  const sy = (y) => 250 - ((y - minY) / Math.max(maxY - minY, 1)) * 210
  const d = points.map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${sx(x)},${sy(y)}`).join(' ')
  return (
    <svg {...svgBaseProps(width, height, 'Equation function plot')}>
      <line x1={52} x2={672} y1={250} y2={250} stroke={DIAGRAM_PALETTE.border} />
      <line x1={52} x2={52} y1={40} y2={250} stroke={DIAGRAM_PALETTE.border} />
      <path d={d} fill="none" stroke={DIAGRAM_PALETTE.teal} strokeWidth="3" />
      {annotations.map((item, index) => (
        <g key={`${item.label || index}`}>
          <circle cx={sx(Number(item.x))} cy={sy(Number(item.y))} r={5} fill={DIAGRAM_PALETTE.amber} />
          <SvgText x={sx(Number(item.x)) + 8} y={sy(Number(item.y)) - 8} anchor="start" size={11}>{item.label}</SvgText>
        </g>
      ))}
    </svg>
  )
}

function GeometrySvg({ plotData = {}, annotations = [] }) {
  const points = Array.isArray(plotData.points) ? plotData.points : []
  const width = 720
  const height = 300
  const path = points.map((point, index) => `${index === 0 ? 'M' : 'L'}${Number(point.x)},${Number(point.y)}`).join(' ')
  return (
    <svg {...svgBaseProps(width, height, 'Geometry plot')}>
      {path ? <path d={`${path} Z`} fill="rgba(14,245,194,0.08)" stroke={DIAGRAM_PALETTE.teal} strokeWidth="3" /> : null}
      {points.map((point, index) => (
        <g key={`${point.label || index}`}>
          <circle cx={Number(point.x)} cy={Number(point.y)} r={7} fill={DIAGRAM_PALETTE.amber} />
          <SvgText x={Number(point.x) + 12} y={Number(point.y) - 10} anchor="start" size={12}>{point.label || `P${index + 1}`}</SvgText>
        </g>
      ))}
      {annotations.map((item, index) => <SvgText key={index} x={Number(item.x)} y={Number(item.y)} size={11}>{item.label}</SvgText>)}
    </svg>
  )
}

function NumberLineSvg({ plotData = {}, annotations = [] }) {
  const min = Number(plotData.min ?? -10)
  const max = Number(plotData.max ?? 10)
  const marker = Number(plotData.value ?? 0)
  const width = 720
  const height = 170
  const sx = (x) => 70 + ((x - min) / Math.max(max - min, 1)) * 580
  return (
    <svg {...svgBaseProps(width, height, 'Number line')}>
      <line x1={70} x2={650} y1={86} y2={86} stroke={DIAGRAM_PALETTE.teal} strokeWidth="3" />
      {Array.from({ length: 9 }, (_, index) => min + ((max - min) * index) / 8).map((value) => (
        <g key={value}>
          <line x1={sx(value)} x2={sx(value)} y1={78} y2={94} stroke={DIAGRAM_PALETTE.border} />
          <SvgText x={sx(value)} y={116} size={10}>{Math.round(value * 10) / 10}</SvgText>
        </g>
      ))}
      <circle cx={sx(marker)} cy={86} r={9} fill={DIAGRAM_PALETTE.amber} />
      {annotations.map((item, index) => <SvgText key={index} x={sx(Number(item.x))} y={48} size={11}>{item.label}</SvgText>)}
    </svg>
  )
}

export default function EquationPlotDiagram({ data = {}, title }) {
  const [equationHtml, setEquationHtml] = useState('')
  const equation = String(data.equation || '')
  const plotType = data.plotType || 'none'
  const annotations = Array.isArray(data.annotations) ? data.annotations : []

  useEffect(() => {
    let cancelled = false
    import('katex')
      .then((mod) => {
        if (!cancelled) setEquationHtml(mod.default.renderToString(equation, { throwOnError: false, displayMode: true }))
      })
      .catch(() => {
        if (!cancelled) setEquationHtml('')
      })
    return () => {
      cancelled = true
    }
  }, [equation])

  return (
    <DiagramFrame title={title} caption={data.caption} tier="structured" diagramType="equation_plot">
      <div
        style={{
          color: DIAGRAM_PALETTE.text,
          border: `1px solid ${DIAGRAM_PALETTE.border}`,
          borderRadius: 16,
          background: DIAGRAM_PALETTE.surface2,
          padding: '10px 14px',
          marginBottom: 12,
          overflowX: 'auto',
        }}
        dangerouslySetInnerHTML={{ __html: equationHtml || equation }}
      />
      {plotType === 'function' ? <PlotCanvas plotData={data.plotData} annotations={annotations} /> : null}
      {plotType === 'geometry' ? <GeometrySvg plotData={data.plotData} annotations={annotations} /> : null}
      {plotType === 'number_line' ? <NumberLineSvg plotData={data.plotData} annotations={annotations} /> : null}
      {plotType === 'none' ? <div style={{ color: DIAGRAM_PALETTE.muted, fontWeight: 800 }}>This equation is best studied symbolically.</div> : null}
    </DiagramFrame>
  )
}
