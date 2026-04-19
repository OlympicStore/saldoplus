import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useInView } from "framer-motion";
import { Check, Zap, Home, Crown, TrendingUp, PieChart, Target, Shield, ChevronDown, ChevronUp, ArrowRight, Users, BarChart3, Wallet, ClipboardCheck, Star, Clock, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { fbTrackInitiateCheckout } from "@/lib/fbPixel";
import { fbTrack } from "@/lib/fbPixel";
import AccountDropdown from "@/components/AccountDropdown";
import dashboardPreview from "@/assets/dashboard-preview.png";
import dashboardGoals from "@/assets/dashboard-goals.png";
import dashboardBills from "@/assets/dashboard-bills.png";
import dashboardAnnual from "@/assets/dashboard-annual.png";

// Animated counter hook
const useCounter = (end: number, duration = 2000) => {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref as any, { once: true });

  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const step = end / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [inView, end, duration]);

  return { count, ref };
};

const PLANS = [
  {
    id: "essencial",
    name: "Essencial",
    price: "15,99",
    monthlyEquiv: "1,33",
    tagline: "Ideal para quem está a começar a gerir as suas contas",
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
    price: "28,99",
    monthlyEquiv: "2,42",
    tagline: "Ideal para quem quer um controlo completo",
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
    price: "47,99",
    monthlyEquiv: "4,00",
    tagline: "Para quem quer controlo avançado + automação",
    icon: Crown,
    features: [
      "Tudo do plano Casa",
      "Orçamentos por categoria com alertas",
      "Sugestões IA personalizadas",
      "Multi-conta familiar (até 3 contas)",
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
  { num: "1", title: "Crie a sua conta", desc: "Registe-se em menos de 1 minuto com email ou Google.", icon: Sparkles },
  { num: "2", title: "Insira os seus dados", desc: "Adicione contas, rendimentos e despesas. É simples e guiado.", icon: ClipboardCheck },
  { num: "3", title: "Acompanhe resultados", desc: "Veja gráficos, metas e o seu saldo evoluir semana a semana.", icon: TrendingUp },
];

const TESTIMONIALS = [
  { name: "Ana S.", text: "Finalmente consigo ver para onde vai o meu dinheiro. Em 2 meses já poupei mais do que no ano todo.", avatar: "AS", rating: 5 },
  { name: "Miguel R.", text: "A divisão de despesas da casa ficou muito mais justa. Sem discussões, sem confusões.", avatar: "MR", rating: 5 },
  { name: "Carla F.", text: "Uso 5 minutos por semana e tenho tudo controlado. Simples e eficaz.", avatar: "CF", rating: 5 },
  { name: "João P.", text: "Já testei várias apps de finanças mas esta é a que melhor se adapta à realidade portuguesa.", avatar: "JP", rating: 5 },
  { name: "Sofia L.", text: "As metas financeiras ajudaram-me a poupar para as férias em 4 meses. Recomendo!", avatar: "SL", rating: 5 },
  { name: "Pedro M.", text: "Controlo as contas da casa toda com o plano Casa. Simples, rápido e sem stress.", avatar: "PM", rating: 5 },
];

const FAQS = [
  { q: "Preciso saber de Excel ou contabilidade?", a: "Não! O Saldo+ é desenhado para iniciantes. Basta inserir os valores e nós fazemos os cálculos." },
  { q: "Funciona no telemóvel e computador?", a: "Sim, o Saldo+ é 100% responsivo e funciona perfeitamente no telemóvel, tablet e computador." },
  { q: "É pagamento único?", a: "Sim! Paga uma vez e tem acesso completo durante 1 ano. Sem mensalidades escondidas." },
  { q: "Os meus dados estão seguros?", a: "Absolutamente. Usamos encriptação de ponta e os seus dados são privados — só você tem acesso." },
  { q: "Posso mudar de plano depois?", a: "Sim, pode fazer upgrade a qualquer momento e só paga a diferença." },
  { q: "E se não gostar?", a: "Tem 7 dias de garantia. Se não gostar, devolvemos o dinheiro — sem perguntas." },
];

const FEATURES_GRID = [
  { icon: PieChart, title: "Visão clara dos gastos", desc: "Veja exatamente onde está a perder dinheiro" },
  { icon: TrendingUp, title: "Evolução do saldo", desc: "Acompanhe a evolução mês a mês com gráficos automáticos." },
  { icon: Target, title: "Metas de poupança", desc: "Defina objetivos e veja o progresso em tempo real." },
  { icon: ClipboardCheck, title: "Controlo de contas", desc: "Saiba o estado de cada conta: paga, pendente ou em dívida." },
  { icon: Users, title: "Divisão por pessoa", desc: "Divida contas sem discussões" },
  { icon: Shield, title: "100% seguro", desc: "Dados encriptados e privados. Só você tem acesso." },
];

const formatEuro = (value: number) => `${value.toFixed(2).replace(".", ",")}€`;

const PAYMENT_LINKS: Record<string, string> = {
  essencial: "https://buy.stripe.com/14A8wP6neamK7BFfUgbMQ0j",
  casa: "https://buy.stripe.com/cNiaEXh1S9iGe030ZmbMQ0k",
  pro: "https://buy.stripe.com/fZu28r9zqbqO3lpcI4bMQ0l",
};

const Pricing = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const usersCounter = useCounter(500);
  const savingsCounter = useCounter(150);
  const timeCounter = useCounter(5);

  const handleAddToCart = (planId: string) => {
    const plan = PLANS.find((p) => p.id === planId);
    const value = plan ? parseFloat(plan.price.replace(",", ".")) : 0;
    fbTrack("AddToCart", { content_name: planId, currency: "EUR", value });
  };

  const handleSelectPlan = (planId: string) => {
    const link = PAYMENT_LINKS[planId];
    if (!link) return;

    const plan = PLANS.find((p) => p.id === planId);
    const value = plan ? parseFloat(plan.price.replace(",", ".")) : 0;
    handleAddToCart(planId);
    fbTrackInitiateCheckout(planId, value);

    const separator = link.includes("?") ? "&" : "?";
    const email = user?.email || "";
    const url = email
      ? `${link}${separator}prefilled_email=${encodeURIComponent(email)}`
      : link;
    window.open(url, "_blank");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border-subtle/60 bg-surface/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <button onClick={() => navigate("/")} className="flex items-center gap-0.5">
            <span className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Saldo</span>
            <span className="text-3xl sm:text-4xl font-black text-primary leading-none">+</span>
          </button>
          <div className="flex items-center gap-3">
            <a href="#funcionalidades" className="text-sm text-text-muted hover:text-foreground transition-colors hidden sm:inline">Funcionalidades</a>
            <a href="#precos" className="text-sm text-text-muted hover:text-foreground transition-colors hidden sm:inline">Preços</a>
            <a href="#como-funciona" className="text-sm text-text-muted hover:text-foreground transition-colors hidden sm:inline">Como funciona</a>
            {user ? (
              <>
                <button onClick={() => navigate("/app")}
                  className="text-sm px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity">
                  Ir para o App
                </button>
                <AccountDropdown />
              </>
            ) : (
              <>
                <button onClick={() => navigate("/auth")}
                  className="text-sm px-3 py-2 rounded-lg text-text-muted hover:text-foreground transition-colors hidden sm:inline">
                  Entrar
                </button>
                <button onClick={() => navigate("/auth")}
                  className="text-sm px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity">
                  Começar agora
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* Subtle background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.03] to-transparent pointer-events-none" />

        <div className="max-w-6xl mx-auto px-4 pt-16 sm:pt-24 pb-12 relative">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6 border border-primary/20">
                <Sparkles className="h-3.5 w-3.5" />
                Teste grátis 3 dias — sem compromisso
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-bold text-foreground tracking-tight leading-[1.08] mb-6">
                Deixe de chegar ao fim do mês sem saber para onde foi o dinheiro.
                <span className="text-primary block mt-4">— em 5 minutos por semana</span>
              </h1>

              <p className="text-text-secondary text-lg sm:text-xl max-w-xl mb-8 leading-relaxed">
                Experimente todas as funcionalidades durante 3 dias gratuitamente. Sem cobranças automáticas, sem cartão necessário.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 mb-8">
                <a
                  href={user ? undefined : "/auth"}
                  onClick={user ? () => navigate("/app") : undefined}
                  className="group px-7 py-4 rounded-xl bg-primary text-primary-foreground font-semibold text-base hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20 cursor-pointer"
                >
                  Começar grátis 3 dias
                  <ArrowRight className="h-5 w-5 group-hover:translate-x-0.5 transition-transform" />
                </a>
                <a href="#precos"
                  className="px-7 py-4 rounded-xl border border-border-subtle text-foreground font-medium text-base hover:bg-surface-hover transition-colors text-center">
                  Ver planos e preços
                </a>
              </div>

              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-text-muted">
                <span className="flex items-center gap-1.5"><Sparkles className="h-4 w-4 text-primary" /> 3 dias grátis</span>
                <span className="flex items-center gap-1.5"><Shield className="h-4 w-4 text-primary" /> Dados 100% seguros</span>
                <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-primary" /> Garantia 7 dias</span>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.7, delay: 0.15 }}>
              <div className="rounded-2xl overflow-hidden shadow-2xl border border-border-subtle/60 ring-1 ring-black/5">
                <img src={dashboardPreview} alt="Painel principal do Saldo+ com saldo acumulado, gráfico de evolução mensal, entradas, saídas e balanço do mês" width={1280} height={720} className="w-full h-auto" />
              </div>
              <p className="text-xs text-text-muted mt-3 text-center">
                Dashboard principal — saldo, evolução mensal e balanço num só ecrã
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Trust bar with animated counters */}
      <section className="border-y border-border-subtle/60 bg-surface py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8 text-center">
            <div ref={usersCounter.ref}>
              <p className="text-2xl sm:text-4xl font-bold text-foreground font-mono tabular-nums">+{usersCounter.count}</p>
              <p className="text-xs sm:text-sm text-text-muted mt-1">portugueses já controlam o seu dinheiro</p>
            </div>
            <div ref={savingsCounter.ref}>
              <p className="text-2xl sm:text-4xl font-bold text-primary font-mono tabular-nums">€{savingsCounter.count}/mês</p>
              <p className="text-xs sm:text-sm text-text-muted mt-1">Em média, os utilizadores poupam</p>
            </div>
            <div ref={timeCounter.ref}>
              <p className="text-2xl sm:text-4xl font-bold text-foreground font-mono tabular-nums">{timeCounter.count} min</p>
              <p className="text-xs sm:text-sm text-text-muted mt-1">por semana é suficiente</p>
            </div>
          </div>
        </div>
      </section>

      {/* Problem / Solution */}
      <section className="max-w-6xl mx-auto px-4 py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
            className="bg-surface rounded-2xl border border-border-subtle/60 p-8">
            <h2 className="text-2xl font-bold text-foreground mb-6">Se isto acontece contigo...</h2>
            <div className="space-y-3">
              {PROBLEMS.map((p, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -10 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-start gap-3 p-3 rounded-lg bg-destructive/5 border border-destructive/10">
                  <span className="text-xl">{p.emoji}</span>
                  <p className="text-foreground">{p.text}</p>
                </motion.div>
              ))}
            </div>
            <p className="text-sm text-text-muted mt-5 italic leading-relaxed">
              A maioria das pessoas não tem um sistema — apenas tentam "controlar melhor."
              <br />E isso nunca funciona.
            </p>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
            className="bg-surface rounded-2xl border border-primary/20 p-8">
            <h2 className="text-2xl font-bold text-foreground mb-6">
              Com o Saldo<span className="text-primary font-black">+</span>, tudo muda.
            </h2>
            <div className="space-y-3">
              {SOLUTIONS.map((s, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: 10 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-start gap-3 p-3 rounded-lg bg-primary/5 border border-primary/10">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <s.icon className="h-4 w-4 text-primary" />
                  </div>
                  <p className="text-foreground pt-1">{s.text}</p>
                </motion.div>
              ))}
            </div>
            <p className="text-sm text-primary/80 mt-5 font-semibold leading-relaxed">
              Sem Excel. Sem complicações. Sem stress. Mais dinheiro.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Features grid */}
      <section id="funcionalidades" className="bg-surface border-y border-border-subtle/60 py-20">
        <div className="max-w-6xl mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Tudo o que precisa, num só lugar
            </h2>
            <p className="text-text-muted text-lg max-w-2xl mx-auto">
              Dashboard intuitivo, gráficos automáticos e controlo total — sem complicações.
            </p>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES_GRID.map((f, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="bg-background rounded-xl border border-border-subtle/60 p-6 hover:border-primary/30 hover:shadow-md transition-all group">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/15 transition-colors">
                  <f.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{f.title}</h3>
                <p className="text-sm text-text-muted leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Screenshots showcase */}
      <section className="max-w-6xl mx-auto px-4 py-20">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">Veja o Saldo+ em ação</h2>
          <p className="text-text-muted text-lg">Ecrãs reais da aplicação — sem truques</p>
        </motion.div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>
            <div className="rounded-2xl overflow-hidden shadow-xl border border-border-subtle/60">
              <img src={dashboardGoals} alt="Metas financeiras do Saldo+ com progresso por objetivo" loading="lazy" width={1280} height={720} className="w-full h-auto" />
            </div>
            <p className="text-sm text-text-muted mt-3 text-center">
              Metas financeiras — acompanhe o progresso de cada objetivo
            </p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.15 }}>
            <div className="rounded-2xl overflow-hidden shadow-xl border border-border-subtle/60">
              <img src={dashboardAnnual} alt="Dashboard anual do Saldo+ com totais, gráfico de gastos mensais, categorias e resumo de metas" loading="lazy" width={1280} height={720} className="w-full h-auto" />
            </div>
            <p className="text-sm text-text-muted mt-3 text-center">
              Dashboard anual — totais, gastos por mês, categorias e metas
            </p>
          </motion.div>
        </div>
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.3 }}
          className="max-w-4xl mx-auto">
          <div className="rounded-2xl overflow-hidden shadow-xl border border-border-subtle/60">
            <img src={dashboardBills} alt="Controlo de contas do Saldo+ com estado de pagamento mensal" loading="lazy" width={1280} height={720} className="w-full h-auto" />
          </div>
          <p className="text-sm text-text-muted mt-3 text-center">
            Controlo de contas — estado de pagamento mês a mês
          </p>
        </motion.div>
      </section>

      {/* How it works */}
      <section id="como-funciona" className="bg-surface border-y border-border-subtle/60 py-20">
        <div className="max-w-6xl mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">Como funciona</h2>
            <p className="text-text-muted text-lg">3 passos simples para controlar as suas finanças</p>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {STEPS.map((step, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                transition={{ delay: i * 0.15 }} className="text-center relative">
                {i < STEPS.length - 1 && (
                  <div className="hidden sm:block absolute top-7 left-[60%] w-[80%] border-t-2 border-dashed border-border-subtle" />
                )}
                <div className="h-14 w-14 rounded-2xl bg-primary text-primary-foreground text-xl font-bold flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/20 relative z-10">
                  {step.num}
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{step.title}</h3>
                <p className="text-sm text-text-muted leading-relaxed">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof / Testimonials */}
      <section className="max-w-6xl mx-auto px-4 py-20">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">O que dizem os nossos utilizadores</h2>
          <div className="flex items-center justify-center gap-1 mb-2">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="h-5 w-5 fill-amber-400 text-amber-400" />
            ))}
          </div>
          <p className="text-text-muted text-lg">+500 pessoas já controlam as finanças com o Saldo+</p>
        </motion.div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="bg-surface rounded-xl border border-border-subtle/60 p-6 hover:shadow-md transition-shadow">
              <div className="flex gap-0.5 mb-3">
                {[...Array(t.rating)].map((_, j) => (
                  <Star key={j} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                ))}
              </div>
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
      </section>

      {/* CTA after testimonials */}
      <section className="bg-surface border-y border-border-subtle/60 py-12">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <p className="text-text-muted text-lg mb-6">Junte-se a quem já controla as suas finanças</p>
            <a href="#precos"
              className="group inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-primary text-primary-foreground font-semibold text-base hover:opacity-90 transition-all shadow-lg shadow-primary/20">
              Criar conta em 1 minuto
              <ArrowRight className="h-5 w-5 group-hover:translate-x-0.5 transition-transform" />
            </a>
          </motion.div>
        </div>
      </section>

      {/* Why Saldo+ is different */}
      <section className="max-w-6xl mx-auto px-4 py-20">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Porque o Saldo<span className="text-primary font-black">+</span> é diferente
          </h2>
          <p className="text-text-muted text-lg">Sem complicações. Sem curva de aprendizagem.</p>
        </motion.div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <div className="space-y-3">
            {[
              "Não precisa de Excel nem folhas de cálculo",
              "Não é complicado como apps bancárias",
              "Sem jargão financeiro confuso",
              "Sem anúncios nem venda dos seus dados",
            ].map((item, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -10 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="flex items-center gap-3 p-3 rounded-lg bg-destructive/5 border border-destructive/10">
                <span className="text-destructive font-bold text-lg">✕</span>
                <p className="text-foreground text-sm">{item}</p>
              </motion.div>
            ))}
          </div>
          <div className="space-y-3">
            {[
              "Feito para portugueses, em português",
              "5 minutos por semana é suficiente",
              "Interface simples e intuitiva",
              "Os seus dados são 100% privados",
            ].map((item, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: 10 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/10">
                <Check className="h-5 w-5 text-primary shrink-0" />
                <p className="text-foreground text-sm">{item}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Before vs After */}
      <section className="bg-surface border-y border-border-subtle/60 py-20">
        <div className="max-w-6xl mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">Antes vs Depois</h2>
            <p className="text-text-muted text-lg">Como muda a vida de quem usa o Saldo+</p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
              className="rounded-2xl border border-destructive/20 bg-destructive/5 p-8">
              <h3 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
                <span className="text-2xl">😰</span> Antes do Saldo+
              </h3>
              <ul className="space-y-4">
                {[
                  { emoji: "💸", text: "Dinheiro desaparece sem explicação" },
                  { emoji: "📊", text: "Zero visibilidade sobre os gastos" },
                  { emoji: "😤", text: "Discussões sobre quem paga o quê" },
                  { emoji: "🎯", text: "Metas? Que metas?" },
                  { emoji: "📝", text: "Contas espalhadas entre apps e papéis" },
                ].map((item, i) => (
                  <motion.li key={i} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-center gap-3 text-foreground">
                    <span className="text-lg">{item.emoji}</span>
                    <span className="text-sm">{item.text}</span>
                  </motion.li>
                ))}
              </ul>
            </motion.div>
            <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
              className="rounded-2xl border border-primary/20 bg-primary/5 p-8">
              <h3 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
                <span className="text-2xl">🎉</span> Depois do Saldo+
              </h3>
              <ul className="space-y-4">
                {[
                  { emoji: "✅", text: "Sabe exatamente onde vai cada euro" },
                  { emoji: "📈", text: "Gráficos claros de evolução mensal" },
                  { emoji: "🤝", text: "Divisão justa e automática de despesas" },
                  { emoji: "🎯", text: "Metas definidas com progresso real" },
                  { emoji: "🧘", text: "Paz de espírito e controlo total" },
                ].map((item, i) => (
                  <motion.li key={i} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-center gap-3 text-foreground">
                    <span className="text-lg">{item.emoji}</span>
                    <span className="text-sm">{item.text}</span>
                  </motion.li>
                ))}
              </ul>
            </motion.div>
          </div>
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="text-center mt-10">
            <a href="#precos"
              className="group inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-primary text-primary-foreground font-semibold text-base hover:opacity-90 transition-all shadow-lg shadow-primary/20">
              Quero ter controlo — Criar conta
              <ArrowRight className="h-5 w-5 group-hover:translate-x-0.5 transition-transform" />
            </a>
          </motion.div>
        </div>
      </section>

      {/* Pricing */}
      <section id="precos" className="bg-surface border-y border-border-subtle/60 py-20">
        <div className="max-w-6xl mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-4">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Um pequeno investimento para mudar as suas finanças 💰
            </h2>
            <p className="text-text-muted text-lg max-w-2xl mx-auto mb-2">
              Pagamento único · Acesso por 1 ano · Sem mensalidades
            </p>
            <p className="text-sm text-primary font-medium">🛡️ Garantia de 7 dias — se não gostar, devolvemos o dinheiro</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto mt-10">
            {PLANS.map((plan, i) => (
              <motion.div key={plan.id}
                initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className={`relative rounded-2xl border bg-background shadow-card p-6 flex flex-col transition-all hover:shadow-lg ${
                  plan.popular ? "border-primary ring-2 ring-primary/20 scale-[1.02]" : "border-border-subtle/60"
                }`}>
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-primary text-primary-foreground text-xs font-bold rounded-full shadow-lg shadow-primary/30">
                    ⭐ Mais vendido
                  </div>
                )}

                <div className="flex items-center gap-2 mb-2">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <plan.icon className="h-4 w-4 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">{plan.name}</h3>
                </div>

                {plan.tagline && (
                  <p className="text-xs text-text-muted mb-4">{plan.tagline}</p>
                )}

                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-foreground">{plan.price}€</span>
                    <span className="text-sm text-text-muted">/ano</span>
                  </div>
                  <p className="text-xs text-primary font-medium mt-1">
                    Apenas {plan.monthlyEquiv}€/mês
                  </p>
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

                <p className="text-xs text-amber-600 font-medium mb-3 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Últimos {plan.id === "essencial" ? "12" : plan.id === "casa" ? "8" : "5"} acessos com este preço
                </p>

                <button onClick={() => handleSelectPlan(plan.id)}
                  className={`w-full py-3.5 rounded-xl text-sm font-semibold transition-all ${
                    plan.popular
                      ? "bg-primary text-primary-foreground hover:opacity-90 shadow-lg shadow-primary/20"
                      : "border border-border-subtle text-foreground hover:bg-surface-hover hover:border-primary/30"
                  }`}>
                  Começar agora
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-4 py-20">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">Perguntas frequentes</h2>
          <p className="text-text-muted">Tudo o que precisa de saber antes de começar</p>
        </motion.div>
        <div className="space-y-3">
          {FAQS.map((faq, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="bg-surface rounded-xl border border-border-subtle/60 overflow-hidden hover:border-primary/20 transition-colors">
              <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between p-4 text-left">
                <span className="text-sm font-medium text-foreground pr-4">{faq.q}</span>
                {openFaq === i ? <ChevronUp className="h-4 w-4 text-primary shrink-0" /> : <ChevronDown className="h-4 w-4 text-text-muted shrink-0" />}
              </button>
              {openFaq === i && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="px-4 pb-4">
                  <p className="text-sm text-text-muted leading-relaxed">{faq.a}</p>
                </motion.div>
              )}
            </motion.div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 pointer-events-none" />
        <div className="relative max-w-3xl mx-auto px-4 py-20 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Pronto para finalmente controlar o seu dinheiro?
            </h2>
            <p className="text-text-muted text-lg mb-8 max-w-lg mx-auto">
              Junte-se a +500 portugueses que já sabem para onde vai cada euro.
            </p>
            <button onClick={() => user ? navigate("/app") : navigate("/auth")}
              className="group px-8 py-4 rounded-xl bg-primary text-primary-foreground font-semibold text-lg hover:opacity-90 transition-all inline-flex items-center gap-2 shadow-xl shadow-primary/25">
              Começar agora — é rápido
              <ArrowRight className="h-5 w-5 group-hover:translate-x-0.5 transition-transform" />
            </button>
            <p className="text-xs text-text-muted mt-4 flex items-center justify-center gap-4">
              <span>🛡️ Garantia 7 dias</span>
              <span>💳 Pagamento único</span>
              <span>⚡ Acesso imediato</span>
            </p>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border-subtle/60 bg-surface py-10">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold tracking-tight text-foreground">Saldo</span>
              <span className="text-lg font-black text-primary">+</span>
              <span className="text-xs text-text-muted ml-2">© {new Date().getFullYear()}</span>
            </div>
            <div className="flex items-center gap-6">
              <a href="/termos" className="text-sm text-text-muted hover:text-foreground transition-colors">Termos</a>
              <a href="/privacidade" className="text-sm text-text-muted hover:text-foreground transition-colors">Privacidade</a>
              <a href="mailto:suporte@saldoplus.pt" className="text-sm text-text-muted hover:text-foreground transition-colors">Contacto</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Pricing;
