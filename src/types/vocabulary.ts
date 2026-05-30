export interface VocabularyItem {
  id: string;
  spanish_word: string;
  english_translation: string;
  type: 'noun' | 'verb' | 'adjective' | 'phrase';
  tags: string[];
  mastery_level: number; // 0-5 for SRS tracking
  next_review_date: string; // ISO date string
  beginner_safe: boolean;
}
