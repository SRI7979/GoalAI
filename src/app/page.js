'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import {
  ArrowRight,
  Check,
  Github,
  Menu,
  Play,
  Star,
  Twitter,
  X,
} from 'lucide-react'
import IconGlyph from '@/components/IconGlyph'
import AtmosphericBackdrop from '@/components/premium/AtmosphericBackdrop'
import HoverDepthCard from '@/components/premium/HoverDepthCard'
import MouseTiltPanel from '@/components/premium/MouseTiltPanel'
import PremiumFrame from '@/components/premium/PremiumFrame'
import ScrollReveal from '@/components/premium/ScrollReveal'

const NAV_LINKS = [
  { href: '#features', label: 'Features' },
  { href: '#how-it-works', label: 'How it Works' },
  { href: '/pricing', label: 'Pricing' },
]

const SOCIAL_ITEMS = [
  '500+ learners building real momentum',
  '4.9 average early-user rating',
  'Adaptive path, daily missions, verified proof',
  'Built solo. Trusted by ambitious early adopters',
  'PathAI runs coding, language, design, ML, and more',
]

const PROBLEMS = [
  {
    icon: 'book_marked',
    title: 'You watch. You forget.',
    description:
      'Passive tutorials feel productive until nothing sticks. PathAI turns new material into recall, application, and reflection before it fades.',
  },
  {
    icon: 'repeat',
    title: 'You start. You stop.',
    description:
      'Most platforms deliver content, not momentum. Daily missions, energy-aware pacing, and adaptive recovery keep the route alive when life gets messy.',
  },
  {
    icon: 'artifact',
    title: "You finish. You can't prove it.",
    description:
      'Courses rarely create evidence. PathAI ends in verified projects, portfolio-ready proof, and a visible track record of what you can actually do.',
  },
]

const HOW_STEPS = [
  {
    title: 'Set your goal',
    body: 'Choose the skill, the pace, and the kind of path you want. PathAI calibrates the route before you ever see the first lesson.',
    icon: 'goal',
    mock: 'goal',
  },
  {
    title: 'Get your daily missions',
    body: 'Every day lands as a focused stack of work: concept, guided practice, recall, quiz, reflect, and milestone moments when they matter.',
    icon: 'bolt',
    mock: 'missions',
  },
  {
    title: 'Learn, practice, prove',
    body: 'AI lessons, challenges, boss battles, and adaptive support turn passive learning into repeated decisions and durable understanding.',
    icon: 'challenge',
    mock: 'learn',
  },
  {
    title: 'Build your portfolio',
    body: 'Projects become evidence. Review, authenticity, and proof layers turn effort into something you can share and defend.',
    icon: 'artifact',
    mock: 'proof',
  },
]

const SHOWCASE = [
  {
    title: 'Adaptive Daily Missions',
    description:
      "Every day is planned for you: recall, practice, quiz, reflect, and challenge. Your route adjusts to real performance instead of dragging you through a generic syllabus.",
    accent: 'rgba(0,229,199,0.18)',
    mode: 'dashboard',
  },
  {
    title: 'Boss Battles and Game Loop',
    description:
      'Hearts, gems, streaks, quests, weekly rewards, and boss moments keep the product alive. The game loop exists to reinforce effort, not distract from it.',
    accent: 'rgba(126,160,255,0.18)',
    mode: 'boss',
  },
  {
    title: 'Verified Proof of Skill',
    description:
      'Projects turn learning into evidence. Build real work, get reviewed, and publish a portfolio that says what you can do instead of what you consumed.',
    accent: 'rgba(0,229,199,0.16)',
    mode: 'project',
  },
]

const COMPARISON_ROWS = [
  { label: 'Adaptive path', values: [true, false, false, true, true] },
  { label: 'Daily missions', values: [true, false, false, false, false] },
  { label: 'Game loop', values: [true, false, false, true, false] },
  { label: 'Project verification', values: [true, false, false, false, false] },
  { label: 'Portfolio output', values: [true, false, false, false, false] },
  { label: 'AI tutor', values: [true, false, false, false, false] },
]

function CTAButton({ href, children, secondary = false, icon }) {
  return (
    <Link
      href={href}
      className={secondary ? 'interactive-secondary landing-button landing-button-secondary' : 'interactive-cta landing-button landing-button-primary'}
    >
      <span>{children}</span>
      {icon ? icon : null}
    </Link>
  )
}

function SectionHeading({ eyebrow, title, body, align = 'left' }) {
  return (
    <ScrollReveal style={{ textAlign: align, maxWidth: align === 'center' ? 860 : 720, margin: align === 'center' ? '0 auto' : undefined }}>
      {eyebrow ? <div className="landing-eyebrow">{eyebrow}</div> : null}
      <h2 className="font-display landing-section-title">{title}</h2>
      {body ? <p className="landing-section-copy">{body}</p> : null}
    </ScrollReveal>
  )
}

function BrowserBar() {
  return (
    <div className="landing-browserbar">
      <div className="landing-browserdots">
        <span />
        <span />
        <span />
      </div>
      <div className="landing-browserurl">pathai.app/dashboard</div>
    </div>
  )
}

