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
    // Mobile: autenticação via token
    const token = authHeader.replace('Bearer ', '')
    const supabase = createClient(
      SUPABASE_URL,
      SUPABASE_ANON_KEY,
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

  const url = new URL(req.url)
  const soArquivados = url.searchParams.get('arquivados') === 'true'

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
  let queryMeus = supabaseAdmin
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
      URGENTE,
      IMPORTANCIA,
      ARQUIVADO,
      ANTECEDENCIA_LEMBRETE_MINUTOS,
      RECORRENCIA_TIPO,
      RECORRENCIA_INTERVALO,
      RECORRENCIA_DIAS_SEMANA,
      RECORRENCIA_FIM,
      ID_COMPROMISSO_ORIGEM,
      CRIADO_POR,
      DATA_CADASTRO,
      LEMBRETE(ID_LEMBRETE, TIPO, ANTECEDENCIA_MINUTOS, ENVIADO)
    `
    )
    .eq('ID_AGENDA', agenda.ID_AGENDA)
    .order('DATA_INICIO', { ascending: true })

  if (soArquivados) {
    queryMeus = queryMeus.eq('ARQUIVADO', true)
  } else {
    queryMeus = queryMeus.or('ARQUIVADO.eq.false,ARQUIVADO.is.null')
  }

  const { data: meusCompromissos, error: compromissoError } = await queryMeus

  if (compromissoError) {
    return NextResponse.json({ message: compromissoError.message }, { status: 400 })
  }

  // Se for modo arquivados, retorna apenas os próprios (sem compartilhados)
  if (soArquivados) {
    const meusComLabel = (meusCompromissos || []).map((c) => ({
      ...c,
      agenda_nome: agenda.NOME,
      compartilhado: false,
    }))
    return NextResponse.json({ compromissos: meusComLabel, agendasCompartilhadas: [] })
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

      // Buscar compromissos de todas as agendas compartilhadas (não arquivados)
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
          URGENTE,
          IMPORTANCIA,
          ARQUIVADO,
          ANTECEDENCIA_LEMBRETE_MINUTOS,
          RECORRENCIA_TIPO,
          RECORRENCIA_INTERVALO,
          RECORRENCIA_DIAS_SEMANA,
          RECORRENCIA_FIM,
          ID_COMPROMISSO_ORIGEM,
          CRIADO_POR,
          DATA_CADASTRO,
          LEMBRETE(ID_LEMBRETE, TIPO, ANTECEDENCIA_MINUTOS, ENVIADO)
        `
        )
        .in('ID_AGENDA', agendaIds)
        .or('ARQUIVADO.eq.false,ARQUIVADO.is.null')
        .order('DATA_INICIO', { ascending: true })

      compartilhados = compromissosCompart || []
    }
  }

  // Buscar com quem EU compartilhei cada compromisso (para exibir na lista)
  let destinatariosMap = new Map<string, any[]>()
  if (meusCompromissos && meusCompromissos.length > 0) {
    const meusIds = meusCompromissos.map((c: any) => c.ID_COMPROMISSO)
    const { data: compShares } = await supabaseAdmin
      .from('COMPARTILHAMENTO_COMPROMISSO')
      .select('ID_COMPROMISSO_ORIGEM, ID_USUARIO_DESTINATARIO, STATUS')
      .in('ID_COMPROMISSO_ORIGEM', meusIds)
      .in('STATUS', ['PENDENTE', 'ACEITO'])
      .eq('ID_USUARIO_REMETENTE', user.id)

    if (compShares && compShares.length > 0) {
      const destIds = Array.from(new Set(compShares.map((c: any) => c.ID_USUARIO_DESTINATARIO))) as string[]
      const { data: destUsers } = await supabaseAdmin
        .from('USUARIO')
        .select('ID_USUARIO, NOME, EMAIL')
        .in('ID_USUARIO', destIds)

      const destUsersMap = new Map(destUsers?.map((u: any) => [u.ID_USUARIO, u]) || [])
      compShares.forEach((c: any) => {
        const dest = destUsersMap.get(c.ID_USUARIO_DESTINATARIO)
        if (dest) {
          if (!destinatariosMap.has(c.ID_COMPROMISSO_ORIGEM)) {
            destinatariosMap.set(c.ID_COMPROMISSO_ORIGEM, [])
          }
          destinatariosMap.get(c.ID_COMPROMISSO_ORIGEM)!.push({
            nome: dest.NOME || dest.EMAIL,
            email: dest.EMAIL,
            status: c.STATUS,
          })
        }
      })
    }
  }

  // Detectar cópias de compartilhamentos individuais aceitos (ORIGEM = 'COMPARTILHADO')
  let copiaPermissaoMap = new Map<string, { permissao: string; dono_nome: string }>()
  const copias = (meusCompromissos || []).filter((c: any) => c.ORIGEM === 'COMPARTILHADO')
  if (copias.length > 0) {
    const copiaIds = copias.map((c: any) => c.ID_COMPROMISSO)
    const { data: compartCopias } = await supabaseAdmin
      .from('COMPARTILHAMENTO_COMPROMISSO')
      .select('ID_COMPROMISSO_COPIA, PERMISSAO, ID_USUARIO_REMETENTE')
      .in('ID_COMPROMISSO_COPIA', copiaIds)
      .eq('STATUS', 'ACEITO')

    if (compartCopias && compartCopias.length > 0) {
      const remIds = Array.from(new Set(compartCopias.map((c: any) => c.ID_USUARIO_REMETENTE))) as string[]
      const { data: remUsers } = await supabaseAdmin
        .from('USUARIO')
        .select('ID_USUARIO, NOME, EMAIL')
        .in('ID_USUARIO', remIds)
      const remMap = new Map(remUsers?.map((u: any) => [u.ID_USUARIO, u]) || [])

      compartCopias.forEach((cc: any) => {
        const rem = remMap.get(cc.ID_USUARIO_REMETENTE)
        copiaPermissaoMap.set(cc.ID_COMPROMISSO_COPIA, {
          permissao: cc.PERMISSAO || 'VISUALIZAR',
          dono_nome: rem?.NOME || rem?.EMAIL || '',
        })
      })
    }
  }

  // Marcar compromissos com informação de origem
  const meusComLabel = (meusCompromissos || []).map((c: any) => {
    const copiaInfo = copiaPermissaoMap.get(c.ID_COMPROMISSO)
    return {
      ...c,
      agenda_nome: agenda.NOME,
      compartilhado: !!copiaInfo,
      dono_nome: copiaInfo?.dono_nome || undefined,
      permissao: copiaInfo?.permissao || undefined,
      destinatarios: destinatariosMap.get(c.ID_COMPROMISSO) || [],
    }
  })

  const agendasInfoMap = new Map(agendasInfo.map((a) => [a.ID_AGENDA, a]))
  // IDs dos compromissos próprios do usuário (para filtrar cópias que voltam via agenda compartilhada)
  const meuIds = new Set((meusCompromissos || []).map((c: any) => c.ID_COMPROMISSO))
  const compartLabel = compartilhados
    .filter((c: any) => c.CRIADO_POR !== user.id)  // evita duplicata de compromissos próprios via agenda compartilhada
    .filter((c: any) => !c.ID_COMPROMISSO_ORIGEM || !meuIds.has(c.ID_COMPROMISSO_ORIGEM))  // evita cópia de compromisso meu (compartilhado individualmente) voltando via agenda compartilhada
    .map((c: any) => {
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
    const authHeader = req.headers.get('authorization')
    return NextResponse.json({
      message: 'Não autorizado',
      debug: {
        hasAuthHeader: !!authHeader,
        authHeaderPrefix: authHeader ? authHeader.substring(0, 20) + '...' : null,
        errorMessage: authError?.message || 'user is null',
      }
    }, { status: 401 })
  }

  // Pegar dados do body
  const body = await req.json()
  const {
    TITULO, DESCRICAO, LOCAL, DATA_INICIO, DATA_FIM, ORIGEM, URGENTE, IMPORTANCIA,
    ANTECEDENCIA_LEMBRETE_MINUTOS,
    RECORRENCIA_TIPO, RECORRENCIA_INTERVALO, RECORRENCIA_DIAS_SEMANA, RECORRENCIA_FIM,
  } = body

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

  const antecedenciaMinutos = ANTECEDENCIA_LEMBRETE_MINUTOS ?? 30

  // Criar compromisso principal
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
      URGENTE: URGENTE === true,
      IMPORTANCIA: IMPORTANCIA ?? null,
      ANTECEDENCIA_LEMBRETE_MINUTOS: antecedenciaMinutos,
      RECORRENCIA_TIPO: RECORRENCIA_TIPO || null,
      RECORRENCIA_INTERVALO: RECORRENCIA_INTERVALO || null,
      RECORRENCIA_DIAS_SEMANA: RECORRENCIA_DIAS_SEMANA ? JSON.stringify(RECORRENCIA_DIAS_SEMANA) : null,
      RECORRENCIA_FIM: RECORRENCIA_FIM || null,
    })
    .select()
    .single()

  if (compromissoError) {
    return NextResponse.json({ message: compromissoError.message }, { status: 400 })
  }

  // Gerar compromissos filhos da recorrência
  if (compromisso && RECORRENCIA_TIPO) {
    try {
      const dataInicial = new Date(DATA_INICIO)
      const dataFimOriginal = new Date(DATA_FIM || DATA_INICIO)
      const duracaoMs = dataFimOriginal.getTime() - dataInicial.getTime()
      const limite = RECORRENCIA_FIM
        ? new Date(RECORRENCIA_FIM)
        : RECORRENCIA_TIPO === 'ANUAL'
          ? new Date(dataInicial.getFullYear() + 5, dataInicial.getMonth(), dataInicial.getDate())
          : new Date(dataInicial.getTime() + 365 * 24 * 60 * 60 * 1000) // máx 12 meses

      const filhos: any[] = []
      const dataAtual = new Date(dataInicial)

      while (filhos.length < 365) {
        // Avançar para próxima ocorrência
        if (RECORRENCIA_TIPO === 'DIARIA') {
          dataAtual.setDate(dataAtual.getDate() + 1)
        } else if (RECORRENCIA_TIPO === 'SEMANAL') {
          // Avança 1 dia e verifica se é um dos dias selecionados
          dataAtual.setDate(dataAtual.getDate() + 1)
          const diasSemana: number[] = Array.isArray(RECORRENCIA_DIAS_SEMANA) ? RECORRENCIA_DIAS_SEMANA : []
          // Pular dias que não estão na lista
          let tentativas = 0
          while (!diasSemana.includes(dataAtual.getDay()) && tentativas < 7) {
            dataAtual.setDate(dataAtual.getDate() + 1)
            tentativas++
          }
          if (!diasSemana.includes(dataAtual.getDay())) break
        } else if (RECORRENCIA_TIPO === 'MENSAL') {
          dataAtual.setMonth(dataAtual.getMonth() + 1)
        } else if (RECORRENCIA_TIPO === 'PERSONALIZADA') {
          const intervalo = parseInt(RECORRENCIA_INTERVALO) || 15
          dataAtual.setDate(dataAtual.getDate() + intervalo)
        } else if (RECORRENCIA_TIPO === 'ANUAL') {
          dataAtual.setFullYear(dataAtual.getFullYear() + 1)
        }

        if (dataAtual > limite) break

        const dataFilhoInicio = new Date(dataAtual)
        const dataFilhoFim = new Date(dataAtual.getTime() + duracaoMs)

        filhos.push({
          ID_AGENDA: agenda.ID_AGENDA,
          TITULO,
          DESCRICAO: DESCRICAO || null,
          LOCAL: LOCAL || null,
          DATA_INICIO: dataFilhoInicio.toISOString(),
          DATA_FIM: dataFilhoFim.toISOString(),
          ORIGEM: ORIGEM || 'MANUAL',
          CRIADO_POR: user.id,
          STATUS: 'ATIVO',
          URGENTE: URGENTE === true,
          IMPORTANCIA: IMPORTANCIA ?? null,
          ANTECEDENCIA_LEMBRETE_MINUTOS: antecedenciaMinutos,
          RECORRENCIA_TIPO: RECORRENCIA_TIPO,
          ID_COMPROMISSO_ORIGEM: compromisso.ID_COMPROMISSO,
        })
      }

      if (filhos.length > 0) {
        await supabaseAdmin.from('COMPROMISSO').insert(filhos)
      }
    } catch {
      // Não bloqueia se geração dos filhos falhar
    }
  }

  // Criar lembrete WhatsApp automaticamente se o usuário tem WhatsApp ativado
  if (compromisso && antecedenciaMinutos > 0) {
    try {
      const { data: dispositivo } = await supabaseAdmin
        .from('DISPOSITIVO_PUSH')
        .select('ID_DISPOSITIVO')
        .eq('ID_USUARIO', user.id)
        .eq('PROVIDER', 'WHATSAPP')
        .eq('ATIVO', true)
        .single()

      if (dispositivo) {
        await supabaseAdmin.from('LEMBRETE').insert({
          ID_COMPROMISSO: compromisso.ID_COMPROMISSO,
          TIPO: 'WHATSAPP',
          ANTECEDENCIA_MINUTOS: antecedenciaMinutos,
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
  const { ID_COMPROMISSO, TITULO, DESCRICAO, LOCAL, DATA_INICIO, DATA_FIM, STATUS, URGENTE, IMPORTANCIA, ANTECEDENCIA_LEMBRETE_MINUTOS, ARQUIVADO } = body

  if (!ID_COMPROMISSO) {
    return NextResponse.json({ message: 'ID_COMPROMISSO é obrigatório' }, { status: 400 })
  }

  // Verificar se o compromisso pertence ao usuário
  const { data: compromisso, error: checkError } = await supabaseAdmin
    .from('COMPROMISSO')
    .select('ID_AGENDA, ORIGEM')
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
  if (URGENTE !== undefined) updateData.URGENTE = URGENTE
  if (IMPORTANCIA !== undefined) updateData.IMPORTANCIA = IMPORTANCIA
  if (ANTECEDENCIA_LEMBRETE_MINUTOS !== undefined) updateData.ANTECEDENCIA_LEMBRETE_MINUTOS = ANTECEDENCIA_LEMBRETE_MINUTOS
  if (ARQUIVADO !== undefined) updateData.ARQUIVADO = ARQUIVADO

  const { data: updated, error: updateError } = await supabaseAdmin
    .from('COMPROMISSO')
    .update(updateData)
    .eq('ID_COMPROMISSO', ID_COMPROMISSO)
    .select()
    .single()

  if (updateError) {
    return NextResponse.json({ message: updateError.message }, { status: 400 })
  }

  // Campos que devem ser propagados (exceto pessoais como ARQUIVADO e ANTECEDENCIA)
  const camposPropagar: any = {}
  if (TITULO !== undefined) camposPropagar.TITULO = TITULO
  if (DESCRICAO !== undefined) camposPropagar.DESCRICAO = DESCRICAO
  if (LOCAL !== undefined) camposPropagar.LOCAL = LOCAL
  if (DATA_INICIO !== undefined) camposPropagar.DATA_INICIO = DATA_INICIO
  if (DATA_FIM !== undefined) camposPropagar.DATA_FIM = DATA_FIM
  if (STATUS !== undefined) camposPropagar.STATUS = STATUS
  if (URGENTE !== undefined) camposPropagar.URGENTE = URGENTE
  if (IMPORTANCIA !== undefined) camposPropagar.IMPORTANCIA = IMPORTANCIA

  try {
    if (Object.keys(camposPropagar).length > 0) {
      if (compromisso.ORIGEM === 'COMPARTILHADO') {
        // É uma CÓPIA — verificar se o destinatário tem permissão EDITAR para propagar de volta
        const { data: compartilhamento } = await supabaseAdmin
          .from('COMPARTILHAMENTO_COMPROMISSO')
          .select('ID_COMPROMISSO_ORIGEM, PERMISSAO')
          .eq('ID_COMPROMISSO_COPIA', ID_COMPROMISSO)
          .eq('STATUS', 'ACEITO')
          .single()

        if (compartilhamento?.PERMISSAO === 'EDITAR') {
          const idOriginal = compartilhamento.ID_COMPROMISSO_ORIGEM
          // Propagar para o original
          await supabaseAdmin.from('COMPROMISSO').update(camposPropagar).eq('ID_COMPROMISSO', idOriginal)
          // Propagar para outras cópias do mesmo original
          const { data: outrasCopias } = await supabaseAdmin
            .from('COMPARTILHAMENTO_COMPROMISSO')
            .select('ID_COMPROMISSO_COPIA')
            .eq('ID_COMPROMISSO_ORIGEM', idOriginal)
            .eq('STATUS', 'ACEITO')
            .not('ID_COMPROMISSO_COPIA', 'is', null)
            .neq('ID_COMPROMISSO_COPIA', ID_COMPROMISSO)
          if (outrasCopias && outrasCopias.length > 0) {
            const ids = outrasCopias.map((c: any) => c.ID_COMPROMISSO_COPIA).filter(Boolean)
            await supabaseAdmin.from('COMPROMISSO').update(camposPropagar).in('ID_COMPROMISSO', ids)
          }
        }
      } else {
        // É o ORIGINAL — propagar para todas as cópias aceitas
        const { data: copias } = await supabaseAdmin
          .from('COMPARTILHAMENTO_COMPROMISSO')
          .select('ID_COMPROMISSO_COPIA')
          .eq('ID_COMPROMISSO_ORIGEM', ID_COMPROMISSO)
          .eq('STATUS', 'ACEITO')
          .not('ID_COMPROMISSO_COPIA', 'is', null)
        if (copias && copias.length > 0) {
          const copiaIds = copias.map((c: any) => c.ID_COMPROMISSO_COPIA).filter(Boolean)
          await supabaseAdmin.from('COMPROMISSO').update(camposPropagar).in('ID_COMPROMISSO', copiaIds)
        }
      }
    }
  } catch {
    // Não bloqueia se propagação falhar
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

  const url = new URL(req.url)
  const idCompromisso = url.searchParams.get('id')
  const todos = url.searchParams.get('todos') === 'true'
  const serie = url.searchParams.get('serie') === 'true'

  // --- Excluir TODOS os arquivados do usuário ---
  if (todos) {
    // Buscar agenda do usuário
    const { data: agendaUsuario } = await supabaseAdmin
      .from('AGENDA')
      .select('ID_AGENDA')
      .eq('ID_USUARIO', user.id)
      .single()

    if (!agendaUsuario) {
      return NextResponse.json({ message: 'Agenda não encontrada' }, { status: 404 })
    }

    // Buscar IDs dos compromissos arquivados
    const { data: arquivados } = await supabaseAdmin
      .from('COMPROMISSO')
      .select('ID_COMPROMISSO')
      .eq('ID_AGENDA', agendaUsuario.ID_AGENDA)
      .eq('ARQUIVADO', true)

    if (arquivados && arquivados.length > 0) {
      const ids = arquivados.map((c) => c.ID_COMPROMISSO)

      // Cancelar compartilhamentos de compromisso associados
      await supabaseAdmin
        .from('COMPARTILHAMENTO_COMPROMISSO')
        .delete()
        .in('ID_COMPROMISSO_ORIGEM', ids)

      // Deletar compromissos arquivados
      const { error: deleteError } = await supabaseAdmin
        .from('COMPROMISSO')
        .delete()
        .in('ID_COMPROMISSO', ids)

      if (deleteError) {
        return NextResponse.json({ message: deleteError.message }, { status: 400 })
      }
    }

    return NextResponse.json({ message: 'Todos os arquivados foram excluídos', total: arquivados?.length || 0 })
  }

  // --- Excluir série inteira ---
  if (serie && idCompromisso) {
    // Buscar o compromisso para descobrir se é origem ou filho
    const { data: compSerie } = await supabaseAdmin
      .from('COMPROMISSO')
      .select('ID_AGENDA, ID_COMPROMISSO_ORIGEM')
      .eq('ID_COMPROMISSO', idCompromisso)
      .single()

    if (!compSerie) {
      return NextResponse.json({ message: 'Compromisso não encontrado' }, { status: 404 })
    }

    // Verificar permissão
    const { data: agendaSerie } = await supabaseAdmin
      .from('AGENDA')
      .select('ID_AGENDA')
      .eq('ID_AGENDA', compSerie.ID_AGENDA)
      .eq('ID_USUARIO', user.id)
      .single()

    if (!agendaSerie) {
      return NextResponse.json({ message: 'Sem permissão para deletar este compromisso' }, { status: 403 })
    }

    // Determinar o ID de origem da série
    const origemId = compSerie.ID_COMPROMISSO_ORIGEM || idCompromisso

    // Buscar IDs de todos os filhos da série
    const { data: filhosSerie } = await supabaseAdmin
      .from('COMPROMISSO')
      .select('ID_COMPROMISSO')
      .eq('ID_COMPROMISSO_ORIGEM', origemId)

    const todosIdsSerie = [origemId, ...(filhosSerie?.map((f: any) => f.ID_COMPROMISSO) || [])]

    // Limpar registros de compartilhamento de todos os compromissos da série
    await supabaseAdmin
      .from('COMPARTILHAMENTO_COMPROMISSO')
      .delete()
      .in('ID_COMPROMISSO_ORIGEM', todosIdsSerie)

    await supabaseAdmin
      .from('COMPARTILHAMENTO_COMPROMISSO')
      .delete()
      .in('ID_COMPROMISSO_COPIA', todosIdsSerie)

    // Deletar todos os filhos da série
    const { error: erroFilhos } = await supabaseAdmin
      .from('COMPROMISSO')
      .delete()
      .eq('ID_COMPROMISSO_ORIGEM', origemId)

    if (erroFilhos) {
      console.error('Erro ao deletar filhos da série:', erroFilhos)
      return NextResponse.json({ message: 'Erro ao deletar a série' }, { status: 500 })
    }

    // Deletar o compromisso origem
    const { error: erroOrigem } = await supabaseAdmin
      .from('COMPROMISSO')
      .delete()
      .eq('ID_COMPROMISSO', origemId)

    if (erroOrigem) {
      console.error('Erro ao deletar origem da série:', erroOrigem)
      return NextResponse.json({ message: 'Erro ao deletar a série' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Série de compromissos deletada com sucesso' })
  }

  // --- Excluir compromisso individual ---
  if (!idCompromisso) {
    return NextResponse.json({ message: 'ID do compromisso é obrigatório' }, { status: 400 })
  }

  // Verificar se o compromisso pertence ao usuário
  const { data: compromisso, error: checkError } = await supabaseAdmin
    .from('COMPROMISSO')
    .select('ID_AGENDA, ORIGEM')
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

  try {
    if (compromisso.ORIGEM === 'COMPARTILHADO') {
      // É uma CÓPIA — verificar se o destinatário tem permissão EDITAR para propagar a exclusão
      const { data: compartilhamento } = await supabaseAdmin
        .from('COMPARTILHAMENTO_COMPROMISSO')
        .select('ID_COMPROMISSO_ORIGEM, PERMISSAO')
        .eq('ID_COMPROMISSO_COPIA', idCompromisso)
        .eq('STATUS', 'ACEITO')
        .single()

      if (compartilhamento?.PERMISSAO === 'EDITAR') {
        const idOriginal = compartilhamento.ID_COMPROMISSO_ORIGEM

        // 1. Buscar IDs de todas as outras cópias (antes de deletar os registros)
        const { data: outrasCopias } = await supabaseAdmin
          .from('COMPARTILHAMENTO_COMPROMISSO')
          .select('ID_COMPROMISSO_COPIA')
          .eq('ID_COMPROMISSO_ORIGEM', idOriginal)
          .eq('STATUS', 'ACEITO')
          .not('ID_COMPROMISSO_COPIA', 'is', null)
          .neq('ID_COMPROMISSO_COPIA', idCompromisso)

        // 2. Deletar todos os registros de compartilhamento do original
        await supabaseAdmin
          .from('COMPARTILHAMENTO_COMPROMISSO')
          .delete()
          .eq('ID_COMPROMISSO_ORIGEM', idOriginal)

        // 3. Deletar as outras cópias
        if (outrasCopias && outrasCopias.length > 0) {
          const outrasIds = outrasCopias.map((c: any) => c.ID_COMPROMISSO_COPIA).filter(Boolean)
          await supabaseAdmin.from('COMPROMISSO').delete().in('ID_COMPROMISSO', outrasIds)
        }

        // 4. Deletar o original
        await supabaseAdmin.from('COMPROMISSO').delete().eq('ID_COMPROMISSO', idOriginal)
      } else {
        // Permissão VISUALIZAR — apenas remove o registro de compartilhamento desta cópia
        await supabaseAdmin
          .from('COMPARTILHAMENTO_COMPROMISSO')
          .delete()
          .eq('ID_COMPROMISSO_COPIA', idCompromisso)
      }
    } else {
      // É o ORIGINAL — deletar todas as cópias aceitas e os registros de compartilhamento
      const { data: copias } = await supabaseAdmin
        .from('COMPARTILHAMENTO_COMPROMISSO')
        .select('ID_COMPROMISSO_COPIA')
        .eq('ID_COMPROMISSO_ORIGEM', idCompromisso)
        .eq('STATUS', 'ACEITO')
        .not('ID_COMPROMISSO_COPIA', 'is', null)

      // Deletar todos os registros de compartilhamento (PENDENTE + ACEITO)
      await supabaseAdmin
        .from('COMPARTILHAMENTO_COMPROMISSO')
        .delete()
        .eq('ID_COMPROMISSO_ORIGEM', idCompromisso)

      // Deletar cópias aceitas
      if (copias && copias.length > 0) {
        const copiaIds = copias.map((c: any) => c.ID_COMPROMISSO_COPIA).filter(Boolean)
        await supabaseAdmin.from('COMPROMISSO').delete().in('ID_COMPROMISSO', copiaIds)
      }
    }
  } catch {
    // Não bloqueia se propagação falhar
  }

  // Deletar o próprio compromisso (a cópia atual ou o original sem compartilhamentos)
  const { error: deleteError } = await supabaseAdmin
    .from('COMPROMISSO')
    .delete()
    .eq('ID_COMPROMISSO', idCompromisso)

  if (deleteError) {
    return NextResponse.json({ message: deleteError.message }, { status: 400 })
  }

  return NextResponse.json({ message: 'Compromisso deletado com sucesso' })
}
