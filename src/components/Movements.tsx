import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Search, ArrowDownCircle, ArrowUpCircle, ArrowRightLeft, LineChart, LayoutList } from "lucide-react";
import { Expenses } from "./Expenses";
import { Entries } from "./Entries";
import { Investments } from "./Investments";
import { TransfersBetweenAccounts } from "./TransfersBetweenAccounts";
import { formatDateOnly, isDateInMonth } from "@/lib/dateOnly";
import type { FixedExpense, VariableExpense } from "@/types/expense";
import type { Income, SalaryConfig } from "@/types/income";
import type { Investment } from "@/types/investment";
import type { Transfer } from "@/types/transfer";
import type { Account } from "@/types/account";
import type { Category } from "@/types/category";

type SubTab = "all" | "income" | "expense" | "invest" | "transfer";

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
  // handlers
  onAddIncome: any; onUpdateIncome: any; onDeleteIncome: any; onUpdateSalary: any;
  onAddTransfer: any; onDeleteTransfer: any;
  onAddFixed: any; onUpdateFixed: any; onUpdateFixedMonthly: any; onDeleteFixed: any;
  onAddVariable: any; onUpdateVariable: any; onDeleteVariable: any;
  onAddCategoryItem: any;
  onAddInvestment: any; onUpdateInvestment: any; onDeleteInvestment: any;
}

const fmt = (v: number) => `€ ${v.toLocaleString("pt-PT", { minimumFractionDigits: 2 })}`;

const TABS: { key: SubTab; label: string; icon: typeof LayoutList }[] = [
  { key: "all", label: "Todos", icon: LayoutList },
  { key: "income", label: "Receitas", icon: ArrowDownCircle },
  { key: "expense", label: "Despesas", icon: ArrowUpCircle },
  { key: "invest", label: "Investimentos", icon: LineChart },
  { key: "transfer", label: "Transferências", icon: ArrowRightLeft },
];

export function Movements(props: Props) {
  const [sub, setSub] = useState<SubTab>("all");
  const [query, setQuery] = useState("");

  const feed = useMemo(() => {
    const items: Array<{
      id: string; date: string; label: string; sub: string;
      value: number; sign: 1 | -1 | 0; kind: string;
    }> = [];

    props.variableExpenses.filter(e => isDateInMonth(e.date, props.selectedMonth)).forEach(e => {
      items.push({ id: `ve-${e.id}`, date: e.date, label: e.description || e.category, sub: e.category, value: e.value, sign: -1, kind: "Despesa" });
    });
    props.incomes.filter(i => isDateInMonth(i.date, props.selectedMonth)).forEach(i => {
      items.push({ id: `in-${i.id}`, date: i.date, label: i.description || "Entrada", sub: i.account || "—", value: i.value, sign: 1, kind: "Receita" });
    });
    props.investments.filter(i => isDateInMonth(i.date, props.selectedMonth)).forEach(i => {
      items.push({ id: `iv-${i.id}`, date: i.date, label: i.name, sub: i.type, value: i.amount, sign: 0, kind: "Investimento" });
    });
    props.transfers.filter(t => isDateInMonth(t.date, props.selectedMonth)).forEach(t => {
      items.push({ id: `tr-${t.id}`, date: t.date, label: t.description || `${t.from_account} → ${t.to_account}`, sub: `${t.from_account} → ${t.to_account}`, value: t.value, sign: 0, kind: "Transferência" });
    });
    // Fixed expenses (month value)
    props.fixedExpenses.forEach(f => {
      const v = f.monthlyValues[props.selectedMonth];
      if (v && v > 0) {
        const d = new Date(new Date().getFullYear(), props.selectedMonth, f.dueDay || 1).toISOString().split("T")[0];
        items.push({ id: `fe-${f.id}`, date: d, label: f.item, sub: f.account || "—", value: v, sign: -1, kind: "Fixa" });
      }
    });

    const filtered = query.trim()
      ? items.filter(i => (i.label + " " + i.sub + " " + i.kind).toLowerCase().includes(query.toLowerCase()))
      : items;

    return filtered.sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [props, query]);

  const totalIn = feed.filter(i => i.sign > 0).reduce((s, i) => s + i.value, 0);
  const totalOut = feed.filter(i => i.sign < 0).reduce((s, i) => s + i.value, 0);

  return (
    <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-foreground tracking-tight">Movimentos</h2>
        <p className="text-sm text-text-muted mt-1">Tudo num só lugar — receitas, despesas, transferências e investimentos.</p>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-2 mb-4 scrollbar-hide">
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
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Pesquisar movimentos…"
              className="w-full pl-10 pr-3 py-2.5 rounded-2xl bg-surface border border-border-subtle/70 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-surface rounded-2xl p-4 border border-border-subtle/60">
              <p className="label-caps text-text-muted">Entradas</p>
              <p className="text-lg font-semibold text-status-paid font-mono tabular-nums">+ {fmt(totalIn)}</p>
            </div>
            <div className="bg-surface rounded-2xl p-4 border border-border-subtle/60">
              <p className="label-caps text-text-muted">Saídas</p>
              <p className="text-lg font-semibold text-status-negative font-mono tabular-nums">− {fmt(totalOut)}</p>
            </div>
          </div>

          <div className="bg-surface rounded-3xl shadow-card border border-border-subtle/60 divide-y divide-border-subtle/40 overflow-hidden">
            {feed.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-text-muted">Nenhum movimento neste período.</div>
            ) : feed.slice(0, 100).map(item => (
              <div key={item.id} className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-surface-hover transition-colors">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground truncate">{item.label}</p>
                  <p className="text-xs text-text-muted truncate">{item.kind} · {item.sub} · {formatDateOnly(item.date, { day: "2-digit", month: "short" })}</p>
                </div>
                <span className={`font-mono text-sm font-semibold tabular-nums shrink-0 ${
                  item.sign > 0 ? "text-status-paid" : item.sign < 0 ? "text-status-negative" : "text-foreground"
                }`}>
                  {item.sign > 0 ? "+ " : item.sign < 0 ? "− " : ""}{fmt(item.value)}
                </span>
              </div>
            ))}
          </div>
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
