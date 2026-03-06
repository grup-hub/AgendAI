'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'
import ConfirmDialog from '@/app/components/ConfirmDialog'

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
  URGENTE?: boolean
  IMPORTANCIA?: number | null
  compartilhado?: boolean
  dono_nome?: string
  permissao?: string
  RECORRENCIA_TIPO?: string | null
  ID_COMPROMISSO_ORIGEM?: string | null
}

const DIAS_SEMANA = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
const MESES_CURTOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

function getStatusColor(status: string) {
  switch (status) {
    case 'CONFIRMADO': return { bg: '#D1FAE5', text: '#065F46', dot: '#10B981' }
    case 'ATIVO': return { bg: '#DBEAFE', text: '#1E40AF', dot: '#2563EB' }
    case 'CANCELADO': return { bg: '#FEE2E2', text: '#991B1B', dot: '#EF4444' }
    case 'PENDENTE': return { bg: '#FEF3C7', text: '#92400E', dot: '#F59E0B' }
    default: return { bg: '#F3F4F6', text: '#374151', dot: '#6B7280' }
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

function getImportanciaLabel(importancia?: number | null): string | null {
  switch (importancia) {
    case 3: return '●●● Alta'
    case 2: return '●● Média'
    case 1: return '● Baixa'
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

function formatarDataCompleta(dataISO: string) {
  const d = new Date(dataISO)
  return `${DIAS_SEMANA[d.getDay()]}, ${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`
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

export default function DetalhesCompromissoPage() {
  const router = useRouter()
  const params = useParams()
  const idCompromisso = params.id as string
  const supabase = useMemo(() => createSupabaseBrowserClient(), [])

  const [compromisso, setCompromisso] = useState<Compromisso | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [editando, setEditando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [excluindo, setExcluindo] = useState(false)
  const [arquivando, setArquivando] = useState(false)

  // Adiar
  const [mostrarAdiar, setMostrarAdiar] = useState(false)
  const [adiando, setAdiando] = useState(false)
  const [adiarDataInicio, setAdiarDataInicio] = useState('')
  const [adiarDataFim, setAdiarDataFim] = useState('')

  // Campos de edição
  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [local, setLocal] = useState('')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [status, setStatus] = useState('')
  const [importancia, setImportancia] = useState<0 | 1 | 2 | 3>(0)

  // Diálogos de confirmação
  type DlgCfg = { title: string; message: string; confirmLabel: string; cancelLabel?: string; neutralLabel?: string; destructive?: boolean; onConfirm: () => void; onNeutral?: () => void }
  const [dlg, setDlg] = useState<DlgCfg | null>(null)
  function showDlg(cfg: DlgCfg) { setDlg(cfg) }

  // Compartilhamento
  const [copiado, setCopiado] = useState(false)
  const [mostrarShareInterno, setMostrarShareInterno] = useState(false)
  const [emailShare, setEmailShare] = useState('')
  const [permissaoShare, setPermissaoShare] = useState<'VISUALIZAR' | 'EDITAR'>('VISUALIZAR')
  const [compartilhando, setCompartilhando] = useState(false)
  const [shareMsg, setShareMsg] = useState('')
  const [shareMsgTipo, setShareMsgTipo] = useState<'sucesso' | 'erro'>('sucesso')

  useEffect(() => {
    async function carregar() {
      const response = await fetch('/api/compromisso')
      if (response.status === 401) { router.push('/login'); return }
      if (!response.ok) { setErro('Erro ao carregar compromisso'); setCarregando(false); return }

      const data = await response.json()
      const comp = data.compromissos?.find((c: Compromisso) => c.ID_COMPROMISSO === idCompromisso)
      if (!comp) { setErro('Compromisso não encontrado'); setCarregando(false); return }

      setCompromisso(comp)
      setTitulo(comp.TITULO)
      setDescricao(comp.DESCRICAO || '')
      setLocal(comp.LOCAL || '')
      setStatus(comp.STATUS)
      setImportancia((comp.IMPORTANCIA as 0|1|2|3) || (comp.URGENTE ? 3 : 0))
      setDataInicio(new Date(comp.DATA_INICIO).toISOString().slice(0, 16))
      setDataFim(new Date(comp.DATA_FIM).toISOString().slice(0, 16))
      setCarregando(false)
    }
    carregar()
  }, [router, idCompromisso])

  const isCopa2026 = compromisso?.ORIGEM === 'COPA2026'
  const podeEditar = !isCopa2026 && (!compromisso?.compartilhado || compromisso?.permissao === 'EDITAR')
  const podeCompartilharInterno = !isCopa2026 && !compromisso?.compartilhado

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault()
    setSalvando(true)
    setErro('')

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
        IMPORTANCIA: importancia > 0 ? importancia : null,
      }),
    })

    if (!response.ok) {
      const data = await response.json()
      setErro(data.message || 'Erro ao atualizar')
      setSalvando(false)
      return
    }

    // Atualizar estado local
    setCompromisso((prev) => prev ? {
      ...prev, TITULO: titulo, DESCRICAO: descricao || undefined,
      LOCAL: local || undefined, STATUS: status,
      DATA_INICIO: new Date(dataInicio).toISOString(),
      DATA_FIM: new Date(dataFim).toISOString(),
    } : prev)
    setEditando(false)
    setSalvando(false)
  }

  function handleCancelarCompromisso() {
    showDlg({
      title: 'Cancelar compromisso',
      message: 'Tem certeza que deseja cancelar este compromisso?',
      confirmLabel: 'Sim, cancelar',
      destructive: true,
      onConfirm: () => showDlg({
        title: 'Confirmar cancelamento',
        message: 'O compromisso será marcado como CANCELADO.',
        confirmLabel: 'Cancelar definitivamente',
        cancelLabel: 'Voltar',
        destructive: true,
        onConfirm: async () => {
          setDlg(null)
          setSalvando(true)
          const response = await fetch('/api/compromisso', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ID_COMPROMISSO: idCompromisso, STATUS: 'CANCELADO' }),
          })
          if (response.ok) {
            setCompromisso((prev) => prev ? { ...prev, STATUS: 'CANCELADO' } : prev)
            setStatus('CANCELADO')
          }
          setSalvando(false)
        },
      }),
    })
  }

  function handleArquivar() {
    if (!compromisso) return
    if (compromisso.STATUS !== 'CANCELADO') {
      showDlg({
        title: 'Atenção',
        message: 'Para arquivar este compromisso, você precisa cancelá-lo primeiro.\n\nDeseja cancelá-lo agora?',
        confirmLabel: 'Cancelar compromisso',
        cancelLabel: 'Fechar',
        onConfirm: () => { setDlg(null); handleCancelarCompromisso() },
      })
      return
    }
    showDlg({
      title: 'Arquivar compromisso',
      message: `Arquivar "${compromisso.TITULO}"?\n\nSerá movido para Arquivados e poderá ser excluído definitivamente em Configurações.`,
      confirmLabel: 'Arquivar',
      destructive: true,
      onConfirm: async () => {
        setDlg(null)
        setArquivando(true)
        const response = await fetch('/api/compromisso', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ID_COMPROMISSO: idCompromisso, ARQUIVADO: true }),
        })
        if (response.ok) {
          router.push('/agenda')
        } else {
          const data = await response.json()
          setErro(data.message || 'Erro ao arquivar')
          setArquivando(false)
        }
      },
    })
  }

  function confirmarExclusao(excluirSerie: boolean) {
    const params = excluirSerie ? `?id=${idCompromisso}&serie=true` : `?id=${idCompromisso}`
    const msg = excluirSerie
      ? 'Toda a série será excluída permanentemente. Esta ação não pode ser desfeita.'
      : 'Esta ação não pode ser desfeita. O compromisso será excluído permanentemente.'
    showDlg({
      title: excluirSerie ? 'Excluir toda a série' : 'Confirmar exclusão',
      message: msg,
      confirmLabel: 'Excluir definitivamente',
      cancelLabel: 'Voltar',
      destructive: true,
      onConfirm: async () => {
        setDlg(null)
        setExcluindo(true)
        const response = await fetch(`/api/compromisso${params}`, { method: 'DELETE' })
        if (response.ok) {
          router.push('/agenda')
        } else {
          const data = await response.json()
          setErro(data.message || 'Erro ao excluir')
          setExcluindo(false)
        }
      },
    })
  }

  function handleExcluir() {
    const isRecorrente = compromisso?.RECORRENCIA_TIPO || compromisso?.ID_COMPROMISSO_ORIGEM
    if (isRecorrente) {
      showDlg({
        title: 'Excluir compromisso recorrente',
        message: 'Deseja excluir apenas esta ocorrência ou toda a série de compromissos?',
        confirmLabel: 'Apenas esta',
        cancelLabel: 'Cancelar',
        neutralLabel: 'Toda a série',
        onConfirm: () => { setDlg(null); confirmarExclusao(false) },
        onNeutral: () => { setDlg(null); confirmarExclusao(true) },
      })
      return
    }
    showDlg({
      title: 'Excluir compromisso',
      message: `Tem certeza que deseja excluir "${compromisso?.TITULO}"?`,
      confirmLabel: 'Sim, excluir',
      destructive: true,
      onConfirm: () => confirmarExclusao(false),
    })
  }

  function abrirAdiar() {
    if (!compromisso) return
    const inicio = new Date(compromisso.DATA_INICIO)
    const fim = new Date(compromisso.DATA_FIM)
    inicio.setDate(inicio.getDate() + 1)
    fim.setDate(fim.getDate() + 1)
    setAdiarDataInicio(inicio.toISOString().slice(0, 16))
    setAdiarDataFim(fim.toISOString().slice(0, 16))
    setMostrarAdiar(true)
  }

  async function handleAdiar(e: React.FormEvent) {
    e.preventDefault()
    setAdiando(true)
    setErro('')
    const response = await fetch('/api/compromisso', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ID_COMPROMISSO: idCompromisso,
        DATA_INICIO: new Date(adiarDataInicio).toISOString(),
        DATA_FIM: new Date(adiarDataFim).toISOString(),
      }),
    })
    if (!response.ok) {
      const data = await response.json()
      setErro(data.message || 'Erro ao adiar compromisso')
      setAdiando(false)
      return
    }
    setCompromisso((prev) => prev ? {
      ...prev,
      DATA_INICIO: new Date(adiarDataInicio).toISOString(),
      DATA_FIM: new Date(adiarDataFim).toISOString(),
    } : prev)
    setMostrarAdiar(false)
    setAdiando(false)
  }

  // ====== COMPARTILHAMENTO ======

  function formatarParaCompartilhar() {
    if (!compromisso) return ''
    const inicio = new Date(compromisso.DATA_INICIO)
    const diasCurtos = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
    const dia = diasCurtos[inicio.getDay()]
    const numDia = inicio.getDate()
    const mes = MESES_CURTOS[inicio.getMonth()]
    const h1 = inicio.getHours().toString().padStart(2, '0')
    const m1 = inicio.getMinutes().toString().padStart(2, '0')
    let horario = `${h1}:${m1}`
    if (compromisso.DATA_FIM) {
      const fim = new Date(compromisso.DATA_FIM)
      const h2 = fim.getHours().toString().padStart(2, '0')
      const m2 = fim.getMinutes().toString().padStart(2, '0')
      if (`${h1}:${m1}` !== `${h2}:${m2}`) horario = `${h1}:${m1} - ${h2}:${m2}`
    }
    const emoji = isCopa2026 ? '⚽' : '📋'
    let texto = `${emoji} *${compromisso.TITULO}*\n`
    texto += `📅 ${dia}, ${numDia} ${mes} • ${horario}\n`
    if (compromisso.LOCAL) texto += `📍 ${compromisso.LOCAL}\n`
    if (compromisso.DESCRICAO) texto += `📝 ${compromisso.DESCRICAO}\n`
    texto += `\n_Compartilhado via AgendAI_ ✨`
    return texto
  }

  async function handleCopiarDetalhes() {
    const texto = formatarParaCompartilhar()
    if (typeof navigator !== 'undefined' && navigator.share) {
      try { await navigator.share({ text: texto }); return } catch {}
    }
    try {
      await navigator.clipboard.writeText(texto)
    } catch {
      const textarea = document.createElement('textarea')
      textarea.value = texto
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
    }
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2500)
  }

  async function handleShareInterno(e: React.FormEvent) {
    e.preventDefault()
    if (!emailShare.trim()) return
    setCompartilhando(true)
    setShareMsg('')
    try {
      const response = await fetch('/api/compartilhamento-compromisso', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_compromisso: idCompromisso, email: emailShare.trim(), permissao: permissaoShare }),
      })
      const data = await response.json()
      if (!response.ok) {
        setShareMsg(data.message || 'Erro ao compartilhar')
        setShareMsgTipo('erro')
      } else {
        setShareMsg(data.message || 'Compromisso compartilhado!')
        setShareMsgTipo('sucesso')
        setEmailShare('')
      }
    } catch (err: any) {
      setShareMsg(err.message || 'Erro ao compartilhar')
      setShareMsgTipo('erro')
    } finally {
      setCompartilhando(false)
    }
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

  if (erro && !compromisso) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{erro}</p>
          <Link href="/agenda" className="text-blue-600 hover:underline">← Voltar para Agenda</Link>
        </div>
      </div>
    )
  }

  const vencido = new Date(compromisso!.DATA_INICIO) < new Date()
  const st = vencido && compromisso!.STATUS === 'ATIVO'
    ? { bg: '#F3F4F6', text: '#6B7280', dot: '#6B7280' }
    : getStatusColor(compromisso!.STATUS)

  // ====== MODO EDIÇÃO ======
  if (editando) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white shadow-sm">
          <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
            <button onClick={() => setEditando(false)} className="text-blue-600 hover:text-blue-700">← Voltar</button>
            <span className="text-gray-400">/</span>
            <span className="text-gray-700 font-medium">Editar Compromisso</span>
          </div>
        </div>
        <div className="max-w-2xl mx-auto px-4 py-6">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h1 className="text-xl font-bold text-gray-900 mb-6">Editar Compromisso</h1>
            {erro && <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-200">{erro}</div>}
            <form onSubmit={handleSalvar} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Título *</label>
                <input type="text" required value={titulo} onChange={(e) => setTitulo(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                <textarea rows={3} value={descricao} onChange={(e) => setDescricao(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Local</label>
                <input type="text" value={local} onChange={(e) => setLocal(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Início *</label>
                  <input type="datetime-local" required value={dataInicio} onChange={(e) => setDataInicio(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fim *</label>
                  <input type="datetime-local" required value={dataFim} onChange={(e) => setDataFim(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select value={status} onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    <option value="ATIVO">Ativo</option>
                    <option value="CONFIRMADO">Confirmado</option>
                    <option value="PENDENTE">Pendente</option>
                    <option value="CANCELADO">Cancelado</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Importância</label>
                  <div className="flex gap-1.5">
                    {([1, 2, 3] as const).map((nivel) => {
                      const impColor = getImportanciaColor(nivel)!
                      const ativo = importancia === nivel
                      return (
                        <button
                          key={nivel}
                          type="button"
                          onClick={() => setImportancia(ativo ? 0 : nivel)}
                          className={`flex-1 py-2 rounded-lg border text-xs font-bold transition ${
                            ativo ? 'text-white' : 'bg-white border-gray-300 text-gray-400 hover:border-gray-400'
                          }`}
                          style={ativo ? { backgroundColor: impColor, borderColor: impColor } : undefined}
                        >
                          {'●'.repeat(nivel)}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={salvando}
                  className="flex-1 py-3 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50">
                  {salvando ? 'Salvando...' : 'Salvar alterações'}
                </button>
                <button type="button" onClick={() => setEditando(false)}
                  className="flex-1 py-3 rounded-lg bg-white border border-gray-300 text-gray-700 font-medium hover:bg-gray-50">
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    )
  }

  // ====== MODO VISUALIZAÇÃO (DETALHES) ======
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <Link href="/agenda" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
            ← Voltar para Agenda
          </Link>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">

        {/* Status badge + urgente + origem */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold"
              style={{ backgroundColor: st.bg, color: st.text }}>
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: st.dot }} />
              {vencido && compromisso!.STATUS === 'ATIVO' ? 'Vencido' : getStatusLabel(compromisso!.STATUS)}
            </span>
            {(compromisso!.IMPORTANCIA ?? (compromisso!.URGENTE ? 3 : null)) && (() => {
              const imp = compromisso!.IMPORTANCIA ?? (compromisso!.URGENTE ? 3 : null)
              const impColor = getImportanciaColor(imp)!
              const impLabel = getImportanciaLabel(imp)
              return (
                <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-bold border"
                  style={{ backgroundColor: impColor + '15', color: impColor, borderColor: impColor + '40' }}>
                  {impLabel}
                </span>
              )
            })()}
          </div>
          <span className="text-xs text-gray-400">
            {compromisso!.ORIGEM === 'APP_MOBILE' ? 'App' :
             compromisso!.ORIGEM === 'WHATSAPP' ? 'WhatsApp' :
             compromisso!.ORIGEM === 'COPA2026' ? '⚽ Copa 2026' : 'Web'}
          </span>
        </div>

        {/* Título */}
        <h1 className="text-2xl font-bold text-gray-900">{compromisso!.TITULO}</h1>

        {/* Info card */}
        <div className="bg-white rounded-xl shadow-sm divide-y divide-gray-100">
          <div className="flex items-center gap-4 p-4">
            <span className="text-xl">📅</span>
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Data</p>
              <p className="font-medium text-gray-900">{formatarDataCompleta(compromisso!.DATA_INICIO)}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 p-4">
            <span className="text-xl">🕐</span>
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Horário</p>
              <p className="font-medium text-gray-900">{formatarHorario(compromisso!.DATA_INICIO, compromisso!.DATA_FIM)}</p>
            </div>
          </div>
          {compromisso!.LOCAL && (
            <div className="flex items-center gap-4 p-4">
              <span className="text-xl">📍</span>
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Local</p>
                <a
                  href={`https://maps.google.com/maps?q=${encodeURIComponent(compromisso!.LOCAL)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-blue-600 hover:underline"
                >
                  {compromisso!.LOCAL}
                </a>
              </div>
            </div>
          )}
          {compromisso!.compartilhado && compromisso!.dono_nome && (
            <div className="flex items-center gap-4 p-4">
              <span className="text-xl">👤</span>
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Criado por</p>
                <p className="font-medium text-purple-700">{compromisso!.dono_nome?.split(' ')[0]}</p>
              </div>
            </div>
          )}
        </div>

        {/* Descrição */}
        {compromisso!.DESCRICAO && (
          <div className="bg-white rounded-xl shadow-sm p-4">
            <p className="text-xs text-gray-400 mb-1">Descrição</p>
            <p className="text-gray-700 leading-relaxed">{compromisso!.DESCRICAO}</p>
          </div>
        )}

        {/* Aviso Copa */}
        {isCopa2026 && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
            <span className="text-2xl">⚽</span>
            <div>
              <p className="font-semibold text-green-800">Jogo da Copa do Mundo 2026</p>
              <p className="text-sm text-green-600">Este compromisso foi importado automaticamente e não pode ser editado.</p>
            </div>
          </div>
        )}

        {/* Compartilhar */}
        <div className="bg-white rounded-xl shadow-sm p-4">
          <h3 className="font-semibold text-gray-700 mb-3">📤 Compartilhar</h3>

          <button onClick={handleCopiarDetalhes}
            className={`w-full mb-2 py-3 rounded-lg font-medium text-sm transition flex items-center justify-center gap-2 ${
              copiado
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-100'
            }`}>
            {copiado ? '✅ Copiado!' : '💬 Copiar detalhes para compartilhar'}
          </button>

          {podeCompartilharInterno && (
            <>
              <button onClick={() => setMostrarShareInterno(!mostrarShareInterno)}
                className="w-full py-3 rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-100 font-medium text-sm transition flex items-center justify-center gap-2">
                👥 Compartilhar com usuário AgendAI
              </button>

              {mostrarShareInterno && (
                <div className="mt-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-sm text-gray-600 mb-3">O usuário receberá uma cópia deste compromisso na agenda dele</p>

                  {/* Toggle de permissão */}
                  <div className="mb-3">
                    <p className="text-xs font-medium text-gray-700 mb-1.5">Permissão</p>
                    <div className="flex gap-2">
                      {(['VISUALIZAR', 'EDITAR'] as const).map((p) => (
                        <button key={p} type="button"
                          onClick={() => setPermissaoShare(p)}
                          className={`flex-1 py-2 rounded-lg border text-xs font-semibold transition ${
                            permissaoShare === p
                              ? p === 'EDITAR'
                                ? 'bg-orange-500 border-orange-500 text-white'
                                : 'bg-purple-600 border-purple-600 text-white'
                              : 'bg-white border-gray-300 text-gray-500 hover:border-gray-400'
                          }`}>
                          {p === 'VISUALIZAR' ? '👁 Visualizar' : '✏️ Editar'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <form onSubmit={handleShareInterno} className="flex gap-2">
                    <input type="email" placeholder="Email do usuário AgendAI" value={emailShare}
                      onChange={(e) => setEmailShare(e.target.value)} required
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent" />
                    <button type="submit" disabled={compartilhando}
                      className="px-5 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50">
                      {compartilhando ? 'Enviando...' : 'Enviar'}
                    </button>
                  </form>
                  {shareMsg && (
                    <p className={`text-sm mt-2 ${shareMsgTipo === 'erro' ? 'text-red-600' : 'text-green-600'}`}>
                      {shareMsgTipo === 'sucesso' ? '✅' : '❌'} {shareMsg}
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Ações */}
        {podeEditar && compromisso!.STATUS !== 'CANCELADO' && (
          <div className="space-y-2">
            <button onClick={() => setEditando(true)}
              className="w-full py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition">
              ✏️ Editar compromisso
            </button>

            {/* Adiar */}
            <button onClick={abrirAdiar}
              className="w-full py-3 rounded-xl bg-blue-50 text-blue-800 font-medium border border-blue-200 hover:bg-blue-100 transition">
              ⏭ Adiar compromisso
            </button>
            {mostrarAdiar && (
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                <p className="text-sm text-gray-600 mb-3">Defina a nova data e horário para este compromisso</p>
                <form onSubmit={handleAdiar} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Novo início *</label>
                      <input type="datetime-local" required value={adiarDataInicio}
                        onChange={(e) => setAdiarDataInicio(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Novo fim *</label>
                      <input type="datetime-local" required value={adiarDataFim}
                        onChange={(e) => setAdiarDataFim(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                    </div>
                  </div>
                  {erro && <p className="text-sm text-red-600">❌ {erro}</p>}
                  <div className="flex gap-2">
                    <button type="submit" disabled={adiando}
                      className="flex-1 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition">
                      {adiando ? 'Adiando...' : '✅ Confirmar adiamento'}
                    </button>
                    <button type="button" onClick={() => setMostrarAdiar(false)}
                      className="flex-1 py-2.5 rounded-lg bg-white border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 transition">
                      Cancelar
                    </button>
                  </div>
                </form>
              </div>
            )}

            <button onClick={handleCancelarCompromisso} disabled={salvando}
              className="w-full py-3 rounded-xl bg-amber-50 text-amber-800 font-medium border border-amber-200 hover:bg-amber-100 transition disabled:opacity-50">
              {salvando ? 'Cancelando...' : '⏸ Cancelar compromisso'}
            </button>
            {(new Date(compromisso!.DATA_INICIO) < new Date()) && (
              <button onClick={handleArquivar} disabled={arquivando}
                className="w-full py-3 rounded-xl bg-gray-100 text-gray-700 font-medium border border-gray-200 hover:bg-gray-200 transition disabled:opacity-50">
                {arquivando ? 'Arquivando...' : '📦 Arquivar compromisso'}
              </button>
            )}
            <button onClick={handleExcluir} disabled={excluindo}
              className="w-full py-3 rounded-xl bg-red-50 text-red-700 font-medium border border-red-200 hover:bg-red-100 transition disabled:opacity-50">
              {excluindo ? 'Excluindo...' : '🗑 Excluir compromisso'}
            </button>
          </div>
        )}

        {podeEditar && compromisso!.STATUS === 'CANCELADO' && (
          <div className="space-y-2">
            <button onClick={handleArquivar} disabled={arquivando}
              className="w-full py-3 rounded-xl bg-gray-100 text-gray-700 font-medium border border-gray-200 hover:bg-gray-200 transition disabled:opacity-50">
              {arquivando ? 'Arquivando...' : '📦 Arquivar compromisso'}
            </button>
            <button onClick={handleExcluir} disabled={excluindo}
              className="w-full py-3 rounded-xl bg-red-50 text-red-700 font-medium border border-red-200 hover:bg-red-100 transition disabled:opacity-50">
              {excluindo ? 'Excluindo...' : '🗑 Excluir compromisso'}
            </button>
          </div>
        )}
      </div>

      {dlg && (
        <ConfirmDialog
          visible={true}
          title={dlg.title}
          message={dlg.message}
          confirmLabel={dlg.confirmLabel}
          cancelLabel={dlg.cancelLabel}
          neutralLabel={dlg.neutralLabel}
          destructive={dlg.destructive}
          onConfirm={dlg.onConfirm}
          onCancel={() => setDlg(null)}
          onNeutral={dlg.onNeutral}
        />
      )}
    </div>
  )
}
