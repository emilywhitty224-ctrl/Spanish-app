// Difficulty helpers shared by the placement screen, the word-pool gating and
// the exercise-tier gating. Bands and tiers both use 1 = starter, 2 = core,
// 3 = advanced (see DifficultyBand in the store).

import type { DifficultyBand, Placement } from '../store/useStore'
import type { VocabularyItem } from '../types/vocabulary'

// The band a word belongs to. Untagged words count as band 1 so absolute
// beginners still see the bulk of the seed deck.
export function wordBand(item: VocabularyItem): DifficultyBand {
  return item.difficulty ?? 1
}

// Keep only words at or below the learner's unlocked band.
export function filterByBand(vocab: VocabularyItem[], unlockedBand: DifficultyBand): VocabularyItem[] {
  return vocab.filter((v) => wordBand(v) <= unlockedBand)
}

// Exercise tiers. Recognition first (tier 1), then recall (tier 2), then
// production (tier 3). Keyed by RevisionGame mode id.
export const MODE_TIER: Record<string, DifficultyBand> = {
  // Tier 1 — recognition
  mixed: 1,
  flashcard: 1,
  'multiple-choice': 1,
  matching: 1,
  memory: 1,
  // Tier 2 — recall
  'fill-in-the-blank': 2,
  reverse: 2,
  'true-false': 2,
  listening: 2,
  'gusta-drill': 2,
  // Tier 3 — production
  conjugation: 3,
  'speed-round': 3,
  'cloze-sentence': 3,
  dictation: 3,
  'word-order': 3,
}

// Is a mode available at the learner's current tier? Unknown modes default to
// tier 1 so nothing is accidentally hidden.
export function isModeUnlocked(modeId: string, tier: DifficultyBand): boolean {
  return (MODE_TIER[modeId] ?? 1) <= tier
}

// Copy for the three placement cards on the placement screen.
export const PLACEMENT_OPTIONS: {
  id: Placement
  icon: string
  label: string
  blurb: string
}[] = [
  {
    id: 'scratch',
    icon: '🌱',
    label: 'Start from scratch',
    blurb: 'Assume I know nothing. Begin with the core words and gentle recognition games, then build up.',
  },
  {
    id: 'medium',
    icon: '🌿',
    label: 'I know some Spanish',
    blurb: 'Skip the very basics. Mix in recall games and a wider set of words.',
  },
  {
    id: 'hard',
    icon: '🌳',
    label: 'I’m confident',
    blurb: 'Everything unlocked — advanced words, typing and listening challenges, strict accents.',
  },
]
