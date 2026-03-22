'use client'
import { useState, useEffect } from 'react'
import AIAssistant from './AIAssistant'

export default function ProjectView({ task, goal, knowledge, onClose, onComplete }) {
  const [loading, setLoading]   = useState(true)
  const [project, setProject]   = useState(null)
  const [checked, setChecked]   = useState({})
  const [showHint, setShowHint] = useState(false)
  const [completing, setCompleting] = useState(false)

  const font = "'Plus Jakarta Sans','DM Sans',system-ui,sans-serif"

  useEffect(() => {
    async function load() {
      setLoading(true)
      const cacheKey = `pathai.project.v1::${task.id || task.title}`
      try {
        const cached = localStorage.getItem(cacheKey)
        if (cached) {
          const data = JSON.parse(cached)
          if (data.steps) { setProject(data); setLoading(false); return }
        }
      } catch {}
      try {
        const res = await fetch('/api/project', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ concept: task._concept || task.title, taskTitle: task.title, goal, knowledge, taskType: task.type }),
        })
        const data = await res.json()
        if (data.steps) {
          setProject(data)
          try { localStorage.setItem(cacheKey, JSON.stringify(data)) } catch {}
        }
      } catch {}
      setLoading(false)
    }
    load()
  }, [task.id, task.title, goal, knowledge, task.type, task._concept])

  const allChecked = project && project.steps.every(s => checked[s.id])
  const checkedCount = Object.values(checked).filter(Boolean).length
  const totalSteps = project?.steps?.length || 0

  return (
    <>
      <style>{`
        @keyframes fadeIn { from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)} }
        @keyframes spin    { to{transform:rotate(360deg)} }
        @keyframes checkPop { 0%{transform:scale(0.5)}70%{transform:scale(1.2)}100%{transform:scale(1)} }
      `}</style>

      <div style={{
        position:'fixed', inset:0, zIndex:200,
        background:'linear-gradient(180deg,#06060f 0%,#080814 100%)',
        fontFamily: font, display:'flex', flexDirection:'column', overflow:'hidden',
      }}>

        {/* Top bar */}
        <div style={{ padding:'14px 20px', display:'flex', alignItems:'center', justifyContent:'space-between', borderBottom:'1px solid rgba(255,255,255,0.08)', background:'rgba(6,6,15,0.88)', backdropFilter:'blur(28px)' }}>
          <button onClick={onClose} style={{ width:36, height:36, background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.10)', borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'#8e8e93' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>

          {/* Step progress */}
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            {!loading && project && (
              <>
                <div style={{ height:6, width:120, background:'rgba(255,255,255,0.08)', borderRadius:9999, overflow:'hidden' }}>
                  <div style={{ height:'100%', width:`${totalSteps>0?(checkedCount/totalSteps)*100:0}%`, background:'linear-gradient(90deg,#818CF8,#6366F1)', borderRadius:9999, transition:'width 0.3s' }}/>
                </div>
                <span style={{ fontSize:12, fontWeight:700, color:'#818CF8' }}>{checkedCount}/{totalSteps}</span>
              </>
            )}
          </div>

          <div style={{ padding:'4px 12px', background:'rgba(129,140,248,0.10)', border:'1px solid rgba(129,140,248,0.25)', borderRadius:9999, fontSize:11, fontWeight:700, color:'#818CF8', textTransform:'uppercase', letterSpacing:'1px' }}>
            {task.type === 'exercise' ? 'Exercise' : 'Practice'}
          </div>
        </div>

        {/* Content */}
        <div style={{ flex:1, overflow:'auto', padding:'20px 20px 120px' }}>
          <div style={{ maxWidth:680, margin:'0 auto' }}>

            {loading ? (
              <div style={{ textAlign:'center', paddingTop:80 }}>
                <div style={{ width:44, height:44, border:'3px solid rgba(255,255,255,0.06)', borderTopColor:'#818CF8', borderRadius:'50%', animation:'spin 0.65s linear infinite', margin:'0 auto 20px' }}/>
                <p style={{ color:'#636366', fontSize:14 }}>Generating your project…</p>
                <p style={{ color:'#475569', fontSize:12, marginTop:8 }}>Building something hands-on for you</p>
              </div>
            ) : !project ? (
              <div style={{ textAlign:'center', paddingTop:80 }}>
                <p style={{ color:'#636366' }}>Could not generate project. Use the task description above as your guide.</p>
                <p style={{ color:'#8e8e93', fontSize:14, marginTop:12 }}>{task.description}</p>
              </div>
            ) : (
              <div style={{ animation:'fadeIn 0.35s ease both' }}>
                {/* Header */}
                <div style={{ display:'inline-flex', alignItems:'center', gap:7, padding:'5px 14px', marginBottom:16, background:'rgba(129,140,248,0.08)', border:'1px solid rgba(129,140,248,0.20)', borderRadius:9999, fontSize:11, fontWeight:700, color:'#818CF8', textTransform:'uppercase', letterSpacing:'1px' }}>
                  🛠️ Mini Project
                </div>
                <h1 style={{ fontSize:26, fontWeight:800, color:'#f5f5f7', letterSpacing:'-0.5px', lineHeight:1.25, marginBottom:10 }}>
                  {project.title}
                </h1>
                <p style={{ fontSize:15, color:'#8e8e93', lineHeight:1.6, marginBottom:28 }}>
                  {project.objective}
                </p>

                {/* Steps */}
                <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                  {project.steps.map((step) => {
                    const done = !!checked[step.id]
                    return (
                      <div key={step.id} onClick={() => setChecked(prev => ({ ...prev, [step.id]: !prev[step.id] }))}
                        style={{ padding:'16px 18px', background: done ? 'rgba(129,140,248,0.07)' : 'rgba(255,255,255,0.03)', border:`1.5px solid ${done ? 'rgba(129,140,248,0.35)' : 'rgba(255,255,255,0.08)'}`, borderRadius:18, cursor:'pointer', display:'flex', gap:14, alignItems:'flex-start', transition:'all 0.2s' }}>
                        <div style={{ width:28, height:28, borderRadius:'50%', flexShrink:0, marginTop:1, background: done ? 'linear-gradient(135deg,#818CF8,#6366F1)' : 'rgba(255,255,255,0.06)', border:`2px solid ${done ? 'transparent' : 'rgba(255,255,255,0.14)'}`, display:'flex', alignItems:'center', justifyContent:'center', animation: done ? 'checkPop 0.3s cubic-bezier(0.34,1.56,0.64,1)' : 'none' }}>
                          {done
                            ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                            : <span style={{ fontSize:12, fontWeight:700, color:'#636366' }}>{step.id}</span>
                          }
                        </div>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:15, fontWeight:700, color: done ? '#818CF8' : '#f5f5f7', marginBottom:4, textDecoration: done ? 'line-through' : 'none', opacity: done ? 0.7 : 1 }}>
                            {step.title}
                          </div>
                          {!done && (
                            <p style={{ fontSize:13, color:'#636366', lineHeight:1.6, margin:0 }}>
                              {step.description}
                            </p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Hint */}
                {project.hint && (
                  <div style={{ marginTop:20 }}>
                    <button onClick={() => setShowHint(v=>!v)} style={{ background:'none', border:'none', color:'#636366', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:font, display:'flex', alignItems:'center', gap:6, padding:0 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                      {showHint ? 'Hide hint' : 'Show hint'}
                    </button>
                    {showHint && (
                      <div style={{ marginTop:10, padding:'12px 16px', background:'rgba(251,191,36,0.05)', border:'1px solid rgba(251,191,36,0.18)', borderRadius:14 }}>
                        <p style={{ fontSize:13, color:'#8e8e93', margin:0, lineHeight:1.6 }}>{project.hint}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Success criteria */}
                {project.successCriteria && allChecked && (
                  <div style={{ marginTop:20, padding:'14px 18px', background:'rgba(14,245,194,0.06)', border:'1px solid rgba(14,245,194,0.22)', borderRadius:16, animation:'fadeIn 0.3s ease both' }}>
                    <div style={{ fontSize:11, fontWeight:700, color:'#0ef5c2', textTransform:'uppercase', letterSpacing:'1px', marginBottom:6 }}>Success criteria</div>
                    <p style={{ fontSize:14, color:'#8e8e93', margin:0, lineHeight:1.6 }}>{project.successCriteria}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Bottom nav */}
        <div style={{ padding:'14px 20px 30px', borderTop:'1px solid rgba(255,255,255,0.08)', background:'rgba(6,6,15,0.90)', backdropFilter:'blur(28px)' }}>
          <div style={{ maxWidth:680, margin:'0 auto', display:'flex', gap:12 }}>
            <button onClick={onClose} style={{ padding:'14px 24px', background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:16, color:'#8e8e93', fontSize:15, fontWeight:600, cursor:'pointer', fontFamily:font }}>Back</button>
            <button onClick={() => { setCompleting(true); onComplete() }} disabled={completing} style={{
              flex:1, padding:'14px',
              background: completing ? 'rgba(14,245,194,0.06)' : allChecked ? 'linear-gradient(135deg,#0ef5c2,#00d4ff)' : 'linear-gradient(135deg,#818CF8,#6366F1)',
              border: completing ? '1px solid rgba(14,245,194,0.22)' : 'none',
              borderRadius:16, color: completing ? '#0ef5c2' : '#06060f', fontSize:16, fontWeight:700,
              cursor: completing ? 'default' : 'pointer', fontFamily:font,
              boxShadow: completing ? 'none' : '0 0 32px rgba(14,245,194,0.22)',
              display:'flex', alignItems:'center', justifyContent:'center', gap:8,
            }}>
              {completing ? (
                <><div style={{width:14,height:14,border:'2px solid rgba(14,245,194,0.2)',borderTopColor:'#0ef5c2',borderRadius:'50%',animation:'spin 0.65s linear infinite'}}/>Saving…</>
              ) : allChecked ? 'Complete ✓' : `Complete (${checkedCount}/${totalSteps} done)`}
            </button>
          </div>
        </div>
      </div>

      <AIAssistant concept={task._concept || task.title} goal={goal} context={`Project: ${project?.title || task.title}`} />
    </>
  )
}
