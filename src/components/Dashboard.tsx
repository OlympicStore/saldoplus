import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { TrendingUp, TrendingDown, Minus, Clock, AlertCircle, Pencil, Check, X, Target } from "lucide-react";
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, BarChart, Bar } from "recharts";
import type { FixedExpense, VariableExpense } from "@/types/expense";
import type { Income, SalaryConfig } from "@/types/income";
import type { FinancialGoal } from "@/types/goal";
import { TERM_LABELS, TERM_COLORS } from "@/types/goal";
import type { Account } from "@/types/account";

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
  currentBalance: number;
  onUpdateBalance: (v: number) => void;
  financialGoals?: FinancialGoal[];
  userPlan?: string;
  accounts?: Account[];
}

export const Dashboard = ({
  fixedExpenses, variableExpenses, incomes, salaryConfigs,
  people, selectedMonth, currentBalance, onUpdateBalance,
  financialGoals = [], userPlan = "essencial", accounts = [],
}: DashboardProps) => {
  const [editingBalance, setEditingBalance] = useState(false);
  const [editBalanceVal, setEditBalanceVal] = useState("");

  // === CALCULATIONS ===
  const getMonthData = (month: number) => {
    const monthVars = variableExpenses.filter((e) => new Date(e.date).getMonth() === month);
    const totalFixed = fixedExpenses.reduce((s, e) => s + (e.monthlyValues[month] ?? 0), 0);
    const totalVariable = monthVars.reduce((s, e) => s + e.value, 0);
    const totalExpenses = totalFixed + totalVariable;
    const activeSalaries = salaryConfigs.filter((s) => s.active);
    const totalSalary = activeSalaries.reduce((s, c) => s + (c.monthlyValues[month] ?? 0), 0);
    const monthOtherIncome = incomes.filter((i) => new Date(i.date).getMonth() === month && i.type === "other").reduce((s, i) => s + i.value, 0);
    const totalIncome = totalSalary + monthOtherIncome;
    return { totalFixed, totalVariable, totalExpenses, totalIncome, totalSalary, monthOtherIncome, monthVars };
  };

  const current = getMonthData(selectedMonth);
  const prevMonthIdx = selectedMonth === 0 ? 11 : selectedMonth - 1;
  const prev = getMonthData(prevMonthIdx);

  const monthBalance = current.totalIncome - current.totalExpenses;
  const prevBalance = prev.totalIncome - prev.totalExpenses;

  // Auto-calculated balance (cumulative from month 0)
  const autoBalance = useMemo(() => {
    let cumulative = 0;
    for (let m = 0; m <= selectedMonth; m++) {
      const d = getMonthData(m);
      cumulative += d.totalIncome - d.totalExpenses;
    }
    return cumulative;
  }, [selectedMonth, fixedExpenses, variableExpenses, incomes, salaryConfigs]);

  // Use manual override if set, otherwise auto-calculated
  const displayBalance = currentBalance !== 0 ? currentBalance : autoBalance;

  const startEditBalance = () => {
    setEditBalanceVal(displayBalance.toFixed(2).replace(".", ","));
    setEditingBalance(true);
  };
  const saveBalance = () => {
    const num = parseFloat(editBalanceVal.replace(",", "."));
    if (!isNaN(num)) onUpdateBalance(num);
    setEditingBalance(false);
  };

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
    if (current.totalFixed > 0) cats["Gastos Fixos"] = current.totalFixed;
    // Variable by category
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
    <motion.div initial={{ opacity: 0, x: 4 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.2 }}>
      {/* Saldo acumulado (editável) */}
      <div className="text-center mb-6">
        <span className="label-caps">Saldo Acumulado</span>
        {editingBalance ? (
          <div className="flex items-center justify-center gap-2 mt-1">
            <input
              autoFocus
              value={editBalanceVal}
              onChange={(e) => setEditBalanceVal(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && saveBalance()}
              className="w-40 text-2xl font-semibold font-mono text-center bg-background border border-primary rounded-lg px-3 py-1 focus:outline-none"
            />
            <button onClick={saveBalance} className="text-status-paid"><Check className="h-5 w-5" /></button>
            <button onClick={() => setEditingBalance(false)} className="text-text-muted"><X className="h-5 w-5" /></button>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2 mt-1">
            <p className={`display-value ${displayBalance >= 0 ? "text-foreground" : "text-status-negative"}`}>
              {fmt(displayBalance)}
            </p>
            <button onClick={startEditBalance} className="text-text-muted hover:text-foreground transition-colors">
              <Pencil className="h-4 w-4" />
            </button>
          </div>
        )}
        <p className="text-xs text-text-muted mt-1">
          {currentBalance !== 0 ? "Valor editado manualmente" : "Calculado automaticamente"}
          {currentBalance !== 0 && (
            <button onClick={() => onUpdateBalance(0)} className="ml-2 underline hover:text-foreground">repor automático</button>
          )}
        </p>
      </div>

      {/* Resumo do mês */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-surface rounded-xl shadow-card border border-border-subtle/60 p-5">
          <div className="flex items-center justify-between">
            <span className="label-caps">Entradas do Mês</span>
            <ComparisonBadge current={current.totalIncome} previous={prev.totalIncome} inverted />
          </div>
          <p className="text-xl sm:text-2xl font-semibold text-status-paid font-mono tabular-nums tracking-tight mt-1">
            {fmt(current.totalIncome)}
          </p>
          <div className="flex flex-col gap-1 mt-2">
            <div className="flex gap-3 flex-wrap text-xs text-text-muted">
              <span>Salários: {fmt(current.totalSalary)}</span>
              <span>Outros: {fmt(current.monthOtherIncome)}</span>
            </div>
            <DiffValue current={current.totalIncome} previous={prev.totalIncome} />
          </div>
        </div>
        <div className="bg-surface rounded-xl shadow-card border border-border-subtle/60 p-5">
          <div className="flex items-center justify-between">
            <span className="label-caps">Saídas do Mês</span>
            <ComparisonBadge current={current.totalExpenses} previous={prev.totalExpenses} />
          </div>
          <p className="text-xl sm:text-2xl font-semibold text-status-negative font-mono tabular-nums tracking-tight mt-1">
            {fmt(current.totalExpenses)}
          </p>
          <div className="flex flex-col gap-1 mt-2">
            <div className="flex gap-3 flex-wrap text-xs text-text-muted">
              <span>Fixos: {fmt(current.totalFixed)}</span>
              <span>Variáveis: {fmt(current.totalVariable)}</span>
            </div>
            <DiffValue current={current.totalExpenses} previous={prev.totalExpenses} />
          </div>
        </div>
        <div className="bg-surface rounded-xl shadow-card border border-border-subtle/60 p-5">
          <div className="flex items-center justify-between">
            <span className="label-caps">Balanço do Mês</span>
            <ComparisonBadge current={monthBalance} previous={prevBalance} inverted />
          </div>
          <p className={`text-xl sm:text-2xl font-semibold font-mono tabular-nums tracking-tight mt-1 ${monthBalance >= 0 ? "text-status-paid" : "text-status-negative"}`}>
            {monthBalance >= 0 ? "+" : ""}{fmt(monthBalance)}
          </p>
          <div className="flex flex-col gap-1 mt-2">
            <p className="text-xs text-text-muted">{monthBalance >= 0 ? "Sobra" : "Falta"} este mês</p>
            <DiffValue current={monthBalance} previous={prevBalance} />
          </div>
        </div>
      </div>

      {/* Média Anual + Contas Pendentes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="bg-surface rounded-xl shadow-card border border-border-subtle/60 p-5">
          <span className="label-caps mb-3 block">Média Anual</span>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-text-muted mb-1">Gastos/mês</p>
              <p className="text-lg font-semibold text-status-negative font-mono tabular-nums">{fmt(annualAvg.expenses)}</p>
            </div>
            <div>
              <p className="text-xs text-text-muted mb-1">Rendimentos/mês</p>
              <p className="text-lg font-semibold text-status-paid font-mono tabular-nums">{fmt(annualAvg.income)}</p>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-border-subtle/60">
            <p className="text-xs text-text-muted">Poupança média/mês</p>
            <p className={`text-lg font-semibold font-mono tabular-nums ${annualAvg.income - annualAvg.expenses >= 0 ? "text-status-paid" : "text-status-negative"}`}>
              {fmt(annualAvg.income - annualAvg.expenses)}
            </p>
          </div>
        </div>

        <div className="bg-surface rounded-xl shadow-card border border-border-subtle/60 p-5">
          <span className="label-caps mb-3 block">Contas Pendentes</span>
          <div className="flex items-center gap-4 mb-3">
            <div className="flex-1">
              <p className="text-xs text-text-muted mb-1">Valor Total Pendente</p>
              <p className="text-xl font-semibold text-status-pending font-mono tabular-nums">{fmt(pendingFixed)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-text-muted mb-1">Pendentes</p>
              <p className="text-xl font-semibold text-foreground">{pendingExpenses.length}<span className="text-sm text-text-muted">/{fixedExpenses.length}</span></p>
            </div>
          </div>
          {nextDue ? (
            <div className="flex items-center gap-3 p-3 bg-background rounded-lg border border-border-subtle/60">
              <div className="h-8 w-8 rounded-full bg-[hsl(var(--status-pending)/0.15)] flex items-center justify-center shrink-0">
                <Clock className="h-4 w-4 text-status-pending" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">Próxima: {nextDue.item}</p>
                <p className="text-xs text-text-muted">Dia {nextDue.dueDay} · {fmt(nextDue.monthlyValues[selectedMonth] ?? 0)}</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 p-3 bg-[hsl(var(--status-paid)/0.08)] rounded-lg">
              <AlertCircle className="h-4 w-4 text-status-paid" />
              <p className="text-sm text-status-paid font-medium">Todas as contas pagas!</p>
            </div>
          )}
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        {/* Pie Chart - Gastos por categoria */}
        <div className="bg-surface rounded-xl shadow-card border border-border-subtle/60 p-5">
          <span className="label-caps mb-3 block">Gastos por Categoria</span>
          {categoryData.length > 0 ? (
            <div className="flex flex-col items-center">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} innerRadius={40} paddingAngle={2}>
                    {categoryData.map((_, idx) => (
                      <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => fmt(value)} contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(214, 32%, 91%)" }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-2 mt-2 justify-center">
                {categoryData.map((d, i) => (
                  <span key={d.name} className="inline-flex items-center gap-1.5 text-[11px] text-text-muted">
                    <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                    {d.name}: {fmt(d.value)}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-text-muted text-center py-8">Sem gastos neste mês</p>
          )}
        </div>

        {/* Line Chart - Evolução do saldo */}
        <div className="bg-surface rounded-xl shadow-card border border-border-subtle/60 p-5">
          <span className="label-caps mb-3 block">Evolução do Saldo</span>
          <ResponsiveContainer width="100%" height={230}>
            <LineChart data={lineData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 32%, 91%)" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(215, 16%, 57%)" }} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(215, 16%, 57%)" }} tickFormatter={(v) => `€${v}`} width={60} />
              <Tooltip formatter={(value: number) => fmt(value)} labelStyle={{ fontWeight: 600 }} contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(214, 32%, 91%)" }} />
              <Line type="monotone" dataKey="saldo" stroke="hsl(160, 84%, 39%)" strokeWidth={2.5} dot={{ r: 3, fill: "hsl(160, 84%, 39%)" }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Comparação com mês anterior - formato compacto */}
      <div className="bg-surface rounded-xl shadow-card border border-border-subtle/60 p-5 mb-6">
        <span className="label-caps mb-3 block">Comparação com Mês Anterior</span>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <span className="text-xs text-text-muted">Entradas</span>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-lg font-semibold text-foreground font-mono tabular-nums">{fmt(current.totalIncome)}</p>
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
              <p className="text-lg font-semibold text-foreground font-mono tabular-nums">{fmt(current.totalExpenses)}</p>
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
              <p className="text-lg font-semibold text-foreground font-mono tabular-nums">{fmt(current.totalFixed)}</p>
              <ComparisonBadge current={current.totalFixed} previous={prev.totalFixed} />
            </div>
          </div>
          <div>
            <span className="text-xs text-text-muted">Variáveis</span>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-lg font-semibold text-foreground font-mono tabular-nums">{fmt(current.totalVariable)}</p>
              <ComparisonBadge current={current.totalVariable} previous={prev.totalVariable} />
            </div>
          </div>
        </div>
      </div>

      {/* Metas financeiras - resumo (read-only) */}
      {financialGoals.length > 0 && (
        <div className="bg-surface rounded-xl shadow-card border border-border-subtle/60 p-5 mb-6">
          <span className="label-caps mb-3 block">Metas Financeiras</span>
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
        <div className="bg-surface rounded-xl shadow-card border border-border-subtle/60 p-5 mb-6">
          <span className="label-caps mb-3 block">Gastos vs Rendimentos por Categoria</span>
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
      <div className="bg-surface rounded-xl shadow-card border border-border-subtle/60 p-5 mb-6">
        <span className="label-caps mb-4 block">Divisão por Pessoa</span>
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
                <div className="flex items-center gap-3 mb-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium w-20 text-center shrink-0 ${colors.bg} ${colors.text}`}>{person}</span>
                  <div className="flex-1 h-3 bg-background rounded-full overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.5, ease: "easeOut" }}
                      className={`h-full rounded-full ${colors.bar}`} />
                  </div>
                  <span className="font-mono text-sm text-foreground tabular-nums w-24 text-right shrink-0 font-semibold">{fmt(details.total)}</span>
                </div>
                <div className="ml-[92px] flex flex-wrap gap-x-4 gap-y-1">
                  <span className="text-xs text-text-muted">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-status-paid mr-1 align-middle" />
                    Pagou: {fmt(details.totalPaid)}
                  </span>
                  <span className="text-xs text-text-muted">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-status-pending mr-1 align-middle" />
                    Deve: {fmt(details.totalOwed)}
                  </span>
                  <span className={`text-xs font-semibold ${pb.diff >= 0 ? "text-status-paid" : "text-status-negative"}`}>
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
