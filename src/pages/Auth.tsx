import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Mail, Lock, User, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { fbTrackLead } from "@/lib/fbPixel";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate("/app");
      } else {
        // Check if email is registered in Stripe before allowing signup
        const { data: checkData, error: checkError } = await supabase.functions.invoke("check-email-allowed", {
          body: { email },
        });
        if (checkError) throw new Error("Erro ao verificar email. Tente novamente.");
        if (!checkData?.allowed) {
          toast.error("Este email não tem um pagamento associado. Adquira um plano primeiro.");
          setLoading(false);
          return;
        }

        const { error } = await supabase.auth.signUp({
          email, password,
          options: {
            data: { full_name: fullName },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        fbTrackLead();
        toast.success("Conta criada! Verifique o seu email para confirmar.");
      }
    } catch (err: any) {
      toast.error(err.message || "Erro na autenticação");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) throw result.error;
    } catch (err: any) {
      toast.error(err.message || "Erro ao entrar com Google");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">Dashboard Financeiro</h1>
          <p className="text-sm text-text-muted mt-1">
            {isLogin ? "Entre na sua conta" : "Crie a sua conta"}
          </p>
        </div>

        <div className="bg-surface rounded-xl shadow-card border border-border-subtle/60 p-6">
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-border-subtle text-sm font-medium text-foreground hover:bg-surface-hover transition-colors mb-4"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Entrar com Google
          </button>

          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-border-subtle" />
            <span className="text-xs text-text-muted">ou</span>
            <div className="flex-1 h-px bg-border-subtle" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {!isLogin && (
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
                <input
                  type="text" value={fullName} onChange={(e) => setFullName(e.target.value)}
                  placeholder="Nome completo"
                  className="w-full pl-10 pr-3 py-2.5 text-sm bg-background border border-border-subtle rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            )}
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
              <input
                type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="Email" required
                className="w-full pl-10 pr-3 py-2.5 text-sm bg-background border border-border-subtle rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
              <input
                type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="Password" required minLength={6}
                className="w-full pl-10 pr-10 py-2.5 text-sm bg-background border border-border-subtle rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-foreground">
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {isLogin && (
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs text-text-muted cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-border-subtle text-primary focus:ring-primary h-3.5 w-3.5"
                  />
                  Lembrar-me
                </label>
                <Link to="/forgot-password" className="text-xs text-primary hover:underline">
                  Esqueceu a password?
                </Link>
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
              {loading ? "A processar..." : isLogin ? "Entrar" : "Criar conta"}
            </button>
          </form>

          <p className="text-center text-xs text-text-muted mt-4">
            {isLogin ? "Não tem conta? " : "Já tem conta? "}
            <button onClick={() => setIsLogin(!isLogin)} className="text-primary font-medium hover:underline">
              {isLogin ? "Criar conta" : "Entrar"}
            </button>
          </p>

          <div className="mt-6 pt-4 border-t border-border-subtle/40 text-center">
            <p className="text-xs text-text-muted">
              Ficou com dúvidas? Contacte-nos através de{" "}
              <a href="mailto:contactosaldoplus@gmail.com" className="text-primary hover:underline font-medium">
                contactosaldoplus@gmail.com
              </a>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Auth;
