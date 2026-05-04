import { useState, useEffect } from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Target, TrendingUp, Lightbulb, ChevronDown, ChevronUp, Pencil, Check, X, PiggyBank, Wallet, ArrowDownCircle, ArrowUpCircle, History } from "lucide-react";

type GoalTxn = { id: string; goalId: string; type: "in" | "out"; amount: number; date: string };
const TXN_KEY = "goal_transactions_v1";
const loadTxns = (): GoalTxn[] => {
  try { return JSON.parse(localStorage.getItem(TXN_KEY) || "[]"); } catch { return []; }
};
const saveTxns = (t: GoalTxn[]) => localStorage.setItem(TXN_KEY, JSON.stringify(t));
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import type { FinancialGoal, GoalTerm, AccountType } from "@/types/goal";
import { TERM_LABELS, TERM_COLORS, ACCOUNT_LABELS } from "@/types/goal";

interface FinancialGoalsProps {
  goals: FinancialGoal[];
  onAdd: (goal: FinancialGoal) => void;
  onUpdate: (id: string, updates: Partial<FinancialGoal>) => void;
  onDelete: (id: string) => void;
}

const TIPS: Record<GoalTerm, string[]> = {
  short: [
    "Reserve pelo menos 3 a 6 meses de despesas para emergências.",
    "Automatize transferências mensais para a conta poupança.",
    "Priorize quitar dívidas com juros mais altos primeiro.",
  ],
  medium: [
    "Considere investimentos com liquidez moderada (CDB, LCI).",
    "Pesquise programas de financiamento com boas taxas.",
    "Diversifique os investimentos para reduzir riscos.",
  ],
  long: [
    "Comece a investir em renda variável para longo prazo.",
    "Contribua regularmente para previdência privada.",
    "Revise sua estratégia anualmente e ajuste conforme necessário.",
  ],
};

const ACCOUNTS: AccountType[] = ["poupanca", "investimento", "principal"];

const defaultGoals: FinancialGoal[] = [
  { id: "1", name: "Fundo de emergência", term: "short", totalValue: 15000, deadlineMonths: 12, currentValue: 3000, monthlySavings: 1000, account: "poupanca" },
  { id: "2", name: "Quitar dívidas", term: "short", totalValue: 8000, deadlineMonths: 8, currentValue: 2000, monthlySavings: 750, account: "principal" },
  { id: "3", name: "Viagem", term: "short", totalValue: 5000, deadlineMonths: 6, currentValue: 1500, monthlySavings: 583, account: "poupanca" },
  { id: "4", name: "Entrada da casa", term: "medium", totalValue: 60000, deadlineMonths: 36, currentValue: 10000, monthlySavings: 1389, account: "poupanca" },
  { id: "5", name: "Comprar carro", term: "medium", totalValue: 40000, deadlineMonths: 24, currentValue: 5000, monthlySavings: 1458, account: "poupanca" },
  { id: "6", name: "Investimento", term: "medium", totalValue: 20000, deadlineMonths: 24, currentValue: 4000, monthlySavings: 667, account: "investimento" },
  { id: "7", name: "Aposentadoria", term: "long", totalValue: 500000, deadlineMonths: 240, currentValue: 25000, monthlySavings: 1979, account: "investimento" },
  { id: "8", name: "Patrimônio", term: "long", totalValue: 300000, deadlineMonths: 180, currentValue: 15000, monthlySavings: 1583, account: "investimento" },
  { id: "9", name: "Independência financeira", term: "long", totalValue: 1000000, deadlineMonths: 300, currentValue: 50000, monthlySavings: 3167, account: "investimento" },
];

export { defaultGoals };

