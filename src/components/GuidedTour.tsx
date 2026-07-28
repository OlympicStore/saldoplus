import { useState, useEffect, useLayoutEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, ArrowRight, ArrowLeft, Home, ArrowLeftRight, Target,
  Sparkles, Menu, Plus, HomeIcon, Calculator, Smartphone, Share, MoreVertical,
} from "lucide-react";

type Tab = "dashboard" | "balance" | "entries" | "expenses" | "investments" | "annual" | "goals" | "budgets" | "minha_casa" | "account" | "movements" | "assistente";

interface TourStep {
  title: string;
  description: string;
  icon: React.ElementType;
  tip?: string;
  tab?: Tab;
  /** CSS selector of the element to highlight on screen. */
  target?: string;
  /** Renders the special "install on phone" block inside the step. */
  install?: boolean;
}

const TOUR_STEPS: TourStep[] = [
  {
    title: "Bem-vindo ao Saldo+! 🎉",
    description: "Vou mostrar-lhe rapidamente as áreas principais da app. Em cada passo destaco no ecrã onde deve olhar.",
    icon: Sparkles,
    tip: "Pode saltar a qualquer momento e rever este guia na aba Conta.",
  },
  {
    title: "Início — a sua visão geral",
    description: "Aqui vê o saldo acumulado, o balanço do mês (entradas vs. saídas), a evolução do saldo e o seu Score Financeiro.",
    icon: Home,
    tip: "Toque no saldo acumulado para ajustar manualmente.",
    tab: "dashboard",
    target: "[data-tour='nav-dashboard']",
  },
  {
    title: "Movimentos — tudo o que entra e sai",
    description: "Uma timeline única com receitas, despesas e investimentos. Pesquise, filtre por tipo e veja detalhes com um toque.",
    icon: ArrowLeftRight,
    tip: "Investimentos aparecem separados e não contam como despesa.",
    tab: "movements",
    target: "[data-tour='nav-movements']",
  },
  {
    title: "Assistente IA — o coração do Saldo+",
    description: "Toque no botão + central para falar com o assistente. Peça em linguagem natural: 'gastei 12€ no almoço', 'recebi 30€', 'quanto gastei em comida este mês?'. Ele regista, edita, apaga e responde por si.",
    icon: Sparkles,
    tip: "Diga 'desfaz o último registo' se se enganar.",
    tab: "assistente",
    target: "[data-tour='nav-assistente']",
  },
  {
    title: "Objetivos — metas e score",
    description: "Defina metas de poupança, acompanhe entradas/retiradas por meta e veja o seu Score Financeiro com sugestões concretas de melhoria.",
    icon: Target,
    tip: "Pode ajustar os pesos do score ao seu perfil.",
    tab: "goals",
    target: "[data-tour='nav-goals']",
  },
  {
    title: "Mais — tudo o resto",
    description: "No menu 'Mais' encontra Contas, Rendimentos, Despesas fixas/variáveis, Central de Contas, Investimentos, Modo Casal, Categorias e a área de Conta.",
    icon: Menu,
    tip: "O Modo Casal permite dividir despesas 50/50, proporcional, personalizado ou por categorias.",
    tab: "dashboard",
    target: "[data-tour='nav-more']",
  },
  {
    title: "Seletor de mês",
    description: "No topo pode navegar entre meses. Cada mês tem os seus próprios valores — planeie o futuro ou reveja o passado.",
    icon: Home,
    tab: "dashboard",
    target: "[data-tour='month-selector']",
  },
  {
    title: "Instale o Saldo+ no seu telemóvel 📱",
    description: "O Saldo+ funciona como uma app real quando adicionado ao ecrã principal — abre em ecrã inteiro, com ícone próprio, sem barras do navegador.",
    icon: Smartphone,
    tip: "Assim tem o Saldo+ sempre à mão, como qualquer outra app.",
    install: true,
  },
  {
    title: "Tudo pronto! 🚀",
    description: "Comece por adicionar uma conta e os primeiros movimentos — ou peça diretamente ao Assistente. Em minutos terá uma visão clara das suas finanças.",
    icon: Sparkles,
    tip: "Pode rever este tutorial na aba Conta a qualquer momento.",
  },
];

const IMOBILIARIA_EXTRA_STEPS: TourStep[] = [
  {
    title: "Minha Casa",
    description: "Controle a prestação mensal, veja a taxa de esforço e o progresso do pagamento da sua habitação num só sítio.",
    icon: HomeIcon,
    tip: "Taxa de esforço ideal: abaixo de 30% do rendimento.",
    tab: "minha_casa",
  },
  {
    title: "Simulador de Crédito",
    description: "Simule cenários de crédito com taxas e prazos diferentes e veja quanto poupa com pagamentos extra.",
    icon: Calculator,
    tab: "minha_casa",
  },
];

const TOUR_STORAGE_KEY = "saldoplus_tour_completed_v3";

interface GuidedTourProps {
  forceShow?: boolean;
  onClose?: () => void;
  onNavigate?: (tab: Tab) => void;
  plan?: string;
}

