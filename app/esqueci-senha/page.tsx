'use client'

import Link from 'next/link'
import { useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'

export default function EsqueciSenhaPage() {
  const [email, setEmail] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [erro, setErro] = useState('')

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    if (carregando) return
    setCarregando(true)
    setErro('')

    const supabase = createSupabaseBrowserClient()

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/redefinir-senha`,
    })

    setCarregando(false)

    if (error) {
      setErro('Erro ao enviar email. Verifique o endereço e tente novamente.')
      return
    }

    setEnviado(true)
  }

  if (enviado) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="text-5xl mb-4">📧</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Email enviado!</h1>
          <p className="text-gray-600 mb-6">
            Enviamos um link de redefinição de senha para <strong>{email}</strong>.
            Verifique sua caixa de entrada e spam.
          </p>
          <Link
            href="/login"
            className="inline-block py-2 px-6 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Voltar ao login
          </Link>
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
          <p className="text-gray-600 mt-2">Recuperar senha</p>
        </div>

        <form onSubmit={handleReset} className="space-y-6">
          {erro && (
            <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">
              {erro}
            </div>
          )}

          <p className="text-sm text-gray-600">
            Digite seu email e enviaremos um link para redefinir sua senha.
          </p>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="seu@email.com"
            />
          </div>

          <button
            type="submit"
            disabled={carregando}
            className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {carregando ? 'Enviando...' : 'Enviar link de recuperação'}
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
