'use client'

import { useMemo, useState } from 'react'

const font = "'Plus Jakarta Sans','DM Sans',system-ui,sans-serif"
const accent = '#0ef5c2'
const blue = '#7dd3fc'
const purple = '#a78bfa'
const amber = '#fbbf24'
const danger = '#ff6b6b'

const INTERACTION_PRIMITIVES = new Set(['identify', 'build', 'predict', 'trace', 'fix', 'manipulate', 'compare'])

const DOMAIN_VISUAL_CSS = `
  @keyframes domainCorrectPulse {
    0% { filter: drop-shadow(0 0 0 rgba(52,211,153,0)); transform: scale(1); }
    45% { filter: drop-shadow(0 0 18px rgba(52,211,153,0.72)); transform: scale(1.035); }
    100% { filter: drop-shadow(0 0 10px rgba(52,211,153,0.42)); transform: scale(1); }
  }
  @keyframes domainWrongShake {
    0%, 100% { transform: translateX(0); }
    22% { transform: translateX(-5px); }
    48% { transform: translateX(5px); }
    72% { transform: translateX(-3px); }
  }
  @keyframes domainBurst {
    0% { opacity: 0.86; transform: translate(-50%, -50%) scale(0.24); }
    100% { opacity: 0; transform: translate(-50%, -50%) scale(1.55); }
  }
  @keyframes domainFlowDash {
    to { stroke-dashoffset: -42; }
  }
  @keyframes domainTileSnap {
    0% { transform: translateY(5px) scale(0.96); opacity: 0.7; }
    100% { transform: translateY(0) scale(1); opacity: 1; }
  }
  .domain-visual-target {
    transition: filter 180ms ease, transform 180ms ease, opacity 180ms ease;
    transform-box: fill-box;
    transform-origin: center;
  }
  .domain-visual-target:hover {
    filter: drop-shadow(0 0 14px rgba(125,211,252,0.48));
  }
  .domain-visual-target.is-correct {
    animation: domainCorrectPulse 760ms ease both;
  }
  .domain-visual-target.is-wrong {
    animation: domainWrongShake 420ms ease both;
    filter: drop-shadow(0 0 14px rgba(255,107,107,0.55));
  }
  .domain-flow-lit {
    stroke-dasharray: 12 10;
    animation: domainFlowDash 1.1s linear infinite;
  }
  .domain-word-snap {
    animation: domainTileSnap 220ms ease both;
  }
`

const shellStyle = {
  position: 'relative',
  overflow: 'hidden',
  border: '1px solid rgba(125,211,252,0.18)',
  borderRadius: 28,
  background: 'linear-gradient(145deg, rgba(255,255,255,0.075), rgba(255,255,255,0.03)), rgba(3,8,15,0.84)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), 0 30px 80px rgba(0,0,0,0.30)',
  padding: 'clamp(16px, 2.4vw, 24px)',
  fontFamily: font,
  minHeight: 430,
}

const panelStyle = {
  border: '1px solid rgba(255,255,255,0.10)',
  borderRadius: 20,
  background: 'rgba(2,8,15,0.64)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
}

function clean(value, fallback = '') {
  if (value == null || value === '') return String(fallback ?? '').trim()
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value).trim()
  if (Array.isArray(value)) return value.map((item) => clean(item)).filter(Boolean).join(', ')
  if (typeof value === 'object') {
    const preferredKeys = ['label', 'text', 'title', 'name', 'prompt', 'description', 'value', 'answer']
    for (const key of preferredKeys) {
      if (value[key] == null) continue
      const text = clean(value[key])
      if (text) return text
    }
    return Object.entries(value)
      .filter(([, entry]) => entry != null && entry !== '')
      .slice(0, 3)
      .map(([key, entry]) => `${key}: ${clean(entry)}`)
      .join('; ')
      .trim()
  }
  return String(fallback ?? '').trim()
}

