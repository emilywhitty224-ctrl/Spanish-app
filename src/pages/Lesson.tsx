import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { XpWindow } from '../components/XpWindow'
import { Barny, RotatingBarnyIcon } from '../components/Barny'
import { useStore } from '../store/useStore'
import { useVocab } from '../data/useVocab'
import { pickLesson, type LessonBundle } from '../utils/lessonPicker'
import { chatWithAI, chatInLesson, type AiTurn, type AiReply } from '../utils/aiChat'
import { speak, speechSupported, recognitionSupported, startListening, applySpanishPunctuation, describeRecognitionError } from '../utils/speak'

type Length = 'quick' | 'full'
type Stage = 'pick' | 'intro' | 'drill' | 'chat' | 'recap'

const LENGTHS: Record<Length, { vocab: number; sentences: number; chatTurns: number; minutes: number }> = {
  quick: { vocab: 5,  sentences: 1, chatTurns: 3, minutes: 5 },
  full:  { vocab: 12, sentences: 3, chatTurns: 6, minutes: 15 },
}

function norm(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[¿?¡!.,;:]/g, '').trim()
}

interface ChatTurn {
  barny: { spanish: string; english: string }
  user?: { spanish: string }
  feedback?: AiReply['feedback']
}

export function Lesson() {
  const navigate = useNavigate()
  const { aiProvider, aiApiKey } = useStore()
  const recordResult = useStore((s) => s.recordResult)
  const reviewWord = useStore((s) => s.reviewWord)
  const srs = useStore((s) => s.srs[s.userProfile])
  const vocabAll = useVocab()

  const [length, setLength] = useState<Length | null>(null)
  const [bundle, setBundle] = useState<LessonBundle | null>(null)
  const [stage, setStage] = useState<Stage>('pick')

  // Drill state
  const [drillIdx, setDrillIdx] = useState(0)
  const [drillTyped, setDrillTyped] = useState('')
  const [drillFeedback, setDrillFeedback] = useState<'correct' | 'incorrect' | null>(null)
  const [drillCorrect, setDrillCorrect] = useState(0)
  const [drillListening, setDrillListening] = useState(false)
  const [drillMicError, setDrillMicError] = useState<string | null>(null)
  const drillStopRef = useRef<(() => void) | null>(null)

  // Chat state
  const [chatTurns, setChatTurns] = useState<ChatTurn[]>([])
  const [draft, setDraft] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [chatError, setChatError] = useState<string | null>(null)
  const [wordIdx, setWordIdx] = useState(-1)
  const [chatListening, setChatListening] = useState(false)
  const [chatMicError, setChatMicError] = useState<string | null>(null)
  const chatStopRef = useRef<(() => void) | null>(null)

  function reshuffle(len: Length) {
    setLength(len)
    setBundle(pickLesson(vocabAll, srs, LENGTHS[len].vocab, LENGTHS[len].sentences, bundle?.topicTag))
  }

  function pickLen(len: Length) {
    setLength(len)
    setBundle(pickLesson(vocabAll, srs, LENGTHS[len].vocab, LENGTHS[len].sentences))
  }

  // Step counter for the progress bar.
  const totalSteps = useMemo(() => {
    if (!bundle || !length) return 0
    return 1 /* intro */ + bundle.vocab.length /* drill */ + LENGTHS[length].chatTurns /* chat */ + 1 /* recap */
  }, [bundle, length])
  const currentStep = useMemo(() => {
    if (!bundle || !length) return 0
    if (stage === 'pick') return 0
    if (stage === 'intro') return 1
    if (stage === 'drill') return 1 + drillIdx
    if (stage === 'chat') return 1 + bundle.vocab.length + Math.min(chatTurns.length, LENGTHS[length].chatTurns)
    return totalSteps
  }, [stage, drillIdx, chatTurns.length, bundle, length, totalSteps])

  async function startLesson() {
    if (!bundle || !length || !aiApiKey) return
    setStage('intro')
    setChatLoading(true)
    setChatError(null)
    try {
      // Have Barny introduce the lesson focus (single turn, scenario tightly scoped).
      const reply = await chatWithAI(
        aiProvider,
        aiApiKey,
        `You are Barny opening a short Spanish lesson on "${bundle.topicLabel}". In ONE short Spanish sentence, name the topic and invite the learner to start. Do NOT ask a question. Do NOT give feedback.`,
        [],
      )
      setChatTurns([{ barny: { spanish: reply.barnySpanish, english: reply.barnyEnglish } }])
      if (speechSupported) setTimeout(() => { setWordIdx(-1); speak(reply.barnySpanish, setWordIdx) }, 250)
    } catch (e) {
      setChatError(e instanceof Error ? e.message : String(e))
    } finally {
      setChatLoading(false)
    }
  }

  function submitDrill() {
    if (!bundle) return
    if (drillFeedback) {
      // Advance.
      const next = drillIdx + 1
      setDrillFeedback(null)
      setDrillTyped('')
      if (next >= bundle.vocab.length) {
        setStage('chat')
        startChatRound()
      } else {
        setDrillIdx(next)
      }
      return
    }
    const word = bundle.vocab[drillIdx]
    const ok = norm(drillTyped) === norm(word.spanish_word)
    setDrillFeedback(ok ? 'correct' : 'incorrect')
    if (ok) setDrillCorrect((c) => c + 1)
    reviewWord(word.id, ok)
  }

  async function startChatRound() {
    if (!bundle || !aiApiKey) return
    setChatLoading(true)
    setChatError(null)
    try {
      const reply = await chatInLesson(
        aiProvider,
        aiApiKey,
        bundle.topicLabel,
        bundle.vocab.map((v) => v.spanish_word),
        [],
      )
      setChatTurns([{ barny: { spanish: reply.barnySpanish, english: reply.barnyEnglish } }])
      if (speechSupported) setTimeout(() => { setWordIdx(-1); speak(reply.barnySpanish, setWordIdx) }, 250)
    } catch (e) {
      setChatError(e instanceof Error ? e.message : String(e))
    } finally {
      setChatLoading(false)
    }
  }

  async function sendChat(textOverride?: string) {
    if (!bundle || !length || !aiApiKey) return
    const source = (textOverride ?? draft).trim()
    if (!source || chatLoading) return
    setDraft('')

    const optimistic: ChatTurn[] = [...chatTurns]
    const lastIdx = optimistic.length - 1
    optimistic[lastIdx] = { ...optimistic[lastIdx], user: { spanish: source } }
    setChatTurns(optimistic)
    setChatLoading(true)
    setChatError(null)

    const history: AiTurn[] = []
    optimistic.forEach((t) => {
      history.push({ role: 'barny', spanish: t.barny.spanish })
      if (t.user) history.push({ role: 'user', spanish: t.user.spanish })
    })

    try {
      const reply = await chatInLesson(
        aiProvider,
        aiApiKey,
        bundle.topicLabel,
        bundle.vocab.map((v) => v.spanish_word),
        history,
      )
      const next = [...optimistic]
      next[lastIdx] = { ...next[lastIdx], feedback: reply.feedback }

      // Have we hit the chat budget?
      const userExchanges = next.filter((t) => t.user).length
      if (userExchanges >= LENGTHS[length].chatTurns) {
        // End of chat — go to recap.
        setChatTurns(next)
        finishLesson(next)
      } else {
        next.push({ barny: { spanish: reply.barnySpanish, english: reply.barnyEnglish } })
        setChatTurns(next)
        if (speechSupported) setTimeout(() => { setWordIdx(-1); speak(reply.barnySpanish, setWordIdx) }, 250)
      }
    } catch (e) {
      setChatError(e instanceof Error ? e.message : String(e))
    } finally {
      setChatLoading(false)
    }
  }

  function finishLesson(finalTurns: ChatTurn[]) {
    if (!bundle) return
    const chatCorrect = finalTurns.filter((t) => t.feedback && t.feedback.outcome === 'good').length
    const chatTotal = finalTurns.filter((t) => t.user).length
    const totalCorrect = drillCorrect + chatCorrect
    const totalAnswered = bundle.vocab.length + chatTotal
    recordResult('lesson', totalCorrect, totalAnswered)
    setStage('recap')
  }

  // Cleanup any open mic when leaving stages.
  useEffect(() => {
    return () => {
      drillStopRef.current?.()
      chatStopRef.current?.()
    }
  }, [])

  // ── Render ───────────────────────────────────────────────
  if (stage === 'pick') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px', width: '100%' }}>
        <XpWindow title="Lessons" icon="📘" width="min(560px, 100%)" onClose={() => navigate('/dashboard')}>
          {!aiApiKey && (
            <div style={{ marginBottom: '12px', padding: '10px', border: '2px solid #e53935', borderRadius: '4px', fontSize: '12px' }}>
              No API key set. Go to <button className="xp-btn" style={{ fontSize: '11px', padding: '2px 8px' }} onClick={() => navigate('/settings')}>⚙️ Settings</button> to paste one.
            </div>
          )}
          <Barny message="Vamos. Pick how long you've got." size="small" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
            <button
              className="xp-btn"
              disabled={!aiApiKey}
              style={{ padding: '12px', textAlign: 'left' }}
              onClick={() => pickLen('quick')}
            >
              <div style={{ fontSize: '14px', fontWeight: 'bold' }}>⚡ Quick — 5 min</div>
              <div style={{ fontSize: '11px', color: '#666' }}>5 words · 1 sentence · short chat</div>
            </button>
            <button
              className="xp-btn"
              disabled={!aiApiKey}
              style={{ padding: '12px', textAlign: 'left' }}
              onClick={() => pickLen('full')}
            >
              <div style={{ fontSize: '14px', fontWeight: 'bold' }}>📘 Full — 15 min</div>
              <div style={{ fontSize: '11px', color: '#666' }}>12 words · 3 sentences · longer chat</div>
            </button>
          </div>

          {bundle && length && (
            <div style={{ marginTop: '14px', padding: '10px', border: '1px solid var(--color-button-shadow)', borderRadius: '4px' }}>
              <div style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>NEXT LESSON</div>
              <div style={{ fontSize: '15px', fontWeight: 'bold', color: 'var(--color-accent)' }}>{bundle.topicLabel}</div>
              <div style={{ fontSize: '11px', color: '#888', marginTop: '4px' }}>
                {bundle.vocab.slice(0, 6).map((v) => v.spanish_word).join(' · ')}{bundle.vocab.length > 6 ? '…' : ''}
              </div>
              <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }}>
                <button className="xp-btn xp-btn-primary" style={{ flex: 1 }} onClick={startLesson}>▶ Start</button>
                <button className="xp-btn" style={{ fontSize: '11px' }} onClick={() => reshuffle(length)}>🔄 Different topic</button>
              </div>
            </div>
          )}

          <button className="xp-btn" style={{ marginTop: '14px' }} onClick={() => navigate('/dashboard')}>← Dashboard</button>
        </XpWindow>
      </div>
    )
  }

  const pct = totalSteps > 0 ? Math.round((currentStep / totalSteps) * 100) : 0
  const word = stage === 'drill' && bundle ? bundle.vocab[drillIdx] : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px', width: '100%' }}>
      <XpWindow title={`Lesson — ${bundle?.topicLabel ?? ''}`} icon="📘" width="min(560px, 100%)" onClose={() => navigate('/dashboard')} style={{ flex: 1, maxHeight: 'none' }}>
        {/* Progress bar */}
        <div style={{ height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden', marginBottom: '10px' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: 'var(--color-accent)', transition: 'width 0.3s' }} />
        </div>

        {/* Intro */}
        {stage === 'intro' && bundle && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {chatLoading && <div style={{ fontSize: '11px', color: '#888' }}>Barny is thinking…</div>}
            {chatTurns[0] && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '18px', color: 'var(--color-accent)' }}>
                <RotatingBarnyIcon size={120} />
                <span>{chatTurns[0].barny.spanish}</span>
              </div>
            )}
            {chatTurns[0] && (
              <div style={{ color: '#888', fontSize: '14px', marginLeft: '14px' }}>{chatTurns[0].barny.english}</div>
            )}
            {chatError && <div style={{ fontSize: '11px', color: '#e53935' }}>⚠️ {chatError}</div>}
            <button
              className="xp-btn xp-btn-primary"
              disabled={chatLoading || chatTurns.length === 0}
              onClick={() => setStage('drill')}
            >Begin drill →</button>
          </div>
        )}

        {/* Drill: show English, type Spanish */}
        {stage === 'drill' && word && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ fontSize: '12px', color: '#888' }}>Word {drillIdx + 1} of {bundle?.vocab.length}</div>
            <div style={{ fontSize: '22px', color: 'var(--color-accent)', textAlign: 'center', padding: '10px 0' }}>
              {word.english_translation}
            </div>
            <div style={{ display: 'flex', gap: '4px' }}>
              <input
                value={drillTyped}
                disabled={drillFeedback !== null}
                placeholder={drillListening ? '🎤 Listening…' : 'Type in Spanish…'}
                onChange={(e) => setDrillTyped(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') submitDrill() }}
                autoFocus
                style={{
                  flex: 1, padding: '8px 10px', fontSize: '14px',
                  background: '#1a1a1a',
                  border: `2px solid ${drillFeedback === 'correct' ? '#4caf50' : drillFeedback === 'incorrect' ? '#e53935' : drillListening ? '#2196f3' : 'var(--color-accent)'}`,
                  borderRadius: '3px', color: '#fff', outline: 'none', boxSizing: 'border-box',
                }}
              />
              {recognitionSupported && (
                <button
                  className={`xp-btn${drillListening ? ' mic-listening' : ''}`}
                  disabled={drillFeedback !== null}
                  title="Speak in Spanish"
                  style={{
                    minWidth: 'auto', padding: '4px 10px',
                    border: `2px solid ${drillListening ? '#2196f3' : 'var(--color-accent)'}`,
                    color: drillListening ? '#2196f3' : undefined,
                  }}
                  onClick={() => {
                    if (drillListening) {
                      drillStopRef.current?.()
                      setDrillListening(false)
                      return
                    }
                    setDrillMicError(null)
                    setDrillListening(true)
                    drillStopRef.current = startListening(
                      (text, isFinal) => {
                        setDrillTyped(text)
                        if (isFinal) setDrillListening(false)
                      },
                      (err) => {
                        setDrillListening(false)
                        if (err) {
                          const m = describeRecognitionError(err)
                          if (m) setDrillMicError(m)
                        }
                      },
                      'es-ES',
                    )
                  }}
                >{drillListening ? '⏹' : '🎤'}</button>
              )}
              <button className="xp-btn xp-btn-primary" disabled={!drillFeedback && !drillTyped.trim()} onClick={submitDrill}>
                {drillFeedback ? 'Next →' : 'Check'}
              </button>
            </div>
            {drillMicError && <div style={{ fontSize: '11px', color: '#ff9800' }}>🎤 {drillMicError}</div>}
            {drillFeedback === 'correct' && (
              <div style={{ fontSize: '13px', color: '#4caf50' }}>✓ {word.spanish_word}</div>
            )}
            {drillFeedback === 'incorrect' && (
              <div style={{ fontSize: '13px', color: '#e53935' }}>✗ Correct: <strong>{word.spanish_word}</strong></div>
            )}
            {speechSupported && drillFeedback && (
              <button
                className="xp-btn"
                style={{ fontSize: '11px', alignSelf: 'flex-start' }}
                onClick={() => speak(word.spanish_word)}
              >🔊 Hear it</button>
            )}
          </div>
        )}

        {/* Chat */}
        {stage === 'chat' && bundle && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{
              maxHeight: '320px', overflowY: 'auto',
              border: '1px solid var(--color-button-shadow)', borderRadius: '4px',
              padding: '10px', display: 'flex', flexDirection: 'column', gap: '10px',
            }}>
              {chatTurns.map((t, i) => {
                const isLast = i === chatTurns.length - 1
                const sWords = t.barny.spanish.split(/\s+/)
                const activeWordIdx = isLast ? wordIdx : -1
                return (
                  <div key={i} style={{ fontSize: '17px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ color: 'var(--color-accent)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <RotatingBarnyIcon size={120} />
                      <span>{sWords.map((w, wi) => (
                        <span key={wi} style={{ textDecoration: wi === activeWordIdx ? 'underline' : 'none' }}>{w}{' '}</span>
                      ))}</span>
                      {speechSupported && (
                        <button className="xp-btn" style={{ fontSize: '10px', padding: '0 6px', marginLeft: '6px' }}
                          onClick={() => { setWordIdx(-1); setTimeout(() => speak(t.barny.spanish, setWordIdx), 50) }}>🔊</button>
                      )}
                    </div>
                    <div style={{ color: '#777', fontSize: '14px', marginLeft: '14px' }}>{t.barny.english}</div>
                    {t.user && (
                      <div style={{ color: '#ddd', marginLeft: '14px' }}>{t.user.spanish}</div>
                    )}
                    {t.feedback && t.feedback.outcome !== 'good' && (
                      <div style={{ marginLeft: '14px', fontSize: '11px', color: '#bbb', borderLeft: `2px solid ${t.feedback.outcome === 'okay' ? '#ff9800' : '#e53935'}`, paddingLeft: '8px' }}>
                        💡 {t.feedback.explanation}
                        {t.feedback.correction && <div style={{ marginTop: '2px' }}>→ {t.feedback.correction}</div>}
                      </div>
                    )}
                  </div>
                )
              })}
              {chatLoading && <div style={{ fontSize: '11px', color: '#888' }}>Barny is thinking…</div>}
            </div>
            {chatError && <div style={{ fontSize: '11px', color: '#e53935' }}>⚠️ {chatError}</div>}
            {chatMicError && <div style={{ fontSize: '11px', color: '#ff9800' }}>🎤 {chatMicError}</div>}
            <div style={{ display: 'flex', gap: '4px' }}>
              <input
                value={draft}
                disabled={chatLoading}
                placeholder={chatListening ? '🎤 Listening… (say "punto" / "coma")' : 'Escribe tu respuesta…'}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat() } }}
                style={{
                  flex: 1, padding: '8px 10px', fontSize: '13px',
                  background: '#1a1a1a',
                  border: `2px solid ${chatListening ? '#2196f3' : 'var(--color-accent)'}`,
                  borderRadius: '3px', color: '#fff', outline: 'none', boxSizing: 'border-box',
                }}
              />
              {recognitionSupported && (
                <button
                  className={`xp-btn${chatListening ? ' mic-listening' : ''}`}
                  disabled={chatLoading}
                  title="Speak in Spanish"
                  style={{
                    minWidth: 'auto', padding: '4px 10px',
                    border: `2px solid ${chatListening ? '#2196f3' : 'var(--color-accent)'}`,
                    color: chatListening ? '#2196f3' : undefined,
                  }}
                  onClick={() => {
                    if (chatListening) {
                      chatStopRef.current?.()
                      setChatListening(false)
                      return
                    }
                    setChatMicError(null)
                    setChatListening(true)
                    chatStopRef.current = startListening(
                      (text, isFinal) => {
                        const processed = isFinal ? applySpanishPunctuation(text) : text
                        setDraft(processed)
                        if (isFinal && processed) {
                          chatStopRef.current?.()
                          setChatListening(false)
                          sendChat(processed)
                        }
                      },
                      (err) => {
                        setChatListening(false)
                        if (err) {
                          const m = describeRecognitionError(err)
                          if (m) setChatMicError(m)
                        }
                      },
                      { lang: 'es-ES', continuous: true, interim: true },
                    )
                  }}
                >{chatListening ? '⏹' : '🎤'}</button>
              )}
              <button className="xp-btn xp-btn-primary" disabled={chatLoading || !draft.trim()} onClick={() => sendChat()}>Send</button>
            </div>
            <button className="xp-btn" style={{ fontSize: '11px', alignSelf: 'flex-end' }} onClick={() => finishLesson(chatTurns)}>End early →</button>
          </div>
        )}

        {/* Recap */}
        {stage === 'recap' && bundle && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <Barny message={`¡Bien hecho! You practiced ${bundle.topicLabel}.`} size="small" />
            <div style={{ marginTop: '10px', padding: '10px', border: '1px solid var(--color-button-shadow)', borderRadius: '4px' }}>
              <div style={{ fontSize: '11px', color: '#888', marginBottom: '6px' }}>WORDS COVERED</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {bundle.vocab.map((v) => (
                  <span key={v.id} style={{ fontSize: '12px', padding: '3px 8px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px' }}>
                    {v.spanish_word}
                  </span>
                ))}
              </div>
              <div style={{ marginTop: '10px', fontSize: '12px', color: '#bbb' }}>
                Drill: <strong style={{ color: '#4caf50' }}>{drillCorrect}/{bundle.vocab.length}</strong>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button className="xp-btn xp-btn-primary" style={{ flex: 1 }} onClick={() => {
                setStage('pick'); setBundle(null); setLength(null)
                setChatTurns([]); setDraft(''); setDrillIdx(0); setDrillCorrect(0); setDrillFeedback(null); setDrillTyped('')
              }}>Another lesson</button>
              <button className="xp-btn" onClick={() => navigate('/dashboard')}>← Dashboard</button>
            </div>
          </div>
        )}
      </XpWindow>
    </div>
  )
}
