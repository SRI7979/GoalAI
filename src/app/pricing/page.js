'use client'

import Link from 'next/link'
import { Fragment, useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Check, ChevronDown, ChevronUp } from 'lucide-react'
import IconGlyph from '@/components/IconGlyph'
import AtmosphericBackdrop from '@/components/premium/AtmosphericBackdrop'
import PremiumFrame from '@/components/premium/PremiumFrame'
import ScrollReveal from '@/components/premium/ScrollReveal'
import {
  PRICING_COMPARISON_ROWS,
  PRICING_FAQ,
  PRICING_PLANS,
} from '@/lib/pricingConfig'
import { getSafeSupabaseUser } from '@/lib/supabase'

function BillingToggle({ annual, onChange }) {
  return (
    <div className="pricing-toggle">
      <button
        type="button"
        className={`pricing-toggle-btn ${!annual ? 'active' : ''}`}
        onClick={() => onChange(false)}
      >
        Monthly
      </button>
      <button
        type="button"
        className={`pricing-toggle-btn ${annual ? 'active' : ''}`}
        onClick={() => onChange(true)}
      >
        Annual
        <span className="pricing-toggle-save">Save 20%+</span>
      </button>
    </div>
  )
}

function PlanCard({ plan, annual, loggedIn }) {
  const isFree = plan.monthlyPrice === 0
  const price = annual ? plan.annualEquivalent : plan.monthlyPrice
  const period = annual ? '/mo billed yearly' : '/mo'
  const yearlyLine = annual && !isFree ? `$${plan.annualPrice}/year` : plan.billingCopy
  const ctaHref = loggedIn && !isFree ? '/dashboard' : plan.ctaHref
  const ctaLabel = loggedIn && !isFree ? `Continue to ${plan.name}` : plan.ctaLabel

  return (
    <PremiumFrame
      accent={plan.highlight ? 'rgba(0,229,199,0.18)' : 'rgba(255,255,255,0.08)'}
      className={`pricing-plan-card ${plan.highlight ? 'is-highlighted' : ''}`}
    >
      <div className="pricing-plan-top">
        <div>
          <div className="pricing-plan-name-row">
            <div className="pricing-plan-name">{plan.name}</div>
            {plan.badge ? <div className={`pricing-plan-badge ${plan.highlight ? 'highlight' : ''}`}>{plan.badge}</div> : null}
          </div>
          <div className="pricing-plan-description">{plan.description}</div>
        </div>
      </div>

      <div className="pricing-plan-price">
        <span className="pricing-plan-price-value">{isFree ? '$0' : `$${price}`}</span>
        <span className="pricing-plan-price-period">{isFree ? plan.billingCopy : period}</span>
      </div>

      <div className="pricing-plan-billing">{isFree ? 'No card required' : yearlyLine}</div>

      <Link
        href={ctaHref}
        className={`pricing-plan-cta ${plan.highlight ? 'highlight' : ''}`}
      >
        {ctaLabel}
      </Link>

      <div className="pricing-plan-features">
        {plan.features.map((feature) => (
          <div className="pricing-feature-row" key={feature}>
            <span className="pricing-feature-icon">
              <Check size={14} strokeWidth={2.8} />
            </span>
            <span>{feature}</span>
          </div>
        ))}
      </div>
    </PremiumFrame>
  )
}

function CapabilityCell({ value, emphasize = false }) {
  return (
    <div className={`pricing-compare-cell ${emphasize ? 'emphasize' : ''}`}>
      {value === 'Included' || value === 'Expanded' || value === 'Full access' ? (
        <span className="pricing-compare-included"><Check size={14} strokeWidth={2.8} /></span>
      ) : null}
      <span>{value}</span>
    </div>
  )
}

