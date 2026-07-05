# Livemask — Cursor PRD
### AI Real-Time Character Transformation Desktop App for Windows
**Stack:** Electron + React + TypeScript + Supabase + Hono (Railway) + Decart Lucy 2.1

---

## PROJECT OVERVIEW

Livemask is a Windows desktop application that transforms a user's live webcam feed into any uploaded character in real time using the Decart Lucy 2.1 AI model. The transformed video is piped into a virtual camera driver ("Livemask Cam") that appears as a webcam input to Zoom, Discord, Google Meet, Microsoft Teams, OBS, Twitch, and WhatsApp Web.

Users upload a reference image of any character, select it from their saved library, click Start, and instantly become that character on any video call or stream.

**This is not a face swap. It is a full identity transformation** — face, skin, hair, head shape, and visible upper body are all remapped to the reference character while the user's motion and expressions are preserved.

---

## TECH STACK

### Desktop App
- **Framework:** Electron (latest) via `electron-vite` scaffold
- **Renderer:** React 18 + TypeScript + Tailwind CSS
- **State management:** Zustand
- **AI SDK:** `@decartai/sdk` (JavaScript, runs in renderer)
- **Local database:** `better-sqlite3` (in main process)
- **Packaging:** `electron-builder` → produces `.exe` NSIS installer
- **Auto-updates:** `electron-updater` via GitHub releases

### Backend (Railway)
- **Runtime:** Node.js
- **Framework:** Hono
- **Purpose:** Mint Decart ephemeral client tokens, validate Paystack subscriptions
- **Environment variables:** `DECART_API_KEY`, `SUPABASE_SERVICE_KEY`, `PAYSTACK_SECRET_KEY`, `PAYSTACK_PLAN_PRO`, `PAYSTACK_PLAN_POWER`

### Database & Auth
- **Platform:** Supabase
- **Auth:** Supabase Auth (email + password)
- **Database:** Supabase Postgres
- **Storage:** Supabase Storage bucket `characters` (reference images)

### Virtual Camera
- **Driver:** OBS VirtualCam (bundled minimal installer, `obs-virtualcam-installer.exe`)
- **Frame pipe:** Python sidecar using `pyvirtualcam` (compiled to `.exe` via PyInstaller, bundled with app)
- **IPC:** Electron main process → Python sidecar via stdin (raw RGBA frame bytes)

### AI
- **Provider:** Decart
- **Model:** Lucy 2.1
- **Protocol:** WebRTC (handled by Decart SDK in renderer)
- **Billing:** $0.02/second of active generation at 720p

### Payments
- **Provider:** Paystack
- **Plans:** Free trial (10 min total), Pro ($39/month, 60 active min), Power ($79/month, 200 active min)
- **Overage:** $0.05/minute billed at end of billing period

---

## REPOSITORY STRUCTURE

