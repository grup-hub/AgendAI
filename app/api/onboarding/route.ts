import { createSupabaseAdmin } from '@/lib/supabase/admin'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const body = await req.json()
  const { nome, telefone, userId, email } = body

  // Usar admin client (service role) para bypass de RLS
  // Necessário porque no signup com confirmação de email, o usuário ainda não tem sessão
  const supabaseAdmin = createSupabaseAdmin()

  let targetUserId = userId
  let targetEmail = email

  // Se não veio userId/email no body, tenta pegar do usuário autenticado
  if (!targetUserId || !targetEmail) {
    const supabase = await createSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (!user || authError) {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
    }
    targetUserId = user.id
    targetEmail = user.email
  }

  // Verificar se o usuário existe no Auth (segurança)
  const { data: authUser, error: authCheckError } = await supabaseAdmin.auth.admin.getUserById(targetUserId)
  if (authCheckError || !authUser.user) {
    return NextResponse.json({ message: 'Usuário não encontrado' }, { status: 404 })
  }

  // Verificar se já fez onboarding (evitar duplicatas)
  const { data: existingUser } = await supabaseAdmin
    .from('USUARIO')
    .select('ID_USUARIO')
    .eq('ID_USUARIO', targetUserId)
    .single()

  if (existingUser) {
    return NextResponse.json({ message: 'Onboarding já realizado' })
  }

  // Criar perfil do usuário
  const { error: userError } = await supabaseAdmin
    .from('USUARIO')
    .insert({
      ID_USUARIO: targetUserId,
      EMAIL: targetEmail,
      NOME: nome || 'Novo Usuário',
      TELEFONE: telefone || null,
      PLANO: 'FREE',
      ATIVO: true,
    })

  if (userError) {
    return NextResponse.json({ message: userError.message }, { status: 400 })
  }

  // Criar agenda padrão
  const { error: agendaError } = await supabaseAdmin
    .from('AGENDA')
    .insert({
      ID_USUARIO: targetUserId,
      NOME: 'Minha Agenda',
      COR: '#3B82F6',
      ATIVA: true,
    })

  if (agendaError) {
    return NextResponse.json({ message: agendaError.message }, { status: 400 })
  }

  return NextResponse.json({ message: 'Onboarding concluído com sucesso' })
}