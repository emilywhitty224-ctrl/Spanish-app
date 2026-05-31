import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { XpWindow } from '../components/XpWindow'
import { Barny, RotatingBarnyIcon } from '../components/Barny'
import { CONVERSATIONS, CATEGORIES, findConversation, type Reply, type ConversationCategory } from '../data/conversations'
import { speak, speechSupported } from '../utils/speak'
import { useStore } from '../store/useStore'

interface Turn {
  barnySpanish: string
  barnyEnglish: string
  userSpanish: string
  userEnglish: string
  outcome: Reply['outcome']
}

export function ChatWithBarny() {
  const navigate = useNavigate()
  const recordResult = useStore((s) => s.recordResult)
  const [category, setCategory] = useState<ConversationCategory | null>(null)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [nodeId, setNodeId] = useState<string | null>(null)
  const [history, setHistory] = useState<Turn[]>([])
  const [done, setDone] = useState(false)
  const [showEnglish, setShowEnglish] = useState(true)
  const [pendingReply, setPendingReply] = useState<Reply | null>(null)
  const [wordIdx, setWordIdx] = useState(-1)

  const convo = conversationId ? findConversation(conversationId) : null
  const node = convo && nodeId ? convo.nodes[nodeId] : null

  function startConversation(id: string) {
    const c = findConversation(id)
    if (!c) return
    setConversationId(id)
    setNodeId(c.startId)
    setHistory([])
    setDone(false)
    setPendingReply(null)
    setWordIdx(-1)
    if (speechSupported) setTimeout(() => speak(c.nodes[c.startId].barny, setWordIdx), 250)
  }

  function pickReply(reply: Reply) {
    if (!node || pendingReply) return
    setPendingReply(reply)
  }

  function continueFromFeedback() {
    if (!node || !pendingReply) return
    const reply = pendingReply
    const turn: Turn = {
      barnySpanish: node.barny,
      barnyEnglish: node.barnyEnglish,
      userSpanish: reply.spanish,
      userEnglish: reply.english,
      outcome: reply.outcome,
    }
    const nextHistory = [...history, turn]
    setHistory(nextHistory)
    setPendingReply(null)

    if (reply.next === null) {
      setDone(true)
      const goodCount = nextHistory.filter((t) => t.outcome === 'good').length
      recordResult('chat-with-barny', goodCount, nextHistory.length)
    } else if (convo) {
      setNodeId(reply.next)
      setWordIdx(-1)
      if (speechSupported) setTimeout(() => speak(convo.nodes[reply.next!].barny, setWordIdx), 350)
    }
  }

  function reset() {
    setConversationId(null)
    setNodeId(null)
    setHistory([])
    setDone(false)
    setPendingReply(null)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px', width: '100%' }}>
      <XpWindow title="Chat with Barny" icon="💬" width="min(560px, 100%)" onClose={() => navigate('/dashboard')} style={{ flex: 1, maxHeight: 'none' }}>

        {/* Pick a category */}
        {!convo && !category && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              fontSize: '12px', color: '#888', borderBottom: '1px solid var(--color-button-shadow)', paddingBottom: '8px',
            }}>
              <span style={{ color: 'var(--color-accent)', fontWeight: 'bold' }}>Pick a campaign</span>
              <button
                className="xp-btn"
                style={{ fontSize: '11px', minWidth: 'auto', padding: '4px 10px' }}
                onClick={() => navigate('/dashboard')}
              >
                ← Dashboard
              </button>
            </div>

            <Barny message="¡Hola! Pick a topic to chat about. 🐾" size="small" />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {CATEGORIES.map((cat) => {
                const count = CONVERSATIONS.filter((c) => c.category === cat.id).length
                return (
                  <button
                    key={cat.id}
                    className="xp-btn xp-btn-large"
                    style={{ width: '100%', textAlign: 'left', padding: '12px 16px' }}
                    onClick={() => setCategory(cat.id)}
                  >
                    <div style={{ fontSize: '15px', marginBottom: '3px' }}>{cat.icon} {cat.label}</div>
                    <div style={{ fontSize: '11px', fontWeight: 'normal', color: '#444' }}>
                      {cat.description} · {count} scene{count === 1 ? '' : 's'}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Pick a scene within category */}
        {!convo && category && (() => {
          const cat = CATEGORIES.find((c) => c.id === category)!
          const scenes = CONVERSATIONS.filter((c) => c.category === category)
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                fontSize: '12px', color: '#888', borderBottom: '1px solid var(--color-button-shadow)', paddingBottom: '8px',
              }}>
                <span style={{ color: 'var(--color-accent)', fontWeight: 'bold' }}>
                  {cat.icon} {cat.label}
                </span>
                <button
                  className="xp-btn"
                  style={{ fontSize: '11px', minWidth: 'auto', padding: '4px 10px' }}
                  onClick={() => setCategory(null)}
                >
                  ← Campaigns
                </button>
              </div>

              <Barny message="Pick a scene! 🐾" size="small" />

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {scenes.map((c) => (
                  <button
                    key={c.id}
                    className="xp-btn"
                    style={{ width: '100%', textAlign: 'left', padding: '12px 14px' }}
                    onClick={() => startConversation(c.id)}
                  >
                    <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '3px' }}>
                      {c.icon} {c.title}
                    </div>
                    <div style={{ fontSize: '11px', color: '#888', fontWeight: 'normal' }}>{c.description}</div>
                  </button>
                ))}
              </div>
            </div>
          )
        })()}

        {/* End of conversation */}
        {convo && done && (() => {
          const good = history.filter((t) => t.outcome === 'good').length
          const okay = history.filter((t) => t.outcome === 'okay').length
          const bad = history.filter((t) => t.outcome === 'bad').length
          const score = good + okay * 0.5
          const pct = score / history.length
          const pose = pct >= 0.8 ? 'celebrate' : pct >= 0.5 ? 'happy' : 'sad'
          const msg =
            pct >= 0.8 ? `¡Excelente conversación! ${good}/${history.length} natural replies 🐾` :
            pct >= 0.5 ? `Good chat! ${good} natural, ${okay} okay, ${bad} off 🐾` :
            `Keep practising — ${bad} reply${bad === 1 ? '' : 'ies'} didn't quite work 🐾`
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <p style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--color-accent)', textAlign: 'center', margin: 0 }}>
                Conversation Complete!
              </p>
              <Barny message={msg} size="medium" pose={pose} />

              <div style={{ border: '1px solid var(--color-button-shadow)', borderRadius: '4px', padding: '10px', background: 'rgba(255,255,255,0.03)' }}>
                <div style={{ fontSize: '11px', color: '#888', letterSpacing: '0.5px', marginBottom: '6px' }}>TRANSCRIPT</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {history.map((t, i) => (
                    <div key={i} style={{ fontSize: '12px', lineHeight: 1.4 }}>
                      <div style={{ color: 'var(--color-accent)', display: 'flex', alignItems: 'center', gap: '4px' }}><RotatingBarnyIcon size={120} /> {t.barnySpanish}</div>
                      <div style={{
                        color: t.outcome === 'good' ? '#4caf50' : t.outcome === 'okay' ? '#ff9800' : '#e53935',
                        marginLeft: '14px',
                      }}>
                        🧑 {t.userSpanish} {t.outcome === 'good' ? '✓' : t.outcome === 'okay' ? '~' : '✗'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button className="xp-btn xp-btn-primary" onClick={() => startConversation(convo.id)}>↺ Try Again</button>
                <button className="xp-btn" onClick={reset}>⇦ Change Scene</button>
                <button className="xp-btn" onClick={() => navigate('/dashboard')}>← Dashboard</button>
              </div>
            </div>
          )
        })()}

        {/* Active conversation */}
        {convo && node && !done && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: '#888' }}>
              <span>{convo.icon} {convo.title}</span>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', cursor: 'pointer' }}>
                <input type="checkbox" checked={showEnglish} onChange={(e) => setShowEnglish(e.target.checked)} />
                Show English
              </label>
            </div>

            {/* Transcript so far */}
            {history.length > 0 && (
              <div style={{
                maxHeight: '180px', overflowY: 'auto',
                border: '1px solid var(--color-button-shadow)', borderRadius: '4px',
                padding: '8px', background: 'rgba(255,255,255,0.02)',
                display: 'flex', flexDirection: 'column', gap: '6px',
              }}>
                {history.map((t, i) => (
                  <div key={i} style={{ fontSize: '11px', lineHeight: 1.4 }}>
                    <div style={{ color: 'var(--color-accent)', display: 'flex', alignItems: 'center', gap: '4px' }}><RotatingBarnyIcon size={120} /> {t.barnySpanish}</div>
                    <div style={{
                      color: t.outcome === 'good' ? '#4caf50' : t.outcome === 'okay' ? '#ff9800' : '#e53935',
                      marginLeft: '14px',
                    }}>
                      🧑 {t.userSpanish}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Barny's current line */}
            <div style={{
              border: '2px solid var(--color-accent)', borderRadius: '4px',
              padding: '14px', background: 'rgba(255,255,255,0.03)',
            }}>
              <Barny message={node.barny} size="small" wordIdx={wordIdx} />
              {showEnglish && (() => {
                const sWords = node.barny.split(/\s+/)
                const eWords = node.barnyEnglish.split(/\s+/)
                const eIdx = wordIdx >= 0
                  ? Math.round(wordIdx / Math.max(sWords.length - 1, 1) * Math.max(eWords.length - 1, 1))
                  : -1
                return (
                  <p style={{ fontSize: '16px', color: '#888', textAlign: 'center', marginTop: '8px', marginBottom: 0 }}>
                    ({eWords.map((w, i) => (
                      <span key={i} style={{
                        color: i === eIdx ? '#4caf50' : 'inherit',
                        transition: 'color 0.1s',
                      }}>{w} </span>
                    ))})
                  </p>
                )
              })()}
              {speechSupported && (
                <div style={{ textAlign: 'center', marginTop: '8px' }}>
                  <button
                    className="xp-btn"
                    style={{ fontSize: '11px', padding: '3px 10px' }}
                    onClick={() => { setWordIdx(-1); setTimeout(() => speak(node.barny, setWordIdx), 50) }}
                  >
                    🔊 Hear it again
                  </button>
                </div>
              )}
            </div>

            {/* Reply choices — English/explanations only appear after a pick */}
            {!pendingReply && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ fontSize: '11px', color: '#888', letterSpacing: '0.5px' }}>
                  YOUR REPLY (pick one — feedback shown after):
                </div>
                {node.replies.map((r, i) => (
                  <button
                    key={i}
                    className="xp-btn"
                    style={{ width: '100%', textAlign: 'left', padding: '10px 12px' }}
                    onClick={() => pickReply(r)}
                  >
                    <div style={{ fontSize: '13px' }}>
                      <span style={{ color: '#888', marginRight: '6px' }}>{i + 1}.</span>
                      {r.spanish}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Feedback panel — shown after picking, before advancing */}
            {pendingReply && (() => {
              const r = pendingReply
              const color = r.outcome === 'good' ? '#4caf50' : r.outcome === 'okay' ? '#ff9800' : '#e53935'
              const label = r.outcome === 'good' ? '✓ Natural' : r.outcome === 'okay' ? '~ Understandable' : '✗ Not quite'
              const headline =
                r.outcome === 'good' ? '¡Bien hecho!' :
                r.outcome === 'okay' ? 'Got the meaning across' :
                "Let's look at why"
              return (
                <div style={{
                  border: `2px solid ${color}`, borderRadius: '4px',
                  padding: '12px', background: 'rgba(255,255,255,0.03)',
                  display: 'flex', flexDirection: 'column', gap: '10px',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color, fontWeight: 'bold', fontSize: '13px' }}>{label}</span>
                    <span style={{ color: '#888', fontSize: '11px' }}>{headline}</span>
                  </div>

                  <div style={{ fontSize: '13px', color }}>
                    🧑 {r.spanish}
                  </div>
                  {showEnglish && (
                    <div style={{ fontSize: '11px', color: '#aaa', marginTop: '-4px' }}>
                      {r.english}
                    </div>
                  )}

                  {r.explanation && (
                    <div style={{
                      fontSize: '12px', lineHeight: 1.5, color: '#ddd',
                      borderTop: '1px solid var(--color-button-shadow)', paddingTop: '8px',
                    }}>
                      💡 {r.explanation}
                    </div>
                  )}

                  <button
                    className="xp-btn xp-btn-primary"
                    style={{ alignSelf: 'flex-end', padding: '6px 16px' }}
                    onClick={continueFromFeedback}
                  >
                    {r.next === null ? 'Finish →' : 'Continue →'}
                  </button>
                </div>
              )
            })()}

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button className="xp-btn" style={{ fontSize: '11px' }} onClick={reset}>⇦ Change Scene</button>
              <span style={{ fontSize: '11px', color: '#888', alignSelf: 'center' }}>Turn {history.length + 1}</span>
            </div>
          </div>
        )}

      </XpWindow>
    </div>
  )
}