```
livemask/
├── src/
│   ├── main/                          # Electron main process (Node.js)
│   │   ├── index.ts                   # App entry, BrowserWindow creation
│   │   ├── ipc/
│   │   │   ├── frameHandler.ts        # Receives frames from renderer, pipes to Python sidecar
│   │   │   ├── cameraHandler.ts       # Virtual cam driver detection, install, start/stop
│   │   │   └── authHandler.ts         # Token fetch from backend, stored in keychain
│   │   ├── sidecar/
│   │   │   └── virtualCam.ts          # Spawns Python sidecar process, manages lifecycle
│   │   ├── db/
│   │   │   └── local.ts               # better-sqlite3 setup, character cache, prefs
│   │   └── updater.ts                 # electron-updater auto-update logic
│   │
│   ├── renderer/                      # React app (runs in Chromium)
│   │   ├── main.tsx                   # React root
│   │   ├── App.tsx                    # Router + global providers
│   │   ├── pages/
│   │   │   ├── Login.tsx              # Supabase auth UI
│   │   │   ├── Signup.tsx
│   │   │   ├── Studio.tsx             # Main app screen (webcam + transform)
│   │   │   ├── Characters.tsx         # Character library management
│   │   │   ├── Settings.tsx           # Webcam selector, output res, account
│   │   │   └── Setup.tsx              # First-run virtual camera driver install wizard
│   │   ├── components/
│   │   │   ├── WebcamPreview.tsx      # Raw webcam feed display
│   │   │   ├── TransformPreview.tsx   # Decart output stream display
│   │   │   ├── CharacterCard.tsx      # Single character in library grid
│   │   │   ├── CharacterUpload.tsx    # Upload modal (file picker + name + prompt)
│   │   │   ├── SessionControls.tsx    # Start/Stop button + session timer + cost display
│   │   │   ├── StatusBar.tsx          # Connection state indicator
│   │   │   └── SetupWizard.tsx        # Driver install UI component
│   │   ├── hooks/
│   │   │   ├── useDecartSession.ts    # Full Decart session lifecycle management
│   │   │   ├── useWebcam.ts           # getUserMedia, device enumeration
│   │   │   ├── useFrameExtractor.ts   # Canvas frame extraction from remote stream
│   │   │   ├── useCharacters.ts       # Character CRUD (Supabase + local cache)
│   │   │   └── useSession.ts          # Session timer, cost calculation
│   │   ├── store/
│   │   │   └── appStore.ts            # Zustand global state
│   │   └── lib/
│   │       ├── supabase.ts            # Supabase client init
│   │       └── api.ts                 # Backend API calls (token fetch, subscription check)
│   │
│   └── preload/
│       └── index.ts                   # contextBridge — exposes IPC to renderer safely
│
├── backend/                           # Hono API (deployed to Railway)
│   ├── src/
│   │   └── index.ts                   # All routes in one file
│   └── package.json
│
├── sidecar/                           # Python virtual camera bridge
│   ├── virtualcam.py                  # pyvirtualcam loop — reads stdin frames, sends to OBS VCam
│   └── build.sh                       # PyInstaller build command
│
├── resources/
│   └── obs-virtualcam-installer.exe   # Bundled OBS VirtualCam driver installer
│
├── electron.vite.config.ts
├── electron-builder.yml
└── package.json
```

---

## DESIGN SYSTEM

Livemask is bold, creator-forward, and streamer-coded. The UI is dark and gets out of the way — the orange accent is the only color that speaks.

### Color Tokens

```
--color-bg:             #0A0A0A   /* app background, near black */
--color-surface:        #141414   /* cards, panels, modals */
--color-surface-raised: #1E1E1E   /* hover states, dropdowns, tooltips */
--color-border:         #2A2A2A   /* all borders and dividers */
--color-accent:         #FF6B00   /* primary buttons, active states, LIVE indicator */
--color-accent-hover:   #FF8C00   /* button hover */
--color-accent-glow:    #FF6B0033 /* box-shadow glow on active/focused elements */
--color-text-primary:   #FFFFFF
--color-text-secondary: #A0A0A0
--color-text-muted:     #525252
--color-success:        #22C55E
--color-error:          #EF4444
--color-warning:        #F59E0B
```

### Typography

```
UI font:       Inter (import from Google Fonts)
Mono font:     JetBrains Mono (timers, cost display, session counters)
```

### Rules Cursor must follow

- Background is always `#0A0A0A`. Never white. Never grey.
- Cards and panels use `#141414` with a `1px solid #2A2A2A` border.
- The ONLY accent color is `#FF6B00`. No blue, no purple, no green except success states.
- Primary buttons: `bg-[#FF6B00]` text white, hover `bg-[#FF8C00]`, active scale down slightly.
- Active character card: `2px solid #FF6B00` border + `box-shadow: 0 0 12px #FF6B0033`.
- LIVE indicator: pulsing orange dot `#FF6B00` with a CSS keyframe animation.
- Session timer and cost display: JetBrains Mono font, `#FF6B00` color.
- All other text: white (`#FFFFFF`) or secondary (`#A0A0A0`).
- No gradients. No illustrations. No decorative elements. Clean, dark, functional.
- Tailwind custom colors must be defined in `tailwind.config.js` under `theme.extend.colors`:

```js
colors: {
  accent: '#FF6B00',
  'accent-hover': '#FF8C00',
  surface: '#141414',
  'surface-raised': '#1E1E1E',
  border: '#2A2A2A',
}
```

---

## DATABASE SCHEMA

### Supabase Postgres

