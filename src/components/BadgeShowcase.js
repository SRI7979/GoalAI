'use client'
import { useState, useRef, useCallback, useMemo, memo } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { Lock } from 'lucide-react'
import IconGlyph from '@/components/IconGlyph'
import { BADGES, RARITY_COLORS } from '@/lib/badges'

const font = "'Plus Jakarta Sans','DM Sans',system-ui,sans-serif"

const RARITY_LABELS = { common: 'Common', rare: 'Rare', epic: 'Epic', legendary: 'Legendary' }
const RARITY_ORDER = { legendary: 0, epic: 1, rare: 2, common: 3 }
const CATEGORY_ICONS = { streak: 'flame', learning: 'book', progress: 'map', special: 'sparkles' }
const CATEGORY_LABELS = { streak: 'Streak', learning: 'Learning', progress: 'Progress', special: 'Special' }

// ─── Metallic material definitions per rarity ────────────────────────────────
const METALLIC_MATERIALS = {
  common: {
    base: 'linear-gradient(145deg, #052e24 0%, #0a5c48 20%, #0ef5c2 45%, #0a5c48 55%, #0ef5c2 75%, #052e24 100%)',
    inner: 'linear-gradient(160deg, #041f19 0%, #073d30 40%, #0a5c48 100%)',
    specular: 'rgba(14, 245, 194, 0.55)',
    rim: '#0ef5c2',
    darkTone: '#041f19',
    glow: 'rgba(14, 245, 194, 0.25)',
  },
  rare: {
    base: 'linear-gradient(145deg, #0f2847 0%, #1a4a80 20%, #60A5FA 45%, #1a4a80 55%, #60A5FA 75%, #0f2847 100%)',
    inner: 'linear-gradient(160deg, #0a1c36 0%, #143a66 40%, #1a4a80 100%)',
    specular: 'rgba(96, 165, 250, 0.55)',
    rim: '#60A5FA',
    darkTone: '#0a1c36',
    glow: 'rgba(96, 165, 250, 0.25)',
  },
  epic: {
    base: 'linear-gradient(145deg, #1f0a45 0%, #3b1a7a 20%, #A855F7 45%, #3b1a7a 55%, #A855F7 75%, #1f0a45 100%)',
    inner: 'linear-gradient(160deg, #150730 0%, #2d1260 40%, #3b1a7a 100%)',
    specular: 'rgba(168, 85, 247, 0.55)',
    rim: '#A855F7',
    darkTone: '#150730',
    glow: 'rgba(168, 85, 247, 0.25)',
  },
  legendary: {
    base: 'linear-gradient(145deg, #3d2800 0%, #7a5200 20%, #FFD700 45%, #b8860b 55%, #FFD700 75%, #3d2800 100%)',
    inner: 'linear-gradient(160deg, #2a1c00 0%, #5c4000 40%, #7a5200 100%)',
    specular: 'rgba(255, 215, 0, 0.65)',
    rim: '#FFD700',
    darkTone: '#2a1c00',
    glow: 'rgba(255, 215, 0, 0.30)',
  },
}

const LOCKED_MATERIAL = {
  base: 'linear-gradient(145deg, #0d0d15 0%, #1a1a2e 30%, #2a2a3e 50%, #1a1a2e 70%, #0d0d15 100%)',
  inner: 'linear-gradient(160deg, #08080f 0%, #12121f 40%, #1a1a2e 100%)',
  rim: '#2a2a3e',
  darkTone: '#08080f',
}

