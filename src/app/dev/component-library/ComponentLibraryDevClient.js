'use client'

import { useMemo, useState } from 'react'
import ComponentRenderer from '@/components/library/ComponentRenderer'
import { listRegisteredTypes } from '@/components/library/registry'
import styles from '@/components/library/ComponentLibrary.module.css'

const MOCK_PARAMS = {
  concept_explainer: {
    title: 'Variables store values',
    paragraphs: [
      'A variable is a name you give to a value so you can use that value later.',
      'In JavaScript, you can create variables with let or const. Use const when the value should not be reassigned, and let when it may change.',
      'Variables make programs readable because names like score or userName explain what the value means.',
    ],
    keyTakeaway: 'A variable is a named container for a value your program needs later.',
  },
  multiple_choice_quiz: {
    question: 'Which line creates a variable that can be reassigned later?',
    options: ['const score = 10', 'let score = 10', 'score: 10', 'make score 10'],
    correctIndex: 1,
    explanation: 'let creates a variable whose value can be reassigned later. const is for values that should stay fixed.',
  },
  flashcard_drill: {
    cards: [
      { front: 'What does let do?', back: 'It declares a variable that can be reassigned.' },
      { front: 'What does const do?', back: 'It declares a variable that should not be reassigned.' },
      { front: 'Why use clear variable names?', back: 'They make the meaning of values easier to understand.' },
    ],
  },
  worked_example: {
    problem: 'Predict the final value of score: let score = 2; score = score + 3;',
    steps: [
      'Start with score storing the value 2.',
      'Read score + 3 as the current value 2 plus 3.',
      'Store the result, 5, back into score.',
    ],
    answer: 'The final value of score is 5.',
    whyItWorks: 'Assignment updates the variable name so it points at the new computed value.',
  },
  free_response: {
    prompt: 'Explain in 1-3 sentences when you would use let instead of const.',
    rubricCriteria: [
      'Mentions reassignment or changing value',
      'Contrasts let with const',
      'Uses a concrete example or clear scenario',
    ],
  },
  code_predictor: {
    code: 'let count = 1;\ncount = count + 2;\nconsole.log(count);',
    language: 'javascript',
    question: 'What does this code print?',
    options: ['1', '2', '3', 'count'],
    correctIndex: 2,
    explanation: 'count starts at 1, then count + 2 becomes 3, so console.log prints 3.',
  },
  dynamic_diagram: {
    tier: 'structured',
    diagramType: 'flowchart',
    title: 'How an HTTP request works',
    fallbackText: 'A browser asks a server for a resource, the server processes the request, and it returns a response the browser can render.',
    data: {
      caption: 'A simple request-response path.',
      nodes: [
        { id: 'browser', label: 'Browser', description: 'Sends request' },
        { id: 'server', label: 'Server', description: 'Receives and processes it' },
        { id: 'response', label: 'Response', description: 'HTML, JSON, or files return' },
      ],
      edges: [
        { from: 'browser', to: 'server', label: 'HTTP request' },
        { from: 'server', to: 'response', label: 'HTTP response' },
      ],
    },
  },
  code_sandbox: {
    title: 'Edit a variable',
    instructions: 'Change the value, then make the program print the new value.',
    language: 'javascript',
    starterCode: 'let score = 1;\nscore = score + 2;\nconsole.log(score);',
    expectedBehavior: 'The console should show the updated value 3.',
    hints: ['Run the code in your head one line at a time.', 'The second line updates score.'],
  },
  code_debugger: {
    title: 'Fix the reassignment bug',
    task: 'This code tries to change a constant. Fix it so the final value can print.',
    language: 'javascript',
    buggyCode: 'const score = 1;\nscore = score + 2;\nconsole.log(score);',
    expectedFix: 'Use let instead of const when the variable needs to change.',
    hints: ['Find the variable that changes.', 'Check whether its declaration allows reassignment.'],
  },
  audio_listen: {
    title: 'Listen for the key detail',
    transcript: 'A variable is a name that stores a value so the program can use it later.',
    prompt: 'What does the transcript say a variable stores?',
    options: ['A value', 'A browser tab', 'A CSS color', 'A database table'],
    correctIndex: 0,
    explanation: 'The transcript says a variable stores a value.',
  },
  audio_speak: {
    title: 'Say the idea aloud',
    phrase: 'A variable is a name for a stored value.',
    pronunciationTips: ['Pause after variable.', 'Stress name and value.'],
    rubricCriteria: ['Clear enough to understand', 'Mentions both name and value'],
  },
  image_identify: {
    title: 'Identify the variable',
    imageDescription: 'A diagram shows a labeled box named score with the value 3 inside it.',
    question: 'Which part is the variable name?',
    options: ['score', '3', 'the border', 'the background'],
    correctIndex: 0,
    explanation: 'score is the name; 3 is the stored value.',
  },
  drag_match: {
    title: 'Match variable ideas',
    instructions: 'Match each prompt to the best meaning.',
    pairs: [
      { prompt: 'name', match: 'The label used in code' },
      { prompt: 'value', match: 'The data currently stored' },
      { prompt: 'assignment', match: 'The action that stores a value' },
    ],
  },
  order_steps: {
    title: 'Order a tiny program',
    instruction: 'Read these steps in the order JavaScript uses them.',
    steps: ['Create a variable name', 'Store a value', 'Read the value later', 'Print the value'],
  },
  timed_problem_set: {
    title: 'Variable speed check',
    timeLimitSeconds: 180,
    problems: [
      { question: 'let x = 2; x = x + 1; What is x?', answer: '3', explanation: 'x starts at 2 and increases by 1.' },
      { question: 'const name = "Ari"; What is the variable name?', answer: 'name', explanation: 'name is the label in the code.' },
    ],
  },
  roleplay_scenario: {
    title: 'Explain variables to a friend',
    scenario: 'A friend thinks variables are only math letters.',
    learnerRole: 'Helpful beginner programmer',
    botRole: 'Curious friend',
    openingLine: 'Why do programmers use variables?',
    successCriteria: ['Explains variables as names for values', 'Uses one code example'],
  },
  case_study_analyze: {
    title: 'A confusing score update',
    caseText: 'Mina writes let score = 5; score = score + 1; and wonders why score is now 6.',
    questions: ['What value did score start with?', 'Which line changed score?', 'Why is the final value 6?'],
    keyTakeaway: 'A variable can be read, changed, and read again later.',
  },
  reflection_prompt: {
    title: 'Reflect on variable names',
    prompt: 'Where would clear variable names help you in a program you want to build?',
    sentenceStarters: ['A name I would use is...', 'A confusing name would be...'],
  },
  do_in_real_world: {
    title: 'Spot a variable outside code',
    task: 'Find one real-world label/value pair, like a name tag or scoreboard.',
    steps: ['Choose one example', 'Identify the label', 'Identify the value', 'Write one sentence connecting it to variables'],
    evidencePrompt: 'What label/value pair did you find?',
    safetyNote: 'Use a harmless public example; do not collect private information.',
  },
  mock_exam: {
    title: 'Variables mini exam',
    timeLimitMinutes: 5,
    questions: [
      {
        question: 'Which keyword allows reassignment?',
        options: ['let', 'const', 'readonly', 'fixed'],
        correctIndex: 0,
        explanation: 'let creates a variable that can be reassigned.',
      },
      {
        question: 'What does console.log(score) read?',
        options: ['The current value of score', 'The word score only', 'Nothing', 'A CSS rule'],
        correctIndex: 0,
        explanation: 'console.log(score) reads the current stored value.',
      },
    ],
  },
  concept_map_build: {
    title: 'Map variables',
    centralConcept: 'Variables',
    concepts: ['name', 'value', 'assignment', 'reassignment'],
    relationshipPrompts: ['Connect assignment to storing a value.', 'Connect reassignment to changing the stored value.'],
  },
}

