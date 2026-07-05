import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

interface CachedCharacter {
  id: string
  name: string
  prompt: string
  thumbnail_path?: string | null
  storage_path?: string | null
}

type VirtualCamStatus = 'idle' | 'active' | 'error'

// Custom APIs for renderer
const api = {
  cacheSetCharacters: (characters: CachedCharacter[]): Promise<{ ok: boolean }> =>
    ipcRenderer.invoke('characters:cacheSet', characters),
  cacheGetCharacters: (): Promise<CachedCharacter[]> => ipcRenderer.invoke('characters:cacheGet'),

  prefs: {
    get: (key: string): Promise<string | null> => ipcRenderer.invoke('prefs:get', key),
    set: (key: string, value: string): Promise<{ ok: boolean }> =>
      ipcRenderer.invoke('prefs:set', key, value)
  },

  virtualcam: {
    check: (): Promise<boolean> => ipcRenderer.invoke('virtualcam:check'),
    start: (width: number, height: number): Promise<{ ok: boolean }> =>
      ipcRenderer.invoke('virtualcam:start', width, height),
    stop: (): Promise<{ ok: boolean }> => ipcRenderer.invoke('virtualcam:stop'),
    install: (): Promise<{ ok: boolean }> => ipcRenderer.invoke('virtualcam:install')
  },

  app: {
    getVersion: (): Promise<string> => ipcRenderer.invoke('app:getVersion'),
    checkForUpdates: (): Promise<{ updateAvailable: boolean; message: string }> =>
      ipcRenderer.invoke('app:checkForUpdates')
  },

  openExternal: (url: string): Promise<{ ok: boolean }> =>
    ipcRenderer.invoke('shell:openExternal', url),

  sendFrame: (buffer: ArrayBuffer): void => ipcRenderer.send('frame:send', buffer),

  // Fires when the sidecar exits (e.g. crash → 'error'). Returns an unsubscribe fn.
  onVirtualCamStatus: (callback: (status: VirtualCamStatus) => void): (() => void) => {
    const listener = (_event: unknown, status: VirtualCamStatus): void => callback(status)
    ipcRenderer.on('virtualcam:status', listener)
    return () => ipcRenderer.removeListener('virtualcam:status', listener)
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
