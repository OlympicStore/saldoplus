import { motion } from "framer-motion";
import { useState } from "react";
import { Pencil, Check, TrendingUp, TrendingDown, Minus, ArrowRight } from "lucide-react";
import type { FixedExpense, VariableExpense } from "@/types/expense";
import type { Income, SalaryConfig } from "@/types/income";

const personColors = [
  { bar: "bg-person-claudia", bg: "bg-person-claudia-bg", text: "text-person-claudia" },
  { bar: "bg-person-pedro", bg: "bg-person-pedro-bg", text: "text-person-pedro" },
  { bar: "bg-person-costa", bg: "bg-person-costa-bg", text: "text-person-costa" },
];

const fmt = (v: number) => `€ ${v.toLocaleString("pt-PT", { minimumFractionDigits: 2 })}`;

interface DashboardProps {
  fixedExpenses: FixedExpense[];
  variableExpenses: VariableExpense[];
  incomes: Income[];
  salaryConfigs: SalaryConfig[];
  people: string[];
  selectedMonth: number;
  currentBalance: number;
  onUpdateBalance: (v: number) => void;
}

export const Dashboard = ({
  fixedExpenses, variableExpenses, incomes, salaryConfigs,
  people, selectedMonth, currentBalance, onUpdateBalance,
}: DashboardProps) => {
  const [editingBalance, setEditingBalance] = useState(false);
  const [balanceVal, setBalanceVal] = useState("");

  const monthVars = variableExpenses.filter((e) => new Date(e.date).getMonth() === selectedMonth);
  const prevMonthVars = variableExpenses.filter((e) => new Date(e.date).getMonth() === (selectedMonth === 0 ? 11 : selectedMonth - 1));

  const totalFixed = fixedExpenses.reduce((s, e) => s + (e.monthlyValues[selectedMonth] ?? 0), 0);
  const totalVariable = monthVars.reduce((s, e) => s + e.value, 0);
  const totalExpenses = totalFixed + totalVariable;
  const paidFixed = fixedExpenses.filter((e) => e.monthlyPaid[selectedMonth]).reduce((s, e) => s + (e.monthlyValues[selectedMonth] ?? 0), 0);
  const pendingFixed = totalFixed - paidFixed;

  // Previous month totals for comparison
  const prevMonth = selectedMonth === 0 ? 11 : selectedMonth - 1;
  const prevTotalFixed = fixedExpenses.reduce((s, e) => s + (e.monthlyValues[prevMonth] ?? 0), 0);
  const prevTotalVariable = prevMonthVars.reduce((s, e) => s + e.value, 0);
  const prevTotalExpenses = prevTotalFixed + prevTotalVariable;

  // Income
  const activeSalaries = salaryConfigs.filter((s) => s.active);
  const totalSalary = activeSalaries.reduce((s, c) => s + c.value, 0);
  const monthOtherIncome = incomes.filter((i) => new Date(i.date).getMonth() === selectedMonth && i.type === "other").reduce((s, i) => s + i.value, 0);
  const totalIncome = totalSalary + monthOtherIncome;
  const monthBalance = totalIncome - totalExpenses;

  const startEditBalance = () => {
    setBalanceVal(currentBalance.toFixed(2).replace(".", ","));
    setEditingBalance(true);
  };

  const saveBalance = () => {
    const num = parseFloat(balanceVal.replace(",", "."));
    if (!isNaN(num)) onUpdateBalance(num);
    setEditingBalance(false);
  };

  // Person breakdown - detailed
  const perPersonDetails = (person: string) => {
    const fixedPaid = fixedExpenses
      .filter((e) => e.monthlyResponsible[selectedMonth] === person && e.monthlyPaid[selectedMonth])
      .reduce((s, e) => s + (e.monthlyValues[selectedMonth] ?? 0), 0);
    const fixedOwed = fixedExpenses
      .filter((e) => e.monthlyResponsible[selectedMonth] === person && !e.monthlyPaid[selectedMonth])
      .reduce((s, e) => s + (e.monthlyValues[selectedMonth] ?? 0), 0);
    const variable = monthVars.filter((e) => e.responsible === person).reduce((s, e) => s + e.value, 0);
    const totalPaid = fixedPaid + variable;
    const totalOwed = fixedOwed;
    return { totalPaid, totalOwed, total: totalPaid + totalOwed };
  };

  // Calculate who owes whom
  const fairShare = totalExpenses / (people.length || 1);
  const personBalances = people.map((person) => {
    const details = perPersonDetails(person);
    return { person, paid: details.totalPaid, owes: details.totalOwed, diff: details.totalPaid - fairShare };
  });

  // Calculate debts
  const debts: { from: string; to: string; amount: number }[] = [];
  const balances = personBalances.map((p) => ({ ...p }));
  const debtors = balances.filter((b) => b.diff < 0).sort((a, b) => a.diff - b.diff);
  const creditors = balances.filter((b) => b.diff > 0).sort((a, b) => b.diff - a.diff);
  let di = 0, ci = 0;
  const dCopy = debtors.map((d) => ({ ...d, remaining: Math.abs(d.diff) }));
  const cCopy = creditors.map((c) => ({ ...c, remaining: c.diff }));
  while (di < dCopy.length && ci < cCopy.length) {
    const amount = Math.min(dCopy[di].remaining, cCopy[ci].remaining);
    if (amount > 0.01) {
      debts.push({ from: dCopy[di].person, to: cCopy[ci].person, amount });
    }
    dCopy[di].remaining -= amount;
    cCopy[ci].remaining -= amount;
    if (dCopy[di].remaining < 0.01) di++;
    if (cCopy[ci].remaining < 0.01) ci++;
  }

  const ComparisonBadge = ({ current, previous }: { current: number; previous: number }) => {
    if (previous === 0) return null;
    const diff = ((current - previous) / previous) * 100;
    const isUp = diff > 1;
    const isDown = diff < -1;
    return (
      <span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${
        isUp ? "bg-[hsl(var(--status-negative)/0.1)] text-status-negative" :
        isDown ? "bg-[hsl(var(--status-paid)/0.1)] text-status-paid" :
        "bg-secondary text-text-muted"
      }`}>
        {isUp ? <TrendingUp className="h-3 w-3" /> : isDown ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
        {Math.abs(diff).toFixed(0)}%
      </span>
    );
  };

  return (
    <motion.div initial={{ opacity: 0, x: 4 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.2 }}>
      {/* Saldo atual */}
      <div className="text-center mb-6">
        <span className="label-caps">Saldo Atual</span>
        <div className="flex items-center justify-center gap-2 mt-1">
          {editingBalance ? (
            <div className="flex items-center gap-2">
              <span className="text-2xl text-text-muted">€</span>
              <input autoFocus value={balanceVal} onChange={(e) => setBalanceVal(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && saveBalance()}
                className="text-3xl sm:text-4xl font-semibold font-mono bg-transparent border-b-2 border-primary w-48 text-center focus:outline-none" />
              <button onClick={saveBalance} className="text-status-paid"><Check className="h-5 w-5" /></button>
            </div>
          ) : (
            <>
              <p className={`display-value ${currentBalance >= 0 ? "text-foreground" : "text-status-negative"}`}>
                {fmt(currentBalance)}
              </p>
              <button onClick={startEditBalance} className="text-text-muted hover:text-foreground transition-colors">
                <Pencil className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Saldo do mês */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-surface rounded-xl shadow-card border border-border-subtle/60 p-5">
          <span className="label-caps">Entradas do Mês</span>
          <p className="text-xl sm:text-2xl font-semibold text-status-paid font-mono tabular-nums tracking-tight mt-1">
            {fmt(totalIncome)}
          </p>
          <div className="flex gap-3 mt-2 flex-wrap text-xs text-text-muted">
            <span>Salários: {fmt(totalSalary)}</span>
            <span>Outros: {fmt(monthOtherIncome)}</span>
          </div>
        </div>
        <div className="bg-surface rounded-xl shadow-card border border-border-subtle/60 p-5">
          <div className="flex items-center justify-between">
            <span className="label-caps">Saídas do Mês</span>
            <ComparisonBadge current={totalExpenses} previous={prevTotalExpenses} />
          </div>
          <p className="text-xl sm:text-2xl font-semibold text-status-negative font-mono tabular-nums tracking-tight mt-1">
            {fmt(totalExpenses)}
          </p>
          <div className="flex gap-3 mt-2 flex-wrap text-xs text-text-muted">
            <span>Fixos: {fmt(totalFixed)}</span>
            <span>Variáveis: {fmt(totalVariable)}</span>
          </div>
        </div>
        <div className="bg-surface rounded-xl shadow-card border border-border-subtle/60 p-5">
          <span className="label-caps">Balanço do Mês</span>
          <p className={`text-xl sm:text-2xl font-semibold font-mono tabular-nums tracking-tight mt-1 ${monthBalance >= 0 ? "text-status-paid" : "text-status-negative"}`}>
            {monthBalance >= 0 ? "+" : ""}{fmt(monthBalance)}
          </p>
          <p className="text-xs text-text-muted mt-2">
            {monthBalance >= 0 ? "Sobra" : "Falta"} este mês
          </p>
        </div>
      </div>

      {/* Comparison with previous month */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-surface rounded-xl shadow-card border border-border-subtle/60 p-4">
          <span className="label-caps">Fixos</span>
          <p className="text-lg font-semibold text-foreground font-mono tabular-nums mt-1">{fmt(totalFixed)}</p>
          <ComparisonBadge current={totalFixed} previous={prevTotalFixed} />
        </div>
        <div className="bg-surface rounded-xl shadow-card border border-border-subtle/60 p-4">
          <span className="label-caps">Variáveis</span>
          <p className="text-lg font-semibold text-foreground font-mono tabular-nums mt-1">{fmt(totalVariable)}</p>
          <ComparisonBadge current={totalVariable} previous={prevTotalVariable} />
        </div>
        <div className="bg-surface rounded-xl shadow-card border border-border-subtle/60 p-4">
          <span className="label-caps">Contas Pendentes</span>
          <p className="text-lg font-semibold text-foreground font-mono tabular-nums mt-1">
            {fixedExpenses.filter((e) => !e.monthlyPaid[selectedMonth]).length}
          </p>
          <p className="text-[10px] text-text-muted mt-0.5">de {fixedExpenses.length} fixos</p>
        </div>
        <div className="bg-surface rounded-xl shadow-card border border-border-subtle/60 p-4">
          <span className="label-caps">Pago vs Pendente</span>
          <div className="flex gap-2 mt-2">
            <span className="text-xs text-status-paid font-mono">{fmt(paidFixed)}</span>
            <span className="text-xs text-status-pending font-mono">{fmt(pendingFixed)}</span>
          </div>
        </div>
      </div>

      {/* Divisão por pessoa - melhorada */}
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
                  <span className="font-mono text-sm text-foreground tabular-nums w-24 text-right shrink-0 font-semibold">
                    {fmt(details.total)}
                  </span>
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

      {/* Quem deve a quem */}
      {debts.length > 0 && (
        <div className="bg-surface rounded-xl shadow-card border border-border-subtle/60 p-5">
          <span className="label-caps mb-4 block">Acertos Necessários</span>
          <div className="space-y-3">
            {debts.map((debt, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-background rounded-lg">
                <span className="text-sm font-semibold text-status-negative">{debt.from}</span>
                <ArrowRight className="h-4 w-4 text-text-muted shrink-0" />
                <span className="text-sm font-semibold text-status-paid">{debt.to}</span>
                <span className="ml-auto font-mono text-sm font-bold text-foreground tabular-nums">{fmt(debt.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
};
