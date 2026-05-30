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
  const { activeTheme, setActiveTheme, voiceURI, setVoiceURI, speechRate, setSpeechRate } = useStore()

  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])

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

          <button className="xp-btn" onClick={() => navigate('/dashboard')}>← Dashboard</button>
        </div>
      </XpWindow>
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
