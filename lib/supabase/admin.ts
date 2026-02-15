import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://wlmhtuqbzyethknlggwg.supabase.co'
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

export function createSupabaseAdmin() {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
}