import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

const PROTECTED_PREFIXES = ['/agenda', '/compartilhar', '/configuracoes', '/convite']

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Só verificar autenticação em rotas protegidas (evita chamadas desnecessárias)
  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))
  const isApiRoute = pathname.startsWith('/api/')

  // Se não é rota protegida nem API, apenas continua sem chamar o Supabase
  if (!isProtected && !isApiRoute) {
    return NextResponse.next()
  }

  let res = NextResponse.next()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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

  // Redirecionar para login se não autenticado em rota protegida
  if (isProtected && !data.user) {
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|css|js)$).*)'],
}