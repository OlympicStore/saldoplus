export type InvestmentType = "acoes" | "etf" | "cripto" | "fundos" | "poupanca" | "outros";

export interface Investment {
  id: string;
  type: InvestmentType | string;
  /** Nome do ativo (ex: "Bitcoin", "S&P 500") */
  name: string;
  account: string;
  /** Valor investido (€) */
  value: number;
  /** Data do aporte (YYYY-MM-DD) */
  date: string;
  /** Rentabilidade pontual em € (legado, mantido para compatibilidade) */
  returns: number | null;
  /** Valor atual de mercado (€) — opcional */
  currentValue: number | null;
  /** Última atualização do valor atual (ISO) */
  currentValueUpdatedAt: string | null;
  description: string;
}

export const INVESTMENT_TYPE_LABELS: Record<string, string> = {
  acoes: "Ações",
  etf: "ETFs",
  cripto: "Cripto",
  fundos: "Fundos",
  poupanca: "Poupança",
  outros: "Outros",
};

/** Cor de identificação por tipo (Tailwind class fragment, ex: blue) */
export const INVESTMENT_TYPE_COLORS: Record<string, string> = {
  acoes: "blue",
  etf: "indigo",
  cripto: "purple",
  fundos: "amber",
  poupanca: "emerald",
  outros: "slate",
};
