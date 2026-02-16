import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabase/admin'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/supabase/config'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

// Helper: autenticar via cookie (web) ou Bearer token (mobile)
async function getAuthenticatedUser(req: Request) {
  const authHeader = req.headers.get('authorization')

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.replace('Bearer ', '')
    const supabase = createClient(
      SUPABASE_URL,
      SUPABASE_ANON_KEY,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    )
    const { data: { user }, error } = await supabase.auth.getUser(token)
    return { user, error }
  }

  const supabase = await createSupabaseServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  return { user, error }
}

// GET - Listar compartilhamentos de compromisso (enviados e recebidos)
export async function GET(req: Request) {
  const supabaseAdmin = createSupabaseAdmin()

  const { user, error: authError } = await getAuthenticatedUser(req)
  if (!user || authError) {
    return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
  }

  // Convites enviados por mim
  const { data: enviadosData } = await supabaseAdmin
    .from('COMPARTILHAMENTO_COMPROMISSO')
    .select('*')
    .eq('ID_USUARIO_REMETENTE', user.id)
    .order('DATA_COMPARTILHAMENTO', { ascending: false })

  let enviados: any[] = []
  if (enviadosData && enviadosData.length > 0) {
    // Buscar dados dos destinatários
    const destIds = enviadosData.map(e => e.ID_USUARIO_DESTINATARIO)
    const { data: destinatarios } = await supabaseAdmin
      .from('USUARIO')
      .select('ID_USUARIO, NOME, EMAIL')
      .in('ID_USUARIO', destIds)

    // Buscar dados dos compromissos de origem
    const compIds = enviadosData.map(e => e.ID_COMPROMISSO_ORIGEM)
    const { data: compromissos } = await supabaseAdmin
      .from('COMPROMISSO')
      .select('ID_COMPROMISSO, TITULO, DATA_INICIO, DATA_FIM, LOCAL')
      .in('ID_COMPROMISSO', compIds)

    const destMap = new Map(destinatarios?.map(d => [d.ID_USUARIO, d]) || [])
    const compMap = new Map(compromissos?.map(c => [c.ID_COMPROMISSO, c]) || [])

    enviados = enviadosData.map(e => ({
      ...e,
      destinatario: destMap.get(e.ID_USUARIO_DESTINATARIO) || null,
      compromisso: compMap.get(e.ID_COMPROMISSO_ORIGEM) || null,
      tipo: 'COMPROMISSO',
    }))
  }

  // Convites recebidos por mim
  const { data: recebidosData } = await supabaseAdmin
    .from('COMPARTILHAMENTO_COMPROMISSO')
    .select('*')
    .eq('ID_USUARIO_DESTINATARIO', user.id)
    .order('DATA_COMPARTILHAMENTO', { ascending: false })

  let recebidos: any[] = []
  if (recebidosData && recebidosData.length > 0) {
    // Buscar dados dos remetentes
    const remIds = recebidosData.map(r => r.ID_USUARIO_REMETENTE)
    const { data: remetentes } = await supabaseAdmin
      .from('USUARIO')
      .select('ID_USUARIO, NOME, EMAIL')
      .in('ID_USUARIO', remIds)

    // Buscar dados dos compromissos de origem
    const compIds = recebidosData.map(r => r.ID_COMPROMISSO_ORIGEM)
    const { data: compromissos } = await supabaseAdmin
      .from('COMPROMISSO')
      .select('ID_COMPROMISSO, TITULO, DATA_INICIO, DATA_FIM, LOCAL')
      .in('ID_COMPROMISSO', compIds)

    const remMap = new Map(remetentes?.map(r => [r.ID_USUARIO, r]) || [])
    const compMap = new Map(compromissos?.map(c => [c.ID_COMPROMISSO, c]) || [])

    recebidos = recebidosData.map(r => ({
      ...r,
      remetente: remMap.get(r.ID_USUARIO_REMETENTE) || null,
      compromisso: compMap.get(r.ID_COMPROMISSO_ORIGEM) || null,
      tipo: 'COMPROMISSO',
    }))
  }

  return NextResponse.json({ enviados, recebidos })
}

