// LessonView — iOS Liquid Glass Edition
'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

// ─── Syntax Highlighter ───────────────────────────────────────────────────────
const LANG_KEYWORDS = {
  python:     /\b(def|class|if|elif|else|for|while|return|import|from|as|with|try|except|finally|raise|pass|break|continue|lambda|yield|async|await|not|and|or|in|is|None|True|False|print|len|range|type|int|str|float|list|dict|set|tuple|bool|input|open|super|self)\b/g,
  javascript: /\b(function|const|let|var|if|else|for|while|do|return|import|export|from|class|new|this|typeof|instanceof|try|catch|finally|throw|async|await|of|in|true|false|null|undefined|switch|case|break|continue|default|void|delete|yield|console)\b/g,
  typescript: /\b(function|const|let|var|if|else|for|while|do|return|import|export|from|class|new|this|typeof|instanceof|try|catch|finally|throw|async|await|of|in|true|false|null|undefined|switch|case|break|continue|interface|type|enum|implements|extends|public|private|protected|readonly|abstract|void|any|never|unknown|string|number|boolean)\b/g,
  sql:        /\b(SELECT|FROM|WHERE|JOIN|LEFT|RIGHT|INNER|OUTER|ON|INSERT|INTO|VALUES|UPDATE|SET|DELETE|CREATE|TABLE|DROP|ALTER|INDEX|GROUP|BY|ORDER|HAVING|LIMIT|OFFSET|DISTINCT|AS|AND|OR|NOT|NULL|IS|IN|LIKE|BETWEEN|EXISTS|UNION|ALL|COUNT|SUM|AVG|MAX|MIN)\b/g,
  bash:       /\b(echo|cd|ls|mkdir|rm|cp|mv|cat|grep|sed|awk|chmod|sudo|export|source|if|then|else|fi|for|do|done|while|function|return|exit|read|set|unset|alias|curl|git|npm|pip|python)\b/g,
}

function tokenize(code, language) {
  const lang = (language || 'python').toLowerCase()
    .replace(/^js$/, 'javascript').replace(/^ts$/, 'typescript')
  return code.split('\n').map((line, li) => {
    const parts = []
    // Comments take priority
    const commentMarker = (lang === 'python' || lang === 'bash') ? '#' : '//'
    const commentIdx = line.indexOf(commentMarker)
    const codePart   = commentIdx !== -1 ? line.slice(0, commentIdx) : line
    const commentPart= commentIdx !== -1 ? line.slice(commentIdx) : ''
    parts.push(...tokenizeLine(codePart, lang))
    if (commentPart) parts.push({ type: 'comment', text: commentPart })
    return { lineNum: li + 1, parts }
  })
}

