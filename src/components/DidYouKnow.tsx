import { useState } from 'react'
import { randomCultureFact, type CultureFact } from '../data/culture'

/**
 * "¿Sabías que…?" card. Shows a random A2 Spanish fact about Spain or Valencia;
 * tapping reveals the English and lets you shuffle to the next one. Drop it on
 * the splash screen, between lessons, etc.
 */
export function DidYouKnow({ region }: { region?: 'spain' | 'valencia' }) {
  const [fact, setFact] = useState<CultureFact>(() => randomCultureFact(region))
  const [revealed, setRevealed] = useState(false)

  const next = () => {
    setFact(randomCultureFact(region))
    setRevealed(false)
  }

  const flag = fact.region === 'valencia' ? '🍊' : '🇪🇸'

  return (
    <div
      style={{
        border: '2px inset var(--color-window, #c0c0c0)',
        background: 'var(--color-window-bg, #fff)',
        padding: '10px 12px',
        textAlign: 'left',
        fontSize: '12px',
        lineHeight: 1.45,
      }}
    >
      <div style={{ fontWeight: 'bold', color: 'var(--color-accent)', marginBottom: '6px' }}>
        {flag} ¿Sabías que…?
      </div>

      <p style={{ margin: 0, fontStyle: 'italic' }}>“{fact.spanish}”</p>

      {revealed ? (
        <p style={{ margin: '6px 0 0', color: '#555' }}>{fact.english}</p>
      ) : (
        <button
          className="xp-btn"
          style={{ marginTop: '8px', fontSize: '11px' }}
          onClick={() => setRevealed(true)}
        >
          Show English
        </button>
      )}

      <div style={{ marginTop: '8px', textAlign: 'right' }}>
        <button className="xp-btn" style={{ fontSize: '11px' }} onClick={next}>
          Another fact 🔀
        </button>
      </div>
    </div>
  )
}
