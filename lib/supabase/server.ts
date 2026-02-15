import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { ReadonlyRequestCookies } from 'next/dist/server/web/spec-extension/adapters/request-cookies'

export async function createSupabaseServerClient() {
  const cookieStore: ReadonlyRequestCookies = await cookies()

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://wlmhtuqbzyethknlggwg.supabase.co'
  const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsbWh0dXFienlldGhrbmxnZ3dnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkyODU5MDYsImV4cCI6MjA4NDg2MTkwNn0.fW_XUljx6Ah4X4mcojv8DV2S5a4OCHc6vMbmuxWKdvE'

  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: any }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch {
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}