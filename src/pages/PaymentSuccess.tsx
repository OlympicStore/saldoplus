import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { fbTrackPurchase } from "@/lib/fbPixel";

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, refreshProfile } = useAuth();
  const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying");

  useEffect(() => {
    const verify = async () => {
      const sessionId = searchParams.get("session_id");
      const plan = searchParams.get("plan");

      if (!sessionId || !plan || !user) {
        setStatus("error");
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke("verify-payment", {
          body: { session_id: sessionId, plan },
        });
        if (error) throw error;
        if (data?.success) {
          setStatus("success");
          const PLAN_VALUES: Record<string, number> = { essencial: 15.99, casa: 28.99, pro: 47.99 };
          fbTrackPurchase(plan, PLAN_VALUES[plan] || 0);
          await refreshProfile();
          toast.success("Plano ativado com sucesso!");
        } else {
          throw new Error("Verificação falhou");
        }
      } catch {
        setStatus("error");
        toast.error("Erro ao verificar pagamento. Contacte o suporte.");
      }
    };

    if (user) verify();
  }, [user]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-sm w-full text-center"
      >
        {status === "verifying" && (
          <div className="space-y-4">
            <Loader2 className="h-12 w-12 text-primary mx-auto animate-spin" />
            <h1 className="text-xl font-semibold text-foreground">A verificar pagamento...</h1>
            <p className="text-sm text-text-muted">Aguarde um momento.</p>
          </div>
        )}

        {status === "success" && (
          <div className="space-y-4">
            <CheckCircle className="h-16 w-16 text-primary mx-auto" />
            <h1 className="text-2xl font-bold text-foreground">Pagamento confirmado!</h1>
            <p className="text-sm text-text-muted">
              O seu plano foi ativado. Pode começar a usar todas as funcionalidades.
            </p>
            <button
              onClick={() => navigate("/app")}
              className="mt-4 px-6 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Ir para o Saldo+
            </button>
          </div>
        )}

        {status === "error" && (
          <div className="space-y-4">
            <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
              <span className="text-2xl">⚠️</span>
            </div>
            <h1 className="text-xl font-semibold text-foreground">Erro na verificação</h1>
            <p className="text-sm text-text-muted">
              Houve um problema ao verificar o pagamento. Se o valor foi cobrado, contacte o suporte.
            </p>
            <button
              onClick={() => navigate("/")}
              className="mt-4 px-6 py-2.5 rounded-lg border border-border-subtle text-foreground text-sm font-medium hover:bg-surface-hover transition-colors"
            >
              Voltar aos planos
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default PaymentSuccess;
