import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { XpWindow } from '../components/XpWindow'
import { Barny, RotatingBarnyIcon } from '../components/Barny'
import { useStore } from '../store/useStore'
import { useVocab } from '../data/useVocab'
import { pickLesson, type LessonBundle } from '../utils/lessonPicker'
import { chatWithAI, chatInLesson, type AiTurn, type AiReply } from '../utils/aiChat'
import { speak, speakCycle, speechSupported, recognitionSupported, startListening, applySpanishPunctuation, describeRecognitionError } from '../utils/speak'
import { weakestFirst } from '../utils/srs'
import { checkAnswer, almostMessage } from '../utils/answerCheck'
import { getHint } from '../utils/hints'
import type { VocabularyItem } from '../types/vocabulary'

type Length = 'quick' | 'full'
type Stage = 'pick' | 'warmup' | 'intro' | 'drill' | 'chat' | 'recap'
type DrillSource = 'lesson' | 'mistakes' | 'weak'

const WARMUP_MIN_SEEN = 2
const WARMUP_MAX_MASTERY = 3
const WARMUP_MAX = 3
const MISTAKE_REVIEW_MAX = 5
const WEAK_DRILL_MAX = 5
const WEAK_DRILL_MIN = 3
const MISTAKE_RECOMMEND_MIN = 3
const DRILL_CUTOFF_MIN_ANSWERED = 4
const DRILL_CUTOFF_ACCURACY = 0.5
const DRILL_CUTOFF_MIN_REMAINING = 3

const LENGTHS: Record<Length, { vocab: number; sentences: number; chatTurns: number; minutes: number }> = {
  quick: { vocab: 5,  sentences: 1, chatTurns: 3, minutes: 5 },
  full:  { vocab: 12, sentences: 3, chatTurns: 6, minutes: 15 },
}

function norm(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[¿?¡!.,;:]/g, '').trim()
}

const CLOZE_STOPWORDS = new Set([
  'el','la','los','las','un','una','y','o','de','a','en','que','se','lo','le','les','con','por','para','no','es','son','soy','está',
])

