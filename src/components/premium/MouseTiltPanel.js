'use client'

import { useRef, useState } from 'react'
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from 'framer-motion'

export default function MouseTiltPanel({
  children,
  className = '',
  style,
  maxTilt = 10,
  scale = 1.016,
  baseRotateX = 0,
  baseRotateY = 0,
  glare = true,
  radius = 30,
}) {
  const reduceMotion = useReducedMotion()
  const ref = useRef(null)
  const [active, setActive] = useState(false)

  const rotateX = useMotionValue(baseRotateX)
  const rotateY = useMotionValue(baseRotateY)
  const glowX = useMotionValue(50)
  const glowY = useMotionValue(50)

  const springX = useSpring(rotateX, { stiffness: 180, damping: 20, mass: 0.6 })
  const springY = useSpring(rotateY, { stiffness: 180, damping: 20, mass: 0.6 })
  const springGlowX = useSpring(glowX, { stiffness: 160, damping: 26, mass: 0.8 })
  const springGlowY = useSpring(glowY, { stiffness: 160, damping: 26, mass: 0.8 })

  const glareBackground = useMotionTemplate`radial-gradient(circle at ${springGlowX}% ${springGlowY}%, rgba(255,255,255,0.18), rgba(255,255,255,0.08) 14%, transparent 42%)`
  const reset = () => {
    rotateX.set(baseRotateX)
    rotateY.set(baseRotateY)
    glowX.set(50)
    glowY.set(50)
    setActive(false)
  }

  const handlePointerMove = (event) => {
    if (reduceMotion || event.pointerType !== 'mouse') return
    const node = ref.current
    if (!node) return

    const rect = node.getBoundingClientRect()
    const relativeX = (event.clientX - rect.left) / rect.width
    const relativeY = (event.clientY - rect.top) / rect.height
    const tiltY = (relativeX - 0.5) * maxTilt * 2
    const tiltX = (0.5 - relativeY) * maxTilt * 2

    rotateX.set(baseRotateX + tiltX)
    rotateY.set(baseRotateY + tiltY)
    glowX.set(relativeX * 100)
    glowY.set(relativeY * 100)
    if (!active) setActive(true)
  }

  if (reduceMotion) {
    return (
      <div className={className} style={style}>
        {children}
      </div>
    )
  }

  return (
    <motion.div
      ref={ref}
      className={className}
      onPointerMove={handlePointerMove}
      onPointerLeave={reset}
      onPointerCancel={reset}
      onPointerUp={(event) => {
        if (event.pointerType !== 'mouse') reset()
      }}
      style={{
        perspective: 1800,
        transformStyle: 'preserve-3d',
        ...style,
      }}
    >
      <motion.div
        style={{
          position: 'relative',
          borderRadius: radius,
          transformStyle: 'preserve-3d',
          rotateX: springX,
          rotateY: springY,
          scale: active ? scale : 1,
          boxShadow: active
            ? '0 42px 86px rgba(0,0,0,0.28), 0 0 48px rgba(0,229,199,0.12)'
            : '0 28px 64px rgba(0,0,0,0.24), 0 0 32px rgba(0,229,199,0.08)',
          willChange: 'transform',
        }}
      >
        {children}
        {glare ? (
          <motion.div
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: 'inherit',
              background: glareBackground,
              opacity: active ? 1 : 0.45,
              mixBlendMode: 'screen',
              pointerEvents: 'none',
            }}
          />
        ) : null}
      </motion.div>
    </motion.div>
  )
}
