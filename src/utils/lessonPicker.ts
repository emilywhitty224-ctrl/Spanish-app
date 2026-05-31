import type { SrsEntry } from '../store/useStore'
import type { VocabularyItem } from '../types/vocabulary'
import { pickDueFirst } from './srs'
import { SENTENCES, type Sentence } from '../data/sentences'

export interface LessonBundle {
  topicTag: string
  topicLabel: string
  vocab: VocabularyItem[]
  sentences: Sentence[]
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const TOPIC_LABELS: Record<string, string> = {
  opinions: 'Likes & opinions',
  drinks: 'Food & drink',
  hobbies: 'Hobbies',
  responses: 'Everyday responses',
  greetings: 'Greetings',
  family: 'Family',
  travel: 'Travel',
  numbers: 'Numbers',
  time: 'Time',
  weather: 'Weather',
}

function labelFor(tag: string): string {
  return TOPIC_LABELS[tag] ?? tag.charAt(0).toUpperCase() + tag.slice(1).replace(/_/g, ' ')
}

function dominantTag(items: VocabularyItem[]): string {
  const counts: Record<string, number> = {}
  for (const v of items) {
    for (const t of v.tags) {
      if (t.startsWith('lesson_')) continue
      counts[t] = (counts[t] ?? 0) + 1
    }
  }
  let bestTag = 'general'
  let best = 0
  for (const [tag, n] of Object.entries(counts)) {
    if (n > best) { best = n; bestTag = tag }
  }
  return bestTag
}

/**
 * Build a lesson bundle for the user. We pick due/weak vocab first (via
 * pickDueFirst), then derive a topic tag from the dominant tag in the picked
 * items, then pull matching sentences for the chat/recap step.
 */
export function pickLesson(
  vocab: VocabularyItem[],
  srs: Record<string, SrsEntry>,
  vocabCount: number,
  sentenceCount: number,
  excludeTag?: string,
): LessonBundle {
  const pool = excludeTag
    ? vocab.filter((v) => !v.tags.includes(excludeTag))
    : vocab
  const picked = pickDueFirst(pool, srs, vocabCount)
  const topicTag = dominantTag(picked)
  const topicLabel = labelFor(topicTag)

  // Sentences: prefer ones matching the topic; fall back to random.
  const matching = SENTENCES.filter((s) => s.tags.includes(topicTag))
  const sentences = shuffle(matching.length >= sentenceCount ? matching : SENTENCES)
    .slice(0, sentenceCount)

  return { topicTag, topicLabel, vocab: picked, sentences }
}
