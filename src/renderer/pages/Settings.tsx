import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { parseAspectRatio, type AspectRatio } from '../lib/aspect'
import { useAppStore } from '../store/appStore'
import { useProfile } from '../hooks/useProfile'

type Tab = 'camera' | 'account' | 'virtualcam' | 'about'

const TABS: { id: Tab; label: string }[] = [
  { id: 'camera', label: 'Camera' },
  { id: 'account', label: 'Account' },
  { id: 'virtualcam', label: 'Virtual Camera' },
  { id: 'about', label: 'About' }
]

const INPUT_CLASS =
  'w-full rounded-lg border border-[#2A2A2A] bg-[#1E1E1E] px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-accent'

function BackArrow(): React.JSX.Element {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
    </svg>
  )
}

function SectionHeading({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-white">{children}</h2>
  )
}

function CameraTab(): React.JSX.Element {
  const setAspectRatio = useAppStore((s) => s.setAspectRatio)
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
  const [deviceId, setDeviceId] = useState('')
  const [resolution, setResolution] = useState('720p')
  const [aspectRatio, setAspectRatioLocal] = useState<AspectRatio>('landscape')

  useEffect(() => {
    async function load(): Promise<void> {
      const all = await navigator.mediaDevices.enumerateDevices()
      setDevices(all.filter((d) => d.kind === 'videoinput'))

      const savedDevice = await window.api.prefs.get('webcam_device_id')
      const savedResolution = await window.api.prefs.get('output_resolution')
      const savedAspect = await window.api.prefs.get('output_aspect_ratio')
      if (savedDevice) setDeviceId(savedDevice)
      if (savedResolution) setResolution(savedResolution)
      const ratio = parseAspectRatio(savedAspect)
      setAspectRatioLocal(ratio)
      setAspectRatio(ratio)
    }
    void load()
  }, [setAspectRatio])

  const handleDeviceChange = (value: string): void => {
    setDeviceId(value)
    void window.api.prefs.set('webcam_device_id', value)
  }

  const handleResolutionChange = (value: string): void => {
    setResolution(value)
    void window.api.prefs.set('output_resolution', value)
  }

  const handleAspectRatioChange = (value: AspectRatio): void => {
    setAspectRatioLocal(value)
    setAspectRatio(value)
    void window.api.prefs.set('output_aspect_ratio', value)
  }

  return (
    <div className="max-w-md">
      <SectionHeading>Camera</SectionHeading>

      <label className="mb-2 block text-sm text-[#A0A0A0]">Webcam Source</label>
      <select
        value={deviceId}
        onChange={(e) => handleDeviceChange(e.target.value)}
        className={INPUT_CLASS}
      >
        {devices.length === 0 && <option value="">No cameras found</option>}
        {devices.map((device, index) => (
          <option key={device.deviceId} value={device.deviceId}>
            {device.label || `Camera ${index + 1}`}
          </option>
        ))}
      </select>

      <label className="mb-2 mt-6 block text-sm text-[#A0A0A0]">Output Resolution</label>
      <select
        value={resolution}
        onChange={(e) => handleResolutionChange(e.target.value)}
        className={INPUT_CLASS}
      >
        <option value="720p">720p (Recommended)</option>
        <option value="480p">480p (Faster, lower quality)</option>
      </select>

      <label className="mb-2 mt-6 block text-sm text-[#A0A0A0]">Output Aspect Ratio</label>
      <select
        value={aspectRatio}
        onChange={(e) => handleAspectRatioChange(e.target.value as AspectRatio)}
        className={INPUT_CLASS}
      >
        <option value="landscape">Landscape (16:9)</option>
        <option value="portrait">Portrait (9:16)</option>
      </select>

      <p className="mt-3 text-xs text-[#525252]">
        Changes apply the next time a session starts. Portrait mode uses a vertical camera feed for
        TikTok-style content.
      </p>
    </div>
  )
}

function AccountTab(): React.JSX.Element {
  const navigate = useNavigate()
  const user = useAppStore((s) => s.user)
  const profile = useAppStore((s) => s.profile)
  const { fetchProfile } = useProfile()

  const creditsBalance = profile?.credits_balance ?? 0

  const handleSignOut = async (): Promise<void> => {
    await supabase.auth.signOut()
    navigate('/')
  }

  useEffect(() => {
    void fetchProfile()
  }, [fetchProfile])

  return (
    <div className="max-w-md">
      <SectionHeading>Account</SectionHeading>

      <div className="mb-6">
        <span className="block text-sm text-[#A0A0A0]">Email</span>
        <span className="text-white">{user?.email ?? '—'}</span>
      </div>

      <div className="mb-8 rounded-xl border border-[#2A2A2A] bg-[#141414] p-5">
        <span className="block text-sm text-[#A0A0A0]">Credit balance</span>
        <span className="text-2xl font-bold text-accent">
          {creditsBalance.toLocaleString('en-NG')} credits
        </span>
        <p className="mt-1 text-xs text-[#525252]">
          2 credits per second of stream time · credits never expire
        </p>
      </div>

      <button
        type="button"
        onClick={() => navigate('/purchase-credits')}
        className="w-full rounded-lg bg-accent py-3 font-semibold text-white transition-colors hover:bg-accent-hover"
      >
        Purchase Credits
      </button>

      <button
        type="button"
        onClick={() => void handleSignOut()}
        className="mt-10 w-full rounded-lg bg-[#1E1E1E] py-3 font-semibold text-[#EF4444] transition-colors hover:bg-[#2A2A2A]"
      >
        Sign Out
      </button>
    </div>
  )
}

