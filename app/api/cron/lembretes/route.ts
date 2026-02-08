import { createSupabaseAdmin } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { sendLembreteCompromisso } from '@/lib/whatsapp/sender'
import { normalizePhone, isValidWhatsAppPhone } from '@/lib/whatsapp/phone'
import { isWhatsAppConfigured } from '@/lib/whatsapp/config'

export const dynamic = 'force-dynamic'

/**
 * GET - CRON job para processar lembretes pendentes
 * Chamado pelo Vercel CRON a cada 5 minutos
 */
export async function GET(req: Request) {
  // Verificar autenticação do CRON (Vercel envia Authorization header)
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  // Em produção, verificar o token. Em dev, permitir sem token.
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    // Permitir em dev sem token
    const isDev = process.env.NODE_ENV === 'development'
    if (!isDev) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }
  }

  if (!isWhatsAppConfigured()) {
    return NextResponse.json({
      message: 'WhatsApp não configurado',
      enviados: 0,
    })
  }

  const supabaseAdmin = createSupabaseAdmin()
  const agora = new Date()

  // Buscar lembretes pendentes do tipo WHATSAPP
  // Condição: ENVIADO = FALSE e (DATA_INICIO do compromisso - ANTECEDENCIA_MINUTOS) <= agora
  const { data: lembretes, error: lembreteError } = await supabaseAdmin
    .from('LEMBRETE')
    .select(
      `
      ID_LEMBRETE,
      ID_COMPROMISSO,
      TIPO,
      ANTECEDENCIA_MINUTOS,
      COMPROMISSO:ID_COMPROMISSO (
        ID_COMPROMISSO,
        TITULO,
        DESCRICAO,
        LOCAL,
        DATA_INICIO,
        DATA_FIM,
        STATUS,
        ID_AGENDA,
        AGENDA:ID_AGENDA (
          ID_USUARIO,
          USUARIO:ID_USUARIO (
            ID_USUARIO,
            NOME,
            TELEFONE
          )
        )
      )
    `
    )
    .eq('ENVIADO', false)
    .eq('TIPO', 'WHATSAPP')

  if (lembreteError) {
    console.error('Erro ao buscar lembretes:', lembreteError)
    return NextResponse.json(
      { message: 'Erro ao buscar lembretes', error: lembreteError.message },
      { status: 500 }
    )
  }

  if (!lembretes || lembretes.length === 0) {
    return NextResponse.json({ message: 'Nenhum lembrete pendente', enviados: 0 })
  }

  let enviados = 0
  let erros = 0
  const resultados: any[] = []

  for (const lembrete of lembretes) {
    try {
      const compromisso = lembrete.COMPROMISSO as any
      if (!compromisso || compromisso.STATUS !== 'ATIVO') {
        continue
      }

      const dataInicio = new Date(compromisso.DATA_INICIO)
      const antecedenciaMs = lembrete.ANTECEDENCIA_MINUTOS * 60 * 1000
      const horarioEnvio = new Date(dataInicio.getTime() - antecedenciaMs)

      // Verificar se já é hora de enviar
      if (agora < horarioEnvio) {
        continue // Ainda não é hora
      }

      // Verificar se o compromisso já passou (não enviar lembrete para compromissos passados)
      if (agora > dataInicio) {
        // Marcar como enviado para não processar novamente
        await supabaseAdmin
          .from('LEMBRETE')
          .update({ ENVIADO: true, DATA_ENVIO: agora.toISOString() })
          .eq('ID_LEMBRETE', lembrete.ID_LEMBRETE)
        continue
      }

      // Extrair dados do usuário
      const agenda = compromisso.AGENDA as any
      const usuario = agenda?.USUARIO as any

      if (!usuario?.TELEFONE) {
        resultados.push({
          id: lembrete.ID_LEMBRETE,
          status: 'skipped',
          reason: 'Usuário sem telefone',
        })
        continue
      }

      const phone = normalizePhone(usuario.TELEFONE)
      if (!isValidWhatsAppPhone(phone)) {
        resultados.push({
          id: lembrete.ID_LEMBRETE,
          status: 'skipped',
          reason: 'Telefone inválido',
        })
        continue
      }

      // Calcular tempo restante
      const diffMs = dataInicio.getTime() - agora.getTime()
      const diffMin = Math.round(diffMs / 60000)
      let tempoRestante = ''
      if (diffMin < 60) {
        tempoRestante = `${diffMin} minutos`
      } else if (diffMin < 1440) {
        const horas = Math.round(diffMin / 60)
        tempoRestante = `${horas} hora${horas > 1 ? 's' : ''}`
      } else {
        const dias = Math.round(diffMin / 1440)
        tempoRestante = `${dias} dia${dias > 1 ? 's' : ''}`
      }

      const horario = dataInicio.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'America/Sao_Paulo',
      })

      // Enviar mensagem via WhatsApp
      const result = await sendLembreteCompromisso(
        phone,
        usuario.NOME || 'Olá',
        compromisso.TITULO,
        tempoRestante,
        compromisso.LOCAL || 'Não definido',
        horario,
        usuario.ID_USUARIO
      )

      // Atualizar lembrete
      await supabaseAdmin
        .from('LEMBRETE')
        .update({ ENVIADO: true, DATA_ENVIO: agora.toISOString() })
        .eq('ID_LEMBRETE', lembrete.ID_LEMBRETE)

      // Inserir notificação
      await supabaseAdmin.from('NOTIFICACAO').insert({
        ID_USUARIO: usuario.ID_USUARIO,
        ID_COMPROMISSO: compromisso.ID_COMPROMISSO,
        CANAL: 'WHATSAPP',
        STATUS: result.success ? 'ENVIADO' : 'ERRO',
        PAYLOAD_JSON: {
          phone,
          titulo: compromisso.TITULO,
          tempoRestante,
          messageId: result.messageId,
        },
        ERRO: result.error || null,
        ENVIADO_EM: result.success ? agora.toISOString() : null,
      })

      if (result.success) {
        enviados++
      } else {
        erros++
      }

      resultados.push({
        id: lembrete.ID_LEMBRETE,
        titulo: compromisso.TITULO,
        phone,
        status: result.success ? 'sent' : 'error',
        error: result.error,
      })
    } catch (error: any) {
      erros++
      resultados.push({
        id: lembrete.ID_LEMBRETE,
        status: 'exception',
        error: error.message,
      })
    }
  }

  return NextResponse.json({
    message: `Processado: ${enviados} enviados, ${erros} erros`,
    enviados,
    erros,
    total: lembretes.length,
    resultados,
  })
}
