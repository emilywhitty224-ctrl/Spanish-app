// Bilingual, A2-graded culture & history facts about Spain and Valencia.
// Single source of truth feeding three places:
//   1. Sentence practice — `cultureSentences()` is appended to SENTENCES, so the
//      cloze / dictation / word-order modes practise these facts as real
//      sentences (learning history doubles as Spanish practice).
//   2. The "¿Sabías que…?" card — `randomCultureFact()` powers <DidYouKnow/>.
//   3. Barny's AI chat — `CULTURE_DIGEST` is injected into the system prompt so
//      Barny can chat about Valencia & Spain when asked.
//
// Keep the Spanish at CEFR A2: short, simple sentences, common vocab. Each fact
// is also a valid Sentence, so `blank` MUST appear verbatim exactly once in
// `spanish` (the cloze mode removes it).

import type { Sentence } from './sentences'
import type { VocabularyItem } from '../types/vocabulary'

export interface CultureFact {
  id: string
  /** Which story this belongs to. */
  region: 'spain' | 'valencia'
  /** Approx year for ordering/grouping. Use the era's start; 0 = general. */
  year: number
  /** A2 Spanish fact. Also used as a practice sentence. */
  spanish: string
  /** Literal English translation, revealed after the card/cloze. */
  english: string
  /** Word removed in cloze practice — must appear once in `spanish`. */
  blank: string
  /** Extra answers the dictation mode forgives. */
  altAccepted?: string[]
}

