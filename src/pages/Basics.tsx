import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { XpWindow } from '../components/XpWindow'
import { RevisionGame } from '../components/RevisionGame'
import { useStore } from '../store/useStore'
import { speakCycle, speechSupported, recognitionSupported, startListening, describeRecognitionError } from '../utils/speak'
import { checkAnswer, almostMessage } from '../utils/answerCheck'
import {
  CATEGORIES,
  categoryById,
  categoriesByIds,
  categoryToVocab,
  type Category,
  type CategoryId,
  type Entry,
} from '../data/basics'

type Mode = 'learn' | 'browse' | 'challenge'

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

export function Basics() {
  const navigate = useNavigate()
  const includeBasics = useStore((s) => s.includeBasicsInSprint)
  const setIncludeBasics = useStore((s) => s.setIncludeBasicsInSprint)
  const unlockedBand = useStore((s) => s.difficulty.unlockedBand)
  const [activeId, setActiveId] = useState<CategoryId | null>(null)
  const [mode, setMode] = useState<Mode>('learn')
  const [selected, setSelected] = useState<Set<CategoryId>>(new Set())

  const active = useMemo<Category | null>(() => categoryById(activeId), [activeId])

  function toggle(id: CategoryId) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  if (!active) {
    // Topics above the learner's unlocked band are locked until they level up.
    const unlockedCats = CATEGORIES.filter((c) => c.band <= unlockedBand)
    const allSelected = selected.size === unlockedCats.length && unlockedCats.length > 0
    // Revise selected topics together, in canonical order, via the full game engine.
    const reviseQuery = CATEGORIES.filter((c) => selected.has(c.id)).map((c) => c.id).join(',')
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px', width: '100%' }}>
        <XpWindow title="Basics" icon="🌱" width="min(560px, 100%)" onClose={() => navigate('/dashboard')}>
          <p style={{ fontSize: '12px', color: '#888', marginTop: 0, marginBottom: '12px' }}>
            Core building blocks. Tap a topic to browse or practise it on its own, or
            tick several and revise them together with every game mode — just like the campaigns.
          </p>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', color: '#888', letterSpacing: '0.5px' }}>
              {selected.size > 0 ? `${selected.size} selected to revise` : 'Tick topics to revise together'}
            </span>
            <button
              className="xp-btn"
              style={{ fontSize: '11px', padding: '3px 8px' }}
              onClick={() => setSelected(allSelected ? new Set() : new Set(unlockedCats.map((c) => c.id)))}
            >
              {allSelected ? 'Clear all' : 'Select all'}
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {CATEGORIES.map((c) => {
              const isOn = selected.has(c.id)
              const locked = c.band > unlockedBand
              return (
                <div key={c.id} style={{ display: 'flex', alignItems: 'stretch', gap: '6px', opacity: locked ? 0.55 : 1 }}>
                  <button
                    className="xp-btn xp-btn-large"
                    style={{ flex: 1, textAlign: 'left', padding: '12px 16px', cursor: locked ? 'not-allowed' : 'pointer' }}
                    disabled={locked}
                    title={locked ? 'Unlocks at a higher difficulty' : undefined}
                    onClick={() => { setActiveId(c.id); setMode('learn') }}
                  >
                    <div style={{ fontSize: '16px', marginBottom: '4px' }}>
                      {locked ? '🔒' : c.icon} {c.label}
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: 'normal', color: '#444' }}>
                      {locked ? 'Unlocks at a higher difficulty — raise it from the Dashboard.' : c.blurb}
                    </div>
                  </button>
                  <button
                    className={`xp-btn${isOn ? ' xp-btn-primary' : ''}`}
                    style={{ minWidth: '44px', fontSize: '16px' }}
                    disabled={locked}
                    aria-pressed={isOn}
                    title={isOn ? 'Remove from revision' : 'Add to revision'}
                    onClick={() => toggle(c.id)}
                  >
                    {isOn ? '☑' : '☐'}
                  </button>
                </div>
              )
            })}
          </div>

          <button
            className="xp-btn xp-btn-primary"
            style={{ width: '100%', marginTop: '12px', padding: '10px' }}
            disabled={selected.size === 0}
            onClick={() => navigate(`/basics/play?topic=${reviseQuery}`)}
          >
            🎮 Revise selected ({selected.size})
          </button>

          {/* The Keyboard Lab isn't a tickable revise topic — it's a standalone
              tool, so it sits below the divider rather than in the list above. */}
          <button
            className="xp-btn xp-btn-large"
            style={{
              width: '100%', textAlign: 'left', padding: '12px 16px',
              marginTop: '12px', paddingTop: '12px',
              borderTop: '1px solid var(--color-button-shadow)',
            }}
            onClick={() => navigate('/keyboard-lab')}
          >
            <div style={{ fontSize: '16px', marginBottom: '4px' }}>⌨️ Keyboard Lab</div>
            <div style={{ fontSize: '12px', fontWeight: 'normal', color: '#444' }}>
              Learn the Spanish layout — accents, ñ, ¿/¡ vs your UK keyboard.
            </div>
          </button>

          <label
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              fontSize: '12px', color: '#bbb', cursor: 'pointer',
              marginTop: '12px', padding: '8px 0',
              borderTop: '1px solid var(--color-button-shadow)',
            }}
          >
            <input
              type="checkbox"
              checked={includeBasics}
              onChange={(e) => setIncludeBasics(e.target.checked)}
            />
            ➕ Also revise these in Campaign 1 (Weekly Sprint)
          </label>

          <button className="xp-btn" style={{ marginTop: '6px' }} onClick={() => navigate('/dashboard')}>
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
        <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', flexWrap: 'wrap' }}>
          <button
            className={`xp-btn${mode === 'learn' ? ' xp-btn-primary' : ''}`}
            style={{ flex: 1 }}
            onClick={() => setMode('learn')}
            title="Guided: learn a few words at a time, then a quick check"
          >
            📚 Learn
          </button>
          <button
            className={`xp-btn${mode === 'browse' ? ' xp-btn-primary' : ''}`}
            style={{ flex: 1 }}
            onClick={() => setMode('browse')}
          >
            📖 Browse
          </button>
          <button
            className="xp-btn"
            style={{ flex: 1 }}
            onClick={() => navigate(`/basics/play?topic=${active.id}`)}
            title="Full practice — all game modes, with progress tracking"
          >
            🎮 Practice
          </button>
          {active.hasChallenge && (
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

        {mode === 'learn' && (
          <LearnMode
            entries={active.entries}
            onPractice={() => navigate(`/basics/play?topic=${active.id}`)}
            onBrowse={() => setMode('browse')}
          />
        )}
        {mode === 'browse' && <BrowseList entries={active.entries} />}
        {mode === 'challenge' && <NumberChallenge />}
      </XpWindow>
    </div>
  )
}

