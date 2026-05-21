'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  CODE_DOMAIN_TASK_TYPES,
  getDomainMetadata,
  getDomainTaskLabel,
  getDomainWorkspaceType,
  normalizeDomain,
} from '@/lib/domainAdapter'
import { getLanguageMeta } from '@/lib/codeLanguages'

const font = "'Plus Jakarta Sans','DM Sans',system-ui,sans-serif"
const mono = "'JetBrains Mono','Fira Code','SF Mono','Cascadia Code',Menlo,monospace"
const CODE_TASK_TYPE_SET = new Set(CODE_DOMAIN_TASK_TYPES)

// ─── Syntax highlighter (no deps) ────────────────────────────────────────────
function highlight(code = '', lang = 'javascript') {
  const escaped = String(code)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  if (!['javascript', 'js', 'python', 'py', 'typescript', 'ts'].includes(lang)) {
    return `<span style="color:#e2e8f0">${escaped}</span>`
  }

  return escaped
    // strings
    .replace(/(["'`])(?:(?!\1)[^\\]|\\.)*?\1/g, m => `<span style="color:#a5d6ff">${m}</span>`)
    // keywords
    .replace(/\b(function|const|let|var|return|if|else|for|while|class|import|export|default|from|async|await|try|catch|throw|new|this|of|in|def|print|True|False|None|and|or|not|elif|pass|yield|lambda|with|as|is)\b/g,
      m => `<span style="color:#ff7b72">${m}</span>`)
    // numbers
    .replace(/\b(\d+\.?\d*)\b/g, m => `<span style="color:#79c0ff">${m}</span>`)
    // comments
    .replace(/(\/\/[^\n]*|#[^\n]*)/g, m => `<span style="color:#8b949e;font-style:italic">${m}</span>`)
    // functions/calls
    .replace(/\b([a-zA-Z_]\w*)\s*(?=\()/g, (_, n) => `<span style="color:#d2a8ff">${n}</span>`)
    // builtins
    .replace(/\b(console|Math|Array|Object|String|Number|Boolean|JSON|parseInt|parseFloat|map|filter|reduce|forEach|log)\b/g,
      m => `<span style="color:#ffa657">${m}</span>`)
}

// ─── Code editor with line numbers ───────────────────────────────────────────
function CodeEditor({ value, onChange, language = 'javascript', readOnly = false }) {
  const taRef = useRef(null)
  const hlRef = useRef(null)
  const editorValue = typeof value === 'string' ? value : displayItemText(value)
  const lines = editorValue.split('\n')

  function syncScroll() {
    if (hlRef.current && taRef.current) {
      hlRef.current.scrollTop = taRef.current.scrollTop
      hlRef.current.scrollLeft = taRef.current.scrollLeft
    }
  }

  function handleKey(e) {
    if (e.key === 'Tab') {
      e.preventDefault()
      const ta = e.target
      const start = ta.selectionStart
      const end = ta.selectionEnd
      const next = value.slice(0, start) + '  ' + value.slice(end)
      onChange(next)
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = start + 2
      })
    }
  }

  return (
    <div style={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      {/* Line numbers */}
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: 48,
        background: '#0d1117', borderRight: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', flexDirection: 'column', paddingTop: 16, zIndex: 2,
        userSelect: 'none', pointerEvents: 'none', overflowY: 'hidden',
        fontFamily: mono, fontSize: 12, lineHeight: '21px', color: '#4a5568',
        textAlign: 'right', paddingRight: 10,
      }}>
        {lines.map((_, i) => <div key={i}>{i + 1}</div>)}
      </div>

      {/* Highlighted code (behind) */}
      <div
        ref={hlRef}
        aria-hidden="true"
        dangerouslySetInnerHTML={{ __html: highlight(value, language) }}
        style={{
          position: 'absolute', left: 48, right: 0, top: 0, bottom: 0,
          padding: '16px 16px 16px 16px',
          fontFamily: mono, fontSize: 13, lineHeight: '21px',
          whiteSpace: 'pre', overflow: 'hidden', pointerEvents: 'none',
          color: '#e2e8f0', zIndex: 1,
        }}
      />

      {/* Actual textarea (on top, transparent text) */}
      <textarea
        ref={taRef}
        value={editorValue}
        onChange={e => onChange(e.target.value)}
        onKeyDown={handleKey}
        onScroll={syncScroll}
        readOnly={readOnly}
        spellCheck={false}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        style={{
          position: 'absolute', left: 48, right: 0, top: 0, bottom: 0,
          padding: '16px 16px 16px 16px',
          fontFamily: mono, fontSize: 13, lineHeight: '21px',
          whiteSpace: 'pre', overflowY: 'auto', overflowX: 'auto',
          background: 'transparent', border: 'none', outline: 'none',
          resize: 'none', color: 'transparent', caretColor: '#0ef5c2',
          zIndex: 3, WebkitTextFillColor: 'transparent',
        }}
      />
    </div>
  )
}

// ─── Test case result badge ───────────────────────────────────────────────────
function TestBadge({ status }) {
  if (status === 'pass') return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#4ade80', fontSize: 12, fontWeight: 800 }}>
      <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
      PASS
    </span>
  )
  if (status === 'fail') return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#f87171', fontSize: 12, fontWeight: 800 }}>
      <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      FAIL
    </span>
  )
  return <span style={{ color: '#64748b', fontSize: 12, fontWeight: 700 }}>PENDING</span>
}

// ─── Skeleton loading ─────────────────────────────────────────────────────────
function Skeleton({ h = 16, w = '100%', r = 8, mb = 0 }) {
  return (
    <div style={{
      height: h, width: w, borderRadius: r, marginBottom: mb,
      background: 'linear-gradient(90deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.09) 50%, rgba(255,255,255,0.04) 100%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.5s ease-in-out infinite',
    }} />
  )
}

function formatObjectKey(key = '') {
  return String(key)
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function displayItemText(item, fallback = '') {
  if (typeof item === 'string') return item
  if (typeof item === 'number' || typeof item === 'boolean') return String(item)
  if (Array.isArray(item)) return item.map((entry) => displayItemText(entry)).filter(Boolean).join(', ')
  if (!item || typeof item !== 'object') return fallback

  const preferredKeys = ['label', 'name', 'dimension', 'title', 'prompt', 'text', 'description', 'summary', 'value', 'target', 'answer']
  for (const key of preferredKeys) {
    if (item[key] == null) continue
    const text = displayItemText(item[key])
    if (text) return text
  }

  const entries = Object.entries(item)
    .filter(([, value]) => value != null && value !== '')
    .slice(0, 4)
    .map(([key, value]) => `${formatObjectKey(key)}: ${displayItemText(value)}`)
    .filter((entry) => !entry.endsWith(': '))

  return entries.join('; ') || fallback
}

function toDisplayList(value) {
  if (Array.isArray(value)) return value.flatMap((item) => (
    Array.isArray(item) ? toDisplayList(item) : [item]
  )).filter(Boolean)

  if (typeof value === 'string' && value.trim()) {
    return value.split(/\n+/).map((item) => item.replace(/^[-*]\s*/, '').trim()).filter(Boolean)
  }

  if (value && typeof value === 'object') {
    const listKeys = ['items', 'requirements', 'successCriteria', 'criteria', 'examples', 'steps', 'goals', 'targets', 'hints', 'rubric', 'controls', 'styleControls']
    const expanded = []
    for (const key of listKeys) {
      if (value[key] == null) continue
      expanded.push(...toDisplayList(value[key]).map((item) => {
        const text = displayItemText(item)
        return key === 'items' || key === 'controls' || key === 'styleControls'
          ? text
          : `${formatObjectKey(key)}: ${text}`
      }))
    }
    const description = displayItemText(value.description || value.prompt || value.text || value.summary)
    return [description, ...expanded].filter(Boolean)
  }

  return []
}

function asArray(value, fallback = []) {
  return Array.isArray(value) ? value.filter(Boolean) : fallback
}

function asObject(value, fallback = {}) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : fallback
}

function toObjectList(value, fallback = []) {
  if (Array.isArray(value)) return value.filter(Boolean)
  if (!value) return fallback

  if (typeof value === 'string') {
    const list = toDisplayList(value)
    return list.length ? list : fallback
  }

  if (typeof value === 'object') {
    const listKeys = ['items', 'cards', 'targets', 'options', 'choices', 'controls', 'steps', 'rows', 'columns', 'artifacts', 'riskFactors']
    for (const key of listKeys) {
      if (Array.isArray(value[key])) return value[key].filter(Boolean)
    }
    const entries = Object.entries(value).filter(([, entry]) => entry != null && entry !== '')
    if (entries.length === 0) return fallback
    return entries.map(([key, entry]) => (
      entry && typeof entry === 'object' && !Array.isArray(entry)
        ? { id: entry.id || key, label: entry.label || entry.name || formatObjectKey(key), ...entry }
        : { id: key, label: formatObjectKey(key), value: entry, text: displayItemText(entry) }
    ))
  }

  return fallback
}

function normalizeChoice(item, index = 0, prefix = 'option') {
  const raw = item && typeof item === 'object' && !Array.isArray(item) ? item : {}
  const label = displayItemText(raw.label ?? raw.name ?? raw.title ?? raw.text ?? raw.description ?? item, `${formatObjectKey(prefix)} ${index + 1}`)
  const id = String(raw.id ?? raw.key ?? label ?? `${prefix}-${index}`)
  return {
    ...raw,
    id,
    label,
    text: displayItemText(raw.text ?? raw.prompt ?? raw.description ?? label, label),
    tradeoff: displayItemText(raw.tradeoff ?? raw.detail ?? raw.reason, ''),
  }
}

function normalizeChoices(value, fallback = []) {
  const list = toObjectList(value, fallback)
  return list.map((item, index) => normalizeChoice(item, index)).filter((item) => item.label)
}

function DetailList({ label, items, accent = '#0ef5c2' }) {
  const list = toDisplayList(items)
  if (list.length === 0) return null
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ color: '#64748b', fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', marginBottom: 10, textTransform: 'uppercase' }}>{label}</div>
      <ul style={{ margin: 0, padding: '0 0 0 16px', color: '#94a3b8', fontSize: 13, lineHeight: 1.8 }}>
        {list.map((item, i) => (
          <li key={i} style={{ paddingLeft: 2 }}>
            <span style={{ color: typeof item === 'string' ? '#cbd5e1' : accent }}>
              {displayItemText(item)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function ExampleList({ examples }) {
  const list = toObjectList(examples)
  if (list.length === 0) return null
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ color: '#64748b', fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', marginBottom: 10, textTransform: 'uppercase' }}>Examples</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {list.map((example, i) => (
          <div key={i} style={{
            background: '#0d1117',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 10,
            padding: '10px 12px',
            fontFamily: mono,
            fontSize: 12,
            color: '#94a3b8',
            lineHeight: 1.6,
          }}>
            {typeof example === 'string' ? example : (
              <>
                {example.input !== undefined && <div><span style={{ color: '#475569' }}>Input: </span><span style={{ color: '#a5d6ff' }}>{displayItemText(example.input)}</span></div>}
                {example.output !== undefined && <div><span style={{ color: '#475569' }}>Output: </span><span style={{ color: '#79c0ff' }}>{displayItemText(example.output)}</span></div>}
                {example.explanation && <div style={{ color: '#64748b', marginTop: 4 }}>{displayItemText(example.explanation)}</div>}
                {example.input === undefined && example.output === undefined && !example.explanation && displayItemText(example)}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function PanelTab({ active, children, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        padding: '11px 12px 10px',
        border: 'none',
        borderBottom: active ? '2px solid #0ef5c2' : '2px solid transparent',
        background: 'transparent',
        color: active ? '#f8fafc' : '#8792a2',
        fontFamily: font,
        fontSize: 13,
        fontWeight: 850,
        cursor: 'pointer',
        transition: 'color 0.15s ease, border-color 0.15s ease',
      }}
    >
      {children}
    </button>
  )
}

function CodeToolbarButton({ children }) {
  return (
    <button
      type="button"
      style={{
        width: 30,
        height: 30,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 8,
        border: '1px solid rgba(255,255,255,0.08)',
        background: 'rgba(255,255,255,0.04)',
        color: '#9ca3af',
        cursor: 'default',
      }}
    >
      {children}
    </button>
  )
}

function TestCaseCard({ tc, index, result }) {
  const status = result?.status || 'pending'
  return (
    <div style={{
      minWidth: 260,
      flex: '0 0 260px',
      background: status === 'pass' ? 'rgba(74,222,128,0.06)' : status === 'fail' ? 'rgba(248,113,113,0.06)' : 'rgba(255,255,255,0.035)',
      border: `1px solid ${status === 'pass' ? 'rgba(74,222,128,0.22)' : status === 'fail' ? 'rgba(248,113,113,0.22)' : 'rgba(255,255,255,0.08)'}`,
      borderRadius: 8,
      padding: '12px 13px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 9 }}>
        <span style={{ color: '#e5e7eb', fontSize: 12, fontWeight: 900 }}>Case {index + 1}</span>
        <TestBadge status={status} />
      </div>
      <div style={{ display: 'grid', gap: 5, fontFamily: mono, fontSize: 11, lineHeight: 1.5 }}>
        <div><span style={{ color: '#667085' }}>Input </span><span style={{ color: '#a5d6ff' }}>{String(tc.input ?? '') || 'empty'}</span></div>
        <div><span style={{ color: '#667085' }}>Expected </span><span style={{ color: '#79c0ff' }}>{String(tc.expected ?? '') || 'empty'}</span></div>
        {result?.actual !== undefined && (
          <div><span style={{ color: '#667085' }}>Got </span><span style={{ color: status === 'pass' ? '#4ade80' : '#f87171' }}>{String(result.actual) || 'empty'}</span></div>
        )}
      </div>
      {tc.explanation && (
        <p style={{ margin: '8px 0 0', color: '#8792a2', fontSize: 11, lineHeight: 1.45 }}>{displayItemText(tc.explanation)}</p>
      )}
    </div>
  )
}

// ─── CodeSandbox view ─────────────────────────────────────────────────────────
function CodeSandboxView({ task, response, setResponse, result, testResults }) {
  const [activeTab, setActiveTab] = useState('problem')
  const lang = task?.language || 'javascript'
  const languageMeta = getLanguageMeta(lang)
  const constraints = toDisplayList(task?.constraints)
  const requirements = toDisplayList(task?.requirements || task?.successCriteria)
  const instructions = toDisplayList(task?.instructions)
  const hints = toDisplayList(task?.hints || task?.bugHints)
  const cases = asArray(task?.testCases)
  const passedCount = testResults?.filter(r => r.status === 'pass').length || 0

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'minmax(360px, 0.92fr) minmax(440px, 1.08fr)',
      flex: 1,
      minHeight: 0,
      gap: 8,
      padding: 8,
      background: '#080c12',
    }}>
      {/* Left problem panel */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
        minHeight: 0,
        overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 8,
        background: '#171b21',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          background: '#20242a',
          padding: '0 12px',
          flexShrink: 0,
        }}>
          <PanelTab active={activeTab === 'problem'} onClick={() => setActiveTab('problem')}>
            <span style={{ color: '#38bdf8' }}>▣</span> Description
          </PanelTab>
          <PanelTab active={activeTab === 'hints'} onClick={() => setActiveTab('hints')}>
            <span style={{ color: '#facc15' }}>◌</span> Hints
          </PanelTab>
          <PanelTab active={activeTab === 'tests'} onClick={() => setActiveTab('tests')}>
            <span style={{ color: '#34d399' }}>▱</span> Tests
          </PanelTab>
        </div>

        <div style={{ padding: '24px 24px 30px', flex: 1, minHeight: 0, overflowY: 'auto' }}>
          {activeTab === 'problem' && (
            <div>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 18 }}>
                <span style={{
                  padding: '4px 10px',
                  borderRadius: 999,
                  background: 'rgba(250,204,21,0.10)',
                  border: '1px solid rgba(250,204,21,0.18)',
                  color: '#facc15',
                  fontSize: 11,
                  fontWeight: 900,
                }}>Practice</span>
                <span style={{
                  padding: '4px 10px',
                  borderRadius: 999,
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.09)',
                  color: '#cbd5e1',
                  fontSize: 11,
                  fontWeight: 800,
                }}>{languageMeta.label}</span>
                <span style={{ color: '#64748b', fontSize: 12, fontWeight: 750 }}>
                  {cases.length} test{cases.length === 1 ? '' : 's'}
                </span>
              </div>

              <h2 style={{
                margin: '0 0 18px',
                color: '#f8fafc',
                fontSize: 27,
                lineHeight: 1.16,
                letterSpacing: '-0.02em',
                fontWeight: 950,
              }}>
                {displayItemText(task?.title, 'Coding Practice')}
              </h2>

              <p style={{
                color: '#e5e7eb',
                fontSize: 15,
                lineHeight: 1.75,
                margin: '0 0 22px',
              }}>
                {displayItemText(task?.prompt, 'Build the requested solution from the instructions, then run the tests.')}
              </p>

              <DetailList label="Instructions" items={instructions} />
              <DetailList label="Requirements" items={requirements} accent="#a78bfa" />
              <ExampleList examples={task?.examples} />

              {task?.functionSignature && (
                <div style={{
                  background: '#0d1117', border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 10, padding: '12px 14px', marginBottom: 16,
                  fontFamily: mono, fontSize: 12, color: '#a5d6ff',
                }}>
                  <div style={{ color: '#64748b', fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', marginBottom: 6, textTransform: 'uppercase' }}>Signature</div>
                  {displayItemText(task.functionSignature)}
                </div>
              )}

              <DetailList label="Constraints" items={constraints} accent="#79c0ff" />

              {result && (
                <div style={{
                  marginTop: 20, padding: '14px 16px',
                  background: result.passed ? 'rgba(74,222,128,0.07)' : 'rgba(248,113,113,0.07)',
                  border: `1px solid ${result.passed ? 'rgba(74,222,128,0.22)' : 'rgba(248,113,113,0.22)'}`,
                  borderRadius: 12,
                }}>
                  <div style={{
                    fontSize: 12, fontWeight: 900, letterSpacing: '0.08em',
                    color: result.passed ? '#4ade80' : '#f87171', marginBottom: 8, textTransform: 'uppercase',
                  }}>
                    {result.passed ? '✓ All tests passed' : '✗ Some tests failed'}
                  </div>
                  <p style={{ color: '#cbd5e1', fontSize: 13, lineHeight: 1.6, margin: 0 }}>
                    {displayItemText(result.feedback)}
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'tests' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {cases.length === 0 ? (
                <p style={{ color: '#475569', fontSize: 13 }}>No test cases available.</p>
              ) : cases.map((tc, i) => {
                const status = testResults?.[i]?.status || 'pending'
                return (
                  <div key={i} style={{
                    background: status === 'pass' ? 'rgba(74,222,128,0.05)' : status === 'fail' ? 'rgba(248,113,113,0.05)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${status === 'pass' ? 'rgba(74,222,128,0.18)' : status === 'fail' ? 'rgba(248,113,113,0.18)' : 'rgba(255,255,255,0.07)'}`,
                    borderRadius: 10, padding: '12px 14px',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ color: '#94a3b8', fontSize: 12, fontWeight: 700 }}>Case {i + 1}</span>
                      <TestBadge status={status} />
                    </div>
                    <div style={{ fontFamily: mono, fontSize: 12, color: '#94a3b8', display: 'grid', gap: 3 }}>
                      <div><span style={{ color: '#475569' }}>Input: </span><span style={{ color: '#a5d6ff' }}>{String(tc.input ?? '')}</span></div>
                      <div><span style={{ color: '#475569' }}>Expected: </span><span style={{ color: '#79c0ff' }}>{String(tc.expected ?? '')}</span></div>
                      {testResults?.[i]?.actual !== undefined && (
                        <div><span style={{ color: '#475569' }}>Got: </span><span style={{ color: status === 'pass' ? '#4ade80' : '#f87171' }}>{String(testResults[i].actual)}</span></div>
                      )}
                    </div>
                    {tc.explanation && (
                      <div style={{ color: '#64748b', fontSize: 11, marginTop: 6, lineHeight: 1.5 }}>{displayItemText(tc.explanation)}</div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {activeTab === 'hints' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {hints.length === 0 ? (
                <p style={{ color: '#475569', fontSize: 13, lineHeight: 1.6 }}>
                  Try to solve it without hints first. If you are stuck, run your code and check the test output.
                </p>
              ) : hints.map((hint, i) => (
                <div key={i} style={{
                  background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.18)',
                  borderRadius: 10, padding: '12px 14px',
                }}>
                  <div style={{ color: '#a78bfa', fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>Hint {i + 1}</div>
                  <p style={{ color: '#cbd5e1', fontSize: 13, lineHeight: 1.6, margin: 0 }}>{displayItemText(hint)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right workbench */}
      <div style={{
        display: 'grid',
        gridTemplateRows: 'minmax(0, 1fr) 186px',
        minWidth: 0,
        minHeight: 0,
        gap: 8,
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          minHeight: 0,
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 8,
          overflow: 'hidden',
          background: '#11161d',
        }}>
        {/* Editor header */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0,
          background: '#20242a',
        }}>
          <span style={{ color: '#22c55e', fontWeight: 950, fontSize: 14 }}>{'</>'}</span>
          <span style={{ color: '#f8fafc', fontSize: 14, fontWeight: 900 }}>Code</span>
          <span style={{
            padding: '4px 10px',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 999,
            color: '#cbd5e1',
            fontSize: 12,
            fontWeight: 800,
          }}>{languageMeta.label}</span>
          <div style={{
            flex: 1, textAlign: 'center',
            color: '#697586', fontSize: 12, fontWeight: 700, fontFamily: mono,
          }}>
            solution.{languageMeta.ext || 'txt'}
          </div>
          <CodeToolbarButton>
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 7h16M4 12h10M4 17h16"/></svg>
          </CodeToolbarButton>
          <CodeToolbarButton>
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
          </CodeToolbarButton>
        </div>

        <div style={{
          flex: 1, minHeight: 0, background: '#11161d', position: 'relative', display: 'flex', flexDirection: 'column',
        }}>
          <CodeEditor value={response} onChange={setResponse} language={lang} />
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: 28,
          padding: '0 14px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          background: '#171b21',
          color: '#6b7280',
          fontSize: 11,
          fontFamily: mono,
        }}>
          <span>{response ? 'saved' : 'empty'}</span>
          <span>Ln {String(response || '').split('\n').length}, Col 1</span>
        </div>
        </div>

        <div style={{
          minHeight: 0,
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 8,
          background: '#171b21',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '10px 14px',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            background: '#20242a',
            flexShrink: 0,
          }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              color: '#f8fafc',
              fontSize: 13,
              fontWeight: 900,
            }}>
              <span style={{ color: '#22c55e' }}>▣</span> Testcase
            </span>
            <span style={{
              color: result ? (result.passed ? '#4ade80' : '#f87171') : '#8792a2',
              fontSize: 13,
              fontWeight: 850,
            }}>
              {result ? (result.passed ? 'Accepted' : 'Needs work') : 'Run code to see results'}
            </span>
            <span style={{ marginLeft: 'auto', color: '#697586', fontSize: 12, fontWeight: 800 }}>
              {testResults ? `${passedCount}/${testResults.length} passed` : `${cases.length} ready`}
            </span>
          </div>
          <div style={{
            flex: 1,
            minHeight: 0,
            overflowX: 'auto',
            overflowY: 'hidden',
            display: 'flex',
            gap: 10,
            padding: 12,
          }}>
            {cases.length === 0 ? (
              <div style={{ color: '#697586', fontSize: 13 }}>No test cases yet.</div>
            ) : cases.map((tc, i) => (
              <TestCaseCard key={i} tc={tc} index={i} result={testResults?.[i]} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Generic textarea task ────────────────────────────────────────────────────
function TextareaTask({ task, taskType, response, setResponse, result }) {
  const isDebate = ['SocraticDebate', 'AdversarialDebate', 'PolicyDebate', 'MockDebate'].includes(taskType)
  const isWriting = ['RubricFeedback', 'TimedPrompt', 'RewriteForClarity', 'CauseEffectEssay', 'PolicyBrief', 'ResearchCritique'].includes(taskType)
  const rubricItems = toDisplayList(task?.rubric)
  const steps = toDisplayList(task?.steps)
  const gaps = toDisplayList(result?.gaps)

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '24px 28px', display: 'flex', gap: 24, minHeight: 0 }}>
      {/* Problem description */}
      <div style={{ flex: '0 0 380px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {isDebate && task?.thesis && (
          <div style={{
            background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.22)',
            borderRadius: 14, padding: '16px 18px',
          }}>
            <div style={{ color: '#a78bfa', fontSize: 10, fontWeight: 900, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>Thesis</div>
            <p style={{ color: '#e2e8f0', fontSize: 14, lineHeight: 1.7, margin: 0 }}>{displayItemText(task.thesis)}</p>
          </div>
        )}

        <div style={{
          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 14, padding: '16px 18px',
        }}>
          <div style={{ color: '#0ef5c2', fontSize: 10, fontWeight: 900, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>Task</div>
          <p style={{ color: '#cbd5e1', fontSize: 14, lineHeight: 1.7, margin: 0 }}>
            {displayItemText(task?.problem || task?.writingPrompt || task?.scenario || task?.prompt, 'Complete the task.')}
          </p>
        </div>

        {steps.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ color: '#64748b', fontSize: 10, fontWeight: 900, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Steps</div>
            {steps.map((step, i) => (
              <div key={i} style={{
                display: 'flex', gap: 12, alignItems: 'flex-start',
                background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 10, padding: '10px 12px',
              }}>
                <div style={{
                  width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                  background: 'rgba(14,245,194,0.12)', border: '1px solid rgba(14,245,194,0.25)',
                  color: '#0ef5c2', fontSize: 12, fontWeight: 900,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>{i + 1}</div>
                <p style={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.6, margin: 0 }}>{displayItemText(step)}</p>
              </div>
            ))}
          </div>
        )}

        <DetailList label="Goals" items={task?.goals} />
        <DetailList label="Targets" items={task?.targets} accent="#79c0ff" />
        <DetailList label="Evidence Hints" items={task?.evidenceHints} accent="#a78bfa" />

        {isWriting && rubricItems.length > 0 && (
          <div>
            <div style={{ color: '#64748b', fontSize: 10, fontWeight: 900, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>Rubric</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {rubricItems.map((item, i) => {
                const label = displayItemText(item)
                return (
                <span key={`${label}-${i}`} style={{
                  padding: '5px 12px', background: 'rgba(14,245,194,0.07)',
                  border: '1px solid rgba(14,245,194,0.2)', borderRadius: 999,
                  color: '#7effd9', fontSize: 12, fontWeight: 800,
                }}>{label}</span>
                )
              })}
            </div>
          </div>
        )}

        {task?.opening && (
          <div style={{
            borderLeft: '3px solid #0ef5c2', paddingLeft: 14,
            color: '#a7f3d0', fontSize: 13, lineHeight: 1.7,
            fontStyle: 'italic',
          }}>
            {displayItemText(task.opening)}
          </div>
        )}
      </div>

      {/* Response area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
        <div style={{ color: '#475569', fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Your Response</div>
        <textarea
          value={response}
          onChange={e => setResponse(e.target.value)}
          placeholder="Write your answer here..."
          spellCheck={false}
          style={{
            flex: 1, minHeight: isWriting ? 320 : 220,
            background: '#0d1117', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 14, padding: '16px 18px',
            color: '#e2e8f0', fontFamily: font, fontSize: 14, lineHeight: 1.7,
            resize: 'none', outline: 'none',
            transition: 'border-color 0.15s',
          }}
          onFocus={e => e.target.style.borderColor = 'rgba(14,245,194,0.4)'}
          onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
        />

        {result && (
          <div style={{
            padding: '16px 18px',
            background: result.passed ? 'rgba(74,222,128,0.07)' : 'rgba(248,113,113,0.07)',
            border: `1px solid ${result.passed ? 'rgba(74,222,128,0.22)' : 'rgba(248,113,113,0.22)'}`,
            borderRadius: 14,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <div style={{
                width: 52, height: 52, borderRadius: '50%', flexShrink: 0,
                background: result.passed ? 'rgba(74,222,128,0.12)' : 'rgba(248,113,113,0.12)',
                border: `1px solid ${result.passed ? 'rgba(74,222,128,0.3)' : 'rgba(248,113,113,0.3)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, fontWeight: 900, color: result.passed ? '#4ade80' : '#f87171',
                fontFamily: mono,
              }}>{result.score ?? 0}</div>
              <div>
                <div style={{ fontWeight: 900, fontSize: 14, color: result.passed ? '#4ade80' : '#f87171' }}>
                  {result.passed ? 'Good work!' : 'Keep going'}
                </div>
                <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>
                  {result.score >= 90 ? 'Excellent' : result.score >= 70 ? 'Solid attempt' : 'Room to grow'}
                </div>
              </div>
            </div>
            <p style={{ color: '#cbd5e1', fontSize: 13, lineHeight: 1.65, margin: '0 0 10px' }}>{displayItemText(result.feedback)}</p>
            {gaps.length > 0 && (
              <ul style={{ margin: 0, padding: '0 0 0 16px', color: '#94a3b8', fontSize: 13, lineHeight: 1.8 }}>
                {gaps.map((g, i) => <li key={i}>{displayItemText(g)}</li>)}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function WorkspaceSection({ title, children, accent = '#7dd3fc' }) {
  return (
    <section style={{
      background: 'rgba(255,255,255,0.035)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 12,
      padding: 14,
      minWidth: 0,
    }}>
      <div style={{ color: accent, fontSize: 10, fontWeight: 950, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10 }}>
        {title}
      </div>
      {children}
    </section>
  )
}

function PillButton({ active, children, onClick, accent = '#7dd3fc' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        border: `1px solid ${active ? accent : 'rgba(255,255,255,0.10)'}`,
        background: active ? `${accent}22` : 'rgba(255,255,255,0.04)',
        color: active ? '#f8fafc' : '#cbd5e1',
        borderRadius: 999,
        padding: '8px 12px',
        fontFamily: font,
        fontSize: 12,
        fontWeight: 850,
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  )
}

function WorkspaceProofBox({ response, setResponse, result, placeholder = 'Write the proof of what you learned...' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ color: '#64748b', fontSize: 10, fontWeight: 900, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Proof note</div>
      <textarea
        value={response}
        onChange={(event) => setResponse(event.target.value)}
        placeholder={placeholder}
        style={{
          minHeight: 108,
          background: '#0d1117',
          border: '1px solid rgba(255,255,255,0.10)',
          borderRadius: 12,
          color: '#e2e8f0',
          padding: '13px 14px',
          fontFamily: font,
          fontSize: 13,
          lineHeight: 1.6,
          resize: 'vertical',
          outline: 'none',
        }}
      />
      {result && (
        <div style={{
          padding: '12px 14px',
          borderRadius: 12,
          background: result.passed ? 'rgba(74,222,128,0.07)' : 'rgba(248,113,113,0.07)',
          border: `1px solid ${result.passed ? 'rgba(74,222,128,0.22)' : 'rgba(248,113,113,0.22)'}`,
          color: '#cbd5e1',
          fontSize: 13,
          lineHeight: 1.55,
        }}>
          <strong style={{ color: result.passed ? '#4ade80' : '#f87171' }}>{result.score ?? 0}/100</strong>
          {' '}
          {displayItemText(result.feedback)}
        </div>
      )}
    </div>
  )
}

function WorkspaceLayout({ task, meta, taskType, accent, children, response, setResponse, result }) {
  const criteria = toDisplayList(task?.successCriteria)
  const proofRules = toDisplayList(task?.proofRules)
  const hints = toDisplayList(task?.hints)
  return (
    <div style={{
      flex: 1,
      minHeight: 0,
      overflow: 'auto',
      padding: 18,
      display: 'grid',
      gridTemplateColumns: 'minmax(280px, 360px) minmax(0, 1fr)',
      gap: 16,
      background: `radial-gradient(circle at 18% 0%, ${accent}18, transparent 34%), #070c14`,
    }}>
      <aside style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
        <WorkspaceSection title={`${meta?.label || 'Domain'} Mission`} accent={accent}>
          <h2 style={{ margin: '0 0 10px', color: '#f8fafc', fontSize: 23, lineHeight: 1.15, fontWeight: 950 }}>
            {displayItemText(task?.title, getDomainTaskLabel(taskType))}
          </h2>
          <p style={{ margin: 0, color: '#cbd5e1', fontSize: 13, lineHeight: 1.7 }}>
            {displayItemText(task?.mission || task?.prompt || task?.scenario, 'Complete the domain-specific practice workspace.')}
          </p>
        </WorkspaceSection>
        <WorkspaceSection title="Success Criteria" accent={accent}>
          <DetailList label="Must Show" items={criteria.length ? criteria : ['Correct domain move', 'Visible reasoning', 'Transfer explanation']} accent={accent} />
          <DetailList label="Proof Rules" items={proofRules} accent={accent} />
          <DetailList label="Hints" items={hints.slice(0, 3)} accent="#facc15" />
        </WorkspaceSection>
      </aside>
      <main style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {children}
        <WorkspaceProofBox response={response} setResponse={setResponse} result={result} />
      </main>
    </div>
  )
}

function MathWorkspace({ task, setResponse, accent }) {
  const slots = toDisplayList(task?.equationSlots || task?.proofBoard)
  const safeSlots = slots.length ? slots.map((item) => displayItemText(item)).filter(Boolean) : ['Setup', 'Transform', 'Solve', 'Check']
  const reasoningSteps = toDisplayList(task?.steps)
  const [active, setActive] = useState(safeSlots[0])
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      <WorkspaceSection title="Equation Builder" accent={accent}>
        <div style={{
          minHeight: 150,
          borderRadius: 12,
          background: '#0d1117',
          border: '1px solid rgba(255,255,255,0.08)',
          padding: 16,
          fontFamily: mono,
          color: '#dbeafe',
          display: 'flex',
          flexDirection: 'column',
          gap: 9,
        }}>
          {toDisplayList(task?.givens).length ? toDisplayList(task?.givens).map((given, index) => (
            <span key={`${displayItemText(given)}-${index}`} style={{ color: index === 1 ? '#a78bfa' : '#93c5fd' }}>{displayItemText(given)}</span>
          )) : ['Given', 'Relationship', 'Target'].map((given, index) => (
            <span key={`${given}-${index}`} style={{ color: index === 1 ? '#a78bfa' : '#93c5fd' }}>{given}</span>
          ))}
          <strong style={{ color: '#f8fafc', fontSize: 17 }}>unknown = known relationship</strong>
        </div>
      </WorkspaceSection>
      <WorkspaceSection title="Reasoning Steps" accent={accent}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {reasoningSteps.map((step, index) => (
            <button
              key={index}
              type="button"
              onClick={() => {
                setActive(displayItemText(step))
                setResponse(`Math proof step selected: ${displayItemText(step)}`)
              }}
              style={{
                textAlign: 'left',
                border: '1px solid rgba(255,255,255,0.09)',
                background: active === displayItemText(step) ? `${accent}20` : 'rgba(255,255,255,0.035)',
                color: '#e2e8f0',
                borderRadius: 10,
                padding: '10px 12px',
                fontFamily: font,
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              {index + 1}. {displayItemText(step)}
            </button>
          ))}
        </div>
      </WorkspaceSection>
      <WorkspaceSection title="Proof Board" accent={accent}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {safeSlots.map((slot) => (
            <PillButton key={slot} active={active === slot} accent={accent} onClick={() => {
              setActive(slot)
              setResponse(`Math proof board focus: ${slot}. I will justify this step and check the result.`)
            }}>{slot}</PillButton>
          ))}
        </div>
      </WorkspaceSection>
      <WorkspaceSection title="Final Check" accent={accent}>
        <p style={{ margin: 0, color: '#cbd5e1', fontSize: 13, lineHeight: 1.65 }}>
          Before submitting, state whether the answer is reasonable, whether units or graph behavior match, and which algebra move mattered most.
        </p>
      </WorkspaceSection>
    </div>
  )
}

function PhysicsWorkspace({ task, setResponse, accent }) {
  const controls = useMemo(() => {
    return toObjectList(task?.simulation?.controls).map((control, index) => {
      const raw = asObject(control)
      const id = String(raw.id || raw.label || `control-${index}`)
      const min = Number(raw.min ?? 0)
      const max = Number(raw.max ?? 100)
      const value = Number(raw.value ?? raw.default ?? min)
      return {
        id,
        label: displayItemText(raw.label || raw.name || id, `Control ${index + 1}`),
        min: Number.isFinite(min) ? min : 0,
        max: Number.isFinite(max) ? max : 100,
        step: Number(raw.step ?? 1) || 1,
        value: Number.isFinite(value) ? value : 0,
        unit: displayItemText(raw.unit, ''),
      }
    })
  }, [task?.simulation?.controls])
  const defaultValues = useMemo(() => Object.fromEntries(controls.map((control) => [control.id, control.value ?? control.min ?? 0])), [controls])
  const [values, setValues] = useState(defaultValues)
  const controlValue = (id) => values[id] ?? defaultValues[id] ?? 0
  const mass = Number(controlValue('mass') || 5)
  const angle = Number(controlValue('angle') || 30)
  const estimate = (mass * 9.8 * Math.sin((angle * Math.PI) / 180)).toFixed(1)
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 1fr) 320px', gap: 12 }}>
      <WorkspaceSection title="Vector Simulation" accent={accent}>
        <svg viewBox="0 0 420 230" style={{ width: '100%', minHeight: 230, borderRadius: 12, background: '#0d1117', border: '1px solid rgba(255,255,255,0.08)' }}>
          <defs>
            <marker id="physics-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
              <path d="M0,0 L8,4 L0,8 Z" fill={accent} />
            </marker>
          </defs>
          <line x1="55" y1="175" x2="360" y2="175" stroke="rgba(255,255,255,0.18)" strokeWidth="3" />
          <line x1="110" y1="174" x2="305" y2="70" stroke="rgba(255,255,255,0.38)" strokeWidth="4" />
          <rect x="190" y="93" width="58" height="38" rx="7" fill="rgba(125,211,252,0.12)" stroke={accent} transform="rotate(-28 219 112)" />
          <line x1="218" y1="112" x2="218" y2="177" stroke="#f87171" strokeWidth="4" markerEnd="url(#physics-arrow)" />
          <line x1="218" y1="112" x2="274" y2="82" stroke="#a78bfa" strokeWidth="4" markerEnd="url(#physics-arrow)" />
          <line x1="218" y1="112" x2="178" y2="133" stroke="#facc15" strokeWidth="4" markerEnd="url(#physics-arrow)" />
          <text x="224" y="168" fill="#f87171" fontSize="13">weight</text>
          <text x="278" y="78" fill="#a78bfa" fontSize="13">normal</text>
          <text x="124" y="142" fill="#facc15" fontSize="13">down-ramp</text>
          <text x="22" y="26" fill="#e2e8f0" fontSize="15">Estimated component: {estimate} N</text>
        </svg>
      </WorkspaceSection>
      <WorkspaceSection title="Controls" accent={accent}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {controls.map((control) => (
            <label key={control.id} style={{ display: 'grid', gap: 7, color: '#cbd5e1', fontSize: 12, fontWeight: 850 }}>
              <span>{control.label}: {controlValue(control.id)} {control.unit}</span>
              <input
                type="range"
                min={control.min}
                max={control.max}
                step={control.step || 1}
                value={controlValue(control.id)}
                onChange={(event) => {
                  const next = { ...values, [control.id]: event.target.value }
                  setValues(next)
                  setResponse(`Physics simulation adjusted: ${control.label} = ${event.target.value} ${control.unit}. Estimated down-ramp component is ${estimate} N.`)
                }}
              />
            </label>
          ))}
        </div>
      </WorkspaceSection>
      <WorkspaceSection title="Givens" accent={accent}>
        <DetailList label="Known Values" items={task?.givens} accent={accent} />
      </WorkspaceSection>
      <WorkspaceSection title="Targets" accent={accent}>
        <DetailList label="Prove With" items={task?.targets} accent={accent} />
      </WorkspaceSection>
    </div>
  )
}

function ChemistryWorkspace({ task, setResponse, accent }) {
  const sides = asObject(task?.sides)
  const reactants = toDisplayList(sides.reactants).map((molecule) => displayItemText(molecule)).filter(Boolean)
  const products = toDisplayList(sides.products).map((molecule) => displayItemText(molecule)).filter(Boolean)
  const molecules = [...reactants, ...products]
  const atomCounts = asObject(task?.atomCounts)
  const correctCoefficients = asObject(task?.correctCoefficients)
  const [coefficients, setCoefficients] = useState(() => Object.fromEntries(molecules.map((molecule) => [molecule, correctCoefficients[molecule] || 1])))
  const totals = useMemo(() => {
    const next = { reactants: {}, products: {} }
    Object.entries({ reactants, products }).forEach(([side, list]) => {
      list.forEach((molecule) => {
        const coefficient = Number(coefficients[molecule] || 1)
        Object.entries(asObject(atomCounts[molecule])).forEach(([atom, count]) => {
          next[side][atom] = (next[side][atom] || 0) + Number(count) * coefficient
        })
      })
    })
    return next
  }, [coefficients, reactants, products, atomCounts])
  const atoms = [...new Set([...Object.keys(totals.reactants), ...Object.keys(totals.products)])]
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <WorkspaceSection title="Reaction Balancer" accent={accent}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', fontFamily: mono, color: '#f8fafc', fontSize: 18 }}>
          {reactants.map((molecule, index) => (
            <span key={molecule} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              {index > 0 && <b>+</b>}
              <input
                type="number"
                min="1"
                max="9"
                value={coefficients[molecule] || 1}
                onChange={(event) => {
                  const next = { ...coefficients, [molecule]: Number(event.target.value) }
                  setCoefficients(next)
                  setResponse(`Chemistry coefficients adjusted for ${molecule}. I am checking atom conservation on both sides.`)
                }}
                style={{ width: 48, background: '#111827', color: accent, border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: 6 }}
              />
              {molecule}
            </span>
          ))}
          <strong style={{ color: accent }}>-&gt;</strong>
          {products.map((molecule, index) => (
            <span key={molecule} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              {index > 0 && <b>+</b>}
              <input
                type="number"
                min="1"
                max="9"
                value={coefficients[molecule] || 1}
                onChange={(event) => {
                  const next = { ...coefficients, [molecule]: Number(event.target.value) }
                  setCoefficients(next)
                  setResponse(`Chemistry coefficients adjusted for ${molecule}. I am checking atom conservation on both sides.`)
                }}
                style={{ width: 48, background: '#111827', color: accent, border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: 6 }}
              />
              {molecule}
            </span>
          ))}
        </div>
      </WorkspaceSection>
      <WorkspaceSection title="Atom Ledger" accent={accent}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 8 }}>
          {atoms.map((atom) => {
            const left = totals.reactants[atom] || 0
            const right = totals.products[atom] || 0
            const ok = left === right
            return (
              <div key={atom} style={{
                borderRadius: 10,
                padding: 12,
                background: ok ? 'rgba(74,222,128,0.08)' : 'rgba(248,113,113,0.08)',
                border: `1px solid ${ok ? 'rgba(74,222,128,0.24)' : 'rgba(248,113,113,0.24)'}`,
                color: '#e2e8f0',
                fontWeight: 900,
              }}>
                {atom}: {left} / {right}
              </div>
            )
          })}
        </div>
      </WorkspaceSection>
      <WorkspaceSection title="Reaction Reasoning" accent={accent}>
        <DetailList label="Cards" items={task?.reactionCards} accent={accent} />
      </WorkspaceSection>
    </div>
  )
}

function DiagramWorkspace({ task, setResponse, accent, variant = 'biology' }) {
  const cards = normalizeChoices(task?.cards || task?.labels || task?.anatomyLabels, ['Label'])
  const targets = toObjectList(task?.targets || task?.anatomyTargets, [{ id: 'target-1', label: 'Target', x: 50, y: 40 }])
    .map((target, index) => {
      const raw = asObject(target)
      return {
        id: String(raw.id || raw.label || `target-${index}`),
        label: displayItemText(raw.label || raw.name || raw.title || target, `Target ${index + 1}`),
        x: Number(raw.x ?? 50),
        y: Number(raw.y ?? 40),
      }
    })
  const [selected, setSelected] = useState(cards[0]?.id || '')
  const [placements, setPlacements] = useState({})
  const placed = new Set(Object.values(placements))
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1fr) 260px', gap: 12 }}>
      <WorkspaceSection title={variant === 'health' ? 'Body/System Diagram' : 'Process Diagram'} accent={accent}>
        <svg viewBox="0 0 100 80" style={{ width: '100%', minHeight: 340, borderRadius: 12, background: '#0d1117', border: '1px solid rgba(255,255,255,0.08)' }}>
          <path d="M14 44 C26 15 38 64 50 34 C62 8 73 56 88 28" fill="none" stroke={accent} strokeWidth="2.5" />
          <path d="M15 54 C29 68 39 28 53 48 C67 68 76 28 89 54" fill="none" stroke="rgba(167,139,250,0.75)" strokeWidth="2" />
          {targets.map((target) => {
            const card = cards.find((item) => item.id === placements[target.id])
            return (
              <g key={target.id} onClick={() => {
                if (!selected) return
                const next = { ...placements, [target.id]: selected }
                setPlacements(next)
                const label = cards.find((item) => item.id === selected)?.label || selected
                setResponse(`${variant} diagram label placed: ${label} on ${target.label}. I will explain why that label belongs there.`)
              }}>
                <circle cx={Number.isFinite(target.x) ? target.x : 50} cy={Number.isFinite(target.y) ? target.y : 40} r="6.5" fill={card ? `${accent}44` : 'rgba(255,255,255,0.08)'} stroke={card ? accent : 'rgba(255,255,255,0.28)'} strokeWidth="2" />
                <text x={(Number.isFinite(target.x) ? target.x : 50) + 8} y={(Number.isFinite(target.y) ? target.y : 40) + 3} fill="#e2e8f0" fontSize="4">{card?.label || target.label}</text>
              </g>
            )
          })}
        </svg>
      </WorkspaceSection>
      <WorkspaceSection title="Label Bank" accent={accent}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {cards.map((card) => (
            <PillButton key={card.id} active={selected === card.id} accent={accent} onClick={() => setSelected(card.id)}>
              {placed.has(card.id) ? 'Placed: ' : ''}{card.label}
            </PillButton>
          ))}
        </div>
        <DetailList label="Process Steps" items={task?.processSteps || task?.anatomyTargets} accent={accent} />
      </WorkspaceSection>
    </div>
  )
}

function LanguageWorkspace({ task, setResponse, accent }) {
  const options = normalizeChoices(task?.responseOptions || task?.wordTiles, ['I understand.'])
  const chatTurns = toObjectList(task?.chatTurns, [{ id: 'prompt', role: 'guide', speaker: task?.persona || 'Guide', text: task?.prompt || 'Choose a response.' }])
    .map((turn, index) => {
      const raw = asObject(turn)
      return {
        id: String(raw.id || raw.text || `turn-${index}`),
        role: raw.role || 'guide',
        speaker: displayItemText(raw.speaker || (raw.role === 'user' ? 'You' : task?.persona || 'Guide')),
        text: displayItemText(raw.text || raw.prompt || turn, 'Continue the conversation.'),
      }
    })
  const [reply, setReply] = useState(options[0]?.id || '')
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1fr) 300px', gap: 12 }}>
      <WorkspaceSection title="Conversation" accent={accent}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {chatTurns.map((turn) => (
            <div key={turn.id || turn.text} style={{
              alignSelf: turn.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '78%',
              background: turn.role === 'user' ? `${accent}22` : 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.09)',
              borderRadius: 14,
              padding: '10px 12px',
              color: '#e2e8f0',
              fontSize: 13,
              lineHeight: 1.55,
            }}>
              <strong style={{ display: 'block', color: accent, marginBottom: 4 }}>{turn.speaker || (turn.role === 'user' ? 'You' : task?.persona || 'Guide')}</strong>
              {turn.text}
            </div>
          ))}
          {reply && (
            <div style={{ alignSelf: 'flex-end', maxWidth: '78%', background: `${accent}25`, border: `1px solid ${accent}55`, borderRadius: 14, padding: '10px 12px', color: '#f8fafc', fontSize: 13 }}>
              {options.find((option) => option.id === reply)?.text || ''}
            </div>
          )}
        </div>
      </WorkspaceSection>
      <WorkspaceSection title="Response Builder" accent={accent}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {options.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => {
                setReply(option.id)
                setResponse(`Language response selected: ${option.text}`)
              }}
              style={{
                textAlign: 'left',
                borderRadius: 10,
                border: `1px solid ${reply === option.id ? accent : 'rgba(255,255,255,0.10)'}`,
                background: reply === option.id ? `${accent}20` : 'rgba(255,255,255,0.04)',
                color: '#e2e8f0',
                padding: '10px 12px',
                fontFamily: font,
                cursor: 'pointer',
              }}
            >
              {option.text}
            </button>
          ))}
        </div>
        <DetailList label="Goals" items={task?.goals} accent={accent} />
      </WorkspaceSection>
    </div>
  )
}

function SecurityWorkspace({ task, setResponse, accent }) {
  const [risks, setRisks] = useState([])
  const artifacts = toObjectList(task?.artifacts)
  const riskFactors = toDisplayList(task?.riskFactors).map((risk) => displayItemText(risk)).filter(Boolean)
  const toggle = (risk) => {
    const next = risks.includes(risk) ? risks.filter((item) => item !== risk) : [...risks, risk]
    setRisks(next)
    setResponse(`Security triage risks selected: ${next.join(', ')}. Mitigation should stay defensive and safe.`)
  }
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1.1fr) minmax(280px, 0.9fr)', gap: 12 }}>
      <WorkspaceSection title="Safe Sandbox Artifacts" accent={accent}>
        <div style={{ display: 'grid', gap: 10 }}>
          {artifacts.map((artifact, index) => (
            <div key={String(artifact.id || artifact.label || index)} style={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 12, padding: 12 }}>
              <strong style={{ color: '#f8fafc' }}>{displayItemText(artifact.label || artifact.title || artifact, `Artifact ${index + 1}`)}</strong>
              <p style={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.6, margin: '6px 0 0' }}>{displayItemText(artifact.detail || artifact.description || artifact.text)}</p>
            </div>
          ))}
        </div>
      </WorkspaceSection>
      <WorkspaceSection title="Risk Model" accent={accent}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
          {riskFactors.map((risk) => <PillButton key={risk} active={risks.includes(risk)} accent={accent} onClick={() => toggle(risk)}>{risk}</PillButton>)}
        </div>
        <DetailList label="Defensive Mitigations" items={task?.mitigations} accent="#4ade80" />
        <DetailList label="Network Path" items={task?.networkNodes} accent={accent} />
      </WorkspaceSection>
    </div>
  )
}

function DataWorkspace({ task, setResponse, accent, statistics = false }) {
  const [selected, setSelected] = useState('')
  const dataset = asObject(task?.dataset)
  const rowSource = asArray(dataset.rows)
  const derivedColumns = rowSource.find((row) => row && typeof row === 'object' && !Array.isArray(row))
    ? Object.keys(rowSource.find((row) => row && typeof row === 'object' && !Array.isArray(row))).slice(0, 6)
    : []
  const columns = toDisplayList(dataset.columns).map((column) => displayItemText(column)).filter(Boolean)
  const safeColumns = columns.length ? columns : derivedColumns
  const rows = rowSource.map((row) => {
    if (Array.isArray(row)) return row.map((cell) => displayItemText(cell))
    if (row && typeof row === 'object') {
      const keys = safeColumns.length ? safeColumns : Object.keys(row)
      return keys.map((key) => displayItemText(row[key]))
    }
    return [displayItemText(row)]
  })
  const distribution = asObject(task?.distribution)
  const modelChoices = normalizeChoices(statistics ? task?.choices : task?.models)
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <WorkspaceSection title={statistics ? 'Distribution / Simulation' : 'Dataset Explorer'} accent={accent}>
        {statistics ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {Object.entries(distribution).map(([key, value]) => (
              <div key={key} style={{ borderRadius: 12, padding: 14, background: '#0d1117', border: '1px solid rgba(255,255,255,0.09)' }}>
                <span style={{ color: '#64748b', fontSize: 11, fontWeight: 900, textTransform: 'uppercase' }}>{key}</span>
                <strong style={{ display: 'block', color: '#f8fafc', fontSize: 24 }}>{value}</strong>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', color: '#e2e8f0', fontSize: 13 }}>
              <thead>
                <tr>{safeColumns.map((column) => <th key={column} style={{ textAlign: 'left', color: accent, padding: 9, borderBottom: '1px solid rgba(255,255,255,0.10)' }}>{column}</th>)}</tr>
              </thead>
              <tbody>{rows.map((row, index) => (
                <tr key={index}>{row.map((cell, cellIndex) => <td key={`${index}-${cellIndex}`} style={{ padding: 9, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>{cell}</td>)}</tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </WorkspaceSection>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <WorkspaceSection title={statistics ? 'Hypothesis Choice' : 'Model Comparison'} accent={accent}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {modelChoices.map((item) => {
              const id = item.id
              const label = statistics
                ? item.label
                : `${item.label}${item.accuracy != null ? `: acc ${item.accuracy}%` : ''}${item.precision != null ? ` / precision ${item.precision}%` : ''}`
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setSelected(id)
                    setResponse(`${statistics ? 'Statistics test' : 'Model'} selected: ${label}. I will explain why this choice fits the evidence.`)
                  }}
                  style={{
                    textAlign: 'left',
                    borderRadius: 10,
                    border: `1px solid ${selected === id ? accent : 'rgba(255,255,255,0.10)'}`,
                    background: selected === id ? `${accent}20` : 'rgba(255,255,255,0.04)',
                    color: '#e2e8f0',
                    padding: '10px 12px',
                    fontFamily: font,
                    cursor: 'pointer',
                  }}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </WorkspaceSection>
        <WorkspaceSection title={statistics ? 'Interpretation Frames' : 'Confusion Matrix'} accent={accent}>
          <DetailList label={statistics ? 'Explain' : 'Tasks'} items={statistics ? task?.interpretationFrames : task?.tasks} accent={accent} />
          {!statistics && asObject(task?.confusionMatrix, null) && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {Object.entries(asObject(task?.confusionMatrix)).map(([key, value]) => <span key={key} style={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: 10, color: '#cbd5e1' }}>{key}: <strong style={{ color: accent }}>{displayItemText(value)}</strong></span>)}
            </div>
          )}
        </WorkspaceSection>
      </div>
    </div>
  )
}

function EngineeringWorkspace({ task, setResponse, accent }) {
  const [choice, setChoice] = useState('')
  const prototypeOptions = normalizeChoices(task?.prototypeOptions)
  const testBench = toObjectList(task?.testBench).map((test, index) => {
    const raw = asObject(test)
    const label = displayItemText(raw.label || raw.name || raw.title || test, `Test ${index + 1}`)
    const target = displayItemText(raw.target || raw.expected || raw.description || raw.value)
    return target ? `${label}: ${target}` : label
  })
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      <WorkspaceSection title="Design Constraints" accent={accent}>
        <DetailList label="Constraints" items={task?.constraints} accent={accent} />
      </WorkspaceSection>
      <WorkspaceSection title="Prototype Options" accent={accent}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {prototypeOptions.map((option) => (
            <button key={option.id} type="button" onClick={() => {
              setChoice(option.id)
              setResponse(`Prototype selected: ${option.label}. Tradeoff: ${option.tradeoff}`)
            }} style={{
              textAlign: 'left',
              borderRadius: 10,
              border: `1px solid ${choice === option.id ? accent : 'rgba(255,255,255,0.10)'}`,
              background: choice === option.id ? `${accent}20` : 'rgba(255,255,255,0.04)',
              color: '#e2e8f0',
              padding: '10px 12px',
              fontFamily: font,
              cursor: 'pointer',
            }}>
              <strong>{option.label}</strong>
              <span style={{ display: 'block', color: '#94a3b8', marginTop: 4 }}>{option.tradeoff}</span>
            </button>
          ))}
        </div>
      </WorkspaceSection>
      <WorkspaceSection title="Test Bench" accent={accent}>
        <DetailList label="Tests" items={testBench} accent={accent} />
      </WorkspaceSection>
      <WorkspaceSection title="Design Review" accent={accent}>
        <p style={{ color: '#cbd5e1', fontSize: 13, lineHeight: 1.65, margin: 0 }}>Choose a prototype, identify one failing test risk, and propose the next iteration.</p>
      </WorkspaceSection>
    </div>
  )
}

function DecisionWorkspace({ task, setResponse, accent }) {
  const [choice, setChoice] = useState('')
  const dashboardItems = toObjectList(task?.dashboard).map((item, index) => {
    const raw = asObject(item)
    return {
      label: displayItemText(raw.label || raw.name || raw.title || item, `Metric ${index + 1}`),
      value: displayItemText(raw.value || raw.detail || raw.description || raw.score, ''),
    }
  })
  const decisionOptions = normalizeChoices(task?.decisionOptions)
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <WorkspaceSection title="Decision Dashboard" accent={accent}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
          {dashboardItems.map((item) => (
            <div key={item.label} style={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 12, padding: 12 }}>
              <span style={{ color: '#64748b', fontSize: 10, fontWeight: 950, textTransform: 'uppercase' }}>{item.label}</span>
              <strong style={{ color: '#f8fafc', display: 'block', marginTop: 6 }}>{item.value || 'Review'}</strong>
            </div>
          ))}
        </div>
      </WorkspaceSection>
      <WorkspaceSection title="Tradeoff Choice" accent={accent}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {decisionOptions.map((option) => (
            <PillButton key={option.id} active={choice === option.id} accent={accent} onClick={() => {
              setChoice(option.id)
              setResponse(`Decision selected: ${option.label}. Tradeoff: ${option.tradeoff}`)
            }}>{option.label}</PillButton>
          ))}
        </div>
        <DetailList label="Evidence Cards" items={task?.evidenceCards} accent={accent} />
      </WorkspaceSection>
    </div>
  )
}

function EvidenceWorkspace({ task, setResponse, accent }) {
  const [selected, setSelected] = useState([])
  const cards = toDisplayList(task?.evidenceCards)
  const toggle = (card) => {
    const id = card?.id || card?.label || displayItemText(card)
    const next = selected.includes(id) ? selected.filter((item) => item !== id) : [...selected, id]
    setSelected(next)
    setResponse(`Evidence selected: ${next.join(', ')}. I will connect these to a claim and avoid overclaiming.`)
  }
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1fr) 320px', gap: 12 }}>
      <WorkspaceSection title="Source / Case" accent={accent}>
        <p style={{ margin: 0, color: '#cbd5e1', fontSize: 15, lineHeight: 1.8 }}>{displayItemText(task?.passage || task?.caseBrief || task?.scenario || task?.prompt, 'Review the source and choose evidence.')}</p>
        <DetailList label="Frames" items={task?.promptFrames} accent={accent} />
      </WorkspaceSection>
      <WorkspaceSection title="Evidence Board" accent={accent}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {cards.map((card) => {
            const id = card?.id || card?.label || displayItemText(card)
            return <PillButton key={id} active={selected.includes(id)} accent={accent} onClick={() => toggle(card)}>{displayItemText(card)}</PillButton>
          })}
        </div>
        <DetailList label="Columns" items={task?.boardColumns} accent={accent} />
      </WorkspaceSection>
    </div>
  )
}

function CreativeWorkspace({ task, setResponse, accent }) {
  const [controls, setControls] = useState({})
  const rawControls = toDisplayList(task?.styleControls || task?.critiqueRubric)
  const items = (rawControls.length ? rawControls : ['contrast', 'hierarchy', 'clarity'])
    .map((item) => displayItemText(item))
    .filter(Boolean)
    .slice(0, 6)
  const canvasBrief = displayItemText(task?.canvasBrief || task?.title || task?.prompt, 'Creative brief')
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1fr) 300px', gap: 12 }}>
      <WorkspaceSection title="Canvas" accent={accent}>
        <div style={{ minHeight: 280, borderRadius: 12, background: `linear-gradient(135deg, ${accent}22, rgba(255,255,255,0.04))`, border: '1px solid rgba(255,255,255,0.10)', padding: 18, display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 14 }}>
          <div style={{ borderRadius: 8, background: '#0d1117', border: `2px solid ${accent}`, minHeight: 140 }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <strong style={{ color: '#f8fafc', fontSize: 22 }}>{canvasBrief}</strong>
            <span style={{ height: 12, width: '70%', background: 'rgba(255,255,255,0.20)', borderRadius: 999 }} />
            <span style={{ height: 12, width: '45%', background: `${accent}88`, borderRadius: 999 }} />
          </div>
        </div>
      </WorkspaceSection>
      <WorkspaceSection title="Studio Controls" accent={accent}>
        <div style={{ display: 'grid', gap: 10 }}>
          {items.map((item) => (
            <label key={item} style={{ display: 'grid', gap: 6, color: '#cbd5e1', fontSize: 12, fontWeight: 850 }}>
              {item}: {controls[item] || 50}
              <input type="range" min="0" max="100" value={controls[item] || 50} onChange={(event) => {
                const next = { ...controls, [item]: event.target.value }
                setControls(next)
                setResponse(`Creative control adjusted: ${item} to ${event.target.value}. I will explain the design intent.`)
              }} />
            </label>
          ))}
        </div>
      </WorkspaceSection>
    </div>
  )
}

function MusicWorkspace({ task, setResponse, accent }) {
  const [beats, setBeats] = useState([])
  const toggle = (beat) => {
    const next = beats.includes(beat) ? beats.filter((item) => item !== beat) : [...beats, beat]
    setBeats(next)
    setResponse(`Music pattern selected beats: ${next.join(', ')}. I will explain the rhythm or notation pattern.`)
  }
  const rhythm = toDisplayList(task?.rhythmPattern)
    .map((beat) => displayItemText(beat))
    .filter(Boolean)
  const safeRhythm = rhythm.length ? rhythm : ['1', '2', '3', '4']
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <WorkspaceSection title="Rhythm Grid" accent={accent}>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${safeRhythm.length}, 1fr)`, gap: 8 }}>
          {safeRhythm.map((beat) => (
            <button key={beat} type="button" onClick={() => toggle(beat)} style={{
              minHeight: 78,
              borderRadius: 10,
              border: `1px solid ${beats.includes(beat) ? accent : 'rgba(255,255,255,0.10)'}`,
              background: beats.includes(beat) ? `${accent}28` : '#0d1117',
              color: '#f8fafc',
              fontFamily: mono,
              fontSize: 18,
              fontWeight: 950,
              cursor: 'pointer',
            }}>{beat}</button>
          ))}
        </div>
      </WorkspaceSection>
      <WorkspaceSection title="Notation / Listening" accent={accent}>
        <DetailList label="Notes" items={task?.notation} accent={accent} />
        <DetailList label="Listening Choices" items={task?.listeningChoices} accent={accent} />
      </WorkspaceSection>
    </div>
  )
}

function CommunicationWorkspace({ task, setResponse, accent }) {
  const [slot, setSlot] = useState('')
  const outlineSlots = toDisplayList(task?.outlineSlots)
    .map((item) => displayItemText(item))
    .filter(Boolean)
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      <WorkspaceSection title="Teleprompter Outline" accent={accent}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {outlineSlots.map((item) => (
            <button key={item} type="button" onClick={() => {
              setSlot(item)
              setResponse(`Communication outline focus: ${item}. I will draft that part for the audience.`)
            }} style={{
              textAlign: 'left',
              borderRadius: 10,
              border: `1px solid ${slot === item ? accent : 'rgba(255,255,255,0.10)'}`,
              background: slot === item ? `${accent}20` : 'rgba(255,255,255,0.04)',
              color: '#e2e8f0',
              padding: '10px 12px',
              fontFamily: font,
              cursor: 'pointer',
            }}>{item}</button>
          ))}
        </div>
      </WorkspaceSection>
      <WorkspaceSection title="Audience Simulator" accent={accent}>
        <DetailList label={displayItemText(task?.audience, 'Audience')} items={task?.audienceQuestions} accent={accent} />
        <DetailList label="Delivery Rubric" items={task?.deliveryRubric} accent={accent} />
      </WorkspaceSection>
    </div>
  )
}

function SpecializedWorkspace({ task, taskType, domain, response, setResponse, result }) {
  const meta = getDomainMetadata(domain)
  const workspaceType = task?.workspaceType || meta?.workspaceType || getDomainWorkspaceType(domain)
  if (workspaceType === 'textarea') {
    return <TextareaTask task={task} taskType={taskType} response={response} setResponse={setResponse} result={result} />
  }
  const accentByWorkspace = {
    coding: '#0ef5c2',
    math: '#60a5fa',
    physics: '#a78bfa',
    chemistry: '#fb7185',
    biology: '#4ade80',
    language: '#f97316',
    security: '#38bdf8',
    data_ai: '#22d3ee',
    statistics: '#60a5fa',
    engineering: '#f59e0b',
    technology: '#38bdf8',
    economics: '#34d399',
    finance: '#facc15',
    business: '#a78bfa',
    reading: '#fbbf24',
    history: '#facc15',
    civics: '#818cf8',
    psychology: '#38bdf8',
    logic: '#c084fc',
    health: '#fb7185',
    environment: '#4ade80',
    creative: '#f472b6',
    writing: '#fbbf24',
    music: '#c084fc',
    communication: '#7dd3fc',
  }
  const accent = accentByWorkspace[workspaceType] || '#7dd3fc'
  let body = null
  if (workspaceType === 'math') body = <MathWorkspace task={task} setResponse={setResponse} accent={accent} />
  else if (workspaceType === 'physics') body = <PhysicsWorkspace task={task} setResponse={setResponse} accent={accent} />
  else if (workspaceType === 'chemistry') body = <ChemistryWorkspace task={task} setResponse={setResponse} accent={accent} />
  else if (workspaceType === 'biology') body = <DiagramWorkspace task={task} setResponse={setResponse} accent={accent} />
  else if (workspaceType === 'health') body = <DiagramWorkspace task={task} setResponse={setResponse} accent={accent} variant="health" />
  else if (workspaceType === 'language') body = <LanguageWorkspace task={task} setResponse={setResponse} accent={accent} />
  else if (workspaceType === 'security') body = <SecurityWorkspace task={task} setResponse={setResponse} accent={accent} />
  else if (workspaceType === 'data_ai') body = <DataWorkspace task={task} setResponse={setResponse} accent={accent} />
  else if (workspaceType === 'statistics') body = <DataWorkspace task={task} setResponse={setResponse} accent={accent} statistics />
  else if (workspaceType === 'engineering' || workspaceType === 'technology') body = <EngineeringWorkspace task={task} setResponse={setResponse} accent={accent} />
  else if (workspaceType === 'economics' || workspaceType === 'finance' || workspaceType === 'business') body = <DecisionWorkspace task={task} setResponse={setResponse} accent={accent} />
  else if (workspaceType === 'creative' || workspaceType === 'writing') body = <CreativeWorkspace task={task} setResponse={setResponse} accent={accent} />
  else if (workspaceType === 'music') body = <MusicWorkspace task={task} setResponse={setResponse} accent={accent} />
  else if (workspaceType === 'communication') body = <CommunicationWorkspace task={task} setResponse={setResponse} accent={accent} />
  else if (workspaceType === 'environment') body = <PhysicsWorkspace task={{ ...task, givens: task?.ecosystem, targets: task?.impactCards }} setResponse={setResponse} accent={accent} />
  else body = <EvidenceWorkspace task={task} setResponse={setResponse} accent={accent} />

  return (
    <WorkspaceLayout task={task} meta={meta} taskType={taskType} accent={accent} response={response} setResponse={setResponse} result={result}>
      {body}
    </WorkspaceLayout>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function DomainTaskBase({
  taskType,
  domain,
  topic,
  goal,
  taskTitle,
  lessonContent,
  userLevel,
  initialTask = null,
  initialResponse = '',
  staticPreview = false,
  onComplete,
}) {
  const resolvedDomain = normalizeDomain(domain, 'CS_CODING')
  const meta = getDomainMetadata(resolvedDomain)
  const requestedIsCode = CODE_TASK_TYPE_SET.has(taskType)

  const [task, setTask] = useState(null)
  const [response, setResponse] = useState('')
  const [result, setResult] = useState(null)
  const [testResults, setTestResults] = useState(null)
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState(null)

  const requestBody = useMemo(() => ({
    taskType, domain: resolvedDomain, topic, goal, taskTitle, lessonContent, userLevel,
  }), [taskType, resolvedDomain, topic, goal, taskTitle, lessonContent, userLevel])

  useEffect(() => {
    let cancelled = false
    async function loadTask() {
      setLoading(true)
      setResult(null)
      setTestResults(null)
      setError(null)

      if (initialTask) {
        const generatedIsCode = CODE_TASK_TYPE_SET.has(initialTask?.taskType || taskType)
        setTask(initialTask)
        setResponse(initialResponse || (generatedIsCode ? (initialTask?.starterCode || initialTask?.starter || '// Write your solution here\n') : ''))
        setLoading(false)
        return
      }

      try {
        const res = await fetch('/api/domain-task', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...requestBody, phase: 'generate' }),
        })
        const data = await res.json()
        if (!cancelled) {
          setTask(data)
          const generatedIsCode = CODE_TASK_TYPE_SET.has(data?.taskType || taskType)
          setResponse(generatedIsCode ? (data?.starterCode || data?.starter || '// Write your solution here\n') : '')
        }
      } catch {
        if (!cancelled) {
          const fallback = { title: topic || taskType, prompt: `Work through ${topic || 'this task'}.` }
          setTask(fallback)
          if (requestedIsCode) setResponse('// Write your solution here\n')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    loadTask()
    return () => { cancelled = true }
  }, [requestBody, taskType, topic, requestedIsCode, initialTask, initialResponse])

  async function runCode() {
    if (!response.trim()) return
    setRunning(true)
    setResult(null)
    setTestResults(null)

    // Client-side test runner for JS
    const currentIsCode = CODE_TASK_TYPE_SET.has(task?.taskType || taskType)
    if (currentIsCode && (task?.language === 'javascript' || !task?.language)) {
      const cases = asArray(task?.testCases)
      const localResults = cases.map(tc => {
        try {
          const fn = new Function(`${response}\nreturn typeof solve !== 'undefined' ? solve : typeof solution !== 'undefined' ? solution : typeof main !== 'undefined' ? main : null`)()
          if (typeof fn !== 'function') return { status: 'fail', actual: 'No function found (name it solve, solution, or main)' }
          const actual = fn(tc.input)
          const pass = String(actual) === String(tc.expected) || actual === tc.expected
          return { status: pass ? 'pass' : 'fail', actual }
        } catch (err) {
          return { status: 'fail', actual: `Error: ${err.message}` }
        }
      })
      setTestResults(localResults)

      if (staticPreview) {
        const allPass = localResults.length > 0 && localResults.every(r => r.status === 'pass')
        setResult({
          score: allPass ? 100 : Math.round((localResults.filter(r => r.status === 'pass').length / Math.max(localResults.length, 1)) * 100),
          passed: allPass,
          feedback: allPass ? 'Preview result: all visible tests passed.' : 'Preview result: revise the starter code until the visible tests pass.',
        })
        setRunning(false)
        return
      }

      // Also send to server for full evaluation
      try {
        const res = await fetch('/api/domain-task', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...requestBody, phase: 'evaluate', userResponse: response }),
        })
        const data = await res.json()
        setResult(data)
      } catch {
        const allPass = localResults.every(r => r.status === 'pass')
        setResult({
          score: allPass ? 100 : Math.round((localResults.filter(r => r.status === 'pass').length / Math.max(localResults.length, 1)) * 100),
          passed: allPass,
          feedback: allPass ? 'All test cases passed. Great work!' : 'Some test cases failed. Check the Tests tab and revise your solution.',
        })
      }
    } else {
      if (staticPreview) {
        setResult({
          score: 84,
          passed: true,
          feedback: 'Preview feedback: this response area would send the learner work for domain-specific AI evaluation in the live flow.',
          strengths: ['The UI captures a domain-specific response.'],
          gaps: ['Live mode would return targeted feedback after submission.'],
        })
        setRunning(false)
        return
      }

      // Non-JS or non-code: send to server
      try {
        const res = await fetch('/api/domain-task', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...requestBody, phase: 'evaluate', userResponse: response }),
        })
        const data = await res.json()
        setResult(data)
      } catch {
        setResult({ score: 70, passed: true, feedback: 'Good attempt. Add more specificity and try again.' })
      }
    }
    setRunning(false)
  }

  const effectiveTaskType = task?.taskType || taskType
  const isCode = CODE_TASK_TYPE_SET.has(effectiveTaskType)
  const allPassed = testResults && testResults.length > 0 && testResults.every(r => r.status === 'pass')

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      background: '#070c14', fontFamily: font, color: '#f1f5f9',
      overflow: 'hidden',
    }}>
      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0 }
          100% { background-position: 200% 0 }
        }
        @keyframes spin {
          to { transform: rotate(360deg) }
        }
        @keyframes fadeUp {
          from { opacity:0; transform:translateY(8px) }
          to   { opacity:1; transform:translateY(0) }
        }
      `}</style>

      {/* Top bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        background: 'rgba(255,255,255,0.02)', flexShrink: 0,
      }}>
        {/* Task type badge */}
        <div style={{
          padding: '4px 12px', borderRadius: 999,
          background: 'rgba(14,245,194,0.1)', border: '1px solid rgba(14,245,194,0.25)',
          color: '#0ef5c2', fontSize: 10, fontWeight: 900, letterSpacing: '0.12em', textTransform: 'uppercase',
          flexShrink: 0,
        }}>
          {getDomainTaskLabel(effectiveTaskType)}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontWeight: 800, fontSize: 15, color: '#f1f5f9',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {loading ? 'Building your challenge...' : displayItemText(task?.title || topic, 'Challenge')}
          </div>
        </div>

        <div style={{
          padding: '4px 12px', borderRadius: 999,
          background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
          color: '#94a3b8', fontSize: 11, fontWeight: 700, flexShrink: 0,
        }}>
          {meta?.label || resolvedDomain}
        </div>
      </div>

      {/* Main area */}
      {loading ? (
        <div style={{ flex: 1, display: 'flex', gap: 0 }}>
          <div style={{ width: 340, padding: '24px 20px', borderRight: '1px solid rgba(255,255,255,0.07)', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Skeleton h={12} w="60%" r={6} />
            <Skeleton h={80} r={12} />
            <Skeleton h={14} w="40%" r={6} />
            <Skeleton h={56} r={10} />
            <Skeleton h={56} r={10} />
            <Skeleton h={56} r={10} />
          </div>
          <div style={{ flex: 1, padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Skeleton h={36} r={8} />
            <div style={{ flex: 1, background: '#0d1117', borderRadius: 14, padding: '14px 14px 14px 48px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[80, 60, 95, 50, 75, 55, 70, 45].map((w, i) => <Skeleton key={i} h={12} w={`${w}%`} r={4} />)}
            </div>
          </div>
        </div>
      ) : isCode ? (
        <CodeSandboxView
          task={task || {}}
          response={response}
          setResponse={setResponse}
          result={result}
          testResults={testResults}
        />
      ) : (
        <SpecializedWorkspace
          task={task || {}}
          domain={resolvedDomain}
          taskType={taskType}
          response={response}
          setResponse={setResponse}
          result={result}
        />
      )}

      {/* Bottom action bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px',
        borderTop: '1px solid rgba(255,255,255,0.07)',
        background: 'rgba(255,255,255,0.02)', flexShrink: 0,
      }}>
        {isCode && testResults && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            color: allPassed ? '#4ade80' : '#f87171',
            fontSize: 13, fontWeight: 700, flexShrink: 0,
          }}>
            {allPassed
              ? <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
              : <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            }
            {testResults.filter(r => r.status === 'pass').length}/{testResults.length} tests
          </div>
        )}

        <div style={{ flex: 1 }} />

        {error && (
          <div style={{ color: '#f87171', fontSize: 12, fontWeight: 600 }}>{error}</div>
        )}

        <button
          onClick={runCode}
          disabled={running || loading || !response.trim()}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 22px', borderRadius: 12, border: 'none',
            background: running ? 'rgba(14,245,194,0.15)' : 'linear-gradient(135deg, #0ef5c2, #00c9a7)',
            color: running ? '#0ef5c2' : '#071510',
            fontWeight: 900, fontSize: 13, fontFamily: font,
            cursor: running || loading || !response.trim() ? 'not-allowed' : 'pointer',
            opacity: !response.trim() ? 0.4 : 1,
            transition: 'all 0.15s', boxShadow: running ? 'none' : '0 4px 16px rgba(14,245,194,0.25)',
          }}
        >
          {running ? (
            <>
              <svg style={{ animation: 'spin 0.8s linear infinite' }} width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <circle cx="12" cy="12" r="10" strokeOpacity="0.25"/>
                <path d="M12 2a10 10 0 0 1 10 10"/>
              </svg>
              Running…
            </>
          ) : (
            <>
              <svg width={14} height={14} viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>
              {isCode ? 'Run Code' : 'Submit'}
            </>
          )}
        </button>

        {(result?.passed || allPassed) && onComplete && (
          <button
            onClick={() => onComplete(result || { score: 100, passed: true })}
            style={{
              padding: '10px 22px', borderRadius: 12, border: 'none',
              background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
              color: '#f1f5f9', fontWeight: 800, fontSize: 13, fontFamily: font,
              cursor: 'pointer', transition: 'all 0.15s',
            }}
            onMouseEnter={e => e.target.style.background = 'rgba(255,255,255,0.14)'}
            onMouseLeave={e => e.target.style.background = 'rgba(255,255,255,0.08)'}
          >
            Mark Complete →
          </button>
        )}
      </div>
    </div>
  )
}
