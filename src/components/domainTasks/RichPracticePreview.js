'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import DomainTaskBase from './DomainTaskBase'

const CODE_INTERACTIONS = new Set(['codeSandbox', 'debugCode', 'miniProject'])
const SLOT_TASKS = new Set([
  'ProofWriting',
  'CauseEffectEssay',
  'PolicyDebate',
  'ReactionPrediction',
  'ArgumentMapping',
  'CaseStudyAnalysis',
  'PolicyBrief',
  'MockDebate',
])
const ORDER_TASKS = new Set(['StepByStepProblem', 'ConceptualExplainBack', 'TimelineOrdering', 'ExplainMechanism'])
const CHOICE_TASKS = new Set(['CaseAnalysis', 'NomenclatureDrills', 'FallacyIdentification', 'ConceptApplication'])
const SELECT_TEXT_TASKS = new Set(['SocraticDebate', 'AdversarialDebate', 'ResearchCritique'])

const DOMAIN_PALETTES = {
  CS_CODING: { color: '#0ef5c2', soft: 'rgba(14,245,194,0.13)', tint: 'rgba(14,245,194,0.07)' },
  MATHEMATICS: { color: '#60a5fa', soft: 'rgba(96,165,250,0.14)', tint: 'rgba(96,165,250,0.07)' },
  FOREIGN_LANGUAGE: { color: '#f97316', soft: 'rgba(249,115,22,0.15)', tint: 'rgba(249,115,22,0.07)' },
  PHYSICS: { color: '#a78bfa', soft: 'rgba(167,139,250,0.15)', tint: 'rgba(167,139,250,0.07)' },
  HISTORY: { color: '#facc15', soft: 'rgba(250,204,21,0.14)', tint: 'rgba(250,204,21,0.07)' },
  ECONOMICS: { color: '#34d399', soft: 'rgba(52,211,153,0.14)', tint: 'rgba(52,211,153,0.07)' },
  CHEMISTRY: { color: '#fb7185', soft: 'rgba(251,113,133,0.14)', tint: 'rgba(251,113,133,0.07)' },
  ENGINEERING: { color: '#f59e0b', soft: 'rgba(245,158,11,0.15)', tint: 'rgba(245,158,11,0.07)' },
  TECHNOLOGY: { color: '#38bdf8', soft: 'rgba(56,189,248,0.14)', tint: 'rgba(56,189,248,0.07)' },
  CYBERSECURITY: { color: '#22d3ee', soft: 'rgba(34,211,238,0.14)', tint: 'rgba(34,211,238,0.07)' },
  ML_AI: { color: '#22d3ee', soft: 'rgba(34,211,238,0.14)', tint: 'rgba(34,211,238,0.07)' },
  DATA_SCIENCE: { color: '#38bdf8', soft: 'rgba(56,189,248,0.14)', tint: 'rgba(56,189,248,0.07)' },
  STATISTICS: { color: '#60a5fa', soft: 'rgba(96,165,250,0.14)', tint: 'rgba(96,165,250,0.07)' },
  FINANCE: { color: '#facc15', soft: 'rgba(250,204,21,0.14)', tint: 'rgba(250,204,21,0.07)' },
  BUSINESS: { color: '#a78bfa', soft: 'rgba(167,139,250,0.15)', tint: 'rgba(167,139,250,0.07)' },
  PHILOSOPHY_LOGIC: { color: '#c084fc', soft: 'rgba(192,132,252,0.15)', tint: 'rgba(192,132,252,0.07)' },
  WRITING: { color: '#fbbf24', soft: 'rgba(251,191,36,0.14)', tint: 'rgba(251,191,36,0.07)' },
  READING_COMPREHENSION: { color: '#fbbf24', soft: 'rgba(251,191,36,0.14)', tint: 'rgba(251,191,36,0.07)' },
  PSYCHOLOGY: { color: '#38bdf8', soft: 'rgba(56,189,248,0.14)', tint: 'rgba(56,189,248,0.07)' },
  POLITICAL_SCIENCE: { color: '#818cf8', soft: 'rgba(129,140,248,0.15)', tint: 'rgba(129,140,248,0.07)' },
  GOVERNMENT_CIVICS: { color: '#818cf8', soft: 'rgba(129,140,248,0.15)', tint: 'rgba(129,140,248,0.07)' },
  BIOLOGY: { color: '#4ade80', soft: 'rgba(74,222,128,0.14)', tint: 'rgba(74,222,128,0.07)' },
  MEDICINE_HEALTH: { color: '#fb7185', soft: 'rgba(251,113,133,0.14)', tint: 'rgba(251,113,133,0.07)' },
  ENVIRONMENTAL_SCIENCE: { color: '#4ade80', soft: 'rgba(74,222,128,0.14)', tint: 'rgba(74,222,128,0.07)' },
  ART_DESIGN: { color: '#f472b6', soft: 'rgba(244,114,182,0.14)', tint: 'rgba(244,114,182,0.07)' },
  MUSIC: { color: '#c084fc', soft: 'rgba(192,132,252,0.15)', tint: 'rgba(192,132,252,0.07)' },
  COMMUNICATION: { color: '#7dd3fc', soft: 'rgba(125,211,252,0.14)', tint: 'rgba(125,211,252,0.07)' },
}

function paletteFor(domain) {
  return DOMAIN_PALETTES[domain] || DOMAIN_PALETTES.CS_CODING
}

function normalizeText(value) {
  return String(value || '').trim().toLowerCase()
}

function looksMathLike(value) {
  return /\\|[\^_=+\-*/()]|\d/.test(String(value || ''))
}

const MATH_COMMANDS = {
  '\\theta': 'θ',
  '\\pi': 'π',
  '\\Delta': 'Δ',
  '\\omega': 'ω',
  '\\cdot': '·',
  '\\deg': '°',
  '\\sum': '∑',
  '\\int': '∫',
  '\\to': '→',
  '\\rightleftharpoons': '⇌',
  '\\approx': '≈',
  '\\sin': 'sin',
  '\\cos': 'cos',
  '\\tan': 'tan',
}

function readBraced(value, start) {
  if (value[start] !== '{') return { body: '', end: start }
  let depth = 0
  for (let index = start; index < value.length; index += 1) {
    if (value[index] === '{') depth += 1
    if (value[index] === '}') {
      depth -= 1
      if (depth === 0) return { body: value.slice(start + 1, index), end: index + 1 }
    }
  }
  return { body: value.slice(start + 1), end: value.length }
}

function readScript(value, start) {
  if (value[start] === '{') return readBraced(value, start)
  return { body: value[start] || '', end: start + 1 }
}

function parseTeX(value, { chemistry = false } = {}) {
  const source = String(value || '')
    .replaceAll('Rprime', "R'")
    .replaceAll('~=', '\\approx')
    .replaceAll('->', '\\to')
    .replaceAll('<=>', '\\rightleftharpoons')
  const nodes = []
  let index = 0

  while (index < source.length) {
    if (source.startsWith('\\frac', index)) {
      const numerator = readBraced(source, index + 5)
      const denominator = readBraced(source, numerator.end)
      nodes.push(
        <span key={`frac-${index}`} className="math-frac">
          <span>{parseTeX(numerator.body, { chemistry })}</span>
          <span>{parseTeX(denominator.body, { chemistry })}</span>
        </span>
      )
      index = denominator.end
      continue
    }
    if (source.startsWith('\\sqrt', index)) {
      const radicand = readBraced(source, index + 5)
      nodes.push(<span key={`sqrt-${index}`} className="math-sqrt">√<span>{parseTeX(radicand.body, { chemistry })}</span></span>)
      index = radicand.end
      continue
    }
    const command = Object.keys(MATH_COMMANDS).find((key) => source.startsWith(key, index))
    if (command) {
      nodes.push(<span key={`cmd-${index}`}>{MATH_COMMANDS[command]}</span>)
      index += command.length
      continue
    }
    if (source[index] === '^' || source[index] === '_') {
      const script = readScript(source, index + 1)
      const Tag = source[index] === '^' ? 'sup' : 'sub'
      nodes.push(<Tag key={`script-${index}`}>{parseTeX(script.body, { chemistry })}</Tag>)
      index = script.end
      continue
    }
    if (source[index] === "'") {
      const secondPrime = source[index + 1] === "'"
      nodes.push(<sup key={`prime-${index}`}>{secondPrime ? '″' : '′'}</sup>)
      index += secondPrime ? 2 : 1
      continue
    }
    const char = source[index]
    if (!chemistry && /[A-Za-z]/.test(char)) {
      nodes.push(<i key={`v-${index}`}>{char}</i>)
    } else {
      nodes.push(char)
    }
    index += 1
  }

  return nodes
}

function MathText({ value, inline = false }) {
  return <span className={`math-text ${inline ? 'is-inline' : ''}`}>{parseTeX(value)}</span>
}

function MathInline({ value }) {
  return <MathText value={value} inline />
}

function ChemText({ value, inline = true }) {
  return <span className={`chem-text ${inline ? 'is-inline' : ''}`}>{parseTeX(value, { chemistry: true })}</span>
}

function LangText({ value }) {
  return (
    <span className="lang-text">
      <span>{value}</span>
      <span className="lang-speaker" aria-hidden="true">♪</span>
    </span>
  )
}

function getCard(cards = [], cardId) {
  return cards.find((card) => card.id === cardId)
}

function getZones(task) {
  return task.zones || task.targets || []
}

function makeInitialState(task) {
  if (task.taskType === 'GraphInterpretation') return { curve: '', direction: '', outcome: '' }
  if (task.taskType === 'BalanceEquations') {
    return { coefficients: Object.fromEntries((task.equation || []).map((molecule) => [molecule, 1])) }
  }
  if (task.taskType === 'AIConversationRoleplay') return { responseId: '', draft: '' }
  if (task.taskType === 'TimedPrompt') return { draft: '', checklist: {}, started: false, timeLeft: task.timerSeconds || 300 }
  if (task.taskType === 'RewriteForClarity') return { selectedCards: [], draft: '' }
  if (task.taskType === 'RubricFeedback') {
    return { selectedCards: [], ratings: Object.fromEntries((task.rubric || []).map((item) => [item.id, 0])) }
  }
  if (task.taskType === 'SystemsComparison') return { placements: {}, selectedCardId: null }
  if (task.taskType === 'GeneticsProblemSet') return { cells: {}, genotypeRatio: '', phenotypeRatio: '' }
  if (task.taskType === 'FillInTheBlank' || task.taskType === 'ApplicationProblem' || task.taskType === 'SolveWithUnits' || task.taskType === 'DiagramAnalysis' || task.taskType === 'LabelDiagram') {
    return { placements: {}, selectedCardId: null, answer: '' }
  }
  if (task.taskType === 'VocabDrills') return { matches: {}, selectedCardId: null, matched: [] }
  if (ORDER_TASKS.has(task.taskType)) {
    const order = (task.cards || []).map((card) => card.id)
    return { order: order.length > 2 ? [order[1], order[0], ...order.slice(2)] : order }
  }
  if (SLOT_TASKS.has(task.taskType)) return { placements: {}, selectedCardId: null }
  if (CHOICE_TASKS.has(task.taskType)) return { choices: {} }
  if (SELECT_TEXT_TASKS.has(task.taskType)) return { selectedCards: [], draft: '' }
  return { placements: {}, selectedCardId: null }
}

function isReady(task, state) {
  if (CODE_INTERACTIONS.has(task.interactionType)) return true
  if (task.taskType === 'GraphInterpretation') return Boolean(state.curve && state.direction && state.outcome)
  if (task.taskType === 'BalanceEquations') return true
  if (task.taskType === 'AIConversationRoleplay') return Boolean(state.responseId || state.draft?.trim())
  if (task.taskType === 'TimedPrompt') return Boolean(state.draft?.trim())
  if (task.taskType === 'RewriteForClarity') return Boolean(state.draft?.trim() && state.selectedCards?.length)
  if (task.taskType === 'RubricFeedback') return Boolean(state.selectedCards?.length && Object.values(state.ratings || {}).some(Boolean))
  if (task.taskType === 'SystemsComparison') return (task.cells || []).every((cell) => state.placements?.[cell.id])
  if (task.taskType === 'GeneticsProblemSet') return (task.cells || []).every((cell) => state.cells?.[cell.id]) && state.genotypeRatio && state.phenotypeRatio
  if (task.taskType === 'VocabDrills') return Object.keys(state.matches || {}).length > 0
  if (task.taskType === 'ApplicationProblem' || task.taskType === 'SolveWithUnits') {
    const required = Object.keys(task.correctMatches || {})
    return required.every((id) => state.placements?.[id]) && Boolean(state.answer?.trim())
  }
  if (task.taskType === 'DiagramAnalysis' || task.taskType === 'LabelDiagram' || task.taskType === 'FillInTheBlank') {
    return Object.keys(task.correctMatches || {}).every((id) => state.placements?.[id])
  }
  if (ORDER_TASKS.has(task.taskType)) return true
  if (SLOT_TASKS.has(task.taskType)) return Object.keys(task.correctMatches || {}).some((id) => state.placements?.[id])
  if (CHOICE_TASKS.has(task.taskType)) return (task.questions || []).every((question) => state.choices?.[question.id])
  if (SELECT_TEXT_TASKS.has(task.taskType)) return Boolean(state.selectedCards?.length && state.draft?.trim())
  return true
}

function countSlotMatches(task, placements = {}) {
  return Object.entries(task.correctMatches || {}).filter(([zoneId, cardId]) => placements[zoneId] === cardId).length
}

function buildSlotFeedback(task, placements = {}) {
  return Object.fromEntries(Object.entries(task.correctMatches || {}).map(([zoneId, expectedId]) => {
    const placed = placements[zoneId]
    const expected = getCard(task.cards || task.formulaTiles, expectedId)?.label || expectedId
    return [zoneId, placed ? { correct: placed === expectedId, expected } : null]
  }))
}

