import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Check, Zap, Home, Crown, TrendingUp, PieChart, Target, Shield, ChevronDown, ChevronUp, ArrowRight, Users, BarChart3, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import dashboardPreview from "@/assets/dashboard-preview.png";
import dashboardGoals from "@/assets/dashboard-goals.png";

const PLANS = [
  {
    id: "essencial",
    name: "Essencial",
    price: "9,99",
    icon: Zap,
    features: [
      "Veja rapidamente para onde vai o seu dinheiro",
      "Controle despesas fixas sem esquecer nenhuma",
      "Acompanhe gastos do dia a dia sem esforço",
      "Resumo anual completo",
    ],
    missing: ["Rendimentos", "Metas Financeiras", "Orçamentos por Categoria"],
  },
  {
    id: "casa",
    name: "Casa",
    price: "19,99",
    icon: Home,
    popular: true,
    features: [
      "Tudo do plano Essencial",
      "Registe todos os rendimentos da família",
      "Defina metas e acompanhe o progresso",
      "Gráficos de evolução mensal",
      "Divisão justa de despesas entre pessoas",
    ],
    missing: ["Orçamentos por Categoria"],
  },
  {
    id: "pro",
    name: "Pro",
    price: "29,99",
    icon: Crown,
    features: [
      "Tudo do plano Casa",
      "Orçamentos por categoria com alertas",
      "Relatórios avançados e comparações",
      "Gráficos de gastos vs rendimentos",
      "Controlo total das suas finanças",
    ],
    missing: [],
  },
];

const PROBLEMS = [
  { emoji: "😰", text: "Não sei onde gasto o meu dinheiro" },
  { emoji: "💸", text: "Chego ao fim do mês sem poupar nada" },
  { emoji: "📝", text: "Tenho despesas espalhadas em todo o lado" },
  { emoji: "🤯", text: "Dividir contas da casa é um pesadelo" },
];

const SOLUTIONS = [
  { icon: Wallet, text: "Tudo centralizado num só lugar" },
  { icon: BarChart3, text: "Visão mensal clara e automática" },
  { icon: Target, text: "Metas de poupança com progresso real" },
  { icon: Users, text: "Divisão justa entre quem vive consigo" },
];

const STEPS = [
  { num: "1", title: "Crie a sua conta", desc: "Registe-se em menos de 1 minuto com email ou Google." },
  { num: "2", title: "Insira os seus dados", desc: "Adicione contas, rendimentos e despesas. É simples e guiado." },
  { num: "3", title: "Acompanhe resultados", desc: "Veja gráficos, metas e o seu saldo evoluir semana a semana." },
];

const TESTIMONIALS = [
  { name: "Ana S.", text: "Finalmente consigo ver para onde vai o meu dinheiro. Em 2 meses já poupei mais do que no ano todo.", avatar: "AS" },
  { name: "Miguel R.", text: "A divisão de despesas da casa ficou muito mais justa. Sem discussões, sem confusões.", avatar: "MR" },
  { name: "Carla F.", text: "Uso 5 minutos por semana e tenho tudo controlado. Simples e eficaz.", avatar: "CF" },
];

const FAQS = [
  { q: "Preciso saber de Excel ou contabilidade?", a: "Não! O Saldo+ é desenhado para iniciantes. Basta inserir os valores e nós fazemos os cálculos." },
  { q: "Funciona no telemóvel?", a: "Sim, o Saldo+ é 100% responsivo e funciona perfeitamente no telemóvel, tablet e computador." },
  { q: "É pagamento único?", a: "Sim! Paga uma vez e tem acesso completo durante 1 ano. Sem mensalidades escondidas." },
  { q: "Os meus dados estão seguros?", a: "Absolutamente. Usamos encriptação de ponta e os seus dados são privados — só você tem acesso." },
  { q: "Posso mudar de plano depois?", a: "Sim, pode fazer upgrade a qualquer momento e só paga a diferença." },
];

