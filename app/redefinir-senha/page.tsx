'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'

export default function RedefinirSenhaPage() {
  const router = useRouter()
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState(false)

  async function handleRedefinir(e: React.FormEvent) {
    e.preventDefault()
    if (carregando) return

    if (novaSenha.length < 6) {
      setErro('A senha deve ter pelo menos 6 caracteres.')
      return
    }

    if (novaSenha !== confirmarSenha) {
      setErro('As senhas não coincidem.')
      return
    }

    setCarregando(true)
    setErro('')

    const supabase = createSupabaseBrowserClient()

    const { error } = await supabase.auth.updateUser({
      password: novaSenha,
    })

    setCarregando(false)

    if (error) {
      setErro('Erro ao redefinir senha. O link pode ter expirado. Tente novamente.')
      return
    }

    setSucesso(true)
    setTimeout(() => router.push('/agenda'), 3000)
  }

  if (sucesso) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="text-5xl mb-4">✅</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Senha redefinida!</h1>
          <p className="text-gray-600 mb-6">
            Sua senha foi alterada com sucesso. Redirecionando para a agenda...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Agend<span className="text-blue-600">AI</span>
          </h1>
          <p className="text-gray-600 mt-2">Redefinir senha</p>
        </div>

        <form onSubmit={handleRedefinir} className="space-y-6">
          {erro && (
            <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">
              {erro}
            </div>
          )}

          <div>
            <label htmlFor="novaSenha" className="block text-sm font-medium text-gray-700 mb-1">
              Nova senha
            </label>
            <input
              id="novaSenha"
              type="password"
              required
              value={novaSenha}
              onChange={(e) => setNovaSenha(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Mínimo 6 caracteres"
            />
          </div>

          <div>
            <label htmlFor="confirmarSenha" className="block text-sm font-medium text-gray-700 mb-1">
              Confirmar nova senha
            </label>
            <input
              id="confirmarSenha"
              type="password"
              required
              value={confirmarSenha}
              onChange={(e) => setConfirmarSenha(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Repita a nova senha"
            />
          </div>

          <button
            type="submit"
            disabled={carregando}
            className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {carregando ? 'Redefinindo...' : 'Redefinir senha'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link href="/login" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
            ← Voltar ao login
          </Link>
        </div>
      </div>
    </div>
  )
}
