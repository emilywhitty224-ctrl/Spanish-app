import { useMemo } from 'react'
import { RevisionGame } from '../components/RevisionGame'
import { useVocab } from '../data/useVocab'
import { useStore } from '../store/useStore'
import { latestLessonTag } from '../utils/lessons'
import { allBasicsVocab } from '../data/basics'

export function WeeklySprint() {
  const allVocab = useVocab()
  const reviewWord = useStore((s) => s.reviewWord)
  const includeBasics = useStore((s) => s.includeBasicsInSprint)
  const setIncludeBasics = useStore((s) => s.setIncludeBasicsInSprint)

  // The Weekly Sprint drills only the newest lesson — optionally folding in the
  // Basics words too, so you can revise both at once when you want to.
  const weeklyVocab = useMemo(() => {
    const latest = latestLessonTag(allVocab)
    const lessonVocab = latest ? allVocab.filter((v) => v.tags.includes(latest)) : allVocab
    if (!includeBasics) return lessonVocab
    // Dedupe by id so a word that lives in both decks isn't drilled twice.
    const seen = new Set(lessonVocab.map((v) => v.id))
    return [...lessonVocab, ...allBasicsVocab().filter((v) => !seen.has(v.id))]
  }, [allVocab, includeBasics])

  return (
    <RevisionGame
      title="Campaign 1: The Weekly Sprint"
      icon="📅"
      vocab={weeklyVocab}
      deckLabel={includeBasics ? 'words (week + basics)' : 'words this week'}
      exitTo="/"
      onWordResult={reviewWord}
      headerSlot={
        <label
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            fontSize: '12px', color: '#bbb', cursor: 'pointer',
            padding: '8px 0', borderBottom: '1px solid var(--color-button-shadow)',
            marginBottom: '4px',
          }}
        >
          <input
            type="checkbox"
            checked={includeBasics}
            onChange={(e) => setIncludeBasics(e.target.checked)}
          />
          ➕ Also revise Basics words
        </label>
      }
    />
  )
}
