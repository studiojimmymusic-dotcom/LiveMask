import { useCallback } from 'react'
import imageCompression from 'browser-image-compression'
import { supabase, getCharacterImageUrl, CHARACTERS_BUCKET } from '../lib/supabase'
import { useAppStore } from '../store/appStore'
import type { Character } from '../types/character'

interface UploadCharacterInput {
  file: File
  name: string
  prompt: string
}

// The character library is capped at a fixed number of slots.
export const MAX_CHARACTERS = 4

interface UseCharactersReturn {
  loadCachedCharacters: () => Promise<void>
  fetchCharacters: () => Promise<void>
  uploadCharacter: (input: UploadCharacterInput) => Promise<Character>
  deleteCharacter: (id: string) => Promise<void>
}

// Best-effort write to the local SQLite cache via IPC. Never blocks the UI.
function cacheCharacters(characters: Character[]): void {
  void window.api
    ?.cacheSetCharacters(
      characters.map((c) => ({
        id: c.id,
        name: c.name,
        prompt: c.prompt,
        thumbnail_path: c.thumbnail_url,
        storage_path: c.storage_path
      }))
    )
    .catch(() => {
      /* cache is non-critical */
    })
}

export function useCharacters(): UseCharactersReturn {
  const setCharacters = useAppStore((s) => s.setCharacters)

  // Instantly paint the character library from the local SQLite cache so there's
  // no network wait on launch. Cached signed URLs may be stale, but the
  // background Supabase fetch refreshes them moments later.
  const loadCachedCharacters = useCallback(async () => {
    try {
      const cached = await window.api?.cacheGetCharacters?.()
      if (!cached || cached.length === 0) return

      const characters: Character[] = cached.map((c) => ({
        id: c.id,
        user_id: '',
        name: c.name,
        prompt: c.prompt,
        storage_path: c.storage_path ?? '',
        thumbnail_url: c.thumbnail_path ?? null
      }))
      setCharacters(characters)
    } catch {
      /* cache is non-critical */
    }
  }, [setCharacters])

  const fetchCharacters = useCallback(async () => {
    const userId = useAppStore.getState().user?.id
    if (!userId) return

    const { data, error } = await supabase
      .from('characters')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error || !data) return

    // Signed URLs expire after an hour, so refresh them from storage_path on
    // every fetch to keep thumbnails (and the Decart reference image) valid.
    const characters: Character[] = await Promise.all(
      (data as Character[]).map(async (row) => ({
        ...row,
        thumbnail_url: (await getCharacterImageUrl(row.storage_path)) ?? row.thumbnail_url
      }))
    )

    setCharacters(characters)
    cacheCharacters(characters)
  }, [setCharacters])

  const uploadCharacter = useCallback(
    async ({ file, name, prompt }: UploadCharacterInput): Promise<Character> => {
      const userId = useAppStore.getState().user?.id
      if (!userId) throw new Error('You must be logged in to add a character.')

      if (useAppStore.getState().characters.length >= MAX_CHARACTERS) {
        throw new Error(
          `Your library is full (${MAX_CHARACTERS} characters max). Delete one to add another.`
        )
      }

      const characterId = crypto.randomUUID()

      // Resize to max 1024x1024 and convert to JPEG before upload.
      const compressed = await imageCompression(file, {
        maxWidthOrHeight: 1024,
        fileType: 'image/jpeg',
        useWebWorker: true,
        maxSizeMB: 5
      })

      const storagePath = `${userId}/${characterId}.jpg`

      const { error: uploadError } = await supabase.storage
        .from(CHARACTERS_BUCKET)
        .upload(storagePath, compressed, {
          contentType: 'image/jpeg',
          upsert: true
        })

      if (uploadError) {
        console.error('[uploadCharacter] storage upload failed:', uploadError)
        if (uploadError.message.includes('Bucket not found')) {
          throw new Error(
            'Storage bucket "characters" not found. Create it in Supabase → Storage (private), then run the storage policies in backend/schema.sql.'
          )
        }
        if (
          uploadError.message.includes('row-level security') ||
          uploadError.message.includes('policy')
        ) {
          throw new Error(
            'Storage permission denied. Run the storage policies at the bottom of backend/schema.sql in the Supabase SQL Editor.'
          )
        }
        throw new Error(`Failed to upload image: ${uploadError.message}`)
      }

      const signedUrl = await getCharacterImageUrl(storagePath)

      const { data: inserted, error: insertError } = await supabase
        .from('characters')
        .insert({
          id: characterId,
          user_id: userId,
          name,
          prompt,
          storage_path: storagePath,
          thumbnail_url: signedUrl
        })
        .select()
        .single()

      if (insertError || !inserted) {
        // Roll back the orphaned upload so storage stays clean.
        await supabase.storage.from(CHARACTERS_BUCKET).remove([storagePath])
        throw new Error('Failed to save character. Please try again.')
      }

      await fetchCharacters()
      return inserted as Character
    },
    [fetchCharacters]
  )

  const deleteCharacter = useCallback(
    async (id: string) => {
      const character = useAppStore.getState().characters.find((c) => c.id === id)
      if (!character) return

      await supabase.storage.from(CHARACTERS_BUCKET).remove([character.storage_path])
      await supabase.from('characters').delete().eq('id', id)

      const activeCharacter = useAppStore.getState().activeCharacter
      if (activeCharacter?.id === id) {
        useAppStore.getState().setActiveCharacter(null)
      }

      await fetchCharacters()
    },
    [fetchCharacters]
  )

  return { loadCachedCharacters, fetchCharacters, uploadCharacter, deleteCharacter }
}
