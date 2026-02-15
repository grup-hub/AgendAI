import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://wlmhtuqbzyethknlggwg.supabase.co'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsbWh0dXFienlldGhrbmxnZ3dnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkyODU5MDYsImV4cCI6MjA4NDg2MTkwNn0.fW_XUljx6Ah4X4mcojv8DV2S5a4OCHc6vMbmuxWKdvE'

let client: SupabaseClient | null = null

export function createSupabaseBrowserClient() {
  if (client) return client

  client = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY)

  return client
}