// Mounted at /basics/play?topic=<id>. Feeds the chosen topic's vocab into the
// shared RevisionGame engine, so Basics practice has the exact same capabilities
// as Campaign 1 (all game modes, SRS tracking, scoring, speech).
export function BasicsPractice() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const reviewWord = useStore((s) => s.reviewWord)

  const topicParam = params.get('topic')
  const cats = useMemo(() => categoriesByIds(topicParam), [topicParam])
  const vocab = useMemo(() => cats.flatMap((c) => categoryToVocab(c)), [cats])

  useEffect(() => {
    if (cats.length === 0) navigate('/basics', { replace: true })
  }, [cats, navigate])

  if (cats.length === 0) return null

  const single = cats.length === 1 ? cats[0] : null
  const title = single ? `Basics — ${single.label}` : `Basics — ${cats.length} topics`
  // Multi-topic decks expose an in-game topic filter via tags, so use the
  // neutral seedling icon; single-topic keeps its own icon.
  const icon = single ? single.icon : '🌱'

  return (
    <RevisionGame
      title={title}
      icon={icon}
      vocab={vocab}
      deckLabel="basics words"
      exitTo="/basics"
      onWordResult={reviewWord}
    />
  )
}

// ── Learn mode ──────────────────────────────────────────────────────────────
// Teaches a topic from the ground up: introduce a few words at a time (so a
// beginner isn't faced with a 30-word wall), then check those same words with
// multiple choice — recognition before production — before the typing-based
// full Practice. Combines chunked teaching (#1) with a graded difficulty rung (#3).
const LEARN_CHUNK = 5