export const CULTURE_FACTS: CultureFact[] = [
  // ─────────────────────────────────────────────────────────────
  // SPAIN — the big story, told through its strangest, best bits
  // ─────────────────────────────────────────────────────────────
  { id: 'es01', region: 'spain', year: -200, spanish: 'El nombre "Hispania" puede significar "tierra de conejos"', english: 'The name "Hispania" may mean "land of rabbits"', blank: 'conejos' },
  { id: 'es02', region: 'spain', year: 711,  spanish: 'En el año 711 los musulmanes conquistaron España muy rápido', english: 'In 711 the Muslims conquered Spain very fast', blank: 'conquistaron' },
  { id: 'es03', region: 'spain', year: 1000, spanish: 'Hacia el año 1000, Córdoba era la ciudad más grande del mundo', english: 'Around the year 1000, Córdoba was the biggest city in the world', blank: 'grande' },
  { id: 'es04', region: 'spain', year: 1010, spanish: 'Córdoba tenía calles con luz mil años antes que París', english: 'Córdoba had lit streets a thousand years before Paris', blank: 'luz' },
  { id: 'es05', region: 'spain', year: 1492, spanish: 'En 1492 el último rey árabe lloró al perder Granada', english: 'In 1492 the last Arab king cried when he lost Granada', blank: 'lloró' },
  { id: 'es06', region: 'spain', year: 1492, spanish: 'En 1492 Colón cruzó el mar y llegó a América', english: 'In 1492 Columbus crossed the sea and reached America', blank: 'mar' },
  { id: 'es07', region: 'spain', year: 1550, spanish: 'En el imperio español, el sol nunca se ponía', english: 'In the Spanish empire, the sun never set', blank: 'sol' },
  { id: 'es08', region: 'spain', year: 1605, spanish: 'Don Quijote atacó molinos porque creía que eran gigantes', english: 'Don Quixote attacked windmills because he thought they were giants', blank: 'gigantes' },
  { id: 'es09', region: 'spain', year: 1725, spanish: 'El restaurante más antiguo del mundo está en Madrid', english: 'The oldest restaurant in the world is in Madrid', blank: 'antiguo' },
  { id: 'es10', region: 'spain', year: 1808, spanish: 'En 1808 Napoleón invadió España y el pueblo se rebeló', english: 'In 1808 Napoleon invaded Spain and the people rebelled', blank: 'invadió' },
  { id: 'es11', region: 'spain', year: 1898, spanish: 'En 1898 España perdió Cuba, Puerto Rico y Filipinas', english: 'In 1898 Spain lost Cuba, Puerto Rico and the Philippines', blank: 'perdió' },
  { id: 'es12', region: 'spain', year: 1936, spanish: 'La Guerra Civil española duró de 1936 a 1939', english: 'The Spanish Civil War lasted from 1936 to 1939', blank: 'Guerra' },
  { id: 'es13', region: 'spain', year: 1939, spanish: 'Franco gobernó España como dictador casi cuarenta años', english: 'Franco ruled Spain as a dictator for almost forty years', blank: 'dictador' },
  { id: 'es14', region: 'spain', year: 1975, spanish: 'Franco murió en 1975 y España volvió a tener rey', english: 'Franco died in 1975 and Spain had a king again', blank: 'murió' },
  { id: 'es15', region: 'spain', year: 1978, spanish: 'En 1978 España se convirtió en una democracia moderna', english: 'In 1978 Spain became a modern democracy', blank: 'democracia' },
  { id: 'es16', region: 'spain', year: 1986, spanish: 'En 1986 España entró en la Unión Europea', english: 'In 1986 Spain joined the European Union', blank: 'entró' },
  { id: 'es17', region: 'spain', year: 0,    spanish: 'En España se hablan cuatro lenguas: español, catalán, gallego y euskera', english: 'In Spain four languages are spoken: Spanish, Catalan, Galician and Basque', blank: 'lenguas' },
  { id: 'es18', region: 'spain', year: 0,    spanish: 'España tiene más bares por persona que casi todo el mundo', english: 'Spain has more bars per person than almost anywhere in the world', blank: 'bares' },

  // ─────────────────────────────────────────────────────────────
  // VALENCIA — its weirdest treasures, from a Roman city to the DANA
  // ─────────────────────────────────────────────────────────────
  { id: 'va01', region: 'valencia', year: -138, spanish: 'Los romanos fundaron Valencia para sus soldados viejos', english: 'The Romans founded Valencia for their old soldiers', blank: 'fundaron' },
  { id: 'va02', region: 'valencia', year: -137, spanish: 'El nombre Valencia viene de una palabra latina que significa "fuerza"', english: 'The name Valencia comes from a Latin word meaning "strength"', blank: 'fuerza' },
  { id: 'va03', region: 'valencia', year: 960,  spanish: 'El tribunal más antiguo de Europa se reúne en Valencia los jueves', english: 'The oldest court in Europe meets in Valencia on Thursdays', blank: 'jueves' },
  { id: 'va04', region: 'valencia', year: 1437, spanish: 'Mucha gente cree que el Santo Grial está en la catedral de Valencia', english: 'Many people believe the Holy Grail is in Valencia Cathedral', blank: 'Grial' },
  { id: 'va05', region: 'valencia', year: 1840, spanish: 'La paella original lleva pollo, conejo y caracoles, no marisco', english: 'The original paella has chicken, rabbit and snails, not seafood', blank: 'caracoles' },
  { id: 'va06', region: 'valencia', year: 1850, spanish: 'Lo mejor de la paella es el arroz tostado del fondo', english: 'The best part of paella is the toasted rice at the bottom', blank: 'fondo' },
  { id: 'va07', region: 'valencia', year: 1880, spanish: 'La horchata se hace con chufas, unas raíces muy pequeñas', english: 'Horchata is made from tiger nuts, very small roots', blank: 'chufas' },
  { id: 'va08', region: 'valencia', year: 1900, spanish: 'El pintor Sorolla pintaba la luz y el mar de Valencia', english: 'The painter Sorolla painted the light and the sea of Valencia', blank: 'pintor' },
  { id: 'va09', region: 'valencia', year: 1928, spanish: 'El Mercado Central es uno de los más grandes de Europa', english: 'The Central Market is one of the biggest in Europe', blank: 'Mercado' },
  { id: 'va10', region: 'valencia', year: 1930, spanish: 'En las Fallas, Valencia quema enormes figuras de cartón', english: 'During Las Fallas, Valencia burns huge cardboard figures', blank: 'quema' },
  { id: 'va11', region: 'valencia', year: 1934, spanish: 'Cada año solo una figura de las Fallas se salva del fuego', english: 'Each year only one Fallas figure is saved from the fire', blank: 'fuego' },
  { id: 'va12', region: 'valencia', year: 1935, spanish: 'En la mascletà, los petardos se sienten en el pecho', english: 'At the mascletà, the firecrackers can be felt in your chest', blank: 'pecho' },
  { id: 'va13', region: 'valencia', year: 1936, spanish: 'Durante la Guerra Civil, Valencia fue la capital de España', english: 'During the Civil War, Valencia was the capital of Spain', blank: 'capital' },
  { id: 'va14', region: 'valencia', year: 1945, spanish: 'Cerca de Valencia, en la Tomatina la gente se tira tomates', english: 'Near Valencia, at La Tomatina people throw tomatoes', blank: 'tomates' },
  { id: 'va15', region: 'valencia', year: 1957, spanish: 'En 1957 el río Turia se desbordó e inundó toda la ciudad', english: 'In 1957 the Turia river overflowed and flooded the whole city', blank: 'inundó' },
  { id: 'va16', region: 'valencia', year: 1960, spanish: 'Después, Valencia movió el río y lo cambió por un parque', english: 'Afterwards, Valencia moved the river and turned it into a park', blank: 'parque' },
  { id: 'va17', region: 'valencia', year: 1986, spanish: 'El parque del Turia tiene nueve kilómetros de jardines', english: 'The Turia park has nine kilometres of gardens', blank: 'kilómetros' },
  { id: 'va18', region: 'valencia', year: 1998, spanish: 'La Ciudad de las Artes parece un esqueleto blanco gigante', english: 'The City of Arts looks like a giant white skeleton', blank: 'esqueleto' },
  { id: 'va19', region: 'valencia', year: 2003, spanish: 'Valencia tiene el acuario más grande de Europa', english: 'Valencia has the biggest aquarium in Europe', blank: 'acuario' },
  { id: 'va20', region: 'valencia', year: 0,    spanish: 'En Valencia mucha gente habla valenciano y también español', english: 'In Valencia many people speak Valencian and also Spanish', blank: 'valenciano' },
]

