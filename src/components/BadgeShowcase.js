'use client'
import { memo, useMemo, useState } from 'react'
import IconGlyph from '@/components/IconGlyph'
import { BADGES, RARITY_COLORS } from '@/lib/badges'

const font = "'Plus Jakarta Sans','DM Sans',system-ui,sans-serif"

const RARITY_LABELS = {
  common: 'Core',
  rare: 'Advanced',
  epic: 'Mastered',
  legendary: 'Capstone',
}

const CARD_TONES = {
  common: {
    accent: '#0ef5c2',
    accent2: '#60A5FA',
    plate: 'linear-gradient(145deg, #0B312B 0%, #0F6C5E 40%, #18232F 100%)',
    glow: 'rgba(14,245,194,0.22)',
  },
  rare: {
    accent: '#60A5FA',
    accent2: '#FBBF24',
    plate: 'linear-gradient(145deg, #102B4D 0%, #1F5C9B 42%, #172131 100%)',
    glow: 'rgba(96,165,250,0.24)',
  },
  epic: {
    accent: '#F472B6',
    accent2: '#A3E635',
    plate: 'linear-gradient(145deg, #3B1631 0%, #8A2B66 42%, #1C2430 100%)',
    glow: 'rgba(244,114,182,0.24)',
  },
  legendary: {
    accent: '#FBBF24',
    accent2: '#22D3EE',
    plate: 'linear-gradient(145deg, #3A2B0A 0%, #996D12 42%, #17212C 100%)',
    glow: 'rgba(251,191,36,0.26)',
  },
}

const CATEGORY_META = {
  all: { label: 'All Cards', icon: 'grid' },
  learned: { label: 'Learned', icon: 'brain' },
  streak: { label: 'Streak', icon: 'flame' },
  learning: { label: 'Learning', icon: 'book' },
  progress: { label: 'Progress', icon: 'map' },
  special: { label: 'Special', icon: 'sparkles' },
}

const RARITY_ORDER = { legendary: 0, epic: 1, rare: 2, common: 3 }

function normalizeEarnedIds(earnedIds) {
  if (earnedIds instanceof Set) return earnedIds
  if (Array.isArray(earnedIds)) return new Set(earnedIds)
  return new Set()
}

function titleCase(value) {
  return String(value || '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map((part) => {
      if (part.length <= 2 && part === part.toUpperCase()) return part
      return part.charAt(0).toUpperCase() + part.slice(1)
    })
    .join(' ')
}

