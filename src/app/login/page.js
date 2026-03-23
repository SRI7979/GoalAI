// Login page — iOS Liquid Glass Edition
'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState('login')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [focused, setFocused] = useState(null)
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const requestedMode = searchParams.get('mode')
    if (requestedMode === 'signup' || requestedMode === 'login') {
      setMode(requestedMode)
      setError('')
    }
  }, [searchParams])

  const handleAuth = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/onboarding` },
        })
        if (error) throw error
        alert('Check your email for verification link!')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        const { data: authData } = await supabase.auth.getUser()
        const user = authData?.user
        if (!user) { router.push('/onboarding'); return }
        const { data: existingGoals, error: goalsError } = await supabase
          .from('goals').select('id').eq('user_id', user.id).limit(1)
        if (goalsError) throw goalsError
        router.push(existingGoals?.length > 0 ? '/dashboard' : '/onboarding')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <style jsx global>{`
        @keyframes fadeIn  { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulseOrb { 0%, 100% { opacity: .20; transform: scale(1); } 50% { opacity: .36; transform: scale(1.06); } }
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes shake   { 0%, 100% { transform: translateX(0); } 20%,60% { transform: translateX(-5px); } 40%,80% { transform: translateX(5px); } }
        input:focus { outline: none; }
        ::placeholder { color: #636366; }
      `}</style>

      <div style={{
        minHeight: '100vh',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: "'DM Sans', -apple-system, 'SF Pro Display', system-ui, sans-serif",
        position: 'relative',
        overflow: 'hidden',
        padding: '24px',
        WebkitFontSmoothing: 'antialiased',
      }}>
        {/* Aurora orbs */}
        <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none' }}>
          <div style={{ position: 'absolute', top: '-12%', left: '-8%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(120,60,255,0.30) 0%, transparent 65%)', filter: 'blur(80px)', animation: 'pulseOrb 8s ease-in-out infinite' }} />
          <div style={{ position: 'absolute', top: '55%', right: '-8%', width: 420, height: 420, borderRadius: '50%', background: 'radial-gradient(circle, rgba(40,100,255,0.22) 0%, transparent 65%)', filter: 'blur(75px)', animation: 'pulseOrb 10s ease-in-out infinite 2.5s' }} />
          <div style={{ position: 'absolute', bottom: '-10%', left: '40%', width: 450, height: 450, borderRadius: '50%', background: 'radial-gradient(circle, rgba(14,245,194,0.16) 0%, transparent 65%)', filter: 'blur(80px)', animation: 'pulseOrb 9s ease-in-out infinite 1s' }} />
        </div>

        {/* Back button */}
        <Link href="/" style={{
          position: 'absolute', top: 24, left: 24, zIndex: 10,
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 18px',
          background: 'linear-gradient(145deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.04) 100%)',
          border: '1px solid rgba(255,255,255,0.16)',
          borderRadius: 14,
          color: '#8e8e93',
          fontSize: 14, fontWeight: 600,
          textDecoration: 'none',
          backdropFilter: 'blur(24px) saturate(200%)',
          WebkitBackdropFilter: 'blur(24px) saturate(200%)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.20), 0 4px 14px rgba(0,0,0,0.24)',
          transition: 'all 0.22s cubic-bezier(0.16,1,0.3,1)',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.color = '#f5f5f7'; e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = 'inset 0 1px 0 rgba(255,255,255,0.28), 0 8px 24px rgba(0,0,0,0.32)' }}
        onMouseLeave={(e) => { e.currentTarget.style.color = '#8e8e93'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'inset 0 1px 0 rgba(255,255,255,0.20), 0 4px 14px rgba(0,0,0,0.24)' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
          Back
        </Link>

        {/* Card */}
        <div style={{
          width: '100%', maxWidth: 440,
          position: 'relative', zIndex: 1,
          animation: 'fadeIn 0.6s cubic-bezier(0.16,1,0.3,1)',
        }}>
          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{
                width: 50, height: 50,
                borderRadius: '26%',
                background: 'linear-gradient(135deg, #0ef5c2, #00d4ff)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 36px rgba(14,245,194,0.28), inset 0 1px 0 rgba(255,255,255,0.50)',
              }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#06060f" strokeWidth="2.5" strokeLinecap="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
              </div>
              <span style={{ fontSize: 32, fontWeight: 800, color: '#f5f5f7', letterSpacing: '-1px' }}>PathAI</span>
            </div>
            <p style={{ color: '#8e8e93', fontSize: 15.5, lineHeight: 1.6, fontWeight: 400 }}>
              {mode === 'login' ? 'Welcome back. Your path awaits.' : 'Start your journey to mastery.'}
            </p>
          </div>

          {/* Glass card */}
          <div style={{
            background: 'linear-gradient(145deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.05) 30%, rgba(110,170,255,0.07) 65%, rgba(255,255,255,0.09) 100%)',
            border: '1px solid rgba(255,255,255,0.18)',
            borderRadius: 28,
            padding: '32px 28px',
            backdropFilter: 'blur(40px) saturate(220%)',
            WebkitBackdropFilter: 'blur(40px) saturate(220%)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.26), inset 0 -1px 0 rgba(0,0,0,0.06), 0 32px 64px rgba(0,0,0,0.40), 0 6px 16px rgba(0,0,0,0.24)',
          }}>

            {/* Toggle — iOS segmented control style */}
            <div style={{
              display: 'flex', gap: 3,
              background: 'rgba(0,0,0,0.25)',
              padding: 3, borderRadius: 16,
              border: '1px solid rgba(255,255,255,0.08)',
              marginBottom: 28,
            }}>
              {['login', 'signup'].map(m => (
                <button
                  key={m}
                  onClick={() => { setMode(m); setError('') }}
                  style={{
                    flex: 1, padding: '12px',
                    background: mode === m
                      ? 'linear-gradient(135deg, #0ef5c2 0%, #00d4ff 100%)'
                      : 'transparent',
                    border: 'none',
                    borderRadius: 13,
                    color: mode === m ? '#06060f' : '#636366',
                    fontSize: 14.5, fontWeight: 700,
                    cursor: 'pointer',
                    fontFamily: "'DM Sans', sans-serif",
                    transition: 'all 0.2s cubic-bezier(0.16,1,0.3,1)',
                    boxShadow: mode === m
                      ? '0 0 20px rgba(14,245,194,0.20), inset 0 1px 0 rgba(255,255,255,0.45)'
                      : 'none',
                  }}
                >
                  {m === 'login' ? 'Log In' : 'Sign Up'}
                </button>
              ))}
            </div>

            {/* Error */}
            {error && (
              <div style={{
                padding: '12px 16px',
                background: 'rgba(255,69,58,0.10)',
                border: '1px solid rgba(255,69,58,0.25)',
                borderRadius: 14,
                marginBottom: 22,
                display: 'flex', alignItems: 'center', gap: 10,
                animation: 'shake 0.4s ease-out, fadeIn 0.3s ease-out',
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ff453a" strokeWidth="2.2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                <span style={{ color: '#ff6961', fontSize: 13, fontWeight: 500 }}>{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleAuth}>
              {/* Email */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 7, color: '#636366', fontSize: 11, fontWeight: 700, marginBottom: 9, textTransform: 'uppercase', letterSpacing: '1.5px' }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><defs><linearGradient id="lg1" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#0ef5c2"/><stop offset="100%" stopColor="#00d4ff"/></linearGradient></defs><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="url(#lg1)"/><polyline points="22,6 12,13 2,6" stroke="url(#lg1)"/></svg>
                  Email
                </label>
                <input
                  type="email" value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setFocused('email')}
                  onBlur={() => setFocused(null)}
                  placeholder="you@example.com"
                  required
                  style={{
                    width: '100%', padding: '15px 18px',
                    background: focused === 'email'
                      ? 'rgba(14,245,194,0.06)'
                      : 'rgba(0,0,0,0.25)',
                    border: `1px solid ${focused === 'email' ? 'rgba(14,245,194,0.40)' : 'rgba(255,255,255,0.10)'}`,
                    borderRadius: 14, color: '#f5f5f7', fontSize: 15.5,
                    fontFamily: "'DM Sans', sans-serif",
                    transition: 'all 0.2s',
                    boxShadow: focused === 'email'
                      ? 'inset 0 1px 0 rgba(14,245,194,0.15), 0 0 0 3px rgba(14,245,194,0.10)'
                      : 'inset 0 1px 0 rgba(255,255,255,0.06)',
                  }}
                />
              </div>

              {/* Password */}
              <div style={{ marginBottom: 28 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 7, color: '#636366', fontSize: 11, fontWeight: 700, marginBottom: 9, textTransform: 'uppercase', letterSpacing: '1.5px' }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><defs><linearGradient id="lg2" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#0ef5c2"/><stop offset="100%" stopColor="#00d4ff"/></linearGradient></defs><rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke="url(#lg2)"/><path d="M7 11V7a5 5 0 0110 0v4" stroke="url(#lg2)"/></svg>
                  Password
                </label>
                <input
                  type="password" value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocused('password')}
                  onBlur={() => setFocused(null)}
                  placeholder="••••••••"
                  required
                  style={{
                    width: '100%', padding: '15px 18px',
                    background: focused === 'password'
                      ? 'rgba(14,245,194,0.06)'
                      : 'rgba(0,0,0,0.25)',
                    border: `1px solid ${focused === 'password' ? 'rgba(14,245,194,0.40)' : 'rgba(255,255,255,0.10)'}`,
                    borderRadius: 14, color: '#f5f5f7', fontSize: 15.5,
                    fontFamily: "'DM Sans', sans-serif",
                    transition: 'all 0.2s',
                    boxShadow: focused === 'password'
                      ? 'inset 0 1px 0 rgba(14,245,194,0.15), 0 0 0 3px rgba(14,245,194,0.10)'
                      : 'inset 0 1px 0 rgba(255,255,255,0.06)',
                  }}
                />
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%', padding: '16px',
                  background: loading
                    ? 'rgba(255,255,255,0.06)'
                    : 'linear-gradient(135deg, #0ef5c2 0%, #00d4ff 100%)',
                  border: loading ? '1px solid rgba(255,255,255,0.08)' : 'none',
                  borderRadius: 14,
                  color: loading ? '#636366' : '#06060f',
                  fontSize: 16, fontWeight: 700,
                  cursor: loading ? 'default' : 'pointer',
                  fontFamily: "'DM Sans', sans-serif",
                  transition: 'all 0.22s cubic-bezier(0.16,1,0.3,1)',
                  boxShadow: loading
                    ? 'none'
                    : '0 0 36px rgba(14,245,194,0.28), inset 0 1px 0 rgba(255,255,255,0.48)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                  letterSpacing: '-0.2px',
                }}
              >
                {loading ? (
                  <>
                    <div style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.08)', borderTopColor: '#0ef5c2', borderRadius: '50%', animation: 'spin 0.65s linear infinite' }} />
                    <span>Authenticating...</span>
                  </>
                ) : (
                  <>
                    <span>{mode === 'login' ? 'Log In' : 'Create Account'}</span>
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#06060f" strokeWidth="2.5" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                  </>
                )}
              </button>
            </form>

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, margin: '22px 0' }}>
              <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} />
              <span style={{ color: '#3a3a3c', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>or</span>
              <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} />
            </div>

            {/* Switch mode */}
            <p style={{ textAlign: 'center', color: '#636366', fontSize: 14 }}>
              {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
              <button
                onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError('') }}
                style={{
                  background: 'none', border: 'none',
                  color: '#0ef5c2', fontWeight: 700, fontSize: 14,
                  cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                  transition: 'color 0.15s',
                }}
                onMouseEnter={(e) => { e.target.style.color = '#00d4ff' }}
                onMouseLeave={(e) => { e.target.style.color = '#0ef5c2' }}
              >
                {mode === 'login' ? 'Sign Up' : 'Log In'}
              </button>
            </p>
          </div>

          <p style={{ textAlign: 'center', color: '#3a3a3c', fontSize: 12, marginTop: 20, lineHeight: 1.6 }}>
            By continuing, you agree to PathAI{"'"}s Terms of Service
          </p>
        </div>
      </div>
    </>
  )
}