function DashboardMock({ hero = false }) {
  return (
    <MouseTiltPanel
      className="landing-tilt-panel"
      maxTilt={hero ? 12 : 8}
      scale={hero ? 1.018 : 1.012}
      baseRotateX={hero ? 6 : 0}
      baseRotateY={hero ? -12 : 0}
      radius={34}
    >
      <PremiumFrame accent="rgba(0,229,199,0.16)" style={{ padding: 18, borderRadius: 34 }}>
        <div className="landing-mock-shell">
          <BrowserBar />
          <div className="landing-mock-toprow landing-tilt-depth-1">
            <div>
              <div className="landing-mock-goal">Machine Learning Sprint</div>
              <div className="landing-mock-subtle">Tuesday mission stack</div>
            </div>
            <div className="landing-mock-badges">
              <span><IconGlyph name="gem" size={14} /> 128</span>
              <span><IconGlyph name="heart" size={14} /> 5</span>
              <span><IconGlyph name="flame" size={14} /> 14</span>
            </div>
          </div>
          <div className="landing-mock-hero landing-tilt-depth-2">
            <div className="landing-mock-pill">Today&apos;s mission</div>
            <div className="landing-mock-hero-title">Decision Trees</div>
            <div className="landing-mock-hero-copy">
              One concept, one guided application, one recall pass, one confidence check.
            </div>
            <div className="landing-mock-progress">
              <div className="landing-mock-progressfill" />
            </div>
          </div>
          <div className="landing-task-stack landing-tilt-depth-1">
            {[
              ['Concept', 'Why split quality matters', '12 min'],
              ['Practice', 'Trace a tree by hand', '16 min'],
              ['Recall', 'Review impurity metrics', '8 min'],
              ['Boss', 'Choose the right split under pressure', '18 min'],
            ].map(([type, title, time]) => (
              <div className="landing-taskcard" key={title}>
                <div className="landing-taskmeta">
                  <span>{type}</span>
                  <span>{time}</span>
                </div>
                <div className="landing-tasktitle">{title}</div>
              </div>
            ))}
          </div>
        </div>
      </PremiumFrame>
    </MouseTiltPanel>
  )
}

function MiniStepMock({ mode }) {
  if (mode === 'goal') {
    return (
      <MouseTiltPanel className="landing-mini-tilt" maxTilt={10} scale={1.02} baseRotateY={-6} radius={22}>
        <div className="landing-mini-mock">
          <div className="landing-mini-row landing-tilt-depth-2">
            <div className="landing-mini-block wide active" />
            <div className="landing-mini-block" />
          </div>
          <div className="landing-mini-grid landing-tilt-depth-1">
            <div className="landing-mini-card active" />
            <div className="landing-mini-card" />
            <div className="landing-mini-card" />
          </div>
        </div>
      </MouseTiltPanel>
    )
  }

  if (mode === 'missions') {
    return (
      <MouseTiltPanel className="landing-mini-tilt" maxTilt={10} scale={1.02} baseRotateY={-4} radius={22}>
        <div className="landing-mini-mock">
          {['Concept', 'Practice', 'Quiz'].map((item, index) => (
            <div className="landing-mini-task landing-tilt-depth-1" key={item}>
              <span className={`landing-mini-dot ${index === 0 ? 'active' : ''}`} />
              <div className="landing-mini-lines">
                <div className="landing-mini-line strong" />
                <div className="landing-mini-line" />
              </div>
            </div>
          ))}
        </div>
      </MouseTiltPanel>
    )
  }

  if (mode === 'learn') {
    return (
      <MouseTiltPanel className="landing-mini-tilt" maxTilt={10} scale={1.02} baseRotateY={5} radius={22}>
        <div className="landing-mini-mock">
          <div className="landing-mini-boss landing-tilt-depth-1">
            <div className="landing-mini-bossbar" />
            <div className="landing-mini-bossgrid">
              <div className="landing-mini-orb" />
              <div className="landing-mini-bosscopy">
                <div className="landing-mini-line strong" />
                <div className="landing-mini-line" />
              </div>
            </div>
          </div>
        </div>
      </MouseTiltPanel>
    )
  }

  return (
    <MouseTiltPanel className="landing-mini-tilt" maxTilt={10} scale={1.02} baseRotateY={6} radius={22}>
      <div className="landing-mini-mock">
        <div className="landing-mini-project landing-tilt-depth-1">
          <div className="landing-mini-ribbon">Verified</div>
          <div className="landing-mini-line strong" />
          <div className="landing-mini-line" />
          <div className="landing-mini-line short" />
        </div>
      </div>
    </MouseTiltPanel>
  )
}

function FeatureVisual({ mode }) {
  if (mode === 'boss') {
    return (
      <MouseTiltPanel className="landing-tilt-panel" maxTilt={10} scale={1.014} baseRotateY={8} radius={34}>
        <PremiumFrame accent="rgba(126,160,255,0.18)" style={{ padding: 22, borderRadius: 34 }}>
          <div className="landing-visual-shell">
            <div className="landing-visual-top landing-tilt-depth-1">
              <span className="landing-visual-badge alt">Boss Battle</span>
              <span className="landing-visual-badge ghost">14 day streak</span>
            </div>
            <div className="landing-boss-panel landing-tilt-depth-2">
              <div className="landing-boss-avatar">
                <IconGlyph name="challenge" size={28} strokeWidth={2.2} color="#f0f4f8" />
              </div>
              <div>
                <div className="landing-boss-title">Model Selection Gauntlet</div>
                <div className="landing-visual-copy">Make the right call with limited hints and one heart on the line.</div>
              </div>
            </div>
            <div className="landing-boss-metrics landing-tilt-depth-1">
              <div>
                <label>Hearts</label>
                <strong>3 / 5</strong>
              </div>
              <div>
                <label>Combo</label>
                <strong>5x</strong>
              </div>
              <div>
                <label>Reward</label>
                <strong>180 XP</strong>
              </div>
            </div>
          </div>
        </PremiumFrame>
      </MouseTiltPanel>
    )
  }

  if (mode === 'project') {
    return (
      <MouseTiltPanel className="landing-tilt-panel" maxTilt={10} scale={1.014} baseRotateY={-8} radius={34}>
        <PremiumFrame accent="rgba(0,229,199,0.14)" style={{ padding: 22, borderRadius: 34 }}>
          <div className="landing-visual-shell">
            <div className="landing-visual-top landing-tilt-depth-1">
              <span className="landing-visual-badge">Proof of Skill</span>
              <span className="landing-visual-badge ghost">Verified</span>
            </div>
            <div className="landing-project-proof landing-tilt-depth-1">
              <div className="landing-proof-score">
                <span>AI score</span>
                <strong>92</strong>
              </div>
              <div className="landing-proof-score">
                <span>Authenticity</span>
                <strong>88%</strong>
              </div>
            </div>
            <div className="landing-project-card landing-tilt-depth-2">
              <div className="landing-project-thumb" />
              <div>
                <div className="landing-boss-title">Freelancer Invoice Tracker</div>
                <div className="landing-visual-copy">Built, defended, reviewed, and published into a portfolio page.</div>
              </div>
            </div>
          </div>
        </PremiumFrame>
      </MouseTiltPanel>
    )
  }

  return <DashboardMock />
}

