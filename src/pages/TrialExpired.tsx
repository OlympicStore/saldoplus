import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { AlertTriangle, ArrowRight, LogOut, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const TrialExpired = () => {
  const navigate = useNavigate();
  const { signOut, profile } = useAuth();

  const isDataDeleted = profile?.account_status === "data_deleted";

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

        <div className="bg-surface rounded-xl border border-border-subtle/60 p-5 mb-6 text-left">
          <div className="flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-foreground mb-1">
                Subscreva e continue de onde parou
              </p>
              <p className="text-xs text-text-muted leading-relaxed">
                Acesso a 1 ano completo, todas as funcionalidades, e os seus dados imediatamente disponíveis.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          <button
            onClick={() => navigate("/")}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
          >
            Ver planos e subscrever
            <ArrowRight className="h-4 w-4" />
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
