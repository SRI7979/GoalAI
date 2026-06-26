'use client'

// Lessons devtool — type a learning goal, generate a CONCEPT lesson for it, and
// preview every sub-block exactly as a learner would see it. Iterate from here.

import { useState } from 'react'
import { GraduationCap, Sparkles, RefreshCw } from 'lucide-react'
import ConceptBlock from '@/components/lessons/ConceptBlock'

const PRESETS = ['Learn Python', 'Understand derivatives in calculus', 'Spanish for travel', 'How chess openings work', 'Intro to UI/UX design']

export default function LessonsDevtoolPage() {
  const [goal, setGoal] = useState('')
  const [content, setContent] = useState(null)
  const [source, setSource] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showJson, setShowJson] = useState(false)

  async function generate(g) {
    const target = String(g ?? goal).trim()
    if (!target || loading) return
    setGoal(target)
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/dev/concept-lesson', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal: target }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data?.content) throw new Error(data?.error || 'Generation failed')
      setContent(data.content)
      setSource(data.source || '')
    } catch (e) {
      setError(e?.message || 'Generation failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="lovable-app" style={{ minHeight: '100vh', background: 'var(--color-background)', padding: '0 16px 80px' }}>
      <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '22px 4px 6px' }}>
          <div style={{ width: 40, height: 40, borderRadius: 14, display: 'grid', placeItems: 'center', color: 'var(--color-violet)', background: 'color-mix(in oklab, var(--color-violet) 18%, transparent)', border: '2px solid color-mix(in oklab, var(--color-violet) 40%, transparent)' }}>
            <GraduationCap size={20} strokeWidth={2.4} />
          </div>
          <div>
            <h1 className="font-display" style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-foreground)' }}>Lessons Lab</h1>
            <div style={{ fontSize: 13, color: 'var(--color-muted-foreground)', fontWeight: 600 }}>Concept phase preview</div>
          </div>
        </div>

        {/* goal input */}
        <form onSubmit={(e) => { e.preventDefault(); generate() }} style={{ display: 'flex', gap: 10 }}>
          <input
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="Type a learning goal…"
            style={{ flex: 1, padding: '14px 16px', borderRadius: 16, background: 'var(--color-surface)', border: '2px solid var(--color-border)', color: 'var(--color-foreground)', fontSize: 15, fontWeight: 600, outline: 'none' }}
          />
          <button type="submit" disabled={!goal.trim() || loading} className="font-display"
            style={{ padding: '0 22px', borderRadius: 16, border: 'none', background: goal.trim() && !loading ? 'var(--color-primary)' : 'var(--color-surface-2)', color: goal.trim() && !loading ? 'var(--color-primary-foreground)' : 'var(--color-muted-foreground)', boxShadow: goal.trim() && !loading ? '0 5px 0 0 var(--color-primary-shadow)' : 'none', fontSize: 14, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', cursor: goal.trim() && !loading ? 'pointer' : 'default', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Sparkles size={16} /> {loading ? 'Generating…' : 'Generate'}
          </button>
        </form>

        {/* presets */}
        {!content && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {PRESETS.map((p) => (
              <button key={p} type="button" onClick={() => generate(p)}
                style={{ padding: '8px 14px', borderRadius: 9999, border: '2px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-muted-foreground)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                {p}
              </button>
            ))}
          </div>
        )}

        {error && (
          <div style={{ padding: '14px 16px', borderRadius: 14, background: 'color-mix(in oklab, var(--color-coral) 14%, transparent)', border: '2px solid color-mix(in oklab, var(--color-coral) 40%, transparent)', color: 'var(--color-coral)', fontSize: 14, fontWeight: 700 }}>{error}</div>
        )}

        {loading && (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-muted-foreground)', fontSize: 15, fontWeight: 600 }}>Building the concept lesson…</div>
        )}

        {content && !loading && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: source === 'ai' ? 'var(--color-mint)' : 'var(--color-amber)' }}>
                {source === 'ai' ? '● live AI content' : '● fallback (no API key)'}
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" onClick={() => setShowJson((v) => !v)} style={{ padding: '8px 12px', borderRadius: 10, border: '2px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-muted-foreground)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>{showJson ? 'Hide' : 'Show'} JSON</button>
                <button type="button" onClick={() => generate()} style={{ padding: '8px 12px', borderRadius: 10, border: '2px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-foreground)', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}><RefreshCw size={13} /> Regenerate</button>
              </div>
            </div>

            {showJson && (
              <pre style={{ padding: 16, borderRadius: 14, background: 'var(--color-surface-2)', border: '2px solid var(--color-border)', color: 'var(--color-muted-foreground)', fontSize: 11, lineHeight: 1.5, overflowX: 'auto', maxHeight: 320, overflowY: 'auto' }}>{JSON.stringify(content, null, 2)}</pre>
            )}

            <ConceptBlock content={content} />
          </>
        )}
      </div>
    </div>
  )
}