const Pricing = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

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
      if (data?.url) window.location.href = data.url;
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
            <a href="#precos" className="text-sm text-text-muted hover:text-foreground transition-colors hidden sm:inline">Preços</a>
            <a href="#como-funciona" className="text-sm text-text-muted hover:text-foreground transition-colors hidden sm:inline">Como funciona</a>
            {user ? (
              <button onClick={() => navigate("/app")}
                className="text-sm px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity">
                Ir para o App
              </button>
            ) : (
              <button onClick={() => navigate("/auth")}
                className="text-sm px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity">
                Começar agora
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 pt-16 sm:pt-24 pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              <TrendingUp className="h-4 w-4" />
              +500 pessoas já organizam as suas finanças
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground tracking-tight leading-[1.1] mb-6">
              Saiba para onde vai o seu dinheiro
              <span className="text-primary block mt-1">— em 5 minutos por semana</span>
            </h1>
            <p className="text-text-muted text-lg sm:text-xl max-w-xl mb-8 leading-relaxed">
              Pare de perder dinheiro sem perceber. O Saldo+ organiza as finanças da sua casa sem complicações.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button onClick={() => user ? navigate("/app") : navigate("/auth")}
                className="px-6 py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold text-base hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
                Quero controlar o meu dinheiro <ArrowRight className="h-5 w-5" />
              </button>
              <a href="#precos"
                className="px-6 py-3.5 rounded-xl border border-border-subtle text-foreground font-medium text-base hover:bg-surface-hover transition-colors text-center">
                Ver planos
              </a>
            </div>
            <div className="flex items-center gap-4 mt-6 text-sm text-text-muted">
              <span className="flex items-center gap-1.5"><Shield className="h-4 w-4 text-primary" /> Dados 100% seguros</span>
              <span>·</span>
              <span>Pagamento único</span>
              <span>·</span>
              <span>Acesso imediato</span>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6, delay: 0.2 }}
            className="relative">
            <div className="rounded-2xl overflow-hidden shadow-2xl border border-border-subtle/60">
              <img src={dashboardPreview} alt="Dashboard do Saldo+ mostrando saldo, gráficos e despesas" width={1280} height={720} className="w-full h-auto" />
            </div>
            <div className="absolute -bottom-6 -left-6 w-40 sm:w-52 rounded-xl overflow-hidden shadow-xl border border-border-subtle/60 hidden sm:block">
              <img src={dashboardMobile} alt="Saldo+ no telemóvel" loading="lazy" width={640} height={800} className="w-full h-auto" />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Problem / Solution */}
      <section className="max-w-6xl mx-auto px-4 py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
            className="bg-surface rounded-2xl border border-border-subtle/60 p-8">
            <h2 className="text-2xl font-bold text-foreground mb-6">Isto parece-lhe familiar?</h2>
            <div className="space-y-4">
              {PROBLEMS.map((p, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-[hsl(var(--status-negative)/0.05)]">
                  <span className="text-xl">{p.emoji}</span>
                  <p className="text-foreground">{p.text}</p>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
            className="bg-surface rounded-2xl border border-primary/20 p-8">
            <h2 className="text-2xl font-bold text-foreground mb-6">
              Com o Saldo<span className="text-primary">+</span>, tudo muda.
            </h2>
            <div className="space-y-4">
              {SOLUTIONS.map((s, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-[hsl(var(--status-paid)/0.05)]">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <s.icon className="h-4 w-4 text-primary" />
                  </div>
                  <p className="text-foreground pt-1">{s.text}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Product showcase */}
      <section className="bg-surface border-y border-border-subtle/60 py-20">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Tudo o que precisa, num só lugar
            </h2>
            <p className="text-text-muted text-lg max-w-2xl mx-auto mb-12">
              Dashboard intuitivo, gráficos automáticos e controlo total — sem complicações.
            </p>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { icon: PieChart, title: "Visão clara dos gastos", desc: "Gráficos que mostram exatamente para onde vai cada euro." },
              { icon: TrendingUp, title: "Evolução do saldo", desc: "Acompanhe a evolução do seu saldo mês a mês com gráficos." },
              { icon: Target, title: "Metas de poupança", desc: "Defina objetivos e veja o progresso em tempo real." },
            ].map((f, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-background rounded-xl border border-border-subtle/60 p-6 text-left">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <f.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{f.title}</h3>
                <p className="text-sm text-text-muted">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="como-funciona" className="max-w-6xl mx-auto px-4 py-20">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">Como funciona</h2>
          <p className="text-text-muted text-lg">3 passos simples para controlar as suas finanças</p>
        </motion.div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          {STEPS.map((step, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              transition={{ delay: i * 0.15 }} className="text-center">
              <div className="h-14 w-14 rounded-full bg-primary text-primary-foreground text-xl font-bold flex items-center justify-center mx-auto mb-4">
                {step.num}
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">{step.title}</h3>
              <p className="text-sm text-text-muted">{step.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Social Proof */}
      <section className="bg-surface border-y border-border-subtle/60 py-20">
        <div className="max-w-6xl mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">O que dizem os nossos utilizadores</h2>
            <p className="text-text-muted text-lg">+500 pessoas já controlam as finanças com o Saldo+</p>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-background rounded-xl border border-border-subtle/60 p-6">
                <p className="text-foreground text-sm mb-4 leading-relaxed">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 text-primary font-semibold flex items-center justify-center text-sm">
                    {t.avatar}
                  </div>
                  <span className="text-sm font-medium text-foreground">{t.name}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="precos" className="max-w-6xl mx-auto px-4 py-20">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-4">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Escolha o plano ideal para si
          </h2>
          <p className="text-text-muted text-lg max-w-2xl mx-auto mb-2">
            Pagamento único · Acesso por 1 ano · Sem mensalidades
          </p>
          <p className="text-sm text-primary font-medium">Garantia de 7 dias — se não gostar, devolvemos o dinheiro</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto mt-10">
          {PLANS.map((plan, i) => (
            <motion.div key={plan.id}
              initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className={`relative rounded-xl border bg-surface shadow-card p-6 flex flex-col ${
                plan.popular ? "border-primary ring-2 ring-primary/20 scale-[1.02]" : "border-border-subtle/60"
              }`}>
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary text-primary-foreground text-xs font-semibold rounded-full">
                  Mais vendido
                </div>
              )}

              <div className="flex items-center gap-2 mb-4">
                <plan.icon className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold text-foreground">{plan.name}</h3>
              </div>

              <div className="mb-6">
                <span className="text-3xl font-bold text-foreground">{plan.price}€</span>
                <span className="text-sm text-text-muted ml-1">/ano</span>
                <p className="text-xs text-text-muted mt-1">Pagamento único · Acesso imediato</p>
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

              <button onClick={() => handleSelectPlan(plan.id)}
                disabled={loadingPlan !== null}
                className={`w-full py-3 rounded-lg text-sm font-semibold transition-opacity disabled:opacity-50 ${
                  plan.popular
                    ? "bg-primary text-primary-foreground hover:opacity-90"
                    : "border border-border-subtle text-foreground hover:bg-surface-hover"
                }`}>
                {loadingPlan === plan.id ? "A processar..." : "Começar a organizar agora"}
              </button>
            </motion.div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-4 py-20">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">Perguntas frequentes</h2>
        </motion.div>
        <div className="space-y-3">
          {FAQS.map((faq, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="bg-surface rounded-xl border border-border-subtle/60 overflow-hidden">
              <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between p-4 text-left">
                <span className="text-sm font-medium text-foreground">{faq.q}</span>
                {openFaq === i ? <ChevronUp className="h-4 w-4 text-text-muted shrink-0" /> : <ChevronDown className="h-4 w-4 text-text-muted shrink-0" />}
              </button>
              {openFaq === i && (
                <div className="px-4 pb-4">
                  <p className="text-sm text-text-muted">{faq.a}</p>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-primary/5 border-t border-primary/10 py-16">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-foreground mb-4">Pronto para controlar o seu dinheiro?</h2>
          <p className="text-text-muted text-lg mb-8">Comece hoje — leva menos de 5 minutos para configurar.</p>
          <button onClick={() => user ? navigate("/app") : navigate("/auth")}
            className="px-8 py-4 rounded-xl bg-primary text-primary-foreground font-semibold text-lg hover:opacity-90 transition-opacity inline-flex items-center gap-2">
            Começar agora <ArrowRight className="h-5 w-5" />
          </button>
          <p className="text-xs text-text-muted mt-4">Garantia de 7 dias · Pagamento único · Sem mensalidades</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border-subtle/60 bg-surface py-8">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p className="text-sm text-text-muted">
            © {new Date().getFullYear()} Saldo+. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Pricing;
