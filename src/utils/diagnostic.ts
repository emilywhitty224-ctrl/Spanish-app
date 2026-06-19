// Adaptive entry-test engine for the A1 course.
//
// The syllabus is dependency-ordered, so we don't quiz every unit — we run a
// binary search over the ordered units to find the "frontier": the first unit
// the learner can't yet pass. Everything before it is assumed known (and gets
// its words seeded into SRS); the frontier becomes their current unit; the rest
// stays locked.
//
// A short self-report ("how much Spanish do you have?") just sets where the
// search starts probing, so it converges in fewer questions.

import { A1_UNITS_ORDERED, unitVocab, type A1Unit } from '../data/a1Course'

export interface TestQuestion {
  unitId: string
  prompt: string
  sub?: string
  answer: string
  options: string[] // shuffled, includes answer
}

export type StartLevel = 'new' | 'some' | 'lots'

// How many questions per unit, and the share correct needed to "pass" a unit.
const QUESTIONS_PER_UNIT = 3
const PASS_RATIO = 0.6 // ≥2 of 3
// Hard cap so the test can't drag on if answers are inconsistent.
export const MAX_UNITS_PROBED = 6

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// Auto-generate recognition questions from a unit's words (Spanish → English).
function autoQuestions(unit: A1Unit, count: number): TestQuestion[] {
  const words = unitVocab(unit)
  if (words.length < 2) return []
  const pool = shuffle(words)
  const out: TestQuestion[] = []
  for (const w of pool) {
    if (out.length === count) break
    const distractors = shuffle(words.filter((x) => x.english_translation !== w.english_translation))
      .slice(0, 3)
      .map((x) => x.english_translation)
    if (distractors.length < 3) continue
    out.push({
      unitId: unit.id,
      prompt: w.spanish_word,
      sub: 'What does this mean?',
      answer: w.english_translation,
      options: shuffle([w.english_translation, ...distractors]),
    })
  }
  return out
}

// The question set for one unit: authored probes first, topping up with
// auto-generated vocab questions when there aren't enough.
export function questionsForUnit(unit: A1Unit, count = QUESTIONS_PER_UNIT): TestQuestion[] {
  const authored: TestQuestion[] = shuffle(unit.probes ?? []).map((p) => ({
    unitId: unit.id,
    prompt: p.prompt,
    sub: p.sub,
    answer: p.answer,
    options: shuffle(p.options),
  }))
  if (authored.length >= count) return authored.slice(0, count)
  const filler = autoQuestions(unit, count - authored.length)
  return [...authored, ...filler]
}

// ── Adaptive search state ────────────────────────────────────────────────────
// `lo` = index of the highest unit known to PASS (-1 = none yet).
// `hi` = index of the lowest unit known to FAIL (units.length = none yet).
// The frontier we're hunting is the first failing unit, i.e. final `hi`.

export interface DiagState {
  lo: number
  hi: number
  probed: number // units probed so far (for the cap)
  currentIndex: number // unit index being probed now
}

const UNIT_COUNT = A1_UNITS_ORDERED.length

function startIndexFor(level: StartLevel): number {
  if (level === 'new') return 0
  if (level === 'some') return Math.floor(UNIT_COUNT / 3) // ~unit 5
  return Math.floor((UNIT_COUNT * 2) / 3) // ~unit 9
}

export function initDiagnostic(level: StartLevel): DiagState {
  return { lo: -1, hi: UNIT_COUNT, probed: 0, currentIndex: startIndexFor(level) }
}

export function currentUnit(state: DiagState): A1Unit {
  return A1_UNITS_ORDERED[state.currentIndex]
}

// Fold one unit's result into the search and pick the next unit to probe.
// Returns the next state, or `done: true` with the frontier index resolved.
export function advance(
  state: DiagState,
  correct: number,
  total: number,
): { state: DiagState; done: boolean; frontier: number } {
  const passed = total > 0 && correct / total >= PASS_RATIO
  let { lo, hi } = state
  const i = state.currentIndex
  if (passed) lo = Math.max(lo, i)
  else hi = Math.min(hi, i)

  const probed = state.probed + 1
  // Done when the frontier is pinned (no gap between known-pass and known-fail)
  // or we've hit the probe cap.
  if (lo + 1 >= hi || probed >= MAX_UNITS_PROBED) {
    return { state: { lo, hi, probed, currentIndex: i }, done: true, frontier: hi }
  }
  // Probe the midpoint of the remaining gap.
  const next = Math.floor((lo + hi) / 2)
  return { state: { lo, hi, probed, currentIndex: next }, done: false, frontier: hi }
}

export interface DiagOutcome {
  knownUnitIds: string[] // units before the frontier — mark done + seed SRS
  currentUnitId: string | null // the frontier unit — where they start
  lockedUnitIds: string[] // everything after the frontier
}

// Turn a resolved frontier index into per-unit outcomes.
export function resolveOutcome(frontier: number): DiagOutcome {
  const f = Math.max(0, Math.min(frontier, UNIT_COUNT))
  return {
    knownUnitIds: A1_UNITS_ORDERED.slice(0, f).map((u) => u.id),
    currentUnitId: f < UNIT_COUNT ? A1_UNITS_ORDERED[f].id : null,
    lockedUnitIds: A1_UNITS_ORDERED.slice(f + 1).map((u) => u.id),
  }
}
