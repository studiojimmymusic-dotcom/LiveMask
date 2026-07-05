import { ElectronAPI } from '@electron-toolkit/preload'

interface CachedCharacter {
  id: string
  name: string
  prompt: string
  thumbnail_path?: string | null
  storage_path?: string | null
}

type VirtualCamStatus = 'idle' | 'active' | 'error'

interface LivemaskApi {
  cacheSetCharacters: (characters: CachedCharacter[]) => Promise<{ ok: boolean }>
  cacheGetCharacters: () => Promise<CachedCharacter[]>
  prefs: {
    get: (key: string) => Promise<string | null>
    set: (key: string, value: string) => Promise<{ ok: boolean }>
  }
  virtualcam: {
    check: () => Promise<boolean>
    start: (width: number, height: number) => Promise<{ ok: boolean }>
    stop: () => Promise<{ ok: boolean }>
    install: () => Promise<{ ok: boolean }>
  }
  app: {
    getVersion: () => Promise<string>
    checkForUpdates: () => Promise<{ updateAvailable: boolean; message: string }>
  }
  openExternal: (url: string) => Promise<{ ok: boolean }>
  sendFrame: (buffer: ArrayBuffer) => void
  onVirtualCamStatus: (callback: (status: VirtualCamStatus) => void) => () => void
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: LivemaskApi
  }
}
