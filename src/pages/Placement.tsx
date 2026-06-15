import { useNavigate } from 'react-router-dom'
import { XpWindow } from '../components/XpWindow'
import { Barny } from '../components/Barny'
import { useStore } from '../store/useStore'
import { PLACEMENT_OPTIONS } from '../utils/difficulty'
import type { Placement as PlacementLevel } from '../store/useStore'

// Self-select placement. Shown automatically the first time (when the learner
// has no placement yet), and reachable later from the Dashboard to change level.
export function Placement() {
  const navigate = useNavigate()
  const current = useStore((s) => s.difficulty.placement)
  const setPlacement = useStore((s) => s.setPlacement)
  const setStrictAccents = useStore((s) => s.setStrictAccents)

  function choose(level: PlacementLevel) {
    setPlacement(level)
    // "Confident" learners get strict accent grading to match the harder games.
    if (level === 'hard') setStrictAccents(true)
    navigate('/dashboard')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px', width: '100%' }}>
      <XpWindow
        title="Choose your starting point"
        icon="🎚️"
        width="min(560px, 100%)"
        onClose={() => navigate('/dashboard')}
        style={{ flex: 1, maxHeight: 'none' }}
      >
        <div style={{ marginBottom: '12px' }}>
          <Barny
            message="¡Hola! How much Spanish do you have already? Pick one — I'll adjust, and you can change this any time. 🐾"
            size="small"
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {PLACEMENT_OPTIONS.map((opt) => {
            const isCurrent = current === opt.id
            return (
              <button
                key={opt.id}
                className={`xp-btn xp-btn-large${isCurrent ? ' xp-btn-primary' : ''}`}
                style={{ textAlign: 'left', padding: '14px 16px' }}
                onClick={() => choose(opt.id)}
              >
                <div style={{ fontSize: '16px', marginBottom: '4px' }}>
                  {opt.icon} {opt.label}{isCurrent ? '  ✓' : ''}
                </div>
                <div style={{ fontSize: '12px', fontWeight: 'normal', color: '#444' }}>
                  {opt.blurb}
                </div>
              </button>
            )
          })}
        </div>

        <p style={{ fontSize: '11px', color: '#888', marginTop: '14px', marginBottom: 0 }}>
          Whatever you pick, the app gets harder on its own as you improve.
        </p>
      </XpWindow>
    </div>
  )
}
