import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, ArrowDownCircle, ArrowUpCircle, ArrowRightLeft, LineChart, LayoutList,
  Sparkles, Mic, Pencil, Wallet, TrendingUp, TrendingDown, PiggyBank, Scale,
} from "lucide-react";
import { Expenses } from "./Expenses";
import { Entries } from "./Entries";
import { Investments } from "./Investments";
import { TransfersBetweenAccounts } from "./TransfersBetweenAccounts";
import { formatDateOnly, isDateInMonth, getDateOnlyParts } from "@/lib/dateOnly";
import type { FixedExpense, VariableExpense } from "@/types/expense";
import type { Income, SalaryConfig } from "@/types/income";
import type { Investment } from "@/types/investment";
import type { Transfer } from "@/types/transfer";
import type { Account } from "@/types/account";
import type { Category } from "@/types/category";

type SubTab = "all" | "income" | "expense" | "invest" | "transfer";
type QuickFilter = "all" | "today" | "week" | "month" | "recurring";
type MovKind = "income" | "expense" | "invest" | "transfer";

interface Props {
  fixedExpenses: FixedExpense[];
  variableExpenses: VariableExpense[];
  incomes: Income[];
  salaryConfigs: SalaryConfig[];
  investments: Investment[];
  transfers: Transfer[];
  accounts: Account[];
  categories: Category[];
  variableCategories: string[];
  people: string[];
  selectedMonth: number;
  onOpenAI?: () => void;
  onAddIncome: any; onUpdateIncome: any; onDeleteIncome: any; onUpdateSalary: any;
  onAddTransfer: any; onDeleteTransfer: any;
  onAddFixed: any; onUpdateFixed: any; onUpdateFixedMonthly: any; onDeleteFixed: any;
  onAddVariable: any; onUpdateVariable: any; onDeleteVariable: any;
  onAddCategoryItem: any;
  onAddInvestment: any; onUpdateInvestment: any; onDeleteInvestment: any;
}

