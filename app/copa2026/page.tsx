'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface Jogo {
  id: number
  grupo: string
  rodada: number
  home: string
  away: string
  homeBandeira: string
  awayBandeira: string
  date: string
  city: string
  stadium: string
  destaque: boolean
  importado: boolean
}

type FiltroGrupo = 'TODOS' | string

export default function Copa2026Page() {
  const router = useRouter()

  const [jogos, setJogos] = useState<Jogo[]>([])
  const [grupos, setGrupos] = useState<string[]>([])
  const [carregando, setCarregando] = useState(true)
  const [importando, setImportando] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')
  const [filtroGrupo, setFiltroGrupo] = useState<FiltroGrupo>('TODOS')
  const [totalImportados, setTotalImportados] = useState(0)
  const [jogoSelecionado, setJogoSelecionado] = useState<Jogo | null>(null)

  async function carregarJogos() {
    const response = await fetch('/api/copa2026')
    if (response.status === 401) {
      router.push('/login')
      return
    }

    if (!response.ok) {
      const data = await response.json()
      setErro(data.message || 'Erro ao carregar jogos')
      setCarregando(false)
      return
    }

    const data = await response.json()
    setJogos(data.jogos || [])
    setTotalImportados(data.totalImportados || 0)

    // Extrair grupos únicos
    const gruposUnicos = Array.from(
      new Set((data.jogos || []).map((j: Jogo) => j.grupo))
    ).sort() as string[]
    setGrupos(gruposUnicos)
    setCarregando(false)
  }

  useEffect(() => {
    carregarJogos()
  }, [router])

  async function handleImportarTodos() {
    if (!confirm('Deseja importar TODOS os 72 jogos da fase de grupos para sua agenda?\n\nVocê poderá remover os que não quiser depois.')) return

    setImportando(true)
    setErro('')
    setSucesso('')

    try {
      const response = await fetch('/api/copa2026', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acao: 'importar_todos' }),
      })

      const data = await response.json()

      if (!response.ok) {
        setErro(data.message || 'Erro ao importar jogos')
        setImportando(false)
        return
      }

      setSucesso(data.message || 'Jogos importados com sucesso!')
      setJogos((prev) => prev.map((j) => ({ ...j, importado: true })))
      setTotalImportados(jogos.length)
    } catch (err: any) {
      setErro(err.message || 'Erro ao importar jogos')
    } finally {
      setImportando(false)
    }
  }

  async function handleRemoverTodos() {
    if (!confirm('Deseja remover TODOS os jogos da Copa da sua agenda?')) return

    setImportando(true)
    setErro('')
    setSucesso('')

    try {
      const response = await fetch('/api/copa2026', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acao: 'remover_todos' }),
      })

      const data = await response.json()

      if (!response.ok) {
        setErro(data.message || 'Erro ao remover jogos')
        setImportando(false)
        return
      }

      setSucesso(data.message || 'Jogos removidos com sucesso!')
      setJogos((prev) => prev.map((j) => ({ ...j, importado: false })))
      setTotalImportados(0)
    } catch (err: any) {
      setErro(err.message || 'Erro ao remover jogos')
    } finally {
      setImportando(false)
    }
  }

  async function handleToggleJogo(jogo: Jogo) {
    // Optimistic update
    const novoStatus = !jogo.importado
    setJogos((prev) => prev.map((j) => (j.id === jogo.id ? { ...j, importado: novoStatus } : j)))
    setTotalImportados((prev) => (novoStatus ? prev + 1 : prev - 1))

    try {
      const acao = jogo.importado ? 'remover_selecionados' : 'importar_selecionados'
      const response = await fetch('/api/copa2026', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acao, jogosIds: [jogo.id] }),
      })

      if (!response.ok) {
        // Reverter
        setJogos((prev) => prev.map((j) => (j.id === jogo.id ? { ...j, importado: jogo.importado } : j)))
        setTotalImportados((prev) => (novoStatus ? prev - 1 : prev + 1))
        const data = await response.json()
        setErro(data.message || 'Erro ao atualizar jogo')
      }
    } catch (err: any) {
      // Reverter
      setJogos((prev) => prev.map((j) => (j.id === jogo.id ? { ...j, importado: jogo.importado } : j)))
      setTotalImportados((prev) => (novoStatus ? prev - 1 : prev + 1))
      setErro(err.message || 'Erro ao atualizar jogo')
    }
  }

  function formatDate(dateStr: string) {
    const d = new Date(dateStr)
    // Converter UTC para horário de Brasília (UTC-3)
    const brasiliaOffset = -3 * 60
    const localDate = new Date(d.getTime() + brasiliaOffset * 60 * 1000)

    const dias = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
    const meses = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

    return {
      diaSemana: dias[localDate.getUTCDay()],
      dia: localDate.getUTCDate(),
      mes: meses[localDate.getUTCMonth()],
      hora: `${String(localDate.getUTCHours()).padStart(2, '0')}:${String(localDate.getUTCMinutes()).padStart(2, '0')}`,
    }
  }

  const jogosFiltrados = filtroGrupo === 'TODOS' ? jogos : jogos.filter((j) => j.grupo === filtroGrupo)

  if (carregando) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Carregando jogos da Copa...</p>
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
          <Link
            href="/agenda"
            className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 font-medium text-sm"
          >
            Voltar para Agenda
          </Link>
        </div>
      </div>

      {/* Banner Copa */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 py-10 text-center">
          <p className="text-4xl mb-3">⚽🏆</p>
          <h2 className="text-3xl font-bold">Copa do Mundo 2026</h2>
          <p className="text-blue-300 mt-2">EUA • México • Canadá</p>
          <p className="text-yellow-300 mt-3 font-semibold">
            {totalImportados > 0
              ? `${totalImportados} jogo${totalImportados !== 1 ? 's' : ''} na sua agenda`
              : 'Nenhum jogo importado ainda'}
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Mensagens */}
        {erro && (
          <div className="mb-4 p-4 rounded-lg bg-red-50 text-red-700 border border-red-200 flex justify-between items-center">
            <span>{erro}</span>
            <button onClick={() => setErro('')} className="text-red-400 hover:text-red-600 font-bold">✕</button>
          </div>
        )}
        {sucesso && (
          <div className="mb-4 p-4 rounded-lg bg-green-50 text-green-700 border border-green-200 flex justify-between items-center">
            <span>{sucesso}</span>
            <button onClick={() => setSucesso('')} className="text-green-400 hover:text-green-600 font-bold">✕</button>
          </div>
        )}

        {/* Ações */}
        <div className="flex flex-wrap gap-3 mb-6">
          {totalImportados === 0 ? (
            <button
              onClick={handleImportarTodos}
              disabled={importando}
              className="px-6 py-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-medium disabled:opacity-50 transition"
            >
              {importando ? 'Importando...' : '📥 Importar Todos para Minha Agenda'}
            </button>
          ) : (
            <>
              <button
                onClick={handleImportarTodos}
                disabled={importando}
                className="px-5 py-2.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 font-medium disabled:opacity-50 transition text-sm"
              >
                {importando ? 'Importando...' : '📥 Importar Faltantes'}
              </button>
              <button
                onClick={handleRemoverTodos}
                disabled={importando}
                className="px-5 py-2.5 rounded-lg bg-red-600 text-white hover:bg-red-700 font-medium disabled:opacity-50 transition text-sm"
              >
                {importando ? 'Removendo...' : '🗑️ Remover Todos'}
              </button>
            </>
          )}
        </div>

        {/* Filtro de Grupos */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setFiltroGrupo('TODOS')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition ${
              filtroGrupo === 'TODOS'
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            🌍 Todos
          </button>
          {grupos.map((g) => (
            <button
              key={g}
              onClick={() => setFiltroGrupo(g)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                filtroGrupo === g
                  ? 'bg-blue-600 text-white'
                  : g === 'C'
                  ? 'bg-white border border-emerald-400 text-gray-700 hover:bg-emerald-50'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              Grupo {g}{g === 'C' ? ' 🇧🇷' : ''}
            </button>
          ))}
        </div>

        {/* Grid de Jogos */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {jogosFiltrados.map((jogo) => {
            const { diaSemana, dia, mes, hora } = formatDate(jogo.date)
            const isBrasil = jogo.home === 'Brasil' || jogo.away === 'Brasil'

            return (
              <div
                key={jogo.id}
                className={`rounded-xl overflow-hidden shadow-sm hover:shadow-md transition border ${
                  jogo.importado
                    ? 'bg-white border-blue-300 ring-2 ring-blue-500'
                    : 'bg-white border-gray-200'
                } ${isBrasil ? 'ring-2 ring-emerald-400 border-emerald-300' : ''}`}
              >
                {/* Corpo clicável — abre detalhes */}
                <div
                  className="cursor-pointer"
                  onClick={() => setJogoSelecionado(jogo)}
                >
                  {/* Header do card */}
                  <div className={`px-4 py-2 flex justify-between items-center text-xs ${
                    isBrasil ? 'bg-emerald-50' : 'bg-gray-50'
                  }`}>
                    <span className="font-bold text-gray-500 uppercase tracking-wide">
                      Grupo {jogo.grupo} • R{jogo.rodada}
                    </span>
                    <span className="font-semibold text-blue-600">
                      {diaSemana}, {dia} {mes} • {hora}h
                    </span>
                  </div>

                  {/* Times */}
                  <div className="px-4 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <span className="text-2xl">{jogo.homeBandeira}</span>
                        <span className={`font-semibold ${
                          isBrasil && jogo.home === 'Brasil' ? 'text-emerald-600 font-bold' : 'text-gray-900'
                        }`}>
                          {jogo.home}
                        </span>
                      </div>

                      <span className="text-gray-400 font-bold text-lg mx-3">×</span>

                      <div className="flex items-center gap-3 flex-1 justify-end">
                        <span className={`font-semibold ${
                          isBrasil && jogo.away === 'Brasil' ? 'text-emerald-600 font-bold' : 'text-gray-900'
                        }`}>
                          {jogo.away}
                        </span>
                        <span className="text-2xl">{jogo.awayBandeira}</span>
                      </div>
                    </div>
                  </div>

                  {/* Local */}
                  <div className="px-4 pb-2">
                    <span className="text-xs text-gray-500">📍 {jogo.stadium}, {jogo.city}</span>
                  </div>
                </div>

                {/* Footer clicável — toggle importação */}
                <div
                  className={`px-4 py-2.5 flex justify-between items-center border-t cursor-pointer transition-colors ${
                    jogo.importado
                      ? 'bg-blue-50 border-blue-100 hover:bg-blue-100'
                      : 'bg-gray-50 border-gray-100 hover:bg-gray-100'
                  }`}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleToggleJogo(jogo)
                  }}
                >
                  <span className={`text-sm font-semibold ${
                    jogo.importado ? 'text-blue-600' : 'text-gray-400'
                  }`}>
                    {jogo.importado ? '✅ Na agenda' : '➕ Adicionar à agenda'}
                  </span>
                </div>
              </div>
            )
          })}
        </div>

        {jogosFiltrados.length === 0 && (
          <div className="text-center py-16 bg-white rounded-lg">
            <p className="text-gray-500 text-lg">Nenhum jogo encontrado</p>
          </div>
        )}
      </div>

      {/* Modal de Detalhes do Jogo */}
      {jogoSelecionado && (() => {
        const { diaSemana, dia, mes, hora } = formatDate(jogoSelecionado.date)
        const isBrasil = jogoSelecionado.home === 'Brasil' || jogoSelecionado.away === 'Brasil'
        const dataFim = new Date(new Date(jogoSelecionado.date).getTime() + 2 * 60 * 60 * 1000)
        const { hora: horaFim } = formatDate(dataFim.toISOString())

        return (
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setJogoSelecionado(null)}
          >
            <div
              className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header do modal */}
              <div className={`px-6 py-5 text-center ${isBrasil ? 'bg-emerald-800' : 'bg-slate-800'}`}>
                <p className="text-xs text-gray-300 uppercase tracking-widest mb-2">
                  Copa do Mundo 2026 • Grupo {jogoSelecionado.grupo} • Rodada {jogoSelecionado.rodada}
                </p>
                <div className="flex items-center justify-center gap-6 my-4">
                  <div className="text-center">
                    <span className="text-4xl block mb-1">{jogoSelecionado.homeBandeira}</span>
                    <span className={`font-bold text-white text-lg ${isBrasil && jogoSelecionado.home === 'Brasil' ? 'text-emerald-300' : ''}`}>
                      {jogoSelecionado.home}
                    </span>
                  </div>
                  <span className="text-3xl font-bold text-gray-400">×</span>
                  <div className="text-center">
                    <span className="text-4xl block mb-1">{jogoSelecionado.awayBandeira}</span>
                    <span className={`font-bold text-white text-lg ${isBrasil && jogoSelecionado.away === 'Brasil' ? 'text-emerald-300' : ''}`}>
                      {jogoSelecionado.away}
                    </span>
                  </div>
                </div>
              </div>

              {/* Informações */}
              <div className="px-6 py-5 space-y-4">
                <div className="flex items-start gap-3">
                  <span className="text-lg">📅</span>
                  <div>
                    <p className="text-xs text-gray-400">Data</p>
                    <p className="text-gray-900 font-medium">{diaSemana}, {dia} {mes} de 2026</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="text-lg">🕐</span>
                  <div>
                    <p className="text-xs text-gray-400">Horário (Brasília)</p>
                    <p className="text-gray-900 font-medium">{hora}h - {horaFim}h</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="text-lg">📍</span>
                  <div>
                    <p className="text-xs text-gray-400">Local</p>
                    <p className="text-gray-900 font-medium">{jogoSelecionado.stadium}</p>
                    <p className="text-gray-500 text-sm">{jogoSelecionado.city}</p>
                  </div>
                </div>

                {/* Aviso somente visualização */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-3">
                  <span className="text-xl">⚽</span>
                  <div>
                    <p className="text-green-800 font-semibold text-sm">Jogo da Copa do Mundo 2026</p>
                    <p className="text-green-600 text-xs">Este compromisso não pode ser editado.</p>
                  </div>
                </div>
              </div>

              {/* Ações do modal */}
              <div className="px-6 pb-5 flex gap-3">
                <button
                  onClick={() => {
                    handleToggleJogo(jogoSelecionado)
                    setJogoSelecionado({
                      ...jogoSelecionado,
                      importado: !jogoSelecionado.importado,
                    })
                  }}
                  className={`flex-1 py-3 rounded-lg font-medium transition text-sm ${
                    jogoSelecionado.importado
                      ? 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {jogoSelecionado.importado ? '🗑️ Remover da agenda' : '📥 Importar para agenda'}
                </button>
                <button
                  onClick={() => setJogoSelecionado(null)}
                  className="px-6 py-3 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 font-medium text-sm"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
