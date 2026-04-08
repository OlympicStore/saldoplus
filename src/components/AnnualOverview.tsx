import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { Paperclip, FileCheck, X, Plus, Trash2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import type { BillStatus, MonthlyBillRecord, BillAttachment, FixedExpense, VariableExpense } from "@/types/expense";
import type { FinancialGoal } from "@/types/goal";
import { TERM_LABELS, TERM_COLORS } from "@/types/goal";

const MONTHS = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

const STATUS_OPTIONS: { value: BillStatus; label: string }[] = [
  { value: "pendente", label: "Pendente" },
  { value: "paga", label: "Paga" },
  { value: "divida", label: "Dívida" },
];

const statusStyles: Record<BillStatus, string> = {
  pendente: "bg-[hsl(var(--status-pending)/0.15)] text-[hsl(var(--status-pending))] border-[hsl(var(--status-pending)/0.3)]",
  paga: "bg-[hsl(var(--status-paid)/0.15)] text-[hsl(var(--status-paid))] border-[hsl(var(--status-paid)/0.3)]",
  divida: "bg-[hsl(var(--status-negative)/0.15)] text-[hsl(var(--status-negative))] border-[hsl(var(--status-negative)/0.3)]",
};

const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(var(--status-pending))",
  "hsl(var(--status-paid))",
  "hsl(var(--status-negative))",
];

interface AnnualOverviewProps {
  records: MonthlyBillRecord[];
  attachments: BillAttachment[];
  billNames: string[];
  onUpdate: (bill: string, month: number, status: BillStatus, year: number) => void;
  onAttach: (bill: string, month: number, file: File) => void;
  onRemoveAttachment: (bill: string, month: number) => void;
  fixedExpenses: FixedExpense[];
  variableExpenses: VariableExpense[];
  goals: FinancialGoal[];
  people: string[];
  onAddBill: (expense: FixedExpense) => void;
  onRemoveBill: (id: string) => void;
  selectedMonth: number;
  selectedYear: number;
}

const fmt = (v: number) => `€ ${v.toLocaleString("pt-PT", { minimumFractionDigits: 2 })}`;

