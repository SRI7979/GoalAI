'use client'

import { useEffect, useRef } from 'react'

export default function ScrollReveal({
  children,
  as: Component = 'div',
  className = '',
  delay = 0,
  distance = 28,
  threshold = 0.18,
  once = true,
  style,
}) {
  const ref = useRef(null)

  useEffect(() => {
    const node = ref.current
    if (!node) return undefined

    if (typeof IntersectionObserver === 'undefined') {
      node.classList.add('is-visible')
      return undefined
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible')
          if (once) observer.unobserve(entry.target)
        } else if (!once) {
          entry.target.classList.remove('is-visible')
        }
      },
      { threshold },
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [once, threshold])

  return (
    <Component
      ref={ref}
      className={`rb-scroll-reveal ${className}`.trim()}
      style={{
        '--rb-reveal-delay': `${delay}ms`,
        '--rb-reveal-distance': `${distance}px`,
        ...style,
      }}
    >
      {children}
    </Component>
  )
}
