import { useStore } from '../store/useStore'

export const speechSupported =
  typeof window !== 'undefined' && 'speechSynthesis' in window

export const recognitionSupported =
  typeof window !== 'undefined' &&
  ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)

export interface ListenOptions {
  lang?: string
  /** Keep listening across pauses until manually stopped. */
  continuous?: boolean
  /** Emit interim (in-progress) transcripts as the user speaks. */
  interim?: boolean
}

export function startListening(
  onResult: (text: string, isFinal: boolean) => void,
  onEnd: (errorReason?: string) => void,
  opts: ListenOptions | string = {},
): () => void {
  if (!recognitionSupported) return () => {}
  const o: ListenOptions = typeof opts === 'string' ? { lang: opts } : opts
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const SR: any = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition
  const recognition = new SR()
  recognition.lang = o.lang ?? 'es-ES'
  recognition.interimResults = o.interim ?? true
  recognition.continuous = o.continuous ?? false
  recognition.maxAlternatives = 1
  let stopped = false
  let lastError: string | undefined
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  recognition.onresult = (e: any) => {
    let finalText = ''
    let interimText = ''
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i]
      if (r.isFinal) finalText += r[0].transcript
      else interimText += r[0].transcript
    }
    if (finalText) onResult(finalText.trim(), true)
    else if (interimText) onResult(interimText.trim(), false)
  }
  recognition.onend = () => { if (!stopped) { stopped = true; onEnd(lastError) } }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  recognition.onerror = (e: any) => { lastError = e?.error || 'unknown' }
  recognition.start()
  return () => { stopped = true; try { recognition.stop() } catch { /* noop */ } }
}

const ES_PUNCT: [RegExp, string][] = [
  [/\s*\bpunto y coma\b\s*/gi, '; '],
  [/\s*\bdos puntos\b\s*/gi, ': '],
  [/\s*\bpunto y aparte\b\s*/gi, '.\n'],
  [/\s*\bnueva línea\b\s*/gi, '\n'],
  [/\s*\bnueva linea\b\s*/gi, '\n'],
  [/\s*\bpunto\b\s*/gi, '. '],
  [/\s*\bcoma\b\s*/gi, ', '],
  [/\s*\bsigno de interrogación\b\s*/gi, '?'],
  [/\s*\bsigno de interrogacion\b\s*/gi, '?'],
  [/\s*\binterrogación\b\s*/gi, '?'],
  [/\s*\binterrogacion\b\s*/gi, '?'],
  [/\s*\bsigno de exclamación\b\s*/gi, '!'],
  [/\s*\bsigno de exclamacion\b\s*/gi, '!'],
  [/\s*\bexclamación\b\s*/gi, '!'],
  [/\s*\bexclamacion\b\s*/gi, '!'],
]

/** Convert spoken Spanish punctuation words ("punto", "coma", …) into glyphs. */
export function applySpanishPunctuation(text: string): string {
  let out = text
  for (const [re, rep] of ES_PUNCT) out = out.replace(re, rep)
  return out.replace(/\s+([.,;:?!])/g, '$1').replace(/\s{2,}/g, ' ').trim()
}

/** Human-friendly explanation of a Web Speech API error code. */
export function describeRecognitionError(code: string): string {
  switch (code) {
    case 'no-speech':       return "Didn't hear anything — try again closer to the mic."
    case 'not-allowed':     return 'Microphone permission denied. Allow it in your browser settings.'
    case 'service-not-allowed': return 'Speech service blocked by the browser.'
    case 'audio-capture':   return 'No microphone found.'
    case 'network':         return 'Network error — speech recognition needs internet (Chrome).'
    case 'aborted':         return ''
    default:                return `Mic error: ${code}`
  }
}

export function getVoices(): SpeechSynthesisVoice[] {
  if (!speechSupported) return []
  return window.speechSynthesis.getVoices()
}

export function getSpanishVoices(): SpeechSynthesisVoice[] {
  return getVoices().filter((v) => v.lang.toLowerCase().startsWith('es'))
}

