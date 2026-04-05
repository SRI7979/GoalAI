import { getSupabaseServerClient } from '@/lib/supabaseServer'
import { repairBrokenIncompleteDays } from '@/lib/learningPlan'

function extractAccessToken(request) {
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization')
  if (!authHeader) return null
  if (!authHeader.toLowerCase().startsWith('bearer ')) return null
  return authHeader.slice(7).trim() || null
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { goalId, userId, rowIds = [] } = body || {}
    const accessToken = extractAccessToken(request) || body?.accessToken || null
    const supabase = getSupabaseServerClient({ accessToken })

    if (!goalId || !userId) {
      return Response.json({ error: 'Missing goalId or userId' }, { status: 400 })
    }

    const result = await repairBrokenIncompleteDays({
      supabase,
      goalId,
      userId,
      rowIds: Array.isArray(rowIds) ? rowIds : [],
    })

    return Response.json({
      ok: true,
      repairedCount: result.repairedCount || 0,
      rows: result.rows || [],
    })
  } catch (error) {
    return Response.json(
      { error: error?.message || 'Could not repair broken days' },
      { status: 500 },
    )
  }
}
