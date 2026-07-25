import { motion } from "framer-motion";
import { Sparkles, TrendingUp, Info } from "lucide-react";
import { useMemo, useState } from "react";
import { calculateFinancialScore } from "@/lib/financialScore";
import type { FixedExpense, VariableExpense } from "@/types/expense";
import type { Income, SalaryConfig } from "@/types/income";
import type { FinancialGoal } from "@/types/goal";

interface Props {
  fixedExpenses: FixedExpense[];
  variableExpenses: VariableExpense[];
  incomes: Income[];
  salaryConfigs: SalaryConfig[];
  financialGoals: FinancialGoal[];
  selectedMonth: number;
}

export const FinancialScore = (props: Props) => {
  const [open, setOpen] = useState(false);
  const result = useMemo(() => calculateFinancialScore(props), [props]);
  const { score, classification, color, breakdown, suggestions } = result;

  // Circular progress
  const R = 52;
  const C = 2 * Math.PI * R;
  const offset = C - (score / 100) * C;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-3xl bg-surface border border-border-subtle/60 shadow-sm p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-2xl flex items-center justify-center" style={{ background: `${color}18`, color }}>
            <Sparkles className="h-4.5 w-4.5" />
          </div>
          <div>
            <h3 className="font-display text-lg font-bold text-foreground leading-tight">Score Financeiro</h3>
            <p className="text-xs text-text-muted">Avaliação do mês</p>
          </div>
        </div>
        <button
          onClick={() => setOpen(o => !o)}
          className="text-xs font-semibold text-text-muted hover:text-foreground inline-flex items-center gap-1"
        >
          <Info className="h-3.5 w-3.5" /> {open ? "Ocultar" : "Detalhes"}
        </button>
      </div>

      <div className="flex items-center gap-6">
        <div className="relative shrink-0" style={{ width: 128, height: 128 }}>
          <svg width={128} height={128} className="-rotate-90">
            <circle cx={64} cy={64} r={R} strokeWidth={10} stroke="hsl(214, 32%, 91%)" fill="none" />
            <circle
              cx={64} cy={64} r={R} strokeWidth={10} stroke={color} fill="none"
              strokeDasharray={C} strokeDashoffset={offset} strokeLinecap="round"
              style={{ transition: "stroke-dashoffset .6s ease" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-display text-3xl font-bold tabular-nums" style={{ color }}>{score}</span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">/ 100</span>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold" style={{ color }}>{classification}</p>
          {suggestions.length > 0 ? (
            <ul className="mt-2 space-y-1.5">
              {suggestions.map((s, i) => (
                <li key={i} className="text-xs text-text-muted flex gap-1.5">
                  <span className="text-primary shrink-0">•</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-xs text-text-muted flex items-center gap-1">
              <TrendingUp className="h-3.5 w-3.5 text-status-paid" /> Tudo em ordem este mês.
            </p>
          )}
        </div>
      </div>

      {open && (
        <div className="mt-5 pt-5 border-t border-border-subtle/60 space-y-3">
          {breakdown.map((b) => {
            const pct = (b.points / b.max) * 100;
            return (
              <div key={b.label}>
                <div className="flex justify-between items-baseline text-xs mb-1">
                  <span className="font-medium text-foreground">{b.label}</span>
                  <span className="tabular-nums text-text-muted">
                    <span className="font-semibold text-foreground">{b.points}</span>/{b.max}
                  </span>
                </div>
                <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${pct}%`, background: pct >= 70 ? "hsl(160, 84%, 39%)" : pct >= 40 ? "hsl(38, 92%, 50%)" : "hsl(0, 84%, 60%)" }}
                  />
                </div>
                <p className="text-[10px] text-text-muted mt-0.5">{b.detail}</p>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
};
