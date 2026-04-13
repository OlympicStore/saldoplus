import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Home, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const STORAGE_KEY = "partner_onboarding_seen";

const PartnerOnboarding = () => {
  const { profile } = useAuth();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (
      profile?.plan === "parceiro_pro" &&
      profile?.plan_source === "partner" &&
      !localStorage.getItem(STORAGE_KEY)
    ) {
      setVisible(true);
    }
  }, [profile]);

  const dismiss = () => {
    setVisible(false);
    localStorage.setItem(STORAGE_KEY, "1");
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
          onClick={dismiss}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="bg-surface rounded-2xl shadow-card border border-border-subtle/60 p-6 sm:p-8 max-w-md w-full relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={dismiss}
              className="absolute top-4 right-4 text-text-muted hover:text-foreground transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex flex-col items-center text-center">
              <div className="h-16 w-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-5 text-3xl">
                🏠
              </div>
              <h2 className="text-xl font-bold text-foreground mb-2">
                Bem-vindo ao Parceiro Pro
              </h2>
              <p className="text-sm text-text-muted leading-relaxed mb-6">
                Este acesso foi oferecido pela sua imobiliária para o ajudar na gestão financeira da sua nova casa.
                Tem acesso a todas as funcionalidades premium, incluindo a secção <strong>Minha Casa</strong>.
              </p>
              <div className="w-full space-y-2 mb-6">
                {[
                  "Gestão completa de despesas e rendimentos",
                  "Orçamentos por categoria",
                  "Sugestões de IA personalizadas",
                  "Secção Minha Casa — acompanhe o impacto da habitação",
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2.5 text-left">
                    <div className="h-5 w-5 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 text-xs">
                      ✓
                    </div>
                    <span className="text-sm text-text-secondary">{item}</span>
                  </div>
                ))}
              </div>
              <button
                onClick={dismiss}
                className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity"
              >
                Começar a explorar
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PartnerOnboarding;
