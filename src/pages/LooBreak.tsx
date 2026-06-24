import { useMemo } from 'react'
import { RevisionGame } from '../components/RevisionGame'
import { useVocab } from '../data/useVocab'
import { useStore } from '../store/useStore'
import { weakestFirst } from '../utils/srs'
import type { VocabularyItem } from '../types/vocabulary'

const DECK_CAP = 14

// A quick two-minute drill for when you step away from your desk. The deck is a
// random topic stitched together with your weakest words, so each visit is a
// little different but still aimed at what you most need to review.
export function LooBreak() {
  const allVocab = useVocab()
  const reviewWord = useStore((s) => s.reviewWord)
  const srs = useStore((s) => s.srs ?? {})

  const vocab = useMemo(() => {
    // Count words per topic (ignore the per-lesson tags), then pick a random
    // topic — preferring ones with enough words so the deck never feels thin.
    const counts = new Map<string, number>()
    for (const v of allVocab) {
      for (const t of v.tags) {
        if (!t.startsWith('lesson_')) counts.set(t, (counts.get(t) ?? 0) + 1)
      }
    }
    const big = [...counts].filter(([, n]) => n >= 4).map(([t]) => t)
    const pool = big.length > 0 ? big : [...counts.keys()]
    const topic = pool.length > 0 ? pool[Math.floor(Math.random() * pool.length)] : null
    const topicWords = topic ? allVocab.filter((v) => v.tags.includes(topic)) : []

    // Your weakest seen words, regardless of topic.
    const weak = weakestFirst(allVocab, srs).slice(0, 8)

    // Weakest first so they're sure to make the cut, then top up from the topic.
    const seen = new Set<string>()
    const merged: VocabularyItem[] = []
    for (const v of [...weak, ...topicWords]) {
      if (!seen.has(v.id)) {
        seen.add(v.id)
        merged.push(v)
      }
    }
    const deck = merged.length > 0 ? merged : allVocab
    return deck.slice(0, DECK_CAP)
  }, [allVocab, srs])

  return (
    <RevisionGame
      title="Loo Break"
      icon="🚽"
      vocab={vocab}
      deckLabel="quick-break words"
      exitTo="/dashboard"
      onWordResult={reviewWord}
      autoStart="mixed"
      showStopwatch
      tapOnly
      stopwatchRecordKey="loo-break"
    />
  )
}
