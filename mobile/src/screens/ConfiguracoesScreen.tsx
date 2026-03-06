import React, { useCallback, useEffect, useState, useRef } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Switch,
  Platform,
} from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { useAuth } from '../contexts/AuthContext'
import { carregarConfiguracoes, salvarConfiguracoes, listarArquivados, excluirCompromissoArquivado, excluirTodosArquivados } from '../lib/api'
import ConfirmDialog from '../components/ConfirmDialog'
import DateWheelPickerModal from '../components/DateWheelPickerModal'

export default function ConfiguracoesScreen() {
  const { signOut } = useAuth()
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)

  // Dados do usuário
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [telefone, setTelefone] = useState('')
  const [plano, setPlano] = useState('')
  const [dataNascimento, setDataNascimento] = useState('') // DD/MM/AAAA
  const [dataNascPickerVisible, setDataNascPickerVisible] = useState(false)

  // WhatsApp
  const [whatsappAtivado, setWhatsappAtivado] = useState(false)

  // Arquivados
  const [arquivados, setArquivados] = useState<any[]>([])
  const [mostrandoArquivados, setMostrandoArquivados] = useState(false)
  const [carregandoArquivados, setCarregandoArquivados] = useState(false)
  const [excluindoTodos, setExcluindoTodos] = useState(false)

  const lastFetch = useRef<number>(0)
  const loaded = useRef(false)
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Alerta genérico (sucesso/erro/info)
  type AlertCfg = { type?: 'success'|'error'|'info'|'warning'; title: string; message: string; onConfirm?: () => void }
  const [alertCfg, setAlertCfg] = useState<AlertCfg | null>(null)
  function showAlert(cfg: AlertCfg) { setAlertCfg(cfg) }

  // Dialog de confirmação genérico
  type DialogCfg = { title: string; message: string; confirmLabel: string; cancelLabel?: string; destructive?: boolean; onConfirm: () => void | Promise<void> }
  const [dialogCfg, setDialogCfg] = useState<DialogCfg | null>(null)
  function showDialog(cfg: DialogCfg) { setDialogCfg(cfg) }

  const carregar = async (forceLoading = false) => {
    if (forceLoading) setCarregando(true)
    try {
      const data = await carregarConfiguracoes()
      setNome(data.usuario.NOME || '')
      setEmail(data.usuario.EMAIL || '')
      setTelefone(data.usuario.TELEFONE || '')
      setPlano(data.usuario.PLANO || 'FREE')
      setWhatsappAtivado(data.whatsapp?.ativado || false)
      if (data.usuario.DATA_NASCIMENTO) {
        // Convert YYYY-MM-DD → DD/MM/AAAA
        const [ano, mes, dia] = data.usuario.DATA_NASCIMENTO.split('-')
        setDataNascimento(`${dia}/${mes}/${ano}`)
      } else {
        setDataNascimento('')
      }
      lastFetch.current = Date.now()
      loaded.current = true
    } catch (err: any) {
      if (!loaded.current) showAlert({ type: 'error', title: 'Erro ao carregar', message: err.message || 'Não foi possível carregar as configurações.' })
    } finally {
      setCarregando(false)
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

  const autoSalvar = useCallback(async (valores: {
    nome: string; telefone: string; whatsappAtivado: boolean; dataNascimento: string
  }) => {
    let dataNascISO: string | null = null
    if (valores.dataNascimento.trim()) {
      const partes = valores.dataNascimento.trim().split('/')
      if (partes.length === 3 && partes[2].length === 4) {
        dataNascISO = `${partes[2]}-${partes[1].padStart(2, '0')}-${partes[0].padStart(2, '0')}`
      } else {
        return // data incompleta, não salvar ainda
      }
    }
    try {
      setSalvando(true)
      await salvarConfiguracoes({
        nome: valores.nome.trim(),
        telefone: valores.telefone.trim(),
        whatsappAtivado: valores.whatsappAtivado,
        dataNascimento: dataNascISO,
      })
    } catch (err: any) {
      console.error('Auto-save erro:', err)
    } finally {
      setSalvando(false)
    }
  }, [])

  // Auto-save com debounce para campos de texto (nome e telefone)
  useEffect(() => {
    if (!loaded.current) return
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => {
      autoSalvar({ nome, telefone, whatsappAtivado, dataNascimento })
    }, 1500)
    return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current) }
  }, [nome, telefone])

  // Auto-save imediato para toggle e data (ações explícitas do usuário)
  useEffect(() => {
    if (!loaded.current) return
    autoSalvar({ nome, telefone, whatsappAtivado, dataNascimento })
  }, [whatsappAtivado, dataNascimento])

  async function handleVerArquivados() {
    if (mostrandoArquivados) {
      setMostrandoArquivados(false)
      return
    }
    setCarregandoArquivados(true)
    setMostrandoArquivados(true)
    try {
      const data = await listarArquivados()
      setArquivados(data.compromissos || [])
    } catch (err: any) {
      showAlert({ type: 'error', title: 'Erro', message: err.message || 'Não foi possível carregar os arquivados.' })
    } finally {
      setCarregandoArquivados(false)
    }
  }

  function handleExcluirArquivado(id: string, titulo: string) {
    showDialog({
      title: 'Excluir compromisso',
      message: `Excluir "${titulo}" permanentemente? Esta ação não pode ser desfeita.`,
      confirmLabel: 'Excluir',
      cancelLabel: 'Cancelar',
      destructive: true,
      onConfirm: async () => {
        try {
          await excluirCompromissoArquivado(id)
          setArquivados((prev) => prev.filter((c) => c.ID_COMPROMISSO !== id))
        } catch (err: any) {
          showAlert({ type: 'error', title: 'Erro ao excluir', message: err.message })
        }
      },
    })
  }

  function handleExcluirTodos() {
    showDialog({
      title: 'Excluir todos os arquivados',
      message: 'Excluir permanentemente todos os compromissos arquivados? Esta ação não pode ser desfeita.',
      confirmLabel: 'Excluir todos',
      cancelLabel: 'Cancelar',
      destructive: true,
      onConfirm: async () => {
        setExcluindoTodos(true)
        try {
          await excluirTodosArquivados()
          setArquivados([])
        } catch (err: any) {
          showAlert({ type: 'error', title: 'Erro ao excluir', message: err.message })
        } finally {
          setExcluindoTodos(false)
        }
      },
    })
  }

  function handleSair() {
    showDialog({
      title: 'Sair da conta',
      message: 'Tem certeza que deseja sair da conta?',
      confirmLabel: 'Sair',
      cancelLabel: 'Cancelar',
      destructive: true,
      onConfirm: signOut,
    })
  }

  if (carregando) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    )
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Dados Pessoais */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Dados Pessoais</Text>

        <Text style={styles.label}>Nome</Text>
        <TextInput
          style={styles.input}
          value={nome}
          onChangeText={setNome}
          placeholder="Seu nome"
        />

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={[styles.input, styles.inputDisabled]}
          value={email}
          editable={false}
        />
        <Text style={styles.hint}>O email não pode ser alterado</Text>

        <Text style={styles.label}>Telefone</Text>
        <TextInput
          style={styles.input}
          value={telefone}
          onChangeText={setTelefone}
          placeholder="+55 11 99999-9999"
          keyboardType="phone-pad"
        />

        <Text style={styles.label}>Data de Nascimento</Text>
        <TouchableOpacity
          style={[styles.input, styles.inputPressable]}
          onPress={() => setDataNascPickerVisible(true)}
          activeOpacity={0.7}
        >
          <Text style={[styles.inputText, !dataNascimento && styles.inputPlaceholder]}>
            {dataNascimento || 'DD/MM/AAAA (opcional)'}
          </Text>
          <Text style={styles.inputArrow}>▼</Text>
        </TouchableOpacity>
        <Text style={[styles.hint, dataNascimento ? { color: '#059669' } : {}]}>
          {dataNascimento
            ? '🎂 Um compromisso de aniversário anual será criado automaticamente'
            : 'Opcional — cria um lembrete de aniversário recorrente'}
        </Text>

        <Text style={styles.label}>Plano</Text>
        <View style={styles.planoBadge}>
          <Text style={styles.planoText}>{plano}</Text>
        </View>
      </View>

      {/* WhatsApp */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.whatsappIcon}>📱</Text>
          <Text style={styles.cardTitle}>Integração WhatsApp</Text>
        </View>

        <Text style={styles.cardDesc}>
          Ative para receber lembretes de compromissos via WhatsApp e criar compromissos por mensagem.
        </Text>

        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.switchLabel}>Notificações WhatsApp</Text>
            <Text style={styles.switchDesc}>Receba lembretes antes dos compromissos</Text>
          </View>
          <Switch
            value={whatsappAtivado}
            onValueChange={setWhatsappAtivado}
            trackColor={{ false: '#D1D5DB', true: '#86EFAC' }}
            thumbColor={whatsappAtivado ? '#10B981' : '#F3F4F6'}
          />
        </View>

        {whatsappAtivado && (
          <View style={styles.whatsappInfo}>
            <Text style={styles.whatsappInfoTitle}>
              WhatsApp ativado para: {telefone || 'Nenhum telefone cadastrado'}
            </Text>
            <Text style={styles.whatsappInfoDesc}>
              Certifique-se de que o número acima é o mesmo do seu WhatsApp.
            </Text>
            {!telefone && (
              <Text style={styles.whatsappWarning}>
                Cadastre seu telefone acima para receber notificações
              </Text>
            )}
          </View>
        )}

        {whatsappAtivado && telefone && (
          <View style={styles.whatsappTip}>
            <Text style={styles.whatsappTipTitle}>Crie compromissos pelo WhatsApp!</Text>
            <Text style={styles.whatsappTipDesc}>
              Envie uma mensagem no formato:
            </Text>
            <View style={styles.codeBlock}>
              <Text style={styles.codeText}>título | data | hora início - hora fim</Text>
            </View>
            <Text style={styles.whatsappTipDesc}>
              Exemplo: Dentista | 15/03 | 10:00 - 11:00
            </Text>
          </View>
        )}
      </View>

      {/* Arquivados */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.whatsappIcon}>📦</Text>
          <Text style={[styles.cardTitle, { marginBottom: 0, flex: 1 }]}>Compromissos Arquivados</Text>
        </View>
        <Text style={[styles.cardDesc, { marginTop: 8 }]}>
          Compromissos vencidos que foram arquivados. Aqui você pode excluí-los definitivamente.
        </Text>

        <TouchableOpacity
          style={styles.verArquivadosBtn}
          onPress={handleVerArquivados}
        >
          <Text style={styles.verArquivadosBtnText}>
            {mostrandoArquivados ? 'Ocultar' : 'Ver arquivados'}
          </Text>
        </TouchableOpacity>

        {mostrandoArquivados && (
          <View style={{ marginTop: 12 }}>
            {carregandoArquivados ? (
              <ActivityIndicator size="small" color="#2563EB" style={{ marginVertical: 12 }} />
            ) : arquivados.length === 0 ? (
              <Text style={styles.arquivadosVazio}>Nenhum compromisso arquivado</Text>
            ) : (
              <>
                {arquivados.map((c) => {
                  const dataFmt = new Date(c.DATA_INICIO).toLocaleDateString('pt-BR', {
                    day: '2-digit', month: '2-digit', year: '2-digit',
                  })
                  return (
                    <View key={c.ID_COMPROMISSO} style={styles.arquivadoItem}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.arquivadoTitulo} numberOfLines={1}>{c.TITULO}</Text>
                        <Text style={styles.arquivadoData}>📅 {dataFmt}</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.lixeiraBtn}
                        onPress={() => handleExcluirArquivado(c.ID_COMPROMISSO, c.TITULO)}
                      >
                        <Text style={styles.lixeiraBtnText}>🗑️</Text>
                      </TouchableOpacity>
                    </View>
                  )
                })}
                <TouchableOpacity
                  style={[styles.excluirTodosBtn, excluindoTodos && styles.btnDisabled]}
                  onPress={handleExcluirTodos}
                  disabled={excluindoTodos}
                >
                  <Text style={styles.excluirTodosBtnText}>
                    {excluindoTodos ? 'Excluindo...' : '🗑️ Excluir todos'}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}
      </View>

      {/* Indicador de auto-save */}
      {salvando && <Text style={styles.autoSaveIndicator}>Salvando...</Text>}

      {/* Botão Sair */}
      <TouchableOpacity style={styles.sairBtn} onPress={handleSair}>
        <Text style={styles.sairBtnText}>Sair da conta</Text>
      </TouchableOpacity>

      {/* Diálogos */}
      {dialogCfg && (
        <ConfirmDialog
          visible={true}
          title={dialogCfg.title}
          message={dialogCfg.message}
          confirmLabel={dialogCfg.confirmLabel}
          cancelLabel={dialogCfg.cancelLabel}
          destructive={dialogCfg.destructive}
          onConfirm={async () => { setDialogCfg(null); await dialogCfg.onConfirm() }}
          onCancel={() => setDialogCfg(null)}
        />
      )}
      <ConfirmDialog
        visible={!!alertCfg}
        type={alertCfg?.type}
        title={alertCfg?.title || ''}
        message={alertCfg?.message || ''}
        onConfirm={() => { const fn = alertCfg?.onConfirm; setAlertCfg(null); fn?.() }}
        onCancel={() => setAlertCfg(null)}
      />

      {/* Roleta de Data de Nascimento */}
      {(() => {
        // Parsear DD/MM/AAAA para dia/mes/ano
        const partes = dataNascimento ? dataNascimento.split('/') : []
        const pickerDia = partes.length === 3 ? parseInt(partes[0], 10) || 1 : 1
        const pickerMes = partes.length === 3 ? (parseInt(partes[1], 10) - 1) || 0 : 0
        const pickerAno = partes.length === 3 ? parseInt(partes[2], 10) || 1990 : 1990
        return (
          <DateWheelPickerModal
            visible={dataNascPickerVisible}
            dia={pickerDia}
            mes={pickerMes}
            ano={pickerAno}
            anoMin={1920}
            anoMax={new Date().getFullYear()}
            onConfirm={(d, m, a) => {
              const dd = String(d).padStart(2, '0')
              const mm = String(m + 1).padStart(2, '0')
              setDataNascimento(`${dd}/${mm}/${a}`)
            }}
            onClose={() => setDataNascPickerVisible(false)}
          />
        )
      })()}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F3F4F6' },
  content: { padding: 16, paddingBottom: 40 },

  // Card
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  whatsappIcon: { fontSize: 22, marginRight: 10 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827', marginBottom: 16 },
  cardDesc: { fontSize: 14, color: '#6B7280', marginBottom: 16, lineHeight: 20 },

  // Inputs
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 4,
    color: '#111827',
  },
  inputDisabled: { backgroundColor: '#F3F4F6', color: '#9CA3AF' },
  inputPressable: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  inputText: { fontSize: 16, color: '#111827' },
  inputPlaceholder: { color: '#9CA3AF' },
  inputArrow: { fontSize: 12, color: '#9CA3AF' },
  hint: { fontSize: 12, color: '#9CA3AF', marginBottom: 16 },

  // Plano
  planoBadge: { backgroundColor: '#EFF6FF', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, alignSelf: 'flex-start' },
  planoText: { fontSize: 14, fontWeight: '600', color: '#2563EB' },

  // Switch
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  switchLabel: { fontSize: 15, fontWeight: '600', color: '#111827' },
  switchDesc: { fontSize: 13, color: '#6B7280', marginTop: 2 },

  // WhatsApp info
  whatsappInfo: {
    backgroundColor: '#ECFDF5',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#D1FAE5',
    marginBottom: 12,
  },
  whatsappInfoTitle: { fontSize: 14, fontWeight: '600', color: '#065F46', marginBottom: 4 },
  whatsappInfoDesc: { fontSize: 13, color: '#047857' },
  whatsappWarning: { fontSize: 13, color: '#DC2626', fontWeight: '500', marginTop: 8 },

  // WhatsApp tip
  whatsappTip: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  whatsappTipTitle: { fontSize: 14, fontWeight: '600', color: '#1E40AF', marginBottom: 4 },
  whatsappTipDesc: { fontSize: 13, color: '#2563EB', marginBottom: 4 },
  codeBlock: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginVertical: 6,
  },
  codeText: { fontSize: 13, color: '#1E40AF', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },

  // Auto-save
  autoSaveIndicator: { textAlign: 'center', color: '#9CA3AF', fontSize: 12, marginBottom: 8 },
  btnDisabled: { opacity: 0.6 },
  sairBtn: {
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 20,
  },
  sairBtnText: { color: '#DC2626', fontSize: 15, fontWeight: '500' },

  // Arquivados
  verArquivadosBtn: {
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  verArquivadosBtnText: { fontSize: 14, fontWeight: '600', color: '#374151' },
  arquivadosVazio: { fontSize: 14, color: '#9CA3AF', textAlign: 'center', paddingVertical: 12 },
  arquivadoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  arquivadoTitulo: { fontSize: 14, fontWeight: '600', color: '#111827' },
  arquivadoData: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  lixeiraBtn: { paddingHorizontal: 8, paddingVertical: 4 },
  lixeiraBtnText: { fontSize: 18 },
  excluirTodosBtn: {
    backgroundColor: '#FEE2E2',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  excluirTodosBtnText: { color: '#DC2626', fontSize: 14, fontWeight: '600' },
})
