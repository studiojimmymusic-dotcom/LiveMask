import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import crypto from 'node:crypto'
import { CREDITS_PER_SECOND, CREDIT_PACKS, isValidPackId } from './credits.ts'

// Load backend/.env (Node >= 20.12). Ignore if it doesn't exist — Railway
// injects env vars directly in production.
try {
  process.loadEnvFile()
} catch {
  // no .env file present; rely on process.env
}

const DECART_API_KEY = process.env.DECART_API_KEY ?? ''
const SUPABASE_URL = process.env.SUPABASE_URL ?? ''
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY ?? ''
const PORT = Number(process.env.PORT ?? 3000)

const PAYSTACK_API = 'https://api.paystack.co'

// ---------------------------------------------------------------------------
// Lazy Supabase singleton — built only when first needed so the server can
// boot (and /health can respond) even while secrets are still placeholders.
// ---------------------------------------------------------------------------

let _supabase: SupabaseClient | null = null
function getSupabase(): SupabaseClient {
  if (!_supabase) {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    }
    _supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false }
    })
  }
  return _supabase
}

async function verifySupabaseToken(token: string): Promise<{ sub: string; email?: string }> {
  const { data, error } = await getSupabase().auth.getUser(token)
  if (error || !data?.user) {
    throw new Error(`Invalid token: ${error?.message ?? 'no user'}`)
  }
  return { sub: data.user.id, email: data.user.email }
}

async function resolveUserId(
  token: string | undefined,
  isDev: boolean
): Promise<{ userId: string } | { error: string; status: number }> {
  if (isDev) {
    const { data: firstProfile, error: lookupError } = await getSupabase()
      .from('profiles')
      .select('id')
      .limit(1)
      .single()

    if (lookupError || !firstProfile) {
      return { error: 'no_profile_found', status: 404 }
    }
    return { userId: firstProfile.id as string }
  }

  if (!token) return { error: 'missing_token', status: 400 }
  try {
    const claims = await verifySupabaseToken(token)
    return { userId: claims.sub }
  } catch {
    return { error: 'unauthorized', status: 401 }
  }
}

const app = new Hono()

app.options('*', (c) => {
  c.header('Access-Control-Allow-Origin', '*')
  c.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  return c.text('', 204)
})

app.use('*', async (c, next) => {
  await next()
  c.header('Access-Control-Allow-Origin', '*')
  c.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
})

// ---------------------------------------------------------------------------
// GET /health — Railway deploy check
// ---------------------------------------------------------------------------
app.get('/health', (c) => c.json({ status: 'ok' }))

// ---------------------------------------------------------------------------
// POST /api/token — mint a Decart ephemeral client token for an auth'd user
// ---------------------------------------------------------------------------
app.post('/api/token', async (c) => {
  let body: { supabase_access_token?: string }
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'invalid_request' }, 400)
  }

  const isDev = process.env.NODE_ENV === 'development'
  const resolved = await resolveUserId(body.supabase_access_token, isDev)
  if ('error' in resolved) return c.json({ error: resolved.error }, resolved.status as 400)

  const { data: profile, error } = await getSupabase()
    .from('profiles')
    .select('credits_balance')
    .eq('id', resolved.userId)
    .single()

  if (error || !profile) {
    return c.json({ error: 'profile_not_found' }, 404)
  }

  if ((profile.credits_balance ?? 0) <= 0) {
    return c.json({ error: 'insufficient_credits' }, 403)
  }

  try {
    const res = await fetch('https://api.decart.ai/v1/client/tokens', {
      method: 'POST',
      headers: {
        'X-API-KEY': DECART_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ expiresIn: 300, allowedModels: ['lucy-2.1'] })
    })

    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      console.error('[/api/token] Decart token mint failed:', res.status, detail)
      return c.json({ error: 'decart_token_failed' }, 502)
    }

    const data = (await res.json()) as { apiKey: string; expiresAt: string }
    return c.json({ apiKey: data.apiKey, expiresAt: data.expiresAt })
  } catch {
    return c.json({ error: 'decart_unreachable' }, 502)
  }
})

// ---------------------------------------------------------------------------
// POST /api/usage — deduct credits while a session is live (2 credits/second)
// ---------------------------------------------------------------------------
app.post('/api/usage', async (c) => {
  let body: { supabase_access_token?: string; credits?: number }
  try {
    body = await c.req.json()
  } catch {
    body = {}
  }

  const isDev = process.env.NODE_ENV === 'development'
  const resolved = await resolveUserId(body.supabase_access_token, isDev)
  if ('error' in resolved) return c.json({ error: resolved.error }, resolved.status as 400)

  const deduct = body.credits ?? CREDITS_PER_SECOND
  if (deduct <= 0 || deduct > 120) {
    return c.json({ error: 'invalid_credits' }, 400)
  }

  const supabase = getSupabase()
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('credits_balance')
    .eq('id', resolved.userId)
    .single()

  if (error || !profile) return c.json({ error: 'profile_not_found' }, 404)

  const currentBalance = profile.credits_balance ?? 0
  const newBalance = Math.max(0, currentBalance - deduct)

  await supabase.from('profiles').update({ credits_balance: newBalance }).eq('id', resolved.userId)

  return c.json({
    credits_balance: newBalance,
    depleted: newBalance <= 0
  })
})

