'use client'

export default function PremiumFrame({
  children,
  className = '',
  style,
  accent = 'rgba(14,245,194,0.18)',
  highlight = 'linear-gradient(90deg, transparent, rgba(255,255,255,0.38), transparent)',
}) {
  return (
    <div
      className={`rb-frame ${className}`.trim()}
      style={{
        '--rb-accent': accent,
        '--rb-highlight': highlight,
        ...style,
      }}
    >
      <div className="rb-frame-inner">{children}</div>
    </div>
  )
}