const fmt = (v: number) => `€ ${v.toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const TABS: { key: SubTab; label: string; icon: typeof LayoutList }[] = [
  { key: "all", label: "Timeline", icon: LayoutList },
  { key: "income", label: "Receitas", icon: ArrowDownCircle },
  { key: "expense", label: "Despesas", icon: ArrowUpCircle },
  { key: "invest", label: "Investimentos", icon: LineChart },
  { key: "transfer", label: "Transferências", icon: ArrowRightLeft },
];

const QUICK_FILTERS: { key: QuickFilter; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "today", label: "Hoje" },
  { key: "week", label: "Esta semana" },
  { key: "month", label: "Este mês" },
  { key: "recurring", label: "Recorrentes" },
];

/* Category → emoji map (both income & expense) */
const CAT_EMOJI: Record<string, string> = {
  "alimentação": "🍔", "alimentacao": "🍔", "comida": "🍔", "restaurante": "🍽️", "restaurantes": "🍽️",
  "supermercado": "🛒", "mercado": "🛒",
  "habitação": "🏠", "habitacao": "🏠", "casa": "🏠", "renda": "🏠",
  "transporte": "🚗", "transportes": "🚗", "carro": "🚗", "gasolina": "⛽", "combustível": "⛽",
  "lazer": "🎮", "diversão": "🎉", "diversao": "🎉",
  "serviços": "💡", "servicos": "💡", "luz": "💡", "água": "💧", "agua": "💧", "internet": "📶",
  "saúde": "💊", "saude": "💊",
  "educação": "📚", "educacao": "📚",
  "salário": "💼", "salario": "💼",
  "freelance": "💸",
  "venda": "🛍️",
  "juros": "🏦",
  "oferta": "🎁", "prémio": "🏆", "premio": "🏆",
  "reembolso": "💳",
  "etf": "📈", "ações": "📊", "acoes": "📊",
  "bitcoin": "₿", "cripto": "₿",
  "poupança": "🐷", "poupanca": "🐷",
};

const iconForLabel = (label: string, fallback: string) => {
  const key = (label || "").toLowerCase().trim();
  if (CAT_EMOJI[key]) return CAT_EMOJI[key];
  for (const [k, v] of Object.entries(CAT_EMOJI)) {
    if (key.includes(k)) return v;
  }
  return fallback;
};

const KIND_STYLE: Record<MovKind, { dot: string; text: string; bg: string; ring: string; label: string }> = {
  income:   { dot: "bg-emerald-500", text: "text-emerald-600", bg: "bg-emerald-50", ring: "ring-emerald-100", label: "Receita" },
  expense:  { dot: "bg-red-500",     text: "text-red-600",     bg: "bg-red-50",     ring: "ring-red-100",     label: "Despesa" },
  invest:   { dot: "bg-blue-500",    text: "text-blue-600",    bg: "bg-blue-50",    ring: "ring-blue-100",    label: "Investimento" },
  transfer: { dot: "bg-slate-400",   text: "text-slate-600",   bg: "bg-slate-100",  ring: "ring-slate-200",   label: "Transferência" },
};

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

const groupLabel = (dateStr: string) => {
  const { year, month, day } = getDateOnlyParts(dateStr);
  const d = new Date(year, month, day);
  const today = startOfDay(new Date());
  const diff = Math.round((today.getTime() - d.getTime()) / 86400000);
  if (diff === 0) return "Hoje";
  if (diff === 1) return "Ontem";
  if (diff > 1 && diff <= 6) return "Esta semana";
  if (diff > 6 && diff <= 13) return "Semana passada";
  return d.toLocaleDateString("pt-PT", { month: "long", year: today.getFullYear() === year ? undefined : "numeric" })
    .replace(/^./, (c) => c.toUpperCase());
};

interface Item {
  id: string; date: string; label: string; category: string; account: string;
  value: number; kind: MovKind; emoji: string; recurring?: boolean;
}

export function Movements(props: Props) {
  const [sub, setSub] = useState<SubTab>("all");
  const [query, setQuery] = useState("");
  const [quick, setQuick] = useState<QuickFilter>("all");

  const items = useMemo<Item[]>(() => {
    const out: Item[] = [];

    props.variableExpenses.filter(e => isDateInMonth(e.date, props.selectedMonth)).forEach(e => {
      out.push({
        id: `ve-${e.id}`, date: e.date, label: e.description || e.category,
        category: e.category, account: e.account || "—", value: e.value, kind: "expense",
        emoji: iconForLabel(e.category, "🧾"), recurring: e.recurring,
      });
    });
    props.incomes.filter(i => isDateInMonth(i.date, props.selectedMonth)).forEach(i => {
      const cat = i.type === "salary" ? "Salário" : (i.description || "Receita");
      out.push({
        id: `in-${i.id}`, date: i.date, label: i.description || (i.type === "salary" ? "Salário" : "Receita"),
        category: i.type === "salary" ? "Salário" : "Receita", account: i.account || "—",
        value: i.value, kind: "income", emoji: iconForLabel(cat, "💰"),
      });
    });
    props.investments.filter(i => isDateInMonth(i.date, props.selectedMonth)).forEach(i => {
      out.push({
        id: `iv-${i.id}`, date: i.date, label: i.name,
        category: String(i.type), account: i.account || "—",
        value: i.value, kind: "invest", emoji: iconForLabel(i.name || String(i.type), "📈"),
      });
    });
    props.transfers.filter(t => isDateInMonth(t.date, props.selectedMonth)).forEach(t => {
      out.push({
        id: `tr-${t.id}`, date: t.date, label: t.description || "Transferência",
        category: "Transferência", account: `${t.from_account} → ${t.to_account}`,
        value: t.value, kind: "transfer", emoji: "🔁",
      });
    });
    props.fixedExpenses.forEach(f => {
      const v = f.monthlyValues[props.selectedMonth];
      if (v && v > 0) {
        const d = new Date(new Date().getFullYear(), props.selectedMonth, f.dueDay || 1).toISOString().split("T")[0];
        out.push({
          id: `fe-${f.id}`, date: d, label: f.item, category: "Recorrente",
          account: f.account || "—", value: v, kind: "expense",
          emoji: iconForLabel(f.item, "🔁"), recurring: true,
        });
      }
    });

    return out.sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [props]);

  const filtered = useMemo(() => {
    const today = startOfDay(new Date());
    return items.filter(it => {
      if (query.trim()) {
        const q = query.toLowerCase();
        const hay = `${it.label} ${it.category} ${it.account} ${it.value}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (quick === "recurring" && !it.recurring) return false;
      if (quick === "today" || quick === "week") {
        const { year, month, day } = getDateOnlyParts(it.date);
        const d = new Date(year, month, day);
        const diff = Math.round((today.getTime() - d.getTime()) / 86400000);
        if (quick === "today" && diff !== 0) return false;
        if (quick === "week" && (diff < 0 || diff > 6)) return false;
      }
      return true;
    });
  }, [items, query, quick]);

  const totals = useMemo(() => {
    let inc = 0, exp = 0, inv = 0;
    for (const it of items) {
      if (it.kind === "income") inc += it.value;
      else if (it.kind === "expense") exp += it.value;
      else if (it.kind === "invest") inv += it.value;
    }
    return { inc, exp, inv, net: inc - exp };
  }, [items]);

  const grouped = useMemo(() => {
    const map = new Map<string, Item[]>();
    for (const it of filtered) {
      const k = groupLabel(it.date);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(it);
    }
    return Array.from(map.entries());
  }, [filtered]);

  return (
    <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-foreground tracking-tight">Movimentos</h2>
        <p className="text-sm text-text-muted mt-1">
          Acompanhe todas as entradas, despesas, investimentos e transferências num único local.
        </p>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-2 mb-5 scrollbar-hide">
        {TABS.map(t => {
          const Icon = t.icon;
          const active = sub === t.key;
          return (
            <button key={t.key} onClick={() => setSub(t.key)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all border ${
                active
                  ? "bg-foreground text-background border-transparent shadow-sm"
                  : "bg-surface text-text-muted border-border-subtle/60 hover:bg-surface-hover hover:text-foreground"
              }`}>
              <Icon className="h-3.5 w-3.5" />{t.label}
            </button>
          );
        })}
      </div>

      {sub === "all" && (
        <>
          {/* 4 summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
            <SummaryCard icon={<TrendingUp className="h-4 w-4" />} label="Receitas"
              value={fmt(totals.inc)} accent="emerald" />
            <SummaryCard icon={<TrendingDown className="h-4 w-4" />} label="Despesas"
              value={fmt(totals.exp)} accent="red" />
            <SummaryCard icon={<PiggyBank className="h-4 w-4" />} label="Investido"
              value={fmt(totals.inv)} accent="blue" />
            <SummaryCard icon={<Scale className="h-4 w-4" />} label="Saldo Líquido"
              value={fmt(totals.net)} accent={totals.net >= 0 ? "slate" : "red"} />
          </div>

          {/* AI card */}
          <button
            onClick={() => props.onOpenAI?.()}
            className="w-full mb-5 text-left rounded-3xl border border-border-subtle/60 bg-gradient-to-br from-primary/5 via-surface to-blue-500/5 p-4 hover:shadow-md transition-shadow group"
          >
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-2xl bg-primary/15 flex items-center justify-center text-primary shrink-0">
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">Adicionar com IA</p>
                <p className="text-xs text-text-muted mt-0.5">
                  Escreve ou fala naturalmente. Ex: <span className="font-mono">"Supermercado 18€"</span>,{" "}
                  <span className="font-mono">"Recebi 950€"</span>,{" "}
                  <span className="font-mono">"Investi 200€ em Bitcoin"</span>.
                </p>
                <div className="mt-3 flex gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-foreground text-background text-xs font-medium">
                    <Pencil className="h-3 w-3" /> Escrever
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface border border-border-subtle text-xs font-medium text-foreground">
                    <Mic className="h-3 w-3" /> Falar
                  </span>
                </div>
              </div>
            </div>
          </button>

          {/* Search */}
          <div className="relative mb-3">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Pesquisar por nome, categoria, conta ou valor…"
              className="w-full pl-10 pr-3 py-3 rounded-2xl bg-surface border border-border-subtle/70 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* Quick filters */}
          <div className="flex gap-1.5 overflow-x-auto pb-2 mb-4 scrollbar-hide">
            {QUICK_FILTERS.map(f => {
              const active = quick === f.key;
              return (
                <button key={f.key} onClick={() => setQuick(f.key)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all border ${
                    active
                      ? "bg-primary text-primary-foreground border-transparent"
                      : "bg-surface text-text-muted border-border-subtle/60 hover:text-foreground"
                  }`}>
                  {f.label}
                </button>
              );
            })}
          </div>

          {/* Timeline */}
          {grouped.length === 0 ? (
            <div className="bg-surface rounded-3xl border border-border-subtle/60 px-4 py-14 text-center">
              <p className="text-4xl mb-2">🌱</p>
              <p className="text-sm font-semibold text-foreground">Sem movimentos ainda</p>
              <p className="text-xs text-text-muted mt-1">Adiciona o primeiro através da IA ou dos separadores acima.</p>
            </div>
          ) : (
            <div className="space-y-6">
              <AnimatePresence initial={false}>
                {grouped.map(([label, list]) => (
                  <motion.section
                    key={label}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18 }}
                  >
                    <div className="flex items-center justify-between mb-2 px-1">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted">{label}</h3>
                      <span className="text-[11px] text-text-muted">{list.length} {list.length === 1 ? "item" : "itens"}</span>
                    </div>
                    <div className="bg-surface rounded-3xl border border-border-subtle/60 divide-y divide-border-subtle/40 overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                      {list.map(it => <MovementRow key={it.id} item={it} />)}
                    </div>
                  </motion.section>
                ))}
              </AnimatePresence>
            </div>
          )}
        </>
      )}

      {sub === "income" && (
        <Entries
          incomes={props.incomes} salaryConfigs={props.salaryConfigs}
          accounts={props.accounts} transfers={props.transfers} people={props.people} selectedMonth={props.selectedMonth}
          onAddIncome={props.onAddIncome} onUpdateIncome={props.onUpdateIncome}
          onDeleteIncome={props.onDeleteIncome} onUpdateSalary={props.onUpdateSalary}
          onAddTransfer={props.onAddTransfer} onDeleteTransfer={props.onDeleteTransfer}
        />
      )}

      {sub === "expense" && (
        <Expenses
          fixedExpenses={props.fixedExpenses} variableExpenses={props.variableExpenses}
          categories={props.categories} accounts={props.accounts}
          people={props.people} selectedMonth={props.selectedMonth}
          onAddFixed={props.onAddFixed} onUpdateFixed={props.onUpdateFixed}
          onUpdateFixedMonthly={props.onUpdateFixedMonthly} onDeleteFixed={props.onDeleteFixed}
          onAddVariable={props.onAddVariable} onUpdateVariable={props.onUpdateVariable}
          onDeleteVariable={props.onDeleteVariable}
          onAddCategoryItem={props.onAddCategoryItem}
        />
      )}

      {sub === "invest" && (
        <Investments
          investments={props.investments} accounts={props.accounts}
          selectedMonth={props.selectedMonth}
          onAdd={props.onAddInvestment} onUpdate={props.onUpdateInvestment}
          onDelete={props.onDeleteInvestment}
        />
      )}

      {sub === "transfer" && (
        <TransfersBetweenAccounts
          transfers={props.transfers}
          accounts={props.accounts}
          selectedMonth={props.selectedMonth}
          onAdd={props.onAddTransfer}
          onDelete={props.onDeleteTransfer}
        />
      )}
    </motion.div>
  );
}

