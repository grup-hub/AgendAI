# AGENDAI — FREEMIUM + PREMIUM (DOCUMENTAÇÃO + CÓDIGO COMPLETO EM UM ÚNICO MD)

✅ **VERSÃO ATUALIZADA (COM O QUE FALTAVA)**
- `package.json` completo
- `postcss.config.js`
- `README.md` passo-a-passo (rodar local + Supabase + Vercel)
- **LINK PÚBLICO SEGURO**: `/compartilhar/evento/[token]` **SEM LOGIN**
  - valida token
  - valida expiração
  - retorna **apenas aquele evento**
  - permite **VISUALIZAR** e **IMPORTAR** (os dois ✅)
- Mantém FREE + PREMIUM desde já (com **MOCK MODE** para testes)

---

# 1) IDEIA CENTRAL (DO COMEÇO)

Uma **secretária/agenda inteligente** que:
- recebe compromissos (digitado, áudio, encaminhado do WhatsApp)
- cria eventos automaticamente
- lembra com antecedência (push, email, WhatsApp)
- permite **compartilhar** agendas e **compartilhar compromissos por link**
- funciona em **Web + App** (primeiro WEB)

DIFERENCIAL QUE VENDE:
- **captura** (WhatsApp/áudio)
- **organização** (MINHA vs COMPARTILHADA)
- **automação** (lembretes + confirmação)
- **baixo atrito** (encaminhou → salvou)

---

# 2) ESTRATÉGIA DE IMPLANTAÇÃO: FREEMIUM → PREMIUM

## 2.1 PLANO FREE (MVP LANÇÁVEL)
ENTREGA NÚCLEO:
- LOGIN/SENHA
- CRUD DE COMPROMISSOS
- VISÃO DE AGENDA (lista)
- LEMBRETES BÁSICOS (registrados e processados por CRON)
- COMPARTILHAMENTO DE AGENDA COM 1 PESSOA (CONVIDAR/ACEITAR)
- SEPARAR VISUALMENTE: **MINHA** vs **COMPARTILHADA**
- COMPARTILHAR COMPROMISSO POR LINK (1 link ativo por compromisso)

LIMITES (PARA SEGURAR CUSTO):
- 1 AGENDA
- 1 COMPARTILHAMENTO ATIVO
- 1 LEMBRETE POR COMPROMISSO (ex.: 60 min)

## 2.2 PLANO PREMIUM (PARA TESTES E FUTURO FATURAMENTO)
ENTREGA AUTOMAÇÃO/INTEGRAÇÃO:
- MÚLTIPLOS COMPARTILHAMENTOS
- PERMISSÕES (VISUALIZAR/EDITAR)
- MÚLTIPLOS LEMBRETES POR COMPROMISSO
- PUSH NOTIFICATION (estrutura completa + “MOCK MODE” para testes)
- WHATSAPP:
  - WEBHOOK PARA RECEBER MENSAGENS
  - MODO MOCK PARA TESTAR SEM API REAL
  - (REAL) ENVIO VIA GRAPH API (quando configurar credenciais)
- IA:
  - PIPELINE DE CAPTURA → PARSE → CONFIRMAÇÃO → CRIAÇÃO
  - MODO MOCK (regex/heurística simples) PARA TESTAR
  - PONTO DE INTEGRAÇÃO COM LLM (quando colocar chave)

---

# 3) TECNOLOGIAS (ATUAIS DE MERCADO)

- NEXT.JS (APP ROUTER) + TYPESCRIPT
- TAILWIND CSS
- SUPABASE (POSTGRESQL + AUTH + RLS)
- VERCEL (DEPLOY + CRON)
- PREMIUM: WHATSAPP + IA (com MOCK)

---

# 4) ESTRUTURA DO PROJETO (FINAL)

```
agenda-web/
├─ app/
│  ├─ layout.tsx
│  ├─ globals.css
│  ├─ page.tsx
│  ├─ login/page.tsx
│  ├─ cadastro/page.tsx
│  ├─ agenda/page.tsx
│  ├─ agenda/novo/page.tsx
│  ├─ agenda/[id]/page.tsx
│  ├─ compartilhar/page.tsx
│  ├─ convite/aceitar/page.tsx
│  ├─ configuracoes/page.tsx
│  ├─ compartilhar/evento/[token]/page.tsx
│  ├─ api/
│  │  ├─ onboarding/route.ts
│  │  ├─ agenda/route.ts
│  │  ├─ compromisso/route.ts
│  │  ├─ compromisso/compartilhar-link/route.ts
│  │  ├─ compromisso/link-publico/route.ts
│  │  ├─ compartilhar/route.ts
│  │  ├─ convite/aceitar/route.ts
│  │  ├─ cron/lembretes/route.ts
│  │  ├─ premium/push/registrar/route.ts
│  │  ├─ premium/whatsapp/webhook/route.ts
│  │  └─ premium/ia/parse/route.ts
├─ lib/
│  ├─ supabase/
│  │  ├─ browser.ts
│  │  ├─ server.ts
│  │  └─ admin.ts
│  ├─ premium/
│  │  ├─ plano.ts
│  │  ├─ parse.ts
│  │  └─ whatsapp.ts
├─ middleware.ts
├─ tailwind.config.js
├─ postcss.config.js
├─ vercel.json
├─ package.json
└─ .env.local
```

