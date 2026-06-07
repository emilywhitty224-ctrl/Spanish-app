import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { XpWindow } from '../components/XpWindow'
import { Barny } from '../components/Barny'
import { extractVocabFromNotes } from '../utils/aiChat'
import { lessonTagForDate } from '../utils/lessons'
import type { VocabularyItem } from '../types/vocabulary'

type Source = 'class' | 'app' | 'real-life'

interface PendingCard {
  id: string
  spanish: string
  english: string
  source: Source
}

const SOURCES: { id: Source; label: string; icon: string }[] = [
  { id: 'class',     label: 'Class',     icon: '📝' },
  { id: 'real-life', label: 'Real life', icon: '🇪🇸' },
  { id: 'app',       label: 'Other',     icon: '💡' },
]

const BUCKETS: { type: VocabularyItem['type']; label: string; icon: string }[] = [
  { type: 'noun', label: 'Noun', icon: '📦' },
  { type: 'verb', label: 'Verb', icon: '🏃' },
  { type: 'adjective', label: 'Adjective', icon: '🎨' },
  { type: 'phrase', label: 'Phrase', icon: '💬' },
]

export function AddWords() {
  const navigate = useNavigate()
  const { customWords, addCustomWord, removeCustomWord, toggleActiveUse, aiProvider, aiApiKey } = useStore()

  const [spanish, setSpanish] = useState('')
  const [english, setEnglish] = useState('')
  const [source, setSource] = useState<Source>('class')
  const [pending, setPending] = useState<PendingCard[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState<string | null>(null)

  const [notes, setNotes] = useState('')
  const [extracting, setExtracting] = useState(false)
  const [extractError, setExtractError] = useState<string | null>(null)
  const [extractMsg, setExtractMsg] = useState<string | null>(null)

  async function handleExtract() {
    if (!notes.trim() || extracting) return
    if (!aiApiKey) { setExtractError('Paste an API key in Settings first.'); return }
    setExtracting(true)
    setExtractError(null)
    setExtractMsg(null)
    try {
      const found = await extractVocabFromNotes(aiProvider, aiApiKey, notes.trim())
      if (found.length === 0) { setExtractMsg('No Spanish words found in those notes.'); return }
      const existing = new Set(customWords.map((w) => w.spanish_word.toLowerCase()))
      let added = 0
      for (const w of found) {
        if (existing.has(w.spanish.toLowerCase())) continue
        existing.add(w.spanish.toLowerCase())
        addCustomWord({
          id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          spanish_word: w.spanish,
          english_translation: w.english,
          type: w.type,
          tags: ['custom', source, 'from-notes', lessonTagForDate()],
          mastery_level: 0,
          next_review_date: new Date().toISOString(),
          beginner_safe: true,
          source,
          added_at: new Date().toISOString(),
          active_use: false,
        })
        added++
      }
      const skipped = found.length - added
      setExtractMsg(`Added ${added} word${added === 1 ? '' : 's'}${skipped ? ` (${skipped} already in your list)` : ''}.`)
      setNotes('')
    } catch (err) {
      setExtractError(err instanceof Error ? err.message : String(err))
    } finally {
      setExtracting(false)
    }
  }

  async function handleFile(file: File) {
    if (!file.type.startsWith('text/') && !file.name.match(/\.(txt|md|csv)$/i)) {
      setExtractError('Only plain text files (.txt, .md, .csv) are supported.')
      return
    }
    const text = await file.text()
    setNotes((prev) => (prev ? `${prev}\n\n${text}` : text))
    setExtractError(null)
    setExtractMsg(null)
  }

  const canCreate = spanish.trim() !== '' && english.trim() !== ''

  function handleCreate() {
    if (!canCreate) return
    setPending((prev) => [
      ...prev,
      {
        id: `pending-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        spanish: spanish.trim(),
        english: english.trim(),
        source,
      },
    ])
    setSpanish('')
    setEnglish('')
  }

  function assign(cardId: string, type: VocabularyItem['type']) {
    const card = pending.find((c) => c.id === cardId)
    if (!card) return
    addCustomWord({
      id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      spanish_word: card.spanish,
      english_translation: card.english,
      type,
      tags: ['custom', card.source, lessonTagForDate()],
      mastery_level: 0,
      next_review_date: new Date().toISOString(),
      beginner_safe: true,
      source: card.source,
      added_at: new Date().toISOString(),
      active_use: false,
    })
    setPending((prev) => prev.filter((c) => c.id !== cardId))
    if (selectedId === cardId) setSelectedId(null)
  }

  function handleBucketActivate(type: VocabularyItem['type']) {
    if (selectedId) assign(selectedId, type)
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 10px', fontSize: '14px',
    fontFamily: 'var(--font-ui)', background: '#1a1a1a',
    border: '2px solid var(--color-accent)', borderRadius: '3px',
    color: '#fff', boxSizing: 'border-box', outline: 'none',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', padding: '8px' }}>
      <XpWindow title="Add Your Own Words" icon="➕" width="min(560px, 100%)" onClose={() => navigate('/dashboard')} style={{ flex: 1, maxHeight: 'none' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <Barny message="Make a card, then drag it into the right box! 🐾" size="small" pose="happy" />

          {/* From notes: paste or upload, AI extracts vocab */}
          <details style={{
            border: '2px solid var(--color-button-shadow)', borderRadius: '4px',
            padding: '8px 10px', background: 'rgba(255,255,255,0.02)',
          }}>
            <summary style={{ cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}>
              📝 Add from lesson notes (AI)
            </summary>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
              <p style={{ fontSize: '11px', color: '#888', margin: 0 }}>
                Paste your notes — or upload a .txt/.md file — and {aiProvider === 'gemini' ? 'Gemini' : 'Claude'} will pull out the Spanish words and add them straight to your list.
              </p>
              <textarea
                value={notes}
                placeholder={'e.g.\nel mercado - market\ncomprar = to buy\n¿cuánto cuesta? how much is it'}
                onChange={(e) => setNotes(e.target.value)}
                rows={6}
                style={{
                  ...inputStyle, resize: 'vertical', minHeight: '90px',
                  fontFamily: 'var(--font-ui)', lineHeight: 1.4,
                }}
              />
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                <label className="xp-btn" style={{ fontSize: '12px', padding: '6px 10px', cursor: 'pointer' }}>
                  📎 Upload
                  <input
                    type="file"
                    accept=".txt,.md,.csv,text/plain,text/markdown,text/csv"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (f) handleFile(f)
                      e.target.value = ''
                    }}
                  />
                </label>
                <button
                  className="xp-btn xp-btn-primary"
                  disabled={!notes.trim() || extracting || !aiApiKey}
                  onClick={handleExtract}
                  style={{ fontSize: '12px', padding: '6px 12px' }}
                >
                  {extracting ? 'Extracting…' : '✨ Extract words'}
                </button>
                {notes && (
                  <button
                    className="xp-btn"
                    onClick={() => { setNotes(''); setExtractError(null); setExtractMsg(null) }}
                    style={{ fontSize: '11px', padding: '4px 8px' }}
                  >
                    Clear
                  </button>
                )}
              </div>
              {!aiApiKey && (
                <p style={{ fontSize: '11px', color: '#d88', margin: 0 }}>
                  Add an API key in Settings to use this.
                </p>
              )}
              {extractError && (
                <p style={{ fontSize: '11px', color: '#d88', margin: 0 }}>⚠ {extractError}</p>
              )}
              {extractMsg && (
                <p style={{ fontSize: '11px', color: 'var(--color-accent)', margin: 0 }}>{extractMsg}</p>
              )}
            </div>
          </details>

          {/* Step 1: type the pair */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '12px', color: '#888' }}>
              Spanish word / phrase
              <input
                style={{ ...inputStyle, marginTop: '4px' }}
                value={spanish}
                placeholder="e.g. el gato"
                onChange={(e) => setSpanish(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleCreate() }}
              />
            </label>
            <label style={{ fontSize: '12px', color: '#888' }}>
              English translation
              <input
                style={{ ...inputStyle, marginTop: '4px' }}
                value={english}
                placeholder="e.g. the cat"
                onChange={(e) => setEnglish(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleCreate() }}
              />
            </label>
            <div>
              <div style={{ fontSize: '12px', color: '#888', marginBottom: '4px' }}>Where from?</div>
              <div style={{ display: 'flex', gap: '4px' }}>
                {SOURCES.map((s) => {
                  const active = source === s.id
                  return (
                    <button
                      key={s.id}
                      type="button"
                      className="xp-btn"
                      style={{
                        flex: 1, fontSize: '12px', padding: '6px 4px',
                        border: `2px solid ${active ? 'var(--color-accent)' : 'var(--color-button-shadow)'}`,
                        background: active ? 'rgba(120,200,120,0.15)' : undefined,
                      }}
                      onClick={() => setSource(s.id)}
                    >
                      {s.icon} {s.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <button
              className="xp-btn xp-btn-primary"
              disabled={!canCreate}
              onClick={handleCreate}
            >
              Make card
            </button>
          </div>

          {/* Step 2: drag cards into a type box */}
          <div style={{ borderTop: '1px solid var(--color-button-shadow)', paddingTop: '10px' }}>
            <p style={{ fontSize: '12px', color: '#888', margin: '0 0 6px' }}>
              {pending.length === 0
                ? 'Cards you make appear here — drag or tap them into a box below.'
                : 'Drag a card into a box (or tap a card, then tap a box).'}
            </p>

            {/* Unsorted cards */}
            <div style={{
              display: 'flex', flexWrap: 'wrap', gap: '6px', minHeight: '40px',
              padding: '8px', borderRadius: '4px',
              border: '1px dashed var(--color-button-shadow)',
              background: 'rgba(255,255,255,0.02)',
            }}>
              {pending.length === 0 && (
                <span style={{ fontSize: '11px', color: '#666', alignSelf: 'center' }}>No cards yet</span>
              )}
              {pending.map((card) => (
                <div
                  key={card.id}
                  draggable
                  onDragStart={(e) => {
                    setSelectedId(card.id)
                    e.dataTransfer.setData('text/plain', card.id)
                    e.dataTransfer.effectAllowed = 'move'
                  }}
                  onDragEnd={() => setDragOver(null)}
                  onClick={() => setSelectedId(selectedId === card.id ? null : card.id)}
                  style={{
                    cursor: 'grab',
                    padding: '6px 10px',
                    borderRadius: '4px',
                    fontSize: '13px',
                    userSelect: 'none',
                    border: `2px solid ${selectedId === card.id ? 'var(--color-accent)' : 'var(--color-button-shadow)'}`,
                    background: selectedId === card.id ? 'rgba(255,255,255,0.08)' : '#1a1a1a',
                  }}
                  title="Drag me into a box below"
                >
                  <strong style={{ color: 'var(--color-accent)' }}>{card.spanish}</strong>
                  <span style={{ color: '#888' }}> — {card.english}</span>
                </div>
              ))}
            </div>

            {/* Type buckets / drop zones */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginTop: '8px' }}>
              {BUCKETS.map((b) => {
                const active = dragOver === b.type
                return (
                  <div
                    key={b.type}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(b.type) }}
                    onDragLeave={() => setDragOver((d) => (d === b.type ? null : d))}
                    onDrop={(e) => {
                      e.preventDefault()
                      const id = e.dataTransfer.getData('text/plain')
                      if (id) assign(id, b.type)
                      setDragOver(null)
                    }}
                    onClick={() => handleBucketActivate(b.type)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                      padding: '14px 8px', borderRadius: '6px', textAlign: 'center',
                      fontSize: '13px', fontWeight: 'bold',
                      cursor: selectedId ? 'pointer' : 'default',
                      border: `2px ${active ? 'solid' : 'dashed'} ${active || (selectedId && true) ? 'var(--color-accent)' : 'var(--color-button-shadow)'}`,
                      background: active ? 'rgba(120,200,120,0.15)' : 'rgba(255,255,255,0.02)',
                      transition: 'background 0.1s, border-color 0.1s',
                    }}
                  >
                    <span style={{ fontSize: '18px' }}>{b.icon}</span> {b.label}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Saved words */}
          {customWords.length > 0 && (
            <div style={{ borderTop: '1px solid var(--color-button-shadow)', paddingTop: '10px' }}>
              <p style={{ fontSize: '12px', color: '#888', marginBottom: '8px' }}>
                Your words ({customWords.length})
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '160px', overflowY: 'auto' }}>
                {customWords.map((w) => (
                  <div
                    key={w.id}
                    style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      fontSize: '13px', padding: '4px 8px',
                      border: '1px solid var(--color-button-shadow)', borderRadius: '3px',
                    }}
                  >
                    <span>
                      <strong style={{ color: 'var(--color-accent)' }}>{w.spanish_word}</strong>
                      <span style={{ color: '#888' }}> — {w.english_translation}</span>
                      <span style={{ color: '#666', fontSize: '10px' }}> · {w.type}{w.source ? ` · ${w.source}` : ''}</span>
                    </span>
                    <span style={{ display: 'inline-flex', gap: '4px' }}>
                      <button
                        className="xp-btn"
                        title={w.active_use ? 'Marked active — tap to unmark' : 'Mark as actively used'}
                        style={{
                          fontSize: '11px', minWidth: 'auto', padding: '2px 8px',
                          border: `2px solid ${w.active_use ? 'var(--color-accent)' : 'var(--color-button-shadow)'}`,
                          background: w.active_use ? 'rgba(120,200,120,0.18)' : undefined,
                        }}
                        onClick={() => toggleActiveUse(w.id)}
                      >
                        💪
                      </button>
                      <button
                        className="xp-btn"
                        style={{ fontSize: '11px', minWidth: 'auto', padding: '2px 8px' }}
                        onClick={() => removeCustomWord(w.id)}
                      >
                        ✕
                      </button>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button className="xp-btn" onClick={() => navigate('/dashboard')}>← Dashboard</button>
        </div>
      </XpWindow>
    </div>
  )
}
