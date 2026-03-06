import React from 'react'
import { Modal, View, Text, Pressable, Image, StyleSheet, Linking } from 'react-native'

interface MapaDialogProps {
  visible: boolean
  endereco: string
  onClose: () => void
}

export default function MapaDialog({ visible, endereco, onClose }: MapaDialogProps) {
  const abrirGoogleMaps = () => {
    Linking.openURL(`https://maps.google.com/maps?q=${encodeURIComponent(endereco)}`)
    onClose()
  }

  const abrirWaze = () => {
    Linking.openURL(`https://waze.com/ul?q=${encodeURIComponent(endereco)}&navigate=yes`)
    onClose()
  }

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.mapIcon}>🗺️</Text>
          <Text style={styles.title}>Abrir no mapa</Text>
          <Text style={styles.address} numberOfLines={2}>{endereco}</Text>

          <View style={styles.appButtons}>
            <Pressable
              style={({ pressed }) => [
                styles.appBtn,
                pressed && { backgroundColor: '#F3F4F6', borderColor: '#D1D5DB' },
              ]}
              onPress={abrirGoogleMaps}
            >
              <Image
                source={require('../../assets/icon-google-maps.png')}
                style={styles.appIcon}
                resizeMode="contain"
              />
              <Text style={styles.appLabel}>Google Maps</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.appBtn,
                pressed && { backgroundColor: '#F3F4F6', borderColor: '#D1D5DB' },
              ]}
              onPress={abrirWaze}
            >
              <Image
                source={require('../../assets/icon-waze.png')}
                style={styles.appIcon}
                resizeMode="contain"
              />
              <Text style={styles.appLabel}>Waze</Text>
            </Pressable>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.cancelBtn,
              pressed && { backgroundColor: '#FEE2E2', borderColor: '#EF4444' },
            ]}
            onPress={onClose}
          >
            {({ pressed }) => (
              <Text style={[styles.cancelText, pressed && { color: '#EF4444' }]}>
                Cancelar
              </Text>
            )}
          </Pressable>
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
  mapIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 6,
  },
  address: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 24,
  },
  appButtons: {
    flexDirection: 'row',
    gap: 16,
    width: '100%',
    marginBottom: 8,
  },
  appBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    gap: 8,
  },
  appIcon: {
    width: 52,
    height: 52,
    borderRadius: 12,
  },
  appLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  cancelBtn: {
    marginTop: 4,
    width: '100%',
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
})
