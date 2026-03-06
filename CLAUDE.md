# AgendAI — Instruções para Claude

## Regra Principal
**TUDO que é implementado no app mobile DEVE ser implementado também na versão web.**

Isso inclui, mas não se limita a:
- Novos campos de formulário
- Novas features (recorrência, lembretes, urgente, etc.)
- Mudanças de UI/UX (chips, toggles, seletores)
- Novos endpoints de API consumidos pelo mobile
- Correções de bugs

### Pares mobile ↔ web
| Mobile | Web |
|--------|-----|
| `mobile/src/screens/NovoCompromissoScreen.tsx` | `app/agenda/novo/page.tsx` |
| `mobile/src/screens/AgendaScreen.tsx` | `app/agenda/page.tsx` |
| `mobile/src/screens/ConfiguracoesScreen.tsx` | `app/configuracoes/page.tsx` |
| `mobile/src/lib/api.ts` | `app/api/*/route.ts` |

## Projeto
- **Stack web:** Next.js 14 (App Router) + Tailwind CSS + Supabase
- **Stack mobile:** React Native (Expo) + Supabase
- **Deploy web:** Vercel (`vercel --prod`)
- **URL produção:** https://sistema-agendai.vercel.app

## Banco de Dados (Supabase)
- `exec_sql` RPC **não existe** — migrações devem ser executadas manualmente no SQL Editor do Supabase
- Tabela principal: `COMPROMISSO`
- Colunas adicionadas via migração manual: `ANTECEDENCIA_LEMBRETE_MINUTOS`, `RECORRENCIA_TIPO`, `RECORRENCIA_INTERVALO`, `RECORRENCIA_DIAS_SEMANA`, `RECORRENCIA_FIM`, `ID_COMPROMISSO_ORIGEM`
