import { getCanonicalTaskType } from '@/lib/taskTaxonomy'

// ─── PathAI Analytics System ──────────────────────────────────────────────────
// Lightweight client-side event tracking with Supabase persistence.
// Events are buffered locally and flushed async — never blocks UI.
// Full event taxonomy aligned with D1/D7/D30 retention KPIs.

// ─── Event names ──────────────────────────────────────────────────────────────
export const EVENTS = {
  // Session
  APP_OPENED:              'app_opened',
  // Mission
  MISSION_VIEWED:          'mission_viewed',
  MISSION_COMPLETED:       'mission_completed',
  // Tasks
  TASK_STARTED:            'task_started',
  TASK_COMPLETED:          'task_completed',
  // Lessons
  LESSON_OPENED:           'lesson_opened',
  LESSON_SLIDE_VIEWED:     'lesson_slide_viewed',
  LESSON_COMPLETED:        'lesson_completed',
  QUIZ_ANSWERED:           'quiz_answered',
  ASSISTANT_ASKED:         'assistant_asked',
  // Progression
  LEVEL_UP:                'level_up',
  UNLOCK_EARNED:           'unlock_earned',
  WORLD_UNLOCKED:          'world_unlocked',
  BOSS_STARTED:            'boss_started',
  BOSS_COMPLETED:          'boss_completed',
  // Streaks
  STREAK_INCREMENTED:      'streak_incremented',
  STREAK_SAVED:            'streak_saved',
  STREAK_BROKEN:           'streak_broken',
  STREAK_FREEZE_USED:      'streak_freeze_used',
  STREAK_MILESTONE:        'streak_milestone',
  // Recovery
  COMEBACK_STARTED:        'comeback_started',
  COMEBACK_COMPLETED:      'comeback_completed',
  // Reviews
  REVIEW_COMPLETED:        'review_completed',
  MASTERY_UPDATED:         'mastery_updated',
  // Social
  SHARE_CARD_GENERATED:    'share_card_generated',
  LEADERBOARD_VIEWED:      'leaderboard_viewed',
  FRIEND_ADDED:            'friend_added',
  // Energy
  ENERGY_SELECTED:         'energy_selected',
  // Navigation
  MAP_VIEWED:              'map_viewed',
  STATS_VIEWED:            'stats_viewed',
  // Notifications
  NOTIFICATION_OPENED:     'notification_opened',
  // Path
  PATH_GENERATED:          'path_generated',
  PATH_COMPLETED:          'path_completed',
}

// ─── In-memory buffer ─────────────────────────────────────────────────────────
const _buffer = []
let   _flushTimer = null
const FLUSH_INTERVAL_MS = 5_000
const MAX_BUFFER = 20

// ─── Core track function ──────────────────────────────────────────────────────
/**
 * Track an analytics event.
 * Non-blocking — buffers event and flushes asynchronously.
 *
 * @param {string} eventName  - one of EVENTS.*
 * @param {object} properties - event-specific properties
 * @param {object} ctx        - shared context { userId, goalId, missionId, streakValue, xpBalance, energyMode }
 */
export function track(eventName, properties = {}, ctx = {}) {
  const event = {
    event:            eventName,
    user_id:          ctx.userId        ?? null,
    goal_id:          ctx.goalId        ?? null,
    mission_id:       ctx.missionId     ?? null,
    energy_mode:      ctx.energyMode    ?? null,
    streak_value:     ctx.streakValue   ?? null,
    xp_balance:       ctx.xpBalance     ?? null,
    properties,
    client_timestamp: new Date().toISOString(),
  }

  _buffer.push(event)

  // Also push to localStorage for offline resilience (keep last 100)
  try {
    const stored = JSON.parse(localStorage.getItem('pathai.analytics') || '[]')
    stored.push(event)
    if (stored.length > 100) stored.splice(0, stored.length - 100)
    localStorage.setItem('pathai.analytics', JSON.stringify(stored))
  } catch { /* storage unavailable */ }

  // Schedule flush
  if (_buffer.length >= MAX_BUFFER) {
    _flush()
  } else if (!_flushTimer) {
    _flushTimer = setTimeout(_flush, FLUSH_INTERVAL_MS)
  }
}

// ─── Flush to console (and optionally Supabase) ───────────────────────────────
async function _flush() {
  clearTimeout(_flushTimer)
  _flushTimer = null
  if (_buffer.length === 0) return

  const batch = _buffer.splice(0, _buffer.length)

  // Development: log to console
  if (process.env.NODE_ENV === 'development') {
    batch.forEach(e => {
      console.debug(`[analytics] ${e.event}`, { ...e.properties, user: e.user_id?.slice(0,8) })
    })
  }

  // Persist to Supabase analytics_events table (best-effort, swallow errors)
  try {
    const { supabaseData } = await import('@/lib/supabase')
    await supabaseData.from('analytics_events').insert(
      batch.map(e => ({
        event_name:       e.event,
        user_id:          e.user_id,
        goal_id:          e.goal_id,
        mission_id:       e.mission_id,
        energy_mode:      e.energy_mode,
        streak_value:     e.streak_value,
        xp_balance:       e.xp_balance,
        properties:       e.properties,
        client_timestamp: e.client_timestamp,
      }))
    )
  } catch { /* analytics must never crash the app */ }
}

// ─── Flush on page unload ─────────────────────────────────────────────────────
if (typeof window !== 'undefined') {
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') _flush()
  })
  window.addEventListener('pagehide', _flush, { capture: true })
}

// ─── Convenience wrappers ─────────────────────────────────────────────────────

export function trackTaskCompleted({ userId, goalId, missionId, taskId, taskType, xpEarned, energyMode, streakValue, xpBalance }) {
  track(EVENTS.TASK_COMPLETED, { taskId, taskType: getCanonicalTaskType(taskType), xpEarned }, { userId, goalId, missionId, energyMode, streakValue, xpBalance })
}

export function trackMissionCompleted({ userId, goalId, missionId, totalXp, streakValue, energyMode, dayNumber }) {
  track(EVENTS.MISSION_COMPLETED, { totalXp, dayNumber }, { userId, goalId, missionId, streakValue, energyMode })
}

export function trackStreakEvent(eventName, { userId, goalId, streakValue, frozeUsed = false }) {
  track(eventName, { frozeUsed }, { userId, goalId, streakValue })
}

export function trackLevelUp({ userId, goalId, fromLevel, toLevel, title, xpBalance }) {
  track(EVENTS.LEVEL_UP, { fromLevel, toLevel, title }, { userId, goalId, xpBalance })
}

export function trackEnergySelected({ userId, goalId, energy, previousEnergy }) {
  track(EVENTS.ENERGY_SELECTED, { energy, previousEnergy }, { userId, goalId, energyMode: energy })
}

export function trackAppOpened({ userId, goalId, streakValue, xpBalance, isComeback }) {
  track(EVENTS.APP_OPENED, { isComeback }, { userId, goalId, streakValue, xpBalance })
}

export function trackMapViewed({ userId, goalId, completedDays, totalDays }) {
  track(EVENTS.MAP_VIEWED, { completedDays, totalDays }, { userId, goalId })
}

export function trackStatsViewed({ userId, goalId, streakValue, xpBalance }) {
  track(EVENTS.STATS_VIEWED, {}, { userId, goalId, streakValue, xpBalance })
}
