// ─── PathAI Design Tokens — canonical source of truth ──────────────────────
// Import this in every component instead of redefining the T object locally.
// Usage: import { T } from '@/lib/tokens'

export const T = {
  // ── Backgrounds ──────────────────────────────────────────────────────────
  bg:           '#06060f',
  surface:      'rgba(255,255,255,0.04)',
  card:         'rgba(12,16,24,0.85)',

  // ── Borders ───────────────────────────────────────────────────────────────
  border:       'rgba(255,255,255,0.08)',
  borderAlt:    'rgba(255,255,255,0.05)',
  borderStrong: 'rgba(255,255,255,0.12)',

  // ── Teal (primary action, XP, positive) ──────────────────────────────────
  teal:         '#0ef5c2',
  tealDim:      'rgba(14,245,194,0.10)',
  tealBorder:   'rgba(14,245,194,0.22)',
  tealGlow:     'rgba(14,245,194,0.35)',

  // ── Blue (secondary accent, explore mode) ────────────────────────────────
  blue:         '#00d4ff',
  blueDim:      'rgba(0,212,255,0.10)',
  blueBorder:   'rgba(0,212,255,0.22)',

  // ── Gold (XP, gems, premium) ──────────────────────────────────────────────
  gold:         '#FFD700',
  goldDim:      'rgba(255,215,0,0.10)',
  goldBorder:   'rgba(255,215,0,0.25)',

  // ── Orange (warnings, urgency, decay, streak) ─────────────────────────────
  flame:        '#FF6B35',
  flameDim:     'rgba(255,107,53,0.08)',
  flameBorder:  'rgba(255,107,53,0.22)',
  orange:       '#FF8C42',
  orangeDim:    'rgba(255,140,66,0.10)',
  orangeBorder: 'rgba(255,140,66,0.22)',

  // ── Amber (quizzes, highlights) ───────────────────────────────────────────
  amber:        '#FBBF24',
  amberDim:     'rgba(251,191,36,0.10)',
  amberBorder:  'rgba(251,191,36,0.22)',

  // ── Purple (levels, legendary, rare) ─────────────────────────────────────
  mastery:      '#818CF8',
  masteryDim:   'rgba(129,140,248,0.10)',
  masteryBorder:'rgba(129,140,248,0.22)',
  purple:       '#a855f7',
  purpleDim:    'rgba(168,85,247,0.10)',
  purpleBorder: 'rgba(168,85,247,0.22)',

  // ── Red (hearts, wrong answers, danger) ──────────────────────────────────
  red:          '#ef5060',
  redDim:       'rgba(239,80,96,0.10)',
  redBorder:    'rgba(239,80,96,0.22)',

  // ── Text ──────────────────────────────────────────────────────────────────
  text:         '#F1F5F9',
  textSec:      '#94A3B8',
  textMuted:    '#475569',
  textDead:     '#334155',

  // ── Typography ────────────────────────────────────────────────────────────
  font:         "'Plus Jakarta Sans','DM Sans',system-ui,sans-serif",
  fontMono:     "'JetBrains Mono','Fira Code',Menlo,monospace",

  // ── Border radii ──────────────────────────────────────────────────────────
  r:            20,    // card
  rBtn:         14,    // button
  rPill:        100,   // badge/pill
  rSm:          12,    // small element
}

// ── Heart utilities ──────────────────────────────────────────────────────────
export const HEARTS_MAX = 5

// ── Gem shop prices ───────────────────────────────────────────────────────────
export const GEM_PRICES = {
  streakFreeze:  50,
  heartRefill:   30,
  xpBoost:       75,
  streakRepair:  200,
  pathTheme:     100,
}

// ── Gem award amounts ─────────────────────────────────────────────────────────
export const GEM_AWARDS = {
  mission:       10,
  streakBonus:   5,    // per day at 7+ streak
  badge:         25,
  weeklyChallenge: 50,
}

// ── League tiers ─────────────────────────────────────────────────────────────
export const LEAGUE_TIERS = ['Bronze', 'Silver', 'Gold', 'Diamond', 'Obsidian']
export const LEAGUE_COLORS = {
  Bronze:   { primary: '#CD7F32', dim: 'rgba(205,127,50,0.15)', glow: 'rgba(205,127,50,0.35)' },
  Silver:   { primary: '#C0C0C0', dim: 'rgba(192,192,192,0.15)', glow: 'rgba(192,192,192,0.30)' },
  Gold:     { primary: '#FFD700', dim: 'rgba(255,215,0,0.15)',  glow: 'rgba(255,215,0,0.35)' },
  Diamond:  { primary: '#00d4ff', dim: 'rgba(0,212,255,0.15)',  glow: 'rgba(0,212,255,0.35)' },
  Obsidian: { primary: '#a855f7', dim: 'rgba(168,85,247,0.15)', glow: 'rgba(168,85,247,0.40)' },
}
