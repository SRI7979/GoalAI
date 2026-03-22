export const THEME_STORAGE_KEYS = {
  owned: 'pathai.ownedThemes',
  active: 'pathai.activeTheme',
}

export const PURCHASABLE_THEME_IDS = ['themeOcean', 'themeSunset', 'themeForest', 'themeMidnight', 'themeRose']

const WORLD_META = [
  { name: 'Foundation', emoji: '🌱', label: 'START HERE' },
  { name: 'Explorer', emoji: '🔭', label: 'LEVEL UP' },
  { name: 'Builder', emoji: '🔨', label: 'BUILD IT' },
  { name: 'Practitioner', emoji: '⚡', label: 'DEEP WORK' },
  { name: 'Master', emoji: '🔥', label: 'MASTERY' },
]

const PATH_WORLD_COLORS = {
  default: [
    {
      accent: '#22D3A5',
      dark: '#0d7a5f',
      glow: 'rgba(34,211,165,0.50)',
      bg: 'linear-gradient(160deg,rgba(34,211,165,0.14) 0%,rgba(16,185,129,0.06) 100%)',
      strip: 'rgba(34,211,165,0.10)',
      node: '#22D3A5',
      lock: 'rgba(34,211,165,0.18)',
    },
    {
      accent: '#60A5FA',
      dark: '#1d4ed8',
      glow: 'rgba(96,165,250,0.50)',
      bg: 'linear-gradient(160deg,rgba(96,165,250,0.14) 0%,rgba(99,102,241,0.06) 100%)',
      strip: 'rgba(96,165,250,0.10)',
      node: '#60A5FA',
      lock: 'rgba(96,165,250,0.18)',
    },
    {
      accent: '#C084FC',
      dark: '#7c3aed',
      glow: 'rgba(192,132,252,0.50)',
      bg: 'linear-gradient(160deg,rgba(192,132,252,0.14) 0%,rgba(139,92,246,0.06) 100%)',
      strip: 'rgba(192,132,252,0.10)',
      node: '#C084FC',
      lock: 'rgba(192,132,252,0.18)',
    },
    {
      accent: '#FBBF24',
      dark: '#b45309',
      glow: 'rgba(251,191,36,0.50)',
      bg: 'linear-gradient(160deg,rgba(251,191,36,0.14) 0%,rgba(245,158,11,0.06) 100%)',
      strip: 'rgba(251,191,36,0.10)',
      node: '#FBBF24',
      lock: 'rgba(251,191,36,0.18)',
    },
    {
      accent: '#FB923C',
      dark: '#c2410c',
      glow: 'rgba(251,146,60,0.50)',
      bg: 'linear-gradient(160deg,rgba(251,146,60,0.14) 0%,rgba(239,68,68,0.06) 100%)',
      strip: 'rgba(251,146,60,0.10)',
      node: '#FB923C',
      lock: 'rgba(251,146,60,0.18)',
    },
  ],
  themeOcean: [
    {
      accent: '#67E8F9',
      dark: '#0891b2',
      glow: 'rgba(103,232,249,0.46)',
      bg: 'linear-gradient(160deg,rgba(103,232,249,0.18) 0%,rgba(14,116,144,0.08) 100%)',
      strip: 'rgba(103,232,249,0.12)',
      node: '#67E8F9',
      lock: 'rgba(103,232,249,0.20)',
    },
    {
      accent: '#7DD3FC',
      dark: '#0284c7',
      glow: 'rgba(125,211,252,0.46)',
      bg: 'linear-gradient(160deg,rgba(125,211,252,0.18) 0%,rgba(2,132,199,0.08) 100%)',
      strip: 'rgba(125,211,252,0.12)',
      node: '#7DD3FC',
      lock: 'rgba(125,211,252,0.20)',
    },
    {
      accent: '#93C5FD',
      dark: '#2563eb',
      glow: 'rgba(147,197,253,0.46)',
      bg: 'linear-gradient(160deg,rgba(147,197,253,0.18) 0%,rgba(37,99,235,0.08) 100%)',
      strip: 'rgba(147,197,253,0.12)',
      node: '#93C5FD',
      lock: 'rgba(147,197,253,0.20)',
    },
    {
      accent: '#38BDF8',
      dark: '#0369a1',
      glow: 'rgba(56,189,248,0.46)',
      bg: 'linear-gradient(160deg,rgba(56,189,248,0.18) 0%,rgba(3,105,161,0.08) 100%)',
      strip: 'rgba(56,189,248,0.12)',
      node: '#38BDF8',
      lock: 'rgba(56,189,248,0.20)',
    },
    {
      accent: '#22D3EE',
      dark: '#0f766e',
      glow: 'rgba(34,211,238,0.46)',
      bg: 'linear-gradient(160deg,rgba(34,211,238,0.18) 0%,rgba(15,118,110,0.08) 100%)',
      strip: 'rgba(34,211,238,0.12)',
      node: '#22D3EE',
      lock: 'rgba(34,211,238,0.20)',
    },
  ],
  themeSunset: [
    {
      accent: '#FDBA74',
      dark: '#ea580c',
      glow: 'rgba(253,186,116,0.46)',
      bg: 'linear-gradient(160deg,rgba(253,186,116,0.18) 0%,rgba(234,88,12,0.08) 100%)',
      strip: 'rgba(253,186,116,0.12)',
      node: '#FDBA74',
      lock: 'rgba(253,186,116,0.20)',
    },
    {
      accent: '#FB923C',
      dark: '#c2410c',
      glow: 'rgba(251,146,60,0.46)',
      bg: 'linear-gradient(160deg,rgba(251,146,60,0.18) 0%,rgba(194,65,12,0.08) 100%)',
      strip: 'rgba(251,146,60,0.12)',
      node: '#FB923C',
      lock: 'rgba(251,146,60,0.20)',
    },
    {
      accent: '#F97316',
      dark: '#be123c',
      glow: 'rgba(249,115,22,0.46)',
      bg: 'linear-gradient(160deg,rgba(249,115,22,0.18) 0%,rgba(190,24,93,0.08) 100%)',
      strip: 'rgba(249,115,22,0.12)',
      node: '#F97316',
      lock: 'rgba(249,115,22,0.20)',
    },
    {
      accent: '#FB7185',
      dark: '#e11d48',
      glow: 'rgba(251,113,133,0.46)',
      bg: 'linear-gradient(160deg,rgba(251,113,133,0.18) 0%,rgba(225,29,72,0.08) 100%)',
      strip: 'rgba(251,113,133,0.12)',
      node: '#FB7185',
      lock: 'rgba(251,113,133,0.20)',
    },
    {
      accent: '#F59E0B',
      dark: '#d97706',
      glow: 'rgba(245,158,11,0.46)',
      bg: 'linear-gradient(160deg,rgba(245,158,11,0.18) 0%,rgba(217,119,6,0.08) 100%)',
      strip: 'rgba(245,158,11,0.12)',
      node: '#F59E0B',
      lock: 'rgba(245,158,11,0.20)',
    },
  ],
  themeForest: [
    {
      accent: '#4ADE80',
      dark: '#166534',
      glow: 'rgba(74,222,128,0.46)',
      bg: 'linear-gradient(160deg,rgba(74,222,128,0.18) 0%,rgba(22,101,52,0.08) 100%)',
      strip: 'rgba(74,222,128,0.12)',
      node: '#4ADE80',
      lock: 'rgba(74,222,128,0.20)',
    },
    {
      accent: '#22C55E',
      dark: '#15803d',
      glow: 'rgba(34,197,94,0.46)',
      bg: 'linear-gradient(160deg,rgba(34,197,94,0.18) 0%,rgba(21,128,61,0.08) 100%)',
      strip: 'rgba(34,197,94,0.12)',
      node: '#22C55E',
      lock: 'rgba(34,197,94,0.20)',
    },
    {
      accent: '#84CC16',
      dark: '#4d7c0f',
      glow: 'rgba(132,204,22,0.46)',
      bg: 'linear-gradient(160deg,rgba(132,204,22,0.18) 0%,rgba(77,124,15,0.08) 100%)',
      strip: 'rgba(132,204,22,0.12)',
      node: '#84CC16',
      lock: 'rgba(132,204,22,0.20)',
    },
    {
      accent: '#34D399',
      dark: '#0f766e',
      glow: 'rgba(52,211,153,0.46)',
      bg: 'linear-gradient(160deg,rgba(52,211,153,0.18) 0%,rgba(15,118,110,0.08) 100%)',
      strip: 'rgba(52,211,153,0.12)',
      node: '#34D399',
      lock: 'rgba(52,211,153,0.20)',
    },
    {
      accent: '#65A30D',
      dark: '#365314',
      glow: 'rgba(101,163,13,0.46)',
      bg: 'linear-gradient(160deg,rgba(101,163,13,0.18) 0%,rgba(54,83,20,0.08) 100%)',
      strip: 'rgba(101,163,13,0.12)',
      node: '#65A30D',
      lock: 'rgba(101,163,13,0.20)',
    },
  ],
  themeMidnight: [
    {
      accent: '#A78BFA',
      dark: '#4338ca',
      glow: 'rgba(167,139,250,0.46)',
      bg: 'linear-gradient(160deg,rgba(167,139,250,0.18) 0%,rgba(67,56,202,0.08) 100%)',
      strip: 'rgba(167,139,250,0.12)',
      node: '#A78BFA',
      lock: 'rgba(167,139,250,0.20)',
    },
    {
      accent: '#818CF8',
      dark: '#3730a3',
      glow: 'rgba(129,140,248,0.46)',
      bg: 'linear-gradient(160deg,rgba(129,140,248,0.18) 0%,rgba(55,48,163,0.08) 100%)',
      strip: 'rgba(129,140,248,0.12)',
      node: '#818CF8',
      lock: 'rgba(129,140,248,0.20)',
    },
    {
      accent: '#60A5FA',
      dark: '#1d4ed8',
      glow: 'rgba(96,165,250,0.46)',
      bg: 'linear-gradient(160deg,rgba(96,165,250,0.18) 0%,rgba(29,78,216,0.08) 100%)',
      strip: 'rgba(96,165,250,0.12)',
      node: '#60A5FA',
      lock: 'rgba(96,165,250,0.20)',
    },
    {
      accent: '#38BDF8',
      dark: '#0f172a',
      glow: 'rgba(56,189,248,0.46)',
      bg: 'linear-gradient(160deg,rgba(56,189,248,0.18) 0%,rgba(15,23,42,0.10) 100%)',
      strip: 'rgba(56,189,248,0.12)',
      node: '#38BDF8',
      lock: 'rgba(56,189,248,0.20)',
    },
    {
      accent: '#C084FC',
      dark: '#6d28d9',
      glow: 'rgba(192,132,252,0.46)',
      bg: 'linear-gradient(160deg,rgba(192,132,252,0.18) 0%,rgba(109,40,217,0.08) 100%)',
      strip: 'rgba(192,132,252,0.12)',
      node: '#C084FC',
      lock: 'rgba(192,132,252,0.20)',
    },
  ],
  themeRose: [
    {
      accent: '#F9A8D4',
      dark: '#be185d',
      glow: 'rgba(249,168,212,0.46)',
      bg: 'linear-gradient(160deg,rgba(249,168,212,0.18) 0%,rgba(190,24,93,0.08) 100%)',
      strip: 'rgba(249,168,212,0.12)',
      node: '#F9A8D4',
      lock: 'rgba(249,168,212,0.20)',
    },
    {
      accent: '#FDA4AF',
      dark: '#e11d48',
      glow: 'rgba(253,164,175,0.46)',
      bg: 'linear-gradient(160deg,rgba(253,164,175,0.18) 0%,rgba(225,29,72,0.08) 100%)',
      strip: 'rgba(253,164,175,0.12)',
      node: '#FDA4AF',
      lock: 'rgba(253,164,175,0.20)',
    },
    {
      accent: '#FBCFE8',
      dark: '#db2777',
      glow: 'rgba(251,207,232,0.46)',
      bg: 'linear-gradient(160deg,rgba(251,207,232,0.18) 0%,rgba(219,39,119,0.08) 100%)',
      strip: 'rgba(251,207,232,0.12)',
      node: '#FBCFE8',
      lock: 'rgba(251,207,232,0.20)',
    },
    {
      accent: '#F472B6',
      dark: '#9d174d',
      glow: 'rgba(244,114,182,0.46)',
      bg: 'linear-gradient(160deg,rgba(244,114,182,0.18) 0%,rgba(157,23,77,0.08) 100%)',
      strip: 'rgba(244,114,182,0.12)',
      node: '#F472B6',
      lock: 'rgba(244,114,182,0.20)',
    },
    {
      accent: '#FB7185',
      dark: '#e11d48',
      glow: 'rgba(251,113,133,0.46)',
      bg: 'linear-gradient(160deg,rgba(251,113,133,0.18) 0%,rgba(225,29,72,0.08) 100%)',
      strip: 'rgba(251,113,133,0.12)',
      node: '#FB7185',
      lock: 'rgba(251,113,133,0.20)',
    },
  ],
}

