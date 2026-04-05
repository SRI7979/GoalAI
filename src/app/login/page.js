'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import IconGlyph from '@/components/IconGlyph'
import AtmosphericBackdrop from '@/components/premium/AtmosphericBackdrop'
import PremiumFrame from '@/components/premium/PremiumFrame'
import { persistLocalAccessSession, persistSupabaseSession } from '@/lib/supabase'
import { createSupabaseAuthClient } from '@/lib/supabaseAuth'

const PLAN_META = {
  core: {
    label: 'Core selected',
    copy: 'You came from the serious-learner tier. Account creation happens now, and billing can attach later without changing your route.',
  },
  pro: {
    label: 'Pro selected',
    copy: 'You came from the proof-first tier. We will carry that plan intent forward after account creation.',
  },
}

function shouldUseLocalAccessFallback(message) {
  return /unreachable|NEXT_PUBLIC_SUPABASE_URL|Unable to reach Supabase|fetch failed/i.test(String(message || ''))
}

const AUTH_FEATURES = [
  {
    icon: 'goal',
    title: 'Daily missions instead of endless tabs',
    copy: 'Your route becomes a real operating system: concept, practice, recall, reflect, and pressure-tested milestones.',
  },
  {
    icon: 'challenge',
    title: 'A loop built to keep you moving',
    copy: 'Hearts, streaks, gems, quests, and boss moments keep the system alive when normal courses lose all momentum.',
  },
  {
    icon: 'artifact',
    title: 'Proof that turns effort into evidence',
    copy: 'Projects, review, and portfolio-ready output make the learning visible instead of leaving it trapped in course history.',
  },
]

function FeatureTile({ item }) {
  return (
    <div className="auth-feature-tile">
      <div className="auth-feature-icon">
        <IconGlyph name={item.icon} size={18} strokeWidth={2.2} color="#00e5c7" />
      </div>
      <div>
        <div className="auth-feature-title">{item.title}</div>
        <div className="auth-feature-copy">{item.copy}</div>
      </div>
    </div>
  )
}

function Field({ label, icon, type, value, onChange, placeholder, focused, onFocus, onBlur }) {
  return (
    <label className="auth-field">
      <span className="auth-field-label">
        <IconGlyph name={icon} size={14} strokeWidth={2.2} color="#00e5c7" />
        {label}
      </span>
      <input
        className={`auth-input ${focused ? 'is-focused' : ''}`}
        type={type}
        value={value}
        onChange={onChange}
        onFocus={onFocus}
        onBlur={onBlur}
        placeholder={placeholder}
        required
      />
    </label>
  )
}

