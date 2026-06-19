import { useState } from 'react'
import { randomCultureFact, type CultureFact } from '../data/culture'

/**
 * "¿Sabías que…?" card. Shows a random A2 Spanish fact about Spain or Valencia;
 * tapping reveals the English and lets you shuffle to the next one.
 *
 * Pass `collapsible` to render it as a tiny corner pill that pops the fact bar
 * open on tap (used on the splash screen so it doesn't hog vertical space).
 */
export function DidYouKnow({
  region,
  collapsible = false,
}: {
  region?: 'spain' | 'valencia'
  collapsible?: boolean
}) {
  const [fact, setFact] = useState<CultureFact>(() => randomCultureFact(region))
  const [revealed, setRevealed] = useState(false)
  const [open, setOpen] = useState(false)

  const next = () => {
    setFact(randomCultureFact(region))
    setRevealed(false)
  }

  const flag = fact.region === 'valencia' ? '🍊' : '🇪🇸'

  const card = (
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
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '6px',
        }}
      >
        <span style={{ fontWeight: 'bold', color: 'var(--color-accent)' }}>
          {flag} ¿Sabías que…?
        </span>
        {collapsible && (
          <button
            className="xp-btn"
            style={{ fontSize: '11px', minWidth: 0, padding: '2px 8px' }}
            onClick={() => setOpen(false)}
            aria-label="Close"
          >
            ✕
          </button>
        )}
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

  if (!collapsible) return card

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      {open && (
        <div
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 8px)',
            right: 0,
            width: 'min(280px, 78vw)',
            zIndex: 20,
            boxShadow: '0 6px 20px rgba(0,0,0,0.35)',
          }}
        >
          {card}
        </div>
      )}
      <button
        className="xp-btn"
        onClick={() => setOpen((o) => !o)}
        style={{
          fontSize: '11px',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          whiteSpace: 'nowrap',
        }}
      >
        {flag} ¿Sabías que…? {open ? '▾' : '▴'}
      </button>
    </div>
  )
}
