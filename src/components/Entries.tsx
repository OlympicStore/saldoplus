import { motion, AnimatePresence } from "framer-motion";
import { useMemo, useState } from "react";
import {
  Plus, Trash2, TrendingUp, TrendingDown, Sparkles, Search, X, Check, Calendar,
} from "lucide-react";
import type { Income as IncomeType, SalaryConfig } from "@/types/income";
import type { Account } from "@/types/account";
import type { Transfer } from "@/types/transfer";
import { TransfersBetweenAccounts } from "./TransfersBetweenAccounts";
import { formatDateOnly, isDateInMonth, getDateOnlyParts } from "@/lib/dateOnly";
import { AreaChart, Area, ResponsiveContainer, Tooltip } from "recharts";

/* Emoji-first categories (Revolut/Monzo style) */
const CATEGORIES = [
  { value: "Salário",       emoji: "💼", tint: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  { value: "Freelance",     emoji: "💸", tint: "bg-blue-50 text-blue-700 ring-blue-200" },
  { value: "Venda",         emoji: "🛒", tint: "bg-orange-50 text-orange-700 ring-orange-200" },
  { value: "Juros",         emoji: "🏦", tint: "bg-cyan-50 text-cyan-700 ring-cyan-200" },
  { value: "Investimento",  emoji: "📈", tint: "bg-teal-50 text-teal-700 ring-teal-200" },
  { value: "Renda",         emoji: "🏠", tint: "bg-amber-50 text-amber-700 ring-amber-200" },
  { value: "Oferta",        emoji: "🎁", tint: "bg-pink-50 text-pink-700 ring-pink-200" },
  { value: "Reembolso",     emoji: "💳", tint: "bg-purple-50 text-purple-700 ring-purple-200" },
  { value: "Prémio",        emoji: "🏆", tint: "bg-yellow-50 text-yellow-700 ring-yellow-200" },
  { value: "Outros",        emoji: "💰", tint: "bg-slate-100 text-slate-700 ring-slate-200" },
] as const;

const CAT_BY_NAME = new Map(CATEGORIES.map((c) => [c.value, c]));

const inferCategory = (row: IncomeType) => {
  if (row.type === "salary") return CAT_BY_NAME.get("Salário")!;
  const desc = (row.description || "").toLowerCase();
  for (const c of CATEGORIES) {
    if (desc.includes(c.value.toLowerCase())) return c;
  }
  if (/salar/.test(desc)) return CAT_BY_NAME.get("Salário")!;
  if (/free/.test(desc)) return CAT_BY_NAME.get("Freelance")!;
  if (/venda/.test(desc)) return CAT_BY_NAME.get("Venda")!;
  if (/juros?/.test(desc)) return CAT_BY_NAME.get("Juros")!;
  if (/invest/.test(desc)) return CAT_BY_NAME.get("Investimento")!;
  if (/renda|aluguer/.test(desc)) return CAT_BY_NAME.get("Renda")!;
  if (/reembols/.test(desc)) return CAT_BY_NAME.get("Reembolso")!;
  if (/oferta|prenda/.test(desc)) return CAT_BY_NAME.get("Oferta")!;
  if (/premi/.test(desc)) return CAT_BY_NAME.get("Prémio")!;
  return CAT_BY_NAME.get("Outros")!;
};

const fmt = (v: number) =>
  `€ ${v.toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const relativeDate = (dateStr: string) => {
  const { year, month, day } = getDateOnlyParts(dateStr);
  const d = new Date(year, month, day);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const diff = Math.round((today.getTime() - d.getTime()) / 86400000);
  if (diff === 0) return "Hoje";
  if (diff === 1) return "Ontem";
  if (diff > 1 && diff < 7) return `Há ${diff} dias`;
  return formatDateOnly(dateStr, { day: "2-digit", month: "short" });
};

const MONTH_NAMES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

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

export const Entries = ({
  incomes, salaryConfigs, accounts, transfers, people, selectedMonth,
  onAddIncome, onDeleteIncome, onAddTransfer, onDeleteTransfer,
}: EntriesProps) => {
  const [showForm, setShowForm] = useState(false);
  const [query, setQuery] = useState("");
  const [filterCat, setFilterCat] = useState<string | null>(null);
  const [newEntry, setNewEntry] = useState({
    category: "Salário", account: "", value: "", date: "", description: "",
  });

  /* ---------- Data ---------- */
  const monthIncomes = useMemo(
    () => incomes.filter((i) => isDateInMonth(i.date, selectedMonth)),
    [incomes, selectedMonth]
  );
  const prevMonth = (selectedMonth + 11) % 12;
  const prevMonthIncomes = useMemo(
    () => incomes.filter((i) => isDateInMonth(i.date, prevMonth)),
    [incomes, prevMonth]
  );

  const totalMonth = monthIncomes.reduce((s, i) => s + i.value, 0);
  const totalPrev = prevMonthIncomes.reduce((s, i) => s + i.value, 0);
  const delta = totalPrev > 0 ? ((totalMonth - totalPrev) / totalPrev) * 100 : 0;

  const monthlyAvg = useMemo(() => {
    const byMonth: Record<number, number> = {};
    incomes.forEach((i) => {
      const m = getDateOnlyParts(i.date).month;
      byMonth[m] = (byMonth[m] || 0) + i.value;
    });
    const values = Object.values(byMonth);
    return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  }, [incomes]);

  const lastIncome = useMemo(
    () => [...monthIncomes].sort((a, b) => (a.date < b.date ? 1 : -1))[0],
    [monthIncomes]
  );

  /* Expected recurring = active salaries not yet logged as a "salary" income this month */
  const salaryLoggedByPerson = useMemo(() => {
    const set = new Set<string>();
    monthIncomes.forEach((i) => {
      if (i.type === "salary" && i.person) set.add(i.person);
    });
    return set;
  }, [monthIncomes]);

  const expectedSalaries = useMemo(
    () =>
      salaryConfigs
        .filter((s) => s.active && (s.monthlyValues[selectedMonth] ?? 0) > 0)
        .map((s) => ({
          person: s.person,
          value: s.monthlyValues[selectedMonth] ?? 0,
          received: salaryLoggedByPerson.has(s.person),
        })),
    [salaryConfigs, selectedMonth, salaryLoggedByPerson]
  );
  const totalExpected = expectedSalaries
    .filter((s) => !s.received)
    .reduce((s, x) => s + x.value, 0);

  /* Sparkline: last 6 months */
  const sparkData = useMemo(() => {
    const now = new Date();
    const arr: { label: string; value: number }[] = [];
    for (let k = 5; k >= 0; k--) {
      const d = new Date(now.getFullYear(), now.getMonth() - k, 1);
      const m = d.getMonth();
      const sum = incomes
        .filter((i) => getDateOnlyParts(i.date).month === m && getDateOnlyParts(i.date).year === d.getFullYear())
        .reduce((s, i) => s + i.value, 0);
      arr.push({ label: MONTH_NAMES[m], value: sum });
    }
    return arr;
  }, [incomes]);

  /* Origem das receitas (%) */
  const origin = useMemo(() => {
    const buckets: Record<string, number> = {};
    monthIncomes.forEach((i) => {
      const c = inferCategory(i).value;
      buckets[c] = (buckets[c] || 0) + i.value;
    });
    const entries = Object.entries(buckets).sort((a, b) => b[1] - a[1]);
    const sum = entries.reduce((s, [, v]) => s + v, 0) || 1;
    return entries.map(([name, v]) => ({ name, value: v, pct: (v / sum) * 100 }));
  }, [monthIncomes]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return monthIncomes
      .filter((i) => {
        if (filterCat && inferCategory(i).value !== filterCat) return false;
        if (!q) return true;
        return (
          (i.description || "").toLowerCase().includes(q) ||
          (i.account || "").toLowerCase().includes(q)
        );
      })
      .sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [monthIncomes, query, filterCat]);

  /* ---------- Actions ---------- */
  const handleAdd = () => {
    const val = parseFloat(newEntry.value.replace(",", "."));
    if (isNaN(val) || val <= 0) return;
    const year = new Date().getFullYear();
    const date = newEntry.date || new Date(year, selectedMonth, 15).toISOString().split("T")[0];
    const type = newEntry.category === "Salário" ? ("salary" as const) : ("other" as const);
    onAddIncome({
      date,
      description: newEntry.description || newEntry.category,
      value: val,
      person: null,
      type,
      account: newEntry.account,
    });
    setNewEntry({ category: "Salário", account: "", value: "", date: "", description: "" });
    setShowForm(false);
  };

  const confirmSalaryReceipt = (person: string, value: number) => {
    const year = new Date().getFullYear();
    const date = new Date(year, selectedMonth, new Date().getDate()).toISOString().split("T")[0];
    onAddIncome({
      date,
      description: `Salário ${MONTH_NAMES[selectedMonth]}`,
      value,
      person,
      type: "salary",
      account: accounts[0]?.name || "",
    });
  };

  /* ---------- UI ---------- */
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-5"
    >
      {/* HERO */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 p-6 sm:p-8 text-white shadow-lg">
        <div className="absolute -top-16 -right-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-teal-300/20 blur-3xl" />
        <div className="relative flex flex-col sm:flex-row sm:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-white/80 text-sm mb-1">
              <span className="text-lg">💰</span>
              <span className="uppercase tracking-wider text-xs font-medium">Receitas</span>
            </div>
            <p className="text-white/70 text-sm">Recebido este mês</p>
            <p className="text-4xl sm:text-5xl font-semibold tabular-nums font-mono tracking-tight mt-1">
              {fmt(totalMonth)}
            </p>
            {totalPrev > 0 && (
              <div className="flex items-center gap-1.5 mt-2 text-sm">
                {delta >= 0 ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <TrendingDown className="h-4 w-4" />
                )}
                <span className="font-medium">
                  {delta >= 0 ? "+" : ""}{delta.toFixed(1)}%
                </span>
                <span className="text-white/70">face ao mês anterior</span>
              </div>
            )}
          </div>
          <div className="h-20 w-full sm:w-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sparkData} margin={{ top: 2, right: 2, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ffffff" stopOpacity={0.8} />
                    <stop offset="100%" stopColor="#ffffff" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Tooltip
                  contentStyle={{ background: "rgba(0,0,0,0.75)", border: "none", borderRadius: 8, color: "#fff", fontSize: 12 }}
                  formatter={(v: number) => fmt(v)}
                  labelStyle={{ color: "#fff" }}
                />
                <Area type="monotone" dataKey="value" stroke="#ffffff" strokeWidth={2} fill="url(#sparkGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="relative mt-6 flex flex-wrap gap-2">
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 rounded-full bg-white text-emerald-700 px-4 py-2 text-sm font-semibold shadow-sm hover:bg-white/90 transition"
          >
            <Plus className="h-4 w-4" /> Nova receita
          </button>
        </div>
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SummaryCard label="Este mês" value={fmt(totalMonth)} sub={`${monthIncomes.length} registos`} />
        <SummaryCard
          label="Última receita"
          value={lastIncome ? fmt(lastIncome.value) : "—"}
          sub={lastIncome ? `${inferCategory(lastIncome).emoji} ${relativeDate(lastIncome.date)}` : "Sem entradas"}
        />
        <SummaryCard label="Média mensal" value={fmt(monthlyAvg)} sub="Últimos meses" />
        <SummaryCard
          label="Ainda por receber"
          value={fmt(totalExpected)}
          sub={`${expectedSalaries.filter((s) => !s.received).length} previstas`}
          highlight={totalExpected > 0}
        />
      </div>

      {/* AI TIP */}
      <div className="rounded-2xl border border-border-subtle/60 bg-gradient-to-r from-primary/5 to-transparent p-4 flex items-start gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary shrink-0">
          <Sparkles className="h-4 w-4" />
        </span>
        <div className="text-sm">
          <p className="font-medium text-foreground">Também podes adicionar receitas com o Assistente IA</p>
          <p className="text-text-muted mt-0.5">
            Experimenta: <span className="italic">"Recebi 950€ de salário"</span> ·{" "}
            <span className="italic">"Ganhei 40€ numa venda"</span> ·{" "}
            <span className="italic">"Reembolso de 15€"</span>
          </p>
        </div>
      </div>

      {/* EXPECTED / RECURRING */}
      {expectedSalaries.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-2 px-1">
            <h3 className="text-sm font-semibold text-foreground">Receitas previstas</h3>
            <span className="text-xs text-text-muted">Recorrentes</span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {expectedSalaries.map((s) => (
              <div
                key={s.person}
                className={`rounded-2xl border p-4 flex items-center justify-between gap-3 transition ${
                  s.received
                    ? "bg-emerald-50/40 border-emerald-200/60"
                    : "bg-surface border-border-subtle/60 hover:shadow-card"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-xl ring-1 ring-emerald-200 shrink-0">
                    💼
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">Salário · {s.person}</p>
                    <p className="text-xs text-text-muted">
                      {s.received ? "Recebido este mês" : `Previsto em ${MONTH_NAMES[selectedMonth]}`}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <span className="font-mono text-sm font-semibold tabular-nums text-status-paid">
                    + {fmt(s.value)}
                  </span>
                  {s.received ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700">
                      <Check className="h-3 w-3" /> Confirmado
                    </span>
                  ) : (
                    <button
                      onClick={() => confirmSalaryReceipt(s.person, s.value)}
                      className="text-[11px] font-medium text-primary hover:underline"
                    >
                      Confirmar recebimento
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ORIGEM */}
      {origin.length > 0 && (
        <section className="rounded-2xl border border-border-subtle/60 bg-surface p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground">Origem das receitas</h3>
            <span className="text-xs text-text-muted">{MONTH_NAMES[selectedMonth]}</span>
          </div>
          <div className="space-y-2.5">
            {origin.slice(0, 5).map((o) => {
              const cat = CAT_BY_NAME.get(o.name as typeof CATEGORIES[number]["value"]) ?? CAT_BY_NAME.get("Outros")!;
              return (
                <div key={o.name}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="flex items-center gap-1.5 text-foreground font-medium">
                      <span>{cat.emoji}</span> {o.name}
                    </span>
                    <span className="text-text-muted tabular-nums">
                      {o.pct.toFixed(0)}% · {fmt(o.value)}
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full transition-all"
                      style={{ width: `${o.pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* SEARCH + FILTERS */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Pesquisar receitas..."
            className="w-full pl-10 pr-3 py-2.5 rounded-2xl bg-surface border border-border-subtle/70 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1">
          <FilterPill active={filterCat === null} onClick={() => setFilterCat(null)}>
            Todas
          </FilterPill>
          {CATEGORIES.map((c) => (
            <FilterPill
              key={c.value}
              active={filterCat === c.value}
              onClick={() => setFilterCat(filterCat === c.value ? null : c.value)}
            >
              <span className="mr-1">{c.emoji}</span> {c.value}
            </FilterPill>
          ))}
        </div>
      </div>

      {/* LIST */}
      <section>
        <div className="flex items-center justify-between mb-2 px-1">
          <h3 className="text-sm font-semibold text-foreground">Receitas recentes</h3>
          <span className="text-xs text-text-muted">{filtered.length} {filtered.length === 1 ? "item" : "itens"}</span>
        </div>
        <div className="space-y-2">
          <AnimatePresence initial={false}>
            {filtered.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="rounded-2xl border border-dashed border-border-subtle/70 bg-surface p-10 text-center"
              >
                <div className="text-4xl mb-2">💰</div>
                <p className="text-sm text-foreground font-medium">Sem receitas neste mês</p>
                <p className="text-xs text-text-muted mt-1">Adiciona a tua primeira entrada em segundos.</p>
                <button
                  onClick={() => setShowForm(true)}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold hover:opacity-90 transition"
                >
                  <Plus className="h-4 w-4" /> Nova receita
                </button>
              </motion.div>
            ) : (
              filtered.map((row) => {
                const cat = inferCategory(row);
                return (
                  <motion.div
                    key={row.id}
                    layout
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="group rounded-2xl bg-surface border border-border-subtle/60 p-3.5 sm:p-4 flex items-center gap-3 hover:shadow-card hover:border-border-subtle transition-all"
                  >
                    <span className={`flex h-11 w-11 items-center justify-center rounded-full ring-1 text-xl shrink-0 ${cat.tint}`}>
                      {cat.emoji}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {row.description || cat.value}
                      </p>
                      <div className="flex items-center gap-1.5 text-xs text-text-muted truncate">
                        <span className="truncate">{cat.value}</span>
                        {row.account && <><span>·</span><span className="truncate">{row.account}</span></>}
                        <span>·</span>
                        <span className="whitespace-nowrap">{relativeDate(row.date)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="font-mono text-sm sm:text-base font-semibold tabular-nums text-status-paid">
                        + {fmt(row.value)}
                      </span>
                      <button
                        onClick={() => {
                          if (confirm(`Eliminar "${row.description || cat.value}" (${fmt(row.value)})?`))
                            onDeleteIncome(row.id);
                        }}
                        className="ml-1 p-1.5 rounded-full text-text-muted opacity-0 group-hover:opacity-100 hover:text-status-negative hover:bg-status-negative/10 transition-all"
                        aria-label="Eliminar receita"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* TRANSFERS */}
      <TransfersBetweenAccounts
        transfers={transfers}
        accounts={accounts}
        selectedMonth={selectedMonth}
        onAdd={onAddTransfer}
        onDelete={onDeleteTransfer}
      />

      {/* MODAL */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
            onClick={() => setShowForm(false)}
          >
            <motion.div
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 24, opacity: 0 }}
              transition={{ type: "spring", damping: 24, stiffness: 260 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full sm:max-w-lg bg-background rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between p-5 border-b border-border-subtle/50">
                <div>
                  <h3 className="text-base font-semibold text-foreground">Nova receita</h3>
                  <p className="text-xs text-text-muted mt-0.5">Regista uma entrada de dinheiro</p>
                </div>
                <button
                  onClick={() => setShowForm(false)}
                  className="p-2 rounded-full hover:bg-surface-hover text-text-muted"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="p-5 space-y-5 max-h-[75vh] overflow-y-auto">
                {/* Value */}
                <div>
                  <label className="label-caps mb-1.5 block">Valor</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl text-text-muted font-mono">€</span>
                    <input
                      value={newEntry.value}
                      onChange={(e) => setNewEntry({ ...newEntry, value: e.target.value })}
                      placeholder="0,00"
                      inputMode="decimal"
                      className="w-full pl-10 pr-4 py-3 text-2xl font-mono tabular-nums bg-surface border border-border-subtle rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>
                </div>

                {/* Category */}
                <div>
                  <label className="label-caps mb-2 block">Categoria</label>
                  <div className="grid grid-cols-5 gap-2">
                    {CATEGORIES.map((c) => {
                      const active = newEntry.category === c.value;
                      return (
                        <button
                          key={c.value}
                          type="button"
                          onClick={() => setNewEntry({ ...newEntry, category: c.value })}
                          className={`flex flex-col items-center gap-1 rounded-2xl p-2.5 border transition-all ${
                            active
                              ? `${c.tint} ring-2 border-transparent`
                              : "bg-surface border-border-subtle text-text-muted hover:bg-surface-hover"
                          }`}
                        >
                          <span className="text-xl">{c.emoji}</span>
                          <span className="text-[10px] leading-tight text-center font-medium">{c.value}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="label-caps mb-1.5 block">Descrição (opcional)</label>
                  <input
                    value={newEntry.description}
                    onChange={(e) => setNewEntry({ ...newEntry, description: e.target.value })}
                    placeholder="Ex: Salário Janeiro"
                    className="w-full text-sm bg-surface border border-border-subtle rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>

                {/* Account + Date */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label-caps mb-1.5 block">Conta</label>
                    <select
                      value={newEntry.account}
                      onChange={(e) => setNewEntry({ ...newEntry, account: e.target.value })}
                      className="w-full text-sm bg-surface border border-border-subtle rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/40"
                    >
                      <option value="">—</option>
                      {accounts.map((a) => (
                        <option key={a.id} value={a.name}>{a.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label-caps mb-1.5 block flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> Data
                    </label>
                    <input
                      type="date"
                      value={newEntry.date}
                      onChange={(e) => setNewEntry({ ...newEntry, date: e.target.value })}
                      className="w-full text-sm bg-surface border border-border-subtle rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-border-subtle/50 flex gap-2">
                <button
                  onClick={() => setShowForm(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-border-subtle text-sm font-medium text-text-muted hover:bg-surface-hover transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleAdd}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition"
                >
                  Adicionar receita
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

/* ---------- Sub-components ---------- */
const SummaryCard = ({
  label, value, sub, highlight,
}: { label: string; value: string; sub?: string; highlight?: boolean }) => (
  <div
    className={`rounded-2xl border p-4 transition-all hover:shadow-card ${
      highlight ? "bg-amber-50/40 border-amber-200/60" : "bg-surface border-border-subtle/60"
    }`}
  >
    <p className="text-[11px] uppercase tracking-wider text-text-muted font-medium">{label}</p>
    <p className="text-lg sm:text-xl font-semibold text-foreground font-mono tabular-nums mt-1">{value}</p>
    {sub && <p className="text-xs text-text-muted mt-0.5 truncate">{sub}</p>}
  </div>
);

const FilterPill = ({
  active, onClick, children,
}: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
  <button
    onClick={onClick}
    className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium border transition-all ${
      active
        ? "bg-foreground text-background border-transparent shadow-sm"
        : "bg-surface text-text-muted border-border-subtle/60 hover:bg-surface-hover hover:text-foreground"
    }`}
  >
    {children}
  </button>
);
