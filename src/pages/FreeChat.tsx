import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { XpWindow } from '../components/XpWindow'
import { Barny, RotatingBarnyIcon } from '../components/Barny'
import { useStore } from '../store/useStore'
import { chatWithAI, suggestReplies, type AiTurn, type AiReply, type SuggestedReply } from '../utils/aiChat'
import { speak, speechSupported, recognitionSupported, startListening, applySpanishPunctuation, describeRecognitionError } from '../utils/speak'

interface Scenario {
  id: string
  icon: string
  title: string
  prompt: string
}

const OPEN_CHAT_TOPICS = [
  'what they did today',
  'their favourite food and why',
  'a place they would love to travel to',
  'how they ended up learning Spanish',
  'their plans for the weekend',
  'a film or series they have watched recently',
  'their morning routine',
  'a hobby they enjoy',
  'the last time they got lost',
  'a song stuck in their head',
  'their favourite season and why',
  'a small thing that made them smile this week',
  'whether they prefer the city or the countryside',
  'a meal they would cook for a friend',
  'a book they loved as a child',
  'the weather today and how it makes them feel',
  'a small goal for this month',
  'something new they tried recently',
  'their ideal Sunday',
  'a tradition from their home country',
]

function openChatPrompt(): string {
  const topic = OPEN_CHAT_TOPICS[Math.floor(Math.random() * OPEN_CHAT_TOPICS.length)]
  return `Open free chat — no fixed setting. You are Barny chatting casually like a friend. On your very first turn, ask the learner an ice-breaker question about: ${topic}. After that, let the conversation drift wherever the learner takes it — react naturally, share little opinions, ask follow-up questions, change topic if they do. Keep it warm and curious; never lecture.`
}

const SCENARIOS: Scenario[] = [
  { id: 'open',     icon: '🎲', title: 'Open chat (random)',    prompt: '' },
  { id: 'cafe',     icon: '☕', title: 'Café in Valencia',     prompt: 'You are a waiter at a busy café in Valencia. The learner is ordering breakfast or a coffee.' },
  { id: 'flat',     icon: '🏠', title: 'Flat viewing',          prompt: 'You are a landlord showing a piso to a foreign tenant. Ask and answer questions about rent, bills, deposit.' },
  { id: 'tie',      icon: '🪪', title: 'TIE appointment',       prompt: 'You are a police officer processing a TIE/NIE appointment. Ask for documents (pasaporte, justificante, cita).' },
  { id: 'bank',     icon: '🏦', title: 'Bank account',          prompt: 'You are a cashier helping the learner open a Spanish bank account.' },
  { id: 'class',    icon: '🎓', title: 'Spanish class',         prompt: 'You are a Spanish teacher in Valencia chatting informally with the learner about their day.' },
  { id: 'market',   icon: '🥕', title: 'Mercado Central',       prompt: 'You are a stallholder at Mercado Central in Valencia, selling fruit, veg, and ham.' },
  { id: 'doctor',   icon: '🩺', title: 'At the doctor',         prompt: 'You are a doctor at a Spanish health centre. The learner explains a small symptom (cold, headache).' },
  { id: 'tapas',    icon: '🍤', title: 'Tapas with a friend',   prompt: 'You are a Spanish friend out for tapas. Make small talk and suggest dishes to share.' },
]

interface ChatTurn {
  barny: { spanish: string; english: string }
  user?: { spanish: string }
  feedback?: AiReply['feedback']
}

