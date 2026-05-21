'use client'
import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import AIAssistant from './AIAssistant'
import ConfidenceSelector from './ConfidenceSelector'
import DailyConceptCard, { DailyProofRecapCard } from './DailyConceptCard'
import IconGlyph from '@/components/IconGlyph'
import InteractiveQuestion from '@/components/InteractiveQuestion'
import {
  CODE_LANGUAGES,
  buildStarterForLanguage,
  detectCodeLanguageFromText,
  getLanguageMeta,
  normalizeCodeLanguage,
} from '@/lib/codeLanguages'

const font = "'Plus Jakarta Sans','DM Sans',system-ui,sans-serif"
const mono = "'SF Mono','JetBrains Mono','Fira Code','Cascadia Code',monospace"

const HINT_COLORS = [
  { bg: 'rgba(14,245,194,0.06)', border: 'rgba(14,245,194,0.20)', text: '#0ef5c2', label: 'Nudge' },
  { bg: 'rgba(0,212,255,0.06)', border: 'rgba(0,212,255,0.20)', text: '#00d4ff', label: 'Guide' },
  { bg: 'rgba(251,191,36,0.06)', border: 'rgba(251,191,36,0.20)', text: '#FBBF24', label: 'Solution' },
]

function inferPracticeLanguage({ practice, task, goal } = {}) {
  const goalLanguage = detectCodeLanguageFromText(goal, '')
  if (goalLanguage) return goalLanguage
  const explicit = normalizeCodeLanguage(practice?.starter_language || practice?.language, '')
  if (explicit) return explicit

  const text = [
    task?._concept,
    task?.title,
    task?.description,
    task?.action,
    practice?.title,
    practice?.scenario,
    practice?.task,
    practice?.starter,
  ].filter(Boolean).join(' ')

  return detectCodeLanguageFromText(text, 'javascript')
}

function isCodingPracticeTask({ practice, task, goal } = {}) {
  if (String(practice?.starter || '').trim()) return true
  const text = [
    goal,
    task?._concept,
    task?.title,
    task?.description,
    task?.action,
    practice?.title,
    practice?.scenario,
    practice?.task,
  ].filter(Boolean).join(' ').toLowerCase()
  if (detectCodeLanguageFromText(text, '')) return true

  return /\bsql\b|query|database|python|javascript|typescript|react|node|swift|html|css|code|coding|program|function|component|api|array|object/.test(text)
}

