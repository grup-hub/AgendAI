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
  CRIADO_POR: string
  agenda_nome?: string
  dono_nome?: string
  compartilhado?: boolean
  permissao?: string
}

type ViewMode = 'calendar' | 'list'

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
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
  const [compromissos, setCompromissos] = useState<Compromisso[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('calendar')

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
      if (session) setUsuario(session.user)
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
    const response = await fetch(`/api/compromisso?id=${id}`, { method: 'DELETE' })
    if (!response.ok) {
      const data = await response.json()
      setErro(data.message || 'Erro ao deletar')
      return
    }
    setCompromissos((prev) => prev.filter((c) => c.ID_COMPROMISSO !== id))
  }

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

  // Compromissos futuros para modo lista
  const compromissosFuturos = useMemo(() => {
    const agora = new Date()
    agora.setHours(0, 0, 0, 0)
    return [...compromissos]
      .filter((c) => new Date(c.DATA_INICIO) >= agora)
      .sort((a, b) => new Date(a.DATA_INICIO).getTime() - new Date(b.DATA_INICIO).getTime())
  }, [compromissos])

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

  const compromissosFiltrados = viewMode === 'calendar' ? compromissosDoDia : compromissosFuturos

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
          <Link
            href="/compartilhar"
            className="px-5 py-2.5 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 font-medium text-sm"
          >
            Compartilhamentos
          </Link>
          <Link
            href="/configuracoes"
            className="px-5 py-2.5 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 font-medium text-sm"
          >
            Configurações
          </Link>
        </div>

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
                        <div className="flex gap-0.5 mt-0.5">
                          {/* Ponto azul (próprios) */}
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isSelected ? 'bg-white' : 'bg-blue-500'
                            }`}
                          />
                          {/* Ponto roxo (compartilhados) — só se tiver */}
                          {hasShared && (
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                isSelected ? 'bg-blue-200' : 'bg-purple-500'
                              }`}
                            />
                          )}
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
              <h2 className="text-lg font-bold text-gray-900 mb-4">
                Próximos compromissos
                <span className="ml-2 text-sm font-normal text-gray-500">
                  ({compromissosFuturos.length} {compromissosFuturos.length !== 1 ? 'compromissos' : 'compromisso'})
                </span>
              </h2>
            )}

            {compromissosFiltrados.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                <p className="text-4xl mb-3">{viewMode === 'calendar' ? '📭' : '📅'}</p>
                <p className="text-gray-500 font-medium">
                  {viewMode === 'calendar'
                    ? 'Nenhum compromisso neste dia'
                    : 'Nenhum compromisso futuro'}
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

                  // Data para modo lista
                  const dataComp = new Date(comp.DATA_INICIO)
                  const dataLabel = viewMode === 'list'
                    ? `${dataComp.getDate().toString().padStart(2,'0')}/${(dataComp.getMonth()+1).toString().padStart(2,'0')}`
                    : null

                  return (
                    <div
                      key={comp.ID_COMPROMISSO}
                      className={`rounded-xl shadow-sm overflow-hidden flex transition hover:shadow-md ${
                        comp.compartilhado ? 'bg-purple-50 border border-purple-100' : 'bg-white'
                      }`}
                    >
                      {/* Barra colorida lateral */}
                      <div className="w-1 flex-shrink-0" style={{ backgroundColor: statusColor }} />

                      <div className="flex-1 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            {/* Título */}
                            <div className="flex items-center gap-2 mb-1">
                              {isCopa && <span className="text-base">⚽</span>}
                              <h3 className="font-semibold text-gray-900 truncate">{comp.TITULO}</h3>
                              {comp.compartilhado && (
                                <span className="flex-shrink-0 text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                                  👤 {comp.dono_nome}
                                </span>
                              )}
                            </div>

                            {/* Infos */}
                            <div className="flex flex-wrap gap-3 text-sm text-gray-500 mt-1">
                              <span>🕐 {horario}</span>
                              {dataLabel && <span>📅 {dataLabel}</span>}
                              {comp.LOCAL && <span className="truncate">📍 {comp.LOCAL}</span>}
                            </div>

                            {comp.DESCRICAO && (
                              <p className="text-sm text-gray-400 mt-1.5 line-clamp-2">{comp.DESCRICAO}</p>
                            )}

                            {/* Badges */}
                            <div className="flex gap-2 mt-2">
                              <span
                                className="text-xs px-2 py-0.5 rounded-full font-medium"
                                style={{
                                  backgroundColor: statusColor + '20',
                                  color: statusColor,
                                }}
                              >
                                {getStatusLabel(comp.STATUS)}
                              </span>
                              {comp.compartilhado && comp.permissao && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-600">
                                  {comp.permissao === 'EDITAR' ? 'Pode editar' : 'Somente visualizar'}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Ações */}
                          <div className="flex gap-2 flex-shrink-0">
                            {(!comp.compartilhado || comp.permissao === 'EDITAR') && (
                              <Link
                                href={`/agenda/${comp.ID_COMPROMISSO}`}
                                className="px-3 py-1.5 rounded-lg text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 font-medium"
                              >
                                Editar
                              </Link>
                            )}
                            {!comp.compartilhado && !isCopa && (
                              <button
                                onClick={() => handleDelete(comp.ID_COMPROMISSO)}
                                className="px-3 py-1.5 rounded-lg text-xs bg-red-50 text-red-700 hover:bg-red-100 font-medium"
                              >
                                Deletar
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
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
