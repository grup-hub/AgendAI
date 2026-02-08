/**
 * Configuração da API do WhatsApp (Meta Cloud API)
 */

export const WHATSAPP_PHONE_ID = process.env.WHATSAPP_PHONE_ID || ''
export const WHATSAPP_API_TOKEN = process.env.WHATSAPP_API_TOKEN || ''
export const WHATSAPP_VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || ''

export const WHATSAPP_API_URL = `https://graph.facebook.com/v21.0/${WHATSAPP_PHONE_ID}/messages`

// Nome do template aprovado no Meta Business para lembretes
export const TEMPLATE_LEMBRETE = 'lembrete_compromisso'
export const TEMPLATE_LANGUAGE = 'pt_BR'

/**
 * Verifica se as configurações do WhatsApp estão completas
 */
export function isWhatsAppConfigured(): boolean {
  return !!(WHATSAPP_PHONE_ID && WHATSAPP_API_TOKEN)
}
