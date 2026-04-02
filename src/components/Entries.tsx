import { motion } from "framer-motion";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { Income as IncomeType, SalaryConfig } from "@/types/income";
import type { Account } from "@/types/account";

interface EntriesProps {
  incomes: IncomeType[];
  salaryConfigs: SalaryConfig[];
  accounts: Account[];
  people: string[];
  selectedMonth: number;
  onAddIncome: (income: Omit<IncomeType, "id">) => void;
  onUpdateIncome: (id: string, updates: Partial<IncomeType>) => void;
  onDeleteIncome: (id: string) => void;
  onUpdateSalary: (person: string, updates: Partial<SalaryConfig>) => void;
}

const fmt = (v: number) => `€ ${v.toLocaleString("pt-PT", { minimumFractionDigits: 2 })}`;

const ENTRY_CATEGORIES = ["Salário 1", "Salário 2", "Outros"];

export const Entries = ({
  incomes, salaryConfigs, accounts, people, selectedMonth,
  onAddIncome, onUpdateIncome, onDeleteIncome, onUpdateSalary,
}: EntriesProps) => {
  const [showForm, setShowForm] = useState(false);
  const [newEntry, setNewEntry] = useState({ category: "Outros", account: "", value: "", date: "", description: "" });

  const monthIncomes = incomes.filter(i => new Date(i.date).getMonth() === selectedMonth);
  const activeSalaries = salaryConfigs.filter(s => s.active);
  const totalSalary = activeSalaries.reduce((s, c) => s + (c.monthlyValues[selectedMonth] ?? 0), 0);
  const totalOther = monthIncomes.filter(i => i.type === "other").reduce((s, i) => s + i.value, 0);
  const totalEntries = totalSalary + totalOther;

  // Build rows: salaries + other incomes
  const rows = [
    ...activeSalaries.map(s => ({
      id: `salary-${s.person}`, type: "salary" as const,
      category: `Salário - ${s.person}`, account: "",
      value: s.monthlyValues[selectedMonth] ?? 0,
      date: "", person: s.person,
    })),
    ...monthIncomes.filter(i => i.type === "other").map(i => ({
      id: i.id, type: "other" as const,
      category: "Outros", account: "",
      value: i.value, date: i.date, person: i.person,
    })),
  ];

  const handleAdd = () => {
    const val = parseFloat(newEntry.value.replace(",", "."));
    if (isNaN(val)) return;

    if (newEntry.category.startsWith("Salário")) {
      // Update salary config for first person
      const person = people[parseInt(newEntry.category.replace("Salário ", "")) - 1] || people[0];
      if (person) {
        const config = salaryConfigs.find(s => s.person === person);
        const currentValues = config?.monthlyValues ?? {};
        onUpdateSalary(person, { monthlyValues: { ...currentValues, [selectedMonth]: val }, active: true });
      }
    } else {
      const year = new Date().getFullYear();
      const date = newEntry.date || new Date(year, selectedMonth, 15).toISOString().split("T")[0];
      onAddIncome({
        date, description: newEntry.description || "Outro rendimento",
        value: val, person: null, type: "other", account: newEntry.account,
      });
    }
    setNewEntry({ category: "Outros", account: "", value: "", date: "", description: "" });
    setShowForm(false);
  };

  return (
    <motion.div initial={{ opacity: 0, x: 4 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.2 }}>
      <div className="flex items-center justify-between mb-6 gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Entradas</h2>
          <p className="text-sm text-text-muted mt-0.5">{rows.length} registros este mês</p>
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
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
            <div className="sm:col-span-2">
              <label className="label-caps mb-1.5 block">Categoria</label>
              <select value={newEntry.category} onChange={(e) => setNewEntry({ ...newEntry, category: e.target.value })}
                className="w-full text-sm bg-background border border-border-subtle rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary">
                {ENTRY_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
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
            <div className="sm:col-span-2">
              <label className="label-caps mb-1.5 block">Data</label>
              <input type="date" value={newEntry.date} onChange={(e) => setNewEntry({ ...newEntry, date: e.target.value })}
                className="w-full text-sm bg-background border border-border-subtle rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div className="sm:col-span-2">
              <label className="label-caps mb-1.5 block">Descrição</label>
              <input value={newEntry.description} onChange={(e) => setNewEntry({ ...newEntry, description: e.target.value })}
                placeholder="Ex: Freelance"
                className="w-full text-sm bg-background border border-border-subtle rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div className="sm:col-span-2 flex gap-2">
              <button onClick={handleAdd} className="flex-1 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">Adicionar</button>
              <button onClick={() => setShowForm(false)} className="px-3 py-2 rounded-lg border border-border-subtle text-sm text-text-muted hover:bg-surface-hover transition-colors">✕</button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Desktop header */}
      <div className="hidden sm:grid grid-cols-12 gap-2 px-4 py-2 mb-1">
        <span className="col-span-3 label-caps">Categoria</span>
        <span className="col-span-3 label-caps">Conta</span>
        <span className="col-span-3 label-caps text-right">Valor</span>
        <span className="col-span-2 label-caps">Data</span>
        <span className="col-span-1"></span>
      </div>

      <div className="bg-surface rounded-xl shadow-card border border-border-subtle/60 divide-y divide-border-subtle/40">
        {rows.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-text-muted">
            Nenhuma entrada neste mês. Clique em "Nova Entrada" para adicionar.
          </div>
        ) : rows.map(row => (
          <div key={row.id} className="px-4 py-3 hover:bg-surface-hover transition-colors">
            <div className="hidden sm:grid grid-cols-12 gap-2 items-center">
              <div className="col-span-3 text-sm font-semibold text-foreground">{row.category}</div>
              <div className="col-span-3 text-sm text-text-muted">{row.account || "—"}</div>
              <div className="col-span-3 text-right font-mono text-sm text-status-paid tabular-nums font-semibold">+ {fmt(row.value)}</div>
              <div className="col-span-2 text-sm text-text-muted">
                {row.date ? new Date(row.date).toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit" }) : "—"}
              </div>
              <div className="col-span-1 text-right">
                {row.type === "other" && (
                  <button onClick={() => onDeleteIncome(row.id)} className="text-text-muted hover:text-status-negative transition-colors">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Mobile */}
            <div className="sm:hidden">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-foreground">{row.category}</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm text-status-paid tabular-nums font-semibold">+ {fmt(row.value)}</span>
                  {row.type === "other" && (
                    <button onClick={() => onDeleteIncome(row.id)} className="text-text-muted hover:text-status-negative transition-colors">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
              {row.date && <p className="text-xs text-text-muted mt-0.5">{new Date(row.date).toLocaleDateString("pt-PT")}</p>}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
};
