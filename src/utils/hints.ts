import type { VocabularyItem } from '../types/vocabulary'

// Words that take "el" despite being grammatically feminine (start with
// stressed 'a' / 'ha'). Plural reverts to "las".
const EL_FEMININE = new Set([
  'agua', 'águila', 'alma', 'área', 'aula', 'hacha', 'hambre',
  'arma', 'ave', 'haba', 'asa', 'ancla',
])

// Common false friends — same spelling, different meaning from English.
const FALSE_FRIENDS: Record<string, string> = {
  embarazada: 'False friend: means "pregnant", not "embarrassed". Embarrassed = "avergonzada".',
  ropa: 'False friend: means "clothes", not "rope". Rope = "cuerda".',
  sopa: 'False friend: means "soup", not "soap". Soap = "jabón".',
  carpeta: 'False friend: means "folder", not "carpet". Carpet = "alfombra".',
  largo: 'False friend: means "long", not "large". Large = "grande".',
  éxito: 'False friend: means "success", not "exit". Exit = "salida".',
  pie: 'False friend: means "foot", not the pastry. Pie (food) = "pastel".',
  once: '"Once" means eleven in Spanish, not "one time".',
  red: '"Red" means net/network in Spanish; the colour red = "rojo".',
}

// Common irregular yo-forms / stem changers worth flagging.
export const IRREGULAR_VERBS: Record<string, string> = {
  tener: 'Irregular: yo tengo, tú tienes, él tiene… (e→ie stem change, plus -go yo form).',
  venir: 'Irregular: yo vengo, tú vienes… (e→ie stem change, plus -go yo form).',
  hacer: 'Irregular yo form: yo hago. Past tense is also irregular (hice, hiciste…).',
  poner: 'Irregular yo form: yo pongo.',
  salir: 'Irregular yo form: yo salgo.',
  decir: 'Irregular: yo digo, tú dices (e→i stem change, plus -go yo form).',
  ir:    'Highly irregular: voy, vas, va, vamos, vais, van.',
  ser:   'Irregular: soy, eres, es, somos, sois, son. Use for permanent traits.',
  estar: 'Irregular: estoy, estás, está, estamos, estáis, están. Use for states/locations.',
  ver:   'Irregular yo form: yo veo.',
  saber: 'Irregular yo form: yo sé.',
  poder: 'Stem-changing (o→ue): puedo, puedes, puede, podemos, podéis, pueden.',
  querer: 'Stem-changing (e→ie): quiero, quieres, quiere, queremos, queréis, quieren.',
  dormir: 'Stem-changing (o→ue): duermo, duermes, duerme, dormimos, dormís, duermen.',
  pedir: 'Stem-changing (e→i): pido, pides, pide, pedimos, pedís, piden.',
}

/**
 * Returns a short explanation of the word's quirk (gender exception,
 * false-friend trap, irregular conjugation), or null if nothing notable.
 */
export function getHint(item: VocabularyItem): string | null {
  const sp = item.spanish_word.toLowerCase().trim()

  // "el" + feminine noun (el agua, el águila…)
  const elMatch = sp.match(/^el\s+(\S+)/)
  if (elMatch && EL_FEMININE.has(elMatch[1])) {
    const noun = elMatch[1]
    return `"${noun}" is feminine, but takes "el" in the singular because it starts with a stressed "a-" sound (saying "la ${noun}" would clash). Plural is "las ${noun}s".`
  }

  // False friends — strip leading article for the lookup
  const bareNoun = sp.replace(/^(el|la|los|las|un|una)\s+/, '')
  if (FALSE_FRIENDS[bareNoun]) return FALSE_FRIENDS[bareNoun]

  // Irregular verbs (match infinitive form for verb-type items)
  if (item.type === 'verb' && IRREGULAR_VERBS[sp]) return IRREGULAR_VERBS[sp]

  // Generic: flag accent characters so the user knows the spelling is sensitive
  if (/[áéíóúñü]/.test(sp)) {
    return 'Watch the accent — Spanish accents are mandatory and change meaning (e.g. "tu" = your, "tú" = you).'
  }

  return null
}
