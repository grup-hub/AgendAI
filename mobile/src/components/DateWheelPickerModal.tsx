import React, { useState, useEffect, useCallback } from 'react'
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import WheelPicker from './WheelPicker'

const DIAS = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'))
const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]
const ANO_BASE = new Date().getFullYear()

function getDiasNoMes(mes: number, ano: number): number {
  // mes é 0-indexado (0=janeiro)
  return new Date(ano, mes + 1, 0).getDate()
}

interface DateWheelPickerModalProps {
  visible: boolean
  dia: number        // 1–31
  mes: number        // 0–11
  ano: number        // e.g. 2026
  onConfirm: (dia: number, mes: number, ano: number) => void
  onClose: () => void
  anoMin?: number    // default: ANO_BASE - 2
  anoMax?: number    // default: ANO_BASE + 7
}

const DateWheelPickerModal: React.FC<DateWheelPickerModalProps> = ({
  visible,
  dia,
  mes,
  ano,
  onConfirm,
  onClose,
  anoMin,
  anoMax,
}) => {
  const anoMinEfetivo = anoMin ?? ANO_BASE - 2
  const anoMaxEfetivo = anoMax ?? ANO_BASE + 7
  const ANOS_LOCAL = Array.from(
    { length: anoMaxEfetivo - anoMinEfetivo + 1 },
    (_, i) => String(anoMinEfetivo + i)
  )

  const [localDia, setLocalDia] = useState(dia)
  const [localMes, setLocalMes] = useState(mes)
  const [localAno, setLocalAno] = useState(ano)

  // Sincroniza ao abrir
  useEffect(() => {
    if (visible) {
      setLocalDia(dia)
      setLocalMes(mes)
      setLocalAno(ano)
    }
  }, [visible, dia, mes, ano])

  // Dias válidos para o mês/ano atual
  const maxDias = getDiasNoMes(localMes, localAno)
  const diasDisponiveis = DIAS.slice(0, maxDias)

  // Clamp o dia se o mês mudou para um mês com menos dias
  const diaIndex = Math.min(localDia - 1, maxDias - 1)

  const handleMesChange = useCallback((index: number) => {
    setLocalMes(index)
    const newMax = getDiasNoMes(index, localAno)
    if (localDia > newMax) setLocalDia(newMax)
  }, [localDia, localAno])

  const handleAnoChange = useCallback((index: number) => {
    const novoAno = anoMinEfetivo + index
    setLocalAno(novoAno)
    const newMax = getDiasNoMes(localMes, novoAno)
    if (localDia > newMax) setLocalDia(newMax)
  }, [localDia, localMes, anoMinEfetivo])

  const handleDiaChange = useCallback((index: number) => {
    setLocalDia(index + 1)
  }, [])

  const handleConfirm = useCallback(() => {
    onConfirm(localDia, localMes, localAno)
    onClose()
  }, [localDia, localMes, localAno, onConfirm, onClose])

  const anoIndex = ANOS_LOCAL.indexOf(String(localAno))
  const insets = useSafeAreaInsets()

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

      <View style={[styles.sheet, { paddingBottom: Math.max(32, insets.bottom + 16) }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.cancelText}>Cancelar</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Selecionar Data</Text>
          <TouchableOpacity onPress={handleConfirm}>
            <Text style={styles.confirmText}>Confirmar</Text>
          </TouchableOpacity>
        </View>

        {/* Roletas */}
        <View style={styles.pickersRow}>
          {/* Dia */}
          <View style={styles.pickerColumn}>
            <Text style={styles.columnLabel}>Dia</Text>
            <WheelPicker
              items={diasDisponiveis}
              selectedIndex={diaIndex}
              onChangeIndex={handleDiaChange}
              width={60}
            />
          </View>

          {/* Mês */}
          <View style={[styles.pickerColumn, { flex: 1 }]}>
            <Text style={styles.columnLabel}>Mês</Text>
            <WheelPicker
              items={MESES}
              selectedIndex={localMes}
              onChangeIndex={handleMesChange}
              width={140}
            />
          </View>

          {/* Ano */}
          <View style={styles.pickerColumn}>
            <Text style={styles.columnLabel}>Ano</Text>
            <WheelPicker
              items={ANOS_LOCAL}
              selectedIndex={anoIndex >= 0 ? anoIndex : 0}
              onChangeIndex={handleAnoChange}
              width={80}
            />
          </View>
        </View>

        {/* Botão Confirmar */}
        <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
          <Text style={styles.confirmButtonText}>Confirmar</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  )
}

const { width } = Dimensions.get('window')

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 32,
    paddingTop: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  cancelText: {
    fontSize: 15,
    color: '#6B7280',
  },
  confirmText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2563EB',
  },
  pickersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 8,
  },
  pickerColumn: {
    alignItems: 'center',
  },
  columnLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 4,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  confirmButton: {
    marginHorizontal: 24,
    marginTop: 8,
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
})

export default DateWheelPickerModal
