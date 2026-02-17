# Pendências Técnicas - AgendAI

## 🔔 Push Notifications Reais (Opção 2)

**Contexto:**
Hoje as notificações de compartilhamento funcionam via notificação local (Opção 1) —
o app verifica quando abre/volta ao foreground e dispara uma notificação local se houver
compartilhamentos pendentes novos.

**O que falta implementar:**
Notificações push reais, que chegam mesmo com o app fechado.

**Stack necessária:**
- Firebase Cloud Messaging (FCM) — para Android
- Integrar Expo com Play Store (Expo + FCM)
- Backend (Vercel): salvar Expo Push Token no Supabase ao logar
- Backend (Vercel): chamar API Expo Push ao compartilhar compromisso

**Fluxo final:**
```
Usuário A compartilha compromisso
    ↓
Backend (Vercel) busca Push Token do Usuário B no Supabase
    ↓
Vercel → Expo Push Service → FCM → Dispositivo do Usuário B
    ↓
Notificação chega mesmo com app fechado ✅
```

**Pré-requisito:**
- Fazer integração do Expo com Play Store primeiro
- Configurar Firebase Console + google-services.json

---

## Outras pendências

*(adicionar conforme surgirem)*