// POST - Compartilhar um compromisso com outro usuário
export async function POST(req: Request) {
  const supabaseAdmin = createSupabaseAdmin()

  const { user, error: authError } = await getAuthenticatedUser(req)
  if (!user || authError) {
    return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
  }

  const body = await req.json()
  const { id_compromisso, email } = body

  if (!id_compromisso || !email) {
    return NextResponse.json({ message: 'Compromisso e email são obrigatórios' }, { status: 400 })
  }

  // Não pode compartilhar consigo mesmo
  if (email.toLowerCase() === user.email?.toLowerCase()) {
    return NextResponse.json(
      { message: 'Você não pode compartilhar consigo mesmo' },
      { status: 400 }
    )
  }

  // Buscar agenda do remetente
  const { data: agenda } = await supabaseAdmin
    .from('AGENDA')
    .select('ID_AGENDA')
    .eq('ID_USUARIO', user.id)
    .single()

  if (!agenda) {
    return NextResponse.json({ message: 'Agenda não encontrada' }, { status: 404 })
  }

  // Verificar que o compromisso pertence à agenda do remetente
  const { data: compromisso } = await supabaseAdmin
    .from('COMPROMISSO')
    .select('ID_COMPROMISSO, TITULO')
    .eq('ID_COMPROMISSO', id_compromisso)
    .eq('ID_AGENDA', agenda.ID_AGENDA)
    .single()

  if (!compromisso) {
    return NextResponse.json(
      { message: 'Compromisso não encontrado ou não pertence à sua agenda' },
      { status: 404 }
    )
  }

  // Buscar o destinatário pelo email
  const { data: destinatario } = await supabaseAdmin
    .from('USUARIO')
    .select('ID_USUARIO, NOME, EMAIL')
    .eq('EMAIL', email.toLowerCase())
    .single()

  if (!destinatario) {
    return NextResponse.json(
      { message: 'Usuário não encontrado. O usuário precisa ter uma conta no AgendAI.' },
      { status: 404 }
    )
  }

  // Verificar se já existe compartilhamento pendente
  const { data: existente } = await supabaseAdmin
    .from('COMPARTILHAMENTO_COMPROMISSO')
    .select('ID, STATUS')
    .eq('ID_COMPROMISSO_ORIGEM', id_compromisso)
    .eq('ID_USUARIO_DESTINATARIO', destinatario.ID_USUARIO)
    .in('STATUS', ['PENDENTE', 'ACEITO'])
    .single()

  if (existente) {
    if (existente.STATUS === 'ACEITO') {
      return NextResponse.json(
        { message: 'Este compromisso já foi compartilhado com este usuário' },
        { status: 409 }
      )
    }
    return NextResponse.json(
      { message: 'Já existe um convite pendente para este usuário' },
      { status: 409 }
    )
  }

  // Criar compartilhamento
  const { data: compartilhamento, error: insertError } = await supabaseAdmin
    .from('COMPARTILHAMENTO_COMPROMISSO')
    .insert({
      ID_COMPROMISSO_ORIGEM: id_compromisso,
      ID_USUARIO_REMETENTE: user.id,
      ID_USUARIO_DESTINATARIO: destinatario.ID_USUARIO,
      STATUS: 'PENDENTE',
    })
    .select()
    .single()

  if (insertError) {
    return NextResponse.json({ message: insertError.message }, { status: 400 })
  }

  return NextResponse.json(
    { message: `Compromisso compartilhado com ${destinatario.NOME || destinatario.EMAIL}!`, compartilhamento },
    { status: 201 }
  )
}

