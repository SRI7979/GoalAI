export function recordMasteryEvent({
  conceptId = '',
  topic = '',
  lessonId = '',
  slideId = '',
  interactionPrimitive = 'identify',
  domain = '',
  domainVisualType = '',
  correct = false,
  attempts = 1,
  needsReview = false,
} = {}) {
  const event = {
    conceptId,
    topic,
    lessonId,
    slideId,
    interactionPrimitive,
    domain,
    domainVisualType,
    correct: Boolean(correct),
    attempts: Math.max(1, Number(attempts) || 1),
    needsReview: Boolean(needsReview),
    timestamp: new Date().toISOString(),
  }

  try {
    if (typeof window !== 'undefined') {
      const key = 'pathai_mastery_events'
      const existing = JSON.parse(window.localStorage.getItem(key) || '[]')
      const next = Array.isArray(existing) ? [...existing.slice(-49), event] : [event]
      window.localStorage.setItem(key, JSON.stringify(next))
    }
  } catch {
    // Mastery storage is optional; lesson interaction should never fail because of it.
  }

  if (process.env.NODE_ENV !== 'production') {
    console.info('[PathAI] mastery_event', event)
  }

  return event
}
