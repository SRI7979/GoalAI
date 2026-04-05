'use client'

import { motion, useReducedMotion } from 'framer-motion'

const VARIANTS = {
  landing: {
    halos: [
      {
        background:
          'radial-gradient(circle, rgba(0,229,199,0.24) 0%, rgba(0,229,199,0.08) 32%, transparent 74%)',
        width: 820,
        height: 820,
        top: -420,
        left: '50%',
        x: '-50%',
        blur: 74,
      },
      {
        background:
          'radial-gradient(circle, rgba(120,148,255,0.18) 0%, rgba(120,148,255,0.06) 34%, transparent 74%)',
        width: 620,
        height: 620,
        top: -220,
        right: '-10%',
        blur: 90,
      },
      {
        background:
          'radial-gradient(circle, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.03) 18%, transparent 50%)',
        width: 420,
        height: 420,
        top: -180,
        left: '50%',
        x: '-50%',
        blur: 18,
      },
      {
        background:
          'radial-gradient(circle, rgba(0,229,199,0.12) 0%, rgba(0,229,199,0.03) 38%, transparent 72%)',
        width: 500,
        height: 500,
        bottom: '-10%',
        left: '-6%',
        blur: 100,
      },
    ],
  },
  onboarding: {
    halos: [
      {
        background:
          'radial-gradient(circle, rgba(0,229,199,0.18) 0%, rgba(0,229,199,0.06) 34%, transparent 72%)',
        width: 720,
        height: 720,
        top: -360,
        left: '50%',
        x: '-50%',
        blur: 80,
      },
      {
        background:
          'radial-gradient(circle, rgba(126,160,255,0.16) 0%, rgba(126,160,255,0.05) 32%, transparent 74%)',
        width: 560,
        height: 560,
        top: 80,
        right: '-10%',
        blur: 96,
      },
      {
        background:
          'radial-gradient(circle, rgba(0,229,199,0.10) 0%, rgba(0,229,199,0.04) 36%, transparent 76%)',
        width: 460,
        height: 460,
        bottom: '-12%',
        left: '10%',
        blur: 104,
      },
    ],
  },
}

export default function AtmosphericBackdrop({ variant = 'landing' }) {
  const reduceMotion = useReducedMotion()
  const config = VARIANTS[variant] || VARIANTS.landing

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(circle at 50% -6%, rgba(255,255,255,0.16), transparent 24%), linear-gradient(180deg, rgba(255,255,255,0.04), transparent 28%)',
          opacity: 0.8,
        }}
      />

      {config.halos.map((halo, index) => (
        <motion.div
          key={`${variant}-${index}`}
          initial={reduceMotion ? false : { opacity: 0.85, scale: 0.96 }}
          animate={
            reduceMotion
              ? undefined
              : {
                  opacity: [0.78, 1, 0.82],
                  scale: [1, 1.05, 1],
                  y: [0, index % 2 === 0 ? 10 : -12, 0],
                }
          }
          transition={{
            duration: reduceMotion ? 0 : 13 + index * 1.8,
            repeat: reduceMotion ? 0 : Infinity,
            ease: 'easeInOut',
            delay: reduceMotion ? 0 : index * 0.35,
          }}
          style={{
            position: 'absolute',
            borderRadius: '999px',
            filter: `blur(${halo.blur}px)`,
            transform: halo.x ? `translateX(${halo.x})` : undefined,
            ...halo,
          }}
        />
      ))}

      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: 0.18,
          backgroundImage:
            'radial-gradient(rgba(255,255,255,0.16) 0.7px, transparent 0.7px)',
          backgroundSize: '8px 8px',
          maskImage: 'linear-gradient(180deg, rgba(0,0,0,0.35), rgba(0,0,0,0.06))',
          WebkitMaskImage: 'linear-gradient(180deg, rgba(0,0,0,0.35), rgba(0,0,0,0.06))',
        }}
      />
    </div>
  )
}
