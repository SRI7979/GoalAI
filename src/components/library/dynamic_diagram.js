'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { EVENTS, flushAnalytics, track } from '@/lib/analytics'
import {
  componentSignalSchema,
  dynamicDiagramParamsSchema,
  validateStructuredDiagramData,
} from './schemas'
import { DiagramFallbackCard } from './diagrams/DiagramFrame'
import MermaidRenderer from './diagrams/MermaidRenderer'
import SafeSvgRenderer from './diagrams/SafeSvgRenderer'
import { getStructuredRenderer } from './diagrams/renderers'

function DynamicDiagram({
  params,
  emitSignal,
  markInteraction,
  completedSignal,
  conceptIds = [],
  missionId = null,
}) {
  const signalSentRef = useRef(false)
  const mountedAtRef = useRef(Date.now())
  const renderedTrackedRef = useRef(false)
  const diagramKey = [
    params?.tier || 'none',
    params?.diagramType || '',
    params?.title || '',
    params?.code || '',
    params?.svg ? String(params.svg).slice(0, 160) : '',
  ].join('|')
  const previousDiagramKeyRef = useRef(diagramKey)
  const [fallbackReason, setFallbackReason] = useState('')

  if (previousDiagramKeyRef.current !== diagramKey) {
    previousDiagramKeyRef.current = diagramKey
    renderedTrackedRef.current = false
    mountedAtRef.current = Date.now()
  }

  const emitDiagramSignal = useCallback((fallback = false, reason = '') => {
    if (signalSentRef.current || completedSignal) return
    signalSentRef.current = true
    markInteraction()
    emitSignal({
      correct: null,
      confidence: fallback ? 0.35 : 0.78,
      attempts: 1,
      hintsUsed: 0,
      rawResponse: {
        tier: params?.tier || 'none',
        diagramType: params?.diagramType || null,
        fallback,
        reason,
      },
    })
  }, [completedSignal, emitSignal, markInteraction, params?.diagramType, params?.tier])

  const trackRendered = useCallback((extra = {}) => {
    if (renderedTrackedRef.current) return
    renderedTrackedRef.current = true
    track(EVENTS.DYNAMIC_DIAGRAM_RENDERED, {
      ...extra,
      concept: params?.concept || params?.title || conceptIds[0] || null,
      concept_ids: conceptIds,
      tier: params?.tier || 'none',
      diagram_type: params?.diagramType || extra.diagram_type || extra.diagramType || null,
      mission_id: missionId,
      ms: Date.now() - mountedAtRef.current,
    }, { missionId })
    flushAnalytics().catch(() => {})
  }, [conceptIds, missionId, params?.concept, params?.diagramType, params?.tier, params?.title])

  const fail = useCallback((reason, tier = params?.tier || 'none') => {
    setFallbackReason(reason)
    track(EVENTS.DYNAMIC_DIAGRAM_FAILED, {
      concept: params?.concept || params?.title || conceptIds[0] || null,
      concept_ids: conceptIds,
      tier,
      diagram_type: params?.diagramType || null,
      reason,
      failure_reason: reason,
      mission_id: missionId,
      ms: Date.now() - mountedAtRef.current,
    }, { missionId })
    flushAnalytics().catch(() => {})
    emitDiagramSignal(true, reason)
  }, [conceptIds, emitDiagramSignal, missionId, params?.concept, params?.diagramType, params?.tier, params?.title])

  useEffect(() => {
    if (params?.tier === 'none') {
      fail(params.reason || 'No diagram was appropriate.', 'none')
    }
  }, [fail, params])

  useEffect(() => {
    if (params?.tier === 'structured' && !getStructuredRenderer(params.diagramType)) {
      fail(`Unsupported structured diagram type: ${params.diagramType || 'missing'}.`, 'structured')
    }
  }, [fail, params?.diagramType, params?.tier])

  if (params?.tier === 'structured') {
    const Renderer = getStructuredRenderer(params.diagramType)
    if (!Renderer) {
      return <DiagramFallbackCard title={params.title} fallbackText={params.fallbackText} />
    }
    const validation = validateStructuredDiagramData(params.diagramType, params.data, 'dynamic_diagram.params.data')
    if (!validation.ok) {
      const reason = `schema_validation_failed: ${validation.errors.join(' ')}`
      return (
        <StructuredFallback
          title={params.title}
          fallbackText={params.fallbackText}
          reason={reason}
          fail={fail}
        />
      )
    }
    return (
      <div ref={() => {
        trackRendered()
        emitDiagramSignal(false)
      }}>
        <Renderer data={validation.data} title={params.title} />
      </div>
    )
  }

  if (params?.tier === 'mermaid') {
    return (
      <MermaidRenderer
        code={params.code}
        title={params.title}
        fallbackText={params.fallbackText}
        onRendered={(extra) => {
          trackRendered(extra)
          emitDiagramSignal(false)
        }}
        onError={(reason) => fail(reason, 'mermaid')}
      />
    )
  }

  if (params?.tier === 'svg') {
    return (
      <SafeSvgRenderer
        svg={params.svg}
        title={params.title}
        fallbackText={params.fallbackText}
        onRendered={() => {
          trackRendered()
          emitDiagramSignal(false)
        }}
        onError={(reason) => fail(reason, 'svg')}
      />
    )
  }

  return <DiagramFallbackCard title={params?.title} fallbackText={params?.fallbackText || fallbackReason} />
}

function StructuredFallback({ title, fallbackText, reason, fail }) {
  useEffect(() => {
    fail(reason, 'structured')
  }, [fail, reason])
  return <DiagramFallbackCard title={title} fallbackText={fallbackText} />
}

const dynamicDiagramComponent = {
  type: 'dynamic_diagram',
  paramsSchema: dynamicDiagramParamsSchema,
  signalSchema: componentSignalSchema,
  generatorPrompt: 'dynamicDiagram_v1',
  render: DynamicDiagram,
}

export default dynamicDiagramComponent
