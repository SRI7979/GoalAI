'use client'

import { useEffect, useMemo, useState } from 'react'
import dynamicDiagram from './dynamic_diagram'
import { DiagramFallbackCard, DiagramSkeleton } from './diagrams/DiagramFrame'

const diagramCache = new Map()

function cacheKey({ concept, contextSnippet }) {
  return `${String(concept || '').trim().toLowerCase()}::${String(contextSnippet || '').trim().toLowerCase()}`
}

export default function EmbeddedDiagram({
  concept,
  contextSnippet = '',
  learnerState = null,
  conceptIds = [],
  missionId = null,
  fallbackParams = null,
}) {
  const key = useMemo(() => cacheKey({ concept, contextSnippet }), [concept, contextSnippet])
  const [retryNonce, setRetryNonce] = useState(0)
  const [state, setState] = useState(() => {
    const cached = diagramCache.get(key)
    return cached
      ? { status: 'ready', params: cached, error: '' }
      : { status: 'loading', params: null, error: '' }
  })

  useEffect(() => {
    if (!concept) {
      return
    }

    const cached = diagramCache.get(key)
    let cancelled = false
    if (cached) {
      queueMicrotask(() => {
        if (!cancelled) setState({ status: 'ready', params: cached, error: '' })
      })
      return () => {
        cancelled = true
      }
    }

    queueMicrotask(() => {
      if (!cancelled) setState({ status: 'loading', params: null, error: '' })
    })
    fetch('/api/dynamic-diagram/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ concept, contextSnippet, learnerState }),
    })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(payload?.error || 'Diagram generation failed.')
        return payload.params
      })
      .then((params) => {
        if (cancelled) return
        diagramCache.set(key, params)
        setState({ status: 'ready', params, error: '' })
      })
      .catch((error) => {
        if (cancelled) return
        if (fallbackParams) {
          setState({ status: 'ready', params: fallbackParams, error: friendlyDiagramError(error) })
          return
        }
        setState({ status: 'error', params: null, error: friendlyDiagramError(error) })
      })

    return () => {
      cancelled = true
    }
  }, [concept, contextSnippet, fallbackParams, key, learnerState, retryNonce])

  if (!concept) {
    return (
      <DiagramFallbackCard
        title="Key concept"
        fallbackText="Missing diagram concept."
      />
    )
  }

  if (state.status === 'loading') {
    return <DiagramSkeleton title={concept || 'Diagram'} />
  }

  if (state.status === 'error') {
    return (
      <div>
        <DiagramFallbackCard
          title={concept || 'Key concept'}
          fallbackText={state.error || 'The diagram could not load, but the key concept is still available in text.'}
        />
        <button
          type="button"
          onClick={() => setRetryNonce((current) => current + 1)}
          style={{
            marginTop: 10,
            border: '1px solid rgba(14,245,194,0.35)',
            borderRadius: 12,
            background: 'rgba(14,245,194,0.1)',
            color: '#ccfbf1',
            fontWeight: 800,
            padding: '9px 12px',
          }}
        >
          Retry diagram
        </button>
      </div>
    )
  }

  const RenderDiagram = dynamicDiagram.render
  return (
    <RenderDiagram
      params={state.params}
      emitSignal={() => {}}
      markInteraction={() => {}}
      completedSignal={{ embedded: true }}
      conceptIds={conceptIds}
      missionId={missionId}
    />
  )
}

function friendlyDiagramError(error) {
  const message = String(error?.message || '')
  if (/429|rate.?limit|quota/i.test(message)) {
    return 'The AI diagram generator is rate-limited right now. Wait a minute, then retry the diagram.'
  }
  return message || 'Diagram generation failed.'
}