/* -------- Row -------- */

function MovementRow({ item }: { item: Item }) {
  const style = KIND_STYLE[item.kind];
  const prefix = item.kind === "income" ? "+ " : item.kind === "expense" ? "− " : "";
  const suffix = item.kind === "invest" ? " investidos" : "";
  return (
    <motion.div
      whileHover={{ backgroundColor: "hsl(var(--surface-hover))" }}
      className="px-4 py-3.5 flex items-center gap-3"
    >
      <div className={`h-11 w-11 rounded-2xl flex items-center justify-center text-lg shrink-0 ring-1 ${style.bg} ${style.ring}`}>
        <span>{item.emoji}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-foreground truncate">{item.label}</p>
          <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${style.bg} ${style.text}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
            {style.label}
          </span>
        </div>
        <p className="text-xs text-text-muted truncate mt-0.5">
          {item.category} · {item.account} · {formatDateOnly(item.date, { day: "2-digit", month: "short" })}
        </p>
      </div>
      <div className={`font-mono text-sm font-semibold tabular-nums shrink-0 text-right ${style.text}`}>
        {prefix}{fmt(item.value)}{suffix && <span className="text-[10px] font-normal text-text-muted ml-1">{suffix}</span>}
      </div>
    </motion.div>
  );
}

/* -------- Summary card -------- */

function SummaryCard({
  icon, label, value, accent,
}: { icon: React.ReactNode; label: string; value: string; accent: "emerald" | "red" | "blue" | "slate" }) {
  const map = {
    emerald: { bg: "bg-emerald-50", text: "text-emerald-600", ring: "ring-emerald-100" },
    red:     { bg: "bg-red-50",     text: "text-red-600",     ring: "ring-red-100" },
    blue:    { bg: "bg-blue-50",    text: "text-blue-600",    ring: "ring-blue-100" },
    slate:   { bg: "bg-slate-100",  text: "text-slate-700",   ring: "ring-slate-200" },
  }[accent];
  return (
    <div className="bg-surface rounded-2xl p-4 border border-border-subtle/60">
      <div className="flex items-center gap-2">
        <span className={`h-7 w-7 rounded-lg flex items-center justify-center ring-1 ${map.bg} ${map.text} ${map.ring}`}>
          {icon}
        </span>
        <p className="label-caps text-text-muted">{label}</p>
      </div>
      <p className={`mt-2 text-lg font-semibold font-mono tabular-nums ${map.text}`}>{value}</p>
    </div>
  );
}
