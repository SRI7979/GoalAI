// POST /api/gem-purchase
// Spend gems on shop items. Validates balance, deducts gems, applies effect.

import { getSupabaseServerClient } from '@/lib/supabaseServer'
import { GEM_PRICES } from '@/lib/tokens'

function extractAccessToken(request) {
  const h = request.headers.get('authorization') || request.headers.get('Authorization')
  if (!h || !h.toLowerCase().startsWith('bearer ')) return null
  return h.slice(7).trim() || null
}

const ITEM_CONFIG = {
  streakFreeze: { cost: GEM_PRICES.streakFreeze, label: 'Streak Freeze' },
  heartRefill:  { cost: GEM_PRICES.heartRefill,  label: 'Heart Refill' },
  xpBoost:      { cost: GEM_PRICES.xpBoost,      label: 'Double XP (15 min)' },
  streakRepair: { cost: GEM_PRICES.streakRepair,  label: 'Streak Repair' },
  themeOcean:   { cost: 150,                      label: 'Path Theme: Ocean' },
  themeSunset:  { cost: 150,                      label: 'Path Theme: Sunset' },
}

export async function POST(request) {
  try {
    const body        = await request.json()
    const { goalId, itemId } = body
    const accessToken = extractAccessToken(request) || body?.accessToken || null
    const supabase    = getSupabaseServerClient({ accessToken })

    if (!goalId || !itemId) return Response.json({ error: 'Missing goalId or itemId' }, { status: 400 })

    const item = ITEM_CONFIG[itemId]
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

    const currentGems = Number(progress.gems) || 0
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
        update.hearts_remaining = 5
        update.hearts_refill_at = null
        effectDescription = 'Hearts restored to 5'
        break

      case 'xpBoost': {
        const boostEnd = new Date(Date.now() + 15 * 60 * 1000).toISOString()
        update.xp_boost_until = boostEnd
        effectDescription = `2x XP active until ${boostEnd}`
        break
      }

      case 'streakRepair': {
        // Only works if streak broke within last 24h
        const lastDate = progress.last_activity_date
        if (!lastDate) {
          return Response.json({ error: 'No streak history to repair' }, { status: 400 })
        }
        const daysSince = (Date.now() - new Date(lastDate + 'T00:00:00').getTime()) / (1000 * 60 * 60 * 24)
        if (daysSince > 2) {
          return Response.json({ error: 'Streak repair only available within 24h of break' }, { status: 400 })
        }
        // Restore streak by setting last_activity_date to yesterday
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        update.last_activity_date = yesterday
        effectDescription = 'Streak restored'
        break
      }

      case 'themeOcean':
      case 'themeSunset':
        // Cosmetic — just deduct gems; theme stored client-side via localStorage
        effectDescription = `Theme unlocked: ${itemId === 'themeOcean' ? 'Ocean' : 'Sunset'}`
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
      ...(itemId === 'heartRefill' ? { heartsRemaining: 5 } : {}),
      ...(itemId === 'streakFreeze' ? { freezeCount: update.freeze_count } : {}),
      ...(itemId === 'xpBoost' ? { xpBoostUntil: update.xp_boost_until } : {}),
    })

  } catch (err) {
    return Response.json({ error: 'Purchase failed', details: err?.message }, { status: 500 })
  }
}
