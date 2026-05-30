import { useNavigate, useParams } from 'react-router-dom'
import { XpWindow } from '../components/XpWindow'
import { Barny } from '../components/Barny'

export function PlaceholderPage() {
  const navigate = useNavigate()
  const { mode } = useParams()

  const labels: Record<string, string> = {
    'weekly-sprint': 'Campaign 1: The Weekly Sprint',
    'long-haul': 'Campaign 2: The Long Haul',
  }

  return (
    <div style={{ display: 'flex', alignItems: 'stretch', width: '100%', padding: '8px' }}>
      <XpWindow title={labels[mode ?? ''] ?? 'Coming Soon'} icon="🚧" width="min(400px, 100%)" style={{ flex: 1, maxHeight: 'none' }}>
        <div style={{ textAlign: 'center', padding: '8px' }}>
          <p style={{ fontSize: '13px', marginBottom: '16px', color: 'var(--color-accent)', fontWeight: 'bold' }}>
            🚧 Under Construction 🚧
          </p>
          <Barny message="Quiz logic coming soon! Sit, stay, learn! 🐾" size="medium" />
          <div style={{ marginTop: '16px' }}>
            <button className="xp-btn" onClick={() => navigate('/dashboard')}>
              ← Back to Dashboard
            </button>
          </div>
        </div>
      </XpWindow>
    </div>
  )
}
