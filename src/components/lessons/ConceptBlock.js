'use client'

// CONCEPT phase — the "teach" block. Renders its sub-blocks as subsections of one
// main content area: Explanation, Slideshow, Diagram, Worked Example, Analogy,
// Quick-check. Presentational: it takes generated `content` and renders it.
// Styling assumes a `.lovable-app` ancestor (oklch palette + Sora display font).

import { useState } from 'react'
import {
  BookOpen, Layers, GitBranch, FlaskConical, Lightbulb, HelpCircle,
  ChevronLeft, ChevronRight, Check, X, ArrowRight,
} from 'lucide-react'

const card = {
  background: 'var(--color-surface)',
  border: '2px solid var(--color-border)',
  borderRadius: 20,
  padding: 20,
  boxShadow: '0 5px 0 0 color-mix(in oklab, var(--color-background) 55%, #000)',
}

function SectionHeader({ icon: Icon, label, tone = 'var(--color-primary)' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
      <div style={{ width: 34, height: 34, borderRadius: 12, display: 'grid', placeItems: 'center', color: tone, background: `color-mix(in oklab, ${tone} 18%, transparent)`, border: `2px solid color-mix(in oklab, ${tone} 40%, transparent)` }}>
        <Icon size={17} strokeWidth={2.4} />
      </div>
      <span className="font-display" style={{ fontSize: 13, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: tone }}>{label}</span>
    </div>
  )
}

