import type { AiProvider } from '../store/useStore'
import { CULTURE_DIGEST } from '../data/culture'

export interface AiTurn {
  /** 'barny' = AI line, 'user' = learner's typed Spanish. */
  role: 'barny' | 'user'
  spanish: string
}

export interface AiReply {
  /** Barny's next line in Spanish. */
  barnySpanish: string
  /** Literal English translation of Barny's line. */
  barnyEnglish: string
  /** Feedback on the user's previous reply. Omitted on the opening turn. */
  feedback?: {
    outcome: 'good' | 'okay' | 'bad'
    /** Short note in English explaining why; corrections, alternatives. */
    explanation: string
    /** Optional Spanish rewrite of the user's line if it was wrong. */
    correction?: string
  }
}

function systemPrompt(scenario: string): string {
  return `You are Barny, a friendly cartoon dog who chats in Spanish with a beginner learner living in Valencia, Spain.

Scenario: ${scenario}

Rules:
- Speak Castilian Spanish (Spain), CEFR A2 level. Keep each reply to 1–2 short sentences.
- Stay in the scenario. Drive the conversation forward with natural follow-up questions.
- After the user replies, judge their Spanish:
  - "good"  = natural and correct
  - "okay"  = understandable but awkward, wrong register, or minor grammar slip
  - "bad"   = grammatically wrong, off-topic, or doesn't answer
- If "okay" or "bad", provide a brief English explanation and a Spanish correction.
- On the very first turn (no user message yet), omit "feedback".
- If the learner asks about Valencia or Spain (history, culture, places, food, festivals), you may answer using the facts below. Keep it to 1–2 simple A2 sentences in Spanish — never lecture. Only use these facts; if you don't know, say so simply.
Facts you know:
${CULTURE_DIGEST}
- Always respond with ONLY a JSON object matching this schema, no prose, no markdown fences:
{
  "barnySpanish": string,
  "barnyEnglish": string,
  "feedback": { "outcome": "good"|"okay"|"bad", "explanation": string, "correction": string } | null
}`
}

function buildMessages(history: AiTurn[]): { role: 'user' | 'model'; text: string }[] {
  return history.map((t) => ({
    role: t.role === 'barny' ? 'model' : 'user',
    text: t.spanish,
  }))
}

function parseJsonReply(raw: string): AiReply {
  // Strip code fences if the model added them despite instructions.
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  const obj = JSON.parse(cleaned)
  const reply: AiReply = {
    barnySpanish: String(obj.barnySpanish ?? ''),
    barnyEnglish: String(obj.barnyEnglish ?? ''),
  }
  if (obj.feedback && obj.feedback.outcome) {
    reply.feedback = {
      outcome: obj.feedback.outcome,
      explanation: String(obj.feedback.explanation ?? ''),
      correction: obj.feedback.correction ? String(obj.feedback.correction) : undefined,
    }
  }
  return reply
}

async function callGemini(apiKey: string, scenario: string, history: AiTurn[]): Promise<AiReply> {
  const messages = buildMessages(history)
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`
  const body = {
    systemInstruction: { parts: [{ text: systemPrompt(scenario) }] },
    contents: messages.length > 0
      ? messages.map((m) => ({ role: m.role, parts: [{ text: m.text }] }))
      : [{ role: 'user', parts: [{ text: '(begin the conversation)' }] }],
    generationConfig: { responseMimeType: 'application/json', temperature: 0.7 },
  }
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`)
  const data = await res.json()
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error('Gemini returned no text')
  return parseJsonReply(text)
}

async function callAnthropic(apiKey: string, scenario: string, history: AiTurn[]): Promise<AiReply> {
  const messages = history.length > 0
    ? history.map((t) => ({
        role: t.role === 'barny' ? 'assistant' : 'user',
        content: t.spanish,
      }))
    : [{ role: 'user' as const, content: '(begin the conversation)' }]
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      system: systemPrompt(scenario),
      messages,
    }),
  })
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${await res.text()}`)
  const data = await res.json()
  const text = data?.content?.[0]?.text
  if (!text) throw new Error('Anthropic returned no text')
  return parseJsonReply(text)
}

export async function chatWithAI(
  provider: AiProvider,
  apiKey: string,
  scenario: string,
  history: AiTurn[],
): Promise<AiReply> {
  if (provider === 'gemini') return callGemini(apiKey, scenario, history)
  return callAnthropic(apiKey, scenario, history)
}

/**
 * Lesson-mode chat. Same as chatWithAI but injects a vocab focus list so
 * Barny keeps the conversation within the lesson's target words.
 */
export async function chatInLesson(
  provider: AiProvider,
  apiKey: string,
  topicLabel: string,
  vocabFocus: string[],
  history: AiTurn[],
): Promise<AiReply> {
  const focusList = vocabFocus.slice(0, 30).join(', ')
  const scenario = `You are Barny running a short Spanish micro-lesson on the topic "${topicLabel}". Stay tightly inside this topic.
