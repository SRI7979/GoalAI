// Path — Full Gamified Learning Map (Duolingo × Brilliant)
'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getLevelProgress } from '@/lib/xp'
import { trackMapViewed } from '@/lib/analytics'

// ─── Design Tokens ────────────────────────────────────────────────────────────
const T = {
  bg:       '#080810',
  font:     "'Plus Jakarta Sans','DM Sans',system-ui,sans-serif",
  text:     '#F1F5F9',
  textSec:  '#94A3B8',
  textMuted:'#475569',
  border:   'rgba(255,255,255,0.08)',
}

// ─── World Themes — vibrant, high contrast ────────────────────────────────────
const WORLDS = [
  { name:'Foundation', emoji:'🌱', label:'START HERE',
    accent:'#22D3A5', dark:'#0d7a5f', glow:'rgba(34,211,165,0.50)',
    bg:'linear-gradient(160deg,rgba(34,211,165,0.14) 0%,rgba(16,185,129,0.06) 100%)',
    strip:'rgba(34,211,165,0.10)', node:'#22D3A5', lock:'rgba(34,211,165,0.18)' },
  { name:'Explorer',  emoji:'🔭', label:'LEVEL UP',
    accent:'#60A5FA', dark:'#1d4ed8', glow:'rgba(96,165,250,0.50)',
    bg:'linear-gradient(160deg,rgba(96,165,250,0.14) 0%,rgba(99,102,241,0.06) 100%)',
    strip:'rgba(96,165,250,0.10)', node:'#60A5FA', lock:'rgba(96,165,250,0.18)' },
  { name:'Builder',   emoji:'🔨', label:'BUILD IT',
    accent:'#C084FC', dark:'#7c3aed', glow:'rgba(192,132,252,0.50)',
    bg:'linear-gradient(160deg,rgba(192,132,252,0.14) 0%,rgba(139,92,246,0.06) 100%)',
    strip:'rgba(192,132,252,0.10)', node:'#C084FC', lock:'rgba(192,132,252,0.18)' },
  { name:'Practitioner',emoji:'⚡', label:'DEEP WORK',
    accent:'#FBBF24', dark:'#b45309', glow:'rgba(251,191,36,0.50)',
    bg:'linear-gradient(160deg,rgba(251,191,36,0.14) 0%,rgba(245,158,11,0.06) 100%)',
    strip:'rgba(251,191,36,0.10)', node:'#FBBF24', lock:'rgba(251,191,36,0.18)' },
  { name:'Master',    emoji:'🔥', label:'MASTERY',
    accent:'#FB923C', dark:'#c2410c', glow:'rgba(251,146,60,0.50)',
    bg:'linear-gradient(160deg,rgba(251,146,60,0.14) 0%,rgba(239,68,68,0.06) 100%)',
    strip:'rgba(251,146,60,0.10)', node:'#FB923C', lock:'rgba(251,146,60,0.18)' },
]

// ─── Wave x-positions in 400px coordinate space ───────────────────────────────
// 5-point wave: left edge → left → center → right → right edge → right → center → left → repeat
const WAVE_PX = [55, 120, 200, 280, 345, 280, 200, 120]
const getWaveX = (i) => WAVE_PX[i % WAVE_PX.length]

// Map layout constants
const NODE_ROW_H = 118  // px per node row
const BOSS_ROW_H = 140  // px for boss/project rows
const BANNER_H   = 88   // world banner strip height
const COORD_W    = 400  // SVG coordinate width

// XP per task type
const TASK_XP = { lesson:20, video:15, practice:25, exercise:30, quiz:35, review:20 }
const rowXP   = (tasks) => tasks.reduce((s, t) => s + (TASK_XP[t.type] || 20), 0)

// ─── Keyframes ────────────────────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800;900&display=swap');
  *,*::before,*::after { box-sizing: border-box }
  ::-webkit-scrollbar { display: none }
  body { background: #080810 }

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
  lesson:   { color:'#22D3A5', label:'LESSON'   },
  video:    { color:'#FBBF24', label:'VIDEO'    },
  practice: { color:'#60A5FA', label:'PRACTICE' },
  exercise: { color:'#C084FC', label:'EXERCISE' },
  quiz:     { color:'#F87171', label:'QUIZ'     },
  review:   { color:'#FB923C', label:'REVIEW'   },
}

