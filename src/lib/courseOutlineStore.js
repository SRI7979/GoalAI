const COURSE_OUTLINE_CONSTRAINT_PREFIX = '__pathai_course_outline__:'

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
  if (goalLike?.course_outline && typeof goalLike.course_outline === 'object') return goalLike.course_outline
  return extractCourseOutlineFromConstraints(goalLike?.constraints)
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
