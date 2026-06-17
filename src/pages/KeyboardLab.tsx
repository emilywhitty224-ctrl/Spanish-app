import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { XpWindow } from '../components/XpWindow'
import { useStore, type SrsEntry } from '../store/useStore'

// Spanish (Spain) ISO layout. `base` is the unshifted face; `shift`/`alt`
// (AltGr) are the secondary faces printed on the same key. `diff: true` marks
// the keys you actually reach for to type Spanish (accents, ñ, ç, ¿/¡ and the
// @/" on the 2 key) — those get highlighted in the diagram.
interface KeyDef {
  base: string
  shift?: string
  alt?: string
  diff?: boolean
}

const ROWS: KeyDef[][] = [
  [
    { base: 'º', shift: 'ª', alt: '\\' },
    { base: '1', shift: '!', alt: '|' },
    { base: '2', shift: '"', alt: '@', diff: true },
    { base: '3', shift: '·', alt: '#' },
    { base: '4', shift: '$', alt: '~' },
    { base: '5', shift: '%' },
    { base: '6', shift: '&', alt: '¬' },
    { base: '7', shift: '/' },
    { base: '8', shift: '(' },
    { base: '9', shift: ')' },
    { base: '0', shift: '=' },
    { base: "'", shift: '?' },
    { base: '¡', shift: '¿', diff: true },
  ],
  [
    { base: 'q' }, { base: 'w' }, { base: 'e', alt: '€' }, { base: 'r' },
    { base: 't' }, { base: 'y' }, { base: 'u' }, { base: 'i' },
    { base: 'o' }, { base: 'p' },
    { base: '`', shift: '^', alt: '[' },
    { base: '+', shift: '*', alt: ']' },
  ],
  [
    { base: 'a' }, { base: 's' }, { base: 'd' }, { base: 'f' },
    { base: 'g' }, { base: 'h' }, { base: 'j' }, { base: 'k' }, { base: 'l' },
    { base: 'ñ', diff: true },
    { base: '´', shift: '¨', alt: '{', diff: true },
    { base: 'ç', shift: 'Ç', alt: '}', diff: true },
  ],
  [
    { base: '<', shift: '>' },
    { base: 'z' }, { base: 'x' }, { base: 'c' }, { base: 'v' },
    { base: 'b' }, { base: 'n' }, { base: 'm' },
    { base: ',', shift: ';' },
    { base: '.', shift: ':' },
    { base: '-', shift: '_' },
  ],
]

interface CheatRow {
  want: string
  how: string
}

const CHEAT_SHEET: CheatRow[] = [
  { want: 'ñ', how: 'The Ñ key (right of L)' },
  { want: 'á é í ó ú', how: 'Press the ´ dead key (right of Ñ), then the vowel' },
  { want: 'ü', how: 'Shift + ´ (gives ¨), then u' },
  { want: '¿', how: 'Shift + the ¡¿ key (top-right of number row)' },
  { want: '¡', how: 'The ¡¿ key (top-right of number row)' },
  { want: 'ç', how: 'The Ç key (right of the ´ dead key)' },
  { want: '@', how: 'AltGr + 2' },
  { want: '"', how: 'Shift + 2' },
]

// How to type each special character on the Spanish (Spain) layout.
const KEYSTROKE: Record<string, string> = {
  á: 'press ´ then a',
  é: 'press ´ then e',
  í: 'press ´ then i',
  ó: 'press ´ then o',
  ú: 'press ´ then u',
  ü: 'Shift + ´ (¨) then u',
  ñ: 'the Ñ key',
  ç: 'the Ç key',
  '¿': 'Shift + ¡¿',
  '¡': 'the ¡¿ key',
}

// ~15 targets focused on accents, ñ, ü and ¿/¡.
const DECK = [
  'mañana',
  '¿cómo estás?',
  'corazón',
  'pingüino',
  'español',
  'niño',
  '¡hola!',
  'sí',
  '¿qué?',
  'cumpleaños',
  'bilingüe',
  '¿dónde?',
  'lección',
  'señor',
  '¡adiós!',
]

// Distinct special chars in a target, in order of first appearance.
function hintsFor(target: string): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const ch of target) {
    if (KEYSTROKE[ch] && !seen.has(ch)) {
      seen.add(ch)
      out.push(`${ch} → ${KEYSTROKE[ch]}`)
    }
  }
  return out
}

