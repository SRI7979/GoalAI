'use client'

import { useMemo, useState } from 'react'
import styles from './ComponentLibrary.module.css'

function completeWithConfidence({ confidence, emitSignal, markInteraction, rawResponse = {}, correct = null, attempts = 1 }) {
  markInteraction()
  emitSignal({
    correct,
    confidence,
    attempts,
    hintsUsed: 0,
    rawResponse,
  })
}

function ConfidenceButtons({ onComplete, disabled }) {
  return (
    <div className={styles.buttonRow}>
      <button className={styles.button} disabled={disabled} onClick={() => onComplete(0.35)}>Still shaky</button>
      <button className={styles.button} disabled={disabled} onClick={() => onComplete(0.68)}>Mostly there</button>
      <button className={`${styles.button} ${styles.primaryButton}`} disabled={disabled} onClick={() => onComplete(0.92)}>I can do this</button>
    </div>
  )
}

function OpenTextTask({ params, emitSignal, markInteraction, completedSignal, prompt, criteria = [], rawKind }) {
  const [text, setText] = useState('')

  const complete = (confidence) => completeWithConfidence({
    confidence,
    emitSignal,
    markInteraction,
    rawResponse: { kind: rawKind, response: text, criteria },
  })

  return (
    <div className={styles.stack}>
      <p className={styles.paragraph}>{prompt}</p>
      {criteria.length ? (
        <div className={styles.stack}>
          {criteria.map((item) => <div className={styles.step} key={item}>{item}</div>)}
        </div>
      ) : null}
      <textarea
        className={styles.textarea}
        value={text}
        disabled={Boolean(completedSignal)}
        onChange={(event) => {
          markInteraction()
          setText(event.target.value)
        }}
        placeholder="Write your response..."
      />
      <ConfidenceButtons disabled={!text.trim() || Boolean(completedSignal)} onComplete={complete} />
      {params.keyTakeaway ? <div className={styles.callout}>{params.keyTakeaway}</div> : null}
    </div>
  )
}

function ChoiceTask({ params, emitSignal, markInteraction, completedSignal, question, options, correctIndex, explanation }) {
  const [selected, setSelected] = useState(null)
  const [attempts, setAttempts] = useState(0)
  const answered = selected != null

  const choose = (index) => {
    if (completedSignal || answered) return
    markInteraction()
    const correct = index === correctIndex
    const nextAttempts = attempts + 1
    setSelected(index)
    setAttempts(nextAttempts)
    emitSignal({
      correct,
      confidence: correct ? 0.9 : 0.45,
      attempts: nextAttempts,
      hintsUsed: 0,
      rawResponse: { selectedIndex: index, correctIndex, explanation, params },
    })
  }

  return (
    <div className={styles.stack}>
      <p className={styles.paragraph}>{question}</p>
      <div className={styles.optionGrid}>
        {options.map((option, index) => {
          const state = answered && index === correctIndex ? styles.correct : answered && selected === index ? styles.wrong : ''
          return (
            <button key={`${option}-${index}`} className={`${styles.option} ${state}`} disabled={Boolean(completedSignal) || answered} onClick={() => choose(index)}>
              {option}
            </button>
          )
        })}
      </div>
      {answered ? <div className={styles.callout}>{explanation}</div> : null}
    </div>
  )
}

export function CodeSandbox({ params, emitSignal, markInteraction, completedSignal }) {
  const [code, setCode] = useState(params.starterCode || '')
  return (
    <div className={styles.stack}>
      <p className={styles.paragraph}>{params.instructions}</p>
      <pre className={styles.codeBlock}>{params.language}</pre>
      <textarea
        className={styles.textarea}
        value={code}
        disabled={Boolean(completedSignal)}
        onChange={(event) => {
          markInteraction()
          setCode(event.target.value)
        }}
      />
      <div className={styles.callout}>{params.expectedBehavior}</div>
      <ConfidenceButtons
        disabled={Boolean(completedSignal)}
        onComplete={(confidence) => completeWithConfidence({
          confidence,
          emitSignal,
          markInteraction,
          rawResponse: { code, expectedBehavior: params.expectedBehavior, hints: params.hints || [] },
        })}
      />
    </div>
  )
}