```sql
-- Users are managed by Supabase Auth (auth.users)
-- All tables reference auth.users.id as user_id

create table public.profiles (
  id uuid references auth.users(id) primary key,
  email text not null,
  paystack_customer_code text,
  subscription_status text default 'free', -- 'free' | 'pro' | 'power' | 'cancelled'
  subscription_plan text,                  -- 'pro' | 'power' | null
  active_minutes_used integer default 0,   -- resets monthly
  trial_seconds_used integer default 0,    -- counts up, max 600 (10 min)
  billing_period_start timestamptz,
  created_at timestamptz default now()
);

create table public.characters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  storage_path text not null,             -- Supabase Storage path: userId/characterId.jpg
  prompt text not null,                   -- Lucy 2.1 transformation prompt
  thumbnail_url text,                     -- Public URL from Supabase Storage
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Row-level security
alter table public.profiles enable row level security;
alter table public.characters enable row level security;

create policy "Users can read own profile" on public.profiles
  for select using (auth.uid() = id);

create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

create policy "Users can CRUD own characters" on public.characters
  for all using (auth.uid() = user_id);
```

### Local SQLite (better-sqlite3, in Electron main process)

```sql
-- Mirrors Supabase characters for offline/fast access
create table if not exists characters (
  id text primary key,
  name text not null,
  prompt text not null,
  thumbnail_path text,     -- local file path to cached thumbnail
  storage_path text,
  synced_at integer        -- unix timestamp
);

create table if not exists preferences (
  key text primary key,
  value text
);
-- Keys: webcam_device_id, output_resolution, active_character_id,
--       virtual_cam_installed, last_token_fetch
```

---

## SUPABASE STORAGE

- Bucket name: `characters`
- Bucket policy: private (access via signed URLs only)
- File path pattern: `{user_id}/{character_id}.jpg`
- Max file size: 5MB per image
- Accepted types: `image/jpeg`, `image/png`, `image/webp`
- On upload: resize/convert to JPEG max 1024x1024 client-side before upload (use `browser-image-compression` npm package)

---

## BACKEND API (Hono on Railway)

### `POST /api/token`
Mints a Decart ephemeral client token for an authenticated user.

**Request:**
```json
{ "supabase_access_token": "eyJ..." }
```

**Logic:**
1. Verify Supabase JWT using `SUPABASE_JWT_SECRET`
2. Look up user in `profiles` table
3. Check `subscription_status` — if `free` and `trial_seconds_used >= 600`, return `{ error: "trial_expired" }`
4. Call Decart API: `POST https://api.decart.ai/v1/client/tokens` with header `X-API-KEY: <DECART_API_KEY>` and body `{ expiresIn: 300, allowedModels: ["lucy-2.1"] }`
5. Return `{ apiKey: "ek_...", expiresAt: "..." }`

**Response:**
```json
{ "apiKey": "ek_abc123", "expiresAt": "2026-06-25T20:00:00Z" }
```

### `POST /api/webhooks/paystack`
Handles Paystack subscription lifecycle events. Verify the `x-paystack-signature` header (HMAC SHA512 of the raw body, keyed with `PAYSTACK_SECRET_KEY`) before processing.

**Events handled:**
- `subscription.create` → set `subscription_status = plan`, set `billing_period_start`
- `subscription.disable` / `subscription.not_renew` → set `subscription_status = 'cancelled'`
- `charge.success` / `invoice.update` (paid) → reset `active_minutes_used = 0` (new billing period)

### `POST /api/create-checkout`
Initializes a Paystack transaction for a plan upgrade and returns the hosted checkout URL.

**Request:**
```json
{ "supabase_access_token": "eyJ...", "plan": "pro" }
```

**Response:**
```json
{ "url": "https://checkout.paystack.com/..." }
```

---

## ELECTRON IPC CHANNELS

All IPC is bridged through `preload/index.ts` using `contextBridge`. The renderer never accesses Node.js directly.

### Renderer → Main

