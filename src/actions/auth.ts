'use server'

import { createClient } from '@/lib/supabase/server'
import type { UserRole } from '@/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = any

export async function getCurrentUserRole(): Promise<UserRole | null> {
  const supabase = await createClient() as SupabaseClient
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  return (data?.role as UserRole) || null
}
