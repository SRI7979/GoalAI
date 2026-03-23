'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import ProjectViewer from '@/components/ProjectViewer'
import { buildProjectProofSummary, getAuthenticityLevel } from '@/lib/projectProof'

const font = "'Plus Jakarta Sans','DM Sans',system-ui,sans-serif"
const T = {
  teal: '#0ef5c2', tealDim: 'rgba(14,245,194,0.08)', tealBorder: 'rgba(14,245,194,0.22)',
  gold: '#FFD700', amber: '#F59E0B', red: '#FF453A', green: '#34D399',
  purple: '#A855F7', blue: '#3B82F6',
  text: '#f5f5f7', textMuted: '#8e8e93', bg: '#06060f',
  card: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.08)',
}

const DIFFICULTY_COLORS = { beginner: T.teal, intermediate: T.amber, advanced: T.red }

function AuthBadge({ score }) {
  if (score === null || score === undefined) return null
  const level = getAuthenticityLevel(score)
  return (
    <span style={{ padding: '3px 8px', borderRadius: 9999, fontSize: 8, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', background: `${level.color}10`, border: `1px solid ${level.color}25`, color: level.color }}>
      {score >= 85 ? '✓ ' : ''}{level.label}
    </span>
  )
}

export default function PortfolioPage() {
  const router = useRouter()
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedProject, setSelectedProject] = useState(null)
  const [userName, setUserName] = useState('')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserName(user.user_metadata?.full_name || user.email?.split('@')[0] || 'Learner')

      const { data } = await supabase
        .from('projects').select('*').eq('user_id', user.id)
        .order('created_at', { ascending: false })
      setProjects((data || []).filter((project) => (
        project?.progress?.verification_status === 'verified'
        || ['completed', 'reviewed'].includes(project?.status)
      )))
      setLoading(false)
    }
    load()
  }, [router])

  const totalCompleted = projects.length
  const avgScore = projects.filter(p => p.ai_review?.overall_score).length > 0
    ? Math.round(projects.reduce((s, p) => s + (p.ai_review?.overall_score || 0), 0) / projects.filter(p => p.ai_review?.overall_score).length)
    : null
  const allConcepts = [...new Set(projects.flatMap(p => p.concepts_tested || []))]
  const totalXp = projects.reduce((s, p) => s + (p.xp_reward || 0), 0)
  const verifiedCount = projects.filter(p => p?.progress?.verification_status === 'verified').length
  const avgAuth = projects.filter(p => p.authenticity_score).length > 0
    ? Math.round(projects.reduce((s, p) => s + (p.authenticity_score || 0), 0) / projects.filter(p => p.authenticity_score).length)
    : null

  if (selectedProject) {
    return (
      <ProjectViewer
        task={{ id: selectedProject.id, type: 'project', title: selectedProject.title }}
        goal="" knowledge="" goalId={selectedProject.goal_id}
        onClose={() => setSelectedProject(null)} readOnly
      />
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: T.bg, fontFamily: font, color: T.text }}>
      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes scoreRing { from { stroke-dashoffset: 264; } }
      `}</style>

      {/* Header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 10, background: 'rgba(6,6,15,0.92)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderBottom: `1px solid ${T.border}`, padding: '14px 20px' }}>
        <div style={{ maxWidth: 640, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: T.teal, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: font, padding: 0 }}>← Back</button>
          <div style={{ flex: 1, fontSize: 16, fontWeight: 800, textAlign: 'center' }}>My Portfolio</div>
          <div style={{ width: 48 }}/>
        </div>
      </div>

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '20px 20px 80px' }}>
        {/* Profile card */}
        <div style={{ padding: '24px 20px', borderRadius: 20, background: 'linear-gradient(165deg, rgba(14,245,194,0.06), rgba(168,85,247,0.03))', border: `1px solid ${T.tealBorder}`, marginBottom: 20, textAlign: 'center' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'linear-gradient(135deg, #0ef5c2, #3B82F6)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: 24, fontWeight: 900, color: '#000' }}>
            {userName.charAt(0).toUpperCase()}
          </div>
          <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 4 }}>{userName}</div>
          <div style={{ fontSize: 12, color: T.textMuted }}>PathAI Developer Portfolio</div>
          {verifiedCount > 0 && (
            <div style={{ marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 9999, background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.22)' }}>
              <span style={{ fontSize: 10, fontWeight: 800, color: T.green }}>✓ {verifiedCount} Verified Project{verifiedCount !== 1 ? 's' : ''}</span>
            </div>
          )}
        </div>

        <div style={{ padding: '16px 18px', borderRadius: 18, background: T.card, border: `1px solid ${T.border}`, marginBottom: 24 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: T.textMuted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '1px' }}>Proof of Skill Resume</div>
          <div style={{ fontSize: 13, lineHeight: 1.7, color: '#b0b0b8' }}>
            This portfolio highlights project-based proof of ability, not course completion. Each entry is scored by AI review, weighted by authenticity, and framed around what was built in the real world.
          </div>
        </div>

        {/* Stats grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 24 }}>
          {[
            { value: totalCompleted, label: 'Projects', color: T.teal },
            { value: avgScore ?? '—', label: 'Avg Score', color: T.gold },
            { value: allConcepts.length, label: 'Skills', color: T.purple },
            { value: avgAuth ? `${avgAuth}%` : '—', label: 'Auth', color: T.green },
          ].map((s, i) => (
            <div key={i} style={{ padding: '14px 8px', borderRadius: 14, background: T.card, border: `1px solid ${T.border}`, textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 900, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 9, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.6px', marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Skills */}
        {allConcepts.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: T.textMuted, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '1px' }}>Skills Demonstrated</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {allConcepts.slice(0, 20).map((c, i) => (
                <span key={i} style={{ padding: '4px 10px', borderRadius: 9999, fontSize: 10, fontWeight: 700, background: T.card, border: `1px solid ${T.border}`, color: T.text }}>{c}</span>
              ))}
              {allConcepts.length > 20 && <span style={{ fontSize: 10, color: T.textMuted, fontWeight: 700, padding: '4px 8px' }}>+{allConcepts.length - 20} more</span>}
            </div>
          </div>
        )}

        {/* Projects */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: T.textMuted }}>Loading portfolio...</div>
        ) : projects.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 24px', borderRadius: 20, background: T.card, border: `1px solid ${T.border}` }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🧭</div>
            <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 8 }}>No projects yet</div>
            <div style={{ fontSize: 13, color: T.textMuted, lineHeight: 1.6, marginBottom: 20 }}>Complete your first milestone project to start building your portfolio!</div>
            <button onClick={() => router.push('/dashboard')} style={{ padding: '12px 24px', borderRadius: 14, border: 'none', background: T.teal, color: '#000', fontSize: 14, fontWeight: 800, cursor: 'pointer', fontFamily: font }}>Go to Dashboard</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '1px' }}>Completed Projects</div>
            {projects.map((p, i) => {
              const dc = DIFFICULTY_COLORS[p.difficulty] || T.teal
              const hasReview = !!p.ai_review
              const score = p.ai_review?.overall_score
              const grade = p.ai_review?.grade
              const isBuild = p.mode === 'build'
              const isVerified = p?.progress?.verification_status === 'verified'
              const proofSummary = buildProjectProofSummary(p, p.progress?.authenticity || null)
              const timeSpent = p.progress?.started_at && p.progress?.completed_at
                ? Math.round((new Date(p.progress.completed_at) - new Date(p.progress.started_at)) / 60000)
                : null

              return (
                <div key={p.id} onClick={() => setSelectedProject(p)} style={{
                  padding: '18px', borderRadius: 18, background: T.card, border: `1px solid ${T.border}`, cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s', animation: `fadeUp 0.3s ease ${i * 0.05}s both`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <div style={{ fontSize: 15, fontWeight: 800, color: T.text, letterSpacing: '-0.2px' }}>{p.title}</div>
                      </div>
                      <div style={{ fontSize: 12, color: T.textMuted, lineHeight: 1.5 }}>
                        {p.description?.slice(0, 100)}{p.description?.length > 100 ? '...' : ''}
                      </div>
                      <div style={{ marginTop: 8, padding: '8px 10px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: `1px solid ${T.border}` }}>
                        <div style={{ fontSize: 9, fontWeight: 800, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 4 }}>Proof</div>
                        <div style={{ fontSize: 11, lineHeight: 1.5, color: T.text }}>{proofSummary.finalDeliverable}</div>
                      </div>
                    </div>
                    {hasReview && score && (
                      <div style={{ position: 'relative', width: 48, height: 48, flexShrink: 0, marginLeft: 12 }}>
                        <svg width="48" height="48" viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
                          <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6"/>
                          <circle cx="50" cy="50" r="42" fill="none" stroke={score >= 90 ? T.gold : score >= 80 ? T.teal : score >= 60 ? T.amber : T.red} strokeWidth="6" strokeLinecap="round" strokeDasharray="264" strokeDashoffset={264 - (264 * score) / 100} style={{ animation: 'scoreRing 0.8s ease forwards' }}/>
                        </svg>
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 900, color: T.text }}>{grade}</div>
                      </div>
                    )}
                  </div>

                  {/* Bottom row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ padding: '3px 8px', borderRadius: 9999, fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.6px', color: dc, background: `${dc}12`, border: `1px solid ${dc}30` }}>{p.difficulty}</span>
                    {isBuild && <span style={{ padding: '3px 8px', borderRadius: 9999, fontSize: 9, fontWeight: 800, background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.22)', color: T.purple }}>⚡ Build</span>}
                    {isVerified && <span style={{ padding: '3px 8px', borderRadius: 9999, fontSize: 9, fontWeight: 800, background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)', color: T.green }}>✓ Verified</span>}
                    <AuthBadge score={p.authenticity_score} />
                    {proofSummary.verificationLayers?.filter((layer) => layer.passed).slice(0, 2).map((layer) => (
                      <span key={layer.id} style={{ padding: '3px 8px', borderRadius: 9999, fontSize: 9, fontWeight: 700, background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)', color: T.green }}>
                        {layer.title}
                      </span>
                    ))}
                    {timeSpent && <span style={{ fontSize: 9, color: T.textMuted, fontWeight: 700 }}>⏱ {timeSpent}m</span>}
                    {(p.concepts_tested || []).slice(0, 2).map((c, ci) => (
                      <span key={ci} style={{ padding: '3px 8px', borderRadius: 9999, fontSize: 9, fontWeight: 700, background: 'rgba(255,255,255,0.04)', color: T.textMuted }}>{c}</span>
                    ))}
                    <span style={{ marginLeft: 'auto', fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>
                      {new Date(p.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
