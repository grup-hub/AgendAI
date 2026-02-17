# AgendAI - Contexto Completo do Projeto

> Última atualização: 2026-02-17

---

## 1. VISÃO GERAL

**AgendAI** é um sistema de agenda pessoal com IA, compartilhamento e integração com WhatsApp. Disponível como web app e aplicativo Android.

### Proposta de valor
- Agenda pessoal com calendário interativo
- Compartilhamento de agendas com outros usuários (permissões)
- Compartilhamento de compromissos individuais
- Lembretes automáticos via WhatsApp
- Criação de compromissos pelo WhatsApp (linguagem natural)
- Copa 2026: importar jogos como compromissos
- Marcação de compromissos urgentes (ponto vermelho no calendário)

---

## 2. STACK TECNOLÓGICO

| Camada | Tecnologia | Versão |
|--------|-----------|--------|
| Web Framework | Next.js (App Router) | 15.2.4 |
| UI Web | React | 19.0.0 |
| Estilo Web | Tailwind CSS | 3.4.17 |
| Mobile Framework | React Native + Expo | RN 0.81.5 / Expo 54 |
| Navegação Mobile | React Navigation | 7.x |
| Banco de Dados | Supabase (PostgreSQL) | - |
| Autenticação | Supabase Auth (email/senha) | - |
| ORM/Client DB | @supabase/supabase-js | 2.49.1 |
| Calendário Mobile | react-native-calendars | 1.1314.0 |
| Notificações Mobile | expo-notifications | 0.32.16 |
| WhatsApp API | Meta Cloud API | v21.0 |
| Placares Copa | TheSportsDB | - |
| Deploy Web | Vercel (com CRON Jobs) | - |
| Deploy Mobile | GitHub Actions + Firebase App Distribution | - |
| Build Mobile | Gradle (Android) + EAS | - |
| CI/CD | GitHub Actions | - |
| Ícones Mobile | sharp (SVG → PNG) | - |
| Linguagem | TypeScript | 5.7.3 |

---

## 3. SAAS / SERVIÇOS EXTERNOS

### 3.1 Supabase
- **URL**: `https://wlmhtuqbzyethknlggwg.supabase.co`
- **Project ref**: `wlmhtuqbzyethknlggwg`
- **Região**: AWS us-west-2
- **Plano**: Free
- **Recursos usados**:
  - PostgreSQL (banco de dados)
  - Supabase Auth (autenticação)
  - Row Level Security (RLS)
  - REST API automática
  - Supabase SSR (cookies para Next.js)
- **Conexão direta**: `postgresql://postgres.wlmhtuqbzyethknlggwg:...@aws-0-us-west-2.pooler.supabase.com:6543/postgres`

### 3.2 Vercel
- Deploy automático do Next.js a cada push no `main`
- CRON Job: `/api/cron/lembretes` a cada 5 minutos
- Variáveis de ambiente gerenciadas no painel Vercel

### 3.3 Firebase App Distribution
- Distribuição do APK Android para testers
- Upload automático via GitHub Actions
- **App ID**: em `secrets.FIREBASE_APP_ID`
- **Token**: em `secrets.FIREBASE_TOKEN`

### 3.4 Meta Cloud API (WhatsApp)
- Envio de lembretes via WhatsApp
- Webhook para receber mensagens
- Template aprovado: `lembrete_compromisso` (pt_BR)
- Criação de compromissos via chat (NLP simples)
- Variáveis: `WHATSAPP_PHONE_ID`, `WHATSAPP_API_TOKEN`, `WHATSAPP_VERIFY_TOKEN`

### 3.5 TheSportsDB
- API gratuita de dados esportivos
- Usada para placares em tempo real da Copa 2026
- Cache: 1h para fixtures, 15min para placares

### 3.6 GitHub
- Repositório: `https://github.com/grup-hub/AgendAI`
- Branch principal: `main`
- Remote: `upstream`
- GitHub Actions para build do APK

---

## 4. SCHEMA DO BANCO DE DADOS

### Tabelas

#### USUARIO
```sql
ID_USUARIO    UUID  PK
NOME          TEXT
EMAIL         TEXT  UNIQUE
TELEFONE      TEXT  nullable
PLANO         TEXT  default 'FREE'  -- FREE | PREMIUM
DATA_CADASTRO TIMESTAMP
```

#### AGENDA
```sql
ID_AGENDA    UUID  PK
ID_USUARIO   UUID  FK → USUARIO
NOME         TEXT
DATA_CRIACAO TIMESTAMP
-- 1 agenda por usuário
```

