import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Sparkles, Clock, ArrowRight, X } from "lucide-react";
import { useState, useMemo } from "react";

const TrialBanner = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);

  const info = useMemo(() => {
    if (!profile || profile.account_status !== "trial_active" || !profile.trial_ends_at) return null;
    const end = new Date(profile.trial_ends_at);
    const ms = end.getTime() - Date.now();
    const days = Math.ceil(ms / (1000 * 60 * 60 * 24));
    if (days <= 0) return null;
    return { days, urgent: days <= 1 };
  }, [profile]);

  if (!info || dismissed) return null;

  return (
    <div className={`border-b ${info.urgent ? "bg-yellow-500/10 border-yellow-500/30" : "bg-primary/5 border-primary/20"}`}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          {info.urgent ? (
            <Clock className="h-4 w-4 shrink-0 text-yellow-600" />
          ) : (
            <Sparkles className="h-4 w-4 shrink-0 text-primary" />
          )}
          <p className="text-sm text-foreground font-medium truncate">
            {info.urgent
              ? `⚠️ Último dia do teste gratuito! Subscreva para não perder os seus dados.`
              : `🎉 Teste gratuito ativo — ${info.days} ${info.days === 1 ? "dia restante" : "dias restantes"}`}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity"
          >
            Subscrever agora
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="p-1 rounded-lg text-text-muted hover:text-foreground transition-colors"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default TrialBanner;
