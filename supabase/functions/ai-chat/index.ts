// Edge function: ai-chat
// Streams responses from the Lovable AI Gateway, injects a rich financial
// context snapshot for the authenticated user, executes fast-entry tools
// (add/list/delete expenses & incomes), and persists conversations/messages.
import { createClient } from "npm:@supabase/supabase-js@2";
import { convertToModelMessages, streamText, tool, stepCountIs, type UIMessage } from "npm:ai";
import { z } from "npm:zod@4";
import { createLovableAiGatewayProvider } from "../_shared/ai-gateway.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const fmt = (v: number) =>
  `€${(v ?? 0).toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const MONTHS = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];

async function buildFinancialContext(supabase: ReturnType<typeof createClient>, userId: string) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  const [{ data: accounts }, { data: fixed }, { data: variable }, { data: incomes }, { data: goals }, { data: budgets }, { data: salary }, { data: categories }] =
    await Promise.all([
      supabase.from("accounts").select("id,name,balance,type").eq("user_id", userId),
      supabase.from("fixed_expenses").select("item,monthly_values,monthly_paid,due_day").eq("user_id", userId),
      supabase.from("variable_expenses").select("id,description,category,value,date,paid,account").eq("user_id", userId).gte("date", `${year}-01-01`).lte("date", `${year}-12-31`).order("date", { ascending: false }).limit(60),
      supabase.from("incomes").select("id,description,type,value,date,account,person").eq("user_id", userId).gte("date", `${year}-01-01`).lte("date", `${year}-12-31`).order("date", { ascending: false }).limit(40),
      supabase.from("financial_goals").select("name,target_amount,current_amount,deadline").eq("user_id", userId),
      supabase.from("category_budgets").select("category,amount,year,month").eq("user_id", userId).eq("year", year),
      supabase.from("salary_configs").select("month,base_amount").eq("user_id", userId).eq("year", year),
      supabase.from("categories").select("name,type").eq("user_id", userId),
    ]);

  const parseDateMonth = (d?: string | null) => {
    if (!d) return -1;
    const [, m] = d.split("-").map(Number);
    return (m ?? 0) - 1;
  };

  const currentMonthVariable = (variable ?? []).filter((v) => parseDateMonth(v.date as string) === month);
  const currentMonthIncomes = (incomes ?? []).filter((v) => parseDateMonth(v.date as string) === month);
  const currentMonthFixedTotal = (fixed ?? []).reduce((sum, f) => {
    const mv = (f.monthly_values as number[] | null) ?? [];
    return sum + (mv[month] ?? 0);
  }, 0);
  const currentMonthVariableTotal = currentMonthVariable.reduce((s, v) => s + Number(v.value ?? 0), 0);
  const salaryThisMonth = (salary ?? []).find((s) => s.month === month)?.base_amount ?? 0;
  const otherIncomeTotal = currentMonthIncomes.reduce((s, i) => s + Number(i.value ?? 0), 0);
  const totalIncome = Number(salaryThisMonth) + otherIncomeTotal;
  const totalExpenses = currentMonthFixedTotal + currentMonthVariableTotal;
  const monthBalance = totalIncome - totalExpenses;
  const totalAccounts = (accounts ?? []).reduce((s, a) => s + Number(a.balance ?? 0), 0);

  const lines: string[] = [];
  lines.push(`Data atual: ${now.toLocaleDateString("pt-PT")}. Mês em análise: ${MONTHS[month]} ${year}. (year=${year}, month index=${month})`);
  lines.push("");
  lines.push("=== RESUMO DO MÊS ATUAL ===");
  lines.push(`Rendimentos: ${fmt(totalIncome)} (salário: ${fmt(Number(salaryThisMonth))}, outros: ${fmt(otherIncomeTotal)})`);
  lines.push(`Despesas: ${fmt(totalExpenses)} (fixas: ${fmt(currentMonthFixedTotal)}, variáveis: ${fmt(currentMonthVariableTotal)})`);
  lines.push(`Saldo do mês: ${fmt(monthBalance)}`);
  lines.push(`Saldo acumulado nas contas: ${fmt(totalAccounts)}`);

  if ((accounts ?? []).length) {
    lines.push("");
    lines.push("=== CONTAS (usa o NOME exato ao criar despesa/receita) ===");
    for (const a of accounts!) lines.push(`- "${a.name}" (${a.type ?? "conta"}): ${fmt(Number(a.balance ?? 0))}`);
  }

  const expenseCats = (categories ?? []).filter((c) => c.type === "expense" || c.type === "despesa");
  const incomeCats = (categories ?? []).filter((c) => c.type === "income" || c.type === "receita");
  if (expenseCats.length) {
    lines.push("");
    lines.push("=== CATEGORIAS DE DESPESA ===");
    lines.push(expenseCats.map((c) => `"${c.name}"`).join(", "));
  }
  if (incomeCats.length) {
    lines.push("");
    lines.push("=== TIPOS DE RECEITA ===");
    lines.push(incomeCats.map((c) => `"${c.name}"`).join(", "));
  }

  if (currentMonthVariable.length) {
    lines.push("");
    lines.push(`=== ÚLTIMAS DESPESAS VARIÁVEIS (${MONTHS[month]}) ===`);
    for (const v of currentMonthVariable.slice(0, 20)) {
      lines.push(`- [id:${(v.id as string).slice(0, 8)}] ${v.date} · ${v.category ?? "?"} · ${v.description ?? ""}: ${fmt(Number(v.value ?? 0))} [${v.paid ? "pago" : "pendente"}]`);
    }
  }

  if ((fixed ?? []).length) {
    lines.push("");
    lines.push("=== DESPESAS FIXAS DO MÊS ===");
    for (const f of fixed!) {
      const mv = (f.monthly_values as number[] | null) ?? [];
      const mp = (f.monthly_paid as boolean[] | null) ?? [];
      const val = mv[month] ?? 0;
      if (val > 0) lines.push(`- ${f.item} (dia ${f.due_day}): ${fmt(val)} [${mp[month] ? "pago" : "pendente"}]`);
    }
  }

  if ((goals ?? []).length) {
    lines.push("");
    lines.push("=== METAS FINANCEIRAS ===");
    for (const g of goals!) {
      const pct = g.target_amount ? ((Number(g.current_amount) / Number(g.target_amount)) * 100).toFixed(0) : "0";
      lines.push(`- ${g.name}: ${fmt(Number(g.current_amount))} / ${fmt(Number(g.target_amount))} (${pct}%)${g.deadline ? ` até ${g.deadline}` : ""}`);
    }
  }

  const monthBudgets = (budgets ?? []).filter((b) => b.month === month || b.month === null);
  if (monthBudgets.length) {
    lines.push("");
    lines.push("=== ORÇAMENTOS DEFINIDOS ===");
    for (const b of monthBudgets) {
      const spent = currentMonthVariable.filter((v) => v.category === b.category).reduce((s, v) => s + Number(v.value ?? 0), 0);
      const pct = Number(b.amount) ? ((spent / Number(b.amount)) * 100).toFixed(0) : "0";
      lines.push(`- ${b.category}: ${fmt(spent)} / ${fmt(Number(b.amount))} (${pct}%)`);
    }
  } else {
    lines.push("");
    lines.push("=== ORÇAMENTOS ===");
    lines.push("O utilizador NÃO tem orçamentos definidos. Não menciones limites de gasto nem digas 'ainda pode gastar X'.");
  }

  return { text: lines.join("\n"), accounts: accounts ?? [], expenseCategories: expenseCats, incomeCategories: incomeCats };
}

const SYSTEM_PROMPT_BASE = `És o assistente financeiro pessoal do Saldo+, uma app portuguesa de gestão financeira.

