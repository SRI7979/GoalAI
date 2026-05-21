'use client'
import { useState, useEffect, useMemo, useRef } from 'react'
import AIAssistant from './AIAssistant'
import IconGlyph from '@/components/IconGlyph'
import {
  CODE_LANGUAGES,
  buildStarterForLanguage,
  detectCodeLanguageFromText,
  getLanguageMeta,
  normalizeCodeLanguage,
} from '@/lib/codeLanguages'

const mono = "'SF Mono','JetBrains Mono','Fira Code','Cascadia Code',Menlo,monospace"

function inferProjectLanguage({ project, task, goal } = {}) {
  const goalLanguage = detectCodeLanguageFromText(goal, '')
  if (goalLanguage) return goalLanguage
  const explicit = normalizeCodeLanguage(project?.starter_language || project?.language, '')
  if (explicit) return explicit

  const text = [
    task?._concept,
    task?.title,
    task?.description,
    task?.action,
    task?.outcome,
    project?.title,
    project?.objective,
    project?.successCriteria,
    project?.starter,
    ...(project?.steps || []).flatMap((step) => [step.title, step.description]),
  ].filter(Boolean).join(' ')

  return detectCodeLanguageFromText(text, 'javascript')
}

function shouldShowProjectIde({ project, task, goal } = {}) {
  if (String(project?.starter || '').trim()) return true
  if (String(task?.presentation || '').toLowerCase() === 'exercise') return true
  const text = [
    goal,
    task?._concept,
    task?.title,
    task?.description,
    task?.action,
    task?.outcome,
    project?.title,
    project?.objective,
    project?.successCriteria,
  ].filter(Boolean).join(' ').toLowerCase()
  if (detectCodeLanguageFromText(text, '')) return true
  return /\bsql\b|query|database|python|javascript|typescript|react|node|swift|html|css|code|coding|program|function|component|api|array|object/.test(text)
}

