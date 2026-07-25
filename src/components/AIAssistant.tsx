import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import ReactMarkdown from "react-markdown";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Plus, MessageSquare, Trash2, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Conversation = { id: string; title: string; updated_at: string };
type StoredMessage = { id: string; role: "user" | "assistant" | "system"; parts: UIMessage["parts"]; created_at: string };

const SUGGESTIONS = [
  "Quanto gastei este mês?",
  "Onde consigo poupar dinheiro?",
  "Qual foi a minha maior despesa?",
  "Quanto falta para atingir as minhas metas?",
];

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
              const failed = state === "output-error";
              const output = p.output as any;
              const success = output?.ok !== false;
              const label = done
                ? (failed || !success ? `⚠️ ${toolName}` : `✓ ${toolName.replace(/_/g, " ")}`)
                : `⚙️ ${toolName.replace(/_/g, " ")}…`;
              return (
                <div key={idx} className={`inline-flex items-center gap-2 text-[11px] px-2.5 py-1 rounded-full border ${
                  failed || !success
                    ? "bg-status-negative/10 border-status-negative/30 text-status-negative"
                    : done
                      ? "bg-primary/10 border-primary/30 text-primary"
                      : "bg-surface-hover border-border-subtle text-text-muted"
                }`}>
                  <span className="font-medium">{label}</span>
                  {done && output?.error && <span className="text-text-muted truncate max-w-[200px]">— {String(output.error)}</span>}
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
              <h3 className="font-display text-xl font-semibold text-foreground mb-2">Olá! Como posso ajudar?</h3>
              <p className="text-sm text-text-muted max-w-md mb-6">
                Sou o teu assistente financeiro. Pergunta-me sobre gastos, poupanças, metas ou padrões nas tuas finanças.
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
