import { useState, FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { resolvePostAuthRoute } from '../lib/postAuthRoute'

function Spinner(): React.JSX.Element {
  return (
    <svg
      className="h-5 w-5 animate-spin text-white"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  )
}

function Login(): React.JSX.Element {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    setLoading(false)

    if (signInError) {
      setError(signInError.message)
      return
    }

    // First-run users go to the Setup Wizard; returning users to the Studio.
    navigate(await resolvePostAuthRoute())
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[#0A0A0A] px-4">
      <div className="w-full max-w-[400px] rounded-xl border border-[#2A2A2A] bg-surface p-8 shadow-lg">
        <h1 className="mb-6 text-2xl font-bold text-white">Livemask</h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            autoComplete="email"
            required
            className="w-full rounded-lg border border-[#2A2A2A] bg-[#1E1E1E] px-4 py-3 text-white placeholder:text-[#525252] focus:outline-none focus:ring-2 focus:ring-accent"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            autoComplete="current-password"
            required
            className="w-full rounded-lg border border-[#2A2A2A] bg-[#1E1E1E] px-4 py-3 text-white placeholder:text-[#525252] focus:outline-none focus:ring-2 focus:ring-accent"
          />

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center rounded-lg bg-accent py-3 font-semibold text-white transition-colors hover:bg-accent-hover disabled:opacity-70"
          >
            {loading ? <Spinner /> : 'Log in'}
          </button>
        </form>

        {error && <p className="mt-4 text-sm text-[#EF4444]">{error}</p>}

        <p className="mt-6 text-center text-sm text-[#A0A0A0]">
          Don&apos;t have an account?{' '}
          <Link to="/signup" className="font-medium text-accent hover:text-accent-hover">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
}

export default Login