REGRAS ABSOLUTAS:
- Fala SEMPRE em português de Portugal (pt-PT), tom próximo, calmo, profissional — como um consultor financeiro pessoal experiente.
- Usa Euro (€) como moeda. Formato: €1.234,56.
- Baseia respostas nos dados do contexto abaixo. Se não tens dados suficientes, diz-o com honestidade.
- NUNCA incentives o utilizador a gastar dinheiro. NUNCA digas frases como "hoje ainda pode gastar X" a menos que exista um orçamento explícito.
- NUNCA julgues o utilizador. Sê sempre informativo e neutro.
- Sê conciso. Vai direto ao ponto.

CONVENÇÃO DE SINAIS (MUITO IMPORTANTE — nunca confundir):
- Valores com **"+"** (ex: "+20", "+30€", "mais 50€", "somar 100"), ou verbos como "recebi", "entrou", "ganhei", "vendi", "reembolso", "salário", "adicionar receita" → SEMPRE **add_income**.
- Valores com **"-"** (ex: "-20", "-15€", "menos 40€", "tirar 30"), ou verbos como "gastei", "paguei", "comprei", "saiu", "despesa", "custo" → SEMPRE **add_expense**.
- Se o utilizador escrever apenas um número (ex: "50€ no supermercado") sem sinal e sem verbo, assume despesa apenas se houver um contexto claro de gasto (categoria/descrição de gasto); caso contrário pergunta.
- NUNCA registes um "+X" ou "recebi X" como despesa.

