import { motion } from "framer-motion";
import { PersonBadge } from "./PersonBadge";
import { PersonSelector } from "./PersonSelector";
import type { VariableExpense } from "@/types/expense";
import { useState } from "react";
import { Plus, Pencil, Check, X, Trash2 } from "lucide-react";

interface VariableExpensesProps {
  expenses: VariableExpense[];
  people: string[];
  selectedMonth: number;
  categories: string[];
  onAdd: (expense: Omit<VariableExpense, "id">) => void;
  onUpdate: (id: string, updates: Partial<VariableExpense>) => void;
  onDelete: (id: string) => void;
  onAddCategory: (cat: string) => void;
  onDeleteCategory: (cat: string) => void;
}

export const VariableExpenses = ({
  expenses, people, selectedMonth, categories,
  onAdd, onUpdate, onDelete, onAddCategory, onDeleteCategory,
}: VariableExpensesProps) => {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editField, setEditField] = useState<"value" | "description" | "date" | null>(null);
  const [editValue, setEditValue] = useState("");
  const [showCategoryEditor, setShowCategoryEditor] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newExpense, setNewExpense] = useState({
    description: "",
    category: categories[0] || "",
    value: "",
    responsible: null as string | null,
    date: "",
  });

  const filtered = expenses.filter((e) => new Date(e.date).getMonth() === selectedMonth);
  const total = filtered.reduce((sum, e) => sum + e.value, 0);

  const startEdit = (expense: VariableExpense, field: "value" | "description" | "date") => {
    setEditingId(expense.id);
    setEditField(field);
    if (field === "value") setEditValue(expense.value.toFixed(2).replace(".", ","));
    else if (field === "description") setEditValue(expense.description);
    else setEditValue(expense.date);
  };

  const saveEdit = (id: string) => {
    if (editField === "value") {
      const num = parseFloat(editValue.replace(",", "."));
      if (!isNaN(num)) onUpdate(id, { value: num });
    } else if (editField === "description") {
      if (editValue.trim()) onUpdate(id, { description: editValue.trim() });
    } else if (editField === "date") {
      if (editValue) onUpdate(id, { date: editValue });
    }
    setEditingId(null);
    setEditField(null);
  };

  const handleAdd = () => {
    const val = parseFloat(newExpense.value.replace(",", "."));
    if (!newExpense.description || isNaN(val)) return;
    const year = new Date().getFullYear();
    const date = newExpense.date || new Date(year, selectedMonth, 15).toISOString().split("T")[0];
    onAdd({
      date,
      description: newExpense.description,
      category: newExpense.category as any,
      value: val,
      responsible: newExpense.responsible,
      account: "",
      recurring: false,
    });
    setNewExpense({ description: "", category: categories[0] || "", value: "", responsible: null, date: "" });
    setShowForm(false);
  };

  const handleAddCategory = () => {
    if (newCategoryName.trim() && !categories.includes(newCategoryName.trim())) {
      onAddCategory(newCategoryName.trim());
      setNewCategoryName("");
    }
  };

  return (
    <motion.div initial={{ opacity: 0, x: 4 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.2 }}>
      <div className="flex items-center justify-between mb-6 gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-foreground">Gastos Variáveis</h2>
          <p className="text-sm text-text-muted mt-0.5">{filtered.length} registros este mês</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={() => setShowCategoryEditor(!showCategoryEditor)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border-subtle text-sm font-medium text-text-muted hover:text-foreground hover:bg-surface-hover transition-colors">
            <Pencil className="h-3.5 w-3.5" /><span className="hidden sm:inline">Categorias</span>
          </button>
          <div className="text-right hidden sm:block">
            <span className="label-caps">Total</span>
            <p className="text-2xl font-semibold text-foreground font-mono tabular-nums tracking-tight">
              € {total.toLocaleString("pt-PT", { minimumFractionDigits: 2 })}
            </p>
          </div>
          <button onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
            <Plus className="h-4 w-4" /><span className="hidden sm:inline">Novo Gasto</span>
          </button>
        </div>
      </div>

      <div className="sm:hidden mb-4 text-right">
        <span className="label-caps">Total</span>
        <p className="text-xl font-semibold text-foreground font-mono tabular-nums tracking-tight">
          € {total.toLocaleString("pt-PT", { minimumFractionDigits: 2 })}
        </p>
      </div>

      {/* Category editor */}
      {showCategoryEditor && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="bg-surface rounded-xl shadow-card border border-border-subtle/60 p-4 mb-4">
          <span className="label-caps mb-3 block">Gerir Categorias</span>
          <div className="flex flex-wrap gap-2 mb-3">
            {categories.map((cat) => (
              <span key={cat} className="inline-flex items-center gap-1 text-xs bg-background px-2.5 py-1 rounded-lg border border-border-subtle">
                {cat}
                <button onClick={() => onDeleteCategory(cat)} className="text-text-muted hover:text-status-negative transition-colors">
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddCategory()}
              placeholder="Nova categoria"
              className="flex-1 text-sm bg-background border border-border-subtle rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary" />
            <button onClick={handleAddCategory} className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      )}

      {showForm && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="bg-surface rounded-xl shadow-card border border-border-subtle/60 p-4 mb-4">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
            <div className="sm:col-span-2">
              <label className="label-caps mb-1.5 block">Data</label>
              <input type="date" value={newExpense.date} onChange={(e) => setNewExpense({ ...newExpense, date: e.target.value })}
                className="w-full text-sm bg-background border border-border-subtle rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div className="sm:col-span-3">
              <label className="label-caps mb-1.5 block">Descrição</label>
              <input value={newExpense.description} onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                placeholder="Ex: Supermercado"
                className="w-full text-sm bg-background border border-border-subtle rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div className="sm:col-span-2">
              <label className="label-caps mb-1.5 block">Categoria</label>
              <select value={newExpense.category} onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })}
                className="w-full text-sm bg-background border border-border-subtle rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary">
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="label-caps mb-1.5 block">Valor (€)</label>
              <input value={newExpense.value} onChange={(e) => setNewExpense({ ...newExpense, value: e.target.value })}
                placeholder="0,00"
                className="w-full text-sm font-mono bg-background border border-border-subtle rounded-lg px-3 py-2 text-right focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div className="sm:col-span-1">
              <label className="label-caps mb-1.5 block">Quem</label>
              <PersonSelector value={newExpense.responsible} onChange={(p) => setNewExpense({ ...newExpense, responsible: p })} people={people} />
            </div>
            <div className="sm:col-span-2 flex gap-2">
              <button onClick={handleAdd} className="flex-1 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">Adicionar</button>
              <button onClick={() => setShowForm(false)} className="px-3 py-2 rounded-lg border border-border-subtle text-sm text-text-muted hover:bg-surface-hover transition-colors">✕</button>
            </div>
          </div>
        </motion.div>
      )}

      <div className="hidden sm:grid grid-cols-12 gap-2 px-4 py-2 mb-1">
        <span className="col-span-2 label-caps">Data</span>
        <span className="col-span-3 label-caps">Descrição</span>
        <span className="col-span-2 label-caps">Categoria</span>
        <span className="col-span-2 label-caps text-right">Valor</span>
        <span className="col-span-2 label-caps">Responsável</span>
        <span className="col-span-1"></span>
      </div>

      <div className="bg-surface rounded-xl shadow-card border border-border-subtle/60 divide-y divide-border-subtle/40">
        {filtered.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-text-muted">
            Nenhum gasto variável neste mês. Clique em "Novo Gasto" para adicionar.
          </div>
        ) : (
          filtered.map((expense) => (
            <div key={expense.id} className="px-4 py-3 hover:bg-surface-hover transition-colors">
              <div className="hidden sm:grid grid-cols-12 gap-2 items-center">
                <div className="col-span-2">
                  {editingId === expense.id && editField === "date" ? (
                    <input autoFocus type="date" value={editValue} onChange={(e) => setEditValue(e.target.value)}
                      onBlur={() => saveEdit(expense.id)} onKeyDown={(e) => e.key === "Enter" && saveEdit(expense.id)}
                      className="w-full text-sm bg-transparent border border-primary rounded-lg px-2 py-1 focus:outline-none" />
                  ) : (
                    <button onClick={() => startEdit(expense, "date")} className="text-sm text-text-secondary hover:text-primary transition-colors">
                      {new Date(expense.date).toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric" })}
                    </button>
                  )}
                </div>
                <div className="col-span-3">
                  {editingId === expense.id && editField === "description" ? (
                    <input autoFocus value={editValue} onChange={(e) => setEditValue(e.target.value)}
                      onBlur={() => saveEdit(expense.id)} onKeyDown={(e) => e.key === "Enter" && saveEdit(expense.id)}
                      className="w-full text-sm font-semibold bg-transparent border border-primary rounded-lg px-2 py-1 focus:outline-none" />
                  ) : (
                    <button onClick={() => startEdit(expense, "description")} className="text-sm font-semibold text-foreground hover:text-primary transition-colors text-left">
                      {expense.description}
                    </button>
                  )}
                </div>
                <div className="col-span-2">
                  <select value={expense.category} onChange={(e) => onUpdate(expense.id, { category: e.target.value as any })}
                    className="text-xs text-text-muted bg-background px-2 py-0.5 rounded-md border border-border-subtle focus:outline-none focus:ring-1 focus:ring-primary">
                    {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="col-span-2 text-right">
                  {editingId === expense.id && editField === "value" ? (
                    <input autoFocus value={editValue} onChange={(e) => setEditValue(e.target.value)}
                      onBlur={() => saveEdit(expense.id)} onKeyDown={(e) => e.key === "Enter" && saveEdit(expense.id)}
                      className="w-full text-sm font-mono text-right bg-transparent border border-primary rounded-lg px-2 py-1 focus:outline-none" />
                  ) : (
                    <button onClick={() => startEdit(expense, "value")} className="font-mono text-sm text-text-secondary tabular-nums hover:text-foreground transition-colors">
                      € {expense.value.toLocaleString("pt-PT", { minimumFractionDigits: 2 })}
                    </button>
                  )}
                </div>
                <div className="col-span-2"><PersonBadge person={expense.responsible} people={people} /></div>
                <div className="col-span-1 text-right">
                  <button onClick={() => onDelete(expense.id)} className="text-text-muted hover:text-status-negative transition-colors">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Mobile */}
              <div className="sm:hidden space-y-2">
                <div className="flex items-start justify-between gap-2">
                  {editingId === expense.id && editField === "description" ? (
                    <input autoFocus value={editValue} onChange={(e) => setEditValue(e.target.value)}
                      onBlur={() => saveEdit(expense.id)} onKeyDown={(e) => e.key === "Enter" && saveEdit(expense.id)}
                      className="flex-1 min-w-0 text-sm font-semibold bg-transparent border border-primary rounded-lg px-2 py-1 focus:outline-none" />
                  ) : (
                    <button onClick={() => startEdit(expense, "description")} className="flex-1 min-w-0 text-sm font-semibold text-foreground text-left truncate">{expense.description}</button>
                  )}
                  {editingId === expense.id && editField === "value" ? (
                    <input autoFocus value={editValue} onChange={(e) => setEditValue(e.target.value)}
                      onBlur={() => saveEdit(expense.id)} onKeyDown={(e) => e.key === "Enter" && saveEdit(expense.id)}
                      className="w-24 text-sm font-mono text-right bg-transparent border border-primary rounded-lg px-2 py-1 focus:outline-none shrink-0" />
                  ) : (
                    <button onClick={() => startEdit(expense, "value")} className="font-mono text-sm font-semibold text-foreground tabular-nums shrink-0">
                      € {expense.value.toLocaleString("pt-PT", { minimumFractionDigits: 2 })}
                    </button>
                  )}
                  <button onClick={() => onDelete(expense.id)} className="text-text-muted hover:text-status-negative transition-colors shrink-0 pt-0.5">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 min-w-0 flex-wrap">
                    {editingId === expense.id && editField === "date" ? (
                      <input autoFocus type="date" value={editValue} onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => saveEdit(expense.id)} onKeyDown={(e) => e.key === "Enter" && saveEdit(expense.id)}
                        className="w-32 text-xs bg-transparent border border-primary rounded-lg px-2 py-1 focus:outline-none" />
                    ) : (
                      <button onClick={() => startEdit(expense, "date")} className="text-xs text-text-muted shrink-0">
                        {new Date(expense.date).toLocaleDateString("pt-PT")}
                      </button>
                    )}
                    <select value={expense.category} onChange={(e) => onUpdate(expense.id, { category: e.target.value as any })}
                      className="max-w-[140px] text-xs text-text-muted bg-background px-2 py-0.5 rounded-md border border-border-subtle truncate">
                      {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <PersonBadge person={expense.responsible} people={people} />
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </motion.div>
  );
};
