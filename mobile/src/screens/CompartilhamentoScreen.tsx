import React, { useCallback, useState, useRef } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import {
  listarCompartilhamentos,
  convidarCompartilhamento,
  responderCompartilhamento,
  removerCompartilhamento,
  listarCompartilhamentosCompromisso,
  responderCompartilhamentoCompromisso,
  removerCompartilhamentoCompromisso,
} from '../lib/api'
import { useCompartilhamento } from '../contexts/CompartilhamentoContext'
import ConfirmDialog from '../components/ConfirmDialog'

interface Compartilhamento {
  ID_COMPARTILHAMENTO: string
  ID_AGENDA: string
  PERMISSAO: string
  STATUS: string
  DATA_CONVITE: string
  convidado?: { NOME: string; EMAIL: string }
  agenda?: { NOME: string }
  dono?: { NOME: string; EMAIL: string }
}

interface CompromissoNavData {
  ID_COMPROMISSO: string
  TITULO: string
  DESCRICAO?: string | null
  DATA_INICIO: string
  DATA_FIM?: string | null
  LOCAL?: string | null
  STATUS: string
  ORIGEM: string
  IMPORTANCIA?: number | null
  URGENTE?: boolean
  ID_AGENDA: string
  compartilhado?: boolean
  permissao?: string
  dono_nome?: string
}

interface CompartilhamentoCompromisso {
  ID: string
  ID_COMPROMISSO_ORIGEM: string
  ID_COMPROMISSO_COPIA?: string
  PERMISSAO?: string
  STATUS: string
  DATA_COMPARTILHAMENTO: string
  remetente?: { NOME: string; EMAIL: string }
  destinatario?: { NOME: string; EMAIL: string }
  compromisso?: CompromissoNavData
  compromissoCopia?: CompromissoNavData
}

