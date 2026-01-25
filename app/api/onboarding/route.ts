import { createSupabaseServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient()

  // Verificar usuário autenticado
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (!user || authError) {
    return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
  }

  // Pegar dados do body
  const body = await req.json()
  const { nome, telefone } = body

  // Criar perfil do usuário
  const { error: userError } = await supabase
    .from('USUARIO')
    .insert({
      ID_USUARIO: user.id,
      EMAIL: user.email!,
      NOME: nome || 'Novo Usuário',
      TELEFONE: telefone || null,
      PLANO: 'FREE',
      ATIVO: true,
    })

  if (userError) {
    return NextResponse.json({ message: userError.message }, { status: 400 })
  }

  // Criar agenda padrão
  const { error: agendaError } = await supabase
    .from('AGENDA')
    .insert({
      ID_USUARIO: user.id,
      NOME: 'Minha Agenda',
      COR: '#3B82F6',
      ATIVA: true,
    })

  if (agendaError) {
    return NextResponse.json({ message: agendaError.message }, { status: 400 })
  }

  return NextResponse.json({ message: 'Onboarding concluído com sucesso' })
}