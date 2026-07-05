import { useEffect, useRef } from 'react'
import { getAspectClass, type AspectRatio } from '../lib/aspect'
import type { SessionState } from '../types/session'

interface TransformPreviewProps {
  remoteStream: MediaStream | null
  state: SessionState
  aspectRatio?: AspectRatio
}

function WandIcon(): React.JSX.Element {
  return (
    <svg
      className="h-10 w-10 text-[#525252]"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"
      />
    </svg>
  )
}

function TransformPreview({
  remoteStream,
  state,
  aspectRatio = 'landscape'
}: TransformPreviewProps): React.JSX.Element {
  const videoRef = useRef<HTMLVideoElement>(null)
  const isConnecting = state === 'connecting' || state === 'fetching_token'
  const isLive = state === 'generating'

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    video.srcObject = remoteStream
  }, [remoteStream])

  return (
    <div className="flex flex-col gap-2">
      <div
        className={`relative w-full overflow-hidden rounded-lg border bg-[#1E1E1E] ${getAspectClass(aspectRatio)} ${
          isConnecting ? 'animate-pulse-border border-accent' : 'border-transparent'
        }`}
      >
        {remoteStream ? (
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <WandIcon />
          </div>
        )}

        {isLive && (
          <div className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1">
            <span className="h-2 w-2 animate-pulse rounded-full bg-[#22C55E]" />
            <span className="text-xs font-semibold uppercase tracking-wide text-white">Live</span>
          </div>
        )}
      </div>
      <span className="text-xs font-medium uppercase tracking-widest text-[#A0A0A0]">
        AS CHARACTER
      </span>
    </div>
  )
}

export default TransformPreview