function chunkEntries(entries: Entry[], size: number): Entry[][] {
  const out: Entry[][] = []
  for (let i = 0; i < entries.length; i += size) out.push(entries.slice(i, i + size))
  return out
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

interface Question {
  entry: Entry
  options: string[]
}

// A recognition question: the word's English meaning plus three distractors,
// drawn first from the same chunk (so just-learned words compete with each
// other) then the wider topic. Options are de-duped by English and shuffled.
function buildQuestion(entry: Entry, chunk: Entry[], all: Entry[]): Question {
  const mates = shuffle(chunk.filter((e) => e !== entry))
  const rest = shuffle(all.filter((e) => e !== entry && !chunk.includes(e)))
  const distractors: string[] = []
  const seen = new Set([entry.english])
  for (const e of [...mates, ...rest]) {
    if (seen.has(e.english)) continue
    seen.add(e.english)
    distractors.push(e.english)
    if (distractors.length === 3) break
  }
  return { entry, options: shuffle([entry.english, ...distractors]) }
}

function ProgressLine({ label, pct }: { label: string; pct: number }) {
  return (
    <div>
      <div style={{ fontSize: '11px', color: '#888', marginBottom: '4px', letterSpacing: '0.5px' }}>{label}</div>
      <div style={{ height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
        <div style={{
          width: `${Math.min(100, Math.round(pct * 100))}%`,
          height: '100%', background: 'var(--color-accent)', transition: 'width 0.2s ease',
        }} />
      </div>
    </div>
  )
}

function LearnMode({
  entries, onPractice, onBrowse,
}: {
  entries: Entry[]
  onPractice: () => void
  onBrowse: () => void
}) {
  const chunks = useMemo(() => chunkEntries(entries, LEARN_CHUNK), [entries])
  const [chunkIndex, setChunkIndex] = useState(0)
  const [phase, setPhase] = useState<'teach' | 'check' | 'summary' | 'done'>('teach')
  const [cardIndex, setCardIndex] = useState(0)
  const [questions, setQuestions] = useState<Question[]>([])
  const [qIndex, setQIndex] = useState(0)
  const [picked, setPicked] = useState<string | null>(null)
  const [missed, setMissed] = useState<Entry[]>([])
  const [correctCount, setCorrectCount] = useState(0)

  const chunk = chunks[chunkIndex] ?? []
  const totalWords = entries.length

  function startCheck(words: Entry[]) {
    setQuestions(shuffle(words).map((e) => buildQuestion(e, chunk, entries)))
    setQIndex(0); setPicked(null); setMissed([]); setCorrectCount(0)
    setPhase('check')
  }

  function pick(opt: string) {
    if (picked) return
    setPicked(opt)
    const q = questions[qIndex]
    if (opt === q.entry.english) setCorrectCount((c) => c + 1)
    else setMissed((m) => [...m, q.entry])
  }

  function nextQuestion() {
    if (qIndex + 1 < questions.length) { setQIndex((i) => i + 1); setPicked(null) }
    else setPhase('summary')
  }

  function nextChunk() {
    if (chunkIndex + 1 < chunks.length) {
      setChunkIndex((i) => i + 1); setCardIndex(0); setPhase('teach')
    } else {
      setPhase('done')
    }
  }

  const cardStyle = {
    border: '1px solid var(--color-button-shadow)',
    borderRadius: '4px',
    padding: '16px',
    background: 'rgba(255,255,255,0.03)',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
    alignItems: 'center' as const,
  }
  const noteStyle = {
    fontSize: '12px', color: '#cda', background: 'rgba(76,175,76,0.10)',
    border: '1px solid rgba(76,175,76,0.25)', borderRadius: '4px',
    padding: '8px 10px', textAlign: 'center' as const, width: '100%',
  }

  // ── Teach: one word at a time ──
  if (phase === 'teach') {
    const e = chunk[cardIndex]
    const wordsDone = chunkIndex * LEARN_CHUNK + cardIndex
    const last = cardIndex + 1 >= chunk.length
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <ProgressLine label={`New words · ${wordsDone + 1} of ${totalWords}`} pct={(wordsDone + 1) / totalWords} />
        <div style={cardStyle}>
          <div style={{ fontSize: '11px', color: '#888' }}>
            Batch {chunkIndex + 1} of {chunks.length} · word {cardIndex + 1} of {chunk.length}
          </div>
          <div style={{ fontSize: '30px', fontWeight: 'bold', color: 'var(--color-accent)', textAlign: 'center' }}>
            {e.spanish}
          </div>
          <div style={{ fontSize: '16px', color: '#ddd', textAlign: 'center' }}>{e.english}</div>
          {e.note && <div style={noteStyle}>💡 {e.note}</div>}
          {speechSupported && (
            <button
              className="xp-btn"
              style={{ fontSize: '12px', padding: '5px 12px' }}
              onClick={() => speakCycle(e.spanish.split('/')[0].trim())}
            >🔊 Hear it</button>
          )}
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          {cardIndex > 0 && (
            <button className="xp-btn" onClick={() => setCardIndex((i) => i - 1)}>← Back</button>
          )}
          <button
            className="xp-btn xp-btn-primary"
            style={{ flex: 1 }}
            onClick={() => (last ? startCheck(chunk) : setCardIndex((i) => i + 1))}
          >
            {last ? 'Quick check →' : 'Got it →'}
          </button>
        </div>
      </div>
    )
  }

  // ── Check: recognition, multiple choice ──
  if (phase === 'check') {
    const q = questions[qIndex]
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <ProgressLine label={`Check · ${qIndex + 1} of ${questions.length}`} pct={(qIndex + (picked ? 1 : 0)) / questions.length} />
        <div style={{ fontSize: '12px', color: '#888', textAlign: 'center' }}>What does this mean?</div>
        <div style={{ fontSize: '30px', fontWeight: 'bold', color: 'var(--color-accent)', textAlign: 'center' }}>
          {q.entry.spanish}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {q.options.map((opt) => {
            const isCorrect = opt === q.entry.english
            const isPicked = picked === opt
            let border = 'var(--color-button-shadow)'
            let bg = 'rgba(255,255,255,0.03)'
            if (picked) {
              if (isCorrect) { border = '#4caf50'; bg = 'rgba(76,175,80,0.14)' }
              else if (isPicked) { border = '#e53935'; bg = 'rgba(229,57,53,0.14)' }
            }
            return (
              <button
                key={opt}
                className="xp-btn"
                disabled={!!picked}
                onClick={() => pick(opt)}
                style={{ textAlign: 'left', padding: '10px 12px', border: `2px solid ${border}`, background: bg }}
              >
                {opt}{picked && isCorrect ? '  ✓' : picked && isPicked ? '  ✗' : ''}
              </button>
            )
          })}
        </div>
        {picked && (
          <button className="xp-btn xp-btn-primary" onClick={nextQuestion}>
            {qIndex + 1 < questions.length ? 'Next →' : 'See results →'}
          </button>
        )}
      </div>
    )
  }

  // ── Summary: per-batch results ──
  if (phase === 'summary') {
    const last = chunkIndex + 1 >= chunks.length
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--color-accent)' }}>
          {correctCount}/{questions.length} correct
        </div>
        {missed.length > 0 ? (
          <div style={{ ...noteStyle, color: '#ddd', textAlign: 'left' }}>
            <div style={{ fontSize: '11px', color: '#888', letterSpacing: '0.5px', marginBottom: '6px' }}>
              WORTH ANOTHER LOOK
            </div>
            {missed.map((e, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '2px 0' }}>
                <span style={{ color: 'var(--color-accent)' }}>{e.spanish}</span>
                <span style={{ color: '#bbb' }}>{e.english}</span>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: '13px', color: '#4caf50' }}>Perfect — all {questions.length}! 🎉</div>
        )}
        <div style={{ display: 'flex', gap: '6px' }}>
          {missed.length > 0 && (
            <button className="xp-btn" onClick={() => startCheck(missed)}>↻ Retry missed</button>
          )}
          <button className="xp-btn xp-btn-primary" style={{ flex: 1 }} onClick={nextChunk}>
            {last ? 'Finish →' : 'Next 5 words →'}
          </button>
        </div>
      </div>
    )
  }

  // ── Done: whole topic worked through ──
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', alignItems: 'center', textAlign: 'center', padding: '12px 0' }}>
      <div style={{ fontSize: '40px' }}>🎉</div>
      <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--color-accent)' }}>
        You've worked through all {totalWords} words!
      </div>
      <div style={{ fontSize: '13px', color: '#bbb' }}>
        Lock them in with full practice, or browse the list any time.
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
        <button className="xp-btn xp-btn-primary" onClick={onPractice}>🎮 Full practice</button>
        <button className="xp-btn" onClick={onBrowse}>📖 Browse the list</button>
        <button
          className="xp-btn"
          onClick={() => { setChunkIndex(0); setCardIndex(0); setPhase('teach') }}
        >🔁 Learn again</button>
      </div>
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
              onClick={() => speakCycle(e.spanish.split('/')[0].trim())}
              title="Hear it"
            >🔊</button>
          )}
        </div>
      ))}
    </div>
  )
}

