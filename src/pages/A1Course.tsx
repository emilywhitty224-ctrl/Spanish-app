import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { XpWindow } from '../components/XpWindow'
import { Barny } from '../components/Barny'
import { RevisionGame } from '../components/RevisionGame'
import { useStore, type UnitStatus } from '../store/useStore'
import { speakCycle, speechSupported } from '../utils/speak'
import { A1_UNITS_ORDERED, a1UnitById, unitVocab } from '../data/a1Course'

const STATUS_BADGE: Record<UnitStatus, string> = {
  done: '✓',
  available: '▶',
  'in-progress': '▶',
  locked: '🔒',
}

// ── Course map (route: /course) ──────────────────────────────────────────────
export function A1Course() {
  const navigate = useNavigate()
  const course = useStore((s) => s.course)
  const enrollCourse = useStore((s) => s.enrollCourse)

  const total = A1_UNITS_ORDERED.length
  const doneCount = A1_UNITS_ORDERED.filter((u) => course.units[u.id] === 'done').length
  const pct = total > 0 ? Math.round((doneCount / total) * 100) : 0

  // Not enrolled yet: offer the entry test or a fresh start.
  if (!course.enrolled) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px', width: '100%' }}>
        <XpWindow title="A1 Course" icon="📚" width="min(560px, 100%)" onClose={() => navigate('/dashboard')} style={{ flex: 1, maxHeight: 'none' }}>
          <div style={{ marginBottom: '14px' }}>
            <Barny
              message="¡Vamos! This is the full A1 course — greetings all the way to asking directions. Take a quick placement test so I can skip what you already know, or just start from the top. 🐾"
              size="small"
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button
              className="xp-btn xp-btn-large xp-btn-primary"
              style={{ textAlign: 'left', padding: '14px 16px' }}
              onClick={() => navigate('/course/entry-test')}
            >
              <div style={{ fontSize: '16px', marginBottom: '4px' }}>🎯 Take the placement test</div>
              <div style={{ fontSize: '12px', fontWeight: 'normal', color: '#444' }}>
                A short adaptive quiz finds your level and starts you in the right place.
              </div>
            </button>
            <button
              className="xp-btn xp-btn-large"
              style={{ textAlign: 'left', padding: '14px 16px' }}
              onClick={() => enrollCourse()}
            >
              <div style={{ fontSize: '16px', marginBottom: '4px' }}>🌱 Start from the beginning</div>
              <div style={{ fontSize: '12px', fontWeight: 'normal', color: '#444' }}>
                Skip the test and work through all {total} units in order.
              </div>
            </button>
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
      <XpWindow title="A1 Course" icon="📚" width="min(560px, 100%)" onClose={() => navigate('/dashboard')} style={{ flex: 1, maxHeight: 'none' }}>
        {/* Progress */}
        <div style={{ marginBottom: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#888', letterSpacing: '0.5px', marginBottom: '4px' }}>
            <span>PROGRESS</span>
            <span>{doneCount}/{total} · {pct}%</span>
          </div>
          <div style={{ height: '8px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ width: `${pct}%`, height: '100%', background: 'var(--color-accent)', transition: 'width 0.2s ease' }} />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {A1_UNITS_ORDERED.map((u, i) => {
            const status = course.units[u.id] ?? (i === 0 ? 'available' : 'locked')
            const locked = status === 'locked'
            const isCurrent = course.currentUnitId === u.id
            return (
              <button
                key={u.id}
                className={`xp-btn xp-btn-large${isCurrent ? ' xp-btn-primary' : ''}`}
                style={{
                  textAlign: 'left', padding: '12px 16px',
                  opacity: locked ? 0.55 : 1, cursor: locked ? 'not-allowed' : 'pointer',
                }}
                disabled={locked}
                title={locked ? 'Finish earlier units to unlock' : undefined}
                onClick={() => navigate(`/course/unit/${u.id}`)}
              >
                <div style={{ fontSize: '15px', marginBottom: '4px', display: 'flex', justifyContent: 'space-between' }}>
                  <span>{u.order}. {locked ? '🔒' : u.icon} {u.title}</span>
                  <span style={{ color: status === 'done' ? '#4caf50' : 'var(--color-accent)' }}>{STATUS_BADGE[status]}</span>
                </div>
                <div style={{ fontSize: '12px', fontWeight: 'normal', color: '#444' }}>{u.blurb}</div>
              </button>
            )
          })}
        </div>

        <button
          className="xp-btn"
          style={{ fontSize: '11px', marginTop: '14px' }}
          onClick={() => navigate('/course/entry-test')}
          title="Re-run the placement test"
        >
          🎯 {course.diagnosticDone ? 'Retake' : 'Take'} placement test
        </button>
        <button className="xp-btn" style={{ marginTop: '6px' }} onClick={() => navigate('/dashboard')}>
          ← Dashboard
        </button>
      </XpWindow>
    </div>
  )
}

