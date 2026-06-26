'use client'

import { useState } from 'react'
import styles from './ComponentLibrary.module.css'
import { componentSignalSchema, multipleChoiceQuizParamsSchema } from './schemas'

function MultipleChoiceQuiz({ params, emitSignal, markInteraction, completedSignal }) {
  const [selectedIndex, setSelectedIndex] = useState(null)

  const choose = (index) => {
    if (completedSignal) return
    markInteraction()
    setSelectedIndex(index)
    emitSignal({
      correct: index === params.correctIndex,
      confidence: index === params.correctIndex ? 0.9 : 0.35,
      attempts: 1,
      hintsUsed: 0,
      rawResponse: {
        selectedIndex: index,
        selectedOption: params.options[index],
        correctIndex: params.correctIndex,
        explanation: params.explanation,
      },
    })
  }

  return (
    <div className={styles.stack}>
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

const multipleChoiceQuizComponent = {
  type: 'multiple_choice_quiz',
  paramsSchema: multipleChoiceQuizParamsSchema,
  signalSchema: componentSignalSchema,
  generatorPrompt: 'multipleChoiceQuiz_v1',
  render: MultipleChoiceQuiz,
}

export default multipleChoiceQuizComponent