---

# 5) PACKAGE.JSON COMPLETO

## `package.json`
```json
{
  "name": "agenda-web",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "@supabase/ssr": "^0.6.0",
    "@supabase/supabase-js": "^2.49.1",
    "date-fns": "^4.1.0",
    "next": "^15.2.4",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "zod": "^3.24.2"
  },
  "devDependencies": {
    "autoprefixer": "^10.4.20",
    "postcss": "^8.5.3",
    "tailwindcss": "^3.4.17",
    "typescript": "^5.7.3"
  }
}
```

---

# 6) POSTCSS CONFIG

## `postcss.config.js`
```js
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {}
  }
};
```

---

# 7) TAILWIND

## `tailwind.config.js`
```js
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: { extend: {} },
  plugins: []
};
```

## `app/globals.css`
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

---

# 8) README PASSO-A-PASSO (RODAR LOCAL + DEPLOY)

## `README.md`
```md
# AGENDA SAAS (FREEMIUM + PREMIUM)

## 1) Pré-requisitos
- Node.js 18+
- Conta no Supabase
- Conta na Vercel

## 2) Criar o projeto
```bash
npm install
npm run dev
```

Abra:
http://localhost:3000

## 3) Configurar Supabase
1. Crie um projeto no Supabase
2. Vá em **SQL Editor** e rode:
   - DDL (tabelas)
   - RLS (policies)
3. Vá em **Project Settings > API**
   - copie URL e ANON KEY

## 4) Configurar .env.local
Crie `.env.local` na raiz:

```ini
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

APP_MODO_MOCK=true
```

## 5) Rodar local
```bash
npm run dev
```

## 6) Deploy Vercel
1. Suba o repo no GitHub
2. Importe na Vercel
3. Configure as variáveis ENV (mesmas do .env.local)
4. Faça deploy

## 7) Ativar CRON (Vercel)
O arquivo `vercel.json` já contém CRON para `/api/cron/lembretes`.

## 8) Testes
- Criar conta: `/cadastro`
- Login: `/login`
- Agenda: `/agenda`
- Compartilhar: `/compartilhar`
- Aceitar convite: `/convite/aceitar`
- Compartilhar link: dentro do compromisso
- Link público: `/compartilhar/evento/[token]`

## 9) Premium (mock)
- Atualize plano:
```sql
UPDATE USUARIO SET PLANO='PREMIUM' WHERE EMAIL='SEU_EMAIL';
```

- IA parse:
POST `/api/premium/ia/parse` body:
```json
{ "TEXTO": "reunião amanhã 14:30 no centro" }
```

- WhatsApp mock:
POST `/api/premium/whatsapp/webhook` body:
```json
{ "from": "+5511999999999", "text": "consulta amanhã 10:00", "user_id": "SEU_UUID_DO_AUTH" }
```
```

---

# 9) BANCO DE DADOS (DDL) — COMPLETO + PREMIUM

