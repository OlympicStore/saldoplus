import { motion } from "framer-motion";
import { useState } from "react";
import { Plus, Trash2, Briefcase, Laptop, Award, RotateCcw, TrendingUp, MoreHorizontal } from "lucide-react";

const CATEGORIES = [
  { value: "Salário", icon: Briefcase, color: "text-emerald-600", bg: "bg-emerald-50", ring: "ring-emerald-500" },
  { value: "Freelance", icon: Laptop, color: "text-blue-600", bg: "bg-blue-50", ring: "ring-blue-500" },
  { value: "Prémio", icon: Award, color: "text-amber-600", bg: "bg-amber-50", ring: "ring-amber-500" },
  { value: "Reembolso", icon: RotateCcw, color: "text-purple-600", bg: "bg-purple-50", ring: "ring-purple-500" },
  { value: "Investimento", icon: TrendingUp, color: "text-teal-600", bg: "bg-teal-50", ring: "ring-teal-500" },
  { value: "Outros", icon: MoreHorizontal, color: "text-slate-600", bg: "bg-slate-100", ring: "ring-slate-400" },
] as const;
import type { Income as IncomeType, SalaryConfig } from "@/types/income";
import type { Account } from "@/types/account";
import type { Transfer } from "@/types/transfer";
import { TransfersBetweenAccounts } from "./TransfersBetweenAccounts";

interface EntriesProps {
  incomes: IncomeType[];
  salaryConfigs: SalaryConfig[];
  accounts: Account[];
  transfers: Transfer[];
  people: string[];
  selectedMonth: number;
  onAddIncome: (income: Omit<IncomeType, "id">) => void;
  onUpdateIncome: (id: string, updates: Partial<IncomeType>) => void;
  onDeleteIncome: (id: string) => void;
  onUpdateSalary: (person: string, updates: Partial<SalaryConfig>) => void;
  onAddTransfer: (transfer: Omit<Transfer, "id">) => void;
  onDeleteTransfer: (id: string) => void;
}

const fmt = (v: number) => `€ ${v.toLocaleString("pt-PT", { minimumFractionDigits: 2 })}`;

