import React, { useEffect, useState } from 'react'
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
} from 'react-native'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export default function NovoCompromissoScreen({ navigation }: any) {
  const { user } = useAuth()
  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [dataInicio, setDataInicio] = useState('')
  const [horaInicio, setHoraInicio] = useState('')
  const [horaFim, setHoraFim] = useState('')
  const [local, setLocal] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [agendaId, setAgendaId] = useState<string | null>(null)

  useEffect(() => {
    async function buscarAgenda() {
      if (!user) return
      const { data } = await supabase
        .from('AGENDA')
        .select('ID_AGENDA')
        .eq('ID_USUARIO', user.id)
        .eq('ATIVA', true)
        .limit(1)
        .single()

      if (data) setAgendaId(data.ID_AGENDA)
    }
    buscarAgenda()
  }, [user])

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

  async function handleSalvar() {
    if (!titulo.trim()) {
      Alert.alert('Erro', 'O titulo e obrigatorio')
      return
    }
    if (!dataInicio || !horaInicio) {
      Alert.alert('Erro', 'Data e hora de inicio sao obrigatorios')
      return
    }
    if (!agendaId) {
      Alert.alert('Erro', 'Nenhuma agenda encontrada')
      return
    }

    const dataInicioISO = parseDataHora(dataInicio, horaInicio)
    if (!dataInicioISO) {
      Alert.alert('Erro', 'Data ou hora invalida. Use DD/MM/AAAA e HH:MM')
      return
    }

    let dataFimISO = null
    if (horaFim) {
      dataFimISO = parseDataHora(dataInicio, horaFim)
    }

    setCarregando(true)
    try {
      const { error } = await supabase.from('COMPROMISSO').insert({
        ID_AGENDA: agendaId,
        TITULO: titulo.trim(),
        DESCRICAO: descricao.trim() || null,
        DATA_INICIO: dataInicioISO,
        DATA_FIM: dataFimISO,
        LOCAL: local.trim() || null,
        STATUS: 'CONFIRMADO',
        ORIGEM: 'APP_MOBILE',
      })

      if (error) throw error

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
          <Text style={styles.label}>Titulo *</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: Reuniao de equipe"
            value={titulo}
            onChangeText={setTitulo}
          />

          <Text style={styles.label}>Descricao</Text>
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
              <Text style={styles.label}>Hora Inicio *</Text>
              <TextInput
                style={styles.input}
                placeholder="HH:MM"
                value={horaInicio}
                onChangeText={(t) => setHoraInicio(formatarHoraInput(t))}
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
                placeholder="HH:MM"
                value={horaFim}
                onChangeText={(t) => setHoraFim(formatarHoraInput(t))}
                keyboardType="numeric"
                maxLength={5}
              />
            </View>
            <View style={styles.col}>
              <Text style={styles.label}>Local</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: Sala 3"
                value={local}
                onChangeText={setLocal}
              />
            </View>
          </View>

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
