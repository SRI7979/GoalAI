'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'

const pages = [
  { id: 'mission', icon: 'AI', title: 'Mission Brief' },
  { id: 'path', icon: 'PM', title: 'Path Map' },
  { id: 'shop', icon: 'GS', title: 'Gem Shop' },
  { id: 'stats', icon: 'ST', title: 'Stats' },
  { id: 'settings', icon: 'SE', title: 'Settings' },
]

const missionBlocks = [
  { id: 'read-context', title: 'Read the current context packet', owner: 'PathAI', status: 'Today' },
  { id: 'solve-loop', title: 'Complete the reasoning loop exercise', owner: 'You', status: 'Next' },
  { id: 'ship-proof', title: 'Save one proof of work', owner: 'You', status: 'Later' },
]

const pathRows = [
  { topic: 'Prompting the System', type: 'Lesson', status: 'Active', progress: '72%' },
  { topic: 'Context Windows', type: 'Practice', status: 'Queued', progress: '18%' },
  { topic: 'Reasoning Loops', type: 'Project', status: 'Locked', progress: '0%' },
  { topic: 'Review Packet', type: 'Checkpoint', status: 'Locked', progress: '0%' },
]

const shopItems = [
  { id: 'focus-pass', name: 'Focus Pass', cost: 80, detail: 'Open a quiet mission block.' },
  { id: 'hint-note', name: 'Hint Note', cost: 45, detail: 'Add one extra nudge to the brief.' },
  { id: 'cover-pack', name: 'Cover Pack', cost: 120, detail: 'Unlock alternate page covers.' },
]

const statRows = [
  { label: 'Current streak', value: '7 days', note: 'Kept from daily missions' },
  { label: 'Total XP', value: '2,480', note: 'Across this path' },
  { label: 'Gems', value: '320', note: 'Ready to spend' },
  { label: 'Proofs saved', value: '18', note: 'Portfolio-ready moments' },
]

const settingRows = [
  { id: 'focus', label: 'Focus mode', detail: 'Keep the page quiet during missions.', enabled: true },
  { id: 'nudge', label: 'Gentle nudges', detail: 'Add a reminder after idle time.', enabled: true },
  { id: 'motion', label: 'Page motion', detail: 'Use light transitions between pages.', enabled: false },
]

function cx(...parts) {
  return parts.filter(Boolean).join(' ')
}

function PageIcon({ children, active = false }) {
  return (
    <span className={cx('pv2-page-icon', active && 'is-active')} aria-hidden="true">
      {children}
    </span>
  )
}

function Sidebar({ activePage, setActivePage, ownedCount }) {
  return (
    <aside className="pv2-sidebar">
      <div className="pv2-workspace">
        <div className="pv2-workspace-mark">P</div>
        <div>
          <strong>PathAI</strong>
          <span>Learning workspace</span>
        </div>
      </div>

      <div className="pv2-sidebar-actions">
        <button type="button">Search</button>
        <button type="button">New page</button>
      </div>

      <nav className="pv2-page-list" aria-label="PathAI workspace pages">
        {pages.map((page) => (
          <button
            key={page.id}
            type="button"
            className={cx('pv2-page-link', activePage === page.id && 'is-active')}
            onClick={() => setActivePage(page.id)}
          >
            <PageIcon active={activePage === page.id}>{page.icon}</PageIcon>
            <span>{page.title}</span>
          </button>
        ))}
      </nav>

      <div className="pv2-sidebar-section">
        <p>Favorites</p>
        <button type="button" onClick={() => setActivePage('mission')}>Today&apos;s mission</button>
        <button type="button" onClick={() => setActivePage('path')}>Course database</button>
      </div>

      <div className="pv2-sidebar-section">
        <p>Private</p>
        <button type="button" onClick={() => setActivePage('shop')}>Owned boosts ({ownedCount})</button>
        <button type="button" onClick={() => setActivePage('settings')}>Workspace settings</button>
      </div>

      <Link className="pv2-back" href="/dashboard">Back to dashboard</Link>
    </aside>
  )
}

