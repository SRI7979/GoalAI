// Onboarding — iOS Liquid Glass Edition
'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function Onboarding() {
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
  const router = useRouter()

  const genSteps = [
    'Analyzing skill structure',
    'Mapping concept dependencies',
    'Curating resources',
    'Building your path',
    'Finalizing',
  ]

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) router.push('/login')
      else setUser(user)
    })
  }, [router])

  const suggestions = [
    'Learn Python', 'Web Development', 'Machine Learning',
    'UI/UX Design', 'Data Science', 'Learn Guitar',
    'Public Speaking', 'Creative Writing', 'Spanish', 'Learn Piano',
  ]

  const resolvedDays = parseInt(customDays || days, 10) || 30
  const resolvedWeekdayMins = parseInt(customWeekdayMins || weekdayMins, 10) || 30
  const resolvedWeekendMins = parseInt(customWeekendMins || weekendMins, 10) || 60

  const handleGenerate = async () => {
    setLoading(true)
    setError('')
    const interval = setInterval(() => {
      setGenStep((s) => Math.min(s + 1, genSteps.length - 1))
    }, 1800)
    try {
      const deadline = new Date()
      deadline.setDate(deadline.getDate() + resolvedDays)
      const { data: goalData, error: goalError } = await supabase
        .from('goals').insert({
          user_id: user.id,
          goal_text: goal,
          mode,
          deadline: mode === 'goal' ? deadline.toISOString().split('T')[0] : null,
          weekday_mins: resolvedWeekdayMins,
          weekend_mins: resolvedWeekendMins,
          constraints: knowledge ? [knowledge] : [],
          status: 'active',
          total_days: mode === 'goal' ? resolvedDays : 0,
        }).select().single()
      if (goalError) throw goalError
      const { data: { session } } = await supabase.auth.getSession()
      const accessToken = session?.access_token || null
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) },
        body: JSON.stringify({ goalId: goalData.id, userId: user.id, goal, mode, days: resolvedDays, weekdayMins: resolvedWeekdayMins, weekendMins: resolvedWeekendMins, knowledge, accessToken }),
      })
      if (!res.ok) { const errData = await res.json(); throw new Error(errData.error || 'Failed to generate plan') }
      clearInterval(interval)
      router.push('/dashboard')
    } catch (err) {
      clearInterval(interval)
      setError(err.message)
      setLoading(false)
      setGenStep(0)
    }
  }

  if (!user) return null

  // ── Shared styles ──────────────────────────────────────────────────────────
  const inputStyle = (name) => ({
    width: '100%', padding: '14px 18px',
    background: focused === name ? 'rgba(14,245,194,0.06)' : 'rgba(0,0,0,0.25)',
    border: `1px solid ${focused === name ? 'rgba(14,245,194,0.40)' : 'rgba(255,255,255,0.10)'}`,
    borderRadius: 14, color: '#f5f5f7', fontSize: 15,
    fontFamily: "'DM Sans', sans-serif",
    transition: 'all 0.2s',
    boxShadow: focused === name
      ? 'inset 0 1px 0 rgba(14,245,194,0.15), 0 0 0 3px rgba(14,245,194,0.10)'
      : 'inset 0 1px 0 rgba(255,255,255,0.06)',
  })

  return (
    <>
      <style jsx global>{`
        @keyframes fadeIn  { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulseOrb { 0%, 100% { opacity: .20; transform: scale(1); } 50% { opacity: .36; transform: scale(1.06); } }
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.94); } to { opacity: 1; transform: scale(1); } }
        input:focus, textarea:focus { outline: none; }
        ::placeholder { color: #636366; }
      `}</style>

      <div style={{
        minHeight: '100vh',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: "'DM Sans', -apple-system, 'SF Pro Display', system-ui, sans-serif",
        position: 'relative', overflow: 'hidden', padding: '24px',
        WebkitFontSmoothing: 'antialiased',
      }}>
        {/* Aurora */}
        <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none' }}>
          <div style={{ position: 'absolute', top: '-12%', left: '-8%', width: 550, height: 550, borderRadius: '50%', background: 'radial-gradient(circle, rgba(120,60,255,0.28) 0%, transparent 65%)', filter: 'blur(85px)', animation: 'pulseOrb 8s ease-in-out infinite' }} />
          <div style={{ position: 'absolute', top: '55%', right: '-8%', width: 460, height: 460, borderRadius: '50%', background: 'radial-gradient(circle, rgba(40,100,255,0.22) 0%, transparent 65%)', filter: 'blur(80px)', animation: 'pulseOrb 10s ease-in-out infinite 2s' }} />
          <div style={{ position: 'absolute', bottom: '-8%', left: '35%', width: 480, height: 480, borderRadius: '50%', background: 'radial-gradient(circle, rgba(14,245,194,0.15) 0%, transparent 65%)', filter: 'blur(80px)', animation: 'pulseOrb 9s ease-in-out infinite 1s' }} />
        </div>

        <div style={{ width: '100%', maxWidth: 520, position: 'relative', zIndex: 1 }}>
          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: 32, animation: 'fadeIn 0.5s cubic-bezier(0.16,1,0.3,1)' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div style={{ width: 44, height: 44, borderRadius: '26%', background: 'linear-gradient(135deg, #0ef5c2, #00d4ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 32px rgba(14,245,194,0.28), inset 0 1px 0 rgba(255,255,255,0.50)' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#06060f" strokeWidth="2.5" strokeLinecap="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
              </div>
              <span style={{ fontSize: 28, fontWeight: 800, color: '#f5f5f7', letterSpacing: '-0.8px' }}>PathAI</span>
            </div>
            <p style={{ color: '#8e8e93', fontSize: 14.5, fontWeight: 400 }}>
              {loading ? 'Building your personalized learning path...' : "Let's build your path to mastery."}
            </p>
          </div>

          {/* ── Loading state ── */}
          {loading ? (
            <div style={{ textAlign: 'center', animation: 'fadeIn 0.4s cubic-bezier(0.16,1,0.3,1)' }}>
              <div style={{ width: 48, height: 48, border: '3px solid rgba(255,255,255,0.06)', borderTopColor: '#0ef5c2', borderRadius: '50%', animation: 'spin 0.65s linear infinite', margin: '0 auto 36px', boxShadow: '0 0 24px rgba(14,245,194,0.12)' }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 300, margin: '0 auto' }}>
                {genSteps.map((s, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, opacity: i <= genStep ? 1 : 0.2, transition: 'opacity 0.5s ease' }}>
                    <div style={{
                      width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                      background: i < genStep ? 'linear-gradient(135deg, #0ef5c2, #00d4ff)' : 'transparent',
                      border: `2px solid ${i <= genStep ? '#0ef5c2' : 'rgba(255,255,255,0.08)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: i < genStep ? '0 0 14px rgba(14,245,194,0.30)' : 'none',
                    }}>
                      {i < genStep && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#06060f" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>}
                    </div>
                    <span style={{ color: i <= genStep ? '#f5f5f7' : '#636366', fontSize: 13.5, fontWeight: 500 }}>{s}</span>
                  </div>
                ))}
              </div>
              {error && (
                <div style={{ marginTop: 24, padding: '12px 16px', background: 'rgba(255,69,58,0.10)', border: '1px solid rgba(255,69,58,0.22)', borderRadius: 14, color: '#ff6961', fontSize: 13, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}>
                  {error}
                  <button onClick={() => { setLoading(false); setGenStep(0); setError('') }} style={{ display: 'block', marginTop: 8, background: 'none', border: 'none', color: '#0ef5c2', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>Try again</button>
                </div>
              )}
            </div>
          ) : (
            // ── Glass card ──────────────────────────────────────────────────
            <div style={{
              background: 'linear-gradient(145deg, rgba(255,255,255,0.13) 0%, rgba(255,255,255,0.04) 30%, rgba(110,170,255,0.07) 65%, rgba(255,255,255,0.08) 100%)',
              border: '1px solid rgba(255,255,255,0.18)',
              borderRadius: 28,
              padding: '32px 28px',
              backdropFilter: 'blur(40px) saturate(220%)',
              WebkitBackdropFilter: 'blur(40px) saturate(220%)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.24), inset 0 -1px 0 rgba(0,0,0,0.06), 0 32px 64px rgba(0,0,0,0.40)',
              animation: 'fadeIn 0.5s cubic-bezier(0.16,1,0.3,1)',
            }}>

              {/* Step indicator */}
              <div style={{ display: 'flex', gap: 5, marginBottom: 28 }}>
                {[1, 2, 3, 4].map((s) => (
                  <div key={s} style={{
                    flex: 1, height: 3, borderRadius: 2,
                    background: s <= step
                      ? 'linear-gradient(90deg, #0ef5c2, #00d4ff)'
                      : 'rgba(255,255,255,0.07)',
                    transition: 'background 0.35s ease',
                    boxShadow: s <= step ? '0 0 6px rgba(14,245,194,0.35)' : 'none',
                  }} />
                ))}
              </div>

              {error && <div style={{ padding: '12px 16px', background: 'rgba(255,69,58,0.10)', border: '1px solid rgba(255,69,58,0.22)', borderRadius: 14, marginBottom: 20, color: '#ff6961', fontSize: 13 }}>{error}</div>}

              {/* ── Step 1: Goal ── */}
              {step === 1 && (
                <div style={{ animation: 'fadeIn 0.3s cubic-bezier(0.16,1,0.3,1)' }}>
                  <label style={{ display: 'block', color: '#636366', fontSize: 11, fontWeight: 700, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '1.5px' }}>What do you want to learn?</label>
                  <input
                    value={goal}
                    onChange={(e) => setGoal(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && goal.trim() && setStep(2)}
                    onFocus={() => setFocused('goal')}
                    onBlur={() => setFocused(null)}
                    placeholder="e.g. Learn Python, Master React, Study ML..."
                    autoFocus
                    style={inputStyle('goal')}
                  />
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 14 }}>
                    {suggestions.map((s) => (
                      <button key={s} onClick={() => { setGoal(s); setStep(2) }}
                        style={{
                          padding: '6px 14px',
                          background: 'rgba(255,255,255,0.06)',
                          border: '1px solid rgba(255,255,255,0.10)',
                          borderRadius: 9999, color: '#636366', fontSize: 12, fontWeight: 500,
                          cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                          transition: 'all 0.18s',
                          backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
                        }}
                        onMouseEnter={(e) => { e.target.style.borderColor = 'rgba(14,245,194,0.35)'; e.target.style.color = '#0ef5c2'; e.target.style.background = 'rgba(14,245,194,0.07)' }}
                        onMouseLeave={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.10)'; e.target.style.color = '#636366'; e.target.style.background = 'rgba(255,255,255,0.06)' }}
                      >{s}</button>
                    ))}
                  </div>
                  <button onClick={() => goal.trim() && setStep(2)} disabled={!goal.trim()}
                    style={{ width: '100%', marginTop: 22, padding: '15px', background: goal.trim() ? 'linear-gradient(135deg, #0ef5c2, #00d4ff)' : 'rgba(255,255,255,0.05)', border: goal.trim() ? 'none' : '1px solid rgba(255,255,255,0.08)', borderRadius: 14, color: goal.trim() ? '#06060f' : '#3a3a3c', fontSize: 15.5, fontWeight: 700, cursor: goal.trim() ? 'pointer' : 'default', fontFamily: "'DM Sans', sans-serif", boxShadow: goal.trim() ? '0 0 36px rgba(14,245,194,0.28), inset 0 1px 0 rgba(255,255,255,0.48)' : 'none', transition: 'all 0.22s cubic-bezier(0.16,1,0.3,1)' }}>
                    Continue
                  </button>
                </div>
              )}

              {/* ── Step 2: Mode ── */}
              {step === 2 && (
                <div style={{ animation: 'fadeIn 0.3s cubic-bezier(0.16,1,0.3,1)' }}>
                  <div style={{ padding: '10px 14px', background: 'rgba(14,245,194,0.06)', border: '1px solid rgba(14,245,194,0.18)', borderRadius: 12, marginBottom: 22, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: '#0ef5c2', fontSize: 13, fontWeight: 600 }}>{goal}</span>
                    <button onClick={() => setStep(1)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#636366', cursor: 'pointer', fontSize: 12, fontFamily: "'DM Sans', sans-serif" }}>edit</button>
                  </div>
                  <p style={{ color: '#636366', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 16 }}>How do you want to learn?</p>

                  {/* Goal mode */}
                  <button onClick={() => { setMode('goal'); setStep(3) }}
                    style={{ width: '100%', padding: '20px', marginBottom: 10, background: 'rgba(0,0,0,0.20)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 18, cursor: 'pointer', textAlign: 'left', fontFamily: "'DM Sans', sans-serif", transition: 'all 0.22s cubic-bezier(0.16,1,0.3,1)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(14,245,194,0.35)'; e.currentTarget.style.background = 'rgba(14,245,194,0.06)'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 16px 36px rgba(0,0,0,0.28), 0 0 24px rgba(14,245,194,0.06)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)'; e.currentTarget.style.background = 'rgba(0,0,0,0.20)'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                      <div style={{ width: 38, height: 38, borderRadius: '26%', background: 'linear-gradient(135deg, #0ef5c2, #00d4ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 0 18px rgba(14,245,194,0.22), inset 0 1px 0 rgba(255,255,255,0.45)' }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#06060f" strokeWidth="2.5" strokeLinecap="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                      </div>
                      <div>
                        <div style={{ color: '#f5f5f7', fontWeight: 700, fontSize: 15.5 }}>Goal Mode</div>
                        <div style={{ color: '#636366', fontSize: 12.5 }}>Set a deadline, stay on track</div>
                      </div>
                      <svg style={{ marginLeft: 'auto' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#636366" strokeWidth="2" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                    </div>
                    <p style={{ color: '#8e8e93', fontSize: 13, lineHeight: 1.55, paddingLeft: 50 }}>Structured daily tasks, adaptive rescheduling, and a capstone project to verify your skills.</p>
                  </button>

                  {/* Explore mode */}
                  <button onClick={() => { setMode('explore'); setStep(3) }}
                    style={{ width: '100%', padding: '20px', background: 'rgba(0,0,0,0.20)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 18, cursor: 'pointer', textAlign: 'left', fontFamily: "'DM Sans', sans-serif", transition: 'all 0.22s cubic-bezier(0.16,1,0.3,1)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(0,212,255,0.35)'; e.currentTarget.style.background = 'rgba(0,212,255,0.06)'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 16px 36px rgba(0,0,0,0.28)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)'; e.currentTarget.style.background = 'rgba(0,0,0,0.20)'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                      <div style={{ width: 38, height: 38, borderRadius: '26%', background: 'linear-gradient(135deg, #00d4ff, #0087e8)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 0 18px rgba(0,212,255,0.22), inset 0 1px 0 rgba(255,255,255,0.45)' }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#06060f" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20"/></svg>
                      </div>
                      <div>
                        <div style={{ color: '#f5f5f7', fontWeight: 700, fontSize: 15.5 }}>Explore Mode</div>
                        <div style={{ color: '#636366', fontSize: 12.5 }}>Learn at your own pace, no deadline</div>
                      </div>
                      <svg style={{ marginLeft: 'auto' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#636366" strokeWidth="2" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                    </div>
                    <p style={{ color: '#8e8e93', fontSize: 13, lineHeight: 1.55, paddingLeft: 50 }}>Infinite concept path that grows as you complete each session. Curiosity-driven, no pressure.</p>
                  </button>

                  <button onClick={() => setStep(1)} style={{ width: '100%', marginTop: 12, padding: '13px', background: 'transparent', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, color: '#636366', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", transition: 'all 0.18s' }}>Back</button>
                </div>
              )}

              {/* ── Step 3: Time settings ── */}
              {step === 3 && (
                <div style={{ animation: 'fadeIn 0.3s cubic-bezier(0.16,1,0.3,1)' }}>
                  <div style={{ padding: '10px 14px', background: 'rgba(14,245,194,0.06)', border: '1px solid rgba(14,245,194,0.16)', borderRadius: 12, marginBottom: 22, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ color: '#0ef5c2', fontSize: 13, fontWeight: 600 }}>{goal}</span>
                    <span style={{ color: '#636366', fontSize: 12 }}>·</span>
                    <span style={{ fontSize: 12, color: mode === 'explore' ? '#00d4ff' : '#0ef5c2', fontWeight: 600 }}>{mode === 'explore' ? 'Explore' : 'Goal'}</span>
                    <button onClick={() => setStep(2)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#636366', cursor: 'pointer', fontSize: 12, fontFamily: "'DM Sans', sans-serif" }}>edit</button>
                  </div>

                  {mode === 'goal' && (
                    <>
                      <label style={{ display: 'block', color: '#636366', fontSize: 11, fontWeight: 700, marginBottom: 9, textTransform: 'uppercase', letterSpacing: '1.5px' }}>Deadline (days)</label>
                      <div style={{ display: 'flex', gap: 7, marginBottom: 8 }}>
                        {['14', '30', '60', '90'].map((d) => (
                          <button key={d} onClick={() => { setDays(d); setCustomDays('') }}
                            style={{ flex: 1, padding: '12px 6px', background: days === d && !customDays ? 'linear-gradient(135deg, rgba(14,245,194,0.15), rgba(0,212,255,0.10))' : 'rgba(0,0,0,0.25)', border: `1px solid ${days === d && !customDays ? 'rgba(14,245,194,0.35)' : 'rgba(255,255,255,0.10)'}`, borderRadius: 12, color: days === d && !customDays ? '#0ef5c2' : '#636366', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", transition: 'all 0.18s', boxShadow: days === d && !customDays ? '0 0 12px rgba(14,245,194,0.15)' : 'none' }}>
                            {d}d
                          </button>
                        ))}
                      </div>
                      <input type="number" min="1" max="365" value={customDays} onChange={(e) => { setCustomDays(e.target.value); setDays('') }} onFocus={() => setFocused('customDays')} onBlur={() => setFocused(null)} placeholder="Custom (e.g. 45)" style={{ ...inputStyle('customDays'), marginBottom: 20, fontSize: 14 }} />
                    </>
                  )}

                  <label style={{ display: 'block', color: '#636366', fontSize: 11, fontWeight: 700, marginBottom: 9, textTransform: 'uppercase', letterSpacing: '1.5px' }}>Weekday minutes</label>
                  <div style={{ display: 'flex', gap: 7, marginBottom: 8 }}>
                    {['15', '30', '45', '60'].map((m) => (
                      <button key={m} onClick={() => { setWeekdayMins(m); setCustomWeekdayMins('') }}
                        style={{ flex: 1, padding: '12px 6px', background: weekdayMins === m && !customWeekdayMins ? 'linear-gradient(135deg, rgba(14,245,194,0.15), rgba(0,212,255,0.10))' : 'rgba(0,0,0,0.25)', border: `1px solid ${weekdayMins === m && !customWeekdayMins ? 'rgba(14,245,194,0.35)' : 'rgba(255,255,255,0.10)'}`, borderRadius: 12, color: weekdayMins === m && !customWeekdayMins ? '#0ef5c2' : '#636366', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", transition: 'all 0.18s', boxShadow: weekdayMins === m && !customWeekdayMins ? '0 0 12px rgba(14,245,194,0.15)' : 'none' }}>
                        {m}m
                      </button>
                    ))}
                  </div>
                  <input type="number" min="5" max="480" value={customWeekdayMins} onChange={(e) => { setCustomWeekdayMins(e.target.value); setWeekdayMins('') }} onFocus={() => setFocused('customWeekday')} onBlur={() => setFocused(null)} placeholder="Custom (e.g. 25)" style={{ ...inputStyle('customWeekday'), marginBottom: 20, fontSize: 14 }} />

                  <label style={{ display: 'block', color: '#636366', fontSize: 11, fontWeight: 700, marginBottom: 9, textTransform: 'uppercase', letterSpacing: '1.5px' }}>Weekend minutes</label>
                  <div style={{ display: 'flex', gap: 7, marginBottom: 8 }}>
                    {['30', '45', '60', '90'].map((m) => (
                      <button key={m} onClick={() => { setWeekendMins(m); setCustomWeekendMins('') }}
                        style={{ flex: 1, padding: '12px 6px', background: weekendMins === m && !customWeekendMins ? 'linear-gradient(135deg, rgba(14,245,194,0.15), rgba(0,212,255,0.10))' : 'rgba(0,0,0,0.25)', border: `1px solid ${weekendMins === m && !customWeekendMins ? 'rgba(14,245,194,0.35)' : 'rgba(255,255,255,0.10)'}`, borderRadius: 12, color: weekendMins === m && !customWeekendMins ? '#0ef5c2' : '#636366', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", transition: 'all 0.18s', boxShadow: weekendMins === m && !customWeekendMins ? '0 0 12px rgba(14,245,194,0.15)' : 'none' }}>
                        {m}m
                      </button>
                    ))}
                  </div>
                  <input type="number" min="5" max="480" value={customWeekendMins} onChange={(e) => { setCustomWeekendMins(e.target.value); setWeekendMins('') }} onFocus={() => setFocused('customWeekend')} onBlur={() => setFocused(null)} placeholder="Custom (e.g. 75)" style={{ ...inputStyle('customWeekend'), marginBottom: 24, fontSize: 14 }} />

                  <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={() => setStep(2)} style={{ padding: '13px 18px', background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 14, color: '#636366', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", transition: 'all 0.18s' }}>Back</button>
                    <button onClick={() => setStep(4)} style={{ flex: 1, padding: '14px', background: 'linear-gradient(135deg, #0ef5c2, #00d4ff)', border: 'none', borderRadius: 14, color: '#06060f', fontSize: 15.5, fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", boxShadow: '0 0 36px rgba(14,245,194,0.28), inset 0 1px 0 rgba(255,255,255,0.48)', transition: 'all 0.22s' }}>Continue</button>
                  </div>
                </div>
              )}

              {/* ── Step 4: Knowledge + generate ── */}
              {step === 4 && (
                <div style={{ animation: 'fadeIn 0.3s cubic-bezier(0.16,1,0.3,1)' }}>
                  <div style={{ padding: '10px 14px', background: 'rgba(14,245,194,0.06)', border: '1px solid rgba(14,245,194,0.16)', borderRadius: 12, marginBottom: 22, fontSize: 13, color: '#0ef5c2', fontWeight: 600 }}>
                    {goal} · {mode === 'explore' ? 'Explore' : `${resolvedDays}d`} · {resolvedWeekdayMins}m weekday · {resolvedWeekendMins}m weekend
                  </div>

                  <label style={{ display: 'block', color: '#636366', fontSize: 11, fontWeight: 700, marginBottom: 9, textTransform: 'uppercase', letterSpacing: '1.5px' }}>What do you already know? <span style={{ color: '#3a3a3c', fontWeight: 500, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
                  <textarea
                    value={knowledge}
                    onChange={(e) => setKnowledge(e.target.value)}
                    placeholder="e.g. I know basic HTML/CSS, some JavaScript, understand variables and loops..."
                    rows={4}
                    onFocus={() => setFocused('knowledge')}
                    onBlur={() => setFocused(null)}
                    style={{
                      width: '100%', padding: '14px 18px',
                      background: focused === 'knowledge' ? 'rgba(14,245,194,0.06)' : 'rgba(0,0,0,0.25)',
                      border: `1px solid ${focused === 'knowledge' ? 'rgba(14,245,194,0.40)' : 'rgba(255,255,255,0.10)'}`,
                      borderRadius: 14, color: '#f5f5f7', fontSize: 14.5,
                      fontFamily: "'DM Sans', sans-serif",
                      resize: 'vertical', lineHeight: 1.6,
                      transition: 'all 0.2s',
                      boxShadow: focused === 'knowledge'
                        ? 'inset 0 1px 0 rgba(14,245,194,0.15), 0 0 0 3px rgba(14,245,194,0.10)'
                        : 'inset 0 1px 0 rgba(255,255,255,0.06)',
                    }}
                  />
                  <p style={{ color: '#636366', fontSize: 12, marginTop: 8, lineHeight: 1.5 }}>
                    PathAI will skip concepts you already know and start from the right level.
                  </p>

                  <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
                    <button onClick={() => setStep(3)} style={{ padding: '13px 18px', background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 14, color: '#636366', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>Back</button>
                    <button onClick={handleGenerate}
                      style={{ flex: 1, padding: '14px', background: 'linear-gradient(135deg, #0ef5c2, #00d4ff)', border: 'none', borderRadius: 14, color: '#06060f', fontSize: 15.5, fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", boxShadow: '0 0 36px rgba(14,245,194,0.28), inset 0 1px 0 rgba(255,255,255,0.48)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all 0.22s' }}>
                      {mode === 'explore' ? 'Start Exploring' : 'Generate My Path'}
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#06060f" strokeWidth="2.5" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
