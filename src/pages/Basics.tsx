import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { XpWindow } from '../components/XpWindow'
import { speak, speechSupported } from '../utils/speak'

type CategoryId = 'family' | 'numbers' | 'food'
type Mode = 'browse' | 'practice'

interface Entry {
  spanish: string
  english: string
  note?: string
}

interface Category {
  id: CategoryId
  label: string
  icon: string
  blurb: string
  entries: Entry[]
}

const FAMILY: Entry[] = [
  { spanish: 'la familia', english: 'the family' },
  { spanish: 'los padres', english: 'the parents' },
  { spanish: 'el padre', english: 'father' },
  { spanish: 'la madre', english: 'mother' },
  { spanish: 'papá', english: 'dad' },
  { spanish: 'mamá', english: 'mum' },
  { spanish: 'el hijo', english: 'son' },
  { spanish: 'la hija', english: 'daughter' },
  { spanish: 'los hijos', english: 'children / sons' },
  { spanish: 'el hermano', english: 'brother' },
  { spanish: 'la hermana', english: 'sister' },
  { spanish: 'el abuelo', english: 'grandfather' },
  { spanish: 'la abuela', english: 'grandmother' },
  { spanish: 'el nieto', english: 'grandson' },
  { spanish: 'la nieta', english: 'granddaughter' },
  { spanish: 'el tío', english: 'uncle' },
  { spanish: 'la tía', english: 'aunt' },
  { spanish: 'el primo', english: 'cousin (m)' },
  { spanish: 'la prima', english: 'cousin (f)' },
  { spanish: 'el sobrino', english: 'nephew' },
  { spanish: 'la sobrina', english: 'niece' },
  { spanish: 'el esposo / el marido', english: 'husband' },
  { spanish: 'la esposa / la mujer', english: 'wife' },
  { spanish: 'el novio', english: 'boyfriend' },
  { spanish: 'la novia', english: 'girlfriend' },
  { spanish: 'el suegro', english: 'father-in-law' },
  { spanish: 'la suegra', english: 'mother-in-law' },
  { spanish: 'el cuñado', english: 'brother-in-law' },
  { spanish: 'la cuñada', english: 'sister-in-law' },
  { spanish: 'mi', english: 'my', note: 'e.g. mi hermano = my brother' },
  { spanish: 'tu', english: 'your (informal)' },
  { spanish: 'su', english: 'his / her / their' },
]

// Numbers: enough to cover the 1–1000 system without listing every integer.
// Patterns: 16–29 are usually one word (dieciséis, veintiuno…); 31+ uses
// "y" (treinta y uno). 200–900 agree in gender (doscientas casas).
const NUMBERS: Entry[] = [
  { spanish: 'cero', english: '0' },
  { spanish: 'uno', english: '1', note: 'becomes "un" before a masc. noun' },
  { spanish: 'dos', english: '2' },
  { spanish: 'tres', english: '3' },
  { spanish: 'cuatro', english: '4' },
  { spanish: 'cinco', english: '5' },
  { spanish: 'seis', english: '6' },
  { spanish: 'siete', english: '7' },
  { spanish: 'ocho', english: '8' },
  { spanish: 'nueve', english: '9' },
  { spanish: 'diez', english: '10' },
  { spanish: 'once', english: '11' },
  { spanish: 'doce', english: '12' },
  { spanish: 'trece', english: '13' },
  { spanish: 'catorce', english: '14' },
  { spanish: 'quince', english: '15' },
  { spanish: 'dieciséis', english: '16' },
  { spanish: 'diecisiete', english: '17' },
  { spanish: 'dieciocho', english: '18' },
  { spanish: 'diecinueve', english: '19' },
  { spanish: 'veinte', english: '20' },
  { spanish: 'veintiuno', english: '21', note: '21–29 are one word: veintidós, veintitrés…' },
  { spanish: 'veintidós', english: '22' },
  { spanish: 'treinta', english: '30' },
  { spanish: 'treinta y uno', english: '31', note: 'from 31 onwards use "y": cuarenta y dos…' },
  { spanish: 'cuarenta', english: '40' },
  { spanish: 'cincuenta', english: '50' },
  { spanish: 'sesenta', english: '60' },
  { spanish: 'setenta', english: '70' },
  { spanish: 'ochenta', english: '80' },
  { spanish: 'noventa', english: '90' },
  { spanish: 'cien', english: '100', note: 'becomes "ciento" before smaller numbers: ciento uno = 101' },
  { spanish: 'ciento uno', english: '101' },
  { spanish: 'doscientos', english: '200', note: '200–900 agree in gender: doscientas casas' },
  { spanish: 'trescientos', english: '300' },
  { spanish: 'cuatrocientos', english: '400' },
  { spanish: 'quinientos', english: '500', note: 'irregular — not "cincocientos"' },
  { spanish: 'seiscientos', english: '600' },
  { spanish: 'setecientos', english: '700', note: 'irregular — not "sietecientos"' },
  { spanish: 'ochocientos', english: '800' },
  { spanish: 'novecientos', english: '900', note: 'irregular — not "nuevecientos"' },
  { spanish: 'mil', english: '1000', note: 'no "un" — just "mil"' },
]

