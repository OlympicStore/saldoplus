import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Mail } from "lucide-react";
import { toast } from "sonner";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setSent(true);
      toast.success("Email enviado! Verifique a sua caixa de correio.");
    } catch (err: any) {
      toast.error(err.message || "Erro ao enviar email");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">Recuperar Password</h1>
          <p className="text-sm text-text-muted mt-1">Enviaremos um link para o seu email</p>
        </div>
        <div className="bg-surface rounded-xl shadow-card border border-border-subtle/60 p-6">
          {sent ? (
            <div className="text-center py-4">
              <p className="text-sm text-foreground mb-4">Email enviado com sucesso!</p>
              <Link to="/auth" className="text-sm text-primary hover:underline">Voltar ao login</Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email" required
                  className="w-full pl-10 pr-3 py-2.5 text-sm bg-background border border-border-subtle rounded-lg focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
                {loading ? "A enviar..." : "Enviar link"}
              </button>
              <p className="text-center text-xs text-text-muted">
                <Link to="/auth" className="text-primary hover:underline">Voltar ao login</Link>
              </p>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default ForgotPassword;
