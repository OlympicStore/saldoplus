import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowRight, ArrowLeft, Home, Wallet, ArrowDownCircle, Receipt, Target, BarChart3, Settings, Sparkles, HomeIcon, Calculator } from "lucide-react";

type Tab = "dashboard" | "balance" | "entries" | "expenses" | "investments" | "annual" | "goals" | "budgets" | "minha_casa" | "account";

interface TourStep {
  title: string;
  description: string;
  icon: React.ElementType;
  tip?: string;
  tab?: Tab;
}

const TOUR_STEPS: TourStep[] = [
  {
    title: "Bem-vindo ao Saldo+! 🎉",
    description: "Vamos mostrar-lhe como tirar o máximo partido da sua conta. A cada passo vamos abrir a secção correspondente para que veja tudo na prática.",
    icon: Sparkles,
    tip: "Pode rever este guia a qualquer momento na aba Conta.",
  },
  {
    title: "Home — Visão geral",
    description: "Aqui encontra o saldo acumulado, o balanço do mês (entradas vs saídas) e gráficos de evolução. É o ponto de partida para perceber rapidamente como estão as suas finanças.",
    icon: Home,
    tip: "Clique no saldo acumulado para editá-lo manualmente.",
    tab: "dashboard",
  },
  {
    title: "Saldo — As suas contas",
    description: "Adicione as suas contas bancárias (corrente, poupança, investimento) e veja o saldo total consolidado. O sistema calcula tudo automaticamente.",
    icon: Wallet,
    tip: "Crie contas separadas para organizar melhor o seu dinheiro.",
    tab: "balance",
  },
  {
    title: "Entradas — Rendimentos",
    description: "Registe salários, rendimentos extra e transferências entre contas. Pode configurar salários fixos por pessoa que se repetem todos os meses.",
    icon: ArrowDownCircle,
    tip: "Use o botão 'Salários' para definir valores mensais automáticos.",
    tab: "entries",
  },
  {
    title: "Despesas — Gastos fixos e variáveis",
    description: "Organize todas as suas despesas: contas da casa (água, luz, internet) como gastos fixos, e compras do dia a dia como gastos variáveis por categoria.",
    icon: Receipt,
    tip: "Atribua um responsável a cada despesa para dividir contas.",
    tab: "expenses",
  },
  {
    title: "Mês a mês",
    description: "Use o seletor de mês no topo para navegar entre meses. Cada mês tem os seus próprios valores, permitindo um controlo detalhado ao longo do tempo.",
    icon: BarChart3,
    tip: "Os dados são independentes por mês — pode planear meses futuros.",
    tab: "dashboard",
  },
  {
    title: "Configurações rápidas",
    description: "Use o botão 'Nomes' para editar as pessoas da casa e 'Categorias' para gerir categorias de despesas. Na aba 'Conta' pode alterar a password e ver o seu plano.",
    icon: Settings,
    tip: "Adicione todos os membros da família para dividir despesas.",
    tab: "account",
  },
  {
    title: "Tudo pronto! 🚀",
    description: "Comece por adicionar as suas contas na aba 'Saldo', depois registe os primeiros rendimentos e despesas. Em poucos minutos terá uma visão completa das suas finanças!",
    icon: Target,
    tip: "Dica: comece pelo mês atual e vá preenchendo aos poucos.",
    tab: "dashboard",
  },
];

// Steps adicionais para o plano Imobiliária — inseridos antes do "Tudo pronto"
const IMOBILIARIA_EXTRA_STEPS: TourStep[] = [
  {
    title: "Minha Casa — Acompanhe a sua habitação",
    description: "Aqui pode controlar a prestação mensal, acompanhar a taxa de esforço (peso da casa no rendimento) e ver o progresso do pagamento da casa ao longo do tempo. Tudo num só sítio.",
    icon: HomeIcon,
    tip: "A taxa de esforço ideal está abaixo de 30% do seu rendimento.",
    tab: "minha_casa",
  },
  {
    title: "Simulador de Crédito",
    description: "Dentro de Minha Casa tem um Simulador de Crédito completo: pode atualizar o seu crédito atual, simular cenários alternativos com taxas/prazos diferentes e ver quanto poupa com pagamentos extra.",
    icon: Calculator,
    tip: "Use 'Copiar atual' para criar simulações baseadas no seu crédito real.",
    tab: "minha_casa",
  },
];