| Channel | Payload | Description |
|---------|---------|-------------|
| `frame:send` | `ArrayBuffer` (RGBA, 1280×720) | Send extracted frame to virtual cam pipe |
| `virtualcam:start` | — | Start the Python sidecar + virtual cam |
| `virtualcam:stop` | — | Stop the Python sidecar |
| `virtualcam:check` | — | Check if OBS VirtualCam driver is installed |
| `virtualcam:install` | — | Run bundled OBS VirtualCam installer (triggers UAC) |
| `auth:getToken` | — | Fetch Decart token from backend (main process holds Supabase session) |
| `prefs:get` | `key: string` | Read from local SQLite preferences |
| `prefs:set` | `{ key, value }` | Write to local SQLite preferences |
| `characters:cacheSet` | `Character[]` | Write characters to local SQLite cache |
| `characters:cacheGet` | — | Read characters from local SQLite cache |

### Main → Renderer

| Channel | Payload | Description |
|---------|---------|-------------|
| `virtualcam:status` | `'ready' \| 'error' \| 'not_installed'` | Virtual cam state update |
| `update:available` | `{ version: string }` | New app version available |
| `update:downloaded` | — | Update ready to install on restart |

---

## CORE HOOK: `useDecartSession.ts`

This is the most important piece of code in the app. It owns the entire Decart session lifecycle.

```typescript
// src/renderer/hooks/useDecartSession.ts

type SessionState =
  | 'idle'
  | 'fetching_token'
  | 'connecting'
  | 'connected'
  | 'generating'
  | 'reconnecting'
  | 'disconnected'
  | 'error';

interface UseDecartSessionReturn {
  state: SessionState;
  remoteStream: MediaStream | null;
  startSession: (character: Character) => Promise<void>;
  stopSession: () => void;
  switchCharacter: (character: Character) => Promise<void>;
  error: string | null;
}

export function useDecartSession(localStream: MediaStream | null): UseDecartSessionReturn {
  // 1. Fetch ephemeral token from your backend (/api/token)
  // 2. Init Decart client with ephemeral token
  // 3. Call client.realtime.connect({ model: 'lucy-2.1', stream: localStream })
  // 4. Set initial character: client.realtime.set({ prompt, image: characterImageFile })
  // 5. Listen to onRemoteStream → store in state
  // 6. Listen to onStateChange → map to SessionState
  // 7. On 'reconnecting': pass raw localStream to virtual cam as fallback
  // 8. On stopSession: call client.realtime.disconnect()
  // 9. switchCharacter: call client.realtime.set({ prompt, image }) — NO reconnect needed
}
```

**Session state transitions:**
```
idle → [startSession()] → fetching_token
fetching_token → [token ok] → connecting
fetching_token → [error] → error
connecting → [WebRTC up] → connected
connected → [first transformed frame] → generating
generating → [network drop] → reconnecting
reconnecting → [success] → generating
reconnecting → [all retries fail] → disconnected
generating → [stopSession()] → idle
disconnected → [user retries] → fetching_token
```

---

## CORE HOOK: `useFrameExtractor.ts`

Extracts raw RGBA frames from the Decart remote stream and sends them to the virtual camera via IPC.

```typescript
// src/renderer/hooks/useFrameExtractor.ts

export function useFrameExtractor(
  remoteStream: MediaStream | null,
  isVirtualCamActive: boolean
) {
  // 1. Create hidden <video> element, set srcObject = remoteStream
  // 2. Create offscreen <canvas> 1280x720
  // 3. On each requestAnimationFrame:
  //    a. ctx.drawImage(videoEl, 0, 0, 1280, 720)
  //    b. const imageData = ctx.getImageData(0, 0, 1280, 720)
  //    c. window.electronAPI.sendFrame(imageData.data.buffer)
  // 4. Only run loop when isVirtualCamActive === true
  // 5. Use setInterval(fn, 1000/30) as fallback if rAF is throttled when window unfocused
  //    — IMPORTANT: rAF pauses when window is minimized. Use setInterval for virtual cam.
}
```

---

## VIRTUAL CAMERA PIPELINE

### Python Sidecar (`sidecar/virtualcam.py`)

