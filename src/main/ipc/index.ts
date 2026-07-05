import { ipcMain, BrowserWindow, shell, app } from 'electron'
import {
  getCachedCharacters,
  setCachedCharacters,
  getPreference,
  setPreference,
  type Character
} from '../db/local'
import { isOBSVirtualCamInstalled } from './cameraHandler'
import {
  startVirtualCamSidecar,
  stopVirtualCamSidecar,
  sendFrameToSidecar,
  onSidecarExit
} from '../sidecar/virtualCam'

export function registerIpcHandlers(): void {
  ipcMain.handle('characters:cacheSet', (_event, characters: Character[]) => {
    try {
      setCachedCharacters(characters ?? [])
      return { ok: true }
    } catch (error) {
      console.error('[ipc] characters:cacheSet failed', error)
      return { ok: false }
    }
  })

  ipcMain.handle('characters:cacheGet', () => {
    try {
      return getCachedCharacters()
    } catch (error) {
      console.error('[ipc] characters:cacheGet failed', error)
      return []
    }
  })

  // --- Preferences (local SQLite) -----------------------------------------

  ipcMain.handle('prefs:set', (_event, key: string, value: string) => {
    try {
      setPreference(key, String(value))
      return { ok: true }
    } catch (error) {
      console.error('[ipc] prefs:set failed', error)
      return { ok: false }
    }
  })

  ipcMain.handle('prefs:get', (_event, key: string) => {
    try {
      return getPreference(key)
    } catch (error) {
      console.error('[ipc] prefs:get failed', error)
      return null
    }
  })

  // --- Virtual camera ------------------------------------------------------

  ipcMain.handle('virtualcam:check', () => isOBSVirtualCamInstalled())

  ipcMain.handle('virtualcam:start', (_event, width: number, height: number) => {
    const w = typeof width === 'number' && width > 0 ? width : 1280
    const h = typeof height === 'number' && height > 0 ? height : 720
    startVirtualCamSidecar(w, h)
    return { ok: true }
  })

  ipcMain.handle('virtualcam:stop', () => {
    stopVirtualCamSidecar()
    return { ok: true }
  })

  // We don't bundle an OBS installer, so "reinstall" sends the user to the
  // official OBS download page (which provides the virtual camera driver).
  ipcMain.handle('virtualcam:install', async () => {
    await shell.openExternal('https://obsproject.com/download')
    return { ok: true }
  })

  // Hot path: called ~30x/sec. Keep this as lightweight as possible — no logging.
  ipcMain.on('frame:send', (_event, rgbaBuffer: ArrayBuffer) => {
    sendFrameToSidecar(rgbaBuffer)
  })

  // --- App / shell ---------------------------------------------------------

  ipcMain.handle('app:getVersion', () => app.getVersion())

  // Real auto-update requires electron-updater + a configured feed URL and a
  // signed, packaged build. In dev there's nothing to check against, so we
  // report "up to date" instead of throwing.
  ipcMain.handle('app:checkForUpdates', async () => {
    return { updateAvailable: false, message: "You're on the latest version." }
  })

  ipcMain.handle('shell:openExternal', async (_event, url: string) => {
    if (typeof url === 'string' && /^https?:\/\//.test(url)) {
      await shell.openExternal(url)
      return { ok: true }
    }
    return { ok: false }
  })

  // Notify the renderer if the sidecar dies unexpectedly so it can flag an error.
  onSidecarExit((code) => {
    const win = BrowserWindow.getAllWindows()[0]
    win?.webContents.send('virtualcam:status', code === 0 ? 'idle' : 'error')
  })
}
