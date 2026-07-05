export type AspectRatio = 'landscape' | 'portrait'

export type OutputResolution = '720p' | '480p'

export interface Dimensions {
  width: number
  height: number
}

const LANDSCAPE_720: Dimensions = { width: 1280, height: 720 }
const LANDSCAPE_480: Dimensions = { width: 640, height: 480 }
const PORTRAIT_720: Dimensions = { width: 720, height: 1280 }
const PORTRAIT_480: Dimensions = { width: 480, height: 640 }

/** Webcam getUserMedia target dimensions (portrait swaps width/height). */
export function getCaptureDimensions(
  ratio: AspectRatio,
  resolution: OutputResolution = '720p'
): Dimensions {
  if (ratio === 'portrait') {
    return resolution === '480p' ? PORTRAIT_480 : PORTRAIT_720
  }
  return resolution === '480p' ? LANDSCAPE_480 : LANDSCAPE_720
}

/** Virtual-cam + frame-extractor output dimensions. */
export function getOutputDimensions(ratio: AspectRatio): Dimensions {
  return ratio === 'portrait' ? PORTRAIT_720 : LANDSCAPE_720
}

export function getAspectClass(ratio: AspectRatio): 'aspect-video' | 'aspect-[9/16]' {
  return ratio === 'portrait' ? 'aspect-[9/16]' : 'aspect-video'
}

export function parseAspectRatio(value: string | null | undefined): AspectRatio {
  return value === 'portrait' ? 'portrait' : 'landscape'
}
