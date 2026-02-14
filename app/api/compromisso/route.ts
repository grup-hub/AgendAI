import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

// Helper: autenticar via cookie (web) ou Bearer token (mobile)
async function getAuthenticatedUser(req: Request) {
  const authHeader = req.headers.get('authorization')

  if (authHeader?.startsWith('Bearer ')) {
    // Mobile: autenticação via token
    const token = authHeader.replace('Bearer ', '')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    )
    const { data: { user }, error } = await supabase.auth.getUser(token)
    return { user, error }
  }

  // Web: autenticação via cookie
  const supabase = await createSupabaseServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  return { user, error }
}

export async function GET(req: Request) {
  const supabaseAdmin = createSupabaseAdmin()

  // Verificar usuário autenticado
  const { user, error: authError } = await getAuthenticatedUser(req)
  if (!user || authError) {
    return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
  }

  // Buscar agenda do usuário
  const { data: agenda, error: agendaError } = await supabaseAdmin
    .from('AGENDA')
    .select('ID_AGENDA, NOME')
    .eq('ID_USUARIO', user.id)
    .single()

  if (agendaError || !agenda) {
    return NextResponse.json({ message: 'Agenda não encontrada' }, { status: 404 })
  }

  // Buscar compromissos da própria agenda
  const { data: meusCompromissos, error: compromissoError } = await supabaseAdmin
    .from('COMPROMISSO')
    .select(
      `
      ID_COMPROMISSO,
      ID_AGENDA,
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

  // Buscar agendas compartilhadas aceitas
  const { data: compartilhamentos } = await supabaseAdmin
    .from('COMPARTILHAMENTO_AGENDA')
    .select('ID_AGENDA, PERMISSAO')
    .eq('ID_USUARIO_CONVIDADO', user.id)
    .eq('STATUS', 'ACEITO')

  let compartilhados: any[] = []
  let agendasInfo: any[] = []

  if (compartilhamentos && compartilhamentos.length > 0) {
    const agendaIds = compartilhamentos.map((c) => c.ID_AGENDA)

    // Buscar info das agendas compartilhadas e seus donos
    const { data: agendasCompart } = await supabaseAdmin
      .from('AGENDA')
      .select('ID_AGENDA, NOME, ID_USUARIO')
      .in('ID_AGENDA', agendaIds)

    if (agendasCompart && agendasCompart.length > 0) {
      const donoIds = agendasCompart.map((a) => a.ID_USUARIO)
      const { data: donos } = await supabaseAdmin
        .from('USUARIO')
        .select('ID_USUARIO, NOME, EMAIL')
        .in('ID_USUARIO', donoIds)

      const donosMap = new Map(donos?.map((d) => [d.ID_USUARIO, d]) || [])
      const permissaoMap = new Map(compartilhamentos.map((c) => [c.ID_AGENDA, c.PERMISSAO]))

      agendasInfo = agendasCompart.map((a) => ({
        ID_AGENDA: a.ID_AGENDA,
        NOME: a.NOME,
        dono: donosMap.get(a.ID_USUARIO) || null,
        PERMISSAO: permissaoMap.get(a.ID_AGENDA) || 'VISUALIZAR',
      }))

      // Buscar compromissos de todas as agendas compartilhadas
      const { data: compromissosCompart } = await supabaseAdmin
        .from('COMPROMISSO')
        .select(
          `
          ID_COMPROMISSO,
          ID_AGENDA,
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
        .in('ID_AGENDA', agendaIds)
        .order('DATA_INICIO', { ascending: true })

      compartilhados = compromissosCompart || []
    }
  }

  // Marcar compromissos com informação de origem
  const meusComLabel = (meusCompromissos || []).map((c) => ({
    ...c,
    agenda_nome: agenda.NOME,
    compartilhado: false,
  }))

  const agendasInfoMap = new Map(agendasInfo.map((a) => [a.ID_AGENDA, a]))
  const compartLabel = compartilhados.map((c: any) => {
    const agInfo = agendasInfoMap.get(c.ID_AGENDA)
    return {
      ...c,
      agenda_nome: agInfo?.NOME || 'Agenda compartilhada',
      dono_nome: agInfo?.dono?.NOME || agInfo?.dono?.EMAIL || '',
      compartilhado: true,
      permissao: agInfo?.PERMISSAO || 'VISUALIZAR',
    }
  })

  // Juntar tudo e ordenar por data
  const todosCompromissos = [...meusComLabel, ...compartLabel].sort(
    (a, b) => new Date(a.DATA_INICIO).getTime() - new Date(b.DATA_INICIO).getTime()
  )

  return NextResponse.json({
    compromissos: todosCompromissos,
    agendasCompartilhadas: agendasInfo,
  })
}