// ─── Back face rarity patterns (SVG data URIs) ──────────────────────────────
function getBackPattern(rarity, color) {
  const c = encodeURIComponent(color)
  const patterns = {
    common: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Ccircle cx='20' cy='20' r='8' fill='none' stroke='${c}' stroke-width='1' opacity='0.3'/%3E%3C/svg%3E")`,
    rare: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Cpolygon points='20,4 24,16 36,16 26,24 30,36 20,28 10,36 14,24 4,16 16,16' fill='none' stroke='${c}' stroke-width='0.8' opacity='0.25'/%3E%3C/svg%3E")`,
    epic: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Crect x='12' y='12' width='16' height='16' transform='rotate(45 20 20)' fill='none' stroke='${c}' stroke-width='0.8' opacity='0.25'/%3E%3C/svg%3E")`,
    legendary: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='50' height='50'%3E%3Cpath d='M25,8 L28,18 L38,18 L30,24 L33,34 L25,28 L17,34 L20,24 L12,18 L22,18Z' fill='none' stroke='${c}' stroke-width='0.8' opacity='0.3'/%3E%3Ccircle cx='25' cy='25' r='18' fill='none' stroke='${c}' stroke-width='0.5' opacity='0.15'/%3E%3C/svg%3E")`,
  }
  return patterns[rarity] || patterns.common
}

