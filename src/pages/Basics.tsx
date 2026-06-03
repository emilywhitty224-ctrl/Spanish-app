import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { XpWindow } from '../components/XpWindow'
import { speak, speechSupported, recognitionSupported, startListening, describeRecognitionError } from '../utils/speak'

type CategoryId = 'family' | 'numbers' | 'food'
type Mode = 'browse' | 'practice' | 'challenge'

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

function numberToSpanish(n: number): string {
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

const CHALLENGE_RANGES = {
  easy:   [1,   20] as const,
  medium: [1,  100] as const,
  hard:   [1, 1000] as const,
}
type ChallengeRange = keyof typeof CHALLENGE_RANGES

function randomNum(range: ChallengeRange, avoid?: number): number {
  const [min, max] = CHALLENGE_RANGES[range]
  let n: number
  do { n = Math.floor(Math.random() * (max - min + 1)) + min } while (n === avoid)
  return n
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
          {active.id === 'numbers' && (
            <button
              className={`xp-btn${mode === 'challenge' ? ' xp-btn-primary' : ''}`}
              style={{ flex: 1 }}
              onClick={() => setMode('challenge')}
            >
              🔢 Challenge
            </button>
          )}
          <button className="xp-btn" onClick={() => setActiveId(null)}>← Topics</button>
        </div>

        {mode === 'browse' && <BrowseList entries={active.entries} />}
        {mode === 'practice' && <Practice entries={active.entries} />}
        {mode === 'challenge' && <NumberChallenge />}
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
  const [listening, setListening] = useState(false)
  const [micError, setMicError] = useState<string | null>(null)
  const stopRef = useRef<(() => void) | null>(null)

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
  const pct = order.length > 0 ? Math.round((idx / order.length) * 100) : 0

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
      {/* Progress bar */}
      <div style={{ height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: 'var(--color-accent)', transition: 'width 0.3s' }} />
      </div>
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
          placeholder={listening ? '🎤 Listening…' : 'Type in Spanish…'}
          autoFocus
          onChange={(e) => setTyped(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') submit() }}
          style={{
            flex: 1, padding: '8px 10px', fontSize: '14px',
            background: '#1a1a1a',
            border: `2px solid ${feedback === 'correct' ? '#4caf50' : feedback === 'incorrect' ? '#e53935' : listening ? '#2196f3' : 'var(--color-accent)'}`,
            borderRadius: '3px', color: '#fff', outline: 'none', boxSizing: 'border-box',
          }}
        />
        {recognitionSupported && (
          <button
            className={`xp-btn${listening ? ' mic-listening' : ''}`}
            disabled={feedback !== null}
            title="Speak in Spanish"
            style={{
              minWidth: 'auto', padding: '4px 10px',
              border: `2px solid ${listening ? '#2196f3' : 'var(--color-accent)'}`,
              color: listening ? '#2196f3' : undefined,
            }}
            onClick={() => {
              if (listening) {
                stopRef.current?.()
                setListening(false)
                return
              }
              setMicError(null)
              setListening(true)
              stopRef.current = startListening(
                (text, isFinal) => {
                  setTyped(text)
                  if (isFinal) setListening(false)
                },
                (err) => {
                  setListening(false)
                  if (err) {
                    const m = describeRecognitionError(err)
                    if (m) setMicError(m)
                  }
                },
                'es-ES',
              )
            }}
          >{listening ? '⏹' : '🎤'}</button>
        )}
        <button className="xp-btn xp-btn-primary" disabled={!feedback && !typed.trim()} onClick={submit}>
          {feedback ? 'Next →' : 'Check'}
        </button>
      </div>
      {micError && <div style={{ fontSize: '11px', color: '#ff9800' }}>🎤 {micError}</div>}
      {feedback === 'correct' && (
        <div style={{ fontSize: '13px', color: '#4caf50' }}>✓ {item.spanish}</div>
      )}
      {feedback === 'incorrect' && (
        <div style={{ fontSize: '13px', color: '#e53935' }}>
          ✗{typed.trim() && (
            <> <span style={{ textDecoration: 'line-through', opacity: 0.7 }}>{typed}</span> → </>
          )}
          <strong>{item.spanish}</strong>
        </div>
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
        onClick={() => { stopRef.current?.(); setListening(false); if (!feedback) { setSeen((s) => s + 1); } setFeedback(null); setTyped(''); setIdx((i) => i + 1) }}
      >Skip →</button>
    </div>
  )
}

function NumberChallenge() {
  const [range, setRange] = useState<ChallengeRange>('easy')
  const [current, setCurrent] = useState<number>(() => randomNum('easy'))
  const [typed, setTyped] = useState('')
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null)
  const [correct, setCorrect] = useState(0)
  const [total, setTotal] = useState(0)
  const [listening, setListening] = useState(false)
  const [micError, setMicError] = useState<string | null>(null)
  const stopRef = useRef<(() => void) | null>(null)

  const answer = numberToSpanish(current)

  function next(r: ChallengeRange = range) {
    stopRef.current?.()
    setListening(false)
    setCurrent(randomNum(r, current))
    setTyped('')
    setFeedback(null)
  }

  function changeRange(r: ChallengeRange) {
    setRange(r)
    next(r)
  }

  function submit() {
    if (feedback) { next(); return }
    if (!typed.trim()) return
    const ok = norm(typed) === norm(answer)
    setFeedback(ok ? 'correct' : 'incorrect')
    setCorrect((c) => c + (ok ? 1 : 0))
    setTotal((t) => t + 1)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Range selector */}
      <div style={{ display: 'flex', gap: '6px' }}>
        {(['easy', 'medium', 'hard'] as ChallengeRange[]).map((r) => (
          <button
            key={r}
            className={`xp-btn${range === r ? ' xp-btn-primary' : ''}`}
            style={{ flex: 1, fontSize: '12px' }}
            onClick={() => changeRange(r)}
          >
            {r === 'easy' ? '1–20' : r === 'medium' ? '1–100' : '1–1000'}
          </button>
        ))}
      </div>

      {/* Score */}
      <div style={{ fontSize: '12px', color: '#888' }}>
        {total > 0 ? `${correct}/${total} correct` : 'Write the number in Spanish'}
      </div>

      {/* The number */}
      <div style={{
        fontSize: '56px', fontWeight: 'bold', color: 'var(--color-accent)',
        textAlign: 'center', padding: '16px 0', letterSpacing: '-1px',
      }}>
        {current}
      </div>

      {/* Input row */}
      <div style={{ display: 'flex', gap: '4px' }}>
        <input
          value={typed}
          disabled={feedback !== null}
          placeholder={listening ? '🎤 Listening…' : 'Type in Spanish…'}
          autoFocus
          onChange={(e) => setTyped(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') submit() }}
          style={{
            flex: 1, padding: '8px 10px', fontSize: '14px',
            background: '#1a1a1a',
            border: `2px solid ${feedback === 'correct' ? '#4caf50' : feedback === 'incorrect' ? '#e53935' : listening ? '#2196f3' : 'var(--color-accent)'}`,
            borderRadius: '3px', color: '#fff', outline: 'none', boxSizing: 'border-box',
          }}
        />
        {recognitionSupported && (
          <button
            className={`xp-btn${listening ? ' mic-listening' : ''}`}
            disabled={feedback !== null}
            title="Speak in Spanish"
            style={{
              minWidth: 'auto', padding: '4px 10px',
              border: `2px solid ${listening ? '#2196f3' : 'var(--color-accent)'}`,
              color: listening ? '#2196f3' : undefined,
            }}
            onClick={() => {
              if (listening) { stopRef.current?.(); setListening(false); return }
              setMicError(null)
              setListening(true)
              stopRef.current = startListening(
                (text, isFinal) => { setTyped(text); if (isFinal) setListening(false) },
                (err) => {
                  setListening(false)
                  if (err) { const m = describeRecognitionError(err); if (m) setMicError(m) }
                },
                'es-ES',
              )
            }}
          >{listening ? '⏹' : '🎤'}</button>
        )}
        <button className="xp-btn xp-btn-primary" disabled={!feedback && !typed.trim()} onClick={submit}>
          {feedback ? 'Next →' : 'Check'}
        </button>
      </div>

      {micError && <div style={{ fontSize: '11px', color: '#ff9800' }}>🎤 {micError}</div>}

      {feedback === 'correct' && (
        <div style={{ fontSize: '14px', color: '#4caf50' }}>✓ {answer}</div>
      )}
      {feedback === 'incorrect' && (
        <div style={{ fontSize: '14px', color: '#e53935' }}>
          ✗{typed.trim() && (
            <> <span style={{ textDecoration: 'line-through', opacity: 0.7 }}>{typed}</span> → </>
          )}
          <strong>{answer}</strong>
        </div>
      )}

      {speechSupported && feedback && (
        <button
          className="xp-btn"
          style={{ fontSize: '11px', alignSelf: 'flex-start' }}
          onClick={() => speak(answer)}
        >🔊 Hear it</button>
      )}

      <button
        className="xp-btn"
        style={{ fontSize: '11px', alignSelf: 'flex-end' }}
        onClick={() => next()}
      >Skip →</button>
    </div>
  )
}