export default function LoginPage() {
  const router = useRouter()
  const reduceMotion = useReducedMotion()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState('login')
  const [plan, setPlan] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [focused, setFocused] = useState(null)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const currentParams = new URLSearchParams(window.location.search)
    const requestedMode = currentParams.get('mode')
    const requestedPlan = currentParams.get('plan')

    if (requestedMode === 'signup' || requestedMode === 'login') {
      setMode(requestedMode)
    }

    if (requestedPlan === 'core' || requestedPlan === 'pro') {
      setPlan(requestedPlan)
    } else {
      setPlan(null)
    }

    setError('')
    setNotice('')
  }, [])

  const heroTitle =
    mode === 'login'
      ? 'Return to the route that actually gets finished.'
      : 'Start the route that turns learning into proof.'

  const heroCopy =
    mode === 'login'
      ? 'Pick up exactly where you left off. Your missions, streaks, boss progress, and proof stack are waiting on the other side.'
      : 'Create your account, calibrate your starting point, and move into a daily system that adapts harder and gets more real as you improve.'

  const ctaLabel =
    loading
      ? mode === 'login'
        ? 'Logging in...'
        : 'Creating account...'
      : mode === 'login'
        ? 'Enter PathAI'
        : plan === 'core'
          ? 'Create Core account'
          : plan === 'pro'
            ? 'Create Pro account'
            : 'Create account'

  const planCard = useMemo(() => (plan ? PLAN_META[plan] : null), [plan])

  const handleAuth = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setNotice('')
    let supabaseAuth = null

    try {
      if (mode === 'signup') {
        supabaseAuth = createSupabaseAuthClient()
        const { error: signUpError } = await supabaseAuth.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/onboarding` },
        })

        if (signUpError) throw signUpError

        setPassword('')
        setNotice('Check your inbox for the verification link. Once confirmed, we will send you into onboarding.')
        return
      }

      const loginResponse = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const loginPayload = await loginResponse.json().catch(() => null)

      if (!loginResponse.ok) {
        throw new Error(loginPayload?.error || 'Unable to sign in. Please try again.')
      }

      if (!loginPayload?.session) {
        throw new Error('Unable to start your session. Please try again.')
      }

      persistSupabaseSession(loginPayload.session)
      router.push('/dashboard')
    } catch (err) {
      const message = err?.message || 'Something went wrong. Please try again.'
      if (mode === 'login' && shouldUseLocalAccessFallback(message)) {
        persistLocalAccessSession({ email })
        router.push('/dashboard')
        return
      }

      setError(message)
    } finally {
      if (supabaseAuth) {
        try {
          await supabaseAuth.auth.stopAutoRefresh()
        } catch {}
      }
      setLoading(false)
    }
  }

  return (
    <>
      <style jsx global>{`
        @keyframes auth-spin {
          to {
            transform: rotate(360deg);
          }
        }

        .auth-page {
          position: relative;
          min-height: 100vh;
          overflow: clip;
          background:
            radial-gradient(circle at 50% -10%, rgba(0,229,199,0.14), transparent 30%),
            linear-gradient(180deg, #07080d 0%, #0a0b11 52%, #08090f 100%);
        }
        .auth-page::before {
          content: '';
          position: fixed;
          inset: 0;
          pointer-events: none;
          opacity: 0.08;
          background-image:
            linear-gradient(rgba(255,255,255,0.18) 0.7px, transparent 0.7px),
            linear-gradient(90deg, rgba(255,255,255,0.18) 0.7px, transparent 0.7px);
          background-size: 140px 140px;
          mask-image: linear-gradient(180deg, rgba(0,0,0,0.34), transparent 80%);
          -webkit-mask-image: linear-gradient(180deg, rgba(0,0,0,0.34), transparent 80%);
        }
        .auth-shell {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 1280px;
          margin: 0 auto;
          padding: calc(env(safe-area-inset-top, 0px) + 22px) 24px 96px;
        }
        .auth-nav {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          margin-bottom: 64px;
        }
        .auth-brand {
          display: inline-flex;
          align-items: center;
          gap: 14px;
          text-decoration: none;
          color: #f0f0f0;
        }
        .auth-brandmark {
          width: 44px;
          height: 44px;
          border-radius: 16px;
          display: grid;
          place-items: center;
          background: linear-gradient(140deg, #00e5c7, #7fe7ff 56%, #97a5ff);
          color: #071015;
          box-shadow: 0 22px 44px rgba(0,229,199,0.22), inset 0 1px 0 rgba(255,255,255,0.42);
        }
        .auth-nav-actions {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }
        .auth-nav-link,
        .auth-nav-primary {
          min-height: 46px;
          padding: 0 18px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          text-decoration: none;
          font-size: 14px;
          font-weight: 800;
          letter-spacing: -0.02em;
        }
        .auth-nav-link {
          color: rgba(240,240,240,0.76);
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
        }
        .auth-nav-primary {
          color: #071015;
          background: linear-gradient(135deg, #00e5c7, #7fe7ff 48%, #97a5ff);
          box-shadow: 0 24px 44px rgba(0,229,199,0.18);
        }
        .auth-main {
          display: grid;
          grid-template-columns: minmax(0, 1.05fr) minmax(420px, 0.95fr);
          gap: 34px;
          align-items: start;
        }
        .auth-story {
          padding-top: 34px;
        }
        .auth-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 20px;
          padding: 10px 16px;
          border-radius: 999px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          color: rgba(240,240,240,0.76);
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.18em;
          text-transform: uppercase;
        }
        .auth-eyebrow::before {
          content: '';
          width: 8px;
          height: 8px;
          border-radius: 999px;
          background: #00e5c7;
          box-shadow: 0 0 20px rgba(0,229,199,0.4);
        }
        .auth-title {
          max-width: 760px;
          color: #f0f0f0;
          font-size: clamp(3.4rem, 7.2vw, 5.7rem);
          line-height: 0.94;
          letter-spacing: -0.05em;
        }
        .auth-copy {
          max-width: 620px;
          margin-top: 24px;
          color: rgba(240,240,240,0.60);
          font-size: 18px;
          line-height: 1.8;
        }
        .auth-story-points {
          display: grid;
          gap: 14px;
          margin-top: 34px;
        }
        .auth-feature-tile {
          display: grid;
          grid-template-columns: 46px minmax(0, 1fr);
          gap: 14px;
          align-items: start;
          padding: 18px 20px;
          border-radius: 24px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.06);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.03);
        }
        .auth-feature-icon {
          width: 46px;
          height: 46px;
          border-radius: 16px;
          display: grid;
          place-items: center;
          background: rgba(0,229,199,0.10);
          border: 1px solid rgba(0,229,199,0.16);
        }
        .auth-feature-title {
          color: #f0f0f0;
          font-size: 17px;
          font-weight: 700;
          letter-spacing: -0.03em;
        }
        .auth-feature-copy {
          margin-top: 8px;
          color: rgba(240,240,240,0.54);
          font-size: 14px;
          line-height: 1.72;
        }
        .auth-preview-frame {
          margin-top: 22px;
          padding: 22px;
          border-radius: 30px;
        }
        .auth-preview-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }
        .auth-preview-pill {
          display: inline-flex;
          align-items: center;
          padding: 8px 12px;
          border-radius: 999px;
          background: rgba(255,255,255,0.06);
          color: rgba(240,240,240,0.76);
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }
        .auth-preview-note {
          color: rgba(240,240,240,0.46);
          font-size: 12px;
        }
        .auth-preview-title {
          margin-top: 18px;
          color: #f0f0f0;
          font-size: 32px;
          font-weight: 800;
          letter-spacing: -0.05em;
        }
        .auth-preview-copy {
          margin-top: 10px;
          max-width: 460px;
          color: rgba(240,240,240,0.56);
          font-size: 14px;
          line-height: 1.72;
        }
        .auth-preview-progress {
          margin-top: 18px;
          height: 8px;
          border-radius: 999px;
          overflow: hidden;
          background: rgba(255,255,255,0.07);
        }
        .auth-preview-progressfill {
          width: 64%;
          height: 100%;
          border-radius: 999px;
          background: linear-gradient(90deg, #00e5c7, #7fe7ff);
          box-shadow: 0 0 18px rgba(0,229,199,0.28);
        }
        .auth-preview-stack {
          display: grid;
          gap: 12px;
          margin-top: 18px;
        }
        .auth-preview-task {
          padding: 14px 16px;
          border-radius: 20px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.06);
        }
        .auth-preview-taskmeta {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          color: rgba(240,240,240,0.42);
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }
        .auth-preview-tasktitle {
          margin-top: 10px;
          color: #f0f0f0;
          font-size: 15px;
          font-weight: 700;
        }
        .auth-panel-shell {
          width: 100%;
        }
        .auth-panel {
          padding: 28px;
          border-radius: 32px;
        }
        .auth-panel-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 14px;
          margin-bottom: 22px;
        }
        .auth-panel-kicker {
          color: rgba(240,240,240,0.44);
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }
        .auth-panel-title {
          margin-top: 8px;
          color: #f0f0f0;
          font-size: 30px;
          font-weight: 700;
          letter-spacing: -0.05em;
        }
        .auth-panel-copy {
          margin-top: 10px;
          color: rgba(240,240,240,0.56);
          font-size: 14px;
          line-height: 1.7;
        }
        .auth-plan-pill {
          padding: 10px 14px;
          border-radius: 999px;
          border: 1px solid rgba(0,229,199,0.18);
          background: rgba(0,229,199,0.10);
          color: #c8fff4;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          white-space: nowrap;
        }
        .auth-plan-card {
          margin-bottom: 20px;
          padding: 16px 18px;
          border-radius: 22px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.06);
        }
        .auth-plan-card-title {
          color: #f0f0f0;
          font-size: 14px;
          font-weight: 800;
          letter-spacing: -0.02em;
        }
        .auth-plan-card-copy {
          margin-top: 8px;
          color: rgba(240,240,240,0.54);
          font-size: 13px;
          line-height: 1.65;
        }
        .auth-toggle {
          display: flex;
          gap: 6px;
          padding: 6px;
          border-radius: 999px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          margin-bottom: 22px;
        }
        .auth-toggle-btn {
          flex: 1;
          min-height: 46px;
          border: none;
          border-radius: 999px;
          background: transparent;
          color: rgba(240,240,240,0.48);
          font-size: 14px;
          font-weight: 800;
          letter-spacing: -0.02em;
          transition: all 180ms ease;
        }
        .auth-toggle-btn.active {
          color: #071015;
          background: linear-gradient(135deg, #00e5c7, #7fe7ff 48%, #97a5ff);
          box-shadow: 0 18px 34px rgba(0,229,199,0.16), inset 0 1px 0 rgba(255,255,255,0.42);
        }
        .auth-banner {
          margin-bottom: 18px;
          padding: 14px 16px;
          border-radius: 18px;
          font-size: 13px;
          line-height: 1.65;
        }
        .auth-banner.error {
          background: rgba(255,107,107,0.10);
          border: 1px solid rgba(255,107,107,0.22);
          color: #ffb1b1;
        }
        .auth-banner.notice {
          background: rgba(0,229,199,0.10);
          border: 1px solid rgba(0,229,199,0.18);
          color: #d6fff7;
        }
        .auth-form {
          display: grid;
          gap: 16px;
        }
        .auth-field {
          display: grid;
          gap: 10px;
        }
        .auth-field-label {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: rgba(240,240,240,0.46);
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }
        .auth-input {
          width: 100%;
          min-height: 56px;
          padding: 0 18px;
          border-radius: 18px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          color: #f0f0f0;
          font-size: 15px;
          font-family: 'DM Sans', sans-serif;
          transition: border-color 180ms ease, box-shadow 180ms ease, background 180ms ease;
        }
        .auth-input::placeholder {
          color: rgba(240,240,240,0.26);
        }
        .auth-input.is-focused,
        .auth-input:focus {
          outline: none;
          background: rgba(0,229,199,0.05);
          border-color: rgba(0,229,199,0.32);
          box-shadow: 0 0 0 4px rgba(0,229,199,0.08);
        }
        .auth-submit {
          width: 100%;
          min-height: 56px;
          margin-top: 4px;
          border: none;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          color: #071015;
          background: linear-gradient(135deg, #00e5c7, #7fe7ff 48%, #97a5ff);
          box-shadow: 0 24px 44px rgba(0,229,199,0.18), inset 0 1px 0 rgba(255,255,255,0.42);
          font-size: 15px;
          font-weight: 800;
          letter-spacing: -0.02em;
          transition: transform 160ms ease, opacity 160ms ease, filter 160ms ease;
        }
        .auth-submit:disabled {
          opacity: 0.56;
          cursor: default;
          filter: grayscale(0.12);
        }
        .auth-spinner {
          width: 18px;
          height: 18px;
          border-radius: 999px;
          border: 2px solid rgba(7,16,21,0.18);
          border-top-color: #071015;
          animation: auth-spin 0.75s linear infinite;
        }
        .auth-divider {
          display: flex;
          align-items: center;
          gap: 14px;
          margin: 22px 0 18px;
        }
        .auth-divider::before,
        .auth-divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: rgba(255,255,255,0.07);
        }
        .auth-divider span {
          color: rgba(240,240,240,0.34);
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }
        .auth-switch {
          text-align: center;
          color: rgba(240,240,240,0.52);
          font-size: 14px;
        }
        .auth-switch button {
          background: none;
          border: none;
          color: #00e5c7;
          font-size: 14px;
          font-weight: 800;
          letter-spacing: -0.02em;
        }
        .auth-footnote {
          margin-top: 18px;
          text-align: center;
          color: rgba(240,240,240,0.34);
          font-size: 12px;
          line-height: 1.7;
        }
        @media (max-width: 1120px) {
          .auth-main {
            grid-template-columns: minmax(0, 1fr);
          }
          .auth-story {
            padding-top: 0;
          }
        }
        @media (max-width: 768px) {
          .auth-shell {
            padding: calc(env(safe-area-inset-top, 0px) + 18px) 16px 72px;
          }
          .auth-nav {
            margin-bottom: 42px;
          }
          .auth-nav-actions {
            width: 100%;
            justify-content: flex-start;
          }
          .auth-title {
            font-size: clamp(2.8rem, 12vw, 4.2rem);
          }
          .auth-panel {
            padding: 22px;
          }
          .auth-panel-head {
            flex-direction: column;
          }
          .auth-story-points {
            gap: 12px;
          }
        }
      `}</style>

      <div className="auth-page">
        <AtmosphericBackdrop variant="landing" />

        <div className="auth-shell safe-top-shell">
          <nav className="auth-nav">
            <Link href="/" className="auth-brand">
              <div className="auth-brandmark">
                <IconGlyph name="bolt" size={20} strokeWidth={2.5} color="#071015" />
              </div>
              <div>
                <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.05em' }}>PathAI</div>
                <div style={{ fontSize: 12, color: 'rgba(240,240,240,0.42)' }}>
                  {mode === 'login' ? 'Access your route' : 'Create your route'}
                </div>
              </div>
            </Link>

            <div className="auth-nav-actions">
              <Link href="/" className="auth-nav-link">
                <ArrowLeft size={15} strokeWidth={2.4} />
                <span>Back to landing</span>
              </Link>
              <Link href="/pricing" className="auth-nav-link">Pricing</Link>
              <Link href="/demo" className="auth-nav-primary">Try free demo</Link>
            </div>
          </nav>

          <main className="auth-main">
            <motion.section
              className="auth-story"
              initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.55, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="auth-eyebrow">Path access</div>
              <h1 className="font-display auth-title">{heroTitle}</h1>
              <p className="auth-copy">{heroCopy}</p>

              <div className="auth-story-points">
                {AUTH_FEATURES.map((item) => (
                  <FeatureTile item={item} key={item.title} />
                ))}
              </div>

              <PremiumFrame
                accent="rgba(0,229,199,0.14)"
                className="auth-preview-frame"
                style={{ borderRadius: 32 }}
              >
                <div className="auth-preview-top">
                  <div className="auth-preview-pill">What unlocks next</div>
                  <div className="auth-preview-note">Mission preview</div>
                </div>
                <div className="auth-preview-title">Decision Trees</div>
                <div className="auth-preview-copy">
                  One concept, one guided application, one recall pass, and one boss checkpoint once the fundamentals are steady.
                </div>
                <div className="auth-preview-progress">
                  <div className="auth-preview-progressfill" />
                </div>
                <div className="auth-preview-stack">
                  {[
                    ['Concept', 'Why split quality matters', '12 min'],
                    ['Practice', 'Trace a tree by hand', '16 min'],
                    ['Recall', 'Review impurity metrics', '8 min'],
                  ].map(([type, title, time]) => (
                    <div className="auth-preview-task" key={title}>
                      <div className="auth-preview-taskmeta">
                        <span>{type}</span>
                        <span>{time}</span>
                      </div>
                      <div className="auth-preview-tasktitle">{title}</div>
                    </div>
                  ))}
                </div>
              </PremiumFrame>
            </motion.section>

            <motion.section
              className="auth-panel-shell"
              initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.6, delay: reduceMotion ? 0 : 0.08, ease: [0.16, 1, 0.3, 1] }}
            >
              <PremiumFrame
                accent={plan ? 'rgba(0,229,199,0.16)' : 'rgba(126,160,255,0.14)'}
                className="auth-panel"
                style={{ borderRadius: 34 }}
              >
                <div className="auth-panel-head">
                  <div>
                    <div className="auth-panel-kicker">{mode === 'login' ? 'Welcome back' : 'Get started'}</div>
                    <div className="auth-panel-title">{mode === 'login' ? 'Enter your account' : 'Create your account'}</div>
                    <div className="auth-panel-copy">
                      {mode === 'login'
                        ? 'Sign in to continue your missions, stats, path graph, and project proof.'
                        : 'Create an account to save your route, generate missions, and continue into onboarding.'}
                    </div>
                  </div>
                  {planCard ? <div className="auth-plan-pill">{planCard.label}</div> : null}
                </div>

                {planCard ? (
                  <div className="auth-plan-card">
                    <div className="auth-plan-card-title">{planCard.label}</div>
                    <div className="auth-plan-card-copy">{planCard.copy}</div>
                  </div>
                ) : null}

                <div className="auth-toggle">
                  {['login', 'signup'].map((entryMode) => (
                    <button
                      key={entryMode}
                      type="button"
                      className={`auth-toggle-btn ${mode === entryMode ? 'active' : ''}`}
                      onClick={() => {
                        setMode(entryMode)
                        setError('')
                        setNotice('')
                      }}
                    >
                      {entryMode === 'login' ? 'Log In' : 'Sign Up'}
                    </button>
                  ))}
                </div>

                {error ? <div className="auth-banner error">{error}</div> : null}
                {notice ? <div className="auth-banner notice">{notice}</div> : null}

                <form className="auth-form" onSubmit={handleAuth}>
                  <Field
                    label="Email"
                    icon="message"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    focused={focused === 'email'}
                    onFocus={() => setFocused('email')}
                    onBlur={() => setFocused(null)}
                  />

                  <Field
                    label="Password"
                    icon="lock"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    focused={focused === 'password'}
                    onFocus={() => setFocused('password')}
                    onBlur={() => setFocused(null)}
                  />

                  <button className="auth-submit" type="submit" disabled={loading}>
                    {loading ? (
                      <>
                        <span className="auth-spinner" />
                        <span>{ctaLabel}</span>
                      </>
                    ) : (
                      <>
                        <span>{ctaLabel}</span>
                        <ArrowRight size={16} strokeWidth={2.6} />
                      </>
                    )}
                  </button>
                </form>

                <div className="auth-divider">
                  <span>Switch mode</span>
                </div>

                <div className="auth-switch">
                  {mode === 'login' ? "Don't have an account yet? " : 'Already have an account? '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode(mode === 'login' ? 'signup' : 'login')
                      setError('')
                      setNotice('')
                    }}
                  >
                    {mode === 'login' ? 'Create one now' : 'Log in instead'}
                  </button>
                </div>

                <div className="auth-footnote">
                  By continuing, you agree to PathAI&apos;s Terms of Service and understand that payment selection, if any, comes later.
                </div>
              </PremiumFrame>
            </motion.section>
          </main>
        </div>
      </div>
    </>
  )
}
