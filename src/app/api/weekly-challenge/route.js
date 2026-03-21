// GET /api/weekly-challenge?goalId=...
// Returns current week's challenge, creating one if needed.

import { getSupabaseServerClient } from '@/lib/supabaseServer'

function extractAccessToken(request) {
  const h = request.headers.get('authorization') || request.headers.get('Authorization')
  if (!h || !h.toLowerCase().startsWith('bearer ')) return null
  return h.slice(7).trim() || null
}

const CHALLENGE_POOL = [
  { type: 'tasks_completed',   desc: 'Complete {t} tasks this week',              target: 15, gems: 50,  xp: 100 },
  { type: 'xp_earned',         desc: 'Earn {t} XP this week',                     target: 300, gems: 50,  xp: 100 },
  { type: 'streak_days',       desc: 'Maintain a {t}-day streak this week',       target: 5,  gems: 75,  xp: 150 },
  { type: 'quiz_perfect',      desc: 'Score 100% on {t} quizzes',                 target: 3,  gems: 75,  xp: 150 },
  { type: 'lessons_no_hearts', desc: 'Complete {t} lessons without losing a heart', target: 10, gems: 100, xp: 200 },
]

function getWeekStart() {
  const today = new Date()
  const day = today.getDay()
  const offset = day === 0 ? -6 : 1 - day
  const mon = new Date(today)
  mon.setDate(today.getDate() + offset)
  return mon.toISOString().split('T')[0]
}

// Seeded pick so each user gets a different but stable challenge per week
function pickChallenge(userId, weekStart) {
  let hash = 0
  const seed = userId + weekStart
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0
  }
  return CHALLENGE_POOL[Math.abs(hash) % CHALLENGE_POOL.length]
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const goalId = searchParams.get('goalId')
    const accessToken = extractAccessToken(request) || searchParams.get('token') || null
    const supabase = getSupabaseServerClient({ accessToken })

    if (!goalId) return Response.json({ error: 'Missing goalId' }, { status: 400 })

    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const weekStart = getWeekStart()

    // Check for existing challenge
    const { data: existing } = await supabase
      .from('weekly_challenges')
      .select('*')
      .eq('user_id', user.id)
      .eq('goal_id', goalId)
      .eq('week_start', weekStart)
      .maybeSingle()

    if (existing) {
      return Response.json({ challenge: existing, daysRemaining: getDaysRemaining() })
    }

    // Create new challenge
    const template = pickChallenge(user.id, weekStart)
    const newChallenge = {
      user_id: user.id,
      goal_id: goalId,
      challenge_type: template.type,
      description: template.desc.replace('{t}', template.target),
      target_value: template.target,
      current_value: 0,
      gem_reward: template.gems,
      xp_reward: template.xp,
      week_start: weekStart,
      completed: false,
    }

    const { data: inserted, error: insertErr } = await supabase
      .from('weekly_challenges')
      .insert(newChallenge)
      .select()
      .single()

    if (insertErr) {
      // Might be race condition — try to fetch again
      const { data: retry } = await supabase
        .from('weekly_challenges')
        .select('*')
        .eq('user_id', user.id)
        .eq('goal_id', goalId)
        .eq('week_start', weekStart)
        .maybeSingle()

      if (retry) return Response.json({ challenge: retry, daysRemaining: getDaysRemaining() })
      return Response.json({ error: insertErr.message }, { status: 500 })
    }

    return Response.json({ challenge: inserted, daysRemaining: getDaysRemaining() })
  } catch (err) {
    return Response.json({ error: err?.message || 'Failed to load challenge' }, { status: 500 })
  }
}

function getDaysRemaining() {
  const now = new Date()
  const day = now.getDay()
  // Days until next Sunday (end of week)
  return day === 0 ? 0 : 7 - day
}
