// Decide where to send a freshly-authenticated user. First-run users (who have
// never completed the Setup Wizard) go to /setup; everyone else to /studio.
// The "virtual_cam_installed" preference is set to 'true' once the wizard is
// completed, so the wizard only ever shows once.
export async function resolvePostAuthRoute(): Promise<'/studio' | '/setup'> {
  try {
    const installed = await window.api.prefs.get('virtual_cam_installed')
    return installed === 'true' ? '/studio' : '/setup'
  } catch {
    return '/studio'
  }
}