TOOLS DISPONÍVEIS:
- **add_expense** → "gastei 50€ em água", "-15 no almoço", "paguei X".
- **add_income** → "recebi 100€", "+30€ freelance", "entrou X".
- **list_recent_expenses / list_recent_incomes** → antes de editar/eliminar, ou quando pedirem para ver.
- **edit_expense / edit_income** → alterar valor, data, conta ou categoria.
- **delete_expense / delete_income** → SEMPRE com fluxo de confirmação em 2 passos.
- **undo_last_action** → desfaz a ÚLTIMA ação (add/edit/delete) que o assistente executou.

FLUXO DE CONFIRMAÇÃO PARA ELIMINAR:
1. Chama a tool com \`confirm: false\` para obter o preview do registo (descrição, valor, data, conta).
2. Mostra ao utilizador exatamente o que vai ser eliminado e pergunta "Confirmas?".
3. SÓ chamas de novo com \`confirm: true\` DEPOIS do utilizador responder "sim", "confirmar", "podes", "ok" ou equivalente.
4. Se o utilizador disser "não" ou "cancela", NÃO chames a tool.

COMANDOS CONTEXTUAIS CURTOS (memória da conversa):
O utilizador pode dar comandos incompletos que se referem ao ÚLTIMO registo mencionado ou criado nesta conversa. Interpreta-os assim:
- "altera para 15€" / "muda o valor para 20" → edit_expense/edit_income no último id conhecido, campo value.
- "muda para Água" / "põe na categoria mercado" → edit_expense com category.
- "em que conta fica?" / "muda para conta X" → confirma/edita account.
- "e a data?" / "põe para ontem" → edit com date (ontem = data de hoje menos 1 dia).
- "apaga essa" / "remove a última" → delete_expense do último id (com confirmação).
- "desfaz" / "anula" / "não era isso" → undo_last_action.
Se não tens a certeza a que registo o utilizador se refere, chama list_recent_expenses e pergunta.

REGRAS PARA AS TOOLS:
- Datas em formato YYYY-MM-DD. Se o utilizador não indicar data, usa HOJE (indicada no contexto).
- Se não houver categoria clara, escolhe a mais próxima da lista existente. Se nenhuma servir, usa "Outros".
- Se houver várias contas e o utilizador não indicar qual, usa a primeira listada. Menciona qual escolheste.
- Valores em euros como número decimal (usa ponto: 50.5, não 50,5).
- Depois de sucesso, confirma em UMA frase curta. Não repitas todos os campos.
- Se a tool falhar, explica o erro em português simples.

CONTEXTO FINANCEIRO ATUAL DO UTILIZADOR:
`;

