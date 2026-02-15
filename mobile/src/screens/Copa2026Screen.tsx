import React, { useState, useCallback, useRef } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { listarJogosCopa, importarJogosCopa } from '../lib/api'

type Jogo = {
  id: number
  grupo: string
  rodada: number
  home: string
  away: string
  homeBandeira: string
  awayBandeira: string
  date: string
  city: string
  stadium: string
  destaque: boolean
  importado: boolean
}

type FiltroGrupo = 'TODOS' | string

export default function Copa2026Screen() {
  const insets = useSafeAreaInsets()
  const [jogos, setJogos] = useState<Jogo[]>([])
  const [grupos, setGrupos] = useState<string[]>([])
  const [carregando, setCarregando] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [importando, setImportando] = useState(false)
  const [filtroGrupo, setFiltroGrupo] = useState<FiltroGrupo>('TODOS')
  const [totalImportados, setTotalImportados] = useState(0)
  const lastFetch = useRef<number>(0)

  const carregarJogos = async (forceLoading = false) => {
    if (forceLoading) setCarregando(true)
    try {
      const data = await listarJogosCopa()
      setJogos(data.jogos || [])
      setTotalImportados(data.totalImportados || 0)
      lastFetch.current = Date.now()
      // Extrair grupos únicos
      const gruposUnicos = Array.from(new Set((data.jogos || []).map((j: Jogo) => j.grupo))).sort() as string[]
      setGrupos(gruposUnicos)
    } catch (err) {
      console.error('Erro ao carregar jogos:', err)
    } finally {
      setCarregando(false)
      setRefreshing(false)
    }
  }

  useFocusEffect(
    useCallback(() => {
      const isFirstLoad = jogos.length === 0
      const isStale = Date.now() - lastFetch.current > 30000
      if (isFirstLoad) {
        setCarregando(true)
        carregarJogos()
      } else if (isStale) {
        carregarJogos() // background refresh
      }
    }, [])
  )

  const handleImportarTodos = () => {
    Alert.alert(
      '⚽ Importar Jogos',
      'Deseja importar TODOS os 72 jogos da fase de grupos para sua agenda?\n\nVocê poderá remover os que não quiser depois.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Importar Todos!',
          onPress: async () => {
            setImportando(true)
            try {
              const result = await importarJogosCopa('importar_todos')
              Alert.alert('✅ Sucesso!', result.message)
              // Atualizar estado local
              setJogos(prev => prev.map(j => ({ ...j, importado: true })))
              setTotalImportados(jogos.length)
            } catch (err: any) {
              Alert.alert('Erro', err.message)
            } finally {
              setImportando(false)
            }
          },
        },
      ]
    )
  }

  const handleRemoverTodos = () => {
    Alert.alert(
      '🗑️ Remover Jogos',
      'Deseja remover TODOS os jogos da Copa da sua agenda?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover Todos',
          style: 'destructive',
          onPress: async () => {
            setImportando(true)
            try {
              const result = await importarJogosCopa('remover_todos')
              Alert.alert('✅ Pronto!', result.message)
              // Atualizar estado local
              setJogos(prev => prev.map(j => ({ ...j, importado: false })))
              setTotalImportados(0)
            } catch (err: any) {
              Alert.alert('Erro', err.message)
            } finally {
              setImportando(false)
            }
          },
        },
      ]
    )
  }

  const handleToggleJogo = async (jogo: Jogo) => {
    // Optimistic update — atualiza visual instantaneamente
    const novoStatus = !jogo.importado
    setJogos(prev => prev.map(j => j.id === jogo.id ? { ...j, importado: novoStatus } : j))
    setTotalImportados(prev => novoStatus ? prev + 1 : prev - 1)

    try {
      if (jogo.importado) {
        await importarJogosCopa('remover_selecionados', [jogo.id])
      } else {
        await importarJogosCopa('importar_selecionados', [jogo.id])
      }
    } catch (err: any) {
      // Reverter se deu erro
      setJogos(prev => prev.map(j => j.id === jogo.id ? { ...j, importado: jogo.importado } : j))
      setTotalImportados(prev => novoStatus ? prev - 1 : prev + 1)
      Alert.alert('Erro', err.message)
    }
  }

  const jogosFiltrados = filtroGrupo === 'TODOS'
    ? jogos
    : jogos.filter(j => j.grupo === filtroGrupo)

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    // Converter UTC para horário de Brasília (UTC-3)
    const brasiliaOffset = -3 * 60
    const localDate = new Date(d.getTime() + brasiliaOffset * 60 * 1000)

    const dias = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
    const meses = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

    return {
      diaSemana: dias[localDate.getUTCDay()],
      dia: localDate.getUTCDate(),
      mes: meses[localDate.getUTCMonth()],
      hora: `${String(localDate.getUTCHours()).padStart(2, '0')}:${String(localDate.getUTCMinutes()).padStart(2, '0')}`,
    }
  }

  const renderHeader = () => (
    <View>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.headerEmoji}>⚽🏆</Text>
        <Text style={styles.headerTitle}>Copa do Mundo 2026</Text>
        <Text style={styles.headerSub}>EUA • México • Canadá</Text>
        <Text style={styles.headerInfo}>
          {totalImportados > 0
            ? `${totalImportados} jogos na sua agenda`
            : 'Nenhum jogo importado ainda'}
        </Text>
      </View>

      {/* Ações */}
      <View style={styles.actionsContainer}>
        {totalImportados === 0 ? (
          <TouchableOpacity
            style={styles.importBtn}
            onPress={handleImportarTodos}
            disabled={importando}
          >
            {importando ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Text style={styles.importBtnIcon}>📥</Text>
                <Text style={styles.importBtnText}>Importar Todos para Minha Agenda</Text>
              </>
            )}
          </TouchableOpacity>
        ) : (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnGreen]}
              onPress={handleImportarTodos}
              disabled={importando}
            >
              <Text style={styles.actionBtnText}>📥 Importar Faltantes</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnRed]}
              onPress={handleRemoverTodos}
              disabled={importando}
            >
              <Text style={styles.actionBtnText}>🗑️ Remover Todos</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Filtro de Grupos */}
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={['TODOS', ...grupos]}
        keyExtractor={(item) => item}
        contentContainerStyle={styles.filtroContainer}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.filtroChip,
              filtroGrupo === item && styles.filtroChipActive,
              item !== 'TODOS' && item === 'C' && styles.filtroChipBrasil,
            ]}
            onPress={() => setFiltroGrupo(item as FiltroGrupo)}
          >
            <Text
              style={[
                styles.filtroChipText,
                filtroGrupo === item && styles.filtroChipTextActive,
              ]}
            >
              {item === 'TODOS' ? '🌍 Todos' : `Grupo ${item}`}
              {item === 'C' ? ' 🇧🇷' : ''}
            </Text>
          </TouchableOpacity>
        )}
      />
    </View>
  )

  const renderJogo = ({ item }: { item: Jogo }) => {
    const { diaSemana, dia, mes, hora } = formatDate(item.date)
    const isBrasil = item.home === 'Brasil' || item.away === 'Brasil'

    return (
      <TouchableOpacity
        style={[
          styles.jogoCard,
          isBrasil && styles.jogoCardBrasil,
          item.importado && styles.jogoCardImportado,
        ]}
        onPress={() => handleToggleJogo(item)}
        disabled={importando}
        activeOpacity={0.7}
      >
        {/* Status de importação */}
        <View style={[styles.importStatus, item.importado ? styles.importStatusOn : styles.importStatusOff]}>
          <Text style={styles.importStatusText}>
            {item.importado ? '✅' : '➕'}
          </Text>
        </View>

        {/* Informação do jogo */}
        <View style={styles.jogoContent}>
          {/* Grupo + Rodada + Data */}
          <View style={styles.jogoMeta}>
            <Text style={styles.jogoGrupo}>Grupo {item.grupo} • R{item.rodada}</Text>
            <Text style={styles.jogoData}>
              {diaSemana}, {dia} {mes} • {hora}h
            </Text>
          </View>

          {/* Times */}
          <View style={styles.timesContainer}>
            <View style={styles.timeRow}>
              <Text style={styles.timeBandeira}>{item.homeBandeira}</Text>
              <Text style={[styles.timeNome, isBrasil && item.home === 'Brasil' && styles.timeNomeBrasil]}>
                {item.home}
              </Text>
            </View>
            <Text style={styles.vsText}>×</Text>
            <View style={styles.timeRow}>
              <Text style={styles.timeBandeira}>{item.awayBandeira}</Text>
              <Text style={[styles.timeNome, isBrasil && item.away === 'Brasil' && styles.timeNomeBrasil]}>
                {item.away}
              </Text>
            </View>
          </View>

          {/* Local */}
          <Text style={styles.jogoLocal}>📍 {item.stadium}, {item.city}</Text>
        </View>
      </TouchableOpacity>
    )
  }

  if (carregando) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Carregando jogos da Copa...</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={jogosFiltrados}
        keyExtractor={(item) => `${item.id}-${item.importado}`}
        extraData={totalImportados}
        renderItem={renderJogo}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); carregarJogos() }} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Nenhum jogo encontrado</Text>
          </View>
        }
      />

      {/* Overlay de loading */}
      {importando && (
        <View style={styles.overlay}>
          <View style={styles.overlayBox}>
            <ActivityIndicator size="large" color="#2563EB" />
            <Text style={styles.overlayText}>Processando...</Text>
          </View>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: '#6B7280',
  },
  listContent: {
    paddingBottom: 100,
  },

  // Header
  header: {
    backgroundColor: '#1E3A5F',
    paddingBottom: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  headerEmoji: {
    fontSize: 40,
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerSub: {
    fontSize: 14,
    color: '#93C5FD',
    marginTop: 4,
  },
  headerInfo: {
    fontSize: 13,
    color: '#FCD34D',
    marginTop: 8,
    fontWeight: '600',
  },

  // Ações
  actionsContainer: {
    paddingHorizontal: 12,
    paddingTop: 12,
  },
  importBtn: {
    backgroundColor: '#2563EB',
    paddingVertical: 14,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  importBtnIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  importBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  actionBtnGreen: {
    backgroundColor: '#059669',
  },
  actionBtnRed: {
    backgroundColor: '#DC2626',
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },

  // Filtro de grupos
  filtroContainer: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  filtroChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginRight: 6,
  },
  filtroChipActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  filtroChipBrasil: {
    borderColor: '#059669',
  },
  filtroChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
  },
  filtroChipTextActive: {
    color: '#FFFFFF',
  },

  // Card do jogo
  jogoCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 12,
    marginBottom: 8,
    borderRadius: 12,
    flexDirection: 'row',
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  jogoCardBrasil: {
    borderLeftWidth: 4,
    borderLeftColor: '#059669',
  },
  jogoCardImportado: {
    borderRightWidth: 3,
    borderRightColor: '#2563EB',
  },

  // Status de importação
  importStatus: {
    width: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  importStatusOn: {
    backgroundColor: '#ECFDF5',
  },
  importStatusOff: {
    backgroundColor: '#F9FAFB',
  },
  importStatusText: {
    fontSize: 20,
  },

  // Conteúdo do jogo
  jogoContent: {
    flex: 1,
    padding: 12,
  },
  jogoMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  jogoGrupo: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  jogoData: {
    fontSize: 12,
    color: '#2563EB',
    fontWeight: '600',
  },

  // Times
  timesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 8,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 6,
  },
  timeBandeira: {
    fontSize: 22,
  },
  timeNome: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    flexShrink: 1,
  },
  timeNomeBrasil: {
    color: '#059669',
    fontWeight: '800',
  },
  vsText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#9CA3AF',
  },

  // Local
  jogoLocal: {
    fontSize: 11,
    color: '#9CA3AF',
  },

  // Empty
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: '#9CA3AF',
  },

  // Overlay
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    elevation: 10,
  },
  overlayText: {
    marginTop: 12,
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
})
