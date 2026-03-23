// ─── Achievement Badge Definitions ──────────────────────────────────────────
// 15 badges across 4 categories with trigger conditions

export const BADGES = [
  // ── Streak Badges ──────────────────────────────────────────────────────────
  {
    id: 'first_spark',
    name: 'First Spark',
    description: 'Complete your first task',
    category: 'streak',
    icon: 'bolt',
    rarity: 'common',
  },
  {
    id: 'week_warrior',
    name: 'Week Warrior',
    description: 'Maintain a 7-day streak',
    category: 'streak',
    icon: 'flame',
    rarity: 'common',
  },
  {
    id: 'fortnight_force',
    name: 'Fortnight Force',
    description: 'Maintain a 14-day streak',
    category: 'streak',
    icon: 'dumbbell',
    rarity: 'rare',
  },
  {
    id: 'monthly_master',
    name: 'Monthly Master',
    description: 'Maintain a 30-day streak',
    category: 'streak',
    icon: 'crown',
    rarity: 'epic',
  },
  {
    id: 'century_legend',
    name: 'Century Legend',
    description: 'Reach a 100-day streak',
    category: 'streak',
    icon: 'trophy',
    rarity: 'legendary',
  },

  // ── Learning Badges ────────────────────────────────────────────────────────
  {
    id: 'quick_study',
    name: 'Quick Study',
    description: 'Complete a lesson in under 3 minutes',
    category: 'learning',
    icon: 'timer',
    rarity: 'rare',
  },
  {
    id: 'perfect_score',
    name: 'Perfect Score',
    description: 'Get 100% on a quiz without losing a heart',
    category: 'learning',
    icon: 'badge',
    rarity: 'rare',
  },
  {
    id: 'combo_king',
    name: 'Combo King',
    description: 'Hit a 5x answer combo in a lesson',
    category: 'learning',
    icon: 'target',
    rarity: 'epic',
  },
  {
    id: 'concept_master',
    name: 'Concept Master',
    description: 'Reach 100% mastery on any concept',
    category: 'learning',
    icon: 'brain',
    rarity: 'epic',
  },

  // ── Progress Badges ────────────────────────────────────────────────────────
  {
    id: 'explorer',
    name: 'Explorer',
    description: 'Start an Explore mode path',
    category: 'progress',
    icon: 'compass',
    rarity: 'common',
  },
  {
    id: 'halfway_hero',
    name: 'Halfway Hero',
    description: 'Reach 50% of your goal timeline',
    category: 'progress',
    icon: 'medal',
    rarity: 'rare',
  },
  {
    id: 'finisher',
    name: 'Finisher',
    description: 'Complete all days of a goal',
    category: 'progress',
    icon: 'graduation',
    rarity: 'epic',
  },
  {
    id: 'level_10',
    name: 'Scholar',
    description: 'Reach Level 10',
    category: 'progress',
    icon: 'book',
    rarity: 'epic',
  },

  // ── Special Badges ─────────────────────────────────────────────────────────
  {
    id: 'night_owl',
    name: 'Night Owl',
    description: 'Complete a task after 10 PM',
    category: 'special',
    icon: 'moon',
    rarity: 'common',
  },
  {
    id: 'early_bird',
    name: 'Early Bird',
    description: 'Complete a task before 7 AM',
    category: 'special',
    icon: 'sunrise',
    rarity: 'common',
  },
]

export const BADGE_MAP = Object.fromEntries(BADGES.map(b => [b.id, b]))

export const RARITY_COLORS = {
  common:    '#0ef5c2',  // teal
  rare:      '#60A5FA',  // blue
  epic:      '#A855F7',  // purple
  legendary: '#FFD700',  // gold
}

// ─── Badge Checking ─────────────────────────────────────────────────────────
// Runs after task completion to check all badge triggers against current state.
// Returns array of newly earned badge IDs.

export async function checkAndAwardBadges({ supabase, userId, state }) {
  const {
    streak = 0,
    level = 1,
    totalTasksCompleted = 0,
    missionJustCompleted = false,
    taskType = '',
    goalMode = 'goal',
    clientHour = -1,
    completedDays = 0,
    totalDays = 0,
    conceptMasteryScore = 0,
    comboMax = 0,
    quizPerfect = false,
    lessonTimeSec = 0,
  } = state

  // Fetch already-earned badges for this user (across all goals)
  const { data: existing } = await supabase
    .from('achievements')
    .select('badge_id')
    .eq('user_id', userId)

  const earned = new Set((existing || []).map(r => r.badge_id))
  const newBadges = []

  function check(badgeId, condition) {
    if (!earned.has(badgeId) && condition) newBadges.push(badgeId)
  }

  // Streak badges
  check('first_spark', totalTasksCompleted >= 1)
  check('week_warrior', streak >= 7)
  check('fortnight_force', streak >= 14)
  check('monthly_master', streak >= 30)
  check('century_legend', streak >= 100)

  // Learning badges
  check('quick_study', taskType === 'lesson' && lessonTimeSec > 0 && lessonTimeSec < 180)
  check('perfect_score', quizPerfect)
  check('combo_king', comboMax >= 5)
  check('concept_master', conceptMasteryScore >= 100)

  // Progress badges
  check('explorer', goalMode === 'explore')
  check('halfway_hero', totalDays > 0 && completedDays >= Math.floor(totalDays / 2))
  check('finisher', totalDays > 0 && completedDays >= totalDays)
  check('level_10', level >= 10)

  // Special badges (time-of-day)
  check('night_owl', clientHour >= 22)
  check('early_bird', clientHour >= 0 && clientHour < 7)

  // Persist new badges
  if (newBadges.length > 0) {
    const rows = newBadges.map(badgeId => ({
      user_id: userId,
      badge_id: badgeId,
    }))
    await supabase.from('achievements').insert(rows).select()
  }

  return newBadges.map(id => BADGE_MAP[id]).filter(Boolean)
}
