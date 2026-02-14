import React, { useCallback, useState } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

interface Compromisso {
  ID_COMPROMISSO: string
  TITULO: string
  DESCRICAO: string | null
  DATA_INICIO: string
  DATA_FIM: string | null
  LOCAL: string | null
  STATUS: string
  ID_AGENDA: string
}

export default function AgendaScreen({ navigation }: any) {
  const { user, signOut } = useAuth()
  const [compromissos, setCompromissos] = useState<Compromisso[]>([])
  const [carregando, setCarregando] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const carregarCompromissos = async () => {
    if (!user) return

    try {
      // Buscar agenda do usuário
      const { data: agendas } = await supabase
        .from('AGENDA')
        .select('ID_AGENDA')
        .eq('ID_USUARIO', user.id)
        .eq('ATIVA', true)

      if (!agendas || agendas.length === 0) {
        setCompromissos([])
        return
      }

      const agendaIds = agendas.map((a) => a.ID_AGENDA)

      // Buscar compromissos das agendas
      const { data, error } = await supabase
        .from('COMPROMISSO')
        .select('*')
        .in('ID_AGENDA', agendaIds)
        .gte('DATA_INICIO', new Date().toISOString().split('T')[0])
        .order('DATA_INICIO', { ascending: true })

      if (error) throw error
      setCompromissos(data || [])
    } catch (err) {
      console.error('Erro ao carregar compromissos:', err)
    } finally {
      setCarregando(false)
      setRefreshing(false)
    }
  }

  useFocusEffect(
    useCallback(() => {
      setCarregando(true)
      carregarCompromissos()
    }, [user])
  )

  const onRefresh = () => {
    setRefreshing(true)
    carregarCompromissos()
  }

  function formatarData(dataISO: string) {
    const data = new Date(dataISO)
    const dia = data.getDate().toString().padStart(2, '0')
    const mes = (data.getMonth() + 1).toString().padStart(2, '0')
    const hora = data.getHours().toString().padStart(2, '0')
    const min = data.getMinutes().toString().padStart(2, '0')
    return { data: `${dia}/${mes}`, hora: `${hora}:${min}` }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'CONFIRMADO': return '#10B981'
      case 'CANCELADO': return '#EF4444'
      case 'PENDENTE': return '#F59E0B'
      default: return '#6B7280'
    }
  }

  const renderCompromisso = ({ item }: { item: Compromisso }) => {
    const { data, hora } = formatarData(item.DATA_INICIO)
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('DetalheCompromisso', { compromisso: item })}
        activeOpacity={0.7}
      >
        <View style={styles.cardLeft}>
          <Text style={styles.cardData}>{data}</Text>
          <Text style={styles.cardHora}>{hora}</Text>
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.cardTitulo} numberOfLines={1}>{item.TITULO}</Text>
          {item.LOCAL && (
            <Text style={styles.cardLocal} numberOfLines={1}>{item.LOCAL}</Text>
          )}
          {item.DESCRICAO && (
            <Text style={styles.cardDescricao} numberOfLines={1}>{item.DESCRICAO}</Text>
          )}
        </View>
        <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.STATUS) }]} />
      </TouchableOpacity>
    )
  }

  if (carregando) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>
            Agend<Text style={styles.headerAccent}>AI</Text>
          </Text>
          <Text style={styles.headerSub}>Seus compromissos</Text>
        </View>
        <TouchableOpacity onPress={signOut} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Sair</Text>
        </TouchableOpacity>
      </View>

      {compromissos.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>📅</Text>
          <Text style={styles.emptyText}>Nenhum compromisso agendado</Text>
          <Text style={styles.emptySubtext}>Toque no + para criar um novo</Text>
        </View>
      ) : (
        <FlatList
          data={compromissos}
          keyExtractor={(item) => item.ID_COMPROMISSO}
          renderItem={renderCompromisso}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563EB']} />
          }
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('NovoCompromisso')}
        activeOpacity={0.8}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: '#2563EB',
    paddingTop: 52,
    paddingBottom: 20,
    paddingHorizontal: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerAccent: {
    color: '#BFDBFE',
  },
  headerSub: {
    fontSize: 14,
    color: '#BFDBFE',
    marginTop: 2,
  },
  logoutBtn: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  logoutText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  list: {
    padding: 16,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  cardLeft: {
    alignItems: 'center',
    marginRight: 16,
    minWidth: 48,
  },
  cardData: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2563EB',
  },
  cardHora: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  cardContent: {
    flex: 1,
  },
  cardTitulo: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  cardLocal: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  cardDescricao: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 2,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginLeft: 12,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: '#2563EB',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  fabText: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '300',
    marginTop: -2,
  },
})
