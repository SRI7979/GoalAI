// Dashboard — Daily Mission Hub
'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import LessonViewer from '@/components/LessonView'
import MissionComplete from '@/components/MissionComplete'
import { getLevelProgress, xpForTask, missionXpReward, computeTotalXpFromRows } from '@/lib/xp'

// ─── Design tokens ─────────────────────────────────────────────────────────────
const T = {
  bg:           '#06060f',
  surface:      'rgba(255,255,255,0.04)',
  border:       'rgba(255,255,255,0.08)',
  borderAlt:    'rgba(255,255,255,0.05)',
  teal:         '#0ef5c2',
  tealDim:      'rgba(14,245,194,0.10)',
  tealBorder:   'rgba(14,245,194,0.22)',
  blue:         '#00d4ff',
  flame:        '#FF6B35',
  flameDim:     'rgba(255,107,53,0.08)',
  flameBorder:  'rgba(255,107,53,0.22)',
  amber:        '#FBBF24',
  mastery:      '#818CF8',
  masteryDim:   'rgba(129,140,248,0.10)',
  masteryBorder:'rgba(129,140,248,0.22)',
  text:         '#F1F5F9',
  textSec:      '#94A3B8',
  textMuted:    '#475569',
  textDead:     '#334155',
  red:          '#FF453A',
  font:         "'Plus Jakarta Sans','DM Sans',system-ui,sans-serif",
}

