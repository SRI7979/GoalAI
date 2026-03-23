// Stats — Emotional Reinforcement Screen
// Not just numbers — a celebration of competence, consistency, and momentum.
'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getLevelProgress, LEVEL_TITLES } from '@/lib/xp'
import { streakStatusLabel } from '@/lib/streak'
import { trackStatsViewed } from '@/lib/analytics'
import BadgeShowcase from '@/components/BadgeShowcase'
import IconGlyph from '@/components/IconGlyph'
import Skeleton from '@/components/Skeleton'

// ─── Design tokens ────────────────────────────────────────────────────────────
const T = {
  bg:          '#06060f',
  surface:     'rgba(255,255,255,0.04)',
  border:      'rgba(255,255,255,0.08)',
  teal:        '#0ef5c2',
  tealDim:     'rgba(14,245,194,0.08)',
  tealBorder:  'rgba(14,245,194,0.22)',
  blue:        '#00d4ff',
  flame:       '#FF6B35',
  flameDim:    'rgba(255,107,53,0.10)',
  flameBorder: 'rgba(255,107,53,0.28)',
  amber:       '#FBBF24',
  mastery:     '#818CF8',
  masteryDim:  'rgba(129,140,248,0.10)',
  masteryBdr:  'rgba(129,140,248,0.28)',
  text:        '#F1F5F9',
  textSec:     '#94A3B8',
  textMuted:   '#475569',
  font:        "'Plus Jakarta Sans','DM Sans',system-ui,sans-serif",
}