export const APP_THEMES = {
  default: {
    id: 'default',
    name: 'Default',
    description: 'Classic neon PathAI',
    dashboardVars: {
      '--theme-bg': '#06060f',
      '--theme-shell': '#0f1220',
      '--theme-chrome': 'rgba(6,6,15,0.92)',
      '--theme-page-glow': 'rgba(14,245,194,0.14)',
      '--theme-surface': 'rgba(255,255,255,0.04)',
      '--theme-border': 'rgba(255,255,255,0.08)',
      '--theme-border-alt': 'rgba(255,255,255,0.05)',
      '--theme-primary': '#0ef5c2',
      '--theme-primary-dim': 'rgba(14,245,194,0.10)',
      '--theme-primary-border': 'rgba(14,245,194,0.22)',
      '--theme-secondary': '#00d4ff',
      '--theme-warm': '#FF6B35',
      '--theme-warm-dim': 'rgba(255,107,53,0.08)',
      '--theme-warm-border': 'rgba(255,107,53,0.22)',
      '--theme-highlight': '#FBBF24',
      '--theme-mastery': '#818CF8',
      '--theme-mastery-strong': '#6366F1',
      '--theme-mastery-dim': 'rgba(129,140,248,0.10)',
      '--theme-mastery-border': 'rgba(129,140,248,0.22)',
      '--theme-text': '#F1F5F9',
      '--theme-text-sec': '#94A3B8',
      '--theme-text-muted': '#475569',
      '--theme-text-dead': '#334155',
      '--theme-red': '#FF453A',
      '--theme-ink': '#06060f',
    },
  },
  themeOcean: {
    id: 'themeOcean',
    name: 'Ocean',
    description: 'Blue tidal glass',
    dashboardVars: {
      '--theme-bg': '#041521',
      '--theme-shell': '#071b2c',
      '--theme-chrome': 'rgba(4,21,33,0.92)',
      '--theme-page-glow': 'rgba(56,189,248,0.18)',
      '--theme-surface': 'rgba(125,211,252,0.08)',
      '--theme-border': 'rgba(125,211,252,0.18)',
      '--theme-border-alt': 'rgba(125,211,252,0.10)',
      '--theme-primary': '#7DD3FC',
      '--theme-primary-dim': 'rgba(125,211,252,0.12)',
      '--theme-primary-border': 'rgba(125,211,252,0.28)',
      '--theme-secondary': '#38BDF8',
      '--theme-warm': '#22D3EE',
      '--theme-warm-dim': 'rgba(34,211,238,0.10)',
      '--theme-warm-border': 'rgba(34,211,238,0.24)',
      '--theme-highlight': '#67E8F9',
      '--theme-mastery': '#93C5FD',
      '--theme-mastery-strong': '#2563EB',
      '--theme-mastery-dim': 'rgba(147,197,253,0.12)',
      '--theme-mastery-border': 'rgba(147,197,253,0.28)',
      '--theme-text': '#E0F2FE',
      '--theme-text-sec': '#BAE6FD',
      '--theme-text-muted': '#7DD3FC',
      '--theme-text-dead': '#3B82F6',
      '--theme-red': '#FB7185',
      '--theme-ink': '#021018',
    },
  },
  themeSunset: {
    id: 'themeSunset',
    name: 'Sunset',
    description: 'Amber dusk glow',
    dashboardVars: {
      '--theme-bg': '#18090c',
      '--theme-shell': '#241015',
      '--theme-chrome': 'rgba(24,9,12,0.92)',
      '--theme-page-glow': 'rgba(251,146,60,0.18)',
      '--theme-surface': 'rgba(251,146,60,0.08)',
      '--theme-border': 'rgba(251,146,60,0.20)',
      '--theme-border-alt': 'rgba(251,146,60,0.10)',
      '--theme-primary': '#FDBA74',
      '--theme-primary-dim': 'rgba(253,186,116,0.14)',
      '--theme-primary-border': 'rgba(253,186,116,0.28)',
      '--theme-secondary': '#FB923C',
      '--theme-warm': '#F97316',
      '--theme-warm-dim': 'rgba(249,115,22,0.10)',
      '--theme-warm-border': 'rgba(249,115,22,0.24)',
      '--theme-highlight': '#FDE68A',
      '--theme-mastery': '#FB7185',
      '--theme-mastery-strong': '#EC4899',
      '--theme-mastery-dim': 'rgba(251,113,133,0.12)',
      '--theme-mastery-border': 'rgba(251,113,133,0.28)',
      '--theme-text': '#FFF1E6',
      '--theme-text-sec': '#FED7AA',
      '--theme-text-muted': '#FDBA74',
      '--theme-text-dead': '#FB7185',
      '--theme-red': '#FF6B6B',
      '--theme-ink': '#190b08',
    },
  },
  themeForest: {
    id: 'themeForest',
    name: 'Forest',
    description: 'Emerald canopy glow',
    dashboardVars: {
      '--theme-bg': '#07140c',
      '--theme-shell': '#0d1d12',
      '--theme-chrome': 'rgba(7,20,12,0.92)',
      '--theme-page-glow': 'rgba(74,222,128,0.18)',
      '--theme-surface': 'rgba(74,222,128,0.08)',
      '--theme-border': 'rgba(74,222,128,0.18)',
      '--theme-border-alt': 'rgba(74,222,128,0.10)',
      '--theme-primary': '#4ADE80',
      '--theme-primary-dim': 'rgba(74,222,128,0.12)',
      '--theme-primary-border': 'rgba(74,222,128,0.28)',
      '--theme-secondary': '#34D399',
      '--theme-warm': '#84CC16',
      '--theme-warm-dim': 'rgba(132,204,22,0.10)',
      '--theme-warm-border': 'rgba(132,204,22,0.22)',
      '--theme-highlight': '#BBF7D0',
      '--theme-mastery': '#86EFAC',
      '--theme-mastery-strong': '#15803D',
      '--theme-mastery-dim': 'rgba(134,239,172,0.12)',
      '--theme-mastery-border': 'rgba(134,239,172,0.28)',
      '--theme-text': '#ECFDF5',
      '--theme-text-sec': '#D1FAE5',
      '--theme-text-muted': '#86EFAC',
      '--theme-text-dead': '#4ADE80',
      '--theme-red': '#FB7185',
      '--theme-ink': '#06100a',
    },
  },
  themeMidnight: {
    id: 'themeMidnight',
    name: 'Midnight',
    description: 'Indigo night neon',
    dashboardVars: {
      '--theme-bg': '#070914',
      '--theme-shell': '#0f1223',
      '--theme-chrome': 'rgba(7,9,20,0.92)',
      '--theme-page-glow': 'rgba(129,140,248,0.18)',
      '--theme-surface': 'rgba(129,140,248,0.08)',
      '--theme-border': 'rgba(129,140,248,0.18)',
      '--theme-border-alt': 'rgba(129,140,248,0.10)',
      '--theme-primary': '#A78BFA',
      '--theme-primary-dim': 'rgba(167,139,250,0.12)',
      '--theme-primary-border': 'rgba(167,139,250,0.28)',
      '--theme-secondary': '#60A5FA',
      '--theme-warm': '#38BDF8',
      '--theme-warm-dim': 'rgba(56,189,248,0.10)',
      '--theme-warm-border': 'rgba(56,189,248,0.22)',
      '--theme-highlight': '#C4B5FD',
      '--theme-mastery': '#C084FC',
      '--theme-mastery-strong': '#4338CA',
      '--theme-mastery-dim': 'rgba(192,132,252,0.12)',
      '--theme-mastery-border': 'rgba(192,132,252,0.28)',
      '--theme-text': '#EEF2FF',
      '--theme-text-sec': '#C7D2FE',
      '--theme-text-muted': '#A5B4FC',
      '--theme-text-dead': '#818CF8',
      '--theme-red': '#FB7185',
      '--theme-ink': '#050713',
    },
  },
  themeRose: {
    id: 'themeRose',
    name: 'Rose',
    description: 'Soft pink electric glow',
    dashboardVars: {
      '--theme-bg': '#160810',
      '--theme-shell': '#21111a',
      '--theme-chrome': 'rgba(22,8,16,0.92)',
      '--theme-page-glow': 'rgba(249,168,212,0.18)',
      '--theme-surface': 'rgba(249,168,212,0.08)',
      '--theme-border': 'rgba(249,168,212,0.18)',
      '--theme-border-alt': 'rgba(249,168,212,0.10)',
      '--theme-primary': '#F9A8D4',
      '--theme-primary-dim': 'rgba(249,168,212,0.12)',
      '--theme-primary-border': 'rgba(249,168,212,0.28)',
      '--theme-secondary': '#FB7185',
      '--theme-warm': '#FDA4AF',
      '--theme-warm-dim': 'rgba(253,164,175,0.10)',
      '--theme-warm-border': 'rgba(253,164,175,0.22)',
      '--theme-highlight': '#FBCFE8',
      '--theme-mastery': '#F472B6',
      '--theme-mastery-strong': '#BE185D',
      '--theme-mastery-dim': 'rgba(244,114,182,0.12)',
      '--theme-mastery-border': 'rgba(244,114,182,0.28)',
      '--theme-text': '#FFF1F5',
      '--theme-text-sec': '#FBCFE8',
      '--theme-text-muted': '#FDA4AF',
      '--theme-text-dead': '#F472B6',
      '--theme-red': '#FB7185',
      '--theme-ink': '#18080f',
    },
  },
}

