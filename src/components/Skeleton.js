'use client'

export default function Skeleton({
  width = '100%',
  height = 16,
  borderRadius = 8,
  w,
  h,
  r,
  mb = 0,
  style,
  className = '',
}) {
  return (
    <div
      className={`skeleton-shimmer ${className}`.trim()}
      style={{
        width: w ?? width,
        height: h ?? height,
        borderRadius: r ?? borderRadius,
        marginBottom: mb,
        background: 'linear-gradient(90deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.09) 50%, rgba(255,255,255,0.04) 100%)',
        backgroundSize: '200% 100%',
        ...style,
      }}
    />
  )
}
