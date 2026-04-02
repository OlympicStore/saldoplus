import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Check, Zap, Home, Crown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const PLANS = [
  {
    id: "essencial",
    name: "Essencial",
    price: "9,99",
    icon: Zap,
    color: "primary",
    features: [
      "Dashboard Home",
      "Gastos Fixos",
      "Gastos Variáveis",
      "Resumo Anual",
    ],
    missing: ["Rendimentos", "Metas Financeiras", "Orçamentos por Categoria"],
  },
  {
    id: "casa",
    name: "Casa",
    price: "19,99",
    icon: Home,
    color: "accent",
    popular: true,
    features: [
      "Dashboard Home",
      "Gastos Fixos",
      "Gastos Variáveis",
      "Rendimentos",
      "Resumo Anual",
      "Metas Financeiras",
    ],
    missing: ["Orçamentos por Categoria"],
  },
  {
    id: "pro",
    name: "Pro",
    price: "29,99",
    icon: Crown,
    color: "amber",
    features: [
      "Dashboard Home",
      "Gastos Fixos",
      "Gastos Variáveis",
      "Rendimentos",
      "Resumo Anual",
      "Metas Financeiras",
      "Orçamentos por Categoria",
      "Alertas de limite de gastos",
    ],
    missing: [],
  },
];

const Pricing = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const handleSelectPlan = async (planId: string) => {
    if (!user) {
      toast.info("Crie uma conta ou entre para continuar.");
      navigate("/auth");
      return;
    }

    setLoadingPlan(planId);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { plan: planId },
      });
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao processar pagamento");
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border-subtle/60 bg-surface/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <button onClick={() => navigate("/")} className="flex items-center gap-1">
            <span className="text-xl font-bold tracking-tight text-foreground">Saldo</span>
            <span className="text-xl font-bold text-primary">+</span>
          </button>
          <div className="flex items-center gap-3">
            {user ? (
              <button
                onClick={() => navigate("/app")}
                className="text-sm px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity"
              >
                Ir para o App
              </button>
            ) : (
              <button
                onClick={() => navigate("/auth")}
                className="text-sm px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity"
              >
                Entrar
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 pt-16 pb-8 text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground tracking-tight mb-4">
            Controle as suas finanças <br className="hidden md:block" />
            <span className="text-primary">de forma simples</span>
          </h1>
          <p className="text-text-muted text-lg max-w-2xl mx-auto mb-2">
            O Saldo+ ajuda-o a gerir despesas, rendimentos e metas financeiras da sua casa. Escolha o plano ideal para si.
          </p>
          <p className="text-sm text-text-muted">Pagamento único · Acesso por 1 ano</p>
        </motion.div>
      </section>

      {/* Pricing Cards */}
      <section className="max-w-6xl mx-auto px-4 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {PLANS.map((plan, i) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className={`relative rounded-xl border bg-surface shadow-card p-6 flex flex-col ${
                plan.popular
                  ? "border-primary ring-2 ring-primary/20 scale-[1.02]"
                  : "border-border-subtle/60"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary text-primary-foreground text-xs font-semibold rounded-full">
                  Mais Popular
                </div>
              )}

              <div className="flex items-center gap-2 mb-4">
                <plan.icon className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold text-foreground">{plan.name}</h3>
              </div>

              <div className="mb-6">
                <span className="text-3xl font-bold text-foreground">{plan.price}€</span>
                <span className="text-sm text-text-muted ml-1">/ano</span>
              </div>

              <ul className="space-y-2.5 mb-8 flex-1">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm text-foreground">
                    <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    {feature}
                  </li>
                ))}
                {plan.missing.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm text-text-muted line-through opacity-50">
                    <Check className="h-4 w-4 mt-0.5 shrink-0 opacity-30" />
                    {feature}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleSelectPlan(plan.id)}
                disabled={loadingPlan !== null}
                className={`w-full py-2.5 rounded-lg text-sm font-medium transition-opacity disabled:opacity-50 ${
                  plan.popular
                    ? "bg-primary text-primary-foreground hover:opacity-90"
                    : "border border-border-subtle text-foreground hover:bg-surface-hover"
                }`}
              >
                {loadingPlan === plan.id ? "A processar..." : "Escolher plano"}
              </button>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Pricing;