const FOOD: Entry[] = [
  // Meals & general
  { spanish: 'la comida', english: 'food / meal' },
  { spanish: 'el desayuno', english: 'breakfast' },
  { spanish: 'el almuerzo / la comida', english: 'lunch' },
  { spanish: 'la cena', english: 'dinner' },
  { spanish: 'el plato', english: 'dish / plate' },
  { spanish: 'el restaurante', english: 'restaurant' },
  { spanish: 'la cuenta', english: 'the bill' },
  // Drinks
  { spanish: 'la bebida', english: 'drink' },
  { spanish: 'el agua', english: 'water', note: 'feminine but uses "el" in singular' },
  { spanish: 'el café', english: 'coffee' },
  { spanish: 'el té', english: 'tea' },
  { spanish: 'la leche', english: 'milk' },
  { spanish: 'el zumo / el jugo', english: 'juice' },
  { spanish: 'el vino', english: 'wine' },
  { spanish: 'la cerveza', english: 'beer' },
  { spanish: 'el refresco', english: 'soft drink' },
  // Staples
  { spanish: 'el pan', english: 'bread' },
  { spanish: 'el queso', english: 'cheese' },
  { spanish: 'el huevo', english: 'egg' },
  { spanish: 'el arroz', english: 'rice' },
  { spanish: 'la pasta', english: 'pasta' },
  { spanish: 'la sopa', english: 'soup' },
  { spanish: 'la ensalada', english: 'salad' },
  { spanish: 'la mantequilla', english: 'butter' },
  { spanish: 'el aceite', english: 'oil' },
  { spanish: 'la sal', english: 'salt' },
  { spanish: 'el azúcar', english: 'sugar' },
  // Meat & fish
  { spanish: 'la carne', english: 'meat' },
  { spanish: 'el pollo', english: 'chicken' },
  { spanish: 'la ternera', english: 'beef' },
  { spanish: 'el cerdo', english: 'pork' },
  { spanish: 'el jamón', english: 'ham' },
  { spanish: 'el pescado', english: 'fish (to eat)' },
  // Fruit & veg
  { spanish: 'la fruta', english: 'fruit' },
  { spanish: 'la manzana', english: 'apple' },
  { spanish: 'la naranja', english: 'orange' },
  { spanish: 'el plátano', english: 'banana' },
  { spanish: 'la fresa', english: 'strawberry' },
  { spanish: 'el tomate', english: 'tomato' },
  { spanish: 'la patata / la papa', english: 'potato' },
  { spanish: 'la cebolla', english: 'onion' },
  { spanish: 'el ajo', english: 'garlic' },
  // Useful phrases
  { spanish: 'tengo hambre', english: 'I am hungry' },
  { spanish: 'tengo sed', english: 'I am thirsty' },
  { spanish: 'quisiera…', english: 'I would like…' },
  { spanish: 'la cuenta, por favor', english: 'the bill, please' },
]