function buildProjectStarterShell({ project, task, goal, language }) {
  const existing = String(project?.starter || '').trim()
  const existingLanguage = normalizeCodeLanguage(project?.starter_language || project?.language, '')
  if (existing && existingLanguage === normalizeCodeLanguage(language)) return existing

  const title = String(project?.title || task?.title || 'Practice exercise').replace(/\*\//g, '')
  const objective = String(project?.objective || task?.action || task?.outcome || goal || 'Complete the exercise.').replace(/\*\//g, '')
  return buildStarterForLanguage(language, title, objective)
}

async function runProjectCode(code, language) {
  const source = String(code || '')
  if (!source.trim()) return { status: 'idle', title: 'Nothing to run yet', output: 'Add code to the editor first.' }
  if (/\bTODO\b|your solution here|table_name|-- columns/i.test(source)) {
    return { status: 'warn', title: 'Starter shell detected', output: 'Replace the TODO placeholders with your own solution before running.' }
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
    return { status: 'fail', title: 'Runtime error', output: error?.stack || error?.message || 'Execution failed.' }
  }
}

function ProjectCodeIde({ project, language, starterCode, code, setCode, setLanguage, runResult, running, onRun }) {
  const [activeTab, setActiveTab] = useState('output')
  const lineCount = Math.max(9, String(code || '').split('\n').length)
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
    <div className="project-code-ide">
      <aside className="project-code-brief">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#00d4ff', fontSize: 11, fontWeight: 900, letterSpacing: '0.09em', textTransform: 'uppercase', marginBottom: 12 }}>
          <IconGlyph name="code" size={14} strokeWidth={2.4} color="#00d4ff" />
          Built-in IDE
        </div>
        <h2 style={{ margin: '0 0 10px', color: '#f5f5f7', fontSize: 20, lineHeight: 1.2, fontWeight: 900 }}>
          {project.title}
        </h2>
        <p style={{ margin: 0, color: '#c8d6e5', fontSize: 13, lineHeight: 1.65 }}>
          Start from the shell code, use the steps as your guide, then run or verify your result.
        </p>
      </aside>

      <section className="project-code-editor">
        <div className="project-code-toolbar">
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
              className="project-code-select"
            >
              {CODE_LANGUAGES.map((item) => (
                <option key={item.id} value={item.id}>{item.label}</option>
              ))}
            </select>
            <button type="button" className="project-code-button secondary" onClick={() => setCode(starterCode)}>
              Reset shell
            </button>
            <button type="button" className="project-code-button run" onClick={handleRun} disabled={running}>
              {running ? 'Running...' : 'Run'}
            </button>
          </div>
        </div>

        <div className="project-code-editor-shell">
          <div className="project-code-lines" aria-hidden="true">
            {Array.from({ length: lineCount }).map((_, index) => (
              <div key={index}>{index + 1}</div>
            ))}
          </div>
          <textarea
            value={code}
            onChange={(event) => setCode(event.target.value)}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            className="project-code-textarea"
          />
        </div>

        <div className="project-code-console">
          <div className="project-code-tabs">
            {[
              { id: 'output', label: 'Output' },
              { id: 'guide', label: 'Guide' },
            ].map((tab) => (
              <button key={tab.id} type="button" className={activeTab === tab.id ? 'active' : ''} onClick={() => setActiveTab(tab.id)}>
                {tab.label}
              </button>
            ))}
          </div>
          <div className="project-code-console-body">
            {activeTab === 'output' ? (
              runResult ? (
                <div style={{ display: 'grid', gap: 9 }}>
                  <div style={{ color: resultColor, fontSize: 12, fontWeight: 900 }}>{runResult.title}</div>
                  <pre className={runResult.status === 'fail' ? 'project-code-output error' : 'project-code-output'}>{runResult.output}</pre>
                  {runResult.previewHtml && (
                    <iframe
                      title="HTML preview"
                      sandbox="allow-scripts"
                      srcDoc={runResult.previewHtml}
                      className="project-code-preview"
                    />
                  )}
                </div>
              ) : (
                <div className="project-code-empty">
                  Choose from {CODE_LANGUAGES.length}+ languages, write code, then run it in the sandbox.
                </div>
              )
            ) : (
              <div style={{ display: 'grid', gap: 8, color: '#c8d6e5', fontSize: 12, lineHeight: 1.65 }}>
                <div>1. Read each step below the editor.</div>
                <div>2. Pick a language, implement the shell code, then run it.</div>
                <div>3. Python, SQL, JavaScript, and HTML run immediately. Other languages run when their local compiler/runtime is installed.</div>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}

export default function ProjectView({ task, goal, knowledge, domain = null, onClose, onComplete }) {
  const [loading, setLoading]   = useState(true)
  const [project, setProject]   = useState(null)
  const [checked, setChecked]   = useState({})
  const [showHint, setShowHint] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [code, setCode] = useState('')
  const [runResult, setRunResult] = useState(null)
  const [runningCode, setRunningCode] = useState(false)
  const [selectedLanguage, setSelectedLanguage] = useState('javascript')
  const variationSeedRef = useRef('')

  const font = "'Plus Jakarta Sans','DM Sans',system-ui,sans-serif"

  const projectLanguage = selectedLanguage
  const showCodeIde = useMemo(() => Boolean(project) && shouldShowProjectIde({ project, task, goal }), [goal, project, task])
  const starterCode = useMemo(
    () => project ? buildProjectStarterShell({ project, task, goal, language: projectLanguage }) : '',
    [goal, project, projectLanguage, task],
  )
  const shellMaxWidth = showCodeIde ? 1120 : 680

  useEffect(() => {
    async function load() {
      if (!variationSeedRef.current) {
        variationSeedRef.current = globalThis.crypto?.randomUUID?.() || String(Date.now())
      }
      function applyProjectData(data) {
        setProject(data)
        if (shouldShowProjectIde({ project: data, task, goal })) {
          const language = inferProjectLanguage({ project: data, task, goal })
          setSelectedLanguage(language)
          setCode(buildProjectStarterShell({ project: data, task, goal, language }))
        }
      }

      setLoading(true)
      setCode('')
      setRunResult(null)
      setRunningCode(false)
      try {
        const res = await fetch('/api/project', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            concept: task._concept || task.title,
            taskTitle: task.title,
            goal,
            knowledge,
            taskType: task.type,
            domain,
            variationSeed: variationSeedRef.current,
          }),
        })
        const data = await res.json()
        if (data.steps) {
          applyProjectData(data)
        }
      } catch {}
      setLoading(false)
    }
    load()
  }, [task, goal, knowledge, domain])

  const allChecked = project && project.steps.every(s => checked[s.id])
  const checkedCount = Object.values(checked).filter(Boolean).length
  const totalSteps = project?.steps?.length || 0
  const runCodePreview = async () => {
    setRunningCode(true)
    setRunResult({ status: 'info', title: 'Running sandbox...', output: `Starting ${getLanguageMeta(projectLanguage).label} runtime.` })
    const result = await runProjectCode(code, projectLanguage)
    setRunResult(result)
    setRunningCode(false)
  }

  const handleLanguageChange = (nextLanguage) => {
    const normalized = normalizeCodeLanguage(nextLanguage)
    setSelectedLanguage(normalized)
    setRunResult(null)
    if (!code.trim() || code === starterCode) {
      setCode(buildProjectStarterShell({ project, task, goal, language: normalized }))
    }
  }

  return (
    <>
      <style>{`
        @keyframes fadeIn { from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)} }
        @keyframes spin    { to{transform:rotate(360deg)} }
        @keyframes checkPop { 0%{transform:scale(0.5)}70%{transform:scale(1.2)}100%{transform:scale(1)} }
        .project-code-ide {
          margin: 0 0 24px;
          border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.10);
          background: linear-gradient(180deg, rgba(12,16,28,0.98), rgba(5,7,13,0.98));
          box-shadow: 0 22px 60px rgba(0,0,0,0.34), inset 0 1px 0 rgba(255,255,255,0.06);
          display: grid;
          grid-template-columns: minmax(250px, 0.72fr) minmax(420px, 1.28fr);
          overflow: hidden;
        }
        .project-code-brief {
          padding: 20px;
          border-right: 1px solid rgba(255,255,255,0.08);
          background: radial-gradient(circle at 20% 0%, rgba(0,212,255,0.13), transparent 34%), rgba(255,255,255,0.018);
        }
        .project-code-editor {
          display: grid;
          grid-template-rows: auto minmax(310px, 1fr) minmax(140px, auto);
          min-width: 0;
        }
        .project-code-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 12px 14px;
          border-bottom: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.035);
        }
        .project-code-button {
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
        .project-code-button:active:not(:disabled) {
          transform: translateY(2px);
          filter: brightness(0.82);
        }
        .project-code-button.secondary { background: rgba(255,255,255,0.055); color: #c8d6e5; }
        .project-code-button.run { background: #818cf8; color: #fff; border-color: rgba(129,140,248,0.45); }
        .project-code-button:disabled { opacity: 0.55; cursor: default; }
        .project-code-select {
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
        .project-code-editor-shell {
          display: grid;
          grid-template-columns: 48px minmax(0, 1fr);
          min-height: 320px;
          background: #080b12;
          overflow: hidden;
        }
        .project-code-lines {
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
        .project-code-textarea {
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
        .project-code-console {
          border-top: 1px solid rgba(255,255,255,0.08);
          background: rgba(0,0,0,0.26);
        }
        .project-code-tabs {
          display: flex;
          gap: 4px;
          padding: 0 12px;
          border-bottom: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.025);
        }
        .project-code-tabs button {
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
        .project-code-tabs button.active {
          color: #00d4ff;
          border-bottom-color: #00d4ff;
        }
        .project-code-console-body {
          min-height: 130px;
          max-height: 220px;
          overflow: auto;
          padding: 13px 14px;
          font-family: ${font};
        }
        .project-code-output {
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
        .project-code-output.error {
          background: rgba(255,69,58,0.07);
          border-color: rgba(255,69,58,0.22);
          color: #ffb4ae;
        }
        .project-code-empty {
          height: 100px;
          display: grid;
          place-items: center;
          text-align: center;
          color: rgba(200,214,229,0.52);
          font-size: 12px;
          line-height: 1.6;
        }
        .project-code-preview {
          width: 100%;
          min-height: 240px;
          border: 1px solid rgba(255,255,255,0.10);
          border-radius: 8px;
          background: #fff;
        }
        @media (max-width: 980px) {
          .project-code-ide { grid-template-columns: 1fr; }
          .project-code-brief { border-right: none; border-bottom: 1px solid rgba(255,255,255,0.08); }
          .project-code-toolbar { align-items: flex-start; flex-direction: column; }
        }
      `}</style>

      <div style={{
        position:'fixed', inset:0, zIndex:200,
        background:'linear-gradient(180deg,#06060f 0%,#080814 100%)',
        fontFamily: font, display:'flex', flexDirection:'column', overflow:'hidden',
      }}>

        {/* Top bar */}
        <div style={{ padding:'14px 20px', display:'flex', alignItems:'center', justifyContent:'space-between', borderBottom:'1px solid rgba(255,255,255,0.08)', background:'rgba(6,6,15,0.88)', backdropFilter:'blur(28px)' }}>
          <button onClick={onClose} style={{ width:36, height:36, background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.10)', borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'#8e8e93' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>

          {/* Step progress */}
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            {!loading && project && (
              <>
                <div style={{ height:6, width:120, background:'rgba(255,255,255,0.08)', borderRadius:9999, overflow:'hidden' }}>
                  <div style={{ height:'100%', width:`${totalSteps>0?(checkedCount/totalSteps)*100:0}%`, background:'linear-gradient(90deg,#818CF8,#6366F1)', borderRadius:9999, transition:'width 0.3s' }}/>
                </div>
                <span style={{ fontSize:12, fontWeight:700, color:'#818CF8' }}>{checkedCount}/{totalSteps}</span>
              </>
            )}
          </div>

          <div style={{ padding:'4px 12px', background:'rgba(129,140,248,0.10)', border:'1px solid rgba(129,140,248,0.25)', borderRadius:9999, fontSize:11, fontWeight:700, color:'#818CF8', textTransform:'uppercase', letterSpacing:'1px' }}>
            {task.type === 'exercise' ? 'Exercise' : 'Practice'}
          </div>
        </div>

        {/* Content */}
        <div style={{ flex:1, overflow:'auto', padding:'20px 20px 120px' }}>
          <div style={{ maxWidth:shellMaxWidth, margin:'0 auto' }}>

            {loading ? (
              <div style={{ textAlign:'center', paddingTop:80 }}>
                <div style={{ width:44, height:44, border:'3px solid rgba(255,255,255,0.06)', borderTopColor:'#818CF8', borderRadius:'50%', animation:'spin 0.65s linear infinite', margin:'0 auto 20px' }}/>
                <p style={{ color:'#636366', fontSize:14 }}>Generating your project…</p>
                <p style={{ color:'#475569', fontSize:12, marginTop:8 }}>Building something hands-on for you</p>
              </div>
            ) : !project ? (
              <div style={{ textAlign:'center', paddingTop:80 }}>
                <p style={{ color:'#636366' }}>Could not generate project. Use the task description above as your guide.</p>
                <p style={{ color:'#8e8e93', fontSize:14, marginTop:12 }}>{task.description}</p>
              </div>
            ) : (
              <div style={{ animation:'fadeIn 0.35s ease both' }}>
                {/* Header */}
                <div style={{ display:'inline-flex', alignItems:'center', gap:7, padding:'5px 14px', marginBottom:16, background:'rgba(129,140,248,0.08)', border:'1px solid rgba(129,140,248,0.20)', borderRadius:9999, fontSize:11, fontWeight:700, color:'#818CF8', textTransform:'uppercase', letterSpacing:'1px' }}>
                  <IconGlyph name="hammer" size={13} strokeWidth={2.3} color="#818CF8" /> Mini Project
                </div>
                <h1 style={{ fontSize:26, fontWeight:800, color:'#f5f5f7', letterSpacing:'-0.5px', lineHeight:1.25, marginBottom:10 }}>
                  {project.title}
                </h1>
                <p style={{ fontSize:15, color:'#8e8e93', lineHeight:1.6, marginBottom:28 }}>
                  {project.objective}
                </p>

                {showCodeIde && (
                  <ProjectCodeIde
                    project={project}
                    language={projectLanguage}
                    starterCode={starterCode}
                    code={code}
                    setCode={setCode}
                    setLanguage={handleLanguageChange}
                    runResult={runResult}
                    running={runningCode}
                    onRun={runCodePreview}
                  />
                )}

                {/* Steps */}
                <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                  {project.steps.map((step) => {
                    const done = !!checked[step.id]
                    return (
                      <div key={step.id} onClick={() => setChecked(prev => ({ ...prev, [step.id]: !prev[step.id] }))}
                        style={{ padding:'16px 18px', background: done ? 'rgba(129,140,248,0.07)' : 'rgba(255,255,255,0.03)', border:`1.5px solid ${done ? 'rgba(129,140,248,0.35)' : 'rgba(255,255,255,0.08)'}`, borderRadius:18, cursor:'pointer', display:'flex', gap:14, alignItems:'flex-start', transition:'all 0.2s' }}>
                        <div style={{ width:28, height:28, borderRadius:'50%', flexShrink:0, marginTop:1, background: done ? 'linear-gradient(135deg,#818CF8,#6366F1)' : 'rgba(255,255,255,0.06)', border:`2px solid ${done ? 'transparent' : 'rgba(255,255,255,0.14)'}`, display:'flex', alignItems:'center', justifyContent:'center', animation: done ? 'checkPop 0.3s cubic-bezier(0.34,1.56,0.64,1)' : 'none' }}>
                          {done
                            ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                            : <span style={{ fontSize:12, fontWeight:700, color:'#636366' }}>{step.id}</span>
                          }
                        </div>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:15, fontWeight:700, color: done ? '#818CF8' : '#f5f5f7', marginBottom:4, textDecorationLine: done ? 'line-through' : 'none', opacity: done ? 0.7 : 1 }}>
                            {step.title}
                          </div>
                          {!done && (
                            <p style={{ fontSize:13, color:'#636366', lineHeight:1.6, margin:0 }}>
                              {step.description}
                            </p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Hint */}
                {project.hint && (
                  <div style={{ marginTop:20 }}>
                    <button onClick={() => setShowHint(v=>!v)} style={{ background:'none', border:'none', color:'#636366', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:font, display:'flex', alignItems:'center', gap:6, padding:0 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                      {showHint ? 'Hide hint' : 'Show hint'}
                    </button>
                    {showHint && (
                      <div style={{ marginTop:10, padding:'12px 16px', background:'rgba(251,191,36,0.05)', border:'1px solid rgba(251,191,36,0.18)', borderRadius:14 }}>
                        <p style={{ fontSize:13, color:'#8e8e93', margin:0, lineHeight:1.6 }}>{project.hint}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Success criteria */}
                {project.successCriteria && allChecked && (
                  <div style={{ marginTop:20, padding:'14px 18px', background:'rgba(14,245,194,0.06)', border:'1px solid rgba(14,245,194,0.22)', borderRadius:16, animation:'fadeIn 0.3s ease both' }}>
                    <div style={{ fontSize:11, fontWeight:700, color:'#0ef5c2', textTransform:'uppercase', letterSpacing:'1px', marginBottom:6 }}>Success criteria</div>
                    <p style={{ fontSize:14, color:'#8e8e93', margin:0, lineHeight:1.6 }}>{project.successCriteria}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Bottom nav */}
        <div style={{ padding:'14px 20px 30px', borderTop:'1px solid rgba(255,255,255,0.08)', background:'rgba(6,6,15,0.90)', backdropFilter:'blur(28px)' }}>
          <div style={{ maxWidth:shellMaxWidth, margin:'0 auto', display:'flex', gap:12 }}>
            <button onClick={onClose} style={{ padding:'14px 24px', background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:16, color:'#8e8e93', fontSize:15, fontWeight:600, cursor:'pointer', fontFamily:font }}>Back</button>
            <button onClick={() => { setCompleting(true); onComplete() }} disabled={completing} style={{
              flex:1, padding:'14px',
              background: completing ? 'rgba(14,245,194,0.06)' : allChecked ? 'linear-gradient(135deg,#0ef5c2,#00d4ff)' : 'linear-gradient(135deg,#818CF8,#6366F1)',
              border: completing ? '1px solid rgba(14,245,194,0.22)' : 'none',
              borderRadius:16, color: completing ? '#0ef5c2' : '#06060f', fontSize:16, fontWeight:700,
              cursor: completing ? 'default' : 'pointer', fontFamily:font,
              boxShadow: completing ? 'none' : '0 0 32px rgba(14,245,194,0.22)',
              display:'flex', alignItems:'center', justifyContent:'center', gap:8,
            }}>
              {completing ? (
                <><div style={{width:14,height:14,border:'2px solid rgba(14,245,194,0.2)',borderTopColor:'#0ef5c2',borderRadius:'50%',animation:'spin 0.65s linear infinite'}}/>Saving…</>
              ) : allChecked ? 'Complete' : `Complete (${checkedCount}/${totalSteps} done)`}
            </button>
          </div>
        </div>
      </div>

      <AIAssistant concept={task._concept || task.title} goal={goal} domain={domain} knowledge={knowledge} context={`Project: ${project?.title || task.title}`} />
    </>
  )
}
