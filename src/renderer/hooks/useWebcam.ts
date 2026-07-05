import { useEffect, useState } from 'react'
import {
  getCaptureDimensions,
  parseAspectRatio,
  type AspectRatio,
  type OutputResolution
} from '../lib/aspect'

interface UseWebcamReturn {
  localStream: MediaStream | null
  error: string | null
  devices: MediaDeviceInfo[]
}

export function useWebcam(aspectRatio: AspectRatio): UseWebcamReturn {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])

  useEffect(() => {
    let stream: MediaStream | null = null
    let cancelled = false

    async function startCamera(): Promise<void> {
      try {
        const savedDeviceId = await window.api.prefs.get('webcam_device_id')
        const savedResolution = await window.api.prefs.get('output_resolution')
        const resolution: OutputResolution = savedResolution === '480p' ? '480p' : '720p'
        const { width, height } = getCaptureDimensions(aspectRatio, resolution)

        const videoConstraints: MediaTrackConstraints = {
          frameRate: { ideal: 30 },
          width: { ideal: width },
          height: { ideal: height },
          facingMode: 'user',
          ...(savedDeviceId ? { deviceId: { exact: savedDeviceId } } : {})
        }

        stream = await navigator.mediaDevices.getUserMedia({
          video: videoConstraints,
          audio: false
        })

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }

        setLocalStream(stream)
        setError(null)

        const allDevices = await navigator.mediaDevices.enumerateDevices()
        if (!cancelled) {
          setDevices(allDevices.filter((device) => device.kind === 'videoinput'))
        }
      } catch (err) {
        if (cancelled) return

        const domError = err as DOMException
        if (domError.name === 'NotAllowedError' || domError.name === 'PermissionDeniedError') {
          setError(
            'Livemask needs access to your camera. Allow camera access in your system settings, then restart the app.'
          )
        } else if (domError.name === 'NotFoundError') {
          setError('No camera found. Connect a webcam and restart the app.')
        } else {
          setError('Could not access your camera. Check your webcam connection and try again.')
        }
      }
    }

    setLocalStream((prev) => {
      prev?.getTracks().forEach((track) => track.stop())
      return null
    })

    void startCamera()

    return () => {
      cancelled = true
      stream?.getTracks().forEach((track) => track.stop())
    }
  }, [aspectRatio])

  return { localStream, error, devices }
}

/** Load saved aspect ratio from prefs into the store on app boot. */
export async function loadAspectRatioPref(): Promise<AspectRatio> {
  const saved = await window.api.prefs.get('output_aspect_ratio')
  return parseAspectRatio(saved)
}
