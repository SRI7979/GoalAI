'use client'

import { useState } from 'react'
import Link from 'next/link'

const pathNodes = [
  {
    id: 'writing',
    title: 'Prompting the System',
    state: 'active',
    top: 250,
    left: 53,
    accent: '#0ef5c2',
    labelSide: 'right',
  },
  {
    id: 'sequencing',
    title: 'Context Windows',
    state: 'locked',
    top: 430,
    left: 48,
    accent: '#263c3b',
    labelSide: 'right',
  },
  {
    id: 'patterns',
    title: 'Reasoning Loops',
    state: 'locked',
    top: 610,
    left: 54,
    accent: '#263c3b',
    labelSide: 'right',
  },
]

const shopItems = [
  { name: 'Signal Boost', cost: 120, detail: 'Double mission XP for the next focus sprint.', tone: 'teal' },
  { name: 'Hint Pack', cost: 80, detail: 'Reveal one nudge without breaking your streak.', tone: 'gold' },
  { name: 'Theme Shard', cost: 200, detail: 'Unlock a cosmetic glow for your path nodes.', tone: 'blue' },
]

const statItems = [
  { label: 'Mastery', value: '42%', detail: '+8% this week' },
  { label: 'Streak', value: '7d', detail: '3 missions today' },
  { label: 'Proofs', value: '18', detail: '5 strong submissions' },
  { label: 'Focus', value: '91%', detail: 'reasoning signal' },
]

const settingItems = [
  { label: 'Focus Mode', detail: 'Hide extra panels during missions.', enabled: true },
  { label: 'Auto Hints', detail: 'Offer nudges after two misses.', enabled: true },
  { label: 'Motion FX', detail: 'Keep soft node animations on.', enabled: false },
]

function IconHome() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 11.5 12 5l8 6.5V20h-5v-5H9v5H4v-8.5z" />
    </svg>
  )
}

function IconCourses() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="5" y="4" width="14" height="16" rx="2" />
      <path d="M9 4v5l3-2 3 2V4" />
    </svg>
  )
}

function IconShop() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 8h12l-1 12H7L6 8z" />
      <path d="M9 8a3 3 0 0 1 6 0" />
    </svg>
  )
}

function IconStats() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 19V9M12 19V5M19 19v-7" />
    </svg>
  )
}

function IconSettings() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M19 12a7 7 0 0 0-.1-1.1l2-1.5-2-3.4-2.4 1a7.6 7.6 0 0 0-1.9-1.1L14.3 3h-4.6l-.4 2.9A7.6 7.6 0 0 0 7.4 7l-2.4-1-2 3.4 2 1.5A7 7 0 0 0 5 12c0 .4 0 .8.1 1.1l-2 1.5 2 3.4 2.4-1c.6.5 1.2.8 1.9 1.1l.4 2.9h4.6l.4-2.9c.7-.3 1.3-.6 1.9-1.1l2.4 1 2-3.4-2-1.5c.1-.3.1-.7.1-1.1z" />
    </svg>
  )
}

function IconBolt() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M13 2 4 14h7l-1 8 10-13h-7l0-7z" />
    </svg>
  )
}

function IconMenu() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  )
}

function GemShape() {
  return (
    <span className="pathview-gem" aria-hidden="true">
      <span />
    </span>
  )
}

function CourseArt() {
  return (
    <div className="pathview-course-art" aria-hidden="true">
      <div className="pathview-art-card pathview-art-card--gold">
        <span />
      </div>
      <div className="pathview-art-card pathview-art-card--violet">
        <span />
      </div>
      <div className="pathview-art-play" />
      <div className="pathview-art-card pathview-art-card--small">
        <span />
      </div>
      <div className="pathview-hand">
        <i />
        <i />
        <i />
      </div>
    </div>
  )
}

function CommandCenter({ onOpen }) {
  return (
    <section className="pathview-command" aria-label="PathAI placeholder command center">
      <div className="pathview-command-head">
        <div>
          <p>Command Center</p>
          <h2>Prototype panels</h2>
        </div>
        <span>UI only</span>
      </div>

      <div className="pathview-command-grid">
        <article className="pathview-panel pathview-shop" id="shop">
          <div className="pathview-panel-title">
            <IconShop />
            <div>
              <p>Gem Shop</p>
              <h3>Spend your signal gems</h3>
            </div>
          </div>
          <button className="pathview-panel-jump" type="button" onClick={() => onOpen('shop')}>Open Shop</button>
          <div className="pathview-gem-bank">
            <GemShape />
            <strong>320</strong>
            <span>available gems</span>
          </div>
          <div className="pathview-shop-list">
            {shopItems.map((item) => (
              <div className={`pathview-shop-item pathview-shop-item--${item.tone}`} key={item.name}>
                <div>
                  <strong>{item.name}</strong>
                  <span>{item.detail}</span>
                </div>
                <button type="button">{item.cost}</button>
              </div>
            ))}
          </div>
        </article>

        <article className="pathview-panel" id="stats">
          <div className="pathview-panel-title">
            <IconStats />
            <div>
              <p>Stats</p>
              <h3>Learning signal</h3>
            </div>
          </div>
          <button className="pathview-panel-jump" type="button" onClick={() => onOpen('stats')}>Open Stats</button>
          <div className="pathview-stat-grid">
            {statItems.map((item) => (
              <div className="pathview-stat-tile" key={item.label}>
                <p>{item.label}</p>
                <strong>{item.value}</strong>
                <span>{item.detail}</span>
              </div>
            ))}
          </div>
          <div className="pathview-signal-meter">
            <span />
          </div>
        </article>

        <article className="pathview-panel" id="settings">
          <div className="pathview-panel-title">
            <IconSettings />
            <div>
              <p>Settings</p>
              <h3>Mission preferences</h3>
            </div>
          </div>
          <button className="pathview-panel-jump" type="button" onClick={() => onOpen('settings')}>Open Settings</button>
          <div className="pathview-settings-list">
            {settingItems.map((item) => (
              <div className="pathview-setting-row" key={item.label}>
                <div>
                  <strong>{item.label}</strong>
                  <span>{item.detail}</span>
                </div>
                <button className={item.enabled ? 'is-on' : ''} type="button" aria-label={`${item.label} placeholder toggle`}>
                  <span />
                </button>
              </div>
            ))}
          </div>
        </article>
      </div>
    </section>
  )
}

