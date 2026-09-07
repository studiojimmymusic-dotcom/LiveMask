import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabaseConfigError =
  !supabaseUrl || !supabaseAnonKey
    ? 'Missing Supabase environment variables. Create src/renderer/.env from .env.example and set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
    : null

export const supabase: SupabaseClient = supabaseConfigError
  ? (null as unknown as SupabaseClient)
  : createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false
      }
    })

export const CHARACTERS_BUCKET = 'characters'

// Returns a temporary signed URL (valid 1 hour) for a private character image.
export async function getCharacterImageUrl(storagePath: string): Promise<string | null> {
  if (supabaseConfigError) return null

  const { data, error } = await supabase.storage
    .from(CHARACTERS_BUCKET)
    .createSignedUrl(storagePath, 3600)

  if (error || !data) return null
  return data.signedUrl
}