#### COMPROMISSO
```sql
ID_COMPROMISSO UUID  PK
ID_AGENDA      UUID  FK → AGENDA
TITULO         TEXT
DESCRICAO      TEXT  nullable
LOCAL          TEXT  nullable
DATA_INICIO    TIMESTAMP
DATA_FIM       TIMESTAMP
ORIGEM         TEXT  -- MANUAL | WHATSAPP | COPA2026 | COMPARTILHADO
STATUS         TEXT  -- ATIVO | CANCELADO | CONFIRMADO
URGENTE        BOOLEAN  default FALSE  ← adicionado em 2026-02-17
CRIADO_POR     UUID  FK → USUARIO
DATA_CADASTRO  TIMESTAMP
```

#### LEMBRETE
```sql
ID_LEMBRETE          UUID  PK
ID_COMPROMISSO       UUID  FK → COMPROMISSO
TIPO                 TEXT  -- WHATSAPP | PUSH
ANTECEDENCIA_MINUTOS INT
ENVIADO              BOOLEAN  default FALSE
DATA_ENVIO           TIMESTAMP  nullable
DATA_CRIACAO         TIMESTAMP
```

#### COMPARTILHAMENTO_AGENDA
```sql
ID_COMPARTILHAMENTO  UUID  PK
ID_AGENDA            UUID  FK → AGENDA
ID_USUARIO_CONVIDADO UUID  FK → USUARIO
PERMISSAO            TEXT  -- VISUALIZAR | EDITAR
STATUS               TEXT  -- PENDENTE | ACEITO | RECUSADO
DATA_CONVITE         TIMESTAMP
```

#### COMPARTILHAMENTO_COMPROMISSO
```sql
ID                        UUID  PK
ID_COMPROMISSO_ORIGEM     UUID  FK → COMPROMISSO
ID_COMPROMISSO_COPIA      UUID  FK → COMPROMISSO  nullable
ID_USUARIO_REMETENTE      UUID  FK → USUARIO
ID_USUARIO_DESTINATARIO   UUID  FK → USUARIO
STATUS                    TEXT  -- PENDENTE | ACEITO | RECUSADO
DATA_COMPARTILHAMENTO     TIMESTAMP
```

#### DISPOSITIVO_PUSH
```sql
ID_DISPOSITIVO UUID  PK
ID_USUARIO     UUID  FK → USUARIO
PROVIDER       TEXT  -- WHATSAPP | FCM
TOKEN_PUSH     TEXT  -- telefone ou FCM token
ATIVO          BOOLEAN
DATA_CRIACAO   TIMESTAMP
```

#### NOTIFICACAO
```sql
ID             UUID  PK
ID_USUARIO     UUID  FK → USUARIO
ID_COMPROMISSO UUID  FK → COMPROMISSO  nullable
CANAL          TEXT  -- WHATSAPP | PUSH | EMAIL
STATUS         TEXT  -- ENVIADO | ERRO | PENDENTE
PAYLOAD_JSON   JSONB
ERRO           TEXT  nullable
ENVIADO_EM     TIMESTAMP nullable
```

#### WHATSAPP_LOG
```sql
ID           UUID  PK
ID_USUARIO   UUID  nullable
TIPO         TEXT  -- MESSAGE_SENT | MESSAGE_FAILED | WEBHOOK_RECEIVED | WEBHOOK_ERROR
TELEFONE     TEXT
TEXTO        TEXT
PAYLOAD_JSON JSONB
CRIADO_EM    TIMESTAMP
```

### RLS (Row Level Security)
- Cada usuário acessa apenas seus próprios dados
- Compartilhamentos permitem leitura cruzada entre usuários
- Admin client (service role) bypassar RLS nas API routes

---

## 5. ESTRUTURA DE ARQUIVOS

