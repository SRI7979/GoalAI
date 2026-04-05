'use client'

import { motion, useReducedMotion } from 'framer-motion'

const container = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.03,
      delayChildren: 0.05,
    },
  },
}

const item = {
  hidden: { opacity: 0, y: 22, filter: 'blur(10px)' },
  show: { opacity: 1, y: 0, filter: 'blur(0px)' },
}

function renderWords(line, reduced) {
  return line.split(' ').map((word, index) => (
    <motion.span
      key={`${word}-${index}`}
      variants={reduced ? undefined : item}
      style={{ display: 'inline-block', marginRight: '0.28em' }}
    >
      {word}
    </motion.span>
  ))
}

export default function RevealHeading({
  eyebrow,
  title,
  gradientLine,
  subtitle,
  align = 'left',
  maxWidth = 760,
}) {
  const reduceMotion = useReducedMotion()
  const lines = Array.isArray(title) ? title : [title]

  return (
    <motion.div
      initial={reduceMotion ? { opacity: 1 } : 'hidden'}
      animate={reduceMotion ? { opacity: 1 } : 'show'}
      variants={reduceMotion ? undefined : container}
      style={{
        textAlign: align,
        maxWidth,
      }}
    >
      {eyebrow ? (
        <motion.div
          variants={reduceMotion ? undefined : item}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            marginBottom: 24,
            padding: '8px 16px',
            borderRadius: 999,
            border: '1px solid rgba(14,245,194,0.18)',
            background: 'linear-gradient(180deg, rgba(11, 23, 30, 0.88), rgba(7, 13, 18, 0.9))',
            color: '#d6f8f0',
            fontSize: 12,
            fontWeight: 800,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '999px',
              background: 'linear-gradient(135deg, #0ef5c2, #00d4ff)',
              boxShadow: '0 0 16px rgba(14,245,194,0.42)',
            }}
          />
          {eyebrow}
        </motion.div>
      ) : null}

      {lines.map((line, index) => (
        <div
          key={`${line}-${index}`}
          style={{
            fontSize: 'clamp(2.8rem, 7vw, 5.6rem)',
            lineHeight: 0.96,
            letterSpacing: '-0.05em',
            fontWeight: 700,
            fontFamily: 'var(--font-display)',
            color: '#f5f5f7',
          }}
        >
          {renderWords(line, reduceMotion)}
        </div>
      ))}

      {gradientLine ? (
        <motion.div
          variants={reduceMotion ? undefined : item}
          style={{
            fontSize: 'clamp(2.8rem, 7vw, 5.6rem)',
            lineHeight: 0.96,
            letterSpacing: '-0.05em',
            fontWeight: 700,
            fontFamily: 'var(--font-display)',
            marginTop: 6,
            background: 'linear-gradient(135deg, #f8ffff 0%, #7de8ff 22%, #0ef5c2 52%, #8c8cff 100%)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            color: 'transparent',
          }}
        >
          {renderWords(gradientLine, reduceMotion)}
        </motion.div>
      ) : null}

      {subtitle ? (
        <motion.p
          variants={reduceMotion ? undefined : item}
          style={{
            marginTop: 26,
            fontSize: 17,
            lineHeight: 1.75,
            color: '#98a4ae',
            maxWidth: Math.min(maxWidth, 620),
            marginLeft: align === 'center' ? 'auto' : 0,
            marginRight: align === 'center' ? 'auto' : 0,
          }}
        >
          {subtitle}
        </motion.p>
      ) : null}
    </motion.div>
  )
}