function TopCrumbs({ activePage }) {
  const current = pages.find((page) => page.id === activePage) || pages[0]
  return (
    <header className="pv2-topbar">
      <div>
        <span>PathAI</span>
        <span>/</span>
        <strong>{current.title}</strong>
      </div>
      <div className="pv2-top-actions">
        <button type="button">Share</button>
        <button type="button">Updates</button>
      </div>
    </header>
  )
}

function PageHeader({ icon, title, subtitle }) {
  return (
    <section className="pv2-page-header">
      <div className="pv2-cover" />
      <div className="pv2-page-title-row">
        <PageIcon active>{icon}</PageIcon>
        <div>
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
      </div>
    </section>
  )
}

function Callout({ children }) {
  return (
    <div className="pv2-callout">
      <PageIcon>AI</PageIcon>
      <p>{children}</p>
    </div>
  )
}

function MissionPage({ done, toggleDone }) {
  const completedCount = missionBlocks.filter((block) => done[block.id]).length
  return (
    <>
      <PageHeader
        icon="AI"
        title="Mission Brief"
        subtitle="One place for today&apos;s plan, notes, and proof."
      />

      <Callout>
        Build the next small proof. Keep the page tidy, finish the loop, and save one thing worth showing.
      </Callout>

      <section className="pv2-block">
        <div className="pv2-block-heading">
          <h2>Today</h2>
          <span>{completedCount}/{missionBlocks.length} done</span>
        </div>
        <div className="pv2-check-list">
          {missionBlocks.map((block) => (
            <label key={block.id} className="pv2-check-row">
              <input
                type="checkbox"
                checked={Boolean(done[block.id])}
                onChange={() => toggleDone(block.id)}
              />
              <span className="pv2-checkmark" />
              <span className="pv2-check-title">{block.title}</span>
              <span className="pv2-pill">{block.status}</span>
            </label>
          ))}
        </div>
      </section>

      <section className="pv2-block">
        <div className="pv2-block-heading">
          <h2>Working notes</h2>
          <span>Draft</span>
        </div>
        <div className="pv2-text-block">
          <p>Start with the smallest useful explanation.</p>
          <p>Turn each answer into a reusable block.</p>
          <p>End with one clear proof of progress.</p>
        </div>
      </section>
    </>
  )
}

function PathPage() {
  return (
    <>
      <PageHeader
        icon="PM"
        title="Path Map"
        subtitle="A database view of the learning path."
      />
      <section className="pv2-block">
        <div className="pv2-block-heading">
          <h2>Course database</h2>
          <span>Table</span>
        </div>
        <div className="pv2-table" role="table" aria-label="PathAI course database">
          <div className="pv2-table-row is-head" role="row">
            <span>Topic</span>
            <span>Type</span>
            <span>Status</span>
            <span>Progress</span>
          </div>
          {pathRows.map((row) => (
            <div className="pv2-table-row" role="row" key={row.topic}>
              <span>{row.topic}</span>
              <span>{row.type}</span>
              <span><i className={cx('pv2-status', row.status.toLowerCase())}>{row.status}</i></span>
              <span>{row.progress}</span>
            </div>
          ))}
        </div>
      </section>
      <section className="pv2-block">
        <div className="pv2-toggle-block">
          <button type="button">Module notes</button>
          <p>Keep module context, practice notes, and project ideas close to the path database.</p>
        </div>
      </section>
    </>
  )
}

function ShopPage({ owned, buyItem, toast }) {
  return (
    <>
      <PageHeader
        icon="GS"
        title="Gem Shop"
        subtitle="A workspace view for boosts and cosmetics."
      />
      {toast && <div className="pv2-toast">{toast}</div>}
      <section className="pv2-gallery">
        {shopItems.map((item) => {
          const isOwned = owned.includes(item.id)
          return (
            <article key={item.id} className="pv2-shop-card">
              <div className="pv2-card-icon">+</div>
              <h2>{item.name}</h2>
              <p>{item.detail}</p>
              <div>
                <span>{item.cost} gems</span>
                <button type="button" onClick={() => buyItem(item)}>
                  {isOwned ? 'Owned' : 'Add'}
                </button>
              </div>
            </article>
          )
        })}
      </section>
    </>
  )
}