function ComparisonCell({ value }) {
  return (
    <div className={`landing-compare-cell ${value ? 'yes' : 'no'}`}>
      {value ? <Check size={16} strokeWidth={2.6} /> : <X size={16} strokeWidth={2.6} />}
    </div>
  )
}

function NavItem({ href, children, className = '', onClick }) {
  if (href.startsWith('#')) {
    return (
      <a className={className} href={href} onClick={onClick}>
        {children}
      </a>
    )
  }

  return (
    <Link className={className} href={href} onClick={onClick}>
      {children}
    </Link>
  )
}

export default function Home() {
  const reduceMotion = useReducedMotion()
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 18)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const trustItems = useMemo(() => [...SOCIAL_ITEMS, ...SOCIAL_ITEMS], [])

  return (
    <>
      <style jsx global>{`
        .pathai-landing {
          position: relative;
          min-height: 100vh;
          overflow: clip;
          background:
            radial-gradient(circle at 50% -10%, rgba(0,229,199,0.16), transparent 28%),
            linear-gradient(180deg, #07080d 0%, #0a0b11 52%, #08090f 100%);
        }
        .pathai-landing::before {
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
        .landing-shell {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 1280px;
          margin: 0 auto;
          padding: 0 24px 110px;
        }
        .landing-nav {
          position: sticky;
          top: 0;
          z-index: 30;
          padding: calc(env(safe-area-inset-top, 0px) + 18px) 0 18px;
          transition: background 180ms ease, border-color 180ms ease, backdrop-filter 180ms ease;
        }
        .landing-navbarline {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          width: 100%;
        }
        .landing-nav.is-scrolled {
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
          background: rgba(10,10,15,0.72);
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }
        .landing-brand {
          display: inline-flex;
          align-items: center;
          gap: 14px;
          color: #f0f0f0;
        }
        .landing-brandmark {
          width: 42px;
          height: 42px;
          border-radius: 16px;
          display: grid;
          place-items: center;
          background: linear-gradient(140deg, rgba(0,229,199,0.96), rgba(132,179,255,0.96));
          box-shadow: 0 22px 44px rgba(0,229,199,0.22), inset 0 1px 0 rgba(255,255,255,0.4);
          color: #061017;
        }
        .landing-navlinks {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 30px;
          flex: 1;
          min-width: 0;
        }
        .landing-navlink {
          color: rgba(240,240,240,0.68);
          font-size: 14px;
          font-weight: 600;
          transition: color 160ms ease;
        }
        .landing-navlink:hover {
          color: #f0f0f0;
        }
        .landing-navactions {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-shrink: 0;
        }
        .landing-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          min-height: 50px;
          padding: 0 20px;
          border-radius: 999px;
          border: 1px solid transparent;
          font-size: 14px;
          font-weight: 800;
          letter-spacing: -0.02em;
          text-decoration: none;
          white-space: nowrap;
        }
        .landing-button-primary {
          color: #071015;
          background: linear-gradient(135deg, #00e5c7 0%, #7fe7ff 48%, #97a5ff 100%);
          box-shadow: 0 24px 54px rgba(0,229,199,0.22), inset 0 1px 0 rgba(255,255,255,0.52);
        }
        .landing-button-secondary {
          color: #eef1f5;
          background: rgba(255,255,255,0.04);
          border-color: rgba(255,255,255,0.09);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
        }
        .landing-menu-button {
          display: none;
          width: 46px;
          height: 46px;
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.04);
          color: #f0f0f0;
        }
        .landing-mobile-menu {
          display: none;
          margin-top: 10px;
          padding: 14px;
          border-radius: 22px;
          background: rgba(9,10,15,0.88);
          border: 1px solid rgba(255,255,255,0.06);
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
        }
        .landing-mobile-menu a {
          display: block;
          padding: 12px 4px;
          color: rgba(240,240,240,0.72);
          font-weight: 600;
        }
        .landing-section {
          padding: 150px 0;
        }
        .landing-hero {
          padding-top: 72px;
          padding-bottom: 140px;
        }
        .landing-hero-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.08fr) minmax(420px, 0.92fr);
          gap: 34px;
          align-items: center;
        }
        .landing-eyebrow {
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
        .landing-eyebrow::before {
          content: '';
          width: 8px;
          height: 8px;
          border-radius: 999px;
          background: #00e5c7;
          box-shadow: 0 0 20px rgba(0,229,199,0.4);
        }
        .landing-hero-title {
          max-width: 760px;
          color: #f0f0f0;
          font-size: clamp(4rem, 8vw, 6.6rem);
          line-height: 0.92;
          letter-spacing: -0.05em;
        }
        .landing-hero-copy {
          max-width: 620px;
          margin-top: 24px;
          color: rgba(240,240,240,0.62);
          font-size: 19px;
          line-height: 1.75;
        }
        .landing-cta-row {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
          margin-top: 34px;
        }
        .landing-hero-meta {
          display: flex;
          gap: 30px;
          flex-wrap: wrap;
          margin-top: 30px;
        }
        .landing-hero-meta strong {
          display: block;
          color: #f0f0f0;
          font-size: 24px;
          font-weight: 700;
        }
        .landing-hero-meta span {
          display: block;
          color: rgba(240,240,240,0.48);
          font-size: 13px;
          margin-top: 3px;
        }
        .landing-hero-shot {
          position: relative;
          max-width: 560px;
          margin-left: auto;
        }
        .landing-tilt-panel,
        .landing-mini-tilt {
          width: 100%;
          transform-style: preserve-3d;
        }
        .landing-tilt-depth-1 {
          transform: translateZ(18px);
          transform-style: preserve-3d;
        }
        .landing-tilt-depth-2 {
          transform: translateZ(34px);
          transform-style: preserve-3d;
        }
        .landing-hero-shot::before {
          content: '';
          position: absolute;
          inset: 18% 10% -4% 10%;
          background: radial-gradient(circle, rgba(0,229,199,0.16), transparent 62%);
          filter: blur(60px);
          opacity: 0.9;
        }
        .landing-mock-shell {
          display: grid;
          gap: 16px;
          transform-style: preserve-3d;
        }
        .landing-browserbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 0 4px;
        }
        .landing-browserdots {
          display: inline-flex;
          gap: 7px;
        }
        .landing-browserdots span {
          width: 8px;
          height: 8px;
          border-radius: 999px;
          background: rgba(255,255,255,0.18);
        }
        .landing-browserurl {
          border-radius: 999px;
          padding: 7px 12px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          color: rgba(240,240,240,0.52);
          font-size: 11px;
        }
        .landing-mock-toprow {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
        }
        .landing-mock-goal {
          color: #f0f0f0;
          font-size: 28px;
          font-weight: 800;
          letter-spacing: -0.04em;
        }
        .landing-mock-subtle {
          margin-top: 6px;
          color: rgba(240,240,240,0.42);
          font-size: 12px;
        }
        .landing-mock-badges {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }
        .landing-mock-badges span {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 12px;
          border-radius: 999px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          color: rgba(240,240,240,0.7);
          font-size: 12px;
        }
        .landing-mock-badges svg {
          color: #00e5c7;
        }
        .landing-mock-hero {
          padding: 20px;
          border-radius: 26px;
          background: linear-gradient(180deg, rgba(0,229,199,0.12), rgba(14,18,26,0.86));
          border: 1px solid rgba(0,229,199,0.18);
        }
        .landing-mock-pill {
          display: inline-flex;
          padding: 8px 12px;
          border-radius: 999px;
          background: rgba(255,255,255,0.06);
          color: rgba(240,240,240,0.72);
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }
        .landing-mock-hero-title {
          margin-top: 16px;
          color: #f0f0f0;
          font-size: 34px;
          font-weight: 800;
          letter-spacing: -0.05em;
        }
        .landing-mock-hero-copy {
          margin-top: 10px;
          max-width: 420px;
          color: rgba(240,240,240,0.58);
          font-size: 14px;
          line-height: 1.72;
        }
        .landing-mock-progress {
          margin-top: 18px;
          height: 8px;
          border-radius: 999px;
          background: rgba(255,255,255,0.07);
          overflow: hidden;
        }
        .landing-mock-progressfill {
          width: 68%;
          height: 100%;
          border-radius: 999px;
          background: linear-gradient(90deg, #00e5c7, #7fe7ff);
          box-shadow: 0 0 18px rgba(0,229,199,0.28);
        }
        .landing-task-stack {
          display: grid;
          gap: 12px;
        }
        .landing-taskcard {
          padding: 14px 16px;
          border-radius: 20px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.06);
        }
        .landing-taskmeta {
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
        .landing-tasktitle {
          margin-top: 10px;
          color: #f0f0f0;
          font-size: 15px;
          font-weight: 700;
        }
        .landing-proofbar {
          padding: 20px 0 28px;
        }
        .landing-proofwrap {
          border-radius: 999px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.06);
          overflow: hidden;
        }
        .landing-marquee {
          display: flex;
          gap: 18px;
          width: max-content;
          padding: 14px 18px;
          animation: landingMarquee 26s linear infinite;
        }
        .landing-trustitem {
          display: inline-flex;
          align-items: center;
          gap: 12px;
          padding: 10px 14px;
          border-radius: 999px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.05);
          color: rgba(240,240,240,0.7);
          font-size: 13px;
          white-space: nowrap;
        }
        .landing-problem {
          position: relative;
          background: linear-gradient(180deg, #f4f6f8 0%, #e9edf1 100%);
          color: #121720;
        }
        .landing-problem::before {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at top center, rgba(0,229,199,0.08), transparent 28%);
          pointer-events: none;
        }
        .landing-problem .landing-eyebrow {
          background: rgba(18,23,32,0.05);
          border-color: rgba(18,23,32,0.08);
          color: rgba(18,23,32,0.58);
        }
        .landing-problem .landing-eyebrow::before {
          box-shadow: 0 0 16px rgba(0,229,199,0.22);
        }
        .landing-problem .landing-section-title {
          color: #111620;
        }
        .landing-problem .landing-section-copy {
          color: rgba(17,22,32,0.62);
        }
        .landing-problem-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 18px;
          margin-top: 48px;
        }
        .landing-problem-card {
          padding: 30px 28px;
          border-radius: 30px;
          background: rgba(255,255,255,0.68);
          border: 1px solid rgba(18,23,32,0.08);
          box-shadow: 0 24px 40px rgba(10,10,14,0.08);
        }
        .landing-problem-icon {
          width: 54px;
          height: 54px;
          border-radius: 18px;
          display: grid;
          place-items: center;
          background: rgba(0,229,199,0.12);
          color: #0b766c;
          margin-bottom: 20px;
        }
        .landing-problem-title {
          font-size: 25px;
          font-weight: 700;
          letter-spacing: -0.04em;
        }
        .landing-problem-copy {
          margin-top: 12px;
          color: rgba(17,22,32,0.68);
          font-size: 15px;
          line-height: 1.72;
        }
        .landing-transition-line {
          margin-top: 34px;
          text-align: center;
          color: rgba(17,22,32,0.72);
          font-size: 18px;
          font-weight: 600;
        }
        .landing-section-title {
          color: #f0f0f0;
          font-size: clamp(3rem, 6.6vw, 5.2rem);
          line-height: 0.95;
          letter-spacing: -0.04em;
        }
        .landing-section-copy {
          margin-top: 22px;
          max-width: 640px;
          color: rgba(240,240,240,0.58);
          font-size: 18px;
          line-height: 1.76;
        }
        .landing-how-grid {
          position: relative;
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 18px;
          margin-top: 56px;
        }
        .landing-how-grid::before {
          content: '';
          position: absolute;
          left: 8%;
          right: 8%;
          top: 30px;
          height: 1px;
          background: linear-gradient(90deg, rgba(0,229,199,0.18), rgba(255,255,255,0.06), rgba(0,229,199,0.18));
        }
        .landing-step-card {
          position: relative;
          padding: 30px 24px 24px;
          min-height: 320px;
        }
        .landing-step-index {
          position: absolute;
          right: 22px;
          top: 20px;
          color: rgba(255,255,255,0.08);
          font-size: 56px;
          font-weight: 700;
          letter-spacing: -0.08em;
        }
        .landing-step-icon {
          width: 52px;
          height: 52px;
          border-radius: 18px;
          display: grid;
          place-items: center;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.08);
        }
        .landing-step-title {
          margin-top: 22px;
          color: #f0f0f0;
          font-size: 24px;
          font-weight: 700;
          letter-spacing: -0.04em;
        }
        .landing-step-copy {
          margin-top: 12px;
          color: rgba(240,240,240,0.54);
          font-size: 14px;
          line-height: 1.72;
        }
        .landing-mini-mock {
          margin-top: 22px;
          padding: 16px;
          border-radius: 22px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.06);
          min-height: 108px;
          transform-style: preserve-3d;
        }
        .landing-mini-row,
        .landing-mini-grid,
        .landing-mini-task,
        .landing-mini-bossgrid {
          display: grid;
          gap: 10px;
        }
        .landing-mini-row { grid-template-columns: 1.3fr 0.7fr; }
        .landing-mini-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); margin-top: 10px; }
        .landing-mini-block,
        .landing-mini-card,
        .landing-mini-orb,
        .landing-mini-project {
          border-radius: 16px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.05);
        }
        .landing-mini-block { height: 36px; }
        .landing-mini-block.active,
        .landing-mini-card.active {
          background: rgba(0,229,199,0.14);
          border-color: rgba(0,229,199,0.20);
        }
        .landing-mini-card { height: 50px; }
        .landing-mini-task {
          grid-template-columns: 12px minmax(0, 1fr);
          align-items: start;
          margin-top: 10px;
        }
        .landing-mini-dot {
          width: 10px;
          height: 10px;
          border-radius: 999px;
          background: rgba(255,255,255,0.22);
          margin-top: 6px;
        }
        .landing-mini-dot.active { background: #00e5c7; box-shadow: 0 0 14px rgba(0,229,199,0.34); }
        .landing-mini-lines { display: grid; gap: 8px; }
        .landing-mini-line {
          height: 10px;
          width: 100%;
          border-radius: 999px;
          background: rgba(255,255,255,0.08);
        }
        .landing-mini-line.strong { width: 78%; background: rgba(255,255,255,0.18); }
        .landing-mini-line.short { width: 56%; }
        .landing-mini-bossbar {
          height: 8px;
          border-radius: 999px;
          background: linear-gradient(90deg, #00e5c7, rgba(255,255,255,0.08) 72%);
        }
        .landing-mini-bossgrid { grid-template-columns: 54px minmax(0, 1fr); margin-top: 16px; align-items: center; }
        .landing-mini-orb {
          width: 54px;
          height: 54px;
          border-radius: 18px;
          background: radial-gradient(circle, rgba(0,229,199,0.22), rgba(255,255,255,0.03));
        }
        .landing-mini-project {
          position: relative;
          padding: 20px 16px 16px;
          min-height: 86px;
        }
        .landing-mini-ribbon {
          position: absolute;
          top: 14px;
          right: 14px;
          padding: 6px 10px;
          border-radius: 999px;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #071015;
          background: linear-gradient(135deg, #00e5c7, #7fe7ff);
        }
        .landing-showcase {
          display: grid;
          gap: 44px;
          margin-top: 60px;
        }
        .landing-showcase-row {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 28px;
          align-items: center;
        }
        .landing-showcase-row.reverse .landing-showcase-copy {
          order: 2;
        }
        .landing-showcase-title {
          color: #f0f0f0;
          font-size: clamp(2.4rem, 4.4vw, 3.8rem);
          line-height: 0.98;
          letter-spacing: -0.04em;
        }
        .landing-showcase-copy p {
          margin-top: 20px;
          color: rgba(240,240,240,0.58);
          font-size: 17px;
          line-height: 1.78;
        }
        .landing-showcase-kicker {
          display: inline-flex;
          padding: 8px 14px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.04);
          color: rgba(240,240,240,0.72);
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }
        .landing-visual-shell {
          display: grid;
          gap: 18px;
          transform-style: preserve-3d;
        }
        .landing-visual-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
        }
        .landing-visual-badge {
          display: inline-flex;
          align-items: center;
          padding: 8px 12px;
          border-radius: 999px;
          background: rgba(0,229,199,0.14);
          border: 1px solid rgba(0,229,199,0.18);
          color: #c7fff4;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }
        .landing-visual-badge.alt {
          background: rgba(126,160,255,0.12);
          border-color: rgba(126,160,255,0.18);
          color: #dbe5ff;
        }
        .landing-visual-badge.ghost {
          background: rgba(255,255,255,0.04);
          border-color: rgba(255,255,255,0.06);
          color: rgba(240,240,240,0.62);
        }
        .landing-boss-panel,
        .landing-project-card {
          display: grid;
          grid-template-columns: 84px minmax(0, 1fr);
          gap: 18px;
          align-items: center;
          padding: 18px;
          border-radius: 24px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.06);
        }
        .landing-boss-avatar,
        .landing-project-thumb {
          width: 84px;
          height: 84px;
          border-radius: 24px;
          display: grid;
          place-items: center;
          background: radial-gradient(circle, rgba(126,160,255,0.3), rgba(255,255,255,0.02));
          border: 1px solid rgba(126,160,255,0.18);
        }
        .landing-project-thumb {
          background:
            linear-gradient(180deg, rgba(0,229,199,0.16), rgba(255,255,255,0.02)),
            linear-gradient(135deg, rgba(255,255,255,0.08), transparent 60%);
          border-color: rgba(0,229,199,0.16);
        }
        .landing-boss-title {
          color: #f0f0f0;
          font-size: 24px;
          font-weight: 700;
          letter-spacing: -0.04em;
        }
        .landing-visual-copy {
          margin-top: 8px;
          color: rgba(240,240,240,0.54);
          font-size: 14px;
          line-height: 1.68;
        }
        .landing-boss-metrics,
        .landing-project-proof {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
        }
        .landing-project-proof { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .landing-boss-metrics div,
        .landing-proof-score {
          padding: 16px;
          border-radius: 20px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.05);
        }
        .landing-boss-metrics label,
        .landing-proof-score span {
          display: block;
          color: rgba(240,240,240,0.42);
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.12em;
        }
        .landing-boss-metrics strong,
        .landing-proof-score strong {
          display: block;
          margin-top: 8px;
          color: #f0f0f0;
          font-size: 22px;
          font-weight: 700;
          letter-spacing: -0.04em;
        }
        .landing-demo {
          text-align: center;
        }
        .landing-demo-copy {
          max-width: 560px;
          margin: 22px auto 0;
          color: rgba(240,240,240,0.56);
          font-size: 18px;
          line-height: 1.74;
        }
        .landing-demo-note {
          margin-top: 16px;
          color: rgba(240,240,240,0.42);
          font-size: 13px;
        }
        .landing-comparison-card {
          margin-top: 56px;
          padding: 26px;
        }
        .landing-compare-grid {
          display: grid;
          grid-template-columns: minmax(180px, 1.3fr) repeat(5, minmax(90px, 1fr));
          gap: 12px;
          align-items: center;
        }
        .landing-compare-head,
        .landing-compare-row {
          display: contents;
        }
        .landing-compare-label {
          padding: 16px 18px;
          border-radius: 18px;
          color: rgba(240,240,240,0.62);
          font-size: 14px;
          font-weight: 600;
        }
        .landing-compare-head .landing-compare-label {
          color: rgba(240,240,240,0.92);
          font-size: 13px;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }
        .landing-compare-cell {
          height: 54px;
          border-radius: 18px;
          display: grid;
          place-items: center;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.05);
          color: rgba(240,240,240,0.36);
        }
        .landing-compare-cell.yes {
          color: #00e5c7;
          border-color: rgba(0,229,199,0.18);
          background: rgba(0,229,199,0.10);
        }
        .landing-final {
          position: relative;
        }
        .landing-final::before {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at 50% -8%, rgba(0,229,199,0.18), transparent 34%);
          pointer-events: none;
        }
        .landing-final-card {
          padding: 44px 34px;
          text-align: center;
        }
        .landing-footer {
          display: grid;
          gap: 24px;
          padding-top: 40px;
          border-top: 1px solid rgba(255,255,255,0.06);
        }
        .landing-footer-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          flex-wrap: wrap;
        }
        .landing-footer-links,
        .landing-footer-socials {
          display: flex;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
        }
        .landing-footer-links a,
        .landing-footer-socials a {
          color: rgba(240,240,240,0.52);
          font-size: 14px;
        }
        .landing-footer-note {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          border-radius: 999px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.06);
          color: rgba(240,240,240,0.62);
          font-size: 12px;
        }
        @keyframes landingMarquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        @media (prefers-reduced-motion: reduce) {
          .landing-marquee { animation: none; }
          .landing-tilt-depth-1,
          .landing-tilt-depth-2 {
            transform: none;
          }
        }
        @media (max-width: 1180px) {
          .landing-hero-grid,
          .landing-showcase-row {
            grid-template-columns: minmax(0, 1fr);
          }
          .landing-hero-shot {
            margin: 0;
            max-width: none;
          }
          .landing-showcase-row.reverse .landing-showcase-copy {
            order: 0;
          }
        }
        @media (max-width: 1120px) {
          .landing-navlinks,
          .landing-navactions .landing-navlink-login {
            display: none;
          }
          .landing-menu-button {
            display: block;
          }
          .landing-mobile-menu {
            display: ${menuOpen ? 'block' : 'none'};
          }
          .landing-nav {
            display: block;
          }
          .landing-navbarline {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
          }
          .landing-button-secondary {
            padding: 0 16px;
          }
          .landing-nav {
            display: block;
          }
          .landing-problem-grid,
          .landing-how-grid {
            grid-template-columns: minmax(0, 1fr);
          }
          .landing-how-grid::before {
            display: none;
          }
          .landing-compare-grid {
            grid-template-columns: minmax(0, 1.3fr) repeat(5, minmax(58px, 1fr));
          }
        }
        @media (max-width: 860px) {
          .landing-navactions .landing-button-primary {
            display: none;
          }
        }
        @media (max-width: 768px) {
          .landing-shell {
            padding: 0 16px 84px;
          }
          .landing-hero {
            padding-top: 44px;
            padding-bottom: 110px;
          }
          .landing-section {
            padding: 110px 0;
          }
          .landing-hero-title {
            font-size: clamp(3.2rem, 14vw, 4.9rem);
          }
          .landing-hero-copy,
          .landing-section-copy,
          .landing-demo-copy {
            font-size: 16px;
          }
          .landing-cta-row {
            flex-direction: column;
            align-items: stretch;
          }
          .landing-button {
            width: 100%;
          }
          .landing-mock-toprow,
          .landing-boss-panel,
          .landing-project-card {
            grid-template-columns: minmax(0, 1fr);
          }
          .landing-boss-avatar,
          .landing-project-thumb {
            width: 72px;
            height: 72px;
          }
          .landing-boss-metrics,
          .landing-project-proof {
            grid-template-columns: minmax(0, 1fr);
          }
          .landing-compare-grid {
            grid-template-columns: 1.2fr repeat(5, minmax(48px, 1fr));
            font-size: 12px;
          }
          .landing-compare-label {
            padding: 12px 10px;
          }
          .landing-compare-cell {
            height: 46px;
          }
        }
      `}</style>

      <div className="pathai-landing">
        <AtmosphericBackdrop variant="landing" />

        <div className="landing-shell safe-top-shell">
          <nav className={`landing-nav ${scrolled ? 'is-scrolled' : ''}`}>
            <div className="landing-navbarline">
              <Link href="/" className="landing-brand" aria-label="PathAI home">
                <div className="landing-brandmark">
                  <IconGlyph name="bolt" size={20} strokeWidth={2.6} color="#061017" />
                </div>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.04em' }}>PathAI</div>
                  <div style={{ fontSize: 12, color: 'rgba(240,240,240,0.42)' }}>Adaptive learning that finishes.</div>
                </div>
              </Link>

              <div className="landing-navlinks">
                {NAV_LINKS.map((item) => (
                  <NavItem className="landing-navlink" href={item.href} key={item.label}>
                    {item.label}
                  </NavItem>
                ))}
              </div>

              <div className="landing-navactions">
                <Link href="/login" className="landing-navlink landing-navlink-login">Login</Link>
                <CTAButton href="/login">Start Learning</CTAButton>
                <button
                  type="button"
                  className="landing-menu-button interactive-secondary"
                  onClick={() => setMenuOpen((value) => !value)}
                  aria-label="Toggle menu"
                >
                  <Menu size={18} />
                </button>
              </div>
            </div>

            <div className="landing-mobile-menu">
              {NAV_LINKS.map((item) => (
                <NavItem href={item.href} key={item.label} onClick={() => setMenuOpen(false)}>
                  {item.label}
                </NavItem>
              ))}
              <a href="/login">Login</a>
              <div style={{ marginTop: 10 }}>
                <CTAButton href="/login">Start Learning</CTAButton>
              </div>
            </div>
          </nav>

          <section className="landing-hero">
            <div className="landing-hero-grid">
              <ScrollReveal distance={0}>
                <div className="landing-eyebrow">Daily missions for any skill</div>
                <h1 className="font-display landing-hero-title">
                  Stop collecting tutorials. Start proving you can build.
                </h1>
                <p className="landing-hero-copy">
                  PathAI turns your learning goal into a daily mission system that adapts to you, challenges you,
                  and proves what you can do.
                </p>
                <div className="landing-cta-row">
                  <CTAButton href="/demo" icon={<Play size={16} strokeWidth={2.4} />}>
                    Try a Free Lesson
                  </CTAButton>
                  <CTAButton href="#how-it-works" secondary icon={<ArrowRight size={16} strokeWidth={2.4} />}>
                    See How It Works
                  </CTAButton>
                </div>
                <div className="landing-hero-meta">
                  <div>
                    <strong>4 task types per day</strong>
                    <span>Teach, apply, recall, reflect</span>
                  </div>
                  <div>
                    <strong>Proof built in</strong>
                    <span>Projects, bosses, and verification</span>
                  </div>
                  <div>
                    <strong>Any serious skill</strong>
                    <span>Coding, ML, language, design, and beyond</span>
                  </div>
                </div>
              </ScrollReveal>

              <ScrollReveal className="landing-hero-shot" delay={120}>
                <motion.div
                  initial={reduceMotion ? false : { y: 18, opacity: 0 }}
                  animate={reduceMotion ? { opacity: 1 } : { y: 0, opacity: 1 }}
                  transition={{ duration: reduceMotion ? 0 : 0.8, ease: [0.16, 1, 0.3, 1] }}
                  style={{ transformStyle: 'preserve-3d' }}
                >
                  <DashboardMock hero />
                </motion.div>
              </ScrollReveal>
            </div>
          </section>

          <section className="landing-proofbar">
            <div className="landing-proofwrap">
              <div className="landing-marquee">
                {trustItems.map((item, index) => (
                  <div className="landing-trustitem" key={`${item}-${index}`}>
                    <Star size={14} strokeWidth={2.2} color="#00e5c7" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>

        <section className="landing-section landing-problem" id="features">
          <div className="landing-shell">
            <SectionHeading
              eyebrow="The problem"
              title="Tutorial hell is real."
              body="Watching more content rarely fixes the deeper problem. Most learning systems fail at retention, momentum, and proof."
              align="center"
            />

            <div className="landing-problem-grid">
              {PROBLEMS.map((item, index) => (
                <ScrollReveal key={item.title} delay={index * 80}>
                  <div className="landing-problem-card">
                    <div className="landing-problem-icon">
                      <IconGlyph name={item.icon} size={22} strokeWidth={2.2} color="#0b766c" />
                    </div>
                    <div className="landing-problem-title">{item.title}</div>
                    <div className="landing-problem-copy">{item.description}</div>
                  </div>
                </ScrollReveal>
              ))}
            </div>

            <ScrollReveal delay={220}>
              <div className="landing-transition-line">PathAI fixes all three.</div>
            </ScrollReveal>
          </div>
        </section>

        <section className="landing-section" id="how-it-works">
          <div className="landing-shell">
            <SectionHeading
              eyebrow="How it works"
              title="From goal to proof in four steps."
              body="The route starts with clarity, compounds through daily missions, and finishes in visible skill evidence."
              align="center"
            />

            <div className="landing-how-grid">
              {HOW_STEPS.map((item, index) => (
                <ScrollReveal key={item.title} delay={index * 80}>
                  <HoverDepthCard accent={index % 2 === 0 ? 'rgba(0,229,199,0.14)' : 'rgba(126,160,255,0.14)'} style={{ height: '100%' }}>
                    <div className="landing-step-card">
                      <div className="landing-step-index">0{index + 1}</div>
                      <div className="landing-step-icon">
                        <IconGlyph name={item.icon} size={22} strokeWidth={2.3} color="#f0f0f0" />
                      </div>
                      <div className="landing-step-title">{item.title}</div>
                      <div className="landing-step-copy">{item.body}</div>
                      <MiniStepMock mode={item.mock} />
                    </div>
                  </HoverDepthCard>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>

        <section className="landing-section">
          <div className="landing-shell">
            <SectionHeading
              eyebrow="Feature showcase"
              title="The learning system, not just the lesson."
              body="PathAI is designed like a consumer product with educational depth underneath it. The route, the loop, and the proof all matter."
            />

            <div className="landing-showcase">
              {SHOWCASE.map((item, index) => (
                <div className={`landing-showcase-row ${index % 2 === 1 ? 'reverse' : ''}`} key={item.title}>
                  <ScrollReveal className="landing-showcase-copy" delay={40}>
                    <div className="landing-showcase-kicker">Core system {String(index + 1).padStart(2, '0')}</div>
                    <h3 className="font-display landing-showcase-title" style={{ marginTop: 16 }}>{item.title}</h3>
                    <p>{item.description}</p>
                  </ScrollReveal>
                  <ScrollReveal delay={120}>
                    <FeatureVisual mode={item.mode} />
                  </ScrollReveal>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="landing-section landing-demo">
          <div className="landing-shell">
            <SectionHeading
              eyebrow="Interactive demo"
              title="Try it right now. No signup required."
              body="Experience a real PathAI lesson in three minutes."
              align="center"
            />
            <ScrollReveal delay={120}>
              <div className="landing-cta-row" style={{ justifyContent: 'center', marginTop: 30 }}>
                <CTAButton href="/demo" icon={<ArrowRight size={16} strokeWidth={2.5} />}>
                  Start Free Demo
                </CTAButton>
              </div>
              <div className="landing-demo-note">No credit card. No account. Just learn.</div>
            </ScrollReveal>
          </div>
        </section>

        <section className="landing-section" id="pricing">
          <div className="landing-shell">
            <SectionHeading
              eyebrow="Comparison"
              title="PathAI vs. the alternatives"
              body="Most platforms solve one piece of the problem. PathAI combines adaptive sequencing, momentum, and proof."
              align="center"
            />

            <ScrollReveal>
              <PremiumFrame accent="rgba(0,229,199,0.14)" className="landing-comparison-card">
                <div className="landing-compare-grid">
                  <div className="landing-compare-head">
                    <div className="landing-compare-label">Capability</div>
                    {['PathAI', 'YouTube', 'Coursera', 'Duolingo', 'Brilliant'].map((item) => (
                      <div className="landing-compare-label" key={item}>{item}</div>
                    ))}
                  </div>

                  {COMPARISON_ROWS.map((row) => (
                    <div className="landing-compare-row" key={row.label}>
                      <div className="landing-compare-label">{row.label}</div>
                      {row.values.map((value, index) => (
                        <ComparisonCell key={`${row.label}-${index}`} value={value} />
                      ))}
                    </div>
                  ))}
                </div>
              </PremiumFrame>
            </ScrollReveal>
          </div>
        </section>

        <section className="landing-section landing-final">
          <div className="landing-shell">
            <ScrollReveal>
              <PremiumFrame accent="rgba(0,229,199,0.16)" className="landing-final-card">
                <div className="landing-eyebrow" style={{ margin: '0 auto 20px' }}>Start now</div>
                <h2 className="font-display landing-section-title" style={{ maxWidth: 720, margin: '0 auto' }}>
                  Your learning path starts here.
                </h2>
                <p className="landing-demo-copy">
                  Free forever tier. Premium unlocks unlimited AI tutoring, boss battles, and verified projects.
                </p>
                <div className="landing-cta-row" style={{ justifyContent: 'center', marginTop: 30 }}>
                  <CTAButton href="/login" icon={<ArrowRight size={16} strokeWidth={2.4} />}>
                    Start Learning Free
                  </CTAButton>
                </div>
              </PremiumFrame>
            </ScrollReveal>

            <footer className="landing-footer">
              <div className="landing-footer-top">
                <div className="landing-brand">
                  <div className="landing-brandmark">
                    <IconGlyph name="bolt" size={18} strokeWidth={2.5} color="#061017" />
                  </div>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.04em' }}>PathAI</div>
                    <div style={{ fontSize: 12, color: 'rgba(240,240,240,0.42)' }}>Adaptive learning that actually finishes.</div>
                  </div>
                </div>

                <div className="landing-footer-links">
                  <a href="#features">Features</a>
                  <Link href="/pricing">Pricing</Link>
                  <Link href="/demo">Demo</Link>
                  <Link href="/login">Contact</Link>
                </div>

                <div className="landing-footer-socials">
                  <a href="https://twitter.com" aria-label="PathAI on Twitter"><Twitter size={16} /></a>
                  <a href="https://github.com" aria-label="PathAI on GitHub"><Github size={16} /></a>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                <div className="landing-footer-note">
                  <IconGlyph name="sparkles" size={14} strokeWidth={2.2} color="#00e5c7" />
                  Built solo by a high school developer
                </div>
                <div style={{ color: 'rgba(240,240,240,0.38)', fontSize: 13 }}>PathAI © 2026</div>
              </div>
            </footer>
          </div>
        </section>
      </div>
    </>
  )
}
