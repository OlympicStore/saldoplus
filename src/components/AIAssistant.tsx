import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import ReactMarkdown from "react-markdown";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Plus, MessageSquare, Trash2, Sparkles, Loader2, Undo2, ShoppingCart, Utensils, Car, Home as HomeIcon, Zap, Wifi, Heart, GraduationCap, Plane, Gift, Tag as TagIcon, TrendingUp, TrendingDown, Pencil, Check, AlertCircle } from "lucide-react";
import { toast } from "sonner";

type Conversation = { id: string; title: string; updated_at: string };
type StoredMessage = { id: string; role: "user" | "assistant" | "system"; parts: UIMessage["parts"]; created_at: string };

const SUGGESTIONS = [
  "Quanto gastei este mês?",
  "Onde consigo poupar dinheiro?",
  "Qual foi a minha maior despesa?",
  "Quanto falta para atingir as minhas metas?",
];

const eur = (v: number | string | undefined | null) => {
  const n = typeof v === "string" ? parseFloat(v) : (v ?? 0);
  return (isNaN(n as number) ? 0 : (n as number)).toLocaleString("pt-PT", { style: "currency", currency: "EUR" });
};

function categoryIcon(cat?: string | null) {
  const c = (cat || "").toLowerCase();
  if (/(aliment|super|merc|resta|café|cafe|comida)/.test(c)) return ShoppingCart;
  if (/(refei|almoç|jantar|snack|bar)/.test(c)) return Utensils;
  if (/(transp|combust|gasol|carro|uber|táxi|taxi)/.test(c)) return Car;
  if (/(casa|renda|aluguer|habita)/.test(c)) return HomeIcon;
  if (/(luz|energia|eletric|eléctr)/.test(c)) return Zap;
  if (/(net|internet|tv|telem|telefone|comunic)/.test(c)) return Wifi;
  if (/(saúde|saude|farm|médico|medico|hosp)/.test(c)) return Heart;
  if (/(educa|escola|livro|curso)/.test(c)) return GraduationCap;
  if (/(viag|férias|ferias|voo|hotel)/.test(c)) return Plane;
  if (/(present|oferta|lazer|diver)/.test(c)) return Gift;
  return TagIcon;
}

const TOOL_LABEL: Record<string, string> = {
  add_expense: "Despesa registada",
  add_income: "Receita registada",
  edit_expense: "Despesa atualizada",
  edit_income: "Receita atualizada",
  delete_expense: "Despesa eliminada",
  delete_income: "Receita eliminada",
  list_recent_expenses: "Despesas recentes",
  list_recent_incomes: "Receitas recentes",
  undo_last_action: "Ação desfeita",
  update_fixed_monthly: "Despesa recorrente atualizada",
};

async function getAuthHeader() {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? `Bearer ${token}` : "";
}

