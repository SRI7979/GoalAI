import { buildInventoryCountsFromTransactions, getTrackedInventoryReasons } from '@/lib/shopInventory'
import { getSupabaseServerClient } from '@/lib/supabaseServer'

const DECAY_THRESHOLD_DAYS = 7

function extractAccessToken(request) {
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization')
  if (!authHeader) return null
  if (!authHeader.toLowerCase().startsWith('bearer ')) return null
  return authHeader.slice(7).trim() || null
}

export async function POST(request) {
  try {
    const body = await request.json()
    const accessToken = extractAccessToken(request) || body?.accessToken || null
    const supabase = getSupabaseServerClient({ accessToken })

    const { userId, goalId } = body
    if (!userId || !goalId) {
      return Response.json({ error: 'Missing userId or goalId' }, { status: 400 })
    }

    const { data: masteries } = await supabase
      .from('concept_mastery')
      .select('concept_id,mastery_score,last_review,review_interval')
      .eq('user_id', userId)
      .eq('goal_id', goalId)

    if (!masteries || masteries.length === 0) {
      return Response.json({ decaying: [], healthy: 0 })
    }

    const now = new Date()
    const decaying = []
    let healthy = 0

    for (const m of masteries) {
      if (!m.last_review) { healthy++; continue }
      const lastReview = new Date(m.last_review)
      const daysSince = Math.floor((now - lastReview) / (1000 * 60 * 60 * 24))

      if (daysSince >= DECAY_THRESHOLD_DAYS && m.mastery_score > 0) {
        const decayPct = Math.min(50, Math.floor((daysSince - DECAY_THRESHOLD_DAYS + 1) * 5))
        decaying.push({
          conceptId: m.concept_id,
          masteryScore: m.mastery_score,
          daysSinceReview: daysSince,
          decayPct,
        })
      } else {
        healthy++
      }
    }

    // Sort by most decayed first
    decaying.sort((a, b) => b.decayPct - a.decayPct)

    let shieldConsumed = false
    let shieldedConceptId = null
    let reviewShieldRemaining = null

    if (decaying.length > 0) {
      try {
        const inventoryReasons = getTrackedInventoryReasons()
        const { data: inventoryRows } = await supabase
          .from('gem_transactions')
          .select('reason')
          .eq('user_id', userId)
          .eq('goal_id', goalId)
          .in('reason', inventoryReasons)

        const inventoryCounts = buildInventoryCountsFromTransactions(inventoryRows || [])
        if ((inventoryCounts.reviewShield || 0) > 0) {
          const topDecaying = decaying[0]
          const shieldedAt = new Date().toISOString()

          await supabase
            .from('concept_mastery')
            .update({ last_review: shieldedAt })
            .eq('user_id', userId)
            .eq('goal_id', goalId)
            .eq('concept_id', topDecaying.conceptId)

          await supabase.from('gem_transactions').insert({
            user_id: userId,
            goal_id: goalId,
            amount: 0,
            reason: 'use_reviewShield',
          })

          shieldConsumed = true
          shieldedConceptId = topDecaying.conceptId
          reviewShieldRemaining = Math.max(0, inventoryCounts.reviewShield - 1)
          decaying.shift()
          healthy += 1
        } else {
          reviewShieldRemaining = inventoryCounts.reviewShield || 0
        }
      } catch {
        // Non-blocking: decay alert still works even if shield sync fails
      }
    }

    return Response.json({ decaying, healthy, shieldConsumed, shieldedConceptId, reviewShieldRemaining })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