function makeResult(task, state) {
  if (task.taskType === 'GraphInterpretation') {
    const expected = task.expectedShift || {}
    const checks = {
      curve: state.curve === expected.curve,
      direction: state.direction === expected.direction,
      outcome: state.outcome === expected.outcome,
    }
    const score = Object.values(checks).filter(Boolean).length
    return resultFromScore(task, score, 3, `${score}/3 graph decisions match.`, checks)
  }

  if (task.taskType === 'BalanceEquations') {
    const expected = task.correctCoefficients || {}
    const checks = Object.fromEntries(Object.entries(expected).map(([molecule, value]) => [molecule, state.coefficients?.[molecule] === value]))
    const score = Object.values(checks).filter(Boolean).length
    return resultFromScore(task, score, Object.keys(expected).length, `${score}/${Object.keys(expected).length} coefficients are correct.`, checks)
  }

  if (task.taskType === 'AIConversationRoleplay') {
    const selected = (task.responseOptions || []).find((option) => option.id === state.responseId)
    const score = selected?.best || state.draft?.toLowerCase().includes('quisiera') ? 1 : 0
    return resultFromScore(task, score, 1, score ? 'The reply is natural enough for the scene.' : 'Try a polite Spanish order with a complete phrase.', { response: Boolean(score) })
  }

  if (task.taskType === 'TimedPrompt') {
    const checklistScore = (task.checklist || []).filter((item) => state.checklist?.[item.id] || normalizeText(state.draft).includes(normalizeText(item.keyword || item.label.split(' ')[0]))).length
    const keywordScore = (task.requiredKeywords || []).filter((keyword) => normalizeText(state.draft).includes(normalizeText(keyword))).length
    const total = (task.checklist?.length || 0) + (task.requiredKeywords?.length || 0)
    return resultFromScore(task, checklistScore + keywordScore, total, `${checklistScore} craft moves and ${keywordScore} key ideas are present.`)
  }

  if (task.taskType === 'RewriteForClarity') {
    const cardScore = (task.requiredCards || []).filter((id) => state.selectedCards?.includes(id)).length
    const keywordScore = (task.requiredKeywords || []).filter((keyword) => normalizeText(state.draft).includes(normalizeText(keyword))).length
    const total = (task.requiredCards?.length || 0) + (task.requiredKeywords?.length || 0)
    return resultFromScore(task, cardScore + keywordScore, total, `${cardScore} edit moves and ${keywordScore} rewrite anchors are present.`)
  }

  if (task.taskType === 'RubricFeedback') {
    const noteScore = (task.requiredCards || []).filter((id) => state.selectedCards?.includes(id)).length
    const ratingScore = Object.values(state.ratings || {}).filter(Boolean).length
    const total = (task.requiredCards?.length || 0) + (task.rubric?.length || 0)
    return resultFromScore(task, noteScore + ratingScore, total, `${ratingScore} rubric rows scored and ${noteScore} required notes selected.`)
  }

  if (task.taskType === 'SystemsComparison') {
    const checks = Object.fromEntries((task.cells || []).map((cell) => {
      const card = getCard(task.cards, state.placements?.[cell.id])
      return [cell.id, card?.label === cell.correct]
    }))
    const score = Object.values(checks).filter(Boolean).length
    return resultFromScore(task, score, task.cells?.length || 1, `${score}/${task.cells?.length || 0} matrix cells are correct.`, checks)
  }

  if (task.taskType === 'GeneticsProblemSet') {
    const cellChecks = Object.fromEntries((task.cells || []).map((cell) => [cell.id, state.cells?.[cell.id] === cell.correct]))
    const ratioChecks = {
      genotypeRatio: state.genotypeRatio === task.genotypeRatio,
      phenotypeRatio: state.phenotypeRatio === task.phenotypeRatio,
    }
    const score = [...Object.values(cellChecks), ...Object.values(ratioChecks)].filter(Boolean).length
    return resultFromScore(task, score, (task.cells?.length || 0) + 2, `${score}/${(task.cells?.length || 0) + 2} genetics checks are correct.`, { ...cellChecks, ...ratioChecks })
  }

  if (task.taskType === 'VocabDrills') {
    const checks = Object.fromEntries(Object.entries(task.correctMatches || {}).map(([zoneId, cardId]) => [zoneId, state.matches?.[zoneId] === cardId]))
    const score = Object.values(checks).filter(Boolean).length
    return resultFromScore(task, score, Object.keys(task.correctMatches || {}).length, `${score}/${Object.keys(task.correctMatches || {}).length} phrase pairs matched.`, checks)
  }

  if (task.taskType === 'ApplicationProblem' || task.taskType === 'SolveWithUnits') {
    const slotScore = countSlotMatches(task, state.placements)
    const answerScore = normalizeText(state.answer).includes(normalizeText(task.answer)) ? 1 : 0
    const total = Object.keys(task.correctMatches || {}).length + 1
    return resultFromScore(task, slotScore + answerScore, total, `${slotScore} reasoning tiles and ${answerScore ? 'the answer' : 'no answer'} matched.`, {
      ...buildSlotFeedback(task, state.placements),
      answer: Boolean(answerScore),
    })
  }

  if (task.taskType === 'DiagramAnalysis' || task.taskType === 'LabelDiagram' || task.taskType === 'FillInTheBlank' || SLOT_TASKS.has(task.taskType)) {
    const score = countSlotMatches(task, state.placements)
    const total = Object.keys(task.correctMatches || {}).length
    return resultFromScore(task, score, total, `${score}/${total} placements are correct.`, buildSlotFeedback(task, state.placements))
  }

  if (ORDER_TASKS.has(task.taskType)) {
    const correctOrder = task.correctOrder || []
    const checks = Object.fromEntries((state.order || []).map((id, index) => [id, correctOrder[index] === id]))
    const score = Object.values(checks).filter(Boolean).length
    return resultFromScore(task, score, correctOrder.length, `${score}/${correctOrder.length} items are in the right position.`, checks)
  }

  if (CHOICE_TASKS.has(task.taskType)) {
    const checks = Object.fromEntries((task.questions || []).map((question) => [question.id, state.choices?.[question.id] === question.correctOption]))
    const score = Object.values(checks).filter(Boolean).length
    return resultFromScore(task, score, task.questions?.length || 1, `${score}/${task.questions?.length || 0} choices match.`, checks)
  }

  if (SELECT_TEXT_TASKS.has(task.taskType)) {
    const cardScore = (task.requiredCards || []).filter((id) => state.selectedCards?.includes(id)).length
    const textScore = (task.requiredKeywords || []).filter((keyword) => normalizeText(state.draft).includes(normalizeText(keyword))).length
    const total = (task.requiredCards?.length || 0) + (task.requiredKeywords?.length || 0)
    return resultFromScore(task, cardScore + textScore, total, `${cardScore} evidence cards and ${textScore} key terms are present.`)
  }

  return resultFromScore(task, 0, 1, 'Interact with the task and check again.')
}

function resultFromScore(task, score, total, detail, checks = {}) {
  const safeTotal = Math.max(total || 1, 1)
  const passed = score >= safeTotal
  const partial = score > 0 && !passed
  return {
    passed,
    score,
    total: safeTotal,
    detail,
    checks,
    message: passed ? task.feedback?.success : partial ? task.feedback?.partial : task.feedback?.retry,
  }
}

function ActivityFrame({ demo, result, canCheck, status, onCheck, onReset, children }) {
  const palette = paletteFor(demo.domain)
  const task = demo.task
  const scoreLabel = result ? `${result.score}/${result.total}` : '0%'
  return (
    <div className="rpg" style={{ '--accent': palette.color, '--accent-soft': palette.soft, '--accent-tint': palette.tint }}>
      <style>{styles}</style>
      <section className="activity-frame">
        <div className="activity-edge" />
        <header className="activity-header">
          <div>
            <div className="activity-breadcrumb">{demo.domainLabel} / {demo.label}</div>
            <h2>{task.title}</h2>
            <p>{task.prompt}</p>
          </div>
          <StateBadge tone={result?.passed ? 'success' : result ? 'error' : 'neutral'} label={result ? `Local check: ${scoreLabel}` : 'Local check: 0%'} />
        </header>
        <div className="activity-instructions">
          <span>Mission</span>
          <p>{task.instructions}</p>
        </div>
        <div className="activity-body">
          {children}
        </div>
        <CheckBar
          status={status}
          disabled={!canCheck}
          hint={result?.detail || 'Fill the required parts, then check your work.'}
          onCheck={onCheck}
          onReset={onReset}
        />
      </section>
    </div>
  )
}

function StateBadge({ tone = 'neutral', label }) {
  return <span className={`state-badge is-${tone}`}>{label}</span>
}

function CheckBar({ status, disabled, hint, onCheck, onReset }) {
  return (
    <footer className={`check-bar is-${status}`} aria-live="polite">
      <div>
        <strong>{status === 'correct' ? 'Nice work.' : status === 'incorrect' ? 'Needs another pass.' : 'Ready when the task is filled.'}</strong>
        <span>{hint}</span>
      </div>
      <div className="check-actions">
        <button type="button" className="ghost-button" onClick={onReset}>Reset</button>
        <motion.button
          type="button"
          whileTap={{ y: 3, scale: 0.99 }}
          className="check-button"
          disabled={disabled}
          onClick={onCheck}
        >
          {status === 'checking' ? 'Checking...' : status === 'correct' ? 'Correct' : 'Check Work'}
        </motion.button>
      </div>
    </footer>
  )
}

function DragChip({ card, selected, used, feedback, onPick, onDragStart }) {
  return (
    <motion.button
      type="button"
      className={`drag-chip ${selected ? 'is-selected' : ''} ${used ? 'is-used' : ''} ${feedback?.correct ? 'is-correct' : ''}`}
      whileTap={{ y: 2, scale: 0.99 }}
      draggable={!used}
      onClick={onPick}
      onDragStart={onDragStart}
      onKeyDown={(event) => {
        if (event.key === ' ' || event.key === 'Enter') {
          event.preventDefault()
          onPick()
        }
      }}
    >
      <strong>{card.label}</strong>
      {card.hint ? <span>{card.hint}</span> : null}
    </motion.button>
  )
}

function DropSlot({ label, expectedHint, placed, feedback, selectedCardId, onDrop, onClear }) {
  const tone = feedback ? (feedback.correct ? 'is-correct' : 'is-wrong') : ''
  return (
    <button
      type="button"
      className={`drop-slot ${placed ? 'has-card' : ''} ${tone}`}
      onClick={() => (placed ? onClear() : onDrop(selectedCardId))}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault()
        onDrop(event.dataTransfer.getData('text/plain'))
      }}
      onKeyDown={(event) => {
        if ((event.key === 'Enter' || event.key === ' ') && selectedCardId && !placed) {
          event.preventDefault()
          onDrop(selectedCardId)
        }
      }}
    >
      <span>{label}</span>
      <strong>{placed?.label || expectedHint}</strong>
      {feedback ? (
        <em>{feedback.correct ? 'Correct' : `Expected: ${feedback.expected}`}</em>
      ) : null}
    </button>
  )
}

function usePlacementHelpers(task, state, setState) {
  const cards = task.cards || task.formulaTiles || []
  const placements = state.placements || {}
  const placedIds = new Set(Object.values(placements).filter(Boolean))

  function pick(cardId) {
    setState((previous) => ({ ...previous, selectedCardId: previous.selectedCardId === cardId ? null : cardId }))
  }

  function place(zoneId, cardId = state.selectedCardId) {
    if (!cardId) return
    setState((previous) => {
      const nextPlacements = Object.fromEntries(Object.entries(previous.placements || {}).filter(([, placedId]) => placedId !== cardId))
      nextPlacements[zoneId] = cardId
      return { ...previous, placements: nextPlacements, selectedCardId: null }
    })
  }

  function clear(zoneId) {
    setState((previous) => {
      const nextPlacements = { ...(previous.placements || {}) }
      delete nextPlacements[zoneId]
      return { ...previous, placements: nextPlacements }
    })
  }

  return { cards, placements, placedIds, pick, place, clear }
}

function ChipBank({ cards, placedIds, selectedCardId, pick }) {
  return (
    <div className="chip-bank">
      {cards.map((card) => (
        <DragChip
          key={card.id}
          card={card}
          selected={selectedCardId === card.id}
          used={placedIds.has(card.id)}
          onPick={() => pick(card.id)}
          onDragStart={(event) => event.dataTransfer.setData('text/plain', card.id)}
        />
      ))}
    </div>
  )
}

function SlotGrid({ task, state, setState, result, expectedPrefix = 'Drop a card' }) {
  const { cards, placements, placedIds, pick, place, clear } = usePlacementHelpers(task, state, setState)
  const feedback = result?.checks || {}
  return (
    <div className="widget-grid">
      <Panel title="Source bank">
        <ChipBank cards={cards} placedIds={placedIds} selectedCardId={state.selectedCardId} pick={pick} />
      </Panel>
      <Panel title="Targets">
        <div className="slot-grid">
          {getZones(task).map((zone) => {
            const placed = getCard(cards, placements[zone.id])
            return (
              <DropSlot
                key={zone.id}
                label={zone.label}
                expectedHint={`${expectedPrefix} here`}
                placed={placed}
                feedback={feedback[zone.id]}
                selectedCardId={state.selectedCardId}
                onDrop={(cardId) => place(zone.id, cardId)}
                onClear={() => clear(zone.id)}
              />
            )
          })}
        </div>
      </Panel>
    </div>
  )
}

function Panel({ title, children, className = '' }) {
  return (
    <section className={`widget-panel ${className}`}>
      <h3>{title}</h3>
      {children}
    </section>
  )
}

function cardLabel(card, task) {
  if (!card) return null
  if (task.domain === 'CHEMISTRY' || card.chem) return <ChemText value={card.label} />
  if (card.math) return <MathInline value={card.label} />
  if (task.domain === 'FOREIGN_LANGUAGE' || card.lang) return <LangText value={card.label} />
  return card.label
}

function compactExpected(task, id) {
  const card = getCard(task.cards || task.formulaTiles, id)
  return card?.label || id
}

function moveOrder(state, setState, index, direction) {
  const nextIndex = index + direction
  if (nextIndex < 0 || nextIndex >= state.order.length) return
  const next = [...state.order]
  const [card] = next.splice(index, 1)
  next.splice(nextIndex, 0, card)
  setState((previous) => ({ ...previous, order: next }))
}

