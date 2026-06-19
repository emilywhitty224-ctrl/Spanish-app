// The A1 course: an ordered CEFR-A1 syllabus that threads the existing Basics
// vocabulary together with the core A1 grammar and a few survival phrases.
//
// Each unit either points at one or more Basics topics (reusing that content
// verbatim) and/or carries its own authored grammar copy, practice examples and
// a small set of multiple-choice "probes" used by the adaptive entry test
// (see utils/diagnostic.ts). Vocab-only units leave `probes` empty — the test
// auto-generates recognition questions from their words.

import type { VocabularyItem } from '../types/vocabulary'
import { CATEGORIES, categoryToVocab, type CategoryId, type Entry } from './basics'

export type UnitKind = 'vocab' | 'grammar' | 'mixed'

// A multiple-choice question. `answer` must be one of `options`; the entry test
// shuffles options at runtime.
export interface Probe {
  prompt: string
  sub?: string
  answer: string
  options: string[]
}

export interface A1Unit {
  id: string
  order: number
  title: string
  icon: string
  kind: UnitKind
  blurb: string
  /** Basics topics this unit teaches — their words feed practice + SRS seeding. */
  topics?: CategoryId[]
  /** Short grammar explanation, one string per paragraph/bullet. */
  grammar?: string[]
  /** Authored example pairs for practice (grammar units that have no topic). */
  examples?: Entry[]
  /** Diagnostic questions. Empty/absent = auto-generate from topic words. */
  probes?: Probe[]
}

