import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { XpWindow } from '../components/XpWindow'
import { useVocab } from '../data/useVocab'
import { weakestFirst } from '../utils/srs'

export function Dashboard() {
  const { userProfile, stats } = useStore()
  const srs = useStore((s) => s.srs[s.userProfile])
  const navigate = useNavigate()
  const vocab = useVocab()

  const myStats = stats[userProfile]
  const accuracy = myStats.totalAnswered > 0
    ? Math.round((myStats.totalCorrect / myStats.totalAnswered) * 100)
    : 0

  const today = new Date().toISOString().slice(0, 10)
  // Words seen before and scheduled for review today or earlier.
  const dueToday = vocab.filter((v) => {
    const entry = srs[v.id]
    return entry !== undefined && entry.nextReview <= today
  }).length
  const weakest = weakestFirst(vocab, srs).slice(0, 5)

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '8px',
      width: '100%',
    }}>
      <XpWindow title={`Spanish App — ${userProfile}'s Dashboard`} icon="🇪🇸" width="min(680px, 100%)" style={{ flex: 1, maxHeight: 'none' }}>
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
              ¡Hola, {userProfile}!
            </h2>
            <p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
              Choose your learning mode below.
            </p>
          </div>

          {/* Stats strip */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <StatBox label="Day streak" value={`${myStats.streak} 🔥`} />
            <StatBox label="Accuracy" value={myStats.totalAnswered > 0 ? `${accuracy}%` : '—'} />
            <StatBox label="Due today" value={`${dueToday}`} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button
              className="xp-btn xp-btn-large"
              style={{ width: '100%', textAlign: 'left', padding: '12px 16px' }}
              onClick={() => navigate('/campaign/weekly-sprint')}
            >
              <div style={{ fontSize: '16px', marginBottom: '4px' }}>📅 Campaign 1: The Weekly Sprint</div>
              <div style={{ fontSize: '12px', fontWeight: 'normal', color: '#444' }}>
                Review this week's vocabulary before it slips away
              </div>
            </button>

            <button
              className="xp-btn xp-btn-large"
              style={{ width: '100%', textAlign: 'left', padding: '12px 16px' }}
              onClick={() => navigate('/campaign/long-haul')}
            >
              <div style={{ fontSize: '16px', marginBottom: '4px' }}>🧠 Campaign 2: The Long Haul</div>
              <div style={{ fontSize: '12px', fontWeight: 'normal', color: '#444' }}>
                Spaced repetition — words you need to drill for long-term retention
              </div>
            </button>

            {weakest.length > 0 && (
              <div style={{
                border: '1px solid var(--color-button-shadow)',
                borderRadius: '4px',
                padding: '10px 12px',
                background: 'rgba(255,255,255,0.03)',
              }}>
                <div style={{ fontSize: '11px', color: '#888', letterSpacing: '0.5px', marginBottom: '6px' }}>
                  WEAKEST WORDS
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  {weakest.map((w) => {
                    const e = srs[w.id]!
                    const acc = Math.round(((e.correct ?? 0) / (e.seen ?? 1)) * 100)
                    return (
                      <div key={w.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                        <span style={{ color: 'var(--color-accent)' }}>{w.spanish_word}</span>
                        <span style={{ color: '#666' }}>{w.english_translation} · {acc}%</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            <button
              className="xp-btn"
              style={{ width: '100%', textAlign: 'left', padding: '10px 16px' }}
              onClick={() => navigate('/add-words')}
            >
              ➕ Add your own words
            </button>

            <button
              className="xp-btn"
              style={{ width: '100%', textAlign: 'left', padding: '10px 16px' }}
              onClick={() => navigate('/settings')}
            >
              ⚙️ Settings
            </button>
          </div>

          <div style={{ marginTop: 'auto', paddingTop: '8px' }}>
            <button
              className="xp-btn"
              style={{ fontSize: '11px' }}
              onClick={() => navigate('/')}
            >
              ← Back to Splash
            </button>
          </div>
        </div>
      </XpWindow>
    </div>
  )
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      flex: 1,
      border: '1px solid var(--color-button-shadow)',
      borderRadius: '4px',
      padding: '8px',
      textAlign: 'center',
      background: 'rgba(255,255,255,0.03)',
    }}>
      <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--color-accent)' }}>{value}</div>
      <div style={{ fontSize: '10px', color: '#888', marginTop: '2px', letterSpacing: '0.5px' }}>{label}</div>
    </div>
  )
}
