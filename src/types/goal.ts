export type GoalTerm = "short" | "medium" | "long";

export type AccountType = "poupanca" | "investimento" | "principal";

export interface FinancialGoal {
  id: string;
  name: string;
  term: GoalTerm;
  totalValue: number;
  deadlineMonths: number;
  currentValue: number;
  monthlySavings: number;
  account?: AccountType;
}

export const ACCOUNT_LABELS: Record<AccountType, string> = {
  poupanca: "Poupança",
  investimento: "Investimento",
  principal: "Conta Principal",
};

export const TERM_LABELS: Record<GoalTerm, string> = {
  short: "Curto Prazo",
  medium: "Médio Prazo",
  long: "Longo Prazo",
};

export const TERM_COLORS: Record<GoalTerm, { bg: string; text: string; bar: string; accent: string }> = {
  short: { bg: "bg-status-pending/10", text: "text-status-pending", bar: "bg-status-pending", accent: "hsl(var(--status-pending))" },
  medium: { bg: "bg-accent/10", text: "text-accent", bar: "bg-accent", accent: "hsl(var(--accent))" },
  long: { bg: "bg-primary/10", text: "text-primary", bar: "bg-primary", accent: "hsl(var(--primary))" },
};
