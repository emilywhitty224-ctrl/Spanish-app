import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { XpWindow } from '../components/XpWindow'
import { useStore } from '../store/useStore'
import {
  speakCycle,
  speechSupported,
  recognitionSupported,
  startListening,
  describeRecognitionError,
} from '../utils/speak'
import { checkAnswer, normalize } from '../utils/answerCheck'
import { CULTURE_FACTS, byYear, type CultureFact } from '../data/culture'

// "Cultura e Historia" — a section that teaches Spanish *through* facts about
// Spain and Valencia. Mirrors the Basics flow (Learn → Browse → Practice) but
// built on culture facts, and Practice comes in two flavours the user asked for:
//   ⌨️ Type   — cloze: type the missing key word (keyboard practice)
//   🎤 Speak  — say the whole fact out loud; voice-to-text checks you
// Everything reuses the existing speech/answer-check utilities; nothing here
// touches the vocab SRS, so it stays self-contained.

type RegionId = 'spain' | 'valencia'

const GROUPS: Record<RegionId, { label: string; icon: string; blurb: string; facts: CultureFact[] }> = {
  spain: {
    label: 'España — historia',
    icon: '🇪🇸',
    blurb: 'From the Romans to the EU — the big story of Spain, in simple Spanish.',
    facts: CULTURE_FACTS.filter((f) => f.region === 'spain').sort(byYear),
  },
  valencia: {
    label: 'Valencia — 1900 a hoy',
    icon: '🍊',
    blurb: 'Modern Valencia: oranges, Las Fallas, the Turia flood, Calatrava and the DANA.',
    facts: CULTURE_FACTS.filter((f) => f.region === 'valencia').sort(byYear),
  },
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

type Mode = 'learn' | 'browse' | 'practice'

export function Culture() {
  const navigate = useNavigate()
  const [region, setRegion] = useState<RegionId | null>(null)
  const [mode, setMode] = useState<Mode>('learn')

  // ── Region picker ──────────────────────────────────────────────
  if (!region) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px', width: '100%' }}>
        <XpWindow title="Cultura e Historia" icon="📜" width="min(560px, 100%)" onClose={() => navigate('/dashboard')}>
          <p style={{ fontSize: '12px', color: '#888', marginTop: 0, marginBottom: '12px' }}>
            Learn about Spain and Valencia <em>in Spanish</em>. Read the facts, then practise them
            by <strong>typing</strong> or by <strong>speaking</strong> out loud.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {(Object.keys(GROUPS) as RegionId[]).map((id) => {
              const g = GROUPS[id]
              return (
                <button
                  key={id}
                  className="xp-btn xp-btn-large"
                  style={{ textAlign: 'left', padding: '12px 16px' }}
                  onClick={() => { setRegion(id); setMode('learn') }}
                >
                  <div style={{ fontSize: '16px', marginBottom: '4px' }}>{g.icon} {g.label}</div>
                  <div style={{ fontSize: '12px', fontWeight: 'normal', color: '#444' }}>
                    {g.blurb} · {g.facts.length} facts
                  </div>
                </button>
              )
            })}
          </div>
          <button className="xp-btn" style={{ marginTop: '12px' }} onClick={() => navigate('/dashboard')}>
            ← Dashboard
          </button>
        </XpWindow>
      </div>
    )
  }

  const group = GROUPS[region]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px', width: '100%' }}>
      <XpWindow
        title={group.label}
        icon={group.icon}
        width="min(640px, 100%)"
        onClose={() => navigate('/dashboard')}
        style={{ flex: 1, maxHeight: 'none' }}
      >
        <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', flexWrap: 'wrap' }}>
          <button className={`xp-btn${mode === 'learn' ? ' xp-btn-primary' : ''}`} style={{ flex: 1 }} onClick={() => setMode('learn')}>
            📚 Learn
          </button>
          <button className={`xp-btn${mode === 'browse' ? ' xp-btn-primary' : ''}`} style={{ flex: 1 }} onClick={() => setMode('browse')}>
            📖 Browse
          </button>
          <button className={`xp-btn${mode === 'practice' ? ' xp-btn-primary' : ''}`} style={{ flex: 1 }} onClick={() => setMode('practice')}>
            🎮 Practice
          </button>
          <button className="xp-btn" onClick={() => setRegion(null)}>← Topics</button>
        </div>

        {mode === 'learn' && <LearnFlow facts={group.facts} onPractice={() => setMode('practice')} />}
        {mode === 'browse' && <BrowseTimeline facts={group.facts} />}
        {mode === 'practice' && <PracticePanel region={region} facts={group.facts} />}
      </XpWindow>
    </div>
  )
}

