import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { VocabularyItem } from '../types/vocabulary'

export type AiProvider = 'gemini' | 'anthropic'

// Difficulty band: 1 = starter, 2 = core, 3 = advanced. Mirrors the optional
// `difficulty` on VocabularyItem.
export type DifficultyBand = 1 | 2 | 3

// How the learner started out. `null` means they haven't been placed yet, so
// the app should offer the placement screen (self-select or diagnostic).
export type Placement = 'scratch' | 'medium' | 'hard'

export interface DifficultySettings {
  placement: Placement | null
  unlockedBand: DifficultyBand // highest word band currently in play
  modeTier: DifficultyBand // highest exercise tier unlocked
}

// Band/tier each placement starts at. The auto-ramp (later phase) only ever
// raises these.
const PLACEMENT_DEFAULTS: Record<Placement, { unlockedBand: DifficultyBand; modeTier: DifficultyBand }> = {
  scratch: { unlockedBand: 1, modeTier: 1 },
  medium: { unlockedBand: 2, modeTier: 2 },
  hard: { unlockedBand: 3, modeTier: 3 },
}

// Brand-new learner: assume they know nothing (accessible to someone who has
// never learnt numbers). `placement: null` lets the app prompt for placement.
const starterDifficulty = (): DifficultySettings => ({
  placement: null,
  unlockedBand: 1,
  modeTier: 1,
})

// Existing learners migrated from the old two-profile data start at medium so
// they don't suddenly lose access to words they already knew.
const migratedDifficulty = (): DifficultySettings => ({
  placement: 'medium',
  ...PLACEMENT_DEFAULTS.medium,
})

export interface ProfileStats {
  totalCorrect: number
  totalAnswered: number
  streak: number
  lastPlayed: string | null // YYYY-MM-DD
  bestScores: Record<string, number> // mode id -> best percentage (0-100)
}

export interface SrsMistake {
  typed: string
  expected: string
  when: number // epoch ms
}

export interface SrsEntry {
  mastery: number // 0-5
  nextReview: string // YYYY-MM-DD
  seen?: number // total times answered
  correct?: number // total correct
  lastSeen?: string // YYYY-MM-DD of last review
  mistakes?: SrsMistake[] // ring buffer, capped at MISTAKE_BUFFER
}

const MISTAKE_BUFFER = 5

// Days until next review, indexed by mastery level (0-5).
const SRS_INTERVALS = [1, 1, 3, 7, 16, 35]