const CATEGORIES: Category[] = [
  {
    id: 'family',
    label: 'Family',
    icon: '👨‍👩‍👧',
    blurb: 'Describe the people in your life — parents, siblings, in-laws.',
    entries: FAMILY,
  },
  {
    id: 'numbers',
    label: 'Numbers (0–1000)',
    icon: '🔢',
    blurb: 'The full counting system, plus the patterns that get you anywhere up to 1000.',
    entries: NUMBERS,
  },
  {
    id: 'food',
    label: 'Food & Drink',
    icon: '🍽️',
    blurb: 'Meals, staples, drinks, and a few phrases for ordering.',
    entries: FOOD,
  },
]

function norm(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[¿?¡!.,;:]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// Accept "la madre", "madre", or either side of "el zumo / el jugo".
function isMatch(typed: string, target: string): boolean {
  const t = norm(typed)
  if (!t) return false
  const options = target.split('/').map((s) => s.trim())
  for (const opt of options) {
    const full = norm(opt)
    const stripped = norm(opt.replace(/^(el |la |los |las )/i, ''))
    if (t === full || t === stripped) return true
  }
  return false
}

export function Basics() {
  const navigate = useNavigate()
  const [activeId, setActiveId] = useState<CategoryId | null>(null)
  const [mode, setMode] = useState<Mode>('browse')

  const active = useMemo(
    () => CATEGORIES.find((c) => c.id === activeId) ?? null,
    [activeId],
  )

  if (!active) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px', width: '100%' }}>
        <XpWindow title="Basics" icon="🌱" width="min(560px, 100%)" onClose={() => navigate('/dashboard')}>
          <p style={{ fontSize: '12px', color: '#888', marginTop: 0, marginBottom: '14px' }}>
            Core building blocks — pick a topic to browse the vocab or jump straight into practice.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                className="xp-btn xp-btn-large"
                style={{ width: '100%', textAlign: 'left', padding: '12px 16px' }}
                onClick={() => { setActiveId(c.id); setMode('browse') }}
              >
                <div style={{ fontSize: '16px', marginBottom: '4px' }}>{c.icon} {c.label}</div>
                <div style={{ fontSize: '12px', fontWeight: 'normal', color: '#444' }}>{c.blurb}</div>
              </button>
            ))}
          </div>
          <button className="xp-btn" style={{ marginTop: '14px' }} onClick={() => navigate('/dashboard')}>
            ← Dashboard
          </button>
        </XpWindow>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px', width: '100%' }}>
      <XpWindow
        title={`Basics — ${active.label}`}
        icon={active.icon}
        width="min(620px, 100%)"
        onClose={() => navigate('/dashboard')}
        style={{ flex: 1, maxHeight: 'none' }}
      >
        <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
          <button
            className={`xp-btn${mode === 'browse' ? ' xp-btn-primary' : ''}`}
            style={{ flex: 1 }}
            onClick={() => setMode('browse')}
          >
            📖 Browse
          </button>
          <button
            className={`xp-btn${mode === 'practice' ? ' xp-btn-primary' : ''}`}
            style={{ flex: 1 }}
            onClick={() => setMode('practice')}
          >
            ✍️ Practice
          </button>
          <button className="xp-btn" onClick={() => setActiveId(null)}>← Topics</button>
        </div>

        {mode === 'browse' ? <BrowseList entries={active.entries} /> : <Practice entries={active.entries} />}
      </XpWindow>
    </div>
  )
}