function StatsPage() {
  return (
    <>
      <PageHeader
        icon="ST"
        title="Stats"
        subtitle="A clean progress page for the current path."
      />
      <section className="pv2-block">
        <div className="pv2-block-heading">
          <h2>Progress board</h2>
          <span>Gallery</span>
        </div>
        <div className="pv2-stat-grid">
          {statRows.map((row) => (
            <article key={row.label} className="pv2-stat-card">
              <p>{row.label}</p>
              <strong>{row.value}</strong>
              <span>{row.note}</span>
            </article>
          ))}
        </div>
      </section>
      <section className="pv2-block">
        <div className="pv2-progress-list">
          {['Mission completion', 'Proof quality', 'Review coverage'].map((label, index) => (
            <div key={label}>
              <span>{label}</span>
              <div><i style={{ width: `${[76, 58, 42][index]}%` }} /></div>
            </div>
          ))}
        </div>
      </section>
    </>
  )
}

function SettingsPage({ settings, toggleSetting }) {
  return (
    <>
      <PageHeader
        icon="SE"
        title="Settings"
        subtitle="Workspace controls for this PathAI direction."
      />
      <section className="pv2-block">
        <div className="pv2-block-heading">
          <h2>Preferences</h2>
          <span>Local</span>
        </div>
        <div className="pv2-settings-list">
          {settingRows.map((row) => {
            const enabled = Boolean(settings[row.id])
            return (
              <button key={row.id} type="button" className="pv2-setting-row" onClick={() => toggleSetting(row.id)}>
                <span>
                  <strong>{row.label}</strong>
                  <small>{row.detail}</small>
                </span>
                <i className={cx(enabled && 'is-on')}>{enabled ? 'On' : 'Off'}</i>
              </button>
            )
          })}
        </div>
      </section>
    </>
  )
}

