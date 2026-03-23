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
    const supabase = getSupabaseServerClient({ accessToken })

    if (!goalId || !userId) {
      return Response.json({ error: 'Missing goalId or userId' }, { status: 400 })
    }

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
    return Response.json(
      { error: error?.message || 'Could not recover course outline' },
      { status: 500 },
    )
  }
}