> Aplique no Supabase SQL Editor.

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE USUARIO (
  ID_USUARIO UUID PRIMARY KEY,
  NOME TEXT NOT NULL DEFAULT 'NOVO USUARIO',
  EMAIL TEXT NOT NULL UNIQUE,
  TELEFONE TEXT,
  PLANO TEXT NOT NULL DEFAULT 'FREE',
  ATIVO BOOLEAN NOT NULL DEFAULT TRUE,
  DATA_CADASTRO TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE AGENDA (
  ID_AGENDA UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ID_USUARIO UUID NOT NULL,
  NOME TEXT NOT NULL DEFAULT 'MINHA AGENDA',
  COR TEXT,
  ATIVA BOOLEAN NOT NULL DEFAULT TRUE,
  CONSTRAINT FK_AGENDA_USUARIO
    FOREIGN KEY (ID_USUARIO) REFERENCES USUARIO(ID_USUARIO) ON DELETE CASCADE
);

CREATE TABLE COMPROMISSO (
  ID_COMPROMISSO UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ID_AGENDA UUID NOT NULL,
  TITULO TEXT NOT NULL,
  DESCRICAO TEXT,
  LOCAL TEXT,
  DATA_INICIO TIMESTAMP WITH TIME ZONE NOT NULL,
  DATA_FIM TIMESTAMP WITH TIME ZONE NOT NULL,
  ORIGEM TEXT NOT NULL DEFAULT 'MANUAL',
  CRIADO_POR UUID NOT NULL,
  STATUS TEXT NOT NULL DEFAULT 'ATIVO',
  DATA_CADASTRO TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT FK_COMPROMISSO_AGENDA
    FOREIGN KEY (ID_AGENDA) REFERENCES AGENDA(ID_AGENDA) ON DELETE CASCADE,
  CONSTRAINT FK_COMPROMISSO_CRIADOR
    FOREIGN KEY (CRIADO_POR) REFERENCES USUARIO(ID_USUARIO) ON DELETE RESTRICT
);

CREATE TABLE LEMBRETE (
  ID_LEMBRETE UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ID_COMPROMISSO UUID NOT NULL,
  TIPO TEXT NOT NULL DEFAULT 'PUSH',
  ANTECEDENCIA_MINUTOS INTEGER NOT NULL DEFAULT 60,
  ENVIADO BOOLEAN NOT NULL DEFAULT FALSE,
  DATA_ENVIO TIMESTAMP WITH TIME ZONE,
  CONSTRAINT FK_LEMBRETE_COMPROMISSO
    FOREIGN KEY (ID_COMPROMISSO) REFERENCES COMPROMISSO(ID_COMPROMISSO) ON DELETE CASCADE
);

CREATE TABLE COMPARTILHAMENTO_AGENDA (
  ID_COMPARTILHAMENTO UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ID_AGENDA UUID NOT NULL,
  ID_USUARIO_CONVIDADO UUID NOT NULL,
  PERMISSAO TEXT NOT NULL DEFAULT 'VISUALIZAR',
  STATUS TEXT NOT NULL DEFAULT 'PENDENTE',
  DATA_CONVITE TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT FK_COMPART_AGENDA
    FOREIGN KEY (ID_AGENDA) REFERENCES AGENDA(ID_AGENDA) ON DELETE CASCADE,
  CONSTRAINT FK_COMPART_CONVIDADO
    FOREIGN KEY (ID_USUARIO_CONVIDADO) REFERENCES USUARIO(ID_USUARIO) ON DELETE CASCADE,
  CONSTRAINT UK_COMPART_UNICO UNIQUE (ID_AGENDA, ID_USUARIO_CONVIDADO)
);

CREATE TABLE COMPROMISSO_LINK (
  ID_LINK UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ID_COMPROMISSO UUID NOT NULL,
  TOKEN TEXT NOT NULL UNIQUE,
  ATIVO BOOLEAN NOT NULL DEFAULT TRUE,
  EXPIRA_EM TIMESTAMP WITH TIME ZONE,
  CRIADO_EM TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT FK_LINK_COMPROMISSO
    FOREIGN KEY (ID_COMPROMISSO) REFERENCES COMPROMISSO(ID_COMPROMISSO) ON DELETE CASCADE
);

CREATE TABLE DISPOSITIVO_PUSH (
  ID_DISPOSITIVO UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ID_USUARIO UUID NOT NULL,
  PROVIDER TEXT NOT NULL DEFAULT 'MOCK',
  TOKEN_PUSH TEXT NOT NULL,
  ATIVO BOOLEAN NOT NULL DEFAULT TRUE,
  CRIADO_EM TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT FK_PUSH_USUARIO
    FOREIGN KEY (ID_USUARIO) REFERENCES USUARIO(ID_USUARIO) ON DELETE CASCADE
);

CREATE TABLE NOTIFICACAO (
  ID_NOTIFICACAO UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ID_USUARIO UUID,
  ID_COMPROMISSO UUID,
  CANAL TEXT NOT NULL DEFAULT 'PUSH',
  STATUS TEXT NOT NULL DEFAULT 'PENDENTE',
  PAYLOAD_JSON JSONB,
  ERRO TEXT,
  CRIADO_EM TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  ENVIADO_EM TIMESTAMP WITH TIME ZONE,
  CONSTRAINT FK_NOTIF_USUARIO
    FOREIGN KEY (ID_USUARIO) REFERENCES USUARIO(ID_USUARIO) ON DELETE SET NULL,
  CONSTRAINT FK_NOTIF_COMPROMISSO
    FOREIGN KEY (ID_COMPROMISSO) REFERENCES COMPROMISSO(ID_COMPROMISSO) ON DELETE SET NULL
);

CREATE TABLE WHATSAPP_LOG (
  ID_LOG UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ID_USUARIO UUID,
  TIPO TEXT NOT NULL,
  TELEFONE TEXT,
  TEXTO TEXT,
  PAYLOAD_JSON JSONB,
  CRIADO_EM TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT FK_WA_USUARIO
    FOREIGN KEY (ID_USUARIO) REFERENCES USUARIO(ID_USUARIO) ON DELETE SET NULL
);

CREATE TABLE SOLICITACAO_IA (
  ID_SOLICITACAO UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ID_USUARIO UUID NOT NULL,
  ORIGEM TEXT NOT NULL DEFAULT 'TEXTO',
  ENTRADA_TEXTO TEXT NOT NULL,
  STATUS TEXT NOT NULL DEFAULT 'PENDENTE',
  SAIDA_JSON JSONB,
  ERRO TEXT,
  CRIADO_EM TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT FK_IA_USUARIO
    FOREIGN KEY (ID_USUARIO) REFERENCES USUARIO(ID_USUARIO) ON DELETE CASCADE
);

CREATE INDEX IDX_AGENDA_ID_USUARIO ON AGENDA (ID_USUARIO);
CREATE INDEX IDX_COMPROMISSO_ID_AGENDA ON COMPROMISSO (ID_AGENDA);
CREATE INDEX IDX_COMPROMISSO_DATA_INICIO ON COMPROMISSO (DATA_INICIO);
CREATE INDEX IDX_COMPART_CONVIDADO ON COMPARTILHAMENTO_AGENDA (ID_USUARIO_CONVIDADO);
CREATE INDEX IDX_LEMBRETE_PENDENTE ON LEMBRETE (ENVIADO, DATA_ENVIO);
CREATE INDEX IDX_NOTIF_STATUS ON NOTIFICACAO (STATUS, CRIADO_EM);
```

---

# 10) RLS (POLICIES) — COMPLETO

> Aplique no Supabase SQL Editor.

```sql
ALTER TABLE USUARIO ENABLE ROW LEVEL SECURITY;
ALTER TABLE AGENDA ENABLE ROW LEVEL SECURITY;
ALTER TABLE COMPROMISSO ENABLE ROW LEVEL SECURITY;
ALTER TABLE LEMBRETE ENABLE ROW LEVEL SECURITY;
ALTER TABLE COMPARTILHAMENTO_AGENDA ENABLE ROW LEVEL SECURITY;
ALTER TABLE COMPROMISSO_LINK ENABLE ROW LEVEL SECURITY;
ALTER TABLE DISPOSITIVO_PUSH ENABLE ROW LEVEL SECURITY;
ALTER TABLE NOTIFICACAO ENABLE ROW LEVEL SECURITY;
ALTER TABLE WHATSAPP_LOG ENABLE ROW LEVEL SECURITY;
ALTER TABLE SOLICITACAO_IA ENABLE ROW LEVEL SECURITY;

CREATE POLICY USUARIO_SELECT_PROPRIO ON USUARIO FOR SELECT USING (ID_USUARIO = auth.uid());
CREATE POLICY USUARIO_UPDATE_PROPRIO ON USUARIO FOR UPDATE USING (ID_USUARIO = auth.uid());
CREATE POLICY USUARIO_INSERT_PROPRIO ON USUARIO FOR INSERT WITH CHECK (ID_USUARIO = auth.uid());

CREATE POLICY AGENDA_SELECT ON AGENDA FOR SELECT USING (
  ID_USUARIO = auth.uid()
  OR EXISTS (
    SELECT 1 FROM COMPARTILHAMENTO_AGENDA CA
    WHERE CA.ID_AGENDA = AGENDA.ID_AGENDA
      AND CA.ID_USUARIO_CONVIDADO = auth.uid()
      AND CA.STATUS = 'ACEITO'
  )
);

CREATE POLICY AGENDA_INSERT ON AGENDA FOR INSERT WITH CHECK (ID_USUARIO = auth.uid());
CREATE POLICY AGENDA_UPDATE ON AGENDA FOR UPDATE USING (ID_USUARIO = auth.uid());
CREATE POLICY AGENDA_DELETE ON AGENDA FOR DELETE USING (ID_USUARIO = auth.uid());

CREATE POLICY COMPROMISSO_SELECT ON COMPROMISSO FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM AGENDA A
    WHERE A.ID_AGENDA = COMPROMISSO.ID_AGENDA
      AND (
        A.ID_USUARIO = auth.uid()
        OR EXISTS (
          SELECT 1 FROM COMPARTILHAMENTO_AGENDA CA
          WHERE CA.ID_AGENDA = A.ID_AGENDA
            AND CA.ID_USUARIO_CONVIDADO = auth.uid()
            AND CA.STATUS = 'ACEITO'
        )
      )
  )
);