function addDays(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

const emptyStats = (): ProfileStats => ({
  totalCorrect: 0,
  totalAnswered: 0,
  streak: 0,
  lastPlayed: null,
  bestScores: {},
})

function todayKey(): string {
  return new Date().toISOString().slice(0, 10)
}

function daysBetween(a: string, b: string): number {
  const ms = new Date(b + 'T00:00:00Z').getTime() - new Date(a + 'T00:00:00Z').getTime()
  return Math.round(ms / 86_400_000)
}

// ── Migration helpers ──────────────────────────────────────────────────────
// v1 kept stats and srs keyed by user profile ('Emily' | 'Jocelyn'). We now
// have a single learner per device/account, so collapse any profile maps into
// one record. Both helpers are tolerant of missing/partial data.

function mergeStats(all: ProfileStats[]): ProfileStats {
  const merged = emptyStats()
  for (const s of all) {
    if (!s) continue
    merged.totalCorrect += s.totalCorrect ?? 0
    merged.totalAnswered += s.totalAnswered ?? 0
    merged.streak = Math.max(merged.streak, s.streak ?? 0)
    if (s.lastPlayed && (!merged.lastPlayed || s.lastPlayed > merged.lastPlayed)) {
      merged.lastPlayed = s.lastPlayed
    }
    for (const [mode, pct] of Object.entries(s.bestScores ?? {})) {
      if (pct > (merged.bestScores[mode] ?? 0)) merged.bestScores[mode] = pct
    }
  }
  return merged
}

function mergeSrs(all: Record<string, SrsEntry>[]): Record<string, SrsEntry> {
  const merged: Record<string, SrsEntry> = {}
  for (const profile of all) {
    if (!profile) continue
    for (const [wordId, entry] of Object.entries(profile)) {
      const prev = merged[wordId]
      // Keep the more-progressed record (higher mastery, then more reviews).
      if (
        !prev ||
        entry.mastery > prev.mastery ||
        (entry.mastery === prev.mastery && (entry.seen ?? 0) > (prev.seen ?? 0))
      ) {
        merged[wordId] = entry
      }
    }
  }
  return merged
}

// The shared learning data that syncs to Google Drive. Device preferences
// (voice, etc.) are intentionally excluded.
export interface SyncSnapshot {
  version: number
  updatedAt: string // ISO timestamp
  stats: ProfileStats
  customWords: VocabularyItem[]
  srs: Record<string, SrsEntry>
  difficulty: DifficultySettings
}

export const SYNC_VERSION = 2

// Bring any older Drive snapshot up to the current shape. v1 is keyed by
// profile name; v2 is the flat single-learner shape with difficulty.
export function migrateSnapshot(raw: any): SyncSnapshot {
  if (raw?.version >= 2) {
    return {
      version: SYNC_VERSION,
      updatedAt: raw.updatedAt ?? new Date().toISOString(),
      stats: raw.stats ?? emptyStats(),
      customWords: raw.customWords ?? [],
      srs: raw.srs ?? {},
      difficulty: raw.difficulty ?? migratedDifficulty(),
    }
  }
  // v1 (or unknown): collapse the per-profile maps into one learner.
  const statsMap = (raw?.stats ?? {}) as Record<string, ProfileStats>
  const srsMap = (raw?.srs ?? {}) as Record<string, Record<string, SrsEntry>>
  return {
    version: SYNC_VERSION,
    updatedAt: raw?.updatedAt ?? new Date().toISOString(),
    stats: mergeStats(Object.values(statsMap)),
    customWords: raw?.customWords ?? [],
    srs: mergeSrs(Object.values(srsMap)),
    difficulty: migratedDifficulty(),
  }
}

interface AppState {
  voiceURI: string | null
  speechRate: number
  aiProvider: AiProvider
  aiApiKey: string | null
  skipWarmup: boolean
  strictAccents: boolean
  includeBasicsInSprint: boolean
  stats: ProfileStats
  customWords: VocabularyItem[]
  srs: Record<string, SrsEntry>
  difficulty: DifficultySettings
  setVoiceURI: (uri: string | null) => void
  setSpeechRate: (rate: number) => void
  setAiProvider: (provider: AiProvider) => void
  setAiApiKey: (key: string | null) => void
  setSkipWarmup: (skip: boolean) => void
  setStrictAccents: (strict: boolean) => void
  setIncludeBasicsInSprint: (include: boolean) => void
  setPlacement: (placement: Placement) => void
  setDifficulty: (partial: Partial<DifficultySettings>) => void
  recordResult: (mode: string, correct: number, total: number) => void
  addCustomWord: (word: VocabularyItem) => void
  removeCustomWord: (id: string) => void
  toggleActiveUse: (id: string) => void
  reviewWord: (wordId: string, remembered: boolean, mistake?: { typed: string; expected: string }) => void
  clearMistakesForWord: (wordId: string) => void
  getSnapshot: () => SyncSnapshot
  applySnapshot: (snapshot: SyncSnapshot) => void
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      voiceURI: null,
      speechRate: 0.9,
      aiProvider: 'gemini',
      aiApiKey: null,
      skipWarmup: false,
      strictAccents: false,
      includeBasicsInSprint: false,
      stats: emptyStats(),
      customWords: [],
      srs: {},
      difficulty: starterDifficulty(),

      setVoiceURI: (uri) => set({ voiceURI: uri }),
      setSpeechRate: (rate) => set({ speechRate: rate }),
      setAiProvider: (provider) => set({ aiProvider: provider }),
      setAiApiKey: (key) => set({ aiApiKey: key }),
      setSkipWarmup: (skip) => set({ skipWarmup: skip }),
      setStrictAccents: (strict) => set({ strictAccents: strict }),
      setIncludeBasicsInSprint: (include) => set({ includeBasicsInSprint: include }),

      setPlacement: (placement) =>
        set({ difficulty: { placement, ...PLACEMENT_DEFAULTS[placement] } }),
      setDifficulty: (partial) =>
        set((state) => ({ difficulty: { ...state.difficulty, ...partial } })),

      recordResult: (mode, correct, total) =>
        set((state) => {
          const prev = state.stats ?? emptyStats()
          const today = todayKey()

          let streak = prev.streak
          if (prev.lastPlayed === null) {
            streak = 1
          } else if (prev.lastPlayed !== today) {
            streak = daysBetween(prev.lastPlayed, today) === 1 ? prev.streak + 1 : 1
          } else if (prev.streak === 0) {
            streak = 1
          }

          const pct = total > 0 ? Math.round((correct / total) * 100) : 0
          const bestScores = { ...prev.bestScores }
          if (pct > (bestScores[mode] ?? 0)) bestScores[mode] = pct

          return {
            stats: {
              totalCorrect: prev.totalCorrect + correct,
              totalAnswered: prev.totalAnswered + total,
              streak,
              lastPlayed: today,
              bestScores,
            },
          }
        }),

      addCustomWord: (word) =>
        set((state) => ({ customWords: [...state.customWords, word] })),

      removeCustomWord: (id) =>
        set((state) => ({ customWords: state.customWords.filter((w) => w.id !== id) })),

      toggleActiveUse: (id) =>
        set((state) => ({
          customWords: state.customWords.map((w) =>
            w.id === id ? { ...w, active_use: !w.active_use } : w
          ),
        })),

      reviewWord: (wordId, remembered, mistake) =>
        set((state) => {
          const profSrs = state.srs ?? {}
          const prev = profSrs[wordId]
          const prevMastery = prev?.mastery ?? 0
          const mastery = remembered
            ? Math.min(5, prevMastery + 1)
            : Math.max(0, prevMastery - 1)
          let mistakes = prev?.mistakes
          if (!remembered && mistake) {
            const next: SrsMistake = { ...mistake, when: Date.now() }
            mistakes = [...(mistakes ?? []), next].slice(-MISTAKE_BUFFER)
          }
          return {
            srs: {
              ...profSrs,
              [wordId]: {
                mastery,
                nextReview: addDays(SRS_INTERVALS[mastery]),
                seen: (prev?.seen ?? 0) + 1,
                correct: (prev?.correct ?? 0) + (remembered ? 1 : 0),
                lastSeen: todayKey(),
                ...(mistakes && mistakes.length > 0 ? { mistakes } : {}),
              },
            },
          }
        }),

      clearMistakesForWord: (wordId) =>
        set((state) => {
          const profSrs = state.srs ?? {}
          const prev = profSrs[wordId]
          if (!prev || !prev.mistakes || prev.mistakes.length === 0) return {}
          const { mistakes: _drop, ...rest } = prev
          return {
            srs: { ...profSrs, [wordId]: rest },
          }
        }),

      getSnapshot: () => {
        const s = get()
        return {
          version: SYNC_VERSION,
          updatedAt: new Date().toISOString(),
          stats: s.stats,
          customWords: s.customWords,
          srs: s.srs,
          difficulty: s.difficulty,
        }
      },

      applySnapshot: (snapshot) => {
        const migrated = migrateSnapshot(snapshot)
        set({
          stats: migrated.stats,
          customWords: migrated.customWords,
          srs: migrated.srs,
          difficulty: migrated.difficulty,
        })
      },
    }),
    {
      name: 'spanish-app-store',
      version: 2,
      // Migrate locally-persisted state from the old two-profile shape.
      migrate: (persisted: any, fromVersion: number) => {
        if (!persisted) return persisted
        if (fromVersion < 2) {
          const statsMap = (persisted.stats ?? {}) as Record<string, ProfileStats>
          const srsMap = (persisted.srs ?? {}) as Record<string, Record<string, SrsEntry>>
          persisted.stats = mergeStats(Object.values(statsMap))
          persisted.srs = mergeSrs(Object.values(srsMap))
          persisted.difficulty = persisted.difficulty ?? migratedDifficulty()
          delete persisted.userProfile
        }
        return persisted
      },
    }
  )
)