// Mathematics
function StepLadder({ task, state, setState, result }) {
  const cardsById = useMemo(() => Object.fromEntries((task.cards || []).map((card) => [card.id, card])), [task.cards])
  return (
    <div className="reasoning-ladder">
      <aside>
        <span>Current</span>
        {(state.order || []).map((cardId, index) => <i key={cardId} className={index === 0 ? 'is-active' : ''}>{index + 1}</i>)}
      </aside>
      <div className="ladder-rungs">
        {(state.order || []).map((cardId, index) => {
          const card = cardsById[cardId]
          const correct = result?.checks?.[cardId]
          return (
            <motion.div
              key={cardId}
              layout
              className={`ladder-card ${result ? (correct ? 'is-correct' : 'is-wrong') : ''}`}
              draggable
              onDragStart={(event) => event.dataTransfer.setData('text/plain', cardId)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                const draggedId = event.dataTransfer.getData('text/plain')
                const current = state.order.indexOf(draggedId)
                if (current < 0) return
                const next = [...state.order]
                const [dragged] = next.splice(current, 1)
                next.splice(index, 0, dragged)
                setState((previous) => ({ ...previous, order: next }))
              }}
            >
              <span className="rung-number">{index + 1}</span>
              <div>
                <strong>{card?.label?.includes('\\') || card?.label?.includes('^') ? <MathText value={card.label} /> : card?.label}</strong>
                {result && !correct ? <em>Expected rung {task.correctOrder.indexOf(cardId) + 1}</em> : null}
              </div>
              <div className="rung-actions">
                <button type="button" aria-label="Move earlier" onClick={() => moveOrder(state, setState, index, -1)}>‹</button>
                <button type="button" aria-label="Move later" onClick={() => moveOrder(state, setState, index, 1)}>›</button>
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

function ProofTable({ task, state, setState, result }) {
  const { cards, placements, placedIds, pick, place, clear } = usePlacementHelpers(task, state, setState)
  return (
    <div className="proof-workbench">
      <div className="proof-table-title">
        <span>#</span>
        <span>Statement</span>
        <span>Justification</span>
      </div>
      <div className="proof-table">
        {getZones(task).map((zone, index) => {
          const placed = getCard(cards, placements[zone.id])
          const feedback = result?.checks?.[zone.id]
          return (
            <div className="proof-row" key={zone.id}>
              <span>{index + 1}</span>
              <strong>{looksMathLike(zone.statement || zone.label) ? <MathInline value={zone.statement || zone.label} /> : (zone.statement || zone.label)}</strong>
              <button
                type="button"
                className={`proof-cell ${placed ? 'has-card' : ''} ${feedback ? (feedback.correct ? 'is-correct' : 'is-wrong') : ''}`}
                onClick={() => (placed ? clear(zone.id) : place(zone.id))}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault()
                  place(zone.id, event.dataTransfer.getData('text/plain'))
                }}
              >
                {placed ? (looksMathLike(placed.label) ? <MathInline value={placed.label} /> : placed.label) : 'Drop a justification'}
                {feedback && !feedback.correct ? <em>Expected: {feedback.expected}</em> : null}
              </button>
            </div>
          )
        })}
      </div>
      <div className="proof-chip-tray">
        {cards.map((card) => (
          <DragChip
            key={card.id}
            card={card}
            selected={state.selectedCardId === card.id}
            used={placedIds.has(card.id)}
            onPick={() => pick(card.id)}
            onDragStart={(event) => event.dataTransfer.setData('text/plain', card.id)}
          />
        ))}
      </div>
    </div>
  )
}

function FormulaWorkbench({ task, state, setState, result }) {
  const slotTask = { ...task, cards: task.formulaTiles || [] }
  const { cards, placements, placedIds, pick, place, clear } = usePlacementHelpers(slotTask, state, setState)
  return (
    <div className="formula-workbench">
      <section className="formula-strip">
        <span>Givens</span>
        <div>{(task.givens || []).map((given) => <strong key={given}><MathInline value={given} /></strong>)}</div>
      </section>
      <div className="formula-steps">
        {getZones(task).map((zone) => {
          const placed = getCard(cards, placements[zone.id])
          const feedback = result?.checks?.[zone.id]
          const zoneCards = cards.filter((card) => !placedIds.has(card.id) || placed?.id === card.id)
          return (
            <section key={zone.id} className="formula-step">
              <span>{zone.label}</span>
              <button
                type="button"
                className={`formula-slot ${placed ? 'has-card' : ''} ${feedback ? (feedback.correct ? 'is-correct' : 'is-wrong') : ''}`}
                onClick={() => (placed ? clear(zone.id) : place(zone.id))}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault()
                  place(zone.id, event.dataTransfer.getData('text/plain'))
                }}
              >
                {placed ? <MathText value={placed.label} /> : `Drop ${zone.label.toLowerCase()} tile`}
                {feedback && !feedback.correct ? <em>Expected: {feedback.expected}</em> : null}
              </button>
              <div className="formula-mini-bank">
                {zoneCards.map((card) => (
                  <button
                    key={card.id}
                    type="button"
                    className={state.selectedCardId === card.id ? 'is-selected' : ''}
                    draggable={!placedIds.has(card.id)}
                    onClick={() => pick(card.id)}
                    onDragStart={(event) => event.dataTransfer.setData('text/plain', card.id)}
                  >
                    <MathInline value={card.label} />
                  </button>
                ))}
              </div>
            </section>
          )
        })}
      </div>
      <section className={`answer-box formula-answer ${result?.checks?.answer === false ? 'is-wrong' : result?.checks?.answer ? 'is-correct' : ''}`}>
        <label>Final answer</label>
        <input value={state.answer || ''} onChange={(event) => setState((previous) => ({ ...previous, answer: event.target.value }))} placeholder="0" />
        <span className="unit-pill">{task.unit || 'revenue units'}</span>
        {result?.checks?.answer === false ? <em>Expected: {task.answer}</em> : null}
      </section>
    </div>
  )
}

// Foreign language
function VocabMemory({ task, state, setState, result }) {
  const cards = task.cards || []
  const zones = task.zones || []
  const matches = state.matches || {}
  const usedCards = new Set(Object.values(matches))

  function pick(cardId) {
    setState((previous) => ({ ...previous, selectedCardId: previous.selectedCardId === cardId ? null : cardId }))
  }

  function match(zoneId) {
    if (!state.selectedCardId) return
    setState((previous) => ({
      ...previous,
      matches: { ...(previous.matches || {}), [zoneId]: previous.selectedCardId },
      selectedCardId: null,
    }))
  }

  return (
    <div className="flashcard-match">
      <div className="memory-board">
        {cards.map((card) => (
          <button
            key={card.id}
            type="button"
            className={`memory-card phrase ${state.selectedCardId === card.id ? 'is-selected' : ''} ${usedCards.has(card.id) ? 'is-matched' : ''}`}
            disabled={usedCards.has(card.id)}
            onClick={() => pick(card.id)}
          >
            <LangText value={card.label} />
            <small>{card.hint}</small>
          </button>
        ))}
        {zones.map((zone) => {
          const placed = getCard(cards, matches[zone.id])
          const correct = result?.checks?.[zone.id]
          return (
            <button
              key={zone.id}
              type="button"
              className={`memory-card meaning ${placed ? 'is-matched' : ''} ${result && placed ? (correct ? 'is-correct' : 'is-wrong') : ''}`}
              onClick={() => match(zone.id)}
            >
              <strong>{zone.label}</strong>
              {placed ? <em>{placed.label}</em> : <span>Pick the Spanish phrase</span>}
              {result && placed && !correct ? <small>Expected: {compactExpected(task, task.correctMatches?.[zone.id])}</small> : null}
            </button>
          )
        })}
      </div>
      <div className="matched-tray">
        <strong>Matched</strong>
        {Object.entries(matches).length ? Object.entries(matches).map(([zoneId, cardId]) => (
          <span key={zoneId}>{getCard(cards, cardId)?.label} / {zones.find((zone) => zone.id === zoneId)?.label}</span>
        )) : <em>No pairs yet.</em>}
      </div>
    </div>
  )
}

function SentenceBuilder({ task, state, setState, result }) {
  const zones = getZones(task)
  const cards = task.cards || []
  const placements = state.placements || {}
  const sentenceParts = useMemo(
    () => (task.sentence || []).map((part, index, all) => ({
      part,
      index,
      blankPosition: part === '___' ? all.slice(0, index + 1).filter((item) => item === '___').length - 1 : -1,
    })),
    [task.sentence]
  )

  function fill(cardId) {
    const nextZone = zones.find((zone) => !placements[zone.id])
    if (!nextZone) return
    setState((previous) => ({ ...previous, placements: { ...(previous.placements || {}), [nextZone.id]: cardId } }))
  }

  function clear(zoneId) {
    setState((previous) => {
      const next = { ...(previous.placements || {}) }
      delete next[zoneId]
      return { ...previous, placements: next }
    })
  }

  const used = new Set(Object.values(placements))
  return (
    <div className="inline-sentence-builder">
      <div className="sentence-canvas">
        {sentenceParts.map(({ part, index, blankPosition }) => {
          if (part !== '___') return <span key={`${part}-${index}`}>{part}</span>
          const zone = zones[blankPosition]
          const placed = getCard(cards, placements[zone?.id])
          const feedback = result?.checks?.[zone?.id]
          return (
            <button key={zone?.id || index} type="button" className={`inline-blank ${placed ? 'has-card' : ''} ${feedback ? (feedback.correct ? 'is-correct' : 'is-wrong') : ''}`} onClick={() => placed && clear(zone.id)}>
              {placed ? <LangText value={placed.label} /> : zone?.label || 'blank'}
              {feedback && !feedback.correct ? <em>Expected: {compactExpected(task, task.correctMatches?.[zone.id])}</em> : null}
            </button>
          )
        })}
      </div>
      <div className="word-tray">
        {cards.map((card) => (
          <button key={card.id} type="button" disabled={used.has(card.id)} onClick={() => fill(card.id)}>
            <LangText value={card.label} />
          </button>
        ))}
      </div>
    </div>
  )
}

function Conversation({ task, state, setState, result }) {
  const selected = (task.responseOptions || []).find((option) => option.id === state.responseId)
  const replyText = selected?.text || state.draft
  return (
    <div className="chat-simulator">
      <div className="chat-feed">
        {(task.chatTurns || []).map((turn) => <ChatBubble key={turn.id} side={turn.role === 'user' ? 'user' : 'ai'} label={turn.speaker || (turn.role === 'user' ? 'You' : task.persona || 'AI')} text={turn.text} />)}
        {replyText ? <ChatBubble side="user" label="You" text={replyText} /> : null}
        {replyText ? <ChatBubble side="ai" label={task.persona || 'AI'} text={task.followUp} /> : <div className="typing-indicator"><i /><i /><i /><span>waiting for your reply</span></div>}
      </div>
      <div className="suggestion-strip">
        {(task.responseOptions || []).map((option) => (
          <button
            key={option.id}
            type="button"
            className={state.responseId === option.id ? 'is-active' : ''}
            onClick={() => setState((previous) => ({ ...previous, responseId: option.id, draft: option.text }))}
          >
            {option.text}
          </button>
        ))}
      </div>
      <div className="chat-composer">
        <textarea value={state.draft || ''} onChange={(event) => setState((previous) => ({ ...previous, draft: event.target.value, responseId: '' }))} placeholder="Escribe tu respuesta..." />
        <button type="button" onClick={() => setState((previous) => ({ ...previous, draft: previous.draft || selected?.text || '' }))}>Send</button>
      </div>
      {result ? <StateBadge tone={result.passed ? 'success' : 'warning'} label={result.message} /> : null}
    </div>
  )
}

function ChatBubble({ side, label, text }) {
  return (
    <div className={`chat-row is-${side}`}>
      <span className="avatar">{side === 'user' ? 'Y' : 'AI'}</span>
      <div className="chat-bubble">
        <strong>{label}</strong>
        <p><LangText value={text} /></p>
      </div>
    </div>
  )
}

// Physics / diagrams
function SolveWithUnits({ task, state, setState, result }) {
  const slotTask = { ...task, cards: task.formulaTiles || task.cards || [] }
  const { cards, placements, placedIds, pick, place, clear } = usePlacementHelpers(slotTask, state, setState)
  const formulaOk = placements['unit-formula'] === task.correctMatches?.['unit-formula']
  const unitOk = placements['unit-unit'] === task.correctMatches?.['unit-unit']
  return (
    <div className="unit-bench">
      <section className="unit-formula-strip">
        <span>Formula builder</span>
        {getZones(task).map((zone) => {
          const placed = getCard(cards, placements[zone.id])
          const feedback = result?.checks?.[zone.id]
          return (
            <button
              key={zone.id}
              type="button"
              className={`unit-slot ${placed ? 'has-card' : ''} ${feedback ? (feedback.correct ? 'is-correct' : 'is-wrong') : ''}`}
              onClick={() => (placed ? clear(zone.id) : place(zone.id))}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault()
                place(zone.id, event.dataTransfer.getData('text/plain'))
              }}
            >
              {placed ? <MathInline value={placed.label} /> : zone.label}
            </button>
          )
        })}
      </section>
      <section className="unit-chip-tray">
        {(task.givens || []).map((given) => <span key={given}><MathInline value={given} /></span>)}
        {cards.map((card) => (
          <button
            key={card.id}
            type="button"
            disabled={placedIds.has(card.id)}
            className={state.selectedCardId === card.id ? 'is-selected' : ''}
            draggable={!placedIds.has(card.id)}
            onClick={() => pick(card.id)}
            onDragStart={(event) => event.dataTransfer.setData('text/plain', card.id)}
          >
            <MathInline value={card.label} />
          </button>
        ))}
      </section>
      <aside className={`dimensional-card ${formulaOk && unitOk ? 'is-correct' : ''}`}>
        <strong>Dimensional check</strong>
        <span>LHS: kg·m/s² {formulaOk && unitOk ? '✓' : 'waiting'}</span>
        <small>Down-ramp component should resolve gravity with θ = 30°.</small>
      </aside>
      <section className={`answer-box unit-answer ${result?.checks?.answer === false ? 'is-wrong' : result?.checks?.answer ? 'is-correct' : ''}`}>
        <label>Final answer</label>
        <input value={state.answer || ''} onChange={(event) => setState((previous) => ({ ...previous, answer: event.target.value }))} placeholder="24.5" />
        <span className="unit-pill">N</span>
        {result?.checks?.answer === false ? <em>Expected: {task.answer} N</em> : null}
      </section>
    </div>
  )
}

function ChainComposer({ task, state, setState, result, kind = 'physics' }) {
  const cardsById = useMemo(() => Object.fromEntries((task.cards || []).map((card) => [card.id, card])), [task.cards])
  const roles = task.roles || ['Premise', 'Mechanism', 'Implication', 'Example']
  return (
    <div className={`chain-composer is-${kind}`}>
      <div className="chain-track">
        {(state.order || []).map((cardId, index) => {
          const card = cardsById[cardId]
          const correct = result?.checks?.[cardId]
          return (
            <motion.section
              layout
              key={cardId}
              className={`chain-node ${result ? (correct ? 'is-correct' : 'is-wrong') : ''}`}
              draggable
              onDragStart={(event) => event.dataTransfer.setData('text/plain', cardId)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                const draggedId = event.dataTransfer.getData('text/plain')
                const current = state.order.indexOf(draggedId)
                if (current < 0) return
                const next = [...state.order]
                const [dragged] = next.splice(current, 1)
                next.splice(index, 0, dragged)
                setState((previous) => ({ ...previous, order: next }))
              }}
            >
              <span>{task.icons?.[cardId] || index + 1}</span>
              <em>{roles[index] || `Step ${index + 1}`}</em>
              <strong>{card?.label}</strong>
              <div className="rung-actions">
                <button type="button" aria-label="Move left" onClick={() => moveOrder(state, setState, index, -1)}>‹</button>
                <button type="button" aria-label="Move right" onClick={() => moveOrder(state, setState, index, 1)}>›</button>
              </div>
            </motion.section>
          )
        })}
      </div>
      <div className="step-scrubber">Step {Math.min((state.order || []).length, 1 + (result?.score || 0))} of {(state.order || []).length}</div>
    </div>
  )
}

