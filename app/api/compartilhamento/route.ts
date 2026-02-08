import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET - Listar compartilhamentos (enviados e recebidos)
export async function GET(req: Request) {
  const supabase = await createSupabaseServerClient()
  const supabaseAdmin = createSupabaseAdmin()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (!user || authError) {
    return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
  }

  // Buscar agenda do usuário
  const { data: agenda } = await supabaseAdmin
    .from('AGENDA')
    .select('ID_AGENDA, NOME')
    .eq('ID_USUARIO', user.id)
    .single()

  // Compartilhamentos enviados (onde sou dono da agenda)
  let enviados: any[] = []
  if (agenda) {
    const { data: enviadosData } = await supabaseAdmin
      .from('COMPARTILHAMENTO_AGENDA')
      .select('*')
      .eq('ID_AGENDA', agenda.ID_AGENDA)
      .order('DATA_CONVITE', { ascending: false })

    if (enviadosData && enviadosData.length > 0) {
      // Buscar nomes dos convidados
      const convidadoIds = enviadosData.map((e) => e.ID_USUARIO_CONVIDADO)
      const { data: convidados } = await supabaseAdmin
        .from('USUARIO')
        .select('ID_USUARIO, NOME, EMAIL')
        .in('ID_USUARIO', convidadoIds)

      const convidadosMap = new Map(convidados?.map((c) => [c.ID_USUARIO, c]) || [])

      enviados = enviadosData.map((e) => ({
        ...e,
        convidado: convidadosMap.get(e.ID_USUARIO_CONVIDADO) || null,
      }))
    }
  }

  // Compartilhamentos recebidos (onde sou convidado)
  const { data: recebidosData } = await supabaseAdmin
    .from('COMPARTILHAMENTO_AGENDA')
    .select('*')
    .eq('ID_USUARIO_CONVIDADO', user.id)
    .order('DATA_CONVITE', { ascending: false })

  let recebidos: any[] = []
  if (recebidosData && recebidosData.length > 0) {
    // Buscar dados das agendas e donos
    const agendaIds = recebidosData.map((r) => r.ID_AGENDA)
    const { data: agendas } = await supabaseAdmin
      .from('AGENDA')
      .select('ID_AGENDA, NOME, ID_USUARIO')
      .in('ID_AGENDA', agendaIds)

    const donoIds = agendas?.map((a) => a.ID_USUARIO) || []
    const { data: donos } = await supabaseAdmin
      .from('USUARIO')
      .select('ID_USUARIO, NOME, EMAIL')
      .in('ID_USUARIO', donoIds)

    const agendasMap = new Map(agendas?.map((a) => [a.ID_AGENDA, a]) || [])
    const donosMap = new Map(donos?.map((d) => [d.ID_USUARIO, d]) || [])

    recebidos = recebidosData.map((r) => {
      const agendaInfo = agendasMap.get(r.ID_AGENDA)
      return {
        ...r,
        agenda: agendaInfo || null,
        dono: agendaInfo ? donosMap.get(agendaInfo.ID_USUARIO) || null : null,
      }
    })
  }

  return NextResponse.json({ enviados, recebidos })
}

// POST - Criar novo compartilhamento (convidar alguém)
export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient()
  const supabaseAdmin = createSupabaseAdmin()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (!user || authError) {
    return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
  }

  const body = await req.json()
  const { email, permissao } = body

  if (!email) {
    return NextResponse.json({ message: 'Email é obrigatório' }, { status: 400 })
  }

  const perm = permissao === 'EDITAR' ? 'EDITAR' : 'VISUALIZAR'

  // Não pode compartilhar consigo mesmo
  if (email.toLowerCase() === user.email?.toLowerCase()) {
    return NextResponse.json(
      { message: 'Você não pode compartilhar a agenda consigo mesmo' },
      { status: 400 }
    )
  }

  // Buscar agenda do usuário autenticado
  const { data: agenda, error: agendaError } = await supabaseAdmin
    .from('AGENDA')
    .select('ID_AGENDA')
    .eq('ID_USUARIO', user.id)
    .single()

  if (agendaError || !agenda) {
    return NextResponse.json({ message: 'Agenda não encontrada' }, { status: 404 })
  }

  // Buscar o usuário convidado pelo email
  const { data: convidado } = await supabaseAdmin
    .from('USUARIO')
    .select('ID_USUARIO, NOME, EMAIL')
    .eq('EMAIL', email.toLowerCase())
    .single()

  if (!convidado) {
    return NextResponse.json(
      { message: 'Usuário não encontrado. O usuário precisa ter uma conta no AgendAI.' },
      { status: 404 }
    )
  }

  // Verificar se já existe compartilhamento
  const { data: existente } = await supabaseAdmin
    .from('COMPARTILHAMENTO_AGENDA')
    .select('ID_COMPARTILHAMENTO, STATUS')
    .eq('ID_AGENDA', agenda.ID_AGENDA)
    .eq('ID_USUARIO_CONVIDADO', convidado.ID_USUARIO)
    .single()

  if (existente) {
    if (existente.STATUS === 'ACEITO') {
      return NextResponse.json(
        { message: 'Esta agenda já está compartilhada com este usuário' },
        { status: 409 }
      )
    }
    if (existente.STATUS === 'PENDENTE') {
      return NextResponse.json(
        { message: 'Já existe um convite pendente para este usuário' },
        { status: 409 }
      )
    }
    // Se foi recusado, permite reenviar (deleta o antigo e cria novo)
    await supabaseAdmin
      .from('COMPARTILHAMENTO_AGENDA')
      .delete()
      .eq('ID_COMPARTILHAMENTO', existente.ID_COMPARTILHAMENTO)
  }

  // Criar compartilhamento
  const { data: compartilhamento, error: insertError } = await supabaseAdmin
    .from('COMPARTILHAMENTO_AGENDA')
    .insert({
      ID_AGENDA: agenda.ID_AGENDA,
      ID_USUARIO_CONVIDADO: convidado.ID_USUARIO,
      PERMISSAO: perm,
      STATUS: 'PENDENTE',
    })
    .select()
    .single()

  if (insertError) {
    return NextResponse.json({ message: insertError.message }, { status: 400 })
  }

  return NextResponse.json(
    { message: 'Convite enviado com sucesso', compartilhamento },
    { status: 201 }
  )
}

