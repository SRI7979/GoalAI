// Path page — iOS Liquid Glass Edition
'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const taskTypeStyle = {
  lesson:   { bg: 'rgba(14,245,194,0.10)',  border: 'rgba(14,245,194,0.28)',  color: '#0ef5c2',  label: 'LESSON'   },
  video:    { bg: 'rgba(255,180,0,0.10)',   border: 'rgba(255,180,0,0.28)',   color: '#ffb400',  label: 'VIDEO'    },
  practice: { bg: 'rgba(0,212,255,0.10)',   border: 'rgba(0,212,255,0.28)',   color: '#00d4ff',  label: 'PRACTICE' },
  exercise: { bg: 'rgba(168,85,247,0.10)',  border: 'rgba(168,85,247,0.28)', color: '#a855f7',  label: 'EXERCISE' },
  quiz:     { bg: 'rgba(255,69,58,0.10)',   border: 'rgba(255,69,58,0.28)',   color: '#ff453a',  label: 'QUIZ'     },
  review:   { bg: 'rgba(251,191,36,0.10)',  border: 'rgba(251,191,36,0.28)', color: '#fbbf24',  label: 'REVIEW'   },
}

const CheckIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
const LockIcon  = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
const StarIcon  = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
const BoltIcon  = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
const ArrowIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>

