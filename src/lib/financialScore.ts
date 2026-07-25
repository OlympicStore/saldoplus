import type { FixedExpense, VariableExpense } from "@/types/expense";
import type { Income, SalaryConfig } from "@/types/income";
import type { FinancialGoal } from "@/types/goal";
import { isDateInMonth } from "@/lib/dateOnly";

export interface ScoreBreakdown {
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

interface Input {
  fixedExpenses: FixedExpense[];
  variableExpenses: VariableExpense[];
  incomes: Income[];
  salaryConfigs: SalaryConfig[];
  financialGoals: FinancialGoal[];
  selectedMonth: number;
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

export const calculateFinancialScore = (inp: Input): FinancialScoreResult => {
  const cur = monthTotals(inp.selectedMonth, inp);
  const breakdown: ScoreBreakdown[] = [];
  const suggestions: string[] = [];

  // 1. Taxa de poupança (30 pts)
  const savingsRate = cur.income > 0 ? (cur.income - cur.expenses) / cur.income : 0;
  const savingsPts = Math.max(0, Math.min(30, Math.round(savingsRate * 150)));
  breakdown.push({
    label: "Taxa de poupança",
    points: savingsPts,
    max: 30,
    detail: cur.income > 0 ? `${(savingsRate * 100).toFixed(0)}% do rendimento` : "Sem rendimento registado",
  });
  if (savingsPts < 20 && cur.income > 0) suggestions.push("Tente poupar pelo menos 20% do rendimento mensal.");

  // 2. Cumprimento de fixas (20 pts)
  const fixedRate = cur.fixedAll > 0 ? cur.fixedPaid / cur.fixedAll : 1;
  const fixedPts = Math.round(fixedRate * 20);
  breakdown.push({
    label: "Despesas fixas pagas",
    points: fixedPts,
    max: 20,
    detail: cur.fixedAll > 0 ? `${(fixedRate * 100).toFixed(0)}% pagas` : "Sem fixas este mês",
  });
  if (fixedRate < 1 && cur.fixedAll > 0) suggestions.push("Ainda há despesas fixas por pagar este mês.");

  // 3. Peso das variáveis no rendimento (15 pts)
  const variableShare = cur.income > 0 ? cur.variable / cur.income : 0;
  let varPts = 15;
  if (variableShare > 0.15) varPts = Math.max(0, Math.round(15 - ((variableShare - 0.15) / 0.25) * 15));
  breakdown.push({
    label: "Controlo de variáveis",
    points: varPts,
    max: 15,
    detail: cur.income > 0 ? `${(variableShare * 100).toFixed(0)}% do rendimento` : "—",
  });
  if (varPts < 8) suggestions.push("Despesas variáveis representam uma fatia elevada do rendimento.");

  // 4. Evolução vs média 3 meses (15 pts)
  const monthsBack = [1, 2, 3].map(o => (inp.selectedMonth - o + 12) % 12);
  const prevAvg = monthsBack.reduce((s, m) => s + monthTotals(m, inp).expenses, 0) / 3;
  let evoPts = 8;
  if (prevAvg > 0) {
    const delta = (cur.expenses - prevAvg) / prevAvg;
    if (delta <= -0.05) evoPts = 15;
    else if (delta <= 0.05) evoPts = 12;
    else if (delta <= 0.15) evoPts = 6;
    else evoPts = 0;
  }
  breakdown.push({
    label: "Evolução vs 3 meses",
    points: evoPts,
    max: 15,
    detail: prevAvg > 0 ? `${cur.expenses > prevAvg ? "+" : ""}${(((cur.expenses - prevAvg) / prevAvg) * 100).toFixed(0)}%` : "Sem histórico",
  });
  if (evoPts < 8 && prevAvg > 0) suggestions.push("Gastos acima da média dos últimos 3 meses.");

  // 5. Progresso em metas (10 pts)
  const activeGoals = inp.financialGoals.filter(g => g.currentAmount < g.targetAmount);
  let goalPts = 5;
  if (activeGoals.length > 0) {
    const avgProgress = activeGoals.reduce((s, g) => s + (g.currentAmount / (g.targetAmount || 1)), 0) / activeGoals.length;
    goalPts = Math.min(10, Math.round(avgProgress * 10) + 2);
  } else if (inp.financialGoals.length === 0) {
    goalPts = 0;
    suggestions.push("Defina pelo menos uma meta financeira para acompanhar o progresso.");
  } else {
    goalPts = 10;
  }
  breakdown.push({
    label: "Progresso das metas",
    points: goalPts,
    max: 10,
    detail: activeGoals.length > 0 ? `${activeGoals.length} meta(s) ativa(s)` : inp.financialGoals.length > 0 ? "Todas concluídas" : "Sem metas",
  });

  // 6. Saldo positivo (10 pts)
  const balance = cur.income - cur.expenses;
  const balPts = balance >= 0 ? 10 : Math.max(0, Math.round(10 + (balance / (cur.income || 1)) * 20));
  breakdown.push({
    label: "Saldo do mês",
    points: balPts,
    max: 10,
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
