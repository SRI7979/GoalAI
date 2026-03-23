// Path — Full Gamified Learning Map (Duolingo × Brilliant)
'use client'

import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, useScroll, useTransform } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { getLevelProgress } from '@/lib/xp'
import { trackMapViewed } from '@/lib/analytics'
import { getDashboardThemeVars, getPathWorlds, getStoredActiveTheme, getStoredOwnedThemes } from '@/lib/appThemes'
import IconGlyph from '@/components/IconGlyph'
import Skeleton from '@/components/Skeleton'
import PathNode from '@/components/path/PathNode'
import PathLine from '@/components/path/PathLine'

// ─── Design Tokens ────────────────────────────────────────────────────────────
const T = {
  bg:       'var(--theme-bg)',
  shell:    'var(--theme-shell)',
  chrome:   'var(--theme-chrome)',
  font:     "'Plus Jakarta Sans','DM Sans',system-ui,sans-serif",
  text:     'var(--theme-text)',
  textSec:  'var(--theme-text-sec)',
  textMuted:'var(--theme-text-muted)',
  border:   'var(--theme-border)',
  ink:      'var(--theme-ink)',
  masteryGradient:'linear-gradient(135deg,var(--theme-mastery),var(--theme-mastery-strong))',
  masteryGradientSoft:'linear-gradient(90deg,var(--theme-mastery),var(--theme-mastery-strong))',
}

// ─── Wave x-positions in 400px coordinate space ───────────────────────────────
// 5-point wave: left edge → left → center → right → right edge → right → center → left → repeat
const WAVE_PX = [72, 136, 214, 292, 330, 276, 194, 108]
const getWaveX = (i) => WAVE_PX[i % WAVE_PX.length]

// Map layout constants
const NODE_ROW_H = 108  // px per node row
const BOSS_ROW_H = 132  // px for boss/project rows
const BANNER_H   = 100  // world banner strip height
const COORD_W    = 400  // SVG coordinate width

// XP per task type
const TASK_XP = { concept:20, guided_practice:30, challenge:40, explain:25, quiz:35, reflect:15, boss:200, project:100, lesson:20, video:15, practice:25, exercise:30, review:20, reading:20, flashcard:15, ai_interaction:25, reflection:15, capstone:0 }
const rowXP   = (tasks) => tasks.reduce((s, t) => s + (TASK_XP[t.type] || 20), 0)

function patchNodeTask(nodes, rowId, taskId) {
  let completedNode = false
  const nextNodes = nodes.map((node) => {
    if (node.id !== rowId) return node
    const tasks = node.tasks.map((task) => task.id === taskId ? { ...task, completed: true } : task)
    const completedTasks = tasks.filter((task) => task.completed).length
    const isDone = completedTasks === tasks.length && tasks.length > 0
    if (isDone) completedNode = true
    return {
      ...node,
      tasks,
      completedTasks,
      status: isDone ? 'done' : node.status,
    }
  })
  return { nextNodes, completedNode }
}

function recomputeNodeStatuses(nodes) {
  let foundActive = false
  return nodes.map((node) => {
    if (node.isPlaceholder) return { ...node, status: 'locked' }
    if (node.status === 'done') return node
    if (!foundActive) {
      foundActive = true
      return { ...node, status: 'active' }
    }
    return { ...node, status: 'locked' }
  })
}

function findNextUnlockId(nodes, rowId) {
  const startIndex = nodes.findIndex((node) => node.id === rowId)
  if (startIndex < 0) return null
  for (let i = startIndex + 1; i < nodes.length; i += 1) {
    if (!nodes[i].isPlaceholder && nodes[i].status !== 'done') return nodes[i].id
  }
  return null
}

// ─── Keyframes ────────────────────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800;900&display=swap');
  *,*::before,*::after { box-sizing: border-box }
  ::-webkit-scrollbar { display: none }
  body { background: var(--theme-bg) }

  @keyframes pulseNode {
    0%,100% { box-shadow: 0 0 0 0 var(--glow); transform: scale(1); }
    50%      { box-shadow: 0 0 0 16px transparent; transform: scale(1.04); }
  }
  @keyframes bossFloat {
    0%,100% { transform: translateY(0) scale(1); box-shadow: 0 8px 32px var(--glow); }
    50%      { transform: translateY(-4px) scale(1.03); box-shadow: 0 16px 48px var(--glow); }
  }
  @keyframes starSpin {
    from { transform: rotate(0deg) }
    to   { transform: rotate(360deg) }
  }
  @keyframes fadeUp {
    from { opacity:0; transform:translateY(12px) }
    to   { opacity:1; transform:translateY(0) }
  }
  @keyframes slideUp {
    from { transform:translateY(100%); opacity:0 }
    to   { transform:translateY(0);    opacity:1 }
  }
  @keyframes xpRise {
    0%   { opacity:1; transform:translateX(-50%) translateY(0) scale(1) }
    70%  { opacity:1; transform:translateX(-50%) translateY(-52px) scale(1.20) }
    100% { opacity:0; transform:translateX(-50%) translateY(-72px) scale(0.85) }
  }
  @keyframes spin { to { transform:rotate(360deg) } }
  @keyframes shimmer {
    0%   { background-position: -200% center }
    100% { background-position: 200% center }
  }
  @keyframes crownBounce {
    0%,100% { transform: translateY(0) }
    50%     { transform: translateY(-6px) }
  }
  @keyframes streakFlame {
    0%,100% { text-shadow: 0 0 12px rgba(251,146,60,0.60) }
    50%     { text-shadow: 0 0 28px rgba(251,146,60,0.95) }
  }
  @media (prefers-reduced-motion: reduce) {
    @keyframes pulseNode  { to {} }
    @keyframes bossFloat  { to {} }
    @keyframes fadeUp     { from{opacity:0} to{opacity:1} }
    @keyframes slideUp    { from{opacity:0} to{opacity:1} }
    @keyframes xpRise     { to{opacity:0} }
    @keyframes crownBounce{ to{} }
    @keyframes streakFlame{ to{} }
  }