export default function PathPage() {
  const router = useRouter()
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState('')
  const [goal, setGoal]           = useState(null)
  const [sections, setSections]   = useState([])
  const [activeNode, setActiveNode] = useState(null)
  const [completing, setCompleting] = useState(null)
  const [xpPop, setXpPop]         = useState(null)
  const [streak, setStreak]       = useState(0)
  const [totalXp, setTotalXp]     = useState(0)

  const load = useCallback(async () => {
    setLoading(true); setError('')
    const { data: authData } = await supabase.auth.getUser()
    const user = authData?.user
    if (!user) { router.push('/login'); return }

    const { data: activeGoal, error: goalError } = await supabase
      .from('goals').select('*').eq('user_id', user.id)
      .eq('status', 'active').order('created_at', { ascending: false })
      .limit(1).maybeSingle()
    if (goalError) { setError(goalError.message); setLoading(false); return }
    if (!activeGoal) { setLoading(false); return }
    setGoal(activeGoal)

    const { data: rows, error: rowsError } = await supabase
      .from('daily_tasks').select('*')
      .eq('goal_id', activeGoal.id).eq('user_id', user.id)
      .order('day_number', { ascending: true })
    if (rowsError) { setError(rowsError.message); setLoading(false); return }

    const taskRows = rows || []
    const nodes = []
    let foundActive = false
    for (const row of taskRows) {
      const tasks = Array.isArray(row.tasks) ? row.tasks : []
      const completedCount = tasks.filter((t) => t.completed).length
      const isDone = row.completion_status === 'completed' || (tasks.length > 0 && completedCount === tasks.length)
      let status
      if (isDone)             { status = 'done'   }
      else if (!foundActive)  { status = 'active'; foundActive = true }
      else                    { status = 'locked' }
      nodes.push({
        id: row.id, dayNumber: row.day_number,
        conceptName: row.covered_topics?.[0] || `Day ${row.day_number}`,
        tasks, totalTasks: tasks.length, completedTasks: completedCount,
        status, totalMinutes: row.total_minutes || row.totalMinutes || 30,
      })
    }

    const grouped = []
    for (const node of nodes) {
      const last = grouped[grouped.length - 1]
      if (last && last.conceptName === node.conceptName) { last.nodes.push(node) }
      else { grouped.push({ conceptName: node.conceptName, nodes: [node] }) }
    }
    setSections(grouped)

    const xp = taskRows.reduce((acc, row) => acc + (Array.isArray(row.tasks) ? row.tasks : []).filter((tk) => tk.completed).length * 10, 0)
    setTotalXp(xp)

    const { data: progress } = await supabase.from('user_progress').select('current_streak').eq('goal_id', activeGoal.id).eq('user_id', user.id).maybeSingle()
    setStreak(progress?.current_streak || 0)
    setLoading(false)
  }, [router])

  useEffect(() => { load() }, [load])

  async function completeTask(taskRowId, taskId, event) {
    setCompleting(taskId)
    if (event) {
      const rect = event.currentTarget.getBoundingClientRect()
      setXpPop({ x: rect.left + rect.width / 2, y: rect.top - 10 })
      setTimeout(() => setXpPop(null), 1200)
    }
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const accessToken = session?.access_token || null
      const res = await fetch('/api/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) },
        body: JSON.stringify({ taskRowId, taskId, accessToken }),
      })
      if (!res.ok) { setError('Failed to complete task'); setCompleting(null); return }
      setActiveNode((prev) => {
        if (!prev || prev.id !== taskRowId) return prev
        const updatedTasks = prev.tasks.map((t) => t.id === taskId ? { ...t, completed: true } : t)
        return { ...prev, tasks: updatedTasks, completedTasks: updatedTasks.filter((t) => t.completed).length }
      })
      setTotalXp((x) => x + 10)
    } catch { setError('Network error') }
    setCompleting(null)
    setTimeout(() => load(), 700)
  }

  // ── Task Sheet (iOS Bottom Sheet) ─────────────────────────────────────────
  function TaskSheet({ node, onClose }) {
    const pct = node.totalTasks > 0 ? node.completedTasks / node.totalTasks : 0
    return (
      <>
        {/* Backdrop */}
        <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 100, backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', animation: 'fadeBackdrop 0.25s ease' }} />

        {/* Sheet */}
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 101,
          background: 'linear-gradient(180deg, rgba(18,20,36,0.96) 0%, rgba(8,10,20,0.98) 100%)',
          borderTop: '1px solid rgba(255,255,255,0.14)',
          borderRadius: '28px 28px 0 0',
          maxHeight: '90vh', overflowY: 'auto',
          animation: 'sheetUp 0.30s cubic-bezier(0.34,1.3,0.64,1)',
          backdropFilter: 'blur(40px) saturate(200%)',
          WebkitBackdropFilter: 'blur(40px) saturate(200%)',
          boxShadow: '0 -32px 80px rgba(0,0,0,0.50), inset 0 1px 0 rgba(255,255,255,0.18)',
        }}>
          {/* Handle */}
          <div style={{ display: 'flex', justifyContent: 'center', padding: '14px 0 6px' }}>
            <div style={{ width: 40, height: 4, borderRadius: 9999, background: 'rgba(255,255,255,0.20)' }} />
          </div>

          {/* Header */}
          <div style={{ padding: '8px 24px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#0ef5c2', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 6 }}>Day {node.dayNumber}</div>
                <h2 style={{ fontSize: 22, fontWeight: 800, color: '#f5f5f7', letterSpacing: '-0.5px', marginBottom: 14, lineHeight: 1.25 }}>{node.conceptName}</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 9999, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct * 100}%`, background: 'linear-gradient(90deg, #0ef5c2, #00d4ff)', borderRadius: 9999, transition: 'width 0.5s cubic-bezier(0.16,1,0.3,1)', boxShadow: '0 0 10px rgba(14,245,194,0.50)' }} />
                  </div>
                  <span style={{ fontSize: 12, color: '#8e8e93', fontWeight: 600, flexShrink: 0 }}>{node.completedTasks}/{node.totalTasks}</span>
                </div>
              </div>
              <button onClick={onClose} style={{ width: 36, height: 36, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#8e8e93', flexShrink: 0, transition: 'all 0.18s' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          </div>

          {pct === 1 && (
            <div style={{ margin: '16px 24px 0', padding: '14px 18px', background: 'rgba(14,245,194,0.08)', border: '1px solid rgba(14,245,194,0.24)', borderRadius: 18, display: 'flex', alignItems: 'center', gap: 12, boxShadow: 'inset 0 1px 0 rgba(14,245,194,0.22)' }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#0ef5c2,#00d4ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 0 22px rgba(14,245,194,0.40)' }}>
                <CheckIcon />
              </div>
              <div>
                <div style={{ color: '#0ef5c2', fontWeight: 700, fontSize: 14 }}>Section complete!</div>
                <div style={{ color: '#8e8e93', fontSize: 12, marginTop: 2 }}>Move on to your next concept.</div>
              </div>
            </div>
          )}

          {/* Tasks */}
          <div style={{ padding: '16px 24px 44px', display: 'grid', gap: 10 }}>
            {node.tasks.map((task) => {
              const ts = taskTypeStyle[task.type] || taskTypeStyle.lesson
              const isCompleting = completing === task.id
              return (
                <div key={task.id} style={{
                  background: task.completed ? 'rgba(14,245,194,0.05)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${task.completed ? 'rgba(14,245,194,0.20)' : 'rgba(255,255,255,0.08)'}`,
                  borderRadius: 20,
                  padding: '16px',
                  backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
                  boxShadow: task.completed ? 'inset 0 1px 0 rgba(14,245,194,0.14)' : 'inset 0 1px 0 rgba(255,255,255,0.07)',
                  transition: 'all 0.2s',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 9 }}>
                    <span style={{ padding: '3px 10px', background: ts.bg, border: `1px solid ${ts.border}`, borderRadius: 9999, fontSize: 10, fontWeight: 800, color: ts.color, letterSpacing: '0.8px' }}>{ts.label}</span>
                    <span style={{ fontSize: 11, color: '#636366', fontWeight: 600 }}>{task.durationMin || 0} min</span>
                    {task.completed && <span style={{ marginLeft: 'auto', fontSize: 12, color: '#0ef5c2', fontWeight: 700 }}>✓ Done</span>}
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: task.completed ? '#636366' : '#f5f5f7', marginBottom: 6, lineHeight: 1.35 }}>
                    {task.completed ? <s style={{ textDecorationColor: '#3a3a3c' }}>{task.title}</s> : task.title}
                  </div>
                  {task.description && (
                    <p style={{ fontSize: 13, color: '#8e8e93', lineHeight: 1.6, marginBottom: task.resourceUrl ? 10 : 0 }}>
                      {task.description.length > 120 ? task.description.slice(0, 120) + '…' : task.description}
                    </p>
                  )}
                  {task.resourceUrl && (
                    <a href={task.resourceUrl} target="_blank" rel="noopener noreferrer"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#00d4ff', fontWeight: 600, textDecoration: 'none', marginBottom: task.completed ? 0 : 12 }}>
                      {task.resourceTitle || 'Open resource'} <ArrowIcon />
                    </a>
                  )}
                  {!task.completed && (
                    <button
                      disabled={isCompleting}
                      onClick={(e) => completeTask(node.id, task.id, e)}
                      style={{
                        width: '100%', marginTop: 6, padding: '13px',
                        background: isCompleting ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg,#0ef5c2,#00d4ff)',
                        border: isCompleting ? '1px solid rgba(255,255,255,0.08)' : 'none',
                        borderRadius: 14, color: isCompleting ? '#636366' : '#06060f',
                        fontSize: 14, fontWeight: 800, cursor: isCompleting ? 'default' : 'pointer',
                        fontFamily: "'DM Sans', sans-serif",
                        boxShadow: isCompleting ? 'none' : '0 0 28px rgba(14,245,194,0.32), inset 0 1px 0 rgba(255,255,255,0.45)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        transition: 'all 0.22s cubic-bezier(0.16,1,0.3,1)',
                      }}>
                      {isCompleting
                        ? <><div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.08)', borderTopColor: '#0ef5c2', borderRadius: '50%', animation: 'spin 0.65s linear infinite' }} /> Completing...</>
                        : <><BoltIcon /> Complete · +10 XP</>}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </>
    )
  }

  // ── Loading / error / empty states ─────────────────────────────────────────
  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 44, height: 44, border: '3px solid rgba(255,255,255,0.06)', borderTopColor: '#0ef5c2', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 16px', boxShadow: '0 0 22px rgba(14,245,194,0.15)' }} />
        <p style={{ color: '#8e8e93', fontSize: 14 }}>Loading your path...</p>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
  if (error) return <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', color: '#ff453a', fontFamily: "'DM Sans', sans-serif", padding: 24, textAlign: 'center' }}>{error}</div>
  if (!goal) return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ textAlign: 'center' }}>
        <p style={{ color: '#8e8e93', marginBottom: 18 }}>No active goal yet.</p>
        <button onClick={() => router.push('/onboarding')} style={{ padding: '13px 28px', background: 'linear-gradient(135deg,#0ef5c2,#00d4ff)', border: 'none', borderRadius: 14, color: '#06060f', fontWeight: 700, fontSize: 15, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", boxShadow: '0 0 32px rgba(14,245,194,0.28), inset 0 1px 0 rgba(255,255,255,0.45)' }}>Set a Goal</button>
      </div>
    </div>
  )

  const allNodes    = sections.flatMap((s) => s.nodes)
  const doneCount   = allNodes.filter((n) => n.status === 'done').length
  const totalCount  = allNodes.length
  const currentNode = allNodes.find((n) => n.status === 'active')

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{display:none}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes sheetUp{from{transform:translateY(100%);opacity:0.6}to{transform:translateY(0);opacity:1}}
        @keyframes fadeBackdrop{from{opacity:0}to{opacity:1}}
        @keyframes xpPop{0%{opacity:1;transform:translateX(-50%) translateY(0) scale(1)}70%{opacity:1;transform:translateX(-50%) translateY(-48px) scale(1.3)}100%{opacity:0;transform:translateX(-50%) translateY(-68px) scale(0.9)}}
        @keyframes pulseGlow{0%,100%{box-shadow:0 0 20px rgba(14,245,194,0.40),0 0 0 0 rgba(14,245,194,0.12)}50%{box-shadow:0 0 40px rgba(14,245,194,0.65),0 0 0 10px rgba(14,245,194,0.05)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulseOrb{0%,100%{opacity:.18;transform:scale(1)}50%{opacity:.32;transform:scale(1.06)}}
      `}</style>

      {/* XP pop */}
      {xpPop && (
        <div style={{ position: 'fixed', left: xpPop.x, top: xpPop.y, zIndex: 999, fontSize: 15, fontWeight: 800, color: '#0ef5c2', fontFamily: "'DM Sans', sans-serif", pointerEvents: 'none', animation: 'xpPop 1.2s ease-out forwards', textShadow: '0 0 20px rgba(14,245,194,0.7)', whiteSpace: 'nowrap' }}>
          +10 XP
        </div>
      )}

      <div style={{ minHeight: '100vh', fontFamily: "'DM Sans', sans-serif", paddingBottom: 120 }}>

        {/* ── Top bar ── */}
        <div style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(6,6,15,0.88)', backdropFilter: 'blur(28px) saturate(200%)', WebkitBackdropFilter: 'blur(28px) saturate(200%)', borderBottom: '1px solid rgba(255,255,255,0.08)', boxShadow: 'inset 0 -1px 0 rgba(255,255,255,0.04)' }}>
          <div style={{ maxWidth: 580, margin: '0 auto', height: 62, display: 'flex', alignItems: 'center', gap: 14, padding: '0 20px' }}>
            <button onClick={() => router.push('/dashboard')} style={{ background: 'none', border: 'none', color: '#8e8e93', cursor: 'pointer', padding: '6px 4px', display: 'flex', alignItems: 'center', fontFamily: "'DM Sans', sans-serif", flexShrink: 0, transition: 'color 0.18s' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#f5f5f7' }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#8e8e93' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
            </button>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#f5f5f7', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{goal.goal_text}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
                <div style={{ width: 120, height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 9999, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${totalCount > 0 ? (doneCount / totalCount) * 100 : 0}%`, background: 'linear-gradient(90deg,#0ef5c2,#00d4ff)', borderRadius: 9999, boxShadow: '0 0 6px rgba(14,245,194,0.45)', transition: 'width 0.5s' }} />
                </div>
                <span style={{ fontSize: 11, color: '#636366', fontWeight: 600 }}>{doneCount}/{totalCount} days</span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', background: 'rgba(14,245,194,0.08)', border: '1px solid rgba(14,245,194,0.18)', borderRadius: 9999, boxShadow: 'inset 0 1px 0 rgba(14,245,194,0.20)' }}>
                <BoltIcon /><span style={{ fontSize: 13, fontWeight: 800, color: '#0ef5c2' }}>{totalXp}</span>
                <span style={{ fontSize: 10, color: '#636366', fontWeight: 600 }}>XP</span>
              </div>
              {streak > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', background: 'rgba(255,180,0,0.08)', border: '1px solid rgba(255,180,0,0.18)', borderRadius: 9999 }}>
                  <span style={{ fontSize: 13 }}>🔥</span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: '#ffb400' }}>{streak}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Sections ── */}
        <div style={{ maxWidth: 580, margin: '0 auto', padding: '28px 20px 0' }}>
          {sections.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '80px 0', color: '#636366' }}>
              <p style={{ fontSize: 15 }}>Your path is being generated...</p>
            </div>
          ) : sections.map((section, sIdx) => {
            const sectionDone   = section.nodes.every((n) => n.status === 'done')
            const sectionActive = section.nodes.some((n) => n.status === 'active')
            const doneInSection = section.nodes.filter((n) => n.status === 'done').length
            const isLocked      = !sectionDone && !sectionActive

            return (
              <div key={`${section.conceptName}-${sIdx}`} style={{ marginBottom: 8, animation: `fadeUp 0.4s cubic-bezier(0.16,1,0.3,1) ${sIdx * 0.05}s both` }}>

                {/* Section header */}
                <div style={{
                  background: sectionDone
                    ? 'linear-gradient(145deg, rgba(14,245,194,0.10) 0%, rgba(0,212,255,0.06) 100%)'
                    : sectionActive
                      ? 'linear-gradient(145deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)'
                      : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${sectionDone ? 'rgba(14,245,194,0.26)' : sectionActive ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.06)'}`,
                  borderRadius: 20,
                  padding: '16px 20px',
                  backdropFilter: 'blur(20px) saturate(180%)',
                  WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                  boxShadow: sectionDone
                    ? 'inset 0 1px 0 rgba(14,245,194,0.22), 0 0 28px rgba(14,245,194,0.06)'
                    : sectionActive
                      ? 'inset 0 1px 0 rgba(255,255,255,0.10), 0 8px 24px rgba(0,0,0,0.18)'
                      : 'inset 0 1px 0 rgba(255,255,255,0.05)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                      {/* Number badge */}
                      <div style={{
                        width: 36, height: 36, borderRadius: '26%', flexShrink: 0,
                        background: sectionDone
                          ? 'linear-gradient(135deg,#0ef5c2,#00d4ff)'
                          : sectionActive
                            ? 'rgba(14,245,194,0.10)'
                            : 'rgba(255,255,255,0.05)',
                        border: `1px solid ${sectionDone ? 'transparent' : sectionActive ? 'rgba(14,245,194,0.28)' : 'rgba(255,255,255,0.08)'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: sectionDone ? '#06060f' : sectionActive ? '#0ef5c2' : '#3a3a3c',
                        fontWeight: 800, fontSize: 13,
                        boxShadow: sectionDone ? '0 0 18px rgba(14,245,194,0.35), inset 0 1px 0 rgba(255,255,255,0.45)' : sectionActive ? 'inset 0 1px 0 rgba(14,245,194,0.22)' : 'inset 0 1px 0 rgba(255,255,255,0.06)',
                      }}>
                        {sectionDone ? <CheckIcon /> : sIdx + 1}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 16, fontWeight: 800, color: isLocked ? '#3a3a3c' : '#f5f5f7', letterSpacing: '-0.3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {section.conceptName}
                        </div>
                        <div style={{ fontSize: 12, color: sectionDone ? '#0ef5c2' : isLocked ? '#3a3a3c' : '#636366', fontWeight: 600, marginTop: 1 }}>
                          {doneInSection}/{section.nodes.length} {section.nodes.length === 1 ? 'lesson' : 'lessons'}
                        </div>
                      </div>
                    </div>
                    {isLocked && <LockIcon />}
                    {sectionActive && (
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#0ef5c2', background: 'rgba(14,245,194,0.10)', border: '1px solid rgba(14,245,194,0.22)', padding: '3px 10px', borderRadius: 9999, whiteSpace: 'nowrap', boxShadow: 'inset 0 1px 0 rgba(14,245,194,0.20)' }}>IN PROGRESS</div>
                    )}
                  </div>
                </div>

                {/* Nodes */}
                <div style={{ paddingLeft: 16, paddingTop: 2 }}>
                  {section.nodes.map((node, nIdx) => {
                    const isDone       = node.status === 'done'
                    const isActive     = node.status === 'active'
                    const isNodeLocked = node.status === 'locked'
                    const isLastNode   = nIdx === section.nodes.length - 1

                    return (
                      <div key={node.id} style={{ display: 'flex', alignItems: 'stretch' }}>
                        {/* Connector rail */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 44, flexShrink: 0 }}>
                          <div style={{ width: 2, height: nIdx === 0 ? 10 : 6, background: isDone ? 'rgba(14,245,194,0.40)' : 'rgba(255,255,255,0.06)' }} />
                          {/* Node circle */}
                          <button
                            onClick={() => !isNodeLocked && setActiveNode(node)}
                            style={{
                              width: 46, height: 46, borderRadius: '50%',
                              background: isDone || isActive
                                ? 'linear-gradient(135deg,#0ef5c2,#00d4ff)'
                                : 'rgba(255,255,255,0.05)',
                              border: `2px solid ${isDone || isActive ? 'transparent' : 'rgba(255,255,255,0.08)'}`,
                              color: isDone || isActive ? '#06060f' : '#3a3a3c',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              cursor: isNodeLocked ? 'default' : 'pointer',
                              outline: 'none', flexShrink: 0,
                              animation: isActive ? 'pulseGlow 2.5s ease-in-out infinite' : 'none',
                              boxShadow: isDone ? '0 0 18px rgba(14,245,194,0.30), inset 0 1px 0 rgba(255,255,255,0.45)' : isActive ? 'inset 0 1px 0 rgba(255,255,255,0.45)' : 'inset 0 1px 0 rgba(255,255,255,0.06)',
                              transition: 'transform 0.18s cubic-bezier(0.34,1.56,0.64,1)',
                            }}
                            onMouseEnter={(e) => { if (!isNodeLocked) e.currentTarget.style.transform = 'scale(1.10)' }}
                            onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)' }}
                          >
                            {isDone ? <CheckIcon /> : isActive ? <StarIcon /> : <LockIcon />}
                          </button>
                          {!isLastNode && <div style={{ width: 2, flex: 1, minHeight: 14, background: isDone ? 'rgba(14,245,194,0.32)' : 'rgba(255,255,255,0.06)', margin: '3px 0' }} />}
                          {isLastNode && <div style={{ width: 2, height: 8, background: isDone ? 'rgba(14,245,194,0.28)' : 'rgba(255,255,255,0.05)' }} />}
                        </div>

                        {/* Node card */}
                        <div
                          onClick={() => !isNodeLocked && setActiveNode(node)}
                          style={{
                            flex: 1,
                            margin: `${nIdx === 0 ? 10 : 6}px 0 6px 12px`,
                            padding: '13px 16px',
                            background: isActive
                              ? 'linear-gradient(145deg, rgba(14,245,194,0.07) 0%, rgba(0,212,255,0.04) 100%)'
                              : isDone
                                ? 'rgba(14,245,194,0.03)'
                                : 'rgba(255,255,255,0.03)',
                            border: `1px solid ${isActive ? 'rgba(14,245,194,0.26)' : isDone ? 'rgba(14,245,194,0.12)' : 'rgba(255,255,255,0.06)'}`,
                            borderRadius: 16,
                            cursor: isNodeLocked ? 'default' : 'pointer',
                            backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
                            boxShadow: isActive ? 'inset 0 1px 0 rgba(14,245,194,0.16), 0 8px 24px rgba(0,0,0,0.16)' : 'inset 0 1px 0 rgba(255,255,255,0.06)',
                            transition: 'all 0.18s cubic-bezier(0.16,1,0.3,1)',
                          }}
                          onMouseEnter={(e) => { if (!isNodeLocked) { e.currentTarget.style.borderColor = isActive ? 'rgba(14,245,194,0.42)' : 'rgba(14,245,194,0.20)'; e.currentTarget.style.transform = 'translateX(2px)' } }}
                          onMouseLeave={(e) => { e.currentTarget.style.borderColor = isActive ? 'rgba(14,245,194,0.26)' : isDone ? 'rgba(14,245,194,0.12)' : 'rgba(255,255,255,0.06)'; e.currentTarget.style.transform = 'translateX(0)' }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: 14, fontWeight: 700, color: isNodeLocked ? '#3a3a3c' : isDone ? '#636366' : '#f5f5f7', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {isDone ? <s style={{ textDecorationColor: '#2c2c2e' }}>{node.conceptName}</s> : node.conceptName}
                              </div>
                              <div style={{ fontSize: 12, color: isNodeLocked ? '#2c2c2e' : '#636366', fontWeight: 500 }}>
                                {node.totalMinutes} min · {node.totalTasks} tasks
                                {isActive && node.completedTasks > 0 && (
                                  <span style={{ color: '#0ef5c2', marginLeft: 6, fontWeight: 700 }}>{node.completedTasks} done</span>
                                )}
                              </div>
                            </div>
                            {!isNodeLocked && (
                              <div style={{ color: isDone ? '#0ef5c2' : '#636366', flexShrink: 0, opacity: isDone ? 1 : 0.7 }}>
                                {isDone
                                  ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0ef5c2" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                                  : <ArrowIcon />}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}

          {sections.length > 0 && (
            <div style={{ textAlign: 'center', padding: '24px 0 8px', opacity: 0.3 }}>
              <div style={{ width: 2, height: 28, background: 'rgba(255,255,255,0.06)', margin: '0 auto 10px' }} />
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', margin: '0 auto 10px' }} />
              <p style={{ fontSize: 10, color: '#3a3a3c', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }}>MORE UNLOCKS AS YOU PROGRESS</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Sticky bottom CTA ── */}
      {currentNode && !activeNode && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50, background: 'rgba(6,6,15,0.90)', backdropFilter: 'blur(32px) saturate(200%)', WebkitBackdropFilter: 'blur(32px) saturate(200%)', borderTop: '1px solid rgba(255,255,255,0.10)', padding: '14px 20px 32px', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.07)' }}>
          <div style={{ maxWidth: 580, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 10, color: '#636366', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.2px', marginBottom: 3 }}>Up next</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#f5f5f7', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{currentNode.conceptName}</div>
              <div style={{ fontSize: 12, color: '#636366', marginTop: 1 }}>{currentNode.totalMinutes} min · {currentNode.totalTasks} tasks</div>
            </div>
            <button onClick={() => setActiveNode(currentNode)}
              style={{ padding: '14px 30px', flexShrink: 0, background: 'linear-gradient(135deg,#0ef5c2,#00d4ff)', border: 'none', borderRadius: 16, color: '#06060f', fontSize: 15, fontWeight: 800, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", boxShadow: '0 0 40px rgba(14,245,194,0.40), inset 0 1px 0 rgba(255,255,255,0.45)', display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.22s cubic-bezier(0.16,1,0.3,1)' }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)'; e.currentTarget.style.boxShadow = '0 0 56px rgba(14,245,194,0.55), inset 0 1px 0 rgba(255,255,255,0.45)' }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0) scale(1)'; e.currentTarget.style.boxShadow = '0 0 40px rgba(14,245,194,0.40), inset 0 1px 0 rgba(255,255,255,0.45)' }}
            >
              <BoltIcon /> Start
            </button>
          </div>
        </div>
      )}

      {activeNode && <TaskSheet node={activeNode} onClose={() => { setActiveNode(null); load() }} />}
    </>
  )
}