function tokenizeLine(line, lang) {
  if (!line) return [{ type: 'plain', text: '' }]
  const stringRe = /("""[\s\S]*?"""|'''[\s\S]*?'''|`[^`]*`|"[^"\\]*(?:\\.[^"\\]*)*"|'[^'\\]*(?:\\.[^'\\]*)*')/g
  const stringMatches = [...line.matchAll(stringRe)]
  if (stringMatches.length) {
    const parts = []; let cursor = 0
    for (const m of stringMatches) {
      if (m.index > cursor) parts.push(...keywordAndNumberTokens(line.slice(cursor, m.index), lang))
      parts.push({ type: 'string', text: m[0] })
      cursor = m.index + m[0].length
    }
    if (cursor < line.length) parts.push(...keywordAndNumberTokens(line.slice(cursor), lang))
    return parts
  }
  return keywordAndNumberTokens(line, lang)
}

function keywordAndNumberTokens(text, lang) {
  if (!text) return []
  const kwRe = LANG_KEYWORDS[lang]
  if (!kwRe) return numberTokens(text)
  kwRe.lastIndex = 0
  const parts = []; let cursor = 0; let m
  while ((m = kwRe.exec(text)) !== null) {
    if (m.index > cursor) parts.push(...numberTokens(text.slice(cursor, m.index)))
    parts.push({ type: 'keyword', text: m[0] })
    cursor = m.index + m[0].length
  }
  if (cursor < text.length) parts.push(...numberTokens(text.slice(cursor)))
  return parts
}

function numberTokens(text) {
  if (!text) return []
  const numRe = /\b(\d+\.?\d*)\b/g
  const parts = []; let cursor = 0; let m
  while ((m = numRe.exec(text)) !== null) {
    if (m.index > cursor) parts.push({ type: 'plain', text: text.slice(cursor, m.index) })
    parts.push({ type: 'number', text: m[0] })
    cursor = m.index + m[0].length
  }
  if (cursor < text.length) parts.push({ type: 'plain', text: text.slice(cursor) })
  return parts
}

const TOKEN_COLORS = {
  keyword: '#818CF8',
  string:  '#FBBF24',
  number:  '#00d4ff',
  comment: '#4B5563',
  plain:   '#CBD5E1',
}

function CodeBlock({ language, code, caption }) {
  const [copied, setCopied] = useState(false)
  const tokenLines = useMemo(() => tokenize(code || '', language), [code, language])

  function handleCopy() {
    if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(code || '').then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 1800)
      }).catch(() => {})
    }
  }

  return (
    <div style={{
      margin: '18px 0',
      borderRadius: 16,
      overflow: 'hidden',
      border: '1px solid rgba(129,140,248,0.25)',
      background: '#0a0a14',
      boxShadow: 'inset 0 1px 0 rgba(129,140,248,0.12), 0 8px 28px rgba(0,0,0,0.35)',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 14px',
        background: 'rgba(129,140,248,0.07)',
        borderBottom: '1px solid rgba(129,140,248,0.12)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'flex', gap: 5 }}>
            {['#FF453A', '#FBBF24', '#34D399'].map((c, i) => (
              <div key={i} style={{ width: 10, height: 10, borderRadius: '50%', background: c, opacity: 0.65 }} />
            ))}
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#818CF8', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
            {language || 'code'}
          </span>
        </div>
        <button onClick={handleCopy} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          fontSize: 11, fontWeight: 700,
          color: copied ? '#0ef5c2' : '#4B5563',
          padding: '3px 8px', borderRadius: 6,
          transition: 'color 0.18s',
          fontFamily: "inherit",
        }}>
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>

      {/* Code */}
      <div style={{ overflowX: 'auto', padding: '12px 0 14px' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', tableLayout: 'auto' }}>
          <tbody>
            {tokenLines.map((line, li) => (
              <tr key={li}>
                <td style={{
                  padding: '1px 16px 1px 16px', textAlign: 'right',
                  userSelect: 'none', fontSize: 12, color: '#2D3748', verticalAlign: 'top',
                  width: 1, whiteSpace: 'nowrap',
                  fontFamily: "'JetBrains Mono','Fira Code',Menlo,monospace",
                  lineHeight: 1.7,
                }}>
                  {line.lineNum}
                </td>
                <td style={{
                  padding: '1px 20px 1px 8px', whiteSpace: 'pre',
                  fontFamily: "'JetBrains Mono','Fira Code',Menlo,monospace",
                  fontSize: 13.5, lineHeight: 1.7,
                }}>
                  {line.parts.map((part, pi) => (
                    <span key={pi} style={{ color: TOKEN_COLORS[part.type] || TOKEN_COLORS.plain }}>
                      {part.text}
                    </span>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {caption && (
        <div style={{
          padding: '7px 14px', borderTop: '1px solid rgba(255,255,255,0.05)',
          fontSize: 12, color: '#4B5563', fontStyle: 'italic',
        }}>
          {caption}
        </div>
      )}
    </div>
  )
}

// ─── Diagram Renderer ────────────────────────────────────────────────────────
const colorMap = {
  teal:  { bg: 'rgba(14,245,194,0.10)', border: '#0ef5c2', text: '#0ef5c2' },
  amber: { bg: 'rgba(251,191,36,0.10)', border: '#fbbf24', text: '#fbbf24' },
  blue:  { bg: 'rgba(0,212,255,0.10)',  border: '#00d4ff', text: '#00d4ff' },
  red:   { bg: 'rgba(255,69,58,0.10)',  border: '#ff453a', text: '#ff453a' },
  gray:  { bg: 'rgba(142,142,147,0.10)', border: '#636366', text: '#8e8e93' },
}

function DiagramView({ diagram }) {
  if (!diagram || diagram.type === 'none') return null
  const nodes = diagram.nodes || []
  const connections = diagram.connections || []

  if (!nodes.length) {
    return (
      <div style={{ margin: '20px 0', padding: '20px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, textAlign: 'center', color: '#636366', fontSize: 14 }}>
        Visual diagram unavailable for this concept
      </div>
    )
  }

  if (diagram.type === 'comparison') {
    const left  = nodes.filter((_, i) => i % 2 === 0)
    const right = nodes.filter((_, i) => i % 2 === 1)
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, margin: '20px 0' }}>
        {[left, right].map((col, ci) => (
          <div key={ci} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {col.map((node, ni) => {
              const c = colorMap[node.color] || colorMap.teal
              return (
                <div key={ni} style={{ padding: '12px 16px', background: c.bg, border: `1px solid ${c.border}40`, borderRadius: 14, color: c.text, fontSize: 14, fontWeight: 600, textAlign: 'center', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', boxShadow: `inset 0 1px 0 ${c.border}30` }}>
                  {node.label}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0, margin: '20px 0' }}>
      {nodes.map((node, i) => {
        const c    = colorMap[node.color] || colorMap.teal
        const conn = connections.find(cn => cn.from === i)
        return (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ padding: '14px 26px', background: c.bg, border: `1.5px solid ${c.border}55`, borderRadius: 16, color: c.text, fontSize: 14, fontWeight: 700, textAlign: 'center', minWidth: 160, maxWidth: 280, backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', boxShadow: `inset 0 1px 0 ${c.border}35, 0 8px 20px rgba(0,0,0,0.16)` }}>
              {node.label}
            </div>
            {conn && i < nodes.length - 1 && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '4px 0' }}>
                <div style={{ width: 2, height: 16, background: 'rgba(255,255,255,0.10)' }} />
                {conn.label && <span style={{ fontSize: 11, color: '#636366', fontWeight: 600, margin: '2px 0', letterSpacing: '0.3px' }}>{conn.label}</span>}
                <div style={{ width: 2, height: 8, background: 'rgba(255,255,255,0.10)' }} />
                <div style={{ width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: '6px solid rgba(255,255,255,0.10)' }} />
              </div>
            )}
            {!conn && i < nodes.length - 1 && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '4px 0' }}>
                <div style={{ width: 2, height: 20, background: 'rgba(255,255,255,0.10)' }} />
                <div style={{ width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: '6px solid rgba(255,255,255,0.10)' }} />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Quiz Component ──────────────────────────────────────────────────────────
function QuizView({ quiz, onComplete, onWrongAnswer, onCorrectAnswer, comboCount = 0 }) {
  const [selected, setSelected] = useState(null)
  const [revealed, setRevealed] = useState(false)
  const [showVignette, setShowVignette] = useState(false)

  if (!quiz || !Array.isArray(quiz.options) || quiz.options.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0' }}>
        <p style={{ color: '#636366', marginBottom: 20, fontSize: 15 }}>Quiz unavailable for this lesson.</p>
        {onComplete && <button onClick={onComplete} style={{ padding: '12px 28px', background: 'linear-gradient(135deg,#0ef5c2,#00d4ff)', border: 'none', borderRadius: 14, color: '#06060f', fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>Continue</button>}
      </div>
    )
  }

  const handleSelect = (idx) => {
    if (revealed) return
    setSelected(idx)
    setRevealed(true)
    const correct = idx === quiz.correctIndex
    if (correct) {
      if (onCorrectAnswer) onCorrectAnswer()
      if (onComplete) setTimeout(() => onComplete(), 1500)
    } else {
      // Wrong answer: flash vignette + notify parent for heart deduction
      setShowVignette(true)
      setTimeout(() => setShowVignette(false), 400)
      if (onWrongAnswer) onWrongAnswer()
    }
  }

  return (
    <>
    {showVignette && (
      <div style={{ position: 'fixed', inset: 0, zIndex: 9800, background: 'rgba(255,69,58,0.12)', pointerEvents: 'none', animation: 'redVignette 0.4s ease both' }} />
    )}
    <div style={{ animation: 'fadeIn 0.4s cubic-bezier(0.16,1,0.3,1)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
        <div style={{ width: 32, height: 32, borderRadius: '26%', background: 'rgba(0,212,255,0.12)', border: '1px solid rgba(0,212,255,0.28)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'inset 0 1px 0 rgba(0,212,255,0.25)' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00d4ff" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        </div>
        <span style={{ color: '#00d4ff', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.2px' }}>Check Your Understanding</span>
        {comboCount >= 2 && (
          <div style={{
            marginLeft: 'auto', padding: '4px 12px',
            background: comboCount >= 5 ? 'rgba(255,215,0,0.15)' : 'rgba(14,245,194,0.10)',
            border: `1px solid ${comboCount >= 5 ? 'rgba(255,215,0,0.35)' : 'rgba(14,245,194,0.25)'}`,
            borderRadius: 9999, fontSize: 12, fontWeight: 800,
            color: comboCount >= 5 ? '#FFD700' : '#0ef5c2',
            animation: 'comboPopIn 0.3s cubic-bezier(0.34,1.56,0.64,1)',
          }}>
            🎯 {comboCount}x Combo!
          </div>
        )}
      </div>

      <p style={{ color: '#f5f5f7', fontSize: 17, fontWeight: 700, lineHeight: 1.45, marginBottom: 20 }}>{quiz.question}</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {quiz.options.map((opt, i) => {
          const isCorrect  = i === quiz.correctIndex
          const isSelected = i === selected
          let bg = 'rgba(0,0,0,0.25)', border = 'rgba(255,255,255,0.10)', color = '#8e8e93'
          if (revealed) {
            if (isCorrect)      { bg = 'rgba(14,245,194,0.10)'; border = 'rgba(14,245,194,0.35)'; color = '#0ef5c2' }
            else if (isSelected){ bg = 'rgba(255,69,58,0.10)';  border = 'rgba(255,69,58,0.35)';  color = '#ff6961' }
          } else if (isSelected){ bg = 'rgba(14,245,194,0.07)'; border = 'rgba(14,245,194,0.32)'; color = '#f5f5f7' }

          return (
            <button key={i} onClick={() => handleSelect(i)} style={{ padding: '14px 18px', background: bg, border: `1.5px solid ${border}`, borderRadius: 16, color, fontSize: 15, fontWeight: 600, textAlign: 'left', cursor: revealed ? 'default' : 'pointer', fontFamily: "'DM Sans', sans-serif", transition: 'all 0.2s cubic-bezier(0.16,1,0.3,1)', display: 'flex', alignItems: 'center', gap: 12, backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', boxShadow: revealed && isCorrect ? 'inset 0 1px 0 rgba(14,245,194,0.22), 0 0 20px rgba(14,245,194,0.08)' : 'inset 0 1px 0 rgba(255,255,255,0.06)' }}>
              <div style={{ width: 30, height: 30, borderRadius: '26%', flexShrink: 0, background: revealed && isCorrect ? 'linear-gradient(135deg, #0ef5c2, #00d4ff)' : revealed && isSelected ? '#ff453a' : 'transparent', border: `2px solid ${revealed && isCorrect ? 'transparent' : revealed && isSelected ? 'transparent' : 'rgba(255,255,255,0.14)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: revealed && (isCorrect || isSelected) ? '#06060f' : '#636366', fontSize: 12, fontWeight: 800, boxShadow: revealed && isCorrect ? '0 0 14px rgba(14,245,194,0.35), inset 0 1px 0 rgba(255,255,255,0.45)' : 'inset 0 1px 0 rgba(255,255,255,0.08)' }}>
                {revealed && isCorrect ? '✓' : revealed && isSelected ? '✗' : String.fromCharCode(65 + i)}
              </div>
              {opt}
            </button>
          )
        })}
      </div>

      {revealed && quiz.explanation && (
        <div style={{ marginTop: 16, padding: '14px 18px', background: selected === quiz.correctIndex ? 'rgba(14,245,194,0.07)' : 'rgba(255,69,58,0.07)', border: `1px solid ${selected === quiz.correctIndex ? 'rgba(14,245,194,0.24)' : 'rgba(255,69,58,0.24)'}`, borderRadius: 16, backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', boxShadow: `inset 0 1px 0 ${selected === quiz.correctIndex ? 'rgba(14,245,194,0.18)' : 'rgba(255,69,58,0.18)'}` }}>
          <p style={{ color: '#8e8e93', fontSize: 14, lineHeight: 1.65 }}>
            <span style={{ fontWeight: 700, color: selected === quiz.correctIndex ? '#0ef5c2' : '#ff6961' }}>
              {selected === quiz.correctIndex ? 'Correct! ' : 'Not quite. '}
            </span>
            {quiz.explanation}
          </p>
        </div>
      )}
    </div>
    </>
  )
}