export async function POST(req: Request) {
  const supabaseAdmin = createSupabaseAdmin()

  // Verificar usuário autenticado
  const { user, error: authError } = await getAuthenticatedUser(req)
  if (!user || authError) {
    return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
  }

  // Pegar dados do body
  const body = await req.json()
  const { TITULO, DESCRICAO, LOCAL, DATA_INICIO, DATA_FIM, ORIGEM, LEMBRETE_MINUTOS } = body

  // Validações básicas
  if (!TITULO || !DATA_INICIO) {
    return NextResponse.json(
      { message: 'TITULO e DATA_INICIO são obrigatórios' },
      { status: 400 }
    )
  }

  // Buscar agenda do usuário
  const { data: agenda, error: agendaError } = await supabaseAdmin
    .from('AGENDA')
    .select('ID_AGENDA')
    .eq('ID_USUARIO', user.id)
    .single()

  if (agendaError || !agenda) {
    return NextResponse.json({ message: 'Agenda não encontrada' }, { status: 404 })
  }

  // Criar compromisso (via admin para bypassar RLS)
  const { data: compromisso, error: compromissoError } = await supabaseAdmin
    .from('COMPROMISSO')
    .insert({
      ID_AGENDA: agenda.ID_AGENDA,
      TITULO,
      DESCRICAO: DESCRICAO || null,
      LOCAL: LOCAL || null,
      DATA_INICIO,
      DATA_FIM: DATA_FIM || DATA_INICIO,
      ORIGEM: ORIGEM || 'MANUAL',
      CRIADO_POR: user.id,
      STATUS: 'ATIVO',
    })
    .select()
    .single()

  if (compromissoError) {
    return NextResponse.json({ message: compromissoError.message }, { status: 400 })
  }

  // Criar lembrete WhatsApp automaticamente se o usuário tem WhatsApp ativado
  if (compromisso) {
    try {
      const { data: dispositivo } = await supabaseAdmin
        .from('DISPOSITIVO_PUSH')
        .select('ID_DISPOSITIVO')
        .eq('ID_USUARIO', user.id)
        .eq('PROVIDER', 'WHATSAPP')
        .eq('ATIVO', true)
        .single()

      if (dispositivo) {
        const minutos = LEMBRETE_MINUTOS ? parseInt(LEMBRETE_MINUTOS) : 60
        await supabaseAdmin.from('LEMBRETE').insert({
          ID_COMPROMISSO: compromisso.ID_COMPROMISSO,
          TIPO: 'WHATSAPP',
          ANTECEDENCIA_MINUTOS: minutos > 0 ? minutos : 60,
          ENVIADO: false,
        })
      }
    } catch {
      // Não bloqueia a criação do compromisso se o lembrete falhar
    }
  }

  return NextResponse.json({ message: 'Compromisso criado com sucesso', compromisso }, { status: 201 })
}

export async function PUT(req: Request) {
  const supabaseAdmin = createSupabaseAdmin()

  // Verificar usuário autenticado
  const { user, error: authError } = await getAuthenticatedUser(req)
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
  const { data: compromisso, error: checkError } = await supabaseAdmin
    .from('COMPROMISSO')
    .select('ID_AGENDA')
    .eq('ID_COMPROMISSO', ID_COMPROMISSO)
    .single()

  if (checkError || !compromisso) {
    return NextResponse.json({ message: 'Compromisso não encontrado' }, { status: 404 })
  }

  // Verificar se a agenda pertence ao usuário
  const { data: agenda, error: agendaError } = await supabaseAdmin
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

  const { data: updated, error: updateError } = await supabaseAdmin
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
  const supabaseAdmin = createSupabaseAdmin()

  // Verificar usuário autenticado
  const { user, error: authError } = await getAuthenticatedUser(req)
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
  const { data: compromisso, error: checkError } = await supabaseAdmin
    .from('COMPROMISSO')
    .select('ID_AGENDA')
    .eq('ID_COMPROMISSO', idCompromisso)
    .single()

  if (checkError || !compromisso) {
    return NextResponse.json({ message: 'Compromisso não encontrado' }, { status: 404 })
  }

  // Verificar se a agenda pertence ao usuário
  const { data: agenda, error: agendaError } = await supabaseAdmin
    .from('AGENDA')
    .select('ID_AGENDA')
    .eq('ID_AGENDA', compromisso.ID_AGENDA)
    .eq('ID_USUARIO', user.id)
    .single()

  if (agendaError || !agenda) {
    return NextResponse.json({ message: 'Sem permissão para deletar este compromisso' }, { status: 403 })
  }

  // Deletar compromisso
  const { error: deleteError } = await supabaseAdmin
    .from('COMPROMISSO')
    .delete()
    .eq('ID_COMPROMISSO', idCompromisso)

  if (deleteError) {
    return NextResponse.json({ message: deleteError.message }, { status: 400 })
  }

  return NextResponse.json({ message: 'Compromisso deletado com sucesso' })
}
