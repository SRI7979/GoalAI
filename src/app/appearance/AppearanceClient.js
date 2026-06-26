'use client'

import { useMemo, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { Check, Palette, RotateCcw, Sparkles } from 'lucide-react'
import {
  APP_THEMES,
  clearStoredActiveTheme,
  getStoredActiveTheme,
  setStoredActiveTheme,
} from '@/lib/appThemes'
import { track } from '@/lib/analytics'

function buildPreviewVars(theme) {
  const vars = theme.dashboardVars
  return {
    '--preview-bg': vars['--theme-bg'],
    '--preview-shell': vars['--theme-shell'],
    '--preview-surface': vars['--theme-surface'],
    '--preview-border': vars['--theme-border'],
    '--preview-primary': vars['--theme-primary'],
    '--preview-secondary': vars['--theme-secondary'],
    '--preview-highlight': vars['--theme-highlight'],
    '--preview-text': vars['--theme-text'],
    '--preview-muted': vars['--theme-text-muted'],
    '--preview-ink': vars['--theme-ink'],
    '--preview-shadow': vars['--theme-primary-dim'],
  }
}

function applyPalette(themeId) {
  setStoredActiveTheme(themeId)
}

function subscribeToThemeChanges(callback) {
  if (typeof window === 'undefined') return () => {}
  window.addEventListener('pathai-theme-changed', callback)
  window.addEventListener('storage', callback)
  return () => {
    window.removeEventListener('pathai-theme-changed', callback)
    window.removeEventListener('storage', callback)
  }
}

function getThemeSnapshot() {
  return getStoredActiveTheme()
}

function getServerThemeSnapshot() {
  return 'default'
}

export default function AppearanceClient() {
  const themes = useMemo(() => Object.values(APP_THEMES), [])
  const selectedThemeId = useSyncExternalStore(
    subscribeToThemeChanges,
    getThemeSnapshot,
    getServerThemeSnapshot,
  )

  const handleSelect = (themeId) => {
    applyPalette(themeId)
    track('appearance_palette_selected', {
      palette_id: themeId,
      palette_name: APP_THEMES[themeId]?.name || themeId,
    })
  }

  const handleReset = () => {
    clearStoredActiveTheme()
    track('appearance_palette_reset', { palette_id: 'default' })
  }

  return (
    <main className="appearance-page">
      <section className="appearance-hero pathai-card-glow" aria-labelledby="appearance-title">
        <div className="appearance-hero-copy">
          <span className="appearance-icon-chip" aria-hidden="true">
            <Palette size={20} strokeWidth={2.4} />
          </span>
          <p className="appearance-eyebrow">Settings · Appearance</p>
          <h1 id="appearance-title">Pick your color palette</h1>
          <p className="appearance-subhead">
            Re-skin PathAI instantly. Your choice follows you across the dashboard, lessons, cards,
            shop, stats, path, and the component surfaces that use the app tokens.
          </p>
        </div>

        <div className="appearance-hero-actions">
          <button type="button" className="appearance-reset-button" onClick={handleReset}>
            <RotateCcw size={16} strokeWidth={2.4} />
            Reset to default
          </button>
          <Link className="appearance-dashboard-link" href="/dashboard">
            Back to dashboard
          </Link>
        </div>
      </section>

      <section className="appearance-grid" aria-label="Available color palettes">
        {themes.map((theme) => {
          const isSelected = selectedThemeId === theme.id
          const vars = theme.dashboardVars
          const swatches = [
            vars['--theme-bg'],
            vars['--theme-shell'],
            vars['--theme-primary'],
            vars['--theme-secondary'],
            vars['--theme-highlight'],
          ]

          return (
            <button
              key={theme.id}
              type="button"
              className={`appearance-card${isSelected ? ' is-selected' : ''}`}
              style={buildPreviewVars(theme)}
              onClick={() => handleSelect(theme.id)}
              aria-pressed={isSelected}
            >
              <span className="appearance-card-check" aria-hidden="true">
                {isSelected ? <Check size={16} strokeWidth={3} /> : <Sparkles size={15} strokeWidth={2.4} />}
              </span>

              <span className="appearance-preview" aria-hidden="true">
                <span className="appearance-preview-topline" />
                <span className="appearance-preview-body">
                  <span className="appearance-preview-copy">
                    <span />
                    <span />
                    <span />
                  </span>
                  <span className="appearance-preview-chip">Aa</span>
                </span>
                <span className="appearance-preview-dots">
                  {swatches.map((color, index) => (
                    <span key={`${theme.id}-${index}`} style={{ background: color }} />
                  ))}
                </span>
              </span>

              <span className="appearance-card-meta">
                <span className="appearance-card-title">{theme.name}</span>
                <span className="appearance-card-description">{theme.description}</span>
              </span>
            </button>
          )
        })}
      </section>
    </main>
  )
}
