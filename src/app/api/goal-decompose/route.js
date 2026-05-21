import {
  buildFallbackGoalDecomposition,
  decomposeGoal,
  getGoalDecomposerModel,
} from '@/lib/goalDecomposer'

export async function POST(request) {
  try {
    const body = await request.json()
    const goalText = String(body?.goalText || '').trim()
    const userContext = body?.userContext && typeof body.userContext === 'object'
      ? body.userContext
      : {}

    if (!goalText) {
      return Response.json({ error: 'Missing goalText' }, { status: 400 })
    }

    let decomposition
    try {
      decomposition = await decomposeGoal(goalText, userContext)
    } catch (error) {
      decomposition = buildFallbackGoalDecomposition(goalText, error)
    }

    return Response.json({
      decomposition,
      modelUsed: getGoalDecomposerModel(),
    })
  } catch (error) {
    return Response.json(
      { error: error?.message || 'Failed to decompose goal.' },
      { status: 500 },
    )
  }
}
