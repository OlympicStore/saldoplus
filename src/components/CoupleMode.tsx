import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Heart, Settings2, ArrowRight } from "lucide-react";
import type { FixedExpense, VariableExpense } from "@/types/expense";
import type { Income, SalaryConfig } from "@/types/income";
import { PersonBadge } from "@/components/PersonBadge";
import { isDateInMonth } from "@/lib/dateOnly";

interface Props {
  fixedExpenses: FixedExpense[];
  variableExpenses: VariableExpense[];
  incomes: Income[];
  salaryConfigs: SalaryConfig[];
  people: string[];
  selectedMonth: number;
  onUpdatePeople?: (people: string[]) => void;
}

const fmt = (v: number) => `€ ${v.toLocaleString("pt-PT", { minimumFractionDigits: 2 })}`;
const STORAGE_KEY = "couple_mode_config";

type SplitMode = "equal" | "proportional";

export const CoupleMode = ({ fixedExpenses, variableExpenses, incomes, salaryConfigs, people, selectedMonth }: Props) => {
  const [config, setConfig] = useState<{
    enabled: boolean;
    personA: string | null;
    personB: string | null;
    splitMode: SplitMode;
  }>({
    enabled: false, personA: null, personB: null, splitMode: "equal",
  });
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setConfig({ splitMode: "equal", ...parsed });
      } else if (people.length >= 2) {
        setConfig({ enabled: false, personA: people[0], personB: people[1], splitMode: "equal" });
      }
    } catch {}
  }, [people]);

  const save = (next: typeof config) => {
    setConfig(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const totals = useMemo(() => {
    if (!config.personA || !config.personB) return null;

    const expensesPaidBy = (p: string) => {
      const fixed = fixedExpenses
        .filter(e => e.monthlyResponsible[selectedMonth] === p && e.monthlyPaid[selectedMonth])
        .reduce((s, e) => s + (e.monthlyValues[selectedMonth] ?? 0), 0);
      const variable = variableExpenses
        .filter(e => isDateInMonth(e.date, selectedMonth) && e.responsible === p)
        .reduce((s, e) => s + e.value, 0);
      return fixed + variable;
    };

    const incomeOf = (p: string) => {
      const salary = salaryConfigs
        .filter(s => s.active && s.person === p)
        .reduce((s, c) => s + (c.monthlyValues[selectedMonth] ?? 0), 0);
      const other = incomes
        .filter(i => isDateInMonth(i.date, selectedMonth) && i.person === p)
        .reduce((s, i) => s + i.value, 0);
      return salary + other;
    };

    const paidA = expensesPaidBy(config.personA);
    const paidB = expensesPaidBy(config.personB);
    const incA = incomeOf(config.personA);
    const incB = incomeOf(config.personB);
    const total = paidA + paidB;
    const totalInc = incA + incB;

    // Fair share
    let fairA: number, fairB: number;
    if (config.splitMode === "proportional" && totalInc > 0) {
      fairA = total * (incA / totalInc);
      fairB = total * (incB / totalInc);
    } else {
      fairA = total / 2;
      fairB = total / 2;
    }
    const diff = paidA - fairA; // >0 → A paid more, B owes A

    return { paidA, paidB, incA, incB, total, totalInc, fairA, fairB, diff };
  }, [config, fixedExpenses, variableExpenses, incomes, salaryConfigs, selectedMonth]);

  if (!config.enabled && !editing) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl bg-surface border border-border-subtle/60 shadow-sm p-6"
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-2xl bg-pink-100 text-pink-600 flex items-center justify-center">
            <Heart className="h-4.5 w-4.5" />
          </div>
          <div>
            <h3 className="font-display text-lg font-bold text-foreground leading-tight">Modo Casal</h3>
            <p className="text-xs text-text-muted">Divisão automática entre duas pessoas</p>
          </div>
        </div>
        <p className="text-sm text-text-muted mb-3">
          Ative para acompanhar quem pagou quanto, comparar rendimentos e ver quem deve a quem.
        </p>
        <button
          onClick={() => setEditing(true)}
          className="text-sm font-semibold text-primary hover:underline"
          disabled={people.length < 2}
        >
          {people.length < 2 ? "Adicione pelo menos 2 pessoas" : "Ativar Modo Casal →"}
        </button>
      </motion.div>
    );
  }

  if (editing) {
    return (
      <div className="rounded-3xl bg-surface border border-border-subtle/60 shadow-sm p-6">
        <h3 className="font-display text-lg font-bold text-foreground mb-4">Configurar Modo Casal</h3>
        <div className="grid grid-cols-2 gap-3 mb-4">
          {(["personA", "personB"] as const).map((k, i) => (
            <div key={k}>
              <label className="text-xs font-semibold text-text-muted uppercase">Pessoa {i + 1}</label>
              <select
                value={config[k] || ""}
                onChange={(e) => setConfig({ ...config, [k]: e.target.value })}
                className="mt-1 w-full text-sm bg-background border border-border-subtle rounded-lg px-3 py-2"
              >
                <option value="">—</option>
                {people.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          ))}
        </div>

        <div className="mb-4">
          <label className="text-xs font-semibold text-text-muted uppercase block mb-2">Modo de divisão</label>
          <div className="grid grid-cols-2 gap-2">
            {([
              { key: "equal", label: "50/50", desc: "Cada um paga metade" },
              { key: "proportional", label: "Proporcional", desc: "Baseado no rendimento" },
            ] as const).map(opt => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setConfig({ ...config, splitMode: opt.key })}
                className={`p-3 rounded-xl border text-left transition-colors ${
                  config.splitMode === opt.key
                    ? "border-primary bg-primary/5"
                    : "border-border-subtle bg-background hover:bg-surface-hover"
                }`}
              >
                <p className="text-sm font-semibold text-foreground">{opt.label}</p>
                <p className="text-[11px] text-text-muted">{opt.desc}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => { save({ ...config, enabled: true }); setEditing(false); }}
            disabled={!config.personA || !config.personB || config.personA === config.personB}
            className="flex-1 bg-primary text-primary-foreground text-sm font-semibold py-2 rounded-lg disabled:opacity-50"
          >
            Guardar
          </button>
          <button onClick={() => setEditing(false)} className="text-sm text-text-muted px-4">Cancelar</button>
        </div>
      </div>
    );
  }

  if (!totals || !config.personA || !config.personB) return null;
  const whoOwes = totals.diff > 0.01 ? config.personB : totals.diff < -0.01 ? config.personA : null;
  const whoReceives = whoOwes === config.personA ? config.personB : config.personA;
  const owedAmount = Math.abs(totals.diff);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl bg-surface border border-border-subtle/60 shadow-sm p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-pink-100 text-pink-600 flex items-center justify-center">
            <Heart className="h-4.5 w-4.5" />
          </div>
          <div>
            <h3 className="font-display text-lg font-bold text-foreground leading-tight">Modo Casal</h3>
            <p className="text-xs text-text-muted">
              Divisão {config.splitMode === "proportional" ? "proporcional ao rendimento" : "igual (50/50)"}
            </p>
          </div>
        </div>
        <button onClick={() => setEditing(true)} className="text-text-muted hover:text-foreground">
          <Settings2 className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        {[
          { p: config.personA, paid: totals.paidA, inc: totals.incA, fair: totals.fairA },
          { p: config.personB, paid: totals.paidB, inc: totals.incB, fair: totals.fairB },
        ].map(({ p, paid, inc, fair }) => (
          <div key={p!} className="p-4 rounded-2xl bg-background border border-border-subtle/60">
            <PersonBadge person={p} people={people} />
            <div className="mt-2 space-y-1">
              <div>
                <p className="text-[10px] text-text-muted uppercase tracking-wide">Rendimento</p>
                <p className="font-mono text-sm font-semibold text-status-paid tabular-nums">{fmt(inc)}</p>
              </div>
              <div>
                <p className="text-[10px] text-text-muted uppercase tracking-wide">Pagou</p>
                <p className="font-display text-lg font-bold tabular-nums">{fmt(paid)}</p>
                <p className="text-[10px] text-text-muted">
                  quota: {fmt(fair)} {paid - fair !== 0 && (
                    <span className={paid > fair ? "text-status-paid" : "text-status-negative"}>
                      ({paid > fair ? "+" : ""}{fmt(paid - fair)})
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 rounded-2xl bg-pink-50 border border-pink-100">
        {whoOwes ? (
          <div className="flex items-center gap-2 text-sm">
            <PersonBadge person={whoOwes} people={people} />
            <ArrowRight className="h-4 w-4 text-pink-600" />
            <PersonBadge person={whoReceives} people={people} />
            <span className="ml-auto font-display font-bold text-pink-700 tabular-nums">{fmt(owedAmount)}</span>
          </div>
        ) : (
          <p className="text-sm text-center text-pink-700 font-medium">Contas equilibradas ✨</p>
        )}
        <p className="text-[11px] text-pink-700/70 mt-2 text-center">
          Despesas {fmt(totals.total)} · Rendimento total {fmt(totals.totalInc)}
        </p>
      </div>
    </motion.div>
  );
};
