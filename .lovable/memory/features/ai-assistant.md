---
name: AI Assistant (Fase 1)
description: Chat conversacional com IA financeira, thread history, feature-gated a casa/pro/imobiliaria
type: feature
---
Separador "Assistente" no Index.tsx (icon Sparkles). Componente `src/components/AIAssistant.tsx` usa `@ai-sdk/react` `useChat` + `DefaultChatTransport` a apontar para edge function `ai-chat`.

**Backend:** `supabase/functions/ai-chat/index.ts`
- Modelo: `google/gemini-3.6-flash` via Lovable AI Gateway (helper em `_shared/ai-gateway.ts`).
- Verifica JWT do utilizador, cria conversation on first message, persiste user msg antes de streamar e assistant msg em `onFinish`.
- `buildFinancialContext(userId)` injeta no system prompt: saldos, contas, últimas 20 despesas variáveis do mês, despesas fixas, metas, orçamentos.
- System prompt (pt-PT): tom de consultor, nunca julgar, nunca "hoje pode gastar X" sem orçamento definido, moeda €.
- Retorna header `X-Conversation-Id` para o client sincronizar o thread id.

**DB:** `ai_conversations` (id, user_id, title, updated_at) + `ai_messages` (id, conversation_id, user_id, role, parts jsonb, created_at). RLS por `auth.uid() = user_id`. GRANTs para authenticated + service_role.

**UI:** thread sidebar à esquerda (desktop) / dropdown (mobile), "Nova conversa", eliminar. Cartões user (bg-primary) vs assistant (markdown puro sem bg). Sugestões iniciais no empty state. Composer com auto-resize textarea, submit por Enter (Shift+Enter = nova linha).

**Gating:** planos casa/pro/imobiliaria via `planTabs` em `Index.tsx`. Essencial NÃO vê o separador.

Próxima fase (Fase 2): tools no edge function para add_expense, add_income, query_spending, etc.
