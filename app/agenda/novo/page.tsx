'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function NovoCompromissoPage() {
  const router = useRouter()

  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [local, setLocal] = useState('')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [urgente, setUrgente] = useState(false)
  const [lembreteMinutos, setLembreteMinutos] = useState('60')
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setCarregando(true)
    setErro('')

    if (!titulo || !dataInicio || !dataFim) {
      setErro('Título, data de início e data de fim são obrigatórios')
      setCarregando(false)
      return
    }

    const response = await fetch('/api/compromisso', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        TITULO: titulo,
        DESCRICAO: descricao || null,
        LOCAL: local || null,
        DATA_INICIO: new Date(dataInicio).toISOString(),
        DATA_FIM: new Date(dataFim).toISOString(),
        ORIGEM: 'MANUAL',
        URGENTE: urgente,
        LEMBRETE_MINUTOS: lembreteMinutos !== '0' ? lembreteMinutos : undefined,
      }),
    })

    if (response.status === 401) {
      router.push('/login')
      setCarregando(false)
      return
    }

    if (!response.ok) {
      const data = await response.json()
      setErro(data.message || 'Erro ao criar compromisso')
      setCarregando(false)
      return
    }

    router.push('/agenda')
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
          <h1 className="text-2xl font-bold mb-6">Novo Compromisso</h1>

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
                placeholder="Reunião com cliente"
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
                placeholder="Detalhes do compromisso"
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
                placeholder="Sala de reuniões 1"
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

            {/* Urgente */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Urgente
              </label>
              <button
                type="button"
                onClick={() => setUrgente(!urgente)}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border transition font-medium text-sm ${
                  urgente
                    ? 'bg-red-50 border-red-400 text-red-700'
                    : 'bg-gray-50 border-gray-300 text-gray-500 hover:bg-gray-100'
                }`}
              >
                <span>{urgente ? '🔴' : '⚪'}</span>
                {urgente ? 'Sim, é urgente' : 'Não'}
              </button>
            </div>

            {/* Lembrete */}
            <div>
              <label htmlFor="lembrete" className="block text-sm font-medium text-gray-700 mb-2">
                Lembrete WhatsApp
              </label>
              <select
                id="lembrete"
                value={lembreteMinutos}
                onChange={(e) => setLembreteMinutos(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="0">Sem lembrete</option>
                <option value="15">15 minutos antes</option>
                <option value="30">30 minutos antes</option>
                <option value="60">1 hora antes</option>
                <option value="1440">1 dia antes</option>
              </select>
              <p className="text-xs text-gray-400 mt-1">
                Ative o WhatsApp em Configurações para receber lembretes
              </p>
            </div>

            {/* Botões */}
            <div className="flex gap-4 pt-6">
              <button
                type="submit"
                disabled={carregando}
                className="flex-1 px-6 py-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-medium disabled:opacity-50"
              >
                {carregando ? 'Salvando...' : 'Criar Compromisso'}
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