export default function PathView2Page() {
  const [activePage, setActivePage] = useState('mission')
  const [done, setDone] = useState({ 'read-context': true })
  const [owned, setOwned] = useState([])
  const [toast, setToast] = useState('')
  const [settings, setSettings] = useState(() => (
    settingRows.reduce((acc, row) => ({ ...acc, [row.id]: row.enabled }), {})
  ))

  const ownedCount = owned.length
  const current = useMemo(() => pages.find((page) => page.id === activePage) || pages[0], [activePage])

  function toggleDone(id) {
    setDone((currentDone) => ({ ...currentDone, [id]: !currentDone[id] }))
  }

  function buyItem(item) {
    if (owned.includes(item.id)) {
      setToast(`${item.name} is already in your workspace.`)
      return
    }
    setOwned((currentOwned) => [...currentOwned, item.id])
    setToast(`${item.name} added to your workspace.`)
  }

  function toggleSetting(id) {
    setSettings((currentSettings) => ({ ...currentSettings, [id]: !currentSettings[id] }))
  }

  return (
    <main className="pv2-shell">
      <style>{`
        .pv2-shell {
          min-height: 100vh;
          background: #ffffff;
          color: #1f1f1f;
          font-family: ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
          display: grid;
          grid-template-columns: 260px minmax(0, 1fr);
        }

        .pv2-shell *,
        .pv2-shell *::before,
        .pv2-shell *::after {
          box-sizing: border-box;
        }

        .pv2-shell button,
        .pv2-shell a {
          font: inherit;
        }

        .pv2-sidebar {
          position: sticky;
          top: 0;
          height: 100vh;
          background: #f7f7f5;
          border-right: 1px solid #ededeb;
          padding: 12px 10px;
          display: flex;
          flex-direction: column;
          gap: 14px;
          overflow-y: auto;
        }

        .pv2-workspace {
          display: flex;
          align-items: center;
          gap: 9px;
          min-height: 36px;
          padding: 4px 6px;
          border-radius: 6px;
        }

        .pv2-workspace-mark {
          width: 24px;
          height: 24px;
          border-radius: 5px;
          background: #1f1f1f;
          color: #fff;
          display: grid;
          place-items: center;
          font-size: 13px;
          font-weight: 700;
        }

        .pv2-workspace strong {
          display: block;
          color: #232323;
          font-size: 14px;
          font-weight: 700;
          line-height: 1.1;
        }

        .pv2-workspace span,
        .pv2-sidebar-section p,
        .pv2-page-header p,
        .pv2-block-heading span,
        .pv2-stat-card span,
        .pv2-shop-card p,
        .pv2-setting-row small {
          color: #77736d;
        }

        .pv2-workspace span {
          display: block;
          margin-top: 2px;
          font-size: 11px;
        }

        .pv2-sidebar-actions {
          display: grid;
          gap: 3px;
        }

        .pv2-sidebar-actions button,
        .pv2-page-link,
        .pv2-sidebar-section button,
        .pv2-back {
          width: 100%;
          min-height: 30px;
          border: 0;
          border-radius: 5px;
          background: transparent;
          color: #5f5b55;
          padding: 0 8px;
          display: flex;
          align-items: center;
          gap: 8px;
          text-align: left;
          text-decoration: none;
          cursor: pointer;
          font-size: 14px;
        }

        .pv2-sidebar-actions button:hover,
        .pv2-page-link:hover,
        .pv2-sidebar-section button:hover,
        .pv2-back:hover,
        .pv2-setting-row:hover,
        .pv2-shop-card button:hover,
        .pv2-top-actions button:hover {
          background: #ededeb;
        }

        .pv2-page-link.is-active {
          background: #e9e9e7;
          color: #1f1f1f;
          font-weight: 600;
        }

        .pv2-page-icon {
          width: 22px;
          height: 22px;
          border-radius: 5px;
          background: #ececea;
          color: #615f5a;
          display: inline-grid;
          place-items: center;
          flex: 0 0 auto;
          font-size: 9px;
          font-weight: 800;
        }

        .pv2-page-icon.is-active {
          background: #1f1f1f;
          color: #fff;
        }

        .pv2-page-list {
          display: grid;
          gap: 2px;
        }

        .pv2-sidebar-section {
          display: grid;
          gap: 2px;
        }

        .pv2-sidebar-section p {
          margin: 0 0 2px;
          padding: 0 8px;
          font-size: 11px;
          font-weight: 600;
        }

        .pv2-back {
          margin-top: auto;
          color: #2f6f61;
          font-weight: 600;
        }

        .pv2-document {
          min-width: 0;
          background: #fff;
        }

        .pv2-topbar {
          position: sticky;
          top: 0;
          z-index: 5;
          height: 46px;
          border-bottom: 1px solid #f0f0ee;
          background: rgba(255, 255, 255, 0.86);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 0 22px;
        }

        .pv2-topbar div:first-child {
          display: flex;
          align-items: center;
          gap: 7px;
          min-width: 0;
          color: #77736d;
          font-size: 14px;
        }

        .pv2-topbar strong {
          color: #37352f;
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .pv2-top-actions {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .pv2-top-actions button {
          min-height: 30px;
          border: 0;
          border-radius: 5px;
          background: transparent;
          color: #5f5b55;
          padding: 0 9px;
          cursor: pointer;
          font-size: 13px;
        }

        .pv2-page {
          width: min(900px, calc(100% - 48px));
          margin: 0 auto;
          padding: 36px 0 80px;
        }

        .pv2-cover {
          height: 118px;
          border-radius: 8px;
          background:
            linear-gradient(90deg, rgba(31,31,31,0.05) 1px, transparent 1px),
            linear-gradient(rgba(31,31,31,0.05) 1px, transparent 1px),
            linear-gradient(135deg, #f8f8f7, #ececea);
          background-size: 24px 24px, 24px 24px, auto;
          border: 1px solid #eeeeec;
          margin-bottom: 30px;
        }

        .pv2-page-title-row {
          display: flex;
          align-items: flex-start;
          gap: 14px;
        }

        .pv2-page-title-row .pv2-page-icon {
          width: 44px;
          height: 44px;
          border-radius: 8px;
          font-size: 14px;
        }

        .pv2-page-header h1 {
          margin: 0;
          color: #242424;
          font-size: 42px;
          line-height: 1.08;
          font-weight: 800;
        }

        .pv2-page-header p {
          margin: 8px 0 0;
          font-size: 15px;
        }

        .pv2-callout,
        .pv2-block {
          margin-top: 24px;
        }

        .pv2-callout {
          border-radius: 6px;
          background: #f7f7f5;
          padding: 14px 16px;
          display: flex;
          align-items: flex-start;
          gap: 12px;
        }

        .pv2-callout p {
          margin: 1px 0 0;
          color: #37352f;
          font-size: 15px;
          line-height: 1.55;
        }

        .pv2-block-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          min-height: 34px;
          border-bottom: 1px solid #ededeb;
          margin-bottom: 10px;
        }

        .pv2-block-heading h2 {
          margin: 0;
          color: #37352f;
          font-size: 18px;
          line-height: 1.2;
          font-weight: 700;
        }

        .pv2-block-heading span {
          font-size: 12px;
          font-weight: 600;
        }

        .pv2-check-list,
        .pv2-settings-list,
        .pv2-text-block,
        .pv2-progress-list {
          display: grid;
          gap: 2px;
        }

        .pv2-check-row {
          min-height: 38px;
          border-radius: 5px;
          display: grid;
          grid-template-columns: 22px 1fr auto;
          align-items: center;
          gap: 8px;
          padding: 0 8px;
          cursor: pointer;
        }

        .pv2-check-row:hover {
          background: #f7f7f5;
        }

        .pv2-check-row input {
          position: absolute;
          opacity: 0;
          pointer-events: none;
        }

        .pv2-checkmark {
          width: 16px;
          height: 16px;
          border: 1px solid #b9b7b2;
          border-radius: 3px;
          display: block;
        }

        .pv2-check-row input:checked + .pv2-checkmark {
          background: #37352f;
          border-color: #37352f;
          box-shadow: inset 0 0 0 3px #fff;
        }

        .pv2-check-title {
          min-width: 0;
          color: #37352f;
          font-size: 15px;
        }

        .pv2-check-row input:checked ~ .pv2-check-title {
          color: #8a877f;
          text-decoration: line-through;
        }

        .pv2-pill,
        .pv2-status,
        .pv2-setting-row i,
        .pv2-toast {
          border-radius: 5px;
          background: #efefed;
          color: #5f5b55;
          padding: 3px 7px;
          font-size: 12px;
          font-style: normal;
          font-weight: 600;
          white-space: nowrap;
        }

        .pv2-text-block p {
          margin: 0;
          min-height: 32px;
          border-radius: 5px;
          padding: 6px 8px;
          color: #37352f;
          line-height: 1.45;
        }

        .pv2-text-block p:hover {
          background: #f7f7f5;
        }

        .pv2-table {
          border: 1px solid #ededeb;
          border-radius: 6px;
          overflow: hidden;
        }

        .pv2-table-row {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr 0.8fr;
          min-height: 42px;
          border-top: 1px solid #ededeb;
        }

        .pv2-table-row:first-child {
          border-top: 0;
        }

        .pv2-table-row span {
          min-width: 0;
          padding: 10px 12px;
          border-left: 1px solid #ededeb;
          color: #37352f;
          font-size: 14px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .pv2-table-row span:first-child {
          border-left: 0;
        }

        .pv2-table-row.is-head {
          background: #fafafa;
        }

        .pv2-table-row.is-head span {
          color: #77736d;
          font-size: 12px;
          font-weight: 600;
        }

        .pv2-status.active {
          background: #e4f4ef;
          color: #2f6f61;
        }

        .pv2-status.queued {
          background: #f3eeee;
          color: #7a5c53;
        }

        .pv2-toggle-block {
          border-top: 1px solid #ededeb;
          border-bottom: 1px solid #ededeb;
          padding: 10px 0;
        }

        .pv2-toggle-block button {
          width: 100%;
          border: 0;
          border-radius: 5px;
          background: transparent;
          color: #37352f;
          text-align: left;
          padding: 6px 8px;
          cursor: pointer;
          font-weight: 700;
        }

        .pv2-toggle-block button::before {
          content: ">";
          margin-right: 8px;
          color: #77736d;
        }

        .pv2-toggle-block p {
          margin: 4px 0 0 24px;
          color: #77736d;
          line-height: 1.5;
        }

        .pv2-gallery,
        .pv2-stat-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
          margin-top: 24px;
        }

        .pv2-shop-card,
        .pv2-stat-card {
          border: 1px solid #ededeb;
          border-radius: 8px;
          padding: 14px;
          background: #fff;
        }

        .pv2-shop-card:hover,
        .pv2-stat-card:hover {
          background: #fafafa;
        }

        .pv2-card-icon {
          width: 30px;
          height: 30px;
          border-radius: 6px;
          background: #f1f1ef;
          color: #37352f;
          display: grid;
          place-items: center;
          font-weight: 800;
          margin-bottom: 12px;
        }

        .pv2-shop-card h2 {
          margin: 0;
          color: #37352f;
          font-size: 17px;
          font-weight: 700;
        }

        .pv2-shop-card p {
          margin: 7px 0 16px;
          min-height: 42px;
          line-height: 1.45;
          font-size: 14px;
        }

        .pv2-shop-card div:last-child {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .pv2-shop-card div:last-child span {
          color: #77736d;
          font-size: 13px;
          font-weight: 600;
        }

        .pv2-shop-card button {
          min-height: 30px;
          border: 1px solid #dededb;
          border-radius: 5px;
          background: #fff;
          color: #37352f;
          padding: 0 10px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 600;
        }

        .pv2-toast {
          display: inline-flex;
          margin-top: 18px;
          background: #e4f4ef;
          color: #2f6f61;
        }

        .pv2-stat-card p {
          margin: 0 0 8px;
          color: #77736d;
          font-size: 12px;
          font-weight: 600;
        }

        .pv2-stat-card strong {
          display: block;
          color: #37352f;
          font-size: 28px;
          line-height: 1;
          margin-bottom: 8px;
        }

        .pv2-progress-list > div {
          display: grid;
          grid-template-columns: 170px minmax(0, 1fr);
          gap: 16px;
          align-items: center;
          min-height: 34px;
        }

        .pv2-progress-list span {
          color: #37352f;
          font-size: 14px;
        }

        .pv2-progress-list div div {
          height: 8px;
          border-radius: 5px;
          background: #efefed;
          overflow: hidden;
        }

        .pv2-progress-list i {
          display: block;
          height: 100%;
          border-radius: 5px;
          background: #37352f;
        }

        .pv2-setting-row {
          width: 100%;
          min-height: 58px;
          border: 0;
          border-radius: 6px;
          background: transparent;
          color: #37352f;
          padding: 8px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          text-align: left;
          cursor: pointer;
        }

        .pv2-setting-row strong,
        .pv2-setting-row small {
          display: block;
        }

        .pv2-setting-row strong {
          font-size: 15px;
          margin-bottom: 3px;
        }

        .pv2-setting-row i.is-on {
          background: #e4f4ef;
          color: #2f6f61;
        }

        @media (max-width: 860px) {
          .pv2-shell {
            grid-template-columns: 1fr;
          }

          .pv2-sidebar {
            position: static;
            height: auto;
            border-right: 0;
            border-bottom: 1px solid #ededeb;
          }

          .pv2-page-list {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .pv2-page {
            width: min(100% - 28px, 720px);
            padding-top: 24px;
          }

          .pv2-gallery,
          .pv2-stat-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 600px) {
          .pv2-topbar {
            padding: 0 14px;
          }

          .pv2-top-actions {
            display: none;
          }

          .pv2-page-header h1 {
            font-size: 34px;
          }

          .pv2-table-row {
            grid-template-columns: 1.4fr 0.8fr 0.8fr;
          }

          .pv2-table-row span:nth-child(4) {
            display: none;
          }

          .pv2-progress-list > div {
            grid-template-columns: 1fr;
            gap: 6px;
          }
        }
      `}</style>

      <Sidebar activePage={activePage} setActivePage={setActivePage} ownedCount={ownedCount} />

      <section className="pv2-document" aria-label={`${current.title} document`}>
        <TopCrumbs activePage={activePage} />
        <div className="pv2-page">
          {activePage === 'mission' && <MissionPage done={done} toggleDone={toggleDone} />}
          {activePage === 'path' && <PathPage />}
          {activePage === 'shop' && <ShopPage owned={owned} buyItem={buyItem} toast={toast} />}
          {activePage === 'stats' && <StatsPage />}
          {activePage === 'settings' && <SettingsPage settings={settings} toggleSetting={toggleSetting} />}
        </div>
      </section>
    </main>
  )
}
