// Dashboard — Daily Mission Hub
'use client'

import { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import LessonViewer from '@/components/LessonView'
import VideoView from '@/components/VideoView'
import ProjectView from '@/components/ProjectView'
import MultiQuizView from '@/components/MultiQuizView'
import ReadingView from '@/components/ReadingView'
import FlashcardView from '@/components/FlashcardView'
import ChallengeView from '@/components/ChallengeView'
import ProjectViewer from '@/components/ProjectViewer'
import GuidedPracticeView from '@/components/GuidedPracticeView'
import ReflectionView from '@/components/ReflectionView'
import BossChallengeView from '@/components/BossChallengeView'
import AIInteractionView from '@/components/AIInteractionView'
import HeartBar from '@/components/HeartBar'
import NoHeartsOverlay from '@/components/NoHeartsOverlay'
import GemShop from '@/components/GemShop'
import TreasureChest from '@/components/TreasureChest'
import IconGlyph from '@/components/IconGlyph'
import Skeleton from '@/components/Skeleton'
import { BADGES, RARITY_COLORS } from '@/lib/badges'
import StreakFlame from '@/components/StreakFlame'
import BadgeShowcase from '@/components/BadgeShowcase'
import { getLevelProgress, xpForTask, missionXpReward, computeTotalXpFromRows } from '@/lib/xp'
import { track, EVENTS } from '@/lib/analytics'
import { buildPathOutlineTracker, courseOutlineNeedsRecovery } from '@/lib/pathOutline.js'
import { hydrateGoalCourseOutline } from '@/lib/courseOutlineStore'
import {
  filterRowsForCourseWindow,
  isCourseFinalExamTask,
} from '@/lib/courseCompletion'
import {
  APP_THEMES,
  getDashboardThemeVars,
  getStoredActiveTheme,
  getStoredOwnedThemes,
  setStoredActiveTheme,
  setStoredOwnedThemes,
} from '@/lib/appThemes'
import {
  buildInventoryCountsFromTransactions,
  getClaimedModuleRewardIds,
} from '@/lib/shopInventory'
import { getStoredMaxHearts, setStoredMaxHearts } from '@/lib/shopStorage'
import { HEARTS_BASE, HEARTS_MAX_CAP } from '@/lib/tokens'

// ─── Design tokens ─────────────────────────────────────────────────────────────
const T = {
  bg:           'var(--theme-bg)',
  chrome:       'var(--theme-chrome)',
  shell:        'var(--theme-shell)',
  surface:      'var(--theme-surface)',
  border:       'var(--theme-border)',
  borderAlt:    'var(--theme-border-alt)',
  teal:         'var(--theme-primary)',
  tealDim:      'var(--theme-primary-dim)',
  tealBorder:   'var(--theme-primary-border)',
  blue:         'var(--theme-secondary)',
  flame:        'var(--theme-warm)',
  flameDim:     'var(--theme-warm-dim)',
  flameBorder:  'var(--theme-warm-border)',
  amber:        'var(--theme-highlight)',
  mastery:      'var(--theme-mastery)',
  masteryDim:   'var(--theme-mastery-dim)',
  masteryBorder:'var(--theme-mastery-border)',
  text:         'var(--theme-text)',
  textSec:      'var(--theme-text-sec)',
  textMuted:    'var(--theme-text-muted)',
  textDead:     'var(--theme-text-dead)',
  red:          'var(--theme-red)',
  ink:          'var(--theme-ink)',
  primaryGradient:'linear-gradient(135deg,var(--theme-primary),var(--theme-secondary))',
  primaryGradientSoft:'linear-gradient(90deg,var(--theme-primary),var(--theme-secondary))',
  masteryGradient:'linear-gradient(135deg,var(--theme-mastery),var(--theme-mastery-strong))',
  masteryGradientSoft:'linear-gradient(90deg,var(--theme-mastery),var(--theme-mastery-strong))',
  highlightGradient:'linear-gradient(90deg,var(--theme-highlight),var(--theme-primary))',
  font:         "'Plus Jakarta Sans','DM Sans',system-ui,sans-serif",
  fontMono:     "'JetBrains Mono','Fira Code',Menlo,monospace",
}

const THEME_REASON_TO_ID = {
  shop_themeOcean: 'themeOcean',
  shop_themeSunset: 'themeSunset',
  shop_themeForest: 'themeForest',
  shop_themeMidnight: 'themeMidnight',
  shop_themeRose: 'themeRose',
  shop_themeAurora: 'themeAurora',
  shop_themeEmber: 'themeEmber',
  shop_themeMonolith: 'themeMonolith',
}

const THEME_TRANSACTION_REASONS = Object.keys(THEME_REASON_TO_ID)

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
  @keyframes nextDayProgress{0%{transform:translateX(-120%)}100%{transform:translateX(240%)}}
  @keyframes missionBorderSpin{to{transform:rotate(360deg)}}
  @keyframes confettiFall {
    0% { opacity: 0; transform: translateY(-18px) rotate(0deg); }
    12% { opacity: 1; }
    100% { opacity: 0; transform: translateY(110vh) rotate(540deg); }
  }
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
    @keyframes missionBorderSpin{to{}}
  }
