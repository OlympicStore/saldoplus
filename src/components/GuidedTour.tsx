import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowRight, ArrowLeft, Home, Wallet, ArrowDownCircle, Receipt, Target, BarChart3, Settings, Sparkles } from "lucide-react";

interface TourStep {
  title: string;
  description: string;
  icon: React.ElementType;
  tip?: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    title: "Bem-vindo ao Saldo+! 🎉",
    description: "Vamos mostrar-lhe como tirar o máximo partido da sua conta. Este tour leva menos de 1 minuto.",
    icon: Sparkles,
    tip: "Pode rever este guia a qualquer momento na aba Conta.",
  },
  {
    title: "Home — Visão geral",
    description: "Aqui encontra o saldo acumulado, o balanço do mês (entradas vs saídas) e gráficos de evolução. É o ponto de partida para perceber rapidamente como estão as suas finanças.",
    icon: Home,
    tip: "Clique no saldo acumulado para editá-lo manualmente.",
  },
  {
    title: "Saldo — As suas contas",
    description: "Adicione as suas contas bancárias (corrente, poupança, investimento) e veja o saldo total consolidado. O sistema calcula tudo automaticamente.",
    icon: Wallet,
    tip: "Crie contas separadas para organizar melhor o seu dinheiro.",
  },
  {
    title: "Entradas — Rendimentos",
    description: "Registe salários, rendimentos extra e transferências entre contas. Pode configurar salários fixos por pessoa que se repetem todos os meses.",
    icon: ArrowDownCircle,
    tip: "Use o botão 'Salários' para definir valores mensais automáticos.",
  },
  {
    title: "Despesas — Gastos fixos e variáveis",
    description: "Organize todas as suas despesas: contas da casa (água, luz, internet) como gastos fixos, e compras do dia a dia como gastos variáveis por categoria.",
    icon: Receipt,
    tip: "Atribua um responsável a cada despesa para dividir contas.",
  },
  {
    title: "Mês a mês",
    description: "Use o seletor de mês no topo para navegar entre meses. Cada mês tem os seus próprios valores, permitindo um controlo detalhado ao longo do tempo.",
    icon: BarChart3,
    tip: "Os dados são independentes por mês — pode planear meses futuros.",
  },
  {
    title: "Configurações rápidas",
    description: "Use o botão 'Nomes' para editar as pessoas da casa e 'Categorias' para gerir categorias de despesas. Na aba 'Conta' pode alterar a password e ver o seu plano.",
    icon: Settings,
    tip: "Adicione todos os membros da família para dividir despesas.",
  },
  {
    title: "Tudo pronto! 🚀",
    description: "Comece por adicionar as suas contas na aba 'Saldo', depois registe os primeiros rendimentos e despesas. Em poucos minutos terá uma visão completa das suas finanças!",
    icon: Target,
    tip: "Dica: comece pelo mês atual e vá preenchendo aos poucos.",
  },
];

const TOUR_STORAGE_KEY = "saldoplus_tour_completed";

interface GuidedTourProps {
  forceShow?: boolean;
  onClose?: () => void;
}

const GuidedTour = ({ forceShow, onClose }: GuidedTourProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

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

  const handleClose = () => {
    setIsVisible(false);
    localStorage.setItem(TOUR_STORAGE_KEY, "true");
    onClose?.();
  };

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      handleClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) setCurrentStep((s) => s - 1);
  };

  if (!isVisible) return null;

  const step = TOUR_STEPS[currentStep];
  const isLast = currentStep === TOUR_STEPS.length - 1;
  const isFirst = currentStep === 0;
  const Icon = step.icon;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -10 }}
          transition={{ duration: 0.2 }}
          className="bg-surface rounded-2xl shadow-2xl border border-border-subtle/60 w-full max-w-md overflow-hidden"
        >
          {/* Progress bar */}
          <div className="h-1 bg-border-subtle/30">
            <div
              className="h-full bg-primary transition-all duration-300 rounded-full"
              style={{ width: `${((currentStep + 1) / TOUR_STEPS.length) * 100}%` }}
            />
          </div>

          <div className="p-6">
            {/* Close button */}
            <div className="flex justify-between items-start mb-4">
              <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Icon className="h-6 w-6" />
              </div>
              <button
                onClick={handleClose}
                className="text-text-muted hover:text-foreground transition-colors p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <h3 className="text-lg font-bold text-foreground mb-2">{step.title}</h3>
            <p className="text-sm text-text-muted leading-relaxed mb-4">{step.description}</p>

            {step.tip && (
              <div className="rounded-lg bg-primary/5 border border-primary/10 p-3 mb-6">
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
