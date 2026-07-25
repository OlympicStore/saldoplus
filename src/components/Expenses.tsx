import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import {
  Plus, Trash2, Sparkles, Repeat, FileText, Bell, Wallet, TrendingDown,
  AlertCircle, CheckCircle2, Clock, HelpCircle, Pencil, X,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import type { FixedExpense, VariableExpense } from "@/types/expense";
import type { Category, CategoryType } from "@/types/category";
import { CATEGORY_TYPE_LABELS, CATEGORY_TYPE_COLORS } from "@/types/category";
import type { Account } from "@/types/account";
import { formatDateOnly } from "@/lib/dateOnly";

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
const todayISO = () => new Date().toISOString().split("T")[0];

// Simple emoji hint by category/name — soft cognitive cue
const emojiFor = (name: string): string => {
  const n = name.toLowerCase();
  if (/(água|agua|epal|water)/.test(n)) return "💧";
  if (/(luz|edp|energia|eletric)/.test(n)) return "💡";
  if (/(gás|gas|galp\s*gas)/.test(n)) return "🔥";
  if (/(net|meo|nos|vodafone|internet|telemóvel|telemovel|telecom)/.test(n)) return "📶";
  if (/(netflix|hbo|disney|spotify|apple|prime|youtube|streaming)/.test(n)) return "🎬";
  if (/(ginásio|ginasio|gym|fit)/.test(n)) return "🏋️";
  if (/(seguro|insur)/.test(n)) return "🛡️";
  if (/(renda|casa|habita|imob)/.test(n)) return "🏠";
  if (/(comida|super|continente|pingo|lidl|aldi|mercadona|jerónimo|jeronimo|mercado|restaur|jantar|almoço|almoco)/.test(n)) return "🍔";
  if (/(gasolina|combust|galp|bp|repsol|prio|carro|transporte|uber|bolt|via verde)/.test(n)) return "⛽";
  if (/(diversão|diversao|cinema|lazer|festa)/.test(n)) return "🎉";
  if (/(saúde|saude|farmac|medico|médico|hospital)/.test(n)) return "💊";
  if (/(educação|educacao|escola|curso|livro|book)/.test(n)) return "📚";
  return "💳";
};

const statusMeta = (s: "pago" | "pendente" | "confirmar" | "atraso") => {
  switch (s) {
    case "pago": return { label: "Pago", cls: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20", Icon: CheckCircle2 };
    case "pendente": return { label: "Pendente", cls: "bg-amber-500/10 text-amber-600 border-amber-500/20", Icon: Clock };
    case "confirmar": return { label: "Valor por confirmar", cls: "bg-sky-500/10 text-sky-600 border-sky-500/20", Icon: HelpCircle };
    case "atraso": return { label: "Em atraso", cls: "bg-red-500/10 text-red-600 border-red-500/20", Icon: AlertCircle };
  }
};

export const Expenses = ({
  fixedExpenses, variableExpenses, categories, accounts, people, selectedMonth,
  onAddFixed, onUpdateFixed, onUpdateFixedMonthly, onDeleteFixed,
  onAddVariable, onUpdateVariable, onDeleteVariable, onAddCategoryItem,
}: ExpensesProps) => {
  const [showForm, setShowForm] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; kind: "fixed" | "variable"; label: string } | null>(null);
  const [confirmInput, setConfirmInput] = useState<{ id: string; label: string; open: boolean; value: string }>({ id: "", label: "", open: false, value: "" });

  // Form state
  const emptyForm = {
    category: "",
    customCategory: "",
    description: "",
    account: "",
    value: "",
    date: todayISO(),
    recurring: false,
    recurrence: "mensal" as "mensal" | "semanal" | "anual" | "personalizada",
    valueType: "fixed" as "fixed" | "variable",
    dueDay: "1",
  };
  const [form, setForm] = useState(emptyForm);

  const today = new Date();
  const currentMonth = today.getMonth();
  const isCurrentMonth = selectedMonth === currentMonth;

  // === Derived data ===

  // Recurring items = fixed_expenses + variable_expenses with recurring=true
  type Upcoming = {
    id: string;
    kind: "fixed" | "variable-recurring";
    name: string;
    dueDay: number;
    value: number | null; // null = valor por confirmar
    valueType: "fixed" | "variable";
    status: "pago" | "pendente" | "confirmar" | "atraso";
    estimate?: number; // predicted from history
  };

  const upcoming: Upcoming[] = useMemo(() => {
    const items: Upcoming[] = [];

    fixedExpenses.forEach((e) => {
      const raw = e.monthlyValues[selectedMonth];
      const paid = !!e.monthlyPaid[selectedMonth];
      const valueType = e.valueType || "fixed";
      const hasValue = typeof raw === "number" && raw > 0;
      const value = hasValue ? raw : null;

      // Predicted value = average of last known non-zero months
      const history = Object.entries(e.monthlyValues)
        .filter(([_, v]) => typeof v === "number" && v > 0)
        .map(([_, v]) => v as number);
      const estimate = history.length ? history.reduce((s, v) => s + v, 0) / history.length : undefined;

      let status: Upcoming["status"];
      if (paid) status = "pago";
      else if (valueType === "variable" && !hasValue) status = "confirmar";
      else if (isCurrentMonth && e.dueDay < today.getDate()) status = "atraso";
      else status = "pendente";

      items.push({
        id: e.id, kind: "fixed", name: e.item, dueDay: e.dueDay,
        value, valueType, status, estimate,
      });
    });

    // Variable expenses marked recurring but without an entry this month → treat as upcoming
    const recurringVarNames = new Set<string>();
    variableExpenses.filter((v) => v.recurring).forEach((v) => recurringVarNames.add(v.description || v.category));

    return items.sort((a, b) => {
      // paid at bottom, else by dueDay
      if ((a.status === "pago") !== (b.status === "pago")) return a.status === "pago" ? 1 : -1;
      return a.dueDay - b.dueDay;
    });
  }, [fixedExpenses, variableExpenses, selectedMonth, isCurrentMonth, today]);

  // Recent one-off / variable spends this month
  const recent = useMemo(() => {
    return variableExpenses
      .filter((e) => new Date(e.date).getMonth() === selectedMonth)
      .sort((a, b) => (a.date < b.date ? 1 : -1))
      .slice(0, 20);
  }, [variableExpenses, selectedMonth]);

  // Totals
  const totalRecurring = upcoming.reduce((s, u) => s + (u.value ?? u.estimate ?? 0), 0);
  const totalRecent = recent.reduce((s, e) => s + e.value, 0);
  const totalMonth = totalRecurring + totalRecent;
  const stillToPay = upcoming
    .filter((u) => u.status !== "pago")
    .reduce((s, u) => s + (u.value ?? u.estimate ?? 0), 0);

  // === Actions ===
  const selectedCatType: CategoryType | null = form.category === "__custom"
    ? "inevitavel"
    : form.category
      ? categories.find((c) => c.name === form.category)?.type ?? "inevitavel"
      : null;

  const resetForm = () => setForm(emptyForm);

  const handleAdd = async () => {
    const val = parseFloat(form.value.replace(",", "."));
    const finalCategory = form.category === "__custom" ? form.customCategory.trim() : form.category;
    if (!finalCategory) return;

    if (form.category === "__custom" && onAddCategoryItem
        && !categories.some((c) => c.name.toLowerCase() === finalCategory.toLowerCase())) {
      await onAddCategoryItem({ name: finalCategory, type: "inevitavel" });
    }

    if (form.recurring) {
      // Persist as FixedExpense with valueType
      const dueDay = parseInt(form.dueDay) || 1;
      const wantValue = !isNaN(val) && form.valueType === "fixed" ? val : (form.valueType === "variable" ? 0 : (isNaN(val) ? 0 : val));
      onAddFixed({
        id: crypto.randomUUID(),
        item: form.description || finalCategory,
        dueDay,
        account: form.account,
        valueType: form.valueType,
        monthlyValues: form.valueType === "fixed" && !isNaN(val) ? { [selectedMonth]: wantValue } : {},
        monthlyResponsible: {},
        monthlyPaid: {},
      });
    } else {
      if (isNaN(val)) return;
      onAddVariable({
        date: form.date || todayISO(),
        description: form.description || finalCategory,
        category: finalCategory as any,
        value: val,
        responsible: null,
        account: form.account,
        recurring: false,
        paid: true, // one-off recent expenses are usually already paid
      });
    }
    resetForm();
    setShowForm(false);
  };

  const askDelete = (id: string, kind: "fixed" | "variable", label: string) =>
    setConfirmDelete({ id, kind, label });

  const doDelete = () => {
    if (!confirmDelete) return;
    if (confirmDelete.kind === "fixed") onDeleteFixed(confirmDelete.id);
    else onDeleteVariable(confirmDelete.id);
    setConfirmDelete(null);
  };

  const togglePaid = (u: Upcoming) => {
    onUpdateFixedMonthly(u.id, selectedMonth, "paid", u.status !== "pago");
  };

  const submitConfirmValue = () => {
    const num = parseFloat(confirmInput.value.replace(",", "."));
    if (!isNaN(num) && num > 0) {
      onUpdateFixedMonthly(confirmInput.id, selectedMonth, "value", num);
    }
    setConfirmInput({ id: "", label: "", open: false, value: "" });
  };

  const relDateLabel = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diff = Math.floor((now.setHours(0, 0, 0, 0) - new Date(d).setHours(0, 0, 0, 0)) / 86400000);
    if (diff === 0) return "Hoje";
    if (diff === 1) return "Ontem";
    if (diff > 1 && diff < 7) return `Há ${diff} dias`;
    return formatDateOnly(iso, { day: "2-digit", month: "short" });
  };

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
      {/* === Header === */}
      <div className="flex items-start justify-between mb-5 gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-semibold text-foreground tracking-tight">Despesas</h2>
          <p className="text-sm text-text-muted mt-0.5">Vê rapidamente o que já pagaste e o que falta.</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-foreground text-background text-sm font-medium hover:opacity-90 transition-opacity shadow-sm shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Nova despesa</span>
        </button>
      </div>

      {/* === Summary cards === */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
        <div className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 rounded-3xl p-4">
          <div className="flex items-center gap-1.5 text-xs text-primary/80 mb-1">
            <Wallet className="h-3.5 w-3.5" /> Este mês
          </div>
          <p className="text-2xl font-semibold text-foreground font-mono tabular-nums tracking-tight">{fmt(totalMonth)}</p>
        </div>
        <div className="bg-surface border border-border-subtle/60 rounded-3xl p-4">
          <div className="flex items-center gap-1.5 text-xs text-text-muted mb-1">
            <Repeat className="h-3.5 w-3.5" /> Recorrentes
          </div>
          <p className="text-2xl font-semibold text-foreground font-mono tabular-nums tracking-tight">{fmt(totalRecurring)}</p>
        </div>
        <div className="bg-surface border border-border-subtle/60 rounded-3xl p-4 col-span-2 lg:col-span-1">
          <div className="flex items-center gap-1.5 text-xs text-amber-600 mb-1">
            <TrendingDown className="h-3.5 w-3.5" /> Ainda por pagar
          </div>
          <p className="text-2xl font-semibold text-foreground font-mono tabular-nums tracking-tight">{fmt(stillToPay)}</p>
        </div>
      </div>

      {/* === AI hint === */}
      <div className="mb-6 bg-gradient-to-r from-violet-500/10 via-primary/5 to-transparent border border-primary/15 rounded-2xl px-4 py-3 flex items-start gap-3">
        <div className="h-8 w-8 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
          <Sparkles className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-foreground font-medium">Também podes atualizar despesas pelo Assistente</p>
          <p className="text-xs text-text-muted mt-0.5 truncate">Ex: <span className="text-foreground">"Água 34,82€"</span> · <span className="text-foreground">"Netflix paga"</span> · <span className="text-foreground">"Recebi a fatura da luz: 58€"</span></p>
        </div>
      </div>

      {/* === Próximos Pagamentos === */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className="flex items-center gap-2 text-base font-semibold text-foreground">
            <Bell className="h-4 w-4 text-primary" /> Próximos pagamentos
          </h3>
          <span className="text-xs text-text-muted">{upcoming.filter(u => u.status !== "pago").length} pendentes</span>
        </div>

        {upcoming.length === 0 ? (
          <div className="bg-surface border border-dashed border-border-subtle rounded-3xl px-6 py-10 text-center">
            <p className="text-sm text-text-muted">Ainda não tens despesas recorrentes.</p>
            <button onClick={() => { setForm({ ...emptyForm, recurring: true }); setShowForm(true); }}
              className="mt-3 text-sm font-medium text-primary hover:underline">
              Adicionar a primeira
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {upcoming.map((u) => {
              const meta = statusMeta(u.status);
              const StatusIcon = meta.Icon;
              return (
                <motion.div key={u.id} layout
                  className="group relative bg-surface border border-border-subtle/60 rounded-3xl p-4 hover:shadow-md hover:border-border-subtle transition-all">
                  <div className="flex items-start gap-3">
                    <div className="h-11 w-11 rounded-2xl bg-secondary flex items-center justify-center text-xl shrink-0">
                      {emojiFor(u.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold text-foreground truncate">{u.name}</p>
                        <button onClick={() => askDelete(u.id, "fixed", u.name)}
                          className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-red-500 transition-all shrink-0">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-text-muted">
                        <span>Dia {u.dueDay}</span>
                        <span>·</span>
                        <span className="inline-flex items-center gap-1">
                          <Repeat className="h-3 w-3" /> Recorrente
                        </span>
                      </div>

                      <div className="mt-2.5 flex items-end justify-between gap-2">
                        <div className="min-w-0">
                          {u.value !== null ? (
                            <p className="text-lg font-semibold font-mono tabular-nums text-foreground">{fmt(u.value)}</p>
                          ) : (
                            <div>
                              <p className="text-sm text-sky-600 font-medium">Valor por confirmar</p>
                              {u.estimate ? (
                                <p className="text-[11px] text-text-muted mt-0.5">Estimado ~ {fmt(u.estimate)}</p>
                              ) : null}
                            </div>
                          )}
                        </div>
                        <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-full border ${meta.cls}`}>
                          <StatusIcon className="h-3 w-3" />
                          {meta.label}
                        </span>
                      </div>

                      <div className="mt-3 flex gap-2">
                        {u.value === null ? (
                          <button
                            onClick={() => setConfirmInput({ id: u.id, label: u.name, open: true, value: u.estimate ? u.estimate.toFixed(2).replace(".", ",") : "" })}
                            className="flex-1 text-xs font-medium px-3 py-2 rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
                          >
                            Introduzir valor
                          </button>
                        ) : (
                          <button
                            onClick={() => togglePaid(u)}
                            className={`flex-1 text-xs font-medium px-3 py-2 rounded-xl transition-colors ${
                              u.status === "pago"
                                ? "bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/15"
                                : "bg-foreground text-background hover:opacity-90"
                            }`}
                          >
                            {u.status === "pago" ? "✓ Pago" : "Marcar como pago"}
                          </button>
                        )}
                        <button
                          onClick={() => setConfirmInput({ id: u.id, label: u.name, open: true, value: u.value ? u.value.toFixed(2).replace(".", ",") : "" })}
                          className="text-xs px-3 py-2 rounded-xl border border-border-subtle text-text-muted hover:text-foreground hover:bg-surface-hover transition-colors"
                          title="Editar valor"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </section>

      {/* === Despesas Recentes === */}
      <section>
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className="flex items-center gap-2 text-base font-semibold text-foreground">
            <FileText className="h-4 w-4 text-primary" /> Despesas recentes
          </h3>
          <span className="text-xs text-text-muted">{recent.length} este mês</span>
        </div>

        {recent.length === 0 ? (
          <div className="bg-surface border border-dashed border-border-subtle rounded-3xl px-6 py-10 text-center">
            <p className="text-sm text-text-muted">Sem despesas pontuais neste mês.</p>
          </div>
        ) : (
          <div className="bg-surface border border-border-subtle/60 rounded-3xl overflow-hidden divide-y divide-border-subtle/40">
            {recent.map((e) => {
              const cat = categories.find((c) => c.name === e.category);
              const catType = cat?.type ?? "inevitavel";
              const colors = CATEGORY_TYPE_COLORS[catType];
              const status = e.paid ? "pago" : "pendente";
              const meta = statusMeta(status);
              const StatusIcon = meta.Icon;
              return (
                <div key={e.id} className="group flex items-center gap-3 px-4 py-3 hover:bg-surface-hover transition-colors">
                  <div className="h-10 w-10 rounded-2xl bg-secondary flex items-center justify-center text-lg shrink-0">
                    {emojiFor(e.description || e.category)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-foreground truncate">{e.description || e.category}</p>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5 text-xs text-text-muted">
                      <span>{relDateLabel(e.date)}</span>
                      <span>·</span>
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md ${colors.bg} ${colors.text}`}>
                        {e.category}
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold font-mono tabular-nums text-foreground">{fmt(e.value)}</p>
                    <button
                      onClick={() => onUpdateVariable(e.id, { paid: !e.paid })}
                      className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 mt-1 rounded-full border ${meta.cls}`}
                    >
                      <StatusIcon className="h-2.5 w-2.5" />
                      {meta.label}
                    </button>
                  </div>
                  <button onClick={() => askDelete(e.id, "variable", e.description || e.category)}
                    className="opacity-0 group-hover:opacity-100 ml-1 text-text-muted hover:text-red-500 transition-all shrink-0">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* === New expense dialog === */}
      <Dialog open={showForm} onOpenChange={(o) => { setShowForm(o); if (!o) resetForm(); }}>
        <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova despesa</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Recurring toggle */}
            <div className="flex gap-2 p-1 bg-secondary rounded-2xl">
              <button
                type="button"
                onClick={() => setForm({ ...form, recurring: false })}
                className={`flex-1 flex items-center justify-center gap-1.5 text-sm py-2 rounded-xl transition-all ${
                  !form.recurring ? "bg-background shadow-sm font-medium text-foreground" : "text-text-muted"
                }`}
              >
                <FileText className="h-3.5 w-3.5" /> Pontual
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, recurring: true })}
                className={`flex-1 flex items-center justify-center gap-1.5 text-sm py-2 rounded-xl transition-all ${
                  form.recurring ? "bg-background shadow-sm font-medium text-foreground" : "text-text-muted"
                }`}
              >
                <Repeat className="h-3.5 w-3.5" /> Recorrente
              </button>
            </div>

            {/* Description */}
            <div>
              <label className="text-xs text-text-muted mb-1.5 block">Descrição</label>
              <input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder={form.recurring ? "Ex: Netflix, Água, Ginásio" : "Ex: Jantar, Farmácia"}
                className="w-full text-sm bg-background border border-border-subtle rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            {/* Category */}
            <div>
              <label className="text-xs text-text-muted mb-1.5 block">Categoria</label>
              <div className="flex flex-wrap gap-1.5">
                {categories.map((c) => {
                  const active = form.category === c.name;
                  const colors = CATEGORY_TYPE_COLORS[c.type];
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setForm({ ...form, category: c.name })}
                      className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                        active
                          ? `${colors.bg} ${colors.text} ${colors.border} ring-2 ring-primary/20 font-medium`
                          : "bg-background border-border-subtle text-text-secondary hover:border-primary/40"
                      }`}
                    >
                      {c.name}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setForm({ ...form, category: "__custom" })}
                  className={`text-xs px-3 py-1.5 rounded-full border border-dashed transition-colors ${
                    form.category === "__custom" ? "border-primary text-primary" : "border-border-subtle text-text-muted"
                  }`}
                >
                  + Nova
                </button>
              </div>
              {form.category === "__custom" && (
                <input
                  autoFocus
                  value={form.customCategory}
                  onChange={(e) => setForm({ ...form, customCategory: e.target.value })}
                  placeholder="Nome da nova categoria"
                  className="mt-2 w-full text-sm bg-background border border-border-subtle rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              )}
            </div>

            {/* Recurring options */}
            {form.recurring && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-text-muted mb-1.5 block">Recorrência</label>
                  <select
                    value={form.recurrence}
                    onChange={(e) => setForm({ ...form, recurrence: e.target.value as any })}
                    className="w-full text-sm bg-background border border-border-subtle rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    <option value="mensal">Mensal</option>
                    <option value="semanal">Semanal</option>
                    <option value="anual">Anual</option>
                    <option value="personalizada">Personalizada</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-text-muted mb-1.5 block">Tipo de valor</label>
                  <select
                    value={form.valueType}
                    onChange={(e) => setForm({ ...form, valueType: e.target.value as any })}
                    className="w-full text-sm bg-background border border-border-subtle rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    <option value="fixed">Valor fixo</option>
                    <option value="variable">Valor variável</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-text-muted mb-1.5 block">Dia de vencimento</label>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    value={form.dueDay}
                    onChange={(e) => setForm({ ...form, dueDay: e.target.value })}
                    className="w-full text-sm bg-background border border-border-subtle rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div>
                  <label className="text-xs text-text-muted mb-1.5 block">
                    Valor {form.valueType === "variable" && "(opcional)"}
                  </label>
                  <input
                    value={form.value}
                    onChange={(e) => setForm({ ...form, value: e.target.value })}
                    placeholder={form.valueType === "variable" ? "Deixa vazio" : "0,00"}
                    className="w-full text-sm font-mono bg-background border border-border-subtle rounded-xl px-3 py-2.5 text-right focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>
            )}

            {/* Non-recurring: date + value */}
            {!form.recurring && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-text-muted mb-1.5 block">Data</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="w-full text-sm bg-background border border-border-subtle rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div>
                  <label className="text-xs text-text-muted mb-1.5 block">Valor (€)</label>
                  <input
                    value={form.value}
                    onChange={(e) => setForm({ ...form, value: e.target.value })}
                    placeholder="0,00"
                    className="w-full text-sm font-mono bg-background border border-border-subtle rounded-xl px-3 py-2.5 text-right focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>
            )}

            {/* Account */}
            {accounts.length > 0 && (
              <div>
                <label className="text-xs text-text-muted mb-1.5 block">Conta (opcional)</label>
                <select
                  value={form.account}
                  onChange={(e) => setForm({ ...form, account: e.target.value })}
                  className="w-full text-sm bg-background border border-border-subtle rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="">—</option>
                  {accounts.map((a) => <option key={a.id} value={a.name}>{a.name}</option>)}
                </select>
              </div>
            )}
          </div>

          <DialogFooter>
            <button
              onClick={() => { setShowForm(false); resetForm(); }}
              className="px-4 py-2 rounded-xl border border-border-subtle text-sm text-text-muted hover:bg-surface-hover transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleAdd}
              className="px-5 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Adicionar
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* === Confirm value dialog === */}
      <Dialog open={confirmInput.open} onOpenChange={(o) => !o && setConfirmInput({ id: "", label: "", open: false, value: "" })}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>{confirmInput.label}</DialogTitle>
          </DialogHeader>
          <div>
            <label className="text-xs text-text-muted mb-1.5 block">Valor deste mês (€)</label>
            <input
              autoFocus
              value={confirmInput.value}
              onChange={(e) => setConfirmInput({ ...confirmInput, value: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && submitConfirmValue()}
              placeholder="0,00"
              className="w-full text-lg font-mono bg-background border border-border-subtle rounded-xl px-4 py-3 text-right focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <p className="text-[11px] text-text-muted mt-2">Só afeta este período. O próximo mês volta a "Valor por confirmar".</p>
          </div>
          <DialogFooter>
            <button
              onClick={() => setConfirmInput({ id: "", label: "", open: false, value: "" })}
              className="px-4 py-2 rounded-xl border border-border-subtle text-sm text-text-muted hover:bg-surface-hover transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={submitConfirmValue}
              className="px-5 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Guardar
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* === Delete confirm === */}
      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover despesa?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem a certeza que quer eliminar "{confirmDelete?.label}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={doDelete} className="bg-red-500 hover:bg-red-600">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
};
