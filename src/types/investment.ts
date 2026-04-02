export interface Investment {
  id: string;
  type: "acoes" | "poupanca" | "cripto";
  account: string;
  value: number;
  date: string;
  returns: number | null;
  description: string;
}

export const INVESTMENT_TYPE_LABELS: Record<string, string> = {
  acoes: "Ações",
  poupanca: "Poupança",
  cripto: "Cripto",
};
