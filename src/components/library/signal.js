import { componentSignalSchema } from './schemas'
import { validateAgainstSchema } from './schemaValidator'

function clamp(value, min, max, fallback) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return fallback
  return Math.max(min, Math.min(max, numeric))
}

export function normalizeComponentSignal(partial = {}, fallback = {}) {
  const normalized = {
    componentType: partial.componentType || fallback.componentType,
    conceptIds: Array.isArray(partial.conceptIds)
      ? partial.conceptIds
      : (Array.isArray(fallback.conceptIds) ? fallback.conceptIds : []),
    correct: typeof partial.correct === 'boolean' ? partial.correct : null,
    confidence: clamp(partial.confidence, 0, 1, 0.5),
    hesitationMs: Math.round(clamp(partial.hesitationMs, 0, Number.MAX_SAFE_INTEGER, 0)),
    totalMs: Math.round(clamp(partial.totalMs, 0, Number.MAX_SAFE_INTEGER, 0)),
    hintsUsed: Math.round(clamp(partial.hintsUsed, 0, Number.MAX_SAFE_INTEGER, 0)),
    attempts: Math.round(clamp(partial.attempts, 0, Number.MAX_SAFE_INTEGER, 1)),
  }

  if ('rawResponse' in partial) normalized.rawResponse = partial.rawResponse
  return normalized
}

export function validateComponentSignal(signal) {
  return validateAgainstSchema(componentSignalSchema, signal, 'signal')
}
