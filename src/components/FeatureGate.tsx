import { Lock, Sparkles, Crown, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useFeatureAccess, FEATURE_LABELS, type FeatureKey } from "@/lib/featureAccess";
import { PLANS } from "@/lib/plans";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface FeatureGateProps {
  feature: FeatureKey;
  children: React.ReactNode;
  /** Optional custom title override. */
  title?: string;
  /** Optional list of benefits shown on the wall. */
  benefits?: string[];
}

/**
 * Renders children if the user has access to `feature`,
 * otherwise renders an elegant upgrade wall (never hides the feature).
 */
export const FeatureGate = ({ feature, children, title, benefits }: FeatureGateProps) => {
  const access = useFeatureAccess(feature);
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(false);

  if (access.allowed) return <>{children}</>;

  const plan = PLANS[access.requiredPlan];
  const label = FEATURE_LABELS[feature];
  const isElite = access.requiredPlan === "pro";
  const displayTitle = title ?? label.title;

  const highlightBenefits = benefits ?? plan.features.slice(0, 6);

  const handleUpgrade = async () => {
    if (!user) {
      navigate(`/auth?mode=signup&plan=${access.requiredPlan}`);
      return;
    }
    setLoading(true);
    try {
      // For users already subscribed → try upgrade differential flow.
      const endpoint = profile?.plan && profile.plan !== access.requiredPlan
        ? "create-upgrade"
        : "create-checkout";
      const body = endpoint === "create-upgrade"
        ? { target_plan: access.requiredPlan }
        : { plan: access.requiredPlan };
      const { data, error } = await supabase.functions.invoke(endpoint, { body });
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank", "noopener,noreferrer");
      }
    } catch (err: any) {
      toast.error(err?.message || "Não foi possível iniciar o upgrade.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative w-full max-w-xl bg-surface rounded-3xl border border-border-subtle/60 shadow-card p-8 sm:p-10 text-center overflow-hidden"
      >
        {/* Glow */}
        <div
          aria-hidden
          className={`absolute inset-x-0 -top-24 h-48 blur-3xl opacity-40 pointer-events-none ${
            isElite ? "bg-gradient-to-b from-amber-300/60 to-transparent" : "bg-gradient-to-b from-primary/40 to-transparent"
          }`}
        />

        <div className="relative">
          <div className={`inline-flex h-14 w-14 items-center justify-center rounded-2xl mb-5 ${
            isElite ? "bg-amber-100 text-amber-700" : "bg-primary/10 text-primary"
          }`}>
            {isElite ? <Crown className="h-7 w-7" /> : <Lock className="h-6 w-6" />}
          </div>

          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold mb-3 ${
            isElite ? "bg-amber-100 text-amber-800" : "bg-primary/10 text-primary"
          }`}>
            <Sparkles className="h-3 w-3" />
            {isElite ? "Disponível apenas no Elite" : `Disponível no plano ${plan.name}`}
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight mb-2">
            {displayTitle}
          </h2>
          <p className="text-text-secondary text-sm sm:text-base mb-6 max-w-md mx-auto">
            {label.description}
          </p>

          <div className="bg-background/60 rounded-2xl border border-border-subtle/60 p-5 text-left mb-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-3">
              Vai desbloquear
            </p>
            <ul className="space-y-2">
              {highlightBenefits.map((b, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                  <span className={`mt-1 h-1.5 w-1.5 rounded-full flex-shrink-0 ${isElite ? "bg-amber-500" : "bg-primary"}`} />
                  {b}
                </li>
              ))}
            </ul>
          </div>

          <button
            onClick={handleUpgrade}
            disabled={loading}
            className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-semibold text-base transition-all shadow-lg disabled:opacity-60 ${
              isElite
                ? "bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-amber-500/30 hover:opacity-95"
                : "bg-primary text-primary-foreground shadow-primary/20 hover:opacity-90"
            }`}
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
              <>
                {access.ctaLabel}
                <ArrowRight className="h-5 w-5" />
              </>
            )}
          </button>
          <p className="text-xs text-text-muted mt-4">
            {isElite
              ? "🔥 Poupa 240€ face ao preço mensal. Cobrado anualmente."
              : "3 dias grátis. Cancele quando quiser."}
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default FeatureGate;
