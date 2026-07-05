import { useEffect } from 'react'
import type { Dimensions } from '../lib/aspect'

const FRAME_INTERVAL_MS = 1000 / 30

/** Cover-draw source video into the target canvas (object-cover behavior). */
function drawCover(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  targetWidth: number,
  targetHeight: number
): void {
  const sourceWidth = video.videoWidth
  const sourceHeight = video.videoHeight
  if (sourceWidth <= 0 || sourceHeight <= 0) return

  const sourceAspect = sourceWidth / sourceHeight
  const targetAspect = targetWidth / targetHeight

  let sx = 0
  let sy = 0
  let sw = sourceWidth
  let sh = sourceHeight

  if (sourceAspect > targetAspect) {
    sw = sourceHeight * targetAspect
    sx = (sourceWidth - sw) / 2
  } else if (sourceAspect < targetAspect) {
    sh = sourceWidth / targetAspect
    sy = (sourceHeight - sh) / 2
  }

  ctx.drawImage(video, sx, sy, sw, sh, 0, 0, targetWidth, targetHeight)
}

// Pulls frames from the Decart remote stream and pipes RGB to the virtual
// camera sidecar via IPC. OBS Virtual Camera on Windows only accepts RGB.
// Uses setInterval (NOT requestAnimationFrame) because rAF is throttled/paused
// when the window is minimized — which would freeze the virtual camera mid call.
export function useFrameExtractor(
  remoteStream: MediaStream | null,
  isActive: boolean,
  outputDimensions: Dimensions
): void {
  const { width: frameWidth, height: frameHeight } = outputDimensions

  useEffect(() => {
    if (!isActive || !remoteStream) return

    const video = document.createElement('video')
    video.muted = true
    video.playsInline = true
    video.srcObject = remoteStream
    void video.play().catch(() => {
      /* autoplay can reject; the interval simply skips until frames arrive */
    })

    const canvas = document.createElement('canvas')
    canvas.width = frameWidth
    canvas.height = frameHeight
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    const rgbBytes = frameWidth * frameHeight * 3
    const rgbBuffer = new Uint8Array(rgbBytes)

    const interval = window.setInterval(() => {
      if (!ctx || video.readyState < 2) return
      try {
        drawCover(ctx, video, frameWidth, frameHeight)
        const rgba = ctx.getImageData(0, 0, frameWidth, frameHeight).data

        // Canvas gives RGBA; OBS virtual cam expects RGB — drop the alpha channel.
        for (let i = 0, j = 0; i < rgba.length; i += 4, j += 3) {
          rgbBuffer[j] = rgba[i]
          rgbBuffer[j + 1] = rgba[i + 1]
          rgbBuffer[j + 2] = rgba[i + 2]
        }

        window.api.sendFrame(rgbBuffer.buffer)
      } catch {
        /* drawImage/getImageData can briefly fail between frames — skip */
      }
    }, FRAME_INTERVAL_MS)

    return () => {
      window.clearInterval(interval)
      video.pause()
      video.srcObject = null
    }
  }, [remoteStream, isActive, frameWidth, frameHeight])
}
