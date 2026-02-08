/**
 * Parser de mensagens do WhatsApp para extrair dados de compromissos
 * Versão simples com regex para formatos brasileiros comuns
 */

interface ParsedCompromisso {
  titulo: string
  dataInicio: Date
  dataFim: Date
}

/**
 * Tenta extrair dados de compromisso de uma mensagem de texto
 *
 * Formatos aceitos:
 * 1. "titulo | dd/mm/aaaa | hh:mm - hh:mm"
 *    Ex: "Dentista | 15/03/2026 | 10:00 - 11:00"
 *
 * 2. "titulo | dd/mm | hh:mm - hh:mm"
 *    Ex: "Reunião | 20/03 | 14:00 - 15:30"
 *
 * 3. "titulo | amanhã | hh:mm - hh:mm"
 *    Ex: "Médico | amanhã | 09:00 - 10:00"
 *
 * 4. "titulo | hoje | hh:mm - hh:mm"
 *    Ex: "Call | hoje | 16:00 - 17:00"
 */
export function parseCompromisso(text: string): ParsedCompromisso | null {
  // Limpar texto
  const cleaned = text.trim()

  // Tentar formato com pipe: "titulo | data | hora"
  const pipeResult = parsePipeFormat(cleaned)
  if (pipeResult) return pipeResult

  // Tentar formato natural simples: "titulo dia dd/mm às hh:mm"
  const naturalResult = parseNaturalFormat(cleaned)
  if (naturalResult) return naturalResult

  return null
}

/**
 * Parse formato: "titulo | data | hora_inicio - hora_fim"
 */
function parsePipeFormat(text: string): ParsedCompromisso | null {
  const parts = text.split('|').map((p) => p.trim())
  if (parts.length < 3) return null

  const titulo = parts[0]
  if (!titulo) return null

  const dataPart = parts[1].toLowerCase()
  const horaPart = parts[2]

  // Extrair horas
  const horaMatch = horaPart.match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/)
  if (!horaMatch) return null

  const horaInicio = parseInt(horaMatch[1])
  const minInicio = parseInt(horaMatch[2])
  const horaFim = parseInt(horaMatch[3])
  const minFim = parseInt(horaMatch[4])

  // Resolver data
  const dataBase = resolveDate(dataPart)
  if (!dataBase) return null

  const dataInicio = new Date(dataBase)
  dataInicio.setHours(horaInicio, minInicio, 0, 0)

  const dataFim = new Date(dataBase)
  dataFim.setHours(horaFim, minFim, 0, 0)

  // Se hora fim é menor que hora início, assume dia seguinte
  if (dataFim <= dataInicio) {
    dataFim.setDate(dataFim.getDate() + 1)
  }

  return { titulo, dataInicio, dataFim }
}

/**
 * Parse formato natural: "titulo dia dd/mm às hh:mm"
 */
function parseNaturalFormat(text: string): ParsedCompromisso | null {
  // "titulo dia dd/mm às hh:mm - hh:mm"
  const match = text.match(
    /^(.+?)\s+(?:dia\s+)?(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)\s+(?:às?\s+)?(\d{1,2}:\d{2})\s*(?:-\s*(\d{1,2}:\d{2}))?$/i
  )
  if (!match) return null

  const titulo = match[1].trim()
  const dataPart = match[2]
  const horaInicioPart = match[3]
  const horaFimPart = match[4]

  const dataBase = resolveDate(dataPart)
  if (!dataBase) return null

  const [hi, mi] = horaInicioPart.split(':').map(Number)
  const dataInicio = new Date(dataBase)
  dataInicio.setHours(hi, mi, 0, 0)

  let dataFim: Date
  if (horaFimPart) {
    const [hf, mf] = horaFimPart.split(':').map(Number)
    dataFim = new Date(dataBase)
    dataFim.setHours(hf, mf, 0, 0)
    if (dataFim <= dataInicio) {
      dataFim.setDate(dataFim.getDate() + 1)
    }
  } else {
    // Se não especificou hora fim, assume 1 hora de duração
    dataFim = new Date(dataInicio)
    dataFim.setHours(dataFim.getHours() + 1)
  }

  return { titulo, dataInicio, dataFim }
}

/**
 * Resolve referência de data para um objeto Date
 */
function resolveDate(dataPart: string): Date | null {
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)

  const lower = dataPart.toLowerCase().trim()

  // "hoje"
  if (lower === 'hoje') {
    return hoje
  }

  // "amanhã" ou "amanha"
  if (lower === 'amanhã' || lower === 'amanha') {
    const d = new Date(hoje)
    d.setDate(d.getDate() + 1)
    return d
  }

  // dd/mm/aaaa ou dd/mm/aa
  const fullMatch = lower.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/)
  if (fullMatch) {
    const dia = parseInt(fullMatch[1])
    const mes = parseInt(fullMatch[2]) - 1
    let ano = parseInt(fullMatch[3])
    if (ano < 100) ano += 2000
    return new Date(ano, mes, dia)
  }

  // dd/mm (assume ano atual ou próximo)
  const shortMatch = lower.match(/^(\d{1,2})\/(\d{1,2})$/)
  if (shortMatch) {
    const dia = parseInt(shortMatch[1])
    const mes = parseInt(shortMatch[2]) - 1
    let ano = hoje.getFullYear()
    const data = new Date(ano, mes, dia)
    // Se a data já passou neste ano, assume ano que vem
    if (data < hoje) {
      data.setFullYear(ano + 1)
    }
    return data
  }

  return null
}

/**
 * Gera mensagem de ajuda para o usuário
 */
export function getHelpMessage(): string {
  return (
    '📅 *AgendAI - Como criar compromissos:*\n\n' +
    'Envie no formato:\n' +
    '*título | data | hora início - hora fim*\n\n' +
    'Exemplos:\n' +
    '• Dentista | 15/03 | 10:00 - 11:00\n' +
    '• Reunião | amanhã | 14:00 - 15:30\n' +
    '• Call com cliente | hoje | 16:00 - 17:00\n' +
    '• Médico | 20/03/2026 | 09:00 - 10:00\n\n' +
    'Ou no formato natural:\n' +
    '• Dentista dia 15/03 às 10:00 - 11:00'
  )
}

/**
 * Formata confirmação de compromisso criado
 */
export function getConfirmationMessage(
  titulo: string,
  dataInicio: Date,
  dataFim: Date,
  local?: string
): string {
  const dataStr = dataInicio.toLocaleDateString('pt-BR')
  const horaInicioStr = dataInicio.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  const horaFimStr = dataFim.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

  let msg = `✅ Compromisso criado com sucesso!\n\n`
  msg += `📌 *${titulo}*\n`
  msg += `📅 ${dataStr}\n`
  msg += `🕐 ${horaInicioStr} - ${horaFimStr}\n`
  if (local) {
    msg += `📍 ${local}\n`
  }
  msg += `\nVocê receberá um lembrete antes do compromisso.`

  return msg
}