```
agendai/
├── app/                              # Next.js App Router
│   ├── page.tsx                      # Landing page
│   ├── login/page.tsx
│   ├── cadastro/page.tsx
│   ├── agenda/
│   │   ├── page.tsx                  # Dashboard principal (calendário + lista)
│   │   ├── novo/page.tsx             # Novo compromisso
│   │   └── [id]/page.tsx             # Detalhes/edição de compromisso
│   ├── compartilhar/page.tsx         # Gerenciar compartilhamentos
│   ├── configuracoes/page.tsx        # Perfil + WhatsApp
│   ├── copa2026/page.tsx             # Jogos da Copa
│   └── api/
│       ├── compromisso/route.ts      # CRUD compromissos
│       ├── compartilhamento/route.ts # Compartilhamento de agendas
│       ├── compartilhamento-compromisso/route.ts
│       ├── configuracoes/route.ts
│       ├── copa2026/route.ts
│       ├── onboarding/route.ts
│       ├── migrate-urgente/route.ts  # migração (temporária)
│       ├── cron/lembretes/route.ts   # CRON WhatsApp
│       └── webhook/whatsapp/route.ts # Webhook Meta
│
├── mobile/
│   ├── app.json                      # Configuração Expo
│   ├── assets/
│   │   ├── icon.png                  # Ícone (1024x1024, cantos arredondados)
│   │   ├── adaptive-icon.png         # Ícone Android (1024x1024, sem cantos)
│   │   ├── splash-icon.png           # Splash screen
│   │   └── favicon.png               # Web favicon (64x64)
│   └── src/
│       ├── screens/
│       │   ├── LoginScreen.tsx
│       │   ├── CadastroScreen.tsx
│       │   ├── AgendaScreen.tsx
│       │   ├── NovoCompromissoScreen.tsx
│       │   ├── DetalhesCompromissoScreen.tsx
│       │   ├── CompartilhamentoScreen.tsx
│       │   ├── ConfiguracoesScreen.tsx
│       │   └── Copa2026Screen.tsx
│       ├── contexts/AuthContext.tsx
│       ├── navigation/AppNavigator.tsx
│       └── lib/
│           ├── api.ts
│           ├── supabase.ts
│           └── notifications.ts
│
├── lib/
│   ├── supabase/
│   │   ├── server.ts                 # SSR client (cookies)
│   │   ├── browser.ts                # Browser singleton
│   │   └── admin.ts                  # Service role (bypassar RLS)
│   └── whatsapp/
│       ├── config.ts
│       ├── phone.ts                  # Normalização E.164
│       ├── sender.ts                 # Envio de mensagens
│       └── parser.ts                 # NLP simples
│
├── .github/workflows/
│   └── deploy-mobile.yml             # CI/CD Android
│
├── middleware.ts                     # Proteção de rotas
├── vercel.json                       # CRON config
├── generate-icons.js                 # Gerador de ícones (sharp)
├── CONTEXTO.md                       # Este arquivo
└── .env.local                        # Variáveis de ambiente (NÃO commitar!)
```

---

## 6. ROTAS DA API

| Rota | Métodos | Descrição |
|------|---------|-----------|
| `/api/compromisso` | GET, POST, PUT, DELETE | CRUD compromissos |
| `/api/compartilhamento` | GET, POST, PUT, DELETE | Compartilhamento de agendas |
| `/api/compartilhamento-compromisso` | GET, POST, PUT, DELETE | Compartilhamento de compromissos |
| `/api/configuracoes` | GET, PUT | Perfil + WhatsApp |
| `/api/copa2026` | GET, POST | Jogos da Copa 2026 |
| `/api/onboarding` | POST | Criar usuário/agenda após login |
| `/api/cron/lembretes` | GET | CRON: enviar lembretes WhatsApp |
| `/api/webhook/whatsapp` | GET, POST | Webhook Meta Cloud API |
| `/api/migrate-urgente` | POST | Migração campo URGENTE (temporária) |

---

## 7. FUNCIONALIDADES IMPLEMENTADAS

### Web + Mobile (ambos)
- [x] Login e cadastro (email/senha)
- [x] Calendário interativo com navegação por mês
- [x] Pontos coloridos nos dias: azul (normal), vermelho (urgente), roxo (compartilhado)
- [x] CRUD completo de compromissos
- [x] Campo URGENTE (toggle) com visual diferenciado
- [x] Campo LOCAL em largura total no formulário
- [x] Compartilhamento de agendas (VISUALIZAR/EDITAR)
- [x] Compartilhamento de compromissos individuais
- [x] Lembretes por WhatsApp (X minutos antes)
- [x] Configurações de perfil e WhatsApp
- [x] Copa 2026: 72 jogos importáveis com placares em tempo real

### Apenas Web
- [x] Cards de compromissos clicáveis
- [x] Modo calendário + modo lista na agenda
- [x] Bandeiras de países (flagcdn.com) na Copa 2026
- [x] Emojis de bandeira dos países

### Apenas Mobile (APK)
- [x] App nativo Android (.apk)
- [x] Ícone customizado: calendário azul/roxo + "AgendAI"
- [x] Push notifications (expo-notifications)
- [x] Navegação com Bottom Tabs

---

## 8. ÍCONE DO APP MOBILE