// ─── World Banner ─────────────────────────────────────────────────────────────
function WorldBanner({ world, worldIdx, doneCount, totalCount, height }) {
  const pct     = totalCount > 0 ? doneCount / totalCount : 0
  const allDone = doneCount === totalCount && totalCount > 0
  return (
    <div style={{
      position:'absolute', left:0, right:0, height,
      background: world.bg,
      display:'flex', alignItems:'center',
      padding:'0 18px', overflow:'hidden',
    }}>
      {/* Left decoration */}
      <div style={{
        width:52, height:52, borderRadius:'50%', flexShrink:0,
        background:`radial-gradient(circle,${world.accent}28,transparent 70%)`,
        border:`2px solid ${world.accent}35`,
        display:'flex', alignItems:'center', justifyContent:'center',
        fontSize:24,
      }}>{world.emoji}</div>

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
          {allDone && <span style={{ fontSize:14 }}>🏆</span>}
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
        <div style={{ fontSize:20, lineHeight:1, opacity: pct > 0 ? 1 : 0.25 }}>
          {pct >= 1 ? '⭐' : pct >= 0.5 ? '✨' : '☆'}
        </div>
        <div style={{ fontSize:9, color: T.textMuted, marginTop:2, fontWeight:600 }}>{Math.round(pct*100)}%</div>
      </div>
    </div>
  )
}

// ─── Side Decoration (XP badge + concept name) ────────────────────────────────
function SideInfo({ node, world, onRight }) {
  const xp      = rowXP(node.tasks)
  const isReal  = !node.isPlaceholder
  const isDone  = node.status === 'done'
  const isActive= node.status === 'active'
  const textAlign = onRight ? 'left' : 'right'
  return (
    <div style={{ textAlign, maxWidth:90, animation: isActive ? 'fadeUp 0.4s ease' : 'none' }}>
      {/* Concept name */}
      <div style={{
        fontSize:10, fontWeight:700, lineHeight:1.35,
        color: isDone ? T.textMuted : isActive ? world.accent : 'rgba(255,255,255,0.20)',
        marginBottom: isReal ? 4 : 0,
        wordBreak:'break-word',
      }}>
        {isReal ? node.conceptName : node.isPlaceholder && isActive ? node.conceptName : '· · ·'}
      </div>

      {/* XP badge */}
      {isReal && (
        <div style={{
          display:'inline-flex', alignItems:'center', gap:3,
          background: isDone ? 'rgba(251,191,36,0.12)' : 'rgba(255,255,255,0.05)',
          border: `1px solid ${isDone ? 'rgba(251,191,36,0.30)' : 'rgba(255,255,255,0.08)'}`,
          borderRadius:9999, padding:'2px 7px',
          fontSize:9, fontWeight:800, color: isDone ? '#FBBF24' : T.textMuted,
        }}>
          <BoltIco sz={8}/>{xp} XP
        </div>
      )}
    </div>
  )
}

