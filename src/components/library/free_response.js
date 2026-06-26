'use client'

import { useState } from 'react'
import { getSafeSupabaseSession } from '@/lib/supabase'
import styles from './ComponentLibrary.module.css'
import { componentSignalSchema, freeResponseParamsSchema } from './schemas'

function FreeResponse({ params, emitSignal, markInteraction, completedSignal, setLoading = () => {}, componentType, conceptIds }) {
  const [response, setResponse] = useState('')
  const [evaluation, setEvaluation] = useState(null)
  const [evaluating, setEvaluating] = useState(false)
  const [error, setError] = useState('')

  const submit = async () => {
    if (!response.trim() || evaluating || completedSignal) return
    markInteraction()
    setEvaluating(true)
    setLoading(true, 'evaluating...')
    setError('')
    try {
      const { session } = await getSafeSupabaseSession()
      const token = session?.access_token || null
      const res = await fetch('/api/components/evaluate-free-response', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          prompt: params.prompt,
          rubricCriteria: params.rubricCriteria,
          response,
          componentType,
          conceptIds,
          accessToken: token,
        }),
      })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload?.error || 'Evaluation failed.')
      setEvaluation(payload.evaluation)
      emitSignal({
        correct: payload.evaluation.correct,
        confidence: payload.evaluation.confidence,
        attempts: 1,
        hintsUsed: 0,
        rawResponse: {
          userText: response,
          aiFeedback: payload.evaluation.feedback,
          rubricCriteria: params.rubricCriteria,
        },
      })
    } catch (err) {
      setError(err?.message || 'Evaluation failed.')
    } finally {
      setEvaluating(false)
      setLoading(false)
    }
  }

  return (
    <div className={styles.stack}>
      <p className={styles.paragraph}>{params.prompt}</p>
      <div className={styles.stack}>
        {params.rubricCriteria.map((criterion) => (
          <div className={styles.step} key={criterion}>{criterion}</div>
        ))}
      </div>
      <textarea
        className={styles.textarea}
        value={response}
        disabled={Boolean(completedSignal) || evaluating}
        onChange={(event) => {
          markInteraction()
          setResponse(event.target.value)
        }}
        placeholder="Write 1-3 sentences..."
      />
      <div className={styles.buttonRow}>
        <button className={`${styles.button} ${styles.primaryButton}`} disabled={!response.trim() || evaluating || Boolean(completedSignal)} onClick={submit}>
          Submit
        </button>
      </div>
      {evaluation ? <div className={styles.callout}>{evaluation.feedback}</div> : null}
      {error ? <div className={styles.error}>{error}</div> : null}
    </div>
  )
}

const freeResponseComponent = {
  type: 'free_response',
  paramsSchema: freeResponseParamsSchema,
  signalSchema: componentSignalSchema,
  generatorPrompt: 'freeResponse_v1',
  render: FreeResponse,
}

export default freeResponseComponent