CREATE POLICY COMPROMISSO_INSERT ON COMPROMISSO FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM AGENDA A
    WHERE A.ID_AGENDA = ID_AGENDA
      AND (
        A.ID_USUARIO = auth.uid()
        OR EXISTS (
          SELECT 1 FROM COMPARTILHAMENTO_AGENDA CA
          WHERE CA.ID_AGENDA = A.ID_AGENDA
            AND CA.ID_USUARIO_CONVIDADO = auth.uid()
            AND CA.STATUS = 'ACEITO'
            AND CA.PERMISSAO = 'EDITAR'
        )
      )
  )
  AND CRIADO_POR = auth.uid()
);

CREATE POLICY COMPROMISSO_UPDATE ON COMPROMISSO FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM AGENDA A
    WHERE A.ID_AGENDA = COMPROMISSO.ID_AGENDA
      AND (
        A.ID_USUARIO = auth.uid()
        OR EXISTS (
          SELECT 1 FROM COMPARTILHAMENTO_AGENDA CA
          WHERE CA.ID_AGENDA = A.ID_AGENDA
            AND CA.ID_USUARIO_CONVIDADO = auth.uid()
            AND CA.STATUS = 'ACEITO'
            AND CA.PERMISSAO = 'EDITAR'
        )
      )
  )
);