```python
import sys
import pyvirtualcam
import numpy as np

FRAME_WIDTH = 1280
FRAME_HEIGHT = 720
FPS = 30
FRAME_BYTES = FRAME_WIDTH * FRAME_HEIGHT * 4  # RGBA

def main():
    with pyvirtualcam.Camera(
        width=FRAME_WIDTH,
        height=FRAME_HEIGHT,
        fps=FPS,
        device='OBS Virtual Camera',
        fmt=pyvirtualcam.PixelFormat.RGBA
    ) as cam:
        sys.stderr.write(f'Virtual camera started: {cam.device}\n')
        sys.stderr.flush()

        while True:
            raw = sys.stdin.buffer.read(FRAME_BYTES)
            if len(raw) < FRAME_BYTES:
                break  # stdin closed = Electron shut down the sidecar
            frame = np.frombuffer(raw, dtype=np.uint8).reshape((FRAME_HEIGHT, FRAME_WIDTH, 4))
            cam.send(frame)
            cam.sleep_until_next_frame()

if __name__ == '__main__':
    main()
```

### Sidecar Manager (`src/main/sidecar/virtualCam.ts`)

```typescript
import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import { app } from 'electron';

let sidecarProcess: ChildProcess | null = null;

export function startVirtualCamSidecar(): void {
  const sidecarPath = app.isPackaged
    ? path.join(process.resourcesPath, 'sidecar', 'virtualcam.exe')  // PyInstaller binary
    : path.join(__dirname, '../../sidecar/virtualcam.py');            // dev: run as Python

  const args = app.isPackaged ? [] : ['sidecar/virtualcam.py'];
  const cmd = app.isPackaged ? sidecarPath : 'python3';

  sidecarProcess = spawn(cmd, args, { stdio: ['pipe', 'pipe', 'pipe'] });

  sidecarProcess.stderr?.on('data', (d) => console.log('[sidecar]', d.toString()));
  sidecarProcess.on('exit', (code) => console.log('[sidecar] exited', code));
}

export function sendFrameToSidecar(rgbaBuffer: ArrayBuffer): void {
  if (!sidecarProcess?.stdin?.writable) return;
  sidecarProcess.stdin.write(Buffer.from(rgbaBuffer));
}

export function stopVirtualCamSidecar(): void {
  sidecarProcess?.stdin?.end();
  sidecarProcess?.kill();
  sidecarProcess = null;
}
```

---

## VIRTUAL CAMERA DRIVER DETECTION

```typescript
// src/main/ipc/cameraHandler.ts
import { execSync } from 'child_process';

export function isOBSVirtualCamInstalled(): boolean {
  try {
    // Check Windows registry for OBS VirtualCam DirectShow filter
    execSync(
      'reg query "HKLM\\SOFTWARE\\Classes\\CLSID\\{A3FCE0F5-3493-419F-958A-ABA1565348D0}" /ve',
      { stdio: 'pipe' }
    );
    return true;
  } catch {
    return false;
  }
}

export function installOBSVirtualCam(): void {
  const installerPath = path.join(process.resourcesPath, 'obs-virtualcam-installer.exe');
  // Run with UAC elevation — user will see Windows UAC prompt
  execSync(`"${installerPath}" /S`, { stdio: 'inherit' });
}
```

---

## UI SCREENS

### 1. Login / Signup
- Supabase email/password auth
- "Forgot password" link (Supabase handles reset email)
- No OAuth in MVP (add Google OAuth in v2)

### 2. Setup Wizard (first-run only)
Shows when `preferences.virtual_cam_installed` is not `'true'` in local SQLite.

Steps:
1. Welcome screen — "Let's get Livemask ready"
2. Driver install — "Install Livemask Cam virtual camera driver" → button triggers `virtualcam:install` IPC → UAC prompt → success
3. Detection confirmation — check registry, show green checkmark
4. Done — "Livemask Cam is ready. Open Zoom or Discord and select 'Livemask Cam' as your camera."

Only show this wizard once. After completion, set `preferences.virtual_cam_installed = 'true'`.

### 3. Studio (main screen)
This is where users spend 90% of their time. Layout:

```
┌────────────────────────────────────────────────────────────┐
│  Livemask                                    [●] REC  [⚙]  │
├───────────────────┬────────────────────────────────────────┤
│                   │                                        │
│   YOU (raw cam)   │   AS CHARACTER (Decart output)         │
│   480x270         │   480x270                              │
│                   │                                        │
├───────────────────┴────────────────────────────────────────┤
│  CHARACTER LIBRARY                              [+ Upload]  │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐            │
│  │ Sam  │ │ Ninja│ │ Elf  │ │ Cat  │ │  +   │            │
│  │[LIVE]│ │      │ │      │ │      │ │      │            │
│  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘            │
├────────────────────────────────────────────────────────────┤
│  [● START LIVEMASK]    Session: 0:00    Cost: $0.00        │
│  Status: Ready ●                   Livemask Cam: Active ● │
└────────────────────────────────────────────────────────────┘
```

