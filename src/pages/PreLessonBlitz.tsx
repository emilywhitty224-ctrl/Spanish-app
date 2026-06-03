import { useMemo } from 'react'
import { RevisionGame } from '../components/RevisionGame'
import { useVocab } from '../data/useVocab'
import { useStore } from '../store/useStore'

function latestLessonTag(vocab: { tags: string[] }[]): string | null {
  let best: string | null = null
  let bestKey = ''
  vocab.forEach((v) =>
    v.tags.forEach((t) => {
      if (!t.startsWith('lesson_')) return
      const [, dd, mm, yy] = t.split('_')
      const key = `${yy}${mm}${dd}`
      if (key > bestKey) { bestKey = key; best = t }
    })
  )
  return best
}

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
