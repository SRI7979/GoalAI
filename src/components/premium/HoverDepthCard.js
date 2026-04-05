'use client'

import { motion, useReducedMotion } from 'framer-motion'
import PremiumFrame from './PremiumFrame'

export default function HoverDepthCard({
  children,
  className = '',
  style,
  accent,
  highlight,
  hoverScale = 1.012,
  hoverLift = -6,
}) {
  const reduceMotion = useReducedMotion()

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 18 }}
      whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: reduceMotion ? 0 : 0.45, ease: [0.16, 1, 0.3, 1] }}
      whileHover={reduceMotion ? undefined : { y: hoverLift, scale: hoverScale }}
      whileTap={reduceMotion ? undefined : { scale: 0.995, y: 0 }}
      style={{ height: '100%' }}
    >
      <PremiumFrame
        accent={accent}
        highlight={highlight}
        className={`interactive-card ${className}`.trim()}
        style={{
          height: '100%',
          ...style,
        }}
      >
        {children}
      </PremiumFrame>
    </motion.div>
  )
}
