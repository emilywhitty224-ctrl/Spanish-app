import { useMemo } from 'react'
import { RevisionGame } from '../components/RevisionGame'
import { useVocab } from '../data/useVocab'
import { useStore } from '../store/useStore'

// Pick the most recent lesson tag (format: lesson_DD_MM_YY).
function latestLessonTag(vocab: { tags: string[] }[]): string | null {
  let best: string | null = null
  let bestKey = ''
  vocab.forEach((v) =>
    v.tags.forEach((t) => {
      if (!t.startsWith('lesson_')) return
      const [, dd, mm, yy] = t.split('_')
      const key = `${yy}${mm}${dd}`
      if (key > bestKey) {
        bestKey = key
        best = t
      }
    })
  )
  return best
}

export function WeeklySprint() {
  const allVocab = useVocab()
  const reviewWord = useStore((s) => s.reviewWord)

  // The Weekly Sprint drills only the newest lesson.
  const weeklyVocab = useMemo(() => {
    const latest = latestLessonTag(allVocab)
    return latest ? allVocab.filter((v) => v.tags.includes(latest)) : allVocab
  }, [allVocab])

  return (
    <RevisionGame
      title="Campaign 1: The Weekly Sprint"
      icon="📅"
      vocab={weeklyVocab}
      deckLabel="words this week"
      exitTo="/"
      onWordResult={reviewWord}
    />
  )
}