### Design atual
- Fundo: gradiente azul (#2563EB) → roxo (#7C3AED)
- Calendário branco com header azul escuro (#1E3A8A)
- Presilhas/pegs roxo claro (#C4B5FD)
- Grid de pontos azuis (3x4)
- Checkmark em um ponto destacado
- Texto "AgendAI" em branco abaixo

### Arquivos
- `mobile/assets/icon.png` — ícone com cantos arredondados (Play Store/iOS)
- `mobile/assets/adaptive-icon.png` — mesmo design, sem cantos (para Android adaptive icon)
- `mobile/assets/splash-icon.png` — splash screen
- `mobile/assets/favicon.png` — web 64x64

### Como regenerar
```bash
node generate-icons.js
```

---

## 9. BUILD E DEPLOY MOBILE

### Build local (para emulador/testes)
```bash
# 1. Regenerar ícones (se necessário)
node generate-icons.js

# 2. Limpar pasta android e fazer prebuild
rm -rf mobile/android
cd mobile && npx expo prebuild --platform android

# 3. Criar local.properties (SDK path)
echo "sdk.dir=C\:\\Users\\work\\AppData\\Local\\Android\\Sdk" > mobile/android/local.properties

# 4. Build APK release
export JAVA_HOME="/c/Program Files/Android/Android Studio/jbr"
cd mobile/android && ./gradlew assembleRelease --no-daemon

# 5. Copiar APK
cp mobile/android/app/build/outputs/apk/release/app-release.apk mobile/agendai.apk

# 6. Instalar no emulador
/c/Users/work/AppData/Local/Android/Sdk/platform-tools/adb.exe uninstall com.agendai.app
/c/Users/work/AppData/Local/Android/Sdk/platform-tools/adb.exe install mobile/agendai.apk
```

### Build automático (Firebase)
- Push para `main` com mudanças em `mobile/**`
- GitHub Actions executa `.github/workflows/deploy-mobile.yml`
- APK enviado para Firebase App Distribution automaticamente

### Secrets necessários no GitHub
- `KEYSTORE_BASE64` — certificado de assinatura (base64)
- `KEYSTORE_PASSWORD` — senha do keystore
- `FIREBASE_APP_ID` — ID do app no Firebase
- `FIREBASE_TOKEN` — token de acesso Firebase

### Info do app
- Package: `com.agendai.app`
- adb path: `/c/Users/work/AppData/Local/Android/Sdk/platform-tools/adb.exe`
- APK local: `mobile/agendai.apk`

---

## 10. VARIÁVEIS DE AMBIENTE

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://wlmhtuqbzyethknlggwg.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[jwt anon]
SUPABASE_SERVICE_ROLE_KEY=[jwt service role]
DATABASE_URL=postgresql://postgres.wlmhtuqbzyethknlggwg:[senha]@aws-0-us-west-2.pooler.supabase.com:6543/postgres

# WhatsApp Meta Cloud API
WHATSAPP_PHONE_ID=[phone_id]
WHATSAPP_API_TOKEN=[bearer_token]
WHATSAPP_VERIFY_TOKEN=[verify_token]

# CRON
CRON_SECRET=[secret]

# Dev
APP_MODO_MOCK=true
```

---

## 11. HISTÓRICO DE COMMITS RELEVANTES

| Commit | Descrição |
|--------|-----------|
| `1ecadd5` | feat(mobile): ajuste do ícone adaptativo - calendário maior |
| `c2c642c` | feat: campo urgente em compromissos + ajuste campo local |
| `af05d81` | fix(ci): remover grupo 'testers' do Firebase App Distribution |
| `033a827` | feat(mobile): novo ícone do app - design calendário azul/roxo |
| `0795267` | fix(web/mobile): restaurar emojis de bandeira no mobile + imagens no web |
| `e950a5f` | fix(web): usar imagens de bandeira (flagcdn.com) na página Copa 2026 |
| `a602379` | feat(web): detalhes de compromisso + cards clicáveis na agenda |

---

## 12. STATUS ATUAL (2026-02-17)

- Branch: `main`, tudo commitado e sincronizado
- Web: deployada no Vercel (automático)
- Mobile: build rodando no GitHub Actions (run `22085333723`)
- Firebase App Distribution: APK sendo enviado
- Banco: coluna `URGENTE` adicionada na tabela `COMPROMISSO`
- Sem pendências críticas

---

## 13. PRÓXIMAS IDEIAS / BACKLOG

- [ ] Notificações push nativas (mobile)
- [ ] Modo offline no app
- [ ] Versão iOS
- [ ] Plano PREMIUM com mais funcionalidades
- [ ] Integração com Google Calendar
- [ ] Repetição de compromissos (diário, semanal, mensal)
- [ ] Filtros na agenda (por status, urgência, origem)
- [ ] Dashboard com estatísticas de compromissos