function DiagramLabeler({ task, state, setState, result }) {
  const cards = task.cards || []
  const placements = state.placements || {}
  const placedIds = new Set(Object.values(placements).filter(Boolean))

  function pick(cardId) {
    setState((previous) => ({ ...previous, selectedCardId: previous.selectedCardId === cardId ? null : cardId }))
  }

  function place(targetId, cardId = state.selectedCardId) {
    if (!cardId) return
    setState((previous) => {
      const next = Object.fromEntries(Object.entries(previous.placements || {}).filter(([, value]) => value !== cardId))
      next[targetId] = cardId
      return { ...previous, placements: next, selectedCardId: null }
    })
  }

  return (
    <div className={`diagram-board ${task.taskType === 'LabelDiagram' ? 'is-bio' : 'is-force'}`}>
      <svg viewBox="0 0 100 100" role="img" aria-label={task.title}>
        {task.diagram === 'gene-expression' ? <GeneSvg /> : <ForceSvg />}
        {(task.targets || []).map((target) => {
          const card = getCard(cards, placements[target.id])
          const correct = result?.checks?.[target.id]?.correct
          return (
            <g key={target.id}>
              <circle
                cx={target.x}
                cy={target.y}
                r="7"
                className={`target-ring ${card ? 'is-filled' : ''} ${result && card ? (correct ? 'is-correct' : 'is-wrong') : ''}`}
                onClick={() => place(target.id)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault()
                  place(target.id, event.dataTransfer.getData('text/plain'))
                }}
              />
              {card ? (
                <>
                  <line x1={target.x} y1={target.y} x2={target.calloutX || target.x + 12} y2={target.calloutY || target.y - 12} className="leader" />
                  <foreignObject x={(target.calloutX || target.x + 12) - 1} y={(target.calloutY || target.y - 12) - 8} width="34" height="18">
                    <div className={`svg-pill ${result ? (correct ? 'is-correct' : 'is-wrong') : ''}`}>{card.label}</div>
                  </foreignObject>
                  {target.meta ? <text x={target.x + 8} y={target.y + 8}>{target.meta}</text> : null}
                </>
              ) : (
                <text x={target.x + 8} y={target.y + 4}>{target.label}</text>
              )}
            </g>
          )
        })}
      </svg>
      <div className="diagram-chip-tray">
        {cards.map((card) => (
          <button
            key={card.id}
            type="button"
            disabled={placedIds.has(card.id)}
            className={state.selectedCardId === card.id ? 'is-selected' : ''}
            draggable={!placedIds.has(card.id)}
            onClick={() => pick(card.id)}
            onDragStart={(event) => event.dataTransfer.setData('text/plain', card.id)}
          >
            {card.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function ForceSvg() {
  return (
    <>
      <defs>
        <marker id="force-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="rgba(255,255,255,0.75)" />
        </marker>
      </defs>
      <rect x="35" y="45" width="30" height="17" rx="3" fill="rgba(255,255,255,0.08)" stroke="var(--accent)" />
      <line x1="10" y1="64" x2="90" y2="64" stroke="rgba(255,255,255,0.32)" strokeWidth="2" />
      <line x1="50" y1="45" x2="50" y2="17" stroke="rgba(255,255,255,0.62)" strokeWidth="2" markerEnd="url(#force-arrow)" />
      <line x1="50" y1="62" x2="50" y2="84" stroke="rgba(255,255,255,0.62)" strokeWidth="2" markerEnd="url(#force-arrow)" />
      <line x1="65" y1="48" x2="82" y2="30" stroke="rgba(255,255,255,0.62)" strokeWidth="2" markerEnd="url(#force-arrow)" />
      <line x1="35" y1="55" x2="17" y2="55" stroke="rgba(255,255,255,0.62)" strokeWidth="2" markerEnd="url(#force-arrow)" />
    </>
  )
}

function GeneSvg() {
  return (
    <>
      <path d="M10 30 C18 12 25 58 34 38 C43 20 48 57 56 38" fill="none" stroke="#60a5fa" strokeWidth="2" />
      <path d="M10 42 C20 60 26 14 36 34 C45 52 49 18 56 34" fill="none" stroke="#c084fc" strokeWidth="2" />
      <line x1="58" y1="38" x2="70" y2="48" stroke="rgba(255,255,255,0.40)" strokeWidth="2" />
      <rect x="70" y="42" width="11" height="12" rx="4" fill="rgba(74,222,128,0.18)" stroke="#4ade80" />
      <path d="M82 45 C88 38 94 42 91 52 C88 61 77 60 80 51" fill="none" stroke="#fbbf24" strokeWidth="2" />
    </>
  )
}

// History / debate / policy
function TimelineTrack({ task, state, setState, result }) {
  const cardsById = useMemo(() => Object.fromEntries((task.cards || []).map((card) => [card.id, card])), [task.cards])
  return (
    <div className="timeline-track-widget">
      <div className="timeline-rail">
        {(task.ticks || task.cards || []).map((tick, index) => (
          <span key={tick.id || tick.label || tick.date} style={{ left: `${8 + (index * 84) / Math.max((task.cards?.length || 1) - 1, 1)}%` }}>{tick.date || tick.label}</span>
        ))}
        {(state.order || []).map((cardId, index) => {
          const card = cardsById[cardId]
          const correct = result?.checks?.[cardId]
          const expectedIndex = task.correctOrder?.indexOf(cardId) ?? index
          return (
            <motion.div
              layout
              key={cardId}
              className={`timeline-pin ${result ? (correct ? 'is-correct' : 'is-wrong') : ''}`}
              style={{ left: `${8 + (index * 84) / Math.max((state.order?.length || 1) - 1, 1)}%` }}
              draggable
              onDragStart={(event) => event.dataTransfer.setData('text/plain', cardId)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                const draggedId = event.dataTransfer.getData('text/plain')
                const current = state.order.indexOf(draggedId)
                if (current < 0) return
                const next = [...state.order]
                const [dragged] = next.splice(current, 1)
                next.splice(index, 0, dragged)
                setState((previous) => ({ ...previous, order: next }))
              }}
            >
              <i />
              <strong>{card?.label}</strong>
              <em>{card?.date}</em>
              <div className="pin-actions">
                <button type="button" onClick={() => moveOrder(state, setState, index, -1)}>←</button>
                <button type="button" onClick={() => moveOrder(state, setState, index, 1)}>→</button>
              </div>
              {result && !correct ? <small style={{ left: `${(expectedIndex - index) * 80}px` }}>{card?.date}</small> : null}
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

function ThesisBuilder({ task, state, setState, result }) {
  const { cards, placements, placedIds, pick, place, clear } = usePlacementHelpers(task, state, setState)
  const populated = Object.keys(placements).length
  return (
    <div className="thesis-builder-board">
      <section className="thesis-hero">
        <span>Thesis</span>
        <strong>{task.thesis || 'Economic stress made political reform urgent.'}</strong>
        <div className="argument-segments">{[0, 1, 2].map((item) => <i key={item} className={item < populated ? 'is-filled' : ''} />)}</div>
      </section>
      <div className="thesis-zones">
        {getZones(task).map((zone) => {
          const placed = getCard(cards, placements[zone.id])
          const feedback = result?.checks?.[zone.id]
          return (
            <button
              key={zone.id}
              type="button"
              className={`editorial-bin ${placed ? 'has-card' : ''} ${feedback ? (feedback.correct ? 'is-correct' : 'is-wrong') : ''}`}
              onClick={() => (placed ? clear(zone.id) : place(zone.id))}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault()
                place(zone.id, event.dataTransfer.getData('text/plain'))
              }}
            >
              <span>{zone.label}</span>
              <strong>{placed?.label || `Drop ${zone.label.toLowerCase()}`}</strong>
            </button>
          )
        })}
      </div>
      <div className="editorial-card-deck">
        {cards.map((card) => (
          <DragChip key={card.id} card={card} selected={state.selectedCardId === card.id} used={placedIds.has(card.id)} onPick={() => pick(card.id)} onDragStart={(event) => event.dataTransfer.setData('text/plain', card.id)} />
        ))}
      </div>
    </div>
  )
}

function SocraticDebate({ task, state, setState, result }) {
  const selected = new Set(state.selectedCards || [])
  function toggle(cardId) {
    setState((previous) => {
      const next = new Set(previous.selectedCards || [])
      if (next.has(cardId)) next.delete(cardId)
      else next.add(cardId)
      return { ...previous, selectedCards: [...next] }
    })
  }
  return (
    <div className="dialectic-exchange">
      <section className="thesis-card">Thesis: {task.thesis}</section>
      <div className="dialectic-lanes">
        <section>
          <h3>Your evidence</h3>
          {(task.cards || []).map((card) => (
            <button key={card.id} type="button" className={selected.has(card.id) ? 'is-selected' : ''} onClick={() => toggle(card.id)}>{card.label}</button>
          ))}
        </section>
        <section>
          <h3>AI counter</h3>
          {(task.counterCards || ['Ideas shaped slogans, institutions, and the language of reform.', 'Economic crisis alone does not explain why legitimacy collapsed.', 'Political language turned hardship into a rights claim.']).map((text) => <p key={text}>{text}</p>)}
        </section>
      </div>
      <div className="response-composer">
        <span>Evidence slot: {selected.size ? `${selected.size} card(s)` : 'drop or select evidence'}</span>
        <textarea value={state.draft || ''} onChange={(event) => setState((previous) => ({ ...previous, draft: event.target.value }))} placeholder="Write the counterclaim..." />
      </div>
      {result ? <StateBadge tone={result.passed ? 'success' : 'warning'} label={result.detail} /> : null}
    </div>
  )
}

// Economics
function GraphInterpretation({ task, state, setState, result }) {
  const demandShift = state.curve === 'Demand' ? (state.direction === 'Right' ? 12 : state.direction === 'Left' ? -12 : 0) : 0
  const supplyShift = state.curve === 'Supply' ? (state.direction === 'Right' ? 12 : state.direction === 'Left' ? -12 : 0) : 0
  const eqX = 46 + demandShift * 0.45 + supplyShift * 0.35
  const eqY = 54 - demandShift * 0.35 + supplyShift * 0.35
  return (
    <div className="supply-demand-sim">
      <section className="graph-stage">
        <svg className="market-graph" viewBox="0 0 100 100" role="img" aria-label="Supply and demand graph">
          <line x1="12" y1="84" x2="88" y2="84" />
          <line x1="12" y1="84" x2="12" y2="12" />
          {[24, 40, 56, 72].map((tick) => <line key={tick} x1="12" y1={tick} x2="88" y2={tick} className="grid" />)}
          <path d="M 24 20 L 64 76" className="demand ghost" />
          <path d="M 28 76 L 68 20" className="supply ghost" />
          <path d={`M ${24 + demandShift} 20 L ${64 + demandShift} 76`} className="demand" />
          <path d={`M ${28 + supplyShift} 76 L ${68 + supplyShift} 20`} className="supply" />
          <circle cx={eqX} cy={eqY} r="4" />
          <text x={67 + demandShift} y="76">D</text>
          <text x={70 + supplyShift} y="22">S</text>
          <text x="89" y="91">Q</text>
          <text x="8" y="10">P</text>
        </svg>
      </section>
      <section className="graph-controls">
        <SegmentedGroup label="Curve" value={state.curve} options={task.curves || []} onChange={(value) => setState((previous) => ({ ...previous, curve: value }))} correct={result?.checks?.curve} />
        <SegmentedGroup label="Direction" value={state.direction} options={task.directions || []} onChange={(value) => setState((previous) => ({ ...previous, direction: value }))} correct={result?.checks?.direction} />
        <div className="outcome-cards">
          {(task.outcomes || []).map((outcome) => (
            <button key={outcome} type="button" className={`${state.outcome === outcome ? 'is-active' : ''} ${result && state.outcome === outcome ? (result.checks?.outcome ? 'is-correct' : 'is-wrong') : ''}`} onClick={() => setState((previous) => ({ ...previous, outcome }))}>
              <svg viewBox="0 0 42 24"><path d="M4 18 L18 10 L38 6" /><circle cx="18" cy="10" r="2" /></svg>
              {outcome}
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}

function SegmentedGroup({ label, value, options, onChange, correct }) {
  return (
    <div className={`segmented-group ${correct === false ? 'is-wrong' : correct ? 'is-correct' : ''}`}>
      <span>{label}</span>
      <div>
        {options.map((option) => (
          <button key={option} type="button" className={value === option ? 'is-active' : ''} onClick={() => onChange(option)}>{option}</button>
        ))}
      </div>
    </div>
  )
}

function CaseAnalysis({ task, state, setState, result }) {
  const choice = (id) => state.choices?.[id] || ''
  return (
    <div className="case-brief-dashboard">
      <section className="market-snapshot">
        <h3>Market snapshot</h3>
        {(task.snapshot || ['Bean costs ↑', 'Demand steady', 'Quantity tight']).map((item) => <span key={item}>{item}</span>)}
      </section>
      {(task.questions || []).map((question) => (
        <section key={question.id} className={`case-tile ${result ? (result.checks?.[question.id] ? 'is-correct' : 'is-wrong') : ''}`}>
          <h3>{question.label}</h3>
          <div>{question.options.map((option) => <button key={option} type="button" className={choice(question.id) === option ? 'is-active' : ''} onClick={() => setState((previous) => ({ ...previous, choices: { ...(previous.choices || {}), [question.id]: option } }))}>{option}</button>)}</div>
        </section>
      ))}
      <footer>You chose {choice('econ-model') || 'a model'} → expect {choice('econ-price') || 'a price move'}. Tradeoff: {choice('econ-tradeoff') || 'not set'}.</footer>
    </div>
  )
}

function StakeholderBoard({ task, state, setState, result }) {
  const { cards, placements, placedIds, pick, place, clear } = usePlacementHelpers(task, state, setState)
  const tilt = placements['policy-benefit'] ? -8 : placements['policy-risk'] ? 8 : 0
  return (
    <div className="stakeholder-scale">
      <svg viewBox="0 0 240 100" role="img" aria-label="Policy tradeoff scale">
        <line x1="120" y1="20" x2="120" y2="82" />
        <line x1="54" y1="44" x2="186" y2="44" style={{ transform: `rotate(${tilt}deg)`, transformOrigin: '120px 44px' }} />
        <path d="M42 50 h48 l-10 26 h-28z" />
        <path d="M150 50 h48 l-10 26 h-28z" />
      </svg>
      <div className="stakeholder-columns">
        {getZones(task).map((zone) => {
          const placed = getCard(cards, placements[zone.id])
          const feedback = result?.checks?.[zone.id]
          return (
            <section key={zone.id}>
              <h3>{zone.label}</h3>
              <button type="button" className={`bucket ${placed ? 'has-card' : ''} ${feedback ? (feedback.correct ? 'is-correct' : 'is-wrong') : ''}`} onClick={() => (placed ? clear(zone.id) : place(zone.id))} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); place(zone.id, event.dataTransfer.getData('text/plain')) }}>
                {placed?.label || 'Drop tradeoff chip'}
              </button>
            </section>
          )
        })}
      </div>
      <div className="tradeoff-chip-bank">{cards.map((card) => <DragChip key={card.id} card={card} selected={state.selectedCardId === card.id} used={placedIds.has(card.id)} onPick={() => pick(card.id)} onDragStart={(event) => event.dataTransfer.setData('text/plain', card.id)} />)}</div>
    </div>
  )
}

// Chemistry
function BalanceEquations({ task, state, setState, result }) {
  const totals = useMemo(() => getEquationTotals(task, state.coefficients || {}), [task, state.coefficients])
  const allAtoms = [...new Set([...Object.keys(totals.reactants || {}), ...Object.keys(totals.products || {})])]
  return (
    <div className="inline-equation-balancer">
      <div className="equation-line">
        {(task.sides?.reactants || []).map((molecule, index) => (
          <span key={molecule} className={`equation-piece ${result ? (result.checks?.[molecule] ? 'is-correct' : 'is-wrong') : ''}`}>
            {index > 0 ? <b>+</b> : null}
            <CoefficientSpinner molecule={molecule} value={state.coefficients?.[molecule] || 1} setState={setState} />
            <ChemText value={molecule} />
          </span>
        ))}
        <strong className="reaction-arrow">→</strong>
        {(task.sides?.products || []).map((molecule, index) => (
          <span key={molecule} className={`equation-piece ${result ? (result.checks?.[molecule] ? 'is-correct' : 'is-wrong') : ''}`}>
            {index > 0 ? <b>+</b> : null}
            <CoefficientSpinner molecule={molecule} value={state.coefficients?.[molecule] || 1} setState={setState} />
            <ChemText value={molecule} />
          </span>
        ))}
      </div>
      <div className="atom-ledger-row">
        {allAtoms.map((atom) => {
          const left = totals.reactants?.[atom] || 0
          const right = totals.products?.[atom] || 0
          const ok = left === right
          return <span key={atom} className={ok ? 'is-correct' : 'is-wrong'}>{atom} {left}/{right} {ok ? '✓' : '✕'}</span>
        })}
      </div>
    </div>
  )
}

function CoefficientSpinner({ molecule, value, setState }) {
  return (
    <span className="coef-spinner" onWheel={(event) => { event.preventDefault(); adjustCoefficient(molecule, event.deltaY < 0 ? 1 : -1, setState) }}>
      <button type="button" aria-label={`Increase ${molecule}`} onClick={() => adjustCoefficient(molecule, 1, setState)}>↑</button>
      <strong>{value}</strong>
      <button type="button" aria-label={`Decrease ${molecule}`} onClick={() => adjustCoefficient(molecule, -1, setState)}>↓</button>
    </span>
  )
}

function adjustCoefficient(molecule, delta, setState) {
  setState((previous) => {
    const current = previous.coefficients?.[molecule] || 1
    return { ...previous, coefficients: { ...(previous.coefficients || {}), [molecule]: Math.min(9, Math.max(1, current + delta)) } }
  })
}

function getEquationTotals(task, coefficients) {
  const totals = { reactants: {}, products: {} }
  Object.entries(task.sides || {}).forEach(([side, molecules]) => {
    molecules.forEach((molecule) => {
      const coefficient = coefficients[molecule] || 1
      Object.entries(task.atomCounts?.[molecule] || {}).forEach(([atom, count]) => {
        totals[side][atom] = (totals[side][atom] || 0) + count * coefficient
      })
    })
  })
  return totals
}

function ReactionPathway({ task, state, setState, result }) {
  const { cards, placements, placedIds, pick, place, clear } = usePlacementHelpers(task, state, setState)
  return (
    <div className="reaction-pathway">
      <div className="pathway-nodes">
        {getZones(task).map((zone, index) => {
          const placed = getCard(cards, placements[zone.id])
          const feedback = result?.checks?.[zone.id]
          return (
            <button key={zone.id} type="button" className={`pathway-node ${placed ? 'has-card' : ''} ${feedback ? (feedback.correct ? 'is-correct' : 'is-wrong') : ''}`} onClick={() => (placed ? clear(zone.id) : place(zone.id))} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); place(zone.id, event.dataTransfer.getData('text/plain')) }}>
              <span>{zone.label}</span>
              <strong>{placed ? <ChemText value={placed.label} /> : 'Drop chemistry card'}</strong>
              {index < getZones(task).length - 1 ? <i>→</i> : null}
            </button>
          )
        })}
      </div>
      <div className="chem-chip-bank">
        {cards.map((card) => <button key={card.id} type="button" disabled={placedIds.has(card.id)} className={state.selectedCardId === card.id ? 'is-selected' : ''} draggable={!placedIds.has(card.id)} onClick={() => pick(card.id)} onDragStart={(event) => event.dataTransfer.setData('text/plain', card.id)}><ChemText value={card.label} /></button>)}
      </div>
    </div>
  )
}

function NomenclatureMatcher({ task, state, setState, result }) {
  return (
    <div className="nomenclature-matcher">
      {(task.questions || []).map((question) => (
        <section key={question.id} className={result ? (result.checks?.[question.id] ? 'is-correct' : 'is-wrong') : ''}>
          <h3>{question.label}</h3>
          {question.options.map((option) => (
            <button key={option} type="button" className={state.choices?.[question.id] === option ? 'is-active' : ''} onClick={() => setState((previous) => ({ ...previous, choices: { ...(previous.choices || {}), [question.id]: option } }))}>
              {question.label === 'Formula' || option.includes('_') ? <ChemText value={option} /> : option}
            </button>
          ))}
        </section>
      ))}
      <footer>
        <strong>Named compound</strong>
        <span>{Object.values(state.choices || {}).filter(Boolean).join(' + ') || 'Complete the ion triplet'}</span>
      </footer>
    </div>
  )
}

// Philosophy and logic
function ArgumentMapCanvas({ task, state, setState, result }) {
  const { cards, placements, placedIds, pick, place, clear } = usePlacementHelpers(task, state, setState)
  const nodes = {
    'logic-premise': { x: 16, y: 56 },
    'logic-assumption': { x: 14, y: 14 },
    'logic-claim': { x: 58, y: 36 },
    'logic-objection': { x: 58, y: 70 },
  }
  return (
    <div className="argument-map-canvas">
      <svg viewBox="0 0 100 92">
        <path d="M32 59 L55 44" />
        <path d="M28 28 L32 52" className="dotted" />
        <path d="M72 66 L72 48" className="attack" />
      </svg>
      {getZones(task).map((zone) => {
        const placed = getCard(cards, placements[zone.id])
        const feedback = result?.checks?.[zone.id]
        const coords = nodes[zone.id] || { x: 20, y: 20 }
        return (
          <button
            key={zone.id}
            type="button"
            className={`argument-node ${placed ? 'has-card' : ''} ${feedback ? (feedback.correct ? 'is-correct' : 'is-wrong') : ''}`}
            style={{ left: `${coords.x}%`, top: `${coords.y}%` }}
            onClick={() => (placed ? clear(zone.id) : place(zone.id))}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => { event.preventDefault(); place(zone.id, event.dataTransfer.getData('text/plain')) }}
          >
            <span>{zone.label}</span>
            <strong>{placed?.label || 'Drop node'}</strong>
          </button>
        )
      })}
      <div className="argument-chip-row">
        {cards.map((card) => <DragChip key={card.id} card={card} selected={state.selectedCardId === card.id} used={placedIds.has(card.id)} onPick={() => pick(card.id)} onDragStart={(event) => event.dataTransfer.setData('text/plain', card.id)} />)}
      </div>
    </div>
  )
}

function FallacyExaminer({ task, state, setState, result }) {
  const fallacy = task.questions?.[0]
  const repair = task.questions?.[1]
  return (
    <div className="fallacy-examiner">
      <blockquote className={result ? (result.checks?.[fallacy?.id] ? 'is-correct' : 'is-wrong') : ''}>
        “{task.argument || task.prompt}”
        {result ? <span className="fallacy-underline">unsupported authority cue</span> : null}
      </blockquote>
      <section>
        <h3>Fallacy tags</h3>
        {fallacy?.options.map((option) => <button key={option} type="button" className={state.choices?.[fallacy.id] === option ? 'is-active' : ''} onClick={() => setState((previous) => ({ ...previous, choices: { ...(previous.choices || {}), [fallacy.id]: option } }))}>{option}</button>)}
      </section>
      <section>
        <h3>Repair suggestions</h3>
        {repair?.options.map((option) => <button key={option} type="button" className={state.choices?.[repair.id] === option ? 'is-active' : ''} onClick={() => setState((previous) => ({ ...previous, choices: { ...(previous.choices || {}), [repair.id]: option } }))}>{option}</button>)}
      </section>
    </div>
  )
}

function AdversarialDuel({ task, state, setState, result }) {
  const selected = new Set(state.selectedCards || [])
  function toggle(cardId) {
    setState((previous) => {
      const next = new Set(previous.selectedCards || [])
      if (next.has(cardId)) next.delete(cardId)
      else next.add(cardId)
      return { ...previous, selectedCards: [...next] }
    })
  }
  return (
    <div className="steelman-duel">
      <div className="duel-scoreboard">Round {Math.min(3, Math.max(1, selected.size || 1))} of 3</div>
      <section className="duel-podium attacker">
        <h3>Attacker</h3>
        {(task.cards || []).map((card, index) => <motion.p key={card.id} initial={false} animate={{ opacity: index <= selected.size ? 1 : 0.45 }}>{card.label}</motion.p>)}
      </section>
      <section className="duel-podium defender">
        <h3>Defender</h3>
        {(task.cards || []).map((card) => <button key={card.id} type="button" className={selected.has(card.id) ? 'is-selected' : ''} onClick={() => toggle(card.id)}>{card.label}</button>)}
        <textarea value={state.draft || ''} onChange={(event) => setState((previous) => ({ ...previous, draft: event.target.value }))} placeholder="Answer the strongest version..." />
      </section>
      {result ? <StateBadge tone={result.passed ? 'success' : 'warning'} label={result.detail} /> : null}
    </div>
  )
}

// Writing / psychology / political science / biology
function TimedPrompt({ task, state, setState, result }) {
  const duration = task.timerSeconds || 300
  const wordCount = state.draft?.trim() ? state.draft.trim().split(/\s+/).length : 0
  const timeLeft = state.timeLeft ?? duration
  const progress = Math.max(0, Math.min(1, timeLeft / duration))

  useEffect(() => {
    if (!state.started || timeLeft <= 0) return undefined
    const timer = window.setTimeout(() => setState((previous) => ({ ...previous, timeLeft: Math.max(0, (previous.timeLeft ?? duration) - 1) })), 1000)
    return () => window.clearTimeout(timer)
  }, [duration, setState, state.started, timeLeft])

  return (
    <div className="writing-sprint">
      <section className="sprint-timer">
        <svg viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="48" />
          <circle cx="60" cy="60" r="48" className="timer-progress" style={{ strokeDashoffset: 302 - (302 * progress) }} />
        </svg>
        <strong>{String(Math.floor(timeLeft / 60)).padStart(2, '0')}:{String(timeLeft % 60).padStart(2, '0')}</strong>
        <div>
          <button type="button" onClick={() => setState((previous) => ({ ...previous, started: !previous.started }))}>{state.started ? 'Pause' : 'Start'}</button>
          <button type="button" onClick={() => setState((previous) => ({ ...previous, started: false, timeLeft: duration }))}>Reset</button>
        </div>
      </section>
      <section className="sprint-draft">
        <span>Saved locally</span>
        <textarea value={state.draft || ''} onChange={(event) => setState((previous) => ({ ...previous, draft: event.target.value }))} placeholder="Write the paragraph here..." />
      </section>
      <section className="sprint-checklist">
        <strong>{wordCount} words · {Math.max(1, Math.ceil(wordCount / 220))} min read</strong>
        {(task.checklist || []).map((item) => {
          const auto = normalizeText(state.draft).includes(normalizeText(item.keyword || item.label.split(' ')[0]))
          return <label key={item.id} className={state.checklist?.[item.id] || auto ? 'is-checked' : ''}><input type="checkbox" checked={Boolean(state.checklist?.[item.id] || auto)} onChange={(event) => setState((previous) => ({ ...previous, checklist: { ...(previous.checklist || {}), [item.id]: event.target.checked } }))} />{item.label}</label>
        })}
      </section>
    </div>
  )
}

function RewriteLab({ task, state, setState, result }) {
  function applyMove(card) {
    setState((previous) => {
      const selected = new Set(previous.selectedCards || [])
      selected.add(card.id)
      return {
        ...previous,
        selectedCards: [...selected],
        draft: previous.draft || task.suggestedRewrite || 'Users clarify the process by naming concrete actions before they know the final outcome.',
      }
    })
  }
  const typed = Boolean(state.draft?.trim())
  return (
    <div className="diff-lab">
      <section className="before-pane">
        <h3>Before</h3>
        {(task.sentences || [task.original]).map((sentence) => <button key={sentence} type="button">{sentence}</button>)}
      </section>
      <section className="after-pane">
        <h3>After</h3>
        <textarea value={state.draft || ''} onChange={(event) => setState((previous) => ({ ...previous, draft: event.target.value }))} placeholder="Rewrite the sentence..." />
        {typed ? <p className="token-diff"><del>The thing that makes</del> <ins>Users clarify</ins> the process <ins>with concrete actions</ins>.</p> : null}
      </section>
      <div className="edit-move-tray">
        {(task.cards || []).map((card) => <button key={card.id} type="button" className={state.selectedCards?.includes(card.id) ? 'is-active' : ''} onClick={() => applyMove(card)}>{card.label}</button>)}
      </div>
      {result ? <StateBadge tone={result.passed ? 'success' : 'warning'} label={result.detail} /> : null}
    </div>
  )
}

function RubricBoard({ task, state, setState, result }) {
  const rubric = task.rubric || []
  const points = radarPoints(rubric.map((item) => state.ratings?.[item.id] || 0))
  return (
    <div className="rubric-studio">
      <section className="annotated-draft">
        <h3>Annotated draft</h3>
        {(task.draftSentences || String(task.draft || '').split('. ').filter(Boolean)).map((sentence, index) => (
          <p key={sentence}>{sentence}{sentence.endsWith('.') ? '' : '.'}<button type="button" onClick={() => setState((previous) => {
            const card = task.annotations?.[Math.min(index, (task.annotations || []).length - 1)]
            const selected = new Set(previous.selectedCards || [])
            if (card) selected.add(card.id)
            return { ...previous, selectedCards: [...selected] }
          })}>Annotate</button></p>
        ))}
        {(task.annotations || []).filter((card) => state.selectedCards?.includes(card.id)).map((card) => <span key={card.id}>{card.label}</span>)}
      </section>
      <section className="rubric-scorer">
        {rubric.map((item) => (
          <div key={item.id} className="rubric-row">
            <span>{item.label}</span>
            {[0, 1, 2, 3, 4].map((score) => (
              <button key={score} type="button" title={item.descriptors?.[score] || `${score}/4`} className={state.ratings?.[item.id] === score ? 'is-active' : ''} onClick={() => setState((previous) => ({ ...previous, ratings: { ...(previous.ratings || {}), [item.id]: score } }))}>{score}</button>
            ))}
          </div>
        ))}
        <svg className="radar" viewBox="0 0 120 120">
          <polygon points="60,10 108,45 90,102 30,102 12,45" />
          <polygon className="radar-fill" points={points} />
          {['Clarity', 'Structure', 'Voice', 'Evidence', 'Concision'].map((label, index) => {
            const labelPoints = [[60,8], [112,42], [94,112], [16,112], [7,42]][index]
            return <text key={label} x={labelPoints[0]} y={labelPoints[1]}>{label}</text>
          })}
        </svg>
      </section>
    </div>
  )
}

function radarPoints(scores) {
  const center = 60
  const maxRadius = 48
  const padded = [...scores, 0, 0, 0, 0, 0].slice(0, 5)
  return padded.map((score, index) => {
    const angle = (-90 + index * 72) * (Math.PI / 180)
    const radius = Math.max(10, (score / 4) * maxRadius)
    return `${center + Math.cos(angle) * radius},${center + Math.sin(angle) * radius}`
  }).join(' ')
}

function CaseFileFolder({ task, state, setState, result }) {
  const { cards, placements, placedIds, pick, place, clear } = usePlacementHelpers(task, state, setState)
  return (
    <div className="case-folder">
      <div className="folder-tab">{task.caseTitle || task.title}</div>
      <p>{task.caseBrief || task.prompt}</p>
      <div className="folder-lanes">
        {getZones(task).map((zone) => {
          const placed = getCard(cards, placements[zone.id])
          const feedback = result?.checks?.[zone.id]
          return (
            <button key={zone.id} type="button" className={`folder-lane ${placed ? 'has-card' : ''} ${feedback ? (feedback.correct ? 'is-correct' : 'is-wrong') : ''}`} onClick={() => (placed ? clear(zone.id) : place(zone.id))} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); place(zone.id, event.dataTransfer.getData('text/plain')) }}>
              <span>{zone.label}</span>
              <strong>{placed?.label || 'Drop observation'}</strong>
            </button>
          )
        })}
      </div>
      <div className="observation-tray">{cards.map((card) => <DragChip key={card.id} card={card} selected={state.selectedCardId === card.id} used={placedIds.has(card.id)} onPick={() => pick(card.id)} onDragStart={(event) => event.dataTransfer.setData('text/plain', card.id)} />)}</div>
    </div>
  )
}

function ConceptPairing({ task, state, setState, result }) {
  const concept = task.questions?.[0]
  const intervention = task.questions?.[1]
  return (
    <div className="scenario-pairing">
      <section className="scenario-card">
        <span>Scenario</span>
        <strong>{task.scenario || task.prompt}</strong>
      </section>
      <section className="pair-strip">
        <h3>Concept</h3>
        {concept?.options.map((option) => <button key={option} type="button" className={state.choices?.[concept.id] === option ? 'is-active' : ''} onClick={() => setState((previous) => ({ ...previous, choices: { ...(previous.choices || {}), [concept.id]: option } }))}><span>{option}</span><em>{task.definitions?.[option] || 'Hover definition'}</em></button>)}
      </section>
      <section className="pair-strip">
        <h3>Intervention</h3>
        {intervention?.options.map((option) => <button key={option} type="button" className={state.choices?.[intervention.id] === option ? 'is-active' : ''} onClick={() => setState((previous) => ({ ...previous, choices: { ...(previous.choices || {}), [intervention.id]: option } }))}>{option}</button>)}
      </section>
      <div className="pair-connector">{state.choices?.[concept?.id] && state.choices?.[intervention?.id] ? `${state.choices[concept.id]} → ${state.choices[intervention.id]}` : 'Pick one concept and one intervention'}</div>
      {result ? <StateBadge tone={result.passed ? 'success' : 'warning'} label={result.detail} /> : null}
    </div>
  )
}

function ResearchCritique({ task, state, setState, result }) {
  const selected = new Set(state.selectedCards || [])
  function toggle(cardId) {
    setState((previous) => {
      const next = new Set(previous.selectedCards || [])
      if (next.has(cardId)) next.delete(cardId)
      else next.add(cardId)
      return { ...previous, selectedCards: [...next] }
    })
  }
  return (
    <div className="validity-lab">
      <section className="journal-card">
        <span>Journal of Learning Signals · doi:10.404/demo.2026</span>
        <h3>{task.title}</h3>
        <p>{task.prompt}</p>
      </section>
      <section className="validity-grid">
        {(task.cards || []).map((card) => <button key={card.id} type="button" className={selected.has(card.id) ? 'is-active' : ''} onClick={() => toggle(card.id)}>{card.label}</button>)}
      </section>
      <section className="redesign-composer">
        <button type="button" onClick={() => setState((previous) => ({ ...previous, draft: `${previous.draft || ''}${previous.draft ? '\n' : ''}${(previous.draft || '').split('\n').filter(Boolean).length + 1}. ` }))}>Add step</button>
        <textarea value={state.draft || ''} onChange={(event) => setState((previous) => ({ ...previous, draft: event.target.value }))} placeholder="1. Recruit a larger sample..." />
      </section>
      {result ? <StateBadge tone={result.passed ? 'success' : 'warning'} label={result.detail} /> : null}
    </div>
  )
}

function PolicyMemo({ task, state, setState, result }) {
  const { cards, placements, placedIds, pick, place, clear } = usePlacementHelpers(task, state, setState)
  return (
    <div className="executive-memo">
      <header><span>TO: PathAI Civic Lab</span><span>FROM: Policy Analyst</span><span>RE: {task.title}</span><span>DATE: Today</span></header>
      <div className="memo-sections">
        {getZones(task).map((zone) => {
          const placed = getCard(cards, placements[zone.id])
          const feedback = result?.checks?.[zone.id]
          return (
            <button key={zone.id} type="button" className={`memo-section ${placed ? 'has-card' : ''} ${feedback ? (feedback.correct ? 'is-correct' : 'is-wrong') : ''}`} onClick={() => (placed ? clear(zone.id) : place(zone.id))} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); place(zone.id, event.dataTransfer.getData('text/plain')) }}>
              <strong>{zone.label}</strong>
              <p>{placed?.label || 'Drop memo card'}</p>
              <span>{placed ? `${placed.label.split(/\s+/).length} words` : '0 words'}</span>
            </button>
          )
        })}
      </div>
      <div className="memo-card-tray">{cards.map((card) => <DragChip key={card.id} card={card} selected={state.selectedCardId === card.id} used={placedIds.has(card.id)} onPick={() => pick(card.id)} onDragStart={(event) => event.dataTransfer.setData('text/plain', card.id)} />)}</div>
    </div>
  )
}