// ─── Keyframes ─────────────────────────────────────────────────────────────────
const KEYFRAMES = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  ::-webkit-scrollbar{display:none}
  @keyframes spin      {to{transform:rotate(360deg)}}
  @keyframes fadeUp    {from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
  @keyframes xpRise    {0%{opacity:1;transform:translateX(-50%) translateY(0) scale(1)}
                        70%{opacity:1;transform:translateX(-50%) translateY(-52px) scale(1.20)}
                        100%{opacity:0;transform:translateX(-50%) translateY(-72px) scale(0.85)}}
  @keyframes checkPop  {0%{transform:scale(0.5)}70%{transform:scale(1.18)}100%{transform:scale(1)}}
  @keyframes pulseFlame{0%,100%{text-shadow:0 0 12px rgba(255,107,53,0.40)}
                        50%{text-shadow:0 0 28px rgba(255,107,53,0.75)}}
  @keyframes pulseActive{0%,100%{box-shadow:0 0 0 0 rgba(14,245,194,0.20)}
                         50%{box-shadow:0 0 0 10px rgba(14,245,194,0.00)}}
  @keyframes xpBarGlow {0%,100%{box-shadow:0 0 8px rgba(14,245,194,0.30)}
                        50%{box-shadow:0 0 20px rgba(14,245,194,0.60)}}
  @keyframes levelPop  {0%{transform:translateX(-50%) scale(0.7);opacity:0}
                        65%{transform:translateX(-50%) scale(1.06)}
                        100%{transform:translateX(-50%) scale(1);opacity:1}}
  @media (prefers-reduced-motion:reduce){
    @keyframes fadeUp    {from{opacity:0}to{opacity:1}}
    @keyframes xpRise    {to{opacity:0}}
    @keyframes checkPop  {to{}}
    @keyframes pulseFlame{to{}}
    @keyframes pulseActive{to{}}
    @keyframes xpBarGlow {to{}}
    @keyframes levelPop  {from{opacity:0}to{opacity:1}}
  }
`

// ─── Task type config ──────────────────────────────────────────────────────────
const TASK_STYLE = {
  lesson:   {color:'#0ef5c2',bg:'rgba(14,245,194,0.10)',  border:'rgba(14,245,194,0.22)',  label:'LESSON'  },
  video:    {color:'#FBBF24',bg:'rgba(251,191,36,0.10)',  border:'rgba(251,191,36,0.22)',  label:'VIDEO'   },
  practice: {color:'#00d4ff',bg:'rgba(0,212,255,0.10)',   border:'rgba(0,212,255,0.22)',   label:'PRACTICE'},
  exercise: {color:'#818CF8',bg:'rgba(129,140,248,0.10)', border:'rgba(129,140,248,0.22)', label:'EXERCISE'},
  quiz:     {color:'#FF453A',bg:'rgba(255,69,58,0.10)',   border:'rgba(255,69,58,0.22)',   label:'QUIZ'    },
  review:   {color:'#FF6B35',bg:'rgba(255,107,53,0.10)',  border:'rgba(255,107,53,0.22)',  label:'REVIEW'  },
}
const taskStyle = (type) => TASK_STYLE[type] || TASK_STYLE.lesson

// ─── Energy options ────────────────────────────────────────────────────────────
const ENERGY_OPTIONS = [
  {key:'energized', icon:'⚡', label:'Energized'},
  {key:'good',      icon:'✓',  label:'Good'     },
  {key:'okay',      icon:'~',  label:'Okay'     },
  {key:'tired',     icon:'○',  label:'Tired'    },
  {key:'drained',   icon:'–',  label:'Drained'  },
]
function getVisibleTaskCount(tasks, energy) {
  const n = tasks?.length || 0
  if (energy === 'energized' || energy === 'good') return n
  if (energy === 'okay')    return Math.max(2, Math.ceil(n * 0.75))
  if (energy === 'tired')   return Math.max(1, Math.ceil(n * 0.50))
  if (energy === 'drained') return Math.max(1, Math.min(2, n))
  return n
}

// ─── SVG icons ─────────────────────────────────────────────────────────────────
const BoltIcon     = ({sz=13}) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
const ArrowRight   = ({sz=14}) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
const ClockIcon    = ({sz=12}) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
const PlayIcon     = ({sz=13}) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
const HomeIcon     = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
const PathIcon     = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
const StatsIcon    = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
const SettingsIcon = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>

// ─── XP toast ──────────────────────────────────────────────────────────────────
function XPToast({ id, amount, x, y, onDone }) {
  useEffect(() => { const t = setTimeout(() => onDone(id), 1400); return () => clearTimeout(t) }, [id, onDone])
  return (
    <div style={{
      position:'fixed', left:x, top:y, zIndex:9999,
      fontSize:15, fontWeight:900, color:'#FBBF24',
      fontFamily:T.font, pointerEvents:'none',
      animation:'xpRise 1.4s ease-out forwards',
      textShadow:'0 0 16px rgba(251,191,36,0.70)',
      whiteSpace:'nowrap', userSelect:'none',
    }}>+{amount} XP</div>
  )
}

// ─── Level-up banner ───────────────────────────────────────────────────────────
function LevelUpBanner({ data, onDismiss }) {
  useEffect(() => { const t = setTimeout(onDismiss, 4500); return () => clearTimeout(t) }, [onDismiss])
  if (!data) return null
  return (
    <div onClick={onDismiss} style={{
      position:'fixed', top:72, left:'50%', zIndex:9990,
      background:'linear-gradient(135deg,rgba(129,140,248,0.22),rgba(99,102,241,0.14))',
      border:'1px solid rgba(129,140,248,0.40)', borderRadius:14,
      padding:'12px 20px', display:'flex', alignItems:'center', gap:12,
      boxShadow:'0 8px 32px rgba(129,140,248,0.28)',
      backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)',
      animation:'levelPop 0.50s cubic-bezier(0.34,1.3,0.64,1)',
      cursor:'pointer', userSelect:'none', whiteSpace:'nowrap',
    }}>
      <div style={{
        width:34, height:34, borderRadius:'50%',
        background:'linear-gradient(135deg,#818CF8,#6366F1)',
        display:'flex', alignItems:'center', justifyContent:'center',
        fontWeight:900, fontSize:15, color:'#fff',
      }}>{data.toLevel}</div>
      <div>
        <div style={{fontSize:13,fontWeight:800,color:'#818CF8'}}>Level up — {data.title}</div>
        <div style={{fontSize:11,color:T.textMuted}}>Level {data.fromLevel} → {data.toLevel}</div>
      </div>
    </div>
  )
}

// ─── XP Level Bar ──────────────────────────────────────────────────────────────
function XPLevelBar({ level, title, xpInLevel, xpForLevel, pct, animating }) {
  return (
    <div style={{maxWidth:600,margin:'0 auto',padding:'12px 20px 0'}}>
      <div style={{
        background:T.surface, border:`1px solid ${T.border}`, borderRadius:14,
        padding:'10px 14px', backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)',
      }}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:7}}>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <div style={{
              width:28, height:28, borderRadius:'50%',
              background:'linear-gradient(135deg,#818CF8,#6366F1)',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontWeight:900, fontSize:13, color:'#fff', flexShrink:0,
              boxShadow:'0 0 14px rgba(129,140,248,0.35)',
            }}>{level}</div>
            <span style={{fontSize:13,fontWeight:700,color:T.text}}>Level {level}</span>
            <span style={{fontSize:11,color:T.textMuted}}>· {title}</span>
          </div>
          <span style={{fontSize:11,color:T.textMuted,fontWeight:600}}>
            {xpInLevel} / {xpForLevel} XP
          </span>
        </div>
        <div style={{height:5,background:'rgba(255,255,255,0.06)',borderRadius:9999,overflow:'hidden'}}>
          <div style={{
            height:'100%', width:`${Math.round(pct*100)}%`,
            background:'linear-gradient(90deg,#0ef5c2,#00d4ff)', borderRadius:9999,
            transition: animating ? 'width 0.55s cubic-bezier(0.16,1,0.3,1)' : 'none',
            boxShadow: animating ? '0 0 12px rgba(14,245,194,0.55)' : '0 0 6px rgba(14,245,194,0.25)',
            animation: animating ? 'xpBarGlow 1.2s ease' : 'none',
          }}/>
        </div>
      </div>
    </div>
  )
}

// ─── Mission Hero Card ─────────────────────────────────────────────────────────
function MissionHeroCard({ todayRow, tasks, dayNumber }) {
  if (!todayRow) return null
  const total     = tasks.length
  const completed = tasks.filter(t => t.completed).length
  const pct       = total > 0 ? completed / total : 0
  const allDone   = completed === total && total > 0
  const reward    = missionXpReward(tasks)
  const totalMin  = tasks.reduce((s,t) => s + (Number(t.durationMin)||0), 0)
  const concept   = todayRow.covered_topics?.[0] || `Day ${dayNumber}`

  return (
    <div style={{maxWidth:600,margin:'0 auto',padding:'12px 20px 0'}}>
      <div style={{
        background: allDone
          ? 'linear-gradient(145deg,rgba(14,245,194,0.10) 0%,rgba(0,212,255,0.06) 100%)'
          : 'linear-gradient(145deg,rgba(255,255,255,0.06) 0%,rgba(255,255,255,0.02) 100%)',
        border:`1px solid ${allDone ? T.tealBorder : T.border}`,
        borderRadius:22, padding:'20px',
        backdropFilter:'blur(24px)', WebkitBackdropFilter:'blur(24px)',
        boxShadow: allDone
          ? 'inset 0 1px 0 rgba(14,245,194,0.22),0 0 40px rgba(14,245,194,0.08)'
          : 'inset 0 1px 0 rgba(255,255,255,0.08),0 8px 32px rgba(0,0,0,0.20)',
      }}>
        {/* Label */}
        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
          <span style={{fontSize:10,fontWeight:800,letterSpacing:'1.8px',
            color:allDone?T.teal:T.textMuted,textTransform:'uppercase'}}>
            Day {dayNumber} Mission
          </span>
          {allDone && (
            <span style={{fontSize:10,fontWeight:700,color:'#06060f',
              background:T.teal,padding:'2px 8px',borderRadius:9999}}>Complete</span>
          )}
        </div>

        {/* Title */}
        <h1 style={{fontSize:22,fontWeight:800,color:T.text,
          letterSpacing:'-0.5px',lineHeight:1.2,marginBottom:12}}>
          {concept}
        </h1>

        {/* Meta */}
        <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:14,flexWrap:'wrap'}}>
          {totalMin > 0 && (
            <span style={{display:'flex',alignItems:'center',gap:4,
              fontSize:12,color:T.textMuted,fontWeight:600}}>
              <ClockIcon />~{totalMin} min
            </span>
          )}
          <span style={{display:'flex',alignItems:'center',gap:4,
            fontSize:12,color:'#FBBF24',fontWeight:700}}>
            <BoltIcon />+{reward} XP
          </span>
          <span style={{fontSize:12,color:T.textMuted,fontWeight:600}}>
            {total} tasks
          </span>
        </div>

        {/* Progress bar */}
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <div style={{flex:1,height:6,background:'rgba(255,255,255,0.06)',
            borderRadius:9999,overflow:'hidden'}}>
            <div style={{
              height:'100%', width:`${Math.round(pct*100)}%`,
              background:'linear-gradient(90deg,#0ef5c2,#00d4ff)', borderRadius:9999,
              transition:'width 0.50s cubic-bezier(0.16,1,0.3,1)',
              boxShadow: pct>0 ? '0 0 10px rgba(14,245,194,0.45)' : 'none',
            }}/>
          </div>
          <span style={{fontSize:12,fontWeight:700,color:allDone?T.teal:T.textSec,flexShrink:0}}>
            {completed}/{total}
          </span>
        </div>
      </div>
    </div>
  )
}

// ─── Energy Selector ───────────────────────────────────────────────────────────
function EnergySelector({ value, onChange }) {
  return (
    <div style={{maxWidth:600,margin:'0 auto',padding:'14px 20px 0'}}>
      <div style={{fontSize:11,fontWeight:700,color:T.textMuted,
        textTransform:'uppercase',letterSpacing:'1.2px',marginBottom:8}}>
        Energy today
      </div>
      <div style={{display:'flex',gap:6,overflowX:'auto',paddingBottom:2}}>
        {ENERGY_OPTIONS.map(opt => {
          const active = value === opt.key
          return (
            <button key={opt.key} onClick={() => onChange(opt.key)} style={{
              flexShrink:0, padding:'7px 14px',
              background: active
                ? 'linear-gradient(135deg,rgba(14,245,194,0.16),rgba(0,212,255,0.10))'
                : T.surface,
              border:`1px solid ${active ? T.tealBorder : T.border}`,
              borderRadius:10, color:active?T.teal:T.textSec,
              fontSize:13, fontWeight:active?700:500,
              cursor:'pointer', fontFamily:T.font,
              display:'flex', alignItems:'center', gap:5,
              transition:'all 0.18s cubic-bezier(0.16,1,0.3,1)',
              boxShadow:active?'inset 0 1px 0 rgba(14,245,194,0.20)':'none',
              whiteSpace:'nowrap',
            }}>
              <span style={{fontSize:14}}>{opt.icon}</span>{opt.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Task Item (with optimistic completion) ────────────────────────────────────
function TaskItem({ task, isCompleting, onComplete, onOpenLesson, index }) {
  const ts      = taskStyle(task.type)
  const xp      = xpForTask(task.type)
  const isLesson= task.type === 'lesson'
  const me      = isCompleting === task.id

  return (
    <div style={{
      background: task.completed ? 'rgba(14,245,194,0.03)' : T.surface,
      border:`1px solid ${task.completed?'rgba(14,245,194,0.14)':T.border}`,
      borderRadius:18, padding:'14px 16px',
      backdropFilter:'blur(16px)', WebkitBackdropFilter:'blur(16px)',
      boxShadow: task.completed
        ? 'inset 0 1px 0 rgba(14,245,194,0.10)'
        : 'inset 0 1px 0 rgba(255,255,255,0.06)',
      transition:'all 0.22s cubic-bezier(0.16,1,0.3,1)',
      animation:`fadeUp 0.35s ${index*0.04}s both`,
      opacity: task.completed ? 0.68 : 1,
    }}>
      {/* Type badge + duration + xp status */}
      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
        <span style={{
          padding:'3px 9px', background:ts.bg, border:`1px solid ${ts.border}`,
          borderRadius:9999, fontSize:10, fontWeight:800, color:ts.color, letterSpacing:'0.8px',
        }}>{ts.label}</span>
        <span style={{fontSize:11,color:T.textMuted,fontWeight:600}}>
          {task.durationMin||0} min
        </span>
        <span style={{
          marginLeft:'auto', fontSize:11, fontWeight:700,
          color: task.completed ? T.teal : '#FBBF24',
          display:'flex', alignItems:'center', gap:3,
        }}>
          {task.completed
            ? <span style={{animation:'checkPop 0.3s cubic-bezier(0.34,1.56,0.64,1)'}}>✓ Done</span>
            : <><BoltIcon />+{xp} XP</>}
        </span>
      </div>

      {/* Title */}
      <div style={{
        fontSize:15, fontWeight:700,
        color: task.completed ? T.textMuted : T.text,
        lineHeight:1.35, marginBottom: task.description ? 6 : 0,
        textDecoration: task.completed ? 'line-through' : 'none',
        textDecorationColor: T.textDead,
      }}>
        {task.title}
      </div>

      {/* Description (hidden once done) */}
      {task.description && !task.completed && (
        <p style={{fontSize:13,color:T.textMuted,lineHeight:1.6,
          marginBottom:(task.resourceUrl||isLesson)?10:0}}>
          {task.description.length>110 ? task.description.slice(0,110)+'…' : task.description}
        </p>
      )}

      {/* Resource link */}
      {task.resourceUrl && !task.completed && (
        <a href={task.resourceUrl} target="_blank" rel="noopener noreferrer" style={{
          display:'inline-flex', alignItems:'center', gap:5,
          fontSize:12, color:'#00d4ff', fontWeight:600,
          textDecoration:'none', marginBottom:10,
        }}>
          {task.resourceTitle||'Open resource'} <ArrowRight sz={12}/>
        </a>
      )}

      {/* Action row */}
      {!task.completed && (
        <div style={{display:'flex',gap:8,marginTop:6}}>
          {isLesson && (
            <button onClick={() => onOpenLesson(task)} style={{
              flex:1, padding:'11px 12px',
              background:'rgba(14,245,194,0.06)',
              border:`1px solid ${T.tealBorder}`, borderRadius:12,
              color:T.teal, fontSize:13, fontWeight:700,
              cursor:'pointer', fontFamily:T.font,
              display:'flex', alignItems:'center', justifyContent:'center', gap:5,
              transition:'background 0.18s',
            }}
            onMouseEnter={e=>{e.currentTarget.style.background='rgba(14,245,194,0.12)'}}
            onMouseLeave={e=>{e.currentTarget.style.background='rgba(14,245,194,0.06)'}}>
              <PlayIcon/> Start Lesson
            </button>
          )}
          <button
            disabled={Boolean(me)}
            onClick={e => onComplete(task, e)}
            style={{
              flex: isLesson ? 'none' : 1,
              padding:'11px 16px',
              background: me ? 'rgba(255,255,255,0.04)' : 'linear-gradient(135deg,#0ef5c2,#00d4ff)',
              border: me ? `1px solid ${T.border}` : 'none',
              borderRadius:12, color: me ? T.textMuted : '#06060f',
              fontSize:13, fontWeight:800,
              cursor: me ? 'default' : 'pointer', fontFamily:T.font,
              boxShadow: me ? 'none' : '0 0 24px rgba(14,245,194,0.28),inset 0 1px 0 rgba(255,255,255,0.40)',
              display:'flex', alignItems:'center', justifyContent:'center', gap:6,
              transition:'all 0.20s cubic-bezier(0.16,1,0.3,1)',
              minWidth: isLesson ? 110 : undefined,
            }}
            onMouseEnter={e=>{if(!me){e.currentTarget.style.transform='translateY(-1px)';e.currentTarget.style.boxShadow='0 0 36px rgba(14,245,194,0.42),inset 0 1px 0 rgba(255,255,255,0.40)'}}}
            onMouseLeave={e=>{e.currentTarget.style.transform='translateY(0)';if(!me)e.currentTarget.style.boxShadow='0 0 24px rgba(14,245,194,0.28),inset 0 1px 0 rgba(255,255,255,0.40)'}}
          >
            {me
              ? <><div style={{width:13,height:13,border:'2px solid rgba(255,255,255,0.06)',borderTopColor:T.teal,borderRadius:'50%',animation:'spin 0.65s linear infinite'}}/>Saving…</>
              : <><BoltIcon sz={13}/>Complete</>}
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Tomorrow preview ─────────────────────────────────────────────────────────
function TomorrowPreview({ tomorrowRow }) {
  if (!tomorrowRow) return null
  const name = tomorrowRow.covered_topics?.[0] || `Day ${tomorrowRow.day_number}`
  return (
    <div style={{maxWidth:600,margin:'0 auto',padding:'10px 20px 0'}}>
      <div style={{
        background:T.surface, border:`1px solid ${T.border}`,
        borderRadius:14, padding:'12px 16px',
        display:'flex', alignItems:'center', justifyContent:'space-between',
        backdropFilter:'blur(16px)', WebkitBackdropFilter:'blur(16px)',
      }}>
        <div>
          <div style={{fontSize:10,fontWeight:700,color:T.textMuted,
            textTransform:'uppercase',letterSpacing:'1px',marginBottom:2}}>
            Tomorrow unlocks
          </div>
          <div style={{fontSize:14,fontWeight:600,color:T.textSec}}>{name}</div>
        </div>
        <ArrowRight/>
      </div>
    </div>
  )
}

// ─── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color }) {
  return (
    <div style={{
      background:T.surface, border:`1px solid ${T.border}`,
      borderRadius:16, padding:'14px',
      backdropFilter:'blur(16px)', WebkitBackdropFilter:'blur(16px)',
      boxShadow:'inset 0 1px 0 rgba(255,255,255,0.06)',
    }}>
      <div style={{fontSize:11,fontWeight:700,color:T.textMuted,
        textTransform:'uppercase',letterSpacing:'1px',marginBottom:6}}>{label}</div>
      <div style={{fontSize:22,fontWeight:900,color:color||T.text,
        letterSpacing:'-0.5px',lineHeight:1,marginBottom:sub?4:0}}>{value}</div>
      {sub && <div style={{fontSize:11,color:T.textMuted}}>{sub}</div>}
    </div>
  )
}

// ─── Skeleton loader ───────────────────────────────────────────────────────────
function Skeleton({w='100%',h=16,r=8,mb=0}) {
  return <div style={{width:w,height:h,borderRadius:r,background:'rgba(255,255,255,0.05)',marginBottom:mb}}/>
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Dashboard component
// ─────────────────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const router = useRouter()

  // Server-derived
  const [loading,     setLoading]     = useState(true)
  const [goal,        setGoal]        = useState(null)
  const [todayRow,    setTodayRow]    = useState(null)
  const [tomorrowRow, setTomorrowRow] = useState(null)
  const [allRows,     setAllRows]     = useState([])
  const [user,        setUser]        = useState(null)

  // Optimistic task state
  const [tasks,       setTasks]       = useState([])
  const [completing,  setCompleting]  = useState(null)

  // Gamification
  const [xpDisplay,   setXpDisplay]   = useState(getLevelProgress(0))
  const [xpAnimating, setXpAnimating] = useState(false)
  const [streakData,  setStreakData]  = useState({ current: 0, longest: 0 })
  const [xpToasts,    setXpToasts]   = useState([])
  const [levelUpData, setLevelUpData] = useState(null)
  const [missionDone, setMissionDone] = useState(false)
  const [mcData,      setMcData]     = useState(null)

  // UI
  const [energy,      setEnergy]      = useState('good')
  const [activeTab,   setActiveTab]   = useState('home')
  const [showLesson,  setShowLesson]  = useState(null)
  const [error,       setError]       = useState('')

  // ─── Load ──────────────────────────────────────────────────────────────────
  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    setError('')

    const { data: authData } = await supabase.auth.getUser()
    const me = authData?.user
    if (!me) { router.push('/login'); return }
    setUser(me)

    const { data: activeGoal, error: ge } = await supabase
      .from('goals').select('*').eq('user_id', me.id).eq('status', 'active')
      .order('created_at', { ascending: false }).limit(1).maybeSingle()
    if (ge) { setError(ge.message); setLoading(false); return }
    if (!activeGoal) { setLoading(false); return }
    setGoal(activeGoal)

    const { data: rows, error: re } = await supabase
      .from('daily_tasks').select('*')
      .eq('goal_id', activeGoal.id).eq('user_id', me.id)
      .order('day_number', { ascending: true })
    if (re) { setError(re.message); setLoading(false); return }

    const taskRows = rows || []
    setAllRows(taskRows)

    const today = taskRows.find(r => r.completion_status !== 'completed') || taskRows[taskRows.length-1]
    setTodayRow(today || null)
    if (today) {
      const dayTasks = Array.isArray(today.tasks) ? today.tasks : []
      setTasks(dayTasks)
      setMissionDone(today.completion_status === 'completed')
    }

    const todayIdx   = taskRows.findIndex(r => r.id === today?.id)
    const tomorrowR  = todayIdx >= 0 ? taskRows[todayIdx+1] || null : null
    setTomorrowRow(tomorrowR)

    const { data: prog } = await supabase
      .from('user_progress').select('total_xp,current_streak,longest_streak')
      .eq('goal_id', activeGoal.id).eq('user_id', me.id).maybeSingle()

    const storedXp   = Number(prog?.total_xp) || 0
    const computedXp = computeTotalXpFromRows(taskRows)
    setXpDisplay(getLevelProgress(storedXp > 0 ? storedXp : computedXp))
    setStreakData({ current: prog?.current_streak || 0, longest: prog?.longest_streak || 0 })

    setLoading(false)
  }, [router])

  useEffect(() => { load() }, [load])

  // Sync tasks array when todayRow changes
  useEffect(() => {
    if (todayRow) setTasks(Array.isArray(todayRow.tasks) ? todayRow.tasks : [])
  }, [todayRow?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── XP toast helpers ───────────────────────────────────────────────────────
  const addXpToast    = useCallback((amount, x, y) => {
    const id = Date.now() + Math.random()
    setXpToasts(prev => [...prev, { id, amount, x, y }])
  }, [])
  const removeXpToast = useCallback((id) => {
    setXpToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  // ─── Optimistic task completion ─────────────────────────────────────────────
  const completeTask = useCallback(async (task, event) => {
    if (task.completed || completing) return

    const prevTasks = tasks
    const xpAmount  = xpForTask(task.type)

    // 1. Immediate optimistic update
    const nextTasks = tasks.map(t => t.id === task.id ? { ...t, completed: true } : t)
    setTasks(nextTasks)
    setCompleting(task.id)

    // 2. XP toast at tap position
    if (event) {
      const rect = event.currentTarget.getBoundingClientRect()
      addXpToast(xpAmount, rect.left + rect.width/2, rect.top)
    }

    // 3. Optimistic XP bar
    const prevXp = xpDisplay.totalXp
    setXpDisplay(getLevelProgress(prevXp + xpAmount))
    setXpAnimating(true)
    setTimeout(() => setXpAnimating(false), 800)

    // 4. API call (async, non-blocking)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token || null

      const res = await fetch('/api/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ taskRowId: todayRow.id, taskId: task.id, accessToken: token }),
      })

      if (!res.ok) {
        setTasks(prevTasks)
        setXpDisplay(getLevelProgress(prevXp))
        setError('Could not save. Try again.')
        setCompleting(null)
        return
      }

      const data = await res.json()

      // Apply server corrections
      if (data.newTotalXp != null) setXpDisplay(getLevelProgress(data.newTotalXp))
      if (data.levelUp)             setLevelUpData(data.levelUp)
      if (data.streakState?.current != null) {
        setStreakData(prev => ({
          current: data.streakState.current,
          longest: Math.max(prev.longest, data.streakState.longest || 0),
        }))
      }
      if (data.streakBonusXp > 0) {
        addXpToast(data.streakBonusXp, event?.clientX || window.innerWidth/2, 120)
      }

      // Mission complete overlay
      const allDone = nextTasks.every(t => t.completed)
      if (data.missionComplete || allDone) {
        setMissionDone(true)
        setMcData({
          conceptName:    todayRow.covered_topics?.[0] || `Day ${todayRow.day_number}`,
          dayNumber:      todayRow.day_number,
          xpEarned:       data.xpEarned ?? (xpAmount + (data.missionBonusXp||0) + (data.streakBonusXp||0)),
          taskXp:         data.taskXp       ?? xpAmount,
          missionBonusXp: data.missionBonusXp ?? 0,
          streakBonusXp:  data.streakBonusXp  ?? 0,
          newStreak:      data.streakState?.current ?? streakData.current,
          levelUp:        data.levelUp ?? null,
          tomorrowConcept: tomorrowRow?.covered_topics?.[0] || null,
        })
      }

      setTimeout(() => load(true), 1200)
    } catch {
      setTasks(prevTasks)
      setXpDisplay(getLevelProgress(prevXp))
      setError('Network error. Check your connection.')
    } finally {
      setCompleting(null)
    }
  }, [tasks, completing, xpDisplay, todayRow, tomorrowRow, streakData, addXpToast, load])

  // ─── Lesson complete ────────────────────────────────────────────────────────
  const handleLessonComplete = useCallback((task) => {
    setShowLesson(null)
    if (task && !task.completed) completeTask(task, null)
  }, [completeTask])

  // ─── Computed ───────────────────────────────────────────────────────────────
  const visibleTasks = useMemo(() => {
    const n = getVisibleTaskCount(tasks, energy)
    return tasks.slice(0, n)
  }, [tasks, energy])
  const hiddenCount = tasks.length - visibleTasks.length

  const doneRows   = allRows.filter(r => r.completion_status === 'completed').length
  const totalRows  = allRows.length
  const totalMins  = allRows.reduce((acc,r) => {
    const t = Array.isArray(r.tasks)?r.tasks:[]
    return acc + t.filter(tk=>tk.completed).reduce((s,tk)=>s+(Number(tk.durationMin)||0),0)
  }, 0)
  const weekDays   = allRows.slice(-7).filter(r=>r.completion_status==='completed').length
  const dayNumber  = todayRow?.day_number || 1

  // ─── Loading state ─────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{minHeight:'100vh',fontFamily:T.font,padding:'0 20px'}}>
      <style>{KEYFRAMES}</style>
      <div style={{height:64,display:'flex',alignItems:'center',gap:12,
        borderBottom:`1px solid ${T.border}`,marginBottom:16}}>
        <Skeleton w={160} h={14} r={6}/><div style={{marginLeft:'auto',display:'flex',gap:8}}>
        <Skeleton w={48} h={28} r={9999}/><Skeleton w={64} h={28} r={9999}/></div>
      </div>
      <Skeleton h={64} r={14} mb={12}/>
      <Skeleton h={130} r={22} mb={12}/>
      <Skeleton h={52} r={10} mb={12}/>
      {[0,1,2].map(i => <Skeleton key={i} h={110} r={18} mb={10}/>)}
    </div>
  )

  // ─── No goal state ─────────────────────────────────────────────────────────
  if (!goal) return (
    <div style={{minHeight:'100vh',display:'grid',placeItems:'center',
      fontFamily:T.font,padding:24}}>
      <style>{KEYFRAMES}</style>
      <div style={{textAlign:'center'}}>
        <div style={{fontSize:40,marginBottom:16}}>🎯</div>
        <p style={{color:T.textSec,marginBottom:20,fontSize:15}}>No active goal yet.</p>
        <button onClick={() => router.push('/onboarding')} style={{
          padding:'14px 32px', background:'linear-gradient(135deg,#0ef5c2,#00d4ff)',
          border:'none', borderRadius:14, color:'#06060f',
          fontWeight:800, fontSize:15, cursor:'pointer', fontFamily:T.font,
          boxShadow:'0 0 32px rgba(14,245,194,0.28)',
        }}>Set a Goal</button>
      </div>
    </div>
  )

  // ─── Main render ───────────────────────────────────────────────────────────
  return (
    <>
      <style>{KEYFRAMES}</style>

      {/* XP toasts */}
      {xpToasts.map(t => <XPToast key={t.id} {...t} onDone={removeXpToast}/>)}

      {/* Level-up banner */}
      {levelUpData && <LevelUpBanner data={levelUpData} onDismiss={() => setLevelUpData(null)}/>}

      {/* Mission complete overlay */}
      <MissionComplete
        isVisible={Boolean(missionDone && mcData)}
        data={mcData}
        onDismiss={() => { setMissionDone(false); setMcData(null) }}
      />

      {/* Lesson viewer */}
      {showLesson && (
        <LessonViewer
          task={showLesson} goal={goal}
          onClose={() => setShowLesson(null)}
          onComplete={() => handleLessonComplete(showLesson)}
        />
      )}

      <div style={{minHeight:'100vh',fontFamily:T.font,paddingBottom:90}}>

        {/* ── Sticky top bar ── */}
        <div style={{
          position:'sticky',top:0,zIndex:60,
          background:'rgba(6,6,15,0.92)',
          backdropFilter:'blur(28px) saturate(200%)',
          WebkitBackdropFilter:'blur(28px) saturate(200%)',
          borderBottom:`1px solid ${T.border}`,
        }}>
          <div style={{maxWidth:600,margin:'0 auto',height:60,
            display:'flex',alignItems:'center',gap:12,padding:'0 20px'}}>
            {/* Goal */}
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:14,fontWeight:700,color:T.text,
                whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
                {goal.goal_text}
              </div>
              {totalRows > 0 && (
                <div style={{display:'flex',alignItems:'center',gap:6,marginTop:2}}>
                  <div style={{width:80,height:3,background:'rgba(255,255,255,0.06)',
                    borderRadius:9999,overflow:'hidden'}}>
                    <div style={{height:'100%',
                      width:`${totalRows>0?(doneRows/totalRows)*100:0}%`,
                      background:'linear-gradient(90deg,#0ef5c2,#00d4ff)',
                      borderRadius:9999,transition:'width 0.5s'}}/>
                  </div>
                  <span style={{fontSize:10,color:T.textMuted,fontWeight:600}}>
                    {doneRows}/{totalRows}d
                  </span>
                </div>
              )}
            </div>

            {/* Streak */}
            {streakData.current > 0 && (
              <div style={{display:'flex',alignItems:'center',gap:4,
                padding:'5px 10px',background:T.flameDim,
                border:`1px solid ${T.flameBorder}`,borderRadius:9999}}>
                <span style={{fontSize:14,animation:'pulseFlame 2.5s ease-in-out infinite'}}>🔥</span>
                <span style={{fontSize:13,fontWeight:800,color:T.flame}}>{streakData.current}</span>
              </div>
            )}

            {/* Level */}
            <div style={{display:'flex',alignItems:'center',gap:6,
              padding:'5px 10px',background:T.masteryDim,
              border:`1px solid ${T.masteryBorder}`,borderRadius:9999}}>
              <div style={{
                width:20,height:20,borderRadius:'50%',
                background:'linear-gradient(135deg,#818CF8,#6366F1)',
                display:'flex',alignItems:'center',justifyContent:'center',
                fontWeight:900,fontSize:10,color:'#fff',
              }}>{xpDisplay.level}</div>
              <span style={{fontSize:12,fontWeight:700,color:T.mastery}}>
                {xpDisplay.title}
              </span>
            </div>
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div style={{maxWidth:600,margin:'8px auto 0',padding:'0 20px'}}>
            <div style={{
              background:'rgba(255,69,58,0.10)',border:'1px solid rgba(255,69,58,0.24)',
              borderRadius:12,padding:'10px 14px',
              display:'flex',alignItems:'center',justifyContent:'space-between',gap:10,
            }}>
              <span style={{fontSize:13,color:T.red}}>{error}</span>
              <button onClick={() => setError('')}
                style={{background:'none',border:'none',color:T.red,cursor:'pointer',fontSize:16}}>×</button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════ */}
        {/* HOME TAB                                                       */}
        {/* ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'home' && (
          <>
            <XPLevelBar {...xpDisplay} animating={xpAnimating}/>
            <MissionHeroCard todayRow={todayRow} tasks={tasks} dayNumber={dayNumber}/>
            <EnergySelector value={energy} onChange={setEnergy}/>

            {/* Task list */}
            <div style={{maxWidth:600,margin:'0 auto',padding:'14px 20px 0',display:'grid',gap:10}}>
              {todayRow ? visibleTasks.length > 0 ? (
                visibleTasks.map((task, i) => (
                  <TaskItem key={task.id} task={task} isCompleting={completing}
                    onComplete={completeTask} onOpenLesson={setShowLesson} index={i}/>
                ))
              ) : (
                <div style={{textAlign:'center',padding:'40px 0',color:T.textMuted,fontSize:14}}>
                  {tasks.every(t=>t.completed)
                    ? 'All tasks complete. Great work today. 🎯'
                    : 'No tasks available.'}
                </div>
              ) : (
                <div style={{textAlign:'center',padding:'40px 0',color:T.textMuted,fontSize:14}}>
                  Your plan is being generated...
                </div>
              )}

              {hiddenCount > 0 && (
                <p style={{textAlign:'center',fontSize:12,color:T.textMuted,padding:'4px 0'}}>
                  {hiddenCount} more task{hiddenCount>1?'s':''} available when you have more energy
                </p>
              )}
            </div>

            {/* Tomorrow preview */}
            {!missionDone && <TomorrowPreview tomorrowRow={tomorrowRow}/>}

            {/* Comeback note */}
            {streakData.current === 0 && doneRows > 0 && (
              <div style={{maxWidth:600,margin:'12px auto 0',padding:'0 20px'}}>
                <div style={{
                  background:'rgba(255,107,53,0.06)',border:`1px solid ${T.flameBorder}`,
                  borderRadius:14,padding:'12px 16px',
                  display:'flex',alignItems:'center',gap:10,
                }}>
                  <span style={{fontSize:18}}>👋</span>
                  <div>
                    <div style={{fontSize:13,fontWeight:700,color:T.flame}}>Good to have you back</div>
                    <div style={{fontSize:12,color:T.textMuted}}>Path adjusted — you're right on track.</div>
                  </div>
                </div>
              </div>
            )}
            <div style={{height:24}}/>
          </>
        )}

        {/* ══════════════════════════════════════════════════════════════ */}
        {/* STATS TAB                                                      */}
        {/* ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'stats' && (
          <div style={{maxWidth:600,margin:'0 auto',padding:'20px 20px 0'}}>
            <h2 style={{fontSize:22,fontWeight:800,color:T.text,letterSpacing:'-0.4px',marginBottom:16}}>
              Your Progress
            </h2>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:20}}>
              <StatCard label="Total XP"       value={xpDisplay.totalXp.toLocaleString()} sub="lifetime"        color={T.amber}/>
              <StatCard label="Streak"         value={`${streakData.current}d`}             sub={streakData.current>=7?'On fire! 🔥':'Keep going'} color={T.flame}/>
              <StatCard label="Best Streak"    value={`${streakData.longest}d`}             sub="personal best"/>
              <StatCard label="Days Done"      value={doneRows}                             sub={`of ${totalRows}`} color={T.teal}/>
            </div>

            {/* Level card */}
            <div style={{
              background:T.surface,border:`1px solid ${T.border}`,
              borderRadius:18,padding:'18px',marginBottom:12,
              backdropFilter:'blur(16px)',WebkitBackdropFilter:'blur(16px)',
            }}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
                <div>
                  <div style={{fontSize:13,fontWeight:700,color:T.text}}>
                    Level {xpDisplay.level} — {xpDisplay.title}
                  </div>
                  <div style={{fontSize:11,color:T.textMuted,marginTop:2}}>
                    {xpDisplay.xpInLevel} / {xpDisplay.xpForLevel} XP to next level
                  </div>
                </div>
                <div style={{
                  width:44,height:44,borderRadius:'50%',
                  background:'linear-gradient(135deg,#818CF8,#6366F1)',
                  display:'flex',alignItems:'center',justifyContent:'center',
                  fontWeight:900,fontSize:18,color:'#fff',
                  boxShadow:'0 0 24px rgba(129,140,248,0.40)',
                }}>{xpDisplay.level}</div>
              </div>
              <div style={{height:8,background:'rgba(255,255,255,0.06)',borderRadius:9999,overflow:'hidden'}}>
                <div style={{
                  height:'100%',width:`${Math.round(xpDisplay.pct*100)}%`,
                  background:'linear-gradient(90deg,#818CF8,#6366F1)',borderRadius:9999,
                  transition:'width 0.5s',boxShadow:'0 0 10px rgba(129,140,248,0.45)',
                }}/>
              </div>
            </div>

            {/* Weekly */}
            <div style={{
              background:T.surface,border:`1px solid ${T.border}`,
              borderRadius:18,padding:'18px',marginBottom:12,
              backdropFilter:'blur(16px)',WebkitBackdropFilter:'blur(16px)',
            }}>
              <div style={{fontSize:13,fontWeight:700,color:T.text,marginBottom:12}}>This Week</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                <div>
                  <div style={{fontSize:11,color:T.textMuted,marginBottom:2}}>Days active</div>
                  <div style={{fontSize:20,fontWeight:900,color:T.teal}}>{weekDays}/7</div>
                </div>
                <div>
                  <div style={{fontSize:11,color:T.textMuted,marginBottom:2}}>Minutes studied</div>
                  <div style={{fontSize:20,fontWeight:900,color:T.text}}>{totalMins}m</div>
                </div>
              </div>
            </div>

            {weekDays >= 5 && (
              <div style={{background:'rgba(14,245,194,0.05)',border:`1px solid ${T.tealBorder}`,
                borderRadius:14,padding:'12px 16px',marginBottom:12,
                fontSize:13,color:T.teal,fontWeight:600}}>
                You're ahead of last week — outstanding consistency.
              </div>
            )}
            {weekDays < 3 && doneRows > 0 && (
              <div style={{background:T.surface,border:`1px solid ${T.border}`,
                borderRadius:14,padding:'12px 16px',marginBottom:12,
                fontSize:13,color:T.textSec,fontWeight:500}}>
                Complete today's mission to build momentum. Every session counts.
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════ */}
        {/* PATH TAB                                                       */}
        {/* ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'path' && (
          <div style={{maxWidth:600,margin:'0 auto',padding:'24px 20px 0',textAlign:'center'}}>
            <h2 style={{fontSize:22,fontWeight:800,color:T.text,marginBottom:8,letterSpacing:'-0.4px'}}>
              Learning Path
            </h2>
            <p style={{color:T.textMuted,fontSize:14,marginBottom:24}}>
              Your full map — concepts, chapters, and progress.
            </p>
            <button onClick={() => router.push('/path')} style={{
              padding:'14px 36px',background:'linear-gradient(135deg,#0ef5c2,#00d4ff)',
              border:'none',borderRadius:14,color:'#06060f',
              fontWeight:800,fontSize:15,cursor:'pointer',fontFamily:T.font,
              boxShadow:'0 0 32px rgba(14,245,194,0.30),inset 0 1px 0 rgba(255,255,255,0.40)',
              display:'inline-flex',alignItems:'center',gap:8,
            }}>
              <PathIcon/> Open Full Map
            </button>
            {allRows.length > 0 && (
              <div style={{marginTop:24,display:'grid',gap:8,textAlign:'left'}}>
                {allRows.slice(0,5).map(row => {
                  const t       = Array.isArray(row.tasks)?row.tasks:[]
                  const done    = t.filter(tk=>tk.completed).length
                  const isDone  = row.completion_status === 'completed'
                  const isAct   = !isDone && row.id === todayRow?.id
                  return (
                    <div key={row.id} style={{
                      background: isAct?'rgba(14,245,194,0.06)':isDone?'rgba(14,245,194,0.03)':T.surface,
                      border:`1px solid ${isAct?T.tealBorder:isDone?'rgba(14,245,194,0.12)':T.border}`,
                      borderRadius:14,padding:'12px 16px',
                      display:'flex',alignItems:'center',gap:12,
                    }}>
                      <div style={{
                        width:32,height:32,borderRadius:'50%',flexShrink:0,
                        background: isDone?'linear-gradient(135deg,#0ef5c2,#00d4ff)'
                          :isAct?'rgba(14,245,194,0.12)':'rgba(255,255,255,0.05)',
                        display:'flex',alignItems:'center',justifyContent:'center',
                        fontSize:12,fontWeight:800,
                        color: isDone?'#06060f':isAct?T.teal:T.textMuted,
                        animation: isAct?'pulseActive 2.5s ease-in-out infinite':'none',
                      }}>{isDone?'✓':row.day_number}</div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:13,fontWeight:700,
                          color:isDone?T.textMuted:T.text,
                          whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
                          {row.covered_topics?.[0]||`Day ${row.day_number}`}
                        </div>
                        <div style={{fontSize:11,color:T.textMuted}}>{done}/{t.length} tasks</div>
                      </div>
                      {isAct && (
                        <span style={{fontSize:10,fontWeight:700,color:'#06060f',
                          background:T.teal,padding:'2px 8px',borderRadius:9999}}>TODAY</span>
                      )}
                    </div>
                  )
                })}
                {allRows.length > 5 && (
                  <p style={{textAlign:'center',fontSize:12,color:T.textMuted}}>
                    +{allRows.length-5} more days on the full map
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════ */}
        {/* SETTINGS TAB                                                   */}
        {/* ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'settings' && (
          <div style={{maxWidth:600,margin:'0 auto',padding:'20px 20px 0'}}>
            <h2 style={{fontSize:22,fontWeight:800,color:T.text,letterSpacing:'-0.4px',marginBottom:20}}>
              Settings
            </h2>

            {/* Account card */}
            <div style={{background:T.surface,border:`1px solid ${T.border}`,
              borderRadius:18,overflow:'hidden',marginBottom:12}}>
              <div style={{padding:'14px 18px',borderBottom:`1px solid ${T.borderAlt}`,
                display:'flex',alignItems:'center',gap:12}}>
                <div style={{
                  width:40,height:40,borderRadius:'50%',
                  background:'linear-gradient(135deg,#818CF8,#6366F1)',
                  display:'flex',alignItems:'center',justifyContent:'center',
                  fontWeight:900,fontSize:16,color:'#fff',flexShrink:0,
                }}>{user?.email?.[0]?.toUpperCase()||'?'}</div>
                <div style={{minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:700,color:T.text,
                    whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
                    {user?.email||'Account'}
                  </div>
                  <div style={{fontSize:11,color:T.textMuted}}>
                    Level {xpDisplay.level} · {xpDisplay.title}
                  </div>
                </div>
              </div>
              <div style={{padding:'14px 18px'}}>
                <div style={{fontSize:11,color:T.textMuted,marginBottom:4}}>Current goal</div>
                <div style={{fontSize:14,fontWeight:600,color:T.text}}>{goal?.goal_text}</div>
              </div>
            </div>

            {/* Streak info */}
            <div style={{background:T.surface,border:`1px solid ${T.border}`,
              borderRadius:18,padding:'16px 18px',marginBottom:12}}>
              <div style={{fontSize:13,fontWeight:700,color:T.text,marginBottom:10}}>
                Streak
              </div>
              {[
                {label:'Current', sub:'Complete a mission to keep it', val:`🔥 ${streakData.current}`, color:T.flame},
                {label:'Best',    sub:'Personal record',                val:`${streakData.longest}d`,  color:T.text},
              ].map((row,i) => (
                <div key={i} style={{display:'flex',alignItems:'center',justifyContent:'space-between',
                  padding:'10px 0',borderTop:`1px solid ${T.borderAlt}`}}>
                  <div>
                    <div style={{fontSize:13,color:T.textSec,fontWeight:600}}>{row.label}</div>
                    <div style={{fontSize:11,color:T.textMuted}}>{row.sub}</div>
                  </div>
                  <span style={{fontSize:16,fontWeight:900,color:row.color}}>{row.val}</span>
                </div>
              ))}
            </div>

            {/* New goal */}
            <div style={{background:T.surface,border:`1px solid ${T.border}`,
              borderRadius:18,overflow:'hidden',marginBottom:12}}>
              <button onClick={() => router.push('/onboarding')} style={{
                width:'100%',padding:'16px 18px',background:'none',border:'none',
                cursor:'pointer',fontFamily:T.font,
                display:'flex',alignItems:'center',justifyContent:'space-between',
                color:T.textSec,fontSize:14,fontWeight:600,
              }}>
                Start a new goal <ArrowRight/>
              </button>
            </div>

            {/* Sign out */}
            <button onClick={async () => { await supabase.auth.signOut(); router.push('/login') }} style={{
              width:'100%',padding:'14px 18px',
              background:'rgba(255,69,58,0.07)',border:'1px solid rgba(255,69,58,0.18)',
              borderRadius:14,color:T.red,fontSize:14,fontWeight:700,
              cursor:'pointer',fontFamily:T.font,
            }}>
              Sign out
            </button>
          </div>
        )}
      </div>

      {/* ── iOS bottom tab bar ── */}
      <div style={{
        position:'fixed',bottom:0,left:0,right:0,zIndex:70,
        background:'rgba(6,6,15,0.92)',
        backdropFilter:'blur(32px) saturate(200%)',
        WebkitBackdropFilter:'blur(32px) saturate(200%)',
        borderTop:`1px solid ${T.border}`,
        paddingBottom:'env(safe-area-inset-bottom,0px)',
      }}>
        <div style={{maxWidth:600,margin:'0 auto',
          display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr'}}>
          {[
            {key:'home',     label:'Home',  Icon:HomeIcon    },
            {key:'stats',    label:'Stats', Icon:StatsIcon   },
            {key:'path',     label:'Path',  Icon:PathIcon    },
            {key:'settings', label:'More',  Icon:SettingsIcon},
          ].map(({key,label,Icon}) => {
            const active = activeTab === key
            return (
              <button key={key} onClick={() => setActiveTab(key)} style={{
                background:'none',border:'none',
                padding:'10px 0 12px',
                display:'flex',flexDirection:'column',alignItems:'center',gap:3,
                cursor:'pointer',color:active?T.teal:T.textMuted,
                fontFamily:T.font,transition:'color 0.18s',position:'relative',
              }}>
                {active && (
                  <div style={{
                    position:'absolute',top:5,width:20,height:2,
                    borderRadius:9999,background:T.teal,
                    boxShadow:`0 0 8px ${T.teal}`,
                  }}/>
                )}
                <Icon/>
                <span style={{fontSize:10,fontWeight:active?700:500,letterSpacing:'0.2px'}}>
                  {label}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </>
  )
}
