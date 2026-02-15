import React, { useCallback, useState, useRef } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import {
  listarCompartilhamentos,
  convidarCompartilhamento,
  responderCompartilhamento,
  removerCompartilhamento,
} from '../lib/api'

interface Compartilhamento {
  ID_COMPARTILHAMENTO: string
  ID_AGENDA: string
  PERMISSAO: string
  STATUS: string
  DATA_CONVITE: string
  convidado?: { NOME: string; EMAIL: string }
  agenda?: { NOME: string }
  dono?: { NOME: string; EMAIL: string }
}

export default function CompartilhamentoScreen() {
  const [enviados, setEnviados] = useState<Compartilhamento[]>([])
  const [recebidos, setRecebidos] = useState<Compartilhamento[]>([])
  const [carregando, setCarregando] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Formulário
  const [email, setEmail] = useState('')
  const [permissao, setPermissao] = useState<'VISUALIZAR' | 'EDITAR'>('VISUALIZAR')
  const [enviando, setEnviando] = useState(false)
  const lastFetch = useRef<number>(0)
  const loaded = useRef(false)

  const carregar = async (forceLoading = false) => {
    if (forceLoading) setCarregando(true)
    try {
      const data = await listarCompartilhamentos()
      setEnviados(data.enviados || [])
      setRecebidos(data.recebidos || [])
      lastFetch.current = Date.now()
      loaded.current = true
    } catch (err: any) {
      if (!loaded.current) Alert.alert('Erro', err.message || 'Erro ao carregar')
    } finally {
      setCarregando(false)
      setRefreshing(false)
    }
  }

  useFocusEffect(
    useCallback(() => {
      const isFirstLoad = !loaded.current
      const isStale = Date.now() - lastFetch.current > 30000
      if (isFirstLoad) {
        setCarregando(true)
        carregar()
      } else if (isStale) {
        carregar() // background refresh
      }
    }, [])
  )

  async function handleConvidar() {
    if (!email.trim()) {
      Alert.alert('Erro', 'Digite o email do usuário')
      return
    }

    setEnviando(true)
    try {
      await convidarCompartilhamento(email.trim(), permissao)
      Alert.alert('Sucesso', 'Convite enviado!')
      setEmail('')
      carregar()
    } catch (err: any) {
      Alert.alert('Erro', err.message || 'Erro ao enviar convite')
    } finally {
      setEnviando(false)
    }
  }

  async function handleResponder(id: string, status: 'ACEITO' | 'RECUSADO') {
    try {
      await responderCompartilhamento(id, status)
      Alert.alert('Sucesso', status === 'ACEITO' ? 'Convite aceito!' : 'Convite recusado.')
      carregar()
    } catch (err: any) {
      Alert.alert('Erro', err.message)
    }
  }

  async function handleRemover(id: string) {
    Alert.alert('Remover', 'Tem certeza que deseja remover este compartilhamento?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: async () => {
          try {
            await removerCompartilhamento(id)
            Alert.alert('Sucesso', 'Compartilhamento removido.')
            carregar()
          } catch (err: any) {
            Alert.alert('Erro', err.message)
          }
        },
      },
    ])
  }

  function getStatusStyle(status: string) {
    switch (status) {
      case 'PENDENTE': return { bg: '#FEF3C7', text: '#92400E', label: 'Pendente' }
      case 'ACEITO': return { bg: '#D1FAE5', text: '#065F46', label: 'Aceito' }
      case 'RECUSADO': return { bg: '#FEE2E2', text: '#991B1B', label: 'Recusado' }
      default: return { bg: '#F3F4F6', text: '#374151', label: status }
    }
  }

  if (carregando) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    )
  }

  const sections = [
    { type: 'form' as const },
    { type: 'recebidosHeader' as const },
    ...recebidos.map((r) => ({ type: 'recebido' as const, data: r })),
    ...(recebidos.length === 0 ? [{ type: 'recebidosEmpty' as const }] : []),
    { type: 'enviadosHeader' as const },
    ...enviados.map((e) => ({ type: 'enviado' as const, data: e })),
    ...(enviados.length === 0 ? [{ type: 'enviadosEmpty' as const }] : []),
  ]

  return (
    <FlatList
      style={styles.container}
      data={sections}
      keyExtractor={(item, index) => `${item.type}-${index}`}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); carregar() }} colors={['#2563EB']} />
      }
      contentContainerStyle={styles.list}
      renderItem={({ item }) => {
        // Formulário de convite
        if (item.type === 'form') {
          return (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Compartilhar minha agenda</Text>
              <TextInput
                style={styles.input}
                placeholder="Email do usuário"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <View style={styles.permissaoRow}>
                <TouchableOpacity
                  style={[styles.permissaoBtn, permissao === 'VISUALIZAR' && styles.permissaoActive]}
                  onPress={() => setPermissao('VISUALIZAR')}
                >
                  <Text style={[styles.permissaoText, permissao === 'VISUALIZAR' && styles.permissaoTextActive]}>
                    Visualizar
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.permissaoBtn, permissao === 'EDITAR' && styles.permissaoActive]}
                  onPress={() => setPermissao('EDITAR')}
                >
                  <Text style={[styles.permissaoText, permissao === 'EDITAR' && styles.permissaoTextActive]}>
                    Editar
                  </Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={[styles.convidarBtn, enviando && styles.btnDisabled]}
                onPress={handleConvidar}
                disabled={enviando}
              >
                <Text style={styles.convidarBtnText}>
                  {enviando ? 'Enviando...' : 'Enviar convite'}
                </Text>
              </TouchableOpacity>
            </View>
          )
        }

        // Headers
        if (item.type === 'recebidosHeader') {
          return <Text style={styles.sectionTitle}>Convites recebidos</Text>
        }
        if (item.type === 'enviadosHeader') {
          return <Text style={styles.sectionTitle}>Convites enviados</Text>
        }

        // Empty states
        if (item.type === 'recebidosEmpty' || item.type === 'enviadosEmpty') {
          return (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>
                {item.type === 'recebidosEmpty' ? 'Nenhum convite recebido' : 'Nenhum convite enviado'}
              </Text>
            </View>
          )
        }

        // Convite recebido
        if (item.type === 'recebido' && item.data) {
          const r = item.data
          const st = getStatusStyle(r.STATUS)
          return (
            <View style={styles.itemCard}>
              <View style={styles.itemHeader}>
                <Text style={styles.itemNome}>{r.dono?.NOME || r.dono?.EMAIL || 'Usuário'}</Text>
                <View style={[styles.badge, { backgroundColor: st.bg }]}>
                  <Text style={[styles.badgeText, { color: st.text }]}>{st.label}</Text>
                </View>
              </View>
              <Text style={styles.itemSub}>
                Agenda: {r.agenda?.NOME || 'Agenda'} | {r.PERMISSAO === 'EDITAR' ? 'Editar' : 'Visualizar'}
              </Text>
              <Text style={styles.itemDate}>
                Convidado em {new Date(r.DATA_CONVITE).toLocaleDateString('pt-BR')}
              </Text>
              {r.STATUS === 'PENDENTE' && (
                <View style={styles.actionsRow}>
                  <TouchableOpacity
                    style={styles.aceitarBtn}
                    onPress={() => handleResponder(r.ID_COMPARTILHAMENTO, 'ACEITO')}
                  >
                    <Text style={styles.aceitarBtnText}>Aceitar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.recusarBtn}
                    onPress={() => handleResponder(r.ID_COMPARTILHAMENTO, 'RECUSADO')}
                  >
                    <Text style={styles.recusarBtnText}>Recusar</Text>
                  </TouchableOpacity>
                </View>
              )}
              {r.STATUS === 'ACEITO' && (
                <TouchableOpacity
                  style={styles.sairBtn}
                  onPress={() => handleRemover(r.ID_COMPARTILHAMENTO)}
                >
                  <Text style={styles.sairBtnText}>Sair</Text>
                </TouchableOpacity>
              )}
            </View>
          )
        }

        // Convite enviado
        if (item.type === 'enviado' && item.data) {
          const e = item.data
          const st = getStatusStyle(e.STATUS)
          return (
            <View style={styles.itemCard}>
              <View style={styles.itemHeader}>
                <Text style={styles.itemNome}>{e.convidado?.NOME || e.convidado?.EMAIL || 'Usuário'}</Text>
                <View style={[styles.badge, { backgroundColor: st.bg }]}>
                  <Text style={[styles.badgeText, { color: st.text }]}>{st.label}</Text>
                </View>
              </View>
              <Text style={styles.itemSub}>
                {e.convidado?.EMAIL} | {e.PERMISSAO === 'EDITAR' ? 'Editar' : 'Visualizar'}
              </Text>
              <Text style={styles.itemDate}>
                Enviado em {new Date(e.DATA_CONVITE).toLocaleDateString('pt-BR')}
              </Text>
              <TouchableOpacity
                style={styles.removerBtn}
                onPress={() => handleRemover(e.ID_COMPARTILHAMENTO)}
              >
                <Text style={styles.removerBtnText}>Remover</Text>
              </TouchableOpacity>
            </View>
          )
        }

        return null
      }}
    />
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F3F4F6' },
  list: { padding: 16, paddingBottom: 40 },

  // Card formulário
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827', marginBottom: 16 },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 12,
    color: '#111827',
  },
  permissaoRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  permissaoBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#F9FAFB',
  },
  permissaoActive: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  permissaoText: { fontSize: 14, fontWeight: '500', color: '#6B7280' },
  permissaoTextActive: { color: '#FFFFFF' },
  convidarBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  convidarBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  btnDisabled: { opacity: 0.6 },

  // Section
  sectionTitle: { fontSize: 17, fontWeight: 'bold', color: '#111827', marginTop: 20, marginBottom: 12 },

  // Empty
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginBottom: 8,
  },
  emptyText: { fontSize: 14, color: '#9CA3AF' },

  // Item card
  itemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  itemNome: { fontSize: 15, fontWeight: '600', color: '#111827', flex: 1 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  itemSub: { fontSize: 13, color: '#6B7280', marginBottom: 2 },
  itemDate: { fontSize: 12, color: '#9CA3AF', marginBottom: 8 },

  // Action buttons
  actionsRow: { flexDirection: 'row', gap: 10 },
  aceitarBtn: { flex: 1, backgroundColor: '#10B981', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  aceitarBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  recusarBtn: { flex: 1, backgroundColor: '#FEE2E2', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  recusarBtnText: { color: '#DC2626', fontSize: 14, fontWeight: '500' },
  sairBtn: { backgroundColor: '#FEE2E2', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  sairBtnText: { color: '#DC2626', fontSize: 14, fontWeight: '500' },
  removerBtn: { backgroundColor: '#FEE2E2', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  removerBtnText: { color: '#DC2626', fontSize: 14, fontWeight: '500' },
})
