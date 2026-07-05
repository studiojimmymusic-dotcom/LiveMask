import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import WebcamPreview from '../components/WebcamPreview'
import TransformPreview from '../components/TransformPreview'
import CharacterCard from '../components/CharacterCard'
import CharacterUpload from '../components/CharacterUpload'
import { useWebcam, loadAspectRatioPref } from '../hooks/useWebcam'
import { useDecartSession } from '../hooks/useDecartSession'
import { useCharacters, MAX_CHARACTERS } from '../hooks/useCharacters'
import { useFrameExtractor } from '../hooks/useFrameExtractor'
import { useProfile } from '../hooks/useProfile'
import { getOutputDimensions } from '../lib/aspect'
import { CREDITS_PER_SECOND } from '../lib/credits'
import { useAppStore } from '../store/appStore'
import type { SessionState } from '../types/session'

const ACTIVE_STATES: SessionState[] = [
  'fetching_token',
  'connecting',
  'connected',
  'generating',
  'reconnecting'
]

function formatTimer(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

function formatCreditsUsed(seconds: number): string {
  return `${(seconds * CREDITS_PER_SECOND).toLocaleString('en-NG')} credits`
}

function SettingsIcon(): React.JSX.Element {
  return (
    <svg
      className="h-5 w-5"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}

function Studio(): React.JSX.Element {
  const aspectRatio = useAppStore((s) => s.aspectRatio)
  const setAspectRatio = useAppStore((s) => s.setAspectRatio)
  const outputDimensions = getOutputDimensions(aspectRatio)
  const isPortrait = aspectRatio === 'portrait'

  const { localStream, error: webcamError } = useWebcam(aspectRatio)
  const { state, remoteStream, startSession, stopSession, switchCharacter, error: sessionError } =
    useDecartSession(localStream)
  const { loadCachedCharacters, fetchCharacters, deleteCharacter } = useCharacters()
  const { fetchProfile } = useProfile()

  const characters = useAppStore((s) => s.characters)
  const activeCharacter = useAppStore((s) => s.activeCharacter)
  const virtualCamStatus = useAppStore((s) => s.virtualCamStatus)
  const setVirtualCamStatus = useAppStore((s) => s.setVirtualCamStatus)
  const toast = useAppStore((s) => s.toast)
  const setToast = useAppStore((s) => s.setToast)
  const profile = useAppStore((s) => s.profile)
  const creditsBalance = profile?.credits_balance ?? 0

  const [startError, setStartError] = useState<string | null>(null)
  const [sessionSeconds, setSessionSeconds] = useState(0)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [virtualCamInstalled, setVirtualCamInstalled] = useState(true)
  const [virtualCamOn, setVirtualCamOn] = useState(false)

  const isSessionActive = ACTIVE_STATES.includes(state)

  // Pipe the transformed stream into the virtual camera while it's running.
  useFrameExtractor(remoteStream, virtualCamOn, outputDimensions)

  useEffect(() => {
    void loadAspectRatioPref().then(setAspectRatio)
  }, [setAspectRatio])

  useEffect(() => {
    // Cache-first: paint instantly from local SQLite, then refresh from Supabase.
    void loadCachedCharacters().then(() => fetchCharacters())
    void fetchProfile()
  }, [loadCachedCharacters, fetchCharacters, fetchProfile])

  // Auto-dismiss the usage/overage toast after a few seconds.
  useEffect(() => {
    if (!toast) return
    const id = window.setTimeout(() => setToast(null), 6000)
    return () => window.clearTimeout(id)
  }, [toast, setToast])

  // Detect the OBS VirtualCam driver on mount.
  useEffect(() => {
    void window.api.virtualcam.check().then(setVirtualCamInstalled)
  }, [])

  // If the sidecar exits unexpectedly, reflect the error and stop piping frames.
  useEffect(() => {
    const unsubscribe = window.api.onVirtualCamStatus((status) => {
      setVirtualCamStatus(status)
      if (status === 'error' || status === 'idle') setVirtualCamOn(false)
    })
    return unsubscribe
  }, [setVirtualCamStatus])

  // Tear down the virtual cam if the session ends on its own (drop / error).
  useEffect(() => {
    if (virtualCamOn && (state === 'idle' || state === 'error' || state === 'disconnected')) {
      void window.api.virtualcam.stop()
      setVirtualCamOn(false)
      setVirtualCamStatus('idle')
    }
  }, [state, virtualCamOn, setVirtualCamStatus])

  useEffect(() => {
    if (!isSessionActive) {
      setSessionSeconds(0)
      return
    }

    const interval = window.setInterval(() => {
      setSessionSeconds((prev) => prev + 1)
    }, 1000)

    return () => window.clearInterval(interval)
  }, [isSessionActive])

  // Live character switching: when the active character changes mid-session,
  // swap the reference image without reconnecting.
  useEffect(() => {
    if (isSessionActive && activeCharacter) {
      void switchCharacter(activeCharacter)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCharacter?.id])

  const handleStartStop = async (): Promise<void> => {
    setStartError(null)

    if (isSessionActive) {
      stopSession()
      await window.api.virtualcam.stop()
      setVirtualCamOn(false)
      setVirtualCamStatus('idle')
      return
    }

    if (!activeCharacter) {
      setStartError('Select a character first')
      return
    }

    const started = await startSession(activeCharacter)
    if (started) {
      await window.api.virtualcam.start(outputDimensions.width, outputDimensions.height)
      setVirtualCamOn(true)
      setVirtualCamStatus('active')
    }
  }

  const displayError = startError ?? sessionError

  return (
    <div className="flex min-h-screen w-full flex-col bg-[#0A0A0A] text-white">
      {/* Top bar */}
      <header className="flex items-center justify-between border-b border-[#2A2A2A] px-6 py-4">
        <h1 className="text-xl font-bold">Livemask</h1>
        <div className="flex items-center gap-4">
          <Link
            to="/purchase-credits"
            className="text-sm text-accent transition-colors hover:text-accent-hover"
          >
            {creditsBalance.toLocaleString('en-NG')} credits
          </Link>
          <Link
            to="/settings"
            className="rounded-lg p-2 text-[#A0A0A0] transition-colors hover:bg-surface-raised hover:text-white"
            aria-label="Settings"
          >
            <SettingsIcon />
          </Link>
        </div>
      </header>

      <main className="flex flex-1 flex-col gap-6 p-6">
        {/* Two-panel preview row */}
        <div
          className={`grid gap-4 ${
            isPortrait
              ? 'mx-auto grid-cols-2 max-w-2xl'
              : 'grid-cols-2'
          }`}
        >
          <div className="rounded-xl border border-[#2A2A2A] bg-surface p-4">
            <WebcamPreview
              localStream={localStream}
              error={webcamError}
              aspectRatio={aspectRatio}
            />
          </div>
          <div className="rounded-xl border border-[#2A2A2A] bg-surface p-4">
            <TransformPreview
              remoteStream={remoteStream}
              state={state}
              aspectRatio={aspectRatio}
            />
          </div>
        </div>

        {/* Virtual cam not-detected warning */}
        {!virtualCamInstalled && (
          <div className="rounded-lg border border-[#F59E0B]/40 bg-[#F59E0B]/10 px-4 py-3 text-sm text-[#F59E0B]">
            Livemask Cam not detected. Install{' '}
            <a
              href="https://obsproject.com"
              target="_blank"
              rel="noreferrer"
              className="underline hover:text-[#FFB84D]"
            >
              OBS VirtualCam
            </a>{' '}
            to use Livemask in Zoom and Discord.
          </div>
        )}

        {/* Character library */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[#A0A0A0]">
              Character Library
              <span className="ml-2 font-normal text-[#525252]">
                {characters.length}/{MAX_CHARACTERS}
              </span>
            </h2>
          </div>
          <div className="flex items-center gap-3 overflow-x-auto pb-1">
            {characters.length === 0 && (
              <span className="text-sm text-[#525252]">
                Upload your first character to get started
              </span>
            )}

            {characters.map((character) => (
              <CharacterCard
                key={character.id}
                character={character}
                onDelete={(id) => void deleteCharacter(id)}
              />
            ))}

            {characters.length < MAX_CHARACTERS && (
              <button
                type="button"
                onClick={() => setUploadOpen(true)}
                className="flex h-40 w-40 shrink-0 flex-col items-center justify-center rounded-xl border border-dashed border-[#2A2A2A] text-[#525252] transition-colors hover:border-accent"
                aria-label="New Character"
              >
                <span className="text-3xl leading-none">+</span>
                <span className="mt-1 text-xs">New Character</span>
              </button>
            )}
          </div>
        </section>

        {/* Bottom bar */}
        <section className="mt-auto space-y-3">
          <button
            type="button"
            onClick={() => void handleStartStop()}
            className={`w-full rounded-xl py-4 text-lg font-bold transition-colors ${
              isSessionActive
                ? 'bg-[#EF4444] text-white hover:bg-[#DC2626]'
                : 'bg-accent text-white hover:bg-accent-hover'
            }`}
          >
            {isSessionActive ? 'STOP' : 'START LIVEMASK'}
          </button>

          {displayError && <p className="text-center text-sm text-[#EF4444]">{displayError}</p>}

          <div className="flex items-center justify-between font-mono text-accent">
            <div className="flex items-center gap-4">
              <span>Session: {formatTimer(sessionSeconds)}</span>
              <span>Used: {formatCreditsUsed(sessionSeconds)}</span>
            </div>
            <span className="flex items-center gap-1.5 text-[#A0A0A0]">
              Livemask Cam
              <span
                className={`h-2 w-2 rounded-full ${
                  virtualCamStatus === 'active'
                    ? 'bg-[#22C55E]'
                    : virtualCamStatus === 'error'
                      ? 'bg-[#EF4444]'
                      : 'bg-[#525252]'
                }`}
              />
            </span>
          </div>
        </section>
      </main>

      {uploadOpen && <CharacterUpload onClose={() => setUploadOpen(false)} />}

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 max-w-md -translate-x-1/2 rounded-lg border border-[#F59E0B]/40 bg-surface-raised px-5 py-3 text-sm text-[#F59E0B] shadow-lg">
          {toast}
        </div>
      )}
    </div>
  )
}

export default Studio
