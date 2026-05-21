'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import AIAssistant from '@/components/AIAssistant'
import ConfidenceSelector from '@/components/ConfidenceSelector'
import DailyConceptCard, { DailyProofRecapCard } from '@/components/DailyConceptCard'
import DomainVisualBlock from '@/components/DomainVisualBlock'
import IconGlyph from '@/components/IconGlyph'
import LessonGate from '@/components/LessonGate'
import { normalizeConceptSlideshowLesson } from '@/lib/conceptSlideshow'
import { recordMasteryEvent } from '@/lib/masteryEvents'

const font = "'Plus Jakarta Sans','DM Sans',system-ui,sans-serif"

const LESSON_CSS = `
  @keyframes fadeIn  { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes spin    { to   { transform: rotate(360deg); } }
  @keyframes sectionReveal {
    from { opacity: 0; transform: translateY(12px); }
    to   { opacity: 1; transform: translateY(0); }
  }
`

// How many "phases" are there (0 = only hook visible, 4 = all unlocked)
const TOTAL_PHASES = 5

function LessonSection({ eyebrow, title, children, accent = '#0ef5c2', revealed = true }) {
  if (!revealed) return null
  return (
    <section
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 24,
        padding: '22px 22px 24px',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
        animation: 'sectionReveal 0.4s ease both',
      }}
    >
      {eyebrow && (
        <div
          style={{
            marginBottom: 10,
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: accent,
          }}
        >
          {eyebrow}
        </div>
      )}
      {title && (
        <h2
          style={{
            margin: 0,
            marginBottom: 12,
            fontSize: 22,
            lineHeight: 1.2,
            fontWeight: 800,
            color: '#f5f5f7',
            letterSpacing: '-0.02em',
          }}
        >
          {title}
        </h2>
      )}
      {children}
    </section>
  )
}

function BulletList({ items, accent = '#0ef5c2' }) {
  if (!Array.isArray(items) || items.length === 0) return null
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {items.map((item, index) => (
        <div key={`${item}-${index}`} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <div
            style={{
              marginTop: 8,
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: accent,
              boxShadow: `0 0 16px ${accent}66`,
              flexShrink: 0,
            }}
          />
          <p style={{ margin: 0, color: '#c8d6e5', fontSize: 15, lineHeight: 1.7 }}>{item}</p>
        </div>
      ))}
    </div>
  )
}

function NumberedList({ items, accent = '#0ef5c2' }) {
  if (!Array.isArray(items) || items.length === 0) return null
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {items.map((item, index) => (
        <div key={`${item}-${index}`} style={{ display: 'grid', gridTemplateColumns: '34px 1fr', gap: 12, alignItems: 'flex-start' }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: '50%',
              background: `${accent}18`,
              border: `1px solid ${accent}55`,
              color: accent,
              fontSize: 13,
              fontWeight: 900,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: `0 0 18px ${accent}20`,
              flexShrink: 0,
            }}
          >
            {index + 1}
          </div>
          <p style={{ margin: 0, color: '#c8d6e5', fontSize: 15, lineHeight: 1.7 }}>{item}</p>
        </div>
      ))}
    </div>
  )
}

function TeachingCallout({ eyebrow, title, children, accent = '#0ef5c2' }) {
  return (
    <div
      style={{
        padding: '16px 18px',
        borderRadius: 18,
        background: `${accent}0f`,
        border: `1px solid ${accent}2f`,
        boxShadow: `inset 0 1px 0 rgba(255,255,255,0.04), 0 18px 42px rgba(0,0,0,0.18)`,
      }}
    >
      {eyebrow && (
        <div style={{ fontSize: 11, fontWeight: 900, color: accent, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
          {eyebrow}
        </div>
      )}
      {title && (
        <h3 style={{ margin: '0 0 8px', color: '#f5f5f7', fontSize: 17, lineHeight: 1.25, fontWeight: 900 }}>
          {title}
        </h3>
      )}
      {children}
    </div>
  )
}

function ensureParagraphs(text = '') {
  return String(text || '')
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean)
}

function ProgressBar({ current, total }) {
  const pct = Math.round((current / Math.max(1, total - 1)) * 100)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ fontSize: 12, color: '#8e8e93', fontWeight: 700, whiteSpace: 'nowrap' }}>
        {current >= total - 1 ? 'Complete' : `Step ${Math.max(1, current + 1)} of ${total}`}
      </div>
      <div
        style={{
          width: 80,
          height: 4,
          borderRadius: 9999,
          background: 'rgba(255,255,255,0.08)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${pct}%`,
            background: 'linear-gradient(90deg,#0ef5c2,#00d4ff)',
            borderRadius: 9999,
            transition: 'width 0.5s ease',
          }}
        />
      </div>
    </div>
  )
}

function firstSentence(text = '') {
  return String(text || '').split(/(?<=[.!?])\s+/)[0] || 'One clear idea before practice.'
}


function shortParagraphs(text = '', limit = 2) {
  const paragraphs = ensureParagraphs(text)
  if (paragraphs.length > 1) return paragraphs.slice(0, limit)

  const sentences = String(text || '')
    .replace(/\s+/g, ' ')
    .trim()
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean)

  if (sentences.length <= 2) return paragraphs.slice(0, limit)

  const chunks = []
  for (let index = 0; index < sentences.length; index += 2) {
    chunks.push(sentences.slice(index, index + 2).join(' '))
  }
  return chunks.slice(0, limit)
}

function hasCopy(value) {
  return String(value || '').trim().length > 0
}

function hasItems(items) {
  return Array.isArray(items) && items.some((item) => hasCopy(item))
}