function buildInstances(paramsByType) {
  return listRegisteredTypes().map((componentType, position) => ({
    componentType,
    position,
    params: paramsByType[componentType],
    conceptIds: ['javascript_variables'],
  }))
}

function SvgPreview({ result }) {
  if (!result?.svg) return null
  return (
    <div
      style={{
        border: '1px solid rgba(255,255,255,0.14)',
        borderRadius: 14,
        padding: 12,
        background: '#050a12',
        overflowX: 'auto',
      }}
      dangerouslySetInnerHTML={{ __html: result.svg }}
    />
  )
}

function ValidationReport({ report }) {
  if (!report?.checks?.length) return null
  return (
    <div className={styles.signalLog} style={{ marginTop: 0 }}>
      <div className={styles.eyebrow}>SVG validation</div>
      {report.checks.map((check) => (
        <div key={check.name} className={styles.devSubtitle} style={{ marginTop: 6, fontSize: '0.92rem' }}>
          <strong>{check.passed ? 'PASS' : 'FAIL'}</strong> {check.name}: {check.detail}
        </div>
      ))}
    </div>
  )
}

export default function ComponentLibraryDevClient() {
  const [paramsByType, setParamsByType] = useState(MOCK_PARAMS)
  const [signals, setSignals] = useState([])
  const [loadingType, setLoadingType] = useState('')
  const [errors, setErrors] = useState({})
  const [diagramConcept, setDiagramConcept] = useState('Arduino circuit with a resistor and an LED')
  const [diagramMeta, setDiagramMeta] = useState(null)
  const [fullSvgConcept, setFullSvgConcept] = useState('Arduino circuit with a resistor and an LED')
  const [fullSvgResult, setFullSvgResult] = useState(null)
  const [fullSvgError, setFullSvgError] = useState('')
  const [fullSvgLoading, setFullSvgLoading] = useState(false)
  const [showRawSvg, setShowRawSvg] = useState(false)
  const instances = useMemo(() => buildInstances(paramsByType), [paramsByType])

  const regenerate = async (componentType) => {
    setLoadingType(componentType)
    setErrors((current) => ({ ...current, [componentType]: '' }))
    try {
      if (componentType === 'dynamic_diagram') {
        const response = await fetch('/api/dynamic-diagram/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            concept: diagramConcept || 'how an HTTP request works',
            contextSnippet: 'PathAI dev dogfood surface for testing diagram tier routing and rendering.',
          }),
        })
        const payload = await response.json()
        if (!response.ok) throw new Error(payload?.error || 'Diagram generation failed.')
        setDiagramMeta(payload)
        setParamsByType((current) => ({ ...current, dynamic_diagram: payload.params }))
        return
      }

      const response = await fetch('/api/dev/component-library/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          componentType,
          concept: 'JavaScript variables',
          goalText: 'Learn JavaScript from scratch',
        }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload?.error || 'Regeneration failed.')
      setParamsByType((current) => ({ ...current, [componentType]: payload.params }))
    } catch (error) {
      setErrors((current) => ({ ...current, [componentType]: error?.message || 'Regeneration failed.' }))
    } finally {
      setLoadingType('')
    }
  }

  const runFullSvg = async () => {
    setFullSvgLoading(true)
    setFullSvgError('')
    try {
      const response = await fetch('/api/dynamic-diagram/full-svg', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          concept: fullSvgConcept || 'Arduino circuit with a resistor and an LED',
        }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload?.error || 'Standard SVG generation failed.')
      setFullSvgResult(payload)
      setShowRawSvg(false)
    } catch (error) {
      setFullSvgError(error?.message || 'Standard SVG generation failed.')
    } finally {
      setFullSvgLoading(false)
    }
  }

  return (
    <main className={styles.devPage}>
      <header className={styles.devHeader}>
        <div className={styles.eyebrow}>Prompt 4 + 6 dogfood surface</div>
        <h1 className={styles.devTitle}>Component Library</h1>
        <p className={styles.devSubtitle}>
          Registered teaching components rendered in isolation with mock params.
          Regenerate calls the schema-locked AI prompt or diagram generator for the selected component.
        </p>
        <div className={styles.diagramTester}>
          <label className={styles.eyebrow} htmlFor="dynamic-diagram-concept">Visual learning component</label>
          <div className={styles.buttonRow}>
            <input
              id="dynamic-diagram-concept"
              className={styles.textInput}
              value={diagramConcept}
              onChange={(event) => setDiagramConcept(event.target.value)}
              placeholder="Type any concept: number line, Arduino LED circuit, mitosis stages..."
            />
            <button
              className={`${styles.button} ${styles.primaryButton}`}
              onClick={() => regenerate('dynamic_diagram')}
              disabled={loadingType === 'dynamic_diagram'}
            >
              {loadingType === 'dynamic_diagram' ? 'Generating visual...' : 'Generate visual'}
            </button>
          </div>
          <p className={styles.devSubtitle}>Type any learning concept. Every request goes through dynamic SVG generation, then validation checks that the output is grounded in your exact input.</p>
          {diagramMeta ? (
            <p className={styles.devSubtitle}>
              Last visual: <strong>{diagramMeta.params?.visualKind || diagramMeta.params?.tier}</strong>
              {diagramMeta.tierChoiceReason ? ` - ${diagramMeta.tierChoiceReason}` : ''}
            </p>
          ) : null}
        </div>
      </header>

      <section className={styles.devGrid}>
        {instances.map((instance) => (
          <div className={styles.devCard} key={instance.componentType}>
            <div className={styles.buttonRow}>
              <button
                className={`${styles.button} ${styles.primaryButton}`}
                onClick={() => regenerate(instance.componentType)}
                disabled={loadingType === instance.componentType}
              >
                {loadingType === instance.componentType ? 'Regenerating...' : 'Regenerate'}
              </button>
              {errors[instance.componentType] ? <span className={styles.error}>{errors[instance.componentType]}</span> : null}
            </div>
            <ComponentRenderer
              componentInstance={instance}
              missionId={null}
              onSignal={(signal) => {
                setSignals((current) => [{ ...signal, capturedAt: new Date().toISOString() }, ...current].slice(0, 12))
              }}
            />
          </div>
        ))}
      </section>

      <section className={styles.devHeader}>
        <div className={styles.eyebrow}>Raw SVG Inspector</div>
        <h2 className={styles.devTitle}>Standard SVG Output</h2>
        <p className={styles.devSubtitle}>
          Same generator as the component above, shown raw so you can inspect the sanitized SVG and validation report. It does not save diagrams; it only emits telemetry.
        </p>
        <div className={styles.diagramTester}>
          <label className={styles.eyebrow} htmlFor="full-ai-svg-concept">Concept</label>
          <div className={styles.buttonRow}>
            <input
              id="full-ai-svg-concept"
              className={styles.textInput}
              value={fullSvgConcept}
              onChange={(event) => setFullSvgConcept(event.target.value)}
              placeholder="Type any concept: supply and demand curve, photosynthesis, number line..."
            />
            <button
              className={`${styles.button} ${styles.primaryButton}`}
              onClick={runFullSvg}
              disabled={fullSvgLoading}
            >
              {fullSvgLoading ? 'Generating...' : fullSvgResult ? 'Regenerate' : 'Generate'}
            </button>
          </div>
          <p className={styles.devSubtitle}>No preset menu here: this path is meant to exercise arbitrary typed input and generate a fresh SVG every time.</p>
          {fullSvgError ? <div className={styles.error}>{fullSvgError}</div> : null}
        </div>

        <div className={styles.devGrid}>
          <div className={styles.devCard}>
            <div className={styles.eyebrow}>Generated SVG</div>
            {fullSvgResult ? (
              <>
                <h3 className={styles.shellTitle}>{fullSvgResult.title}</h3>
                <p className={styles.devSubtitle}>
                  {fullSvgResult.sizeKb} KB · {fullSvgResult.ms} ms · {fullSvgResult.modelUsed}
                  {fullSvgResult.templatePath ? ` · ${fullSvgResult.templatePath}:${fullSvgResult.templateKind || 'freeform'}` : ''}
                </p>
                <SvgPreview result={fullSvgResult} />
                <ValidationReport report={fullSvgResult.validationReport} />
                <div className={styles.buttonRow}>
                  <button className={styles.button} onClick={() => setShowRawSvg((value) => !value)}>
                    {showRawSvg ? 'Hide Raw SVG' : 'View Raw SVG'}
                  </button>
                </div>
                {showRawSvg ? <pre className={styles.codeBlock}>{fullSvgResult.svg}</pre> : null}
              </>
            ) : (
              <p className={styles.devSubtitle}>Generate a concept to see the standard diagram output.</p>
            )}
          </div>
        </div>
      </section>

      <section className={styles.signalLog}>
        <div className={styles.eyebrow}>Signal log</div>
        <pre>{JSON.stringify(signals, null, 2)}</pre>
      </section>
    </main>
  )
}
