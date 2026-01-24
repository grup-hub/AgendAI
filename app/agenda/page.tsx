'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'

interface Compromisso {
  ID_COMPROMISSO: string
  TITULO: string
  DESCRICAO?: string
  LOCAL?: string
  DATA_INICIO: string
  DATA_FIM: string
  ORIGEM: string
  STATUS: string
  CRIADO_POR: string
}

export default function AgendaPage() {
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()

  const [usuario, setUsuario] = useState<any>(null)
  const [compromissos, setCompromissos] = useState<Compromisso[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  useEffect(() => {
    async function carregar() {
      // Verificar autenticação
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }

      setUsuario(session.user)

      // Buscar compromissos
      const response = await fetch('/api/compromisso')
      if (response.status === 401) {
        router.push('/login')
        return
      }

      if (!response.ok) {
        const data = await response.json()
        setErro(data.message || 'Erro ao carregar compromissos')
        setCarregando(false)
        return
      }

      const data = await response.json()
      setCompromissos(data.compromissos || [])
      setCarregando(false)
    }

    carregar()
  }, [router, supabase])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  async function handleDelete(id: string) {
    if (!confirm('Tem certeza que deseja deletar este compromisso?')) return

    const response = await fetch(`/api/compromisso?id=${id}`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      const data = await response.json()
      setErro(data.message || 'Erro ao deletar')
      return
    }

    setCompromissos((prev) => prev.filter((c) => c.ID_COMPROMISSO !== id))
  }

  if (carregando) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Carregando agenda...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">
            Agend<span className="text-blue-600">AI</span>
          </h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{usuario?.email}</span>
            <button
              onClick={handleLogout}
              className="px-4 py-2 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 font-medium text-sm"
            >
              Sair
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Navegação */}
        <div className="flex gap-4 mb-8">
          <Link
            href="/agenda/novo"
            className="px-6 py-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-medium"
          >
            + Novo Compromisso
          </Link>
          <Link
            href="/compartilhar"
            className="px-6 py-3 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 font-medium"
          >
            Compartilhamentos
          </Link>
          <Link
            href="/configuracoes"
            className="px-6 py-3 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 font-medium"
          >
            Configurações
          </Link>
        </div>

        {/* Erro */}
        {erro && (
          <div className="mb-6 p-4 rounded-lg bg-red-50 text-red-700 border border-red-200">
            {erro}
          </div>
        )}

        {/* Lista de Compromissos */}
        {compromissos.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-lg">
            <p className="text-gray-500 text-lg">Nenhum compromisso ainda</p>
            <p className="text-gray-400 mt-2">Clique em "Novo Compromisso" para adicionar um</p>
          </div>
        ) : (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-gray-900">Meus Compromissos</h2>
            {compromissos.map((comp) => (
              <div
                key={comp.ID_COMPROMISSO}
                className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900">{comp.TITULO}</h3>
                    {comp.DESCRICAO && (
                      <p className="text-gray-600 mt-1 whitespace-pre-wrap">{comp.DESCRICAO}</p>
                    )}
                    <div className="flex gap-4 mt-3 text-sm text-gray-600">
                      {comp.LOCAL && (
                        <span>📍 {comp.LOCAL}</span>
                      )}
                      <span>🕐 {new Date(comp.DATA_INICIO).toLocaleString('pt-BR')}</span>
                    </div>
                    <div className="mt-2 text-xs">
                      <span className="inline-block px-2 py-1 rounded bg-blue-50 text-blue-700 mr-2">
                        {comp.ORIGEM}
                      </span>
                      <span
                        className={`inline-block px-2 py-1 rounded ${
                          comp.STATUS === 'ATIVO'
                            ? 'bg-green-50 text-green-700'
                            : 'bg-gray-50 text-gray-700'
                        }`}
                      >
                        {comp.STATUS}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Link
                      href={`/agenda/${comp.ID_COMPROMISSO}`}
                      className="px-3 py-1 rounded text-sm bg-blue-50 text-blue-700 hover:bg-blue-100"
                    >
                      Editar
                    </Link>
                    <button
                      onClick={() => handleDelete(comp.ID_COMPROMISSO)}
                      className="px-3 py-1 rounded text-sm bg-red-50 text-red-700 hover:bg-red-100"
                    >
                      Deletar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
