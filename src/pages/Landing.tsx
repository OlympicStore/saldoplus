import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import {
  Sparkles,
  ShieldCheck,
  Lock,
  Zap,
  Target,
  LineChart,
  Check,
  ArrowRight,
  MessageCircle,
  ChevronDown,
} from "lucide-react";

const SIGNUP_URL = "/auth?mode=signup";

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
};

const CTAButton = ({ children, size = "lg" }: { children: React.ReactNode; size?: "lg" | "xl" }) => (
  <Link
    to={SIGNUP_URL}
    className={`inline-flex items-center justify-center gap-2 rounded-full bg-primary text-primary-foreground font-semibold shadow-[0_10px_40px_-10px_hsl(160_84%_39%/0.7)] hover:shadow-[0_16px_50px_-10px_hsl(160_84%_39%/0.9)] hover:scale-[1.02] transition-all ${
      size === "xl" ? "px-9 py-5 text-lg" : "px-7 py-4 text-base"
    }`}
  >
    {children}
    <ArrowRight className="h-4 w-4" />
  </Link>
);

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
  {
    q: "Posso cancelar quando quiser?",
    a: "Sim. Cancelas com um clique no teu painel, sem perguntas nem burocracia.",
  },
  {
    q: "Os meus dados estão seguros?",
    a: "Toda a informação é encriptada em trânsito e em repouso. Nunca partilhamos os teus dados.",
  },
  {
    q: "Preciso de cartão para começar?",
    a: "Sim, é necessário para começar o teste. Não há qualquer cobrança nos primeiros 3 dias.",
  },
  {
    q: "Funciona no telemóvel?",
    a: "Funciona em qualquer dispositivo. Instala como app no iPhone ou Android em segundos.",
  },
];

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
      <section className="relative pt-32 sm:pt-40 pb-20 px-6">
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

            <h1 className="font-display text-[2.75rem] sm:text-6xl lg:text-7xl leading-[1.02] tracking-tight font-bold">
              Nunca mais perguntes:
              <br />
              <span className="text-primary italic font-serif">"Para onde foi o meu dinheiro?"</span>
            </h1>

            <p className="mt-8 text-lg sm:text-xl text-text-secondary leading-relaxed max-w-xl">
              O Saldo+ usa Inteligência Artificial para organizar automaticamente as tuas despesas,
              mostrar onde estás a gastar demasiado e ajudar-te a poupar todos os meses.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row items-start sm:items-center gap-5">
              <CTAButton size="xl">Começar gratuitamente</CTAButton>
            </div>

            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-text-secondary">
              {["3 dias grátis", "Cancela quando quiseres", "Configuração em 2 minutos"].map((t) => (
                <li key={t} className="flex items-center gap-1.5">
                  <Check className="h-4 w-4 text-primary" />
                  {t}
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Mockup */}
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

              <div className="space-y-3 min-h-[300px]">
                <ChatBubble from="user" text="Supermercado 15€" delay={0.4} />
                <ChatBubble from="ai" text="✓ Despesa registada em Alimentação." delay={0.8} />
                <ChatBubble from="user" text="Quanto gastei este mês?" delay={1.2} />
                <ChatBubble
                  from="ai"
                  text="Este mês gastaste 487€. Estás a gastar 12% menos em alimentação face ao mês passado 🎉"
                  delay={1.6}
                />
              </div>

              <div className="mt-6 rounded-xl bg-secondary/60 border border-border-subtle px-4 py-3 flex items-center gap-2 text-sm text-text-muted">
                <MessageCircle className="h-4 w-4" />
                Escreve uma mensagem…
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Social proof strip */}
      <section className="border-y border-border-subtle/60 bg-surface/50">
        <div className="max-w-7xl mx-auto px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-8 items-center">
          <div className="text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-0.5 text-primary text-lg">
              {"★★★★★".split("").map((s, i) => (
                <span key={i}>{s}</span>
              ))}
            </div>
            <p className="text-xs text-text-muted mt-1">Avaliação média dos utilizadores</p>
          </div>
          {[
            { icon: ShieldCheck, label: "100% Seguro" },
            { icon: Lock, label: "Encriptação total" },
            { icon: ShieldCheck, label: "Privacidade primeiro" },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-2 justify-center md:justify-start">
              <Icon className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium text-text-secondary">{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* SEC 2 — Fala naturalmente */}
      <section className="py-28 sm:py-36 px-6">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          <motion.div {...fadeUp}>
            <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.05] tracking-tight">
              Fala naturalmente com a IA.
            </h2>
            <p className="mt-6 text-lg text-text-secondary max-w-lg">
              Escreve exatamente como falarias com um amigo. Sem formulários, sem categorias
              obrigatórias, sem complicações.
            </p>
          </motion.div>

          <motion.div {...fadeUp} className="rounded-3xl bg-surface border border-border-subtle p-6 sm:p-8 shadow-xl">
            <div className="space-y-3">
              <ChatBubble from="user" text="Gasolina 50€" />
              <ChatBubble from="ai" text="✓ Registado em Transportes." delay={0.1} />
              <ChatBubble from="user" text="Almoço 18€" delay={0.2} />
              <ChatBubble from="ai" text="✓ Registado em Restaurantes." delay={0.3} />
              <ChatBubble from="user" text="Recebi salário" delay={0.4} />
              <ChatBubble from="ai" text="Perfeito! Já atualizei o teu saldo do mês." delay={0.5} />
              <ChatBubble from="user" text="Quanto gastei este mês?" delay={0.6} />
              <ChatBubble
                from="ai"
                text="1.243€ até agora. A maior categoria foi Alimentação (32%)."
                delay={0.7}
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* SEC 3 — 3 cards */}
      <section className="py-28 sm:py-36 px-6 bg-secondary/40">
        <div className="max-w-6xl mx-auto">
          <motion.div {...fadeUp} className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight">
              A IA faz o trabalho por ti.
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: Zap,
                title: "Registo automático",
                desc: "Escreve uma frase. A IA classifica e organiza tudo por ti.",
              },
              {
                icon: LineChart,
                title: "Insights inteligentes",
                desc: "Descobre padrões, alertas e oportunidades de poupança.",
              },
              {
                icon: Target,
                title: "Objetivos financeiros",
                desc: "Define metas e recebe um plano claro para as alcançar.",
              },
            ].map(({ icon: Icon, title, desc }, i) => (
              <motion.div
                key={title}
                {...fadeUp}
                transition={{ duration: 0.6, delay: i * 0.1 }}
                className="group rounded-3xl bg-surface border border-border-subtle p-8 hover:shadow-xl hover:-translate-y-1 transition-all"
              >
                <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <Icon className="h-5 w-5 text-primary group-hover:text-primary-foreground" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{title}</h3>
                <p className="text-text-secondary leading-relaxed">{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* SEC 4 — Dashboard mockup */}
      <section className="py-28 sm:py-36 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div {...fadeUp} className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-tight">
              Percebe finalmente para onde vai o teu dinheiro.
            </h2>
            <p className="mt-6 text-lg text-text-secondary">
              Um painel claro, visual e sem ruído. Tudo o que precisas num só ecrã.
            </p>
          </motion.div>

          <motion.div {...fadeUp} className="relative">
            <div className="absolute -inset-8 bg-gradient-to-tr from-primary/20 via-transparent to-accent/10 rounded-[3rem] blur-2xl" />
            <div className="relative rounded-[2rem] bg-surface border border-border-subtle shadow-2xl p-6 sm:p-10">
              <div className="grid md:grid-cols-3 gap-4 mb-6">
                {[
                  { label: "Saldo atual", value: "3.847€", tone: "text-primary" },
                  { label: "Entradas", value: "2.100€", tone: "text-foreground" },
                  { label: "Saídas", value: "1.243€", tone: "text-foreground" },
                ].map((k) => (
                  <div key={k.label} className="rounded-2xl bg-secondary/50 border border-border-subtle p-5">
                    <div className="text-[10px] uppercase tracking-wider text-text-muted font-semibold">
                      {k.label}
                    </div>
                    <div className={`mt-2 text-3xl font-bold tracking-tight ${k.tone}`}>{k.value}</div>
                  </div>
                ))}
              </div>

              {/* Fake chart */}
              <div className="rounded-2xl bg-gradient-to-br from-primary/5 to-transparent border border-border-subtle p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm font-semibold">Evolução do saldo</div>
                  <div className="text-xs text-text-muted">Últimos 6 meses</div>
                </div>
                <svg viewBox="0 0 400 120" className="w-full h-32">
                  <defs>
                    <linearGradient id="g1" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="hsl(160 84% 39%)" stopOpacity="0.35" />
                      <stop offset="100%" stopColor="hsl(160 84% 39%)" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M0,90 C60,80 90,60 140,55 C190,50 220,75 270,60 C320,45 350,25 400,20 L400,120 L0,120 Z"
                    fill="url(#g1)"
                  />
                  <path
                    d="M0,90 C60,80 90,60 140,55 C190,50 220,75 270,60 C320,45 350,25 400,20"
                    fill="none"
                    stroke="hsl(160 84% 39%)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                </svg>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-border-subtle p-5">
                  <div className="text-sm font-semibold mb-4">Categorias</div>
                  {[
                    { name: "Alimentação", pct: 32, color: "hsl(160 84% 39%)" },
                    { name: "Transportes", pct: 18, color: "hsl(239 84% 67%)" },
                    { name: "Casa", pct: 24, color: "hsl(38 92% 50%)" },
                  ].map((c) => (
                    <div key={c.name} className="mb-3 last:mb-0">
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-text-secondary">{c.name}</span>
                        <span className="font-semibold">{c.pct}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-secondary overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${c.pct * 2}%`, background: c.color }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="rounded-2xl border border-border-subtle p-5">
                  <div className="text-sm font-semibold mb-4">Objetivos</div>
                  {[
                    { name: "Férias", pct: 68 },
                    { name: "Poupança emergência", pct: 42 },
                    { name: "Novo portátil", pct: 85 },
                  ].map((g) => (
                    <div key={g.name} className="mb-3 last:mb-0">
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-text-secondary">{g.name}</span>
                        <span className="font-semibold text-primary">{g.pct}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-secondary overflow-hidden">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${g.pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* SEC 5 — Como funciona */}
      <section className="py-28 sm:py-36 px-6 bg-secondary/40">
        <div className="max-w-5xl mx-auto">
          <motion.h2
            {...fadeUp}
            className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-center mb-20"
          >
            Como funciona.
          </motion.h2>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { n: "1", t: "Escreve uma mensagem.", d: "Como falarias com um amigo." },
              { n: "2", t: "A IA organiza automaticamente.", d: "Categorias, datas e valores." },
              { n: "3", t: "Recebe insights personalizados.", d: "E sabe onde poupar já." },
            ].map((s, i) => (
              <motion.div
                key={s.n}
                {...fadeUp}
                transition={{ duration: 0.6, delay: i * 0.1 }}
                className="text-center"
              >
                <div className="mx-auto h-16 w-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold mb-6 shadow-lg shadow-primary/30">
                  {s.n}
                </div>
                <h3 className="text-xl font-semibold mb-2">{s.t}</h3>
                <p className="text-text-secondary">{s.d}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* SEC 6 — FAQ */}
      <section className="py-28 sm:py-36 px-6">
        <div className="max-w-3xl mx-auto">
          <motion.h2
            {...fadeUp}
            className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-center mb-16"
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
          style={{
            background: "linear-gradient(135deg, hsl(160 84% 32%) 0%, hsl(160 84% 42%) 100%)",
          }}
        >
          <div className="absolute inset-0 opacity-30">
            <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full bg-white/10 blur-3xl" />
          </div>
          <div className="relative px-8 sm:px-16 py-20 sm:py-28 text-center">
            <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-primary-foreground leading-tight max-w-3xl mx-auto">
              Começa hoje a controlar o teu dinheiro.
            </h2>
            <p className="mt-6 text-lg sm:text-xl text-primary-foreground/90 max-w-xl mx-auto">
              Experimenta gratuitamente durante 3 dias.
            </p>
            <div className="mt-10 flex justify-center">
              <Link
                to={SIGNUP_URL}
                className="inline-flex items-center gap-2 rounded-full bg-white text-primary px-10 py-5 text-lg font-semibold shadow-2xl hover:scale-[1.03] transition-transform"
              >
                Começar agora
                <ArrowRight className="h-5 w-5" />
              </Link>
            </div>
            <p className="mt-6 text-sm text-primary-foreground/80">
              Sem compromisso · Cancela quando quiseres
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
