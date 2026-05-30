// Low-level Google Drive helpers using the Identity Services token model and
// the Drive REST API. Scope is limited to `drive.file` (per-file access), so no
// Google app verification is required even when deployed publicly.

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined
const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY as string | undefined
const SCOPE = 'https://www.googleapis.com/auth/drive.file'

export const DATA_FILE_NAME = 'spanish-app-data.json'
export const driveConfigured = Boolean(CLIENT_ID && API_KEY)

declare global {
  interface Window {
    google?: any
    gapi?: any
  }
}

let tokenClient: any = null
let accessToken: string | null = null
let initPromise: Promise<void> | null = null

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve()
    const el = document.createElement('script')
    el.src = src
    el.async = true
    el.onload = () => resolve()
    el.onerror = () => reject(new Error(`Failed to load ${src}`))
    document.head.appendChild(el)
  })
}

export async function initGoogle(): Promise<void> {
  if (!driveConfigured) throw new Error('Google Drive sync is not configured')
  if (initPromise) return initPromise
  initPromise = (async () => {
    await loadScript('https://accounts.google.com/gsi/client')
    await loadScript('https://apis.google.com/js/api.js')
    tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPE,
      callback: () => {},
    })
  })()
  return initPromise
}

export function isSignedIn(): boolean {
  return accessToken !== null
}

export function signIn(interactive = true): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!tokenClient) return reject(new Error('Google not initialised'))
    tokenClient.callback = (resp: any) => {
      if (resp.error) return reject(new Error(resp.error))
      accessToken = resp.access_token
      resolve(accessToken!)
    }
    // An empty prompt attempts a silent token; 'consent' forces the chooser.
    tokenClient.requestAccessToken({ prompt: interactive ? 'consent' : '' })
  })
}

export function signOut(): void {
  if (accessToken && window.google?.accounts?.oauth2) {
    window.google.accounts.oauth2.revoke(accessToken, () => {})
  }
  accessToken = null
}

function authHeaders(): HeadersInit {
  if (!accessToken) throw new Error('Not signed in')
  return { Authorization: `Bearer ${accessToken}` }
}

// Create a new JSON sync file in the user's Drive and return its id.
export async function createDataFile(content: string): Promise<string> {
  const boundary = 'spanish-app-' + Math.random().toString(36).slice(2)
  const metadata = { name: DATA_FILE_NAME, mimeType: 'application/json' }
  const body =
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n` +
    JSON.stringify(metadata) +
    `\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n` +
    content +
    `\r\n--${boundary}--`

  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id',
    {
      method: 'POST',
      headers: { ...authHeaders(), 'Content-Type': `multipart/related; boundary=${boundary}` },
      body,
    }
  )
  if (!res.ok) throw new Error(`Create failed: ${res.status}`)
  const data = await res.json()
  return data.id as string
}

export async function readFile(fileId: string): Promise<string> {
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
    { headers: authHeaders() }
  )
  if (!res.ok) throw new Error(`Read failed: ${res.status}`)
  return res.text()
}

export async function writeFile(fileId: string, content: string): Promise<void> {
  const res = await fetch(
    `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
    { method: 'PATCH', headers: { ...authHeaders(), 'Content-Type': 'application/json' }, body: content }
  )
  if (!res.ok) throw new Error(`Write failed: ${res.status}`)
}

// Grant another Google account write access to the sync file (owner only).
export async function shareFile(fileId: string, email: string): Promise<void> {
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}/permissions?sendNotificationEmail=true`,
    {
      method: 'POST',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'writer', type: 'user', emailAddress: email }),
    }
  )
  if (!res.ok) throw new Error(`Share failed: ${res.status}`)
}

// Launch the Google Picker so the second account can attach the shared file.
export async function pickFile(): Promise<{ id: string; name: string } | null> {
  if (!accessToken) throw new Error('Not signed in')
  await new Promise<void>((resolve) => window.gapi.load('picker', () => resolve()))
  return new Promise((resolve) => {
    const view = new window.google.picker.DocsView()
      .setIncludeFolders(false)
      .setMimeTypes('application/json')
    const picker = new window.google.picker.PickerBuilder()
      .setOAuthToken(accessToken)
      .setDeveloperKey(API_KEY)
      .addView(view)
      .setCallback((data: any) => {
        const action = data[window.google.picker.Response.ACTION]
        if (action === window.google.picker.Action.PICKED) {
          const doc = data[window.google.picker.Response.DOCUMENTS][0]
          resolve({ id: doc[window.google.picker.Document.ID], name: doc[window.google.picker.Document.NAME] })
        } else if (action === window.google.picker.Action.CANCEL) {
          resolve(null)
        }
      })
      .build()
    picker.setVisible(true)
  })
}
