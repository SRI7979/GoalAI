// Onboarding — Polished guided setup
'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const GOAL_SUGGESTIONS = [
  'Learn Python',
  'Web Development',
  'Machine Learning',
  'UI/UX Design',
  'Data Science',
  'Learn Guitar',
  'Public Speaking',
  'Creative Writing',
  'Spanish',
  'Learn Piano',
]

const KNOWLEDGE_CHIPS = [
  'Complete beginner',
  'Watched some tutorials',
  'Built small projects',
  'Intermediate level',
]

const TIME_STORIES = {
  15: '🍿 A short episode',
  30: '☕ A coffee break',
  45: '📖 A study session',
  60: '🎯 A deep dive',
}

const GENERATION_STEPS = [
  'Analyzing skill structure',
  'Mapping concept dependencies',
  'Curating resources',
  'Building your path',
  'Finalizing',
]

const GENERATION_BUBBLES = [
  'Hmm, interesting goal!',
  'Mapping out your concepts...',
  'Finding the best resources...',
  'Almost there!',
  'Your path is ready!',
]

const STEP_TITLES = [
  'Goal',
  'Mode',
  'Time',
  'Knowledge',
]

function MascotBubble({ text }) {
  return (
    <div style={{ display:'flex', alignItems:'flex-end', gap:12 }}>
      <div style={{
        width:56, height:56, borderRadius:'34%',
        background:'linear-gradient(135deg, rgba(14,245,194,0.20), rgba(0,212,255,0.14))',
        border:'1px solid rgba(14,245,194,0.28)',
        display:'flex', alignItems:'center', justifyContent:'center',
        fontSize:28, boxShadow:'0 0 32px rgba(14,245,194,0.18)',
        flexShrink:0,
      }}>
        🤖
      </div>
      <div style={{
        position:'relative',
        padding:'12px 14px',
        borderRadius:18,
        background:'rgba(255,255,255,0.08)',
        border:'1px solid rgba(255,255,255,0.12)',
        color:'#f5f5f7',
        fontSize:13,
        lineHeight:1.5,
        boxShadow:'inset 0 1px 0 rgba(255,255,255,0.14)',
      }}>
        {text}
        <div style={{
          position:'absolute', left:-8, bottom:14,
          width:14, height:14, transform:'rotate(45deg)',
          background:'rgba(255,255,255,0.08)',
          borderLeft:'1px solid rgba(255,255,255,0.12)',
          borderBottom:'1px solid rgba(255,255,255,0.12)',
        }}/>
      </div>
    </div>
  )
}

function XPFloater({ amount, label }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.92 }}
      animate={{ opacity: [0, 1, 1, 0], y: [12, -4, -14, -32], scale: [0.92, 1, 1.04, 0.98] }}
      transition={{ duration: 1.45, ease: [0.22, 1, 0.36, 1] }}
      style={{
        position:'fixed',
        top:24,
        left:'50%',
        transform:'translateX(-50%)',
        zIndex:40,
        pointerEvents:'none',
      }}
    >
      <div style={{
        padding:'12px 18px',
        borderRadius:16,
        background:'linear-gradient(135deg, rgba(14,245,194,0.18), rgba(0,212,255,0.14))',
        border:'1px solid rgba(14,245,194,0.25)',
        boxShadow:'0 18px 40px rgba(14,245,194,0.14)',
        textAlign:'center',
      }}>
        <div style={{ color:'#0ef5c2', fontSize:18, fontWeight:900 }}>+{amount} XP</div>
        {label && <div style={{ color:'#c8f7eb', fontSize:11, fontWeight:700, marginTop:4 }}>{label}</div>}
      </div>
    </motion.div>
  )
}

