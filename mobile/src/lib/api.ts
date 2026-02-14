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
    throw new Error(data.message || 'Erro ao criar compromisso')
  }

  return response.json()
}

export async function atualizarCompromisso(dados: {
  ID_COMPROMISSO: string
  TITULO?: string
  DESCRICAO?: string
  LOCAL?: string
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
