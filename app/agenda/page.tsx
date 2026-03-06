'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'

export const dynamic = 'force-dynamic'

interface Compromisso {
  ID_COMPROMISSO: string
  ID_AGENDA: string
  TITULO: string
  DESCRICAO?: string
  LOCAL?: string
  DATA_INICIO: string
  DATA_FIM: string
  ORIGEM: string
  STATUS: string
  URGENTE?: boolean
  IMPORTANCIA?: number | null
  CRIADO_POR: string
  agenda_nome?: string
  dono_nome?: string
  compartilhado?: boolean
  permissao?: string
  destinatarios?: { nome: string; email: string; status: string }[]
}

type ViewMode = 'calendar' | 'list'

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const DIAS_SEMANA_COMPLETO = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado']
const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
const MESES_CURTOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

function toDateKey(date: Date) {
  const y = date.getFullYear()
  const m = (date.getMonth() + 1).toString().padStart(2, '0')
  const d = date.getDate().toString().padStart(2, '0')
  return `${y}-${m}-${d}`
}

function getStatusColor(status: string) {
  switch (status) {
    case 'CONFIRMADO': return '#10B981'
    case 'ATIVO': return '#2563EB'
    case 'CANCELADO': return '#EF4444'
    case 'PENDENTE': return '#F59E0B'
    default: return '#6B7280'
  }
}

function getImportanciaColor(importancia?: number | null): string | null {
  switch (importancia) {
    case 3: return '#EF4444'
    case 2: return '#EAB308'
    case 1: return '#2563EB'
    default: return null
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case 'CONFIRMADO': return 'Confirmado'
    case 'ATIVO': return 'Ativo'
    case 'CANCELADO': return 'Cancelado'
    case 'PENDENTE': return 'Pendente'
    default: return status
  }
}

function formatarHorario(dataISO: string, dataFimISO?: string) {
  const inicio = new Date(dataISO)
  const h1 = inicio.getHours().toString().padStart(2, '0')
  const m1 = inicio.getMinutes().toString().padStart(2, '0')
  if (dataFimISO) {
    const fim = new Date(dataFimISO)
    const h2 = fim.getHours().toString().padStart(2, '0')
    const m2 = fim.getMinutes().toString().padStart(2, '0')
    if (`${h1}:${m1}` !== `${h2}:${m2}`) return `${h1}:${m1} - ${h2}:${m2}`
  }
  return `${h1}:${m1}`
}

