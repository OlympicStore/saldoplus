import { motion } from "framer-motion";
import { useMemo } from "react";
import { TrendingUp, TrendingDown, Minus, Clock, AlertCircle, Target, ArrowUpRight, ArrowDownRight, Wallet } from "lucide-react";
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, BarChart, Bar, Area, AreaChart } from "recharts";
import type { FixedExpense, VariableExpense } from "@/types/expense";
import type { Income, SalaryConfig } from "@/types/income";
import type { FinancialGoal } from "@/types/goal";
import { TERM_LABELS, TERM_COLORS } from "@/types/goal";
import type { Account } from "@/types/account";
import { isDateInMonth } from "@/lib/dateOnly";
import { FinancialScore } from "@/components/FinancialScore";
import { CoupleMode } from "@/components/CoupleMode";

const personColors = [
  { bar: "bg-person-claudia", bg: "bg-person-claudia-bg", text: "text-person-claudia" },
  { bar: "bg-person-pedro", bg: "bg-person-pedro-bg", text: "text-person-pedro" },
  { bar: "bg-person-costa", bg: "bg-person-costa-bg", text: "text-person-costa" },
];

const CHART_COLORS = [
  "hsl(239, 84%, 67%)", "hsl(38, 92%, 50%)", "hsl(160, 84%, 39%)",
  "hsl(0, 84%, 60%)", "hsl(280, 70%, 55%)", "hsl(200, 80%, 50%)",
  "hsl(330, 70%, 55%)", "hsl(60, 80%, 45%)",
];

const fmt = (v: number) => `€ ${v.toLocaleString("pt-PT", { minimumFractionDigits: 2 })}`;
const MONTH_NAMES_SHORT = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

interface DashboardProps {
  fixedExpenses: FixedExpense[];
  variableExpenses: VariableExpense[];
  incomes: Income[];
  salaryConfigs: SalaryConfig[];
  people: string[];
  selectedMonth: number;
  financialGoals?: FinancialGoal[];
  userPlan?: string;
  accounts?: Account[];
}