export function CodeDebugger({ params, emitSignal, markInteraction, completedSignal }) {
  const [fixedCode, setFixedCode] = useState(params.buggyCode || '')
  return (
    <div className={styles.stack}>
      <p className={styles.paragraph}>{params.task}</p>
      <pre className={styles.codeBlock}>{params.buggyCode}</pre>
      <textarea
        className={styles.textarea}
        value={fixedCode}
        disabled={Boolean(completedSignal)}
        onChange={(event) => {
          markInteraction()
          setFixedCode(event.target.value)
        }}
      />
      <div className={styles.callout}>{params.expectedFix}</div>
      <ConfidenceButtons
        disabled={Boolean(completedSignal)}
        onComplete={(confidence) => completeWithConfidence({
          confidence,
          emitSignal,
          markInteraction,
          rawResponse: { fixedCode, expectedFix: params.expectedFix, hints: params.hints || [] },
        })}
      />
    </div>
  )
}

export function AudioListen(props) {
  const { params } = props
  return (
    <ChoiceTask
      {...props}
      question={`${params.prompt}\n\nTranscript: ${params.transcript}`}
      options={params.options}
      correctIndex={params.correctIndex}
      explanation={params.explanation}
    />
  )
}

export function AudioSpeak(props) {
  const { params } = props
  return (
    <OpenTextTask
      {...props}
      prompt={`Say or rehearse: ${params.phrase}`}
      criteria={params.pronunciationTips || params.rubricCriteria || []}
      rawKind="audio_speak_self_rating"
    />
  )
}

export function ImageIdentify(props) {
  const { params } = props
  return (
    <div className={styles.stack}>
      <div className={styles.callout}>{params.imageDescription}</div>
      <ChoiceTask
        {...props}
        question={params.question}
        options={params.options}
        correctIndex={params.correctIndex}
        explanation={params.explanation}
      />
    </div>
  )
}

