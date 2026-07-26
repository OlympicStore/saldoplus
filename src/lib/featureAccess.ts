// Feature gating: single source of truth for what each plan unlocks.
import { useAuth } from "@/contexts/AuthContext";
import { PLANS, PLAN_ORDER, planAtLeast, type PlanId, type PlanFeatureFlags } from "./plans";

export type FeatureKey = keyof PlanFeatureFlags;

// Minimum plan required to unlock a feature.
export const FEATURE_MIN_PLAN: Record<FeatureKey, PlanId> = {
  goals: "casa",
  investments: "casa",
  budgets: "casa",
  couple_mode: "casa",
  monthly_planning: "casa",
  unlimited_ai: "casa",
  ai_monthly_limit: "essencial", // everyone has some limit or none
  ocr: "pro",
  multi_workspace: "pro",
  advanced_reports: "casa",
  excel_export: "casa",
  priority_support: "casa",
  api_access: "pro",
};

export interface FeatureAccess {
  allowed: boolean;
  currentPlan: string | null;
  requiredPlan: PlanId;
  requiredPlanName: string;
  ctaLabel: string;
}

export function useFeatureAccess(feature: FeatureKey): FeatureAccess {
  const { profile } = useAuth();
  const current = profile?.plan ?? null;
  const required = FEATURE_MIN_PLAN[feature];
  const allowed = planAtLeast(current, required);
  const requiredPlanName = PLANS[required].name;
  return {
    allowed,
    currentPlan: current,
    requiredPlan: required,
    requiredPlanName,
    ctaLabel: required === "pro" ? "Obter Elite" : "Fazer Upgrade",
  };
}

export const FEATURE_LABELS: Record<FeatureKey, { title: string; description: string }> = {
  goals: {
    title: "Objetivos Financeiros",
    description: "Defina metas de poupança e acompanhe o progresso automaticamente.",
  },
  investments: {
    title: "Investimentos",
    description: "Registe e monitorize o seu portfólio com evolução em tempo real.",
  },
  budgets: {
    title: "Orçamentos por Categoria",
    description: "Defina limites mensais por categoria e receba alertas inteligentes.",
  },
  couple_mode: {
    title: "Modo Casal",
    description: "Divida despesas com quem partilha a sua vida — proporcional, 50/50 ou por categoria.",
  },
  monthly_planning: {
    title: "Planeamento Mensal",
    description: "Planeie o mês inteiro antes de começar.",
  },
  unlimited_ai: {
    title: "Assistente IA Ilimitado",
    description: "Sem limite de mensagens. Fale com o seu assistente sempre que precisar.",
  },
  ai_monthly_limit: {
    title: "Assistente IA",
    description: "Fale com o seu assistente financeiro pessoal.",
  },
  ocr: {
    title: "OCR de Faturas",
    description: "Envie fotografias ou PDFs de faturas — a IA extrai fornecedor, data, valor, categoria e IVA por si.",
  },
  multi_workspace: {
    title: "Multi Workspace",
    description: "Até 5 utilizadores no mesmo espaço. Ideal para empresas ou famílias grandes.",
  },
  advanced_reports: { title: "Relatórios Avançados", description: "Relatórios financeiros detalhados." },
  excel_export: { title: "Exportação Excel", description: "Exporte todos os seus dados em Excel." },
  priority_support: { title: "Suporte Prioritário", description: "Respostas rápidas via canal prioritário." },
  api_access: { title: "Acesso API", description: "Integre o Saldo+ com as suas ferramentas." },
};

export { PLAN_ORDER };
