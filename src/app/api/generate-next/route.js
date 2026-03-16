import { getSupabaseServerClient } from '@/lib/supabaseServer'
import { generateNextTasksIfNeeded, generateNextExploreDay } from '@/lib/learningPlan'

function extractAccessToken(request) {
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization')
  if (!authHeader) return null
  if (!authHeader.toLowerCase().startsWith('bearer ')) return null
  return authHeader.slice(7).trim() || null
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { goalId, userId, mode = 'goal' } = body
    const accessToken = extractAccessToken(request) || body?.accessToken || null
    const supabase = getSupabaseServerClient({ accessToken })

    if (!goalId || !userId) {
      return Response.json({ error: 'Missing goalId or userId' }, { status: 400 })
    }

    const result = mode === 'explore'
      ? await generateNextExploreDay({ supabase, goalId, userId })
      : await generateNextTasksIfNeeded({ supabase, goalId, userId })

    return Response.json({ ok: true, ...result })
  } catch (err) {
    return Response.json({ error: err.message || 'Generation failed' }, { status: 500 })
  }
}