// ─── Map Node Button ──────────────────────────────────────────────────────────
function MapNode({ node, world, isActive, onTap }) {
  const isDone      = node.status === 'done'
  const isLocked    = node.status === 'locked' || node.isPlaceholder
  const isBoss      = node.isBoss
  const isProject   = node.isProject
  const size        = isBoss || isProject ? 76 : 64
  const radius      = isBoss ? 20 : isProject ? '50%' : '50%'
  const completePct = node.totalTasks > 0 ? node.completedTasks / node.totalTasks : 0

  // Node color scheme
  let bgColor, borderColor, iconColor, boxShadow, animation
  if (isDone) {
    bgColor     = isBoss ? 'linear-gradient(135deg,#F59E0B,#FBBF24)' : `linear-gradient(135deg,${world.accent}90,${world.dark}90)`
    borderColor = isBoss ? '#F59E0B' : world.accent
    iconColor   = isDone && !isBoss ? '#080810' : '#fff'
    boxShadow   = `0 4px 20px ${world.glow}, inset 0 1px 0 rgba(255,255,255,0.30)`
    animation   = isBoss ? 'crownBounce 3s ease-in-out infinite' : 'none'
  } else if (isActive) {
    bgColor     = isBoss ? 'rgba(245,158,11,0.18)' : isProject ? `rgba(${world.accent},0.18)` : world.strip
    borderColor = isBoss ? '#F59E0B' : world.accent
    iconColor   = isBoss ? '#F59E0B' : world.accent
    boxShadow   = `0 0 0 0 ${world.glow}`
    animation   = `pulseNode 2.2s ease-in-out infinite`
  } else {
    bgColor     = 'rgba(255,255,255,0.03)'
    borderColor = 'rgba(255,255,255,0.10)'
    iconColor   = 'rgba(255,255,255,0.20)'
    boxShadow   = 'none'
    animation   = 'none'
  }

  const label = isBoss
    ? (isDone ? '👑' : isActive ? '💀' : '💀')
    : isProject
    ? (isDone ? '🏗' : isActive ? '🏗' : '🏗')
    : null

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:5, position:'relative' }}>
      {/* "You are here" ribbon */}
      {isActive && !node.isPlaceholder && (
        <div style={{
          position:'absolute', top:-(isBoss ? 36 : 32), left:'50%', transform:'translateX(-50%)',
          fontSize:9, fontWeight:900, letterSpacing:'1.4px', textTransform:'uppercase',
          color:'#080810', background:world.accent,
          padding:'3px 10px', borderRadius:9999,
          whiteSpace:'nowrap', boxShadow:`0 4px 14px ${world.glow}`,
          animation:'fadeUp 0.35s ease',
          zIndex:10,
        }}>▶ You are here</div>
      )}

      {/* Node */}
      <button
        onClick={() => !isLocked && onTap(node)}
        disabled={isLocked}
        style={{
          width:size, height:size,
          borderRadius: isBoss ? radius : '50%',
          background:   bgColor,
          border:       `3px solid ${borderColor}`,
          boxShadow,
          display:'flex', alignItems:'center', justifyContent:'center',
          cursor: isLocked ? 'default' : 'pointer',
          transition: 'transform 0.18s cubic-bezier(0.34,1.56,0.64,1)',
          animation,
          // @ts-ignore
          '--glow': world.glow,
          backdropFilter:'blur(10px)',
          WebkitBackdropFilter:'blur(10px)',
          flexShrink:0, position:'relative', overflow:'visible',
        }}
        onMouseEnter={e => { if (!isLocked) e.currentTarget.style.transform = 'scale(1.10)' }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}
      >
        {/* Inner content */}
        {label ? (
          <span style={{ fontSize:28, lineHeight:1, display:'block' }}>{label}</span>
        ) : isDone ? (
          <span style={{ color: iconColor }}><CheckIco/></span>
        ) : isLocked ? (
          <span style={{ color: iconColor, opacity:0.7 }}><LockIco/></span>
        ) : (
          <span style={{ fontSize:26, lineHeight:1 }}>{world.emoji}</span>
        )}

        {/* Partial progress ring */}
        {isActive && !node.isPlaceholder && completePct > 0 && (
          <svg style={{ position:'absolute', inset:-4, width:'calc(100% + 8px)', height:'calc(100% + 8px)', pointerEvents:'none' }}
               viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="36" fill="none"
              stroke={world.accent} strokeWidth="3" strokeLinecap="round"
              strokeDasharray={`${2*Math.PI*36}`}
              strokeDashoffset={`${2*Math.PI*36*(1-completePct)}`}
              transform="rotate(-90 40 40)" opacity="0.9"
            />
          </svg>
        )}

        {/* Done checkmark accent ring */}
        {isDone && !isBoss && (
          <div style={{
            position:'absolute', inset:-4,
            borderRadius:'50%', border:`2px solid ${world.accent}60`,
            pointerEvents:'none',
          }}/>
        )}
      </button>

      {/* Day label */}
      <div style={{
        fontSize:10, fontWeight:800, letterSpacing:'0.4px', textAlign:'center',
        color: isDone ? T.textMuted : isActive ? world.accent : 'rgba(255,255,255,0.20)',
        lineHeight:1.2,
      }}>
        {isBoss ? '⚔ Boss' : isProject ? '🏗 Project' : `Day ${node.dayNumber}`}
      </div>
    </div>
  )
}

