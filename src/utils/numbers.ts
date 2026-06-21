// Number helpers shared by the Basics "🔢 Challenge" mode.
//
// Beyond spelling a bare digit, the challenge drills numbers the way they're
// actually used: prices, telling the time, and ages. Each generator returns a
// NumberPrompt with a display string, a teaching label, and a '/'-separated set
// of accepted answers (the format checkAnswer expects) plus the single canonical
// form to show and speak on reveal.

export function numberToSpanish(n: number): string {
  if (n === 0) return 'cero'
  if (n === 100) return 'cien'
  if (n === 1000) return 'mil'

  const ones = [
    '', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve',
    'diez', 'once', 'doce', 'trece', 'catorce', 'quince',
    'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve',
    'veinte', 'veintiuno', 'veintidós', 'veintitrés', 'veinticuatro',
    'veinticinco', 'veintiséis', 'veintisiete', 'veintiocho', 'veintinueve',
  ]
  const tens = ['', '', 'veinte', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa']
  const hundreds = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos']

  if (n <= 29) return ones[n]

  if (n < 100) {
    const t = Math.floor(n / 10)
    const o = n % 10
    return o === 0 ? tens[t] : `${tens[t]} y ${ones[o]}`
  }

  const h = Math.floor(n / 100)
  const rest = n % 100
  return rest === 0 ? hundreds[h] : `${hundreds[h]} ${numberToSpanish(rest)}`
}

// Apocope before a masculine noun: "uno" → "un", "veintiuno" → "veintiún",
// "treinta y uno" → "treinta y un". Needed for prices ("un euro",
// "veintiún euros") and ages ("treinta y un años").
export function mascNumber(n: number): string {
  const w = numberToSpanish(n)
  if (w === 'veintiuno') return 'veintiún'
  if (w.endsWith('veintiuno')) return w.replace(/veintiuno$/, 'veintiún')
  if (w === 'uno') return 'un'
  if (w.endsWith(' uno')) return w.replace(/ uno$/, ' un')
  return w
}

export interface NumberPrompt {
  /** What the learner sees — a bare digit, "8,50 €", "3:30", "🎂 25". */
  display: string
  /** One-line teaching nudge shown while the input is empty. */
  label: string
  /** Accepted answers, '/'-separated for checkAnswer (any match counts). */
  answer: string
  /** The single canonical answer shown and spoken on reveal. */
  canonical: string
}

export const CHALLENGE_RANGES = {
  easy:   [1,   20] as const,
  medium: [1,  100] as const,
  hard:   [1, 1000] as const,
}
export type ChallengeRange = keyof typeof CHALLENGE_RANGES

export type ChallengeTopic = 'numbers' | 'prices' | 'time' | 'age'

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomNum(range: ChallengeRange, avoid?: number): number {
  const [min, max] = CHALLENGE_RANGES[range]
  let n: number
  do { n = randomInt(min, max) } while (n === avoid)
  return n
}

// Plain "see the digit, write the word" prompt.
function numberPrompt(range: ChallengeRange, avoid?: number): NumberPrompt {
  const n = randomNum(range, avoid)
  const word = numberToSpanish(n)
  return { display: String(n), label: 'Write the number in Spanish', answer: word, canonical: word }
}

// Prices: euros + cents, said with "con". Teaches the comma decimal and the
// apocope ("un euro", "veintiún euros con cincuenta").
function pricePrompt(): NumberPrompt {
  const euros = randomInt(1, 99)
  // ~⅓ of the time a round price, otherwise cents (kept off multiples of nothing
  // special — any value 1–99 is fair game).
  const cents = Math.random() < 0.34 ? 0 : randomInt(1, 99)
  const euroWord = `${mascNumber(euros)} ${euros === 1 ? 'euro' : 'euros'}`

  if (cents === 0) {
    const display = `${euros} €`
    return { display, label: 'Say the price', answer: euroWord, canonical: euroWord }
  }

  const centWord = numberToSpanish(cents)
  const canonical = `${euroWord} con ${centWord}`
  const display = `${euros},${String(cents).padStart(2, '0')} €`
  const answer = [
    canonical,
    `${euroWord} ${centWord}`,
    `${euroWord} con ${centWord} céntimos`,
  ].join(' / ')
  return { display, label: 'Say the price', answer, canonical }
}

// Telling the time on the quarter hour — teaches es/son, y cuarto / y media /
// menos cuarto, and the feminine "la una".
function timePrompt(): NumberPrompt {
  const hour = randomInt(1, 12)
  const minute = [0, 15, 30, 45][randomInt(0, 3)]

  const base = (h: number) => (h === 1 ? 'es la una' : `son las ${numberToSpanish(h)}`)

  let canonical: string
  const alts: string[] = []
  if (minute === 0) {
    canonical = base(hour)
  } else if (minute === 15) {
    canonical = `${base(hour)} y cuarto`
    alts.push(`${base(hour)} y quince`)
  } else if (minute === 30) {
    canonical = `${base(hour)} y media`
    alts.push(`${base(hour)} y treinta`)
  } else {
    // :45 — most natural is "menos cuarto" of the next hour.
    const next = hour === 12 ? 1 : hour + 1
    canonical = `${base(next)} menos cuarto`
    alts.push(`${base(hour)} y cuarenta y cinco`)
  }

  const display = `${hour}:${String(minute).padStart(2, '0')}`
  return { display, label: 'Tell the time', answer: [canonical, ...alts].join(' / '), canonical }
}

// Age: the "tener … años" idiom, with apocope before "años".
function agePrompt(): NumberPrompt {
  const n = randomInt(1, 99)
  const masc = mascNumber(n)
  const full = numberToSpanish(n)
  const canonical = `tengo ${masc} años`
  const answer = [
    canonical,
    `${masc} años`,
    `tengo ${full} años`,
    `${full} años`,
  ].join(' / ')
  const display = `🎂 ${n}`
  return { display, label: 'Give the age (use tener)', answer, canonical }
}

// Build the next prompt for a topic. `avoid` only applies to plain numbers,
// where repeating the same digit twice in a row feels broken; the context
// modes vary enough that an occasional repeat is fine.
export function makePrompt(topic: ChallengeTopic, range: ChallengeRange, avoid?: number): NumberPrompt {
  switch (topic) {
    case 'prices': return pricePrompt()
    case 'time':   return timePrompt()
    case 'age':    return agePrompt()
    default:       return numberPrompt(range, avoid)
  }
}