function ComparisonMatrix({ task, state, setState, result }) {
  const placedIds = new Set(Object.values(state.placements || {}).filter(Boolean))
  return (
    <div className="institution-matrix">
      <div className="matrix-chip-strip">
        {(task.cards || []).map((card) => <button key={card.id} type="button" disabled={placedIds.has(card.id)} className={state.selectedCardId === card.id ? 'is-selected' : ''} onClick={() => setState((previous) => ({ ...previous, selectedCardId: previous.selectedCardId === card.id ? null : card.id }))}>{card.label}</button>)}
      </div>
      <div className="comparison-matrix">
        <span />
        {(task.columns || []).map((column) => <strong key={column}>{column}</strong>)}
        {(task.rows || []).flatMap((row) => [
          <strong key={`${row}:label`}>{row}</strong>,
          ...(task.columns || []).map((column) => {
            const cell = (task.cells || []).find((item) => item.row === row && item.column === column)
            const placed = getCard(task.cards, state.placements?.[cell?.id])
            const correct = result?.checks?.[cell?.id]
            return (
              <button key={cell?.id || `${row}:${column}`} type="button" className={result ? (correct ? 'is-correct' : 'is-wrong') : ''} onClick={() => {
                if (!state.selectedCardId || !cell?.id) return
                setState((previous) => ({ ...previous, placements: { ...(previous.placements || {}), [cell.id]: previous.selectedCardId }, selectedCardId: null }))
              }}>
                {placed?.label || 'Drop evidence'}
              </button>
            )
          }),
        ])}
      </div>
    </div>
  )
}

function MockDebateStage({ task, state, setState, result }) {
  const { cards, placements, placedIds, pick, place, clear } = usePlacementHelpers(task, state, setState)
  return (
    <div className="mock-debate-stage">
      <div className="round-counter">Round 1 of 3</div>
      <div className="podiums">
        {getZones(task).map((zone) => {
          const placed = getCard(cards, placements[zone.id])
          const feedback = result?.checks?.[zone.id]
          return (
            <button key={zone.id} type="button" className={`podium ${placed ? 'has-card' : ''} ${feedback ? (feedback.correct ? 'is-correct' : 'is-wrong') : ''}`} onClick={() => (placed ? clear(zone.id) : place(zone.id))} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); place(zone.id, event.dataTransfer.getData('text/plain')) }}>
              <span>mic</span>
              <strong>{zone.label}</strong>
              <em>{placed?.label || 'Drop card above podium'}</em>
            </button>
          )
        })}
      </div>
      <div className="debate-card-tray">{cards.map((card) => <DragChip key={card.id} card={card} selected={state.selectedCardId === card.id} used={placedIds.has(card.id)} onPick={() => pick(card.id)} onDragStart={(event) => event.dataTransfer.setData('text/plain', card.id)} />)}</div>
    </div>
  )
}

