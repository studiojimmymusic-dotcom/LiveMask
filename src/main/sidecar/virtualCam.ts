import { spawn, ChildProcess } from 'child_process'
import path from 'path'
import { app } from 'electron'

let sidecarProcess: ChildProcess | null = null
let sidecarReady = false
let stoppingIntentionally = false

type ExitListener = (code: number | null) => void
let exitListener: ExitListener | null = null

// Allow the renderer (via IPC) to learn when the sidecar dies unexpectedly.
export function onSidecarExit(listener: ExitListener | null): void {
  exitListener = listener
}

export function startVirtualCamSidecar(width: number, height: number, fps = 30): void {
  // Avoid spawning a second sidecar if one is already running.
  if (sidecarProcess) return

  const sidecarScript = app.isPackaged
    ? path.join(process.resourcesPath, 'sidecar', 'virtualcam.exe') // PyInstaller binary
    : path.join(__dirname, '../../sidecar/virtualcam.py') // dev: run as Python

  const cmd = app.isPackaged ? sidecarScript : 'python'
  const dimArgs = [String(width), String(height), String(fps)]
  const args = app.isPackaged ? dimArgs : [sidecarScript, ...dimArgs]

  stoppingIntentionally = false
  sidecarReady = false
  sidecarProcess = spawn(cmd, args, { stdio: ['pipe', 'pipe', 'pipe'] })

  // The Python sidecar prints "Virtual camera started" to stderr once the
  // virtual camera is open. Only then is it safe to pipe frames into stdin.
  sidecarProcess.stderr?.on('data', (d) => {
    const text = d.toString()
    console.log('[sidecar]', text.trim())
    if (text.includes('Virtual camera started')) sidecarReady = true
  })

  // Without an error handler on stdin, a write to a closed pipe ("write EOF")
  // becomes an uncaught exception that crashes the whole main process.
  sidecarProcess.stdin?.on('error', (err) => {
    console.error('[sidecar] stdin error:', err.message)
    sidecarReady = false
  })

  sidecarProcess.on('exit', (code) => {
    console.log('[sidecar] exited', code)
    sidecarReady = false
    sidecarProcess = null
    if (!stoppingIntentionally) exitListener?.(code)
    stoppingIntentionally = false
  })

  sidecarProcess.on('error', (err) => {
    // e.g. Python not installed / not on PATH.
    console.error('[sidecar] failed to spawn:', err.message)
    sidecarReady = false
    sidecarProcess = null
    exitListener?.(null)
  })
}

export function sendFrameToSidecar(rgbaBuffer: ArrayBuffer): void {
  // Silently skip unless the sidecar has confirmed it's ready and the pipe is
  // still open. Pass an error callback so a mid-write pipe close can never throw.
  const stdin = sidecarProcess?.stdin
  if (!sidecarReady || !stdin || !stdin.writable) return
  try {
    stdin.write(Buffer.from(rgbaBuffer), (err) => {
      if (err) sidecarReady = false
    })
  } catch {
    sidecarReady = false
  }
}

export function stopVirtualCamSidecar(): void {
  stoppingIntentionally = true
  sidecarReady = false
  const proc = sidecarProcess
  sidecarProcess = null
  if (!proc) return
  try {
    proc.stdin?.end()
  } catch {
    /* pipe may already be closed */
  }
  proc.kill()
}