// Worked example: horizontal step-by-step visual built from actual walkthrough text
function WorkedExampleSteps({ walkthrough = [], accent = '#00d4ff' }) {
  if (!walkthrough.length) return null
  const steps = walkthrough.slice(0, 5)
  const colors = ['#0ef5c2', '#00d4ff', '#A78BFA', '#FBBF24', '#34D399']
  return (
    <div style={{ overflowX: 'auto', paddingBottom: 4 }}>
      <div style={{ display: 'flex', gap: 0, alignItems: 'stretch', minWidth: 'max-content' }}>
        {steps.map((step, i) => {
          const color = colors[i % colors.length]
          const cleaned = step.replace(/^step\s*\d+[:.)-]?\s*/i, '').trim()
          const label = cleaned.length > 60 ? `${cleaned.slice(0, 57)}…` : cleaned
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{
                width: 170,
                padding: '14px 14px',
                borderRadius: 14,
                background: `${color}10`,
                border: `1px solid ${color}30`,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                animation: `sectionReveal 0.4s ${i * 0.07}s ease both`,
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 9,
                  background: `${color}18`, border: `1px solid ${color}40`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 900, color, flexShrink: 0,
                }}>
                  {i + 1}
                </div>
                <p style={{ margin: 0, fontSize: 13, color: '#c8d6e5', lineHeight: 1.5, fontWeight: 500 }}>
                  {label}
                </p>
              </div>
              {i < steps.length - 1 && (
                <svg width="28" height="16" viewBox="0 0 28 16" fill="none" style={{ flexShrink: 0 }}>
                  <path d="M0 8 L20 8 M14 2 L20 8 L14 14" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Common mistake: actual before/after using real lesson content
function MistakeVsFix({ mistake, fix, accent = '#0ef5c2' }) {
  if (!mistake && !fix) return null
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      <div style={{
        padding: '14px 16px', borderRadius: 16,
        background: 'rgba(255,69,58,0.07)', border: '1px solid rgba(255,69,58,0.22)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
          <div style={{
            width: 22, height: 22, borderRadius: '50%',
            background: 'rgba(255,69,58,0.12)', border: '1px solid rgba(255,69,58,0.30)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#FF453A" strokeWidth="3" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </div>
          <span style={{ fontSize: 11, fontWeight: 800, color: '#FF453A', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
            The mistake
          </span>
        </div>
        <p style={{ margin: 0, fontSize: 13, color: '#f5c5c5', lineHeight: 1.6 }}>
          {mistake?.length > 120 ? `${mistake.slice(0, 117)}…` : mistake}
        </p>
      </div>
      <div style={{
        padding: '14px 16px', borderRadius: 16,
        background: `${accent}0a`, border: `1px solid ${accent}28`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
          <div style={{
            width: 22, height: 22, borderRadius: '50%',
            background: `${accent}14`, border: `1px solid ${accent}38`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <span style={{ fontSize: 11, fontWeight: 800, color: accent, letterSpacing: '0.8px', textTransform: 'uppercase' }}>
            Better move
          </span>
        </div>
        <p style={{ margin: 0, fontSize: 13, color: '#c8d6e5', lineHeight: 1.6 }}>
          {fix?.length > 120 ? `${fix.slice(0, 117)}…` : fix}
        </p>
      </div>
    </div>
  )
}

function InlineCodeText({ text, style = {} }) {
  const parts = String(text || '').split(/(`[^`]+`)/g).filter(Boolean)
  return (
    <>
      {parts.map((part, index) => {
        const isCode = part.startsWith('`') && part.endsWith('`')
        if (!isCode) return <span key={index}>{part}</span>
        return (
          <code
            key={index}
            style={{
              padding: '2px 6px',
              borderRadius: 7,
              background: 'rgba(125,211,252,0.10)',
              border: '1px solid rgba(125,211,252,0.18)',
              color: '#bdf3ff',
              fontFamily: "'SF Mono','Fira Code','Cascadia Code',monospace",
              fontSize: '0.92em',
              ...style,
            }}
          >
            {part.slice(1, -1)}
          </code>
        )
      })}
    </>
  )
}

function SlideshowCodeBlock({ code = '', language = 'text', activeLine = null }) {
  const lines = String(code || '').split('\n')
  if (!String(code || '').trim()) return null
  return (
    <div
      style={{
        overflow: 'hidden',
        borderRadius: 18,
        border: '1px solid rgba(125,211,252,0.16)',
        background: 'rgba(0,0,0,0.36)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '9px 12px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          color: '#7dd3fc',
          fontSize: 11,
          fontWeight: 900,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}
      >
        <span>{language}</span>
        <span>{lines.length} lines</span>
      </div>
      <pre
        style={{
          margin: 0,
          padding: '12px 0',
          color: '#d7e7f4',
          fontFamily: "'SF Mono','Fira Code','Cascadia Code',monospace",
          fontSize: 14,
          lineHeight: 1.65,
          overflowX: 'auto',
        }}
      >
        {lines.map((line, index) => {
          const lineNumber = index + 1
          const active = activeLine === lineNumber
          return (
            <div
              key={`${line}-${index}`}
              style={{
                display: 'grid',
                gridTemplateColumns: '42px minmax(0, 1fr)',
                gap: 10,
                padding: '1px 14px',
                background: active ? 'rgba(14,245,194,0.12)' : 'transparent',
                borderLeft: active ? '3px solid #0ef5c2' : '3px solid transparent',
              }}
            >
              <span style={{ color: active ? '#0ef5c2' : '#506176', textAlign: 'right', userSelect: 'none' }}>{lineNumber}</span>
              <code style={{ whiteSpace: 'pre' }}>{line || ' '}</code>
            </div>
          )
        })}
      </pre>
    </div>
  )
}

function looksLikeCodeLine(line = '') {
  const raw = String(line || '')
  const trimmed = raw.trim()
  if (!trimmed) return false
  return /^(```|>>>|\.\.\.)/.test(trimmed)
    || /^<\/?[A-Za-z][^>]*>?$/.test(trimmed)
    || /^[A-Za-z_$][\w$]*\s*=/.test(trimmed)
    || /\b(print|console\.log|return|import|from|def|class|for|while|if|elif|else|function|const|let|var)\b/.test(trimmed)
    || /[{};]/.test(trimmed)
}

function splitCodeQuestion(question = '') {
  const lines = String(question || '').replace(/\r\n/g, '\n').split('\n')
  const codeStart = lines.findIndex((line) => looksLikeCodeLine(line))
  if (codeStart === -1) {
    return { prompt: String(question || '').trim(), code: '', trailing: '' }
  }

  const prompt = lines.slice(0, codeStart).join('\n').trim()
  const codeLines = []
  const trailingLines = []
  let inTrailing = false

  lines.slice(codeStart).forEach((line) => {
    if (!inTrailing && (looksLikeCodeLine(line) || !line.trim() || /^\s+/.test(line))) {
      codeLines.push(line)
      return
    }
    inTrailing = true
    trailingLines.push(line)
  })

  return {
    prompt: prompt || 'Inspect this code.',
    code: codeLines.join('\n').replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/i, '').trim(),
    trailing: trailingLines.join('\n').trim(),
  }
}

function inferCodeLanguage(code = '', fallback = 'python') {
  const text = String(code || '')
  if (/<\/?[A-Za-z][^>]*>/.test(text)) return 'html'
  if (/\b(console\.log|const|let|var|function)\b/.test(text)) return 'javascript'
  if (/[.#][A-Za-z0-9_-]+\s*\{/.test(text)) return 'css'
  return fallback
}

function CodeQuestionBlock({ question, language = 'python' }) {
  const parsed = splitCodeQuestion(question)
  if (!parsed.code) {
    return (
      <div className="question-box">
        <InlineCodeText text={parsed.prompt} />
      </div>
    )
  }

  return (
    <div className="question-stack">
      <div className="question-box is-prompt">
        <InlineCodeText text={parsed.prompt} />
      </div>
      <SlideshowCodeBlock code={parsed.code} language={inferCodeLanguage(parsed.code, language)} />
      {parsed.trailing && (
        <div className="question-box is-prompt">
          <InlineCodeText text={parsed.trailing} />
        </div>
      )}
    </div>
  )
}

function normalizeVariableVisualNodes(nodes = []) {
  const values = Array.isArray(nodes) ? nodes.map((node) => String(node || '').trim()).filter(Boolean) : []
  const first = values[0] || 'name'
  const assignmentMatch = first.match(/^([A-Za-z_$][\w$]*)\s*=\s*(.+)$/)
  if (assignmentMatch) return [assignmentMatch[1], '=', assignmentMatch[2]]

  const second = values[1] || '='
  const third = values[2] || 'value'
  if (/^(=|:=|<-)$/.test(second)) return [first, second, third]
  return [first, '=', second]
}

function DiagramTile({ eyebrow, children, active = false }) {
  return (
    <div className={`lesson-diagram-tile ${active ? 'is-active' : ''}`}>
      {eyebrow ? <span>{eyebrow}</span> : null}
      <strong>{children}</strong>
    </div>
  )
}

function DiagramNodeList({ nodes = [], activeLast = false }) {
  const safeNodes = nodes.length ? nodes : ['Read', 'Think', 'Answer']
  return (
    <div className="lesson-diagram-list">
      {safeNodes.slice(0, 5).map((node, index) => (
        <div className={`lesson-diagram-row ${activeLast && index === safeNodes.slice(0, 5).length - 1 ? 'is-active' : ''}`} key={`${node}-${index}`}>
          <span>{index + 1}</span>
          <strong><InlineCodeText text={node} /></strong>
        </div>
      ))}
    </div>
  )
}

function hasSlideshowVisual(visual) {
  if (!visual || visual.type === 'none') return false
  if (Array.isArray(visual.nodes) && visual.nodes.some((node) => String(node || '').trim())) return true
  return Boolean(String(visual.title || visual.caption || '').trim())
}

function SlideshowVisual({ visual }) {
  if (!hasSlideshowVisual(visual)) return null
  const nodes = Array.isArray(visual.nodes) && visual.nodes.length > 0 ? visual.nodes : [visual.title].filter(Boolean)
  const isHtmlDiagram = /\bhtml\b|<!doctype|<head|<body/i.test(nodes.join(' '))

  if (visual.type === 'nested') {
    const nestedNodes = nodes.slice(0, 4)
    const nestedContent = nestedNodes.reduceRight((child, node, index) => (
      <div className={`lesson-nested-layer layer-${index}`} key={`${node}-${index}`}>
        <span>{index === 0 ? 'outer category' : `inside ${nestedNodes[index - 1]}`}</span>
        <strong><InlineCodeText text={node} /></strong>
        {child}
      </div>
    ), null)

    return (
      <div className="lesson-diagram">
        <div className="lesson-diagram-header">
          <span>Hierarchy</span>
          <strong>{visual.title || 'How the pieces fit'}</strong>
        </div>
        <div className="lesson-nested-diagram">
          {nestedContent}
        </div>
        {visual.caption && <p><InlineCodeText text={visual.caption} /></p>}
      </div>
    )
  }

  if (visual.type === 'system_flow') {
    return (
      <div className="lesson-diagram">
        <div className="lesson-diagram-header">
          <span>System flow</span>
          <strong>{visual.title || 'How it moves'}</strong>
        </div>
        <div className="lesson-system-flow">
          {nodes.slice(0, 5).map((node, index) => (
            <div className={`lesson-system-flow-card ${index === nodes.slice(0, 5).length - 1 ? 'is-final' : ''}`} key={`${node}-${index}`}>
              <span>{index + 1}</span>
              <strong><InlineCodeText text={node} /></strong>
              {index < nodes.slice(0, 5).length - 1 && <small>then</small>}
            </div>
          ))}
        </div>
        {visual.caption && <p><InlineCodeText text={visual.caption} /></p>}
      </div>
    )
  }

  if (visual.type === 'variable_box') {
    const [name = 'name', operator = '=', value = 'value'] = normalizeVariableVisualNodes(nodes)
    return (
      <div className="lesson-diagram">
        <div className="lesson-diagram-header">
          <span>Variable</span>
          <strong>{visual.title || 'Name stores value'}</strong>
        </div>
        <div className="lesson-diagram-variable">
          <DiagramTile eyebrow="code line">
            <code>{name} {operator} {value}</code>
          </DiagramTile>
          <DiagramTile eyebrow="variable name" active>
            <code>{name}</code>
          </DiagramTile>
          <DiagramTile eyebrow="stored value" active>
            <code>{value}</code>
          </DiagramTile>
        </div>
        {visual.caption && <p><InlineCodeText text={visual.caption} /></p>}
      </div>
    )
  }

  if (isHtmlDiagram) {
    const htmlNodes = [
      nodes[0] || '<!DOCTYPE html>',
      nodes[1] || '<html>',
      nodes[2] || '<head>',
      nodes[3] || '<body>',
    ]
    return (
      <div className="lesson-diagram">
        <div className="lesson-diagram-header">
          <span>HTML</span>
          <strong>{visual.title || 'Document skeleton'}</strong>
        </div>
        <div className="lesson-diagram-list is-code">
          {htmlNodes.map((node, index) => (
            <div className={`lesson-diagram-row ${index === 3 ? 'is-active' : ''}`} key={`${node}-${index}`}>
              <span>{index + 1}</span>
              <strong><code>{node}</code></strong>
            </div>
          ))}
        </div>
        {visual.caption && <p><InlineCodeText text={visual.caption} /></p>}
      </div>
    )
  }

  if (visual.type === 'code_flow') {
    const flowNodes = nodes.slice(0, 3)
    return (
      <div className="lesson-diagram">
        <div className="lesson-diagram-header">
          <span>Flow</span>
          <strong>{visual.title || 'Code flow'}</strong>
        </div>
        <DiagramNodeList nodes={flowNodes} activeLast />
        {visual.caption && <p><InlineCodeText text={visual.caption} /></p>}
      </div>
    )
  }

  if (visual.type === 'check_card') {
    return (
      <div className="lesson-diagram">
        <div className="lesson-diagram-header">
          <span>Strategy</span>
          <strong>{visual.title || 'Predict before you answer'}</strong>
        </div>
        <DiagramNodeList nodes={nodes.slice(0, 3)} />
        {visual.caption && <p><InlineCodeText text={visual.caption} /></p>}
      </div>
    )
  }

  if (visual.type === 'diagram' && nodes.length === 1) {
    return (
      <div className="lesson-diagram">
        <div className="lesson-diagram-header">
          <span>Focus</span>
          <strong>{visual.title || 'Diagram'}</strong>
        </div>
        <DiagramTile eyebrow="focus" active>
          <InlineCodeText text={nodes[0]} />
        </DiagramTile>
        {visual.caption && <p><InlineCodeText text={visual.caption} /></p>}
      </div>
    )
  }

  if (visual.type === 'comparison') {
    return (
      <div className="lesson-diagram">
        <div className="lesson-diagram-header">
          <span>Compare</span>
          <strong>{visual.title || 'Compare'}</strong>
        </div>
        <div className="lesson-diagram-variable">
          {nodes.slice(0, 2).map((node, index) => (
            <DiagramTile key={`${node}-${index}`} eyebrow={index === 0 ? 'before' : 'after'} active={index === 1}>
              <InlineCodeText text={node} />
            </DiagramTile>
          ))}
        </div>
        {visual.caption && <p><InlineCodeText text={visual.caption} /></p>}
      </div>
    )
  }

  return (
    <div className="lesson-diagram">
      <div className="lesson-diagram-header">
        <span>Trace</span>
        <strong>{visual.title || 'Diagram'}</strong>
      </div>
      <DiagramNodeList nodes={nodes} />
      {visual.caption && <p><InlineCodeText text={visual.caption} /></p>}
    </div>
  )
}

function AnswerOption({ option, index, selected, correct, disabled, onClick }) {
  const isSelected = selected === index
  const isCorrect = correct === index
  const isWrong = isSelected && selected !== correct
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onClick(index)}
      style={{
        width: '100%',
        minHeight: 58,
        padding: '14px 16px',
        borderRadius: 16,
        border: isCorrect && selected != null
          ? '1px solid rgba(52,211,153,0.58)'
          : isWrong
            ? '1px solid rgba(255,69,58,0.62)'
            : isSelected
              ? '1px solid rgba(125,211,252,0.52)'
              : '1px solid rgba(255,255,255,0.10)',
        background: isCorrect && selected != null
          ? 'rgba(52,211,153,0.13)'
          : isWrong
            ? 'rgba(255,69,58,0.12)'
            : isSelected
              ? 'rgba(125,211,252,0.12)'
              : 'rgba(255,255,255,0.045)',
        color: '#f5f7fb',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        textAlign: 'left',
        cursor: disabled ? 'default' : 'pointer',
        fontFamily: font,
        fontSize: 15,
        fontWeight: 800,
        boxShadow: isCorrect && selected != null
          ? '0 0 28px rgba(52,211,153,0.12)'
          : isWrong
            ? '0 0 28px rgba(255,69,58,0.10)'
            : 'none',
      }}
    >
      <span
        style={{
          width: 30,
          height: 30,
          borderRadius: 10,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          color: isCorrect && selected != null ? '#34d399' : isWrong ? '#ff8d8d' : '#7dd3fc',
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.08)',
          fontSize: 12,
          fontWeight: 950,
        }}
      >
        {String.fromCharCode(65 + index)}
      </span>
      <span><InlineCodeText text={option} /></span>
    </button>
  )
}

function slideshowText(value, fallback = '') {
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (Array.isArray(value)) return value.map((item) => slideshowText(item)).filter(Boolean).join(', ')
  if (!value || typeof value !== 'object') return fallback

  const preferredKeys = ['text', 'question', 'prompt', 'title', 'body', 'explanation', 'label', 'answer', 'value', 'description']
  for (const key of preferredKeys) {
    if (value[key] == null) continue
    const text = slideshowText(value[key])
    if (text) return text
  }

  return Object.entries(value)
    .filter(([, entry]) => entry != null && entry !== '')
    .slice(0, 3)
    .map(([key, entry]) => `${key}: ${slideshowText(entry)}`)
    .join('; ') || fallback
}

function normalizeCheckQuestion(rawQuestion, fallbackTitle = 'Check') {
  const raw = rawQuestion && typeof rawQuestion === 'object' && !Array.isArray(rawQuestion) ? rawQuestion : {}
  const options = Array.isArray(raw.options)
    ? raw.options.map((option) => slideshowText(option)).filter(Boolean)
    : []
  const safeOptions = options.length >= 2 ? options : ['I understand the main idea.', 'I need a quick review.']
  const parsedIndex = Number(raw.correctIndex)
  const correctIndex = Number.isInteger(parsedIndex) && parsedIndex >= 0 && parsedIndex < safeOptions.length ? parsedIndex : 0

  return {
    ...raw,
    title: slideshowText(raw.title, fallbackTitle),
    question: slideshowText(raw.question || raw.prompt || raw.title, 'What is the main idea from this slide?'),
    options: safeOptions,
    correctIndex,
    explanation: slideshowText(raw.explanation, 'Review the concept, then continue.'),
  }
}

function safeSlideData(data) {
  return data && typeof data === 'object' && !Array.isArray(data) ? data : {}
}

function ConceptSlideshowPlayer({
  lesson,
  onClose,
  onComplete,
  assistant,
}) {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0)
  const [selectedAnswers, setSelectedAnswers] = useState({})
  const [visualAnswers, setVisualAnswers] = useState({})
  const [breakdownProgress, setBreakdownProgress] = useState({})
  const [finalStage, setFinalStage] = useState('primary')
  const [finalCheckPassed, setFinalCheckPassed] = useState(false)
  const [needsReview, setNeedsReview] = useState(false)
  const [lessonCompleted, setLessonCompleted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [primaryFinalMiss, setPrimaryFinalMiss] = useState(null)
  const startTimeRef = useRef(null)

  useEffect(() => {
    if (startTimeRef.current == null) {
      startTimeRef.current = Date.now()
    }
    if (lesson?.warnings?.length) {
      lesson.warnings.forEach((warning) => console.warn('[PathAI] concept_slideshow_warning', warning))
    }
  }, [lesson])

  const slides = Array.isArray(lesson?.slides) ? lesson.slides.filter((item) => item && typeof item === 'object') : []
  const slide = slides[currentSlideIndex] || slides[0]
  const progressPct = slides.length > 0 ? ((currentSlideIndex + 1) / slides.length) * 100 : 0
  const answerKey = `${currentSlideIndex}:${finalStage}`
  const selected = selectedAnswers[answerKey]
  const isCheck = slide?.type === 'mini_check' || slide?.type === 'final_check'
  const isFinal = slide?.type === 'final_check'
  const isVisualInteractive = slide?.type === 'visual_interactive'
  const visualAnswerKey = `${currentSlideIndex}:visual`
  const visualAnswer = visualAnswers[visualAnswerKey]
  const visualRequiresAnswer = Boolean(isVisualInteractive && String(slide?.correctAnswer || '').trim())
  const rawActiveQuestion = isFinal && finalStage === 'redemption' ? slide?.redemptionQuestion : slide
  const activeQuestion = isCheck ? normalizeCheckQuestion(rawActiveQuestion, isFinal ? 'Final check' : 'Mini check') : null
  const activeSteps = Array.isArray(slide?.steps) ? slide.steps : []
  const breakdownIndex = breakdownProgress[currentSlideIndex] || 0
  const activeStep = activeSteps[Math.min(breakdownIndex, Math.max(activeSteps.length - 1, 0))]
  const parsedActiveLine = Number(activeStep?.line)
  const activeLine = slide?.type === 'code_breakdown' && Number.isFinite(parsedActiveLine) ? parsedActiveLine : null
  const canGoBack = currentSlideIndex > 0 && !submitting

  function selectAnswer(index) {
    if (!isCheck || selected != null || lessonCompleted || !activeQuestion?.options?.length) return
    setSelectedAnswers((prev) => ({ ...prev, [answerKey]: index }))
    const correct = index === activeQuestion.correctIndex
    if (!isFinal) return

    if (finalStage === 'primary' && correct) {
      setFinalCheckPassed(true)
      setNeedsReview(false)
      setPrimaryFinalMiss(null)
      setLessonCompleted(true)
    } else if (finalStage === 'primary') {
      setPrimaryFinalMiss({ selected: index, explanation: activeQuestion.explanation })
      setFinalStage('redemption')
    } else if (correct) {
      setFinalCheckPassed(true)
      setNeedsReview(false)
      setLessonCompleted(true)
    } else {
      setFinalCheckPassed(false)
      setNeedsReview(true)
      setLessonCompleted(true)
    }
  }

  function recordVisualAnswer(result) {
    if (!isVisualInteractive || visualAnswer) return
    const safeResult = result || { answer: '', correct: false }
    setVisualAnswers((prev) => ({ ...prev, [visualAnswerKey]: safeResult }))
    recordMasteryEvent({
      conceptId: safeResult.conceptId || lesson?.atomicConceptId || lesson?.topic,
      topic: lesson?.topic,
      lessonId: safeResult.lessonId || lesson?.id,
      slideId: safeResult.slideId || `slide-${currentSlideIndex + 1}`,
      interactionPrimitive: safeResult.interactionPrimitive || slide?.interactionPrimitive || 'identify',
      domain: lesson?.domain,
      domainVisualType: safeResult.domainVisualType || slide?.domainVisualType,
      correct: safeResult.correct,
      attempts: safeResult.attempts || 1,
      needsReview: safeResult.needsReview || false,
    })
  }

  function continueForward() {
    if (!slide || submitting) return
    if (lessonCompleted) {
      setSubmitting(true)
      const startedAt = startTimeRef.current || Date.now()
      const completionTimeSec = Math.round((Date.now() - startedAt) / 1000)
      onComplete?.({
        fromLesson: true,
        lessonType: 'concept_slideshow',
        topic: lesson?.topic,
        finalCheckPassed,
        needsReview,
        completionTimeSec,
        attempts: finalStage === 'redemption' ? 2 : 1,
        proofSubmission: `Completed concept slideshow: ${lesson?.topic || 'concept'}`,
        proofResult: needsReview ? 'Final check missed after redemption. Needs review.' : 'Final check passed.',
      })
      return
    }

    if (slide.type === 'code_breakdown' && activeSteps.length > 0 && breakdownIndex < activeSteps.length - 1) {
      setBreakdownProgress((prev) => ({ ...prev, [currentSlideIndex]: breakdownIndex + 1 }))
      return
    }

    if (currentSlideIndex < slides.length - 1) {
      setCurrentSlideIndex((index) => index + 1)
    }
  }

  function goBack() {
    if (!canGoBack) return
    setCurrentSlideIndex((index) => Math.max(0, index - 1))
  }

  const canContinue = (() => {
    if (!slide) return false
    if (lessonCompleted) return true
    if (isFinal) return false
    if (slide.type === 'mini_check') return selected != null
    if (isVisualInteractive && visualRequiresAnswer) return Boolean(visualAnswer)
    return currentSlideIndex < slides.length - 1
  })()

  const continueLabel = (() => {
    if (submitting) return 'Saving...'
    if (lessonCompleted) return needsReview ? 'Save review flag' : 'Complete lesson'
    if (slide?.type === 'code_breakdown' && activeSteps.length > 0 && breakdownIndex < activeSteps.length - 1) return 'Next line'
    if (slide?.type === 'mini_check' && selected == null) return 'Answer to continue'
    if (isVisualInteractive && visualRequiresAnswer && !visualAnswer) return 'Interact to continue'
    if (isFinal) return lessonCompleted ? 'Complete lesson' : 'Answer final check'
    return currentSlideIndex >= slides.length - 1 ? 'Finish' : 'Continue'
  })()
  const slideFrameWidth = isVisualInteractive ? 'min(1120px, 100%)' : 'min(840px, 100%)'
  const slideFrameMinHeight = isVisualInteractive ? 'min(680px, calc(100vh - 176px))' : 'min(590px, calc(100vh - 190px))'

  function renderFeedback() {
    if (!isCheck || selected == null) return null
    const correct = selected === activeQuestion.correctIndex
    return (
      <div
        style={{
          marginTop: 16,
          padding: '14px 16px',
          borderRadius: 16,
          background: correct ? 'rgba(52,211,153,0.10)' : 'rgba(255,69,58,0.10)',
          border: correct ? '1px solid rgba(52,211,153,0.24)' : '1px solid rgba(255,69,58,0.24)',
          color: correct ? '#b7f7d8' : '#ffb4ae',
          fontSize: 14,
          lineHeight: 1.65,
          fontWeight: 700,
        }}
      >
        <InlineCodeText text={activeQuestion.explanation} />
        {isFinal && finalStage === 'redemption' && !lessonCompleted && (
          <div style={{ marginTop: 8, color: '#ffd1cc' }}>
            Try the redemption question below. One more specific check.
          </div>
        )}
      </div>
    )
  }

  function renderSlide() {
    if (!slides.length) {
      return (
        <div style={{ textAlign: 'center', display: 'grid', gap: 14, justifyItems: 'center' }}>
          <div className="slide-kicker">Lesson unavailable</div>
          <h1 className="slide-title" style={{ fontSize: 38 }}>This lesson data is incomplete.</h1>
          <p className="slide-body" style={{ maxWidth: 620, marginTop: 0 }}>
            PathAI could not load valid slideshow cards for this task. Close it and try generating the lesson again.
          </p>
        </div>
      )
    }
    if (!slide) return null
    if (lessonCompleted) {
      return (
        <div style={{ textAlign: 'center', display: 'grid', gap: 18, justifyItems: 'center' }}>
          <div
            style={{
              width: 78,
              height: 78,
              borderRadius: 26,
              display: 'grid',
              placeItems: 'center',
              background: needsReview ? 'rgba(251,191,36,0.10)' : 'rgba(14,245,194,0.12)',
              border: needsReview ? '1px solid rgba(251,191,36,0.28)' : '1px solid rgba(14,245,194,0.28)',
              color: needsReview ? '#fbbf24' : '#0ef5c2',
              boxShadow: needsReview ? '0 0 46px rgba(251,191,36,0.12)' : '0 0 46px rgba(14,245,194,0.14)',
            }}
          >
            <IconGlyph name={needsReview ? 'brain' : 'badge'} size={34} strokeWidth={2.2} color={needsReview ? '#fbbf24' : '#0ef5c2'} />
          </div>
          <div>
            <h1 style={{ margin: '0 0 8px', color: '#f5f5f7', fontSize: 38, lineHeight: 1.05, letterSpacing: '-0.04em' }}>
              {needsReview ? 'Needs review' : 'Concept mastered'}
            </h1>
            <p style={{ margin: 0, color: '#aeb8c5', fontSize: 16, lineHeight: 1.7, maxWidth: 560 }}>
              {needsReview
                ? `You finished ${lesson?.topic || 'this concept'}, but PathAI should bring this concept back soon.`
                : `You finished ${lesson?.topic || 'this concept'} and passed the final check.`}
            </p>
          </div>
        </div>
      )
    }

    if (slide.type === 'concept_intro') {
      const hasVisual = hasSlideshowVisual(slide.visual)
      return (
        <div className={`slide-split ${hasVisual ? '' : 'is-text-only'}`}>
          <div>
            <div className="slide-kicker">Concept</div>
            <h1 className="slide-title">{slideshowText(slide.title, 'Concept')}</h1>
            <p className="slide-body"><InlineCodeText text={slideshowText(slide.body, 'Review this concept before continuing.')} /></p>
          </div>
          {hasVisual && <SlideshowVisual visual={slide.visual} />}
        </div>
      )
    }
    if (slide.type === 'example') {
      return (
        <div style={{ display: 'grid', gap: 18 }}>
          <div>
            <div className="slide-kicker">Example</div>
            <h1 className="slide-title">{slideshowText(slide.title, 'Example')}</h1>
          </div>
          <SlideshowVisual visual={slide.visual} />
          <SlideshowCodeBlock code={slide.code} language="python" />
          <p className="slide-body"><InlineCodeText text={slideshowText(slide.explanation)} /></p>
        </div>
      )
    }
    if (slide.type === 'code_breakdown') {
      const step = activeSteps[Math.min(breakdownIndex, Math.max(activeSteps.length - 1, 0))]
      return (
        <div style={{ display: 'grid', gap: 18 }}>
          <div>
            <div className="slide-kicker">Code breakdown</div>
            <h1 className="slide-title">{slideshowText(slide.title, 'Code breakdown')}</h1>
          </div>
          <SlideshowVisual visual={slide.visual} />
          <SlideshowCodeBlock code={slide.code} language={slide.language} activeLine={activeLine} />
          {step && (
            <div className="slide-callout">
              <div style={{ color: '#0ef5c2', fontSize: 12, fontWeight: 950, letterSpacing: '0.09em', textTransform: 'uppercase', marginBottom: 7 }}>
                Line {slideshowText(step.line, String(breakdownIndex + 1))}
              </div>
              <p style={{ margin: 0, color: '#dce8f2', fontSize: 16, lineHeight: 1.65 }}>
                <InlineCodeText text={step.explanation} />
              </p>
            </div>
          )}
        </div>
      )
    }
    if (isVisualInteractive) {
      return (
        <div style={{ display: 'grid', gap: 16, width: '100%' }}>
          <div>
            <div className="slide-kicker">Interactive visual</div>
            <h1 className="slide-title visual-slide-title">{slideshowText(slide.title, 'Interactive visual')}</h1>
          </div>
          <DomainVisualBlock
            key={`${currentSlideIndex}:${slide.domainVisualType}:${slide.interactionPrimitive || 'identify'}`}
            lessonId={lesson?.id}
            slideId={slide.id || `slide-${currentSlideIndex + 1}`}
            conceptId={lesson?.atomicConceptId || lesson?.topic}
            domain={lesson?.domain}
            domainVisualType={slide.domainVisualType}
            interactionPrimitive={slide.interactionPrimitive}
            data={{
              ...safeSlideData(slide.data),
              prompt: slideshowText(slide.prompt),
              correctAnswer: slideshowText(slide.correctAnswer),
              explanation: slideshowText(slide.explanation),
            }}
            completed={Boolean(visualAnswer) || lessonCompleted}
            onAnswer={recordVisualAnswer}
          />
        </div>
      )
    }
    if (isCheck) {
      return (
        <div style={{ display: 'grid', gap: 18 }}>
          <div>
            <div className="slide-kicker">{isFinal ? finalStage === 'redemption' ? 'Redemption check' : 'Final check' : 'Mini check'}</div>
            <h1 className="slide-title">{isFinal && finalStage === 'redemption' ? 'One more try' : activeQuestion.title}</h1>
          </div>
          <SlideshowVisual visual={slide.visual} />
          {isFinal && finalStage === 'redemption' && primaryFinalMiss && (
            <div
              style={{
                padding: '14px 16px',
                borderRadius: 16,
                background: 'rgba(255,69,58,0.10)',
                border: '1px solid rgba(255,69,58,0.24)',
                color: '#ffcbc7',
                fontSize: 14,
                lineHeight: 1.65,
                fontWeight: 750,
              }}
            >
              <InlineCodeText text={primaryFinalMiss.explanation} />
            </div>
          )}
          <CodeQuestionBlock question={activeQuestion.question} language={slide.language || lesson?.domain || 'python'} />
          <div style={{ display: 'grid', gap: 10 }}>
            {(activeQuestion.options || []).map((option, index) => (
              <AnswerOption
                key={`${option}-${index}`}
                option={option}
                index={index}
                selected={selected}
                correct={activeQuestion.correctIndex}
                disabled={selected != null || lessonCompleted}
                onClick={selectAnswer}
              />
            ))}
          </div>
          {renderFeedback()}
        </div>
      )
    }
    return (
      <div style={{ display: 'grid', gap: 14 }}>
        <div className="slide-kicker">Lesson card</div>
        <h1 className="slide-title">{slideshowText(slide.title, 'Review this concept')}</h1>
        <p className="slide-body">
          <InlineCodeText text={slideshowText(slide.body || slide.explanation || slide.prompt, 'This slide had an unsupported format, so PathAI is showing the available text instead.')} />
        </p>
      </div>
    )
  }

  return (
    <>
      <style>{`
        ${LESSON_CSS}
        .slide-kicker {
          color: #7dd3fc;
          font-size: 12px;
          font-weight: 950;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          margin-bottom: 12px;
        }
	        .slide-title {
	          margin: 0;
	          color: #f8fafc;
	          font-size: 52px;
	          line-height: 1.08;
	          letter-spacing: 0;
	          font-weight: 950;
	        }
	        .slide-body {
	          margin: 22px 0 0;
	          color: #c8d6e5;
	          font-size: 22px;
	          line-height: 1.55;
	          font-weight: 700;
	        }
        .visual-slide-title {
          font-size: clamp(34px, 4vw, 48px);
          max-width: 940px;
        }
        .slide-callout,
        .question-box {
          border: 1px solid rgba(255,255,255,0.09);
          border-radius: 18px;
          background: rgba(255,255,255,0.045);
          padding: 16px 18px;
          color: #f5f7fb;
          font-size: 17px;
          line-height: 1.7;
          white-space: pre-wrap;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.05);
        }
        .question-stack {
          display: grid;
          gap: 12px;
        }
        .question-stack .question-box {
          background: rgba(125,211,252,0.055);
          border-color: rgba(125,211,252,0.15);
        }
        .question-stack .question-box.is-prompt {
          font-weight: 850;
        }
        .question-stack > div:nth-child(2) {
          margin: 0;
        }
        .slide-split {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(260px, 0.74fr);
          gap: 22px;
          align-items: center;
        }
        .slide-split.is-text-only {
          grid-template-columns: minmax(0, 860px);
        }
        .slide-split.is-text-only .slide-body {
          max-width: 860px;
        }
        .slide-visual {
          border: 1px solid rgba(125,211,252,0.16);
          border-radius: 22px;
          background:
            radial-gradient(circle at 18% 18%, rgba(14,245,194,0.14), transparent 34%),
            radial-gradient(circle at 86% 12%, rgba(125,211,252,0.14), transparent 36%),
            rgba(255,255,255,0.045);
          padding: 16px;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.06), 0 22px 60px rgba(0,0,0,0.20);
        }
        .slide-visual-premium {
          position: relative;
          overflow: hidden;
          min-height: 190px;
        }
        .slide-visual-premium::before {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          background:
            linear-gradient(120deg, rgba(255,255,255,0.08), transparent 36%),
            radial-gradient(circle at 78% 82%, rgba(14,245,194,0.10), transparent 30%);
        }
        .slide-visual-premium > * {
          position: relative;
          z-index: 1;
        }
        .slide-visual-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 12px;
        }
        .slide-visual-top span {
          color: #7dd3fc;
          font-size: 11px;
          font-weight: 950;
          letter-spacing: 0.11em;
          text-transform: uppercase;
        }
        .slide-visual p {
          margin: 12px 0 0;
          color: #b9c9d9;
          font-size: 13px;
          line-height: 1.6;
          font-weight: 760;
        }
        .concept-visual {
          position: relative;
          overflow: hidden;
          border: 1px solid rgba(125,211,252,0.14);
          border-radius: 22px;
          background:
            linear-gradient(145deg, rgba(255,255,255,0.065), rgba(255,255,255,0.028)),
            rgba(3,8,15,0.76);
          padding: 16px;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.07), 0 22px 54px rgba(0,0,0,0.20);
        }
        .concept-visual::before {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          background:
            radial-gradient(circle at 18% 10%, rgba(125,211,252,0.12), transparent 30%),
            radial-gradient(circle at 90% 90%, rgba(14,245,194,0.09), transparent 34%);
        }
        .concept-visual > * {
          position: relative;
          z-index: 1;
        }
        .concept-visual.is-compact {
          min-height: auto;
        }
        .concept-visual-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 14px;
        }
        .concept-visual-header span {
          color: #7dd3fc;
          font-size: 10px;
          font-weight: 950;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }
        .concept-visual-header strong {
          min-width: 0;
          color: #d8f7ff;
          font-size: 12px;
          font-weight: 900;
          text-align: right;
        }
	        .concept-visual p {
	          margin: 13px 0 0;
	          color: #aebdce;
	          font-size: 13px;
	          line-height: 1.55;
	          font-weight: 720;
	        }
	        .lesson-diagram {
	          position: relative;
	          overflow: hidden;
	          border: 1px solid rgba(125,211,252,0.16);
	          border-radius: 20px;
	          background: linear-gradient(180deg, rgba(255,255,255,0.055), rgba(255,255,255,0.026)), rgba(4,10,18,0.78);
	          padding: 16px;
	          box-shadow: inset 0 1px 0 rgba(255,255,255,0.07), 0 20px 46px rgba(0,0,0,0.18);
	        }
	        .lesson-diagram-header {
	          display: flex;
	          align-items: center;
	          justify-content: space-between;
	          gap: 12px;
	          margin-bottom: 14px;
	        }
	        .lesson-diagram-header span,
	        .lesson-diagram-tile span {
	          color: #7dd3fc;
	          font-size: 10px;
	          font-weight: 950;
	          letter-spacing: 0.12em;
	          text-transform: uppercase;
	        }
	        .lesson-diagram-header strong {
	          min-width: 0;
	          color: #d8f7ff;
	          font-size: 13px;
	          font-weight: 900;
	          text-align: right;
	          overflow-wrap: anywhere;
	        }
	        .lesson-diagram p {
	          margin: 13px 0 0;
	          color: #aebdce;
	          font-size: 13px;
	          line-height: 1.55;
	          font-weight: 720;
	        }
	        .lesson-diagram-variable {
	          display: grid;
	          grid-template-columns: repeat(3, minmax(0, 1fr));
	          gap: 10px;
	        }
	        .lesson-diagram-tile,
	        .lesson-diagram-row {
	          min-width: 0;
	          border: 1px solid rgba(255,255,255,0.10);
	          border-radius: 15px;
	          background: rgba(2,8,15,0.64);
	          box-shadow: inset 0 1px 0 rgba(255,255,255,0.05);
	        }
	        .lesson-diagram-tile {
	          display: grid;
	          gap: 8px;
	          align-content: start;
	          min-height: 92px;
	          padding: 14px;
	        }
	        .lesson-diagram-tile.is-active,
	        .lesson-diagram-row.is-active {
	          border-color: rgba(14,245,194,0.28);
	          background: linear-gradient(180deg, rgba(14,245,194,0.10), rgba(2,8,15,0.64));
	        }
	        .lesson-diagram-tile strong,
	        .lesson-diagram-row strong {
	          min-width: 0;
	          color: #edf8ff;
	          font-size: 15px;
	          line-height: 1.35;
	          overflow-wrap: anywhere;
	        }
	        .lesson-diagram-tile code,
	        .lesson-diagram-row code {
	          color: inherit !important;
	          background: rgba(125,211,252,0.10);
	          border-color: rgba(125,211,252,0.14);
	          white-space: pre-wrap;
	          overflow-wrap: anywhere;
	        }
	        .lesson-diagram-list {
	          display: grid;
	          gap: 9px;
	        }
	        .lesson-nested-diagram {
	          display: grid;
	        }
	        .lesson-nested-layer {
	          min-width: 0;
	          border: 1px solid rgba(125,211,252,0.18);
	          border-radius: 18px;
	          background: linear-gradient(135deg, rgba(125,211,252,0.08), rgba(14,245,194,0.04));
	          padding: 14px;
	          box-shadow: inset 0 1px 0 rgba(255,255,255,0.06);
	        }
	        .lesson-nested-layer .lesson-nested-layer {
	          margin-top: 12px;
	          margin-left: 22px;
	          background: linear-gradient(135deg, rgba(14,245,194,0.10), rgba(125,211,252,0.04));
	          border-color: rgba(14,245,194,0.24);
	        }
	        .lesson-nested-layer span,
	        .lesson-system-flow-card span,
	        .lesson-system-flow-card small {
	          color: #7dd3fc;
	          font-size: 10px;
	          font-weight: 950;
	          letter-spacing: 0.11em;
	          text-transform: uppercase;
	        }
	        .lesson-nested-layer strong {
	          display: block;
	          min-width: 0;
	          margin-top: 7px;
	          color: #f4fbff;
	          font-size: 19px;
	          line-height: 1.2;
	          overflow-wrap: anywhere;
	        }
	        .lesson-system-flow {
	          display: grid;
	          grid-template-columns: repeat(auto-fit, minmax(118px, 1fr));
	          gap: 10px;
	        }
	        .lesson-system-flow-card {
	          position: relative;
	          min-width: 0;
	          display: grid;
	          align-content: start;
	          gap: 8px;
	          min-height: 112px;
	          border: 1px solid rgba(255,255,255,0.10);
	          border-radius: 16px;
	          background: rgba(2,8,15,0.64);
	          padding: 13px;
	          box-shadow: inset 0 1px 0 rgba(255,255,255,0.05);
	        }
	        .lesson-system-flow-card.is-final {
	          border-color: rgba(14,245,194,0.28);
	          background: linear-gradient(180deg, rgba(14,245,194,0.10), rgba(2,8,15,0.64));
	        }
	        .lesson-system-flow-card > span {
	          width: 28px;
	          height: 28px;
	          display: grid;
	          place-items: center;
	          border-radius: 10px;
	          background: rgba(14,245,194,0.12);
	          color: #0ef5c2;
	        }
	        .lesson-system-flow-card strong {
	          min-width: 0;
	          color: #edf8ff;
	          font-size: 15px;
	          line-height: 1.3;
	          overflow-wrap: anywhere;
	        }
	        .lesson-system-flow-card small {
	          align-self: end;
	          color: #67869c;
	        }
	        .lesson-diagram-row {
	          display: grid;
	          grid-template-columns: 30px minmax(0, 1fr);
	          align-items: center;
	          gap: 10px;
	          padding: 12px;
	        }
	        .lesson-diagram-row > span {
	          width: 30px;
	          height: 30px;
	          display: grid;
	          place-items: center;
	          border-radius: 10px;
	          background: rgba(14,245,194,0.12);
	          color: #0ef5c2;
	          font-size: 12px;
	          font-weight: 950;
	        }
	        .lesson-diagram-list.is-code .lesson-diagram-row {
	          align-items: start;
	        }
	        .memory-diagram {
	          display: grid;
	          grid-template-columns: minmax(180px, 1fr) 54px minmax(180px, 1fr);
	          gap: 14px;
	          align-items: center;
	        }
        .code-surface,
        .memory-register {
          min-width: 0;
          border: 1px solid rgba(255,255,255,0.10);
          border-radius: 18px;
          background: rgba(1,7,13,0.66);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.05);
          padding: 14px;
        }
        .code-surface span {
          display: block;
          margin-bottom: 9px;
          color: #70859d;
          font-size: 10px;
          font-weight: 950;
          letter-spacing: 0.10em;
          text-transform: uppercase;
        }
	        .code-surface code {
	          color: #e9f8ff;
	          font-family: "SF Mono","Fira Code","Cascadia Code",monospace;
	          font-size: 18px;
	          white-space: pre-wrap;
	          overflow-wrap: anywhere;
	        }
        .memory-register {
          border-color: rgba(14,245,194,0.24);
          background: linear-gradient(180deg, rgba(14,245,194,0.09), rgba(1,7,13,0.66));
          display: grid;
          gap: 9px;
        }
        .memory-register span {
          color: #7dd3fc;
          font-size: 13px;
          font-family: "SF Mono","Fira Code","Cascadia Code",monospace;
        }
	        .memory-register strong {
	          color: #f8fafc;
	          font-size: 32px;
	          font-family: "SF Mono","Fira Code","Cascadia Code",monospace;
	          line-height: 1;
	        }
        .diagram-connector {
          height: 2px;
          background: linear-gradient(90deg, rgba(125,211,252,0.18), #0ef5c2);
          position: relative;
        }
        .diagram-connector i {
          position: absolute;
          right: -1px;
          top: 50%;
          width: 10px;
          height: 10px;
          border-top: 2px solid #0ef5c2;
          border-right: 2px solid #0ef5c2;
          transform: translateY(-50%) rotate(45deg);
        }
        .dom-window {
          overflow: hidden;
          border: 1px solid rgba(255,255,255,0.10);
          border-radius: 18px;
          background: rgba(1,7,13,0.66);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.05);
        }
        .dom-window-bar {
          height: 34px;
          display: flex;
          gap: 6px;
          align-items: center;
          padding: 0 12px;
          border-bottom: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.035);
        }
        .dom-window-bar span {
          width: 8px;
          height: 8px;
          border-radius: 999px;
          background: rgba(125,211,252,0.40);
        }
        .dom-code-lines {
          padding: 12px 14px 14px;
          display: grid;
          gap: 7px;
        }
        .dom-code-lines code {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          color: #e2f6ff;
          font-family: "SF Mono","Fira Code","Cascadia Code",monospace;
          font-size: 13px;
          white-space: nowrap;
        }
        .dom-code-lines code.is-nested {
          margin-left: 20px;
          padding-left: 12px;
          border-left: 1px solid rgba(125,211,252,0.20);
        }
        .dom-code-lines code.is-visible {
          color: #c5fff0;
        }
        .dom-code-lines em {
          color: #768ca3;
          font-family: inherit;
          font-size: 11px;
          font-style: normal;
        }
	        .pipeline-diagram {
	          position: relative;
	          display: grid;
	          grid-template-columns: repeat(var(--flow-count, 3), minmax(0, 1fr));
	          gap: 14px;
	        }
	        .pipeline-diagram::before {
	          display: none;
	        }
        .pipeline-diagram div,
        .strategy-rail div {
          position: relative;
          min-width: 0;
	          border: 1px solid rgba(255,255,255,0.09);
	          border-radius: 16px;
	          background: rgba(1,7,13,0.62);
	          padding: 14px;
	          min-height: 92px;
	          box-shadow: inset 0 1px 0 rgba(255,255,255,0.04);
	        }
        .pipeline-diagram div.is-output {
          border-color: rgba(14,245,194,0.24);
          background: rgba(14,245,194,0.08);
        }
        .pipeline-diagram span,
        .strategy-rail span {
          width: 24px;
          height: 24px;
          display: grid;
          place-items: center;
          border-radius: 999px;
          margin-bottom: 9px;
          color: #061019;
          background: linear-gradient(135deg, #7dd3fc, #0ef5c2);
          font-size: 11px;
          font-weight: 950;
        }
        .pipeline-diagram strong,
        .strategy-rail strong {
          display: block;
	          color: #edf8ff;
	          font-size: 13px;
	          line-height: 1.35;
	          overflow-wrap: anywhere;
	        }
	        .pipeline-diagram strong code,
	        .strategy-rail strong code,
	        .trace-diagram strong code,
	        .focus-diagram strong code,
	        .comparison-visual strong code {
	          color: inherit !important;
	          background: rgba(125,211,252,0.10);
	        }
        .strategy-rail {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
        }
        .strategy-rail div {
          border-color: rgba(251,191,36,0.20);
          background: rgba(251,191,36,0.055);
        }
        .strategy-rail span {
          background: rgba(251,191,36,0.20);
          color: #fbbf24;
        }
        .focus-diagram {
          min-height: 126px;
          display: grid;
          place-items: center;
          position: relative;
        }
        .focus-diagram i {
          position: absolute;
          width: 112px;
          height: 112px;
          border-radius: 999px;
          background: radial-gradient(circle, rgba(14,245,194,0.18), transparent 70%);
        }
        .focus-diagram strong {
          position: relative;
          border: 1px solid rgba(14,245,194,0.22);
          border-radius: 18px;
          background: rgba(1,7,13,0.66);
          padding: 14px 18px;
          color: #f8fafc;
          text-align: center;
        }
        .trace-diagram {
          display: grid;
          gap: 9px;
        }
        .trace-diagram div {
          display: grid;
          grid-template-columns: 26px minmax(0, 1fr);
          align-items: center;
          gap: 10px;
        }
        .trace-diagram span {
          width: 26px;
          height: 26px;
          border-radius: 9px;
          display: grid;
          place-items: center;
          color: var(--node-accent, #0ef5c2);
          background: rgba(14,245,194,0.10);
          font-size: 11px;
          font-weight: 950;
        }
        .trace-diagram strong {
          color: #edf8ff;
          font-size: 13px;
          line-height: 1.35;
        }
        .variable-visual {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 44px minmax(0, 1fr);
          gap: 10px;
          align-items: center;
        }
        .variable-visual > div,
        .comparison-visual > div,
        .flow-node {
          border: 1px solid rgba(255,255,255,0.10);
          border-radius: 16px;
          background: rgba(3,10,18,0.54);
          padding: 14px;
          min-width: 0;
        }
        .variable-visual small,
        .comparison-visual small {
          display: block;
          margin-bottom: 8px;
          color: #7f96ad;
          font-size: 10px;
          font-weight: 950;
          letter-spacing: 0.10em;
          text-transform: uppercase;
        }
        .variable-visual strong,
        .comparison-visual strong,
        .flow-node strong {
          display: block;
          color: #f8fafc;
          font-size: 15px;
          line-height: 1.35;
        }
        .variable-visual b {
          color: #0ef5c2;
          font-size: 24px;
          text-align: center;
        }
        .memory-visual {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 46px minmax(0, 1fr);
          gap: 12px;
          align-items: center;
        }
        .memory-code,
        .memory-cell,
        .html-root,
        .html-branch div,
        .html-leaves div,
        .code-flow-diagram div,
        .single-concept-visual div {
          border: 1px solid rgba(255,255,255,0.10);
          border-radius: 18px;
          background: rgba(2,8,15,0.58);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.05);
          padding: 15px;
          min-width: 0;
        }
        .memory-code small,
        .memory-cell small,
        .html-root small,
        .html-branch small,
        .html-leaves small,
        .code-flow-diagram small,
        .single-concept-visual small {
          display: block;
          margin-bottom: 9px;
          color: #7f96ad;
          font-size: 10px;
          font-weight: 950;
          letter-spacing: 0.10em;
          text-transform: uppercase;
        }
        .memory-cell {
          border-color: rgba(14,245,194,0.22);
          background: linear-gradient(180deg, rgba(14,245,194,0.10), rgba(2,8,15,0.58));
        }
        .memory-cell b {
          display: block;
          margin-top: 10px;
          padding-top: 10px;
          border-top: 1px solid rgba(255,255,255,0.08);
        }
        .memory-arrow {
          height: 2px;
          background: linear-gradient(90deg, rgba(125,211,252,0.20), #0ef5c2);
          position: relative;
        }
        .memory-arrow span {
          position: absolute;
          right: -2px;
          top: 50%;
          width: 11px;
          height: 11px;
          border-top: 2px solid #0ef5c2;
          border-right: 2px solid #0ef5c2;
          transform: translateY(-50%) rotate(45deg);
        }
        .html-tree-visual {
          display: grid;
          gap: 10px;
        }
        .html-root {
          border-color: rgba(125,211,252,0.22);
        }
        .html-branch {
          display: grid;
          grid-template-columns: 26px minmax(0, 1fr);
          align-items: stretch;
          gap: 10px;
        }
        .html-branch > span {
          width: 2px;
          justify-self: center;
          background: linear-gradient(180deg, #7dd3fc, rgba(14,245,194,0.35));
          border-radius: 999px;
        }
        .html-leaves {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          padding-left: 36px;
        }
        .html-leaves div:first-child {
          border-color: rgba(167,139,250,0.22);
        }
        .html-leaves div:last-child {
          border-color: rgba(14,245,194,0.22);
        }
        .code-flow-diagram {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
        }
        .code-flow-diagram div {
          position: relative;
          min-height: 92px;
        }
        .code-flow-diagram div:not(:last-child)::after {
          content: "";
          position: absolute;
          right: -16px;
          top: 50%;
          width: 18px;
          height: 2px;
          background: linear-gradient(90deg, #7dd3fc, #0ef5c2);
          transform: translateY(-50%);
          z-index: 2;
        }
        .code-flow-diagram .is-output {
          border-color: rgba(14,245,194,0.24);
          background: linear-gradient(180deg, rgba(14,245,194,0.09), rgba(2,8,15,0.58));
        }
        .check-strip-visual {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
        }
        .check-strip-visual div {
          border: 1px solid rgba(251,191,36,0.22);
          border-radius: 18px;
          background: rgba(251,191,36,0.07);
          padding: 13px;
        }
        .check-strip-visual span {
          width: 28px;
          height: 28px;
          display: grid;
          place-items: center;
          border-radius: 10px;
          margin-bottom: 9px;
          background: rgba(251,191,36,0.14);
          color: #fbbf24;
          font-size: 12px;
          font-weight: 950;
        }
        .timeline-visual {
          display: grid;
          gap: 0;
        }
        .timeline-node {
          display: grid;
          grid-template-columns: 34px minmax(0, 1fr);
          gap: 11px;
          align-items: start;
          position: relative;
          padding-bottom: 14px;
        }
        .timeline-node:not(:last-child)::after {
          content: "";
          position: absolute;
          left: 16px;
          top: 34px;
          bottom: 0;
          width: 2px;
          background: rgba(125,211,252,0.22);
        }
        .timeline-node span {
          width: 34px;
          height: 34px;
          border-radius: 12px;
          display: grid;
          place-items: center;
          background: rgba(14,245,194,0.12);
          border: 1px solid rgba(14,245,194,0.22);
          color: #0ef5c2;
          font-size: 12px;
          font-weight: 950;
        }
        .timeline-node strong {
          padding: 8px 0 0;
        }
        .single-concept-visual {
          min-height: 130px;
          display: grid;
          place-items: center;
          position: relative;
        }
        .single-concept-visual span {
          position: absolute;
          width: 128px;
          height: 128px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(14,245,194,0.18), transparent 68%);
        }
        .single-concept-visual div {
          min-width: 190px;
          text-align: center;
          border-color: rgba(14,245,194,0.22);
        }
        .flow-visual {
          display: grid;
          gap: 9px;
        }
        .flow-node {
          display: grid;
          grid-template-columns: 30px minmax(0, 1fr);
          align-items: center;
          gap: 10px;
          border-color: color-mix(in srgb, var(--node-accent, #0ef5c2) 26%, rgba(255,255,255,0.10));
        }
        .flow-node span {
          width: 30px;
          height: 30px;
          border-radius: 10px;
          display: grid;
          place-items: center;
          color: var(--node-accent, #0ef5c2);
          background: color-mix(in srgb, var(--node-accent, #0ef5c2) 14%, transparent);
          font-size: 12px;
          font-weight: 950;
        }
        .comparison-visual {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }
	        @media (max-width: 760px) {
	          .slide-split,
	          .memory-diagram,
	          .pipeline-diagram,
	          .strategy-rail,
	          .lesson-diagram-variable {
	            grid-template-columns: 1fr;
	          }
	          .lesson-nested-layer .lesson-nested-layer {
	            margin-left: 8px;
	          }
	          .slide-title {
	            font-size: 38px;
	          }
	          .slide-body {
	            font-size: 18px;
	          }
	          .diagram-connector,
	          .pipeline-diagram::before {
	            display: none;
          }
          .slide-visual {
            order: -1;
          }
        }
      `}</style>
      <div
        className="overlay-slide-up"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 200,
          background: 'radial-gradient(circle at 50% 0%, rgba(14,245,194,0.12), transparent 34%), linear-gradient(180deg,#050814 0%,#07111d 100%)',
          fontFamily: font,
          display: 'grid',
          gridTemplateRows: 'auto minmax(0, 1fr) auto',
          overflow: 'hidden',
        }}
      >
        <header
          style={{
            minHeight: 70,
            padding: '14px 18px',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(5,8,20,0.84)',
            backdropFilter: 'blur(24px)',
            display: 'grid',
            gridTemplateColumns: '44px minmax(0, 1fr) auto',
            alignItems: 'center',
            gap: 14,
          }}
        >
          <button
            type="button"
            onClick={onClose}
            aria-label="Close lesson"
            style={{
              width: 38,
              height: 38,
              borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.11)',
              background: 'rgba(255,255,255,0.06)',
              color: '#cbd5e1',
              cursor: 'pointer',
            }}
          >
            ×
          </button>
          <div style={{ minWidth: 0 }}>
            <div style={{ color: '#f8fafc', fontSize: 15, fontWeight: 950, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {lesson.title || lesson.topic}
            </div>
            <div style={{ marginTop: 7, height: 5, borderRadius: 999, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${progressPct}%`, background: 'linear-gradient(90deg,#0ef5c2,#7dd3fc)', transition: 'width 0.28s ease' }} />
            </div>
          </div>
          <div style={{ color: '#7dd3fc', fontSize: 12, fontWeight: 900, whiteSpace: 'nowrap' }}>
            {Math.min(currentSlideIndex + 1, slides.length)}/{slides.length}
          </div>
        </header>

        <main style={{ minHeight: 0, overflow: 'auto', display: 'grid', placeItems: 'center', padding: '26px 18px' }}>
          <section
            style={{
              width: slideFrameWidth,
              minHeight: slideFrameMinHeight,
              borderRadius: 28,
              border: '1px solid rgba(255,255,255,0.10)',
              background: 'linear-gradient(145deg, rgba(255,255,255,0.086), rgba(255,255,255,0.035))',
              boxShadow: '0 30px 90px rgba(0,0,0,0.34), inset 0 1px 0 rgba(255,255,255,0.07)',
              backdropFilter: 'blur(26px)',
              padding: 'clamp(24px, 5vw, 52px)',
              display: 'grid',
              alignItems: 'center',
              animation: 'fadeIn 0.28s ease both',
            }}
          >
            {renderSlide()}
          </section>
        </main>

        <footer
          style={{
            padding: '14px 18px 24px',
            borderTop: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(5,8,20,0.88)',
            backdropFilter: 'blur(24px)',
          }}
        >
          <div style={{ maxWidth: isVisualInteractive ? 1120 : 840, margin: '0 auto', display: 'flex', gap: 12 }}>
            <button
              type="button"
              onClick={goBack}
              disabled={!canGoBack}
              style={{
                minWidth: 110,
                padding: '14px 18px',
                borderRadius: 16,
                border: '1px solid rgba(255,255,255,0.10)',
                background: canGoBack ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.025)',
                color: canGoBack ? '#dbeafe' : '#4b5563',
                fontFamily: font,
                fontSize: 15,
                fontWeight: 850,
                cursor: canGoBack ? 'pointer' : 'default',
              }}
            >
              Back
            </button>
            <button
              type="button"
              onClick={continueForward}
              disabled={!canContinue || submitting}
              style={{
                flex: 1,
                padding: '14px 18px',
                borderRadius: 16,
                border: 'none',
                background: canContinue && !submitting ? 'linear-gradient(135deg,#0ef5c2,#7dd3fc)' : 'rgba(255,255,255,0.05)',
                color: canContinue && !submitting ? '#031018' : '#64748b',
                fontFamily: font,
                fontSize: 16,
                fontWeight: 950,
                boxShadow: canContinue && !submitting && isVisualInteractive ? '0 0 30px rgba(14,245,194,0.28), 0 0 54px rgba(125,211,252,0.16)' : 'none',
                cursor: canContinue && !submitting ? 'pointer' : 'default',
              }}
            >
              {continueLabel}
            </button>
          </div>
        </footer>
      </div>
      {assistant}
    </>
  )
}

function readCachedConceptLesson(cacheKey) {
  if (typeof window === 'undefined' || !cacheKey) return null
  try {
    const raw = window.localStorage.getItem(cacheKey)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed?.lessonDoc?.title) return null
    return parsed
  } catch {
    try { window.localStorage.removeItem(cacheKey) } catch {}
    return null
  }
}

function writeCachedConceptLesson(cacheKey, payload) {
  if (typeof window === 'undefined' || !cacheKey || !payload?.lessonDoc?.title) return
  try {
    window.localStorage.setItem(cacheKey, JSON.stringify({
      ...payload,
      cachedAt: Date.now(),
    }))
  } catch {}
}

export default function LessonViewer({
  concept,
  taskTitle,
  goal,
  knowledge,
  lessonKey,
  presetLesson = null,
  sourceTask = null,
  domain = null,
  domainConfig = null,
  aiMode = 'hint',
  onClose,
  onComplete,
}) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [lessonDoc, setLessonDoc] = useState(null)
  const [resource, setResource] = useState(null)
  const [generationMode, setGenerationMode] = useState('ai')
  const [reloadTick, setReloadTick] = useState(0)
  const [depthOverride, setDepthOverride] = useState(null)
  const [assistantUsageCount, setAssistantUsageCount] = useState(0)
  const [confidenceLevel, setConfidenceLevel] = useState('')
  const [reflection, setReflection] = useState('')
  const [submitting, setSubmitting] = useState(false)
  // Gated sections: 0=hook only, 1=+explanation, 2=+why+worked, 3=+mistake, 4=+takeaways (all)
  const [currentSection, setCurrentSection] = useState(0)
  const [readyForCompletion, setReadyForCompletion] = useState(false)

  const startTimeRef = useRef(null)
  const scrollRef = useRef(null)
  const explanationRef = useRef(null)
  const whyRef = useRef(null)
  const mistakeRef = useRef(null)
  const takeawaysRef = useRef(null)

  const cacheKey = useMemo(() => {
    const generatedKey = `${goal || 'goal'}::${concept || 'concept'}::${taskTitle || 'task'}`
    return `pathai.concept.v9::${lessonKey || generatedKey}::${domain || 'domainless'}::${depthOverride || 'adaptive'}`
  }, [goal, concept, taskTitle, lessonKey, depthOverride, domain])

  const sourceTaskPayload = useMemo(() => ({
    description: sourceTask?.description || '',
    action: sourceTask?.action || '',
    outcome: sourceTask?.outcome || '',
    resourceUrl: sourceTask?.resourceUrl || '',
    resourceTitle: sourceTask?.resourceTitle || '',
    learningContract: sourceTask?._learningContract || sourceTask?.learningContract || sourceTask?.lessonSeed?.learningContract || null,
    learnerProfile: sourceTask?._learningContract?.learnerProfile
      || sourceTask?.learningContract?.learnerProfile
      || sourceTask?.lessonSeed?.learningContract?.learnerProfile
      || null,
    domain: domain
      || sourceTask?.domain
      || sourceTask?._learningContract?.domain
      || sourceTask?.learningContract?.domain
      || sourceTask?.lessonSeed?.learningContract?.domain
      || null,
    domainConfig: domainConfig
      || sourceTask?.domain_config
      || sourceTask?.domainConfig
      || sourceTask?._learningContract?.domainConfig
      || sourceTask?.learningContract?.domainConfig
      || sourceTask?.lessonSeed?.learningContract?.domainConfig
      || null,
    visualPreference: sourceTask?._learningContract?.visualPreference
      || sourceTask?.learningContract?.visualPreference
      || sourceTask?.lessonSeed?.learningContract?.visualPreference
      || 'visual',
  }), [domain, domainConfig, sourceTask])

  useEffect(() => {
    const controller = new AbortController()

    async function load() {
      startTimeRef.current = Date.now()
      setLoading(true)
      setError('')
      setLessonDoc(null)
      setCurrentSection(0)
      setReadyForCompletion(false)

      if (presetLesson?.lessonDoc) {
        setLessonDoc(presetLesson.lessonDoc)
        setResource(presetLesson.resource || presetLesson.lessonDoc.resource || null)
        setGenerationMode(presetLesson.generationMode || 'preset')
        setLoading(false)
        return
      }

      if (reloadTick === 0) {
        const cached = readCachedConceptLesson(cacheKey)
        if (cached?.lessonDoc?.title) {
          setLessonDoc(cached.lessonDoc)
          setResource(cached.resource || cached.lessonDoc.resource || null)
          setGenerationMode(cached.generationMode || 'cached')
          setLoading(false)
          return
        }
      }

      try {
        const res = await fetch('/api/lesson', {
          method: 'POST',
          signal: controller.signal,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            concept,
            taskTitle,
            goal,
            knowledge,
            taskDescription: sourceTaskPayload.description,
            taskAction: sourceTaskPayload.action,
            taskOutcome: sourceTaskPayload.outcome,
            resourceUrl: sourceTaskPayload.resourceUrl,
            resourceTitle: sourceTaskPayload.resourceTitle,
            learningContract: sourceTaskPayload.learningContract,
            learnerProfile: sourceTaskPayload.learnerProfile,
            domain: sourceTaskPayload.domain,
            domainConfig: sourceTaskPayload.domainConfig,
            visualPreference: sourceTaskPayload.visualPreference,
            depthOverride,
          }),
        })
        const data = await res.json()
        if (!res.ok) {
          throw new Error(data?.error || 'Failed to load lesson')
        }
        if (!data?.lessonDoc?.title) throw new Error('No concept lesson returned')

        setLessonDoc(data.lessonDoc)
        setResource(data.resource || data.lessonDoc.resource || null)
        setGenerationMode(data.generationMode || 'ai')
        writeCachedConceptLesson(cacheKey, {
          lessonDoc: data.lessonDoc,
          resource: data.resource || data.lessonDoc.resource || null,
          generationMode: data.generationMode || 'ai',
        })
      } catch (loadError) {
        if (loadError?.name === 'AbortError') return
        setError(loadError?.message || 'Could not load this lesson right now.')
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    load()
    return () => controller.abort()
  }, [cacheKey, concept, depthOverride, goal, knowledge, presetLesson, reloadTick, sourceTaskPayload, taskTitle])

  // Scroll to newly revealed section
  useEffect(() => {
    if (currentSection === 0) return
    const refMap = [null, explanationRef, whyRef, mistakeRef, takeawaysRef]
    const ref = refMap[currentSection]
    if (ref?.current) {
      setTimeout(() => {
        ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 80)
    }
  }, [currentSection])

  // Unlock completion when all sections revealed
  useEffect(() => {
    if (currentSection >= 4) setReadyForCompletion(true)
  }, [currentSection])

  function advanceSection() {
    setCurrentSection((s) => Math.min(s + 1, 4))
  }

  function handleDepthChange(nextDepth) {
    setDepthOverride((current) => (current === nextDepth ? null : nextDepth))
    setReloadTick((value) => value + 1)
    setCurrentSection(0)
    setReadyForCompletion(false)
  }

  function handleRetryLesson() {
    setReloadTick((value) => value + 1)
    setCurrentSection(0)
    setReadyForCompletion(false)
  }

  function handleComplete() {
    if (!lessonDoc || !readyForCompletion || !confidenceLevel || reflection.trim().length < 20) return
    setSubmitting(true)
    const completionTimeSec = startTimeRef.current
      ? Math.round((Date.now() - startTimeRef.current) / 1000)
      : 0
    onComplete?.({
      fromLesson: true,
      completionTimeSec,
      confidenceLevel,
      assistantUsageCount,
      takeaway: reflection.trim(),
      proofSubmission: reflection.trim(),
      proofResult: `Lesson proof captured with ${confidenceLevel} confidence.`,
      taughtPointsCount: Array.isArray(lessonDoc.taughtPoints) ? lessonDoc.taughtPoints.length : 0,
    })
  }

  // Pick gate for a given afterSection key
  function getGate(afterSection) {
    if (!lessonDoc?.interactions) return null
    return lessonDoc.interactions.find((g) => g.afterSection === afterSection) || null
  }

  const slideshowDoc = useMemo(() => {
    if (!lessonDoc) return null
    return normalizeConceptSlideshowLesson(lessonDoc, {
      concept,
      taskTitle,
      goal,
      domain: sourceTaskPayload.domain,
      domainConfig: sourceTaskPayload.domainConfig,
      learningContract: lessonDoc.learningContract || sourceTaskPayload.learningContract,
    })
  }, [concept, goal, lessonDoc, sourceTaskPayload, taskTitle])

  if (!loading && !error && slideshowDoc) {
    return (
      <ConceptSlideshowPlayer
        lesson={slideshowDoc}
        onClose={onClose}
        onComplete={onComplete}
        assistant={(
          <AIAssistant
            concept={slideshowDoc.topic || concept}
            goal={goal}
            mode={aiMode}
            domain={sourceTaskPayload.domain}
            knowledge={knowledge}
            context={`Concept slideshow: ${slideshowDoc.title}`}
            onAsk={() => setAssistantUsageCount((count) => count + 1)}
          />
        )}
      />
    )
  }

  return (
    <>
      <style>{LESSON_CSS}</style>

      <div
        className="overlay-slide-up"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 200,
          background: 'linear-gradient(180deg,#06060f 0%,#080814 100%)',
          fontFamily: font,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* ── Top bar ────────────────────────────────── */}
        <div
          style={{
            padding: '14px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(6,6,15,0.88)',
            backdropFilter: 'blur(28px)',
            WebkitBackdropFilter: 'blur(28px)',
          }}
        >
          <button
            onClick={onClose}
            style={{
              width: 36,
              height: 36,
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.10)',
              borderRadius: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#8e8e93',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                padding: '6px 14px',
                borderRadius: 9999,
                border: '1px solid rgba(14,245,194,0.22)',
                background: 'rgba(14,245,194,0.08)',
                color: '#0ef5c2',
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
              }}
            >
              Concept Lesson
            </div>
            {!presetLesson && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
                {[
                  { id: 'simpler', label: 'Explain simpler' },
                  { id: 'deeper', label: 'Go deeper' },
                ].map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => handleDepthChange(option.id)}
                    style={{
                      padding: '6px 10px',
                      borderRadius: 999,
                      border: depthOverride === option.id ? '1px solid rgba(14,245,194,0.42)' : '1px solid rgba(255,255,255,0.10)',
                      background: depthOverride === option.id ? 'rgba(14,245,194,0.12)' : 'rgba(255,255,255,0.04)',
                      color: depthOverride === option.id ? '#0ef5c2' : '#aeb8c5',
                      fontSize: 11,
                      fontWeight: 800,
                      cursor: 'pointer',
                      fontFamily: font,
                    }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
            {lessonDoc && <ProgressBar current={currentSection} total={TOTAL_PHASES} />}
          </div>

          <div style={{ width: 50, textAlign: 'right', fontSize: 12, color: '#0ef5c2', fontWeight: 700 }}>
            {generationMode === 'ai' ? 'AI' : 'Ready'}
          </div>
        </div>

        {/* ── Scrollable content ─────────────────────── */}
        <div
          ref={scrollRef}
          style={{ flex: 1, overflowY: 'auto', padding: '24px 20px 160px' }}
        >
          <div style={{ maxWidth: 860, margin: '0 auto', display: 'grid', gap: 18 }}>

            {/* Loading */}
            {loading && (
              <div style={{ textAlign: 'center', paddingTop: 80 }}>
                <div
                  style={{
                    width: 46,
                    height: 46,
                    border: '3px solid rgba(255,255,255,0.06)',
                    borderTopColor: '#0ef5c2',
                    borderRadius: '50%',
                    animation: 'spin 0.65s linear infinite',
                    margin: '0 auto 18px',
                  }}
                />
                <p style={{ margin: 0, color: '#c8d6e5', fontSize: 15 }}>Building a concept lesson that actually teaches the idea…</p>
              </div>
            )}

            {/* Error */}
            {!loading && error && (
              <div style={{ textAlign: 'center', paddingTop: 80 }}>
                <p style={{ color: '#ff8d8d', fontSize: 16, marginBottom: 8 }}>
                  {error}
                </p>
                <p style={{ color: '#8e8e93', fontSize: 13, lineHeight: 1.6, margin: '0 0 18px' }}>
                  The lesson generator hit a temporary issue. Try again and PathAI will request a fresh lesson.
                </p>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
                  <button
                    onClick={handleRetryLesson}
                    style={{
                      padding: '12px 22px',
                      borderRadius: 14,
                      border: '1px solid rgba(14,245,194,0.28)',
                      background: 'rgba(14,245,194,0.10)',
                      color: '#0ef5c2',
                      fontSize: 15,
                      fontWeight: 800,
                      cursor: 'pointer',
                      fontFamily: font,
                    }}
                  >
                    Try Again
                  </button>
                  <button
                    onClick={onClose}
                    style={{
                      padding: '12px 22px',
                      borderRadius: 14,
                      border: '1px solid rgba(255,255,255,0.12)',
                      background: 'rgba(255,255,255,0.06)',
                      color: '#e6edf5',
                      fontSize: 15,
                      fontWeight: 800,
                      cursor: 'pointer',
                      fontFamily: font,
                    }}
                  >
                    Close
                  </button>
                  {sourceTaskPayload.resourceUrl && (
                    <a
                      href={sourceTaskPayload.resourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        padding: '12px 22px',
                        borderRadius: 14,
                        border: '1px solid rgba(255,255,255,0.12)',
                        background: 'rgba(255,255,255,0.05)',
                        color: '#c8d6e5',
                        fontSize: 15,
                        fontWeight: 700,
                        textDecoration: 'none',
                      }}
                    >
                      Open Resource
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* ── Lesson content ──────────────────────── */}
            {!loading && !error && lessonDoc && (
              <>
                <DailyConceptCard
                  learningContract={lessonDoc.learningContract || sourceTaskPayload.learningContract}
                  concept={concept || taskTitle}
                  goal={goal}
                  accent="#0ef5c2"
                />

                {/* SECTION 0: Hook (always visible) */}
                <section style={{ animation: 'fadeIn 0.28s ease both' }}>
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '7px 14px',
                      borderRadius: 9999,
                      border: '1px solid rgba(14,245,194,0.22)',
                      background: 'rgba(14,245,194,0.07)',
                      color: '#0ef5c2',
                      fontSize: 11,
                      fontWeight: 800,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      marginBottom: 16,
                    }}
                  >
                    <IconGlyph name="book" size={13} strokeWidth={2.4} color="#0ef5c2" />
                    Day Focus
                  </div>
                  <h1
                    style={{
                      margin: 0,
                      color: '#f5f5f7',
                      fontSize: 'clamp(34px, 5vw, 58px)',
                      lineHeight: 1.02,
                      letterSpacing: '-0.05em',
                      fontWeight: 900,
                      maxWidth: 860,
                    }}
                  >
                    {lessonDoc.title}
                  </h1>
                  <p style={{ margin: '22px 0 0', color: '#c8d6e5', fontSize: 18, lineHeight: 1.55, maxWidth: 760 }}>
                    {lessonDoc.hook}
                  </p>
                  {hasItems(lessonDoc.learningObjectives) && (
                    <div
                      style={{
                        marginTop: 20,
                        padding: '18px 20px',
                        borderRadius: 20,
                        background: 'rgba(255,255,255,0.035)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        maxWidth: 760,
                      }}
                    >
                      <div style={{ fontSize: 11, fontWeight: 900, color: '#0ef5c2', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>
                        By the end, you should be able to
                      </div>
                      <BulletList items={lessonDoc.learningObjectives} accent="#0ef5c2" />
                    </div>
                  )}
                </section>

                {/* Gate after hook */}
                {currentSection === 0 && (
                  <LessonGate
                    {...(getGate('hook') || { type: 'ready_check' })}
                    onPass={advanceSection}
                  />
                )}

                {/* SECTION 1: Explanation */}
                {currentSection >= 1 && (
                  <div ref={explanationRef}>
                    <LessonSection eyebrow="Plain English" title="What this really means">
                      <div style={{ display: 'grid', gap: 12 }}>
                        {shortParagraphs(lessonDoc.plainEnglishExplanation, 4).map((paragraph, index) => (
                          <p key={index} style={{ margin: 0, color: '#c8d6e5', fontSize: 16, lineHeight: 1.62 }}>
                            {paragraph}
                          </p>
                        ))}
                      </div>
                      {(hasCopy(lessonDoc.mentalModel?.model) || hasCopy(lessonDoc.mentalModel?.howToUse) || hasCopy(lessonDoc.mentalModel?.watchOut)) && (
                        <div style={{ marginTop: 18, display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
                          <TeachingCallout eyebrow="Mental model" title="Picture it this way">
                            <p style={{ margin: 0, color: '#c8d6e5', fontSize: 14, lineHeight: 1.65 }}>
                              {lessonDoc.mentalModel?.model}
                            </p>
                          </TeachingCallout>
                          <TeachingCallout eyebrow="Use it when" title="The practical move" accent="#00d4ff">
                            <p style={{ margin: 0, color: '#c8d6e5', fontSize: 14, lineHeight: 1.65 }}>
                              {lessonDoc.mentalModel?.howToUse}
                            </p>
                          </TeachingCallout>
                          <TeachingCallout eyebrow="Boundary" title="Do not overreach" accent="#fbbf24">
                            <p style={{ margin: 0, color: '#c8d6e5', fontSize: 14, lineHeight: 1.65 }}>
                              {lessonDoc.mentalModel?.watchOut}
                            </p>
                          </TeachingCallout>
                        </div>
                      )}
                      {(hasCopy(lessonDoc.deepDive?.question) || hasCopy(lessonDoc.deepDive?.answer)) && (
                        <div style={{ marginTop: 18 }}>
                          <TeachingCallout eyebrow="Deeper idea" title={lessonDoc.deepDive?.question || 'What is really happening?'} accent="#a78bfa">
                            {shortParagraphs(lessonDoc.deepDive?.answer, 3).map((paragraph, index) => (
                              <p key={index} style={{ margin: index === 0 ? 0 : '10px 0 0', color: '#c8d6e5', fontSize: 15, lineHeight: 1.7 }}>
                                {paragraph}
                              </p>
                            ))}
                            {hasCopy(lessonDoc.deepDive?.because) && (
                              <p style={{ margin: '12px 0 0', color: '#d7c7ff', fontSize: 14, lineHeight: 1.65, fontWeight: 700 }}>
                                Why: {lessonDoc.deepDive.because}
                              </p>
                            )}
                          </TeachingCallout>
                        </div>
                      )}
                    </LessonSection>

                    {/* Gate after explanation */}
                    {currentSection === 1 && (
                      <div style={{ marginTop: 18 }}>
                        <LessonGate
                          {...(getGate('explanation') || { type: 'ready_check' })}
                          onPass={advanceSection}
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* SECTION 2: Why It Matters + Worked Example (unlocked together, no gate between) */}
                {currentSection >= 2 && (
                  <div ref={whyRef} style={{ display: 'grid', gap: 18 }}>
                    <LessonSection eyebrow="Why It Matters" title="Why it matters">
                      <div style={{ display: 'grid', gap: 10 }}>
                        {shortParagraphs(lessonDoc.whyItMatters, 2).map((paragraph, index) => (
                          <p key={index} style={{ margin: 0, color: '#c8d6e5', fontSize: 16, lineHeight: 1.62 }}>{paragraph}</p>
                        ))}
                      </div>
                    </LessonSection>

                    <LessonSection eyebrow="Worked Example" title={lessonDoc.workedExample?.title || 'Worked example'}>
                      <p style={{ margin: 0, marginBottom: 16, color: '#c8d6e5', fontSize: 16, lineHeight: 1.62 }}>
                        {lessonDoc.workedExample?.setup}
                      </p>
                      {hasItems(lessonDoc.workedExample?.walkthrough) && (
                        <div style={{ marginBottom: 18 }}>
                          <WorkedExampleSteps walkthrough={lessonDoc.workedExample.walkthrough} accent="#00d4ff" />
                        </div>
                      )}
                      <NumberedList items={lessonDoc.workedExample?.walkthrough || []} accent="#00d4ff" />
                      <div
                        style={{
                          marginTop: 18,
                          padding: '14px 16px',
                          borderRadius: 18,
                          background: 'rgba(0,212,255,0.05)',
                          border: '1px solid rgba(0,212,255,0.18)',
                        }}
                      >
                        <div style={{ fontSize: 11, fontWeight: 800, color: '#00d4ff', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
                          What to notice
                        </div>
                        <p style={{ margin: 0, color: '#c8d6e5', fontSize: 15, lineHeight: 1.7 }}>
                          {lessonDoc.workedExample?.result}
                        </p>
                      </div>
                    </LessonSection>

                    {hasCopy(lessonDoc.practiceDrill?.prompt) && (
                      <LessonSection eyebrow="Practice Drill" title="Try it before moving on" accent="#a78bfa">
                        <p style={{ margin: '0 0 16px', color: '#c8d6e5', fontSize: 16, lineHeight: 1.7 }}>
                          {lessonDoc.practiceDrill.prompt}
                        </p>
                        <NumberedList items={lessonDoc.practiceDrill?.steps || []} accent="#a78bfa" />
                        {hasCopy(lessonDoc.practiceDrill?.modelAnswer) && (
                          <div
                            style={{
                              marginTop: 18,
                              padding: '14px 16px',
                              borderRadius: 18,
                              background: 'rgba(167,139,250,0.07)',
                              border: '1px solid rgba(167,139,250,0.22)',
                            }}
                          >
                            <div style={{ fontSize: 11, fontWeight: 900, color: '#c7b7ff', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
                              Model answer shape
                            </div>
                            <p style={{ margin: 0, color: '#dcd6ff', fontSize: 14, lineHeight: 1.7 }}>
                              {lessonDoc.practiceDrill.modelAnswer}
                            </p>
                          </div>
                        )}
                        {hasItems(lessonDoc.practiceDrill?.selfCheck) && (
                          <div style={{ marginTop: 16 }}>
                            <div style={{ fontSize: 11, fontWeight: 900, color: '#a78bfa', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>
                              Self-check
                            </div>
                            <BulletList items={lessonDoc.practiceDrill.selfCheck} accent="#a78bfa" />
                          </div>
                        )}
                      </LessonSection>
                    )}

                    {/* Gate after worked example */}
                    {currentSection === 2 && (
                      <LessonGate
                        {...(getGate('workedExample') || { type: 'ready_check' })}
                        onPass={advanceSection}
                      />
                    )}
                  </div>
                )}

                {/* SECTION 3: Common Mistake */}
                {currentSection >= 3 && (
                  <div ref={mistakeRef}>
                    <LessonSection eyebrow="Common Mistake" title="Where people usually trip">
                      {(hasCopy(lessonDoc.commonMistake?.mistake) || hasCopy(lessonDoc.commonMistake?.fix)) && (
                        <div style={{ marginBottom: 18 }}>
                          <MistakeVsFix mistake={lessonDoc.commonMistake?.mistake} fix={lessonDoc.commonMistake?.fix} />
                        </div>
                      )}
                      <div style={{ display: 'grid', gap: 12 }}>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 800, color: '#ff9f7a', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
                            The mistake
                          </div>
                          <p style={{ margin: 0, color: '#f5f5f7', fontSize: 16, lineHeight: 1.75 }}>{lessonDoc.commonMistake?.mistake}</p>
                        </div>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 800, color: '#8e8e93', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
                            Why it happens
                          </div>
                          <p style={{ margin: 0, color: '#c8d6e5', fontSize: 15, lineHeight: 1.75 }}>{lessonDoc.commonMistake?.whyItHappens}</p>
                        </div>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 800, color: '#0ef5c2', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
                            Better move
                          </div>
                          <p style={{ margin: 0, color: '#c8d6e5', fontSize: 15, lineHeight: 1.75 }}>{lessonDoc.commonMistake?.fix}</p>
                        </div>
                      </div>
                    </LessonSection>

                    {/* Gate after common mistake */}
                    {currentSection === 3 && (
                      <div style={{ marginTop: 18 }}>
                        <LessonGate
                          {...(getGate('commonMistake') || { type: 'ready_check' })}
                          onPass={advanceSection}
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* SECTION 4: Takeaways + Bridge + Checkpoint (all unlocked after last gate) */}
                {currentSection >= 4 && (
                  <div ref={takeawaysRef} style={{ display: 'grid', gap: 18 }}>
                    <div style={{ display: 'grid', gap: 18, gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
                      <LessonSection eyebrow="Key Takeaways" title="What should stick">
                        <BulletList items={lessonDoc.keyTakeaways || []} accent="#0ef5c2" />
                      </LessonSection>
                      <LessonSection eyebrow="Toolbox" title="What you can use next">
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                          {(lessonDoc.allowedConcepts || []).slice(0, 5).map((item, index) => (
                            <span key={`${item}-${index}`} style={{
                              padding: '8px 11px',
                              borderRadius: 999,
                              border: '1px solid rgba(0,212,255,0.20)',
                              background: 'rgba(0,212,255,0.06)',
                              color: '#9ee7ff',
                              fontSize: 12,
                              fontWeight: 800,
                            }}>
                              {item}
                            </span>
                          ))}
                        </div>
                      </LessonSection>
                      {hasItems(lessonDoc.retrievalPrompts) && (
                        <LessonSection eyebrow="Recall" title="Check it sticks" accent="#fbbf24">
                          <BulletList items={lessonDoc.retrievalPrompts || []} accent="#fbbf24" />
                        </LessonSection>
                      )}
                    </div>

                    <LessonSection eyebrow="Bridge" title="What happens next">
                      <p style={{ margin: 0, color: '#c8d6e5', fontSize: 16, lineHeight: 1.8 }}>{lessonDoc.practiceBridge}</p>
                      {resource?.url && (
                        <a
                          href={resource.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            marginTop: 14,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 8,
                            color: '#00d4ff',
                            fontSize: 14,
                            fontWeight: 700,
                            textDecoration: 'none',
                          }}
                        >
                          {resource.title || 'Open supporting resource'} <IconGlyph name="share" size={14} strokeWidth={2.3} color="#00d4ff" />
                        </a>
                      )}
                    </LessonSection>

                    <LessonSection eyebrow="Checkpoint" title="Finish the handoff into practice">
                      <p style={{ margin: 0, marginBottom: 14, color: '#c8d6e5', fontSize: 16, lineHeight: 1.8 }}>
                        {lessonDoc.completionCheck?.prompt}
                      </p>
                      <BulletList items={lessonDoc.completionCheck?.expectedSignals || []} accent="#0ef5c2" />
                      <div
                        style={{
                          marginTop: 18,
                          padding: '14px 16px',
                          borderRadius: 18,
                          background: 'rgba(14,245,194,0.06)',
                          border: '1px solid rgba(14,245,194,0.2)',
                        }}
                      >
                        <div style={{ fontSize: 12, fontWeight: 800, color: '#0ef5c2', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
                          Lesson checkpoint unlocked
                        </div>
                        <p style={{ margin: 0, color: '#c8d6e5', fontSize: 14, lineHeight: 1.7 }}>
                          {lessonDoc.completionCheck?.nextStep}
                        </p>
                      </div>
                    </LessonSection>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* ── Bottom footer (reflection + completion) ── */}
        {lessonDoc && currentSection >= 4 && (
          <div
            style={{
              padding: '14px 20px 28px',
              borderTop: '1px solid rgba(255,255,255,0.08)',
              background: 'rgba(6,6,15,0.92)',
              backdropFilter: 'blur(28px)',
              WebkitBackdropFilter: 'blur(28px)',
              animation: 'sectionReveal 0.4s ease',
            }}
          >
            <div style={{ maxWidth: 860, margin: '0 auto', display: 'grid', gap: 16 }}>
              <textarea
                value={reflection}
                onChange={(event) => setReflection(event.target.value)}
                placeholder="Write your proof for today: what you learned, what you can now do, and one concrete example or mistake you would avoid."
                rows={4}
                style={{
                  width: '100%',
                  padding: '16px 18px',
                  borderRadius: 18,
                  border: '1px solid rgba(255,255,255,0.12)',
                  background: 'rgba(255,255,255,0.04)',
                  color: '#f5f5f7',
                  fontSize: 15,
                  lineHeight: 1.7,
                  fontFamily: font,
                  resize: 'vertical',
                  outline: 'none',
                }}
              />

              <ConfidenceSelector
                value={confidenceLevel}
                onChange={setConfidenceLevel}
                accent="#0ef5c2"
                borderColor="rgba(14,245,194,0.22)"
                background="rgba(14,245,194,0.05)"
                label="How ready are you to use this concept in the next task?"
              />

              <DailyProofRecapCard
                learningContract={lessonDoc.learningContract || sourceTaskPayload.learningContract}
                concept={concept || taskTitle}
                goal={goal}
                accent="#0ef5c2"
                proofSubmission={reflection}
                proofResult={confidenceLevel ? `Confidence: ${confidenceLevel}` : ''}
              />

              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <button
                  onClick={onClose}
                  style={{
                    padding: '14px 22px',
                    borderRadius: 16,
                    border: '1px solid rgba(255,255,255,0.12)',
                    background: 'rgba(255,255,255,0.05)',
                    color: '#8e8e93',
                    fontSize: 15,
                    fontWeight: 700,
                    fontFamily: font,
                    cursor: 'pointer',
                  }}
                >
                  Back
                </button>
                <button
                  onClick={handleComplete}
                  disabled={!confidenceLevel || reflection.trim().length < 20 || submitting}
                  style={{
                    flex: 1,
                    minWidth: 220,
                    padding: '14px 22px',
                    borderRadius: 16,
                    border: 'none',
                    background: !confidenceLevel || reflection.trim().length < 20
                      ? 'rgba(255,255,255,0.05)'
                      : 'linear-gradient(135deg,#0ef5c2,#00d4ff)',
                    color: !confidenceLevel || reflection.trim().length < 20 ? '#636366' : '#06060f',
                    fontSize: 16,
                    fontWeight: 800,
                    fontFamily: font,
                    cursor: submitting ? 'default' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                  }}
                >
                  {submitting ? (
                    <>
                      <div style={{ width: 14, height: 14, border: '2px solid rgba(6,6,15,0.2)', borderTopColor: '#06060f', borderRadius: '50%', animation: 'spin 0.65s linear infinite' }} />
                      Saving…
                    </>
                  ) : (
                    'Complete concept and unlock next task'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Hint in footer when not all sections unlocked yet */}
        {lessonDoc && currentSection < 4 && (
          <div
            style={{
              padding: '12px 20px',
              borderTop: '1px solid rgba(255,255,255,0.06)',
              background: 'rgba(6,6,15,0.85)',
              backdropFilter: 'blur(18px)',
              textAlign: 'center',
            }}
          >
            <p style={{ margin: 0, color: '#636366', fontSize: 13, fontWeight: 600 }}>
              Answer the checkpoint above to unlock the next section
            </p>
          </div>
        )}
      </div>

      {lessonDoc && (
        <AIAssistant
          concept={concept}
          goal={goal}
          mode={aiMode}
          domain={sourceTaskPayload.domain}
          knowledge={knowledge}
          context={`Concept lesson: ${lessonDoc.title}`}
          onAsk={() => setAssistantUsageCount((count) => count + 1)}
        />
      )}
    </>
  )
}
