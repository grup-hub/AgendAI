'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'

interface Arquivado {
  ID_COMPROMISSO: string
  TITULO: string
  DATA_INICIO: string
}

export default function ConfiguracoesPage() {
  const router = useRouter()
  const supabase = useMemo(() => createSupabaseBrowserClient(), [])

  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')

  const loaded = useRef(false)
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Dados do usuário
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [telefone, setTelefone] = useState('')
  const [plano, setPlano] = useState('')
  const [dataNascimento, setDataNascimento] = useState('')

  // WhatsApp
  const [whatsappAtivado, setWhatsappAtivado] = useState(false)

  // Arquivados
  const [arquivados, setArquivados] = useState<Arquivado[]>([])
  const [mostrandoArquivados, setMostrandoArquivados] = useState(false)
  const [carregandoArquivados, setCarregandoArquivados] = useState(false)
  const [excluindoTodos, setExcluindoTodos] = useState(false)

  useEffect(() => {
    async function carregar() {
      const response = await fetch('/api/configuracoes')
      if (response.status === 401) {
        router.push('/login')
        return
      }

      if (!response.ok) {
        const data = await response.json()
        setErro(data.message || 'Erro ao carregar configurações')
        setCarregando(false)
        return
      }

      const data = await response.json()
      setNome(data.usuario.NOME || '')
      setEmail(data.usuario.EMAIL || '')
      setTelefone(data.usuario.TELEFONE || '')
      setPlano(data.usuario.PLANO || 'FREE')
      setWhatsappAtivado(data.whatsapp.ativado || false)
      setDataNascimento(data.usuario.DATA_NASCIMENTO?.slice(0, 10) || '')

      loaded.current = true
      setCarregando(false)
    }

    carregar()
  }, [router])

  async function handleVerArquivados() {
    if (mostrandoArquivados) {
      setMostrandoArquivados(false)
      return
    }
    setCarregandoArquivados(true)
    setMostrandoArquivados(true)
    try {
      const response = await fetch('/api/compromisso?arquivados=true')
      if (response.ok) {
        const data = await response.json()
        setArquivados(data.compromissos || [])
      }
    } catch {}
    setCarregandoArquivados(false)
  }

  async function handleExcluirArquivado(id: string) {
    if (!confirm('Excluir este compromisso arquivado definitivamente?')) return
    const response = await fetch(`/api/compromisso?id=${id}`, { method: 'DELETE' })
    if (!response.ok) {
      const data = await response.json()
      setErro(data.message || 'Erro ao excluir')
      return
    }
    setArquivados((prev) => prev.filter((a) => a.ID_COMPROMISSO !== id))
  }

  async function handleExcluirTodos() {
    if (!confirm('Excluir TODOS os compromissos arquivados definitivamente? Esta ação não pode ser desfeita.')) return
    setExcluindoTodos(true)
    const response = await fetch('/api/compromisso?todos=true', { method: 'DELETE' })
    if (!response.ok) {
      const data = await response.json()
      setErro(data.message || 'Erro ao excluir arquivados')
      setExcluindoTodos(false)
      return
    }
    setArquivados([])
    setExcluindoTodos(false)
    setSucesso('Todos os arquivados foram excluídos.')
  }

  const autoSalvar = useCallback(async (valores: {
    nome: string; telefone: string; whatsappAtivado: boolean; dataNascimento: string
  }) => {
    try {
      setSalvando(true)
      const response = await fetch('/api/configuracoes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: valores.nome,
          telefone: valores.telefone,
          whatsappAtivado: valores.whatsappAtivado,
          dataNascimento: valores.dataNascimento || null,
        }),
      })
      if (!response.ok) {
        const data = await response.json()
        setErro(data.message || 'Erro ao salvar configurações')
      }
    } catch {
      // erro silencioso
    } finally {
      setSalvando(false)
    }
  }, [])

  // Auto-save com debounce para campos de texto
  useEffect(() => {
    if (!loaded.current) return
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => {
      autoSalvar({ nome, telefone, whatsappAtivado, dataNascimento })
    }, 1500)
    return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current) }
  }, [nome, telefone])

  // Auto-save imediato para toggle e data
  useEffect(() => {
    if (!loaded.current) return
    autoSalvar({ nome, telefone, whatsappAtivado, dataNascimento })
  }, [whatsappAtivado, dataNascimento])

  if (carregando) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Carregando configurações...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
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
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Configurações</h2>

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

        <div className="space-y-8">
          {/* Dados Pessoais */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Dados Pessoais</h3>

            <div className="space-y-4">
              <div>
                <label htmlFor="nome" className="block text-sm font-medium text-gray-700 mb-1">
                  Nome
                </label>
                <input
                  id="nome"
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  disabled
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500"
                />
                <p className="text-xs text-gray-400 mt-1">O email não pode ser alterado</p>
              </div>

              <div>
                <label htmlFor="telefone" className="block text-sm font-medium text-gray-700 mb-1">
                  Telefone
                </label>
                <input
                  id="telefone"
                  type="tel"
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  placeholder="+55 11 99999-9999"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label htmlFor="dataNascimento" className="block text-sm font-medium text-gray-700 mb-1">
                  Data de Nascimento
                </label>
                <input
                  id="dataNascimento"
                  type="date"
                  value={dataNascimento}
                  onChange={(e) => setDataNascimento(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {dataNascimento && (
                  <p className="text-xs text-gray-400 mt-1">🎂 Um compromisso de aniversário anual será criado automaticamente</p>
                )}
                {!dataNascimento && (
                  <p className="text-xs text-gray-400 mt-1">Opcional — cria um lembrete de aniversário recorrente</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Plano</label>
                <span className="inline-block px-3 py-1 rounded-full text-sm font-medium bg-blue-50 text-blue-700">
                  {plano}
                </span>
              </div>
            </div>
          </div>

          {/* Integração WhatsApp */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">📱</span>
              <h3 className="text-lg font-bold text-gray-900">Integração WhatsApp</h3>
            </div>

            <p className="text-gray-600 mb-4">
              Ative para receber lembretes de compromissos via WhatsApp e criar compromissos
              enviando mensagens.
            </p>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg mb-4">
              <div>
                <p className="font-medium text-gray-900">Notificações WhatsApp</p>
                <p className="text-sm text-gray-500">
                  Receba lembretes antes dos seus compromissos
                </p>
              </div>
              <button
                type="button"
                onClick={() => setWhatsappAtivado(!whatsappAtivado)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  whatsappAtivado ? 'bg-green-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    whatsappAtivado ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {whatsappAtivado && (
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <p className="text-sm text-green-800 font-medium mb-2">
                  WhatsApp ativado para: {telefone || 'Nenhum telefone cadastrado'}
                </p>
                <p className="text-xs text-green-600">
                  Certifique-se de que o número acima é o mesmo do seu WhatsApp. Você receberá lembretes
                  automáticos antes de cada compromisso.
                </p>
                {!telefone && (
                  <p className="text-xs text-red-600 mt-2 font-medium">
                    ⚠️ Cadastre seu telefone acima para receber notificações
                  </p>
                )}
              </div>
            )}

            {whatsappAtivado && telefone && (
              <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-800 font-medium mb-2">
                  💡 Crie compromissos pelo WhatsApp!
                </p>
                <p className="text-xs text-blue-600 mb-2">
                  Envie uma mensagem para o número do AgendAI no formato:
                </p>
                <code className="text-xs bg-white px-2 py-1 rounded block text-blue-800">
                  título | data | hora início - hora fim
                </code>
                <p className="text-xs text-blue-600 mt-2">
                  Exemplo: Dentista | 15/03 | 10:00 - 11:00
                </p>
              </div>
            )}
          </div>

          {/* Indicador de auto-save */}
          {salvando && (
            <p className="text-center text-sm text-gray-400">Salvando...</p>
          )}
        </div>

        {/* Seção Arquivados */}
        <div className="mt-8 bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📦</span>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Compromissos Arquivados</h3>
                <p className="text-sm text-gray-500">Gerencie compromissos vencidos que foram arquivados</p>
              </div>
            </div>
            <button
              onClick={handleVerArquivados}
              className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium text-sm transition"
            >
              {mostrandoArquivados ? 'Ocultar' : 'Ver arquivados'}
            </button>
          </div>

          {mostrandoArquivados && (
            <div className="mt-4">
              {carregandoArquivados ? (
                <p className="text-gray-500 text-sm text-center py-4">Carregando...</p>
              ) : arquivados.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-4">Nenhum compromisso arquivado</p>
              ) : (
                <>
                  <div className="space-y-2 mb-4">
                    {arquivados.map((a) => {
                      const data = new Date(a.DATA_INICIO)
                      const dataLabel = `${data.getDate().toString().padStart(2,'0')}/${(data.getMonth()+1).toString().padStart(2,'0')}/${data.getFullYear()} ${data.getHours().toString().padStart(2,'0')}:${data.getMinutes().toString().padStart(2,'0')}`
                      return (
                        <div key={a.ID_COMPROMISSO} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="font-medium text-gray-800 text-sm">{a.TITULO}</p>
                            <p className="text-xs text-gray-400">📅 {dataLabel}</p>
                          </div>
                          <button
                            onClick={() => handleExcluirArquivado(a.ID_COMPROMISSO)}
                            className="px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 text-xs font-medium transition"
                          >
                            🗑️ Excluir
                          </button>
                        </div>
                      )
                    })}
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={handleExcluirTodos}
                      disabled={excluindoTodos}
                      className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 font-medium text-sm disabled:opacity-50 transition"
                    >
                      {excluindoTodos ? 'Excluindo...' : '🗑️ Excluir todos'}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
