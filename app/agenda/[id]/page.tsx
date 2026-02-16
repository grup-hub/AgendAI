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
  const [isCopa2026, setIsCopa2026] = useState(false)

  // Compartilhamento
  const [copiado, setCopiado] = useState(false)
  const [mostrarShareInterno, setMostrarShareInterno] = useState(false)
  const [emailShare, setEmailShare] = useState('')
  const [compartilhando, setCompartilhando] = useState(false)
  const [shareMsg, setShareMsg] = useState('')
  const [shareMsgTipo, setShareMsgTipo] = useState<'sucesso' | 'erro'>('sucesso')

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
      setIsCopa2026(comp.ORIGEM === 'COPA2026')
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

  // ====== COMPARTILHAMENTO ======

  function formatarCompromissoParaCompartilhar() {
    if (!compromisso) return ''
    const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
    const meses = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

    const inicio = new Date(compromisso.DATA_INICIO)
    const dia = diasSemana[inicio.getDay()]
    const numDia = inicio.getDate()
    const mes = meses[inicio.getMonth()]
    const h1 = inicio.getHours().toString().padStart(2, '0')
    const m1 = inicio.getMinutes().toString().padStart(2, '0')

    let horario = `${h1}:${m1}`
    if (compromisso.DATA_FIM) {
      const fim = new Date(compromisso.DATA_FIM)
      const h2 = fim.getHours().toString().padStart(2, '0')
      const m2 = fim.getMinutes().toString().padStart(2, '0')
      if (`${h1}:${m1}` !== `${h2}:${m2}`) {
        horario = `${h1}:${m1} - ${h2}:${m2}`
      }
    }

    const emoji = compromisso.ORIGEM === 'COPA2026' ? '⚽' : '📋'

    let texto = `${emoji} *${compromisso.TITULO}*\n`
    texto += `📅 ${dia}, ${numDia} ${mes} • ${horario}\n`

    if (local) {
      texto += `📍 ${local}\n`
    }

    if (descricao) {
      texto += `📝 ${descricao}\n`
    }

    texto += `\n_Compartilhado via AgendAI_ ✨`

    return texto
  }

  async function handleCopiarDetalhes() {
    const texto = formatarCompromissoParaCompartilhar()

    // Tenta Web Share API primeiro (funciona em mobile browsers)
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ text: texto })
        return
      } catch {
        // Usuário cancelou ou não suportado, usa clipboard
      }
    }

    // Fallback: clipboard
    try {
      await navigator.clipboard.writeText(texto)
    } catch {
      // Fallback final para browsers antigos
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
        body: JSON.stringify({ id_compromisso: idCompromisso, email: emailShare.trim() }),
      })

      const data = await response.json()
      if (!response.ok) {
        setShareMsg(data.message || 'Erro ao compartilhar')
        setShareMsgTipo('erro')
      } else {
        setShareMsg(data.message || 'Compromisso compartilhado com sucesso!')
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
          <h1 className="text-2xl font-bold mb-6">
            {isCopa2026 ? 'Detalhes do Jogo' : 'Editar Compromisso'}
          </h1>

          {/* Aviso Copa 2026 */}
          {isCopa2026 && (
            <div className="mb-6 p-4 rounded-lg bg-green-50 border border-green-200 flex items-center gap-3">
              <span className="text-2xl">⚽</span>
              <div>
                <p className="font-semibold text-green-800">Jogo da Copa do Mundo 2026</p>
                <p className="text-sm text-green-600">Este compromisso foi importado automaticamente e não pode ser editado.</p>
              </div>
            </div>
          )}

          {erro && (
            <div className="mb-6 p-4 rounded-lg bg-red-50 text-red-700 border border-red-200">
              {erro}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Título */}
            <div>
              <label htmlFor="titulo" className="block text-sm font-medium text-gray-700 mb-2">
                Título {!isCopa2026 && '*'}
              </label>
              <input
                id="titulo"
                type="text"
                required={!isCopa2026}
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                disabled={isCopa2026}
                className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isCopa2026 ? 'bg-gray-50 text-gray-600 cursor-not-allowed' : ''}`}
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
                disabled={isCopa2026}
                className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isCopa2026 ? 'bg-gray-50 text-gray-600 cursor-not-allowed' : ''}`}
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
                disabled={isCopa2026}
                className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isCopa2026 ? 'bg-gray-50 text-gray-600 cursor-not-allowed' : ''}`}
              />
            </div>

            {/* Data e Hora */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="dataInicio" className="block text-sm font-medium text-gray-700 mb-2">
                  Data/Hora Início {!isCopa2026 && '*'}
                </label>
                <input
                  id="dataInicio"
                  type="datetime-local"
                  required={!isCopa2026}
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                  disabled={isCopa2026}
                  className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isCopa2026 ? 'bg-gray-50 text-gray-600 cursor-not-allowed' : ''}`}
                />
              </div>

              <div>
                <label htmlFor="dataFim" className="block text-sm font-medium text-gray-700 mb-2">
                  Data/Hora Fim {!isCopa2026 && '*'}
                </label>
                <input
                  id="dataFim"
                  type="datetime-local"
                  required={!isCopa2026}
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                  disabled={isCopa2026}
                  className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isCopa2026 ? 'bg-gray-50 text-gray-600 cursor-not-allowed' : ''}`}
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
                disabled={isCopa2026}
                className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isCopa2026 ? 'bg-gray-50 text-gray-600 cursor-not-allowed' : ''}`}
              >
                <option value="ATIVO">Ativo</option>
                <option value="CANCELADO">Cancelado</option>
                <option value="CONCLUIDO">Concluído</option>
              </select>
            </div>

            {/* Compartilhar */}
            <div className="border-t border-gray-200 pt-6 mt-2">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                📤 Compartilhar
              </h3>

              <button
                type="button"
                onClick={handleCopiarDetalhes}
                className={`w-full mb-3 px-4 py-3 rounded-lg font-medium text-sm transition flex items-center justify-center gap-2 ${
                  copiado
                    ? 'bg-green-50 text-green-700 border border-green-200'
                    : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-100'
                }`}
              >
                {copiado ? '✅ Copiado para a área de transferência!' : '💬 Copiar detalhes para compartilhar'}
              </button>

              {!isCopa2026 && (
                <>
                  <button
                    type="button"
                    onClick={() => setMostrarShareInterno(!mostrarShareInterno)}
                    className="w-full mb-3 px-4 py-3 rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-100 font-medium text-sm transition flex items-center justify-center gap-2"
                  >
                    👥 Compartilhar com usuário AgendAI
                  </button>

                  {mostrarShareInterno && (
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 mb-3">
                      <p className="text-sm text-gray-600 mb-3">
                        O usuário receberá uma cópia deste compromisso na agenda dele
                      </p>
                      <form onSubmit={handleShareInterno} className="flex gap-2">
                        <input
                          type="email"
                          placeholder="Preencher com email do usuário"
                          value={emailShare}
                          onChange={(e) => setEmailShare(e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          required
                        />
                        <button
                          type="submit"
                          disabled={compartilhando}
                          className="px-5 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50 transition"
                        >
                          {compartilhando ? 'Enviando...' : 'Enviar'}
                        </button>
                      </form>
                      {shareMsg && (
                        <p className={`text-sm mt-3 ${shareMsgTipo === 'erro' ? 'text-red-600' : 'text-green-600'}`}>
                          {shareMsgTipo === 'sucesso' ? '✅' : '❌'} {shareMsg}
                        </p>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Botões */}
            <div className="flex gap-4 pt-6">
              {!isCopa2026 && (
                <button
                  type="submit"
                  disabled={salvando}
                  className="flex-1 px-6 py-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-medium disabled:opacity-50"
                >
                  {salvando ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              )}
              <Link
                href="/agenda"
                className={`${isCopa2026 ? 'flex-1' : 'flex-1'} px-6 py-3 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 font-medium text-center`}
              >
                {isCopa2026 ? 'Voltar para Agenda' : 'Cancelar'}
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
