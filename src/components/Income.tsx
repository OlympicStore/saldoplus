import { motion } from "framer-motion";
import { useState } from "react";
import { Plus, Trash2, Pencil, Check, X } from "lucide-react";
import type { Income as IncomeType, SalaryConfig } from "@/types/income";

interface IncomeProps {
  incomes: IncomeType[];
  salaryConfigs: SalaryConfig[];
  people: string[];
  selectedMonth: number;
  onAddIncome: (income: Omit<IncomeType, "id">) => void;
  onUpdateIncome: (id: string, updates: Partial<IncomeType>) => void;
  onDeleteIncome: (id: string) => void;
  onUpdateSalary: (person: string, updates: Partial<SalaryConfig>) => void;
}

const fmt = (v: number) => `€ ${v.toLocaleString("pt-PT", { minimumFractionDigits: 2 })}`;

export const Income = ({
  incomes, salaryConfigs, people, selectedMonth,
  onAddIncome, onUpdateIncome, onDeleteIncome, onUpdateSalary,
}: IncomeProps) => {
  const [showForm, setShowForm] = useState(false);
  const [editingSalary, setEditingSalary] = useState<string | null>(null);
  const [editSalaryVal, setEditSalaryVal] = useState("");
  const [newIncome, setNewIncome] = useState({ description: "", value: "", person: null as string | null, date: "" });

  const monthIncomes = incomes.filter((i) => new Date(i.date).getMonth() === selectedMonth);
  const activeSalaries = salaryConfigs.filter((s) => s.active);
  const totalSalary = activeSalaries.reduce((s, c) => s + (c.monthlyValues[selectedMonth] ?? 0), 0);
  const totalOther = monthIncomes.filter((i) => i.type === "other").reduce((s, i) => s + i.value, 0);
  const totalIncome = totalSalary + totalOther;

  const handleAdd = () => {
    const val = parseFloat(newIncome.value.replace(",", "."));
    if (!newIncome.description || isNaN(val)) return;
    const year = new Date().getFullYear();
    const date = newIncome.date || new Date(year, selectedMonth, 15).toISOString().split("T")[0];
    onAddIncome({ date, description: newIncome.description, value: val, person: newIncome.person, type: "other" });
    setNewIncome({ description: "", value: "", person: null, date: "" });
    setShowForm(false);
  };

  const startEditSalary = (person: string) => {
    const config = salaryConfigs.find((s) => s.person === person);
    setEditingSalary(person);
    const value = config ? (config.monthlyValues[selectedMonth] ?? 0) : 0;
    setEditSalaryVal(value.toFixed(2).replace(".", ","));
  };

  const saveSalary = (person: string) => {
    const num = parseFloat(editSalaryVal.replace(",", "."));
    if (!isNaN(num)) {
      const config = salaryConfigs.find((s) => s.person === person);
      const currentMonthlyValues = config?.monthlyValues ?? {};
      onUpdateSalary(person, { monthlyValues: { ...currentMonthlyValues, [selectedMonth]: num } });
    }
    setEditingSalary(null);
  };

  return (
    <motion.div initial={{ opacity: 0, x: 4 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.2 }}>
      <div className="flex items-center justify-between mb-6 gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Rendimentos</h2>
          <p className="text-sm text-text-muted mt-0.5">Entradas do mês</p>
        </div>
        <div className="text-right">
          <span className="label-caps">Total Entradas</span>
          <p className="text-xl sm:text-2xl font-semibold text-status-paid font-mono tabular-nums tracking-tight">
            {fmt(totalIncome)}
          </p>
        </div>
      </div>

      {/* Salários */}
      <div className="bg-surface rounded-xl shadow-card border border-border-subtle/60 p-5 mb-4">
        <span className="label-caps mb-3 block">Salários (este mês)</span>
        <div className="space-y-3">
          {people.map((person) => {
            const config = salaryConfigs.find((s) => s.person === person);
            const isActive = config?.active ?? false;
            const value = config?.monthlyValues[selectedMonth] ?? 0;
            return (
              <div key={person} className="flex items-center gap-3">
                <button
                  onClick={() => onUpdateSalary(person, { active: !isActive })}
                  className={`h-5 w-5 rounded border flex items-center justify-center transition-colors ${
                    isActive ? "bg-primary border-primary" : "border-border-subtle bg-background"
                  }`}
                >
                  {isActive && <Check className="h-3 w-3 text-primary-foreground" />}
                </button>
                <span className="text-sm font-medium text-foreground w-24 shrink-0">{person}</span>
                {editingSalary === person ? (
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      autoFocus
                      value={editSalaryVal}
                      onChange={(e) => setEditSalaryVal(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && saveSalary(person)}
                      className="w-28 text-sm font-mono bg-background border border-primary rounded-lg px-3 py-1.5 text-right focus:outline-none"
                    />
                    <button onClick={() => saveSalary(person)} className="text-status-paid"><Check className="h-4 w-4" /></button>
                    <button onClick={() => setEditingSalary(null)} className="text-text-muted"><X className="h-4 w-4" /></button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 flex-1">
                    <span className={`font-mono text-sm tabular-nums ${isActive ? "text-foreground" : "text-text-muted line-through"}`}>
                      {fmt(value)}
                    </span>
                    <button onClick={() => startEditSalary(person)} className="text-text-muted hover:text-foreground transition-colors">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Outros rendimentos */}
      <div className="flex items-center justify-between mb-3">
        <span className="label-caps">Outros Rendimentos</span>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
          <Plus className="h-4 w-4" /><span className="hidden sm:inline">Adicionar</span>
        </button>
      </div>

      {showForm && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="bg-surface rounded-xl shadow-card border border-border-subtle/60 p-4 mb-4">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
            <div className="sm:col-span-2">
              <label className="label-caps mb-1.5 block">Data</label>
              <input type="date" value={newIncome.date} onChange={(e) => setNewIncome({ ...newIncome, date: e.target.value })}
                className="w-full text-sm bg-background border border-border-subtle rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div className="sm:col-span-4">
              <label className="label-caps mb-1.5 block">Descrição</label>
              <input value={newIncome.description} onChange={(e) => setNewIncome({ ...newIncome, description: e.target.value })}
                placeholder="Ex: Freelance, Rendas"
                className="w-full text-sm bg-background border border-border-subtle rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div className="sm:col-span-2">
              <label className="label-caps mb-1.5 block">Valor (€)</label>
              <input value={newIncome.value} onChange={(e) => setNewIncome({ ...newIncome, value: e.target.value })}
                placeholder="0,00"
                className="w-full text-sm font-mono bg-background border border-border-subtle rounded-lg px-3 py-2 text-right focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div className="sm:col-span-2">
              <label className="label-caps mb-1.5 block">Pessoa</label>
              <select value={newIncome.person ?? ""} onChange={(e) => setNewIncome({ ...newIncome, person: e.target.value || null })}
                className="w-full text-sm bg-background border border-border-subtle rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary">
                <option value="">—</option>
                {people.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2 flex gap-2">
              <button onClick={handleAdd} className="flex-1 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">Adicionar</button>
              <button onClick={() => setShowForm(false)} className="px-3 py-2 rounded-lg border border-border-subtle text-sm text-text-muted hover:bg-surface-hover transition-colors">✕</button>
            </div>
          </div>
        </motion.div>
      )}

      <div className="bg-surface rounded-xl shadow-card border border-border-subtle/60 divide-y divide-border-subtle/40">
        {monthIncomes.filter((i) => i.type === "other").length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-text-muted">
            Nenhum rendimento extra neste mês.
          </div>
        ) : (
          monthIncomes.filter((i) => i.type === "other").map((income) => (
            <div key={income.id} className="px-4 py-3 hover:bg-surface-hover transition-colors">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">{income.description}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-text-muted">{new Date(income.date).toLocaleDateString("pt-PT")}</span>
                    {income.person && <span className="text-xs text-text-muted">· {income.person}</span>}
                  </div>
                </div>
                <span className="font-mono text-sm font-semibold text-status-paid tabular-nums shrink-0">
                  + {fmt(income.value)}
                </span>
                <button onClick={() => onDeleteIncome(income.id)} className="text-text-muted hover:text-status-negative transition-colors">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </motion.div>
  );
};