export const FinancialGoals = ({ goals, onAdd, onUpdate, onDelete }: FinancialGoalsProps) => {
  const [expandedTerm, setExpandedTerm] = useState<GoalTerm | null>("short");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<FinancialGoal>>({});
  const [addingTerm, setAddingTerm] = useState<GoalTerm | null>(null);
  const [newGoal, setNewGoal] = useState({ name: "", totalValue: 0, deadlineMonths: 12, currentValue: 0, account: "poupanca" as AccountType });

  const [showSavings, setShowSavings] = useState<string | null>(null);
  const [savingsAmount, setSavingsAmount] = useState("");
  const [savingsType, setSavingsType] = useState<"in" | "out">("in");
  const [savingsAlert, setSavingsAlert] = useState<{ goalId: string; kind: "error" | "success"; msg: string } | null>(null);
  const [transactions, setTransactions] = useState<GoalTxn[]>(() => loadTxns());

  useEffect(() => { saveTxns(transactions); }, [transactions]);

  const terms: GoalTerm[] = ["short", "medium", "long"];

  const goalsByTerm = (term: GoalTerm) => goals.filter((g) => g.term === term);
  const txnsForGoal = (goalId: string) => transactions.filter(t => t.goalId === goalId).sort((a, b) => b.date.localeCompare(a.date));

  const totalCurrent = goals.reduce((s, g) => s + g.currentValue, 0);
  const totalTarget = goals.reduce((s, g) => s + g.totalValue, 0);
  const totalProgress = totalTarget > 0 ? (totalCurrent / totalTarget) * 100 : 0;
  const totalMonthly = goals.reduce((s, g) => s + g.monthlySavings, 0);

  const startEdit = (goal: FinancialGoal) => {
    setEditingId(goal.id);
    setEditValues({ name: goal.name, totalValue: goal.totalValue, deadlineMonths: goal.deadlineMonths, currentValue: goal.currentValue, monthlySavings: goal.monthlySavings });
  };

  const saveEdit = (id: string) => {
    onUpdate(id, editValues);
    setEditingId(null);
  };

  const handleAdd = (term: GoalTerm) => {
    if (!newGoal.name.trim()) return;
    const remaining = Math.max(newGoal.totalValue - newGoal.currentValue, 0);
    const monthly = newGoal.deadlineMonths > 0 ? Math.ceil(remaining / newGoal.deadlineMonths) : 0;
    onAdd({
      id: crypto.randomUUID(),
      name: newGoal.name,
      term,
      totalValue: newGoal.totalValue,
      deadlineMonths: newGoal.deadlineMonths,
      currentValue: newGoal.currentValue,
      monthlySavings: monthly,
      account: newGoal.account,
    });
    setNewGoal({ name: "", totalValue: 0, deadlineMonths: 12, currentValue: 0, account: "poupanca" });
    setAddingTerm(null);
  };

  const addSavings = (id: string) => {
    const amount = parseFloat(savingsAmount);
    if (isNaN(amount) || amount <= 0) {
      setSavingsAlert({ goalId: id, kind: "error", msg: "Insira um valor válido maior que zero." });
      return;
    }
    const goal = goals.find((g) => g.id === id);
    if (!goal) return;
    if (savingsType === "out" && amount > goal.currentValue) {
      setSavingsAlert({ goalId: id, kind: "error", msg: `Não pode retirar ${fmt(amount)} — saldo atual é ${fmt(goal.currentValue)}.` });
      return;
    }
    const delta = savingsType === "in" ? amount : -amount;
    onUpdate(id, { currentValue: goal.currentValue + delta });
    setTransactions(prev => [...prev, { id: crypto.randomUUID(), goalId: id, type: savingsType, amount, date: new Date().toISOString() }]);
    setSavingsAmount("");
    setSavingsAlert({ goalId: id, kind: "success", msg: savingsType === "in" ? `Entrada de ${fmt(amount)} registada.` : `Retirada de ${fmt(amount)} registada.` });
  };
  const removeTxn = (txnId: string, goalId: string) => {
    const txn = transactions.find(t => t.id === txnId);
    if (!txn) return;
    if (!window.confirm(`Remover este registo de ${fmt(txn.amount)}?`)) return;
    const goal = goals.find(g => g.id === goalId);
    if (goal) {
      const revert = txn.type === "in" ? -txn.amount : txn.amount;
      onUpdate(goalId, { currentValue: Math.max(goal.currentValue + revert, 0) });
    }
    setTransactions(prev => prev.filter(t => t.id !== txnId));
  };

  // Chart data
  const pieData = terms.map((term) => ({
    name: TERM_LABELS[term],
    value: goalsByTerm(term).reduce((s, g) => s + g.currentValue, 0),
    color: TERM_COLORS[term].accent,
  })).filter((d) => d.value > 0);

  const barData = goals.map((g) => ({
    name: g.name.length > 12 ? g.name.slice(0, 12) + "…" : g.name,
    progresso: Math.min(Math.round((g.currentValue / g.totalValue) * 100), 100),
    term: g.term,
  }));

  const fmt = (v: number) => `€ ${v.toLocaleString("pt-PT", { minimumFractionDigits: 2 })}`;

  return (
    <motion.div initial={{ opacity: 0, x: 4 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.2 }}>
      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-surface rounded-xl shadow-card border border-border-subtle/60 p-3 sm:p-4 min-w-0">
          <span className="label-caps">Total Poupado</span>
          <p className="text-base sm:text-xl font-semibold text-primary font-mono tabular-nums mt-1 truncate">{fmt(totalCurrent)}</p>
        </div>
        <div className="bg-surface rounded-xl shadow-card border border-border-subtle/60 p-3 sm:p-4 min-w-0">
          <span className="label-caps">Objetivo Total</span>
          <p className="text-base sm:text-xl font-semibold text-foreground font-mono tabular-nums mt-1 truncate">{fmt(totalTarget)}</p>
        </div>
        <div className="bg-surface rounded-xl shadow-card border border-border-subtle/60 p-3 sm:p-4 min-w-0">
          <span className="label-caps">Progresso Geral</span>
          <p className="text-base sm:text-xl font-semibold text-accent font-mono tabular-nums mt-1">{totalProgress.toFixed(1)}%</p>
          <div className="mt-2 h-2 bg-secondary rounded-full overflow-hidden">
            <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(totalProgress, 100)}%` }}
              transition={{ duration: 0.8 }} className="h-full bg-accent rounded-full" />
          </div>
        </div>
        <div className="bg-surface rounded-xl shadow-card border border-border-subtle/60 p-3 sm:p-4 min-w-0">
          <span className="label-caps">Mensal Necessário</span>
          <p className="text-base sm:text-xl font-semibold text-status-pending font-mono tabular-nums mt-1 truncate">{fmt(totalMonthly)}</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="bg-surface rounded-xl shadow-card border border-border-subtle/60 p-5">
          <span className="label-caps mb-3 block">Distribuição por Prazo</span>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" cx="50%" cy="50%" outerRadius={70} innerRadius={40} paddingAngle={3} strokeWidth={0}>
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => fmt(value)} contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(var(--border-subtle))" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-3 justify-center mt-2">
            {pieData.map((d, i) => (
              <span key={i} className="flex items-center gap-1.5 text-xs text-text-secondary">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                {d.name}
              </span>
            ))}
          </div>
        </div>

        <div className="bg-surface rounded-xl shadow-card border border-border-subtle/60 p-5">
          <span className="label-caps mb-3 block">Progresso por Meta</span>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} layout="vertical" margin={{ left: 0, right: 16, top: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border-subtle))" />
                <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 10, fill: "hsl(var(--text-muted))" }} />
                <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 10, fill: "hsl(var(--text-secondary))" }} />
                <Tooltip formatter={(value: number) => `${value}%`} contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(var(--border-subtle))" }} />
                <Bar dataKey="progresso" radius={[0, 4, 4, 0]} barSize={14}>
                  {barData.map((entry, i) => (
                    <Cell key={i} fill={TERM_COLORS[entry.term].accent} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Goals by term */}
      {terms.map((term) => {
        const termGoals = goalsByTerm(term);
        const isExpanded = expandedTerm === term;
        const colors = TERM_COLORS[term];
        const termTotal = termGoals.reduce((s, g) => s + g.currentValue, 0);
        const termTarget = termGoals.reduce((s, g) => s + g.totalValue, 0);
        const termPct = termTarget > 0 ? (termTotal / termTarget) * 100 : 0;

        return (
          <div key={term} className="mb-4">
            <button onClick={() => setExpandedTerm(isExpanded ? null : term)}
              className="w-full bg-surface rounded-xl shadow-card border border-border-subtle/60 p-4 flex items-center justify-between hover:shadow-card-hover transition-shadow">
              <div className="flex items-center gap-3">
                <span className={`p-2 rounded-lg ${colors.bg}`}>
                  <Target className={`h-4 w-4 ${colors.text}`} />
                </span>
                <div className="text-left">
                  <span className="text-sm font-semibold text-foreground">{TERM_LABELS[term]}</span>
                  <p className="text-xs text-text-muted">{termGoals.length} metas · {termPct.toFixed(0)}% concluído</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="hidden sm:block text-right">
                  <p className="text-sm font-mono tabular-nums text-foreground">{fmt(termTotal)}</p>
                  <p className="text-xs text-text-muted">de {fmt(termTarget)}</p>
                </div>
                {isExpanded ? <ChevronUp className="h-4 w-4 text-text-muted" /> : <ChevronDown className="h-4 w-4 text-text-muted" />}
              </div>
            </button>

            <AnimatePresence>
              {isExpanded && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                  <div className="mt-2 space-y-2">
                    {termGoals.map((goal) => {
                      const pct = goal.totalValue > 0 ? Math.min((goal.currentValue / goal.totalValue) * 100, 100) : 0;
                      const isEditing = editingId === goal.id;

                      return (
                        <div key={goal.id} className="bg-surface rounded-xl border border-border-subtle/60 p-4">
                          {isEditing ? (
                            <div className="space-y-3">
                              <input value={editValues.name ?? ""} onChange={(e) => setEditValues({ ...editValues, name: e.target.value })}
                                className="w-full text-sm bg-background border border-border-subtle rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
                                placeholder="Nome da meta" />
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                <div>
                                  <label className="text-[10px] text-text-muted font-medium">Valor Total</label>
                                  <input type="number" value={editValues.totalValue ?? 0}
                                    onChange={(e) => setEditValues({ ...editValues, totalValue: parseFloat(e.target.value) || 0 })}
                                    className="w-full text-sm bg-background border border-border-subtle rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary font-mono" />
                                </div>
                                <div>
                                  <label className="text-[10px] text-text-muted font-medium">Prazo (meses)</label>
                                  <input type="number" value={editValues.deadlineMonths ?? 0}
                                    onChange={(e) => setEditValues({ ...editValues, deadlineMonths: parseInt(e.target.value) || 0 })}
                                    className="w-full text-sm bg-background border border-border-subtle rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary font-mono" />
                                </div>
                                <div>
                                  <label className="text-[10px] text-text-muted font-medium">Já Poupado</label>
                                  <input type="number" value={editValues.currentValue ?? 0}
                                    onChange={(e) => setEditValues({ ...editValues, currentValue: parseFloat(e.target.value) || 0 })}
                                    className="w-full text-sm bg-background border border-border-subtle rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary font-mono" />
                                </div>
                                <div>
                                  <label className="text-[10px] text-text-muted font-medium">Mensal</label>
                                  <input type="number" value={editValues.monthlySavings ?? 0}
                                    onChange={(e) => setEditValues({ ...editValues, monthlySavings: parseFloat(e.target.value) || 0 })}
                                    className="w-full text-sm bg-background border border-border-subtle rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary font-mono" />
                                </div>
                              </div>
                              <div>
                                <label className="text-[10px] text-text-muted font-medium">Conta</label>
                                <select value={editValues.account ?? "poupanca"}
                                  onChange={(e) => setEditValues({ ...editValues, account: e.target.value as AccountType })}
                                  className="w-full text-sm bg-background border border-border-subtle rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary">
                                  {ACCOUNTS.map((a) => (
                                    <option key={a} value={a}>{ACCOUNT_LABELS[a]}</option>
                                  ))}
                                </select>
                              </div>
                              <div className="flex gap-2 justify-end col-span-2 sm:col-span-full">
                                <button onClick={() => setEditingId(null)} className="p-1.5 text-text-muted hover:text-foreground"><X className="h-4 w-4" /></button>
                                <button onClick={() => saveEdit(goal.id)} className="p-1.5 text-primary hover:text-primary/80"><Check className="h-4 w-4" /></button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex-1 min-w-0">
                                  <h4 className="text-sm font-semibold text-foreground truncate">{goal.name}</h4>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <p className="text-xs text-text-muted">
                                      {goal.deadlineMonths} meses · {fmt(goal.monthlySavings)}/mês
                                    </p>
                                    {goal.account && (
                                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-secondary text-[10px] font-medium text-text-secondary">
                                        <Wallet className="h-2.5 w-2.5" />{ACCOUNT_LABELS[goal.account]}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 shrink-0 ml-2">
                                  <button onClick={() => { setShowSavings(showSavings === goal.id ? null : goal.id); setSavingsAlert(null); }}
                                    className="p-1.5 text-text-muted hover:text-primary transition-colors" title="Separar dinheiro">
                                    <PiggyBank className="h-3.5 w-3.5" />
                                  </button>
                                  <button onClick={() => startEdit(goal)} className="p-1.5 text-text-muted hover:text-foreground transition-colors">
                                    <Pencil className="h-3.5 w-3.5" />
                                  </button>
                                  <button onClick={() => onDelete(goal.id)} className="p-1.5 text-text-muted hover:text-destructive transition-colors">
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>

                              {/* Savings input + transactions */}
                              <AnimatePresence>
                                {showSavings === goal.id && (
                                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }} className="overflow-hidden mb-3 space-y-2">
                                    <div className="flex gap-2 items-center bg-background rounded-lg p-2 border border-border-subtle flex-wrap">
                                      <div className="inline-flex rounded-md overflow-hidden border border-border-subtle">
                                        <button type="button" onClick={() => setSavingsType("in")}
                                          className={`px-2 py-1 text-[11px] font-medium inline-flex items-center gap-1 ${savingsType === "in" ? "bg-primary text-primary-foreground" : "text-text-secondary hover:bg-surface-hover"}`}>
                                          <ArrowDownCircle className="h-3 w-3" />Entrada
                                        </button>
                                        <button type="button" onClick={() => setSavingsType("out")}
                                          className={`px-2 py-1 text-[11px] font-medium inline-flex items-center gap-1 ${savingsType === "out" ? "bg-status-negative text-white" : "text-text-secondary hover:bg-surface-hover"}`}>
                                          <ArrowUpCircle className="h-3 w-3" />Retirada
                                        </button>
                                      </div>
                                      <span className="text-xs text-text-muted">€</span>
                                      <input type="number" value={savingsAmount}
                                        onChange={(e) => { setSavingsAmount(e.target.value); if (savingsAlert?.goalId === goal.id) setSavingsAlert(null); }}
                                        placeholder="0,00" className="flex-1 min-w-[80px] text-sm bg-transparent focus:outline-none font-mono" />
                                      <button onClick={() => addSavings(goal.id)}
                                        className="px-3 py-1 text-xs bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90">
                                        Registar
                                      </button>
                                    </div>
                                    {savingsAlert?.goalId === goal.id && (
                                      <div role="alert"
                                        className={`flex items-start gap-2 rounded-lg px-3 py-2 text-xs border ${
                                          savingsAlert.kind === "error"
                                            ? "bg-status-negative/10 border-status-negative/30 text-status-negative"
                                            : "bg-primary/10 border-primary/30 text-primary"
                                        }`}>
                                        {savingsAlert.kind === "error"
                                          ? <X className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                                          : <Check className="h-3.5 w-3.5 mt-0.5 shrink-0" />}
                                        <span className="flex-1 font-medium">{savingsAlert.msg}</span>
                                        <button onClick={() => setSavingsAlert(null)} className="opacity-70 hover:opacity-100" aria-label="Fechar">
                                          <X className="h-3 w-3" />
                                        </button>
                                      </div>
                                    )}
                                    {txnsForGoal(goal.id).length > 0 && (
                                      <div className="bg-background rounded-lg border border-border-subtle">
                                        <div className="flex items-center gap-1.5 px-2.5 py-1.5 border-b border-border-subtle">
                                          <History className="h-3 w-3 text-text-muted" />
                                          <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Histórico</span>
                                        </div>
                                        <ul className="divide-y divide-border-subtle/60 max-h-48 overflow-y-auto">
                                          {txnsForGoal(goal.id).map(t => (
                                            <li key={t.id} className="flex items-center justify-between px-2.5 py-1.5 text-xs">
                                              <span className="flex items-center gap-1.5">
                                                {t.type === "in"
                                                  ? <ArrowDownCircle className="h-3 w-3 text-primary" />
                                                  : <ArrowUpCircle className="h-3 w-3 text-status-negative" />}
                                                <span className="text-text-secondary">{new Date(t.date).toLocaleDateString("pt-PT")}</span>
                                              </span>
                                              <span className="flex items-center gap-2">
                                                <span className={`font-mono tabular-nums ${t.type === "in" ? "text-primary" : "text-status-negative"}`}>
                                                  {t.type === "in" ? "+" : "−"}{fmt(t.amount)}
                                                </span>
                                                <button onClick={() => removeTxn(t.id, goal.id)}
                                                  className="p-1 text-text-muted hover:text-destructive transition-colors" title="Eliminar registo">
                                                  <Trash2 className="h-3 w-3" />
                                                </button>
                                              </span>
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}
                                  </motion.div>
                                )}
                              </AnimatePresence>

                              {/* Progress bar */}
                              <div className="flex items-center gap-3">
                                <div className="flex-1 h-2.5 bg-secondary rounded-full overflow-hidden">
                                  <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                                    transition={{ duration: 0.6, ease: "easeOut" }}
                                    className={`h-full rounded-full ${colors.bar}`} />
                                </div>
                                <span className="text-xs font-mono tabular-nums text-text-secondary w-10 text-right">{pct.toFixed(0)}%</span>
                              </div>

                              <div className="flex justify-between mt-2">
                                <span className="text-xs text-text-muted font-mono tabular-nums">{fmt(goal.currentValue)}</span>
                                <span className="text-xs text-text-muted font-mono tabular-nums">{fmt(goal.totalValue)}</span>
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}

                    {/* Add goal form */}
                    {addingTerm === term ? (
                      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                        className="bg-surface rounded-xl border border-border-subtle/60 p-4 space-y-3">
                        <input value={newGoal.name} onChange={(e) => setNewGoal({ ...newGoal, name: e.target.value })}
                          placeholder="Nome da meta" autoFocus
                          className="w-full text-sm bg-background border border-border-subtle rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary" />
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          <div>
                            <label className="text-[10px] text-text-muted font-medium">Valor Total</label>
                            <input type="number" value={newGoal.totalValue || ""}
                              onChange={(e) => setNewGoal({ ...newGoal, totalValue: parseFloat(e.target.value) || 0 })}
                              className="w-full text-sm bg-background border border-border-subtle rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary font-mono" />
                          </div>
                          <div>
                            <label className="text-[10px] text-text-muted font-medium">Prazo (meses)</label>
                            <input type="number" value={newGoal.deadlineMonths || ""}
                              onChange={(e) => setNewGoal({ ...newGoal, deadlineMonths: parseInt(e.target.value) || 0 })}
                              className="w-full text-sm bg-background border border-border-subtle rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary font-mono" />
                          </div>
                          <div>
                            <label className="text-[10px] text-text-muted font-medium">Já Tem</label>
                            <input type="number" value={newGoal.currentValue || ""}
                              onChange={(e) => setNewGoal({ ...newGoal, currentValue: parseFloat(e.target.value) || 0 })}
                              className="w-full text-sm bg-background border border-border-subtle rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary font-mono" />
                          </div>
                          <div>
                            <label className="text-[10px] text-text-muted font-medium">Conta</label>
                            <select value={newGoal.account}
                              onChange={(e) => setNewGoal({ ...newGoal, account: e.target.value as AccountType })}
                              className="w-full text-sm bg-background border border-border-subtle rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary">
                              {ACCOUNTS.map((a) => (
                                <option key={a} value={a}>{ACCOUNT_LABELS[a]}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <div className="flex gap-2 justify-end">
                          <button onClick={() => setAddingTerm(null)} className="px-3 py-1.5 text-sm text-text-muted hover:bg-surface-hover rounded-lg">Cancelar</button>
                          <button onClick={() => handleAdd(term)} className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90">Adicionar</button>
                        </div>
                      </motion.div>
                    ) : (
                      <button onClick={() => setAddingTerm(term)}
                        className="w-full py-2.5 rounded-xl border border-dashed border-border-subtle text-sm text-text-muted hover:text-foreground hover:border-primary/40 transition-colors flex items-center justify-center gap-1.5">
                        <Plus className="h-3.5 w-3.5" /> Adicionar Meta
                      </button>
                    )}
                  </div>

                  {/* Tips */}
                  <div className={`mt-3 rounded-xl p-4 ${colors.bg} border border-border-subtle/30`}>
                    <div className="flex items-center gap-2 mb-2">
                      <Lightbulb className={`h-4 w-4 ${colors.text}`} />
                      <span className={`text-xs font-semibold ${colors.text}`}>Dicas — {TERM_LABELS[term]}</span>
                    </div>
                    <ul className="space-y-1.5">
                      {TIPS[term].map((tip, i) => (
                        <li key={i} className="text-xs text-text-secondary flex items-start gap-2">
                          <TrendingUp className={`h-3 w-3 mt-0.5 shrink-0 ${colors.text}`} />
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}

      {/* Dashboard Table - Desktop */}
      <div className="hidden sm:block bg-surface rounded-xl shadow-card border border-border-subtle/60 mt-6 overflow-hidden">
        <div className="p-4 border-b border-border-subtle/60">
          <span className="label-caps">Painel de Metas</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle/60 bg-background">
                <th className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-text-muted">Meta</th>
                <th className="text-right px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-text-muted">Valor Total</th>
                <th className="text-right px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-text-muted">Prazo</th>
                <th className="text-right px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-text-muted">Mensal</th>
                <th className="text-right px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-text-muted">Poupado</th>
                <th className="text-center px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-text-muted">Conta</th>
                <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-text-muted w-36">Progresso</th>
              </tr>
            </thead>
            <tbody>
              {goals.map((goal) => {
                const pct = goal.totalValue > 0 ? Math.min((goal.currentValue / goal.totalValue) * 100, 100) : 0;
                const colors = TERM_COLORS[goal.term];
                return (
                  <tr key={goal.id} className="border-b border-border-subtle/30 last:border-0 hover:bg-surface-hover transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${colors.bg} ${colors.text}`}>
                          {TERM_LABELS[goal.term].split(" ")[0]}
                        </span>
                        <span className="font-medium text-foreground">{goal.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-foreground">{fmt(goal.totalValue)}</td>
                    <td className="px-4 py-3 text-right text-text-secondary">{goal.deadlineMonths}m</td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-status-pending">{fmt(goal.monthlySavings)}</td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-primary">{fmt(goal.currentValue)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary text-[10px] font-medium text-text-secondary">
                        <Wallet className="h-2.5 w-2.5" />{goal.account ? ACCOUNT_LABELS[goal.account] : "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${colors.bar}`} style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs font-mono tabular-nums text-text-secondary w-9 text-right">{pct.toFixed(0)}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dashboard Table - Mobile */}
      <div className="sm:hidden mt-6 space-y-2">
        <span className="label-caps block mb-3">Painel de Metas</span>
        {goals.map((goal) => {
          const pct = goal.totalValue > 0 ? Math.min((goal.currentValue / goal.totalValue) * 100, 100) : 0;
          const colors = TERM_COLORS[goal.term];
          return (
            <div key={goal.id} className="bg-surface rounded-xl border border-border-subtle/60 p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium shrink-0 ${colors.bg} ${colors.text}`}>
                    {TERM_LABELS[goal.term].split(" ")[0]}
                  </span>
                  <span className="text-sm font-medium text-foreground truncate">{goal.name}</span>
                </div>
                <span className="text-xs font-mono tabular-nums text-text-secondary ml-2">{pct.toFixed(0)}%</span>
              </div>
              <div className="h-1.5 bg-secondary rounded-full overflow-hidden mb-2">
                <div className={`h-full rounded-full ${colors.bar}`} style={{ width: `${pct}%` }} />
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
                <span className="text-text-muted">Total: <span className="font-mono text-foreground">{fmt(goal.totalValue)}</span></span>
                <span className="text-text-muted">Poupado: <span className="font-mono text-primary">{fmt(goal.currentValue)}</span></span>
                <span className="text-text-muted">Mensal: <span className="font-mono text-status-pending">{fmt(goal.monthlySavings)}</span></span>
                <span className="text-text-muted">Prazo: <span className="text-text-secondary">{goal.deadlineMonths}m</span></span>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
};
