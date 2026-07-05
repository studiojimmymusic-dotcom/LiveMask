import { useEffect, useRef } from 'react'
import { getAspectClass, type AspectRatio } from '../lib/aspect'

interface WebcamPreviewProps {
  localStream: MediaStream | null
  error?: string | null
  aspectRatio?: AspectRatio
}

function CameraIcon(): React.JSX.Element {
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
        d="M6.827 6.175A1.724 1.724 0 0110.09 5.09l.448-.894A1 1 0 0111.314 4h1.372a1 1 0 01.776.366l.448.894a1.724 1.724 0 002.584 1.984l-1.79 1.193a1 1 0 01-.632.464l-1.966.394a1.724 1.724 0 002.584 1.984l.448.894A1 1 0 0114.686 20h-1.372a1 1 0 01-.776-.366l-.448-.894a1.724 1.724 0 00-2.584-1.984l1.79-1.193a1 1 0 01.632-.464l1.966-.394a1.724 1.724 0 001.984-2.584l-.448-.894A1 1 0 0110.09 5.09"
      />
    </svg>
  )
}

function WebcamPreview({
  localStream,
  error,
  aspectRatio = 'landscape'
}: WebcamPreviewProps): React.JSX.Element {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    video.srcObject = localStream
  }, [localStream])

  return (
    <div className="flex flex-col gap-2">
      <div
        className={`relative w-full overflow-hidden rounded-lg bg-[#1E1E1E] ${getAspectClass(aspectRatio)}`}
      >
        {localStream ? (
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-3 px-4 text-center">
            <CameraIcon />
            {error && <p className="text-sm text-[#EF4444]">{error}</p>}
          </div>
        )}
      </div>
      <span className="text-xs font-medium uppercase tracking-widest text-[#A0A0A0]">YOU</span>
    </div>
  )
}

export default WebcamPreview