export const Dashboard = ({
  fixedExpenses, variableExpenses, incomes, salaryConfigs,
  people, selectedMonth,
  financialGoals = [], userPlan = "essencial", accounts = [],
}: DashboardProps) => {

  // === CALCULATIONS ===
  const getMonthData = (month: number) => {
    const monthVars = variableExpenses.filter((e) => isDateInMonth(e.date, month));
    // Only count PAID fixed expenses in the auto balance
    const totalFixedPaid = fixedExpenses
      .filter(e => e.monthlyPaid[month])
      .reduce((s, e) => s + (e.monthlyValues[month] ?? 0), 0);
    const totalFixedAll = fixedExpenses.reduce((s, e) => s + (e.monthlyValues[month] ?? 0), 0);
    const totalVariable = monthVars.reduce((s, e) => s + e.value, 0);
    const totalExpenses = totalFixedAll;
    const totalExpensesPaid = totalFixedPaid + totalVariable;
    const activeSalaries = salaryConfigs.filter((s) => s.active);
    const configuredSalary = activeSalaries.reduce((s, c) => s + (c.monthlyValues[month] ?? 0), 0);
    const monthIncomesInMonth = incomes.filter((i) => isDateInMonth(i.date, month));
    const salaryEntries = monthIncomesInMonth.filter((i) => i.type === "salary").reduce((s, i) => s + i.value, 0);
    const monthOtherIncome = monthIncomesInMonth.filter((i) => i.type === "other").reduce((s, i) => s + i.value, 0);
    const totalSalary = configuredSalary + salaryEntries;
    const totalIncome = totalSalary + monthOtherIncome;
    return { totalFixed: totalFixedAll, totalFixedPaid, totalVariable, totalExpenses: totalExpenses + totalVariable, totalExpensesPaid, totalIncome, totalSalary, monthOtherIncome, monthVars };
  };

  const current = getMonthData(selectedMonth);
  const prevMonthIdx = selectedMonth === 0 ? 11 : selectedMonth - 1;
  const prev = getMonthData(prevMonthIdx);

  const monthBalance = current.totalIncome - current.totalExpenses;
  const prevBalance = prev.totalIncome - prev.totalExpenses;

  // Auto-calculated balance: account balances + cumulative paid transactions
  // Paid/pending fixed
  const paidFixed = fixedExpenses.filter((e) => e.monthlyPaid[selectedMonth]).reduce((s, e) => s + (e.monthlyValues[selectedMonth] ?? 0), 0);
  const pendingFixed = current.totalFixed - paidFixed;
  const pendingExpenses = fixedExpenses.filter((e) => !e.monthlyPaid[selectedMonth] && (e.monthlyValues[selectedMonth] ?? 0) > 0);
  const nextDue = pendingExpenses.length > 0
    ? pendingExpenses.sort((a, b) => a.dueDay - b.dueDay)[0]
    : null;

  // === ANNUAL AVERAGES ===
  const annualAvg = useMemo(() => {
    let totalExp = 0, totalInc = 0, months = 0;
    for (let m = 0; m < 12; m++) {
      const d = getMonthData(m);
      if (d.totalExpenses > 0 || d.totalIncome > 0) {
        totalExp += d.totalExpenses;
        totalInc += d.totalIncome;
        months++;
      }
    }
    return { expenses: months > 0 ? totalExp / months : 0, income: months > 0 ? totalInc / months : 0 };
  }, [fixedExpenses, variableExpenses, incomes, salaryConfigs]);

  // === COMPARISON VALUES ===
  const expDiff = prev.totalExpenses > 0 ? ((current.totalExpenses - prev.totalExpenses) / prev.totalExpenses) * 100 : 0;
  const incDiff = prev.totalIncome > 0 ? ((current.totalIncome - prev.totalIncome) / prev.totalIncome) * 100 : 0;
  const balDiff = prevBalance !== 0 ? ((monthBalance - prevBalance) / Math.abs(prevBalance)) * 100 : 0;

  // === PIE CHART: Expenses by category ===
  const categoryData = useMemo(() => {
    const cats: Record<string, number> = {};
    // Fixed expenses as one category
    if (current.totalFixed > 0) cats["Despesas Fixas"] = current.totalFixed;
    // Inevitáveis + Não-essenciais by category
    current.monthVars.forEach((e) => {
      cats[e.category] = (cats[e.category] || 0) + e.value;
    });
    return Object.entries(cats).map(([name, value]) => ({ name, value })).filter(d => d.value > 0);
  }, [current]);

  // === LINE CHART: Balance evolution ===
  const lineData = useMemo(() => {
    const data: { name: string; saldo: number }[] = [];
    let cumulative = 0;
    for (let m = 0; m <= 11; m++) {
      const d = getMonthData(m);
      cumulative += d.totalIncome - d.totalExpenses;
      data.push({ name: MONTH_NAMES_SHORT[m], saldo: cumulative });
    }
    return data;
  }, [fixedExpenses, variableExpenses, incomes, salaryConfigs]);

  // Person breakdown
  const perPersonDetails = (person: string) => {
    const fixedPaid = fixedExpenses
      .filter((e) => e.monthlyResponsible[selectedMonth] === person && e.monthlyPaid[selectedMonth])
      .reduce((s, e) => s + (e.monthlyValues[selectedMonth] ?? 0), 0);
    const fixedOwed = fixedExpenses
      .filter((e) => e.monthlyResponsible[selectedMonth] === person && !e.monthlyPaid[selectedMonth])
      .reduce((s, e) => s + (e.monthlyValues[selectedMonth] ?? 0), 0);
    const variable = current.monthVars.filter((e) => e.responsible === person).reduce((s, e) => s + e.value, 0);
    return { totalPaid: fixedPaid + variable, totalOwed: fixedOwed, total: fixedPaid + variable + fixedOwed };
  };

  const fairShare = current.totalExpenses / (people.length || 1);
  const personBalances = people.map((person) => {
    const details = perPersonDetails(person);
    return { person, paid: details.totalPaid, owes: details.totalOwed, diff: details.totalPaid - fairShare };
  });



  const ComparisonBadge = ({ current: c, previous: p, inverted = false }: { current: number; previous: number; inverted?: boolean }) => {
    if (p === 0 && c === 0) return null;
    if (p === 0) return null;
    const diff = ((c - p) / Math.abs(p)) * 100;
    const isUp = diff > 1;
    const isDown = diff < -1;
    const good = inverted ? isUp : isDown;
    const bad = inverted ? isDown : isUp;
    return (
      <span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${
        bad ? "bg-[hsl(var(--status-negative)/0.1)] text-status-negative" :
        good ? "bg-[hsl(var(--status-paid)/0.1)] text-status-paid" :
        "bg-secondary text-text-muted"
      }`}>
        {isUp ? <TrendingUp className="h-3 w-3" /> : isDown ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
        {Math.abs(diff).toFixed(0)}%
      </span>
    );
  };

  const DiffValue = ({ current: c, previous: p }: { current: number; previous: number }) => {
    const diff = c - p;
    if (Math.abs(diff) < 0.01) return null;
    return (
      <span className={`text-[10px] font-mono ${diff > 0 ? "text-status-negative" : "text-status-paid"}`}>
        {diff > 0 ? "+" : ""}{fmt(diff)} vs anterior
      </span>
    );
  };

  return (
    <motion.div initial={{ opacity: 0, x: 4 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.25 }} className="space-y-6">

      {/* Hero row: Balanço + Entradas + Saídas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Balanço - Hero emerald card */}
        <div className="relative overflow-hidden rounded-3xl p-6 text-white shadow-xl shadow-emerald-200/40"
          style={{ background: "linear-gradient(135deg, hsl(160 84% 32%) 0%, hsl(160 84% 39%) 60%, hsl(158 74% 44%) 100%)" }}>
          <div className="relative z-10">
            <div className="flex items-center gap-2 text-emerald-50/90">
              <Wallet className="h-4 w-4" />
              <p className="text-xs font-semibold uppercase tracking-wider">Balanço do Mês</p>
            </div>
            <p className={`font-display text-3xl sm:text-4xl font-bold tabular-nums mt-3 ${monthBalance >= 0 ? "text-white" : "text-white"}`}>
              {monthBalance >= 0 ? "+" : "−"}{fmt(Math.abs(monthBalance)).replace("€ ", "€")}
            </p>
            <div className="mt-4 flex items-center gap-2 flex-wrap">
              {prevBalance !== 0 && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-white/20 backdrop-blur-sm px-2.5 py-1 rounded-full">
                  {balDiff >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {balDiff >= 0 ? "+" : ""}{balDiff.toFixed(1)}%
                </span>
              )}
              <span className="text-[11px] text-emerald-50/80">vs mês anterior</span>
            </div>
          </div>
          <div className="absolute -right-6 -bottom-6 w-40 h-40 bg-white/10 rounded-full" />
          <div className="absolute right-8 -top-8 w-24 h-24 bg-white/5 rounded-full" />
        </div>

        {/* Entradas */}
        <div className="rounded-3xl p-6 bg-surface border border-border-subtle/60 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-2xl bg-[hsl(var(--status-paid)/0.12)] flex items-center justify-center text-status-paid">
              <ArrowUpRight className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">Entradas</p>
              <p className="font-display text-2xl font-bold text-foreground tabular-nums leading-tight">{fmt(current.totalIncome)}</p>
            </div>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-text-muted">Salários {fmt(current.totalSalary)}</span>
            <ComparisonBadge current={current.totalIncome} previous={prev.totalIncome} inverted />
          </div>
        </div>

        {/* Saídas */}
        <div className="rounded-3xl p-6 bg-surface border border-border-subtle/60 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-2xl bg-[hsl(var(--status-negative)/0.12)] flex items-center justify-center text-status-negative">
              <ArrowDownRight className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">Saídas</p>
              <p className="font-display text-2xl font-bold text-foreground tabular-nums leading-tight">{fmt(current.totalExpenses)}</p>
            </div>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-text-muted">Fixos {fmt(current.totalFixed)}</span>
            <ComparisonBadge current={current.totalExpenses} previous={prev.totalExpenses} />
          </div>
        </div>
      </div>

      {/* Score + Modo Casal */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <FinancialScore
          fixedExpenses={fixedExpenses}
          variableExpenses={variableExpenses}
          incomes={incomes}
          salaryConfigs={salaryConfigs}
          financialGoals={financialGoals}
          selectedMonth={selectedMonth}
        />
        <CoupleMode
          fixedExpenses={fixedExpenses}
          variableExpenses={variableExpenses}
          incomes={incomes}
          salaryConfigs={salaryConfigs}
          people={people}
          selectedMonth={selectedMonth}
        />
      </div>

      {/* Chart row: Evolução saldo (2/3) + Categorias donut (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        <div className="lg:col-span-2 rounded-3xl bg-surface border border-border-subtle/60 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-display text-lg font-bold text-foreground">Evolução do Saldo</h3>
              <p className="text-xs text-text-muted mt-0.5">Saldo acumulado ao longo do ano</p>
            </div>
            <span className="text-[11px] font-semibold text-status-paid bg-[hsl(var(--status-paid)/0.1)] px-2.5 py-1 rounded-full">Anual</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={lineData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="saldoGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0.28} />
                  <stop offset="100%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 32%, 91%)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(215, 16%, 57%)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(215, 16%, 57%)" }} tickFormatter={(v) => `€${v}`} width={55} axisLine={false} tickLine={false} />
              <Tooltip formatter={(value: number) => fmt(value)} contentStyle={{ fontSize: 12, borderRadius: 12, border: "1px solid hsl(214, 32%, 91%)", boxShadow: "0 4px 12px rgba(0,0,0,0.06)" }} />
              <Area type="monotone" dataKey="saldo" stroke="hsl(160, 84%, 39%)" strokeWidth={2.5} fill="url(#saldoGradient)" dot={{ r: 3, fill: "hsl(160, 84%, 39%)", strokeWidth: 0 }} activeDot={{ r: 6, strokeWidth: 2, stroke: "#fff" }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-3xl bg-surface border border-border-subtle/60 shadow-sm p-6">
          <h3 className="font-display text-lg font-bold text-foreground mb-4">Gastos por Categoria</h3>
          {categoryData.length > 0 ? (
            <div className="flex flex-col items-center">
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={72} innerRadius={48} paddingAngle={3}>
                    {categoryData.map((_, idx) => (
                      <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => fmt(value)} contentStyle={{ fontSize: 12, borderRadius: 12, border: "1px solid hsl(214, 32%, 91%)" }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="w-full mt-3 space-y-2">
                {categoryData.slice(0, 4).map((d, i) => (
                  <div key={d.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                      <span className="text-text-muted truncate">{d.name}</span>
                    </div>
                    <span className="font-mono font-semibold text-foreground tabular-nums">{fmt(d.value)}</span>
                  </div>
                ))}
                {categoryData.length > 4 && (
                  <p className="text-[10px] text-text-muted text-center pt-1">+{categoryData.length - 4} categorias</p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-text-muted text-center py-12">Sem gastos neste mês</p>
          )}
        </div>
      </div>

      {/* Média Anual + Contas Pendentes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="rounded-3xl bg-surface border border-border-subtle/60 shadow-sm p-6">
          <h3 className="font-display text-base font-bold text-foreground mb-4">Média Anual</h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-text-muted mb-1">Gastos/mês</p>
              <p className="font-display text-lg font-bold text-status-negative tabular-nums">{fmt(annualAvg.expenses)}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-text-muted mb-1">Entradas/mês</p>
              <p className="font-display text-lg font-bold text-status-paid tabular-nums">{fmt(annualAvg.income)}</p>
            </div>
          </div>
          <div className="pt-4 border-t border-border-subtle/60">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-text-muted mb-1">Poupança média/mês</p>
            <p className={`font-display text-xl font-bold tabular-nums ${annualAvg.income - annualAvg.expenses >= 0 ? "text-status-paid" : "text-status-negative"}`}>
              {fmt(annualAvg.income - annualAvg.expenses)}
            </p>
          </div>
        </div>

        <div className="rounded-3xl bg-surface border border-border-subtle/60 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-base font-bold text-foreground">Contas Pendentes</h3>
            <span className="text-[11px] font-bold text-status-pending bg-[hsl(var(--status-pending)/0.12)] px-2.5 py-1 rounded-full">
              {pendingExpenses.length}/{fixedExpenses.length}
            </span>
          </div>
          <p className="font-display text-2xl font-bold text-status-pending tabular-nums mb-4">{fmt(pendingFixed)}</p>
          {nextDue ? (
            <div className="flex items-center gap-3 p-3 bg-background rounded-2xl border border-border-subtle/60">
              <div className="h-10 w-10 rounded-2xl bg-[hsl(var(--status-pending)/0.12)] flex items-center justify-center shrink-0">
                <Clock className="h-5 w-5 text-status-pending" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">Próxima: {nextDue.item}</p>
                <p className="text-xs text-text-muted">Dia {nextDue.dueDay} · {fmt(nextDue.monthlyValues[selectedMonth] ?? 0)}</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 p-3 bg-[hsl(var(--status-paid)/0.08)] rounded-2xl">
              <AlertCircle className="h-4 w-4 text-status-paid" />
              <p className="text-sm text-status-paid font-medium">Todas as contas pagas!</p>
            </div>
          )}
        </div>
      </div>


      {/* Comparação com mês anterior */}
      <div className="rounded-3xl bg-surface border border-border-subtle/60 shadow-sm p-6">
        <h3 className="font-display text-base font-bold text-foreground mb-4">Comparação com Mês Anterior</h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <span className="text-xs text-text-muted">Entradas</span>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-base sm:text-lg font-semibold text-foreground font-mono tabular-nums">{fmt(current.totalIncome)}</p>
              {(() => {
                if (prev.totalIncome === 0 && current.totalIncome === 0) return null;
                const pct = prev.totalIncome > 0 ? ((current.totalIncome - prev.totalIncome) / prev.totalIncome) * 100 : 0;
                const isUp = pct > 1;
                return pct !== 0 ? (
                  <span className={`text-xs font-semibold flex items-center gap-0.5 ${isUp ? "text-status-paid" : "text-status-negative"}`}>
                    {isUp ? "↑" : "↓"} {isUp ? "+" : ""}{pct.toFixed(0)}%
                  </span>
                ) : null;
              })()}
            </div>
          </div>
          <div>
            <span className="text-xs text-text-muted">Saídas</span>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-base sm:text-lg font-semibold text-foreground font-mono tabular-nums">{fmt(current.totalExpenses)}</p>
              {(() => {
                if (prev.totalExpenses === 0 && current.totalExpenses === 0) return null;
                const pct = prev.totalExpenses > 0 ? ((current.totalExpenses - prev.totalExpenses) / prev.totalExpenses) * 100 : 0;
                const isDown = pct < -1;
                return pct !== 0 ? (
                  <span className={`text-xs font-semibold flex items-center gap-0.5 ${isDown ? "text-status-paid" : "text-status-negative"}`}>
                    {pct > 0 ? "↑" : "↓"} {pct > 0 ? "+" : ""}{pct.toFixed(0)}%
                  </span>
                ) : null;
              })()}
            </div>
          </div>
          <div>
            <span className="text-xs text-text-muted">Fixos</span>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-base sm:text-lg font-semibold text-foreground font-mono tabular-nums">{fmt(current.totalFixed)}</p>
              <ComparisonBadge current={current.totalFixed} previous={prev.totalFixed} />
            </div>
          </div>
          <div>
            <span className="text-xs text-text-muted">Variáveis</span>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-base sm:text-lg font-semibold text-foreground font-mono tabular-nums">{fmt(current.totalVariable)}</p>
              <ComparisonBadge current={current.totalVariable} previous={prev.totalVariable} />
            </div>
          </div>
        </div>
      </div>

      {/* Metas financeiras - resumo (read-only) - hidden for essencial */}
      {financialGoals.length > 0 && userPlan !== "essencial" && (
        <div className="rounded-3xl bg-surface border border-border-subtle/60 shadow-sm p-6">
          <h3 className="font-display text-base font-bold text-foreground mb-4">Metas Financeiras</h3>
          <div className="space-y-3">
            {financialGoals.slice(0, 5).map((goal) => {
              const pct = goal.totalValue > 0 ? Math.min((goal.currentValue / goal.totalValue) * 100, 100) : 0;
              const colors = TERM_COLORS[goal.term];
              return (
                <div key={goal.id}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <Target className={`h-3.5 w-3.5 ${colors.text}`} />
                      <span className="text-sm font-medium text-foreground">{goal.name}</span>
                    </div>
                    <span className="text-xs font-mono text-text-muted tabular-nums">
                      {fmt(goal.currentValue)} / {fmt(goal.totalValue)}
                    </span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.6 }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: colors.accent }}
                    />
                  </div>
                  <p className="text-[10px] text-text-muted mt-0.5 text-right">{pct.toFixed(0)}%</p>
                </div>
              );
            })}
            {financialGoals.length > 5 && (
              <p className="text-xs text-text-muted text-center">+{financialGoals.length - 5} metas na secção Metas</p>
            )}
          </div>
        </div>
      )}

      {/* Pro: Gráfico de gastos e rendimentos por categoria */}
      {userPlan === "pro" && (
        <div className="rounded-3xl bg-surface border border-border-subtle/60 shadow-sm p-6">
          <h3 className="font-display text-base font-bold text-foreground mb-4">Gastos vs Rendimentos por Categoria</h3>
          {(() => {
            const catData: { name: string; gastos: number; rendimentos: number }[] = [];
            // Fixed as category
            if (current.totalFixed > 0) catData.push({ name: "Fixos", gastos: current.totalFixed, rendimentos: 0 });
            // Variable by category
            const varCats: Record<string, number> = {};
            current.monthVars.forEach((e) => { varCats[e.category] = (varCats[e.category] || 0) + e.value; });
            Object.entries(varCats).forEach(([cat, val]) => catData.push({ name: cat, gastos: val, rendimentos: 0 }));
            // Income categories
            if (current.totalSalary > 0) {
              const existing = catData.find(d => d.name === "Salários");
              if (existing) existing.rendimentos = current.totalSalary;
              else catData.push({ name: "Salários", gastos: 0, rendimentos: current.totalSalary });
            }
            if (current.monthOtherIncome > 0) {
              catData.push({ name: "Outros Rend.", gastos: 0, rendimentos: current.monthOtherIncome });
            }

            if (catData.length === 0) return <p className="text-sm text-text-muted text-center py-6">Sem dados neste mês</p>;

            return (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={catData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 32%, 91%)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(215, 16%, 57%)" }} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(215, 16%, 57%)" }} tickFormatter={(v) => `€${v}`} width={60} />
                  <Tooltip formatter={(value: number) => fmt(value)} contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(214, 32%, 91%)" }} />
                  <Bar dataKey="gastos" name="Gastos" fill="hsl(0, 84%, 60%)" radius={[4, 4, 0, 0]} barSize={20} />
                  <Bar dataKey="rendimentos" name="Rendimentos" fill="hsl(160, 84%, 39%)" radius={[4, 4, 0, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            );
          })()}
        </div>
      )}

      {/* Divisão por pessoa */}
      <div className="rounded-3xl bg-surface border border-border-subtle/60 shadow-sm p-6">
        <h3 className="font-display text-base font-bold text-foreground mb-1">Divisão por Pessoa</h3>
        <p className="text-xs text-text-muted mb-4">Quota justa: {fmt(fairShare)} por pessoa</p>
        <div className="space-y-5">
          {people.map((person, i) => {
            const details = perPersonDetails(person);
            const pb = personBalances.find((b) => b.person === person)!;
            const colors = personColors[i % personColors.length];
            const maxVal = Math.max(...people.map((p) => perPersonDetails(p).total), 1);
            const pct = (details.total / maxVal) * 100;
            return (
              <div key={person}>
                <div className="flex items-center gap-2 sm:gap-3 mb-2">
                  <span className={`px-2 sm:px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-medium w-14 sm:w-20 text-center shrink-0 ${colors.bg} ${colors.text} truncate`}>{person}</span>
                  <div className="flex-1 min-w-0 h-3 bg-background rounded-full overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.5, ease: "easeOut" }}
                      className={`h-full rounded-full ${colors.bar}`} />
                  </div>
                  <span className="font-mono text-[11px] sm:text-sm text-foreground tabular-nums text-right shrink-0 font-semibold">{fmt(details.total)}</span>
                </div>
                <div className="ml-0 sm:ml-[92px] sm:pl-2 flex flex-wrap gap-x-3 sm:gap-x-4 gap-y-1">
                  <span className="text-[11px] sm:text-xs text-text-muted">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-status-paid mr-1 align-middle" />
                    Pagou: {fmt(details.totalPaid)}
                  </span>
                  <span className="text-[11px] sm:text-xs text-text-muted">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-status-pending mr-1 align-middle" />
                    Deve: {fmt(details.totalOwed)}
                  </span>
                  <span className={`text-[11px] sm:text-xs font-semibold ${pb.diff >= 0 ? "text-status-paid" : "text-status-negative"}`}>
                    {pb.diff >= 0 ? `Pagou ${fmt(pb.diff)} a mais` : `Falta pagar ${fmt(Math.abs(pb.diff))}`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </motion.div>
  );
};
