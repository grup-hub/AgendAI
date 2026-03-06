# 🖥️ Setup AgendAI em Novo PC

## 1. Copiar o Projeto

Copie a pasta completa `Sistema_Agendai` para o novo PC.
> Os arquivos `.env.local` e o keystore Android já estão dentro — não precisa recriar.

---

## 2. Instalar Ferramentas

### Node.js
- Baixar em: https://nodejs.org (versão 18 ou superior)
- Verificar: `node -v` e `npm -v`

### Android Studio
- Baixar em: https://developer.android.com/studio
- Durante a instalação, marcar:
  - ✅ Android SDK
  - ✅ Android Virtual Device (AVD)
- Após instalar, abrir o SDK Manager e garantir que está instalado:
  - Android SDK Platform (API 34 ou superior)
  - Android SDK Build-Tools

### Variáveis de Ambiente (Windows)
Adicionar nas variáveis de ambiente do sistema:

```
ANDROID_HOME = C:\Users\<seu-usuario>\AppData\Local\Android\Sdk
JAVA_HOME    = C:\Program Files\Android\Android Studio\jbr
```

E adicionar ao PATH:
```
%ANDROID_HOME%\platform-tools
%ANDROID_HOME%\tools
```

### Vercel CLI
```bash
npm install -g vercel
```

---

## 3. Instalar Dependências do Projeto

```bash
# Dependências da parte Web (Next.js)
cd D:\TRABALHO\Sistema_Agendai\agendai
npm install

# Dependências da parte Mobile (React Native)
cd mobile
npm install
```

---

## 4. Configurar Vercel

```bash
cd D:\TRABALHO\Sistema_Agendai\agendai

# Fazer login na sua conta Vercel
vercel login

# Vincular ao projeto existente
vercel link
# → Selecionar: thiagos-projects-7e458487 / agendai
```

---

## 5. Criar Emulador Android

1. Abrir **Android Studio**
2. Ir em **Device Manager** (ícone de celular na barra lateral)
3. Clicar em **Create Virtual Device**
4. Escolher um dispositivo (ex: Pixel 6)
5. Escolher uma imagem do sistema (ex: API 34 - Android 14)
6. Finalizar e iniciar o emulador

---

## 6. Testar se Está Tudo OK

```bash
# Verificar se o emulador é detectado
adb devices

# Rodar a versão web localmente
cd D:\TRABALHO\Sistema_Agendai\agendai
npm run dev
# Abrir: http://localhost:3000

# Buildar APK e instalar no emulador
cd mobile\android
gradlew assembleRelease
adb install -r app\build\outputs\apk\release\app-release.apk
```

---

## 7. Deploy (quando precisar publicar)

```bash
cd D:\TRABALHO\Sistema_Agendai\agendai

# Deploy web para produção
npx vercel --prod
```

---

## ✅ Checklist Resumido

- [ ] Pasta do projeto copiada
- [ ] Node.js instalado (`node -v`)
- [ ] Android Studio instalado com SDK e AVD
- [ ] Variáveis `ANDROID_HOME` e `JAVA_HOME` configuradas
- [ ] `npm install` rodado na raiz e em `/mobile`
- [ ] `vercel login` + `vercel link` executados
- [ ] Emulador criado e rodando (`adb devices`)
- [ ] Build APK funcionando (`gradlew assembleRelease`)
