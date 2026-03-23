import { buildAdaptiveProfile } from '@/lib/adaptiveLearning'
import { detectSkillType, getSkillConfig } from '@/lib/skillTypes'

const CANVAS_WIDTH = 960
const REGION_BANNER_HEIGHT = 92
const REGION_HEIGHT = 320
const REGION_GAP = 46
const REGION_PATTERNS = [
  [
    { x: 180, y: 154 },
    { x: 440, y: 76 },
    { x: 738, y: 118 },
    { x: 516, y: 252 },
  ],
  [
    { x: 778, y: 154 },
    { x: 520, y: 76 },
    { x: 224, y: 118 },
    { x: 440, y: 252 },
  ],
]

const REGION_TITLES = [
  'Foundation',
  'Core Flow',
  'Applied Practice',
  'Systems Build',
  'Proof of Skill',
  'Advanced Range',
]

function clamp(value, min, max, fallback = min) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.max(min, Math.min(max, parsed))
}

function unique(values = []) {
  return [...new Set(values.filter(Boolean))]
}

function sum(values = []) {
  return values.reduce((total, value) => total + value, 0)
}

function average(values = [], fallback = 0) {
  if (!values.length) return fallback
  return sum(values) / values.length
}

function titleCase(input = '') {
  return String(input)
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function slugify(input = '') {
  return String(input)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function getTaskCompletionState(node) {
  if (node.isPlaceholder) return 'future'
  if (node.totalTasks > 0 && node.completedTasks === node.totalTasks) return 'completed'
  if (node.completedTasks > 0) return 'started'
  return 'fresh'
}

function inferMastery(node, summary, masteryRow) {
  if (node.isPlaceholder) return 0
  const progressRatio = node.totalTasks > 0 ? node.completedTasks / node.totalTasks : 0
  const rowScore = clamp(masteryRow?.mastery_score, 0, 100, null)
  const summaryScore = clamp(summary?.masteryScore, 0, 100, null)

  if (rowScore != null) return Math.round(rowScore)
  if (summaryScore != null) return Math.round(summaryScore)
  if (node.status === 'done') return 86
  if (progressRatio > 0) return Math.round(35 + (progressRatio * 35))
  return 18
}

function getConfidenceTone(summary) {
  if (!summary) return 'medium'
  if (summary.misconceptionRate > 0.18) return 'unstable'
  if (summary.fragileKnowledgeRate > 0.2) return 'fragile'
  if (summary.accuracy >= 88) return 'strong'
  return 'medium'
}

function buildMistakes(summary) {
  if (!summary) return []
  const notes = [
    summary.misconceptionRate > 0.15 ? 'Confidence is running ahead of accuracy here.' : null,
    summary.helpRate > 0.45 ? 'This concept still depends heavily on hints.' : null,
    summary.timeRatio > 1.35 ? 'Response time is slower than your current baseline.' : null,
    summary.attempts > 1.6 ? 'Repeated retries suggest the workflow is not automatic yet.' : null,
  ].filter(Boolean)

  if (notes.length > 0) return notes
  if (summary.accuracy >= 88) return ['Recent work here looks reliable and transferable.']
  return ['No clear mistake pattern yet. Keep building repetition to stabilize it.']
}

function inferIcon(conceptName, skillConfig) {
  const lower = String(conceptName || '').toLowerCase()
  if (lower.includes('project')) return 'hammer'
  if (lower.includes('boss')) return 'trophy'
  if (lower.includes('loop') || lower.includes('iteration')) return 'repeat'
  if (lower.includes('function') || lower.includes('method')) return 'code'
  if (lower.includes('api') || lower.includes('backend')) return 'cpu'
  if (lower.includes('data') || lower.includes('analysis')) return 'chart'
  if (lower.includes('debug') || lower.includes('test')) return 'clipboard_check'
  if (lower.includes('design') || lower.includes('ui') || lower.includes('ux')) return 'design'
  if (lower.includes('speak') || lower.includes('conversation') || lower.includes('grammar')) return 'message'
  if (lower.includes('music') || lower.includes('rhythm') || lower.includes('melody')) return 'music'
  if (lower.includes('math') || lower.includes('probability') || lower.includes('algebra')) return 'target'
  if (lower.includes('review')) return 'repeat'
  return skillConfig.icon || 'sparkles'
}

function buildWhyItMatters(conceptName, goalText, skillConfig) {
  const lower = String(conceptName || '').toLowerCase()

  if (lower.includes('variable') || lower.includes('state')) {
    return 'This is how systems hold context and carry information from one step to the next.'
  }
  if (lower.includes('loop') || lower.includes('iteration')) {
    return 'This is what turns one manual action into something scalable and repeatable.'
  }
  if (lower.includes('function') || lower.includes('abstraction')) {
    return 'Reusable building blocks are what make complex work maintainable instead of brittle.'
  }
  if (lower.includes('api') || lower.includes('request') || lower.includes('backend')) {
    return 'This concept shows up anywhere real products exchange data and coordinate behavior.'
  }
  if (lower.includes('data') || lower.includes('analysis') || lower.includes('statistics')) {
    return 'This is what lets you turn raw inputs into decisions, patterns, and useful output.'
  }
  if (lower.includes('debug') || lower.includes('test')) {
    return 'Reliable work depends on being able to find issues quickly and prove your fixes hold.'
  }
  if (lower.includes('conversation') || lower.includes('grammar') || lower.includes('vocabulary')) {
    return 'This concept directly affects whether you can think, respond, and recover in real conversation.'
  }
  if (lower.includes('project')) {
    return 'This milestone turns theory into a concrete artifact you can explain, share, and defend.'
  }
  if (skillConfig.label === 'Coding') {
    return `This concept supports real ${goalText || 'software work'} and unlocks more complex builds.`
  }
  if (skillConfig.label === 'Language') {
    return 'This concept improves your ability to understand, respond, and communicate with confidence.'
  }
  if (skillConfig.label === 'Math') {
    return 'This concept strengthens the reasoning patterns you need for solving harder problems cleanly.'
  }
  if (skillConfig.label === 'Design') {
    return 'This concept shapes how clearly, confidently, and effectively your work communicates.'
  }

  return `This concept moves you closer to ${goalText || 'your goal'} and unlocks the next layer of difficulty.`
}

function buildDescription(node) {
  const taskTitles = unique((node.tasks || []).map((task) => task.title).slice(0, 3))
  if (taskTitles.length === 0) {
    return `Use this node to strengthen ${node.conceptName.toLowerCase()} before the path opens further.`
  }
  return `You’ll practice ${node.conceptName.toLowerCase()} through ${taskTitles.length} focused task${taskTitles.length === 1 ? '' : 's'}: ${taskTitles.join(', ')}.`
}

function buildIdentityLabel(skillConfig, completedMilestones) {
  if (completedMilestones >= 5) return `Verified ${skillConfig.label} Operator`
  if (completedMilestones >= 4) return `Applied ${skillConfig.label} Builder`
  if (completedMilestones >= 3) return `Developing ${skillConfig.label} Practitioner`
  if (completedMilestones >= 2) return `Emerging ${skillConfig.label} Builder`
  if (completedMilestones >= 1) return `Foundational ${skillConfig.label} Learner`
  return `Starting ${skillConfig.label} Journey`
}

function getMomentum(profile, completionRatio) {
  const userState = profile?.learner?.userState
  if (profile?.weakConcepts?.length >= 2 || userState === 'struggling') {
    return {
      label: 'Needs Stabilizing',
      tone: 'behind',
      description: 'A quick review loop now will prevent compounding confusion.',
    }
  }
  if (profile?.learner?.fastTrackEligible || (userState === 'breezing' && completionRatio >= 0.45)) {
    return {
      label: 'Ahead of Pace',
      tone: 'ahead',
      description: 'The path can safely compress and challenge you more aggressively.',
    }
  }
  return {
    label: 'On Track',
    tone: 'steady',
    description: 'Your current pace is healthy. Keep building consistency through the next milestone.',
  }
}

function buildNodeStatus({
  node,
  prerequisitesSatisfied,
  weakConcepts,
  reviewTargets,
}) {
  if (node.isPlaceholder) return 'locked'
  if (node.completedTasks > 0 && node.completedTasks < node.totalTasks) return 'in_progress'
  if (node.isComplete && weakConcepts.has(node.conceptName)) return 'review_needed'
  if (node.isComplete || node.mastery >= 85) return 'mastered'
  if (prerequisitesSatisfied) return 'available'
  if (reviewTargets.has(node.conceptName)) return 'review_needed'
  return 'locked'
}

function buildNextAction({ currentFocus, weakNodes, nextUnlockTitle }) {
  if (!currentFocus) {
    return {
      label: 'Continue Learning',
      reason: 'Your next concept will appear here as soon as the path has a clear recommendation.',
      icon: 'rocket',
      tone: 'neutral',
      nodeId: null,
    }
  }

  if (currentFocus.kind === 'project') {
    return {
      label: 'Start Project',
      reason: 'This is your best chance to turn recent concepts into proof of skill.',
      icon: 'hammer',
      tone: 'project',
      nodeId: currentFocus.id,
    }
  }

  if (currentFocus.status === 'review_needed' || weakNodes[0]?.id === currentFocus.id) {
    return {
      label: 'Review Weak Areas',
      reason: `Rebuild ${currentFocus.title} now so the next unlock is stable instead of shaky.`,
      icon: 'repeat',
      tone: 'review',
      nodeId: currentFocus.id,
    }
  }

  return {
    label: 'Continue Learning',
    reason: nextUnlockTitle
      ? `${currentFocus.title} is the clearest path into ${nextUnlockTitle}.`
      : `Keep pushing ${currentFocus.title} to open the next part of the graph.`,
    icon: 'rocket',
    tone: 'primary',
    nodeId: currentFocus.id,
  }
}

function buildEdges(nodes, currentFocusId) {
  const byId = new Map(nodes.map((node) => [node.id, node]))
  const edges = []

  nodes.forEach((node) => {
    node.prerequisiteIds.forEach((sourceId) => {
      const source = byId.get(sourceId)
      if (!source) return

      let variant = 'locked'
      if (source.status === 'mastered' && ['mastered', 'available', 'in_progress', 'review_needed'].includes(node.status)) {
        variant = 'completed'
      }
      if (node.id === currentFocusId || source.id === currentFocusId) variant = 'current'
      if (node.status === 'review_needed' && source.status === 'mastered') variant = 'review'

      edges.push({
        id: `${source.id}-${node.id}`,
        fromId: source.id,
        toId: node.id,
        x1: source.position.x,
        y1: source.position.y,
        x2: node.position.x,
        y2: node.position.y,
        mx: (source.position.x + node.position.x) / 2,
        my: Math.min(source.position.y, node.position.y) + ((Math.abs(source.position.x - node.position.x) > 180) ? 20 : -16) + ((node.position.y - source.position.y) / 2),
        variant,
        regionIndex: node.regionIndex,
      })
    })
  })

  const weakNodes = nodes.filter((node) => node.weak && node.id !== currentFocusId).slice(0, 2)
  const currentFocus = byId.get(currentFocusId)
  weakNodes.forEach((node) => {
    if (!currentFocus) return
    edges.push({
      id: `review-${node.id}-${currentFocus.id}`,
      fromId: node.id,
      toId: currentFocus.id,
      x1: node.position.x,
      y1: node.position.y,
      x2: currentFocus.position.x,
      y2: currentFocus.position.y,
      mx: (node.position.x + currentFocus.position.x) / 2,
      my: Math.min(node.position.y, currentFocus.position.y) - 84,
      variant: 'review',
      regionIndex: currentFocus.regionIndex,
      isReviewLink: true,
    })
  })

  return edges
}

export function buildSkillGraph({ nodes = [], masteryRows = [], goalText = '', worlds = [] }) {
  const inputNodes = Array.isArray(nodes) ? nodes : []
  const skillType = detectSkillType(goalText)
  const skillConfig = getSkillConfig(skillType)
  const historyRows = inputNodes
    .filter((node) => !node.isProject && !node.isPlaceholder)
    .map((node) => ({
      day_number: node.dayNumber,
      completion_status: node.status === 'done' ? 'completed' : 'pending',
      covered_topics: [node.conceptName],
      tasks: node.tasks || [],
    }))

  const adaptiveProfile = buildAdaptiveProfile(historyRows, masteryRows || [])
  const summaryByConcept = new Map((adaptiveProfile.conceptSummaries || []).map((entry) => [entry.conceptName, entry]))
  const masteryByConcept = new Map((masteryRows || []).map((entry) => [String(entry.concept_id), entry]))
  const weakConcepts = new Set((adaptiveProfile.weakConcepts || []).map((entry) => entry.conceptName))
  const reviewTargets = new Set((adaptiveProfile.reviewTargets || []).map((entry) => entry.conceptName))

  const graphNodes = inputNodes.map((node, index) => {
    const summary = summaryByConcept.get(node.conceptName)
    const masteryRow = masteryByConcept.get(node.conceptName)
    const mastery = inferMastery(node, summary, masteryRow)
    const timeSpentMin = Math.max(
      0,
      Math.round(sum((node.tasks || []).map((task) => Number(task?._adaptive?.completionTimeSec || 0))) / 60),
    )

    return {
      ...node,
      title: titleCase(node.conceptName),
      shortLabel: titleCase(node.conceptName).split(' ').slice(0, 3).join(' '),
      description: buildDescription(node),
      whyItMatters: buildWhyItMatters(node.conceptName, goalText, skillConfig),
      icon: inferIcon(node.conceptName, skillConfig),
      mastery,
      kind: node.isProject ? 'project' : node.isBoss ? 'boss' : node.isPlaceholder ? 'future' : 'concept',
      taskState: getTaskCompletionState(node),
      isComplete: node.status === 'done' || (node.totalTasks > 0 && node.completedTasks === node.totalTasks),
      summary,
      timeSpentMin,
      estimatedMinutes: node.totalMinutes || Math.max(20, Math.round(sum((node.tasks || []).map((task) => Number(task.durationMin) || 0)))),
      accuracy: clamp(summary?.accuracy, 0, 100, null),
      attempts: summary ? Number(summary.attempts.toFixed(1)) : 0,
      helpRate: summary ? Number((summary.helpRate * 100).toFixed(0)) : 0,
      confidenceTone: getConfidenceTone(summary),
      lastActivity: summary?.lastReview || summary?.lastCompletedAt || null,
      mistakes: buildMistakes(summary),
      weak: weakConcepts.has(node.conceptName) || (mastery < 55 && !node.isPlaceholder),
      prerequisiteIds: [],
      unlockConcepts: [],
      regionIndex: 0,
      muted: false,
      isCurrent: false,
    }
  })

  graphNodes.forEach((node, index) => {
    if (index === 0) return
    const previous = graphNodes[index - 1]
    const twoBack = graphNodes[index - 2]
    const prerequisites = []

    if (node.kind === 'project' || node.kind === 'boss') {
      if (previous) prerequisites.push(previous.id)
      if (twoBack && twoBack.kind !== 'future') prerequisites.push(twoBack.id)
    } else {
      if (previous) prerequisites.push(previous.id)
      if (index % 4 === 2 && twoBack && twoBack.kind !== 'future') prerequisites.push(twoBack.id)
    }

    node.prerequisiteIds = unique(prerequisites)
    node.unlockConcepts = node.prerequisiteIds
      .map((id) => graphNodes.find((entry) => entry.id === id)?.title)
      .filter(Boolean)
  })

  const statusById = new Map()
  graphNodes.forEach((node) => {
    const prerequisitesSatisfied = node.prerequisiteIds.every((id) => {
      const state = statusById.get(id)
      return ['mastered', 'review_needed', 'skipped'].includes(state)
    })
    const status = buildNodeStatus({
      node,
      prerequisitesSatisfied,
      weakConcepts,
      reviewTargets,
    })
    statusById.set(node.id, status)
    node.status = status
  })

  const currentFocus =
    (adaptiveProfile.learner?.userState === 'struggling'
      ? graphNodes.find((node) => node.status === 'review_needed' && node.weak)
      : null)
    || graphNodes.find((node) => node.status === 'in_progress')
    || graphNodes.find((node) => node.status === 'available')
    || graphNodes.find((node) => node.status === 'review_needed')
    || graphNodes.find((node) => node.status === 'mastered')
    || null

  if (currentFocus) currentFocus.isCurrent = true

  const currentIndex = currentFocus ? graphNodes.findIndex((node) => node.id === currentFocus.id) : -1
  graphNodes.forEach((node, index) => {
    node.muted = currentIndex >= 0 && Math.abs(index - currentIndex) > 5 && node.id !== currentFocus?.id
  })

  const nextUnlock = currentIndex >= 0
    ? graphNodes.slice(currentIndex + 1).find((node) => node.status === 'locked')
    : null

  const regions = []
  const regionChunkSize = 4

  for (let i = 0; i < graphNodes.length; i += regionChunkSize) {
    const regionNodes = graphNodes.slice(i, i + regionChunkSize)
    const regionIndex = regions.length
    const bannerTop = 36 + (regionIndex * (REGION_BANNER_HEIGHT + REGION_HEIGHT + REGION_GAP))
    const pattern = REGION_PATTERNS[regionIndex % REGION_PATTERNS.length]
    const completedCount = regionNodes.filter((node) => ['mastered', 'review_needed'].includes(node.status)).length
    const averageAccuracy = average(regionNodes.map((node) => node.accuracy).filter((value) => value != null), null)
    const starCount = averageAccuracy == null
      ? Math.min(3, Math.round((completedCount / Math.max(regionNodes.length, 1)) * 3))
      : averageAccuracy >= 90 ? 3 : averageAccuracy >= 75 ? 2 : averageAccuracy >= 60 ? 1 : 0

    const milestoneTitle = REGION_TITLES[regionIndex] || `Milestone ${regionIndex + 1}`
    const completionRatio = regionNodes.length > 0 ? completedCount / regionNodes.length : 0
    const world = worlds[regionIndex % Math.max(worlds.length, 1)] || null

    regionNodes.forEach((node, nodeIndex) => {
      const point = pattern[nodeIndex] || pattern[pattern.length - 1]
      node.regionIndex = regionIndex
      node.position = {
        x: point.x,
        y: bannerTop + REGION_BANNER_HEIGHT + point.y,
      }
    })

    regions.push({
      id: `region-${regionIndex + 1}`,
      regionIndex,
      title: milestoneTitle,
      subtitle: regionNodes[0]?.title || 'Upcoming Concepts',
      description: regionNodes.length
        ? `${completedCount}/${regionNodes.length} concepts stabilized in this region.`
        : 'New concepts will appear here as your plan expands.',
      nodes: regionNodes,
      completedCount,
      totalCount: regionNodes.length,
      starCount,
      completionRatio,
      world,
      top: bannerTop,
      height: REGION_BANNER_HEIGHT + REGION_HEIGHT,
    })
  }

  const completedMilestones = regions.filter((region) => region.completedCount === region.totalCount && region.totalCount > 0).length
  const identityLabel = buildIdentityLabel(skillConfig, completedMilestones)
  const completionRatio = graphNodes.length > 0
    ? graphNodes.filter((node) => ['mastered', 'review_needed'].includes(node.status)).length / graphNodes.length
    : 0
  const momentum = getMomentum(adaptiveProfile, completionRatio)
  const weakNodes = graphNodes.filter((node) => node.weak || node.status === 'review_needed')
  const nextAction = buildNextAction({
    currentFocus,
    weakNodes,
    nextUnlockTitle: nextUnlock?.title || null,
  })
  const canvasHeight = regions.length > 0
    ? regions[regions.length - 1].top + regions[regions.length - 1].height + 56
    : 420
  const edges = buildEdges(graphNodes, currentFocus?.id || null)

  return {
    skillType,
    skillConfig,
    adaptiveProfile,
    momentum,
    identityLabel,
    currentFocus,
    nextAction,
    nextUnlock,
    weakNodes,
    graphNodes,
    edges,
    regions,
    canvasWidth: CANVAS_WIDTH,
    canvasHeight,
  }
}
