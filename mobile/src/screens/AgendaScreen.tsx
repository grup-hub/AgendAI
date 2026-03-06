import React, { useCallback, useEffect, useState, useRef, useMemo } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  BackHandler,
} from 'react-native'
import { Calendar, LocaleConfig } from 'react-native-calendars'
import { useFocusEffect } from '@react-navigation/native'
import { listarCompromissos, arquivarCompromisso, atualizarCompromisso, deletarCompromisso, carregarConfiguracoes } from '../lib/api'
import { agendarLembretesCompromissos } from '../lib/notifications'
import ConfirmDialog from '../components/ConfirmDialog'
import MapaDialog from '../components/MapaDialog'
import * as Haptics from 'expo-haptics'

// Configurar calendário em português
LocaleConfig.locales['pt-br'] = {
  monthNames: ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'],
  monthNamesShort: ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'],
  dayNames: ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'],
  dayNamesShort: ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'],
  today: 'Hoje',
}
LocaleConfig.defaultLocale = 'pt-br'

const DIAS_SEMANA = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado']

interface Compromisso {
  ID_COMPROMISSO: string
  TITULO: string
  DESCRICAO: string | null
  DATA_INICIO: string
  DATA_FIM: string | null
  LOCAL: string | null
  STATUS: string
  ORIGEM: string
  URGENTE?: boolean
  IMPORTANCIA?: number | null
  ANTECEDENCIA_LEMBRETE_MINUTOS?: number
  ID_AGENDA: string
  compartilhado?: boolean
  dono_nome?: string
  agenda_nome?: string
  permissao?: string
  destinatarios?: { nome: string; email: string; status: string }[]
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
  const [primeiroNome, setPrimeiroNome] = useState('')
  const [calendarKey, setCalendarKey] = useState(0)
  const [visibleMonth, setVisibleMonth] = useState(() => new Date().toISOString().slice(0, 7))

  useEffect(() => {
    carregarConfiguracoes()
      .then((d) => {
        const nome: string = d.usuario?.NOME || ''
        setPrimeiroNome(nome.split(' ')[0])
      })
      .catch(() => {})
  }, [])

  // ===== Seleção múltipla =====
  const [modoSelecao, setModoSelecao] = useState(false)
  const [selecionados, setSelecionados] = useState<string[]>([])
  const [realizandoAcao, setRealizandoAcao] = useState(false)

  // Diálogos de confirmação em lote
  const [dialogCancelar, setDialogCancelar] = useState(false)
  const [dialogExcluir, setDialogExcluir] = useState(false)
  const [dialogArquivarAviso, setDialogArquivarAviso] = useState(false)
  const [dialogArquivar, setDialogArquivar] = useState(false)

  // Alerta genérico (sucesso/erro/info)
  type AlertCfg = { type?: 'success'|'error'|'info'|'warning'; title: string; message: string; onConfirm?: () => void }
  const [alertCfg, setAlertCfg] = useState<AlertCfg | null>(null)
  function showAlert(cfg: AlertCfg) { setAlertCfg(cfg) }

  // Arquivar item individual (via long-press / menu)
  const [dialogArquivarItem, setDialogArquivarItem] = useState(false)
  const [itemParaArquivar, setItemParaArquivar] = useState<Compromisso | null>(null)

  // Mapa
  const [mapaEndereco, setMapaEndereco] = useState<string | null>(null)
  function abrirMapa(endereco: string) { setMapaEndereco(endereco) }

