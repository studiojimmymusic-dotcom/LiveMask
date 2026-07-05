import { execSync } from 'child_process'

// DirectShow "Video Input Device" category. OBS registers its virtual camera
// as an instance under this category; the friendly name is "OBS Virtual Camera".
const VIDEO_INPUT_CATEGORY = '{860BB310-5D01-11D0-BD3B-00A0C911CE86}'

// Known OBS Virtual Camera DirectShow filter CLSIDs across OBS versions.
const OBS_VIRTUALCAM_CLSIDS = [
  '{A3FCE0F5-3493-419F-958A-ABA1250EC20B}', // current OBS
  '{A3FCE0F5-3493-419F-958A-ABA1565348D0}' // older spec value
]

const REGISTRY_ROOTS = ['HKLM', 'HKCU']
const CLASS_PATHS = ['SOFTWARE\\Classes\\CLSID', 'SOFTWARE\\WOW6432Node\\Classes\\CLSID']

function regKeyExists(fullKey: string): boolean {
  try {
    execSync(`reg query "${fullKey}" /ve`, { stdio: 'pipe' })
    return true
  } catch {
    return false
  }
}

// Check the Windows registry for the OBS VirtualCam DirectShow filter.
// OBS's CLSID has changed between versions, so we (1) scan the video input
// device category for an "OBS Virtual Camera" instance, then (2) fall back to
// checking the known CLSIDs directly across HKLM/HKCU and 32/64-bit hives.
export function isOBSVirtualCamInstalled(): boolean {
  for (const root of REGISTRY_ROOTS) {
    for (const classPath of CLASS_PATHS) {
      try {
        const out = execSync(
          `reg query "${root}\\${classPath}\\${VIDEO_INPUT_CATEGORY}\\Instance" /s /f "OBS Virtual Camera"`,
          { stdio: 'pipe' }
        ).toString()
        if (out.toLowerCase().includes('obs virtual camera')) return true
      } catch {
        /* category/instance not present in this hive — keep looking */
      }
    }
  }

  for (const root of REGISTRY_ROOTS) {
    for (const classPath of CLASS_PATHS) {
      for (const clsid of OBS_VIRTUALCAM_CLSIDS) {
        if (regKeyExists(`${root}\\${classPath}\\${clsid}`)) return true
      }
    }
  }

  return false
}
