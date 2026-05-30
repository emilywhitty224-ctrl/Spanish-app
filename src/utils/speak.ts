import { useStore } from '../store/useStore'

export const speechSupported =
  typeof window !== 'undefined' && 'speechSynthesis' in window

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
  // Prefer Spain Spanish, then any Spanish voice, then nothing.
  return (
    spanish.find((v) => v.lang.toLowerCase() === 'es-es') ?? spanish[0] ?? null
  )
}

export function speak(text: string, lang = 'es-ES'): void {
  if (!speechSupported) return
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  const voice = pickVoice()
  if (voice) {
    utterance.voice = voice
    utterance.lang = voice.lang
  } else {
    utterance.lang = lang
  }
  utterance.rate = useStore.getState().speechRate
  utterance.pitch = 1
  window.speechSynthesis.speak(utterance)
}
