// Accent-insensitive answer comparison with typo tolerance.

export type AnswerVerdict = 'correct' | 'almost' | 'wrong'

const PUNCT_RE = /[¡¿!?.,;:"'()]+/g

export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip diacritics
    .replace(PUNCT_RE, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  if (a.length === 0) return b.length
  if (b.length === 0) return a.length
  const prev = new Array(b.length + 1)
  const curr = new Array(b.length + 1)
  for (let j = 0; j <= b.length; j++) prev[j] = j
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost)
    }
    for (let j = 0; j <= b.length; j++) prev[j] = curr[j]
  }
  return prev[b.length]
}

/**
 * Compare a user's typed answer against the expected answer.
 *   correct → exact match after normalisation (accents/punctuation forgiven)
 *   almost  → one typo (Levenshtein ≤1) on words ≥4 chars
 *   wrong   → anything else
 *
 * The expected answer may contain multiple acceptable forms separated by '/'
 * (e.g. "to be / to exist"); any match counts.
 */
export function checkAnswer(typed: string, expected: string): AnswerVerdict {
  const t = normalize(typed)
  if (!t) return 'wrong'
  const candidates = expected.split('/').map((s) => normalize(s)).filter(Boolean)
  let bestDist = Infinity
  for (const c of candidates) {
    if (t === c) return 'correct'
    bestDist = Math.min(bestDist, levenshtein(t, c))
  }
  // Only forgive one-character typos on reasonably-long answers, else
  // single-letter words like "a" vs "o" would all read as "almost".
  const minLen = Math.min(...candidates.map((c) => c.length))
  if (bestDist <= 1 && minLen >= 4) return 'almost'
  return 'wrong'
}