**Behavior:**
- Clicking a character card with active session → calls `switchCharacter()` → `realtimeClient.set()` → no reconnect
- Start button starts session + starts virtual cam sidecar simultaneously
- Stop button stops both
- Session timer counts up from 0:00
- Cost display: `sessionSeconds * 0.02` formatted as `$X.XX`
- Status indicator: Idle (grey) / Connecting (yellow pulse) / Live (green pulse) / Reconnecting (orange pulse) / Error (red)
- "Livemask Cam: Active" shows when sidecar is running and frames are flowing

### 4. Character Upload Modal
Triggered by "+ Upload" button.

Fields:
- **Image** — file picker (accept: `.jpg,.jpeg,.png,.webp`, max 5MB, preview shown)
- **Name** — text input (max 30 chars)
- **Transformation prompt** — textarea with placeholder:
  `"Transform the person into the character in the reference image. Preserve their movements and expressions. Match the character's skin tone, hairstyle, facial features, and clothing."`
  User can edit this prompt. Show "Advanced" toggle to expand prompt field.

On submit:
1. Client-side: resize image to max 1024x1024, convert to JPEG
2. Upload to Supabase Storage: `characters/{userId}/{characterId}.jpg`
3. Insert row into `characters` table
4. Write to local SQLite cache
5. Refresh character library grid

### 5. Settings
- **Camera** — dropdown of available webcam devices (from `navigator.mediaDevices.enumerateDevices()`)
- **Resolution** — 720p / 480p (480p = lower Decart cost, lower quality)
- **Account** — email display, subscription plan, minutes used this month, Upgrade button
- **Virtual Camera** — status indicator, "Reinstall Driver" button
- **About** — version number, check for updates

---

## ZUSTAND GLOBAL STORE

```typescript
// src/renderer/store/appStore.ts

interface AppState {
  // Auth
  user: User | null;
  profile: Profile | null;

  // Session
  sessionState: SessionState;
  sessionStartTime: number | null;
  sessionCostSeconds: number;

  // Character
  activeCharacter: Character | null;
  characters: Character[];

  // Streams
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;

  // Virtual cam
  virtualCamStatus: 'idle' | 'active' | 'error';
  virtualCamInstalled: boolean;

  // UI
  error: string | null;

  // Actions
  setUser: (user: User | null) => void;
  setActiveCharacter: (char: Character) => void;
  setSessionState: (state: SessionState) => void;
  incrementSessionSeconds: () => void;
  setRemoteStream: (stream: MediaStream | null) => void;
  setVirtualCamStatus: (status: 'idle' | 'active' | 'error') => void;
  setError: (msg: string | null) => void;
}
```

---

## SUBSCRIPTION GATE LOGIC

Check on every session start in `useDecartSession.ts`:

```typescript
async function checkUsageAllowed(): Promise<{ allowed: boolean; reason?: string }> {
  const profile = useAppStore.getState().profile;

  if (profile.subscription_status === 'pro' || profile.subscription_status === 'power') {
    const planLimits = { pro: 3600, power: 12000 }; // seconds
    const limit = planLimits[profile.subscription_plan!];
    if (profile.active_minutes_used * 60 >= limit) {
      return { allowed: false, reason: 'minutes_exceeded' };
      // Overage billing kicks in — still allowed but flagged for billing
    }
    return { allowed: true };
  }

  // Free trial
  if (profile.trial_seconds_used >= 600) {
    return { allowed: false, reason: 'trial_expired' };
  }

  return { allowed: true };
}
```

When `trial_expired`: show upgrade modal with plan comparison. Do not allow starting session.
When `minutes_exceeded`: show "You've used your included minutes. Overage charges apply at $0.05/min." with confirm/cancel.

---

## ERROR HANDLING

### All error states must be handled gracefully. No raw error objects shown to users.