  const carregarCompromissos = useCallback(async (forceLoading = false) => {
    if (forceLoading) setCarregando(true)
    try {
      const data = await listarCompromissos()
      const lista = data.compromissos || []
      setCompromissos(lista)
      lastFetch.current = Date.now()
      loaded.current = true
      agendarLembretesCompromissos(lista.map((c: Compromisso) => ({
        ID_COMPROMISSO: c.ID_COMPROMISSO,
        TITULO: c.TITULO,
        DATA_INICIO: c.DATA_INICIO,
        STATUS: c.STATUS,
        ANTECEDENCIA_LEMBRETE_MINUTOS: c.ANTECEDENCIA_LEMBRETE_MINUTOS,
      }))).catch(() => {})
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
      }
      carregarCompromissos()
    }, [carregarCompromissos])
  )

  // Botão voltar do Android
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (modoSelecao) {
          sairModoSelecao()
          return true
        }
        if (viewMode === 'list') {
          setViewMode('calendar')
          return true
        }
        return false
      }
      const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress)
      return () => sub.remove()
    }, [modoSelecao, viewMode])
  )

  const onRefresh = () => {
    setRefreshing(true)
    carregarCompromissos()
  }

  // ===== Funções de seleção múltipla =====
  function sairModoSelecao() {
    setModoSelecao(false)
    setSelecionados([])
  }

  function handleLongPress(item: Compromisso) {
    if (!modoSelecao) {
      setModoSelecao(true)
      setSelecionados([item.ID_COMPROMISSO])
    }
  }

  function toggleSelecao(id: string) {
    setSelecionados((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  function handleCancelarSelecionados() {
    if (selecionados.length === 0) return
    setDialogCancelar(true)
  }

  async function confirmarCancelarSelecionados() {
    setDialogCancelar(false)
    setRealizandoAcao(true)
    for (const id of selecionados) {
      try { await atualizarCompromisso({ ID_COMPROMISSO: id, STATUS: 'CANCELADO' }) } catch {}
    }
    setRealizandoAcao(false)
    sairModoSelecao()
    carregarCompromissos()
  }

  function handleExcluirSelecionados() {
    if (selecionados.length === 0) return
    setDialogExcluir(true)
  }

  async function confirmarExcluirSelecionados() {
    setDialogExcluir(false)
    setRealizandoAcao(true)
    for (const id of selecionados) {
      try { await deletarCompromisso(id) } catch {}
    }
    setRealizandoAcao(false)
    sairModoSelecao()
    carregarCompromissos()
  }

  function handleArquivarSelecionados() {
    if (selecionados.length === 0) return
    const naoCancelados = selecionados.filter((id) => {
      const comp = compromissos.find((c) => c.ID_COMPROMISSO === id)
      return comp && comp.STATUS !== 'CANCELADO'
    })
    if (naoCancelados.length > 0) {
      setDialogArquivarAviso(true)
      return
    }
    setDialogArquivar(true)
  }

  async function confirmarArquivarSelecionados() {
    setDialogArquivar(false)
    setRealizandoAcao(true)
    for (const id of selecionados) {
      try { await arquivarCompromisso(id) } catch {}
    }
    setRealizandoAcao(false)
    sairModoSelecao()
    carregarCompromissos()
  }

  // ===== Calendário =====
  const markedDates = useMemo(() => {
    const marks: Record<string, { marked: boolean; imps: Set<number>; hasShared: boolean; dotColors?: string[]; selected?: boolean; selectedColor?: string }> = {}
    compromissos.forEach((c) => {
      const dateKey = c.DATA_INICIO.split('T')[0]
      if (!marks[dateKey]) marks[dateKey] = { marked: true, imps: new Set<number>(), hasShared: false }
      const imp = c.IMPORTANCIA ?? (c.URGENTE ? 3 : null)
      if (imp !== null) marks[dateKey].imps.add(imp)
      // Dono de compromissos compartilhados com destinatários aceitos tb recebe ponto roxo
      const temDestinatariosAceitos = Array.isArray(c.destinatarios) && c.destinatarios.some((d) => d.status === 'ACEITO')
      if (c.compartilhado || temDestinatariosAceitos) marks[dateKey].hasShared = true
    })
    Object.keys(marks).forEach((dateKey) => {
      const { imps, hasShared } = marks[dateKey]
      const dotColors: string[] = []
      if (imps.has(3)) dotColors.push('#EF4444')   // vermelho urgente
      if (imps.has(2)) dotColors.push('#EAB308')   // âmbar alta
      if (imps.has(1)) dotColors.push('#2563EB')   // azul normal
      if (hasShared) dotColors.push('#8B5CF6')     // roxo compartilhado
      // Sem importância definida mas há compromisso → ponto azul padrão
      if (dotColors.length === 0) dotColors.push('#2563EB')
      marks[dateKey].dotColors = dotColors.slice(0, 4)
    })
    if (marks[selectedDate]) {
      marks[selectedDate] = { ...marks[selectedDate], selected: true, selectedColor: '#2563EB' }
    } else {
      marks[selectedDate] = { selected: true, selectedColor: '#2563EB', marked: false, imps: new Set(), hasShared: false }
    }
    return marks
  }, [compromissos, selectedDate])

  const compromissosDoDia = useMemo(() =>
    compromissos.filter((c) => c.DATA_INICIO.split('T')[0] === selectedDate),
    [compromissos, selectedDate]
  )

  const compromissosFuturos = useMemo(() => {
    return [...compromissos].sort(
      (a, b) => new Date(a.DATA_INICIO).getTime() - new Date(b.DATA_INICIO).getTime()
    )
  }, [compromissos])

  const compromissoDoMes = useMemo(() => {
    return [...compromissos]
      .filter(c => c.DATA_INICIO.startsWith(visibleMonth))
      .sort((a, b) => new Date(a.DATA_INICIO).getTime() - new Date(b.DATA_INICIO).getTime())
  }, [compromissos, visibleMonth])

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], [])
  const isCurrentMonth = visibleMonth === todayStr.slice(0, 7)

  function irParaHoje() {
    setSelectedDate(todayStr)
    setVisibleMonth(todayStr.slice(0, 7))
    setCalendarKey((k) => k + 1)
  }

  function prevMesLista() {
    setVisibleMonth(prev => {
      const [y, m] = prev.split('-').map(Number)
      if (m === 1) return `${y - 1}-12`
      return `${y}-${String(m - 1).padStart(2, '0')}`
    })
  }

  function nextMesLista() {
    setVisibleMonth(prev => {
      const [y, m] = prev.split('-').map(Number)
      if (m === 12) return `${y + 1}-01`
      return `${y}-${String(m + 1).padStart(2, '0')}`
    })
  }

  const onDayPress = useCallback((day: any) => setSelectedDate(day.dateString), [])

  const renderDay = useCallback(({ date, state, marking, onPress }: any) => {
    const isSelected = state === 'selected' || marking?.selected === true
    const isToday = state === 'today'
    const isDisabled = state === 'disabled'
    return (
      <TouchableOpacity
        onPress={() => onPress(date)}
        style={{ alignItems: 'center', paddingVertical: 2, minWidth: 32 }}
      >
        <View style={{
          width: 30, height: 30, borderRadius: 15,
          overflow: 'hidden',
          justifyContent: 'center', alignItems: 'center',
          backgroundColor: isSelected ? '#2563EB' : 'transparent',
        }}>
          <Text style={[
            { fontSize: 14, color: isDisabled ? '#D1D5DB' : '#111827', textAlign: 'center' },
            isSelected && { color: '#FFFFFF', fontWeight: '600' },
            isToday && !isSelected && { color: '#2563EB', fontWeight: '600' },
          ]}>
            {date.day}
          </Text>
        </View>
        {(() => {
          const dots = marking?.dotColors as string[] | undefined
          if (!dots?.length) return <View style={{ height: 10, marginTop: 1 }} />
          const rows: string[][] = []
          for (let i = 0; i < dots.length; i += 2) rows.push(dots.slice(i, i + 2))
          return (
            <View style={{ height: 10, marginTop: 1, alignItems: 'center', justifyContent: 'center', gap: 2 }}>
              {rows.map((row, ri) => (
                <View key={ri} style={{ flexDirection: 'row', gap: 2, justifyContent: 'center' }}>
                  {row.map((color, ci) => (
                    <View key={ci} style={{
                      width: 4, height: 4, borderRadius: 2,
                      backgroundColor: isSelected ? 'rgba(255,255,255,0.85)' : color,
                    }} />
                  ))}
                </View>
              ))}
            </View>
          )
        })()}
      </TouchableOpacity>
    )
  }, [])

  const keyExtractorCompromisso = useCallback((item: Compromisso) => item.ID_COMPROMISSO, [])

  function formatarData(dataISO: string) {
    const data = new Date(dataISO)
    const dia = data.getDate().toString().padStart(2, '0')
    const mes = (data.getMonth() + 1).toString().padStart(2, '0')
    const ano = data.getFullYear().toString().slice(-2)
    const hora = data.getHours().toString().padStart(2, '0')
    const min = data.getMinutes().toString().padStart(2, '0')
    return { data: `${dia}/${mes}/${ano}`, hora: `${hora}:${min}` }
  }

  function formatarHorario(dataISO: string, dataFimISO?: string | null) {
    const inicio = new Date(dataISO)
    const h1 = inicio.getHours().toString().padStart(2, '0')
    const m1 = inicio.getMinutes().toString().padStart(2, '0')
    if (dataFimISO) {
      const fim = new Date(dataFimISO)
      const h2 = fim.getHours().toString().padStart(2, '0')
      const m2 = fim.getMinutes().toString().padStart(2, '0')
      if (`${h1}:${m1}` !== `${h2}:${m2}`) return `${h1}:${m1} - ${h2}:${m2}`
    }
    return `${h1}:${m1}`
  }

  function getImportanciaColor(importancia?: number | null): string | null {
    switch (importancia) {
      case 3: return '#EF4444'
      case 2: return '#EAB308'
      case 1: return '#2563EB'
      default: return null
    }
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

  function handleArquivar(item: Compromisso) {
    setItemParaArquivar(item)
    setDialogArquivarItem(true)
  }

  async function confirmarArquivarItem() {
    if (!itemParaArquivar) return
    setDialogArquivarItem(false)
    try {
      await arquivarCompromisso(itemParaArquivar.ID_COMPROMISSO)
      setCompromissos((prev) => prev.filter((c) => c.ID_COMPROMISSO !== itemParaArquivar!.ID_COMPROMISSO))
      setItemParaArquivar(null)
    } catch (err: any) {
      setItemParaArquivar(null)
      showAlert({ type: 'error', title: 'Erro ao arquivar', message: err.message || 'Não foi possível arquivar o compromisso.' })
    }
  }

  function renderCompromisso({ item }: { item: Compromisso }) {
    const horario = formatarHorario(item.DATA_INICIO, item.DATA_FIM)
    const { data } = formatarData(item.DATA_INICIO)
    const diaSemana = DIAS_SEMANA[new Date(item.DATA_INICIO).getDay()]
    const vencido = new Date(item.DATA_INICIO) < new Date()
    const selecionado = selecionados.includes(item.ID_COMPROMISSO)

    const handlePress = () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      if (modoSelecao) {
        toggleSelecao(item.ID_COMPROMISSO)
      } else {
        navigation.navigate('DetalhesCompromisso', { compromisso: item })
      }
    }

    return (
      <TouchableOpacity
        style={[
          styles.card,
          vencido && !selecionado && styles.cardVencido,
          item.compartilhado && styles.cardCompartilhado,
          selecionado && styles.cardSelecionado,
        ]}
        activeOpacity={0.7}
        onPress={handlePress}
        onLongPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); handleLongPress(item) }}
        delayLongPress={400}
      >
        {/* Checkbox (modo seleção) */}
        {modoSelecao && (
          <View style={styles.checkboxContainer}>
            <View style={[styles.checkbox, selecionado && styles.checkboxChecked]}>
              {selecionado && <Text style={styles.checkboxTick}>✓</Text>}
            </View>
          </View>
        )}

        <View style={[styles.cardBar, { backgroundColor: vencido && !selecionado ? '#9CA3AF' : (getImportanciaColor(item.IMPORTANCIA) ?? (item.URGENTE ? '#EF4444' : getStatusColor(item.STATUS))) }]} />

        <View style={styles.cardBody}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitulo} numberOfLines={1}>{item.TITULO}</Text>
            <View style={{ alignItems: 'flex-end', gap: 4 }}>
              {/* Badge do dono — à direita, acima dos pills de status */}
              {item.compartilhado && item.dono_nome && (
                <View style={{ backgroundColor: '#EDE9FE', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 }}>
                  <Text style={{ fontSize: 11, color: '#7C3AED', fontWeight: '600' }}>
                    📤 Compartilhado por: {item.dono_nome.split(' ')[0]}
                  </Text>
                </View>
              )}
              {(item.STATUS !== 'ATIVO' || (item.compartilhado && !item.dono_nome)) && (
                <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
                  {item.STATUS !== 'ATIVO' && (
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.STATUS) + '20' }]}>
                      <Text style={[styles.statusText, { color: getStatusColor(item.STATUS) }]}>
                        {getStatusLabel(item.STATUS)}
                      </Text>
                    </View>
                  )}
                  {item.compartilhado && !item.dono_nome && (
                    <View style={[styles.statusBadge, { backgroundColor: '#EDE9FE' }]}>
                      <Text style={[styles.statusText, { color: '#7C3AED' }]}>Compartilhado</Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          </View>

          {/* Data · Dia da semana · Horário — mesma linha em ambos os modos */}
          <View style={[styles.cardInfo, { marginTop: 6 }]}>
            <Text style={styles.cardIcon}>📅</Text>
            <Text style={[styles.datePillText, { fontSize: 13 }]}>{data}</Text>
            <Text style={[styles.cardInfoText, { marginHorizontal: 6 }]}>·</Text>
            <Text style={[styles.cardDiaSemana, { marginRight: 8 }]}>{diaSemana}</Text>
            <Text style={styles.cardIcon}>🕐</Text>
            <Text style={styles.cardInfoText}>{horario}</Text>
          </View>

          {/* Endereço — só a palavra é clicável, não a linha inteira */}
          {item.LOCAL && (
            <View style={styles.cardInfo}>
              <Text style={styles.cardIcon}>📍</Text>
              <TouchableOpacity
                onPress={() => { if (!modoSelecao) abrirMapa(item.LOCAL!) }}
                activeOpacity={0.7}
              >
                <Text style={[styles.cardInfoText, styles.cardInfoLink]} numberOfLines={1}>{item.LOCAL}</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Compromisso meu compartilhado com outros — mostra destinatários */}
          {!item.compartilhado && item.destinatarios && item.destinatarios.length > 0 && (
            <View style={styles.cardInfo}>
              <Text style={styles.cardIcon}>📤</Text>
              <Text style={[styles.cardInfoText, { color: '#2563EB', fontSize: 12 }]}>
                {'Compartilhado com: ' + item.destinatarios.map((d) => d.nome.split(' ')[0]).join(', ')}
              </Text>
            </View>
          )}

          {item.DESCRICAO && (
            <Text style={styles.cardDescricao} numberOfLines={2}>{item.DESCRICAO}</Text>
          )}

          {vencido && !item.compartilhado && !modoSelecao && (
            <TouchableOpacity
              style={styles.arquivarBtn}
              onPress={(e) => { e.stopPropagation?.(); handleArquivar(item) }}
              activeOpacity={0.7}
            >
              <Text style={styles.arquivarBtnText}>📦 Arquivar</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    )
  }

  const compromissosFiltrados = viewMode === 'calendar' ? compromissosDoDia : compromissoDoMes

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
      {/* Header azul — fixo fora do FlatList */}
      <View style={styles.header}>
        {modoSelecao ? (
          /* Controles de seleção integrados no header (sem layout shift) */
          <>
            <View style={{ flex: 1 }}>
              <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); sairModoSelecao() }} style={styles.selecaoCloseBtn}>
                <Text style={styles.selecaoCloseText}>✕ Sair</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.selecaoTopText}>
              {selecionados.length === 0
                ? 'Toque para selecionar'
                : `${selecionados.length} selecionado(s)`}
            </Text>
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              <TouchableOpacity
                onPress={() => {
                  const todosIds = compromissosFiltrados.map((c) => c.ID_COMPROMISSO)
                  setSelecionados(todosIds.every((id) => selecionados.includes(id)) ? [] : todosIds)
                }}
              >
                <Text style={styles.selecaoSelectAll}>Todos</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          /* Conteúdo normal do header */
          <>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>
                Agend<Text style={styles.headerAccent}>AI</Text>
              </Text>
              <Text style={styles.headerSub}>Seus compromissos</Text>
            </View>
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end' }}>
              <TouchableOpacity onPress={onRefresh} disabled={refreshing} style={styles.refreshBtn}>
                {refreshing
                  ? <ActivityIndicator color="#FFFFFF" size="small" />
                  : <Text style={styles.refreshBtnText}>🔄</Text>
                }
              </TouchableOpacity>
            </View>
            {primeiroNome ? (
              <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <Text style={styles.headerGreetingSub}>Olá, seja bem-vindo</Text>
                <Text style={styles.headerGreetingNome}>{primeiroNome} 👋</Text>
              </View>
            ) : <View style={{ flex: 1 }} />}
          </>
        )}
      </View>

      {/* Toggle View (oculto no modo seleção) */}
      {!modoSelecao && (
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[styles.toggleBtn, viewMode === 'calendar' && styles.toggleActive]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setViewMode('calendar') }}
          >
            <Text style={[styles.toggleText, viewMode === 'calendar' && styles.toggleTextActive]}>
              📅 Calendário
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, viewMode === 'list' && styles.toggleActive]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setViewMode('list') }}
          >
            <Text style={[styles.toggleText, viewMode === 'list' && styles.toggleTextActive]}>
              📋 Lista
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Calendário — fixo fora do FlatList */}
      {viewMode === 'calendar' && !modoSelecao && (
        <Calendar
          key={calendarKey}
          markedDates={markedDates}
          onDayPress={onDayPress}
          onMonthChange={(month: any) => {
            const monthStr = month.dateString.slice(0, 7)
            setVisibleMonth(monthStr)
            if (monthStr === todayStr.slice(0, 7)) {
              setSelectedDate(todayStr)
            } else {
              setSelectedDate(`${monthStr}-01`)
            }
          }}
          renderHeader={(date: any) => {
            const monthIndex = date ? date.getMonth() : new Date().getMonth()
            const year = date ? date.getFullYear() : new Date().getFullYear()
            const monthName = LocaleConfig.locales['pt-br'].monthNames[monthIndex]
            return (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#111827' }}>
                  {monthName} {year}
                </Text>
                {!isCurrentMonth && (
                  <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); irParaHoje() }} style={styles.hojeBtn}>
                    <Text style={styles.hojeBtnText}>↩ Hoje</Text>
                  </TouchableOpacity>
                )}
              </View>
            )
          }}
          dayComponent={renderDay}
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

      {/* Subtítulo do dia */}
      {viewMode === 'calendar' && !modoSelecao && (
        <View style={styles.dayHeader}>
          <Text style={styles.dayHeaderText}>
            {selectedDate === todayStr ? 'Hoje' : dataSelecionadaFormatada}
          </Text>
          <Text style={styles.dayHeaderCount}>
            {compromissosFiltrados.length} compromisso{compromissosFiltrados.length !== 1 ? 's' : ''}
          </Text>
        </View>
      )}

      {/* Navegação de mês + dica (modo lista) */}
      {viewMode === 'list' && !modoSelecao && (
        <>
          <View style={styles.listMonthNav}>
            <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); prevMesLista() }} style={styles.listMonthArrow}>
              <Text style={styles.listMonthArrowText}>‹</Text>
            </TouchableOpacity>
            <View style={{ alignItems: 'center' }}>
              <Text style={styles.listMonthLabel}>
                {LocaleConfig.locales['pt-br'].monthNames[Number(visibleMonth.split('-')[1]) - 1]} {visibleMonth.split('-')[0]}
              </Text>
              <Text style={styles.listMonthCount}>
                {compromissoDoMes.length} compromisso{compromissoDoMes.length !== 1 ? 's' : ''}
              </Text>
            </View>
            <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); nextMesLista() }} style={styles.listMonthArrow}>
              <Text style={styles.listMonthArrowText}>›</Text>
            </TouchableOpacity>
          </View>
          {compromissoDoMes.length > 0 && (
            <Text style={styles.dicaSelecao}>Segure um compromisso para selecionar</Text>
          )}
        </>
      )}

      {/* Lista de compromissos */}
      <FlatList
        data={compromissosFiltrados}
        keyExtractor={keyExtractorCompromisso}
        renderItem={renderCompromisso}
        extraData={`${modoSelecao}-${selecionados.join(',')}`}
        contentContainerStyle={[
          styles.list,
          modoSelecao && { paddingBottom: 120 },
          compromissosFiltrados.length === 0 && styles.listEmpty,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#2563EB']}
            enabled={!modoSelecao}
          />
        }
        ListEmptyComponent={
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
        }
        initialNumToRender={6}
        maxToRenderPerBatch={6}
        windowSize={5}
        removeClippedSubviews={!modoSelecao}
      />

      {/* FAB (oculto no modo seleção) */}
      {!modoSelecao && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); navigation.navigate('NovoCompromisso', { dataInicio: selectedDate }) }}
          activeOpacity={0.8}
        >
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      )}

      {/* Barra de ações de seleção */}
      {modoSelecao && (
        <View style={styles.selecaoActionBar}>
          {realizandoAcao ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <TouchableOpacity
                style={[styles.selecaoBtn, styles.selecaoBtnCancelar, selecionados.length === 0 && styles.selecaoBtnDisabled]}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); handleCancelarSelecionados() }}
                disabled={selecionados.length === 0}
              >
                <Text style={styles.selecaoBtnText}>⏸ Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.selecaoBtn, styles.selecaoBtnArquivar, selecionados.length === 0 && styles.selecaoBtnDisabled]}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); handleArquivarSelecionados() }}
                disabled={selecionados.length === 0}
              >
                <Text style={styles.selecaoBtnText}>📦 Arquivar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.selecaoBtn, styles.selecaoBtnExcluir, selecionados.length === 0 && styles.selecaoBtnDisabled]}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); handleExcluirSelecionados() }}
                disabled={selecionados.length === 0}
              >
                <Text style={styles.selecaoBtnText}>🗑️ Excluir</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}

      {/* Diálogos de confirmação em lote */}
      <ConfirmDialog
        visible={dialogCancelar}
        title="Cancelar compromissos"
        message={`Cancelar ${selecionados.length} compromisso(s) selecionado(s)?`}
        confirmLabel="Cancelar"
        destructive
        onConfirm={confirmarCancelarSelecionados}
        onCancel={() => setDialogCancelar(false)}
      />
      <ConfirmDialog
        visible={dialogExcluir}
        title="Excluir compromissos"
        message={`Excluir permanentemente ${selecionados.length} compromisso(s)?`}
        confirmLabel="Excluir"
        destructive
        onConfirm={confirmarExcluirSelecionados}
        onCancel={() => setDialogExcluir(false)}
      />
      <ConfirmDialog
        visible={dialogArquivarAviso}
        title="Não é possível arquivar"
        message="Alguns compromissos selecionados não estão cancelados.\n\nPara arquivar, cancele-os primeiro."
        confirmLabel="Entendido"
        cancelLabel=""
        onConfirm={() => setDialogArquivarAviso(false)}
        onCancel={() => setDialogArquivarAviso(false)}
      />
      <ConfirmDialog
        visible={dialogArquivar}
        title="Arquivar compromissos"
        message={`Arquivar ${selecionados.length} compromisso(s) selecionado(s)?`}
        confirmLabel="Arquivar"
        destructive
        onConfirm={confirmarArquivarSelecionados}
        onCancel={() => setDialogArquivar(false)}
      />
      <ConfirmDialog
        visible={dialogArquivarItem}
        title="Arquivar compromisso"
        message={`Deseja arquivar "${itemParaArquivar?.TITULO}"? Ele será removido da agenda e poderá ser excluído em Configurações > Arquivados.`}
        confirmLabel="Arquivar"
        cancelLabel="Não"
        destructive
        onConfirm={confirmarArquivarItem}
        onCancel={() => { setDialogArquivarItem(false); setItemParaArquivar(null) }}
      />
      <ConfirmDialog
        visible={!!alertCfg}
        type={alertCfg?.type}
        title={alertCfg?.title || ''}
        message={alertCfg?.message || ''}
        onConfirm={() => { const fn = alertCfg?.onConfirm; setAlertCfg(null); fn?.() }}
        onCancel={() => setAlertCfg(null)}
      />
      <MapaDialog
        visible={!!mapaEndereco}
        endereco={mapaEndereco || ''}
        onClose={() => setMapaEndereco(null)}
      />
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
  headerGreetingSub: { fontSize: 12, color: '#BFDBFE' },
  headerGreetingNome: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  refreshBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  refreshBtnText: { fontSize: 20 },

  // Controles de seleção (integrados no header)
  selecaoCloseBtn: { paddingVertical: 5, paddingHorizontal: 8, backgroundColor: '#EF4444', borderRadius: 6, alignSelf: 'flex-start' },
  selecaoCloseText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  selecaoTopText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600', textAlign: 'center' },
  selecaoSelectAll: { color: '#BFDBFE', fontSize: 16, fontWeight: '700' },

  // Navegação de mês na aba lista
  listMonthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 12,
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  listMonthArrow: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  listMonthArrowText: { fontSize: 20, color: '#2563EB', fontWeight: '700' },
  listMonthLabel: { fontSize: 16, fontWeight: '700', color: '#111827' },
  listMonthCount: { fontSize: 12, color: '#6B7280', marginTop: 1 },

  // Dica segure para selecionar
  dicaSelecao: { fontSize: 11, color: '#9CA3AF', textAlign: 'center', paddingVertical: 4 },

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
  toggleBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
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
  hojeBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  hojeBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },

  // List
  list: { paddingHorizontal: 12, paddingTop: 12, paddingBottom: 100 },
  listEmpty: { flexGrow: 1 },

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
    borderWidth: 2,
    borderColor: 'transparent',
  },
  cardCompartilhado: { backgroundColor: '#FAF5FF' },
  cardSelecionado: { backgroundColor: '#EFF6FF', borderColor: '#2563EB' },
  cardVencido: { opacity: 0.55 },
  cardBar: { width: 4 },
  cardBody: { flex: 1, padding: 14 },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  cardTitulo: { fontSize: 15, fontWeight: '600', color: '#111827', flex: 1, marginRight: 8 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusText: { fontSize: 11, fontWeight: '600' },
  datePill: {
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  datePillText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2563EB',
  },
  cardInfo: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  cardIcon: { fontSize: 12, marginRight: 6 },
  cardInfoText: { fontSize: 13, color: '#4B5563' },
  cardDiaSemana: { fontSize: 14, fontWeight: '700', color: '#111827' },
  cardInfoLink: { color: '#2563EB', textDecorationLine: 'underline' },
  cardDescricao: { fontSize: 12, color: '#9CA3AF', marginTop: 6, lineHeight: 18 },

  // Checkbox (modo seleção)
  checkboxContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 14,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#9CA3AF',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkboxChecked: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  checkboxTick: { color: '#FFFFFF', fontSize: 13, fontWeight: 'bold' },

  // Arquivar
  arquivarBtn: {
    marginTop: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  arquivarBtnText: { fontSize: 12, color: '#6B7280', fontWeight: '500' },

  // Barra de ações de seleção (rodapé)
  selecaoActionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#1E3A8A',
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 14,
    paddingBottom: 28,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 10,
  },
  selecaoBtn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  selecaoBtnCancelar: { backgroundColor: '#F59E0B' },
  selecaoBtnArquivar: { backgroundColor: '#6B7280' },
  selecaoBtnExcluir: { backgroundColor: '#EF4444' },
  selecaoBtnDisabled: { opacity: 0.4 },
  selecaoBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },

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
