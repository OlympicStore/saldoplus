import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  ShieldCheck,
  Lock,
  Zap,
  Check,
  X,
  ArrowRight,
  MessageCircle,
  ChevronDown,
  Star,
  Home,
  Gem,
  CreditCard,
  Smartphone,
  MapPin,
  Crown,
  TrendingUp,
} from "lucide-react";

const SIGNUP_URL = "/auth?mode=signup";
const CTA_LABEL = "Começar 3 dias grátis";

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
};

const CTAButton = ({
  children = CTA_LABEL,
  size = "lg",
  variant = "primary",
  reassure = false,
  align = "center",
}: {
  children?: React.ReactNode;
  size?: "md" | "lg" | "xl";
  variant?: "primary" | "white";
  reassure?: boolean;
  align?: "center" | "start";
}) => {
  const sizeCls =
    size === "xl" ? "px-9 py-5 text-lg" : size === "md" ? "px-5 py-3 text-sm" : "px-7 py-4 text-base";
  const variantCls =
    variant === "white"
      ? "bg-white text-primary shadow-2xl hover:scale-[1.03]"
      : "bg-primary text-primary-foreground shadow-[0_10px_40px_-10px_hsl(160_84%_39%/0.7)] hover:shadow-[0_16px_50px_-10px_hsl(160_84%_39%/0.9)] hover:scale-[1.02]";
  const reassureColor = variant === "white" ? "text-primary-foreground/90" : "text-text-secondary";
  const alignCls = align === "start" ? "items-start" : "items-center";
  return (
    <div className={`flex flex-col gap-3 ${alignCls}`}>
      <Link
        to={SIGNUP_URL}
        className={`inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-full font-semibold transition-all ${variantCls} ${sizeCls}`}
      >
        {children}
        <ArrowRight className="h-4 w-4" />
      </Link>
      {reassure && (
        <ul className={`flex flex-wrap gap-x-4 gap-y-1 text-xs sm:text-sm ${reassureColor} ${align === "center" ? "justify-center" : ""}`}>
          <li className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5" /> Cancela quando quiseres</li>
          <li className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5" /> Ativação em menos de 2 minutos</li>
          <li className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5" /> Acesso imediato após o registo</li>
        </ul>
      )}
    </div>
  );
};

const ChatBubble = ({ from, text, delay = 0 }: { from: "user" | "ai"; text: string; delay?: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.5, delay }}
    className={`flex ${from === "user" ? "justify-end" : "justify-start"}`}
  >
    <div
      className={`max-w-[85%] px-4 py-2.5 text-sm rounded-2xl ${
        from === "user"
          ? "bg-primary text-primary-foreground rounded-br-sm"
          : "bg-secondary text-foreground rounded-bl-sm border border-border-subtle"
      }`}
    >
      {text}
    </div>
  </motion.div>
);

const faqs = [
  {
    q: "Como funciona o teste gratuito?",
    a: "Tens 3 dias para experimentar tudo. Só és cobrado ao 4.º dia se não cancelares antes.",
  },
  { q: "Posso cancelar quando quiser?", a: "Sim. Cancelas com um clique no teu painel, sem perguntas nem burocracia." },
  { q: "Os meus dados estão seguros?", a: "Toda a informação é encriptada em trânsito e em repouso. Pagamentos seguros via Stripe. Nunca partilhamos os teus dados." },
  { q: "Preciso de cartão para começar?", a: "Sim, é necessário para começar o teste. Não há qualquer cobrança nos primeiros 3 dias." },
  { q: "Funciona no telemóvel?", a: "Funciona em qualquer dispositivo. Instala como app no iPhone ou Android em segundos." },
];

// Plans (visual only; keeps brand pricing)
const plans = [
  {
    id: "essencial",
    name: "Starter",
    icon: Zap,
    price: "15,99€",
    interval: "/mês",
    tagline: "Ideal para quem quer começar a organizar as finanças.",
    highlights: ["Dashboard financeiro", "Despesas e receitas ilimitadas", "Objetivos básicos", "Assistente IA (50 msg/mês)"],
    cta: CTA_LABEL,
    featured: false,
  },
  {
    id: "casa",
    name: "Casa+",
    icon: Home,
    price: "28,99€",
    interval: "/mês",
    tagline: "A melhor escolha para gerir todas as finanças com ajuda da IA.",
    highlights: ["Tudo do Starter", "Modo Casal (4 modos de divisão)", "Orçamentos por categoria", "IA ilimitada", "Relatórios avançados"],
    cta: CTA_LABEL,
    featured: true,
    badge: "⭐ MAIS POPULAR",
  },
  {
    id: "pro",
    name: "Elite",
    icon: Gem,
    price: "159,99€",
    interval: "/ano",
    perMonth: "≈ 13,33€/mês",
    tagline: "A experiência completa, com todas as funcionalidades e o melhor preço anual.",
    highlights: [
      "👑 Todas as funcionalidades desbloqueadas",
      "Tudo do Casa+",
      "OCR inteligente de faturas",
      "IA lê PDFs e fotografias",
      "Multi Workspace",
      "Suporte prioritário",
    ],
    cta: CTA_LABEL,
    featured: false,
    savings: "Poupa 60%",
  },
];

