import React, { useEffect, useState } from 'react'
import { HashRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
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
import Calendar from './pages/Calendar'
import Analytics from './pages/Analytics'
import Login from './pages/Login'
import OnboardingModal from './components/Onboarding/OnboardingModal'
import TutorialOverlay from './components/Tutorial/TutorialOverlay'
import MobileNav from './components/Layout/MobileNav'
import { AuthProvider, useAuth } from './contexts/AuthContext'

function applyStoredTheme() {
  const theme = localStorage.getItem('habitos_theme') || 'dark'
  const accent = localStorage.getItem('habitos_accent') || '#7c3aed'
  document.documentElement.setAttribute('data-theme', theme)
  document.documentElement.style.setProperty('--accent-purple', accent)
  if (localStorage.getItem('habitos_reduce_motion') === '1') {
    document.documentElement.setAttribute('data-reduce-motion', '1')
  }
}

applyStoredTheme()

const isDemo = typeof window !== 'undefined' && !!window.__demoMode__
const isMobileApp = typeof window !== 'undefined' && !window.api && !window.__demoMode__

function AppContent(): React.JSX.Element {
  const { user, loading, signOut } = useAuth()
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [showTutorial, setShowTutorial] = useState(false)

  useEffect(() => {
    if (!user || isDemo || isMobileApp) return

    const onboardedKey = 'habitos_onboarded'
    const tutorialKey = 'habitos_tutorial_done'

    if (localStorage.getItem(onboardedKey) && localStorage.getItem(tutorialKey)) return

    const checkExistingUser = async (): Promise<void> => {
      try {
        const [profile, habits] = await Promise.all([
          window.api!.profile.get(),
          window.api!.habits.list()
        ])
        const hasExistingData = (profile?.total_xp > 0) || (habits?.length > 0)
        if (hasExistingData) {
          localStorage.setItem(onboardedKey, '1')
          localStorage.setItem(tutorialKey, '1')
          return
        }
      } catch {
        // se falhar a checagem, segue o fluxo normal
      }

      if (!localStorage.getItem(onboardedKey)) {
        setShowOnboarding(true)
      } else if (!localStorage.getItem(tutorialKey)) {
        setShowTutorial(true)
      }
    }

    checkExistingUser()
  }, [user])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg-primary">
        <Loader2 size={32} className="animate-spin text-accent-purple" />
      </div>
    )
  }

  // Mobile app (Capacitor): show login screen or the full app
  if (isMobileApp) {
    if (!user) {
      return (
        <div className="flex h-screen items-center justify-center p-4 bg-bg-primary">
          <Login />
        </div>
      )
    }
    // window.api is already installed by AuthContext via installMobileApi()
    return (
      <HashRouter>
        <ScrollToTop />
        <TrayNavigator />
        <div className="flex flex-col h-screen overflow-hidden bg-bg-primary">
          <TopBar />
          <main className="flex-1 overflow-y-auto p-4 pb-20">
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
              <Route path="/calendar" element={<Calendar />} />
              <Route path="/analytics" element={<Analytics />} />
            </Routes>
          </main>
          <MobileNav />
        </div>
      </HashRouter>
    )
  }

  const showLoginOverlay = !user && !isDemo

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
      {/* App — only rendered when logged in */}
      <ScrollToTop />
      <TrayNavigator />
      <div className={`flex h-screen overflow-hidden bg-bg-primary transition-all duration-300 ${showLoginOverlay ? 'hidden' : ''}`}>
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
              <Route path="/calendar" element={<Calendar />} />
              <Route path="/analytics" element={<Analytics />} />
            </Routes>
          </main>
        </div>
      </div>

      {showOnboarding && <OnboardingModal onComplete={handleOnboardingComplete} />}
      {showTutorial && !showOnboarding && (
        <TutorialOverlay onComplete={handleTutorialComplete} />
      )}
      {isDemo && (
        <div className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-center gap-2 bg-accent-purple py-2 text-white text-xs font-semibold tracking-wide pointer-events-none">
          <span>MODO DEMO</span>
          <span className="opacity-60">—</span>
          <span className="opacity-80 font-normal">dados fictícios, nenhuma informação real é exibida</span>
        </div>
      )}

      {/* Login overlay with backdrop blur over fake preview */}
      {showLoginOverlay && (
        <>
          <div className="fixed inset-0 z-40 pointer-events-none select-none">
            <AppPreview />
          </div>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-black/60">
            <Login />
          </div>
        </>
      )}
    </HashRouter>
  )
}

