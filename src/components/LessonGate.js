'use client'

import { useState } from 'react'

const font = "'Plus Jakarta Sans','DM Sans',system-ui,sans-serif"

const GATE_STYLES = `
  @keyframes gateShake {
    0%   { transform: translateX(0); }
    20%  { transform: translateX(-6px); }
    40%  { transform: translateX(6px); }
    60%  { transform: translateX(-4px); }
    80%  { transform: translateX(4px); }
    100% { transform: translateX(0); }
  }
  @keyframes gateFadeIn {
    from { opacity: 0; transform: translateY(6px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes gateCorrectPulse {
    0%   { box-shadow: 0 0 0 0 rgba(52,211,153,0.5); }
    100% { box-shadow: 0 0 0 10px rgba(52,211,153,0); }
  }
`

function FeedbackBox({ text, isReveal, answer }) {
  return (
    <div
      style={{
        marginTop: 12,
        padding: '12px 16px',
        borderRadius: 14,
        background: isReveal ? 'rgba(14,245,194,0.06)' : 'rgba(255,69,58,0.08)',
        border: `1px solid ${isReveal ? 'rgba(14,245,194,0.22)' : 'rgba(255,69,58,0.22)'}`,
        animation: 'gateFadeIn 0.3s ease',
      }}
    >
      {isReveal && answer && (
        <div style={{ fontSize: 11, fontWeight: 800, color: '#0ef5c2', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 5 }}>
          Answer: {answer}
        </div>
      )}
      {!isReveal && (
        <div style={{ fontSize: 11, fontWeight: 800, color: '#FF453A', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 5 }}>
          Not quite — try again
        </div>
      )}
      {text && <p style={{ margin: 0, color: '#c8d6e5', fontSize: 14, lineHeight: 1.6 }}>{text}</p>}
    </div>
  )
}

function MultipleChoiceOptions({ options = [], correctIndex, onSelect }) {
  const [selectedIndex, setSelectedIndex] = useState(null)
  const [phase, setPhase] = useState('idle')

  function handleClick(idx) {
    if (phase !== 'idle') return
    setSelectedIndex(idx)
    const correct = idx === correctIndex
    setPhase(correct ? 'correct' : 'wrong')
    onSelect(correct, idx)
    if (!correct) {
      setTimeout(() => {
        setSelectedIndex(null)
        setPhase('idle')
      }, 850)
    }
  }

  const letters = ['A', 'B', 'C', 'D', 'E']

  return (
    <div style={{ display: 'grid', gap: 8 }}>
      {options.map((opt, idx) => {
        const isSelected = selectedIndex === idx
        const isCorrect = idx === correctIndex
        const isAnswered = phase !== 'idle'

        let bg = 'rgba(255,255,255,0.04)'
        let border = 'rgba(255,255,255,0.1)'
        let textColor = '#c8d6e5'
        let circleBg = 'rgba(255,255,255,0.12)'
        let circleColor = '#8e8e93'
        let circleContent = letters[idx] || String(idx + 1)

        if (isAnswered) {
          if (isCorrect && (phase === 'correct' || isSelected)) {
            bg = 'rgba(52,211,153,0.12)'
            border = 'rgba(52,211,153,0.35)'
            circleBg = '#34D399'
            circleColor = '#06060f'
            circleContent = '✓'
          } else if (isSelected && !isCorrect) {
            bg = 'rgba(255,69,58,0.10)'
            border = 'rgba(255,69,58,0.30)'
            circleBg = '#FF453A'
            circleColor = '#fff'
            circleContent = '✗'
          } else {
            textColor = '#636366'
          }
        }

        return (
          <button
            key={idx}
            onClick={() => handleClick(idx)}
            disabled={isAnswered}
            style={{
              width: '100%',
              padding: '12px 16px',
              borderRadius: 14,
              border: `1.5px solid ${border}`,
              background: bg,
              color: textColor,
              fontSize: 15,
              fontWeight: 600,
              fontFamily: font,
              cursor: isAnswered ? 'default' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              textAlign: 'left',
              transition: 'all 0.12s',
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: circleBg,
                color: circleColor,
                fontSize: 12,
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'all 0.12s',
              }}
            >
              {circleContent}
            </div>
            {opt}
          </button>
        )
      })}
    </div>
  )
}