function buildPracticeStarterShell({ practice, task, goal, language }) {
  const existing = String(practice?.starter || '').trim()
  const existingLanguage = normalizeCodeLanguage(practice?.starter_language || practice?.language, '')
  if (existing && existingLanguage === normalizeCodeLanguage(language)) return existing

  const title = String(practice?.title || task?.title || 'Practice task').replace(/\*\//g, '')
  const objective = String(practice?.task || task?.action || task?.outcome || goal || 'Complete the practice task.').replace(/\*\//g, '')
  return buildStarterForLanguage(language, title, objective)
}

async function runPracticePreview(code, language) {
  const source = String(code || '')
  if (!source.trim()) {
    return { status: 'idle', title: 'Nothing to run yet', output: 'Add code to the editor first.' }
  }

  if (/\bTODO\b|your solution here|table_name|-- columns/i.test(source)) {
    return {
      status: 'warn',
      title: 'Starter shell detected',
      output: 'Replace the TODO placeholders with your own solution before running.',
    }
  }

  try {
    const res = await fetch('/api/run-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: source, language }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data?.error || 'Code run failed.')
    const output = data.stdout || data.stderr || (data.previewHtml ? 'HTML preview rendered below.' : '(no output)')
    return {
      status: data.passed ? 'pass' : data.missingRuntime ? 'warn' : 'fail',
      title: data.passed ? 'Ran successfully' : data.missingRuntime ? 'Runtime not installed' : 'Run failed',
      output,
      previewHtml: data.previewHtml || '',
    }
  } catch (error) {
    return {
      status: 'fail',
      title: 'Runtime error',
      output: error?.stack || error?.message || 'Execution failed.',
    }
  }
}

function PracticeCodeIde({
  practice,
  task,
  language,
  starterCode,
  code,
  setCode,
  setLanguage,
  runResult,
  running,
  onRun,
  onSubmit,
}) {
  const [activeTab, setActiveTab] = useState('output')
  const currentCode = code || ''
  const lineCount = Math.max(9, currentCode.split('\n').length)
  const languageMeta = getLanguageMeta(language)
  const resultColor = runResult?.status === 'pass'
    ? '#34D399'
    : runResult?.status === 'fail'
      ? '#FF453A'
      : runResult?.status === 'warn'
        ? '#FBBF24'
        : '#00d4ff'

  function handleRun(event) {
    event.stopPropagation()
    onRun()
    setActiveTab('output')
  }

  return (
    <div className="practice-code-ide">
      <aside className="practice-code-brief">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#00d4ff', fontSize: 11, fontWeight: 900, letterSpacing: '0.09em', textTransform: 'uppercase', marginBottom: 12 }}>
          <IconGlyph name="code" size={14} strokeWidth={2.4} color="#00d4ff" />
          Coding Practice
        </div>
        <h2 style={{ margin: '0 0 10px', color: '#f5f5f7', fontSize: 20, lineHeight: 1.2, fontWeight: 900 }}>
          {practice.title}
        </h2>
        <div style={{ color: '#c8d6e5', fontSize: 13, lineHeight: 1.65, marginBottom: 14 }}>
          {practice.task || task?.action || 'Complete the implementation in the editor.'}
        </div>
        <div style={{ padding: '12px 13px', borderRadius: 8, background: 'rgba(0,212,255,0.055)', border: '1px solid rgba(0,212,255,0.18)', color: '#d7f8ff', fontSize: 12, lineHeight: 1.6 }}>
          <div style={{ color: '#00d4ff', fontSize: 10, fontWeight: 900, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
            Scenario
          </div>
          {practice.scenario}
        </div>
      </aside>

      <section className="practice-code-editor">
        <div className="practice-code-toolbar">
          <div style={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
            <div style={{ display: 'flex', gap: 6, marginRight: 12 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff5f56' }} />
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ffbd2e' }} />
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#27c93f' }} />
            </div>
            <span style={{ color: '#f5f5f7', fontSize: 12, fontWeight: 900 }}>
              practice.{languageMeta.ext}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <select
              value={language}
              onChange={(event) => setLanguage(event.target.value)}
              className="practice-code-select"
            >
              {CODE_LANGUAGES.map((item) => (
                <option key={item.id} value={item.id}>{item.label}</option>
              ))}
            </select>
            <button type="button" className="practice-code-button secondary" onClick={() => setCode(starterCode)}>
              Reset shell
            </button>
            <button type="button" className="practice-code-button run" onClick={handleRun} disabled={running}>
              {running ? 'Running...' : 'Run'}
            </button>
            <button type="button" className="practice-code-button submit" onClick={onSubmit} disabled={!currentCode.trim()}>
              Submit & Check
            </button>
          </div>
        </div>

        <div className="practice-code-editor-shell">
          <div className="practice-code-lines" aria-hidden="true">
            {Array.from({ length: lineCount }).map((_, index) => (
              <div key={index}>{index + 1}</div>
            ))}
          </div>
          <textarea
            value={currentCode}
            onChange={(event) => setCode(event.target.value)}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            className="practice-code-textarea"
          />
        </div>

        <div className="practice-code-console">
          <div className="practice-code-tabs">
            {[
              { id: 'output', label: 'Output' },
              { id: 'hints', label: 'How to use' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={activeTab === tab.id ? 'active' : ''}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="practice-code-console-body">
            {activeTab === 'output' ? (
              runResult ? (
                <div style={{ display: 'grid', gap: 9 }}>
                  <div style={{ color: resultColor, fontSize: 12, fontWeight: 900 }}>
                    {runResult.title}
                  </div>
                  <pre className={runResult.status === 'fail' ? 'practice-code-output error' : 'practice-code-output'}>
                    {runResult.output}
                  </pre>
                  {runResult.previewHtml && (
                    <iframe
                      title="HTML preview"
                      sandbox="allow-scripts"
                      srcDoc={runResult.previewHtml}
                      className="practice-code-preview"
                    />
                  )}
                </div>
              ) : (
                <div className="practice-code-empty">
                  Choose from {CODE_LANGUAGES.length}+ languages, replace the TODOs, then run or submit.
                </div>
              )
            ) : (
              <div style={{ display: 'grid', gap: 8, color: '#c8d6e5', fontSize: 12, lineHeight: 1.65 }}>
                <div>1. Read the scenario on the left.</div>
                <div>2. Pick a language, fill in the shell code, then run it.</div>
                <div>3. Python, SQL, JavaScript, and HTML run immediately. Other languages run when their compiler/runtime is installed.</div>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}

export default function GuidedPracticeView({ task, goal, knowledge, domain = null, onClose, onComplete }) {
  const [loading, setLoading] = useState(true)
  const [practice, setPractice] = useState(null)
  const [hintsRevealed, setHintsRevealed] = useState(0)
  const [answer, setAnswer] = useState('')
  const [checkpointIdx, setCheckpointIdx] = useState(0)
  const [checkpointAnswer, setCheckpointAnswer] = useState('')
  const [checkpointResults, setCheckpointResults] = useState([])
  const [interactiveIdx, setInteractiveIdx] = useState(0)
  const [interactiveResults, setInteractiveResults] = useState([])
  const [phase, setPhase] = useState('practice') // practice | checkpoint | solution | done
  const [submitting, setSubmitting] = useState(false)
  const [showSolution, setShowSolution] = useState(false)
  const [assistantUsageCount, setAssistantUsageCount] = useState(0)
  const [confidenceLevel, setConfidenceLevel] = useState('')
  const [runResult, setRunResult] = useState(null)
  const [runningCode, setRunningCode] = useState(false)
  const [selectedLanguage, setSelectedLanguage] = useState('javascript')
  const startTimeRef = useRef(null)
  const variationSeedRef = useRef('')
  const learningContract = task?._learningContract || task?.learningContract || task?.lessonSeed?.learningContract || null

  const practiceLanguage = selectedLanguage
  const isCodePractice = useMemo(
    () => Boolean(practice) && isCodingPracticeTask({ practice, task, goal }),
    [goal, practice, task],
  )
  const starterCode = useMemo(
    () => practice ? buildPracticeStarterShell({ practice, task, goal, language: practiceLanguage }) : '',
    [goal, practice, practiceLanguage, task],
  )
  const currentAnswer = answer
  const shellMaxWidth = isCodePractice ? 1120 : 640

  useEffect(() => {
    async function load() {
      if (!variationSeedRef.current) {
        variationSeedRef.current = globalThis.crypto?.randomUUID?.() || String(Date.now())
      }
      function applyPracticeData(data) {
        setPractice(data)
        if (isCodingPracticeTask({ practice: data, task, goal })) {
          const language = inferPracticeLanguage({ practice: data, task, goal })
          setSelectedLanguage(language)
          setAnswer(buildPracticeStarterShell({ practice: data, task, goal, language }))
        }
      }

      startTimeRef.current = Date.now()
      setLoading(true)
      setAnswer('')
      setRunResult(null)
      setRunningCode(false)
      setPhase('practice')
      setCheckpointIdx(0)
      setCheckpointAnswer('')
      setCheckpointResults([])
      setInteractiveIdx(0)
      setInteractiveResults([])
      setShowSolution(false)
      setConfidenceLevel('')
      try {
        const res = await fetch('/api/practice-ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'guided_practice',
            concept: task._concept || task.title,
            taskTitle: task.title,
            goal,
            difficulty: task._difficulty || 2,
            knowledge,
            taskDescription: task.description,
            taskAction: task.action,
            taskOutcome: task.outcome,
            learningContract,
            domain,
            variationSeed: variationSeedRef.current,
          }),
        })
        const data = await res.json()
        if (data.title) {
          applyPracticeData(data)
        }
      } catch {}
      setLoading(false)
    }
    load()
  }, [task, goal, knowledge, learningContract, domain])

  const revealHint = useCallback(() => {
    if (practice && hintsRevealed < (practice.hints?.length || 0)) {
      setHintsRevealed(h => h + 1)
    }
  }, [practice, hintsRevealed])

  const runCodePreview = useCallback(async () => {
    setRunningCode(true)
    setRunResult({ status: 'info', title: 'Running sandbox...', output: `Starting ${getLanguageMeta(practiceLanguage).label} runtime.` })
    const result = await runPracticePreview(currentAnswer, practiceLanguage)
    setRunResult(result)
    setRunningCode(false)
  }, [currentAnswer, practiceLanguage])

  const handleLanguageChange = useCallback((nextLanguage) => {
    const normalized = normalizeCodeLanguage(nextLanguage)
    setSelectedLanguage(normalized)
    setRunResult(null)
    if (!answer.trim() || answer === starterCode) {
      setAnswer(buildPracticeStarterShell({ practice, task, goal, language: normalized }))
    }
  }, [answer, goal, practice, starterCode, task])

  const submitPracticeAnswer = useCallback(() => {
    if (!currentAnswer.trim()) return
    if (isCodePractice && !answer.trim()) setAnswer(currentAnswer)
    setPhase('checkpoint')
  }, [answer, currentAnswer, isCodePractice])

  const handleSubmitCheckpoint = () => {
    if (!checkpointAnswer.trim()) return
    const cp = practice.checkpoints[checkpointIdx]
    setCheckpointResults(prev => [...prev, {
      question: cp.question,
      answer: checkpointAnswer,
      expected: cp.answer,
    }])
    setCheckpointAnswer('')
    if (checkpointIdx + 1 < practice.checkpoints.length) {
      setCheckpointIdx(i => i + 1)
    } else {
      setPhase('solution')
    }
  }

  const handleInteractiveResult = (isCorrect, detail = {}) => {
    const questions = practice?.interactiveQuestions || practice?.questions || []
    const currentQuestion = questions[interactiveIdx]
    const submittedAnswer = detail.answer || (detail.selectedIndex != null ? detail.selectedIndex : detail.selected ?? '')
    setCheckpointResults(prev => [...prev, {
      question: currentQuestion?.question || currentQuestion?.statement || currentQuestion?.sentence || `Checkpoint ${interactiveIdx + 1}`,
      answer: submittedAnswer,
      expected: currentQuestion?.answer || currentQuestion?.options?.[currentQuestion?.correctIndex] || currentQuestion?.correct,
      correct: isCorrect,
    }])
    setInteractiveResults((prev) => [...prev, { index: interactiveIdx, correct: isCorrect }])
    window.setTimeout(() => {
      if (interactiveIdx + 1 < questions.length) {
        setInteractiveIdx((idx) => idx + 1)
      } else {
        setPhase('solution')
      }
    }, 900)
  }

  const handleComplete = () => {
    if (!confidenceLevel) return
    setSubmitting(true)
    const elapsed = startTimeRef.current
      ? Math.round((Date.now() - startTimeRef.current) / 1000)
      : 0
    const proofSubmission = ((isCodePractice ? currentAnswer : answer) || '').trim()
      || checkpointResults.map((entry) => `${entry.question}: ${entry.answer}`).join(' | ')
    onComplete({
      hintsUsed: hintsRevealed,
      maxHints: practice?.hints?.length || 3,
      completionTimeSec: elapsed,
      checkpointsPassed: checkpointResults.length,
      attempts: Math.max(1, 1 + checkpointResults.length),
      assistantUsageCount,
      confidenceLevel,
      proofSubmission,
      proofResult: interactiveQuestions.length > 0
        ? `${interactiveResults.filter((entry) => entry.correct).length}/${interactiveQuestions.length} interactive checks correct.`
        : checkpoints.length > 0
          ? `${checkpointResults.length} checkpoint responses completed.`
          : isCodePractice
            ? (runResult?.title || 'Code submission captured.')
            : 'Worked response captured for today\'s concept.',
    })
  }

  const hints = practice?.hints || []
  const checkpoints = practice?.checkpoints || []
  const interactiveQuestions = practice?.interactiveQuestions || practice?.questions || []

  return (
    <>
      <style>{`
        @keyframes fadeIn { from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)} }
        @keyframes spin { to{transform:rotate(360deg)} }
        @keyframes slideUp { from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)} }
        @keyframes hintReveal { from{opacity:0;max-height:0;padding:0 18px}to{opacity:1;max-height:200px;padding:14px 18px} }
        @keyframes pulseGlow { 0%,100%{box-shadow:0 0 0 0 rgba(0,212,255,0.25)}50%{box-shadow:0 0 0 8px rgba(0,212,255,0)} }
        .practice-code-ide {
          margin: 0 0 24px;
          border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.10);
          background: linear-gradient(180deg, rgba(12,16,28,0.98), rgba(5,7,13,0.98));
          box-shadow: 0 22px 60px rgba(0,0,0,0.34), inset 0 1px 0 rgba(255,255,255,0.06);
          overflow: hidden;
        }
        .practice-code-ide {
          display: grid;
          grid-template-columns: minmax(260px, 0.78fr) minmax(420px, 1.22fr);
          min-height: 560px;
        }
        .practice-code-brief {
          padding: 20px;
          border-right: 1px solid rgba(255,255,255,0.08);
          background: radial-gradient(circle at 20% 0%, rgba(0,212,255,0.13), transparent 34%), rgba(255,255,255,0.018);
        }
        .practice-code-editor {
          display: grid;
          grid-template-rows: auto minmax(310px, 1fr) minmax(150px, auto);
          min-width: 0;
        }
        .practice-code-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 12px 14px;
          border-bottom: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.035);
        }
        .practice-code-button {
          height: 34px;
          padding: 0 12px;
          border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.10);
          font-family: ${font};
          font-size: 12px;
          font-weight: 900;
          cursor: pointer;
          transition: transform 0.12s ease, filter 0.12s ease, opacity 0.12s ease;
        }
        .practice-code-button:active:not(:disabled) {
          transform: translateY(2px);
          filter: brightness(0.82);
        }
        .practice-code-button:disabled {
          cursor: default;
          opacity: 0.45;
        }
        .practice-code-button.secondary { background: rgba(255,255,255,0.055); color: #c8d6e5; }
        .practice-code-button.run { background: #818cf8; color: #fff; border-color: rgba(129,140,248,0.45); }
        .practice-code-button.submit { background: #0ef5c2; color: #04100d; border-color: rgba(14,245,194,0.55); }
        .practice-code-select {
          height: 34px;
          max-width: 190px;
          border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.10);
          background: rgba(255,255,255,0.055);
          color: #e6edf5;
          font-family: ${font};
          font-size: 12px;
          font-weight: 900;
          outline: none;
          padding: 0 9px;
        }
        .practice-code-editor-shell {
          display: grid;
          grid-template-columns: 48px minmax(0, 1fr);
          background: #080b12;
          min-height: 320px;
          overflow: hidden;
        }
        .practice-code-lines {
          padding: 14px 10px;
          color: rgba(200,214,229,0.34);
          font-family: ${mono};
          font-size: 12px;
          line-height: 1.7;
          text-align: right;
          user-select: none;
          border-right: 1px solid rgba(255,255,255,0.06);
          background: rgba(255,255,255,0.025);
        }
        .practice-code-textarea {
          width: 100%;
          height: 100%;
          min-height: 320px;
          padding: 14px 16px;
          border: none;
          outline: none;
          resize: vertical;
          box-sizing: border-box;
          background: transparent;
          color: #e6edf5;
          caret-color: #00d4ff;
          font-family: ${mono};
          font-size: 13px;
          line-height: 1.7;
          tab-size: 2;
          white-space: pre;
        }
        .practice-code-console {
          border-top: 1px solid rgba(255,255,255,0.08);
          background: rgba(0,0,0,0.26);
        }
        .practice-code-tabs {
          display: flex;
          gap: 4px;
          padding: 0 12px;
          border-bottom: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.025);
        }
        .practice-code-tabs button {
          padding: 11px 10px 9px;
          border: none;
          border-bottom: 2px solid transparent;
          background: transparent;
          color: #8e8e93;
          font-family: ${font};
          font-size: 11px;
          font-weight: 900;
          cursor: pointer;
        }
        .practice-code-tabs button.active {
          color: #00d4ff;
          border-bottom-color: #00d4ff;
        }
        .practice-code-console-body {
          min-height: 130px;
          max-height: 220px;
          overflow: auto;
          padding: 13px 14px;
          font-family: ${font};
        }
        .practice-code-output {
          margin: 0;
          padding: 12px;
          border-radius: 8px;
          background: rgba(0,212,255,0.045);
          border: 1px solid rgba(0,212,255,0.16);
          color: #c8d6e5;
          white-space: pre-wrap;
          word-break: break-word;
          font-family: ${mono};
          font-size: 12px;
          line-height: 1.6;
        }
        .practice-code-output.error {
          background: rgba(255,69,58,0.07);
          border-color: rgba(255,69,58,0.22);
          color: #ffb4ae;
        }
        .practice-code-empty {
          height: 100px;
          display: grid;
          place-items: center;
          text-align: center;
          color: rgba(200,214,229,0.52);
          font-size: 12px;
          line-height: 1.6;
        }
        .practice-code-preview {
          width: 100%;
          min-height: 240px;
          border: 1px solid rgba(255,255,255,0.10);
          border-radius: 8px;
          background: #fff;
        }
        @media (max-width: 980px) {
          .practice-code-ide { grid-template-columns: 1fr; }
          .practice-code-brief { border-right: none; border-bottom: 1px solid rgba(255,255,255,0.08); }
          .practice-code-toolbar { align-items: flex-start; flex-direction: column; }
        }
      `}</style>

      <div style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'linear-gradient(180deg, #06060f 0%, #080814 100%)',
        fontFamily: font, display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>

        {/* Top bar */}
        <div style={{
          padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(6,6,15,0.88)',
          backdropFilter: 'blur(28px)', WebkitBackdropFilter: 'blur(28px)',
        }}>
          <button onClick={onClose} style={{
            width: 36, height: 36, background: 'rgba(255,255,255,0.07)',
            border: '1px solid rgba(255,255,255,0.10)', borderRadius: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: '#8e8e93',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <IconGlyph name="wrench" size={18} strokeWidth={2.2} color="#00d4ff" />
            <span style={{ fontSize: 14, fontWeight: 700, color: '#00d4ff' }}>Guided Practice</span>
          </div>

          {/* Hint counter */}
          <div style={{
            padding: '4px 12px', background: 'rgba(0,212,255,0.10)',
            border: '1px solid rgba(0,212,255,0.25)', borderRadius: 9999,
            fontSize: 11, fontWeight: 700, color: '#00d4ff',
          }}>
            {hintsRevealed}/{hints.length}
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: '20px 20px 120px' }}>
          <div style={{ maxWidth: shellMaxWidth, margin: '0 auto' }}>

            {loading ? (
              <div style={{ textAlign: 'center', paddingTop: 80 }}>
                <div style={{
                  width: 44, height: 44, border: '3px solid rgba(255,255,255,0.06)',
                  borderTopColor: '#00d4ff', borderRadius: '50%',
                  animation: 'spin 0.65s linear infinite', margin: '0 auto 20px',
                }} />
                <p style={{ color: '#636366', fontSize: 14 }}>Building your practice exercise...</p>
                <p style={{ color: '#475569', fontSize: 12, marginTop: 8 }}>Crafting a scenario tailored to your level</p>
              </div>
            ) : !practice ? (
              <div style={{ textAlign: 'center', paddingTop: 80 }}>
                <p style={{ color: '#636366', marginBottom: 16 }}>Could not load practice exercise.</p>
                <button onClick={onClose} style={{
                  padding: '10px 24px', background: 'rgba(255,255,255,0.07)',
                  border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12,
                  color: '#8e8e93', fontSize: 14, cursor: 'pointer', fontFamily: font,
                }}>Go Back</button>
              </div>
            ) : (
              <div style={{ animation: 'fadeIn 0.3s ease both' }}>
                <DailyConceptCard
                  learningContract={learningContract}
                  concept={task._concept || task.title}
                  goal={goal}
                  accent="#00d4ff"
                />

                {/* Title */}
                <h1 style={{
                  fontSize: 24, fontWeight: 800, color: '#f5f5f7',
                  letterSpacing: '-0.5px', lineHeight: 1.3, marginBottom: 16,
                }}>{practice.title}</h1>

                {/* Scenario */}
                <div style={{
                  padding: '16px 20px', background: 'rgba(0,212,255,0.05)',
                  border: '1px solid rgba(0,212,255,0.18)', borderRadius: 16,
                  marginBottom: 20,
                }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#00d4ff', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 8 }}>
                    Scenario
                  </div>
                  <p style={{ color: '#c8d6e5', fontSize: 15, lineHeight: 1.65, margin: 0 }}>
                    {practice.scenario}
                  </p>
                </div>

                {/* Task */}
                <div style={{
                  padding: '16px 20px', background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.10)', borderRadius: 16,
                  marginBottom: 20,
                }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#f5f5f7', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 8 }}>
                    Your Task
                  </div>
                  <p style={{ color: '#f5f5f7', fontSize: 15, lineHeight: 1.65, margin: 0, fontWeight: 600 }}>
                    {practice.task}
                  </p>
                </div>

                {/* Hints */}
                <div style={{ marginBottom: 24 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#636366', textTransform: 'uppercase', letterSpacing: '1px' }}>
                      Hints
                    </span>
                    {hintsRevealed < hints.length && (
                      <button onClick={revealHint} style={{
                        padding: '6px 14px', background: 'rgba(0,212,255,0.08)',
                        border: '1px solid rgba(0,212,255,0.25)', borderRadius: 9999,
                        color: '#00d4ff', fontSize: 12, fontWeight: 700,
                        cursor: 'pointer', fontFamily: font,
                        animation: 'pulseGlow 2s ease infinite',
                      }}>
                        Reveal Hint {hintsRevealed + 1}
                      </button>
                    )}
                  </div>

                  {hints.slice(0, hintsRevealed).map((hint, i) => {
                    const c = HINT_COLORS[i] || HINT_COLORS[2]
                    return (
                      <div key={i} style={{
                        padding: '14px 18px', background: c.bg,
                        border: `1px solid ${c.border}`, borderRadius: 14,
                        marginBottom: 8, animation: 'hintReveal 0.4s ease both',
                      }}>
                        <div style={{ fontSize: 10, fontWeight: 800, color: c.text, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 6 }}>
                          {c.label} — Hint {i + 1}
                        </div>
                        <p style={{ margin: 0, color: '#c8d6e5', fontSize: 14, lineHeight: 1.6 }}>
                          {hint.hint}
                        </p>
                      </div>
                    )
                  })}

                  {hintsRevealed === 0 && (
                    <p style={{ color: '#3a3a3c', fontSize: 12, fontStyle: 'italic' }}>
                      Try solving it first! Hints are here if you need them.
                    </p>
                  )}
                </div>

                {/* Answer area */}
                {phase === 'practice' && (
                  isCodePractice ? (
                    <PracticeCodeIde
                      practice={practice}
                      task={task}
                      language={practiceLanguage}
                      starterCode={starterCode}
                      code={answer}
                      setCode={(value) => setAnswer(value)}
                      setLanguage={handleLanguageChange}
                      runResult={runResult}
                      running={runningCode}
                      onRun={runCodePreview}
                      onSubmit={submitPracticeAnswer}
                    />
                  ) : (
                    <div style={{ marginBottom: 24 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#636366', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 8 }}>
                        Your Answer
                      </div>
                      <textarea
                        value={answer}
                        onChange={e => setAnswer(e.target.value)}
                        placeholder="Type your solution here..."
                        style={{
                          width: '100%', minHeight: 140, padding: '14px 16px',
                          background: 'rgba(0,0,0,0.30)', border: '1px solid rgba(255,255,255,0.12)',
                          borderRadius: 14, color: '#f5f5f7', fontSize: 14,
                          fontFamily: mono, lineHeight: 1.6,
                          resize: 'vertical', outline: 'none',
                        }}
                      />
                      <button
                        onClick={submitPracticeAnswer}
                        disabled={!currentAnswer.trim()}
                        style={{
                          marginTop: 12, padding: '12px 24px', width: '100%',
                          background: currentAnswer.trim() ? 'linear-gradient(135deg, #00d4ff, #0ef5c2)' : 'rgba(255,255,255,0.06)',
                          border: 'none', borderRadius: 14,
                          color: currentAnswer.trim() ? '#06060f' : '#636366',
                          fontSize: 15, fontWeight: 700, cursor: currentAnswer.trim() ? 'pointer' : 'default',
                          fontFamily: font,
                          boxShadow: currentAnswer.trim() ? '0 0 24px rgba(0,212,255,0.25)' : 'none',
                        }}
                      >
                        Submit & Check Understanding →
                      </button>
                    </div>
                  )
                )}

                {/* Checkpoint questions */}
                {phase === 'checkpoint' && interactiveQuestions.length > 0 && (
                  <div style={{ animation: 'slideUp 0.3s ease both' }}>
                    <div style={{
                      padding: '16px 20px', background: 'rgba(0,212,255,0.06)',
                      border: '1px solid rgba(0,212,255,0.20)', borderRadius: 16,
                      marginBottom: 20,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
                        <div style={{ fontSize: 11, fontWeight: 800, color: '#00d4ff', textTransform: 'uppercase', letterSpacing: '1px' }}>
                          Interactive check {interactiveIdx + 1}/{interactiveQuestions.length}
                        </div>
                        <div style={{ fontSize: 12, fontWeight: 800, color: '#0ef5c2' }}>
                          {interactiveResults.filter((result) => result.correct).length} correct
                        </div>
                      </div>
                      <InteractiveQuestion
                        key={`${interactiveIdx}-${interactiveQuestions[interactiveIdx]?.question || interactiveQuestions[interactiveIdx]?.sentence}`}
                        {...interactiveQuestions[interactiveIdx]}
                        correctIndex={Number.isFinite(interactiveQuestions[interactiveIdx]?.correctIndex)
                          ? interactiveQuestions[interactiveIdx].correctIndex
                          : Number(interactiveQuestions[interactiveIdx]?.correct_index) || 0}
                        explanation={interactiveQuestions[interactiveIdx]?.explanation}
                        onResult={handleInteractiveResult}
                      />
                    </div>
                  </div>
                )}

                {phase === 'checkpoint' && interactiveQuestions.length === 0 && checkpoints.length > 0 && (
                  <div style={{ animation: 'slideUp 0.3s ease both' }}>
                    <div style={{
                      padding: '16px 20px', background: 'rgba(129,140,248,0.06)',
                      border: '1px solid rgba(129,140,248,0.20)', borderRadius: 16,
                      marginBottom: 20,
                    }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#818CF8', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 8 }}>
                        Checkpoint {checkpointIdx + 1}/{checkpoints.length}
                      </div>
                      <p style={{ color: '#f5f5f7', fontSize: 16, fontWeight: 700, lineHeight: 1.5, margin: 0 }}>
                        {checkpoints[checkpointIdx]?.question}
                      </p>
                    </div>

                    <textarea
                      value={checkpointAnswer}
                      onChange={e => setCheckpointAnswer(e.target.value)}
                      placeholder="Explain your thinking..."
                      style={{
                        width: '100%', minHeight: 80, padding: '12px 16px',
                        background: 'rgba(0,0,0,0.30)', border: '1px solid rgba(255,255,255,0.12)',
                        borderRadius: 14, color: '#f5f5f7', fontSize: 14,
                        fontFamily: font, lineHeight: 1.6, resize: 'vertical', outline: 'none',
                        marginBottom: 12,
                      }}
                    />
                    <button
                      onClick={handleSubmitCheckpoint}
                      disabled={!checkpointAnswer.trim()}
                      style={{
                        padding: '12px 24px', width: '100%',
                        background: checkpointAnswer.trim() ? 'linear-gradient(135deg, #818CF8, #6366F1)' : 'rgba(255,255,255,0.06)',
                        border: 'none', borderRadius: 14,
                        color: checkpointAnswer.trim() ? '#fff' : '#636366',
                        fontSize: 15, fontWeight: 700, cursor: checkpointAnswer.trim() ? 'pointer' : 'default',
                        fontFamily: font,
                      }}
                    >
                      {checkpointIdx + 1 < checkpoints.length ? 'Next Checkpoint →' : 'See Solution →'}
                    </button>
                  </div>
                )}

                {/* Solution reveal */}
                {(phase === 'solution' || (phase === 'checkpoint' && interactiveQuestions.length === 0 && checkpoints.length === 0)) && (
                  <div style={{ animation: 'slideUp 0.3s ease both' }}>
                    {!showSolution ? (
                      <button
                        onClick={() => setShowSolution(true)}
                        style={{
                          width: '100%', padding: '16px', marginBottom: 20,
                          background: 'rgba(14,245,194,0.06)', border: '1px solid rgba(14,245,194,0.20)',
                          borderRadius: 16, color: '#0ef5c2', fontSize: 15, fontWeight: 700,
                          cursor: 'pointer', fontFamily: font,
                        }}
                      >
                        Reveal Solution
                      </button>
                    ) : (
                      <>
                        <div style={{
                          padding: '18px 20px', background: 'rgba(14,245,194,0.05)',
                          border: '1px solid rgba(14,245,194,0.20)', borderRadius: 16, marginBottom: 16,
                        }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#0ef5c2', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 10 }}>
                            Solution
                          </div>
                          <pre style={{
                            color: '#c8f7eb', fontSize: 13, lineHeight: 1.7,
                            whiteSpace: 'pre-wrap', margin: 0,
                            fontFamily: "'JetBrains Mono',monospace",
                          }}>
                            {practice.solution}
                          </pre>
                        </div>

                        <div style={{
                          padding: '14px 18px', background: 'rgba(255,255,255,0.03)',
                          border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, marginBottom: 20,
                        }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#636366', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 6 }}>
                            Why It Works
                          </div>
                          <p style={{ color: '#8e8e93', fontSize: 14, lineHeight: 1.6, margin: 0 }}>
                            {practice.explanation}
                          </p>
                        </div>

                        <ConfidenceSelector
                          value={confidenceLevel}
                          onChange={setConfidenceLevel}
                          accent="#00d4ff"
                          borderColor="rgba(0,212,255,0.24)"
                          background="rgba(0,212,255,0.05)"
                          label="How confident are you that you could do a similar problem on your own?"
                        />

                        <div style={{ marginTop: 16 }}>
                          <DailyProofRecapCard
                            learningContract={learningContract}
                            concept={task._concept || task.title}
                            goal={goal}
                            accent="#00d4ff"
                            proofSubmission={((isCodePractice ? currentAnswer : answer) || '').trim() || checkpointResults.map((entry) => `${entry.question}: ${entry.answer}`).join(' | ')}
                            proofResult={interactiveQuestions.length > 0
                              ? `${interactiveResults.filter((entry) => entry.correct).length}/${interactiveQuestions.length} interactive checks correct`
                              : checkpoints.length > 0
                                ? `${checkpointResults.length} checkpoint responses completed`
                                : runResult?.title || ''}
                          />
                        </div>

                        {phase !== 'done' && setPhase('done') && null}
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Bottom nav */}
        <div style={{
          padding: '14px 20px 30px', borderTop: '1px solid rgba(255,255,255,0.08)',
          background: 'rgba(6,6,15,0.90)', backdropFilter: 'blur(28px)',
        }}>
          <div style={{ maxWidth: shellMaxWidth, margin: '0 auto', display: 'flex', gap: 12 }}>
            <button onClick={onClose} style={{
              padding: '14px 24px', background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.12)', borderRadius: 16,
              color: '#8e8e93', fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: font,
            }}>Back</button>

            {phase === 'done' && (
              <button
                onClick={handleComplete}
                disabled={submitting || !confidenceLevel}
                style={{
                  flex: 1, padding: '14px',
                  background: submitting ? 'rgba(0,212,255,0.06)' : confidenceLevel ? 'linear-gradient(135deg, #00d4ff, #0ef5c2)' : 'rgba(255,255,255,0.04)',
                  border: submitting ? '1px solid rgba(0,212,255,0.22)' : confidenceLevel ? 'none' : '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 16, color: submitting ? '#00d4ff' : confidenceLevel ? '#06060f' : '#636366',
                  fontSize: 16, fontWeight: 700, cursor: submitting ? 'default' : 'pointer',
                  fontFamily: font, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                {submitting ? (
                  <><div style={{ width: 14, height: 14, border: '2px solid rgba(0,212,255,0.2)', borderTopColor: '#00d4ff', borderRadius: '50%', animation: 'spin 0.65s linear infinite' }}/>Saving...</>
                ) : confidenceLevel ? 'Complete Practice' : 'Choose confidence to continue'}
              </button>
            )}
          </div>
        </div>
      </div>

      <AIAssistant
        concept={task._concept || task.title}
        goal={goal}
        mode={task._aiMode || 'teaching'}
        domain={domain}
        knowledge={knowledge}
        onAsk={() => setAssistantUsageCount((count) => count + 1)}
        context={`Guided Practice: ${practice?.title || task.title}`}
      />
    </>
  )
}
