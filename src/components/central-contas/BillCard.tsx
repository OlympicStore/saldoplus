import { useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { CalendarDays, MoreHorizontal, ChevronRight } from "lucide-react";
import type { BillStatus, FixedExpense } from "@/types/expense";
import { getBillIcon } from "./billIcons";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const STATUS_META: Record<BillStatus, { label: string; className: string; dot: string }> = {
  pendente: { label: "Pendente", className: "bg-[hsl(var(--status-pending)/0.15)] text-[hsl(var(--status-pending))]", dot: "bg-status-pending" },
  paga: { label: "Pago", className: "bg-[hsl(var(--status-paid)/0.15)] text-[hsl(var(--status-paid))]", dot: "bg-status-paid" },
  divida: { label: "Em atraso", className: "bg-[hsl(var(--status-negative)/0.15)] text-[hsl(var(--status-negative))]", dot: "bg-status-negative" },
};

const fmt = (v: number) => `€ ${v.toLocaleString("pt-PT", { minimumFractionDigits: 2 })}`;

interface Props {
  expense: FixedExpense;
  status: BillStatus;
  selectedMonth: number;
  selectedYear: number;
  onOpen: () => void;
  onUpdateStatus: (st: BillStatus) => void;
  onUpdateValue: (value: number) => void;
}

export function BillCard({ expense, status, selectedMonth, onOpen, onUpdateStatus, onUpdateValue }: Props) {
  const { icon, category } = getMeta(expense.item);
  const isVariable = (expense.valueType ?? "variable") === "variable";

  const { expected, last } = useMemo(() => {
    const values: number[] = [];
    for (let m = 0; m < 12; m++) {
      const v = expense.monthlyValues[m];
      if (typeof v === "number" && v > 0) values.push(v);
    }
    const expected = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
    let last = 0;
    for (let m = selectedMonth - 1; m >= 0; m--) {
      const v = expense.monthlyValues[m];
      if (typeof v === "number" && v > 0) { last = v; break; }
    }
    if (!last && values.length) last = values[values.length - 1];
    return { expected, last };
  }, [expense.monthlyValues, selectedMonth]);

  const meta = STATUS_META[status];
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [amount, setAmount] = useState("");

  const submitUpdate = (st?: BillStatus) => {
    const n = parseFloat(amount.replace(",", "."));
    if (isVariable && !isNaN(n) && n > 0) onUpdateValue(n);
    if (st) onUpdateStatus(st);
    setAmount(""); setPopoverOpen(false);
  };

  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="bg-surface rounded-3xl border border-border-subtle/60 shadow-card p-5 flex flex-col gap-4"
    >
      <button onClick={onOpen} className="text-left">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="h-11 w-11 rounded-2xl bg-background border border-border-subtle/60 flex items-center justify-center text-xl shrink-0">
              {icon}
            </span>
            <div className="min-w-0">
              <p className="text-sm sm:text-base font-semibold text-foreground truncate">{expense.item}</p>
              <p className="text-[11px] text-text-muted mt-0.5 truncate">
                {category} · {isVariable ? "Recorrente variável" : "Recorrente fixa"}
              </p>
            </div>
          </div>
          <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${meta.className}`}>
            {meta.label}
          </span>
        </div>
      </button>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-background border border-border-subtle/40 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">Valor esperado</p>
          <p className="text-base font-bold text-foreground font-mono tabular-nums mt-1">
            {expected > 0 ? fmt(expected) : "—"}
          </p>
        </div>
        <div className="rounded-2xl bg-background border border-border-subtle/40 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">Último valor</p>
          <p className="text-base font-bold text-foreground font-mono tabular-nums mt-1">
            {last > 0 ? fmt(last) : "—"}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between text-[11px] text-text-muted">
        <span className="inline-flex items-center gap-1">
          <CalendarDays className="h-3.5 w-3.5" /> Dia {expense.dueDay}
        </span>
        <button onClick={onOpen} className="inline-flex items-center gap-1 text-primary font-semibold hover:opacity-80 transition-opacity">
          Ver histórico <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>

      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <button className="w-full mt-1 px-4 py-2.5 rounded-full bg-primary/10 text-primary text-sm font-semibold hover:bg-primary/15 transition-colors">
            Atualizar mês
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-64 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-2">
            Atualizar este mês
          </p>
          {isVariable && (
            <div className="mb-3">
              <label className="text-[11px] text-text-secondary">Novo valor (€)</label>
              <input
                autoFocus
                type="number" inputMode="decimal" step="0.01"
                value={amount} onChange={e => setAmount(e.target.value)}
                onKeyDown={e => e.key === "Enter" && submitUpdate("paga")}
                placeholder="0,00"
                className="w-full mt-1 text-sm bg-background border border-border-subtle rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          )}
          <div className="grid grid-cols-3 gap-1.5">
            {(["paga", "pendente", "divida"] as BillStatus[]).map(st => {
              const m = STATUS_META[st];
              const active = st === status;
              return (
                <button key={st} onClick={() => submitUpdate(st)}
                  className={`px-2 py-2 rounded-lg text-[11px] font-semibold transition-colors ${
                    active ? m.className : "bg-background text-text-secondary hover:bg-surface-hover border border-border-subtle/50"
                  }`}>
                  {m.label}
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    </motion.div>
  );
}

function getMeta(name: string) {
  return getBillIcon(name);
}