function normalizeAnswer(value = '') {
  return clean(value).toLowerCase().replace(/[`"'.,!?]/g, '').replace(/\s+/g, ' ')
}

function matchesAnswer(answer, correctAnswer) {
  const selected = normalizeAnswer(answer)
  const correct = normalizeAnswer(correctAnswer)
  return Boolean(selected && correct && (selected === correct || selected.includes(correct) || correct.includes(selected)))
}

function normalizePrimitive(value = '') {
  const primitive = clean(value, 'identify').toLowerCase().replace(/[^a-z]+/g, '_')
  return INTERACTION_PRIMITIVES.has(primitive) ? primitive : 'identify'
}

function currentAnswerFromState(state = {}) {
  return state.builtAnswer
    || state.predictedAnswer
    || (Array.isArray(state.tracePath) && state.tracePath.length ? state.tracePath.join(' > ') : '')
    || (state.manipulatedValue !== '' && state.manipulatedValue != null ? String(state.manipulatedValue) : '')
    || state.comparedSelection
    || state.selectedOption
    || state.selectedTarget
    || ''
}

function safeArray(value, fallback = []) {
  return Array.isArray(value) && value.length > 0 ? value : fallback
}

function explicitChoices(data = {}) {
  const raw = data.choices || data.options || data.answerChoices
  return (Array.isArray(raw) ? raw : [])
    .map((choice) => (typeof choice === 'object' ? choice?.label || choice?.text || choice?.value : choice))
    .map((choice) => clean(choice))
    .filter(Boolean)
    .slice(0, 5)
}

function semanticIncludes(text = '', terms = []) {
  const normalized = normalizeAnswer(text)
  return terms.some((term) => normalized.includes(normalizeAnswer(term)))
}

function targetState(interaction, id) {
  if (interaction.selectedTarget !== id && interaction.selectedVisualTarget !== id && interaction.selectedOption !== id) return ''
  if (interaction.isCorrect) return 'is-correct'
  if (interaction.hasInteracted) return 'is-wrong'
  return ''
}

function statusLabel(interaction, completed) {
  if (completed || interaction.isCorrect) return 'Ready'
  if (interaction.hasInteracted) return 'Try again'
  return 'Click the visual'
}

function Header({ type, prompt, interaction, completed }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto', gap: 16, alignItems: 'start', marginBottom: 16 }}>
      <div>
        <div style={{ color: blue, fontSize: 11, fontWeight: 950, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
          Hands-on visual
        </div>
        {prompt && (
          <p style={{ margin: '8px 0 0', color: '#e5f2ff', fontSize: 17, lineHeight: 1.45, fontWeight: 850 }}>
            {prompt}
          </p>
        )}
      </div>
      <span style={{
        color: completed || interaction.isCorrect ? '#b7f7d8' : interaction.hasInteracted ? '#ffc1bd' : '#a9bed2',
        border: completed || interaction.isCorrect ? '1px solid rgba(52,211,153,0.34)' : interaction.hasInteracted ? '1px solid rgba(255,107,107,0.34)' : '1px solid rgba(125,211,252,0.16)',
        background: completed || interaction.isCorrect ? 'rgba(52,211,153,0.10)' : interaction.hasInteracted ? 'rgba(255,107,107,0.10)' : 'rgba(125,211,252,0.08)',
        borderRadius: 999,
        padding: '7px 11px',
        fontSize: 10,
        fontWeight: 950,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
      }}>
        {statusLabel(interaction, completed)}
      </span>
      <span style={{ display: 'none' }}>{type}</span>
    </div>
  )
}

function Feedback({ interaction, explanation }) {
  if (!interaction.hasInteracted) return null
  return (
    <div style={{
      marginTop: 14,
      border: interaction.isCorrect ? '1px solid rgba(52,211,153,0.32)' : '1px solid rgba(255,107,107,0.36)',
      borderRadius: 18,
      background: interaction.isCorrect
        ? 'linear-gradient(135deg, rgba(52,211,153,0.13), rgba(125,211,252,0.07))'
        : 'rgba(255,107,107,0.10)',
      color: interaction.isCorrect ? '#c7ffe5' : '#ffc1bd',
      padding: '12px 14px',
      fontSize: 14,
      lineHeight: 1.5,
      fontWeight: 800,
      boxShadow: interaction.isCorrect ? '0 0 34px rgba(52,211,153,0.10)' : 'none',
    }}>
      <strong style={{ display: 'block', marginBottom: 4 }}>{interaction.isCorrect ? 'Correct. Continue is ready.' : 'Not that part yet.'}</strong>
      {interaction.feedbackMessage || (interaction.isCorrect ? explanation || 'That target directly supports the concept.' : 'Use the prompt and try another part of the visual.')}
    </div>
  )
}

function Burst({ active, left = '50%', top = '50%' }) {
  if (!active) return null
  return (
    <div style={{ position: 'absolute', left, top, width: 170, height: 170, pointerEvents: 'none', transform: 'translate(-50%, -50%)' }}>
      {[0, 1, 2].map((index) => (
        <span
          key={index}
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: 90 + index * 26,
            height: 90 + index * 26,
            borderRadius: '50%',
            border: `1px solid ${index === 1 ? blue : accent}`,
            animation: `domainBurst ${760 + index * 140}ms ease-out both`,
            animationDelay: `${index * 70}ms`,
          }}
        />
      ))}
    </div>
  )
}

function Selectable({ children, selected, correct, wrong, disabled, onClick, style = {} }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      style={{
        border: correct
          ? '1px solid rgba(52,211,153,0.55)'
          : wrong
            ? '1px solid rgba(255,107,107,0.58)'
            : selected
              ? '1px solid rgba(125,211,252,0.48)'
              : '1px solid rgba(255,255,255,0.10)',
        borderRadius: 15,
        background: correct
          ? 'rgba(52,211,153,0.14)'
          : wrong
            ? 'rgba(255,107,107,0.12)'
            : selected
              ? 'rgba(125,211,252,0.12)'
              : 'rgba(255,255,255,0.045)',
        boxShadow: correct
          ? '0 0 28px rgba(52,211,153,0.16)'
          : wrong
            ? '0 0 28px rgba(255,107,107,0.12)'
            : 'none',
        color: '#f5f8fb',
        cursor: disabled ? 'default' : 'pointer',
        fontFamily: font,
        fontSize: 14,
        fontWeight: 850,
        lineHeight: 1.35,
        padding: '11px 13px',
        textAlign: 'left',
        transition: 'border-color 160ms ease, background 160ms ease, box-shadow 160ms ease, transform 160ms ease',
        ...style,
      }}
    >
      {children}
    </button>
  )
}

function BackupChoices({ choices = [], interaction, completed, onPick, label = 'Backup choices' }) {
  if (!choices.length) return null
  return (
    <div style={{ display: 'grid', gap: 9, marginTop: 12 }}>
      <div style={{ color: '#7f94aa', fontSize: 10, fontWeight: 950, letterSpacing: '0.10em', textTransform: 'uppercase' }}>
        {label}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {choices.map((choice) => {
          const selected = normalizeAnswer(interaction.selectedOption) === normalizeAnswer(choice)
          return (
            <Selectable
              key={choice}
              disabled={completed || interaction.isCorrect}
              selected={selected}
              correct={selected && interaction.isCorrect}
              wrong={selected && interaction.hasInteracted && !interaction.isCorrect}
              onClick={() => onPick(choice)}
              style={{ padding: '9px 11px', fontSize: 13 }}
            >
              {choice}
            </Selectable>
          )
        })}
      </div>
    </div>
  )
}

function CodeOutputVisual({ data, result, completed, onSelect }) {
  const code = clean(data.code, 'print("Hello")')
  const output = clean(data.output, 'Hello')
  const highlightedLine = Number(data.highlightedLine) || null
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.15fr) minmax(220px,0.85fr)', gap: 14 }}>
      <pre style={{ ...panelStyle, margin: 0, overflow: 'hidden', padding: '12px 0', color: '#dff6ff', fontSize: 14, lineHeight: 1.65 }}>
        {code.split('\n').map((line, index) => {
          const lineNumber = index + 1
          return (
            <div key={`${line}-${lineNumber}`} style={{
              display: 'grid',
              gridTemplateColumns: '38px minmax(0,1fr)',
              gap: 10,
              padding: '2px 14px',
              background: highlightedLine === lineNumber ? 'rgba(14,245,194,0.12)' : 'transparent',
              borderLeft: highlightedLine === lineNumber ? `3px solid ${accent}` : '3px solid transparent',
              fontFamily: "'SF Mono','Fira Code','Cascadia Code',monospace",
            }}>
              <span style={{ color: highlightedLine === lineNumber ? accent : '#52677c', textAlign: 'right' }}>{lineNumber}</span>
              <code>{line || ' '}</code>
            </div>
          )
        })}
      </pre>
      <div style={{ ...panelStyle, padding: 14, display: 'grid', alignContent: 'space-between', gap: 14 }}>
        <div>
          <div style={{ color: blue, fontSize: 11, fontWeight: 950, textTransform: 'uppercase', letterSpacing: '0.10em', marginBottom: 10 }}>
            Output console
          </div>
          <div style={{ minHeight: 58, borderRadius: 14, background: 'rgba(0,0,0,0.30)', border: '1px solid rgba(255,255,255,0.08)', padding: 14, color: '#cafff1', fontFamily: "'SF Mono','Fira Code','Cascadia Code',monospace", fontSize: 20 }}>
            {output}
          </div>
        </div>
        <Selectable disabled={completed} selected={Boolean(result)} correct={result?.correct} wrong={result && !result.correct} onClick={() => onSelect(output, true, { targetId: 'output', option: output, correctMessage: 'The console shows this exact output.' })}>
          This is what appears on screen
        </Selectable>
      </div>
    </div>
  )
}

function FreeBodyDiagramVisual({ data, interaction, completed, onSelect, correctAnswer }) {
  const objectLabel = clean(data.objectLabel, 'object')
  const promptText = `${data.prompt || ''} ${correctAnswer || ''}`
  const arrows = safeArray(data.arrows, [
    { direction: 'down', label: 'gravity', correct: true },
    { direction: 'up', label: 'normal force', correct: false },
  ]).slice(0, 4).map((arrow) => {
    const label = clean(arrow.label, arrow.direction || 'force')
    const direction = clean(arrow.direction, 'down').toLowerCase()
    const semanticCorrect = semanticIncludes(promptText, ['gravity', 'downward', 'down']) && (label.toLowerCase().includes('gravity') || direction === 'down')
    return {
      ...arrow,
      id: `arrow-${direction}-${normalizeAnswer(label)}`,
      direction,
      label,
      correct: Boolean(arrow.correct || semanticCorrect || matchesAnswer(label, correctAnswer) || matchesAnswer(direction, correctAnswer)),
    }
  })
  const geometry = {
    down: { x1: 220, y1: 162, x2: 220, y2: 288, labelX: 236, labelY: 256 },
    up: { x1: 220, y1: 118, x2: 220, y2: 18, labelX: 236, labelY: 50 },
    left: { x1: 176, y1: 140, x2: 42, y2: 140, labelX: 54, labelY: 116 },
    right: { x1: 264, y1: 140, x2: 398, y2: 140, labelX: 310, labelY: 116 },
  }
  const choices = explicitChoices(data)
  return (
    <div>
      <div style={{ ...panelStyle, padding: 14, display: 'grid', placeItems: 'center', minHeight: 340 }}>
        <svg viewBox="0 0 440 310" width="100%" height="330" role="img" aria-label="Free body diagram">
          <defs>
            <marker id="domain-arrow-default" markerWidth="12" markerHeight="12" refX="8" refY="4" orient="auto">
              <path d="M0,0 L0,8 L9,4 z" fill={accent} />
            </marker>
            <marker id="domain-arrow-good" markerWidth="12" markerHeight="12" refX="8" refY="4" orient="auto">
              <path d="M0,0 L0,8 L9,4 z" fill="#34d399" />
            </marker>
            <marker id="domain-arrow-bad" markerWidth="12" markerHeight="12" refX="8" refY="4" orient="auto">
              <path d="M0,0 L0,8 L9,4 z" fill={danger} />
            </marker>
          </defs>
          <rect x="170" y="102" width="100" height="76" rx="16" fill="rgba(125,211,252,0.12)" stroke="rgba(125,211,252,0.42)" strokeWidth="2" />
          <text x="220" y="147" textAnchor="middle" fill="#f5f8fb" fontSize="20" fontWeight="850">{objectLabel}</text>
          {arrows.map((arrow, index) => {
            const g = geometry[arrow.direction] || geometry.down
            const selectedState = targetState(interaction, arrow.id)
            const color = selectedState === 'is-correct' ? '#34d399' : selectedState === 'is-wrong' ? danger : accent
            const marker = selectedState === 'is-correct' ? 'url(#domain-arrow-good)' : selectedState === 'is-wrong' ? 'url(#domain-arrow-bad)' : 'url(#domain-arrow-default)'
            return (
              <g
                key={`${arrow.label}-${index}`}
                className={`domain-visual-target ${selectedState}`}
                onClick={() => !completed && onSelect(arrow.label, arrow.correct, {
                  targetId: arrow.id,
                  option: arrow.label,
                  correctMessage: `${arrow.label} is the force the prompt is asking for.`,
                  wrongMessage: `${arrow.label} is a real force here, but it is not the requested arrow.`,
                })}
                style={{ cursor: completed ? 'default' : 'pointer' }}
              >
                <line x1={g.x1} y1={g.y1} x2={g.x2} y2={g.y2} stroke={color} strokeWidth="7" strokeLinecap="round" markerEnd={marker} />
                <line x1={g.x1} y1={g.y1} x2={g.x2} y2={g.y2} stroke="transparent" strokeWidth="28" strokeLinecap="round" />
                <text x={g.labelX} y={g.labelY} fill={color} fontSize="15" fontWeight="900">{arrow.label}</text>
                {selectedState === 'is-correct' && <text x={g.labelX} y={g.labelY + 22} fill="#b7f7d8" fontSize="12" fontWeight="950">OK</text>}
              </g>
            )
          })}
        </svg>
      </div>
      <BackupChoices choices={choices} interaction={interaction} completed={completed} onPick={(choice) => {
        const matched = arrows.find((arrow) => matchesAnswer(arrow.label, choice) || matchesAnswer(choice, arrow.label))
        onSelect(choice, matched ? matched.correct : matchesAnswer(choice, correctAnswer), {
          targetId: matched?.id || choice,
          option: choice,
          correctMessage: matched ? `${matched.label} is the matching arrow.` : '',
        })
      }} />
    </div>
  )
}

function GraphVisual({ data, interaction, completed, onSelect, correctAnswer }) {
  const points = safeArray(data.points, [[0, 0], [1, 2], [2, 4]]).slice(0, 6)
  const xLabel = clean(data.xLabel, 'x')
  const yLabel = clean(data.yLabel, 'y')
  const highlight = normalizeAnswer(data.highlight || correctAnswer || 'slope')
  const targetText = `${highlight} ${correctAnswer || ''} ${data.prompt || ''}`
  const maxX = Math.max(...points.map((point) => Number(point[0]) || 0), 1)
  const maxY = Math.max(...points.map((point) => Number(point[1]) || 0), 1)
  const toX = (x) => 50 + ((Number(x) || 0) / maxX) * 330
  const toY = (y) => 258 - ((Number(y) || 0) / maxY) * 205
  const path = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${toX(point[0])} ${toY(point[1])}`).join(' ')
  const p0 = points[0] || [0, 0]
  const p1 = points[1] || [1, 1]
  const targets = [
    { id: 'slope', label: 'slope line', correct: semanticIncludes(targetText, ['slope', 'line', 'trend']) },
    { id: 'run', label: 'run', correct: semanticIncludes(targetText, ['run', 'horizontal']) },
    { id: 'rise', label: 'rise', correct: semanticIncludes(targetText, ['rise', 'vertical']) },
    { id: 'point-start', label: 'first point', correct: semanticIncludes(targetText, ['point', 'first point', 'start']) },
    { id: 'point-end', label: 'second point', correct: semanticIncludes(targetText, ['second point', 'end point']) },
  ]
  if (!targets.some((target) => target.correct)) {
    targets[0].correct = true
  }
  const choose = (id, label) => {
    const target = targets.find((entry) => entry.id === id)
    onSelect(label, Boolean(target?.correct || matchesAnswer(id, correctAnswer) || matchesAnswer(label, correctAnswer)), {
      targetId: id,
      option: label,
      correctMessage: `That highlighted ${label} is the graph feature for this concept.`,
      wrongMessage: `${label} is on the graph, but it is not the feature this prompt asks for.`,
    })
  }
  const stateFor = (id) => targetState(interaction, id)
  const colorFor = (id, fallback) => stateFor(id) === 'is-correct' ? '#34d399' : stateFor(id) === 'is-wrong' ? danger : fallback
  return (
    <div>
      <div style={{ ...panelStyle, position: 'relative', padding: 14, minHeight: 360 }}>
        <Burst active={interaction.isCorrect} />
        <svg viewBox="0 0 430 300" width="100%" height="350" role="img" aria-label="Interactive graph visual">
          {Array.from({ length: 7 }).map((_, index) => (
            <g key={index}>
              <line x1={50 + index * 55} y1="40" x2={50 + index * 55} y2="258" stroke="rgba(255,255,255,0.065)" />
              <line x1="50" y1={258 - index * 34} x2="392" y2={258 - index * 34} stroke="rgba(255,255,255,0.065)" />
            </g>
          ))}
          <line x1="50" y1="258" x2="392" y2="258" stroke="rgba(255,255,255,0.34)" strokeWidth="2" />
          <line x1="50" y1="258" x2="50" y2="34" stroke="rgba(255,255,255,0.34)" strokeWidth="2" />
          <g className={`domain-visual-target ${stateFor('slope')}`} onClick={() => !completed && choose('slope', 'slope line')} style={{ cursor: completed ? 'default' : 'pointer' }}>
            <path d={path} fill="none" stroke={colorFor('slope', accent)} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
            <path d={path} fill="none" stroke="transparent" strokeWidth="28" strokeLinecap="round" strokeLinejoin="round" />
          </g>
          {points.length >= 2 && (
            <>
              <g className={`domain-visual-target ${stateFor('run')}`} onClick={() => !completed && choose('run', 'run')} style={{ cursor: completed ? 'default' : 'pointer' }}>
                <line x1={toX(p0[0])} y1={toY(p0[1])} x2={toX(p1[0])} y2={toY(p0[1])} stroke={colorFor('run', amber)} strokeWidth="6" strokeDasharray="7 7" />
                <line x1={toX(p0[0])} y1={toY(p0[1])} x2={toX(p1[0])} y2={toY(p0[1])} stroke="transparent" strokeWidth="26" />
                <text x={(toX(p0[0]) + toX(p1[0])) / 2 - 12} y={toY(p0[1]) + 24} fill={colorFor('run', amber)} fontSize="14" fontWeight="950">run</text>
              </g>
              <g className={`domain-visual-target ${stateFor('rise')}`} onClick={() => !completed && choose('rise', 'rise')} style={{ cursor: completed ? 'default' : 'pointer' }}>
                <line x1={toX(p1[0])} y1={toY(p0[1])} x2={toX(p1[0])} y2={toY(p1[1])} stroke={colorFor('rise', purple)} strokeWidth="6" strokeDasharray="7 7" />
                <line x1={toX(p1[0])} y1={toY(p0[1])} x2={toX(p1[0])} y2={toY(p1[1])} stroke="transparent" strokeWidth="26" />
                <text x={toX(p1[0]) + 12} y={(toY(p0[1]) + toY(p1[1])) / 2} fill={colorFor('rise', purple)} fontSize="14" fontWeight="950">rise</text>
              </g>
            </>
          )}
          {points.map((point, index) => {
            const id = index === 0 ? 'point-start' : index === 1 ? 'point-end' : `point-${index}`
            const state = stateFor(id)
            return (
              <g key={`${point[0]}-${point[1]}-${index}`} className={`domain-visual-target ${state}`} onClick={() => !completed && choose(id, `point ${index + 1}`)} style={{ cursor: completed ? 'default' : 'pointer' }}>
                <circle cx={toX(point[0])} cy={toY(point[1])} r="9" fill="#07111d" stroke={colorFor(id, blue)} strokeWidth="4" />
                <circle cx={toX(point[0])} cy={toY(point[1])} r="20" fill="transparent" />
              </g>
            )
          })}
          <text x="392" y="282" fill="#91a7bb" fontSize="13" textAnchor="end">{xLabel}</text>
          <text x="20" y="42" fill="#91a7bb" fontSize="13" transform="rotate(-90 20 42)">{yLabel}</text>
        </svg>
      </div>
      <BackupChoices choices={explicitChoices(data)} interaction={interaction} completed={completed} onPick={(choice) => {
        const matched = targets.find((target) => matchesAnswer(target.label, choice) || matchesAnswer(target.id, choice))
        choose(matched?.id || choice, choice)
      }} />
    </div>
  )
}

function normalizeSentence(value = '') {
  return normalizeAnswer(value).replace(/\s+/g, ' ').trim()
}

function TileBuilder({ data, interaction, completed, onSelect, mode }) {
  const target = clean(data.target || data.correctSentence || data.answer, mode === 'dialogue' ? 'Quiero agua.' : 'F = m x a')
  const pieces = safeArray(data.pieces || data.wordTiles, mode === 'dialogue' ? ['agua', 'quiero', 'yo', 'el'] : ['F', '=', 'm', 'x', 'a'])
    .map((piece) => clean(piece))
    .filter(Boolean)
  const [chosen, setChosen] = useState([])
  const available = pieces.map((piece, index) => ({ piece, index })).filter((entry) => !chosen.some((item) => item.index === entry.index))
  const sentence = chosen.map((item) => item.piece).join(' ')
  const targetLength = normalizeSentence(target).split(' ').filter(Boolean).length || pieces.length

  function choose(entry) {
    if (completed || interaction.isCorrect) return
    const next = [...chosen, entry]
    const built = next.map((item) => item.piece).join(' ')
    setChosen(next)
    if (next.length >= targetLength) {
      const correct = normalizeSentence(built) === normalizeSentence(target)
      onSelect(built, correct, {
        targetId: 'builder',
        option: built,
        correctMessage: mode === 'dialogue' ? 'The words snapped into the correct sentence.' : 'The pieces are in the correct order.',
        wrongMessage: mode === 'dialogue' ? 'The words are all visible, but the order is not the sentence yet.' : 'Those pieces are present, but the order is not the target equation.',
      })
    }
  }

  function removeChosen(index) {
    if (completed || interaction.isCorrect) return
    setChosen((current) => current.filter((_, itemIndex) => itemIndex !== index))
  }

  const builderWrong = interaction.hasInteracted && !interaction.isCorrect
  return (
    <div style={{ display: 'grid', gap: 14 }}>
      {mode === 'dialogue' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,0.9fr) minmax(0,1.1fr)', gap: 12 }}>
          <div style={{ ...panelStyle, padding: 16 }}>
            <div style={{ color: blue, fontSize: 11, fontWeight: 950, textTransform: 'uppercase', letterSpacing: '0.10em', marginBottom: 8 }}>
              {clean(data.scenario, 'Scenario')}
            </div>
            <strong style={{ color: '#f5f8fb', fontSize: 20, lineHeight: 1.35 }}>{clean(data.nativePrompt, 'I want water.')}</strong>
          </div>
          <div style={{ ...panelStyle, padding: 16, borderColor: interaction.isCorrect ? 'rgba(52,211,153,0.34)' : builderWrong ? 'rgba(255,107,107,0.34)' : 'rgba(14,245,194,0.20)' }}>
            <div style={{ color: interaction.isCorrect ? '#34d399' : accent, fontSize: 11, fontWeight: 950, textTransform: 'uppercase', letterSpacing: '0.10em', marginBottom: 8 }}>
              {clean(data.targetLanguage, 'Target language')}
            </div>
            <div className={builderWrong ? 'domain-visual-target is-wrong' : ''} style={{ minHeight: 44, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
              {chosen.length === 0 && <strong style={{ color: '#6f8297', fontSize: 18 }}>Build the sentence...</strong>}
              {chosen.map((item, index) => (
                <button
                  key={`${item.piece}-${item.index}`}
                  type="button"
                  disabled={completed || interaction.isCorrect}
                  onClick={() => removeChosen(index)}
                  className="domain-word-snap"
                  style={{
                    border: interaction.isCorrect ? '1px solid rgba(52,211,153,0.45)' : '1px solid rgba(125,211,252,0.25)',
                    borderRadius: 13,
                    background: interaction.isCorrect ? 'rgba(52,211,153,0.14)' : 'rgba(125,211,252,0.10)',
                    color: '#f5f8fb',
                    padding: '9px 11px',
                    fontFamily: font,
                    fontSize: 18,
                    fontWeight: 950,
                    cursor: completed || interaction.isCorrect ? 'default' : 'pointer',
                  }}
                >
                  {item.piece}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      {mode !== 'dialogue' && (
        <div className={builderWrong ? 'domain-visual-target is-wrong' : ''} style={{ ...panelStyle, padding: 18, borderColor: interaction.isCorrect ? 'rgba(52,211,153,0.34)' : builderWrong ? 'rgba(255,107,107,0.34)' : 'rgba(14,245,194,0.20)', color: '#f5f8fb', fontSize: 26, fontWeight: 950, textAlign: 'center', minHeight: 78 }}>
          {sentence || 'Build the equation...'}
        </div>
      )}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        {available.map((entry) => (
          <Selectable key={`${entry.piece}-${entry.index}`} disabled={completed || interaction.isCorrect} onClick={() => choose(entry)} style={{ textAlign: 'center', fontSize: 17, padding: '13px 16px' }}>
            {entry.piece}
          </Selectable>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <Selectable disabled={completed || interaction.isCorrect || chosen.length === 0} onClick={() => {
          setChosen([])
        }}>
          Reset
        </Selectable>
      </div>
    </div>
  )
}

function EmailThreatScanVisual({ data, interaction, completed, onSelect, correctAnswer }) {
  const redFlags = safeArray(data.redFlags, ['fake domain', 'urgency', 'threatening language']).map(clean)
  const targetFlag = clean(correctAnswer || data.correctFlag || data.targetFlag)
  const promptText = `${data.prompt || ''} ${targetFlag}`
  const sender = clean(data.sender, 'support@paypaI-security.com')
  const subject = clean(data.subject, 'Urgent: Verify your account')
  const body = clean(data.body, 'Click this link now or your account will be closed.')
  const regions = [
    { id: 'fake-domain', label: 'fake domain', title: 'Sender', value: sender, reason: 'The sender domain is designed to look trusted.' },
    { id: 'urgency', label: 'urgency', title: 'Subject', value: subject, reason: 'Urgent language pressures the reader to act fast.' },
    { id: 'threatening-language', label: 'threatening language', title: 'Message body', value: body, reason: 'The threat tries to scare the reader into clicking.' },
  ].map((region) => {
    const targetMatch = targetFlag
      ? matchesAnswer(region.label, targetFlag) || matchesAnswer(region.id, targetFlag)
      : redFlags.some((flag) => matchesAnswer(flag, region.label) || matchesAnswer(flag, region.id))
    const promptMatch = !targetFlag && (
      semanticIncludes(promptText, ['sender', 'domain']) && region.id === 'fake-domain'
      || semanticIncludes(promptText, ['urgent', 'urgency', 'pressure']) && region.id === 'urgency'
      || semanticIncludes(promptText, ['threat', 'closed', 'body']) && region.id === 'threatening-language'
    )
    return { ...region, correct: targetMatch || promptMatch }
  })
  if (!regions.some((region) => region.correct)) {
    regions.forEach((region) => {
      if (redFlags.some((flag) => matchesAnswer(flag, region.label))) region.correct = true
    })
  }
  return (
    <div>
      <div style={{ ...panelStyle, overflow: 'hidden', maxWidth: 760, margin: '0 auto' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#8ca1b6', fontSize: 12, fontWeight: 950, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Inbox message
        </div>
        {regions.map((region) => {
          const state = targetState(interaction, region.id)
          const color = state === 'is-correct' ? '#34d399' : state === 'is-wrong' ? danger : blue
          return (
            <button
              key={region.id}
              type="button"
              disabled={completed || interaction.isCorrect}
              onClick={() => onSelect(region.label, region.correct, {
                targetId: region.id,
                option: region.label,
                correctMessage: region.reason,
                wrongMessage: `${region.title} is worth reading, but it is not the requested red flag.`,
              })}
              className={`domain-visual-target ${state}`}
              style={{
                display: 'block',
                width: '100%',
                border: 0,
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                background: state === 'is-correct' ? 'rgba(52,211,153,0.13)' : state === 'is-wrong' ? 'rgba(255,107,107,0.12)' : 'transparent',
                color: '#f5f8fb',
                padding: '17px 18px',
                textAlign: 'left',
                cursor: completed || interaction.isCorrect ? 'default' : 'pointer',
                fontFamily: font,
              }}
            >
              <span style={{ display: 'block', color, fontSize: 11, fontWeight: 950, textTransform: 'uppercase', letterSpacing: '0.10em', marginBottom: 6 }}>
                {region.title}
              </span>
              <strong style={{ fontSize: 17, lineHeight: 1.45 }}>{region.value}</strong>
              {state === 'is-correct' && <span style={{ display: 'block', color: '#b7f7d8', marginTop: 8, fontSize: 13, fontWeight: 850 }}>{region.reason}</span>}
            </button>
          )
        })}
      </div>
      <BackupChoices choices={explicitChoices(data)} interaction={interaction} completed={completed} onPick={(choice) => {
        const matched = regions.find((region) => matchesAnswer(region.label, choice) || matchesAnswer(region.id, choice))
        onSelect(choice, Boolean(matched?.correct || matchesAnswer(choice, targetFlag)), {
          targetId: matched?.id || choice,
          option: choice,
          correctMessage: matched?.reason || '',
        })
      }} />
    </div>
  )
}

function TerminalLogVisual({ data, result, completed, onSelect }) {
  const logs = safeArray(data.logs, [
    '10:01 login attempt user=admin failed',
    '10:02 login attempt user=admin failed',
    '10:03 login success user=admin ip=unknown',
  ])
  const suspiciousIndex = Number.isInteger(data.suspiciousIndex) ? data.suspiciousIndex : 2
  return (
    <div style={{ ...panelStyle, padding: 12, background: 'rgba(0,0,0,0.42)' }}>
      {logs.map((line, index) => {
        const selected = result?.answer === String(index)
        const correct = index === suspiciousIndex
        return (
          <button
            key={`${line}-${index}`}
            type="button"
            disabled={completed}
            onClick={() => onSelect(String(index), correct, {
              targetId: String(index),
              option: String(index),
              correctMessage: 'That log line shows the suspicious event.',
              wrongMessage: 'That line gives context, but it is not the suspicious event.',
            })}
            style={{
              display: 'grid',
              gridTemplateColumns: '42px minmax(0,1fr)',
              gap: 10,
              width: '100%',
              border: selected ? `1px solid ${correct ? 'rgba(52,211,153,0.48)' : 'rgba(255,107,107,0.50)'}` : '1px solid transparent',
              borderRadius: 10,
              background: selected ? (correct ? 'rgba(52,211,153,0.10)' : 'rgba(255,107,107,0.10)') : 'transparent',
              color: '#dff6ff',
              padding: '8px 10px',
              fontFamily: "'SF Mono','Fira Code','Cascadia Code',monospace",
              fontSize: 13,
              textAlign: 'left',
              cursor: completed ? 'default' : 'pointer',
            }}
          >
            <span style={{ color: '#647a8f' }}>{String(index + 1).padStart(2, '0')}</span>
            <code>{line}</code>
          </button>
        )
      })}
    </div>
  )
}

function CircuitDiagramVisual({ data, interaction, completed, onSelect, correctAnswer }) {
  const promptText = `${data.prompt || ''} ${data.question || ''} ${data.answer || ''} ${correctAnswer || ''}`
  const componentList = safeArray(data.components, ['battery', 'resistor', 'LED', 'wire']).map((item) => normalizeAnswer(item))
  const semanticCorrectId = semanticIncludes(promptText, ['limit current', 'limits current', 'protect', 'resistor'])
    ? 'resistor'
    : semanticIncludes(promptText, ['light', 'glow', 'led'])
      ? 'led'
      : semanticIncludes(promptText, ['power', 'voltage', 'battery'])
        ? 'battery'
        : semanticIncludes(promptText, ['connect', 'path', 'wire'])
          ? 'wire'
          : ''
  const targets = [
    { id: 'battery', label: 'Battery', terms: ['battery'], message: 'The battery supplies energy to the circuit.' },
    { id: 'wire', label: 'Wire path', terms: ['wire', 'path', 'current path'], message: 'The wire path gives current a closed loop to travel through.' },
    { id: 'resistor', label: 'Resistor', terms: ['resistor', 'limit current', 'protect'], message: 'The resistor limits current so the LED does not get damaged.' },
    { id: 'led', label: 'LED', terms: ['led', 'light'], message: 'The LED is the component that lights up when current flows.' },
  ].filter((target) => componentList.length === 0 || componentList.some((component) => target.terms.some((term) => normalizeAnswer(component).includes(normalizeAnswer(term)) || normalizeAnswer(term).includes(normalizeAnswer(component)))) || target.id === 'wire')
    .map((target) => ({
      ...target,
      correct: semanticCorrectId
        ? target.id === semanticCorrectId
        : target.terms.some((term) => matchesAnswer(term, correctAnswer)),
    }))
  if (!targets.some((target) => target.correct)) {
    const resistor = targets.find((target) => target.id === 'resistor')
    if (resistor) resistor.correct = true
  }
  const choose = (target) => onSelect(target.label, target.correct, {
    targetId: target.id,
    option: target.label,
    correctMessage: target.message,
    wrongMessage: `${target.label} matters in the circuit, but it is not the component this prompt asks for.`,
  })
  const stateFor = (id) => targetState(interaction, id)
  const strokeFor = (id, fallback) => stateFor(id) === 'is-correct' ? '#34d399' : stateFor(id) === 'is-wrong' ? danger : fallback
  const isLit = interaction.isCorrect
  return (
    <div>
      <div style={{ ...panelStyle, position: 'relative', padding: 14, minHeight: 365 }}>
        <Burst active={isLit} left="55%" top="48%" />
        <svg viewBox="0 0 480 300" width="100%" height="350" role="img" aria-label="Interactive LED circuit diagram">
          <g className={`domain-visual-target ${stateFor('wire')}`} onClick={() => !completed && choose(targets.find((target) => target.id === 'wire') || { id: 'wire', label: 'Wire path', correct: false })} style={{ cursor: completed ? 'default' : 'pointer' }}>
            <path d="M82 150 H184 M296 150 H390 M390 150 V232 H82 V150" fill="none" stroke={strokeFor('wire', 'rgba(125,211,252,0.48)')} strokeWidth="8" strokeLinecap="round" className={isLit ? 'domain-flow-lit' : ''} />
            <path d="M82 150 H184 M296 150 H390 M390 150 V232 H82 V150" fill="none" stroke="transparent" strokeWidth="30" strokeLinecap="round" />
            <text x="278" y="256" fill={strokeFor('wire', '#93a9bd')} fontSize="14" fontWeight="850">wire path</text>
          </g>
          <g className={`domain-visual-target ${stateFor('battery')}`} onClick={() => !completed && choose(targets.find((target) => target.id === 'battery') || { id: 'battery', label: 'Battery', correct: false })} style={{ cursor: completed ? 'default' : 'pointer' }}>
            <line x1="82" y1="108" x2="82" y2="192" stroke={strokeFor('battery', accent)} strokeWidth="7" />
            <line x1="60" y1="126" x2="60" y2="174" stroke={strokeFor('battery', accent)} strokeWidth="4" />
            <rect x="42" y="92" width="60" height="116" rx="12" fill="transparent" />
            <text x="36" y="78" fill={strokeFor('battery', '#dff6ff')} fontSize="15" fontWeight="900">battery</text>
            {stateFor('battery') === 'is-correct' && <text x="44" y="222" fill="#b7f7d8" fontSize="12" fontWeight="950">OK</text>}
          </g>
          <g className={`domain-visual-target ${stateFor('resistor')}`} onClick={() => !completed && choose(targets.find((target) => target.id === 'resistor') || { id: 'resistor', label: 'Resistor', correct: false })} style={{ cursor: completed ? 'default' : 'pointer' }}>
            <path d="M184 150 l14 -24 l14 48 l14 -48 l14 48 l14 -48 l14 48 l18 -24" fill="none" stroke={strokeFor('resistor', amber)} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M174 116 H300 V184 H174 Z" fill="transparent" />
            <text x="188" y="84" fill={strokeFor('resistor', '#ffe4a3')} fontSize="15" fontWeight="900">resistor</text>
            {stateFor('resistor') === 'is-correct' && <text x="214" y="214" fill="#b7f7d8" fontSize="12" fontWeight="950">OK</text>}
          </g>
          <g className={`domain-visual-target ${stateFor('led')}`} onClick={() => !completed && choose(targets.find((target) => target.id === 'led') || { id: 'led', label: 'LED', correct: false })} style={{ cursor: completed ? 'default' : 'pointer' }}>
            <circle cx="324" cy="150" r="31" fill={isLit ? 'rgba(52,211,153,0.24)' : 'rgba(14,245,194,0.12)'} stroke={strokeFor('led', accent)} strokeWidth="5" />
            <path d="M308 168 L324 126 L342 168 Z" fill={isLit ? 'rgba(52,211,153,0.30)' : 'rgba(14,245,194,0.24)'} stroke={strokeFor('led', accent)} strokeWidth="3" />
            <path d="M350 110 l28 -28 M370 112 l28 -28" stroke={isLit ? '#34d399' : accent} strokeWidth="4" strokeLinecap="round" opacity={isLit ? 1 : 0.62} />
            <circle cx="324" cy="150" r="52" fill={isLit ? 'rgba(52,211,153,0.08)' : 'transparent'} />
            <text x="306" y="84" fill={strokeFor('led', '#cafff1')} fontSize="15" fontWeight="900">LED</text>
            {stateFor('led') === 'is-correct' && <text x="310" y="226" fill="#b7f7d8" fontSize="12" fontWeight="950">OK</text>}
          </g>
        </svg>
      </div>
      <BackupChoices
        choices={explicitChoices(data)}
        interaction={interaction}
        completed={completed}
        onPick={(choice) => {
          const matched = targets.find((target) => matchesAnswer(target.label, choice) || target.terms.some((term) => matchesAnswer(term, choice)))
          if (matched) choose(matched)
          else onSelect(choice, matchesAnswer(choice, correctAnswer), { targetId: choice, option: choice })
        }}
      />
    </div>
  )
}

function AnatomyDiagramVisual({ data, result, completed, onSelect, correctAnswer }) {
  const labels = safeArray(data.labels, ['left ventricle', 'right atrium', 'aorta']).map(clean)
  const answer = clean(correctAnswer, labels[0])
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(250px,1fr) minmax(180px,0.65fr)', gap: 14 }}>
      <div style={{ ...panelStyle, padding: 14, display: 'grid', placeItems: 'center' }}>
        <svg viewBox="0 0 300 240" width="100%" height="245" role="img" aria-label="Anatomy diagram">
          <path d="M150 68 C108 22 45 70 70 128 C90 175 150 212 150 212 C150 212 210 175 230 128 C255 70 192 22 150 68 Z" fill="rgba(255,107,107,0.16)" stroke="rgba(255,107,107,0.50)" strokeWidth="4" />
          <circle cx="120" cy="118" r="25" fill="rgba(125,211,252,0.12)" stroke={blue} strokeWidth="3" />
          <circle cx="176" cy="118" r="25" fill="rgba(14,245,194,0.12)" stroke={accent} strokeWidth="3" />
          <path d="M150 66 C150 42 164 30 184 24" stroke={purple} strokeWidth="6" strokeLinecap="round" />
          <text x="150" y="226" fill="#dff6ff" fontSize="13" fontWeight="850" textAnchor="middle">{clean(data.system, 'heart')}</text>
        </svg>
      </div>
      <div style={{ display: 'grid', gap: 10, alignContent: 'center' }}>
        {labels.map((label) => {
          const selected = result?.answer === label
          return (
            <Selectable key={label} disabled={completed} selected={selected} correct={selected && result.correct} wrong={selected && !result.correct} onClick={() => onSelect(label, matchesAnswer(label, answer), { targetId: label, option: label })}>
              {label}
            </Selectable>
          )
        })}
      </div>
    </div>
  )
}

function ChemistryParticleVisual({ data, result, completed, onSelect, correctAnswer }) {
  const particles = safeArray(data.particles, [{ label: 'O', count: 1 }, { label: 'H', count: 2 }]).slice(0, 4)
  const answer = clean(correctAnswer, clean(data.concept, 'water molecule'))
  const expanded = particles.flatMap((particle) => Array.from({ length: Math.max(1, Number(particle.count) || 1) }, (_, index) => ({ label: clean(particle.label, 'Atom'), index })))
  return (
    <div style={{ ...panelStyle, padding: 18, display: 'grid', gap: 16, justifyItems: 'center' }}>
      <div style={{ position: 'relative', width: 280, height: 190 }}>
        {expanded.map((particle, index) => {
          const isMain = index === 0
          const x = isMain ? 120 : 70 + index * 68
          const y = isMain ? 74 : 124
          return (
            <button
              key={`${particle.label}-${index}`}
              type="button"
              disabled={completed}
              onClick={() => onSelect(clean(data.concept, particle.label), matchesAnswer(clean(data.concept, particle.label), answer), { targetId: clean(data.concept, particle.label), option: clean(data.concept, particle.label) })}
              style={{
                position: 'absolute',
                left: x,
                top: y,
                width: isMain ? 76 : 58,
                height: isMain ? 76 : 58,
                borderRadius: '50%',
                border: `2px solid ${isMain ? blue : accent}`,
                background: isMain ? 'rgba(125,211,252,0.18)' : 'rgba(14,245,194,0.16)',
                color: '#f5f8fb',
                fontSize: isMain ? 25 : 20,
                fontWeight: 950,
                boxShadow: `0 0 32px ${isMain ? 'rgba(125,211,252,0.14)' : 'rgba(14,245,194,0.14)'}`,
                cursor: completed ? 'default' : 'pointer',
              }}
            >
              {particle.label}
            </button>
          )
        })}
      </div>
      <Selectable disabled={completed} selected={Boolean(result)} correct={result?.correct} wrong={result && !result.correct} onClick={() => onSelect(clean(data.concept, answer), true, { targetId: clean(data.concept, answer), option: clean(data.concept, answer) })} style={{ textAlign: 'center' }}>
        {clean(data.concept, answer)}
      </Selectable>
    </div>
  )
}

function PortfolioChartVisual({ data, result, completed, onSelect, correctAnswer }) {
  const allocations = safeArray(data.allocations, [
    { label: 'Tech', value: 70 },
    { label: 'Healthcare', value: 15 },
    { label: 'Cash', value: 15 },
  ]).map((item) => ({ label: clean(item.label, 'Asset'), value: Math.max(0, Number(item.value) || 0) })).slice(0, 5)
  const total = allocations.reduce((sum, item) => sum + item.value, 0) || 1
  const largest = allocations.reduce((max, item) => (item.value > max.value ? item : max), allocations[0])
  const colors = [accent, blue, purple, amber, '#34d399']
  const gradient = allocations.reduce((acc, item, index) => {
    const start = acc.cursor
    const end = start + (item.value / total) * 100
    return {
      cursor: end,
      segments: [...acc.segments, `${colors[index % colors.length]} ${start}% ${end}%`],
    }
  }, { cursor: 0, segments: [] }).segments.join(', ')
  const answer = clean(correctAnswer, largest.label)
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '220px minmax(220px,1fr)', gap: 18, alignItems: 'center' }}>
      <button
        type="button"
        disabled={completed}
        onClick={() => onSelect(largest.label, matchesAnswer(largest.label, answer), { targetId: largest.label, option: largest.label })}
        style={{
          width: 210,
          height: 210,
          borderRadius: '50%',
          border: '1px solid rgba(255,255,255,0.14)',
          background: `conic-gradient(${gradient})`,
          boxShadow: '0 0 54px rgba(14,245,194,0.12), inset 0 0 0 38px rgba(3,8,15,0.78)',
          cursor: completed ? 'default' : 'pointer',
        }}
        aria-label="Portfolio allocation chart"
      />
      <div style={{ display: 'grid', gap: 10 }}>
        {allocations.map((item, index) => {
          const selected = result?.answer === item.label
          return (
            <Selectable key={item.label} disabled={completed} selected={selected} correct={selected && result.correct} wrong={selected && !result.correct} onClick={() => onSelect(item.label, matchesAnswer(item.label, answer), { targetId: item.label, option: item.label })}>
              <span style={{ display: 'inline-block', width: 9, height: 9, borderRadius: 999, background: colors[index % colors.length], marginRight: 8 }} />{item.label}: {item.value}%
            </Selectable>
          )
        })}
        <p style={{ margin: 0, color: '#b8c9d8', fontSize: 13, lineHeight: 1.55 }}>{clean(data.insight, `${largest.label} is the largest concentration.`)}</p>
      </div>
    </div>
  )
}

function DesignCanvasVisual({ data, result, completed, onSelect, correctAnswer }) {
  const issue = clean(data.issue || correctAnswer, 'low contrast')
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
      <button type="button" disabled={completed} onClick={() => onSelect(issue, true, { targetId: issue, option: issue })} style={{ ...panelStyle, padding: 14, textAlign: 'left', cursor: completed ? 'default' : 'pointer', fontFamily: font }}>
        <div style={{ color: danger, fontSize: 11, fontWeight: 950, textTransform: 'uppercase', letterSpacing: '0.10em', marginBottom: 12 }}>Before</div>
        <div style={{ minHeight: 120, borderRadius: 14, background: '#111827', padding: 16, display: 'grid', alignContent: 'center', gap: 10 }}>
          <strong style={{ color: '#737b86', fontSize: 26 }}>{clean(data.before, 'gray text on black')}</strong>
          <span style={{ color: '#5d6570', fontSize: 13 }}>Primary action</span>
        </div>
      </button>
      <div style={{ ...panelStyle, padding: 14 }}>
        <div style={{ color: accent, fontSize: 11, fontWeight: 950, textTransform: 'uppercase', letterSpacing: '0.10em', marginBottom: 12 }}>After</div>
        <div style={{ minHeight: 120, borderRadius: 14, background: 'linear-gradient(180deg, rgba(14,245,194,0.13), rgba(125,211,252,0.08)), #111827', padding: 16, display: 'grid', alignContent: 'center', gap: 10 }}>
          <strong style={{ color: '#f5f8fb', fontSize: 26 }}>{clean(data.after, 'brighter text with better spacing')}</strong>
          <span style={{ color: '#c7d7e6', fontSize: 13 }}>Primary action</span>
        </div>
      </div>
    </div>
  )
}

function SequenceBuilderVisual({ data, interaction, completed, onSelect, kind = 'timeline' }) {
  const sourceItems = safeArray(data.events || data.notes || data.atoms || data.branches || data.scenes || data.modelNodes || data.layers, ['Start', 'Middle', 'Result']).map(clean)
  const target = clean(data.target, sourceItems.join(' > '))
  const [chosen, setChosen] = useState([])
  const available = sourceItems.map((item, index) => ({ item, index })).filter((entry) => !chosen.some((chosenItem) => chosenItem.index === entry.index))

  function choose(entry) {
    if (completed || interaction.isCorrect) return
    const next = [...chosen, entry]
    setChosen(next)
    if (next.length >= sourceItems.length) {
      const answer = next.map((item) => item.item).join(' > ')
      onSelect(answer, matchesAnswer(answer, target) || normalizeAnswer(answer.replace(/>/g, ' ')) === normalizeAnswer(target.replace(/>/g, ' ')), {
        targetId: kind,
        option: answer,
        correctMessage: kind === 'timeline' ? 'The timeline is in the correct order.' : 'The sequence traces the concept correctly.',
        wrongMessage: 'Those pieces are useful, but the order does not match this concept yet.',
      })
    }
  }

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div style={{ ...panelStyle, padding: 16, minHeight: 132, borderColor: interaction.isCorrect ? 'rgba(52,211,153,0.34)' : interaction.hasInteracted && !interaction.isCorrect ? 'rgba(255,107,107,0.34)' : 'rgba(125,211,252,0.16)' }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          {chosen.length === 0 && <span style={{ color: '#70859a', fontSize: 16, fontWeight: 850 }}>Build the sequence...</span>}
          {chosen.map((entry, index) => (
            <div key={`${entry.item}-${entry.index}`} className="domain-word-snap" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{
                border: interaction.isCorrect ? '1px solid rgba(52,211,153,0.48)' : '1px solid rgba(125,211,252,0.24)',
                borderRadius: 15,
                background: interaction.isCorrect ? 'rgba(52,211,153,0.14)' : 'rgba(125,211,252,0.10)',
                color: '#f5f8fb',
                padding: '12px 14px',
                fontSize: 15,
                fontWeight: 950,
              }}>
                {entry.item}
              </span>
              {index < chosen.length - 1 && <span style={{ color: accent, fontWeight: 950 }}>→</span>}
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {available.map((entry) => (
          <Selectable key={`${entry.item}-${entry.index}`} disabled={completed || interaction.isCorrect} onClick={() => choose(entry)} style={{ textAlign: 'center' }}>
            {entry.item}
          </Selectable>
        ))}
      </div>
      <Selectable disabled={completed || interaction.isCorrect || chosen.length === 0} onClick={() => setChosen([])} style={{ width: 'fit-content' }}>
        Reset
      </Selectable>
    </div>
  )
}

function MapInteractionVisual({ data, interaction, completed, onSelect, correctAnswer }) {
  const regions = safeArray(data.regions, ['Region A', 'Region B', 'Region C']).map(clean).slice(0, 4)
  const route = safeArray(data.route, regions).map(clean)
  const answer = clean(correctAnswer || data.target, regions[1] || regions[0])
  const positions = [
    { x: 86, y: 92, w: 112, h: 82 },
    { x: 210, y: 70, w: 122, h: 92 },
    { x: 146, y: 178, w: 126, h: 76 },
    { x: 292, y: 178, w: 92, h: 66 },
  ]
  return (
    <div style={{ ...panelStyle, padding: 14, minHeight: 340 }}>
      <svg viewBox="0 0 460 300" width="100%" height="330" role="img" aria-label="Interactive map">
        <path d="M140 130 C190 90 240 110 282 116 C250 152 214 188 176 218" fill="none" stroke="rgba(14,245,194,0.48)" strokeWidth="5" strokeDasharray="8 8" className={interaction.isCorrect ? 'domain-flow-lit' : ''} />
        {regions.map((region, index) => {
          const pos = positions[index] || positions[0]
          const state = targetState(interaction, region)
          const color = state === 'is-correct' ? '#34d399' : state === 'is-wrong' ? danger : [accent, blue, purple, amber][index % 4]
          return (
            <g key={region} className={`domain-visual-target ${state}`} onClick={() => !completed && onSelect(region, matchesAnswer(region, answer) || route.includes(region) && matchesAnswer(route.join(' > '), answer), {
              targetId: region,
              option: region,
              correctMessage: 'That map target matches the concept.',
              wrongMessage: 'That area is on the map, but it is not the requested target.',
            })} style={{ cursor: completed ? 'default' : 'pointer' }}>
              <rect x={pos.x} y={pos.y} width={pos.w} height={pos.h} rx="24" fill={`${color}22`} stroke={color} strokeWidth="3" />
              <text x={pos.x + pos.w / 2} y={pos.y + pos.h / 2 + 5} textAnchor="middle" fill="#f5f8fb" fontSize="15" fontWeight="950">{region}</text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

function SliderOutcomeVisual({ data, interaction, completed, onSelect, correctAnswer, kind = 'probability' }) {
  const min = Number.isFinite(Number(data.min)) ? Number(data.min) : 0
  const max = Number.isFinite(Number(data.max)) ? Number(data.max) : 100
  const initial = Number.isFinite(Number(data.value)) ? Number(data.value) : Math.round((min + max) / 2)
  const [value, setValue] = useState(initial)
  const pct = ((value - min) / Math.max(1, max - min)) * 100
  const label = clean(data.variableLabel, kind === 'audio' ? 'Frequency' : kind === 'ecosystem' ? 'Population pressure' : 'Probability')
  const answer = clean(correctAnswer || data.target, `${label}: ${value}`)
  return (
    <div style={{ ...panelStyle, padding: 18, display: 'grid', gap: 18 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 90px', gap: 16, alignItems: 'center' }}>
        <label style={{ color: '#e5f2ff', fontSize: 16, fontWeight: 900 }}>{label}</label>
        <strong style={{ color: accent, fontSize: 24, textAlign: 'right' }}>{Math.round(value)}</strong>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        disabled={completed || interaction.isCorrect}
        onChange={(event) => setValue(Number(event.target.value))}
        style={{ width: '100%', accentColor: accent }}
      />
      <div style={{ height: 150, borderRadius: 18, background: 'rgba(255,255,255,0.045)', border: '1px solid rgba(255,255,255,0.08)', display: 'grid', alignItems: 'end', padding: 16 }}>
        {kind === 'audio' ? (
          <svg viewBox="0 0 520 120" width="100%" height="120">
            <path d={Array.from({ length: 80 }).map((_, i) => {
              const x = (i / 79) * 520
              const y = 60 + Math.sin(i * (0.14 + pct / 160)) * (18 + pct / 4)
              return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
            }).join(' ')} fill="none" stroke={accent} strokeWidth="5" strokeLinecap="round" />
          </svg>
        ) : (
          <div style={{ width: `${Math.max(8, pct)}%`, height: kind === 'ecosystem' ? 58 + pct * 0.6 : 46 + pct * 0.5, borderRadius: 18, background: `linear-gradient(135deg, ${accent}, ${blue})`, boxShadow: '0 0 34px rgba(14,245,194,0.22)', transition: 'width 160ms ease, height 160ms ease' }} />
        )}
      </div>
      <Selectable disabled={completed || interaction.isCorrect} selected={interaction.hasInteracted} correct={interaction.isCorrect} onClick={() => onSelect(`${label}: ${Math.round(value)}`, true, {
        targetId: 'slider',
        option: `${label}: ${Math.round(value)}`,
        correctMessage: answer || 'The changed variable shows the concept in action.',
      })} style={{ textAlign: 'center' }}>
        Use this setting
      </Selectable>
    </div>
  )
}

function ArchitectureStackVisual({ data, interaction, completed, onSelect, correctAnswer }) {
  const layers = safeArray(data.layers || data.modelNodes, ['Client', 'API', 'Database']).map(clean)
  const answer = clean(correctAnswer || data.target, layers[1] || layers[0])
  return (
    <div style={{ ...panelStyle, padding: 18, display: 'grid', gap: 12 }}>
      {layers.map((layer, index) => {
        const state = targetState(interaction, layer)
        const color = state === 'is-correct' ? '#34d399' : state === 'is-wrong' ? danger : [accent, blue, purple][index % 3]
        return (
          <button
            key={layer}
            type="button"
            disabled={completed || interaction.isCorrect}
            onClick={() => onSelect(layer, matchesAnswer(layer, answer), {
              targetId: layer,
              option: layer,
              correctMessage: `${layer} is the layer this concept focuses on.`,
              wrongMessage: `${layer} is part of the flow, but it is not the requested layer.`,
            })}
            className={`domain-visual-target ${state}`}
            style={{
              border: `1px solid ${color}66`,
              borderRadius: 18,
              background: `${color}16`,
              color: '#f5f8fb',
              padding: '17px 18px',
              fontFamily: font,
              fontSize: 18,
              fontWeight: 950,
              cursor: completed || interaction.isCorrect ? 'default' : 'pointer',
            }}
          >
            {layer}
            {index < layers.length - 1 && <span style={{ color: accent, marginLeft: 12 }}>↓</span>}
          </button>
        )
      })}
    </div>
  )
}

function SimpleIdentifyCards({ data, interaction, completed, onSelect, correctAnswer, sourceKey = 'labels' }) {
  const items = safeArray(data[sourceKey] || data.muscleGroups || data.strategies || data.scenes || data.regions, ['Option A', 'Option B', 'Option C']).map(clean)
  const answer = clean(correctAnswer || data.target || data.issue, items[0])
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
      {items.map((item, index) => {
        const state = targetState(interaction, item)
        const color = state === 'is-correct' ? '#34d399' : state === 'is-wrong' ? danger : [accent, blue, purple, amber][index % 4]
        return (
          <button
            key={item}
            type="button"
            disabled={completed || interaction.isCorrect}
            onClick={() => onSelect(item, matchesAnswer(item, answer), {
              targetId: item,
              option: item,
              correctMessage: `${item} matches the concept.`,
              wrongMessage: `${item} is plausible, but not the target insight.`,
            })}
            className={`domain-visual-target ${state}`}
            style={{
              minHeight: 130,
              border: `1px solid ${color}66`,
              borderRadius: 20,
              background: `linear-gradient(145deg, ${color}18, rgba(255,255,255,0.035))`,
              color: '#f5f8fb',
              padding: 16,
              fontFamily: font,
              fontSize: 17,
              fontWeight: 950,
              cursor: completed || interaction.isCorrect ? 'default' : 'pointer',
            }}
          >
            {item}
          </button>
        )
      })}
    </div>
  )
}

function FallbackVisual({ result, completed, onSelect, domainVisualType }) {
  return (
    <div style={{ ...panelStyle, padding: 18, display: 'grid', gap: 14, justifyItems: 'start' }}>
      <strong style={{ color: '#f5f8fb', fontSize: 22 }}>Visual unavailable</strong>
      <p style={{ margin: 0, color: '#b8c9d8', fontSize: 14, lineHeight: 1.6 }}>
        This lesson included an incomplete {domainVisualType.replace(/_/g, ' ')}. Use the prompt and continue.
      </p>
      <Selectable disabled={completed} selected={Boolean(result)} correct={result?.correct} onClick={() => onSelect('noticed', true, { targetId: 'fallback', option: 'noticed' })}>
        I noticed the key idea
      </Selectable>
    </div>
  )
}

export default function DomainVisualBlock({
  lessonId = '',
  slideId = '',
  conceptId = '',
  domain = '',
  domainVisualType = '',
  interactionPrimitive = 'identify',
  data = {},
  onAnswer,
  completed = false,
}) {
  const primitive = normalizePrimitive(interactionPrimitive)
  const [interactionState, setInteractionState] = useState({
    selectedTarget: '',
    selectedOption: '',
    builtAnswer: '',
    predictedAnswer: '',
    tracePath: [],
    manipulatedValue: '',
    comparedSelection: '',
    isCorrect: false,
    hasInteracted: false,
    feedbackMessage: '',
    attempts: 0,
  })
  const [wrongNonce, setWrongNonce] = useState(0)
  const safeData = useMemo(() => (data && typeof data === 'object' && !Array.isArray(data) ? data : {}), [data])
  const type = clean(domainVisualType, 'fallback_visual')
  const correctAnswer = clean(safeData.correctAnswer || safeData.answer)
  const prompt = clean(safeData.prompt)
  const explanation = clean(safeData.explanation)
  const locked = completed || interactionState.isCorrect
  const interaction = useMemo(() => ({
    ...interactionState,
    selectedVisualTarget: interactionState.selectedTarget,
    wrongNonce,
  }), [interactionState, wrongNonce])
  const result = useMemo(() => (
    interactionState.hasInteracted ? { answer: currentAnswerFromState(interactionState), correct: interactionState.isCorrect } : null
  ), [interactionState])

  const visualProps = useMemo(() => ({
    data: safeData,
    result,
    interaction,
    interactionPrimitive: primitive,
    completed: locked,
    correctAnswer,
    onSelect(answer, forcedCorrect = null, meta = {}) {
      if (locked) return
      const answerText = clean(answer)
      const targetId = clean(meta.targetId, answerText)
      const option = clean(meta.option, answerText)
      const nextAttempts = interactionState.attempts + 1
      const correct = typeof forcedCorrect === 'boolean'
        ? forcedCorrect
        : correctAnswer
          ? matchesAnswer(option || answerText, correctAnswer)
          : true
      const nextState = {
        selectedTarget: targetId,
        selectedOption: option,
        builtAnswer: primitive === 'build' ? option || answerText : '',
        predictedAnswer: primitive === 'predict' ? option || answerText : '',
        tracePath: primitive === 'trace' ? String(option || answerText).split(/\s*>\s*/).filter(Boolean) : [],
        manipulatedValue: primitive === 'manipulate' ? option || answerText : '',
        comparedSelection: primitive === 'compare' ? option || answerText : '',
        isCorrect: correct,
        hasInteracted: true,
        feedbackMessage: correct
          ? clean(meta.correctMessage, explanation || 'That target directly supports the concept.')
          : clean(meta.wrongMessage, 'That part is visible, but it is not the target for this prompt. Try another part of the visual.'),
        attempts: nextAttempts,
      }
      setInteractionState(nextState)
      if (correct) {
        onAnswer?.({
          lessonId,
          slideId,
          conceptId,
          interactionPrimitive: primitive,
          domainVisualType: type,
          answer: currentAnswerFromState(nextState),
          correct: true,
          target: targetId,
          attempts: nextAttempts,
          needsReview: nextAttempts > 1,
          timestamp: new Date().toISOString(),
        })
      } else {
        setWrongNonce((value) => value + 1)
      }
    },
  }), [conceptId, correctAnswer, explanation, interaction, interactionState.attempts, lessonId, locked, onAnswer, primitive, result, safeData, slideId, type])

  const Visual = {
    code_output_visual: CodeOutputVisual,
    free_body_diagram: FreeBodyDiagramVisual,
    graph_visual: GraphVisual,
    equation_builder: (props) => <TileBuilder {...props} mode="equation" />,
    dialogue_builder: (props) => <TileBuilder {...props} mode="dialogue" />,
    email_threat_scan: EmailThreatScanVisual,
    terminal_log_visual: TerminalLogVisual,
    circuit_diagram: CircuitDiagramVisual,
    anatomy_diagram: AnatomyDiagramVisual,
    chemistry_particle_visual: ChemistryParticleVisual,
    portfolio_chart_visual: PortfolioChartVisual,
    design_canvas_visual: DesignCanvasVisual,
    timeline_builder: (props) => <SequenceBuilderVisual {...props} kind="timeline" />,
    map_interaction: MapInteractionVisual,
    molecule_builder: (props) => <SequenceBuilderVisual {...props} kind="molecule" />,
    probability_visualizer: (props) => <SliderOutcomeVisual {...props} kind="probability" />,
    ecosystem_simulator: (props) => <SliderOutcomeVisual {...props} kind="ecosystem" />,
    architecture_stack_visual: ArchitectureStackVisual,
    audio_wave_visual: (props) => <SliderOutcomeVisual {...props} kind="audio" />,
    music_pattern_builder: (props) => <SequenceBuilderVisual {...props} kind="music" />,
    grammar_tree_visual: (props) => <SimpleIdentifyCards {...props} sourceKey="labels" />,
    body_motion_visual: (props) => <SimpleIdentifyCards {...props} sourceKey="muscleGroups" />,
    business_strategy_visual: (props) => <SimpleIdentifyCards {...props} sourceKey="strategies" />,
    logic_flow_visual: (props) => <SequenceBuilderVisual {...props} kind="logic" />,
    storytelling_scene_visual: (props) => <SimpleIdentifyCards {...props} sourceKey="scenes" />,
    ui_layout_visual: DesignCanvasVisual,
    ai_model_flow_visual: ArchitectureStackVisual,
  }[type] || FallbackVisual

  return (
    <div style={shellStyle}>
      <style>{DOMAIN_VISUAL_CSS}</style>
      <div style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        background: 'radial-gradient(circle at 12% 8%, rgba(14,245,194,0.12), transparent 30%), radial-gradient(circle at 92% 12%, rgba(125,211,252,0.13), transparent 34%)',
      }} />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <Header type={type} domain={domain} prompt={prompt} interaction={interaction} completed={completed} />
        <Visual {...visualProps} domainVisualType={type} />
        <Feedback interaction={interaction} explanation={explanation} />
      </div>
    </div>
  )
}
