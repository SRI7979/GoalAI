// ─── Streak System ────────────────────────────────────────────────────────────
// Humane streak logic: grace window, freeze support, vacation mode, comeback shield

const GRACE_HOURS = 4 // hours after midnight that count as "yesterday"

// ─── Core update ──────────────────────────────────────────────────────────────
// Called server-side when a task is completed.
// Returns the new streak state to persist.
export function computeStreakUpdate({
  lastActivityDate,
  currentStreak,
  longestStreak,
}) {
  const now      = new Date()
  const todayStr = now.toISOString().split('T')[0]

  // First activity ever
  if (!lastActivityDate) {
    return {
      newStreak:    1,
      newLongest:   Math.max(1, longestStreak || 0),
      streakChanged: true,
      broken:       false,
      todayStr,
    }
  }

  // Already completed something today — no change
  if (lastActivityDate === todayStr) {
    return {
      newStreak:    currentStreak,
      newLongest:   longestStreak,
      streakChanged: false,
      broken:       false,
      todayStr,
    }
  }

  const last     = new Date(lastActivityDate + 'T00:00:00')
  const diffDays = (now - last) / (1000 * 60 * 60 * 24)

  // Within 1 day + grace window → consecutive, increment
  const graceDeadline = 1 + GRACE_HOURS / 24
  if (diffDays <= graceDeadline) {
    const newStreak  = (currentStreak || 0) + 1
    const newLongest = Math.max(newStreak, longestStreak || 0)
    return { newStreak, newLongest, streakChanged: true, broken: false, todayStr }
  }

  // More than 1 day + grace → broken, reset to 1
  return {
    newStreak:    1,
    newLongest:   longestStreak || 0,
    streakChanged: true,
    broken:       true,
    todayStr,
  }
}

// ─── Milestone detection ──────────────────────────────────────────────────────
export function isStreakMilestone(streak) {
  return Number(streak) > 0 && Number(streak) % 7 === 0
}

// ─── Streak status label (for UI) ─────────────────────────────────────────────
export function streakStatusLabel(current) {
  if (!current || current === 0) return null
  if (current < 3)  return `${current}-day streak`
  if (current < 7)  return `${current}-day streak 🔥`
  if (current < 14) return `${current}-day streak — on fire!`
  if (current < 30) return `${current} days — incredible`
  return `${current} days — legendary`
}

// ─── Freeze helpers (client-side) ─────────────────────────────────────────────
export function canUseFreeze(freezeCount) {
  return Number(freezeCount) > 0
}

export function freezeMessage(freezesRemaining) {
  if (!freezesRemaining || freezesRemaining <= 0) return null
  return `${freezesRemaining} streak freeze${freezesRemaining === 1 ? '' : 's'} remaining`
}
