import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Session, User } from '@supabase/supabase-js'

interface AuthContextType {
  session: Session | null
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signUp: (email: string, password: string, nome: string, telefone: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Buscar sessão existente
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Escutar mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      if (error.message.includes('Email not confirmed')) {
        return { error: 'Email ainda não confirmado. Verifique sua caixa de entrada.' }
      }
      if (error.message.includes('Invalid login credentials')) {
        return { error: 'Email ou senha incorretos.' }
      }
      return { error: error.message }
    }

    // Auto-onboarding (idempotente)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: existente } = await supabase
          .from('USUARIO')
          .select('ID_USUARIO')
          .eq('ID_USUARIO', user.id)
          .single()

        if (!existente) {
          // Primeiro login - criar USUARIO + AGENDA via onboarding
          // Usa a API web se disponível, ou cria diretamente
          await supabase.from('USUARIO').insert({
            ID_USUARIO: user.id,
            EMAIL: user.email,
            NOME: user.user_metadata?.nome || 'Novo Usuário',
            TELEFONE: user.user_metadata?.telefone || null,
            PLANO: 'FREE',
            ATIVO: true,
          })
          await supabase.from('AGENDA').insert({
            ID_USUARIO: user.id,
            NOME: 'Minha Agenda',
            COR: '#3B82F6',
            ATIVA: true,
          })
        }
      }
    } catch {
      // Não bloqueia o login se onboarding falhar
    }

    return { error: null }
  }

  const signUp = async (email: string, password: string, nome: string, telefone: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { nome, telefone },
      },
    })

    if (error) {
      if (error.status === 429) {
        return { error: 'Muitas tentativas. Aguarde alguns minutos.' }
      }
      return { error: error.message }
    }

    // Criar USUARIO + AGENDA
    if (data.user) {
      try {
        await supabase.from('USUARIO').insert({
          ID_USUARIO: data.user.id,
          EMAIL: email,
          NOME: nome || 'Novo Usuário',
          TELEFONE: telefone || null,
          PLANO: 'FREE',
          ATIVO: true,
        })
        await supabase.from('AGENDA').insert({
          ID_USUARIO: data.user.id,
          NOME: 'Minha Agenda',
          COR: '#3B82F6',
          ATIVA: true,
        })
      } catch {
        // Pode falhar se RLS bloquear (email não confirmado)
      }
    }

    return { error: null }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ session, user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
