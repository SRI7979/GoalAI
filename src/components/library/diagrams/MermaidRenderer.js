'use client'

import { useEffect, useId, useState } from 'react'
import DiagramFrame from './DiagramFrame'
import { DIAGRAM_PALETTE } from './palette'
import { getMermaidDiagramType } from './mermaidRules'

export default function MermaidRenderer({ code, title, fallbackText, onRendered, onError }) {
  const reactId = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const [svg, setSvg] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    async function renderMermaid() {
      try {
        const diagramType = getMermaidDiagramType(code)
        if (!diagramType) throw new Error('Mermaid diagram type is not allowed.')
        const mermaid = (await import('mermaid')).default
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: 'strict',
          theme: 'base',
          themeVariables: {
            background: DIAGRAM_PALETTE.bg,
            primaryColor: DIAGRAM_PALETTE.surface2,
            primaryTextColor: DIAGRAM_PALETTE.text,
            primaryBorderColor: DIAGRAM_PALETTE.teal,
            lineColor: DIAGRAM_PALETTE.blue,
            secondaryColor: DIAGRAM_PALETTE.surface,
            tertiaryColor: DIAGRAM_PALETTE.surface2,
          },
        })
        await mermaid.parse(code)
        const result = await mermaid.render(`pathai_mermaid_${reactId}`, code)
        if (cancelled) return
        setSvg(result.svg)
        setError('')
        onRendered?.({ diagramType })
      } catch (err) {
        if (cancelled) return
        const message = err?.message || 'Mermaid render failed.'
        setError(message)
        onError?.(message)
      }
    }
    renderMermaid()
    return () => {
      cancelled = true
    }
  }, [code, onError, onRendered, reactId])

  if (error) {
    return (
      <DiagramFrame title={title || 'Key concept'} caption="Key concept card">
        <div style={{
          border: '1px solid rgba(14,245,194,0.26)',
          borderRadius: 16,
          padding: 16,
          color: DIAGRAM_PALETTE.text,
          background: 'rgba(14,245,194,0.06)',
        }}>
          {fallbackText || 'The diagram could not render, but the key relationship still matters here.'}
        </div>
      </DiagramFrame>
    )
  }

  return (
    <DiagramFrame title={title} caption="Mermaid diagram" tier="mermaid">
      {svg ? (
        <div
          style={{ color: DIAGRAM_PALETTE.text, overflowX: 'auto' }}
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      ) : (
        <div style={{ height: 180, borderRadius: 14, background: 'rgba(255,255,255,0.06)' }} />
      )}
    </DiagramFrame>
  )
}
