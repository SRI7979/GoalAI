'use client'

import { normalizeLearningContract } from '@/lib/conceptLesson'

const font = "'Plus Jakarta Sans','DM Sans',system-ui,sans-serif"

function trimPreview(value = '', maxLength = 260) {
  const cleaned = String(value || '').replace(/\s+/g, ' ').trim()
  if (!cleaned) return ''
  return cleaned.length > maxLength ? `${cleaned.slice(0, maxLength - 1).trim()}...` : cleaned
}

function sentenceLike(value = '') {
  const cleaned = String(value || '').replace(/\s+/g, ' ').trim()
  if (!cleaned) return ''
  return /[.!?]$/.test(cleaned) ? cleaned : `${cleaned}.`
}

function Pill({ children, color = '#0ef5c2', background = 'rgba(14,245,194,0.08)', border = 'rgba(14,245,194,0.22)' }) {
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      padding: '6px 10px',
      borderRadius: 999,
      fontSize: 11,
      fontWeight: 800,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      color,
      background,
      border: `1px solid ${border}`,
      whiteSpace: 'nowrap',
    }}>
      {children}
    </span>
  )
}

export function DailyProofRecapCard({
  learningContract,
  concept,
  goal,
  accent = '#0ef5c2',
  proofSubmission = '',
  proofResult = '',
}) {
  const contract = normalizeLearningContract(learningContract || {}, { concept, goal })
  return (
    <div style={{
      padding: '16px 18px',
      borderRadius: 20,
      border: `1px solid ${accent}28`,
      background: `linear-gradient(180deg, ${accent}10, rgba(255,255,255,0.03))`,
      display: 'grid',
      gap: 12,
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase', color: accent }}>
          Daily Recap
        </div>
        <Pill color={accent} background={`${accent}12`} border={`${accent}26`}>
          {contract.dayType === 'integration_day' ? 'Integration day' : contract.dayType === 'review_day' ? 'Review day' : 'Concept day'}
        </Pill>
      </div>
      <div style={{ display: 'grid', gap: 10 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#8e8e93', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
            Today you learned
          </div>
          <div style={{ color: '#f5f5f7', fontSize: 18, fontWeight: 800, lineHeight: 1.25 }}>
            {contract.conceptLabel}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#8e8e93', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
            You can now
          </div>
          <div style={{ color: '#c8d6e5', fontSize: 14, lineHeight: 1.7 }}>
            {sentenceLike(contract.canDoStatement)}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#8e8e93', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
            Proof submitted
          </div>
          <div style={{
            padding: '12px 13px',
            borderRadius: 14,
            border: '1px solid rgba(255,255,255,0.10)',
            background: 'rgba(255,255,255,0.03)',
            color: '#d7f8ff',
            fontSize: 13,
            lineHeight: 1.7,
          }}>
            {trimPreview(proofSubmission) || contract.proofPrompt}
          </div>
          {proofResult ? (
            <div style={{ marginTop: 8, color: accent, fontSize: 12, fontWeight: 700, lineHeight: 1.6 }}>
              {trimPreview(proofResult, 180)}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export default function DailyConceptCard({
  learningContract,
  concept,
  goal,
  accent = '#0ef5c2',
  title = 'Today’s concept',
}) {
  const contract = normalizeLearningContract(learningContract || {}, { concept, goal })

  return (
    <div style={{
      marginBottom: 20,
      padding: '18px 18px 16px',
      borderRadius: 22,
      border: `1px solid ${accent}24`,
      background: `radial-gradient(circle at 0% 0%, ${accent}12, transparent 36%), rgba(255,255,255,0.03)`,
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
      display: 'grid',
      gap: 14,
      fontFamily: font,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase', color: accent, marginBottom: 4 }}>
            {title}
          </div>
          <div style={{ color: '#f5f5f7', fontSize: 20, fontWeight: 800, lineHeight: 1.25 }}>
            {contract.conceptLabel}
          </div>
        </div>
        <Pill color={accent} background={`${accent}12`} border={`${accent}26`}>
          {contract.dayType === 'integration_day' ? 'Integration day' : contract.dayType === 'review_day' ? 'Review day' : 'Concept day'}
        </Pill>
      </div>

      <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        <div style={{
          padding: '12px 13px',
          borderRadius: 16,
          border: '1px solid rgba(255,255,255,0.08)',
          background: 'rgba(255,255,255,0.025)',
        }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#8e8e93', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 7 }}>
            By the end of today
          </div>
          <div style={{ color: '#c8d6e5', fontSize: 14, lineHeight: 1.7 }}>
            {sentenceLike(contract.canDoStatement)}
          </div>
        </div>

        <div style={{
          padding: '12px 13px',
          borderRadius: 16,
          border: '1px solid rgba(255,255,255,0.08)',
          background: 'rgba(255,255,255,0.025)',
        }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#8e8e93', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 7 }}>
            Your proof for today
          </div>
          <div style={{ color: '#d7f8ff', fontSize: 14, lineHeight: 1.7 }}>
            {sentenceLike(contract.proofPrompt)}
          </div>
        </div>
      </div>
    </div>
  )
}
