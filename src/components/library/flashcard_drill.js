'use client'

import { useMemo, useState } from 'react'
import styles from './ComponentLibrary.module.css'
import { componentSignalSchema, flashcardDrillParamsSchema } from './schemas'

function FlashcardDrill({ params, emitSignal, markInteraction, completedSignal }) {
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [ratings, setRatings] = useState([])
  const card = params.cards[index]
  const averageRating = useMemo(() => {
    if (ratings.length === 0) return 0
    return ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length
  }, [ratings])

  const flip = () => {
    markInteraction()
    setFlipped(true)
  }

  const rate = (rating) => {
    if (completedSignal) return
    markInteraction()
    const nextRatings = [...ratings, rating]
    setRatings(nextRatings)
    if (index >= params.cards.length - 1) {
      const confidence = nextRatings.reduce((sum, item) => sum + item, 0) / nextRatings.length
      emitSignal({
        correct: null,
        confidence,
        attempts: nextRatings.length,
        hintsUsed: 0,
        rawResponse: {
          ratings: params.cards.map((ratedCard, cardIndex) => ({
            front: ratedCard.front,
            rating: nextRatings[cardIndex] ?? null,
          })),
        },
      })
      return
    }
    setIndex(index + 1)
    setFlipped(false)
  }

  return (
    <div className={styles.stack}>
      <div className={styles.muted}>Card {Math.min(index + 1, params.cards.length)} of {params.cards.length}</div>
      <button className={styles.flashcard} disabled={Boolean(completedSignal)} onClick={flipped ? undefined : flip}>
        {flipped ? card.back : card.front}
      </button>
      <div className={styles.buttonRow}>
        {!flipped ? (
          <button className={`${styles.button} ${styles.primaryButton}`} disabled={Boolean(completedSignal)} onClick={flip}>Flip</button>
        ) : (
          <>
            <button className={styles.button} disabled={Boolean(completedSignal)} onClick={() => rate(0)}>Didn&apos;t know</button>
            <button className={`${styles.button} ${styles.primaryButton}`} disabled={Boolean(completedSignal)} onClick={() => rate(1)}>Knew it</button>
          </>
        )}
        {ratings.length > 0 ? <span className={styles.muted}>Confidence so far: {Math.round(averageRating * 100)}%</span> : null}
      </div>
    </div>
  )
}

const flashcardDrillComponent = {
  type: 'flashcard_drill',
  paramsSchema: flashcardDrillParamsSchema,
  signalSchema: componentSignalSchema,
  generatorPrompt: 'flashcardDrill_v1',
  render: FlashcardDrill,
}

export default flashcardDrillComponent