// ── Learn: read facts in small batches, then a meaning check ──────────────────
const LEARN_CHUNK = 4

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

// A meaning-check question: the fact's English plus 3 distractors from other facts.
function buildQuestion(fact: CultureFact, all: CultureFact[]): { fact: CultureFact; options: string[] } {
  const rest = shuffle(all.filter((f) => f.id !== fact.id))
  const seen = new Set([fact.english])
  const distractors: string[] = []
  for (const f of rest) {
    if (seen.has(f.english)) continue
    seen.add(f.english)
    distractors.push(f.english)
    if (distractors.length === 3) break
  }
  return { fact, options: shuffle([fact.english, ...distractors]) }
}

function LearnFlow({ facts, onPractice }: { facts: CultureFact[]; onPractice: () => void }) {
  const chunks = useMemo(() => chunk(facts, LEARN_CHUNK), [facts])
  const [batch, setBatch] = useState(0)
  const [phase, setPhase] = useState<'read' | 'check' | 'summary' | 'done'>('read')
  const [cardIdx, setCardIdx] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [questions, setQuestions] = useState<{ fact: CultureFact; options: string[] }[]>([])
  const [qIdx, setQIdx] = useState(0)
  const [picked, setPicked] = useState<string | null>(null)
  const [missed, setMissed] = useState<CultureFact[]>([])
  const [correct, setCorrect] = useState(0)

  const current = chunks[batch] ?? []
  const total = facts.length

  function startCheck(items: CultureFact[]) {
    setQuestions(shuffle(items).map((f) => buildQuestion(f, facts)))
    setQIdx(0); setPicked(null); setMissed([]); setCorrect(0); setPhase('check')
  }
  function pick(opt: string) {
    if (picked) return
    setPicked(opt)
    const q = questions[qIdx]
    if (opt === q.fact.english) setCorrect((c) => c + 1)
    else setMissed((m) => [...m, q.fact])
  }
  function nextQuestion() {
    if (qIdx + 1 < questions.length) { setQIdx((i) => i + 1); setPicked(null) }
    else setPhase('summary')
  }
  function nextBatch() {
    if (batch + 1 < chunks.length) { setBatch((i) => i + 1); setCardIdx(0); setRevealed(false); setPhase('read') }
    else setPhase('done')
  }

  const card = {
    border: '1px solid var(--color-button-shadow)', borderRadius: '4px', padding: '16px',
    background: 'rgba(255,255,255,0.03)', display: 'flex', flexDirection: 'column' as const,
    gap: '10px', alignItems: 'center' as const,
  }

  // ── Read ──
  if (phase === 'read') {
    const f = current[cardIdx]
    const done = batch * LEARN_CHUNK + cardIdx
    const last = cardIdx + 1 >= current.length
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <ProgressLine label={`Reading · ${done + 1} of ${total}`} pct={(done + 1) / total} />
        <div style={card}>
          <div style={{ fontSize: '11px', color: '#888' }}>
            {f.year > 0 ? `Año ${f.year}` : f.year < 0 ? `${Math.abs(f.year)} a.C.` : 'General'} ·
            {' '}batch {batch + 1} of {chunks.length}
          </div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--color-accent)', textAlign: 'center', lineHeight: 1.35 }}>
            {f.spanish}
          </div>
          {revealed
            ? <div style={{ fontSize: '14px', color: '#ddd', textAlign: 'center' }}>{f.english}</div>
            : <button className="xp-btn" style={{ fontSize: '12px' }} onClick={() => setRevealed(true)}>Show English</button>}
          {speechSupported && (
            <button className="xp-btn" style={{ fontSize: '12px', padding: '5px 12px' }} onClick={() => speakCycle(f.spanish)}>
              🔊 Hear it
            </button>
          )}
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          {cardIdx > 0 && (
            <button className="xp-btn" onClick={() => { setCardIdx((i) => i - 1); setRevealed(false) }}>← Back</button>
          )}
          <button
            className="xp-btn xp-btn-primary"
            style={{ flex: 1 }}
            onClick={() => (last ? startCheck(current) : (setCardIdx((i) => i + 1), setRevealed(false)))}
          >
            {last ? 'Quick check →' : 'Next →'}
          </button>
        </div>
      </div>
    )
  }

  // ── Check: which English meaning? ──
  if (phase === 'check') {
    const q = questions[qIdx]
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <ProgressLine label={`Check · ${qIdx + 1} of ${questions.length}`} pct={(qIdx + (picked ? 1 : 0)) / questions.length} />
        <div style={{ fontSize: '12px', color: '#888', textAlign: 'center' }}>What does this mean?</div>
        <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--color-accent)', textAlign: 'center', lineHeight: 1.35 }}>
          {q.fact.spanish}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {q.options.map((opt) => {
            const isCorrect = opt === q.fact.english
            const isPicked = picked === opt
            let border = 'var(--color-button-shadow)', bg = 'rgba(255,255,255,0.03)'
            if (picked) {
              if (isCorrect) { border = '#4caf50'; bg = 'rgba(76,175,80,0.14)' }
              else if (isPicked) { border = '#e53935'; bg = 'rgba(229,57,53,0.14)' }
            }
            return (
              <button key={opt} className="xp-btn" disabled={!!picked} onClick={() => pick(opt)}
                style={{ textAlign: 'left', padding: '10px 12px', border: `2px solid ${border}`, background: bg }}>
                {opt}{picked && isCorrect ? '  ✓' : picked && isPicked ? '  ✗' : ''}
              </button>
            )
          })}
        </div>
        {picked && (
          <button className="xp-btn xp-btn-primary" onClick={nextQuestion}>
            {qIdx + 1 < questions.length ? 'Next →' : 'See results →'}
          </button>
        )}
      </div>
    )
  }

  // ── Summary ──
  if (phase === 'summary') {
    const last = batch + 1 >= chunks.length
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--color-accent)' }}>
          {correct}/{questions.length} correct
        </div>
        {missed.length > 0 ? (
          <div style={{ border: '1px solid rgba(255,255,255,0.12)', borderRadius: '4px', padding: '10px' }}>
            <div style={{ fontSize: '11px', color: '#888', letterSpacing: '0.5px', marginBottom: '6px' }}>WORTH ANOTHER LOOK</div>
            {missed.map((f) => (
              <div key={f.id} style={{ fontSize: '13px', padding: '3px 0' }}>
                <span style={{ color: 'var(--color-accent)' }}>{f.spanish}</span>
                <span style={{ color: '#bbb' }}> — {f.english}</span>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: '13px', color: '#4caf50' }}>Perfect — all {questions.length}! 🎉</div>
        )}
        <div style={{ display: 'flex', gap: '6px' }}>
          {missed.length > 0 && <button className="xp-btn" onClick={() => startCheck(missed)}>↻ Retry missed</button>}
          <button className="xp-btn xp-btn-primary" style={{ flex: 1 }} onClick={nextBatch}>
            {last ? 'Finish →' : 'Next batch →'}
          </button>
        </div>
      </div>
    )
  }

  // ── Done ──
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', alignItems: 'center', textAlign: 'center', padding: '12px 0' }}>
      <div style={{ fontSize: '40px' }}>🎉</div>
      <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--color-accent)' }}>
        You've read all {total} facts!
      </div>
      <div style={{ fontSize: '13px', color: '#bbb' }}>Now lock them in — type them or say them out loud.</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
        <button className="xp-btn xp-btn-primary" onClick={onPractice}>🎮 Practice</button>
        <button className="xp-btn" onClick={() => { setBatch(0); setCardIdx(0); setRevealed(false); setPhase('read') }}>🔁 Read again</button>
      </div>
    </div>
  )
}

