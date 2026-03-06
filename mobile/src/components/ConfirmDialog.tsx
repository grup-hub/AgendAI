import React from 'react'
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native'

type DialogType = 'success' | 'error' | 'info' | 'warning'

interface ConfirmDialogProps {
  visible: boolean
  type?: DialogType          // sem type = confirmação (dois botões)
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string       // se ausente + type definido = botão único
  neutralLabel?: string      // 3º botão opcional (ex: "Cancelar" para fechar sem ação)
  destructive?: boolean
  onConfirm: () => void
  onCancel?: () => void
  onNeutral?: () => void
}

function getTypeConfig(type?: DialogType, destructive?: boolean) {
  switch (type) {
    case 'success': return { icon: '✅', color: '#16A34A' }
    case 'error':   return { icon: '❌', color: '#EF4444' }
    case 'info':    return { icon: 'ℹ️', color: '#2563EB' }
    case 'warning': return { icon: '⚠️', color: '#F59E0B' }
    default:        return { icon: destructive ? '⚠️' : 'ℹ️', color: destructive ? '#EF4444' : '#2563EB' }
  }
}

export default function ConfirmDialog({
  visible,
  type,
  title,
  message,
  confirmLabel,
  cancelLabel,
  neutralLabel,
  destructive = false,
  onConfirm,
  onCancel,
  onNeutral,
}: ConfirmDialogProps) {
  const { icon, color } = getTypeConfig(type, destructive)
  const defaultLabel = type ? 'OK' : (destructive ? 'Confirmar' : 'Confirmar')
  const btnLabel = confirmLabel || defaultLabel
  // Botão único quando: tipo definido (success/error/info/warning) e sem cancelLabel
  const singleButton = !!type && !cancelLabel

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onCancel || onConfirm}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.icon}>{icon}</Text>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <View style={[styles.buttons, singleButton && styles.buttonsSingle]}>
            {!singleButton && cancelLabel && (
              <TouchableOpacity style={styles.cancelBtn} onPress={onCancel} activeOpacity={0.7}>
                <Text style={styles.cancelText}>{cancelLabel}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.confirmBtn, { backgroundColor: color }, singleButton && styles.confirmBtnFull]}
              onPress={onConfirm}
              activeOpacity={0.7}
            >
              <Text style={styles.confirmText}>{btnLabel}</Text>
            </TouchableOpacity>
          </View>
          {neutralLabel && (
            <TouchableOpacity style={styles.neutralBtn} onPress={onNeutral} activeOpacity={0.7}>
              <Text style={styles.neutralText}>{neutralLabel}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 28,
    paddingHorizontal: 24,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 12,
  },
  icon: {
    fontSize: 44,
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  buttonsSingle: {
    justifyContent: 'center',
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmBtnFull: {
    flex: undefined,
    width: '60%',
  },
  confirmText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  neutralBtn: {
    marginTop: 8,
    width: '100%',
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    alignItems: 'center',
  },
  neutralText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
})
