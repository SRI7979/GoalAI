'use client'

import { DIAGRAM_PALETTE } from './palette'

const frameStyle = {
  border: `1px solid ${DIAGRAM_PALETTE.border}`,
  borderRadius: 18,
  background: `linear-gradient(145deg, ${DIAGRAM_PALETTE.surface}, ${DIAGRAM_PALETTE.bg})`,
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
  overflow: 'hidden',
}

export default function DiagramFrame({ title, caption, children, tier, diagramType }) {
  return (
    <figure style={frameStyle} data-diagram-tier={tier || ''} data-diagram-type={diagramType || ''}>
      <div style={{ padding: '14px 16px 8px' }}>
        {title ? (
          <figcaption style={{
            color: DIAGRAM_PALETTE.text,
            fontSize: 15,
            lineHeight: 1.25,
            fontWeight: 900,
            letterSpacing: 0,
          }}>
            {title}
          </figcaption>
        ) : null}
        {caption ? (
          <p style={{
            color: DIAGRAM_PALETTE.muted,
            fontSize: 12,
            lineHeight: 1.5,
            margin: title ? '5px 0 0' : 0,
          }}>
            {caption}
          </p>
        ) : null}
      </div>
      <div style={{ padding: '8px 16px 16px' }}>{children}</div>
    </figure>
  )
}

export function DiagramSkeleton({ title = 'Generating diagram...' }) {
  return (
    <DiagramFrame title={title} caption="Building a visual explanation.">
      <div
        aria-hidden="true"
        style={{
          height: 190,
          borderRadius: 14,
          background: `linear-gradient(90deg, rgba(255,255,255,0.05), rgba(14,245,194,0.14), rgba(255,255,255,0.05))`,
          opacity: 0.9,
        }}
      />
    </DiagramFrame>
  )
}

export function DiagramFallbackCard({ title = 'Key concept', fallbackText = 'This idea is easiest to understand as a short summary.' }) {
  return (
    <DiagramFrame title={title} caption="Key concept card">
      <div style={{
        border: '1px solid rgba(14,245,194,0.26)',
        borderRadius: 16,
        padding: 16,
        background: 'rgba(14,245,194,0.06)',
        color: DIAGRAM_PALETTE.text,
        fontSize: 14,
        lineHeight: 1.55,
        fontWeight: 700,
      }}>
        {fallbackText}
      </div>
    </DiagramFrame>
  )
}
