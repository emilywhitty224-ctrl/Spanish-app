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
  // SPAIN — general history (Romans → democracy & the EU)
  // ─────────────────────────────────────────────────────────────
  { id: 'es01', region: 'spain', year: -200, spanish: 'Los romanos llamaban a España "Hispania"', english: 'The Romans called Spain "Hispania"', blank: 'romanos' },
  { id: 'es02', region: 'spain', year: 711,  spanish: 'En el año 711 los musulmanes llegaron a España', english: 'In the year 711 the Muslims arrived in Spain', blank: 'llegaron' },
  { id: 'es03', region: 'spain', year: 800,  spanish: 'Durante siglos, gran parte de España se llamaba Al-Ándalus', english: 'For centuries, much of Spain was called Al-Andalus', blank: 'siglos' },
  { id: 'es04', region: 'spain', year: 1492, spanish: 'En 1492 terminó la Reconquista en Granada', english: 'In 1492 the Reconquista ended in Granada', blank: 'terminó' },
  { id: 'es05', region: 'spain', year: 1492, spanish: 'En 1492 Cristóbal Colón llegó a América', english: 'In 1492 Christopher Columbus reached America', blank: 'llegó' },
  { id: 'es06', region: 'spain', year: 1605, spanish: 'Cervantes escribió "Don Quijote", un libro muy famoso', english: 'Cervantes wrote "Don Quixote", a very famous book', blank: 'libro' },
  { id: 'es07', region: 'spain', year: 1600, spanish: 'España tenía un imperio muy grande en América', english: 'Spain had a very large empire in America', blank: 'imperio' },
  { id: 'es08', region: 'spain', year: 1808, spanish: 'En 1808 el ejército de Napoleón invadió España', english: "In 1808 Napoleon's army invaded Spain", blank: 'invadió' },
  { id: 'es09', region: 'spain', year: 1898, spanish: 'En 1898 España perdió Cuba y Filipinas', english: 'In 1898 Spain lost Cuba and the Philippines', blank: 'perdió' },
  { id: 'es10', region: 'spain', year: 1931, spanish: 'En 1931 empezó la Segunda República española', english: 'In 1931 the Second Spanish Republic began', blank: 'empezó' },
  { id: 'es11', region: 'spain', year: 1936, spanish: 'La Guerra Civil española duró de 1936 a 1939', english: 'The Spanish Civil War lasted from 1936 to 1939', blank: 'Guerra' },
  { id: 'es12', region: 'spain', year: 1939, spanish: 'Franco fue dictador de España durante casi cuarenta años', english: 'Franco was dictator of Spain for almost forty years', blank: 'dictador' },
  { id: 'es13', region: 'spain', year: 1975, spanish: 'Franco murió en 1975 y volvió el rey', english: 'Franco died in 1975 and the king returned', blank: 'murió' },
  { id: 'es14', region: 'spain', year: 1978, spanish: 'En 1978 España aprobó una nueva Constitución democrática', english: 'In 1978 Spain approved a new democratic Constitution', blank: 'Constitución' },
  { id: 'es15', region: 'spain', year: 1986, spanish: 'En 1986 España entró en la Unión Europea', english: 'In 1986 Spain joined the European Union', blank: 'entró' },
  { id: 'es16', region: 'spain', year: 2002, spanish: 'En 2002 España empezó a usar el euro', english: 'In 2002 Spain started using the euro', blank: 'euro' },
  { id: 'es17', region: 'spain', year: 0,    spanish: 'En España se hablan varias lenguas, como el catalán y el gallego', english: 'In Spain several languages are spoken, such as Catalan and Galician', blank: 'lenguas' },

  // ─────────────────────────────────────────────────────────────
  // VALENCIA — modern history, 1900 → today (+ a little context)
  // ─────────────────────────────────────────────────────────────
  { id: 'va01', region: 'valencia', year: -138, spanish: 'Los romanos fundaron Valencia en el año 138 antes de Cristo', english: 'The Romans founded Valencia in 138 BC', blank: 'fundaron' },
  { id: 'va02', region: 'valencia', year: 1900, spanish: 'Hacia 1900 Valencia vendía muchas naranjas a otros países', english: 'Around 1900 Valencia sold many oranges to other countries', blank: 'naranjas' },
  { id: 'va03', region: 'valencia', year: 1900, spanish: 'La huerta es la tierra verde donde se cultivan frutas y verduras', english: 'The huerta is the green land where fruit and vegetables are grown', blank: 'huerta' },
  { id: 'va04', region: 'valencia', year: 1900, spanish: 'La paella es un plato típico de Valencia con arroz', english: 'Paella is a typical dish from Valencia with rice', blank: 'arroz' },
  { id: 'va05', region: 'valencia', year: 1910, spanish: 'El pintor Joaquín Sorolla nació en Valencia y pintaba la luz del mar', english: 'The painter Joaquín Sorolla was born in Valencia and painted the light of the sea', blank: 'pintor' },
  { id: 'va06', region: 'valencia', year: 1920, spanish: 'En Valencia se habla español y también valenciano', english: 'In Valencia people speak Spanish and also Valencian', blank: 'valenciano' },
  { id: 'va07', region: 'valencia', year: 1930, spanish: 'Las Fallas son una fiesta de Valencia con grandes figuras de cartón', english: 'Las Fallas is a festival in Valencia with big cardboard figures', blank: 'fiesta' },
  { id: 'va08', region: 'valencia', year: 1932, spanish: 'En las Fallas se queman las figuras la noche del 19 de marzo', english: 'During Las Fallas the figures are burned on the night of 19 March', blank: 'queman' },
  { id: 'va09', region: 'valencia', year: 1936, spanish: 'Durante la Guerra Civil, Valencia fue la capital de la República', english: 'During the Civil War, Valencia was the capital of the Republic', blank: 'capital' },
  { id: 'va10', region: 'valencia', year: 1957, spanish: 'En 1957 el río Turia se desbordó y causó una gran inundación', english: 'In 1957 the Turia river overflowed and caused a great flood', blank: 'río' },
  { id: 'va11', region: 'valencia', year: 1960, spanish: 'Después de la inundación, cambiaron el río Turia de sitio', english: 'After the flood, they moved the Turia river to another place', blank: 'inundación' },
  { id: 'va12', region: 'valencia', year: 1986, spanish: 'El antiguo río ahora es un parque largo y verde en la ciudad', english: 'The old riverbed is now a long green park in the city', blank: 'parque' },
  { id: 'va13', region: 'valencia', year: 1982, spanish: 'En 1982 Valencia consiguió su propio gobierno, la Generalitat', english: 'In 1982 Valencia got its own government, the Generalitat', blank: 'gobierno' },
  { id: 'va14', region: 'valencia', year: 1998, spanish: 'La Ciudad de las Artes y las Ciencias es un grupo de edificios modernos', english: 'The City of Arts and Sciences is a group of modern buildings', blank: 'edificios' },
  { id: 'va15', region: 'valencia', year: 1998, spanish: 'El arquitecto Santiago Calatrava diseñó esos edificios blancos', english: 'The architect Santiago Calatrava designed those white buildings', blank: 'arquitecto' },
  { id: 'va16', region: 'valencia', year: 2007, spanish: 'En 2007 Valencia fue la sede de la Copa América de vela', english: "In 2007 Valencia hosted the America's Cup sailing race", blank: 'vela' },
  { id: 'va17', region: 'valencia', year: 2008, spanish: 'Entre 2008 y 2012 hubo carreras de Fórmula 1 en Valencia', english: 'Between 2008 and 2012 there were Formula 1 races in Valencia', blank: 'carreras' },
  { id: 'va18', region: 'valencia', year: 2010, spanish: 'La horchata es una bebida fría y dulce típica de Valencia', english: 'Horchata is a cold, sweet drink typical of Valencia', blank: 'bebida' },
  { id: 'va19', region: 'valencia', year: 2010, spanish: 'El Mercado Central de Valencia es un mercado grande y muy bonito', english: 'The Central Market of Valencia is a large and very beautiful market', blank: 'mercado' },
  { id: 'va20', region: 'valencia', year: 2010, spanish: 'La playa de la Malvarrosa está cerca del centro de Valencia', english: 'Malvarrosa beach is near the centre of Valencia', blank: 'playa' },
  { id: 'va21', region: 'valencia', year: 2016, spanish: 'En 2016 las Fallas pasaron a ser Patrimonio de la Humanidad', english: 'In 2016 Las Fallas became a World Heritage event', blank: 'Humanidad' },
  { id: 'va22', region: 'valencia', year: 2024, spanish: 'En octubre de 2024 una fuerte tormenta, la DANA, causó inundaciones', english: 'In October 2024 a strong storm, the DANA, caused floods', blank: 'tormenta' },
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
