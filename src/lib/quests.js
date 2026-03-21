// ─── Daily Quest Generation ─────────────────────────────────────────────────
// Generates 3 quests per day (1 easy, 1 medium, 1 hard) with deterministic
// selection based on day number so quests are stable for a given day.

const EASY_TEMPLATES = [
  { type: 'xp_earned',        desc: 'Earn {t} XP today',   minT: 30,  maxT: 60,  reward: 10 },
  { type: 'tasks_completed',  desc: 'Complete {t} tasks',  minT: 2,   maxT: 3,   reward: 10 },
  { type: 'tasks_completed',  desc: 'Complete {t} tasks',  minT: 1,   maxT: 2,   reward: 10 },
]

const MEDIUM_TEMPLATES = [
  { type: 'tasks_completed',  desc: 'Complete {t} tasks without losing a heart', minT: 2, maxT: 3, reward: 15 },
  { type: 'complete_review',  desc: 'Complete a review task',                     minT: 1, maxT: 1, reward: 15 },
  { type: 'gems_earned',      desc: 'Earn {t} gems today',                       minT: 10, maxT: 20, reward: 15 },
]

const HARD_TEMPLATES = [
  { type: 'quiz_perfect',   desc: 'Score 100% on a quiz',     minT: 1, maxT: 1, reward: 20 },
  { type: 'complete_all',   desc: 'Complete all daily tasks',  minT: 1, maxT: 1, reward: 20 },
  { type: 'xp_earned',      desc: 'Earn {t} XP today',        minT: 80, maxT: 120, reward: 20 },
]

// Simple seeded pseudo-random (mulberry32-like)
function seeded(s) {
  s = (s + 0x6D2B79F5) | 0
  let t = Math.imul(s ^ (s >>> 15), 1 | s)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

export function generateDailyQuests(dayNumber, taskCount = 4) {
  const s1 = seeded(dayNumber * 7 + 3)
  const s2 = seeded(dayNumber * 13 + 17)
  const s3 = seeded(dayNumber * 23 + 31)

  const pick = (arr, s) => arr[Math.floor(s * arr.length)]
  const inRange = (min, max, s) => min + Math.floor(s * (max - min + 1))

  const easy   = pick(EASY_TEMPLATES,   s1)
  const medium = pick(MEDIUM_TEMPLATES, s2)
  const hard   = pick(HARD_TEMPLATES,   s3)

  const make = (tmpl, id, s) => {
    const target = tmpl.type === 'complete_all'
      ? taskCount
      : inRange(tmpl.minT, tmpl.maxT, s)
    return {
      id,
      type: tmpl.type,
      description: tmpl.desc.replace('{t}', target),
      target,
      current: 0,
      reward: tmpl.reward,
      completed: false,
    }
  }

  return [
    make(easy,   'q1', seeded(dayNumber * 5 + 1)),
    make(medium, 'q2', seeded(dayNumber * 11 + 7)),
    make(hard,   'q3', seeded(dayNumber * 19 + 13)),
  ]
}

export const QUEST_MASTER_BONUS = 30

// ─── Quest Progress Updater ──────────────────────────────────────────────────
// Called from /api/complete after a task is completed.
// Returns { updatedQuests, questsJustCompleted, questMasterBonus }
export function updateQuestProgress(quests, event) {
  if (!Array.isArray(quests) || quests.length === 0) return null

  const prevCompleted = quests.filter(q => q.completed).length
  let gemsFromQuests = 0

  const updated = quests.map(q => {
    if (q.completed) return q

    let increment = 0

    switch (q.type) {
      case 'tasks_completed':
        increment = 1
        break
      case 'xp_earned':
        increment = event.xpEarned || 0
        break
      case 'gems_earned':
        increment = event.gemsEarned || 0
        break
      case 'complete_all':
        if (event.missionComplete) increment = 1
        break
      case 'complete_review':
        if (event.taskType === 'review') increment = 1
        break
      case 'quiz_perfect':
        // Tracked client-side or via optional flag
        if (event.quizPerfect) increment = 1
        break
    }

    if (increment <= 0) return q

    const newCurrent = Math.min(q.current + increment, q.target)
    const justCompleted = newCurrent >= q.target && !q.completed
    if (justCompleted) gemsFromQuests += q.reward

    return { ...q, current: newCurrent, completed: newCurrent >= q.target }
  })

  const nowCompleted = updated.filter(q => q.completed).length
  const questMasterBonus = nowCompleted === updated.length && prevCompleted < updated.length

  if (questMasterBonus) gemsFromQuests += QUEST_MASTER_BONUS

  return {
    updatedQuests: updated,
    questsJustCompleted: updated.filter((q, i) => q.completed && !quests[i].completed),
    questMasterBonus,
    gemsFromQuests,
  }
}
