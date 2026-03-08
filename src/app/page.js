// Landing page — iOS Liquid Glass Edition
'use client'
import Link from 'next/link'

export default function Home() {
  return (
    <>
      <style jsx global>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(22px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeInSlow { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulseOrb { 0%, 100% { opacity: .22; transform: scale(1); } 50% { opacity: .4; transform: scale(1.07); } }
        @keyframes gradientShift { 0%, 100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } }
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
      `}</style>

      <div style={{
        minHeight: '100vh',
        fontFamily: "'DM Sans', -apple-system, 'SF Pro Display', system-ui, sans-serif",
        position: 'relative',
        overflow: 'hidden',
        WebkitFontSmoothing: 'antialiased',
      }}>
        {/* ── Aurora orbs ── */}
        <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
          <div style={{ position: 'absolute', top: '-15%', left: '15%', width: 700, height: 700, borderRadius: '50%', background: 'radial-gradient(circle, rgba(120,60,255,0.30) 0%, transparent 65%)', filter: 'blur(90px)', animation: 'pulseOrb 9s ease-in-out infinite' }} />
          <div style={{ position: 'absolute', top: '-10%', right: '-5%', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(40,100,255,0.25) 0%, transparent 65%)', filter: 'blur(80px)', animation: 'pulseOrb 11s ease-in-out infinite 2s' }} />
          <div style={{ position: 'absolute', top: '55%', left: '-8%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(14,245,194,0.18) 0%, transparent 65%)', filter: 'blur(80px)', animation: 'pulseOrb 8s ease-in-out infinite 1s' }} />
          <div style={{ position: 'absolute', bottom: '-10%', right: '10%', width: 550, height: 550, borderRadius: '50%', background: 'radial-gradient(circle, rgba(80,40,200,0.22) 0%, transparent 65%)', filter: 'blur(85px)', animation: 'pulseOrb 10s ease-in-out infinite 3s' }} />
        </div>

        {/* ── Nav ── */}
        <nav style={{
          maxWidth: 1100, margin: '0 auto',
          padding: '20px 24px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          position: 'relative', zIndex: 10,
          animation: 'fadeIn 0.5s ease-out',
        }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 40, height: 40,
              borderRadius: '26%',
              background: 'linear-gradient(135deg, #0ef5c2, #00d4ff)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 28px rgba(14,245,194,0.30), inset 0 1px 0 rgba(255,255,255,0.5)',
              animation: 'float 5s ease-in-out infinite',
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#06060f" strokeWidth="2.5" strokeLinecap="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
            </div>
            <span style={{ fontSize: 22, fontWeight: 800, color: '#f5f5f7', letterSpacing: '-0.6px' }}>PathAI</span>
          </div>

          {/* Nav CTA */}
          <Link href="/login" style={{
            padding: '10px 22px',
            background: 'linear-gradient(145deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.05) 100%)',
            border: '1px solid rgba(255,255,255,0.18)',
            borderRadius: 14,
            color: '#aeaeb2',
            fontSize: 14, fontWeight: 600,
            textDecoration: 'none',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.22), 0 4px 12px rgba(0,0,0,0.24)',
            transition: 'all 0.22s cubic-bezier(0.16,1,0.3,1)',
            display: 'inline-block',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'linear-gradient(145deg, rgba(255,255,255,0.20) 0%, rgba(255,255,255,0.08) 100%)'
            e.currentTarget.style.color = '#f5f5f7'
            e.currentTarget.style.transform = 'translateY(-1px)'
            e.currentTarget.style.boxShadow = 'inset 0 1px 0 rgba(255,255,255,0.28), 0 8px 24px rgba(0,0,0,0.32)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'linear-gradient(145deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.05) 100%)'
            e.currentTarget.style.color = '#aeaeb2'
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = 'inset 0 1px 0 rgba(255,255,255,0.22), 0 4px 12px rgba(0,0,0,0.24)'
          }}
          >
            Log In
          </Link>
        </nav>

        {/* ── Hero ── */}
        <div style={{
          maxWidth: 1100, margin: '0 auto',
          padding: '56px 24px 80px',
          position: 'relative', zIndex: 1,
        }}>
          {/* Hero text block */}
          <div style={{
            textAlign: 'center',
            maxWidth: 800,
            margin: '0 auto 88px',
            animation: 'fadeIn 0.7s cubic-bezier(0.16,1,0.3,1)',
          }}>
            {/* Badge */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '6px 16px',
              background: 'linear-gradient(145deg, rgba(14,245,194,0.14) 0%, rgba(14,245,194,0.05) 100%)',
              border: '1px solid rgba(14,245,194,0.24)',
              borderRadius: 9999,
              marginBottom: 32,
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              boxShadow: 'inset 0 1px 0 rgba(14,245,194,0.28), 0 4px 14px rgba(0,0,0,0.2)',
            }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#0ef5c2', boxShadow: '0 0 8px rgba(14,245,194,0.60)' }} />
              <span style={{ color: '#0ef5c2', fontSize: 13, fontWeight: 600, letterSpacing: '0.2px' }}>AI-powered adaptive learning</span>
            </div>

            <h1 style={{
              fontSize: 'clamp(42px, 7vw, 72px)',
              fontWeight: 900,
              color: '#f5f5f7',
              lineHeight: 1.06,
              letterSpacing: '-2.5px',
              marginBottom: 6,
            }}>
              Learn anything.
            </h1>
            <h1 style={{
              fontSize: 'clamp(42px, 7vw, 72px)',
              fontWeight: 900,
              lineHeight: 1.06,
              letterSpacing: '-2.5px',
              marginBottom: 32,
              background: 'linear-gradient(135deg, #0ef5c2 0%, #00d4ff 50%, #0ef5c2 100%)',
              backgroundSize: '200% auto',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              animation: 'gradientShift 5s ease infinite',
            }}>
              Actually finish it.
            </h1>

            <p style={{
              fontSize: 18,
              color: '#8e8e93',
              lineHeight: 1.72,
              maxWidth: 560,
              margin: '0 auto 40px',
              fontWeight: 400,
            }}>
              Stop drowning in tutorials you'll never finish. PathAI gives you one clear task each day — watch this, build this, review this. Miss a day? We adapt. You just show up.
            </p>

            {/* CTAs */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
              <Link href="/login" style={{
                display: 'inline-flex', alignItems: 'center', gap: 10,
                padding: '16px 34px',
                background: 'linear-gradient(135deg, #0ef5c2 0%, #00d4ff 100%)',
                borderRadius: 16, color: '#06060f',
                fontSize: 16, fontWeight: 700,
                textDecoration: 'none',
                boxShadow: '0 0 44px rgba(14,245,194,0.28), inset 0 1px 0 rgba(255,255,255,0.50)',
                transition: 'all 0.22s cubic-bezier(0.16,1,0.3,1)',
                letterSpacing: '-0.2px',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px) scale(1.01)'; e.currentTarget.style.boxShadow = '0 0 60px rgba(14,245,194,0.40), inset 0 1px 0 rgba(255,255,255,0.50)' }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0) scale(1)'; e.currentTarget.style.boxShadow = '0 0 44px rgba(14,245,194,0.28), inset 0 1px 0 rgba(255,255,255,0.50)' }}
              >
                Start Learning Free
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#06060f" strokeWidth="2.5" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
              </Link>

              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '15px 22px',
                background: 'linear-gradient(145deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.04) 100%)',
                border: '1px solid rgba(255,255,255,0.14)',
                borderRadius: 16,
                backdropFilter: 'blur(20px) saturate(180%)',
                WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18), 0 4px 14px rgba(0,0,0,0.22)',
              }}>
                <span style={{ color: '#0ef5c2', fontWeight: 800, fontSize: 15 }}>$12</span>
                <span style={{ color: '#636366', fontSize: 14, fontWeight: 500 }}>/mo · Cancel anytime</span>
              </div>
            </div>
          </div>

          {/* ── Problem / Solution ── */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: 16,
            marginBottom: 88,
            animation: 'fadeInSlow 0.8s cubic-bezier(0.16,1,0.3,1) 0.15s both',
          }}>
            {/* Without */}
            <div style={{
              background: 'linear-gradient(145deg, rgba(255,80,80,0.10) 0%, rgba(255,255,255,0.04) 40%, rgba(255,255,255,0.06) 100%)',
              border: '1px solid rgba(255,69,58,0.22)',
              borderRadius: 28,
              padding: '28px 26px',
              backdropFilter: 'blur(32px) saturate(200%)',
              WebkitBackdropFilter: 'blur(32px) saturate(200%)',
              boxShadow: 'inset 0 1px 0 rgba(255,80,80,0.18), 0 24px 56px rgba(0,0,0,0.32)',
              position: 'relative',
              overflow: 'hidden',
            }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, #ff453a, rgba(255,69,58,0.3))', borderRadius: '28px 28px 0 0' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 22 }}>
                <div style={{
                  width: 38, height: 38,
                  borderRadius: '26%',
                  background: 'rgba(255,69,58,0.12)',
                  border: '1px solid rgba(255,69,58,0.22)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: 'inset 0 1px 0 rgba(255,100,100,0.18)',
                }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ff453a" strokeWidth="2.2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </div>
                <span style={{ color: '#ff6961', fontSize: 16, fontWeight: 700 }}>Without PathAI</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[
                  'Google "learn Python" — 10,000 results, zero clarity',
                  'Start 5 courses, finish none of them',
                  'No idea what to learn next or in what order',
                  'Miss two days, feel behind, quit entirely',
                ].map((t, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#ff453a', marginTop: 9, flexShrink: 0, opacity: 0.55 }} />
                    <span style={{ color: '#636366', fontSize: 14, lineHeight: 1.58 }}>{t}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* With */}
            <div style={{
              background: 'linear-gradient(145deg, rgba(14,245,194,0.12) 0%, rgba(255,255,255,0.05) 40%, rgba(0,212,255,0.07) 100%)',
              border: '1px solid rgba(14,245,194,0.26)',
              borderRadius: 28,
              padding: '28px 26px',
              backdropFilter: 'blur(32px) saturate(200%)',
              WebkitBackdropFilter: 'blur(32px) saturate(200%)',
              boxShadow: 'inset 0 1px 0 rgba(14,245,194,0.28), 0 24px 56px rgba(0,0,0,0.32), 0 0 50px rgba(14,245,194,0.06)',
              position: 'relative',
              overflow: 'hidden',
            }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, #0ef5c2, #00d4ff)', borderRadius: '28px 28px 0 0' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 22 }}>
                <div style={{
                  width: 38, height: 38,
                  borderRadius: '26%',
                  background: 'rgba(14,245,194,0.12)',
                  border: '1px solid rgba(14,245,194,0.28)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: 'inset 0 1px 0 rgba(14,245,194,0.35), 0 0 14px rgba(14,245,194,0.10)',
                }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0ef5c2" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <span style={{ color: '#0ef5c2', fontSize: 16, fontWeight: 700 }}>With PathAI</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[
                  'Wake up to your daily task — specific, clear, actionable',
                  '"Watch THIS video, build THIS project" — no decisions needed',
                  'Miss a day? Plan auto-adjusts, no guilt, no broken streaks',
                  '2x higher completion rate vs traditional online courses',
                ].map((t, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#0ef5c2', marginTop: 9, flexShrink: 0, boxShadow: '0 0 7px rgba(14,245,194,0.45)' }} />
                    <span style={{ color: '#aeaeb2', fontSize: 14, lineHeight: 1.58 }}>{t}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── How it works ── */}
          <div style={{ marginBottom: 88, animation: 'fadeInSlow 0.8s cubic-bezier(0.16,1,0.3,1) 0.3s both' }}>
            <div style={{ textAlign: 'center', marginBottom: 44 }}>
              <h2 style={{ color: '#f5f5f7', fontSize: 34, fontWeight: 800, letterSpacing: '-1px', marginBottom: 10 }}>How it works</h2>
              <p style={{ color: '#636366', fontSize: 15, fontWeight: 400 }}>Three steps. No analysis paralysis.</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
              {[
                {
                  step: '01', title: 'Set your goal',
                  desc: 'Tell us what you want to learn and how much time you have. PathAI builds your personalized roadmap.',
                  icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><defs><linearGradient id="hw1" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#0ef5c2"/><stop offset="100%" stopColor="#00d4ff"/></linearGradient></defs><circle cx="12" cy="12" r="10" stroke="url(#hw1)"/><circle cx="12" cy="12" r="6" stroke="url(#hw1)"/><circle cx="12" cy="12" r="2" stroke="url(#hw1)"/></svg>,
                },
                {
                  step: '02', title: 'Learn daily',
                  desc: 'Get curated tasks each day — lessons, videos, exercises. Check in with your energy and we adapt.',
                  icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><defs><linearGradient id="hw2" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#0ef5c2"/><stop offset="100%" stopColor="#00d4ff"/></linearGradient></defs><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" stroke="url(#hw2)"/></svg>,
                },
                {
                  step: '03', title: 'Prove mastery',
                  desc: 'Complete a capstone project, earn a skill profile. Proof you can do it, not just that you studied it.',
                  icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><defs><linearGradient id="hw3" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#0ef5c2"/><stop offset="100%" stopColor="#00d4ff"/></linearGradient></defs><path d="M6 9H4.5a2.5 2.5 0 010-5H6" stroke="url(#hw3)"/><path d="M18 9h1.5a2.5 2.5 0 000-5H18" stroke="url(#hw3)"/><path d="M4 22h16" stroke="url(#hw3)"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" stroke="url(#hw3)"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" stroke="url(#hw3)"/><path d="M18 2H6v7a6 6 0 0012 0V2z" stroke="url(#hw3)"/></svg>,
                },
              ].map((item, i) => (
                <div key={i}
                  style={{
                    background: 'linear-gradient(145deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.04) 30%, rgba(110,170,255,0.05) 70%, rgba(255,255,255,0.07) 100%)',
                    border: '1px solid rgba(255,255,255,0.14)',
                    borderRadius: 24,
                    padding: '28px 24px',
                    backdropFilter: 'blur(28px) saturate(200%)',
                    WebkitBackdropFilter: 'blur(28px) saturate(200%)',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.22), 0 20px 44px rgba(0,0,0,0.28)',
                    transition: 'all 0.28s cubic-bezier(0.16,1,0.3,1)',
                    cursor: 'default',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px) scale(1.01)'
                    e.currentTarget.style.boxShadow = 'inset 0 1px 0 rgba(255,255,255,0.28), 0 32px 64px rgba(0,0,0,0.36), 0 0 40px rgba(14,245,194,0.07)'
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.22)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0) scale(1)'
                    e.currentTarget.style.boxShadow = 'inset 0 1px 0 rgba(255,255,255,0.22), 0 20px 44px rgba(0,0,0,0.28)'
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.14)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                    <div style={{
                      width: 44, height: 44,
                      borderRadius: '26%',
                      background: 'rgba(14,245,194,0.08)',
                      border: '1px solid rgba(14,245,194,0.18)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: 'inset 0 1px 0 rgba(14,245,194,0.22)',
                    }}>
                      {item.icon}
                    </div>
                    <span style={{ color: 'rgba(255,255,255,0.07)', fontSize: 42, fontWeight: 900, lineHeight: 1, letterSpacing: '-2px' }}>{item.step}</span>
                  </div>
                  <h3 style={{ color: '#f5f5f7', fontSize: 18, fontWeight: 700, marginBottom: 10, letterSpacing: '-0.3px' }}>{item.title}</h3>
                  <p style={{ color: '#636366', fontSize: 14, lineHeight: 1.65 }}>{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ── Social proof ── */}
          <div style={{
            textAlign: 'center',
            animation: 'fadeInSlow 0.8s cubic-bezier(0.16,1,0.3,1) 0.45s both',
            marginBottom: 44,
          }}>
            <p style={{ color: '#3a3a3c', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2px', marginBottom: 22 }}>Built for learners who actually want to finish</p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
              {[
                { val: 'Any Skill',  label: 'From Python to Guitar' },
                { val: 'Adaptive',   label: 'Adjusts to your pace'  },
                { val: 'Capstone',   label: 'Prove real mastery'     },
              ].map((s, i) => (
                <div key={i} style={{
                  padding: '18px 26px',
                  background: 'linear-gradient(145deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.03) 100%)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 20,
                  backdropFilter: 'blur(24px) saturate(180%)',
                  WebkitBackdropFilter: 'blur(24px) saturate(180%)',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18), 0 8px 24px rgba(0,0,0,0.22)',
                  minWidth: 160,
                }}>
                  <p style={{
                    fontSize: 20, fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 5,
                    background: 'linear-gradient(135deg, #0ef5c2, #00d4ff)',
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                  }}>{s.val}</p>
                  <p style={{ color: '#636366', fontSize: 13 }}>{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ── Final CTA ── */}
          <div style={{
            textAlign: 'center',
            padding: '52px 28px',
            background: 'linear-gradient(145deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.04) 35%, rgba(110,170,255,0.06) 70%, rgba(255,255,255,0.08) 100%)',
            border: '1px solid rgba(255,255,255,0.16)',
            borderRadius: 32,
            backdropFilter: 'blur(40px) saturate(220%)',
            WebkitBackdropFilter: 'blur(40px) saturate(220%)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.24), 0 40px 80px rgba(0,0,0,0.40)',
            position: 'relative',
            overflow: 'hidden',
            animation: 'fadeInSlow 0.8s cubic-bezier(0.16,1,0.3,1) 0.6s both',
          }}>
            <div style={{ position: 'absolute', top: 0, left: '15%', right: '15%', height: 1, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)' }} />
            <h2 style={{ color: '#f5f5f7', fontSize: 30, fontWeight: 800, letterSpacing: '-0.8px', marginBottom: 12 }}>Stop planning. Start learning.</h2>
            <p style={{ color: '#636366', fontSize: 15, marginBottom: 32, maxWidth: 420, margin: '0 auto 32px', fontWeight: 400 }}>Your first path is free. No credit card required.</p>
            <Link href="/login" style={{
              display: 'inline-flex', alignItems: 'center', gap: 10,
              padding: '16px 38px',
              background: 'linear-gradient(135deg, #0ef5c2 0%, #00d4ff 100%)',
              borderRadius: 16, color: '#06060f',
              fontSize: 17, fontWeight: 700,
              textDecoration: 'none',
              boxShadow: '0 0 48px rgba(14,245,194,0.30), inset 0 1px 0 rgba(255,255,255,0.50)',
              letterSpacing: '-0.2px',
              transition: 'all 0.22s cubic-bezier(0.16,1,0.3,1)',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)'; e.currentTarget.style.boxShadow = '0 0 64px rgba(14,245,194,0.42), inset 0 1px 0 rgba(255,255,255,0.50)' }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0) scale(1)'; e.currentTarget.style.boxShadow = '0 0 48px rgba(14,245,194,0.30), inset 0 1px 0 rgba(255,255,255,0.50)' }}
            >
              Get Started Free
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#06060f" strokeWidth="2.5" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
            </Link>
          </div>

          {/* ── Footer ── */}
          <div style={{ textAlign: 'center', padding: '36px 0 16px', color: '#3a3a3c', fontSize: 13 }}>
            PathAI © 2026
          </div>
        </div>
      </div>
    </>
  )
}
