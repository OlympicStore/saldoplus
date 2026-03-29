import { useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, Plus, Trash2, Pencil, Check, X } from "lucide-react";
import type { VariableExpense } from "@/types/expense";

interface CategoryBudget {
  category: string;
  limit: number;
}

interface CategoryBudgetsProps {
  categories: string[];
  variableExpenses: VariableExpense[];
  selectedMonth: number;
  selectedYear: number;
}

const fmt = (v: number) => `€ ${v.toLocaleString("pt-PT", { minimumFractionDigits: 2 })}`;

export const CategoryBudgets = ({ categories, variableExpenses, selectedMonth, selectedYear }: CategoryBudgetsProps) => {
  const [budgets, setBudgets] = useState<CategoryBudget[]>([]);
  const [editingCat, setEditingCat] = useState<string | null>(null);
  const [editVal, setEditVal] = useState("");

  const monthExpenses = variableExpenses.filter((e) => {
    const d = new Date(e.date);
    return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
  });

  const getSpent = (cat: string) =>
    monthExpenses.filter((e) => e.category === cat).reduce((s, e) => s + e.value, 0);

  const getBudget = (cat: string) => budgets.find((b) => b.category === cat);

  const setBudget = (cat: string, limit: number) => {
    setBudgets((prev) => {
      const existing = prev.findIndex((b) => b.category === cat);
      if (existing >= 0) return prev.map((b, i) => (i === existing ? { ...b, limit } : b));
      return [...prev, { category: cat, limit }];
    });
  };

  const removeBudget = (cat: string) => setBudgets((prev) => prev.filter((b) => b.category !== cat));

  const startEdit = (cat: string) => {
    const budget = getBudget(cat);
    setEditVal(budget ? budget.limit.toFixed(2).replace(".", ",") : "");
    setEditingCat(cat);
  };

  const saveEdit = (cat: string) => {
    const num = parseFloat(editVal.replace(",", "."));
    if (!isNaN(num) && num > 0) setBudget(cat, num);
    setEditingCat(null);
  };

  const alerts = categories
    .map((cat) => {
      const budget = getBudget(cat);
      const spent = getSpent(cat);
      if (!budget) return null;
      const pct = budget.limit > 0 ? (spent / budget.limit) * 100 : 0;
      return { cat, spent, limit: budget.limit, pct };
    })
    .filter((a): a is NonNullable<typeof a> => a !== null && a.pct >= 80);

  return (
    <motion.div initial={{ opacity: 0, x: 4 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.2 }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Orçamentos por Categoria</h2>
          <p className="text-sm text-text-muted mt-0.5">Defina limites mensais e receba alertas</p>
        </div>
        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-[hsl(var(--status-paid)/0.15)] text-status-paid">PRO</span>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="mb-6 space-y-2">
          {alerts.map((a) => (
            <motion.div key={a.cat} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
              className={`flex items-center gap-3 p-3 rounded-xl border ${
                a.pct >= 100
                  ? "bg-[hsl(var(--status-negative)/0.08)] border-[hsl(var(--status-negative)/0.3)]"
                  : "bg-[hsl(var(--status-pending)/0.08)] border-[hsl(var(--status-pending)/0.3)]"
              }`}>
              <AlertTriangle className={`h-4 w-4 shrink-0 ${a.pct >= 100 ? "text-status-negative" : "text-status-pending"}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">
                  {a.cat}: {fmt(a.spent)} / {fmt(a.limit)}
                </p>
                <p className={`text-xs ${a.pct >= 100 ? "text-status-negative" : "text-status-pending"}`}>
                  {a.pct >= 100 ? `Ultrapassou ${(a.pct - 100).toFixed(0)}% do orçamento!` : `${a.pct.toFixed(0)}% do orçamento utilizado`}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Category list */}
      <div className="space-y-3">
        {categories.map((cat) => {
          const budget = getBudget(cat);
          const spent = getSpent(cat);
          const pct = budget && budget.limit > 0 ? Math.min((spent / budget.limit) * 100, 100) : 0;
          const isOver = budget && spent > budget.limit;

          return (
            <div key={cat} className="bg-surface rounded-xl shadow-card border border-border-subtle/60 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-foreground">{cat}</span>
                <div className="flex items-center gap-2">
                  {editingCat === cat ? (
                    <div className="flex items-center gap-1">
                      <input
                        autoFocus
                        value={editVal}
                        onChange={(e) => setEditVal(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && saveEdit(cat)}
                        placeholder="0,00"
                        className="w-24 text-sm bg-background border border-border-subtle rounded-lg px-2 py-1 text-right font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      <button onClick={() => saveEdit(cat)} className="text-status-paid"><Check className="h-4 w-4" /></button>
                      <button onClick={() => setEditingCat(null)} className="text-text-muted"><X className="h-4 w-4" /></button>
                    </div>
                  ) : budget ? (
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-mono text-text-muted">Limite: {fmt(budget.limit)}</span>
                      <button onClick={() => startEdit(cat)} className="text-text-muted hover:text-foreground transition-colors">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => removeBudget(cat)} className="text-text-muted hover:text-status-negative transition-colors">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => startEdit(cat)}
                      className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors">
                      <Plus className="h-3.5 w-3.5" />
                      Definir limite
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className={`font-mono tabular-nums ${isOver ? "text-status-negative font-semibold" : "text-text-secondary"}`}>
                  {fmt(spent)}
                </span>
                {budget && (
                  <span className="text-text-muted">{pct.toFixed(0)}%</span>
                )}
              </div>

              {budget && (
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.5 }}
                    className={`h-full rounded-full ${isOver ? "bg-status-negative" : pct >= 80 ? "bg-status-pending" : "bg-primary"}`}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
};
