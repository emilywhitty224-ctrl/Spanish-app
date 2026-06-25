// The A1 course: an ordered CEFR-A1 syllabus that threads the existing Basics
// vocabulary together with the core A1 grammar and a few survival phrases.
//
// Each unit either points at one or more Basics topics (reusing that content
// verbatim) and/or carries its own authored grammar copy, practice examples and
// a small set of multiple-choice "probes" used by the adaptive entry test
// (see utils/diagnostic.ts). Vocab-only units leave `probes` empty — the test
// auto-generates recognition questions from their words.
//
// Unit coverage mirrors the official A1 course specification (CONTENIDO
// FUNCIONAL / GRAMATICAL A1, based on the MCERL A1 descriptors).

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
    id: 'getting-by',
    order: 2,
    title: 'Getting by in class',
    icon: '🙋',
    kind: 'mixed',
    blurb: 'Survival phrases for when you don’t understand — ask people to repeat, slow down or explain.',
    grammar: [
      '“No entiendo” = I don’t understand. “No lo sé” = I don’t know.',
      'Ask someone to repeat or slow down: “¿Puede repetir, por favor?”, “Más despacio, por favor.”',
      'Ask for words: “¿Cómo se dice ___ en español?” (How do you say…), “¿Qué significa ___?” (What does … mean?).',
    ],
    examples: [
      { spanish: 'No entiendo', english: 'I don’t understand' },
      { spanish: '¿Puede repetir, por favor?', english: 'Can you repeat, please?' },
      { spanish: 'Más despacio, por favor', english: 'Slower, please' },
      { spanish: '¿Cómo se dice…?', english: 'How do you say…?' },
      { spanish: '¿Qué significa…?', english: 'What does … mean?' },
      { spanish: 'No lo sé', english: 'I don’t know' },
    ],
    probes: [
      {
        prompt: '“I don’t understand” =',
        answer: 'No entiendo',
        options: ['No entiendo', 'No lo sé', 'No hablo', 'No quiero'],
      },
      {
        prompt: '“¿Puede repetir?” means',
        answer: 'Can you repeat?',
        options: ['Can you repeat?', 'Can you help?', 'What does it mean?', 'Speak slower'],
      },
      {
        prompt: 'Ask “How do you say… in Spanish?”',
        answer: '¿Cómo se dice… en español?',
        options: ['¿Cómo se dice… en español?', '¿Qué significa…?', '¿Puede repetir…?', '¿Dónde está…?'],
      },
    ],
  },
  {
    id: 'alphabet-spelling',
    order: 3,
    title: 'The alphabet & spelling',
    icon: '🔤',
    kind: 'grammar',
    blurb: 'Say the alphabet and spell your name out loud (deletrear).',
    grammar: [
      'Spanish has the English letters plus ñ. The five vowels are a, e, i, o, u.',
      'Tricky names: j = “jota”, h = “hache” (silent), ñ = “eñe”, w = “uve doble”, y = “i griega” / “ye”.',
      'Spell a word with “se escribe…”: ¿Cómo se escribe? Ask someone to spell it with “¿Puede deletrearlo?”',
    ],
    examples: [
      { spanish: 'el alfabeto', english: 'the alphabet' },
      { spanish: '¿Cómo se escribe?', english: 'How is it spelled?' },
      { spanish: 'se escribe con hache', english: 'it’s spelled with an h' },
      { spanish: 'la eñe (ñ)', english: 'the letter ñ' },
      { spanish: 'deletrear', english: 'to spell out' },
    ],
    probes: [
      {
        prompt: 'The Spanish letter “ñ” is called',
        answer: 'eñe',
        options: ['eñe', 'ene', 'enie', 'nye'],
      },
      {
        prompt: '“¿Cómo se escribe?” means',
        answer: 'How is it spelled?',
        options: ['How is it spelled?', 'How do you say it?', 'What does it mean?', 'Where is it?'],
      },
      {
        prompt: 'The letter “h” in Spanish is',
        answer: 'silent',
        options: ['silent', 'pronounced like English h', 'pronounced like j', 'a vowel'],
      },
    ],
  },
  {
    id: 'numbers',
    order: 4,
    title: 'Numbers 0–100',
    icon: '🔢',
    kind: 'vocab',
    blurb: 'Count, give your age, prices and phone numbers.',
    topics: ['numbers'],
  },
  {
    id: 'question-words',
    order: 5,
    title: 'Question words',
    icon: '❓',
    kind: 'grammar',
    blurb: 'qué, quién, dónde, cuándo, cómo, cuánto — asking for information.',
    grammar: [
      'qué = what, quién = who, dónde = where, cuándo = when, cómo = how, por qué = why.',
      'cuánto/a/os/as = how much / how many and agrees with the noun: ¿Cuántos años tienes? ¿Cuánta agua?',
      'qué vs cuál: qué + noun (¿Qué libro?), cuál to choose between options (¿Cuál prefieres?). Question words always carry an accent.',
    ],
    examples: [
      { spanish: '¿Qué es esto?', english: 'What is this?' },
      { spanish: '¿Dónde vives?', english: 'Where do you live?' },
      { spanish: '¿Quién es?', english: 'Who is it?' },
      { spanish: '¿Cuándo es la clase?', english: 'When is the class?' },
      { spanish: '¿Cuántos años tienes?', english: 'How old are you?' },
      { spanish: '¿Por qué?', english: 'Why?' },
    ],
    probes: [
      {
        prompt: '“Where do you live?” =',
        answer: '¿Dónde vives?',
        options: ['¿Dónde vives?', '¿Cómo vives?', '¿Quién vives?', '¿Cuándo vives?'],
      },
      {
        prompt: '“¿Cuántos años tienes?” asks',
        answer: 'how old you are',
        options: ['how old you are', 'where you live', 'what your name is', 'how you are'],
      },
      {
        prompt: 'Choose: ¿___ es tu profesor? (who)',
        answer: 'Quién',
        options: ['Quién', 'Qué', 'Dónde', 'Cómo'],
      },
    ],
  },
  {
    id: 'gender-articles',
    order: 6,
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
    id: 'demonstratives',
    order: 7,
    title: 'This & that (demonstratives)',
    icon: '👉',
    kind: 'grammar',
    blurb: 'este, ese, aquel — pointing things out.',
    grammar: [
      'Near you: este / esta (this), estos / estas (these). Near the other person: ese / esa / esos / esas (that / those).',
      'Far from both: aquel / aquella / aquellos / aquellas (that … over there).',
      'They agree with the noun: este libro, esta casa, estos coches, esas mesas.',
    ],
    examples: [
      { spanish: 'este libro', english: 'this book' },
      { spanish: 'esta casa', english: 'this house' },
      { spanish: 'ese coche', english: 'that car' },
      { spanish: 'aquella montaña', english: 'that mountain (over there)' },
      { spanish: 'estos zapatos', english: 'these shoes' },
    ],
    probes: [
      {
        prompt: '“this house” =',
        answer: 'esta casa',
        options: ['esta casa', 'este casa', 'esa casa', 'aquella casa'],
      },
      {
        prompt: '“ese coche” means',
        answer: 'that car',
        options: ['that car', 'this car', 'these cars', 'that car over there'],
      },
      {
        prompt: 'Choose: ___ libros (these books)',
        answer: 'estos',
        options: ['estos', 'estas', 'este', 'esos'],
      },
    ],
  },
  {
    id: 'family-possessives',
    order: 8,
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
    order: 9,
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
    order: 10,
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
    id: 'comparisons',
    order: 11,
    title: 'Comparing things',
    icon: '⚖️',
    kind: 'grammar',
    blurb: 'más… que, menos… que and tan… como.',
    grammar: [
      'More than: más + adjective + que. Madrid es más grande que Valencia.',
      'Less than: menos + adjective + que. Hoy hace menos frío que ayer.',
      'The same as: tan + adjective + como. Es tan alto como tú. Irregulars: mejor (better), peor (worse), mayor (older), menor (younger).',
    ],
    examples: [
      { spanish: 'más grande que', english: 'bigger than' },
      { spanish: 'menos caro que', english: 'less expensive than' },
      { spanish: 'tan alto como', english: 'as tall as' },
      { spanish: 'mejor que', english: 'better than' },
      { spanish: 'peor que', english: 'worse than' },
    ],
    probes: [
      {
        prompt: '“bigger than” =',
        answer: 'más grande que',
        options: ['más grande que', 'menos grande que', 'tan grande como', 'más grande como'],
      },
      {
        prompt: '“as tall as you” =',
        answer: 'tan alto como tú',
        options: ['tan alto como tú', 'más alto que tú', 'tan alto que tú', 'menos alto como tú'],
      },
      {
        prompt: 'The comparative “better” is',
        answer: 'mejor',
        options: ['mejor', 'más bueno', 'peor', 'mayor'],
      },
    ],
  },
  {
    id: 'present-regular',
    order: 12,
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
    order: 13,
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
    id: 'daily-routine',
    order: 14,
    title: 'Daily routine & reflexive verbs',
    icon: '🪥',
    kind: 'grammar',
    blurb: 'levantarse, ducharse, acostarse — talking about your day.',
    grammar: [
      'Reflexive verbs take a pronoun: me, te, se, nos, os, se. Me levanto a las siete (I get up at seven).',
      'Common ones: levantarse (get up), ducharse (shower), vestirse (get dressed), acostarse (go to bed), llamarse (be called).',
      'The pronoun goes before the verb: te duchas, se acuesta. With an infinitive it can attach: voy a ducharme.',
    ],
    examples: [
      { spanish: 'me levanto', english: 'I get up' },
      { spanish: 'te duchas', english: 'you shower' },
      { spanish: 'se acuesta', english: 'he/she goes to bed' },
      { spanish: 'nos vestimos', english: 'we get dressed' },
      { spanish: 'me llamo Ana', english: 'my name is Ana' },
    ],
    probes: [
      {
        prompt: '“I get up at seven” =',
        answer: 'Me levanto a las siete',
        options: ['Me levanto a las siete', 'Levanto a las siete', 'Me levanta a las siete', 'Te levantas a las siete'],
      },
      {
        prompt: 'The reflexive pronoun for “yo” is',
        answer: 'me',
        options: ['me', 'te', 'se', 'nos'],
      },
      {
        prompt: '“se ducha” means',
        answer: 'he/she showers',
        options: ['he/she showers', 'I shower', 'you shower', 'we shower'],
      },
    ],
  },
  {
    id: 'hobbies-gustar',
    order: 15,
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
    id: 'opinions',
    order: 16,
    title: 'Opinions & agreeing',
    icon: '💬',
    kind: 'mixed',
    blurb: 'Give your opinion and say whether you agree.',
    grammar: [
      'Give an opinion: “Creo que…”, “Pienso que…”, “En mi opinión…”, “Me parece que…”.',
      'Agree / disagree: “Estoy de acuerdo”, “No estoy de acuerdo”.',
      'parecer works like gustar: Me parece bien (it seems fine to me), Me parece interesante.',
    ],
    examples: [
      { spanish: 'Creo que sí', english: 'I think so' },
      { spanish: 'En mi opinión…', english: 'In my opinion…' },
      { spanish: 'Estoy de acuerdo', english: 'I agree' },
      { spanish: 'No estoy de acuerdo', english: 'I don’t agree' },
      { spanish: 'Me parece bien', english: 'It seems good to me' },
    ],
    probes: [
      {
        prompt: '“I think that…” =',
        answer: 'Creo que…',
        options: ['Creo que…', 'Quiero que…', 'Tengo que…', 'Voy a…'],
      },
      {
        prompt: '“Estoy de acuerdo” means',
        answer: 'I agree',
        options: ['I agree', 'I disagree', 'I think so', 'I don’t know'],
      },
      {
        prompt: '“Me parece interesante” means',
        answer: 'It seems interesting to me',
        options: ['It seems interesting to me', 'I find it boring', 'I want something interesting', 'I agree'],
      },
    ],
  },
  {
    id: 'food-ordering',
    order: 17,
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
    id: 'shopping',
    order: 18,
    title: 'Shopping & prices',
    icon: '🛍️',
    kind: 'mixed',
    blurb: 'Ask for things in a shop and ask the price.',
    grammar: [
      'Ask the price: “¿Cuánto cuesta?” (one thing) / “¿Cuánto cuestan?” (several).',
      'Ask for something politely: “Quisiera…”, “¿Me pone…?” or “¿Tiene…?”.',
      'Useful words: caro (expensive), barato (cheap), la talla (size), pagar (to pay).',
    ],
    examples: [
      { spanish: '¿Cuánto cuesta?', english: 'How much is it?' },
      { spanish: 'Quisiera…', english: 'I would like…' },
      { spanish: '¿Tiene…?', english: 'Do you have…?' },
      { spanish: 'Es muy caro', english: 'It’s very expensive' },
      { spanish: '¿Qué talla?', english: 'What size?' },
    ],
    probes: [
      {
        prompt: '“How much does it cost?” =',
        answer: '¿Cuánto cuesta?',
        options: ['¿Cuánto cuesta?', '¿Cuántos cuesta?', '¿Qué cuesta?', '¿Cómo cuesta?'],
      },
      {
        prompt: '“barato” means',
        answer: 'cheap',
        options: ['cheap', 'expensive', 'size', 'free'],
      },
      {
        prompt: 'Polite “I would like…” =',
        answer: 'Quisiera…',
        options: ['Quisiera…', 'Quiero ya', 'Tengo…', 'Doy…'],
      },
    ],
  },
  {
    id: 'days-time',
    order: 19,
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
    id: 'plans-obligations',
    order: 20,
    title: 'Plans & obligations',
    icon: '📝',
    kind: 'grammar',
    blurb: 'ir a, tener que, querer / poder + the near future.',
    grammar: [
      'Near future: ir a + infinitive. Voy a estudiar (I’m going to study). Vamos a comer.',
      'Obligation: tener que + infinitive. Tengo que trabajar (I have to work).',
      'querer / poder / necesitar + infinitive: Quiero ir, ¿Puedes ayudar?, Necesito dormir.',
    ],
    examples: [
      { spanish: 'Voy a estudiar', english: 'I’m going to study' },
      { spanish: 'Tengo que trabajar', english: 'I have to work' },
      { spanish: 'Quiero ir al cine', english: 'I want to go to the cinema' },
      { spanish: '¿Puedes ayudarme?', english: 'Can you help me?' },
      { spanish: 'Necesito dormir', english: 'I need to sleep' },
    ],
    probes: [
      {
        prompt: '“I’m going to study” =',
        answer: 'Voy a estudiar',
        options: ['Voy a estudiar', 'Voy estudiar', 'Voy a estudio', 'Voy estudio'],
      },
      {
        prompt: '“Tengo que trabajar” means',
        answer: 'I have to work',
        options: ['I have to work', 'I want to work', 'I’m going to work', 'I can work'],
      },
      {
        prompt: 'After “tener que” the verb is in the',
        answer: 'infinitive',
        options: ['infinitive', 'present', 'past', 'gerund'],
      },
    ],
  },
  {
    id: 'weather',
    order: 21,
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
    order: 22,
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
    order: 23,
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
  {
    id: 'preterito-perfecto',
    order: 24,
    title: 'The recent past (pretérito perfecto)',
    icon: '⌛',
    kind: 'grammar',
    blurb: 'he hablado, has comido — saying what you have done.',
    grammar: [
      'Form: haber (he, has, ha, hemos, habéis, han) + past participle.',
      'Participles: -ar → -ado (hablar → hablado), -er / -ir → -ido (comer → comido, vivir → vivido).',
      'Used for recent / today’s actions, often with hoy, esta mañana, ya, todavía no. Irregulars: hecho (hacer), dicho (decir), visto (ver).',
    ],
    examples: [
      { spanish: 'he hablado', english: 'I have spoken' },
      { spanish: 'has comido', english: 'you have eaten' },
      { spanish: 'ha llegado', english: 'he/she has arrived' },
      { spanish: 'hemos visto', english: 'we have seen' },
      { spanish: 'he hecho', english: 'I have done' },
    ],
    probes: [
      {
        prompt: '“I have spoken” =',
        answer: 'he hablado',
        options: ['he hablado', 'he hablar', 'ha hablado', 'has hablado'],
      },
      {
        prompt: 'The participle of “comer” is',
        answer: 'comido',
        options: ['comido', 'comado', 'comiendo', 'comdo'],
      },
      {
        prompt: 'Choose: ¿___ comido? (you, have)',
        answer: 'Has',
        options: ['Has', 'He', 'Ha', 'Han'],
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
