import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { XpWindow } from '../components/XpWindow'
import { Barny } from '../components/Barny'
import { useStore } from '../store/useStore'
import { a1UnitById } from '../data/a1Course'
import {
  initDiagnostic,
  currentUnit,
  questionsForUnit,
  advance,
  resolveOutcome,
  MAX_UNITS_PROBED,
  type DiagState,
  type TestQuestion,
  type StartLevel,
  type DiagOutcome,
} from '../utils/diagnostic'

type Phase = 'intro' | 'quiz' | 'result'

const START_OPTIONS: { id: StartLevel; icon: string; label: string; blurb: string }[] = [
  { id: 'new', icon: '🌱', label: 'Totally new', blurb: 'I’m starting from zero.' },
  { id: 'some', icon: '🌿', label: 'A little', blurb: 'I know some words and basic phrases.' },
  { id: 'lots', icon: '🌳', label: 'Quite a bit', blurb: 'I can already hold a simple conversation.' },
]

export function EntryTest() {
  const navigate = useNavigate()
  const applyDiagnostic = useStore((s) => s.applyDiagnostic)

  const [phase, setPhase] = useState<Phase>('intro')
  const [diag, setDiag] = useState<DiagState | null>(null)
  const [questions, setQuestions] = useState<TestQuestion[]>([])
  const [qIndex, setQIndex] = useState(0)
  const [picked, setPicked] = useState<string | null>(null)
  const [unitCorrect, setUnitCorrect] = useState(0)
  const [outcome, setOutcome] = useState<DiagOutcome | null>(null)

  function finish(frontier: number) {
    const result = resolveOutcome(frontier)
    applyDiagnostic(result)
    setOutcome(result)
    setPhase('result')
  }

  // Load the next unit that actually has questions; units with none count as a
  // pass and are skipped over. (Guarded against runaway loops.)
  function beginUnit(state: DiagState) {
    let s = state
    for (let guard = 0; guard < 40; guard++) {
      const qs = questionsForUnit(currentUnit(s))
      if (qs.length > 0) {
        setDiag(s)
        setQuestions(qs)
        setQIndex(0)
        setUnitCorrect(0)
        setPicked(null)
        return
      }
      const res = advance(s, 1, 1) // no questions → treat as known
      if (res.done) { finish(res.frontier); return }
      s = res.state
    }
  }

  function start(level: StartLevel) {
    setPhase('quiz')
    beginUnit(initDiagnostic(level))
  }

  function pick(opt: string) {
    if (picked) return
    setPicked(opt)
    if (opt === questions[qIndex].answer) setUnitCorrect((c) => c + 1)
  }

  function next() {
    if (qIndex + 1 < questions.length) {
      setQIndex((i) => i + 1)
      setPicked(null)
      return
    }
    // Unit finished — fold the score in and move on.
    const res = advance(diag!, unitCorrect, questions.length)
    if (res.done) finish(res.frontier)
    else beginUnit(res.state)
  }

  // ── Intro: quick self-report to seed where the test starts ──
  if (phase === 'intro') {
    return (
      <Shell onClose={() => navigate('/course')}>
        <div style={{ marginBottom: '14px' }}>
          <Barny message="Before we start — how much Spanish do you have already? I’ll begin the test around there so it’s quick. No pressure, it just finds your level. 🐾" size="small" />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {START_OPTIONS.map((o) => (
            <button
              key={o.id}
              className="xp-btn xp-btn-large"
              style={{ textAlign: 'left', padding: '14px 16px' }}
              onClick={() => start(o.id)}
            >
              <div style={{ fontSize: '16px', marginBottom: '4px' }}>{o.icon} {o.label}</div>
              <div style={{ fontSize: '12px', fontWeight: 'normal', color: '#444' }}>{o.blurb}</div>
            </button>
          ))}
        </div>
        <button className="xp-btn" style={{ marginTop: '14px' }} onClick={() => navigate('/course')}>← Back</button>
      </Shell>
    )
  }

  // ── Result ──
  if (phase === 'result' && outcome) {
    const startUnit = a1UnitById(outcome.currentUnitId)
    const known = outcome.knownUnitIds.length
    return (
      <Shell onClose={() => navigate('/course')}>
        <div style={{ textAlign: 'center', padding: '8px 0' }}>
          <div style={{ fontSize: '40px' }}>🎯</div>
          <h2 style={{ fontFamily: 'var(--font-ui)', fontSize: '17px', color: 'var(--color-accent)', margin: '6px 0' }}>
            All set!
          </h2>
        </div>
        <div style={{ fontSize: '13px', color: '#ddd', lineHeight: 1.6, marginBottom: '14px' }}>
          {known > 0 ? (
            <>I’ve marked <strong>{known}</strong> unit{known === 1 ? '' : 's'} as already known and seeded them for review. </>
          ) : (
            <>We’ll start right from the beginning. </>
          )}
          {startUnit
            ? <>You’re starting at <strong>{startUnit.icon} {startUnit.title}</strong>.</>
            : <>Impressive — you’ve cleared the whole A1 course!</>}
        </div>
        <button className="xp-btn xp-btn-primary" style={{ width: '100%', padding: '12px' }} onClick={() => navigate('/course')}>
          Go to my course →
        </button>
      </Shell>
    )
  }

  // ── Quiz ──
  const q = questions[qIndex]
  if (!q || !diag) return null
  const probedSoFar = diag.probed + 1
  return (
    <Shell onClose={() => navigate('/course')}>
      <div style={{ fontSize: '11px', color: '#888', letterSpacing: '0.5px', marginBottom: '10px', textAlign: 'center' }}>
        PLACEMENT TEST · checkpoint {Math.min(probedSoFar, MAX_UNITS_PROBED)}
      </div>
      {q.sub && <div style={{ fontSize: '12px', color: '#888', textAlign: 'center', marginBottom: '4px' }}>{q.sub}</div>}
      <div style={{ fontSize: '22px', fontWeight: 'bold', color: 'var(--color-accent)', textAlign: 'center', marginBottom: '14px' }}>
        {q.prompt}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {q.options.map((opt) => {
          const isAnswer = opt === q.answer
          const isPicked = picked === opt
          let border = 'var(--color-button-shadow)'
          let bg = 'rgba(255,255,255,0.03)'
          if (picked) {
            if (isAnswer) { border = '#4caf50'; bg = 'rgba(76,175,80,0.14)' }
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
              {opt}{picked && isAnswer ? '  ✓' : picked && isPicked ? '  ✗' : ''}
            </button>
          )
        })}
      </div>
      {picked && (
        <button className="xp-btn xp-btn-primary" style={{ width: '100%', marginTop: '12px', padding: '10px' }} onClick={next}>
          Next →
        </button>
      )}
    </Shell>
  )
}

function Shell({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px', width: '100%' }}>
      <XpWindow title="Placement test" icon="🎯" width="min(520px, 100%)" onClose={onClose} style={{ flex: 1, maxHeight: 'none' }}>
        {children}
      </XpWindow>
    </div>
  )
}