function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (!supabaseUrl || !anonKey || !serviceKey || !lovableKey) {
      return new Response(JSON.stringify({ error: "Server misconfigured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userId = userData.user.id;

    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

    const body = await req.json();
    const messages: UIMessage[] = body.messages ?? [];
    let conversationId: string | null = body.conversationId ?? null;

    if (!conversationId) {
      const firstUserMsg = messages.find((m) => m.role === "user");
      const firstText = firstUserMsg?.parts?.map((p: any) => (p.type === "text" ? p.text : "")).join(" ").trim() ?? "";
      const title = firstText.slice(0, 60) || "Nova conversa";
      const { data: created, error: convErr } = await admin
        .from("ai_conversations")
        .insert({ user_id: userId, title })
        .select("id")
        .single();
      if (convErr || !created) {
        return new Response(JSON.stringify({ error: "Failed to create conversation" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      conversationId = created.id as string;
    }

    const lastUserMessage = [...messages].reverse().find((m) => m.role === "user");
    if (lastUserMessage) {
      await admin.from("ai_messages").insert({
        conversation_id: conversationId,
        user_id: userId,
        role: "user",
        parts: lastUserMessage.parts as unknown as object,
      });
    }

    const ctx = await buildFinancialContext(userClient, userId);
    const systemPrompt = SYSTEM_PROMPT_BASE + ctx.text;

    const defaultAccount = ctx.accounts[0]?.name ?? "Principal";

    async function logAction(kind: string, target_table: string, target_id: string | null, snapshot: unknown) {
      await admin.from("ai_action_log").insert({
        user_id: userId,
        conversation_id: conversationId,
        kind,
        target_table,
        target_id,
        snapshot: snapshot as object | null,
      });
    }

    const tools = {
      add_expense: tool({
        description: "Adiciona uma despesa variável. Usa quando o utilizador diz 'gastei X em Y', 'paguei X', 'adiciona despesa'.",
        inputSchema: z.object({
          description: z.string(),
          value: z.number().positive(),
          category: z.string(),
          date: z.string().describe("YYYY-MM-DD. Se não indicada, hoje."),
          account: z.string().nullable(),
          paid: z.boolean(),
        }),
        execute: async ({ description, value, category, date, account, paid }) => {
          const acc = account?.trim() || defaultAccount;
          const { data, error } = await admin.from("variable_expenses").insert({
            user_id: userId, description, value, category,
            date: date || todayISO(), account: acc, paid: paid ?? true, recurring: false,
          }).select("id").single();
          if (error) return { ok: false, error: error.message };
          await logAction("add_expense", "variable_expenses", data.id, null);
          return { ok: true, id: data.id, message: `Despesa "${description}" de ${fmt(value)} em ${category} (${acc}) adicionada em ${date}.` };
        },
      }),

      add_income: tool({
        description: "Adiciona uma receita/rendimento pontual.",
        inputSchema: z.object({
          description: z.string(),
          value: z.number().positive(),
          type: z.string(),
          date: z.string(),
          account: z.string().nullable(),
          person: z.string().nullable(),
        }),
        execute: async ({ description, value, type, date, account, person }) => {
          const acc = account?.trim() || defaultAccount;
          const { data, error } = await admin.from("incomes").insert({
            user_id: userId, description, value, type,
            date: date || todayISO(), account: acc, person: person ?? null,
          }).select("id").single();
          if (error) return { ok: false, error: error.message };
          await logAction("add_income", "incomes", data.id, null);
          return { ok: true, id: data.id, message: `Receita "${description}" de ${fmt(value)} (${type}, ${acc}) adicionada em ${date}.` };
        },
      }),

      list_recent_expenses: tool({
        description: "Lista despesas variáveis recentes com IDs. Usa antes de editar/eliminar.",
        inputSchema: z.object({
          limit: z.number().int().min(1).max(20),
          query: z.string().nullable(),
        }),
        execute: async ({ limit, query }) => {
          let q = admin.from("variable_expenses").select("id,description,category,value,date,account,paid").eq("user_id", userId).order("date", { ascending: false }).limit(limit ?? 10);
          if (query) q = q.or(`description.ilike.%${query}%,category.ilike.%${query}%`);
          const { data, error } = await q;
          if (error) return { ok: false, error: error.message };
          return { ok: true, expenses: data ?? [] };
        },
      }),

      list_recent_incomes: tool({
        description: "Lista receitas recentes com IDs. Usa antes de editar/eliminar.",
        inputSchema: z.object({
          limit: z.number().int().min(1).max(20),
          query: z.string().nullable(),
        }),
        execute: async ({ limit, query }) => {
          let q = admin.from("incomes").select("id,description,type,value,date,account,person").eq("user_id", userId).order("date", { ascending: false }).limit(limit ?? 10);
          if (query) q = q.or(`description.ilike.%${query}%,type.ilike.%${query}%`);
          const { data, error } = await q;
          if (error) return { ok: false, error: error.message };
          return { ok: true, incomes: data ?? [] };
        },
      }),

      edit_expense: tool({
        description: "Atualiza campos de uma despesa variável existente. Passa apenas os campos a mudar.",
        inputSchema: z.object({
          id: z.string(),
          description: z.string().nullable(),
          value: z.number().positive().nullable(),
          category: z.string().nullable(),
          date: z.string().nullable(),
          account: z.string().nullable(),
          paid: z.boolean().nullable(),
        }),
        execute: async ({ id, description, value, category, date, account, paid }) => {
          const { data: existing, error: findErr } = await admin.from("variable_expenses").select("*").eq("id", id).eq("user_id", userId).maybeSingle();
          if (findErr) return { ok: false, error: findErr.message };
          if (!existing) return { ok: false, error: "Despesa não encontrada." };
          const patch: Record<string, unknown> = {};
          if (description !== null && description !== undefined) patch.description = description;
          if (value !== null && value !== undefined) patch.value = value;
          if (category !== null && category !== undefined) patch.category = category;
          if (date !== null && date !== undefined) patch.date = date;
          if (account !== null && account !== undefined) patch.account = account;
          if (paid !== null && paid !== undefined) patch.paid = paid;
          if (Object.keys(patch).length === 0) return { ok: false, error: "Nenhum campo para atualizar." };
          const { error } = await admin.from("variable_expenses").update(patch).eq("id", id).eq("user_id", userId);
          if (error) return { ok: false, error: error.message };
          await logAction("edit_expense", "variable_expenses", id, existing);
          return { ok: true, message: `Despesa "${existing.description}" atualizada.`, updated: patch };
        },
      }),

      edit_income: tool({
        description: "Atualiza campos de uma receita existente. Passa apenas os campos a mudar.",
        inputSchema: z.object({
          id: z.string(),
          description: z.string().nullable(),
          value: z.number().positive().nullable(),
          type: z.string().nullable(),
          date: z.string().nullable(),
          account: z.string().nullable(),
          person: z.string().nullable(),
        }),
        execute: async ({ id, description, value, type, date, account, person }) => {
          const { data: existing, error: findErr } = await admin.from("incomes").select("*").eq("id", id).eq("user_id", userId).maybeSingle();
          if (findErr) return { ok: false, error: findErr.message };
          if (!existing) return { ok: false, error: "Receita não encontrada." };
          const patch: Record<string, unknown> = {};
          if (description !== null && description !== undefined) patch.description = description;
          if (value !== null && value !== undefined) patch.value = value;
          if (type !== null && type !== undefined) patch.type = type;
          if (date !== null && date !== undefined) patch.date = date;
          if (account !== null && account !== undefined) patch.account = account;
          if (person !== null && person !== undefined) patch.person = person;
          if (Object.keys(patch).length === 0) return { ok: false, error: "Nenhum campo para atualizar." };
          const { error } = await admin.from("incomes").update(patch).eq("id", id).eq("user_id", userId);
          if (error) return { ok: false, error: error.message };
          await logAction("edit_income", "incomes", id, existing);
          return { ok: true, message: `Receita "${existing.description}" atualizada.`, updated: patch };
        },
      }),

      delete_expense: tool({
        description: "Elimina uma despesa. FLUXO 2 PASSOS: chama com confirm=false para preview e pergunta ao utilizador; só depois chama com confirm=true.",
        inputSchema: z.object({
          id: z.string(),
          confirm: z.boolean().describe("false = apenas mostrar preview; true = executar eliminação"),
        }),
        execute: async ({ id, confirm }) => {
          const { data: existing, error: findErr } = await admin.from("variable_expenses").select("*").eq("id", id).eq("user_id", userId).maybeSingle();
          if (findErr) return { ok: false, error: findErr.message };
          if (!existing) return { ok: false, error: "Despesa não encontrada." };
          if (!confirm) {
            return {
              ok: true,
              requiresConfirmation: true,
              preview: {
                description: existing.description, value: existing.value,
                category: existing.category, date: existing.date, account: existing.account,
              },
              message: `A eliminar: "${existing.description}" · ${fmt(Number(existing.value))} · ${existing.category} · ${existing.date} (${existing.account}). Confirmar?`,
            };
          }
          const { error } = await admin.from("variable_expenses").delete().eq("id", id).eq("user_id", userId);
          if (error) return { ok: false, error: error.message };
          await logAction("delete_expense", "variable_expenses", id, existing);
          return { ok: true, message: `Despesa "${existing.description}" (${fmt(Number(existing.value))}) eliminada.` };
        },
      }),

      delete_income: tool({
        description: "Elimina uma receita. FLUXO 2 PASSOS: chama com confirm=false para preview; só depois com confirm=true.",
        inputSchema: z.object({
          id: z.string(),
          confirm: z.boolean(),
        }),
        execute: async ({ id, confirm }) => {
          const { data: existing, error: findErr } = await admin.from("incomes").select("*").eq("id", id).eq("user_id", userId).maybeSingle();
          if (findErr) return { ok: false, error: findErr.message };
          if (!existing) return { ok: false, error: "Receita não encontrada." };
          if (!confirm) {
            return {
              ok: true,
              requiresConfirmation: true,
              preview: {
                description: existing.description, value: existing.value,
                type: existing.type, date: existing.date, account: existing.account,
              },
              message: `A eliminar receita: "${existing.description}" · ${fmt(Number(existing.value))} · ${existing.type} · ${existing.date} (${existing.account}). Confirmar?`,
            };
          }
          const { error } = await admin.from("incomes").delete().eq("id", id).eq("user_id", userId);
          if (error) return { ok: false, error: error.message };
          await logAction("delete_income", "incomes", id, existing);
          return { ok: true, message: `Receita "${existing.description}" (${fmt(Number(existing.value))}) eliminada.` };
        },
      }),

      undo_last_action: tool({
        description: "Desfaz a ÚLTIMA ação (add/edit/delete de despesa ou receita) executada pelo assistente para este utilizador. Não requer parâmetros.",
        inputSchema: z.object({}),
        execute: async () => {
          const { data: last, error: findErr } = await admin
            .from("ai_action_log")
            .select("*")
            .eq("user_id", userId)
            .eq("undone", false)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          if (findErr) return { ok: false, error: findErr.message };
          if (!last) return { ok: false, error: "Não há ações recentes para desfazer." };

          const table = last.target_table as string;
          const kind = last.kind as string;
          const targetId = last.target_id as string | null;
          const snap = last.snapshot as Record<string, unknown> | null;

          try {
            if (kind.startsWith("add_") && targetId) {
              const { error } = await admin.from(table).delete().eq("id", targetId).eq("user_id", userId);
              if (error) throw error;
            } else if (kind.startsWith("delete_") && snap) {
              const { error } = await admin.from(table).insert(snap);
              if (error) throw error;
            } else if (kind.startsWith("edit_") && targetId && snap) {
              const { id: _ignore, created_at: _c, updated_at: _u, ...rest } = snap as any;
              const { error } = await admin.from(table).update(rest).eq("id", targetId).eq("user_id", userId);
              if (error) throw error;
            } else {
              return { ok: false, error: "Ação não é reversível." };
            }
            await admin.from("ai_action_log").update({ undone: true }).eq("id", last.id);
            return { ok: true, message: `Ação "${kind}" desfeita com sucesso.` };
          } catch (e) {
            return { ok: false, error: (e as Error).message };
          }
        },
      }),
    };

    const gateway = createLovableAiGatewayProvider(lovableKey);
    const result = streamText({
      model: gateway("google/gemini-3.6-flash-lite"),
      system: systemPrompt,
      messages: await convertToModelMessages(messages),
      tools,
      stopWhen: stepCountIs(50),
      onError: (err) => console.error("streamText error", err),
    });

    return result.toUIMessageStreamResponse({
      headers: { ...corsHeaders, "X-Conversation-Id": conversationId },
      originalMessages: messages,
      onFinish: async ({ messages: finalMessages }) => {
        try {
          const lastAssistant = [...finalMessages].reverse().find((m) => m.role === "assistant");
          if (lastAssistant) {
            await admin.from("ai_messages").insert({
              conversation_id: conversationId,
              user_id: userId,
              role: "assistant",
              parts: lastAssistant.parts as unknown as object,
            });
            await admin.from("ai_conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId);
          }
        } catch (e) {
          console.error("persist assistant message failed", e);
        }
      },
    });
  } catch (e) {
    console.error("ai-chat error", e);
    return new Response(JSON.stringify({ error: String((e as Error)?.message ?? e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
