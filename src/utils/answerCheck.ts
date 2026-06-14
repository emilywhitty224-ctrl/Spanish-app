// Accent-insensitive answer comparison with typo tolerance.

import type { VocabularyItem } from '../types/vocabulary'
import synonymsData from '../data/synonyms.json'

const SYNONYMS = synonymsData as Record<string, string[]>

/**
 * Like checkAnswer, but augments the expected English translation with any
 * curated synonyms for this vocab item. Use for Spanish-prompt → English-typed
 * grading (otherwise pretty/beautiful/nice trip the learner up).
 */
export function checkAnswerForWord(typed: string, item: VocabularyItem, strictAccents = false): AnswerVerdict {
  const extras = SYNONYMS[item.id]
  const expected = extras && extras.length > 0
    ? [item.english_translation, ...extras].join(' / ')
    : item.english_translation
  return checkAnswer(typed, expected, strictAccents)
}

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

// Expand a single expected answer into all the variants we'll accept.
// Handles:
//   • parenthesised clarifications being optional, e.g. "I like (one thing)"
//     → ["I like", "I like one thing", "I like (one thing)"]
//   • interchangeable verb-phrase prefixes: "I X" ↔ "to X" ↔ bare "X"
//     so "to like multiple things" matches "I like (multiple things)".
//   • a leading "to be " / "to do " is treated the same as no prefix
//     (covers things like "to drink" vs "drink").
const LEADING_ARTICLE_RE = /^(the|a|an|my|el|la|los|las|un|una)\s+/i
const TRAILING_PRONOUN_RE = /\s+(me|it|them)$/i

function expandVariants(raw: string): string[] {
  const out = new Set<string>()
  // 1. Parenthesised parts: keep, drop, or unwrap.
  const withParens = raw
  const withoutParens = raw.replace(/\s*\([^)]*\)/g, '').replace(/\s+/g, ' ').trim()
  const unwrappedParens = raw.replace(/[()]/g, '').replace(/\s+/g, ' ').trim()
  for (const v of [withParens, withoutParens, unwrappedParens]) {
    if (!v) continue
    out.add(v)
    // 2. Verb-prefix swaps.
    const lower = v.toLowerCase()
    if (lower.startsWith('i ')) {
      const rest = v.slice(2)
      out.add(rest)
      out.add('to ' + rest)
    } else if (lower.startsWith('to ')) {
      const rest = v.slice(3)
      out.add(rest)
      out.add('I ' + rest)
    } else {
      out.add('to ' + v)
      out.add('I ' + v)
    }
  }
  // 3. Leading article + trailing pronoun trims, applied across everything so far.
  for (const v of [...out]) {
    const noArticle = v.replace(LEADING_ARTICLE_RE, '').trim()
    if (noArticle && noArticle !== v) out.add(noArticle)
    const noPronoun = v.replace(TRAILING_PRONOUN_RE, '').trim()
    if (noPronoun && noPronoun !== v) out.add(noPronoun)
    const both = v.replace(LEADING_ARTICLE_RE, '').replace(TRAILING_PRONOUN_RE, '').trim()
    if (both && both !== v) out.add(both)
  }
  return [...out]
}

// Strips diacritics for an accent-blind compare.
function stripAccents(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '')
}

// If `typed` matches `candidate` ignoring accents but not when accents are kept,
// returns a short nudge naming the missing accented character. Otherwise null.
export function accentNudge(typed: string, candidate: string): string | null {
  const tLow = typed.toLowerCase().normalize('NFC')
  const cLow = candidate.toLowerCase().normalize('NFC')
  if (tLow === cLow) return null
  if (stripAccents(tLow) !== stripAccents(cLow)) return null
  // Find the first character in candidate that carries a diacritic missing in typed.
  for (const ch of cLow) {
    const bare = stripAccents(ch)
    if (bare !== ch) return `Don't forget the accent on ${ch}.`
  }
  return 'Watch the accent.'
}

// Common English suffixes that turn one accepted answer into a familiar variant
// of the same word — diminutives and plurals. Lets "auntie" pass for "aunt",
// "doggy" for "dog", "cats" for "cat", etc.
const VARIANT_SUFFIXES = new Set(['s', 'es', 'ie', 'ies', 'y', 'ey', 'gy', 'my'])

// True when `a` and `b` are the same word save for one of the variant suffixes
// above (in either direction). Both must share a stem of at least 3 letters so
// short words like "car"/"cars" don't bleed into unrelated words.
function isVariant(a: string, b: string): boolean {
  if (a === b) return false
  const [short, long] = a.length <= b.length ? [a, b] : [b, a]
  if (short.length < 3 || !long.startsWith(short)) return false
  return VARIANT_SUFFIXES.has(long.slice(short.length))
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
export function checkAnswer(typed: string, expected: string, strictAccents = false): AnswerVerdict {
  const t = normalize(typed)
  if (!t) return 'wrong'
  const candidates = expected
    .split('/')
    .flatMap((s) => expandVariants(s.trim()))
    .map((s) => normalize(s))
    .filter(Boolean)
  let bestDist = Infinity
  let lenient = false
  for (const c of candidates) {
    if (t === c) {
      if (strictAccents) {
        // Accent-sensitive recheck against the original (un-stripped) variants.
        const accentPerfect = expected
          .split('/')
          .flatMap((s) => expandVariants(s.trim()))
          .some((raw) => raw.toLowerCase().normalize('NFC') === typed.toLowerCase().normalize('NFC'))
        if (!accentPerfect) return 'almost'
      }
      return 'correct'
    }
    bestDist = Math.min(bestDist, levenshtein(t, c))
    if (isVariant(t, c)) lenient = true
  }
  // Only forgive one-character typos on reasonably-long answers, else
  // single-letter words like "a" vs "o" would all read as "almost".
  const minLen = Math.min(...candidates.map((c) => c.length))
  if (bestDist <= 1 && minLen >= 4) return 'almost'
  // A close diminutive/plural of the right word counts too — we'll nudge them
  // toward the standard form rather than marking it wrong outright.
  if (lenient) return 'almost'
  return 'wrong'
}

/**
 * Picks the right one-line note to show alongside an 'almost' verdict.
 *   • accent slip  → name the missing accent
 *   • close variant → gently point at the standard form
 *   • otherwise    → it was a spelling typo
 * `showAnswer` says whether the caller should print the correct answer after.
 */
export function almostMessage(typed: string, answer: string): { msg: string; showAnswer: boolean } {
  const accent = accentNudge(typed, answer)
  if (accent) return { msg: accent, showAnswer: false }
  const t = normalize(typed)
  const candidates = answer
    .split('/')
    .flatMap((s) => expandVariants(s.trim()))
    .map((s) => normalize(s))
    .filter(Boolean)
  if (candidates.some((c) => isVariant(t, c))) {
    return { msg: "That works! The more standard answer is", showAnswer: true }
  }
  return { msg: 'Almost — the correct spelling is', showAnswer: true }
}
