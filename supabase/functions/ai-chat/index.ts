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

REGISTO RÁPIDO (usa as tools quando o utilizador pedir para adicionar/eliminar/consultar):
- **add_expense** → quando disserem coisas como "gastei 50€ em água", "adiciona despesa mercado 32,50", "paguei 15 no almoço".
- **add_income** → "recebi 100€ de freelance", "adiciona rendimento 500 salário extra".
- **list_recent_expenses** → antes de eliminar, ou quando pedirem para ver últimas despesas.
- **delete_expense** → "apaga a última despesa da água", "remove aquele gasto de 50€".

REGRAS PARA AS TOOLS:
- Datas em formato YYYY-MM-DD. Se o utilizador não indicar data, usa HOJE (indicada no contexto).
- Se não houver categoria clara, escolhe a mais próxima da lista de categorias existentes. Se nenhuma servir, usa "Outros".
- Se houver várias contas e o utilizador não indicar qual, usa a primeira listada em CONTAS. Menciona qual escolheste.
- Valores em euros como número decimal (usa ponto: 50.5, não 50,5).
- Depois de executar uma tool com sucesso, confirma ao utilizador em UMA frase curta ("Adicionei €50,00 em Água (conta Principal)."). Não repitas todos os campos.
- Se a tool falhar, explica o erro em português simples e sugere como corrigir.

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

    const tools = {
      add_expense: tool({
        description: "Adiciona uma despesa variável (compra pontual). Usa quando o utilizador diz 'gastei X em Y', 'paguei X', 'adiciona despesa'.",
        inputSchema: z.object({
          description: z.string().describe("Breve descrição (ex: 'Almoço', 'Fatura água')"),
          value: z.number().positive().describe("Valor em euros (ex: 50.5)"),
          category: z.string().describe("Categoria da despesa (usa uma das listadas ou 'Outros')"),
          date: z.string().describe("Data YYYY-MM-DD. Se não indicada, usa hoje."),
          account: z.string().nullable().describe("Nome exato da conta. Se null, usa a conta principal."),
          paid: z.boolean().describe("true se já foi paga, false se pendente. Por defeito true."),
        }),
        execute: async ({ description, value, category, date, account, paid }) => {
          const acc = account?.trim() || defaultAccount;
          const { error } = await admin.from("variable_expenses").insert({
            user_id: userId,
            description,
            value,
            category,
            date: date || todayISO(),
            account: acc,
            paid: paid ?? true,
            recurring: false,
          });
          if (error) return { ok: false, error: error.message };
          return { ok: true, message: `Despesa "${description}" de ${fmt(value)} em ${category} (${acc}) adicionada em ${date}.` };
        },
      }),

      add_income: tool({
        description: "Adiciona uma receita/rendimento pontual.",
        inputSchema: z.object({
          description: z.string(),
          value: z.number().positive(),
          type: z.string().describe("Tipo de receita (ex: 'Salário', 'Freelance', 'Outros')"),
          date: z.string().describe("YYYY-MM-DD. Se não indicada, hoje."),
          account: z.string().nullable(),
          person: z.string().nullable().describe("Pessoa associada, se aplicável"),
        }),
        execute: async ({ description, value, type, date, account, person }) => {
          const acc = account?.trim() || defaultAccount;
          const { error } = await admin.from("incomes").insert({
            user_id: userId,
            description,
            value,
            type,
            date: date || todayISO(),
            account: acc,
            person: person ?? null,
          });
          if (error) return { ok: false, error: error.message };
          return { ok: true, message: `Receita "${description}" de ${fmt(value)} (${type}, ${acc}) adicionada em ${date}.` };
        },
      }),

      list_recent_expenses: tool({
        description: "Lista as despesas variáveis mais recentes com IDs completos, para poderes eliminar ou identificar. Usa antes de delete_expense.",
        inputSchema: z.object({
          limit: z.number().int().min(1).max(20).describe("Número máximo de despesas (1-20). Por defeito 10."),
          query: z.string().nullable().describe("Filtro opcional por descrição ou categoria (ex: 'água')."),
        }),
        execute: async ({ limit, query }) => {
          let q = admin.from("variable_expenses").select("id,description,category,value,date,account").eq("user_id", userId).order("date", { ascending: false }).limit(limit ?? 10);
          if (query) q = q.or(`description.ilike.%${query}%,category.ilike.%${query}%`);
          const { data, error } = await q;
          if (error) return { ok: false, error: error.message };
          return { ok: true, expenses: data ?? [] };
        },
      }),

      delete_expense: tool({
        description: "Elimina uma despesa variável pelo ID completo (UUID). Usa list_recent_expenses primeiro para obter o ID.",
        inputSchema: z.object({
          id: z.string().describe("UUID completo da despesa a eliminar"),
        }),
        execute: async ({ id }) => {
          const { data: existing, error: findErr } = await admin.from("variable_expenses").select("description,value").eq("id", id).eq("user_id", userId).maybeSingle();
          if (findErr) return { ok: false, error: findErr.message };
          if (!existing) return { ok: false, error: "Despesa não encontrada." };
          const { error } = await admin.from("variable_expenses").delete().eq("id", id).eq("user_id", userId);
          if (error) return { ok: false, error: error.message };
          return { ok: true, message: `Despesa "${existing.description}" (${fmt(Number(existing.value))}) eliminada.` };
        },
      }),

      delete_income: tool({
        description: "Elimina uma receita pelo ID completo (UUID).",
        inputSchema: z.object({
          id: z.string().describe("UUID completo da receita a eliminar"),
        }),
        execute: async ({ id }) => {
          const { data: existing, error: findErr } = await admin.from("incomes").select("description,value").eq("id", id).eq("user_id", userId).maybeSingle();
          if (findErr) return { ok: false, error: findErr.message };
          if (!existing) return { ok: false, error: "Receita não encontrada." };
          const { error } = await admin.from("incomes").delete().eq("id", id).eq("user_id", userId);
          if (error) return { ok: false, error: error.message };
          return { ok: true, message: `Receita "${existing.description}" (${fmt(Number(existing.value))}) eliminada.` };
        },
      }),
    };

    const gateway = createLovableAiGatewayProvider(lovableKey);
    const result = streamText({
      model: gateway("google/gemini-3.6-flash"),
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
