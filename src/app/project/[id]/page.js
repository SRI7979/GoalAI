'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const font = "'Plus Jakarta Sans','DM Sans',system-ui,sans-serif"
const T = {
  teal: '#0ef5c2', tealDim: 'rgba(14,245,194,0.08)', tealBorder: 'rgba(14,245,194,0.22)',
  gold: '#FFD700', amber: '#F59E0B', red: '#FF453A', green: '#34D399',
  purple: '#A855F7', blue: '#3B82F6',
  text: '#f5f5f7', textMuted: '#8e8e93', bg: '#06060f',
  card: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.08)',
}

const DIFFICULTY_COLORS = {
  beginner: { color: T.teal, bg: T.tealDim, border: T.tealBorder },
  intermediate: { color: T.amber, bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.22)' },
  advanced: { color: T.red, bg: 'rgba(255,69,58,0.08)', border: 'rgba(255,69,58,0.22)' },
}

export default function SharedProjectPage() {
  const { id } = useParams()
  const router = useRouter()
  const [project, setProject] = useState(null)
  const [loading, setLoading] = useState(true)
  const [remixing, setRemixing] = useState(false)

  useEffect(() => {
    async function load() {
      if (!id) return
      const { data } = await supabase.from('projects').select('*').eq('id', id).single()
      setProject(data)
      setLoading(false)
    }
    load()
  }, [id])

  const handleRemix = async () => {
    setRemixing(true)
    // Check if user is logged in
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }
    router.push('/dashboard')
  }

  if (loading) return (
    <div style={{ minHeight: '100dvh', background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: font }}>
      <div style={{ width: 40, height: 40, borderRadius: '50%', border: `3px solid ${T.tealDim}`, borderTopColor: T.teal, animation: 'spin 0.7s linear infinite' }}/>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  if (!project) return (
    <div style={{ minHeight: '100dvh', background: T.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: font, gap: 12, padding: 40 }}>
      <div style={{ fontSize: 40 }}>404</div>
      <div style={{ color: T.text, fontSize: 16, fontWeight: 700 }}>Project not found</div>
      <div style={{ color: T.textMuted, fontSize: 13 }}>This project may be private or doesn't exist.</div>
    </div>
  )

  const review = project.ai_review
  const dc = DIFFICULTY_COLORS[project.difficulty] || DIFFICULTY_COLORS.beginner
  const steps = project.steps || []
  const completedSteps = project.progress?.steps_completed || []
  const completedAt = project.progress?.completed_at
  const authScore = project.authenticity_score
  const isBuild = project.mode === 'build'
  const timeSpent = project.progress?.started_at && project.progress?.completed_at
    ? Math.round((new Date(project.progress.completed_at) - new Date(project.progress.started_at)) / 60000)
    : null

  let authLabel, authColor
  if (authScore >= 85) { authLabel = 'Verified'; authColor = T.green }
  else if (authScore >= 70) { authLabel = 'Likely Genuine'; authColor = T.blue }
  else if (authScore >= 40) { authLabel = 'Unverified'; authColor = T.amber }
  else if (authScore !== null && authScore !== undefined) { authLabel = 'Low Effort'; authColor = T.red }

  return (
    <div style={{ minHeight: '100dvh', background: T.bg, fontFamily: font, color: T.text }}>
      <style>{`
        @keyframes scoreRing { from { stroke-dashoffset: 283; } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      {/* Hero */}
      <div style={{ position: 'relative', padding: '48px 20px 32px', textAlign: 'center', background: 'linear-gradient(180deg, rgba(14,245,194,0.06) 0%, transparent 100%)', borderBottom: `1px solid ${T.border}` }}>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '2px', textTransform: 'uppercase', color: T.teal, marginBottom: 20, opacity: 0.7 }}>Built with PathAI</div>

        {/* Score ring */}
        {review && (
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20, animation: 'fadeUp 0.5s ease' }}>
            <div style={{ position: 'relative', width: 100, height: 100 }}>
              <svg width="100" height="100" viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5"/>
                <circle cx="50" cy="50" r="45" fill="none" stroke={review.overall_score >= 90 ? T.gold : review.overall_score >= 80 ? T.teal : T.amber} strokeWidth="5" strokeLinecap="round" strokeDasharray="283" strokeDashoffset={283 - (283 * (review.overall_score || 0)) / 100} style={{ animation: 'scoreRing 1.2s ease forwards' }}/>
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ fontSize: 28, fontWeight: 900 }}>{review.overall_score}</div>
                <div style={{ fontSize: 10, color: T.textMuted, fontWeight: 600 }}>SCORE</div>
              </div>
            </div>
          </div>
        )}

        <h1 style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.5px', margin: '0 0 8px', lineHeight: 1.3 }}>{project.title}</h1>
        <p style={{ fontSize: 13, color: T.textMuted, lineHeight: 1.6, maxWidth: 480, margin: '0 auto 16px' }}>{project.description}</p>

        {/* Badges */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ padding: '5px 12px', borderRadius: 9999, fontSize: 10, fontWeight: 800, textTransform: 'uppercase', background: dc.bg, border: `1px solid ${dc.border}`, color: dc.color }}>{project.difficulty}</span>
          {isBuild && <span style={{ padding: '5px 12px', borderRadius: 9999, fontSize: 10, fontWeight: 800, background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.22)', color: T.purple }}>⚡ Build Mode</span>}
          {review?.grade && <span style={{ padding: '5px 12px', borderRadius: 9999, fontSize: 10, fontWeight: 800, background: 'rgba(255,215,0,0.08)', border: '1px solid rgba(255,215,0,0.22)', color: T.gold }}>Grade: {review.grade}</span>}
          {authLabel && <span style={{ padding: '5px 12px', borderRadius: 9999, fontSize: 10, fontWeight: 800, background: `${authColor}10`, border: `1px solid ${authColor}25`, color: authColor }}>{authScore >= 85 ? '✓ ' : ''}{authLabel}</span>}
          <span style={{ padding: '5px 12px', borderRadius: 9999, fontSize: 10, fontWeight: 800, background: T.tealDim, border: `1px solid ${T.tealBorder}`, color: T.teal }}>{completedSteps.length}/{steps.length} Steps</span>
          {timeSpent && <span style={{ padding: '5px 12px', borderRadius: 9999, fontSize: 10, fontWeight: 800, background: T.card, border: `1px solid ${T.border}`, color: T.textMuted }}>⏱ {timeSpent} min</span>}
          {completedAt && <span style={{ padding: '5px 12px', borderRadius: 9999, fontSize: 10, fontWeight: 800, background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.22)', color: T.green }}>{new Date(completedAt).toLocaleDateString()}</span>}
        </div>
      </div>

      <div style={{ maxWidth: 600, margin: '0 auto', padding: '24px 20px 80px' }}>
        {/* Advanced review scores */}
        {review && (review.originality_score || review.complexity_score || review.efficiency_score) && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 24 }}>
            {[
              { label: 'Originality', score: review.originality_score, icon: '🎨' },
              { label: 'Complexity', score: review.complexity_score, icon: '🧩' },
              { label: 'Efficiency', score: review.efficiency_score, icon: '⚡' },
            ].map(s => s.score ? (
              <div key={s.label} style={{ padding: '14px', borderRadius: 14, background: T.card, border: `1px solid ${T.border}`, textAlign: 'center' }}>
                <div style={{ fontSize: 18, marginBottom: 4 }}>{s.icon}</div>
                <div style={{ fontSize: 20, fontWeight: 900, color: s.score >= 80 ? T.teal : s.score >= 60 ? T.amber : T.red }}>{s.score}</div>
                <div style={{ fontSize: 9, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', marginTop: 2 }}>{s.label}</div>
              </div>
            ) : null)}
          </div>
        )}

        {/* Concepts */}
        {project.concepts_tested?.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: T.textMuted, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '1px' }}>Concepts Applied</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {project.concepts_tested.map((c, i) => <span key={i} style={{ padding: '5px 12px', borderRadius: 9999, fontSize: 11, fontWeight: 700, background: T.card, border: `1px solid ${T.border}`, color: T.text }}>{c}</span>)}
            </div>
          </div>
        )}

        {/* Steps */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: T.textMuted, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '1px' }}>Project Steps</div>
          {steps.map((step, i) => {
            const done = completedSteps.includes(step.id)
            return (
              <div key={step.id} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '12px 0', borderBottom: i < steps.length - 1 ? `1px solid ${T.border}` : 'none' }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, background: done ? T.teal : 'rgba(255,255,255,0.06)', color: done ? '#000' : T.textMuted }}>
                  {done ? '\u2713' : i + 1}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: done ? T.text : T.textMuted }}>{step.title}</div>
                  <div style={{ fontSize: 11, color: T.textMuted, lineHeight: 1.5, marginTop: 2 }}>{step.description?.slice(0, 120)}{step.description?.length > 120 ? '...' : ''}</div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Review */}
        {review && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: T.textMuted, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '1px' }}>AI Review</div>
            <div style={{ borderRadius: 16, padding: 20, background: T.card, border: '1px solid rgba(255,215,0,0.15)' }}>
              <div style={{ height: 2, background: 'linear-gradient(90deg, #FFD700, #FFA500, #FFD700)', borderRadius: 9999, marginBottom: 16 }}/>
              <p style={{ fontSize: 13, lineHeight: 1.7, color: '#b0b0b8', margin: '0 0 16px' }}>{review.summary}</p>

              {review.strengths?.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: T.green, marginBottom: 6 }}>Strengths</div>
                  {review.strengths.map((s, i) => <div key={i} style={{ fontSize: 12, color: '#b0b0b8', marginBottom: 4, paddingLeft: 12 }}><span style={{ color: T.green }}>+</span> {s}</div>)}
                </div>
              )}

              {review.senior_tips?.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: T.purple, marginBottom: 6 }}>Senior Dev Tips</div>
                  {review.senior_tips.map((s, i) => <div key={i} style={{ fontSize: 12, color: '#b0b0b8', marginBottom: 4, paddingLeft: 12 }}><span style={{ color: T.purple }}>→</span> {s}</div>)}
                </div>
              )}

              {review.concept_ratings?.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: T.text, marginBottom: 8 }}>Concept Mastery</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {review.concept_ratings.map((cr, i) => (
                      <span key={i} style={{ padding: '4px 10px', borderRadius: 9999, fontSize: 10, fontWeight: 800, background: cr.score >= 90 ? 'rgba(255,215,0,0.08)' : cr.score >= 70 ? T.tealDim : 'rgba(245,158,11,0.08)', border: `1px solid ${cr.score >= 90 ? 'rgba(255,215,0,0.22)' : cr.score >= 70 ? T.tealBorder : 'rgba(245,158,11,0.22)'}`, color: cr.score >= 90 ? T.gold : cr.score >= 70 ? T.teal : T.amber }}>{cr.concept}: {cr.score}%</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* CTAs — Viral Loop */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Remix */}
          <button onClick={handleRemix} disabled={remixing} style={{
            width: '100%', padding: '16px 20px', borderRadius: 16,
            background: 'linear-gradient(135deg, rgba(168,85,247,0.10), rgba(59,130,246,0.08))',
            border: '1px solid rgba(168,85,247,0.22)', cursor: 'pointer', fontFamily: font,
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <span style={{ fontSize: 28 }}>🔄</span>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: T.text }}>Remix This Project</div>
              <div style={{ fontSize: 11, color: T.textMuted }}>Build your own version with a unique twist</div>
            </div>
          </button>

          {/* Try this challenge */}
          <button onClick={() => router.push('/onboarding')} style={{
            width: '100%', padding: '16px 20px', borderRadius: 16,
            background: T.tealDim, border: `1px solid ${T.tealBorder}`,
            cursor: 'pointer', fontFamily: font,
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <span style={{ fontSize: 28 }}>🚀</span>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: T.text }}>Try This Challenge</div>
              <div style={{ fontSize: 11, color: T.textMuted }}>Start a PathAI learning journey and build projects like this</div>
            </div>
          </button>
        </div>

        {/* Watermark */}
        <div style={{ textAlign: 'center', marginTop: 32, fontSize: 10, color: 'rgba(255,255,255,0.15)', fontWeight: 600 }}>Built with PathAI</div>
      </div>
    </div>
  )
}
