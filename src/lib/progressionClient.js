import { getSafeSupabaseSession } from '@/lib/supabase'
import {
  claimLocalModuleReward,
  claimLocalReward,
  completeLocalTask,
  generateNextLocalDay,
  isLocalAccessUser,
  purchaseLocalGemItem,
  rerollLocalTask,
} from '@/lib/localGoalStore'

async function getJsonSafe(response) {
  try {
    return await response.json()
  } catch {
    return {}
  }
}

async function callServerAction(path, payload, networkErrorMessage) {
  try {
    const { session } = await getSafeSupabaseSession()
    const token = session?.access_token || null
    const response = await fetch(path, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        ...payload,
        ...(token ? { accessToken: token } : {}),
      }),
    })
    const data = await getJsonSafe(response)
    if (!response.ok) {
      return {
        ok: false,
        ...data,
        error: data?.error || networkErrorMessage,
      }
    }
    return typeof data?.ok === 'boolean' ? data : { ok: true, ...data }
  } catch {
    return {
      ok: false,
      error: networkErrorMessage,
    }
  }
}

export async function completeLearningTask({
  user,
  goal,
  taskRowId,
  taskId,
  completedTaskIds = [],
  clientHour = null,
  ...metrics
} = {}) {
  if (isLocalAccessUser(user)) {
    return completeLocalTask({
      userId: user?.id,
      goalId: goal?.id,
      taskRowId,
      taskId,
      completedTaskIds,
      clientHour,
      ...metrics,
    })
  }

  return callServerAction('/api/complete', {
    taskRowId,
    taskId,
    completedTaskIds,
    clientHour,
    ...metrics,
  }, 'Could not save. Try again.')
}

export async function generateNextLearningDay({
  user,
  goal,
  preferredDayNumber = null,
} = {}) {
  if (isLocalAccessUser(user)) {
    const data = await generateNextLocalDay({
      userId: user?.id,
      goalId: goal?.id,
    })
    return {
      ...data,
      preferredDayNumber,
    }
  }

  return callServerAction('/api/generate-next', {
    goalId: goal?.id,
    userId: user?.id,
    mode: goal?.mode || 'goal',
    preferredDayNumber,
  }, 'Could not generate the next day')
}

export async function claimDailyReward({
  user,
  goal,
} = {}) {
  if (isLocalAccessUser(user)) {
    return claimLocalReward({
      userId: user?.id,
      goalId: goal?.id,
    })
  }

  return callServerAction('/api/claim-reward', {
    goalId: goal?.id,
  }, 'Could not claim reward')
}

export async function purchaseGemItem({
  user,
  goal,
  itemId,
  clientGems = null,
  clientMaxHearts = null,
} = {}) {
  if (isLocalAccessUser(user)) {
    return purchaseLocalGemItem({
      userId: user?.id,
      goalId: goal?.id,
      itemId,
      clientGems,
      clientMaxHearts,
    })
  }

  return callServerAction('/api/gem-purchase', {
    goalId: goal?.id,
    itemId,
    clientGems,
    clientMaxHearts,
  }, 'Purchase failed')
}

export async function rerollLearningTask({
  user,
  goal,
  taskRowId,
  taskId,
} = {}) {
  if (isLocalAccessUser(user)) {
    return rerollLocalTask({
      userId: user?.id,
      goalId: goal?.id,
      taskRowId,
      taskId,
    })
  }

  return callServerAction('/api/task-reroll', {
    goalId: goal?.id,
    taskRowId,
    taskId,
  }, 'Could not reroll that task')
}

export async function claimModuleReward({
  user,
  goal,
  moduleId,
} = {}) {
  if (isLocalAccessUser(user)) {
    return claimLocalModuleReward({
      userId: user?.id,
      goalId: goal?.id,
      moduleId,
    })
  }

  return callServerAction('/api/module-mastery-claim', {
    goalId: goal?.id,
    moduleId,
  }, 'Could not claim module reward')
}
