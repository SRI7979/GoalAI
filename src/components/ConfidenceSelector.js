'use client'

const font = "'Plus Jakarta Sans','DM Sans',system-ui,sans-serif"

const OPTIONS = [
  { id: 'low', label: 'Low', hint: 'Need more support' },
  { id: 'medium', label: 'Medium', hint: 'Mostly get it' },
  { id: 'high', label: 'High', hint: 'Very sure' },
]

export default function ConfidenceSelector({
  value,
  onChange,
  label = 'How confident do you feel?',
  accent = '#0ef5c2',
  borderColor = 'rgba(14,245,194,0.18)',
  background = 'rgba(14,245,194,0.05)',
}) {
  return (
    <div style={{
      padding: '14px 16px',
      background,
      border: `1px solid ${borderColor}`,
      borderRadius: 16,
      marginBottom: 16,
      fontFamily: font,
    }}>
      <div style={{ fontSize: 11, fontWeight: 800, color: accent, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 10 }}>
        Confidence Check
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, color: '#f5f5f7', marginBottom: 12 }}>
        {label}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 8 }}>
        {OPTIONS.map((option) => {
          const active = value === option.id
          return (
            <button
              key={option.id}
              onClick={() => onChange?.(option.id)}
              style={{
                padding: '10px 10px 9px',
                borderRadius: 12,
                border: `1px solid ${active ? accent : 'rgba(255,255,255,0.10)'}`,
                background: active ? `${accent}18` : 'rgba(255,255,255,0.04)',
                color: active ? accent : '#cbd5e1',
                cursor: 'pointer',
                fontFamily: font,
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 2 }}>{option.label}</div>
              <div style={{ fontSize: 10, color: active ? accent : '#64748b', lineHeight: 1.3 }}>{option.hint}</div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
