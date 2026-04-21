import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Plus, Trash2, Pencil, Check, X, TrendingUp, Wallet, Target, Sparkles, CheckCircle2, PlusCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
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
  onAddCategory?: (cat: string) => void;
  onDeleteCategory?: (cat: string) => void;
}

const fmt = (v: number) => `€ ${v.toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtShort = (v: number) => `€ ${Math.round(v).toLocaleString("pt-PT")}`;

const statusFor = (pct: number) => {
  if (pct > 100) return { tone: "over" as const, label: "Ultrapassou o orçamento", color: "text-status-negative", bg: "bg-status-negative", soft: "bg-[hsl(var(--status-negative)/0.1)]", border: "border-[hsl(var(--status-negative)/0.25)]" };
  if (pct >= 70) return { tone: "warn" as const, label: "A aproximar-se do limite", color: "text-status-pending", bg: "bg-status-pending", soft: "bg-[hsl(var(--status-pending)/0.1)]", border: "border-[hsl(var(--status-pending)/0.25)]" };
  return { tone: "ok" as const, label: "Dentro do orçamento", color: "text-status-paid", bg: "bg-status-paid", soft: "bg-[hsl(var(--status-paid)/0.1)]", border: "border-[hsl(var(--status-paid)/0.25)]" };
};

export const CategoryBudgets = ({ categories, variableExpenses, selectedMonth, selectedYear, onAddCategory, onDeleteCategory }: CategoryBudgetsProps) => {
  const { user } = useAuth();
  const userId = user?.id;
  const [budgets, setBudgets] = useState<CategoryBudget[]>([]);
  const [editingCat, setEditingCat] = useState<string | null>(null);
  const [editVal, setEditVal] = useState("");
  const [loaded, setLoaded] = useState(false);

  // New budget dialog
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [newName, setNewName] = useState("");
  const [newLimit, setNewLimit] = useState("");

  // Rename dialog
  const [renamingCat, setRenamingCat] = useState<string | null>(null);
  const [renameVal, setRenameVal] = useState("");

  useEffect(() => {
    if (!userId) return;
    const load = async () => {
      const { data } = await supabase
        .from("category_budgets")
        .select("*")
        .eq("user_id", userId)
        .eq("month", selectedMonth)
        .eq("year", selectedYear);
      setBudgets(data ? data.map((r: any) => ({ category: r.category, limit: Number(r.limit_value) })) : []);
      setLoaded(true);
    };
    load();
  }, [userId, selectedMonth, selectedYear]);

  const syncBudget = useCallback(async (cat: string, limitValue: number) => {
    if (!userId) return;
    await supabase.from("category_budgets").upsert({
      user_id: userId, category: cat, limit_value: limitValue,
      month: selectedMonth, year: selectedYear,
    }, { onConflict: "user_id,category,month,year" });
  }, [userId, selectedMonth, selectedYear]);

  const deleteBudgetFromDB = useCallback(async (cat: string) => {
    if (!userId) return;
    await supabase.from("category_budgets").delete()
      .eq("user_id", userId).eq("category", cat)
      .eq("month", selectedMonth).eq("year", selectedYear);
  }, [userId, selectedMonth, selectedYear]);

  // Month context
  const now = new Date();
  const isCurrentMonth = now.getMonth() === selectedMonth && now.getFullYear() === selectedYear;
  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  const today = isCurrentMonth ? now.getDate() : daysInMonth;
  const daysRemaining = Math.max(0, daysInMonth - today);

  const monthExpenses = useMemo(() => variableExpenses.filter((e) => {
    const d = new Date(e.date);
    return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
  }), [variableExpenses, selectedMonth, selectedYear]);

  // Previous month for comparison insight
  const prevMonth = selectedMonth === 0 ? 11 : selectedMonth - 1;
  const prevYear = selectedMonth === 0 ? selectedYear - 1 : selectedYear;
  const prevMonthExpenses = useMemo(() => variableExpenses.filter((e) => {
    const d = new Date(e.date);
    return d.getMonth() === prevMonth && d.getFullYear() === prevYear;
  }), [variableExpenses, prevMonth, prevYear]);

  const getSpent = (cat: string) => monthExpenses.filter((e) => e.category === cat).reduce((s, e) => s + e.value, 0);
  const getPrevSpent = (cat: string) => prevMonthExpenses.filter((e) => e.category === cat).reduce((s, e) => s + e.value, 0);
  const getBudget = (cat: string) => budgets.find((b) => b.category === cat);

  const totalSpent = monthExpenses.reduce((s, e) => s + e.value, 0);

  const setBudgetValue = (cat: string, limit: number) => {
    setBudgets((prev) => {
      const existing = prev.findIndex((b) => b.category === cat);
      if (existing >= 0) return prev.map((b, i) => (i === existing ? { ...b, limit } : b));
      return [...prev, { category: cat, limit }];
    });
    syncBudget(cat, limit);
  };

  const removeBudget = (cat: string) => {
    setBudgets((prev) => prev.filter((b) => b.category !== cat));
    deleteBudgetFromDB(cat);
  };

  const startEdit = (cat: string) => {
    const budget = getBudget(cat);
    setEditVal(budget ? budget.limit.toFixed(2).replace(".", ",") : "");
    setEditingCat(cat);
  };

  const saveEdit = (cat: string) => {
    const num = parseFloat(editVal.replace(",", "."));
    if (!isNaN(num) && num > 0) setBudgetValue(cat, num);
    setEditingCat(null);
  };

  // Aggregates
  const totalBudget = budgets.reduce((s, b) => s + b.limit, 0);
  const budgetedSpent = budgets.reduce((s, b) => s + getSpent(b.category), 0);
  const totalRemaining = totalBudget - budgetedSpent;
  const totalPct = totalBudget > 0 ? (budgetedSpent / totalBudget) * 100 : 0;

  // Alerts (≥80%)
  const alerts = categories
    .map((cat) => {
      const budget = getBudget(cat);
      if (!budget) return null;
      const spent = getSpent(cat);
      const pct = budget.limit > 0 ? (spent / budget.limit) * 100 : 0;
      return pct >= 80 ? { cat, spent, limit: budget.limit, pct } : null;
    })
    .filter((a): a is NonNullable<typeof a> => a !== null);

  // Sort: budgets first (by % desc), then no-budget categories
  const sortedCategories = useMemo(() => {
    return [...categories].sort((a, b) => {
      const ba = getBudget(a); const bb = getBudget(b);
      if (ba && !bb) return -1;
      if (!ba && bb) return 1;
      if (ba && bb) {
        const pa = ba.limit > 0 ? getSpent(a) / ba.limit : 0;
        const pb = bb.limit > 0 ? getSpent(b) / bb.limit : 0;
        return pb - pa;
      }
      return getSpent(b) - getSpent(a);
    });
  }, [categories, budgets, monthExpenses]);

  if (!loaded) return null;

  const globalStatus = statusFor(totalPct);

  return (
    <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Orçamentos por Categoria</h2>
          <p className="text-sm text-text-muted mt-0.5">Controlo em tempo real dos seus gastos mensais</p>
        </div>
        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-[hsl(var(--status-paid)/0.15)] text-status-paid">PRO</span>
      </div>

      {/* Global Summary */}
      <div className="mb-6 rounded-2xl border border-border-subtle/60 bg-gradient-to-br from-surface to-surface/50 shadow-card overflow-hidden">
        <div className="p-5">
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <div className="flex items-center gap-1.5 text-text-muted mb-1">
                <Wallet className="h-3.5 w-3.5" />
                <span className="text-[11px] font-medium uppercase tracking-wider">Gasto</span>
              </div>
              <div className="font-mono font-semibold text-foreground tabular-nums text-lg sm:text-xl">{fmtShort(budgetedSpent)}</div>
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-text-muted mb-1">
                <Target className="h-3.5 w-3.5" />
                <span className="text-[11px] font-medium uppercase tracking-wider">Orçamento</span>
              </div>
              <div className="font-mono font-semibold text-foreground tabular-nums text-lg sm:text-xl">{fmtShort(totalBudget)}</div>
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-text-muted mb-1">
                <TrendingUp className="h-3.5 w-3.5" />
                <span className="text-[11px] font-medium uppercase tracking-wider">{totalRemaining >= 0 ? "Restante" : "Excesso"}</span>
              </div>
              <div className={`font-mono font-semibold tabular-nums text-lg sm:text-xl ${totalRemaining >= 0 ? "text-status-paid" : "text-status-negative"}`}>
                {fmtShort(Math.abs(totalRemaining))}
              </div>
            </div>
          </div>

          {totalBudget > 0 && (
            <>
              <div className="h-2.5 bg-secondary rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(totalPct, 100)}%` }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className={`h-full rounded-full ${globalStatus.bg}`}
                />
              </div>
              <div className="flex items-center justify-between mt-2 text-xs">
                <span className={`font-medium ${globalStatus.color}`}>{globalStatus.label}</span>
                <span className="text-text-muted font-mono tabular-nums">{totalPct.toFixed(0)}% utilizado</span>
              </div>
            </>
          )}

          {totalBudget === 0 && (
            <p className="text-sm text-text-muted text-center py-2">Defina orçamentos abaixo para ativar o controlo global.</p>
          )}
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="mb-6 space-y-2">
          {alerts.map((a) => {
            const isOver = a.pct > 100;
            return (
              <motion.div key={a.cat} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                className={`flex items-center gap-3 p-3 rounded-xl border ${isOver
                  ? "bg-[hsl(var(--status-negative)/0.08)] border-[hsl(var(--status-negative)/0.3)]"
                  : "bg-[hsl(var(--status-pending)/0.08)] border-[hsl(var(--status-pending)/0.3)]"}`}>
                <AlertTriangle className={`h-4 w-4 shrink-0 ${isOver ? "text-status-negative" : "text-status-pending"}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">
                    {a.cat}: {fmt(a.spent)} / {fmt(a.limit)}
                  </p>
                  <p className={`text-xs ${isOver ? "text-status-negative" : "text-status-pending"}`}>
                    {isOver ? `Ultrapassou ${fmt(a.spent - a.limit)} do orçamento!` : `${a.pct.toFixed(0)}% do orçamento utilizado`}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Category cards */}
      <div className="space-y-3">
        {sortedCategories.map((cat) => {
          const budget = getBudget(cat);
          const spent = getSpent(cat);
          const prevSpent = getPrevSpent(cat);
          const limit = budget?.limit ?? 0;
          const pct = limit > 0 ? (spent / limit) * 100 : 0;
          const remaining = limit - spent;
          const status = statusFor(pct);

          // Forecast (only useful for current month with some spending)
          const dailyAvg = today > 0 ? spent / today : 0;
          const forecast = dailyAvg * daysInMonth;
          const showForecast = isCurrentMonth && spent > 0 && daysRemaining > 0 && budget;

          // Insights
          const pctVsPrev = prevSpent > 0 ? ((spent - prevSpent) / prevSpent) * 100 : 0;
          const showVsPrev = budget && prevSpent > 0 && Math.abs(pctVsPrev) >= 15;
          const shareOfTotal = totalSpent > 0 ? (spent / totalSpent) * 100 : 0;

          return (
            <motion.div
              key={cat}
              layout
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-surface rounded-2xl shadow-card border border-border-subtle/60 p-4 sm:p-5"
            >
              {/* Top row: name + status pill + actions */}
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-2 min-w-0 flex-wrap">
                  <span className="text-sm font-semibold text-foreground truncate">{cat}</span>
                  {budget && (
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${status.soft} ${status.color} border ${status.border}`}>
                      {status.tone === "ok" && <CheckCircle2 className="h-3 w-3" />}
                      {status.tone === "warn" && <AlertTriangle className="h-3 w-3" />}
                      {status.tone === "over" && <AlertTriangle className="h-3 w-3" />}
                      {status.tone === "ok" ? "OK" : status.tone === "warn" ? "Atenção" : "Excedido"}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {editingCat === cat ? (
                    <div className="flex items-center gap-1">
                      <input
                        autoFocus value={editVal}
                        onChange={(e) => setEditVal(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") saveEdit(cat); if (e.key === "Escape") setEditingCat(null); }}
                        placeholder="0,00"
                        className="w-24 text-sm bg-background border border-border-subtle rounded-lg px-2 py-1 text-right font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      <button onClick={() => saveEdit(cat)} className="text-status-paid p-1 hover:bg-[hsl(var(--status-paid)/0.1)] rounded"><Check className="h-4 w-4" /></button>
                      <button onClick={() => setEditingCat(null)} className="text-text-muted p-1 hover:bg-secondary rounded"><X className="h-4 w-4" /></button>
                    </div>
                  ) : budget ? (
                    <>
                      <button onClick={() => startEdit(cat)} className="text-text-muted hover:text-foreground transition-colors p-1.5 hover:bg-secondary rounded-md" title="Ajustar orçamento">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => removeBudget(cat)} className="text-text-muted hover:text-status-negative transition-colors p-1.5 hover:bg-[hsl(var(--status-negative)/0.1)] rounded-md" title="Remover orçamento">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </>
                  ) : (
                    <button onClick={() => startEdit(cat)}
                      className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors px-2.5 py-1.5 rounded-lg hover:bg-[hsl(var(--primary)/0.08)] font-medium">
                      <Plus className="h-3.5 w-3.5" />
                      Definir / ajustar orçamento
                    </button>
                  )}
                </div>
              </div>

              {/* Spent / Limit numbers */}
              <div className="flex items-baseline justify-between mb-2">
                <div>
                  <span className={`font-mono font-semibold tabular-nums text-base ${status.color}`}>{fmt(spent)}</span>
                  {budget && <span className="text-text-muted text-sm"> / <span className="font-mono tabular-nums">{fmt(limit)}</span></span>}
                </div>
                {budget && (
                  <span className={`text-xs font-mono tabular-nums font-semibold ${status.color}`}>{pct.toFixed(0)}%</span>
                )}
              </div>

              {/* Progress bar */}
              {budget ? (
                <div className="h-2.5 bg-secondary rounded-full overflow-hidden relative">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(pct, 100)}%` }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className={`h-full rounded-full ${status.bg}`}
                  />
                  {pct > 100 && (
                    <div className="absolute inset-y-0 right-0 w-1 bg-status-negative animate-pulse" />
                  )}
                </div>
              ) : (
                <div className="h-2.5 bg-secondary/50 rounded-full" />
              )}

              {/* Bottom info */}
              {budget ? (
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
                  <span className={`font-medium ${status.color}`}>
                    {remaining >= 0
                      ? <>Faltam <span className="font-mono tabular-nums font-semibold">{fmt(remaining)}</span> até ao limite</>
                      : <>Ultrapassou em <span className="font-mono tabular-nums font-semibold">{fmt(-remaining)}</span></>}
                  </span>

                  {showForecast && (
                    <span className="inline-flex items-center gap-1 text-text-muted">
                      <TrendingUp className="h-3 w-3" />
                      Previsão fim do mês: <span className={`font-mono tabular-nums font-semibold ${forecast > limit ? "text-status-negative" : "text-foreground"}`}>{fmtShort(forecast)}</span>
                    </span>
                  )}
                </div>
              ) : (
                <div className="mt-3 text-xs text-text-muted">
                  Já gastou <span className="font-mono tabular-nums font-semibold text-foreground">{fmt(spent)}</span> este mês • defina um orçamento para acompanhar
                </div>
              )}

              {/* Insights */}
              {(showVsPrev || (budget && shareOfTotal >= 10)) && (
                <div className="mt-3 pt-3 border-t border-border-subtle/50 space-y-1">
                  {showVsPrev && (
                    <p className="text-xs text-text-muted flex items-center gap-1.5">
                      <Sparkles className="h-3 w-3 text-primary shrink-0" />
                      Está a gastar <span className={`font-semibold ${pctVsPrev > 0 ? "text-status-negative" : "text-status-paid"}`}>
                        {pctVsPrev > 0 ? "+" : ""}{pctVsPrev.toFixed(0)}%
                      </span> face ao mês anterior
                    </p>
                  )}
                  {budget && shareOfTotal >= 10 && (
                    <p className="text-xs text-text-muted flex items-center gap-1.5">
                      <Sparkles className="h-3 w-3 text-primary shrink-0" />
                      Representa <span className="font-semibold text-foreground">{shareOfTotal.toFixed(0)}%</span> dos seus gastos variáveis
                    </p>
                  )}
                </div>
              )}
            </motion.div>
          );
        })}

        {sortedCategories.length === 0 && (
          <div className="text-center py-10 text-sm text-text-muted bg-surface rounded-2xl border border-border-subtle/60">
            Adicione categorias variáveis em Configuração → Categorias para começar.
          </div>
        )}
      </div>
    </motion.div>
  );
};