// ── Unit detail + practice (route: /course/unit/:id) ─────────────────────────
export function A1Unit() {
  const navigate = useNavigate()
  const { id } = useParams()
  const unit = a1UnitById(id)
  const reviewWord = useStore((s) => s.reviewWord)
  const completeUnit = useStore((s) => s.completeUnit)
  const status = useStore((s) => (id ? s.course.units[id] : undefined))
  const [practising, setPractising] = useState(false)

  if (!unit) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px', width: '100%' }}>
        <XpWindow title="A1 Course" icon="📚" width="min(520px, 100%)" onClose={() => navigate('/course')}>
          <p style={{ fontSize: '13px', color: '#bbb' }}>That unit doesn’t exist.</p>
          <button className="xp-btn" onClick={() => navigate('/course')}>← Course</button>
        </XpWindow>
      </div>
    )
  }

  if (practising) {
    return (
      <RevisionGame
        title={unit.title}
        icon={unit.icon}
        vocab={unitVocab(unit)}
        deckLabel="words & phrases"
        exitTo="/course"
        onWordResult={reviewWord}
      />
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px', width: '100%' }}>
      <XpWindow
        title={`${unit.order}. ${unit.title}`}
        icon={unit.icon}
        width="min(560px, 100%)"
        onClose={() => navigate('/course')}
        style={{ flex: 1, maxHeight: 'none' }}
      >
        <p style={{ fontSize: '13px', color: '#bbb', marginTop: 0 }}>{unit.blurb}</p>

        {unit.grammar && unit.grammar.length > 0 && (
          <div style={{ marginBottom: '14px' }}>
            <div style={{ fontSize: '11px', color: '#888', letterSpacing: '0.5px', marginBottom: '6px' }}>HOW IT WORKS</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {unit.grammar.map((line, i) => (
                <div
                  key={i}
                  style={{
                    fontSize: '13px', color: '#ddd', lineHeight: 1.5,
                    background: 'rgba(255,255,255,0.03)', border: '1px solid var(--color-button-shadow)',
                    borderRadius: '4px', padding: '8px 10px',
                  }}
                >
                  {line}
                </div>
              ))}
            </div>
          </div>
        )}

        {unit.examples && unit.examples.length > 0 && (
          <div style={{ marginBottom: '14px' }}>
            <div style={{ fontSize: '11px', color: '#888', letterSpacing: '0.5px', marginBottom: '6px' }}>EXAMPLES</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {unit.examples.map((e, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', fontSize: '13px', padding: '4px 0' }}>
                  <span style={{ color: 'var(--color-accent)', fontWeight: 'bold' }}>{e.spanish}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#bbb' }}>
                    {e.english}
                    {speechSupported && (
                      <button
                        className="xp-btn"
                        style={{ fontSize: '11px', padding: '2px 7px' }}
                        onClick={() => speakCycle(e.spanish.split('/')[0].replace('…', '').trim())}
                        title="Hear it"
                      >🔊</button>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button className="xp-btn xp-btn-primary" style={{ padding: '12px' }} onClick={() => setPractising(true)}>
            🎮 Practice this unit
          </button>
          {status !== 'done' && (
            <button
              className="xp-btn"
              style={{ padding: '10px' }}
              onClick={() => { completeUnit(unit.id); navigate('/course') }}
            >
              ✓ Mark as done & continue
            </button>
          )}
          <button className="xp-btn" onClick={() => navigate('/course')}>← Course</button>
        </div>
      </XpWindow>
    </div>
  )
}
