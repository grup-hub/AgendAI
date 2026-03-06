import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Linking,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Switch,
} from 'react-native'
import { criarCompromisso } from '../lib/api'
import DateWheelPickerModal from '../components/DateWheelPickerModal'
import TimeWheelPickerModal from '../components/TimeWheelPickerModal'
import ConfirmDialog from '../components/ConfirmDialog'

type RecorrenciaTipo = 'SEMANAL' | 'MENSAL' | 'PERSONALIZADA'

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
  // Se veio com data pré-selecionada da tela de agenda (ex: "2026-02-21")
  const dataParam = route?.params?.dataInicio
  const dataInicial = dataParam
    ? (() => {
        const [ano, mes, dia] = dataParam.split('-')
        return { dia: parseInt(dia), mes: parseInt(mes) - 1, ano: parseInt(ano) }
      })()
    : (() => {
        const hoje = new Date()
        return { dia: hoje.getDate(), mes: hoje.getMonth(), ano: hoje.getFullYear() }
      })()

  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [local, setLocal] = useState('')
  const [importancia, setImportancia] = useState<0 | 1 | 2 | 3>(0) // 0=sem, 1=baixa, 2=média, 3=alta
  const [carregando, setCarregando] = useState(false)

  type AlertCfg = { type?: 'success'|'error'|'info'|'warning'; title: string; message: string; onConfirm?: () => void; cancelLabel?: string; confirmLabel?: string }
  const [alertCfg, setAlertCfg] = useState<AlertCfg | null>(null)
  function showAlert(cfg: AlertCfg) { setAlertCfg(cfg) }
  const [mapaEndereco, setMapaEndereco] = useState<string | null>(null)

  // Data via picker (substitui dataInicio string)
  const [pickerDia, setPickerDia] = useState(dataInicial.dia)
  const [pickerMes, setPickerMes] = useState(dataInicial.mes)  // 0–11
  const [pickerAno, setPickerAno] = useState(dataInicial.ano)

  // Hora início via picker (substitui horaInicio string)
  const [pickerHIh, setPickerHIh] = useState(8)
  const [pickerHIm, setPickerHIm] = useState(0)
  const [horaInicioDefinida, setHoraInicioDefinida] = useState(false)

  // Hora fim via picker (substitui horaFim string)
  const [pickerHFh, setPickerHFh] = useState<number | null>(null)
  const [pickerHFm, setPickerHFm] = useState<number | null>(null)

  // Visibilidade dos modais
  const [mostrarPickerData, setMostrarPickerData] = useState(false)
  const [mostrarPickerHoraInicio, setMostrarPickerHoraInicio] = useState(false)
  const [mostrarPickerHoraFim, setMostrarPickerHoraFim] = useState(false)

  // Lembrete
  const [lembrete, setLembrete] = useState(30)

  // Recorrência
  const [recorrenciaAtiva, setRecorrenciaAtiva] = useState(false)
  const [recorrenciaTipo, setRecorrenciaTipo] = useState<RecorrenciaTipo>('SEMANAL')
  const [recorrenciaDiasSemana, setRecorrenciaDiasSemana] = useState<number[]>([])
  const [recorrenciaIntervalo, setRecorrenciaIntervalo] = useState('15')

  // Helpers de parsing — INTOCADOS
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

  function abrirMapa(endereco: string) {
    setMapaEndereco(endereco)
  }

  function toggleDiaSemana(dia: number) {
    setRecorrenciaDiasSemana(prev =>
      prev.includes(dia) ? prev.filter(d => d !== dia) : [...prev, dia]
    )
  }

  // Helpers de display
  const dataStr = `${String(pickerDia).padStart(2, '0')}/${String(pickerMes + 1).padStart(2, '0')}/${pickerAno}`
  const horaIStr = `${String(pickerHIh).padStart(2, '0')}:${String(pickerHIm).padStart(2, '0')}`
  const horaFStr = pickerHFh !== null
    ? `${String(pickerHFh).padStart(2, '0')}:${String(pickerHFm ?? 0).padStart(2, '0')}`
    : null

  // Próximas datas para dicas de recorrência
  const fmt = (d: Date) =>
    `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`
  const proximasMensal = Array.from({length: 3}, (_, i) => {
    const d = new Date(pickerAno, pickerMes + i + 1, pickerDia)
    return fmt(d)
  }).join(' • ')
  const intervaloNum = parseInt(recorrenciaIntervalo) || 0
  const proximasPersonalizada = intervaloNum > 0 ? Array.from({length: 3}, (_, i) => {
    const d = new Date(pickerAno, pickerMes, pickerDia)
    d.setDate(d.getDate() + intervaloNum * (i + 1))
    return fmt(d)
  }).join(' • ') : ''

  async function handleSalvar() {
    if (!titulo.trim()) {
      showAlert({ type: 'error', title: 'Erro', message: 'O título é obrigatório' })
      return
    }
    if (!horaInicioDefinida) {
      showAlert({ type: 'error', title: 'Erro', message: 'Hora de início é obrigatória' })
      return
    }

    const dataInicioISO = parseDataHora(dataStr, horaIStr)
    if (!dataInicioISO) {
      showAlert({ type: 'error', title: 'Erro', message: 'Data ou hora inválida' })
      return
    }

    if (recorrenciaAtiva && recorrenciaTipo === 'SEMANAL' && recorrenciaDiasSemana.length === 0) {
      showAlert({ type: 'error', title: 'Erro', message: 'Selecione pelo menos um dia da semana para a recorrência' })
      return
    }

    let dataFimISO = dataInicioISO
    if (horaFStr) {
      const parsed = parseDataHora(dataStr, horaFStr)
      if (parsed) dataFimISO = parsed
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
        IMPORTANCIA: importancia > 0 ? importancia : null,
        ANTECEDENCIA_LEMBRETE_MINUTOS: lembrete,
        ...(recorrenciaAtiva ? {
          RECORRENCIA_TIPO: recorrenciaTipo,
          RECORRENCIA_INTERVALO: recorrenciaTipo === 'PERSONALIZADA' ? parseInt(recorrenciaIntervalo) || 15 : null,
          RECORRENCIA_DIAS_SEMANA: recorrenciaTipo === 'SEMANAL' ? recorrenciaDiasSemana : null,
          RECORRENCIA_FIM: null,
        } : {
          RECORRENCIA_TIPO: null,
          RECORRENCIA_INTERVALO: null,
          RECORRENCIA_DIAS_SEMANA: null,
          RECORRENCIA_FIM: null,
        }),
      })

      showAlert({ type: 'success', title: 'Sucesso', message: 'Compromisso criado!', onConfirm: () => navigation.goBack() })
    } catch (err: any) {
      showAlert({ type: 'error', title: 'Erro', message: err.message || 'Erro ao criar compromisso' })
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

          {/* Linha: Data + seletor de importância */}
          <View style={styles.row}>
            <View style={styles.col}>
              <Text style={styles.label}>Data *</Text>
              <TouchableOpacity
                style={styles.pickerButton}
                onPress={() => setMostrarPickerData(true)}
                activeOpacity={0.7}
              >
                <Text style={styles.pickerButtonText}>📅 {dataStr}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.col}>
              <Text style={styles.label}>Importância</Text>
              <View style={styles.importanciaRow}>
                {([1, 2, 3] as const).map((nivel) => {
                  const cores = { 1: '#2563EB', 2: '#EAB308', 3: '#EF4444' }
                  const ativo = importancia === nivel
                  return (
                    <TouchableOpacity
                      key={nivel}
                      style={[
                        styles.importanciaBtn,
                        ativo && { backgroundColor: cores[nivel], borderColor: cores[nivel] },
                      ]}
                      onPress={() => setImportancia(ativo ? 0 : nivel)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.importanciaBtnText, ativo && { color: '#FFFFFF' }]}>
                        {'●'.repeat(nivel)}
                      </Text>
                    </TouchableOpacity>
                  )
                })}
              </View>
            </View>
          </View>

          {/* Linha: Hora Início + Hora Fim */}
          <View style={styles.row}>
            <View style={styles.col}>
              <Text style={styles.label}>Hora Início *</Text>
              <TouchableOpacity
                style={styles.pickerButton}
                onPress={() => setMostrarPickerHoraInicio(true)}
                activeOpacity={0.7}
              >
                <Text style={[styles.pickerButtonText, !horaInicioDefinida && styles.pickerPlaceholder]}>
                  🕐 {horaInicioDefinida ? horaIStr : '--:--'}
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.col}>
              <Text style={styles.label}>Hora Fim</Text>
              <TouchableOpacity
                style={styles.pickerButton}
                onPress={() => setMostrarPickerHoraFim(true)}
                activeOpacity={0.7}
              >
                <Text style={[styles.pickerButtonText, pickerHFh === null && styles.pickerPlaceholder]}>
                  🕐 {horaFStr ?? '--:--'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.label}>Local</Text>
          <View style={styles.localRow}>
            <TextInput
              style={[styles.input, styles.localInput]}
              placeholder="Ex: Sala 3, Rua Exemplo 123"
              value={local}
              onChangeText={setLocal}
            />
            {local.trim() !== '' && (
              <TouchableOpacity
                onPress={() => abrirMapa(local.trim())}
                style={styles.mapaBtn}
                activeOpacity={0.7}
              >
                <Text style={styles.mapaBtnText}>🗺️</Text>
              </TouchableOpacity>
            )}
          </View>

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
                {(['SEMANAL', 'MENSAL', 'PERSONALIZADA'] as RecorrenciaTipo[]).map((tipo) => (
                  <TouchableOpacity
                    key={tipo}
                    style={[styles.tipoBtn, recorrenciaTipo === tipo && styles.tipoBtnAtivo]}
                    onPress={() => setRecorrenciaTipo(tipo)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.tipoBtnText, recorrenciaTipo === tipo && styles.tipoBtnTextAtivo]}>
                      {tipo === 'SEMANAL' ? 'Semanal' : tipo === 'MENSAL' ? 'Mensal' : 'A cada X dias'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Dica contextual */}
              {recorrenciaTipo === 'MENSAL' && (
                <Text style={styles.recorrenciaDica}>
                  📅 Vai repetir todo dia {pickerDia} de cada mês{'\n'}
                  Próximas: {proximasMensal}
                </Text>
              )}

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
                  {intervaloNum > 0 && (
                    <Text style={styles.recorrenciaDica}>
                      📅 Vai repetir a cada {recorrenciaIntervalo} dias{'\n'}
                      Próximas: {proximasPersonalizada}
                    </Text>
                  )}
                </>
              )}

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

      {/* ===== MODAIS DE PICKER ===== */}
      <DateWheelPickerModal
        visible={mostrarPickerData}
        dia={pickerDia}
        mes={pickerMes}
        ano={pickerAno}
        onConfirm={(dia, mes, ano) => {
          setPickerDia(dia)
          setPickerMes(mes)
          setPickerAno(ano)
        }}
        onClose={() => setMostrarPickerData(false)}
      />

      <TimeWheelPickerModal
        visible={mostrarPickerHoraInicio}
        hora={pickerHIh}
        minuto={pickerHIm}
        titulo="Hora de Início"
        onConfirm={(hora, minuto) => {
          setPickerHIh(hora)
          setPickerHIm(minuto)
          setHoraInicioDefinida(true)
        }}
        onClose={() => setMostrarPickerHoraInicio(false)}
      />

      <TimeWheelPickerModal
        visible={mostrarPickerHoraFim}
        hora={pickerHFh ?? pickerHIh}
        minuto={pickerHFm ?? pickerHIm}
        titulo="Hora de Fim"
        onConfirm={(hora, minuto) => {
          setPickerHFh(hora)
          setPickerHFm(minuto)
        }}
        onClose={() => setMostrarPickerHoraFim(false)}
      />

      {/* Alertas modernos */}
      {alertCfg && (
        <ConfirmDialog
          visible={true}
          type={alertCfg.type}
          title={alertCfg.title}
          message={alertCfg.message}
          confirmLabel={alertCfg.confirmLabel}
          cancelLabel={alertCfg.cancelLabel}
          onConfirm={() => { setAlertCfg(null); alertCfg.onConfirm?.() }}
          onCancel={() => setAlertCfg(null)}
        />
      )}

      {/* Diálogo de mapa */}
      {mapaEndereco && (
        <ConfirmDialog
          visible={true}
          type="info"
          title="Abrir no mapa"
          message={mapaEndereco}
          confirmLabel="Google Maps"
          cancelLabel="Waze"
          onConfirm={() => { Linking.openURL(`https://maps.google.com/maps?q=${encodeURIComponent(mapaEndereco)}`); setMapaEndereco(null) }}
          onCancel={() => { Linking.openURL(`https://waze.com/ul?q=${encodeURIComponent(mapaEndereco)}&navigate=yes`); setMapaEndereco(null) }}
        />
      )}
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
  // Picker button (substitui TextInput de data/hora)
  pickerButton: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    justifyContent: 'center',
  },
  pickerButtonText: {
    fontSize: 15,
    color: '#111827',
    fontWeight: '500',
  },
  pickerPlaceholder: {
    color: '#9CA3AF',
    fontWeight: '400',
  },
  importanciaRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 16,
  },
  importanciaBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    backgroundColor: '#F9FAFB',
  },
  importanciaBtnText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '700',
    letterSpacing: 1,
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
  recorrenciaDica: {
    fontSize: 13,
    color: '#2563EB',
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
    overflow: 'hidden',
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
    flexWrap: 'wrap',
    gap: 5,
    marginBottom: 16,
  },
  diaBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
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

  // Campo Local com botão mapa
  localRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  localInput: {
    flex: 1,
    marginBottom: 0,
  },
  mapaBtn: {
    marginLeft: 8,
    padding: 10,
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  mapaBtnText: {
    fontSize: 20,
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
