import { getSupabaseServerClient } from '@/lib/supabaseServer'

function extractAccessToken(request) {
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization')
  if (!authHeader) return null
  if (!authHeader.toLowerCase().startsWith('bearer ')) return null
  return authHeader.slice(7).trim() || null
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { goalId } = body
    const accessToken = extractAccessToken(request) || body?.accessToken || null
    const supabase = getSupabaseServerClient({ accessToken })

    if (!goalId) {
      return Response.json({ error: 'Missing goalId' }, { status: 400 })
    }

    // ── Fetch current hearts ───────────────────────────────────────────────────
    const { data: progress, error: fetchError } = await supabase
      .from('user_progress')
      .select('id, hearts_remaining, hearts_refill_at')
      .eq('goal_id', goalId)
      .single()

    if (fetchError || !progress) {
      return Response.json({ error: 'Progress record not found' }, { status: 404 })
    }

    // ── Already at 0 — no change, just return current state ───────────────────
    if (progress.hearts_remaining <= 0) {
      return Response.json({
        heartsRemaining: 0,
        heartsRefillAt: progress.hearts_refill_at,
      })
    }

    // ── Decrement hearts ───────────────────────────────────────────────────────
    const newHearts = progress.hearts_remaining - 1

    // Set refill time: 4 hours from now (only set when going 1→0 or if not already set)
    let refillAt = progress.hearts_refill_at
    if (newHearts === 0 || !refillAt) {
      const fourHoursFromNow = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString()
      refillAt = fourHoursFromNow
    }

    const { error: updateError } = await supabase
      .from('user_progress')
      .update({
        hearts_remaining: newHearts,
        hearts_refill_at: newHearts === 0 ? refillAt : progress.hearts_refill_at,
      })
      .eq('id', progress.id)

    if (updateError) {
      return Response.json({ error: `Failed to update hearts: ${updateError.message}` }, { status: 500 })
    }

    return Response.json({
      heartsRemaining: newHearts,
      heartsRefillAt: newHearts === 0 ? refillAt : progress.hearts_refill_at,
    })
  } catch (err) {
    return Response.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}
