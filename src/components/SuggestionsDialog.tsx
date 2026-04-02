import { useState } from "react";
import { motion } from "framer-motion";
import { MessageSquarePlus, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export const SuggestionsDialog = () => {
  const { user, profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(profile?.full_name || "");
  const [email, setEmail] = useState(profile?.email || "");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const handleSubmit = async () => {
    if (!message.trim()) {
      toast.error("Por favor, escreva uma mensagem.");
      return;
    }
    setSending(true);
    const { error } = await supabase.from("suggestions").insert({
      user_id: user?.id,
      name: name.trim(),
      email: email.trim(),
      message: message.trim(),
    } as any);
    setSending(false);
    if (error) {
      toast.error("Erro ao enviar sugestão.");
    } else {
      toast.success("Sugestão enviada com sucesso!");
      setMessage("");
      setOpen(false);
    }
  };

  return (
    <>
      <button
        onClick={() => {
          setName(profile?.full_name || "");
          setEmail(profile?.email || "");
          setOpen(true);
        }}
        className="flex items-center gap-1.5 text-text-muted hover:text-primary transition-colors text-sm"
      >
        <MessageSquarePlus className="h-4 w-4" />
        <span className="hidden sm:inline">Sugestões</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={() => setOpen(false)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-surface rounded-xl shadow-card border border-border-subtle/60 p-5 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-foreground">Enviar Sugestão</h3>
              <button onClick={() => setOpen(false)} className="text-text-muted hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-text-muted mb-1 block">Nome</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full text-sm bg-background border border-border-subtle rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="O seu nome"
                />
              </div>
              <div>
                <label className="text-xs text-text-muted mb-1 block">Email</label>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  className="w-full text-sm bg-background border border-border-subtle rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="seu@email.com"
                />
              </div>
              <div>
                <label className="text-xs text-text-muted mb-1 block">Mensagem</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  className="w-full text-sm bg-background border border-border-subtle rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                  placeholder="Escreva a sua sugestão ou feedback..."
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end mt-4">
              <button onClick={() => setOpen(false)} className="px-3 py-1.5 text-sm text-text-muted hover:bg-surface-hover rounded-lg transition-colors">
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={sending}
                className="px-4 py-1.5 text-sm bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {sending ? "A enviar..." : "Enviar"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
};
