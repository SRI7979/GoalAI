'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import RichPracticePreview from '@/components/domainTasks/RichPracticePreview'
import { DOMAIN_METADATA } from '@/lib/domainAdapter'
import {
  DOMAIN_ACCENTS,
  DOMAIN_ORDER,
  RICH_PRACTICE_DEMOS,
} from '@/lib/richPracticeDemos'

function includesSearch(demo, search) {
  const query = search.trim().toLowerCase()
  if (!query) return true
  return [
    demo.domain,
    demo.domainLabel,
    demo.label,
    demo.taskType,
    demo.task?.interactionType,
    demo.goal,
    demo.topic,
  ].filter(Boolean).some((value) => String(value).toLowerCase().includes(query))
}

function getNextIndex(currentIndex, length, direction) {
  if (length <= 0) return -1
  if (currentIndex < 0) return direction > 0 ? 0 : length - 1
  return (currentIndex + direction + length) % length
}

export default function PracticeGalleryPage() {
  const demos = RICH_PRACTICE_DEMOS
  const searchRef = useRef(null)
  const [activeId, setActiveId] = useState(demos[0]?.id)
  const [search, setSearch] = useState('')
  const [selectedDomains, setSelectedDomains] = useState([])
  const [openDomains, setOpenDomains] = useState({ [demos[0]?.domain]: true })
  const [browseOpen, setBrowseOpen] = useState(false)
  const [infoOpen, setInfoOpen] = useState(false)

  const filteredDemos = useMemo(() => {
    return demos.filter((demo) => {
      const domainMatch = selectedDomains.length === 0 || selectedDomains.includes(demo.domain)
      return domainMatch && includesSearch(demo, search)
    })
  }, [demos, search, selectedDomains])

  const activeDemo = filteredDemos.find((demo) => demo.id === activeId) || filteredDemos[0] || demos.find((demo) => demo.id === activeId) || demos[0]
  const activeAccent = DOMAIN_ACCENTS[activeDemo.domain] || '#0ef5c2'
  const activeMeta = DOMAIN_METADATA[activeDemo.domain]

  const groupedDemos = useMemo(() => {
    return DOMAIN_ORDER.map((domain) => ({
      domain,
      meta: DOMAIN_METADATA[domain],
      demos: filteredDemos.filter((demo) => demo.domain === domain),
      total: demos.filter((demo) => demo.domain === domain).length,
    }))
  }, [demos, filteredDemos])

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.target?.tagName === 'INPUT' || event.target?.tagName === 'TEXTAREA') {
        if (event.key === 'Escape') setSearch('')
        return
      }

      if (event.key === '/') {
        event.preventDefault()
        searchRef.current?.focus()
        return
      }

      if (event.key === 'Escape') {
        setSearch('')
        setBrowseOpen(false)
        return
      }

      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault()
        const currentIndex = filteredDemos.findIndex((demo) => demo.id === activeDemo.id)
        const nextIndex = getNextIndex(currentIndex, filteredDemos.length, event.key === 'ArrowDown' ? 1 : -1)
        if (nextIndex >= 0) setActiveId(filteredDemos[nextIndex].id)
        return
      }

      if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
        event.preventDefault()
        const direction = event.key === 'ArrowRight' ? 1 : -1
        const currentDomainIndex = DOMAIN_ORDER.indexOf(activeDemo.domain)
        for (let offset = 1; offset <= DOMAIN_ORDER.length; offset += 1) {
          const nextDomain = DOMAIN_ORDER[(currentDomainIndex + offset * direction + DOMAIN_ORDER.length) % DOMAIN_ORDER.length]
          const nextDemo = filteredDemos.find((demo) => demo.domain === nextDomain)
          if (nextDemo) {
            setActiveId(nextDemo.id)
            setOpenDomains((previous) => ({ ...previous, [nextDomain]: true }))
            return
          }
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeDemo.domain, activeDemo.id, filteredDemos])

  function toggleDomainFilter(domain) {
    setSelectedDomains((previous) => previous.includes(domain)
      ? previous.filter((item) => item !== domain)
      : [...previous, domain])
  }

  function selectDemo(demo) {
    setActiveId(demo.id)
    setOpenDomains((previous) => ({ ...previous, [demo.domain]: true }))
    setBrowseOpen(false)
  }

  function renderRail({ inSheet = false } = {}) {
    return (
      <nav className={`pg-rail ${inSheet ? `is-sheet ${browseOpen ? 'is-open' : ''}` : ''}`} aria-label="Practice demos">
        <div className="pg-rail-top">
          <Link href="/dashboard">Back to dashboard</Link>
          <span>{filteredDemos.length}/{demos.length}</span>
        </div>
        <div className="pg-rail-title">
          <strong>Browse demos</strong>
          <p>Grouped by domain. Use Up and Down to move through the filtered list.</p>
        </div>
        {groupedDemos.map(({ domain, meta, demos: domainDemos, total }) => {
          const isActiveDomain = activeDemo.domain === domain
          const isOpen = Boolean(openDomains[domain] || isActiveDomain || search)
          if (search && domainDemos.length === 0) return null
          return (
            <section className="pg-domain-group" key={domain}>
              <button
                type="button"
                className="pg-domain-toggle"
                onClick={() => setOpenDomains((previous) => ({ ...previous, [domain]: !isOpen }))}
                style={{ '--domain': DOMAIN_ACCENTS[domain] || '#cbd5e1' }}
                aria-expanded={isOpen}
              >
                <span className="pg-dot" />
                <strong>{meta?.label || domain}</strong>
                <em>{search ? domainDemos.length : total}</em>
              </button>
              {isOpen ? (
                <div className="pg-task-list">
                  {domainDemos.map((demo) => {
                    const active = activeDemo.id === demo.id
                    return (
                      <button
                        key={demo.id}
                        type="button"
                        className={`pg-task-button ${active ? 'is-active' : ''}`}
                        onClick={() => selectDemo(demo)}
                        style={{ '--domain': DOMAIN_ACCENTS[domain] || '#cbd5e1' }}
                      >
                        <span>{demo.label}</span>
                        <small>{demo.task.interactionType}</small>
                      </button>
                    )
                  })}
                </div>
              ) : null}
            </section>
          )
        })}
      </nav>
    )
  }

  return (
    <main className={`practice-gallery ${infoOpen ? 'has-info' : ''}`}>
      <style>{`
        .practice-gallery {
          min-height: 100vh;
          background:
            radial-gradient(circle at 12% 8%, rgba(14,245,194,0.10), transparent 28%),
            radial-gradient(circle at 86% 12%, rgba(250,204,21,0.08), transparent 24%),
            #080b10;
          color: #f8fafc;
          font-family: 'Plus Jakarta Sans','DM Sans',system-ui,sans-serif;
          display: grid;
          grid-template-columns: 280px minmax(0, 1fr);
        }
        .practice-gallery.has-info {
          grid-template-columns: 280px minmax(0, 1fr) 300px;
        }
        .pg-rail {
          position: sticky;
          top: 0;
          height: 100vh;
          overflow-y: auto;
          border-right: 1px solid rgba(255,255,255,0.09);
          background: rgba(9,13,20,0.88);
          padding: 18px;
        }
        .pg-rail-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 18px;
        }
        .pg-rail-top a {
          color: #a7f3d0;
          text-decoration: none;
          font-size: 11px;
          font-weight: 950;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        .pg-rail-top span,
        .pg-rail-title p,
        .pg-task-button small,
        .pg-meta {
          color: #8b949e;
          font-size: 12px;
          line-height: 1.45;
        }
        .pg-rail-title {
          margin-bottom: 18px;
        }
        .pg-rail-title strong {
          display: block;
          font-size: 18px;
          margin-bottom: 5px;
        }
        .pg-rail-title p {
          margin: 0;
        }
        .pg-domain-group {
          margin-bottom: 10px;
        }
        .pg-domain-toggle,
        .pg-task-button,
        .pg-chip,
        .pg-search input,
        .pg-icon-button,
        .pg-info-button,
        .pg-browse-button {
          border-radius: 8px;
          font: inherit;
        }
        .pg-domain-toggle {
          width: 100%;
          min-height: 44px;
          border: 1px solid rgba(255,255,255,0.09);
          background: rgba(255,255,255,0.04);
          color: #f8fafc;
          display: grid;
          grid-template-columns: 12px minmax(0, 1fr) auto;
          gap: 9px;
          align-items: center;
          padding: 10px;
          cursor: pointer;
          text-align: left;
        }
        .pg-dot {
          width: 9px;
          height: 9px;
          border-radius: 999px;
          background: var(--domain);
          box-shadow: 0 0 18px color-mix(in srgb, var(--domain) 50%, transparent);
        }
        .pg-domain-toggle strong {
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 13px;
        }
        .pg-domain-toggle em {
          min-width: 28px;
          height: 24px;
          border-radius: 999px;
          display: grid;
          place-items: center;
          background: rgba(255,255,255,0.07);
          color: #d1d5db;
          font-style: normal;
          font-size: 11px;
          font-weight: 950;
        }
        .pg-task-list {
          display: grid;
          gap: 6px;
          margin: 7px 0 0;
          padding-left: 10px;
        }
        .pg-task-button {
          position: relative;
          width: 100%;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.025);
          color: #d1d5db;
          cursor: pointer;
          padding: 10px 10px 10px 13px;
          text-align: left;
          transition: transform 0.14s ease, background 0.14s ease, border-color 0.14s ease;
        }
        .pg-task-button:before {
          content: "";
          position: absolute;
          inset: 7px auto 7px 0;
          width: 3px;
          border-radius: 999px;
          background: transparent;
        }
        .pg-task-button:hover {
          transform: translateY(-1px);
          background: rgba(255,255,255,0.055);
        }
        .pg-task-button:active {
          transform: translateY(2px);
          filter: brightness(0.86);
        }
        .pg-task-button.is-active {
          background: color-mix(in srgb, var(--domain) 12%, rgba(255,255,255,0.04));
          border-color: color-mix(in srgb, var(--domain) 42%, rgba(255,255,255,0.08));
          color: #fff;
        }
        .pg-task-button.is-active:before {
          background: var(--domain);
        }
        .pg-task-button span {
          display: block;
          font-weight: 900;
          font-size: 13px;
          margin-bottom: 3px;
        }
        .pg-main {
          min-width: 0;
          padding: 0 32px 32px;
        }
        .pg-sticky-header {
          position: sticky;
          top: 0;
          z-index: 5;
          background: linear-gradient(180deg, rgba(8,11,16,0.96), rgba(8,11,16,0.84));
          backdrop-filter: blur(18px);
          border-bottom: 1px solid rgba(255,255,255,0.08);
          margin: 0 -32px 22px;
          padding: 18px 32px 14px;
        }
        .pg-header-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 18px;
          max-width: 1120px;
          margin: 0 auto 14px;
        }
        .pg-header-top h1 {
          margin: 0 0 6px;
          font-size: clamp(24px, 3vw, 38px);
          letter-spacing: 0;
          line-height: 1.02;
        }
        .pg-header-top p {
          margin: 0;
          color: #9ca3af;
          font-size: 13px;
          line-height: 1.5;
        }
        .pg-header-actions {
          display: flex;
          gap: 8px;
        }
        .pg-browse-button,
        .pg-info-button,
        .pg-icon-button {
          min-height: 44px;
          border: 1px solid rgba(255,255,255,0.11);
          background: rgba(255,255,255,0.055);
          color: #e5e7eb;
          padding: 0 13px;
          font-weight: 900;
          cursor: pointer;
        }
        .pg-browse-button {
          display: none;
        }
        .pg-controls {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 260px;
          gap: 12px;
          align-items: center;
          max-width: 1120px;
          margin: 0 auto;
        }
        .pg-chip-row {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          padding-bottom: 4px;
        }
        .pg-chip {
          flex: 0 0 auto;
          min-height: 38px;
          border: 1px solid rgba(255,255,255,0.10);
          background: rgba(255,255,255,0.045);
          color: #d1d5db;
          padding: 0 11px;
          font-size: 12px;
          font-weight: 950;
          cursor: pointer;
        }
        .pg-chip.is-active {
          border-color: var(--chip);
          color: #fff;
          background: color-mix(in srgb, var(--chip) 16%, rgba(255,255,255,0.04));
        }
        .pg-search input {
          width: 100%;
          min-height: 44px;
          border: 1px solid rgba(255,255,255,0.11);
          background: rgba(0,0,0,0.24);
          color: #f8fafc;
          padding: 0 13px;
          outline: none;
        }
        .pg-search input:focus,
        .pg-task-button:focus-visible,
        .pg-domain-toggle:focus-visible,
        .pg-chip:focus-visible,
        .pg-info-button:focus-visible,
        .pg-browse-button:focus-visible {
          outline: 2px solid ${activeAccent};
          outline-offset: 2px;
        }
        .pg-preview-shell {
          max-width: 1120px;
          margin: 0 auto;
        }
        .pg-breadcrumb {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
          color: #9ca3af;
          font-size: 13px;
          font-weight: 850;
          margin-bottom: 12px;
        }
        .pg-breadcrumb strong {
          color: ${activeAccent};
        }
        .pg-preview {
          min-height: 760px;
          border: 1px solid rgba(255,255,255,0.09);
          border-radius: 8px;
          overflow: hidden;
          background: #070c14;
        }
        .pg-info-drawer {
          height: 100vh;
          position: sticky;
          top: 0;
          border-left: 1px solid rgba(255,255,255,0.09);
          background: rgba(9,13,20,0.88);
          padding: 22px;
          overflow-y: auto;
        }
        .pg-info-drawer h2 {
          margin: 0 0 8px;
          font-size: 18px;
        }
        .pg-info-drawer p {
          color: #a1a1aa;
          line-height: 1.6;
          font-size: 13px;
        }
        .pg-info-drawer ul {
          color: #cbd5e1;
          padding-left: 18px;
          line-height: 1.7;
          font-size: 13px;
        }
        .pg-mobile-sheet {
          display: none;
        }
        .pg-sheet-scrim {
          display: none;
        }
        @media (max-width: 1024px) {
          .practice-gallery,
          .practice-gallery.has-info {
            grid-template-columns: 1fr;
          }
          .pg-rail {
            display: none;
          }
          .pg-browse-button {
            display: inline-flex;
            align-items: center;
          }
          .pg-main {
            padding: 0 20px 24px;
          }
          .pg-sticky-header {
            margin: 0 -20px 18px;
            padding: 16px 20px 13px;
          }
          .pg-info-drawer {
            display: none;
          }
          .pg-sheet-scrim {
            display: block;
            position: fixed;
            inset: 0;
            z-index: 20;
            background: rgba(0,0,0,0.52);
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.18s ease;
          }
          .pg-sheet-scrim.is-open {
            opacity: 1;
            pointer-events: auto;
          }
          .pg-rail.is-sheet {
            display: block;
            position: fixed;
            z-index: 21;
            inset: 0 auto 0 0;
            width: min(340px, 88vw);
            transform: translateX(-100%);
            transition: transform 0.2s ease;
            border-right: 1px solid rgba(255,255,255,0.12);
          }
          .pg-mobile-sheet {
            display: block;
          }
          .pg-rail.is-sheet.is-open {
            transform: translateX(0);
          }
        }
        @media (max-width: 640px) {
          .pg-main {
            padding: 0 16px 18px;
          }
          .pg-sticky-header {
            margin: 0 -16px 14px;
            padding: 14px 16px 12px;
          }
          .pg-header-top {
            align-items: center;
          }
          .pg-header-top p {
            display: none;
          }
          .pg-controls {
            grid-template-columns: 1fr;
          }
          .pg-preview {
            min-height: 780px;
          }
        }
      `}</style>

      {renderRail()}

      <div className={`pg-sheet-scrim ${browseOpen ? 'is-open' : ''}`} onClick={() => setBrowseOpen(false)} />
      <div className={`pg-mobile-sheet ${browseOpen ? 'is-open' : ''}`}>
        {renderRail({ inSheet: true })}
      </div>

      <section className="pg-main">
        <header className="pg-sticky-header">
          <div className="pg-header-top">
            <div>
              <h1>Practice Gallery</h1>
              <p>36 playable demos across 12 domains. Static today, shaped like future AI task JSON.</p>
              <div className="pg-meta">{filteredDemos.length} visible / {demos.length} demos across 12 domains</div>
            </div>
            <div className="pg-header-actions">
              <button type="button" className="pg-browse-button" onClick={() => setBrowseOpen(true)}>Browse demos</button>
              <button type="button" className="pg-info-button" onClick={() => setInfoOpen((value) => !value)}>Info</button>
            </div>
          </div>

          <div className="pg-controls">
            <div className="pg-chip-row" aria-label="Domain filters">
              <button
                type="button"
                className={`pg-chip ${selectedDomains.length === 0 ? 'is-active' : ''}`}
                style={{ '--chip': activeAccent }}
                onClick={() => setSelectedDomains([])}
              >
                All
              </button>
              {DOMAIN_ORDER.map((domain) => (
                <button
                  type="button"
                  key={domain}
                  className={`pg-chip ${selectedDomains.includes(domain) ? 'is-active' : ''}`}
                  style={{ '--chip': DOMAIN_ACCENTS[domain] || '#cbd5e1' }}
                  onClick={() => toggleDomainFilter(domain)}
                >
                  {DOMAIN_METADATA[domain]?.label || domain}
                </button>
              ))}
            </div>
            <label className="pg-search">
              <input
                ref={searchRef}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search domains or task types..."
                aria-label="Search practice demos"
              />
            </label>
          </div>
        </header>

        <div className="pg-preview-shell">
          <div className="pg-breadcrumb">
            <strong>{activeMeta?.label || activeDemo.domain}</strong>
            <span>/</span>
            <span>{activeDemo.label}</span>
          </div>

          {filteredDemos.length === 0 ? (
            <div className="pg-preview" style={{ display: 'grid', placeItems: 'center', padding: 24 }}>
              <div>
                <h2>No demos match that filter.</h2>
                <p style={{ color: '#9ca3af' }}>Clear search or choose All domains to bring the gallery back.</p>
              </div>
            </div>
          ) : (
            <div className="pg-preview">
              <RichPracticePreview key={activeDemo.id} demo={activeDemo} />
            </div>
          )}
        </div>
      </section>

      {infoOpen ? (
        <aside className="pg-info-drawer">
          <h2>{activeDemo.label}</h2>
          <p>{activeDemo.task.prompt}</p>
          <ul>
            <li>Domain: {activeMeta?.label || activeDemo.domain}</li>
            <li>Interaction: {activeDemo.task.interactionType}</li>
            <li>Goal: {activeDemo.goal}</li>
            <li>Topic: {activeDemo.topic}</li>
          </ul>
          <p>This gallery is a UI test surface only. It should feel polished before the live dashboard practice flow adopts it.</p>
        </aside>
      ) : null}
    </main>
  )
}