function VirtualCamTab(): React.JSX.Element {
  const [installed, setInstalled] = useState<boolean | null>(null)
  const [reinstalling, setReinstalling] = useState(false)

  useEffect(() => {
    void window.api.virtualcam.check().then(setInstalled)
  }, [])

  const handleReinstall = async (): Promise<void> => {
    setReinstalling(true)
    try {
      await window.api.virtualcam.install()
    } finally {
      setReinstalling(false)
    }
  }

  return (
    <div className="max-w-md">
      <SectionHeading>Virtual Camera</SectionHeading>

      <p className="mb-6 text-sm">
        {installed === null ? (
          <span className="text-[#A0A0A0]">Checking…</span>
        ) : installed ? (
          <span className="text-[#22C55E]">Livemask Cam is installed ✓</span>
        ) : (
          <span className="text-[#EF4444]">Not installed</span>
        )}
      </p>

      <button
        type="button"
        onClick={() => void handleReinstall()}
        disabled={reinstalling}
        className="rounded-lg border border-[#2A2A2A] bg-[#1E1E1E] px-5 py-3 font-semibold text-white transition-colors hover:border-accent disabled:opacity-70"
      >
        {reinstalling ? 'Opening…' : 'Reinstall Driver'}
      </button>

      <p className="mt-6 text-sm text-[#A0A0A0]">
        To use Livemask in video calls, select &apos;OBS Virtual Camera&apos; as your camera in
        Zoom, Discord, or Google Meet.
      </p>

      <p className="mt-3 text-sm text-[#F59E0B]">
        Note: the WhatsApp desktop app can&apos;t use &apos;OBS Virtual Camera&apos; and may say the
        camera is in use by another app. Use{' '}
        <button
          type="button"
          onClick={() => void window.api.openExternal('https://web.whatsapp.com')}
          className="underline hover:text-[#FFB84D]"
        >
          WhatsApp Web
        </button>{' '}
        in Chrome or Edge instead, then pick &apos;OBS Virtual Camera&apos; there.
      </p>
    </div>
  )
}

function AboutTab(): React.JSX.Element {
  const [version, setVersion] = useState('—')
  const [updateMsg, setUpdateMsg] = useState<string | null>(null)
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    void window.api.app.getVersion().then(setVersion)
  }, [])

  const handleCheckUpdates = async (): Promise<void> => {
    setChecking(true)
    setUpdateMsg(null)
    try {
      const result = await window.api.app.checkForUpdates()
      setUpdateMsg(result.message)
    } finally {
      setChecking(false)
    }
  }

  return (
    <div className="max-w-md">
      <SectionHeading>About</SectionHeading>

      <div className="mb-6">
        <span className="block text-sm text-[#A0A0A0]">Version</span>
        <span className="font-mono text-white">{version}</span>
      </div>

      <button
        type="button"
        onClick={() => void handleCheckUpdates()}
        disabled={checking}
        className="rounded-lg border border-[#2A2A2A] bg-[#1E1E1E] px-5 py-3 font-semibold text-white transition-colors hover:border-accent disabled:opacity-70"
      >
        {checking ? 'Checking…' : 'Check for Updates'}
      </button>

      {updateMsg && <p className="mt-3 text-sm text-[#A0A0A0]">{updateMsg}</p>}

      <p className="mt-8 text-sm">
        <button
          type="button"
          onClick={() => void window.api.openExternal('https://livemask.ai')}
          className="text-accent hover:text-accent-hover"
        >
          livemask.ai
        </button>
      </p>

      <p className="mt-2 text-xs text-[#525252]">© {new Date().getFullYear()} Livemask</p>
    </div>
  )
}

function Settings(): React.JSX.Element {
  const navigate = useNavigate()
  const { fetchProfile } = useProfile()
  const [tab, setTab] = useState<Tab>('camera')

  useEffect(() => {
    void fetchProfile()
  }, [fetchProfile])

  return (
    <div className="flex min-h-screen w-full bg-[#0A0A0A] text-white">
      {/* Sidebar */}
      <aside className="flex w-56 shrink-0 flex-col border-r border-[#2A2A2A] bg-surface p-4">
        <button
          type="button"
          onClick={() => navigate('/studio')}
          className="mb-6 flex items-center gap-2 text-[#A0A0A0] transition-colors hover:text-white"
          aria-label="Back to Studio"
        >
          <BackArrow />
          <span className="text-sm font-medium">Back</span>
        </button>

        <nav className="flex flex-col">
          {TABS.map((t) => {
            const active = tab === t.id
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`border-l-2 px-4 py-2.5 text-left text-sm transition-colors ${
                  active
                    ? 'border-accent font-medium text-white'
                    : 'border-transparent text-[#A0A0A0] hover:text-white'
                }`}
              >
                {t.label}
              </button>
            )
          })}
        </nav>
      </aside>

      {/* Content */}
      <main className="flex-1 overflow-y-auto bg-[#0A0A0A] p-8">
        {tab === 'camera' && <CameraTab />}
        {tab === 'account' && <AccountTab />}
        {tab === 'virtualcam' && <VirtualCamTab />}
        {tab === 'about' && <AboutTab />}
      </main>
    </div>
  )
}

export default Settings