function PunnettSquare({ task, state, setState, result }) {
  const genotypes = ['AA', 'Aa', 'aa']
  function cycleCell(cellId) {
    setState((previous) => {
      const current = previous.cells?.[cellId] || ''
      const next = genotypes[(genotypes.indexOf(current) + 1) % genotypes.length] || genotypes[0]
      return { ...previous, cells: { ...(previous.cells || {}), [cellId]: next } }
    })
  }
  return (
    <div className="punnett-workbench">
      <section className="carrier-key"><span className="dominant">A</span> dominant allele <span className="recessive">a</span> recessive allele</section>
      <div className="punnett-grid">
        <span />
        {(task.parentA || []).map((allele) => <strong key={`a-${allele}`}><i>{allele}</i></strong>)}
        {(task.parentB || []).flatMap((rowAllele) => [
          <strong key={`b-${rowAllele}`}><i>{rowAllele}</i></strong>,
          ...(task.parentA || []).map((columnAllele) => {
            const cell = (task.cells || []).find((item) => item.row === rowAllele && item.column === columnAllele)
            return (
              <button key={cell?.id || `${rowAllele}:${columnAllele}`} type="button" className={result ? (result.checks?.[cell?.id] ? 'is-correct' : 'is-wrong') : ''} onClick={() => cell?.id && cycleCell(cell.id)}>
                {state.cells?.[cell?.id] || '?'}
              </button>
            )
          }),
        ])}
      </div>
      <div className="ratio-toggles">
        <SegmentedGroup label="Genotype ratio" value={state.genotypeRatio} options={['1 AA : 2 Aa : 1 aa', '2 AA : 1 Aa : 1 aa', '4 Aa']} correct={result?.checks?.genotypeRatio} onChange={(value) => setState((previous) => ({ ...previous, genotypeRatio: value }))} />
        <SegmentedGroup label="Phenotype ratio" value={state.phenotypeRatio} options={['3 dominant : 1 recessive', '1 dominant : 3 recessive', '1 dominant : 1 recessive']} correct={result?.checks?.phenotypeRatio} onChange={(value) => setState((previous) => ({ ...previous, phenotypeRatio: value }))} />
      </div>
    </div>
  )
}

function renderWidget(task, state, setState, result) {
  switch (task.taskType) {
    case 'StepByStepProblem': return <StepLadder task={task} state={state} setState={setState} result={result} />
    case 'ProofWriting': return <ProofTable task={task} state={state} setState={setState} result={result} />
    case 'ApplicationProblem': return <FormulaWorkbench task={task} state={state} setState={setState} result={result} />
    case 'VocabDrills': return <VocabMemory task={task} state={state} setState={setState} result={result} />
    case 'FillInTheBlank': return <SentenceBuilder task={task} state={state} setState={setState} result={result} />
    case 'AIConversationRoleplay': return <Conversation task={task} state={state} setState={setState} result={result} />
    case 'SolveWithUnits': return <SolveWithUnits task={task} state={state} setState={setState} result={result} />
    case 'ConceptualExplainBack': return <ChainComposer task={task} state={state} setState={setState} result={result} kind="physics" />
    case 'DiagramAnalysis': return <DiagramLabeler task={task} state={state} setState={setState} result={result} />
    case 'TimelineOrdering': return <TimelineTrack task={task} state={state} setState={setState} result={result} />
    case 'CauseEffectEssay': return <ThesisBuilder task={task} state={state} setState={setState} result={result} />
    case 'SocraticDebate': return <SocraticDebate task={task} state={state} setState={setState} result={result} />
    case 'GraphInterpretation': return <GraphInterpretation task={task} state={state} setState={setState} result={result} />
    case 'CaseAnalysis': return <CaseAnalysis task={task} state={state} setState={setState} result={result} />
    case 'PolicyDebate': return <StakeholderBoard task={task} state={state} setState={setState} result={result} />
    case 'BalanceEquations': return <BalanceEquations task={task} state={state} setState={setState} result={result} />
    case 'ReactionPrediction': return <ReactionPathway task={task} state={state} setState={setState} result={result} />
    case 'NomenclatureDrills': return <NomenclatureMatcher task={task} state={state} setState={setState} result={result} />
    case 'ArgumentMapping': return <ArgumentMapCanvas task={task} state={state} setState={setState} result={result} />
    case 'FallacyIdentification': return <FallacyExaminer task={task} state={state} setState={setState} result={result} />
    case 'AdversarialDebate': return <AdversarialDuel task={task} state={state} setState={setState} result={result} />
    case 'TimedPrompt': return <TimedPrompt task={task} state={state} setState={setState} result={result} />
    case 'RewriteForClarity': return <RewriteLab task={task} state={state} setState={setState} result={result} />
    case 'RubricFeedback': return <RubricBoard task={task} state={state} setState={setState} result={result} />
    case 'CaseStudyAnalysis': return <CaseFileFolder task={task} state={state} setState={setState} result={result} />
    case 'ConceptApplication': return <ConceptPairing task={task} state={state} setState={setState} result={result} />
    case 'ResearchCritique': return <ResearchCritique task={task} state={state} setState={setState} result={result} />
    case 'PolicyBrief': return <PolicyMemo task={task} state={state} setState={setState} result={result} />
    case 'SystemsComparison': return <ComparisonMatrix task={task} state={state} setState={setState} result={result} />
    case 'MockDebate': return <MockDebateStage task={task} state={state} setState={setState} result={result} />
    case 'LabelDiagram': return <DiagramLabeler task={task} state={state} setState={setState} result={result} />
    case 'ExplainMechanism': return <ChainComposer task={task} state={state} setState={setState} result={result} kind="biology" />
    case 'GeneticsProblemSet': return <PunnettSquare task={task} state={state} setState={setState} result={result} />
    default: return <SlotGrid task={task} state={state} setState={setState} result={result} />
  }
}

export default function RichPracticePreview({ demo }) {
  const task = demo.task
  const [state, setState] = useState(() => makeInitialState(task))
  const [result, setResult] = useState(null)
  const [status, setStatus] = useState('idle')

  if (CODE_INTERACTIONS.has(task.interactionType)) {
    return (
      <div style={{ height: '100%', minHeight: 760, background: '#070c14' }}>
        <DomainTaskBase
          taskType={demo.taskType}
          domain={demo.domain}
          goal={demo.goal}
          topic={demo.topic}
          taskTitle={task.title}
          lessonContent={`Static gallery preview for ${demo.goal}.`}
          userLevel="beginner"
          initialTask={task}
          staticPreview
        />
      </div>
    )
  }

  const canCheck = isReady(task, state)

  function checkWork() {
    if (!canCheck) return
    setStatus('checking')
    const next = makeResult(task, state)
    window.setTimeout(() => {
      setResult(next)
      setStatus(next.passed ? 'correct' : 'incorrect')
    }, 180)
  }

  function reset() {
    setState(makeInitialState(task))
    setResult(null)
    setStatus('idle')
  }

  return (
    <ActivityFrame demo={demo} result={result} status={status} canCheck={canCheck} onCheck={checkWork} onReset={reset}>
      {renderWidget(task, state, setState, result)}
    </ActivityFrame>
  )
}

