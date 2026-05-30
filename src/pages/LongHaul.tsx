import { RevisionGame } from '../components/RevisionGame'
import { useVocab } from '../data/useVocab'
import { useStore } from '../store/useStore'

export function LongHaul() {
  const allVocab = useVocab()
  const reviewWord = useStore((s) => s.reviewWord)

  // The Long Haul draws from the entire deck (every lesson) and feeds each
  // answer into the spaced-repetition tracker so reviews get scheduled.
  return (
    <RevisionGame
      title="Campaign 2: The Long Haul"
      icon="🧠"
      vocab={allVocab}
      deckLabel="words in your deck"
      exitTo="/"
      onWordResult={reviewWord}
    />
  )
}
