import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type')

  // Confirmação de email → redireciona para página de sucesso
  if (type === 'signup' || type === 'email_change') {
    return NextResponse.redirect(new URL('/email-confirmado', request.url))
  }

  // Redefinição de senha → redireciona para redefinir-senha
  if (type === 'recovery') {
    const token_hash = searchParams.get('token_hash')
    return NextResponse.redirect(
      new URL(`/redefinir-senha?token_hash=${token_hash}&type=recovery`, request.url)
    )
  }

  // Fallback → login
  return NextResponse.redirect(new URL('/login', request.url))
}
