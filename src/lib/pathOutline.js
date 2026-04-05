import { COURSE_FINAL_EXAM_WEIGHT, isCourseFinalExamTask } from '@/lib/courseCompletion'
import { getCourseOutlineStatus } from '@/lib/courseOutlineStore'

const UNIT_WEIGHT = 1
const PROJECT_WEIGHT = 2

function clamp(value, min, max, fallback = min) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.max(min, Math.min(max, parsed))
}

function slugify(value = '') {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function titleCase(value = '') {
  return String(value)
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function normalizeMatchValue(value = '') {
  return String(value)
    .replace(/[_-]+/g, ' ')
    .replace(/[^a-zA-Z0-9\s]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

function unique(values = []) {
  return [...new Set(values.filter(Boolean))]
}

function dedupeSequenceItems(items = []) {
  const seen = new Set()
  return items.filter((item, index) => {
    const signature = [
      item?.type || 'item',
      item?.kind || 'kind',
      item?.id || `index-${index}`,
      Number(item?.dayNumber || 0),
      Number(item?.sequenceIndex || 0),
    ].join('::')

    if (seen.has(signature)) return false
    seen.add(signature)
    return true
  })
}

function sortRows(rows = []) {
  return [...rows].sort((a, b) => Number(a?.day_number || 0) - Number(b?.day_number || 0))
}

function normalizeModules(courseOutline) {
  const rawModules = Array.isArray(courseOutline?.modules) ? courseOutline.modules : []
  let originalUnitIndex = 1

  return rawModules
    .map((module, moduleIndex) => {
      const rawDays = Array.isArray(module?.days) ? module.days : []
      const units = rawDays
        .slice()
        .sort((a, b) => {
          const aDay = Number(a?.day)
          const bDay = Number(b?.day)
          if (Number.isFinite(aDay) && Number.isFinite(bDay)) return aDay - bDay
          return 0
        })
        .map((day, dayIndex) => {
          const concepts = unique(
            (Array.isArray(day?.concepts) ? day.concepts : [])
              .map((concept) => titleCase(concept))
              .filter(Boolean),
          )
          const title = titleCase(day?.title || concepts[0] || `Unit ${dayIndex + 1}`)

          return {
            id: `unit-${originalUnitIndex}`,
            originalOrder: originalUnitIndex++,
            title,
            concepts: concepts.length > 0 ? concepts : [title],
            estimatedMinutes: clamp(day?.estimatedMinutes, 5, 240, 30),
            difficulty: clamp(day?.difficulty, 1, 5, 2),
            whyItMatters: String(day?.whyItMatters || day?.description || '').trim(),
          }
        })

      return {
        id: `module-${moduleIndex + 1}-${slugify(module?.title || `module-${moduleIndex + 1}`)}`,
        title: titleCase(module?.title || `Module ${moduleIndex + 1}`),
        description: String(module?.description || '').trim(),
        units,
      }
    })
    .filter((module) => module.units.length > 0)
}

function buildFallbackModules(rows = []) {
  const sortedRows = sortRows(rows)
  const chunkSize = 5
  const modules = []

  for (let start = 0; start < sortedRows.length; start += chunkSize) {
    const chunk = sortedRows.slice(start, start + chunkSize)
    modules.push({
      id: `module-fallback-${Math.floor(start / chunkSize) + 1}`,
      title: `Module ${Math.floor(start / chunkSize) + 1}`,
      description: 'Recovered from your generated daily plan while the structured course outline is unavailable.',
      moduleTier: 'mid',
      projectKind: null,
      units: chunk.map((row, index) => {
        const concepts = unique(
          (Array.isArray(row?.covered_topics) ? row.covered_topics : [])
            .map((concept) => titleCase(concept))
            .filter(Boolean),
        )
        const title = titleCase(row?.covered_topics?.[0] || `Day ${row?.day_number || start + index + 1}`)
        return {
          id: `unit-${row?.day_number || start + index + 1}`,
          originalOrder: Number(row?.day_number) || (start + index + 1),
          title,
          concepts: concepts.length > 0 ? concepts : [title],
          estimatedMinutes: clamp(row?.total_minutes, 5, 240, 30),
          difficulty: 2,
          whyItMatters: '',
          dayNumber: Number(row?.day_number) || (start + index + 1),
          sequenceIndex: Number(row?.day_number) || (start + index + 1),
          type: 'unit',
          kind: 'unit',
          weight: UNIT_WEIGHT,
          moduleTitle: `Module ${Math.floor(start / chunkSize) + 1}`,
        }
      }),
    })
  }

  return modules
}

function getModuleAverageDifficulty(module) {
  const difficulties = (Array.isArray(module?.units) ? module.units : [])
    .map((unit) => Number(unit?.difficulty))
    .filter((value) => Number.isFinite(value))
  if (difficulties.length === 0) return 2
  return difficulties.reduce((sum, value) => sum + value, 0) / difficulties.length
}

export function classifyModuleTier(module, index, totalModules) {
  const lower = `${module?.title || ''} ${module?.description || ''}`.toLowerCase()
  const earlyBoundary = Math.max(1, Math.floor(totalModules * 0.25))
  const lateBoundary = Math.max(0, totalModules - Math.max(1, Math.ceil(totalModules * 0.35)))
  const avgDifficulty = getModuleAverageDifficulty(module)

  if (
    /intro|introduction|foundation|foundations|basic|basics|fundamental|fundamentals|overview|get started|getting started/.test(lower)
    || index < earlyBoundary
  ) {
    return 'foundational'
  }

  if (
    /advanced|application|applied|systems|model|models|neural|deployment|capstone|project|portfolio|ship|production|final|integration|real world/.test(lower)
    || avgDifficulty >= 4
    || index >= lateBoundary
  ) {
    return 'major'
  }

  return 'mid'
}

function getProjectKindForModule(module, index, totalModules) {
  const moduleTier = classifyModuleTier(module, index, totalModules)
  if (moduleTier === 'foundational') return null
  if (moduleTier === 'major') return 'full_project'
  return 'mini_project'
}

export function getOutlineUnitCount(courseOutline) {
  return normalizeModules(courseOutline)
    .reduce((sum, module) => sum + module.units.length, 0)
}

export function courseOutlineNeedsRecovery(courseOutline, expectedUnitCount = 0) {
  if (getCourseOutlineStatus(courseOutline) === 'pending') return true
  const normalizedModules = normalizeModules(courseOutline)
  if (normalizedModules.length === 0) return true
  if (expectedUnitCount > 0 && getOutlineUnitCount(courseOutline) < expectedUnitCount) return true
  if (expectedUnitCount >= 18 && normalizedModules.length < 6) return true
  if (expectedUnitCount >= 10 && normalizedModules.length < 4) return true
  if (expectedUnitCount >= 5 && normalizedModules.length < 3) return true
  return false
}

export function buildCourseSequence({ courseOutline, goalText = '' } = {}) {
  const normalizedModules = normalizeModules(courseOutline)
  if (normalizedModules.length === 0) {
    return {
      modules: [],
      flatItems: [],
      plannedDayCount: 0,
      finalExamDayNumber: 1,
      goalText,
    }
  }

  const totalModules = normalizedModules.length
  let dayCursor = 1
  let sequenceIndex = 1

  const modules = normalizedModules.map((module, moduleIndex) => {
    const moduleTier = classifyModuleTier(module, moduleIndex, totalModules)
    const projectKind = getProjectKindForModule(module, moduleIndex, totalModules)
    const moduleConcepts = unique(module.units.flatMap((unit) => unit.concepts))
    const items = []

    module.units.forEach((unit) => {
      items.push({
        ...unit,
        type: 'unit',
        kind: 'unit',
        moduleId: module.id,
        moduleTitle: module.title,
        moduleTier,
        dayNumber: dayCursor,
        sequenceIndex,
        weight: UNIT_WEIGHT,
      })
      dayCursor += 1
      sequenceIndex += 1
    })

    if (projectKind) {
      const lastUnit = items[items.length - 1] || module.units[module.units.length - 1]
      if (lastUnit && typeof lastUnit === 'object') {
        lastUnit.hasAdjacentProject = true
        lastUnit.projectTitle = projectKind === 'full_project'
          ? `Milestone Project: ${module.title}`
          : `Mini Project: ${module.title}`
      }
      items.push({
        id: `project-after-${lastUnit?.id || slugify(module.title)}`,
        type: 'project',
        kind: projectKind,
        moduleId: module.id,
        moduleTitle: module.title,
        moduleTier,
        title: projectKind === 'full_project'
          ? `Milestone Project: ${module.title}`
          : `Mini Project: ${module.title}`,
        concepts: moduleConcepts.length > 0 ? moduleConcepts : [module.title],
        estimatedMinutes: projectKind === 'full_project' ? 60 : 40,
        difficulty: projectKind === 'full_project' ? 4 : 3,
        generated: false,
        completed: false,
        weight: PROJECT_WEIGHT,
        dayNumber: dayCursor,
        sequenceIndex,
        anchorUnitId: lastUnit?.id || null,
        afterUnitTitle: lastUnit?.title || module.title,
        milestoneLabel: `${projectKind === 'full_project' ? 'Major milestone' : 'Mini project'} after ${lastUnit?.title || module.title}`,
        impactLabel: `Counts as ${PROJECT_WEIGHT}x a normal unit`,
        whyItMatters: `This ${projectKind === 'full_project' ? 'full project' : 'mini project'} proves you can apply ${module.title} in one focused build day.`,
      })
      dayCursor += 1
      sequenceIndex += 1
    }

    return {
      ...module,
      moduleTier,
      projectKind,
      moduleConcepts,
      items,
    }
  })

  const plannedDayCount = dayCursor - 1

  return {
    modules,
    flatItems: modules.flatMap((module) => module.items),
    plannedDayCount,
    finalExamDayNumber: plannedDayCount + 1,
    goalText,
  }
}

function isProjectTask(task) {
  return task?.type === 'project' || task?.isProjectTrigger
}

function getTaskBuckets(row) {
  const tasks = Array.isArray(row?.tasks) ? row.tasks : []
  const projectTasks = tasks.filter(isProjectTask)
  const learningTasks = tasks.filter((task) => !isProjectTask(task) && !isCourseFinalExamTask(task))
  return { tasks, projectTasks, learningTasks }
}

function getProjectTask(row) {
  const tasks = Array.isArray(row?.tasks) ? row.tasks : []
  return tasks.find(isProjectTask) || null
}

function getFinalExamRow(rows = [], finalExamDayNumber = null) {
  const sortedRows = sortRows(rows)
  return sortedRows.find((row) => {
    if (finalExamDayNumber != null && Number(row?.day_number) !== Number(finalExamDayNumber)) return false
    const tasks = Array.isArray(row?.tasks) ? row.tasks : []
    return tasks.some(isCourseFinalExamTask)
  }) || null
}

function getRowLabels(row) {
  const tasks = Array.isArray(row?.tasks) ? row.tasks : []
  return unique([
    ...(Array.isArray(row?.covered_topics) ? row.covered_topics : []),
    ...tasks.flatMap((task) => {
      const concepts = Array.isArray(task?._concepts) ? task._concepts : []
      const topics = Array.isArray(task?._courseTopics) ? task._courseTopics : []
      return [
        task?.title,
        task?._concept,
        ...concepts,
        ...topics,
      ]
    }),
  ].map((value) => normalizeMatchValue(value)).filter(Boolean))
}

function hasTextMatch(rowLabels, expectedLabels) {
  return expectedLabels.some((expected) => (
    rowLabels.some((rowLabel) => (
      rowLabel === expected
      || rowLabel.includes(expected)
      || expected.includes(rowLabel)
    ))
  ))
}

export function isRowCompatibleWithSequenceItem(row, item) {
  if (!row || !item) return false
  const tasks = Array.isArray(row?.tasks) ? row.tasks : []

  if (item.type === 'final_exam') {
    return tasks.some(isCourseFinalExamTask)
  }

  if (item.type === 'project') {
    const projectTask = getProjectTask(row)
    if (!projectTask) return false
    const storedScale = projectTask?._projectScale || projectTask?._moduleProjectKind || null
    if (storedScale && storedScale !== item.kind) return false
    return true
  }

  if (tasks.some(isProjectTask) || tasks.some(isCourseFinalExamTask)) return false

  const rowLabels = getRowLabels(row)
  const expectedLabels = unique([
    item.title,
    ...(Array.isArray(item?.concepts) ? item.concepts : []),
    item.moduleTitle,
  ].map((value) => normalizeMatchValue(value)).filter(Boolean))

  return hasTextMatch(rowLabels, expectedLabels)
}

function buildWhyItMatters({ unitWhyItMatters, moduleTitle, moduleDescription, unitTitle, concepts, goalText }) {
  if (unitWhyItMatters) return unitWhyItMatters
  if (moduleDescription) return moduleDescription
  if (concepts.length > 1) {
    return `${unitTitle} combines ${concepts.slice(0, 3).join(', ')} so you can keep moving toward ${goalText || 'your goal'}.`
  }
  return `${unitTitle} is a core part of ${moduleTitle} and helps unlock the next part of ${goalText || 'your path'}.`
}

function buildCompletionContext({ status, generated, completedTasks, totalTasks, estimatedMinutes, type, kind }) {
  if (type === 'project') {
    if (status === 'completed') return 'Project day finished.'
    if (status === 'current') return kind === 'full_project' ? 'Full build day. Ship one substantial artifact.' : 'Mini project day. Apply the module in one focused build.'
    if (status === 'up_next') return 'This dedicated project day is next in your sequence.'
    return generated ? 'Project day is generated but not active yet.' : 'This project day unlocks after the module is finished.'
  }

  if (status === 'completed') {
    return totalTasks > 0
      ? `${completedTasks}/${totalTasks} learning tasks completed.`
      : 'This unit is finished.'
  }
  if (status === 'current') {
    return totalTasks > 0
      ? `${completedTasks}/${totalTasks} learning tasks completed so far.`
      : 'This is your active unit.'
  }
  if (status === 'up_next') {
    return `Queued next. Plan for about ${estimatedMinutes} minutes here.`
  }
  if (!generated) {
    return 'This unit unlocks as the earlier curriculum is completed and generated.'
  }
  return 'Visible on your path, but still waiting on the step ahead of it.'
}

function buildSubUnits({ concepts, status, completedTasks, totalTasks }) {
  const safeConcepts = concepts.length > 0 ? concepts : ['Current concept']

  if (status === 'completed') {
    return safeConcepts.map((concept, index) => ({
      id: `${slugify(concept)}-${index}`,
      title: concept,
      status: 'completed',
    }))
  }

  if (status === 'current') {
    const totalConcepts = safeConcepts.length
    const progressRatio = totalTasks > 0 ? completedTasks / totalTasks : 0
    const completedConceptCount = Math.max(
      0,
      Math.min(totalConcepts - 1, Math.floor(progressRatio * totalConcepts)),
    )

    return safeConcepts.map((concept, index) => ({
      id: `${slugify(concept)}-${index}`,
      title: concept,
      status: index < completedConceptCount ? 'completed' : index === completedConceptCount ? 'current' : 'locked',
    }))
  }

  if (status === 'up_next') {
    return safeConcepts.map((concept, index) => ({
      id: `${slugify(concept)}-${index}`,
      title: concept,
      status: index === 0 ? 'up_next' : 'locked',
    }))
  }

  return safeConcepts.map((concept, index) => ({
    id: `${slugify(concept)}-${index}`,
    title: concept,
    status: 'locked',
  }))
}

function getSubUnitTitle(item) {
  if (item?.type === 'project') {
    return item.kind === 'mini_project' ? 'Mini project' : 'Milestone project'
  }
  if (!Array.isArray(item?.subUnits) || item.subUnits.length === 0) return null
  const activeSubUnit = item.subUnits.find((subUnit) => subUnit.status === 'current' || subUnit.status === 'up_next')
  return activeSubUnit?.title || item.subUnits[item.subUnits.length - 1]?.title || null
}

function getTaskQualityScore(task = {}) {
  const adaptive = task?._adaptive || {}
  if (Number.isFinite(Number(adaptive.accuracy))) return clamp(adaptive.accuracy, 0, 100, 75)
  if (Number.isFinite(Number(adaptive.challengeScore))) return clamp(adaptive.challengeScore, 0, 100, 75)
  if (Number.isFinite(Number(adaptive.reflectionQuality))) return clamp(adaptive.reflectionQuality, 0, 100, 75)
  if (task.completed) {
    if (task.type === 'quiz') return 82
    if (task.type === 'challenge' || task.type === 'boss') return 80
    return 75
  }
  return null
}

function buildModuleIdentityLabel(title = '') {
  const lower = String(title || '').toLowerCase()
  if (/foundation|basic|intro|core/.test(lower)) return `${title} Complete`
  if (/data|prep|clean/.test(lower)) return 'Data Prep Apprentice'
  if (/model|tree|regression|classifier|algorithm|neural/.test(lower)) return 'Model Builder'
  if (/project|portfolio|ship|build/.test(lower)) return 'Project Finisher'
  return `${title} Specialist`
}

function buildModuleMasteryMeta(module, claimedModuleRewardIds = []) {
  const claimedSet = new Set(claimedModuleRewardIds)
  const completedLearningTasks = module.items
    .filter((item) => item.type === 'unit')
    .flatMap((item) => Array.isArray(item.rawRow?.tasks) ? item.rawRow.tasks : [])
    .filter((task) => task?.completed && !isProjectTask(task))

  const scoredTasks = completedLearningTasks.filter((task) => (
    task?.type === 'quiz' || task?.type === 'challenge' || task?.type === 'boss'
  ))
  const qualitySourceTasks = scoredTasks.length > 0 ? scoredTasks : completedLearningTasks

  const qualityScores = qualitySourceTasks
    .map(getTaskQualityScore)
    .filter((value) => Number.isFinite(value))

  const qualityScore = qualityScores.length > 0
    ? Math.round(qualityScores.reduce((sum, value) => sum + value, 0) / qualityScores.length)
    : module.completedUnits > 0 ? 75 : 0

  const masteryScore = module.progressPercent > 0
    ? Math.round((module.progressPercent * 0.75) + (qualityScore * 0.25))
    : 0
  const sealEarned = module.completedWeight >= module.totalWeight && module.totalWeight > 0
  const masteryStars = sealEarned
    ? 3
    : masteryScore >= 65
      ? 2
      : masteryScore >= 20
        ? 1
        : 0
  const rewardAmount = Math.min(60, 20 + (module.totalUnits * 5))
  const rewardClaimed = claimedSet.has(module.id)

  return {
    masteryScore,
    qualityScore,
    masteryStars,
    sealEarned,
    rewardAmount,
    rewardClaimed,
    identityLabel: sealEarned ? buildModuleIdentityLabel(module.title) : null,
  }
}

function buildFallbackTracker({ rows = [], todayRowId = null, goalText = '', claimedModuleRewardIds = [] }) {
  const sortedRows = sortRows(Array.isArray(rows) ? rows : [])
  const rowByDay = new Map(sortedRows.map((row) => [Number(row?.day_number), row]))
  const modulesSource = buildFallbackModules(sortedRows)

  if (modulesSource.length === 0) {
    return {
      mode: 'fallback',
      modules: [],
      tailItems: [],
      sequenceItems: [],
      overallPercent: 0,
      overallCompletedWeight: 0,
      overallTotalWeight: 0,
      totalModules: 0,
      completedModules: 0,
      sealedModules: 0,
      latestIdentityLabel: null,
      currentModuleId: null,
      currentItemId: null,
      currentUnitId: null,
      currentSubUnitTitle: null,
      currentDayNumber: null,
      currentItemKind: null,
      currentGeneratedRow: null,
      nextGeneratedRow: null,
      nextItemId: null,
      nextItemKind: null,
      nextDayNumber: null,
      nextUpLabel: 'Your plan is being prepared',
      plannedDayCount: 0,
      finalExamDayNumber: 1,
      courseCompleted: false,
      activeRow: null,
      lastCompletedRow: null,
      breadcrumb: {
        moduleTitle: null,
        unitTitle: null,
        subUnitTitle: null,
      },
    }
  }

  const modules = modulesSource.map((module) => {
    const items = module.units.map((unit) => {
      const row = rowByDay.get(Number(unit.dayNumber)) || null
      const { learningTasks } = getTaskBuckets(row)
      const completedTasks = learningTasks.filter((task) => task?.completed).length
      const totalTasks = learningTasks.length
      const generated = Boolean(row)
      const completed = generated
        ? totalTasks > 0
          ? completedTasks === totalTasks
          : row?.completion_status === 'completed'
        : false

      return {
        ...unit,
        generated,
        completed,
        completedTasks,
        totalTasks,
        rawRow: row,
        today: row?.id === todayRowId,
        whyItMatters: buildWhyItMatters({
          unitWhyItMatters: unit.whyItMatters,
          moduleTitle: module.title,
          moduleDescription: module.description,
          unitTitle: unit.title,
          concepts: unit.concepts,
          goalText,
        }),
      }
    })

    return {
      ...module,
      items: dedupeSequenceItems(items),
    }
  })

  const flatItems = modules.flatMap((module) => module.items)
  const currentItem = flatItems.find((item) => !item.completed) || null
  const lastCompletedItem = [...flatItems].reverse().find((item) => item.completed) || null
  const anchorItem = currentItem || lastCompletedItem || flatItems[0] || null
  const nextItem = currentItem
    ? flatItems.find((item) => item.sequenceIndex > currentItem.sequenceIndex) || null
    : null

  const statusById = new Map()
  flatItems.forEach((item) => {
    let status = 'locked'
    if (item.completed) status = 'completed'
    else if (currentItem?.id === item.id) status = 'current'
    else if (nextItem?.id === item.id) status = 'up_next'
    statusById.set(item.id, status)
  })

  const enrichedModules = modules.map((module) => {
    const items = module.items.map((item) => {
      const status = statusById.get(item.id) || 'locked'
      const completionPercent = item.completed
        ? 100
        : item.totalTasks > 0
          ? Math.round((item.completedTasks / item.totalTasks) * 100)
          : 0
      const subUnits = buildSubUnits({
        concepts: item.concepts,
        status,
        completedTasks: item.completedTasks,
        totalTasks: item.totalTasks,
      })

      return {
        ...item,
        status,
        completionPercent,
        completionContext: buildCompletionContext({
          status,
          generated: item.generated,
          completedTasks: item.completedTasks,
          totalTasks: item.totalTasks,
          estimatedMinutes: item.estimatedMinutes,
          type: item.type,
          kind: item.kind,
        }),
        subUnits,
      }
    })

    const totalWeight = items.reduce((sum, item) => sum + item.weight, 0)
    const completedWeight = items.reduce((sum, item) => sum + (item.completed ? item.weight : 0), 0)
    const unitItems = items.filter((item) => item.type === 'unit')
    const completedUnits = unitItems.filter((item) => item.completed).length
    const progressPercent = totalWeight > 0 ? Math.round((completedWeight / totalWeight) * 100) : 0

    const baseModule = {
      ...module,
      items,
      totalWeight,
      completedWeight,
      totalUnits: unitItems.length,
      completedUnits,
      progressPercent,
      status: completedWeight >= totalWeight
        ? 'completed'
        : items.some((item) => item.id === anchorItem?.id || item.id === nextItem?.id || item.id === currentItem?.id)
          ? 'current'
          : 'upcoming',
    }

    return {
      ...baseModule,
      ...buildModuleMasteryMeta(baseModule, claimedModuleRewardIds),
    }
  })

  const overallTotalWeight = enrichedModules.reduce((sum, module) => sum + module.totalWeight, 0)
  const overallCompletedWeight = enrichedModules.reduce((sum, module) => sum + module.completedWeight, 0)
  const overallPercent = overallTotalWeight > 0
    ? Math.round((overallCompletedWeight / overallTotalWeight) * 100)
    : 0

  const anchorModule = enrichedModules.find((module) => module.id === anchorItem?.moduleId) || enrichedModules[0]
  const currentUnit = anchorModule?.items.find((item) => item.id === currentItem?.id) || null
  const sealedModules = enrichedModules.filter((module) => module.sealEarned)
  const latestIdentityLabel = [...sealedModules].reverse().find((module) => module.identityLabel)?.identityLabel || null
  const currentGeneratedRow = currentItem?.rawRow || null
  const nextGeneratedRow = nextItem?.rawRow || null
  const lastCompletedRow = lastCompletedItem?.rawRow || null

  return {
    mode: 'fallback',
    modules: enrichedModules,
    tailItems: [],
    sequenceItems: enrichedModules.flatMap((module) => module.items),
    overallPercent,
    overallCompletedWeight,
    overallTotalWeight,
    totalModules: enrichedModules.length,
    completedModules: enrichedModules.filter((module) => module.status === 'completed').length,
    sealedModules: sealedModules.length,
    latestIdentityLabel,
    currentModuleId: anchorModule?.id || null,
    currentItemId: currentItem?.id || null,
    currentUnitId: currentUnit?.id || null,
    currentSubUnitTitle: getSubUnitTitle(currentUnit),
    currentDayNumber: currentItem?.dayNumber || null,
    currentItemKind: currentItem?.kind || null,
    currentGeneratedRow,
    nextGeneratedRow,
    nextItemId: nextItem?.id || null,
    nextItemKind: nextItem?.kind || null,
    nextDayNumber: nextItem?.dayNumber || null,
    nextUpLabel: nextItem?.title || (currentItem ? 'Keep moving through your current focus' : 'Course complete'),
    plannedDayCount: flatItems.length,
    finalExamDayNumber: flatItems.length + 1,
    courseCompleted: flatItems.length > 0 && flatItems.every((item) => item.completed),
    activeRow: currentGeneratedRow || lastCompletedRow || null,
    lastCompletedRow,
    breadcrumb: {
      moduleTitle: anchorModule?.title || null,
      unitTitle: anchorItem?.title || null,
      subUnitTitle: getSubUnitTitle(currentUnit),
    },
  }
}

export function buildPathOutlineTracker({ courseOutline, rows = [], todayRowId = null, goalText = '', claimedModuleRewardIds = [] }) {
  const sequence = buildCourseSequence({ courseOutline, goalText })
  if (sequence.modules.length === 0) {
    return buildFallbackTracker({ rows, todayRowId, goalText, claimedModuleRewardIds })
  }

  const sortedRows = sortRows(Array.isArray(rows) ? rows : [])
  const rowByDay = new Map(sortedRows.map((row) => [Number(row?.day_number), row]))

  const modules = sequence.modules.map((module) => {
    const items = module.items.map((item) => {
      const rowCandidate = rowByDay.get(Number(item.dayNumber)) || null
      const matchedRow = isRowCompatibleWithSequenceItem(rowCandidate, item) ? rowCandidate : null

      if (item.type === 'project') {
        const projectTask = matchedRow ? getProjectTask(matchedRow) : null
        return {
          ...item,
          generated: Boolean(matchedRow),
          completed: Boolean(projectTask?.completed || matchedRow?.completion_status === 'completed'),
          rawRow: matchedRow,
          rawTask: projectTask,
          today: matchedRow?.id === todayRowId,
        }
      }

      const { learningTasks } = getTaskBuckets(matchedRow)
      const completedTasks = learningTasks.filter((task) => task?.completed).length
      const totalTasks = learningTasks.length
      const generated = Boolean(matchedRow)
      const completed = generated
        ? totalTasks > 0
          ? completedTasks === totalTasks
          : matchedRow?.completion_status === 'completed'
        : false

      return {
        ...item,
        generated,
        completed,
        completedTasks,
        totalTasks,
        rawRow: matchedRow,
        today: matchedRow?.id === todayRowId,
        whyItMatters: buildWhyItMatters({
          unitWhyItMatters: item.whyItMatters,
          moduleTitle: module.title,
          moduleDescription: module.description,
          unitTitle: item.title,
          concepts: item.concepts,
          goalText,
        }),
      }
    })

    return {
      ...module,
      items: dedupeSequenceItems(items),
    }
  })

  const finalExamRow = getFinalExamRow(sortedRows, sequence.finalExamDayNumber)
  const finalExamTask = finalExamRow
    ? (Array.isArray(finalExamRow.tasks) ? finalExamRow.tasks : []).find(isCourseFinalExamTask) || null
    : null

  const tailItems = [{
    type: 'final_exam',
    kind: 'final_exam',
    id: `final-exam-${sequence.finalExamDayNumber}`,
    moduleId: modules[modules.length - 1]?.id || null,
    title: finalExamTask?.title || 'Final Course Exam',
    generated: Boolean(finalExamRow),
    completed: Boolean(finalExamTask?.completed || finalExamRow?.completion_status === 'completed'),
    weight: COURSE_FINAL_EXAM_WEIGHT,
    sequenceIndex: sequence.plannedDayCount + 1,
    dayNumber: sequence.finalExamDayNumber,
    rawTask: finalExamTask,
    rawRow: finalExamRow,
    milestoneLabel: 'Comprehensive course finish',
    impactLabel: `Counts as ${COURSE_FINAL_EXAM_WEIGHT}x a normal unit`,
    attemptsUsed: Number(finalExamTask?._courseFinal?.attemptsUsed) || 0,
    maxAttempts: Number(finalExamTask?._courseFinal?.maxAttempts) || 3,
    bestScore: Number(finalExamTask?._courseFinal?.bestScore) || 0,
    passScore: Number(finalExamTask?._courseFinal?.passScore) || 80,
  }]

  const flatItems = [...modules.flatMap((module) => module.items), ...tailItems]
  const currentItem = flatItems.find((item) => !item.completed) || null
  const lastCompletedItem = [...flatItems].reverse().find((item) => item.completed) || null
  const anchorItem = currentItem || lastCompletedItem || flatItems[0] || null
  const nextItem = currentItem
    ? flatItems.find((item) => item.sequenceIndex > currentItem.sequenceIndex) || null
    : null

  const statusById = new Map()
  flatItems.forEach((item) => {
    let status = 'locked'
    if (item.completed) status = 'completed'
    else if (currentItem?.id === item.id) status = 'current'
    else if (nextItem?.id === item.id) status = 'up_next'
    statusById.set(item.id, status)
  })

  const enrichedModules = modules.map((module) => {
    const items = module.items.map((item) => {
      const status = statusById.get(item.id) || 'locked'

      if (item.type === 'project') {
        return {
          ...item,
          status,
          completionPercent: item.completed ? 100 : 0,
          completionContext: buildCompletionContext({
            status,
            generated: item.generated,
            completedTasks: item.completed ? 1 : 0,
            totalTasks: 1,
            estimatedMinutes: item.estimatedMinutes,
            type: item.type,
            kind: item.kind,
          }),
        }
      }

      const completionPercent = item.completed
        ? 100
        : item.totalTasks > 0
          ? Math.round((item.completedTasks / item.totalTasks) * 100)
          : 0
      const subUnits = buildSubUnits({
        concepts: item.concepts,
        status,
        completedTasks: item.completedTasks,
        totalTasks: item.totalTasks,
      })

      return {
        ...item,
        status,
        completionPercent,
        completionContext: buildCompletionContext({
          status,
          generated: item.generated,
          completedTasks: item.completedTasks,
          totalTasks: item.totalTasks,
          estimatedMinutes: item.estimatedMinutes,
          type: item.type,
          kind: item.kind,
        }),
        subUnits,
      }
    })

    const totalWeight = items.reduce((sum, item) => sum + item.weight, 0)
    const completedWeight = items.reduce((sum, item) => sum + (item.completed ? item.weight : 0), 0)
    const unitItems = items.filter((item) => item.type === 'unit')
    const completedUnits = unitItems.filter((item) => item.completed).length
    const progressPercent = totalWeight > 0 ? Math.round((completedWeight / totalWeight) * 100) : 0

    const baseModule = {
      ...module,
      items,
      totalWeight,
      completedWeight,
      totalUnits: unitItems.length,
      completedUnits,
      progressPercent,
      status: completedWeight >= totalWeight
        ? 'completed'
        : items.some((item) => item.id === anchorItem?.id || item.id === nextItem?.id || item.id === currentItem?.id)
          ? 'current'
          : 'upcoming',
    }

    return {
      ...baseModule,
      ...buildModuleMasteryMeta(baseModule, claimedModuleRewardIds),
    }
  })

  const enrichedTailItems = tailItems.map((item) => ({
    ...item,
    status: statusById.get(item.id) || 'locked',
    completionPercent: item.completed ? 100 : 0,
  }))

  const moduleCompletedWeight = enrichedModules.reduce((sum, module) => sum + module.completedWeight, 0)
  const moduleTotalWeight = enrichedModules.reduce((sum, module) => sum + module.totalWeight, 0)
  const tailCompletedWeight = enrichedTailItems.reduce((sum, item) => sum + (item.completed ? item.weight : 0), 0)
  const tailTotalWeight = enrichedTailItems.reduce((sum, item) => sum + item.weight, 0)
  const overallCompletedWeight = moduleCompletedWeight + tailCompletedWeight
  const overallTotalWeight = moduleTotalWeight + tailTotalWeight
  const overallPercent = overallTotalWeight > 0
    ? Math.round((overallCompletedWeight / overallTotalWeight) * 100)
    : 0

  const sealedModules = enrichedModules.filter((module) => module.sealEarned)
  const latestIdentityLabel = [...sealedModules].reverse().find((module) => module.identityLabel)?.identityLabel || null
  const currentGeneratedRow = currentItem?.rawRow || null
  const nextGeneratedRow = nextItem?.rawRow || null
  const lastCompletedRow = lastCompletedItem?.rawRow || null

  const anchorModule = currentItem?.type === 'final_exam'
    ? enrichedModules[enrichedModules.length - 1] || null
    : enrichedModules.find((module) => module.id === anchorItem?.moduleId) || enrichedModules[0] || null
  const anchorUnit = currentItem?.type === 'project'
    ? anchorModule?.items.find((item) => item.id === currentItem.anchorUnitId) || null
    : currentItem?.type === 'unit'
      ? anchorModule?.items.find((item) => item.id === currentItem.id) || null
      : anchorModule?.items.find((item) => item.id === anchorItem?.id) || null

  return {
    mode: 'outline',
    modules: enrichedModules,
    tailItems: enrichedTailItems,
    sequenceItems: [...enrichedModules.flatMap((module) => module.items), ...enrichedTailItems],
    overallPercent,
    overallCompletedWeight,
    overallTotalWeight,
    totalModules: enrichedModules.length,
    completedModules: enrichedModules.filter((module) => module.completedWeight >= module.totalWeight && module.totalWeight > 0).length,
    sealedModules: sealedModules.length,
    latestIdentityLabel,
    currentModuleId: anchorModule?.id || null,
    currentItemId: currentItem?.id || null,
    currentUnitId: anchorUnit?.id || null,
    currentSubUnitTitle: currentItem?.type === 'final_exam'
      ? 'Comprehensive assessment'
      : getSubUnitTitle(currentItem?.type === 'project' ? currentItem : anchorUnit),
    currentDayNumber: currentItem?.dayNumber || null,
    currentItemKind: currentItem?.kind || null,
    currentGeneratedRow,
    nextGeneratedRow,
    nextItemId: nextItem?.id || null,
    nextItemKind: nextItem?.kind || null,
    nextDayNumber: currentItem?.dayNumber || null,
    nextUpLabel: nextItem?.title || (
      currentItem?.type === 'final_exam'
        ? 'Pass the final exam to complete the course'
        : currentItem
          ? 'Keep moving through your current focus'
          : 'Course complete'
    ),
    plannedDayCount: sequence.plannedDayCount,
    finalExamDayNumber: sequence.finalExamDayNumber,
    courseCompleted: flatItems.length > 0 && flatItems.every((item) => item.completed),
    activeRow: currentGeneratedRow || lastCompletedRow || null,
    lastCompletedRow,
    breadcrumb: {
      moduleTitle: currentItem?.type === 'final_exam'
        ? 'Course Finish'
        : anchorModule?.title || null,
      unitTitle: currentItem?.title || anchorUnit?.title || null,
      subUnitTitle: currentItem?.type === 'project'
        ? getSubUnitTitle(currentItem)
        : currentItem?.type === 'final_exam'
          ? 'Comprehensive assessment'
          : getSubUnitTitle(anchorUnit),
    },
  }
}