export default function LessonGate({
  type = 'ready_check',
  question,
  statement,
  sentence,
  answer,
  correct,
  options = [],
  correctIndex = 0,
  code,
  explanation,
  onPass,
}) {
  const [phase, setPhase] = useState('idle')
  const [attempts, setAttempts] = useState(0)
  const [shaking, setShaking] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [reflectText, setReflectText] = useState('')

  function triggerShake() {
    setShaking(true)
    setTimeout(() => setShaking(false), 380)
  }

  function handleCorrect() {
    setPhase('correct')
    setTimeout(() => onPass(), 700)
  }

  function handleWrong() {
    const next = attempts + 1
    setAttempts(next)
    triggerShake()
    if (next >= 2) {
      setPhase('reveal')
      setTimeout(() => onPass(), 2500)
    } else {
      setPhase('wrong')
    }
  }

  const gateWrap = {
    marginTop: 8,
    padding: '20px 22px',
    borderRadius: 20,
    background: 'rgba(14,245,194,0.04)',
    border: '1px solid rgba(14,245,194,0.18)',
    fontFamily: font,
    animation: 'gateFadeIn 0.35s ease',
    ...(shaking ? { animation: 'gateShake 0.38s ease' } : {}),
  }

  const correctBanner = (
    <div
      style={{
        padding: '12px 16px',
        borderRadius: 12,
        background: 'rgba(52,211,153,0.12)',
        border: '1px solid rgba(52,211,153,0.3)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        animation: 'gateFadeIn 0.25s ease',
      }}
    >
      <span style={{ fontSize: 18 }}>✓</span>
      <span style={{ color: '#34D399', fontWeight: 700, fontSize: 15 }}>Correct!</span>
    </div>
  )

  // Always render styles (needed for gateFadeIn on all branches)
  const styleTag = <style key="gate-styles">{GATE_STYLES}</style>

  // ── ready_check ──────────────────────────────────────────
  if (type === 'ready_check') {
    return (
      <div style={gateWrap}>
        {styleTag}
        <p style={{ margin: '0 0 14px', color: '#8e8e93', fontSize: 13, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Ready to continue?
        </p>
        <button
          onClick={onPass}
          style={{
            padding: '12px 28px',
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
          Got it, show me more →
        </button>
      </div>
    )
  }

  // ── true_false ────────────────────────────────────────────
  if (type === 'true_false') {
    const boolCorrect = correct === true || correct === 'true'

    function handleBoolClick(picked) {
      if (phase === 'correct' || phase === 'reveal') return
      if (picked === boolCorrect) {
        handleCorrect()
      } else {
        handleWrong()
      }
    }

    return (
      <div style={gateWrap}>
        {styleTag}
        <p style={{ margin: '0 0 18px', color: '#c8d6e5', fontSize: 16, fontWeight: 700, lineHeight: 1.55 }}>
          {statement || question}
        </p>
        {phase === 'correct' ? (
          correctBanner
        ) : (
          <div style={{ display: 'flex', gap: 10 }}>
            {[true, false].map((val) => {
              const label = val ? 'True' : 'False'
              const isCorrectVal = val === boolCorrect
              const isRevealPhase = phase === 'reveal'
              let bg = 'rgba(255,255,255,0.04)'
              let border = val ? 'rgba(14,245,194,0.35)' : 'rgba(251,191,36,0.35)'
              let color = '#f5f5f7'
              if (isRevealPhase && isCorrectVal) {
                bg = 'rgba(52,211,153,0.15)'
                border = 'rgba(52,211,153,0.4)'
                color = '#34D399'
              }
              return (
                <button
                  key={label}
                  onClick={() => handleBoolClick(val)}
                  disabled={phase === 'reveal'}
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
                    cursor: phase === 'reveal' ? 'default' : 'pointer',
                    transition: 'all 0.12s',
                  }}
                >
                  {isRevealPhase && isCorrectVal ? `✓ ${label}` : label}
                </button>
              )
            })}
          </div>
        )}
        {(phase === 'wrong' || phase === 'reveal') && (
          <FeedbackBox
            text={explanation}
            isReveal={phase === 'reveal'}
            answer={boolCorrect ? 'True' : 'False'}
          />
        )}
      </div>
    )
  }

  // ── fill_blank ────────────────────────────────────────────
  if (type === 'fill_blank') {
    function checkFill() {
      if (phase === 'correct' || phase === 'reveal') return
      const trimmed = inputValue.trim().toLowerCase()
      const correctLower = (answer || '').trim().toLowerCase()
      const alts = correctLower.split(',').map((a) => a.trim())
      if (alts.includes(trimmed)) {
        handleCorrect()
      } else {
        handleWrong()
      }
    }

    const parts = (sentence || question || '').split('___')

    return (
      <div style={gateWrap}>
        {styleTag}
        <div style={{ fontSize: 16, color: '#c8d6e5', lineHeight: 1.65, marginBottom: 16, fontWeight: 500 }}>
          {parts.map((part, i) => (
            <span key={i}>
              {part}
              {i < parts.length - 1 && (
                <span
                  style={{
                    borderBottom: '2px solid #0ef5c2',
                    color: '#0ef5c2',
                    minWidth: 64,
                    display: 'inline-block',
                    textAlign: 'center',
                    padding: '0 6px',
                    fontWeight: 700,
                  }}
                >
                  {phase === 'correct' || phase === 'reveal' ? answer : '\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0'}
                </span>
              )}
            </span>
          ))}
        </div>

        {phase === 'correct' ? (
          correctBanner
        ) : phase === 'reveal' ? null : (
          <div style={{ display: 'flex', gap: 10 }}>
            <input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && checkFill()}
              placeholder="Type your answer…"
              autoComplete="off"
              style={{
                flex: 1,
                height: 48,
                padding: '0 16px',
                borderRadius: 12,
                border: `2px solid ${phase === 'wrong' ? 'rgba(255,69,58,0.5)' : 'rgba(14,245,194,0.3)'}`,
                background: 'rgba(12,16,24,0.8)',
                color: '#f5f5f7',
                fontSize: 15,
                fontFamily: font,
                outline: 'none',
                transition: 'border-color 0.15s',
              }}
            />
            <button
              onClick={checkFill}
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

        {(phase === 'wrong' || phase === 'reveal') && (
          <FeedbackBox
            text={explanation}
            isReveal={phase === 'reveal'}
            answer={answer}
          />
        )}
      </div>
    )
  }

  // ── predict / spot_error ──────────────────────────────────
  if (type === 'predict' || type === 'spot_error') {
    function handleMCResult(isCorrect) {
      if (isCorrect) {
        handleCorrect()
      } else {
        handleWrong()
      }
    }

    return (
      <div style={gateWrap}>
        {styleTag}
        <p style={{ margin: '0 0 12px', color: '#c8d6e5', fontSize: 16, fontWeight: 700, lineHeight: 1.55 }}>
          {question}
        </p>
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
              fontFamily: "'JetBrains Mono','Fira Code',monospace",
              overflowX: 'auto',
              whiteSpace: 'pre',
            }}
          >
            {code}
          </pre>
        )}
        {phase === 'correct' ? (
          correctBanner
        ) : (
          <MultipleChoiceOptions
            options={options}
            correctIndex={correctIndex}
            onSelect={handleMCResult}
          />
        )}
        {(phase === 'wrong' || phase === 'reveal') && (
          <FeedbackBox
            text={explanation}
            isReveal={phase === 'reveal'}
            answer={options[correctIndex]}
          />
        )}
      </div>
    )
  }

  // ── reflect ───────────────────────────────────────────────
  if (type === 'reflect') {
    const ready = reflectText.trim().length >= 10
    return (
      <div style={gateWrap}>
        {styleTag}
        <p style={{ margin: '0 0 14px', color: '#c8d6e5', fontSize: 15, lineHeight: 1.6 }}>
          {question || 'In your own words, why does this matter?'}
        </p>
        <textarea
          value={reflectText}
          onChange={(e) => setReflectText(e.target.value)}
          placeholder="Write at least a sentence…"
          rows={3}
          style={{
            width: '100%',
            padding: '14px 16px',
            borderRadius: 14,
            border: '1px solid rgba(255,255,255,0.12)',
            background: 'rgba(255,255,255,0.04)',
            color: '#f5f5f7',
            fontSize: 15,
            lineHeight: 1.7,
            fontFamily: font,
            resize: 'none',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
        <button
          onClick={() => ready && onPass()}
          disabled={!ready}
          style={{
            marginTop: 12,
            padding: '12px 24px',
            borderRadius: 14,
            border: 'none',
            background: ready ? 'linear-gradient(135deg,#0ef5c2,#00d4ff)' : 'rgba(255,255,255,0.06)',
            color: ready ? '#06060f' : '#636366',
            fontSize: 15,
            fontWeight: 800,
            fontFamily: font,
            cursor: ready ? 'pointer' : 'default',
            transition: 'all 0.2s',
          }}
        >
          Continue →
        </button>
      </div>
    )
  }

  return null
}