// ─── The winding SVG path between nodes ───────────────────────────────────────
function PathSVG({ nodeItems, totalHeight }) {
  if (nodeItems.length < 2) return null
  // Build smooth bezier path
  const segs = nodeItems.slice(1).map((cur, i) => {
    const prev = nodeItems[i]
    const mx   = (prev.x + cur.x) / 2
    const my   = (prev.y + cur.y) / 2
    return { x1: prev.x, y1: prev.y, x2: cur.x, y2: cur.y, mx, my,
             done: prev.status === 'done', active: prev.status === 'active', world: cur.world }
  })

  return (
    <svg
      style={{ position:'absolute', left:0, top:0, width:'100%', height:totalHeight, pointerEvents:'none', zIndex:0 }}
      viewBox={`0 0 ${COORD_W} ${totalHeight}`}
      preserveAspectRatio="none"
    >
      <defs>
        {segs.map((s, i) => s.done && (
          <linearGradient key={i} id={`lg${i}`} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor={s.world.accent} stopOpacity="0.6"/>
            <stop offset="100%" stopColor={s.world.accent} stopOpacity="0.3"/>
          </linearGradient>
        ))}
      </defs>
      {segs.map((s, i) => (
        <path key={i}
          d={`M ${s.x1} ${s.y1} Q ${s.mx} ${s.my} ${s.x2} ${s.y2}`}
          fill="none"
          stroke={s.done ? `url(#lg${i})` : s.active ? `${s.world.accent}35` : 'rgba(255,255,255,0.06)'}
          strokeWidth={s.done ? 3.5 : 2.5}
          strokeDasharray={!s.done && !s.active ? '10 7' : 'none'}
          strokeLinecap="round"
        />
      ))}
    </svg>
  )
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
        background:'#0f0f1e',
        border:`1px solid ${world.accent}30`,
        borderBottom:'none', borderRadius:'26px 26px 0 0',
        padding:'20px 20px 48px',
        maxHeight:'82vh', overflowY:'auto',
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
              color:'#080810', background: node.isBoss ? '#F59E0B' : node.isProject ? '#C084FC' : world.accent,
              padding:'3px 10px', borderRadius:9999,
            }}>
              {node.isBoss ? '⚔ Boss Challenge' : node.isProject ? '🏗 Build Project' : `Day ${node.dayNumber} Mission`}
            </span>
            {isDone && <span style={{ fontSize:9, fontWeight:900, letterSpacing:'1px',
              color:'#080810', background:'#22D3A5', padding:'3px 10px', borderRadius:9999 }}>
              ✓ COMPLETE
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
                    borderRadius:12, color: isCompleting ? T.textMuted : '#080810',
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
        background:'#0f0f1e',
        borderRadius:'26px 26px 0 0', padding:'24px 22px 44px',
        fontFamily:T.font, animation:'slideUp 0.28s cubic-bezier(0.34,1.2,0.64,1)',
        border:'1px solid rgba(192,132,252,0.25)', borderBottom:'none',
        boxShadow:'0 -8px 60px rgba(192,132,252,0.25)',
      }}>
        <div style={{ width:40, height:4, background:'rgba(192,132,252,0.40)', borderRadius:9999, margin:'0 auto 22px'}}/>

        <div style={{ textAlign:'center', marginBottom:22 }}>
          <div style={{ fontSize:44, marginBottom:10 }}>🏗</div>
          <div style={{ fontSize:22, fontWeight:900, color:T.text, marginBottom:8 }}>Hands-on Projects</div>
          <div style={{ fontSize:14, color:T.textSec, lineHeight:1.55, maxWidth:320, margin:'0 auto' }}>
            Add build challenges every 5 days. Apply what you learn by creating real things.
            <br/><br/>
            Projects appear as <strong style={{color:'#C084FC'}}>boss battles</strong> on your map — complete them to unlock special XP rewards.
          </div>
        </div>

        {/* Benefits */}
        {[
          { icon:'⚡', text:'+50 bonus XP per project completed' },
          { icon:'🧠', text:'Solidify learning through application' },
          { icon:'🏆', text:'Earn unique "Builder" achievement badges' },
        ].map((row, i) => (
          <div key={i} style={{
            display:'flex', alignItems:'center', gap:12,
            background:'rgba(192,132,252,0.06)', border:'1px solid rgba(192,132,252,0.14)',
            borderRadius:14, padding:'11px 14px', marginBottom:8,
          }}>
            <span style={{ fontSize:20 }}>{row.icon}</span>
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
              ? 'rgba(239,68,68,0.10)' : 'linear-gradient(135deg,#C084FC,#818CF8)',
            border: enabled ? '1px solid rgba(239,68,68,0.25)' : 'none',
            borderRadius:14,
            color: enabled ? '#F87171' : '#080810',
            fontWeight:900, fontSize:14, cursor:'pointer', fontFamily:T.font,
            boxShadow: enabled ? 'none' : '0 0 28px rgba(192,132,252,0.50)',
          }}>
            {enabled ? 'Remove Projects' : '🏗 Add Projects to Map'}
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
      background:'rgba(8,8,16,0.94)',
      borderTop:'1px solid rgba(255,255,255,0.08)',
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
            color: isActive ? '#22D3A5' : T.textMuted,
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

  // ── Load ───────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true); setError('')
    const { data: authData } = await supabase.auth.getUser()
    const me = authData?.user
    if (!me) { router.push('/login'); return }

    const [
      { data: activeGoal },
      { data: prog },
    ] = await Promise.all([
      supabase.from('goals').select('*').eq('user_id', me.id).eq('status', 'active')
        .order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('user_progress').select('total_xp,current_streak,total_days')
        .eq('user_id', me.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ])

    if (!activeGoal) { setLoading(false); return }
    setGoal(activeGoal)

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

  useEffect(() => { load() }, [load])

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
      const themeIdx = Math.floor(i / 7) % WORLDS.length
      groups.push({ world: WORLDS[themeIdx], nodes: chunk })
    }
    return groups
  }, [displayNodes])

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

  // ── Task completion ────────────────────────────────────────────────────────
  const handleComplete = useCallback(async (rowId, taskId, task, event) => {
    setCompleting(taskId)
    if (event) {
      const rect  = event.currentTarget.getBoundingClientRect()
      const xpAmt = TASK_XP[task.type] || 20
      setXpPop({ x: rect.left + rect.width / 2, y: rect.top - 10, xp: xpAmt })
    }

    // Optimistic update
    setAllNodes(prev => {
      let foundActiveAfter = false
      return prev.map(n => {
        if (n.id !== rowId) return n
        const updatedTasks = n.tasks.map(t => t.id === taskId ? { ...t, completed: true } : t)
        const doneCount    = updatedTasks.filter(t => t.completed).length
        const allDone      = doneCount === updatedTasks.length && updatedTasks.length > 0
        return { ...n, tasks: updatedTasks, completedTasks: doneCount, status: allDone ? 'done' : n.status }
      }).map((n, _) => {
        // Recompute active status
        if (n.status === 'done' || n.isPlaceholder) return n
        if (!foundActiveAfter) { foundActiveAfter = true; return { ...n, status: 'active' } }
        return { ...n, status: 'locked' }
      })
    })

    setActiveNode(prev => {
      if (!prev || prev.id !== rowId) return prev
      const updatedTasks = prev.tasks.map(t => t.id === taskId ? { ...t, completed: true } : t)
      const doneCount    = updatedTasks.filter(t => t.completed).length
      return { ...prev, tasks: updatedTasks, completedTasks: doneCount,
        status: doneCount === updatedTasks.length ? 'done' : prev.status }
    })

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token || null
      await fetch('/api/complete', {
        method:'POST',
        headers:{ 'Content-Type':'application/json', ...(token ? { Authorization:`Bearer ${token}` } : {}) },
        body: JSON.stringify({ taskRowId: rowId, taskId }),
      })
    } catch { /* optimistic stays */ }
    setCompleting(null)
  }, [])

  // ── Nav ────────────────────────────────────────────────────────────────────
  const handleNav = useCallback((tab) => {
    if (tab === 'home')  router.push('/dashboard')
    if (tab === 'stats') router.push('/stats')
  }, [router])

  // ── Derived ────────────────────────────────────────────────────────────────
  const lvl            = useMemo(() => getLevelProgress(progress.xp), [progress.xp])
  const totalNodes     = allNodes.length
  const completedNodes = allNodes.filter(n => n.status === 'done').length
  const activeSheetWorld = useMemo(() => {
    if (!activeNode) return WORLDS[0]
    const gi = worldGroups.findIndex(g => g.nodes.some(n => n.id === activeNode.id))
    return gi >= 0 ? worldGroups[gi].world : WORLDS[0]
  }, [activeNode, worldGroups])

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{CSS}</style>

      <div style={{ minHeight:'100vh', background:T.bg, fontFamily:T.font, paddingBottom:80 }}>

        {/* ── Sticky top bar ──────────────────────────────────────────── */}
        <div style={{
          position:'sticky', top:0, zIndex:200,
          background:'rgba(8,8,16,0.92)',
          borderBottom:'1px solid rgba(255,255,255,0.08)',
          backdropFilter:'blur(28px)', WebkitBackdropFilter:'blur(28px)',
        }}>
          <div style={{ maxWidth:700, margin:'0 auto', padding:'12px 18px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:9 }}>
              {/* Level badge */}
              <div style={{
                width:36, height:36, borderRadius:'50%', flexShrink:0,
                background:'linear-gradient(135deg,#C084FC,#818CF8)',
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
                      background:'linear-gradient(90deg,#C084FC,#818CF8)', borderRadius:9999,
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
                }}>🔥 {progress.streak}</div>
              )}
            </div>

            {/* Overall path progress bar */}
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ flex:1, height:6, background:'rgba(255,255,255,0.06)', borderRadius:9999, overflow:'hidden' }}>
                <div style={{
                  height:'100%',
                  width: totalNodes > 0 ? `${Math.round(completedNodes / totalNodes * 100)}%` : '0%',
                  background:'linear-gradient(90deg,#22D3A5,#60A5FA,#C084FC)',
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
                color: projects ? '#C084FC' : T.textMuted,
                fontSize:10, fontWeight:800, cursor:'pointer', flexShrink:0,
                display:'flex', alignItems:'center', gap:4,
              }}>
                🏗 {projects ? 'Projects ON' : 'Add Projects'}
              </button>
            </div>
          </div>
        </div>

        {/* ── Loading ──────────────────────────────────────────────────── */}
        {loading && (
          <div style={{ maxWidth:500, margin:'32px auto', padding:'0 20px', display:'flex', flexDirection:'column', gap:18 }}>
            {[0,1,2,3].map(i => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:16 }}>
                <div style={{ width:64,height:64,borderRadius:'50%',background:'rgba(255,255,255,0.04)',flexShrink:0,
                  animation:'pulseNode 1.5s ease-in-out infinite', '--glow':'transparent' }}/>
                <div style={{ flex:1 }}>
                  <div style={{ height:12,background:'rgba(255,255,255,0.04)',borderRadius:6,marginBottom:6,width:'65%'}}/>
                  <div style={{ height:9, background:'rgba(255,255,255,0.03)',borderRadius:6,width:'40%'}}/>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Error ────────────────────────────────────────────────────── */}
        {!loading && error && (
          <div style={{ textAlign:'center', padding:40, color:'#F87171', fontSize:14 }}>{error}</div>
        )}

        {/* ── Empty state ───────────────────────────────────────────────── */}
        {!loading && !error && allNodes.length === 0 && (
          <div style={{ textAlign:'center', padding:'60px 24px' }}>
            <div style={{ fontSize:48, marginBottom:16 }}>🗺</div>
            <div style={{ fontSize:18, fontWeight:800, color:T.text, marginBottom:8 }}>Your map is empty</div>
            <div style={{ fontSize:14, color:T.textMuted, marginBottom:24, lineHeight:1.6 }}>
              Complete onboarding to generate your learning path
            </div>
            <button onClick={() => router.push('/onboarding')} style={{
              padding:'14px 32px',
              background:'linear-gradient(135deg,#22D3A5,#60A5FA)',
              border:'none', borderRadius:14, color:'#080810',
              fontSize:15, fontWeight:900, cursor:'pointer', fontFamily:T.font,
              boxShadow:'0 0 32px rgba(34,211,165,0.40)',
            }}>Get Started →</button>
          </div>
        )}

        {/* ── Map ────────────────────────────────────────────────────────── */}
        {!loading && !error && allNodes.length > 0 && (
          <div style={{ position:'relative', height:totalMapHeight, overflow:'hidden' }}>

            {/* World backgrounds */}
            {layoutItems.filter(i => i.type === 'banner').map((item, idx) => (
              <div key={idx} style={{
                position:'absolute', left:0, right:0, top:item.y,
                height: (() => {
                  // Background stripe covers from banner top to start of next banner
                  const nextBanner = layoutItems.filter(i => i.type === 'banner')[idx + 1]
                  return nextBanner ? nextBanner.y - item.y : totalMapHeight - item.y
                })(),
                background: item.world.bg,
                zIndex:0,
              }}/>
            ))}

            {/* World banners */}
            {layoutItems.filter(i => i.type === 'banner').map((item, idx) => {
              const doneCount = item.nodes.filter(n => n.status === 'done').length
              return (
                <WorldBanner
                  key={idx}
                  world={item.world}
                  worldIdx={item.worldIdx}
                  doneCount={doneCount}
                  totalCount={item.nodes.length}
                  height={item.height}
                />
              )
            })}

            {/* SVG connector path */}
            <PathSVG
              nodeItems={nodeItems.map(i => ({ ...i, status:i.node.status, world:i.world }))}
              totalHeight={totalMapHeight}
            />

            {/* Nodes */}
            {nodeItems.map((item, idx) => {
              const n    = item.node
              const xPct = (item.x / COORD_W) * 100
              return (
                <div key={n.id} style={{
                  position:'absolute',
                  left:`${xPct}%`,
                  top:item.y,
                  transform:'translate(-50%,-50%)',
                  zIndex:10,
                  animation:`fadeUp 0.35s ease ${Math.min(idx * 0.03, 0.5)}s both`,
                }}>
                  <MapNode
                    node={n}
                    world={item.world}
                    isActive={n.status === 'active'}
                    onTap={setActiveNode}
                  />
                </div>
              )
            })}

            {/* Side info cards (concept names + XP) */}
            {nodeItems.map((item) => {
              const n        = item.node
              const xPct     = (item.x / COORD_W) * 100
              const isOnLeft = item.x < COORD_W / 2
              // Place label on the opposite side of the node
              const labelStyle = isOnLeft
                ? { left:`${xPct + 10}%`, transform:'translateY(-50%)' }
                : { right:`${100 - xPct + 10}%`, transform:'translateY(-50%)' }
              return (
                <div key={`side-${n.id}`} style={{
                  position:'absolute', top:item.y,
                  ...labelStyle,
                  zIndex:5, pointerEvents:'none',
                }}>
                  <SideInfo node={n} world={item.world} onRight={isOnLeft}/>
                </div>
              )
            })}

            {/* End-of-map teaser */}
            <div style={{
              position:'absolute', bottom:20, left:'50%', transform:'translateX(-50%)',
              padding:'12px 22px',
              background:'rgba(255,255,255,0.02)',
              border:'1px dashed rgba(255,255,255,0.10)',
              borderRadius:16, textAlign:'center', zIndex:5, whiteSpace:'nowrap',
            }}>
              <span style={{ fontSize:13, fontWeight:700, color:T.textMuted }}>
                ✦ Complete missions to unlock more
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
    </>
  )
}
