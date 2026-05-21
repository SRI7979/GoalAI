'use client'

import { useState, useRef, useEffect, useMemo } from 'react'

const font = "'Plus Jakarta Sans','DM Sans',system-ui,sans-serif"
const mono = "'JetBrains Mono','Fira Code',monospace"

const IQ_CSS = `
  @keyframes iqShake {
    0%   { transform: translateX(0); }
    20%  { transform: translateX(-5px); }
    40%  { transform: translateX(5px); }
    60%  { transform: translateX(-3px); }
    80%  { transform: translateX(3px); }
    100% { transform: translateX(0); }
  }
  @keyframes iqFadeIn {
    from { opacity: 0; transform: translateY(6px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes iqCorrectPulse {
    0%   { box-shadow: 0 0 0 0 rgba(52,211,153,0.45); }
    100% { box-shadow: 0 0 0 10px rgba(52,211,153,0); }
  }
  @keyframes iqPopIn {
    0%   { transform: scale(0.85); opacity: 0; }
    70%  { transform: scale(1.04); }
    100% { transform: scale(1);    opacity: 1; }
  }
  @media (prefers-reduced-motion: reduce) {
    @keyframes iqShake        { from { transform: none; } to { transform: none; } }
    @keyframes iqCorrectPulse { from { box-shadow: none; } to { box-shadow: none; } }
    @keyframes iqPopIn        { from { opacity: 0; } to { opacity: 1; } }
  }
`

