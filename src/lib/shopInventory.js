const INVENTORY_DEFINITIONS = Object.freeze({
  taskReroll: {
    purchaseReasons: ['shop_taskReroll', 'shop_recoveryPack'],
    useReasons: ['use_taskReroll'],
  },
  reviewShield: {
    purchaseReasons: ['shop_reviewShield'],
    useReasons: ['use_reviewShield'],
  },
})

function zeroCounts() {
  return {
    taskReroll: 0,
    reviewShield: 0,
  }
}

export function getTrackedInventoryReasons() {
  return Array.from(new Set(
    Object.values(INVENTORY_DEFINITIONS).flatMap((definition) => [
      ...definition.purchaseReasons,
      ...definition.useReasons,
    ]),
  ))
}

export function buildInventoryCountsFromTransactions(rows = []) {
  const counts = zeroCounts()

  for (const row of Array.isArray(rows) ? rows : []) {
    const reason = String(row?.reason || '')

    Object.entries(INVENTORY_DEFINITIONS).forEach(([itemId, definition]) => {
      if (definition.purchaseReasons.includes(reason)) counts[itemId] += 1
      if (definition.useReasons.includes(reason)) counts[itemId] -= 1
    })
  }

  return {
    taskReroll: Math.max(0, counts.taskReroll),
    reviewShield: Math.max(0, counts.reviewShield),
  }
}

export function getModuleRewardReason(moduleId) {
  return `module_mastery_${String(moduleId || '').trim()}`
}

export function isModuleRewardReason(reason) {
  return String(reason || '').startsWith('module_mastery_')
}

export function getClaimedModuleRewardIds(rows = []) {
  return Array.from(new Set(
    (Array.isArray(rows) ? rows : [])
      .map((row) => String(row?.reason || ''))
      .filter(isModuleRewardReason)
      .map((reason) => reason.replace(/^module_mastery_/, ''))
      .filter(Boolean),
  ))
}
