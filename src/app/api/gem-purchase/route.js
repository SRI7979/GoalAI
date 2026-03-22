// POST /api/gem-purchase
// Spend gems on shop items. Validates balance, deducts gems, applies effect.

import { getSupabaseServerClient } from '@/lib/supabaseServer'
import { GEM_SHOP_ITEMS } from '@/lib/tokens'
import { HEARTS_BASE, HEARTS_MAX_CAP } from '@/lib/tokens'
import { computeStreakUpdate } from '@/lib/streak'

function extractAccessToken(request) {
  const h = request.headers.get('authorization') || request.headers.get('Authorization')
  if (!h || !h.toLowerCase().startsWith('bearer ')) return null
  return h.slice(7).trim() || null
}

export async function POST(request) {
  try {
    const body        = await request.json()
    const { goalId, itemId, clientGems, clientMaxHearts } = body
    const accessToken = extractAccessToken(request) || body?.accessToken || null
    const supabase    = getSupabaseServerClient({ accessToken })

    if (!goalId || !itemId) return Response.json({ error: 'Missing goalId or itemId' }, { status: 400 })

    const item = GEM_SHOP_ITEMS[itemId]
    if (!item) return Response.json({ error: 'Unknown item' }, { status: 400 })

    // Auth
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    // Fetch progress
    const { data: progress, error: progErr } = await supabase
      .from('user_progress')
      .select('gems,freeze_count,hearts_remaining,hearts_refill_at,current_streak,longest_streak,last_activity_date,xp_boost_until')
      .eq('user_id', user.id)
      .eq('goal_id', goalId)
      .maybeSingle()

    if (progErr) return Response.json({ error: progErr.message }, { status: 500 })
    if (!progress) return Response.json({ error: 'Progress not found' }, { status: 404 })

    const dbGems = Number(progress.gems) || 0
    const visibleGems = Number.isFinite(Number(clientGems)) ? Number(clientGems) : null
    const currentGems = visibleGems != null ? Math.max(dbGems, visibleGems) : dbGems
    const currentMaxHearts = Math.min(
      HEARTS_MAX_CAP,
      Math.max(HEARTS_BASE, Number(clientMaxHearts) || HEARTS_BASE),
    )

    if (currentGems < item.cost) {
      return Response.json({ error: 'Insufficient gems', currentGems, cost: item.cost }, { status: 400 })
    }

    // Build update
    const update = { gems: currentGems - item.cost }
    let effectDescription = ''

    switch (itemId) {
      case 'streakFreeze':
        update.freeze_count = (Number(progress.freeze_count) || 0) + 1
        effectDescription = 'Streak freeze added'
        break

      case 'heartRefill':
        update.hearts_remaining = currentMaxHearts
        update.hearts_refill_at = null
        effectDescription = `Hearts restored to ${currentMaxHearts}`
        break

      case 'heartContainer': {
        if (currentMaxHearts >= HEARTS_MAX_CAP) {
          return Response.json({ error: 'Max hearts already reached', maxHearts: currentMaxHearts }, { status: 400 })
        }
        const nextMaxHearts = currentMaxHearts + 1
        update.hearts_remaining = Math.max(Number(progress.hearts_remaining) || 0, nextMaxHearts)
        update.hearts_refill_at = null
        effectDescription = `Max hearts increased to ${nextMaxHearts}`
        break
      }

      case 'freezeBundle':
        update.freeze_count = (Number(progress.freeze_count) || 0) + 3
        effectDescription = '3 streak freezes added'
        break

      case 'xpBoost': {
        const activeBoostUntil = progress.xp_boost_until ? new Date(progress.xp_boost_until) : null
        const boostStart = activeBoostUntil && activeBoostUntil > new Date() ? activeBoostUntil : new Date()
        const boostEnd = new Date(boostStart.getTime() + 15 * 60 * 1000).toISOString()
        update.xp_boost_until = boostEnd
        effectDescription = `2x XP active until ${boostEnd}`
        break
      }

      case 'megaXpBoost': {
        const activeBoostUntil = progress.xp_boost_until ? new Date(progress.xp_boost_until) : null
        const boostStart = activeBoostUntil && activeBoostUntil > new Date() ? activeBoostUntil : new Date()
        const boostEnd = new Date(boostStart.getTime() + 60 * 60 * 1000).toISOString()
        update.xp_boost_until = boostEnd
        effectDescription = `2x XP active until ${boostEnd}`
        break
      }

      case 'streakRepair': {
        const lastDate = progress.last_activity_date
        if (!lastDate || Number(progress.current_streak) <= 0) {
          return Response.json({ error: 'No streak history to repair' }, { status: 400 })
        }

        const streakCheck = computeStreakUpdate({
          lastActivityDate: lastDate,
          currentStreak: progress.current_streak || 0,
          longestStreak: progress.longest_streak || 0,
        })

        if (!streakCheck.broken) {
          return Response.json({ error: 'Your streak is still active' }, { status: 400 })
        }

        const hoursSinceLastActivity = (Date.now() - new Date(`${lastDate}T00:00:00`).getTime()) / (1000 * 60 * 60)
        if (hoursSinceLastActivity > 48) {
          return Response.json({ error: 'Streak repair only available within 24h of break' }, { status: 400 })
        }

        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        update.last_activity_date = yesterday
        effectDescription = 'Streak restored'
        break
      }

      case 'themeOcean':
      case 'themeSunset':
      case 'themeForest':
      case 'themeMidnight':
      case 'themeRose':
        // Cosmetic — just deduct gems; theme stored client-side via localStorage
        effectDescription = `Theme unlocked: ${item.label.replace('Path Theme: ', '')}`
        break

      default:
        return Response.json({ error: 'Unhandled item' }, { status: 400 })
    }

    // Apply update
    const { error: updateErr } = await supabase
      .from('user_progress')
      .update(update)
      .eq('user_id', user.id)
      .eq('goal_id', goalId)

    if (updateErr) return Response.json({ error: updateErr.message }, { status: 500 })

    // Log transaction
    try {
      await supabase.from('gem_transactions').insert({
        user_id: user.id, goal_id: goalId,
        amount: -item.cost, reason: `shop_${itemId}`,
      })
    } catch { /* non-critical */ }

    return Response.json({
      ok: true,
      newGemTotal: currentGems - item.cost,
      effect: effectDescription,
      item: itemId,
      // Return updated fields so frontend can sync
      ...(itemId === 'heartRefill' ? { heartsRemaining: currentMaxHearts } : {}),
      ...(itemId === 'heartContainer' ? {
        maxHearts: currentMaxHearts + 1,
        heartsRemaining: update.hearts_remaining,
      } : {}),
      ...(itemId === 'streakFreeze' || itemId === 'freezeBundle' ? { freezeCount: update.freeze_count } : {}),
      ...(itemId === 'xpBoost' || itemId === 'megaXpBoost' ? { xpBoostUntil: update.xp_boost_until } : {}),
    })

  } catch (err) {
    return Response.json({ error: 'Purchase failed', details: err?.message }, { status: 500 })
  }
}
