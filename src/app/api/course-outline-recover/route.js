import { getSupabaseServerClient } from '@/lib/supabaseServer'
import { recoverCourseOutlineIfNeeded } from '@/lib/learningPlan'

function extractAccessToken(request) {
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization')
  if (!authHeader) return null
  if (!authHeader.toLowerCase().startsWith('bearer ')) return null
  return authHeader.slice(7).trim() || null
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { goalId, userId } = body
    const accessToken = extractAccessToken(request) || body?.accessToken || null

    if (!goalId || !userId) {
      return Response.json({ error: 'Missing goalId or userId' }, { status: 400 })
    }

    if (userId === 'pathai-local-user' || body?.local === true) {
      return Response.json({
        ok: true,
        courseOutline: null,
        sequenceDayCount: null,
        recovered: false,
        skipped: true,
        reason: 'local_goal_uses_client_repair',
      })
    }

    const supabase = getSupabaseServerClient({ accessToken })

    const { courseOutline, sequenceDayCount, recovered } = await recoverCourseOutlineIfNeeded({
      supabase,
      goalId,
      userId,
    })

    return Response.json({
      ok: true,
      courseOutline,
      sequenceDayCount,
      recovered,
    })
  } catch (error) {
    console.warn('[PathAI] course_outline_recover_soft_failed', error?.message || 'unknown_error')
    return Response.json({
      ok: true,
      courseOutline: null,
      sequenceDayCount: null,
      recovered: false,
      skipped: true,
      reason: error?.message || 'Could not recover course outline',
    })
  }
}