function ScrollToTop(): null {
  const { pathname } = useLocation()
  useEffect(() => {
    document.querySelector('main')?.scrollTo(0, 0)
  }, [pathname])
  return null
}

function TrayNavigator(): null {
  const navigate = useNavigate()
  useEffect(() => {
    if (!window.electronNav) return
    return window.electronNav.onNavigate((path, action) => {
      navigate(path, action ? { state: { trayAction: action } } : undefined)
    })
  }, [navigate])
  return null
}

export default function App(): React.JSX.Element {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

function AppPreview(): React.JSX.Element {
  const fakeHabits = ['Meditar', 'Ler 30 min', 'Exercitar', 'Beber água', 'Dormir 8h']
  const fakeColors = ['#7c3aed', '#3b82f6', '#10b981', '#06b6d4', '#f59e0b']
  const fakeIcons = ['🧘', '📚', '🏃', '💧', '😴']
  const fakeXP = [240, 180, 320, 150, 200]

  return (
    <div className="flex h-screen overflow-hidden bg-bg-primary">
      {/* Sidebar falsa */}
      <div className="w-16 bg-bg-secondary border-r border-bg-border flex flex-col items-center py-4 gap-2">
        <div className="w-8 h-8 rounded-lg bg-accent-purple/20 mb-2" />
        {['🎯','✅','💪','🧠','🏆','📖','😴','💰','📚','📅'].map((icon, i) => (
          <div key={i} className="w-9 h-9 rounded-xl bg-bg-primary flex items-center justify-center text-sm opacity-50">
            {icon}
          </div>
        ))}
      </div>

      {/* Conteúdo falso */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar falsa */}
        <div className="h-12 border-b border-bg-border bg-bg-secondary flex items-center px-6 gap-4">
          <div className="h-4 w-32 bg-bg-border rounded-full" />
          <div className="ml-auto flex gap-3 items-center">
            <div className="h-4 w-20 bg-bg-border rounded-full" />
            <div className="w-7 h-7 rounded-full bg-accent-purple/30" />
          </div>
        </div>

        <div className="flex-1 p-6 overflow-hidden">
          {/* Cards de stats */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Sequência', val: '7 dias', color: 'text-accent-purple' },
              { label: 'XP Total', val: '1.240', color: 'text-yellow-400' },
              { label: 'Hábitos hoje', val: '3/5', color: 'text-accent-green' },
              { label: 'Nível', val: 'Lendário', color: 'text-blue-400' },
            ].map(s => (
              <div key={s.label} className="bg-bg-secondary border border-bg-border rounded-xl p-4">
                <p className="text-xs text-text-muted mb-1">{s.label}</p>
                <p className={`text-lg font-bold ${s.color}`}>{s.val}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-4">
            {/* Hábitos falsos */}
            <div className="col-span-2 bg-bg-secondary border border-bg-border rounded-xl p-4">
              <p className="text-sm font-semibold text-text-primary mb-3">Hábitos de hoje</p>
              <div className="space-y-2.5">
                {fakeHabits.map((h, i) => (
                  <div key={h} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                      style={{ backgroundColor: fakeColors[i] + '30' }}>
                      {fakeIcons[i]}
                    </div>
                    <span className="text-sm text-text-primary flex-1">{h}</span>
                    <span className="text-xs text-text-muted">+{fakeXP[i]} XP</span>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${i < 3 ? 'bg-accent-purple border-accent-purple' : 'border-bg-border'}`}>
                      {i < 3 && <span className="text-white text-xs">✓</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Conquistas falsas */}
            <div className="bg-bg-secondary border border-bg-border rounded-xl p-4">
              <p className="text-sm font-semibold text-text-primary mb-3">Conquistas</p>
              <div className="space-y-2">
                {['🌟','🔥','💪','📝','🛡️'].map((icon, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-lg">{icon}</span>
                    <div className="flex-1">
                      <div className="h-2.5 bg-bg-border rounded-full" style={{ width: `${60 + i * 8}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
