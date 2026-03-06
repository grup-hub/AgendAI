import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Share,
  Modal,
  ActivityIndicator,
} from 'react-native'
import { atualizarCompromisso, deletarCompromisso, compartilharCompromisso, arquivarCompromisso } from '../lib/api'
import DateWheelPickerModal from '../components/DateWheelPickerModal'
import TimeWheelPickerModal from '../components/TimeWheelPickerModal'
import ConfirmDialog from '../components/ConfirmDialog'
import MapaDialog from '../components/MapaDialog'

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
  compartilhado?: boolean
  dono_nome?: string
  agenda_nome?: string
  permissao?: string
  RECORRENCIA_TIPO?: string | null
  ID_COMPROMISSO_ORIGEM?: string | null
}

export default function DetalhesCompromissoScreen({ route, navigation }: any) {
  const compromisso: Compromisso = route.params.compromisso
  const isCopa2026 = compromisso.ORIGEM === 'COPA2026'
  const podeEditar = !isCopa2026 && (!compromisso.compartilhado || compromisso.permissao === 'EDITAR')

  const [editando, setEditando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [excluindo, setExcluindo] = useState(false)
  const [arquivando, setArquivando] = useState(false)
  const [modalCompartilhar, setModalCompartilhar] = useState(false)
  const [emailCompartilhar, setEmailCompartilhar] = useState('')
  const [permissaoCompartilhar, setPermissaoCompartilhar] = useState<'VISUALIZAR' | 'EDITAR'>('VISUALIZAR')
  const [compartilhando, setCompartilhando] = useState(false)

  const [mapaEndereco, setMapaEndereco] = useState<string | null>(null)

  // Alerta genérico (sucesso/erro/info)
  type AlertCfg = { type?: 'success'|'error'|'info'|'warning'; title: string; message: string; onConfirm?: () => void }
  const [alertCfg, setAlertCfg] = useState<AlertCfg | null>(null)
  function showAlert(cfg: AlertCfg) { setAlertCfg(cfg) }

  // Estados de diálogos de confirmação
  const [dialogRecorrencia, setDialogRecorrencia] = useState(false)
  const [excluirSerie, setExcluirSerie] = useState(false)
  const [dialogExcluir1, setDialogExcluir1] = useState(false)
  const [dialogExcluir2, setDialogExcluir2] = useState(false)
  const [dialogCancelar1, setDialogCancelar1] = useState(false)
  const [dialogCancelar2, setDialogCancelar2] = useState(false)
  const [dialogArquivarAviso, setDialogArquivarAviso] = useState(false)
  const [dialogArquivar, setDialogArquivar] = useState(false)

  // Compartilhamento interno só para compromissos próprios (não Copa, não compartilhado)
  const podeCompartilharInterno = !isCopa2026 && !compromisso.compartilhado

  // Estado para adiar compromisso
  const [modalAdiar, setModalAdiar] = useState(false)
  const [adiando, setAdiando] = useState(false)
  const [adiarDia, setAdiarDia] = useState(() => {
    const d = new Date(compromisso.DATA_INICIO)
    d.setDate(d.getDate() + 1)
    return d.getDate()
  })
  const [adiarMes, setAdiarMes] = useState(() => {
    const d = new Date(compromisso.DATA_INICIO)
    d.setDate(d.getDate() + 1)
    return d.getMonth()
  })
  const [adiarAno, setAdiarAno] = useState(() => {
    const d = new Date(compromisso.DATA_INICIO)
    d.setDate(d.getDate() + 1)
    return d.getFullYear()
  })
  const [adiarHIh, setAdiarHIh] = useState(new Date(compromisso.DATA_INICIO).getHours())
  const [adiarHIm, setAdiarHIm] = useState(new Date(compromisso.DATA_INICIO).getMinutes())
  const [adiarHFh, setAdiarHFh] = useState(new Date(compromisso.DATA_FIM || compromisso.DATA_INICIO).getHours())
  const [adiarHFm, setAdiarHFm] = useState(new Date(compromisso.DATA_FIM || compromisso.DATA_INICIO).getMinutes())
  const [mostrarPickerDataAdiar, setMostrarPickerDataAdiar] = useState(false)
  const [mostrarPickerHoraInicioAdiar, setMostrarPickerHoraInicioAdiar] = useState(false)
  const [mostrarPickerHoraFimAdiar, setMostrarPickerHoraFimAdiar] = useState(false)

  // Campos editáveis — data/hora com wheel pickers
  const [titulo, setTitulo] = useState(compromisso.TITULO)
  const [descricao, setDescricao] = useState(compromisso.DESCRICAO || '')
  const [local, setLocal] = useState(compromisso.LOCAL || '')
  const [editDia, setEditDia] = useState(new Date(compromisso.DATA_INICIO).getDate())
  const [editMes, setEditMes] = useState(new Date(compromisso.DATA_INICIO).getMonth())
  const [editAno, setEditAno] = useState(new Date(compromisso.DATA_INICIO).getFullYear())
  const [editHIh, setEditHIh] = useState(new Date(compromisso.DATA_INICIO).getHours())
  const [editHIm, setEditHIm] = useState(new Date(compromisso.DATA_INICIO).getMinutes())
  const [editHFh, setEditHFh] = useState(new Date(compromisso.DATA_FIM || compromisso.DATA_INICIO).getHours())
  const [editHFm, setEditHFm] = useState(new Date(compromisso.DATA_FIM || compromisso.DATA_INICIO).getMinutes())
  const [temHoraFimEdit, setTemHoraFimEdit] = useState(!!compromisso.DATA_FIM)
  const [mostrarPickerDataEdit, setMostrarPickerDataEdit] = useState(false)
  const [mostrarPickerHIEdit, setMostrarPickerHIEdit] = useState(false)
  const [mostrarPickerHFEdit, setMostrarPickerHFEdit] = useState(false)
  const [importancia, setImportancia] = useState<0|1|2|3>((compromisso.IMPORTANCIA as 0|1|2|3) || (compromisso.URGENTE ? 3 : 0))

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

  function getImportanciaColor(importancia?: number | null): string | null {
    switch (importancia) {
      case 3: return '#EF4444'
      case 2: return '#EAB308'
      case 1: return '#2563EB'
      default: return null
    }
  }

  function getImportanciaLabel(importancia?: number | null): string | null {
    switch (importancia) {
      case 3: return '●●● Alta'
      case 2: return '●● Média'
      case 1: return '● Baixa'
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

  async function handleSalvar() {
    if (!titulo.trim()) {
      showAlert({ type: 'error', title: 'Campo obrigatório', message: 'O título é obrigatório' })
      return
    }

    const dataInicioISO = new Date(editAno, editMes, editDia, editHIh, editHIm).toISOString()
    const dataFimISO = temHoraFimEdit
      ? new Date(editAno, editMes, editDia, editHFh, editHFm).toISOString()
      : dataInicioISO

    setSalvando(true)
    try {
      await atualizarCompromisso({
        ID_COMPROMISSO: compromisso.ID_COMPROMISSO,
        TITULO: titulo.trim(),
        DESCRICAO: descricao.trim() || null,
        LOCAL: local.trim() || null,
        DATA_INICIO: dataInicioISO,
        DATA_FIM: dataFimISO,
        IMPORTANCIA: importancia > 0 ? importancia : null,
      })
      showAlert({ type: 'success', title: 'Compromisso atualizado!', message: 'As alterações foram salvas com sucesso.', onConfirm: () => navigation.goBack() })
    } catch (err: any) {
      showAlert({ type: 'error', title: 'Erro ao atualizar', message: err.message || 'Não foi possível atualizar o compromisso.' })
    } finally {
      setSalvando(false)
    }
  }

  function handleExcluir() {
    const isRecorrente = compromisso.RECORRENCIA_TIPO || compromisso.ID_COMPROMISSO_ORIGEM
    if (isRecorrente) {
      setDialogRecorrencia(true)
    } else {
      setExcluirSerie(false)
      setDialogExcluir1(true)
    }
  }

  async function confirmarExcluir() {
    setDialogExcluir2(false)
    setExcluindo(true)
    try {
      await deletarCompromisso(compromisso.ID_COMPROMISSO, excluirSerie)
      const msg = excluirSerie
        ? 'Todos os compromissos da série foram removidos.'
        : 'O compromisso foi removido permanentemente.'
      showAlert({ type: 'success', title: 'Compromisso excluído!', message: msg, onConfirm: () => navigation.goBack() })
    } catch (err: any) {
      showAlert({ type: 'error', title: 'Erro ao excluir', message: err.message || 'Não foi possível excluir o compromisso.' })
      setExcluindo(false)
    }
  }

  function handleCancelar() {
    setDialogCancelar1(true)
  }

  async function confirmarCancelar() {
    setDialogCancelar2(false)
    setSalvando(true)
    try {
      await atualizarCompromisso({
        ID_COMPROMISSO: compromisso.ID_COMPROMISSO,
        STATUS: 'CANCELADO',
      })
      showAlert({ type: 'success', title: 'Compromisso cancelado!', message: 'O compromisso foi marcado como cancelado.', onConfirm: () => navigation.goBack() })
    } catch (err: any) {
      showAlert({ type: 'error', title: 'Erro ao cancelar', message: err.message || 'Não foi possível cancelar o compromisso.' })
    } finally {
      setSalvando(false)
    }
  }

  // ====== COMPARTILHAMENTO ======

  function formatarCompromissoParaCompartilhar() {
    const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
    const meses = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

    const inicio = new Date(compromisso.DATA_INICIO)
    const dia = diasSemana[inicio.getDay()]
    const numDia = inicio.getDate()
    const mes = meses[inicio.getMonth()]
    const h1 = inicio.getHours().toString().padStart(2, '0')
    const m1 = inicio.getMinutes().toString().padStart(2, '0')

    let horario = `${h1}:${m1}`
    if (compromisso.DATA_FIM) {
      const fim = new Date(compromisso.DATA_FIM)
      const h2 = fim.getHours().toString().padStart(2, '0')
      const m2 = fim.getMinutes().toString().padStart(2, '0')
      if (`${h1}:${m1}` !== `${h2}:${m2}`) {
        horario = `${h1}:${m1} - ${h2}:${m2}`
      }
    }

    const emoji = isCopa2026 ? '⚽' : '📋'

    let texto = `${emoji} *${compromisso.TITULO}*\n`
    texto += `📅 ${dia}, ${numDia} ${mes} • ${horario}\n`

    if (compromisso.LOCAL) {
      texto += `📍 ${compromisso.LOCAL}\n`
    }

    if (compromisso.DESCRICAO) {
      texto += `📝 ${compromisso.DESCRICAO}\n`
    }

    texto += `\n_Compartilhado via AgendAI_ ✨`

    return texto
  }

  async function handleCompartilharExterno() {
    const texto = formatarCompromissoParaCompartilhar()
    try {
      await Share.share({ message: texto })
    } catch (err: any) {
      if (err.message !== 'User did not share') {
        showAlert({ type: 'error', title: 'Erro', message: 'Não foi possível compartilhar' })
      }
    }
  }

  async function handleCompartilharInterno() {
    const emailTrimmed = emailCompartilhar.trim()
    if (!emailTrimmed) {
      showAlert({ type: 'error', title: 'Campo obrigatório', message: 'Digite o email do usuário' })
      return
    }

    setCompartilhando(true)
    try {
      const result = await compartilharCompromisso(compromisso.ID_COMPROMISSO, emailTrimmed, permissaoCompartilhar)
      setModalCompartilhar(false)
      setEmailCompartilhar('')
      showAlert({ type: 'success', title: 'Compromisso compartilhado!', message: result.message || 'O convite foi enviado com sucesso.' })
    } catch (err: any) {
      showAlert({ type: 'error', title: 'Erro ao compartilhar', message: err.message || 'Não foi possível compartilhar o compromisso.' })
    } finally {
      setCompartilhando(false)
    }
  }

  const vencido = new Date(compromisso.DATA_INICIO) < new Date()
  const podeArquivar = podeEditar && !compromisso.compartilhado && (vencido || compromisso.STATUS === 'CANCELADO')

  function handleArquivar() {
    if (compromisso.STATUS !== 'CANCELADO') {
      setDialogArquivarAviso(true)
      return
    }
    setDialogArquivar(true)
  }

  async function confirmarArquivar() {
    setDialogArquivar(false)
    setArquivando(true)
    try {
      await arquivarCompromisso(compromisso.ID_COMPROMISSO)
      showAlert({ type: 'success', title: 'Compromisso arquivado!', message: 'O compromisso foi movido para Arquivados.', onConfirm: () => navigation.goBack() })
    } catch (err: any) {
      showAlert({ type: 'error', title: 'Erro ao arquivar', message: err.message || 'Não foi possível arquivar o compromisso.' })
    } finally {
      setArquivando(false)
    }
  }

  async function handleAdiar() {
    setAdiando(true)
    try {
      const dataInicioISO = new Date(adiarAno, adiarMes, adiarDia, adiarHIh, adiarHIm).toISOString()
      const dataFimISO = new Date(adiarAno, adiarMes, adiarDia, adiarHFh, adiarHFm).toISOString()
      await atualizarCompromisso({
        ID_COMPROMISSO: compromisso.ID_COMPROMISSO,
        DATA_INICIO: dataInicioISO,
        DATA_FIM: dataFimISO,
      })
      setModalAdiar(false)
      showAlert({ type: 'success', title: 'Compromisso adiado!', message: 'O compromisso foi reagendado com sucesso.', onConfirm: () => navigation.goBack() })
    } catch (err: any) {
      showAlert({ type: 'error', title: 'Erro ao adiar', message: err.message || 'Não foi possível adiar o compromisso.' })
    } finally {
      setAdiando(false)
    }
  }

  // Modo visualização
  if (!editando) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        {/* Status badge */}
        <View style={styles.statusRow}>
          <View style={[styles.statusBadgeLarge, { backgroundColor: (vencido && compromisso.STATUS === 'ATIVO' ? '#6B7280' : getStatusColor(compromisso.STATUS)) + '15' }]}>
            <View style={[styles.statusDot, { backgroundColor: vencido && compromisso.STATUS === 'ATIVO' ? '#6B7280' : getStatusColor(compromisso.STATUS) }]} />
            <Text style={[styles.statusLabelLarge, { color: vencido && compromisso.STATUS === 'ATIVO' ? '#6B7280' : getStatusColor(compromisso.STATUS) }]}>
              {vencido && compromisso.STATUS === 'ATIVO' ? 'Vencido' : getStatusLabel(compromisso.STATUS)}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {(() => {
              const imp = compromisso.IMPORTANCIA ?? (compromisso.URGENTE ? 3 : null)
              const impColor = getImportanciaColor(imp)
              const impLabel = getImportanciaLabel(imp)
              if (!impColor || !impLabel) return null
              return (
                <View style={{ backgroundColor: impColor + '20', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: impColor + '40' }}>
                  <Text style={{ color: impColor, fontSize: 12, fontWeight: '700' }}>{impLabel}</Text>
                </View>
              )
            })()}
            {compromisso.ORIGEM && (
              <Text style={styles.origemText}>
                via {compromisso.ORIGEM === 'APP_MOBILE' ? 'App' : compromisso.ORIGEM === 'WHATSAPP' ? 'WhatsApp' : compromisso.ORIGEM === 'COPA2026' ? '⚽ Copa 2026' : 'Web'}
              </Text>
            )}
          </View>
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
                <View style={{ flex: 1 }}>
                  <Text style={styles.infoLabel}>Local</Text>
                  <TouchableOpacity onPress={() => setMapaEndereco(compromisso.LOCAL!)} activeOpacity={0.7}>
                    <Text style={[styles.infoValue, { color: '#2563EB', textDecorationLine: 'underline' }]}>{compromisso.LOCAL}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </>
          )}

          {compromisso.compartilhado && compromisso.dono_nome && (
            <>
              <View style={styles.divider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoIcon}>📤</Text>
                <View>
                  <Text style={styles.infoLabel}>Compartilhado por</Text>
                  <Text style={[styles.infoValue, { color: '#8B5CF6' }]}>{compromisso.dono_nome?.split(' ')[0]}</Text>
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

        {/* Aviso Copa 2026 — somente visualização */}
        {isCopa2026 && (
          <View style={styles.copaInfoCard}>
            <Text style={styles.copaInfoIcon}>⚽</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.copaInfoTitle}>Jogo da Copa do Mundo 2026</Text>
              <Text style={styles.copaInfoText}>Este compromisso foi importado automaticamente e não pode ser editado.</Text>
            </View>
          </View>
        )}

        {/* Compartilhar */}
        <View style={styles.shareCard}>
          <Text style={styles.shareTitle}>📤 Compartilhar</Text>

          <TouchableOpacity style={styles.shareExternoBtn} onPress={handleCompartilharExterno}>
            <Text style={styles.shareExternoBtnIcon}>💬</Text>
            <Text style={styles.shareExternoBtnText}>Enviar por mensagem</Text>
          </TouchableOpacity>

          {podeCompartilharInterno && (
            <TouchableOpacity style={styles.shareInternoBtn} onPress={() => setModalCompartilhar(true)}>
              <Text style={styles.shareInternoBtnIcon}>👥</Text>
              <Text style={styles.shareInternoBtnText}>Compartilhar com usuário AgendAI</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Modal de compartilhamento interno */}
        <Modal visible={modalCompartilhar} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>👥 Compartilhar Compromisso</Text>
              <Text style={styles.modalSubtitle}>O usuário receberá uma cópia deste compromisso na agenda dele</Text>

              {/* Toggle de permissão */}
              <Text style={[styles.label, { marginBottom: 8 }]}>Permissão</Text>
              <View style={[styles.importanciaRow, { marginBottom: 16 }]}>
                {(['VISUALIZAR', 'EDITAR'] as const).map((p) => {
                  const ativo = permissaoCompartilhar === p
                  const cor = p === 'EDITAR' ? '#EA580C' : '#7C3AED'
                  return (
                    <TouchableOpacity
                      key={p}
                      style={[
                        styles.importanciaBtn,
                        ativo && { backgroundColor: cor, borderColor: cor },
                      ]}
                      onPress={() => setPermissaoCompartilhar(p)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.importanciaBtnText, ativo && { color: '#FFFFFF' }]}>
                        {p === 'VISUALIZAR' ? '👁 Visualizar' : '✏️ Editar'}
                      </Text>
                    </TouchableOpacity>
                  )
                })}
              </View>

              <TextInput
                style={styles.modalInput}
                placeholder="Preencher com email do usuário"
                placeholderTextColor="#9CA3AF"
                value={emailCompartilhar}
                onChangeText={setEmailCompartilhar}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />

              <TouchableOpacity
                style={[styles.modalShareBtn, compartilhando && styles.btnDisabled]}
                onPress={handleCompartilharInterno}
                disabled={compartilhando}
              >
                {compartilhando ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.modalShareBtnText}>Enviar convite</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => { setModalCompartilhar(false); setEmailCompartilhar(''); setPermissaoCompartilhar('VISUALIZAR') }}>
                <Text style={styles.modalCancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

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
              style={styles.adiarBtn}
              onPress={() => setModalAdiar(true)}
            >
              <Text style={styles.adiarBtnText}>⏭ Adiar compromisso</Text>
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

            {podeArquivar && (
              <TouchableOpacity
                style={styles.arquivarActionBtn}
                onPress={handleArquivar}
                disabled={arquivando}
              >
                <Text style={styles.arquivarActionBtnText}>
                  {arquivando ? 'Arquivando...' : '📦 Arquivar compromisso'}
                </Text>
              </TouchableOpacity>
            )}

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
              style={styles.arquivarActionBtn}
              onPress={handleArquivar}
              disabled={arquivando}
            >
              <Text style={styles.arquivarActionBtnText}>
                {arquivando ? 'Arquivando...' : '📦 Arquivar compromisso'}
              </Text>
            </TouchableOpacity>
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
      {/* Modal de adiamento */}
      <Modal visible={modalAdiar} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>⏭ Adiar Compromisso</Text>
            <Text style={styles.modalSubtitle}>Selecione a nova data e horário</Text>

            <Text style={styles.label}>Nova Data</Text>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setMostrarPickerDataAdiar(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.pickerButtonText}>
                📅 {String(adiarDia).padStart(2,'0')}/{String(adiarMes+1).padStart(2,'0')}/{adiarAno}
              </Text>
            </TouchableOpacity>

            <View style={styles.row}>
              <View style={styles.col}>
                <Text style={styles.label}>Hora Início</Text>
                <TouchableOpacity
                  style={styles.pickerButton}
                  onPress={() => setMostrarPickerHoraInicioAdiar(true)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.pickerButtonText}>
                    🕐 {String(adiarHIh).padStart(2,'0')}:{String(adiarHIm).padStart(2,'0')}
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={styles.col}>
                <Text style={styles.label}>Hora Fim</Text>
                <TouchableOpacity
                  style={styles.pickerButton}
                  onPress={() => setMostrarPickerHoraFimAdiar(true)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.pickerButtonText}>
                    🕐 {String(adiarHFh).padStart(2,'0')}:{String(adiarHFm).padStart(2,'0')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.modalShareBtn, { backgroundColor: '#2563EB' }, adiando && styles.btnDisabled]}
              onPress={handleAdiar}
              disabled={adiando}
            >
              {adiando ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.modalShareBtnText}>Confirmar adiamento</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setModalAdiar(false)}>
              <Text style={styles.modalCancelBtnText}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Pickers de data/hora para adiamento */}
      <DateWheelPickerModal
        visible={mostrarPickerDataAdiar}
        dia={adiarDia}
        mes={adiarMes}
        ano={adiarAno}
        onConfirm={(dia, mes, ano) => { setAdiarDia(dia); setAdiarMes(mes); setAdiarAno(ano) }}
        onClose={() => setMostrarPickerDataAdiar(false)}
      />
      <TimeWheelPickerModal
        visible={mostrarPickerHoraInicioAdiar}
        hora={adiarHIh}
        minuto={adiarHIm}
        titulo="Hora de Início"
        onConfirm={(hora, minuto) => { setAdiarHIh(hora); setAdiarHIm(minuto) }}
        onClose={() => setMostrarPickerHoraInicioAdiar(false)}
      />
      <TimeWheelPickerModal
        visible={mostrarPickerHoraFimAdiar}
        hora={adiarHFh}
        minuto={adiarHFm}
        titulo="Hora de Fim"
        onConfirm={(hora, minuto) => { setAdiarHFh(hora); setAdiarHFm(minuto) }}
        onClose={() => setMostrarPickerHoraFimAdiar(false)}
      />

      {/* Diálogos de confirmação */}
      <ConfirmDialog
        visible={dialogRecorrencia}
        title="Excluir compromisso recorrente"
        message="Deseja excluir apenas esta ocorrência ou toda a série de compromissos?"
        confirmLabel="Apenas esta"
        cancelLabel="Cancelar"
        neutralLabel="Toda a série"
        onConfirm={() => { setDialogRecorrencia(false); setExcluirSerie(false); setDialogExcluir1(true) }}
        onCancel={() => setDialogRecorrencia(false)}
        onNeutral={() => { setDialogRecorrencia(false); setExcluirSerie(true); setDialogExcluir1(true) }}
      />
      <ConfirmDialog
        visible={dialogExcluir1}
        title="Excluir compromisso"
        message={excluirSerie ? `Excluir toda a série de "${compromisso.TITULO}"?` : `Tem certeza que deseja excluir "${compromisso.TITULO}"?`}
        confirmLabel="Sim, excluir"
        destructive
        onConfirm={() => { setDialogExcluir1(false); setDialogExcluir2(true) }}
        onCancel={() => setDialogExcluir1(false)}
      />
      <ConfirmDialog
        visible={dialogExcluir2}
        title="Confirmar exclusão"
        message="Esta ação não pode ser desfeita. O compromisso será excluído permanentemente."
        confirmLabel="Excluir definitivamente"
        cancelLabel="Voltar"
        destructive
        onConfirm={confirmarExcluir}
        onCancel={() => setDialogExcluir2(false)}
      />
      <ConfirmDialog
        visible={dialogCancelar1}
        title="Cancelar compromisso"
        message={`Tem certeza que deseja cancelar "${compromisso.TITULO}"?`}
        confirmLabel="Sim, cancelar"
        destructive
        onConfirm={() => { setDialogCancelar1(false); setDialogCancelar2(true) }}
        onCancel={() => setDialogCancelar1(false)}
      />
      <ConfirmDialog
        visible={dialogCancelar2}
        title="Confirmar cancelamento"
        message="O compromisso será marcado como CANCELADO."
        confirmLabel="Cancelar definitivamente"
        cancelLabel="Voltar"
        destructive
        onConfirm={confirmarCancelar}
        onCancel={() => setDialogCancelar2(false)}
      />
      <ConfirmDialog
        visible={dialogArquivarAviso}
        title="Atenção"
        message="Para arquivar este compromisso, você precisa cancelá-lo primeiro."
        confirmLabel="Cancelar compromisso"
        cancelLabel="Fechar"
        onConfirm={() => { setDialogArquivarAviso(false); handleCancelar() }}
        onCancel={() => setDialogArquivarAviso(false)}
      />
      <ConfirmDialog
        visible={dialogArquivar}
        title="Arquivar compromisso"
        message={`Deseja arquivar "${compromisso.TITULO}"? Ele será removido da agenda e poderá ser excluído em Configurações > Arquivados.`}
        confirmLabel="Arquivar"
        destructive
        onConfirm={confirmarArquivar}
        onCancel={() => setDialogArquivar(false)}
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
              <TouchableOpacity style={styles.pickerButton} onPress={() => setMostrarPickerDataEdit(true)} activeOpacity={0.7}>
                <Text style={styles.pickerButtonText}>
                  📅 {String(editDia).padStart(2,'0')}/{String(editMes+1).padStart(2,'0')}/{editAno}
                </Text>
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

          <View style={styles.row}>
            <View style={styles.col}>
              <Text style={styles.label}>Hora Início *</Text>
              <TouchableOpacity style={styles.pickerButton} onPress={() => setMostrarPickerHIEdit(true)} activeOpacity={0.7}>
                <Text style={styles.pickerButtonText}>
                  🕐 {String(editHIh).padStart(2,'0')}:{String(editHIm).padStart(2,'0')}
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.col}>
              <Text style={styles.label}>Hora Fim</Text>
              <TouchableOpacity style={styles.pickerButton} onPress={() => setMostrarPickerHFEdit(true)} activeOpacity={0.7}>
                <Text style={styles.pickerButtonText}>
                  🕑 {temHoraFimEdit ? `${String(editHFh).padStart(2,'0')}:${String(editHFm).padStart(2,'0')}` : '— sem fim'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.label}>Local</Text>
          <TextInput
            style={styles.input}
            value={local}
            onChangeText={setLocal}
            placeholder="Ex: Sala 3, Rua Exemplo 123"
          />

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
              const d = new Date(compromisso.DATA_INICIO)
              setEditDia(d.getDate()); setEditMes(d.getMonth()); setEditAno(d.getFullYear())
              setEditHIh(d.getHours()); setEditHIm(d.getMinutes())
              const df = compromisso.DATA_FIM ? new Date(compromisso.DATA_FIM) : null
              setEditHFh(df ? df.getHours() : d.getHours())
              setEditHFm(df ? df.getMinutes() : d.getMinutes())
              setTemHoraFimEdit(!!compromisso.DATA_FIM)
              setImportancia((compromisso.IMPORTANCIA as 0|1|2|3) || (compromisso.URGENTE ? 3 : 0))
            }}
          >
            <Text style={styles.cancelEditBtnText}>Cancelar edição</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      <ConfirmDialog
        visible={!!alertCfg}
        type={alertCfg?.type}
        title={alertCfg?.title || ''}
        message={alertCfg?.message || ''}
        onConfirm={() => { const fn = alertCfg?.onConfirm; setAlertCfg(null); fn?.() }}
        onCancel={() => setAlertCfg(null)}
      />
      <DateWheelPickerModal
        visible={mostrarPickerDataEdit}
        dia={editDia}
        mes={editMes}
        ano={editAno}
        onConfirm={(dia, mes, ano) => { setEditDia(dia); setEditMes(mes); setEditAno(ano) }}
        onClose={() => setMostrarPickerDataEdit(false)}
      />
      <TimeWheelPickerModal
        visible={mostrarPickerHIEdit}
        hora={editHIh}
        minuto={editHIm}
        titulo="Hora de Início"
        onConfirm={(hora, minuto) => { setEditHIh(hora); setEditHIm(minuto) }}
        onClose={() => setMostrarPickerHIEdit(false)}
      />
      <TimeWheelPickerModal
        visible={mostrarPickerHFEdit}
        hora={editHFh}
        minuto={editHFm}
        titulo="Hora de Fim"
        onConfirm={(hora, minuto) => { setEditHFh(hora); setEditHFm(minuto); setTemHoraFimEdit(true) }}
        onClose={() => setMostrarPickerHFEdit(false)}
      />
      <MapaDialog
        visible={!!mapaEndereco}
        endereco={mapaEndereco || ''}
        onClose={() => setMapaEndereco(null)}
      />
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

  // Copa 2026 info
  copaInfoCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  copaInfoIcon: { fontSize: 28, marginRight: 12 },
  copaInfoTitle: { fontSize: 14, fontWeight: '700', color: '#166534', marginBottom: 2 },
  copaInfoText: { fontSize: 12, color: '#15803D', lineHeight: 18 },

  // Share
  shareCard: {
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
  shareTitle: { fontSize: 15, fontWeight: '700', color: '#374151', marginBottom: 14 },
  shareExternoBtn: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  shareExternoBtnIcon: { fontSize: 18, marginRight: 10 },
  shareExternoBtnText: { color: '#2563EB', fontSize: 15, fontWeight: '600' },
  shareInternoBtn: {
    backgroundColor: '#F5F3FF',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  shareInternoBtnIcon: { fontSize: 18, marginRight: 10 },
  shareInternoBtnText: { color: '#7C3AED', fontSize: 15, fontWeight: '600' },

  // Modal compartilhamento
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827', marginBottom: 4 },
  modalSubtitle: { fontSize: 14, color: '#6B7280', marginBottom: 20 },
  modalInput: {
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
  modalShareBtn: {
    backgroundColor: '#7C3AED',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 8,
  },
  modalShareBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  modalCancelBtn: { alignItems: 'center', paddingVertical: 12 },
  modalCancelBtnText: { color: '#6B7280', fontSize: 16 },

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
  arquivarActionBtn: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  arquivarActionBtnText: { color: '#374151', fontSize: 15, fontWeight: '500' },

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
  adiarBtn: {
    backgroundColor: '#DBEAFE',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  adiarBtnText: { color: '#1D4ED8', fontSize: 15, fontWeight: '600' },
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
  pickerButtonText: { fontSize: 15, color: '#111827', fontWeight: '500' },
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
