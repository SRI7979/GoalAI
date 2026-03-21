// Dashboard — Daily Mission Hub
'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import LessonViewer from '@/components/LessonView'
import VideoView from '@/components/VideoView'
import ProjectView from '@/components/ProjectView'
import MultiQuizView from '@/components/MultiQuizView'
import ReadingView from '@/components/ReadingView'
import FlashcardView from '@/components/FlashcardView'
import DiscussionView from '@/components/DiscussionView'
import ChallengeView from '@/components/ChallengeView'
import CapstoneView from '@/components/CapstoneView'
import MissionComplete from '@/components/MissionComplete'
import HeartBar from '@/components/HeartBar'
import NoHeartsOverlay from '@/components/NoHeartsOverlay'
import GemShop from '@/components/GemShop'
import TreasureChest from '@/components/TreasureChest'
import { getLevelProgress, xpForTask, missionXpReward, computeTotalXpFromRows } from '@/lib/xp'
import { track, EVENTS } from '@/lib/analytics'

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
  fontMono:     "'JetBrains Mono','Fira Code',Menlo,monospace",
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
  @keyframes slideInLeft{from{transform:translateX(-100%)}to{transform:translateX(0)}}
  @keyframes fadeInBg   {from{opacity:0}to{opacity:1}}
  @keyframes slideUpPreview{from{transform:translateY(100%)}to{transform:translateY(0)}}
  @keyframes gemPulse{0%{transform:scale(1)}50%{transform:scale(1.22)}100%{transform:scale(1)}}
  @keyframes gemFloat{0%{opacity:1;transform:translateY(0)}100%{opacity:0;transform:translateY(-36px)}}
  @property --chal-angle{syntax:'<angle>';initial-value:0deg;inherits:false}
  @keyframes chalBorderSpin{to{--chal-angle:360deg}}
  @keyframes questShimmer{0%{background-position:200% center}100%{background-position:-200% center}}
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
  lesson:     {color:'#0ef5c2',bg:'rgba(14,245,194,0.10)',  border:'rgba(14,245,194,0.22)',  label:'LESSON'    },
  video:      {color:'#FBBF24',bg:'rgba(251,191,36,0.10)',  border:'rgba(251,191,36,0.22)',  label:'VIDEO'     },
  practice:   {color:'#00d4ff',bg:'rgba(0,212,255,0.10)',   border:'rgba(0,212,255,0.22)',   label:'PRACTICE'  },
  exercise:   {color:'#818CF8',bg:'rgba(129,140,248,0.10)', border:'rgba(129,140,248,0.22)', label:'EXERCISE'  },
  reading:    {color:'#34D399',bg:'rgba(52,211,153,0.10)',  border:'rgba(52,211,153,0.22)',  label:'READING'   },
  flashcard:  {color:'#A78BFA',bg:'rgba(167,139,250,0.10)', border:'rgba(167,139,250,0.22)', label:'FLASHCARDS'},
  discussion: {color:'#60A5FA',bg:'rgba(96,165,250,0.10)',  border:'rgba(96,165,250,0.22)',  label:'DISCUSSION'},
  challenge:  {color:'#F59E0B',bg:'rgba(245,158,11,0.10)',  border:'rgba(245,158,11,0.22)',  label:'CHALLENGE' },
  capstone:   {color:'#F97316',bg:'rgba(249,115,22,0.10)',  border:'rgba(249,115,22,0.22)',  label:'CAPSTONE'  },
  quiz:     {color:'#FF453A',bg:'rgba(255,69,58,0.10)',   border:'rgba(255,69,58,0.22)',   label:'QUIZ'    },
  review:   {color:'#FF6B35',bg:'rgba(255,107,53,0.10)',  border:'rgba(255,107,53,0.22)',  label:'REVIEW'  },
}
const taskStyle = (type) => TASK_STYLE[type] || TASK_STYLE.lesson

// Helper: current week's Monday as YYYY-MM-DD
function getWeekStartStr() {
  const d = new Date()
  const day = d.getDay()
  const off = day === 0 ? -6 : 1 - day
  const mon = new Date(d)
  mon.setDate(d.getDate() + off)
  return mon.toISOString().split('T')[0]
}

// Reward calendar day gems (Mon-Sun)
const CAL_REWARDS = [5, 8, 10, 12, 15, 20, 30]
const CAL_DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']

