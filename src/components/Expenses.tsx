import { motion } from "framer-motion";
import { useState } from "react";
import { Plus, Trash2, Tag, Sparkles } from "lucide-react";
import { PersonSelector } from "./PersonSelector";
import type { FixedExpense, VariableExpense } from "@/types/expense";
import type { Category, CategoryType } from "@/types/category";
import { CATEGORY_TYPE_LABELS, CATEGORY_TYPE_SHORT, CATEGORY_TYPE_COLORS } from "@/types/category";
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
  onAddCategoryItem?: (category: Omit<Category, "id">) => void | Promise<unknown>;
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
  type: CategoryType;
  description: string;
  responsible: string | null;
  recurring: boolean;
};

const filterOptions: { key: "all" | CategoryType; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "fixo", label: "Fixas" },
  { key: "inevitavel", label: "Inevitáveis" },
  { key: "nao_essencial", label: "Não-essenciais" },
];

export const Expenses = ({
  fixedExpenses, variableExpenses, categories, accounts, people, selectedMonth,
  onAddFixed, onUpdateFixed, onUpdateFixedMonthly, onDeleteFixed,
  onAddVariable, onUpdateVariable, onDeleteVariable, onAddCategoryItem,
}: ExpensesProps) => {
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<"all" | CategoryType>("all");
  const [addingTypeCategory, setAddingTypeCategory] = useState<CategoryType | null>(null);
  const [newTypeCategoryName, setNewTypeCategoryName] = useState("");
  const [newExpense, setNewExpense] = useState({
    category: "", customCategory: "", account: "", date: "", value: "", dueDay: "1", description: "",
    responsible: null as string | null, recurring: false,
  });

  const getCategoryType = (catName: string): CategoryType => {
    const cat = categories.find(c => c.name === catName);
    return cat?.type ?? "inevitavel";
  };

  const selectedCatType: CategoryType | null = newExpense.category === "__custom" ? "inevitavel" : newExpense.category ? getCategoryType(newExpense.category) : null;

  const rows: ExpenseRow[] = [
    ...fixedExpenses.map((e): ExpenseRow => ({
      id: e.id, kind: "fixed", category: e.item,
      account: "", date: "", value: e.monthlyValues[selectedMonth] ?? 0,
      status: e.monthlyPaid[selectedMonth] ? "pago" : "pendente",
      dueDay: e.dueDay, type: "fixo", description: e.item,
      responsible: e.monthlyResponsible[selectedMonth] ?? null, recurring: false,
    })),
    ...variableExpenses
      .filter(e => new Date(e.date).getMonth() === selectedMonth)
      .map((e): ExpenseRow => ({
        id: e.id, kind: "variable", category: e.category,
        account: "", date: e.date, value: e.value,
        status: "pago", dueDay: 0, type: getCategoryType(e.category),
        description: e.description, responsible: e.responsible,
        recurring: e.recurring ?? false,
      })),
  ];

  const filtered = filter === "all" ? rows : rows.filter(r => r.type === filter);

  const totalExpenses = filtered.reduce((s, r) => s + r.value, 0);
  const categoryNames = categories.map(c => c.name);

  const handleAdd = () => {
    const val = parseFloat(newExpense.value.replace(",", "."));
    const finalCategory = newExpense.category === "__custom" ? newExpense.customCategory.trim() : newExpense.category;
    if (!finalCategory || isNaN(val)) return;
    const catType = getCategoryType(finalCategory);

    if (catType === "fixo") {
      onAddFixed({
        id: crypto.randomUUID(),
        item: newExpense.description || finalCategory,
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
        date, description: newExpense.description || finalCategory,
        category: finalCategory as any, value: val, responsible: newExpense.responsible,
        account: newExpense.account || "", recurring: newExpense.recurring,
      });
    }
    setNewExpense({ category: "", customCategory: "", account: "", date: "", value: "", dueDay: "1", description: "", responsible: null, recurring: false });
    setShowForm(false);
  };

  const handleDelete = (row: ExpenseRow) => {
    const label = row.description && row.description !== row.category ? row.description : row.category;
    if (!window.confirm(`Remover a despesa "${label}"?`)) return;
    if (row.kind === "fixed") onDeleteFixed(row.id);
    else onDeleteVariable(row.id);
  };

  const toggleStatus = (row: ExpenseRow) => {
    if (row.kind === "fixed") {
      onUpdateFixedMonthly(row.id, selectedMonth, "paid", row.status !== "pago");
    }
  };

  const getTypeColors = (type: CategoryType) => CATEGORY_TYPE_COLORS[type];

  return (
    <motion.div initial={{ opacity: 0, x: 4 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.2 }}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Despesas</h2>
          <p className="text-sm text-text-muted mt-0.5">{filtered.length} registros este mês</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-0.5 bg-secondary rounded-lg p-0.5 overflow-x-auto scrollbar-hide">
            {filterOptions.map(f => (
              <button key={f.key} onClick={() => setFilter(f.key)}
                className={`px-2 sm:px-2.5 py-1 text-[11px] sm:text-xs font-medium rounded-md transition-colors whitespace-nowrap ${filter === f.key ? "bg-background text-foreground shadow-sm" : "text-text-muted hover:text-foreground"}`}>
                {f.label}
              </button>
            ))}
          </div>
          <button onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
            <Plus className="h-4 w-4" /><span className="hidden sm:inline">Nova Despesa</span>
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="hidden sm:block">
          <span className="label-caps">Total</span>
          <p className="text-xl font-semibold text-foreground font-mono tabular-nums tracking-tight">{fmt(totalExpenses)}</p>
        </div>
        <div className="sm:hidden w-full text-right">
          <span className="label-caps">Total</span>
          <p className="text-xl font-semibold text-foreground font-mono tabular-nums tracking-tight">{fmt(totalExpenses)}</p>
        </div>
      </div>

      {showForm && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="bg-surface rounded-xl shadow-card border border-border-subtle/60 p-4 mb-4 space-y-4">
          {/* Category picker (pills grouped by type) */}
          <div>
            <label className="label-caps mb-2 block">Categoria</label>
            <div className="space-y-2.5">
              {(["fixo", "inevitavel", "nao_essencial"] as CategoryType[]).map(type => {
                const cats = categories.filter(c => c.type === type);
                const colors = CATEGORY_TYPE_COLORS[type];
                const isAdding = addingTypeCategory === type;
                const commitNew = async () => {
                  const name = newTypeCategoryName.trim();
                  if (!name) { setAddingTypeCategory(null); return; }
                  if (!categories.some(c => c.name.toLowerCase() === name.toLowerCase()) && onAddCategoryItem) {
                    await onAddCategoryItem({ name, type });
                  }
                  setNewExpense({ ...newExpense, category: name, customCategory: "" });
                  setNewTypeCategoryName("");
                  setAddingTypeCategory(null);
                };
                return (
                  <div key={type} className="flex items-start gap-2 flex-wrap">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md ${colors.bg} ${colors.text} shrink-0`}>
                      {CATEGORY_TYPE_LABELS[type]}
                    </span>
                    <div className="flex flex-wrap gap-1.5 flex-1">
                      {cats.map(cat => {
                        const active = newExpense.category === cat.name;
                        return (
                          <button key={cat.id} type="button"
                            onClick={() => setNewExpense({ ...newExpense, category: cat.name, customCategory: "" })}
                            className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-all ${
                              active
                                ? `${colors.bg} ${colors.text} ${colors.border} ring-2 ring-primary/30 font-semibold`
                                : "bg-background border-border-subtle text-text-secondary hover:border-primary/40 hover:bg-surface-hover"
                            }`}>
                            <Tag className="h-3 w-3" />
                            {cat.name}
                          </button>
                        );
                      })}
                      {isAdding ? (
                        <input autoFocus value={newTypeCategoryName}
                          onChange={(e) => setNewTypeCategoryName(e.target.value)}
                          onBlur={commitNew}
                          onKeyDown={(e) => { if (e.key === "Enter") commitNew(); if (e.key === "Escape") { setAddingTypeCategory(null); setNewTypeCategoryName(""); } }}
                          placeholder="Nome…"
                          className={`text-xs px-2.5 py-1.5 rounded-lg border ${colors.border} ${colors.bg} ${colors.text} placeholder:opacity-60 focus:outline-none focus:ring-1 focus:ring-primary w-32`} />
                      ) : (
                        <button type="button" title={`Adicionar categoria ${CATEGORY_TYPE_LABELS[type]}`}
                          onClick={() => { setAddingTypeCategory(type); setNewTypeCategoryName(""); }}
                          className={`inline-flex items-center justify-center text-xs px-2 py-1.5 rounded-lg border border-dashed ${colors.border} ${colors.text} hover:${colors.bg} transition-colors`}>
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
              <button type="button"
                onClick={() => setNewExpense({ ...newExpense, category: "__custom" })}
                className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border border-dashed transition-colors ${
                  newExpense.category === "__custom"
                    ? "border-primary text-primary bg-primary/5"
                    : "border-border-subtle text-text-muted hover:border-primary hover:text-primary"
                }`}>
                <Sparkles className="h-3 w-3" />
                Nova categoria
              </button>
              {newExpense.category === "__custom" && (
                <input autoFocus value={newExpense.customCategory} onChange={(e) => setNewExpense({ ...newExpense, customCategory: e.target.value })}
                  placeholder="Nome da categoria (ex: Netflix, Gasolina)"
                  className="w-full sm:max-w-xs text-sm bg-background border border-border-subtle rounded-lg px-3 py-2 mt-1 focus:outline-none focus:ring-1 focus:ring-primary" />
              )}
            </div>
          </div>

          <div className="border-t border-border-subtle/60 pt-4 grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
            <div className="sm:col-span-3">
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
            <div className="sm:col-span-2">
              <label className="label-caps mb-1.5 block">Valor (€)</label>
              <input value={newExpense.value} onChange={(e) => setNewExpense({ ...newExpense, value: e.target.value })}
                placeholder="0,00"
                className="w-full text-sm font-mono bg-background border border-border-subtle rounded-lg px-3 py-2 text-right focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            {selectedCatType === "fixo" ? (
              <div className="sm:col-span-1">
                <label className="label-caps mb-1.5 block">Dia</label>
                <input type="number" min={1} max={31} value={newExpense.dueDay} onChange={(e) => setNewExpense({ ...newExpense, dueDay: e.target.value })}
                  className="w-full text-sm bg-background border border-border-subtle rounded-lg px-3 py-2 text-center focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>
            ) : (
              <div className="sm:col-span-2">
                <label className="label-caps mb-1.5 block">Data</label>
                <input type="date" value={newExpense.date} onChange={(e) => setNewExpense({ ...newExpense, date: e.target.value })}
                  className="w-full text-sm bg-background border border-border-subtle rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>
            )}
            <div className="sm:col-span-2">
              <label className="label-caps mb-1.5 block">Quem</label>
              <PersonSelector value={newExpense.responsible} onChange={(p) => setNewExpense({ ...newExpense, responsible: p })} people={people} />
            </div>
            {selectedCatType && selectedCatType !== "fixo" && (
              <div className="sm:col-span-2 flex items-end pb-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={newExpense.recurring}
                    onChange={(e) => setNewExpense({ ...newExpense, recurring: e.target.checked })}
                    className="rounded border-border-subtle text-primary focus:ring-primary h-4 w-4" />
                  <span className="text-xs text-text-muted">Recorrente</span>
                </label>
              </div>
            )}
            <div className="sm:col-span-12 flex gap-2 justify-end pt-1">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg border border-border-subtle text-sm text-text-muted hover:bg-surface-hover transition-colors">Cancelar</button>
              <button onClick={handleAdd} className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">Adicionar despesa</button>
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
        ) : filtered.map(row => {
          const colors = getTypeColors(row.type);
          return (
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
                  <span className={`text-xs px-2 py-0.5 rounded-full ${colors.bg} ${colors.text}`}>
                    {CATEGORY_TYPE_SHORT[row.type]}
                  </span>
                  {row.recurring && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">Rec</span>
                  )}
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
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full shrink-0 ${colors.bg} ${colors.text}`}>
                      {CATEGORY_TYPE_SHORT[row.type]}
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
          );
        })}
      </div>
    </motion.div>
  );
};
