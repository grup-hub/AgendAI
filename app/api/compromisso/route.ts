import { createSupabaseServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const supabase = createSupabaseServerClient()

  // Verificar usuário autenticado
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (!user || authError) {
    return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
  }

  // Buscar agenda do usuário
  const { data: agenda, error: agendaError } = await supabase
    .from('AGENDA')
    .select('ID_AGENDA')
    .eq('ID_USUARIO', user.id)
    .single()

  if (agendaError || !agenda) {
    return NextResponse.json({ message: 'Agenda não encontrada' }, { status: 404 })
  }

  // Buscar compromissos da agenda
  const { data: compromissos, error: compromissoError } = await supabase
    .from('COMPROMISSO')
    .select(
      `
      ID_COMPROMISSO,
      TITULO,
      DESCRICAO,
      LOCAL,
      DATA_INICIO,
      DATA_FIM,
      ORIGEM,
      STATUS,
      CRIADO_POR,
      DATA_CADASTRO,
      LEMBRETE(ID_LEMBRETE, TIPO, ANTECEDENCIA_MINUTOS, ENVIADO)
    `
    )
    .eq('ID_AGENDA', agenda.ID_AGENDA)
    .order('DATA_INICIO', { ascending: true })

  if (compromissoError) {
    return NextResponse.json({ message: compromissoError.message }, { status: 400 })
  }

  return NextResponse.json({ compromissos })
}

export async function POST(req: Request) {
  const supabase = createSupabaseServerClient()

  // Verificar usuário autenticado
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (!user || authError) {
    return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
  }

  // Pegar dados do body
  const body = await req.json()
  const { TITULO, DESCRICAO, LOCAL, DATA_INICIO, DATA_FIM, ORIGEM } = body

  // Validações básicas
  if (!TITULO || !DATA_INICIO || !DATA_FIM) {
    return NextResponse.json(
      { message: 'TITULO, DATA_INICIO e DATA_FIM são obrigatórios' },
      { status: 400 }
    )
  }

  // Buscar agenda do usuário
  const { data: agenda, error: agendaError } = await supabase
    .from('AGENDA')
    .select('ID_AGENDA')
    .eq('ID_USUARIO', user.id)
    .single()

  if (agendaError || !agenda) {
    return NextResponse.json({ message: 'Agenda não encontrada' }, { status: 404 })
  }

  // Criar compromisso
  const { data: compromisso, error: compromissoError } = await supabase
    .from('COMPROMISSO')
    .insert({
      ID_AGENDA: agenda.ID_AGENDA,
      TITULO,
      DESCRICAO: DESCRICAO || null,
      LOCAL: LOCAL || null,
      DATA_INICIO,
      DATA_FIM,
      ORIGEM: ORIGEM || 'MANUAL',
      CRIADO_POR: user.id,
      STATUS: 'ATIVO',
    })
    .select()
    .single()

  if (compromissoError) {
    return NextResponse.json({ message: compromissoError.message }, { status: 400 })
  }

  return NextResponse.json({ message: 'Compromisso criado com sucesso', compromisso }, { status: 201 })
}

export async function PUT(req: Request) {
  const supabase = createSupabaseServerClient()

  // Verificar usuário autenticado
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (!user || authError) {
    return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
  }

  // Pegar dados do body
  const body = await req.json()
  const { ID_COMPROMISSO, TITULO, DESCRICAO, LOCAL, DATA_INICIO, DATA_FIM, STATUS } = body

  if (!ID_COMPROMISSO) {
    return NextResponse.json({ message: 'ID_COMPROMISSO é obrigatório' }, { status: 400 })
  }

  // Verificar se o compromisso pertence ao usuário
  const { data: compromisso, error: checkError } = await supabase
    .from('COMPROMISSO')
    .select('ID_AGENDA')
    .eq('ID_COMPROMISSO', ID_COMPROMISSO)
    .single()

  if (checkError || !compromisso) {
    return NextResponse.json({ message: 'Compromisso não encontrado' }, { status: 404 })
  }

  // Verificar se a agenda pertence ao usuário
  const { data: agenda, error: agendaError } = await supabase
    .from('AGENDA')
    .select('ID_AGENDA')
    .eq('ID_AGENDA', compromisso.ID_AGENDA)
    .eq('ID_USUARIO', user.id)
    .single()

  if (agendaError || !agenda) {
    return NextResponse.json({ message: 'Sem permissão para editar este compromisso' }, { status: 403 })
  }

  // Atualizar compromisso
  const updateData: any = {}
  if (TITULO !== undefined) updateData.TITULO = TITULO
  if (DESCRICAO !== undefined) updateData.DESCRICAO = DESCRICAO
  if (LOCAL !== undefined) updateData.LOCAL = LOCAL
  if (DATA_INICIO !== undefined) updateData.DATA_INICIO = DATA_INICIO
  if (DATA_FIM !== undefined) updateData.DATA_FIM = DATA_FIM
  if (STATUS !== undefined) updateData.STATUS = STATUS

  const { data: updated, error: updateError } = await supabase
    .from('COMPROMISSO')
    .update(updateData)
    .eq('ID_COMPROMISSO', ID_COMPROMISSO)
    .select()
    .single()

  if (updateError) {
    return NextResponse.json({ message: updateError.message }, { status: 400 })
  }

  return NextResponse.json({ message: 'Compromisso atualizado com sucesso', compromisso: updated })
}

export async function DELETE(req: Request) {
  const supabase = createSupabaseServerClient()

  // Verificar usuário autenticado
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (!user || authError) {
    return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
  }

  // Pegar ID do query params
  const url = new URL(req.url)
  const idCompromisso = url.searchParams.get('id')

  if (!idCompromisso) {
    return NextResponse.json({ message: 'ID do compromisso é obrigatório' }, { status: 400 })
  }

  // Verificar se o compromisso pertence ao usuário
  const { data: compromisso, error: checkError } = await supabase
    .from('COMPROMISSO')
    .select('ID_AGENDA')
    .eq('ID_COMPROMISSO', idCompromisso)
    .single()

  if (checkError || !compromisso) {
    return NextResponse.json({ message: 'Compromisso não encontrado' }, { status: 404 })
  }

  // Verificar se a agenda pertence ao usuário
  const { data: agenda, error: agendaError } = await supabase
    .from('AGENDA')
    .select('ID_AGENDA')
    .eq('ID_AGENDA', compromisso.ID_AGENDA)
    .eq('ID_USUARIO', user.id)
    .single()

  if (agendaError || !agenda) {
    return NextResponse.json({ message: 'Sem permissão para deletar este compromisso' }, { status: 403 })
  }

  // Deletar compromisso
  const { error: deleteError } = await supabase
    .from('COMPROMISSO')
    .delete()
    .eq('ID_COMPROMISSO', idCompromisso)

  if (deleteError) {
    return NextResponse.json({ message: deleteError.message }, { status: 400 })
  }

  return NextResponse.json({ message: 'Compromisso deletado com sucesso' })
}