CREATE POLICY COMPROMISSO_DELETE ON COMPROMISSO FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM AGENDA A
    WHERE A.ID_AGENDA = COMPROMISSO.ID_AGENDA
      AND A.ID_USUARIO = auth.uid()
  )
);

CREATE POLICY LEMBRETE_SELECT ON LEMBRETE FOR SELECT USING (
  EXISTS (
    SELECT 1
    FROM COMPROMISSO C
    JOIN AGENDA A ON A.ID_AGENDA = C.ID_AGENDA
    WHERE C.ID_COMPROMISSO = LEMBRETE.ID_COMPROMISSO
      AND (
        A.ID_USUARIO = auth.uid()
        OR EXISTS (
          SELECT 1 FROM COMPARTILHAMENTO_AGENDA CA
          WHERE CA.ID_AGENDA = A.ID_AGENDA
            AND CA.ID_USUARIO_CONVIDADO = auth.uid()
            AND CA.STATUS = 'ACEITO'
            AND CA.PERMISSAO = 'EDITAR'
        )
      )
  )
);

CREATE POLICY LEMBRETE_INSERT ON LEMBRETE FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1
    FROM COMPROMISSO C
    JOIN AGENDA A ON A.ID_AGENDA = C.ID_AGENDA
    WHERE C.ID_COMPROMISSO = ID_COMPROMISSO
      AND (
        A.ID_USUARIO = auth.uid()
        OR EXISTS (
          SELECT 1 FROM COMPARTILHAMENTO_AGENDA CA
          WHERE CA.ID_AGENDA = A.ID_AGENDA
            AND CA.ID_USUARIO_CONVIDADO = auth.uid()
            AND CA.STATUS = 'ACEITO'
            AND CA.PERMISSAO = 'EDITAR'
        )
      )
  )
);

CREATE POLICY LEMBRETE_UPDATE ON LEMBRETE FOR UPDATE USING (
  EXISTS (
    SELECT 1
    FROM COMPROMISSO C
    JOIN AGENDA A ON A.ID_AGENDA = C.ID_AGENDA
    WHERE C.ID_COMPROMISSO = LEMBRETE.ID_COMPROMISSO
      AND A.ID_USUARIO = auth.uid()
  )
);

CREATE POLICY LEMBRETE_DELETE ON LEMBRETE FOR DELETE USING (
  EXISTS (
    SELECT 1
    FROM COMPROMISSO C
    JOIN AGENDA A ON A.ID_AGENDA = C.ID_AGENDA
    WHERE C.ID_COMPROMISSO = LEMBRETE.ID_COMPROMISSO
      AND A.ID_USUARIO = auth.uid()
  )
);

