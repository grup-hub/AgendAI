import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config'

let client: SupabaseClient | null = null

export function createSupabaseBrowserClient() {
  if (client) return client

  client = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY)

  return client
}
