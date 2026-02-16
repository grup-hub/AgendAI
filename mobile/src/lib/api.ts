import { supabase } from './supabase'

// URL base da API web (Next.js)
const API_BASE_URL = 'https://sistema-agendai.vercel.app'

// Para desenvolvimento local, descomente a linha abaixo:
// const API_BASE_URL = 'http://192.168.X.X:3000'

async function getAuthHeaders(): Promise<Record<string, string>> {
  // Primeiro tenta refreshar a sessão para garantir token válido
  const { data: { session }, error } = await supabase.auth.refreshSession()

  if (error || !session?.access_token) {
    // Fallback: tenta pegar sessão existente
    const { data: { session: existingSession } } = await supabase.auth.getSession()
    if (!existingSession?.access_token) {
      throw new Error('Usuário não autenticado')
    }
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${existingSession.access_token}`,
    }
  }

  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session.access_token}`,
  }
}

// ====== COMPROMISSOS ======

export async function listarCompromissos() {
  const headers = await getAuthHeaders()
  const response = await fetch(`${API_BASE_URL}/api/compromisso`, { headers })

  if (!response.ok) {
    const data = await response.json()
    throw new Error(data.message || 'Erro ao buscar compromissos')
  }

  return response.json()
}

export async function criarCompromisso(dados: {
  TITULO: string
  DESCRICAO?: string | null
  LOCAL?: string | null
  DATA_INICIO: string
  DATA_FIM: string
  ORIGEM?: string
}) {
  const headers = await getAuthHeaders()
  const response = await fetch(`${API_BASE_URL}/api/compromisso`, {
    method: 'POST',
    headers,
    body: JSON.stringify(dados),
  })

  if (!response.ok) {
    const data = await response.json()
    const debugInfo = data.debug ? `\n\nDebug: ${JSON.stringify(data.debug)}` : ''
    throw new Error((data.message || 'Erro ao criar compromisso') + debugInfo)
  }

  return response.json()
}

export async function atualizarCompromisso(dados: {
  ID_COMPROMISSO: string
  TITULO?: string
  DESCRICAO?: string | null
  LOCAL?: string | null
  DATA_INICIO?: string
  DATA_FIM?: string
  STATUS?: string
}) {
  const headers = await getAuthHeaders()
  const response = await fetch(`${API_BASE_URL}/api/compromisso`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(dados),
  })

  if (!response.ok) {
    const data = await response.json()
    throw new Error(data.message || 'Erro ao atualizar compromisso')
  }

  return response.json()
}

export async function deletarCompromisso(id: string) {
  const headers = await getAuthHeaders()
  const response = await fetch(`${API_BASE_URL}/api/compromisso?id=${id}`, {
    method: 'DELETE',
    headers,
  })

  if (!response.ok) {
    const data = await response.json()
    throw new Error(data.message || 'Erro ao deletar compromisso')
  }

  return response.json()
}

// ====== COMPARTILHAMENTOS ======

export async function listarCompartilhamentos() {
  const headers = await getAuthHeaders()
  const response = await fetch(`${API_BASE_URL}/api/compartilhamento`, { headers })

  if (!response.ok) {
    const data = await response.json()
    throw new Error(data.message || 'Erro ao buscar compartilhamentos')
  }

  return response.json()
}

export async function convidarCompartilhamento(email: string, permissao: string) {
  const headers = await getAuthHeaders()
  const response = await fetch(`${API_BASE_URL}/api/compartilhamento`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ email, permissao }),
  })

  if (!response.ok) {
    const data = await response.json()
    throw new Error(data.message || 'Erro ao enviar convite')
  }

  return response.json()
}

export async function responderCompartilhamento(id: string, status: 'ACEITO' | 'RECUSADO') {
  const headers = await getAuthHeaders()
  const response = await fetch(`${API_BASE_URL}/api/compartilhamento`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ ID_COMPARTILHAMENTO: id, status }),
  })

  if (!response.ok) {
    const data = await response.json()
    throw new Error(data.message || 'Erro ao responder convite')
  }

  return response.json()
}

export async function removerCompartilhamento(id: string) {
  const headers = await getAuthHeaders()
  const response = await fetch(`${API_BASE_URL}/api/compartilhamento?id=${id}`, {
    method: 'DELETE',
    headers,
  })

  if (!response.ok) {
    const data = await response.json()
    throw new Error(data.message || 'Erro ao remover compartilhamento')
  }

  return response.json()
}

// ====== COMPARTILHAMENTO DE COMPROMISSO ======

export async function compartilharCompromisso(idCompromisso: string, email: string) {
  const headers = await getAuthHeaders()
  const response = await fetch(`${API_BASE_URL}/api/compartilhamento-compromisso`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ id_compromisso: idCompromisso, email }),
  })

  if (!response.ok) {
    const data = await response.json()
    throw new Error(data.message || 'Erro ao compartilhar compromisso')
  }

  return response.json()
}

export async function listarCompartilhamentosCompromisso() {
  const headers = await getAuthHeaders()
  const response = await fetch(`${API_BASE_URL}/api/compartilhamento-compromisso`, { headers })

  if (!response.ok) {
    const data = await response.json()
    throw new Error(data.message || 'Erro ao buscar compartilhamentos de compromisso')
  }

  return response.json()
}

export async function responderCompartilhamentoCompromisso(id: string, status: 'ACEITO' | 'RECUSADO') {
  const headers = await getAuthHeaders()
  const response = await fetch(`${API_BASE_URL}/api/compartilhamento-compromisso`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ id, status }),
  })

  if (!response.ok) {
    const data = await response.json()
    throw new Error(data.message || 'Erro ao responder compartilhamento')
  }

  return response.json()
}

// ====== CONFIGURAÇÕES ======

export async function carregarConfiguracoes() {
  const headers = await getAuthHeaders()
  const response = await fetch(`${API_BASE_URL}/api/configuracoes`, { headers })

  if (!response.ok) {
    const data = await response.json()
    throw new Error(data.message || 'Erro ao carregar configurações')
  }

  return response.json()
}

export async function salvarConfiguracoes(dados: {
  nome: string
  telefone: string
  whatsappAtivado: boolean
}) {
  const headers = await getAuthHeaders()
  const response = await fetch(`${API_BASE_URL}/api/configuracoes`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(dados),
  })

  if (!response.ok) {
    const data = await response.json()
    throw new Error(data.message || 'Erro ao salvar configurações')
  }

  return response.json()
}

// ====== COPA DO MUNDO 2026 ======

export async function listarJogosCopa() {
  const headers = await getAuthHeaders()
  const response = await fetch(`${API_BASE_URL}/api/copa2026`, { headers })

  if (!response.ok) {
    const data = await response.json()
    throw new Error(data.message || 'Erro ao buscar jogos da Copa')
  }

  return response.json()
}

export async function importarJogosCopa(
  acao: 'importar_todos' | 'importar_selecionados' | 'remover_todos' | 'remover_selecionados',
  jogosIds?: number[]
) {
  const headers = await getAuthHeaders()
  const response = await fetch(`${API_BASE_URL}/api/copa2026`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ acao, jogosIds }),
  })

  if (!response.ok) {
    const data = await response.json()
    throw new Error(data.message || 'Erro ao importar jogos')
  }

  return response.json()
}