export function DragMatch({ params, emitSignal, markInteraction, completedSignal }) {
  const options = useMemo(() => params.pairs.map((pair) => pair.match), [params.pairs])
  const [answers, setAnswers] = useState({})
  const complete = () => {
    markInteraction()
    const correctCount = params.pairs.filter((pair, index) => answers[index] === pair.match).length
    emitSignal({
      correct: correctCount === params.pairs.length,
      confidence: correctCount / params.pairs.length,
      attempts: 1,
      hintsUsed: 0,
      rawResponse: { answers, pairs: params.pairs, correctCount },
    })
  }

  return (
    <div className={styles.stack}>
      <p className={styles.paragraph}>{params.instructions}</p>
      {params.pairs.map((pair, index) => (
        <label className={styles.step} key={pair.prompt}>
          <strong>{pair.prompt}</strong>
          <select
            className={styles.textInput}
            value={answers[index] || ''}
            disabled={Boolean(completedSignal)}
            onChange={(event) => {
              markInteraction()
              setAnswers((current) => ({ ...current, [index]: event.target.value }))
            }}
          >
            <option value="">Choose match...</option>
            {options.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </label>
      ))}
      <button className={`${styles.button} ${styles.primaryButton}`} disabled={Object.keys(answers).length < params.pairs.length || Boolean(completedSignal)} onClick={complete}>
        Check matches
      </button>
    </div>
  )
}

export function OrderSteps({ params, emitSignal, markInteraction, completedSignal }) {
  return (
    <div className={styles.stack}>
      <p className={styles.paragraph}>{params.instruction}</p>
      {params.steps.map((step, index) => (
        <div className={styles.step} key={step}>
          <strong>{index + 1}. </strong>{step}
        </div>
      ))}
      <ConfidenceButtons
        disabled={Boolean(completedSignal)}
        onComplete={(confidence) => completeWithConfidence({
          confidence,
          emitSignal,
          markInteraction,
          rawResponse: { orderedSteps: params.steps },
        })}
      />
    </div>
  )
}

export function TimedProblemSet({ params, emitSignal, markInteraction, completedSignal }) {
  const [answers, setAnswers] = useState({})
  const complete = () => {
    markInteraction()
    const correctCount = params.problems.filter((problem, index) => (
      String(answers[index] || '').trim().toLowerCase() === String(problem.answer || '').trim().toLowerCase()
    )).length
    emitSignal({
      correct: correctCount === params.problems.length,
      confidence: correctCount / params.problems.length,
      attempts: 1,
      hintsUsed: 0,
      rawResponse: { answers, correctCount, total: params.problems.length },
    })
  }

  return (
    <div className={styles.stack}>
      <div className={styles.callout}>Target time: {params.timeLimitSeconds} seconds</div>
      {params.problems.map((problem, index) => (
        <label className={styles.step} key={problem.question}>
          <strong>{problem.question}</strong>
          <input
            className={styles.textInput}
            value={answers[index] || ''}
            disabled={Boolean(completedSignal)}
            onChange={(event) => {
              markInteraction()
              setAnswers((current) => ({ ...current, [index]: event.target.value }))
            }}
            placeholder="Your answer"
          />
        </label>
      ))}
      <button className={`${styles.button} ${styles.primaryButton}`} disabled={Object.keys(answers).length < params.problems.length || Boolean(completedSignal)} onClick={complete}>
        Check set
      </button>
    </div>
  )
}

export function RoleplayScenario(props) {
  const { params } = props
  return (
    <OpenTextTask
      {...props}
      prompt={`${params.scenario}\n\n${params.botRole}: "${params.openingLine}"\nYour role: ${params.learnerRole}`}
      criteria={params.successCriteria}
      rawKind="roleplay_response"
    />
  )
}

export function CaseStudyAnalyze(props) {
  const { params } = props
  return (
    <OpenTextTask
      {...props}
      prompt={params.caseText}
      criteria={[...params.questions, params.keyTakeaway]}
      rawKind="case_study_analysis"
    />
  )
}

export function ReflectionPrompt(props) {
  const { params } = props
  return (
    <OpenTextTask
      {...props}
      prompt={params.prompt}
      criteria={params.sentenceStarters}
      rawKind="reflection"
    />
  )
}

export function DoInRealWorld({ params, emitSignal, markInteraction, completedSignal }) {
  return (
    <div className={styles.stack}>
      <p className={styles.paragraph}>{params.task}</p>
      {params.steps.map((step, index) => <div className={styles.step} key={step}>{index + 1}. {step}</div>)}
      {params.safetyNote ? <div className={styles.callout}>{params.safetyNote}</div> : null}
      <ConfidenceButtons
        disabled={Boolean(completedSignal)}
        onComplete={(confidence) => completeWithConfidence({
          confidence,
          emitSignal,
          markInteraction,
          rawResponse: { evidencePrompt: params.evidencePrompt, steps: params.steps },
        })}
      />
    </div>
  )
}

export function MockExam({ params, emitSignal, markInteraction, completedSignal }) {
  const [answers, setAnswers] = useState({})
  const complete = () => {
    markInteraction()
    const correctCount = params.questions.filter((question, index) => Number(answers[index]) === question.correctIndex).length
    emitSignal({
      correct: correctCount === params.questions.length,
      confidence: correctCount / params.questions.length,
      attempts: 1,
      hintsUsed: 0,
      rawResponse: { answers, correctCount, total: params.questions.length },
    })
  }

  return (
    <div className={styles.stack}>
      <div className={styles.callout}>Mock exam block · {params.timeLimitMinutes} minutes</div>
      {params.questions.map((question, questionIndex) => (
        <div className={styles.step} key={question.question}>
          <strong>{question.question}</strong>
          <div className={styles.optionGrid}>
            {question.options.map((option, optionIndex) => (
              <button
                key={option}
                className={`${styles.option} ${Number(answers[questionIndex]) === optionIndex ? styles.correct : ''}`}
                disabled={Boolean(completedSignal)}
                onClick={() => {
                  markInteraction()
                  setAnswers((current) => ({ ...current, [questionIndex]: optionIndex }))
                }}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      ))}
      <button className={`${styles.button} ${styles.primaryButton}`} disabled={Object.keys(answers).length < params.questions.length || Boolean(completedSignal)} onClick={complete}>
        Submit mock exam
      </button>
    </div>
  )
}

export function ConceptMapBuild(props) {
  const { params } = props
  return (
    <OpenTextTask
      {...props}
      prompt={`Build a concept map around "${params.centralConcept}". Include these concepts: ${params.concepts.join(', ')}.`}
      criteria={params.relationshipPrompts}
      rawKind="concept_map"
    />
  )
}