export function FreeChat() {
  const navigate = useNavigate()
  const { aiProvider, aiApiKey } = useStore()

  const [scenario, setScenario] = useState<Scenario | null>(null)
  const [turns, setTurns] = useState<ChatTurn[]>([])
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showEnglish, setShowEnglish] = useState(false)
  const [revealed, setRevealed] = useState<Set<number>>(new Set())
  const [wordIdx, setWordIdx] = useState(-1)
  const [listening, setListening] = useState(false)
  const [micError, setMicError] = useState<string | null>(null)
  const stopListenRef = useRef<(() => void) | null>(null)
  const [suggestions, setSuggestions] = useState<SuggestedReply[]>([])
  const [loadingSuggest, setLoadingSuggest] = useState(false)

  async function start(s: Scenario) {
    if (!aiApiKey) { setError('Paste an API key in Settings first.'); return }
    const resolved: Scenario = s.id === 'open' ? { ...s, prompt: openChatPrompt() } : s
    setScenario(resolved)
    setTurns([])
    setError(null)
    setLoading(true)
    try {
      const reply = await chatWithAI(aiProvider, aiApiKey, resolved.prompt, [])
      setTurns([{ barny: { spanish: reply.barnySpanish, english: reply.barnyEnglish } }])
      if (speechSupported) setTimeout(() => { setWordIdx(-1); speak(reply.barnySpanish, setWordIdx) }, 250)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setScenario(null)
    } finally {
      setLoading(false)
    }
  }

  async function send(textOverride?: string) {
    const source = (textOverride ?? draft).trim()
    if (!scenario || !aiApiKey || !source || loading) return
    const userSpanish = source
    setDraft('')
    setSuggestions([])

    // Optimistically append the user reply.
    const optimistic: ChatTurn[] = [...turns]
    const lastIdx = optimistic.length - 1
    optimistic[lastIdx] = { ...optimistic[lastIdx], user: { spanish: userSpanish } }
    setTurns(optimistic)
    setLoading(true)
    setError(null)

    const history: AiTurn[] = []
    optimistic.forEach((t) => {
      history.push({ role: 'barny', spanish: t.barny.spanish })
      if (t.user) history.push({ role: 'user', spanish: t.user.spanish })
    })

    try {
      const reply = await chatWithAI(aiProvider, aiApiKey, scenario.prompt, history)
      const next = [...optimistic]
      next[lastIdx] = { ...next[lastIdx], feedback: reply.feedback }
      next.push({ barny: { spanish: reply.barnySpanish, english: reply.barnyEnglish } })
      setTurns(next)
      if (speechSupported) setTimeout(() => { setWordIdx(-1); speak(reply.barnySpanish, setWordIdx) }, 250)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  async function suggest() {
    if (!scenario || !aiApiKey || loadingSuggest) return
    setLoadingSuggest(true)
    setSuggestions([])
    const history: AiTurn[] = []
    turns.forEach((t) => {
      history.push({ role: 'barny', spanish: t.barny.spanish })
      if (t.user) history.push({ role: 'user', spanish: t.user.spanish })
    })
    try {
      const results = await suggestReplies(aiProvider, aiApiKey, scenario.prompt, history)
      setSuggestions(results)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoadingSuggest(false)
    }
  }

  function reset() {
    setScenario(null); setTurns([]); setDraft(''); setError(null); setSuggestions([])
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px', width: '100%' }}>
      <XpWindow title="Free Chat with Barny" icon="🤖" width="min(560px, 100%)" onClose={() => navigate('/dashboard')} style={{ flex: 1, maxHeight: 'none' }}>

        {!aiApiKey && (
          <div style={{ marginBottom: '12px', padding: '10px', border: '2px solid #e53935', borderRadius: '4px', fontSize: '12px' }}>
            No API key set. Go to <button className="xp-btn" style={{ fontSize: '11px', padding: '2px 8px' }} onClick={() => navigate('/settings')}>⚙️ Settings</button> to paste one.
          </div>
        )}

        {!scenario && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <Barny message="Pick a scenario — we'll chat freely. 🐾" size="small" />
            <div style={{ fontSize: '11px', color: '#888' }}>Using <strong>{aiProvider === 'gemini' ? 'Gemini Flash' : 'Claude Haiku'}</strong></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {SCENARIOS.map((s) => (
                <button
                  key={s.id}
                  className="xp-btn"
                  disabled={!aiApiKey || loading}
                  style={{ width: '100%', textAlign: 'left', padding: '10px 14px' }}
                  onClick={() => start(s)}
                >
                  <div style={{ fontSize: '14px', fontWeight: 'bold' }}>{s.icon} {s.title}</div>
                </button>
              ))}
            </div>
            {error && <div style={{ fontSize: '11px', color: '#e53935' }}>⚠️ {error}</div>}
            <button className="xp-btn" onClick={() => navigate('/dashboard')}>← Dashboard</button>
          </div>
        )}

        {scenario && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: '#888' }}>
              <span>{scenario.icon} {scenario.title}</span>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', cursor: 'pointer' }}>
                <input type="checkbox" checked={showEnglish} onChange={(e) => setShowEnglish(e.target.checked)} />
                Show English
              </label>
            </div>

            <div style={{
              maxHeight: '320px', overflowY: 'auto',
              border: '1px solid var(--color-button-shadow)', borderRadius: '4px',
              padding: '10px', background: 'rgba(255,255,255,0.02)',
              display: 'flex', flexDirection: 'column', gap: '10px',
            }}>
              {turns.map((t, i) => {
                const fb = t.feedback
                const color = fb?.outcome === 'good' ? '#4caf50' : fb?.outcome === 'okay' ? '#ff9800' : fb?.outcome === 'bad' ? '#e53935' : '#aaa'
                const isLast = i === turns.length - 1
                const sWords = t.barny.spanish.split(/\s+/)
                const eWords = t.barny.english.split(/\s+/)
                const activeWordIdx = isLast ? wordIdx : -1
                const eIdx = activeWordIdx >= 0
                  ? Math.round(activeWordIdx / Math.max(sWords.length - 1, 1) * Math.max(eWords.length - 1, 1))
                  : -1
                return (
                  <div key={i} style={{ fontSize: '18px', lineHeight: 1.4, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ color: 'var(--color-accent)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <RotatingBarnyIcon size={120} />
                      <span>{sWords.map((w, wi) => (
                        <span key={wi} style={{
                          textDecoration: wi === activeWordIdx ? 'underline' : 'none',
                          textDecorationThickness: '2px',
                          transition: 'text-decoration 0.1s',
                        }}>{w}{' '}</span>
                      ))}</span>
                      {speechSupported && (
                        <button
                          className="xp-btn"
                          style={{ fontSize: '10px', padding: '0 6px', marginLeft: '6px' }}
                          onClick={() => { setWordIdx(-1); setTimeout(() => speak(t.barny.spanish, setWordIdx), 50) }}
                        >🔊</button>
                      )}
                      <button
                        className="xp-btn"
                        title={revealed.has(i) ? 'Hide translation' : 'Translate to English'}
                        style={{ fontSize: '10px', padding: '0 6px', marginLeft: '4px' }}
                        onClick={() => {
                          setRevealed((prev) => {
                            const next = new Set(prev)
                            if (next.has(i)) next.delete(i); else next.add(i)
                            return next
                          })
                        }}
                      >{revealed.has(i) ? '🙈' : '🌐'}</button>
                    </div>
                    {(showEnglish || revealed.has(i)) && (
                      <div style={{ color: '#777', fontSize: '16px', marginLeft: '14px' }}>
                        {eWords.map((w, wi) => (
                          <span key={wi} style={{
                            color: wi === eIdx ? '#4caf50' : 'inherit',
                            transition: 'color 0.1s',
                          }}>{w}{' '}</span>
                        ))}
                      </div>
                    )}
                    {t.user && (
                      <div style={{ color, marginLeft: '14px' }}>
                        {t.user.spanish} {fb && (fb.outcome === 'good' ? '✓' : fb.outcome === 'okay' ? '~' : '✗')}
                      </div>
                    )}
                    {fb && (fb.outcome !== 'good') && (
                      <div style={{ marginLeft: '14px', fontSize: '11px', color: '#ddd', borderLeft: `2px solid ${color}`, paddingLeft: '8px' }}>
                        💡 {fb.explanation}
                        {fb.correction && <div style={{ color, marginTop: '2px' }}>→ {fb.correction}</div>}
                      </div>
                    )}
                  </div>
                )
              })}
              {loading && <div style={{ fontSize: '11px', color: '#888' }}>Barny is thinking…</div>}
            </div>

            {error && <div style={{ fontSize: '11px', color: '#e53935' }}>⚠️ {error}</div>}
            {micError && <div style={{ fontSize: '11px', color: '#ff9800' }}>🎤 {micError}</div>}

            <div style={{ display: 'flex', gap: '4px' }}>
              <input
                value={draft}
                placeholder={listening ? '🎤 Listening… (say "punto" / "coma" / "interrogación")' : 'Escribe tu respuesta en español…'}
                disabled={loading}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
                style={{
                  flex: 1, padding: '8px 10px', fontSize: '13px',
                  fontFamily: 'var(--font-ui)', background: '#1a1a1a',
                  border: `2px solid ${listening ? '#2196f3' : 'var(--color-accent)'}`, borderRadius: '3px',
                  color: '#fff', boxSizing: 'border-box', outline: 'none',
                }}
              />
              {recognitionSupported && (
                <button
                  className={`xp-btn${listening ? ' mic-listening' : ''}`}
                  disabled={loading}
                  title={listening ? 'Stop listening — say "punto", "coma", "interrogación" for punctuation' : 'Speak in Spanish — say "punto", "coma", "interrogación" for punctuation'}
                  style={{
                    minWidth: 'auto', padding: '4px 10px',
                    border: `2px solid ${listening ? '#2196f3' : 'var(--color-accent)'}`,
                    color: listening ? '#2196f3' : undefined,
                  }}
                  onClick={() => {
                    if (listening) {
                      stopListenRef.current?.()
                      setListening(false)
                      return
                    }
                    setMicError(null)
                    setListening(true)
                    stopListenRef.current = startListening(
                      (text, isFinal) => {
                        const processed = isFinal ? applySpanishPunctuation(text) : text
                        setDraft(processed)
                        if (isFinal && processed) {
                          stopListenRef.current?.()
                          setListening(false)
                          send(processed)
                        }
                      },
                      (errorReason) => {
                        setListening(false)
                        if (errorReason) {
                          const msg = describeRecognitionError(errorReason)
                          if (msg) setMicError(msg)
                        }
                      },
                      { lang: 'es-ES', continuous: true, interim: true },
                    )
                  }}
                >
                  {listening ? '⏹' : '🎤'}
                </button>
              )}
              <button className="xp-btn xp-btn-primary" disabled={loading || !draft.trim()} onClick={() => send()}>Send</button>
            </div>

            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <button
                className="xp-btn"
                disabled={loading || loadingSuggest || turns.length === 0}
                onClick={suggest}
                style={{ fontSize: '11px', padding: '4px 10px' }}
              >
                {loadingSuggest ? '…' : '💡 Suggest'}
              </button>
              {suggestions.length > 0 && (
                <span style={{ fontSize: '10px', color: '#888' }}>Click to use →</span>
              )}
            </div>

            {suggestions.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    className="xp-btn"
                    onClick={() => { setDraft(s.spanish); setSuggestions([]) }}
                    style={{ textAlign: 'left', padding: '6px 10px', fontSize: '12px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '2px' }}
                  >
                    <span style={{ color: 'var(--color-accent)', fontWeight: 'bold' }}>{s.spanish}</span>
                    {s.phonetic && (
                      <span style={{ color: '#b89cff', fontSize: '11px', fontStyle: 'italic' }}>🔤 {s.phonetic}</span>
                    )}
                    <span style={{ color: '#888', fontSize: '11px' }}>— {s.english}</span>
                  </button>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button className="xp-btn" style={{ fontSize: '11px' }} onClick={reset}>⇦ Change Scene</button>
              <button className="xp-btn" style={{ fontSize: '11px' }} onClick={() => navigate('/dashboard')}>← Dashboard</button>
            </div>
          </div>
        )}
      </XpWindow>
    </div>
  )
}