const TOUR_STORAGE_KEY = "saldoplus_tour_completed";

interface GuidedTourProps {
  forceShow?: boolean;
  onClose?: () => void;
  onNavigate?: (tab: Tab) => void;
  plan?: string;
}

const GuidedTour = ({ forceShow, onClose, onNavigate, plan }: GuidedTourProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  // Build steps based on plan: imobiliária inclui Minha Casa + Simulador antes do passo final
  const steps = plan === "imobiliaria"
    ? [...TOUR_STEPS.slice(0, -1), ...IMOBILIARIA_EXTRA_STEPS, TOUR_STEPS[TOUR_STEPS.length - 1]]
    : TOUR_STEPS;

  useEffect(() => {
    if (forceShow) {
      setCurrentStep(0);
      setIsVisible(true);
      return;
    }
    const completed = localStorage.getItem(TOUR_STORAGE_KEY);
    if (!completed) {
      setIsVisible(true);
    }
  }, [forceShow]);

  // Navigate to the relevant tab when the step changes
  useEffect(() => {
    if (!isVisible) return;
    const step = steps[currentStep];
    if (step?.tab && onNavigate) {
      onNavigate(step.tab);
    }
  }, [currentStep, isVisible, onNavigate, steps]);

  const handleClose = () => {
    setIsVisible(false);
    localStorage.setItem(TOUR_STORAGE_KEY, "true");
    onClose?.();
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      handleClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) setCurrentStep((s) => s - 1);
  };

  if (!isVisible) return null;

  const step = steps[currentStep];
  const isLast = currentStep === steps.length - 1;
  const isFirst = currentStep === 0;
  const Icon = step.icon;

  // First and last steps: centered modal. Middle steps: bottom panel so content is visible.
  const isCentered = isFirst || isLast;

  return (
    <div
      className={`fixed inset-0 z-[100] flex px-4 ${
        isCentered ? "items-center justify-center bg-black/50 backdrop-blur-sm" : "items-end justify-center bg-black/20"
      }`}
      style={{ pointerEvents: isCentered ? undefined : "none" }}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={isCentered ? { opacity: 0, scale: 0.95, y: 10 } : { opacity: 0, y: 40 }}
          animate={isCentered ? { opacity: 1, scale: 1, y: 0 } : { opacity: 1, y: 0 }}
          exit={isCentered ? { opacity: 0, scale: 0.95, y: -10 } : { opacity: 0, y: 40 }}
          transition={{ duration: 0.25 }}
          className={`bg-surface shadow-2xl border border-border-subtle/60 w-full overflow-hidden ${
            isCentered ? "rounded-2xl max-w-md" : "rounded-t-2xl max-w-lg mb-0 pb-safe"
          }`}
          style={{ pointerEvents: "auto" }}
        >
          {/* Progress bar */}
          <div className="h-1 bg-border-subtle/30">
            <div
              className="h-full bg-primary transition-all duration-300 rounded-full"
              style={{ width: `${((currentStep + 1) / TOUR_STEPS.length) * 100}%` }}
            />
          </div>

          <div className="p-5 sm:p-6">
            {/* Close button */}
            <div className="flex justify-between items-start mb-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Icon className="h-5 w-5" />
              </div>
              <button
                onClick={handleClose}
                className="text-text-muted hover:text-foreground transition-colors p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <h3 className="text-base font-bold text-foreground mb-1.5">{step.title}</h3>
            <p className="text-sm text-text-muted leading-relaxed mb-3">{step.description}</p>

            {step.tip && (
              <div className="rounded-lg bg-primary/5 border border-primary/10 p-2.5 mb-4">
                <p className="text-xs text-primary font-medium">💡 {step.tip}</p>
              </div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-muted">
                {currentStep + 1} de {TOUR_STEPS.length}
              </span>

              <div className="flex items-center gap-2">
                {!isFirst && (
                  <button
                    onClick={handlePrev}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-text-muted hover:bg-surface-hover transition-colors"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Anterior
                  </button>
                )}

                {isFirst && !forceShow && (
                  <button
                    onClick={handleClose}
                    className="px-3 py-2 rounded-lg text-sm text-text-muted hover:bg-surface-hover transition-colors"
                  >
                    Saltar
                  </button>
                )}

                <button
                  onClick={handleNext}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
                >
                  {isLast ? "Começar a usar" : "Seguinte"}
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