function PremiumKey() {
  return (
    <div className="pathview-premium-key" aria-hidden="true">
      <div className="pathview-key-head" />
      <div className="pathview-key-body" />
      <div className="pathview-key-tooth" />
    </div>
  )
}

function PathMascot() {
  return (
    <div className="pathview-guide" aria-label="PathAI guide">
      <div className="pathview-guide-core">
        <span />
      </div>
      <div className="pathview-guide-chip">Next best step</div>
    </div>
  )
}

function DiscNode({ node }) {
  const style = {
    '--node-top': `${node.top}px`,
    '--node-left': `${node.left}%`,
    '--node-accent': node.accent,
  }
  const classes = `pathview-node ${node.state === 'active' ? 'is-active' : 'is-locked'} pathview-node--${node.labelSide}`

  return (
    <div className={classes} style={style}>
      {node.state === 'active' && <PathMascot />}
      <div className="pathview-node-disc">
        <div className="pathview-node-face">
          {node.state === 'active' ? <span className="pathview-face-glint" /> : <span className="pathview-lock-ring" />}
        </div>
      </div>
      <p>{node.title}</p>
    </div>
  )
}

function ShopPage({ gemBalance, ownedItems, onBuy, toast }) {
  return (
    <section className="pathview-page-panel" aria-label="PathAI gem shop placeholder page">
      <div className="pathview-page-hero">
        <div>
          <p>Gem Shop</p>
          <h1>Boost the next mission</h1>
          <span>Placeholder purchases update the UI only.</span>
        </div>
        <div className="pathview-page-balance">
          <GemShape />
          <strong>{gemBalance}</strong>
          <span>gems</span>
        </div>
      </div>

      {toast && <div className="pathview-toast">{toast}</div>}

      <div className="pathview-shop-page-grid">
        {shopItems.map((item) => {
          const owned = ownedItems.includes(item.name)
          return (
            <article className={`pathview-shop-card pathview-shop-card--${item.tone} ${owned ? 'is-owned' : ''}`} key={item.name}>
              <div className="pathview-shop-card-art">
                <GemShape />
              </div>
              <p>{item.tone === 'gold' ? 'Support' : item.tone === 'blue' ? 'Cosmetic' : 'Boost'}</p>
              <h2>{item.name}</h2>
              <span>{item.detail}</span>
              <button type="button" onClick={() => onBuy(item)}>
                {owned ? 'Owned' : `${item.cost} gems`}
              </button>
            </article>
          )
        })}
      </div>
    </section>
  )
}

function StatsPage() {
  const weeklyBars = [62, 78, 54, 88, 70, 91, 76]
  const skills = [
    { label: 'Prompt Design', value: 72 },
    { label: 'Debugging Loops', value: 48 },
    { label: 'Context Control', value: 64 },
    { label: 'Proof Quality', value: 83 },
  ]

  return (
    <section className="pathview-page-panel" aria-label="PathAI stats placeholder page">
      <div className="pathview-page-hero">
        <div>
          <p>Stats</p>
          <h1>Your learning signal</h1>
          <span>Static placeholder analytics for the prototype.</span>
        </div>
        <div className="pathview-score-ring">
          <strong>91</strong>
          <span>focus</span>
        </div>
      </div>

      <div className="pathview-stat-grid pathview-stat-grid--wide">
        {statItems.map((item) => (
          <div className="pathview-stat-tile" key={item.label}>
            <p>{item.label}</p>
            <strong>{item.value}</strong>
            <span>{item.detail}</span>
          </div>
        ))}
      </div>

      <div className="pathview-analytics-grid">
        <article className="pathview-panel">
          <div className="pathview-panel-title">
            <IconStats />
            <div>
              <p>Weekly Flow</p>
              <h3>Mission rhythm</h3>
            </div>
          </div>
          <div className="pathview-chart">
            {weeklyBars.map((bar, index) => (
              <span key={index} style={{ '--bar-height': `${bar}%` }} />
            ))}
          </div>
        </article>

        <article className="pathview-panel">
          <div className="pathview-panel-title">
            <IconBolt />
            <div>
              <p>Skill Signal</p>
              <h3>Mastery by area</h3>
            </div>
          </div>
          <div className="pathview-skill-list">
            {skills.map((skill) => (
              <div className="pathview-skill-row" key={skill.label}>
                <div>
                  <strong>{skill.label}</strong>
                  <span>{skill.value}%</span>
                </div>
                <div className="pathview-skill-meter">
                  <span style={{ width: `${skill.value}%` }} />
                </div>
              </div>
            ))}
          </div>
        </article>
      </div>
    </section>
  )
}

function SettingsPage({ settings, onToggle }) {
  return (
    <section className="pathview-page-panel" aria-label="PathAI settings placeholder page">
      <div className="pathview-page-hero">
        <div>
          <p>Settings</p>
          <h1>Mission preferences</h1>
          <span>These toggles are local UI state for the placeholder.</span>
        </div>
      </div>

      <div className="pathview-settings-page">
        {settingItems.map((item) => {
          const enabled = Boolean(settings[item.label])
          return (
            <article className="pathview-setting-card" key={item.label}>
              <div>
                <p>{enabled ? 'Enabled' : 'Paused'}</p>
                <h2>{item.label}</h2>
                <span>{item.detail}</span>
              </div>
              <button className={enabled ? 'is-on' : ''} type="button" onClick={() => onToggle(item.label)}>
                <span />
              </button>
            </article>
          )
        })}
      </div>
    </section>
  )
}