// ── Browse: the whole timeline ───────────────────────────────────────────────
function BrowseTimeline({ facts }: { facts: CultureFact[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {facts.map((f) => (
        <div key={f.id} style={{
          display: 'flex', gap: '10px', alignItems: 'center',
          padding: '8px 10px', border: '1px solid var(--color-button-shadow)',
          borderRadius: '4px', background: 'rgba(255,255,255,0.03)',
        }}>
          <div style={{
            fontSize: '11px', color: '#888', minWidth: '54px', textAlign: 'right',
            fontFamily: 'monospace',
          }}>
            {f.year > 0 ? f.year : f.year < 0 ? `${Math.abs(f.year)} a.C.` : '—'}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: '14px', color: 'var(--color-accent)', fontWeight: 'bold' }}>{f.spanish}</div>
            <div style={{ fontSize: '12px', color: '#bbb' }}>{f.english}</div>
          </div>
          {speechSupported && (
            <button className="xp-btn" style={{ fontSize: '11px', padding: '4px 8px' }} title="Hear it"
              onClick={() => speakCycle(f.spanish)}>🔊</button>
          )}
        </div>
      ))}
    </div>
  )
}

// ── Practice: choose Type or Speak ───────────────────────────────────────────
type PracticeKind = 'type' | 'speak'

