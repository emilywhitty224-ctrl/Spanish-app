import { create } from 'zustand'
import { useStore } from '../store/useStore'
import type { SyncSnapshot } from '../store/useStore'
import {
  driveConfigured,
  initGoogle,
  signIn as gSignIn,
  signOut as gSignOut,
  createDataFile,
  readFile,
  writeFile,
  shareFile as gShareFile,
  pickFile,
} from './googleDrive'

const FILE_ID_KEY = 'spanish-app-drive-file-id'

type Status = 'unconfigured' | 'signed-out' | 'signed-in' | 'connected'

interface SyncState {
  status: Status
  fileId: string | null
  lastSynced: string | null
  busy: boolean
  error: string | null
  connect: () => Promise<void>
  createFile: () => Promise<void>
  attachExisting: () => Promise<void>
  shareWith: (email: string) => Promise<void>
  pull: () => Promise<void>
  push: () => Promise<void>
  disconnect: () => void
}

// Guards against the auto-saver firing while we're applying a remote snapshot.
let applyingRemote = false
let saveTimer: ReturnType<typeof setTimeout> | null = null

export const useSync = create<SyncState>((set, get) => ({
  status: driveConfigured ? 'signed-out' : 'unconfigured',
  fileId: localStorage.getItem(FILE_ID_KEY),
  lastSynced: null,
  busy: false,
  error: null,

  connect: async () => {
    if (!driveConfigured) return
    set({ busy: true, error: null })
    try {
      await initGoogle()
      await gSignIn(true)
      set({ status: get().fileId ? 'connected' : 'signed-in' })
      if (get().fileId) await get().pull()
    } catch (e: any) {
      set({ error: e.message ?? 'Sign-in failed' })
    } finally {
      set({ busy: false })
    }
  },

  // Owner path: upload current local data as a brand-new shared file.
  createFile: async () => {
    set({ busy: true, error: null })
    try {
      const snapshot = useStore.getState().getSnapshot()
      const id = await createDataFile(JSON.stringify(snapshot))
      localStorage.setItem(FILE_ID_KEY, id)
      set({ fileId: id, status: 'connected', lastSynced: new Date().toISOString() })
    } catch (e: any) {
      set({ error: e.message ?? 'Could not create file' })
    } finally {
      set({ busy: false })
    }
  },

  // Second-account path: pick the file already shared with this account.
  attachExisting: async () => {
    set({ busy: true, error: null })
    try {
      const picked = await pickFile()
      if (!picked) return
      localStorage.setItem(FILE_ID_KEY, picked.id)
      set({ fileId: picked.id, status: 'connected' })
      await get().pull()
    } catch (e: any) {
      set({ error: e.message ?? 'Could not attach file' })
    } finally {
      set({ busy: false })
    }
  },

  shareWith: async (email) => {
    const fileId = get().fileId
    if (!fileId) return
    set({ busy: true, error: null })
    try {
      await gShareFile(fileId, email.trim())
    } catch (e: any) {
      set({ error: e.message ?? 'Could not share file' })
    } finally {
      set({ busy: false })
    }
  },

  pull: async () => {
    const fileId = get().fileId
    if (!fileId) return
    set({ busy: true, error: null })
    try {
      const text = await readFile(fileId)
      const snapshot = JSON.parse(text) as SyncSnapshot
      applyingRemote = true
      useStore.getState().applySnapshot(snapshot)
      applyingRemote = false
      set({ lastSynced: new Date().toISOString() })
    } catch (e: any) {
      set({ error: e.message ?? 'Sync failed' })
    } finally {
      set({ busy: false })
    }
  },

  push: async () => {
    const fileId = get().fileId
    if (!fileId) return
    try {
      const snapshot = useStore.getState().getSnapshot()
      await writeFile(fileId, JSON.stringify(snapshot))
      set({ lastSynced: new Date().toISOString() })
    } catch (e: any) {
      set({ error: e.message ?? 'Sync failed' })
    }
  },

  disconnect: () => {
    localStorage.removeItem(FILE_ID_KEY)
    gSignOut()
    set({ status: 'signed-out', fileId: null, lastSynced: null })
  },
}))

// Debounced auto-save: push local changes to Drive shortly after they settle.
export function startAutoSync() {
  if (!driveConfigured) return
  useStore.subscribe(() => {
    if (applyingRemote) return
    const { status } = useSync.getState()
    if (status !== 'connected') return
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(() => useSync.getState().push(), 1500)
  })
}
