'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { EVENTS, track } from '@/lib/analytics'
import { normalizeComponentSignal, validateComponentSignal } from './signal'
import styles from './ComponentLibrary.module.css'

const COMPONENT_LABELS = Object.freeze({
  concept_explainer: 'Learn',
  worked_example: 'Guided example',
  multiple_choice_quiz: 'Quick check',
  free_response: 'Explain it',
  flashcard_drill: 'Recall',
  code_predictor: 'Predict',
  dynamic_diagram: 'Visual',
  code_sandbox: 'Build',
  code_debugger: 'Debug',
  audio_listen: 'Listen',
  audio_speak: 'Speak',
  image_identify: 'Identify',
  drag_match: 'Match',
  order_steps: 'Order',
  timed_problem_set: 'Practice',
  roleplay_scenario: 'Roleplay',
  case_study_analyze: 'Case study',
  reflection_prompt: 'Reflect',
  do_in_real_world: 'Apply',
  mock_exam: 'Mastery check',
  concept_map_build: 'Concept map',
})

function getComponentLabel(type) {
  return COMPONENT_LABELS[type] || 'Lesson step'
}

export default function ComponentShell({
  componentType,
  conceptIds = [],
  missionId = null,
  position = 0,
  title,
  error = null,
  loading = false,
  loadingMessage = 'Loading...',
  children,
  onSignal,
}) {
  const [mountedAt] = useState(() => Date.now())
  const [firstInteractionAt, setFirstInteractionAt] = useState(null)
  const [completedSignal, setCompletedSignal] = useState(null)
  const [signalError, setSignalError] = useState('')
  const [localLoading, setLocalLoadingState] = useState({ active: false, message: '' })
  const [confusionReported, setConfusionReported] = useState(false)
  const [shellId] = useState(() => `component-shell-${Math.random().toString(36).slice(2)}`)

  const safeConceptIds = useMemo(
    () => (Array.isArray(conceptIds) ? conceptIds.map(String).filter(Boolean) : []),
    [conceptIds],
  )

  useEffect(() => {
    const renderedAt = Date.now()
    let completed = false
    let interacted = false
    const handleShellEvent = (event) => {
      if (event?.detail?.shellId !== shellId) return
      if (event.detail.type === 'complete') completed = true
      if (event.detail.type === 'interaction') interacted = true
    }
    window.addEventListener('pathai-component-shell-event', handleShellEvent)
    track(EVENTS.COMPONENT_RENDERED, {
      component_type: componentType,
      mission_id: missionId,
      concept_ids: safeConceptIds,
      position,
    }, { missionId })

    return () => {
      window.removeEventListener('pathai-component-shell-event', handleShellEvent)
      if (completed) return
      track(EVENTS.COMPONENT_ABANDONED, {
        component_type: componentType,
        mission_id: missionId,
        concept_ids: safeConceptIds,
        position,
        total_ms: Date.now() - renderedAt,
        interacted,
      }, { missionId })
    }
  }, [componentType, missionId, position, safeConceptIds, shellId])

  const markInteraction = useCallback(() => {
    const now = Date.now()
    setFirstInteractionAt((current) => current || now)
    window.dispatchEvent(new CustomEvent('pathai-component-shell-event', {
      detail: { shellId, type: 'interaction' },
    }))
  }, [shellId])

  const setLoading = useCallback((active, message = 'Loading...') => {
    setLocalLoadingState({ active: Boolean(active), message: message || 'Loading...' })
  }, [])

  const emitSignal = useCallback((partialSignal = {}) => {
    const now = Date.now()
    const resolvedFirstInteractionAt = firstInteractionAt || now
    const signal = normalizeComponentSignal({
      ...partialSignal,
      hesitationMs: partialSignal.hesitationMs ?? resolvedFirstInteractionAt - mountedAt,
      totalMs: partialSignal.totalMs ?? now - mountedAt,
    }, {
      componentType,
      conceptIds: safeConceptIds,
    })
    const validation = validateComponentSignal(signal)
    if (!validation.ok) {
      setSignalError(validation.errors.join(' '))
      return
    }
    setSignalError('')
    setCompletedSignal(signal)
    window.dispatchEvent(new CustomEvent('pathai-component-shell-event', {
      detail: { shellId, type: 'complete' },
    }))
    track(EVENTS.COMPONENT_COMPLETED, {
      component_type: signal.componentType,
      mission_id: missionId,
      concept_ids: signal.conceptIds,
      correct: signal.correct,
      confidence: signal.confidence,
      total_ms: signal.totalMs,
      hesitation_ms: signal.hesitationMs,
      attempts: signal.attempts,
      hints_used: signal.hintsUsed,
    }, { missionId })
    onSignal?.(signal)
  }, [componentType, firstInteractionAt, missionId, mountedAt, onSignal, safeConceptIds, shellId])

  const reportConfusion = useCallback(() => {
    if (confusionReported) return
    setConfusionReported(true)
    markInteraction()
    track(EVENTS.COMPONENT_CONFUSION_REPORTED, {
      component_type: componentType,
      mission_id: missionId,
      concept_ids: safeConceptIds,
      position,
      total_ms: Date.now() - mountedAt,
    }, { missionId })
  }, [componentType, confusionReported, markInteraction, missionId, mountedAt, position, safeConceptIds])

  const isLoading = Boolean(loading || localLoading.active)
  const resolvedLoadingMessage = loading ? loadingMessage : localLoading.message
  const displayLabel = getComponentLabel(componentType)

  return (
    <section className={styles.shell} data-component-type={componentType}>
      <div className={styles.shellHeader}>
        <div className={styles.titleCluster}>
          <div className={styles.eyebrow}>{displayLabel}</div>
          <h2 className={styles.shellTitle}>{title || 'Component'}</h2>
        </div>
        <div className={styles.progressDot}>{Number(position) + 1}</div>
      </div>
      <div className={styles.shellBody}>
        {error ? (
          <div className={styles.error}>{error}</div>
        ) : (
          children?.({ emitSignal, markInteraction, completedSignal, setLoading, loading: isLoading })
        )}
        {isLoading ? (
          <div className={styles.loadingState} role="status" aria-live="polite">
            <span className={styles.spinner} aria-hidden="true" />
            <span>{resolvedLoadingMessage || 'Loading...'}</span>
          </div>
        ) : null}
        {signalError ? <div className={styles.error}>{signalError}</div> : null}
      </div>
      <div className={styles.shellFooter}>
        {!completedSignal ? (
          <button type="button" className={styles.confusionButton} onClick={reportConfusion}>
            Need a simpler step
          </button>
        ) : null}
        {completedSignal ? <span className={styles.statusPill}>Ready to continue</span> : null}
      </div>
    </section>
  )
}