function stableShuffle(items = []) {
  const arr = [...items]
  let seed = arr.reduce((sum, item, index) => {
    const text = JSON.stringify(item) || ''
    let hash = index + 1
    for (let i = 0; i < text.length; i += 1) hash = ((hash * 31) + text.charCodeAt(i)) >>> 0
    return (sum + hash) >>> 0
  }, 2166136261)

  for (let i = arr.length - 1; i > 0; i -= 1) {
    seed = ((seed * 1664525) + 1013904223) >>> 0
    const j = seed % (i + 1)
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

// ── Shared sub-components ─────────────────────────────────────────────────────

function Explanation({ text, isCorrect }) {
  if (!text) return null
  return (
    <div
      style={{
        marginTop: 14,
        padding: '12px 16px',
        borderRadius: 14,
        background: isCorrect ? 'rgba(52,211,153,0.07)' : 'rgba(255,69,58,0.07)',
        border: `1px solid ${isCorrect ? 'rgba(52,211,153,0.22)' : 'rgba(255,69,58,0.22)'}`,
        animation: 'iqFadeIn 0.3s ease',
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 800,
          color: isCorrect ? '#34D399' : '#FF453A',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          marginBottom: 5,
        }}
      >
        {isCorrect ? 'Correct' : 'Incorrect'}
      </div>
      <p style={{ margin: 0, color: '#c8d6e5', fontSize: 14, lineHeight: 1.6 }}>{text}</p>
    </div>
  )
}

function LetterCircle({ letter, bg, color }) {
  return (
    <div
      style={{
        width: 28,
        height: 28,
        borderRadius: '50%',
        background: bg,
        color,
        fontSize: 12,
        fontWeight: 800,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        transition: 'all 0.12s',
      }}
    >
      {letter}
    </div>
  )
}

// ── Multiple Choice ───────────────────────────────────────────────────────────

function MultipleChoice({ question, options = [], correctIndex = 0, explanation, onResult }) {
  const [selected, setSelected] = useState(null)
  const [phase, setPhase] = useState('idle') // idle | selected | done
  const [shaking, setShaking] = useState(false)
  const [showExpl, setShowExpl] = useState(false)
  const timerRef = useRef(null)

  function handleClick(idx) {
    if (phase !== 'idle') return
    setSelected(idx)
    setPhase('selected')

    const correct = idx === correctIndex
    if (!correct) {
      setShaking(true)
      setTimeout(() => setShaking(false), 380)
    }
    // +300ms: show explanation
    timerRef.current = setTimeout(() => setShowExpl(true), 300)
    // +400ms: call onResult
    timerRef.current = setTimeout(() => {
      setPhase('done')
      onResult?.(correct)
    }, 400)
  }

  useEffect(() => () => clearTimeout(timerRef.current), [])

  const letters = ['A', 'B', 'C', 'D', 'E', 'F']

  return (
    <div style={shaking ? { animation: 'iqShake 0.38s ease' } : {}}>
      <style>{IQ_CSS}</style>
      {question && (
        <p style={{ margin: '0 0 16px', color: '#f5f5f7', fontSize: 18, fontWeight: 800, lineHeight: 1.4, letterSpacing: '-0.3px' }}>
          {question}
        </p>
      )}
      <div style={{ display: 'grid', gap: 10 }}>
        {options.map((opt, idx) => {
          const isSelected = selected === idx
          const isCorrectOpt = idx === correctIndex
          const isAnswered = phase !== 'idle'

          let bg = 'rgba(255,255,255,0.04)'
          let border = 'rgba(255,255,255,0.10)'
          let color = '#c8d6e5'
          let circleBg = 'rgba(255,255,255,0.12)'
          let circleColor = '#8e8e93'
          let circleContent = letters[idx] || String(idx + 1)
          let extraAnim = 'none'

          if (isAnswered) {
            if (isCorrectOpt) {
              bg = 'rgba(52,211,153,0.10)'
              border = 'rgba(52,211,153,0.35)'
              color = '#f5f5f7'
              circleBg = '#34D399'
              circleColor = '#06060f'
              circleContent = '✓'
              if (isSelected) extraAnim = 'iqCorrectPulse 0.5s ease'
            } else if (isSelected) {
              bg = 'rgba(255,69,58,0.08)'
              border = 'rgba(255,69,58,0.30)'
              color = '#f5f5f7'
              circleBg = '#FF453A'
              circleColor = '#fff'
              circleContent = '✗'
            } else {
              color = '#636366'
              circleBg = 'rgba(255,255,255,0.05)'
            }
          }

          return (
            <button
              key={idx}
              onClick={() => handleClick(idx)}
              disabled={isAnswered}
              style={{
                width: '100%',
                padding: '13px 16px',
                borderRadius: 14,
                border: `1.5px solid ${border}`,
                background: bg,
                color,
                fontSize: 15,
                fontWeight: 600,
                fontFamily: font,
                cursor: isAnswered ? 'default' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                textAlign: 'left',
                transition: 'all 0.12s',
                animation: extraAnim,
              }}
            >
              <LetterCircle letter={circleContent} bg={circleBg} color={circleColor} />
              <span style={{ lineHeight: 1.4 }}>{opt}</span>
            </button>
          )
        })}
      </div>
      {showExpl && <Explanation text={explanation} isCorrect={selected === correctIndex} />}
    </div>
  )
}

// ── Fill in the Blank ─────────────────────────────────────────────────────────

function FillBlank({ question, sentence, answer, explanation, onResult }) {
  const [value, setValue] = useState('')
  const [phase, setPhase] = useState('idle')
  const [showExpl, setShowExpl] = useState(false)
  const [shaking, setShaking] = useState(false)
  const [isCorrect, setIsCorrect] = useState(null)
  const timerRef = useRef(null)

  function check() {
    if (phase !== 'idle') return
    const trimmed = value.trim().toLowerCase()
    const alts = (answer || '').toLowerCase().split(',').map((a) => a.trim())
    const correct = alts.includes(trimmed)
    setIsCorrect(correct)
    setPhase('selected')
    if (!correct) {
      setShaking(true)
      setTimeout(() => setShaking(false), 380)
    }
    setTimeout(() => setShowExpl(true), 300)
    timerRef.current = setTimeout(() => {
      setPhase('done')
      onResult?.(correct)
    }, 400)
  }

  useEffect(() => () => clearTimeout(timerRef.current), [])

  const parts = (sentence || question || '').split('___')
  const displayText = phase !== 'idle' ? answer : null

  return (
    <div style={shaking ? { animation: 'iqShake 0.38s ease' } : {}}>
      <style>{IQ_CSS}</style>
      <div style={{ fontSize: 17, color: '#c8d6e5', lineHeight: 1.65, marginBottom: 16, fontWeight: 500 }}>
        {parts.map((part, i) => (
          <span key={i}>
            {part}
            {i < parts.length - 1 && (
              <span
                style={{
                  borderBottom: `2px solid ${isCorrect === false ? '#FF453A' : '#0ef5c2'}`,
                  color: phase !== 'idle' ? (isCorrect ? '#34D399' : '#FF453A') : '#0ef5c2',
                  minWidth: 72,
                  display: 'inline-block',
                  textAlign: 'center',
                  padding: '0 6px',
                  fontWeight: 700,
                  transition: 'color 0.15s, border-color 0.15s',
                }}
              >
                {displayText || '\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0'}
              </span>
            )}
          </span>
        ))}
      </div>

      {phase === 'idle' && (
        <div style={{ display: 'flex', gap: 10 }}>
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && check()}
            placeholder="Type your answer…"
            autoComplete="off"
            style={{
              flex: 1,
              height: 48,
              padding: '0 16px',
              borderRadius: 12,
              border: '2px solid rgba(14,245,194,0.3)',
              background: 'rgba(12,16,24,0.8)',
              color: '#f5f5f7',
              fontSize: 15,
              fontFamily: font,
              outline: 'none',
            }}
          />
          <button
            onClick={check}
            style={{
              padding: '0 20px',
              height: 48,
              borderRadius: 12,
              border: 'none',
              background: 'rgba(14,245,194,0.14)',
              color: '#0ef5c2',
              fontWeight: 800,
              fontSize: 14,
              fontFamily: font,
              cursor: 'pointer',
            }}
          >
            Check
          </button>
        </div>
      )}

      {phase !== 'idle' && (
        <div
          style={{
            padding: '10px 14px',
            borderRadius: 12,
            background: isCorrect ? 'rgba(52,211,153,0.10)' : 'rgba(255,69,58,0.08)',
            border: `1px solid ${isCorrect ? 'rgba(52,211,153,0.25)' : 'rgba(255,69,58,0.25)'}`,
            fontSize: 14,
            fontWeight: 700,
            color: isCorrect ? '#34D399' : '#FF453A',
            animation: 'iqFadeIn 0.25s ease',
          }}
        >
          {isCorrect ? '✓ Correct!' : `✗ The answer was: ${answer}`}
        </div>
      )}

      {showExpl && <Explanation text={explanation} isCorrect={isCorrect} />}
    </div>
  )
}

// ── True / False ──────────────────────────────────────────────────────────────

function TrueFalse({ question, statement, correct, explanation, onResult }) {
  const [phase, setPhase] = useState('idle')
  const [picked, setPicked] = useState(null)
  const [showExpl, setShowExpl] = useState(false)
  const [shaking, setShaking] = useState(false)
  const timerRef = useRef(null)
  const boolCorrect = correct === true || correct === 'true'

  function handleClick(val) {
    if (phase !== 'idle') return
    setPicked(val)
    setPhase('selected')
    const isCorrect = val === boolCorrect
    if (!isCorrect) {
      setShaking(true)
      setTimeout(() => setShaking(false), 380)
    }
    setTimeout(() => setShowExpl(true), 300)
    timerRef.current = setTimeout(() => {
      setPhase('done')
      onResult?.(isCorrect)
    }, 400)
  }

  useEffect(() => () => clearTimeout(timerRef.current), [])

  const label = statement || question || ''
  const isAnswered = phase !== 'idle'

  return (
    <div style={shaking ? { animation: 'iqShake 0.38s ease' } : {}}>
      <style>{IQ_CSS}</style>
      {label && (
        <p style={{ margin: '0 0 18px', color: '#f5f5f7', fontSize: 17, fontWeight: 700, lineHeight: 1.55 }}>
          {label}
        </p>
      )}
      <div style={{ display: 'flex', gap: 10 }}>
        {[true, false].map((val) => {
          const text = val ? 'True' : 'False'
          const isThisCorrect = val === boolCorrect
          const isThisPicked = picked === val

          let bg = 'rgba(255,255,255,0.04)'
          let border = val ? 'rgba(14,245,194,0.35)' : 'rgba(251,191,36,0.35)'
          let color = '#f5f5f7'

          if (isAnswered) {
            if (isThisCorrect) {
              bg = 'rgba(52,211,153,0.14)'
              border = 'rgba(52,211,153,0.40)'
              color = '#34D399'
            } else if (isThisPicked) {
              bg = 'rgba(255,69,58,0.10)'
              border = 'rgba(255,69,58,0.35)'
              color = '#FF453A'
            } else {
              bg = 'rgba(255,255,255,0.02)'
              color = '#636366'
            }
          }

          return (
            <button
              key={text}
              onClick={() => handleClick(val)}
              disabled={isAnswered}
              style={{
                flex: 1,
                height: 56,
                borderRadius: 14,
                border: `2px solid ${border}`,
                background: bg,
                color,
                fontSize: 16,
                fontWeight: 800,
                fontFamily: font,
                cursor: isAnswered ? 'default' : 'pointer',
                transition: 'all 0.12s',
              }}
            >
              {isAnswered && isThisCorrect ? `✓ ${text}` : isAnswered && isThisPicked && !isThisCorrect ? `✗ ${text}` : text}
            </button>
          )
        })}
      </div>
      {showExpl && <Explanation text={explanation} isCorrect={picked === boolCorrect} />}
    </div>
  )
}

// ── Order Steps (drag-and-drop) ───────────────────────────────────────────────

function OrderSteps({ question, steps = [], explanation, onResult }) {
  // Scramble steps on mount
  const [correctOrder] = useState(() => steps)
  const [order, setOrder] = useState(() => {
    return stableShuffle(steps.map((s, i) => ({ text: s, originalIdx: i })))
  })
  const [dragIdx, setDragIdx] = useState(null)
  const [phase, setPhase] = useState('idle') // idle | checked | done
  const [checked, setChecked] = useState(null) // null | boolean[]
  const [showExpl, setShowExpl] = useState(false)
  const timerRef = useRef(null)

  function handleDragStart(e, idx) {
    setDragIdx(idx)
    e.dataTransfer.effectAllowed = 'move'
  }

  function handleDragOver(e, idx) {
    e.preventDefault()
    if (dragIdx === null || dragIdx === idx) return
    const newOrder = [...order]
    const [item] = newOrder.splice(dragIdx, 1)
    newOrder.splice(idx, 0, item)
    setOrder(newOrder)
    setDragIdx(idx)
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragIdx(null)
  }

  function handleCheck() {
    if (phase !== 'idle') return
    const results = order.map((item, i) => item.originalIdx === i)
    const allCorrect = results.every(Boolean)
    setChecked(results)
    setPhase('checked')
    setTimeout(() => setShowExpl(true), 300)
    timerRef.current = setTimeout(() => {
      setPhase('done')
      onResult?.(allCorrect)
    }, 400)
  }

  useEffect(() => () => clearTimeout(timerRef.current), [])

  return (
    <div>
      <style>{IQ_CSS}</style>
      {question && (
        <p style={{ margin: '0 0 16px', color: '#f5f5f7', fontSize: 17, fontWeight: 800, lineHeight: 1.4 }}>
          {question}
        </p>
      )}
      <div style={{ display: 'grid', gap: 8 }}>
        {order.map((item, idx) => {
          const isCorrect = checked !== null ? checked[idx] : null
          return (
            <div
              key={item.text}
              draggable={phase === 'idle'}
              onDragStart={(e) => handleDragStart(e, idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDrop={handleDrop}
              style={{
                padding: '13px 14px',
                borderRadius: 14,
                border: `1.5px solid ${
                  isCorrect === true
                    ? 'rgba(52,211,153,0.4)'
                    : isCorrect === false
                    ? 'rgba(255,69,58,0.35)'
                    : dragIdx === idx
                    ? 'rgba(14,245,194,0.5)'
                    : 'rgba(255,255,255,0.10)'
                }`,
                background:
                  isCorrect === true
                    ? 'rgba(52,211,153,0.08)'
                    : isCorrect === false
                    ? 'rgba(255,69,58,0.06)'
                    : 'rgba(255,255,255,0.04)',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                cursor: phase === 'idle' ? 'grab' : 'default',
                transition: 'all 0.15s',
                opacity: dragIdx === idx ? 0.6 : 1,
              }}
            >
              {/* Drag handle */}
              <svg width="12" height="16" viewBox="0 0 12 16" fill="rgba(255,255,255,0.2)">
                <circle cx="3" cy="3" r="1.5" />
                <circle cx="9" cy="3" r="1.5" />
                <circle cx="3" cy="8" r="1.5" />
                <circle cx="9" cy="8" r="1.5" />
                <circle cx="3" cy="13" r="1.5" />
                <circle cx="9" cy="13" r="1.5" />
              </svg>
              <span style={{ flex: 1, color: '#c8d6e5', fontSize: 15, fontWeight: 600, lineHeight: 1.4 }}>{item.text}</span>
              {isCorrect === true && <span style={{ color: '#34D399', fontSize: 16 }}>✓</span>}
              {isCorrect === false && (
                <span style={{ color: '#8e8e93', fontSize: 12, fontWeight: 700 }}>
                  #{item.originalIdx + 1}
                </span>
              )}
            </div>
          )
        })}
      </div>

      {phase === 'idle' && (
        <button
          onClick={handleCheck}
          style={{
            marginTop: 14,
            width: '100%',
            padding: '13px',
            borderRadius: 14,
            border: 'none',
            background: 'linear-gradient(135deg,#0ef5c2,#00d4ff)',
            color: '#06060f',
            fontSize: 15,
            fontWeight: 800,
            fontFamily: font,
            cursor: 'pointer',
          }}
        >
          Check Order
        </button>
      )}

      {showExpl && (
        <Explanation
          text={explanation || (checked?.every(Boolean) ? 'Perfect order!' : 'Numbers show the correct position for each step.')}
          isCorrect={checked?.every(Boolean) ?? false}
        />
      )}
    </div>
  )
}

// ── Match Pairs ───────────────────────────────────────────────────────────────

function MatchPairs({ question, pairs = [], explanation, onResult }) {
  const [selectedTerm, setSelectedTerm] = useState(null)
  const [matched, setMatched] = useState(new Set()) // indices of matched pairs
  const [wrongFlash, setWrongFlash] = useState(null)
  const [phase, setPhase] = useState('idle')
  const [showExpl, setShowExpl] = useState(false)
  const timerRef = useRef(null)

  // Scramble definitions once
  const [scrambledDefs] = useState(() => stableShuffle(pairs.map((p, i) => ({ def: p.definition, originalIdx: i }))))

  function handleTermClick(idx) {
    if (matched.has(idx) || phase === 'done') return
    setSelectedTerm(idx === selectedTerm ? null : idx)
  }

  function handleDefClick(defItem) {
    if (phase === 'done') return
    if (selectedTerm === null) return
    const isCorrect = defItem.originalIdx === selectedTerm
    if (isCorrect) {
      const next = new Set([...matched, selectedTerm])
      setMatched(next)
      setSelectedTerm(null)
      if (next.size === pairs.length) {
        // All matched!
        setTimeout(() => setShowExpl(true), 300)
        timerRef.current = setTimeout(() => {
          setPhase('done')
          onResult?.(true)
        }, 400)
      }
    } else {
      setWrongFlash(`${selectedTerm}-${defItem.originalIdx}`)
      setTimeout(() => setWrongFlash(null), 500)
    }
  }

  useEffect(() => () => clearTimeout(timerRef.current), [])

  return (
    <div>
      <style>{IQ_CSS}</style>
      {question && (
        <p style={{ margin: '0 0 16px', color: '#f5f5f7', fontSize: 17, fontWeight: 800 }}>
          {question}
        </p>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {/* Terms column */}
        <div style={{ display: 'grid', gap: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#8e8e93', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>Terms</div>
          {pairs.map((pair, idx) => {
            const isMatched = matched.has(idx)
            const isSelected = selectedTerm === idx
            return (
              <button
                key={idx}
                onClick={() => handleTermClick(idx)}
                style={{
                  padding: '10px 12px',
                  borderRadius: 12,
                  border: `1.5px solid ${isMatched ? 'rgba(52,211,153,0.3)' : isSelected ? 'rgba(14,245,194,0.6)' : 'rgba(14,245,194,0.22)'}`,
                  background: isMatched ? 'rgba(52,211,153,0.08)' : isSelected ? 'rgba(14,245,194,0.10)' : 'rgba(14,245,194,0.04)',
                  color: isMatched ? '#636366' : '#f5f5f7',
                  fontSize: 14,
                  fontWeight: 600,
                  fontFamily: font,
                  cursor: isMatched ? 'default' : 'pointer',
                  textAlign: 'left',
                  opacity: isMatched ? 0.5 : 1,
                  transition: 'all 0.15s',
                  boxShadow: isSelected ? '0 0 0 2px rgba(14,245,194,0.4)' : 'none',
                }}
              >
                {isMatched ? '✓ ' : ''}{pair.term}
              </button>
            )
          })}
        </div>

        {/* Definitions column */}
        <div style={{ display: 'grid', gap: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#8e8e93', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>Definitions</div>
          {scrambledDefs.map((defItem, idx) => {
            const isMatched = matched.has(defItem.originalIdx)
            const isWrong = wrongFlash === `${selectedTerm}-${defItem.originalIdx}`
            return (
              <button
                key={defItem.originalIdx}
                onClick={() => handleDefClick(defItem)}
                style={{
                  padding: '10px 12px',
                  borderRadius: 12,
                  border: `1.5px solid ${isMatched ? 'rgba(52,211,153,0.3)' : isWrong ? 'rgba(255,69,58,0.5)' : 'rgba(255,255,255,0.10)'}`,
                  background: isMatched ? 'rgba(52,211,153,0.08)' : isWrong ? 'rgba(255,69,58,0.10)' : 'rgba(255,255,255,0.04)',
                  color: isMatched ? '#636366' : '#c8d6e5',
                  fontSize: 13,
                  fontFamily: font,
                  cursor: isMatched ? 'default' : 'pointer',
                  textAlign: 'left',
                  opacity: isMatched ? 0.5 : 1,
                  transition: 'all 0.15s',
                  animation: isWrong ? 'iqShake 0.4s ease' : 'none',
                }}
              >
                {defItem.def}
              </button>
            )
          })}
        </div>
      </div>

      {showExpl && <Explanation text={explanation || 'All matched!'} isCorrect={true} />}
    </div>
  )
}

// ── Spot the Error (reuses MultipleChoice) ────────────────────────────────────

function SpotError({ question, code, options, correctIndex, explanation, onResult }) {
  return (
    <div>
      <style>{IQ_CSS}</style>
      {code && (
        <pre
          style={{
            margin: '0 0 16px',
            padding: '14px 16px',
            borderRadius: 14,
            background: '#0c1018',
            border: '1px solid rgba(255,255,255,0.08)',
            color: '#c8d6e5',
            fontSize: 13,
            fontFamily: mono,
            overflowX: 'auto',
            whiteSpace: 'pre',
          }}
        >
          {code}
        </pre>
      )}
      <MultipleChoice
        question={question}
        options={options}
        correctIndex={correctIndex}
        explanation={explanation}
        onResult={onResult}
      />
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Unified interactive question component for all task views.
 *
 * Props:
 *   type: 'multiple_choice' | 'fill_blank' | 'true_false' | 'order_steps' | 'match_pairs' | 'spot_error'
 *   question, statement, sentence, answer, correct, options, correctIndex, code, pairs, steps
 *   explanation: string (shown after answering)
 *   onResult: (isCorrect: boolean) => void — called ~400ms after selection
 */
export default function InteractiveQuestion(props) {
  const { type = 'multiple_choice', onResult } = props

  if (type === 'fill_blank') return <FillBlank {...props} onResult={onResult} />
  if (type === 'true_false')  return <TrueFalse {...props} onResult={onResult} />
  if (type === 'order_steps') return <OrderSteps {...props} onResult={onResult} />
  if (type === 'match_pairs') return <MatchPairs {...props} onResult={onResult} />
  if (type === 'spot_error')  return <SpotError {...props} onResult={onResult} />

  // Default: multiple_choice (also handles 'predict')
  return <MultipleChoice {...props} onResult={onResult} />
}
