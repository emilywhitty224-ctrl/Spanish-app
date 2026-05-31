import vocabData from './mockData.json'
import { useStore } from '../store/useStore'
import type { VocabularyItem } from '../types/vocabulary'

export const BASE_VOCAB = vocabData as VocabularyItem[]

export function useVocab(): VocabularyItem[] {
  return useStore((s) => s.customWords)
}