// Drill targets live in the shared SRS map under this prefix so they reuse the
// store's scheduling/accuracy without colliding with real vocab ids (and stay
// invisible to the Dashboard's vocab-based lists).
const KBD_PREFIX = 'kbd:'
const kbdId = (target: string) => KBD_PREFIX + target

// Order the deck the same way the SRS picks vocab: overdue/due (weakest first)
// → never-seen → upcoming. Mirrors pickDueFirst + weakestFirst on the shared
// srs slice rather than a parallel store.
function orderDeck(srs: Record<string, SrsEntry> | undefined): string[] {
  const safe = srs ?? {}
  const t = new Date().toISOString().slice(0, 10)
  const acc = (target: string) => {
    const e = safe[kbdId(target)]
    return (e?.correct ?? 0) / (e?.seen ?? 1)
  }
  const due: string[] = []
  const fresh: string[] = []
  const upcoming: string[] = []
  for (const target of DECK) {
    const e = safe[kbdId(target)]
    if (!e) fresh.push(target)
    else if (e.nextReview <= t) due.push(target)
    else upcoming.push(target)
  }
  due.sort((a, b) => acc(a) - acc(b))
  upcoming.sort((a, b) =>
    (safe[kbdId(a)]!.nextReview).localeCompare(safe[kbdId(b)]!.nextReview),
  )
  return [...due, ...fresh, ...upcoming]
}

