import { useCallback, useEffect, useRef, useState } from 'react'
import {
  createDecartClient,
  models,
  type ConnectionState,
  type RealTimeClient
} from '@decartai/sdk'
import { useAppStore } from '../store/appStore'
import { CREDITS_PER_SECOND } from '../lib/credits'
import type { Character } from '../types/character'
import type { SessionState } from '../types/session'

interface UseDecartSessionReturn {
  state: SessionState
  remoteStream: MediaStream | null
  startSession: (character: Character) => Promise<boolean>
  stopSession: () => void
  switchCharacter: (character: Character) => Promise<void>
  error: string | null
}

function mapDecartState(decartState: ConnectionState): SessionState {
  switch (decartState) {
    case 'connecting':
      return 'connecting'
    case 'connected':
      return 'connected'
    case 'generating':
      return 'generating'
    case 'reconnecting':
      console.log(
        '[Livemask] Decart session reconnecting — virtual cam fallback comes in a later step'
      )
      return 'reconnecting'
    case 'disconnected':
      return 'disconnected'
    default:
      return 'idle'
  }
}

export function useDecartSession(localStream: MediaStream | null): UseDecartSessionReturn {
  const authSession = useAppStore((s) => s.session)

  const [state, setState] = useState<SessionState>('idle')
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)
  const [error, setError] = useState<string | null>(null)

  const clientRef = useRef<RealTimeClient | null>(null)
  const stopSessionRef = useRef<() => void>(() => {})

  const stopSession = useCallback(() => {
    clientRef.current?.disconnect()
    clientRef.current = null
    setRemoteStream(null)
    setState('idle')
    setError(null)
  }, [])

  stopSessionRef.current = stopSession

  const switchCharacter = useCallback(async (character: Character) => {
    const client = clientRef.current
    if (!client) return

    if (!character.thumbnail_url) {
      setError('Character image is missing.')
      return
    }

    try {
      await client.set({
        prompt: character.prompt,
        image: character.thumbnail_url,
        enhance: true
      })
      setError(null)
    } catch {
      setError('Failed to switch character. Try again.')
    }
  }, [])

  const startSession = useCallback(
    async (character: Character): Promise<boolean> => {
      if (!localStream) {
        setError('Camera is not ready.')
        return false
      }

      if (!character.thumbnail_url) {
        setError('Character image is missing.')
        return false
      }

      const accessToken = authSession?.access_token
      if (!accessToken) {
        setError('You must be logged in to start a session.')
        return false
      }

      const backendUrl = import.meta.env.VITE_BACKEND_URL
      if (!backendUrl) {
        setError('Backend URL is not configured.')
        return false
      }

      stopSession()
      setState('fetching_token')
      setError(null)

      try {
        const tokenRes = await fetch(`${backendUrl}/api/token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ supabase_access_token: accessToken })
        })

        const tokenData = (await tokenRes.json()) as {
          apiKey?: string
          expiresAt?: string
          error?: string
        }

        if (!tokenRes.ok || !tokenData.apiKey) {
          if (tokenData.error === 'insufficient_credits') {
            setError('You have no credits left. Purchase credits to continue.')
          } else {
            setError("Couldn't connect to Livemask servers. Check your internet connection.")
          }
          setState('error')
          return false
        }

        setState('connecting')

        const decartClient = createDecartClient({ apiKey: tokenData.apiKey })
        const realtimeClient = await decartClient.realtime.connect(localStream, {
          model: models.realtime('lucy-2.1'),
          onRemoteStream: (stream) => {
            setRemoteStream(stream)
          },
          onConnectionChange: (connectionState) => {
            setState(mapDecartState(connectionState))
          }
        })

        clientRef.current = realtimeClient

        await realtimeClient.set({
          prompt: character.prompt,
          image: character.thumbnail_url,
          enhance: true
        })

        return true
      } catch {
        clientRef.current?.disconnect()
        clientRef.current = null
        setRemoteStream(null)
        setError('Connection to the AI failed. Check your internet and try again.')
        setState('error')
        return false
      }
    },
    [authSession?.access_token, localStream, stopSession]
  )

  // Deduct 2 credits per second while a session is live.
  useEffect(() => {
    const active = (
      ['fetching_token', 'connecting', 'connected', 'generating', 'reconnecting'] as SessionState[]
    ).includes(state)
    if (!active) return

    const backendUrl = import.meta.env.VITE_BACKEND_URL
    const accessToken = authSession?.access_token
    if (!backendUrl || !accessToken) return

    let lowCreditsWarned = false

    const reportUsage = async (): Promise<void> => {
      try {
        const res = await fetch(`${backendUrl}/api/usage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            supabase_access_token: accessToken,
            credits: CREDITS_PER_SECOND
          })
        })
        if (!res.ok) return

        const data = (await res.json()) as { credits_balance: number; depleted: boolean }
        const store = useAppStore.getState()
        const current = store.profile
        if (current) {
          store.setProfile({ ...current, credits_balance: data.credits_balance })
        }

        if (data.depleted) {
          store.setToast('Your credits have run out. Purchase more to keep streaming.')
          stopSessionRef.current()
        } else if (!lowCreditsWarned && data.credits_balance <= 60) {
          lowCreditsWarned = true
          store.setToast(
            `Low credits: ${data.credits_balance} remaining (~${Math.floor(data.credits_balance / CREDITS_PER_SECOND)}s)`
          )
        }
      } catch {
        // Network blip — skip this tick, try again next second.
      }
    }

    const intervalId = window.setInterval(() => void reportUsage(), 1000)
    return () => window.clearInterval(intervalId)
  }, [state, authSession?.access_token])

  return { state, remoteStream, startSession, stopSession, switchCharacter, error }
}
