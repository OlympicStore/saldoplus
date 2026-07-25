// Edge function: ai-chat
// Streams responses from the Lovable AI Gateway, injects a rich financial
// context snapshot for the authenticated user, and persists conversations
// and messages in ai_conversations / ai_messages.
import { createClient } from "npm:@supabase/supabase-js@2";
import { convertToModelMessages, streamText, type UIMessage } from "npm:ai";
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

  const [{ data: accounts }, { data: fixed }, { data: variable }, { data: incomes }, { data: goals }, { data: budgets }, { data: salary }] =
    await Promise.all([
      supabase.from("accounts").select("id,name,initial_balance,type").eq("user_id", userId),
      supabase.from("fixed_expenses").select("item,monthly_values,monthly_paid,due_day").eq("user_id", userId).eq("year", year),
      supabase.from("variable_expenses").select("description,category,value,date,paid").eq("user_id", userId).gte("date", `${year}-01-01`).lte("date", `${year}-12-31`).order("date", { ascending: false }).limit(60),
      supabase.from("incomes").select("description,category,amount,date").eq("user_id", userId).gte("date", `${year}-01-01`).lte("date", `${year}-12-31`).order("date", { ascending: false }).limit(40),
      supabase.from("financial_goals").select("name,target_amount,current_amount,deadline").eq("user_id", userId),
      supabase.from("category_budgets").select("category,amount,year,month").eq("user_id", userId).eq("year", year),
      supabase.from("salary_configs").select("month,base_amount").eq("user_id", userId).eq("year", year),
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
  const otherIncomeTotal = currentMonthIncomes.reduce((s, i) => s + Number(i.amount ?? 0), 0);
  const totalIncome = Number(salaryThisMonth) + otherIncomeTotal;
  const totalExpenses = currentMonthFixedTotal + currentMonthVariableTotal;
  const monthBalance = totalIncome - totalExpenses;
  const totalAccounts = (accounts ?? []).reduce((s, a) => s + Number(a.initial_balance ?? 0), 0);

  const lines: string[] = [];
  lines.push(`Data atual: ${now.toLocaleDateString("pt-PT")}. Mês em análise: ${MONTHS[month]} ${year}.`);
  lines.push("");
  lines.push("=== RESUMO DO MÊS ATUAL ===");
  lines.push(`Rendimentos: ${fmt(totalIncome)} (salário: ${fmt(Number(salaryThisMonth))}, outros: ${fmt(otherIncomeTotal)})`);
  lines.push(`Despesas: ${fmt(totalExpenses)} (fixas: ${fmt(currentMonthFixedTotal)}, variáveis: ${fmt(currentMonthVariableTotal)})`);
  lines.push(`Saldo do mês: ${fmt(monthBalance)}`);
  lines.push(`Saldo acumulado nas contas: ${fmt(totalAccounts)}`);

  if ((accounts ?? []).length) {
    lines.push("");
    lines.push("=== CONTAS ===");
    for (const a of accounts!) lines.push(`- ${a.name} (${a.type ?? "conta"}): ${fmt(Number(a.initial_balance ?? 0))}`);
  }

  if (currentMonthVariable.length) {
    lines.push("");
    lines.push(`=== ÚLTIMAS DESPESAS VARIÁVEIS (${MONTHS[month]}) ===`);
    for (const v of currentMonthVariable.slice(0, 20)) {
      lines.push(`- ${v.date} · ${v.category ?? "?"} · ${v.description ?? ""}: ${fmt(Number(v.value ?? 0))} [${v.paid ? "pago" : "pendente"}]`);
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

  return lines.join("\n");
}

const SYSTEM_PROMPT_BASE = `És o assistente financeiro pessoal do Saldo+, uma app portuguesa de gestão financeira.

REGRAS ABSOLUTAS:
- Fala SEMPRE em português de Portugal (pt-PT), tom próximo, calmo, profissional — como um consultor financeiro pessoal experiente.
- Usa Euro (€) como moeda. Formato: €1.234,56.
- Baseia TODAS as respostas exclusivamente nos dados financeiros do utilizador que recebes no contexto abaixo. Se não tens dados suficientes, diz-o com honestidade.
- NUNCA incentives o utilizador a gastar dinheiro. NUNCA digas frases como "hoje ainda pode gastar X" a menos que exista um orçamento explícito definido para essa categoria.
- NUNCA julgues o utilizador. NUNCA uses linguagem crítica ("está a gastar demasiado", "não devia ter comprado isto"). Sê sempre informativo e neutro.
- Sê conciso. Vai direto ao ponto. Usa listas curtas ou frases curtas. Evita respostas longas quando uma frase basta.
- Podes usar markdown ligeiro (negrito, listas) mas não abuses de títulos.
- Se o utilizador te pedir para adicionar/editar/eliminar dados, informa que essa funcionalidade chega na próxima atualização (Registo Rápido por IA) e sugere fazê-lo através dos separadores da app.

O QUE PODES FAZER AGORA:
- Responder a perguntas sobre gastos, rendimentos, saldo, categorias, metas.
- Identificar padrões e tendências ("gastou 18% menos em restaurantes este mês").
- Sugerir formas concretas de poupar baseadas nos dados reais.
- Comparar meses, categorias, contas.
- Ajudar a interpretar o progresso das metas.

CONTEXTO FINANCEIRO ATUAL DO UTILIZADOR:
`;

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

    // Verify the user with the provided JWT (RLS-scoped client).
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userId = userData.user.id;

    // Admin client for writes/reads not restricted by RLS.
    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

    const body = await req.json();
    const messages: UIMessage[] = body.messages ?? [];
    let conversationId: string | null = body.conversationId ?? null;

    // Create the conversation on the first user message if missing.
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

    // Persist the latest user message immediately (it hasn't been saved yet).
    const lastUserMessage = [...messages].reverse().find((m) => m.role === "user");
    if (lastUserMessage) {
      await admin.from("ai_messages").insert({
        conversation_id: conversationId,
        user_id: userId,
        role: "user",
        parts: lastUserMessage.parts as unknown as object,
      });
    }

    const context = await buildFinancialContext(userClient, userId);
    const systemPrompt = SYSTEM_PROMPT_BASE + context;

    const gateway = createLovableAiGatewayProvider(lovableKey);
    const result = streamText({
      model: gateway("google/gemini-3.6-flash"),
      system: systemPrompt,
      messages: await convertToModelMessages(messages),
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
