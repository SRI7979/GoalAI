'use client'

import { motion, useReducedMotion } from 'framer-motion'
import IconGlyph from '@/components/IconGlyph'

export default function GenerationStepList({
  steps,
  activeIndex = 0,
  accent = '#0ef5c2',
}) {
  const reduceMotion = useReducedMotion()

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {steps.map((label, index) => {
        const completed = index < activeIndex
        const active = index === activeIndex

        return (
          <motion.div
            key={label}
            initial={reduceMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: index <= activeIndex + 1 ? 1 : 0.34, y: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.28, ease: [0.16, 1, 0.3, 1], delay: reduceMotion ? 0 : index * 0.03 }}
            style={{
              display: 'grid',
              gridTemplateColumns: '28px minmax(0, 1fr)',
              gap: 12,
              alignItems: 'center',
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: '999px',
                display: 'grid',
                placeItems: 'center',
                background: completed
                  ? `linear-gradient(135deg, ${accent}, #00d4ff)`
                  : active
                    ? `${accent}1c`
                    : 'rgba(255,255,255,0.04)',
                border: `1px solid ${completed || active ? `${accent}55` : 'rgba(255,255,255,0.08)'}`,
                color: completed ? '#06060f' : active ? accent : '#8e8e93',
                fontSize: 11,
                fontWeight: 900,
                boxShadow: active ? `0 0 18px ${accent}22` : 'none',
              }}
            >
              {completed ? <IconGlyph name="check" size={12} strokeWidth={2.8} color="#06060f" /> : index + 1}
            </div>

            <div
              style={{
                padding: '12px 14px',
                borderRadius: 18,
                border: `1px solid ${active ? `${accent}30` : 'rgba(255,255,255,0.08)'}`,
                background: active
                  ? 'linear-gradient(180deg, rgba(11, 28, 33, 0.92), rgba(7, 14, 20, 0.9))'
                  : 'linear-gradient(180deg, rgba(10,16,23,0.9), rgba(7,11,18,0.88))',
              }}
            >
              <div
                style={{
                  fontSize: 13.5,
                  fontWeight: active ? 800 : 700,
                  color: active ? '#f5f5f7' : '#9ba5ae',
                }}
              >
                {label}
              </div>
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}
