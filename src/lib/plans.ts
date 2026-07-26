// Canonical definition of Saldo+ plans (V2 pricing).
// UI labels: Essencial / Casa+ / Elite. Internal DB IDs stay: essencial / casa / pro.
import { Zap, Home, Gem, type LucideIcon } from "lucide-react";

export type PlanId = "essencial" | "casa" | "pro";

export interface PlanFeatureFlags {
  goals: boolean;
  investments: boolean;
  budgets: boolean;
  couple_mode: boolean;
  monthly_planning: boolean;
  unlimited_ai: boolean;
  ai_monthly_limit: number | null; // null = unlimited
  ocr: boolean;
  multi_workspace: boolean;
  advanced_reports: boolean;
  excel_export: boolean;
  priority_support: boolean;
  api_access: boolean;
}

export interface PlanDefinition {
  id: PlanId;
  name: string;                 // display name (Casa+, Elite, ...)
  icon: LucideIcon;
  price: number;                // final price in EUR
  oldPrice?: number;            // strikethrough price
  interval: "mês" | "ano";
  subtitle: string;
  tagline: string;
  badge?: string;
  savingsBadge?: string;        // e.g. "60% OFF"
  savingsAmount?: number;       // €240
  cta: string;
  featured?: boolean;
  exclusive?: boolean;
  features: string[];
  missing: string[];            // features NOT included
  flags: PlanFeatureFlags;
  stripePriceId: string;
}

export const PLANS: Record<PlanId, PlanDefinition> = {
  essencial: {
    id: "essencial",
    name: "Essencial",
    icon: Zap,
    price: 15.99,
    interval: "mês",
    subtitle: "Cobrado mensalmente — cancele quando quiser",
    tagline: "Ideal para quem quer controlar as suas finanças pessoais.",
    cta: "Começar Essencial",
    features: [
      "Receitas ilimitadas",
      "Despesas ilimitadas",
      "Contas bancárias",
      "Despesas recorrentes",
      "Calendário anual",
      "Dashboard financeiro",
      "Score Financeiro",
      "Exportação PDF",
      "Assistente IA básico (50 mensagens/mês)",
    ],
    missing: [
      "Objetivos",
      "Investimentos",
      "Orçamentos",
      "Modo Casal",
      "OCR de faturas",
      "IA ilimitada",
      "Multi Workspace",
    ],
    flags: {
      goals: false, investments: false, budgets: false, couple_mode: false,
      monthly_planning: false, unlimited_ai: false, ai_monthly_limit: 50,
      ocr: false, multi_workspace: false, advanced_reports: false,
      excel_export: false, priority_support: false, api_access: false,
    },
    stripePriceId: "price_1TxGZAImKoY4gMb7A6VdD5Bt",
  },
  casa: {
    id: "casa",
    name: "Casa+",
    icon: Home,
    price: 28.99,
    interval: "mês",
    subtitle: "Cobrado mensalmente — cancele quando quiser",
    tagline: "O plano perfeito para famílias e para quem quer automatizar totalmente as suas finanças.",
    badge: "⭐ Mais Vendido",
    cta: "Escolher Casa+",
    featured: true,
    features: [
      "Tudo do Essencial",
      "Objetivos financeiros",
      "Investimentos",
      "Orçamentos por categoria",
      "Planeamento mensal",
      "Modo Casal completo",
      "Divisão automática de despesas",
      "Divisão manual por percentagem",
      "Divisão personalizada por categoria",
      "Património",
      "Histórico completo",
      "Categorias personalizadas",
      "IA ilimitada",
      "Sugestões inteligentes",
      "Alertas personalizados",
      "Relatórios avançados",
      "Exportação Excel",
      "Prioridade no suporte",
    ],
    missing: [
      "OCR de faturas",
      "IA lê PDFs e fotografias",
      "Multi Workspace",
      "Gestão empresarial",
      "API",
    ],
    flags: {
      goals: true, investments: true, budgets: true, couple_mode: true,
      monthly_planning: true, unlimited_ai: true, ai_monthly_limit: null,
      ocr: false, multi_workspace: false, advanced_reports: true,
      excel_export: true, priority_support: true, api_access: false,
    },
    stripePriceId: "price_1TxGZTImKoY4gMb7ykSwbaDu",
  },
  pro: {
    id: "pro",
    name: "Elite",
    icon: Gem,
    price: 159.99,
    oldPrice: 399.99,
    interval: "ano",
    subtitle: "Cobrado anualmente — sem renovação automática",
    tagline: "Para quem quer o Saldo+ ao máximo, com IA que lê faturas e trabalha por si.",
    badge: "💎 Melhor Oferta Anual",
    savingsBadge: "🔥 60% OFF",
    savingsAmount: 240,
    cta: "Obter Elite",
    exclusive: true,
    features: [
      "Tudo do Casa+",
      "OCR inteligente de faturas",
      "IA lê PDFs",
      "IA lê fotografias",
      "IA extrai automaticamente: fornecedor, data, valor, categoria, IVA",
      "IA cria despesas automaticamente",
      "IA cria despesas recorrentes",
      "IA atualiza contas recorrentes",
      "IA aprende padrões financeiros",
      "IA sugere poupanças",
      "IA prevê gastos futuros",
      "Multi Workspace (até 5 utilizadores)",
      "Gestão financeira empresarial",
      "Acesso à API (futura)",
      "Funcionalidades Beta",
      "Suporte prioritário",
      "Acesso antecipado a novas funcionalidades",
    ],
    missing: [],
    flags: {
      goals: true, investments: true, budgets: true, couple_mode: true,
      monthly_planning: true, unlimited_ai: true, ai_monthly_limit: null,
      ocr: true, multi_workspace: true, advanced_reports: true,
      excel_export: true, priority_support: true, api_access: true,
    },
    stripePriceId: "price_1TxGZjImKoY4gMb7Tkg5Cccp",
  },
};

export const PLAN_ORDER: PlanId[] = ["essencial", "casa", "pro"];

export const PLAN_LABELS: Record<string, string> = {
  essencial: "Essencial",
  casa: "Casa+",
  pro: "Elite",
  imobiliaria: "Imobiliária",
};

export const formatEuro = (v: number, fractionDigits = 2) =>
  `${v.toFixed(fractionDigits).replace(".", ",")}€`;

export const getPlan = (id: string | null | undefined): PlanDefinition | null => {
  if (!id) return null;
  return (PLANS as Record<string, PlanDefinition>)[id] ?? null;
};

export const nextPlan = (id: string): PlanDefinition | null => {
  const idx = PLAN_ORDER.indexOf(id as PlanId);
  if (idx < 0 || idx >= PLAN_ORDER.length - 1) return null;
  return PLANS[PLAN_ORDER[idx + 1]];
};

// Compare two plans; returns true if `a` is at least as high as `b`.
export const planAtLeast = (a: string | null | undefined, b: PlanId): boolean => {
  const ia = PLAN_ORDER.indexOf(a as PlanId);
  const ib = PLAN_ORDER.indexOf(b);
  // Partner plan (imobiliaria) → treat as Casa+.
  if (a === "imobiliaria") return PLAN_ORDER.indexOf("casa") >= ib;
  if (ia < 0 || ib < 0) return false;
  return ia >= ib;
};
