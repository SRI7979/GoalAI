// ─── XP System ────────────────────────────────────────────────────────────────
// XP per task type — higher XP for higher-effort task types
export const XP_PER_TYPE = {
  lesson:   20,
  video:    15,
  practice: 25,
  exercise: 30,
  quiz:     35,
  review:   20,
}

export const XP_DEFAULT         = 20
export const XP_MISSION_BONUS   = 50   // all tasks completed in a day
export const XP_STREAK_7_BONUS  = 100  // every 7-day streak milestone
export const XP_PERFECT_WEEK    = 200  // 7/7 days in a calendar week
export const XP_CAPSTONE_BONUS  = 150  // boss / capstone task completion

// Cumulative XP required to REACH each level (1-indexed, level 1 = 0 XP)
// Designed to feel fast early, then steady — avoids both instant-max and grind
const THRESHOLDS = [
  0,       // L1   (100 to next)
  100,     // L2   (150)
  250,     // L3   (250)
  500,     // L4   (400)
  900,     // L5   (600)
  1500,    // L6   (800)
  2300,    // L7   (1000)
  3300,    // L8   (1300)
  4600,    // L9   (1600)
  6200,    // L10  (2000)
  8200,    // L11  (2500)
  10700,   // L12  (3000)
  13700,   // L13  (3500)
  17200,   // L14  (4000)
  21200,   // L15  (5000)
  26200,   // L16  (5000)
  31200,   // L17  (6000)
  37200,   // L18  (7000)
  44200,   // L19  (8000)
  52200,   // L20  (max)
]

export const LEVEL_TITLES = [
  'Beginner',
  'Explorer',
  'Learner',
  'Student',
  'Practitioner',
  'Apprentice',
  'Journeyman',
  'Adept',
  'Specialist',
  'Expert',
  'Master',
  'Grandmaster',
  'Sage',
  'Luminary',
  'Legend',
  'Mythic',
  'Transcendent',
  'Arcane',
  'Eternal',
  'Apex',
]

// ─── Core calculations ─────────────────────────────────────────────────────────

export function getLevel(totalXp) {
  const xp = Math.max(0, Number(totalXp) || 0)
  for (let i = THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= THRESHOLDS[i]) return i + 1
  }
  return 1
}

export function getLevelProgress(totalXp) {
  const xp = Math.max(0, Number(totalXp) || 0)
  const level = getLevel(xp)
  const currentFloor = THRESHOLDS[level - 1] ?? 0
  const nextFloor    = THRESHOLDS[level] ?? (THRESHOLDS[THRESHOLDS.length - 1] + 10000)
  const xpInLevel  = xp - currentFloor
  const xpForLevel = nextFloor - currentFloor
  return {
    level,
    title:      LEVEL_TITLES[Math.min(level - 1, LEVEL_TITLES.length - 1)],
    xpInLevel,
    xpForLevel,
    pct:     Math.min(1, xpInLevel / xpForLevel),
    totalXp: xp,
  }
}

export function xpForTask(type) {
  return XP_PER_TYPE[String(type || '').toLowerCase()] ?? XP_DEFAULT
}

// Compute total XP earned from a set of daily_task rows (for initial load)
export function computeTotalXpFromRows(taskRows) {
  if (!Array.isArray(taskRows)) return 0
  return taskRows.reduce((acc, row) => {
    const tasks = Array.isArray(row.tasks) ? row.tasks : []
    return acc + tasks.filter((t) => t.completed).reduce((s, t) => s + xpForTask(t.type), 0)
  }, 0)
}

// Return mission XP reward preview (sum of task XP + mission bonus)
export function missionXpReward(tasks) {
  if (!Array.isArray(tasks)) return 0
  return tasks.reduce((s, t) => s + xpForTask(t.type), 0) + XP_MISSION_BONUS
}
