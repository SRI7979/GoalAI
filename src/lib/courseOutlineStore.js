const COURSE_OUTLINE_CONSTRAINT_PREFIX = '__pathai_course_outline__:'
const DEFAULT_OUTLINE_STATUS = 'ready'
const FALLBACK_MODULE_DAY_STAGES = [
  'Foundations',
  'Mental Model',
  'Guided Practice',
  'Pattern Recognition',
  'Applied Practice',
  'Independent Use',
  'Integration',
  'Refinement',
]

function safeParseJson(value) {
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

function normalizeConstraints(constraints) {
  if (Array.isArray(constraints)) return constraints.filter((entry) => typeof entry === 'string')
  if (typeof constraints === 'string' && constraints.trim()) return [constraints]
  return []
}

function normalizeComparableText(value = '') {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, ' ')
    .replace(/\s+/g, ' ')
}

function dedupeTopicList(values = []) {
  const seen = new Set()
  const ordered = []
  values.forEach((value) => {
    const cleanValue = String(value || '').trim()
    const normalized = normalizeComparableText(cleanValue)
    if (!normalized || seen.has(normalized)) return
    seen.add(normalized)
    ordered.push(cleanValue)
  })
  return ordered
}

function rebuildOutlineConcepts(modules = []) {
  const concepts = []
  let conceptId = 1

  modules.forEach((module) => {
    const moduleTitle = String(module?.title || '').trim()
    const days = Array.isArray(module?.days) ? module.days : []
    days.forEach((day) => {
      const dayTitle = String(day?.title || '').trim() || moduleTitle || `Day ${conceptId}`
      const dayConcepts = dedupeTopicList([
        dayTitle,
        ...(Array.isArray(day?.concepts) ? day.concepts : []),
      ])

      concepts.push({
        id: conceptId,
        name: dayConcepts[0] || dayTitle,
        description: `${moduleTitle || 'Module'}: ${dayTitle}. Concepts: ${dayConcepts.join(', ')}`,
        estimatedDays: 1,
        dependencies: conceptId > 1 ? [conceptId - 1] : [],
        difficulty: Number(day?.difficulty) || 2,
        _moduleTitle: moduleTitle,
        _dayTitle: dayTitle,
        _allConcepts: dayConcepts,
      })
      conceptId += 1
    })
  })

  return concepts
}

function upgradeDeterministicOutlineDays(courseOutline) {
  if (!courseOutline || typeof courseOutline !== 'object') return courseOutline

  const modules = Array.isArray(courseOutline.modules) ? courseOutline.modules : []
  if (modules.length === 0) return courseOutline

  const source = String(courseOutline?._pathai?.source || '').trim().toLowerCase()
  const status = String(courseOutline?._pathai?.status || '').trim().toLowerCase()

  let changed = false
  const upgradedModules = modules.map((module) => {
    const moduleTitle = String(module?.title || '').trim()
    const moduleKey = normalizeComparableText(moduleTitle)
    const rawDays = Array.isArray(module?.days) ? module.days : []
    if (rawDays.length <= 1) return module

    const normalizedTitles = rawDays
      .map((day) => normalizeComparableText(day?.title || day?.concepts?.[0] || ''))
      .filter(Boolean)
    const duplicateTitles = new Set(
      normalizedTitles.filter((title, index) => normalizedTitles.indexOf(title) !== index),
    )
    const moduleLooksLegacy = rawDays.some((day) => {
      const titleKey = normalizeComparableText(day?.title || '')
      const primaryConceptKey = normalizeComparableText(day?.concepts?.[0] || '')
      return (
        titleKey === moduleKey
        || primaryConceptKey === moduleKey
        || duplicateTitles.has(titleKey)
        || (!titleKey && primaryConceptKey === moduleKey)
      )
    })

    if (!moduleLooksLegacy && source !== 'deterministic' && status !== 'deterministic') {
      return module
    }

    const upgradedDays = rawDays.map((day, dayIndex) => {
      const stageLabel = FALLBACK_MODULE_DAY_STAGES[dayIndex] || `Focus Lab ${dayIndex + 1}`
      const fallbackTitle = moduleTitle ? `${moduleTitle}: ${stageLabel}` : stageLabel
      const priorConcepts = Array.isArray(day?.concepts) ? day.concepts : []
      const upgradedConcepts = dedupeTopicList([
        fallbackTitle,
        moduleTitle,
        stageLabel,
        ...priorConcepts,
      ])

      const titleKey = normalizeComparableText(day?.title || '')
      const primaryConceptKey = normalizeComparableText(priorConcepts[0] || '')
      const shouldReplaceTitle = (
        !titleKey
        || titleKey === moduleKey
        || duplicateTitles.has(titleKey)
        || primaryConceptKey === moduleKey
      )
      const nextTitle = shouldReplaceTitle ? fallbackTitle : String(day?.title || '').trim()
      const nextConcepts = dedupeTopicList([nextTitle, ...upgradedConcepts])

      if (nextTitle !== String(day?.title || '').trim()) changed = true
      if (JSON.stringify(nextConcepts) !== JSON.stringify(priorConcepts)) changed = true

      return {
        ...day,
        title: nextTitle,
        concepts: nextConcepts,
      }
    })

    return {
      ...module,
      days: upgradedDays,
    }
  })

  if (!changed) return courseOutline

  return {
    ...courseOutline,
    modules: upgradedModules,
    concepts: rebuildOutlineConcepts(upgradedModules),
    _pathai: {
      ...courseOutline._pathai,
      upgradedFallbackDays: true,
    },
  }
}