// ─── Main Lesson Viewer ──────────────────────────────────────────────────────
export default function LessonViewer({ concept, taskTitle, goal, knowledge, lessonKey, presetLesson = null, aiMode = 'hint', onClose, onComplete, onHeartLost }) {
  const [loading, setLoading]               = useState(true)
  const [error, setError]                   = useState('')
  const [slides, setSlides]                 = useState([])
  const [quiz, setQuiz]                     = useState(null)
  const [current, setCurrent]               = useState(0)
  const [showQuiz, setShowQuiz]             = useState(false)
  const [assistantOpen, setAssistantOpen]   = useState(false)
  const [assistantInput, setAssistantInput] = useState('')
  const [assistantLoading, setAssistantLoading] = useState(false)
  const [assistantMessages, setAssistantMessages] = useState([{
    role: 'assistant',
    text: 'I can help with this slide. Ask me for a simpler explanation, examples, or quick practice ideas.',
    tips: [], links: [],
  }])

  const cacheKey = useMemo(() => {
    const fallbackKey = `${goal || 'goal'}::${concept || 'concept'}::${taskTitle || 'task'}`
    return `pathai.lesson.v1::${lessonKey || fallbackKey}`
  }, [goal, concept, taskTitle, lessonKey])

  // Stabilize knowledge reference to prevent unnecessary re-fetches
  const knowledgeKey = useMemo(() => JSON.stringify(knowledge), [knowledge])

  useEffect(() => {
    async function load() {
      startTimeRef.current = Date.now()
      setLoading(true); setError(''); setShowQuiz(false); setCurrent(0)
      if (presetLesson && Array.isArray(presetLesson.slides) && presetLesson.slides.length > 0) {
        setSlides(presetLesson.slides)
        setQuiz(presetLesson.quiz || null)
        setLoading(false)
        return
      }
      if (typeof window !== 'undefined') {
        try {
          const cachedRaw = window.localStorage.getItem(cacheKey)
          if (cachedRaw) {
            const cached = JSON.parse(cachedRaw)
            if (Array.isArray(cached?.slides) && cached.slides.length > 0) {
              setSlides(cached.slides); setQuiz(cached.quiz || null); setLoading(false); return
            }
          }
        } catch (_) {}
      }
      try {
        const lessonKnowledge = knowledgeKey ? JSON.parse(knowledgeKey) : null
        const res = await fetch('/api/lesson', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ concept, taskTitle, goal, knowledge: lessonKnowledge }) })
        const data = await res.json()
        if (data.slides) setSlides(data.slides)
        if (data.quiz)   setQuiz(data.quiz)
        if (typeof window !== 'undefined' && Array.isArray(data?.slides) && data.slides.length > 0) {
          window.localStorage.setItem(cacheKey, JSON.stringify({ slides: data.slides, quiz: data.quiz || null, cachedAt: Date.now() }))
        }
      } catch (e) { setError('Failed to load lesson') }
      setLoading(false)
    }
    load()
  }, [concept, taskTitle, goal, knowledgeKey, cacheKey, presetLesson])

  const totalSlides = slides.length
  const isLastSlide = current === totalSlides - 1

  const [quizPassed, setQuizPassed] = useState(false)
  const [comboCount, setComboCount] = useState(0)
  const [comboMax, setComboMax] = useState(0)
  const [assistantUsageCount, setAssistantUsageCount] = useState(0)
  const startTimeRef = useRef(null)

  const handleNext = () => {
    if (isLastSlide) {
      if (quiz && !showQuiz) setShowQuiz(true)
      else if (showQuiz && !quizPassed) return // block until quiz is answered correctly
      else if (onComplete) {
        const completionTimeSec = startTimeRef.current
          ? Math.round((Date.now() - startTimeRef.current) / 1000)
          : 0
        onComplete({
          completionTimeSec,
          assistantUsageCount,
          comboMax,
          quizPerfect: Boolean(quiz && comboMax > 0),
        })
      }
    } else { setCurrent(c => c + 1) }
  }
  const handleBack = () => {
    if (showQuiz) setShowQuiz(false)
    else if (current > 0) setCurrent(c => c - 1)
  }

  const slide   = slides[current]
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 980)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  async function handleAskAssistant() {
    const question = assistantInput.trim()
    if (!question || assistantLoading) return
    setAssistantInput('')
    setAssistantMessages((prev) => prev.concat({ role: 'user', text: question }))
    setAssistantLoading(true)
    try {
      setAssistantUsageCount((count) => count + 1)
      const res = await fetch('/api/lesson-assistant', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question, concept, goal, mode: aiMode, slide: slide ? { title: slide.title, content: slide.content } : null }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Assistant failed')
      setAssistantMessages((prev) => prev.concat({ role: 'assistant', text: data?.answer || 'No answer.', tips: Array.isArray(data?.tips) ? data.tips : [], links: Array.isArray(data?.links) ? data.links : [] }))
    } catch (_) {
      setAssistantMessages((prev) => prev.concat({ role: 'assistant', text: 'I ran into a temporary issue. Please try again.', tips: [], links: [] }))
    } finally { setAssistantLoading(false) }
  }

  const slideTypeIcon = { intro: '📋', concept: '💡', diagram: '📊', example: '🔍', practice: '🛠️', summary: '✅' }

  return (
    <>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideLeft { from { opacity: 0; transform: translateX(28px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        @keyframes comboPopIn { 0% { transform: scale(0.6); opacity: 0; } 70% { transform: scale(1.15); } 100% { transform: scale(1); opacity: 1; } }
        @keyframes redVignette { 0% { opacity: 0; } 20% { opacity: 1; } 100% { opacity: 0; } }
        @keyframes comboBurst { 0% { transform: scale(0.8); opacity: 0; } 50% { transform: scale(1.2); opacity: 1; } 100% { transform: scale(1); opacity: 1; } }
      `}</style>

      <div className="overlay-slide-up" style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'linear-gradient(180deg, #06060f 0%, #080814 100%)',
        fontFamily: "'DM Sans', -apple-system, 'SF Pro Display', system-ui, sans-serif",
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
        WebkitFontSmoothing: 'antialiased',
      }}>

        {/* ── Top bar ── */}
        <div style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(6,6,15,0.88)', backdropFilter: 'blur(28px) saturate(200%)', WebkitBackdropFilter: 'blur(28px) saturate(200%)', boxShadow: 'inset 0 -1px 0 rgba(255,255,255,0.04)' }}>
          {/* Close */}
          <button onClick={onClose} className="interactive-icon" style={{ width: 36, height: 36, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#8e8e93', transition: 'all 0.18s', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = '#f5f5f7' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = '#8e8e93' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>

          {/* Progress dots */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {slides.map((_, i) => (
              <div key={i} style={{ width: i === current ? 22 : 8, height: 8, borderRadius: 9999, background: i < current ? '#0ef5c2' : i === current ? 'linear-gradient(90deg, #0ef5c2, #00d4ff)' : 'rgba(255,255,255,0.10)', transition: 'all 0.35s cubic-bezier(0.16,1,0.3,1)', boxShadow: i === current ? '0 0 10px rgba(14,245,194,0.45)' : 'none' }} />
            ))}
            {quiz && <div style={{ width: showQuiz ? 22 : 8, height: 8, borderRadius: 9999, background: showQuiz ? 'linear-gradient(90deg, #00d4ff, #0087e8)' : 'rgba(255,255,255,0.10)', transition: 'all 0.35s cubic-bezier(0.16,1,0.3,1)' }} />}
          </div>

          {/* AI assistant toggle */}
          <button onClick={() => setAssistantOpen((v) => !v)} className="interactive-icon"
            style={{ width: 36, height: 36, background: assistantOpen ? 'rgba(14,245,194,0.12)' : 'rgba(255,255,255,0.07)', border: `1px solid ${assistantOpen ? 'rgba(14,245,194,0.35)' : 'rgba(255,255,255,0.10)'}`, color: assistantOpen ? '#0ef5c2' : '#8e8e93', borderRadius: 10, display: 'grid', placeItems: 'center', cursor: 'pointer', fontSize: 17, transition: 'all 0.2s', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', boxShadow: assistantOpen ? 'inset 0 1px 0 rgba(14,245,194,0.25)' : 'inset 0 1px 0 rgba(255,255,255,0.08)' }}
          >
            ✦
          </button>
        </div>

        {/* ── Content ── */}
        <div style={{ flex: 1, overflow: 'hidden', padding: '0 20px', display: 'flex', gap: 16 }}>
          <div style={{ flex: 1, overflow: 'auto' }}>
            <div style={{ maxWidth: 680, margin: '0 auto', padding: '20px 0 130px' }}>

              {loading ? (
                <div style={{ textAlign: 'center', paddingTop: 80 }}>
                  <div style={{ width: 44, height: 44, border: '3px solid rgba(255,255,255,0.06)', borderTopColor: '#0ef5c2', borderRadius: '50%', animation: 'spin 0.65s linear infinite', margin: '0 auto 22px', boxShadow: '0 0 20px rgba(14,245,194,0.12)' }} />
                  <p style={{ color: '#8e8e93', fontSize: 14 }}>Generating your lesson...</p>
                  <p style={{ color: '#3a3a3c', fontSize: 12, marginTop: 6 }}>Building slides with diagrams and examples</p>
                </div>
              ) : error ? (
                <div style={{ textAlign: 'center', paddingTop: 80 }}>
                  <p style={{ color: '#ff6961', marginBottom: 16 }}>{error}</p>
                  <button onClick={onClose} style={{ padding: '10px 20px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, color: '#8e8e93', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>Go back</button>
                </div>
              ) : showQuiz ? (
                <QuizView
                  quiz={quiz}
                  comboCount={comboCount}
                  onComplete={() => {
                    setQuizPassed(true)
                    if (onComplete) {
                      const completionTimeSec = startTimeRef.current
                        ? Math.round((Date.now() - startTimeRef.current) / 1000)
                        : 0
                      onComplete({
                        completionTimeSec,
                        assistantUsageCount,
                        comboMax: Math.max(comboMax, 1),
                        quizPerfect: true,
                        quizScore: 100,
                      })
                    }
                  }}
                  onWrongAnswer={() => { setComboCount(0); if (onHeartLost) onHeartLost() }}
                  onCorrectAnswer={() => { setComboCount(c => { const next = c + 1; setComboMax(m => Math.max(m, next)); return next }) }}
                />
              ) : slide ? (
                <div key={slide.id} style={{ animation: 'slideLeft 0.32s cubic-bezier(0.16,1,0.3,1)' }}>
                  {/* Slide type badge */}
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '5px 14px', marginBottom: 18, background: 'rgba(14,245,194,0.08)', border: '1px solid rgba(14,245,194,0.20)', borderRadius: 9999, fontSize: 11, fontWeight: 700, color: '#0ef5c2', textTransform: 'uppercase', letterSpacing: '1px', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', boxShadow: 'inset 0 1px 0 rgba(14,245,194,0.20)' }}>
                    {slideTypeIcon[slide.type] || '📄'} {slide.type}
                  </div>

                  {/* Title */}
                  <h1 style={{ fontSize: 26, fontWeight: 800, color: '#f5f5f7', letterSpacing: '-0.6px', lineHeight: 1.25, marginBottom: 22 }}>
                    {slide.title}
                  </h1>

                  <DiagramView diagram={slide.diagram} />

                  {/* Content */}
                  <div style={{ color: '#8e8e93', fontSize: 16, lineHeight: 1.78, whiteSpace: 'pre-wrap' }}>
                    {slide.content?.split('\n\n').map((para, i) => (
                      <p key={i} style={{ marginBottom: 16 }}>{para}</p>
                    ))}
                  </div>

                  {/* Code blocks */}
                  {Array.isArray(slide.codeBlocks) && slide.codeBlocks.length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      {slide.codeBlocks.map((cb, i) => (
                        <CodeBlock key={i} language={cb.language} code={cb.code} caption={cb.caption} />
                      ))}
                    </div>
                  )}

                  {/* Key takeaway */}
                  {slide.keyTakeaway && (
                    <div style={{ marginTop: 24, padding: '16px 20px', background: 'rgba(14,245,194,0.06)', border: '1px solid rgba(14,245,194,0.20)', borderRadius: 18, display: 'flex', alignItems: 'flex-start', gap: 12, backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', boxShadow: 'inset 0 1px 0 rgba(14,245,194,0.18)' }}>
                      <div style={{ width: 30, height: 30, borderRadius: '26%', background: 'rgba(14,245,194,0.12)', border: '1px solid rgba(14,245,194,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: 'inset 0 1px 0 rgba(14,245,194,0.22)' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0ef5c2" strokeWidth="2.5" strokeLinecap="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                      </div>
                      <p style={{ color: '#0ef5c2', fontSize: 14, fontWeight: 600, lineHeight: 1.55 }}>{slide.keyTakeaway}</p>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </div>

          {/* ── Desktop assistant panel ── */}
          {assistantOpen && !isMobile && (
            <aside style={{ width: 340, flexShrink: 0, height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', margin: '16px 0', background: 'linear-gradient(145deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.04) 40%, rgba(110,170,255,0.06) 100%)', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 22, backdropFilter: 'blur(32px) saturate(200%)', WebkitBackdropFilter: 'blur(32px) saturate(200%)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.20), 0 20px 44px rgba(0,0,0,0.30)', animation: 'fadeIn 0.3s cubic-bezier(0.16,1,0.3,1)' }}>
              <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: '26%', background: 'rgba(14,245,194,0.10)', border: '1px solid rgba(14,245,194,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, boxShadow: 'inset 0 1px 0 rgba(14,245,194,0.22)' }}>✦</div>
                <span style={{ color: '#f5f5f7', fontWeight: 700, fontSize: 14 }}>Lesson Assistant</span>
              </div>
              <div style={{ flex: 1, overflow: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {assistantMessages.map((msg, idx) => (
                  <div key={idx} style={{ padding: '11px 14px', borderRadius: 16, background: msg.role === 'assistant' ? 'rgba(14,245,194,0.07)' : 'rgba(255,255,255,0.06)', border: `1px solid ${msg.role === 'assistant' ? 'rgba(14,245,194,0.18)' : 'rgba(255,255,255,0.10)'}`, backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', boxShadow: msg.role === 'assistant' ? 'inset 0 1px 0 rgba(14,245,194,0.14)' : 'inset 0 1px 0 rgba(255,255,255,0.08)' }}>
                    <p style={{ margin: 0, color: msg.role === 'assistant' ? '#c8f7eb' : '#f5f5f7', fontSize: 13, lineHeight: 1.58 }}>{msg.text}</p>
                    {msg.tips?.length > 0 && <ul style={{ margin: '8px 0 0', paddingLeft: 18, color: '#8e8e93', fontSize: 12, lineHeight: 1.5 }}>{msg.tips.map((tip) => <li key={tip}>{tip}</li>)}</ul>}
                    {msg.links?.length > 0 && <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>{msg.links.map((link) => <a key={`${link.title}-${link.url}`} href={link.url} target="_blank" rel="noreferrer" style={{ color: '#0ef5c2', fontSize: 12, textDecoration: 'none' }}>{link.title}</a>)}</div>}
                  </div>
                ))}
                {assistantLoading && <p style={{ color: '#636366', fontSize: 12, margin: 0, fontStyle: 'italic' }}>Thinking...</p>}
              </div>
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', padding: 10, display: 'flex', gap: 8 }}>
                <input value={assistantInput} onChange={(e) => setAssistantInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleAskAssistant() }} placeholder="Ask about this slide..."
                  style={{ flex: 1, background: 'rgba(0,0,0,0.30)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 12, color: '#f5f5f7', padding: '10px 14px', fontSize: 13, fontFamily: "'DM Sans', sans-serif", outline: 'none' }}
                />
                <button onClick={handleAskAssistant} disabled={assistantLoading || !assistantInput.trim()}
                  style={{ padding: '10px 14px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #0ef5c2, #00d4ff)', color: '#06060f', fontWeight: 700, cursor: assistantLoading ? 'default' : 'pointer', fontSize: 13, boxShadow: '0 0 16px rgba(14,245,194,0.25), inset 0 1px 0 rgba(255,255,255,0.40)' }}
                >Ask</button>
              </div>
            </aside>
          )}
        </div>

        {/* ── Bottom navigation ── */}
        {!loading && !error && (
          <div style={{ padding: '14px 20px 30px', borderTop: '1px solid rgba(255,255,255,0.08)', background: 'rgba(6,6,15,0.90)', backdropFilter: 'blur(28px) saturate(200%)', WebkitBackdropFilter: 'blur(28px) saturate(200%)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)' }}>
            <div style={{ maxWidth: 600, margin: '0 auto', display: 'flex', gap: 12 }}>
              <button onClick={handleBack} disabled={current === 0 && !showQuiz} className="interactive-secondary"
                style={{ padding: '14px 26px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 16, color: current === 0 && !showQuiz ? '#3a3a3c' : '#8e8e93', fontSize: 15, fontWeight: 600, cursor: current === 0 && !showQuiz ? 'default' : 'pointer', fontFamily: "'DM Sans', sans-serif", transition: 'all 0.2s', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)' }}
                onMouseEnter={(e) => { if (current > 0 || showQuiz) { e.currentTarget.style.color = '#f5f5f7'; e.currentTarget.style.background = 'rgba(255,255,255,0.12)' } }}
                onMouseLeave={(e) => { e.currentTarget.style.color = current === 0 && !showQuiz ? '#3a3a3c' : '#8e8e93'; e.currentTarget.style.background = 'rgba(255,255,255,0.07)' }}
              >
                Back
              </button>
              <button onClick={handleNext}
                disabled={showQuiz && !quizPassed}
                className="interactive-cta"
                style={{ flex: 1, padding: '14px', background: (showQuiz && !quizPassed) ? 'rgba(255,255,255,0.08)' : 'linear-gradient(135deg, #0ef5c2, #00d4ff)', border: 'none', borderRadius: 16, color: (showQuiz && !quizPassed) ? '#636366' : '#06060f', fontSize: 16, fontWeight: 700, cursor: (showQuiz && !quizPassed) ? 'default' : 'pointer', fontFamily: "'DM Sans', sans-serif", boxShadow: (showQuiz && !quizPassed) ? 'none' : '0 0 32px rgba(14,245,194,0.28), inset 0 1px 0 rgba(255,255,255,0.48)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all 0.22s cubic-bezier(0.16,1,0.3,1)' }}
                onMouseEnter={(e) => { if (!(showQuiz && !quizPassed)) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 0 44px rgba(14,245,194,0.40), inset 0 1px 0 rgba(255,255,255,0.48)' } }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = (showQuiz && !quizPassed) ? 'none' : '0 0 32px rgba(14,245,194,0.28), inset 0 1px 0 rgba(255,255,255,0.48)' }}
              >
                {showQuiz ? (quizPassed ? 'Finish Lesson' : 'Answer the Quiz') : isLastSlide ? (quiz ? 'Check My Understanding' : 'Finish Lesson') : 'Next'}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#06060f" strokeWidth="2.5" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Mobile assistant sheet ── */}
      {assistantOpen && isMobile && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 220, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ width: '92%', maxWidth: 420, background: 'linear-gradient(145deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.05) 100%)', borderLeft: '1px solid rgba(255,255,255,0.14)', height: '100%', display: 'flex', flexDirection: 'column', backdropFilter: 'blur(40px) saturate(200%)', WebkitBackdropFilter: 'blur(40px) saturate(200%)', boxShadow: 'inset 1px 0 0 rgba(255,255,255,0.08), -32px 0 64px rgba(0,0,0,0.40)', animation: 'fadeIn 0.28s cubic-bezier(0.16,1,0.3,1)' }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#f5f5f7', fontWeight: 700 }}>Lesson Assistant</span>
              <button onClick={() => setAssistantOpen(false)} style={{ border: 'none', background: 'rgba(255,255,255,0.08)', borderRadius: 8, color: '#8e8e93', fontSize: 18, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
            </div>
            <div style={{ flex: 1, overflow: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {assistantMessages.map((msg, idx) => (
                <div key={idx} style={{ padding: '11px 14px', borderRadius: 16, background: msg.role === 'assistant' ? 'rgba(14,245,194,0.07)' : 'rgba(255,255,255,0.06)', border: `1px solid ${msg.role === 'assistant' ? 'rgba(14,245,194,0.18)' : 'rgba(255,255,255,0.10)'}` }}>
                  <p style={{ margin: 0, color: msg.role === 'assistant' ? '#c8f7eb' : '#f5f5f7', fontSize: 13, lineHeight: 1.55 }}>{msg.text}</p>
                </div>
              ))}
            </div>
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', padding: 10, display: 'flex', gap: 8 }}>
              <input value={assistantInput} onChange={(e) => setAssistantInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleAskAssistant() }} placeholder="Ask about this slide..."
                style={{ flex: 1, background: 'rgba(0,0,0,0.30)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 12, color: '#f5f5f7', padding: '10px 14px', fontSize: 13, fontFamily: "'DM Sans', sans-serif", outline: 'none' }}
              />
              <button onClick={handleAskAssistant} disabled={assistantLoading || !assistantInput.trim()}
                style={{ padding: '10px 14px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #0ef5c2, #00d4ff)', color: '#06060f', fontWeight: 700, cursor: 'pointer', boxShadow: '0 0 16px rgba(14,245,194,0.25), inset 0 1px 0 rgba(255,255,255,0.40)' }}
              >Ask</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