// ---------------------------------------------------------------------------
// POST /api/create-credit-checkout — one-time Paystack payment for a credit pack
// ---------------------------------------------------------------------------
app.post('/api/create-credit-checkout', async (c) => {
  let body: { supabase_access_token?: string; pack_id?: string }
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'invalid_request' }, 400)
  }

  const { supabase_access_token: token, pack_id: packId } = body
  if (!token) return c.json({ error: 'missing_token' }, 400)
  if (!packId || !isValidPackId(packId)) return c.json({ error: 'invalid_pack' }, 400)

  let userId: string
  let email: string | undefined
  try {
    const claims = await verifySupabaseToken(token)
    userId = claims.sub
    email = claims.email
  } catch {
    return c.json({ error: 'unauthorized' }, 401)
  }

  const pack = CREDIT_PACKS[packId]
  const supabase = getSupabase()
  const { data: profile } = await supabase.from('profiles').select('email').eq('id', userId).single()

  const customerEmail = email ?? (profile?.email as string | undefined)
  if (!customerEmail) return c.json({ error: 'missing_email' }, 400)

  try {
    const res = await fetch(`${PAYSTACK_API}/transaction/initialize`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: customerEmail,
        amount: pack.amountKobo,
        currency: 'NGN',
        metadata: {
          supabase_user_id: userId,
          type: 'credit_purchase',
          pack_id: packId,
          credits: pack.credits
        },
        callback_url: 'https://livemask.ai/billing/success'
      })
    })

    const json = (await res.json()) as {
      status: boolean
      data?: { authorization_url: string }
      message?: string
    }

    if (!res.ok || !json.status || !json.data) {
      console.error('[/api/create-credit-checkout] Paystack error:', json.message)
      return c.json({ error: 'paystack_init_failed' }, 502)
    }

    return c.json({ url: json.data.authorization_url })
  } catch {
    return c.json({ error: 'paystack_unreachable' }, 502)
  }
})

// ---------------------------------------------------------------------------
// POST /api/webhooks/paystack — credit purchase fulfillment
// ---------------------------------------------------------------------------
app.post('/api/webhooks/paystack', async (c) => {
  const signature = c.req.header('x-paystack-signature')
  if (!signature) return c.json({ error: 'missing_signature' }, 400)

  const rawBody = await c.req.text()
  const expected = crypto.createHmac('sha512', PAYSTACK_SECRET_KEY).update(rawBody).digest('hex')

  if (expected !== signature) return c.json({ error: 'invalid_signature' }, 400)

  let event: { event: string; data: Record<string, unknown> }
  try {
    event = JSON.parse(rawBody)
  } catch {
    return c.json({ error: 'invalid_payload' }, 400)
  }

  if (event.event !== 'charge.success') {
    return c.json({ received: true })
  }

  const data = event.data
  const metadata = (data.metadata ?? {}) as Record<string, string | number>
  if (metadata.type !== 'credit_purchase') {
    return c.json({ received: true })
  }

  const userId = metadata.supabase_user_id as string | undefined
  const credits = Number(metadata.credits)
  const reference = data.reference as string | undefined

  if (!userId || !credits || credits <= 0 || !reference) {
    console.error('[/api/webhooks/paystack] invalid credit purchase metadata')
    return c.json({ received: true })
  }

  const supabase = getSupabase()

  // Idempotency — skip if this Paystack reference was already processed.
  const { data: existing } = await supabase
    .from('credit_transactions')
    .select('id')
    .eq('paystack_reference', reference)
    .maybeSingle()

  if (existing) return c.json({ received: true })

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('credits_balance')
    .eq('id', userId)
    .single()

  if (profileError || !profile) {
    console.error('[/api/webhooks/paystack] profile not found for', userId)
    return c.json({ received: true })
  }

  const newBalance = (profile.credits_balance ?? 0) + credits

  const { error: txError } = await supabase.from('credit_transactions').insert({
    user_id: userId,
    amount: credits,
    type: 'purchase',
    paystack_reference: reference,
    description: `Purchased ${credits.toLocaleString()} credits`
  })

  if (txError) {
    console.error('[/api/webhooks/paystack] transaction insert failed:', txError.message)
    return c.json({ received: true })
  }

  await supabase.from('profiles').update({ credits_balance: newBalance }).eq('id', userId)

  return c.json({ received: true })
})

serve({ fetch: app.fetch, port: PORT }, (info) => {
  console.log(`Livemask backend listening on http://localhost:${info.port}`)
})