export function stripStoredCourseOutlineConstraint(constraints) {
  return normalizeConstraints(constraints)
    .filter((entry) => !String(entry).startsWith(COURSE_OUTLINE_CONSTRAINT_PREFIX))
}

export function extractCourseOutlineFromConstraints(constraints) {
  const encoded = normalizeConstraints(constraints)
    .find((entry) => String(entry).startsWith(COURSE_OUTLINE_CONSTRAINT_PREFIX))

  if (!encoded) return null
  return safeParseJson(String(encoded).slice(COURSE_OUTLINE_CONSTRAINT_PREFIX.length))
}

export function getStoredCourseOutline(goalLike) {
  const storedOutline = goalLike?.course_outline && typeof goalLike.course_outline === 'object'
    ? goalLike.course_outline
    : extractCourseOutlineFromConstraints(goalLike?.constraints)
  return upgradeDeterministicOutlineDays(storedOutline)
}

export function getCourseOutlineStatus(courseOutline) {
  const status = courseOutline?._pathai?.status
  if (status === 'pending' || status === 'deterministic' || status === 'ready') return status
  return DEFAULT_OUTLINE_STATUS
}

export function withCourseOutlineMeta(courseOutline, meta = {}) {
  if (!courseOutline || typeof courseOutline !== 'object') return courseOutline
  return {
    ...courseOutline,
    _pathai: {
      status: DEFAULT_OUTLINE_STATUS,
      ...courseOutline._pathai,
      ...meta,
    },
  }
}

export function withStoredCourseOutlineConstraints(constraints, courseOutline) {
  const visibleConstraints = stripStoredCourseOutlineConstraint(constraints)
  if (!courseOutline) return visibleConstraints
  return [...visibleConstraints, `${COURSE_OUTLINE_CONSTRAINT_PREFIX}${JSON.stringify(courseOutline)}`]
}

export function hydrateGoalCourseOutline(goalLike) {
  if (!goalLike || typeof goalLike !== 'object') return goalLike
  return {
    ...goalLike,
    course_outline: getStoredCourseOutline(goalLike),
    constraints: stripStoredCourseOutlineConstraint(goalLike.constraints),
  }
}

export async function persistCourseOutline({ supabase, goalId, constraints = [], courseOutline }) {
  let sourceConstraints = constraints
  if ((!Array.isArray(sourceConstraints) || sourceConstraints.length === 0) && goalId) {
    const { data } = await supabase
      .from('goals')
      .select('constraints')
      .eq('id', goalId)
      .maybeSingle()
    sourceConstraints = data?.constraints || []
  }

  const mergedConstraints = withStoredCourseOutlineConstraints(sourceConstraints, courseOutline)

  const { error } = await supabase
    .from('goals')
    .update({ course_outline: courseOutline, constraints: mergedConstraints })
    .eq('id', goalId)

  if (!error) return

  const missingColumn = /course_outline/i.test(error.message || '')
  if (!missingColumn) {
    throw new Error(`Failed to save course outline: ${error.message}`)
  }

  const { error: fallbackError } = await supabase
    .from('goals')
    .update({ constraints: mergedConstraints })
    .eq('id', goalId)

  if (fallbackError) {
    throw new Error(`Failed to save course outline: ${fallbackError.message}`)
  }
}