export default function AgendaPage() {
  const router = useRouter()
  const supabase = useMemo(() => createSupabaseBrowserClient(), [])

  const [usuario, setUsuario] = useState<any>(null)
  const [nomeUsuario, setNomeUsuario] = useState('')
  const [compromissos, setCompromissos] = useState<Compromisso[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('calendar')
  const [pendentesWeb, setPendentesWeb] = useState(0)

  // Seleção múltipla
  const [modoSelecao, setModoSelecao] = useState(false)
  const [selecionados, setSelecionados] = useState<string[]>([])
  const [realizandoAcao, setRealizandoAcao] = useState(false)

  // Calendário
  const hoje = useMemo(() => toDateKey(new Date()), [])
  const [selectedDate, setSelectedDate] = useState<string>(hoje)
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() } // 0-indexed
  })

  useEffect(() => {
    async function carregar() {
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

      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        setUsuario(session.user)
        try {
          const configRes = await fetch('/api/configuracoes')
          if (configRes.ok) {
            const configData = await configRes.json()
            const nome: string = configData.usuario?.NOME || ''
            setNomeUsuario(nome.split(' ')[0])
          }
        } catch {}
      }
      setCarregando(false)
    }
    carregar()
  }, [router, supabase])

  // Badge de compartilhamentos pendentes
  useEffect(() => {
    Promise.all([
      fetch('/api/compartilhamento').then((r) => r.json()).catch(() => ({})),
      fetch('/api/compartilhamento-compromisso').then((r) => r.json()).catch(() => ({})),
    ]).then(([d1, d2]) => {
      const p1 = (d1.recebidos || []).filter((c: any) => c.STATUS === 'PENDENTE').length
      const p2 = (d2.recebidos || []).filter((c: any) => c.STATUS === 'PENDENTE').length
      setPendentesWeb(p1 + p2)
    }).catch(() => {})
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  async function handleDelete(id: string) {
    if (!confirm('Tem certeza que deseja deletar este compromisso?')) return
    const response = await fetch(`/api/compromisso?id=${id}`, { method: 'DELETE' })
    if (!response.ok) {
      const data = await response.json()
      setErro(data.message || 'Erro ao deletar')
      return
    }
    setCompromissos((prev) => prev.filter((c) => c.ID_COMPROMISSO !== id))
  }

  async function handleArquivar(id: string, titulo: string) {
    if (!confirm(`Arquivar "${titulo}"?\n\nO compromisso será movido para Arquivados e poderá ser excluído definitivamente em Configurações.`)) return

    const response = await fetch('/api/compromisso', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ID_COMPROMISSO: id, ARQUIVADO: true }),
    })

    if (!response.ok) {
      const data = await response.json()
      setErro(data.message || 'Erro ao arquivar')
      return
    }

    setCompromissos((prev) => prev.filter((c) => c.ID_COMPROMISSO !== id))
  }

  // ─── Seleção múltipla ────────────────────────────────────────────────────
  function sairModoSelecao() {
    setModoSelecao(false)
    setSelecionados([])
  }

  function toggleSelecao(id: string) {
    setSelecionados((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  function selecionarTodos(lista: Compromisso[]) {
    const ids = lista.map((c) => c.ID_COMPROMISSO)
    setSelecionados(ids)
  }

  async function handleBulkCancel() {
    if (selecionados.length === 0) return
    if (!confirm(`Cancelar ${selecionados.length} compromisso(s) selecionado(s)?`)) return
    setRealizandoAcao(true)
    let erros = 0
    for (const id of selecionados) {
      const res = await fetch('/api/compromisso', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ID_COMPROMISSO: id, STATUS: 'CANCELADO' }),
      })
      if (!res.ok) erros++
    }
    // Atualiza estado local
    setCompromissos((prev) =>
      prev.map((c) =>
        selecionados.includes(c.ID_COMPROMISSO) ? { ...c, STATUS: 'CANCELADO' } : c
      )
    )
    setRealizandoAcao(false)
    sairModoSelecao()
    if (erros > 0) setErro(`${erros} compromisso(s) não puderam ser cancelados.`)
  }

  async function handleBulkArquivar() {
    if (selecionados.length === 0) return
    const naoCancelados = selecionados.filter((id) => {
      const comp = compromissos.find((c) => c.ID_COMPROMISSO === id)
      return comp && comp.STATUS !== 'CANCELADO'
    })
    if (naoCancelados.length > 0) {
      alert(`${naoCancelados.length} compromisso(s) selecionado(s) não estão cancelados.\n\nPara arquivar, cancele-os primeiro.`)
      return
    }
    if (!confirm(`Arquivar ${selecionados.length} compromisso(s) selecionado(s)?`)) return
    setRealizandoAcao(true)
    let erros = 0
    for (const id of selecionados) {
      const res = await fetch('/api/compromisso', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ID_COMPROMISSO: id, ARQUIVADO: true }),
      })
      if (!res.ok) erros++
    }
    setCompromissos((prev) => prev.filter((c) => !selecionados.includes(c.ID_COMPROMISSO)))
    setRealizandoAcao(false)
    sairModoSelecao()
    if (erros > 0) setErro(`${erros} compromisso(s) não puderam ser arquivados.`)
  }

  async function handleBulkDelete() {
    if (selecionados.length === 0) return
    if (!confirm(`Excluir permanentemente ${selecionados.length} compromisso(s) selecionado(s)?`)) return
    setRealizandoAcao(true)
    let erros = 0
    for (const id of selecionados) {
      const res = await fetch(`/api/compromisso?id=${id}`, { method: 'DELETE' })
      if (!res.ok) erros++
    }
    // Atualiza estado local
    setCompromissos((prev) =>
      prev.filter((c) => !selecionados.includes(c.ID_COMPROMISSO))
    )
    setRealizandoAcao(false)
    sairModoSelecao()
    if (erros > 0) setErro(`${erros} compromisso(s) não puderam ser excluídos.`)
  }
  // ────────────────────────────────────────────────────────────────────────

  // Mapa: dateKey → array de compromissos
  const compromissosPorDia = useMemo(() => {
    const map: Record<string, Compromisso[]> = {}
    compromissos.forEach((c) => {
      const key = c.DATA_INICIO.split('T')[0]
      if (!map[key]) map[key] = []
      map[key].push(c)
    })
    return map
  }, [compromissos])

  // Compromissos do dia selecionado
  const compromissosDoDia = useMemo(() =>
    compromissosPorDia[selectedDate] || [],
    [compromissosPorDia, selectedDate]
  )

  // Todos os compromissos para modo lista (passados + futuros)
  const compromissosFuturos = useMemo(() => {
    return [...compromissos].sort(
      (a, b) => new Date(a.DATA_INICIO).getTime() - new Date(b.DATA_INICIO).getTime()
    )
  }, [compromissos])

  // Compromissos do mês visível (usado na aba lista)
  const compromissoDoMes = useMemo(() => {
    return [...compromissos]
      .filter(c => {
        const d = new Date(c.DATA_INICIO)
        return d.getFullYear() === calendarMonth.year && d.getMonth() === calendarMonth.month
      })
      .sort((a, b) => new Date(a.DATA_INICIO).getTime() - new Date(b.DATA_INICIO).getTime())
  }, [compromissos, calendarMonth])

  // Gerar dias do mês atual para o grid
  const calendarDays = useMemo(() => {
    const { year, month } = calendarMonth
    const firstDay = new Date(year, month, 1).getDay() // 0=Dom
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const days: (string | null)[] = []
    for (let i = 0; i < firstDay; i++) days.push(null)
    for (let d = 1; d <= daysInMonth; d++) {
      const m = (month + 1).toString().padStart(2, '0')
      const day = d.toString().padStart(2, '0')
      days.push(`${year}-${m}-${day}`)
    }
    return days
  }, [calendarMonth])

  function prevMonth() {
    setCalendarMonth(({ year, month }) => {
      if (month === 0) return { year: year - 1, month: 11 }
      return { year, month: month - 1 }
    })
  }

  function nextMonth() {
    setCalendarMonth(({ year, month }) => {
      if (month === 11) return { year: year + 1, month: 0 }
      return { year, month: month + 1 }
    })
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

  const dataSelecionadaFormatada = (() => {
    const [ano, mes, dia] = selectedDate.split('-')
    const d = new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia))
    return selectedDate === hoje
      ? 'Hoje'
      : `${DIAS_SEMANA[d.getDay()]}, ${dia} de ${MESES[d.getMonth()]}`
  })()

  const compromissosFiltrados = viewMode === 'calendar' ? compromissosDoDia : compromissoDoMes

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">
            Agend<span className="text-blue-600">AI</span>
          </h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              Olá, seja bem-vindo <strong>{nomeUsuario || usuario?.email?.split('@')[0]}</strong>! 👋
            </span>
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
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Navegação */}
        <div className="flex flex-wrap gap-3 mb-6">
          <Link
            href="/agenda/novo"
            className="px-5 py-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-medium text-sm"
          >
            + Novo Compromisso
          </Link>
          <Link
            href="/copa2026"
            className="px-5 py-2.5 rounded-lg bg-slate-800 text-white hover:bg-slate-900 font-medium text-sm"
          >
            ⚽ Copa 2026
          </Link>
          <div className="relative inline-flex">
            <Link
              href="/compartilhar"
              className="px-5 py-2.5 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 font-medium text-sm"
            >
              Compartilhamentos
            </Link>
            {pendentesWeb > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1 pointer-events-none">
                {pendentesWeb}
              </span>
            )}
          </div>
          <Link
            href="/configuracoes"
            className="px-5 py-2.5 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 font-medium text-sm"
          >
            Configurações
          </Link>

          {/* Botão Selecionar */}
          {!modoSelecao ? (
            <button
              onClick={() => setModoSelecao(true)}
              className="px-5 py-2.5 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 font-medium text-sm"
            >
              ☑️ Selecionar
            </button>
          ) : (
            <button
              onClick={sairModoSelecao}
              className="px-5 py-2.5 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 font-medium text-sm"
            >
              ✕ Cancelar seleção
            </button>
          )}
        </div>

        {/* Barra de ações — modo seleção */}
        {modoSelecao && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-xl flex flex-wrap items-center gap-3">
            <span className="text-sm font-semibold text-blue-800">
              {selecionados.length} selecionado(s)
            </span>
            <button
              onClick={() => selecionarTodos(compromissosFiltrados)}
              className="text-sm text-blue-700 hover:text-blue-900 underline"
            >
              Selecionar todos
            </button>
            <div className="flex gap-2 ml-auto">
              <button
                onClick={handleBulkCancel}
                disabled={selecionados.length === 0 || realizandoAcao}
                className="px-4 py-1.5 rounded-lg bg-amber-500 text-white text-sm font-medium hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {realizandoAcao ? '⏳ Aguarde...' : '⏸ Cancelar'}
              </button>
              <button
                onClick={handleBulkArquivar}
                disabled={selecionados.length === 0 || realizandoAcao}
                className="px-4 py-1.5 rounded-lg bg-gray-500 text-white text-sm font-medium hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {realizandoAcao ? '⏳ Aguarde...' : '📦 Arquivar'}
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={selecionados.length === 0 || realizandoAcao}
                className="px-4 py-1.5 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {realizandoAcao ? '⏳ Aguarde...' : '🗑️ Excluir'}
              </button>
            </div>
          </div>
        )}

        {erro && (
          <div className="mb-6 p-4 rounded-lg bg-red-50 text-red-700 border border-red-200">
            {erro}
          </div>
        )}

        {/* Toggle Calendário / Lista */}
        <div className="flex bg-white rounded-xl shadow-sm p-1 mb-6 w-fit">
          <button
            onClick={() => setViewMode('calendar')}
            className={`px-6 py-2 rounded-lg text-sm font-semibold transition ${
              viewMode === 'calendar'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            📅 Calendário
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-6 py-2 rounded-lg text-sm font-semibold transition ${
              viewMode === 'list'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            📋 Lista
          </button>
        </div>

        <div className={viewMode === 'calendar' ? 'flex gap-6 items-start' : ''}>
          {/* Calendário */}
          {viewMode === 'calendar' && (
            <div className="bg-white rounded-xl shadow-sm p-5 w-full max-w-sm flex-shrink-0">
              {/* Navegação do mês */}
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={prevMonth}
                  className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 font-bold text-lg"
                >
                  ‹
                </button>
                <span className="font-bold text-gray-900">
                  {MESES[calendarMonth.month]} {calendarMonth.year}
                </span>
                <button
                  onClick={nextMonth}
                  className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 font-bold text-lg"
                >
                  ›
                </button>
              </div>

              {/* Cabeçalho dias da semana */}
              <div className="grid grid-cols-7 mb-2">
                {DIAS_SEMANA.map((d) => (
                  <div key={d} className="text-center text-xs font-semibold text-gray-400 py-1">
                    {d}
                  </div>
                ))}
              </div>

              {/* Grid de dias */}
              <div className="grid grid-cols-7 gap-y-1">
                {calendarDays.map((dateKey, i) => {
                  if (!dateKey) return <div key={`empty-${i}`} />
                  const isSelected = dateKey === selectedDate
                  const isToday = dateKey === hoje
                  const hasEvents = !!(compromissosPorDia[dateKey]?.length)
                  const eventCount = compromissosPorDia[dateKey]?.length || 0
                  const hasShared = compromissosPorDia[dateKey]?.some((c) => c.compartilhado)
                  // Importância máxima do dia (com retrocompat com URGENTE)
                  const importanciaMax = (compromissosPorDia[dateKey] || []).reduce((max, c) => {
                    const imp = c.IMPORTANCIA ?? (c.URGENTE ? 3 : null)
                    if (imp !== null && (max === null || imp > max)) return imp
                    return max
                  }, null as number | null)
                  const impColor = getImportanciaColor(importanciaMax)
                  const dotColor = impColor ?? (hasShared ? '#8B5CF6' : '#2563EB')
                  const hasBorder = hasShared && impColor !== null

                  return (
                    <button
                      key={dateKey}
                      onClick={() => setSelectedDate(dateKey)}
                      className={`relative flex flex-col items-center py-1.5 rounded-lg transition text-sm font-medium ${
                        isSelected
                          ? 'bg-blue-600 text-white'
                          : isToday
                          ? 'text-blue-600 font-bold'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {parseInt(dateKey.split('-')[2])}
                      {hasEvents && (
                        <div className="mt-0.5">
                          {/* Ponto único: cor de importância + borda roxa quando compartilhado */}
                          <span
                            className="block w-1.5 h-1.5 rounded-full"
                            style={{
                              backgroundColor: isSelected ? 'rgba(255,255,255,0.85)' : dotColor,
                              boxShadow: !isSelected && hasBorder ? `0 0 0 1.5px #8B5CF6` : undefined,
                            }}
                          />
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Coluna direita: lista de compromissos */}
          <div className="flex-1 min-w-0">
            {viewMode === 'calendar' && (
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">{dataSelecionadaFormatada}</h2>
                  <p className="text-sm text-gray-500">
                    {compromissosDoDia.length} compromisso{compromissosDoDia.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            )}

            {viewMode === 'list' && (
              <div className="flex items-center justify-between mb-4 bg-white rounded-xl p-3 shadow-sm">
                <button
                  onClick={prevMonth}
                  className="p-1.5 rounded-lg hover:bg-gray-100 text-blue-600 font-bold text-xl leading-none"
                >
                  ‹
                </button>
                <div className="text-center">
                  <p className="font-bold text-gray-900">{MESES[calendarMonth.month]} {calendarMonth.year}</p>
                  <p className="text-xs text-gray-500">{compromissoDoMes.length} compromisso{compromissoDoMes.length !== 1 ? 's' : ''}</p>
                </div>
                <button
                  onClick={nextMonth}
                  className="p-1.5 rounded-lg hover:bg-gray-100 text-blue-600 font-bold text-xl leading-none"
                >
                  ›
                </button>
              </div>
            )}

            {compromissosFiltrados.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                <p className="text-4xl mb-3">{viewMode === 'calendar' ? '📭' : '📅'}</p>
                <p className="text-gray-500 font-medium">
                  {viewMode === 'calendar'
                    ? 'Nenhum compromisso neste dia'
                    : 'Nenhum compromisso neste mês'}
                </p>
                <p className="text-gray-400 text-sm mt-1">
                  Clique em "+ Novo Compromisso" para adicionar
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {compromissosFiltrados.map((comp) => {
                  const horario = formatarHorario(comp.DATA_INICIO, comp.DATA_FIM)
                  const statusColor = getStatusColor(comp.STATUS)
                  const isCopa = comp.ORIGEM === 'COPA2026'
                  const vencido = new Date(comp.DATA_INICIO) < new Date()
                  const selecionado = selecionados.includes(comp.ID_COMPROMISSO)

                  // Data — sempre exibida em destaque no card
                  const dataComp = new Date(comp.DATA_INICIO)
                  const dataAno = dataComp.getFullYear().toString().slice(-2)
                  const dataFmt = `${dataComp.getDate().toString().padStart(2,'0')}/${(dataComp.getMonth()+1).toString().padStart(2,'0')}/${dataAno}`
                  const diaSemana = DIAS_SEMANA_COMPLETO[dataComp.getDay()]

                  // Conteúdo interno do card (igual para Link e div)
                  const cardContent = (
                    <>
                      {/* Barra colorida lateral */}
                      <div className="w-1 flex-shrink-0" style={{ backgroundColor: vencido ? '#9CA3AF' : (getImportanciaColor(comp.IMPORTANCIA) ?? (comp.URGENTE ? '#EF4444' : statusColor)) }} />

                      {/* Checkbox (modo seleção) */}
                      {modoSelecao && (
                        <div className="flex items-center pl-3">
                          <div
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition ${
                              selecionado
                                ? 'bg-blue-600 border-blue-600'
                                : 'bg-white border-gray-300'
                            }`}
                          >
                            {selecionado && (
                              <span className="text-white text-xs font-bold">✓</span>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="flex-1 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            {/* Título */}
                            <div className="flex items-center gap-2 mb-1">
                              {isCopa && <span className="text-base">⚽</span>}
                              <h3 className="font-semibold text-gray-900 truncate">{comp.TITULO}</h3>
                              {comp.compartilhado && comp.dono_nome && (
                                <span className="flex-shrink-0 text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                                  📤 Compartilhado por: {comp.dono_nome.split(' ')[0]}
                                </span>
                              )}
                            </div>

                            {/* Data · Dia da semana · Horário — mesma linha (ambos os modos) */}
                            <div className="flex flex-wrap items-center gap-x-1 gap-y-1 text-sm mt-1.5">
                              <span className="font-bold text-blue-600">📅 {dataFmt}</span>
                              <span className="text-gray-400">·</span>
                              <span className="font-bold text-gray-800 text-sm">{diaSemana}</span>
                              <span className="text-gray-400">·</span>
                              <span className="text-gray-500">🕐 {horario}</span>
                            </div>

                            {/* Infos — local */}
                            <div className="flex flex-wrap gap-3 text-sm text-gray-500 mt-1">
                              {comp.LOCAL && (
                                <a
                                  href={`https://maps.google.com/maps?q=${encodeURIComponent(comp.LOCAL)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="truncate text-blue-600 hover:underline"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  📍 {comp.LOCAL}
                                </a>
                              )}
                            </div>

                            {comp.DESCRICAO && (
                              <p className="text-sm text-gray-400 mt-1.5 line-clamp-2">{comp.DESCRICAO}</p>
                            )}

                            {/* Destinatários (quem eu compartilhei) */}
                            {!comp.compartilhado && comp.destinatarios && comp.destinatarios.length > 0 && (
                              <div className="flex items-start gap-1.5 mt-1.5">
                                <span className="text-sm flex-shrink-0">📤</span>
                                <span className="text-xs text-blue-600">
                                  {'Compartilhado com: ' + comp.destinatarios.map((d: any) => d.nome.split(' ')[0]).join(', ')}
                                </span>
                              </div>
                            )}

                            {/* Badges — só status não-Ativo e compartilhado sem dono */}
                            {(comp.STATUS !== 'ATIVO' || (comp.compartilhado && !comp.dono_nome)) && (
                              <div className="flex gap-2 mt-2">
                                {comp.STATUS !== 'ATIVO' && (
                                  <span
                                    className="text-xs px-2 py-0.5 rounded-full font-medium"
                                    style={{
                                      backgroundColor: statusColor + '20',
                                      color: statusColor,
                                    }}
                                  >
                                    {getStatusLabel(comp.STATUS)}
                                  </span>
                                )}
                                {comp.compartilhado && !comp.dono_nome && (
                                  <span className="text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-600 font-medium">
                                    Compartilhado
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Seta indicando que é clicável (só fora do modo seleção) */}
                          {!modoSelecao && (
                            <div className="flex-shrink-0 text-gray-300 self-center text-lg">›</div>
                          )}
                        </div>
                      </div>
                    </>
                  )

                  return (
                    <div key={comp.ID_COMPROMISSO} className="flex flex-col gap-1.5">
                      {modoSelecao ? (
                        // Modo seleção: div clicável que toggle o item
                        <div
                          onClick={() => toggleSelecao(comp.ID_COMPROMISSO)}
                          className={`rounded-xl shadow-sm overflow-hidden flex transition cursor-pointer select-none ${
                            selecionado
                              ? 'ring-2 ring-blue-500 bg-blue-50'
                              : comp.compartilhado
                              ? 'bg-purple-50 border border-purple-100 hover:shadow-md'
                              : vencido
                              ? 'bg-white opacity-60 hover:shadow-md'
                              : 'bg-white hover:shadow-md'
                          }`}
                        >
                          {cardContent}
                        </div>
                      ) : (
                        // Modo normal: Link para detalhes
                        <Link
                          href={`/agenda/${comp.ID_COMPROMISSO}`}
                          className={`rounded-xl shadow-sm overflow-hidden flex transition hover:shadow-md cursor-pointer ${
                            comp.compartilhado ? 'bg-purple-50 border border-purple-100' : vencido ? 'bg-white opacity-60' : 'bg-white'
                          }`}
                        >
                          {cardContent}
                        </Link>
                      )}

                      {/* Botão Arquivar — só para compromissos vencidos, não compartilhados, fora do modo seleção */}
                      {!modoSelecao && vencido && !comp.compartilhado && (
                        <button
                          onClick={() => handleArquivar(comp.ID_COMPROMISSO, comp.TITULO)}
                          className="self-start text-xs text-gray-500 hover:text-gray-700 px-3 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 transition"
                        >
                          📦 Arquivar
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