const GuidedTour = ({ forceShow, onClose, onNavigate, plan }: GuidedTourProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);

  const steps = plan === "imobiliaria"
    ? [...TOUR_STEPS.slice(0, -1), ...IMOBILIARIA_EXTRA_STEPS, TOUR_STEPS[TOUR_STEPS.length - 1]]
    : TOUR_STEPS;

  useEffect(() => {
    if (forceShow) {
      setCurrentStep(0);
      setIsVisible(true);
      return;
    }
    if (!localStorage.getItem(TOUR_STORAGE_KEY)) setIsVisible(true);
  }, [forceShow]);

  // Navigate to relevant tab when step changes
  useEffect(() => {
    if (!isVisible) return;
    const step = steps[currentStep];
    if (step?.tab && onNavigate) onNavigate(step.tab);
  }, [currentStep, isVisible, onNavigate, steps]);

  // Compute highlight rect after navigation/layout settles
  useLayoutEffect(() => {
    if (!isVisible) { setRect(null); return; }
    const step = steps[currentStep];
    if (!step?.target) { setRect(null); return; }

    let raf1 = 0, raf2 = 0, timeout = 0;
    const update = () => {
      const el = document.querySelector(step.target!) as HTMLElement | null;
      if (el) {
        try { el.scrollIntoView({ behavior: "smooth", block: "center" }); } catch {}
        setRect(el.getBoundingClientRect());
      } else {
        setRect(null);
      }
    };
    // wait a bit for tab change + smooth scroll
    timeout = window.setTimeout(() => {
      update();
      raf1 = requestAnimationFrame(() => { raf2 = requestAnimationFrame(update); });
    }, 250);

    const onResize = () => update();
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);
    return () => {
      clearTimeout(timeout);
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
    };
  }, [currentStep, isVisible, steps]);

  const handleClose = () => {
    setIsVisible(false);
    localStorage.setItem(TOUR_STORAGE_KEY, "true");
    onClose?.();
  };
  const handleNext = () => currentStep < steps.length - 1 ? setCurrentStep(s => s + 1) : handleClose();
  const handlePrev = () => currentStep > 0 && setCurrentStep(s => s - 1);

  if (!isVisible) return null;

  const step = steps[currentStep];
  const isLast = currentStep === steps.length - 1;
  const isFirst = currentStep === 0;
  const Icon = step.icon;

  const pad = 8;
  const highlightStyle = rect ? {
    top: rect.top - pad,
    left: rect.left - pad,
    width: rect.width + pad * 2,
    height: rect.height + pad * 2,
  } : null;

  // When a target is highlighted, the ring's huge box-shadow acts as the dim overlay
  // (leaving the target visible in the "hole"). Without a target we fall back to a full dim.
  const hasHighlight = !!highlightStyle;

  return (
    <div className={`fixed inset-0 z-[100] flex items-center justify-center px-4 ${hasHighlight ? "" : "bg-black/60"}`}>
      {/* Highlight outline over the target element */}
      {highlightStyle && (
        <motion.div
          key={`hl-${currentStep}`}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.25 }}
          className="fixed pointer-events-none rounded-2xl ring-4 ring-primary shadow-[0_0_0_9999px_rgba(0,0,0,0.65)]"
          style={highlightStyle}
        />
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -10 }}
          transition={{ duration: 0.25 }}
          className="relative bg-surface shadow-2xl border border-border-subtle/60 w-full overflow-hidden rounded-2xl max-w-md"
        >
          <div className="h-1 bg-border-subtle/30">
            <div
              className="h-full bg-primary transition-all duration-300 rounded-full"
              style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            />
          </div>

          <div className="p-5 sm:p-6">
            <div className="flex justify-between items-start mb-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Icon className="h-5 w-5" />
              </div>
              <button
                onClick={handleClose}
                className="text-text-muted hover:text-foreground transition-colors p-1"
                aria-label="Fechar tutorial"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <h3 className="text-base font-bold text-foreground mb-1.5">{step.title}</h3>
            <p className="text-sm text-text-muted leading-relaxed mb-3">{step.description}</p>

            {step.install && (
              <div className="space-y-2.5 mb-3">
                <div className="rounded-xl border border-border-subtle/60 bg-surface-hover/40 p-3">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wide text-primary">iPhone / iPad</span>
                  </div>
                  <ol className="text-xs text-text-muted leading-relaxed space-y-1 list-decimal list-inside">
                    <li>Abra o Saldo+ no <b>Safari</b>.</li>
                    <li>Toque no ícone <Share className="inline h-3.5 w-3.5 -mt-0.5" /> <b>Partilhar</b> (barra inferior).</li>
                    <li>Escolha <b>“Adicionar ao ecrã principal”</b> e confirme.</li>
                  </ol>
                </div>
                <div className="rounded-xl border border-border-subtle/60 bg-surface-hover/40 p-3">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wide text-primary">Android</span>
                  </div>
                  <ol className="text-xs text-text-muted leading-relaxed space-y-1 list-decimal list-inside">
                    <li>Abra o Saldo+ no <b>Chrome</b>.</li>
                    <li>Toque no menu <MoreVertical className="inline h-3.5 w-3.5 -mt-0.5" /> (canto superior direito).</li>
                    <li>Escolha <b>“Adicionar ao ecrã principal”</b> ou <b>“Instalar app”</b>.</li>
                  </ol>
                </div>
              </div>
            )}

            {step.tip && (
              <div className="rounded-lg bg-primary/5 border border-primary/10 p-2.5 mb-4">
                <p className="text-xs text-primary font-medium">💡 {step.tip}</p>
              </div>
            )}

            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-text-muted whitespace-nowrap">
                {currentStep + 1} de {steps.length}
              </span>

              <div className="flex items-center gap-2">
                {!isLast && (
                  <button
                    onClick={handleClose}
                    className="px-3 py-2 rounded-lg text-sm text-text-muted hover:bg-surface-hover transition-colors"
                  >
                    Saltar
                  </button>
                )}
                {!isFirst && (
                  <button
                    onClick={handlePrev}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-text-muted hover:bg-surface-hover transition-colors"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Anterior
                  </button>
                )}
                <button
                  onClick={handleNext}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
                >
                  {isLast ? "Começar" : "Seguinte"}
                  {!isLast && <ArrowRight className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default GuidedTour;
