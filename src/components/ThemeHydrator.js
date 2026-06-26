'use client'

import { useEffect } from 'react'
import { getDashboardThemeVars, getStoredActiveTheme } from '@/lib/appThemes'

function hexToRgbTriplet(hex) {
  if (typeof hex !== 'string') return '14,245,194'
  const normalized = hex.trim().replace('#', '')
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return '14,245,194'
  const r = parseInt(normalized.slice(0, 2), 16)
  const g = parseInt(normalized.slice(2, 4), 16)
  const b = parseInt(normalized.slice(4, 6), 16)
  return `${r},${g},${b}`
}

function applyLegacyAliases(vars) {
  const primaryRgb = hexToRgbTriplet(vars['--theme-primary'])
  return {
    '--background': vars['--theme-bg'],
    '--foreground': vars['--theme-text'],
    '--card': vars['--theme-shell'],
    '--card-foreground': vars['--theme-text'],
    '--popover': vars['--theme-shell'],
    '--popover-foreground': vars['--theme-text'],
    '--primary': vars['--theme-primary'],
    '--primary-foreground': vars['--theme-ink'],
    '--secondary': vars['--theme-surface'],
    '--secondary-foreground': vars['--theme-text-sec'],
    '--muted': vars['--theme-surface'],
    '--muted-foreground': vars['--theme-text-muted'],
    '--accent-foreground': vars['--theme-ink'],
    '--border': vars['--theme-border'],
    '--input': vars['--theme-border-alt'],
    '--ring': vars['--theme-primary'],
    '--surface': vars['--theme-surface'],
    '--surface-2': vars['--theme-shell'],
    '--primary-shadow': vars['--theme-primary-dim'],
    '--mint': vars['--theme-primary'],
    '--amber': vars['--theme-highlight'],
    '--coral': vars['--theme-warm'],
    '--violet': vars['--theme-mastery'],
    '--bg': vars['--theme-bg'],
    '--bg-elevated': vars['--theme-surface'],
    '--text-primary': vars['--theme-text'],
    '--text-secondary': vars['--theme-text-sec'],
    '--text-tertiary': vars['--theme-text-muted'],
    '--text-quaternary': vars['--theme-text-dead'],
    '--accent': vars['--theme-primary'],
    '--accent-2': vars['--theme-secondary'],
    '--accent-rgb': primaryRgb,
    '--accent-glow': vars['--theme-primary-dim'],
    '--accent-subtle': vars['--theme-primary-dim'],
    '--accent-border': vars['--theme-primary-border'],
    '--danger': vars['--theme-red'],
    '--danger-subtle': 'rgba(255,69,58,0.10)',
    '--danger-border': 'rgba(255,69,58,0.22)',
    '--glass-border': vars['--theme-border'],
    '--glass-border-strong': vars['--theme-primary-border'],
  }
}

function applyRootTheme(themeId = 'default') {
  if (typeof document === 'undefined') return
  const vars = getDashboardThemeVars(themeId)
  Object.entries({ ...vars, ...applyLegacyAliases(vars) }).forEach(([key, value]) => {
    document.documentElement.style.setProperty(key, value)
  })
  document.documentElement.dataset.pathaiTheme = themeId
}

export default function ThemeHydrator() {
  useEffect(() => {
    const syncTheme = () => applyRootTheme(getStoredActiveTheme())
    syncTheme()

    window.addEventListener('storage', syncTheme)
    window.addEventListener('pathai-theme-changed', syncTheme)
    return () => {
      window.removeEventListener('storage', syncTheme)
      window.removeEventListener('pathai-theme-changed', syncTheme)
    }
  }, [])

  return null
}
