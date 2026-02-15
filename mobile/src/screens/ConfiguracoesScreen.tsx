import React, { useCallback, useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
  Switch,
  Platform,
} from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { useAuth } from '../contexts/AuthContext'
import { carregarConfiguracoes, salvarConfiguracoes } from '../lib/api'

export default function ConfiguracoesScreen() {
  const { signOut } = useAuth()
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)

  // Dados do usuário
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [telefone, setTelefone] = useState('')
  const [plano, setPlano] = useState('')

  // WhatsApp
  const [whatsappAtivado, setWhatsappAtivado] = useState(false)

  const carregar = async () => {
    try {
      const data = await carregarConfiguracoes()
      setNome(data.usuario.NOME || '')
      setEmail(data.usuario.EMAIL || '')
      setTelefone(data.usuario.TELEFONE || '')
      setPlano(data.usuario.PLANO || 'FREE')
      setWhatsappAtivado(data.whatsapp?.ativado || false)
    } catch (err: any) {
      Alert.alert('Erro', err.message || 'Erro ao carregar configurações')
    } finally {
      setCarregando(false)
    }
  }

  useFocusEffect(
    useCallback(() => {
      setCarregando(true)
      carregar()
    }, [])
  )

  async function handleSalvar() {
    setSalvando(true)
    try {
      await salvarConfiguracoes({
        nome: nome.trim(),
        telefone: telefone.trim(),
        whatsappAtivado,
      })
      Alert.alert('Sucesso', 'Configurações salvas!')
    } catch (err: any) {
      Alert.alert('Erro', err.message || 'Erro ao salvar')
    } finally {
      setSalvando(false)
    }
  }

  function handleSair() {
    Alert.alert('Sair', 'Tem certeza que deseja sair da conta?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: signOut },
    ])
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

      {/* Botão Salvar */}
      <TouchableOpacity
        style={[styles.salvarBtn, salvando && styles.btnDisabled]}
        onPress={handleSalvar}
        disabled={salvando}
      >
        <Text style={styles.salvarBtnText}>
          {salvando ? 'Salvando...' : 'Salvar Configurações'}
        </Text>
      </TouchableOpacity>

      {/* Botão Sair */}
      <TouchableOpacity style={styles.sairBtn} onPress={handleSair}>
        <Text style={styles.sairBtnText}>Sair da conta</Text>
      </TouchableOpacity>
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

  // Botões
  salvarBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  salvarBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  btnDisabled: { opacity: 0.6 },
  sairBtn: {
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 20,
  },
  sairBtnText: { color: '#DC2626', fontSize: 15, fontWeight: '500' },
})
