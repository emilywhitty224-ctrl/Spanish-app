// Helpers for grouping vocabulary into dated "lessons". A lesson is just the
// batch of words tagged `lesson_DD_MM_YY` (e.g. `lesson_27_06_26`). The Weekly
// Sprint and Pre-Lesson Blitz campaigns drill only the newest such batch.

const pad = (n: number) => String(n).padStart(2, '0')

// Build the lesson tag for a date: `lesson_DD_MM_YY` (defaults to today).
export function lessonTagForDate(d = new Date()): string {
  return `lesson_${pad(d.getDate())}_${pad(d.getMonth() + 1)}_${pad(d.getFullYear() % 100)}`
}

// Sortable YYMMDD key from a `lesson_DD_MM_YY` tag, or '' if it isn't one.
function lessonKey(tag: string): string {
  if (!tag.startsWith('lesson_')) return ''
  const [, dd, mm, yy] = tag.split('_')
  if (!dd || !mm || !yy) return ''
  return `${yy}${mm}${dd}`
}

// The most recent lesson tag across the deck, or null if there are none.
// Lessons dated in the future are ignored, so placeholder/seed data dated ahead
// of today can't mask the real newest lesson (the words you last added).
export function latestLessonTag(
  vocab: { tags: string[] }[],
  today = new Date(),
): string | null {
  const todayKey = lessonKey(lessonTagForDate(today))
  let best: string | null = null
  let bestKey = ''
  for (const v of vocab) {
    for (const t of v.tags) {
      const key = lessonKey(t)
      if (!key || key > todayKey) continue
      if (key > bestKey) {
        bestKey = key
        best = t
      }
    }
  }
  return best
}
