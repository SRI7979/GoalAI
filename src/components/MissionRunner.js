'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ComponentRenderer from '@/components/library/ComponentRenderer'
import { EVENTS, flushAnalytics, track } from '@/lib/analytics'
import { getSafeSupabaseSession } from '@/lib/supabase'
import styles from './MissionRunner.module.css'

const STEP_LABELS = Object.freeze({
  concept_explainer: 'Learn',
  worked_example: 'Watch',
  dynamic_diagram: 'Visualize',
  multiple_choice_quiz: 'Check',
  free_response: 'Explain',
  flashcard_drill: 'Recall',
  code_predictor: 'Predict',
  code_sandbox: 'Build',
  code_debugger: 'Debug',
  audio_listen: 'Listen',
  audio_speak: 'Speak',
  image_identify: 'Notice',
  drag_match: 'Match',
  order_steps: 'Sequence',
  timed_problem_set: 'Practice',
  roleplay_scenario: 'Roleplay',
  case_study_analyze: 'Analyze',
  reflection_prompt: 'Reflect',
  do_in_real_world: 'Apply',
  mock_exam: 'Prove',
  concept_map_build: 'Map',
})

function getMissionTitle(mission) {
  const concepts = mission?.conceptsTargeted || mission?.concepts_targeted || []
  if (!concepts.length) return 'Today\'s mission'
  return concepts
    .slice(0, 2)
    .map((id) => String(id).replace(/_/g, ' '))
    .join(' + ')
}

function getStepLabel(componentType) {
  return STEP_LABELS[componentType] || 'Practice'
}

function getStatusText({ completionData, savingSignal, adaptiveNote, activeSignal, activeIndex, componentsLength }) {
  if (completionData) return `Mission complete. +${completionData.xpEarned || 0} XP`
  if (savingSignal) return 'Saving your progress...'
  if (adaptiveNote) return adaptiveNote
  if (activeSignal && activeIndex < componentsLength - 1) return 'Nice. Continue when you are ready.'
  if (activeSignal) return 'Last step complete. Finishing your mission...'
  return 'Complete this step to continue.'
}

function getMissionComponents(mission) {
  return Array.isArray(mission?.components) ? mission.components : []
}

function getMissionConcepts(mission) {
  return mission?.conceptsTargeted || mission?.concepts_targeted || []
}

async function getAccessToken() {
  const { session } = await getSafeSupabaseSession()
  return session?.access_token || null
}

