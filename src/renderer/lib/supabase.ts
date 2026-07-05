import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in src/renderer/.env'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false
  }
})

export const CHARACTERS_BUCKET = 'characters'

// Returns a temporary signed URL (valid 1 hour) for a private character image.
export async function getCharacterImageUrl(storagePath: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(CHARACTERS_BUCKET)
    .createSignedUrl(storagePath, 3600)

  if (error || !data) return null
  return data.signedUrl
}