const KEYFRAMES = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  ::-webkit-scrollbar{display:none}
  @keyframes fadeUp   { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
  @keyframes barGrow  { from{width:0%} to{width:var(--target-w)} }
  @keyframes ringFill { from{stroke-dashoffset:var(--full)} to{stroke-dashoffset:var(--offset)} }
  @keyframes countUp  { from{opacity:0;transform:scale(0.7)} to{opacity:1;transform:scale(1)} }
  @keyframes pulseGlow{ 0%,100%{box-shadow:0 0 12px rgba(14,245,194,0.25)} 50%{box-shadow:0 0 28px rgba(14,245,194,0.50)} }
  @media (prefers-reduced-motion:reduce){
    @keyframes fadeUp  { from{opacity:0} to{opacity:1} }
    @keyframes barGrow { from{width:0%} to{width:var(--target-w)} }
    @keyframes ringFill{ from{stroke-dashoffset:var(--full)} to{stroke-dashoffset:var(--offset)} }
    @keyframes countUp { from{opacity:0} to{opacity:1} }
    @keyframes pulseGlow{ to{} }
  }
`

// ─── Icons ────────────────────────────────────────────────────────────────────
const HomeIcon  = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
const PathIcon  = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
const StatsIcon = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>

// ─── Tab bar ──────────────────────────────────────────────────────────────────
function TabBar({ onNav }) {
  const tabs = [
    { key:'home',  icon:<HomeIcon/>,  label:'Today' },
    { key:'path',  icon:<PathIcon/>,  label:'Map'   },
    { key:'stats', icon:<StatsIcon/>, label:'Stats' },
  ]
  return (
    <div style={{
      position:'fixed', bottom:0, left:0, right:0, zIndex:500,
      background:'rgba(6,6,15,0.90)', borderTop:'1px solid rgba(255,255,255,0.08)',
      backdropFilter:'blur(28px)', WebkitBackdropFilter:'blur(28px)',
      display:'flex', justifyContent:'space-around', alignItems:'center',
      padding:'12px 0 max(env(safe-area-inset-bottom),12px)',
      fontFamily:T.font,
    }}>
      {tabs.map(t => (
        <button key={t.key} onClick={() => onNav(t.key)} style={{
          display:'flex', flexDirection:'column', alignItems:'center', gap:4,
          background:'none', border:'none', cursor:'pointer', padding:'4px 20px',
          color: t.key === 'stats' ? T.teal : T.textMuted,
          opacity: t.key === 'stats' ? 1 : 0.65,
        }}>
          {t.icon}
          <span style={{ fontSize:10, fontWeight:600 }}>{t.label}</span>
        </button>
      ))}
    </div>
  )
}

// ─── Stat hero number ─────────────────────────────────────────────────────────
function HeroStat({ value, label, color, sub, delay=0 }) {
  return (
    <div style={{
      background: T.surface,
      border:`1px solid ${T.border}`,
      borderRadius:18, padding:'18px 16px',
      backdropFilter:'blur(16px)', WebkitBackdropFilter:'blur(16px)',
      boxShadow:'inset 0 1px 0 rgba(255,255,255,0.06)',
      animation:`fadeUp 0.40s ${delay}s both`,
    }}>
      <div style={{ fontSize:11, fontWeight:700, color:T.textMuted,
        textTransform:'uppercase', letterSpacing:'1.1px', marginBottom:8 }}>
        {label}
      </div>
      <div style={{
        fontSize:30, fontWeight:900, color: color || T.text,
        letterSpacing:'-1px', lineHeight:1,
        animation:`countUp 0.50s ${delay+0.1}s both`,
      }}>
        {value}
      </div>
      {sub && <div style={{ fontSize:11, color:T.textMuted, marginTop:4 }}>{sub}</div>}
    </div>
  )
}

// ─── Level ring ───────────────────────────────────────────────────────────────
function LevelRing({ level, title, pct, xpInLevel, xpForLevel }) {
  const r        = 52
  const circ     = 2 * Math.PI * r
  const offset   = circ * (1 - Math.min(1, pct))

  return (
    <div style={{
      background:'linear-gradient(145deg,rgba(129,140,248,0.10),rgba(99,102,241,0.05))',
      border:'1px solid rgba(129,140,248,0.22)',
      borderRadius:20, padding:'20px',
      display:'flex', alignItems:'center', gap:20,
      backdropFilter:'blur(16px)', WebkitBackdropFilter:'blur(16px)',
      animation:'fadeUp 0.40s 0.05s both',
    }}>
      {/* SVG ring */}
      <div style={{ flexShrink:0, position:'relative' }}>
        <svg width="120" height="120" viewBox="0 0 120 120">
          {/* Track */}
          <circle cx="60" cy="60" r={r} fill="none"
            stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
          {/* Fill */}
          <circle cx="60" cy="60" r={r} fill="none"
            stroke="url(#lvlGrad)" strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            transform="rotate(-90 60 60)"
            style={{ transition:'stroke-dashoffset 0.8s cubic-bezier(0.16,1,0.3,1)' }}
          />
          <defs>
            <linearGradient id="lvlGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#818CF8" />
              <stop offset="100%" stopColor="#6366F1" />
            </linearGradient>
          </defs>
          {/* Center */}
          <text x="60" y="54" textAnchor="middle"
            fill="#fff" fontSize="22" fontWeight="900" fontFamily="Plus Jakarta Sans,sans-serif">
            {level}
          </text>
          <text x="60" y="70" textAnchor="middle"
            fill="#475569" fontSize="10" fontWeight="600" fontFamily="Plus Jakarta Sans,sans-serif">
            LEVEL
          </text>
        </svg>
      </div>

      {/* Text */}
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:18, fontWeight:800, color:T.text, marginBottom:4 }}>{title}</div>
        <div style={{ fontSize:12, color:T.textMuted, marginBottom:12 }}>
          {xpInLevel.toLocaleString()} / {xpForLevel.toLocaleString()} XP to next level
        </div>
        {/* XP bar */}
        <div style={{ height:6, background:'rgba(255,255,255,0.06)', borderRadius:9999, overflow:'hidden' }}>
          <div style={{
            height:'100%', borderRadius:9999,
            background:'linear-gradient(90deg,#818CF8,#6366F1)',
            width:`${Math.round(pct*100)}%`,
            transition:'width 0.8s cubic-bezier(0.16,1,0.3,1)',
            boxShadow:'0 0 10px rgba(129,140,248,0.50)',
          }}/>
        </div>
        <div style={{ fontSize:11, color:T.textMuted, marginTop:6 }}>
          {Math.round(pct*100)}% to Level {level+1}
        </div>
      </div>
    </div>
  )
}

// ─── Weekly bar chart ─────────────────────────────────────────────────────────
function WeeklyChart({ rows }) {
  // Build last 7 days
  const days = useMemo(() => {
    const dayLabels = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
    const result = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().split('T')[0]
      const dayRow  = rows.find(r => r.task_date === dateStr || r.created_at?.startsWith(dateStr))
      const tasks   = Array.isArray(dayRow?.tasks) ? dayRow.tasks : []
      const done    = tasks.filter(t => t.completed).length
      const total   = tasks.length
      const mins    = tasks.filter(t => t.completed)
        .reduce((s,t) => s + (Number(t.durationMin) || 0), 0)
      result.push({
        label:     dayLabels[d.getDay()],
        isToday:   i === 0,
        done,
        total,
        mins,
        complete:  total > 0 && done === total,
        partial:   done > 0 && done < total,
      })
    }
    return result
  }, [rows])

  const maxMins = Math.max(...days.map(d => d.mins), 1)

  return (
    <div style={{
      background:T.surface, border:`1px solid ${T.border}`,
      borderRadius:18, padding:'18px 16px',
      backdropFilter:'blur(16px)', WebkitBackdropFilter:'blur(16px)',
      animation:'fadeUp 0.40s 0.15s both',
    }}>
      <div style={{ fontSize:12, fontWeight:700, color:T.textMuted,
        textTransform:'uppercase', letterSpacing:'1px', marginBottom:16 }}>
        This week
      </div>
      <div style={{ display:'flex', alignItems:'flex-end', gap:8, height:80 }}>
        {days.map((d, i) => {
          const barH = d.mins > 0 ? Math.max(8, Math.round((d.mins / maxMins) * 72)) : 4
          const color = d.complete ? T.teal : d.partial ? T.blue : 'rgba(255,255,255,0.08)'
          return (
            <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
              {d.mins > 0 && (
                <div style={{ fontSize:9, color:T.textMuted, fontWeight:600, marginBottom:2 }}>
                  {d.mins}m
                </div>
              )}
              <div style={{
                width:'100%', height:barH,
                background: color,
                borderRadius:5,
                boxShadow: d.complete ? '0 0 8px rgba(14,245,194,0.35)' : 'none',
                transition:'height 0.6s cubic-bezier(0.16,1,0.3,1)',
              }}/>
              <div style={{
                fontSize:9, fontWeight: d.isToday ? 800 : 600,
                color: d.isToday ? T.teal : T.textMuted,
              }}>
                {d.label}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Mastery concept list ──────────────────────────────────────────────────────
function MasteryList({ masteries, loading }) {
  if (loading) return (
    <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
      {[0,1,2].map(i => <Skeleton key={i} h={52} r={12}/>)}
    </div>
  )
  if (!masteries.length) return (
    <div style={{ fontSize:13, color:T.textMuted, textAlign:'center', padding:'20px 0' }}>
      Complete tasks to build concept mastery
    </div>
  )

  const now = new Date()
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
      {masteries.slice(0,8).map((m, i) => {
        const pct = Math.min(1, (m.mastery_score || 0) / 100)
        const daysSince = m.last_review ? Math.floor((now - new Date(m.last_review)) / (1000*60*60*24)) : 0
        const isDecaying = daysSince >= 7 && m.mastery_score > 0
        const color = isDecaying ? T.amber : pct >= 0.8 ? T.teal : pct >= 0.5 ? T.blue : pct >= 0.3 ? T.mastery : T.textMuted
        return (
          <div key={m.concept_id || i} style={{
            background: isDecaying ? 'rgba(251,191,36,0.04)' : T.surface,
            border:`1px solid ${isDecaying ? 'rgba(251,191,36,0.18)' : T.border}`,
            borderRadius:12, padding:'11px 14px',
            backdropFilter:'blur(12px)', WebkitBackdropFilter:'blur(12px)',
            animation:`fadeUp 0.35s ${i*0.05}s both`,
          }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
              <span style={{ fontSize:13, fontWeight:600, color:T.text,
                overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:'65%' }}>
                {m.concept_id}
              </span>
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                {isDecaying && (
                  <span style={{ fontSize:10, fontWeight:700, color:T.amber, padding:'2px 6px', background:'rgba(251,191,36,0.10)', borderRadius:9999 }}>
                    {daysSince}d ago
                  </span>
                )}
                <span style={{ fontSize:12, fontWeight:800, color }}>
                  {Math.round(pct*100)}%
                </span>
              </div>
            </div>
            <div style={{ height:4, background:'rgba(255,255,255,0.06)', borderRadius:9999, overflow:'hidden' }}>
              <div style={{
                height:'100%', borderRadius:9999,
                background: isDecaying
                  ? 'linear-gradient(90deg,#FBBF24,#F59E0B)'
                  : pct >= 0.8
                  ? 'linear-gradient(90deg,#0ef5c2,#00d4ff)'
                  : pct >= 0.5
                  ? 'linear-gradient(90deg,#00d4ff,#818CF8)'
                  : '#818CF8',
                width:`${Math.round(pct*100)}%`,
                transition:'width 0.7s cubic-bezier(0.16,1,0.3,1)',
                boxShadow: isDecaying ? '0 0 6px rgba(251,191,36,0.40)' : pct >= 0.8 ? '0 0 6px rgba(14,245,194,0.40)' : 'none',
              }}/>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Consistency grade ────────────────────────────────────────────────────────
function consistencyGrade(completedDays, totalDays, currentStreak) {
  if (totalDays === 0) return { grade:'—', color:T.textMuted, desc:'No data yet' }
  const rate = completedDays / totalDays
  if (rate >= 0.90 || (rate >= 0.70 && currentStreak >= 14)) return { grade:'A+', color:T.teal,    desc:'Outstanding consistency' }
  if (rate >= 0.75 || (rate >= 0.50 && currentStreak >= 7))  return { grade:'A',  color:T.teal,    desc:'Excellent momentum'      }
  if (rate >= 0.60)                         return { grade:'B',  color:T.blue,    desc:'Solid progress'          }
  if (rate >= 0.45)                         return { grade:'C',  color:T.amber,   desc:'Room to grow'            }
  if (rate >= 0.25)                         return { grade:'D',  color:T.flame,   desc:'Showing up is step one'  }
  return { grade:'F', color:T.textMuted, desc:'Let\'s get back on track' }
}

// ─── Personal best card ───────────────────────────────────────────────────────
function PersonalBestCard({ longestStreak, totalMissions, totalXp, delay=0 }) {
  const items = [
    { label:'Best streak',     value:`${longestStreak} days`, icon:'flame', color:T.flame  },
    { label:'Missions done',   value:totalMissions,            icon:'check_circle',  color:T.teal   },
    { label:'Total XP earned', value:totalXp.toLocaleString(), icon:'bolt', color:T.amber  },
  ]
  return (
    <div style={{
      background:T.surface, border:`1px solid ${T.border}`,
      borderRadius:18, padding:'18px 16px',
      backdropFilter:'blur(16px)', WebkitBackdropFilter:'blur(16px)',
      animation:`fadeUp 0.40s ${delay}s both`,
    }}>
      <div style={{ fontSize:12, fontWeight:700, color:T.textMuted,
        textTransform:'uppercase', letterSpacing:'1px', marginBottom:14 }}>
        Personal bests
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        {items.map((item, i) => (
          <div key={i} style={{
            display:'flex', alignItems:'center', gap:12,
            padding:'8px 0',
            borderBottom: i < items.length-1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
          }}>
            <span style={{ width:24, textAlign:'center', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', color:item.color }}>
              <IconGlyph name={item.icon} size={18} strokeWidth={2.3}/>
            </span>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:11, color:T.textMuted, fontWeight:600 }}>{item.label}</div>
              <div style={{ fontSize:17, fontWeight:900, color:item.color, lineHeight:1.2 }}>{item.value}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── "Ahead of last week" comparison card ────────────────────────────────────
function MomentumCard({ rows }) {
  const { thisWeek, lastWeek, diff } = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    let tw = 0, lw = 0

    for (const row of rows) {
      if (!row.task_date && !row.created_at) continue
      const d = new Date(row.task_date || row.created_at)
      d.setHours(0, 0, 0, 0)
      const diffDays = Math.round((today - d) / (1000*60*60*24))
      const tasks    = Array.isArray(row.tasks) ? row.tasks : []
      const done     = tasks.filter(t => t.completed).length
      if (diffDays < 7)       tw += done
      else if (diffDays < 14) lw += done
    }
    return { thisWeek: tw, lastWeek: lw, diff: tw - lw }
  }, [rows])

  if (thisWeek === 0 && lastWeek === 0) return null

  const isAhead  = diff > 0
  const isSame   = diff === 0
  const color    = isAhead ? T.teal : isSame ? T.amber : T.textMuted
  const icon     = isAhead ? '↑' : isSame ? '→' : '↓'
  const message  = isAhead
    ? `You're ahead of last week by ${diff} task${diff===1?'':'s'}`
    : isSame
    ? 'Matching last week — keep going'
    : `${Math.abs(diff)} fewer than last week — time to accelerate`

  return (
    <div style={{
      background: isAhead ? T.tealDim : T.surface,
      border:`1px solid ${isAhead ? T.tealBorder : T.border}`,
      borderRadius:16, padding:'14px 16px',
      display:'flex', alignItems:'center', gap:12,
      backdropFilter:'blur(16px)', WebkitBackdropFilter:'blur(16px)',
      animation:'fadeUp 0.40s 0.25s both',
    }}>
      <div style={{
        width:36, height:36, borderRadius:'50%',
        background: isAhead ? 'rgba(14,245,194,0.15)' : 'rgba(255,255,255,0.05)',
        display:'flex', alignItems:'center', justifyContent:'center',
        fontSize:18, fontWeight:900, color, flexShrink:0,
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize:13, fontWeight:700, color }}>{message}</div>
        <div style={{ fontSize:11, color:T.textMuted, marginTop:2 }}>
          This week: {thisWeek} tasks · Last week: {lastWeek} tasks
        </div>
      </div>
    </div>
  )
}

