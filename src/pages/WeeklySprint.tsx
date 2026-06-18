import { useMemo } from 'react'
import { RevisionGame } from '../components/RevisionGame'
import { useVocab } from '../data/useVocab'
import { useStore } from '../store/useStore'
import { latestLessonTag } from '../utils/lessons'
import { allBasicsVocab } from '../data/basics'
import { cultureVocab } from '../data/culture'
import type { CultureSprintMode } from '../store/useStore'

export function WeeklySprint() {
  const allVocab = useVocab()
  const reviewWord = useStore((s) => s.reviewWord)
  const includeBasics = useStore((s) => s.includeBasicsInSprint)
  const setIncludeBasics = useStore((s) => s.setIncludeBasicsInSprint)
  const culture = useStore((s) => s.cultureInSprint)
  const setCulture = useStore((s) => s.setCultureInSprint)

  // The Weekly Sprint drills the newest lesson — optionally folding in the
  // Basics words, plus the Spain/Valencia culture deck which can either be
  // mixed into your own words or practised on its own.
  const sprintVocab = useMemo(() => {
    // 'only' → culture facts by themselves, no personal words.
    if (culture === 'only') return cultureVocab()

    const latest = latestLessonTag(allVocab)
    const lessonVocab = latest ? allVocab.filter((v) => v.tags.includes(latest)) : allVocab
    const seen = new Set(lessonVocab.map((v) => v.id))
    // Dedupe by id so a word that lives in two decks isn't drilled twice.
    const deck = [...lessonVocab]
    if (includeBasics) {
      for (const v of allBasicsVocab()) if (!seen.has(v.id)) { seen.add(v.id); deck.push(v) }
    }
    if (culture === 'mix') {
      for (const v of cultureVocab()) if (!seen.has(v.id)) { seen.add(v.id); deck.push(v) }
    }
    return deck
  }, [allVocab, includeBasics, culture])

  const deckLabel =
    culture === 'only' ? 'culture facts'
    : culture === 'mix' ? (includeBasics ? 'cards (week + basics + culture)' : 'cards (week + culture)')
    : includeBasics ? 'words (week + basics)' : 'words this week'

  const cultureOptions: { id: CultureSprintMode; label: string }[] = [
    { id: 'off', label: 'Off' },
    { id: 'mix', label: 'Mix in' },
    { id: 'only', label: 'Only' },
  ]

  return (
    <RevisionGame
      title="Campaign 1: The Weekly Sprint"
      icon="📅"
      vocab={sprintVocab}
      deckLabel={deckLabel}
      exitTo="/"
      onWordResult={reviewWord}
      headerSlot={
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '8px 0', borderBottom: '1px solid var(--color-button-shadow)', marginBottom: '4px' }}>
          <label
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              fontSize: '12px', color: culture === 'only' ? '#666' : '#bbb',
              cursor: culture === 'only' ? 'default' : 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={includeBasics}
              disabled={culture === 'only'}
              onChange={(e) => setIncludeBasics(e.target.checked)}
            />
            ➕ Also revise Basics words
          </label>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#bbb' }}>
            <span style={{ flexShrink: 0 }}>📜 Spain &amp; Valencia culture:</span>
            <div style={{ display: 'flex', gap: '4px' }}>
              {cultureOptions.map((o) => (
                <button
                  key={o.id}
                  className={`xp-btn${culture === o.id ? ' xp-btn-primary' : ''}`}
                  style={{ fontSize: '11px', minWidth: 'auto', padding: '3px 10px' }}
                  onClick={() => setCulture(o.id)}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
          <p style={{ fontSize: '11px', color: '#777', margin: 0 }}>
            {culture === 'only'
              ? 'Practising Spain & Valencia history on its own.'
              : culture === 'mix'
                ? 'History facts mixed in with your own words.'
                : 'Turn on to learn Spanish through Spain & Valencia history.'}
          </p>
        </div>
      }
    />
  )
}
