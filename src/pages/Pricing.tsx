import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion, useInView } from "framer-motion";
import { Check, X as XIcon, TrendingUp, PieChart, Target, Shield, ChevronDown, ChevronUp, ArrowRight, Users, BarChart3, Wallet, ClipboardCheck, Star, Clock, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { fbTrackInitiateCheckout } from "@/lib/fbPixel";
import { fbTrack } from "@/lib/fbPixel";
import AccountDropdown from "@/components/AccountDropdown";
import { PLANS as PLAN_MAP, PLAN_ORDER, formatEuro } from "@/lib/plans";
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

// Plan data comes from the canonical source in @/lib/plans.
const PLANS = PLAN_ORDER.map((id) => PLAN_MAP[id]);

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
  { name: "Pedro M.", text: "Controlo as contas da casa toda com o plano Casa+. Simples, rápido e sem stress.", avatar: "PM", rating: 5 },
];

const FAQS = [
  { q: "Preciso saber de Excel ou contabilidade?", a: "Não! O Saldo+ é desenhado para iniciantes. Basta inserir os valores e nós fazemos os cálculos." },
  { q: "Funciona no telemóvel e computador?", a: "Sim, o Saldo+ é 100% responsivo e funciona perfeitamente no telemóvel, tablet e computador." },
  { q: "Como funcionam os 3 dias grátis?", a: "Introduz os dados do cartão, mas só é cobrado ao 4.º dia. Se cancelar dentro de 3 dias, não paga nada." },
  { q: "Posso cancelar quando quiser?", a: "Sim. Os planos mensais podem ser cancelados a qualquer momento. O Elite é anual e não renova automaticamente." },
  { q: "Os meus dados estão seguros?", a: "Absolutamente. Usamos encriptação de ponta e os seus dados são privados — só você tem acesso." },
  { q: "Posso mudar de plano depois?", a: "Sim, pode fazer upgrade a qualquer momento a partir da sua conta." },
];

const FEATURES_GRID = [
  { icon: PieChart, title: "Visão clara dos gastos", desc: "Veja exatamente onde está a perder dinheiro" },
  { icon: TrendingUp, title: "Evolução do saldo", desc: "Acompanhe a evolução mês a mês com gráficos automáticos." },
  { icon: Target, title: "Metas de poupança", desc: "Defina objetivos e veja o progresso em tempo real." },
  { icon: ClipboardCheck, title: "Controlo de contas", desc: "Saiba o estado de cada conta: paga, pendente ou em dívida." },
  { icon: Users, title: "Divisão por pessoa", desc: "Divida contas sem discussões" },
  { icon: Shield, title: "100% seguro", desc: "Dados encriptados e privados. Só você tem acesso." },
];

// Comparison table rows: [label, essencial, casa, pro]
const COMPARISON_ROWS: Array<[string, boolean, boolean, boolean]> = [
  ["Receitas ilimitadas", true, true, true],
  ["Despesas ilimitadas", true, true, true],
  ["Dashboard financeiro", true, true, true],
  ["Score Financeiro", true, true, true],
  ["Calendário anual", true, true, true],
  ["Exportação PDF", true, true, true],
  ["Objetivos financeiros", false, true, true],
  ["Investimentos", false, true, true],
  ["Orçamentos por categoria", false, true, true],
  ["Modo Casal", false, true, true],
  ["Divisão inteligente de despesas", false, true, true],
  ["IA ilimitada", false, true, true],
  ["OCR de faturas", false, false, true],
  ["Leitura de PDFs", false, false, true],
  ["Leitura de fotografias", false, false, true],
  ["IA cria despesas automaticamente", false, false, true],
  ["IA cria recorrências", false, false, true],
  ["Multi Workspace (até 5 utilizadores)", false, false, true],
  ["Gestão empresarial", false, false, true],
  ["Acesso à API (futura)", false, false, true],
];


