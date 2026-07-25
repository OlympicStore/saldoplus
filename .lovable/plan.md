# Saldo+ V2.0 — Plano de Evolução

Esta é uma visão grande (10 áreas). Impossível entregar tudo num só passo sem partir a app. Proponho **6 fases incrementais**, cada uma entregável e utilizável de imediato. Confirmas por qual queres começar (recomendo Fase 1 + 2 primeiro).

---

## Fase 1 — Fundação de IA Conversacional (base do Premium)

Entregável: um separador **"Assistente"** com chat sempre acessível (desktop e mobile).

- Novo componente `AIAssistant.tsx` usando AI Elements (`Conversation`, `Message`, `PromptInput`, `Tool`).
- Edge function `ai-chat` (streaming) usando Lovable AI Gateway — modelo `google/gemini-3.6-flash` para respostas rápidas, com fallback `openai/gpt-5.4-mini` para raciocínio.
- Tabelas novas: `ai_conversations` (id, user_id, title, updated_at) e `ai_messages` (id, conversation_id, role, parts jsonb, created_at) com RLS por `auth.uid()` + GRANTs.
- Rota `/app/assistente/:conversationId` — histórico persistente, threads, botão "Nova conversa".
- System prompt injecta contexto financeiro (saldo, contas, últimas 30 despesas/receitas, orçamentos, metas) do utilizador — sempre em pt-PT, tom consultor, nunca julgar, nunca incentivar gastos.
- Sem tools ainda — apenas responde a perguntas ("Quanto gastei este mês?", "Onde poupei mais?").

**Gating:** só planos `casa` e `pro` (equivalente ao futuro Premium).

---

## Fase 2 — Registo Rápido & Comandos por IA (o "wow" do Premium)

Entregável: o assistente **executa ações** no chat.

Tools no edge function (AI SDK `tool` + `inputSchema` Zod + `execute`):

- `add_expense` (fixa/inevitável/não-essencial, com auto-categorização)
- `add_income`
- `delete_last_entry`, `edit_last_entry`
- `query_spending` (por categoria, mês, período)
- `add_to_goal`, `create_goal`
- `set_budget`, `check_budget`

Renderização em cartão bonito no chat (✅ Despesa registada, ícone, categoria, tipo, e — só se orçamento existir — "X% utilizado").

Regras duras no system prompt:
- Nunca "hoje pode gastar X" sem orçamento definido.
- Nunca linguagem crítica.
- Pergunta curta apenas quando ambíguo (ex: pessoal vs empresa).

---

## Fase 3 — Memória Financeira & Score

**Memória:** tabela `ai_merchant_memory` (user_id, merchant_normalizado, categoria, tipo, count) — cada registo por IA reforça. Ao ver "Pingo Doce" 3ª vez, classifica automaticamente. Também guarda último valor de cada merchant para sugestões ("O último Pingo Doce foi 24,80€. Confirmar?").

**Score Financeiro 0–100:**
- Novo componente `FinancialScore.tsx` no Dashboard (card com valor grande, classificação, badge de evolução vs mês anterior).
- Cálculo determinístico (não IA) em `src/lib/financialScore.ts`, ponderando: cumprimento de orçamentos (25%), taxa de poupança (25%), regularidade de rendimentos (15%), evolução vs média 3 meses (15%), despesas impulsivas — não-essenciais > X% (10%), atrasos em fixas (10%).
- Tabela `financial_score_history` (user_id, month, score, breakdown jsonb) para gráfico de evolução.
- IA usa o breakdown para gerar 2–3 sugestões concretas de melhoria no chat.

---

## Fase 4 — Modo Casal & Modo Empresa

Reutilizar a infra `sub_accounts` já existente + `groups`/`group_members`.

**Casal:** novo tipo de sub_account `"couple"` com membros convidados. Cada despesa marca `shared: boolean`. Divisão automática usa a lógica já em `Dashboard.tsx`. Contas pessoais permanecem no owner_id normal.

**Empresa:** sub_account tipo `"business"`. Toggle no header/sidebar para alternar contexto Pessoal ↔ Empresa ↔ Conjunta. Dashboard filtra tudo por contexto. Indicadores extra no modo Empresa: Lucro, Custos, Fluxo de caixa, Reserva impostos (% configurável).

Comando IA: "Mover esta despesa para empresa" / "Adicionar à conta conjunta".

---

## Fase 5 — Reestruturação de Planos

Renomear e ajustar preços conforme spec:

- `essencial` → **Starter** 15,99€/mês (funcionalidades base atuais).
- `casa` → **Premium** 28,99€/mês (desbloqueia todas as features IA das Fases 1–4).
- `pro` → **Premium Anual** 159,99€/ano com badge "MELHOR VALOR" (poupa 27,89€/ano vs mensal).

- Criar 3 novos preços Stripe.
- Atualizar `Pricing.tsx`, `AccountPanel.tsx` (upgrade), `create-checkout` e `create-upgrade` (diferenças proporcionais).
- Migrar utilizadores existentes: mesmo `plan` string, apenas labels/preços mudam no UI.
- `useFeatureGate` novo hook centraliza checks (`canUseAI`, `canUseCoupleMode`, etc).

---

## Fase 6 — Polimento Premium & UI unificada

- Reorganizar navegação: **Assistente** (Fase 1) passa a ser o item principal do menu para utilizadores Premium; Dashboard fica em segundo.
- Aplicar visual "airy" (rounded-3xl, Sora, espaçamento generoso) a **todas** as abas restantes: Entradas, Saldo, Investimentos, Anual, Metas, Orçamentos, Minha Casa.
- Calendário Financeiro (nova aba): vista mensal com despesas fixas nos dias de vencimento + previsões.
- Gestão de Subscrições (extrai despesas fixas mensais, mostra card dedicado, deteta preços que subiram).
- Alertas inteligentes: edge function `daily-insights` (cron) gera 1 insight/dia guardado em `ai_insights`, mostrado como notificação no topo.
- Temas Premium (2–3 palettes alternativas selecionáveis).

---

## Detalhes técnicos (para memória)

- **Modelos:** chat streaming em `google/gemini-3.6-flash` (rápido, barato, multimodal); tool-calling complexo escala para `openai/gpt-5.4-mini` com `reasoning_effort: "none"` se preciso. Tudo via `LOVABLE_API_KEY` (já configurado).
- **Persistência chat:** UIMessage[] no `ai_messages.parts` (jsonb), reconstruído com `convertToModelMessages`.
- **RLS:** todas as novas tabelas com policies `auth.uid() = user_id` + GRANTs a `authenticated` e `service_role`.
- **Contexto financeiro:** função server-side `buildUserFinancialContext(userId)` que agrega o snapshot antes de chamar o modelo (evita mandar tabelas inteiras ao LLM). Cache 60s por utilizador.
- **Feature gating:** `has_role` já existe; adiciono `has_premium(user_id)` como SECURITY DEFINER.
- **Realtime:** já ativo — o chat também sincroniza entre dispositivos.
- **Sem breaking changes:** cada fase é aditiva; a app atual continua a funcionar durante a migração.

---

## Estimativa e recomendação

Cada fase é 1 sessão de trabalho substancial. **Recomendo começar por Fase 1 (Chat + histórico)** — dá logo o "efeito ChatGPT" no app e desbloqueia todo o resto. Fase 2 no dia seguinte transforma-o num Registo Rápido real.

**Confirmas Fase 1 para eu começar já?** Ou preferes atacar outra fase primeiro / mudar prioridades?