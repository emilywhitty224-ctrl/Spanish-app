export interface VocabularyItem {
  id: string;
  spanish_word: string;
  english_translation: string;
  type: 'noun' | 'verb' | 'adjective' | 'phrase';
  tags: string[];
  mastery_level: number; // 0-5 for SRS tracking
  next_review_date: string; // ISO date string
  beginner_safe: boolean;
  /** Where the word came from. 'class' = noted during face-to-face class. */
  source?: 'class' | 'app' | 'real-life';
  /** ISO date the word was added — used to count "this week's class words". */
  added_at?: string;
  /** Marked when you've actually used the word in conversation. */
  active_use?: boolean;
}
