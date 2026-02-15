import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import { Platform } from 'react-native'

// Configurar handler de notificações
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
})

// Solicitar permissão para notificações
export async function registrarNotificacoes(): Promise<boolean> {
  if (!Device.isDevice) {
    console.log('Notificações push não funcionam em emulador')
    return false
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync()
  let finalStatus = existingStatus

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync()
    finalStatus = status
  }

  if (finalStatus !== 'granted') {
    return false
  }

  // Android: criar canal de notificação
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('lembretes', {
      name: 'Lembretes',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#2563EB',
      sound: 'default',
    })
  }

  return true
}

// Agendar notificação local para um compromisso
export async function agendarLembrete(
  compromissoId: string,
  titulo: string,
  dataInicio: string,
  minutosAntes: number = 30
): Promise<string | null> {
  const dataCompromisso = new Date(dataInicio)
  const dataLembrete = new Date(dataCompromisso.getTime() - minutosAntes * 60 * 1000)

  // Não agendar se já passou
  if (dataLembrete <= new Date()) {
    return null
  }

  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Lembrete - AgendAI',
      body: `${titulo} em ${minutosAntes} minutos`,
      data: { compromissoId },
      sound: 'default',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: dataLembrete,
      channelId: 'lembretes',
    },
  })

  return notificationId
}

// Cancelar notificação agendada
export async function cancelarLembrete(notificationId: string) {
  await Notifications.cancelScheduledNotificationAsync(notificationId)
}

// Cancelar todas as notificações
export async function cancelarTodosLembretes() {
  await Notifications.cancelAllScheduledNotificationsAsync()
}

// Agendar lembretes para todos os compromissos futuros
export async function agendarLembretesCompromissos(
  compromissos: Array<{
    ID_COMPROMISSO: string
    TITULO: string
    DATA_INICIO: string
    STATUS: string
  }>
) {
  // Cancela todos os lembretes existentes e reagenda
  await cancelarTodosLembretes()

  const agora = new Date()

  for (const c of compromissos) {
    if (c.STATUS === 'CANCELADO') continue

    const dataComp = new Date(c.DATA_INICIO)
    if (dataComp <= agora) continue

    // Agendar 30 min antes
    await agendarLembrete(c.ID_COMPROMISSO, c.TITULO, c.DATA_INICIO, 30)
  }
}