// Comparison rows: 0 = none, 1 = check
const featureMatrix: { name: string; s: boolean; c: boolean; e: boolean }[] = [
  { name: "Dashboard", s: true, c: true, e: true },
  { name: "Gestão de despesas", s: true, c: true, e: true },
  { name: "Objetivos", s: true, c: true, e: true },
  { name: "Modo Casal", s: false, c: true, e: true },
  { name: "Modo Empresa", s: false, c: true, e: true },
  { name: "Planeamento com IA", s: false, c: true, e: true },
  { name: "Assistente IA", s: true, c: true, e: true },
  { name: "OCR de faturas", s: false, c: false, e: true },
  { name: "Importação bancária (em breve)", s: false, c: false, e: true },
  { name: "Prioridade no suporte", s: false, c: true, e: true },
  { name: "Relatórios avançados", s: false, c: true, e: true },
];

// Auto-playing AI demo — shows how a message becomes a categorised expense + insight
const demoScript: Array<
  | { kind: "user"; text: string }
  | { kind: "ai"; text: string }
  | { kind: "card"; category: string; amount: string; icon: string }
  | { kind: "insight"; label: string; value: string }
> = [
  { kind: "user", text: "Supermercado 15€" },
  { kind: "ai", text: "✓ Despesa registada com sucesso." },
  { kind: "card", category: "Alimentação", amount: "−15,00€", icon: "🍔" },
  { kind: "ai", text: "Este mês já gastaste 214€ em alimentação." },
  { kind: "insight", label: "Alimentação • Novembro", value: "214€ / 250€" },
  { kind: "ai", text: "Queres definir um limite de 250€?" },
];

const AIDemoSection = () => {
  const [visible, setVisible] = useState(1);
  useEffect(() => {
    if (visible >= demoScript.length) {
      const reset = setTimeout(() => setVisible(1), 4500);
      return () => clearTimeout(reset);
    }
    const t = setTimeout(() => setVisible((v) => v + 1), 1100);
    return () => clearTimeout(t);
  }, [visible]);

  return (
    <section className="py-24 sm:py-28 px-6 bg-background">
      <div className="max-w-3xl mx-auto text-center mb-12">
        <motion.h2 {...fadeUp} className="font-display text-4xl sm:text-5xl font-bold tracking-tight">
          Escreve. A IA trata do resto.
        </motion.h2>
        <motion.p {...fadeUp} transition={{ duration: 0.6, delay: 0.1 }} className="mt-4 text-lg text-text-secondary">
          Uma mensagem simples torna-se numa despesa categorizada e num insight — em segundos.
        </motion.p>
      </div>

      <motion.div
        {...fadeUp}
        className="relative max-w-2xl mx-auto rounded-[2rem] bg-surface border border-border-subtle shadow-2xl p-6 sm:p-8"
      >
        <div className="absolute -inset-6 -z-10 bg-gradient-to-br from-primary/15 to-accent/5 rounded-[3rem] blur-2xl" />

        <div className="flex items-center gap-2 mb-6">
          <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div>
            <div className="text-sm font-semibold">Assistente Saldo+</div>
            <div className="text-[10px] text-text-muted flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              A escrever…
            </div>
          </div>
        </div>

        <div className="space-y-3 min-h-[360px]">
          <AnimatePresence initial={false}>
            {demoScript.slice(0, visible).map((step, i) => {
              if (step.kind === "user" || step.kind === "ai") {
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className={`flex ${step.kind === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] px-4 py-2.5 text-sm rounded-2xl ${
                        step.kind === "user"
                          ? "bg-primary text-primary-foreground rounded-br-sm"
                          : "bg-secondary text-foreground rounded-bl-sm border border-border-subtle"
                      }`}
                    >
                      {step.text}
                    </div>
                  </motion.div>
                );
              }
              if (step.kind === "card") {
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0.95, y: 8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ duration: 0.45 }}
                    className="ml-2 max-w-[85%] rounded-2xl border border-primary/20 bg-primary/5 p-4 flex items-center gap-3"
                  >
                    <div className="h-10 w-10 rounded-xl bg-surface border border-border-subtle flex items-center justify-center text-lg">
                      {step.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] uppercase tracking-widest font-bold text-text-muted">Categoria</div>
                      <div className="text-sm font-semibold">{step.category}</div>
                    </div>
                    <div className="text-sm font-bold tabular-nums text-foreground">{step.amount}</div>
                  </motion.div>
                );
              }
              // insight bar
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45 }}
                  className="ml-2 max-w-[85%] rounded-2xl border border-border-subtle bg-surface p-4"
                >
                  <div className="flex items-center justify-between text-xs text-text-secondary mb-2">
                    <span className="inline-flex items-center gap-1.5 font-medium">
                      <TrendingUp className="h-3.5 w-3.5 text-primary" />
                      {step.label}
                    </span>
                    <span className="font-bold text-foreground tabular-nums">{step.value}</span>
                  </div>
                  <div className="h-2 rounded-full bg-secondary overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: "85%" }}
                      transition={{ duration: 0.9, ease: "easeOut" }}
                      className="h-full bg-primary rounded-full"
                    />
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        <div className="mt-6 rounded-xl bg-secondary/60 border border-border-subtle px-4 py-3 flex items-center gap-2 text-sm text-text-muted">
          <MessageCircle className="h-4 w-4" />
          Escreve uma mensagem…
        </div>
      </motion.div>

      <div className="mt-10 flex justify-center">
        <CTAButton size="lg" reassure />
      </div>
    </section>
  );
};

