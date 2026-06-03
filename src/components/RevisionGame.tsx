import { useState, useMemo, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { XpWindow } from './XpWindow'
import { Barny } from './Barny'
import type { BarneyPose } from './Barny'
import { useStore } from '../store/useStore'
import { pickDueFirst } from '../utils/srs'
import { checkAnswer, checkAnswerForWord } from '../utils/answerCheck'
import { getHint } from '../utils/hints'
import { CONJUGATIONS, LADDER_PERSONS, listConjugatableVerbs, type Person } from '../data/conjugations'
import { speak, speechSupported, recognitionSupported, startListening, applySpanishPunctuation, describeRecognitionError } from '../utils/speak'
import { SENTENCES, pickSentences, tokenize, type Sentence } from '../data/sentences'
import type { VocabularyItem } from '../types/vocabulary'

type RevisionMode =
  | 'flashcard' | 'multiple-choice' | 'fill-in-the-blank' | 'mixed'
  | 'reverse' | 'true-false' | 'matching' | 'memory' | 'speed-round' | 'gusta-drill'
  | 'cloze-sentence' | 'dictation' | 'word-order' | 'listening' | 'conjugation'

type GustaQuestion = { thing: string; english: string; answer: 'gusta' | 'gustan' }

const GUSTA_BANK: GustaQuestion[] = [
  { thing: 'el vino tinto',      english: 'red wine',   answer: 'gusta' },
  { thing: 'la sangría',         english: 'sangria',    answer: 'gusta' },
  { thing: 'el agua',            english: 'water',      answer: 'gusta' },
  { thing: 'el café',            english: 'coffee',     answer: 'gusta' },
  { thing: 'el chocolate',       english: 'chocolate',  answer: 'gusta' },
  { thing: 'las tapas',          english: 'tapas',      answer: 'gustan' },
  { thing: 'las patatas fritas', english: 'chips',      answer: 'gustan' },
  { thing: 'los perros',         english: 'dogs',       answer: 'gustan' },
  { thing: 'las fotos',          english: 'photos',     answer: 'gustan' },
  { thing: 'los gatos',          english: 'cats',       answer: 'gustan' },
]

// Per-round caps so big decks stay playable; each round samples a fresh subset.
const SEQUENTIAL_CAP = 12
const MATCHING_CAP = 8
const MEMORY_CAP = 6
const SENTENCE_CAP = 6

type QuizQuestion =
  | { format: 'flashcard'; item: VocabularyItem }
  | { format: 'multiple-choice'; item: VocabularyItem; options: string[] }
  | { format: 'fill-in-the-blank'; item: VocabularyItem }
  | { format: 'reverse'; item: VocabularyItem }
  | { format: 'listening'; item: VocabularyItem }
  | { format: 'conjugation'; item: VocabularyItem; verb: string; person: Person; expected: string }
  | { format: 'true-false'; item: VocabularyItem; shownTranslation: string; isCorrectPair: boolean }

type MemoryCard = { id: number; itemId: string; side: 'spanish' | 'english'; text: string }

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function buildQuestions(vocab: VocabularyItem[], mode: RevisionMode): QuizQuestion[] {
  if (mode === 'matching' || mode === 'memory' || mode === 'gusta-drill') return []
  if (mode === 'conjugation') return buildConjugationLadder(vocab)
  return shuffle(vocab).map((item): QuizQuestion => {
    if (mode === 'flashcard') return { format: 'flashcard', item }
    if (mode === 'fill-in-the-blank') return { format: 'fill-in-the-blank', item }
    if (mode === 'reverse') return { format: 'reverse', item }
    if (mode === 'listening') return { format: 'listening', item }
    if (mode === 'true-false') {
      if (vocab.length < 2) return { format: 'flashcard', item }
      const useCorrect = Math.random() < 0.5
      const shownTranslation = useCorrect
        ? item.english_translation
        : shuffle(vocab.filter(v => v.id !== item.id))[0].english_translation
      return { format: 'true-false', item, shownTranslation, isCorrectPair: useCorrect }
    }
    if (mode === 'multiple-choice' || mode === 'speed-round') {
      if (vocab.length < 4) return { format: 'flashcard', item }
      const distractors = shuffle(vocab.filter(v => v.id !== item.id))
        .slice(0, 3)
        .map(v => v.english_translation)
      return { format: 'multiple-choice', item, options: shuffle([item.english_translation, ...distractors]) }
    }
    // mixed
    const roll = Math.random()
    if (roll < 0.2) return { format: 'reverse', item }
    if (roll < 0.4) return { format: 'fill-in-the-blank', item }
    if (roll < 0.55 && vocab.length >= 2) {
      const useCorrect = Math.random() < 0.5
      const shownTranslation = useCorrect
        ? item.english_translation
        : shuffle(vocab.filter(v => v.id !== item.id))[0].english_translation
      return { format: 'true-false', item, shownTranslation, isCorrectPair: useCorrect }
    }
    if (vocab.length < 4 || roll < 0.75) return { format: 'flashcard', item }
    const distractors = shuffle(vocab.filter(v => v.id !== item.id))
      .slice(0, 3)
      .map(v => v.english_translation)
    return { format: 'multiple-choice', item, options: shuffle([item.english_translation, ...distractors]) }
  })
}

function stubVerbItem(verb: string): VocabularyItem {
  return {
    id: `irregular:${verb}`,
    spanish_word: verb,
    english_translation: '(irregular verb)',
    type: 'verb',
    tags: ['irregular'],
    mastery_level: 0,
    next_review_date: '',
    beginner_safe: true,
  }
}

function buildConjugationLadder(vocab: VocabularyItem[]): QuizQuestion[] {
  // Prefer verbs the deck already includes (so SRS can update); otherwise
  // fall back to a random handful of the irregulars table.
  const deckVerbs = vocab
    .map((v) => ({ v, key: v.spanish_word.toLowerCase().trim() }))
    .filter((x) => CONJUGATIONS[x.key])
  const all = listConjugatableVerbs()
  const picked = deckVerbs.length > 0
    ? shuffle(deckVerbs).slice(0, 3).map((x) => ({ verb: x.key, item: x.v }))
    : shuffle(all).slice(0, 3).map((verb) => ({ verb, item: stubVerbItem(verb) }))
  const out: QuizQuestion[] = []
  for (const { verb, item } of picked) {
    for (const person of LADDER_PERSONS) {
      out.push({ format: 'conjugation', item, verb, person, expected: CONJUGATIONS[verb][person] })
    }
  }
  return out
}

function buildMemoryCards(vocab: VocabularyItem[]): MemoryCard[] {
  const cards: MemoryCard[] = []
  vocab.forEach((item, i) => {
    cards.push({ id: i * 2,     itemId: item.id, side: 'spanish', text: item.spanish_word })
    cards.push({ id: i * 2 + 1, itemId: item.id, side: 'english', text: item.english_translation })
  })
  return shuffle(cards)
}

const FORMAT_LABEL: Record<QuizQuestion['format'], string> = {
  'flashcard':        'Flashcard',
  'multiple-choice':  'Multiple Choice',
  'fill-in-the-blank':'Fill in the Blank',
  'reverse':          'Reverse',
  'listening':        'Listening',
  'conjugation':      'Conjugation',
  'true-false':       'True / False',
}

const ICON_PATHS: Record<RevisionMode, string> = {
  'flashcard':         'M5 7h11v11H5z M8 4h11v11',
  'multiple-choice':   'M4 6h4v4H4z M11 8h9 M4 14h4v4H4z M11 16h9',
  'fill-in-the-blank': 'M3 17l9-9 4 4-9 9H3z M14 6l3-3 4 4-3 3',
  'reverse':           'M4 9a8 8 0 0114-5l2 2 M20 15a8 8 0 01-14 5l-2-2 M18 4v4h-4 M6 20v-4h4',
  'true-false':        'M3 7l3 3 5-6 M3 17l5 4 M16 15l6 6 M22 15l-6 6',
  'matching':          'M6 5v14 M18 5v14 M6 8h12 M6 16h12',
  'memory':            'M4 4h7v7H4z M13 4h7v7h-7z M4 13h7v7H4z M13 13h7v7h-7z',
  'speed-round':       'M13 2L4 14h7l-2 8 9-12h-7z',
  'mixed':             'M4 4h7v7H4z M13 13h7v7h-7z M7 7h.5 M16.5 16.5h.5',
  'gusta-drill':       'M5 6h6 M8 6v12 M14 10h5 M16.5 10v8',
  'cloze-sentence':    'M3 7h7 M12 7h2 M16 7h5 M3 13h4 M9 13h6 M17 13h4 M3 19h9 M14 19h7',
  'dictation':         'M12 4v12 M9 13l3 3 3-3 M4 18v2h16v-2',
  'word-order':        'M4 6h5v5H4z M11 6h5v5h-5z M18 6h2v5h-2z M4 14h3v5H4z M9 14h6v5H9z M17 14h3v5h-3z',
  'listening':         'M12 4v12 M9 13l3 3 3-3 M4 18v2h16v-2',
  'conjugation':       'M4 6h16 M4 12h16 M4 18h16 M8 4v16 M16 4v16',
}

function SpeakButton({ text }: { text: string }) {
  if (!speechSupported) return null
  return (
    <button
      className="xp-btn"
      aria-label="Hear pronunciation"
      title="Hear it in Spanish"
      style={{ minWidth: 'auto', padding: '4px 8px', marginLeft: '8px', verticalAlign: 'middle' }}
      onClick={(e) => { e.stopPropagation(); speak(text) }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth={2} strokeLinejoin="round" style={{ display: 'block' }}>
        <path d="M4 9h4l5-4v14l-5-4H4z" fill="var(--color-accent)" />
        <path d="M16 8a5 5 0 010 8" />
      </svg>
    </button>
  )
}

function ModeIcon({ id, size = 26 }: { id: RevisionMode; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--color-accent)"
      strokeWidth={2}
      strokeLinecap="square"
      strokeLinejoin="miter"
      style={{ display: 'block', shapeRendering: 'crispEdges' }}
    >
      <path d={ICON_PATHS[id]} />
    </svg>
  )
}

const BARNY_MESSAGES = [
  'You can do it! 🐾',
  'Keep going, almost there!',
  '¡Muy bien! Stay focused!',
  'Woof! You\'re doing great!',
  'Every word gets you closer! 🐾',
]

function barnyResult(correct: number, total: number) {
  const pct = correct / total
  if (pct >= 0.8) return `¡Excelente! ${correct}/${total} — you nailed it! 🐾`
  if (pct >= 0.5) return `Not bad! ${correct}/${total} — keep practising! 🐾`
  return `${correct}/${total} — don't give up, try again! 🐾`
}

const MODES: { id: RevisionMode; label: string; desc: string }[] = [
  { id: 'mixed',             label: 'Mixed',             desc: 'Random mix of all formats' },
  { id: 'flashcard',         label: 'Flashcards',        desc: 'Flip to reveal — mark yourself' },
  { id: 'multiple-choice',   label: 'Multiple Choice',   desc: 'Pick the right translation' },
  { id: 'fill-in-the-blank', label: 'Fill in the Blank', desc: 'Type the English translation' },
  { id: 'reverse',           label: 'Reverse',           desc: 'Given English, type the Spanish' },
  { id: 'listening',         label: 'Listening only',    desc: 'Hear it spoken, type the English' },
  { id: 'conjugation',       label: 'Conjugation ladder', desc: 'Walk the persons for irregular verbs' },
  { id: 'true-false',        label: 'True / False',       desc: 'Is this translation correct?' },
  { id: 'matching',          label: 'Matching Pairs',    desc: 'Connect Spanish to English' },
  { id: 'memory',            label: 'Memory Game',       desc: 'Flip cards to find pairs' },
  { id: 'speed-round',       label: 'Speed Round',       desc: 'Multiple choice vs the clock' },
  { id: 'gusta-drill',       label: 'Gusta / Gustan',    desc: 'Singular vs plural agreement' },
  { id: 'cloze-sentence',    label: 'Cloze Sentences',   desc: 'Fill the missing word in real sentences' },
  { id: 'dictation',         label: 'Listening Dictation', desc: 'Hear it spoken, type what you hear' },
  { id: 'word-order',        label: 'Word Order',         desc: 'Tap tiles to rebuild the sentence' },
]

const SPEED_ROUND_SECONDS = 8

export interface RevisionGameProps {
  title: string
  icon: string
  vocab: VocabularyItem[]
  deckLabel: string
  exitTo: string
  onWordResult?: (wordId: string, correct: boolean) => void
}

export function RevisionGame({ title, icon, vocab: allVocab, deckLabel, exitTo, onWordResult }: RevisionGameProps) {
  const navigate = useNavigate()
  const recordResult = useStore((s) => s.recordResult)
  const srs = useStore((s) => s.srs?.[s.userProfile] ?? {})
  const strictAccents = useStore((s) => s.strictAccents)

  const [category, setCategory] = useState<string>('all')
  const categories = useMemo(() => {
    const set = new Set<string>()
    allVocab.forEach((v) => v.tags.forEach((t) => { if (!t.startsWith('lesson_')) set.add(t) }))
    return Array.from(set).sort()
  }, [allVocab])

  const vocab = useMemo(
    () => (category === 'all' ? allVocab : allVocab.filter((v) => v.tags.includes(category))),
    [allVocab, category]
  )

  const [phase, setPhase] = useState<'select' | 'quiz' | 'result' | 'matching' | 'memory' | 'gusta' | 'cloze' | 'dictation' | 'wordorder'>('select')
  const [mode, setMode] = useState<RevisionMode>('mixed')

  // Sequential quiz state
  const initialQuestions = useMemo(() => buildQuestions(pickDueFirst(vocab, srs, SEQUENTIAL_CAP), mode), [])
  const [questions, setQuestions] = useState<QuizQuestion[]>(initialQuestions)
  const [index, setIndex] = useState(0)
  const [results, setResults] = useState<('correct' | 'incorrect')[]>([])

  // Per-question state
  const [flipped, setFlipped] = useState(false)
  const [chosen, setChosen] = useState<string | null>(null)
  const [typed, setTyped] = useState('')
  const [fillFeedback, setFillFeedback] = useState<'correct' | 'almost' | 'incorrect' | null>(null)
  const [tfFeedback, setTfFeedback] = useState<'correct' | 'incorrect' | null>(null)

  // Speed round
  const [timeLeft, setTimeLeft] = useState(SPEED_ROUND_SECONDS)
  const advanceFnRef = useRef<((outcome: 'correct' | 'incorrect') => void) | null>(null)

  // Matching pairs
  const [matchLeft, setMatchLeft] = useState<VocabularyItem[]>([])
  const [matchRight, setMatchRight] = useState<VocabularyItem[]>([])
  const [leftSelected, setLeftSelected] = useState<string | null>(null)
  const [rightSelected, setRightSelected] = useState<string | null>(null)
  const [matched, setMatched] = useState<Set<string>>(new Set())
  const [wrongFlash, setWrongFlash] = useState(false)

  // Memory game
  const [memCards, setMemCards] = useState<MemoryCard[]>([])
  const [flippedIds, setFlippedIds] = useState<number[]>([])
  const [matchedIds, setMatchedIds] = useState<Set<number>>(new Set())
  const [memAttempts, setMemAttempts] = useState(0)
  const [memLocked, setMemLocked] = useState(false)

  // Gusta / gustan drill
  const [gustaQs, setGustaQs] = useState<GustaQuestion[]>([])
  const [gustaIndex, setGustaIndex] = useState(0)
  const [gustaResults, setGustaResults] = useState<('correct' | 'incorrect')[]>([])
  const [gustaChosen, setGustaChosen] = useState<'gusta' | 'gustan' | null>(null)

  // Sentence modes (cloze / dictation / word-order) share the queue.
  const [sentQs, setSentQs] = useState<Sentence[]>([])
  const [sentIndex, setSentIndex] = useState(0)
  const [sentResults, setSentResults] = useState<('correct' | 'incorrect')[]>([])
  const [sentTyped, setSentTyped] = useState('')
  const [sentFeedback, setSentFeedback] = useState<'correct' | 'almost' | 'incorrect' | null>(null)
  const [clozeOptions, setClozeOptions] = useState<string[]>([])
  const [clozeChosen, setClozeChosen] = useState<string | null>(null)
  const [tiles, setTiles] = useState<{ id: number; word: string }[]>([])
  const [built, setBuilt] = useState<number[]>([])
  const [dictListening, setDictListening] = useState(false)
  const [dictMicError, setDictMicError] = useState<string | null>(null)
  const dictStopRef = useRef<(() => void) | null>(null)

  // Score override for non-sequential modes
  const [resultScore, setResultScore] = useState<{ correct: number; total: number } | null>(null)

  // Re-queue tracking: words missed once come back 3 questions later. We
  // identify redo entries by referential identity (WeakSet) so we don't have
  // to extend the QuizQuestion type. Reset per round in startMode.
  const redoQuestions = useRef<WeakSet<QuizQuestion>>(new WeakSet())
  const requeuedIds = useRef<Set<string>>(new Set())

  const current = questions[index]
  const barnyMsg = BARNY_MESSAGES[index % BARNY_MESSAGES.length]

  function resetQuestionState() {
    setFlipped(false)
    setChosen(null)
    setTyped('')
    setFillFeedback(null)
    setTfFeedback(null)
    setTimeLeft(SPEED_ROUND_SECONDS)
  }

  function advance(outcome: 'correct' | 'incorrect') {
    const q = current
    if (q && !q.item.id.startsWith('irregular:')) onWordResult?.(q.item.id, outcome === 'correct')

    // Redo entries don't add to the round's score — they only give the
    // learner a second shot and feed SRS.
    const isRedo = q ? redoQuestions.current.has(q) : false
    if (!isRedo) setResults((prev) => [...prev, outcome])

    let updatedQs = questions
    if (
      outcome === 'incorrect' &&
      q &&
      !isRedo &&
      !requeuedIds.current.has(q.item.id)
    ) {
      requeuedIds.current.add(q.item.id)
      const insertAt = Math.min(index + 3, questions.length)
      const redoCopy: QuizQuestion = { ...q }
      redoQuestions.current.add(redoCopy)
      updatedQs = [
        ...questions.slice(0, insertAt + 1),
        redoCopy,
        ...questions.slice(insertAt + 1),
      ]
      setQuestions(updatedQs)
    }

    if (index + 1 >= updatedQs.length) {
      setPhase('result')
    } else {
      setIndex(index + 1)
      resetQuestionState()
    }
  }

  advanceFnRef.current = advance

  function dontKnow() {
    if (!current) return
    if (current.format === 'flashcard') {
      if (!flipped) setFlipped(true)
      setTimeout(() => advance('incorrect'), 1200)
    } else if (current.format === 'multiple-choice') {
      if (chosen) return
      setChosen('__dontknow__')
      setTimeout(() => advance('incorrect'), 1000)
    } else if (current.format === 'fill-in-the-blank' || current.format === 'reverse' || current.format === 'listening' || current.format === 'conjugation') {
      if (fillFeedback) return
      setFillFeedback('incorrect')
    } else if (current.format === 'true-false') {
      if (tfFeedback) return
      setTfFeedback('incorrect')
      setTimeout(() => advance('incorrect'), 1200)
    }
  }

  function answerGusta(choice: 'gusta' | 'gustan') {
    if (gustaChosen) return
    const q = gustaQs[gustaIndex]
    const outcome: 'correct' | 'incorrect' = choice === q.answer ? 'correct' : 'incorrect'
    setGustaChosen(choice)
    const nextResults = [...gustaResults, outcome]
    setTimeout(() => {
      setGustaResults(nextResults)
      if (gustaIndex + 1 >= gustaQs.length) {
        const correctCount = nextResults.filter((r) => r === 'correct').length
        setResultScore({ correct: correctCount, total: gustaQs.length })
        setPhase('result')
      } else {
        setGustaIndex(gustaIndex + 1)
        setGustaChosen(null)
      }
    }, 800)
  }

  function setupSentenceQuestion(s: Sentence, selected: RevisionMode) {
    setSentTyped('')
    setSentFeedback(null)
    setClozeChosen(null)
    if (selected === 'cloze-sentence') {
      // 3 distractors drawn from other sentences' blanks, deduped.
      const distractorPool = Array.from(
        new Set(SENTENCES.filter((x) => x.blank !== s.blank).map((x) => x.blank))
      )
      const distractors = shuffle(distractorPool).slice(0, 3)
      setClozeOptions(shuffle([s.blank, ...distractors]))
    } else if (selected === 'word-order') {
      setTiles(shuffle(tokenize(s.spanish).map((word, id) => ({ id, word }))))
      setBuilt([])
    } else if (selected === 'dictation') {
      // Auto-play once on entry. Small delay so voices have time to load.
      setTimeout(() => speak(s.spanish), 200)
    }
  }

  function advanceSentence(outcome: 'correct' | 'incorrect') {
    const next = [...sentResults, outcome]
    setSentResults(next)
    if (sentIndex + 1 >= sentQs.length) {
      const correctCount = next.filter((r) => r === 'correct').length
      setResultScore({ correct: correctCount, total: sentQs.length })
      setPhase('result')
    } else {
      const nextIdx = sentIndex + 1
      setSentIndex(nextIdx)
      setupSentenceQuestion(sentQs[nextIdx], mode)
    }
  }

  function startMode(selected: RevisionMode) {
    setMode(selected)
    setIndex(0)
    setResults([])
    setResultScore(null)
    resetQuestionState()
    redoQuestions.current = new WeakSet()
    requeuedIds.current = new Set()

    if (selected === 'matching') {
      const round = pickDueFirst(vocab, srs, MATCHING_CAP)
      setMatchLeft(shuffle(round))
      setMatchRight(shuffle(round))
      setLeftSelected(null)
      setRightSelected(null)
      setMatched(new Set())
      setWrongFlash(false)
      setPhase('matching')
    } else if (selected === 'memory') {
      setMemCards(buildMemoryCards(pickDueFirst(vocab, srs, MEMORY_CAP)))
      setFlippedIds([])
      setMatchedIds(new Set())
      setMemAttempts(0)
      setMemLocked(false)
      setPhase('memory')
    } else if (selected === 'gusta-drill') {
      setGustaQs(shuffle(GUSTA_BANK))
      setGustaIndex(0)
      setGustaResults([])
      setGustaChosen(null)
      setPhase('gusta')
    } else if (selected === 'cloze-sentence' || selected === 'dictation' || selected === 'word-order') {
      const round = pickSentences(SENTENCE_CAP)
      setSentQs(round)
      setSentIndex(0)
      setSentResults([])
      setupSentenceQuestion(round[0], selected)
      setPhase(selected === 'cloze-sentence' ? 'cloze' : selected === 'dictation' ? 'dictation' : 'wordorder')
    } else {
      setQuestions(buildQuestions(pickDueFirst(vocab, srs, SEQUENTIAL_CAP), selected))
      setPhase('quiz')
    }
  }

  // Speed round: count down each second
  useEffect(() => {
    if (phase !== 'quiz' || mode !== 'speed-round') return
    if (timeLeft <= 0) {
      if (chosen === null) {
        setChosen('__timeout__')
        setTimeout(() => advanceFnRef.current?.('incorrect'), 900)
      }
      return
    }
    const id = setTimeout(() => setTimeLeft(t => t - 1), 1000)
    return () => clearTimeout(id)
  }, [timeLeft, phase, mode, chosen])

  // Speed round: reset timer on new question
  useEffect(() => {
    if (phase === 'quiz' && mode === 'speed-round') setTimeLeft(SPEED_ROUND_SECONDS)
  }, [index]) // intentionally omits phase/mode — only fires on question change

  // Auto-read the prompt aloud when a new quiz question appears.
  // 'reverse' shows the English word, everything else shows the Spanish word.
  useEffect(() => {
    if (phase !== 'quiz' || !current) return
    const t = setTimeout(() => {
      if (current.format === 'conjugation') return
      if (current.format === 'reverse') {
        speak(current.item.english_translation, undefined, 'en-US')
      } else {
        speak(current.item.spanish_word)
      }
    }, 250)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, index])

  // Matching: check pair when both sides selected
  useEffect(() => {
    if (!leftSelected || !rightSelected) return
    if (leftSelected === rightSelected) {
      onWordResult?.(leftSelected, true)
      setMatched(prev => {
        const next = new Set(prev)
        next.add(leftSelected)
        if (next.size === matchLeft.length) {
          setResultScore({ correct: matchLeft.length, total: matchLeft.length })
          setTimeout(() => setPhase('result'), 400)
        }
        return next
      })
      setLeftSelected(null)
      setRightSelected(null)
    } else {
      setWrongFlash(true)
      setTimeout(() => {
        setLeftSelected(null)
        setRightSelected(null)
        setWrongFlash(false)
      }, 500)
    }
  }, [leftSelected, rightSelected])

  // Memory: check pair when 2 cards flipped
  useEffect(() => {
    if (flippedIds.length !== 2) return
    const [a, b] = flippedIds
    const cardA = memCards.find(c => c.id === a)!
    const cardB = memCards.find(c => c.id === b)!
    setMemAttempts(n => n + 1)
    setMemLocked(true)
    if (cardA.itemId === cardB.itemId && cardA.side !== cardB.side) {
      onWordResult?.(cardA.itemId, true)
      setMatchedIds(prev => {
        const next = new Set(prev)
        next.add(a)
        next.add(b)
        if (next.size === memCards.length) {
          setResultScore({ correct: next.size / 2, total: memCards.length / 2 })
          setTimeout(() => setPhase('result'), 400)
        }
        return next
      })
      setFlippedIds([])
      setMemLocked(false)
    } else {
      setTimeout(() => {
        setFlippedIds([])
        setMemLocked(false)
      }, 1000)
    }
  }, [flippedIds])

  function submitFill(isReverse: boolean) {
    if (fillFeedback || !current) return
    const expected =
      current.format === 'conjugation' ? current.expected
      : isReverse ? current.item.spanish_word
      : null
    const verdict = current.format === 'conjugation'
      ? checkAnswer(typed, expected!, strictAccents)
      : isReverse
        ? checkAnswer(typed, current.item.spanish_word, strictAccents)
        : checkAnswerForWord(typed, current.item, strictAccents)
    const state = verdict === 'wrong' ? 'incorrect' : verdict
    setFillFeedback(state)
    // 'almost' counts as correct for SRS — don't punish typos — but we still
    // show the proper spelling before moving on. For 'incorrect' the user
    // dismisses manually via the Next button so they can read the hint.
    if (state === 'correct') setTimeout(() => advance('correct'), 700)
    else if (state === 'almost') setTimeout(() => advance('correct'), 1400)
  }

  const displayCorrect = resultScore ? resultScore.correct : results.filter(r => r === 'correct').length
  const displayTotal   = resultScore ? resultScore.total   : questions.length
  const resultPct = displayTotal > 0 ? displayCorrect / displayTotal : 0
  const resultPose: BarneyPose = resultPct >= 0.8 ? 'celebrate' : resultPct >= 0.5 ? 'happy' : 'sad'

  // Record a round's outcome once when the result screen appears
  useEffect(() => {
    if (phase === 'result' && displayTotal > 0) recordResult(mode, displayCorrect, displayTotal)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px', width: '100%' }}>
      <XpWindow title={title} icon={icon} width="min(520px, 100%)" onClose={() => navigate(exitTo)} style={{ flex: 1, maxHeight: 'none' }}>

        {/* ── Mode selection ── */}
        {phase === 'select' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '12px',
              color: '#888',
              borderBottom: '1px solid var(--color-button-shadow)',
              paddingBottom: '8px',
            }}>
              <span style={{ color: 'var(--color-accent)', fontWeight: 'bold' }}>
                {vocab.length} {deckLabel}
              </span>
              <button
                className="xp-btn"
                style={{ fontSize: '11px', minWidth: 'auto', padding: '4px 10px' }}
                onClick={() => navigate('/dashboard')}
              >
                ← Dashboard
              </button>
            </div>
            <div style={{ marginBottom: '4px' }}>
              <Barny
                message={vocab.length === 0
                  ? "No words yet! Add some on the Add Words page and I'll be ready to drill you. 🐾"
                  : "How would you like to revise today? 🐾"}
                size="small"
              />
            </div>

            {vocab.length === 0 && (
              <button
                className="xp-btn xp-btn-primary"
                style={{ alignSelf: 'center', fontSize: '12px', padding: '6px 14px' }}
                onClick={() => navigate('/add-words')}
              >
                ➕ Add words
              </button>
            )}

            {categories.length > 0 && (
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center', overflowX: 'auto', flexShrink: 0, paddingBottom: '2px' }}>
                <span style={{ fontSize: '11px', color: '#888', flexShrink: 0 }}>Topic:</span>
                {['all', ...categories].map((cat) => (
                  <button
                    key={cat}
                    className={`xp-btn${category === cat ? ' xp-btn-primary' : ''}`}
                    style={{ fontSize: '11px', minWidth: 'auto', padding: '3px 9px', flexShrink: 0 }}
                    onClick={() => setCategory(cat)}
                  >
                    {cat === 'all' ? 'All' : cat.replace(/_/g, ' ')}
                  </button>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', opacity: vocab.length === 0 ? 0.4 : 1, pointerEvents: vocab.length === 0 ? 'none' : 'auto' }}>
              {MODES.map((m) => {
                const featured = m.id === 'mixed'
                return (
                  <button
                    key={m.id}
                    className={`xp-btn xp-mode-card${featured ? ' xp-mode-card-featured' : ''}`}
                    onClick={() => startMode(m.id)}
                  >
                    {featured && <span className="xp-mode-card-badge">★ START HERE</span>}
                    <div style={{ marginBottom: '6px' }}><ModeIcon id={m.id} /></div>
                    <div style={{ fontWeight: 'bold', fontSize: '12px' }}>{m.label}</div>
                    <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>{m.desc}</div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Result screen ── */}
        {phase === 'result' && (
          <div style={{ textAlign: 'center', padding: '8px' }}>
            <p style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '8px', color: 'var(--color-accent)' }}>
              Round Complete!
            </p>
            <div style={{ marginBottom: '20px' }}>
              {mode === 'memory' && resultScore ? (
                <Barny message={`All ${resultScore.total} pairs found in ${memAttempts} attempts! 🐾`} size="medium" pose="celebrate" />
              ) : (
                <Barny message={barnyResult(displayCorrect, displayTotal)} size="medium" pose={resultPose} />
              )}
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button className="xp-btn xp-btn-primary" onClick={() => startMode(mode)}>↺ Play Again</button>
              <button className="xp-btn" onClick={() => setPhase('select')}>⇦ Change Mode</button>
              <button className="xp-btn" onClick={() => navigate('/dashboard')}>← Dashboard</button>
            </div>
          </div>
        )}

        {/* ── Matching pairs ── */}
        {phase === 'matching' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ fontSize: '12px', color: '#888', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <ModeIcon id="matching" size={15} /> Matching Pairs
              </span>
              <span style={{ color: 'var(--color-accent)' }}>{matched.size}/{matchLeft.length} matched</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {matchLeft.filter(item => !matched.has(item.id)).map(item => {
                  const isSelected = leftSelected === item.id
                  const isWrong = wrongFlash && isSelected
                  return (
                    <button
                      key={item.id}
                      className="xp-btn"
                      style={{
                        border: `2px solid ${isWrong ? '#e53935' : isSelected ? '#4caf50' : 'var(--color-accent)'}`,
                        fontSize: '13px',
                        padding: '8px',
                      }}
                      onClick={() => { if (!wrongFlash) setLeftSelected(item.id) }}
                    >
                      {item.spanish_word}
                    </button>
                  )
                })}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {matchRight.filter(item => !matched.has(item.id)).map(item => {
                  const isSelected = rightSelected === item.id
                  const isWrong = wrongFlash && isSelected
                  return (
                    <button
                      key={item.id}
                      className="xp-btn"
                      style={{
                        border: `2px solid ${isWrong ? '#e53935' : isSelected ? '#4caf50' : 'var(--color-accent)'}`,
                        fontSize: '13px',
                        padding: '8px',
                      }}
                      onClick={() => {
                        if (!wrongFlash && leftSelected !== null && rightSelected === null) setRightSelected(item.id)
                      }}
                    >
                      {item.english_translation}
                    </button>
                  )
                })}
              </div>
            </div>
            <p style={{ fontSize: '11px', color: leftSelected ? '#4caf50' : '#888', textAlign: 'center', margin: 0 }}>
              {leftSelected ? 'Now click the matching English word' : 'Click a Spanish word to start'}
            </p>
            <Barny message="Match each Spanish word to its English! 🐾" size="small" />
          </div>
        )}

        {/* ── Memory game ── */}
        {phase === 'memory' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ fontSize: '12px', color: '#888', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <ModeIcon id="memory" size={15} /> Memory Game
              </span>
              <span style={{ color: 'var(--color-accent)' }}>
                {matchedIds.size / 2}/{memCards.length / 2} pairs · {memAttempts} attempts
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
              {memCards.map(card => {
                const isRevealed = flippedIds.includes(card.id) || matchedIds.has(card.id)
                const isMatched = matchedIds.has(card.id)
                return (
                  <button
                    key={card.id}
                    className="xp-btn"
                    disabled={isRevealed || memLocked}
                    style={{
                      height: '56px',
                      fontSize: isRevealed ? '11px' : '18px',
                      padding: '4px',
                      border: `2px solid ${isMatched ? '#4caf50' : 'var(--color-accent)'}`,
                      background: isMatched ? 'rgba(76,175,80,0.1)' : undefined,
                      overflow: 'hidden',
                      wordBreak: 'break-word',
                    }}
                    onClick={() => {
                      if (memLocked || isRevealed) return
                      setFlippedIds(prev => [...prev, card.id])
                    }}
                  >
                    {isRevealed ? card.text : '?'}
                  </button>
                )
              })}
            </div>
            <Barny message="Flip cards to find matching pairs! 🐾" size="small" />
          </div>
        )}

        {/* ── Gusta / Gustan drill ── */}
        {phase === 'gusta' && gustaQs[gustaIndex] && (() => {
          const q = gustaQs[gustaIndex]
          const answered = gustaChosen !== null
          const correct = gustaChosen === q.answer
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: '#888' }}>
                <span>Word {gustaIndex + 1} of {gustaQs.length}</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: 'var(--color-accent)' }}>
                  <ModeIcon id="gusta-drill" size={15} /> Gusta / Gustan
                </span>
              </div>

              <div style={{
                border: '2px solid var(--color-accent)', borderRadius: '4px',
                padding: '20px', textAlign: 'center', background: 'rgba(255,255,255,0.03)',
              }}>
                <p style={{ fontSize: '11px', color: '#888', marginBottom: '8px' }}>
                  Singular or plural? Pick the right form:
                </p>
                <p style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--color-accent)', marginBottom: '2px' }}>
                  Me ____ {q.thing}
                  <SpeakButton text={`Me ${q.answer} ${q.thing}`} />
                </p>
                <p style={{ fontSize: '12px', color: '#666', marginBottom: '16px' }}>(I like {q.english})</p>

                {!answered ? (
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                    <button className="xp-btn xp-btn-primary" onClick={() => answerGusta('gusta')}>gusta</button>
                    <button className="xp-btn xp-btn-primary" onClick={() => answerGusta('gustan')}>gustan</button>
                  </div>
                ) : (
                  <div>
                    <p style={{ fontSize: '14px', color: correct ? '#4caf50' : '#e53935', margin: '0 0 4px' }}>
                      {correct ? '✓ ¡Correcto!' : '✗ Not quite'}
                    </p>
                    <p style={{ fontSize: '14px', color: '#fff', margin: 0 }}>
                      Me <strong style={{ color: 'var(--color-accent)' }}>{q.answer}</strong> {q.thing}
                    </p>
                  </div>
                )}
              </div>

              <Barny message={barnyMsg} size="small" />
            </div>
          )
        })()}

        {/* ── Cloze sentences ── */}
        {phase === 'cloze' && sentQs[sentIndex] && (() => {
          const q = sentQs[sentIndex]
          const parts = q.spanish.split(q.blank)
          const before = parts[0]
          const after = parts.slice(1).join(q.blank)
          const answered = clozeChosen !== null
          const correct = clozeChosen === q.blank
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: '#888' }}>
                <span>Sentence {sentIndex + 1} of {sentQs.length}</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: 'var(--color-accent)' }}>
                  <ModeIcon id="cloze-sentence" size={15} /> Cloze
                </span>
              </div>
              <div style={{
                border: '2px solid var(--color-accent)', borderRadius: '4px',
                padding: '20px', textAlign: 'center', background: 'rgba(255,255,255,0.03)',
              }}>
                <p style={{ fontSize: '11px', color: '#888', marginBottom: '8px' }}>Fill in the missing word:</p>
                <p style={{ fontSize: '22px', fontWeight: 'bold', color: 'var(--color-accent)', marginBottom: '4px', lineHeight: 1.3 }}>
                  {before}
                  <span style={{
                    display: 'inline-block', minWidth: '70px', borderBottom: '2px solid var(--color-accent)',
                    color: answered ? (correct ? '#4caf50' : '#e53935') : 'transparent',
                    padding: '0 6px', margin: '0 4px',
                  }}>
                    {answered ? clozeChosen : '___'}
                  </span>
                  {after}
                  <SpeakButton text={q.spanish} />
                </p>
                <p style={{ fontSize: '12px', color: '#666', marginBottom: '16px' }}>({q.english})</p>

                {!answered ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    {clozeOptions.map((opt) => (
                      <button
                        key={opt}
                        className="xp-btn xp-btn-primary"
                        onClick={() => {
                          setClozeChosen(opt)
                          const isCorrect = opt === q.blank
                          setTimeout(() => advanceSentence(isCorrect ? 'correct' : 'incorrect'), isCorrect ? 700 : 1200)
                        }}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: '14px', color: correct ? '#4caf50' : '#e53935', margin: 0 }}>
                    {correct ? '✓ ¡Correcto!' : `✗ Answer: ${q.blank}`}
                  </p>
                )}
              </div>
              <Barny message={barnyMsg} size="small" />
            </div>
          )
        })()}

        {/* ── Listening dictation ── */}
        {phase === 'dictation' && sentQs[sentIndex] && (() => {
          const q = sentQs[sentIndex]
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: '#888' }}>
                <span>Sentence {sentIndex + 1} of {sentQs.length}</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: 'var(--color-accent)' }}>
                  <ModeIcon id="dictation" size={15} /> Dictation
                </span>
              </div>
              <div style={{
                border: '2px solid var(--color-accent)', borderRadius: '4px',
                padding: '20px', textAlign: 'center', background: 'rgba(255,255,255,0.03)',
              }}>
                <p style={{ fontSize: '11px', color: '#888', marginBottom: '12px' }}>Listen and type what you hear (Spanish):</p>
                <button
                  className="xp-btn xp-btn-primary"
                  onClick={() => speak(q.spanish)}
                  disabled={!speechSupported}
                  style={{ fontSize: '14px', padding: '8px 16px', marginBottom: '14px' }}
                >
                  ▶ Play again
                </button>
                <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
                  <input
                    type="text"
                    value={sentTyped}
                    disabled={sentFeedback !== null}
                    placeholder={dictListening ? '🎤 Listening… (say "punto" / "coma" / "interrogación")' : 'Type the Spanish sentence…'}
                    onChange={(e) => setSentTyped(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && sentFeedback === null && sentTyped.trim()) {
                        const verdict = checkAnswer(sentTyped, q.spanish)
                        const state = verdict === 'wrong' ? 'incorrect' : verdict
                        setSentFeedback(state)
                        if (state === 'correct') setTimeout(() => advanceSentence('correct'), 800)
                        else if (state === 'almost') setTimeout(() => advanceSentence('correct'), 1500)
                      }
                    }}
                    style={{
                      flex: 1, padding: '8px 10px', fontSize: '14px',
                      fontFamily: 'var(--font-ui)', background: '#1a1a1a',
                      border: `2px solid ${sentFeedback === 'correct' ? '#4caf50' : sentFeedback === 'almost' ? '#ff9800' : sentFeedback === 'incorrect' ? '#e53935' : dictListening ? '#2196f3' : 'var(--color-accent)'}`,
                      borderRadius: '3px', color: '#fff', boxSizing: 'border-box',
                      outline: 'none',
                    }}
                  />
                  {recognitionSupported && (
                    <button
                      className={`xp-btn${dictListening ? ' mic-listening' : ''}`}
                      disabled={sentFeedback !== null}
                      title={dictListening ? 'Stop listening — say "punto", "coma", "interrogación" for punctuation' : 'Speak the Spanish sentence — say "punto", "coma", "interrogación" for punctuation'}
                      style={{
                        minWidth: 'auto', padding: '4px 10px',
                        border: `2px solid ${dictListening ? '#2196f3' : 'var(--color-accent)'}`,
                        color: dictListening ? '#2196f3' : undefined,
                      }}
                      onClick={() => {
                        if (dictListening) {
                          dictStopRef.current?.()
                          setDictListening(false)
                          return
                        }
                        setDictMicError(null)
                        setDictListening(true)
                        dictStopRef.current = startListening(
                          (text, isFinal) => {
                            setSentTyped(isFinal ? applySpanishPunctuation(text) : text)
                            if (isFinal) setDictListening(false)
                          },
                          (errorReason) => {
                            setDictListening(false)
                            if (errorReason) {
                              const msg = describeRecognitionError(errorReason)
                              if (msg) setDictMicError(msg)
                            }
                          },
                          'es-ES',
                        )
                      }}
                    >
                      {dictListening ? '⏹' : '🎤'}
                    </button>
                  )}
                </div>
                {dictMicError && (
                  <p style={{ fontSize: '11px', color: '#ff9800', margin: '0 0 8px' }}>🎤 {dictMicError}</p>
                )}
                {sentFeedback === 'correct' && (
                  <p style={{ fontSize: '13px', color: '#4caf50', margin: '0 0 8px' }}>¡Perfecto! ✓</p>
                )}
                {sentFeedback === 'almost' && (
                  <p style={{ fontSize: '13px', color: '#ff9800', margin: '0 0 8px' }}>
                    Almost — typo. Correct: <strong>{q.spanish}</strong>
                  </p>
                )}
                {sentFeedback === 'incorrect' && (
                  <>
                    <p style={{ fontSize: '13px', color: '#e53935', margin: '0 0 8px' }}>
                      Answer: <strong>{q.spanish}</strong>
                    </p>
                    <p style={{ fontSize: '12px', color: '#888', margin: '0 0 10px' }}>({q.english})</p>
                    <button className="xp-btn xp-btn-primary" onClick={() => advanceSentence('incorrect')}>Next →</button>
                  </>
                )}
                {sentFeedback === null && (
                  <button
                    className="xp-btn xp-btn-primary"
                    disabled={sentTyped.trim() === ''}
                    onClick={() => {
                      const verdict = checkAnswer(sentTyped, q.spanish)
                      const state = verdict === 'wrong' ? 'incorrect' : verdict
                      setSentFeedback(state)
                      if (state === 'correct') setTimeout(() => advanceSentence('correct'), 800)
                      else if (state === 'almost') setTimeout(() => advanceSentence('correct'), 1500)
                    }}
                  >
                    Check ↵
                  </button>
                )}
              </div>
              <Barny message={barnyMsg} size="small" />
            </div>
          )
        })()}

        {/* ── Word order ── */}
        {phase === 'wordorder' && sentQs[sentIndex] && (() => {
          const q = sentQs[sentIndex]
          const builtWords = built.map((id) => tiles.find((t) => t.id === id)!.word)
          const expected = tokenize(q.spanish)
          const isComplete = built.length === expected.length
          const isCorrect = isComplete && builtWords.join(' ') === q.spanish
          const showFeedback = sentFeedback !== null
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: '#888' }}>
                <span>Sentence {sentIndex + 1} of {sentQs.length}</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: 'var(--color-accent)' }}>
                  <ModeIcon id="word-order" size={15} /> Word Order
                </span>
              </div>
              <div style={{
                border: '2px solid var(--color-accent)', borderRadius: '4px',
                padding: '16px', background: 'rgba(255,255,255,0.03)',
              }}>
                <p style={{ fontSize: '11px', color: '#888', marginBottom: '6px', textAlign: 'center' }}>
                  Tap tiles in order to translate:
                </p>
                <p style={{ fontSize: '16px', color: 'var(--color-accent)', textAlign: 'center', margin: '0 0 8px' }}>
                  "{q.english}"
                </p>
                <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', marginBottom: '12px' }}>
                  {speechSupported && (
                    <button
                      className="xp-btn"
                      style={{ fontSize: '11px', padding: '3px 9px' }}
                      onClick={() => speak(q.spanish)}
                      disabled={showFeedback}
                    >
                      🔊 Listen
                    </button>
                  )}
                  <button
                    className="xp-btn"
                    style={{ fontSize: '11px', padding: '3px 9px' }}
                    disabled={showFeedback || built.length > 0}
                    title="Place the first word for you"
                    onClick={() => {
                      const firstWord = expected[0]
                      const tile = tiles.find((t) => t.word === firstWord && !built.includes(t.id))
                      if (tile) setBuilt([tile.id])
                    }}
                  >
                    💡 Hint
                  </button>
                </div>

                {/* Built sentence area */}
                <div style={{
                  minHeight: '48px', border: '1px dashed var(--color-button-shadow)',
                  borderRadius: '4px', padding: '8px', marginBottom: '12px',
                  display: 'flex', flexWrap: 'wrap', gap: '6px',
                  background: showFeedback ? (isCorrect ? 'rgba(76,175,80,0.08)' : 'rgba(229,57,53,0.08)') : 'transparent',
                }}>
                  {built.length === 0 && (
                    <span style={{ fontSize: '12px', color: '#666', alignSelf: 'center' }}>Your sentence appears here…</span>
                  )}
                  {built.map((id, i) => {
                    const tile = tiles.find((t) => t.id === id)!
                    return (
                      <button
                        key={id}
                        className="xp-btn"
                        disabled={showFeedback}
                        onClick={() => setBuilt((prev) => prev.filter((_, j) => j !== i))}
                        style={{ fontSize: '13px', padding: '5px 9px' }}
                      >
                        {tile.word}
                      </button>
                    )
                  })}
                </div>

                {/* Tile bank */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', justifyContent: 'center', marginBottom: '12px' }}>
                  {tiles.map((tile) => {
                    const used = built.includes(tile.id)
                    return (
                      <button
                        key={tile.id}
                        className="xp-btn xp-btn-primary"
                        disabled={used || showFeedback}
                        onClick={() => setBuilt((prev) => [...prev, tile.id])}
                        style={{
                          fontSize: '13px', padding: '6px 10px',
                          opacity: used ? 0.25 : 1,
                        }}
                      >
                        {tile.word}
                      </button>
                    )
                  })}
                </div>

                {showFeedback ? (
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: '13px', color: isCorrect ? '#4caf50' : '#e53935', margin: '0 0 8px' }}>
                      {isCorrect ? '✓ ¡Correcto!' : `✗ Correct: ${q.spanish}`}
                    </p>
                    <button className="xp-btn xp-btn-primary" onClick={() => advanceSentence(isCorrect ? 'correct' : 'incorrect')}>
                      Next →
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                    <button
                      className="xp-btn xp-btn-primary"
                      disabled={!isComplete}
                      onClick={() => setSentFeedback(isCorrect ? 'correct' : 'incorrect')}
                    >
                      Check ↵
                    </button>
                    <button
                      className="xp-btn"
                      disabled={built.length === 0}
                      onClick={() => setBuilt([])}
                    >
                      Reset
                    </button>
                  </div>
                )}
              </div>
              <Barny message={barnyMsg} size="small" />
            </div>
          )
        })()}

        {/* ── Sequential quiz ── */}
        {phase === 'quiz' && current && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: '#888' }}>
              <span>Word {index + 1} of {questions.length}</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: 'var(--color-accent)' }}>
                <ModeIcon id={mode === 'speed-round' ? 'speed-round' : current.format} size={15} />
                {mode === 'speed-round' ? 'Speed Round' : FORMAT_LABEL[current.format]}
              </span>
            </div>

            {/* Speed round timer bar */}
            {mode === 'speed-round' && (
              <div style={{ height: '6px', background: '#333', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${(timeLeft / SPEED_ROUND_SECONDS) * 100}%`,
                  background: timeLeft <= 2 ? '#e53935' : timeLeft <= 4 ? '#ff9800' : 'var(--color-accent)',
                  transition: 'width 1s linear',
                  borderRadius: '3px',
                }} />
              </div>
            )}

            <div style={{
              border: '2px solid var(--color-accent)',
              borderRadius: '4px',
              padding: '20px',
              textAlign: 'center',
              background: 'rgba(255,255,255,0.03)',
            }}>
              {/* Prompt */}
              {current.format === 'conjugation' ? (
                <>
                  <p style={{ fontSize: '11px', color: '#888', marginBottom: '6px' }}>Conjugate this verb</p>
                  <p style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--color-accent)', marginBottom: '0' }}>
                    <span style={{ color: '#bbb' }}>{current.person}</span> + <em>{current.verb}</em>
                  </p>
                  <p style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>(present tense)</p>
                </>
              ) : current.format === 'listening' ? (
                <>
                  <p style={{ fontSize: '11px', color: '#888', marginBottom: '6px' }}>Listen and translate to English</p>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '40px', color: 'var(--color-accent)' }}>🔊</span>
                    {speechSupported && (
                      <button
                        className="xp-btn"
                        style={{ minWidth: 'auto', padding: '6px 12px' }}
                        onClick={() => speak(current.item.spanish_word)}
                      >
                        Replay
                      </button>
                    )}
                  </div>
                  {fillFeedback && (
                    <p style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--color-accent)', margin: '8px 0 0' }}>
                      {current.item.spanish_word}
                    </p>
                  )}
                  <p style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>({current.item.type})</p>
                </>
              ) : current.format === 'reverse' ? (
                <>
                  <p style={{ fontSize: '11px', color: '#888', marginBottom: '6px' }}>What is this in Spanish?</p>
                  <p style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--color-accent)', marginBottom: '0' }}>
                    {current.item.english_translation}
                  </p>
                  <p style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>({current.item.type})</p>
                </>
              ) : current.format === 'true-false' ? (
                <>
                  <p style={{ fontSize: '11px', color: '#888', marginBottom: '6px' }}>Is this translation correct?</p>
                  <p style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--color-accent)', marginBottom: '4px' }}>
                    {current.item.spanish_word}
                    <SpeakButton text={current.item.spanish_word} />
                  </p>
                  <p style={{ fontSize: '18px', color: '#ccc', marginBottom: '0' }}>= {current.shownTranslation}</p>
                  <p style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>({current.item.type})</p>
                </>
              ) : (
                <>
                  <p style={{ fontSize: '11px', color: '#888', marginBottom: '6px' }}>What does this mean?</p>
                  <p style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--color-accent)', marginBottom: '0' }}>
                    {current.item.spanish_word}
                    <SpeakButton text={current.item.spanish_word} />
                  </p>
                  <p style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>({current.item.type})</p>
                </>
              )}

              {/* Flashcard */}
              {current.format === 'flashcard' && (
                <div style={{ marginTop: '16px' }}>
                  {!flipped ? (
                    <button className="xp-btn" onClick={() => setFlipped(true)}>Flip ↩</button>
                  ) : (
                    <>
                      <p style={{ fontSize: '20px', marginBottom: '12px', color: '#fff' }}>
                        {current.item.english_translation}
                      </p>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <button className="xp-btn xp-btn-primary" onClick={() => advance('correct')}>Got it ✓</button>
                        <button className="xp-btn" onClick={() => advance('incorrect')}>Missed it ✗</button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Multiple choice (also speed-round) */}
              {current.format === 'multiple-choice' && (
                <div style={{ marginTop: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {current.options.map((opt) => {
                    const isChosen = chosen === opt
                    const isTimeout = chosen === '__timeout__'
                    const isCorrect = opt === current.item.english_translation
                    let borderColor = 'var(--color-accent)'
                    if (chosen && isCorrect) borderColor = '#4caf50'
                    if (isChosen && !isCorrect) borderColor = '#e53935'
                    if (isTimeout && isCorrect) borderColor = '#ff9800'
                    return (
                      <button
                        key={opt}
                        className="xp-btn"
                        disabled={chosen !== null}
                        style={{ border: chosen ? `2px solid ${borderColor}` : undefined }}
                        onClick={() => {
                          if (chosen) return
                          setChosen(opt)
                          setTimeout(() => advance(isCorrect ? 'correct' : 'incorrect'), 700)
                        }}
                      >
                        {opt}
                      </button>
                    )
                  })}
                  {chosen === '__timeout__' && (
                    <p style={{ gridColumn: '1 / -1', fontSize: '13px', color: '#ff9800', margin: '4px 0 0' }}>
                      ⏱ Time's up!
                    </p>
                  )}
                </div>
              )}

              {/* Fill in the blank */}
              {current.format === 'fill-in-the-blank' && (
                <FillInput
                  typed={typed}
                  setTyped={setTyped}
                  feedback={fillFeedback}
                  answer={current.item.english_translation}
                  placeholder="Type the English translation…"
                  hint={getHint(current.item)}
                  onSubmit={() => submitFill(false)}
                  onNext={() => advance('incorrect')}
                  speechLang="en-US"
                />
              )}

              {/* Conjugation ladder */}
              {current.format === 'conjugation' && (
                <FillInput
                  typed={typed}
                  setTyped={setTyped}
                  feedback={fillFeedback}
                  answer={current.expected}
                  placeholder={`${current.person} ${current.verb} → …`}
                  hint={
                    'Full table: ' +
                    LADDER_PERSONS.map((p) => `${p} ${CONJUGATIONS[current.verb][p]}`).join(' · ')
                  }
                  onSubmit={() => submitFill(false)}
                  onNext={() => advance('incorrect')}
                  speechLang="es-ES"
                />
              )}

              {/* Listening */}
              {current.format === 'listening' && (
                <FillInput
                  typed={typed}
                  setTyped={setTyped}
                  feedback={fillFeedback}
                  answer={current.item.english_translation}
                  placeholder="Type the English translation…"
                  hint={getHint(current.item)}
                  onSubmit={() => submitFill(false)}
                  onNext={() => advance('incorrect')}
                  speechLang="en-US"
                />
              )}

              {/* Reverse */}
              {current.format === 'reverse' && (
                <FillInput
                  typed={typed}
                  setTyped={setTyped}
                  feedback={fillFeedback}
                  answer={current.item.spanish_word}
                  placeholder="Type the Spanish word…"
                  hint={getHint(current.item)}
                  onSubmit={() => submitFill(true)}
                  onNext={() => advance('incorrect')}
                  speechLang="es-ES"
                />
              )}

              {/* True / False */}
              {current.format === 'true-false' && (
                <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                  {tfFeedback === null ? (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        className="xp-btn xp-btn-primary"
                        onClick={() => {
                          const correct = current.isCorrectPair
                          setTfFeedback(correct ? 'correct' : 'incorrect')
                          setTimeout(() => advance(correct ? 'correct' : 'incorrect'), 700)
                        }}
                      >
                        True ✓
                      </button>
                      <button
                        className="xp-btn"
                        onClick={() => {
                          const correct = !current.isCorrectPair
                          setTfFeedback(correct ? 'correct' : 'incorrect')
                          setTimeout(() => advance(correct ? 'correct' : 'incorrect'), 700)
                        }}
                      >
                        False ✗
                      </button>
                    </div>
                  ) : (
                    <>
                      <p style={{ fontSize: '14px', color: tfFeedback === 'correct' ? '#4caf50' : '#e53935', margin: 0 }}>
                        {tfFeedback === 'correct' ? '✓ Correct!' : '✗ Wrong!'}
                      </p>
                      {tfFeedback === 'incorrect' && (
                        <p style={{ fontSize: '12px', color: '#888', margin: 0 }}>
                          "{current.item.spanish_word}" = "{current.item.english_translation}"
                        </p>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* "I don't know" — shown until the learner commits to an answer */}
              {((current.format === 'flashcard' && !flipped) ||
                (current.format === 'multiple-choice' && !chosen) ||
                ((current.format === 'fill-in-the-blank' || current.format === 'reverse' || current.format === 'listening' || current.format === 'conjugation') && !fillFeedback) ||
                (current.format === 'true-false' && !tfFeedback)) && (
                <div style={{ marginTop: '12px' }}>
                  <button
                    className="xp-btn"
                    style={{ fontSize: '11px', padding: '4px 12px', minWidth: 'auto', color: '#bbb' }}
                    onClick={dontKnow}
                  >
                    I don't know 🤷
                  </button>
                </div>
              )}
            </div>

            <Barny message={barnyMsg} size="small" />
          </div>
        )}

      </XpWindow>
    </div>
  )
}

interface FillInputProps {
  typed: string
  setTyped: (s: string) => void
  feedback: 'correct' | 'almost' | 'incorrect' | null
  answer: string
  placeholder: string
  hint: string | null
  onSubmit: () => void
  onNext: () => void
  speechLang?: string
}

function FillInput({ typed, setTyped, feedback, answer, placeholder, hint, onSubmit, onNext, speechLang }: FillInputProps) {
  const [listening, setListening] = useState(false)
  const [micError, setMicError] = useState<string | null>(null)
  const stopRef = useRef<(() => void) | null>(null)

  // Enter advances after wrong feedback (the input is disabled, so its own
  // keydown handler won't fire).
  useEffect(() => {
    if (feedback !== 'incorrect') return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Enter') return
      const tag = (e.target as HTMLElement | null)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      e.preventDefault()
      onNext()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [feedback, onNext])

  function toggleMic() {
    if (listening) {
      stopRef.current?.()
      setListening(false)
      return
    }
    setMicError(null)
    setListening(true)
    stopRef.current = startListening(
      (text, isFinal) => {
        setTyped(text)
        if (isFinal) setListening(false)
      },
      (errorReason) => {
        setListening(false)
        if (errorReason) {
          const msg = describeRecognitionError(errorReason)
          if (msg) setMicError(msg)
        }
      },
      speechLang,
    )
  }

  const borderColor =
    feedback === 'correct' ? '#4caf50' :
    feedback === 'almost'  ? '#ff9800' :
    feedback === 'incorrect' ? '#e53935' :
    listening ? '#2196f3' :
    'var(--color-accent)'
  return (
    <div style={{ marginTop: '16px' }}>
      <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
        <input
          type="text"
          value={typed}
          disabled={feedback !== null}
          placeholder={listening ? '🎤 Listening…' : placeholder}
          onChange={(e) => setTyped(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') onSubmit() }}
          style={{
            flex: 1, padding: '8px 10px', fontSize: '14px',
            fontFamily: 'var(--font-ui)', background: '#1a1a1a',
            border: `2px solid ${borderColor}`,
            borderRadius: '3px', color: '#fff', boxSizing: 'border-box',
            outline: 'none',
          }}
        />
        {recognitionSupported && speechLang && (
          <button
            className={`xp-btn${listening ? ' mic-listening' : ''}`}
            disabled={feedback !== null}
            onClick={toggleMic}
            title={listening ? 'Stop listening' : 'Speak your answer'}
            style={{
              minWidth: 'auto', padding: '4px 10px',
              border: `2px solid ${listening ? '#2196f3' : 'var(--color-accent)'}`,
              color: listening ? '#2196f3' : undefined,
            }}
          >
            {listening ? '⏹' : '🎤'}
          </button>
        )}
      </div>
      {micError && (
        <p style={{ fontSize: '11px', color: '#ff9800', margin: '0 0 8px' }}>🎤 {micError}</p>
      )}
      {feedback === 'correct' && (
        <p style={{ fontSize: '13px', color: '#4caf50', margin: '0 0 8px' }}>Correct! ✓</p>
      )}
      {feedback === 'almost' && (
        <p style={{ fontSize: '13px', color: '#ff9800', margin: '0 0 8px' }}>
          Almost — typo. Correct spelling: <strong>{answer}</strong>
        </p>
      )}
      {feedback === 'incorrect' && (
        <>
          <p style={{ fontSize: '13px', color: '#e53935', margin: '0 0 8px' }}>
            {typed.trim() && (
              <>
                <span style={{ textDecoration: 'line-through', opacity: 0.7 }}>{typed}</span>
                {' → '}
              </>
            )}
            <strong>{answer}</strong>
          </p>
          {hint && (
            <details style={{ marginBottom: '10px', fontSize: '12px', color: '#bbb' }}>
              <summary style={{ cursor: 'pointer', color: 'var(--color-accent)' }}>Why?</summary>
              <p style={{ margin: '6px 0 0', lineHeight: 1.4 }}>{hint}</p>
            </details>
          )}
          <button className="xp-btn xp-btn-primary" onClick={onNext}>Next →</button>
        </>
      )}
      {feedback === null && (
        <button className="xp-btn xp-btn-primary" onClick={onSubmit} disabled={typed.trim() === ''}>
          Check ↵
        </button>
      )}
    </div>
  )
}
