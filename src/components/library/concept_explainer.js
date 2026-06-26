'use client'

import styles from './ComponentLibrary.module.css'
import { conceptExplainerParamsSchema, componentSignalSchema } from './schemas'

function ConceptExplainer({ params, emitSignal, markInteraction, completedSignal }) {
  const complete = (confidence) => {
    markInteraction()
    emitSignal({
      correct: null,
      confidence,
      attempts: 1,
      hintsUsed: 0,
      rawResponse: { confidenceRating: confidence },
    })
  }

  return (
    <div className={styles.stack}>
      {params.paragraphs.map((paragraph, index) => (
        <p className={styles.paragraph} key={index}>{paragraph}</p>
      ))}
      {params.keyTakeaway ? (
        <div className={styles.callout}>{params.keyTakeaway}</div>
      ) : null}
      <div className={styles.buttonRow}>
        <button className={styles.button} disabled={Boolean(completedSignal)} onClick={() => complete(0.35)}>Low</button>
        <button className={styles.button} disabled={Boolean(completedSignal)} onClick={() => complete(0.68)}>Medium</button>
        <button className={`${styles.button} ${styles.primaryButton}`} disabled={Boolean(completedSignal)} onClick={() => complete(0.95)}>Got it</button>
      </div>
    </div>
  )
}

const conceptExplainerComponent = {
  type: 'concept_explainer',
  paramsSchema: conceptExplainerParamsSchema,
  signalSchema: componentSignalSchema,
  generatorPrompt: 'conceptExplainer_v1',
  render: ConceptExplainer,
}

export default conceptExplainerComponent