const Pricing = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const usersCounter = useCounter(500);
  const savingsCounter = useCounter(150);
  const timeCounter = useCounter(5);

  const handleAddToCart = (planId: string) => {
    const plan = PLAN_MAP[planId as keyof typeof PLAN_MAP];
    fbTrack("AddToCart", { content_name: planId, currency: "EUR", value: plan?.price ?? 0 });
  };

  const handleSelectPlan = async (planId: string) => {
    const plan = PLAN_MAP[planId as keyof typeof PLAN_MAP];
    handleAddToCart(planId);
    fbTrackInitiateCheckout(planId, plan?.price ?? 0);

    if (!user) {
      navigate(`/auth?mode=signup&plan=${planId}`);
      return;
    }

    setLoadingPlan(planId);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { plan: planId },
      });
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank", "noopener,noreferrer");
      } else {
        throw new Error("Não foi possível criar a sessão de pagamento.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Erro ao iniciar checkout.");
    } finally {
      setLoadingPlan(null);
    }
  };


  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Saldo+ — Controle as Finanças da Sua Casa</title>
        <meta name="description" content="Pare de perder dinheiro sem perceber. O Saldo+ organiza as finanças da sua casa em 5 minutos por semana. Pagamento único, acesso por 1 ano." />
        <link rel="canonical" href="https://saldoplus.lovable.app/" />
        <meta property="og:title" content="Saldo+ — Controle as Finanças da Sua Casa" />
        <meta property="og:description" content="Organize as finanças da sua casa em 5 minutos por semana." />
        <meta property="og:url" content="https://saldoplus.lovable.app/" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: FAQS.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        })}</script>
      </Helmet>
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
                <button onClick={() => navigate("/auth?mode=signup")}
                  className="text-sm px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity">
                  Começar agora
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <main>
      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* Subtle background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.03] to-transparent pointer-events-none" />

        <div className="max-w-6xl mx-auto px-4 pt-16 sm:pt-24 pb-12 relative">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6 border border-primary/20">
                <Sparkles className="h-3.5 w-3.5" />
                3 dias grátis — cancele quando quiser
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-bold text-foreground tracking-tight leading-[1.08] mb-6">
                Deixe de chegar ao fim do mês sem saber para onde foi o dinheiro.
                <span className="text-primary block mt-4">— em 5 minutos por semana</span>
              </h1>

              <p className="text-text-secondary text-lg sm:text-xl max-w-xl mb-8 leading-relaxed">
                Experimente todas as funcionalidades durante 3 dias. Só é cobrado ao 4.º dia se não cancelar. O cartão é pedido no início para garantir o acesso sem interrupções.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 mb-8">
                <a
                  href={user ? undefined : "/auth?mode=signup"}
                  onClick={user ? () => navigate("/app") : undefined}
                  className="group px-7 py-4 rounded-xl bg-primary text-primary-foreground font-semibold text-base hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20 cursor-pointer"
                >
                  Começar 3 dias grátis
                  <ArrowRight className="h-5 w-5 group-hover:translate-x-0.5 transition-transform" />
                </a>
                <a href="#precos"
                  className="px-7 py-4 rounded-xl border border-border-subtle text-foreground font-medium text-base hover:bg-surface-hover transition-colors text-center">
                  Ver planos e preços
                </a>
              </div>

              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-text-muted">
                <span className="flex items-center gap-1.5"><Sparkles className="h-4 w-4 text-primary" /> 3 dias grátis</span>
                <span className="flex items-center gap-1.5"><Shield className="h-4 w-4 text-primary" /> Cancele a qualquer momento</span>
                <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-primary" /> Dados 100% seguros</span>
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
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-8">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4 border border-primary/20">
              <Sparkles className="h-3.5 w-3.5" /> 3 dias grátis · Cancele quando quiser
            </div>
            <h2 className="text-3xl sm:text-5xl font-bold text-foreground mb-4 tracking-tight">
              Escolha o plano certo para si
            </h2>
            <p className="text-text-secondary text-lg max-w-2xl mx-auto">
              80% dos utilizadores escolhem <span className="text-foreground font-semibold">Casa+</span>. Faça upgrade a qualquer momento.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-5 max-w-6xl mx-auto mt-14 items-stretch">
            {PLANS.map((plan, i) => {
              const Icon = plan.icon;
              const isFeatured = plan.featured;
              const isExclusive = plan.exclusive;
              const isLoading = loadingPlan === plan.id;
              return (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  className={`relative rounded-3xl p-7 sm:p-8 flex flex-col transition-all ${
                    isFeatured
                      ? "border-2 border-primary bg-background shadow-2xl shadow-primary/20 lg:-my-4 lg:scale-[1.04] z-10"
                      : isExclusive
                        ? "border border-amber-200 bg-gradient-to-br from-amber-50/60 via-background to-background shadow-xl"
                        : "border border-border-subtle/60 bg-background shadow-card hover:shadow-lg"
                  }`}
                >
                  {plan.badge && (
                    <div className={`absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1.5 text-xs font-bold rounded-full shadow-lg whitespace-nowrap ${
                      isFeatured
                        ? "bg-primary text-primary-foreground shadow-primary/40"
                        : "bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-amber-500/40"
                    }`}>
                      {plan.badge}
                    </div>
                  )}

                  <div className="flex items-center gap-2.5 mb-3">
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${
                      isExclusive ? "bg-amber-100 text-amber-700" : "bg-primary/10 text-primary"
                    }`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground">{plan.name}</h3>
                  </div>

                  <p className="text-sm text-text-muted mb-6 min-h-[2.5rem]">{plan.tagline}</p>

                  <div className="mb-6">
                    {plan.oldPrice && (
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-base text-text-muted line-through">{formatEuro(plan.oldPrice)}</span>
                        {plan.savingsBadge && (
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                            {plan.savingsBadge}
                          </span>
                        )}
                      </div>
                    )}
                    <div className="flex items-baseline gap-1.5">
                      <span className={`text-5xl font-bold tracking-tight ${isExclusive ? "text-amber-700" : "text-foreground"}`}>
                        {formatEuro(plan.price, plan.price % 1 === 0 ? 0 : 2)}
                      </span>
                      <span className="text-sm text-text-muted">/{plan.interval}</span>
                    </div>
                    {plan.savingsAmount && (
                      <p className="text-xs text-amber-700 font-semibold mt-1.5">
                        Poupa {plan.savingsAmount}€ face ao mensal
                      </p>
                    )}
                    <p className="text-xs text-text-muted mt-1.5">{plan.subtitle}</p>
                  </div>

                  <ul className="space-y-2.5 mb-8 flex-1">
                    {plan.features.slice(0, 10).map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-sm text-foreground">
                        <Check className={`h-4 w-4 mt-0.5 shrink-0 ${isExclusive ? "text-amber-600" : "text-primary"}`} />
                        <span>{feature}</span>
                      </li>
                    ))}
                    {plan.features.length > 10 && (
                      <li className="text-xs text-text-muted italic pl-6">
                        + {plan.features.length - 10} funcionalidades
                      </li>
                    )}
                  </ul>

                  <button
                    onClick={() => handleSelectPlan(plan.id)}
                    disabled={isLoading}
                    className={`w-full py-3.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-60 ${
                      isFeatured
                        ? "bg-primary text-primary-foreground hover:opacity-90 shadow-lg shadow-primary/25"
                        : isExclusive
                          ? "bg-gradient-to-r from-amber-500 to-amber-600 text-white hover:opacity-95 shadow-lg shadow-amber-500/25"
                          : "border-2 border-border-subtle text-foreground hover:bg-surface-hover hover:border-primary/30"
                    }`}
                  >
                    {isLoading ? "A abrir…" : plan.cta}
                  </button>

                  {isFeatured && (
                    <p className="text-[11px] text-center text-text-muted mt-3">
                      💎 Melhor relação qualidade / preço
                    </p>
                  )}
                  {isExclusive && (
                    <p className="text-[11px] text-center text-amber-700 font-semibold mt-3">
                      🔥 Poupe 240€ pagando anualmente
                    </p>
                  )}
                </motion.div>
              );
            })}
          </div>

          {/* Comparison table */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-20 max-w-5xl mx-auto"
          >
            <div className="text-center mb-8">
              <h3 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Compare todos os planos</h3>
              <p className="text-text-muted text-sm">Veja exatamente o que está incluído</p>
            </div>
            <div className="overflow-x-auto rounded-2xl border border-border-subtle/60 bg-background">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-subtle/60 bg-surface">
                    <th className="text-left px-5 py-4 font-semibold text-text-muted text-xs uppercase tracking-wider">Funcionalidade</th>
                    {PLANS.map((p) => (
                      <th key={p.id} className={`text-center px-4 py-4 font-bold ${p.featured ? "text-primary" : p.exclusive ? "text-amber-700" : "text-foreground"}`}>
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="text-sm">{p.name}</span>
                          <span className="text-[11px] text-text-muted font-normal">
                            {formatEuro(p.price, p.price % 1 === 0 ? 0 : 2)}/{p.interval}
                          </span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON_ROWS.map(([label, e, c, p], i) => (
                    <tr key={label} className={i % 2 === 0 ? "bg-background" : "bg-surface/50"}>
                      <td className="px-5 py-3 text-foreground text-sm">{label}</td>
                      {[e, c, p].map((v, j) => (
                        <td key={j} className="text-center px-4 py-3">
                          {v ? (
                            <Check className={`h-4 w-4 inline-block ${j === 1 ? "text-primary" : j === 2 ? "text-amber-600" : "text-primary"}`} />
                          ) : (
                            <XIcon className="h-4 w-4 inline-block text-text-muted/40" />
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 text-center text-xs text-text-muted">
              <div className="flex items-center justify-center gap-2"><Shield className="h-4 w-4 text-primary" /> Pagamento Seguro</div>
              <div className="flex items-center justify-center gap-2"><Clock className="h-4 w-4 text-primary" /> 3 dias grátis</div>
              <div className="flex items-center justify-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> Cancele quando quiser</div>
            </div>
          </motion.div>
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
            <button onClick={() => user ? navigate("/app") : navigate("/auth?mode=signup")}
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
      </main>

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
