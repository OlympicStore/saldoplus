import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { AlertTriangle, ArrowRight, LogOut, Sparkles, TrendingUp } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { openCheckout, nextUpgradePlan, PLAN_LABELS } from "@/lib/paymentLinks";

const TrialExpired = () => {
  const navigate = useNavigate();
  const { signOut, profile, user } = useAuth();

  const isDataDeleted = profile?.account_status === "data_deleted";
  const currentPlan = profile?.plan || "essencial";
  const planLabel = PLAN_LABELS[currentPlan] || currentPlan;
  const upgradePlan = nextUpgradePlan(currentPlan);

  const handleSubscribe = () => openCheckout(currentPlan, user?.email);
  const handleUpgrade = () => upgradePlan && openCheckout(upgradePlan, user?.email);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md text-center"
      >
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-status-negative/10 border border-status-negative/20 mb-6">
          <AlertTriangle className="h-7 w-7 text-status-negative" />
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">
          {isDataDeleted ? "O seu acesso foi suspenso" : "O seu teste gratuito terminou"}
        </h1>

        <p className="text-text-muted mb-8 leading-relaxed">
          {isDataDeleted
            ? "Subscreva agora para reativar o seu acesso. Os seus dados serão restaurados imediatamente após a subscrição."
            : "Subscreva para continuar a usar o Saldo+ e manter todos os seus dados intactos."}
        </p>

        <div className="bg-surface rounded-xl border border-primary/20 p-5 mb-3 text-left">
          <div className="flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-foreground mb-1">
                Plano {planLabel} — 1 ano completo
              </p>
              <p className="text-xs text-text-muted leading-relaxed">
                Continue com o plano que estava a testar. Acesso imediato e dados restaurados.
              </p>
            </div>
          </div>
        </div>

        {upgradePlan && (
          <div className="bg-surface rounded-xl border border-border-subtle/60 p-4 mb-6 text-left">
            <div className="flex items-start gap-3">
              <TrendingUp className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground mb-1">
                  Quer fazer upgrade para o plano {PLAN_LABELS[upgradePlan]}?
                </p>
                <p className="text-xs text-text-muted leading-relaxed mb-3">
                  Desbloqueie ainda mais funcionalidades.
                </p>
                <button
                  onClick={handleUpgrade}
                  className="text-xs px-3 py-1.5 rounded-lg border border-primary/30 text-primary font-medium hover:bg-primary/10 transition-colors"
                >
                  Ver plano {PLAN_LABELS[upgradePlan]} →
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2.5">
          <button
            onClick={handleSubscribe}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
          >
            Subscrever plano {planLabel}
            <ArrowRight className="h-4 w-4" />
          </button>
          <button
            onClick={() => navigate("/")}
            className="w-full py-2.5 rounded-xl text-text-muted hover:text-foreground transition-colors text-sm"
          >
            Ver todos os planos
          </button>
          <button
            onClick={async () => { await signOut(); navigate("/auth"); }}
            className="w-full py-2.5 rounded-xl text-text-muted hover:text-foreground transition-colors flex items-center justify-center gap-2 text-sm"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default TrialExpired;