/** Compare facts chronologically (used if you ever want a timeline order). */
export const byYear = (a: CultureFact, b: CultureFact) => a.year - b.year

/**
 * Map culture facts into practice Sentences. Tagged 'culture' plus the region
 * so lessons/practice can pull them like any other sentence topic.
 */
export function cultureSentences(): Sentence[] {
  return CULTURE_FACTS.map((f) => ({
    id: `c-${f.id}`,
    spanish: f.spanish,
    english: f.english,
    blank: f.blank,
    altAccepted: f.altAccepted,
    tags: ['culture', f.region],
  }))
}

/**
 * Map culture facts into VocabularyItem "cards" so the Weekly Sprint can drill
 * them through the normal RevisionGame modes — on their own or mixed in with
 * the learner's own words. Each fact becomes a phrase card (full Spanish
 * sentence ↔ translation), tagged 'culture' + its region so the topic filter
 * can split Spain vs Valencia. The id is namespaced 'culture:<id>' so SRS
 * tracks these separately from real vocab and never collides with a real word.
 */
export function cultureVocab(region?: 'spain' | 'valencia'): VocabularyItem[] {
  const pool = region ? CULTURE_FACTS.filter((f) => f.region === region) : CULTURE_FACTS
  return pool.map((f): VocabularyItem => ({
    id: `culture:${f.id}`,
    spanish_word: f.spanish,
    english_translation: f.english,
    type: 'phrase',
    tags: ['culture', f.region],
    difficulty: 1,
    mastery_level: 0,
    next_review_date: '',
    beginner_safe: true,
  }))
}

/** A random fact for the "¿Sabías que…?" card. */
export function randomCultureFact(region?: 'spain' | 'valencia'): CultureFact {
  const pool = region ? CULTURE_FACTS.filter((f) => f.region === region) : CULTURE_FACTS
  return pool[Math.floor(Math.random() * pool.length)]
}

/**
 * English bullet digest of every fact, injected into Barny's system prompt so
 * he can answer questions about Valencia & Spain. English (not Spanish) so it
 * stays compact and Barny phrases his own A2 reply.
 */
export const CULTURE_DIGEST: string = CULTURE_FACTS.map((f) => `- ${f.english}`).join('\n')
