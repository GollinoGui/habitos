import React, { useEffect, useState } from 'react'
import { HashRouter, Routes, Route } from 'react-router-dom'
import Sidebar from './components/Layout/Sidebar'
import TopBar from './components/Layout/TopBar'
import Dashboard from './pages/Dashboard'
import Habits from './pages/Habits'
import Gym from './pages/Gym'
import Addictions from './pages/Addictions'
import Goals from './pages/Goals'
import Achievements from './pages/Achievements'
import Settings from './pages/Settings'
import Journal from './pages/Journal'
import Sleep from './pages/Sleep'
import Finance from './pages/Finance'
import Reading from './pages/Reading'
import OnboardingModal from './components/Onboarding/OnboardingModal'
import TutorialOverlay from './components/Tutorial/TutorialOverlay'

function applyStoredTheme() {
  const theme = localStorage.getItem('habitos_theme') || 'dark'
  const accent = localStorage.getItem('habitos_accent') || '#7c3aed'
  document.documentElement.setAttribute('data-theme', theme)
  document.documentElement.style.setProperty('--accent-purple', accent)
}

export default function App(): React.JSX.Element {
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [showTutorial, setShowTutorial] = useState(false)

  useEffect(() => {
    applyStoredTheme()
    if (!localStorage.getItem('habitos_onboarded')) {
      setShowOnboarding(true)
    } else if (!localStorage.getItem('habitos_tutorial_done')) {
      setShowTutorial(true)
    }
  }, [])

  function handleOnboardingComplete(): void {
    setShowOnboarding(false)
    setShowTutorial(true)
  }

  function handleTutorialComplete(): void {
    localStorage.setItem('habitos_tutorial_done', '1')
    setShowTutorial(false)
  }

  return (
    <HashRouter>
      <div className="flex h-screen overflow-hidden bg-bg-primary">
        <Sidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <TopBar />
          <main className="flex-1 overflow-y-auto p-6">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/habits" element={<Habits />} />
              <Route path="/gym" element={<Gym />} />
              <Route path="/addictions" element={<Addictions />} />
              <Route path="/goals" element={<Goals />} />
              <Route path="/achievements" element={<Achievements />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/journal" element={<Journal />} />
              <Route path="/sleep" element={<Sleep />} />
              <Route path="/finance" element={<Finance />} />
              <Route path="/reading" element={<Reading />} />
            </Routes>
          </main>
        </div>
      </div>
      {showOnboarding && <OnboardingModal onComplete={handleOnboardingComplete} />}
      {showTutorial && !showOnboarding && (
        <TutorialOverlay onComplete={handleTutorialComplete} />
      )}
    </HashRouter>
  )
}
