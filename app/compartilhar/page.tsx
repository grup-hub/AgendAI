'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'

interface Compartilhamento {
  ID_COMPARTILHAMENTO: string
  ID_AGENDA: string
  ID_USUARIO_CONVIDADO: string
  PERMISSAO: string
  STATUS: string
  DATA_CONVITE: string
  convidado?: { NOME: string; EMAIL: string }
  agenda?: { NOME: string }
  dono?: { NOME: string; EMAIL: string }
}

interface CompCompromisso {
  ID: string
  STATUS: string
  DATA_COMPARTILHAMENTO: string
  remetente?: { NOME: string; EMAIL: string }
  destinatario?: { NOME: string; EMAIL: string }
  compromisso?: { TITULO: string; DATA_INICIO: string; LOCAL?: string }
}

export default function CompartilharPage() {
  const router = useRouter()
  const supabase = useMemo(() => createSupabaseBrowserClient(), [])

  const [enviados, setEnviados] = useState<Compartilhamento[]>([])
  const [recebidos, setRecebidos] = useState<Compartilhamento[]>([])
  const [compEnviados, setCompEnviados] = useState<CompCompromisso[]>([])
  const [compRecebidos, setCompRecebidos] = useState<CompCompromisso[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')

  // Formulário
  const [email, setEmail] = useState('')
  const [permissao, setPermissao] = useState('VISUALIZAR')
  const [enviando, setEnviando] = useState(false)

  async function carregarDados() {
    const response = await fetch('/api/compartilhamento')
    if (response.status === 401) {
      router.push('/login')
      return
    }

    if (!response.ok) {
      const data = await response.json()
      setErro(data.message || 'Erro ao carregar compartilhamentos')
      setCarregando(false)
      return
    }

    const data = await response.json()
    setEnviados(data.enviados || [])
    setRecebidos(data.recebidos || [])

    // Carregar compartilhamentos de compromisso
    try {
      const compResp = await fetch('/api/compartilhamento-compromisso')
      if (compResp.ok) {
        const compData = await compResp.json()
        setCompEnviados(compData.enviados || [])
        setCompRecebidos(compData.recebidos || [])
      }
    } catch {}

    setCarregando(false)
  }

  useEffect(() => {
    carregarDados()
  }, [router])

  async function handleConvidar(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    setSucesso('')
    setEnviando(true)

    const response = await fetch('/api/compartilhamento', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim(), permissao }),
    })

    const data = await response.json()

    if (!response.ok) {
      setErro(data.message || 'Erro ao enviar convite')
      setEnviando(false)
      return
    }

    setSucesso('Convite enviado com sucesso!')
    setEmail('')
    setPermissao('VISUALIZAR')
    setEnviando(false)
    carregarDados()
  }

  async function handleResponder(id: string, status: 'ACEITO' | 'RECUSADO') {
    setErro('')
    setSucesso('')

    const response = await fetch('/api/compartilhamento', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ID_COMPARTILHAMENTO: id, status }),
    })

    const data = await response.json()

    if (!response.ok) {
      setErro(data.message || 'Erro ao responder convite')
      return
    }

    setSucesso(status === 'ACEITO' ? 'Convite aceito!' : 'Convite recusado.')
    carregarDados()
  }

  async function handleResponderCompromisso(id: string, status: 'ACEITO' | 'RECUSADO') {
    setErro('')
    setSucesso('')

    const response = await fetch('/api/compartilhamento-compromisso', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    })

    const data = await response.json()

    if (!response.ok) {
      setErro(data.message || 'Erro ao responder convite')
      return
    }

    setSucesso(status === 'ACEITO' ? 'Compromisso adicionado à sua agenda!' : 'Convite recusado.')
    carregarDados()
  }

  async function handleRemover(id: string) {
    if (!confirm('Tem certeza que deseja remover este compartilhamento?')) return

    setErro('')
    setSucesso('')

    const response = await fetch(`/api/compartilhamento?id=${id}`, {
      method: 'DELETE',
    })

    const data = await response.json()

    if (!response.ok) {
      setErro(data.message || 'Erro ao remover compartilhamento')
      return
    }

    setSucesso('Compartilhamento removido.')
    carregarDados()
  }

  function statusLabel(status: string) {
    switch (status) {
      case 'PENDENTE':
        return { text: 'Pendente', cls: 'bg-yellow-50 text-yellow-700' }
      case 'ACEITO':
        return { text: 'Aceito', cls: 'bg-green-50 text-green-700' }
      case 'RECUSADO':
        return { text: 'Recusado', cls: 'bg-red-50 text-red-700' }
      default:
        return { text: status, cls: 'bg-gray-50 text-gray-700' }
    }
  }

  if (carregando) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Carregando compartilhamentos...</p>
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

      <div className="max-w-4xl mx-auto px-4 py-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Compartilhamentos</h2>

        {/* Mensagens */}
        {erro && (
          <div className="mb-6 p-4 rounded-lg bg-red-50 text-red-700 border border-red-200">
            {erro}
          </div>
        )}
        {sucesso && (
          <div className="mb-6 p-4 rounded-lg bg-green-50 text-green-700 border border-green-200">
            {sucesso}
          </div>
        )}

        {/* Formulário de convite */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Compartilhar minha agenda</h3>
          <form onSubmit={handleConvidar} className="flex flex-col sm:flex-row gap-3">
            <input
              type="email"
              placeholder="Email do usuário"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={permissao}
              onChange={(e) => setPermissao(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="VISUALIZAR">Visualizar</option>
              <option value="EDITAR">Editar</option>
            </select>
            <button
              type="submit"
              disabled={enviando}
              className="px-6 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-medium disabled:opacity-50"
            >
              {enviando ? 'Enviando...' : 'Convidar'}
            </button>
          </form>
        </div>

        {/* Convites recebidos */}
        <div className="mb-8">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Convites recebidos</h3>
          {recebidos.length === 0 && compRecebidos.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-6 text-center text-gray-500">
              Nenhum convite recebido
            </div>
          ) : (
            <div className="space-y-3">
              {/* Convites de compromisso (📌) */}
              {compRecebidos.map((r) => {
                const st = statusLabel(r.STATUS)
                const dataFormatada = r.compromisso?.DATA_INICIO
                  ? new Date(r.compromisso.DATA_INICIO).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                  : ''
                return (
                  <div
                    key={`comp-${r.ID}`}
                    className="bg-white rounded-lg shadow-sm p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-l-4 border-purple-500"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm">📌</span>
                        <p className="font-medium text-gray-900">{r.compromisso?.TITULO || 'Compromisso'}</p>
                      </div>
                      <p className="text-sm text-gray-500">
                        De: {r.remetente?.NOME || r.remetente?.EMAIL || 'Usuário'}
                      </p>
                      {dataFormatada && (
                        <p className="text-xs text-gray-400">📅 {dataFormatada}</p>
                      )}
                      {r.compromisso?.LOCAL && (
                        <p className="text-xs text-gray-400">📍 {r.compromisso.LOCAL}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${st.cls}`}>
                        {st.text}
                      </span>
                      {r.STATUS === 'PENDENTE' && (
                        <>
                          <button
                            onClick={() => handleResponderCompromisso(r.ID, 'ACEITO')}
                            className="px-3 py-1 rounded text-sm bg-green-600 text-white hover:bg-green-700"
                          >
                            Aceitar
                          </button>
                          <button
                            onClick={() => handleResponderCompromisso(r.ID, 'RECUSADO')}
                            className="px-3 py-1 rounded text-sm bg-red-50 text-red-700 hover:bg-red-100"
                          >
                            Recusar
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}

              {/* Convites de agenda (📅) */}
              {recebidos.map((r) => {
                const st = statusLabel(r.STATUS)
                return (
                  <div
                    key={r.ID_COMPARTILHAMENTO}
                    className="bg-white rounded-lg shadow-sm p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm">📅</span>
                        <p className="font-medium text-gray-900">
                          {r.dono?.NOME || r.dono?.EMAIL || 'Usuário'}
                        </p>
                      </div>
                      <p className="text-sm text-gray-500">
                        Agenda: {r.agenda?.NOME || 'Agenda'} | Permissão:{' '}
                        {r.PERMISSAO === 'EDITAR' ? 'Editar' : 'Visualizar'}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Convidado em {new Date(r.DATA_CONVITE).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${st.cls}`}>
                        {st.text}
                      </span>
                      {r.STATUS === 'PENDENTE' && (
                        <>
                          <button
                            onClick={() => handleResponder(r.ID_COMPARTILHAMENTO, 'ACEITO')}
                            className="px-3 py-1 rounded text-sm bg-green-600 text-white hover:bg-green-700"
                          >
                            Aceitar
                          </button>
                          <button
                            onClick={() => handleResponder(r.ID_COMPARTILHAMENTO, 'RECUSADO')}
                            className="px-3 py-1 rounded text-sm bg-red-50 text-red-700 hover:bg-red-100"
                          >
                            Recusar
                          </button>
                        </>
                      )}
                      {r.STATUS === 'ACEITO' && (
                        <button
                          onClick={() => handleRemover(r.ID_COMPARTILHAMENTO)}
                          className="px-3 py-1 rounded text-sm bg-red-50 text-red-700 hover:bg-red-100"
                        >
                          Sair
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Convites enviados */}
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-4">Convites enviados</h3>
          {enviados.length === 0 && compEnviados.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-6 text-center text-gray-500">
              Nenhum convite enviado
            </div>
          ) : (
            <div className="space-y-3">
              {/* Compromissos enviados (📌) */}
              {compEnviados.map((e) => {
                const st = statusLabel(e.STATUS)
                return (
                  <div
                    key={`comp-${e.ID}`}
                    className="bg-white rounded-lg shadow-sm p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-l-4 border-purple-500"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm">📌</span>
                        <p className="font-medium text-gray-900">{e.compromisso?.TITULO || 'Compromisso'}</p>
                      </div>
                      <p className="text-sm text-gray-500">
                        Para: {e.destinatario?.NOME || e.destinatario?.EMAIL || 'Usuário'}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Enviado em {new Date(e.DATA_COMPARTILHAMENTO).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${st.cls}`}>
                        {st.text}
                      </span>
                    </div>
                  </div>
                )
              })}

              {/* Agendas enviadas (📅) */}
              {enviados.map((e) => {
                const st = statusLabel(e.STATUS)
                return (
                  <div
                    key={e.ID_COMPARTILHAMENTO}
                    className="bg-white rounded-lg shadow-sm p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm">📅</span>
                        <p className="font-medium text-gray-900">
                          {e.convidado?.NOME || e.convidado?.EMAIL || 'Usuário'}
                        </p>
                      </div>
                      <p className="text-sm text-gray-500">
                        {e.convidado?.EMAIL} | Permissão:{' '}
                        {e.PERMISSAO === 'EDITAR' ? 'Editar' : 'Visualizar'}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Enviado em {new Date(e.DATA_CONVITE).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${st.cls}`}>
                        {st.text}
                      </span>
                      <button
                        onClick={() => handleRemover(e.ID_COMPARTILHAMENTO)}
                        className="px-3 py-1 rounded text-sm bg-red-50 text-red-700 hover:bg-red-100"
                      >
                        Remover
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
