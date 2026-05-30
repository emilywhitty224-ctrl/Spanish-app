import type { SrsEntry } from '../store/useStore'
import type { VocabularyItem } from '../types/vocabulary'

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

/**
 * Pick `n` words to study, prioritising:
 *   1. Overdue / due today (oldest nextReview first)
 *   2. Never-seen (new) words
 *   3. Upcoming reviews (soonest first)
 * Each bucket is shuffled internally so consecutive rounds don't repeat.
 */
export function pickDueFirst(
  vocab: VocabularyItem[],
  srs: Record<string, SrsEntry>,
  n: number,
): VocabularyItem[] {
  if (vocab.length === 0) return []
  const t = today()
  const due: VocabularyItem[] = []
  const fresh: VocabularyItem[] = []
  const upcoming: { item: VocabularyItem; review: string }[] = []

  for (const v of vocab) {
    const entry = srs[v.id]
    if (!entry) fresh.push(v)
    else if (entry.nextReview <= t) due.push(v)
    else upcoming.push({ item: v, review: entry.nextReview })
  }

  const dueSorted = [...due].sort((a, b) =>
    (srs[a.id]?.nextReview ?? '').localeCompare(srs[b.id]?.nextReview ?? ''),
  )
  const upcomingSorted = upcoming
    .sort((a, b) => a.review.localeCompare(b.review))
    .map((x) => x.item)

  const picked: VocabularyItem[] = []
  for (const bucket of [shuffle(dueSorted), shuffle(fresh), upcomingSorted]) {
    for (const v of bucket) {
      if (picked.length >= n) break
      picked.push(v)
    }
    if (picked.length >= n) break
  }
  return picked
}

/**
 * Sort vocab by weakness: lowest accuracy first, then most-seen as tiebreaker.
 * Unseen words are excluded (you can't be weak at a word you've never met).
 */
export function weakestFirst(
  vocab: VocabularyItem[],
  srs: Record<string, SrsEntry>,
): VocabularyItem[] {
  return vocab
    .map((v) => {
      const e = srs[v.id]
      const seen = e?.seen ?? 0
      const correct = e?.correct ?? 0
      return { v, seen, accuracy: seen > 0 ? correct / seen : 1 }
    })
    .filter((x) => x.seen > 0)
    .sort((a, b) => a.accuracy - b.accuracy || b.seen - a.seen)
    .map((x) => x.v)
}
