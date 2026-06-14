import { useState } from 'react'
import { useSync } from '../sync/useSync'

// Shown when the user connected to Google Drive before (we still have a saved
// file id) but the silent token refresh failed or the token expired mid-session
// — i.e. status fell back to 'signed-out'. Gives a one-tap way to reconnect
// instead of failing sync silently. A fresh user who never connected has no
// fileId, so the banner stays hidden for them.
export function ReconnectBanner() {
  const { status, fileId, busy, reconnectAttempted, connect } = useSync()
  const [dismissed, setDismissed] = useState(false)

  const needsReconnect =
    reconnectAttempted && status === 'signed-out' && Boolean(fileId)
  if (!needsReconnect || dismissed) return null

  return (
    <div
      role="status"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        flexWrap: 'wrap',
        padding: '8px 12px',
        background: '#1a1a1a',
        borderBottom: '2px solid var(--color-accent)',
        fontSize: '13px',
        color: '#fff',
      }}
    >
      <span>Google sync disconnected — your progress isn’t being saved.</span>
      <button
        className="xp-btn xp-btn-primary"
        disabled={busy}
        onClick={() => connect()}
        style={{ minWidth: 'auto', padding: '4px 12px' }}
      >
        {busy ? 'Reconnecting…' : 'Reconnect'}
      </button>
      <button
        className="xp-btn"
        aria-label="Dismiss"
        title="Dismiss"
        onClick={() => setDismissed(true)}
        style={{ minWidth: 'auto', padding: '4px 10px' }}
      >
        ✕
      </button>
    </div>
  )
}
