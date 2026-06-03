// Present-tense conjugations for the 15 irregular verbs flagged in
// src/utils/hints.ts. Persons used in the ladder mini-mode:
// yo / tú / él / nosotros / ellos.

export type Person = 'yo' | 'tú' | 'él' | 'nosotros' | 'ellos'

export const LADDER_PERSONS: Person[] = ['yo', 'tú', 'él', 'nosotros', 'ellos']

export const CONJUGATIONS: Record<string, Record<Person, string>> = {
  tener:  { yo: 'tengo',  tú: 'tienes',  él: 'tiene',  nosotros: 'tenemos',  ellos: 'tienen'  },
  venir:  { yo: 'vengo',  tú: 'vienes',  él: 'viene',  nosotros: 'venimos',  ellos: 'vienen'  },
  hacer:  { yo: 'hago',   tú: 'haces',   él: 'hace',   nosotros: 'hacemos',  ellos: 'hacen'   },
  poner:  { yo: 'pongo',  tú: 'pones',   él: 'pone',   nosotros: 'ponemos',  ellos: 'ponen'   },
  salir:  { yo: 'salgo',  tú: 'sales',   él: 'sale',   nosotros: 'salimos',  ellos: 'salen'   },
  decir:  { yo: 'digo',   tú: 'dices',   él: 'dice',   nosotros: 'decimos',  ellos: 'dicen'   },
  ir:     { yo: 'voy',    tú: 'vas',     él: 'va',     nosotros: 'vamos',    ellos: 'van'     },
  ser:    { yo: 'soy',    tú: 'eres',    él: 'es',     nosotros: 'somos',    ellos: 'son'     },
  estar:  { yo: 'estoy',  tú: 'estás',   él: 'está',   nosotros: 'estamos',  ellos: 'están'   },
  ver:    { yo: 'veo',    tú: 'ves',     él: 've',     nosotros: 'vemos',    ellos: 'ven'     },
  saber:  { yo: 'sé',     tú: 'sabes',   él: 'sabe',   nosotros: 'sabemos',  ellos: 'saben'   },
  poder:  { yo: 'puedo',  tú: 'puedes',  él: 'puede',  nosotros: 'podemos',  ellos: 'pueden'  },
  querer: { yo: 'quiero', tú: 'quieres', él: 'quiere', nosotros: 'queremos', ellos: 'quieren' },
  dormir: { yo: 'duermo', tú: 'duermes', él: 'duerme', nosotros: 'dormimos', ellos: 'duermen' },
  pedir:  { yo: 'pido',   tú: 'pides',   él: 'pide',   nosotros: 'pedimos',  ellos: 'piden'   },
}

export function listConjugatableVerbs(): string[] {
  return Object.keys(CONJUGATIONS)
}