// ─── 3D Metallic Badge Component ─────────────────────────────────────────────
const MetallicBadge = memo(function MetallicBadge({ badge, earned, delay = 0, selected = false, onSelect }) {
  const isDragging = useRef(false)
  const lastPointer = useRef({ x: 0, y: 0 })
  const dragStarted = useRef(false)

  const material = earned ? METALLIC_MATERIALS[badge.rarity] : null
  const rc = RARITY_COLORS[badge.rarity] || '#0ef5c2'
  const coinSize = 92

  // Motion values for rotation
  const rawY = useMotionValue(0)
  const rawX = useMotionValue(0)
  const springY = useSpring(rawY, { stiffness: 80, damping: 18, mass: 0.8 })
  const springX = useSpring(rawX, { stiffness: 80, damping: 18, mass: 0.8 })

  // Specular highlight position derived from rotation
  const sheenX = useTransform(springY, [-180, 0, 180], [120, 50, -20])
  const sheenY = useTransform(springX, [-25, 0, 25], [80, 50, 20])
  const sheenBg = useTransform(
    [sheenX, sheenY],
    ([sx, sy]) => earned
      ? `radial-gradient(ellipse 70% 70% at ${sx}% ${sy}%, ${material.specular} 0%, transparent 70%)`
      : 'none'
  )

  // Rim conic gradient rotation
  const rimAngle = useTransform(springY, v => v)

  // Pointer handlers for drag-to-spin
  const onPointerDown = useCallback((e) => {
    isDragging.current = true
    dragStarted.current = false
    lastPointer.current = { x: e.clientX, y: e.clientY }
    e.currentTarget.setPointerCapture(e.pointerId)
  }, [])

  const onPointerMove = useCallback((e) => {
    if (!isDragging.current) return
    const dx = e.clientX - lastPointer.current.x
    const dy = e.clientY - lastPointer.current.y
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) dragStarted.current = true
    rawY.set(rawY.get() + dx * 0.8)
    rawX.set(Math.max(-25, Math.min(25, rawX.get() - dy * 0.4)))
    lastPointer.current = { x: e.clientX, y: e.clientY }
  }, [rawY, rawX])

  const onPointerUp = useCallback(() => {
    isDragging.current = false
    // Snap back to nearest 0 or 360 for a satisfying settle
    const currentY = rawY.get()
    const nearestFlat = Math.round(currentY / 360) * 360
    rawY.set(nearestFlat)
    rawX.set(0)
  }, [rawY, rawX])

  const handleClick = useCallback(() => {
    if (!dragStarted.current) onSelect?.(badge.id)
  }, [onSelect, badge.id])

  return (
    <div style={{
      width: '100%',
      animation: `coinFadeIn 0.5s ${delay}s cubic-bezier(0.16,1,0.3,1) both`,
      position: 'relative',
    }}>
      <div style={{
        position: 'relative',
        borderRadius: 24,
        padding: '14px 12px 16px',
        minHeight: 214,
        background: selected
          ? 'linear-gradient(180deg, rgba(255,255,255,0.09) 0%, rgba(255,255,255,0.03) 100%)'
          : 'linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
        border: `1px solid ${selected ? `${rc}3a` : earned ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.05)'}`,
        boxShadow: selected
          ? `0 24px 44px rgba(0,0,0,0.44), 0 0 28px ${rc}18`
          : earned
          ? '0 18px 36px rgba(0,0,0,0.32)'
          : '0 14px 26px rgba(0,0,0,0.22)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        overflow: 'hidden',
        transform: selected ? 'translateY(-3px)' : 'translateY(0)',
        transition: 'transform 0.22s cubic-bezier(0.16,1,0.3,1), box-shadow 0.22s cubic-bezier(0.16,1,0.3,1), border-color 0.22s ease',
      }}>
        <div style={{
          position: 'absolute',
          inset: '0 auto auto 0',
          width: '100%',
          height: 1,
          background: selected
            ? `linear-gradient(90deg, transparent 0%, ${rc} 18%, rgba(255,255,255,0.55) 50%, ${rc} 82%, transparent 100%)`
            : 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.18) 50%, transparent 100%)',
          opacity: 0.9,
        }}/>
        <div style={{
          position: 'absolute',
          top: -38,
          right: -10,
          width: 120,
          height: 120,
          borderRadius: '50%',
          background: earned
            ? `radial-gradient(circle, ${rc}18 0%, transparent 70%)`
            : 'radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}/>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          marginBottom: 16,
          position: 'relative',
          zIndex: 1,
        }}>
          <span style={{
            padding: '5px 9px',
            borderRadius: 9999,
            border: `1px solid ${earned ? `${rc}28` : 'rgba(255,255,255,0.08)'}`,
            background: earned ? `${rc}10` : 'rgba(255,255,255,0.04)',
            color: earned ? rc : 'rgba(255,255,255,0.45)',
            fontSize: 9,
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '1px',
            fontFamily: font,
          }}>
            {RARITY_LABELS[badge.rarity]}
          </span>
          <span style={{
            padding: '5px 9px',
            borderRadius: 9999,
            border: `1px solid ${earned ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.06)'}`,
            background: earned ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.03)',
            color: earned ? '#D7DCE4' : 'rgba(255,255,255,0.38)',
            fontSize: 9,
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '1px',
            fontFamily: font,
          }}>
            {earned ? 'Unlocked' : 'Locked'}
          </span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          <div style={{ perspective: 800, cursor: 'grab' }}>
            <motion.div
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onClick={handleClick}
              style={{
                width: coinSize, height: coinSize,
                borderRadius: '50%',
                transformStyle: 'preserve-3d',
                rotateY: springY,
                rotateX: springX,
                willChange: 'transform',
                touchAction: 'none',
                contain: 'layout style paint',
                position: 'relative',
              }}
            >
              <div style={{
                position: 'absolute', inset: 0,
                borderRadius: '50%',
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
                overflow: 'hidden',
              }}>
                <motion.div style={{
                  position: 'absolute', inset: 0, borderRadius: '50%',
                  background: earned ? material.base : LOCKED_MATERIAL.base,
                  rotate: rimAngle,
                }}/>

                {earned && (
                  <motion.div style={{
                    position: 'absolute', inset: 0, borderRadius: '50%',
                    background: `conic-gradient(from 0deg, transparent 0%, ${material.rim}40 15%, transparent 30%, ${material.rim}25 50%, transparent 65%, ${material.rim}40 80%, transparent 100%)`,
                    rotate: rimAngle,
                    opacity: 0.6,
                  }}/>
                )}

                <div style={{
                  position: 'absolute',
                  top: 6, left: 6, right: 6, bottom: 6,
                  borderRadius: '50%',
                  background: earned ? material.inner : LOCKED_MATERIAL.inner,
                  boxShadow: earned
                    ? `inset 0 2px 6px rgba(0,0,0,0.6), inset 0 -1px 3px ${material.rim}15, 0 0 0 1px ${material.rim}10`
                    : 'inset 0 2px 6px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.03)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                }}>
                  {earned ? (
                    <div style={{
                      textShadow: `0 -1px 2px rgba(0,0,0,0.6), 0 1px 2px ${material.specular}, 0 0 12px ${material.glow}`,
                      filter: 'contrast(1.15) brightness(0.95)',
                      position: 'relative', zIndex: 2,
                      userSelect: 'none',
                      color: '#f8fbff',
                    }}>
                      <IconGlyph name={badge.icon} size={34} strokeWidth={2.3}/>
                    </div>
                  ) : (
                    <Lock
                      size={26}
                      strokeWidth={1.5}
                      color="rgba(255,255,255,0.12)"
                      style={{ position: 'relative', zIndex: 2 }}
                    />
                  )}
                </div>

                {earned && (
                  <motion.div style={{
                    position: 'absolute', inset: 0, borderRadius: '50%',
                    background: sheenBg,
                    pointerEvents: 'none',
                    zIndex: 3,
                  }}/>
                )}

                <div style={{
                  position: 'absolute', inset: 0, borderRadius: '50%',
                  boxShadow: earned
                    ? `inset 0 1px 1px ${material.rim}30, inset 0 -1px 1px rgba(0,0,0,0.4), 0 4px 16px ${material.glow}`
                    : 'inset 0 1px 1px rgba(255,255,255,0.05), inset 0 -1px 1px rgba(0,0,0,0.4)',
                  pointerEvents: 'none',
                  zIndex: 4,
                }}/>
              </div>

              <div style={{
                position: 'absolute', inset: 0,
                borderRadius: '50%',
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)',
                overflow: 'hidden',
              }}>
                <div style={{
                  position: 'absolute', inset: 0, borderRadius: '50%',
                  background: earned ? material.base : LOCKED_MATERIAL.base,
                }}/>

                <div style={{
                  position: 'absolute',
                  top: 6, left: 6, right: 6, bottom: 6,
                  borderRadius: '50%',
                  background: earned ? material.inner : LOCKED_MATERIAL.inner,
                  boxShadow: earned
                    ? `inset 0 2px 6px rgba(0,0,0,0.6), 0 0 0 1px ${material.rim}10`
                    : 'inset 0 2px 6px rgba(0,0,0,0.6)',
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  overflow: 'hidden',
                }}>
                  {earned && (
                    <div style={{
                      position: 'absolute', inset: 0,
                      backgroundImage: getBackPattern(badge.rarity, material.rim),
                      backgroundRepeat: 'repeat',
                      opacity: 0.4,
                    }}/>
                  )}

                  <div style={{
                    fontSize: 8, fontWeight: 900, textTransform: 'uppercase',
                    letterSpacing: '1.5px', fontFamily: font,
                    color: earned ? `${rc}90` : 'rgba(255,255,255,0.08)',
                    position: 'relative', zIndex: 1,
                    textShadow: earned ? `0 0 8px ${material.glow}` : 'none',
                  }}>
                    {RARITY_LABELS[badge.rarity]}
                  </div>
                  <div style={{
                    width: 24, height: 1, margin: '4px 0',
                    background: earned ? `${rc}40` : 'rgba(255,255,255,0.05)',
                    position: 'relative', zIndex: 1,
                  }}/>
                  <div style={{
                    lineHeight: 1,
                    filter: earned ? 'none' : 'grayscale(1) brightness(0.15)',
                    position: 'relative', zIndex: 1,
                    color: earned ? rc : 'rgba(255,255,255,0.18)',
                  }}>
                    <IconGlyph name={CATEGORY_ICONS[badge.category]} size={16} strokeWidth={2.2}/>
                  </div>
                </div>

                <div style={{
                  position: 'absolute', inset: 0, borderRadius: '50%',
                  boxShadow: earned
                    ? `inset 0 1px 1px ${material.rim}30, inset 0 -1px 1px rgba(0,0,0,0.4), 0 4px 16px ${material.glow}`
                    : 'inset 0 1px 1px rgba(255,255,255,0.05), inset 0 -1px 1px rgba(0,0,0,0.4)',
                  pointerEvents: 'none',
                }}/>
              </div>
            </motion.div>
          </div>
        </div>

        <div style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <div style={{
            fontSize: 13,
            fontWeight: 800,
            fontFamily: font,
            color: earned ? '#F3F6FA' : 'rgba(255,255,255,0.45)',
            letterSpacing: '-0.2px',
            lineHeight: 1.25,
            marginBottom: 5,
          }}>
            {earned ? badge.name : 'Hidden badge'}
          </div>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            justifyContent: 'center',
            fontSize: 10,
            fontWeight: 700,
            color: earned ? '#9EA5B2' : 'rgba(255,255,255,0.30)',
            marginBottom: 10,
          }}>
            <IconGlyph name={CATEGORY_ICONS[badge.category]} size={12} strokeWidth={2.4}/>
            <span>{CATEGORY_LABELS[badge.category]}</span>
          </div>
          <div style={{
            fontSize: 11,
            lineHeight: 1.55,
            color: earned ? '#98A1B2' : 'rgba(255,255,255,0.34)',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}>
            {earned ? badge.description : 'Unlock this badge to reveal its full details.'}
          </div>
        </div>
      </div>
    </div>
  )
})

