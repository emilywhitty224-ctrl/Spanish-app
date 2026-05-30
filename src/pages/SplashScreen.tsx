import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { XpWindow } from '../components/XpWindow'
import { Barny } from '../components/Barny'
import type { UserProfile } from '../store/useStore'

export function SplashScreen() {
  const { userProfile, setUserProfile } = useStore()
  const navigate = useNavigate()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '8px', width: '100%' }}>
      <XpWindow
        title="Spanish Revision App — Welcome!"
        icon="🇪🇸"
        width="min(816px, 100%)"
        style={{ width: '100%', flex: 1, maxHeight: 'none' }}
      >
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%', gap: '16px' }}>
          <div>
            <h1 style={{
              fontFamily: 'var(--font-ui)',
              fontSize: '22px',
              color: 'var(--color-accent)',
              marginBottom: '6px',
              letterSpacing: '1px',
            }}>
              ¡Bienvenido!
            </h1>
            <p style={{ fontSize: '13px', color: '#666' }}>
              Spanish Revision System v1.0
            </p>
          </div>

          <Barny size="medium" />

          <button
            className="xp-btn xp-btn-large xp-btn-primary"
            onClick={() => navigate('/dashboard')}
          >
            ▶ Start Learning
          </button>

          <div style={{ marginTop: 'auto', paddingTop: '8px', borderTop: '1px solid var(--color-button-shadow)' }}>
            <p style={{ fontSize: '12px', marginBottom: '8px', color: '#888', letterSpacing: '0.5px' }}>
              SELECT USER PROFILE
            </p>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
              {(['Emily', 'Jocelyn'] as UserProfile[]).map((user) => (
                <button
                  key={user}
                  className={`xp-btn${userProfile === user ? ' xp-btn-primary' : ''}`}
                  style={{ minWidth: '100px', fontWeight: userProfile === user ? 'bold' : 'normal' }}
                  onClick={() => setUserProfile(user)}
                >
                  {userProfile === user ? '● ' : '○ '}{user}
                </button>
              ))}
            </div>
          </div>
        </div>
      </XpWindow>

      <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)', fontFamily: 'var(--font-ui)' }}>
        woofwoofguauguauborkborkwoooofguaaauborkborkwoofguau · Powered by Barny™ 🐾
      </p>
    </div>
  )
}
