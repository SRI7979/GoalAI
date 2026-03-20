'use client'
import { useState, useEffect } from 'react'
import AIAssistant from './AIAssistant'

const font = "'Plus Jakarta Sans','DM Sans',system-ui,sans-serif"

export default function CapstoneView({ task, goal, knowledge, onClose, onComplete }) {
  const [loading, setLoading] = useState(true)
  const [capstone, setCapstone] = useState(null)
  const [checked, setChecked] = useState({})
  const [expandedMilestone, setExpandedMilestone] = useState(0)
  const [completing, setCompleting] = useState(false)

  const cacheKey = `pathai.capstone.v1::${task.id || task.title}`

  useEffect(() => {
    async function load() {
      try {
        // Load saved progress
        const saved = localStorage.getItem(cacheKey)
        if (saved) setChecked(JSON.parse(saved))
      } catch {}
      try {
        const res = await fetch('/api/capstone', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ concept: task._concept || task.title, taskTitle: task.title, goal, knowledge }),
        })
        const data = await res.json()
        if (data.title) setCapstone(data)
      } catch {}
      setLoading(false)
    }
    load()
  }, [task.title, goal, knowledge, task._concept, cacheKey])

  function toggleTask(mIdx, tIdx) {
    const key = `${mIdx}-${tIdx}`
    const next = { ...checked, [key]: !checked[key] }
    setChecked(next)
    try { localStorage.setItem(cacheKey, JSON.stringify(next)) } catch {}
  }

  const allTasks = capstone?.milestones?.flatMap((m, mi) => m.tasks?.map((_, ti) => `${mi}-${ti}`) || []) || []
  const completedCount = allTasks.filter(k => checked[k]).length
  const pct = allTasks.length > 0 ? (completedCount / allTasks.length) * 100 : 0

  return (
    <>
      <style>{`
        @keyframes spin   { to{transform:rotate(360deg)} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)} }
        @keyframes checkPop { 0%{transform:scale(0.5)}70%{transform:scale(1.18)}100%{transform:scale(1)} }
      `}</style>

      <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: '#06060f', fontFamily: font, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Top bar */}
        <div style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(6,6,15,0.90)', backdropFilter: 'blur(28px)' }}>
          <button onClick={onClose} style={{ width: 36, height: 36, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#8e8e93' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>

          {!loading && capstone && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ height: 6, width: 120, background: 'rgba(255,255,255,0.08)', borderRadius: 9999, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg,#F97316,#FBBF24)', borderRadius: 9999, transition: 'width 0.4s' }}/>
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#F97316' }}>{completedCount}/{allTasks.length}</span>
            </div>
          )}

          <div style={{ padding: '4px 12px', background: 'rgba(249,115,22,0.10)', border: '1px solid rgba(249,115,22,0.25)', borderRadius: 9999, fontSize: 11, fontWeight: 700, color: '#F97316', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Capstone
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 20px 140px' }}>
          <div style={{ maxWidth: 660, margin: '0 auto' }}>
            {loading ? (
              <div style={{ textAlign: 'center', paddingTop: 80 }}>
                <div style={{ width: 44, height: 44, border: '3px solid rgba(255,255,255,0.06)', borderTopColor: '#F97316', borderRadius: '50%', animation: 'spin 0.65s linear infinite', margin: '0 auto 20px' }}/>
                <p style={{ color: '#636366', fontSize: 14 }}>Generating your capstone project…</p>
                <p style={{ color: '#475569', fontSize: 12, marginTop: 8 }}>Designing something portfolio-worthy</p>
              </div>
            ) : !capstone ? (
              <p style={{ color: '#636366', textAlign: 'center', paddingTop: 80 }}>Could not load capstone.</p>
            ) : (
              <div style={{ animation: 'fadeIn 0.3s ease both' }}>
                {/* Header */}
                <div style={{ marginBottom: 28 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#F97316', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 8 }}>
                    🏗️ Capstone Project · {capstone.estimatedDays} day{capstone.estimatedDays !== 1 ? 's' : ''}
                  </div>
                  <h1 style={{ fontSize: 26, fontWeight: 900, color: '#f5f5f7', marginBottom: 12, letterSpacing: '-0.5px', lineHeight: 1.2 }}>{capstone.title}</h1>
                  <p style={{ fontSize: 15, color: '#8e8e93', lineHeight: 1.7, margin: 0 }}>{capstone.description}</p>
                </div>

                {/* Deliverables */}
                {capstone.deliverables?.length > 0 && (
                  <div style={{ marginBottom: 24, padding: '14px 18px', background: 'rgba(249,115,22,0.05)', border: '1px solid rgba(249,115,22,0.15)', borderRadius: 14 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#F97316', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 10 }}>Deliverables</div>
                    {capstone.deliverables.map((d, i) => (
                      <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 6 }}>
                        <span style={{ color: '#F97316', fontSize: 12, marginTop: 2 }}>▸</span>
                        <span style={{ fontSize: 13, color: '#8e8e93', lineHeight: 1.5 }}>{d}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Milestones */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {capstone.milestones?.map((milestone, mi) => {
                    const milestoneTasks = milestone.tasks || []
                    const milestoneChecked = milestoneTasks.filter((_, ti) => checked[`${mi}-${ti}`]).length
                    const milestoneComplete = milestoneChecked === milestoneTasks.length

                    return (
                      <div key={mi} style={{ border: `1.5px solid ${expandedMilestone === mi ? 'rgba(249,115,22,0.28)' : 'rgba(255,255,255,0.08)'}`, borderRadius: 18, overflow: 'hidden', transition: 'border 0.2s' }}>
                        <button
                          onClick={() => setExpandedMilestone(expandedMilestone === mi ? -1 : mi)}
                          style={{ width: '100%', padding: '16px 18px', background: expandedMilestone === mi ? 'rgba(249,115,22,0.05)' : 'rgba(255,255,255,0.02)', border: 'none', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 14, fontFamily: font }}
                        >
                          <div style={{ width: 32, height: 32, borderRadius: '50%', background: milestoneComplete ? 'rgba(52,211,153,0.15)' : 'rgba(249,115,22,0.10)', border: `1.5px solid ${milestoneComplete ? '#34D399' : 'rgba(249,115,22,0.30)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: milestoneComplete ? '#34D399' : '#F97316', flexShrink: 0, transition: 'all 0.2s' }}>
                            {milestoneComplete ? '✓' : mi + 1}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 15, fontWeight: 700, color: '#f5f5f7' }}>{milestone.title}</div>
                            <div style={{ fontSize: 12, color: '#636366', marginTop: 2 }}>{milestoneChecked}/{milestoneTasks.length} tasks done</div>
                          </div>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#636366" strokeWidth="2.5" strokeLinecap="round" style={{ transform: expandedMilestone === mi ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}><polyline points="6 9 12 15 18 9"/></svg>
                        </button>

                        {expandedMilestone === mi && (
                          <div style={{ padding: '4px 18px 16px', paddingLeft: 64 }}>
                            {milestoneTasks.map((t, ti) => (
                              <button key={ti} onClick={() => toggleTask(mi, ti)} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: '8px 0', textAlign: 'left', fontFamily: font }}>
                                <div style={{ width: 20, height: 20, borderRadius: 6, border: `1.5px solid ${checked[`${mi}-${ti}`] ? '#34D399' : 'rgba(255,255,255,0.15)'}`, background: checked[`${mi}-${ti}`] ? 'rgba(52,211,153,0.15)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2, transition: 'all 0.2s' }}>
                                  {checked[`${mi}-${ti}`] && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#34D399" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'checkPop 0.25s ease' }}><polyline points="20 6 9 17 4 12"/></svg>}
                                </div>
                                <span style={{ fontSize: 14, color: checked[`${mi}-${ti}`] ? '#636366' : '#8e8e93', lineHeight: 1.5, textDecoration: checked[`${mi}-${ti}`] ? 'line-through' : 'none', transition: 'all 0.2s' }}>{t}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom nav */}
        <div style={{ padding: '14px 20px 30px', borderTop: '1px solid rgba(255,255,255,0.08)', background: 'rgba(6,6,15,0.92)', backdropFilter: 'blur(28px)' }}>
          <div style={{ maxWidth: 660, margin: '0 auto', display: 'flex', gap: 12 }}>
            <button onClick={onClose} style={{ padding: '14px 24px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 16, color: '#8e8e93', fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: font }}>Back</button>
            <button onClick={() => { setCompleting(true); onComplete() }} disabled={completing} style={{
              flex: 1, padding: '14px',
              background: completing ? 'rgba(249,115,22,0.06)' : pct === 100 ? 'linear-gradient(135deg,#F97316,#FBBF24)' : 'rgba(249,115,22,0.08)',
              border: completing ? '1px solid rgba(249,115,22,0.22)' : pct === 100 ? 'none' : '1px solid rgba(249,115,22,0.22)',
              borderRadius: 16,
              color: completing ? '#F97316' : pct === 100 ? '#06060f' : '#F97316',
              fontSize: 16, fontWeight: 700, cursor: completing ? 'default' : 'pointer', fontFamily: font,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: pct === 100 && !completing ? '0 0 24px rgba(249,115,22,0.25)' : 'none',
            }}>
              {completing ? (
                <><div style={{width:14,height:14,border:'2px solid rgba(249,115,22,0.2)',borderTopColor:'#F97316',borderRadius:'50%',animation:'spin 0.65s linear infinite'}}/>Saving…</>
              ) : pct === 100 ? 'Submit Capstone ✓' : `Mark Complete (${completedCount}/${allTasks.length} done)`}
            </button>
          </div>
        </div>
      </div>

      <AIAssistant concept={task._concept || task.title} goal={goal} context={`Capstone: ${capstone?.milestones?.[expandedMilestone]?.title || capstone?.title || task.title}`} />
    </>
  )
}