function pickClozeWord(
  correction: string,
  vocabWords: string[],
): { before: string; word: string; after: string } | null {
  const tokens = correction.split(/(\s+)/) // preserves whitespace tokens
  const vocab = new Set(vocabWords.map(norm))
  let pickIdx = -1
  for (let i = 0; i < tokens.length; i++) {
    if (/^\s*$/.test(tokens[i])) continue
    if (vocab.has(norm(tokens[i]))) { pickIdx = i; break }
  }
  if (pickIdx === -1) {
    for (let i = 0; i < tokens.length; i++) {
      if (/^\s*$/.test(tokens[i])) continue
      const lo = norm(tokens[i])
      if (!lo || CLOZE_STOPWORDS.has(lo) || lo.length < 2) continue
      pickIdx = i; break
    }
  }
  if (pickIdx === -1) return null
  return {
    before: tokens.slice(0, pickIdx).join(''),
    word: tokens[pickIdx],
    after: tokens.slice(pickIdx + 1).join(''),
  }
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
  const clearMistakesForWord = useStore((s) => s.clearMistakesForWord)
  const skipWarmup = useStore((s) => s.skipWarmup)
  const setSkipWarmup = useStore((s) => s.setSkipWarmup)
  const srs = useStore((s) => s.srs)
  const vocabAll = useVocab()

  const [length, setLength] = useState<Length | null>(null)
  const [bundle, setBundle] = useState<LessonBundle | null>(null)
  const [stage, setStage] = useState<Stage>('pick')

  // Warm-up state
  const [warmupWords, setWarmupWords] = useState<VocabularyItem[]>([])
  const [warmupIdx, setWarmupIdx] = useState(0)
  const [warmupFlipped, setWarmupFlipped] = useState(false)

  // Drill state
  const [drillSource, setDrillSource] = useState<DrillSource>('lesson')
  const [drillItems, setDrillItems] = useState<VocabularyItem[]>([])
  const [drillIdx, setDrillIdx] = useState(0)
  const [drillTyped, setDrillTyped] = useState('')
  const [drillFeedback, setDrillFeedback] = useState<'correct' | 'almost' | 'incorrect' | null>(null)
  const [drillCorrect, setDrillCorrect] = useState(0)
  const [drillCutShort, setDrillCutShort] = useState(false)
  const [drillListening, setDrillListening] = useState(false)
  const [drillMicError, setDrillMicError] = useState<string | null>(null)
  const drillStopRef = useRef<(() => void) | null>(null)

  // Low-mastery words eligible for the "Drill weak words" recap shortcut.
  const weakWords = useMemo(() => {
    return weakestFirst(vocabAll, srs).filter((v) => (srs?.[v.id]?.mastery ?? 5) < 3)
  }, [vocabAll, srs])

  // Words across all vocab with logged mistakes — drives the "Review mistakes" entry point.
  const mistakeWords = useMemo(() => {
    const out: VocabularyItem[] = []
    for (const v of vocabAll) {
      const e = srs?.[v.id]
      if (e?.mistakes && e.mistakes.length > 0) out.push(v)
    }
    // Most-recent mistake first.
    out.sort((a, b) => {
      const am = srs?.[a.id]?.mistakes ?? []
      const bm = srs?.[b.id]?.mistakes ?? []
      return (bm[bm.length - 1]?.when ?? 0) - (am[am.length - 1]?.when ?? 0)
    })
    return out
  }, [vocabAll, srs])

  // Cloze-from-correction (filled in by sendChat when Barny corrects the learner)
  const [cloze, setCloze] = useState<{ turnIdx: number; before: string; word: string; after: string } | null>(null)
  const [clozeTyped, setClozeTyped] = useState('')
  const [clozeResult, setClozeResult] = useState<'correct' | 'wrong' | null>(null)

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

  // Pick up to WARMUP_MAX weak words (mastery < threshold, seen ≥ floor).
  function computeWarmup(): VocabularyItem[] {
    const ranked = weakestFirst(vocabAll, srs)
    const eligible: VocabularyItem[] = []
    for (const v of ranked) {
      const e = srs?.[v.id]
      if (!e) continue
      if ((e.seen ?? 0) < WARMUP_MIN_SEEN) continue
      if (e.mastery >= WARMUP_MAX_MASTERY) continue
      eligible.push(v)
      if (eligible.length >= WARMUP_MAX) break
    }
    return eligible
  }

  // Step counter for the progress bar.
  const warmupCount = warmupWords.length
  const totalSteps = useMemo(() => {
    if (!bundle || !length) return 0
    return warmupCount /* warmup */ + 1 /* intro */ + bundle.vocab.length /* drill */ + LENGTHS[length].chatTurns /* chat */ + 1 /* recap */
  }, [bundle, length, warmupCount])
  const currentStep = useMemo(() => {
    if (!bundle || !length) return 0
    if (stage === 'pick') return 0
    if (stage === 'warmup') return warmupIdx
    if (stage === 'intro') return warmupCount + 1
    if (stage === 'drill') return warmupCount + 1 + drillIdx
    if (stage === 'chat') return warmupCount + 1 + bundle.vocab.length + Math.min(chatTurns.length, LENGTHS[length].chatTurns)
    return totalSteps
  }, [stage, drillIdx, chatTurns.length, bundle, length, totalSteps, warmupIdx, warmupCount])

  async function startLesson() {
    if (!bundle || !length || !aiApiKey) return
    // Drill driven by lesson vocab.
    setDrillSource('lesson')
    setDrillItems(bundle.vocab)
    setDrillIdx(0)
    setDrillCorrect(0)
    setDrillCutShort(false)
    // Warm-up gate.
    const eligible = skipWarmup ? [] : computeWarmup()
    if (eligible.length > 0) {
      setWarmupWords(eligible)
      setWarmupIdx(0)
      setWarmupFlipped(false)
      setStage('warmup')
      if (speechSupported) setTimeout(() => speak(eligible[0].spanish_word), 250)
      return
    }
    setWarmupWords([])
    await runIntro()
  }

  async function runIntro() {
    if (!bundle || !aiApiKey) return
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

  // Enter advances the drill after feedback is shown (the input is disabled
  // in that state, so its onKeyDown won't fire on its own).
  useEffect(() => {
    if (stage !== 'drill' || !drillFeedback) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Enter') return
      const tag = (e.target as HTMLElement | null)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      e.preventDefault()
      submitDrill()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, drillFeedback])

  function advanceWarmup() {
    const next = warmupIdx + 1
    if (next >= warmupWords.length) {
      runIntro()
    } else {
      setWarmupIdx(next)
      setWarmupFlipped(false)
      if (speechSupported) setTimeout(() => speak(warmupWords[next].spanish_word), 100)
    }
  }

  function submitDrill() {
    if (drillItems.length === 0) return
    if (drillFeedback) {
      // Advance.
      const next = drillIdx + 1
      setDrillFeedback(null)
      setDrillTyped('')
      if (next >= drillItems.length || (drillCutShort && drillSource === 'lesson')) {
        if (drillSource === 'mistakes' || drillSource === 'weak') {
          // Side drills end back at the lesson home.
          finishSideDrill(drillSource)
        } else {
          setStage('chat')
          startChatRound()
        }
      } else {
        setDrillIdx(next)
      }
      return
    }
    const word = drillItems[drillIdx]
    const verdict = checkAnswer(drillTyped, word.spanish_word, true)
    // 'almost' = a one-letter typo or a missing accent — close enough to count as
    // remembered for scheduling, but we still surface a nudge below.
    const ok = verdict !== 'wrong'
    setDrillFeedback(verdict === 'wrong' ? 'incorrect' : verdict)
    if (ok) {
      setDrillCorrect((c) => c + 1)
      reviewWord(word.id, true)
      // Mistake review: a correct answer clears the word's logged mistakes.
      if (drillSource === 'mistakes') clearMistakesForWord(word.id)
    } else {
      reviewWord(word.id, false, { typed: drillTyped.trim(), expected: word.spanish_word })
    }
    // Adaptive cutoff: if a lesson drill is going badly, bail to chat instead of piling on.
    if (drillSource === 'lesson') {
      const answered = drillIdx + 1
      const correctSoFar = drillCorrect + (ok ? 1 : 0)
      const remaining = drillItems.length - answered
      if (
        answered >= DRILL_CUTOFF_MIN_ANSWERED &&
        correctSoFar / answered < DRILL_CUTOFF_ACCURACY &&
        remaining >= DRILL_CUTOFF_MIN_REMAINING
      ) {
        setDrillCutShort(true)
      }
    }
  }

  function finishSideDrill(source: 'mistakes' | 'weak') {
    const mode = source === 'mistakes' ? 'lesson-mistake-review' : 'lesson-weak-drill'
    recordResult(mode, drillCorrect, drillItems.length)
    setStage('pick')
    setBundle(null)
    setLength(null)
    setChatTurns([])
    setDraft('')
    setDrillItems([])
    setDrillIdx(0)
    setDrillCorrect(0)
    setDrillFeedback(null)
    setDrillTyped('')
    setDrillSource('lesson')
    setDrillCutShort(false)
  }

  function startMistakeReview() {
    const items = mistakeWords.slice(0, MISTAKE_REVIEW_MAX)
    if (items.length === 0) return
    setDrillSource('mistakes')
    setDrillItems(items)
    setDrillIdx(0)
    setDrillCorrect(0)
    setDrillCutShort(false)
    setDrillFeedback(null)
    setDrillTyped('')
    setStage('drill')
  }

  function startWeakDrill() {
    const items = weakWords.slice(0, WEAK_DRILL_MAX)
    if (items.length === 0) return
    setDrillSource('weak')
    setDrillItems(items)
    setDrillIdx(0)
    setDrillCorrect(0)
    setDrillCutShort(false)
    setDrillFeedback(null)
    setDrillTyped('')
    setStage('drill')
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

  function submitCloze() {
    if (!cloze) return
    if (clozeResult) {
      setCloze(null)
      setClozeResult(null)
      setClozeTyped('')
      return
    }
    const ok = norm(clozeTyped) === norm(cloze.word)
    setClozeResult(ok ? 'correct' : 'wrong')
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

      // If Barny corrected us, derive a one-word cloze from the correction.
      if (reply.feedback?.correction && reply.feedback.outcome !== 'good' && bundle) {
        const picked = pickClozeWord(reply.feedback.correction, bundle.vocab.map((v) => v.spanish_word))
        if (picked) {
          setCloze({ turnIdx: lastIdx, ...picked })
          setClozeTyped('')
          setClozeResult(null)
        } else {
          setCloze(null)
        }
      } else {
        setCloze(null)
      }

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

          {mistakeWords.length > 0 && (
            <button
              className="xp-btn"
              style={{ marginTop: '14px', padding: '10px', textAlign: 'left' }}
              onClick={startMistakeReview}
            >
              <div style={{ fontSize: '13px', fontWeight: 'bold' }}>🩹 Review mistakes — {Math.min(mistakeWords.length, MISTAKE_REVIEW_MAX)} words</div>
              <div style={{ fontSize: '11px', color: '#666' }}>Re-drill the words you got wrong recently</div>
            </button>
          )}

          <button className="xp-btn" style={{ marginTop: '14px' }} onClick={() => navigate('/dashboard')}>← Dashboard</button>
        </XpWindow>
      </div>
    )
  }

  const pct = totalSteps > 0 ? Math.round((currentStep / totalSteps) * 100) : 0
  const word = stage === 'drill' && drillItems.length > 0 ? drillItems[drillIdx] : null
  const warmupWord = stage === 'warmup' ? warmupWords[warmupIdx] : null
  const hint = drillFeedback === 'incorrect' && word ? getHint(word) : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px', width: '100%' }}>
      <XpWindow title={`Lesson — ${bundle?.topicLabel ?? ''}`} icon="📘" width="min(560px, 100%)" onClose={() => navigate('/dashboard')} style={{ flex: 1, maxHeight: 'none' }}>
        {/* Progress bar */}
        <div style={{ height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden', marginBottom: '10px' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: 'var(--color-accent)', transition: 'width 0.3s' }} />
        </div>

        {/* Warm-up: flip cards for the learner's weakest words */}
        {stage === 'warmup' && warmupWord && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ fontSize: '12px', color: '#888' }}>
              Warm-up {warmupIdx + 1} of {warmupWords.length} · weak words to refresh
            </div>
            <div
              role="button"
              tabIndex={0}
              onClick={() => setWarmupFlipped((f) => !f)}
              onKeyDown={(e) => {
                if (e.key === ' ') { e.preventDefault(); setWarmupFlipped((f) => !f); return }
                if (e.key === 'Enter') {
                  e.preventDefault()
                  if (warmupFlipped) advanceWarmup()
                  else setWarmupFlipped(true)
                }
              }}
              style={{
                padding: '24px 16px', textAlign: 'center',
                border: '2px solid var(--color-accent)', borderRadius: '4px',
                background: 'rgba(255,255,255,0.04)', cursor: 'pointer',
              }}
            >
              <div style={{ fontSize: '22px', color: 'var(--color-accent)' }}>{warmupWord.spanish_word}</div>
              <div style={{ marginTop: '12px', fontSize: '14px', color: warmupFlipped ? '#bbb' : 'transparent', minHeight: '18px' }}>
                {warmupFlipped ? warmupWord.english_translation : '— tap to reveal —'}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              {speechSupported && (
                <button className="xp-btn" style={{ fontSize: '11px' }} onClick={() => speakCycle(warmupWord.spanish_word)}>🔊 Hear it</button>
              )}
              <button
                className="xp-btn xp-btn-primary"
                style={{ flex: 1 }}
                onClick={advanceWarmup}
              >
                {warmupIdx + 1 >= warmupWords.length ? 'Begin lesson →' : 'Next word →'}
              </button>
            </div>
            <button
              className="xp-btn"
              style={{ fontSize: '11px', alignSelf: 'flex-end' }}
              onClick={() => { setSkipWarmup(true); runIntro() }}
            >Skip warm-up (don't ask again)</button>
          </div>
        )}

        {/* Intro */}
        {stage === 'intro' && bundle && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {chatLoading && <div style={{ fontSize: '11px', color: '#888' }}>Barny is thinking…</div>}
            {chatTurns[0] && (() => {
              const sWords = chatTurns[0].barny.spanish.split(/\s+/)
              const eWords = chatTurns[0].barny.english.split(/\s+/)
              const eIdx = wordIdx >= 0
                ? Math.round(wordIdx / Math.max(sWords.length - 1, 1) * Math.max(eWords.length - 1, 1))
                : -1
              return (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '18px', color: 'var(--color-accent)' }}>
                    <RotatingBarnyIcon size={120} />
                    <span>{sWords.map((w, wi) => (
                      <span key={wi} style={{ textDecoration: wi === wordIdx ? 'underline' : 'none', transition: 'text-decoration 0.1s' }}>{w}{' '}</span>
                    ))}</span>
                    {speechSupported && (
                      <button
                        className="xp-btn"
                        style={{ fontSize: '10px', padding: '0 6px', marginLeft: '6px' }}
                        onClick={() => { setWordIdx(-1); setTimeout(() => speakCycle(chatTurns[0].barny.spanish, setWordIdx), 50) }}
                      >🔊</button>
                    )}
                  </div>
                  <div style={{ color: '#888', fontSize: '14px', marginLeft: '14px' }}>
                    {eWords.map((w, wi) => (
                      <span key={wi} style={{ color: wi === eIdx ? '#4caf50' : 'inherit', transition: 'color 0.1s' }}>{w}{' '}</span>
                    ))}
                  </div>
                </>
              )
            })()}
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
            <div style={{ fontSize: '12px', color: '#888' }}>
              {drillSource === 'mistakes' ? '🩹 Mistake review' : drillSource === 'weak' ? '🎯 Weak words' : 'Word'} {drillIdx + 1} of {drillItems.length}
            </div>
            <div style={{ fontSize: '22px', color: 'var(--color-accent)', textAlign: 'center', padding: '10px 0' }}>
              {word.english_translation}
            </div>
            <form
              onSubmit={(e) => { e.preventDefault(); if (drillFeedback || drillTyped.trim()) submitDrill() }}
              style={{ display: 'flex', gap: '4px' }}
            >
              <input
                value={drillTyped}
                disabled={drillFeedback !== null}
                placeholder={drillListening ? '🎤 Listening…' : 'Type in Spanish…'}
                onChange={(e) => setDrillTyped(e.target.value)}
                autoFocus
                autoCapitalize="off"
                autoCorrect="off"
                autoComplete="off"
                spellCheck={false}
                inputMode="text"
                enterKeyHint="done"
                style={{
                  flex: 1, padding: '8px 10px', fontSize: '14px',
                  background: '#1a1a1a',
                  border: `2px solid ${drillFeedback === 'correct' ? '#4caf50' : drillFeedback === 'almost' ? '#ffb300' : drillFeedback === 'incorrect' ? '#e53935' : drillListening ? '#2196f3' : 'var(--color-accent)'}`,
                  borderRadius: '3px', color: '#fff', outline: 'none', boxSizing: 'border-box',
                }}
              />
              {recognitionSupported && (
                <button
                  type="button"
                  className={`xp-btn${drillListening ? ' mic-listening' : ''}`}
                  disabled={drillFeedback !== null}
                  title="Speak in Spanish"
                  style={{
                    minWidth: '44px', padding: '4px 10px',
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
              <button type="submit" className="xp-btn xp-btn-primary" disabled={!drillFeedback && !drillTyped.trim()}>
                {drillFeedback ? 'Next →' : 'Check'}
              </button>
            </form>
            {drillMicError && <div style={{ fontSize: '11px', color: '#ff9800' }}>🎤 {drillMicError}</div>}
            {drillFeedback === 'correct' && (
              <div style={{ fontSize: '13px', color: '#4caf50' }}>✓ {word.spanish_word}</div>
            )}
            {drillFeedback === 'almost' && (() => {
              const { msg, showAnswer } = almostMessage(drillTyped, word.spanish_word)
              return (
                <div style={{ fontSize: '13px', color: '#ffb300' }}>
                  ✓ {msg}{showAnswer && <> <strong>{word.spanish_word}</strong></>}
                </div>
              )
            })()}
            {drillFeedback === 'incorrect' && (
              <div style={{ fontSize: '13px', color: '#e53935' }}>
                ✗ {drillTyped.trim() && (
                  <>
                    <span style={{ textDecoration: 'line-through', opacity: 0.7 }}>{drillTyped}</span>
                    {' → '}
                  </>
                )}
                <strong>{word.spanish_word}</strong>
              </div>
            )}
            {hint && (
              <div style={{
                fontSize: '12px', color: '#bbb',
                padding: '8px 10px', borderLeft: '3px solid var(--color-accent)',
                background: 'rgba(255,255,255,0.04)', borderRadius: '2px',
              }}>💡 {hint}</div>
            )}
            {speechSupported && drillFeedback && (
              <button
                className="xp-btn"
                style={{ fontSize: '11px', alignSelf: 'flex-start' }}
                onClick={() => speakCycle(word.spanish_word)}
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
                const eWords = t.barny.english.split(/\s+/)
                const activeWordIdx = isLast ? wordIdx : -1
                const eIdx = activeWordIdx >= 0
                  ? Math.round(activeWordIdx / Math.max(sWords.length - 1, 1) * Math.max(eWords.length - 1, 1))
                  : -1
                return (
                  <div key={i} style={{ fontSize: '17px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ color: 'var(--color-accent)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <RotatingBarnyIcon size={120} />
                      <span>{sWords.map((w, wi) => (
                        <span key={wi} style={{ textDecoration: wi === activeWordIdx ? 'underline' : 'none', transition: 'text-decoration 0.1s' }}>{w}{' '}</span>
                      ))}</span>
                      {speechSupported && (
                        <button className="xp-btn" style={{ fontSize: '10px', padding: '0 6px', marginLeft: '6px' }}
                          onClick={() => { setWordIdx(-1); setTimeout(() => speakCycle(t.barny.spanish, setWordIdx), 50) }}>🔊</button>
                      )}
                    </div>
                    <div style={{ color: '#777', fontSize: '14px', marginLeft: '14px' }}>
                      {eWords.map((w, wi) => (
                        <span key={wi} style={{ color: wi === eIdx ? '#4caf50' : 'inherit', transition: 'color 0.1s' }}>{w}{' '}</span>
                      ))}
                    </div>
                    {t.user && (
                      <div style={{ color: '#ddd', marginLeft: '14px' }}>{t.user.spanish}</div>
                    )}
                    {t.feedback && t.feedback.outcome !== 'good' && (
                      <div style={{ marginLeft: '14px', fontSize: '11px', color: '#bbb', borderLeft: `2px solid ${t.feedback.outcome === 'okay' ? '#ff9800' : '#e53935'}`, paddingLeft: '8px' }}>
                        💡 {t.feedback.explanation}
                        {t.feedback.correction && <div style={{ marginTop: '2px' }}>→ {t.feedback.correction}</div>}
                        {cloze && cloze.turnIdx === i && (
                          <div style={{ marginTop: '6px', padding: '6px', background: 'rgba(255,255,255,0.04)', borderRadius: '3px' }}>
                            <div style={{ color: '#ddd', marginBottom: '4px' }}>Fill in the missing word:</div>
                            <div style={{ fontSize: '13px', color: '#fff', marginBottom: '6px' }}>
                              {cloze.before}
                              <span style={{ borderBottom: '1px solid #ff9800', padding: '0 18px', color: '#ff9800' }}>
                                {clozeResult ? cloze.word : '____'}
                              </span>
                              {cloze.after}
                            </div>
                            {clozeResult === null && (
                              <form
                                onSubmit={(e) => { e.preventDefault(); if (clozeTyped.trim()) submitCloze() }}
                                style={{ display: 'flex', gap: '4px' }}
                              >
                                <input
                                  autoFocus
                                  value={clozeTyped}
                                  onChange={(e) => setClozeTyped(e.target.value)}
                                  autoCapitalize="off"
                                  autoCorrect="off"
                                  autoComplete="off"
                                  spellCheck={false}
                                  inputMode="text"
                                  enterKeyHint="done"
                                  style={{ flex: 1, padding: '4px 6px', fontSize: '12px', background: '#1a1a1a', border: '1px solid var(--color-accent)', borderRadius: '3px', color: '#fff', outline: 'none' }}
                                />
                                <button type="submit" className="xp-btn xp-btn-primary" style={{ fontSize: '11px' }} disabled={!clozeTyped.trim()}>Check</button>
                              </form>
                            )}
                            {clozeResult === 'correct' && (
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#4caf50' }}>
                                <span>¡Eso! ✓</span>
                                <button className="xp-btn" style={{ fontSize: '11px' }} onClick={submitCloze}>Next →</button>
                              </div>
                            )}
                            {clozeResult === 'wrong' && (
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#e53935' }}>
                                <span>Answer: <strong>{cloze.word}</strong></span>
                                <button className="xp-btn" style={{ fontSize: '11px' }} onClick={submitCloze}>Next →</button>
                              </div>
                            )}
                          </div>
                        )}
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
                autoCapitalize="off"
                autoCorrect="off"
                autoComplete="off"
                spellCheck={false}
                inputMode="text"
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
                    minWidth: '44px', padding: '4px 10px',
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
                        if (isFinal) {
                          chatStopRef.current?.()
                          setChatListening(false)
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
              {drillCutShort && (
                <div style={{ marginTop: '6px', fontSize: '11px', color: '#888', fontStyle: 'italic' }}>
                  Drill cut short — we'll revisit the rest next time.
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              {mistakeWords.length >= MISTAKE_RECOMMEND_MIN ? (
                <button className="xp-btn xp-btn-primary" style={{ flex: 1 }} onClick={() => {
                  setBundle(null); setLength(null); setChatTurns([]); setDraft('')
                  startMistakeReview()
                }}>🩹 Review your mistakes ({mistakeWords.length})</button>
              ) : weakWords.length >= WEAK_DRILL_MIN ? (
                <button className="xp-btn xp-btn-primary" style={{ flex: 1 }} onClick={() => {
                  setBundle(null); setLength(null); setChatTurns([]); setDraft('')
                  startWeakDrill()
                }}>🎯 Drill weak words</button>
              ) : (
                <button className="xp-btn xp-btn-primary" style={{ flex: 1 }} onClick={() => {
                  setStage('pick'); setBundle(null); setLength(null)
                  setChatTurns([]); setDraft(''); setDrillIdx(0); setDrillCorrect(0); setDrillFeedback(null); setDrillTyped(''); setDrillCutShort(false)
                }}>Another lesson</button>
              )}
              <button className="xp-btn" onClick={() => navigate('/dashboard')}>← Dashboard</button>
            </div>
          </div>
        )}
      </XpWindow>
    </div>
  )
}
