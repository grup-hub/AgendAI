# AgendAI - Sistema de Agendamento Inteligente

Sistema SaaS completo de agendamento online com compartilhamento de agendas e lembretes automáticos.

## 🚀 Características

### Plano FREE
- ✅ CRUD de compromissos
- ✅ 1 agenda pessoal
- ✅ 1 compartilhamento ativo
- ✅ 1 lembrete por compromisso
- ✅ Compartilhar compromisso por link público

### Plano PREMIUM (em desenvolvimento)
- 🚀 Múltiplos compartilhamentos
- 🚀 Múltiplos lembretes
- 🚀 Push notifications
- 🚀 Integração WhatsApp
- 🚀 IA para parsing de texto

## 📋 Pré-requisitos

- Node.js 18+
- Conta no [Supabase](https://supabase.com)
- Conta na [Vercel](https://vercel.com)

## 🛠️ Instalação

1. **Clone o repositório**
```bash
git clone https://github.com/seu-usuario/agendai.git
cd agendai
```

2. **Instale as dependências**
```bash
npm install
```

3. **Configure o Supabase**
   - Crie um novo projeto no Supabase
   - Vá em **SQL Editor** e execute os scripts SQL do arquivo `ROTEIRO_ROJETO_AGENDAI.md`:
     - DDL (tabelas)
     - RLS (policies)
   - Em **Settings > API**, copie:
     - Project URL
     - Anon Key
     - Service Role Key

4. **Configure as variáveis de ambiente**
   - Copie `.env.local.example` para `.env.local`
   - Preencha com suas credenciais do Supabase:
```env
NEXT_PUBLIC_SUPABASE_URL=sua_url_aqui
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_anon_key_aqui
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key_aqui
APP_MODO_MOCK=true
```

5. **Execute localmente**
```bash
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000)

## 🌐 Deploy na Vercel

1. **Suba o código no GitHub**
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/seu-usuario/agendai.git
git push -u origin main
```

2. **Importe na Vercel**
   - Acesse [vercel.com](https://vercel.com)
   - Clique em "New Project"
   - Importe seu repositório
   - Configure as mesmas variáveis de ambiente do `.env.local`
   - Deploy!

3. **CRON automático**
   - O arquivo `vercel.json` já configura o CRON
   - Rodará a cada 5 minutos para processar lembretes

## 🧪 Testando

### Criar conta
- Acesse `/cadastro`
- Preencha o formulário
- Você será redirecionado para `/agenda`

### Login
- Acesse `/login`
- Use suas credenciais

### Recursos Premium (modo mock)
Para testar recursos premium, atualize seu plano no banco:

```sql
UPDATE USUARIO 
SET PLANO = 'PREMIUM' 
WHERE EMAIL = 'seu@email.com';
```

## 📚 Documentação Completa

Veja o arquivo `ROTEIRO_ROJETO_AGENDAI.md` para:
- Estrutura completa do banco
- Endpoints da API
- Fluxos de negócio
- Roadmap de features

## 🤝 Contribuindo

1. Fork o projeto
2. Crie sua branch (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT.

## 🔗 Links

- [Demo](https://agendai.vercel.app)
- [Documentação da API](./docs/api.md)
- [Suporte](mailto:suporte@agendai.com.br)

---

Feito com ❤️ por [Seu Nome]