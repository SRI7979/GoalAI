import { buildPathOutlineTracker } from '@/lib/pathOutline.js'
import { getStoredCourseOutline } from '@/lib/courseOutlineStore'
import { getModuleRewardReason } from '@/lib/shopInventory'
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
    const { goalId, moduleId } = body
    const accessToken = extractAccessToken(request) || body?.accessToken || null
    const supabase = getSupabaseServerClient({ accessToken })

    if (!goalId || !moduleId) {
      return Response.json({ error: 'Missing goalId or moduleId' }, { status: 400 })
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const [{ data: goal, error: goalError }, { data: rows, error: rowsError }, { data: progress, error: progressError }] = await Promise.all([
      supabase.from('goals').select('goal_text,constraints').eq('id', goalId).eq('user_id', user.id).single(),
      supabase.from('daily_tasks').select('*').eq('goal_id', goalId).eq('user_id', user.id).order('day_number', { ascending: true }),
      supabase.from('user_progress').select('gems').eq('goal_id', goalId).eq('user_id', user.id).maybeSingle(),
    ])

    if (goalError || !goal) return Response.json({ error: 'Goal not found' }, { status: 404 })
    if (rowsError) return Response.json({ error: rowsError.message }, { status: 500 })
    if (progressError) return Response.json({ error: progressError.message }, { status: 500 })

    const rewardReason = getModuleRewardReason(moduleId)
    const { data: existingReward } = await supabase
      .from('gem_transactions')
      .select('id')
      .eq('user_id', user.id)
      .eq('goal_id', goalId)
      .eq('reason', rewardReason)
      .maybeSingle()

    if (existingReward) {
      return Response.json({ ok: true, alreadyClaimed: true, rewardReason })
    }

    const tracker = buildPathOutlineTracker({
      courseOutline: getStoredCourseOutline(goal),
      rows: rows || [],
      goalText: goal.goal_text || '',
    })
    const trackerModule = tracker.modules.find((entry) => entry.id === moduleId)

    if (!trackerModule) return Response.json({ error: 'Module not found in tracker' }, { status: 404 })
    if (!trackerModule.sealEarned) {
      return Response.json({ error: 'Module seal not earned yet' }, { status: 400 })
    }

    const currentGems = Number(progress?.gems) || 0
    const newGemTotal = currentGems + trackerModule.rewardAmount

    const { error: updateError } = await supabase
      .from('user_progress')
      .update({ gems: newGemTotal })
      .eq('user_id', user.id)
      .eq('goal_id', goalId)

    if (updateError) return Response.json({ error: updateError.message }, { status: 500 })

    await supabase.from('gem_transactions').insert({
      user_id: user.id,
      goal_id: goalId,
      amount: trackerModule.rewardAmount,
      reason: rewardReason,
    })

    return Response.json({
      ok: true,
      moduleId,
      rewardAmount: trackerModule.rewardAmount,
      newGemTotal,
      identityLabel: trackerModule.identityLabel,
      moduleTitle: trackerModule.title,
    })
  } catch (error) {
    return Response.json({ error: error.message || 'Failed to claim module mastery reward' }, { status: 500 })
  }
}