function PracticePanel({ region, facts }: { region: RegionId; facts: CultureFact[] }) {
  const [kind, setKind] = useState<PracticeKind>('type')

  return (
    <div>
      <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
        <button className={`xp-btn${kind === 'type' ? ' xp-btn-primary' : ''}`} style={{ flex: 1 }} onClick={() => setKind('type')}>
          ⌨️ Type
        </button>
        <button
          className={`xp-btn${kind === 'speak' ? ' xp-btn-primary' : ''}`}
          style={{ flex: 1 }}
          onClick={() => setKind('speak')}
          disabled={!recognitionSupported}
          title={recognitionSupported ? 'Say the fact out loud' : 'Voice input not supported on this browser'}
        >
          🎤 Speak
        </button>
      </div>
      {kind === 'type'
        ? <ClozeType region={region} facts={facts} />
        : <SpeakAlong region={region} facts={facts} />}
    </div>
  )
}

// ⌨️ Type — cloze: type the missing key word.
function ClozeType({ region, facts }: { region: RegionId; facts: CultureFact[] }) {
  const strictAccents = useStore((s) => s.strictAccents)
  const recordResult = useStore((s) => s.recordResult)
  const best = useStore((s) => s.stats.bestScores[`culture-type-${region}`])

  const [order, setOrder] = useState(() => shuffle(facts))
  const [idx, setIdx] = useState(0)
  const [typed, setTyped] = useState('')
  const [verdict, setVerdict] = useState<'correct' | 'almost' | 'incorrect' | null>(null)
  const [correct, setCorrect] = useState(0)
  const [total, setTotal] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const f = order[idx]
  const [before, ...rest] = f.spanish.split(f.blank)
  const after = rest.join(f.blank)

  function submit() {
    if (verdict) { next(); return }
    if (!typed.trim()) return
    const v = checkAnswer(typed, f.blank, strictAccents)
    const ok = v !== 'wrong'
    setVerdict(v === 'wrong' ? 'incorrect' : v)
    setCorrect((c) => c + (ok ? 1 : 0))
    setTotal((t) => t + 1)
  }
  function next() {
    if (idx + 1 >= order.length) {
      const t = total || 1
      recordResult(`culture-type-${region}`, correct, t)
      setOrder(shuffle(facts)); setIdx(0); setCorrect(0); setTotal(0)
    } else {
      setIdx((i) => i + 1)
    }
    setTyped(''); setVerdict(null)
    inputRef.current?.focus()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ fontSize: '12px', color: '#888' }}>
        Fill the missing word · {idx + 1} of {order.length}
        {total > 0 && ` · ${correct}/${total} this round`}
        {best !== undefined && ` · best ${best}%`}
      </div>

      <div style={{ fontSize: '18px', color: 'var(--color-accent)', textAlign: 'center', lineHeight: 1.4, padding: '8px 0' }}>
        {before}
        <span style={{ borderBottom: '2px solid var(--color-accent)', padding: '0 24px', color: verdict ? '#fff' : 'transparent' }}>
          {verdict ? f.blank : '___'}
        </span>
        {after}
      </div>
      <div style={{ fontSize: '12px', color: '#9bb3c9', fontStyle: 'italic', textAlign: 'center' }}>“{f.english}”</div>

      <input
        ref={inputRef}
        value={typed}
        disabled={verdict !== null}
        autoFocus
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        autoComplete="off"
        placeholder="Type the missing word…"
        onChange={(e) => setTyped(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') submit() }}
        style={{
          padding: '8px 10px', fontSize: '15px', background: '#1a1a1a', color: '#fff',
          border: `2px solid ${verdict === 'correct' ? '#4caf50' : verdict === 'almost' ? '#ffb300' : verdict === 'incorrect' ? '#e53935' : 'var(--color-accent)'}`,
          borderRadius: '3px', outline: 'none', boxSizing: 'border-box',
        }}
      />

      {verdict === 'correct' && <div style={{ fontSize: '13px', color: '#4caf50' }}>✓ ¡Correcto!</div>}
      {verdict === 'almost' && <div style={{ fontSize: '13px', color: '#ffb300' }}>✓ Almost — it's <strong>{f.blank}</strong></div>}
      {verdict === 'incorrect' && (
        <div style={{ fontSize: '13px', color: '#e53935' }}>
          ✗ <span style={{ textDecoration: 'line-through', opacity: 0.7 }}>{typed}</span> → <strong>{f.blank}</strong>
        </div>
      )}

      <div style={{ display: 'flex', gap: '6px' }}>
        {speechSupported && (
          <button className="xp-btn" style={{ fontSize: '11px' }} onClick={() => speakCycle(f.spanish)}>🔊 Hear</button>
        )}
        <button className="xp-btn xp-btn-primary" style={{ flex: 1 }} disabled={!verdict && !typed.trim()} onClick={submit}>
          {verdict ? 'Next →' : 'Check'}
        </button>
      </div>
    </div>
  )
}

// 🎤 Speak — say the whole fact out loud; speech recognition checks you.
function speechScore(said: string, target: string): 'correct' | 'almost' | 'wrong' {
  const want = normalize(target).split(/\s+/).filter(Boolean)
  if (want.length === 0) return 'wrong'
  const heard = new Set(normalize(said).split(/\s+/).filter(Boolean))
  const hit = want.filter((w) => heard.has(w)).length
  const ratio = hit / want.length
  if (ratio >= 0.8) return 'correct'
  if (ratio >= 0.55) return 'almost'
  return 'wrong'
}

function SpeakAlong({ region, facts }: { region: RegionId; facts: CultureFact[] }) {
  const recordResult = useStore((s) => s.recordResult)
  const best = useStore((s) => s.stats.bestScores[`culture-speak-${region}`])

  const [order, setOrder] = useState(() => shuffle(facts))
  const [idx, setIdx] = useState(0)
  const [heard, setHeard] = useState('')
  const [verdict, setVerdict] = useState<'correct' | 'almost' | 'wrong' | null>(null)
  const [listening, setListening] = useState(false)
  const [micError, setMicError] = useState<string | null>(null)
  const [correct, setCorrect] = useState(0)
  const [total, setTotal] = useState(0)
  const stopRef = useRef<(() => void) | null>(null)

  const f = order[idx]

  useEffect(() => () => stopRef.current?.(), [])

  function listen() {
    if (listening) { stopRef.current?.(); setListening(false); return }
    setMicError(null); setHeard(''); setVerdict(null); setListening(true)
    stopRef.current = startListening(
      (text, isFinal) => {
        setHeard(text)
        if (isFinal) {
          setListening(false)
          const v = speechScore(text, f.spanish)
          setVerdict(v)
          setCorrect((c) => c + (v !== 'wrong' ? 1 : 0))
          setTotal((t) => t + 1)
        }
      },
      (err) => {
        setListening(false)
        if (err) { const m = describeRecognitionError(err); if (m) setMicError(m) }
      },
      'es-ES',
    )
  }
  function next() {
    if (idx + 1 >= order.length) {
      recordResult(`culture-speak-${region}`, correct, total || 1)
      setOrder(shuffle(facts)); setIdx(0); setCorrect(0); setTotal(0)
    } else {
      setIdx((i) => i + 1)
    }
    setHeard(''); setVerdict(null); setMicError(null)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ fontSize: '12px', color: '#888' }}>
        Say it out loud · {idx + 1} of {order.length}
        {total > 0 && ` · ${correct}/${total} this round`}
        {best !== undefined && ` · best ${best}%`}
      </div>

      <div style={{ fontSize: '18px', color: 'var(--color-accent)', textAlign: 'center', lineHeight: 1.4, padding: '8px 0' }}>
        {f.spanish}
      </div>
      <div style={{ fontSize: '12px', color: '#9bb3c9', fontStyle: 'italic', textAlign: 'center' }}>“{f.english}”</div>

      <div style={{ display: 'flex', gap: '6px' }}>
        {speechSupported && (
          <button className="xp-btn" style={{ fontSize: '11px' }} onClick={() => speakCycle(f.spanish)}>🔊 Hear</button>
        )}
        <button
          className={`xp-btn${listening ? ' mic-listening' : ''}`}
          style={{ flex: 1, border: `2px solid ${listening ? '#2196f3' : 'var(--color-accent)'}`, color: listening ? '#2196f3' : undefined }}
          onClick={listen}
        >
          {listening ? '⏹ Stop' : '🎤 Speak'}
        </button>
      </div>

      {heard && (
        <div style={{ fontSize: '13px', color: '#bbb' }}>
          Heard: <span style={{ fontStyle: 'italic' }}>“{heard}”</span>
        </div>
      )}
      {micError && <div style={{ fontSize: '11px', color: '#ff9800' }}>🎤 {micError}</div>}

      {verdict === 'correct' && <div style={{ fontSize: '13px', color: '#4caf50' }}>✓ ¡Muy bien! Spot on.</div>}
      {verdict === 'almost' && <div style={{ fontSize: '13px', color: '#ffb300' }}>✓ Close — most of it came through. Try again or move on.</div>}
      {verdict === 'wrong' && <div style={{ fontSize: '13px', color: '#e53935' }}>✗ Didn't quite catch that — listen again and retry.</div>}

      {verdict && (
        <button className="xp-btn xp-btn-primary" onClick={next}>Next →</button>
      )}
    </div>
  )
}

function ProgressLine({ label, pct }: { label: string; pct: number }) {
  return (
    <div>
      <div style={{ fontSize: '11px', color: '#888', marginBottom: '4px', letterSpacing: '0.5px' }}>{label}</div>
      <div style={{ height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
        <div style={{ width: `${Math.min(100, Math.round(pct * 100))}%`, height: '100%', background: 'var(--color-accent)', transition: 'width 0.2s ease' }} />
      </div>
    </div>
  )
}