export function normalizeThemeId(themeId) {
  return APP_THEMES[themeId] ? themeId : 'default'
}

export function getDashboardThemeVars(themeId = 'default') {
  return APP_THEMES[normalizeThemeId(themeId)].dashboardVars
}

export function getPathWorlds(themeId = 'default') {
  const key = normalizeThemeId(themeId)
  return WORLD_META.map((world, index) => ({
    ...world,
    ...PATH_WORLD_COLORS[key][index],
  }))
}

export function getStoredOwnedThemes() {
  if (typeof window === 'undefined') return []
  try {
    const parsed = JSON.parse(localStorage.getItem(THEME_STORAGE_KEYS.owned) || '[]')
    if (!Array.isArray(parsed)) return []
    return Array.from(new Set(parsed.filter((themeId) => PURCHASABLE_THEME_IDS.includes(themeId))))
  } catch {
    return []
  }
}

export function setStoredOwnedThemes(themeIds) {
  if (typeof window === 'undefined') return
  const clean = Array.from(new Set((themeIds || []).filter((themeId) => PURCHASABLE_THEME_IDS.includes(themeId))))
  localStorage.setItem(THEME_STORAGE_KEYS.owned, JSON.stringify(clean))
}

export function unlockStoredTheme(themeId) {
  const cleanThemeId = normalizeThemeId(themeId)
  if (!PURCHASABLE_THEME_IDS.includes(cleanThemeId)) return getStoredOwnedThemes()
  const next = Array.from(new Set([...getStoredOwnedThemes(), cleanThemeId]))
  setStoredOwnedThemes(next)
  return next
}

export function getStoredActiveTheme(ownedThemes = null) {
  if (typeof window === 'undefined') return 'default'
  const allowedThemes = ownedThemes || getStoredOwnedThemes()
  const storedTheme = normalizeThemeId(localStorage.getItem(THEME_STORAGE_KEYS.active) || 'default')
  return storedTheme === 'default' || allowedThemes.includes(storedTheme) ? storedTheme : 'default'
}

export function setStoredActiveTheme(themeId) {
  if (typeof window === 'undefined') return
  localStorage.setItem(THEME_STORAGE_KEYS.active, normalizeThemeId(themeId))
}