function cardIdFromTitle(title) {
  return String(title || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function chooseTopicIcon(title) {
  const text = String(title || '').toLowerCase()
  if (/neural|ai|model|machine learning|deep learning|transformer/.test(text)) return 'brain'
  if (/code|react|javascript|python|sql|api|program/.test(text)) return 'code'
  if (/data|chart|stats|analysis|probability/.test(text)) return 'bar_chart'
  if (/design|ui|ux|visual/.test(text)) return 'design'
  if (/music|audio|sound/.test(text)) return 'music'
  if (/business|market|startup|sales/.test(text)) return 'briefcase'
  if (/science|biology|chemistry|physics|lab/.test(text)) return 'flask'
  if (/writing|essay|story|language/.test(text)) return 'pen'
  return 'book'
}

function rarityForTopic({ completedTasks = 0, dayNumber = 1 }) {
  if (completedTasks >= 8 || dayNumber >= 18) return 'legendary'
  if (completedTasks >= 5 || dayNumber >= 10) return 'epic'
  if (completedTasks >= 3 || dayNumber >= 4) return 'rare'
  return 'common'
}

function collectLearnedCards(rows = [], goalText = '') {
  const cardsById = new Map()

  function addTopic(rawTitle, source = {}) {
    const title = titleCase(rawTitle)
    if (!title || title.length < 2) return
    const id = `learned-${cardIdFromTitle(title)}`
    const current = cardsById.get(id)
    const completedTasks = Number(source.completedTasks || 0)
    const dayNumber = Number(source.dayNumber || 1)
    const next = {
      id,
      title,
      category: 'learned',
      rarity: rarityForTopic({ completedTasks, dayNumber }),
      icon: chooseTopicIcon(title),
      earned: true,
      source: 'Learned Card',
      subtitle: goalText ? `Collected in ${goalText}` : 'Collected from your path',
      description: `You completed learning work connected to ${title}. This card marks that concept as part of your toolkit.`,
      statLabel: completedTasks > 0 ? `${completedTasks} tasks` : `Day ${dayNumber}`,
      mintedLabel: dayNumber > 0 ? `Day ${dayNumber}` : 'Collected',
    }
    if (!current) {
      cardsById.set(id, next)
      return
    }
    const currentRank = RARITY_ORDER[current.rarity] ?? 3
    const nextRank = RARITY_ORDER[next.rarity] ?? 3
    cardsById.set(id, {
      ...current,
      rarity: nextRank < currentRank ? next.rarity : current.rarity,
      statLabel: completedTasks > Number(current.statLabel?.split(' ')?.[0] || 0) ? next.statLabel : current.statLabel,
    })
  }

  rows.forEach((row) => {
    const rowCompleted = row?.completion_status === 'completed'
    const tasks = Array.isArray(row?.tasks) ? row.tasks : []
    const completedTasks = tasks.filter((task) => task?.completed).length
    const source = { completedTasks, dayNumber: row?.day_number || 1 }

    if (rowCompleted || completedTasks > 0) {
      ;(Array.isArray(row?.covered_topics) ? row.covered_topics : []).forEach((topic) => addTopic(topic, source))
    }

    tasks.forEach((task) => {
      if (!task?.completed) return
      addTopic(task._concept || task.concept || task.title, {
        completedTasks: 1,
        dayNumber: row?.day_number || 1,
      })
    })
  })

  return Array.from(cardsById.values()).slice(0, 48)
}

function achievementCards(earnedSet) {
  return BADGES.map((badge) => ({
    id: `achievement-${badge.id}`,
    title: badge.name,
    category: badge.category,
    rarity: badge.rarity,
    icon: badge.icon,
    earned: earnedSet.has(badge.id),
    source: 'Achievement Card',
    subtitle: CATEGORY_META[badge.category]?.label || 'Achievement',
    description: badge.description,
    statLabel: RARITY_LABELS[badge.rarity] || 'Card',
    mintedLabel: earnedSet.has(badge.id) ? 'Collected' : 'Locked',
  }))
}

const SkillCard = memo(function SkillCard({ card, selected, onSelect, delay = 0 }) {
  const [flipped, setFlipped] = useState(false)
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  const tone = CARD_TONES[card.rarity] || CARD_TONES.common
  const isLocked = !card.earned

  function handlePointerMove(event) {
    const bounds = event.currentTarget.getBoundingClientRect()
    const px = (event.clientX - bounds.left) / bounds.width
    const py = (event.clientY - bounds.top) / bounds.height
    setTilt({
      x: (0.5 - py) * 12,
      y: (px - 0.5) * 16,
    })
  }

  function resetTilt() {
    setTilt({ x: 0, y: 0 })
  }

  return (
    <div
      className="skill-card-slot"
      style={{ animationDelay: `${delay}s` }}
      onClick={() => onSelect?.(card.id)}
    >
      <div
        className="skill-card-perspective"
        onPointerMove={handlePointerMove}
        onPointerLeave={resetTilt}
      >
        <div
          className="skill-card-turntable"
          style={{
            transform: `rotateX(${tilt.x}deg) rotateY(${flipped ? 180 + tilt.y : tilt.y}deg)`,
          }}
        >
          <div
            className={`skill-card-face skill-card-front ${selected ? 'selected' : ''} ${isLocked ? 'locked' : ''}`}
            style={{
              '--card-accent': tone.accent,
              '--card-accent-2': tone.accent2,
              '--card-glow': tone.glow,
              background: isLocked
                ? 'linear-gradient(145deg, #11131A 0%, #1C202B 52%, #0B0D12 100%)'
                : tone.plate,
            }}
          >
            <div className="skill-card-sheen" />
            <div className="skill-card-topline">
              <span>{card.source}</span>
              <span>{card.mintedLabel}</span>
            </div>
            <div className="skill-card-orbit">
              {isLocked ? (
                <IconGlyph name="lock" size={36} strokeWidth={2.2} color="rgba(255,255,255,0.38)" />
              ) : (
                <IconGlyph name={card.icon} size={40} strokeWidth={2.2} color="#061014" />
              )}
            </div>
            <div className="skill-card-title">{isLocked ? 'Hidden Card' : card.title}</div>
            <div className="skill-card-subtitle">{isLocked ? card.description : card.subtitle}</div>
            <div className="skill-card-footer">
              <span>{RARITY_LABELS[card.rarity] || 'Card'}</span>
              <span>{card.statLabel}</span>
            </div>
          </div>

          <div
            className={`skill-card-face skill-card-back ${isLocked ? 'locked' : ''}`}
            style={{
              '--card-accent': tone.accent,
              '--card-accent-2': tone.accent2,
              '--card-glow': tone.glow,
            }}
          >
            <div className="skill-card-back-mark">
              <IconGlyph name={isLocked ? 'lock' : card.icon} size={28} strokeWidth={2.2} color={tone.accent} />
            </div>
            <div className="skill-card-back-label">{isLocked ? 'Unlock condition' : 'What this proves'}</div>
            <p>{card.description}</p>
            <div className="skill-card-back-strip">
              <span>{CATEGORY_META[card.category]?.label || 'Card'}</span>
              <span>{RARITY_LABELS[card.rarity] || 'Card'}</span>
            </div>
          </div>
        </div>
      </div>

      <button
        type="button"
        className="skill-card-turn-button"
        title={flipped ? 'Show front' : 'Turn card'}
        aria-label={flipped ? 'Show front' : 'Turn card'}
        onClick={(event) => {
          event.stopPropagation()
          setFlipped((value) => !value)
          onSelect?.(card.id)
        }}
      >
        <IconGlyph name="repeat" size={14} strokeWidth={2.5} color="currentColor" />
      </button>
    </div>
  )
})

export default function BadgeShowcase({
  earnedIds,
  rows = [],
  goalText = '',
  maxWidth = 1040,
  outerPadding = '0 20px 28px',
}) {
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedView, setSelectedView] = useState('all')
  const [selectedCardId, setSelectedCardId] = useState(null)

  const earnedSet = useMemo(() => normalizeEarnedIds(earnedIds), [earnedIds])
  const learnedCards = useMemo(() => collectLearnedCards(rows, goalText), [rows, goalText])
  const cards = useMemo(() => [...learnedCards, ...achievementCards(earnedSet)], [earnedSet, learnedCards])

  const earnedCount = cards.filter((card) => card.earned).length
  const learnedCount = learnedCards.length
  const lockedCount = cards.length - earnedCount
  const completionPct = cards.length ? Math.round((earnedCount / cards.length) * 100) : 0

  const categories = ['all', 'learned', 'learning', 'progress', 'streak', 'special']
  const views = [
    { id: 'all', label: 'All' },
    { id: 'earned', label: 'Collected' },
    { id: 'locked', label: 'Locked' },
  ]

  const filteredCards = useMemo(() => cards.filter((card) => {
    const matchesCategory = selectedCategory === 'all' || card.category === selectedCategory
    const matchesView = selectedView === 'all'
      || (selectedView === 'earned' && card.earned)
      || (selectedView === 'locked' && !card.earned)
    return matchesCategory && matchesView
  }), [cards, selectedCategory, selectedView])

  const sortedCards = useMemo(() => [...filteredCards].sort((a, b) => {
    if (a.earned !== b.earned) return a.earned ? -1 : 1
    if (a.category === 'learned' && b.category !== 'learned') return -1
    if (a.category !== 'learned' && b.category === 'learned') return 1
    return (RARITY_ORDER[a.rarity] || 3) - (RARITY_ORDER[b.rarity] || 3)
  }), [filteredCards])

  const selectedCard = sortedCards.find((card) => card.id === selectedCardId) || sortedCards[0] || cards[0]
  const selectedTone = selectedCard ? (CARD_TONES[selectedCard.rarity] || CARD_TONES.common) : CARD_TONES.common

  return (
    <>
      <style>{`
        @keyframes skillCardIn {
          from { opacity: 0; transform: translateY(18px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes skillGlow {
          0%, 100% { box-shadow: 0 0 0 rgba(14,245,194,0); }
          50% { box-shadow: 0 0 42px rgba(14,245,194,0.11); }
        }
        .card-collection-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 18px;
        }
        .skill-card-slot {
          position: relative;
          min-width: 0;
          animation: skillCardIn 0.42s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .skill-card-perspective {
          perspective: 1000px;
        }
        .skill-card-turntable {
          position: relative;
          min-height: 316px;
          transform-style: preserve-3d;
          transition: transform 0.38s cubic-bezier(0.16, 1, 0.3, 1);
          cursor: grab;
        }
        .skill-card-face {
          position: absolute;
          inset: 0;
          border-radius: 8px;
          padding: 16px;
          border: 1px solid rgba(255,255,255,0.13);
          box-shadow: 0 18px 42px rgba(0,0,0,0.34), 0 0 30px var(--card-glow), inset 0 1px 0 rgba(255,255,255,0.14);
          overflow: hidden;
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
        }
        .skill-card-face.locked {
          filter: grayscale(0.35);
          box-shadow: 0 16px 34px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.08);
        }
        .skill-card-front.selected {
          outline: 2px solid color-mix(in srgb, var(--card-accent) 58%, transparent);
          outline-offset: 3px;
        }
        .skill-card-back {
          transform: rotateY(180deg);
          background:
            radial-gradient(circle at 20% 18%, color-mix(in srgb, var(--card-accent) 28%, transparent), transparent 34%),
            linear-gradient(145deg, #10141B 0%, #1B2330 100%);
        }
        .skill-card-sheen {
          position: absolute;
          inset: 0;
          background:
            linear-gradient(110deg, transparent 0%, rgba(255,255,255,0.28) 16%, transparent 32%),
            radial-gradient(circle at 80% 8%, rgba(255,255,255,0.22), transparent 28%);
          opacity: 0.62;
          pointer-events: none;
        }
        .skill-card-topline,
        .skill-card-footer,
        .skill-card-back-strip {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          color: rgba(255,255,255,0.76);
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 1px;
          text-transform: uppercase;
        }
        .skill-card-topline {
          padding-right: 42px;
        }
        .skill-card-orbit {
          position: relative;
          z-index: 1;
          width: 86px;
          height: 86px;
          margin: 34px auto 18px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          background:
            radial-gradient(circle, rgba(255,255,255,0.92) 0%, rgba(255,255,255,0.72) 50%, rgba(255,255,255,0.18) 51%, rgba(255,255,255,0.04) 70%),
            conic-gradient(from 0deg, var(--card-accent), var(--card-accent-2), var(--card-accent));
          box-shadow: 0 18px 36px rgba(0,0,0,0.32), 0 0 28px var(--card-glow);
        }
        .skill-card-title {
          position: relative;
          z-index: 1;
          color: #F7FAFC;
          font-size: clamp(18px, 1.4vw, 21px);
          font-weight: 950;
          line-height: 1.08;
          letter-spacing: -0.4px;
          text-align: center;
          min-height: 68px;
          display: grid;
          place-items: center;
          overflow-wrap: anywhere;
        }
        .skill-card-subtitle {
          position: relative;
          z-index: 1;
          margin: 8px 0 16px;
          color: rgba(255,255,255,0.68);
          font-size: 12px;
          font-weight: 700;
          line-height: 1.45;
          text-align: center;
          min-height: 38px;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .skill-card-footer {
          position: absolute;
          left: 16px;
          right: 16px;
          bottom: 14px;
        }
        .skill-card-back-mark {
          width: 58px;
          height: 58px;
          border-radius: 8px;
          display: grid;
          place-items: center;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.10);
          margin-bottom: 18px;
        }
        .skill-card-back-label {
          color: var(--card-accent);
          font-size: 10px;
          font-weight: 950;
          letter-spacing: 1px;
          text-transform: uppercase;
          margin-bottom: 8px;
        }
        .skill-card-back p {
          margin: 0;
          color: #D8DEE8;
          font-size: 13px;
          font-weight: 700;
          line-height: 1.58;
        }
        .skill-card-back-strip {
          position: absolute;
          left: 16px;
          right: 16px;
          bottom: 14px;
          color: rgba(255,255,255,0.62);
        }
        .skill-card-turn-button {
          position: absolute;
          right: 10px;
          top: 10px;
          z-index: 3;
          width: 34px;
          height: 34px;
          padding: 0;
          border-radius: 9999px;
          border: 1px solid rgba(255,255,255,0.13);
          background: rgba(5,7,10,0.72);
          color: #F7FAFC;
          font-family: ${font};
          font-size: 11px;
          font-weight: 900;
          cursor: pointer;
          backdrop-filter: blur(16px);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.12s ease, filter 0.12s ease;
        }
        .skill-card-turn-button:active {
          transform: translateY(2px);
          filter: brightness(0.82);
        }
        @media (max-width: 860px) {
          .card-collection-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }
        @media (max-width: 560px) {
          .card-collection-grid { grid-template-columns: 1fr; }
          .skill-card-turntable { min-height: 300px; }
        }
      `}</style>

      <div style={{ maxWidth, margin: '0 auto', padding: outerPadding, fontFamily: font }}>
        <div style={{
          position: 'relative',
          overflow: 'hidden',
          borderRadius: 8,
          padding: 20,
          background: 'linear-gradient(180deg, rgba(17,20,25,0.98) 0%, rgba(8,10,14,0.98) 100%)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 32px 60px rgba(0,0,0,0.38), inset 0 1px 0 rgba(255,255,255,0.06)',
          animation: 'skillGlow 5s ease-in-out infinite',
        }}>
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(circle at top left, rgba(14,245,194,0.12), transparent 28%), radial-gradient(circle at bottom right, rgba(251,191,36,0.10), transparent 30%)',
            pointerEvents: 'none',
          }} />

          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1fr) auto',
              gap: 18,
              alignItems: 'start',
              marginBottom: 18,
            }}>
              <div>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  height: 30,
                  padding: '0 10px',
                  borderRadius: 8,
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: '#AAB4C3',
                  fontSize: 10,
                  fontWeight: 950,
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                  marginBottom: 12,
                }}>
                  <IconGlyph name="sparkles" size={13} strokeWidth={2.3} color="#0ef5c2" />
                  Card Collection
                </div>
                <h2 style={{
                  margin: 0,
                  color: '#F7FAFC',
                  fontSize: 34,
                  lineHeight: 1.02,
                  letterSpacing: '-1.1px',
                  fontWeight: 950,
                }}>
                  Collect what you learn.
                </h2>
                <p style={{
                  margin: '10px 0 0',
                  color: '#9AA6B8',
                  fontSize: 14,
                  lineHeight: 1.6,
                  fontWeight: 700,
                  maxWidth: 620,
                }}>
                  Each card is proof of a concept, habit, or milestone. Finish Neural Networks and it becomes a Neural Networks card in your collection.
                </p>
              </div>

              <div style={{
                minWidth: 132,
                borderRadius: 8,
                padding: '14px 15px',
                background: 'rgba(255,255,255,0.055)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}>
                <div style={{ color: '#7E8797', fontSize: 10, fontWeight: 950, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 7 }}>
                  Collected
                </div>
                <div style={{ color: '#F7FAFC', fontSize: 31, fontWeight: 950, lineHeight: 1 }}>
                  {earnedCount}
                </div>
                <div style={{ color: '#7E8797', fontSize: 11, fontWeight: 800, marginTop: 7 }}>
                  {completionPct}% of visible set
                </div>
              </div>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
              gap: 10,
              marginBottom: 16,
            }}>
              {[
                { label: 'Learned', value: learnedCount, color: '#0ef5c2', icon: 'brain' },
                { label: 'Achievements', value: BADGES.length, color: '#FBBF24', icon: 'badge' },
                { label: 'Locked', value: lockedCount, color: '#8B8D98', icon: 'lock' },
                { label: 'Rare+', value: cards.filter((card) => card.earned && card.rarity !== 'common').length, color: '#60A5FA', icon: 'sparkles' },
              ].map((item) => (
                <div key={item.label} style={{
                  borderRadius: 8,
                  padding: '12px 12px',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  minWidth: 0,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: item.color, marginBottom: 8 }}>
                    <IconGlyph name={item.icon} size={13} strokeWidth={2.3} />
                    <span style={{ fontSize: 10, fontWeight: 950, textTransform: 'uppercase', letterSpacing: 1 }}>{item.label}</span>
                  </div>
                  <div style={{ color: '#F7FAFC', fontSize: 23, fontWeight: 950, lineHeight: 1 }}>{item.value}</div>
                </div>
              ))}
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 0.78fr)',
              gap: 12,
              marginBottom: 18,
            }}>
              <div style={{ display: 'flex', gap: 8, overflowX: 'auto', scrollbarWidth: 'none' }}>
                {categories.map((category) => {
                  const active = selectedCategory === category
                  return (
                    <button key={category} type="button" onClick={() => setSelectedCategory(category)} style={{
                      height: 36,
                      padding: '0 12px',
                      borderRadius: 8,
                      border: active ? '1px solid rgba(14,245,194,0.32)' : '1px solid rgba(255,255,255,0.07)',
                      background: active ? 'rgba(14,245,194,0.10)' : 'rgba(255,255,255,0.035)',
                      color: active ? '#0ef5c2' : '#9AA6B8',
                      fontFamily: font,
                      fontSize: 12,
                      fontWeight: 900,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}>
                      {CATEGORY_META[category]?.label || category}
                    </button>
                  )
                })}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, overflowX: 'auto', scrollbarWidth: 'none' }}>
                {views.map((view) => {
                  const active = selectedView === view.id
                  return (
                    <button key={view.id} type="button" onClick={() => setSelectedView(view.id)} style={{
                      height: 36,
                      padding: '0 12px',
                      borderRadius: 8,
                      border: active ? '1px solid rgba(255,255,255,0.14)' : '1px solid rgba(255,255,255,0.06)',
                      background: active ? 'rgba(255,255,255,0.075)' : 'rgba(255,255,255,0.025)',
                      color: active ? '#F7FAFC' : '#7E8797',
                      fontFamily: font,
                      fontSize: 12,
                      fontWeight: 900,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}>
                      {view.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {selectedCard && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: '64px minmax(0, 1fr) auto',
                gap: 13,
                alignItems: 'center',
                borderRadius: 8,
                padding: 14,
                marginBottom: 18,
                background: 'rgba(255,255,255,0.045)',
                border: `1px solid ${selectedCard.earned ? `${selectedTone.accent}42` : 'rgba(255,255,255,0.08)'}`,
                boxShadow: selectedCard.earned ? `0 0 28px ${selectedTone.glow}` : 'none',
              }}>
                <div style={{
                  width: 64,
                  height: 64,
                  borderRadius: 8,
                  display: 'grid',
                  placeItems: 'center',
                  background: selectedCard.earned ? selectedTone.plate : 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.10)',
                }}>
                  <IconGlyph name={selectedCard.earned ? selectedCard.icon : 'lock'} size={28} strokeWidth={2.2} color={selectedCard.earned ? '#061014' : '#7E8797'} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ color: selectedTone.accent, fontSize: 10, fontWeight: 950, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>
                    {selectedCard.source}
                  </div>
                  <div style={{ color: '#F7FAFC', fontSize: 20, fontWeight: 950, letterSpacing: '-0.4px', overflowWrap: 'anywhere' }}>
                    {selectedCard.earned ? selectedCard.title : 'Locked card'}
                  </div>
                  <div style={{ color: '#9AA6B8', fontSize: 13, fontWeight: 700, lineHeight: 1.5, marginTop: 4 }}>
                    {selectedCard.description}
                  </div>
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: 90,
                  height: 34,
                  borderRadius: 8,
                  background: selectedCard.earned ? `${selectedTone.accent}18` : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${selectedCard.earned ? `${selectedTone.accent}36` : 'rgba(255,255,255,0.08)'}`,
                  color: selectedCard.earned ? selectedTone.accent : '#8B8D98',
                  fontSize: 11,
                  fontWeight: 950,
                  textTransform: 'uppercase',
                  letterSpacing: 0.8,
                }}>
                  {selectedCard.earned ? 'Collected' : 'Locked'}
                </div>
              </div>
            )}

            {sortedCards.length > 0 ? (
              <div className="card-collection-grid">
                {sortedCards.map((card, index) => (
                  <SkillCard
                    key={card.id}
                    card={card}
                    selected={selectedCard?.id === card.id}
                    onSelect={setSelectedCardId}
                    delay={index * 0.035}
                  />
                ))}
              </div>
            ) : (
              <div style={{
                borderRadius: 8,
                padding: '30px 18px',
                border: '1px dashed rgba(255,255,255,0.13)',
                background: 'rgba(255,255,255,0.025)',
                textAlign: 'center',
              }}>
                <div style={{ color: '#F7FAFC', fontSize: 15, fontWeight: 900, marginBottom: 6 }}>No cards in this view</div>
                <div style={{ color: '#8B8D98', fontSize: 13, fontWeight: 700 }}>Switch filters or complete a learning task to collect more.</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