// ─── Streak card ──────────────────────────────────────────────────────────────
function StreakCard({ current, longest }) {
  const label = streakStatusLabel(current)
  return (
    <div style={{
      background: current > 0
        ? 'linear-gradient(145deg,rgba(255,107,53,0.12),rgba(255,107,53,0.05))'
        : T.surface,
      border:`1px solid ${current>0 ? T.flameBorder : T.border}`,
      borderRadius:18, padding:'18px 16px',
      backdropFilter:'blur(16px)', WebkitBackdropFilter:'blur(16px)',
      animation:'fadeUp 0.40s 0.10s both',
    }}>
      <div style={{ fontSize:11, fontWeight:700, color:T.textMuted,
        textTransform:'uppercase', letterSpacing:'1px', marginBottom:10 }}>
        Streak
      </div>

      <div style={{ display:'flex', alignItems:'baseline', gap:8, marginBottom:4 }}>
        <span style={{ fontSize:48, fontWeight:900, color: current > 0 ? T.flame : T.textMuted,
          letterSpacing:'-2px', lineHeight:1 }}>
          {current}
        </span>
        <span style={{ fontSize:14, color:T.textMuted }}>days</span>
        {current > 0 && <IconGlyph name="flame" size={20} strokeWidth={2.3} color={T.flame}/>}
      </div>

      {label && (
        <div style={{ fontSize:12, color:T.flame, fontWeight:700, marginBottom:8 }}>{label}</div>
      )}

      <div style={{
        height:1, background:'rgba(255,255,255,0.06)', marginBottom:10,
      }}/>

      <div style={{ display:'flex', justifyContent:'space-between' }}>
        <div>
          <div style={{ fontSize:10, color:T.textMuted, fontWeight:600, marginBottom:2 }}>Best streak</div>
          <div style={{ fontSize:17, fontWeight:800, color: longest >= current && longest > 0 ? T.amber : T.textSec }}>
            {longest} days
          </div>
        </div>
        {current === longest && current > 0 && (
          <div style={{
            fontSize:11, fontWeight:700, color:'#06060f',
            background:T.amber, padding:'3px 10px',
            borderRadius:9999, alignSelf:'center',
          }}>
            Personal best!
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main Stats Page ──────────────────────────────────────────────────────────
export default function StatsPage() {
  const router = useRouter()

  const [loading,    setLoading]    = useState(true)
  const [rows,       setRows]       = useState([])
  const [progress,   setProgress]   = useState(null)
  const [masteries,  setMasteries]  = useState([])
  const [goal,       setGoal]       = useState(null)
  const [earnedBadgeIds, setEarnedBadgeIds] = useState(new Set())

  const load = useCallback(async () => {
    setLoading(true)
    const { data: authData } = await supabase.auth.getUser()
    const me = authData?.user
    if (!me) { router.push('/login'); return }

    const { data: activeGoal } = await supabase
      .from('goals').select('*').eq('user_id', me.id).eq('status','active')
      .order('created_at', { ascending:false }).limit(1).maybeSingle()
    if (!activeGoal) { setLoading(false); return }
    setGoal(activeGoal)

    const [{ data: taskRows }, { data: prog }, { data: mast }, { data: badges }] = await Promise.all([
      supabase.from('daily_tasks').select('*')
        .eq('goal_id', activeGoal.id).eq('user_id', me.id)
        .order('day_number', { ascending:true }),
      supabase.from('user_progress').select('*')
        .eq('goal_id', activeGoal.id).eq('user_id', me.id).maybeSingle(),
      supabase.from('concept_mastery').select('*')
        .eq('goal_id', activeGoal.id).eq('user_id', me.id)
        .order('mastery_score', { ascending:false }),
      supabase.from('achievements').select('badge_id')
        .eq('user_id', me.id),
    ])

    setRows(taskRows || [])
    setProgress(prog || null)
    setMasteries(mast || [])
    setEarnedBadgeIds(new Set((badges || []).map(b => b.badge_id)))

    trackStatsViewed({
      userId: me.id,
      goalId: activeGoal.id,
      streakValue: prog?.current_streak || 0,
      xpBalance:   prog?.total_xp || 0,
    })

    setLoading(false)
  }, [router])

  useEffect(() => {
    const timer = setTimeout(() => {
      load()
    }, 0)

    return () => clearTimeout(timer)
  }, [load])

  // ── Derived stats ──────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const xp             = Number(progress?.total_xp)     || 0
    const currentStreak  = Number(progress?.current_streak)|| 0
    const longestStreak  = Number(progress?.longest_streak)|| 0
    const levelProg      = getLevelProgress(xp)
    const completedRows  = rows.filter(r => r.completion_status === 'completed')
    const totalMissions  = completedRows.length
    const totalDays      = rows.length

    const studyMinsTotal = rows.reduce((acc, row) => {
      const tasks = Array.isArray(row.tasks) ? row.tasks : []
      return acc + tasks.filter(t => t.completed).reduce((s,t) => s+(Number(t.durationMin)||0), 0)
    }, 0)

    // This week study minutes
    const now = new Date()
    const weekMins = rows.reduce((acc, row) => {
      const d = new Date(row.task_date || row.created_at)
      if (!d || isNaN(d)) return acc
      const diff = (now - d) / (1000*60*60*24)
      if (diff > 7) return acc
      const tasks = Array.isArray(row.tasks) ? row.tasks : []
      return acc + tasks.filter(t => t.completed).reduce((s,t) => s+(Number(t.durationMin)||0), 0)
    }, 0)

    const grade = consistencyGrade(totalMissions, totalDays, currentStreak)

    return { xp, currentStreak, longestStreak, levelProg, totalMissions,
      totalDays, studyMinsTotal, weekMins, grade }
  }, [rows, progress])

  // ── Nav ────────────────────────────────────────────────────────────────────
  const handleNav = useCallback((tab) => {
    if (tab === 'home') router.push('/dashboard')
    if (tab === 'path') router.push('/path')
  }, [router])

  return (
    <>
      <style>{KEYFRAMES}</style>
      <div style={{
        minHeight:'100vh', background:T.bg,
        fontFamily:T.font, color:T.text,
        paddingBottom:90,
      }}>

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div style={{
          position:'sticky', top:0, zIndex:200,
          background:'rgba(6,6,15,0.88)',
          borderBottom:'1px solid rgba(255,255,255,0.07)',
          backdropFilter:'blur(28px)', WebkitBackdropFilter:'blur(28px)',
          padding:'16px 20px',
        }}>
          <div style={{ maxWidth:560, margin:'0 auto' }}>
            <div style={{ fontSize:10, fontWeight:800, color:T.textMuted,
              letterSpacing:'1.5px', textTransform:'uppercase', marginBottom:2 }}>
              Progress
            </div>
            <div style={{ fontSize:22, fontWeight:900, color:T.text, letterSpacing:'-0.5px' }}>
              Your stats
            </div>
          </div>
        </div>

        {/* ── Content ────────────────────────────────────────────────────── */}
        <div style={{ maxWidth:560, margin:'0 auto', padding:'20px 20px 0' }}>

          {loading ? (
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <Skeleton h={110} r={18}/>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <Skeleton h={90} r={18}/><Skeleton h={90} r={18}/>
              </div>
              <Skeleton h={120} r={18}/>
              <Skeleton h={90} r={18}/>
            </div>
          ) : !goal ? (
            <div style={{ textAlign:'center', padding:'60px 20px' }}>
              <div style={{
                width:64,height:64,margin:'0 auto 16px',borderRadius:22,
                display:'flex',alignItems:'center',justifyContent:'center',
                background:'rgba(255,255,255,0.04)',border:`1px solid ${T.border}`,color:T.textSec,
              }}>
                <IconGlyph name="chart" size={26} strokeWidth={2.2}/>
              </div>
              <div style={{ fontSize:16, fontWeight:700, color:T.text, marginBottom:8 }}>No goal active</div>
              <div style={{ fontSize:13, color:T.textMuted, marginBottom:24 }}>
                Start your first learning path to see stats.
              </div>
              <button onClick={() => router.push('/onboarding')} style={{
                padding:'12px 24px', background:'linear-gradient(135deg,#0ef5c2,#00d4ff)',
                border:'none', borderRadius:12, color:'#06060f',
                fontSize:14, fontWeight:800, cursor:'pointer', fontFamily:T.font,
              }}>Get Started</button>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

              {/* Level ring */}
              <LevelRing
                level={stats.levelProg.level}
                title={stats.levelProg.title}
                pct={stats.levelProg.pct}
                xpInLevel={stats.levelProg.xpInLevel}
                xpForLevel={stats.levelProg.xpForLevel}
              />

              {/* Streak card */}
              <StreakCard current={stats.currentStreak} longest={stats.longestStreak} />

              {/* Hero stats grid */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <HeroStat
                  label="Missions done"
                  value={stats.totalMissions}
                  color={T.teal}
                  sub={`of ${stats.totalDays} total days`}
                  delay={0.10}
                />
                <HeroStat
                  label="Total XP"
                  value={stats.xp.toLocaleString()}
                  color={T.amber}
                  sub={`${LEVEL_TITLES[Math.max(0, Math.min(stats.levelProg.level-1, 19))]}`}
                  delay={0.12}
                />
                <HeroStat
                  label="Study minutes"
                  value={`${Math.round(stats.weekMins)}m`}
                  color={T.blue}
                  sub="this week"
                  delay={0.14}
                />
                <HeroStat
                  label="Consistency"
                  value={stats.grade.grade}
                  color={stats.grade.color}
                  sub={stats.grade.desc}
                  delay={0.16}
                />
              </div>

              {/* Momentum comparison */}
              <MomentumCard rows={rows} />

              {/* Weekly bar chart */}
              <WeeklyChart rows={rows} />

              {/* Personal bests */}
              <PersonalBestCard
                longestStreak={stats.longestStreak}
                totalMissions={stats.totalMissions}
                totalXp={stats.xp}
                delay={0.20}
              />

              {/* Achievement vault */}
              <div style={{ animation:'fadeUp 0.40s 0.24s both' }}>
                <BadgeShowcase earnedIds={earnedBadgeIds} maxWidth={560} outerPadding="0 0 4px" />
              </div>

              {/* Portfolio link */}
              <a href="/portfolio" style={{
                display:'flex', alignItems:'center', justifyContent:'space-between',
                padding:'16px 18px', borderRadius:16,
                background:T.surface, border:`1px solid ${T.border}`,
                backdropFilter:'blur(16px)', WebkitBackdropFilter:'blur(16px)',
                textDecoration:'none', cursor:'pointer',
                animation:'fadeUp 0.40s 0.23s both',
              }}>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <IconGlyph name="rocket" size={18} strokeWidth={2.3} color={T.teal}/>
                  <div>
                    <div style={{ fontSize:14, fontWeight:700, color:T.text }}>My Portfolio</div>
                    <div style={{ fontSize:11, color:T.textMuted }}>View completed projects & AI reviews</div>
                  </div>
                </div>
                <span style={{ color:T.textMuted, fontSize:18 }}>›</span>
              </a>

              {/* Mastery list */}
              <div style={{
                background:T.surface, border:`1px solid ${T.border}`,
                borderRadius:18, padding:'18px 16px',
                backdropFilter:'blur(16px)', WebkitBackdropFilter:'blur(16px)',
                animation:'fadeUp 0.40s 0.22s both',
              }}>
                <div style={{ fontSize:12, fontWeight:700, color:T.textMuted,
                  textTransform:'uppercase', letterSpacing:'1px', marginBottom:14 }}>
                  Concept mastery
                </div>
                <MasteryList masteries={masteries} loading={false} />
              </div>

              {/* Total study time */}
              {stats.studyMinsTotal > 0 && (
                <div style={{
                  background:T.surface, border:`1px solid ${T.border}`,
                  borderRadius:16, padding:'14px 16px',
                  display:'flex', alignItems:'center', gap:12,
                  backdropFilter:'blur(16px)', WebkitBackdropFilter:'blur(16px)',
                  animation:'fadeUp 0.40s 0.25s both',
                }}>
                  <span style={{ fontSize:24 }}>⏱</span>
                  <div>
                    <div style={{ fontSize:20, fontWeight:900, color:T.mastery }}>
                      {stats.studyMinsTotal >= 60
                        ? `${Math.floor(stats.studyMinsTotal/60)}h ${stats.studyMinsTotal%60}m`
                        : `${stats.studyMinsTotal}m`}
                    </div>
                    <div style={{ fontSize:11, color:T.textMuted }}>total study time</div>
                  </div>
                </div>
              )}

            </div>
          )}
        </div>

        <TabBar onNav={handleNav} />
      </div>
    </>
  )
}