`

// ─── Icons ────────────────────────────────────────────────────────────────────
const CheckIco  = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
const LockIco   = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
const BoltIco   = ({sz=12}) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
const ClockIco  = ({sz=12}) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
const HomeIco   = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
const PathIco   = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
const StatsIco  = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>

const TASK_STYLE = {
  lesson:          { color:'#22D3A5', label:'LESSON'   },
  video:           { color:'#FBBF24', label:'VIDEO'    },
  practice:        { color:'#60A5FA', label:'PRACTICE' },
  exercise:        { color:'#C084FC', label:'EXERCISE' },
  quiz:            { color:'#F87171', label:'QUIZ'     },
  review:          { color:'#FB923C', label:'REVIEW'   },
  guided_practice: { color:'#00d4ff', label:'PRACTICE' },
  challenge:       { color:'#F59E0B', label:'CHALLENGE'},
  ai_interaction:  { color:'#818CF8', label:'EXPLAIN'  },
  reflection:      { color:'#A78BFA', label:'REFLECT'  },
  boss:            { color:'#EC4899', label:'BOSS'     },
}

function averageWorldQuizAccuracy(nodes = []) {
  const scores = []
  nodes.forEach((node) => {
    ;(node.tasks || []).forEach((task) => {
      const candidate = [
        task?.accuracy,
        task?.score,
        task?.quizScore,
        task?.result?.score,
        task?.metrics?.quizScore,
      ].find((value) => Number.isFinite(Number(value)))
      if (candidate !== undefined) scores.push(Number(candidate))
    })
  })
  if (scores.length === 0) return null
  return scores.reduce((sum, score) => sum + score, 0) / scores.length
}

function getWorldStarCount(nodes = []) {
  const avgAccuracy = averageWorldQuizAccuracy(nodes)
  if (avgAccuracy != null) {
    if (avgAccuracy >= 90) return 3
    if (avgAccuracy >= 75) return 2
    if (avgAccuracy >= 60) return 1
    return 0
  }

  const total = nodes.length || 1
  const completed = nodes.filter((node) => node.status === 'done').length
  const ratio = completed / total
  if (ratio >= 1) return 3
  if (ratio >= 0.66) return 2
  if (ratio >= 0.33) return 1
  return 0
}

// ─── World Banner ─────────────────────────────────────────────────────────────
function WorldBanner({ world, worldIdx, doneCount, totalCount, starCount, height, top }) {
  const pct     = totalCount > 0 ? doneCount / totalCount : 0
  const allDone = doneCount === totalCount && totalCount > 0
  return (
    <div style={{
      position:'absolute', left:0, right:0, top, height,
      background: `linear-gradient(135deg, ${world.bg}, rgba(5,6,8,0.12))`,
      display:'flex', alignItems:'center',
      padding:'0 18px', overflow:'hidden',
    }}>
      {allDone && (
        <div style={{
          position:'absolute', inset:0,
          background:'linear-gradient(120deg, transparent 15%, rgba(255,215,0,0.22) 40%, transparent 65%)',
          backgroundSize:'200% 100%',
          animation:'shimmer 3.6s linear infinite',
          pointerEvents:'none',
        }}/>
      )}
      {/* Left decoration */}
      <div style={{
        width:52, height:52, borderRadius:'50%', flexShrink:0,
        background:`radial-gradient(circle,${world.accent}28,transparent 70%)`,
        border:`2px solid ${world.accent}35`,
        display:'flex', alignItems:'center', justifyContent:'center',
        color:world.accent,
      }}>
        <IconGlyph name={world.icon || 'sparkles'} size={24} strokeWidth={2.2}/>
      </div>

      <div style={{ flex:1, marginLeft:12 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:5 }}>
          <span style={{
            fontSize:9, fontWeight:900, letterSpacing:'1.6px', textTransform:'uppercase',
            color: world.accent, background:`${world.accent}18`,
            padding:'2px 8px', borderRadius:9999, border:`1px solid ${world.accent}35`,
          }}>{world.label}</span>
          <span style={{ fontSize:13, fontWeight:800, color: allDone ? world.accent : T.text }}>
            World {worldIdx + 1} · {world.name}
          </span>
          {allDone && <IconGlyph name="trophy" size={14} strokeWidth={2.3} color={world.accent}/>}
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ flex:1, height:5, background:'rgba(255,255,255,0.07)', borderRadius:9999, overflow:'hidden' }}>
            <div style={{
              height:'100%', width:`${Math.round(pct * 100)}%`,
              background:`linear-gradient(90deg,${world.accent},${world.dark}80)`,
              borderRadius:9999, transition:'width 0.6s cubic-bezier(0.16,1,0.3,1)',
              boxShadow: pct > 0 ? `0 0 10px ${world.glow}` : 'none',
            }}/>
          </div>
          <span style={{ fontSize:11, fontWeight:700, color: allDone ? world.accent : T.textMuted, flexShrink:0 }}>
            {doneCount}/{totalCount}
          </span>
        </div>
      </div>

      {/* Right star cluster */}
      <div style={{ marginLeft:12, textAlign:'center', flexShrink:0 }}>
        <div style={{ display:'flex', gap:3, marginBottom:4, justifyContent:'center' }}>
          {[0, 1, 2].map((index) => (
            <span
              key={index}
              style={{
                fontSize:16,
                lineHeight:1,
                opacity: index < starCount ? 1 : 0.22,
                filter: index < starCount ? 'drop-shadow(0 0 8px rgba(255,215,0,0.38))' : 'none',
              }}
            >
              {index < starCount ? '★' : '★'}
            </span>
          ))}
        </div>
        <div style={{ fontSize:9, color: T.textMuted, marginTop:2, fontWeight:600 }}>{starCount}/3 stars</div>
      </div>
    </div>
  )
}

function getNodeTone(node) {
  if (node.isBoss) return 'boss'
  if (node.isProject) return 'project'
  return 'normal'
}

// ─── Bottom Sheet (task detail) ───────────────────────────────────────────────
function BottomSheet({ node, world, onClose, onComplete, completing }) {
  if (!node) return null
  const isDone    = node.status === 'done'
  const totalMin  = node.tasks.reduce((s, t) => s + (Number(t.durationMin) || 0), 0)
  const xp        = rowXP(node.tasks)

  return (
    <>
      <div onClick={onClose} style={{
        position:'fixed', inset:0, background:'rgba(0,0,0,0.65)', zIndex:900,
        backdropFilter:'blur(6px)', WebkitBackdropFilter:'blur(6px)',
      }}/>
      <div style={{
        position:'fixed', bottom:0, left:0, right:0, zIndex:901,
        background:T.shell,
        border:`1px solid ${world.accent}30`,
        borderBottom:'none', borderRadius:'26px 26px 0 0',
        padding:'20px 20px 48px',
        maxHeight:'85vh', overflowY:'auto',
        fontFamily:T.font,
        animation:'slideUp 0.30s cubic-bezier(0.34,1.2,0.64,1)',
        boxShadow:`0 -8px 60px ${world.glow}`,
      }}>
        {/* Handle */}
        <div style={{ width:40, height:4, background:`${world.accent}40`, borderRadius:9999, margin:'0 auto 20px' }}/>

        {/* Header */}
        <div style={{ marginBottom:18 }}>
          {/* Type badges */}
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10, flexWrap:'wrap' }}>
            <span style={{
              fontSize:9, fontWeight:900, letterSpacing:'1.6px', textTransform:'uppercase',
              color:T.ink, background: node.isBoss ? '#F59E0B' : node.isProject ? '#C084FC' : world.accent,
              padding:'3px 10px', borderRadius:9999,
            }}>
              <span style={{ display:'inline-flex', alignItems:'center', gap:6 }}>
                {node.isBoss && <IconGlyph name="challenge" size={12} strokeWidth={2.3} color={T.ink}/>}
                {node.isProject && <IconGlyph name="hammer" size={12} strokeWidth={2.3} color={T.ink}/>}
                {node.isBoss ? 'Boss Challenge' : node.isProject ? 'Build Project' : `Day ${node.dayNumber} Mission`}
              </span>
            </span>
            {isDone && <span style={{ fontSize:9, fontWeight:900, letterSpacing:'1px',
              color:T.ink, background:'#22D3A5', padding:'3px 10px', borderRadius:9999 }}>
              Complete
            </span>}
          </div>

          <h2 style={{ fontSize:22, fontWeight:900, color:T.text, letterSpacing:'-0.4px', marginBottom:10, lineHeight:1.2 }}>
            {node.conceptName}
          </h2>

          {/* Meta row */}
          <div style={{ display:'flex', gap:14, flexWrap:'wrap' }}>
            {totalMin > 0 && (
              <span style={{ display:'flex', alignItems:'center', gap:5, fontSize:12, color:T.textSec, fontWeight:600 }}>
                <ClockIco/>~{totalMin} min
              </span>
            )}
            <span style={{ display:'flex', alignItems:'center', gap:5, fontSize:12, color:'#FBBF24', fontWeight:800 }}>
              <BoltIco/>+{xp} XP
            </span>
            <span style={{ fontSize:12, color:T.textMuted, fontWeight:600 }}>
              {node.tasks.length} task{node.tasks.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Task list */}
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {node.tasks.map((task, i) => {
            const ts         = TASK_STYLE[task.type] || TASK_STYLE.lesson
            const isCompleting = completing === task.id
            return (
              <div key={task.id || i} style={{
                background: task.completed ? 'rgba(34,211,165,0.04)' : 'rgba(255,255,255,0.03)',
                border:`1px solid ${task.completed ? 'rgba(34,211,165,0.18)' : 'rgba(255,255,255,0.08)'}`,
                borderRadius:18, padding:'13px 15px',
                opacity: task.completed ? 0.60 : 1, transition:'opacity 0.2s',
              }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:5 }}>
                  <span style={{
                    fontSize:8, fontWeight:900, letterSpacing:'0.8px', textTransform:'uppercase',
                    color: ts.color, background:`${ts.color}18`,
                    border:`1px solid ${ts.color}35`, padding:'2px 8px', borderRadius:9999,
                  }}>{ts.label}</span>
                  <span style={{ fontSize:11, color:T.textMuted, fontWeight:500 }}>
                    {task.durationMin || 0}m
                  </span>
                  {task.completed && <span style={{ marginLeft:'auto', fontSize:12, fontWeight:800, color:'#22D3A5' }}>✓ Done</span>}
                </div>
                <div style={{
                  fontSize:14, fontWeight:700, color: task.completed ? T.textMuted : T.text,
                  lineHeight:1.3, marginBottom: (!task.completed && task.description) ? 6 : 0,
                  textDecoration: task.completed ? `line-through rgba(71,85,105,0.8)` : 'none',
                }}>
                  {task.title}
                </div>
                {!task.completed && task.description && (
                  <p style={{ fontSize:12, color:T.textMuted, lineHeight:1.55, marginBottom:10 }}>
                    {task.description.length > 110 ? task.description.slice(0, 110) + '…' : task.description}
                  </p>
                )}
                {!task.completed && !isDone && (
                  <button disabled={Boolean(isCompleting)} onClick={e => onComplete(node.id, task.id, task, e)} style={{
                    marginTop:6, width:'100%', padding:'10px 14px',
                    background: isCompleting ? 'rgba(255,255,255,0.04)' : `linear-gradient(135deg,${world.accent},${world.dark}90)`,
                    border: isCompleting ? '1px solid rgba(255,255,255,0.08)' : 'none',
                    borderRadius:12, color: isCompleting ? T.textMuted : T.ink,
                    fontSize:13, fontWeight:900, cursor: isCompleting ? 'default' : 'pointer',
                    fontFamily:T.font, display:'flex', alignItems:'center', justifyContent:'center', gap:6,
                    boxShadow: isCompleting ? 'none' : `0 0 24px ${world.glow}`,
                    transition:'all 0.18s',
                  }}>
                    {isCompleting
                      ? <><div style={{ width:13,height:13,border:'2px solid rgba(255,255,255,0.08)',borderTopColor:world.accent,borderRadius:'50%',animation:'spin 0.65s linear infinite'}}/>Saving…</>
                      : <><BoltIco sz={13}/>Complete Task</>}
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

// ─── XP Pop ──────────────────────────────────────────────────────────────────
function XPPop({ pop, onDone }) {
  useEffect(() => {
    if (!pop) return
    const t = setTimeout(onDone, 1400)
    return () => clearTimeout(t)
  }, [pop, onDone])
  if (!pop) return null
  return (
    <div style={{
      position:'fixed', left:pop.x, top:pop.y, zIndex:9999,
      fontSize:16, fontWeight:900, color:'#FBBF24',
      fontFamily:T.font, pointerEvents:'none',
      animation:'xpRise 1.4s ease-out forwards',
      textShadow:'0 0 18px rgba(251,191,36,0.80)',
      transform:'translateX(-50%)',
    }}>+{pop.xp} XP</div>
  )
}

// ─── Project Toggle Modal ─────────────────────────────────────────────────────
function ProjectModal({ onClose, enabled, onToggle }) {
  return (
    <>
      <div onClick={onClose} style={{
        position:'fixed', inset:0, background:'rgba(0,0,0,0.70)', zIndex:800,
        backdropFilter:'blur(8px)', WebkitBackdropFilter:'blur(8px)',
      }}/>
      <div style={{
        position:'fixed', bottom:0, left:0, right:0, zIndex:801,
        background:T.shell,
        borderRadius:'26px 26px 0 0', padding:'24px 22px 44px',
        fontFamily:T.font, animation:'slideUp 0.28s cubic-bezier(0.34,1.2,0.64,1)',
        border:'1px solid rgba(192,132,252,0.25)', borderBottom:'none',
        boxShadow:'0 -8px 60px rgba(192,132,252,0.25)',
      }}>
        <div style={{ width:40, height:4, background:'rgba(192,132,252,0.40)', borderRadius:9999, margin:'0 auto 22px'}}/>

        <div style={{ textAlign:'center', marginBottom:22 }}>
          <div style={{
            width:72,height:72,margin:'0 auto 10px',borderRadius:22,
            display:'flex',alignItems:'center',justifyContent:'center',
            background:'rgba(192,132,252,0.10)',color:'var(--theme-mastery)',
            border:'1px solid rgba(192,132,252,0.25)',
          }}>
            <IconGlyph name="hammer" size={30} strokeWidth={2.3}/>
          </div>
          <div style={{ fontSize:22, fontWeight:900, color:T.text, marginBottom:8 }}>Hands-on Projects</div>
          <div style={{ fontSize:14, color:T.textSec, lineHeight:1.55, maxWidth:320, margin:'0 auto' }}>
            Add build challenges every 5 days. Apply what you learn by creating real things.
            <br/><br/>
            Projects appear as <strong style={{color:'var(--theme-mastery)'}}>boss battles</strong> on your map — complete them to unlock special XP rewards.
          </div>
        </div>

        {/* Benefits */}
        {[
          { icon:'bolt', text:'+50 bonus XP per project completed' },
          { icon:'brain', text:'Solidify learning through application' },
          { icon:'trophy', text:'Earn unique "Builder" achievement badges' },
        ].map((row, i) => (
          <div key={i} style={{
            display:'flex', alignItems:'center', gap:12,
            background:'rgba(192,132,252,0.06)', border:'1px solid rgba(192,132,252,0.14)',
            borderRadius:14, padding:'11px 14px', marginBottom:8,
          }}>
            <IconGlyph name={row.icon} size={18} strokeWidth={2.3} color="var(--theme-mastery)"/>
            <span style={{ fontSize:13, fontWeight:600, color:T.textSec }}>{row.text}</span>
          </div>
        ))}

        <div style={{ display:'flex', gap:10, marginTop:20 }}>
          <button onClick={onClose} style={{
            flex:1, padding:'13px', background:'rgba(255,255,255,0.05)',
            border:'1px solid rgba(255,255,255,0.10)', borderRadius:14,
            color:T.textSec, fontWeight:700, fontSize:14, cursor:'pointer', fontFamily:T.font,
          }}>Keep linear</button>
          <button onClick={() => { onToggle(!enabled); onClose() }} style={{
            flex:2, padding:'13px',
            background: enabled
              ? 'rgba(239,68,68,0.10)' : T.masteryGradient,
            border: enabled ? '1px solid rgba(239,68,68,0.25)' : 'none',
            borderRadius:14,
            color: enabled ? '#F87171' : T.ink,
            fontWeight:900, fontSize:14, cursor:'pointer', fontFamily:T.font,
            boxShadow: enabled ? 'none' : '0 0 28px rgba(192,132,252,0.50)',
          }}>
            <span style={{ display:'inline-flex', alignItems:'center', gap:8, justifyContent:'center' }}>
              {!enabled && <IconGlyph name="hammer" size={15} strokeWidth={2.3} color={T.ink}/>}
              {enabled ? 'Remove Projects' : 'Add Projects to Map'}
            </span>
          </button>
        </div>
      </div>
    </>
  )
}

// ─── Tab Bar ──────────────────────────────────────────────────────────────────
function TabBar({ onNav }) {
  return (
    <div style={{
      position:'fixed', bottom:0, left:0, right:0, zIndex:500,
      background:T.chrome,
      borderTop:`1px solid ${T.border}`,
      backdropFilter:'blur(28px)', WebkitBackdropFilter:'blur(28px)',
      display:'flex', justifyContent:'space-around', alignItems:'center',
      padding:'10px 0 max(env(safe-area-inset-bottom),10px)',
      fontFamily:T.font,
    }}>
      {[
        { key:'home',  Icon:HomeIco,  label:'Today' },
        { key:'path',  Icon:PathIco,  label:'Map'   },
        { key:'stats', Icon:StatsIco, label:'Stats' },
      ].map(({ key, Icon, label }) => {
        const isActive = key === 'path'
        return (
          <button key={key} onClick={() => onNav(key)} style={{
            display:'flex', flexDirection:'column', alignItems:'center', gap:3,
            background:'none', border:'none', cursor:'pointer', padding:'4px 20px',
            color: isActive ? 'var(--theme-primary)' : T.textMuted,
            opacity: isActive ? 1 : 0.65, fontFamily:T.font,
          }}>
            <Icon/>
            <span style={{ fontSize:10, fontWeight:700, letterSpacing:'0.3px' }}>{label}</span>
          </button>
        )
      })}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function PathPage() {
  const router = useRouter()

  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState('')
  const [goal,         setGoal]         = useState(null)
  const [allNodes,     setAllNodes]     = useState([])   // flat list of all day nodes
  const [progress,     setProgress]     = useState({ xp:0, streak:0, totalDays:0 })
  const [activeNode,   setActiveNode]   = useState(null) // selected for bottom sheet
  const [completing,   setCompleting]   = useState(null)
  const [xpPop,        setXpPop]        = useState(null)
  const [projects,     setProjects]     = useState(false)
  const [showProjModal,setShowProjModal]= useState(false)
  const [activeTheme,  setActiveTheme]  = useState(() => getStoredActiveTheme(getStoredOwnedThemes()))
  const [celebratingNodeId, setCelebratingNodeId] = useState(null)
  const [justUnlockedNodeId, setJustUnlockedNodeId] = useState(null)

  const nodeRefs = useRef(new Map())
  const transitionTimersRef = useRef([])
  const { scrollY } = useScroll()
  const orbDrift = useTransform(scrollY, [0, 2400], [0, -140])
  const orbDriftFar = useTransform(scrollY, [0, 2400], [0, -80])
  const overlayDrift = useTransform(scrollY, [0, 2400], [0, -32])

  const themeVars = useMemo(() => getDashboardThemeVars(activeTheme), [activeTheme])
  const pageThemeStyle = useMemo(() => ({
    ...themeVars,
    background: 'radial-gradient(circle at top, var(--theme-page-glow), transparent 34%), var(--theme-bg)',
  }), [themeVars])
  const worlds = useMemo(() => getPathWorlds(activeTheme), [activeTheme])

  const registerNodeRef = useCallback((id, element) => {
    if (element) nodeRefs.current.set(id, element)
    else nodeRefs.current.delete(id)
  }, [])

  // ── Load ───────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true); setError('')
    const { data: authData } = await supabase.auth.getUser()
    const me = authData?.user
    if (!me) { router.push('/login'); return }

    const { data: activeGoal } = await supabase.from('goals').select('*').eq('user_id', me.id).eq('status', 'active')
      .order('created_at', { ascending: false }).limit(1).maybeSingle()

    if (!activeGoal) { setLoading(false); return }
    setGoal(activeGoal)

    const { data: prog } = await supabase.from('user_progress').select('total_xp,current_streak,total_days')
      .eq('user_id', me.id).eq('goal_id', activeGoal.id).maybeSingle()

    const { data: rows, error: rowsErr } = await supabase
      .from('daily_tasks').select('*')
      .eq('goal_id', activeGoal.id).eq('user_id', me.id)
      .order('day_number', { ascending: true })
    if (rowsErr) { setError(rowsErr.message); setLoading(false); return }

    const taskRows  = rows || []
    const totalDays = prog?.total_days || Number(activeGoal.days) || Math.max(taskRows.length, 7)

    let foundActive = false
    // Build real nodes from task rows
    const realNodes = taskRows.map(row => {
      const tasks     = Array.isArray(row.tasks) ? row.tasks : []
      const completed = tasks.filter(t => t.completed).length
      const isDone    = row.completion_status === 'completed' || (tasks.length > 0 && completed === tasks.length)
      let status
      if      (isDone)       { status = 'done'   }
      else if (!foundActive) { status = 'active'; foundActive = true }
      else                   { status = 'locked' }

      return {
        id:             row.id,
        dayNumber:      row.day_number,
        conceptName:    row.covered_topics?.[0] || `Day ${row.day_number}`,
        tasks,
        totalTasks:     tasks.length,
        completedTasks: completed,
        status,
        isBoss:         row.day_number % 7 === 0,
        isProject:      false,
        isPlaceholder:  false,
        totalMinutes:   row.total_minutes || 30,
      }
    })

    // Build placeholder nodes for days not yet generated
    const maxGenerated = taskRows.length > 0 ? Math.max(...taskRows.map(r => r.day_number)) : 0
    const placeholders = []
    for (let d = maxGenerated + 1; d <= totalDays; d++) {
      placeholders.push({
        id:            `placeholder-${d}`,
        dayNumber:     d,
        conceptName:   'Coming soon…',
        tasks:         [],
        totalTasks:    0,
        completedTasks:0,
        status:        'locked',
        isBoss:        d % 7 === 0,
        isProject:     false,
        isPlaceholder: true,
        totalMinutes:  30,
      })
    }

    setAllNodes([...realNodes, ...placeholders])
    setProgress({ xp: prog?.total_xp || 0, streak: prog?.current_streak || 0, totalDays })

    // Analytics
    const completedDays = realNodes.filter(n => n.status === 'done').length
    trackMapViewed({ userId: me.id, goalId: activeGoal.id, completedDays, totalDays })

    setLoading(false)
  }, [router])

  useEffect(() => {
    const timer = setTimeout(() => { load() }, 0)
    return () => clearTimeout(timer)
  }, [load])

  // ── Inject project nodes when toggle is on ─────────────────────────────────
  const displayNodes = useMemo(() => {
    if (!projects) return allNodes
    // Insert project nodes every 5 real (non-placeholder) days
    const result = []
    let projCount = 0
    for (let i = 0; i < allNodes.length; i++) {
      const n = allNodes[i]
      result.push(n)
      if (!n.isPlaceholder && !n.isBoss && (i + 1) % 5 === 0) {
        projCount++
        result.push({
          id:            `project-${projCount}`,
          dayNumber:     null,
          conceptName:   `Build Project ${projCount}`,
          tasks:         [],
          totalTasks:    0,
          completedTasks:0,
          status:        n.status === 'done' ? 'active' : 'locked',
          isBoss:        false,
          isProject:     true,
          isPlaceholder: n.status !== 'done',
          totalMinutes:  60,
        })
      }
    }
    return result
  }, [allNodes, projects])

  // ── Build world groups ─────────────────────────────────────────────────────
  const worldGroups = useMemo(() => {
    const groups = []
    for (let i = 0; i < displayNodes.length; i += 7) {
      const chunk    = displayNodes.slice(i, i + 7)
      const themeIdx = Math.floor(i / 7) % worlds.length
      groups.push({ world: worlds[themeIdx], nodes: chunk })
    }
    return groups
  }, [displayNodes, worlds])

  // ── Compute absolute y positions for every node ────────────────────────────
  const { layoutItems, totalMapHeight } = useMemo(() => {
    const items = []   // { type:'banner'|'node', ...props, y, height }
    let y = 0

    worldGroups.forEach((g, gi) => {
      // Banner
      items.push({ type:'banner', world:g.world, worldIdx:gi, nodes:g.nodes, y, height:BANNER_H })
      y += BANNER_H

      // Nodes
      g.nodes.forEach((node, ni) => {
        const globalIdx = gi * 7 + ni
        const x    = getWaveX(globalIdx)
        const h    = (node.isBoss || node.isProject) ? BOSS_ROW_H : NODE_ROW_H
        items.push({ type:'node', node, world:g.world, x, y: y + h / 2, height:h, status:node.status })
        y += h
      })

      y += 16 // inter-world gap
    })

    return { layoutItems: items, totalMapHeight: y + 40 }
  }, [worldGroups])

  // Separate node items for SVG path
  const nodeItems = useMemo(() => layoutItems.filter(i => i.type === 'node'), [layoutItems])
  const currentNode = useMemo(
    () => displayNodes.find((node) => node.status === 'active') || null,
    [displayNodes],
  )
  const pathSegments = useMemo(() => nodeItems.slice(1).map((cur, index) => {
    const prev = nodeItems[index]
    return {
      id: `${prev.node.id}-${cur.node.id}`,
      fromId: prev.node.id,
      toId: cur.node.id,
      fromStatus: prev.node.status,
      toStatus: cur.node.status,
      x1: prev.x,
      y1: prev.y,
      x2: cur.x,
      y2: cur.y,
      mx: (prev.x + cur.x) / 2,
      my: (prev.y + cur.y) / 2,
      world: cur.world,
    }
  }), [nodeItems])

  useEffect(() => {
    if (!currentNode?.id) return undefined
    const timer = setTimeout(() => {
      const element = nodeRefs.current.get(currentNode.id)
      if (!element) return
      const targetY = window.scrollY + element.getBoundingClientRect().top - ((window.innerHeight / 2) - 80)
      window.scrollTo({ top: Math.max(0, targetY), behavior: 'smooth' })
    }, 300)
    return () => clearTimeout(timer)
  }, [currentNode?.id])

  useEffect(() => () => {
    transitionTimersRef.current.forEach((timerId) => clearTimeout(timerId))
    transitionTimersRef.current = []
  }, [activeNode])

  // ── Task completion ────────────────────────────────────────────────────────
  const handleComplete = useCallback(async (rowId, taskId, task, event) => {
    setCompleting(taskId)
    if (event) {
      const rect  = event.currentTarget.getBoundingClientRect()
      const xpAmt = TASK_XP[task.type] || 20
      setXpPop({ x: rect.left + rect.width / 2, y: rect.top - 10, xp: xpAmt })
    }

    // Compute patch result synchronously to avoid reading mutable vars set inside updater
    let completedNode = false
    let nextUnlockId = null
    setAllNodes((prev) => {
      const patched = patchNodeTask(prev, rowId, taskId)
      completedNode = patched.completedNode
      nextUnlockId = patched.completedNode ? findNextUnlockId(patched.nextNodes, rowId) : null
      return patched.completedNode ? patched.nextNodes : recomputeNodeStatuses(patched.nextNodes)
    })

    setActiveNode((prev) => {
      if (!prev || prev.id !== rowId) return prev
      const updatedTasks = prev.tasks.map((entry) => entry.id === taskId ? { ...entry, completed: true } : entry)
      const doneCount = updatedTasks.filter((entry) => entry.completed).length
      const nodeDone = doneCount === updatedTasks.length && updatedTasks.length > 0
      return {
        ...prev,
        tasks: updatedTasks,
        completedTasks: doneCount,
        status: nodeDone ? 'done' : prev.status,
      }
    })

    // Note: completedNode/nextUnlockId are set synchronously by React 18's updater
    if (completedNode) {
      setCelebratingNodeId(rowId)
      setJustUnlockedNodeId(null)

      const unlockTimer = setTimeout(() => {
        setAllNodes((prev) => recomputeNodeStatuses(prev))
        if (nextUnlockId) setJustUnlockedNodeId(nextUnlockId)
      }, 550)

      const clearCelebrateTimer = setTimeout(() => {
        setCelebratingNodeId(null)
      }, 1200)

      const clearUnlockTimer = setTimeout(() => {
        setJustUnlockedNodeId(null)
      }, 1800)

      transitionTimersRef.current.push(unlockTimer, clearCelebrateTimer, clearUnlockTimer)
    }

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token || null
      await fetch('/api/complete', {
        method:'POST',
        headers:{ 'Content-Type':'application/json', ...(token ? { Authorization:`Bearer ${token}` } : {}) },
        body: JSON.stringify({
          taskRowId: rowId,
          taskId,
          completedTaskIds: (activeNode?.id === rowId ? activeNode.tasks : [])
            .filter((entry) => entry.completed)
            .map((entry) => entry.id),
        }),
      })
    } catch { /* optimistic stays */ }
    setCompleting(null)
  }, [activeNode])

  // ── Nav ────────────────────────────────────────────────────────────────────
  const handleNav = useCallback((tab) => {
    if (tab === 'home')  router.push('/dashboard')
    if (tab === 'stats') router.push('/stats')
  }, [router])

  // ── Derived ────────────────────────────────────────────────────────────────
  const lvl            = useMemo(() => getLevelProgress(progress.xp), [progress.xp])
  const totalNodes     = displayNodes.length
  const completedNodes = displayNodes.filter((node) => node.status === 'done').length
  const completionPct  = totalNodes > 0 ? Math.round((completedNodes / totalNodes) * 100) : 0
  const activeSheetWorld = useMemo(() => {
    if (!activeNode) return worlds[0]
    const gi = worldGroups.findIndex(g => g.nodes.some(n => n.id === activeNode.id))
    return gi >= 0 ? worldGroups[gi].world : worlds[0]
  }, [activeNode, worldGroups, worlds])

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={themeVars}>
      <style>{CSS}</style>

      <div style={{ ...pageThemeStyle, minHeight:'100vh', fontFamily:T.font, paddingBottom:80 }}>

        {/* ── Sticky top bar ──────────────────────────────────────────── */}
        <div style={{
          position:'sticky', top:0, zIndex:200,
          background:T.chrome,
          borderBottom:`1px solid ${T.border}`,
          backdropFilter:'blur(28px)', WebkitBackdropFilter:'blur(28px)',
        }}>
          <div style={{ maxWidth:700, margin:'0 auto', padding:'12px 18px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:9 }}>
              {/* Level badge */}
              <div style={{
                width:36, height:36, borderRadius:'50%', flexShrink:0,
                background:T.masteryGradient,
                display:'flex', alignItems:'center', justifyContent:'center',
                fontWeight:900, fontSize:15, color:'#fff',
                boxShadow:'0 0 18px rgba(192,132,252,0.45)',
              }}>{lvl.level}</div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:12, fontWeight:800, color:T.text, marginBottom:1 }}>
                  {lvl.title}
                  {goal && <span style={{ fontWeight:500, color:T.textMuted }}> · {goal.goal_text}</span>}
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <div style={{ flex:1, height:4, background:'rgba(255,255,255,0.06)', borderRadius:9999, overflow:'hidden' }}>
                    <div style={{
                      height:'100%', width:`${Math.round(lvl.pct * 100)}%`,
                      background:T.masteryGradientSoft, borderRadius:9999,
                      transition:'width 0.5s',
                    }}/>
                  </div>
                  <span style={{ fontSize:10, color:T.textMuted, fontWeight:600, flexShrink:0 }}>
                    {lvl.xpInLevel}/{lvl.xpForLevel} XP
                  </span>
                </div>
              </div>
              {/* Streak pill */}
              {progress.streak > 0 && (
                <div style={{
                  display:'flex', alignItems:'center', gap:5,
                  padding:'5px 11px',
                  background:'rgba(251,146,60,0.12)', border:'1px solid rgba(251,146,60,0.28)',
                  borderRadius:9999, fontSize:13, fontWeight:900, color:'#FB923C', flexShrink:0,
                  animation:'streakFlame 2.5s ease-in-out infinite',
                }}>
                  <IconGlyph name="flame" size={14} strokeWidth={2.3} color="#FB923C"/>
                  {progress.streak}
                </div>
              )}
            </div>

            {/* Overall path progress bar */}
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ flex:1, height:6, background:'rgba(255,255,255,0.06)', borderRadius:9999, overflow:'hidden' }}>
                <div style={{
                  height:'100%',
                  width: totalNodes > 0 ? `${Math.round(completedNodes / totalNodes * 100)}%` : '0%',
                  background:'linear-gradient(90deg,var(--theme-primary),var(--theme-secondary),var(--theme-mastery))',
                  borderRadius:9999, transition:'width 0.6s cubic-bezier(0.16,1,0.3,1)',
                  backgroundSize:'200% 100%',
                  animation: completedNodes > 0 ? 'shimmer 3s linear infinite' : 'none',
                }}/>
              </div>
              <span style={{ fontSize:10, fontWeight:700, color:T.textMuted, flexShrink:0 }}>
                {completedNodes}/{totalNodes} days
              </span>
              {/* Project toggle button */}
              <button onClick={() => setShowProjModal(true)} style={{
                padding:'4px 10px', borderRadius:9999, fontFamily:T.font,
                background: projects ? 'rgba(192,132,252,0.15)' : 'rgba(255,255,255,0.05)',
                border:`1px solid ${projects ? 'rgba(192,132,252,0.40)' : 'rgba(255,255,255,0.10)'}`,
                color: projects ? 'var(--theme-mastery)' : T.textMuted,
                fontSize:10, fontWeight:800, cursor:'pointer', flexShrink:0,
                display:'flex', alignItems:'center', gap:4,
              }}>
                <IconGlyph name="hammer" size={12} strokeWidth={2.3} color={projects ? 'var(--theme-mastery)' : T.textMuted}/>
                {projects ? 'Projects ON' : 'Add Projects'}
              </button>
            </div>

            {currentNode && (
              <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', marginTop:12 }}>
                <span style={{
                  fontSize:9, fontWeight:900, letterSpacing:'1.4px', textTransform:'uppercase',
                  color:T.ink, background:'linear-gradient(135deg,var(--theme-primary),#f8fafc)',
                  padding:'3px 10px', borderRadius:9999,
                  boxShadow:'0 10px 24px rgba(34,211,165,0.18)',
                }}>
                  Current focus
                </span>
                <span style={{ fontSize:12, fontWeight:800, color:T.text }}>
                  {currentNode.isBoss ? 'Boss Battle' : currentNode.isProject ? 'Project Build' : `Day ${currentNode.dayNumber}`}
                </span>
                <span style={{ fontSize:12, color:T.textSec, fontWeight:600 }}>
                  {currentNode.conceptName}
                </span>
                <span style={{ fontSize:11, color:T.textMuted, fontWeight:700 }}>
                  {completionPct}% complete
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ── Loading ──────────────────────────────────────────────────── */}
        {loading && (
          <div style={{ maxWidth:500, margin:'32px auto', padding:'0 20px', display:'flex', flexDirection:'column', gap:18 }}>
            {[0,1,2,3].map(i => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:16 }}>
                <Skeleton width={64} height={64} borderRadius="50%" style={{ flexShrink:0 }}/>
                <div style={{ flex:1 }}>
                  <Skeleton height={12} borderRadius={6} width="65%" style={{ marginBottom: 6 }}/>
                  <Skeleton height={9} borderRadius={6} width="40%"/>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Error ────────────────────────────────────────────────────── */}
        {!loading && error && (
          <div style={{ textAlign:'center', padding:40 }}>
            <div style={{ color:'#F87171', fontSize:14, marginBottom: 14 }}>{error}</div>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding:'12px 20px',
                borderRadius:14,
                border:'1px solid rgba(255,255,255,0.10)',
                background:'rgba(255,255,255,0.04)',
                color:T.text,
                fontSize:13,
                fontWeight:700,
                cursor:'pointer',
                fontFamily:T.font,
              }}
            >
              Retry
            </button>
          </div>
        )}

        {/* ── Empty state ───────────────────────────────────────────────── */}
        {!loading && !error && allNodes.length === 0 && (
          <div style={{ textAlign:'center', padding:'60px 24px' }}>
            <div style={{
              width:72,height:72,margin:'0 auto 16px',borderRadius:24,
              display:'flex',alignItems:'center',justifyContent:'center',
              background:'rgba(255,255,255,0.04)',border:`1px solid ${T.border}`,color:T.textSec,
            }}>
              <IconGlyph name="map" size={30} strokeWidth={2.2}/>
            </div>
            <div style={{ fontSize:18, fontWeight:800, color:T.text, marginBottom:8 }}>Your map is empty</div>
            <div style={{ fontSize:14, color:T.textMuted, marginBottom:24, lineHeight:1.6 }}>
              Complete onboarding to generate your learning path
            </div>
            <button onClick={() => router.push('/onboarding')} style={{
              padding:'14px 32px',
              background:'linear-gradient(135deg,var(--theme-primary),var(--theme-secondary))',
              border:'none', borderRadius:14, color:T.ink,
              fontSize:15, fontWeight:900, cursor:'pointer', fontFamily:T.font,
              boxShadow:'0 0 32px rgba(34,211,165,0.40)',
            }}>Get Started →</button>
          </div>
        )}

        {/* ── Map ────────────────────────────────────────────────────────── */}
        {!loading && !error && allNodes.length > 0 && (
          <div style={{ position:'relative', height:totalMapHeight, overflow:'hidden' }}>
            <motion.div
              aria-hidden="true"
              style={{
                y: orbDrift,
                position:'absolute',
                inset:0,
                zIndex:0,
                pointerEvents:'none',
              }}
            >
              <div style={{
                position:'absolute', top:120, left:'8%',
                width:240, height:240, borderRadius:'50%',
                background:'radial-gradient(circle, rgba(34,211,165,0.18) 0%, transparent 70%)',
                filter:'blur(8px)',
              }}/>
              <div style={{
                position:'absolute', top:640, right:'10%',
                width:320, height:320, borderRadius:'50%',
                background:'radial-gradient(circle, rgba(96,165,250,0.16) 0%, transparent 72%)',
                filter:'blur(14px)',
              }}/>
            </motion.div>

            <motion.div
              aria-hidden="true"
              style={{
                y: orbDriftFar,
                position:'absolute',
                inset:0,
                zIndex:0,
                pointerEvents:'none',
              }}
            >
              <div style={{
                position:'absolute', top:360, left:'58%',
                width:280, height:280, borderRadius:'50%',
                background:'radial-gradient(circle, rgba(192,132,252,0.16) 0%, transparent 68%)',
                filter:'blur(18px)',
              }}/>
              <div style={{
                position:'absolute', top:980, left:'16%',
                width:220, height:220, borderRadius:'50%',
                background:'radial-gradient(circle, rgba(251,191,36,0.14) 0%, transparent 70%)',
                filter:'blur(14px)',
              }}/>
            </motion.div>

            <motion.div
              aria-hidden="true"
              style={{
                y: overlayDrift,
                position:'absolute',
                inset:0,
                zIndex:1,
                pointerEvents:'none',
                opacity:0.22,
                backgroundImage:'radial-gradient(rgba(255,255,255,0.16) 0.7px, transparent 0.7px)',
                backgroundSize:'18px 18px',
                mixBlendMode:'soft-light',
              }}
            />

            {/* World backgrounds */}
            {layoutItems.filter((item) => item.type === 'banner').map((item, idx) => (
              <div key={idx} style={{
                position:'absolute', left:0, right:0, top:item.y,
                height: (() => {
                  const nextBanner = layoutItems.filter((entry) => entry.type === 'banner')[idx + 1]
                  return nextBanner ? nextBanner.y - item.y : totalMapHeight - item.y
                })(),
                background: item.world.bg,
                zIndex:0,
              }}/>
            ))}

            {/* World banners */}
            {layoutItems.filter((item) => item.type === 'banner').map((item, idx) => {
              const doneCount = item.nodes.filter((node) => node.status === 'done').length
              return (
                <WorldBanner
                  key={idx}
                  world={item.world}
                  worldIdx={item.worldIdx}
                  doneCount={doneCount}
                  totalCount={item.nodes.length}
                  starCount={getWorldStarCount(item.nodes)}
                  height={item.height}
                  top={item.y}
                />
              )
            })}

            <svg
              style={{ position:'absolute', left:0, top:0, width:'100%', height:totalMapHeight, pointerEvents:'none', zIndex:2 }}
              viewBox={`0 0 ${COORD_W} ${totalMapHeight}`}
              preserveAspectRatio="none"
            >
              {pathSegments.map((segment) => (
                <PathLine
                  key={segment.id}
                  segment={segment}
                  celebrating={celebratingNodeId === segment.fromId}
                />
              ))}
            </svg>

            {nodeItems.map((item) => {
              const node = item.node
              const xPct = (item.x / COORD_W) * 100
              const nodeState = node.isBoss || node.isProject
                ? 'boss'
                : node.status === 'done'
                  ? 'completed'
                  : node.status === 'active'
                    ? 'current'
                    : 'locked'

              return (
                <PathNode
                  key={node.id}
                  state={nodeState}
                  status={node.status}
                  tone={getNodeTone(node)}
                  label={node.conceptName}
                  xp={rowXP(node.tasks)}
                  position={{ x: xPct, y: item.y }}
                  dayLabel={node.isBoss ? 'Boss Battle' : node.isProject ? 'Project Build' : `Day ${node.dayNumber}`}
                  progress={node.totalTasks > 0 ? node.completedTasks / node.totalTasks : 0}
                  world={item.world}
                  placeholder={node.isPlaceholder}
                  current={node.status === 'active'}
                  completed={node.status === 'done'}
                  celebrating={celebratingNodeId === node.id}
                  justUnlocked={justUnlockedNodeId === node.id}
                  side={item.x < COORD_W / 2 ? 'right' : 'left'}
                  onTap={() => setActiveNode(node)}
                  nodeRef={(element) => registerNodeRef(node.id, element)}
                />
              )
            })}

            <div style={{
              position:'absolute', bottom:20, left:'50%', transform:'translateX(-50%)',
              padding:'12px 22px',
              background:'linear-gradient(135deg, rgba(15,23,42,0.78), rgba(15,23,42,0.52))',
              border:'1px solid rgba(255,255,255,0.10)',
              borderRadius:16, textAlign:'center', zIndex:5, whiteSpace:'nowrap',
              boxShadow:'0 18px 34px rgba(2,6,23,0.28)',
              backdropFilter:'blur(16px)', WebkitBackdropFilter:'blur(16px)',
            }}>
              <span style={{ fontSize:13, fontWeight:700, color:T.textMuted, display:'inline-flex', alignItems:'center', gap:8 }}>
                <IconGlyph name="sparkles" size={14} strokeWidth={2.2} color={T.textMuted}/>
                Complete missions to light the path ahead
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ── Bottom sheet ─────────────────────────────────────────────────── */}
      <BottomSheet
        node={activeNode}
        world={activeSheetWorld}
        onClose={() => setActiveNode(null)}
        onComplete={handleComplete}
        completing={completing}
      />

      {/* ── XP Pop ───────────────────────────────────────────────────────── */}
      <XPPop pop={xpPop} onDone={() => setXpPop(null)}/>

      {/* ── Project Modal ─────────────────────────────────────────────────── */}
      {showProjModal && (
        <ProjectModal
          enabled={projects}
          onToggle={setProjects}
          onClose={() => setShowProjModal(false)}
        />
      )}

      {/* ── Tab bar ────────────────────────────────────────────────────────── */}
      <TabBar onNav={handleNav}/>
    </div>
  )
}
