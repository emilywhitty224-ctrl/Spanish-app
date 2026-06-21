import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { XpWindow } from '../components/XpWindow'
import { Barny, type BarneyPose } from '../components/Barny'
import { speak, speechSupported } from '../utils/speak'
import { useStore, type SrsEntry } from '../store/useStore'
import { CULTURE_FACTS } from '../data/culture'

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

// On phones/tablets there's no physical layout to switch to — the built-in
// keyboard already types Spanish via long-press. This is the mobile equivalent
// of the desktop cheat sheet above.
const MOBILE_CHEAT: CheatRow[] = [
  { want: 'á é í ó ú', how: 'Long-press the vowel, then slide to the accented one' },
  { want: 'ñ', how: 'Long-press the n key' },
  { want: 'ü', how: 'Long-press u and pick ü' },
  { want: 'ç', how: 'Long-press c' },
  { want: '¿ ¡', how: 'On the “123 / #+=” symbols layer (long-press ? and ! on iOS)' },
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

// ~15 targets focused on accents, ñ, ü and ¿/¡, each with its English meaning.
const DECK: { es: string; en: string }[] = [
  { es: 'mañana', en: 'tomorrow / morning' },
  { es: '¿cómo estás?', en: 'how are you?' },
  { es: 'corazón', en: 'heart' },
  { es: 'pingüino', en: 'penguin' },
  { es: 'español', en: 'Spanish' },
  { es: 'niño', en: 'boy / child' },
  { es: '¡hola!', en: 'hello!' },
  { es: 'sí', en: 'yes' },
  { es: '¿qué?', en: 'what?' },
  { es: 'cumpleaños', en: 'birthday' },
  { es: 'bilingüe', en: 'bilingual' },
  { es: '¿dónde?', en: 'where?' },
  { es: 'lección', en: 'lesson' },
  { es: 'señor', en: 'sir / mister' },
  { es: '¡adiós!', en: 'goodbye!' },
]

// Just the Spanish strings (deck order helpers + SRS ids work on these), and a
// quick es → en lookup for showing the meaning under each drill target.
const WORDS = DECK.map((d) => d.es)
const TRANSLATION: Record<string, string> = Object.fromEntries(
  DECK.map((d) => [d.es, d.en]),
)

// Barny's detention lines, Bart-Simpson-chalkboard style: absurd first-person
// promises a misbehaving dog gets made to write. Every line is deliberately
// dense in special keys so you actually drill the Spanish layout — between them
// they cover ñ, ¿, ¡, ü and all five accented vowels (á é í ó ú), and each line
// carries several at once rather than a lone accent.
const LINES: { es: string; en: string }[] = [
  { es: '¡Prometo que mañana me portaré como un campeón!', en: 'I promise that tomorrow I will behave like a champion!' },
  { es: '¿Quién rompió el jarrón? ¡Yo no fui, fue el gato!', en: "Who broke the vase? It wasn't me, it was the cat!" },
  { es: 'No perseguiré mi cola a las tres de la mañana, ¡jamás!', en: 'I will never chase my tail at three in the morning!' },
  { es: 'El pingüino del zoológico es mi héroe, según mi corazón.', en: 'The penguin at the zoo is my hero, according to my heart.' },
  { es: '¡Qué rico el jamón! Pero no es mío, así que no lo robaré.', en: "How tasty the ham is! But it's not mine, so I won't steal it." },
  { es: 'Mañana aprenderé español sin morder ningún lápiz.', en: 'Tomorrow I will learn Spanish without biting a single pencil.' },
  { es: '¿Cómo se dice perdón en español? Yo aún no lo sé.', en: "How do you say sorry in Spanish? I still don't know." },
  { es: 'El sofá no es mi baño, ni el jardín es mi montaña.', en: 'The sofa is not my bathroom, nor is the garden my mountain.' },
  { es: 'Mi dueña dice que soy un ángel... casi siempre, según ella.', en: "My owner says I'm an angel... almost always, according to her." },
  { es: '¡Ay! No quería romper el jarrón; fue sin querer, ¿vale?', en: "Oops! I didn't mean to break the vase; it was an accident, okay?" },
  { es: '¡Jamás perseguiré al cartero! Bueno... quizá mañana sí, según mi corazón.', en: 'I will never chase the postman! Well... maybe tomorrow yes, according to my heart.' },
  { es: '¿Por qué le ladré a mi propia sombra? Ni yo lo sé, ¡qué vergüenza!', en: "Why did I bark at my own shadow? I don't even know, how embarrassing!" },
  { es: 'Prometo no robar el jamón, aunque huela increíble y mi barriga gruña.', en: 'I promise not to steal the ham, even though it smells incredible and my belly growls.' },
  { es: 'No esconderé los calcetines en el jardín nunca más... probablemente.', en: "I won't hide the socks in the garden ever again... probably." },
  { es: 'El veterinario es mi héroe, aunque mi cola tiemble y diga lo contrario.', en: 'The vet is my hero, even though my tail trembles and says otherwise.' },
  { es: '¡Ay! Me comí tus deberes de español. Estaban deliciosos, lo siento muchísimo.', en: "Oops! I ate your Spanish homework. It was delicious, I'm terribly sorry." },
  { es: 'Mañana dormiré menos la siesta y estudiaré más, ¡te lo prometo, campeón!', en: "Tomorrow I'll nap less and study more, I promise you, champion!" },
  { es: '¿Quién dejó huellas de barro en el sofá? El gato, según mi versión oficial.', en: 'Who left muddy prints on the sofa? The cat, according to my official version.' },
  { es: 'No perseguiré ninguna ardilla en español... aunque la tentación es grandísima.', en: "I won't chase any squirrel in Spanish... although the temptation is huge." },
  { es: 'Mi dueña dice que soy un señor muy educado. Casi nunca miente, ¿verdad?', en: "My owner says I'm a very polite gentleman. She almost never lies, right?" },
  { es: 'Prometo no aullar a las dos de la mañana solo porque vi una nube rara.', en: "I promise not to howl at two in the morning just because I saw a weird cloud." },
  { es: '¡Qué difícil es portarse bien! Pero mañana seré un perro angelical, lo juro.', en: "How hard it is to behave! But tomorrow I'll be an angelic dog, I swear." },
]

// Same {es, en} shape as Barny's lines, sourced from the Spain/Valencia culture
// facts so the lines game can double as a "type a real fact" history drill.
// Many facts carry accents/ñ (España, América, río, terminó, República…), so
// they still exercise the Spanish layout.
const CULTURE_LINES: { es: string; en: string }[] = CULTURE_FACTS.map((f) => ({
  es: f.spanish,
  en: f.english,
}))

// The two line sources the "Write Lines" game can draw from.
const LINE_SOURCES = {
  barny: { label: '🐾 Barny', lines: LINES },
  culture: { label: '🇪🇸 Spain & Valencia', lines: CULTURE_LINES },
} as const
type LineSource = keyof typeof LINE_SOURCES

// Best "lines in a row without a spelling mistake" streak. Like the WPM best,
// it's a personal high score kept in localStorage, not a campaign stat.
const LINES_STREAK_BEST_KEY = 'kbd-lines-streak-best'
function loadLinesStreakBest(): number {
  if (typeof localStorage === 'undefined') return 0
  return Number(localStorage.getItem(LINES_STREAK_BEST_KEY)) || 0
}
function saveLinesStreakBest(v: number) {
  if (typeof localStorage !== 'undefined') localStorage.setItem(LINES_STREAK_BEST_KEY, String(v))
}

// True once the typed value has diverged from the target — a wrong character, or
// extra characters past the end. Used to count spelling mistakes as they happen.
function hasTypo(value: string, target: string): boolean {
  if (value.length > target.length) return true
  for (let i = 0; i < value.length; i++) {
    if (value[i] !== target[i]) return true
  }
  return false
}

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

// Best typing speed (WPM) for the drill. Kept in localStorage rather than the
// synced stats store — it's a personal "beat your best" number, not a campaign
// score, so it doesn't belong in streak/accuracy totals.
const WPM_BEST_KEY = 'kbd-drill-wpm-best'
function loadWpmBest(): number {
  if (typeof localStorage === 'undefined') return 0
  return Number(localStorage.getItem(WPM_BEST_KEY)) || 0
}
function saveWpmBest(v: number) {
  if (typeof localStorage !== 'undefined') localStorage.setItem(WPM_BEST_KEY, String(v))
}

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
  for (const target of WORDS) {
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

// True on touch devices (coarse pointer). Drives the mobile-vs-desktop guidance
// swap so phone users don't see a "switch macOS to Spanish ISO" diagram that
// doesn't apply to them.
function useIsMobile(): boolean {
  const [mobile, setMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches,
  )
  useEffect(() => {
    const mq = window.matchMedia('(pointer: coarse)')
    const onChange = () => setMobile(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return mobile
}

export function KeyboardLab() {
  const navigate = useNavigate()
  const isMobile = useIsMobile()

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
              {isMobile ? '📱 Spanish on your phone' : '⌨️ Spanish (Spain) keyboard'}
            </h2>
            {isMobile ? (
              <p style={{ fontSize: '12px', color: '#aaa', marginTop: '4px' }}>
                No need to switch keyboards — your phone already types Spanish.
                <strong> Hold a letter down</strong> and its accented versions pop up
                (hold <strong>n</strong> for ñ, hold a vowel for á é í ó ú). The drills
                below work exactly the same.
              </p>
            ) : (
              <p style={{ fontSize: '12px', color: '#aaa', marginTop: '4px' }}>
                Switch macOS to the <strong>Spanish (Spain) ISO</strong> input source, and your
                UK keys produce the characters on your cover. The <strong>highlighted</strong> keys
                below are the ones you reach for to type Spanish — accents, ñ, ç and ¿/¡. Each key
                shows its <strong>Shift</strong> (top-right) and <strong>AltGr</strong> (bottom-right)
                faces too.
              </p>
            )}
          </div>

          {isMobile ? (
            <MobileGuide />
          ) : (
            <>
              {/* Keyboard diagram */}
              <div style={{
                border: '1px solid var(--color-button-shadow)',
                borderRadius: '6px',
                padding: '10px',
                background: 'rgba(255,255,255,0.03)',
                marginBottom: '16px',
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {ROWS.map((row, i) => (
                    <div key={i} style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
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
            </>
          )}

          <DrillPanel />

          <LinesGame />

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
  const [summary, setSummary] = useState<{ correct: number; total: number; pct: number; wpm: number } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Speed tracking: time each card from the first keystroke to a correct
  // answer, summing chars + ms across solved cards so a session yields a WPM.
  const [wpmBest, setWpmBest] = useState(loadWpmBest)
  const typingStartRef = useRef<number | null>(null)
  const solvedCharsRef = useRef(0)
  const solvedMsRef = useRef(0)

  // Audio: speak the target when it appears and when solved. The ref lets the
  // appearance effect read the current mute state without re-firing on toggle.
  const [muted, setMuted] = useState(false)
  const mutedRef = useRef(muted)
  useEffect(() => { mutedRef.current = muted }, [muted])
  const say = (text: string) => { if (!mutedRef.current && speechSupported) speak(text) }

  const target = order[idx]
  const hints = useMemo(() => hintsFor(target), [target])
  const isCorrect = input === target

  // Speak each card as it appears (small delay lets the previous utterance
  // cancel) and reset the per-card typing timer.
  useEffect(() => {
    typingStartRef.current = null
    if (!target) return
    const id = setTimeout(() => say(target), 150)
    return () => clearTimeout(id)
  }, [target])

  // First index where the typed input diverges from the target (-1 if none yet).
  const firstError = useMemo(() => {
    for (let i = 0; i < input.length; i++) {
      if (input[i] !== target[i]) return i
    }
    return -1
  }, [input, target])

  function commitIfCorrect(value: string) {
    if (value === target && !solved.has(idx)) {
      if (typingStartRef.current != null) {
        solvedMsRef.current += Date.now() - typingStartRef.current
        solvedCharsRef.current += target.length
        typingStartRef.current = null
      }
      setSolved((prev) => new Set(prev).add(idx))
      say(target)
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
    const minutes = solvedMsRef.current / 60000
    const wpm = minutes > 0 ? Math.round((solvedCharsRef.current / 5) / minutes) : 0
    if (wpm > wpmBest) {
      saveWpmBest(wpm)
      setWpmBest(wpm)
    }
    setSummary({ correct, total, pct: Math.round((correct / total) * 100), wpm })
    // Fresh session: re-order from the now-updated SRS so weak targets lead.
    setOrder(orderDeck(useStore.getState().srs))
    setIdx(0)
    setInput('')
    setSolved(new Set())
    setAttempted(new Set())
    solvedCharsRef.current = 0
    solvedMsRef.current = 0
    typingStartRef.current = null
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '12px', color: 'var(--color-accent)', fontWeight: 'bold' }}>
            {solved.size} / {attempted.size} correct
          </span>
          <SpeakerToggle
            muted={muted}
            onToggle={() => setMuted((m) => {
              const next = !m
              if (!next && speechSupported) speak(target)
              return next
            })}
          />
        </div>
      </div>

      <p style={{ fontSize: '12px', color: '#aaa', marginTop: 0, marginBottom: '10px' }}>
        Type this with your Spanish input source on · card {idx + 1} of {order.length}
        {bestKbd !== undefined && ` · best ${bestKbd}%`}
        {wpmBest > 0 && ` · best ${wpmBest} WPM`}
      </p>

      {summary && (
        <div style={{
          fontSize: '12px',
          color: '#4caf50',
          fontWeight: 'bold',
          marginBottom: '10px',
        }}>
          🎉 Session saved: {summary.correct} / {summary.total} ({summary.pct}%)
          {summary.wpm > 0 && ` · ${summary.wpm} WPM`}. Counted toward your streak.
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

      {/* English meaning of the target word. */}
      {TRANSLATION[target] && (
        <p style={{
          fontSize: '12px',
          color: '#9bb3c9',
          fontStyle: 'italic',
          textAlign: 'center',
          margin: '0 0 10px',
        }}>
          “{TRANSLATION[target]}”
        </p>
      )}

      <input
        ref={inputRef}
        value={input}
        autoFocus
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        autoComplete="off"
        inputMode="text"
        placeholder="Type here…"
        onChange={(e) => {
          const v = e.target.value
          if (typingStartRef.current === null && v.length > 0) typingStartRef.current = Date.now()
          setInput(v)
          commitIfCorrect(v)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && isCorrect) leaveCard(1)
        }}
        onPaste={(e) => e.preventDefault()}
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

// Barny's detention bit, but friendly: he holds up a line and you write it out
// LINES_TARGET times — accents and all. Only a perfect, full-match line counts,
// so it drills the special keys under light pressure. Purely for fun: it keeps
// its own count and doesn't touch the SRS or stats.
function LinesGame() {
  // Which line bank we're drilling: Barny's detention lines or Spain/Valencia
  // facts. Switching sources starts a fresh line from that bank.
  const [source, setSource] = useState<LineSource>('barny')
  const pickFrom = (src: LineSource) => {
    const pool = LINE_SOURCES[src].lines
    return pool[Math.floor(Math.random() * pool.length)]
  }
  const [line, setLine] = useState(() => pickFrom('barny'))
  const [input, setInput] = useState('')
  // Lines finished in a row with no mistakes (the score you're chasing), the
  // running mistake tally, and your all-time best streak.
  const [streak, setStreak] = useState(0)
  const [mistakes, setMistakes] = useState(0)
  const [best, setBest] = useState(loadLinesStreakBest)
  // Outcome of the line you just submitted — drives Barny's reaction until you
  // start typing the next one.
  const [lastResult, setLastResult] = useState<null | 'clean' | 'broke'>(null)
  // Whether the current line has had a typo at any point (so even a corrected
  // mistake still breaks the streak), and whether it currently has one (so we
  // count each fresh divergence rather than every keystroke).
  const dirtyRef = useRef(false)
  const typoRef = useRef(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Each finished line counts toward the daily streak/stats: correct when typed
  // cleanly, a miss when it carried a mistake (so accuracy = clean-line rate).
  const recordResult = useStore((s) => s.recordResult)

  const [muted, setMuted] = useState(false)
  const mutedRef = useRef(muted)
  useEffect(() => { mutedRef.current = muted }, [muted])
  const say = (text: string) => { if (!mutedRef.current && speechSupported) speak(text) }

  const hints = useMemo(() => hintsFor(line.es), [line])
  const matches = input === line.es

  // First index where typed input diverges from the line (-1 if none yet), so
  // we can highlight exactly where the typo is — same approach as the drill.
  const firstError = useMemo(() => {
    for (let i = 0; i < input.length; i++) {
      if (input[i] !== line.es[i]) return i
    }
    return -1
  }, [input, line])

  // Read the line aloud when Barny presents a new one.
  useEffect(() => {
    const id = setTimeout(() => say(line.es), 150)
    return () => clearTimeout(id)
  }, [line])

  // Count a spelling mistake each time the input newly diverges from the line.
  function handleInput(value: string) {
    const typo = hasTypo(value, line.es)
    if (typo && !typoRef.current) {
      setMistakes((m) => m + 1)
      dirtyRef.current = true
    }
    typoRef.current = typo
    if (lastResult) setLastResult(null)
    setInput(value)
  }

  // Move on to a fresh line, clearing the per-line typo trackers.
  function loadLine(nextLine: { es: string; en: string }) {
    setLine(nextLine)
    setInput('')
    dirtyRef.current = false
    typoRef.current = false
    inputRef.current?.focus()
  }

  function submit() {
    if (!matches) return
    const clean = !dirtyRef.current
    say(line.es)
    recordResult('keyboard-lines', clean ? 1 : 0, 1)
    if (clean) {
      const next = streak + 1
      setStreak(next)
      if (next > best) {
        setBest(next)
        saveLinesStreakBest(next)
      }
    } else {
      setStreak(0)
    }
    loadLine(pickFrom(source))
    setLastResult(clean ? 'clean' : 'broke')
  }

  // "Different line" gives a new sentence with no penalty — a fresh attempt.
  function newLine() {
    setLastResult(null)
    loadLine(pickFrom(source))
  }

  function switchSource(next: LineSource) {
    if (next === source) return
    setSource(next)
    setLastResult(null)
    loadLine(pickFrom(next))
  }

  const pose: BarneyPose = lastResult === 'clean' ? 'celebrate' : lastResult === 'broke' ? 'sad' : 'neutral'
  const message = lastResult === 'clean'
    ? `¡Perfecto! ${streak} line${streak === 1 ? '' : 's'} in a row with no mistakes. ¡Sigue así! 🦴`
    : lastResult === 'broke'
      ? 'Casi — that line had a typo, so the streak resets to zero. ¡Otra vez! 🐾'
      : 'Copy this line with no spelling mistakes. How long a streak can you reach? ¡A escribir!'

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
          WRITE LINES WITH BARNY
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '12px', color: 'var(--color-accent)', fontWeight: 'bold' }}>
            🔥 {streak} in a row
          </span>
          <SpeakerToggle
            muted={muted}
            onToggle={() => setMuted((m) => {
              const next = !m
              if (!next && speechSupported) speak(line.es)
              return next
            })}
          />
        </div>
      </div>

      <p style={{ fontSize: '12px', color: '#aaa', marginTop: 0, marginBottom: '10px' }}>
        Copy each line with no spelling mistakes — see how long a streak you can build.
      </p>

      {/* Scoreboard: current streak, all-time best, and total mistakes. */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
        <ScoreBox label="Streak" value={streak} accent="var(--color-accent)" />
        <ScoreBox label="Best" value={best} accent="#4caf50" />
        <ScoreBox label="Mistakes" value={mistakes} accent="#e53935" />
      </div>

      {/* Choose the line bank: Barny's lines or Spain/Valencia facts. */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
        {(Object.keys(LINE_SOURCES) as LineSource[]).map((src) => {
          const active = src === source
          return (
            <button
              key={src}
              className="xp-btn"
              onClick={() => switchSource(src)}
              style={{
                flex: 1,
                fontSize: '11px',
                fontWeight: active ? 'bold' : 'normal',
                background: active ? 'rgba(255,255,255,0.12)' : undefined,
                color: active ? 'var(--color-accent)' : undefined,
              }}
            >
              {LINE_SOURCES[src].label}
            </button>
          )
        })}
      </div>

      <Barny size="small" pose={pose} message={message} />

      {/* The line to copy, with per-character feedback as you type. Long lines
          wrap (pre-wrap keeps the spaces; break-word stops a single long token
          from overflowing) so the whole sentence stays on screen. */}
      <div style={{
        fontFamily: 'monospace',
        fontSize: '16px',
        textAlign: 'center',
        padding: '10px',
        margin: '10px 0 4px',
        borderRadius: '4px',
        background: 'rgba(0,0,0,0.15)',
        whiteSpace: 'pre-wrap',
        overflowWrap: 'anywhere',
        wordBreak: 'break-word',
      }}>
        {line.es.split('').map((ch, i) => {
          let color = '#888' // not yet typed
          if (firstError === -1 && i < input.length) color = '#4caf50' // correct so far
          else if (firstError !== -1 && i < firstError) color = '#4caf50'
          else if (i === firstError) color = '#e53935' // first wrong char
          // Render spaces as real spaces, except a mistyped one shows as ␣ so it's visible.
          return (
            <span key={i} style={{ color }}>
              {ch === ' ' ? (i === firstError ? '␣' : ' ') : ch}
            </span>
          )
        })}
        {/* Extra typed characters past the line length are errors too. */}
        {input.length > line.es.length && (
          <span style={{ color: '#e53935' }}>{'·'.repeat(input.length - line.es.length)}</span>
        )}
      </div>
      <p style={{ fontSize: '12px', color: '#9bb3c9', fontStyle: 'italic', textAlign: 'center', margin: '0 0 10px' }}>
        “{line.en}”
      </p>

      {/* A textarea (not an <input>) so long lines wrap and stay fully visible
          instead of scrolling off the side; Enter submits the line. */}
      <textarea
        ref={inputRef}
        value={input}
        rows={2}
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        autoComplete="off"
        placeholder="Write the line here…"
        onChange={(e) => handleInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            submit()
          }
        }}
        onPaste={(e) => e.preventDefault()}
        style={{
          width: '100%',
          boxSizing: 'border-box',
          fontFamily: 'monospace',
          fontSize: '15px',
          padding: '8px 10px',
          borderRadius: '4px',
          border: `2px solid ${firstError !== -1 || input.length > line.es.length ? '#e53935' : matches ? '#4caf50' : 'var(--color-button-shadow)'}`,
          background: 'rgba(255,255,255,0.06)',
          color: '#eee',
          resize: 'none',
          overflowWrap: 'anywhere',
        }}
      />

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
        <button
          className="xp-btn"
          style={{ flex: 1 }}
          disabled={!matches}
          onClick={submit}
          title="Submit this line and start the next one"
        >
          Next line ✓
        </button>
        <button className="xp-btn" style={{ flex: 1 }} onClick={newLine}>
          Different line ↻
        </button>
      </div>
    </div>
  )
}

// One cell of the lines-game scoreboard (streak / best / mistakes).
function ScoreBox({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div style={{
      flex: 1,
      border: '1px solid var(--color-button-shadow)',
      borderRadius: '4px',
      padding: '6px 4px',
      textAlign: 'center',
      background: 'rgba(255,255,255,0.03)',
    }}>
      <div style={{ fontSize: '20px', fontWeight: 'bold', color: accent, fontFamily: 'monospace' }}>
        {value}
      </div>
      <div style={{ fontSize: '10px', color: '#888', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
        {label}
      </div>
    </div>
  )
}

// Mobile replacement for the desktop key diagram + cheat sheet: how to reach
// each Spanish character via long-press on a phone keyboard.
function MobileGuide() {
  return (
    <div style={{
      border: '1px solid var(--color-button-shadow)',
      borderRadius: '6px',
      padding: '10px 12px',
      background: 'rgba(255,255,255,0.03)',
      marginBottom: '16px',
    }}>
      <div style={{ fontSize: '11px', color: '#888', letterSpacing: '0.5px', marginBottom: '8px' }}>
        SPANISH ON YOUR PHONE — HOW TO TYPE IT
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {MOBILE_CHEAT.map((row) => (
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
        💡 Hold a key down until the accent options appear, then slide your finger to the one you want.
      </p>
    </div>
  )
}

// Small 🔊/🔇 button for a panel header. Hidden entirely when the browser has
// no speech synthesis, so we never show a dead control.
function SpeakerToggle({ muted, onToggle }: { muted: boolean; onToggle: () => void }) {
  if (!speechSupported) return null
  return (
    <button
      className="xp-btn"
      onClick={onToggle}
      title={muted ? 'Audio off — click to hear words' : 'Audio on — click to mute'}
      style={{ fontSize: '11px', padding: '2px 8px' }}
    >
      {muted ? '🔇' : '🔊'}
    </button>
  )
}

function Key({ def }: { def: KeyDef }) {
  const highlight = !!def.diff
  return (
    <div style={{
      position: 'relative',
      flex: '1 1 0',
      minWidth: 0,
      maxWidth: '46px',
      aspectRatio: '1 / 1',
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
