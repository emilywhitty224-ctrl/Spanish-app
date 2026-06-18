import { useMemo, useState } from 'react'
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
  // Deck options stay tucked away so Barny owns the screen; auto-open only if
  // the learner already has a non-default deck on.
  const [showOpts, setShowOpts] = useState(includeBasics || culture !== 'off')

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
        <div style={{ fontSize: '11px', color: '#777', padding: '2px 0 4px' }}>
          <button
            onClick={() => setShowOpts((v) => !v)}
            style={{
              background: 'none', border: 'none', color: '#777', cursor: 'pointer',
              fontSize: '11px', padding: 0, fontFamily: 'inherit',
            }}
          >
            {showOpts ? '▾' : '▸'} Deck options
            {!showOpts && (includeBasics || culture !== 'off') && (
              <span style={{ color: 'var(--color-accent)', marginLeft: '6px' }}>
                {[includeBasics && '+Basics', culture !== 'off' && `Culture: ${culture}`].filter(Boolean).join(' · ')}
              </span>
            )}
          </button>

          {showOpts && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap', marginTop: '6px', opacity: 0.9 }}>
              <label
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '5px',
                  cursor: culture === 'only' ? 'default' : 'pointer',
                  color: culture === 'only' ? '#555' : '#888',
                }}
              >
                <input
                  type="checkbox"
                  checked={includeBasics}
                  disabled={culture === 'only'}
                  onChange={(e) => setIncludeBasics(e.target.checked)}
                  style={{ transform: 'scale(0.85)' }}
                />
                + Basics
              </label>

              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#888' }}>
                <span style={{ flexShrink: 0 }}>📜 Culture:</span>
                <span style={{ display: 'inline-flex', gap: '3px' }}>
                  {cultureOptions.map((o) => (
                    <button
                      key={o.id}
                      title={`Spain & Valencia history — ${o.label}`}
                      className={`xp-btn${culture === o.id ? ' xp-btn-primary' : ''}`}
                      style={{ fontSize: '10px', minWidth: 'auto', padding: '2px 8px' }}
                      onClick={() => setCulture(o.id)}
                    >
                      {o.label}
                    </button>
                  ))}
                </span>
              </span>
            </div>
          )}
        </div>
      }
    />
  )
}
