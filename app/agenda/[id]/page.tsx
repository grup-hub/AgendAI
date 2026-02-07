'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'

export const dynamic = 'force-dynamic'

interface Compromisso {
  ID_COMPROMISSO: string
  TITULO: string
  DESCRICAO?: string
  LOCAL?: string
  DATA_INICIO: string
  DATA_FIM: string
  ORIGEM: string
  STATUS: string
}

export default function EditarCompromissoPage() {
  const router = useRouter()
  const params = useParams()
  const idCompromisso = params.id as string
  const supabase = useMemo(() => createSupabaseBrowserClient(), [])

  const [compromisso, setCompromisso] = useState<Compromisso | null>(null)
  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [local, setLocal] = useState('')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [status, setStatus] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  useEffect(() => {
    async function carregar() {
      // Buscar compromisso (middleware já protege a rota)
      const response = await fetch('/api/compromisso')
      if (response.status === 401) {
        router.push('/login')
        return
      }

      if (!response.ok) {
        setErro('Erro ao carregar compromisso')
        setCarregando(false)
        return
      }

      const data = await response.json()
      const comp = data.compromissos?.find((c: Compromisso) => c.ID_COMPROMISSO === idCompromisso)

      if (!comp) {
        setErro('Compromisso não encontrado')
        setCarregando(false)
        return
      }

      setCompromisso(comp)
      setTitulo(comp.TITULO)
      setDescricao(comp.DESCRICAO || '')
      setLocal(comp.LOCAL || '')
      setStatus(comp.STATUS)

      // Converter para formato datetime-local
      const inicio = new Date(comp.DATA_INICIO)
      const fim = new Date(comp.DATA_FIM)
      setDataInicio(inicio.toISOString().slice(0, 16))
      setDataFim(fim.toISOString().slice(0, 16))

      setCarregando(false)
    }

    carregar()
  }, [router, idCompromisso])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSalvando(true)
    setErro('')

    if (!titulo || !dataInicio || !dataFim) {
      setErro('Título, data de início e data de fim são obrigatórios')
      setSalvando(false)
      return
    }

    const response = await fetch('/api/compromisso', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ID_COMPROMISSO: idCompromisso,
        TITULO: titulo,
        DESCRICAO: descricao || null,
        LOCAL: local || null,
        DATA_INICIO: new Date(dataInicio).toISOString(),
        DATA_FIM: new Date(dataFim).toISOString(),
        STATUS: status,
      }),
    })

    if (response.status === 401) {
      router.push('/login')
      setSalvando(false)
      return
    }

    if (!response.ok) {
      const data = await response.json()
      setErro(data.message || 'Erro ao atualizar compromisso')
      setSalvando(false)
      return
    }

    router.push('/agenda')
  }

  if (carregando) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <Link href="/agenda" className="text-blue-600 hover:text-blue-700">
            ← Voltar
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow p-8">
          <h1 className="text-2xl font-bold mb-6">Editar Compromisso</h1>

          {erro && (
            <div className="mb-6 p-4 rounded-lg bg-red-50 text-red-700 border border-red-200">
              {erro}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Título */}
            <div>
              <label htmlFor="titulo" className="block text-sm font-medium text-gray-700 mb-2">
                Título *
              </label>
              <input
                id="titulo"
                type="text"
                required
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Descrição */}
            <div>
              <label htmlFor="descricao" className="block text-sm font-medium text-gray-700 mb-2">
                Descrição
              </label>
              <textarea
                id="descricao"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Local */}
            <div>
              <label htmlFor="local" className="block text-sm font-medium text-gray-700 mb-2">
                Local
              </label>
              <input
                id="local"
                type="text"
                value={local}
                onChange={(e) => setLocal(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Data e Hora */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="dataInicio" className="block text-sm font-medium text-gray-700 mb-2">
                  Data/Hora Início *
                </label>
                <input
                  id="dataInicio"
                  type="datetime-local"
                  required
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label htmlFor="dataFim" className="block text-sm font-medium text-gray-700 mb-2">
                  Data/Hora Fim *
                </label>
                <input
                  id="dataFim"
                  type="datetime-local"
                  required
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Status */}
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="ATIVO">Ativo</option>
                <option value="CANCELADO">Cancelado</option>
                <option value="CONCLUIDO">Concluído</option>
              </select>
            </div>

            {/* Botões */}
            <div className="flex gap-4 pt-6">
              <button
                type="submit"
                disabled={salvando}
                className="flex-1 px-6 py-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-medium disabled:opacity-50"
              >
                {salvando ? 'Salvando...' : 'Salvar Alterações'}
              </button>
              <Link
                href="/agenda"
                className="flex-1 px-6 py-3 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 font-medium text-center"
              >
                Cancelar
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
