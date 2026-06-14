import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { VocabularyItem } from '../types/vocabulary'

export type UserProfile = 'Emily' | 'Jocelyn'
export type Theme = 'WindowsXP' | 'Space' | 'Dinosaurs' | 'Sharks'
export type AiProvider = 'gemini' | 'anthropic'

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

// The shared, account-independent learning data that syncs to Google Drive.
// Device preferences (theme, voice, selected profile) are intentionally excluded.
export interface SyncSnapshot {
  version: number
  updatedAt: string // ISO timestamp
  stats: Record<UserProfile, ProfileStats>
  customWords: VocabularyItem[]
  srs: Record<UserProfile, Record<string, SrsEntry>>
}

export const SYNC_VERSION = 1

interface AppState {
  userProfile: UserProfile
  activeTheme: Theme
  voiceURI: string | null
  speechRate: number
  aiProvider: AiProvider
  aiApiKey: string | null
  skipWarmup: boolean
  strictAccents: boolean
  includeBasicsInSprint: boolean
  stats: Record<UserProfile, ProfileStats>
  customWords: VocabularyItem[]
  srs: Record<UserProfile, Record<string, SrsEntry>>
  setUserProfile: (user: UserProfile) => void
  setActiveTheme: (theme: Theme) => void
  setVoiceURI: (uri: string | null) => void
  setSpeechRate: (rate: number) => void
  setAiProvider: (provider: AiProvider) => void
  setAiApiKey: (key: string | null) => void
  setSkipWarmup: (skip: boolean) => void
  setStrictAccents: (strict: boolean) => void
  setIncludeBasicsInSprint: (include: boolean) => void
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
      userProfile: 'Emily',
      activeTheme: 'WindowsXP',
      voiceURI: null,
      speechRate: 0.9,
      aiProvider: 'gemini',
      aiApiKey: null,
      skipWarmup: false,
      strictAccents: false,
      includeBasicsInSprint: false,
      stats: { Emily: emptyStats(), Jocelyn: emptyStats() },
      customWords: [],
      srs: { Emily: {}, Jocelyn: {} },

      setUserProfile: (user) => set({ userProfile: user }),
      setActiveTheme: (theme) => set({ activeTheme: theme }),
      setVoiceURI: (uri) => set({ voiceURI: uri }),
      setSpeechRate: (rate) => set({ speechRate: rate }),
      setAiProvider: (provider) => set({ aiProvider: provider }),
      setAiApiKey: (key) => set({ aiApiKey: key }),
      setSkipWarmup: (skip) => set({ skipWarmup: skip }),
      setStrictAccents: (strict) => set({ strictAccents: strict }),
      setIncludeBasicsInSprint: (include) => set({ includeBasicsInSprint: include }),

      recordResult: (mode, correct, total) =>
        set((state) => {
          const profile = state.userProfile
          const prev = state.stats[profile] ?? emptyStats()
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
              ...state.stats,
              [profile]: {
                totalCorrect: prev.totalCorrect + correct,
                totalAnswered: prev.totalAnswered + total,
                streak,
                lastPlayed: today,
                bestScores,
              },
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
          const profile = state.userProfile
          const profSrs = state.srs[profile] ?? {}
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
              ...state.srs,
              [profile]: {
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
            },
          }
        }),

      clearMistakesForWord: (wordId) =>
        set((state) => {
          const profile = state.userProfile
          const profSrs = state.srs[profile] ?? {}
          const prev = profSrs[wordId]
          if (!prev || !prev.mistakes || prev.mistakes.length === 0) return {}
          const { mistakes: _drop, ...rest } = prev
          return {
            srs: {
              ...state.srs,
              [profile]: { ...profSrs, [wordId]: rest },
            },
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
        }
      },

      applySnapshot: (snapshot) =>
        set({
          stats: snapshot.stats,
          customWords: snapshot.customWords,
          srs: snapshot.srs,
        }),
    }),
    { name: 'spanish-app-store' }
  )
)