`

// ─── Task type config ──────────────────────────────────────────────────────────
const TASK_STYLE = {
  // ── Clean 7-type system ──
  concept:          {color:'var(--theme-primary)',bg:'var(--theme-primary-dim)',  border:'var(--theme-primary-border)',  label:'CONCEPT'   },
  guided_practice:  {color:'#00d4ff',bg:'rgba(0,212,255,0.10)',   border:'rgba(0,212,255,0.22)',   label:'PRACTICE'  },
  challenge:        {color:'#F59E0B',bg:'rgba(245,158,11,0.10)',  border:'rgba(245,158,11,0.22)',  label:'CHALLENGE' },
  explain:          {color:'#818CF8',bg:'rgba(129,140,248,0.10)', border:'rgba(129,140,248,0.22)', label:'EXPLAIN'   },
  quiz:             {color:'#FF453A',bg:'rgba(255,69,58,0.10)',   border:'rgba(255,69,58,0.22)',   label:'QUIZ'      },
  reflect:          {color:'#A78BFA',bg:'rgba(167,139,250,0.10)', border:'rgba(167,139,250,0.22)', label:'REFLECT'   },
  boss:             {color:'#EC4899',bg:'rgba(236,72,153,0.12)',  border:'rgba(236,72,153,0.30)',  label:'BOSS'      },
  project:          {color:'#EC4899',bg:'rgba(236,72,153,0.10)',  border:'rgba(236,72,153,0.22)',  label:'PROJECT'   },
  // ── Legacy types (backward compat for existing DB tasks) ──
  lesson:           {color:'var(--theme-primary)',bg:'var(--theme-primary-dim)',  border:'var(--theme-primary-border)',  label:'LESSON'    },
  video:            {color:'#FBBF24',bg:'rgba(251,191,36,0.10)',  border:'rgba(251,191,36,0.22)',  label:'VIDEO'     },
  practice:         {color:'var(--theme-secondary)',bg:'rgba(0,212,255,0.10)',   border:'var(--theme-primary-border)',  label:'PRACTICE'  },
  exercise:         {color:'var(--theme-mastery)',bg:'var(--theme-mastery-dim)', border:'var(--theme-mastery-border)', label:'EXERCISE'  },
  reading:          {color:'#34D399',bg:'rgba(52,211,153,0.10)',  border:'rgba(52,211,153,0.22)',  label:'READING'   },
  flashcard:        {color:'#A78BFA',bg:'rgba(167,139,250,0.10)', border:'rgba(167,139,250,0.22)', label:'FLASHCARDS'},
  discussion:       {color:'#60A5FA',bg:'rgba(96,165,250,0.10)',  border:'rgba(96,165,250,0.22)',  label:'DISCUSSION'},
  capstone:         {color:'#F97316',bg:'rgba(249,115,22,0.10)',  border:'rgba(249,115,22,0.22)',  label:'CAPSTONE'  },
  review:           {color:'#FF6B35',bg:'rgba(255,107,53,0.10)',  border:'rgba(255,107,53,0.22)',  label:'REVIEW'    },
  ai_interaction:   {color:'#818CF8',bg:'rgba(129,140,248,0.10)', border:'rgba(129,140,248,0.22)', label:'EXPLAIN'   },
  reflection:       {color:'#A78BFA',bg:'rgba(167,139,250,0.10)', border:'rgba(167,139,250,0.22)', label:'REFLECT'   },
}
const taskStyle = (type) => TASK_STYLE[type] || TASK_STYLE.concept

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
  {key:'energized', icon:'bolt',   label:'Energized'},
  {key:'good',      icon:'check',  label:'Good'     },
  {key:'okay',      icon:'circle', label:'Okay'     },
  {key:'tired',     icon:'moon',   label:'Tired'    },
  {key:'drained',   icon:'heart',  label:'Drained'  },
]
function getFilteredTasks(tasks, energy) {
  if (!tasks?.length) return tasks || []
  if (energy === 'energized' || energy === 'good') return tasks
  if (energy === 'okay') {
    // Hide exercise, quiz, challenge, boss — show the rest
    return tasks.filter(t => !['exercise','quiz','challenge','boss'].includes(t.type))
  }
  if (energy === 'tired') {
    // Show only lessons, reviews, and reflections (low-effort), max 2
    const easy = tasks.filter(t => ['lesson','review','reflection'].includes(t.type))
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
const BadgesIcon   = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></svg>
const PathBoltLogo = ({ size = 28 }) => (
  <div style={{
    width:size,height:size,borderRadius:'28%',
    background:'linear-gradient(135deg,var(--theme-primary),var(--theme-secondary))',
    display:'flex',alignItems:'center',justifyContent:'center',
    boxShadow:'0 0 20px rgba(14,245,194,0.20), inset 0 1px 0 rgba(255,255,255,0.35)',
    flexShrink:0,
  }}>
    <svg width={Math.round(size * 0.48)} height={Math.round(size * 0.48)} viewBox="0 0 24 24" fill="none" stroke="#050608" strokeWidth="2.5" strokeLinecap="round">
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
    </svg>
  </div>
)

function MiniProgressRing({ size = 38, value = 0, total = 1, stroke = 'var(--theme-primary)', track = 'rgba(255,255,255,0.08)', label, labelColor = T.text, textSize = 11 }) {
  const safeTotal = Math.max(total, 1)
  const ratio = Math.max(0, Math.min(1, value / safeTotal))
  const strokeWidth = size <= 28 ? 3 : 4
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  return (
    <div style={{ position:'relative', width:size, height:size, flexShrink:0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform:'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={track} strokeWidth={strokeWidth}/>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - ratio)}
          style={{ transition:'stroke-dashoffset 0.45s cubic-bezier(0.16,1,0.3,1)' }}
        />
      </svg>
      <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:textSize, fontWeight:900, color:labelColor }}>
        {label ?? value}
      </div>
    </div>
  )
}

function StaggerBlock({ index = 0, children }) {
  return (
    <div style={{
      animation:'fadeUp 0.4s ease-out both',
      animationDelay:`${index * 0.05}s`,
    }}>
      {children}
    </div>
  )
}

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
      background:'linear-gradient(135deg,var(--theme-mastery-dim),rgba(99,102,241,0.14))',
      border:`1px solid ${T.masteryBorder}`, borderRadius:14,
      padding:'12px 20px', display:'flex', alignItems:'center', gap:12,
      boxShadow:'0 8px 32px rgba(129,140,248,0.22)',
      backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)',
      animation:'levelPop 0.50s cubic-bezier(0.34,1.3,0.64,1)',
      cursor:'pointer', userSelect:'none', whiteSpace:'nowrap',
    }}>
      <div style={{
        width:34, height:34, borderRadius:'50%',
        background:T.masteryGradient,
        display:'flex', alignItems:'center', justifyContent:'center',
        fontWeight:900, fontSize:15, color:'#fff',
      }}>{data.toLevel}</div>
      <div>
        <div style={{fontSize:13,fontWeight:800,color:T.mastery}}>Level up — {data.title}</div>
        <div style={{fontSize:11,color:T.textMuted}}>Level {data.fromLevel} → {data.toLevel}</div>
      </div>
    </div>
  )
}

function CourseCompleteOverlay({ data, onDismiss, onOpenPortfolio }) {
  useEffect(() => {
    if (!data) return undefined
    const timer = setTimeout(() => onDismiss(), 9000)
    return () => clearTimeout(timer)
  }, [data, onDismiss])

  if (!data) return null

  return (
    <div style={{
      position:'fixed', inset:0, zIndex:9950,
      background:'rgba(5,6,8,0.78)',
      backdropFilter:'blur(22px)', WebkitBackdropFilter:'blur(22px)',
      display:'flex', alignItems:'center', justifyContent:'center',
      padding:'24px',
    }}>
      {[...Array(22)].map((_, index) => (
        <div key={index} style={{
          position:'absolute',
          left:`${8 + ((index * 13) % 84)}%`,
          top:`${-8 + ((index * 7) % 24)}%`,
          width:6 + (index % 4),
          height:10 + (index % 5),
          borderRadius:index % 3 === 0 ? 9999 : 4,
          background:[T.teal, T.blue, T.mastery, T.amber][index % 4],
          animation:`confettiFall ${1.8 + ((index % 5) * 0.18)}s ${(index % 6) * 0.06}s ease-in both`,
          opacity:0.95,
          transform:`rotate(${index * 17}deg)`,
          pointerEvents:'none',
        }}/>
      ))}

      <div style={{
        width:'100%', maxWidth:540,
        borderRadius:28,
        border:`1px solid ${T.tealBorder}`,
        background:'linear-gradient(150deg, rgba(14,245,194,0.12), rgba(255,255,255,0.04))',
        boxShadow:'0 30px 90px rgba(0,0,0,0.38), inset 0 1px 0 rgba(255,255,255,0.10)',
        padding:'28px 24px',
        position:'relative',
        overflow:'hidden',
      }}>
        <div style={{
          position:'absolute', inset:'auto -80px -100px auto',
          width:220, height:220, borderRadius:'50%',
          background:'radial-gradient(circle, rgba(14,245,194,0.18) 0%, transparent 72%)',
          filter:'blur(10px)',
        }}/>

        <div style={{display:'inline-flex',alignItems:'center',gap:8,padding:'7px 12px',borderRadius:9999,background:'rgba(14,245,194,0.10)',border:`1px solid ${T.tealBorder}`,marginBottom:14}}>
          <IconGlyph name="award" size={14} strokeWidth={2.4} color={T.teal}/>
          <span style={{fontSize:10,fontWeight:900,letterSpacing:'0.16em',textTransform:'uppercase',color:T.teal}}>Course Complete</span>
        </div>

        <div style={{fontSize:30,fontWeight:900,color:T.text,letterSpacing:'-0.05em',lineHeight:1.05,marginBottom:10}}>
          {data.goalText}
        </div>
        <div style={{fontSize:14,color:T.textSec,lineHeight:1.7,marginBottom:18}}>
          You finished the full course and cleared the comprehensive final exam. This completion is now saved in your portfolio.
        </div>

        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(132px,1fr))',gap:10,marginBottom:18}}>
          {[
            { label:'Final exam', value:`${data.examScore}%`, icon:'check_circle', tone:T.teal },
            { label:'Grade', value:data.grade, icon:'badge', tone:T.amber },
            { label:'Reward', value:`+${data.rewardXp} XP`, icon:'sparkles', tone:T.mastery },
            { label:'Gems', value:`+${data.rewardGems}`, icon:'diamond', tone:T.blue },
          ].map((stat) => (
            <div key={stat.label} style={{borderRadius:18,border:`1px solid ${T.border}`,background:'rgba(255,255,255,0.04)',padding:'14px 12px'}}>
              <div style={{display:'flex',alignItems:'center',gap:7,marginBottom:8}}>
                <IconGlyph name={stat.icon} size={14} strokeWidth={2.3} color={stat.tone}/>
                <span style={{fontSize:11,color:T.textMuted,fontWeight:700}}>{stat.label}</span>
              </div>
              <div style={{fontSize:18,fontWeight:900,color:stat.tone}}>{stat.value}</div>
            </div>
          ))}
        </div>

        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,flexWrap:'wrap'}}>
          <div style={{fontSize:12,color:T.textMuted}}>
            Final exam passed in {data.attemptsUsed} attempt{data.attemptsUsed === 1 ? '' : 's'}
          </div>
          <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
            <button onClick={onDismiss} className="interactive-secondary" style={{
              padding:'12px 16px', borderRadius:16, border:`1px solid ${T.border}`, background:'rgba(255,255,255,0.05)',
              color:T.textSec, fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:T.font,
            }}>
              Close
            </button>
            <button onClick={onOpenPortfolio} className="interactive-primary" style={{
              padding:'12px 16px', borderRadius:16, border:'none', background:T.primaryGradient, color:T.ink,
              fontSize:14, fontWeight:900, cursor:'pointer', fontFamily:T.font,
              boxShadow:'0 18px 40px rgba(14,245,194,0.18)',
            }}>
              View Portfolio
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function MissionConfettiBurst({ active }) {
  if (!active) return null

  return (
    <div style={{ position:'fixed', inset:0, zIndex:9940, pointerEvents:'none', overflow:'hidden' }}>
      {[...Array(24)].map((_, index) => (
        <div
          key={index}
          style={{
            position:'absolute',
            left:`${6 + ((index * 17) % 88)}%`,
            top:`${-6 + ((index * 5) % 18)}%`,
            width:6 + (index % 5),
            height:10 + (index % 4),
            borderRadius:index % 3 === 0 ? 9999 : 4,
            background:[T.teal, T.blue, T.mastery, T.amber][index % 4],
            animation:`confettiFall ${1.6 + ((index % 4) * 0.18)}s ${(index % 6) * 0.05}s ease-in both`,
            opacity:0.92,
            transform:`rotate(${index * 19}deg)`,
          }}
        />
      ))}
    </div>
  )
}

// ─── XP Level Bar ──────────────────────────────────────────────────────────────
function XPLevelBar({ level, title, xpInLevel, xpForLevel, pct, animating }) {
  return (
    <div style={{maxWidth:600,margin:'0 auto',padding:'0 20px'}}>
      <div style={{
        background:'linear-gradient(145deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))',
        border:`1px solid ${T.border}`, borderRadius:18,
        padding:'12px 14px', backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)',
        display:'flex', alignItems:'center', gap:12,
      }}>
        <MiniProgressRing
          size={34}
          value={xpInLevel}
          total={xpForLevel}
          stroke="var(--theme-mastery)"
          track="rgba(129,140,248,0.12)"
          label={level}
          labelColor="#fff"
          textSize={11}
        />
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:8,marginBottom:7}}>
            <div style={{minWidth:0}}>
              <div style={{fontSize:13,fontWeight:800,color:T.text,lineHeight:1.1}}>Level {level} · {title}</div>
            </div>
            <span style={{fontSize:11,color:T.textMuted,fontWeight:700,whiteSpace:'nowrap'}}>
              {xpInLevel} / {xpForLevel} XP
            </span>
          </div>
          <div className="progress-track" style={{height:6,background:'rgba(255,255,255,0.06)',borderRadius:9999,overflow:'hidden'}}>
            <div className="progress-fill" style={{
              height:'100%', width:`${Math.round(pct*100)}%`,
              background:T.masteryGradientSoft, borderRadius:9999,
              transition: animating ? 'width 0.55s cubic-bezier(0.16,1,0.3,1)' : 'none',
              boxShadow: animating ? '0 0 14px rgba(129,140,248,0.55)' : '0 0 8px rgba(129,140,248,0.22)',
              animation: animating ? 'xpBarGlow 1.2s ease' : 'none',
            }}/>
          </div>
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
    <div style={{maxWidth:600,margin:'0 auto',padding:'0 20px'}}>
      <div style={{
        position:'relative',
        background: allDone
          ? 'linear-gradient(145deg,rgba(14,245,194,0.10) 0%,rgba(0,212,255,0.06) 100%)'
          : 'linear-gradient(145deg,rgba(255,255,255,0.08) 0%,rgba(255,255,255,0.03) 100%)',
        border:`1px solid ${allDone ? T.tealBorder : 'rgba(255,255,255,0.10)'}`,
        borderRadius:24, padding:'22px 20px 20px',
        backdropFilter:'blur(24px)', WebkitBackdropFilter:'blur(24px)',
        boxShadow: allDone
          ? 'inset 0 1px 0 rgba(14,245,194,0.22),0 0 40px rgba(14,245,194,0.08)'
          : 'inset 0 1px 0 rgba(255,255,255,0.10),0 16px 38px rgba(0,0,0,0.24)',
        overflow:'hidden',
      }}>
        <div style={{
          position:'absolute', inset:-1, borderRadius:24, padding:1,
          background:'conic-gradient(from 0deg, rgba(14,245,194,0.00), rgba(14,245,194,0.36), rgba(0,212,255,0.28), rgba(14,245,194,0.00))',
          animation:'missionBorderSpin 12s linear infinite',
          pointerEvents:'none',
          opacity:allDone ? 0.35 : 0.75,
        }}>
          <div style={{ width:'100%', height:'100%', borderRadius:23, background:'transparent' }}/>
        </div>
        <div style={{
          position:'absolute', inset:1, borderRadius:23,
          background:'linear-gradient(180deg, rgba(255,255,255,0.02), transparent 60%)',
          pointerEvents:'none',
        }}/>
        {/* Label */}
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:14,marginBottom:12,position:'relative'}}>
          <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
            <span style={{fontSize:10,fontWeight:800,letterSpacing:'1.8px',
            color:allDone?T.teal:T.textMuted,textTransform:'uppercase'}}>
              Day {dayNumber} Mission
            </span>
            {allDone && (
              <span style={{fontSize:10,fontWeight:700,color:T.ink,
                background:T.teal,padding:'2px 8px',borderRadius:9999}}>Complete</span>
            )}
          </div>
          <MiniProgressRing
            size={40}
            value={completed}
            total={Math.max(total, 1)}
            stroke="var(--theme-primary)"
            track="rgba(255,255,255,0.08)"
            label={`${completed}/${total}`}
            labelColor={allDone ? T.teal : T.textSec}
            textSize={10}
          />
        </div>

        {/* Title */}
        <h1 style={{fontSize:18,fontWeight:800,color:T.text,
          letterSpacing:'-0.3px',lineHeight:1.25,marginBottom:14,position:'relative'}}>
          {concept}
        </h1>

        {/* Meta */}
        <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:14,flexWrap:'wrap',position:'relative'}}>
          {totalMin > 0 && (
            <span style={{display:'flex',alignItems:'center',gap:4,
              fontSize:12,color:T.textMuted,fontWeight:600}}>
              <ClockIcon />~{totalMin} min
            </span>
          )}
          <span style={{display:'flex',alignItems:'center',gap:4,
            fontSize:12,color:'#FCD34D',fontWeight:800}}>
            <BoltIcon />+{reward} XP
          </span>
          <span style={{fontSize:12,color:T.textMuted,fontWeight:600}}>
            {total} tasks
          </span>
        </div>

        {/* Progress bar */}
        <div style={{display:'flex',alignItems:'center',gap:10,position:'relative'}}>
          <div className="progress-track" style={{flex:1,height:6,background:'rgba(255,255,255,0.06)',
            borderRadius:9999,overflow:'hidden'}}>
            <div className="progress-fill" style={{
              height:'100%', width:`${Math.round(pct*100)}%`,
              background:T.primaryGradientSoft, borderRadius:9999,
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

function PathStatusPill({ status, compact = false }) {
  const tone = status === 'completed'
    ? { color:T.teal, bg:'rgba(14,245,194,0.10)', border:T.tealBorder, label:'Completed' }
    : status === 'current'
      ? { color:T.ink, bg:T.primaryGradient, border:'transparent', label:'Current' }
      : status === 'up_next' || status === 'upcoming'
        ? { color:T.blue, bg:'rgba(0,212,255,0.10)', border:'rgba(0,212,255,0.24)', label:'Up next' }
        : { color:T.textMuted, bg:'rgba(255,255,255,0.04)', border:T.border, label:'Locked' }

  return (
    <span style={{
      display:'inline-flex', alignItems:'center', justifyContent:'center',
      minHeight:compact ? 24 : 28,
      padding:compact ? '0 8px' : '0 10px',
      borderRadius:9999,
      background:tone.bg,
      border:`1px solid ${tone.border}`,
      color:tone.color,
      fontSize:compact ? 10 : 11,
      fontWeight:900,
      letterSpacing:'0.10em',
      textTransform:'uppercase',
      whiteSpace:'nowrap',
    }}>
      {tone.label}
    </span>
  )
}

function MasteryStars({ count = 0 }) {
  return (
    <div style={{display:'inline-flex',alignItems:'center',gap:4}}>
      {[0,1,2].map((index) => (
        <IconGlyph
          key={index}
          name="sparkles"
          size={12}
          strokeWidth={2.3}
          color={index < count ? T.amber : 'rgba(255,255,255,0.16)'}
        />
      ))}
    </div>
  )
}

function PathTrackerSummary({ tracker }) {
  const breadcrumb = tracker.breadcrumb.moduleTitle
    ? `${tracker.breadcrumb.moduleTitle} / ${tracker.breadcrumb.unitTitle || 'Current unit'} / ${tracker.breadcrumb.subUnitTitle || 'Current concept'}`
    : 'Your curriculum tracker will appear as soon as your outline is ready.'

  return (
    <div style={{maxWidth:720,margin:'0 auto',padding:'0 20px'}}>
      <div style={{
        position:'relative',
        borderRadius:26,
        border:`1px solid ${T.border}`,
        background:'linear-gradient(145deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))',
        padding:'22px 20px',
        backdropFilter:'blur(24px)', WebkitBackdropFilter:'blur(24px)',
        boxShadow:'inset 0 1px 0 rgba(255,255,255,0.10),0 16px 40px rgba(0,0,0,0.24)',
        overflow:'hidden',
      }}>
        <div style={{
          position:'absolute', right:-60, top:-70, width:180, height:180, borderRadius:'50%',
          background:'radial-gradient(circle, rgba(14,245,194,0.18) 0%, transparent 72%)',
          filter:'blur(12px)', pointerEvents:'none',
        }}/>

        <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:16,marginBottom:18,position:'relative'}}>
          <div style={{minWidth:0,flex:1}}>
            <div style={{display:'inline-flex',alignItems:'center',gap:8,marginBottom:10,
              padding:'6px 12px',borderRadius:9999,background:'rgba(14,245,194,0.08)',border:`1px solid ${T.tealBorder}`}}>
              <IconGlyph name="map" size={14} strokeWidth={2.3} color={T.teal}/>
              <span style={{fontSize:10,fontWeight:900,letterSpacing:'0.16em',textTransform:'uppercase',color:T.teal}}>
                Curriculum Tracker
              </span>
            </div>
            <div style={{fontSize:28,fontWeight:900,color:T.text,letterSpacing:'-0.05em',lineHeight:1.05,marginBottom:10}}>
              {tracker.overallPercent}% complete
            </div>
            <div style={{fontSize:13,color:T.textSec,lineHeight:1.65,marginBottom:12}}>
              {breadcrumb}
            </div>
            <div className="progress-track" style={{height:8,background:'rgba(255,255,255,0.06)',borderRadius:9999,overflow:'hidden',maxWidth:420}}>
              <div className="progress-fill" style={{
                height:'100%',
                width:`${tracker.overallPercent}%`,
                background:T.primaryGradientSoft,
                borderRadius:9999,
                transition:'width 0.45s cubic-bezier(0.16,1,0.3,1)',
                boxShadow:'0 0 16px rgba(14,245,194,0.24)',
              }}/>
            </div>
          </div>

          <div style={{
            minWidth:120,
            borderRadius:22,
            border:`1px solid ${T.border}`,
            background:'rgba(255,255,255,0.04)',
            padding:'14px 12px',
            textAlign:'center',
          }}>
            <div style={{fontSize:10,fontWeight:900,letterSpacing:'0.16em',textTransform:'uppercase',color:T.textMuted,marginBottom:8}}>
              Modules
            </div>
            <div style={{fontSize:30,fontWeight:900,color:T.teal,lineHeight:1}}>
              {tracker.completedModules}/{tracker.totalModules}
            </div>
            <div style={{fontSize:11,color:T.textMuted,marginTop:4}}>completed</div>
          </div>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(150px, 1fr))',gap:10,position:'relative'}}>
          {[
            {
              label:'Current module',
              value:tracker.breadcrumb.moduleTitle || 'Waiting on outline',
              icon:'layers',
              tone:T.text,
            },
            {
              label:'Current focus',
              value:tracker.breadcrumb.unitTitle || 'No active unit',
              icon:'goal',
              tone:T.text,
            },
            {
              label:'Current sub-unit',
              value:tracker.breadcrumb.subUnitTitle || 'No active sub-unit',
              icon:'sparkles',
              tone:T.textSec,
            },
            {
              label:'Next up',
              value:tracker.nextUpLabel || 'Keep going',
              icon:'rocket',
              tone:T.teal,
            },
            {
              label:'Identity',
              value:tracker.latestIdentityLabel || 'Seals unlock profile titles',
              icon:'badge',
              tone:tracker.latestIdentityLabel ? T.amber : T.textMuted,
            },
          ].map((entry) => (
            <div key={entry.label} style={{
              borderRadius:16,border:`1px solid ${T.border}`,background:'rgba(255,255,255,0.03)',
              padding:'12px 12px',
            }}>
              <div style={{display:'flex',alignItems:'center',gap:7,marginBottom:8}}>
                <IconGlyph name={entry.icon} size={14} strokeWidth={2.3} color={T.textMuted}/>
                <span style={{fontSize:11,color:T.textMuted,fontWeight:700}}>{entry.label}</span>
              </div>
              <div style={{fontSize:13,fontWeight:800,color:entry.tone,lineHeight:1.35}}>
                {entry.value}
              </div>
            </div>
          ))}
        </div>

        <div style={{display:'flex',alignItems:'center',gap:12,flexWrap:'wrap',marginTop:14,position:'relative'}}>
          <span style={{fontSize:12,fontWeight:700,color:T.textMuted}}>
            Weighted progress {tracker.overallCompletedWeight}/{tracker.overallTotalWeight}
          </span>
          <span style={{fontSize:12,fontWeight:700,color:T.textMuted}}>
            {tracker.sealedModules} module seal{tracker.sealedModules === 1 ? '' : 's'} earned
          </span>
        </div>
      </div>
    </div>
  )
}

function PathSubUnitRow({ subUnit }) {
  const tone = subUnit.status === 'completed'
    ? { color:T.teal, bg:'rgba(14,245,194,0.10)', border:T.tealBorder, icon:'check_circle' }
    : subUnit.status === 'current'
      ? { color:T.ink, bg:T.primaryGradient, border:'transparent', icon:'goal' }
      : subUnit.status === 'up_next'
        ? { color:T.blue, bg:'rgba(0,212,255,0.10)', border:'rgba(0,212,255,0.22)', icon:'sparkles' }
        : { color:T.textMuted, bg:'rgba(255,255,255,0.04)', border:T.border, icon:'lock' }

  return (
    <div style={{
      display:'flex',alignItems:'center',gap:10,
      padding:'10px 12px',
      borderRadius:14,
      background:subUnit.status === 'completed' ? 'rgba(14,245,194,0.05)' : 'rgba(255,255,255,0.025)',
      border:`1px solid ${subUnit.status === 'completed' ? 'rgba(14,245,194,0.12)' : 'rgba(255,255,255,0.06)'}`,
    }}>
      <div style={{
        width:24,height:24,borderRadius:'50%',flexShrink:0,
        display:'flex',alignItems:'center',justifyContent:'center',
        background:tone.bg,border:`1px solid ${tone.border}`,
      }}>
        <IconGlyph name={tone.icon} size={12} strokeWidth={2.4} color={tone.color}/>
      </div>
      <div style={{flex:1,minWidth:0,fontSize:13,fontWeight:700,color:subUnit.status === 'locked' ? T.textMuted : T.text,
        lineHeight:1.35}}>
        {subUnit.title}
      </div>
      {subUnit.status === 'current' && (
        <span style={{fontSize:10,fontWeight:900,color:T.ink,background:T.teal,padding:'2px 8px',borderRadius:9999,whiteSpace:'nowrap'}}>
          Current
        </span>
      )}
      {subUnit.status === 'up_next' && (
        <span style={{fontSize:10,fontWeight:900,color:T.blue,background:'rgba(0,212,255,0.10)',padding:'2px 8px',borderRadius:9999,whiteSpace:'nowrap'}}>
          Next
        </span>
      )}
    </div>
  )
}

function PathProjectCard({ item }) {
  const isFinalExam = item.type === 'final_exam'
  const projectLabel = isFinalExam
    ? 'Final Exam'
    : item.kind === 'full_project'
      ? 'Milestone Project'
      : 'Mini Project'
  return (
    <div style={{
      position:'relative',
      borderRadius:20,
      border:`1px solid ${item.status === 'completed' ? 'rgba(167,139,250,0.26)' : item.status === 'current' ? 'rgba(167,139,250,0.40)' : item.status === 'up_next' ? 'rgba(167,139,250,0.28)' : 'rgba(167,139,250,0.18)'}`,
      background:item.status === 'current'
        ? 'linear-gradient(145deg, rgba(167,139,250,0.14), rgba(14,245,194,0.06))'
        : 'linear-gradient(145deg, rgba(167,139,250,0.08), rgba(255,255,255,0.03))',
      padding:'16px 16px',
      boxShadow:item.status === 'current' ? '0 12px 26px rgba(167,139,250,0.12)' : 'none',
      opacity:item.status === 'locked' ? 0.84 : 1,
    }}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,marginBottom:12}}>
        <div style={{display:'flex',alignItems:'center',gap:10,minWidth:0}}>
          <div style={{
            width:40,height:40,borderRadius:14,flexShrink:0,
            display:'flex',alignItems:'center',justifyContent:'center',
            background:'rgba(167,139,250,0.14)',border:'1px solid rgba(167,139,250,0.24)',
            color:T.mastery,
          }}>
            <IconGlyph name={isFinalExam ? 'award' : 'hammer'} size={18} strokeWidth={2.3}/>
          </div>
          <div style={{minWidth:0}}>
            <div style={{fontSize:10,fontWeight:900,letterSpacing:'0.16em',textTransform:'uppercase',color:T.mastery,marginBottom:4}}>
              {projectLabel}
            </div>
            <div style={{fontSize:14,fontWeight:800,color:T.text,lineHeight:1.3}}>
              {item.title}
            </div>
            <div style={{fontSize:12,color:T.textMuted,marginTop:4}}>
              {item.milestoneLabel}
            </div>
          </div>
        </div>
        <PathStatusPill status={item.status} compact/>
      </div>

      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:12,color:T.textSec,lineHeight:1.5}}>
          {item.generated
            ? isFinalExam
              ? item.completed
                ? `Passed with a best score of ${item.bestScore || item.passScore || 80}%.`
                : `Pass with ${item.passScore || 80}% or better. ${Math.max(0, (item.maxAttempts || 3) - (item.attemptsUsed || 0))} attempt${Math.max(0, (item.maxAttempts || 3) - (item.attemptsUsed || 0)) === 1 ? '' : 's'} remaining.`
              : `${item.impactLabel} ${item.kind === 'mini_project' ? 'This day is only the project.' : 'This is a full dedicated project day.'}`
            : isFinalExam
              ? 'This exam appears once the full course body is complete.'
              : 'This dedicated project day appears in your course sequence and unlocks when the module is complete.'}
        </span>
        {(item.status === 'current' || item.status === 'up_next') && (
          <span style={{display:'inline-flex',alignItems:'center',gap:6,fontSize:11,fontWeight:800,color:T.mastery}}>
            <IconGlyph name={item.status === 'current' ? 'rocket' : 'sparkles'} size={13} strokeWidth={2.3} color={T.mastery}/>
            {item.status === 'current'
              ? (isFinalExam ? 'Current finish line' : 'Current milestone')
              : (isFinalExam ? 'Finish line ahead' : 'Next milestone')}
          </span>
        )}
      </div>
    </div>
  )
}

function PathUnitCard({ item, expanded, onToggle }) {
  const current = item.status === 'current'
  const upcoming = item.status === 'up_next'
  const locked = item.status === 'locked'

  return (
    <div style={{
      borderRadius:20,
      border:`1px solid ${current ? T.tealBorder : item.status === 'completed' ? 'rgba(14,245,194,0.16)' : T.border}`,
      background: current
        ? 'linear-gradient(145deg, rgba(14,245,194,0.08), rgba(0,212,255,0.05))'
        : item.status === 'completed'
          ? 'linear-gradient(145deg, rgba(14,245,194,0.05), rgba(255,255,255,0.03))'
          : 'linear-gradient(145deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))',
      overflow:'hidden',
      boxShadow: current ? '0 12px 28px rgba(14,245,194,0.10)' : 'none',
      opacity: locked ? 0.76 : 1,
    }}>
      <button onClick={onToggle} className="interactive-secondary" style={{
        width:'100%', background:'none', border:'none', textAlign:'left',
        padding:'16px 16px', cursor:'pointer', fontFamily:T.font,
        display:'flex', alignItems:'center', gap:12,
      }}>
        <div style={{
          width:42,height:42,borderRadius:16,flexShrink:0,
          display:'flex',alignItems:'center',justifyContent:'center',
          background:item.status === 'completed'
            ? T.primaryGradient
            : current ? 'rgba(14,245,194,0.12)'
            : upcoming ? 'rgba(0,212,255,0.10)'
            : 'rgba(255,255,255,0.05)',
          color:item.status === 'completed' ? T.ink : current ? T.teal : upcoming ? T.blue : T.textMuted,
          border:`1px solid ${current ? T.tealBorder : upcoming ? 'rgba(0,212,255,0.18)' : 'rgba(255,255,255,0.06)'}`,
          animation:current ? 'pulseActive 2.5s ease-in-out infinite' : 'none',
        }}>
          {item.status === 'completed'
            ? <IconGlyph name="check" size={16} strokeWidth={2.7} color={T.ink}/>
            : <span style={{fontSize:14,fontWeight:900}}>{item.dayNumber}</span>}
        </div>

        <div style={{flex:1,minWidth:0}}>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6,flexWrap:'wrap'}}>
            <div style={{fontSize:15,fontWeight:800,color:locked ? T.textSec : T.text,lineHeight:1.25,minWidth:0}}>
              {item.title}
            </div>
            {item.hasAdjacentProject && (
              <span style={{
                display:'inline-flex',alignItems:'center',gap:5,
                padding:'3px 8px',borderRadius:9999,
                background:'rgba(167,139,250,0.10)',border:'1px solid rgba(167,139,250,0.18)',
                color:T.mastery,fontSize:10,fontWeight:900,letterSpacing:'0.08em',textTransform:'uppercase',
              }}>
                <IconGlyph name="hammer" size={11} strokeWidth={2.3} color={T.mastery}/>
                Project
              </span>
            )}
          </div>
          <div style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap',marginBottom:8}}>
            <PathStatusPill status={item.status} compact/>
            <span style={{fontSize:12,fontWeight:700,color:item.status === 'completed' ? T.teal : T.textSec}}>
              {item.completionPercent}% complete
            </span>
            <span style={{display:'inline-flex',alignItems:'center',gap:5,fontSize:12,color:T.textMuted}}>
              <ClockIcon/>~{item.estimatedMinutes} min
            </span>
          </div>
          <div className="progress-track" style={{height:6,background:'rgba(255,255,255,0.06)',borderRadius:9999,overflow:'hidden'}}>
            <div className="progress-fill" style={{
              height:'100%',width:`${item.completionPercent}%`,
              background:item.status === 'completed'
                ? T.primaryGradientSoft
                : item.status === 'current'
                  ? T.primaryGradientSoft
                  : 'linear-gradient(90deg, rgba(0,212,255,0.70), rgba(129,140,248,0.70))',
              borderRadius:9999,transition:'width 0.45s cubic-bezier(0.16,1,0.3,1)',
            }}/>
          </div>
        </div>

        <div style={{
          width:30,height:30,borderRadius:'50%',flexShrink:0,
          display:'flex',alignItems:'center',justifyContent:'center',
          background:'rgba(255,255,255,0.04)',border:`1px solid ${T.border}`,
          color:T.textMuted,
          transform:expanded ? 'rotate(90deg)' : 'rotate(0deg)',
          transition:'transform 0.18s cubic-bezier(0.16,1,0.3,1)',
        }}>
          <ArrowRight sz={13}/>
        </div>
      </button>

      {expanded && (
        <div style={{padding:'0 16px 16px'}}>
          <div style={{
            borderRadius:18,border:`1px solid ${T.border}`,background:'rgba(255,255,255,0.03)',
            padding:'14px 14px',
          }}>
            <div style={{fontSize:11,fontWeight:900,letterSpacing:'0.12em',textTransform:'uppercase',color:T.textMuted,marginBottom:8}}>
              Why this matters
            </div>
            <div style={{fontSize:13,color:T.textSec,lineHeight:1.6,marginBottom:12}}>
              {item.whyItMatters}
            </div>

            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(140px,1fr))',gap:10,marginBottom:12}}>
              <div style={{padding:'10px 12px',borderRadius:14,background:'rgba(255,255,255,0.03)',border:`1px solid ${T.border}`}}>
                <div style={{fontSize:10,fontWeight:800,color:T.textMuted,letterSpacing:'0.10em',textTransform:'uppercase',marginBottom:5}}>
                  Progress
                </div>
                <div style={{fontSize:13,fontWeight:800,color:T.text}}>
                  {item.completedTasks}/{Math.max(item.totalTasks, 0)} learning tasks
                </div>
              </div>
              <div style={{padding:'10px 12px',borderRadius:14,background:'rgba(255,255,255,0.03)',border:`1px solid ${T.border}`}}>
                <div style={{fontSize:10,fontWeight:800,color:T.textMuted,letterSpacing:'0.10em',textTransform:'uppercase',marginBottom:5}}>
                  Completion context
                </div>
                <div style={{fontSize:13,fontWeight:700,color:T.textSec,lineHeight:1.4}}>
                  {item.completionContext}
                </div>
              </div>
            </div>

            <div style={{fontSize:11,fontWeight:900,letterSpacing:'0.12em',textTransform:'uppercase',color:T.textMuted,marginBottom:10}}>
              Sub-units
            </div>
            <div style={{display:'grid',gap:8}}>
              {item.subUnits.map((subUnit) => (
                <PathSubUnitRow key={`${item.id}-${subUnit.id}`} subUnit={subUnit}/>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function PathModuleCard({ module, expanded, onToggle, expandedUnits, onToggleUnit, index }) {
  return (
    <StaggerBlock index={index}>
      <div style={{
        borderRadius:24,
        border:`1px solid ${module.status === 'current' ? T.tealBorder : module.status === 'completed' ? 'rgba(14,245,194,0.18)' : T.border}`,
        background: module.status === 'current'
          ? 'linear-gradient(145deg, rgba(14,245,194,0.08), rgba(255,255,255,0.02))'
          : 'linear-gradient(145deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))',
        overflow:'hidden',
        boxShadow: module.status === 'current' ? '0 16px 34px rgba(14,245,194,0.08)' : '0 10px 28px rgba(0,0,0,0.20)',
        opacity: module.status === 'upcoming' ? 0.92 : 1,
      }}>
        <button onClick={onToggle} className="interactive-secondary" style={{
          width:'100%', background:'none', border:'none', textAlign:'left',
          padding:'18px 18px', cursor:'pointer', fontFamily:T.font,
          display:'flex', alignItems:'center', gap:14,
        }}>
          <MiniProgressRing
            size={46}
            value={module.progressPercent}
            total={100}
            stroke={module.status === 'completed' ? 'var(--theme-primary)' : module.status === 'current' ? 'var(--theme-primary)' : 'rgba(255,255,255,0.28)'}
            track="rgba(255,255,255,0.08)"
            label={`${module.progressPercent}%`}
            labelColor={module.status === 'completed' ? T.teal : module.status === 'current' ? T.text : T.textSec}
            textSize={10}
          />
          <div style={{flex:1,minWidth:0}}>
            <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap',marginBottom:7}}>
              <div style={{fontSize:17,fontWeight:800,color:T.text,lineHeight:1.2,minWidth:0}}>
                {module.title}
              </div>
              <PathStatusPill status={module.status} compact/>
            </div>
            <div style={{fontSize:13,color:T.textSec,lineHeight:1.55,marginBottom:10}}>
              {module.description || 'Structured progression for this section of your course.'}
            </div>
            <div style={{display:'flex',alignItems:'center',gap:12,flexWrap:'wrap'}}>
              <span style={{fontSize:12,fontWeight:700,color:T.textMuted}}>
                {module.completedUnits}/{module.totalUnits} units complete
              </span>
              <span style={{fontSize:12,fontWeight:700,color:T.textMuted}}>
                Weighted progress {module.completedWeight}/{module.totalWeight}
              </span>
              <span style={{display:'inline-flex',alignItems:'center',gap:6,fontSize:12,fontWeight:800,color:module.sealEarned ? T.amber : T.textSec}}>
                <MasteryStars count={module.masteryStars}/>
                {module.sealEarned ? 'Seal earned' : `${module.masteryScore}% mastery`}
              </span>
            </div>
          </div>
          <div style={{
            width:34,height:34,borderRadius:'50%',flexShrink:0,
            display:'flex',alignItems:'center',justifyContent:'center',
            background:'rgba(255,255,255,0.04)',border:`1px solid ${T.border}`,
            color:T.textMuted,
            transform:expanded ? 'rotate(90deg)' : 'rotate(0deg)',
            transition:'transform 0.18s cubic-bezier(0.16,1,0.3,1)',
          }}>
            <ArrowRight sz={14}/>
          </div>
        </button>

        {expanded && (
          <div style={{padding:'0 18px 18px',display:'grid',gap:12}}>
            <div style={{
              borderRadius:18,
              border:`1px solid ${module.sealEarned ? 'rgba(251,191,36,0.24)' : T.border}`,
              background:module.sealEarned
                ? 'linear-gradient(145deg, rgba(251,191,36,0.12), rgba(255,255,255,0.04))'
                : 'rgba(255,255,255,0.03)',
              padding:'14px 16px',
              display:'grid',
              gap:10,
            }}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:10,flexWrap:'wrap'}}>
                <div>
                  <div style={{fontSize:11,fontWeight:900,letterSpacing:'0.12em',textTransform:'uppercase',color:T.textMuted,marginBottom:6}}>
                    Module Mastery
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
                    <MasteryStars count={module.masteryStars}/>
                    <span style={{fontSize:13,fontWeight:800,color:module.sealEarned ? T.amber : T.text}}>
                      {module.sealEarned ? 'Mastery Seal unlocked' : `${module.masteryScore}% mastery track`}
                    </span>
                  </div>
                  <div style={{fontSize:12,color:T.textSec,lineHeight:1.5}}>
                    {module.sealEarned
                      ? `${module.rewardClaimed ? 'Bonus chest claimed' : 'Bonus chest ready'} · ${module.identityLabel}`
                      : `Keep clearing units and scoring well on quizzes and challenges to complete this seal.`}
                  </div>
                </div>
                <div style={{textAlign:'right'}}>
                  <div style={{fontSize:11,fontWeight:800,color:T.textMuted,letterSpacing:'0.08em',textTransform:'uppercase',marginBottom:4}}>
                    Bonus chest
                  </div>
                  <div style={{fontSize:18,fontWeight:900,color:module.sealEarned ? T.teal : T.textSec}}>
                    +{module.rewardAmount}
                  </div>
                  <div style={{fontSize:11,color:T.textMuted}}>
                    {module.rewardClaimed ? 'claimed' : 'gems on seal'}
                  </div>
                </div>
              </div>
            </div>
            {module.items.map((item, itemIndex) => (
              item.type === 'project' || item.type === 'final_exam'
                ? <PathProjectCard key={`${module.id}:${item.id}:${item.sequenceIndex || item.dayNumber || itemIndex}`} item={item}/>
                : (
                  <PathUnitCard
                    key={`${module.id}:${item.id}:${item.sequenceIndex || item.dayNumber || itemIndex}`}
                    item={item}
                    expanded={Boolean(expandedUnits[item.id])}
                    onToggle={() => onToggleUnit(item.id)}
                  />
                )
            ))}
          </div>
        )}
      </div>
    </StaggerBlock>
  )
}

// ─── Energy Selector ───────────────────────────────────────────────────────────
function EnergySelector({ value, onChange }) {
  return (
    <div style={{maxWidth:600,margin:'0 auto',padding:'0 20px'}}>
      <div style={{fontSize:11,fontWeight:700,color:T.textMuted,
        textTransform:'uppercase',letterSpacing:'1.2px',marginBottom:8}}>
        Energy today
      </div>
      <div style={{display:'flex',gap:6,overflowX:'auto',paddingBottom:2}}>
        {ENERGY_OPTIONS.map(opt => {
          const active = value === opt.key
          return (
            <button key={opt.key} onClick={() => onChange(opt.key)} className="interactive-secondary" style={{
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
              <IconGlyph name={opt.icon} size={14} strokeWidth={2.4}/>
              {opt.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Task type descriptions (for preview) ───────────────────────────────────
const TASK_TYPE_INFO = {
  lesson:     { icon:'book',         what:'Interactive slideshow lesson with quizzes woven in to test understanding as you learn.' },
  video:      { icon:'clapperboard', what:'Watch a curated video on this topic, then reflect on the key takeaways.' },
  practice:   { icon:'hammer',       what:'Hands-on practice project with step-by-step guidance to build something real.' },
  exercise:   { icon:'dumbbell',     what:'Structured exercise with clear steps to work through and check off as you go.' },
  quiz:       { icon:'message_question', what:'Multi-question quiz to test your knowledge and get instant feedback on every answer.' },
  review:     { icon:'repeat',       what:'Review previously learned concepts to strengthen your understanding.' },
  reading:    { icon:'scroll',       what:'In-depth article with key terms highlighted so you can read at your own pace.' },
  flashcard:  { icon:'layers',       what:'Flip through cards to memorize key concepts and track what is landing.' },
  discussion: { icon:'message',      what:'Thought-provoking reflection prompts to deepen understanding through writing.' },
  challenge:  { icon:'timer',        what:'Timed challenge that tests your skills under pressure, with hints if you get stuck.' },
  capstone:   { icon:'folder_kanban', what:'Multi-step capstone project with milestones so you build something portfolio-worthy.' },
  project:    { icon:'rocket',       what:'Portfolio project that turns what you learned into something real you can share.' },
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
  project:    'Start Project',
}

function canRerollTask(task) {
  return Boolean(task) && !task.completed && !['project', 'boss', 'capstone', 'quiz'].includes(task.type)
}

// ─── Task Preview Modal ────────────────────────────────────────────────────────
function TaskPreview({ task, onClose, onStart, onComplete, onReroll, rerollCount = 0, isCompleting, rerollingTaskId = null }) {
  const ts   = taskStyle(task.type)
  const xp   = xpForTask(task.type)
  const info = TASK_TYPE_INFO[task.type] || TASK_TYPE_INFO.lesson
  const me   = isCompleting === task.id
  const anyCompleting = Boolean(isCompleting)
  const canUseReroll = canRerollTask(task) && rerollCount > 0 && !anyCompleting && rerollingTaskId !== task.id
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
          <div style={{
            width: 32,
            height: 32,
            borderRadius: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: ts.bg,
            color: ts.color,
            border: `1px solid ${ts.border}`,
            flexShrink: 0,
          }}>
            <IconGlyph name={info.icon} size={16} strokeWidth={2.3}/>
          </div>
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
            fontSize:13, color:T.blue, fontWeight:600,
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
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            {canRerollTask(task) && (
              <button
                disabled={!canUseReroll}
                className={canUseReroll ? 'interactive-secondary' : undefined}
                onClick={() => { onClose(); onReroll?.(task) }}
                style={{
                  width:'100%',
                  padding:'12px 14px',
                  background: canUseReroll ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.03)',
                  border:`1px solid ${canUseReroll ? T.border : T.borderAlt}`,
                  borderRadius:14,
                  color: canUseReroll ? T.text : T.textMuted,
                  fontSize:13,
                  fontWeight:800,
                  cursor: canUseReroll ? 'pointer' : 'default',
                  fontFamily:T.font,
                  display:'flex',
                  alignItems:'center',
                  justifyContent:'space-between',
                }}
              >
                <span style={{display:'inline-flex',alignItems:'center',gap:7}}>
                  <IconGlyph name="repeat" size={14} strokeWidth={2.4} color={canUseReroll ? T.textSec : T.textDead}/>
                  {rerollingTaskId === task.id ? 'Refreshing task…' : 'Use Task Reroll'}
                </span>
                <span style={{fontSize:11,fontWeight:900,color:canUseReroll ? T.teal : T.textMuted,letterSpacing:'0.08em',textTransform:'uppercase'}}>
                  {rerollCount} left
                </span>
              </button>
            )}
            <div style={{display:'flex',gap:10}}>
            <button onClick={() => { onClose(); onStart(task) }} className="interactive-secondary" style={{
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
              className={anyCompleting ? undefined : 'interactive-cta'}
              onClick={e => { onClose(); onComplete(task, e) }}
              style={{
                flex:'none', padding:'14px 20px',
                background: anyCompleting ? 'rgba(255,255,255,0.04)' : T.primaryGradient,
                border: anyCompleting ? `1px solid ${T.border}` : 'none',
                borderRadius:14, color: anyCompleting ? T.textMuted : T.ink,
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
  const isCourseFinalTask = isCourseFinalExamTask(task)
  const finalExamMeta = task?._courseFinal || {}
  const finalExamAttemptsRemaining = Math.max(0, (Number(finalExamMeta.maxAttempts) || 3) - (Number(finalExamMeta.attemptsUsed) || 0))

  return (
    <div
      onClick={() => onPreview(task)}
      className="interactive-card"
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

      {isCourseFinalTask && !task.completed && (
        <div style={{
          marginTop:10,
          padding:'10px 12px',
          borderRadius:14,
          background:'rgba(251,191,36,0.08)',
          border:'1px solid rgba(251,191,36,0.18)',
          display:'flex',
          alignItems:'center',
          justifyContent:'space-between',
          gap:10,
          flexWrap:'wrap',
        }}>
          <span style={{fontSize:11,fontWeight:800,color:'#FBBF24'}}>
            Pass score {finalExamMeta.passScore || 80}%
          </span>
          <span style={{fontSize:11,color:T.textSec}}>
            {finalExamAttemptsRemaining} attempt{finalExamAttemptsRemaining === 1 ? '' : 's'} remaining
          </span>
        </div>
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
    <div style={{maxWidth:600,margin:'0 auto',padding:'0 20px'}}>
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

function countCompletedTasks(tasks) {
  const safeTasks = Array.isArray(tasks) ? tasks : []
  return safeTasks.filter((task) => task.completed).length
}

function deriveTaskRowStatus(tasks, fallback = 'not_started') {
  const safeTasks = Array.isArray(tasks) ? tasks : []
  const completedCount = countCompletedTasks(safeTasks)
  if (safeTasks.length > 0 && completedCount === safeTasks.length) return 'completed'
  if (completedCount > 0) return 'in_progress'
  return fallback
}

function applyCompletedTaskFloor(rows, completionFloor) {
  if (!Array.isArray(rows) || !completionFloor?.size) return Array.isArray(rows) ? rows : []

  return rows.map((row) => {
    const completedIds = completionFloor.get(row.id)
    const rowTasks = Array.isArray(row.tasks) ? row.tasks : []
    if (!completedIds?.size || rowTasks.length === 0) return row

    let changed = false
    const nextTasks = rowTasks.map((task) => {
      if (!completedIds.has(String(task.id)) || task.completed) return task
      changed = true
      return { ...task, completed: true }
    })

    if (!changed) return row

    const tasksCompleted = countCompletedTasks(nextTasks)
    return {
      ...row,
      tasks: nextTasks,
      tasks_completed: Math.max(Number(row.tasks_completed) || 0, tasksCompleted),
      completion_status: deriveTaskRowStatus(nextTasks, row.completion_status || 'not_started'),
    }
  })
}

function mergeRowsByDayNumber(existingRows, incomingRows) {
  const byDayNumber = new Map()
  ;(Array.isArray(existingRows) ? existingRows : []).forEach((row) => {
    byDayNumber.set(Number(row.day_number), row)
  })
  ;(Array.isArray(incomingRows) ? incomingRows : []).forEach((row) => {
    byDayNumber.set(Number(row.day_number), row)
  })
  return [...byDayNumber.values()].sort((a, b) => (Number(a.day_number) || 0) - (Number(b.day_number) || 0))
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
  const [rerollingTaskId, setRerollingTaskId] = useState(null)

  // Gamification
  const [xpDisplay,   setXpDisplay]   = useState(getLevelProgress(0))
  const [xpAnimating, setXpAnimating] = useState(false)
  const [streakData,  setStreakData]  = useState({ current: 0, longest: 0 })
  const [xpToasts,    setXpToasts]   = useState([])
  const [levelUpData, setLevelUpData] = useState(null)
  const [missionDone, setMissionDone] = useState(false)
  const [showMissionConfetti, setShowMissionConfetti] = useState(false)
  const [showNextDayCTA, setShowNextDayCTA] = useState(false)
  const [advancingNextDay, setAdvancingNextDay] = useState(false)
  const [courseCompleteData, setCourseCompleteData] = useState(null)

  // UI
  const [energy,      setEnergy]      = useState('good')
  const [activeTab,   setActiveTab]   = useState('home')
  const [expandedPathModules, setExpandedPathModules] = useState({})
  const [expandedPathUnits,   setExpandedPathUnits]   = useState({})
  const [ownedThemes, setOwnedThemes] = useState([])
  const [activeTheme, setActiveTheme] = useState('default')
  const [inventoryCounts, setInventoryCounts] = useState({ taskReroll: 0, reviewShield: 0 })
  const [claimedModuleRewardIds, setClaimedModuleRewardIds] = useState([])
  const [moduleRewardToasts, setModuleRewardToasts] = useState([])
  const [showLesson,  setShowLesson]  = useState(null)
  const [previewTask, setPreviewTask] = useState(null)
  const [error,       setError]       = useState('')

  // Goals sidebar
  const [showGoalsSidebar, setShowGoalsSidebar] = useState(false)
  const [allGoals,         setAllGoals]         = useState([])
  const [switchingGoal,    setSwitchingGoal]    = useState(null)

  // Hearts
  const [maxHearts,        setMaxHearts]        = useState(5)
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
  const [badgeToasts, setBadgeToasts] = useState([]) // newly earned badges to show
  useEffect(() => {
    if (badgeToasts.length === 0) return
    const t = setTimeout(() => setBadgeToasts([]), 5000)
    return () => clearTimeout(t)
  }, [badgeToasts])

  // Reward Calendar
  const [rewardCalendar, setRewardCalendar] = useState({ week_start: null, days_claimed: [] })
  const [claimingReward, setClaimingReward] = useState(false)

  // Weekly Challenge
  const [weeklyChallenge, setWeeklyChallenge] = useState(null)
  const [challengeDaysLeft, setChallengeDaysLeft] = useState(0)

  // XP Boost Event
  const [showBoostEvent,   setShowBoostEvent]   = useState(false)

  // Mastery Decay
  const [decayingConcepts, setDecayingConcepts] = useState([])

  // Earned badges
  const [earnedBadgeIds, setEarnedBadgeIds] = useState(new Set())

  const missionConfettiTimerRef = useRef(null)
  const taskReloadTimerRef = useRef(null)
  const holdCompletedDayRef = useRef(false)
  const currentDayRowIdRef = useRef(null)
  const completedTaskIdsByRowRef = useRef(new Map())
  const missionCompletionPromiseRef = useRef(Promise.resolve(true))
  const missionCompletionResolverRef = useRef(null)
  const loadIdRef = useRef(0)  // monotonic counter — stale loads bail out
  const boostCheckedRef = useRef(false)
  const pendingTimersRef = useRef([])
  const isMountedRef = useRef(true)
  const claimingModuleRewardRef = useRef(new Set())
  const outlineRecoveryAttemptedRef = useRef(new Set())
  const tabScrollPositionsRef = useRef({
    home: 0,
    badges: 0,
    shop: 0,
    stats: 0,
    path: 0,
    settings: 0,
  })

  const themeVars = useMemo(() => getDashboardThemeVars(activeTheme), [activeTheme])
  const pageThemeStyle = useMemo(() => ({
    ...themeVars,
    background: 'radial-gradient(circle at top, var(--theme-page-glow), transparent 34%), var(--theme-bg)',
  }), [themeVars])

  const pathTracker = useMemo(() => buildPathOutlineTracker({
    courseOutline: goal?.course_outline,
    rows: allRows,
    todayRowId: todayRow?.id || null,
    goalText: goal?.goal_text || '',
    claimedModuleRewardIds,
  }), [goal?.course_outline, goal?.goal_text, allRows, todayRow?.id, claimedModuleRewardIds])

  const applyTheme = useCallback((themeId) => {
    const nextTheme = themeId === 'default' || ownedThemes.includes(themeId) ? themeId : 'default'
    setActiveTheme(nextTheme)
    setStoredActiveTheme(nextTheme)
  }, [ownedThemes])

  const togglePathModule = useCallback((moduleId) => {
    setExpandedPathModules((prev) => ({ ...prev, [moduleId]: !prev[moduleId] }))
  }, [])

  const togglePathUnit = useCallback((unitId) => {
    setExpandedPathUnits((prev) => ({ ...prev, [unitId]: !prev[unitId] }))
  }, [])

  const resolveMissionCompletion = useCallback((didPersist = true) => {
    if (missionCompletionResolverRef.current) {
      missionCompletionResolverRef.current(didPersist)
      missionCompletionResolverRef.current = null
    }
    missionCompletionPromiseRef.current = Promise.resolve(didPersist)
  }, [])

  const activateDayRow = useCallback((nextRow, rowPool = allRows) => {
    if (!nextRow) return
    const normalizedRows = Array.isArray(rowPool) ? rowPool : []
    const rowIndex = normalizedRows.findIndex((row) => (
      row.id === nextRow.id || Number(row.day_number) === Number(nextRow.day_number)
    ))
    const followingRow = rowIndex >= 0 ? normalizedRows[rowIndex + 1] || null : null

    holdCompletedDayRef.current = false
    currentDayRowIdRef.current = nextRow.id || null
    setTodayRow(nextRow)
    setTasks(Array.isArray(nextRow.tasks) ? nextRow.tasks : [])
    setMissionDone(nextRow.completion_status === 'completed')
    setTomorrowRow(followingRow)
    setShowMissionConfetti(false)
  }, [allRows])

  // ─── Load ──────────────────────────────────────────────────────────────────
  const load = useCallback(async (silent = false, options = {}) => {
    const thisLoadId = ++loadIdRef.current  // claim a load slot
    const preserveGemFloor = Number.isFinite(options?.preserveGemFloor) ? Number(options.preserveGemFloor) : null
    const preferredRowId = options?.preferredRowId || null
    const preferredDayNumber = Number.isFinite(options?.preferredDayNumber) ? Number(options.preferredDayNumber) : null
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
    const hydratedGoal = hydrateGoalCourseOutline(activeGoal)
    setGoal(hydratedGoal)

    // Load all goals for sidebar
    const { data: goalsList } = await supabase
      .from('goals').select('id,goal_text,status,created_at,mode')
      .eq('user_id', me.id).order('created_at', { ascending: false })
    setAllGoals(goalsList || [])

    const [{ data: rows, error: re }, { data: prog, error: progError }] = await Promise.all([
      supabase
        .from('daily_tasks').select('*')
        .eq('goal_id', hydratedGoal.id).eq('user_id', me.id)
        .order('day_number', { ascending: true }),
      supabase
        .from('user_progress').select('total_xp,current_streak,longest_streak,freeze_count,hearts_remaining,hearts_refill_at,total_days,gems,xp_boost_until')
        .eq('goal_id', hydratedGoal.id).eq('user_id', me.id).maybeSingle(),
    ])
    if (re) { setError(re.message); setLoading(false); return }

    // If a newer load() was started while we were awaiting, bail out — it will handle state
    if (thisLoadId !== loadIdRef.current) { setLoading(false); return }

    const scopedSourceRows = filterRowsForCourseWindow(rows || [], Number(prog?.total_days) || 0)
    const taskRows = applyCompletedTaskFloor(scopedSourceRows, completedTaskIdsByRowRef.current)
    const nextCompletionFloor = new Map(completedTaskIdsByRowRef.current)
    taskRows.forEach((row) => {
      const completedIds = (Array.isArray(row.tasks) ? row.tasks : [])
        .filter((task) => task.completed)
        .map((task) => String(task.id))
      if (completedIds.length === 0) return
      const mergedIds = new Set([...(nextCompletionFloor.get(row.id) || []), ...completedIds])
      nextCompletionFloor.set(row.id, mergedIds)
    })
    completedTaskIdsByRowRef.current = nextCompletionFloor
    setAllRows(taskRows)

    const trackerSnapshot = buildPathOutlineTracker({
      courseOutline: hydratedGoal?.course_outline,
      rows: taskRows,
      goalText: hydratedGoal?.goal_text || '',
      claimedModuleRewardIds: [],
    })
    const expectedGoalDayCount = Math.max(
      Number(prog?.total_days) || 0,
      Number(hydratedGoal?.total_days) || 0,
      Number(trackerSnapshot.plannedDayCount) || 0,
    )
    const trackerUnderestimatesCourse = expectedGoalDayCount > (Number(trackerSnapshot.plannedDayCount) || 0)

    const heldCompletedDay = holdCompletedDayRef.current && currentDayRowIdRef.current
      ? taskRows.find(r => r.id === currentDayRowIdRef.current) || null
      : null
    const shouldPreserveCompletedDay = heldCompletedDay?.completion_status === 'completed'
    const preferredRow = !shouldPreserveCompletedDay
      ? (preferredRowId
          ? taskRows.find((row) => row.id === preferredRowId) || null
          : preferredDayNumber != null
          ? taskRows.find((row) => Number(row.day_number) === preferredDayNumber) || null
          : null)
      : null
    const today = shouldPreserveCompletedDay
      ? heldCompletedDay
      : preferredRow
      || trackerSnapshot.currentGeneratedRow
      || trackerSnapshot.lastCompletedRow
      || taskRows.find(r => r.completion_status !== 'completed')
      || taskRows[taskRows.length-1]
    if (!shouldPreserveCompletedDay) holdCompletedDayRef.current = false
    setTodayRow(today || null)
    if (today) {
      const dayTasks = Array.isArray(today.tasks) ? today.tasks : []
      // Use functional updater so we never uncomplete a task that's already completed in UI
      setTasks(prevTasks => {
        if (!prevTasks.length) return dayTasks
        const prevCompletedIds = new Set(prevTasks.filter(t => t.completed).map(t => String(t.id)))
        if (prevCompletedIds.size === 0) return dayTasks
        let patched = false
        const merged = dayTasks.map(t => {
          if (!t.completed && prevCompletedIds.has(String(t.id))) { patched = true; return { ...t, completed: true } }
          return t
        })
        return patched ? merged : dayTasks
      })
      const dayDone = today.completion_status === 'completed'
      const isCompletedFinalExamDay = dayTasks.some(isCourseFinalExamTask)
      setMissionDone(dayDone)
      // If day is already complete on load, show the Next Day button inline
      if (dayDone && !isCompletedFinalExamDay && (!trackerSnapshot.courseCompleted || trackerUnderestimatesCourse)) {
        setShowNextDayCTA(true)
      }
      else if (isCompletedFinalExamDay) setShowNextDayCTA(false)
    }

    const todayIdx   = taskRows.findIndex(r => r.id === today?.id)
    const tomorrowR  = shouldPreserveCompletedDay
      ? trackerSnapshot.currentGeneratedRow || null
      : today?.id === trackerSnapshot.currentGeneratedRow?.id
        ? trackerSnapshot.nextGeneratedRow || null
        : todayIdx >= 0
          ? taskRows[todayIdx+1] || null
          : null
    setTomorrowRow(tomorrowR)

    try {
      const { data: themePurchaseData } = await supabase
        .from('gem_transactions')
        .select('reason')
        .eq('user_id', me.id)
        .in('reason', THEME_TRANSACTION_REASONS)

      const serverOwnedThemes = Array.from(new Set(
        (themePurchaseData || [])
          .map((row) => THEME_REASON_TO_ID[row.reason])
          .filter(Boolean),
      ))
      const mergedOwnedThemes = Array.from(new Set([...getStoredOwnedThemes(), ...serverOwnedThemes]))
      setStoredOwnedThemes(mergedOwnedThemes)
      setOwnedThemes(mergedOwnedThemes)
      setActiveTheme((currentTheme) => (
        currentTheme === 'default' || mergedOwnedThemes.includes(currentTheme)
          ? currentTheme
          : getStoredActiveTheme(mergedOwnedThemes)
      ))
    } catch {
      const localOwnedThemes = getStoredOwnedThemes()
      setOwnedThemes(localOwnedThemes)
      setActiveTheme((currentTheme) => (
        currentTheme === 'default' || localOwnedThemes.includes(currentTheme)
          ? currentTheme
          : getStoredActiveTheme(localOwnedThemes)
      ))
    }

    try {
      const { data: utilityRows } = await supabase
        .from('gem_transactions')
        .select('reason')
        .eq('user_id', me.id)
        .eq('goal_id', hydratedGoal.id)

      const relevantRows = utilityRows || []
      setInventoryCounts(buildInventoryCountsFromTransactions(relevantRows))
      setClaimedModuleRewardIds(getClaimedModuleRewardIds(relevantRows))
    } catch {
      setInventoryCounts({ taskReroll: 0, reviewShield: 0 })
      setClaimedModuleRewardIds([])
    }

    // Only update state if the query succeeded — never reset gems/xp to 0 on error
    if (!progError && prog) {
      const storedXp   = Number(prog.total_xp) || 0
      const computedXp = computeTotalXpFromRows(taskRows)
      const finalXp    = storedXp > 0 ? storedXp : computedXp
      setXpDisplay(getLevelProgress(finalXp))
      setStreakData({ current: prog.current_streak || 0, longest: prog.longest_streak || 0 })
      setFreezeCount(Number(prog.freeze_count) || 0)

      const h = prog.hearts_remaining != null ? Number(prog.hearts_remaining) : HEARTS_BASE
      let resolvedMaxHearts = Math.min(HEARTS_MAX_CAP, Math.max(getStoredMaxHearts(), HEARTS_BASE, h))
      try {
        const { data: heartUpgradeData } = await supabase
          .from('gem_transactions')
          .select('id')
          .eq('user_id', me.id)
          .eq('goal_id', hydratedGoal.id)
          .eq('reason', 'shop_heartContainer')
        const purchasedHeartSlots = (heartUpgradeData || []).length
        const derivedMaxHearts = Math.min(HEARTS_MAX_CAP, HEARTS_BASE + purchasedHeartSlots)
        resolvedMaxHearts = Math.max(resolvedMaxHearts, derivedMaxHearts)
      } catch { /* optional upgrade sync */ }
      setStoredMaxHearts(resolvedMaxHearts)
      setMaxHearts(resolvedMaxHearts)
      setPrevHearts(h)
      setHeartsRemaining(h)
      setHeartsRefillAt(prog.hearts_refill_at || null)

      // ── Gem reconciliation: ensure DB gems reflect actual earnings ──
      const dbGems = Number(prog.gems) || 0
      const completedTaskCount = taskRows.reduce((sum, row) => {
        const ts = Array.isArray(row.tasks) ? row.tasks : []
        return sum + ts.filter(t => t.completed).length
      }, 0)
      const completedDayCount = taskRows.filter(r => r.completion_status === 'completed').length
      const minEarnedGems = completedTaskCount * 5 + completedDayCount * 15

      let finalGems = dbGems
      if (dbGems < minEarnedGems) {
        // DB is behind — compute correct balance accounting for spent gems
        let totalSpent = 0
        try {
          const { data: spentData } = await supabase
            .from('gem_transactions')
            .select('amount')
            .eq('user_id', me.id)
            .eq('goal_id', hydratedGoal.id)
            .lt('amount', 0)
          totalSpent = (spentData || []).reduce((s, t) => s + (Number(t.amount) || 0), 0)
        } catch { /* no transaction table yet — treat spent as 0 */ }

        finalGems = Math.max(dbGems, minEarnedGems + totalSpent) // totalSpent is negative
        if (finalGems > dbGems) {
          supabase
            .from('user_progress')
            .update({ gems: finalGems })
            .eq('user_id', me.id)
            .eq('goal_id', hydratedGoal.id)
            .then(() => {})
            .catch(() => {})
        }
      }
      if (preserveGemFloor != null) finalGems = Math.max(finalGems, preserveGemFloor)
      setGems(finalGems)

      if (prog.total_days) setTotalDaysPlanned(Number(prog.total_days))
      if (prog.xp_boost_until) {
        const until = new Date(prog.xp_boost_until)
        if (until > new Date()) setXpBoostUntil(until)
        else setXpBoostUntil(null)
      }
    } else {
      // Fallback: compute XP from rows, keep current gem/heart state
      setXpDisplay(getLevelProgress(computeTotalXpFromRows(taskRows)))
    }

    // Load new columns separately (won't break if columns don't exist yet)
    try {
      const { data: extra } = await supabase
        .from('user_progress').select('reward_calendar,last_event_date')
        .eq('goal_id', hydratedGoal.id).eq('user_id', me.id).maybeSingle()
      if (extra?.reward_calendar) {
        const cal = extra.reward_calendar
        const weekStart = getWeekStartStr()
        if (cal.week_start === weekStart) setRewardCalendar(cal)
        else setRewardCalendar({ week_start: weekStart, days_claimed: [] })
      }
    } catch { /* new columns may not exist yet */ }

    // Load quests from today's row
    if (today?.quests && Array.isArray(today.quests) && today.quests.length > 0) {
      setQuests(today.quests)
    } else if (today) {
      const { generateDailyQuests } = await import('@/lib/quests')
      const dayTasks = Array.isArray(today.tasks) ? today.tasks : []
      setQuests(generateDailyQuests(today.day_number || 1, dayTasks.length))
    }

    // Load weekly challenge
    try {
      const { data: { session: sess } } = await supabase.auth.getSession()
      const tok = sess?.access_token || null
      const chalRes = await fetch(`/api/weekly-challenge?goalId=${hydratedGoal.id}${tok ? `&token=${tok}` : ''}`, {
        headers: tok ? { Authorization: `Bearer ${tok}` } : {},
      })
      if (chalRes.ok) {
        const chalData = await chalRes.json()
        setWeeklyChallenge(chalData.challenge || null)
        setChallengeDaysLeft(chalData.daysRemaining ?? 0)
      }
    } catch { /* silent */ }

    // Comeback detection
    const currentStreak = prog?.current_streak || 0
    const priorDone  = (taskRows || []).filter(r => r.completion_status === 'completed').length
    const isBack     = currentStreak === 0 && priorDone > 0
    setIsComeback(isBack)

    // Analytics: app opened
    track(EVENTS.APP_OPENED, { isComeback: isBack }, {
      userId: me.id, goalId: hydratedGoal.id,
      streakValue: currentStreak, xpBalance: Number(prog?.total_xp) || 0,
    })

    // Mastery decay check (non-blocking)
    try {
      const { data: { session: decaySess } } = await supabase.auth.getSession()
      const dToken = decaySess?.access_token || null
      fetch('/api/decay-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(dToken ? { Authorization: `Bearer ${dToken}` } : {}) },
        body: JSON.stringify({ userId: me.id, goalId: hydratedGoal.id, accessToken: dToken }),
      }).then(r => r.json()).then(d => {
        if (d.shieldConsumed) {
          setInventoryCounts((prev) => ({ ...prev, reviewShield: Number.isFinite(d.reviewShieldRemaining) ? d.reviewShieldRemaining : Math.max(0, (prev.reviewShield || 1) - 1) }))
          setModuleRewardToasts((prev) => [...prev, {
            id: `shield-${Date.now()}`,
            title: 'Review shield used',
            message: `${d.shieldedConceptId || 'A weak concept'} was deferred for one cycle.`,
          }])
        }
        if (d.decaying?.length > 0) setDecayingConcepts(d.decaying)
        else setDecayingConcepts([])
      }).catch(() => {})
    } catch {}

    // Fetch earned badges (non-blocking)
    supabase.from('achievements').select('badge_id').eq('user_id', me.id)
      .then(({ data: badges }) => {
        if (badges) setEarnedBadgeIds(new Set(badges.map(b => b.badge_id)))
      })

    setLoading(false)
    return {
      today: today || null,
      tomorrow: tomorrowR || null,
      tracker: trackerSnapshot,
      rows: taskRows,
      goal: activeGoal,
    }
  }, [router])

  useEffect(() => { load() }, [load])

  // Hydrate theme + maxHearts from localStorage after mount (avoids SSR/client mismatch)
  useEffect(() => {
    const owned = getStoredOwnedThemes()
    setOwnedThemes(owned)
    setActiveTheme(getStoredActiveTheme(owned))
    setMaxHearts(getStoredMaxHearts())
  }, [])

  useEffect(() => {
    if (moduleRewardToasts.length === 0) return
    const timer = setTimeout(() => setModuleRewardToasts([]), 4500)
    return () => clearTimeout(timer)
  }, [moduleRewardToasts])

  useEffect(() => {
    setExpandedPathModules({})
    setExpandedPathUnits({})
  }, [goal?.id])

  useEffect(() => {
    if (!goal?.id || !user?.id || goal?.mode === 'explore') return
    const expectedUnitCount = Math.max(Number(goal?.total_days) || 0, Number(totalDaysPlanned) || 0)
    const likelyBrokenShortCourse = expectedUnitCount > 0 && expectedUnitCount < 5
    if (!likelyBrokenShortCourse && !courseOutlineNeedsRecovery(goal?.course_outline, expectedUnitCount)) return
    if (outlineRecoveryAttemptedRef.current.has(goal.id)) return

    outlineRecoveryAttemptedRef.current.add(goal.id)
    ;(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const token = session?.access_token || null
        const res = await fetch('/api/course-outline-recover', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ goalId: goal.id, userId: user.id, accessToken: token }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok || !data.courseOutline) return

        if (!isMountedRef.current) return
        setGoal((prev) => prev?.id === goal.id ? { ...prev, course_outline: data.courseOutline } : prev)
        if (data.sequenceDayCount) setTotalDaysPlanned(Number(data.sequenceDayCount))
        await load(true)
      } catch {
        // Fallback tracker stays in place if recovery fails.
      }
    })()
  }, [goal?.id, goal?.course_outline, goal?.mode, goal?.total_days, totalDaysPlanned, user?.id, load])

  useEffect(() => {
    if (!Array.isArray(pathTracker.modules) || pathTracker.modules.length === 0) return

    setExpandedPathModules((prev) => {
      const next = { ...prev }
      let changed = false

      pathTracker.modules.forEach((module) => {
        if (next[module.id] == null) {
          next[module.id] = module.id === pathTracker.currentModuleId
          changed = true
        }
      })

      if (pathTracker.currentModuleId && next[pathTracker.currentModuleId] == null) {
        next[pathTracker.currentModuleId] = true
        changed = true
      }

      return changed ? next : prev
    })

    if (pathTracker.currentUnitId) {
      setExpandedPathUnits((prev) => (
        prev[pathTracker.currentUnitId] == null
          ? { ...prev, [pathTracker.currentUnitId]: true }
          : prev
      ))
    }
  }, [pathTracker.currentModuleId, pathTracker.currentUnitId, pathTracker.modules])

  useEffect(() => {
    if (!goal?.id || !user?.id) return
    const nextModuleReward = pathTracker.modules.find((module) => (
      module.sealEarned
      && !module.rewardClaimed
      && !claimingModuleRewardRef.current.has(module.id)
    ))
    if (!nextModuleReward) return

    claimingModuleRewardRef.current.add(nextModuleReward.id)
    ;(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const token = session?.access_token || null
        const res = await fetch('/api/module-mastery-claim', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ goalId: goal.id, moduleId: nextModuleReward.id, accessToken: token }),
        })
        const data = await res.json()
        if (!res.ok || data.alreadyClaimed) {
          setClaimedModuleRewardIds((prev) => Array.from(new Set([...prev, nextModuleReward.id])))
          return
        }
        if (data.newGemTotal != null) setGems(data.newGemTotal)
        if (data.rewardAmount) {
          setGemToasts((prev) => [...prev, { id: Date.now(), amount: data.rewardAmount }])
          setModuleRewardToasts((prev) => [...prev, {
            id: `${nextModuleReward.id}-${Date.now()}`,
            title: nextModuleReward.title,
            rewardAmount: data.rewardAmount,
            identityLabel: data.identityLabel || nextModuleReward.identityLabel,
          }])
        }
        setClaimedModuleRewardIds((prev) => Array.from(new Set([...prev, nextModuleReward.id])))
      } catch {
        // Retry on next render if needed
        claimingModuleRewardRef.current.delete(nextModuleReward.id)
        return
      }
      claimingModuleRewardRef.current.delete(nextModuleReward.id)
    })()
  }, [goal?.id, pathTracker.modules, user?.id])

  useEffect(() => {
    currentDayRowIdRef.current = todayRow?.id || null
  }, [todayRow?.id])

  // Unmount cleanup — clear all pending timers
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      if (missionConfettiTimerRef.current) clearTimeout(missionConfettiTimerRef.current)
      if (taskReloadTimerRef.current) clearTimeout(taskReloadTimerRef.current)
      pendingTimersRef.current.forEach(clearTimeout)
      pendingTimersRef.current = []
    }
  }, [])

  useEffect(() => {
    const nextY = Number(tabScrollPositionsRef.current[activeTab] || 0)
    const frame = window.requestAnimationFrame(() => {
      window.scrollTo({ top: nextY, behavior: 'auto' })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [activeTab])

  const handleTabSelect = useCallback((nextTab) => {
    if (nextTab === activeTab) return
    tabScrollPositionsRef.current[activeTab] = window.scrollY
    setActiveTab(nextTab)
  }, [activeTab])

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
    if (boostCheckedRef.current || loading || !goal || !user) return
    boostCheckedRef.current = true // one-shot — never re-check this session

    const todayStr = new Date().toISOString().split('T')[0]
    const lastEvent = localStorage.getItem('pathai.lastBoostEvent')
    if (lastEvent === todayStr) return
    if (xpBoostUntil) return

    if (Math.random() < 0.25) {
      localStorage.setItem('pathai.lastBoostEvent', todayStr)
      const outerTimer = setTimeout(() => {
        if (!isMountedRef.current) return
        setShowBoostEvent(true)
        const boostEnd = new Date(Date.now() + 15 * 60 * 1000)
        setXpBoostUntil(boostEnd)
        supabase.from('user_progress').update({
          xp_boost_until: boostEnd.toISOString(),
          last_event_date: todayStr,
        }).eq('user_id', user.id).eq('goal_id', goal.id).then(() => {}).catch(() => {})
        const innerTimer = setTimeout(() => {
          if (isMountedRef.current) setShowBoostEvent(false)
        }, 2500)
        pendingTimersRef.current.push(innerTimer)
      }, 2000)
      pendingTimersRef.current.push(outerTimer)
    }
  }, [loading, goal, user, xpBoostUntil])

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
        // Use additive gem update instead of absolute to avoid resetting
        const earned = (data.reward || 0) + (data.perfectWeekBonus || 0)
        setGems(g => g + earned)
        setGemPulse(true)
        pendingTimersRef.current.push(setTimeout(() => { if (isMountedRef.current) setGemPulse(false) }, 400))
        setGemToasts(prev => [...prev, { id: Date.now(), amount: earned }])
      } else if (data.error === 'Already claimed today') {
        // Silently update calendar to reflect claimed state
        const todayIdx = new Date().getDay()
        const calToday = todayIdx === 0 ? 6 : todayIdx - 1
        setRewardCalendar(prev => ({
          ...prev,
          days_claimed: prev.days_claimed?.includes(calToday) ? prev.days_claimed : [...(prev.days_claimed || []), calToday],
        }))
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
  const completeTask = useCallback(async (task, event, metrics = {}) => {
    if (task.completed || completing) return

    if (taskReloadTimerRef.current) {
      clearTimeout(taskReloadTimerRef.current)
      taskReloadTimerRef.current = null
    }

    const rowId = todayRow?.id
    const prevTasks = tasks
    const prevCompletedCount = countCompletedTasks(prevTasks)
    const prevRowStatus = deriveTaskRowStatus(prevTasks, todayRow?.completion_status || 'not_started')
    const isCourseFinalTask = isCourseFinalExamTask(task)
    const xpAmount  = xpForTask(task.type)
    const optimisticTaskGems = 5
    let nextGemFloor = gems + optimisticTaskGems

    // Capture event coordinates eagerly — synthetic event will be recycled after await
    const tapX = event ? event.currentTarget.getBoundingClientRect().left + event.currentTarget.getBoundingClientRect().width / 2 : null
    const tapY = event ? event.currentTarget.getBoundingClientRect().top : null
    const streakTapX = event?.clientX || (typeof window !== 'undefined' ? window.innerWidth / 2 : 200)

    // 1. Immediate optimistic update
    const nextTasks = tasks.map(t => t.id === task.id ? { ...t, completed: true } : t)
    const nextCompletedCount = countCompletedTasks(nextTasks)
    const nextRowStatus = deriveTaskRowStatus(nextTasks, todayRow?.completion_status || 'in_progress')
    setTasks(nextTasks)
    if (rowId) {
      const completedIds = new Set(completedTaskIdsByRowRef.current.get(rowId) || [])
      completedIds.add(String(task.id))
      completedTaskIdsByRowRef.current.set(rowId, completedIds)
      setTodayRow(prev => prev?.id === rowId ? {
        ...prev,
        tasks: nextTasks,
        tasks_completed: nextCompletedCount,
        completion_status: nextRowStatus,
      } : prev)
      setAllRows(prev => prev.map(row => row.id === rowId ? {
        ...row,
        tasks: nextTasks,
        tasks_completed: nextCompletedCount,
        completion_status: nextRowStatus,
      } : row))
    }
    setCompleting(task.id)

    // 2. XP toast at tap position
    if (tapX != null) {
      addXpToast(xpAmount, tapX, tapY)
    }

    // 3. Optimistic XP bar
    const prevXp = xpDisplay.totalXp
    setXpDisplay(getLevelProgress(prevXp + xpAmount))
    setXpAnimating(true)
    pendingTimersRef.current.push(setTimeout(() => {
      if (isMountedRef.current) setXpAnimating(false)
    }, 800))

    // 3a. Optimistic gem bump (+5 per task)
    setGems(g => g + optimisticTaskGems)

    // 3b. Instant mission complete — don't wait for API
    const allDoneNow = nextTasks.every(t => t.completed)
    if (allDoneNow && !isCourseFinalTask) {
      if (missionCompletionResolverRef.current) missionCompletionResolverRef.current(false)
      missionCompletionPromiseRef.current = new Promise((resolve) => {
        missionCompletionResolverRef.current = resolve
      })
      holdCompletedDayRef.current = true
      setShowNextDayCTA(true)
      setAdvancingNextDay(false)
      setMissionDone(true)
      setShowMissionConfetti(true)
      if (missionConfettiTimerRef.current) clearTimeout(missionConfettiTimerRef.current)
      missionConfettiTimerRef.current = setTimeout(() => {
        if (isMountedRef.current) setShowMissionConfetti(false)
        missionConfettiTimerRef.current = null
      }, 2400)
    }

    // 4. API call (async, non-blocking)
    let apiOk = false
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token || null

      const res = await fetch('/api/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          taskRowId: todayRow.id,
          taskId: task.id,
          completedTaskIds: prevTasks.filter((entry) => entry.completed).map((entry) => entry.id),
          accessToken: token,
          clientHour: new Date().getHours(),
          attempts: metrics?.attempts,
          accuracy: metrics?.accuracy,
          correctCount: metrics?.correctCount,
          questionCount: metrics?.questionCount,
          confidenceLevel: metrics?.confidenceLevel,
          assistantUsageCount: metrics?.assistantUsageCount,
          completionTimeSec: metrics?.completionTimeSec,
          lessonTimeSec: metrics?.completionTimeSec,
          hintsUsed: metrics?.hintsUsed,
          maxHints: metrics?.maxHints,
          reflectionQuality: metrics?.reflectionQuality,
          challengeScore: metrics?.challengeScore,
          aiInteractionDepth: metrics?.aiInteractionDepth,
          bossDefeated: metrics?.bossDefeated,
          comboMax: metrics?.comboMax,
          quizPerfect: metrics?.quizPerfect,
        }),
      })

      if (!res.ok) {
        let failureData = null
        try { failureData = await res.json() } catch {}
        setTasks(prevTasks)
        if (rowId) {
          const completedIds = new Set(completedTaskIdsByRowRef.current.get(rowId) || [])
          completedIds.delete(String(task.id))
          if (completedIds.size > 0) completedTaskIdsByRowRef.current.set(rowId, completedIds)
          else completedTaskIdsByRowRef.current.delete(rowId)
          setTodayRow(prev => prev?.id === rowId ? {
            ...prev,
            tasks: prevTasks,
            tasks_completed: prevCompletedCount,
            completion_status: prevRowStatus,
          } : prev)
          setAllRows(prev => prev.map(row => row.id === rowId ? {
            ...row,
            tasks: prevTasks,
            tasks_completed: prevCompletedCount,
            completion_status: prevRowStatus,
          } : row))
        }
        setXpDisplay(getLevelProgress(prevXp))
        setGems(g => Math.max(0, g - optimisticTaskGems)) // rollback optimistic gem
        if (allDoneNow && !isCourseFinalTask) {
          resolveMissionCompletion(false)
          holdCompletedDayRef.current = false
          if (missionConfettiTimerRef.current) {
            clearTimeout(missionConfettiTimerRef.current)
            missionConfettiTimerRef.current = null
          }
          setShowMissionConfetti(false)
          setShowNextDayCTA(false)
          setMissionDone(false)
        }
        setError(failureData?.error || 'Could not save. Try again.')
        setCompleting(null)
        return
      }

      const data = await res.json()
      // API succeeded — task is persisted. NEVER revert after this point.
      apiOk = true

      if (isCourseFinalTask && data.finalExamPassed === false) {
        const revertedTasks = Array.isArray(data.updatedTasks) ? data.updatedTasks : prevTasks
        const revertedCompletedCount = countCompletedTasks(revertedTasks)
        const revertedStatus = data.completionStatus || deriveTaskRowStatus(revertedTasks, 'in_progress')
        setTasks(revertedTasks)
        if (rowId) {
          const completedIds = new Set(completedTaskIdsByRowRef.current.get(rowId) || [])
          completedIds.delete(String(task.id))
          if (completedIds.size > 0) completedTaskIdsByRowRef.current.set(rowId, completedIds)
          else completedTaskIdsByRowRef.current.delete(rowId)
          setTodayRow(prev => prev?.id === rowId ? {
            ...prev,
            tasks: revertedTasks,
            tasks_completed: revertedCompletedCount,
            completion_status: revertedStatus,
          } : prev)
          setAllRows(prev => prev.map(row => row.id === rowId ? {
            ...row,
            tasks: revertedTasks,
            tasks_completed: revertedCompletedCount,
            completion_status: revertedStatus,
          } : row))
        }
        setXpDisplay(getLevelProgress(prevXp))
        setGems(g => Math.max(0, g - optimisticTaskGems))
        setMissionDone(false)
        setCourseCompleteData(null)
        setError(
          data.finalExam?.failedOut
            ? `Final exam not passed. You have used all ${data.finalExam.maxAttempts || 3} attempts.`
            : `Final exam not passed. ${data.finalExam?.attemptsRemaining ?? 0} attempt${(data.finalExam?.attemptsRemaining ?? 0) === 1 ? '' : 's'} remaining.`
        )
        setCompleting(null)
        return
      }

      if (Array.isArray(data.nextResult?.rows) && data.nextResult.rows.length > 0) {
        const mergedRows = mergeRowsByDayNumber(allRows, data.nextResult.rows)
        setAllRows(mergedRows)
        const nextDayNumber = Number(data.nextResult?.startDay) || Number(data.nextResult.rows[0]?.day_number) || null
        const inferredTomorrowRow = nextDayNumber != null
          ? mergedRows.find((row) => Number(row.day_number) === nextDayNumber) || null
          : data.nextResult.rows[0] || null
        if (inferredTomorrowRow) setTomorrowRow(inferredTomorrowRow)
      }

      // Apply server corrections (wrapped separately so errors don't revert task)
      try {
        if (data.newTotalXp != null) setXpDisplay(getLevelProgress(data.newTotalXp))
        if (data.levelUp)             setLevelUpData(data.levelUp)
        if (data.streakState?.current != null) {
          setStreakData(prev => ({
            current: data.streakState.current,
            longest: Math.max(prev.longest, data.streakState.longest || 0),
          }))
        }
        if (data.streakBonusXp > 0) {
          addXpToast(data.streakBonusXp, streakTapX, 120)
        }

        // Gem update — add server-confirmed rewards without ever stomping the live balance
        const chestGemReward = data.chestReward?.type === 'gems' ? (Number(data.chestReward.amount) || 0) : 0
        const extraGems = Math.max(0, (Number(data.gemsEarned) || 0) - optimisticTaskGems) + chestGemReward
        if (extraGems > 0) {
          nextGemFloor += extraGems
          setGems(g => g + extraGems)
        }
        if (data.newGemTotal != null && Number(data.newGemTotal) > nextGemFloor) {
          const serverCorrection = Number(data.newGemTotal) - nextGemFloor
          nextGemFloor = Number(data.newGemTotal)
          setGems(g => g + serverCorrection)
        }
        if (data.gemsEarned > 0) {
          setGemPulse(true)
          pendingTimersRef.current.push(setTimeout(() => { if (isMountedRef.current) setGemPulse(false) }, 400))
          setGemToasts(prev => [...prev, { id: Date.now(), amount: data.gemsEarned }])
        }

        // Quest updates (gems already included in newGemTotal — only animate)
        if (data.questUpdate?.quests) {
          setQuests(data.questUpdate.quests)
          if (data.questUpdate.questGemsEarned > 0) {
            setGemPulse(true)
            pendingTimersRef.current.push(setTimeout(() => { if (isMountedRef.current) setGemPulse(false) }, 400))
            setGemToasts(prev => [...prev, { id: Date.now() + 1, amount: data.questUpdate.questGemsEarned }])
          }
          if (data.questUpdate.questMasterBonus) {
            setQuestMasterToast(true)
            pendingTimersRef.current.push(setTimeout(() => { if (isMountedRef.current) setQuestMasterToast(false) }, 4000))
          }
        }

        // Weekly challenge updates (gems already included in newGemTotal — only animate)
        if (data.challengeUpdate) {
          setWeeklyChallenge(prev => prev ? {
            ...prev,
            current_value: data.challengeUpdate.currentValue,
            completed: data.challengeUpdate.completed,
          } : prev)
          if (data.challengeUpdate.completed && data.challengeUpdate.gemReward > 0) {
            setGemPulse(true)
            pendingTimersRef.current.push(setTimeout(() => { if (isMountedRef.current) setGemPulse(false) }, 400))
            setGemToasts(prev => [...prev, { id: Date.now() + 2, amount: data.challengeUpdate.gemReward }])
          }
        }

        // Badge toasts — show newly earned badges
        if (data.newBadges?.length > 0) {
          pendingTimersRef.current.push(setTimeout(() => {
            if (isMountedRef.current) {
              setBadgeToasts(prev => [...prev, ...data.newBadges])
              setEarnedBadgeIds(prev => {
                const next = new Set(prev)
                data.newBadges.forEach(b => next.add(b.id))
                return next
              })
            }
          }, 600))
        }

        // Treasure chest — show after XP toast settles
        if (data.chestReward) {
          pendingTimersRef.current.push(setTimeout(() => { if (isMountedRef.current) setChestReward(data.chestReward) }, 800))
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
      } catch { /* Post-API processing error — task is already saved, don't revert */ }

      // Mission complete — correct optimistic data with server values
      if (!isCourseFinalTask && (data.missionComplete || allDoneNow)) {
        const stillViewingCompletedDay = currentDayRowIdRef.current === rowId
        if (stillViewingCompletedDay) {
          holdCompletedDayRef.current = true
          setMissionDone(true)
          setShowNextDayCTA(true)
          setTodayRow(prev => prev?.id === rowId ? {
            ...prev,
            tasks: nextTasks,
            completion_status: 'completed',
          } : prev)
        }
        setAllRows(prev => prev.map(row => row.id === rowId ? {
          ...row,
          tasks: nextTasks,
          completion_status: 'completed',
        } : row))
        try {
          track(EVENTS.MISSION_COMPLETED, {
            totalXp: data.xpEarned ?? (xpAmount + (data.missionBonusXp || 0) + (data.streakBonusXp || 0)),
            dayNumber: todayRow.day_number,
          }, {
            userId: user?.id, goalId: goal?.id, missionId: todayRow?.id,
            streakValue: data.streakState?.current ?? streakData.current,
            energyMode: energy,
          })
        } catch { /* analytics never blocks */ }
      }

      if (isCourseFinalTask && data.courseCompleted) {
        holdCompletedDayRef.current = false
        setShowMissionConfetti(false)
        setShowNextDayCTA(false)
        setMissionDone(false)
        setCourseCompleteData(data.courseCompletion || null)
        setTodayRow(prev => prev?.id === rowId ? {
          ...prev,
          tasks: nextTasks,
          tasks_completed: nextCompletedCount,
          completion_status: 'completed',
        } : prev)
        setAllRows(prev => prev.map(row => row.id === rowId ? {
          ...row,
          tasks: nextTasks,
          tasks_completed: nextCompletedCount,
          completion_status: 'completed',
        } : row))
      }

      if (allDoneNow && !isCourseFinalTask) resolveMissionCompletion(true)

      if (data.levelUp) {
        try {
          track(EVENTS.LEVEL_UP, { fromLevel: data.levelUp.fromLevel, toLevel: data.levelUp.toLevel, title: data.levelUp.title }, {
            userId: user?.id, goalId: goal?.id, xpBalance: data.newTotalXp,
          })
        } catch { /* analytics never blocks */ }
      }

      if (!(data.missionComplete || allDoneNow) || (isCourseFinalTask && data.courseCompleted)) {
        if (taskReloadTimerRef.current) clearTimeout(taskReloadTimerRef.current)
        taskReloadTimerRef.current = setTimeout(() => {
          if (isMountedRef.current) load(true, { preserveGemFloor: nextGemFloor, preferredRowId: rowId })
          taskReloadTimerRef.current = null
        }, 1200)
        pendingTimersRef.current.push(taskReloadTimerRef.current)
      }
    } catch {
      // Only revert if the API itself failed (network error, auth error, etc.)
      if (!apiOk) {
        setTasks(prevTasks)
        if (rowId) {
          const completedIds = new Set(completedTaskIdsByRowRef.current.get(rowId) || [])
          completedIds.delete(String(task.id))
          if (completedIds.size > 0) completedTaskIdsByRowRef.current.set(rowId, completedIds)
          else completedTaskIdsByRowRef.current.delete(rowId)
          setTodayRow(prev => prev?.id === rowId ? {
            ...prev,
            tasks: prevTasks,
            tasks_completed: prevCompletedCount,
            completion_status: prevRowStatus,
          } : prev)
          setAllRows(prev => prev.map(row => row.id === rowId ? {
            ...row,
            tasks: prevTasks,
            tasks_completed: prevCompletedCount,
            completion_status: prevRowStatus,
          } : row))
        }
        setXpDisplay(getLevelProgress(prevXp))
        setGems(g => Math.max(0, g - optimisticTaskGems)) // rollback optimistic gem
        if (allDoneNow && !isCourseFinalTask) {
          resolveMissionCompletion(false)
          holdCompletedDayRef.current = false
          if (missionConfettiTimerRef.current) {
            clearTimeout(missionConfettiTimerRef.current)
            missionConfettiTimerRef.current = null
          }
          setShowMissionConfetti(false)
          setShowNextDayCTA(false)
          setMissionDone(false)
        }
        setError('Network error. Check your connection.')
      }
    } finally {
      if (allDoneNow && !apiOk && !isCourseFinalTask) resolveMissionCompletion(false)
      setCompleting(null)
    }
  }, [tasks, completing, xpDisplay, todayRow, streakData, addXpToast, load, gems, user, goal, energy, resolveMissionCompletion, allRows])

  const handleTaskReroll = useCallback(async (task) => {
    if (rerollingTaskId || !goal || !todayRow || !canRerollTask(task)) return
    setRerollingTaskId(task.id)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token || null
      const res = await fetch('/api/task-reroll', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          goalId: goal.id,
          taskRowId: todayRow.id,
          taskId: task.id,
          accessToken: token,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Could not reroll that task')
        return
      }

      const nextTasks = (Array.isArray(todayRow.tasks) ? todayRow.tasks : tasks).map((entry) => (
        String(entry.id) === String(task.id) ? data.replacementTask : entry
      ))

      setTasks((prev) => prev.map((entry) => (
        String(entry.id) === String(task.id) ? data.replacementTask : entry
      )))
      setTodayRow((prev) => prev?.id === todayRow.id ? { ...prev, tasks: nextTasks } : prev)
      setAllRows((prev) => prev.map((row) => (
        row.id === todayRow.id ? { ...row, tasks: nextTasks } : row
      )))
      if (data.inventoryCounts) setInventoryCounts(data.inventoryCounts)
      setModuleRewardToasts((prev) => [...prev, {
        id: `reroll-${task.id}-${Date.now()}`,
        title: 'Task refreshed',
        message: `${task.title} was replaced with a new valid task.`,
      }])
    } catch {
      setError('Could not reroll that task')
    } finally {
      setRerollingTaskId(null)
    }
  }, [goal, rerollingTaskId, tasks, todayRow])

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
        pendingTimersRef.current.push(setTimeout(() => { if (isMountedRef.current) setFreezeToast(false) }, 3500))
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

  // ─── Generate next day on-demand (when AI generation lagged) ────────────────
  const handleGenerateNext = useCallback(async (options = {}) => {
    if (generatingNext || !goal || !user) return
    setGeneratingNext(true)
    let generatedData = null
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token || null
      const res = await fetch('/api/generate-next', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ goalId: goal.id, userId: user.id, mode: goal.mode || 'goal', accessToken: token }),
      })
      generatedData = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(generatedData?.error || 'Could not generate the next day')
      }
    } catch (error) {
      setGeneratingNext(false)
      setError(error?.message || 'Could not generate the next day')
      throw error
    }
    const insertedRows = Array.isArray(generatedData?.rows) ? generatedData.rows : []
    const nextDayNumber = Number.isFinite(options?.preferredDayNumber)
      ? Number(options.preferredDayNumber)
      : Number(insertedRows[0]?.day_number) || Number(generatedData?.day?.day) || Number(generatedData?.startDay) || null

    if (insertedRows.length > 0) {
      const mergedRows = mergeRowsByDayNumber(allRows, insertedRows)
      const preferredInsertedRow = nextDayNumber != null
        ? mergedRows.find((row) => Number(row.day_number) === nextDayNumber) || insertedRows[0]
        : insertedRows[0]
      setAllRows(mergedRows)
      activateDayRow(preferredInsertedRow, mergedRows)
      setShowNextDayCTA(false)
      setMissionDone(false)
    } else if (generatedData?.reason === 'course_finished') {
      setShowNextDayCTA(false)
    } else {
      const loadResult = await load(true, nextDayNumber != null ? { preferredDayNumber: nextDayNumber } : {})
      const loadedDayNumber = Number(loadResult?.today?.day_number) || null
      if (nextDayNumber != null && loadedDayNumber === nextDayNumber && loadResult?.today?.id) {
        setShowNextDayCTA(false)
        setMissionDone(false)
      }
    }
    setGeneratingNext(false)
    return generatedData
  }, [generatingNext, goal, user, load, allRows, activateDayRow])

  // ─── Fast-forward to next day ───────────────────────────────────────────────
  const handleStartNextDay = useCallback(async () => {
    if (advancingNextDay) return
    if (missionConfettiTimerRef.current) {
      clearTimeout(missionConfettiTimerRef.current)
      missionConfettiTimerRef.current = null
    }
    setShowMissionConfetti(false)
    setAdvancingNextDay(true)
    setShowNextDayCTA(false)

    // Always clear hold flag — we want to move forward, not stay on completed day
    holdCompletedDayRef.current = false

    try {
      // Wait for mission completion API, but don't hang — timeout after 2s
      await Promise.race([
        missionCompletionPromiseRef.current.catch(() => true),
        new Promise(resolve => setTimeout(() => resolve(true), 2000)),
      ])

      const immediateNextRowReady = (
        tomorrowRow
        && tomorrowRow.id !== todayRow?.id
        && Number(tomorrowRow.day_number) > (Number(todayRow?.day_number) || 0)
        && tomorrowRow.completion_status !== 'completed'
      ) ? tomorrowRow : null

      if (immediateNextRowReady) {
        const mergedRows = mergeRowsByDayNumber(allRows, [immediateNextRowReady])
        setAllRows(mergedRows)
        activateDayRow(immediateNextRowReady, mergedRows)
        setMissionDone(false)
        return
      }

      const expectedCourseSpan = Math.max(
        Number(totalDaysPlanned) || 0,
        Number(goal?.total_days) || 0,
        Number(pathTracker.plannedDayCount) || 0,
      )
      const effectiveCourseCompleted = pathTracker.courseCompleted && expectedCourseSpan <= (Number(pathTracker.plannedDayCount) || 0)
      const nextTargetDay = Number(tomorrowRow?.day_number)
        || Number(pathTracker.currentDayNumber)
        || (expectedCourseSpan > (Number(todayRow?.day_number) || 0) ? (Number(todayRow?.day_number) || 0) + 1 : null)
      if (!nextTargetDay || effectiveCourseCompleted) {
        setShowNextDayCTA(false)
        return
      }

      // Strategy 0: completion API already gave us the exact next row
      if (
        tomorrowRow
        && tomorrowRow.id !== todayRow?.id
        && Number(tomorrowRow.day_number) === nextTargetDay
        && tomorrowRow.completion_status !== 'completed'
      ) {
        const mergedRows = mergeRowsByDayNumber(allRows, [tomorrowRow])
        setAllRows(mergedRows)
        activateDayRow(tomorrowRow, mergedRows)
        setMissionDone(false)
        return
      }

      // Strategy 1: next curriculum item already exists in client state
      if (
        pathTracker.currentGeneratedRow
        && pathTracker.currentGeneratedRow.id !== todayRow?.id
        && Number(pathTracker.currentGeneratedRow.day_number) > (Number(todayRow?.day_number) || 0)
      ) {
        activateDayRow(pathTracker.currentGeneratedRow, allRows)
        setMissionDone(false)
        return
      }

      // Strategy 2: try to load from DB — the completion API may have already generated the next sequence item
      holdCompletedDayRef.current = false
      const loadResult = await load(true, { preferredDayNumber: nextTargetDay })

      // Check the actual loaded row instead of a ref that updates on the next render tick.
      const movedForward = Number(loadResult?.today?.day_number) === nextTargetDay
      if (movedForward) return

      // Strategy 3: generate the exact next sequence item if it doesn't exist yet
      await handleGenerateNext({ preferredDayNumber: nextTargetDay })
    } catch {
      // If advancing fails, restore the CTA so the user can retry
      if (isMountedRef.current) setShowNextDayCTA(true)
    } finally {
      if (isMountedRef.current) setAdvancingNextDay(false)
    }
  }, [advancingNextDay, todayRow, tomorrowRow, allRows, activateDayRow, load, handleGenerateNext, pathTracker, totalDaysPlanned, goal?.total_days])

  // ─── Lesson complete ────────────────────────────────────────────────────────
  const handleLessonComplete = useCallback((task, metrics = {}) => {
    // Close lesson view first, then complete the task
    setShowLesson(null)
    if (task && !task.completed) {
      // Small delay so the view closes visually before the task completion triggers
      setTimeout(() => completeTask(task, null, metrics), 100)
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
  const expectedCourseSpan = Math.max(
    Number(totalDaysPlanned) || 0,
    Number(goal?.total_days) || 0,
    Number(pathTracker.plannedDayCount) || 0,
  )
  const effectiveCourseCompleted = pathTracker.courseCompleted && expectedCourseSpan <= (Number(pathTracker.plannedDayCount) || 0)
  const isTodayComplete = Boolean(
    todayRow && (
      missionDone
      || todayRow.completion_status === 'completed'
      || (tasks.length > 0 && tasks.every((task) => task.completed))
    )
  )
  const nextDayBusy = advancingNextDay || generatingNext
  const showInlineNextDayCTA = showNextDayCTA && !effectiveCourseCompleted
  const showInlineNextDayProgress = nextDayBusy && !effectiveCourseCompleted
  const nextSequenceKind = pathTracker.currentItemKind
  const nextSequenceTitle = pathTracker.sequenceItems.find((item) => item.id === pathTracker.currentItemId)?.title || null
  const nextItemIsProject = nextSequenceKind === 'mini_project' || nextSequenceKind === 'full_project'
  const nextRowIsFinalExam = nextSequenceKind === 'final_exam'
  const nextDayStatusLabel = generatingNext
    ? (nextRowIsFinalExam
      ? 'Preparing your final exam...'
      : nextItemIsProject
        ? 'Preparing your project day...'
        : 'Generating your next day...')
    : (nextRowIsFinalExam
      ? 'Loading final exam...'
      : nextItemIsProject
        ? 'Loading your project day...'
        : 'Loading next day...')
  const nextDayStatusDetail = generatingNext
    ? (nextRowIsFinalExam
      ? 'Building the comprehensive finish test and pulling it into your dashboard now.'
      : nextItemIsProject
        ? 'Setting up the dedicated project day for this module and pulling it into your dashboard now.'
        : 'Building the next mission and pulling it into your dashboard now.')
    : (nextRowIsFinalExam
      ? 'Switching you into the comprehensive course finish test.'
      : nextItemIsProject
        ? 'Switching you into the dedicated module project day.'
        : 'Switching you into the next day\'s unfinished tasks.')
  const nextDayCtaLabel = nextRowIsFinalExam
    ? 'Start final exam →'
    : nextItemIsProject
      ? `Start ${nextSequenceKind === 'full_project' ? 'module project' : 'mini-project'} →`
      : 'Start next day →'

  const doneRows   = allRows.filter(r => r.completion_status === 'completed').length
  const totalRows  = allRows.length
  const shortGoalText = goal?.goal_text
    ? (goal.goal_text.length > 20 ? `${goal.goal_text.slice(0, 20)}…` : goal.goal_text)
    : 'Your path'
  const totalMins  = allRows.reduce((acc,r) => {
    const t = Array.isArray(r.tasks)?r.tasks:[]
    return acc + t.filter(tk=>tk.completed).reduce((s,tk)=>s+(Number(tk.durationMin)||0),0)
  }, 0)
  const weekDays   = allRows.slice(-7).filter(r=>r.completion_status==='completed').length
  const dayNumber  = todayRow?.day_number || 1
  // ─── Loading state ─────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{...pageThemeStyle,minHeight:'100vh',fontFamily:T.font,padding:'0 20px'}}>
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
    <div style={{...pageThemeStyle,minHeight:'100vh',display:'grid',placeItems:'center',
      fontFamily:T.font,padding:24}}>
      <style>{KEYFRAMES}</style>
      <div style={{textAlign:'center'}}>
        <div style={{
          width:64,height:64,margin:'0 auto 16px',borderRadius:22,
          display:'flex',alignItems:'center',justifyContent:'center',
          background:'rgba(14,245,194,0.08)',border:`1px solid ${T.tealBorder}`,color:T.teal,
        }}>
          <IconGlyph name="goal" size={28} strokeWidth={2.3}/>
        </div>
        <p style={{color:T.textSec,marginBottom:20,fontSize:15}}>No active goal yet.</p>
        <button onClick={() => router.push('/onboarding')} style={{
          padding:'14px 32px', background:T.primaryGradient,
          border:'none', borderRadius:14, color:T.ink,
          fontWeight:800, fontSize:15, cursor:'pointer', fontFamily:T.font,
          boxShadow:'0 0 32px rgba(14,245,194,0.28)',
        }}>Set a Goal</button>
      </div>
    </div>
  )

  // ─── Main render ───────────────────────────────────────────────────────────
  return (
    <div style={themeVars}>
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
                      <span style={{fontSize:10,fontWeight:700,color:T.ink,
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
                background:T.primaryGradient,
                border:'none',borderRadius:14,
                color:T.ink,fontWeight:800,fontSize:14,
                cursor:'pointer',fontFamily:T.font,
                boxShadow:'0 0 24px rgba(14,245,194,0.25)',
              }}>+ New Goal</button>
            </div>
          </div>
        </>
      )}

      {/* XP toasts */}
      {xpToasts.map(t => <XPToast key={t.id} {...t} onDone={removeXpToast}/>)}

      {/* Module mastery + utility toasts */}
      {moduleRewardToasts.length > 0 && (
        <div style={{
          position:'fixed',
          top:92,
          right:16,
          zIndex:9400,
          display:'flex',
          flexDirection:'column',
          gap:10,
          width:'min(320px, calc(100vw - 32px))',
          pointerEvents:'none',
        }}>
          {moduleRewardToasts.map((toast) => {
            const isReward = Number.isFinite(Number(toast.rewardAmount)) && Number(toast.rewardAmount) > 0
            return (
              <div key={toast.id} style={{
                borderRadius:18,
                border:`1px solid ${isReward ? 'rgba(251,191,36,0.24)' : T.tealBorder}`,
                background:isReward
                  ? 'linear-gradient(145deg, rgba(251,191,36,0.12), rgba(255,255,255,0.06))'
                  : 'rgba(6,6,15,0.88)',
                boxShadow:isReward
                  ? '0 20px 38px rgba(251,191,36,0.14)'
                  : '0 18px 34px rgba(0,0,0,0.28)',
                padding:'14px 16px',
                backdropFilter:'blur(18px)',
                WebkitBackdropFilter:'blur(18px)',
                animation:'fadeUp 0.24s ease both',
                pointerEvents:'auto',
              }}>
                <div style={{display:'flex',alignItems:'flex-start',gap:12}}>
                  <div style={{
                    width:38,height:38,borderRadius:14,flexShrink:0,
                    display:'flex',alignItems:'center',justifyContent:'center',
                    background:isReward ? 'rgba(251,191,36,0.14)' : 'rgba(14,245,194,0.10)',
                    border:`1px solid ${isReward ? 'rgba(251,191,36,0.22)' : T.tealBorder}`,
                    color:isReward ? T.amber : T.teal,
                  }}>
                    <IconGlyph name={isReward ? 'gem' : 'shield_check'} size={18} strokeWidth={2.4} color={isReward ? T.amber : T.teal}/>
                  </div>
                  <div style={{minWidth:0,flex:1}}>
                    <div style={{
                      fontSize:11,
                      fontWeight:900,
                      letterSpacing:'0.12em',
                      textTransform:'uppercase',
                      color:isReward ? T.amber : T.teal,
                      marginBottom:5,
                    }}>
                      {isReward ? 'Module mastery' : 'Path update'}
                    </div>
                    <div style={{fontSize:14,fontWeight:800,color:T.text,lineHeight:1.35,marginBottom:4}}>
                      {toast.title || 'Update'}
                    </div>
                    {toast.message && (
                      <div style={{fontSize:12,color:T.textSec,lineHeight:1.5}}>
                        {toast.message}
                      </div>
                    )}
                    {isReward && (
                      <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap',marginTop:6}}>
                        <span style={{fontSize:12,fontWeight:800,color:T.amber}}>+{toast.rewardAmount} gems</span>
                        {toast.identityLabel && (
                          <span style={{
                            display:'inline-flex',alignItems:'center',gap:6,
                            padding:'4px 8px',borderRadius:9999,
                            background:'rgba(255,255,255,0.06)',border:`1px solid ${T.border}`,
                            fontSize:10,fontWeight:900,color:T.textSec,letterSpacing:'0.08em',textTransform:'uppercase',
                          }}>
                            <IconGlyph name="badge" size={11} strokeWidth={2.2} color={T.amber}/>
                            {toast.identityLabel}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Level-up banner */}
      {levelUpData && <LevelUpBanner data={levelUpData} onDismiss={() => setLevelUpData(null)}/>}

      <MissionConfettiBurst active={showMissionConfetti}/>

      <CourseCompleteOverlay
        data={courseCompleteData}
        onDismiss={() => setCourseCompleteData(null)}
        onOpenPortfolio={() => {
          setCourseCompleteData(null)
          router.push('/portfolio')
        }}
      />

      {/* Treasure Chest */}
      {chestReward && (
        <TreasureChest
          reward={chestReward}
          onClaim={(reward) => {
            // Gems already included in newGemTotal from server — only animate
            if (reward.type === 'gems') {
              setGemPulse(true)
              setTimeout(() => setGemPulse(false), 400)
              setGemToasts(prev => [...prev, { id: Date.now() + 3, amount: reward.amount }])
            } else if (reward.type === 'streakFreeze') {
              setFreezeCount(f => f + 1)
            } else if (reward.type === 'xpBoost') {
              setXpBoostUntil(new Date(Date.now() + 15 * 60 * 1000))
            }
            setChestReward(null)
          }}
        />
      )}

      {/* Badge earned toasts */}
      {badgeToasts.length > 0 && (
        <div style={{ position:'fixed', top:80, left:'50%', transform:'translateX(-50%)', zIndex:9500, display:'flex', flexDirection:'column', gap:10, alignItems:'center', pointerEvents:'none' }}>
          {badgeToasts.map((badge, i) => (
            <div key={badge.id + i} style={{
              padding:'14px 22px', borderRadius:18,
              background:'rgba(6,6,15,0.92)', backdropFilter:'blur(20px)',
              border:`1.5px solid ${RARITY_COLORS[badge.rarity] || '#0ef5c2'}40`,
              boxShadow:`0 0 30px ${RARITY_COLORS[badge.rarity] || '#0ef5c2'}20`,
              display:'flex', alignItems:'center', gap:14,
              animation:'badgeSlideIn 0.4s cubic-bezier(0.34,1.56,0.64,1) both',
              animationDelay:`${i * 0.15}s`,
              pointerEvents:'auto', cursor:'pointer', fontFamily:T.font,
            }} onClick={() => setBadgeToasts(prev => prev.filter((_, j) => j !== i))}>
              <div style={{
                width:38,height:38,borderRadius:12,
                display:'flex',alignItems:'center',justifyContent:'center',
                background:`${RARITY_COLORS[badge.rarity] || '#0ef5c2'}12`,
                color:RARITY_COLORS[badge.rarity] || '#0ef5c2',
                flexShrink:0,
              }}>
                <IconGlyph name={badge.icon} size={20} strokeWidth={2.3}/>
              </div>
              <div>
                <div style={{ fontSize:11, fontWeight:800, color:RARITY_COLORS[badge.rarity] || '#0ef5c2', textTransform:'uppercase', letterSpacing:'1.5px', marginBottom:2 }}>
                  Badge Earned!
                </div>
                <div style={{ fontSize:16, fontWeight:800, color:'#f5f5f7' }}>{badge.name}</div>
                <div style={{ fontSize:12, color:'#8e8e93', marginTop:2 }}>{badge.description}</div>
              </div>
            </div>
          ))}
        </div>
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
            width:72,height:72,marginBottom:16,borderRadius:24,
            display:'flex',alignItems:'center',justifyContent:'center',
            background:'rgba(251,191,36,0.12)',color:'#FBBF24',
            animation:'checkPop 0.5s cubic-bezier(0.34,1.56,0.64,1)',
          }}><IconGlyph name="bolt" size={34} strokeWidth={2.3}/></div>
          <div style={{
            fontSize:28,fontWeight:900,
            background:T.highlightGradient,
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
          rerollingTaskId={rerollingTaskId}
          rerollCount={inventoryCounts.taskReroll || 0}
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
          onReroll={(t) => {
            setPreviewTask(null)
            handleTaskReroll(t)
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

      {/* Task viewer — routed by type (7-type system + legacy backward compat) */}

      {/* ── CONCEPT (new) + LESSON/READING/VIDEO/FLASHCARD (legacy) → LessonViewer ── */}
      {showLesson && ['concept', 'lesson'].includes(showLesson.type) && (
        <LessonViewer
          concept={showLesson._concept || showLesson.title}
          taskTitle={showLesson.title}
          goal={goal?.goal_text}
          knowledge={Array.isArray(goal?.constraints) ? goal.constraints.join(', ') : (goal?.constraints || '')}
          lessonKey={`${goal?.id || 'g'}::${showLesson.id || showLesson.title}`}
          aiMode={showLesson._aiMode || 'hint'}
          onClose={() => setShowLesson(null)}
          onComplete={(payload) => handleLessonComplete(showLesson, payload)}
          onHeartLost={handleHeartLost}
        />
      )}
      {showLesson && showLesson.type === 'video' && (
        <VideoView
          task={showLesson}
          goal={goal?.goal_text}
          onClose={() => setShowLesson(null)}
          onComplete={(payload) => handleLessonComplete(showLesson, payload)}
        />
      )}
      {showLesson && showLesson.type === 'reading' && (
        <ReadingView
          task={showLesson}
          goal={goal?.goal_text}
          knowledge={Array.isArray(goal?.constraints) ? goal.constraints.join(', ') : (goal?.constraints || '')}
          onClose={() => setShowLesson(null)}
          onComplete={(payload) => handleLessonComplete(showLesson, payload)}
        />
      )}
      {showLesson && showLesson.type === 'flashcard' && (
        <FlashcardView
          task={showLesson}
          goal={goal?.goal_text}
          knowledge={Array.isArray(goal?.constraints) ? goal.constraints.join(', ') : (goal?.constraints || '')}
          onClose={() => setShowLesson(null)}
          onComplete={(payload) => handleLessonComplete(showLesson, payload)}
        />
      )}

      {/* ── GUIDED PRACTICE (clean) + PRACTICE/EXERCISE (legacy) ── */}
      {showLesson && showLesson.type === 'guided_practice' && (
        <GuidedPracticeView
          task={showLesson}
          goal={goal?.goal_text}
          knowledge={Array.isArray(goal?.constraints) ? goal.constraints.join(', ') : (goal?.constraints || '')}
          onClose={() => setShowLesson(null)}
          onComplete={(payload) => handleLessonComplete(showLesson, payload)}
        />
      )}
      {showLesson && (showLesson.type === 'practice' || showLesson.type === 'exercise') && (
        <ProjectView
          task={showLesson}
          goal={goal?.goal_text}
          knowledge={Array.isArray(goal?.constraints) ? goal.constraints.join(', ') : (goal?.constraints || '')}
          onClose={() => setShowLesson(null)}
          onComplete={(payload) => handleLessonComplete(showLesson, payload)}
        />
      )}

      {/* ── CHALLENGE (clean, 1:1) ── */}
      {showLesson && showLesson.type === 'challenge' && (
        <ChallengeView
          task={showLesson}
          goal={goal?.goal_text}
          knowledge={Array.isArray(goal?.constraints) ? goal.constraints.join(', ') : (goal?.constraints || '')}
          onClose={() => setShowLesson(null)}
          onComplete={(payload) => handleLessonComplete(showLesson, payload)}
        />
      )}

      {/* ── EXPLAIN (new) + AI_INTERACTION/DISCUSSION (legacy) → AIInteractionView ── */}
      {showLesson && ['explain', 'ai_interaction', 'discussion'].includes(showLesson.type) && (
        <AIInteractionView
          task={showLesson}
          goal={goal?.goal_text}
          knowledge={Array.isArray(goal?.constraints) ? goal.constraints.join(', ') : (goal?.constraints || '')}
          onClose={() => setShowLesson(null)}
          onComplete={(payload) => handleLessonComplete(showLesson, payload)}
        />
      )}

      {/* ── QUIZ (clean) + REVIEW (legacy) → MultiQuizView ── */}
      {showLesson && ['quiz', 'review'].includes(showLesson.type) && (
        <MultiQuizView
          task={showLesson}
          goal={goal?.goal_text}
          knowledge={Array.isArray(goal?.constraints) ? goal.constraints.join(', ') : (goal?.constraints || '')}
          onClose={() => setShowLesson(null)}
          onComplete={(payload) => handleLessonComplete(showLesson, payload)}
        />
      )}

      {/* ── REFLECT (new) + REFLECTION (legacy) → ReflectionView ── */}
      {showLesson && ['reflect', 'reflection'].includes(showLesson.type) && (
        <ReflectionView
          task={showLesson}
          goal={goal?.goal_text}
          knowledge={Array.isArray(goal?.constraints) ? goal.constraints.join(', ') : (goal?.constraints || '')}
          onClose={() => setShowLesson(null)}
          onComplete={(payload) => handleLessonComplete(showLesson, payload)}
        />
      )}

      {/* ── BOSS (clean) + CAPSTONE (legacy) → BossChallengeView ── */}
      {showLesson && ['boss', 'capstone'].includes(showLesson.type) && (
        <BossChallengeView
          task={showLesson}
          goal={goal?.goal_text}
          knowledge={Array.isArray(goal?.constraints) ? goal.constraints.join(', ') : (goal?.constraints || '')}
          onClose={() => setShowLesson(null)}
          onComplete={(payload) => handleLessonComplete(showLesson, payload)}
        />
      )}

      {/* ── PROJECT (separate system, unchanged) ── */}
      {showLesson && showLesson.type === 'project' && (
        <ProjectViewer
          task={showLesson}
          goal={goal?.goal_text}
          knowledge={Array.isArray(goal?.constraints) ? goal.constraints.join(', ') : (goal?.constraints || '')}
          goalId={goal?.id}
          onClose={() => setShowLesson(null)}
          onComplete={(payload) => handleLessonComplete(showLesson, payload)}
        />
      )}

      {/* ── Fallback: unknown type → LessonViewer ── */}
      {showLesson && !['concept','lesson','video','reading','flashcard','guided_practice','practice','exercise','challenge','explain','ai_interaction','discussion','quiz','review','reflect','reflection','boss','capstone','project'].includes(showLesson.type) && (
        <LessonViewer
          concept={showLesson._concept || showLesson.title}
          taskTitle={showLesson.title}
          goal={goal?.goal_text}
          knowledge={Array.isArray(goal?.constraints) ? goal.constraints.join(', ') : (goal?.constraints || '')}
          lessonKey={`${goal?.id || 'g'}::${showLesson.id || showLesson.title}`}
          aiMode={showLesson._aiMode || 'hint'}
          onClose={() => setShowLesson(null)}
          onComplete={(payload) => handleLessonComplete(showLesson, payload)}
          onHeartLost={handleHeartLost}
        />
      )}

      <div style={{...pageThemeStyle,minHeight:'100vh',fontFamily:T.font,paddingBottom:90}}>

        {/* ── Sticky top bar ── */}
        <div style={{
          position:'sticky',top:0,zIndex:60,
          background:'rgba(5,6,8,0.92)',
          backdropFilter:'blur(20px) saturate(180%)',
          WebkitBackdropFilter:'blur(20px) saturate(180%)',
          borderBottom:'1px solid rgba(14,245,194,0.06)',
        }} className="safe-top-shell">
          <div style={{maxWidth:600,margin:'0 auto',height:56,
            display:'flex',alignItems:'center',gap:14,padding:'0 20px',justifyContent:'space-between'}}>
            <button onClick={() => setShowGoalsSidebar(true)} className="interactive-icon" style={{
              minWidth:0,maxWidth:'48%',background:'none',border:'none',
              cursor:'pointer',fontFamily:T.font,textAlign:'left',padding:0,
              display:'flex',alignItems:'center',gap:10,
              minHeight:44,
            }}>
              <PathBoltLogo />
              <div style={{
                minWidth:0,
              }}>
                <div style={{
                  fontSize:14,fontWeight:800,color:T.text,
                  whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',
                  display:'flex',alignItems:'center',gap:5,
                }}>
                  {shortGoalText}
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={T.textMuted} strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>
                </div>
              </div>
            </button>

            <div style={{display:'flex',alignItems:'center',gap:12,flexShrink:0}}>
              <button onClick={() => handleTabSelect('shop')} className="interactive-icon gem-glint" style={{
                display:'flex',alignItems:'center',gap:6,
                padding:'6px 10px',background:T.tealDim,
                border:`1px solid ${T.tealBorder}`,borderRadius:9999,
                cursor:'pointer',fontFamily:T.font,position:'relative',
                minHeight:44,
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
                {gemToasts.map(t => (
                  <span key={t.id}
                    onAnimationEnd={() => setGemToasts(prev => prev.filter(x => x.id !== t.id))}
                    style={{
                      position:'absolute',top:-8,right:0,
                      fontSize:12,fontWeight:800,color:T.teal,
                      animation:'gemFloat 1.2s ease-out forwards',
                      pointerEvents:'none',whiteSpace:'nowrap',
                    }}>+{t.amount} gems</span>
                ))}
              </button>

              <button onClick={() => handleTabSelect('settings')} className="interactive-icon" style={{
                display:'flex',alignItems:'center',padding:0,background:'none',border:'none',
                cursor:'pointer',fontFamily:T.font,
                minHeight:44,
              }}>
                <HeartBar hearts={heartsRemaining} prevHearts={prevHearts} maxHearts={maxHearts} />
              </button>

              <button onClick={() => handleTabSelect('stats')} className="interactive-icon" style={{
                display:'flex',alignItems:'center',gap:4,
                padding:'6px 10px',background:T.flameDim,
                border:`1px solid ${T.flameBorder}`,borderRadius:9999,
                cursor:'pointer',fontFamily:T.font,
                minHeight:44,
              }}>
                <StreakFlame streak={streakData.current} size={18} />
                <span style={{fontSize:13,fontWeight:800,color:T.flame}}>{streakData.current}</span>
              </button>

              <button onClick={() => handleTabSelect('stats')} className="interactive-icon" style={{
                display:'flex',alignItems:'center',justifyContent:'center',
                width:28,height:28,padding:0,background:'none',border:'none',
                cursor:'pointer',fontFamily:T.font,
                minHeight:44,
                minWidth:44,
              }}>
                <MiniProgressRing
                  size={24}
                  value={xpDisplay.xpInLevel}
                  total={xpDisplay.xpForLevel}
                  stroke="var(--theme-mastery)"
                  track="rgba(129,140,248,0.12)"
                  label={xpDisplay.level}
                  labelColor="#fff"
                  textSize={9}
                />
              </button>
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
          <div className="shell-transition-fade">
            <StaggerBlock index={0}>
              <XPLevelBar {...xpDisplay} animating={xpAnimating}/>
            </StaggerBlock>

            {boostTimeLeft > 0 && (
              <StaggerBlock index={1}>
                <div style={{maxWidth:600,margin:'0 auto',padding:'0 20px'}}>
                  <div style={{
                    background:'linear-gradient(90deg,rgba(251,191,36,0.12),rgba(14,245,194,0.10),rgba(0,212,255,0.10))',
                    border:'1px solid rgba(251,191,36,0.22)',
                    borderRadius:16,padding:'12px 16px',
                    display:'flex',alignItems:'center',justifyContent:'space-between',
                    animation:'pulseActive 2s ease-in-out infinite',
                    boxShadow:'0 0 30px rgba(251,191,36,0.08)',
                  }}>
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      <IconGlyph name="bolt" size={16} strokeWidth={2.3} color="#FBBF24"/>
                      <span style={{fontSize:13,fontWeight:800,color:'#FBBF24'}}>Double XP is live</span>
                    </div>
                    <span style={{fontSize:14,fontWeight:800,color:'#FBBF24',fontFamily:T.fontMono}}>
                      {Math.floor(boostTimeLeft/60)}:{String(boostTimeLeft%60).padStart(2,'0')}
                    </span>
                  </div>
                </div>
              </StaggerBlock>
            )}

            {/* ── Weekly Challenge ── */}
            {weeklyChallenge && (
              <StaggerBlock index={2}>
              <div style={{maxWidth:600,margin:'12px auto 0',padding:'0 20px'}}>
                <div style={{
                  background: weeklyChallenge.completed
                    ? 'linear-gradient(135deg,rgba(255,215,0,0.12),rgba(251,191,36,0.06))'
                    : 'linear-gradient(135deg,var(--theme-primary-dim),rgba(0,212,255,0.04))',
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
                        <IconGlyph name={weeklyChallenge.completed ? 'trophy' : 'challenge'} size={16} strokeWidth={2.3} color={weeklyChallenge.completed ? '#FFD700' : T.teal}/>
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
                            : T.primaryGradientSoft,
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
              </StaggerBlock>
            )}

            {/* ── Daily Quests ── */}
            {quests.length > 0 && (
              <StaggerBlock index={3}>
              <div style={{maxWidth:600,margin:'12px auto 0',padding:'0 20px'}}>
                <div style={{
                  background:T.surface,border:`1px solid ${T.border}`,
                  borderRadius:20,padding:'16px 18px',
                  backdropFilter:'blur(16px)',WebkitBackdropFilter:'blur(16px)',
                }}>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      <IconGlyph name="target" size={16} strokeWidth={2.3} color={T.textSec}/>
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
                                background:T.primaryGradientSoft,borderRadius:9999,
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
                      Quest Master +30 gems
                    </div>
                  )}
                </div>
              </div>
              </StaggerBlock>
            )}

            <StaggerBlock index={4}>
              <MissionHeroCard todayRow={todayRow} tasks={tasks} dayNumber={dayNumber}/>
            </StaggerBlock>

            {/* ── Reward Calendar ── */}
            <StaggerBlock index={5}>
              <div style={{maxWidth:600,margin:'12px auto 0',padding:'0 20px'}}>
                <div style={{
                  background:T.surface,border:`1px solid ${T.border}`,
                  borderRadius:20,padding:'16px 18px',
                  backdropFilter:'blur(16px)',WebkitBackdropFilter:'blur(16px)',
                }}>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      <IconGlyph name="map" size={16} strokeWidth={2.3} color={T.textSec}/>
                      <span style={{fontSize:12,fontWeight:800,letterSpacing:'1px',color:T.textSec,textTransform:'uppercase'}}>
                        Weekly Rewards
                      </span>
                    </div>
                    {rewardCalendar.days_claimed?.length === 7 && (
                      <span style={{fontSize:11,fontWeight:700,color:'#FFD700'}}>Perfect Week +50 gems</span>
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
                            background: claimed ? T.primaryGradient
                              : isToday ? 'rgba(14,245,194,0.06)'
                              : missed ? 'rgba(255,255,255,0.02)'
                              : 'rgba(255,255,255,0.03)',
                            border: claimed ? `2px solid ${T.teal}`
                              : isToday ? '2px solid rgba(14,245,194,0.50)'
                              : isSunday && !missed ? '2px solid rgba(255,215,0,0.30)'
                              : `1px solid ${missed ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.08)'}`,
                            display:'flex',alignItems:'center',justifyContent:'center',
                            animation: isToday && !claimed ? 'pulseActive 2s ease-in-out infinite' : 'none',
                            transition:'all 0.2s',
                            boxShadow: claimed ? '0 0 10px rgba(14,245,194,0.30)' : 'none',
                          }}>
                            {claimed ? (
                              <span style={{fontSize:14,color:T.ink,fontWeight:900}}>✓</span>
                            ) : missed ? (
                              <span style={{fontSize:11,color:T.textDead}}>✕</span>
                            ) : isSunday ? (
                              <IconGlyph name="trophy" size={14} strokeWidth={2.2} color="#FFD700"/>
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
                          <>Claim today&apos;s reward: +{CAL_REWARDS[calToday]} gems</>
                        )}
                      </button>
                    )
                  })()}
                </div>
              </div>
            </StaggerBlock>

            <StaggerBlock index={6}>
              <EnergySelector value={energy} onChange={handleEnergyChange}/>
            </StaggerBlock>

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
                <IconGlyph name="target" size={18} strokeWidth={2.3} color="#FFD700"/>
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
                  <IconGlyph name="shield_check" size={18} strokeWidth={2.3} color={T.teal}/>
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
                  <IconGlyph name="shield" size={18} strokeWidth={2.3} color={T.flame}/>
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

            {/* Mastery decay warning */}
            {decayingConcepts.length > 0 && (
              <StaggerBlock index={7}>
              <div style={{maxWidth:600,margin:'0 auto',padding:'10px 20px 0'}}>
                <div style={{
                  padding:'14px 16px',borderRadius:16,
                  background:'rgba(251,191,36,0.06)',
                  border:'1px solid rgba(251,191,36,0.20)',
                  display:'flex',alignItems:'center',gap:12,
                  animation:'fadeUp 0.3s ease both',
                }}>
                  <div style={{width:36,height:36,borderRadius:'50%',background:'rgba(251,191,36,0.12)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,color:'#FBBF24'}}><IconGlyph name="alert" size={18} strokeWidth={2.3}/></div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,fontWeight:700,color:'#FBBF24',marginBottom:2}}>
                      {decayingConcepts.length} concept{decayingConcepts.length !== 1 ? 's' : ''} need{decayingConcepts.length === 1 ? 's' : ''} review
                    </div>
                    <div style={{fontSize:11,color:'#8e8e93'}}>
                      {decayingConcepts.slice(0,3).map(c => c.conceptId).join(', ')}{decayingConcepts.length > 3 ? ` +${decayingConcepts.length - 3} more` : ''}
                    </div>
                  </div>
                </div>
              </div>
              </StaggerBlock>
            )}

            {/* Task list */}
            <StaggerBlock index={8}>
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
                      ? 'All tasks complete. Great work today.'
                      : 'No tasks available.'}
                  </div>
                ) : (
                  <div style={{textAlign:'center',padding:'40px 0',color:T.textMuted,fontSize:14}}>
                    Your plan is being generated...
                  </div>
                )}

                {energy === 'drained' && (
                  <div style={{textAlign:'center',padding:'8px 0',color:T.textMuted,fontSize:13}}>
                    Rest day. Stay in the habit.
                  </div>
                )}
                {hiddenCount > 0 && energy !== 'drained' && (
                  <p style={{textAlign:'center',fontSize:12,color:T.textMuted,padding:'4px 0'}}>
                    {hiddenCount} more task{hiddenCount>1?'s':''} available when you have more energy
                  </p>
                )}
              </div>
            </StaggerBlock>

            {/* Tomorrow preview */}
            {!isTodayComplete && (
              <StaggerBlock index={9}>
                <TomorrowPreview tomorrowRow={tomorrowRow}/>
              </StaggerBlock>
            )}

            {/* Comeback note */}
            {streakData.current === 0 && doneRows > 0 && (
              <div style={{maxWidth:600,margin:'12px auto 0',padding:'0 20px'}}>
                <div style={{
                  background:'rgba(255,107,53,0.06)',border:`1px solid ${T.flameBorder}`,
                  borderRadius:14,padding:'12px 16px',
                  display:'flex',alignItems:'center',gap:10,
                }}>
                  <IconGlyph name="shield_check" size={18} strokeWidth={2.3} color={T.flame}/>
                  <div>
                    <div style={{fontSize:13,fontWeight:700,color:T.flame}}>Good to have you back</div>
                    <div style={{fontSize:12,color:T.textMuted}}>Path adjusted — you&apos;re right on track.</div>
                  </div>
                </div>
              </div>
            )}

            {showInlineNextDayProgress && (
              <div style={{maxWidth:600,margin:'12px auto 0',padding:'0 20px'}}>
                <div style={{
                  width:'100%',
                  padding:'16px 18px',
                  background:'rgba(255,255,255,0.04)',
                  border:`1px solid ${T.tealBorder}`,
                  borderRadius:18,
                  boxShadow:'0 16px 32px rgba(0,0,0,0.16)',
                  animation:'fadeUp 0.30s ease both',
                }}>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:10,marginBottom:10}}>
                    <div>
                      <div style={{fontSize:14,fontWeight:800,color:T.text,marginBottom:4}}>
                        {nextDayStatusLabel}
                      </div>
                      <div style={{fontSize:11,color:T.textMuted,lineHeight:1.5}}>
                        {nextDayStatusDetail}
                      </div>
                    </div>
                    <div style={{width:14,height:14,borderRadius:'50%',border:`2px solid ${T.teal}`,borderTopColor:'transparent',animation:'spin 0.7s linear infinite',flexShrink:0}}/>
                  </div>
                  <div style={{
                    position:'relative',
                    height:8,
                    borderRadius:9999,
                    overflow:'hidden',
                    background:'rgba(255,255,255,0.06)',
                  }}>
                    <div style={{
                      position:'absolute',
                      inset:0,
                      width:'42%',
                      borderRadius:9999,
                      background:T.primaryGradientSoft,
                      boxShadow:'0 0 20px rgba(14,245,194,0.28)',
                      animation:'nextDayProgress 1.15s ease-in-out infinite',
                    }}/>
                  </div>
                </div>
              </div>
            )}

            {!showInlineNextDayProgress && showInlineNextDayCTA && (
              <div style={{maxWidth:600,margin:'12px auto 0',padding:'0 20px'}}>
                <button
                  onClick={handleStartNextDay}
                  disabled={nextDayBusy}
                  className="interactive-cta"
                  style={{
                    width:'100%',
                    padding:'16px 18px',
                    background: nextDayBusy ? T.tealDim : T.primaryGradient,
                    border: nextDayBusy ? `1px solid ${T.tealBorder}` : 'none',
                    borderRadius:18,
                    color: nextDayBusy ? T.teal : T.ink,
                    fontSize:15,
                    fontWeight:800,
                    cursor: nextDayBusy ? 'default' : 'pointer',
                    fontFamily:T.font,
                    boxShadow:'0 16px 32px rgba(0,0,0,0.22), 0 0 24px rgba(14,245,194,0.18)',
                    display:'flex',
                    alignItems:'center',
                    justifyContent:'center',
                    gap:10,
                    animation:'fadeUp 0.30s ease both',
                  }}
                >
                  <>{nextDayCtaLabel}</>
                </button>
              </div>
            )}

            <div style={{height:showInlineNextDayCTA || showInlineNextDayProgress ? 36 : 24}}/>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════ */}
        {/* STATS TAB                                                      */}
        {/* ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'stats' && (
          <div className="shell-transition-fade" style={{maxWidth:600,margin:'0 auto',padding:'20px 20px 0'}}>
            <h2 style={{fontSize:22,fontWeight:800,color:T.text,letterSpacing:'-0.4px',marginBottom:16}}>
              Your Progress
            </h2>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:20}}>
              <StatCard label="Total XP"       value={xpDisplay.totalXp.toLocaleString()} sub="lifetime"        color={T.amber}/>
              <StatCard label="Streak"         value={`${streakData.current}d`}             sub={streakData.current>=7?'Strong momentum':'Keep going'} color={T.flame}/>
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
                  background:T.masteryGradient,
                  display:'flex',alignItems:'center',justifyContent:'center',
                  fontWeight:900,fontSize:18,color:'#fff',
                  boxShadow:'0 0 24px rgba(129,140,248,0.40)',
                }}>{xpDisplay.level}</div>
              </div>
              <div style={{height:8,background:'rgba(255,255,255,0.06)',borderRadius:9999,overflow:'hidden'}}>
                <div style={{
                  height:'100%',width:`${Math.round(xpDisplay.pct*100)}%`,
                  background:T.masteryGradientSoft,borderRadius:9999,
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
                You&apos;re ahead of last week — outstanding consistency.
              </div>
            )}
            {weekDays < 3 && doneRows > 0 && (
              <div style={{background:T.surface,border:`1px solid ${T.border}`,
                borderRadius:14,padding:'12px 16px',marginBottom:12,
                fontSize:13,color:T.textSec,fontWeight:500}}>
                Complete today&apos;s mission to build momentum. Every session counts.
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════ */}
        {/* PATH TAB                                                       */}
        {/* ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'path' && (
          <div className="shell-transition-fade" style={{maxWidth:760,margin:'0 auto',padding:'18px 0 0'}}>
            {pathTracker.modules.length > 0 ? (
              <>
                <PathTrackerSummary tracker={pathTracker}/>
                <div style={{display:'grid',gap:12,padding:'14px 20px 28px'}}>
                  {pathTracker.modules.map((module, index) => (
                    <PathModuleCard
                      key={module.id}
                      module={module}
                      expanded={Boolean(expandedPathModules[module.id])}
                      onToggle={() => togglePathModule(module.id)}
                      expandedUnits={expandedPathUnits}
                      onToggleUnit={togglePathUnit}
                      index={index}
                    />
                  ))}
                  {pathTracker.tailItems.map((item, index) => (
                    <StaggerBlock key={item.id} index={pathTracker.modules.length + index}>
                      <PathProjectCard item={item}/>
                    </StaggerBlock>
                  ))}
                </div>
              </>
            ) : (
              <div style={{maxWidth:680,margin:'0 auto',padding:'0 20px'}}>
                <div style={{
                  borderRadius:24,
                  border:`1px solid ${T.border}`,
                  background:'linear-gradient(145deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))',
                  padding:'28px 22px',
                  textAlign:'center',
                  boxShadow:'0 14px 34px rgba(0,0,0,0.22)',
                }}>
                  <div style={{
                    width:56,height:56,borderRadius:18,
                    margin:'0 auto 14px',
                    display:'flex',alignItems:'center',justifyContent:'center',
                    background:'rgba(14,245,194,0.08)',border:`1px solid ${T.tealBorder}`,
                    color:T.teal,
                  }}>
                    <IconGlyph name="map" size={24} strokeWidth={2.3}/>
                  </div>
                  <h2 style={{fontSize:22,fontWeight:800,color:T.text,marginBottom:8,letterSpacing:'-0.4px'}}>
                    Your curriculum tracker is getting ready
                  </h2>
                  <p style={{color:T.textMuted,fontSize:14,lineHeight:1.65,maxWidth:440,margin:'0 auto'}}>
                    As soon as your course outline is available, this tab will show every module, unit, sub-unit, and milestone project in one place.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════ */}
        {/* SETTINGS TAB                                                   */}
        {/* ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'settings' && (
          <div className="shell-transition-fade" style={{maxWidth:600,margin:'0 auto',padding:'20px 20px 0'}}>
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
                  background:T.masteryGradient,
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
                {label:'Current', sub:'Complete a mission to keep it', val:`${streakData.current} days`, color:T.flame},
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

            <div style={{background:T.surface,border:`1px solid ${T.border}`,
              borderRadius:18,padding:'16px 18px',marginBottom:12}}>
              <div style={{fontSize:13,fontWeight:700,color:T.text,marginBottom:10}}>
                Energy
              </div>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                <div>
                  <div style={{fontSize:13,color:T.textSec,fontWeight:600}}>Max hearts</div>
                  <div style={{fontSize:11,color:T.textMuted}}>Upgrade this in the gem shop</div>
                </div>
                <span style={{fontSize:16,fontWeight:900,color:T.teal}}>{maxHearts}</span>
              </div>
            </div>

            <div style={{background:T.surface,border:`1px solid ${T.border}`,
              borderRadius:18,padding:'16px 18px',marginBottom:12}}>
              <div style={{fontSize:13,fontWeight:700,color:T.text,marginBottom:10}}>
                Theme
              </div>
              <div style={{display:'grid',gap:8}}>
                {Array.from(new Set(['default', ...ownedThemes])).map((themeId) => {
                  const theme = APP_THEMES[themeId]
                  const isActive = activeTheme === themeId
                  return (
                    <button
                      key={themeId}
                      onClick={() => applyTheme(themeId)}
                      style={{
                        width:'100%',
                        padding:'12px 14px',
                        background:isActive ? T.tealDim : 'rgba(255,255,255,0.02)',
                        border:`1px solid ${isActive ? T.tealBorder : T.borderAlt}`,
                        borderRadius:14,
                        cursor:'pointer',
                        fontFamily:T.font,
                        display:'flex',
                        alignItems:'center',
                        justifyContent:'space-between',
                        gap:12,
                        textAlign:'left',
                      }}
                    >
                      <div>
                        <div style={{fontSize:13,fontWeight:700,color:isActive ? T.teal : T.text}}>
                          {theme.name}
                        </div>
                        <div style={{fontSize:11,color:T.textMuted}}>
                          {theme.description}
                        </div>
                      </div>
                      <span style={{
                        fontSize:11,fontWeight:800,
                        color:isActive ? T.teal : T.textSec,
                        letterSpacing:'0.4px',textTransform:'uppercase',
                      }}>
                        {isActive ? 'Applied' : 'Use'}
                      </span>
                    </button>
                  )
                })}
              </div>
              {ownedThemes.length === 0 && (
                <div style={{fontSize:11,color:T.textMuted,marginTop:10}}>
                  Buy a theme in the gem shop to unlock alternate looks. Default is always available.
                </div>
              )}
            </div>

            {/* Portfolio */}
            <div style={{background:T.surface,border:`1px solid ${T.border}`,
              borderRadius:18,overflow:'hidden',marginBottom:12}}>
              <button onClick={() => router.push('/portfolio')} style={{
                width:'100%',padding:'16px 18px',background:'none',border:'none',
                cursor:'pointer',fontFamily:T.font,
                display:'flex',alignItems:'center',justifyContent:'space-between',
                color:T.textSec,fontSize:14,fontWeight:600,
              }}>
                <span style={{ display:'inline-flex', alignItems:'center', gap:10 }}>
                  <IconGlyph name="rocket" size={16} strokeWidth={2.3}/>
                  My Portfolio
                </span>
                <ArrowRight/>
              </button>
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
        {activeTab === 'badges' && (
          <div className="shell-transition-fade" style={{ paddingTop: 20, paddingBottom: 40 }}>
            <BadgeShowcase earnedIds={earnedBadgeIds} />
          </div>
        )}

        {activeTab === 'shop' && (
          <div className="shell-transition-fade">
            <GemShop
              gems={gems}
              goalId={goal?.id}
              activeTheme={activeTheme}
              maxHearts={maxHearts}
              inventoryCounts={inventoryCounts}
              onPurchase={(data) => {
                if (data.newGemTotal != null) setGems(data.newGemTotal)
                if (data.heartsRemaining != null) { setPrevHearts(heartsRemaining); setHeartsRemaining(data.heartsRemaining) }
                if (data.maxHearts != null) {
                  setMaxHearts(data.maxHearts)
                  setStoredMaxHearts(data.maxHearts)
                }
                if (data.freezeCount != null) setFreezeCount(data.freezeCount)
                if (data.xpBoostUntil) setXpBoostUntil(new Date(data.xpBoostUntil))
                if (Array.isArray(data.ownedThemes)) {
                  setStoredOwnedThemes(data.ownedThemes)
                  setOwnedThemes(data.ownedThemes)
                }
                if (data.inventoryCounts) setInventoryCounts(data.inventoryCounts)
                if (data.streakRepaired) {
                  setStreakData(prev => ({ ...prev, current: data.currentStreak || prev.current }))
                }
                setGemPulse(true)
                setTimeout(() => setGemPulse(false), 400)
                // Reload to sync all state from server
                load(true)
              }}
            />
          </div>
        )}
      </div>

      {/* ── iOS bottom tab bar ── */}
      <div style={{
        position:'fixed',bottom:0,left:0,right:0,zIndex:70,
        background:T.chrome,
        backdropFilter:'blur(32px) saturate(200%)',
        WebkitBackdropFilter:'blur(32px) saturate(200%)',
        borderTop:`1px solid ${T.border}`,
      }} className="safe-bottom-nav">
        <div style={{maxWidth:600,margin:'0 auto',
          display:'grid',gridTemplateColumns:'repeat(6, 1fr)'}}>
          {[
            {key:'home',     label:'Home',   Icon:HomeIcon    },
            {key:'badges',   label:'Badges', Icon:BadgesIcon  },
            {key:'shop',     label:'Shop',   Icon:ShopIcon    },
            {key:'stats',    label:'Stats',  Icon:StatsIcon   },
            {key:'path',     label:'Path',   Icon:PathIcon    },
            {key:'settings', label:'More',   Icon:SettingsIcon},
          ].map(({key,label,Icon}) => {
            const active = activeTab === key
            return (
              <button key={key} onClick={() => handleTabSelect(key)} className="interactive-icon" style={{
                background:'none',border:'none',
                padding:'10px 0 12px',
                display:'flex',flexDirection:'column',alignItems:'center',gap:3,
                cursor:'pointer',color:active?T.teal:T.textMuted,
                fontFamily:T.font,transition:'color 0.18s',position:'relative',
                minHeight:52,
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
    </div>
  )
}