export default function PathViewPage() {
  const [activePage, setActivePage] = useState('path')
  const [gemBalance, setGemBalance] = useState(320)
  const [ownedItems, setOwnedItems] = useState([])
  const [toast, setToast] = useState('')
  const [settings, setSettings] = useState(() => (
    settingItems.reduce((acc, item) => ({ ...acc, [item.label]: item.enabled }), {})
  ))

  function openPage(page) {
    setActivePage(page)
    setToast('')
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function buyItem(item) {
    if (ownedItems.includes(item.name)) {
      setToast(`${item.name} is already in your prototype inventory.`)
      return
    }
    if (gemBalance < item.cost) {
      setToast(`Not enough gems for ${item.name}.`)
      return
    }
    setGemBalance((balance) => balance - item.cost)
    setOwnedItems((items) => [...items, item.name])
    setToast(`${item.name} added to your prototype inventory.`)
  }

  function toggleSetting(label) {
    setSettings((current) => ({ ...current, [label]: !current[label] }))
  }

  return (
    <main className="pathview-page">
      <style>{`
        .pathview-page {
          min-height: 100vh;
          background:
            radial-gradient(circle at 52% 100%, rgba(14, 245, 194, 0.18), transparent 24%),
            radial-gradient(circle at 78% 78%, rgba(0, 212, 255, 0.1), transparent 15%),
            #101010;
          color: #f5f5f5;
          font-family: var(--font-display), 'DM Sans', system-ui, sans-serif;
          overflow-x: hidden;
        }

        .pathview-page svg {
          width: 20px;
          height: 20px;
          fill: none;
          stroke: currentColor;
          stroke-width: 2.4;
          stroke-linecap: round;
          stroke-linejoin: round;
        }

        .pathview-page button {
          transform: translateY(0);
          transition:
            transform 90ms ease,
            filter 90ms ease,
            box-shadow 90ms ease,
            background 90ms ease,
            border-color 90ms ease;
          -webkit-tap-highlight-color: transparent;
        }

        .pathview-page button:active {
          transform: translateY(4px);
          filter: brightness(0.78) saturate(0.95);
        }

        .pathview-tab:active,
        .pathview-setting-row button:active,
        .pathview-setting-card button:active {
          transform: translateY(2px);
        }

        .pathview-nav {
          position: sticky;
          top: 0;
          z-index: 20;
          height: 76px;
          border-bottom: 1px solid #343434;
          background: #191919;
        }

        .pathview-nav-inner {
          width: min(1480px, calc(100% - 40px));
          height: 100%;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
        }

        .pathview-brand-row {
          display: flex;
          align-items: center;
          gap: 46px;
          min-width: 0;
        }

        .pathview-brand {
          color: #f5f5f5;
          text-decoration: none;
          font-size: 34px;
          font-weight: 900;
          line-height: 1;
        }

        .pathview-tabs {
          display: flex;
          align-items: stretch;
          gap: 38px;
          height: 76px;
        }

        .pathview-tab {
          position: relative;
          display: inline-flex;
          align-items: center;
          gap: 10px;
          border: 0;
          background: transparent;
          color: #9b9b9b;
          font-family: inherit;
          text-decoration: none;
          font-size: 17px;
          font-weight: 800;
          cursor: pointer;
        }

        .pathview-tab.is-active {
          color: #f5f5f5;
        }

        .pathview-tab.is-active::after {
          content: '';
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          height: 3px;
          border-radius: 8px 8px 0 0;
          background: #f5f5f5;
        }

        .pathview-tab svg {
          width: 18px;
          height: 18px;
        }

        .pathview-nav-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .pathview-premium,
        .pathview-token,
        .pathview-menu {
          min-height: 54px;
          border-radius: 8px;
          border: 2px solid #3a3a3a;
          background: transparent;
          color: #f5f5f5;
          font-family: inherit;
          font-size: 16px;
          font-weight: 900;
          cursor: pointer;
        }

        .pathview-premium {
          padding: 0 21px;
          border-color: #0ef5c2;
          box-shadow: 0 5px 0 rgba(0, 0, 0, 0.28), inset -2px 0 0 #00d4ff;
        }

        .pathview-token {
          min-width: 98px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          box-shadow: 0 5px 0 rgba(0, 0, 0, 0.28);
        }

        .pathview-token strong {
          font-size: 23px;
          line-height: 1;
        }

        .pathview-token--key {
          color: #ffd12f;
        }

        .pathview-token--energy {
          color: #7a7a7a;
        }

        .pathview-menu {
          width: 58px;
          border-color: transparent;
          display: grid;
          place-items: center;
          box-shadow: none;
        }

        .pathview-promo {
          height: 58px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 18px;
          border-bottom: 1px solid #1f1f1f;
          background: #151515;
          color: #f5f5f5;
          font-size: 19px;
          font-weight: 900;
        }

        .pathview-promo button {
          padding: 0;
          border: 0;
          background: transparent;
          color: #f5f5f5;
          font: inherit;
          cursor: pointer;
          border-bottom: 2px solid #d6c25c;
          line-height: 1.2;
        }

        .pathview-premium-key {
          position: relative;
          width: 58px;
          height: 34px;
          transform: rotate(4deg);
          filter: drop-shadow(0 0 16px rgba(14, 245, 194, 0.42));
        }

        .pathview-key-head {
          position: absolute;
          left: 2px;
          top: 5px;
          width: 27px;
          height: 24px;
          border-radius: 8px;
          border: 7px solid #ffc84a;
          background: #191919;
        }

        .pathview-key-body {
          position: absolute;
          left: 26px;
          top: 13px;
          width: 29px;
          height: 9px;
          border-radius: 8px;
          background: linear-gradient(90deg, #ffc84a, #0ef5c2);
        }

        .pathview-key-tooth {
          position: absolute;
          right: 2px;
          top: 21px;
          width: 9px;
          height: 9px;
          border-radius: 4px;
          background: #0ef5c2;
        }

        .pathview-workspace {
          position: relative;
          width: min(1280px, calc(100% - 48px));
          min-height: calc(100vh - 134px);
          margin: 0 auto;
          padding: 72px 0 190px;
        }

        .pathview-course-card {
          position: absolute;
          left: 0;
          top: 74px;
          width: 590px;
          min-height: 396px;
          border: 2px solid #3b3b3b;
          border-radius: 8px;
          background: #151515;
          padding: 42px 38px 34px;
        }

        .pathview-course-art {
          position: relative;
          width: 126px;
          height: 114px;
          margin: 0 0 22px 2px;
        }

        .pathview-art-card {
          position: absolute;
          border-radius: 5px;
          box-shadow: inset 0 -6px 0 rgba(0, 0, 0, 0.12);
        }

        .pathview-art-card span {
          position: absolute;
          left: 12px;
          right: 14px;
          top: 11px;
          height: 6px;
          border-radius: 4px;
          background: rgba(0, 0, 0, 0.18);
        }

        .pathview-art-card--gold {
          left: 8px;
          top: 0;
          width: 104px;
          height: 34px;
          background: #f6ca36;
        }

        .pathview-art-card--violet {
          left: 16px;
          top: 35px;
          width: 92px;
          height: 39px;
          transform: rotate(-6deg);
          background: #0ef5c2;
        }

        .pathview-art-card--small {
          left: 44px;
          top: 73px;
          width: 68px;
          height: 36px;
          background: #00d4ff;
        }

        .pathview-art-card--small::after {
          content: '';
          position: absolute;
          left: 22px;
          top: 0;
          width: 14px;
          height: 36px;
          background: rgba(255, 255, 255, 0.5);
        }

        .pathview-art-play {
          position: absolute;
          left: 8px;
          top: 74px;
          width: 34px;
          height: 34px;
          border-radius: 5px;
          background: #2f2f2f;
        }

        .pathview-art-play::after {
          content: '';
          position: absolute;
          left: 13px;
          top: 9px;
          border-left: 12px solid #f5f5f5;
          border-top: 8px solid transparent;
          border-bottom: 8px solid transparent;
        }

        .pathview-hand {
          position: absolute;
          left: 77px;
          top: 41px;
          width: 24px;
          height: 30px;
          border-radius: 12px;
          background: #f5f5f5;
          transform: rotate(-19deg);
          box-shadow: 0 4px 0 rgba(0, 0, 0, 0.18);
        }

        .pathview-hand i {
          position: absolute;
          top: -8px;
          width: 7px;
          height: 18px;
          border-radius: 8px;
          background: #f5f5f5;
        }

        .pathview-hand i:nth-child(1) {
          left: 0;
        }

        .pathview-hand i:nth-child(2) {
          left: 7px;
          top: -12px;
        }

        .pathview-hand i:nth-child(3) {
          left: 14px;
          top: -9px;
        }

        .pathview-course-card h1 {
          margin: 0 0 20px;
          color: #f5f5f5;
          font-size: 32px;
          font-weight: 900;
          line-height: 1.08;
        }

        .pathview-course-card p {
          width: min(450px, 100%);
          margin: 0;
          color: #9b9b9b;
          font-size: 19px;
          font-weight: 800;
          line-height: 1.48;
        }

        .pathview-card-stats {
          display: flex;
          align-items: center;
          gap: 28px;
          margin-top: 34px;
          color: #f5f5f5;
          font-size: 17px;
          font-weight: 900;
        }

        .pathview-card-stat {
          display: inline-flex;
          align-items: center;
          gap: 10px;
        }

        .pathview-card-stat svg {
          width: 20px;
          height: 20px;
        }

        .pathview-command {
          position: relative;
          z-index: 8;
          width: min(1280px, calc(100% - 48px));
          margin: -96px auto 240px;
        }

        .pathview-command-head {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 18px;
          margin-bottom: 18px;
        }

        .pathview-command-head p,
        .pathview-panel-title p,
        .pathview-stat-tile p {
          margin: 0;
          color: #0ef5c2;
          font-size: 12px;
          font-weight: 900;
          line-height: 1.1;
          text-transform: uppercase;
        }

        .pathview-command-head h2 {
          margin: 7px 0 0;
          color: #f5f5f5;
          font-size: 28px;
          font-weight: 900;
          line-height: 1.05;
        }

        .pathview-command-head > span {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 34px;
          padding: 0 12px;
          border: 1px solid rgba(14, 245, 194, 0.28);
          border-radius: 8px;
          background: rgba(14, 245, 194, 0.08);
          color: #b8fff1;
          font-size: 12px;
          font-weight: 900;
        }

        .pathview-command-grid {
          display: grid;
          grid-template-columns: 1.16fr 0.92fr 0.92fr;
          gap: 16px;
        }

        .pathview-panel {
          position: relative;
          border: 2px solid #303d3a;
          border-radius: 8px;
          background:
            linear-gradient(180deg, rgba(14, 245, 194, 0.045), rgba(255, 255, 255, 0.015)),
            #151817;
          padding: 20px;
          box-shadow: 0 24px 60px rgba(0, 0, 0, 0.24);
        }

        .pathview-panel-title {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
        }

        .pathview-panel-title svg {
          width: 24px;
          height: 24px;
          color: #0ef5c2;
        }

        .pathview-panel-title h3 {
          margin: 4px 0 0;
          color: #f5f5f5;
          font-size: 19px;
          font-weight: 900;
          line-height: 1.1;
        }

        .pathview-panel-jump {
          position: absolute;
          top: 18px;
          right: 18px;
          min-height: 34px;
          padding: 0 12px;
          border: 1px solid rgba(14, 245, 194, 0.24);
          border-radius: 8px;
          background: rgba(14, 245, 194, 0.08);
          color: #b8fff1;
          font-family: inherit;
          font-size: 12px;
          font-weight: 900;
          cursor: pointer;
          box-shadow: 0 4px 0 rgba(0, 0, 0, 0.22);
        }

        .pathview-gem-bank {
          display: flex;
          align-items: center;
          gap: 12px;
          min-height: 58px;
          margin-bottom: 14px;
          padding: 13px 14px;
          border: 1px solid rgba(255, 209, 47, 0.24);
          border-radius: 8px;
          background: rgba(255, 209, 47, 0.08);
        }

        .pathview-gem {
          position: relative;
          width: 34px;
          height: 34px;
          flex: 0 0 auto;
          border-radius: 8px;
          background: linear-gradient(145deg, #fff2a8, #ffd12f 48%, #0ef5c2);
          transform: rotate(45deg);
          box-shadow: 0 0 24px rgba(255, 209, 47, 0.26);
        }

        .pathview-gem span {
          position: absolute;
          inset: 9px;
          border-radius: 4px;
          background: rgba(255, 255, 255, 0.42);
        }

        .pathview-gem-bank strong {
          color: #ffd12f;
          font-size: 26px;
          font-weight: 900;
          line-height: 1;
        }

        .pathview-gem-bank span:last-child {
          color: #aebbb8;
          font-size: 13px;
          font-weight: 800;
        }

        .pathview-shop-list,
        .pathview-settings-list {
          display: grid;
          gap: 10px;
        }

        .pathview-shop-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          min-height: 74px;
          padding: 13px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.035);
        }

        .pathview-shop-item strong,
        .pathview-setting-row strong {
          display: block;
          color: #f5f5f5;
          font-size: 15px;
          font-weight: 900;
          line-height: 1.15;
        }

        .pathview-shop-item span,
        .pathview-setting-row span,
        .pathview-stat-tile span {
          display: block;
          margin-top: 5px;
          color: #91a19d;
          font-size: 12px;
          font-weight: 800;
          line-height: 1.35;
        }

        .pathview-shop-item button {
          min-width: 66px;
          min-height: 38px;
          border: 0;
          border-radius: 8px;
          background: rgba(14, 245, 194, 0.14);
          color: #b8fff1;
          font-family: inherit;
          font-size: 13px;
          font-weight: 900;
          cursor: pointer;
          box-shadow: 0 4px 0 rgba(0, 0, 0, 0.22);
        }

        .pathview-shop-item--gold button {
          background: rgba(255, 209, 47, 0.16);
          color: #ffd12f;
        }

        .pathview-shop-item--blue button {
          background: rgba(0, 212, 255, 0.13);
          color: #9befff;
        }

        .pathview-stat-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }

        .pathview-stat-tile {
          min-height: 104px;
          padding: 14px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.035);
        }

        .pathview-stat-tile strong {
          display: block;
          margin-top: 10px;
          color: #f5f5f5;
          font-size: 28px;
          font-weight: 900;
          line-height: 1;
        }

        .pathview-signal-meter {
          height: 12px;
          margin-top: 16px;
          border-radius: 8px;
          overflow: hidden;
          background: rgba(255, 255, 255, 0.07);
        }

        .pathview-signal-meter span {
          display: block;
          width: 72%;
          height: 100%;
          border-radius: 8px;
          background: linear-gradient(90deg, #0ef5c2, #00d4ff, #ffd12f);
        }

        .pathview-setting-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          min-height: 76px;
          padding: 13px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.035);
        }

        .pathview-setting-row button {
          position: relative;
          width: 50px;
          height: 28px;
          flex: 0 0 auto;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 8px;
          background: #2b2b2b;
          cursor: pointer;
          box-shadow: 0 4px 0 rgba(0, 0, 0, 0.22);
        }

        .pathview-setting-row button span {
          position: absolute;
          left: 4px;
          top: 4px;
          width: 18px;
          height: 18px;
          margin: 0;
          border-radius: 6px;
          background: #858585;
          transition: none;
        }

        .pathview-setting-row button.is-on {
          border-color: rgba(14, 245, 194, 0.34);
          background: rgba(14, 245, 194, 0.18);
        }

        .pathview-setting-row button.is-on span {
          left: 26px;
          background: #0ef5c2;
          box-shadow: 0 0 14px rgba(14, 245, 194, 0.35);
        }

        .pathview-page-panel {
          width: min(1280px, calc(100% - 48px));
          min-height: calc(100vh - 134px);
          margin: 0 auto;
          padding: 62px 0 170px;
        }

        .pathview-page-hero {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 22px;
          border: 2px solid #303d3a;
          border-radius: 8px;
          background:
            linear-gradient(135deg, rgba(14, 245, 194, 0.12), rgba(0, 212, 255, 0.04)),
            #151817;
          padding: 26px;
          box-shadow: 0 24px 60px rgba(0, 0, 0, 0.24);
        }

        .pathview-page-hero p,
        .pathview-shop-card p,
        .pathview-setting-card p {
          margin: 0;
          color: #0ef5c2;
          font-size: 12px;
          font-weight: 900;
          line-height: 1.1;
          text-transform: uppercase;
        }

        .pathview-page-hero h1 {
          margin: 8px 0 8px;
          color: #f5f5f5;
          font-size: 42px;
          font-weight: 900;
          line-height: 1.02;
        }

        .pathview-page-hero span,
        .pathview-shop-card > span,
        .pathview-setting-card span {
          color: #91a19d;
          font-size: 15px;
          font-weight: 800;
          line-height: 1.45;
        }

        .pathview-page-balance {
          min-width: 182px;
          min-height: 82px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          border: 1px solid rgba(255, 209, 47, 0.25);
          border-radius: 8px;
          background: rgba(255, 209, 47, 0.08);
        }

        .pathview-page-balance strong {
          color: #ffd12f;
          font-size: 30px;
          font-weight: 900;
          line-height: 1;
        }

        .pathview-page-balance > span {
          color: #ffd12f;
          font-size: 13px;
          font-weight: 900;
        }

        .pathview-toast {
          margin-bottom: 16px;
          border: 1px solid rgba(14, 245, 194, 0.32);
          border-radius: 8px;
          background: rgba(14, 245, 194, 0.08);
          color: #b8fff1;
          padding: 14px 16px;
          font-size: 14px;
          font-weight: 900;
        }

        .pathview-shop-page-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 16px;
        }

        .pathview-shop-card,
        .pathview-setting-card {
          border: 2px solid #303d3a;
          border-radius: 8px;
          background:
            linear-gradient(180deg, rgba(14, 245, 194, 0.045), rgba(255, 255, 255, 0.015)),
            #151817;
          padding: 22px;
          box-shadow: 0 24px 60px rgba(0, 0, 0, 0.24);
        }

        .pathview-shop-card-art {
          width: 76px;
          height: 76px;
          display: grid;
          place-items: center;
          margin-bottom: 22px;
          border-radius: 8px;
          background: rgba(14, 245, 194, 0.08);
          border: 1px solid rgba(14, 245, 194, 0.18);
        }

        .pathview-shop-card h2,
        .pathview-setting-card h2 {
          margin: 8px 0 8px;
          color: #f5f5f5;
          font-size: 24px;
          font-weight: 900;
          line-height: 1.06;
        }

        .pathview-shop-card button {
          width: 100%;
          min-height: 50px;
          margin-top: 22px;
          border: 0;
          border-radius: 8px;
          background: linear-gradient(180deg, #20ffd0, #0ec9a1);
          color: #06110f;
          font-family: inherit;
          font-size: 15px;
          font-weight: 900;
          cursor: pointer;
          box-shadow: inset 0 -5px 0 rgba(0, 0, 0, 0.12);
        }

        .pathview-shop-card button:active,
        .pathview-start-button:active {
          box-shadow: inset 0 3px 0 rgba(0, 0, 0, 0.18);
        }

        .pathview-shop-card.is-owned {
          border-color: rgba(255, 209, 47, 0.34);
        }

        .pathview-shop-card.is-owned button {
          background: rgba(255, 209, 47, 0.14);
          color: #ffd12f;
          box-shadow: none;
        }

        .pathview-stat-grid--wide {
          grid-template-columns: repeat(4, minmax(0, 1fr));
          margin-bottom: 16px;
        }

        .pathview-score-ring {
          width: 116px;
          height: 116px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          background:
            radial-gradient(circle at center, #151817 56%, transparent 57%),
            conic-gradient(#0ef5c2 0 91%, rgba(255, 255, 255, 0.12) 91% 100%);
          box-shadow: 0 0 30px rgba(14, 245, 194, 0.18);
        }

        .pathview-score-ring strong {
          color: #f5f5f5;
          font-size: 32px;
          font-weight: 900;
          line-height: 1;
        }

        .pathview-score-ring span {
          margin-top: -28px;
          color: #0ef5c2;
          font-size: 11px;
          font-weight: 900;
          text-transform: uppercase;
        }

        .pathview-analytics-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .pathview-chart {
          height: 210px;
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          align-items: end;
          gap: 10px;
          padding-top: 12px;
        }

        .pathview-chart span {
          display: block;
          height: var(--bar-height);
          min-height: 28px;
          border-radius: 8px 8px 0 0;
          background: linear-gradient(180deg, #0ef5c2, rgba(14, 245, 194, 0.22));
        }

        .pathview-skill-list {
          display: grid;
          gap: 18px;
        }

        .pathview-skill-row > div:first-child {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          margin-bottom: 8px;
        }

        .pathview-skill-row strong {
          color: #f5f5f5;
          font-size: 14px;
          font-weight: 900;
        }

        .pathview-skill-row span {
          color: #0ef5c2;
          font-size: 13px;
          font-weight: 900;
        }

        .pathview-skill-meter {
          height: 12px;
          border-radius: 8px;
          overflow: hidden;
          background: rgba(255, 255, 255, 0.07);
        }

        .pathview-skill-meter span {
          display: block;
          height: 100%;
          border-radius: 8px;
          background: linear-gradient(90deg, #0ef5c2, #00d4ff);
        }

        .pathview-settings-page {
          display: grid;
          gap: 14px;
        }

        .pathview-setting-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
        }

        .pathview-setting-card button {
          position: relative;
          width: 76px;
          height: 42px;
          flex: 0 0 auto;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 8px;
          background: #2b2b2b;
          cursor: pointer;
          box-shadow: 0 4px 0 rgba(0, 0, 0, 0.22);
        }

        .pathview-setting-card button span {
          position: absolute;
          left: 5px;
          top: 5px;
          width: 30px;
          height: 30px;
          border-radius: 8px;
          background: #858585;
        }

        .pathview-setting-card button.is-on {
          border-color: rgba(14, 245, 194, 0.34);
          background: rgba(14, 245, 194, 0.18);
        }

        .pathview-setting-card button.is-on span {
          left: 39px;
          background: #0ef5c2;
          box-shadow: 0 0 14px rgba(14, 245, 194, 0.35);
        }

        .pathview-map {
          position: relative;
          width: min(660px, 54vw);
          min-height: 780px;
          margin-left: auto;
        }

        .pathview-map::before {
          content: '';
          position: absolute;
          top: 120px;
          left: 51%;
          width: 3px;
          height: 555px;
          border-radius: 8px;
          background: linear-gradient(180deg, rgba(14, 245, 194, 0.68), rgba(0, 212, 255, 0.24), rgba(255, 255, 255, 0.08));
          box-shadow: 0 0 24px rgba(14, 245, 194, 0.28);
        }

        .pathview-level {
          position: relative;
          z-index: 2;
          width: 558px;
          max-width: 100%;
          margin: 0 auto;
          border: 2px solid rgba(14, 245, 194, 0.74);
          border-bottom-width: 8px;
          border-radius: 8px;
          padding: 14px 26px 17px;
          text-align: center;
          background: linear-gradient(180deg, rgba(14, 245, 194, 0.04), #111111);
        }

        .pathview-level p {
          margin: 0 0 6px;
          color: #0ef5c2;
          font-size: 14px;
          font-weight: 900;
          line-height: 1;
          text-transform: uppercase;
        }

        .pathview-level h2 {
          margin: 0;
          color: #f5f5f5;
          font-size: 21px;
          font-weight: 900;
          line-height: 1.16;
        }

        .pathview-node {
          position: absolute;
          z-index: 1;
          top: var(--node-top);
          left: var(--node-left);
          display: flex;
          align-items: center;
          gap: 24px;
          transform: translateX(-50%);
          animation: pathview-rise 460ms ease both;
        }

        .pathview-node p {
          width: 190px;
          margin: 0;
          color: #f5f5f5;
          font-size: 20px;
          font-weight: 900;
          line-height: 1.25;
        }

        .pathview-node.is-locked p {
          color: #5e5e5e;
        }

        .pathview-node-disc {
          position: relative;
          width: 146px;
          height: 86px;
          border-radius: 50%;
          background:
            radial-gradient(circle at 50% 36%, rgba(255, 255, 255, 0.85), transparent 26%),
            linear-gradient(180deg, rgba(255, 255, 255, 0.32), transparent 40%),
            var(--node-accent);
          border: 1px solid rgba(255, 255, 255, 0.18);
          box-shadow:
            0 12px 0 rgba(0, 0, 0, 0.32),
            0 28px 34px rgba(0, 0, 0, 0.36),
            inset 0 -14px 0 rgba(0, 0, 0, 0.17);
        }

        .pathview-node-face {
          position: absolute;
          inset: 14px 17px 17px;
          border-radius: 50%;
          background: rgba(230, 255, 251, 0.9);
          box-shadow:
            inset 0 -8px 0 rgba(0, 0, 0, 0.09),
            0 0 28px rgba(14, 245, 194, 0.42);
        }

        .pathview-face-glint {
          position: absolute;
          left: 47%;
          top: 40%;
          width: 8px;
          height: 8px;
          border-radius: 2px;
          background: #0ef5c2;
          box-shadow: 0 0 16px rgba(14, 245, 194, 0.88);
          transform: rotate(45deg);
        }

        .pathview-lock-ring {
          position: absolute;
          left: 50%;
          top: 50%;
          width: 70px;
          height: 38px;
          border: 6px solid rgba(230, 255, 251, 0.78);
          border-radius: 50%;
          opacity: 0.58;
          transform: translate(-50%, -50%);
        }

        .pathview-node.is-active .pathview-node-disc::before {
          content: '';
          position: absolute;
          inset: -13px -18px;
          z-index: -1;
          border-radius: 50%;
          background: #0ef5c2;
          opacity: 0.5;
          filter: blur(1px);
        }

        .pathview-node.is-active .pathview-node-disc {
          animation: pathview-float 2.5s ease-in-out infinite;
          box-shadow:
            0 14px 0 rgba(0, 91, 74, 0.68),
            0 34px 40px rgba(14, 245, 194, 0.28),
            inset 0 -14px 0 rgba(0, 0, 0, 0.17);
        }

        .pathview-guide {
          position: absolute;
          left: 16px;
          top: -72px;
          width: 190px;
          height: 76px;
          z-index: 2;
          animation: pathview-guide-bob 2.5s ease-in-out infinite;
        }

        .pathview-guide-core {
          position: absolute;
          left: 0;
          top: 8px;
          width: 52px;
          height: 52px;
          border-radius: 50%;
          background: radial-gradient(circle at 35% 28%, #eafffb, #0ef5c2 48%, #087b67);
          box-shadow:
            0 0 0 8px rgba(14, 245, 194, 0.12),
            0 12px 26px rgba(14, 245, 194, 0.26),
            inset 0 -8px 0 rgba(0, 0, 0, 0.12);
        }

        .pathview-guide-core span {
          position: absolute;
          left: 19px;
          top: 18px;
          width: 14px;
          height: 14px;
          border-radius: 3px;
          background: #101010;
          box-shadow: 0 0 0 4px rgba(255, 255, 255, 0.74);
        }

        .pathview-guide-chip {
          position: absolute;
          left: 44px;
          top: 14px;
          min-height: 34px;
          display: inline-flex;
          align-items: center;
          padding: 0 14px 0 18px;
          border-radius: 8px;
          background: rgba(14, 245, 194, 0.1);
          border: 1px solid rgba(14, 245, 194, 0.35);
          color: #b8fff1;
          font-size: 12px;
          font-weight: 900;
          white-space: nowrap;
          box-shadow: 0 14px 30px rgba(0, 0, 0, 0.22);
        }

        .pathview-orb {
          position: absolute;
          right: 18px;
          top: 596px;
          width: 84px;
          height: 62px;
          border-radius: 50%;
          background: radial-gradient(circle at 50% 36%, #565656, #222 72%);
          box-shadow: 0 20px 44px rgba(255, 143, 89, 0.22);
        }

        .pathview-orb::before,
        .pathview-orb::after {
          content: '';
          position: absolute;
          width: 23px;
          height: 38px;
          border-radius: 18px;
          background: linear-gradient(180deg, #ffb650, #f67aff);
          transform-origin: bottom center;
        }

        .pathview-orb::before {
          left: 44px;
          top: -31px;
          transform: rotate(42deg);
        }

        .pathview-orb::after {
          left: 23px;
          top: -20px;
          background: linear-gradient(180deg, #00d4ff, #0ef5c2);
          transform: rotate(-48deg);
        }

        .pathview-start-panel {
          position: fixed;
          left: 50%;
          bottom: 38px;
          z-index: 15;
          width: min(552px, calc(100% - 40px));
          transform: translateX(-50%);
          border: 2px solid #3b3b3b;
          border-radius: 8px;
          background: #1c1c1c;
          padding: 34px 22px 24px;
          box-shadow:
            0 36px 90px rgba(14, 245, 194, 0.16),
            0 10px 40px rgba(0, 0, 0, 0.5);
          text-align: center;
        }

        .pathview-start-panel h2 {
          margin: 0 0 10px;
          color: #f5f5f5;
          font-size: 24px;
          font-weight: 900;
          line-height: 1.15;
        }

        .pathview-start-panel p {
          margin: 0 auto 18px;
          max-width: 390px;
          color: #9fb3af;
          font-size: 14px;
          font-weight: 800;
          line-height: 1.45;
        }

        .pathview-xp-pill {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 30px;
          margin-bottom: 18px;
          padding: 0 12px;
          border-radius: 8px;
          background: rgba(255, 209, 47, 0.12);
          border: 1px solid rgba(255, 209, 47, 0.32);
          color: #ffd12f;
          font-size: 12px;
          font-weight: 900;
        }

        .pathview-start-button {
          width: 100%;
          min-height: 60px;
          border: 0;
          border-radius: 8px;
          background: linear-gradient(180deg, #20ffd0, #0ec9a1);
          color: #06110f;
          font-family: inherit;
          font-size: 18px;
          font-weight: 900;
          box-shadow: inset 0 -6px 0 rgba(0, 0, 0, 0.12);
          cursor: pointer;
        }

        @keyframes pathview-rise {
          from { opacity: 0; transform: translateX(-50%) translateY(18px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }

        @keyframes pathview-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-7px); }
        }

        @keyframes pathview-guide-bob {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }

        @media (max-width: 1100px) {
          .pathview-brand-row {
            gap: 24px;
          }

          .pathview-tabs {
            gap: 22px;
          }

          .pathview-token--energy {
            display: none;
          }

          .pathview-workspace {
            min-height: 980px;
            padding-top: 36px;
          }

          .pathview-course-card {
            position: relative;
            top: auto;
            left: auto;
            width: min(590px, 100%);
            margin: 0 auto 36px;
          }

          .pathview-map {
            width: min(660px, 100%);
            margin: 0 auto;
          }

          .pathview-command {
            margin-top: -72px;
          }

          .pathview-command-grid {
            grid-template-columns: 1fr 1fr;
          }

          .pathview-shop {
            grid-column: span 2;
          }

          .pathview-shop-page-grid {
            grid-template-columns: 1fr;
          }

          .pathview-stat-grid--wide,
          .pathview-analytics-grid {
            grid-template-columns: 1fr 1fr;
          }
        }

        @media (max-width: 760px) {
          .pathview-nav {
            height: auto;
          }

          .pathview-nav-inner {
            width: calc(100% - 24px);
            min-height: 76px;
            flex-wrap: wrap;
            gap: 12px;
            padding: 10px 0;
          }

          .pathview-brand-row {
            width: 100%;
            justify-content: space-between;
          }

          .pathview-brand {
            font-size: 28px;
          }

          .pathview-tabs {
            height: 42px;
            gap: 20px;
            overflow-x: auto;
            width: 100%;
          }

          .pathview-nav-actions {
            width: 100%;
            justify-content: space-between;
          }

          .pathview-premium,
          .pathview-token,
          .pathview-menu {
            min-height: 44px;
            font-size: 13px;
          }

          .pathview-premium {
            padding: 0 12px;
          }

          .pathview-token {
            min-width: 72px;
          }

          .pathview-menu {
            width: 44px;
          }

          .pathview-promo {
            min-height: 66px;
            height: auto;
            padding: 10px 18px;
            text-align: center;
            font-size: 15px;
            flex-wrap: wrap;
          }

          .pathview-workspace {
            width: calc(100% - 24px);
            min-height: 900px;
            padding-bottom: 210px;
          }

          .pathview-course-card {
            padding: 28px 22px;
          }

          .pathview-course-card h1 {
            font-size: 26px;
          }

          .pathview-course-card p {
            font-size: 16px;
          }

          .pathview-card-stats {
            flex-wrap: wrap;
            gap: 16px;
            font-size: 15px;
          }

          .pathview-level {
            width: 100%;
          }

          .pathview-map {
            min-height: 650px;
          }

          .pathview-node {
            left: 118px;
            gap: 18px;
          }

          .pathview-node-disc {
            width: 112px;
            height: 68px;
          }

          .pathview-node-face {
            inset: 11px 14px 14px;
          }

          .pathview-guide {
            left: 4px;
            top: -64px;
          }

          .pathview-node p {
            width: min(180px, calc(100vw - 190px));
            font-size: 17px;
          }

          .pathview-orb {
            right: 10px;
            top: 586px;
          }

          .pathview-start-panel {
            bottom: 18px;
          }

          .pathview-command {
            width: calc(100% - 24px);
            margin: -54px auto 230px;
          }

          .pathview-command-head {
            align-items: flex-start;
            flex-direction: column;
          }

          .pathview-command-grid,
          .pathview-shop {
            grid-template-columns: 1fr;
            grid-column: auto;
          }

          .pathview-stat-grid {
            grid-template-columns: 1fr 1fr;
          }

          .pathview-page-panel {
            width: calc(100% - 24px);
            padding: 34px 0 210px;
          }

          .pathview-page-hero {
            align-items: flex-start;
            flex-direction: column;
            padding: 20px;
          }

          .pathview-page-hero h1 {
            font-size: 32px;
          }

          .pathview-page-balance {
            width: 100%;
          }

          .pathview-shop-page-grid,
          .pathview-analytics-grid {
            grid-template-columns: 1fr;
          }

          .pathview-stat-grid--wide {
            grid-template-columns: 1fr 1fr;
          }

          .pathview-setting-card {
            align-items: flex-start;
            flex-direction: column;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          *,
          *::before,
          *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            scroll-behavior: auto !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>

      <nav className="pathview-nav" aria-label="PathAI path navigation">
        <div className="pathview-nav-inner">
          <div className="pathview-brand-row">
            <Link className="pathview-brand" href="/dashboard">
              PathAI
            </Link>
            <div className="pathview-tabs">
              <Link className="pathview-tab" href="/dashboard">
                <IconHome />
                Home
              </Link>
              <button className={`pathview-tab ${activePage === 'path' ? 'is-active' : 'pathview-tab--ghost'}`} type="button" onClick={() => openPage('path')}>
                <IconCourses />
                Path
              </button>
              <button className={`pathview-tab ${activePage === 'shop' ? 'is-active' : 'pathview-tab--ghost'}`} type="button" onClick={() => openPage('shop')}>
                <IconShop />
                Shop
              </button>
              <button className={`pathview-tab ${activePage === 'stats' ? 'is-active' : 'pathview-tab--ghost'}`} type="button" onClick={() => openPage('stats')}>
                <IconStats />
                Stats
              </button>
              <button className={`pathview-tab ${activePage === 'settings' ? 'is-active' : 'pathview-tab--ghost'}`} type="button" onClick={() => openPage('settings')}>
                <IconSettings />
                Settings
              </button>
            </div>
          </div>

          <div className="pathview-nav-actions" aria-label="PathAI placeholder actions">
            <button className="pathview-premium" type="button" onClick={() => openPage('shop')}>
              Upgrade
            </button>
            <button className="pathview-token pathview-token--key" type="button" onClick={() => openPage('shop')}>
              <strong>{gemBalance}</strong>
              <span>gems</span>
            </button>
            <button className="pathview-token pathview-token--energy" type="button">
              <strong>0</strong>
              <IconBolt />
            </button>
            <button className="pathview-menu" type="button" aria-label="Menu" onClick={() => openPage('settings')}>
              <IconMenu />
            </button>
          </div>
        </div>
      </nav>

      <div className="pathview-promo">
        <PremiumKey />
        <span>Unlock adaptive missions and save 20%.</span>
        <button type="button" onClick={() => openPage('shop')}>Upgrade</button>
      </div>

      {activePage === 'path' && (
        <>
          <section className="pathview-workspace" aria-label="PathAI path preview">
            <article className="pathview-course-card">
              <CourseArt />
              <h1>Thinking with AI</h1>
              <p>Build solid foundations for computational problem solving with a guided AI copilot.</p>
              <div className="pathview-card-stats">
                <span className="pathview-card-stat">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M4 12c2-4 5-6 8-6s6 2 8 6c-2 4-5 6-8 6s-6-2-8-6z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                  48 Missions
                </span>
                <span className="pathview-card-stat">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M8 7h8M8 12h8M8 17h5" />
                    <rect x="4" y="3" width="16" height="18" rx="3" />
                  </svg>
                  585 Proofs
                </span>
              </div>
            </article>

            <div className="pathview-map">
              <header className="pathview-level">
                <p>Signal 1</p>
                <h2>Calibrating Your AI Instincts</h2>
              </header>

              {pathNodes.map((node) => (
                <DiscNode key={node.id} node={node} />
              ))}

              <div className="pathview-orb" aria-hidden="true" />
            </div>
          </section>

          <CommandCenter onOpen={openPage} />

          <section className="pathview-start-panel" aria-label="Selected PathAI mission">
            <h2>Mission Briefing</h2>
            <p>Prompting the System is next because your reasoning streak is warming up.</p>
            <span className="pathview-xp-pill">+40 XP ready</span>
            <button className="pathview-start-button" type="button">
              Begin Mission
            </button>
          </section>
        </>
      )}

      {activePage === 'shop' && (
        <ShopPage gemBalance={gemBalance} ownedItems={ownedItems} onBuy={buyItem} toast={toast} />
      )}

      {activePage === 'stats' && <StatsPage />}

      {activePage === 'settings' && (
        <SettingsPage settings={settings} onToggle={toggleSetting} />
      )}
    </main>
  )
}
