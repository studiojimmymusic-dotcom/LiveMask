import { useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAppStore } from '../store/appStore'
import type { Profile } from '../types/profile'

interface UseProfileReturn {
  fetchProfile: () => Promise<void>
}

export function useProfile(): UseProfileReturn {
  const setProfile = useAppStore((s) => s.setProfile)

  const fetchProfile = useCallback(async () => {
    const userId = useAppStore.getState().user?.id
    if (!userId) return

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error || !data) return
    setProfile(data as Profile)
  }, [setProfile])

  return { fetchProfile }
}
