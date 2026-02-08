'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'

export const dynamic = 'force-dynamic'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (carregando) return // Evitar cliques duplos
    setCarregando(true)
    setErro('')

    const supabase = createSupabaseBrowserClient()

    const { data: loginData, error } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
    })

    if (error) {
      if (error.message.includes('rate limit') || error.status === 429) {
        setErro('Muitas tentativas. Aguarde alguns minutos e tente novamente.')
      } else if (error.message === 'Email not confirmed') {
        setErro('Email ainda não confirmado. Verifique sua caixa de entrada.')
      } else {
        setErro(error.message === 'Invalid login credentials' ? 'Email ou senha inválidos' : error.message)
      }
      setCarregando(false)
      return
    }

    // Auto-onboarding: se o usuário não tem perfil, criar automaticamente
    if (loginData.user) {
      await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: loginData.user.email?.split('@')[0] || 'Novo Usuário',
          userId: loginData.user.id,
          email: loginData.user.email,
        }),
      })
      // Ignora erros aqui - se já fez onboarding, a API retorna OK sem duplicar
    }

    router.push('/agenda')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Agend<span className="text-blue-600">AI</span>
          </h1>
          <p className="text-gray-600 mt-2">Entre em sua conta</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          {erro && (
            <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">
              {erro}
            </div>
          )}

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

          <div>
            <label htmlFor="senha" className="block text-sm font-medium text-gray-700 mb-1">
              Senha
            </label>
            <input
              id="senha"
              type="password"
              required
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={carregando}
            className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {carregando ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Não tem uma conta?{' '}
            <Link href="/cadastro" className="text-blue-600 hover:text-blue-700 font-medium">
              Criar conta grátis
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}