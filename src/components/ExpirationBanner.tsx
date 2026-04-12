import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, ArrowRight, X } from "lucide-react";
import { useState } from "react";

const ExpirationBanner = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);

  if (!profile || dismissed) return null;

  const expiryDate = profile.plan_expires_at ? new Date(profile.plan_expires_at) : null;
  if (!expiryDate) return null;

  const now = Date.now();
  const daysRemaining = Math.ceil((expiryDate.getTime() - now) / (1000 * 60 * 60 * 24));
  const isExpired = daysRemaining <= 0;
  const isWarning = daysRemaining > 0 && daysRemaining <= 7;

  if (!isExpired && !isWarning) return null;

  const isPartner = profile.plan_source === "partner";
  const planLabel = profile.plan === "casa_segura_plus" ? "Casa Segura Plus" : profile.plan;

  return (
    <div className={`border-b ${isExpired ? "bg-status-negative/5 border-status-negative/20" : "bg-yellow-500/5 border-yellow-500/20"}`}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <AlertTriangle className={`h-5 w-5 shrink-0 ${isExpired ? "text-status-negative" : "text-yellow-500"}`} />
          <div className="min-w-0">
            {isExpired ? (
              <p className="text-sm text-foreground font-medium">
                {isPartner
                  ? `O seu acesso ${planLabel} expirou.`
                  : `O seu plano ${planLabel} expirou.`}
              </p>
            ) : (
              <p className="text-sm text-foreground font-medium">
                {isPartner
                  ? `O seu acesso ${planLabel} está a terminar em ${daysRemaining} dia${daysRemaining > 1 ? "s" : ""}.`
                  : `O seu plano ${planLabel} expira em ${daysRemaining} dia${daysRemaining > 1 ? "s" : ""}.`}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity"
          >
            Continuar com plano premium
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="p-1 rounded-lg text-text-muted hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExpirationBanner;
