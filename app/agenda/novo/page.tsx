'use client'

import Link from 'next/link'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { DayPicker } from 'react-day-picker'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

type RecorrenciaTipo = 'SEMANAL' | 'MENSAL' | 'PERSONALIZADA'

const DIAS_SEMANA = [
  { label: 'Dom', value: 0 },
  { label: 'Seg', value: 1 },
  { label: 'Ter', value: 2 },
  { label: 'Qua', value: 3 },
  { label: 'Qui', value: 4 },
  { label: 'Sex', value: 5 },
  { label: 'Sáb', value: 6 },
]

function buildISO(date: Date | undefined, hora: string): string {
  if (!date || !hora) return ''
  const [h, m] = hora.split(':').map(Number)
  const d = new Date(date)
  d.setHours(h, m, 0, 0)
  return d.toISOString()
}

export default function NovoCompromissoPage() {
  const router = useRouter()

  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [local, setLocal] = useState('')
  const [importancia, setImportancia] = useState<0 | 1 | 2 | 3>(0) // 0=sem, 1=baixa, 2=média, 3=alta
  const [lembrete, setLembrete] = useState(30)

  // Data início — calendar picker
  const [dataSelecionada, setDataSelecionada] = useState<Date | undefined>(undefined)
  const [mostrarCalData, setMostrarCalData] = useState(false)
  const [horaInicio, setHoraInicio] = useState('')

  // Data fim — calendar picker
  const [dataSelecionadaFim, setDataSelecionadaFim] = useState<Date | undefined>(undefined)
  const [mostrarCalDataFim, setMostrarCalDataFim] = useState(false)
  const [horaFim, setHoraFim] = useState('')

  // Refs para click-outside
  const calInicioRef = useRef<HTMLDivElement>(null)
  const calFimRef = useRef<HTMLDivElement>(null)

  // Recorrência
  const [recorrenciaAtiva, setRecorrenciaAtiva] = useState(false)
  const [recorrenciaTipo, setRecorrenciaTipo] = useState<RecorrenciaTipo>('SEMANAL')
  const [recorrenciaDiasSemana, setRecorrenciaDiasSemana] = useState<number[]>([])
  const [recorrenciaIntervalo, setRecorrenciaIntervalo] = useState('15')

  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')

  // Fecha popovers ao clicar fora
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (calInicioRef.current && !calInicioRef.current.contains(e.target as Node)) {
        setMostrarCalData(false)
      }
      if (calFimRef.current && !calFimRef.current.contains(e.target as Node)) {
        setMostrarCalDataFim(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function toggleDiaSemana(dia: number) {
    setRecorrenciaDiasSemana((prev) =>
      prev.includes(dia) ? prev.filter((d) => d !== dia) : [...prev, dia]
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setCarregando(true)
    setErro('')

    if (!titulo || !dataSelecionada || !horaInicio || !dataSelecionadaFim || !horaFim) {
      setErro('Título, data/hora de início e data/hora de fim são obrigatórios')
      setCarregando(false)
      return
    }

    if (recorrenciaAtiva && recorrenciaTipo === 'SEMANAL' && recorrenciaDiasSemana.length === 0) {
      setErro('Selecione pelo menos um dia da semana para a recorrência semanal')
      setCarregando(false)
      return
    }

    const dataInicioISO = buildISO(dataSelecionada, horaInicio)
    const dataFimISO = buildISO(dataSelecionadaFim, horaFim)

    if (!dataInicioISO || !dataFimISO) {
      setErro('Data ou hora inválida')
      setCarregando(false)
      return
    }

    const body: Record<string, unknown> = {
      TITULO: titulo,
      DESCRICAO: descricao || null,
      LOCAL: local || null,
      DATA_INICIO: dataInicioISO,
      DATA_FIM: dataFimISO,
      ORIGEM: 'MANUAL',
      IMPORTANCIA: importancia > 0 ? importancia : null,
      ANTECEDENCIA_LEMBRETE_MINUTOS: lembrete,
    }

    if (recorrenciaAtiva) {
      body.RECORRENCIA_TIPO = recorrenciaTipo
      if (recorrenciaTipo === 'SEMANAL') {
        body.RECORRENCIA_DIAS_SEMANA = recorrenciaDiasSemana
      }
      if (recorrenciaTipo === 'PERSONALIZADA') {
        body.RECORRENCIA_INTERVALO = parseInt(recorrenciaIntervalo) || 15
      }
    }

    const response = await fetch('/api/compromisso', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
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

  // Classnames do DayPicker com Tailwind — v9 API
  const dayPickerClassNames = {
    // Layout
    months: 'flex flex-col',
    month: '',
    month_caption: 'flex justify-between items-center px-1 py-2',
    caption_label: 'text-sm font-semibold text-gray-800',
    // Navegação
    nav: 'flex items-center gap-1',
    button_previous: 'p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 transition cursor-pointer',
    button_next: 'p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 transition cursor-pointer',
    // Grid
    month_grid: 'w-full border-collapse',
    weekdays: 'flex',
    weekday: 'w-9 text-gray-400 font-medium text-xs text-center py-1',
    weeks: '',
    week: 'flex mt-1',
    day: 'w-9 flex items-center justify-center',
    day_button: 'w-9 h-9 rounded-lg text-sm font-medium hover:bg-blue-50 hover:text-blue-700 transition cursor-pointer flex items-center justify-center',
    // Modificadores
    selected: '!bg-blue-600 !text-white hover:!bg-blue-700',
    today: 'text-blue-600 font-bold',
    outside: 'opacity-30',
    disabled: 'opacity-20 cursor-not-allowed',
    hidden: 'invisible',
    focused: '',
    // Outros
    chevron: 'w-4 h-4 fill-current',
    week_number: '',
    week_number_header: '',
    dropdowns: '',
    dropdown: '',
    dropdown_root: '',
    footer: '',
    months_dropdown: '',
    years_dropdown: '',
    range_start: '',
    range_middle: '',
    range_end: '',
    // Animações
    weeks_before_enter: '',
    weeks_before_exit: '',
    weeks_after_enter: '',
    weeks_after_exit: '',
    caption_after_enter: '',
    caption_after_exit: '',
    caption_before_enter: '',
    caption_before_exit: '',
  } as any

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
              <div className="relative">
                <input
                  id="local"
                  type="text"
                  value={local}
                  onChange={(e) => setLocal(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
                  placeholder="Sala de reuniões 1"
                />
                {local.trim() !== '' && (
                  <button
                    type="button"
                    onClick={() => window.open(`https://maps.google.com/maps?q=${encodeURIComponent(local.trim())}`, '_blank')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-xl leading-none text-blue-600 hover:text-blue-800 transition"
                    title="Abrir no Google Maps"
                  >
                    🗺️
                  </button>
                )}
              </div>
            </div>

            {/* Data e Hora */}
            <div className="grid grid-cols-2 gap-4">
              {/* Data/Hora Início */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Data Início *
                </label>
                {/* Calendar picker */}
                <div className="relative" ref={calInicioRef}>
                  <button
                    type="button"
                    onClick={() => { setMostrarCalData(!mostrarCalData); setMostrarCalDataFim(false) }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-left text-sm bg-white hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
                  >
                    {dataSelecionada
                      ? <span className="text-gray-800 font-medium">📅 {format(dataSelecionada, 'dd/MM/yyyy')}</span>
                      : <span className="text-gray-400">📅 Selecionar data</span>
                    }
                  </button>
                  {mostrarCalData && (
                    <div className="absolute top-full left-0 z-50 bg-white shadow-xl rounded-xl p-4 mt-1 border border-gray-100">
                      <DayPicker
                        mode="single"
                        selected={dataSelecionada}
                        onSelect={(d) => {
                          setDataSelecionada(d)
                          // Se data fim não selecionada, preenche com a mesma data
                          if (!dataSelecionadaFim) setDataSelecionadaFim(d)
                          setMostrarCalData(false)
                        }}
                        locale={ptBR}
                        classNames={dayPickerClassNames}
                      />
                    </div>
                  )}
                </div>
                {/* Hora início */}
                <div className="mt-2">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Hora *</label>
                  <input
                    type="time"
                    value={horaInicio}
                    onChange={(e) => setHoraInicio(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Data/Hora Fim */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Data Fim *
                </label>
                <div className="relative" ref={calFimRef}>
                  <button
                    type="button"
                    onClick={() => { setMostrarCalDataFim(!mostrarCalDataFim); setMostrarCalData(false) }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-left text-sm bg-white hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
                  >
                    {dataSelecionadaFim
                      ? <span className="text-gray-800 font-medium">📅 {format(dataSelecionadaFim, 'dd/MM/yyyy')}</span>
                      : <span className="text-gray-400">📅 Selecionar data</span>
                    }
                  </button>
                  {mostrarCalDataFim && (
                    <div className="absolute top-full left-0 z-50 bg-white shadow-xl rounded-xl p-4 mt-1 border border-gray-100">
                      <DayPicker
                        mode="single"
                        selected={dataSelecionadaFim}
                        onSelect={(d) => {
                          setDataSelecionadaFim(d)
                          setMostrarCalDataFim(false)
                        }}
                        locale={ptBR}
                        defaultMonth={dataSelecionada}
                        classNames={dayPickerClassNames}
                      />
                    </div>
                  )}
                </div>
                {/* Hora fim */}
                <div className="mt-2">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Hora *</label>
                  <input
                    type="time"
                    value={horaFim}
                    onChange={(e) => setHoraFim(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Importância */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Importância
              </label>
              <div className="flex gap-2">
                {([
                  { nivel: 1 as const, label: '● Baixa', cor: 'blue' },
                  { nivel: 2 as const, label: '●● Média', cor: 'yellow' },
                  { nivel: 3 as const, label: '●●● Alta', cor: 'red' },
                ]).map(({ nivel, label, cor }) => {
                  const ativo = importancia === nivel
                  const baseClass = 'px-4 py-2 rounded-lg border font-medium text-sm transition'
                  const corClass = cor === 'blue'
                    ? (ativo ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-300 text-gray-600 hover:border-blue-400 hover:text-blue-600')
                    : cor === 'yellow'
                    ? (ativo ? 'bg-yellow-400 border-yellow-400 text-white' : 'bg-white border-gray-300 text-gray-600 hover:border-yellow-400 hover:text-yellow-600')
                    : (ativo ? 'bg-red-500 border-red-500 text-white' : 'bg-white border-gray-300 text-gray-600 hover:border-red-400 hover:text-red-600')
                  return (
                    <button
                      key={nivel}
                      type="button"
                      onClick={() => setImportancia(ativo ? 0 : nivel)}
                      className={`${baseClass} ${corClass}`}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Lembrete */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Lembrete
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: 'Sem lembrete', value: 0 },
                  { label: '15 min', value: 15 },
                  { label: '30 min', value: 30 },
                  { label: '1 hora', value: 60 },
                  { label: '1 dia', value: 1440 },
                ].map((op) => (
                  <button
                    key={op.value}
                    type="button"
                    onClick={() => setLembrete(op.value)}
                    className={`px-4 py-2 rounded-full border text-sm font-medium transition ${
                      lembrete === op.value
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {op.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Notificação local no app + WhatsApp (se ativado em Configurações)
              </p>
            </div>

            {/* Recorrência */}
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-gray-700">Repetir compromisso</label>
                <button
                  type="button"
                  onClick={() => setRecorrenciaAtiva(!recorrenciaAtiva)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    recorrenciaAtiva ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                      recorrenciaAtiva ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {recorrenciaAtiva && (
                <div className="space-y-4 pt-2 border-t border-gray-100">
                  {/* Tipo */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-2">Tipo de repetição</label>
                    <div className="flex flex-wrap gap-2">
                      {([
                        { label: 'Semanal', value: 'SEMANAL' },
                        { label: 'Mensal', value: 'MENSAL' },
                        { label: 'Personalizada', value: 'PERSONALIZADA' },
                      ] as { label: string; value: RecorrenciaTipo }[]).map((op) => (
                        <button
                          key={op.value}
                          type="button"
                          onClick={() => setRecorrenciaTipo(op.value)}
                          className={`px-4 py-2 rounded-full border text-sm font-medium transition ${
                            recorrenciaTipo === op.value
                              ? 'bg-blue-600 border-blue-600 text-white'
                              : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          {op.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Dica contextual — Mensal */}
                  {recorrenciaTipo === 'MENSAL' && (
                    <p className="text-sm text-blue-700 bg-blue-50 rounded-lg px-3 py-2 leading-relaxed">
                      📅 Vai repetir todo dia {dataSelecionada ? dataSelecionada.getDate() : '?'} de cada mês
                      {dataSelecionada && (
                        <>
                          <br />
                          <span className="text-blue-500">
                            Próximas:{' '}
                            {Array.from({length: 3}, (_, i) => {
                              const d = new Date(dataSelecionada.getFullYear(), dataSelecionada.getMonth() + i + 1, dataSelecionada.getDate())
                              return format(d, 'dd/MM/yyyy')
                            }).join(' • ')}
                          </span>
                        </>
                      )}
                    </p>
                  )}

                  {/* Dias da semana (semanal) */}
                  {recorrenciaTipo === 'SEMANAL' && (
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-2">Dias da semana</label>
                      <div className="flex gap-2 flex-wrap">
                        {DIAS_SEMANA.map((dia) => (
                          <button
                            key={dia.value}
                            type="button"
                            onClick={() => toggleDiaSemana(dia.value)}
                            className={`w-12 h-10 rounded-lg border text-sm font-medium transition ${
                              recorrenciaDiasSemana.includes(dia.value)
                                ? 'bg-blue-600 border-blue-600 text-white'
                                : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                            }`}
                          >
                            {dia.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Intervalo (personalizada) */}
                  {recorrenciaTipo === 'PERSONALIZADA' && (
                    <div className="space-y-2">
                      <label className="block text-xs font-medium text-gray-500">
                        Repetir a cada quantos dias?
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="number"
                          min="1"
                          max="365"
                          value={recorrenciaIntervalo}
                          onChange={(e) => setRecorrenciaIntervalo(e.target.value)}
                          className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-center focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <span className="text-sm text-gray-600">dias</span>
                      </div>
                      {(() => {
                        const n = parseInt(recorrenciaIntervalo) || 0
                        if (n <= 0 || !dataSelecionada) return null
                        const proximas = Array.from({length: 3}, (_, i) => {
                          const d = new Date(dataSelecionada)
                          d.setDate(d.getDate() + n * (i + 1))
                          return format(d, 'dd/MM/yyyy')
                        }).join(' • ')
                        return (
                          <p className="text-sm text-blue-700 bg-blue-50 rounded-lg px-3 py-2 leading-relaxed">
                            📅 Vai repetir a cada {recorrenciaIntervalo} dias<br />
                            <span className="text-blue-500">Próximas: {proximas}</span>
                          </p>
                        )
                      })()}
                    </div>
                  )}

                </div>
              )}
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