export const Entries = ({
  incomes, salaryConfigs, accounts, transfers, people, selectedMonth,
  onAddIncome, onUpdateIncome, onDeleteIncome, onUpdateSalary, onAddTransfer, onDeleteTransfer,
}: EntriesProps) => {
  const [showForm, setShowForm] = useState(false);
  const [newEntry, setNewEntry] = useState({ category: "Salário", account: "", value: "", date: "", description: "" });

  const monthIncomes = incomes.filter(i => new Date(i.date).getMonth() === selectedMonth);
  const totalEntries = monthIncomes.reduce((s, i) => s + i.value, 0);

  const handleAdd = () => {
    const val = parseFloat(newEntry.value.replace(",", "."));
    if (isNaN(val)) return;
    const year = new Date().getFullYear();
    const date = newEntry.date || new Date(year, selectedMonth, 15).toISOString().split("T")[0];
    const type = newEntry.category === "Salário" ? "salary" as const : "other" as const;
    onAddIncome({
      date, description: newEntry.description || newEntry.category,
      value: val, person: null, type, account: newEntry.account,
    });
    setNewEntry({ category: "Salário", account: "", value: "", date: "", description: "" });
    setShowForm(false);
  };

  return (
    <motion.div initial={{ opacity: 0, x: 4 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.2 }}>
      <div className="flex items-center justify-between mb-6 gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Entradas</h2>
          <p className="text-sm text-text-muted mt-0.5">{monthIncomes.length} registros este mês</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="text-right hidden sm:block">
            <span className="label-caps">Total do Mês</span>
            <p className="text-xl font-semibold text-status-paid font-mono tabular-nums tracking-tight">{fmt(totalEntries)}</p>
          </div>
          <button onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
            <Plus className="h-4 w-4" /><span className="hidden sm:inline">Nova Entrada</span>
          </button>
        </div>
      </div>

      <div className="sm:hidden mb-4 text-right">
        <span className="label-caps">Total do Mês</span>
        <p className="text-xl font-semibold text-status-paid font-mono tabular-nums tracking-tight">{fmt(totalEntries)}</p>
      </div>

      {showForm && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="bg-surface rounded-xl shadow-card border border-border-subtle/60 p-4 mb-4">
          <div className="mb-4">
            <label className="label-caps mb-2 block">Categoria</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(cat => {
                const Icon = cat.icon;
                const active = newEntry.category === cat.value;
                return (
                  <button key={cat.value} type="button"
                    onClick={() => setNewEntry({ ...newEntry, category: cat.value })}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                      active
                        ? `${cat.bg} ${cat.color} border-transparent ring-2 ${cat.ring} ring-offset-1`
                        : "bg-background text-text-muted border-border-subtle hover:bg-surface-hover"
                    }`}>
                    <Icon className="h-3.5 w-3.5" />
                    {cat.value}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
            <div className="sm:col-span-4">
              <label className="label-caps mb-1.5 block">Descrição</label>
              <input value={newEntry.description} onChange={(e) => setNewEntry({ ...newEntry, description: e.target.value })}
                placeholder="Ex: Salário Janeiro, Projeto X..."
                className="w-full text-sm bg-background border border-border-subtle rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div className="sm:col-span-3">
              <label className="label-caps mb-1.5 block">Conta</label>
              <select value={newEntry.account} onChange={(e) => setNewEntry({ ...newEntry, account: e.target.value })}
                className="w-full text-sm bg-background border border-border-subtle rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary">
                <option value="">—</option>
                {accounts.map(a => <option key={a.id} value={a.name}>{a.name}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="label-caps mb-1.5 block">Valor (€)</label>
              <input value={newEntry.value} onChange={(e) => setNewEntry({ ...newEntry, value: e.target.value })}
                placeholder="0,00"
                className="w-full text-sm font-mono bg-background border border-border-subtle rounded-lg px-3 py-2 text-right focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div className="sm:col-span-3">
              <label className="label-caps mb-1.5 block">Data</label>
              <input type="date" value={newEntry.date} onChange={(e) => setNewEntry({ ...newEntry, date: e.target.value })}
                className="w-full text-sm bg-background border border-border-subtle rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
          </div>

          <div className="flex gap-2 mt-4 justify-end">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg border border-border-subtle text-sm text-text-muted hover:bg-surface-hover transition-colors">Cancelar</button>
            <button onClick={handleAdd} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">Adicionar entrada</button>
          </div>
        </motion.div>
      )}

      {/* Desktop header */}
      <div className="hidden sm:grid grid-cols-12 gap-2 px-4 py-2 mb-1">
        <span className="col-span-2 label-caps">Categoria</span>
        <span className="col-span-3 label-caps">Descrição</span>
        <span className="col-span-2 label-caps">Conta</span>
        <span className="col-span-2 label-caps text-right">Valor</span>
        <span className="col-span-2 label-caps">Data</span>
        <span className="col-span-1"></span>
      </div>

      <div className="bg-surface rounded-xl shadow-card border border-border-subtle/60 divide-y divide-border-subtle/40">
        {monthIncomes.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-text-muted">
            Nenhuma entrada neste mês. Clique em "Nova Entrada" para adicionar.
          </div>
        ) : monthIncomes.map(row => (
          <div key={row.id} className="px-4 py-3 hover:bg-surface-hover transition-colors">
            <div className="hidden sm:grid grid-cols-12 gap-2 items-center">
              <div className="col-span-2 text-sm font-semibold text-foreground">
                {row.type === "salary" ? "Salário" : "Outros"}
              </div>
              <div className="col-span-3 text-sm text-text-muted truncate">{row.description || "—"}</div>
              <div className="col-span-2 text-sm text-text-muted">{row.account || "—"}</div>
              <div className="col-span-2 text-right font-mono text-sm text-status-paid tabular-nums font-semibold">+ {fmt(row.value)}</div>
              <div className="col-span-2 text-sm text-text-muted">
                {row.date ? new Date(row.date).toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit" }) : "—"}
              </div>
              <div className="col-span-1 text-right">
                <button onClick={() => onDeleteIncome(row.id)} className="text-text-muted hover:text-status-negative transition-colors">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Mobile */}
            <div className="sm:hidden">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <span className="text-sm font-semibold text-foreground">{row.type === "salary" ? "Salário" : "Outros"}</span>
                  {row.description && <p className="text-xs text-text-muted truncate">{row.description}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm text-status-paid tabular-nums font-semibold">+ {fmt(row.value)}</span>
                  <button onClick={() => onDeleteIncome(row.id)} className="text-text-muted hover:text-status-negative transition-colors">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              {row.date && <p className="text-xs text-text-muted mt-0.5">{new Date(row.date).toLocaleDateString("pt-PT")}</p>}
            </div>
          </div>
        ))}
      </div>

      <TransfersBetweenAccounts
        transfers={transfers}
        accounts={accounts}
        selectedMonth={selectedMonth}
        onAdd={onAddTransfer}
        onDelete={onDeleteTransfer}
      />
    </motion.div>
  );
};
