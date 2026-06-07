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

// Language rules tied to specific lesson phrases. Keyed by the Spanish exactly
// as it appears in the deck (lower-cased, ¿?¡! stripped — see lookup below).
// These teach the *rule*, not just the translation, when the word is drilled.
const PHRASE_RULES: Record<string, string> = {
  // gustar agreement: the verb matches the THING liked, not the person.
  'me gusta':   'Use "gusta" for ONE thing or an action: me gusta el vino, me gusta nadar. For more than one thing, switch to "gustan" → me gustan las tapas.',
  'no me gusta':'"gusta" = one thing/action. For several things use "gustan": no me gustan las patatas fritas.',
  'te gusta':   'Asking about ONE thing/action: ¿Te gusta beber vino? For more than one thing use "gustan" → ¿Te gustan las tapas?',
  'me gustan':  '"gustan" (plural) is for MORE THAN ONE thing: me gustan las tapas, me gustan las patatas fritas. One thing/action → "me gusta".',
  'te gustan':  '"gustan" (plural) asks about MORE THAN ONE thing: ¿Te gustan las patatas fritas? One thing → "te gusta".',
  'me encanta': 'Same agreement rule as gustar: "encanta" for one thing/action, "encantan" for several → me encantan las tapas.',
  'me encantan':'"encantan" (plural) — for several things. One thing/action → "me encanta".',
  // The -o ending marks the "yo" (I) form in the present tense.
  'quiero':     'The "-o" ending means "I" (yo) in the present: quier-o = I want. Change the ending for others: quieres = you want, quiere = he/she wants.',
  'odio':       'The "-o" ending means "I" (yo): odi-o = I hate. For "you" it becomes -as → ¿odias? = do you hate?',
  'te quiero':  '"quiero" is the yo (I) form of querer. Literally "I want you" → it means "I love you".',
  // Opinion + the thing/action — the sentence-building frame.
  'me da igual':   'A whole opinion phrase: "me da igual" = I don\'t mind. Add the action after it → en mi tiempo libre me da igual trabajar (opinion + the action).',
  'no me interesa':'Opinion phrase = "I\'m not interested in". Follow it with the action → no me interesa jugar en línea (opinion + the action).',
  'en mi tiempo libre': 'Sentence frame: "en mi tiempo libre" + your opinion + the activity, e.g. en mi tiempo libre me gusta nadar.',
  // "le" = he / she / it. Name the person with "a": A mi hermana le gusta…
  'le gusta':   '"le" = he/she likes. Name the person with "a": A mi hermana le gusta nadar. Still agrees with the thing → le gusta (one) / le gustan (several).',
  'le gustan':  '"le gustan" = he/she likes MORE THAN ONE thing: A tu hermano le gustan las bebidas. One thing/action → "le gusta".',
  'le encanta': '"le encanta" = he/she loves. Name the person with "a": A mi madre le encanta bailar. Several things → "le encantan".',
  'no le gusta':'"le" = he/she. Name the person with "a": A mi papá no le gusta trabajar. Several things → "no le gustan".',
  'le da igual':'"le da igual" = he/she doesn\'t mind. Name the person with "a": a mi hermano le da igual.',
  // ¿Qué te gusta hacer? — after gusta, use the plain infinitive (-ar/-er/-ir).
  '¿qué te gusta hacer?': 'After "gusta" use the infinitive (the -ar/-er/-ir form): me gusta nadar, me gusta leer, me gusta hacer malabares — not the yo form.',
  // The -o ending = "yo" (I); the infinitive ends in -ar/-er/-ir.
  'como':    'The "-o" ending = "I" (yo): com-o = I eat. The infinitive (to eat) is "comer". Use the infinitive after gusta: me gusta comer.',
  'bebo':    'The "-o" ending = "I" (yo): beb-o = I drink. Infinitive (to drink) = "beber". After gusta use the infinitive: me gusta beber.',
  'chateo':  'The "-o" ending = "I" (yo): chate-o = I chat. Infinitive = "chatear".',
  'nado':    'The "-o" ending = "I" (yo): nad-o = I swim. Infinitive = "nadar".',
  'trabajo': 'The "-o" ending = "I" (yo): trabaj-o = I work. Infinitive = "trabajar".',
  'juego':   'jugar is stem-changing (u→ue): yo jueg-o, tú juegas, él juega — but nosotros jugamos. The "-o" still marks "I".',
  // Adjectives agree with gender: -o (male) / -a (female).
  'vegetariano/a': 'Adjective agrees with you: a man says "soy vegetariano", a woman "soy vegetariana".',
  'vegano/a':      'Adjective agrees with you: "soy vegano" (man) / "soy vegana" (woman).',
}

/**
 * Returns a short explanation of the word's quirk (gender exception,
 * false-friend trap, irregular conjugation), or null if nothing notable.
 */
export function getHint(item: VocabularyItem): string | null {
  const sp = item.spanish_word.toLowerCase().trim()

  // Lesson language rules — match on the phrase with ¿?¡! stripped.
  const bare = sp.replace(/[¿?¡!.,;:]/g, '').trim()
  if (PHRASE_RULES[bare]) return PHRASE_RULES[bare]

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
