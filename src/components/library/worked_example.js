'use client'

import { useState } from 'react'
import styles from './ComponentLibrary.module.css'
import { componentSignalSchema, workedExampleParamsSchema } from './schemas'

function WorkedExample({ params, emitSignal, markInteraction, completedSignal }) {
  const [visibleSteps, setVisibleSteps] = useState(0)
  const allStepsVisible = visibleSteps >= params.steps.length

  const showNext = () => {
    markInteraction()
    setVisibleSteps((current) => Math.min(params.steps.length, current + 1))
  }

  const complete = (confidence) => {
    markInteraction()
    emitSignal({
      correct: null,
      confidence,
      attempts: 1,
      hintsUsed: 0,
      rawResponse: {
        stepsRevealed: visibleSteps,
        confidenceRating: confidence,
      },
    })
  }

  return (
    <div className={styles.stack}>
      <p className={styles.paragraph}>{params.problem}</p>
      <div className={styles.stack}>
        {params.steps.slice(0, visibleSteps).map((step, index) => (
          <div className={styles.step} key={`${index}-${step}`}>{step}</div>
        ))}
      </div>
      {!allStepsVisible ? (
        <button className={`${styles.button} ${styles.primaryButton}`} onClick={showNext}>Next step</button>
      ) : (
        <>
          <div className={styles.callout}>{params.answer}</div>
          <p className={styles.paragraph}>{params.whyItWorks}</p>
          <div className={styles.buttonRow}>
            <button className={styles.button} disabled={Boolean(completedSignal)} onClick={() => complete(0.45)}>Still fuzzy</button>
            <button className={`${styles.button} ${styles.primaryButton}`} disabled={Boolean(completedSignal)} onClick={() => complete(0.9)}>I can follow it</button>
          </div>
        </>
      )}
    </div>
  )
}

const workedExampleComponent = {
  type: 'worked_example',
  paramsSchema: workedExampleParamsSchema,
  signalSchema: componentSignalSchema,
  generatorPrompt: 'workedExample_v1',
  render: WorkedExample,
}

export default workedExampleComponent