function FAQItem({ item, open, onToggle }) {
  return (
    <button type="button" className="pricing-faq-item interactive-card" onClick={onToggle}>
      <div className="pricing-faq-head">
        <span>{item.question}</span>
        {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </div>
      <div className={`pricing-faq-body ${open ? 'open' : ''}`}>{item.answer}</div>
    </button>
  )
}

export default function PricingPage() {
  const [annual, setAnnual] = useState(false)
  const [openFaq, setOpenFaq] = useState(0)
  const [loggedIn, setLoggedIn] = useState(false)

  useEffect(() => {
    let mounted = true
    void (async () => {
      const { user } = await getSafeSupabaseUser()
      if (mounted) setLoggedIn(Boolean(user))
    })()
    return () => {
      mounted = false
    }
  }, [])

  const plans = useMemo(() => PRICING_PLANS, [])

  return (
    <>
      <style jsx global>{`
        .pricing-page {
          position: relative;
          min-height: 100vh;
          overflow: clip;
          background:
            radial-gradient(circle at 50% -12%, rgba(0,229,199,0.14), transparent 30%),
            linear-gradient(180deg, #07080d 0%, #0a0b11 52%, #08090f 100%);
        }
        .pricing-shell {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 1260px;
          margin: 0 auto;
          padding: calc(env(safe-area-inset-top, 0px) + 28px) 24px 110px;
        }
        .pricing-nav {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 78px;
        }
        .pricing-brand {
          display: inline-flex;
          align-items: center;
          gap: 14px;
          color: #f0f0f0;
          text-decoration: none;
        }
        .pricing-brandmark {
          width: 42px;
          height: 42px;
          border-radius: 16px;
          display: grid;
          place-items: center;
          background: linear-gradient(140deg, #00e5c7, #7fe7ff 56%, #97a5ff);
          color: #071015;
          box-shadow: 0 22px 44px rgba(0,229,199,0.22), inset 0 1px 0 rgba(255,255,255,0.42);
        }
        .pricing-nav-actions {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }
        .pricing-nav-link,
        .pricing-nav-back,
        .pricing-nav-cta {
          min-height: 46px;
          padding: 0 18px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          text-decoration: none;
          font-size: 14px;
          font-weight: 800;
          letter-spacing: -0.02em;
        }
        .pricing-nav-back {
          gap: 8px;
          color: rgba(240,240,240,0.78);
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
        }
        .pricing-nav-link {
          color: rgba(240,240,240,0.74);
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
        }
        .pricing-nav-cta {
          color: #071015;
          background: linear-gradient(135deg, #00e5c7, #7fe7ff 48%, #97a5ff);
          box-shadow: 0 24px 44px rgba(0,229,199,0.18);
        }
        .pricing-section {
          padding: 72px 0;
        }
        .pricing-hero {
          text-align: center;
          max-width: 920px;
          margin: 0 auto;
        }
        .pricing-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 10px 16px;
          border-radius: 999px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          color: rgba(240,240,240,0.72);
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.18em;
          text-transform: uppercase;
        }
        .pricing-eyebrow::before {
          content: '';
          width: 8px;
          height: 8px;
          border-radius: 999px;
          background: #00e5c7;
          box-shadow: 0 0 18px rgba(0,229,199,0.34);
        }
        .pricing-hero-title {
          margin-top: 22px;
          color: #f0f0f0;
          font-size: clamp(3.2rem, 7vw, 5.7rem);
          line-height: 0.95;
          letter-spacing: -0.05em;
        }
        .pricing-hero-copy {
          margin: 24px auto 0;
          max-width: 680px;
          color: rgba(240,240,240,0.56);
          font-size: 18px;
          line-height: 1.78;
        }
        .pricing-toggle-wrap {
          display: flex;
          justify-content: center;
          margin-top: 34px;
        }
        .pricing-toggle {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px;
          border-radius: 999px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
        }
        .pricing-toggle-btn {
          min-height: 46px;
          padding: 0 18px;
          border-radius: 999px;
          border: none;
          background: transparent;
          color: rgba(240,240,240,0.68);
          font-size: 14px;
          font-weight: 700;
          display: inline-flex;
          align-items: center;
          gap: 10px;
        }
        .pricing-toggle-btn.active {
          background: linear-gradient(135deg, rgba(0,229,199,0.18), rgba(126,160,255,0.18));
          color: #f0f0f0;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.08), 0 12px 24px rgba(0,0,0,0.18);
        }
        .pricing-toggle-save {
          padding: 5px 8px;
          border-radius: 999px;
          background: rgba(0,229,199,0.14);
          color: #c8fff4;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        .pricing-plan-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 18px;
          margin-top: 42px;
        }
        .pricing-plan-card {
          padding: 26px;
          height: 100%;
        }
        .pricing-plan-card.is-highlighted {
          transform: translateY(-8px);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.08), 0 42px 84px rgba(0,0,0,0.34), 0 0 46px rgba(0,229,199,0.10);
        }
        .pricing-plan-top {
          min-height: 96px;
        }
        .pricing-plan-name-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }
        .pricing-plan-name {
          color: #f0f0f0;
          font-size: 28px;
          font-weight: 700;
          letter-spacing: -0.04em;
        }
        .pricing-plan-badge {
          padding: 8px 12px;
          border-radius: 999px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          color: rgba(240,240,240,0.7);
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          white-space: nowrap;
        }
        .pricing-plan-badge.highlight {
          background: rgba(0,229,199,0.14);
          border-color: rgba(0,229,199,0.18);
          color: #c8fff4;
        }
        .pricing-plan-description {
          margin-top: 14px;
          color: rgba(240,240,240,0.54);
          font-size: 14px;
          line-height: 1.68;
        }
        .pricing-plan-price {
          display: flex;
          align-items: baseline;
          gap: 10px;
          margin-top: 26px;
        }
        .pricing-plan-price-value {
          color: #f0f0f0;
          font-size: 54px;
          font-weight: 700;
          line-height: 1;
          letter-spacing: -0.06em;
        }
        .pricing-plan-price-period {
          color: rgba(240,240,240,0.48);
          font-size: 14px;
          font-weight: 700;
        }
        .pricing-plan-billing {
          margin-top: 10px;
          color: rgba(240,240,240,0.42);
          font-size: 13px;
        }
        .pricing-plan-cta {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          min-height: 50px;
          margin-top: 22px;
          border-radius: 999px;
          text-decoration: none;
          font-size: 14px;
          font-weight: 800;
          letter-spacing: -0.02em;
          color: #eef1f5;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
        }
        .pricing-plan-cta.highlight {
          color: #071015;
          background: linear-gradient(135deg, #00e5c7, #7fe7ff 48%, #97a5ff);
          border-color: rgba(255,255,255,0.12);
          box-shadow: 0 24px 44px rgba(0,229,199,0.18);
        }
        .pricing-plan-features {
          display: grid;
          gap: 12px;
          margin-top: 24px;
        }
        .pricing-feature-row {
          display: grid;
          grid-template-columns: 24px minmax(0, 1fr);
          gap: 10px;
          align-items: start;
          color: rgba(240,240,240,0.72);
          font-size: 14px;
          line-height: 1.6;
        }
        .pricing-feature-icon {
          width: 22px;
          height: 22px;
          border-radius: 999px;
          display: grid;
          place-items: center;
          background: rgba(0,229,199,0.14);
          color: #00e5c7;
          margin-top: 1px;
        }
        .pricing-section-title {
          color: #f0f0f0;
          font-size: clamp(2.5rem, 5vw, 4.5rem);
          line-height: 0.96;
          letter-spacing: -0.04em;
        }
        .pricing-section-copy {
          margin-top: 18px;
          max-width: 640px;
          color: rgba(240,240,240,0.56);
          font-size: 17px;
          line-height: 1.74;
        }
        .pricing-compare-card,
        .pricing-proof-card,
        .pricing-final-card {
          padding: 28px;
        }
        .pricing-compare-grid {
          display: grid;
          grid-template-columns: minmax(170px, 1.4fr) repeat(3, minmax(0, 1fr));
          gap: 12px;
          margin-top: 28px;
          align-items: center;
        }
        .pricing-compare-label,
        .pricing-compare-head {
          color: rgba(240,240,240,0.48);
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }
        .pricing-compare-head {
          color: #f0f0f0;
        }
        .pricing-compare-cell {
          min-height: 58px;
          border-radius: 18px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.05);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          color: rgba(240,240,240,0.68);
          font-size: 13px;
          font-weight: 600;
          text-align: center;
          padding: 0 10px;
        }
        .pricing-compare-cell.emphasize {
          color: #c8fff4;
          border-color: rgba(0,229,199,0.18);
          background: rgba(0,229,199,0.10);
        }
        .pricing-compare-included {
          width: 22px;
          height: 22px;
          border-radius: 999px;
          display: grid;
          place-items: center;
          background: rgba(0,229,199,0.14);
          color: #00e5c7;
          flex-shrink: 0;
        }
        .pricing-proof-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 16px;
          margin-top: 30px;
        }
        .pricing-proof-tile {
          padding: 20px;
          border-radius: 24px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.06);
        }
        .pricing-proof-icon {
          width: 44px;
          height: 44px;
          border-radius: 16px;
          display: grid;
          place-items: center;
          background: rgba(0,229,199,0.14);
          color: #00e5c7;
          margin-bottom: 16px;
        }
        .pricing-proof-tile h3 {
          color: #f0f0f0;
          font-size: 20px;
          font-weight: 700;
          letter-spacing: -0.03em;
        }
        .pricing-proof-tile p {
          margin-top: 10px;
          color: rgba(240,240,240,0.54);
          font-size: 14px;
          line-height: 1.68;
        }
        .pricing-faq-list {
          display: grid;
          gap: 12px;
          margin-top: 30px;
        }
        .pricing-faq-item {
          width: 100%;
          padding: 20px 22px;
          border-radius: 24px;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.03);
          text-align: left;
        }
        .pricing-faq-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          color: #f0f0f0;
          font-size: 17px;
          font-weight: 700;
          letter-spacing: -0.02em;
        }
        .pricing-faq-body {
          max-height: 0;
          overflow: hidden;
          color: rgba(240,240,240,0.56);
          font-size: 14px;
          line-height: 1.72;
          transition: max-height 240ms ease, opacity 240ms ease, margin-top 240ms ease;
          opacity: 0;
          margin-top: 0;
        }
        .pricing-faq-body.open {
          max-height: 180px;
          opacity: 1;
          margin-top: 14px;
        }
        .pricing-final-card {
          text-align: center;
        }
        .pricing-final-copy {
          max-width: 620px;
          margin: 20px auto 0;
          color: rgba(240,240,240,0.56);
          font-size: 17px;
          line-height: 1.74;
        }
        .pricing-final-actions {
          display: flex;
          justify-content: center;
          gap: 12px;
          flex-wrap: wrap;
          margin-top: 28px;
        }
        .pricing-final-cta,
        .pricing-final-secondary {
          min-height: 50px;
          padding: 0 22px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          text-decoration: none;
          font-size: 14px;
          font-weight: 800;
          letter-spacing: -0.02em;
        }
        .pricing-final-cta {
          color: #071015;
          background: linear-gradient(135deg, #00e5c7, #7fe7ff 48%, #97a5ff);
          box-shadow: 0 24px 44px rgba(0,229,199,0.18);
        }
        .pricing-final-secondary {
          color: #eef1f5;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
        }
        @media (max-width: 1080px) {
          .pricing-plan-grid,
          .pricing-proof-grid {
            grid-template-columns: minmax(0, 1fr);
          }
        }
        @media (max-width: 768px) {
          .pricing-shell {
            padding: calc(env(safe-area-inset-top, 0px) + 20px) 16px 88px;
          }
          .pricing-nav {
            margin-bottom: 54px;
          }
          .pricing-nav-actions {
            width: 100%;
            justify-content: flex-start;
          }
          .pricing-plan-card.is-highlighted {
            transform: none;
          }
          .pricing-compare-grid {
            grid-template-columns: minmax(120px, 1.2fr) repeat(3, minmax(0, 1fr));
            gap: 10px;
          }
          .pricing-compare-cell {
            min-height: 52px;
            font-size: 12px;
          }
          .pricing-final-actions {
            flex-direction: column;
          }
          .pricing-final-cta,
          .pricing-final-secondary {
            width: 100%;
          }
        }
      `}</style>

      <div className="pricing-page">
        <AtmosphericBackdrop variant="landing" />

        <div className="pricing-shell">
          <nav className="pricing-nav">
            <Link href="/" className="pricing-brand">
              <div className="pricing-brandmark">
                <IconGlyph name="bolt" size={20} strokeWidth={2.5} color="#071015" />
              </div>
              <div>
                <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.05em' }}>PathAI</div>
                <div style={{ fontSize: 12, color: 'rgba(240,240,240,0.42)' }}>Pricing</div>
              </div>
            </Link>

            <div className="pricing-nav-actions">
              <Link href="/" className="pricing-nav-back">
                <ArrowLeft size={15} strokeWidth={2.4} />
                <span>Back to landing</span>
              </Link>
              <Link href="/login" className="pricing-nav-link">Login</Link>
              <Link href="/login?mode=signup" className="pricing-nav-cta">Start Learning Free</Link>
            </div>
          </nav>

          <section className="pricing-section">
            <ScrollReveal className="pricing-hero" distance={0}>
              <div className="pricing-eyebrow">Pricing</div>
              <h1 className="font-display pricing-hero-title">
                Choose the route that matches how seriously you want to learn.
              </h1>
              <p className="pricing-hero-copy">
                Start free, then upgrade when you want deeper tutoring, stronger challenge loops, and proof-of-skill that turns into something you can actually show.
              </p>
            </ScrollReveal>

            <ScrollReveal className="pricing-toggle-wrap" delay={100}>
              <BillingToggle annual={annual} onChange={setAnnual} />
            </ScrollReveal>

            <div className="pricing-plan-grid">
              {plans.map((plan, index) => (
                <ScrollReveal key={plan.id} delay={index * 80}>
                  <PlanCard plan={plan} annual={annual} loggedIn={loggedIn} />
                </ScrollReveal>
              ))}
            </div>
          </section>

          <section className="pricing-section">
            <ScrollReveal>
              <div className="pricing-eyebrow">Capability breakdown</div>
              <h2 className="font-display pricing-section-title" style={{ marginTop: 18 }}>
                The tiers are separated by seriousness, not fluff.
              </h2>
              <p className="pricing-section-copy">
                Free gets you into the system. Core unlocks the full daily engine. Pro is for learners who want PathAI to function like a real proof-of-skill stack.
              </p>
            </ScrollReveal>

            <ScrollReveal delay={120}>
              <PremiumFrame accent="rgba(0,229,199,0.12)" className="pricing-compare-card">
                <div className="pricing-compare-grid">
                  <div className="pricing-compare-head">Capability</div>
                  <div className="pricing-compare-head">Free</div>
                  <div className="pricing-compare-head">Core</div>
                  <div className="pricing-compare-head">Pro</div>

                  {PRICING_COMPARISON_ROWS.map((row) => (
                    <Fragment key={row.label}>
                      <div className="pricing-compare-label">{row.label}</div>
                      {row.values.map((value, index) => (
                        <CapabilityCell
                          key={`${row.label}-${index}`}
                          value={value}
                          emphasize={index > 0}
                        />
                      ))}
                    </Fragment>
                  ))}
                </div>
              </PremiumFrame>
            </ScrollReveal>
          </section>

          <section className="pricing-section">
            <ScrollReveal>
              <div className="pricing-eyebrow">Why paid exists</div>
              <h2 className="font-display pricing-section-title" style={{ marginTop: 18 }}>
                Paid tiers exist to deepen the work, not pad the page.
              </h2>
              <p className="pricing-section-copy">
                PathAI becomes more valuable as it gets more adaptive, more demanding, and more capable of turning effort into visible proof.
              </p>
            </ScrollReveal>

            <ScrollReveal delay={120}>
              <PremiumFrame accent="rgba(0,229,199,0.12)" className="pricing-proof-card">
                <div className="pricing-proof-grid">
                  {[
                    {
                      icon: 'message',
                      title: 'Deeper tutoring',
                      copy: 'Paid tiers unlock more AI help at the moments where explanation, hinting, and correction actually matter.',
                    },
                    {
                      icon: 'challenge',
                      title: 'Higher challenge intensity',
                      copy: 'Core and Pro make the route feel more complete, with stronger boss loops, fuller daily sequencing, and less artificial friction.',
                    },
                    {
                      icon: 'artifact',
                      title: 'More proof of skill',
                      copy: 'The biggest paid unlock is the ability to create, verify, and present more work that functions like evidence, not just activity.',
                    },
                  ].map((item) => (
                    <div className="pricing-proof-tile" key={item.title}>
                      <div className="pricing-proof-icon">
                        <IconGlyph name={item.icon} size={20} strokeWidth={2.2} color="#00e5c7" />
                      </div>
                      <h3>{item.title}</h3>
                      <p>{item.copy}</p>
                    </div>
                  ))}
                </div>
              </PremiumFrame>
            </ScrollReveal>
          </section>

          <section className="pricing-section">
            <ScrollReveal>
              <div className="pricing-eyebrow">FAQ</div>
              <h2 className="font-display pricing-section-title" style={{ marginTop: 18 }}>
                A few practical questions.
              </h2>
            </ScrollReveal>

            <div className="pricing-faq-list">
              {PRICING_FAQ.map((item, index) => (
                <ScrollReveal key={item.question} delay={index * 60}>
                  <FAQItem
                    item={item}
                    open={openFaq === index}
                    onToggle={() => setOpenFaq((current) => (current === index ? -1 : index))}
                  />
                </ScrollReveal>
              ))}
            </div>
          </section>

          <section className="pricing-section">
            <ScrollReveal>
              <PremiumFrame accent="rgba(0,229,199,0.14)" className="pricing-final-card">
                <div className="pricing-eyebrow" style={{ margin: '0 auto' }}>Start here</div>
                <h2 className="font-display pricing-section-title" style={{ maxWidth: 760, margin: '18px auto 0' }}>
                  Start free. Upgrade when the work gets serious.
                </h2>
                <p className="pricing-final-copy">
                  The free tier gets you into the route. Core unlocks the full adaptive engine. Pro unlocks the strongest proof-of-skill stack PathAI has.
                </p>
                <div className="pricing-final-actions">
                  <Link href={loggedIn ? '/dashboard' : '/login?mode=signup'} className="pricing-final-cta">
                    {loggedIn ? 'Go to dashboard' : 'Start Learning Free'}
                  </Link>
                  <Link href="/demo" className="pricing-final-secondary">
                    Try the free demo
                  </Link>
                </div>
              </PremiumFrame>
            </ScrollReveal>
          </section>
        </div>
      </div>
    </>
  )
}