// ─── Energy options ────────────────────────────────────────────────────────────
const ENERGY_OPTIONS = [
  {key:'energized', icon:'⚡', label:'Energized'},
  {key:'good',      icon:'✓',  label:'Good'     },
  {key:'okay',      icon:'~',  label:'Okay'     },
  {key:'tired',     icon:'○',  label:'Tired'    },
  {key:'drained',   icon:'–',  label:'Drained'  },
]
function getFilteredTasks(tasks, energy) {
  if (!tasks?.length) return tasks || []
  if (energy === 'energized' || energy === 'good') return tasks
  if (energy === 'okay') {
    // Hide exercise and quiz, show the rest
    return tasks.filter(t => !['exercise','quiz'].includes(t.type))
  }
  if (energy === 'tired') {
    // Show only lessons and reviews (easiest), max 2
    const easy = tasks.filter(t => ['lesson','review'].includes(t.type))
    return easy.slice(0, 2)
  }
  if (energy === 'drained') {
    // Just 1 review or the first task
    const review = tasks.find(t => t.type === 'review') || tasks[0]
    return review ? [review] : []
  }
  return tasks
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
const ShopIcon     = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 7v13a2 2 0 002 2h14a2 2 0 002-2V7l-3-5H6z"/><line x1="3" y1="7" x2="21" y2="7"/><path d="M16 11a4 4 0 01-8 0"/></svg>

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

// ─── Task type descriptions (for preview) ───────────────────────────────────
const TASK_TYPE_INFO = {
  lesson:     { icon:'📖', what:'Interactive slideshow lesson with quizzes woven in to test understanding as you learn.' },
  video:      { icon:'🎬', what:'Watch a curated video on this topic, then reflect on the key takeaways.' },
  practice:   { icon:'🛠️', what:'Hands-on practice project with step-by-step guidance to build something real.' },
  exercise:   { icon:'💪', what:'Structured exercise with clear steps to work through and check off as you go.' },
  quiz:       { icon:'❓', what:'Multi-question quiz to test your knowledge — get instant feedback on every answer.' },
  review:     { icon:'🔄', what:'Review previously learned concepts to strengthen your understanding.' },
  reading:    { icon:'📄', what:'In-depth article with key terms highlighted — read at your own pace.' },
  flashcard:  { icon:'🃏', what:'Flip through cards to memorize key concepts — mark each as "Got it" or "Still learning."' },
  discussion: { icon:'💬', what:'Thought-provoking reflection prompts — write your thinking to deepen understanding.' },
  challenge:  { icon:'⏱️', what:'Timed challenge that tests your skills under pressure — hints available if you get stuck.' },
  capstone:   { icon:'🏗️', what:'Multi-step capstone project with milestones — build something portfolio-worthy.' },
}

const LESSON_LABELS = {
  lesson:     'Start Lesson',
  video:      'Watch Video',
  practice:   'Start Practice',
  exercise:   'Start Exercise',
  quiz:       'Take Quiz',
  review:     'Start Review',
  reading:    'Read Article',
  flashcard:  'Study Cards',
  discussion: 'Start Discussion',
  challenge:  'Begin Challenge',
  capstone:   'Open Project',
}

// ─── Task Preview Modal ────────────────────────────────────────────────────────
function TaskPreview({ task, onClose, onStart, onComplete, isCompleting }) {
  const ts   = taskStyle(task.type)
  const xp   = xpForTask(task.type)
  const info = TASK_TYPE_INFO[task.type] || TASK_TYPE_INFO.lesson
  const me   = isCompleting === task.id
  const anyCompleting = Boolean(isCompleting)
  const label = LESSON_LABELS[task.type] || 'Start Lesson'

  return (
    <div onClick={onClose} style={{
      position:'fixed', inset:0, zIndex:150,
      background:'rgba(0,0,0,0.65)', backdropFilter:'blur(12px)', WebkitBackdropFilter:'blur(12px)',
      display:'flex', alignItems:'flex-end', justifyContent:'center',
      animation:'fadeInBg 0.2s ease both',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width:'100%', maxWidth:520,
        background:'linear-gradient(180deg,#0d0d1a 0%,#080814 100%)',
        borderRadius:'24px 24px 0 0',
        border:'1px solid rgba(255,255,255,0.10)',
        borderBottom:'none',
        padding:'20px 22px 34px',
        fontFamily:T.font,
        animation:'slideUpPreview 0.28s cubic-bezier(0.16,1,0.3,1) both',
        maxHeight:'85vh', overflowY:'auto',
      }}>
        {/* Drag handle */}
        <div style={{width:36,height:4,borderRadius:9999,background:'rgba(255,255,255,0.15)',margin:'0 auto 18px'}}/>

        {/* Type badge row */}
        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:14}}>
          <span style={{fontSize:22}}>{info.icon}</span>
          <span style={{
            padding:'4px 11px', background:ts.bg, border:`1px solid ${ts.border}`,
            borderRadius:9999, fontSize:11, fontWeight:800, color:ts.color, letterSpacing:'0.8px',
          }}>{ts.label}</span>
          <div style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:10}}>
            <span style={{fontSize:12,color:T.textMuted,fontWeight:600,display:'flex',alignItems:'center',gap:4}}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              {task.durationMin||0} min
            </span>
            <span style={{fontSize:12,fontWeight:700,color:'#FBBF24',display:'flex',alignItems:'center',gap:3}}>
              <BoltIcon sz={12}/>+{xp} XP
            </span>
          </div>
        </div>

        {/* Title */}
        <h2 style={{fontSize:20,fontWeight:800,color:T.text,lineHeight:1.3,marginBottom:10,letterSpacing:'-0.3px'}}>
          {task.title}
        </h2>

        {/* Description */}
        {task.description && (
          <p style={{fontSize:14,color:T.textSec,lineHeight:1.65,marginBottom:16}}>
            {task.description}
          </p>
        )}

        {/* What to expect */}
        <div style={{
          padding:'14px 16px', background:'rgba(255,255,255,0.03)',
          border:`1px solid ${T.border}`, borderRadius:14, marginBottom:16,
        }}>
          <div style={{fontSize:11,fontWeight:700,color:T.textMuted,textTransform:'uppercase',letterSpacing:'1px',marginBottom:6}}>
            What to expect
          </div>
          <p style={{fontSize:13,color:T.textSec,lineHeight:1.6,margin:0}}>
            {info.what}
          </p>
        </div>

        {/* Resource link */}
        {task.resourceUrl && (
          <a href={task.resourceUrl} target="_blank" rel="noopener noreferrer" style={{
            display:'inline-flex', alignItems:'center', gap:5,
            fontSize:13, color:'#00d4ff', fontWeight:600,
            textDecoration:'none', marginBottom:16,
          }}>
            {task.resourceTitle||'Open resource'} <ArrowRight sz={12}/>
          </a>
        )}

        {/* Action buttons */}
        {task.completed ? (
          <div style={{
            padding:'14px', background:'rgba(14,245,194,0.06)',
            border:'1px solid rgba(14,245,194,0.18)', borderRadius:14,
            textAlign:'center', fontSize:15, fontWeight:700, color:T.teal,
          }}>
            ✓ Completed
          </div>
        ) : (
          <div style={{display:'flex',gap:10}}>
            <button onClick={() => { onClose(); onStart(task) }} style={{
              flex:1, padding:'14px 12px',
              background:'rgba(14,245,194,0.06)',
              border:`1px solid ${T.tealBorder}`, borderRadius:14,
              color:T.teal, fontSize:14, fontWeight:700,
              cursor: anyCompleting ? 'default' : 'pointer', fontFamily:T.font,
              display:'flex', alignItems:'center', justifyContent:'center', gap:6,
              opacity: anyCompleting ? 0.5 : 1,
              transition:'all 0.18s',
            }}
            onMouseEnter={e=>{if(!anyCompleting)e.currentTarget.style.background='rgba(14,245,194,0.12)'}}
            onMouseLeave={e=>{e.currentTarget.style.background='rgba(14,245,194,0.06)'}}>
              <PlayIcon/> {label}
            </button>
            <button
              disabled={anyCompleting}
              onClick={e => { onClose(); onComplete(task, e) }}
              style={{
                flex:'none', padding:'14px 20px',
                background: anyCompleting ? 'rgba(255,255,255,0.04)' : 'linear-gradient(135deg,#0ef5c2,#00d4ff)',
                border: anyCompleting ? `1px solid ${T.border}` : 'none',
                borderRadius:14, color: anyCompleting ? T.textMuted : '#06060f',
                fontSize:14, fontWeight:800,
                cursor: anyCompleting ? 'default' : 'pointer', fontFamily:T.font,
                boxShadow: anyCompleting ? 'none' : '0 0 24px rgba(14,245,194,0.28)',
                display:'flex', alignItems:'center', justifyContent:'center', gap:6,
                opacity: anyCompleting && !me ? 0.5 : 1,
                transition:'all 0.20s',
              }}
            >
              {me
                ? <><div style={{width:13,height:13,border:'2px solid rgba(255,255,255,0.06)',borderTopColor:T.teal,borderRadius:'50%',animation:'spin 0.65s linear infinite'}}/>Saving…</>
                : anyCompleting ? 'Wait…' : <><BoltIcon sz={13}/>Complete</>}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Task Item (with optimistic completion) ────────────────────────────────────
function TaskItem({ task, onPreview, index }) {
  const ts      = taskStyle(task.type)
  const xp      = xpForTask(task.type)

  return (
    <div
      onClick={() => onPreview(task)}
      style={{
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
        cursor:'pointer',
      }}
      onMouseEnter={e=>{if(!task.completed)e.currentTarget.style.borderColor='rgba(255,255,255,0.16)'}}
      onMouseLeave={e=>{e.currentTarget.style.borderColor=task.completed?'rgba(14,245,194,0.14)':T.border}}
    >
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
        textDecoration: task.completed ? `line-through ${T.textDead}` : 'none',
      }}>
        {task.title}
      </div>

      {/* Description (hidden once done) */}
      {task.description && !task.completed && (
        <p style={{fontSize:13,color:T.textMuted,lineHeight:1.6,
          marginBottom:0}}>
          {task.description.length>110 ? task.description.slice(0,110)+'…' : task.description}
        </p>
      )}

      {/* Tap to preview hint */}
      {!task.completed && (
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginTop:10}}>
          <span style={{fontSize:11,color:T.textMuted,fontWeight:500}}>Tap to preview</span>
          <ArrowRight sz={12}/>
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
  const [previewTask, setPreviewTask] = useState(null)
  const [error,       setError]       = useState('')

  // Goals sidebar
  const [showGoalsSidebar, setShowGoalsSidebar] = useState(false)
  const [allGoals,         setAllGoals]         = useState([])
  const [switchingGoal,    setSwitchingGoal]    = useState(null)

  // Hearts
  const [heartsRemaining,  setHeartsRemaining]  = useState(5)
  const [heartsRefillAt,   setHeartsRefillAt]   = useState(null)
  const [prevHearts,       setPrevHearts]       = useState(5)
  const [showNoHearts,     setShowNoHearts]     = useState(false)

  // Gems
  const [gems,             setGems]             = useState(0)
  const [gemPulse,         setGemPulse]         = useState(false)
  const [gemToasts,        setGemToasts]        = useState([])
  // XP Boost
  const [xpBoostUntil,     setXpBoostUntil]     = useState(null)
  const [boostTimeLeft,    setBoostTimeLeft]    = useState(0)

  // Treasure Chest
  const [chestReward,      setChestReward]      = useState(null)

  // Plan meta
  const [totalDaysPlanned,  setTotalDaysPlanned]  = useState(0)
  const [generatingNext,    setGeneratingNext]    = useState(false)

  // Streak freeze
  const [freezeCount,    setFreezeCount]    = useState(0)
  const [freezing,       setFreezing]       = useState(false)
  const [freezeToast,    setFreezeToast]    = useState(false)
  const [isComeback,     setIsComeback]     = useState(false)

  // Daily Quests
  const [quests,         setQuests]         = useState([])
  const [questMasterToast, setQuestMasterToast] = useState(false)

  // Reward Calendar
  const [rewardCalendar, setRewardCalendar] = useState({ week_start: null, days_claimed: [] })
  const [claimingReward, setClaimingReward] = useState(false)

  // Weekly Challenge
  const [weeklyChallenge, setWeeklyChallenge] = useState(null)
  const [challengeDaysLeft, setChallengeDaysLeft] = useState(0)

  // XP Boost Event
  const [showBoostEvent,   setShowBoostEvent]   = useState(false)

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

    // Load all goals for sidebar
    const { data: goalsList } = await supabase
      .from('goals').select('id,goal_text,status,created_at,mode')
      .eq('user_id', me.id).order('created_at', { ascending: false })
    setAllGoals(goalsList || [])

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
      .from('user_progress').select('total_xp,current_streak,longest_streak,freeze_count,hearts_remaining,hearts_refill_at,total_days,gems,xp_boost_until,reward_calendar,last_event_date')
      .eq('goal_id', activeGoal.id).eq('user_id', me.id).maybeSingle()

    const storedXp   = Number(prog?.total_xp) || 0
    const computedXp = computeTotalXpFromRows(taskRows)
    const finalXp    = storedXp > 0 ? storedXp : computedXp
    setXpDisplay(getLevelProgress(finalXp))
    const streak = prog?.current_streak || 0
    const longest = prog?.longest_streak || 0
    setStreakData({ current: streak, longest })
    setFreezeCount(Number(prog?.freeze_count) || 0)

    const h = prog?.hearts_remaining != null ? Number(prog.hearts_remaining) : 5
    setPrevHearts(h)
    setHeartsRemaining(h)
    setHeartsRefillAt(prog?.hearts_refill_at || null)
    setGems(Number(prog?.gems) || 0)
    if (prog?.xp_boost_until) {
      const until = new Date(prog.xp_boost_until)
      if (until > new Date()) setXpBoostUntil(until)
      else setXpBoostUntil(null)
    }
    if (prog?.total_days) setTotalDaysPlanned(Number(prog.total_days))

    // Load quests from today's row
    if (today?.quests && Array.isArray(today.quests) && today.quests.length > 0) {
      setQuests(today.quests)
    } else if (today) {
      // Generate quests client-side for display (will be persisted on first task complete)
      const { generateDailyQuests } = await import('@/lib/quests')
      const dayTasks = Array.isArray(today.tasks) ? today.tasks : []
      setQuests(generateDailyQuests(today.day_number || 1, dayTasks.length))
    }

    // Load reward calendar
    if (prog?.reward_calendar) {
      const cal = prog.reward_calendar
      const weekStart = getWeekStartStr()
      if (cal.week_start === weekStart) {
        setRewardCalendar(cal)
      } else {
        setRewardCalendar({ week_start: weekStart, days_claimed: [] })
      }
    }

    // Load weekly challenge
    try {
      const { data: { session: sess } } = await supabase.auth.getSession()
      const tok = sess?.access_token || null
      const chalRes = await fetch(`/api/weekly-challenge?goalId=${activeGoal.id}${tok ? `&token=${tok}` : ''}`, {
        headers: tok ? { Authorization: `Bearer ${tok}` } : {},
      })
      if (chalRes.ok) {
        const chalData = await chalRes.json()
        setWeeklyChallenge(chalData.challenge || null)
        setChallengeDaysLeft(chalData.daysRemaining ?? 0)
      }
    } catch { /* silent */ }

    // Comeback detection: has prior completed days but streak is 0
    const priorDone  = (taskRows || []).filter(r => r.completion_status === 'completed').length
    const isBack     = streak === 0 && priorDone > 0
    setIsComeback(isBack)

    // Analytics: app opened
    track(EVENTS.APP_OPENED, { isComeback: isBack }, {
      userId: me.id, goalId: activeGoal.id,
      streakValue: streak, xpBalance: finalXp,
    })

    setLoading(false)
  }, [router])

  useEffect(() => { load() }, [load])

  // Sync tasks array when todayRow changes
  useEffect(() => {
    if (todayRow) setTasks(Array.isArray(todayRow.tasks) ? todayRow.tasks : [])
  }, [todayRow?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll to top on tab change
  useEffect(() => { window.scrollTo(0, 0) }, [activeTab])

  // XP boost countdown timer
  useEffect(() => {
    if (!xpBoostUntil) { setBoostTimeLeft(0); return }
    const tick = () => {
      const diff = Math.max(0, Math.floor((xpBoostUntil - Date.now()) / 1000))
      setBoostTimeLeft(diff)
      if (diff <= 0) setXpBoostUntil(null)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [xpBoostUntil])

  // ─── XP boost random event (25% chance, max once per day) ─────────────────
  useEffect(() => {
    if (loading || !goal || !user) return
    const todayStr = new Date().toISOString().split('T')[0]
    const lastEvent = localStorage.getItem('pathai.lastBoostEvent')
    if (lastEvent === todayStr) return
    if (xpBoostUntil) return // already boosted

    if (Math.random() < 0.25) {
      localStorage.setItem('pathai.lastBoostEvent', todayStr)
      // Fire boost event after short delay for dramatic effect
      setTimeout(() => {
        setShowBoostEvent(true)
        const boostEnd = new Date(Date.now() + 15 * 60 * 1000)
        setXpBoostUntil(boostEnd)
        // Persist to server (client supabase)
        supabase.from('user_progress').update({
          xp_boost_until: boostEnd.toISOString(),
          last_event_date: todayStr,
        }).eq('user_id', user.id).eq('goal_id', goal.id).then(() => {}).catch(() => {})
        // Auto-dismiss event overlay after 2.5s
        setTimeout(() => setShowBoostEvent(false), 2500)
      }, 2000)
    }
  }, [loading, goal, user]) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Reward calendar claim handler ─────────────────────────────────────────
  const handleClaimReward = useCallback(async () => {
    if (claimingReward || !goal) return
    setClaimingReward(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token || null
      const res = await fetch('/api/claim-reward', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ goalId: goal.id, accessToken: token }),
      })
      const data = await res.json()
      if (data.ok) {
        setRewardCalendar(data.calendar)
        if (data.newGemTotal != null) setGems(data.newGemTotal)
        setGemPulse(true)
        setTimeout(() => setGemPulse(false), 400)
        setGemToasts(prev => [...prev, { id: Date.now(), amount: data.reward + (data.perfectWeekBonus || 0) }])
      }
    } catch { /* silent */ }
    setClaimingReward(false)
  }, [claimingReward, goal])

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

    // 3a. Optimistic gem bump (+5 per task)
    setGems(g => g + 5)

    // 3b. Instant mission complete — don't wait for API
    const allDoneNow = nextTasks.every(t => t.completed)
    if (allDoneNow) {
      setMissionDone(true)
      setMcData({
        conceptName:    todayRow?.covered_topics?.[0] || `Day ${todayRow?.day_number}`,
        dayNumber:      todayRow?.day_number,
        xpEarned:       xpAmount + 50, // optimistic: task + mission bonus
        taskXp:         xpAmount,
        missionBonusXp: 50,
        streakBonusXp:  0,
        gemsEarned:     20, // optimistic: 5 task + 15 mission
        newStreak:      streakData.current || 1,
        levelUp:        null,
        tomorrowConcept:   tomorrowRow?.covered_topics?.[0] || null,
        tomorrowDayNumber: tomorrowRow?.day_number || null,
      })
    }

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
        setGems(g => Math.max(0, g - 5)) // rollback optimistic gem
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

      // Gem update — we already added +5 optimistically, so only add the extra (mission/streak bonuses)
      const extraGems = (data.gemsEarned || 0) - 5
      if (extraGems > 0) {
        setGems(g => g + extraGems)
      }
      if (data.gemsEarned > 0) {
        setGemPulse(true)
        setTimeout(() => setGemPulse(false), 400)
        setGemToasts(prev => [...prev, { id: Date.now(), amount: data.gemsEarned }])
      }

      // Quest updates
      if (data.questUpdate?.quests) {
        setQuests(data.questUpdate.quests)
        if (data.questUpdate.questGemsEarned > 0) {
          setGems(g => g + data.questUpdate.questGemsEarned)
          setGemPulse(true)
          setTimeout(() => setGemPulse(false), 400)
        }
        if (data.questUpdate.questMasterBonus) {
          setQuestMasterToast(true)
          setTimeout(() => setQuestMasterToast(false), 4000)
        }
      }

      // Weekly challenge updates
      if (data.challengeUpdate) {
        setWeeklyChallenge(prev => prev ? {
          ...prev,
          current_value: data.challengeUpdate.currentValue,
          completed: data.challengeUpdate.completed,
        } : prev)
        if (data.challengeUpdate.completed && data.challengeUpdate.gemReward > 0) {
          setGems(g => g + data.challengeUpdate.gemReward)
          setGemPulse(true)
          setTimeout(() => setGemPulse(false), 400)
        }
      }

      // Treasure chest — show after XP toast settles
      if (data.chestReward) {
        setTimeout(() => setChestReward(data.chestReward), 800)
      }

      // Analytics: task completed
      track(EVENTS.TASK_COMPLETED, {
        taskId: task.id, taskType: task.type, xpEarned: data.taskXp ?? xpAmount,
      }, {
        userId: user?.id, goalId: goal?.id, missionId: todayRow?.id,
        streakValue: data.streakState?.current ?? streakData.current,
        xpBalance: data.newTotalXp ?? (xpDisplay.totalXp + xpAmount),
        energyMode: energy,
      })

      // Mission complete — correct optimistic data with server values
      if (data.missionComplete || allDoneNow) {
        const mc = {
          conceptName:    todayRow.covered_topics?.[0] || `Day ${todayRow.day_number}`,
          dayNumber:      todayRow.day_number,
          xpEarned:       data.xpEarned ?? (xpAmount + (data.missionBonusXp||0) + (data.streakBonusXp||0)),
          taskXp:         data.taskXp       ?? xpAmount,
          missionBonusXp: data.missionBonusXp ?? 0,
          streakBonusXp:  data.streakBonusXp  ?? 0,
          gemsEarned:     data.gemsEarned   ?? 0,
          newStreak:      data.streakState?.current ?? streakData.current,
          levelUp:        data.levelUp ?? null,
          tomorrowConcept:   tomorrowRow?.covered_topics?.[0] || null,
          tomorrowDayNumber: tomorrowRow?.day_number || null,
        }
        setMcData(mc) // update with real server data
        setMissionDone(true)
        track(EVENTS.MISSION_COMPLETED, { totalXp: mc.xpEarned, dayNumber: mc.dayNumber }, {
          userId: user?.id, goalId: goal?.id, missionId: todayRow?.id,
          streakValue: mc.newStreak, energyMode: energy,
        })
      }

      if (data.levelUp) {
        track(EVENTS.LEVEL_UP, { fromLevel: data.levelUp.fromLevel, toLevel: data.levelUp.toLevel, title: data.levelUp.title }, {
          userId: user?.id, goalId: goal?.id, xpBalance: data.newTotalXp,
        })
      }

      setTimeout(() => load(true), 1200)
    } catch {
      setTasks(prevTasks)
      setXpDisplay(getLevelProgress(prevXp))
      setGems(g => Math.max(0, g - 5)) // rollback optimistic gem
      setError('Network error. Check your connection.')
    } finally {
      setCompleting(null)
    }
  }, [tasks, completing, xpDisplay, todayRow, tomorrowRow, streakData, addXpToast, load])

  // ─── Streak freeze ─────────────────────────────────────────────────────────
  const handleFreeze = useCallback(async () => {
    if (freezing || freezeCount <= 0 || !goal) return
    setFreezing(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token || null
      const res = await fetch('/api/streak-freeze', {
        method: 'POST',
        headers: { 'Content-Type':'application/json', ...(token?{Authorization:`Bearer ${token}`}:{}) },
        body: JSON.stringify({ goalId: goal.id }),
      })
      const data = await res.json()
      if (data.ok) {
        setFreezeCount(prev => Math.max(0, prev - 1))
        setFreezeToast(true)
        setTimeout(() => setFreezeToast(false), 3500)
        track(EVENTS.STREAK_FREEZE_USED, { freezesRemaining: (freezeCount - 1) }, {
          userId: user?.id, goalId: goal?.id, streakValue: streakData.current,
        })
      }
    } catch { /* silent */ }
    setFreezing(false)
  }, [freezing, freezeCount, goal, streakData, user])

  // ─── Energy change ──────────────────────────────────────────────────────────
  const handleEnergyChange = useCallback((newEnergy) => {
    track(EVENTS.ENERGY_SELECTED, { energy: newEnergy, previousEnergy: energy }, {
      userId: user?.id, goalId: goal?.id, energyMode: newEnergy,
    })
    setEnergy(newEnergy)
  }, [energy, user, goal])

  // ─── Heart lost (wrong quiz answer) ────────────────────────────────────────
  const handleHeartLost = useCallback(async () => {
    if (!goal) return
    const prev = heartsRemaining
    const next = Math.max(0, prev - 1)
    setPrevHearts(prev)
    setHeartsRemaining(next)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token || null
      const res = await fetch('/api/wrong-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ goalId: goal.id, accessToken: token }),
      })
      const data = await res.json()
      if (data.heartsRemaining != null) {
        setHeartsRemaining(data.heartsRemaining)
        setHeartsRefillAt(data.heartsRefillAt || null)
        if (data.heartsRemaining === 0) setShowNoHearts(true)
      }
    } catch { /* optimistic value stays */ }
  }, [goal, heartsRemaining])

  // ─── Fast-forward to next day ───────────────────────────────────────────────
  const handleStartTomorrow = useCallback(() => {
    if (!tomorrowRow) return
    setTodayRow(tomorrowRow)
    setTasks(Array.isArray(tomorrowRow.tasks) ? tomorrowRow.tasks : [])
    setMissionDone(tomorrowRow.completion_status === 'completed')
    setMcData(null)
    load(true)
  }, [tomorrowRow, load])

  // ─── Generate next day on-demand (when AI generation lagged) ────────────────
  const handleGenerateNext = useCallback(async () => {
    if (generatingNext || !goal || !user) return
    setGeneratingNext(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token || null
      await fetch('/api/generate-next', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ goalId: goal.id, userId: user.id, mode: goal.mode || 'goal', accessToken: token }),
      })
    } catch { /* silent */ }
    await load(true)
    setGeneratingNext(false)
  }, [generatingNext, goal, user, load])

  // ─── Lesson complete ────────────────────────────────────────────────────────
  const handleLessonComplete = useCallback((task) => {
    // Close lesson view first, then complete the task
    setShowLesson(null)
    if (task && !task.completed) {
      // Small delay so the view closes visually before the task completion triggers
      setTimeout(() => completeTask(task, null), 100)
    }
  }, [completeTask])

  // ─── Switch active goal ─────────────────────────────────────────────────────
  const switchGoal = useCallback(async (goalId) => {
    if (switchingGoal || goalId === goal?.id) { setShowGoalsSidebar(false); return }
    setSwitchingGoal(goalId)
    try {
      const userId = (await supabase.auth.getUser()).data?.user?.id
      if (!userId) return
      // Set all goals to paused, then activate the chosen one
      await supabase.from('goals').update({ status: 'paused' }).eq('user_id', userId).neq('id', goalId)
      await supabase.from('goals').update({ status: 'active' }).eq('id', goalId).eq('user_id', userId)
      setShowGoalsSidebar(false)
      await load(true)
    } catch { /* silent */ }
    setSwitchingGoal(null)
  }, [switchingGoal, goal, load])

  // ─── Computed ───────────────────────────────────────────────────────────────
  const visibleTasks = useMemo(() => getFilteredTasks(tasks, energy), [tasks, energy])
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

      {/* Goals sidebar */}
      {showGoalsSidebar && (
        <>
          {/* Backdrop */}
          <div onClick={() => setShowGoalsSidebar(false)} style={{
            position:'fixed',inset:0,zIndex:200,
            background:'rgba(0,0,0,0.55)',backdropFilter:'blur(4px)',
            animation:'fadeInBg 0.20s ease',
          }}/>
          {/* Panel */}
          <div style={{
            position:'fixed',top:0,left:0,bottom:0,zIndex:201,
            width:Math.min(320, window.innerWidth * 0.85),
            background:'rgba(10,10,20,0.98)',
            borderRight:'1px solid rgba(255,255,255,0.08)',
            display:'flex',flexDirection:'column',
            animation:'slideInLeft 0.25s cubic-bezier(0.16,1,0.3,1)',
            fontFamily:T.font,
          }}>
            {/* Header */}
            <div style={{
              padding:'20px 20px 16px',
              borderBottom:'1px solid rgba(255,255,255,0.07)',
              display:'flex',alignItems:'center',justifyContent:'space-between',
            }}>
              <div>
                <div style={{fontSize:16,fontWeight:800,color:T.text}}>My Goals</div>
                <div style={{fontSize:11,color:T.textMuted,marginTop:2}}>
                  {allGoals.length} goal{allGoals.length !== 1 ? 's' : ''}
                </div>
              </div>
              <button onClick={() => setShowGoalsSidebar(false)} style={{
                background:'rgba(255,255,255,0.06)',border:'none',
                width:30,height:30,borderRadius:'50%',
                display:'flex',alignItems:'center',justifyContent:'center',
                cursor:'pointer',color:T.textSec,fontSize:18,fontFamily:T.font,
              }}>×</button>
            </div>

            {/* Goal list */}
            <div style={{flex:1,overflowY:'auto',padding:'12px 12px'}}>
              {allGoals.map(g => {
                const isActive = g.id === goal?.id
                const isSwitching = switchingGoal === g.id
                return (
                  <button key={g.id} onClick={() => switchGoal(g.id)} disabled={isSwitching} style={{
                    width:'100%',marginBottom:8,padding:'14px 14px',
                    background: isActive ? 'rgba(14,245,194,0.08)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${isActive ? T.tealBorder : 'rgba(255,255,255,0.07)'}`,
                    borderRadius:14,cursor: isActive ? 'default' : 'pointer',
                    textAlign:'left',fontFamily:T.font,
                    display:'flex',alignItems:'center',gap:12,
                    opacity: isSwitching ? 0.6 : 1,
                    transition:'opacity 0.15s',
                  }}>
                    <div style={{
                      width:10,height:10,borderRadius:'50%',flexShrink:0,
                      background: isActive ? T.teal : g.status === 'completed' ? T.mastery : 'rgba(255,255,255,0.15)',
                      boxShadow: isActive ? `0 0 8px ${T.teal}` : 'none',
                    }}/>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{
                        fontSize:13,fontWeight:700,
                        color: isActive ? T.teal : T.text,
                        whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',
                      }}>{g.goal_text}</div>
                      <div style={{fontSize:10,color:T.textMuted,marginTop:2,textTransform:'uppercase',letterSpacing:'0.6px'}}>
                        {isActive ? 'Active' : g.status === 'completed' ? 'Completed' : 'Paused'}
                        {g.mode ? ` · ${g.mode}` : ''}
                      </div>
                    </div>
                    {isActive && (
                      <span style={{fontSize:10,fontWeight:700,color:'#06060f',
                        background:T.teal,padding:'2px 8px',borderRadius:9999,flexShrink:0}}>
                        NOW
                      </span>
                    )}
                    {isSwitching && (
                      <div style={{width:14,height:14,borderRadius:'50%',flexShrink:0,
                        border:`2px solid ${T.teal}`,borderTopColor:'transparent',
                        animation:'spin 0.7s linear infinite'}}/>
                    )}
                  </button>
                )
              })}
            </div>

            {/* New goal CTA */}
            <div style={{padding:'12px 12px',borderTop:'1px solid rgba(255,255,255,0.07)'}}>
              <button onClick={() => { setShowGoalsSidebar(false); router.push('/onboarding') }} style={{
                width:'100%',padding:'13px',
                background:'linear-gradient(135deg,#0ef5c2,#00d4ff)',
                border:'none',borderRadius:14,
                color:'#06060f',fontWeight:800,fontSize:14,
                cursor:'pointer',fontFamily:T.font,
                boxShadow:'0 0 24px rgba(14,245,194,0.25)',
              }}>+ New Goal</button>
            </div>
          </div>
        </>
      )}

      {/* XP toasts */}
      {xpToasts.map(t => <XPToast key={t.id} {...t} onDone={removeXpToast}/>)}

      {/* Level-up banner */}
      {levelUpData && <LevelUpBanner data={levelUpData} onDismiss={() => setLevelUpData(null)}/>}

      {/* Mission complete overlay */}
      <MissionComplete
        isVisible={Boolean(missionDone && mcData)}
        data={mcData}
        onDismiss={() => { setMissionDone(false); setMcData(null) }}
        onStartTomorrow={tomorrowRow ? handleStartTomorrow : undefined}
      />

      {/* Treasure Chest */}
      {chestReward && (
        <TreasureChest
          reward={chestReward}
          onClaim={(reward) => {
            if (reward.type === 'gems') {
              setGems(g => g + reward.amount)
              setGemPulse(true)
              setTimeout(() => setGemPulse(false), 400)
            } else if (reward.type === 'streakFreeze') {
              setFreezeCount(f => f + 1)
            } else if (reward.type === 'xpBoost') {
              setXpBoostUntil(new Date(Date.now() + 15 * 60 * 1000))
            }
            setChestReward(null)
          }}
        />
      )}

      {/* XP Boost Event overlay */}
      {showBoostEvent && (
        <div style={{
          position:'fixed',inset:0,zIndex:500,
          background:'rgba(0,0,0,0.75)',backdropFilter:'blur(12px)',
          display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',
          animation:'fadeInBg 0.2s ease both',fontFamily:T.font,
        }} onClick={() => setShowBoostEvent(false)}>
          <div style={{
            fontSize:64,marginBottom:16,
            animation:'checkPop 0.5s cubic-bezier(0.34,1.56,0.64,1)',
          }}>⚡</div>
          <div style={{
            fontSize:28,fontWeight:900,
            background:'linear-gradient(90deg,#FBBF24,#0ef5c2)',
            WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',
            backgroundClip:'text',
            animation:'levelPop 0.5s 0.15s cubic-bezier(0.34,1.3,0.64,1) both',
            marginBottom:8,
          }}>DOUBLE XP ACTIVATED!</div>
          <div style={{
            fontSize:16,fontWeight:700,color:T.textSec,
            animation:'fadeUp 0.4s 0.3s ease both',
          }}>15:00 remaining</div>
        </div>
      )}

      {/* Task preview modal */}
      {previewTask && (
        <TaskPreview
          task={previewTask}
          isCompleting={completing}
          onClose={() => setPreviewTask(null)}
          onStart={t => {
            setPreviewTask(null)
            if (heartsRemaining === 0) { setShowNoHearts(true); return }
            setShowLesson({ ...t, _concept: todayRow?.covered_topics?.[0] || t.title })
          }}
          onComplete={(t, e) => {
            setPreviewTask(null)
            completeTask(t, e)
          }}
        />
      )}

      {/* No-hearts overlay */}
      {showNoHearts && (
        <NoHeartsOverlay
          refillAt={heartsRefillAt}
          onClose={() => setShowNoHearts(false)}
          onPractice={() => { setShowNoHearts(false) }}
        />
      )}

      {/* Task viewer — routed by type */}
      {showLesson && showLesson.type === 'video' && (
        <VideoView
          task={showLesson}
          goal={goal?.goal_text}
          onClose={() => setShowLesson(null)}
          onComplete={() => handleLessonComplete(showLesson)}
        />
      )}
      {showLesson && (showLesson.type === 'practice' || showLesson.type === 'exercise') && (
        <ProjectView
          task={showLesson}
          goal={goal?.goal_text}
          knowledge={Array.isArray(goal?.constraints) ? goal.constraints.join(', ') : (goal?.constraints || '')}
          onClose={() => setShowLesson(null)}
          onComplete={() => handleLessonComplete(showLesson)}
        />
      )}
      {showLesson && showLesson.type === 'quiz' && (
        <MultiQuizView
          task={showLesson}
          goal={goal?.goal_text}
          knowledge={Array.isArray(goal?.constraints) ? goal.constraints.join(', ') : (goal?.constraints || '')}
          onClose={() => setShowLesson(null)}
          onComplete={() => handleLessonComplete(showLesson)}
        />
      )}
      {showLesson && showLesson.type === 'reading' && (
        <ReadingView
          task={showLesson}
          goal={goal?.goal_text}
          knowledge={Array.isArray(goal?.constraints) ? goal.constraints.join(', ') : (goal?.constraints || '')}
          onClose={() => setShowLesson(null)}
          onComplete={() => handleLessonComplete(showLesson)}
        />
      )}
      {showLesson && showLesson.type === 'flashcard' && (
        <FlashcardView
          task={showLesson}
          goal={goal?.goal_text}
          knowledge={Array.isArray(goal?.constraints) ? goal.constraints.join(', ') : (goal?.constraints || '')}
          onClose={() => setShowLesson(null)}
          onComplete={() => handleLessonComplete(showLesson)}
        />
      )}
      {showLesson && showLesson.type === 'discussion' && (
        <DiscussionView
          task={showLesson}
          goal={goal?.goal_text}
          knowledge={Array.isArray(goal?.constraints) ? goal.constraints.join(', ') : (goal?.constraints || '')}
          onClose={() => setShowLesson(null)}
          onComplete={() => handleLessonComplete(showLesson)}
        />
      )}
      {showLesson && showLesson.type === 'challenge' && (
        <ChallengeView
          task={showLesson}
          goal={goal?.goal_text}
          knowledge={Array.isArray(goal?.constraints) ? goal.constraints.join(', ') : (goal?.constraints || '')}
          onClose={() => setShowLesson(null)}
          onComplete={() => handleLessonComplete(showLesson)}
        />
      )}
      {showLesson && showLesson.type === 'capstone' && (
        <CapstoneView
          task={showLesson}
          goal={goal?.goal_text}
          knowledge={Array.isArray(goal?.constraints) ? goal.constraints.join(', ') : (goal?.constraints || '')}
          onClose={() => setShowLesson(null)}
          onComplete={() => handleLessonComplete(showLesson)}
        />
      )}
      {showLesson && !['video','practice','exercise','quiz','reading','flashcard','discussion','challenge','capstone'].includes(showLesson.type) && (
        <LessonViewer
          concept={showLesson._concept || showLesson.title}
          taskTitle={showLesson.title}
          goal={goal?.goal_text}
          knowledge={Array.isArray(goal?.constraints) ? goal.constraints.join(', ') : (goal?.constraints || '')}
          lessonKey={`${goal?.id || 'g'}::${showLesson.id || showLesson.title}`}
          onClose={() => setShowLesson(null)}
          onComplete={() => handleLessonComplete(showLesson)}
          onHeartLost={handleHeartLost}
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
            {/* Goal (tap to open goals sidebar) */}
            <button onClick={() => setShowGoalsSidebar(true)} style={{
              flex:1,minWidth:0,background:'none',border:'none',
              cursor:'pointer',fontFamily:T.font,textAlign:'left',padding:0,
            }}>
              <div style={{
                fontSize:14,fontWeight:700,color:T.text,
                whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',
                display:'flex',alignItems:'center',gap:5,
              }}>
                {goal.goal_text}
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={T.textMuted} strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>
              </div>
              {totalRows > 0 && (
                <div style={{display:'flex',alignItems:'center',gap:6,marginTop:2}}>
                  <div style={{width:80,height:3,background:'rgba(255,255,255,0.06)',
                    borderRadius:9999,overflow:'hidden'}}>
                    <div style={{height:'100%',
                      width:`${(totalDaysPlanned||totalRows)>0?(doneRows/(totalDaysPlanned||totalRows))*100:0}%`,
                      background:'linear-gradient(90deg,#0ef5c2,#00d4ff)',
                      borderRadius:9999,transition:'width 0.5s'}}/>
                  </div>
                  <span style={{fontSize:10,color:T.textMuted,fontWeight:600}}>
                    {doneRows}/{totalDaysPlanned||totalRows}d
                  </span>
                </div>
              )}
            </button>

            {/* Streak */}
            {streakData.current > 0 && (
              <div style={{display:'flex',alignItems:'center',gap:4,
                padding:'5px 10px',background:T.flameDim,
                border:`1px solid ${T.flameBorder}`,borderRadius:9999}}>
                <span style={{fontSize:14,animation:'pulseFlame 2.5s ease-in-out infinite'}}>🔥</span>
                <span style={{fontSize:13,fontWeight:800,color:T.flame}}>{streakData.current}</span>
              </div>
            )}

            {/* Hearts */}
            <HeartBar hearts={heartsRemaining} prevHearts={prevHearts} />

            {/* Gems */}
            <button onClick={() => setActiveTab('shop')} style={{
              display:'flex',alignItems:'center',gap:4,
              padding:'5px 10px',background:T.tealDim,
              border:`1px solid ${T.tealBorder}`,borderRadius:9999,
              cursor:'pointer',fontFamily:T.font,position:'relative',
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                style={{animation:gemPulse?'gemPulse 0.3s ease':'none'}}>
                <path d="M6 3L2 9l10 12L22 9l-4-6H6z" fill={T.teal} opacity="0.85"/>
                <path d="M12 3l-2 6h4l-2-6z" fill="#fff" opacity="0.25"/>
                <path d="M6 3L2 9l10 12L22 9l-4-6H6z" stroke={T.teal} strokeWidth="1.5" fill="none"/>
              </svg>
              <span style={{
                fontSize:13,fontWeight:800,color:T.teal,
                fontFamily:T.fontMono,
                animation:gemPulse?'gemPulse 0.3s ease':'none',
              }}>{gems}</span>
              {/* Floating gem toasts */}
              {gemToasts.map(t => (
                <span key={t.id}
                  onAnimationEnd={() => setGemToasts(prev => prev.filter(x => x.id !== t.id))}
                  style={{
                    position:'absolute',top:-8,right:0,
                    fontSize:12,fontWeight:800,color:T.teal,
                    animation:'gemFloat 1.2s ease-out forwards',
                    pointerEvents:'none',whiteSpace:'nowrap',
                  }}>+{t.amount} 💎</span>
              ))}
            </button>

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

        {/* Double XP banner */}
        {boostTimeLeft > 0 && (
          <div style={{maxWidth:600,margin:'8px auto 0',padding:'0 20px'}}>
            <div style={{
              background:'linear-gradient(90deg,rgba(251,191,36,0.10),rgba(14,245,194,0.08))',
              border:'1px solid rgba(251,191,36,0.22)',
              borderRadius:12,padding:'10px 16px',
              display:'flex',alignItems:'center',justifyContent:'space-between',
              animation:'pulseActive 2s ease-in-out infinite',
            }}>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <span style={{fontSize:16}}>⚡</span>
                <span style={{fontSize:13,fontWeight:700,color:'#FBBF24'}}>2x XP Active</span>
              </div>
              <span style={{fontSize:14,fontWeight:800,color:'#FBBF24',fontFamily:T.fontMono}}>
                {Math.floor(boostTimeLeft/60)}:{String(boostTimeLeft%60).padStart(2,'0')}
              </span>
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
            <EnergySelector value={energy} onChange={handleEnergyChange}/>

            {/* ── Weekly Challenge ── */}
            {weeklyChallenge && (
              <div style={{maxWidth:600,margin:'12px auto 0',padding:'0 20px'}}>
                <div style={{
                  background: weeklyChallenge.completed
                    ? 'linear-gradient(135deg,rgba(255,215,0,0.12),rgba(251,191,36,0.06))'
                    : 'linear-gradient(135deg,rgba(14,245,194,0.06),rgba(0,212,255,0.04))',
                  border: `1.5px solid ${weeklyChallenge.completed ? 'rgba(255,215,0,0.30)' : T.tealBorder}`,
                  borderRadius:20,padding:'16px 18px',position:'relative',overflow:'hidden',
                }}>
                  {/* Animated gradient border overlay */}
                  {!weeklyChallenge.completed && (
                    <div style={{
                      position:'absolute',inset:-1,borderRadius:20,
                      background:'conic-gradient(from var(--chal-angle,0deg),transparent 60%,rgba(14,245,194,0.18) 80%,rgba(255,215,0,0.15) 90%,transparent 100%)',
                      animation:'chalBorderSpin 10s linear infinite',
                      pointerEvents:'none',zIndex:0,
                    }}/>
                  )}
                  <div style={{position:'relative',zIndex:1}}>
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
                      <div style={{display:'flex',alignItems:'center',gap:8}}>
                        <span style={{fontSize:18}}>{weeklyChallenge.completed ? '🏆' : '⚔️'}</span>
                        <span style={{fontSize:10,fontWeight:800,letterSpacing:'1.5px',
                          color:weeklyChallenge.completed ? '#FFD700' : T.teal,textTransform:'uppercase'}}>
                          {weeklyChallenge.completed ? 'Challenge Complete!' : 'Weekly Challenge'}
                        </span>
                      </div>
                      {!weeklyChallenge.completed && (
                        <span style={{fontSize:11,color:T.textMuted,fontWeight:600}}>
                          {challengeDaysLeft}d left
                        </span>
                      )}
                    </div>
                    <div style={{fontSize:14,fontWeight:700,color:T.text,marginBottom:10}}>
                      {weeklyChallenge.description}
                    </div>
                    {/* Progress bar */}
                    <div style={{marginBottom:8}}>
                      <div style={{height:8,background:'rgba(255,255,255,0.06)',borderRadius:9999,overflow:'hidden'}}>
                        <div style={{
                          height:'100%',
                          width:`${Math.min(100, ((weeklyChallenge.current_value || 0) / (weeklyChallenge.target_value || 1)) * 100)}%`,
                          background: weeklyChallenge.completed
                            ? 'linear-gradient(90deg,#FFD700,#FFA500)'
                            : 'linear-gradient(90deg,#0ef5c2,#00d4ff)',
                          borderRadius:9999,transition:'width 0.5s',
                          boxShadow: weeklyChallenge.completed
                            ? '0 0 12px rgba(255,215,0,0.50)'
                            : '0 0 10px rgba(14,245,194,0.45)',
                        }}/>
                      </div>
                      <div style={{display:'flex',justifyContent:'space-between',marginTop:4}}>
                        <span style={{fontSize:11,fontWeight:700,color:weeklyChallenge.completed ? '#FFD700' : T.teal}}>
                          {weeklyChallenge.current_value || 0}/{weeklyChallenge.target_value}
                        </span>
                        <div style={{display:'flex',alignItems:'center',gap:8}}>
                          <span style={{fontSize:11,fontWeight:700,color:T.teal,display:'flex',alignItems:'center',gap:3}}>
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                              <path d="M6 3L2 9l10 12L22 9l-4-6H6z" fill={T.teal} opacity="0.85"/>
                            </svg>
                            {weeklyChallenge.gem_reward}
                          </span>
                          <span style={{fontSize:11,fontWeight:700,color:'#FBBF24',display:'flex',alignItems:'center',gap:3}}>
                            <BoltIcon sz={10}/>{weeklyChallenge.xp_reward} XP
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── Daily Quests ── */}
            {quests.length > 0 && (
              <div style={{maxWidth:600,margin:'12px auto 0',padding:'0 20px'}}>
                <div style={{
                  background:T.surface,border:`1px solid ${T.border}`,
                  borderRadius:20,padding:'16px 18px',
                  backdropFilter:'blur(16px)',WebkitBackdropFilter:'blur(16px)',
                }}>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      <span style={{fontSize:16}}>🎯</span>
                      <span style={{fontSize:12,fontWeight:800,letterSpacing:'1px',color:T.textSec,textTransform:'uppercase'}}>
                        Daily Quests
                      </span>
                    </div>
                    <span style={{fontSize:11,color:T.textMuted,fontWeight:600}}>
                      {quests.filter(q => q.completed).length}/{quests.length} done
                    </span>
                  </div>

                  <div style={{display:'flex',flexDirection:'column',gap:8}}>
                    {quests.map((q) => {
                      const pct = q.target > 0 ? Math.min(1, q.current / q.target) : 0
                      return (
                        <div key={q.id} style={{
                          padding:'10px 14px',
                          background: q.completed ? 'rgba(14,245,194,0.04)' : 'rgba(255,255,255,0.02)',
                          border:`1px solid ${q.completed ? 'rgba(14,245,194,0.14)' : 'rgba(255,255,255,0.06)'}`,
                          borderRadius:14,
                          opacity: q.completed ? 0.7 : 1,
                        }}>
                          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:6}}>
                            <span style={{
                              fontSize:13,fontWeight:600,
                              color: q.completed ? T.textMuted : T.text,
                              textDecoration: q.completed ? 'line-through' : 'none',
                            }}>
                              {q.completed && <span style={{color:T.teal,marginRight:6}}>✓</span>}
                              {q.description}
                            </span>
                            <span style={{
                              fontSize:12,fontWeight:700,color:q.completed ? T.textMuted : T.teal,
                              display:'flex',alignItems:'center',gap:3,flexShrink:0,
                            }}>
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                                <path d="M6 3L2 9l10 12L22 9l-4-6H6z" fill={q.completed ? T.textMuted : T.teal} opacity="0.85"/>
                              </svg>
                              {q.completed ? 'Claimed' : `+${q.reward}`}
                            </span>
                          </div>
                          {!q.completed && (
                            <div style={{height:4,background:'rgba(255,255,255,0.06)',borderRadius:9999,overflow:'hidden'}}>
                              <div style={{
                                height:'100%',width:`${Math.round(pct*100)}%`,
                                background:'linear-gradient(90deg,#0ef5c2,#00d4ff)',borderRadius:9999,
                                transition:'width 0.4s',
                              }}/>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {/* Quest Master bonus */}
                  {quests.length > 0 && quests.every(q => q.completed) && (
                    <div style={{
                      marginTop:10,padding:'10px 14px',
                      background:'linear-gradient(90deg,rgba(255,215,0,0.10),rgba(14,245,194,0.06))',
                      border:'1px solid rgba(255,215,0,0.25)',borderRadius:12,
                      textAlign:'center',fontSize:13,fontWeight:800,color:'#FFD700',
                      backgroundSize:'200% auto',
                      animation:'questShimmer 3s linear infinite',
                    }}>
                      Quest Master +30 💎
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Reward Calendar ── */}
            <div style={{maxWidth:600,margin:'12px auto 0',padding:'0 20px'}}>
              <div style={{
                background:T.surface,border:`1px solid ${T.border}`,
                borderRadius:20,padding:'16px 18px',
                backdropFilter:'blur(16px)',WebkitBackdropFilter:'blur(16px)',
              }}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                    <span style={{fontSize:16}}>📅</span>
                    <span style={{fontSize:12,fontWeight:800,letterSpacing:'1px',color:T.textSec,textTransform:'uppercase'}}>
                      Weekly Rewards
                    </span>
                  </div>
                  {rewardCalendar.days_claimed?.length === 7 && (
                    <span style={{fontSize:11,fontWeight:700,color:'#FFD700'}}>Perfect Week! +50 💎</span>
                  )}
                </div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:6}}>
                  {CAL_DAYS.map((day, i) => {
                    const claimed = rewardCalendar.days_claimed?.includes(i)
                    const todayIdx = new Date().getDay()
                    const calToday = todayIdx === 0 ? 6 : todayIdx - 1
                    const isToday = i === calToday
                    const isPast = i < calToday
                    const missed = isPast && !claimed
                    const isSunday = i === 6

                    return (
                      <div key={i}
                        onClick={isToday && !claimed ? handleClaimReward : undefined}
                        style={{
                          display:'flex',flexDirection:'column',alignItems:'center',gap:4,
                          cursor: isToday && !claimed ? 'pointer' : 'default',
                        }}>
                        <div style={{
                          width: isSunday ? 40 : 36, height: isSunday ? 40 : 36,
                          borderRadius:'50%',
                          background: claimed ? 'linear-gradient(135deg,#0ef5c2,#00d4ff)'
                            : isToday ? 'rgba(14,245,194,0.06)'
                            : missed ? 'rgba(255,255,255,0.02)'
                            : 'rgba(255,255,255,0.03)',
                          border: claimed ? '2px solid #0ef5c2'
                            : isToday ? '2px solid rgba(14,245,194,0.50)'
                            : isSunday && !missed ? '2px solid rgba(255,215,0,0.30)'
                            : `1px solid ${missed ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.08)'}`,
                          display:'flex',alignItems:'center',justifyContent:'center',
                          animation: isToday && !claimed ? 'pulseActive 2s ease-in-out infinite' : 'none',
                          transition:'all 0.2s',
                          boxShadow: claimed ? '0 0 10px rgba(14,245,194,0.30)' : 'none',
                        }}>
                          {claimed ? (
                            <span style={{fontSize:14,color:'#06060f',fontWeight:900}}>✓</span>
                          ) : missed ? (
                            <span style={{fontSize:11,color:T.textDead}}>✕</span>
                          ) : isSunday ? (
                            <span style={{fontSize:14}}>🎁</span>
                          ) : (
                            <span style={{
                              fontSize:11,fontWeight:700,
                              color: isToday ? T.teal : T.textMuted,
                            }}>{CAL_REWARDS[i]}</span>
                          )}
                        </div>
                        <span style={{
                          fontSize:9,fontWeight:700,letterSpacing:'0.5px',
                          color: claimed ? T.teal : isToday ? T.textSec : T.textMuted,
                        }}>{day}</span>
                      </div>
                    )
                  })}
                </div>
                {/* Claim CTA for today */}
                {(() => {
                  const todayIdx = new Date().getDay()
                  const calToday = todayIdx === 0 ? 6 : todayIdx - 1
                  const alreadyClaimed = rewardCalendar.days_claimed?.includes(calToday)
                  if (alreadyClaimed) return null
                  return (
                    <button onClick={handleClaimReward} disabled={claimingReward} style={{
                      width:'100%',marginTop:12,padding:'10px',
                      background:'rgba(14,245,194,0.08)',border:`1px solid ${T.tealBorder}`,
                      borderRadius:12,color:T.teal,fontSize:13,fontWeight:700,
                      cursor:claimingReward?'default':'pointer',fontFamily:T.font,
                      display:'flex',alignItems:'center',justifyContent:'center',gap:6,
                    }}>
                      {claimingReward ? (
                        <div style={{width:12,height:12,border:`2px solid ${T.teal}`,borderTopColor:'transparent',borderRadius:'50%',animation:'spin 0.6s linear infinite'}}/>
                      ) : (
                        <>Claim today's reward: +{CAL_REWARDS[calToday]} 💎</>
                      )}
                    </button>
                  )
                })()}
              </div>
            </div>

            {/* ── Quest Master Toast ── */}
            {questMasterToast && (
              <div style={{
                position:'fixed',top:80,left:'50%',transform:'translateX(-50%)',zIndex:9990,
                background:'linear-gradient(135deg,rgba(255,215,0,0.20),rgba(14,245,194,0.12))',
                border:'1px solid rgba(255,215,0,0.40)',borderRadius:14,
                padding:'12px 24px',display:'flex',alignItems:'center',gap:10,
                boxShadow:'0 8px 32px rgba(255,215,0,0.25)',
                backdropFilter:'blur(20px)',WebkitBackdropFilter:'blur(20px)',
                animation:'levelPop 0.50s cubic-bezier(0.34,1.3,0.64,1)',
                fontFamily:T.font,whiteSpace:'nowrap',
              }}>
                <span style={{fontSize:22}}>🎯</span>
                <div>
                  <div style={{fontSize:14,fontWeight:800,color:'#FFD700'}}>Quest Master!</div>
                  <div style={{fontSize:11,color:T.textMuted}}>+30 bonus gems earned</div>
                </div>
              </div>
            )}

            {/* ── Streak freeze toast ── */}
            {freezeToast && (
              <div style={{maxWidth:600,margin:'10px auto 0',padding:'0 20px'}}>
                <div style={{
                  background:'rgba(14,245,194,0.08)',border:`1px solid ${T.tealBorder}`,
                  borderRadius:14,padding:'10px 16px',
                  display:'flex',alignItems:'center',gap:10,
                  animation:'fadeUp 0.30s ease',
                }}>
                  <span style={{fontSize:20}}>🛡</span>
                  <div>
                    <div style={{fontSize:13,fontWeight:700,color:T.teal}}>Streak protected</div>
                    <div style={{fontSize:11,color:T.textMuted}}>{freezeCount} freeze{freezeCount===1?'':'s'} remaining</div>
                  </div>
                </div>
              </div>
            )}

            {/* ── Streak freeze button (show when streak at risk) ── */}
            {isComeback && freezeCount > 0 && !freezeToast && (
              <div style={{maxWidth:600,margin:'10px auto 0',padding:'0 20px'}}>
                <button onClick={handleFreeze} disabled={freezing} style={{
                  width:'100%',padding:'11px 16px',
                  background:'rgba(255,107,53,0.08)',border:`1px solid ${T.flameBorder}`,
                  borderRadius:14,cursor:freezing?'default':'pointer',
                  display:'flex',alignItems:'center',gap:10,fontFamily:T.font,
                }}>
                  <span style={{fontSize:18}}>🛡</span>
                  <div style={{textAlign:'left'}}>
                    <div style={{fontSize:13,fontWeight:700,color:T.flame}}>
                      {freezing ? 'Protecting streak…' : 'Use streak freeze'}
                    </div>
                    <div style={{fontSize:11,color:T.textMuted}}>
                      {freezeCount} freeze{freezeCount===1?'':'s'} available · keeps your streak safe
                    </div>
                  </div>
                </button>
              </div>
            )}

            {/* Task list */}
            <div style={{maxWidth:600,margin:'0 auto',padding:'14px 20px 0',display:'grid',gap:10}}>
              {todayRow ? visibleTasks.length > 0 ? (
                visibleTasks.map((task, i) => (
                  <TaskItem key={task.id} task={task} isCompleting={completing}
                    onComplete={completeTask}
                    onOpenLesson={t => {
                      if (heartsRemaining === 0) { setShowNoHearts(true); return }
                      setShowLesson({ ...t, _concept: todayRow?.covered_topics?.[0] || t.title })
                    }}
                    onPreview={t => setPreviewTask(t)}
                    index={i}/>
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

              {energy === 'drained' && (
                <div style={{textAlign:'center',padding:'8px 0',color:T.textMuted,fontSize:13}}>
                  Rest day — just stay in the habit 🌙
                </div>
              )}
              {hiddenCount > 0 && energy !== 'drained' && (
                <p style={{textAlign:'center',fontSize:12,color:T.textMuted,padding:'4px 0'}}>
                  {hiddenCount} more task{hiddenCount>1?'s':''} available when you have more energy
                </p>
              )}
            </div>

            {/* Tomorrow preview / next-day CTA */}
            {missionDone ? (
              <div style={{maxWidth:600,margin:'10px auto 0',padding:'0 20px'}}>
                {tomorrowRow ? (
                  <button onClick={handleStartTomorrow} style={{
                    width:'100%', padding:'16px',
                    background:'linear-gradient(135deg,#0ef5c2,#00d4ff)',
                    border:'none', borderRadius:16,
                    color:'#06060f', fontSize:15, fontWeight:800,
                    cursor:'pointer', fontFamily:T.font,
                    boxShadow:'0 0 32px rgba(14,245,194,0.28),inset 0 1px 0 rgba(255,255,255,0.40)',
                    display:'flex', alignItems:'center', justifyContent:'center', gap:10,
                    animation:'fadeUp 0.35s ease both',
                  }}
                  onMouseEnter={e=>{e.currentTarget.style.opacity='0.92'}}
                  onMouseLeave={e=>{e.currentTarget.style.opacity='1'}}>
                    Start Day {tomorrowRow.day_number}: {tomorrowRow.covered_topics?.[0] || `Day ${tomorrowRow.day_number}`}
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#06060f" strokeWidth="2.5" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                  </button>
                ) : (
                  <button onClick={handleGenerateNext} disabled={generatingNext} style={{
                    width:'100%', padding:'16px',
                    background: generatingNext ? 'rgba(14,245,194,0.06)' : 'linear-gradient(135deg,#0ef5c2,#00d4ff)',
                    border: generatingNext ? `1px solid ${T.tealBorder}` : 'none',
                    borderRadius:16,
                    color: generatingNext ? T.teal : '#06060f',
                    fontSize:15, fontWeight:800,
                    cursor: generatingNext ? 'default' : 'pointer', fontFamily:T.font,
                    boxShadow: generatingNext ? 'none' : '0 0 32px rgba(14,245,194,0.28),inset 0 1px 0 rgba(255,255,255,0.40)',
                    display:'flex', alignItems:'center', justifyContent:'center', gap:10,
                    animation:'fadeUp 0.35s ease both',
                  }}>
                    {generatingNext ? (
                      <><div style={{width:14,height:14,borderRadius:'50%',border:`2px solid ${T.teal}`,borderTopColor:'transparent',animation:'spin 0.7s linear infinite'}}/>Generating next day…</>
                    ) : (
                      <>Continue to Next Day <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#06060f" strokeWidth="2.5" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg></>
                    )}
                  </button>
                )}
              </div>
            ) : (
              <TomorrowPreview tomorrowRow={tomorrowRow}/>
            )}

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

        {/* ══════════════════════════════════════════════════════════════ */}
        {/* SHOP TAB                                                       */}
        {/* ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'shop' && (
          <GemShop
            gems={gems}
            goalId={goal?.id}
            onPurchase={(data) => {
              if (data.newGemTotal != null) setGems(data.newGemTotal)
              if (data.heartsRemaining != null) { setPrevHearts(heartsRemaining); setHeartsRemaining(data.heartsRemaining) }
              if (data.freezeCount != null) setFreezeCount(data.freezeCount)
              if (data.xpBoostUntil) setXpBoostUntil(new Date(data.xpBoostUntil))
              setGemPulse(true)
              setTimeout(() => setGemPulse(false), 400)
            }}
          />
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
          display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr 1fr'}}>
          {[
            {key:'home',     label:'Home',  Icon:HomeIcon    },
            {key:'shop',     label:'Shop',  Icon:ShopIcon    },
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
