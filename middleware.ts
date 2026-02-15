import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

const _url = process.env.NEXT_PUBLIC_SUPABASE_URL
const _key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const SUPABASE_URL = (_url && _url.startsWith('http')) ? _url : 'https://wlmhtuqbzyethknlggwg.supabase.co'
const SUPABASE_ANON_KEY = (_key && _key.startsWith('eyJ')) ? _key : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsbWh0dXFienlldGhrbmxnZ3dnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkyODU5MDYsImV4cCI6MjA4NDg2MTkwNn0.fW_XUljx6Ah4X4mcojv8DV2S5a4OCHc6vMbmuxWKdvE'

const PROTECTED_PREFIXES = ['/agenda', '/compartilhar', '/configuracoes', '/convite']

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))

  if (!isProtected) {
    return NextResponse.next()
  }

  let res = NextResponse.next()

  const supabase = createServerClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: any }[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            res.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const { data } = await supabase.auth.getUser()

  if (!data.user) {
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