export function KeyboardLab() {
  const navigate = useNavigate()

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '8px',
      width: '100%',
    }}>
      <XpWindow title="Ladra Conmigo — Keyboard Lab" icon="⌨️" width="min(680px, 100%)" style={{ flex: 1, maxHeight: 'none' }}>
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{
            marginBottom: '16px',
            paddingBottom: '8px',
            borderBottom: '1px solid var(--color-button-shadow)',
          }}>
            <h2 style={{
              fontFamily: 'var(--font-ui)',
              fontSize: '17px',
              color: 'var(--color-accent)',
              margin: 0,
            }}>
              ⌨️ Spanish (Spain) keyboard
            </h2>
            <p style={{ fontSize: '12px', color: '#aaa', marginTop: '4px' }}>
              Switch macOS to the <strong>Spanish (Spain) ISO</strong> input source, and your
              UK keys produce the characters on your cover. The <strong>highlighted</strong> keys
              below are the ones you reach for to type Spanish — accents, ñ, ç and ¿/¡. Each key
              shows its <strong>Shift</strong> (top-right) and <strong>AltGr</strong> (bottom-right)
              faces too.
            </p>
          </div>

          {/* Keyboard diagram */}
          <div style={{
            border: '1px solid var(--color-button-shadow)',
            borderRadius: '6px',
            padding: '10px',
            background: 'rgba(255,255,255,0.03)',
            marginBottom: '16px',
            overflowX: 'auto',
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', minWidth: 'fit-content' }}>
              {ROWS.map((row, i) => (
                <div key={i} style={{ display: 'flex', gap: '5px', justifyContent: 'center' }}>
                  {row.map((key) => (
                    <Key key={key.base} def={key} />
                  ))}
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '14px', marginTop: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Legend swatch="var(--color-accent)" text="Spanish accents & punctuation" />
              <Legend swatch="transparent" text="Same position as UK" />
            </div>
          </div>

          {/* Cheat sheet */}
          <div style={{
            border: '1px solid var(--color-button-shadow)',
            borderRadius: '6px',
            padding: '10px 12px',
            background: 'rgba(255,255,255,0.03)',
          }}>
            <div style={{ fontSize: '11px', color: '#888', letterSpacing: '0.5px', marginBottom: '8px' }}>
              SPANISH vs UK — HOW TO TYPE IT
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {CHEAT_SHEET.map((row) => (
                <div key={row.want} style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: '12px',
                  fontSize: '13px',
                  paddingBottom: '6px',
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                }}>
                  <span style={{
                    color: 'var(--color-accent)',
                    fontWeight: 'bold',
                    minWidth: '90px',
                    fontFamily: 'monospace',
                  }}>
                    {row.want}
                  </span>
                  <span style={{ color: '#bbb' }}>{row.how}</span>
                </div>
              ))}
            </div>
            <p style={{ fontSize: '11px', color: '#888', marginTop: '10px', marginBottom: 0 }}>
              💡 A <strong>dead key</strong> shows nothing until you press the next key — tap
              ´ then a to get á.
            </p>
          </div>

          <DrillPanel />

          <div style={{ marginTop: 'auto', paddingTop: '12px' }}>
            <button
              className="xp-btn"
              style={{ fontSize: '11px' }}
              onClick={() => navigate('/dashboard')}
            >
              ← Back to Dashboard
            </button>
          </div>
        </div>
      </XpWindow>
    </div>
  )
}

function DrillPanel() {
  const reviewWord = useStore((s) => s.reviewWord)
  const recordResult = useStore((s) => s.recordResult)
  const bestKbd = useStore((s) => s.stats.bestScores['keyboard-lab'])

  // Deck order is fixed for the life of a session (weak/due targets first),
  // snapshotted from the SRS map when the session starts.
  const [order, setOrder] = useState<string[]>(() => orderDeck(useStore.getState().srs))
  const [idx, setIdx] = useState(0)
  const [input, setInput] = useState('')
  // Indices solved / acted-on this session (so we don't double-count).
  const [solved, setSolved] = useState<Set<number>>(new Set())
  const [attempted, setAttempted] = useState<Set<number>>(new Set())
  const [summary, setSummary] = useState<{ correct: number; total: number; pct: number } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const target = order[idx]
  const hints = useMemo(() => hintsFor(target), [target])
  const isCorrect = input === target

  // First index where the typed input diverges from the target (-1 if none yet).
  const firstError = useMemo(() => {
    for (let i = 0; i < input.length; i++) {
      if (input[i] !== target[i]) return i
    }
    return -1
  }, [input, target])

  function commitIfCorrect(value: string) {
    if (value === target && !solved.has(idx)) {
      setSolved((prev) => new Set(prev).add(idx))
    }
  }

  // Leaving a card records its SRS review once: solved → remembered, skipped
  // (or fumbled) → a miss, so weak targets resurface sooner next session.
  function leaveCard(step: number) {
    if (!attempted.has(idx)) {
      const ok = solved.has(idx)
      reviewWord(
        kbdId(target),
        ok,
        ok ? undefined : { typed: input.trim(), expected: target },
      )
      setAttempted((prev) => new Set(prev).add(idx))
    }
    advance(step)
  }

  function advance(step: number) {
    const next = (idx + step + order.length) % order.length
    setIdx(next)
    setInput('')
    setSummary(null)
    inputRef.current?.focus()
  }

  // End the session like a campaign: fold the score into stats/streak/best.
  function finishSession() {
    const correct = solved.size
    const total = attempted.size
    if (total === 0) return
    recordResult('keyboard-lab', correct, total)
    setSummary({ correct, total, pct: Math.round((correct / total) * 100) })
    // Fresh session: re-order from the now-updated SRS so weak targets lead.
    setOrder(orderDeck(useStore.getState().srs))
    setIdx(0)
    setInput('')
    setSolved(new Set())
    setAttempted(new Set())
  }

  return (
    <div style={{
      border: '1px solid var(--color-button-shadow)',
      borderRadius: '6px',
      padding: '12px',
      background: 'rgba(255,255,255,0.03)',
      marginTop: '16px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '10px' }}>
        <div style={{ fontSize: '11px', color: '#888', letterSpacing: '0.5px' }}>
          TYPING DRILL
        </div>
        <div style={{ fontSize: '12px', color: 'var(--color-accent)', fontWeight: 'bold' }}>
          {solved.size} / {attempted.size} correct
        </div>
      </div>

      <p style={{ fontSize: '12px', color: '#aaa', marginTop: 0, marginBottom: '10px' }}>
        Type this with your Spanish input source on · card {idx + 1} of {order.length}
        {bestKbd !== undefined && ` · best ${bestKbd}%`}
      </p>

      {summary && (
        <div style={{
          fontSize: '12px',
          color: '#4caf50',
          fontWeight: 'bold',
          marginBottom: '10px',
        }}>
          🎉 Session saved: {summary.correct} / {summary.total} ({summary.pct}%). Counted toward your streak.
        </div>
      )}

      {/* Target with per-character feedback overlaid as you type. */}
      <div style={{
        fontFamily: 'monospace',
        fontSize: '22px',
        letterSpacing: '1px',
        textAlign: 'center',
        padding: '12px',
        marginBottom: '10px',
        borderRadius: '4px',
        background: 'rgba(0,0,0,0.15)',
      }}>
        {target.split('').map((ch, i) => {
          let color = '#888' // not yet typed
          if (firstError === -1 && i < input.length) color = '#4caf50' // correct so far
          else if (firstError !== -1 && i < firstError) color = '#4caf50'
          else if (i === firstError) color = '#e53935' // first wrong char
          return (
            <span key={i} style={{ color }}>{ch === ' ' ? '␣' : ch}</span>
          )
        })}
        {/* Extra typed characters past the target length are errors too. */}
        {input.length > target.length && (
          <span style={{ color: '#e53935' }}>{'·'.repeat(input.length - target.length)}</span>
        )}
      </div>

      <input
        ref={inputRef}
        value={input}
        autoFocus
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        placeholder="Type here…"
        onChange={(e) => {
          setInput(e.target.value)
          commitIfCorrect(e.target.value)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && isCorrect) leaveCard(1)
        }}
        style={{
          width: '100%',
          boxSizing: 'border-box',
          fontFamily: 'monospace',
          fontSize: '16px',
          padding: '8px 10px',
          borderRadius: '4px',
          border: `2px solid ${isCorrect ? '#4caf50' : 'var(--color-button-shadow)'}`,
          background: 'rgba(255,255,255,0.06)',
          color: '#eee',
        }}
      />

      <div style={{ minHeight: '18px', marginTop: '6px' }}>
        {isCorrect && (
          <span style={{ fontSize: '12px', color: '#4caf50', fontWeight: 'bold' }}>
            ✓ ¡Correcto! Press Enter or Next.
          </span>
        )}
      </div>

      {/* Keystroke hints for this target's special characters. */}
      {hints.length > 0 && (
        <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {hints.map((h) => (
            <span key={h} style={{
              fontSize: '11px',
              fontFamily: 'monospace',
              color: '#bbb',
              border: '1px solid var(--color-button-shadow)',
              borderRadius: '4px',
              padding: '2px 7px',
              background: 'rgba(255,255,255,0.04)',
            }}>
              {h}
            </span>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
        <button className="xp-btn" style={{ flex: 1 }} onClick={() => leaveCard(1)}>
          Skip →
        </button>
        <button
          className="xp-btn"
          style={{ flex: 1 }}
          disabled={!isCorrect}
          onClick={() => leaveCard(1)}
        >
          Next →
        </button>
        <button
          className="xp-btn"
          style={{ flex: 1 }}
          disabled={attempted.size === 0}
          onClick={finishSession}
          title="Save this session to your stats & streak"
        >
          Finish ✓
        </button>
      </div>
    </div>
  )
}

function Key({ def }: { def: KeyDef }) {
  const highlight = !!def.diff
  return (
    <div style={{
      position: 'relative',
      minWidth: '38px',
      height: '38px',
      boxSizing: 'border-box',
      padding: '2px 4px',
      borderRadius: '4px',
      fontFamily: 'monospace',
      border: highlight
        ? '2px solid var(--color-accent)'
        : '1px solid var(--color-button-shadow)',
      background: highlight ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.02)',
    }}>
      {/* Base face, centred. */}
      <div style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '14px',
        color: highlight ? 'var(--color-accent)' : '#ddd',
        fontWeight: highlight ? 'bold' : 'normal',
      }}>
        {def.base}
      </div>
      {/* Shift face, top-right. */}
      {def.shift && (
        <span style={{ position: 'absolute', top: '1px', right: '3px', fontSize: '8px', color: '#888' }}>
          {def.shift}
        </span>
      )}
      {/* AltGr face, bottom-right. */}
      {def.alt && (
        <span style={{ position: 'absolute', bottom: '1px', right: '3px', fontSize: '8px', color: '#777' }}>
          {def.alt}
        </span>
      )}
    </div>
  )
}

function Legend({ swatch, text }: { swatch: string; text: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#888' }}>
      <span style={{
        width: '14px',
        height: '14px',
        borderRadius: '3px',
        border: swatch === 'transparent' ? '1px solid var(--color-button-shadow)' : `2px solid ${swatch}`,
        background: swatch === 'transparent' ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.10)',
        display: 'inline-block',
      }} />
      {text}
    </div>
  )
}