Vocabulary focus (use at least one of these in each reply, prefer them over synonyms): ${focusList}
Keep replies extra short (1 sentence). End the lesson naturally after a few exchanges if the learner has shown they can use the words.`
  return chatWithAI(provider, apiKey, scenario, history)
}

export interface SuggestedReply {
  spanish: string
  english: string
  phonetic: string
}

const SUGGEST_SYSTEM = `You are a Spanish tutor helping a beginner learner respond in a conversation.
Given the conversation so far, produce exactly 3 short possible Spanish replies the learner could send next.
Each should be natural Castilian Spanish (Spain), CEFR A2 level, 1 sentence max.
Vary the tone: one simple/safe, one slightly fuller, one with a question.
For each reply, include "phonetic": a plain-letters pronunciation guide for an English speaker.
  - Syllables joined by hyphens, stressed syllable in CAPS. Example: "¿Cómo estás?" → "KO-mo es-TAS".
  - Use English-friendly approximations (e.g. "j" → "h", "ñ" → "ny", soft "c/z" → "th" for Castilian).
Respond with ONLY a JSON array, no prose, no markdown:
[{"spanish": "...", "english": "...", "phonetic": "..."}, ...]`

async function callGeminiSuggest(apiKey: string, scenario: string, history: AiTurn[]): Promise<SuggestedReply[]> {
  const messages = buildMessages(history)
  // Gemini requires the last message to have role 'user'
  if (messages.length === 0 || messages[messages.length - 1].role !== 'user') {
    messages.push({ role: 'user', text: '(suggest my next reply)' })
  }
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`
  const body = {
    systemInstruction: { parts: [{ text: SUGGEST_SYSTEM + `\n\nScenario: ${scenario}` }] },
    contents: messages.map((m) => ({ role: m.role, parts: [{ text: m.text }] })),
    generationConfig: { responseMimeType: 'application/json', temperature: 0.8 },
  }
  const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`)
  const data = await res.json()
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error('Gemini returned no text')
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  return JSON.parse(cleaned)
}

async function callAnthropicSuggest(apiKey: string, scenario: string, history: AiTurn[]): Promise<SuggestedReply[]> {
  const messages = history.length > 0
    ? history.map((t) => ({ role: t.role === 'barny' ? 'assistant' : 'user', content: t.spanish }))
    : [{ role: 'user' as const, content: '(begin the conversation)' }]
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      system: SUGGEST_SYSTEM + `\n\nScenario: ${scenario}`,
      messages,
    }),
  })
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${await res.text()}`)
  const data = await res.json()
  const text = data?.content?.[0]?.text
  if (!text) throw new Error('Anthropic returned no text')
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  return JSON.parse(cleaned)
}

export async function suggestReplies(
  provider: AiProvider,
  apiKey: string,
  scenario: string,
  history: AiTurn[],
): Promise<SuggestedReply[]> {
  if (provider === 'gemini') return callGeminiSuggest(apiKey, scenario, history)
  return callAnthropicSuggest(apiKey, scenario, history)
}

export interface ExtractedWord {
  spanish: string
  english: string
  type: 'noun' | 'verb' | 'adjective' | 'phrase'
}

const EXTRACT_SYSTEM = `You extract Spanish vocabulary from a learner's messy lesson notes.

Given notes (which may mix Spanish and English, bullet points, typos, definitions, example sentences, headings), output every distinct Spanish word or short phrase worth learning, with its English translation and a part-of-speech bucket.

Rules:
- Use Castilian Spanish (Spain) conventions.
- For nouns, include the article (el / la / los / las). Example: "el perro".
- For verbs, use the infinitive. Example: "comer".
- Each entry's "type" must be exactly one of: "noun", "verb", "adjective", "phrase".
  - "phrase" = anything multi-word that isn't a single noun-with-article (greetings, expressions, set phrases, short sentences).
- Skip items already obvious (numbers 1–10, "hola", "sí", "no", "gracias") unless they appear with extra meaning in the notes.
- Deduplicate. Don't invent words that aren't in the notes.
- If the notes contain no extractable Spanish vocab, return [].

Respond with ONLY a JSON array, no prose, no markdown:
[{"spanish": "...", "english": "...", "type": "noun"}, ...]`

function parseExtractJson(raw: string): ExtractedWord[] {
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  const arr = JSON.parse(cleaned)
  if (!Array.isArray(arr)) return []
  const valid: ExtractedWord['type'][] = ['noun', 'verb', 'adjective', 'phrase']
  return arr
    .map((o: { spanish?: unknown; english?: unknown; type?: unknown }) => ({
      spanish: String(o.spanish ?? '').trim(),
      english: String(o.english ?? '').trim(),
      type: (valid.includes(o.type as ExtractedWord['type']) ? o.type : 'phrase') as ExtractedWord['type'],
    }))
    .filter((w: ExtractedWord) => w.spanish && w.english)
}

export async function extractVocabFromNotes(
  provider: AiProvider,
  apiKey: string,
  notes: string,
): Promise<ExtractedWord[]> {
  if (provider === 'gemini') {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: EXTRACT_SYSTEM }] },
        contents: [{ role: 'user', parts: [{ text: notes }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.2 },
      }),
    })
    if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`)
    const data = await res.json()
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
    if (!text) throw new Error('Gemini returned no text')
    return parseExtractJson(text)
  }
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2000,
      system: EXTRACT_SYSTEM,
      messages: [{ role: 'user', content: notes }],
    }),
  })
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${await res.text()}`)
  const data = await res.json()
  const text = data?.content?.[0]?.text
  if (!text) throw new Error('Anthropic returned no text')
  return parseExtractJson(text)
}
