import React, { useState, useEffect, useCallback } from 'react'
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import WheelPicker from './WheelPicker'

const HORAS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
const MINUTOS = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'))

interface TimeWheelPickerModalProps {
  visible: boolean
  hora: number    // 0–23
  minuto: number  // 0–59
  titulo?: string
  onConfirm: (hora: number, minuto: number) => void
  onClose: () => void
}

const TimeWheelPickerModal: React.FC<TimeWheelPickerModalProps> = ({
  visible,
  hora,
  minuto,
  titulo = 'Selecionar Hora',
  onConfirm,
  onClose,
}) => {
  const [localHora, setLocalHora] = useState(hora)
  const [localMinuto, setLocalMinuto] = useState(minuto)
  const insets = useSafeAreaInsets()

  // Sincroniza ao abrir
  useEffect(() => {
    if (visible) {
      setLocalHora(hora)
      setLocalMinuto(minuto)
    }
  }, [visible, hora, minuto])

  const handleConfirm = useCallback(() => {
    onConfirm(localHora, localMinuto)
    onClose()
  }, [localHora, localMinuto, onConfirm, onClose])

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
          <Text style={styles.title}>{titulo}</Text>
          <TouchableOpacity onPress={handleConfirm}>
            <Text style={styles.confirmText}>Confirmar</Text>
          </TouchableOpacity>
        </View>

        {/* Roletas */}
        <View style={styles.pickersRow}>
          {/* Horas */}
          <View style={styles.pickerColumn}>
            <Text style={styles.columnLabel}>Hora</Text>
            <WheelPicker
              items={HORAS}
              selectedIndex={localHora}
              onChangeIndex={setLocalHora}
              width={80}
            />
          </View>

          {/* Separador */}
          <Text style={styles.separator}>:</Text>

          {/* Minutos */}
          <View style={styles.pickerColumn}>
            <Text style={styles.columnLabel}>Min</Text>
            <WheelPicker
              items={MINUTOS}
              selectedIndex={localMinuto}
              onChangeIndex={setLocalMinuto}
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
  separator: {
    fontSize: 32,
    fontWeight: '700',
    color: '#374151',
    marginTop: 18,
    marginHorizontal: 4,
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

export default TimeWheelPickerModal
