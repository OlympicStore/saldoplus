import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Lock, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState<boolean | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;

    const prepareRecovery = async () => {
      try {
        const currentUrl = new URL(window.location.href);
        const hash = currentUrl.hash.startsWith("#") ? currentUrl.hash.slice(1) : currentUrl.hash;
        const hashParams = new URLSearchParams(hash);
        const searchParams = currentUrl.searchParams;

        // Surface error from email link (expired/invalid)
        const errDesc = hashParams.get("error_description") || searchParams.get("error_description");
        if (errDesc) throw new Error(decodeURIComponent(errDesc.replace(/\+/g, " ")));

        const code = searchParams.get("code");
        const tokenHash = searchParams.get("token_hash") || hashParams.get("token_hash");
        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");
        const flowType = hashParams.get("type") ?? searchParams.get("type");

        // 1) PKCE flow (?code=...)
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        }
        // 2) OTP/token_hash flow (?token_hash=...&type=recovery)
        else if (tokenHash) {
          const { error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: "recovery",
          });
          if (error) throw error;
        }
        // 3) Implicit flow (#access_token=...&refresh_token=...)
        else if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) throw error;
        }

        const { data: { session } } = await supabase.auth.getSession();

        if (!active) return;
        const ok = flowType === "recovery" || Boolean(session) || Boolean(code) || Boolean(tokenHash) || Boolean(accessToken);
        setReady(ok);
        if (!ok) setErrorMsg("Link inválido ou expirado.");
      } catch (err: any) {
        if (!active) return;
        setReady(false);
        setErrorMsg(err.message || "Link inválido ou expirado.");
        toast.error(err.message || "Link inválido ou expirado.");
      }
    };

    void prepareRecovery();

    return () => {
      active = false;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("A password deve ter pelo menos 6 caracteres");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      await supabase.auth.signOut();
      toast.success("Password atualizada com sucesso!");
      navigate("/auth");
    } catch (err: any) {
      toast.error(err.message || "Erro ao atualizar password");
    } finally {
      setLoading(false);
    }
  };

  if (ready === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center bg-surface rounded-xl shadow-card border border-border-subtle/60 p-6">
          <h1 className="text-lg font-semibold text-foreground mb-2">Link inválido</h1>
          <p className="text-sm text-text-muted mb-4">{errorMsg || "Link inválido ou expirado."}</p>
          <button
            onClick={() => navigate("/forgot-password")}
            className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Pedir novo link
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">Nova Password</h1>
          <p className="text-sm text-text-muted mt-1">Defina a sua nova password</p>
        </div>
        <div className="bg-surface rounded-xl shadow-card border border-border-subtle/60 p-6">
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
              <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="Nova password" required minLength={6} autoFocus
                className="w-full pl-10 pr-10 py-2.5 text-sm bg-background border border-border-subtle rounded-lg focus:outline-none focus:ring-1 focus:ring-primary" />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-foreground">
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
              {loading ? "A atualizar..." : "Atualizar password"}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

export default ResetPassword;