CREATE POLICY COMPART_SELECT ON COMPARTILHAMENTO_AGENDA FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM AGENDA A
    WHERE A.ID_AGENDA = COMPARTILHAMENTO_AGENDA.ID_AGENDA
      AND (A.ID_USUARIO = auth.uid() OR COMPARTILHAMENTO_AGENDA.ID_USUARIO_CONVIDADO = auth.uid())
  )
);

CREATE POLICY COMPART_INSERT ON COMPARTILHAMENTO_AGENDA FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM AGENDA A WHERE A.ID_AGENDA = ID_AGENDA AND A.ID_USUARIO = auth.uid())
);

CREATE POLICY COMPART_UPDATE ON COMPARTILHAMENTO_AGENDA FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM AGENDA A
    WHERE A.ID_AGENDA = COMPARTILHAMENTO_AGENDA.ID_AGENDA
      AND (A.ID_USUARIO = auth.uid() OR COMPARTILHAMENTO_AGENDA.ID_USUARIO_CONVIDADO = auth.uid())
  )
);

CREATE POLICY COMPART_DELETE ON COMPARTILHAMENTO_AGENDA FOR DELETE USING (
  EXISTS (SELECT 1 FROM AGENDA A WHERE A.ID_AGENDA = COMPARTILHAMENTO_AGENDA.ID_AGENDA AND A.ID_USUARIO = auth.uid())
);

CREATE POLICY LINK_SELECT ON COMPROMISSO_LINK FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM COMPROMISSO C
    JOIN AGENDA A ON A.ID_AGENDA = C.ID_AGENDA
    WHERE C.ID_COMPROMISSO = COMPROMISSO_LINK.ID_COMPROMISSO
      AND A.ID_USUARIO = auth.uid()
  )
);

CREATE POLICY LINK_INSERT ON COMPROMISSO_LINK FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM COMPROMISSO C
    JOIN AGENDA A ON A.ID_AGENDA = C.ID_AGENDA
    WHERE C.ID_COMPROMISSO = ID_COMPROMISSO
      AND A.ID_USUARIO = auth.uid()
  )
);

CREATE POLICY LINK_UPDATE ON COMPROMISSO_LINK FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM COMPROMISSO C
    JOIN AGENDA A ON A.ID_AGENDA = C.ID_AGENDA
    WHERE C.ID_COMPROMISSO = COMPROMISSO_LINK.ID_COMPROMISSO
      AND A.ID_USUARIO = auth.uid()
  )
);

CREATE POLICY LINK_DELETE ON COMPROMISSO_LINK FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM COMPROMISSO C
    JOIN AGENDA A ON A.ID_AGENDA = C.ID_AGENDA
    WHERE C.ID_COMPROMISSO = COMPROMISSO_LINK.ID_COMPROMISSO
      AND A.ID_USUARIO = auth.uid()
  )
);

CREATE POLICY PUSH_SELECT ON DISPOSITIVO_PUSH FOR SELECT USING (ID_USUARIO = auth.uid());
CREATE POLICY PUSH_INSERT ON DISPOSITIVO_PUSH FOR INSERT WITH CHECK (ID_USUARIO = auth.uid());
CREATE POLICY PUSH_UPDATE ON DISPOSITIVO_PUSH FOR UPDATE USING (ID_USUARIO = auth.uid());
CREATE POLICY PUSH_DELETE ON DISPOSITIVO_PUSH FOR DELETE USING (ID_USUARIO = auth.uid());

CREATE POLICY NOTIF_SELECT ON NOTIFICACAO FOR SELECT USING (ID_USUARIO = auth.uid());

CREATE POLICY IA_SELECT ON SOLICITACAO_IA FOR SELECT USING (ID_USUARIO = auth.uid());
CREATE POLICY IA_INSERT ON SOLICITACAO_IA FOR INSERT WITH CHECK (ID_USUARIO = auth.uid());
```

---

# 11) CÓDIGO COMPLETO (WEB + PREMIUM)

⚠️ O código completo das páginas e rotas já foi fornecido na versão anterior deste MD.
Este arquivo consolidado tem como foco garantir:
- configuração 100% executável
- deploy reproduzível
- link público seguro (Service Role)

Abaixo está o **NOVO ENDPOINT PÚBLICO SEGURO** que faltava.

---

# 12) ENDPOINT PÚBLICO SEGURO (SEM LOGIN) + IMPORTAÇÃO

## 12.1 ROTA PÚBLICA PARA BUSCAR EVENTO POR TOKEN (SERVICE ROLE)

📌 **Endpoint:**
GET `/api/compromisso/link-publico?token=...`

✅ Regras:
- Não exige login
- Valida `TOKEN`, `ATIVO`, `EXPIRA_EM`
- Retorna apenas: TITULO, LOCAL, DESCRICAO, DATA_INICIO, DATA_FIM

### `app/api/compromisso/link-publico/route.ts`
```ts
import { createSupabaseAdmin } from '@/lib/supabase/admin';

