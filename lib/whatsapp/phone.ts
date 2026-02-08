/**
 * Utilitários para normalização e validação de telefone WhatsApp
 * Formato E.164: +5511999999999
 */

/**
 * Normaliza telefone brasileiro para formato E.164
 * Aceita: (11) 99999-9999, 11999999999, +55 11 99999-9999, etc.
 */
export function normalizePhone(telefone: string): string {
  // Remove tudo que não é dígito ou +
  let cleaned = telefone.replace(/[^\d+]/g, '')

  // Se começa com +, remove o + e processa
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1)
  }

  // Se já tem código do país (55)
  if (cleaned.startsWith('55') && cleaned.length >= 12) {
    return '+' + cleaned
  }

  // Se tem DDD + número (11 dígitos com 9 na frente ou 10 sem)
  if (cleaned.length === 11) {
    // DDD (2) + 9 + número (8) = 11 dígitos
    return '+55' + cleaned
  }

  if (cleaned.length === 10) {
    // DDD (2) + número (8) = 10 dígitos → adiciona 9
    const ddd = cleaned.substring(0, 2)
    const numero = cleaned.substring(2)
    return '+55' + ddd + '9' + numero
  }

  // Se só tem o número sem DDD (8 ou 9 dígitos), não consegue normalizar
  // Retorna com +55 mesmo assim
  if (cleaned.length >= 8 && cleaned.length <= 9) {
    return '+55' + cleaned
  }

  // Retorna como está se não se encaixa
  return '+' + cleaned
}

/**
 * Valida se o telefone está em formato válido para WhatsApp
 * Formato esperado: +55XXXXXXXXXXX (13 dígitos)
 */
export function isValidWhatsAppPhone(phone: string): boolean {
  const normalized = phone.startsWith('+') ? phone : normalizePhone(phone)
  // Formato E.164 brasileiro: +55 + DDD(2) + 9 + número(8) = +55XXXXXXXXXXX (14 chars)
  return /^\+55\d{10,11}$/.test(normalized)
}

/**
 * Formata telefone para exibição: +55 11 99999-9999
 */
export function formatPhoneDisplay(phone: string): string {
  const normalized = normalizePhone(phone)
  const digits = normalized.replace(/\D/g, '')

  if (digits.length === 13) {
    // 55 + 11 + 999999999
    return `+${digits.substring(0, 2)} ${digits.substring(2, 4)} ${digits.substring(4, 9)}-${digits.substring(9)}`
  }

  return normalized
}