// ─── Main Showcase ───────────────────────────────────────────────────────────
export default function BadgeShowcase({ earnedIds, maxWidth = 680, outerPadding = '0 20px 28px' }) {
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedView, setSelectedView] = useState('all')
  const [selectedBadgeId, setSelectedBadgeId] = useState(null)

  const categories = ['all', 'streak', 'learning', 'progress', 'special']
  const views = [
    { id: 'all', label: 'All' },
    { id: 'earned', label: 'Unlocked' },
    { id: 'locked', label: 'Locked' },
  ]

  const earnedCount = BADGES.filter((badge) => earnedIds.has(badge.id)).length
  const lockedCount = BADGES.length - earnedCount
  const completionPct = Math.round((earnedCount / BADGES.length) * 100)
  const legendaryCount = BADGES.filter((badge) => badge.rarity === 'legendary' && earnedIds.has(badge.id)).length
  const masteredCategories = categories.slice(1).filter((category) => (
    BADGES.filter((badge) => badge.category === category).every((badge) => earnedIds.has(badge.id))
  )).length

  const filteredBadges = useMemo(() => BADGES.filter((badge) => {
    const matchesCategory = selectedCategory === 'all' || badge.category === selectedCategory
    const isEarned = earnedIds.has(badge.id)
    const matchesView = selectedView === 'all'
      || (selectedView === 'earned' && isEarned)
      || (selectedView === 'locked' && !isEarned)
    return matchesCategory && matchesView
  }), [earnedIds, selectedCategory, selectedView])

  const sorted = useMemo(() => [...filteredBadges].sort((a, b) => {
    const aEarned = earnedIds.has(a.id) ? 0 : 1
    const bEarned = earnedIds.has(b.id) ? 0 : 1
    if (aEarned !== bEarned) return aEarned - bEarned
    return (RARITY_ORDER[a.rarity] || 3) - (RARITY_ORDER[b.rarity] || 3)
  }), [earnedIds, filteredBadges])

  const selectedBadge = sorted.find((badge) => badge.id === selectedBadgeId) || sorted[0] || BADGES[0]
  const selectedEarned = selectedBadge ? earnedIds.has(selectedBadge.id) : false
  const selectedAccent = selectedBadge ? (RARITY_COLORS[selectedBadge.rarity] || '#0ef5c2') : '#0ef5c2'
  const categoryEarnedCount = selectedCategory === 'all'
    ? earnedCount
    : BADGES.filter((badge) => badge.category === selectedCategory && earnedIds.has(badge.id)).length
  const categoryTotalCount = selectedCategory === 'all'
    ? BADGES.length
    : BADGES.filter((badge) => badge.category === selectedCategory).length

  return (
    <>
      <style>{`
        @keyframes coinFadeIn {
          0%   { opacity: 0; transform: translateY(20px) scale(0.85); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes coinTooltipIn {
          from { opacity: 0; transform: translateX(-50%) translateY(4px) scale(0.95); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
        }
        @keyframes progressShimmer {
          0%   { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes coinIdleSpin {
          0%   { transform: rotateY(0deg); }
          100% { transform: rotateY(360deg); }
        }
        @keyframes vaultGlow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(14,245,194,0.00); }
          50% { box-shadow: 0 0 0 1px rgba(14,245,194,0.10), 0 0 38px rgba(14,245,194,0.12); }
        }
        @media (max-width: 640px) {
          .badge-hero-metrics {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }
          .badge-showcase-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
          }
        }
      `}</style>

      <div style={{
        maxWidth, margin: '0 auto', padding: outerPadding,
        fontFamily: font,
      }}>
        <div style={{
          position: 'relative',
          overflow: 'hidden',
          borderRadius: 32,
          padding: '20px 18px 24px',
          background: 'linear-gradient(180deg, rgba(17,19,24,0.96) 0%, rgba(9,11,16,0.98) 100%)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 32px 60px rgba(0,0,0,0.38), inset 0 1px 0 rgba(255,255,255,0.06)',
          animation: 'vaultGlow 5s ease-in-out infinite',
        }}>
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(circle at top right, rgba(14,245,194,0.12), transparent 28%), radial-gradient(circle at bottom left, rgba(96,165,250,0.10), transparent 32%)',
            pointerEvents: 'none',
          }}/>
          <div style={{
            position: 'absolute',
            top: 0,
            left: 28,
            right: 28,
            height: 1,
            background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.22) 50%, transparent 100%)',
            pointerEvents: 'none',
          }}/>

          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 14,
              marginBottom: 18,
            }}>
              <div>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 10px',
                  borderRadius: 9999,
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  marginBottom: 12,
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#0ef5c2', boxShadow: '0 0 10px rgba(14,245,194,0.70)' }}/>
                  <span style={{ fontSize: 10, fontWeight: 800, color: '#98A1B2', textTransform: 'uppercase', letterSpacing: '1.4px' }}>
                    Achievement Vault
                  </span>
                </div>
                <div style={{ fontSize: 28, fontWeight: 900, color: '#F3F6FA', letterSpacing: '-0.9px', lineHeight: 1.04, marginBottom: 8 }}>
                  Earned skill proof,
                  <br/>
                  not just streak trophies.
                </div>
              </div>

              <div style={{
                minWidth: 122,
                padding: '14px 16px',
                borderRadius: 22,
                background: 'linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.03) 100%)',
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
              }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: '#7E8797', textTransform: 'uppercase', letterSpacing: '1.2px', marginBottom: 6 }}>
                  Completion
                </div>
                <div style={{ fontSize: 30, fontWeight: 900, color: '#F3F6FA', letterSpacing: '-1px', lineHeight: 1 }}>
                  {completionPct}%
                </div>
                <div style={{ fontSize: 11, color: '#7E8797', marginTop: 6 }}>
                  {earnedCount}/{BADGES.length} unlocked
                </div>
              </div>
            </div>

            <div style={{
              height: 7,
              borderRadius: 9999,
              overflow: 'hidden',
              background: 'rgba(255,255,255,0.05)',
              marginBottom: 18,
            }}>
              <div style={{
                height: '100%',
                width: `${(earnedCount / BADGES.length) * 100}%`,
                background: 'linear-gradient(90deg, #0ef5c2 0%, #00d4ff 48%, #A855F7 100%)',
                backgroundSize: '180% 100%',
                animation: earnedCount > 0 ? 'progressShimmer 3.5s ease-in-out infinite' : 'none',
                boxShadow: '0 0 24px rgba(14,245,194,0.22)',
                transition: 'width 0.8s cubic-bezier(0.16,1,0.3,1)',
              }}/>
            </div>

            <div className="badge-hero-metrics" style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
              gap: 10,
              marginBottom: 18,
            }}>
              {[
                { label: 'Unlocked', value: earnedCount, tone: '#0ef5c2' },
                { label: 'Locked', value: lockedCount, tone: '#8B8D98' },
                { label: 'Legendary', value: legendaryCount, tone: '#FFD700' },
                { label: 'Mastered', value: masteredCategories, tone: '#A855F7' },
              ].map((item) => (
                <div key={item.label} style={{
                  padding: '12px 12px 13px',
                  borderRadius: 18,
                  background: 'linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
                  border: '1px solid rgba(255,255,255,0.07)',
                }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: '#7E8797', textTransform: 'uppercase', letterSpacing: '1.1px', marginBottom: 8 }}>
                    {item.label}
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: item.tone, letterSpacing: '-0.6px', lineHeight: 1 }}>
                    {item.value}
                  </div>
                </div>
              ))}
            </div>

            <div style={{
              padding: '10px',
              borderRadius: 22,
              background: 'rgba(255,255,255,0.035)',
              border: '1px solid rgba(255,255,255,0.08)',
              marginBottom: 14,
            }}>
              <div style={{
                display: 'flex',
                gap: 8,
                overflowX: 'auto',
                scrollbarWidth: 'none',
                marginBottom: 8,
              }}>
                {categories.map((cat) => {
                  const active = selectedCategory === cat
                  const catCount = cat === 'all'
                    ? earnedCount
                    : BADGES.filter((badge) => badge.category === cat && earnedIds.has(badge.id)).length
                  const catTotal = cat === 'all' ? BADGES.length : BADGES.filter((badge) => badge.category === cat).length
                  return (
                    <button key={cat} onClick={() => setSelectedCategory(cat)} style={{
                      padding: '8px 14px',
                      borderRadius: 14,
                      border: active ? '1px solid rgba(14,245,194,0.28)' : '1px solid rgba(255,255,255,0.06)',
                      background: active ? 'rgba(14,245,194,0.09)' : 'rgba(255,255,255,0.03)',
                      color: active ? '#0ef5c2' : '#98A1B2',
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontFamily: font,
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                      transition: 'all 0.18s ease',
                    }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                        {cat === 'all'
                          ? 'Vault'
                          : (
                            <>
                              <IconGlyph name={CATEGORY_ICONS[cat]} size={12} strokeWidth={2.4}/>
                              {CATEGORY_LABELS[cat]}
                            </>
                          )}
                      </span>
                      <span style={{ marginLeft: 6, fontSize: 10, color: active ? '#0ef5c2' : '#667085' }}>
                        {catCount}/{catTotal}
                      </span>
                    </button>
                  )
                })}
              </div>

              <div style={{ display: 'flex', gap: 8, overflowX: 'auto', scrollbarWidth: 'none' }}>
                {views.map((view) => {
                  const active = selectedView === view.id
                  return (
                    <button key={view.id} onClick={() => setSelectedView(view.id)} style={{
                      padding: '8px 12px',
                      borderRadius: 12,
                      border: active ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(255,255,255,0.05)',
                      background: active ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.02)',
                      color: active ? '#F3F6FA' : '#7E8797',
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontFamily: font,
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                    }}>
                      {view.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {selectedBadge && (
              <div style={{
                position: 'relative',
                overflow: 'hidden',
                borderRadius: 26,
                padding: '16px',
                background: 'linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.03) 100%)',
                border: `1px solid ${selectedEarned ? `${selectedAccent}24` : 'rgba(255,255,255,0.08)'}`,
                boxShadow: selectedEarned ? `0 0 28px ${selectedAccent}12` : 'none',
                marginBottom: 18,
              }}>
                <div style={{
                  position: 'absolute',
                  right: -24,
                  top: -36,
                  width: 140,
                  height: 140,
                  borderRadius: '50%',
                  background: selectedEarned
                    ? `radial-gradient(circle, ${selectedAccent}18 0%, transparent 70%)`
                    : 'radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)',
                  pointerEvents: 'none',
                }}/>

                <div style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: 12,
                  marginBottom: 14,
                  position: 'relative',
                  zIndex: 1,
                }}>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 800, color: '#7E8797', textTransform: 'uppercase', letterSpacing: '1.3px', marginBottom: 4 }}>
                      Inspector
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 900, color: '#F3F6FA', letterSpacing: '-0.6px' }}>
                      {selectedEarned ? selectedBadge.name : 'Locked badge'}
                    </div>
                  </div>
                  <div style={{
                    padding: '7px 12px',
                    borderRadius: 9999,
                    border: `1px solid ${selectedEarned ? `${selectedAccent}28` : 'rgba(255,255,255,0.08)'}`,
                    background: selectedEarned ? `${selectedAccent}10` : 'rgba(255,255,255,0.04)',
                    fontSize: 11,
                    fontWeight: 800,
                    color: selectedEarned ? selectedAccent : '#98A1B2',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    whiteSpace: 'nowrap',
                  }}>
                    {selectedEarned ? 'Unlocked' : 'Reveal by earning'}
                  </div>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '84px 1fr',
                  gap: 14,
                  alignItems: 'center',
                  position: 'relative',
                  zIndex: 1,
                }}>
                  <div style={{
                    width: 84,
                    height: 84,
                    borderRadius: 24,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: selectedEarned ? `${selectedAccent}12` : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${selectedEarned ? `${selectedAccent}24` : 'rgba(255,255,255,0.08)'}`,
                    boxShadow: selectedEarned ? `0 0 20px ${selectedAccent}14` : 'none',
                    color: selectedAccent,
                  }}>
                    {selectedEarned ? <IconGlyph name={selectedBadge.icon} size={34} strokeWidth={2.2} color={selectedAccent}/> : <Lock size={26} color="rgba(255,255,255,0.26)" />}
                  </div>

                  <div>
                    <div style={{ fontSize: 14, lineHeight: 1.65, color: '#A5ACB8', marginBottom: 12 }}>
                      {selectedEarned ? selectedBadge.description : `Unlock condition: ${selectedBadge.description}`}
                    </div>

                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {[
                        { label: RARITY_LABELS[selectedBadge.rarity], color: selectedAccent },
                        { label: CATEGORY_LABELS[selectedBadge.category], color: '#98A1B2' },
                        { label: selectedEarned ? 'Collected' : 'Hidden', color: selectedEarned ? '#0ef5c2' : '#7E8797' },
                      ].map((chip) => (
                        <span key={chip.label} style={{
                          padding: '7px 10px',
                          borderRadius: 9999,
                          background: 'rgba(255,255,255,0.04)',
                          border: '1px solid rgba(255,255,255,0.07)',
                          fontSize: 11,
                          fontWeight: 700,
                          color: chip.color,
                        }}>
                          {chip.label}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div style={{
              padding: '16px',
              borderRadius: 26,
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.07)',
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                marginBottom: 16,
              }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 800, color: '#7E8797', textTransform: 'uppercase', letterSpacing: '1.2px', marginBottom: 4 }}>
                    Badge Grid
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: '#F3F6FA', letterSpacing: '-0.4px' }}>
                    {selectedCategory === 'all' ? 'All badges' : `${CATEGORY_LABELS[selectedCategory]} badges`}
                  </div>
                </div>
                <div style={{ fontSize: 11, color: '#7E8797', fontWeight: 700 }}>
                  {categoryEarnedCount}/{categoryTotalCount} in view
                </div>
              </div>

              {sorted.length > 0 ? (
                <div className="badge-showcase-grid" style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                  gap: 14,
                }}>
                  {sorted.map((badge, i) => (
                    <MetallicBadge
                      key={badge.id}
                      badge={badge}
                      earned={earnedIds.has(badge.id)}
                      selected={selectedBadge?.id === badge.id}
                      onSelect={setSelectedBadgeId}
                      delay={i * 0.04}
                    />
                  ))}
                </div>
              ) : (
                <div style={{
                  padding: '28px 16px',
                  borderRadius: 20,
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px dashed rgba(255,255,255,0.10)',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#F3F6FA', marginBottom: 6 }}>
                    No badges in this view
                  </div>
                  <div style={{ fontSize: 12, color: '#7E8797', lineHeight: 1.6 }}>
                    Try switching the filter to see the rest of your collection.
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