// Voices load asynchronously; fire callback once they're ready.
export function onVoicesReady(cb: () => void): () => void {
  if (!speechSupported) return () => {}
  if (getVoices().length > 0) cb()
  const handler = () => cb()
  window.speechSynthesis.addEventListener('voiceschanged', handler)
  return () => window.speechSynthesis.removeEventListener('voiceschanged', handler)
}

function pickVoice(): SpeechSynthesisVoice | null {
  const { voiceURI } = useStore.getState()
  const spanish = getSpanishVoices()
  if (voiceURI) {
    const chosen = getVoices().find((v) => v.voiceURI === voiceURI)
    if (chosen) return chosen
  }
  // Default (Auto): prefer "Google español (es-ES)", then any Spain Spanish,
  // then any Spanish voice, then nothing.
  const esES = spanish.filter((v) => v.lang.toLowerCase() === 'es-es')
  return (
    esES.find((v) => /google/i.test(v.name)) ?? esES[0] ?? spanish[0] ?? null
  )
}

let currentSession = 0

export function speak(
  text: string,
  onBoundary?: (wordIdx: number) => void,
  lang = 'es-ES',
  rateOverride?: number,
): void {
  if (!speechSupported) return
  if (getVoices().length === 0) {
    const unsub = onVoicesReady(() => { unsub(); speak(text, onBoundary, lang, rateOverride) })
    return
  }
  window.speechSynthesis.cancel()
  const session = ++currentSession
  const utterance = new SpeechSynthesisUtterance(text)
  const voice = pickVoice()
  if (voice) {
    utterance.voice = voice
    utterance.lang = voice.lang
  } else {
    utterance.lang = lang
  }
  const rate = rateOverride ?? useStore.getState().speechRate
  utterance.rate = rate
  utterance.pitch = 1

  if (onBoundary) {
    const words = text.trim().split(/\s+/)
    let timerId: ReturnType<typeof setInterval> | null = null
    let boundaryReceived = false

    utterance.onboundary = (e) => {
      if (session !== currentSession) return
      if (e.name === 'word') {
        boundaryReceived = true
        if (timerId) { clearTimeout(timerId); timerId = null }
        const wordIdx = text.slice(0, e.charIndex).split(/\s+/).filter(Boolean).length
        onBoundary(wordIdx)
      }
    }

    utterance.onstart = () => {
      if (session !== currentSession) return
      let wordIdx = 0
      const scheduleNext = () => {
        if (session !== currentSession || boundaryReceived || wordIdx >= words.length) return
        onBoundary(wordIdx)
        const charCount = words[wordIdx].replace(/[^\wáéíóúñüÁÉÍÓÚÑÜ]/g, '').length || 1
        const duration = Math.max(150, charCount * 80) / rate
        wordIdx++
        timerId = setTimeout(scheduleNext, duration)
      }
      timerId = setTimeout(scheduleNext, 100)
    }

    utterance.onend = () => {
      if (session !== currentSession) return
      if (timerId) { clearTimeout(timerId); timerId = null }
      onBoundary(-1)
    }
  }

  window.speechSynthesis.speak(utterance)
}

// Speed multipliers (relative to the user's normal speechRate) applied to
// successive presses of a play button on the *same* text: normal → slower →
// slowest, then wrapping back to normal. Switching to different text resets.
const CYCLE_RATES = [1, 0.7, 0.5]
let cycleText: string | null = null
let cycleStep = 0

/**
 * Like `speak`, but for user-triggered play buttons: repeatedly pressing on the
 * same text slows it down step by step (normal → slow → slower → back to
 * normal). Playing different text starts again at normal speed.
 */
export function speakCycle(text: string, onBoundary?: (wordIdx: number) => void, lang = 'es-ES'): void {
  if (text === cycleText) {
    cycleStep = (cycleStep + 1) % CYCLE_RATES.length
  } else {
    cycleText = text
    cycleStep = 0
  }
  const base = useStore.getState().speechRate
  speak(text, onBoundary, lang, base * CYCLE_RATES[cycleStep])
}
