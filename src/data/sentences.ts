// Starter sentence bank for sentence-level practice modes (cloze, dictation,
// word-order). Themed to the existing vocab topics (opinions, hobbies,
// drinks, responses) so sentences reinforce words the learner already knows.
//
// To extend: add an entry below. `blank` must appear verbatim in `spanish`
// exactly once (the cloze mode removes it). `altAccepted` lets the dictation
// mode forgive minor differences (e.g. with/without "yo").

export interface Sentence {
  id: string
  spanish: string
  english: string
  blank: string
  altAccepted?: string[]
  tags: string[]
}

export const SENTENCES: Sentence[] = [
  // ── Opinions: gusta / gustan ─────────────────────────────
  { id: 's01', spanish: 'Me gusta el café',          english: 'I like coffee',           blank: 'gusta',  tags: ['opinions', 'drinks'] },
  { id: 's02', spanish: 'Me gusta la sangría',       english: 'I like sangria',          blank: 'gusta',  tags: ['opinions', 'drinks'] },
  { id: 's03', spanish: 'Me gustan las tapas',       english: 'I like tapas',            blank: 'gustan', tags: ['opinions'] },
  { id: 's04', spanish: 'Me gustan los perros',      english: 'I like dogs',             blank: 'gustan', tags: ['opinions'] },
  { id: 's05', spanish: 'No me gusta el vino tinto', english: "I don't like red wine",   blank: 'gusta',  tags: ['opinions', 'drinks'] },
  { id: 's06', spanish: 'Me encanta el chocolate',   english: 'I love chocolate',        blank: 'encanta', tags: ['opinions'] },
  { id: 's07', spanish: '¿Te gusta el café?',        english: 'Do you like coffee?',     blank: 'gusta',  tags: ['opinions', 'drinks'] },
  { id: 's08', spanish: 'A mí me gusta el agua',     english: 'I like water',            blank: 'gusta',  tags: ['opinions', 'drinks'] },
  { id: 's09', spanish: 'Me gustan las fotos',       english: 'I like photos',           blank: 'gustan', tags: ['opinions', 'hobbies'] },
  { id: 's10', spanish: 'No me gustan los gatos',    english: "I don't like cats",       blank: 'gustan', tags: ['opinions'] },

  // ── Hobbies ───────────────────────────────────────────────
  { id: 's11', spanish: 'Me gusta leer libros',         english: 'I like reading books',          blank: 'leer',    tags: ['hobbies'] },
  { id: 's12', spanish: 'Me gusta cantar en español',   english: 'I like singing in Spanish',     blank: 'cantar',  tags: ['hobbies'] },
  { id: 's13', spanish: 'Me gusta bailar los sábados',  english: 'I like dancing on Saturdays',   blank: 'bailar',  tags: ['hobbies'] },
  { id: 's14', spanish: 'No me gusta cocinar',          english: "I don't like cooking",          blank: 'cocinar', tags: ['hobbies'] },
  { id: 's15', spanish: 'Me gusta viajar mucho',        english: 'I like travelling a lot',       blank: 'viajar',  tags: ['hobbies'] },
  { id: 's16', spanish: 'Me gusta escuchar música',     english: 'I like listening to music',     blank: 'escuchar', tags: ['hobbies'] },
  { id: 's17', spanish: 'Me gusta correr por la mañana', english: 'I like running in the morning', blank: 'correr', tags: ['hobbies'] },
  { id: 's18', spanish: 'Me gusta jugar al fútbol',     english: 'I like playing football',       blank: 'jugar',   tags: ['hobbies'] },

  // ── Drinks / food ─────────────────────────────────────────
  { id: 's19', spanish: 'Quiero un café por favor',     english: 'I want a coffee please',        blank: 'café',    tags: ['drinks'] },
  { id: 's20', spanish: 'Tomo agua todos los días',     english: 'I drink water every day',       blank: 'agua',    tags: ['drinks'] },
  { id: 's21', spanish: 'Me gusta el chocolate caliente', english: 'I like hot chocolate',        blank: 'chocolate', tags: ['drinks', 'opinions'] },
  { id: 's22', spanish: 'Vamos a tomar unas tapas',     english: "Let's go for some tapas",       blank: 'tapas',   tags: ['drinks'] },

  // ── Responses / greetings ────────────────────────────────
  { id: 's23', spanish: 'Estoy muy bien gracias',       english: 'I am very well thank you',      blank: 'bien',    tags: ['responses'] },
  { id: 's24', spanish: '¿Cómo estás hoy?',             english: 'How are you today?',            blank: 'estás',   tags: ['responses'] },
  { id: 's25', spanish: 'Más o menos',                  english: 'So-so / more or less',          blank: 'menos',   tags: ['responses'] },
  { id: 's26', spanish: 'No estoy mal',                 english: "I'm not bad",                   blank: 'mal',     tags: ['responses'] },

  // ── Mixed everyday ────────────────────────────────────────
  { id: 's27', spanish: 'Mi hermana habla español',     english: 'My sister speaks Spanish',      blank: 'habla',   tags: ['hobbies'] },
  { id: 's28', spanish: 'Hoy hace mucho calor',         english: "Today it's very hot",           blank: 'calor',   tags: ['responses'] },
  { id: 's29', spanish: 'Vivo en una ciudad pequeña',   english: 'I live in a small city',        blank: 'ciudad',  tags: ['responses'] },
  { id: 's30', spanish: 'Tengo dos hermanos mayores',   english: 'I have two older brothers',     blank: 'hermanos', tags: ['responses'] },
]

/** Pick a random distinct subset of n sentences. */
export function pickSentences(n: number, filterTag?: string): Sentence[] {
  const pool = filterTag
    ? SENTENCES.filter((s) => s.tags.includes(filterTag))
    : SENTENCES
  const arr = [...pool]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr.slice(0, Math.min(n, arr.length))
}

/**
 * Tokenise a sentence into words for word-order mode. Punctuation stays
 * attached to its word so the reconstructed sentence reads correctly.
 */
export function tokenize(sentence: string): string[] {
  return sentence.split(/\s+/).filter(Boolean)
}
