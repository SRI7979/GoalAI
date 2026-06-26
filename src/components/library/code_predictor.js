'use client'

import { useState } from 'react'
import styles from './ComponentLibrary.module.css'
import { codePredictorParamsSchema, componentSignalSchema } from './schemas'

function CodePredictor({ params, emitSignal, markInteraction, completedSignal }) {
  const [selectedIndex, setSelectedIndex] = useState(null)

  const choose = (index) => {
    if (completedSignal) return
    markInteraction()
    setSelectedIndex(index)
    emitSignal({
      correct: index === params.correctIndex,
      confidence: index === params.correctIndex ? 0.88 : 0.38,
      attempts: 1,
      hintsUsed: 0,
      rawResponse: {
        selectedIndex: index,
        selectedOption: params.options[index],
        correctIndex: params.correctIndex,
        language: params.language,
        explanation: params.explanation,
      },
    })
  }

  return (
    <div className={styles.stack}>
      <pre className={styles.codeBlock}><code>{params.code}</code></pre>
      <p className={styles.paragraph}>{params.question}</p>
      <div className={styles.optionGrid}>
        {params.options.map((option, index) => {
          const isSelected = selectedIndex === index
          const isCorrect = index === params.correctIndex
          const stateClass = selectedIndex === null
            ? ''
            : (isCorrect ? styles.correct : (isSelected ? styles.wrong : ''))
          return (
            <button
              className={`${styles.option} ${stateClass}`}
              key={option}
              disabled={Boolean(completedSignal)}
              onClick={() => choose(index)}
            >
              {option}
            </button>
          )
        })}
      </div>
      {selectedIndex !== null ? <div className={styles.callout}>{params.explanation}</div> : null}
    </div>
  )
}

const codePredictorComponent = {
  type: 'code_predictor',
  paramsSchema: codePredictorParamsSchema,
  signalSchema: componentSignalSchema,
  generatorPrompt: 'codePredictor_v1',
  render: CodePredictor,
}

export default codePredictorComponent
