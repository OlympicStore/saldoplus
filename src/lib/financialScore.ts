import type { FixedExpense, VariableExpense } from "@/types/expense";
import type { Income, SalaryConfig } from "@/types/income";
import type { FinancialGoal } from "@/types/goal";
import { isDateInMonth } from "@/lib/dateOnly";

export interface ScoreBreakdown {
  key: ScoreCriterionKey;
  label: string;
  points: number;
  max: number;
  detail: string;
}

export interface FinancialScoreResult {
  score: number;
  classification: string;
  color: string;
  breakdown: ScoreBreakdown[];
  suggestions: string[];
}

export type ScoreCriterionKey = "savings" | "fixedPaid" | "variables" | "evolution" | "goals" | "balance";

export type ScoreWeights = Record<ScoreCriterionKey, number>;

export const DEFAULT_WEIGHTS: ScoreWeights = {
  savings: 30,
  fixedPaid: 20,
  variables: 15,
  evolution: 15,
  goals: 10,
  balance: 10,
};

export const CRITERION_LABELS: Record<ScoreCriterionKey, { label: string; hint: string }> = {
  savings: { label: "Taxa de poupança", hint: "% do rendimento que sobra no mês" },
  fixedPaid: { label: "Despesas fixas pagas", hint: "Cumprimento das obrigações fixas" },
  variables: { label: "Controlo de variáveis", hint: "Peso das despesas variáveis no rendimento" },
  evolution: { label: "Evolução vs 3 meses", hint: "Comparação com a média recente" },
  goals: { label: "Progresso das metas", hint: "Avanço médio nas metas ativas" },
  balance: { label: "Saldo do mês", hint: "Se o mês fecha positivo ou negativo" },
};

interface Input {
  fixedExpenses: FixedExpense[];
  variableExpenses: VariableExpense[];
  incomes: Income[];
  salaryConfigs: SalaryConfig[];
  financialGoals: FinancialGoal[];
  selectedMonth: number;
  weights?: ScoreWeights;
}

const monthTotals = (m: number, inp: Input) => {
  const fixedAll = inp.fixedExpenses.reduce((s, e) => s + (e.monthlyValues[m] ?? 0), 0);
  const fixedPaid = inp.fixedExpenses.filter(e => e.monthlyPaid[m]).reduce((s, e) => s + (e.monthlyValues[m] ?? 0), 0);
  const variable = inp.variableExpenses.filter(e => isDateInMonth(e.date, m)).reduce((s, e) => s + e.value, 0);
  const salary = inp.salaryConfigs.filter(s => s.active).reduce((s, c) => s + (c.monthlyValues[m] ?? 0), 0);
  const incomesInMonth = inp.incomes.filter(i => isDateInMonth(i.date, m));
  const salaryEntries = incomesInMonth.filter(i => i.type === "salary").reduce((s, i) => s + i.value, 0);
  const other = incomesInMonth.filter(i => i.type === "other").reduce((s, i) => s + i.value, 0);
  const income = salary + salaryEntries + other;
  const expenses = fixedAll + variable;
  return { fixedAll, fixedPaid, variable, income, expenses };
};

export const normalizeWeights = (w: Partial<ScoreWeights>): ScoreWeights => {
  const merged: ScoreWeights = { ...DEFAULT_WEIGHTS, ...w };
  const sum = Object.values(merged).reduce((s, v) => s + Math.max(0, v), 0);
  if (sum === 0) return { ...DEFAULT_WEIGHTS };
  const factor = 100 / sum;
  return Object.fromEntries(
    Object.entries(merged).map(([k, v]) => [k, Math.max(0, v) * factor])
  ) as ScoreWeights;
};

