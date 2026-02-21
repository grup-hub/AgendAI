import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Switch,
} from 'react-native'
import { criarCompromisso } from '../lib/api'

type RecorrenciaTipo = 'DIARIA' | 'SEMANAL' | 'MENSAL' | 'PERSONALIZADA'

const OPCOES_LEMBRETE = [
  { label: 'Sem lembrete', value: 0 },
  { label: '15 min antes', value: 15 },
  { label: '30 min antes', value: 30 },
  { label: '1 hora antes', value: 60 },
  { label: '1 dia antes', value: 1440 },
]

const DIAS_SEMANA = [
  { label: 'D', nome: 'Dom', value: 0 },
  { label: 'S', nome: 'Seg', value: 1 },
  { label: 'T', nome: 'Ter', value: 2 },
  { label: 'Q', nome: 'Qua', value: 3 },
  { label: 'Q', nome: 'Qui', value: 4 },
  { label: 'S', nome: 'Sex', value: 5 },
  { label: 'S', nome: 'Sáb', value: 6 },
]

export default function NovoCompromissoScreen({ navigation, route }: any) {
  const dataParam = route?.params?.dataInicio
  const dataInicialFormatada = dataParam
    ? (() => {
        const [ano, mes, dia] = dataParam.split('-')
        return `${dia}/${mes}/${ano}`
      })()
    : ''

  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [dataInicio, setDataInicio] = useState(dataInicialFormatada)
  const [horaInicio, setHoraInicio] = useState('')
  const [horaFim, setHoraFim] = useState('')
  const [local, setLocal] = useState('')
  const [urgente, setUrgente] = useState(false)
  const [carregando, setCarregando] = useState(false)

  // Lembrete
  const [lembrete, setLembrete] = useState(30)

  // Recorrência
  const [recorrenciaAtiva, setRecorrenciaAtiva] = useState(false)
  const [recorrenciaTipo, setRecorrenciaTipo] = useState<RecorrenciaTipo>('SEMANAL')
  const [recorrenciaDiasSemana, setRecorrenciaDiasSemana] = useState<number[]>([])
  const [recorrenciaIntervalo, setRecorrenciaIntervalo] = useState('15')
  const [recorrenciaFim, setRecorrenciaFim] = useState('')

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

    const anoNum = parseInt(ano)
    const mesNum = parseInt(mes) - 1
    const diaNum = parseInt(dia)
    const horaNum = parseInt(h)
    const minNum = parseInt(m)

    if (isNaN(anoNum) || isNaN(mesNum) || isNaN(diaNum) || isNaN(horaNum) || isNaN(minNum)) {
      return null
    }

    const date = new Date(anoNum, mesNum, diaNum, horaNum, minNum)
    return date.toISOString()
  }

  function parseDataSemHora(data: string): string | null {
    const partes = data.split('/')
    if (partes.length !== 3) return null
    const [dia, mes, ano] = partes
    const anoNum = parseInt(ano)
    const mesNum = parseInt(mes) - 1
    const diaNum = parseInt(dia)
    if (isNaN(anoNum) || isNaN(mesNum) || isNaN(diaNum)) return null
    return new Date(anoNum, mesNum, diaNum).toISOString().split('T')[0]
  }

  function toggleDiaSemana(dia: number) {
    setRecorrenciaDiasSemana(prev =>
      prev.includes(dia) ? prev.filter(d => d !== dia) : [...prev, dia]
    )
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
      Alert.alert('Erro', 'Data ou hora inválida. Use DD/MM/AAAA e HH:MM')
      return
    }

    if (recorrenciaAtiva && recorrenciaTipo === 'SEMANAL' && recorrenciaDiasSemana.length === 0) {
      Alert.alert('Erro', 'Selecione pelo menos um dia da semana para a recorrência')
      return
    }

    let dataFimISO = dataInicioISO
    if (horaFim) {
      const parsed = parseDataHora(dataInicio, horaFim)
      if (parsed) dataFimISO = parsed
    }

    let recorrenciaFimISO: string | null = null
    if (recorrenciaAtiva && recorrenciaFim) {
      recorrenciaFimISO = parseDataSemHora(recorrenciaFim)
    }

    setCarregando(true)
    try {
      await criarCompromisso({
        TITULO: titulo.trim(),
        DESCRICAO: descricao.trim() || null,
        LOCAL: local.trim() || null,
        DATA_INICIO: dataInicioISO,
        DATA_FIM: dataFimISO,
        ORIGEM: 'APP_MOBILE',
        URGENTE: urgente,
        ANTECEDENCIA_LEMBRETE_MINUTOS: lembrete,
        ...(recorrenciaAtiva ? {
          RECORRENCIA_TIPO: recorrenciaTipo,
          RECORRENCIA_INTERVALO: recorrenciaTipo === 'PERSONALIZADA' ? parseInt(recorrenciaIntervalo) || 15 : null,
          RECORRENCIA_DIAS_SEMANA: recorrenciaTipo === 'SEMANAL' ? recorrenciaDiasSemana : null,
          RECORRENCIA_FIM: recorrenciaFimISO,
        } : {
          RECORRENCIA_TIPO: null,
          RECORRENCIA_INTERVALO: null,
          RECORRENCIA_DIAS_SEMANA: null,
          RECORRENCIA_FIM: null,
        }),
      })

      Alert.alert('Sucesso', 'Compromisso criado!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ])
    } catch (err: any) {
      Alert.alert('Erro', err.message || 'Erro ao criar compromisso')
    } finally {
      setCarregando(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.form}>
          <Text style={styles.label}>Título *</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: Reunião de equipe"
            value={titulo}
            onChangeText={setTitulo}
          />

          <Text style={styles.label}>Descrição</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Detalhes do compromisso"
            value={descricao}
            onChangeText={setDescricao}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />

          <View style={styles.row}>
            <View style={styles.col}>
              <Text style={styles.label}>Data *</Text>
              <TextInput
                style={styles.input}
                placeholder="DD/MM/AAAA"
                value={dataInicio}
                onChangeText={(t) => setDataInicio(formatarDataInput(t))}
                keyboardType="numeric"
                maxLength={10}
              />
            </View>
            <View style={styles.col}>
              <Text style={styles.label}>Urgente</Text>
              <TouchableOpacity
                style={[styles.urgenteToggle, urgente && styles.urgenteToggleAtivo]}
                onPress={() => setUrgente(!urgente)}
                activeOpacity={0.7}
              >
                <Text style={styles.urgenteToggleIcon}>{urgente ? '🔴' : '⚪'}</Text>
                <Text style={[styles.urgenteToggleText, urgente && styles.urgenteToggleTextAtivo]}>
                  {urgente ? 'Sim' : 'Não'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.col}>
              <Text style={styles.label}>Hora Início *</Text>
              <TextInput
                style={styles.input}
                placeholder="HH:MM"
                value={horaInicio}
                onChangeText={(t) => setHoraInicio(formatarHoraInput(t))}
                keyboardType="numeric"
                maxLength={5}
              />
            </View>
            <View style={styles.col}>
              <Text style={styles.label}>Hora Fim</Text>
              <TextInput
                style={styles.input}
                placeholder="HH:MM"
                value={horaFim}
                onChangeText={(t) => setHoraFim(formatarHoraInput(t))}
                keyboardType="numeric"
                maxLength={5}
              />
            </View>
          </View>

          <Text style={styles.label}>Local</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: Sala 3, Rua Exemplo 123"
            value={local}
            onChangeText={setLocal}
          />

          {/* ====== LEMBRETE ====== */}
          <Text style={styles.sectionTitle}>🔔 Lembrete</Text>
          <View style={styles.lembreteGrid}>
            {OPCOES_LEMBRETE.map((op) => (
              <TouchableOpacity
                key={op.value}
                style={[styles.lembreteBtn, lembrete === op.value && styles.lembreteBtnAtivo]}
                onPress={() => setLembrete(op.value)}
                activeOpacity={0.7}
              >
                <Text style={[styles.lembreteBtnText, lembrete === op.value && styles.lembreteBtnTextAtivo]}>
                  {op.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ====== RECORRÊNCIA ====== */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>🔁 Repetir</Text>
            <Switch
              value={recorrenciaAtiva}
              onValueChange={setRecorrenciaAtiva}
              trackColor={{ false: '#D1D5DB', true: '#BFDBFE' }}
              thumbColor={recorrenciaAtiva ? '#2563EB' : '#9CA3AF'}
            />
          </View>

          {recorrenciaAtiva && (
            <View style={styles.recorrenciaBox}>
              {/* Tipo de recorrência */}
              <Text style={styles.subLabel}>Frequência</Text>
              <View style={styles.tipoGrid}>
                {(['DIARIA', 'SEMANAL', 'MENSAL', 'PERSONALIZADA'] as RecorrenciaTipo[]).map((tipo) => (
                  <TouchableOpacity
                    key={tipo}
                    style={[styles.tipoBtn, recorrenciaTipo === tipo && styles.tipoBtnAtivo]}
                    onPress={() => setRecorrenciaTipo(tipo)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.tipoBtnText, recorrenciaTipo === tipo && styles.tipoBtnTextAtivo]}>
                      {tipo === 'DIARIA' ? 'Diária' : tipo === 'SEMANAL' ? 'Semanal' : tipo === 'MENSAL' ? 'Mensal' : 'A cada X dias'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Dias da semana */}
              {recorrenciaTipo === 'SEMANAL' && (
                <>
                  <Text style={styles.subLabel}>Dias da semana</Text>
                  <View style={styles.diasGrid}>
                    {DIAS_SEMANA.map((dia) => (
                      <TouchableOpacity
                        key={dia.value}
                        style={[styles.diaBtn, recorrenciaDiasSemana.includes(dia.value) && styles.diaBtnAtivo]}
                        onPress={() => toggleDiaSemana(dia.value)}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.diaBtnText, recorrenciaDiasSemana.includes(dia.value) && styles.diaBtnTextAtivo]}>
                          {dia.nome}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              {/* Intervalo personalizado */}
              {recorrenciaTipo === 'PERSONALIZADA' && (
                <>
                  <Text style={styles.subLabel}>Repetir a cada (dias)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ex: 15"
                    value={recorrenciaIntervalo}
                    onChangeText={setRecorrenciaIntervalo}
                    keyboardType="numeric"
                    maxLength={3}
                  />
                </>
              )}

              {/* Data de fim */}
              <Text style={styles.subLabel}>Repetir até (opcional)</Text>
              <TextInput
                style={styles.input}
                placeholder="DD/MM/AAAA"
                value={recorrenciaFim}
                onChangeText={(t) => setRecorrenciaFim(formatarDataInput(t))}
                keyboardType="numeric"
                maxLength={10}
              />
            </View>
          )}

          <TouchableOpacity
            style={[styles.button, carregando && styles.buttonDisabled]}
            onPress={handleSalvar}
            disabled={carregando}
          >
            <Text style={styles.buttonText}>
              {carregando ? 'Salvando...' : 'Salvar Compromisso'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.cancelText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scroll: {
    flexGrow: 1,
    padding: 16,
    paddingTop: 8,
  },
  form: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
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
  textArea: {
    minHeight: 80,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  col: {
    flex: 1,
  },
  urgenteToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    gap: 8,
  },
  urgenteToggleAtivo: {
    backgroundColor: '#FEF2F2',
    borderColor: '#EF4444',
  },
  urgenteToggleIcon: {
    fontSize: 16,
  },
  urgenteToggleText: {
    fontSize: 16,
    color: '#6B7280',
  },
  urgenteToggleTextAtivo: {
    color: '#DC2626',
    fontWeight: '600',
  },

  // Seção
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginTop: 8,
    marginBottom: 12,
  },
  subLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
  },

  // Lembrete
  lembreteGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  lembreteBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#F9FAFB',
  },
  lembreteBtnAtivo: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  lembreteBtnText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  lembreteBtnTextAtivo: {
    color: '#FFFFFF',
    fontWeight: '600',
  },

  // Recorrência
  recorrenciaBox: {
    backgroundColor: '#F0F7FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  tipoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  tipoBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
  },
  tipoBtnAtivo: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  tipoBtnText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  tipoBtnTextAtivo: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  diasGrid: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 16,
  },
  diaBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  diaBtnAtivo: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  diaBtnText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
  diaBtnTextAtivo: {
    color: '#FFFFFF',
  },

  // Botões
  button: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    alignItems: 'center',
    marginTop: 16,
    paddingVertical: 10,
  },
  cancelText: {
    color: '#6B7280',
    fontSize: 16,
  },
})
