import { useMemo } from 'react'
import { RevisionGame } from '../components/RevisionGame'
import { useVocab } from '../data/useVocab'
import { useStore } from '../store/useStore'
import { latestLessonTag } from '../utils/lessons'

export function PreLessonBlitz() {
  const allVocab = useVocab()
  const reviewWord = useStore((s) => s.reviewWord)

  const vocab = useMemo(() => {
    const latest = latestLessonTag(allVocab)
    return latest ? allVocab.filter((v) => v.tags.includes(latest)) : allVocab
  }, [allVocab])

  return (
    <RevisionGame
      title="Pre-Lesson Blitz"
      icon="⚡"
      vocab={vocab}
      deckLabel="words from your last lesson"
      exitTo="/dashboard"
      onWordResult={reviewWord}
      autoStart="mixed"
    />
  )
}
