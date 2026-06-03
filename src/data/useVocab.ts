import vocabData from './mockData.json'
import { useStore } from '../store/useStore'
import type { VocabularyItem } from '../types/vocabulary'

export const BASE_VOCAB = vocabData as VocabularyItem[]

export function useVocab(): VocabularyItem[] {
  const customWords = useStore((s) => s.customWords)
  const customIds = new Set(customWords.map((w) => w.id))
  const base = BASE_VOCAB.filter((w) => !customIds.has(w.id))
  return [...base, ...customWords]
}