| Error | User-facing message | Action |
|-------|--------------------|----|
| Camera permission denied | "Livemask needs access to your camera. Click the camera icon in your browser bar and allow access, then restart the app." | Link to Windows camera settings |
| Decart token fetch failed | "Couldn't connect to Livemask servers. Check your internet connection." | Retry button |
| WebRTC connection failed | "Connection to the AI failed. Check your internet and try again." | Retry button |
| All reconnect retries failed | "Connection dropped. Your camera was shown as-is during the outage." | Auto-retry option |
| Virtual cam driver not found | "Livemask Cam isn't installed. Let's fix that." | Launch Setup Wizard |
| Supabase auth error | "Login failed. Please try again." | — |
| Image upload too large | "Image must be under 5MB. Try a smaller file." | — |
| Trial expired | "Your free trial has ended. Upgrade to keep going." | Upgrade modal |
| Character limit (20 max) | "You've reached the maximum of 20 saved characters. Delete one to add another." | — |

**Passthrough mode:** When `sessionState` is `reconnecting` or `error`, the virtual cam pipeline must continue to receive frames — switch to feeding raw `localStream` frames instead of `remoteStream` frames. User should never see a black camera in Zoom.

---

## DECART SDK USAGE PATTERN

```typescript
import { DecartClient } from '@decartai/sdk';

// Token is fetched from YOUR backend (never hardcode Decart API key in app)
const client = new DecartClient({ apiKey: ephemeralToken });

// Connect with webcam stream
const session = await client.realtime.connect({
  model: 'lucy-2.1',
  stream: localStream,           // MediaStream from getUserMedia
});

// Set active character (do this AFTER connect)
await session.set({
  prompt: character.prompt,
  image: characterImageFile,     // File | Blob | URL — all accepted
  enhance: true,
});

// Get output stream
session.onRemoteStream((transformedStream: MediaStream) => {
  // Store in Zustand, attach to <video> element, start frame extraction
  useAppStore.setState({ remoteStream: transformedStream });
});

// Handle state changes
session.onStateChange((state) => {
  // Map Decart states to your SessionState enum
  const stateMap = {
    'connecting': 'connecting',
    'connected': 'generating',
    'reconnecting': 'reconnecting',
    'disconnected': 'disconnected',
  };
  useAppStore.setState({ sessionState: stateMap[state] ?? 'idle' });
});

// Switch character without reconnecting (IMPORTANT — no new session needed)
await session.set({
  prompt: newCharacter.prompt,
  image: newCharacterImageFile,
});

// Stop
await session.disconnect();
```

---

## FIRST-RUN FLOW

```
App launches
    │
    ├─► No Supabase session → Login screen
    │
    └─► Supabase session exists →
            Check local SQLite: virtual_cam_installed?
            │
            ├─► 'true' → Studio screen
            │
            └─► not set →
                    Check registry for OBS VirtualCam
                    │
                    ├─► Found → set virtual_cam_installed='true' → Studio
                    │
                    └─► Not found → Setup Wizard screen
```

---

## PACKAGING & DISTRIBUTION

### `electron-builder.yml`
```yaml
appId: ai.livemask.app
productName: Livemask
copyright: Copyright © 2026 Livemask

win:
  target: nsis
  icon: resources/icon.ico
  signingHashAlgorithms: [sha256]
  # Code signing — requires EV cert from DigiCert/Sectigo
  certificateSubjectName: "Livemask" # matches your cert CN

nsis:
  oneClick: false
  allowToChangeInstallationDirectory: true
  installerIcon: resources/icon.ico
  uninstallerIcon: resources/icon.ico

extraResources:
  - from: resources/obs-virtualcam-installer.exe
    to: obs-virtualcam-installer.exe
  - from: sidecar/dist/virtualcam.exe
    to: sidecar/virtualcam.exe

publish:
  provider: github
  owner: yourgithubusername
  repo: livemask-releases
```

### PyInstaller build command (`sidecar/build.sh`)
```bash
pyinstaller \
  --onefile \
  --name virtualcam \
  --distpath ./dist \
  virtualcam.py
```

Run this before `electron-builder`. The resulting `sidecar/dist/virtualcam.exe` is bundled as an extra resource.

---

## ENVIRONMENT VARIABLES

### Desktop App (`src/renderer/.env`)
```
VITE_SUPABASE_URL=https://yourproject.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_BACKEND_URL=https://livemask-api.up.railway.app
```

