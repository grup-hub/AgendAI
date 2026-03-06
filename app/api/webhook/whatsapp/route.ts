import { createSupabaseAdmin } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { normalizePhone } from '@/lib/whatsapp/phone'
import { sendTextMessage } from '@/lib/whatsapp/sender'
import { parseCompromisso, getHelpMessage, getConfirmationMessage } from '@/lib/whatsapp/parser'
export const dynamic = 'force-dynamic'

/**
 * GET - Verificação do webhook pelo Meta
 * Meta envia: ?hub.mode=subscribe&hub.verify_token=TOKEN&hub.challenge=CHALLENGE
 */
export async function GET(req: Request) {
  const url = new URL(req.url)
  const mode = url.searchParams.get('hub.mode')
  const token = url.searchParams.get('hub.verify_token')
  const challenge = url.searchParams.get('hub.challenge')
  const verifyToken = (process.env.WHATSAPP_VERIFY_TOKEN || '').trim()

  if (mode === 'subscribe' && token === verifyToken) {
    // Retorna o challenge como texto plano (Meta exige isso)
    return new Response(challenge, { status: 200 })
  }

  return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
}

/**
 * POST - Recebe mensagens do WhatsApp via webhook
 * Meta envia o payload com as mensagens recebidas
 */
export async function POST(req: Request) {
  const supabaseAdmin = createSupabaseAdmin()

  try {
    const body = await req.json()

    // Extrair mensagem do payload do Meta
    const entry = body?.entry?.[0]
    const changes = entry?.changes?.[0]
    const value = changes?.value

    // Verificar se é uma mensagem (não status update)
    if (!value?.messages || value.messages.length === 0) {
      // Pode ser status update (delivered, read, etc.) - apenas retorna 200
      return NextResponse.json({ status: 'ok' })
    }

    const message = value.messages[0]
    const from = message.from // Telefone do remetente (sem +)
    const phoneNormalized = normalizePhone(from)
    const messageType = message.type

    // Só processar mensagens de texto por enquanto
    if (messageType !== 'text') {
      await sendTextMessage(
        phoneNormalized,
        '📱 Por enquanto, aceito apenas mensagens de texto. ' + getHelpMessage()
      )
      return NextResponse.json({ status: 'ok' })
    }

    const text = message.text?.body || ''

    // Log da mensagem recebida
    await supabaseAdmin.from('WHATSAPP_LOG').insert({
      TIPO: 'WEBHOOK_RECEIVED',
      TELEFONE: phoneNormalized,
      TEXTO: text,
      PAYLOAD_JSON: body,
    })

    // Buscar usuário pelo telefone
    // Tenta com o número normalizado e também com variações
    const phoneDigits = phoneNormalized.replace(/\D/g, '')
    const { data: usuario } = await supabaseAdmin
      .from('USUARIO')
      .select('ID_USUARIO, NOME, EMAIL, TELEFONE')
      .or(
        `TELEFONE.ilike.%${phoneDigits.slice(-9)}%`
      )
      .limit(1)
      .single()

    if (!usuario) {
      await sendTextMessage(
        phoneNormalized,
        '❌ Seu número não está cadastrado no AgendAI.\n\n' +
          'Acesse nosso site para criar sua conta e cadastre seu telefone nas configurações.\n\n' +
          '🌐 agendai.com'
      )
      return NextResponse.json({ status: 'ok' })
    }

    // Atualizar log com o ID do usuário
    await supabaseAdmin
      .from('WHATSAPP_LOG')
      .update({ ID_USUARIO: usuario.ID_USUARIO })
      .eq('TELEFONE', phoneNormalized)
      .eq('TIPO', 'WEBHOOK_RECEIVED')
      .order('CRIADO_EM', { ascending: false })
      .limit(1)

    // Comandos especiais
    const textLower = text.toLowerCase().trim()
    if (textLower === 'ajuda' || textLower === 'help' || textLower === 'oi' || textLower === 'olá') {
      await sendTextMessage(phoneNormalized, getHelpMessage(), usuario.ID_USUARIO)
      return NextResponse.json({ status: 'ok' })
    }

    if (textLower === 'agenda' || textLower === 'meus compromissos') {
      // Listar próximos compromissos
      const agora = new Date().toISOString()
      const { data: agenda } = await supabaseAdmin
        .from('AGENDA')
        .select('ID_AGENDA')
        .eq('ID_USUARIO', usuario.ID_USUARIO)
        .single()

      if (agenda) {
        const { data: compromissos } = await supabaseAdmin
          .from('COMPROMISSO')
          .select('TITULO, DATA_INICIO, DATA_FIM, LOCAL')
          .eq('ID_AGENDA', agenda.ID_AGENDA)
          .eq('STATUS', 'ATIVO')
          .gte('DATA_INICIO', agora)
          .order('DATA_INICIO', { ascending: true })
          .limit(5)

        if (compromissos && compromissos.length > 0) {
          let msg = '📅 *Seus próximos compromissos:*\n\n'
          compromissos.forEach((c, i) => {
            const data = new Date(c.DATA_INICIO).toLocaleDateString('pt-BR')
            const hora = new Date(c.DATA_INICIO).toLocaleTimeString('pt-BR', {
              hour: '2-digit',
              minute: '2-digit',
            })
            msg += `${i + 1}. *${c.TITULO}*\n`
            msg += `   📅 ${data} às ${hora}\n`
            if (c.LOCAL) msg += `   📍 ${c.LOCAL}\n`
            msg += '\n'
          })
          await sendTextMessage(phoneNormalized, msg, usuario.ID_USUARIO)
        } else {
          await sendTextMessage(
            phoneNormalized,
            '📅 Você não tem compromissos futuros agendados.',
            usuario.ID_USUARIO
          )
        }
      }
      return NextResponse.json({ status: 'ok' })
    }

    // Tentar criar compromisso a partir da mensagem
    const parsed = parseCompromisso(text)

    if (!parsed) {
      await sendTextMessage(
        phoneNormalized,
        '🤔 Não consegui entender o compromisso.\n\n' + getHelpMessage(),
        usuario.ID_USUARIO
      )
      return NextResponse.json({ status: 'ok' })
    }

    // Buscar agenda do usuário
    const { data: agenda } = await supabaseAdmin
      .from('AGENDA')
      .select('ID_AGENDA')
      .eq('ID_USUARIO', usuario.ID_USUARIO)
      .single()

    if (!agenda) {
      await sendTextMessage(
        phoneNormalized,
        '❌ Erro: sua agenda não foi encontrada. Acesse o site para verificar sua conta.',
        usuario.ID_USUARIO
      )
      return NextResponse.json({ status: 'ok' })
    }

    // Criar compromisso
    const { data: compromisso, error: insertError } = await supabaseAdmin
      .from('COMPROMISSO')
      .insert({
        ID_AGENDA: agenda.ID_AGENDA,
        TITULO: parsed.titulo,
        DATA_INICIO: parsed.dataInicio.toISOString(),
        DATA_FIM: parsed.dataFim.toISOString(),
        ORIGEM: 'WHATSAPP',
        CRIADO_POR: usuario.ID_USUARIO,
        STATUS: 'ATIVO',
      })
      .select()
      .single()

    if (insertError) {
      await sendTextMessage(
        phoneNormalized,
        '❌ Erro ao criar o compromisso. Tente novamente.',
        usuario.ID_USUARIO
      )
      return NextResponse.json({ status: 'ok' })
    }

    // Criar lembrete automático (1 hora antes)
    await supabaseAdmin.from('LEMBRETE').insert({
      ID_COMPROMISSO: compromisso.ID_COMPROMISSO,
      TIPO: 'WHATSAPP',
      ANTECEDENCIA_MINUTOS: 60,
      ENVIADO: false,
    })

    // Enviar confirmação
    await sendTextMessage(
      phoneNormalized,
      getConfirmationMessage(parsed.titulo, parsed.dataInicio, parsed.dataFim),
      usuario.ID_USUARIO
    )

    return NextResponse.json({ status: 'ok' })
  } catch (error: any) {
    console.error('Erro no webhook WhatsApp:', error)

    // Log do erro
    await supabaseAdmin.from('WHATSAPP_LOG').insert({
      TIPO: 'WEBHOOK_ERROR',
      TEXTO: error.message,
      PAYLOAD_JSON: { error: error.message },
    })

    // Meta exige resposta 200 mesmo em caso de erro (senão faz retry)
    return NextResponse.json({ status: 'error' })
  }
}
