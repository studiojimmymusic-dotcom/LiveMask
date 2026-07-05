export interface Character {
  id: string
  user_id: string
  name: string
  storage_path: string
  prompt: string
  thumbnail_url: string | null
  created_at?: string
  updated_at?: string
}
