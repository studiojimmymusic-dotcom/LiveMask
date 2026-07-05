import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAppStore } from '../store/appStore'
import { useProfile } from '../hooks/useProfile'
import {
  CREDIT_PACKS,
  formatCredits,
  formatNgn,
  formatStreamEstimate
} from '../lib/credits'

function BackArrow(): React.JSX.Element {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
    </svg>
  )
}

function LogoutIcon(): React.JSX.Element {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9"
      />
    </svg>
  )
}

function CreditIcon(): React.JSX.Element {
  return (
    <svg className="h-6 w-6 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <circle cx="9" cy="12" r="5" />
      <circle cx="15" cy="12" r="5" />
    </svg>
  )
}

function PurchaseCredits(): React.JSX.Element {
  const navigate = useNavigate()
  const user = useAppStore((s) => s.user)
  const session = useAppStore((s) => s.session)
  const profile = useAppStore((s) => s.profile)
  const { fetchProfile } = useProfile()

  const [loadingPack, setLoadingPack] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void fetchProfile()
  }, [fetchProfile])

  const handlePurchase = async (packId: string): Promise<void> => {
    setError(null)
    const token = session?.access_token
    const backendUrl = import.meta.env.VITE_BACKEND_URL
    if (!token || !backendUrl) {
      setError('You must be logged in to purchase credits.')
      return
    }

    setLoadingPack(packId)
    try {
      const res = await fetch(`${backendUrl}/api/create-credit-checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ supabase_access_token: token, pack_id: packId })
      })

      let data: { url?: string; error?: string } = {}
      const contentType = res.headers.get('content-type') ?? ''
      if (contentType.includes('application/json')) {
        data = (await res.json()) as { url?: string; error?: string }
      }

      if (res.ok && data.url) {
        await window.api.openExternal(data.url)
        window.setTimeout(() => void fetchProfile(), 5000)
      } else if (res.status === 404) {
        setError(
          'Credit checkout is not available on the server yet. The backend needs to be redeployed with the latest changes.'
        )
      } else {
        setError('Could not start checkout. Please try again.')
      }
    } catch {
      setError('Could not reach the billing server. Check your connection.')
    } finally {
      setLoadingPack(null)
    }
  }

  const handleLogout = async (): Promise<void> => {
    await supabase.auth.signOut()
    navigate('/')
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-[#0A0A0A] text-white">
      {/* Top bar */}
      <header className="flex items-center justify-between px-6 py-4">
        <button
          type="button"
          onClick={() => navigate('/studio')}
          className="flex items-center gap-2 text-[#A0A0A0] transition-colors hover:text-white"
        >
          <BackArrow />
          <span className="text-sm font-medium">Back</span>
        </button>
        <button
          type="button"
          onClick={() => void handleLogout()}
          className="flex items-center gap-2 text-[#A0A0A0] transition-colors hover:text-white"
        >
          <LogoutIcon />
          <span className="text-sm font-medium">Logout</span>
        </button>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-6 pb-12">
        <h1 className="text-3xl font-bold">Purchase Credits</h1>
        <p className="mt-2 text-[#A0A0A0]">
          Signed in as {user?.email ?? '—'}. Select credits to power your AI transformations
        </p>

        {profile && (
          <p className="mt-3 text-sm text-accent">
            Current balance: {formatCredits(profile.credits_balance)} credits
          </p>
        )}

        <h2 className="mt-10 text-sm font-semibold uppercase tracking-widest">Select Credits</h2>

        <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {CREDIT_PACKS.map((pack) => (
            <button
              key={pack.id}
              type="button"
              onClick={() => void handlePurchase(pack.id)}
              disabled={loadingPack !== null}
              className="flex flex-col items-center rounded-xl border border-[#2A2A2A] bg-[#141414] px-4 py-6 transition-colors hover:border-accent disabled:opacity-70"
            >
              <CreditIcon />
              <span className="mt-3 text-lg font-bold">{formatCredits(pack.credits)} Credits</span>
              <span className="mt-1 text-sm text-[#A0A0A0]">{formatStreamEstimate(pack.credits)}</span>
              <span className="mt-4 text-base font-semibold text-accent">{formatNgn(pack.priceNgn)}</span>
              {loadingPack === pack.id && (
                <span className="mt-2 text-xs text-[#A0A0A0]">Opening checkout…</span>
              )}
            </button>
          ))}
        </div>

        {error && <p className="mt-4 text-sm text-[#EF4444]">{error}</p>}

        <div className="mt-10 rounded-xl border border-[#2A2A2A] bg-[#141414] p-6">
          <h3 className="text-lg font-semibold">How credits work</h3>
          <ul className="mt-4 space-y-2 text-sm text-[#A0A0A0]">
            <li>• Each second of stream time uses 2 credits</li>
            <li>• 500 credits is about 4 minutes 10 seconds</li>
            <li>• 1000 credits is about 8 minutes 20 seconds</li>
            <li>• Credits never expire</li>
          </ul>
        </div>

        <p className="mt-8 text-center text-sm text-[#525252]">
          All purchases are one-time. No subscriptions or hidden fees.
        </p>
      </main>
    </div>
  )
}

export default PurchaseCredits
