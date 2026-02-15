import React, { useCallback, useState, useRef, useMemo } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native'
import { Calendar, LocaleConfig } from 'react-native-calendars'
import { useFocusEffect } from '@react-navigation/native'
import { listarCompromissos } from '../lib/api'
import { agendarLembretesCompromissos } from '../lib/notifications'

// Configurar calendário em português
LocaleConfig.locales['pt-br'] = {
  monthNames: ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'],
  monthNamesShort: ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'],
  dayNames: ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'],
  dayNamesShort: ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'],
  today: 'Hoje',
}
LocaleConfig.defaultLocale = 'pt-br'

interface Compromisso {
  ID_COMPROMISSO: string
  TITULO: string
  DESCRICAO: string | null
  DATA_INICIO: string
  DATA_FIM: string | null
  LOCAL: string | null
  STATUS: string
  ORIGEM: string
  ID_AGENDA: string
  compartilhado?: boolean
  dono_nome?: string
  agenda_nome?: string
  permissao?: string
}

type ViewMode = 'calendar' | 'list'

export default function AgendaScreen({ navigation }: any) {
  const [compromissos, setCompromissos] = useState<Compromisso[]>([])
  const [carregando, setCarregando] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('calendar')
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  )
  const lastFetch = useRef<number>(0)
  const loaded = useRef(false)

  const carregarCompromissos = useCallback(async (forceLoading = false) => {
    if (forceLoading) setCarregando(true)
    try {
      const data = await listarCompromissos()
      const lista = data.compromissos || []
      setCompromissos(lista)
      lastFetch.current = Date.now()
      loaded.current = true
      // Agendar notificações locais para compromissos futuros
      agendarLembretesCompromissos(lista).catch(() => {})
    } catch (err) {
      console.error('Erro ao carregar compromissos:', err)
    } finally {
      setCarregando(false)
      setRefreshing(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      if (!loaded.current) {
        setCarregando(true)
        carregarCompromissos()
      } else if (Date.now() - lastFetch.current > 30000) {
        carregarCompromissos() // background refresh sem loading
      }
    }, [carregarCompromissos])
  )

  const onRefresh = () => {
    setRefreshing(true)
    carregarCompromissos()
  }

  // Agrupar datas para marcar no calendário (memoizado)
  const markedDates = useMemo(() => {
    const marks: Record<string, any> = {}

    compromissos.forEach((c) => {
      const dateKey = c.DATA_INICIO.split('T')[0]
      if (!marks[dateKey]) {
        marks[dateKey] = { dots: [], marked: true }
      }
      marks[dateKey].dots.push({
        color: c.compartilhado ? '#8B5CF6' : '#2563EB',
      })
    })

    // Marcar dia selecionado
    if (marks[selectedDate]) {
      marks[selectedDate] = { ...marks[selectedDate], selected: true, selectedColor: '#2563EB' }
    } else {
      marks[selectedDate] = { selected: true, selectedColor: '#2563EB' }
    }

    return marks
  }, [compromissos, selectedDate])

  // Filtrar compromissos do dia selecionado (memoizado)
  const compromissosDoDia = useMemo(() =>
    compromissos.filter((c) => c.DATA_INICIO.split('T')[0] === selectedDate),
    [compromissos, selectedDate]
  )

  // Filtrar compromissos futuros para modo lista (memoizado)
  const compromissosFuturos = useMemo(() => {
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)
    return compromissos.filter((c) => new Date(c.DATA_INICIO) >= hoje)
  }, [compromissos])

  // Callback estável para seleção de dia
  const onDayPress = useCallback((day: any) => setSelectedDate(day.dateString), [])

  // FlatList keyExtractor estável
  const keyExtractorCompromisso = useCallback((item: Compromisso) => item.ID_COMPROMISSO, [])

  function formatarData(dataISO: string) {
    const data = new Date(dataISO)
    const dia = data.getDate().toString().padStart(2, '0')
    const mes = (data.getMonth() + 1).toString().padStart(2, '0')
    const hora = data.getHours().toString().padStart(2, '0')
    const min = data.getMinutes().toString().padStart(2, '0')
    return { data: `${dia}/${mes}`, hora: `${hora}:${min}` }
  }

  function formatarHorario(dataISO: string, dataFimISO?: string | null) {
    const inicio = new Date(dataISO)
    const h1 = inicio.getHours().toString().padStart(2, '0')
    const m1 = inicio.getMinutes().toString().padStart(2, '0')

    if (dataFimISO) {
      const fim = new Date(dataFimISO)
      const h2 = fim.getHours().toString().padStart(2, '0')
      const m2 = fim.getMinutes().toString().padStart(2, '0')
      if (`${h1}:${m1}` !== `${h2}:${m2}`) {
        return `${h1}:${m1} - ${h2}:${m2}`
      }
    }
    return `${h1}:${m1}`
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'CONFIRMADO': return '#10B981'
      case 'ATIVO': return '#2563EB'
      case 'CANCELADO': return '#EF4444'
      case 'PENDENTE': return '#F59E0B'
      default: return '#6B7280'
    }
  }

  function getStatusLabel(status: string) {
    switch (status) {
      case 'CONFIRMADO': return 'Confirmado'
      case 'ATIVO': return 'Ativo'
      case 'CANCELADO': return 'Cancelado'
      case 'PENDENTE': return 'Pendente'
      default: return status
    }
  }

  const renderCompromisso = useCallback(({ item }: { item: Compromisso }) => {
    const horario = formatarHorario(item.DATA_INICIO, item.DATA_FIM)
    const { data } = formatarData(item.DATA_INICIO)

    return (
      <TouchableOpacity
        style={[styles.card, item.compartilhado && styles.cardCompartilhado]}
        activeOpacity={0.7}
        onPress={() => navigation.navigate('DetalhesCompromisso', { compromisso: item })}
      >
        <View style={[styles.cardBar, { backgroundColor: getStatusColor(item.STATUS) }]} />
        <View style={styles.cardBody}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitulo} numberOfLines={1}>{item.TITULO}</Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.STATUS) + '20' }]}>
              <Text style={[styles.statusText, { color: getStatusColor(item.STATUS) }]}>
                {getStatusLabel(item.STATUS)}
              </Text>
            </View>
          </View>

          <View style={styles.cardInfo}>
            <Text style={styles.cardIcon}>🕐</Text>
            <Text style={styles.cardInfoText}>{horario}</Text>
            {viewMode === 'list' && (
              <>
                <Text style={styles.cardIcon}>  📅</Text>
                <Text style={styles.cardInfoText}>{data}</Text>
              </>
            )}
          </View>

          {item.LOCAL && (
            <View style={styles.cardInfo}>
              <Text style={styles.cardIcon}>📍</Text>
              <Text style={styles.cardInfoText} numberOfLines={1}>{item.LOCAL}</Text>
            </View>
          )}

          {item.compartilhado && item.dono_nome && (
            <View style={styles.cardInfo}>
              <Text style={styles.cardIcon}>👤</Text>
              <Text style={[styles.cardInfoText, { color: '#8B5CF6' }]} numberOfLines={1}>
                {item.dono_nome}
              </Text>
            </View>
          )}

          {item.DESCRICAO && (
            <Text style={styles.cardDescricao} numberOfLines={2}>{item.DESCRICAO}</Text>
          )}
        </View>
      </TouchableOpacity>
    )
  }, [viewMode, navigation])

  const compromissosFiltrados = viewMode === 'calendar' ? compromissosDoDia : compromissosFuturos

  const dataSelecionadaFormatada = (() => {
    const [ano, mes, dia] = selectedDate.split('-')
    return `${dia}/${mes}/${ano}`
  })()

  if (carregando) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Carregando agenda...</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>
            Agend<Text style={styles.headerAccent}>AI</Text>
          </Text>
          <Text style={styles.headerSub}>Seus compromissos</Text>
        </View>
      </View>

      {/* Toggle View */}
      <View style={styles.toggleContainer}>
        <TouchableOpacity
          style={[styles.toggleBtn, viewMode === 'calendar' && styles.toggleActive]}
          onPress={() => setViewMode('calendar')}
        >
          <Text style={[styles.toggleText, viewMode === 'calendar' && styles.toggleTextActive]}>
            📅 Calendário
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleBtn, viewMode === 'list' && styles.toggleActive]}
          onPress={() => setViewMode('list')}
        >
          <Text style={[styles.toggleText, viewMode === 'list' && styles.toggleTextActive]}>
            📋 Lista
          </Text>
        </TouchableOpacity>
      </View>

      {/* Calendário */}
      {viewMode === 'calendar' && (
        <Calendar
          markingType="multi-dot"
          markedDates={markedDates}
          onDayPress={onDayPress}
          theme={{
            backgroundColor: '#FFFFFF',
            calendarBackground: '#FFFFFF',
            textSectionTitleColor: '#6B7280',
            selectedDayBackgroundColor: '#2563EB',
            selectedDayTextColor: '#FFFFFF',
            todayTextColor: '#2563EB',
            dayTextColor: '#111827',
            textDisabledColor: '#D1D5DB',
            arrowColor: '#2563EB',
            monthTextColor: '#111827',
            textMonthFontWeight: 'bold',
            textDayFontSize: 14,
            textMonthFontSize: 16,
            textDayHeaderFontSize: 13,
          }}
          style={styles.calendar}
        />
      )}

      {/* Subtítulo do dia (modo calendário) */}
      {viewMode === 'calendar' && (
        <View style={styles.dayHeader}>
          <Text style={styles.dayHeaderText}>
            {selectedDate === new Date().toISOString().split('T')[0]
              ? 'Hoje'
              : dataSelecionadaFormatada}
          </Text>
          <Text style={styles.dayHeaderCount}>
            {compromissosFiltrados.length} compromisso{compromissosFiltrados.length !== 1 ? 's' : ''}
          </Text>
        </View>
      )}

      {/* Lista de compromissos */}
      {compromissosFiltrados.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>
            {viewMode === 'calendar' ? '📭' : '📅'}
          </Text>
          <Text style={styles.emptyText}>
            {viewMode === 'calendar'
              ? 'Nenhum compromisso neste dia'
              : 'Nenhum compromisso futuro'}
          </Text>
          <Text style={styles.emptySubtext}>Toque no + para criar um novo</Text>
        </View>
      ) : (
        <FlatList
          data={compromissosFiltrados}
          keyExtractor={keyExtractorCompromisso}
          renderItem={renderCompromisso}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563EB']} />
          }
          initialNumToRender={6}
          maxToRenderPerBatch={6}
          windowSize={5}
          removeClippedSubviews={true}
        />
      )}

      {/* FAB */}
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
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F3F4F6' },
  loadingText: { marginTop: 12, color: '#6B7280', fontSize: 14 },

  // Header
  header: {
    backgroundColor: '#2563EB',
    paddingTop: 52,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  headerTitle: { fontSize: 26, fontWeight: 'bold', color: '#FFFFFF' },
  headerAccent: { color: '#93C5FD' },
  headerSub: { fontSize: 13, color: '#BFDBFE', marginTop: 2 },

  // Toggle
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    margin: 12,
    marginBottom: 0,
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  toggleActive: { backgroundColor: '#2563EB' },
  toggleText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  toggleTextActive: { color: '#FFFFFF' },

  // Calendar
  calendar: {
    marginHorizontal: 12,
    marginTop: 8,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },

  // Day header
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  dayHeaderText: { fontSize: 16, fontWeight: '700', color: '#111827' },
  dayHeaderCount: { fontSize: 13, color: '#6B7280' },

  // List
  list: { paddingHorizontal: 12, paddingTop: 12, paddingBottom: 100 },

  // Card
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 10,
    flexDirection: 'row',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardCompartilhado: {
    backgroundColor: '#FAF5FF',
  },
  cardBar: { width: 4 },
  cardBody: { flex: 1, padding: 14 },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardTitulo: { fontSize: 15, fontWeight: '600', color: '#111827', flex: 1, marginRight: 8 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusText: { fontSize: 11, fontWeight: '600' },
  cardInfo: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  cardIcon: { fontSize: 12, marginRight: 6 },
  cardInfoText: { fontSize: 13, color: '#4B5563' },
  cardDescricao: { fontSize: 12, color: '#9CA3AF', marginTop: 6, lineHeight: 18 },

  // Empty
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 6 },
  emptySubtext: { fontSize: 13, color: '#9CA3AF' },

  // FAB
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
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
  fabText: { color: '#FFFFFF', fontSize: 28, fontWeight: '300', marginTop: -2 },
})