export const AnnualOverview = ({ records, attachments, billNames, onUpdate, onAttach, onRemoveAttachment, fixedExpenses, variableExpenses, goals, people, onAddBill, onRemoveBill, selectedMonth, selectedYear }: AnnualOverviewProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingTarget = useRef<{ bill: string; month: number } | null>(null);
  const [showAddBill, setShowAddBill] = useState(false);
  const [newBillName, setNewBillName] = useState("");

  const yearRecords = records.filter(r => r.year === selectedYear);

  const getStatus = (bill: string, month: number): BillStatus => {
    return yearRecords.find((r) => r.bill === bill && r.month === month)?.status ?? "pendente";
  };

  const getAttachment = (bill: string, month: number) => {
    return attachments.find((a) => a.bill === bill && a.month === month);
  };

  const cycleStatus = (bill: string, month: number) => {
    const current = getStatus(bill, month);
    const next: BillStatus = current === "pendente" ? "paga" : current === "paga" ? "divida" : "pendente";
    onUpdate(bill, month, next, selectedYear);
  };

  const handleAttachClick = (bill: string, month: number) => {
    pendingTarget.current = { bill, month };
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && pendingTarget.current) {
      onAttach(pendingTarget.current.bill, pendingTarget.current.month, file);
    }
    pendingTarget.current = null;
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleAddBill = () => {
    const name = newBillName.trim();
    if (!name || billNames.includes(name)) return;
    onAddBill({
      id: crypto.randomUUID(),
      item: name,
      dueDay: 1,
      account: "",
      monthlyValues: {},
      monthlyResponsible: {},
      monthlyPaid: {},
    });
    setNewBillName("");
    setShowAddBill(false);
  };

  const handleRemoveBill = (billName: string) => {
    const expense = fixedExpenses.find(e => e.item === billName);
    if (expense) onRemoveBill(expense.id);
  };

  const statusLabel = (s: BillStatus) => STATUS_OPTIONS.find((o) => o.value === s)?.label ?? s;

  // --- Annual Dashboard Data --- (data already filtered by year from parent)

  const totalFixedYear = Array.from({ length: 12 }, (_, m) =>
    fixedExpenses.reduce((s, e) => s + (e.monthlyValues[m] ?? 0), 0)
  ).reduce((a, b) => a + b, 0);

  const totalVariableYear = variableExpenses.reduce((s, e) => s + e.value, 0);
  const totalYear = totalFixedYear + totalVariableYear;

  // Monthly breakdown for bar chart
  const monthlyData = MONTHS.map((label, m) => {
    const fixed = fixedExpenses.reduce((s, e) => s + (e.monthlyValues[m] ?? 0), 0);
    const variable = variableExpenses.filter((e) => new Date(e.date).getMonth() === m).reduce((s, e) => s + e.value, 0);
    return { name: label, Fixos: fixed, Variáveis: variable };
  });

  // Per person annual
  const personData = people.map((person) => {
    const fixed = Array.from({ length: 12 }, (_, m) =>
      fixedExpenses.filter((e) => e.monthlyResponsible[m] === person).reduce((s, e) => s + (e.monthlyValues[m] ?? 0), 0)
    ).reduce((a, b) => a + b, 0);
    const variable = variableExpenses.filter((e) => e.responsible === person).reduce((s, e) => s + e.value, 0);
    return { name: person, value: fixed + variable };
  }).filter((d) => d.value > 0);

  // Category breakdown for variable expenses
  const categoryData = variableExpenses.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] ?? 0) + e.value;
    return acc;
  }, {});
  const categoryPieData = Object.entries(categoryData).map(([name, value]) => ({ name, value }));

  // Goals summary
  const totalGoalsCurrent = goals.reduce((s, g) => s + g.currentValue, 0);
  const totalGoalsTarget = goals.reduce((s, g) => s + g.totalValue, 0);
  const goalsPct = totalGoalsTarget > 0 ? (totalGoalsCurrent / totalGoalsTarget) * 100 : 0;

  return (
    <motion.div initial={{ opacity: 0, x: 4 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.2 }}>
      <input ref={fileInputRef} type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={handleFileChange} />

      {/* --- ANNUAL DASHBOARD --- */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-foreground mb-1">Dashboard Anual</h2>
        <p className="text-sm text-text-muted mb-4">Resumo completo do ano</p>

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-surface rounded-xl shadow-card border border-border-subtle/60 p-4">
            <span className="label-caps">Total Anual</span>
            <p className="text-lg sm:text-xl font-semibold text-foreground font-mono tabular-nums mt-1">{fmt(totalYear)}</p>
          </div>
          <div className="bg-surface rounded-xl shadow-card border border-border-subtle/60 p-4">
            <span className="label-caps">Gastos Fixos</span>
            <p className="text-lg sm:text-xl font-semibold text-primary font-mono tabular-nums mt-1">{fmt(totalFixedYear)}</p>
          </div>
          <div className="bg-surface rounded-xl shadow-card border border-border-subtle/60 p-4">
            <span className="label-caps">Gastos Variáveis</span>
            <p className="text-lg sm:text-xl font-semibold text-accent font-mono tabular-nums mt-1">{fmt(totalVariableYear)}</p>
          </div>
          <div className="bg-surface rounded-xl shadow-card border border-border-subtle/60 p-4">
            <span className="label-caps">Metas</span>
            <p className="text-lg sm:text-xl font-semibold text-status-paid font-mono tabular-nums mt-1">{goalsPct.toFixed(1)}%</p>
            <div className="mt-2 h-2 bg-secondary rounded-full overflow-hidden">
              <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(goalsPct, 100)}%` }}
                transition={{ duration: 0.8 }} className="h-full bg-status-paid rounded-full" />
            </div>
          </div>
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {/* Monthly bar chart */}
          <div className="bg-surface rounded-xl shadow-card border border-border-subtle/60 p-5">
            <span className="label-caps mb-3 block">Gastos Mensais</span>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData} margin={{ left: 0, right: 8, top: 4, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border-subtle))" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--text-muted))" }} />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(var(--text-muted))" }} tickFormatter={(v) => `€${v}`} />
                  <Tooltip formatter={(value: number) => fmt(value)} contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(var(--border-subtle))" }} />
                  <Bar dataKey="Fixos" stackId="a" fill="hsl(var(--primary))" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="Variáveis" stackId="a" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Category pie chart */}
          <div className="bg-surface rounded-xl shadow-card border border-border-subtle/60 p-5">
            <span className="label-caps mb-3 block">Variáveis por Categoria</span>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={categoryPieData} dataKey="value" cx="50%" cy="50%" outerRadius={70} innerRadius={40} paddingAngle={3} strokeWidth={0}>
                    {categoryPieData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => fmt(value)} contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(var(--border-subtle))" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-3 justify-center mt-2">
              {categoryPieData.map((d, i) => (
                <span key={i} className="flex items-center gap-1.5 text-xs text-text-secondary">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                  {d.name}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Per person + Goals summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {/* Per person */}
          <div className="bg-surface rounded-xl shadow-card border border-border-subtle/60 p-5">
            <span className="label-caps mb-3 block">Total por Pessoa (Ano)</span>
            <div className="space-y-3">
              {personData.map((p) => {
                const pct = totalYear > 0 ? (p.value / totalYear) * 100 : 0;
                return (
                  <div key={p.name} className="flex items-center gap-3">
                    <span className="text-sm font-medium text-foreground w-20 shrink-0">{p.name}</span>
                    <div className="flex-1 h-2.5 bg-secondary rounded-full overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.5 }}
                        className="h-full bg-primary rounded-full" />
                    </div>
                    <span className="text-xs font-mono tabular-nums text-text-secondary w-24 text-right">{fmt(p.value)}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Goals summary */}
          <div className="bg-surface rounded-xl shadow-card border border-border-subtle/60 p-5">
            <span className="label-caps mb-3 block">Resumo de Metas</span>
            <div className="space-y-3">
              {(["short", "medium", "long"] as const).map((term) => {
                const termGoals = goals.filter((g) => g.term === term);
                const current = termGoals.reduce((s, g) => s + g.currentValue, 0);
                const target = termGoals.reduce((s, g) => s + g.totalValue, 0);
                const pct = target > 0 ? (current / target) * 100 : 0;
                const colors = TERM_COLORS[term];
                return (
                  <div key={term}>
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs font-semibold ${colors.text}`}>{TERM_LABELS[term]}</span>
                      <span className="text-xs font-mono tabular-nums text-text-secondary">{fmt(current)} / {fmt(target)}</span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(pct, 100)}%` }}
                        transition={{ duration: 0.6 }} className={`h-full rounded-full ${colors.bar}`} />
                    </div>
                    <p className="text-[10px] text-text-muted mt-0.5">{termGoals.length} metas · {pct.toFixed(0)}%</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* --- BILL TRACKING --- */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-foreground">Controlo de Contas</h2>
        <p className="text-sm text-text-muted mt-0.5">Clique no status para alternar · 📎 para anexar comprovativo</p>
      </div>

      {/* Add bill form */}
      {showAddBill ? (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="bg-surface rounded-xl shadow-card border border-border-subtle/60 p-4 mb-4">
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="label-caps mb-1.5 block">Nome da despesa</label>
              <input value={newBillName} onChange={(e) => setNewBillName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddBill()}
                placeholder="Ex: Água, Eletricidade, Internet..."
                className="w-full text-sm bg-background border border-border-subtle rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <button onClick={handleAddBill} className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">Adicionar</button>
            <button onClick={() => { setShowAddBill(false); setNewBillName(""); }} className="px-3 py-2 rounded-lg border border-border-subtle text-sm text-text-muted hover:bg-surface-hover transition-colors">✕</button>
          </div>
        </motion.div>
      ) : (
        <button onClick={() => setShowAddBill(true)}
          className="flex items-center gap-1.5 px-3 py-2 mb-4 rounded-xl border border-dashed border-border-subtle text-sm text-text-muted hover:text-foreground hover:border-primary/50 transition-colors">
          <Plus className="h-4 w-4" /> Adicionar nova despesa
        </button>
      )}

      {/* Legend */}
      <div className="flex gap-3 mb-4 flex-wrap">
        {STATUS_OPTIONS.map((s) => (
          <div key={s.value} className="flex items-center gap-1.5">
            <span className={`inline-block h-2.5 w-2.5 rounded-full ${s.value === "pendente" ? "bg-status-pending" : s.value === "paga" ? "bg-status-paid" : "bg-status-negative"}`} />
            <span className="text-xs text-text-muted">{s.label}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <FileCheck className="h-3 w-3 text-status-paid" />
          <span className="text-xs text-text-muted">Com comprovativo</span>
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden sm:block bg-surface rounded-xl shadow-card border border-border-subtle/60 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-subtle/60">
              <th className="text-left px-4 py-3 label-caps sticky left-0 bg-surface z-10 min-w-[140px]">Conta</th>
              {MONTHS.map((m, i) => (
                <th key={i} className="px-2 py-3 label-caps text-center min-w-[85px]">{m}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle/40">
            {billNames.map((bill) => (
              <tr key={bill} className="hover:bg-surface-hover transition-colors group">
                <td className="px-4 py-2.5 font-semibold text-foreground sticky left-0 bg-surface z-10">
                  <div className="flex items-center gap-2">
                    <span>{bill}</span>
                    <button onClick={() => handleRemoveBill(bill)} className="text-text-muted hover:text-status-negative transition-colors opacity-0 group-hover:opacity-100" title="Remover despesa">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
                {MONTHS.map((_, monthIdx) => {
                  const status = getStatus(bill, monthIdx);
                  const attachment = getAttachment(bill, monthIdx);
                  return (
                    <td key={monthIdx} className="px-1 py-2 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <button onClick={() => cycleStatus(bill, monthIdx)}
                          className={`inline-block text-[10px] font-bold px-2 py-1 rounded-md border transition-all hover:scale-105 ${statusStyles[status]}`}>
                          {statusLabel(status)}
                        </button>
                        {attachment ? (
                          <div className="flex items-center gap-0.5">
                            <a href={attachment.fileUrl} target="_blank" rel="noopener noreferrer" title={attachment.fileName}
                              className="text-status-paid hover:scale-110 transition-transform">
                              <FileCheck className="h-3.5 w-3.5" />
                            </a>
                            <button onClick={() => onRemoveAttachment(bill, monthIdx)}
                              className="text-text-muted hover:text-status-negative transition-colors" title="Remover comprovativo">
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => handleAttachClick(bill, monthIdx)}
                            className="text-text-muted hover:text-foreground transition-colors" title="Anexar comprovativo">
                            <Paperclip className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: card-based layout */}
      <div className="sm:hidden space-y-4">
        {billNames.map((bill) => (
          <div key={bill} className="bg-surface rounded-xl shadow-card border border-border-subtle/60 overflow-hidden">
            <div className="px-4 py-3 border-b border-border-subtle/40 flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground">{bill}</span>
              <button onClick={() => handleRemoveBill(bill)} className="text-text-muted hover:text-status-negative transition-colors" title="Remover despesa">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="grid grid-cols-4 gap-px bg-border-subtle/30">
              {MONTHS.map((m, monthIdx) => {
                const status = getStatus(bill, monthIdx);
                const attachment = getAttachment(bill, monthIdx);
                return (
                  <div key={monthIdx} className="bg-surface p-2 flex flex-col items-center gap-1">
                    <span className="text-[10px] text-text-muted font-medium">{m}</span>
                    <button onClick={() => cycleStatus(bill, monthIdx)}
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${statusStyles[status]}`}>
                      {statusLabel(status).slice(0, 4)}
                    </button>
                    {attachment ? (
                      <div className="flex items-center gap-0.5">
                        <a href={attachment.fileUrl} target="_blank" rel="noopener noreferrer" className="text-status-paid">
                          <FileCheck className="h-3 w-3" />
                        </a>
                        <button onClick={() => onRemoveAttachment(bill, monthIdx)} className="text-text-muted">
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => handleAttachClick(bill, monthIdx)} className="text-text-muted">
                        <Paperclip className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
};
