import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useStore } from './store/useStore'
import { startAutoSync } from './sync/useSync'
import { SplashScreen } from './pages/SplashScreen'
import { Dashboard } from './pages/Dashboard'
import { PlaceholderPage } from './pages/PlaceholderPage'
import { WeeklySprint } from './pages/WeeklySprint'
import { LongHaul } from './pages/LongHaul'
import { AddWords } from './pages/AddWords'
import { Settings } from './pages/Settings'
import './index.css'

function AppShell() {
  const { activeTheme } = useStore()

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', activeTheme)
  }, [activeTheme])

  useEffect(() => {
    startAutoSync()
  }, [])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<SplashScreen />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/campaign/weekly-sprint" element={<WeeklySprint />} />
        <Route path="/campaign/long-haul" element={<LongHaul />} />
        <Route path="/add-words" element={<AddWords />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/campaign/:mode" element={<PlaceholderPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default AppShell
