// POST /api/gem-purchase
// Spend gems on shop items. Validates balance, deducts gems, applies effect.

import { buildInventoryCountsFromTransactions, getTrackedInventoryReasons } from '@/lib/shopInventory'
import { getSupabaseServerClient } from '@/lib/supabaseServer'
import { GEM_SHOP_ITEMS } from '@/lib/tokens'
import { HEARTS_BASE, HEARTS_MAX_CAP } from '@/lib/tokens'
import { computeStreakUpdate } from '@/lib/streak'

const THEME_REASON_TO_ID = {
  shop_themeOcean: 'themeOcean',
  shop_themeSunset: 'themeSunset',
  shop_themeForest: 'themeForest',
  shop_themeMidnight: 'themeMidnight',
  shop_themeRose: 'themeRose',
  shop_themeAurora: 'themeAurora',
  shop_themeEmber: 'themeEmber',
  shop_themeMonolith: 'themeMonolith',
}

const THEME_TRANSACTION_REASONS = Object.keys(THEME_REASON_TO_ID)

function extractAccessToken(request) {
  const h = request.headers.get('authorization') || request.headers.get('Authorization')
  if (!h || !h.toLowerCase().startsWith('bearer ')) return null
  return h.slice(7).trim() || null
}

async function getOwnedThemes(supabase, userId) {
  const { data, error } = await supabase
    .from('gem_transactions')
    .select('reason')
    .eq('user_id', userId)
    .in('reason', THEME_TRANSACTION_REASONS)

  if (error) return { ownedThemes: [], error }

  const ownedThemes = Array.from(new Set(
    (data || [])
      .map((row) => THEME_REASON_TO_ID[row.reason])
      .filter(Boolean),
  ))

  return { ownedThemes, error: null }
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
    const inventoryReasons = getTrackedInventoryReasons()
    let inventoryRows = []
    let inventoryCounts = { taskReroll: 0, reviewShield: 0 }
    if (inventoryReasons.length > 0) {
      const { data } = await supabase
        .from('gem_transactions')
        .select('reason')
        .eq('user_id', user.id)
        .eq('goal_id', goalId)
        .in('reason', inventoryReasons)
      inventoryRows = data || []
      inventoryCounts = buildInventoryCountsFromTransactions(inventoryRows)
    }
    const isThemeItem = itemId.startsWith('theme')
    let ownedThemes = null

    if (isThemeItem) {
      const themeResult = await getOwnedThemes(supabase, user.id)
      if (!themeResult.error) {
        ownedThemes = themeResult.ownedThemes
        if (ownedThemes.includes(itemId)) {
          return Response.json({ error: 'Theme already owned', ownedThemes }, { status: 400 })
        }
      }
    }

    if (currentGems < item.cost) {
      return Response.json({ error: 'Insufficient gems', currentGems, cost: item.cost, ownedThemes }, { status: 400 })
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

      case 'taskReroll':
        effectDescription = 'Task reroll pass added'
        break

      case 'reviewShield':
        effectDescription = 'Review shield added'
        break

      case 'recoveryPack':
        update.hearts_remaining = currentMaxHearts
        update.hearts_refill_at = null
        effectDescription = `Hearts restored and 1 reroll pass added`
        break

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
      case 'themeAurora':
      case 'themeEmber':
      case 'themeMonolith':
        effectDescription = `Theme unlocked: ${item.label.replace('Path Theme: ', '')}`
        ownedThemes = Array.from(new Set([...(ownedThemes || []), itemId]))
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

    inventoryCounts = buildInventoryCountsFromTransactions([
      ...inventoryRows,
      { reason: `shop_${itemId}` },
    ])

    // Build response with ALL updated fields so frontend can sync immediately
    const response = {
      ok: true,
      newGemTotal: currentGems - item.cost,
      effect: effectDescription,
      item: itemId,
    }

    // Always include the fields that were updated so frontend stays in sync
    if (update.hearts_remaining != null) response.heartsRemaining = update.hearts_remaining
    if (update.hearts_refill_at !== undefined) response.heartsRefillAt = update.hearts_refill_at
    if (update.freeze_count != null) response.freezeCount = update.freeze_count
    if (update.xp_boost_until) response.xpBoostUntil = update.xp_boost_until
    if (update.last_activity_date) {
      response.streakRepaired = true
      response.currentStreak = progress.current_streak || 0
      response.lastActivityDate = update.last_activity_date
    }
    if (itemId === 'heartContainer') {
      response.maxHearts = currentMaxHearts + 1
    }
    if (ownedThemes) {
      response.ownedThemes = ownedThemes
    }
    response.inventoryCounts = inventoryCounts

    return Response.json(response)

  } catch (err) {
    return Response.json({ error: 'Purchase failed', details: err?.message }, { status: 500 })
  }
}
