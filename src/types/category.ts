export type CategoryType = "fixo" | "inevitavel" | "nao_essencial";

export interface Category {
  id: string;
  name: string;
  type: CategoryType;
}

export const CATEGORY_TYPE_LABELS: Record<CategoryType, string> = {
  fixo: "Fixas (F)",
  inevitavel: "Inevitáveis (I)",
  nao_essencial: "Não-essenciais (N)",
};

export const CATEGORY_TYPE_SHORT: Record<CategoryType, string> = {
  fixo: "F",
  inevitavel: "I",
  nao_essencial: "N",
};

export const CATEGORY_TYPE_COLORS: Record<CategoryType, { bg: string; text: string; border: string }> = {
  fixo: { bg: "bg-blue-500/10", text: "text-blue-600", border: "border-blue-500/20" },
  inevitavel: { bg: "bg-amber-500/10", text: "text-amber-600", border: "border-amber-500/20" },
  nao_essencial: { bg: "bg-purple-500/10", text: "text-purple-600", border: "border-purple-500/20" },
};