const Landing = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <Helmet>
        <title>Saldo+ — O teu assistente financeiro com IA</title>
        <meta
          name="description"
          content="Organiza despesas, poupa mais e recebe insights automáticos. Fala com a IA do Saldo+ como falarias com um amigo. 3 dias grátis."
        />
        <link rel="canonical" href="https://saldoplusapp.com/" />
        <meta property="og:title" content="Saldo+ — O teu assistente financeiro com IA" />
        <meta property="og:description" content="Nunca mais perguntes 'para onde foi o meu dinheiro?'." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://saldoplusapp.com/" />
        <meta name="twitter:card" content="summary_large_image" />
      </Helmet>

      {/* Nav */}
      <header
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
          scrolled ? "bg-background/80 backdrop-blur-lg border-b border-border-subtle/60" : "bg-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="text-2xl font-black tracking-tight">
            <span className="text-foreground">Saldo</span>
            <span className="text-primary">+</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/auth" className="text-sm font-medium text-text-secondary hover:text-foreground transition-colors">
              Entrar
            </Link>
            <Link
              to={SIGNUP_URL}
              className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold hover:opacity-95 transition-opacity"
            >
              Começar grátis
            </Link>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative pt-32 sm:pt-40 pb-16 px-6">
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute top-20 -left-40 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px]" />
          <div className="absolute top-40 right-0 w-[400px] h-[400px] bg-accent/5 rounded-full blur-[100px]" />
        </div>

        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
            <div className="inline-flex items-center gap-2 rounded-full border border-border-subtle bg-surface/80 backdrop-blur px-3 py-1.5 mb-8">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-medium text-text-secondary">Assistente financeiro com IA</span>
            </div>

            <h1 className="font-display text-[2.5rem] sm:text-6xl lg:text-7xl leading-[1.02] tracking-tight font-bold">
              Nunca mais perguntes:
              <br />
              <span className="text-primary italic font-serif">"Para onde foi o meu dinheiro?"</span>
            </h1>

            <p className="mt-8 text-lg sm:text-xl text-text-secondary leading-relaxed max-w-xl">
              O Saldo+ utiliza Inteligência Artificial para organizar automaticamente as tuas finanças
              e mostrar exatamente onde podes poupar.
            </p>

            <div className="mt-10">
              <CTAButton size="xl" reassure align="start" />
            </div>


            {/* Trust row */}
            <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-xs text-text-muted">
              <span className="inline-flex items-center gap-1.5"><Lock className="h-3.5 w-3.5 text-primary" /> Dados encriptados</span>
              <span className="inline-flex items-center gap-1.5"><CreditCard className="h-3.5 w-3.5 text-primary" /> Pagamentos via Stripe</span>
              <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-primary" /> Privacidade garantida</span>
            </div>
          </motion.div>

          {/* Mockup IA */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative"
          >
            <div className="absolute -inset-6 bg-gradient-to-br from-primary/20 to-accent/10 rounded-[3rem] blur-2xl" />
            <div className="relative rounded-[2rem] bg-surface border border-border-subtle shadow-2xl p-6 sm:p-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Sparkles className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold">Assistente Saldo+</div>
                    <div className="text-[10px] text-text-muted flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                      Online agora
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3 min-h-[320px]">
                <ChatBubble from="user" text="Supermercado 15€" delay={0.3} />
                <ChatBubble from="ai" text="✓ Despesa registada em Alimentação." delay={0.6} />
                <ChatBubble from="ai" text="Este mês já gastaste 214€ em alimentação." delay={0.9} />
                <ChatBubble from="ai" text="Queres definir um limite de 250€?" delay={1.2} />
              </div>

              <div className="mt-6 rounded-xl bg-secondary/60 border border-border-subtle px-4 py-3 flex items-center gap-2 text-sm text-text-muted">
                <MessageCircle className="h-4 w-4" />
                Escreve uma mensagem…
              </div>
            </div>
          </motion.div>
        </div>

        <p className="text-center text-xs text-text-muted mt-10">
          Pode cancelar a qualquer momento durante os 3 dias gratuitos.
        </p>
      </section>

      {/* TRUST STRIP */}
      <section className="border-y border-border-subtle/60 bg-surface/60">
        <div className="max-w-6xl mx-auto px-6 py-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          {[
            { icon: CreditCard, label: "Pagamentos seguros via Stripe" },
            { icon: Lock, label: "Dados protegidos e encriptados" },
            { icon: MapPin, label: "Desenvolvido em Portugal 🇵🇹" },
            { icon: Smartphone, label: "Compatível com Android e iPhone" },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-2.5 justify-center md:justify-start">
              <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <span className="font-medium text-text-secondary">{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* AI DEMO — auto-playing */}
      <AIDemoSection />



      {/* PROBLEMA — Antes vs Depois */}
      <section className="py-24 sm:py-28 px-6 bg-secondary/40">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp} className="text-center max-w-3xl mx-auto mb-14">
            <h2 className="font-display text-4xl sm:text-5xl font-bold tracking-tight">
              Chega de perder tempo com Excel.
            </h2>
            <p className="mt-4 text-lg text-text-secondary">
              A diferença entre andar às cegas e ter controlo total.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6">
            <motion.div {...fadeUp} className="rounded-3xl bg-surface border border-border-subtle p-8">
              <div className="text-xs uppercase tracking-widest font-bold text-text-muted mb-4">Antes</div>
              <ul className="space-y-3 text-text-secondary">
                {["Excel confuso", "Notas soltas no telemóvel", "Calculadora manual", "Nunca sabes onde gastas"].map(
                  (t) => (
                    <li key={t} className="flex items-start gap-3">
                      <X className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                      <span>{t}</span>
                    </li>
                  )
                )}
              </ul>
            </motion.div>

            <motion.div
              {...fadeUp}
              className="rounded-3xl bg-gradient-to-br from-primary/10 to-primary/5 border-2 border-primary/30 p-8 shadow-xl"
            >
              <div className="text-xs uppercase tracking-widest font-bold text-primary mb-4">Depois</div>
              <ul className="space-y-3 text-foreground">
                {[
                  "A IA organiza tudo por ti",
                  "Dashboard automático",
                  "Objetivos financeiros claros",
                  "Tudo num único lugar",
                ].map((t) => (
                  <li key={t} className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span className="font-medium">{t}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* COMO FUNCIONA A IA */}
      <section className="py-24 sm:py-28 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.h2
            {...fadeUp}
            className="font-display text-4xl sm:text-5xl font-bold tracking-tight text-center mb-16"
          >
            Como funciona a IA.
          </motion.h2>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { n: "1", t: "Escreve uma mensagem", d: "Como falarias com um amigo." },
              { n: "2", t: "A IA organiza tudo", d: "Categorias, datas e valores automáticos." },
              { n: "3", t: "Recebe insights", d: "Descobre onde poupar já este mês." },
            ].map((s, i) => (
              <motion.div
                key={s.n}
                {...fadeUp}
                transition={{ duration: 0.6, delay: i * 0.1 }}
                className="text-center"
              >
                <div className="mx-auto h-14 w-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold mb-5 shadow-lg shadow-primary/30">
                  {s.n}
                </div>
                <h3 className="text-lg font-semibold mb-2">{s.t}</h3>
                <p className="text-text-secondary text-sm">{s.d}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* PLANOS */}
      <section id="planos" className="py-24 sm:py-28 px-6 bg-secondary/40">
        <div className="max-w-6xl mx-auto">
          <motion.div {...fadeUp} className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="font-display text-4xl sm:text-5xl font-bold tracking-tight">Escolhe o teu plano.</h2>
            <p className="mt-4 text-lg text-text-secondary">
              Começa com 3 dias grátis em qualquer plano. Cancela quando quiseres.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6 items-stretch">
            {plans.map((p, i) => {
              const Icon = p.icon;
              return (
                <motion.div
                  key={p.id}
                  {...fadeUp}
                  transition={{ duration: 0.6, delay: i * 0.08 }}
                  className={`relative rounded-3xl bg-surface p-8 flex flex-col transition-all hover:-translate-y-1 ${
                    p.featured
                      ? "border-2 border-primary shadow-[0_20px_60px_-15px_hsl(160_84%_39%/0.35)] md:scale-105 md:-my-2"
                      : "border border-border-subtle shadow-lg hover:shadow-xl"
                  }`}
                >
                  {p.featured && p.badge && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-primary text-primary-foreground text-xs font-bold px-4 py-1.5 shadow-lg">
                      {p.badge}
                    </div>
                  )}
                  {p.savings && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-accent text-accent-foreground text-xs font-bold px-4 py-1.5 shadow-lg">
                      🔥 {p.savings}
                    </div>
                  )}

                  <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-5">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>

                  <h3 className="text-2xl font-bold">{p.name}</h3>
                  <p className="text-sm text-text-secondary mt-1 min-h-[42px]">{p.tagline}</p>

                  <div className="mt-6 flex items-baseline gap-1">
                    <span className="text-5xl font-black tracking-tight">{p.price}</span>
                    <span className="text-text-muted font-medium">{p.interval}</span>
                  </div>
                  {(p.perMonth || p.savings) && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {p.perMonth && (
                        <span className="inline-flex items-center rounded-full bg-primary/10 text-primary text-xs font-bold px-3 py-1">
                          {p.perMonth}
                        </span>
                      )}
                      {p.savings && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 text-accent text-xs font-bold px-3 py-1">
                          💰 {p.savings}
                        </span>
                      )}
                      {p.id === "pro" && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-foreground/5 text-foreground text-xs font-bold px-3 py-1">
                          <Crown className="h-3 w-3" /> Tudo desbloqueado
                        </span>
                      )}
                    </div>
                  )}

                  <ul className="mt-6 space-y-2.5 text-sm flex-1">
                    {p.highlights.map((h) => (
                      <li key={h} className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        <span className="text-text-secondary">{h}</span>
                      </li>
                    ))}
                  </ul>

                  <Link
                    to={SIGNUP_URL}
                    className={`mt-8 inline-flex items-center justify-center gap-2 rounded-full px-6 py-3.5 text-sm font-semibold transition-all ${
                      p.featured
                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/40 hover:scale-[1.02]"
                        : "bg-foreground text-background hover:opacity-90"
                    }`}
                  >
                    {p.cta}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </motion.div>
              );
            })}
          </div>

          <p className="text-center text-xs text-text-muted mt-10">
            Sem compromisso. Cancela a qualquer momento durante os 3 dias.
          </p>
        </div>
      </section>

      {/* FUNCIONALIDADES — comparação */}
      <section className="py-24 sm:py-28 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp} className="text-center mb-14">
            <h2 className="font-display text-4xl sm:text-5xl font-bold tracking-tight">
              Compara funcionalidades.
            </h2>
          </motion.div>

          <motion.div
            {...fadeUp}
            className="overflow-hidden rounded-3xl border border-border-subtle bg-surface shadow-xl"
          >
            <div className="grid grid-cols-[1.4fr_1fr_1fr_1fr] text-sm">
              {/* Header */}
              <div className="p-4 sm:p-5 border-b border-border-subtle bg-secondary/40" />
              <div className="p-4 sm:p-5 border-b border-border-subtle bg-secondary/40 text-center font-bold">
                Starter
              </div>
              <div className="p-4 sm:p-5 border-b border-border-subtle bg-primary/10 text-center font-bold text-primary">
                Casa+ ⭐
              </div>
              <div className="p-4 sm:p-5 border-b border-border-subtle bg-secondary/40 text-center font-bold">
                Elite
              </div>

              {featureMatrix.map((row, idx) => (
                <div key={row.name} className="contents">
                  <div className={`p-4 sm:p-5 text-text-secondary font-medium ${idx % 2 ? "bg-secondary/20" : ""}`}>
                    {row.name}
                  </div>
                  {[row.s, row.c, row.e].map((v, i) => (
                    <div
                      key={i}
                      className={`p-4 sm:p-5 flex items-center justify-center ${
                        i === 1 ? "bg-primary/5" : idx % 2 ? "bg-secondary/20" : ""
                      }`}
                    >
                      {v ? (
                        <Check className="h-5 w-5 text-primary" />
                      ) : (
                        <span className="h-1 w-4 rounded-full bg-border-subtle" />
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </motion.div>

          <div className="mt-10 flex justify-center">
            <CTAButton size="lg" />
          </div>
        </div>
      </section>

      {/* Confiança curta */}
      <section className="border-y border-border-subtle/60 bg-surface/50">
        <div className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-2 md:grid-cols-4 gap-6 items-center">
          <div className="text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-0.5 text-primary">
              {[0, 1, 2, 3, 4].map((i) => (
                <Star key={i} className="h-4 w-4 fill-primary" />
              ))}
            </div>
            <p className="text-xs text-text-muted mt-1">Avaliação média dos utilizadores</p>
          </div>
          {[
            { icon: ShieldCheck, label: "100% Seguro" },
            { icon: Lock, label: "Encriptação total" },
            { icon: CreditCard, label: "Pagamentos Stripe" },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-2 justify-center md:justify-start">
              <Icon className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium text-text-secondary">{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="py-24 sm:py-28 px-6">
        <div className="max-w-3xl mx-auto">
          <motion.h2
            {...fadeUp}
            className="font-display text-4xl sm:text-5xl font-bold tracking-tight text-center mb-14"
          >
            Perguntas frequentes.
          </motion.h2>

          <div className="space-y-3">
            {faqs.map((f, i) => {
              const open = openFaq === i;
              return (
                <motion.div
                  key={f.q}
                  {...fadeUp}
                  transition={{ duration: 0.5, delay: i * 0.05 }}
                  className="rounded-2xl border border-border-subtle bg-surface overflow-hidden"
                >
                  <button
                    onClick={() => setOpenFaq(open ? null : i)}
                    className="w-full flex items-center justify-between text-left px-6 py-5"
                  >
                    <span className="font-semibold">{f.q}</span>
                    <ChevronDown
                      className={`h-5 w-5 text-text-muted transition-transform ${open ? "rotate-180" : ""}`}
                    />
                  </button>
                  <div
                    className={`grid transition-all duration-300 ${
                      open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                    }`}
                  >
                    <div className="overflow-hidden">
                      <p className="px-6 pb-5 text-text-secondary leading-relaxed">{f.a}</p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-6 pb-28">
        <motion.div
          {...fadeUp}
          className="max-w-6xl mx-auto rounded-[2.5rem] relative overflow-hidden"
          style={{ background: "linear-gradient(135deg, hsl(160 84% 32%) 0%, hsl(160 84% 42%) 100%)" }}
        >
          <div className="absolute inset-0 opacity-30">
            <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full bg-white/10 blur-3xl" />
          </div>
          <div className="relative px-8 sm:px-16 py-20 sm:py-24 text-center">
            <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-primary-foreground leading-tight max-w-3xl mx-auto">
              Começa hoje a controlar o teu dinheiro.
            </h2>
            <p className="mt-6 text-lg sm:text-xl text-primary-foreground/90 max-w-xl mx-auto">
              Experimenta gratuitamente durante 3 dias. Sem compromisso.
            </p>
            <div className="mt-10 flex justify-center">
              <CTAButton size="xl" variant="white" />
            </div>
            <p className="mt-6 text-sm text-primary-foreground/80">
              Cancela quando quiseres · Configuração em menos de 2 minutos
            </p>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border-subtle py-10 px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-sm text-text-muted">
            © {new Date().getFullYear()} Saldo+. Todos os direitos reservados.
          </div>
          <div className="flex items-center gap-6 text-sm text-text-muted">
            <Link to="/termos" className="hover:text-foreground transition-colors">Termos</Link>
            <Link to="/privacidade" className="hover:text-foreground transition-colors">Privacidade</Link>
            <a href="mailto:contactosaldoplus@gmail.com" className="hover:text-foreground transition-colors">
              Contacto
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