function BrowseList({ entries }: { entries: Entry[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {entries.map((e, i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 10px',
            border: '1px solid var(--color-button-shadow)',
            borderRadius: '4px',
            background: 'rgba(255,255,255,0.03)',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: '14px', color: 'var(--color-accent)', fontWeight: 'bold' }}>{e.spanish}</div>
            <div style={{ fontSize: '12px', color: '#bbb' }}>{e.english}</div>
            {e.note && <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>💡 {e.note}</div>}
          </div>
          {speechSupported && (
            <button
              className="xp-btn"
              style={{ fontSize: '11px', padding: '4px 8px' }}
              onClick={() => speak(e.spanish.split('/')[0].trim())}
              title="Hear it"
            >🔊</button>
          )}
        </div>
      ))}
    </div>
  )
}

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

function Practice({ entries }: { entries: Entry[] }) {
  const [order, setOrder] = useState<Entry[]>(() => shuffle(entries))
  const [idx, setIdx] = useState(0)
  const [typed, setTyped] = useState('')
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null)
  const [correct, setCorrect] = useState(0)
  const [seen, setSeen] = useState(0)

  if (idx >= order.length) {
    const pct = seen > 0 ? Math.round((correct / seen) * 100) : 0
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center', padding: '12px' }}>
        <div style={{ fontSize: '15px', color: 'var(--color-accent)' }}>
          ¡Bien hecho! {correct} / {seen} ({pct}%)
        </div>
        <button
          className="xp-btn xp-btn-primary"
          onClick={() => {
            setOrder(shuffle(entries))
            setIdx(0); setTyped(''); setFeedback(null); setCorrect(0); setSeen(0)
          }}
        >🔄 Go again</button>
      </div>
    )
  }

  const item = order[idx]

  function submit() {
    if (feedback) {
      setFeedback(null)
      setTyped('')
      setIdx((i) => i + 1)
      return
    }
    if (!typed.trim()) return
    const ok = isMatch(typed, item.spanish)
    setFeedback(ok ? 'correct' : 'incorrect')
    if (ok) setCorrect((c) => c + 1)
    setSeen((s) => s + 1)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ fontSize: '12px', color: '#888' }}>
        {idx + 1} of {order.length} · {correct}/{seen} correct
      </div>
      <div style={{ fontSize: '22px', color: 'var(--color-accent)', textAlign: 'center', padding: '14px 0' }}>
        {item.english}
      </div>
      <div style={{ display: 'flex', gap: '4px' }}>
        <input
          value={typed}
          disabled={feedback !== null}
          placeholder="Type in Spanish…"
          autoFocus
          onChange={(e) => setTyped(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') submit() }}
          style={{
            flex: 1, padding: '8px 10px', fontSize: '14px',
            background: '#1a1a1a',
            border: `2px solid ${feedback === 'correct' ? '#4caf50' : feedback === 'incorrect' ? '#e53935' : 'var(--color-accent)'}`,
            borderRadius: '3px', color: '#fff', outline: 'none', boxSizing: 'border-box',
          }}
        />
        <button className="xp-btn xp-btn-primary" disabled={!feedback && !typed.trim()} onClick={submit}>
          {feedback ? 'Next →' : 'Check'}
        </button>
      </div>
      {feedback === 'correct' && (
        <div style={{ fontSize: '13px', color: '#4caf50' }}>✓ {item.spanish}</div>
      )}
      {feedback === 'incorrect' && (
        <div style={{ fontSize: '13px', color: '#e53935' }}>✗ Correct: <strong>{item.spanish}</strong></div>
      )}
      {item.note && feedback && (
        <div style={{ fontSize: '11px', color: '#888' }}>💡 {item.note}</div>
      )}
      {speechSupported && feedback && (
        <button
          className="xp-btn"
          style={{ fontSize: '11px', alignSelf: 'flex-start' }}
          onClick={() => speak(item.spanish.split('/')[0].trim())}
        >🔊 Hear it</button>
      )}
      <button
        className="xp-btn"
        style={{ fontSize: '11px', alignSelf: 'flex-end' }}
        onClick={() => { if (!feedback) { setSeen((s) => s + 1); } setFeedback(null); setTyped(''); setIdx((i) => i + 1) }}
      >Skip →</button>
    </div>
  )
}
