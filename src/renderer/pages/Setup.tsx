import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

type InstallState = 'idle' | 'installing' | 'success' | 'failed'

function Spinner(): React.JSX.Element {
  return (
    <svg className="h-5 w-5 animate-spin text-white" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  )
}

function CheckIcon(): React.JSX.Element {
  return (
    <svg className="h-16 w-16 text-[#22C55E]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
    </svg>
  )
}

function StepIndicator({ step }: { step: number }): React.JSX.Element {
  return (
    <div className="mb-10 flex items-center justify-center gap-3">
      {[1, 2, 3].map((n) => (
        <div key={n} className="flex items-center gap-3">
          <span
            className={`h-3 w-3 rounded-full transition-colors ${
              n === step ? 'bg-accent' : 'bg-[#2A2A2A]'
            }`}
          />
          {n < 3 && <span className="h-px w-8 bg-[#2A2A2A]" />}
        </div>
      ))}
    </div>
  )
}

function Setup(): React.JSX.Element {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [installState, setInstallState] = useState<InstallState>('idle')

  const handleInstall = async (): Promise<void> => {
    setInstallState('installing')
    try {
      await window.api.virtualcam.install()
      // Give the driver a moment to register before verifying.
      await new Promise((resolve) => setTimeout(resolve, 1500))
      const installed = await window.api.virtualcam.check()
      if (installed) {
        setInstallState('success')
        setTimeout(() => setStep(3), 1500)
      } else {
        setInstallState('failed')
      }
    } catch {
      setInstallState('failed')
    }
  }

  const handleFinish = async (): Promise<void> => {
    await window.api.prefs.set('virtual_cam_installed', 'true')
    navigate('/studio')
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[#0A0A0A] px-4 text-white">
      <div className="w-full max-w-[480px] text-center">
        <StepIndicator step={step} />

        {step === 1 && (
          <div className="flex flex-col items-center">
            <h1 className="mb-4 text-4xl font-bold">Livemask</h1>
            <p className="mb-8 text-[#A0A0A0]">
              Let&apos;s get you set up. This takes about 30 seconds.
            </p>
            <button
              type="button"
              onClick={() => setStep(2)}
              className="rounded-lg bg-accent px-8 py-3 font-semibold text-white transition-colors hover:bg-accent-hover"
            >
              Get Started →
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col items-center">
            <h2 className="mb-4 text-2xl font-bold">Install Livemask Cam</h2>
            <p className="mb-8 text-[#A0A0A0]">
              Livemask needs to install a virtual camera driver. This lets you appear as your
              character in Zoom, Discord, Google Meet, and other apps.
            </p>

            {installState === 'success' ? (
              <div className="flex flex-col items-center gap-3">
                <CheckIcon />
                <p className="font-medium text-[#22C55E]">Livemask Cam installed successfully!</p>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => void handleInstall()}
                  disabled={installState === 'installing'}
                  className="flex items-center justify-center gap-2 rounded-lg bg-accent px-8 py-3 font-semibold text-white transition-colors hover:bg-accent-hover disabled:opacity-70"
                >
                  {installState === 'installing' ? (
                    <>
                      <Spinner />
                      Installing...
                    </>
                  ) : installState === 'failed' ? (
                    'Try Again'
                  ) : (
                    'Install Now'
                  )}
                </button>

                {installState === 'failed' && (
                  <p className="mt-4 text-sm text-[#EF4444]">
                    Installation failed. Please try again.
                  </p>
                )}

                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="mt-6 text-sm text-[#525252] underline transition-colors hover:text-[#A0A0A0]"
                >
                  Skip for now
                </button>
              </>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col items-center">
            <div className="mb-4">
              <CheckIcon />
            </div>
            <h2 className="mb-4 text-2xl font-bold">You&apos;re all set!</h2>
            <p className="mb-8 text-[#A0A0A0]">
              Open Zoom, Discord, or Google Meet and select &apos;OBS Virtual Camera&apos; as your
              camera. Then hit Start in Livemask.
            </p>
            <button
              type="button"
              onClick={() => void handleFinish()}
              className="rounded-lg bg-accent px-8 py-3 font-semibold text-white transition-colors hover:bg-accent-hover"
            >
              Open Livemask →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default Setup