// PUT - Aceitar/recusar convite de compromisso
export async function PUT(req: Request) {
  const supabaseAdmin = createSupabaseAdmin()

  const { user, error: authError } = await getAuthenticatedUser(req)
  if (!user || authError) {
    return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
  }

  const body = await req.json()
  const { id, status } = body

  if (!id || !status) {
    return NextResponse.json({ message: 'ID e status são obrigatórios' }, { status: 400 })
  }

  if (status !== 'ACEITO' && status !== 'RECUSADO') {
    return NextResponse.json({ message: 'Status inválido' }, { status: 400 })
  }

  // Buscar o compartilhamento
  const { data: compart } = await supabaseAdmin
    .from('COMPARTILHAMENTO_COMPROMISSO')
    .select('*')
    .eq('ID', id)
    .eq('ID_USUARIO_DESTINATARIO', user.id)
    .eq('STATUS', 'PENDENTE')
    .single()

  if (!compart) {
    return NextResponse.json({ message: 'Convite não encontrado ou já respondido' }, { status: 404 })
  }

  if (status === 'RECUSADO') {
    // Apenas recusar
    await supabaseAdmin
      .from('COMPARTILHAMENTO_COMPROMISSO')
      .update({ STATUS: 'RECUSADO' })
      .eq('ID', id)

    return NextResponse.json({ message: 'Convite recusado' })
  }

  // ACEITAR — criar cópia do compromisso na agenda do destinatário

  // 1. Buscar dados do compromisso original
  const { data: compOriginal } = await supabaseAdmin
    .from('COMPROMISSO')
    .select('*')
    .eq('ID_COMPROMISSO', compart.ID_COMPROMISSO_ORIGEM)
    .single()

  if (!compOriginal) {
    return NextResponse.json({ message: 'Compromisso original não encontrado' }, { status: 404 })
  }

  // 2. Buscar agenda do destinatário
  const { data: agendaDest } = await supabaseAdmin
    .from('AGENDA')
    .select('ID_AGENDA')
    .eq('ID_USUARIO', user.id)
    .single()

  if (!agendaDest) {
    return NextResponse.json({ message: 'Sua agenda não foi encontrada' }, { status: 404 })
  }

  // 3. Criar cópia do compromisso
  const { data: copia, error: copiaError } = await supabaseAdmin
    .from('COMPROMISSO')
    .insert({
      ID_AGENDA: agendaDest.ID_AGENDA,
      TITULO: compOriginal.TITULO,
      DESCRICAO: compOriginal.DESCRICAO,
      LOCAL: compOriginal.LOCAL,
      DATA_INICIO: compOriginal.DATA_INICIO,
      DATA_FIM: compOriginal.DATA_FIM,
      ORIGEM: 'COMPARTILHADO',
      STATUS: 'ATIVO',
      CRIADO_POR: user.id,
    })
    .select()
    .single()

  if (copiaError) {
    return NextResponse.json({ message: 'Erro ao criar cópia do compromisso: ' + copiaError.message }, { status: 400 })
  }

  // 4. Atualizar compartilhamento com o ID da cópia
  await supabaseAdmin
    .from('COMPARTILHAMENTO_COMPROMISSO')
    .update({
      STATUS: 'ACEITO',
      ID_COMPROMISSO_COPIA: copia.ID_COMPROMISSO,
    })
    .eq('ID', id)

  return NextResponse.json({
    message: 'Compromisso aceito e adicionado à sua agenda!',
    compromisso: copia,
  })
}

// DELETE - Remover/cancelar compartilhamento
export async function DELETE(req: Request) {
  const supabaseAdmin = createSupabaseAdmin()

  const { user, error: authError } = await getAuthenticatedUser(req)
  if (!user || authError) {
    return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
  }

  const url = new URL(req.url)
  const id = url.searchParams.get('id')

  if (!id) {
    return NextResponse.json({ message: 'ID é obrigatório' }, { status: 400 })
  }

  // Buscar compartilhamento
  const { data: compart } = await supabaseAdmin
    .from('COMPARTILHAMENTO_COMPROMISSO')
    .select('*')
    .eq('ID', id)
    .single()

  if (!compart) {
    return NextResponse.json({ message: 'Compartilhamento não encontrado' }, { status: 404 })
  }

  // Verificar permissão: remetente ou destinatário
  if (compart.ID_USUARIO_REMETENTE !== user.id && compart.ID_USUARIO_DESTINATARIO !== user.id) {
    return NextResponse.json({ message: 'Sem permissão' }, { status: 403 })
  }

  const { error: deleteError } = await supabaseAdmin
    .from('COMPARTILHAMENTO_COMPROMISSO')
    .delete()
    .eq('ID', id)

  if (deleteError) {
    return NextResponse.json({ message: deleteError.message }, { status: 400 })
  }

  return NextResponse.json({ message: 'Compartilhamento removido' })
}