function ExplanationBlock({ data = {} }) {
  return (
    <section style={card}>
      <SectionHeader icon={BookOpen} label="Explanation" />
      {data.summary && (
        <div style={{ padding: '14px 16px', borderRadius: 14, background: 'color-mix(in oklab, var(--color-primary) 12%, transparent)', border: '2px solid color-mix(in oklab, var(--color-primary) 30%, transparent)', marginBottom: 14, fontSize: 15, fontWeight: 700, color: 'var(--color-foreground)', lineHeight: 1.5 }}>
          {data.summary}
        </div>
      )}
      {(data.paragraphs || []).map((p, i) => (
        <p key={i} style={{ fontSize: 15, lineHeight: 1.7, color: 'var(--color-foreground)', marginBottom: 12 }}>{p}</p>
      ))}
      {Array.isArray(data.keyPoints) && data.keyPoints.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 6 }}>
          {data.keyPoints.map((k, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <div style={{ marginTop: 3, color: 'var(--color-mint)', flexShrink: 0 }}><Check size={16} strokeWidth={3} /></div>
              <span style={{ fontSize: 14, lineHeight: 1.55, color: 'var(--color-muted-foreground)', fontWeight: 600 }}>{k}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function SlideshowBlock({ data = {} }) {
  const slides = Array.isArray(data.slides) ? data.slides : []
  const [i, setI] = useState(0)
  if (!slides.length) return null
  const slide = slides[Math.min(i, slides.length - 1)]
  return (
    <section style={card}>
      <SectionHeader icon={Layers} label="Slideshow" tone="var(--color-violet)" />
      <div style={{ minHeight: 150, borderRadius: 16, background: 'var(--color-surface-2)', border: '2px solid var(--color-border)', padding: 22, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div className="font-display" style={{ fontSize: 19, fontWeight: 800, color: 'var(--color-foreground)', marginBottom: 10 }}>{slide.title}</div>
        <p style={{ fontSize: 15, lineHeight: 1.65, color: 'var(--color-muted-foreground)' }}>{slide.body}</p>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 }}>
        <button type="button" onClick={() => setI((v) => Math.max(0, v - 1))} disabled={i === 0}
          style={{ width: 44, height: 44, borderRadius: 14, border: '2px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-foreground)', cursor: i === 0 ? 'default' : 'pointer', opacity: i === 0 ? 0.4 : 1, display: 'grid', placeItems: 'center' }}>
          <ChevronLeft size={20} />
        </button>
        <div style={{ display: 'flex', gap: 6 }}>
          {slides.map((_, k) => (
            <div key={k} style={{ width: k === i ? 22 : 8, height: 8, borderRadius: 9999, background: k === i ? 'var(--color-violet)' : 'var(--color-border)', transition: 'all 0.2s' }} />
          ))}
        </div>
        <button type="button" onClick={() => setI((v) => Math.min(slides.length - 1, v + 1))} disabled={i >= slides.length - 1}
          style={{ width: 44, height: 44, borderRadius: 14, border: '2px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-foreground)', cursor: i >= slides.length - 1 ? 'default' : 'pointer', opacity: i >= slides.length - 1 ? 0.4 : 1, display: 'grid', placeItems: 'center' }}>
          <ChevronRight size={20} />
        </button>
      </div>
    </section>
  )
}

function DiagramBlock({ data = {} }) {
  const kind = data.kind || (data.left && data.right ? 'comparison' : 'steps')
  const nodes = (data.nodes || []).map((n) => (typeof n === 'object' ? (n.label || n.text) : n)).filter(Boolean)
  return (
    <section style={card}>
      <SectionHeader icon={GitBranch} label="Diagram" tone="var(--color-cyan-glow)" />
      {data.title && <div className="font-display" style={{ fontSize: 15, fontWeight: 800, color: 'var(--color-foreground)', marginBottom: 14, textAlign: 'center' }}>{data.title}</div>}

      {kind === 'comparison' && data.left && data.right ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {[data.left, data.right].map((col, ci) => (
            <div key={ci} style={{ borderRadius: 14, border: '2px solid var(--color-border)', background: 'var(--color-surface-2)', padding: 14 }}>
              <div className="font-display" style={{ fontSize: 13, fontWeight: 800, color: ci === 0 ? 'var(--color-primary)' : 'var(--color-coral)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{col.title}</div>
              {(col.items || []).map((it, k) => (
                <div key={k} style={{ fontSize: 13, color: 'var(--color-muted-foreground)', lineHeight: 1.5, marginBottom: 4 }}>• {it}</div>
              ))}
            </div>
          ))}
        </div>
      ) : kind === 'flow' ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
          {nodes.map((n, k) => (
            <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ padding: '10px 14px', borderRadius: 12, border: '2px solid color-mix(in oklab, var(--color-primary) 45%, transparent)', background: 'color-mix(in oklab, var(--color-primary) 14%, transparent)', color: 'var(--color-foreground)', fontSize: 13, fontWeight: 700 }}>{n}</div>
              {k < nodes.length - 1 && <ArrowRight size={16} style={{ color: 'var(--color-muted-foreground)' }} />}
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {nodes.map((n, k) => (
            <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 30, height: 30, borderRadius: 10, flexShrink: 0, display: 'grid', placeItems: 'center', background: 'color-mix(in oklab, var(--color-primary) 18%, transparent)', border: '2px solid color-mix(in oklab, var(--color-primary) 40%, transparent)', color: 'var(--color-primary)', fontWeight: 800, fontSize: 13 }}>{k + 1}</div>
              <div style={{ flex: 1, padding: '10px 14px', borderRadius: 12, border: '2px solid var(--color-border)', background: 'var(--color-surface-2)', color: 'var(--color-foreground)', fontSize: 14, fontWeight: 600 }}>{n}</div>
            </div>
          ))}
        </div>
      )}
      {data.caption && <p style={{ fontSize: 12, color: 'var(--color-muted-foreground)', textAlign: 'center', marginTop: 12, fontStyle: 'italic' }}>{data.caption}</p>}
    </section>
  )
}

function WorkedExampleBlock({ data = {} }) {
  const steps = Array.isArray(data.steps) ? data.steps : []
  const [shown, setShown] = useState(1)
  return (
    <section style={card}>
      <SectionHeader icon={FlaskConical} label="Worked Example" tone="var(--color-amber)" />
      {data.prompt && (
        <div style={{ padding: '12px 16px', borderRadius: 12, background: 'var(--color-surface-2)', border: '2px solid var(--color-border)', marginBottom: 14, fontSize: 14, fontWeight: 700, color: 'var(--color-foreground)', lineHeight: 1.5 }}>{data.prompt}</div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {steps.slice(0, shown).map((s, k) => {
          const label = typeof s === 'object' ? s.label : null
          const detail = typeof s === 'object' ? s.detail : s
          return (
            <div key={k} style={{ display: 'flex', gap: 12, animation: 'lovableFadeIn 0.3s ease both' }}>
              <div style={{ width: 26, height: 26, borderRadius: 8, flexShrink: 0, display: 'grid', placeItems: 'center', background: 'color-mix(in oklab, var(--color-amber) 20%, transparent)', color: 'var(--color-amber)', fontWeight: 800, fontSize: 12 }}>{k + 1}</div>
              <div style={{ flex: 1 }}>
                {label && <div className="font-display" style={{ fontSize: 13, fontWeight: 800, color: 'var(--color-foreground)', marginBottom: 2 }}>{label}</div>}
                <div style={{ fontSize: 14, color: 'var(--color-muted-foreground)', lineHeight: 1.55 }}>{detail}</div>
              </div>
            </div>
          )
        })}
      </div>
      {shown < steps.length ? (
        <button type="button" onClick={() => setShown((v) => v + 1)} className="font-display"
          style={{ marginTop: 14, padding: '10px 16px', borderRadius: 12, border: '2px solid color-mix(in oklab, var(--color-amber) 45%, transparent)', background: 'color-mix(in oklab, var(--color-amber) 14%, transparent)', color: 'var(--color-amber)', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>
          Show next step
        </button>
      ) : data.answer ? (
        <div style={{ marginTop: 14, padding: '12px 16px', borderRadius: 12, background: 'color-mix(in oklab, var(--color-mint) 14%, transparent)', border: '2px solid color-mix(in oklab, var(--color-mint) 40%, transparent)', color: 'var(--color-mint)', fontSize: 14, fontWeight: 800 }}>
          Answer: {data.answer}
        </div>
      ) : null}
    </section>
  )
}

function AnalogyBlock({ data = {} }) {
  if (!data.text) return null
  return (
    <section style={{ ...card, background: 'color-mix(in oklab, var(--color-violet) 12%, var(--color-surface))', borderColor: 'color-mix(in oklab, var(--color-violet) 35%, var(--color-border))' }}>
      <SectionHeader icon={Lightbulb} label="Think of it like…" tone="var(--color-violet)" />
      <p style={{ fontSize: 16, lineHeight: 1.65, color: 'var(--color-foreground)', fontWeight: 600 }}>{data.text}</p>
    </section>
  )
}

function QuickCheckBlock({ data = {} }) {
  const options = Array.isArray(data.options) ? data.options : []
  const [picked, setPicked] = useState(null)
  if (!data.question || options.length < 2) return null
  const answered = picked != null
  return (
    <section style={card}>
      <SectionHeader icon={HelpCircle} label="Quick Check" tone="var(--color-mint)" />
      <div className="font-display" style={{ fontSize: 16, fontWeight: 800, color: 'var(--color-foreground)', marginBottom: 14, lineHeight: 1.4 }}>{data.question}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {options.map((opt, k) => {
          const isPicked = picked === k
          const correct = Boolean(opt.correct)
          const reveal = answered && (isPicked || correct)
          const color = !reveal ? 'var(--color-border)' : correct ? 'var(--color-mint)' : 'var(--color-coral)'
          return (
            <button key={k} type="button" disabled={answered} onClick={() => setPicked(k)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '14px 16px', borderRadius: 14, border: `2px solid ${reveal ? color : 'var(--color-border)'}`, background: reveal ? `color-mix(in oklab, ${color} 16%, transparent)` : 'var(--color-surface-2)', color: 'var(--color-foreground)', fontSize: 14, fontWeight: 700, cursor: answered ? 'default' : 'pointer', textAlign: 'left' }}>
              <span>{opt.text}</span>
              {reveal && (correct ? <Check size={18} strokeWidth={3} style={{ color: 'var(--color-mint)' }} /> : isPicked ? <X size={18} strokeWidth={3} style={{ color: 'var(--color-coral)' }} /> : null)}
            </button>
          )
        })}
      </div>
      {answered && data.explanation && (
        <div style={{ marginTop: 14, padding: '12px 16px', borderRadius: 12, background: 'var(--color-surface-2)', border: '2px solid var(--color-border)', fontSize: 14, color: 'var(--color-muted-foreground)', lineHeight: 1.6 }}>
          {data.explanation}
        </div>
      )}
    </section>
  )
}

export default function ConceptBlock({ content = {} }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span className="font-display" style={{ fontSize: 11, fontWeight: 900, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--color-primary)', padding: '6px 12px', borderRadius: 9999, border: '2px solid color-mix(in oklab, var(--color-primary) 40%, transparent)', background: 'color-mix(in oklab, var(--color-primary) 14%, transparent)' }}>Concept</span>
        {content.conceptTitle && <h1 className="font-display" style={{ fontSize: 24, fontWeight: 800, color: 'var(--color-foreground)', letterSpacing: '-0.02em' }}>{content.conceptTitle}</h1>}
      </div>

      {content.explanation && <ExplanationBlock data={content.explanation} />}
      {content.slideshow && <SlideshowBlock data={content.slideshow} />}
      {content.diagram && <DiagramBlock data={content.diagram} />}
      {content.workedExample && <WorkedExampleBlock data={content.workedExample} />}
      {content.analogy && <AnalogyBlock data={content.analogy} />}
      {content.quickCheck && <QuickCheckBlock data={content.quickCheck} />}
    </div>
  )
}
