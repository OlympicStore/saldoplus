import { motion } from "framer-motion";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { PersonSelector } from "./PersonSelector";
import type { FixedExpense, VariableExpense } from "@/types/expense";
import type { Category } from "@/types/category";
import type { Account } from "@/types/account";

interface ExpensesProps {
  fixedExpenses: FixedExpense[];
  variableExpenses: VariableExpense[];
  categories: Category[];
  accounts: Account[];
  people: string[];
  selectedMonth: number;
  onAddFixed: (expense: FixedExpense) => void;
  onUpdateFixed: (id: string, updates: Partial<FixedExpense>) => void;
  onUpdateFixedMonthly: (id: string, month: number, field: "value" | "responsible" | "paid", val: number | string | null | boolean) => void;
  onDeleteFixed: (id: string) => void;
  onAddVariable: (expense: Omit<VariableExpense, "id">) => void;
  onUpdateVariable: (id: string, updates: Partial<VariableExpense>) => void;
  onDeleteVariable: (id: string) => void;
}

const fmt = (v: number) => `€ ${v.toLocaleString("pt-PT", { minimumFractionDigits: 2 })}`;

type ExpenseRow = {
  id: string;
  kind: "fixed" | "variable";
  category: string;
  account: string;
  date: string;
  value: number;
  status: "pago" | "pendente";
  dueDay: number;
  type: "Fixo" | "Variável";
  description: string;
  responsible: string | null;
};

