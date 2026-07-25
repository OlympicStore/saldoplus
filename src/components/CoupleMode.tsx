import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Heart, Settings2, ArrowRight } from "lucide-react";
import type { FixedExpense, VariableExpense } from "@/types/expense";
import { PersonBadge } from "@/components/PersonBadge";

interface Props {
  fixedExpenses: FixedExpense[];
  variableExpenses: VariableExpense[];
  people: string[];
  selectedMonth: number;
}

const fmt = (v: number) => `€ ${v.toLocaleString("pt-PT", { minimumFractionDigits: 2 })}`;
const STORAGE_KEY = "couple_mode_config";

export const CoupleMode = ({ fixedExpenses, variableExpenses, people, selectedMonth }: Props) => {
  const [config, setConfig] = useState<{ enabled: boolean; personA: string | null; personB: string | null }>({
    enabled: false, personA: null, personB: null,
  });
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setConfig(JSON.parse(raw));
      else if (people.length >= 2) setConfig({ enabled: false, personA: people[0], personB: people[1] });
    } catch {}
  }, [people]);

  const save = (next: typeof config) => {
    setConfig(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const totals = useMemo(() => {
    if (!config.personA || !config.personB) return null;
    const paidBy = (p: string) => {
      const fixed = fixedExpenses
        .filter(e => e.monthlyResponsible[selectedMonth] === p && e.monthlyPaid[selectedMonth])
        .reduce((s, e) => s + (e.monthlyValues[selectedMonth] ?? 0), 0);
      const variable = variableExpenses
        .filter(e => {
          const d = new Date(e.date + "T00:00:00");
          return d.getMonth() === selectedMonth && e.responsible === p;
        })
        .reduce((s, e) => s + e.value, 0);
      return fixed + variable;
    };
    const a = paidBy(config.personA);
    const b = paidBy(config.personB);
    const total = a + b;
    const fair = total / 2;
    const diff = a - fair; // >0 means A paid more, B owes
    return { a, b, total, fair, diff };
  }, [config, fixedExpenses, variableExpenses, selectedMonth]);

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
          Ative para acompanhar quem pagou quanto e quem deve a quem no mês.
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
            <p className="text-xs text-text-muted">Divisão do mês</p>
          </div>
        </div>
        <button onClick={() => setEditing(true)} className="text-text-muted hover:text-foreground">
          <Settings2 className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        {[{ p: config.personA, v: totals.a }, { p: config.personB, v: totals.b }].map(({ p, v }) => (
          <div key={p!} className="p-4 rounded-2xl bg-background border border-border-subtle/60">
            <PersonBadge person={p} people={people} />
            <p className="font-display text-xl font-bold tabular-nums mt-2">{fmt(v)}</p>
            <p className="text-[11px] text-text-muted">
              {v > totals.fair ? "+" : ""}{fmt(v - totals.fair)} vs metade
            </p>
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
          Total {fmt(totals.total)} · Metade {fmt(totals.fair)}
        </p>
      </div>
    </motion.div>
  );
};