export default function CompartilhamentoScreen({ navigation }: any) {
  const [enviados, setEnviados] = useState<Compartilhamento[]>([])
  const [recebidos, setRecebidos] = useState<Compartilhamento[]>([])
  const [compEnviados, setCompEnviados] = useState<CompartilhamentoCompromisso[]>([])
  const [compRecebidos, setCompRecebidos] = useState<CompartilhamentoCompromisso[]>([])
  const [carregando, setCarregando] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Formulário
  const [email, setEmail] = useState('')
  const [permissao, setPermissao] = useState<'VISUALIZAR' | 'EDITAR'>('VISUALIZAR')
  const [enviando, setEnviando] = useState(false)
  const lastFetch = useRef<number>(0)
  const loaded = useRef(false)

  // Seleção múltipla de compRecebidos
  const [modoSelecaoComp, setModoSelecaoComp] = useState(false)
  const [selecionadosComp, setSelecionadosComp] = useState<string[]>([])

  // Dialog de confirmação genérico
  type DialogCfg = { title: string; message: string; confirmLabel: string; destructive?: boolean; onConfirm: () => Promise<void> }
  const [dialogCfg, setDialogCfg] = useState<DialogCfg | null>(null)

  function showDialog(cfg: DialogCfg) { setDialogCfg(cfg) }

  // Alerta genérico (sucesso/erro/info)
  type AlertCfg = { type?: 'success'|'error'|'info'|'warning'; title: string; message: string; onConfirm?: () => void }
  const [alertCfg, setAlertCfg] = useState<AlertCfg | null>(null)
  function showAlert(cfg: AlertCfg) { setAlertCfg(cfg) }

  function sairModoSelecaoComp() {
    setModoSelecaoComp(false)
    setSelecionadosComp([])
  }

  function handleLongPressComp(id: string) {
    if (!modoSelecaoComp) {
      setModoSelecaoComp(true)
      setSelecionadosComp([id])
    }
  }

  function toggleSelecaoComp(id: string) {
    setSelecionadosComp((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
  }

  function handleAceitarSelecionados() {
    if (selecionadosComp.length === 0) return
    showDialog({
      title: 'Aceitar compromissos',
      message: `Aceitar ${selecionadosComp.length} compromisso(s) selecionado(s)?`,
      confirmLabel: 'Aceitar',
      onConfirm: async () => {
        for (const id of selecionadosComp) {
          try { await responderCompartilhamentoCompromisso(id, 'ACEITO') } catch {}
        }
        sairModoSelecaoComp()
        carregar()
      },
    })
  }

  function handleRecusarSelecionados() {
    if (selecionadosComp.length === 0) return
    showDialog({
      title: 'Recusar compromissos',
      message: `Recusar ${selecionadosComp.length} compromisso(s) selecionado(s)?`,
      confirmLabel: 'Recusar',
      destructive: true,
      onConfirm: async () => {
        for (const id of selecionadosComp) {
          try { await responderCompartilhamentoCompromisso(id, 'RECUSADO') } catch {}
        }
        sairModoSelecaoComp()
        carregar()
      },
    })
  }

  const { resetBadge } = useCompartilhamento()

  const carregar = async (forceLoading = false) => {
    if (forceLoading) setCarregando(true)
    try {
      const [dataAgenda, dataComp] = await Promise.all([
        listarCompartilhamentos(),
        listarCompartilhamentosCompromisso().catch(() => ({ enviados: [], recebidos: [] })),
      ])
      setEnviados(dataAgenda.enviados || [])
      setRecebidos(dataAgenda.recebidos || [])
      setCompEnviados(dataComp.enviados || [])
      setCompRecebidos(dataComp.recebidos || [])
      lastFetch.current = Date.now()
      loaded.current = true
    } catch (err: any) {
      if (!loaded.current) showAlert({ type: 'error', title: 'Erro ao carregar', message: err.message || 'Não foi possível carregar os compartilhamentos.' })
    } finally {
      setCarregando(false)
      setRefreshing(false)
    }
  }

  useFocusEffect(
    useCallback(() => {
      // Zera o badge da aba ao abrir a tela
      resetBadge()

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

  async function handleConvidar() {
    if (!email.trim()) {
      showAlert({ type: 'error', title: 'Campo obrigatório', message: 'Digite o email do usuário' })
      return
    }

    setEnviando(true)
    try {
      await convidarCompartilhamento(email.trim(), permissao)
      setEmail('')
      carregar()
      showAlert({ type: 'success', title: 'Convite enviado!', message: 'O usuário receberá o convite para acessar sua agenda.' })
    } catch (err: any) {
      showAlert({ type: 'error', title: 'Erro ao enviar convite', message: err.message || 'Não foi possível enviar o convite.' })
    } finally {
      setEnviando(false)
    }
  }

  async function handleResponder(id: string, status: 'ACEITO' | 'RECUSADO') {
    try {
      await responderCompartilhamento(id, status)
      carregar()
      showAlert({ type: 'success', title: status === 'ACEITO' ? 'Convite aceito!' : 'Convite recusado.', message: status === 'ACEITO' ? 'A agenda foi adicionada com sucesso.' : 'O convite foi recusado.' })
    } catch (err: any) {
      showAlert({ type: 'error', title: 'Erro', message: err.message })
    }
  }

  async function handleResponderCompromisso(id: string, status: 'ACEITO' | 'RECUSADO') {
    try {
      await responderCompartilhamentoCompromisso(id, status)
      carregar()
      showAlert({ type: 'success', title: status === 'ACEITO' ? 'Compromisso adicionado!' : 'Convite recusado.', message: status === 'ACEITO' ? 'O compromisso foi adicionado à sua agenda.' : 'O convite foi recusado.' })
    } catch (err: any) {
      showAlert({ type: 'error', title: 'Erro', message: err.message })
    }
  }

  function handleRemover(id: string) {
    showDialog({
      title: 'Remover compartilhamento',
      message: 'Tem certeza que deseja remover este compartilhamento?',
      confirmLabel: 'Remover',
      destructive: true,
      onConfirm: async () => {
        try {
          await removerCompartilhamento(id)
          carregar()
          showAlert({ type: 'success', title: 'Compartilhamento removido!', message: 'O compartilhamento foi removido com sucesso.' })
        } catch (err: any) {
          showAlert({ type: 'error', title: 'Erro', message: err.message })
        }
      },
    })
  }

  function handleRemoverCompromisso(id: string, tipo: 'cancelar' | 'desfazer' | 'arquivar' | 'revogar') {
    const titulo =
      tipo === 'cancelar' ? 'Cancelar convite' :
      tipo === 'desfazer' ? 'Desfazer aceite' :
      tipo === 'revogar' ? 'Revogar compartilhamento' : 'Arquivar convite'
    const mensagem =
      tipo === 'cancelar' ? 'Deseja cancelar este convite enviado?' :
      tipo === 'desfazer' ? 'Deseja desfazer o aceite deste compromisso compartilhado?' :
      tipo === 'revogar' ? 'Deseja revogar o compartilhamento? O compromisso será removido da agenda do destinatário.' :
      'Deseja arquivar este convite recusado? Ele será removido do histórico.'
    const btnLabel =
      tipo === 'cancelar' ? 'Cancelar convite' :
      tipo === 'desfazer' ? 'Desfazer' :
      tipo === 'revogar' ? 'Revogar' : 'Arquivar'
    showDialog({
      title: titulo,
      message: mensagem,
      confirmLabel: btnLabel,
      destructive: true,
      onConfirm: async () => {
        try {
          await removerCompartilhamentoCompromisso(id)
          carregar()
        } catch (err: any) {
          showAlert({ type: 'error', title: 'Erro', message: err.message })
        }
      },
    })
  }

  function handleArquivarConviteAgenda(id: string) {
    showDialog({
      title: 'Arquivar convite',
      message: 'Deseja arquivar este convite recusado? Ele será removido do histórico.',
      confirmLabel: 'Arquivar',
      destructive: true,
      onConfirm: async () => {
        try {
          await removerCompartilhamento(id)
          carregar()
        } catch (err: any) {
          showAlert({ type: 'error', title: 'Erro', message: err.message })
        }
      },
    })
  }

  function getStatusStyle(status: string, perspectiva: 'enviado' | 'recebido' = 'enviado') {
    switch (status) {
      case 'PENDENTE': return { bg: '#FEF3C7', text: '#92400E', label: 'Pendente' }
      case 'ACEITO':   return { bg: '#D1FAE5', text: '#065F46', label: perspectiva === 'recebido' ? 'Aceitei' : 'Aceitou' }
      case 'RECUSADO': return { bg: '#FEE2E2', text: '#991B1B', label: 'Recusado' }
      default:         return { bg: '#F3F4F6', text: '#374151', label: status }
    }
  }

  if (carregando) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    )
  }

  const sections = [
    { type: 'form' as const },
    { type: 'recebidosHeader' as const },
    // Convites de compromisso recebidos (badge 📌)
    ...compRecebidos.map((r) => ({ type: 'compRecebido' as const, compData: r })),
    // Convites de agenda recebidos (badge 📅)
    ...recebidos.map((r) => ({ type: 'recebido' as const, data: r })),
    ...(recebidos.length === 0 && compRecebidos.length === 0 ? [{ type: 'recebidosEmpty' as const }] : []),
    { type: 'enviadosHeader' as const },
    // Convites de compromisso enviados
    ...compEnviados.map((e) => ({ type: 'compEnviado' as const, compData: e })),
    // Convites de agenda enviados
    ...enviados.map((e) => ({ type: 'enviado' as const, data: e })),
    ...(enviados.length === 0 && compEnviados.length === 0 ? [{ type: 'enviadosEmpty' as const }] : []),
  ]

  return (
    <View style={styles.container}>
      {/* Barra do modo seleção */}
      {modoSelecaoComp && (
        <View style={styles.selecaoTopBar}>
          <TouchableOpacity onPress={sairModoSelecaoComp} style={styles.selecaoCloseBtn}>
            <Text style={styles.selecaoCloseText}>✕ Cancelar</Text>
          </TouchableOpacity>
          <Text style={styles.selecaoTopText}>
            {selecionadosComp.length === 0 ? 'Toque para selecionar' : `${selecionadosComp.length} selecionado(s)`}
          </Text>
          <TouchableOpacity
            style={[styles.selecaoAcaoBtn, selecionadosComp.length === 0 && { opacity: 0.4 }]}
            onPress={handleAceitarSelecionados}
            disabled={selecionadosComp.length === 0}
          >
            <Text style={styles.selecaoAcaoBtnText}>✓ Aceitar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.selecaoAcaoBtn, { backgroundColor: '#EF4444' }, selecionadosComp.length === 0 && { opacity: 0.4 }]}
            onPress={handleRecusarSelecionados}
            disabled={selecionadosComp.length === 0}
          >
            <Text style={styles.selecaoAcaoBtnText}>✕ Recusar</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        style={{ flex: 1 }}
        data={sections}
      keyExtractor={(item, index) => `${item.type}-${index}`}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); carregar() }} colors={['#2563EB']} />
      }
      contentContainerStyle={styles.list}
      renderItem={({ item }) => {
        // Formulário de convite
        if (item.type === 'form') {
          return (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Compartilhar minha agenda</Text>
              <TextInput
                style={styles.input}
                placeholder="Preencher com email do usuário"
                placeholderTextColor="#9CA3AF"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <Text style={styles.permissaoLabel}>Permissão de acesso:</Text>
              <View style={styles.permissaoRow}>
                {(['VISUALIZAR', 'EDITAR'] as const).map((p) => {
                  const ativo = permissao === p
                  const cor = p === 'EDITAR' ? '#EA580C' : '#7C3AED'
                  return (
                    <TouchableOpacity
                      key={p}
                      style={[styles.permissaoBtn, ativo && { backgroundColor: cor, borderColor: cor }]}
                      onPress={() => setPermissao(p)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.permissaoText, ativo && { color: '#FFFFFF' }]}>
                        {p === 'VISUALIZAR' ? '👁️ Visualizar' : '✏️ Editar'}
                      </Text>
                      <Text style={[styles.permissaoSub, ativo && styles.permissaoSubActive]}>
                        {p === 'VISUALIZAR' ? 'Só vê seus compromissos' : 'Cria e edita compromissos'}
                      </Text>
                    </TouchableOpacity>
                  )
                })}
              </View>
              <TouchableOpacity
                style={[styles.convidarBtn, enviando && styles.btnDisabled]}
                onPress={handleConvidar}
                disabled={enviando}
              >
                <Text style={styles.convidarBtnText}>
                  {enviando ? 'Enviando...' : 'Enviar convite'}
                </Text>
              </TouchableOpacity>
            </View>
          )
        }

        // Headers
        if (item.type === 'recebidosHeader') {
          return <Text style={styles.sectionTitle}>Convites recebidos</Text>
        }
        if (item.type === 'enviadosHeader') {
          return <Text style={styles.sectionTitle}>Convites enviados</Text>
        }

        // Empty states
        if (item.type === 'recebidosEmpty' || item.type === 'enviadosEmpty') {
          return (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>
                {item.type === 'recebidosEmpty' ? 'Nenhum convite recebido' : 'Nenhum convite enviado'}
              </Text>
            </View>
          )
        }

        // Convite de compromisso recebido (📌)
        if (item.type === 'compRecebido' && item.compData) {
          const r = item.compData
          const st = getStatusStyle(r.STATUS, 'recebido')
          const dataFormatada = r.compromisso?.DATA_INICIO
            ? new Date(r.compromisso.DATA_INICIO).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
            : ''
          const compNavData = r.STATUS === 'ACEITO' && r.compromissoCopia
            ? { ...r.compromissoCopia, compartilhado: true, permissao: r.PERMISSAO || 'VISUALIZAR', dono_nome: r.remetente?.NOME || r.remetente?.EMAIL }
            : null

          const isSelected = selecionadosComp.includes(r.ID)
          return (
            <TouchableOpacity
              style={[styles.itemCard, { borderLeftWidth: 3, borderLeftColor: '#7C3AED' }, isSelected && { backgroundColor: '#EDE9FE' }]}
              activeOpacity={0.7}
              onPress={() => {
                if (modoSelecaoComp) { toggleSelecaoComp(r.ID); return }
                compNavData && navigation.navigate('DetalhesCompromisso', { compromisso: compNavData })
              }}
              onLongPress={() => handleLongPressComp(r.ID)}
              delayLongPress={400}
            >
              <View style={styles.itemHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 6 }}>
                  {modoSelecaoComp && (
                    <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                      {isSelected && <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700' }}>✓</Text>}
                    </View>
                  )}
                  <Text style={{ fontSize: 14 }}>📌</Text>
                  <Text style={[styles.itemNome, { flex: 1 }]} numberOfLines={1}>
                    {r.compromisso?.TITULO || 'Compromisso'}
                  </Text>
                </View>
                <View style={[styles.badge, { backgroundColor: st.bg }]}>
                  <Text style={[styles.badgeText, { color: st.text }]}>{st.label}</Text>
                </View>
              </View>
              <Text style={styles.itemSub}>
                De: {r.remetente?.NOME || r.remetente?.EMAIL || 'Usuário'}
              </Text>
              {dataFormatada ? (
                <Text style={styles.itemDate}>📅 {dataFormatada}</Text>
              ) : null}
              {r.compromisso?.LOCAL ? (
                <Text style={[styles.itemDate, { marginBottom: 8 }]}>📍 {r.compromisso.LOCAL}</Text>
              ) : null}
              {r.STATUS === 'PENDENTE' && (
                <View style={styles.actionsRow}>
                  <TouchableOpacity
                    style={styles.aceitarBtn}
                    onPress={() => handleResponderCompromisso(r.ID, 'ACEITO')}
                  >
                    <Text style={styles.aceitarBtnText}>Aceitar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.recusarBtn}
                    onPress={() => handleResponderCompromisso(r.ID, 'RECUSADO')}
                  >
                    <Text style={styles.recusarBtnText}>Recusar</Text>
                  </TouchableOpacity>
                </View>
              )}
              {r.STATUS === 'ACEITO' && (
                <TouchableOpacity
                  style={styles.sairBtn}
                  onPress={() => handleRemoverCompromisso(r.ID, 'desfazer')}
                >
                  <Text style={styles.sairBtnText}>Desfazer aceite</Text>
                </TouchableOpacity>
              )}
              {r.STATUS === 'RECUSADO' && (
                <TouchableOpacity
                  style={styles.arquivarBtn}
                  onPress={() => handleRemoverCompromisso(r.ID, 'arquivar')}
                >
                  <Text style={styles.arquivarBtnText}>📦 Arquivar</Text>
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          )
        }

        // Convite de compromisso enviado (📌)
        if (item.type === 'compEnviado' && item.compData) {
          const e = item.compData
          const st = getStatusStyle(e.STATUS, 'enviado')
          const compNavData = e.compromisso ? { ...e.compromisso } : null
          return (
            <TouchableOpacity
              style={[styles.itemCard, { borderLeftWidth: 3, borderLeftColor: '#7C3AED' }]}
              activeOpacity={compNavData ? 0.7 : 1}
              onPress={() => compNavData && navigation.navigate('DetalhesCompromisso', { compromisso: compNavData })}
            >
              <View style={styles.itemHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 6 }}>
                  <Text style={{ fontSize: 14 }}>📌</Text>
                  <Text style={[styles.itemNome, { flex: 1 }]} numberOfLines={1}>
                    {e.compromisso?.TITULO || 'Compromisso'}
                  </Text>
                </View>
                <View style={[styles.badge, { backgroundColor: st.bg }]}>
                  <Text style={[styles.badgeText, { color: st.text }]}>{st.label}</Text>
                </View>
              </View>
              <Text style={styles.itemSub}>
                Para: {e.destinatario?.NOME || e.destinatario?.EMAIL || 'Usuário'}
              </Text>
              <Text style={styles.itemDate}>
                Enviado em {new Date(e.DATA_COMPARTILHAMENTO).toLocaleDateString('pt-BR')}
              </Text>
              {e.STATUS === 'PENDENTE' && (
                <TouchableOpacity
                  style={styles.removerBtn}
                  onPress={() => handleRemoverCompromisso(e.ID, 'cancelar')}
                >
                  <Text style={styles.removerBtnText}>Cancelar convite</Text>
                </TouchableOpacity>
              )}
              {e.STATUS === 'ACEITO' && (
                <TouchableOpacity
                  style={styles.removerBtn}
                  onPress={() => handleRemoverCompromisso(e.ID, 'revogar')}
                >
                  <Text style={styles.removerBtnText}>🚫 Revogar acesso</Text>
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          )
        }

        // Convite de agenda recebido (📅)
        if (item.type === 'recebido' && item.data) {
          const r = item.data
          const st = getStatusStyle(r.STATUS, 'recebido')
          return (
            <View style={styles.itemCard}>
              <View style={styles.itemHeader}>
                <Text style={styles.itemNome}>{r.dono?.NOME || r.dono?.EMAIL || 'Usuário'}</Text>
                <View style={[styles.badge, { backgroundColor: st.bg }]}>
                  <Text style={[styles.badgeText, { color: st.text }]}>{st.label}</Text>
                </View>
              </View>
              <Text style={styles.itemSub}>
                Agenda: {r.agenda?.NOME || 'Agenda'} | Permissão: {r.PERMISSAO === 'EDITAR' ? 'Editar' : 'Visualizar'}
              </Text>
              <Text style={styles.itemDate}>
                Convidado em {new Date(r.DATA_CONVITE).toLocaleDateString('pt-BR')}
              </Text>
              {r.STATUS === 'PENDENTE' && (
                <View style={styles.actionsRow}>
                  <TouchableOpacity
                    style={styles.aceitarBtn}
                    onPress={() => handleResponder(r.ID_COMPARTILHAMENTO, 'ACEITO')}
                  >
                    <Text style={styles.aceitarBtnText}>Aceitar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.recusarBtn}
                    onPress={() => handleResponder(r.ID_COMPARTILHAMENTO, 'RECUSADO')}
                  >
                    <Text style={styles.recusarBtnText}>Recusar</Text>
                  </TouchableOpacity>
                </View>
              )}
              {r.STATUS === 'ACEITO' && (
                <TouchableOpacity
                  style={styles.sairBtn}
                  onPress={() => handleRemover(r.ID_COMPARTILHAMENTO)}
                >
                  <Text style={styles.sairBtnText}>Sair</Text>
                </TouchableOpacity>
              )}
              {r.STATUS === 'RECUSADO' && (
                <TouchableOpacity
                  style={styles.arquivarBtn}
                  onPress={() => handleArquivarConviteAgenda(r.ID_COMPARTILHAMENTO)}
                >
                  <Text style={styles.arquivarBtnText}>📦 Arquivar</Text>
                </TouchableOpacity>
              )}
            </View>
          )
        }

        // Convite enviado
        if (item.type === 'enviado' && item.data) {
          const e = item.data
          const st = getStatusStyle(e.STATUS, 'enviado')
          return (
            <View style={styles.itemCard}>
              <View style={styles.itemHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 6 }}>
                  <Text style={{ fontSize: 14 }}>📅</Text>
                  <Text style={[styles.itemNome, { flex: 1 }]} numberOfLines={1}>
                    {e.convidado?.NOME || e.convidado?.EMAIL || 'Usuário'}
                  </Text>
                </View>
                <View style={[styles.badge, { backgroundColor: st.bg }]}>
                  <Text style={[styles.badgeText, { color: st.text }]}>{st.label}</Text>
                </View>
              </View>
              <Text style={styles.itemSub}>
                📅 Minha agenda | Permissão: {e.PERMISSAO === 'EDITAR' ? 'Editar' : 'Visualizar'}
              </Text>
              <Text style={styles.itemSub}>
                {e.convidado?.EMAIL}
              </Text>
              <Text style={styles.itemDate}>
                Enviado em {new Date(e.DATA_CONVITE).toLocaleDateString('pt-BR')}
              </Text>
              <TouchableOpacity
                style={styles.removerBtn}
                onPress={() => handleRemover(e.ID_COMPARTILHAMENTO)}
              >
                <Text style={styles.removerBtnText}>Remover</Text>
              </TouchableOpacity>
            </View>
          )
        }

        return null
      }}
    />

    {dialogCfg && (
      <ConfirmDialog
        visible={true}
        title={dialogCfg.title}
        message={dialogCfg.message}
        confirmLabel={dialogCfg.confirmLabel}
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
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F3F4F6' },
  list: { padding: 16, paddingBottom: 40 },

  // Barra modo seleção
  selecaoTopBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E40AF', paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  selecaoCloseBtn: { paddingVertical: 6, paddingHorizontal: 10, backgroundColor: '#EF4444', borderRadius: 8 },
  selecaoCloseText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  selecaoTopText: { flex: 1, color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  selecaoAcaoBtn: { paddingVertical: 6, paddingHorizontal: 10, backgroundColor: '#16A34A', borderRadius: 8 },
  selecaoAcaoBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },

  // Checkbox
  checkbox: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#7C3AED', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  checkboxSelected: { backgroundColor: '#7C3AED', borderColor: '#7C3AED' },

  // Card formulário
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827', marginBottom: 16 },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 12,
    color: '#111827',
  },
  permissaoLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 },
  permissaoRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  permissaoBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    backgroundColor: '#F9FAFB',
  },
  permissaoText: { fontSize: 14, fontWeight: '700', color: '#9CA3AF', letterSpacing: 1 },
  permissaoSub: { fontSize: 11, color: '#9CA3AF', marginTop: 2, textAlign: 'center' },
  permissaoSubActive: { color: 'rgba(255,255,255,0.8)' },
  convidarBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  convidarBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  btnDisabled: { opacity: 0.6 },

  // Section
  sectionTitle: { fontSize: 17, fontWeight: 'bold', color: '#111827', marginTop: 20, marginBottom: 12 },

  // Empty
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginBottom: 8,
  },
  emptyText: { fontSize: 14, color: '#9CA3AF' },

  // Item card
  itemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  itemNome: { fontSize: 15, fontWeight: '600', color: '#111827', flex: 1 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  itemSub: { fontSize: 13, color: '#6B7280', marginBottom: 2 },
  itemDate: { fontSize: 12, color: '#9CA3AF', marginBottom: 8 },

  // Action buttons
  actionsRow: { flexDirection: 'row', gap: 10 },
  aceitarBtn: { flex: 1, backgroundColor: '#10B981', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  aceitarBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  recusarBtn: { flex: 1, backgroundColor: '#FEE2E2', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  recusarBtnText: { color: '#DC2626', fontSize: 14, fontWeight: '500' },
  sairBtn: { backgroundColor: '#FEE2E2', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  sairBtnText: { color: '#DC2626', fontSize: 14, fontWeight: '500' },
  removerBtn: { backgroundColor: '#FEE2E2', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  removerBtnText: { color: '#DC2626', fontSize: 14, fontWeight: '500' },
  arquivarBtn: { backgroundColor: '#F3F4F6', borderRadius: 10, paddingVertical: 8, alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: 16 },
  arquivarBtnText: { color: '#6B7280', fontSize: 13, fontWeight: '500' },
})