export const Expenses = ({
  fixedExpenses, variableExpenses, categories, accounts, people, selectedMonth,
  onAddFixed, onUpdateFixed, onUpdateFixedMonthly, onDeleteFixed,
  onAddVariable, onUpdateVariable, onDeleteVariable,
}: ExpensesProps) => {
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<"all" | "fixo" | "variavel">("all");
  const [newExpense, setNewExpense] = useState({
    category: "", account: "", date: "", value: "", dueDay: "1", description: "",
    responsible: null as string | null,
  });

  const getCategoryType = (catName: string): "Fixo" | "Variável" => {
    const cat = categories.find(c => c.name === catName);
    return cat?.type === "fixo" ? "Fixo" : "Variável";
  };

  const selectedCatType = newExpense.category ? getCategoryType(newExpense.category) : null;

  const rows: ExpenseRow[] = [
    ...fixedExpenses.map((e): ExpenseRow => ({
      id: e.id, kind: "fixed", category: e.item,
      account: "", date: "", value: e.monthlyValues[selectedMonth] ?? 0,
      status: e.monthlyPaid[selectedMonth] ? "pago" : "pendente",
      dueDay: e.dueDay, type: "Fixo", description: e.item,
      responsible: e.monthlyResponsible[selectedMonth] ?? null,
    })),
    ...variableExpenses
      .filter(e => new Date(e.date).getMonth() === selectedMonth)
      .map((e): ExpenseRow => ({
        id: e.id, kind: "variable", category: e.category,
        account: "", date: e.date, value: e.value,
        status: "pago", dueDay: 0, type: getCategoryType(e.category),
        description: e.description, responsible: e.responsible,
      })),
  ];

  const filtered = filter === "all" ? rows
    : filter === "fixo" ? rows.filter(r => r.type === "Fixo")
    : rows.filter(r => r.type === "Variável");

  const totalExpenses = filtered.reduce((s, r) => s + r.value, 0);
  const categoryNames = categories.map(c => c.name);
  if (!categoryNames.includes("Outros")) categoryNames.push("Outros");

  const handleAdd = () => {
    const val = parseFloat(newExpense.value.replace(",", "."));
    if (!newExpense.category || isNaN(val)) return;
    const catType = getCategoryType(newExpense.category);

    if (catType === "Fixo") {
      onAddFixed({
        id: crypto.randomUUID(),
        item: newExpense.description || newExpense.category,
        dueDay: parseInt(newExpense.dueDay) || 1,
        account: newExpense.account || "",
        monthlyValues: { [selectedMonth]: val },
        monthlyResponsible: { [selectedMonth]: newExpense.responsible },
        monthlyPaid: { [selectedMonth]: false },
      });
    } else {
      const year = new Date().getFullYear();
      const date = newExpense.date || new Date(year, selectedMonth, 15).toISOString().split("T")[0];
      onAddVariable({
        date, description: newExpense.description || newExpense.category,
        category: newExpense.category as any, value: val, responsible: newExpense.responsible,
        account: newExpense.account || "",
      });
    }
    setNewExpense({ category: "", account: "", date: "", value: "", dueDay: "1", description: "", responsible: null });
    setShowForm(false);
  };

  const handleDelete = (row: ExpenseRow) => {
    if (row.kind === "fixed") onDeleteFixed(row.id);
    else onDeleteVariable(row.id);
  };

  const toggleStatus = (row: ExpenseRow) => {
    if (row.kind === "fixed") {
      onUpdateFixedMonthly(row.id, selectedMonth, "paid", row.status !== "pago");
    }
  };

  return (
    <motion.div initial={{ opacity: 0, x: 4 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.2 }}>
      <div className="flex items-center justify-between mb-6 gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Despesas</h2>
          <p className="text-sm text-text-muted mt-0.5">{filtered.length} registros este mês</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1 bg-secondary rounded-lg p-0.5">
            {(["all", "fixo", "variavel"] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${filter === f ? "bg-background text-foreground shadow-sm" : "text-text-muted hover:text-foreground"}`}>
                {f === "all" ? "Todos" : f === "fixo" ? "Fixos" : "Variáveis"}
              </button>
            ))}
          </div>
          <div className="text-right hidden sm:block">
            <span className="label-caps">Total</span>
            <p className="text-xl font-semibold text-foreground font-mono tabular-nums tracking-tight">{fmt(totalExpenses)}</p>
          </div>
          <button onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
            <Plus className="h-4 w-4" /><span className="hidden sm:inline">Nova Despesa</span>
          </button>
        </div>
      </div>

      <div className="sm:hidden mb-4 text-right">
        <span className="label-caps">Total</span>
        <p className="text-xl font-semibold text-foreground font-mono tabular-nums tracking-tight">{fmt(totalExpenses)}</p>
      </div>

      {showForm && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="bg-surface rounded-xl shadow-card border border-border-subtle/60 p-4 mb-4">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
            <div className="sm:col-span-2">
              <label className="label-caps mb-1.5 block">Categoria</label>
              <select value={newExpense.category} onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })}
                className="w-full text-sm bg-background border border-border-subtle rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary">
                <option value="">Selecionar</option>
                {categoryNames.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="label-caps mb-1.5 block">Título</label>
              <input value={newExpense.description} onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                placeholder="Ex: Jantar McDonald's"
                className="w-full text-sm bg-background border border-border-subtle rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div className="sm:col-span-2">
              <label className="label-caps mb-1.5 block">Conta</label>
              <select value={newExpense.account} onChange={(e) => setNewExpense({ ...newExpense, account: e.target.value })}
                className="w-full text-sm bg-background border border-border-subtle rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary">
                <option value="">—</option>
                {accounts.map(a => <option key={a.id} value={a.name}>{a.name}</option>)}
              </select>
            </div>
            <div className="sm:col-span-1">
              <label className="label-caps mb-1.5 block">Valor (€)</label>
              <input value={newExpense.value} onChange={(e) => setNewExpense({ ...newExpense, value: e.target.value })}
                placeholder="0,00"
                className="w-full text-sm font-mono bg-background border border-border-subtle rounded-lg px-3 py-2 text-right focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            {selectedCatType === "Fixo" ? (
              <div className="sm:col-span-1">
                <label className="label-caps mb-1.5 block">Dia Venc.</label>
                <input type="number" min={1} max={31} value={newExpense.dueDay} onChange={(e) => setNewExpense({ ...newExpense, dueDay: e.target.value })}
                  className="w-full text-sm bg-background border border-border-subtle rounded-lg px-3 py-2 text-center focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>
            ) : (
              <div className="sm:col-span-1">
                <label className="label-caps mb-1.5 block">Data</label>
                <input type="date" value={newExpense.date} onChange={(e) => setNewExpense({ ...newExpense, date: e.target.value })}
                  className="w-full text-sm bg-background border border-border-subtle rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>
            )}
            <div className="sm:col-span-1">
              <label className="label-caps mb-1.5 block">Quem</label>
              <PersonSelector value={newExpense.responsible} onChange={(p) => setNewExpense({ ...newExpense, responsible: p })} people={people} />
            </div>
            <div className="sm:col-span-3 flex gap-2">
              <button onClick={handleAdd} className="flex-1 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">Adicionar</button>
              <button onClick={() => setShowForm(false)} className="px-3 py-2 rounded-lg border border-border-subtle text-sm text-text-muted hover:bg-surface-hover transition-colors">✕</button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Desktop header */}
      <div className="hidden sm:grid grid-cols-12 gap-2 px-4 py-2 mb-1">
        <span className="col-span-2 label-caps">Categoria</span>
        <span className="col-span-2 label-caps">Título</span>
        <span className="col-span-2 label-caps">Data / Dia Venc.</span>
        <span className="col-span-2 label-caps text-right">Valor</span>
        <span className="col-span-2 label-caps">Status</span>
        <span className="col-span-2 label-caps text-right">Tipo</span>
      </div>

      <div className="bg-surface rounded-xl shadow-card border border-border-subtle/60 divide-y divide-border-subtle/40">
        {filtered.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-text-muted">
            Nenhuma despesa neste mês. Clique em "Nova Despesa" para adicionar.
          </div>
        ) : filtered.map(row => (
          <div key={`${row.kind}-${row.id}`} className="px-4 py-3 hover:bg-surface-hover transition-colors">
            {/* Desktop */}
            <div className="hidden sm:grid grid-cols-12 gap-2 items-center">
              <div className="col-span-2 text-sm font-semibold text-foreground truncate">{row.category}</div>
              <div className="col-span-2 text-sm text-text-muted truncate">{row.description !== row.category ? row.description : "—"}</div>
              <div className="col-span-2 text-sm text-text-secondary">
                {row.kind === "fixed" ? `Dia ${row.dueDay}` : new Date(row.date).toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit" })}
              </div>
              <div className="col-span-2 text-right font-mono text-sm text-text-secondary tabular-nums">{fmt(row.value)}</div>
              <div className="col-span-2">
                <button onClick={() => toggleStatus(row)} className="flex items-center gap-1.5 group">
                  <div className={`h-2.5 w-2.5 rounded-full transition-colors ${row.status === "pago" ? "bg-status-paid" : "bg-status-pending"}`} />
                  <span className="text-xs text-text-muted group-hover:text-foreground transition-colors capitalize">{row.status}</span>
                </button>
              </div>
              <div className="col-span-2 flex items-center justify-end gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full ${row.type === "Fixo" ? "bg-blue-500/10 text-blue-600" : "bg-amber-500/10 text-amber-600"}`}>
                  {row.type}
                </span>
                <button onClick={() => handleDelete(row)} className="text-text-muted hover:text-status-negative transition-colors">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Mobile */}
            <div className="sm:hidden space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm font-semibold text-foreground truncate">{row.category}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full shrink-0 ${row.type === "Fixo" ? "bg-blue-500/10 text-blue-600" : "bg-amber-500/10 text-amber-600"}`}>
                    {row.type}
                  </span>
                </div>
                <button onClick={() => handleDelete(row)} className="text-text-muted hover:text-status-negative transition-colors">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              {row.description !== row.category && (
                <p className="text-xs text-text-muted truncate">{row.description}</p>
              )}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-text-muted">
                    {row.kind === "fixed" ? `Dia ${row.dueDay}` : new Date(row.date).toLocaleDateString("pt-PT")}
                  </span>
                  <button onClick={() => toggleStatus(row)} className="flex items-center gap-1">
                    <div className={`h-2 w-2 rounded-full ${row.status === "pago" ? "bg-status-paid" : "bg-status-pending"}`} />
                    <span className="text-xs text-text-muted capitalize">{row.status}</span>
                  </button>
                </div>
                <span className="font-mono text-sm text-text-secondary tabular-nums">{fmt(row.value)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
};
