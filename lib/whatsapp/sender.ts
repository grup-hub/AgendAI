/**
 * Funções para enviar mensagens via WhatsApp Meta Cloud API
 */

import { createSupabaseAdmin } from '@/lib/supabase/admin'
import {
  WHATSAPP_API_URL,
  WHATSAPP_API_TOKEN,
  TEMPLATE_LEMBRETE,
  TEMPLATE_LANGUAGE,
  isWhatsAppConfigured,
} from './config'

interface SendResult {
  success: boolean
  messageId?: string
  error?: string
}

/**
 * Envia mensagem de template (para mensagens fora da janela de 24h)
 * Usado para lembretes de compromissos
 */
export async function sendTemplateMessage(
  phone: string,
  templateName: string,
  params: string[],
  userId?: string
): Promise<SendResult> {
  if (!isWhatsAppConfigured()) {
    return { success: false, error: 'WhatsApp não configurado' }
  }

  const body = {
    messaging_product: 'whatsapp',
    to: phone.replace('+', ''),
    type: 'template',
    template: {
      name: templateName,
      language: { code: TEMPLATE_LANGUAGE },
      components: [
        {
          type: 'body',
          parameters: params.map((p) => ({ type: 'text', text: p })),
        },
      ],
    },
  }

  return await sendRequest(body, phone, `template:${templateName}`, userId)
}

/**
 * Envia lembrete de compromisso usando template padrão
 */
export async function sendLembreteCompromisso(
  phone: string,
  nome: string,
  titulo: string,
  tempoRestante: string,
  local: string,
  horario: string,
  userId?: string
): Promise<SendResult> {
  return await sendTemplateMessage(
    phone,
    TEMPLATE_LEMBRETE,
    [nome, titulo, tempoRestante, local || 'Não definido', horario],
    userId
  )
}

/**
 * Envia mensagem de texto livre (só funciona dentro da janela de 24h)
 * Usado para respostas do chatbot
 */
export async function sendTextMessage(
  phone: string,
  text: string,
  userId?: string
): Promise<SendResult> {
  if (!isWhatsAppConfigured()) {
    return { success: false, error: 'WhatsApp não configurado' }
  }

  const body = {
    messaging_product: 'whatsapp',
    to: phone.replace('+', ''),
    type: 'text',
    text: { body: text },
  }

  return await sendRequest(body, phone, 'text', userId)
}

/**
 * Executa a requisição para a Meta API e loga o resultado
 */
async function sendRequest(
  body: any,
  phone: string,
  tipo: string,
  userId?: string
): Promise<SendResult> {
  const supabaseAdmin = createSupabaseAdmin()

  try {
    const response = await fetch(WHATSAPP_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WHATSAPP_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    const data = await response.json()

    if (!response.ok) {
      const errorMsg = data?.error?.message || `HTTP ${response.status}`

      // Log de erro
      await supabaseAdmin.from('WHATSAPP_LOG').insert({
        ID_USUARIO: userId || null,
        TIPO: 'MESSAGE_FAILED',
        TELEFONE: phone,
        TEXTO: JSON.stringify(body.text?.body || body.template?.name || ''),
        PAYLOAD_JSON: { request: body, response: data },
      })

      return { success: false, error: errorMsg }
    }

    const messageId = data?.messages?.[0]?.id || null

    // Log de sucesso
    await supabaseAdmin.from('WHATSAPP_LOG').insert({
      ID_USUARIO: userId || null,
      TIPO: 'MESSAGE_SENT',
      TELEFONE: phone,
      TEXTO: body.text?.body || `template:${body.template?.name}`,
      PAYLOAD_JSON: { request: body, response: data },
    })

    return { success: true, messageId }
  } catch (error: any) {
    // Log de exceção
    await supabaseAdmin.from('WHATSAPP_LOG').insert({
      ID_USUARIO: userId || null,
      TIPO: 'MESSAGE_FAILED',
      TELEFONE: phone,
      TEXTO: error.message,
      PAYLOAD_JSON: { request: body, error: error.message },
    })

    return { success: false, error: error.message }
  }
}
