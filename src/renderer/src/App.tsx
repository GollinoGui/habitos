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
import OnboardingModal from './components/Onboarding/OnboardingModal'

export default function App(): React.JSX.Element {
  const [showOnboarding, setShowOnboarding] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem('habitos_onboarded')) {
      setShowOnboarding(true)
    }
  }, [])

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
            </Routes>
          </main>
        </div>
      </div>
      {showOnboarding && <OnboardingModal onComplete={() => setShowOnboarding(false)} />}
    </HashRouter>
  )
}