const styles = `
  .rpg {
    min-height: 100%;
    color: #f8fafc;
    background:
      radial-gradient(circle at 14% 4%, var(--accent-soft), transparent 34%),
      linear-gradient(135deg, rgba(255,255,255,0.045), rgba(255,255,255,0.012)),
      #070c14;
    font-family: 'Plus Jakarta Sans','DM Sans',system-ui,sans-serif;
    padding: 18px;
  }
  .activity-frame {
    position: relative;
    min-height: 720px;
    border: 1px solid rgba(255,255,255,0.10);
    border-radius: 8px;
    overflow: hidden;
    background: rgba(5,8,14,0.72);
  }
  .activity-edge {
    position: absolute;
    inset: 0 auto 0 0;
    width: 5px;
    background: var(--accent);
  }
  .activity-header {
    display: flex;
    justify-content: space-between;
    gap: 18px;
    padding: 20px 22px 16px 28px;
    border-bottom: 1px solid rgba(255,255,255,0.08);
    background: rgba(255,255,255,0.035);
  }
  .activity-breadcrumb {
    color: var(--accent);
    font-size: 11px;
    font-weight: 950;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }
  .activity-header h2 {
    margin: 7px 0 8px;
    font-size: clamp(25px, 3vw, 38px);
    line-height: 1.02;
    letter-spacing: 0;
  }
  .activity-header p,
  .activity-instructions p {
    margin: 0;
    max-width: 820px;
    color: #a1a1aa;
    line-height: 1.55;
    font-size: 14px;
  }
  .activity-instructions {
    display: grid;
    grid-template-columns: 120px minmax(0, 1fr);
    gap: 14px;
    padding: 14px 22px 14px 28px;
    border-bottom: 1px solid rgba(255,255,255,0.08);
    background: rgba(0,0,0,0.18);
  }
  .activity-instructions span {
    color: var(--accent);
    font-size: 11px;
    font-weight: 950;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }
  .activity-body {
    padding: 18px 18px 96px 23px;
  }
  .state-badge {
    align-self: flex-start;
    white-space: nowrap;
    border-radius: 999px;
    border: 1px solid rgba(255,255,255,0.12);
    background: rgba(0,0,0,0.26);
    color: #d1d5db;
    padding: 8px 11px;
    font-size: 12px;
    font-weight: 950;
  }
  .state-badge.is-success {
    border-color: rgba(74,222,128,0.42);
    color: #86efac;
  }
  .state-badge.is-error,
  .state-badge.is-warning {
    border-color: rgba(248,113,113,0.42);
    color: #fecaca;
  }
  .math-text,
  .chem-text {
    display: inline-flex;
    flex-wrap: wrap;
    gap: 0.02em;
    font-family: ui-serif, 'Cambria Math', Georgia, serif;
    font-style: normal;
    line-height: 1.4;
  }
  .math-text i,
  .math-inline i {
    font-style: italic;
  }
  .math-frac {
    display: inline-grid;
    margin: 0 0.18em;
    vertical-align: middle;
  }
  .math-frac > span:first-child {
    border-bottom: 1px solid rgba(255,255,255,0.42);
    padding: 0 0.18em 0.05em;
  }
  .math-frac > span:last-child {
    padding: 0.05em 0.18em 0;
  }
  .math-sqrt {
    display: inline-flex;
    align-items: center;
    gap: 0.1em;
  }
  .lang-text {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  .lang-speaker {
    width: 22px;
    height: 22px;
    border-radius: 999px;
    border: 1px solid rgba(255,255,255,0.14);
    background: rgba(255,255,255,0.06);
    color: #e5e7eb;
    font-size: 11px;
    line-height: 1;
    display: inline-grid;
    place-items: center;
  }
  .reasoning-ladder {
    display: grid;
    grid-template-columns: 72px minmax(0, 1fr);
    gap: 18px;
  }
  .reasoning-ladder aside {
    display: grid;
    align-content: start;
    gap: 10px;
  }
  .reasoning-ladder aside span {
    color: var(--accent);
    font-size: 11px;
    font-weight: 950;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
  .reasoning-ladder aside i {
    height: 40px;
    border-radius: 999px;
    border: 1px solid rgba(255,255,255,0.10);
    background: rgba(255,255,255,0.04);
    display: grid;
    place-items: center;
    font-style: normal;
    font-weight: 900;
    color: #94a3b8;
  }
  .reasoning-ladder aside i.is-active {
    border-color: var(--accent);
    background: var(--accent-soft);
    color: #fff;
  }
  .ladder-rungs,
  .chain-track,
  .proof-chip-tray,
  .editorial-card-deck,
  .tradeoff-chip-bank,
  .memo-card-tray,
  .debate-card-tray,
  .observation-tray,
  .argument-chip-row {
    display: grid;
    gap: 12px;
  }
  .ladder-card,
  .chain-node {
    display: grid;
    grid-template-columns: 54px minmax(0, 1fr) auto;
    gap: 14px;
    align-items: center;
    border: 1px solid rgba(255,255,255,0.10);
    border-radius: 8px;
    background: linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03));
    padding: 14px;
    position: relative;
  }
  .ladder-card::before,
  .chain-node::before {
    content: '';
    position: absolute;
    inset: auto auto -12px 26px;
    width: 2px;
    height: 12px;
    background: rgba(255,255,255,0.12);
  }
  .ladder-rungs .ladder-card:last-child::before {
    display: none;
  }
  .rung-number,
  .chain-node > span:first-child {
    width: 40px;
    height: 40px;
    border-radius: 999px;
    display: grid;
    place-items: center;
    font-weight: 950;
    background: var(--accent);
    color: #071510;
  }
  .rung-actions,
  .pin-actions {
    display: flex;
    gap: 8px;
  }
  .rung-actions button,
  .pin-actions button {
    width: 40px;
    height: 40px;
    border-radius: 999px;
    border: 1px solid rgba(255,255,255,0.12);
    background: rgba(255,255,255,0.05);
    color: #e5e7eb;
  }
  .proof-workbench,
  .formula-workbench,
  .unit-bench,
  .flashcard-match,
  .inline-sentence-builder,
  .chat-simulator,
  .timeline-track-widget,
  .thesis-builder-board,
  .dialectic-exchange,
  .supply-demand-sim,
  .case-brief-dashboard,
  .stakeholder-scale,
  .inline-equation-balancer,
  .reaction-pathway,
  .nomenclature-matcher,
  .argument-map-canvas,
  .fallacy-examiner,
  .steelman-duel,
  .writing-sprint,
  .diff-lab,
  .rubric-studio,
  .case-folder,
  .scenario-pairing,
  .validity-lab,
  .executive-memo,
  .institution-matrix,
  .mock-debate-stage,
  .diagram-board,
  .punnett-workbench {
    display: grid;
    gap: 16px;
  }
  .proof-table-title,
  .proof-row {
    display: grid;
    grid-template-columns: 44px minmax(180px, 0.8fr) minmax(0, 1fr);
    gap: 12px;
    align-items: stretch;
  }
  .proof-table-title {
    color: #94a3b8;
    font-size: 11px;
    font-weight: 950;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
  .proof-cell,
  .formula-slot,
  .unit-slot,
  .editorial-bin,
  .bucket,
  .memo-section,
  .folder-lane,
  .pathway-node,
  .argument-node,
  .podium,
  .inline-blank,
  .case-tile,
  .memory-card,
  .pair-strip button,
  .validity-grid button,
  .market-snapshot span,
  .outcome-cards button,
  .nomenclature-matcher button,
  .matrix-chip-strip button {
    border: 1px solid rgba(255,255,255,0.10);
    border-radius: 8px;
    background: rgba(255,255,255,0.045);
    color: #f8fafc;
  }
  .proof-cell,
  .formula-slot,
  .unit-slot,
  .editorial-bin,
  .bucket,
  .memo-section,
  .folder-lane,
  .pathway-node,
  .podium {
    min-height: 104px;
    padding: 14px;
    text-align: left;
  }
  .formula-strip,
  .unit-formula-strip,
  .unit-chip-tray,
  .word-tray,
  .edit-move-tray,
  .matrix-chip-strip,
  .chem-chip-bank {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }
  .formula-strip,
  .unit-formula-strip {
    padding: 14px;
    border-radius: 8px;
    border: 1px solid rgba(255,255,255,0.10);
    background: rgba(255,255,255,0.035);
  }
  .formula-strip > span,
  .unit-formula-strip > span {
    width: 100%;
    color: var(--accent);
    font-size: 11px;
    font-weight: 950;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
  .formula-strip > div,
  .formula-mini-bank,
  .formula-steps,
  .thesis-zones,
  .stakeholder-columns,
  .dialectic-lanes,
  .memo-sections,
  .folder-lanes,
  .validity-grid,
  .case-brief-dashboard,
  .nomenclature-matcher {
    display: grid;
    gap: 12px;
  }
  .formula-steps,
  .stakeholder-columns,
  .dialectic-lanes,
  .memo-sections {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
  .formula-step,
  .case-tile,
  .market-snapshot,
  .journal-card,
  .scenario-card,
  .response-composer,
  .pair-connector,
  .carrier-key,
  .dimensional-card,
  .matched-tray,
  .folder-tab,
  .duel-scoreboard,
  .round-counter,
  .thesis-card {
    border: 1px solid rgba(255,255,255,0.10);
    border-radius: 8px;
    background: rgba(255,255,255,0.045);
    padding: 14px;
  }
  .formula-mini-bank button,
  .unit-chip-tray button,
  .word-tray button,
  .edit-move-tray button,
  .chem-chip-bank button,
  .outcome-cards button,
  .matrix-chip-strip button,
  .pair-strip button,
  .nomenclature-matcher button {
    padding: 10px 12px;
  }
  .formula-mini-bank button.is-selected,
  .unit-chip-tray button.is-selected,
  .word-tray button.is-selected,
  .edit-move-tray button.is-active,
  .matrix-chip-strip button.is-selected,
  .pair-strip button.is-active,
  .validity-grid button.is-active,
  .outcome-cards button.is-active,
  .nomenclature-matcher button.is-active {
    border-color: var(--accent);
    background: var(--accent-soft);
  }
  .formula-answer,
  .unit-answer {
    display: grid;
    gap: 10px;
    grid-template-columns: 1fr auto;
    align-items: center;
  }
  .formula-answer label,
  .unit-answer label {
    grid-column: 1 / -1;
    color: #94a3b8;
    font-size: 11px;
    font-weight: 950;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
  .unit-pill {
    align-self: stretch;
    display: grid;
    place-items: center;
    min-width: 56px;
    border-radius: 999px;
    border: 1px solid rgba(255,255,255,0.14);
    background: rgba(255,255,255,0.06);
    font-weight: 900;
  }
  .memory-board {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }
  .memory-card {
    min-height: 124px;
    padding: 14px;
    text-align: left;
  }
  .memory-card.phrase small,
  .memory-card.meaning span,
  .memory-card.meaning small {
    display: block;
    margin-top: 8px;
    color: #94a3b8;
  }
  .memory-card.is-matched {
    opacity: 0.88;
  }
  .sentence-canvas {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    align-items: center;
    padding: 18px;
    border: 1px solid rgba(255,255,255,0.10);
    border-radius: 8px;
    background: rgba(255,255,255,0.03);
    font-size: clamp(18px, 2.8vw, 30px);
    font-weight: 950;
  }
  .inline-blank {
    min-width: 180px;
    min-height: 56px;
    padding: 10px 14px;
    border-style: dashed;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }
  .chat-simulator .chat-feed {
    min-height: 320px;
    padding: 10px;
    border-radius: 8px;
    border: 1px solid rgba(255,255,255,0.10);
    background: rgba(0,0,0,0.16);
    overflow: auto;
  }
  .chat-row {
    display: grid;
    grid-template-columns: 34px minmax(0, 1fr);
    gap: 10px;
    margin-bottom: 12px;
    align-items: start;
  }
  .chat-row.is-user {
    grid-template-columns: minmax(0, 1fr) 34px;
  }
  .chat-row.is-user .chat-bubble {
    order: -1;
    background: var(--accent-soft);
  }
  .avatar {
    width: 34px;
    height: 34px;
    border-radius: 999px;
    display: grid;
    place-items: center;
    border: 1px solid rgba(255,255,255,0.14);
    background: rgba(255,255,255,0.05);
    font-size: 11px;
    font-weight: 950;
  }
  .typing-indicator {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #94a3b8;
    padding: 12px 0;
  }
  .typing-indicator i {
    width: 7px;
    height: 7px;
    border-radius: 999px;
    background: var(--accent);
    opacity: 0.5;
  }
  .chat-composer {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 10px;
  }
  .chat-composer textarea {
    min-height: 104px;
  }
  .chat-composer button {
    align-self: end;
    min-height: 48px;
    padding: 0 18px;
    border-radius: 8px;
    border: 1px solid rgba(255,255,255,0.12);
    background: var(--accent);
    color: #071510;
    font-weight: 950;
  }
  .unit-bench {
    grid-template-columns: 1.1fr 1fr;
    align-items: start;
  }
  .unit-bench > *:nth-child(1),
  .unit-bench > *:nth-child(2),
  .unit-bench > *:nth-child(4) {
    grid-column: 1;
  }
  .unit-bench > *:nth-child(3) {
    grid-column: 2;
    grid-row: 1 / span 3;
  }
  .chain-track {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 14px;
  }
  .chain-node {
    grid-template-columns: auto;
    text-align: left;
  }
  .chain-node::before {
    display: none;
  }
  .chain-node em {
    color: var(--accent);
    font-size: 11px;
    font-weight: 950;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
  .step-scrubber {
    color: #94a3b8;
    font-size: 12px;
    font-weight: 900;
  }
  .diagram-board svg {
    width: 100%;
    min-height: 360px;
    border-radius: 8px;
    border: 1px solid rgba(255,255,255,0.10);
    background: rgba(255,255,255,0.03);
  }
  .target-ring {
    fill: rgba(255,255,255,0.04);
    stroke: var(--accent);
    stroke-width: 1.4;
  }
  .target-ring.is-filled {
    fill: var(--accent-soft);
  }
  .svg-pill {
    display: inline-flex;
    padding: 3px 7px;
    border-radius: 999px;
    border: 1px solid rgba(255,255,255,0.14);
    background: rgba(7,12,20,0.9);
    color: #f8fafc;
    font-size: 9px;
    font-weight: 900;
  }
  .diagram-chip-tray {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }
  .diagram-chip-tray button {
    padding: 10px 12px;
    border-radius: 999px;
    border: 1px solid rgba(255,255,255,0.12);
    background: rgba(255,255,255,0.055);
    color: #f8fafc;
  }
  .timeline-rail {
    position: relative;
    min-height: 260px;
    border-radius: 8px;
    border: 1px solid rgba(255,255,255,0.10);
    background: linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02));
    padding: 18px 16px 40px;
  }
  .timeline-rail::after {
    content: '';
    position: absolute;
    left: 8%;
    right: 8%;
    top: 186px;
    height: 3px;
    border-radius: 999px;
    background: rgba(255,255,255,0.12);
  }
  .timeline-rail > span {
    position: absolute;
    top: 194px;
    transform: translateX(-50%);
    color: #94a3b8;
    font-size: 11px;
  }
  .timeline-pin {
    position: absolute;
    top: 36px;
    width: 180px;
    transform: translateX(-50%);
    padding: 12px;
    border-radius: 8px;
    border: 1px solid rgba(255,255,255,0.10);
    background: rgba(255,255,255,0.055);
  }
  .timeline-pin i {
    display: block;
    width: 12px;
    height: 12px;
    margin: 0 auto 8px;
    border-radius: 999px;
    background: var(--accent);
    box-shadow: 0 135px 0 -4px var(--accent);
  }
  .timeline-pin small {
    position: absolute;
    top: 100%;
    margin-top: 8px;
    color: #fecaca;
    white-space: nowrap;
  }
  .thesis-hero span,
  .market-snapshot h3,
  .case-tile h3,
  .folder-lane span,
  .memo-section strong,
  .pathway-node span,
  .podium span,
  .case-folder .folder-tab,
  .journal-card span,
  .scenario-card span,
  .thesis-card {
    color: var(--accent);
    font-size: 11px;
    font-weight: 950;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  .argument-segments {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
    margin-top: 12px;
  }
  .argument-segments i {
    height: 10px;
    border-radius: 999px;
    background: rgba(255,255,255,0.10);
  }
  .argument-segments i.is-filled {
    background: var(--accent);
  }
  .dialectic-lanes section,
  .pair-strip,
  .redesign-composer {
    border-radius: 8px;
    border: 1px solid rgba(255,255,255,0.10);
    background: rgba(255,255,255,0.04);
    padding: 14px;
  }
  .dialectic-lanes h3,
  .pair-strip h3 {
    margin: 0 0 10px;
    font-size: 13px;
    font-weight: 950;
  }
  .dialectic-lanes button,
  .pair-strip button,
  .duel-podium button {
    display: block;
    width: 100%;
    margin-bottom: 8px;
    padding: 10px 12px;
    text-align: left;
  }
  .dialectic-lanes button.is-selected,
  .duel-podium button.is-selected {
    border-color: var(--accent);
    background: var(--accent-soft);
  }
  .response-composer textarea,
  .redesign-composer textarea,
  .duel-podium textarea {
    min-height: 110px;
  }
  .graph-controls {
    display: grid;
    gap: 12px;
  }
  .market-graph .ghost {
    stroke: rgba(255,255,255,0.14);
    stroke-dasharray: 3 3;
  }
  .outcome-cards {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
  }
  .outcome-cards button {
    min-height: 86px;
    padding: 12px;
    text-align: left;
  }
  .outcome-cards svg {
    width: 42px;
    height: 24px;
    display: block;
    margin-bottom: 10px;
  }
  .outcome-cards path,
  .outcome-cards circle {
    fill: none;
    stroke: currentColor;
    stroke-width: 2;
  }
  .case-brief-dashboard {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .case-brief-dashboard footer {
    grid-column: 1 / -1;
    padding: 14px;
    border-radius: 8px;
    border: 1px solid rgba(255,255,255,0.10);
    background: rgba(0,0,0,0.18);
    color: #d1d5db;
  }
  .stakeholder-scale svg {
    width: 100%;
    max-width: 560px;
    justify-self: center;
    fill: none;
    stroke: rgba(255,255,255,0.28);
    stroke-width: 2;
  }
  .stakeholder-columns {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
  .equation-line {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    align-items: center;
    padding: 16px;
    border-radius: 8px;
    border: 1px solid rgba(255,255,255,0.10);
    background: rgba(255,255,255,0.04);
  }
  .equation-piece {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 10px 12px;
    border-radius: 999px;
    border: 1px solid rgba(255,255,255,0.10);
    background: rgba(0,0,0,0.16);
  }
  .reaction-arrow {
    color: var(--accent);
    font-size: 28px;
    padding: 0 4px;
  }
  .coef-spinner {
    display: inline-grid;
    grid-template-columns: repeat(3, auto);
    gap: 6px;
    align-items: center;
  }
  .coef-spinner button {
    width: 28px;
    height: 28px;
    border-radius: 999px;
    border: 1px solid rgba(255,255,255,0.12);
    background: rgba(255,255,255,0.06);
    color: #f8fafc;
  }
  .atom-ledger-row {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }
  .atom-ledger-row span {
    padding: 8px 10px;
    border-radius: 999px;
    border: 1px solid rgba(255,255,255,0.10);
    background: rgba(255,255,255,0.045);
  }
  .pathway-nodes,
  .podiums {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;
  }
  .pathway-node {
    position: relative;
  }
  .pathway-node i {
    position: absolute;
    right: -18px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--accent);
    font-style: normal;
    font-size: 22px;
  }
  .nomenclature-matcher {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
  .nomenclature-matcher footer {
    grid-column: 1 / -1;
    padding: 14px;
    border-radius: 8px;
    border: 1px solid rgba(255,255,255,0.10);
    background: rgba(0,0,0,0.16);
  }
  .argument-map-canvas {
    position: relative;
    min-height: 420px;
    border-radius: 8px;
    border: 1px solid rgba(255,255,255,0.10);
    background: rgba(255,255,255,0.03);
    padding: 18px;
  }
  .argument-map-canvas svg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
  }
  .argument-map-canvas path {
    fill: none;
    stroke: rgba(255,255,255,0.22);
    stroke-width: 2;
  }
  .argument-map-canvas .dotted {
    stroke-dasharray: 4 4;
  }
  .argument-map-canvas .attack {
    stroke: #f87171;
  }
  .argument-node {
    position: absolute;
    width: 28%;
    min-height: 110px;
    padding: 12px;
    transform: translate(-50%, -50%);
    text-align: left;
  }
  .fallacy-examiner {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .fallacy-examiner blockquote {
    grid-column: 1 / -1;
    margin: 0;
    padding: 24px;
    border-radius: 8px;
    border: 1px solid rgba(255,255,255,0.12);
    background: rgba(255,255,255,0.04);
    font-size: 20px;
    line-height: 1.5;
    position: relative;
  }
  .fallacy-underline {
    display: block;
    margin-top: 14px;
    color: #fca5a5;
    text-decoration: underline wavy currentColor;
    text-underline-offset: 5px;
    font-size: 13px;
  }
  .steelman-duel {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .steelman-duel .duel-scoreboard,
  .steelman-duel .state-badge {
    grid-column: 1 / -1;
  }
  .duel-podium {
    padding: 16px;
    border-radius: 8px;
    border: 1px solid rgba(255,255,255,0.10);
    background: rgba(255,255,255,0.04);
  }
  .writing-sprint {
    grid-template-columns: 260px minmax(0, 1fr) 280px;
    align-items: start;
  }
  .sprint-timer,
  .sprint-draft,
  .sprint-checklist {
    padding: 14px;
    border-radius: 8px;
    border: 1px solid rgba(255,255,255,0.10);
    background: rgba(255,255,255,0.04);
  }
  .sprint-timer svg {
    width: 172px;
    height: 172px;
    display: block;
    margin: 0 auto 10px;
  }
  .sprint-timer circle {
    fill: none;
    stroke: rgba(255,255,255,0.10);
    stroke-width: 8;
  }
  .sprint-timer .timer-progress {
    stroke: var(--accent);
    stroke-linecap: round;
    stroke-dasharray: 302;
    transform: rotate(-90deg);
    transform-origin: 60px 60px;
  }
  .sprint-timer strong {
    display: block;
    text-align: center;
    font-size: 28px;
    font-weight: 950;
    margin-bottom: 12px;
  }
  .sprint-timer div {
    display: flex;
    gap: 10px;
    justify-content: center;
  }
  .sprint-timer button {
    min-height: 44px;
    padding: 0 14px;
    border-radius: 8px;
    border: 1px solid rgba(255,255,255,0.12);
    background: rgba(255,255,255,0.05);
    color: #e5e7eb;
  }
  .sprint-draft span {
    display: block;
    color: #94a3b8;
    font-size: 11px;
    font-weight: 950;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    margin-bottom: 10px;
  }
  .sprint-checklist label {
    display: flex;
    gap: 8px;
    align-items: center;
    min-height: 44px;
    margin-bottom: 8px;
    padding: 10px;
    border-radius: 8px;
    border: 1px solid rgba(255,255,255,0.10);
  }
  .sprint-checklist label.is-checked {
    border-color: rgba(74,222,128,0.62);
  }
  .diff-lab {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .before-pane,
  .after-pane {
    padding: 14px;
    border-radius: 8px;
    border: 1px solid rgba(255,255,255,0.10);
    background: rgba(255,255,255,0.04);
  }
  .before-pane button {
    display: block;
    width: 100%;
    margin-bottom: 10px;
    padding: 12px;
    border-radius: 8px;
    border: 1px solid rgba(255,255,255,0.10);
    background: rgba(255,255,255,0.03);
    color: #f8fafc;
    text-align: left;
  }
  .edit-move-tray {
    grid-column: 1 / -1;
  }
  .token-diff ins {
    background: rgba(74,222,128,0.12);
    color: #86efac;
    text-decoration: none;
  }
  .token-diff del {
    color: #fca5a5;
  }
  .rubric-studio {
    grid-template-columns: minmax(0, 1fr) 340px;
  }
  .annotated-draft,
  .rubric-scorer {
    padding: 14px;
    border-radius: 8px;
    border: 1px solid rgba(255,255,255,0.10);
    background: rgba(255,255,255,0.04);
  }
  .annotated-draft p {
    margin: 0 0 12px;
  }
  .annotated-draft p button {
    margin-left: 10px;
    padding: 4px 8px;
    border-radius: 999px;
    border: 1px solid rgba(255,255,255,0.12);
    background: rgba(255,255,255,0.04);
    color: #d1d5db;
  }
  .annotated-draft span {
    display: inline-flex;
    margin: 6px 8px 0 0;
    padding: 6px 10px;
    border-radius: 999px;
    border: 1px solid rgba(255,255,255,0.12);
    background: rgba(255,255,255,0.05);
  }
  .radar text {
    fill: #94a3b8;
    font-size: 6px;
  }
  .radar .radar-fill {
    fill: var(--accent-soft);
    stroke: var(--accent);
  }
  .case-folder {
    padding: 18px;
    border-radius: 8px;
    border: 1px solid rgba(255,255,255,0.10);
    background: linear-gradient(180deg, rgba(196,164,111,0.08), rgba(255,255,255,0.02));
  }
  .folder-tab {
    width: fit-content;
    margin-top: -28px;
    margin-bottom: 12px;
    background: rgba(196,164,111,0.18);
  }
  .folder-lanes {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
  .scenario-pairing {
    grid-template-columns: 1fr;
  }
  .pair-strip {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }
  .pair-strip button {
    min-width: 180px;
    text-align: left;
  }
  .pair-strip button em {
    display: block;
    color: #94a3b8;
    font-size: 12px;
    margin-top: 6px;
    font-style: normal;
  }
  .validity-lab {
    grid-template-columns: minmax(0, 1fr) 0.9fr;
  }
  .validity-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .validity-grid button {
    min-height: 92px;
    padding: 12px;
    text-align: left;
  }
  .redesign-composer {
    display: grid;
    gap: 10px;
  }
  .redesign-composer button {
    min-height: 44px;
    padding: 0 12px;
    border-radius: 8px;
    border: 1px solid rgba(255,255,255,0.12);
    background: rgba(255,255,255,0.05);
    color: #e5e7eb;
  }
  .executive-memo header {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 10px;
    font-size: 12px;
    color: #cbd5e1;
  }
  .executive-memo header span {
    padding: 10px 12px;
    border-radius: 8px;
    border: 1px solid rgba(255,255,255,0.10);
    background: rgba(255,255,255,0.04);
  }
  .institution-matrix {
    gap: 14px;
  }
  .comparison-matrix {
    grid-template-columns: 180px repeat(2, minmax(0, 1fr));
  }
  .comparison-matrix > strong {
    position: sticky;
    top: 0;
    background: rgba(12,18,28,0.96);
    z-index: 1;
  }
  .mock-debate-stage .podium {
    min-height: 180px;
    padding-top: 24px;
    position: relative;
  }
  .mock-debate-stage .podium span {
    display: inline-flex;
    margin-bottom: 10px;
  }
  .carrier-key {
    display: flex;
    gap: 12px;
    align-items: center;
  }
  .carrier-key .dominant,
  .carrier-key .recessive {
    display: inline-flex;
    width: 24px;
    height: 24px;
    border-radius: 999px;
    justify-content: center;
    align-items: center;
    font-style: italic;
  }
  .carrier-key .dominant {
    background: rgba(14,245,194,0.16);
  }
  .carrier-key .recessive {
    background: rgba(251,113,133,0.14);
  }
  .ratio-toggles {
    display: grid;
    gap: 12px;
  }
  .widget-grid,
  .proof-layout,
  .formula-layout,
  .vocab-layout,
  .diagram-layout,
  .graph-layout,
  .debate-board,
  .writing-layout,
  .rewrite-layout,
  .rubric-layout,
  .research-layout,
  .matrix-layout,
  .punnett-layout,
  .chem-layout {
    display: grid;
    grid-template-columns: minmax(0, 0.92fr) minmax(0, 1.08fr);
    gap: 14px;
  }
  .vocab-layout,
  .formula-layout {
    grid-template-columns: minmax(220px, 0.75fr) minmax(0, 1.25fr);
  }
  .widget-panel {
    min-width: 0;
    border: 1px solid rgba(255,255,255,0.10);
    border-radius: 8px;
    background: rgba(255,255,255,0.04);
    padding: 14px;
  }
  .widget-panel h3 {
    margin: 0 0 12px;
    color: #f8fafc;
    font-size: 14px;
    font-weight: 950;
  }
  .chip-bank,
  .slot-grid,
  .memory-grid {
    display: grid;
    gap: 9px;
  }
  .drag-chip,
  .drop-slot,
  .segmented-group button,
  .order-controls button,
  .molecule-card button,
  .comparison-matrix button,
  .punnett-grid button,
  .rubric-row button,
  .check-button,
  .ghost-button,
  .suggestion-strip button {
    min-height: 44px;
    border-radius: 8px;
    font: inherit;
    font-weight: 900;
    cursor: pointer;
  }
  .drag-chip {
    width: 100%;
    border: 1px solid rgba(255,255,255,0.12);
    background: rgba(255,255,255,0.055);
    color: #f8fafc;
    padding: 12px;
    text-align: left;
    transition: transform 0.14s ease, border-color 0.14s ease, background 0.14s ease, opacity 0.14s ease;
  }
  .drag-chip span {
    display: block;
    margin-top: 5px;
    color: #94a3b8;
    font-size: 12px;
  }
  .drag-chip.is-selected {
    border-color: var(--accent);
    background: var(--accent-soft);
    box-shadow: 0 0 0 2px rgba(255,255,255,0.03) inset;
  }
  .drag-chip.is-used {
    opacity: 0.52;
  }
  .drop-slot {
    width: 100%;
    min-height: 88px;
    border: 1px dashed rgba(255,255,255,0.22);
    background: rgba(0,0,0,0.19);
    color: #d1d5db;
    text-align: left;
    padding: 12px;
  }
  .drop-slot span {
    display: block;
    color: #94a3b8;
    font-size: 11px;
    font-weight: 950;
    letter-spacing: 0.08em;
    margin-bottom: 7px;
    text-transform: uppercase;
  }
  .drop-slot strong {
    display: block;
    line-height: 1.35;
  }
  .drop-slot.has-card {
    border-style: solid;
    border-color: rgba(255,255,255,0.18);
    background: var(--accent-tint);
  }
  .drop-slot.is-correct,
  .order-card.is-correct,
  .segmented-group.is-correct,
  .molecule-card.is-correct,
  .comparison-matrix .is-correct,
  .punnett-grid .is-correct,
  .answer-box.is-correct {
    border-color: rgba(74,222,128,0.72);
    box-shadow: 0 0 0 1px rgba(74,222,128,0.18) inset;
  }
  .drop-slot.is-wrong,
  .order-card.is-wrong,
  .segmented-group.is-wrong,
  .molecule-card.is-wrong,
  .comparison-matrix .is-wrong,
  .punnett-grid .is-wrong,
  .answer-box.is-wrong {
    border-color: rgba(248,113,113,0.72);
    box-shadow: 0 0 0 1px rgba(248,113,113,0.17) inset;
  }
  .drop-slot em {
    display: block;
    margin-top: 8px;
    color: #cbd5e1;
    font-style: normal;
    font-size: 12px;
  }
  .proof-table,
  .order-board,
  .choice-grid,
  .rubric-rows,
  .checklist,
  .ledger-grid {
    display: grid;
    gap: 10px;
  }
  .proof-row {
    display: grid;
    grid-template-columns: 34px minmax(120px, 0.6fr) minmax(0, 1fr);
    gap: 10px;
    align-items: stretch;
  }
  .proof-row > span,
  .order-index {
    display: grid;
    place-items: center;
    border-radius: 8px;
    background: var(--accent);
    color: #061019;
    font-weight: 950;
  }
  .proof-row > strong {
    display: grid;
    align-items: center;
    border: 1px solid rgba(255,255,255,0.10);
    border-radius: 8px;
    padding: 10px;
    background: rgba(255,255,255,0.04);
  }
  .given-row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .given-row span,
  .dimension-card,
  .scratch-pad,
  .matched-tray span,
  .thesis-card,
  .dashboard-strip,
  .draft-card {
    border: 1px solid rgba(255,255,255,0.10);
    border-radius: 8px;
    background: rgba(255,255,255,0.045);
    color: #d1d5db;
    padding: 10px 12px;
    line-height: 1.5;
  }
  .dimension-card,
  .scratch-pad {
    margin-top: 12px;
  }
  .dimension-card strong {
    display: block;
    color: #86efac;
    margin-top: 5px;
  }
  .answer-box {
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 8px;
    padding: 10px;
    background: rgba(0,0,0,0.18);
  }
  .answer-box input,
  .chat-widget textarea,
  .debate-board textarea,
  .writing-layout textarea,
  .rewrite-layout textarea,
  .research-layout textarea {
    width: 100%;
    min-height: 150px;
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 8px;
    background: rgba(0,0,0,0.23);
    color: #f8fafc;
    padding: 12px;
    font: inherit;
    outline: none;
    resize: vertical;
  }
  .answer-box input {
    min-height: 44px;
  }
  .answer-box span {
    display: block;
    margin-top: 7px;
    color: #fecaca;
    font-size: 12px;
  }
  .sentence-line {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    align-items: center;
    font-size: clamp(20px, 3vw, 32px);
    font-weight: 950;
  }
  .sentence-line > span {
    padding: 10px 12px;
  }
  .sentence-line .drop-slot {
    width: min(260px, 100%);
  }
  .matched-tray {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .matched-tray em {
    color: #71717a;
    font-style: normal;
  }
  .chat-widget {
    display: grid;
    gap: 12px;
  }
  .chat-feed {
    display: grid;
    gap: 10px;
    min-height: 300px;
  }
  .chat-bubble {
    width: min(700px, 88%);
    border: 1px solid rgba(255,255,255,0.10);
    border-radius: 8px;
    background: rgba(255,255,255,0.045);
    padding: 12px;
  }
  .chat-bubble.is-user {
    justify-self: end;
    background: var(--accent-soft);
  }
  .chat-bubble span {
    color: var(--accent);
    font-size: 11px;
    font-weight: 950;
    text-transform: uppercase;
  }
  .chat-bubble p {
    margin: 5px 0 0;
  }
  .typing-dot {
    color: #94a3b8;
    padding: 12px;
  }
  .suggestion-strip {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .suggestion-strip button,
  .segmented-group button,
  .rubric-row button {
    border: 1px solid rgba(255,255,255,0.12);
    background: rgba(255,255,255,0.055);
    color: #e5e7eb;
    padding: 9px 11px;
  }
  .suggestion-strip .is-active,
  .segmented-group .is-active,
  .rubric-row .is-active {
    border-color: var(--accent);
    background: var(--accent-soft);
    color: #fff;
  }
  .order-card {
    display: grid;
    grid-template-columns: 40px minmax(0, 1fr) auto;
    gap: 12px;
    align-items: center;
    border: 1px solid rgba(255,255,255,0.10);
    border-radius: 8px;
    background: rgba(255,255,255,0.045);
    padding: 12px;
  }
  .order-card em,
  .order-card small {
    display: block;
    color: #94a3b8;
    margin-top: 5px;
    font-style: normal;
  }
  .order-controls {
    display: flex;
    gap: 6px;
  }
  .order-controls button,
  .molecule-card button {
    border: 1px solid rgba(255,255,255,0.12);
    background: rgba(255,255,255,0.06);
    color: #e5e7eb;
    padding: 7px 10px;
  }
  .order-board.is-timeline {
    border-top: 2px solid var(--accent);
    padding-top: 18px;
    margin-top: 14px;
  }
  .diagram-panel svg,
  .market-graph {
    width: min(100%, 620px);
    min-height: 330px;
  }
  .diagram-panel circle {
    fill: rgba(255,255,255,0.08);
    stroke: var(--accent);
    stroke-width: 1.2;
  }
  .diagram-panel circle.is-filled {
    fill: var(--accent);
  }
  .diagram-panel .leader {
    stroke: rgba(255,255,255,0.32);
  }
  .diagram-panel text,
  .market-graph text {
    fill: #e5e7eb;
    font-size: 4px;
  }
  .diagram-panel text.is-correct {
    fill: #86efac;
  }
  .diagram-panel text.is-wrong {
    fill: #fecaca;
  }
  .strength-meter {
    display: grid;
    grid-template-columns: 140px minmax(0, 1fr);
    gap: 12px;
    align-items: center;
    margin-bottom: 12px;
    color: #d1d5db;
    font-weight: 900;
  }
  .strength-meter div {
    height: 12px;
    border-radius: 999px;
    background: rgba(255,255,255,0.08);
    overflow: hidden;
  }
  .strength-meter i {
    display: block;
    height: 100%;
    background: var(--accent);
  }
  .market-graph {
    display: block;
  }
  .market-graph line,
  .market-graph path {
    fill: none;
    stroke: rgba(255,255,255,0.42);
  }
  .market-graph .grid {
    stroke: rgba(255,255,255,0.08);
  }
  .market-graph .demand {
    stroke: var(--accent);
    stroke-width: 3;
  }
  .market-graph .supply {
    stroke: #facc15;
    stroke-width: 3;
  }
  .market-graph circle {
    fill: #fff;
  }
  .segmented-group {
    border: 1px solid rgba(255,255,255,0.10);
    border-radius: 8px;
    background: rgba(0,0,0,0.16);
    padding: 10px;
    margin-bottom: 10px;
  }
  .segmented-group > span {
    display: block;
    color: #94a3b8;
    font-size: 11px;
    font-weight: 950;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-bottom: 8px;
  }
  .segmented-group > div {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .choice-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
  .equation-row {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    align-items: center;
  }
  .molecule-card {
    display: grid;
    grid-template-columns: 1fr;
    place-items: center;
    gap: 6px;
    border: 1px solid rgba(255,255,255,0.10);
    border-radius: 8px;
    padding: 10px;
    background: rgba(255,255,255,0.04);
  }
  .molecule-card strong {
    color: var(--accent);
    font-size: 22px;
  }
  .molecule-card span {
    font-weight: 950;
  }
  .ledger-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .atom-ledger {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .atom-ledger strong {
    width: 100%;
  }
  .atom-ledger span {
    border-radius: 8px;
    padding: 8px 10px;
    background: rgba(255,255,255,0.05);
  }
  .atom-ledger .is-correct {
    color: #86efac;
  }
  .atom-ledger .is-wrong {
    color: #fecaca;
  }
  .timer-ring {
    width: 148px;
    height: 148px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    margin: 4px auto 16px;
    background: conic-gradient(var(--accent) calc(var(--progress) * 1%), rgba(255,255,255,0.10) 0);
  }
  .timer-ring span {
    font-size: 34px;
    font-weight: 950;
  }
  .timer-ring em {
    display: block;
    color: #94a3b8;
    font-style: normal;
  }
  .checklist label {
    display: flex;
    gap: 8px;
    align-items: center;
    min-height: 44px;
    border: 1px solid rgba(255,255,255,0.10);
    border-radius: 8px;
    padding: 9px 10px;
  }
  .draft-card {
    margin: 0 0 12px;
  }
  .rubric-row {
    display: grid;
    grid-template-columns: minmax(90px, 1fr) repeat(4, 44px);
    gap: 8px;
    align-items: center;
  }
  .radar {
    width: 180px;
    margin: 18px auto 0;
    display: block;
  }
  .radar polygon {
    fill: var(--accent-soft);
    stroke: var(--accent);
  }
  .radar polyline {
    fill: none;
    stroke: rgba(255,255,255,0.42);
  }
  .comparison-matrix,
  .punnett-grid {
    display: grid;
    grid-template-columns: 118px repeat(2, minmax(0, 1fr));
    gap: 8px;
    overflow: auto;
  }
  .comparison-matrix > *,
  .punnett-grid > * {
    min-height: 58px;
    border: 1px solid rgba(255,255,255,0.10);
    border-radius: 8px;
    background: rgba(255,255,255,0.045);
    color: #e5e7eb;
    display: grid;
    place-items: center;
    padding: 8px;
    font-weight: 900;
  }
  .check-bar {
    position: absolute;
    inset: auto 0 0 5px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 14px;
    border-top: 1px solid rgba(255,255,255,0.09);
    background: rgba(9,13,20,0.94);
    backdrop-filter: blur(16px);
    padding: 13px 16px;
  }
  .check-bar strong,
  .check-bar span {
    display: block;
  }
  .check-bar span {
    margin-top: 4px;
    color: #94a3b8;
    font-size: 13px;
  }
  .check-bar.is-correct strong {
    color: #86efac;
  }
  .check-bar.is-incorrect strong {
    color: #fecaca;
  }
  .check-actions {
    display: flex;
    gap: 10px;
  }
  .check-button,
  .ghost-button {
    border: 1px solid rgba(255,255,255,0.12);
    padding: 0 18px;
  }
  .check-button {
    background: var(--accent);
    color: #061019;
    box-shadow: 0 5px 0 color-mix(in srgb, var(--accent) 48%, black);
  }
  .check-button:disabled {
    cursor: not-allowed;
    opacity: 0.48;
    box-shadow: none;
  }
  .ghost-button {
    background: rgba(255,255,255,0.055);
    color: #e5e7eb;
  }
  @media (prefers-reduced-motion: reduce) {
    * {
      transition: none !important;
      animation: none !important;
    }
  }
  @media (max-width: 1024px) {
    .widget-grid,
    .proof-layout,
    .formula-layout,
    .vocab-layout,
    .diagram-layout,
    .graph-layout,
    .debate-board,
    .writing-layout,
    .rewrite-layout,
    .rubric-layout,
    .research-layout,
    .matrix-layout,
    .punnett-layout,
    .chem-layout,
    .choice-grid,
    .ledger-grid,
    .formula-steps,
    .stakeholder-columns,
    .dialectic-lanes,
    .memo-sections,
    .folder-lanes,
    .writing-sprint,
    .rubric-studio,
    .validity-lab,
    .steelman-duel,
    .case-brief-dashboard {
      grid-template-columns: 1fr;
    }
  }
  @media (max-width: 768px) {
    .memory-board,
    .outcome-cards,
    .pathway-nodes,
    .podiums,
    .nomenclature-matcher,
    .fallacy-examiner {
      grid-template-columns: 1fr;
    }
    .chat-composer,
    .diff-lab,
    .unit-bench {
      grid-template-columns: 1fr;
    }
    .argument-node {
      position: static;
      transform: none;
      width: auto;
      margin-bottom: 12px;
    }
    .argument-map-canvas {
      min-height: 0;
    }
    .argument-map-canvas svg {
      display: none;
    }
    .timeline-pin {
      position: static;
      transform: none;
      width: 100%;
      margin-bottom: 12px;
    }
    .timeline-rail {
      min-height: auto;
    }
    .timeline-rail::after,
    .timeline-rail > span {
      display: none;
    }
  }
  @media (max-width: 640px) {
    .rpg {
      padding: 0;
    }
    .activity-frame {
      min-height: 760px;
      border-radius: 0;
      border-left: 0;
      border-right: 0;
    }
    .activity-header,
    .activity-instructions,
    .check-bar {
      flex-direction: column;
      align-items: stretch;
    }
    .activity-instructions {
      grid-template-columns: 1fr;
    }
    .check-bar {
      position: sticky;
      bottom: 0;
      inset-inline: 0;
    }
    .proof-row,
    .order-card {
      grid-template-columns: 36px minmax(0, 1fr);
    }
    .proof-row .drop-slot,
    .order-controls {
      grid-column: 2;
    }
    .reasoning-ladder {
      grid-template-columns: 1fr;
    }
    .reasoning-ladder aside {
      grid-auto-flow: column;
      grid-auto-columns: 1fr;
    }
  }
`
