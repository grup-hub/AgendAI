import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { atualizarCompromisso, deletarCompromisso } from '../lib/api'

interface Compromisso {
  ID_COMPROMISSO: string
  TITULO: string
  DESCRICAO: string | null
  DATA_INICIO: string
  DATA_FIM: string | null
  LOCAL: string | null
  STATUS: string
  ORIGEM: string
  compartilhado?: boolean
  dono_nome?: string
  agenda_nome?: string
  permissao?: string
}

export default function DetalhesCompromissoScreen({ route, navigation }: any) {
  const compromisso: Compromisso = route.params.compromisso
  const podeEditar = !compromisso.compartilhado || compromisso.permissao === 'EDITAR'

  const [editando, setEditando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [excluindo, setExcluindo] = useState(false)

  // Campos editáveis
  const [titulo, setTitulo] = useState(compromisso.TITULO)
  const [descricao, setDescricao] = useState(compromisso.DESCRICAO || '')
  const [local, setLocal] = useState(compromisso.LOCAL || '')
  const [dataInicio, setDataInicio] = useState(formatarDataParaInput(compromisso.DATA_INICIO))
  const [horaInicio, setHoraInicio] = useState(formatarHoraParaInput(compromisso.DATA_INICIO))
  const [horaFim, setHoraFim] = useState(
    compromisso.DATA_FIM ? formatarHoraParaInput(compromisso.DATA_FIM) : ''
  )

  function formatarDataParaInput(dataISO: string) {
    const d = new Date(dataISO)
    const dia = d.getDate().toString().padStart(2, '0')
    const mes = (d.getMonth() + 1).toString().padStart(2, '0')
    const ano = d.getFullYear()
    return `${dia}/${mes}/${ano}`
  }

  function formatarHoraParaInput(dataISO: string) {
    const d = new Date(dataISO)
    const h = d.getHours().toString().padStart(2, '0')
    const m = d.getMinutes().toString().padStart(2, '0')
    return `${h}:${m}`
  }

  function formatarDataCompleta(dataISO: string) {
    const d = new Date(dataISO)
    const dias = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
    const meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
    return `${dias[d.getDay()]}, ${d.getDate()} de ${meses[d.getMonth()]} de ${d.getFullYear()}`
  }

  function formatarHorarioCompleto(dataISO: string, dataFimISO?: string | null) {
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

  function formatarDataInput(text: string) {
    const nums = text.replace(/\D/g, '')
    if (nums.length <= 2) return nums
    if (nums.length <= 4) return `${nums.slice(0, 2)}/${nums.slice(2)}`
    return `${nums.slice(0, 2)}/${nums.slice(2, 4)}/${nums.slice(4, 8)}`
  }

  function formatarHoraInput(text: string) {
    const nums = text.replace(/\D/g, '')
    if (nums.length <= 2) return nums
    return `${nums.slice(0, 2)}:${nums.slice(2, 4)}`
  }

  function parseDataHora(data: string, hora: string): string | null {
    const partes = data.split('/')
    if (partes.length !== 3) return null
    const [dia, mes, ano] = partes
    const partesHora = hora.split(':')
    if (partesHora.length !== 2) return null
    const [h, m] = partesHora

    const date = new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia), parseInt(h), parseInt(m))
    if (isNaN(date.getTime())) return null
    return date.toISOString()
  }

  async function handleSalvar() {
    if (!titulo.trim()) {
      Alert.alert('Erro', 'O título é obrigatório')
      return
    }
    if (!dataInicio || !horaInicio) {
      Alert.alert('Erro', 'Data e hora de início são obrigatórios')
      return
    }

    const dataInicioISO = parseDataHora(dataInicio, horaInicio)
    if (!dataInicioISO) {
      Alert.alert('Erro', 'Data ou hora inválida')
      return
    }

    let dataFimISO = dataInicioISO
    if (horaFim) {
      const parsed = parseDataHora(dataInicio, horaFim)
      if (parsed) dataFimISO = parsed
    }

    setSalvando(true)
    try {
      await atualizarCompromisso({
        ID_COMPROMISSO: compromisso.ID_COMPROMISSO,
        TITULO: titulo.trim(),
        DESCRICAO: descricao.trim() || null,
        LOCAL: local.trim() || null,
        DATA_INICIO: dataInicioISO,
        DATA_FIM: dataFimISO,
      })
      Alert.alert('Sucesso', 'Compromisso atualizado!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ])
    } catch (err: any) {
      Alert.alert('Erro', err.message || 'Erro ao atualizar')
    } finally {
      setSalvando(false)
    }
  }

  async function handleExcluir() {
    Alert.alert(
      'Excluir compromisso',
      `Tem certeza que deseja excluir "${compromisso.TITULO}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            setExcluindo(true)
            try {
              await deletarCompromisso(compromisso.ID_COMPROMISSO)
              Alert.alert('Sucesso', 'Compromisso excluído!', [
                { text: 'OK', onPress: () => navigation.goBack() },
              ])
            } catch (err: any) {
              Alert.alert('Erro', err.message || 'Erro ao excluir')
              setExcluindo(false)
            }
          },
        },
      ]
    )
  }

  async function handleCancelar() {
    setSalvando(true)
    try {
      await atualizarCompromisso({
        ID_COMPROMISSO: compromisso.ID_COMPROMISSO,
        STATUS: 'CANCELADO',
      })
      Alert.alert('Sucesso', 'Compromisso cancelado!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ])
    } catch (err: any) {
      Alert.alert('Erro', err.message || 'Erro ao cancelar')
    } finally {
      setSalvando(false)
    }
  }

  // Modo visualização
  if (!editando) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        {/* Status badge */}
        <View style={styles.statusRow}>
          <View style={[styles.statusBadgeLarge, { backgroundColor: getStatusColor(compromisso.STATUS) + '15' }]}>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor(compromisso.STATUS) }]} />
            <Text style={[styles.statusLabelLarge, { color: getStatusColor(compromisso.STATUS) }]}>
              {getStatusLabel(compromisso.STATUS)}
            </Text>
          </View>
          {compromisso.ORIGEM && (
            <Text style={styles.origemText}>
              via {compromisso.ORIGEM === 'APP_MOBILE' ? 'App' : compromisso.ORIGEM === 'WHATSAPP' ? 'WhatsApp' : 'Web'}
            </Text>
          )}
        </View>

        {/* Título */}
        <Text style={styles.titulo}>{compromisso.TITULO}</Text>

        {/* Info cards */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>📅</Text>
            <View>
              <Text style={styles.infoLabel}>Data</Text>
              <Text style={styles.infoValue}>{formatarDataCompleta(compromisso.DATA_INICIO)}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>🕐</Text>
            <View>
              <Text style={styles.infoLabel}>Horário</Text>
              <Text style={styles.infoValue}>
                {formatarHorarioCompleto(compromisso.DATA_INICIO, compromisso.DATA_FIM)}
              </Text>
            </View>
          </View>

          {compromisso.LOCAL && (
            <>
              <View style={styles.divider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoIcon}>📍</Text>
                <View>
                  <Text style={styles.infoLabel}>Local</Text>
                  <Text style={styles.infoValue}>{compromisso.LOCAL}</Text>
                </View>
              </View>
            </>
          )}

          {compromisso.compartilhado && compromisso.dono_nome && (
            <>
              <View style={styles.divider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoIcon}>👤</Text>
                <View>
                  <Text style={styles.infoLabel}>Compartilhado por</Text>
                  <Text style={[styles.infoValue, { color: '#8B5CF6' }]}>{compromisso.dono_nome}</Text>
                </View>
              </View>
            </>
          )}
        </View>

        {/* Descrição */}
        {compromisso.DESCRICAO && (
          <View style={styles.descricaoCard}>
            <Text style={styles.descricaoLabel}>Descrição</Text>
            <Text style={styles.descricaoText}>{compromisso.DESCRICAO}</Text>
          </View>
        )}

        {/* Ações */}
        {podeEditar && compromisso.STATUS !== 'CANCELADO' && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.editBtn}
              onPress={() => setEditando(true)}
            >
              <Text style={styles.editBtnText}>Editar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={handleCancelar}
              disabled={salvando}
            >
              <Text style={styles.cancelBtnText}>
                {salvando ? 'Cancelando...' : 'Cancelar compromisso'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={handleExcluir}
              disabled={excluindo}
            >
              <Text style={styles.deleteBtnText}>
                {excluindo ? 'Excluindo...' : 'Excluir'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {podeEditar && compromisso.STATUS === 'CANCELADO' && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={handleExcluir}
              disabled={excluindo}
            >
              <Text style={styles.deleteBtnText}>
                {excluindo ? 'Excluindo...' : 'Excluir compromisso'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    )
  }

  // Modo edição
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Editar Compromisso</Text>

          <Text style={styles.label}>Título *</Text>
          <TextInput
            style={styles.input}
            value={titulo}
            onChangeText={setTitulo}
            placeholder="Título do compromisso"
          />

          <Text style={styles.label}>Descrição</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={descricao}
            onChangeText={setDescricao}
            placeholder="Detalhes do compromisso"
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />

          <View style={styles.row}>
            <View style={styles.col}>
              <Text style={styles.label}>Data *</Text>
              <TextInput
                style={styles.input}
                value={dataInicio}
                onChangeText={(t) => setDataInicio(formatarDataInput(t))}
                placeholder="DD/MM/AAAA"
                keyboardType="numeric"
                maxLength={10}
              />
            </View>
            <View style={styles.col}>
              <Text style={styles.label}>Hora Início *</Text>
              <TextInput
                style={styles.input}
                value={horaInicio}
                onChangeText={(t) => setHoraInicio(formatarHoraInput(t))}
                placeholder="HH:MM"
                keyboardType="numeric"
                maxLength={5}
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.col}>
              <Text style={styles.label}>Hora Fim</Text>
              <TextInput
                style={styles.input}
                value={horaFim}
                onChangeText={(t) => setHoraFim(formatarHoraInput(t))}
                placeholder="HH:MM"
                keyboardType="numeric"
                maxLength={5}
              />
            </View>
            <View style={styles.col}>
              <Text style={styles.label}>Local</Text>
              <TextInput
                style={styles.input}
                value={local}
                onChangeText={setLocal}
                placeholder="Ex: Sala 3"
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.saveBtn, salvando && styles.btnDisabled]}
            onPress={handleSalvar}
            disabled={salvando}
          >
            <Text style={styles.saveBtnText}>
              {salvando ? 'Salvando...' : 'Salvar alterações'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelEditBtn}
            onPress={() => {
              setEditando(false)
              setTitulo(compromisso.TITULO)
              setDescricao(compromisso.DESCRICAO || '')
              setLocal(compromisso.LOCAL || '')
              setDataInicio(formatarDataParaInput(compromisso.DATA_INICIO))
              setHoraInicio(formatarHoraParaInput(compromisso.DATA_INICIO))
              setHoraFim(compromisso.DATA_FIM ? formatarHoraParaInput(compromisso.DATA_FIM) : '')
            }}
          >
            <Text style={styles.cancelEditBtnText}>Cancelar edição</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  scrollContent: { padding: 16, paddingBottom: 40 },

  // Status
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  statusBadgeLarge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  statusLabelLarge: { fontSize: 14, fontWeight: '600' },
  origemText: { fontSize: 12, color: '#9CA3AF' },

  // Título
  titulo: { fontSize: 24, fontWeight: 'bold', color: '#111827', marginBottom: 16 },

  // Info card
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  infoIcon: { fontSize: 20, marginRight: 14 },
  infoLabel: { fontSize: 12, color: '#9CA3AF', marginBottom: 2 },
  infoValue: { fontSize: 15, color: '#111827', fontWeight: '500' },
  divider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 4 },

  // Descrição
  descricaoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  descricaoLabel: { fontSize: 12, color: '#9CA3AF', marginBottom: 8 },
  descricaoText: { fontSize: 15, color: '#374151', lineHeight: 22 },

  // Actions
  actions: { marginTop: 8, gap: 10 },
  editBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  editBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  cancelBtn: {
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelBtnText: { color: '#92400E', fontSize: 15, fontWeight: '500' },
  deleteBtn: {
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  deleteBtnText: { color: '#DC2626', fontSize: 15, fontWeight: '500' },

  // Form (modo edição)
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  formTitle: { fontSize: 20, fontWeight: 'bold', color: '#111827', marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 16,
    color: '#111827',
  },
  textArea: { minHeight: 80 },
  row: { flexDirection: 'row', gap: 12 },
  col: { flex: 1 },
  saveBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  saveBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  btnDisabled: { opacity: 0.6 },
  cancelEditBtn: { alignItems: 'center', marginTop: 16, paddingVertical: 10 },
  cancelEditBtnText: { color: '#6B7280', fontSize: 16 },
})