// PUT - Atualizar compartilhamento (aceitar/recusar convite ou alterar permissão)
export async function PUT(req: Request) {
  const supabase = await createSupabaseServerClient()
  const supabaseAdmin = createSupabaseAdmin()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (!user || authError) {
    return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
  }

  const body = await req.json()
  const { ID_COMPARTILHAMENTO, status, permissao } = body

  if (!ID_COMPARTILHAMENTO) {
    return NextResponse.json({ message: 'ID_COMPARTILHAMENTO é obrigatório' }, { status: 400 })
  }

  // Buscar o compartilhamento
  const { data: compart, error: findError } = await supabaseAdmin
    .from('COMPARTILHAMENTO_AGENDA')
    .select('*, AGENDA:ID_AGENDA(ID_USUARIO)')
    .eq('ID_COMPARTILHAMENTO', ID_COMPARTILHAMENTO)
    .single()

  if (findError || !compart) {
    return NextResponse.json({ message: 'Compartilhamento não encontrado' }, { status: 404 })
  }

  const updateData: any = {}

  // Convidado pode aceitar/recusar
  if (status && compart.ID_USUARIO_CONVIDADO === user.id) {
    if (status !== 'ACEITO' && status !== 'RECUSADO') {
      return NextResponse.json({ message: 'Status inválido' }, { status: 400 })
    }
    updateData.STATUS = status
  }

  // Dono da agenda pode alterar permissão
  if (permissao && (compart as any).AGENDA?.ID_USUARIO === user.id) {
    if (permissao !== 'VISUALIZAR' && permissao !== 'EDITAR') {
      return NextResponse.json({ message: 'Permissão inválida' }, { status: 400 })
    }
    updateData.PERMISSAO = permissao
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ message: 'Nenhuma alteração permitida' }, { status: 403 })
  }

  const { data: updated, error: updateError } = await supabaseAdmin
    .from('COMPARTILHAMENTO_AGENDA')
    .update(updateData)
    .eq('ID_COMPARTILHAMENTO', ID_COMPARTILHAMENTO)
    .select()
    .single()

  if (updateError) {
    return NextResponse.json({ message: updateError.message }, { status: 400 })
  }

  return NextResponse.json({ message: 'Compartilhamento atualizado', compartilhamento: updated })
}

// DELETE - Remover compartilhamento (dono cancela ou convidado sai)
export async function DELETE(req: Request) {
  const supabase = await createSupabaseServerClient()
  const supabaseAdmin = createSupabaseAdmin()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (!user || authError) {
    return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
  }

  const url = new URL(req.url)
  const id = url.searchParams.get('id')

  if (!id) {
    return NextResponse.json({ message: 'ID do compartilhamento é obrigatório' }, { status: 400 })
  }

  // Buscar compartilhamento
  const { data: compart, error: findError } = await supabaseAdmin
    .from('COMPARTILHAMENTO_AGENDA')
    .select('*, AGENDA:ID_AGENDA(ID_USUARIO)')
    .eq('ID_COMPARTILHAMENTO', id)
    .single()

  if (findError || !compart) {
    return NextResponse.json({ message: 'Compartilhamento não encontrado' }, { status: 404 })
  }

  // Verificar permissão: dono da agenda ou convidado
  const isDono = (compart as any).AGENDA?.ID_USUARIO === user.id
  const isConvidado = compart.ID_USUARIO_CONVIDADO === user.id

  if (!isDono && !isConvidado) {
    return NextResponse.json({ message: 'Sem permissão' }, { status: 403 })
  }

  const { error: deleteError } = await supabaseAdmin
    .from('COMPARTILHAMENTO_AGENDA')
    .delete()
    .eq('ID_COMPARTILHAMENTO', id)

  if (deleteError) {
    return NextResponse.json({ message: deleteError.message }, { status: 400 })
  }

  return NextResponse.json({ message: 'Compartilhamento removido com sucesso' })
}