export default function MissionRunner({ mission, onCompleted, onExit }) {
  const [runtimeMission, setRuntimeMission] = useState(mission)
  const currentMission = runtimeMission || mission
  const components = useMemo(() => getMissionComponents(currentMission), [currentMission])
  const missionConcepts = useMemo(() => getMissionConcepts(currentMission), [currentMission])
  const [activeIndex, setActiveIndex] = useState(0)
  const [signals, setSignals] = useState([])
  const [savingSignal, setSavingSignal] = useState(false)
  const [completionData, setCompletionData] = useState(null)
  const [error, setError] = useState('')
  const [adaptiveNote, setAdaptiveNote] = useState('')
  const missionStartedRef = useRef(false)
  const missionCompletedRef = useRef(false)
  const mountedAtRef = useRef(null)

  const activeComponent = components[activeIndex] || null
  const activeSignal = signals[activeIndex] || activeComponent?.signal || null
  const progressRatio = components.length > 0
    ? Math.min(1, (signals.filter(Boolean).length + (activeSignal ? 0 : 0)) / components.length)
    : 0

  useEffect(() => {
    setRuntimeMission(mission)
    setActiveIndex(0)
    setSignals(getMissionComponents(mission).map((component) => component.signal || null))
    setCompletionData(null)
    setError('')
    setAdaptiveNote('')
    missionCompletedRef.current = false
    missionStartedRef.current = false
    mountedAtRef.current = Date.now()
  }, [mission])

  useEffect(() => {
    if (!mission?.id || missionStartedRef.current) return
    missionStartedRef.current = true
    track(EVENTS.MISSION_STARTED, {
      mission_id: mission.id,
      day_number: mission.dayNumber || mission.day_number,
    }, {
      userId: mission.user_id,
      goalId: mission.goal_id,
      missionId: mission.id,
    })
    flushAnalytics().catch(() => {})
  }, [mission])

  const completeMission = useCallback(async (nextSignals) => {
    if (!currentMission?.id || missionCompletedRef.current) return
    missionCompletedRef.current = true
    setSavingSignal(true)
    setError('')
    try {
      const token = await getAccessToken()
      const closedSignals = nextSignals.filter(Boolean)
      const totalCount = closedSignals.filter((signal) => signal.correct !== null).length
      const correctCount = closedSignals.filter((signal) => signal.correct === true).length
      const totalMs = Math.max(
        Date.now() - (mountedAtRef.current || Date.now()),
        closedSignals.reduce((sum, signal) => sum + (Number(signal.totalMs) || 0), 0),
      )
      const response = await fetch('/api/missions/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          missionId: currentMission.id,
          accessToken: token,
          totalMs,
          correctCount,
          totalCount,
          componentsSkipped: Math.max(0, components.length - closedSignals.length),
        }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload?.error || 'Could not complete mission.')
      setCompletionData(payload)
      if (payload?.mission) setRuntimeMission(payload.mission)
      onCompleted?.(payload)
    } catch (err) {
      missionCompletedRef.current = false
      setError(err?.message || 'Could not complete mission.')
    } finally {
      setSavingSignal(false)
    }
  }, [components.length, currentMission, onCompleted])

  const handleSignal = useCallback(async (signal) => {
    if (!currentMission?.id || !activeComponent || savingSignal) return
    setSavingSignal(true)
    setError('')
    try {
      const token = await getAccessToken()
      const response = await fetch('/api/missions/signal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          missionId: currentMission.id,
          componentIndex: activeIndex,
          signal,
          accessToken: token,
        }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload?.error || 'Could not save component signal.')

      const nextMission = payload?.mission || currentMission
      const nextComponents = getMissionComponents(nextMission)
      const nextSignals = nextComponents.map((component) => component.signal || null)
      nextSignals[activeIndex] = nextSignals[activeIndex] || signal
      setRuntimeMission(nextMission)
      setSignals(nextSignals)
      if (payload?.adaptiveDecision?.action === 'insert_component') {
        setAdaptiveNote('Added a quick reset step based on that signal.')
      }
      if (activeIndex >= nextComponents.length - 1) {
        await completeMission(nextSignals)
      }
    } catch (err) {
      setError(err?.message || 'Could not save progress.')
    } finally {
      setSavingSignal(false)
    }
  }, [activeComponent, activeIndex, completeMission, currentMission, savingSignal])

  const goNext = useCallback(() => {
    if (!activeSignal || activeIndex >= components.length - 1) return
    setAdaptiveNote('')
    setActiveIndex((index) => Math.min(components.length - 1, index + 1))
  }, [activeIndex, activeSignal, components.length])

  if (!mission || components.length === 0) {
    return (
      <div className={styles.runner}>
        <div className={styles.error}>This mission is still being assembled. Try again in a moment.</div>
      </div>
    )
  }

  const stepLabel = getStepLabel(activeComponent?.componentType)
  const statusText = getStatusText({
    completionData,
    savingSignal,
    adaptiveNote,
    activeSignal,
    activeIndex,
    componentsLength: components.length,
  })

  return (
    <div className={styles.runner} data-pathai-mission-runner="true">
      <div className={styles.panel}>
        <div className={styles.topBar}>
          <div className={styles.topMeta}>
            <div>
              <p className={styles.eyebrow}>Today&apos;s lesson</p>
              <h2 className={styles.title}>{getMissionTitle(currentMission)}</h2>
            </div>
            <div className={styles.stepBadge}>
              {Math.min(activeIndex + 1, components.length)} / {components.length}
            </div>
          </div>
          <div className={styles.progressTrack}>
            <div className={styles.progressFill} style={{ width: `${Math.round(progressRatio * 100)}%` }} />
          </div>
          <div className={styles.stageLine}>
            <span>{stepLabel}</span>
            <span className={styles.stagePill}>{currentMission.estimatedMinutes || 15} min mission</span>
          </div>
        </div>

        <div className={styles.body}>
          <ComponentRenderer
            key={`${currentMission.id}:${activeIndex}:${activeComponent.componentType}`}
            componentInstance={activeComponent}
            missionId={currentMission.id}
            conceptIds={activeComponent.conceptIds || missionConcepts}
            onSignal={handleSignal}
          />
        </div>

        {error ? <div className={styles.error}>{error}</div> : null}

        <div className={styles.footer}>
          <div className={styles.status}>{statusText}</div>
          {completionData ? (
            <button className={styles.primaryButton} onClick={() => onExit?.()}>
              Done
            </button>
          ) : activeIndex < components.length - 1 ? (
            <button
              className={activeSignal ? styles.primaryButton : styles.secondaryButton}
              disabled={!activeSignal || savingSignal}
              onClick={goNext}
            >
              Continue
            </button>
          ) : (
            <button className={activeSignal ? styles.primaryButton : styles.secondaryButton} disabled={!activeSignal || savingSignal}>
              {savingSignal ? 'Finishing...' : 'Finish mission'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
