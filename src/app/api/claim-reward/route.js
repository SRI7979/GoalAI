// POST /api/claim-reward
// Claims a daily reward from the 7-day reward calendar.

import { getSupabaseServerClient } from '@/lib/supabaseServer'

function extractAccessToken(request) {
  const h = request.headers.get('authorization') || request.headers.get('Authorization')
  if (!h || !h.toLowerCase().startsWith('bearer ')) return null
  return h.slice(7).trim() || null
}

// Escalating rewards: Mon=5, Tue=8, Wed=10, Thu=12, Fri=15, Sat=20, Sun=chest(30)
const DAY_REWARDS = [5, 8, 10, 12, 15, 20, 30]
const PERFECT_WEEK_BONUS = 50

function getWeekStart() {
  const today = new Date()
  const day = today.getDay()
  const offset = day === 0 ? -6 : 1 - day
  const mon = new Date(today)
  mon.setDate(today.getDate() + offset)
  return mon.toISOString().split('T')[0]
}

function getDayIndex() {
  const day = new Date().getDay()
  // Convert JS day (0=Sun) to calendar index (0=Mon)
  return day === 0 ? 6 : day - 1
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { goalId } = body
    const accessToken = extractAccessToken(request) || body?.accessToken || null
    const supabase = getSupabaseServerClient({ accessToken })

    if (!goalId) return Response.json({ error: 'Missing goalId' }, { status: 400 })

    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    // Fetch progress
    const { data: progress, error: progErr } = await supabase
      .from('user_progress')
      .select('gems,reward_calendar')
      .eq('user_id', user.id)
      .eq('goal_id', goalId)
      .maybeSingle()

    if (progErr || !progress) return Response.json({ error: 'Progress not found' }, { status: 404 })

    const weekStart = getWeekStart()
    const dayIndex = getDayIndex()
    let calendar = progress.reward_calendar || { week_start: null, days_claimed: [] }

    // Reset calendar if new week
    if (calendar.week_start !== weekStart) {
      calendar = { week_start: weekStart, days_claimed: [] }
    }

    // Check if already claimed today
    if (calendar.days_claimed.includes(dayIndex)) {
      return Response.json({ error: 'Already claimed today', calendar }, { status: 400 })
    }

    // Claim
    const reward = DAY_REWARDS[dayIndex]
    calendar.days_claimed.push(dayIndex)
    calendar.days_claimed.sort((a, b) => a - b)

    let totalGems = reward
    const isPerfectWeek = calendar.days_claimed.length === 7
    if (isPerfectWeek) totalGems += PERFECT_WEEK_BONUS

    const currentGems = Number(progress.gems) || 0
    const newGemTotal = currentGems + totalGems

    await supabase
      .from('user_progress')
      .update({ gems: newGemTotal, reward_calendar: calendar })
      .eq('user_id', user.id)
      .eq('goal_id', goalId)

    // Log transaction
    try {
      await supabase.from('gem_transactions').insert({
        user_id: user.id, goal_id: goalId,
        amount: totalGems, reason: isPerfectWeek ? 'perfect_week' : 'daily_calendar',
      })
    } catch { /* non-critical */ }

    return Response.json({
      ok: true,
      dayIndex,
      reward,
      newGemTotal,
      calendar,
      perfectWeek: isPerfectWeek,
      perfectWeekBonus: isPerfectWeek ? PERFECT_WEEK_BONUS : 0,
      isTreasureChest: dayIndex === 6,
    })
  } catch (err) {
    return Response.json({ error: err?.message || 'Failed to claim reward' }, { status: 500 })
  }
}
