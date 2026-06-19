import { useNavigate } from 'react-router-dom'
import { XpWindow } from '../components/XpWindow'
import { Barny } from '../components/Barny'
import { DidYouKnow } from '../components/DidYouKnow'

export function SplashScreen() {
  const navigate = useNavigate()

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        padding: '12px',
        width: '100%',
        height: '100%',
      }}
    >
      <div style={{ position: 'relative', width: 'min(816px, 100%)' }}>
        <XpWindow
          title="Spanish Revision App — Welcome!"
          icon="🇪🇸"
          style={{ width: '100%' }}
        >
          <div
            style={{
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div>
              <h1
                style={{
                  fontFamily: 'var(--font-ui)',
                  fontSize: '22px',
                  color: 'var(--color-accent)',
                  marginBottom: '6px',
                  letterSpacing: '1px',
                }}
              >
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
          </div>
        </XpWindow>

        {/* Fact tucked into the bottom-right corner — tap to pop the fact bar open. */}
        <div style={{ position: 'absolute', bottom: '8px', right: '8px', zIndex: 10 }}>
          <DidYouKnow collapsible />
        </div>
      </div>

      <p
        style={{
          fontSize: '10px',
          color: 'rgba(255,255,255,0.6)',
          fontFamily: 'var(--font-ui)',
        }}
      >
        woofwoofguauguauborkborkwoooofguaaauborkborkwoofguau · Powered by Barny™ 🐾
      </p>
    </div>
  )
}
