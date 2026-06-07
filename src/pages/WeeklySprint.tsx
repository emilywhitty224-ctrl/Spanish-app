import { useMemo } from 'react'
import { RevisionGame } from '../components/RevisionGame'
import { useVocab } from '../data/useVocab'
import { useStore } from '../store/useStore'
import { latestLessonTag } from '../utils/lessons'

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
