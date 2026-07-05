import { useEffect } from 'react'
import { HashRouter, Routes, Route, useNavigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import { useAppStore } from './store/appStore'
import { resolvePostAuthRoute } from './lib/postAuthRoute'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Studio from './pages/Studio'
import Settings from './pages/Settings'
import PurchaseCredits from './pages/PurchaseCredits'
import Setup from './pages/Setup'

function Placeholder({ label }: { label: string }): React.JSX.Element {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[#0A0A0A] text-white">
      {label}
    </div>
  )
}

// Auth-only routes. We only auto-redirect *into* the app from these pages so
// that in-app navigation (e.g. Studio → Settings) isn't yanked back to /studio
// when Supabase re-emits SIGNED_IN on window focus or token refresh.
const AUTH_ROUTES = ['/', '/signup']

function AuthListener(): null {
  const navigate = useNavigate()
  const setSession = useAppStore((s) => s.setSession)
  const clearUser = useAppStore((s) => s.clearUser)

  useEffect(() => {
    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setSession(session)
        // Only route *into* the app if the user is sitting on a login/signup
        // screen. First-run users land on /setup, everyone else on /studio.
        if (
          (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') &&
          AUTH_ROUTES.includes(window.location.hash.replace(/^#/, '') || '/')
        ) {
          void resolvePostAuthRoute().then((route) => navigate(route))
        }
      } else {
        clearUser()
        if (event === 'SIGNED_OUT') {
          navigate('/')
        }
      }
    })

    return () => subscription.unsubscribe()
  }, [navigate, setSession, clearUser])

  return null
}

function App(): React.JSX.Element {
  return (
    <HashRouter>
      <AuthListener />
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/studio" element={<Studio />} />
        <Route path="/setup" element={<Setup />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/purchase-credits" element={<PurchaseCredits />} />
        <Route path="/characters" element={<Placeholder label="Characters" />} />
      </Routes>
    </HashRouter>
  )
}

export default App