function slugify(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export const A1_UNITS: A1Unit[] = [
  {
    id: 'greetings-intro',
    order: 1,
    title: 'Greetings & introductions',
    icon: '👋',
    kind: 'mixed',
    blurb: 'Say hello, introduce yourself and handle a first exchange.',
    topics: ['greetings'],
    grammar: [
      'Introduce yourself with “me llamo…” (literally “I call myself…”): Me llamo Ana.',
      'Say where you’re from with ser + de: Soy de Inglaterra (I’m from England).',
      'Polite vs casual “how are you?”: ¿Cómo estás? (tú) / ¿Cómo está usted? (formal).',
    ],
    examples: [
      { spanish: 'Me llamo…', english: 'My name is…' },
      { spanish: 'Soy de Inglaterra', english: 'I am from England' },
      { spanish: 'Encantado / Encantada', english: 'Nice to meet you' },
    ],
    probes: [
      {
        prompt: '“Hello, my name is Ana” =',
        answer: 'Hola, me llamo Ana',
        options: ['Hola, me llamo Ana', 'Hola, te llamas Ana', 'Hola, se llama Ana', 'Adiós, me llamo Ana'],
      },
      {
        prompt: '“Soy de España” means…',
        answer: 'I am from Spain',
        options: ['I am from Spain', 'I am Spain', 'I go to Spain', 'I have Spain'],
      },
      {
        prompt: 'Polite “How are you?” (to a stranger) =',
        answer: '¿Cómo está usted?',
        options: ['¿Cómo está usted?', '¿Cómo estás tú?', '¿Qué hora es?', '¿Dónde está?'],
      },
    ],
  },
  {
    id: 'numbers',
    order: 2,
    title: 'Numbers 0–100',
    icon: '🔢',
    kind: 'vocab',
    blurb: 'Count, give your age, prices and phone numbers.',
    topics: ['numbers'],
  },
  {
    id: 'gender-articles',
    order: 3,
    title: 'Gender & articles',
    icon: '🚻',
    kind: 'grammar',
    blurb: 'el / la / los / las and un / una — making nouns agree.',
    grammar: [
      'Every noun is masculine or feminine. “The” = el (m) / la (f); plural los / las.',
      '“A/an” = un (m) / una (f). Most words ending -o are masculine, most -a are feminine.',
      'Examples: el libro, la casa, los libros, las casas, un perro, una mesa.',
    ],
    examples: [
      { spanish: 'el libro', english: 'the book' },
      { spanish: 'la casa', english: 'the house' },
      { spanish: 'los niños', english: 'the children' },
      { spanish: 'las flores', english: 'the flowers' },
      { spanish: 'un perro', english: 'a dog' },
      { spanish: 'una mesa', english: 'a table' },
    ],
    probes: [
      {
        prompt: 'Choose the article: ___ casa (the house)',
        answer: 'la',
        options: ['la', 'el', 'los', 'un'],
      },
      {
        prompt: 'Choose the article: ___ libros (the books)',
        answer: 'los',
        options: ['los', 'las', 'el', 'un'],
      },
      {
        prompt: 'Choose the article: ___ silla (a chair)',
        answer: 'una',
        options: ['una', 'un', 'la', 'unas'],
      },
    ],
  },
  {
    id: 'family-possessives',
    order: 4,
    title: 'Family & possessives',
    icon: '👨‍👩‍👧',
    kind: 'mixed',
    blurb: 'The people in your life, plus mi / tu / su (my / your / his).',
    topics: ['family'],
    grammar: [
      'mi = my, tu = your, su = his/her/your (formal). They don’t change for gender: mi padre, mi madre.',
      'Plural just adds -s: mis hermanos (my siblings), tus amigos (your friends).',
    ],
    probes: [
      {
        prompt: '“my mother” =',
        answer: 'mi madre',
        options: ['mi madre', 'mi padre', 'tu madre', 'su madre'],
      },
      {
        prompt: '“mis hermanos” means',
        answer: 'my siblings',
        options: ['my siblings', 'my brother', 'your siblings', 'his sisters'],
      },
    ],
  },
  {
    id: 'ser-estar',
    order: 5,
    title: 'Ser vs estar',
    icon: '🪞',
    kind: 'grammar',
    blurb: 'The two “to be” verbs and when to use each.',
    grammar: [
      'ser = permanent things: identity, origin, characteristics. Soy alta. Es español.',
      'estar = states & location: feelings and where things are. Estoy cansada. Está en casa.',
      'ser: soy / eres / es / somos / son.  estar: estoy / estás / está / estamos / están.',
    ],
    examples: [
      { spanish: 'Soy de Inglaterra', english: 'I am from England' },
      { spanish: 'Es médico', english: 'He is a doctor' },
      { spanish: 'Estoy cansado', english: 'I am tired' },
      { spanish: 'Está en casa', english: 'He is at home' },
      { spanish: 'Somos amigos', english: 'We are friends' },
    ],
    probes: [
      {
        prompt: 'Yo ___ de Inglaterra. (origin)',
        answer: 'soy',
        options: ['soy', 'estoy', 'es', 'está'],
      },
      {
        prompt: 'Ella ___ cansada. (tired)',
        answer: 'está',
        options: ['está', 'es', 'soy', 'eres'],
      },
      {
        prompt: 'El gato ___ en la mesa. (location)',
        answer: 'está',
        options: ['está', 'es', 'soy', 'son'],
      },
    ],
  },
  {
    id: 'colours-adjectives',
    order: 6,
    title: 'Colours & adjective agreement',
    icon: '🌈',
    kind: 'mixed',
    blurb: 'The colours, and making adjectives agree with their noun.',
    topics: ['colours'],
    grammar: [
      'Adjectives agree with the noun: -o → -a for feminine, add -s for plural. el coche rojo, la casa roja.',
      'Adjectives ending in -e or a consonant don’t change for gender: verde, azul (but add -s in plural).',
    ],
    probes: [
      {
        prompt: '“la casa ___” (red)',
        answer: 'roja',
        options: ['roja', 'rojo', 'rojas', 'rojes'],
      },
      {
        prompt: '“los coches ___” (black)',
        answer: 'negros',
        options: ['negros', 'negro', 'negra', 'negras'],
      },
    ],
  },
  {
    id: 'present-regular',
    order: 7,
    title: 'Present tense (regular)',
    icon: '⏳',
    kind: 'grammar',
    blurb: 'Regular -ar, -er and -ir verbs in the present.',
    grammar: [
      '-ar (hablar): hablo, hablas, habla, hablamos, habláis, hablan.',
      '-er (comer): como, comes, come, comemos, coméis, comen.',
      '-ir (vivir): vivo, vives, vive, vivimos, vivís, viven.',
    ],
    examples: [
      { spanish: 'hablo', english: 'I speak' },
      { spanish: 'comes', english: 'you eat' },
      { spanish: 'vivimos', english: 'we live' },
      { spanish: 'trabaja', english: 'he/she works' },
      { spanish: 'estudian', english: 'they study' },
    ],
    probes: [
      {
        prompt: 'Yo ___ español. (hablar)',
        answer: 'hablo',
        options: ['hablo', 'hablas', 'habla', 'hablan'],
      },
      {
        prompt: 'Nosotros ___ pizza. (comer)',
        answer: 'comemos',
        options: ['comemos', 'comen', 'como', 'come'],
      },
      {
        prompt: 'Ellos ___ en Madrid. (vivir)',
        answer: 'viven',
        options: ['viven', 'vivimos', 'vive', 'vivo'],
      },
    ],
  },
  {
    id: 'irregulars',
    order: 8,
    title: 'Key irregular verbs',
    icon: '🌀',
    kind: 'grammar',
    blurb: 'The everyday irregulars: tener, ir, hacer.',
    grammar: [
      'tener (to have): tengo, tienes, tiene, tenemos, tienen.',
      'ir (to go): voy, vas, va, vamos, van.',
      'hacer (to do/make): hago, haces, hace, hacemos, hacen.',
    ],
    examples: [
      { spanish: 'tengo', english: 'I have' },
      { spanish: 'vas', english: 'you go' },
      { spanish: 'hace', english: 'he/she does' },
      { spanish: 'vamos', english: 'we go' },
      { spanish: 'tienen', english: 'they have' },
    ],
    probes: [
      {
        prompt: 'Yo ___ dos hermanos. (tener)',
        answer: 'tengo',
        options: ['tengo', 'tienes', 'tiene', 'tenemos'],
      },
      {
        prompt: '“voy” comes from which verb?',
        answer: 'ir',
        options: ['ir', 'ser', 'ver', 'hacer'],
      },
      {
        prompt: 'Yo ___ los deberes. (hacer)',
        answer: 'hago',
        options: ['hago', 'haces', 'hace', 'hacen'],
      },
    ],
  },
  {
    id: 'hobbies-gustar',
    order: 9,
    title: 'Hobbies & gustar',
    icon: '🎨',
    kind: 'mixed',
    blurb: 'Free-time words, plus how to say what you like.',
    topics: ['hobbies'],
    grammar: [
      'gustar works “backwards” — literally “it pleases me”. Me gusta el fútbol = I like football.',
      'One thing → gusta; several things → gustan: Me gustan los gatos. Followed by a verb it stays gusta: Me gusta leer.',
    ],
    probes: [
      {
        prompt: '“I like football” =',
        answer: 'Me gusta el fútbol',
        options: ['Me gusta el fútbol', 'Me gustan el fútbol', 'Yo gusto fútbol', 'Me gusto el fútbol'],
      },
      {
        prompt: 'Me ___ los libros. (the books)',
        answer: 'gustan',
        options: ['gustan', 'gusta', 'gusto', 'gustas'],
      },
    ],
  },
  {
    id: 'food-ordering',
    order: 10,
    title: 'Food & ordering',
    icon: '🍽️',
    kind: 'mixed',
    blurb: 'Meals and drinks, plus ordering in a café.',
    topics: ['food'],
    grammar: [
      'Order with “Quiero…” (I want) or “Para mí…” (for me): Para mí, una pizza.',
      'Ask for the bill: “La cuenta, por favor.”',
    ],
    probes: [
      {
        prompt: 'Ask for the bill:',
        answer: 'La cuenta, por favor',
        options: ['La cuenta, por favor', 'Quiero agua', 'Tengo hambre', '¿Dónde está?'],
      },
      {
        prompt: '“Para mí, una pizza” means',
        answer: 'For me, a pizza',
        options: ['For me, a pizza', 'I make a pizza', 'I want pizza later', 'Where is the pizza'],
      },
    ],
  },
  {
    id: 'days-time',
    order: 11,
    title: 'Days & telling time',
    icon: '📆',
    kind: 'mixed',
    blurb: 'Days, months and how to tell the time.',
    topics: ['days'],
    grammar: [
      'Telling the time uses ser: Es la una (1:00), Son las dos (2:00).',
      '“y media” = half past, “y cuarto” = quarter past, “menos cuarto” = quarter to.',
    ],
    probes: [
      {
        prompt: '“It’s 3 o’clock” =',
        answer: 'Son las tres',
        options: ['Son las tres', 'Es las tres', 'Son la tres', 'Es la tres'],
      },
      {
        prompt: '“lunes” is',
        answer: 'Monday',
        options: ['Monday', 'Sunday', 'a month', 'Tuesday'],
      },
    ],
  },
  {
    id: 'weather',
    order: 12,
    title: 'Weather',
    icon: '⛅',
    kind: 'mixed',
    blurb: 'Describe the weather day to day.',
    topics: ['weather'],
    grammar: [
      'Most weather uses hacer: Hace sol / calor / frío / viento.',
      'Rain and snow use their own verbs: Llueve (it’s raining), Nieva (it’s snowing). Cloudy: Está nublado.',
    ],
    probes: [
      {
        prompt: '“It’s sunny” =',
        answer: 'Hace sol',
        options: ['Hace sol', 'Está sol', 'Es sol', 'Hace nublado'],
      },
      {
        prompt: '“Llueve” means',
        answer: 'It’s raining',
        options: ['It’s raining', 'It’s windy', 'It’s hot', 'It’s snowing'],
      },
    ],
  },
  {
    id: 'body-health',
    order: 13,
    title: 'The body & health',
    icon: '🧍',
    kind: 'mixed',
    blurb: 'Parts of the body and saying what hurts.',
    topics: ['body'],
    grammar: [
      'Say what hurts with doler (like gustar): Me duele la cabeza (my head hurts).',
      'Plural body parts → duelen: Me duelen los pies (my feet hurt).',
    ],
    probes: [
      {
        prompt: '“My head hurts” =',
        answer: 'Me duele la cabeza',
        options: ['Me duele la cabeza', 'Me duelen la cabeza', 'Tengo la cabeza', 'Me gusta la cabeza'],
      },
      {
        prompt: '“la mano” is',
        answer: 'hand',
        options: ['hand', 'foot', 'head', 'arm'],
      },
    ],
  },
  {
    id: 'places-directions',
    order: 14,
    title: 'Places & directions',
    icon: '🏙️',
    kind: 'mixed',
    blurb: 'Places in town, plus asking the way.',
    topics: ['places'],
    grammar: [
      '“hay” = there is / there are: Hay un banco aquí. Ask where something is with estar: ¿Dónde está la estación?',
      'Directions: a la derecha (right), a la izquierda (left), todo recto (straight on).',
    ],
    probes: [
      {
        prompt: '“Where is the station?” =',
        answer: '¿Dónde está la estación?',
        options: ['¿Dónde está la estación?', '¿Qué es la estación?', '¿Dónde hay estación?', '¿Cómo está la estación?'],
      },
      {
        prompt: '“a la izquierda” means',
        answer: 'to the left',
        options: ['to the left', 'to the right', 'straight on', 'nearby'],
      },
      {
        prompt: '“Hay un banco” means',
        answer: 'There is a bank',
        options: ['There is a bank', 'There was a bank', 'I have a bank', 'Where is the bank'],
      },
    ],
  },
]

// Units in syllabus order — the entry test and course map both rely on this.
export const A1_UNITS_ORDERED = [...A1_UNITS].sort((a, b) => a.order - b.order)

export function a1UnitById(id: string | null | undefined): A1Unit | null {
  if (!id) return null
  return A1_UNITS.find((u) => u.id === id) ?? null
}

// Authored examples → the VocabularyItem shape RevisionGame consumes.
function examplesToVocab(unit: A1Unit): VocabularyItem[] {
  return (unit.examples ?? []).map((e) => ({
    id: `a1:${unit.id}:${slugify(e.spanish)}`,
    spanish_word: e.spanish,
    english_translation: e.english,
    type: e.english.toLowerCase().startsWith('to ') ? 'verb' : 'phrase',
    tags: ['a1', unit.id],
    difficulty: 1,
    mastery_level: 0,
    next_review_date: '',
    beginner_safe: true,
  }))
}

// All practice words for a unit: its Basics topic words plus any authored
// examples. Used both to drive RevisionGame and to seed SRS on placement.
export function unitVocab(unit: A1Unit): VocabularyItem[] {
  const topicVocab = (unit.topics ?? []).flatMap((id) => {
    const cat = CATEGORIES.find((c) => c.id === id)
    return cat ? categoryToVocab(cat) : []
  })
  return [...topicVocab, ...examplesToVocab(unit)]
}

// The word ids a "known" unit should seed into SRS at placement time.
export function unitSeedIds(unit: A1Unit): string[] {
  return unitVocab(unit).map((v) => v.id)
}

// Comma-separated Basics topic ids for the /basics/play route (vocab practice).
export function unitTopicQuery(unit: A1Unit): string {
  return (unit.topics ?? []).join(',')
}
