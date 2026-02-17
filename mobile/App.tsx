import React, { useEffect, useRef } from 'react'
import { AppState, AppStateStatus } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { AuthProvider, useAuth } from './src/contexts/AuthContext'
import AppNavigator from './src/navigation/AppNavigator'
import { listarCompartilhamentosCompromisso } from './src/lib/api'
import { notificarCompartilhamentosPendentes } from './src/lib/notifications'

const STORAGE_KEY_PENDENTES = '@agendai:compartilhamentos_pendentes'

function AppContent() {
  const { session } = useAuth()
  const appState = useRef(AppState.currentState)

  async function verificarCompartilhamentosPendentes() {
    if (!session) return
    try {
      const data = await listarCompartilhamentosCompromisso()
      const compartilhamentos = data?.compartilhamentos || data || []
      const pendentes = compartilhamentos.filter((c: any) => c.STATUS === 'PENDENTE')
      const totalPendentes = pendentes.length

      // Buscar quantidade anterior salva
      const anteriorStr = await AsyncStorage.getItem(STORAGE_KEY_PENDENTES)
      const anterior = anteriorStr ? parseInt(anteriorStr) : 0

      // Notificar apenas se tiver novos pendentes
      if (totalPendentes > anterior) {
        await notificarCompartilhamentosPendentes(totalPendentes)
      }

      // Salvar quantidade atual
      await AsyncStorage.setItem(STORAGE_KEY_PENDENTES, String(totalPendentes))
    } catch {
      // Silencioso - não bloquear o app
    }
  }

  useEffect(() => {
    if (!session) return

    // Verificar ao logar/iniciar
    verificarCompartilhamentosPendentes()

    // Verificar quando app volta ao foreground
    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && nextState === 'active') {
        verificarCompartilhamentosPendentes()
      }
      appState.current = nextState
    })

    return () => subscription.remove()
  }, [session])

  return (
    <>
      <StatusBar style="light" />
      <AppNavigator />
    </>
  )
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </SafeAreaProvider>
  )
}
