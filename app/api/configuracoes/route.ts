import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabase/admin'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/supabase/config'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { normalizePhone, isValidWhatsAppPhone } from '@/lib/whatsapp/phone'

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

/**
 * GET - Buscar configurações do usuário
 */
export async function GET(req: Request) {
  const supabaseAdmin = createSupabaseAdmin()

  const { user, error: authError } = await getAuthenticatedUser(req)
  if (!user || authError) {
    return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
  }

  // Buscar dados do usuário
  const { data: usuario } = await supabaseAdmin
    .from('USUARIO')
    .select('ID_USUARIO, NOME, EMAIL, TELEFONE, PLANO, DATA_NASCIMENTO')
    .eq('ID_USUARIO', user.id)
    .single()

  if (!usuario) {
    return NextResponse.json({ message: 'Usuário não encontrado' }, { status: 404 })
  }

  // Verificar se WhatsApp está ativado
  const { data: dispositivo } = await supabaseAdmin
    .from('DISPOSITIVO_PUSH')
    .select('ID_DISPOSITIVO, ATIVO, TOKEN_PUSH')
    .eq('ID_USUARIO', user.id)
    .eq('PROVIDER', 'WHATSAPP')
    .single()

  return NextResponse.json({
    usuario,
    whatsapp: {
      ativado: dispositivo?.ATIVO || false,
      telefone: dispositivo?.TOKEN_PUSH || usuario.TELEFONE || '',
    },
  })
}

/**
 * PUT - Atualizar configurações do usuário
 */
export async function PUT(req: Request) {
  const supabaseAdmin = createSupabaseAdmin()

  const { user, error: authError } = await getAuthenticatedUser(req)
  if (!user || authError) {
    return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
  }

  const body = await req.json()
  const { nome, telefone, whatsappAtivado, dataNascimento } = body

  // Atualizar USUARIO
  const updateUsuario: any = {}
  if (nome !== undefined) updateUsuario.NOME = nome
  if (telefone !== undefined) {
    const phoneNorm = telefone ? normalizePhone(telefone) : null
    updateUsuario.TELEFONE = phoneNorm
  }
  if (dataNascimento !== undefined) {
    updateUsuario.DATA_NASCIMENTO = dataNascimento || null
  }

  if (Object.keys(updateUsuario).length > 0) {
    await supabaseAdmin
      .from('USUARIO')
      .update(updateUsuario)
      .eq('ID_USUARIO', user.id)
  }

  // Gerenciar notificações WhatsApp
  if (whatsappAtivado !== undefined) {
    const phoneToUse = telefone
      ? normalizePhone(telefone)
      : (await supabaseAdmin
          .from('USUARIO')
          .select('TELEFONE')
          .eq('ID_USUARIO', user.id)
          .single()
        ).data?.TELEFONE

    if (whatsappAtivado && phoneToUse) {
      if (!isValidWhatsAppPhone(phoneToUse)) {
        return NextResponse.json(
          { message: 'Telefone inválido para WhatsApp. Use o formato: +55 11 99999-9999' },
          { status: 400 }
        )
      }

      // Verificar se já existe registro
      const { data: existente } = await supabaseAdmin
        .from('DISPOSITIVO_PUSH')
        .select('ID_DISPOSITIVO')
        .eq('ID_USUARIO', user.id)
        .eq('PROVIDER', 'WHATSAPP')
        .single()

      if (existente) {
        await supabaseAdmin
          .from('DISPOSITIVO_PUSH')
          .update({ ATIVO: true, TOKEN_PUSH: phoneToUse })
          .eq('ID_DISPOSITIVO', existente.ID_DISPOSITIVO)
      } else {
        await supabaseAdmin.from('DISPOSITIVO_PUSH').insert({
          ID_USUARIO: user.id,
          PROVIDER: 'WHATSAPP',
          TOKEN_PUSH: phoneToUse,
          ATIVO: true,
        })
      }
    } else if (!whatsappAtivado) {
      // Desativar
      await supabaseAdmin
        .from('DISPOSITIVO_PUSH')
        .update({ ATIVO: false })
        .eq('ID_USUARIO', user.id)
        .eq('PROVIDER', 'WHATSAPP')
    }
  }

  // Gerenciar compromisso de aniversário
  if (dataNascimento !== undefined) {
    const { data: agenda } = await supabaseAdmin
      .from('AGENDA')
      .select('ID_AGENDA')
      .eq('ID_USUARIO', user.id)
      .single()

    if (agenda) {
      // Apagar aniversários existentes (base + filhos)
      const { data: anivExist } = await supabaseAdmin
        .from('COMPROMISSO')
        .select('ID_COMPROMISSO')
        .eq('ID_AGENDA', agenda.ID_AGENDA)
        .eq('ORIGEM', 'ANIVERSARIO')
      if (anivExist && anivExist.length > 0) {
        const ids = anivExist.map((c: any) => c.ID_COMPROMISSO)
        await supabaseAdmin.from('COMPROMISSO').delete().in('ID_COMPROMISSO', ids)
      }

      if (dataNascimento) {
        // Buscar nome do usuário para o título
        const { data: usuarioAtual } = await supabaseAdmin
          .from('USUARIO')
          .select('NOME')
          .eq('ID_USUARIO', user.id)
          .single()
        const nomeUsuario = (nome?.trim()) || usuarioAtual?.NOME || 'você'

        const parts = (dataNascimento as string).split('-').map(Number)
        const mesNasc = parts[1]
        const diaNasc = parts[2]
        const hoje = new Date()
        let anoBase = hoje.getFullYear()
        const anivEsteAno = new Date(anoBase, mesNasc - 1, diaNasc)
        if (anivEsteAno < hoje) anoBase++

        const dataInicio = new Date(anoBase, mesNasc - 1, diaNasc, 0, 0, 0)
        const dataFim = new Date(anoBase, mesNasc - 1, diaNasc, 23, 59, 0)
        const tituloAniv = `🎂 Aniversário de ${nomeUsuario}`

        const baseInsert = {
          ID_AGENDA: agenda.ID_AGENDA,
          TITULO: tituloAniv,
          DATA_INICIO: dataInicio.toISOString(),
          DATA_FIM: dataFim.toISOString(),
          ORIGEM: 'ANIVERSARIO',
          STATUS: 'ATIVO',
          CRIADO_POR: user.id,
          RECORRENCIA_TIPO: 'ANUAL',
        }

        const { data: base } = await supabaseAdmin
          .from('COMPROMISSO')
          .insert(baseInsert)
          .select()
          .single()

        // Gerar filhos para próximos 4 anos (total 5 com a base)
        if (base) {
          const filhos = []
          for (let i = 1; i <= 4; i++) {
            const fInicio = new Date(anoBase + i, mesNasc - 1, diaNasc, 0, 0, 0)
            const fFim = new Date(anoBase + i, mesNasc - 1, diaNasc, 23, 59, 0)
            filhos.push({
              ...baseInsert,
              DATA_INICIO: fInicio.toISOString(),
              DATA_FIM: fFim.toISOString(),
              ID_COMPROMISSO_ORIGEM: base.ID_COMPROMISSO,
            })
          }
          await supabaseAdmin.from('COMPROMISSO').insert(filhos)
        }
      }
    }
  }

  return NextResponse.json({ message: 'Configurações salvas com sucesso' })
}