export const AIAssistant = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [initialMessages, setInitialMessages] = useState<UIMessage[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [input, setInput] = useState("");
  const [threadListOpen, setThreadListOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const conversationIdRef = useRef<string | null>(null);

  useEffect(() => { conversationIdRef.current = activeId; }, [activeId]);

  const transport = useMemo(() => new DefaultChatTransport({
    api: `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`,
    fetch: async (input, init) => {
      const auth = await getAuthHeader();
      const headers = new Headers(init?.headers);
      headers.set("Authorization", auth);
      headers.set("Content-Type", "application/json");
      const body = init?.body ? JSON.parse(init.body as string) : {};
      body.conversationId = conversationIdRef.current;
      const res = await fetch(input, { ...init, headers, body: JSON.stringify(body) });
      const newConvId = res.headers.get("X-Conversation-Id");
      if (newConvId && !conversationIdRef.current) {
        conversationIdRef.current = newConvId;
        setActiveId(newConvId);
        loadConversations();
      }
      return res;
    },
  }), []);

  const { messages, sendMessage, status, setMessages, error } = useChat({
    id: activeId ?? "new",
    messages: initialMessages,
    transport,
    onError: (e) => {
      console.error("chat error", e);
      toast.error("Erro no assistente. Tenta novamente.");
    },
  });

  const isLoading = status === "submitted" || status === "streaming";

  async function loadConversations() {
    if (!user) return;
    const { data, error } = await supabase
      .from("ai_conversations")
      .select("id,title,updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(50);
    if (!error && data) setConversations(data);
  }

  async function loadMessages(convId: string) {
    setLoadingHistory(true);
    const { data, error } = await supabase
      .from("ai_messages")
      .select("id,role,parts,created_at")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: true });
    setLoadingHistory(false);
    if (error || !data) { setInitialMessages([]); setMessages([]); return; }
    const uiMsgs: UIMessage[] = (data as StoredMessage[]).map((m) => ({
      id: m.id,
      role: m.role,
      parts: m.parts as UIMessage["parts"],
    } as UIMessage));
    setInitialMessages(uiMsgs);
    setMessages(uiMsgs);
  }

  useEffect(() => { loadConversations(); /* eslint-disable-next-line */ }, [user?.id]);

  useEffect(() => {
    if (activeId) loadMessages(activeId);
    else { setInitialMessages([]); setMessages([]); }
    // eslint-disable-next-line
  }, [activeId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isLoading]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [activeId, status]);

  function startNewConversation() {
    setActiveId(null);
    conversationIdRef.current = null;
    setInitialMessages([]);
    setMessages([]);
    setThreadListOpen(false);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  async function deleteConversation(id: string) {
    if (!confirm("Eliminar esta conversa?")) return;
    const { error } = await supabase.from("ai_conversations").delete().eq("id", id);
    if (error) return toast.error("Erro ao eliminar");
    if (activeId === id) startNewConversation();
    loadConversations();
  }

  function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    const text = input.trim();
    if (!text || isLoading) return;
    setInput("");
    sendMessage({ text });
  }

  function handleSuggestion(text: string) {
    if (isLoading) return;
    sendMessage({ text });
  }

  function handleUndo() {
    if (isLoading) return;
    sendMessage({ text: "Desfaz a minha última ação." });
  }

  function renderMessage(m: UIMessage) {
    const isUser = m.role === "user";
    const parts: any[] = m.parts as any[];

    return (
      <motion.div
        key={m.id}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className={`flex ${isUser ? "justify-end" : "justify-start"}`}
      >
        <div className={`max-w-[85%] ${isUser ? "" : "w-full"} space-y-2`}>
          {parts.map((p, idx) => {
            if (p.type === "text") {
              if (isUser) {
                return (
                  <div key={idx} className="bg-primary text-primary-foreground rounded-3xl rounded-br-lg px-4 py-2.5 text-sm shadow-sm">
                    {p.text}
                  </div>
                );
              }
              return (
                <div key={idx} className="prose prose-sm max-w-none text-foreground prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-strong:text-foreground prose-strong:font-semibold prose-headings:font-display prose-headings:text-foreground">
                  <ReactMarkdown>{p.text || "…"}</ReactMarkdown>
                </div>
              );
            }
            // Tool invocation parts (ai sdk v5: type is `tool-<name>`)
            if (typeof p.type === "string" && p.type.startsWith("tool-")) {
              const toolName = p.type.slice(5);
              const state = p.state as string | undefined;
              const done = state === "output-available" || state === "result";
              const output = p.output as any;
              const input = p.input as any;
              const failed = state === "output-error" || (done && output?.ok === false);

              // In-flight → subtle pill with spinner
              if (!done) {
                return (
                  <div key={idx} className="inline-flex items-center gap-2 text-[11px] px-3 py-1.5 rounded-full border border-border-subtle bg-surface-hover text-text-muted">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span className="font-medium">{(TOOL_LABEL[toolName] || toolName).toLowerCase()}…</span>
                  </div>
                );
              }

              // Error state
              if (failed) {
                return (
                  <div key={idx} className="flex items-start gap-2.5 rounded-2xl bg-status-negative/10 border border-status-negative/25 px-3.5 py-2.5 text-xs text-status-negative max-w-md">
                    <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-semibold mb-0.5">Não consegui executar.</p>
                      <p className="text-status-negative/80">{String(output?.error || "Erro desconhecido")}</p>
                    </div>
                  </div>
                );
              }

              // Rich card: add_expense / add_income
              if (toolName === "add_expense" || toolName === "add_income") {
                const isExp = toolName === "add_expense";
                const Icon = isExp ? categoryIcon(input?.category) : TrendingUp;
                const value = input?.value ?? 0;
                const title = input?.description || (isExp ? "Despesa" : "Receita");
                const line2Label = isExp ? "Categoria" : "Tipo";
                const line2Value = isExp ? (input?.category || "—") : (input?.type || "—");
                const line3Label = "Conta";
                const line3Value = input?.account || "Principal";
                return (
                  <div key={idx} className="space-y-2 max-w-md">
                    <div className="inline-flex items-center gap-1.5 text-[11px] font-medium text-primary">
                      <Check className="h-3.5 w-3.5" />
                      {isExp ? "Despesa registada!" : "Receita registada!"}
                    </div>
                    <div className="bg-surface border border-border-subtle rounded-2xl p-4 shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ${
                          isExp ? "bg-status-negative/10 text-status-negative" : "bg-primary/10 text-primary"
                        }`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-display text-base font-semibold text-foreground truncate">{title}</p>
                        </div>
                        <p className={`font-display text-lg font-semibold tabular-nums ${isExp ? "text-foreground" : "text-primary"}`}>
                          {isExp ? "−" : "+"}{eur(value)}
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-border-subtle/60">
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-text-muted font-medium">{line2Label}</p>
                          <p className="text-sm text-foreground mt-0.5 truncate">{line2Value}</p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-text-muted font-medium">{line3Label}</p>
                          <p className="text-sm text-foreground mt-0.5 truncate">{line3Value}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }

              // edit_* → compact card
              if (toolName === "edit_expense" || toolName === "edit_income") {
                const updated = output?.updated || {};
                return (
                  <div key={idx} className="max-w-md bg-surface border border-border-subtle rounded-2xl p-3.5 shadow-sm">
                    <div className="flex items-center gap-2 text-primary text-xs font-semibold mb-2">
                      <Pencil className="h-3.5 w-3.5" />
                      {TOOL_LABEL[toolName]}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {Object.entries(updated).map(([k, v]) => (
                        <span key={k} className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg bg-primary/8 text-foreground border border-primary/15">
                          <span className="text-text-muted">{k}:</span>
                          <span className="font-medium">{k === "value" ? eur(v as number) : String(v)}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                );
              }

              // delete_* with preview (confirm=false)
              if ((toolName === "delete_expense" || toolName === "delete_income") && output?.requiresConfirmation) {
                const prev = output.preview || {};
                return (
                  <div key={idx} className="max-w-md bg-status-pending/8 border border-status-pending/25 rounded-2xl p-4">
                    <div className="flex items-center gap-2 text-status-pending text-xs font-semibold mb-2">
                      <AlertCircle className="h-4 w-4" />
                      Confirmar eliminação
                    </div>
                    <p className="text-sm text-foreground">
                      <span className="font-semibold">{prev.description}</span>
                      {prev.value !== undefined && <> · {eur(prev.value)}</>}
                      {prev.category && <> · {prev.category}</>}
                      {prev.type && <> · {prev.type}</>}
                    </p>
                    <p className="text-[11px] text-text-muted mt-1">{prev.date} · {prev.account}</p>
                  </div>
                );
              }

              // delete_* executed
              if (toolName === "delete_expense" || toolName === "delete_income") {
                return (
                  <div key={idx} className="inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-full bg-status-negative/10 text-status-negative border border-status-negative/25">
                    <Trash2 className="h-3.5 w-3.5" />
                    {TOOL_LABEL[toolName]}
                  </div>
                );
              }

              // update_fixed_monthly
              if (toolName === "update_fixed_monthly" && output?.ok) {
                return (
                  <div key={idx} className="max-w-md bg-primary/8 border border-primary/25 rounded-2xl p-4">
                    <div className="flex items-center gap-2 text-primary text-xs font-semibold mb-2">
                      <Zap className="h-4 w-4" />
                      Despesa recorrente atualizada
                    </div>
                    <p className="text-sm font-semibold text-foreground">{output.billName}</p>
                    <p className="text-[11px] text-text-muted mt-0.5">{output.month} {output.year} · {output.paid ? "Pago" : "Pendente"}</p>
                    <p className="text-xl font-semibold text-foreground tabular-nums mt-2">{eur(output.value)}</p>
                  </div>
                );
              }

              // undo
              if (toolName === "undo_last_action") {
                return (
                  <div key={idx} className="inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/25">
                    <Undo2 className="h-3.5 w-3.5" />
                    {output?.message || "Ação anterior desfeita"}
                  </div>
                );
              }

              // list_recent_* → compact list
              if (toolName === "list_recent_expenses" || toolName === "list_recent_incomes") {
                const rows: any[] = output?.expenses || output?.incomes || [];
                if (!rows.length) {
                  return (
                    <div key={idx} className="text-xs text-text-muted italic">Sem registos encontrados.</div>
                  );
                }
                const isExp = toolName === "list_recent_expenses";
                return (
                  <div key={idx} className="max-w-md bg-surface border border-border-subtle rounded-2xl divide-y divide-border-subtle/60 shadow-sm overflow-hidden">
                    {rows.slice(0, 6).map((r) => {
                      const Icon = isExp ? categoryIcon(r.category) : TrendingUp;
                      return (
                        <div key={r.id} className="flex items-center gap-3 px-3.5 py-2.5">
                          <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${isExp ? "bg-status-negative/10 text-status-negative" : "bg-primary/10 text-primary"}`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{r.description}</p>
                            <p className="text-[11px] text-text-muted">{r.date} · {isExp ? r.category : r.type}</p>
                          </div>
                          <p className={`text-sm font-semibold tabular-nums ${isExp ? "text-foreground" : "text-primary"}`}>
                            {isExp ? "−" : "+"}{eur(r.value)}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                );
              }

              // Default success pill
              return (
                <div key={idx} className="inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/25">
                  <Check className="h-3.5 w-3.5" />
                  {TOOL_LABEL[toolName] || toolName.replace(/_/g, " ")}
                </div>
              );
            }
            return null;
          })}
        </div>
      </motion.div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] min-h-[520px] max-h-[820px] gap-4">
      {/* Thread list — desktop */}
      <aside className="hidden lg:flex flex-col w-64 bg-surface rounded-3xl border border-border-subtle/60 p-3 shadow-sm">
        <button
          onClick={startNewConversation}
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-2xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity mb-3"
        >
          <Plus className="h-4 w-4" />
          Nova conversa
        </button>
        <div className="flex-1 overflow-y-auto space-y-1 pr-1">
          {conversations.length === 0 && (
            <p className="text-xs text-text-muted px-3 py-4 text-center">Ainda sem conversas.</p>
          )}
          {conversations.map((c) => (
            <div key={c.id} className={`group flex items-center gap-1 rounded-xl transition-colors ${
              activeId === c.id ? "bg-primary/10" : "hover:bg-surface-hover"
            }`}>
              <button
                onClick={() => setActiveId(c.id)}
                className={`flex-1 text-left px-3 py-2 text-sm truncate ${
                  activeId === c.id ? "text-primary font-medium" : "text-text-secondary"
                }`}
              >
                {c.title || "Sem título"}
              </button>
              <button
                onClick={() => deleteConversation(c.id)}
                className="opacity-0 group-hover:opacity-100 px-2 py-2 text-text-muted hover:text-status-negative transition-opacity"
                aria-label="Eliminar conversa"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </aside>

      {/* Chat surface */}
      <section className="flex-1 flex flex-col bg-surface rounded-3xl border border-border-subtle/60 shadow-sm overflow-hidden">
        <header className="flex items-center justify-between px-5 py-4 border-b border-border-subtle/60">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-sm">
              <Sparkles className="h-4.5 w-4.5 text-primary-foreground" />
            </div>
            <div>
              <h2 className="font-display text-base font-semibold text-foreground leading-none">Assistente Saldo+</h2>
              <p className="text-[11px] text-text-muted mt-1">Consultor financeiro pessoal com IA</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setThreadListOpen((v) => !v)}
              className="lg:hidden inline-flex items-center gap-1.5 text-xs text-text-secondary hover:text-foreground px-3 py-1.5 rounded-xl hover:bg-surface-hover transition-colors"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              {conversations.length}
            </button>
            <button
              onClick={startNewConversation}
              className="lg:hidden inline-flex items-center gap-1.5 text-xs text-primary font-medium px-3 py-1.5 rounded-xl hover:bg-primary/10 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Nova
            </button>
          </div>
        </header>

        {/* Mobile thread list */}
        <AnimatePresence>
          {threadListOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              className="lg:hidden border-b border-border-subtle/60 overflow-hidden"
            >
              <div className="max-h-56 overflow-y-auto p-2 space-y-1">
                {conversations.length === 0 && <p className="text-xs text-text-muted px-3 py-3 text-center">Sem conversas.</p>}
                {conversations.map((c) => (
                  <div key={c.id} className={`flex items-center gap-1 rounded-xl ${activeId === c.id ? "bg-primary/10" : "hover:bg-surface-hover"}`}>
                    <button onClick={() => { setActiveId(c.id); setThreadListOpen(false); }} className={`flex-1 text-left px-3 py-2 text-sm truncate ${activeId === c.id ? "text-primary font-medium" : "text-text-secondary"}`}>{c.title || "Sem título"}</button>
                    <button onClick={() => deleteConversation(c.id)} className="px-2 py-2 text-text-muted hover:text-status-negative"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 space-y-4">
          {loadingHistory && (
            <div className="flex items-center justify-center py-10 text-text-muted text-sm gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> A carregar conversa…
            </div>
          )}
          {!loadingHistory && messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <div className="h-14 w-14 rounded-3xl bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center mb-4 shadow-md">
                <Sparkles className="h-6 w-6 text-primary-foreground" />
              </div>
              <h3 className="font-display text-xl font-semibold text-foreground mb-2">
                {(() => {
                  const h = new Date().getHours();
                  const name = (user?.user_metadata?.full_name || user?.email?.split("@")[0] || "").split(" ")[0];
                  const g = h < 12 ? "Bom dia" : h < 19 ? "Boa tarde" : "Boa noite";
                  return name ? `${g}, ${name}.` : `${g}.`;
                })()}
              </h3>
              <p className="text-sm text-text-muted max-w-md mb-6">
                Em que posso ajudar hoje? Pergunta-me sobre gastos, poupanças, metas ou pede-me para registar algo.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
                {SUGGESTIONS.map((s) => (
                  <button key={s} onClick={() => handleSuggestion(s)}
                    className="text-left text-sm px-4 py-3 rounded-2xl border border-border-subtle bg-background hover:bg-surface-hover hover:border-primary/40 transition-all text-text-secondary hover:text-foreground">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map(renderMessage)}
          {status === "submitted" && (
            <div className="flex items-center gap-2 text-text-muted text-sm">
              <div className="flex gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="h-1.5 w-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "120ms" }} />
                <span className="h-1.5 w-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "240ms" }} />
              </div>
              <span className="text-xs">A pensar…</span>
            </div>
          )}
          {error && (
            <div className="text-xs text-status-negative bg-status-negative/10 rounded-xl px-3 py-2">
              Erro ao contactar o assistente. Verifica a ligação e tenta novamente.
            </div>
          )}
        </div>

        {/* Composer */}
        <form onSubmit={handleSubmit} className="border-t border-border-subtle/60 p-3 sm:p-4">
          {messages.length > 0 && (
            <div className="flex justify-end mb-2">
              <button
                type="button"
                onClick={handleUndo}
                disabled={isLoading}
                className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full border border-border-subtle bg-background hover:bg-surface-hover text-text-secondary hover:text-foreground transition-colors disabled:opacity-40"
                title="Desfazer o último registo adicionado, editado ou eliminado pelo assistente"
              >
                <Undo2 className="h-3 w-3" />
                Desfazer último registo
              </button>
            </div>
          )}
          <div className="flex items-end gap-2 bg-background rounded-3xl border border-border-subtle focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all p-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
              }}
              placeholder="Pergunta ao teu assistente…"
              rows={1}
              disabled={isLoading}
              className="flex-1 resize-none bg-transparent px-3 py-2 text-sm focus:outline-none min-h-[36px] max-h-40 text-foreground placeholder:text-text-muted"
              style={{ height: "auto" }}
              onInput={(e) => {
                const t = e.currentTarget;
                t.style.height = "auto";
                t.style.height = Math.min(t.scrollHeight, 160) + "px";
              }}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="h-10 w-10 shrink-0 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity shadow-sm"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>
          <p className="text-[10px] text-text-muted text-center mt-2">
            As respostas baseiam-se nos teus dados. Pode conter imprecisões — verifica sempre.
          </p>
        </form>
      </section>
    </div>
  );
};

export default AIAssistant;