function NumberChallenge() {
  const strictAccents = useStore((s) => s.strictAccents)
  const [range, setRange] = useState<ChallengeRange>('easy')
  const [current, setCurrent] = useState<number>(() => randomNum('easy'))
  const [typed, setTyped] = useState('')
  const [feedback, setFeedback] = useState<'correct' | 'almost' | 'incorrect' | null>(null)
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
    const verdict = checkAnswer(typed, answer, strictAccents)
    // A one-letter typo or missing accent ('almost') still counts as correct —
    // we just show the proper spelling as a nudge.
    const ok = verdict !== 'wrong'
    setFeedback(verdict === 'wrong' ? 'incorrect' : verdict)
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
          autoCapitalize="off"
          autoCorrect="off"
          autoComplete="off"
          spellCheck={false}
          inputMode="text"
          onChange={(e) => setTyped(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') submit() }}
          style={{
            flex: 1, padding: '8px 10px', fontSize: '14px',
            background: '#1a1a1a',
            border: `2px solid ${feedback === 'correct' ? '#4caf50' : feedback === 'almost' ? '#ffb300' : feedback === 'incorrect' ? '#e53935' : listening ? '#2196f3' : 'var(--color-accent)'}`,
            borderRadius: '3px', color: '#fff', outline: 'none', boxSizing: 'border-box',
          }}
        />
        {recognitionSupported && (
          <button
            className={`xp-btn${listening ? ' mic-listening' : ''}`}
            disabled={feedback !== null}
            title="Speak in Spanish"
            style={{
              minWidth: '44px', padding: '4px 10px',
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
      {feedback === 'almost' && (() => {
        const { msg, showAnswer } = almostMessage(typed, answer)
        return (
          <div style={{ fontSize: '14px', color: '#ffb300' }}>
            ✓ {msg}{showAnswer && <> <strong>{answer}</strong></>}
          </div>
        )
      })()}
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
          onClick={() => speakCycle(answer)}
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