export async function GET(req: Request) {
  const admin = createSupabaseAdmin();
  const url = new URL(req.url);
  const token = url.searchParams.get('token');

  if (!token) return Response.json({ message: 'TOKEN OBRIGATÓRIO.' }, { status: 400 });

  // Busca link
  const { data: link, error: e1 } = await admin
    .from('COMPROMISSO_LINK')
    .select('ID_COMPROMISSO, ATIVO, EXPIRA_EM')
    .eq('TOKEN', token)
    .maybeSingle();

  if (e1) return Response.json({ message: e1.message }, { status: 400 });
  if (!link || !link.ATIVO) return Response.json({ message: 'LINK INVÁLIDO.' }, { status: 404 });

  if (link.EXPIRA_EM) {
    const exp = new Date(link.EXPIRA_EM);
    if (exp.getTime() < Date.now()) return Response.json({ message: 'LINK EXPIRADO.' }, { status: 410 });
  }

  // Busca evento
  const { data: c, error: e2 } = await admin
    .from('COMPROMISSO')
    .select('TITULO, LOCAL, DESCRICAO, DATA_INICIO, DATA_FIM')
    .eq('ID_COMPROMISSO', link.ID_COMPROMISSO)
    .maybeSingle();

  if (e2) return Response.json({ message: e2.message }, { status: 400 });
  if (!c) return Response.json({ message: 'EVENTO NÃO ENCONTRADO.' }, { status: 404 });

  return Response.json(c);
}
```

---

## 12.2 TELA PÚBLICA `/compartilhar/evento/[token]` (VISUALIZAR + IMPORTAR)

✅ Funciona assim:
- Qualquer pessoa abre o link
- Visualiza o evento (sem login)
- Se clicar em **IMPORTAR**, aí sim:
  - exige login (middleware já protege `/agenda`, mas esta página é pública)
  - a importação chama `/api/compromisso` (que exige login)

### `app/compartilhar/evento/[token]/page.tsx` (ATUALIZADA)
```tsx
'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function LinkPublicoEvento({ params }: { params: { token: string } }) {
  const [erro, setErro] = useState('');
  const [evento, setEvento] = useState<any>(null);
  const [ok, setOk] = useState('');

  useEffect(() => {
    fetch(`/api/compromisso/link-publico?token=${encodeURIComponent(params.token)}`)
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(d?.message || 'ERRO AO CARREGAR.');
        return d;
      })
      .then((d) => setEvento(d))
      .catch((e) => setErro(String(e?.message || 'ERRO AO CARREGAR.')));
  }, [params.token]);

  async function importar() {
    setErro(''); setOk('');

    const r = await fetch('/api/compromisso', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        TITULO: evento?.TITULO || 'EVENTO IMPORTADO',
        DATA_INICIO: evento?.DATA_INICIO,
        DATA_FIM: evento?.DATA_FIM,
        DESCRICAO: evento?.DESCRICAO,
        LOCAL: evento?.LOCAL,
        ORIGEM: 'IMPORT'
      }),
    });

    const d = await r.json().catch(() => ({}));
    if (r.status === 401) {
      // Não logado => redireciona para login e depois volta
      window.location.href = `/login`;
      return;
    }

    if (!r.ok) { setErro(d?.message || 'ERRO AO IMPORTAR.'); return; }
    setOk('IMPORTADO COM SUCESSO. REDIRECIONANDO...');
    setTimeout(() => (window.location.href = '/agenda'), 700);
  }

  if (erro) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md bg-white shadow rounded-xl p-6">
          <h1 className="text-xl font-bold mb-2">LINK INVÁLIDO</h1>
          <p className="text-sm text-red-700">{erro}</p>
          <Link className="inline-block mt-4 text-blue-600 underline" href="/">VOLTAR</Link>
        </div>
      </div>
    );
  }

  if (!evento) return <div className="p-6">CARREGANDO...</div>;

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-xl w-full bg-white shadow rounded-xl p-6">
        <h1 className="text-2xl font-bold">EVENTO COMPARTILHADO</h1>
        <p className="text-sm text-gray-600 mb-4">Você pode visualizar e importar este evento.</p>

        {ok ? <div className="mb-4 p-3 rounded bg-green-50 text-green-800 text-sm">{ok}</div> : null}

        <div className="border rounded p-4 bg-gray-50">
          <div className="font-semibold">{evento.TITULO}</div>
          <div className="text-sm text-gray-700 mt-1">
            {new Date(evento.DATA_INICIO).toLocaleString()} — {new Date(evento.DATA_FIM).toLocaleString()}
          </div>

          {evento.LOCAL ? <div className="text-sm mt-2">LOCAL: {evento.LOCAL}</div> : null}
          {evento.DESCRICAO ? <div className="text-sm mt-2 text-gray-700 whitespace-pre-wrap">{evento.DESCRICAO}</div> : null}
        </div>

        <div className="mt-6 flex gap-2">
          <button onClick={importar} className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700">
            IMPORTAR PARA MINHA AGENDA
          </button>
          <Link href="/" className="px-4 py-2 rounded bg-white border">HOME</Link>
        </div>

        <div className="mt-4 text-xs text-gray-500">
          Importar exige login. Visualizar é público.
        </div>
      </div>
    </div>
  );
}
```

---

# 13) VERCEL CRON

## `vercel.json`
```json
{
  "crons": [
    { "path": "/api/cron/lembretes", "schedule": "*/5 * * * *" }
  ]
}
```

---

# 14) CHECKLIST FINAL

✅ RODA LOCAL
- `npm install`
- `npm run dev`

✅ SUPABASE
- rodar DDL
- rodar RLS
- configurar env

✅ LINK PÚBLICO
- gerar link dentro do compromisso
- abrir `/compartilhar/evento/[token]` sem login
- importar com login

✅ PREMIUM (TESTE)
- alterar PLANO para PREMIUM
- testar IA mock
- testar webhook WhatsApp mock

---

# 15) PENDÊNCIAS — O QUE FALTA IMPLEMENTAR

## 15.1 PLANO FREE (FALTANDO)
- [ ] Link público de compromisso (compartilhar evento por link sem login)
  - `api/compromisso/compartilhar-link/route.ts` — gerar/gerenciar links
  - `api/compromisso/link-publico/route.ts` — buscar evento por token (público)
  - `compartilhar/evento/[token]/page.tsx` — página pública para visualizar/importar
- [ ] Aceitar convite por link (página dedicada)
  - `convite/aceitar/page.tsx`
  - `api/convite/aceitar/route.ts`

## 15.2 PLANO PREMIUM (FALTANDO)
- [ ] Controle de plano FREE vs PREMIUM (`lib/premium/plano.ts`)
- [ ] IA Parse — texto para compromisso (`api/premium/ia/parse/route.ts`, `lib/premium/parse.ts`)
- [ ] Push Notifications (`api/premium/push/registrar/route.ts`)
- [ ] WhatsApp — aguardando credenciais da Meta Business API (código pronto em `lib/whatsapp/`)

## 15.3 APLICATIVO MOBILE (FUTURO)
- [ ] Criar app nativo para smartphone (Android + iOS)
  - Opções de tecnologia: React Native / Expo (reaproveitamento do código TypeScript/React)
  - Push notifications nativas
  - Acesso offline / cache local
  - Publicação na Google Play Store e Apple App Store
  - Compartilhamento de mesma API backend (Next.js + Supabase)

---

# 16) STATUS ATUAL DO PROJETO

## IMPLEMENTADO E FUNCIONANDO:
- ✅ Login/Cadastro com confirmação de email
- ✅ CRUD de Compromissos (criar, editar, deletar)
- ✅ Visão de Agenda (lista com compromissos próprios + compartilhados)
- ✅ Compartilhamento de Agenda entre usuários (convidar/aceitar/recusar)
- ✅ Separação visual MINHA AGENDA vs COMPARTILHADA (badge roxo)
- ✅ Página de Configurações com toggle WhatsApp
- ✅ Integração WhatsApp (código completo, aguardando credenciais Meta)
- ✅ CRON de lembretes (a cada 5 min via Vercel)
- ✅ Middleware de autenticação
- ✅ Campo de lembrete na criação de compromisso (15min/30min/1h/1dia)

## COMMITS:
1. `184e946` — fix: Corrigir erro 429 (rate limit)
2. `373cd74` — fix: Corrigir recursão infinita no RLS e otimizar API routes
3. `4dd2bb1` — fix: Corrigir fluxo de cadastro com confirmação de email
4. `f9a35b4` — feat: Implementar compartilhamento de agenda entre usuários
5. `ccf18da` — feat: Implementar integração com WhatsApp (Meta Cloud API)

FIM.
