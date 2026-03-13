// POST /api/streak-freeze
// Uses one streak freeze from the user's inventory to protect a broken streak.
// Idempotent: if streak was already protected today, returns current state.

import { getSupabaseServerClient } from '@/lib/supabaseServer'
import { computeStreakUpdate } from '@/lib/streak'

function extractAccessToken(request) {
  const h = request.headers.get('authorization') || request.headers.get('Authorization')
  if (!h || !h.toLowerCase().startsWith('bearer ')) return null
  return h.slice(7).trim() || null
}

export async function POST(request) {
  try {
    const body        = await request.json()
    const { goalId }  = body
    const accessToken = extractAccessToken(request) || body?.accessToken || null
    const supabase    = getSupabaseServerClient({ accessToken })

    if (!goalId) return Response.json({ error: 'Missing goalId' }, { status: 400 })

    // ── Auth check ─────────────────────────────────────────────────────────────
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    // ── Fetch current progress ──────────────────────────────────────────────────
    const { data: progress, error: progErr } = await supabase
      .from('user_progress')
      .select('total_xp,current_streak,longest_streak,last_activity_date,freeze_count')
      .eq('user_id', user.id)
      .eq('goal_id', goalId)
      .maybeSingle()

    if (progErr) return Response.json({ error: progErr.message }, { status: 500 })
    if (!progress) return Response.json({ error: 'Progress record not found' }, { status: 404 })

    const freezeCount = Number(progress.freeze_count) || 0

    // ── Validate freeze is available ────────────────────────────────────────────
    if (freezeCount <= 0) {
      return Response.json({ error: 'No streak freezes remaining', freezeCount: 0 }, { status: 400 })
    }

    // ── Check if streak was actually broken ─────────────────────────────────────
    const streakCheck = computeStreakUpdate({
      lastActivityDate: progress.last_activity_date,
      currentStreak:    progress.current_streak || 0,
      longestStreak:    progress.longest_streak || 0,
    })

    // If streak is not broken (already completed today or still consecutive), no freeze needed
    if (!streakCheck.broken) {
      return Response.json({
        ok:           true,
        alreadyOk:    true,
        message:      'Streak is still active — no freeze needed',
        currentStreak: progress.current_streak,
        freezeCount,
      })
    }

    // ── Apply freeze: keep streak, consume one freeze ───────────────────────────
    const todayStr = new Date().toISOString().split('T')[0]

    const { error: updateErr } = await supabase
      .from('user_progress')
      .update({
        // Maintain current streak (don't reset)
        last_activity_date: todayStr, // prevents tomorrow's check from triggering again
        freeze_count: freezeCount - 1,
      })
      .eq('user_id', user.id)
      .eq('goal_id', goalId)

    if (updateErr) return Response.json({ error: updateErr.message }, { status: 500 })

    return Response.json({
      ok:            true,
      alreadyOk:     false,
      message:       'Streak protected',
      currentStreak: progress.current_streak,
      freezeCount:   freezeCount - 1,
    })

  } catch (err) {
    return Response.json({ error: 'Streak freeze failed', details: err?.message }, { status: 500 })
  }
}
