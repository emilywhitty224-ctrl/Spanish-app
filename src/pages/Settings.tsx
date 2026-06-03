import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore'
import type { Theme } from '../store/useStore'
import { XpWindow } from '../components/XpWindow'
import { speak, speechSupported, getSpanishVoices, onVoicesReady } from '../utils/speak'
import { useSync } from '../sync/useSync'

const THEMES: { id: Theme; label: string }[] = [
  { id: 'WindowsXP', label: 'Classic' },
  { id: 'Space', label: 'Space' },
  { id: 'Dinosaurs', label: 'Dinosaurs' },
  { id: 'Sharks', label: 'Sharks' },
]

export function Settings() {
  const navigate = useNavigate()
  const {
    activeTheme, setActiveTheme,
    voiceURI, setVoiceURI,
    speechRate, setSpeechRate,
    aiProvider, setAiProvider,
    aiApiKey, setAiApiKey,
    strictAccents, setStrictAccents,
  } = useStore()

  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [showKey, setShowKey] = useState(false)

  useEffect(() => {
    return onVoicesReady(() => setVoices(getSpanishVoices()))
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', padding: '8px' }}>
      <XpWindow title="Settings" icon="⚙️" width="min(560px, 100%)" onClose={() => navigate('/dashboard')} style={{ flex: 1, maxHeight: 'none' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Theme */}
          <section>
            <SectionTitle>Theme</SectionTitle>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  className={`xp-btn${activeTheme === t.id ? ' xp-btn-primary' : ''}`}
                  style={{ fontSize: '12px', minWidth: 'auto', padding: '6px 14px' }}
                  onClick={() => setActiveTheme(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </section>

          {/* Voice */}
          <section>
            <SectionTitle>Pronunciation voice</SectionTitle>
            {!speechSupported ? (
              <p style={{ fontSize: '12px', color: '#888' }}>
                Your browser doesn't support speech. Try Chrome or Safari.
              </p>
            ) : voices.length === 0 ? (
              <p style={{ fontSize: '12px', color: '#888' }}>
                No Spanish voice found on this device. The default voice will be used.
              </p>
            ) : (
              <select
                value={voiceURI ?? ''}
                onChange={(e) => setVoiceURI(e.target.value || null)}
                style={{
                  width: '100%', padding: '8px 10px', fontSize: '13px',
                  fontFamily: 'var(--font-ui)', background: '#1a1a1a',
                  border: '2px solid var(--color-accent)', borderRadius: '3px',
                  color: '#fff', boxSizing: 'border-box', outline: 'none',
                }}
              >
                <option value="">Auto (best Spanish voice)</option>
                {voices.map((v) => (
                  <option key={v.voiceURI} value={v.voiceURI}>
                    {v.name} ({v.lang})
                  </option>
                ))}
              </select>
            )}
          </section>

          {/* Speed */}
          {speechSupported && (
            <section>
              <SectionTitle>Speaking speed — {speechRate.toFixed(2)}×</SectionTitle>
              <input
                type="range"
                min={0.5}
                max={1.2}
                step={0.05}
                value={speechRate}
                onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
                style={{ width: '100%' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#888' }}>
                <span>Slower</span>
                <span>Faster</span>
              </div>
              <button
                className="xp-btn xp-btn-primary"
                style={{ marginTop: '10px' }}
                onClick={() => speak('Hola, me gustan las tapas')}
              >
                🔊 Test voice
              </button>
            </section>
          )}

          {/* Answer grading */}
          <section>
            <SectionTitle>Answer grading</SectionTitle>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#ddd', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={strictAccents}
                onChange={(e) => setStrictAccents(e.target.checked)}
              />
              <span>
                Strict accents — require <em>café</em>, not <em>cafe</em>.
              </span>
            </label>
            <p style={{ fontSize: '11px', color: '#888', margin: '4px 0 0 22px' }}>
              When off, missing accents are accepted as correct.
            </p>
          </section>

          {/* AI free chat */}
          <section>
            <SectionTitle>AI Free Chat (optional)</SectionTitle>
            <p style={{ fontSize: '11px', color: '#888', marginBottom: '8px' }}>
              Paste an API key to unlock unlimited freeform chat with Barny. Key is stored locally on this device only.
            </p>
            <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
              {(['gemini', 'anthropic'] as const).map((p) => (
                <button
                  key={p}
                  className={`xp-btn${aiProvider === p ? ' xp-btn-primary' : ''}`}
                  style={{ flex: 1, fontSize: '12px', padding: '6px 8px' }}
                  onClick={() => setAiProvider(p)}
                >
                  {p === 'gemini' ? 'Gemini Flash' : 'Claude Haiku'}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '4px' }}>
              <input
                type={showKey ? 'text' : 'password'}
                value={aiApiKey ?? ''}
                placeholder={aiProvider === 'gemini' ? 'AIza…' : 'sk-ant-…'}
                onChange={(e) => setAiApiKey(e.target.value || null)}
                style={{
                  flex: 1, padding: '8px 10px', fontSize: '12px',
                  fontFamily: 'var(--font-ui)', background: '#1a1a1a',
                  border: '2px solid var(--color-accent)', borderRadius: '3px',
                  color: '#fff', boxSizing: 'border-box', outline: 'none',
                }}
              />
              <button
                className="xp-btn"
                style={{ fontSize: '11px', minWidth: 'auto', padding: '4px 10px' }}
                onClick={() => setShowKey((s) => !s)}
              >
                {showKey ? '🙈' : '👁'}
              </button>
            </div>
            <p style={{ fontSize: '10px', color: '#666', marginTop: '6px' }}>
              Gemini: aistudio.google.com/apikey · Anthropic: console.anthropic.com
            </p>
          </section>

          {/* Google account / cloud sync */}
          <section>
            <SectionTitle>Google account &amp; cloud sync</SectionTitle>
            <GoogleSyncSection />
          </section>

          <button className="xp-btn" onClick={() => navigate('/dashboard')}>← Dashboard</button>
        </div>
      </XpWindow>
    </div>
  )
}

function GoogleSyncSection() {
  const { status, userInfo, busy, error, lastSynced, connect, disconnect } = useSync()

  if (status === 'unconfigured') {
    return (
      <p style={{ fontSize: '12px', color: '#888', lineHeight: 1.5 }}>
        Google sync isn't set up yet. Add <code>VITE_GOOGLE_CLIENT_ID</code> and{' '}
        <code>VITE_GOOGLE_API_KEY</code> to a <code>.env.local</code> file to enable it.
      </p>
    )
  }

  if (status === 'connected' && userInfo) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '10px 12px', borderRadius: '4px',
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
        }}>
          <img
            src={userInfo.picture}
            alt=""
            width={36}
            height={36}
            style={{ borderRadius: '50%', flexShrink: 0 }}
          />
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: '13px', color: '#fff', margin: 0, fontWeight: 600 }}>
              {userInfo.name}
            </p>
            <p style={{ fontSize: '11px', color: '#888', margin: '2px 0 0' }}>
              {userInfo.email}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#5c5' }}>
          <span>✓</span>
          <span>Your notes are saved to the cloud</span>
        </div>
        {lastSynced && (
          <p style={{ fontSize: '11px', color: '#666', margin: 0 }}>
            Last synced {new Date(lastSynced).toLocaleTimeString()}
          </p>
        )}
        <button
          className="xp-btn"
          style={{ fontSize: '12px', alignSelf: 'flex-start' }}
          onClick={disconnect}
        >
          Sign out
        </button>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <p style={{ fontSize: '12px', color: '#aaa', margin: 0, lineHeight: 1.5 }}>
        Sign in to save your vocabulary, scores, and progress to the cloud.
      </p>
      {error && (
        <p style={{ fontSize: '12px', color: '#f66', margin: 0 }}>{error}</p>
      )}
      <button
        className="xp-btn xp-btn-primary"
        style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center', fontSize: '13px' }}
        onClick={connect}
        disabled={busy}
      >
        <svg width="16" height="16" viewBox="0 0 48 48" style={{ flexShrink: 0 }}>
          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.08 17.74 9.5 24 9.5z"/>
          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-3.59-13.46-8.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          <path fill="none" d="M0 0h48v48H0z"/>
        </svg>
        {busy ? 'Signing in…' : 'Sign in with Google'}
      </button>
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: '11px', color: '#888', marginBottom: '8px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
      {children}
    </p>
  )
}