export default function Onboarding() {
  const router = useRouter()
  const reduceMotion = useReducedMotion()

  const [step, setStep] = useState(1)
  const [goal, setGoal] = useState('')
  const [mode, setMode] = useState('')
  const [days, setDays] = useState('30')
  const [customDays, setCustomDays] = useState('')
  const [weekdayMins, setWeekdayMins] = useState('30')
  const [customWeekdayMins, setCustomWeekdayMins] = useState('')
  const [weekendMins, setWeekendMins] = useState('60')
  const [customWeekendMins, setCustomWeekendMins] = useState('')
  const [knowledge, setKnowledge] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [genStep, setGenStep] = useState(0)
  const [focused, setFocused] = useState(null)
  const [user, setUser] = useState(null)
  const [direction, setDirection] = useState(1)
  const [onboardingXp, setOnboardingXp] = useState(0)
  const [xpToast, setXpToast] = useState(null)

  const onboardingXpRef = useRef(0)
  const rewardedStepsRef = useRef(new Set())

  useEffect(() => {
    onboardingXpRef.current = onboardingXp
  }, [onboardingXp])

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: authUser } }) => {
      if (!authUser) router.push('/login')
      else setUser(authUser)
    })
  }, [router])

  const resolvedDays = parseInt(customDays || days, 10) || 30
  const resolvedWeekdayMins = parseInt(customWeekdayMins || weekdayMins, 10) || 30
  const resolvedWeekendMins = parseInt(customWeekendMins || weekendMins, 10) || 60
  const progressPct = ((step - 1) / (STEP_TITLES.length - 1)) * 100
  const generationBubble = GENERATION_BUBBLES[Math.min(genStep, GENERATION_BUBBLES.length - 1)]

  const inputStyle = useCallback((name) => ({
    width:'100%',
    padding:'14px 16px',
    background: focused === name ? 'rgba(14,245,194,0.06)' : 'rgba(0,0,0,0.24)',
    border:`1px solid ${focused === name ? 'rgba(14,245,194,0.38)' : 'rgba(255,255,255,0.10)'}`,
    borderRadius:16,
    color:'#f5f5f7',
    fontSize:15,
    fontFamily:"'DM Sans', sans-serif",
    transition:'all 0.2s ease',
    boxShadow: focused === name
      ? 'inset 0 1px 0 rgba(14,245,194,0.15), 0 0 0 3px rgba(14,245,194,0.08)'
      : 'inset 0 1px 0 rgba(255,255,255,0.06)',
  }), [focused])

  const awardStepXp = useCallback((stepNumber, amount, label) => {
    if (rewardedStepsRef.current.has(stepNumber)) return 0
    rewardedStepsRef.current.add(stepNumber)
    onboardingXpRef.current += amount
    setOnboardingXp(onboardingXpRef.current)
    setXpToast({ id: Date.now(), amount, label })
    return amount
  }, [])

  const goToStep = useCallback((nextStep, dir = 1) => {
    setDirection(dir)
    setStep(nextStep)
    setError('')
  }, [])

  const handleGenerate = useCallback(async () => {
    if (!user) return
    const stepFourAward = awardStepXp(4, 20, 'Your path is being built!')
    const pendingDemoXp = typeof window !== 'undefined'
      ? Number(window.localStorage.getItem('pathai.demo_xp_pending') || 0)
      : 0
    const startingXp = onboardingXpRef.current + stepFourAward + pendingDemoXp

    setLoading(true)
    setError('')

    const interval = setInterval(() => {
      setGenStep((value) => Math.min(value + 1, GENERATION_STEPS.length - 1))
    }, 1200)

    try {
      const deadline = new Date()
      deadline.setDate(deadline.getDate() + resolvedDays)

      const { data: goalData, error: goalError } = await supabase
        .from('goals')
        .insert({
          user_id: user.id,
          goal_text: goal,
          mode,
          deadline: mode === 'goal' ? deadline.toISOString().split('T')[0] : null,
          weekday_mins: resolvedWeekdayMins,
          weekend_mins: resolvedWeekendMins,
          constraints: knowledge ? [knowledge] : [],
          status: 'active',
          total_days: mode === 'goal' ? resolvedDays : 0,
        })
        .select()
        .single()

      if (goalError) throw goalError

      const { data: { session } } = await supabase.auth.getSession()
      const accessToken = session?.access_token || null

      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          goalId: goalData.id,
          userId: user.id,
          goal,
          mode,
          days: resolvedDays,
          weekdayMins: resolvedWeekdayMins,
          weekendMins: resolvedWeekendMins,
          knowledge,
          accessToken,
          startingXp,
        }),
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || 'Failed to generate plan')
      }

      clearInterval(interval)
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem('pathai.demo_xp_pending')
      }
      router.push('/dashboard')
    } catch (err) {
      clearInterval(interval)
      setError(err.message || 'Failed to generate plan')
      setLoading(false)
      setGenStep(0)
    }
  }, [awardStepXp, goal, knowledge, mode, resolvedDays, resolvedWeekdayMins, resolvedWeekendMins, router, user])

  const stepCardVariants = useMemo(() => ({
    enter: (dir) => reduceMotion ? { opacity: 0 } : { opacity: 0, x: dir > 0 ? 34 : -34 },
    center: { opacity: 1, x: 0 },
    exit: (dir) => reduceMotion ? { opacity: 0 } : { opacity: 0, x: dir > 0 ? -28 : 28 },
  }), [reduceMotion])

  if (!user) return null

  return (
    <>
      <style jsx global>{`
        @keyframes pulseOrb { 0%, 100% { opacity: .20; transform: scale(1); } 50% { opacity: .34; transform: scale(1.06); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        input:focus, textarea:focus { outline: none; }
        ::placeholder { color: #636366; }
        @media (prefers-reduced-motion: reduce) {
          * { scroll-behavior: auto !important; }
        }
      `}</style>

      <div style={{
        minHeight:'100vh',
        display:'flex',
        alignItems:'center',
        justifyContent:'center',
        padding:'24px',
        position:'relative',
        overflow:'hidden',
        fontFamily:"'Plus Jakarta Sans','DM Sans',system-ui,sans-serif",
      }}>
        <div style={{ position:'fixed', inset:0, pointerEvents:'none' }}>
          <div style={{ position:'absolute', top:'-14%', left:'-10%', width:560, height:560, borderRadius:'50%', background:'radial-gradient(circle, rgba(120,60,255,0.28) 0%, transparent 66%)', filter:'blur(88px)', animation:'pulseOrb 9s ease-in-out infinite' }} />
          <div style={{ position:'absolute', top:'50%', right:'-10%', width:480, height:480, borderRadius:'50%', background:'radial-gradient(circle, rgba(40,100,255,0.24) 0%, transparent 68%)', filter:'blur(82px)', animation:'pulseOrb 10s ease-in-out infinite 1.6s' }} />
          <div style={{ position:'absolute', bottom:'-10%', left:'34%', width:500, height:500, borderRadius:'50%', background:'radial-gradient(circle, rgba(14,245,194,0.18) 0%, transparent 65%)', filter:'blur(86px)', animation:'pulseOrb 8s ease-in-out infinite 0.8s' }} />
        </div>

        <AnimatePresence>
          {xpToast && (
            <XPFloater
              key={xpToast.id}
              amount={xpToast.amount}
              label={xpToast.label}
            />
          )}
        </AnimatePresence>

        <div style={{ width:'100%', maxWidth:540, position:'relative', zIndex:1 }}>
          <div style={{ textAlign:'center', marginBottom:28 }}>
            <div style={{ display:'inline-flex', alignItems:'center', gap:10, marginBottom:10 }}>
              <div style={{
                width:44, height:44, borderRadius:'28%',
                background:'linear-gradient(135deg, #0ef5c2, #00d4ff)',
                display:'flex', alignItems:'center', justifyContent:'center',
                boxShadow:'0 0 32px rgba(14,245,194,0.28), inset 0 1px 0 rgba(255,255,255,0.48)',
              }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#06060f" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                </svg>
              </div>
              <span style={{ fontSize:30, fontWeight:900, color:'#f5f5f7', letterSpacing:'-0.9px' }}>PathAI</span>
            </div>
            <p style={{ color:'#8e8e93', fontSize:14.5 }}>
              {loading ? 'Your coach is building a path just for you.' : 'A few quick questions and we will build your learning path.'}
            </p>
          </div>

          {loading ? (
            <div style={{
              background:'linear-gradient(145deg, rgba(255,255,255,0.14), rgba(255,255,255,0.05) 42%, rgba(110,170,255,0.06))',
              border:'1px solid rgba(255,255,255,0.18)',
              borderRadius:30,
              padding:'28px 26px 30px',
              backdropFilter:'blur(40px) saturate(220%)',
              WebkitBackdropFilter:'blur(40px) saturate(220%)',
              boxShadow:'inset 0 1px 0 rgba(255,255,255,0.24), 0 32px 64px rgba(0,0,0,0.40)',
            }}>
              <MascotBubble text={generationBubble} />

              <div style={{ display:'flex', alignItems:'center', gap:12, marginTop:26, marginBottom:30 }}>
                <div style={{ width:48, height:48, border:'3px solid rgba(255,255,255,0.08)', borderTopColor:'#0ef5c2', borderRadius:'50%', animation:'spin 0.65s linear infinite', boxShadow:'0 0 20px rgba(14,245,194,0.10)' }} />
                <div>
                  <div style={{ fontSize:15, fontWeight:800, color:'#f5f5f7' }}>Building your personalized path</div>
                  <div style={{ fontSize:12, color:'#8e8e93', marginTop:4 }}>You are starting with {onboardingXpRef.current} XP already earned.</div>
                </div>
              </div>

              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                {GENERATION_STEPS.map((label, index) => (
                  <div key={label} style={{ display:'flex', alignItems:'center', gap:12, opacity:index <= genStep ? 1 : 0.26, transition:'opacity 0.35s ease' }}>
                    <div style={{
                      width:24, height:24, borderRadius:'50%',
                      background:index < genStep ? 'linear-gradient(135deg,#0ef5c2,#00d4ff)' : 'transparent',
                      border:`2px solid ${index <= genStep ? '#0ef5c2' : 'rgba(255,255,255,0.10)'}`,
                      display:'flex', alignItems:'center', justifyContent:'center',
                      color:'#06060f', fontSize:12, fontWeight:900,
                    }}>
                      {index < genStep ? '✓' : index + 1}
                    </div>
                    <span style={{ color:index <= genStep ? '#f5f5f7' : '#636366', fontSize:13.5, fontWeight:600 }}>{label}</span>
                  </div>
                ))}
              </div>

              {error && (
                <div style={{ marginTop:20, padding:'12px 14px', background:'rgba(255,69,58,0.10)', border:'1px solid rgba(255,69,58,0.20)', borderRadius:16, color:'#ff6961', fontSize:13 }}>
                  {error}
                </div>
              )}
            </div>
          ) : (
            <div style={{
              background:'linear-gradient(145deg, rgba(255,255,255,0.14), rgba(255,255,255,0.05) 42%, rgba(110,170,255,0.06))',
              border:'1px solid rgba(255,255,255,0.18)',
              borderRadius:30,
              padding:'26px 22px 24px',
              backdropFilter:'blur(40px) saturate(220%)',
              WebkitBackdropFilter:'blur(40px) saturate(220%)',
              boxShadow:'inset 0 1px 0 rgba(255,255,255,0.24), 0 32px 64px rgba(0,0,0,0.40)',
            }}>
              <div style={{
                height:8,
                borderRadius:999,
                background:'rgba(255,255,255,0.08)',
                overflow:'hidden',
                marginBottom:16,
              }}>
                <motion.div
                  initial={false}
                  animate={{ width: `${progressPct}%` }}
                  transition={{ duration: reduceMotion ? 0 : 0.35, ease: [0.22, 1, 0.36, 1] }}
                  style={{
                    height:'100%',
                    borderRadius:999,
                    background:'linear-gradient(90deg, #0ef5c2, #00d4ff)',
                    boxShadow:'0 0 14px rgba(14,245,194,0.35)',
                  }}
                />
              </div>

              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:8, marginBottom:22 }}>
                {STEP_TITLES.map((label, index) => {
                  const stepNumber = index + 1
                  const completed = step > stepNumber
                  const active = step === stepNumber
                  return (
                    <div key={label} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:8 }}>
                      <div style={{
                        width:30, height:30, borderRadius:'50%',
                        display:'flex', alignItems:'center', justifyContent:'center',
                        background: completed
                          ? 'linear-gradient(135deg,#0ef5c2,#00d4ff)'
                          : active
                            ? 'rgba(14,245,194,0.14)'
                            : 'rgba(255,255,255,0.06)',
                        border:`1px solid ${completed || active ? 'rgba(14,245,194,0.35)' : 'rgba(255,255,255,0.10)'}`,
                        color: completed ? '#06060f' : active ? '#0ef5c2' : '#636366',
                        fontSize:12,
                        fontWeight:900,
                        boxShadow: active ? '0 0 18px rgba(14,245,194,0.14)' : 'none',
                      }}>
                        {completed ? '✓' : stepNumber}
                      </div>
                      <span style={{ fontSize:11, fontWeight:700, color: active ? '#f5f5f7' : '#8e8e93' }}>{label}</span>
                    </div>
                  )
                })}
              </div>

              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18 }}>
                <div>
                  <div style={{ fontSize:11, fontWeight:800, letterSpacing:'1.2px', textTransform:'uppercase', color:'#8e8e93' }}>
                    Step {step} of 4
                  </div>
                  <div style={{ fontSize:22, fontWeight:900, color:'#f5f5f7', letterSpacing:'-0.6px', marginTop:4 }}>
                    {STEP_TITLES[step - 1]}
                  </div>
                </div>
                <div style={{
                  padding:'8px 12px',
                  borderRadius:14,
                  background:'rgba(14,245,194,0.10)',
                  border:'1px solid rgba(14,245,194,0.18)',
                  color:'#0ef5c2',
                  fontSize:12,
                  fontWeight:800,
                  whiteSpace:'nowrap',
                }}>
                  {onboardingXp} XP banked
                </div>
              </div>

              {error && (
                <div style={{ padding:'12px 14px', background:'rgba(255,69,58,0.10)', border:'1px solid rgba(255,69,58,0.20)', borderRadius:16, color:'#ff6961', fontSize:13, marginBottom:18 }}>
                  {error}
                </div>
              )}

              <div style={{ overflow:'hidden', minHeight:350 }}>
                <AnimatePresence mode="wait" custom={direction}>
                  <motion.div
                    key={step}
                    custom={direction}
                    variants={stepCardVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: reduceMotion ? 0 : 0.28, ease: [0.22, 1, 0.36, 1] }}
                  >
                    {step === 1 && (
                      <div>
                        <div style={{ marginBottom:18 }}>
                          <MascotBubble text="What do you want to learn?" />
                        </div>

                        <input
                          value={goal}
                          onChange={(e) => setGoal(e.target.value)}
                          onFocus={() => setFocused('goal')}
                          onBlur={() => setFocused(null)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && goal.trim()) {
                              awardStepXp(1, 10, 'You picked a goal')
                              goToStep(2, 1)
                            }
                          }}
                          placeholder="e.g. Learn Python, Study machine learning, Master guitar..."
                          autoFocus
                          style={inputStyle('goal')}
                        />

                        <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginTop:14 }}>
                          {GOAL_SUGGESTIONS.map((suggestion) => (
                            <button
                              key={suggestion}
                              onClick={() => setGoal(suggestion)}
                              style={{
                                padding:'7px 13px',
                                background:'rgba(255,255,255,0.06)',
                                border:'1px solid rgba(255,255,255,0.10)',
                                borderRadius:999,
                                color:'#c4c4c8',
                                fontSize:12,
                                fontWeight:600,
                                cursor:'pointer',
                                fontFamily:"'DM Sans', sans-serif",
                              }}
                            >
                              {suggestion}
                            </button>
                          ))}
                        </div>

                        <button
                          onClick={() => {
                            if (!goal.trim()) return
                            awardStepXp(1, 10, 'You picked a goal')
                            goToStep(2, 1)
                          }}
                          disabled={!goal.trim()}
                          style={{
                            width:'100%',
                            marginTop:22,
                            padding:'15px',
                            background:goal.trim() ? 'linear-gradient(135deg,#0ef5c2,#00d4ff)' : 'rgba(255,255,255,0.06)',
                            border:goal.trim() ? 'none' : '1px solid rgba(255,255,255,0.08)',
                            borderRadius:16,
                            color:goal.trim() ? '#06060f' : '#3a3a3c',
                            fontSize:15.5,
                            fontWeight:800,
                            cursor:goal.trim() ? 'pointer' : 'default',
                            fontFamily:"'DM Sans', sans-serif",
                            boxShadow:goal.trim() ? '0 0 36px rgba(14,245,194,0.24), inset 0 1px 0 rgba(255,255,255,0.44)' : 'none',
                          }}
                        >
                          Continue
                        </button>
                      </div>
                    )}

                    {step === 2 && (
                      <div>
                        <div style={{ marginBottom:18 }}>
                          <MascotBubble text="How should I coach you: toward a finish line, or open-ended exploration?" />
                        </div>

                        <div style={{ display:'grid', gap:12 }}>
                          <button
                            onClick={() => {
                              setMode('goal')
                              awardStepXp(2, 10, 'Mode selected')
                              goToStep(3, 1)
                            }}
                            style={{
                              width:'100%',
                              padding:'20px 18px',
                              minHeight:148,
                              background:'rgba(0,0,0,0.20)',
                              border:'1px solid rgba(255,255,255,0.10)',
                              borderRadius:22,
                              cursor:'pointer',
                              textAlign:'left',
                              fontFamily:"'DM Sans', sans-serif",
                              color:'#f5f5f7',
                            }}
                          >
                            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:14, marginBottom:14 }}>
                              <div style={{
                                width:52, height:52, borderRadius:'30%',
                                background:'linear-gradient(135deg, rgba(14,245,194,0.20), rgba(0,212,255,0.18))',
                                border:'1px solid rgba(14,245,194,0.28)',
                                display:'grid', placeItems:'center', fontSize:24,
                              }}>
                                🎯
                              </div>
                              <div style={{ display:'flex', alignItems:'center', gap:8, color:'#8e8e93', fontSize:13 }}>
                                <span>📅</span>
                                <span>Calendar plan</span>
                              </div>
                            </div>
                            <div style={{ fontSize:18, fontWeight:800, marginBottom:6 }}>Goal Mode</div>
                            <div style={{ fontSize:13.5, color:'#8e8e93', lineHeight:1.6 }}>
                              Work toward a deadline with structured daily missions, pacing, and milestone projects.
                            </div>
                          </button>

                          <button
                            onClick={() => {
                              setMode('explore')
                              awardStepXp(2, 10, 'Mode selected')
                              goToStep(3, 1)
                            }}
                            style={{
                              width:'100%',
                              padding:'20px 18px',
                              minHeight:148,
                              background:'rgba(0,0,0,0.20)',
                              border:'1px solid rgba(255,255,255,0.10)',
                              borderRadius:22,
                              cursor:'pointer',
                              textAlign:'left',
                              fontFamily:"'DM Sans', sans-serif",
                              color:'#f5f5f7',
                            }}
                          >
                            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:14, marginBottom:14 }}>
                              <div style={{
                                width:52, height:52, borderRadius:'30%',
                                background:'linear-gradient(135deg, rgba(0,212,255,0.18), rgba(96,165,250,0.18))',
                                border:'1px solid rgba(0,212,255,0.28)',
                                display:'grid', placeItems:'center', fontSize:24,
                              }}>
                                🧭
                              </div>
                              <div style={{ display:'flex', alignItems:'center', gap:8, color:'#8e8e93', fontSize:13 }}>
                                <span>∞</span>
                                <span>No deadline</span>
                              </div>
                            </div>
                            <div style={{ fontSize:18, fontWeight:800, marginBottom:6 }}>Explore Mode</div>
                            <div style={{ fontSize:13.5, color:'#8e8e93', lineHeight:1.6 }}>
                              Learn at your own pace with an infinite path that expands as your curiosity grows.
                            </div>
                          </button>
                        </div>

                        <button
                          onClick={() => goToStep(1, -1)}
                          style={{
                            width:'100%',
                            marginTop:12,
                            padding:'13px 14px',
                            background:'rgba(255,255,255,0.04)',
                            border:'1px solid rgba(255,255,255,0.08)',
                            borderRadius:16,
                            color:'#8e8e93',
                            fontSize:14,
                            fontWeight:700,
                            cursor:'pointer',
                            fontFamily:"'DM Sans', sans-serif",
                          }}
                        >
                          Back
                        </button>
                      </div>
                    )}

                    {step === 3 && (
                      <div>
                        <div style={{ marginBottom:18 }}>
                          <MascotBubble text="How much time should your weekdays and weekends feel like?" />
                        </div>

                        {mode === 'goal' && (
                          <>
                            <label style={{ display:'block', color:'#8e8e93', fontSize:11, fontWeight:800, letterSpacing:'1.2px', textTransform:'uppercase', marginBottom:8 }}>
                              Goal length
                            </label>
                            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginBottom:10 }}>
                              {['14', '30', '60', '90'].map((value) => {
                                const active = days === value && !customDays
                                return (
                                  <button
                                    key={value}
                                    onClick={() => { setDays(value); setCustomDays('') }}
                                    style={{
                                      padding:'12px 8px',
                                      background:active ? 'linear-gradient(135deg, rgba(14,245,194,0.16), rgba(0,212,255,0.12))' : 'rgba(0,0,0,0.24)',
                                      border:`1px solid ${active ? 'rgba(14,245,194,0.30)' : 'rgba(255,255,255,0.10)'}`,
                                      borderRadius:14,
                                      color:active ? '#0ef5c2' : '#8e8e93',
                                      fontSize:13,
                                      fontWeight:800,
                                      cursor:'pointer',
                                      fontFamily:"'DM Sans', sans-serif",
                                    }}
                                  >
                                    {value}d
                                  </button>
                                )
                              })}
                            </div>
                            <input
                              type="number"
                              min="1"
                              max="365"
                              value={customDays}
                              onChange={(e) => { setCustomDays(e.target.value); setDays('') }}
                              onFocus={() => setFocused('customDays')}
                              onBlur={() => setFocused(null)}
                              placeholder="Custom days"
                              style={{ ...inputStyle('customDays'), marginBottom:18, fontSize:14 }}
                            />
                          </>
                        )}

                        <label style={{ display:'block', color:'#8e8e93', fontSize:11, fontWeight:800, letterSpacing:'1.2px', textTransform:'uppercase', marginBottom:8 }}>
                          Weekday minutes
                        </label>
                        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginBottom:10 }}>
                          {['15', '30', '45', '60'].map((value) => {
                            const active = weekdayMins === value && !customWeekdayMins
                            return (
                              <button
                                key={value}
                                onClick={() => { setWeekdayMins(value); setCustomWeekdayMins('') }}
                                style={{
                                  padding:'12px 8px',
                                  background:active ? 'linear-gradient(135deg, rgba(14,245,194,0.16), rgba(0,212,255,0.12))' : 'rgba(0,0,0,0.24)',
                                  border:`1px solid ${active ? 'rgba(14,245,194,0.30)' : 'rgba(255,255,255,0.10)'}`,
                                  borderRadius:14,
                                  color:active ? '#0ef5c2' : '#8e8e93',
                                  fontSize:13,
                                  fontWeight:800,
                                  cursor:'pointer',
                                  fontFamily:"'DM Sans', sans-serif",
                                }}
                              >
                                {value}m
                              </button>
                            )
                          })}
                        </div>
                        <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:8, marginBottom:12 }}>
                          {Object.entries(TIME_STORIES).map(([minutes, story]) => (
                            <div
                              key={minutes}
                              style={{
                                padding:'10px 12px',
                                borderRadius:14,
                                background:Number(minutes) === resolvedWeekdayMins ? 'rgba(14,245,194,0.09)' : 'rgba(255,255,255,0.04)',
                                border:`1px solid ${Number(minutes) === resolvedWeekdayMins ? 'rgba(14,245,194,0.24)' : 'rgba(255,255,255,0.08)'}`,
                                color:Number(minutes) === resolvedWeekdayMins ? '#c8f7eb' : '#8e8e93',
                                fontSize:12,
                                fontWeight:700,
                              }}
                            >
                              {minutes} min = {story}
                            </div>
                          ))}
                        </div>
                        <input
                          type="number"
                          min="5"
                          max="480"
                          value={customWeekdayMins}
                          onChange={(e) => { setCustomWeekdayMins(e.target.value); setWeekdayMins('') }}
                          onFocus={() => setFocused('customWeekday')}
                          onBlur={() => setFocused(null)}
                          placeholder="Custom weekday minutes"
                          style={{ ...inputStyle('customWeekday'), marginBottom:18, fontSize:14 }}
                        />

                        <label style={{ display:'block', color:'#8e8e93', fontSize:11, fontWeight:800, letterSpacing:'1.2px', textTransform:'uppercase', marginBottom:8 }}>
                          Weekend minutes
                        </label>
                        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginBottom:10 }}>
                          {['30', '45', '60', '90'].map((value) => {
                            const active = weekendMins === value && !customWeekendMins
                            return (
                              <button
                                key={value}
                                onClick={() => { setWeekendMins(value); setCustomWeekendMins('') }}
                                style={{
                                  padding:'12px 8px',
                                  background:active ? 'linear-gradient(135deg, rgba(14,245,194,0.16), rgba(0,212,255,0.12))' : 'rgba(0,0,0,0.24)',
                                  border:`1px solid ${active ? 'rgba(14,245,194,0.30)' : 'rgba(255,255,255,0.10)'}`,
                                  borderRadius:14,
                                  color:active ? '#0ef5c2' : '#8e8e93',
                                  fontSize:13,
                                  fontWeight:800,
                                  cursor:'pointer',
                                  fontFamily:"'DM Sans', sans-serif",
                                }}
                              >
                                {value}m
                              </button>
                            )
                          })}
                        </div>
                        <input
                          type="number"
                          min="5"
                          max="480"
                          value={customWeekendMins}
                          onChange={(e) => { setCustomWeekendMins(e.target.value); setWeekendMins('') }}
                          onFocus={() => setFocused('customWeekend')}
                          onBlur={() => setFocused(null)}
                          placeholder="Custom weekend minutes"
                          style={{ ...inputStyle('customWeekend'), fontSize:14 }}
                        />

                        <div style={{ display:'flex', gap:10, marginTop:22 }}>
                          <button
                            onClick={() => goToStep(2, -1)}
                            style={{
                              padding:'13px 18px',
                              background:'rgba(255,255,255,0.04)',
                              border:'1px solid rgba(255,255,255,0.08)',
                              borderRadius:16,
                              color:'#8e8e93',
                              fontSize:14,
                              fontWeight:700,
                              cursor:'pointer',
                              fontFamily:"'DM Sans', sans-serif",
                            }}
                          >
                            Back
                          </button>
                          <button
                            onClick={() => {
                              awardStepXp(3, 10, 'Schedule chosen')
                              goToStep(4, 1)
                            }}
                            style={{
                              flex:1,
                              padding:'14px 16px',
                              background:'linear-gradient(135deg,#0ef5c2,#00d4ff)',
                              border:'none',
                              borderRadius:16,
                              color:'#06060f',
                              fontSize:15.5,
                              fontWeight:800,
                              cursor:'pointer',
                              fontFamily:"'DM Sans', sans-serif",
                              boxShadow:'0 0 36px rgba(14,245,194,0.24), inset 0 1px 0 rgba(255,255,255,0.44)',
                            }}
                          >
                            Continue
                          </button>
                        </div>
                      </div>
                    )}

                    {step === 4 && (
                      <div>
                        <div style={{ marginBottom:18 }}>
                          <MascotBubble text="Tell me what you already know so I can start at the right level." />
                        </div>

                        <div style={{
                          padding:'10px 12px',
                          borderRadius:16,
                          background:'rgba(14,245,194,0.08)',
                          border:'1px solid rgba(14,245,194,0.16)',
                          marginBottom:14,
                          color:'#c8f7eb',
                          fontSize:13,
                          fontWeight:700,
                          lineHeight:1.6,
                        }}>
                          {goal} · {mode === 'explore' ? 'Explore Mode' : `${resolvedDays} day goal`} · {resolvedWeekdayMins}m weekdays · {resolvedWeekendMins}m weekends
                        </div>

                        <textarea
                          value={knowledge}
                          onChange={(e) => setKnowledge(e.target.value)}
                          onFocus={() => setFocused('knowledge')}
                          onBlur={() => setFocused(null)}
                          rows={5}
                          placeholder="e.g. I know HTML and CSS, I have used variables and loops, I have watched a few tutorials..."
                          style={{
                            ...inputStyle('knowledge'),
                            resize:'vertical',
                            lineHeight:1.6,
                          }}
                        />

                        <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginTop:14 }}>
                          {KNOWLEDGE_CHIPS.map((chip) => (
                            <button
                              key={chip}
                              onClick={() => setKnowledge((current) => current ? `${current}${current.endsWith('.') ? '' : '.'} ${chip}` : chip)}
                              style={{
                                padding:'7px 13px',
                                background:'rgba(255,255,255,0.06)',
                                border:'1px solid rgba(255,255,255,0.10)',
                                borderRadius:999,
                                color:'#c4c4c8',
                                fontSize:12,
                                fontWeight:600,
                                cursor:'pointer',
                                fontFamily:"'DM Sans', sans-serif",
                              }}
                            >
                              {chip}
                            </button>
                          ))}
                        </div>

                        <p style={{ color:'#8e8e93', fontSize:12.5, lineHeight:1.55, marginTop:10 }}>
                          This helps PathAI skip what you already know and focus your first missions where they matter.
                        </p>

                        <div style={{ display:'flex', gap:10, marginTop:22 }}>
                          <button
                            onClick={() => goToStep(3, -1)}
                            style={{
                              padding:'13px 18px',
                              background:'rgba(255,255,255,0.04)',
                              border:'1px solid rgba(255,255,255,0.08)',
                              borderRadius:16,
                              color:'#8e8e93',
                              fontSize:14,
                              fontWeight:700,
                              cursor:'pointer',
                              fontFamily:"'DM Sans', sans-serif",
                            }}
                          >
                            Back
                          </button>
                          <button
                            onClick={handleGenerate}
                            style={{
                              flex:1,
                              padding:'14px 16px',
                              background:'linear-gradient(135deg,#0ef5c2,#00d4ff)',
                              border:'none',
                              borderRadius:16,
                              color:'#06060f',
                              fontSize:15.5,
                              fontWeight:800,
                              cursor:'pointer',
                              fontFamily:"'DM Sans', sans-serif",
                              boxShadow:'0 0 36px rgba(14,245,194,0.24), inset 0 1px 0 rgba(255,255,255,0.44)',
                            }}
                          >
                            Generate My Path
                          </button>
                        </div>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