export const calculateFinancialScore = (inp: Input): FinancialScoreResult => {
  const cur = monthTotals(inp.selectedMonth, inp);
  const weights = normalizeWeights(inp.weights ?? DEFAULT_WEIGHTS);
  const breakdown: ScoreBreakdown[] = [];
  const suggestions: string[] = [];

  // 1. Taxa de poupança — ratio 0..1 = clamp(savingsRate / 0.20, 0, 1)
  const savingsRate = cur.income > 0 ? (cur.income - cur.expenses) / cur.income : 0;
  const savingsRatio = Math.max(0, Math.min(1, savingsRate / 0.2));
  breakdown.push({
    key: "savings",
    label: CRITERION_LABELS.savings.label,
    points: Math.round(savingsRatio * weights.savings),
    max: Math.round(weights.savings),
    detail: cur.income > 0 ? `${(savingsRate * 100).toFixed(0)}% do rendimento` : "Sem rendimento registado",
  });
  if (savingsRatio < 0.7 && cur.income > 0) suggestions.push("Tente poupar pelo menos 20% do rendimento mensal.");

  // 2. Cumprimento de fixas
  const fixedRatio = cur.fixedAll > 0 ? cur.fixedPaid / cur.fixedAll : 1;
  breakdown.push({
    key: "fixedPaid",
    label: CRITERION_LABELS.fixedPaid.label,
    points: Math.round(fixedRatio * weights.fixedPaid),
    max: Math.round(weights.fixedPaid),
    detail: cur.fixedAll > 0 ? `${(fixedRatio * 100).toFixed(0)}% pagas` : "Sem fixas este mês",
  });
  if (fixedRatio < 1 && cur.fixedAll > 0) suggestions.push("Ainda há despesas fixas por pagar este mês.");

  // 3. Variáveis — ratio 1 if <=15%, 0 if >=40%
  const variableShare = cur.income > 0 ? cur.variable / cur.income : 0;
  let varRatio = 1;
  if (variableShare > 0.15) varRatio = Math.max(0, 1 - (variableShare - 0.15) / 0.25);
  breakdown.push({
    key: "variables",
    label: CRITERION_LABELS.variables.label,
    points: Math.round(varRatio * weights.variables),
    max: Math.round(weights.variables),
    detail: cur.income > 0 ? `${(variableShare * 100).toFixed(0)}% do rendimento` : "—",
  });
  if (varRatio < 0.5) suggestions.push("Despesas variáveis representam uma fatia elevada do rendimento.");

  // 4. Evolução vs média 3 meses
  const monthsBack = [1, 2, 3].map(o => (inp.selectedMonth - o + 12) % 12);
  const prevAvg = monthsBack.reduce((s, m) => s + monthTotals(m, inp).expenses, 0) / 3;
  let evoRatio = 0.5;
  if (prevAvg > 0) {
    const delta = (cur.expenses - prevAvg) / prevAvg;
    if (delta <= -0.05) evoRatio = 1;
    else if (delta <= 0.05) evoRatio = 0.8;
    else if (delta <= 0.15) evoRatio = 0.4;
    else evoRatio = 0;
  }
  breakdown.push({
    key: "evolution",
    label: CRITERION_LABELS.evolution.label,
    points: Math.round(evoRatio * weights.evolution),
    max: Math.round(weights.evolution),
    detail: prevAvg > 0 ? `${cur.expenses > prevAvg ? "+" : ""}${(((cur.expenses - prevAvg) / prevAvg) * 100).toFixed(0)}%` : "Sem histórico",
  });
  if (evoRatio < 0.5 && prevAvg > 0) suggestions.push("Gastos acima da média dos últimos 3 meses.");

  // 5. Metas
  const activeGoals = inp.financialGoals.filter(g => g.currentValue < g.totalValue);
  let goalRatio = 0.5;
  if (activeGoals.length > 0) {
    const avgProgress = activeGoals.reduce((s, g) => s + (g.currentValue / (g.totalValue || 1)), 0) / activeGoals.length;
    goalRatio = Math.min(1, avgProgress + 0.2);
  } else if (inp.financialGoals.length === 0) {
    goalRatio = 0;
    suggestions.push("Defina pelo menos uma meta financeira para acompanhar o progresso.");
  } else {
    goalRatio = 1;
  }
  breakdown.push({
    key: "goals",
    label: CRITERION_LABELS.goals.label,
    points: Math.round(goalRatio * weights.goals),
    max: Math.round(weights.goals),
    detail: activeGoals.length > 0 ? `${activeGoals.length} meta(s) ativa(s)` : inp.financialGoals.length > 0 ? "Todas concluídas" : "Sem metas",
  });

  // 6. Saldo positivo
  const balance = cur.income - cur.expenses;
  const balRatio = balance >= 0 ? 1 : Math.max(0, 1 + (balance / (cur.income || 1)) * 2);
  breakdown.push({
    key: "balance",
    label: CRITERION_LABELS.balance.label,
    points: Math.round(balRatio * weights.balance),
    max: Math.round(weights.balance),
    detail: balance >= 0 ? "Positivo" : "Negativo",
  });
  if (balance < 0) suggestions.push("O mês está a fechar em défice — reveja despesas não-essenciais.");

  const score = breakdown.reduce((s, b) => s + b.points, 0);

  let classification = "Excelente";
  let color = "hsl(160, 84%, 39%)";
  if (score < 40) { classification = "Precisa atenção"; color = "hsl(0, 84%, 60%)"; }
  else if (score < 60) { classification = "Razoável"; color = "hsl(38, 92%, 50%)"; }
  else if (score < 80) { classification = "Bom"; color = "hsl(200, 80%, 50%)"; }

  return { score, classification, color, breakdown, suggestions: suggestions.slice(0, 3) };
};
