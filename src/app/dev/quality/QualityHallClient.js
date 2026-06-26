'use client'

import { useEffect, useMemo, useState } from 'react'

const T = {
  bg: '#070b16',
  panel: 'rgba(15,23,42,0.82)',
  panel2: 'rgba(8,13,25,0.92)',
  border: 'rgba(148,163,184,0.18)',
  text: '#f8fafc',
  muted: '#94a3b8',
  cyan: '#38bdf8',
  teal: '#14f1c9',
  amber: '#facc15',
  red: '#ef4444',
}

function typeLabel(value = '') {
  return String(value || 'issue').replace(/_/g, ' ')
}

function severityColor(severity) {
  if (severity >= 5) return T.red
  if (severity >= 4) return T.amber
  return T.cyan
}

export default function QualityHallClient() {
  const [issues, setIssues] = useState([])
  const [summary, setSummary] = useState(null)
  const [status, setStatus] = useState('open')
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [feedbackDrafts, setFeedbackDrafts] = useState({})

  const highSeverity = useMemo(
    () => issues.filter((issue) => Number(issue.severity) >= 4),
    [issues],
  )

  async function load(nextStatus = status) {
    setLoading(true)
    setMessage('')
    try {
      const res = await fetch(`/api/quality/issues?status=${encodeURIComponent(nextStatus)}&sync=true`, {
        cache: 'no-store',
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(payload?.error || 'Could not load quality issues.')
      setIssues(payload.issues || [])
      setSummary(payload.summary || null)
      if (payload.sync?.error) setMessage(`Sync warning: ${payload.sync.error}`)
    } catch (error) {
      setMessage(error?.message || 'Could not load quality issues.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load(status)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status])

  async function postAction(body) {
    const res = await fetch('/api/quality/issues', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const payload = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(payload?.error || 'Quality action failed.')
    return payload
  }

  async function queueFeedback(issue) {
    setMessage('')
    try {
      await postAction({
        action: 'queue_prompt_feedback',
        issueId: issue.id,
        feedback: feedbackDrafts[issue.id] || issue.suggested_feedback,
      })
      setMessage('Prompt feedback queued.')
      await load(status)
    } catch (error) {
      setMessage(error?.message || 'Could not queue feedback.')
    }
  }

  async function updateStatus(issue, nextStatus) {
    setMessage('')
    try {
      await postAction({ action: 'update_status', issueId: issue.id, status: nextStatus })
      await load(status)
    } catch (error) {
      setMessage(error?.message || 'Could not update issue.')
    }
  }

  return (
    <main style={{
      minHeight: '100vh',
      background: `radial-gradient(circle at 25% 15%, rgba(20,241,201,0.13), transparent 32%), ${T.bg}`,
      color: T.text,
      padding: '40px 24px 72px',
      fontFamily: "'Plus Jakarta Sans','DM Sans',system-ui,sans-serif",
    }}>
      <div style={{maxWidth:1180,margin:'0 auto'}}>
        <header style={{display:'flex',justifyContent:'space-between',gap:20,alignItems:'flex-start',marginBottom:26}}>
          <div>
            <div style={{fontSize:12,fontWeight:900,letterSpacing:'0.16em',textTransform:'uppercase',color:T.cyan,marginBottom:10}}>
              Prompt 12 quality loop
            </div>
            <h1 style={{fontSize:'clamp(34px,5vw,64px)',lineHeight:1,letterSpacing:0,margin:0}}>
              Hall of Shame
            </h1>
            <p style={{maxWidth:720,color:'rgba(226,232,240,0.72)',fontSize:17,lineHeight:1.7,margin:'16px 0 0'}}>
              The worst learner outcomes, generation failures, dropoffs, and confusion signals become prompt-feedback work items here.
            </p>
          </div>
          <button
            onClick={() => load(status)}
            style={{
              border:0,borderRadius:16,padding:'13px 18px',
              background:`linear-gradient(135deg,${T.teal},#8ad7ff)`,
              color:'#03150f',fontWeight:900,cursor:'pointer',
            }}
          >
            Refresh + sync
          </button>
        </header>

        <section style={{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:14,marginBottom:22}}>
          {[
            ['Open issues', summary?.open ?? issues.length, T.teal],
            ['High severity', summary?.highSeverity ?? highSeverity.length, T.amber],
            ['Loaded rows', summary?.total ?? issues.length, T.cyan],
          ].map(([label, value, color]) => (
            <div key={label} style={{
              border:`1px solid ${T.border}`,
              borderRadius:20,
              background:T.panel,
              padding:18,
              boxShadow:'inset 0 1px 0 rgba(255,255,255,0.06)',
            }}>
              <div style={{fontSize:11,fontWeight:900,letterSpacing:'0.14em',textTransform:'uppercase',color:T.muted}}>
                {label}
              </div>
              <div style={{fontSize:34,fontWeight:900,color,marginTop:8}}>{value}</div>
            </div>
          ))}
        </section>

        <div style={{display:'flex',gap:10,alignItems:'center',marginBottom:18}}>
          {['open', 'feedback_queued', 'fixed', 'dismissed', 'all'].map((option) => (
            <button
              key={option}
              onClick={() => setStatus(option)}
              style={{
                border:`1px solid ${status === option ? 'rgba(20,241,201,0.48)' : T.border}`,
                borderRadius:999,
                background:status === option ? 'rgba(20,241,201,0.12)' : 'rgba(255,255,255,0.04)',
                color:status === option ? T.teal : T.text,
                padding:'9px 12px',
                fontWeight:850,
                cursor:'pointer',
              }}
            >
              {typeLabel(option)}
            </button>
          ))}
        </div>

        {message ? (
          <div style={{border:`1px solid ${T.border}`,borderRadius:16,background:T.panel2,padding:'12px 14px',color:T.muted,marginBottom:16}}>
            {message}
          </div>
        ) : null}

        {loading ? (
          <div style={{color:T.muted,padding:28}}>Loading quality issues...</div>
        ) : issues.length === 0 ? (
          <div style={{border:`1px solid ${T.border}`,borderRadius:22,background:T.panel,padding:28,color:T.muted}}>
            Nothing ugly in this slice yet. A little suspicious, but we&apos;ll take it.
          </div>
        ) : (
          <div style={{display:'grid',gap:16}}>
            {issues.map((issue) => {
              const props = issue.evidence?.properties || {}
              const queuedCount = Array.isArray(issue.prompt_feedback_items) ? issue.prompt_feedback_items.length : 0
              return (
                <article key={issue.id} style={{
                  border:`1px solid ${T.border}`,
                  borderRadius:22,
                  background:'linear-gradient(145deg,rgba(15,23,42,0.90),rgba(2,6,23,0.92))',
                  padding:20,
                  boxShadow:'0 18px 60px rgba(0,0,0,0.24), inset 0 1px 0 rgba(255,255,255,0.06)',
                }}>
                  <div style={{display:'flex',justifyContent:'space-between',gap:18,alignItems:'flex-start'}}>
                    <div style={{minWidth:0}}>
                      <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:10}}>
                        <span style={{color:severityColor(issue.severity),fontWeight:900}}>Severity {issue.severity}</span>
                        <span style={{color:T.muted}}>·</span>
                        <span style={{color:T.cyan,fontWeight:850}}>{typeLabel(issue.issue_type)}</span>
                        {issue.component_type ? <span style={{color:T.muted}}>· {issue.component_type}</span> : null}
                        {queuedCount ? <span style={{color:T.teal}}>· {queuedCount} feedback queued</span> : null}
                      </div>
                      <h2 style={{margin:0,fontSize:22,lineHeight:1.25}}>{issue.title}</h2>
                      <p style={{margin:'10px 0 0',color:T.muted,lineHeight:1.6}}>
                        {issue.suggested_feedback}
                      </p>
                    </div>
                    <div style={{display:'flex',gap:8,flexShrink:0}}>
                      <button onClick={() => updateStatus(issue, 'fixed')} style={smallButton()}>
                        Fixed
                      </button>
                      <button onClick={() => updateStatus(issue, 'dismissed')} style={smallButton()}>
                        Dismiss
                      </button>
                    </div>
                  </div>

                  <div style={{display:'grid',gridTemplateColumns:'minmax(0,1fr) minmax(0,1fr)',gap:14,marginTop:16}}>
                    <div style={miniPanel()}>
                      <div style={labelStyle()}>Evidence</div>
                      <pre style={preStyle()}>{JSON.stringify({
                        event: issue.event_name,
                        mission: issue.mission_id,
                        concepts: issue.concept_ids,
                        correct: props.correct,
                        confidence: props.confidence,
                        attempts: props.attempts,
                        hints_used: props.hints_used,
                        total_ms: props.total_ms,
                      }, null, 2)}</pre>
                    </div>
                    <div style={miniPanel()}>
                      <div style={labelStyle()}>Prompt feedback</div>
                      <div style={{color:T.muted,fontSize:13,marginBottom:8}}>
                        {issue.prompt_file || 'No prompt file mapped'}
                      </div>
                      <textarea
                        value={feedbackDrafts[issue.id] ?? issue.suggested_feedback ?? ''}
                        onChange={(event) => setFeedbackDrafts((drafts) => ({
                          ...drafts,
                          [issue.id]: event.target.value,
                        }))}
                        style={{
                          width:'100%',
                          minHeight:86,
                          resize:'vertical',
                          border:`1px solid ${T.border}`,
                          borderRadius:14,
                          background:'rgba(2,6,23,0.8)',
                          color:T.text,
                          padding:12,
                          font:'inherit',
                          lineHeight:1.45,
                        }}
                      />
                      <button onClick={() => queueFeedback(issue)} style={{
                        ...smallButton(),
                        marginTop:10,
                        background:'rgba(20,241,201,0.12)',
                        border:'1px solid rgba(20,241,201,0.34)',
                        color:T.teal,
                      }}>
                        Queue prompt feedback
                      </button>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}

function smallButton() {
  return {
    border: `1px solid ${T.border}`,
    borderRadius: 12,
    background: 'rgba(255,255,255,0.05)',
    color: T.text,
    fontWeight: 850,
    padding: '8px 10px',
    cursor: 'pointer',
  }
}

function miniPanel() {
  return {
    border: `1px solid ${T.border}`,
    borderRadius: 16,
    background: 'rgba(2,6,23,0.46)',
    padding: 14,
    minWidth: 0,
  }
}

function labelStyle() {
  return {
    fontSize: 11,
    fontWeight: 900,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    color: T.cyan,
    marginBottom: 8,
  }
}

function preStyle() {
  return {
    margin: 0,
    overflow: 'auto',
    color: 'rgba(226,232,240,0.82)',
    fontSize: 12,
    lineHeight: 1.55,
    whiteSpace: 'pre-wrap',
  }
}
