import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { startAutoSync, useSync } from './sync/useSync'
import { SplashScreen } from './pages/SplashScreen'
import { Dashboard } from './pages/Dashboard'
import { PlaceholderPage } from './pages/PlaceholderPage'
import { WeeklySprint } from './pages/WeeklySprint'
import { LongHaul } from './pages/LongHaul'
import { ChatWithBarny } from './pages/ChatWithBarny'
import { FreeChat } from './pages/FreeChat'
import { Lesson } from './pages/Lesson'
import { AddWords } from './pages/AddWords'
import { Basics, BasicsPractice } from './pages/Basics'
import { A1Course, A1Unit } from './pages/A1Course'
import { EntryTest } from './pages/EntryTest'
import { Placement } from './pages/Placement'
import { Settings } from './pages/Settings'
import { PreLessonBlitz } from './pages/PreLessonBlitz'
import { KeyboardLab } from './pages/KeyboardLab'
import { ReconnectBanner } from './components/ReconnectBanner'
import './index.css'

function AppShell() {
  useEffect(() => {
    startAutoSync()
    // If we connected before, silently grab a fresh token (no popup) so the
    // user stays "logged in" across reloads.
    useSync.getState().reconnect()
  }, [])

  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <ReconnectBanner />
      <Routes>
        <Route path="/" element={<SplashScreen />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/placement" element={<Placement />} />
        <Route path="/campaign/weekly-sprint" element={<WeeklySprint />} />
        <Route path="/campaign/long-haul" element={<LongHaul />} />
        <Route path="/campaign/chat-with-barny" element={<ChatWithBarny />} />
        <Route path="/campaign/free-chat" element={<FreeChat />} />
        <Route path="/lesson" element={<Lesson />} />
        <Route path="/add-words" element={<AddWords />} />
        <Route path="/basics" element={<Basics />} />
        <Route path="/basics/play" element={<BasicsPractice />} />
        <Route path="/course" element={<A1Course />} />
        <Route path="/course/entry-test" element={<EntryTest />} />
        <Route path="/course/unit/:id" element={<A1Unit />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/pre-lesson-blitz" element={<PreLessonBlitz />} />
        <Route path="/keyboard-lab" element={<KeyboardLab />} />
        <Route path="/campaign/:mode" element={<PlaceholderPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default AppShell
