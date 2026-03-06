import React, { useEffect } from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { useAuth } from '../contexts/AuthContext'
import { ActivityIndicator, View, Text, Platform, AppState } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { registrarNotificacoes } from '../lib/notifications'
import { supabase } from '../lib/supabase'
import {
  CompartilhamentoProvider,
  useCompartilhamento,
} from '../contexts/CompartilhamentoContext'

import LoginScreen from '../screens/LoginScreen'
import CadastroScreen from '../screens/CadastroScreen'
import EsqueciSenhaScreen from '../screens/EsqueciSenhaScreen'
import AgendaScreen from '../screens/AgendaScreen'
import NovoCompromissoScreen from '../screens/NovoCompromissoScreen'
import DetalhesCompromissoScreen from '../screens/DetalhesCompromissoScreen'
import CompartilhamentoScreen from '../screens/CompartilhamentoScreen'
import ConfiguracoesScreen from '../screens/ConfiguracoesScreen'
import Copa2026Screen from '../screens/Copa2026Screen'

const Stack = createNativeStackNavigator()
const Tab = createBottomTabNavigator()

const headerStyle = {
  headerStyle: { backgroundColor: '#2563EB' },
  headerTintColor: '#FFFFFF',
  headerTitleStyle: { fontWeight: '600' as const },
}

function AgendaStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="AgendaHome"
        component={AgendaScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="NovoCompromisso"
        component={NovoCompromissoScreen}
        options={{ title: 'Novo Compromisso', ...headerStyle }}
      />
      <Stack.Screen
        name="DetalhesCompromisso"
        component={DetalhesCompromissoScreen}
        options={{ title: 'Detalhes', ...headerStyle }}
      />
    </Stack.Navigator>
  )
}

function Copa2026Stack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Copa2026Home"
        component={Copa2026Screen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="DetalhesCompromisso"
        component={DetalhesCompromissoScreen}
        options={{ title: 'Detalhes do Jogo', ...headerStyle }}
      />
    </Stack.Navigator>
  )
}

function CompartilhamentoStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="CompartilhamentoHome"
        component={CompartilhamentoScreen}
        options={{ title: 'Compartilhar', ...headerStyle }}
      />
      <Stack.Screen
        name="DetalhesCompromisso"
        component={DetalhesCompromissoScreen}
        options={{ title: 'Detalhes', ...headerStyle }}
      />
    </Stack.Navigator>
  )
}

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  const icons: Record<string, string> = {
    'Agenda': '📅',
    'Copa 2026': '⚽',
    'Compartilhar': '👥',
    'Configurações': '⚙️',
  }
  return (
    <Text style={{ fontSize: focused ? 24 : 20 }}>
      {icons[label] || '📋'}
    </Text>
  )
}

// MainTabs separado para poder usar hooks de context
function MainTabs() {
  const insets = useSafeAreaInsets()
  const bottomPadding = Math.max(insets.bottom, 10)
  const { session } = useAuth()
  const { pendentesCount, refreshPendentes } = useCompartilhamento()

  // 1. Busca inicial ao logar
  useEffect(() => {
    if (session?.user?.id) {
      refreshPendentes()
    }
  }, [session?.user?.id])

  // 2. Supabase Realtime — notificação em tempo real ao receber novo compartilhamento
  useEffect(() => {
    if (!session?.user?.id) return
    const userId = session.user.id

    const channel = supabase
      .channel('compartilhamentos-novos')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'COMPARTILHAMENTO_AGENDA',
          filter: `ID_USUARIO_CONVIDADO=eq.${userId}`,
        },
        () => refreshPendentes()
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'COMPARTILHAMENTO_COMPROMISSO',
          filter: `ID_USUARIO_DESTINATARIO=eq.${userId}`,
        },
        () => refreshPendentes()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [session?.user?.id])

  // 3. Fallback via AppState — ao voltar ao foreground
  useEffect(() => {
    if (!session?.user?.id) return
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') {
        refreshPendentes()
      }
    })
    return () => sub.remove()
  }, [session?.user?.id])

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused }) => <TabIcon label={route.name} focused={focused} />,
        tabBarActiveTintColor: '#2563EB',
        tabBarInactiveTintColor: '#9CA3AF',
        lazy: false,
        unmountOnBlur: false,
        freezeOnBlur: true,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#F3F4F6',
          borderTopWidth: 1,
          height: 56 + bottomPadding,
          paddingBottom: bottomPadding,
          paddingTop: 6,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
        },
      })}
    >
      <Tab.Screen
        name="Agenda"
        component={AgendaStack}
        options={{ headerShown: false }}
      />
      <Tab.Screen
        name="Copa 2026"
        component={Copa2026Stack}
        options={{ headerShown: false }}
      />
      <Tab.Screen
        name="Compartilhar"
        component={CompartilhamentoStack}
        options={{
          headerShown: false,
          tabBarBadge: pendentesCount > 0 ? pendentesCount : undefined,
        }}
      />
      <Tab.Screen
        name="Configurações"
        component={ConfiguracoesScreen}
        options={{ title: 'Configurações', ...headerStyle }}
      />
    </Tab.Navigator>
  )
}

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Cadastro" component={CadastroScreen} />
      <Stack.Screen name="EsqueciSenha" component={EsqueciSenhaScreen} />
    </Stack.Navigator>
  )
}

function AppContent() {
  const { session, loading } = useAuth()

  // Registrar notificações quando logado
  useEffect(() => {
    if (session) {
      registrarNotificacoes()
    }
  }, [session])

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F3F4F6' }}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    )
  }

  return session ? <MainTabs /> : <AuthStack />
}

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <CompartilhamentoProvider>
        <AppContent />
      </CompartilhamentoProvider>
    </NavigationContainer>
  )
}
