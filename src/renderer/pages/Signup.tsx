import { useState, FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

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

function Signup(): React.JSX.Element {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password
    })

    setLoading(false)

    if (signUpError) {
      setError(signUpError.message)
      return
    }

    setSuccess('Check your email to confirm your account.')
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
            autoComplete="new-password"
            required
            className="w-full rounded-lg border border-[#2A2A2A] bg-[#1E1E1E] px-4 py-3 text-white placeholder:text-[#525252] focus:outline-none focus:ring-2 focus:ring-accent"
          />
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm password"
            autoComplete="new-password"
            required
            className="w-full rounded-lg border border-[#2A2A2A] bg-[#1E1E1E] px-4 py-3 text-white placeholder:text-[#525252] focus:outline-none focus:ring-2 focus:ring-accent"
          />

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center rounded-lg bg-accent py-3 font-semibold text-white transition-colors hover:bg-accent-hover disabled:opacity-70"
          >
            {loading ? <Spinner /> : 'Sign up'}
          </button>
        </form>

        {error && <p className="mt-4 text-sm text-[#EF4444]">{error}</p>}
        {success && <p className="mt-4 text-sm text-[#22C55E]">{success}</p>}

        <p className="mt-6 text-center text-sm text-[#A0A0A0]">
          Already have an account?{' '}
          <Link to="/" className="font-medium text-accent hover:text-accent-hover">
            Log in
          </Link>
        </p>
      </div>
    </div>
  )
}

export default Signup