### Backend (`backend/.env`)
```
DECART_API_KEY=dct_...
SUPABASE_URL=https://yourproject.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SUPABASE_JWT_SECRET=your-jwt-secret
PAYSTACK_SECRET_KEY=sk_test_...
PAYSTACK_PLAN_PRO=PLN_...
PAYSTACK_PLAN_POWER=PLN_...
```

---

## MINIMUM SYSTEM REQUIREMENTS

Display these in the installer and on the website:

- Windows 10 or Windows 11 (64-bit)
- 8 GB RAM minimum (16 GB recommended)
- Intel Core i5 8th gen+ or AMD Ryzen 5 3000+
- Webcam (built-in or USB)
- Internet connection: 10 Mbps upload minimum, 20 Mbps recommended
- 500 MB free disk space

---

## DEVELOPMENT SETUP INSTRUCTIONS

```bash
# 1. Install dependencies
npm install

# 2. Start Electron app in dev mode (main + renderer with HMR)
npm run dev

# 3. Start backend locally
cd backend && npm install && npm run dev

# 4. Build Python sidecar (requires Python 3.10+, pyvirtualcam, pyinstaller)
pip install pyvirtualcam pyinstaller
cd sidecar && sh build.sh

# 5. Build Electron app for production
npm run build        # builds renderer
npm run build:win    # packages as .exe installer via electron-builder
```

---

## IMPLEMENTATION ORDER (follow this exactly)

1. Scaffold `electron-vite` project with React + TypeScript
2. Set up Supabase project (auth, tables, storage bucket) per schema above
3. Build Login/Signup screens with Supabase auth
4. Add `getUserMedia` webcam preview in Studio screen
5. Deploy Hono backend to Railway with `/api/token` endpoint (hardcode a test user in DB first)
6. Integrate Decart SDK in renderer — connect session, display `remoteStream` in `<video>` element
7. Build character upload flow (file picker → Supabase Storage → DB → local cache)
8. Implement `switchCharacter()` using `session.set()`
9. **[HARDEST]** Build virtual cam pipeline: frame extractor → IPC → Python sidecar → OBS VirtualCam
10. Test virtual cam in Zoom and Discord before continuing
11. Add session timer, cost display, session state machine
12. Build Setup Wizard (driver detection + install)
13. Add Paystack billing (checkout + webhooks + subscription gate)
14. Add Settings screen (camera selector, resolution, account)
15. Add error handling for all states (passthrough mode on reconnect)
16. Add auto-updater
17. Package with electron-builder, test on clean Windows VM
18. Submit for code signing cert (start this in week 1 — takes 3–7 days to issue)

---

## KNOWN HARD PROBLEMS (solutions pre-decided)

**Problem:** `requestAnimationFrame` throttles when Electron window is minimized, dropping virtual cam frames.
**Solution:** Use `setInterval(fn, 1000 / 30)` in the frame extractor for the IPC pipe. Use rAF only for the visible preview.

**Problem:** Canvas `drawImage` may be blocked if renderer sandbox settings prevent cross-origin media.
**Solution:** In `main/index.ts` BrowserWindow config, set `webPreferences: { webSecurity: false }` in development. In production, ensure `remoteStream` is treated as same-origin by setting it directly as `video.srcObject` without URL.createObjectURL.

**Problem:** Python sidecar not found after packaging.
**Solution:** Always resolve sidecar path using `process.resourcesPath` in packaged app, not `__dirname`. Test the packaged build on a clean Windows VM before releasing.

**Problem:** OBS VirtualCam device name differs on some systems ("OBS Virtual Camera" vs "OBS-Camera").
**Solution:** In `virtualcam.py`, enumerate available virtual camera devices and pick the first match containing "OBS". If none found, write error to stderr and exit — main process catches this and shows reinstall prompt.

**Problem:** Decart session drops mid-Zoom call.
**Solution:** On `reconnecting` state, immediately switch virtual cam to feed raw `localStream` frames. On reconnect success, switch back to `remoteStream`. User sees raw webcam during outage — better than black screen.

---

*This document is the single source of truth for Cursor. Every file, every function signature, every IPC channel, every DB table is specified here. Do not deviate from the structure above. When in doubt, refer back to this document.*
